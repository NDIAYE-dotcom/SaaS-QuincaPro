-- Corrections suite à l'audit complet de l'application (juillet 2026) :
-- 1. Un utilisateur désactivé (profiles.actif = false) pouvait réactiver son
--    propre compte : le trigger anti-élévation de privilèges ne protégeait
--    que role/entreprise_id, pas actif.
-- 2. Deux paiements soumis en même temps sur la même vente/le même achat
--    pouvaient tous les deux passer le contrôle "montant <= reste" (lu avant
--    verrouillage) et faire dépasser montant_paye au-delà de total_ttc.
-- 3. Même problème de concurrence sur les mouvements de stock manuels : deux
--    mouvements simultanés sur le même produit pouvaient se baser sur la même
--    quantité de départ et produire un résultat final incorrect.
-- 4. creer_vente/creer_achat ne validaient le montant payé initial que côté
--    frontend ; un appel direct au RPC pouvait créer une facture déjà "trop
--    payée".
--
-- Toutes les fonctions sont remplacées à l'identique (CREATE OR REPLACE),
-- signatures inchangées : aucun impact sur le code applicatif existant.

-- =========================================================
-- 1. Protéger la colonne "actif" comme role/entreprise_id
-- =========================================================

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_super_admin() then
    return new;
  end if;

  if new.role <> old.role and coalesce(public.current_user_role()::text, '') <> 'admin' then
    raise exception 'Seul un administrateur peut modifier le rôle';
  end if;

  if new.entreprise_id is distinct from old.entreprise_id then
    raise exception 'Le transfert d''entreprise n''est pas autorisé';
  end if;

  if new.actif <> old.actif and coalesce(public.current_user_role()::text, '') <> 'admin' then
    raise exception 'Seul un administrateur peut activer ou désactiver un compte';
  end if;

  return new;
end;
$$;

-- =========================================================
-- 2. Garde-fou montant_paye <= total_ttc (backstop, en plus des contrôles
--    applicatifs). NOT VALID : ne revérifie pas les lignes existantes,
--    s'applique uniquement aux futures écritures — aucun risque d'échec
--    de migration sur des données historiques.
-- =========================================================

alter table public.ventes
  add constraint ventes_montant_paye_max check (montant_paye <= total_ttc) not valid;

alter table public.achats
  add constraint achats_montant_paye_max check (montant_paye <= total_ttc) not valid;

-- =========================================================
-- 3. Verrouiller la ligne avant de calculer le solde restant (paiements)
-- =========================================================

create or replace function public.appliquer_paiement_vente()
returns trigger
language plpgsql
as $$
declare
  v_vente public.ventes;
  v_reste numeric(14, 2);
begin
  select * into v_vente from public.ventes where id = new.vente_id for update;
  if not found then
    raise exception 'Vente introuvable';
  end if;

  if v_vente.statut <> 'facture' then
    raise exception 'Impossible d''enregistrer un paiement sur ce type de document';
  end if;

  v_reste := v_vente.total_ttc - v_vente.montant_paye;
  if new.montant > v_reste then
    raise exception 'Le montant dépasse le solde restant (% FCFA)', v_reste;
  end if;

  update public.ventes
  set montant_paye = montant_paye + new.montant,
      statut_paiement = case
        when montant_paye + new.montant >= total_ttc then 'paye'
        when montant_paye + new.montant > 0 then 'partiel'
        else 'impaye'
      end
  where id = new.vente_id;

  if v_vente.client_id is not null then
    update public.clients
    set solde_dette = greatest(solde_dette - new.montant, 0)
    where id = v_vente.client_id;
  end if;

  return new;
end;
$$;

create or replace function public.appliquer_paiement_achat()
returns trigger
language plpgsql
as $$
declare
  v_achat public.achats;
  v_reste numeric(14, 2);
begin
  select * into v_achat from public.achats where id = new.achat_id for update;
  if not found then
    raise exception 'Achat introuvable';
  end if;

  if v_achat.statut <> 'recu' then
    raise exception 'Impossible d''enregistrer un paiement sur cet achat';
  end if;

  v_reste := v_achat.total_ttc - v_achat.montant_paye;
  if new.montant > v_reste then
    raise exception 'Le montant dépasse le solde restant (% FCFA)', v_reste;
  end if;

  update public.achats
  set montant_paye = montant_paye + new.montant,
      statut_paiement = case
        when montant_paye + new.montant >= total_ttc then 'paye'
        when montant_paye + new.montant > 0 then 'partiel'
        else 'impaye'
      end
  where id = new.achat_id;

  if v_achat.fournisseur_id is not null then
    update public.fournisseurs
    set solde_dette = greatest(solde_dette - new.montant, 0)
    where id = v_achat.fournisseur_id;
  end if;

  return new;
end;
$$;

-- =========================================================
-- 4. Même correctif pour les mouvements de stock
-- =========================================================

create or replace function public.enregistrer_mouvement_stock(
  p_produit_id uuid,
  p_type public.type_mouvement_stock,
  p_quantite numeric default 0,
  p_nouvelle_quantite numeric default null,
  p_motif text default null
)
returns public.mouvements_stock
language plpgsql
as $$
declare
  v_produit public.produits;
  v_delta numeric;
  v_nouvelle numeric;
  v_mouvement public.mouvements_stock;
begin
  select * into v_produit from public.produits where id = p_produit_id for update;
  if not found then
    raise exception 'Produit introuvable';
  end if;

  if p_type in ('correction', 'inventaire') then
    if p_nouvelle_quantite is null then
      raise exception 'La nouvelle quantité est requise pour une correction ou un inventaire';
    end if;
    if p_nouvelle_quantite < 0 then
      raise exception 'La quantité ne peut pas être négative';
    end if;
    v_nouvelle := p_nouvelle_quantite;
    v_delta := v_nouvelle - v_produit.quantite_stock;
  elsif p_type = 'entree' then
    if p_quantite <= 0 then
      raise exception 'La quantité doit être positive pour une entrée';
    end if;
    v_delta := p_quantite;
    v_nouvelle := v_produit.quantite_stock + v_delta;
  elsif p_type = 'sortie' then
    if p_quantite <= 0 then
      raise exception 'La quantité doit être positive pour une sortie';
    end if;
    if p_quantite > v_produit.quantite_stock then
      raise exception 'Quantité insuffisante en stock (disponible : %)', v_produit.quantite_stock;
    end if;
    v_delta := -p_quantite;
    v_nouvelle := v_produit.quantite_stock + v_delta;
  else
    raise exception 'Type de mouvement inconnu';
  end if;

  update public.produits set quantite_stock = v_nouvelle where id = p_produit_id;

  insert into public.mouvements_stock (produit_id, type, quantite, quantite_avant, quantite_apres, motif, cree_par)
  values (p_produit_id, p_type, v_delta, v_produit.quantite_stock, v_nouvelle, p_motif, auth.uid())
  returning * into v_mouvement;

  return v_mouvement;
end;
$$;

-- =========================================================
-- 5. Validation serveur du montant payé initial (creer_vente / creer_achat)
-- =========================================================

create or replace function public.creer_vente(
  p_client_id uuid,
  p_statut public.statut_vente,
  p_type_facture public.type_facture,
  p_lignes jsonb,
  p_montant_paye_initial numeric default 0,
  p_notes text default null
)
returns public.ventes
language plpgsql
as $$
declare
  v_entreprise_id uuid := public.current_entreprise_id();
  v_numero text;
  v_compteur integer;
  v_vente public.ventes;
  v_ligne jsonb;
  v_produit public.produits;
  v_sous_total numeric(14, 2) := 0;
  v_total_tva numeric(14, 2) := 0;
  v_total_ttc numeric(14, 2);
  v_total_ligne numeric(14, 2);
  v_ligne_ht numeric(14, 2);
  v_ligne_tva numeric(14, 2);
  v_statut_paiement public.statut_paiement;
  v_prefixe text;
begin
  if v_entreprise_id is null then
    raise exception 'Aucune entreprise associée à cet utilisateur';
  end if;

  if p_lignes is null or jsonb_array_length(p_lignes) = 0 then
    raise exception 'La vente doit contenir au moins une ligne';
  end if;

  if p_client_id is not null and not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Client introuvable';
  end if;

  -- Numérotation atomique par entreprise (verrouille la ligne le temps de l'incrément)
  update public.entreprises
  set dernier_numero_facture = dernier_numero_facture + 1
  where id = v_entreprise_id
  returning dernier_numero_facture into v_compteur;

  v_prefixe := case when p_statut = 'devis' then 'DEV' else 'FAC' end;
  v_numero := v_prefixe || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_compteur::text, 5, '0');

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    v_ligne_ht := (v_ligne ->> 'quantite')::numeric * (v_ligne ->> 'prix_unitaire')::numeric;
    v_ligne_ht := v_ligne_ht - (v_ligne_ht * coalesce((v_ligne ->> 'remise_pourcentage')::numeric, 0) / 100);
    v_ligne_tva := v_ligne_ht * coalesce((v_ligne ->> 'taux_tva')::numeric, 0) / 100;

    v_sous_total := v_sous_total + v_ligne_ht;
    v_total_tva := v_total_tva + v_ligne_tva;
  end loop;

  v_total_ttc := v_sous_total + v_total_tva;

  if p_montant_paye_initial > v_total_ttc then
    raise exception 'Le montant payé ne peut pas dépasser le total de la vente';
  end if;

  if p_montant_paye_initial >= v_total_ttc then
    v_statut_paiement := 'paye';
  elsif p_montant_paye_initial > 0 then
    v_statut_paiement := 'partiel';
  else
    v_statut_paiement := 'impaye';
  end if;

  insert into public.ventes (
    client_id, numero, statut, type_facture, statut_paiement,
    sous_total, total_tva, total_ttc, montant_paye, notes, cree_par
  )
  values (
    p_client_id, v_numero, p_statut, p_type_facture, v_statut_paiement,
    v_sous_total, v_total_tva, v_total_ttc, p_montant_paye_initial, p_notes, auth.uid()
  )
  returning * into v_vente;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    select * into v_produit from public.produits where id = (v_ligne ->> 'produit_id')::uuid;
    if not found then
      raise exception 'Produit introuvable : %', (v_ligne ->> 'produit_id');
    end if;

    v_ligne_ht := (v_ligne ->> 'quantite')::numeric * (v_ligne ->> 'prix_unitaire')::numeric;
    v_ligne_ht := v_ligne_ht - (v_ligne_ht * coalesce((v_ligne ->> 'remise_pourcentage')::numeric, 0) / 100);
    v_total_ligne := v_ligne_ht + (v_ligne_ht * coalesce((v_ligne ->> 'taux_tva')::numeric, 0) / 100);

    insert into public.lignes_vente (
      vente_id, produit_id, quantite, prix_unitaire, taux_tva, remise_pourcentage, total_ligne
    )
    values (
      v_vente.id, v_produit.id, (v_ligne ->> 'quantite')::numeric, (v_ligne ->> 'prix_unitaire')::numeric,
      coalesce((v_ligne ->> 'taux_tva')::numeric, 0), coalesce((v_ligne ->> 'remise_pourcentage')::numeric, 0),
      v_total_ligne
    );

    if p_statut = 'facture' then
      perform public.enregistrer_mouvement_stock(
        v_produit.id, 'sortie', (v_ligne ->> 'quantite')::numeric, null, 'Vente ' || v_numero
      );
    end if;
  end loop;

  if p_client_id is not null and p_statut = 'facture' and (v_total_ttc - p_montant_paye_initial) > 0 then
    update public.clients
    set solde_dette = solde_dette + (v_total_ttc - p_montant_paye_initial)
    where id = p_client_id;
  end if;

  return v_vente;
end;
$$;

create or replace function public.creer_achat(
  p_fournisseur_id uuid,
  p_statut public.statut_achat,
  p_lignes jsonb,
  p_montant_paye_initial numeric default 0,
  p_notes text default null
)
returns public.achats
language plpgsql
as $$
declare
  v_entreprise_id uuid := public.current_entreprise_id();
  v_numero text;
  v_compteur integer;
  v_achat public.achats;
  v_ligne jsonb;
  v_produit public.produits;
  v_sous_total numeric(14, 2) := 0;
  v_total_tva numeric(14, 2) := 0;
  v_total_ttc numeric(14, 2);
  v_total_ligne numeric(14, 2);
  v_ligne_tva numeric(14, 2);
  v_statut_paiement public.statut_paiement;
begin
  if v_entreprise_id is null then
    raise exception 'Aucune entreprise associée à cet utilisateur';
  end if;

  if p_lignes is null or jsonb_array_length(p_lignes) = 0 then
    raise exception 'L''achat doit contenir au moins une ligne';
  end if;

  if p_fournisseur_id is not null and not exists (select 1 from public.fournisseurs where id = p_fournisseur_id) then
    raise exception 'Fournisseur introuvable';
  end if;

  update public.entreprises
  set dernier_numero_achat = dernier_numero_achat + 1
  where id = v_entreprise_id
  returning dernier_numero_achat into v_compteur;

  v_numero := 'ACH-' || to_char(now(), 'YYYY') || '-' || lpad(v_compteur::text, 5, '0');

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    v_ligne_tva := (v_ligne ->> 'quantite')::numeric * (v_ligne ->> 'prix_unitaire')::numeric
                   * coalesce((v_ligne ->> 'taux_tva')::numeric, 0) / 100;
    v_sous_total := v_sous_total + (v_ligne ->> 'quantite')::numeric * (v_ligne ->> 'prix_unitaire')::numeric;
    v_total_tva := v_total_tva + v_ligne_tva;
  end loop;

  v_total_ttc := v_sous_total + v_total_tva;

  if p_montant_paye_initial > v_total_ttc then
    raise exception 'Le montant payé ne peut pas dépasser le total de l''achat';
  end if;

  if p_montant_paye_initial >= v_total_ttc then
    v_statut_paiement := 'paye';
  elsif p_montant_paye_initial > 0 then
    v_statut_paiement := 'partiel';
  else
    v_statut_paiement := 'impaye';
  end if;

  insert into public.achats (
    fournisseur_id, numero, statut, statut_paiement,
    sous_total, total_tva, total_ttc, montant_paye, notes, cree_par
  )
  values (
    p_fournisseur_id, v_numero, p_statut, v_statut_paiement,
    v_sous_total, v_total_tva, v_total_ttc, p_montant_paye_initial, p_notes, auth.uid()
  )
  returning * into v_achat;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    select * into v_produit from public.produits where id = (v_ligne ->> 'produit_id')::uuid;
    if not found then
      raise exception 'Produit introuvable : %', (v_ligne ->> 'produit_id');
    end if;

    v_total_ligne := (v_ligne ->> 'quantite')::numeric * (v_ligne ->> 'prix_unitaire')::numeric;
    v_total_ligne := v_total_ligne + v_total_ligne * coalesce((v_ligne ->> 'taux_tva')::numeric, 0) / 100;

    insert into public.lignes_achat (achat_id, produit_id, quantite, prix_unitaire, taux_tva, total_ligne)
    values (
      v_achat.id, v_produit.id, (v_ligne ->> 'quantite')::numeric, (v_ligne ->> 'prix_unitaire')::numeric,
      coalesce((v_ligne ->> 'taux_tva')::numeric, 0), v_total_ligne
    );

    if p_statut = 'recu' then
      perform public.enregistrer_mouvement_stock(
        v_produit.id, 'entree', (v_ligne ->> 'quantite')::numeric, null, 'Achat ' || v_numero
      );

      update public.produits
      set prix_achat = (v_ligne ->> 'prix_unitaire')::numeric
      where id = v_produit.id;
    end if;
  end loop;

  if p_fournisseur_id is not null and p_statut = 'recu' and (v_total_ttc - p_montant_paye_initial) > 0 then
    update public.fournisseurs
    set solde_dette = solde_dette + (v_total_ttc - p_montant_paye_initial)
    where id = p_fournisseur_id;
  end if;

  return v_achat;
end;
$$;

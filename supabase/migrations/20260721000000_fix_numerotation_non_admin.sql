-- Corrige un bug bloquant TOUT membre non-admin (caissier, vendeur, magasinier, comptable,
-- responsable_stock) de créer une vente, un achat, ou même de voir une vente/achat qu'il crée
-- correctement comptabilisé.
--
-- Cause : creer_vente/creer_achat/creer_ecriture incrémentent le compteur de numérotation en
-- faisant "update public.entreprises set dernier_numero_x = ...". Ces fonctions ne sont PAS
-- security definer, donc cette mise à jour passe par la RLS de la table entreprises — laquelle
-- réserve l'UPDATE aux admins ("entreprises_update" policy). Pour tout autre rôle, la mise à
-- jour touche 0 ligne, le compteur reste NULL, et l'insertion échoue avec :
-- "null value in column numero of relation ventes/achats/ecritures_comptables violates
-- not-null constraint".
--
-- Correctif : trois petites fonctions SECURITY DEFINER dédiées, une par compteur, qui
-- vérifient explicitement que l'appelant agit bien pour SA PROPRE entreprise (ou est super
-- admin) avant d'incrémenter — seule cette opération précise est élevée en privilège, tout le
-- reste de creer_vente/creer_achat/creer_ecriture continue de s'exécuter avec les droits normaux
-- de l'appelant (RLS toujours appliquée sur clients/produits/lignes/etc., aucune fuite
-- inter-entreprise introduite).

create function public.next_numero_facture(p_entreprise_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compteur integer;
begin
  if p_entreprise_id is distinct from public.current_entreprise_id() and not public.is_super_admin() then
    raise exception 'Non autorisé';
  end if;

  update public.entreprises
  set dernier_numero_facture = dernier_numero_facture + 1
  where id = p_entreprise_id
  returning dernier_numero_facture into v_compteur;

  if not found then
    raise exception 'Entreprise introuvable';
  end if;

  return v_compteur;
end;
$$;

grant execute on function public.next_numero_facture(uuid) to authenticated;

create function public.next_numero_achat(p_entreprise_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compteur integer;
begin
  if p_entreprise_id is distinct from public.current_entreprise_id() and not public.is_super_admin() then
    raise exception 'Non autorisé';
  end if;

  update public.entreprises
  set dernier_numero_achat = dernier_numero_achat + 1
  where id = p_entreprise_id
  returning dernier_numero_achat into v_compteur;

  if not found then
    raise exception 'Entreprise introuvable';
  end if;

  return v_compteur;
end;
$$;

grant execute on function public.next_numero_achat(uuid) to authenticated;

create function public.next_numero_ecriture(p_entreprise_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compteur integer;
begin
  if p_entreprise_id is distinct from public.current_entreprise_id() and not public.is_super_admin() then
    raise exception 'Non autorisé';
  end if;

  update public.entreprises
  set dernier_numero_ecriture = dernier_numero_ecriture + 1
  where id = p_entreprise_id
  returning dernier_numero_ecriture into v_compteur;

  if not found then
    raise exception 'Entreprise introuvable';
  end if;

  return v_compteur;
end;
$$;

grant execute on function public.next_numero_ecriture(uuid) to authenticated;

-- =========================================================
-- creer_vente / creer_achat / creer_ecriture : utilisent désormais les compteurs ci-dessus
-- au lieu de mettre à jour directement "entreprises". Reste identique par ailleurs.
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

  v_compteur := public.next_numero_facture(v_entreprise_id);

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

  v_compteur := public.next_numero_achat(v_entreprise_id);

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

create or replace function public.creer_ecriture(
  p_libelle text,
  p_lignes jsonb,
  p_date date default current_date,
  p_origine text default 'manuelle',
  p_reference_id uuid default null
)
returns public.ecritures_comptables
language plpgsql
as $$
declare
  v_entreprise_id uuid := public.current_entreprise_id();
  v_numero text;
  v_compteur integer;
  v_ecriture public.ecritures_comptables;
  v_ligne jsonb;
  v_total_debit numeric(14, 2) := 0;
  v_total_credit numeric(14, 2) := 0;
begin
  if v_entreprise_id is null then
    raise exception 'Aucune entreprise associée à cet utilisateur';
  end if;

  if p_lignes is null or jsonb_array_length(p_lignes) < 2 then
    raise exception 'Une écriture doit contenir au moins deux lignes';
  end if;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    v_total_debit := v_total_debit + coalesce((v_ligne ->> 'debit')::numeric, 0);
    v_total_credit := v_total_credit + coalesce((v_ligne ->> 'credit')::numeric, 0);
  end loop;

  if round(v_total_debit, 2) <> round(v_total_credit, 2) then
    raise exception 'L''écriture n''est pas équilibrée (débit % FCFA ≠ crédit % FCFA)', v_total_debit, v_total_credit;
  end if;

  v_compteur := public.next_numero_ecriture(v_entreprise_id);

  v_numero := 'ECR-' || to_char(now(), 'YYYY') || '-' || lpad(v_compteur::text, 5, '0');

  insert into public.ecritures_comptables (numero, date_ecriture, libelle, origine, reference_id, cree_par)
  values (v_numero, coalesce(p_date, current_date), p_libelle, p_origine, p_reference_id, auth.uid())
  returning * into v_ecriture;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    insert into public.lignes_ecriture (ecriture_id, compte_id, debit, credit, libelle)
    values (
      v_ecriture.id,
      (v_ligne ->> 'compte_id')::uuid,
      coalesce((v_ligne ->> 'debit')::numeric, 0),
      coalesce((v_ligne ->> 'credit')::numeric, 0),
      v_ligne ->> 'libelle'
    );
  end loop;

  return v_ecriture;
end;
$$;

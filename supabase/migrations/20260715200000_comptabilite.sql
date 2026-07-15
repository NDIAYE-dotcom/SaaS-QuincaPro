-- Module Comptabilité : plan comptable, journal en partie double, écritures
-- automatiques depuis Ventes/Achats, Balance.
--
-- Approche SYSCOHADA simplifiée (système comptable utilisé en Afrique de
-- l'Ouest francophone) : un plan comptable minimal est semé automatiquement
-- à la création de chaque entreprise (voir seed_plan_comptable), avec des
-- comptes « système » repérés par code_systeme, stables même si l'utilisateur
-- renomme numero/nom, utilisés par les triggers de génération automatique.
--
-- Périmètre limité pour cette étape :
--   - Journal, Grand livre, Balance : couverts (via requêtes + vue v_balance)
--   - Compte de résultat / Bilan : dérivés côté frontend depuis v_balance en
--     regroupant par `nature`, pas de vue dédiée (inutile vu le faible nombre
--     de comptes d'une quincaillerie)
--   - Rapprochement bancaire : reporté, nécessite l'import de relevés
--   - Toutes les écritures automatiques utilisent un seul compte de trésorerie
--     (Caisse, 571), sans distinguer Wave/Banque/Espèces à ce stade
--
-- Toute écriture doit être équilibrée (Σdébit = Σcrédit), vérifié dans
-- creer_ecriture. Le journal est immuable : une correction se fait par
-- contre-passation (nouvelle écriture inverse), jamais par édition.

alter table public.entreprises
  add column dernier_numero_ecriture integer not null default 0;

create type public.nature_compte as enum ('actif', 'passif', 'charge', 'produit');

-- =========================================================
-- PLAN COMPTABLE
-- =========================================================

create table public.comptes_comptables (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  numero text not null,
  nom text not null,
  nature public.nature_compte not null,
  code_systeme text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entreprise_id, numero),
  unique (entreprise_id, code_systeme)
);

create index idx_comptes_comptables_entreprise_id on public.comptes_comptables (entreprise_id);

create trigger trg_comptes_comptables_updated_at
before update on public.comptes_comptables
for each row execute function public.set_updated_at();

create function public.empecher_suppression_compte_systeme()
returns trigger
language plpgsql
as $$
begin
  if old.code_systeme is not null then
    raise exception 'Ce compte est utilisé par les écritures automatiques et ne peut pas être supprimé';
  end if;
  return old;
end;
$$;

create trigger trg_comptes_empecher_suppression_systeme
before delete on public.comptes_comptables
for each row execute function public.empecher_suppression_compte_systeme();

create function public.seed_plan_comptable(p_entreprise_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.comptes_comptables (entreprise_id, numero, nom, nature, code_systeme)
  values
    (p_entreprise_id, '101', 'Capital', 'passif', 'CAPITAL'),
    (p_entreprise_id, '311', 'Stock de marchandises', 'actif', 'STOCK'),
    (p_entreprise_id, '401', 'Fournisseurs', 'passif', 'FOURNISSEURS'),
    (p_entreprise_id, '411', 'Clients', 'actif', 'CLIENTS'),
    (p_entreprise_id, '4431', 'TVA collectée', 'passif', 'TVA_COLLECTEE'),
    (p_entreprise_id, '4452', 'TVA déductible', 'actif', 'TVA_DEDUCTIBLE'),
    (p_entreprise_id, '521', 'Banque', 'actif', 'BANQUE'),
    (p_entreprise_id, '571', 'Caisse', 'actif', 'CAISSE'),
    (p_entreprise_id, '601', 'Achats de marchandises', 'charge', 'ACHATS'),
    (p_entreprise_id, '701', 'Ventes de marchandises', 'produit', 'VENTES');
end;
$$;

-- Sème le plan comptable des entreprises déjà existantes (créées avant cette migration)
do $$
declare
  v_entreprise record;
begin
  for v_entreprise in select id from public.entreprises loop
    if not exists (select 1 from public.comptes_comptables where entreprise_id = v_entreprise.id) then
      perform public.seed_plan_comptable(v_entreprise.id);
    end if;
  end loop;
end;
$$;

-- Sème automatiquement le plan comptable de toute nouvelle entreprise
create or replace function public.register_entreprise(
  p_nom text,
  p_nom_complet text,
  p_telephone text default null
)
returns public.entreprises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entreprise public.entreprises;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Cet utilisateur possède déjà un profil';
  end if;

  insert into public.entreprises (nom)
  values (p_nom)
  returning * into v_entreprise;

  insert into public.profiles (id, entreprise_id, role, nom_complet, telephone)
  values (auth.uid(), v_entreprise.id, 'admin', p_nom_complet, p_telephone);

  perform public.seed_plan_comptable(v_entreprise.id);

  return v_entreprise;
end;
$$;

-- Empêche un paiement initial supérieur au total : sans ce garde-fou, le
-- "reste" devient négatif et les écritures automatiques ci-dessous génèrent
-- une écriture déséquilibrée, ce qui ferait échouer (rollback) la vente ou
-- l'achat entier à cause de l'exception levée par creer_ecriture.

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
    raise exception 'Le montant payé (% FCFA) ne peut pas dépasser le total de la vente (% FCFA)',
      p_montant_paye_initial, v_total_ttc;
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
    raise exception 'Le montant payé (% FCFA) ne peut pas dépasser le total de l''achat (% FCFA)',
      p_montant_paye_initial, v_total_ttc;
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

-- =========================================================
-- JOURNAL (écritures en partie double)
-- =========================================================

create table public.ecritures_comptables (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  numero text not null,
  date_ecriture date not null default current_date,
  libelle text not null,
  origine text not null default 'manuelle',
  reference_id uuid,
  cree_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entreprise_id, numero)
);

create index idx_ecritures_entreprise_id on public.ecritures_comptables (entreprise_id);
create index idx_ecritures_date on public.ecritures_comptables (date_ecriture desc);
create index idx_ecritures_reference on public.ecritures_comptables (reference_id);

create table public.lignes_ecriture (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  ecriture_id uuid not null references public.ecritures_comptables (id) on delete cascade,
  compte_id uuid not null references public.comptes_comptables (id) on delete restrict,
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  libelle text,
  created_at timestamptz not null default now(),
  constraint lignes_ecriture_debit_xor_credit check (
    (debit > 0 and credit = 0) or (debit = 0 and credit > 0)
  )
);

create index idx_lignes_ecriture_entreprise_id on public.lignes_ecriture (entreprise_id);
create index idx_lignes_ecriture_ecriture_id on public.lignes_ecriture (ecriture_id);
create index idx_lignes_ecriture_compte_id on public.lignes_ecriture (compte_id);

-- =========================================================
-- CRÉATION ATOMIQUE D'UNE ÉCRITURE (doit être équilibrée)
-- =========================================================

create function public.creer_ecriture(
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

  update public.entreprises
  set dernier_numero_ecriture = dernier_numero_ecriture + 1
  where id = v_entreprise_id
  returning dernier_numero_ecriture into v_compteur;

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

grant execute on function public.creer_ecriture(text, jsonb, date, text, uuid) to authenticated;

-- =========================================================
-- ÉCRITURES AUTOMATIQUES : VENTES
-- =========================================================

create function public.generer_ecriture_vente()
returns trigger
language plpgsql
as $$
declare
  v_compte_clients uuid;
  v_compte_caisse uuid;
  v_compte_ventes uuid;
  v_compte_tva uuid;
  v_lignes jsonb := '[]'::jsonb;
  v_reste numeric(14, 2);
begin
  if new.statut <> 'facture' then
    return new;
  end if;

  select id into v_compte_clients from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'CLIENTS';
  select id into v_compte_caisse from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'CAISSE';
  select id into v_compte_ventes from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'VENTES';
  select id into v_compte_tva from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'TVA_COLLECTEE';

  if v_compte_clients is null or v_compte_caisse is null or v_compte_ventes is null or v_compte_tva is null then
    return new;
  end if;

  v_reste := new.total_ttc - new.montant_paye;

  if new.montant_paye > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_caisse, 'debit', new.montant_paye, 'credit', 0);
  end if;
  if v_reste > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_clients, 'debit', v_reste, 'credit', 0);
  end if;
  if new.sous_total > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_ventes, 'debit', 0, 'credit', new.sous_total);
  end if;
  if new.total_tva > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_tva, 'debit', 0, 'credit', new.total_tva);
  end if;

  if jsonb_array_length(v_lignes) >= 2 then
    perform public.creer_ecriture('Vente ' || new.numero, v_lignes, new.created_at::date, 'vente', new.id);
  end if;

  return new;
end;
$$;

create trigger trg_ventes_generer_ecriture
after insert on public.ventes
for each row execute function public.generer_ecriture_vente();

create function public.generer_ecriture_annulation_vente()
returns trigger
language plpgsql
as $$
declare
  v_ecriture_orig public.ecritures_comptables;
  v_ligne record;
  v_lignes jsonb := '[]'::jsonb;
begin
  if new.statut <> 'annulee' or old.statut <> 'facture' then
    return new;
  end if;

  select * into v_ecriture_orig
  from public.ecritures_comptables
  where reference_id = new.id and origine = 'vente'
  limit 1;

  if not found then
    return new;
  end if;

  for v_ligne in select * from public.lignes_ecriture where ecriture_id = v_ecriture_orig.id
  loop
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_ligne.compte_id, 'debit', v_ligne.credit, 'credit', v_ligne.debit);
  end loop;

  perform public.creer_ecriture('Annulation vente ' || new.numero, v_lignes, current_date, 'annulation_vente', new.id);

  return new;
end;
$$;

create trigger trg_ventes_generer_ecriture_annulation
after update on public.ventes
for each row execute function public.generer_ecriture_annulation_vente();

create function public.generer_ecriture_paiement_vente()
returns trigger
language plpgsql
as $$
declare
  v_vente public.ventes;
  v_compte_clients uuid;
  v_compte_caisse uuid;
  v_lignes jsonb;
begin
  select * into v_vente from public.ventes where id = new.vente_id;

  select id into v_compte_clients from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'CLIENTS';
  select id into v_compte_caisse from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'CAISSE';

  if v_compte_clients is null or v_compte_caisse is null then
    return new;
  end if;

  v_lignes := jsonb_build_array(
    jsonb_build_object('compte_id', v_compte_caisse, 'debit', new.montant, 'credit', 0),
    jsonb_build_object('compte_id', v_compte_clients, 'debit', 0, 'credit', new.montant)
  );

  perform public.creer_ecriture('Paiement vente ' || coalesce(v_vente.numero, ''), v_lignes, current_date, 'paiement_vente', new.id);

  return new;
end;
$$;

create trigger trg_paiements_vente_generer_ecriture
after insert on public.paiements_vente
for each row execute function public.generer_ecriture_paiement_vente();

-- =========================================================
-- ÉCRITURES AUTOMATIQUES : ACHATS
-- =========================================================

create function public.generer_ecriture_achat()
returns trigger
language plpgsql
as $$
declare
  v_compte_fournisseurs uuid;
  v_compte_caisse uuid;
  v_compte_achats uuid;
  v_compte_tva uuid;
  v_lignes jsonb := '[]'::jsonb;
  v_reste numeric(14, 2);
begin
  if new.statut <> 'recu' then
    return new;
  end if;

  select id into v_compte_fournisseurs from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'FOURNISSEURS';
  select id into v_compte_caisse from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'CAISSE';
  select id into v_compte_achats from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'ACHATS';
  select id into v_compte_tva from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'TVA_DEDUCTIBLE';

  if v_compte_fournisseurs is null or v_compte_caisse is null or v_compte_achats is null or v_compte_tva is null then
    return new;
  end if;

  v_reste := new.total_ttc - new.montant_paye;

  if new.sous_total > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_achats, 'debit', new.sous_total, 'credit', 0);
  end if;
  if new.total_tva > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_tva, 'debit', new.total_tva, 'credit', 0);
  end if;
  if new.montant_paye > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_caisse, 'debit', 0, 'credit', new.montant_paye);
  end if;
  if v_reste > 0 then
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_compte_fournisseurs, 'debit', 0, 'credit', v_reste);
  end if;

  if jsonb_array_length(v_lignes) >= 2 then
    perform public.creer_ecriture('Achat ' || new.numero, v_lignes, new.created_at::date, 'achat', new.id);
  end if;

  return new;
end;
$$;

create trigger trg_achats_generer_ecriture
after insert on public.achats
for each row execute function public.generer_ecriture_achat();

create function public.generer_ecriture_annulation_achat()
returns trigger
language plpgsql
as $$
declare
  v_ecriture_orig public.ecritures_comptables;
  v_ligne record;
  v_lignes jsonb := '[]'::jsonb;
begin
  if new.statut <> 'annule' or old.statut <> 'recu' then
    return new;
  end if;

  select * into v_ecriture_orig
  from public.ecritures_comptables
  where reference_id = new.id and origine = 'achat'
  limit 1;

  if not found then
    return new;
  end if;

  for v_ligne in select * from public.lignes_ecriture where ecriture_id = v_ecriture_orig.id
  loop
    v_lignes := v_lignes || jsonb_build_object('compte_id', v_ligne.compte_id, 'debit', v_ligne.credit, 'credit', v_ligne.debit);
  end loop;

  perform public.creer_ecriture('Annulation achat ' || new.numero, v_lignes, current_date, 'annulation_achat', new.id);

  return new;
end;
$$;

create trigger trg_achats_generer_ecriture_annulation
after update on public.achats
for each row execute function public.generer_ecriture_annulation_achat();

create function public.generer_ecriture_paiement_achat()
returns trigger
language plpgsql
as $$
declare
  v_achat public.achats;
  v_compte_fournisseurs uuid;
  v_compte_caisse uuid;
  v_lignes jsonb;
begin
  select * into v_achat from public.achats where id = new.achat_id;

  select id into v_compte_fournisseurs from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'FOURNISSEURS';
  select id into v_compte_caisse from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'CAISSE';

  if v_compte_fournisseurs is null or v_compte_caisse is null then
    return new;
  end if;

  v_lignes := jsonb_build_array(
    jsonb_build_object('compte_id', v_compte_fournisseurs, 'debit', new.montant, 'credit', 0),
    jsonb_build_object('compte_id', v_compte_caisse, 'debit', 0, 'credit', new.montant)
  );

  perform public.creer_ecriture('Paiement achat ' || coalesce(v_achat.numero, ''), v_lignes, current_date, 'paiement_achat', new.id);

  return new;
end;
$$;

create trigger trg_paiements_achat_generer_ecriture
after insert on public.paiements_achat
for each row execute function public.generer_ecriture_paiement_achat();

-- =========================================================
-- BALANCE (vue agrégée par compte)
-- =========================================================

create view public.v_balance
with (security_invoker = true) as
select
  cc.entreprise_id,
  cc.id as compte_id,
  cc.numero,
  cc.nom,
  cc.nature,
  coalesce(sum(le.debit), 0) as total_debit,
  coalesce(sum(le.credit), 0) as total_credit,
  coalesce(sum(le.debit), 0) - coalesce(sum(le.credit), 0) as solde
from public.comptes_comptables cc
left join public.lignes_ecriture le on le.compte_id = cc.id
group by cc.entreprise_id, cc.id, cc.numero, cc.nom, cc.nature
order by cc.numero;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.comptes_comptables enable row level security;
alter table public.ecritures_comptables enable row level security;
alter table public.lignes_ecriture enable row level security;

create policy "comptes_comptables_select"
on public.comptes_comptables for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "comptes_comptables_insert"
on public.comptes_comptables for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "comptes_comptables_update"
on public.comptes_comptables for update
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
)
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "comptes_comptables_delete"
on public.comptes_comptables for delete
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "ecritures_comptables_select"
on public.ecritures_comptables for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "ecritures_comptables_insert"
on public.ecritures_comptables for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "lignes_ecriture_select"
on public.lignes_ecriture for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "lignes_ecriture_insert"
on public.lignes_ecriture for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

-- Pas de politiques UPDATE/DELETE sur ecritures_comptables et lignes_ecriture :
-- le journal est immuable, on corrige par contre-passation (nouvelle écriture
-- inverse), jamais en éditant l'historique.

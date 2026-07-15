-- Module Achats : commandes fournisseurs, réception, paiements, dette fournisseur.
-- Miroir du module Ventes : mêmes principes (fonctions atomiques SECURITY INVOKER,
-- écritures immuables, annulation plutôt qu'édition).
--
-- Périmètre volontairement limité, comme pour Ventes :
--   - pas de réception partielle / conversion commande → réception séparée :
--     un achat est créé directement en 'commande' (ne touche pas le stock)
--     ou 'recu' (incrémente le stock immédiatement)
--   - pas de retour fournisseur dédié : on annule (annuler_achat restitue la
--     dette et retire le stock reçu, avec vérification qu'il n'a pas déjà
--     été vendu) puis on recrée si besoin
--   - la réception met à jour produits.prix_achat avec le dernier prix payé
--     (coût le plus récent) — ce n'est pas un CMP/FIFO/LIFO complet, qui
--     nécessiterait un suivi par lot, reporté à une étape ultérieure

alter table public.entreprises
  add column dernier_numero_achat integer not null default 0;

alter table public.fournisseurs
  add column solde_dette numeric(14, 2) not null default 0;

create type public.statut_achat as enum ('commande', 'recu', 'annule');

-- =========================================================
-- TABLES
-- =========================================================

create table public.achats (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  fournisseur_id uuid references public.fournisseurs (id) on delete set null,
  numero text not null,
  statut public.statut_achat not null default 'recu',
  statut_paiement public.statut_paiement not null default 'impaye',
  sous_total numeric(14, 2) not null default 0,
  total_tva numeric(14, 2) not null default 0,
  total_ttc numeric(14, 2) not null default 0,
  montant_paye numeric(14, 2) not null default 0,
  notes text,
  cree_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entreprise_id, numero)
);

create index idx_achats_entreprise_id on public.achats (entreprise_id);
create index idx_achats_fournisseur_id on public.achats (fournisseur_id);
create index idx_achats_statut on public.achats (statut);
create index idx_achats_created_at on public.achats (created_at desc);

create trigger trg_achats_updated_at
before update on public.achats
for each row execute function public.set_updated_at();

create table public.lignes_achat (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  achat_id uuid not null references public.achats (id) on delete cascade,
  produit_id uuid not null references public.produits (id) on delete restrict,
  quantite numeric(12, 2) not null check (quantite > 0),
  prix_unitaire numeric(12, 2) not null check (prix_unitaire >= 0),
  taux_tva numeric(5, 2) not null default 0,
  total_ligne numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create index idx_lignes_achat_entreprise_id on public.lignes_achat (entreprise_id);
create index idx_lignes_achat_achat_id on public.lignes_achat (achat_id);
create index idx_lignes_achat_produit_id on public.lignes_achat (produit_id);

create table public.paiements_achat (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  achat_id uuid not null references public.achats (id) on delete cascade,
  montant numeric(14, 2) not null check (montant > 0),
  moyen_paiement public.moyen_paiement not null default 'especes',
  notes text,
  cree_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_paiements_achat_entreprise_id on public.paiements_achat (entreprise_id);
create index idx_paiements_achat_achat_id on public.paiements_achat (achat_id);

-- =========================================================
-- APPLICATION D'UN PAIEMENT (met à jour l'achat + la dette fournisseur)
-- =========================================================

create function public.appliquer_paiement_achat()
returns trigger
language plpgsql
as $$
declare
  v_achat public.achats;
  v_reste numeric(14, 2);
begin
  select * into v_achat from public.achats where id = new.achat_id;
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

create trigger trg_paiements_achat_apply
after insert on public.paiements_achat
for each row execute function public.appliquer_paiement_achat();

-- =========================================================
-- CRÉATION ATOMIQUE D'UN ACHAT
-- =========================================================

create function public.creer_achat(
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

grant execute on function public.creer_achat(uuid, public.statut_achat, jsonb, numeric, text) to authenticated;

-- =========================================================
-- ANNULATION D'UN ACHAT (retire le stock reçu, restitue la dette fournisseur)
-- =========================================================

create function public.annuler_achat(p_achat_id uuid)
returns public.achats
language plpgsql
as $$
declare
  v_achat public.achats;
  v_ligne record;
  v_stock_actuel numeric(12, 2);
begin
  select * into v_achat from public.achats where id = p_achat_id;
  if not found then
    raise exception 'Achat introuvable';
  end if;

  if v_achat.statut = 'annule' then
    raise exception 'Cet achat est déjà annulé';
  end if;

  if v_achat.statut = 'recu' then
    for v_ligne in select * from public.lignes_achat where achat_id = p_achat_id
    loop
      select quantite_stock into v_stock_actuel from public.produits where id = v_ligne.produit_id;

      if v_ligne.quantite > v_stock_actuel then
        raise exception 'Stock insuffisant pour annuler cet achat (produit déjà vendu ou déplacé)';
      end if;

      perform public.enregistrer_mouvement_stock(
        v_ligne.produit_id, 'sortie', v_ligne.quantite, null, 'Annulation achat ' || v_achat.numero
      );
    end loop;

    if v_achat.fournisseur_id is not null then
      update public.fournisseurs
      set solde_dette = greatest(solde_dette - (v_achat.total_ttc - v_achat.montant_paye), 0)
      where id = v_achat.fournisseur_id;
    end if;
  end if;

  update public.achats set statut = 'annule' where id = p_achat_id
  returning * into v_achat;

  return v_achat;
end;
$$;

grant execute on function public.annuler_achat(uuid) to authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.achats enable row level security;
alter table public.lignes_achat enable row level security;
alter table public.paiements_achat enable row level security;

create policy "achats_select"
on public.achats for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "achats_insert"
on public.achats for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "achats_update"
on public.achats for update
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
)
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "lignes_achat_select"
on public.lignes_achat for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "lignes_achat_insert"
on public.lignes_achat for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "paiements_achat_select"
on public.paiements_achat for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "paiements_achat_insert"
on public.paiements_achat for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

-- Module Ventes : devis/factures, lignes, paiements (partiels ou totaux).
--
-- Périmètre volontairement limité pour cette étape :
--   - pas de conversion devis → commande → facture (juste devis OU facture)
--   - pas d'Avoir / Retour dédié : une facture se corrige en l'annulant
--     (annuler_vente restitue le stock et la dette client) puis en recréant
--   - pas de PDF / impression / envoi Email / WhatsApp / QR Code : ce sera
--     le module Factures, qui nécessite des librairies non encore installées
--   - pas de valorisation FIFO/LIFO/CMP : dépend du suivi de coûts du futur
--     module Achats
--
-- Une facture décrémente le stock via enregistrer_mouvement_stock (déjà en
-- place). Un devis ne touche jamais le stock. Toute la création d'une vente
-- (numérotation, lignes, mouvements de stock, dette client) est atomique via
-- creer_vente, en SECURITY INVOKER : la RLS de chaque table continue de
-- s'appliquer normalement selon l'utilisateur appelant.

alter table public.entreprises
  add column dernier_numero_facture integer not null default 0;

alter table public.clients
  add column solde_dette numeric(14, 2) not null default 0;

create type public.statut_vente as enum ('devis', 'commande', 'facture', 'annulee');
create type public.statut_paiement as enum ('impaye', 'partiel', 'paye');
create type public.type_facture as enum ('tva', 'hors_taxe');
create type public.moyen_paiement as enum (
  'especes', 'wave', 'orange_money', 'free_money', 'carte', 'virement', 'cheque'
);

-- =========================================================
-- TABLES
-- =========================================================

create table public.ventes (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  numero text not null,
  statut public.statut_vente not null default 'facture',
  type_facture public.type_facture not null default 'tva',
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

create index idx_ventes_entreprise_id on public.ventes (entreprise_id);
create index idx_ventes_client_id on public.ventes (client_id);
create index idx_ventes_statut on public.ventes (statut);
create index idx_ventes_created_at on public.ventes (created_at desc);

create trigger trg_ventes_updated_at
before update on public.ventes
for each row execute function public.set_updated_at();

create table public.lignes_vente (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  vente_id uuid not null references public.ventes (id) on delete cascade,
  produit_id uuid not null references public.produits (id) on delete restrict,
  quantite numeric(12, 2) not null check (quantite > 0),
  prix_unitaire numeric(12, 2) not null check (prix_unitaire >= 0),
  taux_tva numeric(5, 2) not null default 0,
  remise_pourcentage numeric(5, 2) not null default 0,
  total_ligne numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create index idx_lignes_vente_entreprise_id on public.lignes_vente (entreprise_id);
create index idx_lignes_vente_vente_id on public.lignes_vente (vente_id);
create index idx_lignes_vente_produit_id on public.lignes_vente (produit_id);

create table public.paiements_vente (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  vente_id uuid not null references public.ventes (id) on delete cascade,
  montant numeric(14, 2) not null check (montant > 0),
  moyen_paiement public.moyen_paiement not null default 'especes',
  notes text,
  cree_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_paiements_vente_entreprise_id on public.paiements_vente (entreprise_id);
create index idx_paiements_vente_vente_id on public.paiements_vente (vente_id);

-- =========================================================
-- APPLICATION D'UN PAIEMENT (met à jour la vente + la dette client)
-- =========================================================

create function public.appliquer_paiement_vente()
returns trigger
language plpgsql
as $$
declare
  v_vente public.ventes;
  v_reste numeric(14, 2);
begin
  select * into v_vente from public.ventes where id = new.vente_id;
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

create trigger trg_paiements_vente_apply
after insert on public.paiements_vente
for each row execute function public.appliquer_paiement_vente();

-- =========================================================
-- CRÉATION ATOMIQUE D'UNE VENTE
-- =========================================================

create function public.creer_vente(
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

grant execute on function public.creer_vente(uuid, public.statut_vente, public.type_facture, jsonb, numeric, text)
  to authenticated;

-- =========================================================
-- ANNULATION D'UNE VENTE (restitue stock + dette)
-- =========================================================

create function public.annuler_vente(p_vente_id uuid)
returns public.ventes
language plpgsql
as $$
declare
  v_vente public.ventes;
  v_ligne record;
begin
  select * into v_vente from public.ventes where id = p_vente_id;
  if not found then
    raise exception 'Vente introuvable';
  end if;

  if v_vente.statut = 'annulee' then
    raise exception 'Cette vente est déjà annulée';
  end if;

  if v_vente.statut = 'facture' then
    for v_ligne in select * from public.lignes_vente where vente_id = p_vente_id
    loop
      perform public.enregistrer_mouvement_stock(
        v_ligne.produit_id, 'entree', v_ligne.quantite, null, 'Annulation vente ' || v_vente.numero
      );
    end loop;

    if v_vente.client_id is not null then
      update public.clients
      set solde_dette = greatest(solde_dette - (v_vente.total_ttc - v_vente.montant_paye), 0)
      where id = v_vente.client_id;
    end if;
  end if;

  update public.ventes set statut = 'annulee' where id = p_vente_id
  returning * into v_vente;

  return v_vente;
end;
$$;

grant execute on function public.annuler_vente(uuid) to authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.ventes enable row level security;
alter table public.lignes_vente enable row level security;
alter table public.paiements_vente enable row level security;

create policy "ventes_select"
on public.ventes for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "ventes_insert"
on public.ventes for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "ventes_update"
on public.ventes for update
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
)
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "lignes_vente_select"
on public.lignes_vente for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "lignes_vente_insert"
on public.lignes_vente for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "paiements_vente_select"
on public.paiements_vente for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "paiements_vente_insert"
on public.paiements_vente for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

-- Pas de politiques UPDATE/DELETE sur lignes_vente et paiements_vente : ce sont
-- des écritures immuables une fois créées (on corrige via annuler_vente, pas
-- en éditant l'historique).

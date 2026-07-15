-- QuincaPro — Super Admin
-- Historique des paiements d'abonnement, annonces globales, RPC d'activation/suspension.
-- Toute écriture de statut d'abonnement passe exclusivement par ces fonctions SECURITY DEFINER
-- (elles vérifient elles-mêmes is_super_admin(), car SECURITY DEFINER contourne la RLS).

-- =========================================================
-- ENUM
-- =========================================================

create type public.methode_paiement_abonnement as enum (
  'especes', 'wave', 'orange_money', 'free_money', 'carte', 'virement', 'cheque'
);

-- =========================================================
-- TABLES
-- =========================================================

create table public.abonnement_paiements (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  montant numeric(12, 2) not null check (montant > 0),
  methode public.methode_paiement_abonnement not null,
  periode_debut date not null,
  periode_fin date not null check (periode_fin > periode_debut),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_abonnement_paiements_entreprise on public.abonnement_paiements (entreprise_id);
create index idx_abonnement_paiements_created_at on public.abonnement_paiements (created_at desc);

create table public.annonces (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (char_length(trim(titre)) > 0),
  message text not null check (char_length(trim(message)) > 0),
  actif boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_annonces_actif on public.annonces (actif);

-- =========================================================
-- RPC : activation / renouvellement atomique d'un abonnement
-- Enregistre le paiement ET prolonge l'abonnement en une transaction.
-- Un renouvellement anticipé prolonge à partir de la date d'expiration actuelle
-- (jamais à partir d'aujourd'hui) pour ne pas faire perdre de jours payés.
-- =========================================================

create function public.admin_activer_abonnement(
  p_entreprise_id uuid,
  p_montant numeric,
  p_methode public.methode_paiement_abonnement,
  p_duree_mois integer default 1,
  p_notes text default null
)
returns public.entreprises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entreprise public.entreprises;
  v_base timestamptz;
  v_fin timestamptz;
begin
  if not public.is_super_admin() then
    raise exception 'Réservé au Super Admin';
  end if;

  if p_duree_mois < 1 then
    raise exception 'La durée doit être d''au moins 1 mois';
  end if;

  if p_montant <= 0 then
    raise exception 'Le montant doit être positif';
  end if;

  select * into v_entreprise from public.entreprises where id = p_entreprise_id for update;
  if not found then
    raise exception 'Entreprise introuvable';
  end if;

  v_base := greatest(coalesce(v_entreprise.date_expiration_abonnement, now()), now());
  v_fin := v_base + make_interval(months => p_duree_mois);

  insert into public.abonnement_paiements
    (entreprise_id, montant, methode, periode_debut, periode_fin, notes, created_by)
  values
    (p_entreprise_id, p_montant, p_methode, v_base::date, v_fin::date, p_notes, auth.uid());

  update public.entreprises
  set statut_abonnement = 'actif',
      date_expiration_abonnement = v_fin
  where id = p_entreprise_id
  returning * into v_entreprise;

  return v_entreprise;
end;
$$;

grant execute on function public.admin_activer_abonnement(
  uuid, numeric, public.methode_paiement_abonnement, integer, text
) to authenticated;

-- =========================================================
-- RPC : suspension / expiration manuelle (sans paiement associé)
-- =========================================================

create function public.admin_definir_statut_abonnement(
  p_entreprise_id uuid,
  p_statut public.subscription_status
)
returns public.entreprises
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entreprise public.entreprises;
begin
  if not public.is_super_admin() then
    raise exception 'Réservé au Super Admin';
  end if;

  if p_statut = 'actif' then
    raise exception 'Utilisez admin_activer_abonnement pour activer un abonnement';
  end if;

  update public.entreprises
  set statut_abonnement = p_statut
  where id = p_entreprise_id
  returning * into v_entreprise;

  if not found then
    raise exception 'Entreprise introuvable';
  end if;

  return v_entreprise;
end;
$$;

grant execute on function public.admin_definir_statut_abonnement(
  uuid, public.subscription_status
) to authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.abonnement_paiements enable row level security;
alter table public.annonces enable row level security;

-- paiements : le super admin voit tout, l'admin d'entreprise consulte son propre historique
create policy "abonnement_paiements_select"
on public.abonnement_paiements for select
to authenticated
using (
  public.is_super_admin()
  or entreprise_id = public.current_entreprise_id()
);

-- Aucune politique insert/update/delete : les écritures passent exclusivement
-- par admin_activer_abonnement() (SECURITY DEFINER).

-- annonces : tout utilisateur authentifié voit les annonces actives, le super admin gère tout
create policy "annonces_select"
on public.annonces for select
to authenticated
using (actif or public.is_super_admin());

create policy "annonces_insert"
on public.annonces for insert
to authenticated
with check (public.is_super_admin());

create policy "annonces_update"
on public.annonces for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "annonces_delete"
on public.annonces for delete
to authenticated
using (public.is_super_admin());

-- QuincaPro — Fondation multi-tenant
-- Tables : entreprises (tenant), profiles (utilisateurs + rôles)
-- Isolation stricte des données par entreprise via RLS.

create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

create type public.app_role as enum (
  'super_admin',
  'admin',
  'comptable',
  'caissier',
  'magasinier',
  'vendeur',
  'responsable_stock',
  'consultation'
);

create type public.subscription_status as enum (
  'en_attente_paiement',
  'actif',
  'expire',
  'suspendu'
);

-- =========================================================
-- TABLES
-- =========================================================

create table public.entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(trim(nom)) > 0),
  logo_url text,
  adresse text,
  ninea text,
  rccm text,
  telephone text,
  email text,
  tva_numero text,
  devise text not null default 'FCFA',
  langue text not null default 'fr',
  statut_abonnement public.subscription_status not null default 'en_attente_paiement',
  date_expiration_abonnement timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  entreprise_id uuid references public.entreprises (id) on delete cascade,
  role public.app_role not null default 'vendeur',
  nom_complet text not null check (char_length(trim(nom_complet)) > 0),
  telephone text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_entreprise_required_unless_super_admin
    check (role = 'super_admin' or entreprise_id is not null)
);

create index idx_profiles_entreprise_id on public.profiles (entreprise_id);
create index idx_profiles_role on public.profiles (role);
create index idx_entreprises_statut_abonnement on public.entreprises (statut_abonnement);

-- =========================================================
-- FONCTIONS UTILITAIRES (SECURITY DEFINER : évite la récursion RLS)
-- =========================================================

create function public.current_entreprise_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select entreprise_id from public.profiles where id = auth.uid();
$$;

create function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

create function public.is_admin_of_own_entreprise()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================
-- INSCRIPTION ATOMIQUE : crée l'entreprise + son admin en une transaction
-- =========================================================

create function public.register_entreprise(
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

  return v_entreprise;
end;
$$;

grant execute on function public.register_entreprise(text, text, text) to authenticated;

-- =========================================================
-- TRIGGERS
-- =========================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_entreprises_updated_at
before update on public.entreprises
for each row execute function public.set_updated_at();

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Empêche un utilisateur non-admin de modifier son propre rôle ou de changer d'entreprise
create function public.prevent_privilege_escalation()
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

  return new;
end;
$$;

create trigger trg_profiles_prevent_escalation
before update on public.profiles
for each row execute function public.prevent_privilege_escalation();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.entreprises enable row level security;
alter table public.profiles enable row level security;

-- entreprises : lecture limitée à la sienne (ou tout pour le super admin)
create policy "entreprises_select"
on public.entreprises for select
to authenticated
using (
  public.is_super_admin() or id = public.current_entreprise_id()
);

-- entreprises : mise à jour réservée à l'admin de l'entreprise ou au super admin
create policy "entreprises_update"
on public.entreprises for update
to authenticated
using (
  public.is_super_admin()
  or (id = public.current_entreprise_id() and public.is_admin_of_own_entreprise())
)
with check (
  public.is_super_admin()
  or (id = public.current_entreprise_id() and public.is_admin_of_own_entreprise())
);

-- entreprises : suppression réservée au super admin
create policy "entreprises_delete"
on public.entreprises for delete
to authenticated
using (public.is_super_admin());

-- Aucune politique INSERT sur entreprises : la création passe exclusivement
-- par register_entreprise() (SECURITY DEFINER), jamais par un insert direct.

-- profiles : chacun voit son propre profil, l'admin/super admin voit toute l'équipe
create policy "profiles_select"
on public.profiles for select
to authenticated
using (
  public.is_super_admin()
  or id = auth.uid()
  or entreprise_id = public.current_entreprise_id()
);

-- profiles : seul un admin (ou super admin) peut ajouter un membre à son équipe
create policy "profiles_insert"
on public.profiles for insert
to authenticated
with check (
  public.is_super_admin()
  or (
    public.is_admin_of_own_entreprise()
    and entreprise_id = public.current_entreprise_id()
    and role <> 'super_admin'
  )
);

-- profiles : l'admin gère son équipe, chacun peut modifier ses propres infos
-- (le trigger trg_profiles_prevent_escalation bloque l'auto-promotion)
create policy "profiles_update"
on public.profiles for update
to authenticated
using (
  public.is_super_admin()
  or (public.is_admin_of_own_entreprise() and entreprise_id = public.current_entreprise_id())
  or id = auth.uid()
)
with check (
  public.is_super_admin()
  or (public.is_admin_of_own_entreprise() and entreprise_id = public.current_entreprise_id())
  or id = auth.uid()
);

-- profiles : l'admin peut retirer un membre (jamais lui-même)
create policy "profiles_delete"
on public.profiles for delete
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_admin_of_own_entreprise()
    and entreprise_id = public.current_entreprise_id()
    and id <> auth.uid()
  )
);

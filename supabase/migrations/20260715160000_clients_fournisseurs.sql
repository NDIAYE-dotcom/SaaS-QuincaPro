-- Module Clients & Fournisseurs
-- Même schéma d'isolation multi-tenant que categories/produits (entreprise_id
-- auto-rempli, RLS scoping, écriture bloquée pour le rôle 'consultation').
--
-- Le solde de dette (clients et fournisseurs) n'est volontairement pas modélisé
-- ici : ce sera un champ calculé/alimenté par le futur module Ventes/Achats/Dettes,
-- pas une valeur éditable à la main.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) > 0),
  telephone text,
  whatsapp text,
  email text,
  adresse text,
  limite_credit numeric(14, 2) not null default 0 check (limite_credit >= 0),
  notes text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_entreprise_id on public.clients (entreprise_id);
create index idx_clients_nom_trgm on public.clients using gin (nom gin_trgm_ops);

create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create table public.fournisseurs (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) > 0),
  contact_nom text,
  telephone text,
  whatsapp text,
  email text,
  adresse text,
  notes text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fournisseurs_entreprise_id on public.fournisseurs (entreprise_id);
create index idx_fournisseurs_nom_trgm on public.fournisseurs using gin (nom gin_trgm_ops);

create trigger trg_fournisseurs_updated_at
before update on public.fournisseurs
for each row execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.clients enable row level security;
alter table public.fournisseurs enable row level security;

create policy "clients_select"
on public.clients for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "clients_insert"
on public.clients for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "clients_update"
on public.clients for update
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
)
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "clients_delete"
on public.clients for delete
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "fournisseurs_select"
on public.fournisseurs for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "fournisseurs_insert"
on public.fournisseurs for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "fournisseurs_update"
on public.fournisseurs for update
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
)
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "fournisseurs_delete"
on public.fournisseurs for delete
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

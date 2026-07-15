-- Module Produits : catégories (2 niveaux), produits, stockage des photos.
-- entreprise_id est auto-rempli via current_entreprise_id() : le client n'a jamais
-- besoin de le préciser, et la politique RLS with_check est donc toujours satisfaite.

create extension if not exists pg_trgm;

-- =========================================================
-- CATEGORIES (catégorie + sous-catégorie, 2 niveaux max)
-- =========================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  parent_id uuid references public.categories (id) on delete set null,
  nom text not null check (char_length(trim(nom)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_no_self_parent check (id <> parent_id)
);

create unique index idx_categories_unique_top_level
  on public.categories (entreprise_id, nom) where parent_id is null;

create unique index idx_categories_unique_sub
  on public.categories (entreprise_id, parent_id, nom) where parent_id is not null;

create index idx_categories_entreprise_id on public.categories (entreprise_id);

create function public.validate_category_hierarchy()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if not exists (
      select 1 from public.categories
      where id = new.parent_id and entreprise_id = new.entreprise_id
    ) then
      raise exception 'La catégorie parente doit appartenir à la même entreprise';
    end if;

    if exists (
      select 1 from public.categories where id = new.parent_id and parent_id is not null
    ) then
      raise exception 'Une sous-catégorie ne peut pas avoir de sous-catégorie';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_categories_validate_hierarchy
before insert or update on public.categories
for each row execute function public.validate_category_hierarchy();

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- =========================================================
-- PRODUITS
-- =========================================================

create table public.produits (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  categorie_id uuid references public.categories (id) on delete set null,
  nom text not null check (char_length(trim(nom)) > 0),
  description text,
  sku text,
  code_barre text,
  marque text,
  unite text not null default 'Pièce',
  prix_achat numeric(12, 2) not null default 0 check (prix_achat >= 0),
  prix_vente numeric(12, 2) not null default 0 check (prix_vente >= 0),
  taux_tva numeric(5, 2) not null default 0 check (taux_tva >= 0 and taux_tva <= 100),
  remise_pourcentage numeric(5, 2) not null default 0 check (remise_pourcentage >= 0 and remise_pourcentage <= 100),
  stock_minimum numeric(12, 2) not null default 0 check (stock_minimum >= 0),
  stock_maximum numeric(12, 2) check (stock_maximum is null or stock_maximum >= stock_minimum),
  stock_critique numeric(12, 2) not null default 0 check (stock_critique >= 0),
  quantite_stock numeric(12, 2) not null default 0 check (quantite_stock >= 0),
  photo_url text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_produits_unique_sku
  on public.produits (entreprise_id, sku) where sku is not null and sku <> '';

create index idx_produits_entreprise_id on public.produits (entreprise_id);
create index idx_produits_categorie_id on public.produits (categorie_id);
create index idx_produits_nom_trgm on public.produits using gin (nom gin_trgm_ops);
create index idx_produits_code_barre
  on public.produits (code_barre) where code_barre is not null and code_barre <> '';

create function public.validate_produit_categorie()
returns trigger
language plpgsql
as $$
begin
  if new.categorie_id is not null and not exists (
    select 1 from public.categories
    where id = new.categorie_id and entreprise_id = new.entreprise_id
  ) then
    raise exception 'La catégorie doit appartenir à la même entreprise';
  end if;

  return new;
end;
$$;

create trigger trg_produits_validate_categorie
before insert or update on public.produits
for each row execute function public.validate_produit_categorie();

create trigger trg_produits_updated_at
before update on public.produits
for each row execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.categories enable row level security;
alter table public.produits enable row level security;

create policy "categories_select"
on public.categories for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "categories_insert"
on public.categories for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "categories_update"
on public.categories for update
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
)
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "categories_delete"
on public.categories for delete
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "produits_select"
on public.produits for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "produits_insert"
on public.produits for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "produits_update"
on public.produits for update
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
)
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

create policy "produits_delete"
on public.produits for delete
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

-- =========================================================
-- STOCKAGE DES PHOTOS PRODUITS
-- =========================================================

insert into storage.buckets (id, name, public)
values ('produits-photos', 'produits-photos', true)
on conflict (id) do nothing;

create policy "produits_photos_select"
on storage.objects for select
to public
using (bucket_id = 'produits-photos');

create policy "produits_photos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'produits-photos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_entreprise_id()::text
      and public.current_user_role() <> 'consultation'
    )
  )
);

create policy "produits_photos_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'produits-photos'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_entreprise_id()::text
  )
)
with check (
  bucket_id = 'produits-photos'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_entreprise_id()::text
  )
);

create policy "produits_photos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'produits-photos'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_entreprise_id()::text
  )
);

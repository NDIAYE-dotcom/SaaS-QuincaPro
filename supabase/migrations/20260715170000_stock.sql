-- Module Stock : journal des mouvements + fonction atomique qui met à jour
-- produits.quantite_stock et enregistre l'historique en une seule opération.
--
-- La fonction est en SECURITY INVOKER (par défaut) : elle s'exécute avec les
-- droits de l'appelant, donc les politiques RLS de produits/mouvements_stock
-- s'appliquent normalement (isolation par entreprise + blocage du rôle
-- 'consultation'), sans avoir à dupliquer ces contrôles dans la fonction.
--
-- Valorisation FIFO/LIFO/CMP et « inventaire intelligent » (comparaison
-- automatique + rapport PDF) sont reportés : ils nécessitent le suivi des
-- coûts par lot du futur module Achats.

create type public.type_mouvement_stock as enum ('entree', 'sortie', 'correction', 'inventaire');

create table public.mouvements_stock (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  produit_id uuid not null references public.produits (id) on delete cascade,
  type public.type_mouvement_stock not null,
  quantite numeric(12, 2) not null,
  quantite_avant numeric(12, 2) not null,
  quantite_apres numeric(12, 2) not null,
  motif text,
  cree_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_mouvements_stock_entreprise_id on public.mouvements_stock (entreprise_id);
create index idx_mouvements_stock_produit_id on public.mouvements_stock (produit_id);
create index idx_mouvements_stock_created_at on public.mouvements_stock (created_at desc);
create index idx_mouvements_stock_type on public.mouvements_stock (type);

create function public.enregistrer_mouvement_stock(
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
  select * into v_produit from public.produits where id = p_produit_id;
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

grant execute on function public.enregistrer_mouvement_stock(uuid, public.type_mouvement_stock, numeric, numeric, text)
  to authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.mouvements_stock enable row level security;

create policy "mouvements_stock_select"
on public.mouvements_stock for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "mouvements_stock_insert"
on public.mouvements_stock for insert
to authenticated
with check (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.current_user_role() <> 'consultation')
);

-- Aucune politique UPDATE : le journal des mouvements est immuable, on corrige
-- en créant un nouveau mouvement plutôt qu'en modifiant l'historique.

create policy "mouvements_stock_delete"
on public.mouvements_stock for delete
to authenticated
using (public.is_super_admin());

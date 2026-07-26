-- Module Dépenses de caisse : sorties d'argent quotidiennes de la caisse
-- (repas, transport des employés, petites fournitures...) qui doivent être
-- comptabilisées automatiquement, exactement comme les ventes et achats.
--
-- Une dépense est immuable une fois créée (comme les écritures) : on ne peut
-- pas éditer son montant après coup, seulement l'"annuler", ce qui génère une
-- écriture de contre-passation. Voir generer_ecriture_achat()/vente() dans
-- 20260715200000_comptabilite.sql pour le pattern d'origine.

-- =========================================================
-- Nouveau compte système : charges diverses de caisse
-- =========================================================

create or replace function public.seed_plan_comptable(p_entreprise_id uuid)
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
    (p_entreprise_id, '701', 'Ventes de marchandises', 'produit', 'VENTES'),
    (p_entreprise_id, '658', 'Charges diverses de caisse', 'charge', 'DEPENSES_CAISSE');
end;
$$;

-- Sème le nouveau compte pour les entreprises déjà existantes (qui ont déjà
-- un plan comptable, donc le insert conditionnel de la migration d'origine
-- ne les touchera pas).
do $$
declare
  v_entreprise record;
begin
  for v_entreprise in select id from public.entreprises loop
    if not exists (
      select 1 from public.comptes_comptables
      where entreprise_id = v_entreprise.id and code_systeme = 'DEPENSES_CAISSE'
    ) then
      insert into public.comptes_comptables (entreprise_id, numero, nom, nature, code_systeme)
      values (v_entreprise.id, '658', 'Charges diverses de caisse', 'charge', 'DEPENSES_CAISSE')
      on conflict (entreprise_id, numero) do nothing;
    end if;
  end loop;
end;
$$;

-- =========================================================
-- TABLE DEPENSES_CAISSE
-- =========================================================

create table public.depenses_caisse (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null default public.current_entreprise_id() references public.entreprises (id) on delete cascade,
  date_depense date not null default current_date,
  categorie text not null check (char_length(trim(categorie)) > 0),
  description text,
  montant numeric(12, 2) not null check (montant > 0),
  annulee boolean not null default false,
  annulee_le timestamptz,
  cree_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_depenses_caisse_entreprise_id on public.depenses_caisse (entreprise_id);
create index idx_depenses_caisse_date on public.depenses_caisse (date_depense desc);

-- Une dépense déjà enregistrée ne peut pas être modifiée (montant, catégorie,
-- date, description) : seule l'annulation (annulee/annulee_le) est permise,
-- sans quoi la dépense se désynchroniserait de l'écriture déjà comptabilisée.

create function public.empecher_modification_depense_caisse()
returns trigger
language plpgsql
as $$
begin
  if new.montant <> old.montant
     or new.categorie <> old.categorie
     or new.date_depense <> old.date_depense
     or coalesce(new.description, '') <> coalesce(old.description, '') then
    raise exception 'Une dépense déjà enregistrée ne peut pas être modifiée. Annulez-la et créez-en une nouvelle si besoin.';
  end if;
  return new;
end;
$$;

create trigger trg_depenses_caisse_empecher_modification
before update on public.depenses_caisse
for each row execute function public.empecher_modification_depense_caisse();

-- =========================================================
-- ÉCRITURE AUTOMATIQUE À LA CRÉATION
-- =========================================================

create function public.generer_ecriture_depense_caisse()
returns trigger
language plpgsql
as $$
declare
  v_compte_charges uuid;
  v_compte_caisse uuid;
  v_lignes jsonb;
begin
  select id into v_compte_charges from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'DEPENSES_CAISSE';
  select id into v_compte_caisse from public.comptes_comptables where entreprise_id = new.entreprise_id and code_systeme = 'CAISSE';

  if v_compte_charges is null or v_compte_caisse is null then
    return new;
  end if;

  v_lignes := jsonb_build_array(
    jsonb_build_object('compte_id', v_compte_charges, 'debit', new.montant, 'credit', 0, 'libelle', new.categorie),
    jsonb_build_object('compte_id', v_compte_caisse, 'debit', 0, 'credit', new.montant)
  );

  perform public.creer_ecriture(
    'Dépense caisse - ' || new.categorie, v_lignes, new.date_depense, 'depense_caisse', new.id
  );

  return new;
end;
$$;

create trigger trg_depenses_caisse_generer_ecriture
after insert on public.depenses_caisse
for each row execute function public.generer_ecriture_depense_caisse();

-- =========================================================
-- ÉCRITURE DE CONTRE-PASSATION À L'ANNULATION
-- =========================================================

create function public.generer_ecriture_annulation_depense_caisse()
returns trigger
language plpgsql
as $$
declare
  v_ecriture record;
  v_ligne record;
  v_lignes jsonb;
begin
  if new.annulee is not true or old.annulee is true then
    return new;
  end if;

  for v_ecriture in
    select ec.* from public.ecritures_comptables ec
    where ec.reference_id = new.id and ec.origine = 'depense_caisse'
  loop
    v_lignes := '[]'::jsonb;

    for v_ligne in select * from public.lignes_ecriture where ecriture_id = v_ecriture.id
    loop
      v_lignes := v_lignes || jsonb_build_object('compte_id', v_ligne.compte_id, 'debit', v_ligne.credit, 'credit', v_ligne.debit);
    end loop;

    perform public.creer_ecriture(
      'Annulation dépense - ' || new.categorie || ' (' || v_ecriture.numero || ')',
      v_lignes, current_date, 'annulation_depense_caisse', new.id
    );
  end loop;

  return new;
end;
$$;

create trigger trg_depenses_caisse_generer_ecriture_annulation
after update on public.depenses_caisse
for each row execute function public.generer_ecriture_annulation_depense_caisse();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.depenses_caisse enable row level security;

create policy "depenses_caisse_select"
on public.depenses_caisse for select
to authenticated
using (public.is_super_admin() or entreprise_id = public.current_entreprise_id());

create policy "depenses_caisse_insert"
on public.depenses_caisse for insert
to authenticated
with check (
  public.is_super_admin()
  or (
    entreprise_id = public.current_entreprise_id()
    and public.current_user_role() in ('admin', 'comptable', 'caissier')
  )
);

create policy "depenses_caisse_update"
on public.depenses_caisse for update
to authenticated
using (
  public.is_super_admin()
  or (
    entreprise_id = public.current_entreprise_id()
    and public.current_user_role() in ('admin', 'comptable', 'caissier')
  )
)
with check (
  public.is_super_admin()
  or (
    entreprise_id = public.current_entreprise_id()
    and public.current_user_role() in ('admin', 'comptable', 'caissier')
  )
);

-- Pas de politique DELETE : une dépense se corrige par annulation (contre-
-- passation), jamais par suppression, pour garder l'historique comptable intact.

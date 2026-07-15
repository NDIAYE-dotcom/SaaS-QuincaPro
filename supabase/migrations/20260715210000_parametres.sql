-- Module Paramètres : stockage du logo d'entreprise.
-- Les autres champs (adresse, NINEA, RCCM, TVA, devise, langue...) existent
-- déjà sur la table entreprises depuis la migration multi-tenant initiale ;
-- seule l'édition (déjà couverte par la politique entreprises_update, qui
-- réserve la modification à l'admin de l'entreprise ou au super admin) était
-- manquante côté stockage pour le logo.

insert into storage.buckets (id, name, public)
values ('entreprise-logos', 'entreprise-logos', true)
on conflict (id) do nothing;

create policy "entreprise_logos_select"
on storage.objects for select
to public
using (bucket_id = 'entreprise-logos');

create policy "entreprise_logos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'entreprise-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_entreprise_id()::text
      and public.is_admin_of_own_entreprise()
    )
  )
);

create policy "entreprise_logos_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'entreprise-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_entreprise_id()::text
      and public.is_admin_of_own_entreprise()
    )
  )
)
with check (
  bucket_id = 'entreprise-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_entreprise_id()::text
      and public.is_admin_of_own_entreprise()
    )
  )
);

create policy "entreprise_logos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'entreprise-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_entreprise_id()::text
      and public.is_admin_of_own_entreprise()
    )
  )
);

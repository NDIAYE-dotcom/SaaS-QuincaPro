-- Les logs Vercel sont éphémères (rétention limitée) : cette table permet de diagnostiquer un
-- paiement PayDunya bloqué même plusieurs jours après, sans dépendre de la rétention des logs.
create table public.paydunya_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  token text,
  entreprise_id uuid references public.entreprises (id) on delete set null,
  statut text not null check (statut in ('succes', 'echec', 'ignore')),
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_paydunya_webhook_logs_created_at on public.paydunya_webhook_logs (created_at desc);
create index idx_paydunya_webhook_logs_token on public.paydunya_webhook_logs (token);

alter table public.paydunya_webhook_logs enable row level security;

-- Lecture réservée au super admin (données techniques cross-tenant). L'écriture se fait
-- uniquement depuis le webhook via la service_role, qui contourne RLS : aucune policy
-- insert/update/delete n'est nécessaire ni souhaitable ici.
create policy "paydunya_webhook_logs_select"
on public.paydunya_webhook_logs for select
to authenticated
using (public.is_super_admin());

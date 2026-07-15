-- Empêche un admin d'entreprise de modifier lui-même le statut de son abonnement
-- via l'API (RLS ne permet pas de restreindre au niveau colonne, on utilise un trigger).
-- Un accès direct (SQL Editor, migration, tâche planifiée) sans JWT (auth.uid() null)
-- reste autorisé, tout comme le Super Admin.

create or replace function public.prevent_subscription_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_super_admin() then
    return new;
  end if;

  if new.statut_abonnement <> old.statut_abonnement then
    raise exception 'Seul le Super Admin peut modifier le statut de l''abonnement';
  end if;

  if new.date_expiration_abonnement is distinct from old.date_expiration_abonnement then
    raise exception 'Seul le Super Admin peut modifier la date d''expiration de l''abonnement';
  end if;

  return new;
end;
$$;

create trigger trg_entreprises_prevent_subscription_tampering
before update on public.entreprises
for each row execute function public.prevent_subscription_tampering();

-- Même assouplissement pour le trigger anti-élévation de privilèges sur profiles :
-- un accès direct sans JWT (SQL Editor, support) ne doit pas être bloqué.

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_super_admin() then
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

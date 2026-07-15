-- QuincaPro — Gestion d'équipe : invitations de membres
--
-- Un admin ne peut pas créer directement un compte pour un employé (créer un
-- auth.users nécessite soit l'API Admin/service_role — indisponible côté
-- client — soit que la personne s'inscrive elle-même). On utilise donc un
-- système d'invitation par jeton : l'admin crée une invitation (email, rôle,
-- nom), partage manuellement le lien (WhatsApp, SMS...), et la personne
-- s'inscrit via /invitation/:token, ce qui appelle accept_invitation() au
-- lieu de register_entreprise() pour rattacher son compte à l'entreprise
-- existante avec le rôle prévu.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  email text not null check (char_length(trim(email)) > 0),
  role public.app_role not null,
  nom_complet text not null check (char_length(trim(nom_complet)) > 0),
  token uuid not null default gen_random_uuid(),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_role_not_super_admin check (role <> 'super_admin')
);

create unique index idx_invitations_token on public.invitations (token);
create index idx_invitations_entreprise_id on public.invitations (entreprise_id);

-- =========================================================
-- RPC : consultation publique d'une invitation par jeton
-- (nécessaire avant authentification pour afficher le formulaire d'inscription)
-- =========================================================

create function public.get_invitation(p_token uuid)
returns table (
  entreprise_nom text,
  email text,
  role public.app_role,
  nom_complet text,
  valide boolean
)
language sql
security definer
set search_path = public
as $$
  select e.nom, i.email, i.role, i.nom_complet,
    (i.used_at is null and i.expires_at > now())
  from public.invitations i
  join public.entreprises e on e.id = i.entreprise_id
  where i.token = p_token;
$$;

grant execute on function public.get_invitation(uuid) to anon, authenticated;

-- =========================================================
-- RPC : acceptation atomique d'une invitation
-- Rattache le compte fraîchement inscrit (auth.uid()) à l'entreprise de
-- l'invitation, avec le rôle et le nom prévus, puis marque l'invitation
-- comme utilisée.
-- =========================================================

create function public.accept_invitation(p_token uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations;
  v_email text;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Cet utilisateur possède déjà un profil';
  end if;

  select * into v_invitation from public.invitations where token = p_token for update;
  if not found then
    raise exception 'Invitation introuvable';
  end if;

  if v_invitation.used_at is not null then
    raise exception 'Cette invitation a déjà été utilisée';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'Cette invitation a expiré';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if v_email is distinct from v_invitation.email then
    raise exception 'Cette invitation a été envoyée à une autre adresse email';
  end if;

  insert into public.profiles (id, entreprise_id, role, nom_complet)
  values (auth.uid(), v_invitation.entreprise_id, v_invitation.role, v_invitation.nom_complet)
  returning * into v_profile;

  update public.invitations set used_at = now() where id = v_invitation.id;

  return v_profile;
end;
$$;

grant execute on function public.accept_invitation(uuid) to authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.invitations enable row level security;

-- seul l'admin de l'entreprise (ou le super admin) gère les invitations de son équipe
create policy "invitations_select"
on public.invitations for select
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.is_admin_of_own_entreprise())
);

create policy "invitations_insert"
on public.invitations for insert
to authenticated
with check (
  entreprise_id = public.current_entreprise_id()
  and public.is_admin_of_own_entreprise()
  and role <> 'super_admin'
);

create policy "invitations_delete"
on public.invitations for delete
to authenticated
using (
  public.is_super_admin()
  or (entreprise_id = public.current_entreprise_id() and public.is_admin_of_own_entreprise())
);

-- Aucune politique update : le seul champ mutable (used_at) est écrit
-- exclusivement par accept_invitation() (SECURITY DEFINER).

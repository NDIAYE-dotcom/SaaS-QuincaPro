-- Intégration PayDunya : paiement en ligne automatique de l'abonnement par les entreprises
-- clientes, en plus de l'activation manuelle existante par le Super Admin.
--
-- Architecture : le paiement est initié et confirmé par des fonctions serveur Vercel
-- (api/paydunya/create-invoice.js, api/paydunya/webhook.js) qui parlent à l'API PayDunya avec
-- des clés secrètes jamais exposées au navigateur. Le webhook, une fois le paiement vérifié
-- directement auprès de PayDunya (jamais sur la seule foi du corps du POST reçu), appelle la
-- fonction ci-dessous avec la clé "service_role" de Supabase.
--
-- Cette fonction ne doit JAMAIS être appelable par un utilisateur normal (elle active un
-- abonnement sans repasser par admin_activer_abonnement ni vérifier is_super_admin) : elle
-- n'est donc accordée qu'au rôle service_role, jamais à authenticated/anon.

alter type public.methode_paiement_abonnement add value if not exists 'paydunya';

-- Idempotence : PayDunya peut renvoyer plusieurs fois le même webhook (retry réseau). La
-- référence externe (token de facture PayDunya) est unique : un retry ne prolonge pas
-- l'abonnement deux fois.
alter table public.abonnement_paiements
  add column if not exists reference_externe text;

create unique index if not exists abonnement_paiements_reference_externe_key
  on public.abonnement_paiements (reference_externe)
  where reference_externe is not null;

create function public.paydunya_confirmer_paiement(
  p_entreprise_id uuid,
  p_montant numeric,
  p_duree_mois integer,
  p_reference text
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
  if p_reference is null or length(trim(p_reference)) = 0 then
    raise exception 'Référence de paiement manquante';
  end if;

  -- Déjà traité (webhook rejoué) : on renvoie l'entreprise telle quelle sans rien modifier.
  if exists (select 1 from public.abonnement_paiements where reference_externe = p_reference) then
    select * into v_entreprise from public.entreprises where id = p_entreprise_id;
    return v_entreprise;
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
    (entreprise_id, montant, methode, periode_debut, periode_fin, notes, reference_externe, created_by)
  values
    (p_entreprise_id, p_montant, 'paydunya', v_base::date, v_fin::date, 'Paiement en ligne PayDunya', p_reference, null);

  update public.entreprises
  set statut_abonnement = 'actif',
      date_expiration_abonnement = v_fin
  where id = p_entreprise_id
  returning * into v_entreprise;

  return v_entreprise;
end;
$$;

revoke all on function public.paydunya_confirmer_paiement(uuid, numeric, integer, text) from public, anon, authenticated;
grant execute on function public.paydunya_confirmer_paiement(uuid, numeric, integer, text) to service_role;

-- Corrige : column "statut_paiement" is of type statut_paiement but expression is of type text
--
-- Bug préexistant (présent depuis la création de ces fonctions) : dans une expression
-- CASE WHEN ... THEN 'paye' ... END, PostgreSQL résout le type du résultat en "text" par
-- défaut, contrairement à une affectation directe "statut_paiement = 'paye'" où le type de
-- la colonne cible est appliqué directement au littéral. Il faut donc caster explicitement
-- le résultat du CASE vers le type enum. Jamais déclenché avant : les paiements initiaux
-- (à la création d'une vente/d'un achat) passent par une variable plpgsql typée, seul
-- l'ajout d'un paiement APRÈS coup (trigger appliquer_paiement_vente/achat) emprunte ce
-- chemin CASE.

create or replace function public.appliquer_paiement_vente()
returns trigger
language plpgsql
as $$
declare
  v_vente public.ventes;
  v_reste numeric(14, 2);
begin
  select * into v_vente from public.ventes where id = new.vente_id for update;
  if not found then
    raise exception 'Vente introuvable';
  end if;

  if v_vente.statut <> 'facture' then
    raise exception 'Impossible d''enregistrer un paiement sur ce type de document';
  end if;

  v_reste := v_vente.total_ttc - v_vente.montant_paye;
  if new.montant > v_reste then
    raise exception 'Le montant dépasse le solde restant (% FCFA)', v_reste;
  end if;

  update public.ventes
  set montant_paye = montant_paye + new.montant,
      statut_paiement = (case
        when montant_paye + new.montant >= total_ttc then 'paye'
        when montant_paye + new.montant > 0 then 'partiel'
        else 'impaye'
      end)::public.statut_paiement
  where id = new.vente_id;

  if v_vente.client_id is not null then
    update public.clients
    set solde_dette = greatest(solde_dette - new.montant, 0)
    where id = v_vente.client_id;
  end if;

  return new;
end;
$$;

create or replace function public.appliquer_paiement_achat()
returns trigger
language plpgsql
as $$
declare
  v_achat public.achats;
  v_reste numeric(14, 2);
begin
  select * into v_achat from public.achats where id = new.achat_id for update;
  if not found then
    raise exception 'Achat introuvable';
  end if;

  if v_achat.statut <> 'recu' then
    raise exception 'Impossible d''enregistrer un paiement sur cet achat';
  end if;

  v_reste := v_achat.total_ttc - v_achat.montant_paye;
  if new.montant > v_reste then
    raise exception 'Le montant dépasse le solde restant (% FCFA)', v_reste;
  end if;

  update public.achats
  set montant_paye = montant_paye + new.montant,
      statut_paiement = (case
        when montant_paye + new.montant >= total_ttc then 'paye'
        when montant_paye + new.montant > 0 then 'partiel'
        else 'impaye'
      end)::public.statut_paiement
  where id = new.achat_id;

  if v_achat.fournisseur_id is not null then
    update public.fournisseurs
    set solde_dette = greatest(solde_dette - new.montant, 0)
    where id = v_achat.fournisseur_id;
  end if;

  return new;
end;
$$;

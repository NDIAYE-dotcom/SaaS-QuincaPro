-- Permet de saisir le nom (et téléphone) d'un client de passage directement sur une vente,
-- sans devoir créer une fiche client permanente dans la page Clients — cas fréquent en
-- quincaillerie (client unique, non fidélisé).

alter table public.ventes
  add column if not exists client_nom_libre text,
  add column if not exists client_telephone_libre text;

create or replace function public.creer_vente(
  p_client_id uuid,
  p_statut public.statut_vente,
  p_type_facture public.type_facture,
  p_lignes jsonb,
  p_montant_paye_initial numeric default 0,
  p_notes text default null,
  p_client_nom_libre text default null,
  p_client_telephone_libre text default null
)
returns public.ventes
language plpgsql
as $$
declare
  v_entreprise_id uuid := public.current_entreprise_id();
  v_numero text;
  v_compteur integer;
  v_vente public.ventes;
  v_ligne jsonb;
  v_produit public.produits;
  v_sous_total numeric(14, 2) := 0;
  v_total_tva numeric(14, 2) := 0;
  v_total_ttc numeric(14, 2);
  v_total_ligne numeric(14, 2);
  v_ligne_ht numeric(14, 2);
  v_ligne_tva numeric(14, 2);
  v_statut_paiement public.statut_paiement;
  v_prefixe text;
begin
  if v_entreprise_id is null then
    raise exception 'Aucune entreprise associée à cet utilisateur';
  end if;

  if p_lignes is null or jsonb_array_length(p_lignes) = 0 then
    raise exception 'La vente doit contenir au moins une ligne';
  end if;

  if p_client_id is not null and not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Client introuvable';
  end if;

  v_compteur := public.next_numero_facture(v_entreprise_id);

  v_prefixe := case when p_statut = 'devis' then 'DEV' else 'FAC' end;
  v_numero := v_prefixe || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_compteur::text, 5, '0');

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    v_ligne_ht := (v_ligne ->> 'quantite')::numeric * (v_ligne ->> 'prix_unitaire')::numeric;
    v_ligne_ht := v_ligne_ht - (v_ligne_ht * coalesce((v_ligne ->> 'remise_pourcentage')::numeric, 0) / 100);
    v_ligne_tva := v_ligne_ht * coalesce((v_ligne ->> 'taux_tva')::numeric, 0) / 100;

    v_sous_total := v_sous_total + v_ligne_ht;
    v_total_tva := v_total_tva + v_ligne_tva;
  end loop;

  v_total_ttc := v_sous_total + v_total_tva;

  if p_montant_paye_initial > v_total_ttc then
    raise exception 'Le montant payé ne peut pas dépasser le total de la vente';
  end if;

  if p_montant_paye_initial >= v_total_ttc then
    v_statut_paiement := 'paye';
  elsif p_montant_paye_initial > 0 then
    v_statut_paiement := 'partiel';
  else
    v_statut_paiement := 'impaye';
  end if;

  insert into public.ventes (
    client_id, numero, statut, type_facture, statut_paiement,
    sous_total, total_tva, total_ttc, montant_paye, notes,
    client_nom_libre, client_telephone_libre, cree_par
  )
  values (
    p_client_id, v_numero, p_statut, p_type_facture, v_statut_paiement,
    v_sous_total, v_total_tva, v_total_ttc, p_montant_paye_initial, p_notes,
    nullif(trim(p_client_nom_libre), ''), nullif(trim(p_client_telephone_libre), ''), auth.uid()
  )
  returning * into v_vente;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    select * into v_produit from public.produits where id = (v_ligne ->> 'produit_id')::uuid;
    if not found then
      raise exception 'Produit introuvable : %', (v_ligne ->> 'produit_id');
    end if;

    v_ligne_ht := (v_ligne ->> 'quantite')::numeric * (v_ligne ->> 'prix_unitaire')::numeric;
    v_ligne_ht := v_ligne_ht - (v_ligne_ht * coalesce((v_ligne ->> 'remise_pourcentage')::numeric, 0) / 100);
    v_total_ligne := v_ligne_ht + (v_ligne_ht * coalesce((v_ligne ->> 'taux_tva')::numeric, 0) / 100);

    insert into public.lignes_vente (
      vente_id, produit_id, quantite, prix_unitaire, taux_tva, remise_pourcentage, total_ligne
    )
    values (
      v_vente.id, v_produit.id, (v_ligne ->> 'quantite')::numeric, (v_ligne ->> 'prix_unitaire')::numeric,
      coalesce((v_ligne ->> 'taux_tva')::numeric, 0), coalesce((v_ligne ->> 'remise_pourcentage')::numeric, 0),
      v_total_ligne
    );

    if p_statut = 'facture' then
      perform public.enregistrer_mouvement_stock(
        v_produit.id, 'sortie', (v_ligne ->> 'quantite')::numeric, null, 'Vente ' || v_numero
      );
    end if;
  end loop;

  if p_client_id is not null and p_statut = 'facture' and (v_total_ttc - p_montant_paye_initial) > 0 then
    update public.clients
    set solde_dette = solde_dette + (v_total_ttc - p_montant_paye_initial)
    where id = p_client_id;
  end if;

  return v_vente;
end;
$$;

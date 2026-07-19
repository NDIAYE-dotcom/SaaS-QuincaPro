-- Ajoute le cachet et la signature de l'entreprise, affichés sur les factures PDF.
-- Réutilise le bucket "entreprise-logos" existant (déjà scindé par dossier
-- entreprise_id, cf. 20260715210000_parametres.sql) : pas de nouveau bucket
-- ni de nouvelle policy de stockage nécessaire.

alter table public.entreprises
  add column cachet_url text,
  add column signature_url text;

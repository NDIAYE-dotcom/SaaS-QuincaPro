-- Correctif : entreprise_id n'avait pas de valeur par défaut sur invitations
-- (contrairement à toutes les autres tables tenant), ce qui faisait échouer
-- l'insertion (le client n'envoie jamais ce champ explicitement) avec une
-- violation de la politique RLS invitations_insert (entreprise_id = null
-- ne peut jamais égaler current_entreprise_id()).

alter table public.invitations
  alter column entreprise_id set default public.current_entreprise_id();

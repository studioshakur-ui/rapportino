-- 20260610120000_ai_cron_classify_and_vision.sql
-- Déclenche automatiquement les deux fonctions IA toutes les 30 minutes :
--   - classify-incoming   : messages Telegram → core_events / cable_events
--   - parse-terrain-image : photos de listes → apparati_snapshots
--
-- Le cron appelle les edge functions en présentant la SERVICE_ROLE_KEY en Bearer
-- (mode "system" reconnu par _shared/auth.ts). INCA reste read-only.
--
-- PRÉ-REQUIS (à exécuter UNE FOIS, hors migration, via SQL editor — voir notes
-- de déploiement). Les secrets ne sont jamais écrits en clair dans une migration :
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<SERVICE_ROLE_KEY>',                'service_role_key');
--
-- Si ces secrets n'existent pas, les jobs ne feront rien (URL nulle → no-op),
-- sans casser la base.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Fonction utilitaire : POST vers une edge function avec l'auth système.
create or replace function public._ai_invoke_edge(fn_name text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  base_url text;
  svc_key  text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url'       limit 1;
  select decrypted_secret into svc_key  from vault.decrypted_secrets where name = 'service_role_key'  limit 1;

  -- Secrets absents → no-op silencieux (le job ne plante pas).
  if base_url is null or svc_key is null then
    return;
  end if;

  perform net.http_post(
    url     := base_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body    := payload,
    timeout_milliseconds := 120000
  );
end;
$$;

-- (Re)programmation idempotente des deux jobs.
do $$
begin
  -- Supprime d'anciennes versions si elles existent.
  perform cron.unschedule(jobid) from cron.job
   where jobname in ('ai-classify-incoming', 'ai-parse-terrain-image');

  -- Classification messages : toutes les 30 min (à :00 et :30).
  perform cron.schedule(
    'ai-classify-incoming',
    '0,30 * * * *',
    $cron$ select public._ai_invoke_edge('classify-incoming', jsonb_build_object('dry_run', false, 'limit', 100)); $cron$
  );

  -- Lecture images terrain : toutes les 30 min, décalé de 5 min (à :05 et :35)
  -- pour ne pas se chevaucher avec la classification.
  perform cron.schedule(
    'ai-parse-terrain-image',
    '5,35 * * * *',
    $cron$ select public._ai_invoke_edge('parse-terrain-image', jsonb_build_object('dry_run', false, 'limit', 10)); $cron$
  );
end;
$$;

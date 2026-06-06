-- P3.2 — Live Field Reaction Engine
-- Enable Supabase Realtime (INSERT streaming) on the ingestion tables so the UI
-- reacts to a Telegram/WhatsApp message instantly instead of polling.
--
-- INCA tables (inca_cavi, …) are intentionally EXCLUDED: they are read-only and
-- never streamed. This migration only touches the realtime publication, no DDL
-- on data tables.

do $$
declare
  t text;
  realtime_tables text[] := array[
    'whatsapp_messages',
    'incoming_messages',
    'core_events',
    'cable_events',
    'daily_list_item_events',
    'daily_list_imports',
    'daily_list_items',
    'cable_priorities',
    'agent_findings'
  ];
begin
  -- The publication is created by Supabase; guard in case it is absent.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array realtime_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    )
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

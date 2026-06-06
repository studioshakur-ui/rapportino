-- ============================================================================
-- CORE COMMAND — Daily List Engine P2/P2.1
--
-- Règles:
--   - INCA read-only: FK vers inca_cavi, aucun trigger/update sur inca_cavi.
--   - Tout lien terrain passe par events/messages existants.
--   - RLS single-owner via public.core_command_is_owner().
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- Telegram / live bridge compatibility: messages live are not tied to a file import.
alter table public.whatsapp_messages
  alter column import_id drop not null;

-- ---------------------------------------------------------------------------
-- Daily list imports
-- ---------------------------------------------------------------------------
create table if not exists public.daily_list_imports (
  id           uuid        primary key default gen_random_uuid(),
  file_name    text        not null,
  list_date    date,
  source_kind  text        not null check (source_kind in ('pdf', 'excel', 'manual')),
  imported_by  uuid        references auth.users(id) on delete set null,
  imported_at  timestamptz not null default now(),
  rows_count   integer     not null default 0,
  status       text        not null default 'draft'
                           check (status in ('draft', 'imported', 'failed')),
  raw_metadata jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Daily list items
-- ---------------------------------------------------------------------------
create table if not exists public.daily_list_items (
  id                    uuid        primary key default gen_random_uuid(),
  import_id             uuid        not null references public.daily_list_imports(id) on delete cascade,
  list_number           text,
  list_resolution_date  date,
  cable_code_raw        text        not null,
  cable_code_normalized text        not null,
  inca_cavo_id          uuid        references public.inca_cavi(id) on delete set null,
  stato_collegamento    text,
  app_partenza          text,
  app_arrivo            text,
  perimetro             text,
  data_perimetro        date,
  situazione_inca       text,
  note                  text,
  priority_level        text,
  planned_status        text,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Evidence links per daily list item
-- ---------------------------------------------------------------------------
create table if not exists public.daily_list_item_events (
  id                    uuid        primary key default gen_random_uuid(),
  import_id             uuid        not null references public.daily_list_imports(id) on delete cascade,
  daily_list_item_id    uuid        not null references public.daily_list_items(id) on delete cascade,
  cable_code_normalized text        not null,
  cable_event_id        uuid        references public.cable_events(id) on delete cascade,
  core_event_id         uuid        references public.core_events(id) on delete cascade,
  whatsapp_message_id   uuid        references public.whatsapp_messages(id) on delete set null,
  source_type           text        not null default 'cable_event'
                                      check (source_type in ('cable_event', 'core_event', 'whatsapp_message')),
  event_kind            text        not null,
  occurred_at           timestamptz not null,
  actor_label           text,
  raw_note              text,
  confidence            numeric     not null default 0,
  progress_percent      integer     check (progress_percent is null or progress_percent between 0 and 100),
  created_at            timestamptz not null default now(),
  check (
    cable_event_id is not null
    or core_event_id is not null
    or whatsapp_message_id is not null
  )
);

-- ---------------------------------------------------------------------------
-- Optional deterministic status snapshots for future AI Advisor context
-- ---------------------------------------------------------------------------
create table if not exists public.daily_list_item_status_snapshots (
  id                    uuid        primary key default gen_random_uuid(),
  import_id             uuid        not null references public.daily_list_imports(id) on delete cascade,
  daily_list_item_id    uuid        not null references public.daily_list_items(id) on delete cascade,
  cable_code_normalized text        not null,
  computed_status       text        not null,
  confirmed_by_whatsapp boolean     not null default false,
  missing_evidence      boolean     not null default false,
  has_short_issue       boolean     not null default false,
  has_missing_issue     boolean     not null default false,
  has_partial_progress  boolean     not null default false,
  last_evidence_at      timestamptz,
  last_actor            text,
  evidence_count        integer     not null default 0,
  payload               jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_daily_list_imports_imported_at
  on public.daily_list_imports (imported_at desc);

create index if not exists idx_daily_list_items_import_code
  on public.daily_list_items (import_id, cable_code_normalized);

create index if not exists idx_daily_list_items_inca
  on public.daily_list_items (inca_cavo_id)
  where inca_cavo_id is not null;

create index if not exists idx_daily_list_items_perimetro
  on public.daily_list_items (import_id, perimetro);

create index if not exists idx_daily_list_item_events_item_time
  on public.daily_list_item_events (daily_list_item_id, occurred_at desc);

create index if not exists idx_daily_list_item_events_code_time
  on public.daily_list_item_events (cable_code_normalized, occurred_at desc);

create unique index if not exists uq_daily_list_item_events_source
  on public.daily_list_item_events (
    daily_list_item_id,
    coalesce(cable_event_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(core_event_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(whatsapp_message_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_list_item_status_snapshots'
      and column_name = 'daily_list_item_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_list_item_status_snapshots'
      and column_name = 'snapshot_at'
  ) then
    execute 'create index if not exists idx_daily_list_item_status_snapshots_item_time on public.daily_list_item_status_snapshots (daily_list_item_id, snapshot_at desc)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_list_item_status_snapshots'
      and column_name = 'item_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_list_item_status_snapshots'
      and column_name = 'snapshot_at'
  ) then
    execute 'create index if not exists idx_daily_list_item_status_snapshots_item_time on public.daily_list_item_status_snapshots (item_id, snapshot_at desc)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_list_item_status_snapshots'
      and column_name = 'daily_list_item_id'
  ) then
    execute 'create index if not exists idx_daily_list_item_status_snapshots_item_time on public.daily_list_item_status_snapshots (daily_list_item_id, created_at desc)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_list_item_status_snapshots'
      and column_name = 'item_id'
  ) then
    execute 'create index if not exists idx_daily_list_item_status_snapshots_item_time on public.daily_list_item_status_snapshots (item_id, created_at desc)';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.daily_list_imports enable row level security;
alter table public.daily_list_items enable row level security;
alter table public.daily_list_item_events enable row level security;
alter table public.daily_list_item_status_snapshots enable row level security;

revoke all on public.daily_list_imports from anon;
revoke all on public.daily_list_items from anon;
revoke all on public.daily_list_item_events from anon;
revoke all on public.daily_list_item_status_snapshots from anon;

grant select, insert, update, delete on public.daily_list_imports to authenticated;
grant select, insert, update, delete on public.daily_list_items to authenticated;
grant select, insert, update, delete on public.daily_list_item_events to authenticated;
grant select, insert, update, delete on public.daily_list_item_status_snapshots to authenticated;

grant all on public.daily_list_imports to service_role;
grant all on public.daily_list_items to service_role;
grant all on public.daily_list_item_events to service_role;
grant all on public.daily_list_item_status_snapshots to service_role;

drop policy if exists "daily_list_imports_owner_all" on public.daily_list_imports;
create policy "daily_list_imports_owner_all"
on public.daily_list_imports
as permissive
for all
to authenticated
using (public.core_command_is_owner())
with check (public.core_command_is_owner());

drop policy if exists "daily_list_items_owner_all" on public.daily_list_items;
create policy "daily_list_items_owner_all"
on public.daily_list_items
as permissive
for all
to authenticated
using (public.core_command_is_owner())
with check (public.core_command_is_owner());

drop policy if exists "daily_list_item_events_owner_all" on public.daily_list_item_events;
create policy "daily_list_item_events_owner_all"
on public.daily_list_item_events
as permissive
for all
to authenticated
using (public.core_command_is_owner())
with check (public.core_command_is_owner());

drop policy if exists "daily_list_item_status_snapshots_owner_all" on public.daily_list_item_status_snapshots;
create policy "daily_list_item_status_snapshots_owner_all"
on public.daily_list_item_status_snapshots
as permissive
for all
to authenticated
using (public.core_command_is_owner())
with check (public.core_command_is_owner());

commit;

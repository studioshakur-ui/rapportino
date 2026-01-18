// supabase/migrations/20260118_inca_alerts.ts
// NOTE: This file contains SQL as a TS string to respect the "TS only" rule.
// Copy/paste the SQL into a Supabase .sql migration if you prefer.

export const INCA_ALERTS_SQL = `
-- =========================
-- INCA Imports (event log)
-- =========================
create table if not exists public.inca_imports (
  id uuid primary key default gen_random_uuid(),
  inca_file_id uuid null,
  file_name text null,
  source text not null default 'EXCEL_INCA',
  checksum_sha256 text null,
  imported_at timestamptz not null default now(),
  created_by uuid null,
  note text null
);

create index if not exists inca_imports_inca_file_id_idx on public.inca_imports (inca_file_id);
create index if not exists inca_imports_imported_at_idx on public.inca_imports (imported_at);

-- ======================================
-- Extend inca_cavi for sync + observability
-- ======================================
alter table public.inca_cavi
  add column if not exists last_import_id uuid null,
  add column if not exists last_seen_in_import_at timestamptz null,
  add column if not exists flag_changed_in_source boolean not null default false,
  add column if not exists missing_in_latest_import boolean not null default false,
  add column if not exists rework_count int not null default 0,
  add column if not exists eliminated_count int not null default 0,
  add column if not exists reinstated_count int not null default 0,
  add column if not exists last_rework_at timestamptz null,
  add column if not exists last_eliminated_at timestamptz null,
  add column if not exists last_reinstated_at timestamptz null;

create index if not exists inca_cavi_last_import_id_idx on public.inca_cavi (last_import_id);
create index if not exists inca_cavi_missing_latest_idx on public.inca_cavi (missing_in_latest_import);

-- =========================
-- Snapshots per import
-- =========================
create table if not exists public.inca_cavi_snapshot (
  import_id uuid not null references public.inca_imports(id) on delete cascade,
  inca_file_id uuid null,
  codice text not null,
  situazione text null,  -- L/R/T/B/P/E
  metri_teo numeric null,
  metri_dis numeric null,
  flag_changed_in_source boolean not null default false,
  row_hash text null, -- optional
  created_at timestamptz not null default now(),
  primary key (import_id, codice)
);

create index if not exists inca_cavi_snapshot_import_id_idx on public.inca_cavi_snapshot (import_id);
create index if not exists inca_cavi_snapshot_file_codice_idx on public.inca_cavi_snapshot (inca_file_id, codice);

-- =========================
-- Change events (alerts)
-- =========================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'inca_change_severity') then
    create type public.inca_change_severity as enum ('INFO','WARN','BLOCK');
  end if;
  if not exists (select 1 from pg_type where typname = 'inca_change_type') then
    create type public.inca_change_type as enum (
      'NEW_CABLE',
      'SITUAZIONE_CHANGED',
      'METRI_DIS_CHANGED',
      'METRI_TEO_CHANGED',
      'FLAGGED_BY_SOURCE',
      'ELIMINATED',
      'REINSTATED_FROM_ELIMINATED',
      'REWORK_TO_LIBERO',
      'REWORK_TO_BLOCCATO',
      'FORBIDDEN_TRANSITION',
      'DISAPPEARED_ALLOWED',
      'DISAPPEARED_UNEXPECTED',
      'REAPPEARED'
    );
  end if;
end $$;

create table if not exists public.inca_change_events (
  id uuid primary key default gen_random_uuid(),
  from_import_id uuid null references public.inca_imports(id) on delete set null,
  to_import_id uuid not null references public.inca_imports(id) on delete cascade,
  inca_file_id uuid null,
  codice text not null,
  change_type public.inca_change_type not null,
  severity public.inca_change_severity not null,
  field text null, -- e.g. situazione, metri_dis, metri_teo
  old_value jsonb null,
  new_value jsonb null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists inca_change_events_to_import_id_idx on public.inca_change_events (to_import_id);
create index if not exists inca_change_events_codice_idx on public.inca_change_events (codice);
create index if not exists inca_change_events_severity_idx on public.inca_change_events (severity);

-- =========================
-- Import summary (optional)
-- =========================
create table if not exists public.inca_import_summaries (
  import_id uuid primary key references public.inca_imports(id) on delete cascade,
  inca_file_id uuid null,
  total_rows int not null default 0,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  disappeared_allowed_count int not null default 0,
  disappeared_unexpected_count int not null default 0,
  eliminated_count int not null default 0,
  reinstated_count int not null default 0,
  rework_count int not null default 0,
  flagged_count int not null default 0,
  metri_dis_changed_count int not null default 0,
  metri_teo_changed_count int not null default 0,
  info_count int not null default 0,
  warn_count int not null default 0,
  block_count int not null default 0,
  created_at timestamptz not null default now()
);

`;

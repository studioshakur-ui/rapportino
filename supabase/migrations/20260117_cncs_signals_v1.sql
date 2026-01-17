-- CNCS Signals V1 (rapportino-centric, audit-grade)
-- Stores deterministic validations and evidence references for a rapportino.
-- Safe with Core Drive file-centric policies.

begin;

create table if not exists public.cncs_signal_runs (
  id uuid primary key default gen_random_uuid(),
  rapportino_id uuid not null references public.rapportini(id) on delete cascade,
  scope text not null check (scope in ('CAPO_VALIDATION','UFFICIO_APPROVAL','MANUAL')),
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id),
  request_id uuid null,
  -- summary
  validated boolean not null default true,
  warn_count integer not null default 0,
  block_count integer not null default 0
);

create index if not exists cncs_signal_runs_rapportino_id_idx
  on public.cncs_signal_runs(rapportino_id);

create index if not exists cncs_signal_runs_created_at_idx
  on public.cncs_signal_runs(created_at desc);

create table if not exists public.cncs_signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.cncs_signal_runs(id) on delete cascade,
  rapportino_id uuid not null references public.rapportini(id) on delete cascade,
  scope text not null check (scope in ('CAPO_VALIDATION','UFFICIO_APPROVAL','MANUAL')),
  code text not null,
  severity text not null check (severity in ('INFO','WARN','BLOCK')),
  row_ids uuid[] null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cncs_signals_rapportino_id_idx
  on public.cncs_signals(rapportino_id);

create index if not exists cncs_signals_run_id_idx
  on public.cncs_signals(run_id);

create index if not exists cncs_signals_code_idx
  on public.cncs_signals(code);

alter table public.cncs_signal_runs enable row level security;
alter table public.cncs_signals enable row level security;

-- RLS strategy:
-- A user can see CNCS runs/signals only if they can see the underlying rapportino row.
-- We rely on existing RLS on public.rapportini as the authoritative access gate.

drop policy if exists cncs_signal_runs_select_via_rapportini on public.cncs_signal_runs;
create policy cncs_signal_runs_select_via_rapportini
on public.cncs_signal_runs
for select
to authenticated
using (
  exists (
    select 1 from public.rapportini r
    where r.id = cncs_signal_runs.rapportino_id
  )
);

drop policy if exists cncs_signals_select_via_rapportini on public.cncs_signals;
create policy cncs_signals_select_via_rapportini
on public.cncs_signals
for select
to authenticated
using (
  exists (
    select 1 from public.rapportini r
    where r.id = cncs_signals.rapportino_id
  )
);

-- No direct inserts/updates/deletes for authenticated.
-- Writes are server-side only (Edge Function using service role).

commit;

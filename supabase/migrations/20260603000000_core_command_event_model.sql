-- CORE COMMAND — event-driven model (single-user cockpit for Hamidou)
--
-- RÈGLE MÉTIER ABSOLUE :
--   Tout devient événement. Un message WhatsApp ne modifie JAMAIS INCA directement.
--   Il crée un événement pending/staged -> Hamidou valide -> CORE met à jour l'état.
--
-- INCA (inca_files / inca_cavi / inca_percorsi) reste en LECTURE SEULE pour ce modèle :
--   les events la REFERENCENT (par code dénormalisé), ils ne l'écrivent jamais.
--
-- NOTE DEV : RLS volontairement DESACTIVEE sur ces tables (cockpit mono-utilisateur,
--   phase de développement). A durcir en single-owner avant production.

begin;

-- ╭─ TABLE PIVOT : tout devient événement ──────────────────────────╮
create table if not exists public.core_events (
  id            uuid primary key default gen_random_uuid(),
  occurred_at   timestamptz not null default now(),
  source        text not null check (source in ('whatsapp','inca','agent','manual')),
  source_ref    uuid,
  event_type    text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'pending'
                  check (status in ('pending','staged','validated','rejected')),
  validated_at  timestamptz,
  validated_by  uuid,
  created_at    timestamptz not null default now()
);
create index if not exists core_events_status_idx   on public.core_events (status, occurred_at desc);
create index if not exists core_events_type_idx      on public.core_events (event_type, status);

-- ╭─ WHATSAPP INTAKE (staging) ─────────────────────────────────────╮
create table if not exists public.whatsapp_imports (
  id            uuid primary key default gen_random_uuid(),
  file_name     text not null,
  storage_path  text,
  imported_at   timestamptz not null default now(),
  message_count int not null default 0,
  status        text not null default 'parsed'
                  check (status in ('parsed','reviewed','archived'))
);

create table if not exists public.whatsapp_messages (
  id             uuid primary key default gen_random_uuid(),
  import_id      uuid not null references public.whatsapp_imports(id) on delete cascade,
  sent_at        timestamptz,
  author         text,
  raw_text       text not null,
  parsed_payload jsonb not null default '{}'::jsonb,
  core_event_id  uuid references public.core_events(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists whatsapp_messages_import_idx on public.whatsapp_messages (import_id, sent_at);

-- ╭─ CÂBLES : événements + priorités (réf souple vers inca_cavi) ───╮
create table if not exists public.cable_events (
  id            uuid primary key default gen_random_uuid(),
  inca_cavo_id  uuid,
  cavo_code     text,
  event_type    text not null check (event_type in ('posa','ripresa','blocco','anomalia')),
  meters        numeric,
  occurred_at   timestamptz not null default now(),
  operator_id   uuid,
  zone          text,
  core_event_id uuid references public.core_events(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists cable_events_code_idx on public.cable_events (cavo_code, occurred_at desc);
create index if not exists cable_events_type_idx on public.cable_events (event_type, occurred_at desc);

create table if not exists public.cable_priorities (
  id          uuid primary key default gen_random_uuid(),
  cavo_code   text not null,
  priority    int not null default 0,
  reason      text check (reason in ('blocco','ripresa','anomalia')),
  status      text not null default 'open' check (status in ('open','resolved')),
  opened_at   timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists cable_priorities_open_idx on public.cable_priorities (status, priority desc);

-- ╭─ KPI PRODUCTION (agrégat jour) ─────────────────────────────────╮
create table if not exists public.production_daily_kpis (
  day              date primary key,
  cables_posed     int not null default 0,
  meters_posed     numeric not null default 0,
  meters_target    numeric,
  active_operators int not null default 0,
  computed_at      timestamptz not null default now()
);

-- ╭─ AGENT CONSOLE : findings ──────────────────────────────────────╮
create table if not exists public.agent_findings (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null
                  check (agent in ('intake','normalizer','inca_matcher','production','auditor')),
  severity      text not null default 'info' check (severity in ('info','warn','error')),
  title         text not null,
  detail        jsonb not null default '{}'::jsonb,
  related_event uuid references public.core_events(id) on delete set null,
  status        text not null default 'open' check (status in ('open','acknowledged','resolved')),
  created_at    timestamptz not null default now()
);
create index if not exists agent_findings_idx on public.agent_findings (agent, status, created_at desc);

-- DEV : RLS désactivée (cockpit mono-utilisateur). A durcir en single-owner avant prod.
alter table public.core_events           disable row level security;
alter table public.whatsapp_imports      disable row level security;
alter table public.whatsapp_messages     disable row level security;
alter table public.cable_events          disable row level security;
alter table public.cable_priorities      disable row level security;
alter table public.production_daily_kpis disable row level security;
alter table public.agent_findings        disable row level security;

commit;

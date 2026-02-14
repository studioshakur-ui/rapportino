-- ============================================================
-- 20260124163000_catalogo_6368_rev04_seed_and_audit.sql
-- Source de vérité: "6368 STAMPA RAPPORTINO Rev04.xlsx"
-- ============================================================

-- ================
-- 1) Extend unit enum for MQ (square meters)
-- ================
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'activity_unit'
      and e.enumlabel = 'MQ'
  ) then
    alter type public.activity_unit add value 'MQ';
  end if;
end $$;

-- ================
-- 2) Enrich catalogo_attivita with KPI metadata
-- ================
alter table public.catalogo_attivita
  add column if not exists kpi_group text null,
  add column if not exists is_productive boolean not null default true;

create index if not exists catalogo_attivita_kpi_group_idx on public.catalogo_attivita (kpi_group);
create index if not exists catalogo_attivita_is_productive_idx on public.catalogo_attivita (is_productive);

-- ================
-- 3) Ensure created_by is always captured for scoped catalog rows
-- ================
create or replace function public.catalogo_set_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_catalogo_set_created_by on public.catalogo_ship_commessa_attivita;
create trigger trg_catalogo_set_created_by
before insert on public.catalogo_ship_commessa_attivita
for each row execute function public.catalogo_set_created_by();

-- ================
-- 4) Catalogo audit log (insert/update/delete)
-- ================
create table if not exists public.catalogo_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor uuid null,
  action text not null,
  table_name text not null,
  ship_id uuid null,
  commessa text null,
  activity_id uuid null,
  before_row jsonb null,
  after_row jsonb null
);

create index if not exists catalogo_events_at_idx on public.catalogo_events (at desc);
create index if not exists catalogo_events_ship_commessa_idx on public.catalogo_events (ship_id, commessa);
create index if not exists catalogo_events_activity_idx on public.catalogo_events (activity_id);

-- Grants (needed for authenticated to insert/select, then RLS will govern)
grant insert, select on public.catalogo_events to authenticated;

-- RLS hardening (so enabling RLS later does not break writes)
alter table public.catalogo_events enable row level security;

drop policy if exists "catalogo_events_insert_authenticated" on public.catalogo_events;
create policy "catalogo_events_insert_authenticated"
on public.catalogo_events
for insert
to authenticated
with check (true);

drop policy if exists "catalogo_events_select_admin" on public.catalogo_events;
create policy "catalogo_events_select_admin"
on public.catalogo_events
for select
to authenticated
using ((auth.jwt() ->> 'app_role') = 'ADMIN');

create or replace function public.catalogo_log_ship_commessa_attivita()
returns trigger
language plpgsql
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();

  if (tg_op = 'INSERT') then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'INSERT', 'catalogo_ship_commessa_attivita', new.ship_id, new.commessa, new.activity_id, null, to_jsonb(new));
    return new;

  elsif (tg_op = 'UPDATE') then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'UPDATE', 'catalogo_ship_commessa_attivita', new.ship_id, new.commessa, new.activity_id, to_jsonb(old), to_jsonb(new));
    return new;

  elsif (tg_op = 'DELETE') then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'DELETE', 'catalogo_ship_commessa_attivita', old.ship_id, old.commessa, old.activity_id, to_jsonb(old), null);
    return old;
  end if;

  return null;
end $$;

drop trigger if exists trg_catalogo_log_ship_commessa_attivita on public.catalogo_ship_commessa_attivita;
create trigger trg_catalogo_log_ship_commessa_attivita
after insert or update or delete on public.catalogo_ship_commessa_attivita
for each row execute function public.catalogo_log_ship_commessa_attivita();

-- ================
-- 5) Seed / upsert: Catalogo attivita (Commessa 6368 – STAMPA RAPPORTINO Rev04)
--    On conflict key = (categoria, descrizione, unit) [unique index exists in baseline]
-- ================
insert into public.catalogo_attivita (
  categoria,
  descrizione,
  activity_type,
  unit,
  previsto_value,
  is_active,
  kpi_group,
  is_productive
)
values
  -- =========================
  -- CARPENTERIA (Rev04)
  -- =========================
  ('CARPENTERIA', 'PREPARAZIONE STAFFE SOLETTE/STRADI CAVI MAGAZZINO', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 50, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'SALDATURA STAFFE STRADE CAVI', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 30, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'MONTAGGIO STRADE CAVI', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 7, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'SALDATURA TONDINI', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 35, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'SALDATURA BASAMENTI (APPARECCHIATURE)', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 7, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'TRACCIATURA KIEPE/COLLARI', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 14, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'FORATURA KIEPE/COLLARI', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 14, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'SALDATURA KIEPE/COLLARI', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 7, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'MOLATURA KIEPE', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 7, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'MOLATURA STAFFE,TONDINI,BASAMENTI', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 30, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'PUNTI DI CARPENTERIA', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 0, true, 'PRODUCTION', true),
  ('CARPENTERIA', 'VARIE CARPENTERIE', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 0.2, true, 'PRODUCTION', true),

  -- =========================
  -- IMBARCHI (Rev04)
  -- =========================
  ('IMBARCHI', 'VARI IMBARCHI (LOGISTICA E TRASPORTO, APPARATI DA 16 A 1850 KG))', 'QUANTITATIVE'::public.activity_type, 'COEFF'::public.activity_unit, 1, true, 'LOGISTICA', true),

  -- =========================
  -- MONTAGGIO (Rev04)
  -- =========================
  ('MONTAGGIO (IMBARCO A MANO)', 'MONTAGGIO APPARECCHIATURA DA 0 KG A 15 KG', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 14, true, 'PRODUCTION', true),
  ('MONTAGGIO', 'MONTAGGIO APPARECCHIATURA DA 16 KG A 50 KG', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 2, true, 'PRODUCTION', true),
  ('MONTAGGIO', 'MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 1, true, 'PRODUCTION', true),
  ('MONTAGGIO', 'MONTAGGIO APPARECCHIATURA DA 151 KG A 350 KG', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 0.25, true, 'PRODUCTION', true),
  ('MONTAGGIO', 'MONTAGGIO APPARECCHIATURA DA 351 KG A 1850 KG', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 0.125, true, 'PRODUCTION', true),
  ('MONTAGGIO', 'VARIE MONTAGGI APPARECCHIATURE', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 0.2, true, 'PRODUCTION', true),

  -- =========================
  -- STESURA (Rev04)  <-- Previsto corrigé selon Excel
  -- =========================
  ('STESURA', 'STESURA', 'QUANTITATIVE'::public.activity_type, 'MT'::public.activity_unit, 200, true, 'PRODUCTION', true),
  ('STESURA', 'FASCETTATURA CAVI', 'QUANTITATIVE'::public.activity_type, 'MT'::public.activity_unit, 950, true, 'PRODUCTION', true),
  ('STESURA', 'RIPRESA CAVI', 'QUANTITATIVE'::public.activity_type, 'MT'::public.activity_unit, 200, true, 'PRODUCTION', true),
  ('STESURA', 'VARI STESURA CAVI', 'QUANTITATIVE'::public.activity_type, 'MT'::public.activity_unit, 0.2, true, 'PRODUCTION', true),

  -- =========================
  -- COLLEGAMENTI E TEST (Rev04)
  -- =========================
  ('COLLEGAMENTI E TEST', 'SISTEMAZIONE,PREPARAZIONE E SGUAINATURA DEL CAVO (CON PIN CONNETTORI CIRCOLARI)', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, null, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'COLLEGAMENTO PIN CONNETTORI CIRCOLARI', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 70, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'COLLEGAMENTO PIN CONNETTORI DATA (30 PLUG)', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 240, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'COLLEGAMENTO PIN CONNETTORI COAX', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 14, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'PREPARAZIONE, SGUAINATURA E INCOLLATURA PIN DEL CAVO (CON PIN CONNETTORI FIBRA)', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, null, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'COLLEGAMENTO PIN CONNETTORI FIBRA', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 12, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'SISTEMAZIONE E PREPARAZIONE CAVO (FIBRA CASSETTI LC)', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, null, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'COLLEGAMENTO FIBRA CASSETTI LC', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 120, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'SISTEMAZIONE,PREPARAZIONE E SGUAINATURA DEL CAVO (PER COLLEGAMENTO  MORSETTIERA)', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, null, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'COLLEGAMENTO MORSETTIERA', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 90, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'BATTITURA PERIMETRI', 'FORFAIT'::public.activity_type, 'COEFF'::public.activity_unit, 0.2, true, 'PRODUCTION', true),
  ('COLLEGAMENTI E TEST', 'VARIE COLLEGAMENTI', 'FORFAIT'::public.activity_type, 'COEFF'::public.activity_unit, 0.2, true, 'PRODUCTION', true),

  -- =========================
  -- CONSEGNE (Rev04)
  -- =========================
  ('CONSEGNE', 'TARGHETTATURA CAVI', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 160, true, 'LOGISTICA', true),
  ('CONSEGNE', 'FASCETTATURA E MOIETTATURA (MISURATA IN MQ)', 'QUANTITATIVE'::public.activity_type, 'MQ'::public.activity_unit, 20, true, 'LOGISTICA', true),
  ('CONSEGNE', 'CHIUSURA KIEPE', 'QUANTITATIVE'::public.activity_type, 'PZ'::public.activity_unit, 3, true, 'LOGISTICA', true),

  -- =========================
  -- GESTIONE E VARIE (Rev04)
  -- =========================
  ('GESTIONE E VARIE', 'RESPONSABILE DI CANTIERE E VICE', 'FORFAIT'::public.activity_type, 'NONE'::public.activity_unit, 0.2, true, 'GESTIONE', false),
  ('GESTIONE E VARIE', 'CAPO SQUADRA ELETTRICISTI', 'FORFAIT'::public.activity_type, 'NONE'::public.activity_unit, 0.2, true, 'GESTIONE', false),
  ('GESTIONE E VARIE', 'CAPO SQUADRA CARPENTIERE', 'FORFAIT'::public.activity_type, 'NONE'::public.activity_unit, 0.2, true, 'GESTIONE', false),
  ('GESTIONE E VARIE', 'GESTIONE DATI E MAGAZZINO', 'FORFAIT'::public.activity_type, 'NONE'::public.activity_unit, 0.2, true, 'GESTIONE', false),
  ('GESTIONE E VARIE', 'EXTRA,DCM', 'FORFAIT'::public.activity_type, 'NONE'::public.activity_unit, 0.2, true, 'GESTIONE', false),
  ('GESTIONE E VARIE', 'FORMAZIONE', 'FORFAIT'::public.activity_type, 'NONE'::public.activity_unit, 0.2, true, 'GESTIONE', false),
  ('GESTIONE E VARIE', 'ASSENTI', 'QUALITATIVE'::public.activity_type, 'NONE'::public.activity_unit, 0.2, true, 'GESTIONE', false)

on conflict (categoria, descrizione, unit)
do update set
  activity_type = excluded.activity_type,
  previsto_value = excluded.previsto_value,
  is_active = excluded.is_active,
  kpi_group = excluded.kpi_group,
  is_productive = excluded.is_productive,
  updated_at = now();

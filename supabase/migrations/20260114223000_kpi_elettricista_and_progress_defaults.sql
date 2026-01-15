-- 20260114223000_kpi_elettricista_and_progress_defaults.sql

-- 1) rapportino_inca_cavi: default progress values (no NULL)

-- Normalize legacy rows so '-' (NULL) is never persisted.
update public.rapportino_inca_cavi
set progress_percent = 100
where progress_percent is null;

update public.rapportino_inca_cavi
set progress_side = 'DA'
where progress_side is null;

-- Enforce defaults for new rows.
alter table public.rapportino_inca_cavi
  alter column progress_percent set default 100,
  alter column progress_side set default 'DA';

-- Remove NULLs at DB level.
alter table public.rapportino_inca_cavi
  alter column progress_percent set not null,
  alter column progress_side set not null;


-- 2) catalogo_attivita: introduce is_kpi flag
alter table public.catalogo_attivita
  add column if not exists is_kpi boolean not null default false;

-- Default KPI mapping for electricians (can be refined later in Admin UI).
update public.catalogo_attivita
set is_kpi = true
where upper(trim(coalesce(categoria, ''))) = 'STESURA'
  and (
    upper(trim(coalesce(descrizione, ''))) = 'STESURA'
    or upper(trim(coalesce(descrizione, ''))) = 'RIPRESA CAVI'
    or upper(trim(coalesce(descrizione, ''))) like 'RIPRESA%'
  );


-- 3) KPI view: exclude informational lines (e.g. FASCETTATURA) for ELETTRICISTA
create or replace view public.kpi_operator_line_v1 as
with base as (
  select
    rap.id as rapportino_id,
    rap.report_date,
    rap.capo_id,
    rap.crew_role,
    rr.id as rapportino_row_id,
    rr.row_index,
    rr.categoria,
    rr.descrizione,
    rr.activity_id,
    rr.prodotto as row_prodotto,
    ro.operator_id,
    coalesce(nullif(trim(both from concat_ws(' ', o.cognome, o.nome)), ''), o.name, '—') as operator_name,
    ro.line_index,
    ro.tempo_raw,
    ro.tempo_hours
  from public.rapportini rap
  join public.rapportino_rows rr on rr.rapportino_id = rap.id
  join public.rapportino_row_operators ro on ro.rapportino_row_id = rr.id
  join public.operators o on o.id = ro.operator_id
),
row_totals as (
  select
    base.rapportino_row_id,
    sum(base.tempo_hours) filter (where base.tempo_hours is not null and base.tempo_hours > 0) as row_hours_valid
  from base
  group by base.rapportino_row_id
),
filtered as (
  select b.*
  from base b
  left join public.catalogo_attivita ca on ca.id = b.activity_id
  where
    (
      upper(trim(coalesce(b.crew_role, ''))) <> 'ELETTRICISTA'
      or (
        (
          (b.activity_id is not null and coalesce(ca.is_kpi, false) is true)
          or (
            b.activity_id is null
            and (
              upper(trim(coalesce(b.descrizione, ''))) = 'STESURA'
              or upper(trim(coalesce(b.descrizione, ''))) = 'RIPRESA CAVI'
              or upper(trim(coalesce(b.descrizione, ''))) like 'RIPRESA%'
            )
          )
        )
      )
    )
)
select
  f.rapportino_id,
  f.report_date,
  f.capo_id,
  f.rapportino_row_id,
  f.row_index,
  f.categoria,
  f.descrizione,
  f.row_prodotto,
  f.operator_id,
  f.operator_name,
  f.line_index,
  f.tempo_raw,
  f.tempo_hours,
  rt.row_hours_valid,
  case
    when f.row_prodotto is null then null::numeric
    when rt.row_hours_valid is null or rt.row_hours_valid <= 0 then null::numeric
    when f.tempo_hours is null or f.tempo_hours <= 0 then null::numeric
    else (f.row_prodotto * (f.tempo_hours / rt.row_hours_valid))
  end as prodotto_alloc
from filtered f
left join row_totals rt on rt.rapportino_row_id = f.rapportino_row_id;

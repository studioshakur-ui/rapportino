-- supabase/migrations/20260218223000_kpi_chantier_progress_inca_ref_v1.sql
--
-- KPI Chantier (Direzione)
--
-- Goals (CNCS-level invariants):
-- 1) INCA baseline for chantier is the "realistic" length: metri_ref = greatest(metri_teo, metri_dis)
-- 2) Produttività index uses Direzione facts v4 (APPROVED_UFFICIO only) with prorata per line (tempo_hours / sum_line_hours)
-- 3) UI reads views (no JS math rules), keeping sources unique and reproducible.

begin;

-- -----------------------------------------------------------------------------
-- 1) INCA Chantier: per-file aggregation with metri_ref = greatest(metri_teo, metri_dis)
-- -----------------------------------------------------------------------------

create or replace view public.direzione_inca_chantier_v1 as
with base as (
  select
    f.id as inca_file_id,
    f.file_name as nome_file,
    f.uploaded_at as caricato_il,
    f.costr,
    f.commessa,
    c.id as cavo_id,
    c.codice as codice_cavo,
    c.situazione,
    (nullif(trim(both from (c.metri_teo)::text), ''))::numeric as metri_teo_n,
    (nullif(trim(both from (c.metri_dis)::text), ''))::numeric as metri_dis_n,
    case
      when (nullif(trim(both from (c.metri_teo)::text), '') is null) and (nullif(trim(both from (c.metri_dis)::text), '') is null) then null::numeric
      else greatest(
        coalesce((nullif(trim(both from (c.metri_teo)::text), ''))::numeric, 0::numeric),
        coalesce((nullif(trim(both from (c.metri_dis)::text), ''))::numeric, 0::numeric)
      )
    end as metri_ref_n,
    case
      when (nullif(trim(both from (c.metri_teo)::text), '') is not null) and (nullif(trim(both from (c.metri_dis)::text), '') is not null) then 'BOTH'
      when (nullif(trim(both from (c.metri_teo)::text), '') is not null) and (nullif(trim(both from (c.metri_dis)::text), '') is null) then 'TEO'
      when (nullif(trim(both from (c.metri_teo)::text), '') is null) and (nullif(trim(both from (c.metri_dis)::text), '') is not null) then 'DIS'
      else 'NONE'
    end as ref_source
  from public.inca_files f
  join public.inca_cavi c on c.inca_file_id = f.id
), agg as (
  select
    inca_file_id,
    nome_file,
    caricato_il,
    costr,
    commessa,

    (coalesce(sum(metri_ref_n), 0::numeric))::numeric(14,2) as metri_ref_totali,
    (coalesce(sum(metri_teo_n), 0::numeric))::numeric(14,2) as metri_teo_totali,
    (coalesce(sum(metri_dis_n), 0::numeric))::numeric(14,2) as metri_dis_totali,

    (coalesce(sum(case when situazione = 'P' and metri_ref_n is not null then metri_ref_n else 0::numeric end), 0::numeric))::numeric(14,2) as metri_posati_ref,

    count(*)::int as cavi_totali,
    count(*) filter (where metri_teo_n is not null)::int as cavi_con_metri_teo,
    count(*) filter (where metri_dis_n is not null)::int as cavi_con_metri_dis,
    count(*) filter (where ref_source = 'BOTH')::int as cavi_ref_both,
    count(*) filter (where ref_source = 'TEO')::int as cavi_ref_teo_only,
    count(*) filter (where ref_source = 'DIS')::int as cavi_ref_dis_only,
    count(*) filter (where ref_source = 'NONE')::int as cavi_ref_none,

    case when count(*) = 0 then 0::numeric else round(100.0 * (count(*) filter (where ref_source = 'BOTH'))::numeric / count(*)::numeric, 2) end as pct_ref_both,
    case when count(*) = 0 then 0::numeric else round(100.0 * (count(*) filter (where ref_source = 'NONE'))::numeric / count(*)::numeric, 2) end as pct_ref_none
  from base
  group by inca_file_id, nome_file, caricato_il, costr, commessa
)
select * from agg;

comment on view public.direzione_inca_chantier_v1 is
  'Direzione (chantier): agrégation INCA par fichier avec metri_ref = greatest(metri_teo, metri_dis). Expose aussi metri_teo/metri_dis (audit) et stats de complétude.';

-- Aggregation totals (per COSTR/Commessa) — convenient for charts / joining.
create or replace view public.direzione_inca_chantier_totals_v1 as
select
  costr,
  commessa,
  (coalesce(sum(metri_ref_totali), 0::numeric))::numeric(14,2) as metri_ref_totali,
  (coalesce(sum(metri_teo_totali), 0::numeric))::numeric(14,2) as metri_teo_totali,
  (coalesce(sum(metri_dis_totali), 0::numeric))::numeric(14,2) as metri_dis_totali,
  (coalesce(sum(metri_posati_ref), 0::numeric))::numeric(14,2) as metri_posati_ref,
  (coalesce(sum(cavi_totali), 0))::int as cavi_totali,
  (coalesce(sum(cavi_ref_both), 0))::int as cavi_ref_both,
  (coalesce(sum(cavi_ref_teo_only), 0))::int as cavi_ref_teo_only,
  (coalesce(sum(cavi_ref_dis_only), 0))::int as cavi_ref_dis_only,
  (coalesce(sum(cavi_ref_none), 0))::int as cavi_ref_none
from public.direzione_inca_chantier_v1
group by costr, commessa;

comment on view public.direzione_inca_chantier_totals_v1 is
  'Direzione (chantier): totaux INCA par COSTR/Commessa basés sur metri_ref (greatest(teo,dis)).';

-- -----------------------------------------------------------------------------
-- 2) KPI Chantier: global daily index on previsto_alloc (facts v4) — MT only.
--    Canonical formula: indice = Σ(prodotto_alloc) / Σ(previsto_alloc)
-- -----------------------------------------------------------------------------

create or replace view public.kpi_chantier_global_day_v1 as
select
  f.report_date,
  f.costr,
  f.commessa,
  (coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.previsto_alloc else 0::numeric end), 0::numeric))::numeric(14,2) as total_previsto_alloc,
  (coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.prodotto_alloc else 0::numeric end), 0::numeric))::numeric(14,2) as total_prodotto_alloc,
  (coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.tempo_hours else 0::numeric end), 0::numeric))::numeric(14,2) as total_hours_indexed,
  case
    when (coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.previsto_alloc else 0::numeric end), 0::numeric)) > 0::numeric
      then round(
        (coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.prodotto_alloc else 0::numeric end), 0::numeric)
          /
         coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.previsto_alloc else 0::numeric end), 0::numeric)
        )::numeric,
        6
      )
    else null::numeric
  end as productivity_index,
  case
    when (coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.tempo_hours else 0::numeric end), 0::numeric)) > 0::numeric
      then round(
        (coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.prodotto_alloc else 0::numeric end), 0::numeric)
          /
         coalesce(sum(case when f.unit = 'MT'::public.activity_unit then f.tempo_hours else 0::numeric end), 0::numeric)
        )::numeric,
        6
      )
    else null::numeric
  end as prod_mh
from public.direzione_operator_facts_v4 f
group by f.report_date, f.costr, f.commessa;

comment on view public.kpi_chantier_global_day_v1 is
  'KPI Chantier (global/day): basé sur direzione_operator_facts_v4 (APPROVED_UFFICIO) et prorata ligne. MT only. Indice = Σreal_alloc / Σprevisto_alloc.';

-- -----------------------------------------------------------------------------
-- 3) KPI Chantier curve: join INCA baseline (metri_ref) with progress (MT only)
-- -----------------------------------------------------------------------------

create or replace view public.kpi_chantier_progress_day_v1 as
select
  k.report_date,
  k.costr,
  k.commessa,
  k.total_prodotto_alloc as metri_posati,
  k.total_hours_indexed as ore_uomo,
  k.prod_mh,
  k.total_previsto_alloc as previsto_alloc,
  k.productivity_index as efficienza_pct_ratio,
  coalesce(i.metri_ref_totali, 0::numeric)::numeric(14,2) as metri_inca_ref_totali,
  coalesce(i.metri_posati_ref, 0::numeric)::numeric(14,2) as metri_inca_posati_ref
from public.kpi_chantier_global_day_v1 k
left join public.direzione_inca_chantier_totals_v1 i
  on i.costr = k.costr and i.commessa is not distinct from k.commessa;

comment on view public.kpi_chantier_progress_day_v1 is
  'KPI Chantier (day): progress MT (rapportini approved) vs INCA baseline metri_ref (greatest teo/dis).';

-- Permissions: views are read-only for app roles.
revoke all on table public.direzione_inca_chantier_v1 from anon, authenticated;
revoke all on table public.direzione_inca_chantier_totals_v1 from anon, authenticated;
revoke all on table public.kpi_chantier_global_day_v1 from anon, authenticated;
revoke all on table public.kpi_chantier_progress_day_v1 from anon, authenticated;

grant select on table public.direzione_inca_chantier_v1 to authenticated, service_role;
grant select on table public.direzione_inca_chantier_totals_v1 to authenticated, service_role;
grant select on table public.kpi_chantier_global_day_v1 to authenticated, service_role;
grant select on table public.kpi_chantier_progress_day_v1 to authenticated, service_role;

commit;
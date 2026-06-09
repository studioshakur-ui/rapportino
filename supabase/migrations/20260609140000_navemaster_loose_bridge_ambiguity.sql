-- P0.2 Stage B4 — pont Navemaster en jointure LOOSE + gestion d'ambiguïté.
--
-- Les messages terrain (Telegram) n'écrivent jamais le préfixe alimento, alors
-- qu'INCA le garde. Le pont core_events doit donc matcher en clé LOOSE
-- (préfixe strippé) — MAIS si une clé loose recouvre plusieurs alimenti dans le
-- baseline (collision), le signal ne peut pas être attribué → pas de
-- réconciliation silencieuse (le cavo reste MISSING / à valider).
-- INCA read-only. Idempotent (create or replace).

create or replace function public.navemaster_compute_run_v2(
  p_ship_id uuid,
  p_inca_file_id uuid default null,
  p_approved_from date default null,
  p_approved_to date default null,
  p_freeze boolean default true
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inca_file_id uuid;
  v_costr text;
  v_commessa text;
  v_run_id uuid;
begin
  if not (public.navemaster_is_ufficio_or_admin() or public.core_command_is_owner()) then
    raise exception 'navemaster_compute_run_v2: not allowed';
  end if;

  if p_inca_file_id is null then
    select a.inca_file_id into v_inca_file_id
    from public.navemaster_active_inca_file_v1 a
    where a.ship_id = p_ship_id;
  else
    v_inca_file_id := p_inca_file_id;
  end if;

  if v_inca_file_id is null then
    raise exception 'navemaster_compute_run_v2: no INCA file found for ship_id=%', p_ship_id;
  end if;

  select f.costr, f.commessa into v_costr, v_commessa
  from public.inca_files f
  where f.id = v_inca_file_id;

  if v_costr is null or v_commessa is null then
    select s.costr, s.commessa into v_costr, v_commessa
    from public.ships s
    where s.id = p_ship_id;
  end if;

  if v_costr is null or v_commessa is null then
    raise exception 'navemaster_compute_run_v2: cannot resolve costr/commessa for ship_id=% inca_file_id=%', p_ship_id, v_inca_file_id;
  end if;

  insert into public.navemaster_runs (ship_id, costr, commessa, inca_file_id, approved_from, approved_to, created_by, frozen_at)
  values (
    p_ship_id, v_costr, v_commessa, v_inca_file_id,
    p_approved_from, p_approved_to, auth.uid(),
    case when p_freeze then now() else null end
  )
  returning id into v_run_id;

  -- Preuve terrain cockpit (loose : Telegram sans préfixe)
  drop table if exists tmp_core_proofs;
  create temp table tmp_core_proofs as
  select
    upper(replace(replace(ce.cable_code_normalized, ' ', ''), '*', '')) as codice_key,
    max(ce.occurred_at) as core_last_proof_at
  from public.core_events ce
  where ce.cable_code_normalized is not null
    and ce.cable_code_normalized <> ''
    and (
      ce.event_type = 'CABLE_POSATO'
      or (
        ce.event_type = 'FIELD_VERIFIED'
        and coalesce(ce.payload->>'verification_status', '') in
            ('', 'AT_DESTINATION', 'AT_DEPARTURE', 'CONNECTED_BOTH')
      )
    )
    and (p_approved_from is null or ce.occurred_at::date >= p_approved_from)
    and (p_approved_to   is null or ce.occurred_at::date <= p_approved_to)
  group by 1;
  create index on tmp_core_proofs (codice_key);

  -- Clés loose ambiguës dans le baseline (collision d'alimenti) : un signal
  -- terrain sans préfixe ne leur est jamais attribué.
  drop table if exists tmp_loose_amb;
  create temp table tmp_loose_amb as
  select regexp_replace(upper(replace(replace(trim(c.codice), ' ', ''), '*', '')), '^[0-9]+[-/][0-9]+', '') as loose_key
  from public.inca_cavi c
  where c.inca_file_id = v_inca_file_id
  group by 1
  having count(distinct upper(replace(replace(trim(c.codice), ' ', ''), '*', ''))) > 1;
  create index on tmp_loose_amb (loose_key);

  with baseline as (
    select distinct on (replace(replace(trim(c.codice), ' ', ''), '*', ''))
      c.*
    from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
    order by replace(replace(trim(c.codice), ' ', ''), '*', ''), c.id
  ),
  latest_evt as (
    select distinct on (e.codice_norm)
      e.codice_norm, e.event_type, e.blocco_locale_id, e.event_at,
      (b.unblocked_at is null) as blocco_active
    from public.navemaster_events e
    left join public.blocchi_locali b on b.id = e.blocco_locale_id
    where e.ship_id = p_ship_id and e.commessa = v_commessa
    order by e.codice_norm, e.event_at desc, e.created_at desc
  ),
  proofs as (
    select
      c.codice as codice,
      replace(replace(trim(c.codice), ' ', ''), '*', '') as codice_norm,
      sum(coalesce(ric.metri_posati,0))::numeric as metri_posati_ref,
      max(r.approved_by_ufficio_at) as last_proof_at,
      (max(r.id::text) filter (where r.approved_by_ufficio_at is not null))::uuid as last_rapportino_id
    from public.inca_cavi c
    join public.rapportino_inca_cavi ric on ric.inca_cavo_id = c.id
    join public.rapportini r on r.id = ric.rapportino_id
    where c.inca_file_id = v_inca_file_id
      and r.status = 'APPROVED_UFFICIO'
      and (p_approved_from is null or r.report_date >= p_approved_from)
      and (p_approved_to is null or r.report_date <= p_approved_to)
    group by c.codice
  )
  insert into public.navemaster_state_rows (
    run_id, ship_id, inca_file_id,
    codice, stato_nav,
    metri_teo, metri_dis, metri_totali, metri_ref,
    metri_posati_ref, delta_metri,
    descrizione, impianto, tipo, sezione, livello,
    zona_da, zona_a, apparato_da, apparato_a, descrizione_da, descrizione_a, wbs,
    last_proof_at, last_rapportino_id,
    coverage
  )
  select
    v_run_id, p_ship_id, v_inca_file_id,
    c.codice,
    coalesce(
      case
        when le.event_type = 'E'::public.navemaster_event_type then 'E'::public.nav_status
        when le.event_type = 'B'::public.navemaster_event_type then 'B'::public.nav_status
        when (pr.metri_posati_ref is not null and pr.metri_posati_ref > 0)
             or cp.codice_key is not null then 'P'::public.nav_status
        when le.event_type = 'R'::public.navemaster_event_type then 'R'::public.nav_status
        when le.event_type = 'L'::public.navemaster_event_type then 'L'::public.nav_status
        else null
      end,
      public.nav_status_from_text(c.situazione)
    ) as stato_nav,
    c.metri_teo, c.metri_dis, c.metri_totali,
    case
      when le.event_type = 'E'::public.navemaster_event_type then 0
      else coalesce(nullif(c.metri_totali, 0), greatest(coalesce(c.metri_teo,0), coalesce(c.metri_dis,0)), 0)
    end as metri_ref,
    coalesce(pr.metri_posati_ref, 0) as metri_posati_ref,
    (case
      when le.event_type = 'E'::public.navemaster_event_type then 0
      else coalesce(nullif(c.metri_totali, 0), greatest(coalesce(c.metri_teo,0), coalesce(c.metri_dis,0)), 0)
    end - coalesce(pr.metri_posati_ref, 0)) as delta_metri,
    c.descrizione, c.impianto, c.tipo, c.sezione, c.livello,
    c.zona_da, c.zona_a, c.apparato_da, c.apparato_a, c.descrizione_da, c.descrizione_a, c.wbs,
    greatest(pr.last_proof_at, cp.core_last_proof_at) as last_proof_at,
    pr.last_rapportino_id,
    case
      when pr.metri_posati_ref is not null or cp.codice_key is not null then 'BOTH'::public.navemaster_coverage
      else 'INCA_ONLY'::public.navemaster_coverage
    end as coverage
  from baseline c
  left join proofs pr on pr.codice_norm = replace(replace(trim(c.codice), ' ', ''), '*', '')
  left join latest_evt le on le.codice_norm = replace(replace(trim(c.codice), ' ', ''), '*', '')
  left join tmp_core_proofs cp
    on cp.codice_key = regexp_replace(upper(replace(replace(trim(c.codice), ' ', ''), '*', '')), '^[0-9]+[-/][0-9]+', '')
   and regexp_replace(upper(replace(replace(trim(c.codice), ' ', ''), '*', '')), '^[0-9]+[-/][0-9]+', '')
       not in (select loose_key from tmp_loose_amb);

  insert into public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  select
    v_run_id, p_ship_id, v_costr, v_commessa, s.codice, s.codice_norm,
    'MISSING_IN_CORE'::public.navemaster_alert_type, 'MAJOR'::public.nav_severity,
    jsonb_build_object('reason','no_approved_proof','metri_ref', s.metri_ref, 'stato_nav', s.stato_nav)
  from public.navemaster_state_rows s
  where s.run_id = v_run_id
    and s.coverage = 'INCA_ONLY'::public.navemaster_coverage
    and s.stato_nav <> 'E'::public.nav_status;

  with baseline_codes as (
    select distinct replace(replace(trim(c.codice), ' ', ''), '*', '') as codice_norm
    from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
  ),
  proofs_all as (
    select
      c.codice as codice,
      replace(replace(trim(c.codice), ' ', ''), '*', '') as codice_norm,
      c.inca_file_id as inca_file_id,
      sum(coalesce(ric.metri_posati,0))::numeric as metri_posati_ref,
      max(r.approved_by_ufficio_at) as last_proof_at
    from public.inca_cavi c
    join public.rapportino_inca_cavi ric on ric.inca_cavo_id = c.id
    join public.rapportini r on r.id = ric.rapportino_id
    where r.status = 'APPROVED_UFFICIO'
      and (p_approved_from is null or r.report_date >= p_approved_from)
      and (p_approved_to is null or r.report_date <= p_approved_to)
      and (v_costr is null or lower(btrim(r.costr::text)) = lower(btrim(v_costr)))
      and (v_commessa is null or lower(btrim(r.commessa::text)) = lower(btrim(v_commessa)))
    group by c.codice, c.inca_file_id
  )
  insert into public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  select
    v_run_id, p_ship_id, v_costr, v_commessa, p.codice, p.codice_norm,
    'EXTRA_IN_CORE'::public.navemaster_alert_type, 'MAJOR'::public.nav_severity,
    jsonb_build_object('reason','proof_without_baseline','metri_posati_ref', p.metri_posati_ref, 'last_proof_at', p.last_proof_at, 'inca_file_id', p.inca_file_id)
  from proofs_all p
  where not exists (select 1 from baseline_codes b where b.codice_norm = p.codice_norm);

  -- EXTRA cockpit (loose) hors baseline
  insert into public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  select
    v_run_id, p_ship_id, v_costr, v_commessa, null, cp.codice_key,
    'EXTRA_IN_CORE'::public.navemaster_alert_type, 'MAJOR'::public.nav_severity,
    jsonb_build_object('reason','proof_without_baseline','source','core_events','last_proof_at', cp.core_last_proof_at)
  from tmp_core_proofs cp
  where not exists (
    select 1 from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
      and regexp_replace(upper(replace(replace(trim(c.codice), ' ', ''), '*', '')), '^[0-9]+[-/][0-9]+', '') = cp.codice_key
  );

  with dup as (
    select
      replace(replace(trim(c.codice), ' ', ''), '*', '') as codice_norm,
      count(*) as cnt,
      jsonb_agg(c.codice order by c.codice) as codici
    from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
    group by replace(replace(trim(c.codice), ' ', ''), '*', '')
    having count(*) > 1
  )
  insert into public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  select
    v_run_id, p_ship_id, v_costr, v_commessa, null, d.codice_norm,
    'DUPLICATE_IN_INCA'::public.navemaster_alert_type, 'MAJOR'::public.nav_severity,
    jsonb_build_object('reason','duplicate_codice_norm','count', d.cnt, 'codici', d.codici)
  from dup d;

  with latest_evt as (
    select distinct on (e.codice_norm)
      e.codice_norm, e.event_type, e.blocco_locale_id, e.event_at,
      (b.unblocked_at is null) as blocco_active, b.unblocked_at
    from public.navemaster_events e
    left join public.blocchi_locali b on b.id = e.blocco_locale_id
    where e.ship_id = p_ship_id and e.commessa = v_commessa
    order by e.codice_norm, e.event_at desc, e.created_at desc
  )
  insert into public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  select
    v_run_id, p_ship_id, v_costr, v_commessa, s.codice, s.codice_norm,
    'STATUS_CONFLICT'::public.navemaster_alert_type, 'MAJOR'::public.nav_severity,
    jsonb_build_object(
      'reason',
        case
          when s.stato_nav = 'E'::public.nav_status then 'E_with_proof'
          when s.stato_nav in ('R'::public.nav_status, 'L'::public.nav_status) then 'R_or_L_with_proof'
          when le.event_type = 'B'::public.navemaster_event_type and coalesce(le.blocco_active,false) = false then 'B_inactive_blocco'
          else 'unknown'
        end,
      'metri_posati_ref', s.metri_posati_ref, 'metri_ref', s.metri_ref,
      'coverage', s.coverage, 'last_proof_at', s.last_proof_at,
      'blocco_locale_id', le.blocco_locale_id, 'blocco_active', le.blocco_active,
      'unblocked_at', le.unblocked_at, 'event_at', le.event_at
    )
  from public.navemaster_state_rows s
  left join latest_evt le on le.codice_norm = s.codice_norm
  where s.run_id = v_run_id
    and (
      (s.stato_nav = 'E'::public.nav_status and (s.metri_posati_ref > 0 or s.coverage = 'BOTH'::public.navemaster_coverage))
      or (s.stato_nav in ('R'::public.nav_status, 'L'::public.nav_status) and (s.metri_posati_ref > 0 or s.coverage = 'BOTH'::public.navemaster_coverage))
      or (le.event_type = 'B'::public.navemaster_event_type and coalesce(le.blocco_active,false) = false)
    );

  insert into public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  select
    v_run_id, p_ship_id, v_costr, v_commessa, s.codice, s.codice_norm,
    'METRI_MISMATCH'::public.navemaster_alert_type, 'MAJOR'::public.nav_severity,
    jsonb_build_object(
      'reason',
        case
          when s.metri_posati_ref > s.metri_ref then 'posati_gt_ref'
          when s.metri_posati_ref < 0 or s.metri_ref < 0 then 'negative_value'
          when s.metri_ref is null or s.metri_ref = 0 then 'ref_missing_or_zero'
          else 'unknown'
        end,
      'metri_ref', s.metri_ref, 'metri_posati_ref', s.metri_posati_ref, 'stato_nav', s.stato_nav
    )
  from public.navemaster_state_rows s
  where s.run_id = v_run_id
    and s.stato_nav <> 'E'::public.nav_status
    and (
      (s.metri_posati_ref > s.metri_ref)
      or (s.metri_posati_ref < 0)
      or (s.metri_ref < 0)
      or (s.metri_ref is null or s.metri_ref = 0)
    );

  with latest_evt as (
    select distinct on (e.codice_norm)
      e.codice_norm, e.event_type, e.blocco_locale_id,
      (b.unblocked_at is null) as blocco_active
    from public.navemaster_events e
    left join public.blocchi_locali b on b.id = e.blocco_locale_id
    where e.ship_id = p_ship_id and e.commessa = v_commessa
    order by e.codice_norm, e.event_at desc, e.created_at desc
  )
  insert into public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  select
    v_run_id, p_ship_id, v_costr, v_commessa, s.codice, s.codice_norm,
    'BLOCKED_IMPACT'::public.navemaster_alert_type, 'CRITICAL'::public.nav_severity,
    jsonb_build_object('reason','status_B_active_blocco','metri_ref', s.metri_ref, 'delta_metri', s.delta_metri, 'blocco_locale_id', le.blocco_locale_id)
  from public.navemaster_state_rows s
  join latest_evt le on le.codice_norm = s.codice_norm
  where s.run_id = v_run_id
    and s.stato_nav = 'B'::public.nav_status
    and le.event_type = 'B'::public.navemaster_event_type
    and le.blocco_active = true;

  update public.navemaster_runs r
  set verdict = (
      case
        when exists (select 1 from public.navemaster_alerts a where a.run_id = v_run_id and a.severity = 'CRITICAL') then 'BLOCK'::public.navemaster_run_verdict
        when exists (select 1 from public.navemaster_alerts a where a.run_id = v_run_id and a.severity = 'MAJOR') then 'WARN'::public.navemaster_run_verdict
        else 'OK'::public.navemaster_run_verdict
      end
    ),
    drivers = (
      select jsonb_build_object(
        'alerts', jsonb_build_object(
          'critical', (select count(*) from public.navemaster_alerts a where a.run_id = v_run_id and a.severity='CRITICAL'),
          'major',    (select count(*) from public.navemaster_alerts a where a.run_id = v_run_id and a.severity='MAJOR'),
          'info',     (select count(*) from public.navemaster_alerts a where a.run_id = v_run_id and a.severity='INFO')
        ),
        'coverage', jsonb_build_object(
          'inca_only', (select count(*) from public.navemaster_state_rows s where s.run_id=v_run_id and s.coverage='INCA_ONLY'),
          'both',      (select count(*) from public.navemaster_state_rows s where s.run_id=v_run_id and s.coverage='BOTH')
        )
      )
    )
  where r.id = v_run_id;

  drop table if exists tmp_core_proofs;
  drop table if exists tmp_loose_amb;
  return v_run_id;
end;
$$;

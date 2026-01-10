set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.capo_returned_summary(p_role text)
 RETURNS TABLE(returned_count bigint, last_id uuid, last_report_date date, last_costr text, last_commessa text, last_updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
with base as (
  select id, report_date, costr, commessa, updated_at
  from rapportini
  where capo_id = auth.uid()
    and crew_role = p_role
    and status = 'RETURNED'
),
last_one as (
  select id, report_date, costr, commessa, updated_at
  from base
  order by updated_at desc
  limit 1
)
select
  (select count(*) from base) as returned_count,
  l.id as last_id,
  l.report_date as last_report_date,
  l.costr as last_costr,
  l.commessa as last_commessa,
  l.updated_at as last_updated_at
from last_one l

union all

-- Cas où il n'y a aucun RETURNED : on renvoie quand même 1 ligne avec count=0
select
  (select count(*) from base) as returned_count,
  null::uuid,
  null::date,
  null::text,
  null::text,
  null::timestamptz
where not exists (select 1 from last_one);
$function$
;

CREATE OR REPLACE FUNCTION public.core_drive_emit_upload_event(p_file_id uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.core_drive_assert_role(array['CAPO','UFFICIO','MANAGER','DIREZIONE','ADMIN']);

  -- Respect naval-grade: si déjà gelé => aucune mutation de registre (sauf lecture)
  if exists (
    select 1 from public.core_files f
    where f.id = p_file_id and f.frozen_at is not null
  ) then
    raise exception 'File is frozen';
  end if;

  return public.core_drive_append_event(p_file_id, 'UPLOAD', coalesce(p_payload, '{}'::jsonb), null, null);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.core_drive_soft_delete_file(p_file_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_now timestamptz := now();
  v_event_id uuid;
begin
  perform public.core_drive_assert_role(array['UFFICIO','DIREZIONE','ADMIN']);

  -- Freeze inviolable: si frozen_at déjà set => aucune mutation
  if exists (
    select 1 from public.core_files f
    where f.id = p_file_id and f.frozen_at is not null
  ) then
    raise exception 'File is frozen';
  end if;

  update public.core_files
  set deleted_at = coalesce(deleted_at, v_now)
  where id = p_file_id;

  if not found then
    raise exception 'File not found';
  end if;

  v_event_id := public.core_drive_append_event(
    p_file_id,
    'SOFT_DELETE',
    jsonb_build_object('reason', p_reason, 'at', v_now),
    null,
    null
  );

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_consolidate_inca_on_rapportino_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- uniquement sur changement effectif vers APPROVED_UFFICIO
  if (tg_op = 'UPDATE')
     and (new.status = 'APPROVED_UFFICIO')
     and (coalesce(old.status, '') is distinct from 'APPROVED_UFFICIO') then

    -- RIPRESA -> 100% + P
    update public.inca_cavi ic
    set
      progress_percent = 100,
      situazione = 'P',
      updated_at = now()
    from public.rapportino_inca_cavi ric
    where ric.rapportino_id = new.id
      and ric.inca_cavo_id = ic.id
      and ric.step_type = 'RIPRESA';

    -- POSA -> si progress_percent présent (>=50), copier + P
    update public.inca_cavi ic
    set
      progress_percent = ric.progress_percent::int,
      situazione = 'P',
      updated_at = now()
    from public.rapportino_inca_cavi ric
    where ric.rapportino_id = new.id
      and ric.inca_cavo_id = ic.id
      and ric.step_type = 'POSA'
      and ric.progress_percent is not null
      and ric.progress_percent::numeric >= 50;

    -- POSA sans progress_percent -> P (si tu veux éviter ça, commente ce bloc)
    update public.inca_cavi ic
    set
      situazione = 'P',
      updated_at = now()
    from public.rapportino_inca_cavi ric
    where ric.rapportino_id = new.id
      and ric.inca_cavo_id = ic.id
      and ric.step_type = 'POSA'
      and ric.progress_percent is null;

  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_rapportino_apply_product(p_rapportino_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer := 0;
begin
  -- 2A) Normaliser progress_side si progress_percent existe mais side est NULL
  update public.inca_cavi ic
     set progress_side = 'DA'
   where ic.id in (
          select ric.inca_cavo_id
            from public.rapportino_inca_cavi ric
           where ric.rapportino_id = p_rapportino_id
        )
     and ic.progress_percent is not null
     and ic.progress_side is null;

  get diagnostics v_count = row_count;

  -- 2B) Garantir la règle "P dès 50%" côté DB (même si le front oublie)
  update public.inca_cavi ic
     set situazione = 'P'
   where ic.id in (
          select ric.inca_cavo_id
            from public.rapportino_inca_cavi ric
           where ric.rapportino_id = p_rapportino_id
        )
     and ic.progress_percent is not null
     and ic.progress_percent >= 50
     and (ic.situazione is distinct from 'P');

  -- Optionnel: tu peux logger plus tard dans une table d’audit si besoin.
end;
$function$
;

create or replace view "public"."kpi_operator_line_previsto_v2" as  SELECT f.report_date,
    f.operator_id,
    COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, upper(o.cognome), initcap(o.nome))), ''::text), NULLIF(TRIM(BOTH FROM o.name), ''::text), '—'::text) AS operator_name,
    f.manager_id,
    f.capo_id,
    f.ship_id,
    f.ship_code,
    f.ship_name,
    NULLIF(TRIM(BOTH FROM f.costr), ''::text) AS costr,
    NULLIF(TRIM(BOTH FROM f.commessa), ''::text) AS commessa,
    f.rapportino_id,
    f.rapportino_row_id,
    f.row_index,
    NULLIF(TRIM(BOTH FROM f.categoria), ''::text) AS categoria,
    NULLIF(TRIM(BOTH FROM f.descrizione), ''::text) AS descrizione,
    f.activity_type,
    f.unit,
    f.tempo_hours,
    f.sum_line_hours,
    f.prodotto_row,
    f.prodotto_alloc,
    rr.previsto,
        CASE
            WHEN ((rr.previsto IS NULL) OR (rr.previsto <= (0)::numeric)) THEN NULL::numeric
            WHEN ((f.tempo_hours IS NULL) OR (f.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.previsto * (f.tempo_hours / (8)::numeric))
        END AS previsto_eff,
        CASE
            WHEN ((rr.previsto IS NULL) OR (rr.previsto <= (0)::numeric)) THEN NULL::numeric
            WHEN ((f.tempo_hours IS NULL) OR (f.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((rr.previsto * (f.tempo_hours / (8)::numeric)) <= (0)::numeric) THEN NULL::numeric
            WHEN (f.prodotto_alloc IS NULL) THEN NULL::numeric
            ELSE (f.prodotto_alloc / (rr.previsto * (f.tempo_hours / (8)::numeric)))
        END AS indice_line
   FROM ((public.direzione_operator_facts_v1 f
     JOIN public.operators o ON ((o.id = f.operator_id)))
     LEFT JOIN public.rapportino_rows rr ON ((rr.id = f.rapportino_row_id)))
  WHERE ((f.activity_type = 'QUANTITATIVE'::public.activity_type) AND (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit])) AND (rr.previsto IS NOT NULL) AND (rr.previsto > (0)::numeric) AND (f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric) AND (f.prodotto_alloc IS NOT NULL));


create or replace view "public"."kpi_operator_line_v1" as  WITH base AS (
         SELECT rap.id AS rapportino_id,
            rap.report_date,
            rap.capo_id,
            rr.id AS rapportino_row_id,
            rr.row_index,
            rr.categoria,
            rr.descrizione,
            rr.prodotto AS row_prodotto,
            ro.operator_id,
            COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, o.cognome, o.nome)), ''::text), o.name, '—'::text) AS operator_name,
            ro.line_index,
            ro.tempo_raw,
            ro.tempo_hours
           FROM (((public.rapportini rap
             JOIN public.rapportino_rows rr ON ((rr.rapportino_id = rap.id)))
             JOIN public.rapportino_row_operators ro ON ((ro.rapportino_row_id = rr.id)))
             JOIN public.operators o ON ((o.id = ro.operator_id)))
        ), row_totals AS (
         SELECT base.rapportino_row_id,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS row_hours_valid
           FROM base
          GROUP BY base.rapportino_row_id
        )
 SELECT b.rapportino_id,
    b.report_date,
    b.capo_id,
    b.rapportino_row_id,
    b.row_index,
    b.categoria,
    b.descrizione,
    b.row_prodotto,
    b.operator_id,
    b.operator_name,
    b.line_index,
    b.tempo_raw,
    b.tempo_hours,
    rt.row_hours_valid,
        CASE
            WHEN (b.row_prodotto IS NULL) THEN NULL::numeric
            WHEN ((rt.row_hours_valid IS NULL) OR (rt.row_hours_valid <= (0)::numeric)) THEN NULL::numeric
            WHEN ((b.tempo_hours IS NULL) OR (b.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (b.row_prodotto * (b.tempo_hours / rt.row_hours_valid))
        END AS prodotto_alloc
   FROM (base b
     LEFT JOIN row_totals rt ON ((rt.rapportino_row_id = b.rapportino_row_id)));


CREATE OR REPLACE FUNCTION public.manager_my_capi()
 RETURNS TABLE(capo_id uuid, display_name text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  with me as (
    select p.id, p.app_role
    from public.profiles p
    where p.id = auth.uid()
    limit 1
  )
  select
    mca.capo_id,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), ''), nullif(trim(p.email), ''), '—') as display_name,
    p.email
  from public.manager_capo_assignments mca
  join public.profiles p on p.id = mca.capo_id
  join me on me.id = mca.manager_id
  where mca.manager_id = auth.uid()
    and mca.active is true
    and (
      -- autorise MANAGER (usage normal) + ADMIN (debug/support)
      me.app_role in ('MANAGER','ADMIN')
    )
  order by mca.created_at asc;
$function$
;

CREATE OR REPLACE FUNCTION public.manager_my_capi_v1()
 RETURNS TABLE(capo_id uuid, display_name text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    a.capo_id,
    coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), p.email, '—') as display_name,
    p.email
  from public.manager_capo_assignments a
  join public.profiles p
    on p.id = a.capo_id
  where a.manager_id = auth.uid()
    and a.active = true
    and p.app_role = 'CAPO'
  order by a.created_at asc;
$function$
;

create or replace view "public"."operator_facts_v1" as  WITH rc AS (
         SELECT rapportini_canon_v1.id,
            rapportini_canon_v1.report_date,
            rapportini_canon_v1.capo_id,
            rapportini_canon_v1.user_id,
            rapportini_canon_v1.status,
            rapportini_canon_v1.costr,
            rapportini_canon_v1.commessa,
            rapportini_canon_v1.prodotto_totale,
            rapportini_canon_v1.created_at,
            rapportini_canon_v1.updated_at
           FROM public.rapportini_canon_v1
          WHERE (rapportini_canon_v1.report_date IS NOT NULL)
        ), rr AS (
         SELECT rrr.id AS row_id,
            rrr.rapportino_id,
            rrr.row_index,
            rrr.prodotto
           FROM public.rapportino_rows rrr
        ), rro AS (
         SELECT ro.id AS token_id,
            ro.rapportino_row_id AS row_id,
            ro.operator_id,
            ro.tempo_hours,
            ro.tempo_raw
           FROM public.rapportino_row_operators ro
          WHERE (ro.operator_id IS NOT NULL)
        ), row_hours AS (
         SELECT rro_1.row_id,
            sum(rro_1.tempo_hours) FILTER (WHERE ((rro_1.tempo_hours IS NOT NULL) AND (rro_1.tempo_hours > (0)::numeric))) AS sum_row_hours
           FROM rro rro_1
          GROUP BY rro_1.row_id
        ), ops AS (
         SELECT o.id AS operator_id,
            COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, o.cognome, o.nome)), ''::text), NULLIF(TRIM(BOTH FROM o.name), ''::text), '—'::text) AS operator_display_name,
            o.operator_code,
            o.operator_key,
            o.cognome,
            o.nome
           FROM public.operators o
        )
 SELECT rc.report_date,
    rc.id AS rapportino_id,
    rc.status,
    rc.costr,
    rc.commessa,
    rc.capo_id,
    rr.row_id,
    rr.row_index,
    rr.prodotto AS prodotto_row,
    rro.token_id,
    rro.operator_id,
    ops.operator_display_name,
    ops.cognome,
    ops.nome,
    ops.operator_code,
    ops.operator_key,
    rro.tempo_hours,
    NULLIF(TRIM(BOTH FROM rro.tempo_raw), ''::text) AS tempo_raw,
    rh.sum_row_hours,
        CASE
            WHEN (rr.prodotto IS NULL) THEN NULL::numeric
            WHEN ((rh.sum_row_hours IS NULL) OR (rh.sum_row_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((rro.tempo_hours IS NULL) OR (rro.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.prodotto * (rro.tempo_hours / rh.sum_row_hours))
        END AS prodotto_alloc
   FROM ((((rro
     JOIN rr ON ((rr.row_id = rro.row_id)))
     JOIN rc ON ((rc.id = rr.rapportino_id)))
     LEFT JOIN row_hours rh ON ((rh.row_id = rro.row_id)))
     LEFT JOIN ops ON ((ops.operator_id = rro.operator_id)));


create or replace view "public"."operators_admin_list_v1" as  SELECT id,
    name AS legacy_name,
    COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, cognome, nome)), ''::text), NULLIF(TRIM(BOTH FROM name), ''::text), '—'::text) AS display_name,
    roles,
    cognome,
    nome,
    birth_date,
    operator_code,
    operator_key,
    created_by,
    created_at,
    updated_at,
    ((cognome IS NULL) OR (TRIM(BOTH FROM cognome) = ''::text) OR (nome IS NULL) OR (TRIM(BOTH FROM nome) = ''::text) OR (birth_date IS NULL)) AS is_identity_incomplete
   FROM public.operators o;


create or replace view "public"."operators_display_v1" as  SELECT id,
    name AS legacy_name,
    roles,
    cognome,
    nome,
    birth_date,
    operator_code,
    COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, cognome, nome)), ''::text), NULLIF(TRIM(BOTH FROM name), ''::text), '—'::text) AS display_name,
    created_by,
    created_at,
    updated_at
   FROM public.operators o;


create or replace view "public"."operators_display_v2" as  SELECT id,
    cognome,
    nome,
    birth_date,
    operator_code,
    operator_key,
    is_normalized,
    COALESCE(NULLIF(TRIM(BOTH FROM ((cognome || ' '::text) || nome)), ''::text), NULLIF(name, ''::text), NULLIF(operator_code, ''::text), NULLIF(operator_key, ''::text), '—'::text) AS display_name
   FROM public.operators o;


CREATE OR REPLACE FUNCTION public.percorso_propose_lots(p_document_id uuid, p_min_core_segments integer, p_min_cables integer, p_max_lots integer, p_dry_run boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_doc_exists boolean;
  v_cables integer;
  v_segments integer;
begin
  -- 1) document existe ?
  select exists(
    select 1 from public.percorso_documents d where d.id = p_document_id
  ) into v_doc_exists;

  if not v_doc_exists then
    return jsonb_build_object(
      'ok', false,
      'error', 'document_not_found',
      'document_id', p_document_id
    );
  end if;

  -- 2) compter câbles
  select count(*) into v_cables
  from public.percorso_cables
  where document_id = p_document_id;

  -- 3) compter segments
  select count(*) into v_segments
  from public.percorso_cable_segments s
  join public.percorso_cables c on c.id = s.cable_id
  where c.document_id = p_document_id;

  return jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'dry_run', p_dry_run,
    'params', jsonb_build_object(
      'min_core_segments', p_min_core_segments,
      'min_cables', p_min_cables,
      'max_lots', p_max_lots
    ),
    'counts', jsonb_build_object(
      'cables', v_cables,
      'segments', v_segments
    )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_update_on_frozen_files()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if old.frozen_at is not null then
    raise exception 'Document gelé juridiquement. Aucune modification autorisée.';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_auto_tp_from_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_metri_teo numeric;
begin
  -- si pas de cavo, on sort
  if new.inca_cavo_id is null then
    return new;
  end if;

  -- récupérer metri_teo
  select c.metri_teo into v_metri_teo
  from public.inca_cavi c
  where c.id = new.inca_cavo_id;

  if v_metri_teo is null or v_metri_teo <= 0 then
    return new;
  end if;

  -- calcul: si mètres posés >= 50% du théorique
  if coalesce(new.metri_posati, 0) >= (v_metri_teo * 0.5) then
    -- mise à jour globale INCA, seulement de T -> P
    update public.inca_cavi
      set situazione = 'P'
    where id = new.inca_cavo_id
      and situazione = 'T';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_fill_rapportino_inca_cache()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  c RECORD;
  r RECORD;
BEGIN
  -- Récupération câble INCA
  SELECT codice, costr, commessa
  INTO c
  FROM inca_cavi
  WHERE id = NEW.inca_cavo_id;

  -- Récupération rapportino
  SELECT report_date
  INTO r
  FROM rapportini
  WHERE id = NEW.rapportino_id;

  -- Remplissage cache
  NEW.codice_cache   := c.codice;
  NEW.costr_cache    := c.costr;
  NEW.commessa_cache := c.commessa;
  NEW.posa_date      := r.report_date;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_rapportini_on_status_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  old_s text;
  new_s text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  old_s := public.core_status_text(old.status);
  new_s := public.core_status_text(new.status);

  -- Si status inchangé: no-op
  if old_s = new_s then
    return new;
  end if;

  -- Déclenchement sur les statuts "finalisants"
  if new_s in ('VALIDATED_CAPO', 'APPROVED_UFFICIO') then
    perform public.fn_rapportino_apply_product(new.id);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ufficio_create_correction_rapportino(p_rapportino_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_role text;

  v_old public.rapportini%rowtype;
  v_new_id uuid;
  v_now timestamptz := now();

  v_reason text := coalesce(nullif(trim(p_reason), ''), null);

  -- dynamic copy for rapportino_inca_cavi
  v_inca_exists boolean := false;
  v_inca_has_created_at boolean := false;
  v_inca_has_updated_at boolean := false;
  v_inca_cols text := '';
  v_inca_select_cols text := '';
  v_sql text;

  v_copied_rows int := 0;
  v_copied_inca int := 0;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.app_role into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role is null then
    raise exception 'Profile not found';
  end if;

  if v_role not in ('UFFICIO', 'ADMIN') then
    raise exception 'Not authorized (role=%)', v_role;
  end if;

  if v_reason is null then
    raise exception 'Motivo della rettifica obbligatorio';
  end if;

  -- Lock old rapportino
  select *
  into v_old
  from public.rapportini
  where id = p_rapportino_id
  for update;

  if not found then
    raise exception 'Rapportino not found';
  end if;

  if v_old.status <> 'APPROVED_UFFICIO' then
    raise exception 'Rettifica consentita solo per documenti archiviati (status=APPROVED_UFFICIO)';
  end if;

  if v_old.superseded_by_rapportino_id is not null then
    raise exception 'Documento già sostituito da una rettifica (%).', v_old.superseded_by_rapportino_id;
  end if;

  -- Create new rapportino id
  v_new_id := gen_random_uuid();

  -- Insert new rapportino (status RETURNED: correction workflow)
  -- NOTE:
  -- - colonne NOT NULL: id, data, capo_name, status, totale_prodotto, created_at, updated_at
  -- - On fixe data = coalesce(report_date, data) pour stabilité.
  insert into public.rapportini (
    id,
    data,
    capo_id,
    capo_name,
    status,
    cost,
    commessa,
    totale_prodotto,
    ufficio_note,
    validated_by_capo_at,
    approved_by_ufficio_at,
    approved_by_ufficio,
    returned_by_ufficio_at,
    returned_by_ufficio,
    created_at,
    updated_at,
    user_id,
    crew_role,
    report_date,
    prodotto_tot,
    note_ufficio,
    costr,
    prodotto_totale,
    supersedes_rapportino_id,
    superseded_by_rapportino_id,
    correction_reason,
    correction_created_by,
    correction_created_at
  )
  values (
    v_new_id,
    coalesce(v_old.report_date, v_old.data),
    v_old.capo_id,
    v_old.capo_name,
    'RETURNED',
    v_old.cost,
    v_old.commessa,
    v_old.totale_prodotto,
    -- note Ufficio -> Capo (cause correction)
    v_reason,
    null, -- validated_by_capo_at
    null, -- approved_by_ufficio_at
    null, -- approved_by_ufficio
    v_now, -- returned_by_ufficio_at
    v_uid, -- returned_by_ufficio
    v_now, -- created_at
    v_now, -- updated_at
    v_old.user_id,
    v_old.crew_role,
    v_old.report_date,
    v_old.prodotto_tot,
    v_reason,
    v_old.costr,
    v_old.prodotto_totale,
    -- versionning
    v_old.id, -- supersedes_rapportino_id (new -> old)
    null,     -- superseded_by_rapportino_id (new not superseded)
    v_reason,
    v_uid,
    v_now
  );

  -- Copy rapportino_rows
  insert into public.rapportino_rows (
    id,
    rapportino_id,
    row_index,
    categoria,
    descrizione,
    operatori,
    tempo,
    previsto,
    prodotto,
    note,
    created_at,
    updated_at,
    activity_id
  )
  select
    gen_random_uuid(),
    v_new_id,
    r.row_index,
    r.categoria,
    r.descrizione,
    r.operatori,
    r.tempo,
    r.previsto,
    r.prodotto,
    r.note,
    v_now,
    v_now,
    r.activity_id
  from public.rapportino_rows r
  where r.rapportino_id = v_old.id
  order by r.row_index;

  get diagnostics v_copied_rows = row_count;

  -- Copy rapportino_inca_cavi (DEFENSIVE)
  -- We don't know exact schema, so we build a dynamic insert that:
  -- - detects presence of table public.rapportino_inca_cavi
  -- - copies all columns except (id, rapportino_id)
  -- - if created_at/updated_at exist: set them to now()
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rapportino_inca_cavi'
  ) into v_inca_exists;

  if v_inca_exists then
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='rapportino_inca_cavi' and column_name='created_at'
    ) into v_inca_has_created_at;

    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='rapportino_inca_cavi' and column_name='updated_at'
    ) into v_inca_has_updated_at;

    -- Build list of columns to copy (excluding id, rapportino_id)
    -- We'll also manage created_at/updated_at if present by overriding to now()
    with cols as (
      select
        c.column_name
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'rapportino_inca_cavi'
        and c.column_name not in ('id', 'rapportino_id', 'created_at', 'updated_at')
      order by c.ordinal_position
    )
    select
      string_agg(format('%I', column_name), ', ') as ins_cols,
      string_agg(format('s.%I', column_name), ', ') as sel_cols
    into v_inca_cols, v_inca_select_cols
    from cols;

    -- Compose dynamic SQL
    v_sql := 'insert into public.rapportino_inca_cavi (rapportino_id';

    if v_inca_cols is not null and v_inca_cols <> '' then
      v_sql := v_sql || ', ' || v_inca_cols;
    end if;

    if v_inca_has_created_at then
      v_sql := v_sql || ', created_at';
    end if;

    if v_inca_has_updated_at then
      v_sql := v_sql || ', updated_at';
    end if;

    v_sql := v_sql || ') select $1::uuid';

    if v_inca_select_cols is not null and v_inca_select_cols <> '' then
      v_sql := v_sql || ', ' || v_inca_select_cols;
    end if;

    if v_inca_has_created_at then
      v_sql := v_sql || ', $2::timestamptz';
    end if;

    if v_inca_has_updated_at then
      v_sql := v_sql || ', $2::timestamptz';
    end if;

    v_sql := v_sql || ' from public.rapportino_inca_cavi s where s.rapportino_id = $3::uuid';

    execute v_sql using v_new_id, v_now, v_old.id;
    get diagnostics v_copied_inca = row_count;
  end if;

  -- Link versionning: old -> new
  update public.rapportini
  set
    superseded_by_rapportino_id = v_new_id,
    updated_at = v_now
  where id = v_old.id;

  -- Audit row
  insert into public.rapportini_corrections_audit (
    old_rapportino_id,
    new_rapportino_id,
    reason,
    created_by,
    created_at
  ) values (
    v_old.id,
    v_new_id,
    v_reason,
    v_uid,
    v_now
  );

  return jsonb_build_object(
    'new_rapportino_id', v_new_id,
    'message', 'Rettifica creata (nuova versione) in status RETURNED',
    'copied_rows', v_copied_rows,
    'copied_inca_links', v_copied_inca
  );
end;
$function$
;



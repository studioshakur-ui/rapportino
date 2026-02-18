-- 20260218185656_inca_cavi_cleanup_legacy_null_rows.sql
-- SAFE cleanup: remove legacy inca_cavi rows with inca_file_id IS NULL that are NOT referenced anywhere.
-- Keeps any row linked by rapportini history (public.rapportino_inca_cavi or archive.rapportino_cavi).

begin;

do $$
declare
  v_total bigint;
  v_linked_public bigint;
  v_linked_archive bigint;
  v_deletable bigint;
begin
  select count(*) into v_total
  from public.inca_cavi
  where inca_file_id is null;

  select count(*) into v_linked_public
  from public.inca_cavi c
  where c.inca_file_id is null
    and exists (
      select 1
      from public.rapportino_inca_cavi ric
      where ric.inca_cavo_id = c.id
    );

  select count(*) into v_linked_archive
  from public.inca_cavi c
  where c.inca_file_id is null
    and exists (
      select 1
      from archive.rapportino_cavi rc
      where rc.inca_cavo_id = c.id
    );

  select count(*) into v_deletable
  from public.inca_cavi c
  where c.inca_file_id is null
    and not exists (select 1 from public.rapportino_inca_cavi ric where ric.inca_cavo_id = c.id)
    and not exists (select 1 from archive.rapportino_cavi rc where rc.inca_cavo_id = c.id);

  raise notice 'inca_cavi legacy NULL rows: total=% linked_public=% linked_archive=% deletable=%',
    v_total, v_linked_public, v_linked_archive, v_deletable;
end $$;

delete from public.inca_cavi c
where c.inca_file_id is null
  and not exists (select 1 from public.rapportino_inca_cavi ric where ric.inca_cavo_id = c.id)
  and not exists (select 1 from archive.rapportino_cavi rc where rc.inca_cavo_id = c.id);

do $$
declare
  v_after bigint;
begin
  select count(*) into v_after
  from public.inca_cavi
  where inca_file_id is null;

  raise notice 'inca_cavi legacy NULL rows after delete: remaining=%', v_after;
end $$;

commit;
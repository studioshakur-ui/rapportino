-- 20260218HHMMSS_inca_cavi_cleanup_legacy_null_rows_v2.sql
-- Reinforcement: add indexes to make cleanup fast & lock-safe; keep same deletion semantics.
-- Idempotent.

begin;

-- 1) Perf safety: indexes for the NOT EXISTS probes
create index if not exists rapportino_inca_cavi_inca_cavo_id_idx
  on public.rapportino_inca_cavi(inca_cavo_id);

create index if not exists archive_rapportino_cavi_inca_cavo_id_idx
  on archive.rapportino_cavi(inca_cavo_id);

-- Optional but recommended: partial index to speed inca_file_id IS NULL filtering
create index if not exists inca_cavi_inca_file_id_null_idx
  on public.inca_cavi(inca_file_id)
  where inca_file_id is null;

-- 2) Audit + delete with exact deleted count
do $$
declare
  v_total bigint;
  v_linked_public bigint;
  v_linked_archive bigint;
  v_deletable bigint;
  v_deleted bigint;
  v_after bigint;
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

  -- Optional paranoia switch (uncomment if desired)
  -- if v_deletable > 50000 then
  --   raise exception 'Refusing to delete % rows (too many).', v_deletable;
  -- end if;

  delete from public.inca_cavi c
  where c.inca_file_id is null
    and not exists (select 1 from public.rapportino_inca_cavi ric where ric.inca_cavo_id = c.id)
    and not exists (select 1 from archive.rapportino_cavi rc where rc.inca_cavo_id = c.id);

  get diagnostics v_deleted = row_count;
  raise notice 'inca_cavi legacy NULL rows deleted=%', v_deleted;

  select count(*) into v_after
  from public.inca_cavi
  where inca_file_id is null;

  raise notice 'inca_cavi legacy NULL rows after delete: remaining=%', v_after;
end $$;

commit;
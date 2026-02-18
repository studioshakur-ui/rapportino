-- 20260218185656_inca_cavi_cleanup_legacy_null_rows.sql
-- SAFE CLEANUP: remove orphan inca_cavi rows where inca_file_id IS NULL
-- Naval-safe: delete ONLY rows not referenced anywhere

begin;

-- 1️⃣ Create temp table to snapshot what will be deleted (audit safety)
create temporary table _inca_cavi_legacy_to_delete as
select c.*
from public.inca_cavi c
where c.inca_file_id is null
and not exists (
    select 1
    from public.rapportino_inca_cavi ric
    where ric.inca_cavo_id = c.id
)
and not exists (
    select 1
    from public.inca_percorsi ip
    where ip.inca_cavo_id = c.id
)
and not exists (
    select 1
    from public.navemaster_inca_alerts na
    where na.inca_cavo_id = c.id
)
and not exists (
    select 1
    from public.navemaster_inca_diff nd
    where nd.inca_cavo_id = c.id
);

-- 2️⃣ Log how many rows are going to be deleted
do $$
declare
    v_count integer;
begin
    select count(*) into v_count from _inca_cavi_legacy_to_delete;
    raise notice 'Legacy NULL inca_file_id rows to delete: %', v_count;
end $$;

-- 3️⃣ Perform delete (only the safe subset)
delete from public.inca_cavi c
using _inca_cavi_legacy_to_delete d
where c.id = d.id;

commit;
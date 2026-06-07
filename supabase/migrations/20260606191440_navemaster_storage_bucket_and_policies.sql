-- ============================================================================
-- CORE COMMAND — Storage bucket Navemaster
-- Bucket privé pour archiver les imports Excel Navemaster depuis l'UI.
-- L'accès est limité au single-owner CORE COMMAND.
-- ============================================================================

begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'navemaster',
  'navemaster',
  false,
  52428800,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
on conflict (id) do nothing;
drop policy if exists "navemaster_authenticated_insert" on storage.objects;
create policy "navemaster_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'navemaster' and public.core_command_is_owner());
drop policy if exists "navemaster_authenticated_select" on storage.objects;
create policy "navemaster_authenticated_select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'navemaster' and public.core_command_is_owner());
drop policy if exists "navemaster_authenticated_update" on storage.objects;
create policy "navemaster_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'navemaster' and public.core_command_is_owner())
  with check (bucket_id = 'navemaster' and public.core_command_is_owner());
drop policy if exists "navemaster_authenticated_delete" on storage.objects;
create policy "navemaster_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'navemaster' and public.core_command_is_owner());
commit;

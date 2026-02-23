begin;

drop policy if exists "catalogo_roles_select_authenticated" on public.catalogo_roles;

create policy "catalogo_roles_select_authenticated"
on public.catalogo_roles
for select
to authenticated
using (
  deleted_at is null
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and upper(p.app_role::text) = 'ADMIN'
  )
);

commit;

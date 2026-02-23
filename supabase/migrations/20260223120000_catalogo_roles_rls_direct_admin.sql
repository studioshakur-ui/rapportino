begin;

alter table public.catalogo_roles enable row level security;

drop policy if exists "catalogo_roles_select_authenticated" on public.catalogo_roles;
drop policy if exists "catalogo_roles_insert_admin" on public.catalogo_roles;
drop policy if exists "catalogo_roles_update_admin" on public.catalogo_roles;

create policy "catalogo_roles_select_authenticated"
on public.catalogo_roles
for select
to authenticated
using (deleted_at is null);

create policy "catalogo_roles_insert_admin"
on public.catalogo_roles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and upper(p.app_role::text) = 'ADMIN'
  )
);

create policy "catalogo_roles_update_admin"
on public.catalogo_roles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and upper(p.app_role::text) = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and upper(p.app_role::text) = 'ADMIN'
  )
);

commit;

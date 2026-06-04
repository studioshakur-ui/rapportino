begin;

alter table public.profiles
  add column if not exists is_core_owner boolean not null default false;

comment on column public.profiles.is_core_owner is
  'Single-owner CORE COMMAND flag. Grants read-only INCA access for CORE COMMAND when true.';

create index if not exists profiles_is_core_owner_idx
  on public.profiles (id)
  where is_core_owner = true;

create unique index if not exists profiles_single_core_owner_true_idx
  on public.profiles ((1))
  where is_core_owner = true;

create or replace function public.core_command_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_core_owner = true
  );
$$;

revoke all on function public.core_command_is_owner() from public;
grant execute on function public.core_command_is_owner() to authenticated;
grant execute on function public.core_command_is_owner() to service_role;

drop policy if exists "inca_cavi_core_command_owner_read" on public.inca_cavi;

create policy "inca_cavi_core_command_owner_read"
on public.inca_cavi
as permissive
for select
to authenticated
using (public.core_command_is_owner());

commit;

begin;

-- ============================================================
-- 1) Backfill: align existing data (role enum <-> app_role text)
-- ============================================================

-- Ensure role is populated from app_role when missing
update public.profiles
set role = app_role::public.app_role
where role is null;

-- Ensure app_role mirrors role (canonical string)
update public.profiles
set app_role = role::text
where app_role is distinct from role::text;

-- Make role mandatory (now safe because we backfilled)
alter table public.profiles
  alter column role set not null;

-- Add (or replace) a constraint that enforces perfect alignment
alter table public.profiles
  drop constraint if exists profiles_role_app_role_sync_check;

alter table public.profiles
  add constraint profiles_role_app_role_sync_check
  check (app_role = role::text);

-- ============================================================
-- 2) Prevent future drift: trigger to sync both columns
-- ============================================================

create or replace function public.sync_profile_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- If role is missing, derive it from app_role (app_role is NOT NULL)
    if new.role is null then
      new.role := new.app_role::public.app_role;
    end if;

    -- Always mirror to app_role from role (canonical)
    new.app_role := new.role::text;
    return new;
  end if;

  -- UPDATE
  if (new.role is distinct from old.role) and (new.app_role is not distinct from old.app_role) then
    -- role changed => mirror to app_role
    new.app_role := new.role::text;

  elsif (new.app_role is distinct from old.app_role) and (new.role is not distinct from old.role) then
    -- app_role changed => mirror to role
    new.role := new.app_role::public.app_role;

  else
    -- both changed or neither changed => enforce canonical equality
    if new.role is null then
      new.role := new.app_role::public.app_role;
    end if;
    new.app_role := new.role::text;
  end if;

  return new;
end;
$$;

alter function public.sync_profile_roles() owner to postgres;

drop trigger if exists trg_profiles_sync_roles on public.profiles;

create trigger trg_profiles_sync_roles
before insert or update on public.profiles
for each row
execute function public.sync_profile_roles();

-- ============================================================
-- 3) Ensure new users have both fields set at creation time
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role_text text;
begin
  -- Accept role from metadata if present, else default CAPO
  v_role_text := coalesce(new.raw_user_meta_data->>'role', new.raw_user_meta_data->>'app_role', 'CAPO');

  insert into public.profiles (id, email, display_name, app_role, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    v_role_text,
    v_role_text::public.app_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- 4) Fix Catalogue RLS inconsistency: standardize on role enum
-- ============================================================

drop policy if exists "catalogo_attivita_write_admin" on public.catalogo_attivita;

create policy "catalogo_attivita_write_admin"
on public.catalogo_attivita
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'::public.app_role
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'::public.app_role
  )
);

commit;

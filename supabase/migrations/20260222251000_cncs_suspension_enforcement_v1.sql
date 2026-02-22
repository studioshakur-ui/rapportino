-- supabase/migrations/20260222251000_cncs_suspension_enforcement_v1.sql
--
-- CNCS-grade suspension enforcement.
--
-- Goals:
-- 1) A suspended user (profiles.disabled_at not null) MUST be unable to write,
--    even if they still have a previously issued JWT.
-- 2) Role helpers MUST treat suspended users as not-authorized.
-- 3) Admin guard must refuse suspended admins.
--
-- Notes:
-- - We intentionally use a small number of central guards to avoid widespread RLS churn.
-- - Triggers provide the "hard stop" for writes on core operational tables.

begin;

-- 1) Suspension predicate
create or replace function public.is_suspended(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_uid
      and p.disabled_at is not null
  );
$$;

revoke all on function public.is_suspended(uuid) from public;
grant execute on function public.is_suspended(uuid) to authenticated;

-- 2) Central write guard
create or replace function public.require_not_suspended(p_uid uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if public.is_suspended(p_uid) then
    raise exception 'Account suspended' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_not_suspended(uuid) from public;
grant execute on function public.require_not_suspended(uuid) to authenticated;

-- 3) Trigger function: blocks INSERT/UPDATE/DELETE for suspended users.
create or replace function public.trg_guard_not_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role / postgres bypasses RLS and should not be blocked here
  -- (imports, maintenance). We only enforce for authenticated callers.
  if auth.role() = 'authenticated' then
    perform public.require_not_suspended(auth.uid());
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.trg_guard_not_suspended() from public;
grant execute on function public.trg_guard_not_suspended() to authenticated;

-- 4) Harden role helpers: suspended users are never considered authorized.
--    (Policies that use these helpers will automatically lock out suspended users.)
create or replace function public.is_role(role_text text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.disabled_at is null
      and upper(pr.app_role::text) = upper(role_text)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and p.app_role = 'ADMIN'
  );
$$;

create or replace function public.core_is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and p.app_role = 'ADMIN'
  );
$$;

create or replace function public.is_ufficio()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.disabled_at is null
      and p.app_role = 'UFFICIO'::text
  );
$$;

-- 5) Ensure require_admin refuses suspended callers (admin console cannot be used while suspended).
create or replace function public.require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_disabled timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select p.app_role::text, p.disabled_at
    into v_role, v_disabled
  from public.profiles p
  where p.id = auth.uid();

  if v_role is null then
    raise exception 'Profile not found for caller' using errcode = '28000';
  end if;

  if v_disabled is not null then
    raise exception 'Account suspended' using errcode = '42501';
  end if;

  if upper(v_role) <> 'ADMIN' then
    raise exception 'ADMIN required' using errcode = '42501';
  end if;
end;
$$;

-- 6) Attach write-guards to core operational tables.
--    We use conditional DDL to keep the migration safe across environments.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.rapportini',
    'public.rapportino_rows',
    'public.rapportino_row_operators',
    'public.rapportino_inca_cavi',
    'public.core_files',
    'public.core_drive_events'
  ]
  LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('drop trigger if exists trg_guard_not_suspended_write on %s;', t);
      EXECUTE format(
        'create trigger trg_guard_not_suspended_write before insert or update or delete on %s for each row execute function public.trg_guard_not_suspended();',
        t
      );
    END IF;
  END LOOP;
END $$;

commit;

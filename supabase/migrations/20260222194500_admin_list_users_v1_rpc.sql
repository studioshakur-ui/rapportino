-- supabase/migrations/20260222194500_admin_list_users_v1_rpc.sql
--
-- CNCS-grade: "Inactive > 30d" MUST be based on Auth activity.
-- Source of truth: auth.users.last_sign_in_at
--
-- Exposes an ADMIN-only RPC that joins public.profiles with auth.users.
-- The RPC is SECURITY DEFINER, but enforces ADMIN via profiles.app_role.
--
-- NOTE:
-- - Uses auth.uid() as caller identity.
-- - If you already have public.is_admin(), this still works (we avoid dependency).
-- - Returns last_sign_in_at + auth_created_at.

begin;

-- 1) Guard: require admin
create or replace function public.require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select p.app_role::text
    into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role is null then
    raise exception 'Profile not found for caller' using errcode = '28000';
  end if;

  if upper(v_role) <> 'ADMIN' then
    raise exception 'ADMIN required' using errcode = '42501';
  end if;
end;
$$;

-- 2) RPC: list users with auth last_sign_in_at
create or replace function public.admin_list_users_v1(
  p_q text default null,
  p_role text default null
)
returns table (
  id uuid,
  email text,
  display_name text,
  full_name text,
  app_role text,
  role text,
  must_change_password boolean,
  disabled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  auth_created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.display_name,
    p.full_name,
    p.app_role::text as app_role,
    p.role::text as role,
    coalesce(p.must_change_password, false) as must_change_password,
    p.disabled_at,
    p.created_at,
    p.updated_at,
    u.created_at as auth_created_at,
    u.last_sign_in_at
  from public.profiles p
  left join auth.users u
    on u.id = p.id
  where
    -- Enforce admin access
    (select public.require_admin() is null)
    and (
      p_q is null
      or p.email ilike ('%' || p_q || '%')
      or coalesce(p.display_name,'') ilike ('%' || p_q || '%')
      or coalesce(p.full_name,'') ilike ('%' || p_q || '%')
    )
    and (
      p_role is null
      or upper(p.app_role::text) = upper(p_role)
    )
  order by
    coalesce(u.last_sign_in_at, u.created_at, p.updated_at, p.created_at) desc nulls last;
$$;

-- 3) Privileges: executable by authenticated users (guarded by require_admin())
revoke all on function public.admin_list_users_v1(text, text) from public;
grant execute on function public.admin_list_users_v1(text, text) to authenticated;

revoke all on function public.require_admin() from public;
grant execute on function public.require_admin() to authenticated;

commit;
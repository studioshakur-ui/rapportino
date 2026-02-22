-- Allow admin_list_users_v1 to read profiles despite RLS
-- NOTE: do not edit previous migrations; apply patch via new migration.
set check_function_bodies = off;

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
set row_security = off
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

revoke all on function public.admin_list_users_v1(text, text) from public;
grant execute on function public.admin_list_users_v1(text, text) to authenticated;

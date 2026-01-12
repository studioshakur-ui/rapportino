begin;

-- =============================================================================
-- MANAGER decides CAPO UI mode (simple/rich) — hard enforced
--
-- Why:
-- - profiles.capo_ui_mode exists with CHECK (simple|rich) but currently "self update"
--   policies allow the CAPO to change it from the client.
-- - RLS cannot protect per-column updates, so we enforce via:
--   1) RPC SECURITY DEFINER (manager/admin only)
--   2) Trigger guard on profiles to block any direct UPDATE attempt by CAPO
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) RPC: manager_my_capi_ui_modes_v1()
-- Returns capi in manager perimeter (active=true) + current capo_ui_mode.
-- Admin can see all CAPO profiles.
-- -----------------------------------------------------------------------------
create or replace function public.manager_my_capi_ui_modes_v1()
returns table (
  capo_id uuid,
  display_name text,
  email text,
  capo_ui_mode text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as capo_id,
    p.display_name,
    p.email,
    p.capo_ui_mode
  from public.profiles p
  where
    (
      public.is_admin(auth.uid())
      and p.app_role = 'CAPO'
    )
    or
    (
      exists (
        select 1
        from public.profiles actor
        where actor.id = auth.uid()
          and actor.app_role in ('MANAGER', 'ADMIN')
      )
      and exists (
        select 1
        from public.manager_capo_assignments mca
        where mca.manager_id = auth.uid()
          and mca.capo_id = p.id
          and mca.active = true
      )
    )
  order by
    coalesce(p.display_name, p.email, p.id::text);
$$;

grant execute on function public.manager_my_capi_ui_modes_v1() to authenticated;

-- -----------------------------------------------------------------------------
-- 2) RPC: manager_set_capo_ui_mode_v1(capo_id, mode)
-- Canonical write path: manager/admin only, perimeter enforced via mca(active=true).
-- -----------------------------------------------------------------------------
create or replace function public.manager_set_capo_ui_mode_v1(
  p_capo_id uuid,
  p_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_capo_id is null then
    raise exception 'capo_id is required';
  end if;

  if p_mode is null or p_mode not in ('simple', 'rich') then
    raise exception 'invalid capo_ui_mode: %', p_mode;
  end if;

  -- Admin can always update
  if public.is_admin(auth.uid()) then
    update public.profiles
      set capo_ui_mode = p_mode,
          updated_at = now()
    where id = p_capo_id;

    if not found then
      raise exception 'capo not found: %', p_capo_id;
    end if;

    return;
  end if;

  -- Manager perimeter check (active=true)
  if not exists (
    select 1
    from public.profiles actor
    where actor.id = auth.uid()
      and actor.app_role in ('MANAGER', 'ADMIN')
  ) then
    raise exception 'forbidden: actor is not manager/admin';
  end if;

  if not exists (
    select 1
    from public.manager_capo_assignments mca
    where mca.manager_id = auth.uid()
      and mca.capo_id = p_capo_id
      and mca.active = true
  ) then
    raise exception 'forbidden: capo not in manager perimeter';
  end if;

  update public.profiles
    set capo_ui_mode = p_mode,
        updated_at = now()
  where id = p_capo_id;

  if not found then
    raise exception 'capo not found: %', p_capo_id;
  end if;
end;
$$;

grant execute on function public.manager_set_capo_ui_mode_v1(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Trigger guard on profiles: blocks direct UPDATE of capo_ui_mode from client
--    unless actor is admin or perimeter manager.
-- -----------------------------------------------------------------------------
create or replace function public.guard_profiles_capo_ui_mode_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- Only guard the sensitive column
  if new.capo_ui_mode is distinct from old.capo_ui_mode then
    if auth.uid() is null then
      raise exception 'not authenticated';
    end if;

    if public.is_admin(auth.uid()) then
      return new;
    end if;

    if exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and actor.app_role in ('MANAGER', 'ADMIN')
    )
    and exists (
      select 1
      from public.manager_capo_assignments mca
      where mca.manager_id = auth.uid()
        and mca.capo_id = new.id
        and mca.active = true
    ) then
      return new;
    end if;

    raise exception 'forbidden: capo_ui_mode can only be changed by manager/admin';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profiles_capo_ui_mode_v1 on public.profiles;

create trigger trg_guard_profiles_capo_ui_mode_v1
before update on public.profiles
for each row
execute function public.guard_profiles_capo_ui_mode_v1();

commit;

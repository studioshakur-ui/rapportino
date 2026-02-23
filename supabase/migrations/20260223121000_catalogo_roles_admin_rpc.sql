begin;

create or replace function public.catalogo_role_create(
  p_role_key text,
  p_label_it text,
  p_label_fr text default null,
  p_label_en text default null
)
returns public.catalogo_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.catalogo_roles;
begin
  perform public.require_admin();

  insert into public.catalogo_roles(role_key, label_it, label_fr, label_en, is_active, deleted_at)
  values (
    lower(trim(p_role_key)),
    trim(p_label_it),
    nullif(trim(coalesce(p_label_fr, '')), ''),
    nullif(trim(coalesce(p_label_en, '')), ''),
    true,
    null
  )
  on conflict ((lower(trim(role_key))))
  do update set
    label_it = excluded.label_it,
    label_fr = excluded.label_fr,
    label_en = excluded.label_en,
    is_active = true,
    deleted_at = null,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.catalogo_role_set_active(
  p_role_id uuid,
  p_is_active boolean
)
returns public.catalogo_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.catalogo_roles;
begin
  perform public.require_admin();

  update public.catalogo_roles
  set
    is_active = p_is_active,
    deleted_at = case when p_is_active then null else now() end,
    updated_at = now()
  where id = p_role_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'catalogo_roles row not found: %', p_role_id using errcode = '22023';
  end if;

  return v_row;
end;
$$;

revoke all on function public.catalogo_role_create(text, text, text, text) from public;
grant execute on function public.catalogo_role_create(text, text, text, text) to authenticated;

revoke all on function public.catalogo_role_set_active(uuid, boolean) from public;
grant execute on function public.catalogo_role_set_active(uuid, boolean) to authenticated;

commit;

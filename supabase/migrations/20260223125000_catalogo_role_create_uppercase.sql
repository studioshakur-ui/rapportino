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
    upper(trim(p_role_key)),
    upper(trim(p_label_it)),
    nullif(upper(trim(coalesce(p_label_fr, ''))), ''),
    nullif(upper(trim(coalesce(p_label_en, ''))), ''),
    true,
    null
  )
  on conflict ((lower(trim(role_key))))
  do update set
    role_key = upper(excluded.role_key),
    label_it = upper(excluded.label_it),
    label_fr = excluded.label_fr,
    label_en = excluded.label_en,
    is_active = true,
    deleted_at = null,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.catalogo_role_create(text, text, text, text) from public;
grant execute on function public.catalogo_role_create(text, text, text, text) to authenticated;

commit;

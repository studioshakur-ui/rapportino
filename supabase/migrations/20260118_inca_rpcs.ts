// supabase/migrations/20260118_inca_rpcs.ts
export const INCA_RPCS_SQL = `
create or replace function public.inca_increment_rework(p_inca_file_id uuid, p_codes text[])
returns void
language plpgsql
as $$
begin
  update public.inca_cavi
  set rework_count = rework_count + 1,
      last_rework_at = now()
  where inca_file_id = p_inca_file_id
    and codice = any(p_codes);
end $$;

create or replace function public.inca_increment_eliminated(p_inca_file_id uuid, p_codes text[])
returns void
language plpgsql
as $$
begin
  update public.inca_cavi
  set eliminated_count = eliminated_count + 1,
      last_eliminated_at = now()
  where inca_file_id = p_inca_file_id
    and codice = any(p_codes);
end $$;

create or replace function public.inca_increment_reinstated(p_inca_file_id uuid, p_codes text[])
returns void
language plpgsql
as $$
begin
  update public.inca_cavi
  set reinstated_count = reinstated_count + 1,
      last_reinstated_at = now()
  where inca_file_id = p_inca_file_id
    and codice = any(p_codes);
end $$;
`;

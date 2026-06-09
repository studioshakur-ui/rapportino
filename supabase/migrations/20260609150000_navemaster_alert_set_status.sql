-- Triage delle alert Navemaster (OPEN/ACK/RESOLVED). Le alert sono immutabili
-- lato client (policy no_update); questo RPC SECURITY DEFINER la bypassa,
-- gated sull'owner CORE COMMAND. INCA read-only.
create or replace function public.navemaster_alert_set_status(p_alert_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.navemaster_is_ufficio_or_admin() or public.core_command_is_owner()) then
    raise exception 'navemaster_alert_set_status: not allowed';
  end if;
  if p_status not in ('OPEN','ACK','RESOLVED') then
    raise exception 'navemaster_alert_set_status: invalid status %', p_status;
  end if;
  update public.navemaster_alerts
     set status = p_status::public.navemaster_alert_status
   where id = p_alert_id;
end;
$$;

revoke all on function public.navemaster_alert_set_status(uuid, text) from public;
grant execute on function public.navemaster_alert_set_status(uuid, text) to authenticated;
grant execute on function public.navemaster_alert_set_status(uuid, text) to service_role;

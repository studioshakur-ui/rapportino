create or replace function public.core_is_member()
  returns boolean language sql stable security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.disabled_at is null
  );
$$;

revoke all on function public.core_is_member() from public;
grant execute on function public.core_is_member() to authenticated, service_role;

do $$
declare
  member_tables text[] := array[
    'profiles',
    'operators',
    'inca_files',
    'inca_cavi',
    'inca_percorsi',
    'ships',
    'rapportini',
    'rapportino_rows',
    'rapportino_cavi',
    'rapportino_inca_cavi',
    'core_files',
    'impianti',
    'impianto_capi',
    'ship_operators',
    'core_drive_events',
    'percorso_documents',
    'percorso_cables',
    'percorso_cable_segments',
    'percorso_lots',
    'percorso_lot_cables',
    'percorso_lot_segments',
    'percorso_lot_validations',
    'navemaster_imports',
    'navemaster_rows',
    'manager_plans',
    'plan_capo_slots',
    'plan_slot_members',
    'planning_audit',
    'catalogo_attivita',
    'rapportino_row_operators',
    'catalogo_ship_commessa_attivita',
    'navemaster_inca_alerts',
    'navemaster_inca_diff',
    'capo_ship_attendance',
    'operator_ship_attendance',
    'cncs_signal_runs',
    'cncs_signals',
    'capo_team_days',
    'capo_teams',
    'capo_team_members',
    'inca_saved_views',
    'navemaster_runs',
    'navemaster_state_rows',
    'blocchi_locali',
    'navemaster_events',
    'navemaster_alerts',
    'catalogo_roles',
    'catalogo_attivita_roles',
    'catalogo_import_runs',
    'catalogo_import_run_rows',
    'catalogo_events',
    'incoming_messages',
    'daily_list_imports',
    'daily_list_items',
    'daily_list_item_events',
    'daily_list_item_status_snapshots',
    'apparati_snapshots'
  ];
  enable_member_tables text[] := array[
    'rapportini_corrections_audit',
    'inca_import_runs',
    'inca_imports',
    'inca_cavi_snapshot',
    'inca_change_events',
    'inca_import_summaries',
    'core_operators',
    'whatsapp_imports',
    'whatsapp_messages',
    'core_events',
    'cable_events',
    'cable_priorities',
    'agent_findings',
    'production_daily_kpis'
  ];
  owner_tables text[] := array[
    'admin_actions_audit',
    'core_file_audit'
  ];
  table_name text;
  policy_record record;
begin
  foreach table_name in array member_tables loop
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        table_name
      );
    end loop;

    execute format(
      'create policy "member_select" on public.%I for select to authenticated using (public.core_is_member())',
      table_name
    );
    execute format(
      'create policy "member_insert" on public.%I for insert to authenticated with check (public.core_is_member())',
      table_name
    );
    execute format(
      'create policy "member_update" on public.%I for update to authenticated using (public.core_is_member()) with check (public.core_is_member())',
      table_name
    );
    execute format(
      'create policy "owner_delete" on public.%I for delete to authenticated using (public.core_command_is_owner())',
      table_name
    );
  end loop;

  foreach table_name in array owner_tables loop
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        table_name
      );
    end loop;

    execute format(
      'create policy "owner_all" on public.%I for all to authenticated using (public.core_command_is_owner()) with check (public.core_command_is_owner())',
      table_name
    );
  end loop;

  foreach table_name in array enable_member_tables loop
    execute format('alter table public.%I enable row level security', table_name);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        table_name
      );
    end loop;

    execute format(
      'create policy "member_select" on public.%I for select to authenticated using (public.core_is_member())',
      table_name
    );
    execute format(
      'create policy "member_insert" on public.%I for insert to authenticated with check (public.core_is_member())',
      table_name
    );
    execute format(
      'create policy "member_update" on public.%I for update to authenticated using (public.core_is_member()) with check (public.core_is_member())',
      table_name
    );
    execute format(
      'create policy "owner_delete" on public.%I for delete to authenticated using (public.core_command_is_owner())',
      table_name
    );
  end loop;
end $$;

drop table if exists public.ship_capos cascade;
drop table if exists public.ship_managers cascade;
drop table if exists public.manager_capo_assignments cascade;
drop table if exists public.ufficio_capo_scopes cascade;

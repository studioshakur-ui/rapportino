drop trigger if exists "set_rapportino_updated_at" on "archive"."rapportini";

drop trigger if exists "set_updated_at_rapportini" on "archive"."rapportini";

drop trigger if exists "sync_capo_id_from_user_id_trg" on "archive"."rapportini";

drop trigger if exists "set_updated_at_cavi" on "archive"."rapportino_cavi";

drop trigger if exists "set_updated_at_righe" on "archive"."rapportino_righe";

drop trigger if exists "set_rapportino_row_updated_at" on "archive"."rapportino_rows";

drop trigger if exists "trg_catalogo_attivita_updated_at" on "public"."catalogo_attivita";

drop trigger if exists "trg_catalogo_ship_commessa_attivita_updated_at" on "public"."catalogo_ship_commessa_attivita";

drop trigger if exists "trg_core_drive_events_block_delete" on "public"."core_drive_events";

drop trigger if exists "trg_core_drive_events_block_update" on "public"."core_drive_events";

drop trigger if exists "trg_core_file_versioning" on "public"."core_files";

drop trigger if exists "trg_prevent_frozen_update" on "public"."core_files";

drop trigger if exists "trg_norm_commessa_inca_cavi" on "public"."inca_cavi";

drop trigger if exists "trg_norm_commessa_inca_files" on "public"."inca_files";

drop trigger if exists "trg_manager_plans_updated_at" on "public"."manager_plans";

drop trigger if exists "set_updated_at_models" on "public"."models";

drop trigger if exists "operators_require_identity" on "public"."operators";

drop trigger if exists "set_updated_at_operators" on "public"."operators";

drop trigger if exists "trg_operator_auto_normalize" on "public"."operators";

drop trigger if exists "trg_operators_set_operator_key" on "public"."operators";

drop trigger if exists "set_updated_at_patterns" on "public"."patterns";

drop trigger if exists "trg_plan_capo_slots_updated_at" on "public"."plan_capo_slots";

drop trigger if exists "trg_fill_plan_id_on_slot_member" on "public"."plan_slot_members";

drop trigger if exists "trg_plan_slot_members_updated_at" on "public"."plan_slot_members";

drop trigger if exists "set_profile_updated_at" on "public"."profiles";

drop trigger if exists "set_updated_at_profiles" on "public"."profiles";

drop trigger if exists "rapportini_apply_inca_progress_on_status" on "public"."rapportini";

drop trigger if exists "rapportini_status_product_trg" on "public"."rapportini";

drop trigger if exists "t_archive_on_rapportino_approved" on "public"."rapportini";

drop trigger if exists "trg_consolidate_inca_on_rapportino_approved" on "public"."rapportini";

drop trigger if exists "trg_norm_commessa_rapportini" on "public"."rapportini";

drop trigger if exists "before_ins_rapportino_inca_cache" on "public"."rapportino_inca_cavi";

drop trigger if exists "trg_hydrate_rapportino_inca_cavi_caches" on "public"."rapportino_inca_cavi";

drop trigger if exists "trg_rapportino_inca_cavi_auto_tp" on "public"."rapportino_inca_cavi";

drop trigger if exists "trg_rro_updated_at" on "public"."rapportino_row_operators";

drop trigger if exists "trg_ship_operators_updated_at" on "public"."ship_operators";

drop policy "capo own rapportini CRUD" on "archive"."rapportini";

drop policy "ufficio can read validated" on "archive"."rapportini";

drop policy "ufficio can update status" on "archive"."rapportini";

drop policy "capo own cavi CRUD" on "archive"."rapportino_cavi";

drop policy "ufficio read cavi for validated" on "archive"."rapportino_cavi";

drop policy "capo own righe CRUD" on "archive"."rapportino_righe";

drop policy "ufficio read righe for validated" on "archive"."rapportino_righe";

drop policy "manager_insert_ship_assignments" on "public"."capo_ship_assignments";

drop policy "manager_update_ship_assignments" on "public"."capo_ship_assignments";

drop policy "capo_insert_own_ship_attendance" on "public"."capo_ship_attendance";

drop policy "capo_update_own_ship_attendance" on "public"."capo_ship_attendance";

drop policy "manager_insert_expected_operators" on "public"."capo_ship_expected_operators";

drop policy "manager_update_expected_operators" on "public"."capo_ship_expected_operators";

drop policy "catalogo_attivita_delete_admin" on "public"."catalogo_attivita";

drop policy "catalogo_attivita_insert_admin" on "public"."catalogo_attivita";

drop policy "catalogo_attivita_update_admin" on "public"."catalogo_attivita";

drop policy "catalogo_attivita_write_admin" on "public"."catalogo_attivita";

drop policy "catalogo_ship_commessa_write_admin" on "public"."catalogo_ship_commessa_attivita";

drop policy "core_drive_events_select_via_core_files" on "public"."core_drive_events";

drop policy "audit_select_direzione" on "public"."core_file_audit";

drop policy "core_files_delete_direzione" on "public"."core_files";

drop policy "core_files_insert" on "public"."core_files";

drop policy "core_files_select" on "public"."core_files";

drop policy "core_files_update" on "public"."core_files";

drop policy "impianti_admin_all" on "public"."impianti";

drop policy "impianti_manager_read_perimeter" on "public"."impianti";

drop policy "impianto_capi_admin_all" on "public"."impianto_capi";

drop policy "impianto_capi_manager_read_perimeter" on "public"."impianto_capi";

drop policy "inca_cavi_capo_select" on "public"."inca_cavi";

drop policy "inca_cavi_direzione_select" on "public"."inca_cavi";

drop policy "inca_cavi_manager_select" on "public"."inca_cavi";

drop policy "inca_cavi_select_staff" on "public"."inca_cavi";

drop policy "inca_cavi_ufficio_mutate" on "public"."inca_cavi";

drop policy "inca_cavi_ufficio_select" on "public"."inca_cavi";

drop policy "inca_cavi_write_ufficio_admin" on "public"."inca_cavi";

drop policy "insert_own_inca_cavi" on "public"."inca_cavi";

drop policy "select_own_inca_cavi" on "public"."inca_cavi";

drop policy "inca_files_capo_select" on "public"."inca_files";

drop policy "inca_files_direzione_select" on "public"."inca_files";

drop policy "inca_files_insert_staff" on "public"."inca_files";

drop policy "inca_files_manager_select" on "public"."inca_files";

drop policy "inca_files_select_staff" on "public"."inca_files";

drop policy "inca_files_ufficio_mutate" on "public"."inca_files";

drop policy "inca_files_ufficio_select" on "public"."inca_files";

drop policy "inca_files_write_ufficio_admin" on "public"."inca_files";

drop policy "inca_percorsi_write_ufficio_admin" on "public"."inca_percorsi";

drop policy "mca_admin_all" on "public"."manager_capo_assignments";

drop policy "admin_read_all_manager_capo_scope" on "public"."manager_capo_scope";

drop policy "admin_read_all_manager_plans" on "public"."manager_plans";

drop policy "capo own models CRUD" on "public"."models";

drop policy "models_select_owner_or_direction" on "public"."models";

drop policy "navemaster_imports_write" on "public"."navemaster_imports";

drop policy "navemaster_rows_write" on "public"."navemaster_rows";

drop policy "objectives_select_all_for_direction" on "public"."objectives";

drop policy "objectives_write_direction" on "public"."objectives";

drop policy "admin_read_all_kpi_facts" on "public"."operator_kpi_facts";

drop policy "admin_read_all_kpi_snapshots" on "public"."operator_kpi_snapshots";

drop policy "capo_insert_operator_attendance_for_assigned_ship" on "public"."operator_ship_attendance";

drop policy "capo_update_operator_attendance_for_assigned_ship" on "public"."operator_ship_attendance";

drop policy "operators_admin_all" on "public"."operators";

drop policy "capo_validate" on "public"."percorso_lot_validations";

drop policy "ufficio_validate" on "public"."percorso_lot_validations";

drop policy "create_lots" on "public"."percorso_lots";

drop policy "admin_read_all_plan_capo_slots" on "public"."plan_capo_slots";

drop policy "manager_rw_slots_via_plan" on "public"."plan_capo_slots";

drop policy "admin_read_all_plan_slot_members" on "public"."plan_slot_members";

drop policy "capo_read_own_members" on "public"."plan_slot_members";

drop policy "manager_rw_members_via_plan" on "public"."plan_slot_members";

drop policy "admin_read_all_planning_audit" on "public"."planning_audit";

drop policy "profiles_admin_select_all" on "public"."profiles";

drop policy "rapportini_capo_insert" on "public"."rapportini";

drop policy "rapportini_capo_update" on "public"."rapportini";

drop policy "rapportini_direzione_select" on "public"."rapportini";

drop policy "rapportini_manager_select" on "public"."rapportini";

drop policy "rapportini_manager_select_perimeter" on "public"."rapportini";

drop policy "rapportini_select_ufficio" on "public"."rapportini";

drop policy "rapportini_ufficio_select" on "public"."rapportini";

drop policy "rapportini_ufficio_update" on "public"."rapportini";

drop policy "rapportini_update_ufficio" on "public"."rapportini";

drop policy "capo_insert_rapportino_cavi" on "public"."rapportino_cavi";

drop policy "capo_select_rapportino_cavi" on "public"."rapportino_cavi";

drop policy "capo_update_rapportino_cavi" on "public"."rapportino_cavi";

drop policy "ufficio_direzione_select_rapportino_cavi" on "public"."rapportino_cavi";

drop policy "capo_delete_rapportino_inca" on "public"."rapportino_inca_cavi";

drop policy "capo_insert_rapportino_inca" on "public"."rapportino_inca_cavi";

drop policy "capo_select_rapportino_inca" on "public"."rapportino_inca_cavi";

drop policy "capo_update_rapportino_inca" on "public"."rapportino_inca_cavi";

drop policy "owner_rapportino_can_crud" on "public"."rapportino_inca_cavi";

drop policy "rro_delete" on "public"."rapportino_row_operators";

drop policy "rro_insert" on "public"."rapportino_row_operators";

drop policy "rro_select" on "public"."rapportino_row_operators";

drop policy "rro_update" on "public"."rapportino_row_operators";

drop policy "capo can manage rows" on "public"."rapportino_rows";

drop policy "capo_delete_rows_own" on "public"."rapportino_rows";

drop policy "capo_insert_rows_own" on "public"."rapportino_rows";

drop policy "capo_select_rows_own" on "public"."rapportino_rows";

drop policy "capo_update_rows_own" on "public"."rapportino_rows";

drop policy "rapportino_rows_backoffice_select_fast" on "public"."rapportino_rows";

drop policy "ship_capos_admin_all" on "public"."ship_capos";

drop policy "ship_capos_manager_delete_perimeter" on "public"."ship_capos";

drop policy "ship_capos_manager_insert_perimeter" on "public"."ship_capos";

drop policy "ship_capos_manager_select_perimeter" on "public"."ship_capos";

drop policy "ship_managers_admin_all" on "public"."ship_managers";

drop policy "ship_operators_admin_all" on "public"."ship_operators";

drop policy "ship_operators_admin_insert" on "public"."ship_operators";

drop policy "ship_operators_admin_select" on "public"."ship_operators";

drop policy "ship_operators_admin_update" on "public"."ship_operators";

drop policy "ship_operators_manager_select_perimeter" on "public"."ship_operators";

drop policy "ships_admin_select" on "public"."ships";

drop policy "ships_capo_select_assigned" on "public"."ships";

drop policy "ships_manager_select_perimeter" on "public"."ships";

drop policy "ships_office_select" on "public"."ships";

alter table "archive"."rapportino_cavi" drop constraint "rapportino_cavi_inca_cavo_id_fkey";

alter table "public"."capo_ship_assignments" drop constraint "capo_ship_assignments_capo_id_fkey";

alter table "public"."capo_ship_assignments" drop constraint "capo_ship_assignments_manager_id_fkey";

alter table "public"."capo_ship_assignments" drop constraint "capo_ship_assignments_ship_id_fkey";

alter table "public"."capo_ship_attendance" drop constraint "capo_ship_attendance_capo_id_fkey";

alter table "public"."capo_ship_attendance" drop constraint "capo_ship_attendance_ship_id_fkey";

alter table "public"."capo_ship_expected_operators" drop constraint "capo_ship_expected_operators_capo_id_fkey";

alter table "public"."capo_ship_expected_operators" drop constraint "capo_ship_expected_operators_manager_id_fkey";

alter table "public"."capo_ship_expected_operators" drop constraint "capo_ship_expected_operators_operator_id_fkey";

alter table "public"."capo_ship_expected_operators" drop constraint "capo_ship_expected_operators_ship_id_fkey";

alter table "public"."catalogo_ship_commessa_attivita" drop constraint "catalogo_ship_commessa_attivita_activity_id_fkey";

alter table "public"."catalogo_ship_commessa_attivita" drop constraint "catalogo_ship_commessa_attivita_created_by_fkey";

alter table "public"."catalogo_ship_commessa_attivita" drop constraint "catalogo_ship_commessa_attivita_ship_id_fkey";

alter table "public"."core_drive_events" drop constraint "core_drive_events_file_id_fkey";

alter table "public"."core_drive_events" drop constraint "core_drive_events_prev_event_id_fkey";

alter table "public"."core_file_audit" drop constraint "core_file_audit_core_file_id_fkey";

alter table "public"."core_file_audit" drop constraint "core_file_audit_performed_by_fkey";

alter table "public"."core_files" drop constraint "core_files_created_by_fkey";

alter table "public"."core_files" drop constraint "core_files_inca_cavo_id_fkey";

alter table "public"."core_files" drop constraint "core_files_inca_file_id_fkey";

alter table "public"."core_files" drop constraint "core_files_operator_id_fkey";

alter table "public"."core_files" drop constraint "core_files_rapportino_id_fkey";

alter table "public"."core_files" drop constraint "core_files_version_of_fkey";

alter table "public"."core_meta" drop constraint "core_meta_updated_by_fkey";

alter table "public"."impianti" drop constraint "impianti_ship_id_fkey";

alter table "public"."impianto_capi" drop constraint "impianto_capi_capo_id_fkey";

alter table "public"."impianto_capi" drop constraint "impianto_capi_impianto_id_fkey";

alter table "public"."inca_cavi" drop constraint "inca_cavi_from_file_id_fkey";

alter table "public"."inca_cavi" drop constraint "inca_cavi_inca_file_id_fkey";

alter table "public"."inca_files" drop constraint "inca_files_ship_id_fkey";

alter table "public"."inca_files" drop constraint "inca_files_uploaded_by_fkey";

alter table "public"."inca_percorsi" drop constraint "inca_percorsi_cavo_id_fkey";

alter table "public"."manager_capo_assignments" drop constraint "manager_capo_assignments_capo_fk";

alter table "public"."manager_capo_assignments" drop constraint "manager_capo_assignments_manager_fk";

alter table "public"."manager_capo_scope" drop constraint "manager_capo_scope_capo_id_fkey";

alter table "public"."manager_capo_scope" drop constraint "manager_capo_scope_created_by_fkey";

alter table "public"."manager_capo_scope" drop constraint "manager_capo_scope_manager_id_fkey";

alter table "public"."manager_plans" drop constraint "manager_plans_created_by_fkey";

alter table "public"."manager_plans" drop constraint "manager_plans_manager_id_fkey";

alter table "public"."navemaster_imports" drop constraint "navemaster_imports_imported_by_fkey";

alter table "public"."navemaster_imports" drop constraint "navemaster_imports_ship_id_fkey";

alter table "public"."navemaster_inca_alerts" drop constraint "navemaster_inca_alerts_inca_file_id_fkey";

alter table "public"."navemaster_inca_alerts" drop constraint "navemaster_inca_alerts_ship_id_fkey";

alter table "public"."navemaster_inca_diff" drop constraint "navemaster_inca_diff_inca_file_id_fkey";

alter table "public"."navemaster_inca_diff" drop constraint "navemaster_inca_diff_ship_id_fkey";

alter table "public"."navemaster_rows" drop constraint "navemaster_rows_navemaster_import_id_fkey";

alter table "public"."objectives" drop constraint "objectives_created_by_fkey";

alter table "public"."operator_kpi_facts" drop constraint "operator_kpi_facts_created_by_fkey";

alter table "public"."operator_kpi_facts" drop constraint "operator_kpi_facts_operator_id_fkey";

alter table "public"."operator_kpi_facts" drop constraint "operator_kpi_facts_plan_id_fkey";

alter table "public"."operator_kpi_facts" drop constraint "operator_kpi_facts_slot_id_fkey";

alter table "public"."operator_kpi_snapshots" drop constraint "operator_kpi_snapshots_computed_by_fkey";

alter table "public"."operator_kpi_snapshots" drop constraint "operator_kpi_snapshots_operator_id_fkey";

alter table "public"."operator_ship_attendance" drop constraint "operator_ship_attendance_operator_id_fkey";

alter table "public"."operator_ship_attendance" drop constraint "operator_ship_attendance_ship_id_fkey";

alter table "public"."operators" drop constraint "operators_created_by_fkey";

alter table "public"."patterns" drop constraint "patterns_capo_id_fkey";

alter table "public"."percorso_cable_segments" drop constraint "percorso_cable_segments_cable_id_fkey";

alter table "public"."percorso_cables" drop constraint "percorso_cables_document_id_fkey";

alter table "public"."percorso_documents" drop constraint "percorso_documents_inca_file_id_fkey";

alter table "public"."percorso_lot_cables" drop constraint "percorso_lot_cables_cable_id_fkey";

alter table "public"."percorso_lot_cables" drop constraint "percorso_lot_cables_lot_id_fkey";

alter table "public"."percorso_lot_segments" drop constraint "percorso_lot_segments_lot_id_fkey";

alter table "public"."percorso_lot_validations" drop constraint "percorso_lot_validations_lot_id_fkey";

alter table "public"."percorso_lots" drop constraint "percorso_lots_document_id_fkey";

alter table "public"."plan_capo_slots" drop constraint "plan_capo_slots_capo_id_fkey";

alter table "public"."plan_capo_slots" drop constraint "plan_capo_slots_created_by_fkey";

alter table "public"."plan_capo_slots" drop constraint "plan_capo_slots_plan_id_fkey";

alter table "public"."plan_slot_members" drop constraint "plan_slot_members_created_by_fkey";

alter table "public"."plan_slot_members" drop constraint "plan_slot_members_operator_id_fkey";

alter table "public"."plan_slot_members" drop constraint "plan_slot_members_slot_id_fkey";

alter table "public"."planning_audit" drop constraint "planning_audit_actor_id_fkey";

alter table "public"."planning_audit" drop constraint "planning_audit_plan_id_fkey";

alter table "public"."rapportino_cavi" drop constraint "rapportino_cavi_created_by_fkey";

alter table "public"."rapportino_cavi" drop constraint "rapportino_cavi_inca_cavo_id_fkey";

alter table "public"."rapportino_cavi" drop constraint "rapportino_cavi_rapportino_id_fkey";

alter table "public"."rapportino_inca_cavi" drop constraint "rapportino_inca_cavi_inca_cavo_id_fkey";

alter table "public"."rapportino_inca_cavi" drop constraint "rapportino_inca_cavi_posa_allowed_values";

alter table "public"."rapportino_inca_cavi" drop constraint "rapportino_inca_cavi_rapportino_id_fkey";

alter table "public"."rapportino_inca_cavi" drop constraint "rapportino_inca_cavi_ripresa_must_be_100";

alter table "public"."rapportino_inca_cavi" drop constraint "rapportino_inca_ripresa_100_check";

alter table "public"."rapportino_inca_cavi" drop constraint "rapportino_inca_step_check";

alter table "public"."rapportino_row_operators" drop constraint "rapportino_row_operators_operator_id_fkey";

alter table "public"."rapportino_row_operators" drop constraint "rapportino_row_operators_rapportino_row_id_fkey";

alter table "public"."rapportino_rows" drop constraint "rapportino_rows_activity_id_fkey";

alter table "public"."rapportino_rows" drop constraint "rapportino_rows_rapportino_id_fkey";

alter table "public"."ship_capos" drop constraint "ship_capos_capo_id_fkey";

alter table "public"."ship_capos" drop constraint "ship_capos_created_by_fkey";

alter table "public"."ship_capos" drop constraint "ship_capos_ship_id_fkey";

alter table "public"."ship_managers" drop constraint "ship_managers_manager_id_fkey";

alter table "public"."ship_managers" drop constraint "ship_managers_ship_id_fkey";

alter table "public"."ship_operators" drop constraint "ship_operators_created_by_fkey";

alter table "public"."ship_operators" drop constraint "ship_operators_operator_id_fkey";

alter table "public"."ship_operators" drop constraint "ship_operators_ship_id_fkey";

drop function if exists "public"."recompute_operator_kpi_snapshot"(p_operator_id uuid, p_period kpi_period, p_ref_date date, p_year_iso integer, p_week_iso integer, p_actor uuid);

drop view if exists "public"."admin_capo_manager_v1";

drop view if exists "public"."admin_manager_perimeter_v1";

drop view if exists "public"."admin_planning_overview_v1";

drop view if exists "public"."admin_ship_capos_v1";

drop view if exists "public"."archive_rapportino_inca_cavi_v1";

drop view if exists "public"."archive_rapportino_rows_v1";

drop view if exists "public"."capo_my_team_v1";

drop view if exists "public"."capo_my_team_v2";

drop view if exists "public"."catalogo_ship_commessa_attivita_public_v1";

drop view if exists "public"."direzione_operator_daily_v3";

drop view if exists "public"."direzione_operator_facts_v2";

drop view if exists "public"."direzione_operator_kpi_day_v1";

drop view if exists "public"."direzione_operator_kpi_day_v2";

drop view if exists "public"."direzione_operator_kpi_day_v3";

drop view if exists "public"."direzione_operator_kpi_day_v4_manager_safe";

drop view if exists "public"."direzione_operator_kpi_month_v1";

drop view if exists "public"."direzione_operator_kpi_month_v2";

drop view if exists "public"."direzione_operator_kpi_month_v3";

drop view if exists "public"."direzione_operator_kpi_week_v1";

drop view if exists "public"."direzione_operator_kpi_week_v2";

drop view if exists "public"."direzione_operator_kpi_week_v3";

drop view if exists "public"."direzione_operator_kpi_year_v1";

drop view if exists "public"."direzione_operator_kpi_year_v2";

drop view if exists "public"."direzione_operator_kpi_year_v3";

drop view if exists "public"."inca_cavi_with_data_posa_v1";

drop view if exists "public"."inca_cavi_with_last_posa_and_capo_v1";

drop view if exists "public"."inca_cavi_with_last_posa_v1";

drop view if exists "public"."inca_cavi_with_last_rapportino_v1";

drop view if exists "public"."inca_diff_last_import_v1";

drop view if exists "public"."inca_export_ufficio_v1";

drop view if exists "public"."kpi_operator_daily_v1";

drop view if exists "public"."kpi_operator_day_v1";

drop view if exists "public"."kpi_operator_family_day_v2";

drop view if exists "public"."kpi_operator_family_day_v3_capo_safe";

drop view if exists "public"."kpi_operator_family_day_v3_manager_safe";

drop view if exists "public"."kpi_operator_global_day_v2";

drop view if exists "public"."kpi_operator_global_day_v3_capo_safe";

drop view if exists "public"."kpi_operator_global_day_v3_manager_safe";

drop view if exists "public"."manager_my_capi_v1";

drop view if exists "public"."rapportini_with_capo_v1";

drop view if exists "public"."ufficio_rapportini_list_v1";

drop view if exists "public"."direzione_operator_facts_v4";

drop view if exists "public"."direzione_operator_kpi_day_v3_manager_safe";

drop view if exists "public"."kpi_operator_family_day_v3";

drop view if exists "public"."kpi_operator_global_day_v3";

drop view if exists "public"."kpi_operator_line_previsto_v2";

drop view if exists "public"."direzione_operator_facts_v1";

drop view if exists "public"."direzione_operator_facts_v3";

drop index if exists "public"."manager_plans_unique_day";

drop index if exists "public"."manager_plans_unique_week";

drop index if exists "public"."rapportino_inca_cavi_ripresa_unique_by_codice";

drop index if exists "public"."uniq_ripresa_per_cavo";

alter table "archive"."rapportini" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."catalogo_attivita" alter column "activity_type" set data type public.activity_type using "activity_type"::text::public.activity_type;

alter table "public"."catalogo_attivita" alter column "unit" set default 'NONE'::public.activity_unit;

alter table "public"."catalogo_attivita" alter column "unit" set data type public.activity_unit using "unit"::text::public.activity_unit;

alter table "public"."catalogo_ship_commessa_attivita" alter column "unit_override" set data type public.activity_unit using "unit_override"::text::public.activity_unit;

alter table "public"."core_files" alter column "categoria" set data type public.doc_categoria using "categoria"::text::public.doc_categoria;

alter table "public"."core_files" alter column "origine" set default 'SYSTEM'::public.doc_origine;

alter table "public"."core_files" alter column "origine" set data type public.doc_origine using "origine"::text::public.doc_origine;

alter table "public"."core_files" alter column "stato_doc" set default 'BOZZA'::public.doc_stato;

alter table "public"."core_files" alter column "stato_doc" set data type public.doc_stato using "stato_doc"::text::public.doc_stato;

alter table "public"."manager_plans" alter column "period_type" set data type public.plan_period_type using "period_type"::text::public.plan_period_type;

alter table "public"."manager_plans" alter column "status" set default 'DRAFT'::public.plan_status;

alter table "public"."manager_plans" alter column "status" set data type public.plan_status using "status"::text::public.plan_status;

alter table "public"."models" alter column "id" set default nextval('public.models_id_seq'::regclass);

alter table "public"."operator_kpi_facts" alter column "period" set data type public.kpi_period using "period"::text::public.kpi_period;

alter table "public"."operator_kpi_snapshots" alter column "period" set data type public.kpi_period using "period"::text::public.kpi_period;

alter table "public"."percorso_lots" alter column "status" set default 'PROPOSTO'::public.percorso_lot_status;

alter table "public"."percorso_lots" alter column "status" set data type public.percorso_lot_status using "status"::text::public.percorso_lot_status;

alter table "public"."percorso_lots" alter column "sviluppo_by" set data type public.percorso_sviluppo_by using "sviluppo_by"::text::public.percorso_sviluppo_by;

alter table "public"."profiles" alter column "role" set default 'CAPO'::public.app_role;

alter table "public"."profiles" alter column "role" set data type public.app_role using "role"::text::public.app_role;

alter table "public"."rapportini" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."rapportino_inca_cavi" alter column "step_type" set default 'POSA'::public.cavo_step_type;

alter table "public"."rapportino_inca_cavi" alter column "step_type" set data type public.cavo_step_type using "step_type"::text::public.cavo_step_type;

alter table "public"."rapportino_rows" add column "position" integer;

CREATE INDEX rapportino_rows_rapportino_id_position_idx ON public.rapportino_rows USING btree (rapportino_id, "position");

CREATE UNIQUE INDEX manager_plans_unique_day ON public.manager_plans USING btree (manager_id, plan_date) WHERE (period_type = 'DAY'::public.plan_period_type);

CREATE UNIQUE INDEX manager_plans_unique_week ON public.manager_plans USING btree (manager_id, year_iso, week_iso) WHERE (period_type = 'WEEK'::public.plan_period_type);

CREATE UNIQUE INDEX rapportino_inca_cavi_ripresa_unique_by_codice ON public.rapportino_inca_cavi USING btree (costr_cache, commessa_cache, codice_cache) WHERE (step_type = 'RIPRESA'::public.cavo_step_type);

CREATE UNIQUE INDEX uniq_ripresa_per_cavo ON public.rapportino_inca_cavi USING btree (costr_cache, codice_cache) WHERE (step_type = 'RIPRESA'::public.cavo_step_type);

alter table "archive"."rapportino_cavi" add constraint "rapportino_cavi_inca_cavo_id_fkey" FOREIGN KEY (inca_cavo_id) REFERENCES public.inca_cavi(id) ON DELETE SET NULL not valid;

alter table "archive"."rapportino_cavi" validate constraint "rapportino_cavi_inca_cavo_id_fkey";

alter table "public"."capo_ship_assignments" add constraint "capo_ship_assignments_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."capo_ship_assignments" validate constraint "capo_ship_assignments_capo_id_fkey";

alter table "public"."capo_ship_assignments" add constraint "capo_ship_assignments_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_ship_assignments" validate constraint "capo_ship_assignments_manager_id_fkey";

alter table "public"."capo_ship_assignments" add constraint "capo_ship_assignments_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_ship_assignments" validate constraint "capo_ship_assignments_ship_id_fkey";

alter table "public"."capo_ship_attendance" add constraint "capo_ship_attendance_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."capo_ship_attendance" validate constraint "capo_ship_attendance_capo_id_fkey";

alter table "public"."capo_ship_attendance" add constraint "capo_ship_attendance_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_ship_attendance" validate constraint "capo_ship_attendance_ship_id_fkey";

alter table "public"."capo_ship_expected_operators" add constraint "capo_ship_expected_operators_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."capo_ship_expected_operators" validate constraint "capo_ship_expected_operators_capo_id_fkey";

alter table "public"."capo_ship_expected_operators" add constraint "capo_ship_expected_operators_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_ship_expected_operators" validate constraint "capo_ship_expected_operators_manager_id_fkey";

alter table "public"."capo_ship_expected_operators" add constraint "capo_ship_expected_operators_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_ship_expected_operators" validate constraint "capo_ship_expected_operators_operator_id_fkey";

alter table "public"."capo_ship_expected_operators" add constraint "capo_ship_expected_operators_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_ship_expected_operators" validate constraint "capo_ship_expected_operators_ship_id_fkey";

alter table "public"."catalogo_ship_commessa_attivita" add constraint "catalogo_ship_commessa_attivita_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES public.catalogo_attivita(id) ON DELETE RESTRICT not valid;

alter table "public"."catalogo_ship_commessa_attivita" validate constraint "catalogo_ship_commessa_attivita_activity_id_fkey";

alter table "public"."catalogo_ship_commessa_attivita" add constraint "catalogo_ship_commessa_attivita_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."catalogo_ship_commessa_attivita" validate constraint "catalogo_ship_commessa_attivita_created_by_fkey";

alter table "public"."catalogo_ship_commessa_attivita" add constraint "catalogo_ship_commessa_attivita_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."catalogo_ship_commessa_attivita" validate constraint "catalogo_ship_commessa_attivita_ship_id_fkey";

alter table "public"."core_drive_events" add constraint "core_drive_events_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.core_files(id) ON DELETE RESTRICT not valid;

alter table "public"."core_drive_events" validate constraint "core_drive_events_file_id_fkey";

alter table "public"."core_drive_events" add constraint "core_drive_events_prev_event_id_fkey" FOREIGN KEY (prev_event_id) REFERENCES public.core_drive_events(id) ON DELETE SET NULL not valid;

alter table "public"."core_drive_events" validate constraint "core_drive_events_prev_event_id_fkey";

alter table "public"."core_file_audit" add constraint "core_file_audit_core_file_id_fkey" FOREIGN KEY (core_file_id) REFERENCES public.core_files(id) ON DELETE CASCADE not valid;

alter table "public"."core_file_audit" validate constraint "core_file_audit_core_file_id_fkey";

alter table "public"."core_file_audit" add constraint "core_file_audit_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."core_file_audit" validate constraint "core_file_audit_performed_by_fkey";

alter table "public"."core_files" add constraint "core_files_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."core_files" validate constraint "core_files_created_by_fkey";

alter table "public"."core_files" add constraint "core_files_inca_cavo_id_fkey" FOREIGN KEY (inca_cavo_id) REFERENCES public.inca_cavi(id) ON DELETE SET NULL not valid;

alter table "public"."core_files" validate constraint "core_files_inca_cavo_id_fkey";

alter table "public"."core_files" add constraint "core_files_inca_file_id_fkey" FOREIGN KEY (inca_file_id) REFERENCES public.inca_files(id) ON DELETE SET NULL not valid;

alter table "public"."core_files" validate constraint "core_files_inca_file_id_fkey";

alter table "public"."core_files" add constraint "core_files_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE SET NULL not valid;

alter table "public"."core_files" validate constraint "core_files_operator_id_fkey";

alter table "public"."core_files" add constraint "core_files_rapportino_id_fkey" FOREIGN KEY (rapportino_id) REFERENCES public.rapportini(id) ON DELETE SET NULL not valid;

alter table "public"."core_files" validate constraint "core_files_rapportino_id_fkey";

alter table "public"."core_files" add constraint "core_files_version_of_fkey" FOREIGN KEY (version_of) REFERENCES public.core_files(id) ON DELETE SET NULL not valid;

alter table "public"."core_files" validate constraint "core_files_version_of_fkey";

alter table "public"."core_meta" add constraint "core_meta_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."core_meta" validate constraint "core_meta_updated_by_fkey";

alter table "public"."impianti" add constraint "impianti_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."impianti" validate constraint "impianti_ship_id_fkey";

alter table "public"."impianto_capi" add constraint "impianto_capi_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."impianto_capi" validate constraint "impianto_capi_capo_id_fkey";

alter table "public"."impianto_capi" add constraint "impianto_capi_impianto_id_fkey" FOREIGN KEY (impianto_id) REFERENCES public.impianti(id) ON DELETE CASCADE not valid;

alter table "public"."impianto_capi" validate constraint "impianto_capi_impianto_id_fkey";

alter table "public"."inca_cavi" add constraint "inca_cavi_from_file_id_fkey" FOREIGN KEY (from_file_id) REFERENCES public.inca_files(id) not valid;

alter table "public"."inca_cavi" validate constraint "inca_cavi_from_file_id_fkey";

alter table "public"."inca_cavi" add constraint "inca_cavi_inca_file_id_fkey" FOREIGN KEY (inca_file_id) REFERENCES public.inca_files(id) ON DELETE SET NULL not valid;

alter table "public"."inca_cavi" validate constraint "inca_cavi_inca_file_id_fkey";

alter table "public"."inca_files" add constraint "inca_files_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE SET NULL not valid;

alter table "public"."inca_files" validate constraint "inca_files_ship_id_fkey";

alter table "public"."inca_files" add constraint "inca_files_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."inca_files" validate constraint "inca_files_uploaded_by_fkey";

alter table "public"."inca_percorsi" add constraint "inca_percorsi_cavo_id_fkey" FOREIGN KEY (inca_cavo_id) REFERENCES public.inca_cavi(id) ON DELETE CASCADE not valid;

alter table "public"."inca_percorsi" validate constraint "inca_percorsi_cavo_id_fkey";

alter table "public"."manager_capo_assignments" add constraint "manager_capo_assignments_capo_fk" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."manager_capo_assignments" validate constraint "manager_capo_assignments_capo_fk";

alter table "public"."manager_capo_assignments" add constraint "manager_capo_assignments_manager_fk" FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."manager_capo_assignments" validate constraint "manager_capo_assignments_manager_fk";

alter table "public"."manager_capo_scope" add constraint "manager_capo_scope_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."manager_capo_scope" validate constraint "manager_capo_scope_capo_id_fkey";

alter table "public"."manager_capo_scope" add constraint "manager_capo_scope_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."manager_capo_scope" validate constraint "manager_capo_scope_created_by_fkey";

alter table "public"."manager_capo_scope" add constraint "manager_capo_scope_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."manager_capo_scope" validate constraint "manager_capo_scope_manager_id_fkey";

alter table "public"."manager_plans" add constraint "manager_plans_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."manager_plans" validate constraint "manager_plans_created_by_fkey";

alter table "public"."manager_plans" add constraint "manager_plans_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."manager_plans" validate constraint "manager_plans_manager_id_fkey";

alter table "public"."navemaster_imports" add constraint "navemaster_imports_imported_by_fkey" FOREIGN KEY (imported_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."navemaster_imports" validate constraint "navemaster_imports_imported_by_fkey";

alter table "public"."navemaster_imports" add constraint "navemaster_imports_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."navemaster_imports" validate constraint "navemaster_imports_ship_id_fkey";

alter table "public"."navemaster_inca_alerts" add constraint "navemaster_inca_alerts_inca_file_id_fkey" FOREIGN KEY (inca_file_id) REFERENCES public.inca_files(id) ON DELETE CASCADE not valid;

alter table "public"."navemaster_inca_alerts" validate constraint "navemaster_inca_alerts_inca_file_id_fkey";

alter table "public"."navemaster_inca_alerts" add constraint "navemaster_inca_alerts_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."navemaster_inca_alerts" validate constraint "navemaster_inca_alerts_ship_id_fkey";

alter table "public"."navemaster_inca_diff" add constraint "navemaster_inca_diff_inca_file_id_fkey" FOREIGN KEY (inca_file_id) REFERENCES public.inca_files(id) ON DELETE CASCADE not valid;

alter table "public"."navemaster_inca_diff" validate constraint "navemaster_inca_diff_inca_file_id_fkey";

alter table "public"."navemaster_inca_diff" add constraint "navemaster_inca_diff_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."navemaster_inca_diff" validate constraint "navemaster_inca_diff_ship_id_fkey";

alter table "public"."navemaster_rows" add constraint "navemaster_rows_navemaster_import_id_fkey" FOREIGN KEY (navemaster_import_id) REFERENCES public.navemaster_imports(id) ON DELETE CASCADE not valid;

alter table "public"."navemaster_rows" validate constraint "navemaster_rows_navemaster_import_id_fkey";

alter table "public"."objectives" add constraint "objectives_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."objectives" validate constraint "objectives_created_by_fkey";

alter table "public"."operator_kpi_facts" add constraint "operator_kpi_facts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."operator_kpi_facts" validate constraint "operator_kpi_facts_created_by_fkey";

alter table "public"."operator_kpi_facts" add constraint "operator_kpi_facts_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE RESTRICT not valid;

alter table "public"."operator_kpi_facts" validate constraint "operator_kpi_facts_operator_id_fkey";

alter table "public"."operator_kpi_facts" add constraint "operator_kpi_facts_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.manager_plans(id) ON DELETE SET NULL not valid;

alter table "public"."operator_kpi_facts" validate constraint "operator_kpi_facts_plan_id_fkey";

alter table "public"."operator_kpi_facts" add constraint "operator_kpi_facts_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES public.plan_capo_slots(id) ON DELETE SET NULL not valid;

alter table "public"."operator_kpi_facts" validate constraint "operator_kpi_facts_slot_id_fkey";

alter table "public"."operator_kpi_snapshots" add constraint "operator_kpi_snapshots_computed_by_fkey" FOREIGN KEY (computed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."operator_kpi_snapshots" validate constraint "operator_kpi_snapshots_computed_by_fkey";

alter table "public"."operator_kpi_snapshots" add constraint "operator_kpi_snapshots_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE RESTRICT not valid;

alter table "public"."operator_kpi_snapshots" validate constraint "operator_kpi_snapshots_operator_id_fkey";

alter table "public"."operator_ship_attendance" add constraint "operator_ship_attendance_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE RESTRICT not valid;

alter table "public"."operator_ship_attendance" validate constraint "operator_ship_attendance_operator_id_fkey";

alter table "public"."operator_ship_attendance" add constraint "operator_ship_attendance_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE RESTRICT not valid;

alter table "public"."operator_ship_attendance" validate constraint "operator_ship_attendance_ship_id_fkey";

alter table "public"."operators" add constraint "operators_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."operators" validate constraint "operators_created_by_fkey";

alter table "public"."patterns" add constraint "patterns_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."patterns" validate constraint "patterns_capo_id_fkey";

alter table "public"."percorso_cable_segments" add constraint "percorso_cable_segments_cable_id_fkey" FOREIGN KEY (cable_id) REFERENCES public.percorso_cables(id) ON DELETE CASCADE not valid;

alter table "public"."percorso_cable_segments" validate constraint "percorso_cable_segments_cable_id_fkey";

alter table "public"."percorso_cables" add constraint "percorso_cables_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.percorso_documents(id) ON DELETE CASCADE not valid;

alter table "public"."percorso_cables" validate constraint "percorso_cables_document_id_fkey";

alter table "public"."percorso_documents" add constraint "percorso_documents_inca_file_id_fkey" FOREIGN KEY (inca_file_id) REFERENCES public.inca_files(id) ON DELETE SET NULL not valid;

alter table "public"."percorso_documents" validate constraint "percorso_documents_inca_file_id_fkey";

alter table "public"."percorso_lot_cables" add constraint "percorso_lot_cables_cable_id_fkey" FOREIGN KEY (cable_id) REFERENCES public.percorso_cables(id) ON DELETE CASCADE not valid;

alter table "public"."percorso_lot_cables" validate constraint "percorso_lot_cables_cable_id_fkey";

alter table "public"."percorso_lot_cables" add constraint "percorso_lot_cables_lot_id_fkey" FOREIGN KEY (lot_id) REFERENCES public.percorso_lots(id) ON DELETE CASCADE not valid;

alter table "public"."percorso_lot_cables" validate constraint "percorso_lot_cables_lot_id_fkey";

alter table "public"."percorso_lot_segments" add constraint "percorso_lot_segments_lot_id_fkey" FOREIGN KEY (lot_id) REFERENCES public.percorso_lots(id) ON DELETE CASCADE not valid;

alter table "public"."percorso_lot_segments" validate constraint "percorso_lot_segments_lot_id_fkey";

alter table "public"."percorso_lot_validations" add constraint "percorso_lot_validations_lot_id_fkey" FOREIGN KEY (lot_id) REFERENCES public.percorso_lots(id) ON DELETE CASCADE not valid;

alter table "public"."percorso_lot_validations" validate constraint "percorso_lot_validations_lot_id_fkey";

alter table "public"."percorso_lots" add constraint "percorso_lots_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.percorso_documents(id) ON DELETE CASCADE not valid;

alter table "public"."percorso_lots" validate constraint "percorso_lots_document_id_fkey";

alter table "public"."plan_capo_slots" add constraint "plan_capo_slots_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."plan_capo_slots" validate constraint "plan_capo_slots_capo_id_fkey";

alter table "public"."plan_capo_slots" add constraint "plan_capo_slots_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."plan_capo_slots" validate constraint "plan_capo_slots_created_by_fkey";

alter table "public"."plan_capo_slots" add constraint "plan_capo_slots_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.manager_plans(id) ON DELETE CASCADE not valid;

alter table "public"."plan_capo_slots" validate constraint "plan_capo_slots_plan_id_fkey";

alter table "public"."plan_slot_members" add constraint "plan_slot_members_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."plan_slot_members" validate constraint "plan_slot_members_created_by_fkey";

alter table "public"."plan_slot_members" add constraint "plan_slot_members_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE RESTRICT not valid;

alter table "public"."plan_slot_members" validate constraint "plan_slot_members_operator_id_fkey";

alter table "public"."plan_slot_members" add constraint "plan_slot_members_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES public.plan_capo_slots(id) ON DELETE CASCADE not valid;

alter table "public"."plan_slot_members" validate constraint "plan_slot_members_slot_id_fkey";

alter table "public"."planning_audit" add constraint "planning_audit_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public.profiles(id) not valid;

alter table "public"."planning_audit" validate constraint "planning_audit_actor_id_fkey";

alter table "public"."planning_audit" add constraint "planning_audit_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.manager_plans(id) ON DELETE CASCADE not valid;

alter table "public"."planning_audit" validate constraint "planning_audit_plan_id_fkey";

alter table "public"."rapportino_cavi" add constraint "rapportino_cavi_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."rapportino_cavi" validate constraint "rapportino_cavi_created_by_fkey";

alter table "public"."rapportino_cavi" add constraint "rapportino_cavi_inca_cavo_id_fkey" FOREIGN KEY (inca_cavo_id) REFERENCES public.inca_cavi(id) ON DELETE CASCADE not valid;

alter table "public"."rapportino_cavi" validate constraint "rapportino_cavi_inca_cavo_id_fkey";

alter table "public"."rapportino_cavi" add constraint "rapportino_cavi_rapportino_id_fkey" FOREIGN KEY (rapportino_id) REFERENCES public.rapportini(id) ON DELETE CASCADE not valid;

alter table "public"."rapportino_cavi" validate constraint "rapportino_cavi_rapportino_id_fkey";

alter table "public"."rapportino_inca_cavi" add constraint "rapportino_inca_cavi_inca_cavo_id_fkey" FOREIGN KEY (inca_cavo_id) REFERENCES public.inca_cavi(id) ON DELETE RESTRICT not valid;

alter table "public"."rapportino_inca_cavi" validate constraint "rapportino_inca_cavi_inca_cavo_id_fkey";

alter table "public"."rapportino_inca_cavi" add constraint "rapportino_inca_cavi_posa_allowed_values" CHECK (((step_type <> 'POSA'::public.cavo_step_type) OR (progress_percent IS NULL) OR (progress_percent = ANY (ARRAY[(50)::numeric, (70)::numeric, (100)::numeric])))) not valid;

alter table "public"."rapportino_inca_cavi" validate constraint "rapportino_inca_cavi_posa_allowed_values";

alter table "public"."rapportino_inca_cavi" add constraint "rapportino_inca_cavi_rapportino_id_fkey" FOREIGN KEY (rapportino_id) REFERENCES public.rapportini(id) ON DELETE CASCADE not valid;

alter table "public"."rapportino_inca_cavi" validate constraint "rapportino_inca_cavi_rapportino_id_fkey";

alter table "public"."rapportino_inca_cavi" add constraint "rapportino_inca_cavi_ripresa_must_be_100" CHECK (((step_type <> 'RIPRESA'::public.cavo_step_type) OR (progress_percent = (100)::numeric))) not valid;

alter table "public"."rapportino_inca_cavi" validate constraint "rapportino_inca_cavi_ripresa_must_be_100";

alter table "public"."rapportino_inca_cavi" add constraint "rapportino_inca_ripresa_100_check" CHECK (((step_type <> 'RIPRESA'::public.cavo_step_type) OR (progress_percent = (100)::numeric))) not valid;

alter table "public"."rapportino_inca_cavi" validate constraint "rapportino_inca_ripresa_100_check";

alter table "public"."rapportino_inca_cavi" add constraint "rapportino_inca_step_check" CHECK ((step_type = ANY (ARRAY['POSA'::public.cavo_step_type, 'RIPRESA'::public.cavo_step_type]))) not valid;

alter table "public"."rapportino_inca_cavi" validate constraint "rapportino_inca_step_check";

alter table "public"."rapportino_row_operators" add constraint "rapportino_row_operators_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE RESTRICT not valid;

alter table "public"."rapportino_row_operators" validate constraint "rapportino_row_operators_operator_id_fkey";

alter table "public"."rapportino_row_operators" add constraint "rapportino_row_operators_rapportino_row_id_fkey" FOREIGN KEY (rapportino_row_id) REFERENCES public.rapportino_rows(id) ON DELETE CASCADE not valid;

alter table "public"."rapportino_row_operators" validate constraint "rapportino_row_operators_rapportino_row_id_fkey";

alter table "public"."rapportino_rows" add constraint "rapportino_rows_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES public.catalogo_attivita(id) ON DELETE SET NULL not valid;

alter table "public"."rapportino_rows" validate constraint "rapportino_rows_activity_id_fkey";

alter table "public"."rapportino_rows" add constraint "rapportino_rows_rapportino_id_fkey" FOREIGN KEY (rapportino_id) REFERENCES public.rapportini(id) ON DELETE CASCADE not valid;

alter table "public"."rapportino_rows" validate constraint "rapportino_rows_rapportino_id_fkey";

alter table "public"."ship_capos" add constraint "ship_capos_capo_id_fkey" FOREIGN KEY (capo_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ship_capos" validate constraint "ship_capos_capo_id_fkey";

alter table "public"."ship_capos" add constraint "ship_capos_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."ship_capos" validate constraint "ship_capos_created_by_fkey";

alter table "public"."ship_capos" add constraint "ship_capos_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."ship_capos" validate constraint "ship_capos_ship_id_fkey";

alter table "public"."ship_managers" add constraint "ship_managers_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ship_managers" validate constraint "ship_managers_manager_id_fkey";

alter table "public"."ship_managers" add constraint "ship_managers_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."ship_managers" validate constraint "ship_managers_ship_id_fkey";

alter table "public"."ship_operators" add constraint "ship_operators_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."ship_operators" validate constraint "ship_operators_created_by_fkey";

alter table "public"."ship_operators" add constraint "ship_operators_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE not valid;

alter table "public"."ship_operators" validate constraint "ship_operators_operator_id_fkey";

alter table "public"."ship_operators" add constraint "ship_operators_ship_id_fkey" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE CASCADE not valid;

alter table "public"."ship_operators" validate constraint "ship_operators_ship_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.guard_profiles_capo_ui_mode_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manager_my_capi_ui_modes_v1()
 RETURNS TABLE(capo_id uuid, display_name text, email text, capo_ui_mode text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manager_set_capo_ui_mode_v1(p_capo_id uuid, p_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.recompute_operator_kpi_snapshot(p_operator_id uuid, p_period public.kpi_period, p_ref_date date, p_year_iso integer, p_week_iso integer, p_actor uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_hours_worked numeric(10,2);
  v_hours_theo numeric(10,2);
  v_meters numeric(14,2);
  v_defects int;
  v_rework int;
  v_productivity numeric(6,2);
  v_quality numeric(6,2);
  v_rework_rate numeric(6,2);
begin
  select
    coalesce(sum(hours_worked),0),
    coalesce(sum(hours_theoretical),0),
    coalesce(sum(meters_installed),0),
    coalesce(sum(defects_count),0)::int,
    coalesce(sum(rework_count),0)::int
  into v_hours_worked, v_hours_theo, v_meters, v_defects, v_rework
  from public.operator_kpi_facts f
  where f.operator_id = p_operator_id
    and f.period = p_period
    and (
      (p_period = 'DAY' and f.ref_date = p_ref_date)
      or
      (p_period = 'WEEK' and f.year_iso = p_year_iso and f.week_iso = p_week_iso)
    );

  v_productivity := case
    when v_hours_theo <= 0 then 0
    else round((v_hours_worked / v_hours_theo) * 100.0, 2)
  end;

  v_quality := greatest(0, round(100.0 - (v_defects * 2.0) - (v_rework * 1.0), 2));

  v_rework_rate := case
    when v_hours_worked <= 0 then 0
    else round((v_rework::numeric / v_hours_worked) * 100.0, 2)
  end;

  insert into public.operator_kpi_snapshots (
    operator_id, period, ref_date, year_iso, week_iso,
    productivity_pct, quality_score, rework_rate_pct,
    total_hours_worked, total_hours_theoretical, total_meters_installed,
    total_defects, total_rework,
    computed_at, computed_by
  )
  values (
    p_operator_id, p_period, p_ref_date, p_year_iso, p_week_iso,
    v_productivity, v_quality, v_rework_rate,
    v_hours_worked, v_hours_theo, v_meters,
    v_defects, v_rework,
    now(), p_actor
  )
  on conflict (operator_id, period, ref_date, year_iso, week_iso)
  do update set
    productivity_pct = excluded.productivity_pct,
    quality_score = excluded.quality_score,
    rework_rate_pct = excluded.rework_rate_pct,
    total_hours_worked = excluded.total_hours_worked,
    total_hours_theoretical = excluded.total_hours_theoretical,
    total_meters_installed = excluded.total_meters_installed,
    total_defects = excluded.total_defects,
    total_rework = excluded.total_rework,
    computed_at = excluded.computed_at,
    computed_by = excluded.computed_by;

end;
$function$
;

create or replace view "public"."admin_capo_manager_v1" as  SELECT c.id AS capo_id,
    c.email AS capo_email,
    c.display_name AS capo_display_name,
    a.manager_id,
    m.email AS manager_email,
    m.display_name AS manager_display_name,
    a.active,
    a.created_at,
    a.created_by
   FROM ((public.profiles c
     LEFT JOIN public.manager_capo_assignments a ON ((a.capo_id = c.id)))
     LEFT JOIN public.profiles m ON ((m.id = a.manager_id)))
  WHERE (c.app_role = 'CAPO'::text);


create or replace view "public"."admin_manager_perimeter_v1" as  SELECT sm.manager_id,
    p.email AS manager_email,
    sm.ship_id,
    s.code AS ship_code,
    s.name AS ship_name,
    sm.created_at
   FROM ((public.ship_managers sm
     JOIN public.profiles p ON ((p.id = sm.manager_id)))
     JOIN public.ships s ON ((s.id = sm.ship_id)));


create or replace view "public"."admin_planning_overview_v1" as  SELECT p.id AS plan_id,
    p.manager_id,
    p.period_type,
    p.plan_date,
    p.year_iso,
    p.week_iso,
    p.status,
    p.created_at,
    p.updated_at,
    s.id AS slot_id,
    s.capo_id,
    s."position" AS capo_position,
    m.operator_id,
    m."position" AS operator_position
   FROM ((public.manager_plans p
     JOIN public.plan_capo_slots s ON ((s.plan_id = p.id)))
     LEFT JOIN public.plan_slot_members m ON ((m.slot_id = s.id)));


create or replace view "public"."admin_ship_capos_v1" as  SELECT sc.ship_id,
    s.code AS ship_code,
    s.name AS ship_name,
    sc.capo_id,
    p.email AS capo_email,
    p.display_name AS capo_name,
    sc.created_at
   FROM ((public.ship_capos sc
     JOIN public.ships s ON ((s.id = sc.ship_id)))
     JOIN public.profiles p ON ((p.id = sc.capo_id)));


create or replace view "public"."admin_ship_operators_v1" as  SELECT so.ship_id,
    s.code AS ship_code,
    s.name AS ship_name,
    so.operator_id,
    o.name AS operator_name,
    o.roles AS operator_roles,
    so.active,
    so.created_at,
    so.created_by
   FROM ((public.ship_operators so
     JOIN public.ships s ON ((s.id = so.ship_id)))
     JOIN public.operators o ON ((o.id = so.operator_id)));


create or replace view "public"."archive_rapportino_inca_cavi_v1" as  SELECT ric.id AS link_id,
    ric.rapportino_id,
    r.status,
    r.report_date,
    r.costr,
    r.commessa,
    ric.step_type,
    ric.progress_percent,
    ric.metri_posati,
    ric.posa_date,
    ric.note,
    ric.codice_cache,
    ric.costr_cache,
    ric.commessa_cache,
    ric.report_date_cache,
    ric.inca_cavo_id,
    c.inca_file_id,
    c.codice,
    c.descrizione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.metri_teo,
    c.metri_dis,
    c.situazione,
    c.marca_cavo
   FROM ((public.rapportino_inca_cavi ric
     JOIN public.rapportini r ON ((r.id = ric.rapportino_id)))
     LEFT JOIN public.inca_cavi c ON ((c.id = ric.inca_cavo_id)));


create or replace view "public"."archive_rapportino_rows_v1" as  SELECT r.id,
    r.rapportino_id,
    r.row_index,
    r.categoria,
    r.descrizione,
    r.operatori,
    r.tempo,
    r.previsto,
    r.prodotto,
    r.note,
    r.created_at,
    r.updated_at,
    r.activity_id,
    a.activity_type,
    a.unit,
    a.previsto_value AS previsto_catalog_value,
    a.is_active AS catalog_is_active
   FROM (public.rapportino_rows r
     LEFT JOIN public.catalogo_attivita a ON ((a.id = r.activity_id)));


create or replace view "public"."capo_expected_operators_today_v1" as  SELECT e.plan_date,
    e.ship_id,
    e.operator_id,
    COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, o.nome, o.cognome)), ''::text), NULLIF(TRIM(BOTH FROM o.name), ''::text), o.operator_code) AS operator_name,
    o.operator_code
   FROM (public.capo_ship_expected_operators e
     JOIN public.operators o ON ((o.id = e.operator_id)))
  WHERE (e.capo_id = auth.uid());


create or replace view "public"."capo_my_team_v1" as  SELECT m.operator_id,
    s.capo_id,
    p.id AS plan_id,
    o.name AS operator_name,
    m."position" AS operator_position,
    s.id AS slot_id
   FROM (((public.manager_plans p
     JOIN public.plan_capo_slots s ON ((s.plan_id = p.id)))
     JOIN public.plan_slot_members m ON ((m.slot_id = s.id)))
     JOIN public.operators o ON ((o.id = m.operator_id)))
  WHERE ((p.period_type = 'DAY'::public.plan_period_type) AND (p.plan_date = CURRENT_DATE) AND (p.status = ANY (ARRAY['PUBLISHED'::public.plan_status, 'FROZEN'::public.plan_status])) AND (s.capo_id = auth.uid()));


create or replace view "public"."capo_returned_inbox_v1" as  SELECT id,
    capo_id,
    crew_role,
    report_date,
    costr,
    commessa,
    updated_at
   FROM public.rapportini
  WHERE (status = 'RETURNED'::text);


create or replace view "public"."capo_today_ship_assignments_v1" as  SELECT CURRENT_DATE AS plan_date,
    sc.ship_id,
    s.costr,
    s.commessa,
    s.code AS ship_code,
    s.name AS ship_name,
    (row_number() OVER (PARTITION BY sc.capo_id ORDER BY sc.created_at, sc.ship_id))::smallint AS "position"
   FROM (public.ship_capos sc
     JOIN public.ships s ON ((s.id = sc.ship_id)))
  WHERE (sc.capo_id = auth.uid());


create or replace view "public"."catalogo_ship_commessa_attivita_public_v1" as  SELECT csca.id AS catalogo_item_id,
    csca.ship_id,
    s.code AS ship_code,
    s.name AS ship_name,
    csca.commessa,
    csca.activity_id,
    ca.categoria,
    ca.descrizione,
    ca.activity_type,
    ca.unit AS unit_default,
    csca.unit_override,
    COALESCE(csca.unit_override, ca.unit) AS unit_effective,
    csca.previsto_value,
    csca.is_active,
    csca.note,
    csca.created_at,
    csca.updated_at
   FROM ((public.catalogo_ship_commessa_attivita csca
     JOIN public.catalogo_attivita ca ON ((ca.id = csca.activity_id)))
     JOIN public.ships s ON ((s.id = csca.ship_id)));


CREATE OR REPLACE FUNCTION public.core_current_profile()
 RETURNS public.core_current_profile_type
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select coalesce(
    (
      select (p.id, p.app_role, p.allowed_cantieri)::public.core_current_profile_type
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    (
      select (auth.uid(), null::text, array[]::text[])::public.core_current_profile_type
    )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.current_profile()
 RETURNS public.profiles
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.*
  from public.profiles p
  where p.id = auth.uid();
$function$
;

create or replace view "public"."direzione_inca_teorico" as  WITH base AS (
         SELECT f.id AS inca_file_id,
            f.file_name AS nome_file,
            f.uploaded_at AS caricato_il,
            f.costr,
            f.commessa,
            c.id AS cavo_id,
            c.codice AS codice_cavo,
            c.situazione,
            (NULLIF(TRIM(BOTH FROM (c.metri_teo)::text), ''::text))::numeric AS metri_teo_n,
            (NULLIF(TRIM(BOTH FROM (c.metri_dis)::text), ''::text))::numeric AS metri_dis_n
           FROM (public.inca_files f
             JOIN public.inca_cavi c ON ((c.inca_file_id = f.id)))
        ), agg AS (
         SELECT base.inca_file_id,
            base.nome_file,
            base.caricato_il,
            base.costr,
            base.commessa,
            (COALESCE(sum(base.metri_teo_n), (0)::numeric))::numeric(14,2) AS metri_previsti_totali,
            (COALESCE(sum(base.metri_dis_n), (0)::numeric))::numeric(14,2) AS metri_realizzati,
            (COALESCE(sum(
                CASE
                    WHEN (base.situazione = 'P'::text) THEN base.metri_dis_n
                    ELSE (0)::numeric
                END), (0)::numeric))::numeric(14,2) AS metri_posati,
            (count(*))::integer AS cavi_totali,
            (count(*) FILTER (WHERE (base.metri_teo_n IS NOT NULL)))::integer AS cavi_con_metri_previsti,
            (count(*) FILTER (WHERE (base.metri_dis_n IS NOT NULL)))::integer AS cavi_con_metri_realizzati,
            (count(*) FILTER (WHERE ((base.situazione = 'P'::text) AND (base.metri_dis_n IS NOT NULL))))::integer AS cavi_posati_con_metri,
                CASE
                    WHEN (count(*) = 0) THEN (0)::numeric
                    ELSE round(((100.0 * (count(*) FILTER (WHERE (base.metri_teo_n IS NOT NULL)))::numeric) / (count(*))::numeric), 2)
                END AS pct_previsti_compilati,
                CASE
                    WHEN (count(*) = 0) THEN (0)::numeric
                    ELSE round(((100.0 * (count(*) FILTER (WHERE (base.metri_dis_n IS NOT NULL)))::numeric) / (count(*))::numeric), 2)
                END AS pct_realizzati_compilati
           FROM base
          GROUP BY base.inca_file_id, base.nome_file, base.caricato_il, base.costr, base.commessa
        )
 SELECT inca_file_id,
    nome_file,
    caricato_il,
    costr,
    commessa,
    metri_previsti_totali,
    metri_realizzati,
    metri_posati,
    cavi_totali,
    cavi_con_metri_previsti,
    cavi_con_metri_realizzati,
    cavi_posati_con_metri,
    pct_previsti_compilati,
    pct_realizzati_compilati
   FROM agg;


create or replace view "public"."direzione_inca_vs_rapportini" as  SELECT c.id AS inca_cavo_id,
    c.codice AS codice_cavo,
    c.descrizione AS descrizione_cavo,
    c.metri_previsti,
    c.situazione,
    c.metri_posati_teorici,
    COALESCE(sum(rc.metri_posati), (0)::numeric) AS metri_posati_da_rapportini,
    (COALESCE(sum(rc.metri_posati), (0)::numeric) - COALESCE(c.metri_posati_teorici, (0)::numeric)) AS delta_campo_vs_inca
   FROM (public.inca_cavi c
     LEFT JOIN archive.rapportino_cavi rc ON ((rc.inca_cavo_id = c.id)))
  GROUP BY c.id, c.codice, c.descrizione, c.metri_previsti, c.situazione, c.metri_posati_teorici;


create or replace view "public"."direzione_operator_facts_v1" as  WITH rap AS (
         SELECT r.id AS rapportino_id,
            r.report_date,
            r.status,
            r.capo_id,
            NULLIF(TRIM(BOTH FROM r.costr), ''::text) AS costr,
            NULLIF(TRIM(BOTH FROM r.commessa), ''::text) AS commessa
           FROM public.rapportini r
          WHERE ((r.status = 'APPROVED_UFFICIO'::text) AND (r.report_date IS NOT NULL))
        ), righe AS (
         SELECT rr_1.id AS rapportino_row_id,
            rr_1.rapportino_id,
            rr_1.row_index,
            NULLIF(TRIM(BOTH FROM rr_1.categoria), ''::text) AS categoria,
            NULLIF(TRIM(BOTH FROM rr_1.descrizione), ''::text) AS descrizione,
            rr_1.prodotto
           FROM public.rapportino_rows rr_1
        ), ships_k AS (
         SELECT s.id AS ship_id,
            NULLIF(TRIM(BOTH FROM s.costr), ''::text) AS costr,
            NULLIF(TRIM(BOTH FROM s.commessa), ''::text) AS commessa,
            s.code AS ship_code,
            s.name AS ship_name
           FROM public.ships s
        ), rap_with_ship AS (
         SELECT rap.rapportino_id,
            rap.report_date,
            rap.status,
            rap.capo_id,
            rap.costr,
            rap.commessa,
            sk.ship_id,
            sk.ship_code,
            sk.ship_name
           FROM (rap
             LEFT JOIN ships_k sk ON (((sk.costr = rap.costr) AND ((sk.commessa = rap.commessa) OR ((COALESCE(sk.commessa, ''::text) = ANY (ARRAY[''::text, '-'::text])) AND (COALESCE(rap.commessa, ''::text) = ANY (ARRAY[''::text, '-'::text])))))))
        ), ship_mgr AS (
         SELECT sm.ship_id,
            sm.manager_id
           FROM public.ship_managers sm
        ), attivita AS (
         SELECT ca.id AS attivita_id,
            lower(TRIM(BOTH FROM ca.categoria)) AS cat_key,
            lower(TRIM(BOTH FROM ca.descrizione)) AS desc_key,
            ca.activity_type,
            ca.unit
           FROM public.catalogo_attivita ca
          WHERE (ca.is_active = true)
        ), ops AS (
         SELECT ro.id AS op_row_id,
            ro.rapportino_row_id,
            ro.operator_id,
            ro.line_index,
            ro.tempo_hours
           FROM public.rapportino_row_operators ro
        ), line_hours AS (
         SELECT o_1.rapportino_row_id,
            sum(o_1.tempo_hours) FILTER (WHERE ((o_1.tempo_hours IS NOT NULL) AND (o_1.tempo_hours > (0)::numeric))) AS sum_line_hours,
            count(*) AS n_tokens_total,
            count(*) FILTER (WHERE (o_1.tempo_hours IS NULL)) AS n_tokens_invalid,
            count(*) FILTER (WHERE ((o_1.tempo_hours IS NOT NULL) AND (o_1.tempo_hours = (0)::numeric))) AS n_tokens_zero
           FROM ops o_1
          GROUP BY o_1.rapportino_row_id
        )
 SELECT rws.report_date,
    rws.rapportino_id,
    rws.capo_id,
    rws.costr,
    rws.commessa,
    rws.ship_id,
    rws.ship_code,
    rws.ship_name,
    mgr.manager_id,
    rr.rapportino_row_id,
    rr.row_index,
    rr.categoria,
    rr.descrizione,
    a.attivita_id,
    a.activity_type,
    a.unit,
    o.operator_id,
    o.line_index,
    o.tempo_hours,
    lh.sum_line_hours,
    lh.n_tokens_total,
    lh.n_tokens_invalid,
    lh.n_tokens_zero,
    rr.prodotto AS prodotto_row,
        CASE
            WHEN (rr.prodotto IS NULL) THEN NULL::numeric
            WHEN ((lh.sum_line_hours IS NULL) OR (lh.sum_line_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((o.tempo_hours IS NULL) OR (o.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.prodotto * (o.tempo_hours / lh.sum_line_hours))
        END AS prodotto_alloc
   FROM (((((rap_with_ship rws
     JOIN righe rr ON ((rr.rapportino_id = rws.rapportino_id)))
     LEFT JOIN attivita a ON (((lower(TRIM(BOTH FROM rr.categoria)) = a.cat_key) AND (lower(TRIM(BOTH FROM rr.descrizione)) = a.desc_key))))
     JOIN ops o ON ((o.rapportino_row_id = rr.rapportino_row_id)))
     LEFT JOIN line_hours lh ON ((lh.rapportino_row_id = rr.rapportino_row_id)))
     LEFT JOIN ship_mgr mgr ON ((mgr.ship_id = rws.ship_id)));


create or replace view "public"."direzione_operator_facts_v3" as  WITH rap AS (
         SELECT r.id AS rapportino_id,
            r.report_date,
            r.status,
            r.capo_id,
            NULLIF(TRIM(BOTH FROM r.costr), ''::text) AS costr,
            NULLIF(TRIM(BOTH FROM r.commessa), ''::text) AS commessa,
            NULLIF(TRIM(BOTH FROM r.costr), ''::text) AS costr_norm,
            NULLIF(TRIM(BOTH FROM r.commessa), ''::text) AS commessa_norm
           FROM public.rapportini r
          WHERE ((r.status = 'APPROVED_UFFICIO'::text) AND (r.report_date IS NOT NULL))
        ), righe AS (
         SELECT rr_1.id AS rapportino_row_id,
            rr_1.rapportino_id,
            rr_1.row_index,
            NULLIF(TRIM(BOTH FROM rr_1.categoria), ''::text) AS categoria,
            NULLIF(TRIM(BOTH FROM rr_1.descrizione), ''::text) AS descrizione,
            rr_1.previsto,
            rr_1.prodotto
           FROM public.rapportino_rows rr_1
        ), ships_k AS (
         SELECT s.id AS ship_id,
            NULLIF(TRIM(BOTH FROM s.costr), ''::text) AS costr_norm,
            NULLIF(TRIM(BOTH FROM s.commessa), ''::text) AS commessa_norm,
            s.code AS ship_code,
            s.name AS ship_name,
            s.is_active
           FROM public.ships s
        ), ship_candidates AS (
         SELECT r.rapportino_id,
            r.costr_norm,
            r.commessa_norm,
            sk.ship_id,
            sk.ship_code,
            sk.ship_name,
            sk.commessa_norm AS ship_commessa_norm,
                CASE
                    WHEN ((sk.commessa_norm IS NOT NULL) AND (sk.commessa_norm = r.commessa_norm)) THEN 2
                    WHEN ((sk.commessa_norm IS NULL) OR (sk.commessa_norm = ANY (ARRAY['-'::text, ''::text]))) THEN 1
                    ELSE 0
                END AS match_rank
           FROM (rap r
             JOIN ships_k sk ON (((sk.is_active = true) AND (sk.costr_norm = r.costr_norm))))
        ), ship_stats AS (
         SELECT ship_candidates.rapportino_id,
            ship_candidates.costr_norm,
            ship_candidates.commessa_norm,
            count(*) FILTER (WHERE (ship_candidates.match_rank = 2)) AS strict_n,
            count(*) FILTER (WHERE (ship_candidates.match_rank >= 1)) AS candidate_n,
            count(*) AS costr_active_n
           FROM ship_candidates
          GROUP BY ship_candidates.rapportino_id, ship_candidates.costr_norm, ship_candidates.commessa_norm
        ), ship_pick AS (
         SELECT c.rapportino_id,
            (min((c.ship_id)::text) FILTER (WHERE ((st.strict_n = 1) AND (c.match_rank = 2))))::uuid AS strict_ship_id,
            min(c.ship_code) FILTER (WHERE ((st.strict_n = 1) AND (c.match_rank = 2))) AS strict_ship_code,
            min(c.ship_name) FILTER (WHERE ((st.strict_n = 1) AND (c.match_rank = 2))) AS strict_ship_name,
            (min((c.ship_id)::text) FILTER (WHERE ((st.strict_n = 0) AND (st.candidate_n = 1) AND (c.match_rank = 1))))::uuid AS wildcard_ship_id,
            min(c.ship_code) FILTER (WHERE ((st.strict_n = 0) AND (st.candidate_n = 1) AND (c.match_rank = 1))) AS wildcard_ship_code,
            min(c.ship_name) FILTER (WHERE ((st.strict_n = 0) AND (st.candidate_n = 1) AND (c.match_rank = 1))) AS wildcard_ship_name,
            max(st.strict_n) AS strict_n,
            max(st.candidate_n) AS candidate_n,
            max(st.costr_active_n) AS costr_active_n
           FROM (ship_candidates c
             JOIN ship_stats st ON (((st.rapportino_id = c.rapportino_id) AND (st.costr_norm = c.costr_norm) AND (st.commessa_norm = c.commessa_norm))))
          GROUP BY c.rapportino_id
        ), rap_with_ship AS (
         SELECT r.rapportino_id,
            r.report_date,
            r.status,
            r.capo_id,
            r.costr,
            r.commessa,
            sp.strict_n,
            sp.candidate_n,
            sp.costr_active_n,
                CASE
                    WHEN (sp.strict_n = 1) THEN sp.strict_ship_id
                    WHEN ((sp.strict_n = 0) AND (sp.candidate_n = 1)) THEN sp.wildcard_ship_id
                    ELSE NULL::uuid
                END AS ship_id,
                CASE
                    WHEN (sp.strict_n = 1) THEN sp.strict_ship_code
                    WHEN ((sp.strict_n = 0) AND (sp.candidate_n = 1)) THEN sp.wildcard_ship_code
                    ELSE NULL::text
                END AS ship_code,
                CASE
                    WHEN (sp.strict_n = 1) THEN sp.strict_ship_name
                    WHEN ((sp.strict_n = 0) AND (sp.candidate_n = 1)) THEN sp.wildcard_ship_name
                    ELSE NULL::text
                END AS ship_name,
                CASE
                    WHEN (sp.strict_n = 1) THEN 'STRICT'::text
                    WHEN ((sp.strict_n = 0) AND (sp.candidate_n = 1)) THEN 'COSTR_ONLY'::text
                    WHEN (sp.candidate_n > 1) THEN 'AMBIGUOUS_COSTR'::text
                    ELSE 'NO_SHIP'::text
                END AS ship_match_mode
           FROM (rap r
             LEFT JOIN ship_pick sp ON ((sp.rapportino_id = r.rapportino_id)))
        ), ship_mgr AS (
         SELECT sm.ship_id,
            sm.manager_id
           FROM public.ship_managers sm
        ), attivita AS (
         SELECT ca.id AS attivita_id,
            lower(TRIM(BOTH FROM ca.categoria)) AS cat_key,
            lower(TRIM(BOTH FROM ca.descrizione)) AS desc_key,
            ca.activity_type,
            ca.unit
           FROM public.catalogo_attivita ca
          WHERE (ca.is_active = true)
        ), ops AS (
         SELECT ro.id AS op_row_id,
            ro.rapportino_row_id,
            ro.operator_id,
            ro.line_index,
            ro.tempo_hours
           FROM public.rapportino_row_operators ro
        ), line_hours AS (
         SELECT o_1.rapportino_row_id,
            sum(o_1.tempo_hours) FILTER (WHERE ((o_1.tempo_hours IS NOT NULL) AND (o_1.tempo_hours > (0)::numeric))) AS sum_line_hours,
            count(*) AS n_tokens_total,
            count(*) FILTER (WHERE (o_1.tempo_hours IS NULL)) AS n_tokens_invalid,
            count(*) FILTER (WHERE (o_1.tempo_hours = (0)::numeric)) AS n_tokens_zero
           FROM ops o_1
          GROUP BY o_1.rapportino_row_id
        )
 SELECT rws.report_date,
    rws.rapportino_id,
    rws.capo_id,
    rws.costr,
    rws.commessa,
    rws.ship_id,
    rws.ship_code,
    rws.ship_name,
    rws.ship_match_mode,
    mgr.manager_id,
    rr.rapportino_row_id,
    rr.row_index,
    rr.categoria,
    rr.descrizione,
    a.attivita_id,
    a.activity_type,
    a.unit,
    o.operator_id,
    o.line_index,
    o.tempo_hours,
    lh.sum_line_hours,
    lh.n_tokens_total,
    lh.n_tokens_invalid,
    lh.n_tokens_zero,
    rr.previsto AS previsto_row,
    rr.prodotto AS prodotto_row,
        CASE
            WHEN (rr.prodotto IS NULL) THEN NULL::numeric
            WHEN ((lh.sum_line_hours IS NULL) OR (lh.sum_line_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((o.tempo_hours IS NULL) OR (o.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.prodotto * (o.tempo_hours / lh.sum_line_hours))
        END AS prodotto_alloc,
        CASE
            WHEN (rr.previsto IS NULL) THEN NULL::numeric
            WHEN ((lh.sum_line_hours IS NULL) OR (lh.sum_line_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((o.tempo_hours IS NULL) OR (o.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.previsto * (o.tempo_hours / lh.sum_line_hours))
        END AS previsto_alloc
   FROM (((((rap_with_ship rws
     JOIN righe rr ON ((rr.rapportino_id = rws.rapportino_id)))
     LEFT JOIN attivita a ON (((lower(TRIM(BOTH FROM rr.categoria)) = a.cat_key) AND (lower(TRIM(BOTH FROM rr.descrizione)) = a.desc_key))))
     JOIN ops o ON ((o.rapportino_row_id = rr.rapportino_row_id)))
     LEFT JOIN line_hours lh ON ((lh.rapportino_row_id = rr.rapportino_row_id)))
     LEFT JOIN ship_mgr mgr ON ((mgr.ship_id = rws.ship_id)));


create or replace view "public"."direzione_operator_facts_v4" as  WITH rap AS (
         SELECT r.id AS rapportino_id,
            r.report_date,
            r.status,
            r.capo_id,
            NULLIF(TRIM(BOTH FROM r.costr), ''::text) AS costr_raw,
            NULLIF(TRIM(BOTH FROM r.commessa), ''::text) AS commessa_raw
           FROM public.rapportini r
          WHERE ((r.report_date IS NOT NULL) AND (r.status = 'APPROVED_UFFICIO'::text))
        ), rap_norm AS (
         SELECT rap.rapportino_id,
            rap.report_date,
            rap.status,
            rap.capo_id,
            NULLIF(TRIM(BOTH FROM rap.costr_raw), ''::text) AS costr_norm,
                CASE
                    WHEN (rap.commessa_raw IS NULL) THEN NULL::text
                    WHEN (TRIM(BOTH FROM rap.commessa_raw) = ANY (ARRAY[''::text, '-'::text])) THEN NULL::text
                    ELSE TRIM(BOTH FROM rap.commessa_raw)
                END AS commessa_norm
           FROM rap
        ), righe AS (
         SELECT rr_1.id AS rapportino_row_id,
            rr_1.rapportino_id,
            rr_1.row_index,
            NULLIF(TRIM(BOTH FROM rr_1.categoria), ''::text) AS categoria,
            NULLIF(TRIM(BOTH FROM rr_1.descrizione), ''::text) AS descrizione,
            rr_1.previsto,
            rr_1.prodotto
           FROM public.rapportino_rows rr_1
        ), attivita AS (
         SELECT ca.id AS attivita_id,
            lower(TRIM(BOTH FROM ca.categoria)) AS cat_key,
            lower(TRIM(BOTH FROM ca.descrizione)) AS desc_key,
            ca.activity_type,
            ca.unit
           FROM public.catalogo_attivita ca
          WHERE (ca.is_active = true)
        ), ops AS (
         SELECT ro.id AS op_row_id,
            ro.rapportino_row_id,
            ro.operator_id,
            ro.line_index,
            ro.tempo_hours
           FROM public.rapportino_row_operators ro
        ), line_hours AS (
         SELECT o_1.rapportino_row_id,
            sum(o_1.tempo_hours) FILTER (WHERE ((o_1.tempo_hours IS NOT NULL) AND (o_1.tempo_hours > (0)::numeric))) AS sum_line_hours,
            count(*) AS n_tokens_total,
            count(*) FILTER (WHERE (o_1.tempo_hours IS NULL)) AS n_tokens_invalid,
            count(*) FILTER (WHERE (o_1.tempo_hours = (0)::numeric)) AS n_tokens_zero
           FROM ops o_1
          GROUP BY o_1.rapportino_row_id
        ), ships_active AS (
         SELECT s.id AS ship_id,
            NULLIF(TRIM(BOTH FROM s.costr), ''::text) AS costr_norm,
                CASE
                    WHEN (s.commessa IS NULL) THEN NULL::text
                    WHEN (TRIM(BOTH FROM s.commessa) = ANY (ARRAY[''::text, '-'::text])) THEN NULL::text
                    ELSE TRIM(BOTH FROM s.commessa)
                END AS commessa_norm,
            s.code AS ship_code,
            s.name AS ship_name
           FROM public.ships s
          WHERE (s.is_active = true)
        ), ship_stats AS (
         SELECT rn.rapportino_id,
            rn.costr_norm,
            rn.commessa_norm,
            count(*) FILTER (WHERE ((sa.costr_norm = rn.costr_norm) AND (NOT (sa.commessa_norm IS DISTINCT FROM rn.commessa_norm)))) AS strict_n,
            count(*) FILTER (WHERE (sa.costr_norm = rn.costr_norm)) AS costr_active_n,
            (array_agg(sa.ship_id ORDER BY sa.ship_id) FILTER (WHERE ((sa.costr_norm = rn.costr_norm) AND (NOT (sa.commessa_norm IS DISTINCT FROM rn.commessa_norm)))))[1] AS strict_ship_id,
            (array_agg(sa.ship_id ORDER BY sa.ship_id) FILTER (WHERE (sa.costr_norm = rn.costr_norm)))[1] AS costr_only_ship_id
           FROM (rap_norm rn
             LEFT JOIN ships_active sa ON ((sa.costr_norm = rn.costr_norm)))
          GROUP BY rn.rapportino_id, rn.costr_norm, rn.commessa_norm
        ), rap_with_ship AS (
         SELECT rn.rapportino_id,
            rn.report_date,
            rn.capo_id,
            rn.costr_norm AS costr,
            rn.commessa_norm AS commessa,
                CASE
                    WHEN (ss.strict_n = 1) THEN ss.strict_ship_id
                    WHEN ((ss.strict_n = 0) AND (ss.costr_active_n = 1)) THEN ss.costr_only_ship_id
                    ELSE NULL::uuid
                END AS ship_id,
                CASE
                    WHEN (ss.strict_n = 1) THEN 'STRICT'::text
                    WHEN ((ss.strict_n = 0) AND (ss.costr_active_n = 1)) THEN 'COSTR_ONLY'::text
                    WHEN ((ss.costr_active_n IS NULL) OR (ss.costr_active_n = 0)) THEN 'NO_SHIP'::text
                    ELSE 'AMBIGUOUS_COSTR'::text
                END AS ship_match_mode
           FROM (rap_norm rn
             LEFT JOIN ship_stats ss ON ((ss.rapportino_id = rn.rapportino_id)))
        ), ship_dim AS (
         SELECT ships_active.ship_id,
            ships_active.ship_code,
            ships_active.ship_name
           FROM ships_active
        ), ship_mgr AS (
         SELECT sm.ship_id,
            sm.manager_id
           FROM public.ship_managers sm
        )
 SELECT rws.report_date,
    rws.rapportino_id,
    rws.capo_id,
    rws.costr,
    rws.commessa,
    rws.ship_id,
    sd.ship_code,
    sd.ship_name,
    rws.ship_match_mode,
    mgr.manager_id,
    rr.rapportino_row_id,
    rr.row_index,
    rr.categoria,
    rr.descrizione,
    a.attivita_id,
    a.activity_type,
    a.unit,
    o.operator_id,
    o.line_index,
    o.tempo_hours,
    lh.sum_line_hours,
    lh.n_tokens_total,
    lh.n_tokens_invalid,
    lh.n_tokens_zero,
    rr.previsto AS previsto_row,
    rr.prodotto AS prodotto_row,
        CASE
            WHEN (rr.prodotto IS NULL) THEN NULL::numeric
            WHEN ((lh.sum_line_hours IS NULL) OR (lh.sum_line_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((o.tempo_hours IS NULL) OR (o.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.prodotto * (o.tempo_hours / lh.sum_line_hours))
        END AS prodotto_alloc,
        CASE
            WHEN (rr.previsto IS NULL) THEN NULL::numeric
            WHEN ((lh.sum_line_hours IS NULL) OR (lh.sum_line_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((o.tempo_hours IS NULL) OR (o.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.previsto * (o.tempo_hours / lh.sum_line_hours))
        END AS previsto_alloc
   FROM ((((((rap_with_ship rws
     JOIN righe rr ON ((rr.rapportino_id = rws.rapportino_id)))
     LEFT JOIN attivita a ON (((lower(TRIM(BOTH FROM rr.categoria)) = a.cat_key) AND (lower(TRIM(BOTH FROM rr.descrizione)) = a.desc_key))))
     JOIN ops o ON ((o.rapportino_row_id = rr.rapportino_row_id)))
     LEFT JOIN line_hours lh ON ((lh.rapportino_row_id = rr.rapportino_row_id)))
     LEFT JOIN ship_dim sd ON ((sd.ship_id = rws.ship_id)))
     LEFT JOIN ship_mgr mgr ON ((mgr.ship_id = rws.ship_id)));


create or replace view "public"."direzione_operator_kpi_day_v1" as  WITH op_line AS (
         SELECT f.report_date,
            f.operator_id,
            f.manager_id,
            f.ship_id,
            f.costr,
            f.commessa,
            f.capo_id,
            f.unit,
            f.rapportino_row_id,
            sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            max(f.n_tokens_invalid) AS n_tokens_invalid,
            max(f.n_tokens_zero) AS n_tokens_zero,
            max(f.n_tokens_total) AS n_tokens_total
           FROM public.direzione_operator_facts_v1 f
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
          GROUP BY f.report_date, f.operator_id, f.manager_id, f.ship_id, f.costr, f.commessa, f.capo_id, f.unit, f.rapportino_row_id
        )
 SELECT report_date,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens
   FROM op_line
  GROUP BY report_date, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_day_v2" as  WITH op_line AS (
         SELECT f.report_date,
            f.operator_id,
            f.manager_id,
            f.ship_id,
            f.costr,
            f.commessa,
            f.capo_id,
            f.unit,
            f.rapportino_row_id,
            sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            max(f.n_tokens_invalid) AS n_tokens_invalid,
            max(f.n_tokens_zero) AS n_tokens_zero,
            max(f.n_tokens_total) AS n_tokens_total,
            max(o.cognome) AS cognome,
            max(o.nome) AS nome,
            max(o.operator_code) AS operator_code,
            max(o.operator_key) AS operator_key,
            max(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE(o.cognome, ''::text) || ' '::text) || COALESCE(o.nome, ''::text))), ''::text), NULLIF(o.name, ''::text))) AS operator_name
           FROM (public.direzione_operator_facts_v1 f
             LEFT JOIN public.operators o ON ((o.id = f.operator_id)))
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
          GROUP BY f.report_date, f.operator_id, f.manager_id, f.ship_id, f.costr, f.commessa, f.capo_id, f.unit, f.rapportino_row_id
        )
 SELECT report_date,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens,
    max(operator_name) AS operator_name,
    max(cognome) AS cognome,
    max(nome) AS nome,
    max(operator_code) AS operator_code,
    max(operator_key) AS operator_key
   FROM op_line
  GROUP BY report_date, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_day_v3" as  WITH f AS (
         SELECT direzione_operator_facts_v4.report_date,
            direzione_operator_facts_v4.operator_id,
            direzione_operator_facts_v4.capo_id,
            direzione_operator_facts_v4.manager_id,
            direzione_operator_facts_v4.ship_id,
            direzione_operator_facts_v4.costr,
            direzione_operator_facts_v4.commessa,
            direzione_operator_facts_v4.unit,
            direzione_operator_facts_v4.tempo_hours,
            direzione_operator_facts_v4.previsto_alloc,
            direzione_operator_facts_v4.prodotto_alloc
           FROM public.direzione_operator_facts_v4
          WHERE (direzione_operator_facts_v4.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), tokens AS (
         SELECT f.report_date,
            f.operator_id,
            f.capo_id,
            f.manager_id,
            f.ship_id,
            f.costr,
            f.commessa,
            f.unit,
            count(*) AS tokens_total,
            count(*) FILTER (WHERE (f.tempo_hours IS NULL)) AS tokens_invalid,
            count(*) FILTER (WHERE (f.tempo_hours = (0)::numeric)) AS tokens_zero,
            count(*) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS tokens_ok,
            sum(f.previsto_alloc) FILTER (WHERE ((f.previsto_alloc IS NOT NULL) AND (f.previsto_alloc > (0)::numeric) AND (f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS previsto_sum,
            sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric) AND (f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS prodotto_sum,
            sum((((f.prodotto_alloc / NULLIF(f.previsto_alloc, (0)::numeric)) * (100)::numeric) * f.tempo_hours)) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric) AND (f.previsto_alloc IS NOT NULL) AND (f.previsto_alloc > (0)::numeric) AND (f.prodotto_alloc IS NOT NULL))) AS pct_weighted_sum,
            sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric) AND (f.previsto_alloc IS NOT NULL) AND (f.previsto_alloc > (0)::numeric) AND (f.prodotto_alloc IS NOT NULL))) AS pct_weight
           FROM f
          GROUP BY f.report_date, f.operator_id, f.capo_id, f.manager_id, f.ship_id, f.costr, f.commessa, f.unit
        )
 SELECT report_date,
    operator_id,
    capo_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    unit,
    previsto_sum,
    prodotto_sum,
    tokens_total,
    tokens_invalid,
    tokens_zero,
    tokens_ok,
        CASE
            WHEN ((pct_weight IS NULL) OR (pct_weight <= (0)::numeric)) THEN NULL::numeric
            ELSE (pct_weighted_sum / pct_weight)
        END AS productivity_pct
   FROM tokens;


create or replace view "public"."direzione_operator_kpi_day_v3_manager_safe" as  WITH base AS (
         SELECT f.report_date,
            f.operator_id,
            f.capo_id,
            f.manager_id,
            f.ship_id,
            f.ship_code,
            f.ship_name,
            f.ship_match_mode,
            f.costr,
            f.commessa,
            f.unit,
            f.tempo_hours,
            f.n_tokens_total,
            f.n_tokens_invalid,
            f.n_tokens_zero,
            f.previsto_alloc,
            f.prodotto_alloc
           FROM public.direzione_operator_facts_v3 f
        )
 SELECT report_date,
    operator_id,
    capo_id,
    manager_id,
    ship_id,
    ship_code,
    ship_name,
    ship_match_mode,
    costr,
    commessa,
    unit,
    sum(n_tokens_total) AS tokens_total,
    sum(n_tokens_invalid) AS tokens_invalid,
    sum(n_tokens_zero) AS tokens_zero,
    ((sum(n_tokens_total) - sum(n_tokens_invalid)) - sum(n_tokens_zero)) AS tokens_ok,
    sum(tempo_hours) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) AS hours_valid,
    sum(prodotto_alloc) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) AS prodotto_alloc_sum,
    sum(previsto_alloc) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) AS previsto_alloc_sum,
        CASE
            WHEN ((sum(tempo_hours) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) IS NULL) OR (sum(tempo_hours) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) = (0)::numeric)) THEN NULL::numeric
            ELSE (sum(prodotto_alloc) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) / NULLIF(sum(tempo_hours) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))), (0)::numeric))
        END AS productivity_index,
        CASE
            WHEN ((sum(previsto_alloc) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) IS NULL) OR (sum(previsto_alloc) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) = (0)::numeric)) THEN NULL::numeric
            ELSE ((100)::numeric * (sum(prodotto_alloc) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) / NULLIF(sum(previsto_alloc) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))), (0)::numeric)))
        END AS productivity_pct
   FROM base b
  GROUP BY report_date, operator_id, capo_id, manager_id, ship_id, ship_code, ship_name, ship_match_mode, costr, commessa, unit;


create or replace view "public"."direzione_operator_kpi_day_v4_manager_safe" as  SELECT report_date,
    operator_id,
    capo_id,
    manager_id,
    ship_id,
    ship_code,
    ship_name,
    ship_match_mode,
    costr,
    commessa,
    unit,
    tokens_total,
    tokens_invalid,
    tokens_zero,
    tokens_ok,
    hours_valid,
    prodotto_alloc_sum,
    previsto_alloc_sum,
    productivity_index,
    productivity_pct,
        CASE
            WHEN ((previsto_alloc_sum IS NULL) OR (previsto_alloc_sum = (0)::numeric)) THEN NULL::numeric
            WHEN (prodotto_alloc_sum IS NULL) THEN NULL::numeric
            ELSE (prodotto_alloc_sum / NULLIF(previsto_alloc_sum, (0)::numeric))
        END AS ratio_vs_previsto,
        CASE
            WHEN ((previsto_alloc_sum IS NULL) OR (previsto_alloc_sum = (0)::numeric)) THEN NULL::numeric
            WHEN (prodotto_alloc_sum IS NULL) THEN NULL::numeric
            ELSE ((prodotto_alloc_sum / NULLIF(previsto_alloc_sum, (0)::numeric)) - (1)::numeric)
        END AS delta_vs_previsto,
        CASE
            WHEN ((previsto_alloc_sum IS NULL) OR (previsto_alloc_sum = (0)::numeric)) THEN NULL::numeric
            WHEN (prodotto_alloc_sum IS NULL) THEN NULL::numeric
            ELSE ((100)::numeric * ((prodotto_alloc_sum / NULLIF(previsto_alloc_sum, (0)::numeric)) - (1)::numeric))
        END AS delta_vs_previsto_pct_points
   FROM public.direzione_operator_kpi_day_v3_manager_safe v3;


create or replace view "public"."direzione_operator_kpi_month_v1" as  WITH base AS (
         SELECT (date_trunc('month'::text, (f.report_date)::timestamp with time zone))::date AS month_start,
            ((date_trunc('month'::text, (f.report_date)::timestamp with time zone) + '1 mon -1 days'::interval))::date AS month_end,
            f.report_date,
            f.rapportino_id,
            f.capo_id,
            f.costr,
            f.commessa,
            f.ship_id,
            f.ship_code,
            f.ship_name,
            f.manager_id,
            f.rapportino_row_id,
            f.row_index,
            f.categoria,
            f.descrizione,
            f.attivita_id,
            f.activity_type,
            f.unit,
            f.operator_id,
            f.line_index,
            f.tempo_hours,
            f.sum_line_hours,
            f.n_tokens_total,
            f.n_tokens_invalid,
            f.n_tokens_zero,
            f.prodotto_row,
            f.prodotto_alloc
           FROM public.direzione_operator_facts_v1 f
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), op_line AS (
         SELECT base.month_start,
            base.month_end,
            base.operator_id,
            base.manager_id,
            base.ship_id,
            base.costr,
            base.commessa,
            base.capo_id,
            base.unit,
            base.rapportino_row_id,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(base.prodotto_alloc) FILTER (WHERE ((base.prodotto_alloc IS NOT NULL) AND (base.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            max(base.n_tokens_invalid) AS n_tokens_invalid,
            max(base.n_tokens_zero) AS n_tokens_zero,
            max(base.n_tokens_total) AS n_tokens_total
           FROM base
          GROUP BY base.month_start, base.month_end, base.operator_id, base.manager_id, base.ship_id, base.costr, base.commessa, base.capo_id, base.unit, base.rapportino_row_id
        )
 SELECT month_start,
    month_end,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens
   FROM op_line
  GROUP BY month_start, month_end, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_month_v2" as  WITH base AS (
         SELECT (date_trunc('month'::text, (f.report_date)::timestamp with time zone))::date AS month_start,
            ((date_trunc('month'::text, (f.report_date)::timestamp with time zone) + '1 mon -1 days'::interval))::date AS month_end,
            f.report_date,
            f.rapportino_id,
            f.capo_id,
            f.costr,
            f.commessa,
            f.ship_id,
            f.ship_code,
            f.ship_name,
            f.manager_id,
            f.rapportino_row_id,
            f.row_index,
            f.categoria,
            f.descrizione,
            f.attivita_id,
            f.activity_type,
            f.unit,
            f.operator_id,
            f.line_index,
            f.tempo_hours,
            f.sum_line_hours,
            f.n_tokens_total,
            f.n_tokens_invalid,
            f.n_tokens_zero,
            f.prodotto_row,
            f.prodotto_alloc
           FROM public.direzione_operator_facts_v1 f
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), op_line AS (
         SELECT b.month_start,
            b.month_end,
            b.operator_id,
            b.manager_id,
            b.ship_id,
            b.costr,
            b.commessa,
            b.capo_id,
            b.unit,
            b.rapportino_row_id,
            sum(b.tempo_hours) FILTER (WHERE ((b.tempo_hours IS NOT NULL) AND (b.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(b.prodotto_alloc) FILTER (WHERE ((b.prodotto_alloc IS NOT NULL) AND (b.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            max(b.n_tokens_invalid) AS n_tokens_invalid,
            max(b.n_tokens_zero) AS n_tokens_zero,
            max(b.n_tokens_total) AS n_tokens_total,
            max(o.cognome) AS cognome,
            max(o.nome) AS nome,
            max(o.operator_code) AS operator_code,
            max(o.operator_key) AS operator_key,
            max(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE(o.cognome, ''::text) || ' '::text) || COALESCE(o.nome, ''::text))), ''::text), NULLIF(o.name, ''::text))) AS operator_name
           FROM (base b
             LEFT JOIN public.operators o ON ((o.id = b.operator_id)))
          GROUP BY b.month_start, b.month_end, b.operator_id, b.manager_id, b.ship_id, b.costr, b.commessa, b.capo_id, b.unit, b.rapportino_row_id
        )
 SELECT month_start,
    month_end,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens,
    max(operator_name) AS operator_name,
    max(cognome) AS cognome,
    max(nome) AS nome,
    max(operator_code) AS operator_code,
    max(operator_key) AS operator_key
   FROM op_line
  GROUP BY month_start, month_end, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_month_v3" as  WITH base AS (
         SELECT (date_trunc('month'::text, (direzione_operator_facts_v4.report_date)::timestamp without time zone))::date AS month_start,
            ((date_trunc('month'::text, (direzione_operator_facts_v4.report_date)::timestamp without time zone) + '1 mon -1 days'::interval))::date AS month_end,
            direzione_operator_facts_v4.report_date,
            direzione_operator_facts_v4.operator_id,
            direzione_operator_facts_v4.capo_id,
            direzione_operator_facts_v4.manager_id,
            direzione_operator_facts_v4.ship_id,
            direzione_operator_facts_v4.costr,
            direzione_operator_facts_v4.commessa,
            direzione_operator_facts_v4.unit,
            direzione_operator_facts_v4.tempo_hours,
            direzione_operator_facts_v4.previsto_alloc,
            direzione_operator_facts_v4.prodotto_alloc
           FROM public.direzione_operator_facts_v4
          WHERE (direzione_operator_facts_v4.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), agg AS (
         SELECT base.month_start,
            base.month_end,
            base.operator_id,
            base.capo_id,
            base.manager_id,
            base.ship_id,
            base.costr,
            base.commessa,
            base.unit,
            count(*) AS tokens_total,
            count(*) FILTER (WHERE (base.tempo_hours IS NULL)) AS tokens_invalid,
            count(*) FILTER (WHERE (base.tempo_hours = (0)::numeric)) AS tokens_zero,
            count(*) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS tokens_ok,
            sum(base.previsto_alloc) FILTER (WHERE ((base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS previsto_sum,
            sum(base.prodotto_alloc) FILTER (WHERE ((base.prodotto_alloc IS NOT NULL) AND (base.prodotto_alloc > (0)::numeric) AND (base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS prodotto_sum,
            sum((((base.prodotto_alloc / NULLIF(base.previsto_alloc, (0)::numeric)) * (100)::numeric) * base.tempo_hours)) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric) AND (base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.prodotto_alloc IS NOT NULL))) AS pct_weighted_sum,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric) AND (base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.prodotto_alloc IS NOT NULL))) AS pct_weight
           FROM base
          GROUP BY base.month_start, base.month_end, base.operator_id, base.capo_id, base.manager_id, base.ship_id, base.costr, base.commessa, base.unit
        )
 SELECT month_start,
    month_end,
    operator_id,
    capo_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    unit,
    previsto_sum,
    prodotto_sum,
    tokens_total,
    tokens_invalid,
    tokens_zero,
    tokens_ok,
        CASE
            WHEN ((pct_weight IS NULL) OR (pct_weight <= (0)::numeric)) THEN NULL::numeric
            ELSE (pct_weighted_sum / pct_weight)
        END AS productivity_pct
   FROM agg;


create or replace view "public"."direzione_operator_kpi_week_v1" as  WITH base AS (
         SELECT (date_trunc('week'::text, (f.report_date)::timestamp with time zone))::date AS week_start,
            ((date_trunc('week'::text, (f.report_date)::timestamp with time zone))::date + 6) AS week_end,
            (EXTRACT(isodow FROM f.report_date) = (6)::numeric) AS is_saturday,
            f.report_date,
            f.rapportino_id,
            f.capo_id,
            f.costr,
            f.commessa,
            f.ship_id,
            f.ship_code,
            f.ship_name,
            f.manager_id,
            f.rapportino_row_id,
            f.row_index,
            f.categoria,
            f.descrizione,
            f.attivita_id,
            f.activity_type,
            f.unit,
            f.operator_id,
            f.line_index,
            f.tempo_hours,
            f.sum_line_hours,
            f.n_tokens_total,
            f.n_tokens_invalid,
            f.n_tokens_zero,
            f.prodotto_row,
            f.prodotto_alloc
           FROM public.direzione_operator_facts_v1 f
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), op_line AS (
         SELECT base.week_start,
            base.week_end,
            base.operator_id,
            base.manager_id,
            base.ship_id,
            base.costr,
            base.commessa,
            base.capo_id,
            base.unit,
            base.rapportino_row_id,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(base.prodotto_alloc) FILTER (WHERE ((base.prodotto_alloc IS NOT NULL) AND (base.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            sum(base.tempo_hours) FILTER (WHERE (base.is_saturday AND (base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS saturday_hours,
            sum(base.prodotto_alloc) FILTER (WHERE (base.is_saturday AND (base.prodotto_alloc IS NOT NULL) AND (base.prodotto_alloc > (0)::numeric))) AS saturday_prodotto,
            max(base.n_tokens_invalid) AS n_tokens_invalid,
            max(base.n_tokens_zero) AS n_tokens_zero,
            max(base.n_tokens_total) AS n_tokens_total
           FROM base
          GROUP BY base.week_start, base.week_end, base.operator_id, base.manager_id, base.ship_id, base.costr, base.commessa, base.capo_id, base.unit, base.rapportino_row_id
        )
 SELECT week_start,
    week_end,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
    sum(saturday_hours) AS saturday_hours,
    sum(saturday_prodotto) AS saturday_prodotto,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens
   FROM op_line
  GROUP BY week_start, week_end, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_week_v2" as  WITH base AS (
         SELECT (date_trunc('week'::text, (f.report_date)::timestamp with time zone))::date AS week_start,
            ((date_trunc('week'::text, (f.report_date)::timestamp with time zone))::date + 6) AS week_end,
            (EXTRACT(isodow FROM f.report_date) = (6)::numeric) AS is_saturday,
            f.report_date,
            f.rapportino_id,
            f.capo_id,
            f.costr,
            f.commessa,
            f.ship_id,
            f.ship_code,
            f.ship_name,
            f.manager_id,
            f.rapportino_row_id,
            f.row_index,
            f.categoria,
            f.descrizione,
            f.attivita_id,
            f.activity_type,
            f.unit,
            f.operator_id,
            f.line_index,
            f.tempo_hours,
            f.sum_line_hours,
            f.n_tokens_total,
            f.n_tokens_invalid,
            f.n_tokens_zero,
            f.prodotto_row,
            f.prodotto_alloc
           FROM public.direzione_operator_facts_v1 f
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), op_line AS (
         SELECT b.week_start,
            b.week_end,
            b.operator_id,
            b.manager_id,
            b.ship_id,
            b.costr,
            b.commessa,
            b.capo_id,
            b.unit,
            b.rapportino_row_id,
            sum(b.tempo_hours) FILTER (WHERE ((b.tempo_hours IS NOT NULL) AND (b.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(b.prodotto_alloc) FILTER (WHERE ((b.prodotto_alloc IS NOT NULL) AND (b.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            sum(b.tempo_hours) FILTER (WHERE (b.is_saturday AND (b.tempo_hours IS NOT NULL) AND (b.tempo_hours > (0)::numeric))) AS saturday_hours,
            sum(b.prodotto_alloc) FILTER (WHERE (b.is_saturday AND (b.prodotto_alloc IS NOT NULL) AND (b.prodotto_alloc > (0)::numeric))) AS saturday_prodotto,
            max(b.n_tokens_invalid) AS n_tokens_invalid,
            max(b.n_tokens_zero) AS n_tokens_zero,
            max(b.n_tokens_total) AS n_tokens_total,
            max(o.cognome) AS cognome,
            max(o.nome) AS nome,
            max(o.operator_code) AS operator_code,
            max(o.operator_key) AS operator_key,
            max(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE(o.cognome, ''::text) || ' '::text) || COALESCE(o.nome, ''::text))), ''::text), NULLIF(o.name, ''::text))) AS operator_name
           FROM (base b
             LEFT JOIN public.operators o ON ((o.id = b.operator_id)))
          GROUP BY b.week_start, b.week_end, b.operator_id, b.manager_id, b.ship_id, b.costr, b.commessa, b.capo_id, b.unit, b.rapportino_row_id
        )
 SELECT week_start,
    week_end,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
    sum(saturday_hours) AS saturday_hours,
    sum(saturday_prodotto) AS saturday_prodotto,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens,
    max(operator_name) AS operator_name,
    max(cognome) AS cognome,
    max(nome) AS nome,
    max(operator_code) AS operator_code,
    max(operator_key) AS operator_key
   FROM op_line
  GROUP BY week_start, week_end, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_week_v3" as  WITH base AS (
         SELECT (date_trunc('week'::text, (direzione_operator_facts_v4.report_date)::timestamp without time zone))::date AS week_start,
            ((date_trunc('week'::text, (direzione_operator_facts_v4.report_date)::timestamp without time zone))::date + 6) AS week_end,
            direzione_operator_facts_v4.report_date,
            direzione_operator_facts_v4.operator_id,
            direzione_operator_facts_v4.capo_id,
            direzione_operator_facts_v4.manager_id,
            direzione_operator_facts_v4.ship_id,
            direzione_operator_facts_v4.costr,
            direzione_operator_facts_v4.commessa,
            direzione_operator_facts_v4.unit,
            direzione_operator_facts_v4.tempo_hours,
            direzione_operator_facts_v4.previsto_alloc,
            direzione_operator_facts_v4.prodotto_alloc
           FROM public.direzione_operator_facts_v4
          WHERE (direzione_operator_facts_v4.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), agg AS (
         SELECT base.week_start,
            base.week_end,
            base.operator_id,
            base.capo_id,
            base.manager_id,
            base.ship_id,
            base.costr,
            base.commessa,
            base.unit,
            count(*) AS tokens_total,
            count(*) FILTER (WHERE (base.tempo_hours IS NULL)) AS tokens_invalid,
            count(*) FILTER (WHERE (base.tempo_hours = (0)::numeric)) AS tokens_zero,
            count(*) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS tokens_ok,
            sum(base.previsto_alloc) FILTER (WHERE ((base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS previsto_sum,
            sum(base.prodotto_alloc) FILTER (WHERE ((base.prodotto_alloc IS NOT NULL) AND (base.prodotto_alloc > (0)::numeric) AND (base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS prodotto_sum,
            sum((((base.prodotto_alloc / NULLIF(base.previsto_alloc, (0)::numeric)) * (100)::numeric) * base.tempo_hours)) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric) AND (base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.prodotto_alloc IS NOT NULL))) AS pct_weighted_sum,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric) AND (base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.prodotto_alloc IS NOT NULL))) AS pct_weight
           FROM base
          GROUP BY base.week_start, base.week_end, base.operator_id, base.capo_id, base.manager_id, base.ship_id, base.costr, base.commessa, base.unit
        )
 SELECT week_start,
    week_end,
    operator_id,
    capo_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    unit,
    previsto_sum,
    prodotto_sum,
    tokens_total,
    tokens_invalid,
    tokens_zero,
    tokens_ok,
        CASE
            WHEN ((pct_weight IS NULL) OR (pct_weight <= (0)::numeric)) THEN NULL::numeric
            ELSE (pct_weighted_sum / pct_weight)
        END AS productivity_pct
   FROM agg;


create or replace view "public"."direzione_operator_kpi_year_v1" as  WITH base AS (
         SELECT (EXTRACT(year FROM f.report_date))::integer AS year,
            f.report_date,
            f.rapportino_id,
            f.capo_id,
            f.costr,
            f.commessa,
            f.ship_id,
            f.ship_code,
            f.ship_name,
            f.manager_id,
            f.rapportino_row_id,
            f.row_index,
            f.categoria,
            f.descrizione,
            f.attivita_id,
            f.activity_type,
            f.unit,
            f.operator_id,
            f.line_index,
            f.tempo_hours,
            f.sum_line_hours,
            f.n_tokens_total,
            f.n_tokens_invalid,
            f.n_tokens_zero,
            f.prodotto_row,
            f.prodotto_alloc
           FROM public.direzione_operator_facts_v1 f
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), op_line AS (
         SELECT base.year,
            base.operator_id,
            base.manager_id,
            base.ship_id,
            base.costr,
            base.commessa,
            base.capo_id,
            base.unit,
            base.rapportino_row_id,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(base.prodotto_alloc) FILTER (WHERE ((base.prodotto_alloc IS NOT NULL) AND (base.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            max(base.n_tokens_invalid) AS n_tokens_invalid,
            max(base.n_tokens_zero) AS n_tokens_zero,
            max(base.n_tokens_total) AS n_tokens_total
           FROM base
          GROUP BY base.year, base.operator_id, base.manager_id, base.ship_id, base.costr, base.commessa, base.capo_id, base.unit, base.rapportino_row_id
        )
 SELECT year,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens
   FROM op_line
  GROUP BY year, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_year_v2" as  WITH base AS (
         SELECT (EXTRACT(year FROM f.report_date))::integer AS year,
            f.report_date,
            f.rapportino_id,
            f.capo_id,
            f.costr,
            f.commessa,
            f.ship_id,
            f.ship_code,
            f.ship_name,
            f.manager_id,
            f.rapportino_row_id,
            f.row_index,
            f.categoria,
            f.descrizione,
            f.attivita_id,
            f.activity_type,
            f.unit,
            f.operator_id,
            f.line_index,
            f.tempo_hours,
            f.sum_line_hours,
            f.n_tokens_total,
            f.n_tokens_invalid,
            f.n_tokens_zero,
            f.prodotto_row,
            f.prodotto_alloc
           FROM public.direzione_operator_facts_v1 f
          WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), op_line AS (
         SELECT b.year,
            b.operator_id,
            b.manager_id,
            b.ship_id,
            b.costr,
            b.commessa,
            b.capo_id,
            b.unit,
            b.rapportino_row_id,
            sum(b.tempo_hours) FILTER (WHERE ((b.tempo_hours IS NOT NULL) AND (b.tempo_hours > (0)::numeric))) AS hours_valid,
            sum(b.prodotto_alloc) FILTER (WHERE ((b.prodotto_alloc IS NOT NULL) AND (b.prodotto_alloc > (0)::numeric))) AS prodotto_alloc_sum,
            max(b.n_tokens_invalid) AS n_tokens_invalid,
            max(b.n_tokens_zero) AS n_tokens_zero,
            max(b.n_tokens_total) AS n_tokens_total,
            max(o.cognome) AS cognome,
            max(o.nome) AS nome,
            max(o.operator_code) AS operator_code,
            max(o.operator_key) AS operator_key,
            max(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE(o.cognome, ''::text) || ' '::text) || COALESCE(o.nome, ''::text))), ''::text), NULLIF(o.name, ''::text))) AS operator_name
           FROM (base b
             LEFT JOIN public.operators o ON ((o.id = b.operator_id)))
          GROUP BY b.year, b.operator_id, b.manager_id, b.ship_id, b.costr, b.commessa, b.capo_id, b.unit, b.rapportino_row_id
        )
 SELECT year,
    operator_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    capo_id,
    unit,
    sum(hours_valid) AS hours_valid,
    sum(prodotto_alloc_sum) AS prodotto_alloc_sum,
        CASE
            WHEN (sum(hours_valid) <= (0)::numeric) THEN NULL::numeric
            ELSE (sum(prodotto_alloc_sum) / sum(hours_valid))
        END AS productivity_index,
    sum(n_tokens_invalid) AS tempo_invalid_tokens,
    sum(n_tokens_zero) AS tempo_zero_tokens,
    sum(n_tokens_total) AS tempo_total_tokens,
    max(operator_name) AS operator_name,
    max(cognome) AS cognome,
    max(nome) AS nome,
    max(operator_code) AS operator_code,
    max(operator_key) AS operator_key
   FROM op_line
  GROUP BY year, operator_id, manager_id, ship_id, costr, commessa, capo_id, unit;


create or replace view "public"."direzione_operator_kpi_year_v3" as  WITH base AS (
         SELECT (EXTRACT(year FROM direzione_operator_facts_v4.report_date))::integer AS year,
            direzione_operator_facts_v4.report_date,
            direzione_operator_facts_v4.operator_id,
            direzione_operator_facts_v4.capo_id,
            direzione_operator_facts_v4.manager_id,
            direzione_operator_facts_v4.ship_id,
            direzione_operator_facts_v4.costr,
            direzione_operator_facts_v4.commessa,
            direzione_operator_facts_v4.unit,
            direzione_operator_facts_v4.tempo_hours,
            direzione_operator_facts_v4.previsto_alloc,
            direzione_operator_facts_v4.prodotto_alloc
           FROM public.direzione_operator_facts_v4
          WHERE (direzione_operator_facts_v4.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
        ), agg AS (
         SELECT base.year,
            base.operator_id,
            base.capo_id,
            base.manager_id,
            base.ship_id,
            base.costr,
            base.commessa,
            base.unit,
            count(*) AS tokens_total,
            count(*) FILTER (WHERE (base.tempo_hours IS NULL)) AS tokens_invalid,
            count(*) FILTER (WHERE (base.tempo_hours = (0)::numeric)) AS tokens_zero,
            count(*) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS tokens_ok,
            sum(base.previsto_alloc) FILTER (WHERE ((base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS previsto_sum,
            sum(base.prodotto_alloc) FILTER (WHERE ((base.prodotto_alloc IS NOT NULL) AND (base.prodotto_alloc > (0)::numeric) AND (base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS prodotto_sum,
            sum((((base.prodotto_alloc / NULLIF(base.previsto_alloc, (0)::numeric)) * (100)::numeric) * base.tempo_hours)) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric) AND (base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.prodotto_alloc IS NOT NULL))) AS pct_weighted_sum,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric) AND (base.previsto_alloc IS NOT NULL) AND (base.previsto_alloc > (0)::numeric) AND (base.prodotto_alloc IS NOT NULL))) AS pct_weight
           FROM base
          GROUP BY base.year, base.operator_id, base.capo_id, base.manager_id, base.ship_id, base.costr, base.commessa, base.unit
        )
 SELECT year,
    operator_id,
    capo_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    unit,
    previsto_sum,
    prodotto_sum,
    tokens_total,
    tokens_invalid,
    tokens_zero,
    tokens_ok,
        CASE
            WHEN ((pct_weight IS NULL) OR (pct_weight <= (0)::numeric)) THEN NULL::numeric
            ELSE (pct_weighted_sum / pct_weight)
        END AS productivity_pct
   FROM agg;


create or replace view "public"."inca_cavi_with_data_posa_v1" as  WITH posed AS (
         SELECT ric.inca_cavo_id,
            max(r.report_date) AS data_posa
           FROM (public.rapportino_inca_cavi ric
             JOIN public.rapportini r ON ((r.id = ric.rapportino_id)))
          WHERE (ric.step_type = 'POSA'::public.cavo_step_type)
          GROUP BY ric.inca_cavo_id
        )
 SELECT c.id,
    c.inca_file_id,
    c.costr,
    c.commessa,
    c.codice,
    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.descrizione_da,
    c.descrizione_a,
    c.metri_teo,
    c.metri_dis,
    c.metri_sit_cavo,
    c.metri_sit_tec,
    c.pagina_pdf,
    c.rev_inca,
    c.stato_inca,
    c.created_at,
    c.updated_at,
    c.situazione,
    c.from_file_id,
    c.metri_previsti,
    c.metri_posati_teorici,
    c.metri_totali,
    c.marca_cavo,
    c.livello,
    c.metri_sta,
    c.stato_tec,
    c.stato_cantiere,
    c.situazione_cavo,
    c.livello_disturbo,
    c.wbs,
    c.codice_inca,
    c.progress_percent,
    c.progress_side,
    posed.data_posa
   FROM (public.inca_cavi c
     LEFT JOIN posed ON ((posed.inca_cavo_id = c.id)));


create or replace view "public"."inca_cavi_with_last_posa_and_capo_v1" as  SELECT c.id,
    c.inca_file_id,
    c.costr,
    c.commessa,
    c.codice,
    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.descrizione_da,
    c.descrizione_a,
    c.metri_teo,
    c.metri_dis,
    c.metri_sit_cavo,
    c.metri_sit_tec,
    c.pagina_pdf,
    c.rev_inca,
    c.stato_inca,
    c.created_at,
    c.updated_at,
    c.situazione,
    c.from_file_id,
    c.metri_previsti,
    c.metri_posati_teorici,
    c.metri_totali,
    c.marca_cavo,
    c.livello,
    c.metri_sta,
    c.stato_tec,
    c.stato_cantiere,
    c.situazione_cavo,
    c.livello_disturbo,
    c.wbs,
    c.codice_inca,
    c.progress_percent,
    c.progress_side,
    lp.data_posa,
    r.capo_id,
    COALESCE(NULLIF(TRIM(BOTH FROM p.display_name), ''::text), NULLIF(TRIM(BOTH FROM p.full_name), ''::text), NULLIF(TRIM(BOTH FROM r.capo_name), ''::text)) AS capo_label
   FROM (((public.inca_cavi c
     LEFT JOIN LATERAL ( SELECT ric.posa_date AS data_posa,
            ric.rapportino_id
           FROM public.rapportino_inca_cavi ric
          WHERE ((ric.inca_cavo_id = c.id) AND (ric.posa_date IS NOT NULL) AND (ric.step_type = 'POSA'::public.cavo_step_type))
          ORDER BY ric.posa_date DESC, ric.updated_at DESC
         LIMIT 1) lp ON (true))
     LEFT JOIN public.rapportini r ON ((r.id = lp.rapportino_id)))
     LEFT JOIN public.profiles p ON ((p.id = r.capo_id)));


create or replace view "public"."inca_cavi_with_last_posa_v1" as  SELECT c.id,
    c.inca_file_id,
    c.costr,
    c.commessa,
    c.codice,
    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.descrizione_da,
    c.descrizione_a,
    c.metri_teo,
    c.metri_dis,
    c.metri_sit_cavo,
    c.metri_sit_tec,
    c.pagina_pdf,
    c.rev_inca,
    c.stato_inca,
    c.created_at,
    c.updated_at,
    c.situazione,
    c.from_file_id,
    c.metri_previsti,
    c.metri_posati_teorici,
    c.metri_totali,
    c.marca_cavo,
    c.livello,
    c.metri_sta,
    c.stato_tec,
    c.stato_cantiere,
    c.situazione_cavo,
    c.livello_disturbo,
    c.wbs,
    c.codice_inca,
    c.progress_percent,
    c.progress_side,
    lp.data_posa
   FROM (public.inca_cavi c
     LEFT JOIN ( SELECT ric.inca_cavo_id,
            max(ric.posa_date) AS data_posa
           FROM public.rapportino_inca_cavi ric
          WHERE ((ric.posa_date IS NOT NULL) AND (ric.step_type = 'POSA'::public.cavo_step_type))
          GROUP BY ric.inca_cavo_id) lp ON ((lp.inca_cavo_id = c.id)));


create or replace view "public"."inca_cavi_with_last_rapportino_v1" as  SELECT c.id,
    c.inca_file_id,
    c.costr,
    c.commessa,
    c.codice,
    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.descrizione_da,
    c.descrizione_a,
    c.metri_teo,
    c.metri_dis,
    c.metri_sit_cavo,
    c.metri_sit_tec,
    c.pagina_pdf,
    c.rev_inca,
    c.stato_inca,
    c.created_at,
    c.updated_at,
    c.situazione,
    c.from_file_id,
    c.metri_previsti,
    c.metri_posati_teorici,
    c.metri_totali,
    c.marca_cavo,
    c.livello,
    c.metri_sta,
    c.stato_tec,
    c.stato_cantiere,
    c.situazione_cavo,
    c.livello_disturbo,
    c.wbs,
    c.codice_inca,
    c.progress_percent,
    c.progress_side,
    lr.last_report_date,
    lr.last_capo_name
   FROM (public.inca_cavi c
     LEFT JOIN LATERAL ( SELECT r.report_date AS last_report_date,
            COALESCE(NULLIF(TRIM(BOTH FROM r.capo_name), ''::text), NULLIF(TRIM(BOTH FROM p.display_name), ''::text), NULLIF(TRIM(BOTH FROM p.full_name), ''::text)) AS last_capo_name
           FROM ((public.rapportino_cavi rc
             JOIN public.rapportini r ON ((r.id = rc.rapportino_id)))
             LEFT JOIN public.profiles p ON ((p.id = r.capo_id)))
          WHERE (rc.inca_cavo_id = c.id)
          ORDER BY r.report_date DESC NULLS LAST, r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST
         LIMIT 1) lr ON (true));


create or replace view "public"."inca_cavi_with_path" as  SELECT c.id,
    c.inca_file_id,
    c.costr,
    c.commessa,
    c.codice,
    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.descrizione_da,
    c.descrizione_a,
    c.metri_teo,
    c.metri_dis,
    c.metri_sit_cavo,
    c.metri_sit_tec,
    c.pagina_pdf,
    c.rev_inca,
    c.stato_inca,
    c.created_at,
    c.updated_at,
    p.percorso_supports
   FROM (public.inca_cavi c
     LEFT JOIN LATERAL ( SELECT array_agg(ip.nodo ORDER BY ip.ordine) AS percorso_supports
           FROM public.inca_percorsi ip
          WHERE (ip.inca_cavo_id = c.id)) p ON (true));


create or replace view "public"."inca_export_ufficio_v1" as  WITH events AS (
         SELECT ric.costr_cache AS costr,
            ric.commessa_cache AS commessa,
            ric.codice_cache AS codice,
            min(
                CASE
                    WHEN ((ric.step_type = 'POSA'::public.cavo_step_type) AND (ric.progress_percent >= (50)::numeric)) THEN ric.report_date_cache
                    ELSE NULL::date
                END) AS posa_first_date,
            max(
                CASE
                    WHEN ((ric.step_type = 'POSA'::public.cavo_step_type) AND (ric.progress_percent >= (50)::numeric)) THEN ric.report_date_cache
                    ELSE NULL::date
                END) AS posa_last_date,
            max(
                CASE
                    WHEN ((ric.step_type = 'RIPRESA'::public.cavo_step_type) AND (ric.progress_percent = (100)::numeric)) THEN ric.report_date_cache
                    ELSE NULL::date
                END) AS ripresa_date,
            max(
                CASE
                    WHEN (ric.step_type = 'POSA'::public.cavo_step_type) THEN COALESCE(ric.progress_percent, (0)::numeric)
                    ELSE (0)::numeric
                END) AS max_posa_percent,
            count(*) FILTER (WHERE (ric.step_type = 'RIPRESA'::public.cavo_step_type)) AS ripresa_count
           FROM (public.rapportino_inca_cavi ric
             JOIN public.rapportini r ON ((r.id = ric.rapportino_id)))
          WHERE ((r.status = ANY (ARRAY['VALIDATED_CAPO'::text, 'APPROVED_UFFICIO'::text])) AND (ric.costr_cache IS NOT NULL) AND (ric.codice_cache IS NOT NULL))
          GROUP BY ric.costr_cache, ric.commessa_cache, ric.codice_cache
        )
 SELECT c.id AS inca_cavo_id,
    c.inca_file_id,
    c.costr,
    c.commessa,
    c.codice,
    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.marca_cavo,
    c.livello,
    c.wbs,
    c.metri_teo,
    c.metri_dis,
    c.metri_previsti,
    c.metri_posati_teorici,
    c.metri_totali,
        CASE
            WHEN (e.posa_first_date IS NOT NULL) THEN 'P'::text
            ELSE COALESCE(c.situazione, 'NP'::text)
        END AS situazione_export,
    e.posa_first_date,
    e.posa_last_date,
    e.ripresa_date,
    e.max_posa_percent,
        CASE
            WHEN ((e.posa_first_date IS NOT NULL) AND (e.max_posa_percent < (100)::numeric) AND (e.ripresa_date IS NULL)) THEN true
            ELSE false
        END AS ripresa_required,
    e.ripresa_count
   FROM (public.inca_cavi c
     LEFT JOIN events e ON (((e.costr = c.costr) AND (((e.commessa IS NULL) AND (c.commessa IS NULL)) OR (e.commessa = c.commessa)) AND (e.codice = c.codice))));


create or replace view "public"."inca_latest_file_by_ship_v1" as  SELECT DISTINCT ON (ship_id) ship_id,
    id AS inca_file_id,
    uploaded_at
   FROM public.inca_files f
  WHERE (ship_id IS NOT NULL)
  ORDER BY ship_id, uploaded_at DESC NULLS LAST, id DESC;


create or replace view "public"."inca_percorsi_nodes_v1" as  SELECT upper(btrim(nodo)) AS nodo,
    (count(*))::integer AS occorrenze
   FROM public.inca_percorsi
  WHERE ((nodo IS NOT NULL) AND (btrim(nodo) <> ''::text))
  GROUP BY (upper(btrim(nodo)))
  ORDER BY ((count(*))::integer) DESC, (upper(btrim(nodo)));


create or replace view "public"."inca_percorsi_v1" as  SELECT id,
    inca_cavo_id,
    ordine,
    nodo,
    page,
    raw_kind,
    created_at
   FROM public.inca_percorsi;


create or replace view "public"."inca_prev_file_by_ship_v1" as  WITH ranked AS (
         SELECT f.ship_id,
            f.id AS inca_file_id,
            f.uploaded_at,
            row_number() OVER (PARTITION BY f.ship_id ORDER BY f.uploaded_at DESC, f.id DESC) AS rn
           FROM public.inca_files f
          WHERE (f.ship_id IS NOT NULL)
        )
 SELECT a.ship_id,
    a.inca_file_id AS last_inca_file_id,
    b.inca_file_id AS prev_inca_file_id
   FROM (ranked a
     LEFT JOIN ranked b ON (((b.ship_id = a.ship_id) AND (b.rn = 2))))
  WHERE (a.rn = 1);


create or replace view "public"."inca_rows" as  SELECT id,
    inca_file_id,
    costr,
    commessa,
    codice,
    rev_inca,
    NULL::text AS livello,
    COALESCE(zona_da, zona_a) AS zona,
    tipo,
    sezione,
    metri_teo AS metri_teorici,
    metri_totali,
    metri_previsti,
    metri_posati_teorici,
    stato_inca,
    zona_da,
    zona_a,
    apparato_da,
    apparato_a,
    descrizione,
    updated_at
   FROM public.inca_cavi c;


create or replace view "public"."kpi_operator_daily_v1" as  SELECT f.report_date,
    f.operator_id,
    concat(upper(o.cognome), ' ', initcap(o.nome)) AS operator_name,
    count(DISTINCT f.rapportino_row_id) AS n_lines,
    count(*) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS n_valid_time_lines,
    count(*) FILTER (WHERE ((f.tempo_hours IS NULL) OR (f.tempo_hours <= (0)::numeric))) AS n_invalid_time_lines,
    sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS total_hours,
    count(*) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))) AS n_alloc_lines,
    sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))) AS total_prodotto_alloc,
    count(*) AS n_tokens_total,
    sum(f.n_tokens_invalid) AS tempo_invalid_tokens,
    sum(f.n_tokens_zero) AS tempo_zero_tokens,
        CASE
            WHEN (sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) > (0)::numeric) THEN (sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))) / sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))))
            ELSE NULL::numeric
        END AS productivity_index
   FROM (public.direzione_operator_facts_v1 f
     JOIN public.operators o ON ((o.id = f.operator_id)))
  WHERE (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
  GROUP BY f.report_date, f.operator_id, o.cognome, o.nome;


create or replace view "public"."kpi_operator_line_previsto_v2" as  SELECT f.report_date,
    f.operator_id,
    COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, upper(o.cognome), initcap(o.nome))), ''::text), NULLIF(TRIM(BOTH FROM o.name), ''::text), '—'::text) AS operator_name,
    f.manager_id,
    f.capo_id,
    f.ship_id,
    f.ship_code,
    f.ship_name,
    NULLIF(TRIM(BOTH FROM f.costr), ''::text) AS costr,
    NULLIF(TRIM(BOTH FROM f.commessa), ''::text) AS commessa,
    f.rapportino_id,
    f.rapportino_row_id,
    f.row_index,
    NULLIF(TRIM(BOTH FROM f.categoria), ''::text) AS categoria,
    NULLIF(TRIM(BOTH FROM f.descrizione), ''::text) AS descrizione,
    f.activity_type,
    f.unit,
    f.tempo_hours,
    f.sum_line_hours,
    f.prodotto_row,
    f.prodotto_alloc,
    rr.previsto,
        CASE
            WHEN ((rr.previsto IS NULL) OR (rr.previsto <= (0)::numeric)) THEN NULL::numeric
            WHEN ((f.tempo_hours IS NULL) OR (f.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.previsto * (f.tempo_hours / (8)::numeric))
        END AS previsto_eff,
        CASE
            WHEN ((rr.previsto IS NULL) OR (rr.previsto <= (0)::numeric)) THEN NULL::numeric
            WHEN ((f.tempo_hours IS NULL) OR (f.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((rr.previsto * (f.tempo_hours / (8)::numeric)) <= (0)::numeric) THEN NULL::numeric
            WHEN (f.prodotto_alloc IS NULL) THEN NULL::numeric
            ELSE (f.prodotto_alloc / (rr.previsto * (f.tempo_hours / (8)::numeric)))
        END AS indice_line
   FROM ((public.direzione_operator_facts_v1 f
     JOIN public.operators o ON ((o.id = f.operator_id)))
     LEFT JOIN public.rapportino_rows rr ON ((rr.id = f.rapportino_row_id)))
  WHERE ((f.activity_type = 'QUANTITATIVE'::public.activity_type) AND (f.unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit])) AND (rr.previsto IS NOT NULL) AND (rr.previsto > (0)::numeric) AND (f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric) AND (f.prodotto_alloc IS NOT NULL));


create or replace view "public"."kpi_operator_line_v1" as  WITH base AS (
         SELECT rap.id AS rapportino_id,
            rap.report_date,
            rap.capo_id,
            rr.id AS rapportino_row_id,
            rr.row_index,
            rr.categoria,
            rr.descrizione,
            rr.prodotto AS row_prodotto,
            ro.operator_id,
            COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, o.cognome, o.nome)), ''::text), o.name, '—'::text) AS operator_name,
            ro.line_index,
            ro.tempo_raw,
            ro.tempo_hours
           FROM (((public.rapportini rap
             JOIN public.rapportino_rows rr ON ((rr.rapportino_id = rap.id)))
             JOIN public.rapportino_row_operators ro ON ((ro.rapportino_row_id = rr.id)))
             JOIN public.operators o ON ((o.id = ro.operator_id)))
        ), row_totals AS (
         SELECT base.rapportino_row_id,
            sum(base.tempo_hours) FILTER (WHERE ((base.tempo_hours IS NOT NULL) AND (base.tempo_hours > (0)::numeric))) AS row_hours_valid
           FROM base
          GROUP BY base.rapportino_row_id
        )
 SELECT b.rapportino_id,
    b.report_date,
    b.capo_id,
    b.rapportino_row_id,
    b.row_index,
    b.categoria,
    b.descrizione,
    b.row_prodotto,
    b.operator_id,
    b.operator_name,
    b.line_index,
    b.tempo_raw,
    b.tempo_hours,
    rt.row_hours_valid,
        CASE
            WHEN (b.row_prodotto IS NULL) THEN NULL::numeric
            WHEN ((rt.row_hours_valid IS NULL) OR (rt.row_hours_valid <= (0)::numeric)) THEN NULL::numeric
            WHEN ((b.tempo_hours IS NULL) OR (b.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (b.row_prodotto * (b.tempo_hours / rt.row_hours_valid))
        END AS prodotto_alloc
   FROM (base b
     LEFT JOIN row_totals rt ON ((rt.rapportino_row_id = b.rapportino_row_id)));


create or replace view "public"."kpi_operator_productivity_daily_v1" as  WITH line AS (
         SELECT l.report_date,
            l.operator_id,
            l.rapportino_id,
            l.rapportino_row_id,
            l.tempo_hours,
            l.row_hours_valid,
            l.prodotto_alloc
           FROM public.kpi_operator_line_v1 l
        ), rows AS (
         SELECT rr.id AS rapportino_row_id,
            rr.rapportino_id,
            rr.previsto
           FROM public.rapportino_rows rr
        ), rap AS (
         SELECT r.id AS rapportino_id,
            r.costr,
            r.commessa
           FROM public.rapportini r
        ), alloc AS (
         SELECT l.report_date,
            l.operator_id,
            COALESCE(NULLIF(TRIM(BOTH FROM rap.costr), ''::text), NULL::text) AS costr,
            COALESCE(NULLIF(TRIM(BOTH FROM rap.commessa), ''::text), NULL::text) AS commessa,
                CASE
                    WHEN ((l.tempo_hours IS NOT NULL) AND (l.tempo_hours > (0)::numeric)) THEN l.prodotto_alloc
                    ELSE NULL::numeric
                END AS prodotto_alloc,
                CASE
                    WHEN ((l.tempo_hours IS NOT NULL) AND (l.tempo_hours > (0)::numeric) AND (l.row_hours_valid IS NOT NULL) AND (l.row_hours_valid > (0)::numeric) AND (rr.previsto IS NOT NULL)) THEN (rr.previsto * (l.tempo_hours / l.row_hours_valid))
                    ELSE NULL::numeric
                END AS previsto_alloc
           FROM ((line l
             LEFT JOIN rows rr ON (((rr.rapportino_row_id = l.rapportino_row_id) AND (rr.rapportino_id = l.rapportino_id))))
             LEFT JOIN rap ON ((rap.rapportino_id = l.rapportino_id)))
        ), ship_map AS (
         SELECT s.id AS ship_id,
            NULLIF(TRIM(BOTH FROM s.code), ''::text) AS ship_code
           FROM public.ships s
        ), ship_mgr AS (
         SELECT sm.ship_id,
            sm.manager_id
           FROM public.ship_managers sm
        ), with_mgr AS (
         SELECT a.report_date,
            a.operator_id,
            a.costr,
            a.commessa,
            sm.manager_id,
            a.previsto_alloc,
            a.prodotto_alloc
           FROM ((alloc a
             LEFT JOIN ship_map m ON ((m.ship_code = a.costr)))
             LEFT JOIN ship_mgr sm ON ((sm.ship_id = m.ship_id)))
        )
 SELECT report_date,
    operator_id,
    manager_id,
    costr,
    commessa,
    sum(previsto_alloc) AS previsto_alloc_sum,
    sum(prodotto_alloc) AS prodotto_alloc_sum,
        CASE
            WHEN (sum(previsto_alloc) > (0)::numeric) THEN ((sum(prodotto_alloc) / sum(previsto_alloc)) * (100)::numeric)
            ELSE NULL::numeric
        END AS productivity_pct
   FROM with_mgr
  GROUP BY report_date, operator_id, manager_id, costr, commessa;


create or replace view "public"."manager_my_capi_v1" as  SELECT c.id AS capo_id,
    c.email AS capo_email,
    c.display_name AS capo_display_name,
    a.created_at AS assigned_at
   FROM (public.manager_capo_assignments a
     JOIN public.profiles c ON ((c.id = a.capo_id)))
  WHERE ((a.active = true) AND (a.manager_id = auth.uid()) AND (c.app_role = 'CAPO'::text));


CREATE OR REPLACE FUNCTION public.nav_status_from_text(x text)
 RETURNS public.nav_status
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case upper(trim(coalesce(x, '')))
    when 'P'  then 'P'::public.nav_status
    when 'R'  then 'R'::public.nav_status
    when 'T'  then 'T'::public.nav_status
    when 'B'  then 'B'::public.nav_status
    when 'E'  then 'E'::public.nav_status
    when 'NP' then 'NP'::public.nav_status
    else 'NP'::public.nav_status
  end
$function$
;

create or replace view "public"."navemaster_active_inca_file_v1" as  WITH ranked AS (
         SELECT inca_files.ship_id,
            inca_files.id AS inca_file_id,
            inca_files.uploaded_at,
            row_number() OVER (PARTITION BY inca_files.ship_id ORDER BY inca_files.uploaded_at DESC) AS rn
           FROM public.inca_files
          WHERE (inca_files.file_type = 'XLSX'::text)
        )
 SELECT r1.ship_id,
    r1.inca_file_id,
    r1.uploaded_at,
    r2.inca_file_id AS prev_inca_file_id,
    r2.uploaded_at AS prev_uploaded_at
   FROM (ranked r1
     LEFT JOIN ranked r2 ON (((r2.ship_id = r1.ship_id) AND (r2.rn = 2))))
  WHERE (r1.rn = 1);


create or replace view "public"."navemaster_inca_cavi_current_v1" as  WITH latest AS (
         SELECT DISTINCT ON (inca_files.ship_id, inca_files.costr, inca_files.commessa) inca_files.id AS inca_file_id,
            inca_files.ship_id,
            inca_files.costr,
            inca_files.commessa,
            inca_files.uploaded_at AS inca_uploaded_at,
            inca_files.file_name,
            inca_files.file_path,
            inca_files.file_type
           FROM public.inca_files
          WHERE ((inca_files.file_type IS NULL) OR (inca_files.file_type = 'XLSX'::text))
          ORDER BY inca_files.ship_id, inca_files.costr, inca_files.commessa, inca_files.uploaded_at DESC NULLS LAST, inca_files.id DESC
        )
 SELECT l.ship_id,
    l.costr,
    l.commessa,
    l.inca_file_id,
    l.inca_uploaded_at,
    l.file_name AS inca_file_name,
    l.file_path AS inca_file_path,
    l.file_type AS inca_file_type,
    c.codice AS marcacavo,
    c.codice_inca,
    c.tipo,
    c.situazione,
    c.metri_teo,
    c.metri_dis,
    c.descrizione,
    c.impianto,
    c.stato_cantiere
   FROM (latest l
     JOIN public.inca_cavi c ON ((c.inca_file_id = l.inca_file_id)));


create or replace view "public"."navemaster_inca_latest_file_v1" as  SELECT DISTINCT ON (ship_id, costr, commessa) id AS inca_file_id,
    ship_id,
    costr,
    commessa,
    uploaded_at,
    file_name,
    file_path,
    file_type
   FROM public.inca_files
  WHERE ((file_type IS NULL) OR (file_type = 'XLSX'::text))
  ORDER BY ship_id, costr, commessa, uploaded_at DESC NULLS LAST, id DESC;


create or replace view "public"."navemaster_inca_live_by_file_v1" as  WITH files AS (
         SELECT f.id AS inca_file_id,
            f.ship_id,
            f.uploaded_at,
            ( SELECT p.id
                   FROM public.inca_files p
                  WHERE ((p.ship_id = f.ship_id) AND (p.file_type = 'XLSX'::text) AND (p.uploaded_at < f.uploaded_at))
                  ORDER BY p.uploaded_at DESC
                 LIMIT 1) AS prev_inca_file_id
           FROM public.inca_files f
          WHERE (f.file_type = 'XLSX'::text)
        )
 SELECT f.ship_id,
    f.inca_file_id,
    f.uploaded_at AS snapshot_at,
    c.id AS inca_cavo_id,
    c.codice AS marcacavo,
    false AS marcacavo_asteriscato,
    c.descrizione,
    COALESCE(NULLIF(TRIM(BOTH FROM c.situazione), ''::text), 'NP'::text) AS stato_cantiere,
    c.livello,
    c.sezione,
    c.metri_teo AS metri_old,
    c.metri_dis AS metri_new,
    (COALESCE(c.metri_dis, (0)::numeric) - COALESCE(c.metri_teo, (0)::numeric)) AS diff_mt,
    c.apparato_da AS app_part,
    c.apparato_a AS app_arr,
    c.zona_da AS pt_part,
    c.zona_a AS pt_arr
   FROM (files f
     JOIN public.inca_cavi c ON ((c.inca_file_id = f.inca_file_id)))
UNION ALL
 SELECT f.ship_id,
    f.inca_file_id,
    f.uploaded_at AS snapshot_at,
    NULL::uuid AS inca_cavo_id,
    pc.codice AS marcacavo,
    true AS marcacavo_asteriscato,
    pc.descrizione,
    'MISSING'::text AS stato_cantiere,
    pc.livello,
    pc.sezione,
    pc.metri_teo AS metri_old,
    pc.metri_dis AS metri_new,
    NULL::numeric AS diff_mt,
    pc.apparato_da AS app_part,
    pc.apparato_a AS app_arr,
    pc.zona_da AS pt_part,
    pc.zona_a AS pt_arr
   FROM (files f
     JOIN public.inca_cavi pc ON ((pc.inca_file_id = f.prev_inca_file_id)))
  WHERE ((f.prev_inca_file_id IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
           FROM public.inca_cavi cc
          WHERE ((cc.inca_file_id = f.inca_file_id) AND (cc.codice = pc.codice))))));


create or replace view "public"."navemaster_inca_live_v1" as  WITH active AS (
         SELECT navemaster_active_inca_file_v1.ship_id,
            navemaster_active_inca_file_v1.inca_file_id,
            navemaster_active_inca_file_v1.uploaded_at,
            navemaster_active_inca_file_v1.prev_inca_file_id
           FROM public.navemaster_active_inca_file_v1
          WHERE (navemaster_active_inca_file_v1.inca_file_id IS NOT NULL)
        )
 SELECT a.ship_id,
    a.inca_file_id,
    a.uploaded_at AS snapshot_at,
    c.id AS inca_cavo_id,
    c.codice AS marcacavo,
    false AS marcacavo_asteriscato,
    c.descrizione,
    COALESCE(NULLIF(TRIM(BOTH FROM c.situazione), ''::text), 'NP'::text) AS stato_cantiere,
    c.livello,
    c.sezione,
    c.metri_teo AS metri_old,
    c.metri_dis AS metri_new,
    (COALESCE(c.metri_dis, (0)::numeric) - COALESCE(c.metri_teo, (0)::numeric)) AS diff_mt,
    c.apparato_da AS app_part,
    c.apparato_a AS app_arr,
    c.zona_da AS pt_part,
    c.zona_a AS pt_arr
   FROM (active a
     JOIN public.inca_cavi c ON ((c.inca_file_id = a.inca_file_id)))
UNION ALL
 SELECT a.ship_id,
    a.inca_file_id,
    a.uploaded_at AS snapshot_at,
    NULL::uuid AS inca_cavo_id,
    pc.codice AS marcacavo,
    true AS marcacavo_asteriscato,
    pc.descrizione,
    'MISSING'::text AS stato_cantiere,
    pc.livello,
    pc.sezione,
    pc.metri_teo AS metri_old,
    pc.metri_dis AS metri_new,
    NULL::numeric AS diff_mt,
    pc.apparato_da AS app_part,
    pc.apparato_a AS app_arr,
    pc.zona_da AS pt_part,
    pc.zona_a AS pt_arr
   FROM (active a
     JOIN public.inca_cavi pc ON ((pc.inca_file_id = a.prev_inca_file_id)))
  WHERE ((a.prev_inca_file_id IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
           FROM public.inca_cavi cc
          WHERE ((cc.inca_file_id = a.inca_file_id) AND (cc.codice = pc.codice))))));


create or replace view "public"."navemaster_latest_import_v1" as  SELECT id,
    ship_id,
    costr,
    commessa,
    file_name,
    file_bucket,
    file_path,
    source_sha256,
    note,
    imported_by,
    imported_at,
    is_active
   FROM public.navemaster_imports i
  WHERE (is_active = true);


create or replace view "public"."operators_admin_list_v1" as  SELECT id,
    name AS legacy_name,
    COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, cognome, nome)), ''::text), NULLIF(TRIM(BOTH FROM name), ''::text), '—'::text) AS display_name,
    roles,
    cognome,
    nome,
    birth_date,
    operator_code,
    operator_key,
    created_by,
    created_at,
    updated_at,
    ((cognome IS NULL) OR (TRIM(BOTH FROM cognome) = ''::text) OR (nome IS NULL) OR (TRIM(BOTH FROM nome) = ''::text) OR (birth_date IS NULL)) AS is_identity_incomplete
   FROM public.operators o;


create or replace view "public"."operators_display_v1" as  SELECT id,
    name AS legacy_name,
    roles,
    cognome,
    nome,
    birth_date,
    operator_code,
    COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, cognome, nome)), ''::text), NULLIF(TRIM(BOTH FROM name), ''::text), '—'::text) AS display_name,
    created_by,
    created_at,
    updated_at
   FROM public.operators o;


create or replace view "public"."operators_display_v2" as  SELECT id,
    cognome,
    nome,
    birth_date,
    operator_code,
    operator_key,
    is_normalized,
    COALESCE(NULLIF(TRIM(BOTH FROM ((cognome || ' '::text) || nome)), ''::text), NULLIF(name, ''::text), NULLIF(operator_code, ''::text), NULLIF(operator_key, ''::text), '—'::text) AS display_name
   FROM public.operators o;


create or replace view "public"."percorso_documents_stats_v1" as  SELECT d.id AS document_id,
    count(DISTINCT c.id) AS cables_count,
    count(s.*) AS segments_count
   FROM ((public.percorso_documents d
     LEFT JOIN public.percorso_cables c ON ((c.document_id = d.id)))
     LEFT JOIN public.percorso_cable_segments s ON ((s.cable_id = c.id)))
  GROUP BY d.id;


create or replace view "public"."rapportini_canon_v1" as  SELECT id,
    COALESCE(report_date, data) AS report_date,
    capo_id,
    user_id,
    status,
    NULLIF(TRIM(BOTH FROM costr), ''::text) AS costr,
    NULLIF(TRIM(BOTH FROM commessa), ''::text) AS commessa,
    COALESCE(prodotto_totale, prodotto_tot, totale_prodotto) AS prodotto_totale,
    created_at,
    updated_at
   FROM public.rapportini r;


create or replace view "public"."rapportini_norm_v1" as  SELECT id AS rapportino_id,
    report_date,
    status,
    capo_id,
    NULLIF(TRIM(BOTH FROM costr), ''::text) AS costr_raw,
    NULLIF(TRIM(BOTH FROM commessa), ''::text) AS commessa_raw,
    NULLIF(NULLIF(TRIM(BOTH FROM commessa), ''::text), '-'::text) AS commessa_norm,
    NULLIF(TRIM(BOTH FROM costr), ''::text) AS costr_norm
   FROM public.rapportini r;


create or replace view "public"."rapportini_with_capo_v1" as  SELECT r.id,
    r.data,
    r.capo_id,
    r.capo_name,
    r.status,
    r.cost,
    r.commessa,
    r.totale_prodotto,
    r.ufficio_note,
    r.validated_by_capo_at,
    r.approved_by_ufficio_at,
    r.approved_by_ufficio,
    r.returned_by_ufficio_at,
    r.returned_by_ufficio,
    r.created_at,
    r.updated_at,
    r.user_id,
    r.crew_role,
    r.report_date,
    r.prodotto_tot,
    r.note_ufficio,
    r.costr,
    r.prodotto_totale,
    p.display_name AS capo_display_name,
    p.email AS capo_email,
    p.app_role AS capo_app_role
   FROM (public.rapportini r
     LEFT JOIN public.profiles p ON ((p.id = r.capo_id)));


create or replace view "public"."ships_norm_v1" as  SELECT id AS ship_id,
    NULLIF(TRIM(BOTH FROM costr), ''::text) AS costr_raw,
    NULLIF(TRIM(BOTH FROM commessa), ''::text) AS commessa_raw,
    NULLIF(NULLIF(TRIM(BOTH FROM commessa), ''::text), '-'::text) AS commessa_norm,
    NULLIF(TRIM(BOTH FROM costr), ''::text) AS costr_norm,
    code AS ship_code,
    name AS ship_name,
    is_active,
    created_at
   FROM public.ships s;


create or replace view "public"."ufficio_rapportini_list_v1" as  SELECT r.id,
    r.report_date,
    r.status,
    r.capo_id,
    r.crew_role,
    r.commessa,
    r.totale_prodotto,
    r.prodotto_totale,
    r.prodotto_tot,
    r.created_at,
    r.updated_at,
    r.supersedes_rapportino_id,
    r.superseded_by_rapportino_id,
    r.correction_reason,
    r.correction_created_by,
    r.correction_created_at,
    p.display_name AS capo_display_name,
    p.email AS capo_email,
    p.app_role AS capo_app_role
   FROM (public.rapportini r
     LEFT JOIN public.profiles p ON ((p.id = r.capo_id)));


create or replace view "public"."capo_my_team_v2" as  SELECT m.operator_id,
    s.capo_id,
    p.id AS plan_id,
    od.display_name AS operator_display_name,
    od.cognome,
    od.nome,
    m."position" AS operator_position,
    s.id AS slot_id
   FROM (((public.manager_plans p
     JOIN public.plan_capo_slots s ON ((s.plan_id = p.id)))
     JOIN public.plan_slot_members m ON ((m.slot_id = s.id)))
     JOIN public.operators_display_v1 od ON ((od.id = m.operator_id)))
  WHERE ((p.period_type = 'DAY'::public.plan_period_type) AND (p.plan_date = CURRENT_DATE) AND (p.status = ANY (ARRAY['PUBLISHED'::public.plan_status, 'FROZEN'::public.plan_status])) AND (s.capo_id = auth.uid()));


create or replace view "public"."direzione_operator_facts_v2" as  SELECT report_date,
    rapportino_id,
    capo_id,
    costr,
    commessa,
    ship_id,
    ship_code,
    ship_name,
    ship_match_mode,
    manager_id,
    rapportino_row_id,
    row_index,
    categoria,
    descrizione,
    attivita_id,
    activity_type,
    unit,
    operator_id,
    line_index,
    NULL::text AS tempo_raw,
    tempo_hours,
    sum_line_hours,
    n_tokens_total,
    n_tokens_invalid,
    n_tokens_zero,
    previsto_row,
    prodotto_row,
    prodotto_alloc,
    previsto_alloc
   FROM public.direzione_operator_facts_v3;


create or replace view "public"."inca_cavi_live_by_ship_v1" as  SELECT lf.ship_id,
    c.id,
    c.inca_file_id,
    c.costr,
    c.commessa,
    c.codice,
    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.descrizione_da,
    c.descrizione_a,
    c.metri_teo,
    c.metri_dis,
    c.metri_sit_cavo,
    c.metri_sit_tec,
    c.pagina_pdf,
    c.rev_inca,
    c.stato_inca,
    c.created_at,
    c.updated_at,
    c.situazione,
    c.from_file_id,
    c.metri_previsti,
    c.metri_posati_teorici,
    c.metri_totali,
    c.marca_cavo,
    c.livello,
    c.metri_sta,
    c.stato_tec,
    c.stato_cantiere,
    c.situazione_cavo,
    c.livello_disturbo,
    c.wbs,
    c.codice_inca,
    c.progress_percent,
    c.progress_side
   FROM (public.inca_latest_file_by_ship_v1 lf
     JOIN public.inca_cavi c ON ((c.inca_file_id = lf.inca_file_id)));


create or replace view "public"."kpi_operator_day_v1" as  SELECT f.report_date,
    f.operator_id,
    od.cognome,
    od.nome,
    sum(f.tempo_hours) AS ore,
    sum(f.prodotto_alloc) AS prodotto,
        CASE
            WHEN (sum(f.tempo_hours) > (0)::numeric) THEN (sum(f.prodotto_alloc) / sum(f.tempo_hours))
            ELSE NULL::numeric
        END AS productivity_index
   FROM (public.direzione_operator_facts_v1 f
     JOIN public.operators_display_v1 od ON ((od.id = f.operator_id)))
  GROUP BY f.report_date, f.operator_id, od.cognome, od.nome;


create or replace view "public"."kpi_operator_family_day_v2" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    costr,
    commessa,
    categoria,
    descrizione,
    count(DISTINCT rapportino_row_id) AS n_lines,
    sum(tempo_hours) AS total_hours_indexed,
    sum(previsto_eff) AS total_previsto_eff,
    sum(prodotto_alloc) AS total_prodotto_alloc,
        CASE
            WHEN (sum(previsto_eff) > (0)::numeric) THEN (sum(prodotto_alloc) / sum(previsto_eff))
            ELSE NULL::numeric
        END AS productivity_index
   FROM public.kpi_operator_line_previsto_v2 l
  GROUP BY report_date, operator_id, operator_name, manager_id, costr, commessa, categoria, descrizione;


create or replace view "public"."kpi_operator_family_day_v3" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    capo_id,
    costr,
    commessa,
    categoria,
    descrizione,
    (count(DISTINCT rapportino_row_id))::integer AS n_lines,
    sum(tempo_hours) AS total_hours_indexed,
    sum(previsto_eff) AS total_previsto_eff,
    sum(prodotto_alloc) AS total_prodotto_alloc,
        CASE
            WHEN (sum(previsto_eff) > (0)::numeric) THEN (sum(prodotto_alloc) / sum(previsto_eff))
            ELSE NULL::numeric
        END AS productivity_index
   FROM public.kpi_operator_line_previsto_v2 l
  GROUP BY report_date, operator_id, operator_name, manager_id, capo_id, costr, commessa, categoria, descrizione;


create or replace view "public"."kpi_operator_family_day_v3_capo_safe" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    capo_id,
    costr,
    commessa,
    categoria,
    descrizione,
    n_lines,
    total_hours_indexed,
    total_previsto_eff,
    total_prodotto_alloc,
    productivity_index
   FROM public.kpi_operator_family_day_v3
  WHERE (capo_id = auth.uid());


create or replace view "public"."kpi_operator_family_day_v3_manager_safe" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    capo_id,
    costr,
    commessa,
    categoria,
    descrizione,
    n_lines,
    total_hours_indexed,
    total_previsto_eff,
    total_prodotto_alloc,
    productivity_index
   FROM public.kpi_operator_family_day_v3
  WHERE (manager_id = auth.uid());


create or replace view "public"."kpi_operator_global_day_v2" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    costr,
    commessa,
    count(DISTINCT rapportino_row_id) AS n_lines,
    sum(tempo_hours) AS total_hours_indexed,
    sum(previsto_eff) AS total_previsto_eff,
    sum(prodotto_alloc) AS total_prodotto_alloc,
        CASE
            WHEN (sum(previsto_eff) > (0)::numeric) THEN (sum(prodotto_alloc) / sum(previsto_eff))
            ELSE NULL::numeric
        END AS productivity_index
   FROM public.kpi_operator_line_previsto_v2 l
  GROUP BY report_date, operator_id, operator_name, manager_id, costr, commessa;


create or replace view "public"."kpi_operator_global_day_v3" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    capo_id,
    costr,
    commessa,
    (count(DISTINCT rapportino_row_id))::integer AS n_lines,
    sum(tempo_hours) AS total_hours_indexed,
    sum(previsto_eff) AS total_previsto_eff,
    sum(prodotto_alloc) AS total_prodotto_alloc,
        CASE
            WHEN (sum(previsto_eff) > (0)::numeric) THEN (sum(prodotto_alloc) / sum(previsto_eff))
            ELSE NULL::numeric
        END AS productivity_index
   FROM public.kpi_operator_line_previsto_v2 l
  GROUP BY report_date, operator_id, operator_name, manager_id, capo_id, costr, commessa;


create or replace view "public"."kpi_operator_global_day_v3_capo_safe" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    capo_id,
    costr,
    commessa,
    n_lines,
    total_hours_indexed,
    total_previsto_eff,
    total_prodotto_alloc,
    productivity_index
   FROM public.kpi_operator_global_day_v3
  WHERE (capo_id = auth.uid());


create or replace view "public"."kpi_operator_global_day_v3_manager_safe" as  SELECT report_date,
    operator_id,
    operator_name,
    manager_id,
    capo_id,
    costr,
    commessa,
    n_lines,
    total_hours_indexed,
    total_previsto_eff,
    total_prodotto_alloc,
    productivity_index
   FROM public.kpi_operator_global_day_v3
  WHERE (manager_id = auth.uid());


create or replace view "public"."navemaster_inca_latest_alerts_v1" as  SELECT lf.ship_id,
    lf.costr,
    lf.commessa,
    lf.inca_file_id,
    a.id,
    a.marcacavo,
    a.rule,
    a.severity,
    a.meta,
    a.created_at,
    a.navemaster_state,
    a.inca_state
   FROM (public.navemaster_inca_latest_file_v1 lf
     JOIN public.navemaster_inca_alerts a ON ((a.inca_file_id = lf.inca_file_id)));


create or replace view "public"."navemaster_inca_latest_diff_v1" as  SELECT lf.ship_id,
    lf.costr,
    lf.commessa,
    lf.inca_file_id,
    d.id,
    d.marcacavo,
    d.rule,
    d.severity,
    d.prev_value,
    d.new_value,
    d.meta,
    d.created_at,
    d.nav_status,
    d.inca_status_prev,
    d.inca_status_new,
    d.match_prev,
    d.match_new
   FROM (public.navemaster_inca_latest_file_v1 lf
     JOIN public.navemaster_inca_diff d ON ((d.inca_file_id = lf.inca_file_id)));


create or replace view "public"."navemaster_live_v1" as  SELECT nm.ship_id,
    nm.id AS navemaster_import_id,
    nm.imported_at AS navemaster_imported_at,
    r.id AS navemaster_row_id,
    r.marcacavo,
    r.descrizione,
    r.stato_cavo,
    r.situazione_cavo_conit,
    r.livello,
    r.sezione,
    r.tipologia,
    r.zona_da,
    r.zona_a,
    r.apparato_da,
    r.apparato_a,
    r.impianto,
    r.payload,
    ic.id AS inca_cavo_id,
    ic.inca_file_id,
    ic.situazione AS situazione_inca,
    ic.metri_teo AS metri_teo_inca,
    ic.metri_dis AS metri_dis_inca,
    ic.updated_at AS inca_updated_at
   FROM ((public.navemaster_latest_import_v1 nm
     JOIN public.navemaster_rows r ON ((r.navemaster_import_id = nm.id)))
     LEFT JOIN public.inca_cavi_live_by_ship_v1 ic ON (((ic.ship_id = nm.ship_id) AND (ic.codice = r.marcacavo))));


create or replace view "public"."operator_facts_v1" as  WITH rc AS (
         SELECT rapportini_canon_v1.id,
            rapportini_canon_v1.report_date,
            rapportini_canon_v1.capo_id,
            rapportini_canon_v1.user_id,
            rapportini_canon_v1.status,
            rapportini_canon_v1.costr,
            rapportini_canon_v1.commessa,
            rapportini_canon_v1.prodotto_totale,
            rapportini_canon_v1.created_at,
            rapportini_canon_v1.updated_at
           FROM public.rapportini_canon_v1
          WHERE (rapportini_canon_v1.report_date IS NOT NULL)
        ), rr AS (
         SELECT rrr.id AS row_id,
            rrr.rapportino_id,
            rrr.row_index,
            rrr.prodotto
           FROM public.rapportino_rows rrr
        ), rro AS (
         SELECT ro.id AS token_id,
            ro.rapportino_row_id AS row_id,
            ro.operator_id,
            ro.tempo_hours,
            ro.tempo_raw
           FROM public.rapportino_row_operators ro
          WHERE (ro.operator_id IS NOT NULL)
        ), row_hours AS (
         SELECT rro_1.row_id,
            sum(rro_1.tempo_hours) FILTER (WHERE ((rro_1.tempo_hours IS NOT NULL) AND (rro_1.tempo_hours > (0)::numeric))) AS sum_row_hours
           FROM rro rro_1
          GROUP BY rro_1.row_id
        ), ops AS (
         SELECT o.id AS operator_id,
            COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, o.cognome, o.nome)), ''::text), NULLIF(TRIM(BOTH FROM o.name), ''::text), '—'::text) AS operator_display_name,
            o.operator_code,
            o.operator_key,
            o.cognome,
            o.nome
           FROM public.operators o
        )
 SELECT rc.report_date,
    rc.id AS rapportino_id,
    rc.status,
    rc.costr,
    rc.commessa,
    rc.capo_id,
    rr.row_id,
    rr.row_index,
    rr.prodotto AS prodotto_row,
    rro.token_id,
    rro.operator_id,
    ops.operator_display_name,
    ops.cognome,
    ops.nome,
    ops.operator_code,
    ops.operator_key,
    rro.tempo_hours,
    NULLIF(TRIM(BOTH FROM rro.tempo_raw), ''::text) AS tempo_raw,
    rh.sum_row_hours,
        CASE
            WHEN (rr.prodotto IS NULL) THEN NULL::numeric
            WHEN ((rh.sum_row_hours IS NULL) OR (rh.sum_row_hours <= (0)::numeric)) THEN NULL::numeric
            WHEN ((rro.tempo_hours IS NULL) OR (rro.tempo_hours <= (0)::numeric)) THEN NULL::numeric
            ELSE (rr.prodotto * (rro.tempo_hours / rh.sum_row_hours))
        END AS prodotto_alloc
   FROM ((((rro
     JOIN rr ON ((rr.row_id = rro.row_id)))
     JOIN rc ON ((rc.id = rr.rapportino_id)))
     LEFT JOIN row_hours rh ON ((rh.row_id = rro.row_id)))
     LEFT JOIN ops ON ((ops.operator_id = rro.operator_id)));


create or replace view "public"."rapportini_ship_resolution_v1" as  WITH rap AS (
         SELECT r.rapportino_id,
            r.report_date,
            r.status,
            r.capo_id,
            r.costr_raw,
            r.commessa_raw,
            r.commessa_norm,
            r.costr_norm
           FROM public.rapportini_norm_v1 r
          WHERE (r.report_date IS NOT NULL)
        ), strict_candidates AS (
         SELECT rap_1.rapportino_id,
            sn.ship_id,
            sn.ship_code,
            sn.ship_name
           FROM (rap rap_1
             JOIN public.ships_norm_v1 sn ON (((sn.costr_norm = rap_1.costr_norm) AND (((sn.commessa_norm IS NULL) AND (rap_1.commessa_norm IS NULL)) OR (sn.commessa_norm = rap_1.commessa_norm)))))
        ), strict_ranked AS (
         SELECT sc.rapportino_id,
            sc.ship_id,
            sc.ship_code,
            sc.ship_name,
            count(*) OVER (PARTITION BY sc.rapportino_id) AS strict_n
           FROM strict_candidates sc
        ), strict_one AS (
         SELECT strict_ranked.rapportino_id,
            strict_ranked.ship_id,
            strict_ranked.ship_code,
            strict_ranked.ship_name,
            strict_ranked.strict_n
           FROM strict_ranked
          WHERE (strict_ranked.strict_n = 1)
        ), costr_active_candidates AS (
         SELECT rap_1.rapportino_id,
            sn.ship_id,
            sn.ship_code,
            sn.ship_name
           FROM (rap rap_1
             JOIN public.ships_norm_v1 sn ON (((sn.costr_norm = rap_1.costr_norm) AND (sn.is_active = true))))
        ), costr_ranked AS (
         SELECT cac.rapportino_id,
            cac.ship_id,
            cac.ship_code,
            cac.ship_name,
            count(*) OVER (PARTITION BY cac.rapportino_id) AS costr_active_n
           FROM costr_active_candidates cac
        ), costr_one AS (
         SELECT costr_ranked.rapportino_id,
            costr_ranked.ship_id,
            costr_ranked.ship_code,
            costr_ranked.ship_name,
            costr_ranked.costr_active_n
           FROM costr_ranked
          WHERE (costr_ranked.costr_active_n = 1)
        ), counts AS (
         SELECT rap_1.rapportino_id,
            COALESCE(max(sr.strict_n), (0)::bigint) AS strict_n,
            COALESCE(max(cr.costr_active_n), (0)::bigint) AS costr_active_n
           FROM ((rap rap_1
             LEFT JOIN strict_ranked sr ON ((sr.rapportino_id = rap_1.rapportino_id)))
             LEFT JOIN costr_ranked cr ON ((cr.rapportino_id = rap_1.rapportino_id)))
          GROUP BY rap_1.rapportino_id
        )
 SELECT rap.rapportino_id,
    rap.report_date,
    rap.status,
    rap.capo_id,
    rap.costr_raw AS costr,
    rap.commessa_raw AS commessa,
    rap.costr_norm,
    rap.commessa_norm,
    COALESCE(so.ship_id, co.ship_id) AS ship_id,
    COALESCE(so.ship_code, co.ship_code) AS ship_code,
    COALESCE(so.ship_name, co.ship_name) AS ship_name,
        CASE
            WHEN (c.strict_n = 1) THEN 'STRICT'::text
            WHEN ((c.strict_n = 0) AND (c.costr_active_n = 1)) THEN 'COSTR_ONLY'::text
            WHEN (c.strict_n > 1) THEN 'AMBIGUOUS_STRICT'::text
            WHEN ((c.strict_n = 0) AND (c.costr_active_n > 1)) THEN 'AMBIGUOUS_COSTR'::text
            WHEN ((c.strict_n = 0) AND (c.costr_active_n = 0)) THEN 'NOT_FOUND'::text
            ELSE 'UNKNOWN'::text
        END AS ship_match_mode,
    c.strict_n,
    c.costr_active_n
   FROM (((rap
     LEFT JOIN strict_one so ON ((so.rapportino_id = rap.rapportino_id)))
     LEFT JOIN costr_one co ON ((co.rapportino_id = rap.rapportino_id)))
     LEFT JOIN counts c ON ((c.rapportino_id = rap.rapportino_id)));


create or replace view "public"."admin_ship_resolution_anomalies_v1" as  SELECT report_date,
    rapportino_id,
    status,
    capo_id,
    costr,
    commessa,
    ship_match_mode,
    strict_n,
    costr_active_n
   FROM public.rapportini_ship_resolution_v1 r
  WHERE ((ship_id IS NULL) OR (ship_match_mode = ANY (ARRAY['AMBIGUOUS_STRICT'::text, 'AMBIGUOUS_COSTR'::text, 'NOT_FOUND'::text, 'UNKNOWN'::text])));


create or replace view "public"."direzione_operator_daily_v3" as  SELECT report_date,
    operator_id,
    capo_id,
    manager_id,
    ship_id,
    costr,
    commessa,
    unit,
    sum(previsto_alloc) AS previsto_sum,
    sum(prodotto_alloc) AS prodotto_sum,
    count(*) AS tokens_total,
    count(*) FILTER (WHERE (tempo_hours IS NULL)) AS tokens_invalid,
    count(*) FILTER (WHERE (tempo_hours = (0)::numeric)) AS tokens_zero,
    count(*) FILTER (WHERE ((tempo_hours IS NOT NULL) AND (tempo_hours > (0)::numeric))) AS tokens_ok,
        CASE
            WHEN ((sum(previsto_alloc) IS NULL) OR (sum(previsto_alloc) <= (0)::numeric)) THEN NULL::numeric
            ELSE ((sum(prodotto_alloc) / sum(previsto_alloc)) * (100)::numeric)
        END AS productivity_pct
   FROM public.direzione_operator_facts_v2 f
  WHERE (unit = ANY (ARRAY['MT'::public.activity_unit, 'PZ'::public.activity_unit]))
  GROUP BY report_date, operator_id, capo_id, manager_id, ship_id, costr, commessa, unit;


create or replace view "public"."inca_diff_last_import_v1" as  WITH files AS (
         SELECT inca_prev_file_by_ship_v1.ship_id,
            inca_prev_file_by_ship_v1.last_inca_file_id,
            inca_prev_file_by_ship_v1.prev_inca_file_id
           FROM public.inca_prev_file_by_ship_v1
          WHERE (inca_prev_file_by_ship_v1.last_inca_file_id IS NOT NULL)
        ), last_cavi AS (
         SELECT f.ship_id,
            c.codice,
            c.situazione,
            c.metri_teo,
            c.metri_dis,
            c.updated_at
           FROM (files f
             JOIN public.inca_cavi c ON ((c.inca_file_id = f.last_inca_file_id)))
        ), prev_cavi AS (
         SELECT f.ship_id,
            c.codice,
            c.situazione,
            c.metri_teo,
            c.metri_dis,
            c.updated_at
           FROM (files f
             JOIN public.inca_cavi c ON ((c.inca_file_id = f.prev_inca_file_id)))
        ), u AS (
         SELECT COALESCE(l.ship_id, p.ship_id) AS ship_id,
            COALESCE(l.codice, p.codice) AS codice,
            p.situazione AS before_situazione,
            l.situazione AS after_situazione,
            p.metri_teo AS before_metri_teo,
            l.metri_teo AS after_metri_teo,
            p.metri_dis AS before_metri_dis,
            l.metri_dis AS after_metri_dis,
            p.updated_at AS before_updated_at,
            l.updated_at AS after_updated_at
           FROM (last_cavi l
             FULL JOIN prev_cavi p ON (((p.ship_id = l.ship_id) AND (p.codice = l.codice))))
        ), nm AS (
         SELECT navemaster_live_v1.ship_id,
            navemaster_live_v1.marcacavo,
            public.nav_status_from_text(navemaster_live_v1.situazione_cavo_conit) AS nav_status
           FROM public.navemaster_live_v1
        )
 SELECT u.ship_id,
    u.codice,
    u.before_situazione,
    u.after_situazione,
    u.before_metri_teo,
    u.after_metri_teo,
    u.before_metri_dis,
    u.after_metri_dis,
    u.before_updated_at,
    u.after_updated_at,
    (u.before_situazione IS NULL) AS is_new_in_last_import,
    ((u.before_situazione IS NOT NULL) AND (u.after_situazione IS NOT NULL) AND (u.before_situazione <> u.after_situazione)) AS is_changed,
    ((nm.nav_status = 'P'::public.nav_status) AND (public.nav_status_from_text(u.after_situazione) <> 'P'::public.nav_status)) AS is_alert_p_overwrite_candidate,
        CASE
            WHEN ((nm.nav_status = 'P'::public.nav_status) AND (public.nav_status_from_text(u.after_situazione) <> 'P'::public.nav_status)) THEN 'CRITICAL'::public.nav_severity
            WHEN (u.before_situazione IS NULL) THEN 'INFO'::public.nav_severity
            WHEN ((u.before_situazione IS NOT NULL) AND (u.after_situazione IS NOT NULL) AND (u.before_situazione <> u.after_situazione)) THEN 'MAJOR'::public.nav_severity
            ELSE 'INFO'::public.nav_severity
        END AS severity
   FROM (u
     LEFT JOIN nm ON (((nm.ship_id = u.ship_id) AND (nm.marcacavo = u.codice))));


create or replace view "public"."kpi_operatori_day_v1" as  SELECT f.report_date,
    f.operator_id,
    max(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE(o.cognome, ''::text) || ' '::text) || COALESCE(o.nome, ''::text))), ''::text), NULLIF(o.name, ''::text), NULLIF(f.operator_display_name, ''::text))) AS operator_name,
    max(o.cognome) AS cognome,
    max(o.nome) AS nome,
    max(COALESCE(o.operator_code, f.operator_code)) AS operator_code,
    max(COALESCE(o.operator_key, f.operator_key)) AS operator_key,
    count(*) AS tokens,
    sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS ore,
    sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))) AS prodotto,
        CASE
            WHEN (COALESCE(sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))), (0)::numeric) <= (0)::numeric) THEN NULL::numeric
            ELSE (COALESCE(sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))), (0)::numeric) / sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))))
        END AS indice
   FROM (public.operator_facts_v1 f
     LEFT JOIN public.operators o ON ((o.id = f.operator_id)))
  GROUP BY f.report_date, f.operator_id;


create or replace view "public"."kpi_operatori_day_v2" as  SELECT f.report_date,
    f.operator_id,
    max(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE(o.cognome, ''::text) || ' '::text) || COALESCE(o.nome, ''::text))), ''::text), NULLIF(o.name, ''::text), NULLIF(f.operator_display_name, ''::text))) AS operator_name,
    max(o.cognome) AS cognome,
    max(o.nome) AS nome,
    max(COALESCE(o.operator_code, f.operator_code)) AS operator_code,
    max(COALESCE(o.operator_key, f.operator_key)) AS operator_key,
    count(*) AS tokens,
    sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))) AS ore,
    sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))) AS prodotto,
        CASE
            WHEN (COALESCE(sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))), (0)::numeric) <= (0)::numeric) THEN NULL::numeric
            ELSE (COALESCE(sum(f.prodotto_alloc) FILTER (WHERE ((f.prodotto_alloc IS NOT NULL) AND (f.prodotto_alloc > (0)::numeric))), (0)::numeric) / sum(f.tempo_hours) FILTER (WHERE ((f.tempo_hours IS NOT NULL) AND (f.tempo_hours > (0)::numeric))))
        END AS indice
   FROM (public.operator_facts_v1 f
     LEFT JOIN public.operators o ON ((o.id = f.operator_id)))
  GROUP BY f.report_date, f.operator_id;


create or replace view "public"."kpi_operatori_month_v1" as  SELECT (EXTRACT(year FROM report_date))::integer AS year,
    (EXTRACT(month FROM report_date))::integer AS month,
    (date_trunc('month'::text, (report_date)::timestamp without time zone))::date AS month_start_date,
    operator_id,
    max(operator_name) AS operator_name,
    max(cognome) AS cognome,
    max(nome) AS nome,
    max(operator_code) AS operator_code,
    max(operator_key) AS operator_key,
    sum(tokens) AS tokens,
    sum(ore) AS ore,
    sum(prodotto) AS prodotto,
        CASE
            WHEN (sum(ore) > (0)::numeric) THEN (sum(prodotto) / sum(ore))
            ELSE NULL::numeric
        END AS indice
   FROM public.kpi_operatori_day_v1 d
  GROUP BY (EXTRACT(year FROM report_date)), (EXTRACT(month FROM report_date)), ((date_trunc('month'::text, (report_date)::timestamp without time zone))::date), operator_id;


create or replace view "public"."kpi_operatori_week_v1" as  SELECT (EXTRACT(isoyear FROM report_date))::integer AS iso_year,
    (EXTRACT(week FROM report_date))::integer AS iso_week,
    (date_trunc('week'::text, (report_date)::timestamp without time zone))::date AS week_start_date,
    operator_id,
    max(operator_name) AS operator_name,
    max(cognome) AS cognome,
    max(nome) AS nome,
    max(operator_code) AS operator_code,
    max(operator_key) AS operator_key,
    sum(tokens) AS tokens,
    sum(ore) AS ore,
    sum(prodotto) AS prodotto,
        CASE
            WHEN (sum(ore) > (0)::numeric) THEN (sum(prodotto) / sum(ore))
            ELSE NULL::numeric
        END AS indice
   FROM public.kpi_operatori_day_v1 d
  GROUP BY (EXTRACT(isoyear FROM report_date)), (EXTRACT(week FROM report_date)), ((date_trunc('week'::text, (report_date)::timestamp without time zone))::date), operator_id;


create or replace view "public"."kpi_operatori_year_v1" as  SELECT (EXTRACT(year FROM report_date))::integer AS year,
    operator_id,
    max(operator_name) AS operator_name,
    max(cognome) AS cognome,
    max(nome) AS nome,
    max(operator_code) AS operator_code,
    max(operator_key) AS operator_key,
    sum(tokens) AS tokens,
    sum(ore) AS ore,
    sum(prodotto) AS prodotto,
        CASE
            WHEN (sum(ore) > (0)::numeric) THEN (sum(prodotto) / sum(ore))
            ELSE NULL::numeric
        END AS indice
   FROM public.kpi_operatori_day_v1 d
  GROUP BY (EXTRACT(year FROM report_date)), operator_id;



  create policy "ship_capos_manager_update_perimeter"
  on "public"."ship_capos"
  as permissive
  for update
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['MANAGER'::text, 'ADMIN'::text]))))) AND (EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ship_capos.ship_id) AND (sm.manager_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = ship_capos.capo_id) AND (mca.active = true))))))
with check (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['MANAGER'::text, 'ADMIN'::text]))))) AND (EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ship_capos.ship_id) AND (sm.manager_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = ship_capos.capo_id) AND (mca.active = true))))));



  create policy "ship_capos_select_manager_or_capo"
  on "public"."ship_capos"
  as permissive
  for select
  to authenticated
using (((capo_id = auth.uid()) OR ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['MANAGER'::text, 'ADMIN'::text]))))) AND (EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ship_capos.ship_id) AND (sm.manager_id = auth.uid())))))));



  create policy "capo own rapportini CRUD"
  on "archive"."rapportini"
  as permissive
  for all
  to authenticated
using (((capo_id = auth.uid()) OR public.is_admin()))
with check (((capo_id = auth.uid()) OR public.is_admin()));



  create policy "ufficio can read validated"
  on "archive"."rapportini"
  as permissive
  for select
  to authenticated
using ((public.is_ufficio() AND (status = ANY (ARRAY['VALIDATED_CAPO'::text, 'APPROVED_UFFICIO'::text, 'RETURNED'::text]))));



  create policy "ufficio can update status"
  on "archive"."rapportini"
  as permissive
  for update
  to authenticated
using (public.is_ufficio())
with check (public.is_ufficio());



  create policy "capo own cavi CRUD"
  on "archive"."rapportino_cavi"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM archive.rapportini r
  WHERE ((r.id = rapportino_cavi.rapportino_id) AND ((r.capo_id = auth.uid()) OR public.is_admin())))))
with check ((EXISTS ( SELECT 1
   FROM archive.rapportini r
  WHERE ((r.id = rapportino_cavi.rapportino_id) AND ((r.capo_id = auth.uid()) OR public.is_admin())))));



  create policy "ufficio read cavi for validated"
  on "archive"."rapportino_cavi"
  as permissive
  for select
  to authenticated
using ((public.is_ufficio() AND (EXISTS ( SELECT 1
   FROM archive.rapportini r
  WHERE ((r.id = rapportino_cavi.rapportino_id) AND (r.status = ANY (ARRAY['VALIDATED_CAPO'::text, 'APPROVED_UFFICIO'::text, 'RETURNED'::text])))))));



  create policy "capo own righe CRUD"
  on "archive"."rapportino_righe"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM archive.rapportini r
  WHERE ((r.id = rapportino_righe.rapportino_id) AND ((r.capo_id = auth.uid()) OR public.is_admin())))))
with check ((EXISTS ( SELECT 1
   FROM archive.rapportini r
  WHERE ((r.id = rapportino_righe.rapportino_id) AND ((r.capo_id = auth.uid()) OR public.is_admin())))));



  create policy "ufficio read righe for validated"
  on "archive"."rapportino_righe"
  as permissive
  for select
  to authenticated
using ((public.is_ufficio() AND (EXISTS ( SELECT 1
   FROM archive.rapportini r
  WHERE ((r.id = rapportino_righe.rapportino_id) AND (r.status = ANY (ARRAY['VALIDATED_CAPO'::text, 'APPROVED_UFFICIO'::text, 'RETURNED'::text])))))));



  create policy "manager_insert_ship_assignments"
  on "public"."capo_ship_assignments"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = capo_ship_assignments.capo_id) AND (mca.active = true)))) AND (EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.manager_id = auth.uid()) AND (sm.ship_id = capo_ship_assignments.ship_id))))));



  create policy "manager_update_ship_assignments"
  on "public"."capo_ship_assignments"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = capo_ship_assignments.capo_id) AND (mca.active = true)))))
with check ((EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = capo_ship_assignments.capo_id) AND (mca.active = true)))));



  create policy "capo_insert_own_ship_attendance"
  on "public"."capo_ship_attendance"
  as permissive
  for insert
  to authenticated
with check (((capo_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.ship_capos sc
  WHERE ((sc.ship_id = capo_ship_attendance.ship_id) AND (sc.capo_id = auth.uid()))))));



  create policy "capo_update_own_ship_attendance"
  on "public"."capo_ship_attendance"
  as permissive
  for update
  to authenticated
using (((capo_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.ship_capos sc
  WHERE ((sc.ship_id = capo_ship_attendance.ship_id) AND (sc.capo_id = auth.uid()))))))
with check (((capo_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.ship_capos sc
  WHERE ((sc.ship_id = capo_ship_attendance.ship_id) AND (sc.capo_id = auth.uid()))))));



  create policy "manager_insert_expected_operators"
  on "public"."capo_ship_expected_operators"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = capo_ship_expected_operators.capo_id) AND (mca.active = true)))) AND (EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.manager_id = auth.uid()) AND (sm.ship_id = capo_ship_expected_operators.ship_id))))));



  create policy "manager_update_expected_operators"
  on "public"."capo_ship_expected_operators"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = capo_ship_expected_operators.capo_id) AND (mca.active = true)))))
with check ((EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.manager_id = auth.uid()) AND (mca.capo_id = capo_ship_expected_operators.capo_id) AND (mca.active = true)))));



  create policy "catalogo_attivita_delete_admin"
  on "public"."catalogo_attivita"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'ADMIN'::public.app_role)))));



  create policy "catalogo_attivita_insert_admin"
  on "public"."catalogo_attivita"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'ADMIN'::public.app_role)))));



  create policy "catalogo_attivita_update_admin"
  on "public"."catalogo_attivita"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'ADMIN'::public.app_role)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'ADMIN'::public.app_role)))));



  create policy "catalogo_attivita_write_admin"
  on "public"."catalogo_attivita"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))));



  create policy "catalogo_ship_commessa_write_admin"
  on "public"."catalogo_ship_commessa_attivita"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'ADMIN'::public.app_role)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'ADMIN'::public.app_role)))));



  create policy "core_drive_events_select_via_core_files"
  on "public"."core_drive_events"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.core_files f
  WHERE (f.id = core_drive_events.file_id))));



  create policy "audit_select_direzione"
  on "public"."core_file_audit"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['DIREZIONE'::text, 'ADMIN'::text]))))));



  create policy "core_files_delete_direzione"
  on "public"."core_files"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['DIREZIONE'::text, 'ADMIN'::text]))))));



  create policy "core_files_insert"
  on "public"."core_files"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['CAPO'::text, 'UFFICIO'::text, 'MANAGER'::text, 'DIREZIONE'::text, 'ADMIN'::text])) AND ((p.app_role = ANY (ARRAY['DIREZIONE'::text, 'ADMIN'::text])) OR (core_files.cantiere = COALESCE(p.default_costr, core_files.cantiere)) OR ((to_jsonb(p.*) ? 'allowed_cantieri'::text) AND (core_files.cantiere = ANY (COALESCE(p.allowed_cantieri, ARRAY[]::text[])))))))));



  create policy "core_files_select"
  on "public"."core_files"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.app_role = ANY (ARRAY['DIREZIONE'::text, 'ADMIN'::text])) OR (core_files.cantiere = COALESCE(p.default_costr, core_files.cantiere)) OR ((to_jsonb(p.*) ? 'allowed_cantieri'::text) AND (core_files.cantiere = ANY (COALESCE(p.allowed_cantieri, ARRAY[]::text[])))))))));



  create policy "core_files_update"
  on "public"."core_files"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.app_role = ANY (ARRAY['DIREZIONE'::text, 'ADMIN'::text])) OR (core_files.created_by = auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.app_role = ANY (ARRAY['DIREZIONE'::text, 'ADMIN'::text])) OR (core_files.created_by = auth.uid()))))));



  create policy "impianti_admin_all"
  on "public"."impianti"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "impianti_manager_read_perimeter"
  on "public"."impianti"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = impianti.ship_id) AND (sm.manager_id = auth.uid())))));



  create policy "impianto_capi_admin_all"
  on "public"."impianto_capi"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "impianto_capi_manager_read_perimeter"
  on "public"."impianto_capi"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.impianti i
     JOIN public.ship_managers sm ON ((sm.ship_id = i.ship_id)))
  WHERE ((i.id = impianto_capi.impianto_id) AND (sm.manager_id = auth.uid())))));



  create policy "inca_cavi_capo_select"
  on "public"."inca_cavi"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'CAPO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_cavi_direzione_select"
  on "public"."inca_cavi"
  as permissive
  for select
  to public
using (((public.core_current_profile()).app_role = 'DIREZIONE'::text));



  create policy "inca_cavi_manager_select"
  on "public"."inca_cavi"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'MANAGER'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_cavi_select_staff"
  on "public"."inca_cavi"
  as permissive
  for select
  to authenticated
using (((public.core_current_profile()).app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text])));



  create policy "inca_cavi_ufficio_mutate"
  on "public"."inca_cavi"
  as permissive
  for all
  to public
using ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))))
with check ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_cavi_ufficio_select"
  on "public"."inca_cavi"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_cavi_write_ufficio_admin"
  on "public"."inca_cavi"
  as permissive
  for all
  to public
using ((public.is_ufficio() OR public.is_admin()))
with check ((public.is_ufficio() OR public.is_admin()));



  create policy "insert_own_inca_cavi"
  on "public"."inca_cavi"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.inca_files f
  WHERE ((f.id = inca_cavi.inca_file_id) AND (f.uploaded_by = auth.uid())))));



  create policy "select_own_inca_cavi"
  on "public"."inca_cavi"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.inca_files f
  WHERE ((f.id = inca_cavi.inca_file_id) AND (f.uploaded_by = auth.uid())))));



  create policy "inca_files_capo_select"
  on "public"."inca_files"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'CAPO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_files_direzione_select"
  on "public"."inca_files"
  as permissive
  for select
  to public
using (((public.core_current_profile()).app_role = 'DIREZIONE'::text));



  create policy "inca_files_insert_staff"
  on "public"."inca_files"
  as permissive
  for insert
  to authenticated
with check (((public.core_current_profile()).app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text])));



  create policy "inca_files_manager_select"
  on "public"."inca_files"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'MANAGER'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_files_select_staff"
  on "public"."inca_files"
  as permissive
  for select
  to authenticated
using (((public.core_current_profile()).app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text])));



  create policy "inca_files_ufficio_mutate"
  on "public"."inca_files"
  as permissive
  for all
  to public
using ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))))
with check ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_files_ufficio_select"
  on "public"."inca_files"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "inca_files_write_ufficio_admin"
  on "public"."inca_files"
  as permissive
  for all
  to public
using ((public.is_ufficio() OR public.is_admin()))
with check ((public.is_ufficio() OR public.is_admin()));



  create policy "inca_percorsi_write_ufficio_admin"
  on "public"."inca_percorsi"
  as permissive
  for all
  to public
using ((public.is_ufficio() OR public.is_admin()))
with check ((public.is_ufficio() OR public.is_admin()));



  create policy "mca_admin_all"
  on "public"."manager_capo_assignments"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))));



  create policy "admin_read_all_manager_capo_scope"
  on "public"."manager_capo_scope"
  as permissive
  for select
  to public
using (public.is_role('ADMIN'::text));



  create policy "admin_read_all_manager_plans"
  on "public"."manager_plans"
  as permissive
  for select
  to public
using (public.is_role('ADMIN'::text));



  create policy "capo own models CRUD"
  on "public"."models"
  as permissive
  for all
  to authenticated
using (((capo_id = auth.uid()) OR public.is_admin()))
with check (((capo_id = auth.uid()) OR public.is_admin()));



  create policy "models_select_owner_or_direction"
  on "public"."models"
  as permissive
  for select
  to public
using (((capo_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'DIREZIONE'::text))))));



  create policy "navemaster_imports_write"
  on "public"."navemaster_imports"
  as permissive
  for all
  to authenticated
using (public.navemaster_can_manage())
with check (public.navemaster_can_manage());



  create policy "navemaster_rows_write"
  on "public"."navemaster_rows"
  as permissive
  for all
  to authenticated
using (public.navemaster_can_manage())
with check (public.navemaster_can_manage());



  create policy "objectives_select_all_for_direction"
  on "public"."objectives"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'DIREZIONE'::text)))));



  create policy "objectives_write_direction"
  on "public"."objectives"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'DIREZIONE'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'DIREZIONE'::text)))));



  create policy "admin_read_all_kpi_facts"
  on "public"."operator_kpi_facts"
  as permissive
  for select
  to public
using (public.is_role('ADMIN'::text));



  create policy "admin_read_all_kpi_snapshots"
  on "public"."operator_kpi_snapshots"
  as permissive
  for select
  to public
using (public.is_role('ADMIN'::text));



  create policy "capo_insert_operator_attendance_for_assigned_ship"
  on "public"."operator_ship_attendance"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.ship_capos sc
  WHERE ((sc.ship_id = operator_ship_attendance.ship_id) AND (sc.capo_id = auth.uid())))));



  create policy "capo_update_operator_attendance_for_assigned_ship"
  on "public"."operator_ship_attendance"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.ship_capos sc
  WHERE ((sc.ship_id = operator_ship_attendance.ship_id) AND (sc.capo_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.ship_capos sc
  WHERE ((sc.ship_id = operator_ship_attendance.ship_id) AND (sc.capo_id = auth.uid())))));



  create policy "operators_admin_all"
  on "public"."operators"
  as permissive
  for all
  to authenticated
using (public.core_is_admin())
with check (public.core_is_admin());



  create policy "capo_validate"
  on "public"."percorso_lot_validations"
  as permissive
  for insert
  to public
with check (((role = 'CAPO'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'CAPO'::public.app_role))))));



  create policy "ufficio_validate"
  on "public"."percorso_lot_validations"
  as permissive
  for insert
  to public
with check (((role = 'UFFICIO'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'UFFICIO'::public.app_role))))));



  create policy "create_lots"
  on "public"."percorso_lots"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['CAPO'::public.app_role, 'UFFICIO'::public.app_role]))))));



  create policy "admin_read_all_plan_capo_slots"
  on "public"."plan_capo_slots"
  as permissive
  for select
  to public
using (public.is_role('ADMIN'::text));



  create policy "manager_rw_slots_via_plan"
  on "public"."plan_capo_slots"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.manager_plans p
  WHERE ((p.id = plan_capo_slots.plan_id) AND (p.manager_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.manager_plans p
  WHERE ((p.id = plan_capo_slots.plan_id) AND (p.manager_id = auth.uid())))));



  create policy "admin_read_all_plan_slot_members"
  on "public"."plan_slot_members"
  as permissive
  for select
  to public
using (public.is_role('ADMIN'::text));



  create policy "capo_read_own_members"
  on "public"."plan_slot_members"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.plan_capo_slots s
  WHERE ((s.id = plan_slot_members.slot_id) AND (s.capo_id = auth.uid())))));



  create policy "manager_rw_members_via_plan"
  on "public"."plan_slot_members"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.plan_capo_slots s
     JOIN public.manager_plans p ON ((p.id = s.plan_id)))
  WHERE ((s.id = plan_slot_members.slot_id) AND (p.manager_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.plan_capo_slots s
     JOIN public.manager_plans p ON ((p.id = s.plan_id)))
  WHERE ((s.id = plan_slot_members.slot_id) AND (p.manager_id = auth.uid())))));



  create policy "admin_read_all_planning_audit"
  on "public"."planning_audit"
  as permissive
  for select
  to public
using (public.is_role('ADMIN'::text));



  create policy "profiles_admin_select_all"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "rapportini_capo_insert"
  on "public"."rapportini"
  as permissive
  for insert
  to public
with check ((((public.core_current_profile()).app_role = 'CAPO'::text) AND (capo_id = auth.uid()) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "rapportini_capo_update"
  on "public"."rapportini"
  as permissive
  for update
  to public
using ((((public.core_current_profile()).app_role = 'CAPO'::text) AND (capo_id = auth.uid()) AND (status <> 'APPROVED_UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))))
with check ((((public.core_current_profile()).app_role = 'CAPO'::text) AND (capo_id = auth.uid()) AND (status <> 'APPROVED_UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "rapportini_direzione_select"
  on "public"."rapportini"
  as permissive
  for select
  to public
using (((public.core_current_profile()).app_role = 'DIREZIONE'::text));



  create policy "rapportini_manager_select"
  on "public"."rapportini"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'MANAGER'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "rapportini_manager_select_perimeter"
  on "public"."rapportini"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.ship_managers sm
     JOIN public.ships s ON ((s.id = sm.ship_id)))
  WHERE ((sm.manager_id = auth.uid()) AND (s.code = rapportini.costr)))));



  create policy "rapportini_select_ufficio"
  on "public"."rapportini"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'UFFICIO'::text)))));



  create policy "rapportini_ufficio_select"
  on "public"."rapportini"
  as permissive
  for select
  to public
using ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "rapportini_ufficio_update"
  on "public"."rapportini"
  as permissive
  for update
  to public
using ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))))
with check ((((public.core_current_profile()).app_role = 'UFFICIO'::text) AND ((costr = ANY ((public.core_current_profile()).allowed_cantieri)) OR ((public.core_current_profile()).allowed_cantieri = ARRAY[]::text[]))));



  create policy "rapportini_update_ufficio"
  on "public"."rapportini"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'UFFICIO'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'UFFICIO'::text)))));



  create policy "capo_insert_rapportino_cavi"
  on "public"."rapportino_cavi"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_cavi.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "capo_select_rapportino_cavi"
  on "public"."rapportino_cavi"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_cavi.rapportino_id) AND (r.capo_id = auth.uid())))));



  create policy "capo_update_rapportino_cavi"
  on "public"."rapportino_cavi"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_cavi.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_cavi.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "ufficio_direzione_select_rapportino_cavi"
  on "public"."rapportino_cavi"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text]))))));



  create policy "capo_delete_rapportino_inca"
  on "public"."rapportino_inca_cavi"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_inca_cavi.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "capo_insert_rapportino_inca"
  on "public"."rapportino_inca_cavi"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_inca_cavi.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "capo_select_rapportino_inca"
  on "public"."rapportino_inca_cavi"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_inca_cavi.rapportino_id) AND (r.capo_id = auth.uid())))));



  create policy "capo_update_rapportino_inca"
  on "public"."rapportino_inca_cavi"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_inca_cavi.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_inca_cavi.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "owner_rapportino_can_crud"
  on "public"."rapportino_inca_cavi"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_inca_cavi.rapportino_id) AND (r.capo_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_inca_cavi.rapportino_id) AND (r.capo_id = auth.uid())))));



  create policy "rro_delete"
  on "public"."rapportino_row_operators"
  as permissive
  for delete
  to authenticated
using ((public.is_admin() OR public.capo_owns_rapportino_row(rapportino_row_id)));



  create policy "rro_insert"
  on "public"."rapportino_row_operators"
  as permissive
  for insert
  to authenticated
with check ((public.is_admin() OR public.capo_owns_rapportino_row(rapportino_row_id)));



  create policy "rro_select"
  on "public"."rapportino_row_operators"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR public.is_ufficio() OR public.capo_owns_rapportino_row(rapportino_row_id)));



  create policy "rro_update"
  on "public"."rapportino_row_operators"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR public.capo_owns_rapportino_row(rapportino_row_id)))
with check ((public.is_admin() OR public.capo_owns_rapportino_row(rapportino_row_id)));



  create policy "capo can manage rows"
  on "public"."rapportino_rows"
  as permissive
  for all
  to authenticated
using ((rapportino_id IN ( SELECT rapportini.id
   FROM public.rapportini
  WHERE (rapportini.capo_id = auth.uid()))))
with check ((rapportino_id IN ( SELECT rapportini.id
   FROM public.rapportini
  WHERE (rapportini.capo_id = auth.uid()))));



  create policy "capo_delete_rows_own"
  on "public"."rapportino_rows"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_rows.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "capo_insert_rows_own"
  on "public"."rapportino_rows"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_rows.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "capo_select_rows_own"
  on "public"."rapportino_rows"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_rows.rapportino_id) AND (r.capo_id = auth.uid())))));



  create policy "capo_update_rows_own"
  on "public"."rapportino_rows"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_rows.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.rapportini r
  WHERE ((r.id = rapportino_rows.rapportino_id) AND (r.capo_id = auth.uid()) AND (r.status <> 'APPROVED_UFFICIO'::text)))));



  create policy "rapportino_rows_backoffice_select_fast"
  on "public"."rapportino_rows"
  as permissive
  for select
  to public
using (((public.core_current_profile()).app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'MANAGER'::text, 'ADMIN'::text])));



  create policy "ship_capos_admin_all"
  on "public"."ship_capos"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));



  create policy "ship_capos_manager_delete_perimeter"
  on "public"."ship_capos"
  as permissive
  for delete
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ship_capos.ship_id) AND (sm.manager_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.capo_id = ship_capos.capo_id) AND (mca.manager_id = auth.uid()) AND (mca.active = true))))));



  create policy "ship_capos_manager_insert_perimeter"
  on "public"."ship_capos"
  as permissive
  for insert
  to authenticated
with check (((EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ship_capos.ship_id) AND (sm.manager_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM public.manager_capo_assignments mca
  WHERE ((mca.capo_id = ship_capos.capo_id) AND (mca.manager_id = auth.uid()) AND (mca.active = true))))));



  create policy "ship_capos_manager_select_perimeter"
  on "public"."ship_capos"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ship_capos.ship_id) AND (sm.manager_id = auth.uid())))));



  create policy "ship_managers_admin_all"
  on "public"."ship_managers"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "ship_operators_admin_all"
  on "public"."ship_operators"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "ship_operators_admin_insert"
  on "public"."ship_operators"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))));



  create policy "ship_operators_admin_select"
  on "public"."ship_operators"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))));



  create policy "ship_operators_admin_update"
  on "public"."ship_operators"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))));



  create policy "ship_operators_manager_select_perimeter"
  on "public"."ship_operators"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ship_operators.ship_id) AND (sm.manager_id = auth.uid())))));



  create policy "ships_admin_select"
  on "public"."ships"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'ADMIN'::text)))));



  create policy "ships_capo_select_assigned"
  on "public"."ships"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'CAPO'::text)))) AND (is_active = true) AND (EXISTS ( SELECT 1
   FROM public.ship_capos sc
  WHERE ((sc.ship_id = ships.id) AND (sc.capo_id = auth.uid()))))));



  create policy "ships_manager_select_perimeter"
  on "public"."ships"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = 'MANAGER'::text)))) AND (is_active = true) AND (EXISTS ( SELECT 1
   FROM public.ship_managers sm
  WHERE ((sm.ship_id = ships.id) AND (sm.manager_id = auth.uid()))))));



  create policy "ships_office_select"
  on "public"."ships"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text]))))) AND (is_active = true)));


CREATE TRIGGER trg_guard_profiles_capo_ui_mode_v1 BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_capo_ui_mode_v1();

CREATE TRIGGER set_rapportino_updated_at BEFORE UPDATE ON archive.rapportini FOR EACH ROW EXECUTE FUNCTION public.set_rapportino_updated_at();

CREATE TRIGGER set_updated_at_rapportini BEFORE UPDATE ON archive.rapportini FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sync_capo_id_from_user_id_trg BEFORE INSERT OR UPDATE ON archive.rapportini FOR EACH ROW EXECUTE FUNCTION public.sync_capo_id_from_user_id();

CREATE TRIGGER set_updated_at_cavi BEFORE UPDATE ON archive.rapportino_cavi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_righe BEFORE UPDATE ON archive.rapportino_righe FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_rapportino_row_updated_at BEFORE UPDATE ON archive.rapportino_rows FOR EACH ROW EXECUTE FUNCTION public.set_rapportino_row_updated_at();

CREATE TRIGGER trg_catalogo_attivita_updated_at BEFORE UPDATE ON public.catalogo_attivita FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_catalogo_ship_commessa_attivita_updated_at BEFORE UPDATE ON public.catalogo_ship_commessa_attivita FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_core_drive_events_block_delete BEFORE DELETE ON public.core_drive_events FOR EACH ROW EXECUTE FUNCTION public.core_drive_events_block_mutations();

CREATE TRIGGER trg_core_drive_events_block_update BEFORE UPDATE ON public.core_drive_events FOR EACH ROW EXECUTE FUNCTION public.core_drive_events_block_mutations();

CREATE TRIGGER trg_core_file_versioning BEFORE INSERT ON public.core_files FOR EACH ROW EXECUTE FUNCTION public.replace_core_file_version();

CREATE TRIGGER trg_prevent_frozen_update BEFORE DELETE OR UPDATE ON public.core_files FOR EACH ROW EXECUTE FUNCTION public.prevent_update_on_frozen_files();

CREATE TRIGGER trg_norm_commessa_inca_cavi BEFORE INSERT OR UPDATE ON public.inca_cavi FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_commessa_upper();

CREATE TRIGGER trg_norm_commessa_inca_files BEFORE INSERT OR UPDATE ON public.inca_files FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_commessa_upper();

CREATE TRIGGER trg_manager_plans_updated_at BEFORE UPDATE ON public.manager_plans FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER set_updated_at_models BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER operators_require_identity BEFORE INSERT OR UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.trg_operators_require_identity();

CREATE TRIGGER set_updated_at_operators BEFORE UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_operator_auto_normalize BEFORE INSERT OR UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.fn_operator_auto_normalize();

CREATE TRIGGER trg_operators_set_operator_key BEFORE INSERT OR UPDATE OF cognome, birth_date ON public.operators FOR EACH ROW EXECUTE FUNCTION public.trg_operators_set_operator_key();

CREATE TRIGGER set_updated_at_patterns BEFORE UPDATE ON public.patterns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_plan_capo_slots_updated_at BEFORE UPDATE ON public.plan_capo_slots FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER trg_fill_plan_id_on_slot_member BEFORE INSERT OR UPDATE OF slot_id ON public.plan_slot_members FOR EACH ROW EXECUTE FUNCTION public.fn_fill_plan_id_on_slot_member();

CREATE TRIGGER trg_plan_slot_members_updated_at BEFORE UPDATE ON public.plan_slot_members FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER set_profile_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_profile_updated_at();

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER rapportini_apply_inca_progress_on_status AFTER UPDATE OF status ON public.rapportini FOR EACH ROW EXECUTE FUNCTION public.trg_rapportini_apply_inca_progress_on_status();

CREATE TRIGGER rapportini_status_product_trg AFTER UPDATE OF status ON public.rapportini FOR EACH ROW EXECUTE FUNCTION public.trg_rapportini_on_status_product();

CREATE TRIGGER t_archive_on_rapportino_approved AFTER UPDATE OF status ON public.rapportini FOR EACH ROW EXECUTE FUNCTION public.trg_archive_on_rapportino_approved();

CREATE TRIGGER trg_consolidate_inca_on_rapportino_approved AFTER UPDATE OF status ON public.rapportini FOR EACH ROW EXECUTE FUNCTION public.fn_consolidate_inca_on_rapportino_approved();

CREATE TRIGGER trg_norm_commessa_rapportini BEFORE INSERT OR UPDATE ON public.rapportini FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_commessa_upper();

CREATE TRIGGER before_ins_rapportino_inca_cache BEFORE INSERT ON public.rapportino_inca_cavi FOR EACH ROW EXECUTE FUNCTION public.trg_fill_rapportino_inca_cache();

CREATE TRIGGER trg_hydrate_rapportino_inca_cavi_caches BEFORE INSERT OR UPDATE OF rapportino_id, inca_cavo_id ON public.rapportino_inca_cavi FOR EACH ROW EXECUTE FUNCTION public.fn_hydrate_rapportino_inca_cavi_caches();

CREATE TRIGGER trg_rapportino_inca_cavi_auto_tp AFTER INSERT OR UPDATE OF metri_posati ON public.rapportino_inca_cavi FOR EACH ROW EXECUTE FUNCTION public.trg_auto_tp_from_progress();

CREATE TRIGGER trg_rro_updated_at BEFORE UPDATE ON public.rapportino_row_operators FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER trg_ship_operators_updated_at BEFORE UPDATE ON public.ship_operators FOR EACH ROW EXECUTE FUNCTION public.updated_at();

drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

drop policy "capo or ufficio can read photos" on "storage"."objects";

drop policy "core-drive-select" on "storage"."objects";

drop policy "core_drive_inca_read_staff" on "storage"."objects";

drop policy "core_drive_inca_upload_staff" on "storage"."objects";

drop policy "navemaster_read 19yrn9g_0" on "storage"."objects";

drop policy "navemaster_update 19yrn9g_0" on "storage"."objects";

drop policy "navemaster_update 19yrn9g_1" on "storage"."objects";

drop policy "navemaster_upload 19yrn9g_0" on "storage"."objects";


  create policy "capo or ufficio can read photos"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'rapportino-photos'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR public.is_ufficio() OR public.is_admin())));



  create policy "core-drive-select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'core-drive'::text) AND (EXISTS ( SELECT 1
   FROM public.core_files f
  WHERE ((f.storage_bucket = objects.bucket_id) AND (f.storage_path = objects.name))))));



  create policy "core_drive_inca_read_staff"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'core-drive'::text) AND (name ~~ 'inca/%'::text) AND ((public.core_current_profile()).app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text]))));



  create policy "core_drive_inca_upload_staff"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'core-drive'::text) AND (name ~~ 'inca/%'::text) AND ((public.core_current_profile()).app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text]))));



  create policy "navemaster_read 19yrn9g_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'navemaster'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text, 'MANAGER'::text])))))));



  create policy "navemaster_update 19yrn9g_0"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'navemaster'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text])))))));



  create policy "navemaster_update 19yrn9g_1"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'navemaster'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text])))))));



  create policy "navemaster_upload 19yrn9g_0"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'navemaster'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.app_role = ANY (ARRAY['UFFICIO'::text, 'DIREZIONE'::text, 'ADMIN'::text])))))));




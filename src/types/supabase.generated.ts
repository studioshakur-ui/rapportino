export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_actions_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          id: string
          meta: Json
          mode: string | null
          occurred_at: string
          reason: string | null
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          id?: string
          meta?: Json
          mode?: string | null
          occurred_at?: string
          reason?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          id?: string
          meta?: Json
          mode?: string | null
          occurred_at?: string
          reason?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      agent_findings: {
        Row: {
          agent_name: string
          confidence: number
          core_event_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          finding_type: string
          id: string
          message: string
          recommendation: string | null
          resolved_at: string | null
          severity: string
          status: string
        }
        Insert: {
          agent_name: string
          confidence?: number
          core_event_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          finding_type: string
          id?: string
          message: string
          recommendation?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
        }
        Update: {
          agent_name?: string
          confidence?: number
          core_event_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          finding_type?: string
          id?: string
          message?: string
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_findings_core_event_id_fkey"
            columns: ["core_event_id"]
            isOneToOne: false
            referencedRelation: "core_events"
            referencedColumns: ["id"]
          },
        ]
      }
      blocchi_locali: {
        Row: {
          blocked_at: string
          commessa: string
          costr: string
          created_at: string
          created_by: string | null
          deck: string | null
          id: string
          locale_code: string
          reason_code: string | null
          reason_text: string | null
          severity: Database["public"]["Enums"]["nav_severity"]
          ship_id: string
          unblocked_at: string | null
          zona: string | null
        }
        Insert: {
          blocked_at?: string
          commessa: string
          costr: string
          created_at?: string
          created_by?: string | null
          deck?: string | null
          id?: string
          locale_code: string
          reason_code?: string | null
          reason_text?: string | null
          severity?: Database["public"]["Enums"]["nav_severity"]
          ship_id: string
          unblocked_at?: string | null
          zona?: string | null
        }
        Update: {
          blocked_at?: string
          commessa?: string
          costr?: string
          created_at?: string
          created_by?: string | null
          deck?: string | null
          id?: string
          locale_code?: string
          reason_code?: string | null
          reason_text?: string | null
          severity?: Database["public"]["Enums"]["nav_severity"]
          ship_id?: string
          unblocked_at?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocchi_locali_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "blocchi_locali_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "blocchi_locali_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocchi_locali_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      cable_events: {
        Row: {
          cable_code: string
          confidence: number
          core_event_id: string
          created_at: string
          event_kind: string
          id: string
          inca_cavo_id: string | null
          new_status: string | null
          note: string | null
          occurred_at: string
          operator_id: string | null
          previous_status: string | null
          source_message_id: string | null
        }
        Insert: {
          cable_code: string
          confidence?: number
          core_event_id: string
          created_at?: string
          event_kind: string
          id?: string
          inca_cavo_id?: string | null
          new_status?: string | null
          note?: string | null
          occurred_at: string
          operator_id?: string | null
          previous_status?: string | null
          source_message_id?: string | null
        }
        Update: {
          cable_code?: string
          confidence?: number
          core_event_id?: string
          created_at?: string
          event_kind?: string
          id?: string
          inca_cavo_id?: string | null
          new_status?: string | null
          note?: string | null
          occurred_at?: string
          operator_id?: string | null
          previous_status?: string | null
          source_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cable_events_core_event_id_fkey"
            columns: ["core_event_id"]
            isOneToOne: false
            referencedRelation: "core_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "cable_events_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "core_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_events_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_priorities: {
        Row: {
          cable_code: string
          closed_at: string | null
          created_at: string
          id: string
          inca_cavo_id: string | null
          priority: string
          reason: string | null
          source_event_id: string | null
          status: string
        }
        Insert: {
          cable_code: string
          closed_at?: string | null
          created_at?: string
          id?: string
          inca_cavo_id?: string | null
          priority: string
          reason?: string | null
          source_event_id?: string | null
          status?: string
        }
        Update: {
          cable_code?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          inca_cavo_id?: string | null
          priority?: string
          reason?: string | null
          source_event_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_priorities_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "cable_priorities_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "core_events"
            referencedColumns: ["id"]
          },
        ]
      }
      capo_ship_attendance: {
        Row: {
          capo_id: string
          confirmed_at: string | null
          created_at: string
          note: string | null
          plan_date: string
          ship_id: string
          status: string
        }
        Insert: {
          capo_id?: string
          confirmed_at?: string | null
          created_at?: string
          note?: string | null
          plan_date: string
          ship_id: string
          status?: string
        }
        Update: {
          capo_id?: string
          confirmed_at?: string | null
          created_at?: string
          note?: string | null
          plan_date?: string
          ship_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "capo_ship_attendance_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      capo_team_days: {
        Row: {
          capo_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          plan_date: string
          ship_id: string
          source_plan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capo_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          plan_date: string
          ship_id: string
          source_plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capo_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          plan_date?: string
          ship_id?: string
          source_plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      capo_team_members: {
        Row: {
          created_at: string
          id: string
          operator_id: string
          planned_minutes: number
          position: number
          role_tag: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          operator_id: string
          planned_minutes?: number
          position?: number
          role_tag?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          operator_id?: string
          planned_minutes?: number
          position?: number
          role_tag?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "capo_team_day_full_v1"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "capo_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "capo_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      capo_teams: {
        Row: {
          activity_code: string | null
          created_at: string
          deck: string | null
          id: string
          name: string
          note: string | null
          position: number
          team_day_id: string
          updated_at: string
          zona: string | null
        }
        Insert: {
          activity_code?: string | null
          created_at?: string
          deck?: string | null
          id?: string
          name: string
          note?: string | null
          position?: number
          team_day_id: string
          updated_at?: string
          zona?: string | null
        }
        Update: {
          activity_code?: string | null
          created_at?: string
          deck?: string | null
          id?: string
          name?: string
          note?: string | null
          position?: number
          team_day_id?: string
          updated_at?: string
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capo_teams_team_day_id_fkey"
            columns: ["team_day_id"]
            isOneToOne: false
            referencedRelation: "capo_team_day_full_v1"
            referencedColumns: ["team_day_id"]
          },
          {
            foreignKeyName: "capo_teams_team_day_id_fkey"
            columns: ["team_day_id"]
            isOneToOne: false
            referencedRelation: "capo_team_days"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_attivita: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          categoria: string
          created_at: string
          deleted_at: string | null
          descrizione: string
          id: string
          is_active: boolean
          is_kpi: boolean
          previsto_value: number | null
          synonyms: string[] | null
          unit: Database["public"]["Enums"]["activity_unit"]
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          categoria: string
          created_at?: string
          deleted_at?: string | null
          descrizione: string
          id?: string
          is_active?: boolean
          is_kpi?: boolean
          previsto_value?: number | null
          synonyms?: string[] | null
          unit?: Database["public"]["Enums"]["activity_unit"]
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          categoria?: string
          created_at?: string
          deleted_at?: string | null
          descrizione?: string
          id?: string
          is_active?: boolean
          is_kpi?: boolean
          previsto_value?: number | null
          synonyms?: string[] | null
          unit?: Database["public"]["Enums"]["activity_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      catalogo_attivita_roles: {
        Row: {
          activity_id: string
          created_at: string
          created_by: string | null
          role_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          created_by?: string | null
          role_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          created_by?: string | null
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_attivita_roles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "catalogo_attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_attivita_roles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_attivita_roles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_attivita_roles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_attivita_roles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_attivita_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "catalogo_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_events: {
        Row: {
          action: string
          activity_id: string | null
          actor: string | null
          after_row: Json | null
          at: string
          before_row: Json | null
          commessa: string | null
          id: string
          ship_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          activity_id?: string | null
          actor?: string | null
          after_row?: Json | null
          at?: string
          before_row?: Json | null
          commessa?: string | null
          id?: string
          ship_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          activity_id?: string | null
          actor?: string | null
          after_row?: Json | null
          at?: string
          before_row?: Json | null
          commessa?: string | null
          id?: string
          ship_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      catalogo_import_run_rows: {
        Row: {
          action: string
          created_at: string
          error_text: string | null
          id: number
          payload: Json
          row_index: number
          run_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_text?: string | null
          id?: never
          payload: Json
          row_index: number
          run_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_text?: string | null
          id?: never
          payload?: Json
          row_index?: number
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_import_run_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "catalogo_import_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      catalogo_import_runs: {
        Row: {
          applied_at: string | null
          created_at: string
          created_by: string
          errors: Json
          file_mime: string | null
          file_name: string | null
          file_size_bytes: number | null
          kind: string
          mapping: Json
          run_id: string
          scope_commessa: string | null
          scope_ship_id: string | null
          stats: Json
          status: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          created_by?: string
          errors?: Json
          file_mime?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          kind: string
          mapping?: Json
          run_id?: string
          scope_commessa?: string | null
          scope_ship_id?: string | null
          stats?: Json
          status?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          created_by?: string
          errors?: Json
          file_mime?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          kind?: string
          mapping?: Json
          run_id?: string
          scope_commessa?: string | null
          scope_ship_id?: string | null
          stats?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_import_runs_scope_ship_id_fkey"
            columns: ["scope_ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      catalogo_roles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_en: string | null
          label_fr: string | null
          label_it: string
          role_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_en?: string | null
          label_fr?: string | null
          label_it: string
          role_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_en?: string | null
          label_fr?: string | null
          label_it?: string
          role_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalogo_ship_commessa_attivita: {
        Row: {
          activity_id: string
          commessa: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          note: string | null
          previsto_value: number | null
          ship_id: string
          unit_override: Database["public"]["Enums"]["activity_unit"] | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          commessa: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          previsto_value?: number | null
          ship_id: string
          unit_override?: Database["public"]["Enums"]["activity_unit"] | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          commessa?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          previsto_value?: number | null
          ship_id?: string
          unit_override?: Database["public"]["Enums"]["activity_unit"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "catalogo_attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      cncs_signal_runs: {
        Row: {
          block_count: number
          created_at: string
          created_by: string | null
          id: string
          rapportino_id: string
          request_id: string | null
          scope: string
          validated: boolean
          warn_count: number
        }
        Insert: {
          block_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          rapportino_id: string
          request_id?: string | null
          scope: string
          validated?: boolean
          warn_count?: number
        }
        Update: {
          block_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          rapportino_id?: string
          request_id?: string | null
          scope?: string
          validated?: boolean
          warn_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cncs_signal_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signal_runs_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      cncs_signals: {
        Row: {
          code: string
          created_at: string
          id: string
          payload: Json
          rapportino_id: string
          row_ids: string[] | null
          run_id: string
          scope: string
          severity: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          payload?: Json
          rapportino_id: string
          row_ids?: string[] | null
          run_id: string
          scope: string
          severity: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          payload?: Json
          rapportino_id?: string
          row_ids?: string[] | null
          run_id?: string
          scope?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signals_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cncs_signals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cncs_signal_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      core_drive_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          file_id: string
          id: string
          note: string | null
          payload: Json
          prev_event_id: string | null
          request_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          file_id: string
          id?: string
          note?: string | null
          payload?: Json
          prev_event_id?: string | null
          request_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          file_id?: string
          id?: string
          note?: string | null
          payload?: Json
          prev_event_id?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_drive_events_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "core_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_drive_events_prev_event_id_fkey"
            columns: ["prev_event_id"]
            isOneToOne: false
            referencedRelation: "core_drive_events"
            referencedColumns: ["id"]
          },
        ]
      }
      core_events: {
        Row: {
          cable_code_normalized: string | null
          cable_code_raw: string | null
          commessa: string | null
          confidence: number
          created_at: string
          event_type: string
          id: string
          inca_cavo_id: string | null
          occurred_at: string
          operator_id: string | null
          payload: Json
          raw_text: string | null
          source: string
          source_message_id: string | null
          status: string | null
          validated_at: string | null
          validated_by: string | null
          validation_status: string
          zone: string | null
        }
        Insert: {
          cable_code_normalized?: string | null
          cable_code_raw?: string | null
          commessa?: string | null
          confidence?: number
          created_at?: string
          event_type: string
          id?: string
          inca_cavo_id?: string | null
          occurred_at: string
          operator_id?: string | null
          payload?: Json
          raw_text?: string | null
          source: string
          source_message_id?: string | null
          status?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
          zone?: string | null
        }
        Update: {
          cable_code_normalized?: string | null
          cable_code_raw?: string | null
          commessa?: string | null
          confidence?: number
          created_at?: string
          event_type?: string
          id?: string
          inca_cavo_id?: string | null
          occurred_at?: string
          operator_id?: string | null
          payload?: Json
          raw_text?: string | null
          source?: string
          source_message_id?: string | null
          status?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "core_events_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "core_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_events_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      core_file_audit: {
        Row: {
          action: string
          core_file_id: string
          id: string
          ip_address: string | null
          note: string | null
          performed_at: string
          performed_by: string | null
          performed_role: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          core_file_id: string
          id?: string
          ip_address?: string | null
          note?: string | null
          performed_at?: string
          performed_by?: string | null
          performed_role?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          core_file_id?: string
          id?: string
          ip_address?: string | null
          note?: string | null
          performed_at?: string
          performed_by?: string | null
          performed_role?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_file_audit_core_file_id_fkey"
            columns: ["core_file_id"]
            isOneToOne: false
            referencedRelation: "core_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_file_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "core_file_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "core_file_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_files: {
        Row: {
          anomaly_code: string | null
          cantiere: string
          categoria: Database["public"]["Enums"]["doc_categoria"]
          claim_id: string | null
          commessa: string | null
          created_at: string
          created_by: string
          deck: string | null
          deleted_at: string | null
          filename: string
          frozen_at: string | null
          id: string
          inca_cavo_id: string | null
          inca_file_id: string | null
          kpi_ref: string | null
          mime_type: string | null
          note: string | null
          operator_id: string | null
          origine: Database["public"]["Enums"]["doc_origine"]
          rapportino_id: string | null
          retention_until: string | null
          settimana_iso: number | null
          sha256: string | null
          size_bytes: number | null
          stato_doc: Database["public"]["Enums"]["doc_stato"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          version_num: number | null
          version_of: string | null
          zona: string | null
        }
        Insert: {
          anomaly_code?: string | null
          cantiere: string
          categoria: Database["public"]["Enums"]["doc_categoria"]
          claim_id?: string | null
          commessa?: string | null
          created_at?: string
          created_by: string
          deck?: string | null
          deleted_at?: string | null
          filename: string
          frozen_at?: string | null
          id?: string
          inca_cavo_id?: string | null
          inca_file_id?: string | null
          kpi_ref?: string | null
          mime_type?: string | null
          note?: string | null
          operator_id?: string | null
          origine?: Database["public"]["Enums"]["doc_origine"]
          rapportino_id?: string | null
          retention_until?: string | null
          settimana_iso?: number | null
          sha256?: string | null
          size_bytes?: number | null
          stato_doc?: Database["public"]["Enums"]["doc_stato"]
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          version_num?: number | null
          version_of?: string | null
          zona?: string | null
        }
        Update: {
          anomaly_code?: string | null
          cantiere?: string
          categoria?: Database["public"]["Enums"]["doc_categoria"]
          claim_id?: string | null
          commessa?: string | null
          created_at?: string
          created_by?: string
          deck?: string | null
          deleted_at?: string | null
          filename?: string
          frozen_at?: string | null
          id?: string
          inca_cavo_id?: string | null
          inca_file_id?: string | null
          kpi_ref?: string | null
          mime_type?: string | null
          note?: string | null
          operator_id?: string | null
          origine?: Database["public"]["Enums"]["doc_origine"]
          rapportino_id?: string | null
          retention_until?: string | null
          settimana_iso?: number | null
          sha256?: string | null
          size_bytes?: number | null
          stato_doc?: Database["public"]["Enums"]["doc_stato"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          version_num?: number | null
          version_of?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "core_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "core_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "core_files_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_files_version_of_fkey"
            columns: ["version_of"]
            isOneToOne: false
            referencedRelation: "core_files"
            referencedColumns: ["id"]
          },
        ]
      }
      core_operators: {
        Row: {
          active: boolean
          aliases: string[]
          created_at: string
          display_name: string
          id: string
          updated_at: string
          whatsapp_name: string | null
          whatsapp_number: string | null
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          whatsapp_name?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          active?: boolean
          aliases?: string[]
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          whatsapp_name?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      daily_list_imports: {
        Row: {
          file_name: string
          id: string
          imported_at: string
          imported_by: string | null
          list_date: string | null
          raw_metadata: Json
          rows_count: number
          source_kind: string
          status: string
        }
        Insert: {
          file_name: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          list_date?: string | null
          raw_metadata?: Json
          rows_count?: number
          source_kind: string
          status?: string
        }
        Update: {
          file_name?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          list_date?: string | null
          raw_metadata?: Json
          rows_count?: number
          source_kind?: string
          status?: string
        }
        Relationships: []
      }
      daily_list_item_events: {
        Row: {
          actor_label: string | null
          cable_code_normalized: string | null
          cable_event_id: string | null
          confidence: number
          core_event_id: string | null
          created_at: string
          daily_list_item_id: string
          event_kind: string
          id: string
          import_id: string | null
          occurred_at: string | null
          progress_percent: number | null
          raw_note: string | null
          source_type: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          actor_label?: string | null
          cable_code_normalized?: string | null
          cable_event_id?: string | null
          confidence?: number
          core_event_id?: string | null
          created_at?: string
          daily_list_item_id: string
          event_kind: string
          id?: string
          import_id?: string | null
          occurred_at?: string | null
          progress_percent?: number | null
          raw_note?: string | null
          source_type?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          actor_label?: string | null
          cable_code_normalized?: string | null
          cable_event_id?: string | null
          confidence?: number
          core_event_id?: string | null
          created_at?: string
          daily_list_item_id?: string
          event_kind?: string
          id?: string
          import_id?: string | null
          occurred_at?: string | null
          progress_percent?: number | null
          raw_note?: string | null
          source_type?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_list_item_events_cable_event_id_fkey"
            columns: ["cable_event_id"]
            isOneToOne: false
            referencedRelation: "cable_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_item_events_core_event_id_fkey"
            columns: ["core_event_id"]
            isOneToOne: false
            referencedRelation: "core_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_item_events_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "daily_list_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_item_events_item_id_fkey"
            columns: ["daily_list_item_id"]
            isOneToOne: false
            referencedRelation: "daily_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_item_events_whatsapp_message_id_fkey"
            columns: ["whatsapp_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_list_item_status_snapshots: {
        Row: {
          computed_status: string
          evidence_count: number
          id: string
          item_id: string
          open_findings_count: number
          open_priorities_count: number
          payload: Json
          snapshot_at: string
        }
        Insert: {
          computed_status: string
          evidence_count?: number
          id?: string
          item_id: string
          open_findings_count?: number
          open_priorities_count?: number
          payload?: Json
          snapshot_at?: string
        }
        Update: {
          computed_status?: string
          evidence_count?: number
          id?: string
          item_id?: string
          open_findings_count?: number
          open_priorities_count?: number
          payload?: Json
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_list_item_status_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "daily_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_list_items: {
        Row: {
          app_arrivo: string | null
          app_partenza: string | null
          cable_code_normalized: string
          cable_code_raw: string
          created_at: string
          data_perimetro: string | null
          id: string
          import_id: string
          inca_cavo_id: string | null
          list_number: string | null
          list_resolution_date: string | null
          note: string | null
          perimetro: string | null
          planned_status: string | null
          priority_level: string | null
          situazione_inca: string | null
          stato_collegamento: string | null
        }
        Insert: {
          app_arrivo?: string | null
          app_partenza?: string | null
          cable_code_normalized: string
          cable_code_raw: string
          created_at?: string
          data_perimetro?: string | null
          id?: string
          import_id: string
          inca_cavo_id?: string | null
          list_number?: string | null
          list_resolution_date?: string | null
          note?: string | null
          perimetro?: string | null
          planned_status?: string | null
          priority_level?: string | null
          situazione_inca?: string | null
          stato_collegamento?: string | null
        }
        Update: {
          app_arrivo?: string | null
          app_partenza?: string | null
          cable_code_normalized?: string
          cable_code_raw?: string
          created_at?: string
          data_perimetro?: string | null
          id?: string
          import_id?: string
          inca_cavo_id?: string | null
          list_number?: string | null
          list_resolution_date?: string | null
          note?: string | null
          perimetro?: string | null
          planned_status?: string | null
          priority_level?: string | null
          situazione_inca?: string | null
          stato_collegamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_list_items_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "daily_list_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_list_items_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
        ]
      }
      impianti: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          note: string | null
          ship_id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          note?: string | null
          ship_id: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          note?: string | null
          ship_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impianti_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      impianto_capi: {
        Row: {
          capo_id: string
          created_at: string
          impianto_id: string
          note: string | null
          week: string
        }
        Insert: {
          capo_id: string
          created_at?: string
          impianto_id: string
          note?: string | null
          week?: string
        }
        Update: {
          capo_id?: string
          created_at?: string
          impianto_id?: string
          note?: string | null
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "impianto_capi_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "impianto_capi_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "impianto_capi_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impianto_capi_impianto_id_fkey"
            columns: ["impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["id"]
          },
        ]
      }
      inca_cavi: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string
          codice_inca: string | null
          codice_norm: string | null
          commessa: string | null
          costr: string | null
          created_at: string
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          eliminated_count: number
          flag_changed_in_source: boolean
          from_file_id: string | null
          id: string
          impianto: string | null
          inca_data_collegamento: string | null
          inca_data_creazione_instradamento_ts: string | null
          inca_data_instradamento_ts: string | null
          inca_data_posa: string | null
          inca_data_richiesta_taglio: string | null
          inca_data_taglio: string | null
          inca_dataela_ts: string | null
          inca_file_id: string | null
          last_eliminated_at: string | null
          last_import_id: string | null
          last_reinstated_at: string | null
          last_rework_at: string | null
          last_seen_in_import_at: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          missing_in_latest_import: boolean
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          raw: Json
          reinstated_count: number
          rev_inca: string | null
          rework_count: number
          sezione: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Insert: {
          apparato_a?: string | null
          apparato_da?: string | null
          codice: string
          codice_inca?: string | null
          codice_norm?: string | null
          commessa?: string | null
          costr?: string | null
          created_at?: string
          descrizione?: string | null
          descrizione_a?: string | null
          descrizione_da?: string | null
          eliminated_count?: number
          flag_changed_in_source?: boolean
          from_file_id?: string | null
          id?: string
          impianto?: string | null
          inca_data_collegamento?: string | null
          inca_data_creazione_instradamento_ts?: string | null
          inca_data_instradamento_ts?: string | null
          inca_data_posa?: string | null
          inca_data_richiesta_taglio?: string | null
          inca_data_taglio?: string | null
          inca_dataela_ts?: string | null
          inca_file_id?: string | null
          last_eliminated_at?: string | null
          last_import_id?: string | null
          last_reinstated_at?: string | null
          last_rework_at?: string | null
          last_seen_in_import_at?: string | null
          livello?: string | null
          livello_disturbo?: string | null
          marca_cavo?: string | null
          metri_dis?: number | null
          metri_posati_teorici?: number | null
          metri_previsti?: number | null
          metri_sit_cavo?: number | null
          metri_sit_tec?: number | null
          metri_sta?: number | null
          metri_teo?: number | null
          metri_totali?: number | null
          missing_in_latest_import?: boolean
          pagina_pdf?: number | null
          progress_percent?: number | null
          progress_side?: string | null
          raw?: Json
          reinstated_count?: number
          rev_inca?: string | null
          rework_count?: number
          sezione?: string | null
          situazione?: string | null
          situazione_cavo?: string | null
          stato_cantiere?: string | null
          stato_inca?: string | null
          stato_tec?: string | null
          tipo?: string | null
          updated_at?: string
          wbs?: string | null
          zona_a?: string | null
          zona_da?: string | null
        }
        Update: {
          apparato_a?: string | null
          apparato_da?: string | null
          codice?: string
          codice_inca?: string | null
          codice_norm?: string | null
          commessa?: string | null
          costr?: string | null
          created_at?: string
          descrizione?: string | null
          descrizione_a?: string | null
          descrizione_da?: string | null
          eliminated_count?: number
          flag_changed_in_source?: boolean
          from_file_id?: string | null
          id?: string
          impianto?: string | null
          inca_data_collegamento?: string | null
          inca_data_creazione_instradamento_ts?: string | null
          inca_data_instradamento_ts?: string | null
          inca_data_posa?: string | null
          inca_data_richiesta_taglio?: string | null
          inca_data_taglio?: string | null
          inca_dataela_ts?: string | null
          inca_file_id?: string | null
          last_eliminated_at?: string | null
          last_import_id?: string | null
          last_reinstated_at?: string | null
          last_rework_at?: string | null
          last_seen_in_import_at?: string | null
          livello?: string | null
          livello_disturbo?: string | null
          marca_cavo?: string | null
          metri_dis?: number | null
          metri_posati_teorici?: number | null
          metri_previsti?: number | null
          metri_sit_cavo?: number | null
          metri_sit_tec?: number | null
          metri_sta?: number | null
          metri_teo?: number | null
          metri_totali?: number | null
          missing_in_latest_import?: boolean
          pagina_pdf?: number | null
          progress_percent?: number | null
          progress_side?: string | null
          raw?: Json
          reinstated_count?: number
          rev_inca?: string | null
          rework_count?: number
          sezione?: string | null
          situazione?: string | null
          situazione_cavo?: string | null
          stato_cantiere?: string | null
          stato_inca?: string | null
          stato_tec?: string | null
          tipo?: string | null
          updated_at?: string
          wbs?: string | null
          zona_a?: string | null
          zona_da?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_cavi_snapshot: {
        Row: {
          codice: string
          created_at: string
          flag_changed_in_source: boolean
          import_id: string
          inca_file_id: string | null
          metri_dis: number | null
          metri_teo: number | null
          row_hash: string | null
          situazione: string | null
        }
        Insert: {
          codice: string
          created_at?: string
          flag_changed_in_source?: boolean
          import_id: string
          inca_file_id?: string | null
          metri_dis?: number | null
          metri_teo?: number | null
          row_hash?: string | null
          situazione?: string | null
        }
        Update: {
          codice?: string
          created_at?: string
          flag_changed_in_source?: boolean
          import_id?: string
          inca_file_id?: string | null
          metri_dis?: number | null
          metri_teo?: number | null
          row_hash?: string | null
          situazione?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_snapshot_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "inca_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      inca_change_events: {
        Row: {
          change_type: Database["public"]["Enums"]["inca_change_type"]
          codice: string
          created_at: string
          field: string | null
          from_import_id: string | null
          id: string
          inca_file_id: string | null
          new_value: Json | null
          old_value: Json | null
          payload: Json | null
          severity: Database["public"]["Enums"]["inca_change_severity"]
          to_import_id: string
        }
        Insert: {
          change_type: Database["public"]["Enums"]["inca_change_type"]
          codice: string
          created_at?: string
          field?: string | null
          from_import_id?: string | null
          id?: string
          inca_file_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          payload?: Json | null
          severity: Database["public"]["Enums"]["inca_change_severity"]
          to_import_id: string
        }
        Update: {
          change_type?: Database["public"]["Enums"]["inca_change_type"]
          codice?: string
          created_at?: string
          field?: string | null
          from_import_id?: string | null
          id?: string
          inca_file_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          payload?: Json | null
          severity?: Database["public"]["Enums"]["inca_change_severity"]
          to_import_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inca_change_events_from_import_id_fkey"
            columns: ["from_import_id"]
            isOneToOne: false
            referencedRelation: "inca_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_change_events_to_import_id_fkey"
            columns: ["to_import_id"]
            isOneToOne: false
            referencedRelation: "inca_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      inca_files: {
        Row: {
          commessa: string | null
          content_hash: string | null
          costr: string | null
          file_name: string
          file_path: string | null
          file_type: string
          group_key: string | null
          id: string
          import_run_id: string | null
          note: string | null
          previous_inca_file_id: string | null
          project_code: string | null
          ship_id: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          commessa?: string | null
          content_hash?: string | null
          costr?: string | null
          file_name: string
          file_path?: string | null
          file_type?: string
          group_key?: string | null
          id?: string
          import_run_id?: string | null
          note?: string | null
          previous_inca_file_id?: string | null
          project_code?: string | null
          ship_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          commessa?: string | null
          content_hash?: string | null
          costr?: string | null
          file_name?: string
          file_path?: string | null
          file_type?: string
          group_key?: string | null
          id?: string
          import_run_id?: string | null
          note?: string | null
          previous_inca_file_id?: string | null
          project_code?: string | null
          ship_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "inca_import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "inca_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "inca_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inca_import_runs: {
        Row: {
          commessa: string | null
          content_hash: string | null
          costr: string | null
          created_at: string
          created_by: string | null
          diff: Json | null
          group_key: string
          id: string
          mode: string
          new_inca_file_id: string | null
          previous_inca_file_id: string | null
          project_code: string | null
          summary: Json | null
        }
        Insert: {
          commessa?: string | null
          content_hash?: string | null
          costr?: string | null
          created_at?: string
          created_by?: string | null
          diff?: Json | null
          group_key: string
          id?: string
          mode: string
          new_inca_file_id?: string | null
          previous_inca_file_id?: string | null
          project_code?: string | null
          summary?: Json | null
        }
        Update: {
          commessa?: string | null
          content_hash?: string | null
          costr?: string | null
          created_at?: string
          created_by?: string | null
          diff?: Json | null
          group_key?: string
          id?: string
          mode?: string
          new_inca_file_id?: string | null
          previous_inca_file_id?: string | null
          project_code?: string | null
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_new_inca_file_id_fkey"
            columns: ["new_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_import_runs_previous_inca_file_id_fkey"
            columns: ["previous_inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_import_summaries: {
        Row: {
          block_count: number
          created_at: string
          disappeared_allowed_count: number
          disappeared_unexpected_count: number
          eliminated_count: number
          flagged_count: number
          import_id: string
          inca_file_id: string | null
          info_count: number
          inserted_count: number
          metri_dis_changed_count: number
          metri_teo_changed_count: number
          reinstated_count: number
          rework_count: number
          total_rows: number
          updated_count: number
          warn_count: number
        }
        Insert: {
          block_count?: number
          created_at?: string
          disappeared_allowed_count?: number
          disappeared_unexpected_count?: number
          eliminated_count?: number
          flagged_count?: number
          import_id: string
          inca_file_id?: string | null
          info_count?: number
          inserted_count?: number
          metri_dis_changed_count?: number
          metri_teo_changed_count?: number
          reinstated_count?: number
          rework_count?: number
          total_rows?: number
          updated_count?: number
          warn_count?: number
        }
        Update: {
          block_count?: number
          created_at?: string
          disappeared_allowed_count?: number
          disappeared_unexpected_count?: number
          eliminated_count?: number
          flagged_count?: number
          import_id?: string
          inca_file_id?: string | null
          info_count?: number
          inserted_count?: number
          metri_dis_changed_count?: number
          metri_teo_changed_count?: number
          reinstated_count?: number
          rework_count?: number
          total_rows?: number
          updated_count?: number
          warn_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "inca_import_summaries_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: true
            referencedRelation: "inca_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      inca_imports: {
        Row: {
          checksum_sha256: string | null
          created_by: string | null
          file_name: string | null
          id: string
          imported_at: string
          inca_file_id: string | null
          note: string | null
          source: string
        }
        Insert: {
          checksum_sha256?: string | null
          created_by?: string | null
          file_name?: string | null
          id?: string
          imported_at?: string
          inca_file_id?: string | null
          note?: string | null
          source?: string
        }
        Update: {
          checksum_sha256?: string | null
          created_by?: string | null
          file_name?: string | null
          id?: string
          imported_at?: string
          inca_file_id?: string | null
          note?: string | null
          source?: string
        }
        Relationships: []
      }
      inca_percorsi: {
        Row: {
          created_at: string
          id: string
          inca_cavo_id: string
          nodo: string
          ordine: number
          page: number | null
          raw_kind: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inca_cavo_id: string
          nodo: string
          ordine: number
          page?: number | null
          raw_kind?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inca_cavo_id?: string
          nodo?: string
          ordine?: number
          page?: number | null
          raw_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
        ]
      }
      inca_saved_views: {
        Row: {
          columns: Json
          created_at: string
          filters: Json
          id: string
          mode: string
          name: string
          owner_user_id: string | null
          role_scope: string | null
          sort: Json
        }
        Insert: {
          columns: Json
          created_at?: string
          filters: Json
          id?: string
          mode: string
          name: string
          owner_user_id?: string | null
          role_scope?: string | null
          sort: Json
        }
        Update: {
          columns?: Json
          created_at?: string
          filters?: Json
          id?: string
          mode?: string
          name?: string
          owner_user_id?: string | null
          role_scope?: string | null
          sort?: Json
        }
        Relationships: []
      }
      incoming_messages: {
        Row: {
          cable_refs: Json
          classification: Json
          core_event_id: string | null
          created_at: string
          id: string
          message_ts: string | null
          message_type: string | null
          processed: boolean
          raw_payload: Json
          sender: string | null
          sender_name: string | null
          source: string
          text: string | null
          wamid: string | null
        }
        Insert: {
          cable_refs?: Json
          classification?: Json
          core_event_id?: string | null
          created_at?: string
          id?: string
          message_ts?: string | null
          message_type?: string | null
          processed?: boolean
          raw_payload?: Json
          sender?: string | null
          sender_name?: string | null
          source?: string
          text?: string | null
          wamid?: string | null
        }
        Update: {
          cable_refs?: Json
          classification?: Json
          core_event_id?: string | null
          created_at?: string
          id?: string
          message_ts?: string | null
          message_type?: string | null
          processed?: boolean
          raw_payload?: Json
          sender?: string | null
          sender_name?: string | null
          source?: string
          text?: string | null
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_messages_core_event_id_fkey"
            columns: ["core_event_id"]
            isOneToOne: false
            referencedRelation: "core_events"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_capo_assignments: {
        Row: {
          active: boolean
          capo_id: string
          created_at: string
          created_by: string | null
          manager_id: string
        }
        Insert: {
          active?: boolean
          capo_id: string
          created_at?: string
          created_by?: string | null
          manager_id: string
        }
        Update: {
          active?: boolean
          capo_id?: string
          created_at?: string
          created_by?: string | null
          manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_capo_assignments_capo_fk"
            columns: ["capo_id"]
            isOneToOne: true
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_capo_assignments_capo_fk"
            columns: ["capo_id"]
            isOneToOne: true
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_capo_assignments_capo_fk"
            columns: ["capo_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_capo_assignments_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_capo_assignments_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_capo_assignments_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_plans: {
        Row: {
          created_at: string
          created_by: string | null
          frozen_at: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          manager_id: string
          note: string | null
          period_type: Database["public"]["Enums"]["plan_period_type"]
          plan_date: string | null
          status: Database["public"]["Enums"]["plan_status"]
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
          week_iso: number | null
          year_iso: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          manager_id: string
          note?: string | null
          period_type: Database["public"]["Enums"]["plan_period_type"]
          plan_date?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          week_iso?: number | null
          year_iso?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          manager_id?: string
          note?: string | null
          period_type?: Database["public"]["Enums"]["plan_period_type"]
          plan_date?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          week_iso?: number | null
          year_iso?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      navemaster_alerts: {
        Row: {
          codice: string | null
          codice_norm: string | null
          commessa: string
          costr: string
          created_at: string
          evidence: Json
          id: string
          resolved_at: string | null
          resolved_by: string | null
          run_id: string
          severity: Database["public"]["Enums"]["nav_severity"]
          ship_id: string
          status: Database["public"]["Enums"]["navemaster_alert_status"]
          type: Database["public"]["Enums"]["navemaster_alert_type"]
        }
        Insert: {
          codice?: string | null
          codice_norm?: string | null
          commessa: string
          costr: string
          created_at?: string
          evidence?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          run_id: string
          severity?: Database["public"]["Enums"]["nav_severity"]
          ship_id: string
          status?: Database["public"]["Enums"]["navemaster_alert_status"]
          type: Database["public"]["Enums"]["navemaster_alert_type"]
        }
        Update: {
          codice?: string | null
          codice_norm?: string | null
          commessa?: string
          costr?: string
          created_at?: string
          evidence?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string
          severity?: Database["public"]["Enums"]["nav_severity"]
          ship_id?: string
          status?: Database["public"]["Enums"]["navemaster_alert_status"]
          type?: Database["public"]["Enums"]["navemaster_alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_kpi_v2"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_latest_run_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v2"
            referencedColumns: ["run_pk"]
          },
          {
            foreignKeyName: "navemaster_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_events: {
        Row: {
          blocco_locale_id: string | null
          codice: string
          codice_norm: string | null
          commessa: string
          costr: string
          created_at: string
          created_by: string | null
          event_at: string
          event_type: Database["public"]["Enums"]["navemaster_event_type"]
          id: string
          note: string | null
          ship_id: string
        }
        Insert: {
          blocco_locale_id?: string | null
          codice: string
          codice_norm?: string | null
          commessa: string
          costr: string
          created_at?: string
          created_by?: string | null
          event_at?: string
          event_type: Database["public"]["Enums"]["navemaster_event_type"]
          id?: string
          note?: string | null
          ship_id: string
        }
        Update: {
          blocco_locale_id?: string | null
          codice?: string
          codice_norm?: string | null
          commessa?: string
          costr?: string
          created_at?: string
          created_by?: string | null
          event_at?: string
          event_type?: Database["public"]["Enums"]["navemaster_event_type"]
          id?: string
          note?: string | null
          ship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_events_blocco_locale_id_fkey"
            columns: ["blocco_locale_id"]
            isOneToOne: false
            referencedRelation: "blocchi_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_events_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_imports: {
        Row: {
          commessa: string | null
          costr: string | null
          file_bucket: string
          file_name: string
          file_path: string
          id: string
          imported_at: string
          imported_by: string | null
          is_active: boolean
          note: string | null
          ship_id: string
          source_sha256: string | null
        }
        Insert: {
          commessa?: string | null
          costr?: string | null
          file_bucket?: string
          file_name: string
          file_path: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          is_active?: boolean
          note?: string | null
          ship_id: string
          source_sha256?: string | null
        }
        Update: {
          commessa?: string | null
          costr?: string | null
          file_bucket?: string
          file_name?: string
          file_path?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          is_active?: boolean
          note?: string | null
          ship_id?: string
          source_sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_inca_alerts: {
        Row: {
          created_at: string
          id: string
          inca_file_id: string
          inca_state: string | null
          marcacavo: string
          meta: Json
          navemaster_state: string | null
          rule: string
          severity: string
          ship_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inca_file_id: string
          inca_state?: string | null
          marcacavo: string
          meta?: Json
          navemaster_state?: string | null
          rule: string
          severity: string
          ship_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inca_file_id?: string
          inca_state?: string | null
          marcacavo?: string
          meta?: Json
          navemaster_state?: string | null
          rule?: string
          severity?: string
          ship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_inca_alerts_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_inca_diff: {
        Row: {
          created_at: string
          id: string
          inca_file_id: string
          inca_status_new: string | null
          inca_status_prev: string | null
          marcacavo: string
          match_new: boolean | null
          match_prev: boolean | null
          meta: Json
          nav_status: string | null
          new_value: number | null
          prev_value: number | null
          rule: string
          severity: string
          ship_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inca_file_id: string
          inca_status_new?: string | null
          inca_status_prev?: string | null
          marcacavo: string
          match_new?: boolean | null
          match_prev?: boolean | null
          meta?: Json
          nav_status?: string | null
          new_value?: number | null
          prev_value?: number | null
          rule: string
          severity: string
          ship_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inca_file_id?: string
          inca_status_new?: string | null
          inca_status_prev?: string | null
          marcacavo?: string
          match_new?: boolean | null
          match_prev?: boolean | null
          meta?: Json
          nav_status?: string | null
          new_value?: number | null
          prev_value?: number | null
          rule?: string
          severity?: string
          ship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_inca_diff_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_rows: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          created_at: string
          descrizione: string | null
          id: string
          impianto: string | null
          livello: string | null
          marcacavo: string
          navemaster_import_id: string
          payload: Json
          sezione: string | null
          situazione_cavo_conit: string | null
          stato_cavo: string | null
          tipologia: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Insert: {
          apparato_a?: string | null
          apparato_da?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          impianto?: string | null
          livello?: string | null
          marcacavo: string
          navemaster_import_id: string
          payload: Json
          sezione?: string | null
          situazione_cavo_conit?: string | null
          stato_cavo?: string | null
          tipologia?: string | null
          zona_a?: string | null
          zona_da?: string | null
        }
        Update: {
          apparato_a?: string | null
          apparato_da?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          impianto?: string | null
          livello?: string | null
          marcacavo?: string
          navemaster_import_id?: string
          payload?: Json
          sezione?: string | null
          situazione_cavo_conit?: string | null
          stato_cavo?: string | null
          tipologia?: string | null
          zona_a?: string | null
          zona_da?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_rows_navemaster_import_id_fkey"
            columns: ["navemaster_import_id"]
            isOneToOne: false
            referencedRelation: "navemaster_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_rows_navemaster_import_id_fkey"
            columns: ["navemaster_import_id"]
            isOneToOne: false
            referencedRelation: "navemaster_latest_import_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_rows_navemaster_import_id_fkey"
            columns: ["navemaster_import_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["navemaster_import_id"]
          },
        ]
      }
      navemaster_runs: {
        Row: {
          approved_from: string | null
          approved_to: string | null
          commessa: string
          costr: string
          created_at: string
          created_by: string | null
          drivers: Json
          frozen_at: string | null
          id: string
          inca_file_id: string
          ship_id: string
          verdict: Database["public"]["Enums"]["navemaster_run_verdict"]
        }
        Insert: {
          approved_from?: string | null
          approved_to?: string | null
          commessa: string
          costr: string
          created_at?: string
          created_by?: string | null
          drivers?: Json
          frozen_at?: string | null
          id?: string
          inca_file_id: string
          ship_id: string
          verdict?: Database["public"]["Enums"]["navemaster_run_verdict"]
        }
        Update: {
          approved_from?: string | null
          approved_to?: string | null
          commessa?: string
          costr?: string
          created_at?: string
          created_by?: string | null
          drivers?: Json
          frozen_at?: string | null
          id?: string
          inca_file_id?: string
          ship_id?: string
          verdict?: Database["public"]["Enums"]["navemaster_run_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_state_rows: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string
          codice_norm: string | null
          coverage: Database["public"]["Enums"]["navemaster_coverage"]
          created_at: string
          delta_metri: number
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          id: string
          impianto: string | null
          inca_file_id: string
          is_modified: boolean | null
          last_proof_at: string | null
          last_rapportino_id: string | null
          livello: string | null
          metri_dis: number | null
          metri_posati_ref: number
          metri_ref: number
          metri_teo: number | null
          metri_totali: number | null
          run_id: string
          sezione: string | null
          ship_id: string
          stato_nav: Database["public"]["Enums"]["nav_status"]
          tipo: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Insert: {
          apparato_a?: string | null
          apparato_da?: string | null
          codice: string
          codice_norm?: string | null
          coverage?: Database["public"]["Enums"]["navemaster_coverage"]
          created_at?: string
          delta_metri?: number
          descrizione?: string | null
          descrizione_a?: string | null
          descrizione_da?: string | null
          id?: string
          impianto?: string | null
          inca_file_id: string
          is_modified?: boolean | null
          last_proof_at?: string | null
          last_rapportino_id?: string | null
          livello?: string | null
          metri_dis?: number | null
          metri_posati_ref?: number
          metri_ref?: number
          metri_teo?: number | null
          metri_totali?: number | null
          run_id: string
          sezione?: string | null
          ship_id: string
          stato_nav?: Database["public"]["Enums"]["nav_status"]
          tipo?: string | null
          wbs?: string | null
          zona_a?: string | null
          zona_da?: string | null
        }
        Update: {
          apparato_a?: string | null
          apparato_da?: string | null
          codice?: string
          codice_norm?: string | null
          coverage?: Database["public"]["Enums"]["navemaster_coverage"]
          created_at?: string
          delta_metri?: number
          descrizione?: string | null
          descrizione_a?: string | null
          descrizione_da?: string | null
          id?: string
          impianto?: string | null
          inca_file_id?: string
          is_modified?: boolean | null
          last_proof_at?: string | null
          last_rapportino_id?: string | null
          livello?: string | null
          metri_dis?: number | null
          metri_posati_ref?: number
          metri_ref?: number
          metri_teo?: number | null
          metri_totali?: number | null
          run_id?: string
          sezione?: string | null
          ship_id?: string
          stato_nav?: Database["public"]["Enums"]["nav_status"]
          tipo?: string | null
          wbs?: string | null
          zona_a?: string | null
          zona_da?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_kpi_v2"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_latest_run_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v2"
            referencedColumns: ["run_pk"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      operator_ship_attendance: {
        Row: {
          created_at: string
          note: string | null
          operator_id: string
          plan_date: string
          reason: string | null
          reported_at: string | null
          ship_id: string
          status: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          operator_id: string
          plan_date: string
          reason?: string | null
          reported_at?: string | null
          ship_id: string
          status?: string
        }
        Update: {
          created_at?: string
          note?: string | null
          operator_id?: string
          plan_date?: string
          reason?: string | null
          reported_at?: string | null
          ship_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_ship_attendance_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_ship_attendance_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      operators: {
        Row: {
          birth_date: string | null
          cognome: string | null
          created_at: string
          created_by: string | null
          id: string
          is_normalized: boolean
          name: string
          nome: string | null
          operator_code: string | null
          operator_key: string | null
          roles: string[]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_normalized?: boolean
          name: string
          nome?: string | null
          operator_code?: string | null
          operator_key?: string | null
          roles?: string[]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_normalized?: boolean
          name?: string
          nome?: string | null
          operator_code?: string | null
          operator_key?: string | null
          roles?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      percorso_cable_segments: {
        Row: {
          cable_id: string
          id: string
          inca_code: string
          seq: number
        }
        Insert: {
          cable_id: string
          id?: string
          inca_code: string
          seq: number
        }
        Update: {
          cable_id?: string
          id?: string
          inca_code?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "percorso_cable_segments_cable_id_fkey"
            columns: ["cable_id"]
            isOneToOne: false
            referencedRelation: "percorso_cables"
            referencedColumns: ["id"]
          },
        ]
      }
      percorso_cables: {
        Row: {
          cable_label: string
          created_at: string | null
          document_id: string
          id: string
          source_from: string | null
          source_to: string | null
        }
        Insert: {
          cable_label: string
          created_at?: string | null
          document_id: string
          id?: string
          source_from?: string | null
          source_to?: string | null
        }
        Update: {
          cable_label?: string
          created_at?: string | null
          document_id?: string
          id?: string
          source_from?: string | null
          source_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "percorso_cables_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "percorso_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "percorso_cables_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "percorso_documents_stats_v1"
            referencedColumns: ["document_id"]
          },
        ]
      }
      percorso_documents: {
        Row: {
          commessa: string
          file_path: string
          id: string
          inca_file_id: string | null
          note: string | null
          ship_code: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          commessa: string
          file_path: string
          id?: string
          inca_file_id?: string | null
          note?: string | null
          ship_code: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          commessa?: string
          file_path?: string
          id?: string
          inca_file_id?: string | null
          note?: string | null
          ship_code?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "percorso_documents_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      percorso_lot_cables: {
        Row: {
          cable_id: string
          lot_id: string
        }
        Insert: {
          cable_id: string
          lot_id: string
        }
        Update: {
          cable_id?: string
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "percorso_lot_cables_cable_id_fkey"
            columns: ["cable_id"]
            isOneToOne: false
            referencedRelation: "percorso_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "percorso_lot_cables_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "percorso_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      percorso_lot_segments: {
        Row: {
          inca_code: string
          lot_id: string
        }
        Insert: {
          inca_code: string
          lot_id: string
        }
        Update: {
          inca_code?: string
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "percorso_lot_segments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "percorso_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      percorso_lot_validations: {
        Row: {
          decision: string
          id: string
          lot_id: string
          note: string | null
          role: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          decision: string
          id?: string
          lot_id: string
          note?: string | null
          role: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          decision?: string
          id?: string
          lot_id?: string
          note?: string | null
          role?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "percorso_lot_validations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "percorso_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      percorso_lots: {
        Row: {
          comment: string | null
          created_at: string | null
          created_by: string | null
          document_id: string
          id: string
          status: Database["public"]["Enums"]["percorso_lot_status"]
          sviluppo_by: Database["public"]["Enums"]["percorso_sviluppo_by"]
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id: string
          id?: string
          status?: Database["public"]["Enums"]["percorso_lot_status"]
          sviluppo_by: Database["public"]["Enums"]["percorso_sviluppo_by"]
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          id?: string
          status?: Database["public"]["Enums"]["percorso_lot_status"]
          sviluppo_by?: Database["public"]["Enums"]["percorso_sviluppo_by"]
        }
        Relationships: [
          {
            foreignKeyName: "percorso_lots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "percorso_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "percorso_lots_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "percorso_documents_stats_v1"
            referencedColumns: ["document_id"]
          },
        ]
      }
      plan_capo_slots: {
        Row: {
          capo_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          plan_id: string
          position: number
          updated_at: string
        }
        Insert: {
          capo_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          plan_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          capo_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          plan_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_capo_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_capo_slots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_planning_overview_v1"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_planning_overview_v2"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "capo_my_team_v1"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "capo_my_team_v2"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "manager_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_slot_members: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          operator_id: string
          plan_id: string | null
          position: number
          role_tag: string | null
          slot_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          operator_id: string
          plan_id?: string | null
          position?: number
          role_tag?: string | null
          slot_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          operator_id?: string
          plan_id?: string | null
          position?: number
          role_tag?: string | null
          slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_slot_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_slot_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_slot_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "admin_planning_overview_v1"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "plan_slot_members_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "admin_planning_overview_v2"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "plan_slot_members_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "capo_my_team_v1"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "plan_slot_members_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "capo_my_team_v2"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "plan_slot_members_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "plan_capo_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_audit: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          payload: Json
          plan_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          payload?: Json
          plan_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          payload?: Json
          plan_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "planning_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "planning_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_audit_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_planning_overview_v1"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "planning_audit_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_planning_overview_v2"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "planning_audit_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "capo_my_team_v1"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "planning_audit_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "capo_my_team_v2"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "planning_audit_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "manager_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      production_daily_kpis: {
        Row: {
          active_operators_count: number
          cables_count: number
          commessa: string | null
          created_at: string
          day: string
          id: string
          meters_done: number
          open_anomalies_count: number
          open_priorities_count: number
          payload: Json
          updated_at: string
        }
        Insert: {
          active_operators_count?: number
          cables_count?: number
          commessa?: string | null
          created_at?: string
          day: string
          id?: string
          meters_done?: number
          open_anomalies_count?: number
          open_priorities_count?: number
          payload?: Json
          updated_at?: string
        }
        Update: {
          active_operators_count?: number
          cables_count?: number
          commessa?: string | null
          created_at?: string
          day?: string
          id?: string
          meters_done?: number
          open_anomalies_count?: number
          open_priorities_count?: number
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allowed_cantieri: string[] | null
          app_role: string
          capo_ui_mode: string
          created_at: string
          default_commessa: string | null
          default_costr: string | null
          disabled_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_core_owner: boolean
          must_change_password: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed_cantieri?: string[] | null
          app_role?: string
          capo_ui_mode?: string
          created_at?: string
          default_commessa?: string | null
          default_costr?: string | null
          disabled_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_core_owner?: boolean
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed_cantieri?: string[] | null
          app_role?: string
          capo_ui_mode?: string
          created_at?: string
          default_commessa?: string | null
          default_costr?: string | null
          disabled_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_core_owner?: boolean
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rapportini: {
        Row: {
          acting_for_capo_id: string | null
          approved_by_ufficio: string | null
          approved_by_ufficio_at: string | null
          capo_id: string | null
          capo_name: string
          commessa: string | null
          correction_created_at: string | null
          correction_created_by: string | null
          correction_reason: string | null
          cost: string | null
          costr: string | null
          created_at: string
          created_by: string
          crew_role: string | null
          data: string
          id: string
          last_edited_by: string | null
          note_ufficio: string | null
          prodotto_tot: number | null
          prodotto_totale: number | null
          report_date: string | null
          returned_by_ufficio: string | null
          returned_by_ufficio_at: string | null
          status: string
          superseded_by_rapportino_id: string | null
          supersedes_rapportino_id: string | null
          totale_prodotto: number
          ufficio_note: string | null
          updated_at: string
          user_id: string | null
          validated_by_capo_at: string | null
        }
        Insert: {
          acting_for_capo_id?: string | null
          approved_by_ufficio?: string | null
          approved_by_ufficio_at?: string | null
          capo_id?: string | null
          capo_name?: string
          commessa?: string | null
          correction_created_at?: string | null
          correction_created_by?: string | null
          correction_reason?: string | null
          cost?: string | null
          costr?: string | null
          created_at?: string
          created_by: string
          crew_role?: string | null
          data?: string
          id?: string
          last_edited_by?: string | null
          note_ufficio?: string | null
          prodotto_tot?: number | null
          prodotto_totale?: number | null
          report_date?: string | null
          returned_by_ufficio?: string | null
          returned_by_ufficio_at?: string | null
          status?: string
          superseded_by_rapportino_id?: string | null
          supersedes_rapportino_id?: string | null
          totale_prodotto?: number
          ufficio_note?: string | null
          updated_at?: string
          user_id?: string | null
          validated_by_capo_at?: string | null
        }
        Update: {
          acting_for_capo_id?: string | null
          approved_by_ufficio?: string | null
          approved_by_ufficio_at?: string | null
          capo_id?: string | null
          capo_name?: string
          commessa?: string | null
          correction_created_at?: string | null
          correction_created_by?: string | null
          correction_reason?: string | null
          cost?: string | null
          costr?: string | null
          created_at?: string
          created_by?: string
          crew_role?: string | null
          data?: string
          id?: string
          last_edited_by?: string | null
          note_ufficio?: string | null
          prodotto_tot?: number | null
          prodotto_totale?: number | null
          report_date?: string | null
          returned_by_ufficio?: string | null
          returned_by_ufficio_at?: string | null
          status?: string
          superseded_by_rapportino_id?: string | null
          supersedes_rapportino_id?: string | null
          totale_prodotto?: number
          ufficio_note?: string | null
          updated_at?: string
          user_id?: string | null
          validated_by_capo_at?: string | null
        }
        Relationships: []
      }
      rapportini_corrections_audit: {
        Row: {
          created_at: string
          created_by: string
          id: string
          new_rapportino_id: string
          old_rapportino_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          new_rapportino_id: string
          old_rapportino_id: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          new_rapportino_id?: string
          old_rapportino_id?: string
          reason?: string
        }
        Relationships: []
      }
      rapportino_cavi: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inca_cavo_id: string
          metri_posati: number
          metri_previsti: number | null
          nota: string | null
          rapportino_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inca_cavo_id: string
          metri_posati?: number
          metri_previsti?: number | null
          nota?: string | null
          rapportino_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inca_cavo_id?: string
          metri_posati?: number
          metri_previsti?: number | null
          nota?: string | null
          rapportino_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_cavi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      rapportino_inca_cavi: {
        Row: {
          codice_cache: string | null
          codice_cache_norm: string | null
          commessa_cache: string | null
          costr_cache: string | null
          created_at: string
          id: string
          inca_cavo_id: string
          metri_posati: number
          note: string | null
          posa_date: string | null
          progress_percent: number
          progress_side: string
          rapportino_id: string
          report_date_cache: string | null
          step_type: Database["public"]["Enums"]["cavo_step_type"] | null
          updated_at: string
        }
        Insert: {
          codice_cache?: string | null
          codice_cache_norm?: string | null
          commessa_cache?: string | null
          costr_cache?: string | null
          created_at?: string
          id?: string
          inca_cavo_id: string
          metri_posati?: number
          note?: string | null
          posa_date?: string | null
          progress_percent?: number
          progress_side?: string
          rapportino_id: string
          report_date_cache?: string | null
          step_type?: Database["public"]["Enums"]["cavo_step_type"] | null
          updated_at?: string
        }
        Update: {
          codice_cache?: string | null
          codice_cache_norm?: string | null
          commessa_cache?: string | null
          costr_cache?: string | null
          created_at?: string
          id?: string
          inca_cavo_id?: string
          metri_posati?: number
          note?: string | null
          posa_date?: string | null
          progress_percent?: number
          progress_side?: string
          rapportino_id?: string
          report_date_cache?: string | null
          step_type?: Database["public"]["Enums"]["cavo_step_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      rapportino_row_operators: {
        Row: {
          created_at: string
          id: string
          line_index: number
          operator_id: string
          rapportino_row_id: string
          tempo_hours: number | null
          tempo_raw: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_index: number
          operator_id: string
          rapportino_row_id: string
          tempo_hours?: number | null
          tempo_raw?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          line_index?: number
          operator_id?: string
          rapportino_row_id?: string
          tempo_hours?: number | null
          tempo_raw?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "archive_rapportino_rows_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_row_id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_row_id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_row_id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_row_id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_row_id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_row_id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["row_id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_rapportino_row_id_fkey"
            columns: ["rapportino_row_id"]
            isOneToOne: false
            referencedRelation: "rapportino_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      rapportino_rows: {
        Row: {
          activity_id: string | null
          categoria: string | null
          created_at: string
          descrizione: string | null
          id: string
          note: string | null
          operatori: string | null
          position: number | null
          previsto: number | null
          prodotto: number | null
          rapportino_id: string
          row_index: number
          tempo: string | null
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          categoria?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          note?: string | null
          operatori?: string | null
          position?: number | null
          previsto?: number | null
          prodotto?: number | null
          rapportino_id: string
          row_index?: number
          tempo?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          categoria?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          note?: string | null
          operatori?: string | null
          position?: number | null
          previsto?: number | null
          prodotto?: number | null
          rapportino_id?: string
          row_index?: number
          tempo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "catalogo_attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      ship_capos: {
        Row: {
          capo_id: string
          created_at: string
          created_by: string | null
          ship_id: string
        }
        Insert: {
          capo_id: string
          created_at?: string
          created_by?: string | null
          ship_id: string
        }
        Update: {
          capo_id?: string
          created_at?: string
          created_by?: string | null
          ship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ship_capos_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_capos_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_capos_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_capos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_capos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      ship_managers: {
        Row: {
          created_at: string
          manager_id: string
          ship_id: string
        }
        Insert: {
          created_at?: string
          manager_id: string
          ship_id: string
        }
        Update: {
          created_at?: string
          manager_id?: string
          ship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      ship_operators: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          operator_id: string
          ship_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          operator_id: string
          ship_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          operator_id?: string
          ship_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ship_operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      ships: {
        Row: {
          code: string
          commessa: string
          costr: string
          created_at: string
          deadline_date: string | null
          id: string
          is_active: boolean
          name: string
          progress_inca: number | null
          recent_reports: number | null
          yard: string | null
        }
        Insert: {
          code: string
          commessa: string
          costr: string
          created_at?: string
          deadline_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          progress_inca?: number | null
          recent_reports?: number | null
          yard?: string | null
        }
        Update: {
          code?: string
          commessa?: string
          costr?: string
          created_at?: string
          deadline_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          progress_inca?: number | null
          recent_reports?: number | null
          yard?: string | null
        }
        Relationships: []
      }
      ufficio_capo_scopes: {
        Row: {
          active: boolean
          capo_id: string
          costr: string
          created_at: string
          created_by: string
          id: string
          note: string | null
          revoked_at: string | null
          ship_id: string
          ufficio_id: string
        }
        Insert: {
          active?: boolean
          capo_id: string
          costr: string
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          revoked_at?: string | null
          ship_id: string
          ufficio_id: string
        }
        Update: {
          active?: boolean
          capo_id?: string
          costr?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          revoked_at?: string | null
          ship_id?: string
          ufficio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ufficio_capo_scopes_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_ufficio_id_fkey"
            columns: ["ufficio_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_ufficio_id_fkey"
            columns: ["ufficio_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ufficio_capo_scopes_ufficio_id_fkey"
            columns: ["ufficio_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_imports: {
        Row: {
          created_at: string
          file_name: string | null
          group_name: string | null
          id: string
          imported_at: string
          message_count: number
          raw_metadata: Json
          status: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          group_name?: string | null
          id?: string
          imported_at?: string
          message_count?: number
          raw_metadata?: Json
          status?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          group_name?: string | null
          id?: string
          imported_at?: string
          message_count?: number
          raw_metadata?: Json
          status?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          author: string | null
          author_operator_id: string | null
          created_at: string
          id: string
          import_id: string | null
          media_filename: string | null
          media_type: string | null
          message_hash: string | null
          message_ts: string
          raw_message: string | null
        }
        Insert: {
          author?: string | null
          author_operator_id?: string | null
          created_at?: string
          id?: string
          import_id?: string | null
          media_filename?: string | null
          media_type?: string | null
          message_hash?: string | null
          message_ts: string
          raw_message?: string | null
        }
        Update: {
          author?: string | null
          author_operator_id?: string | null
          created_at?: string
          id?: string
          import_id?: string | null
          media_filename?: string | null
          media_type?: string | null
          message_hash?: string | null
          message_ts?: string
          raw_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_author_operator_id_fkey"
            columns: ["author_operator_id"]
            isOneToOne: false
            referencedRelation: "core_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_imports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_capo_manager_v1: {
        Row: {
          active: boolean | null
          capo_display_name: string | null
          capo_email: string | null
          capo_id: string | null
          created_at: string | null
          created_by: string | null
          manager_display_name: string | null
          manager_email: string | null
          manager_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_capo_assignments_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_capo_assignments_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_capo_assignments_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_manager_perimeter_v1: {
        Row: {
          created_at: string | null
          manager_email: string | null
          manager_id: string | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      admin_planning_overview_v1: {
        Row: {
          capo_id: string | null
          capo_position: number | null
          created_at: string | null
          manager_id: string | null
          operator_id: string | null
          operator_position: number | null
          period_type: Database["public"]["Enums"]["plan_period_type"] | null
          plan_date: string | null
          plan_id: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["plan_status"] | null
          updated_at: string | null
          week_iso: number | null
          year_iso: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_planning_overview_v2: {
        Row: {
          capo_display_name: string | null
          capo_email: string | null
          capo_full_name: string | null
          capo_id: string | null
          capo_position: number | null
          created_at: string | null
          manager_display_name: string | null
          manager_email: string | null
          manager_full_name: string | null
          manager_id: string | null
          operator_cognome: string | null
          operator_id: string | null
          operator_name: string | null
          operator_nome: string | null
          operator_position: number | null
          period_type: Database["public"]["Enums"]["plan_period_type"] | null
          plan_date: string | null
          plan_id: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["plan_status"] | null
          updated_at: string | null
          week_iso: number | null
          year_iso: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "manager_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_ship_capos_v1: {
        Row: {
          capo_email: string | null
          capo_id: string | null
          capo_name: string | null
          created_at: string | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ship_capos_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_capos_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_capos_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      admin_ship_operators_v1: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          operator_id: string | null
          operator_name: string | null
          operator_roles: string[] | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ship_operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_operators_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      admin_ship_resolution_anomalies_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          costr_active_n: number | null
          rapportino_id: string | null
          report_date: string | null
          ship_match_mode: string | null
          status: string | null
          strict_n: number | null
        }
        Relationships: []
      }
      archive_rapportini_v1: {
        Row: {
          approved_by_ufficio: string | null
          approved_by_ufficio_at: string | null
          capo_id: string | null
          capo_name: string | null
          commessa: string | null
          cost: string | null
          costr: string | null
          created_at: string | null
          crew_role: string | null
          data: string | null
          id: string | null
          note_ufficio: string | null
          prodotto_tot: number | null
          prodotto_totale: number | null
          report_date: string | null
          returned_by_ufficio: string | null
          returned_by_ufficio_at: string | null
          status: string | null
          totale_prodotto: number | null
          ufficio_note: string | null
          updated_at: string | null
          user_id: string | null
          validated_by_capo_at: string | null
        }
        Insert: {
          approved_by_ufficio?: string | null
          approved_by_ufficio_at?: string | null
          capo_id?: string | null
          capo_name?: string | null
          commessa?: string | null
          cost?: string | null
          costr?: string | null
          created_at?: string | null
          crew_role?: string | null
          data?: string | null
          id?: string | null
          note_ufficio?: string | null
          prodotto_tot?: number | null
          prodotto_totale?: number | null
          report_date?: string | null
          returned_by_ufficio?: string | null
          returned_by_ufficio_at?: string | null
          status?: string | null
          totale_prodotto?: number | null
          ufficio_note?: string | null
          updated_at?: string | null
          user_id?: string | null
          validated_by_capo_at?: string | null
        }
        Update: {
          approved_by_ufficio?: string | null
          approved_by_ufficio_at?: string | null
          capo_id?: string | null
          capo_name?: string | null
          commessa?: string | null
          cost?: string | null
          costr?: string | null
          created_at?: string | null
          crew_role?: string | null
          data?: string | null
          id?: string | null
          note_ufficio?: string | null
          prodotto_tot?: number | null
          prodotto_totale?: number | null
          report_date?: string | null
          returned_by_ufficio?: string | null
          returned_by_ufficio_at?: string | null
          status?: string | null
          totale_prodotto?: number | null
          ufficio_note?: string | null
          updated_at?: string | null
          user_id?: string | null
          validated_by_capo_at?: string | null
        }
        Relationships: []
      }
      archive_rapportino_cavi_v1: {
        Row: {
          codice: string | null
          created_at: string | null
          descrizione: string | null
          id: number | null
          inca_cavo_id: string | null
          metri_posati: number | null
          metri_totali: number | null
          percentuale: number | null
          rapportino_id: string | null
          updated_at: string | null
        }
        Insert: {
          codice?: string | null
          created_at?: string | null
          descrizione?: string | null
          id?: number | null
          inca_cavo_id?: string | null
          metri_posati?: number | null
          metri_totali?: number | null
          percentuale?: number | null
          rapportino_id?: string | null
          updated_at?: string | null
        }
        Update: {
          codice?: string | null
          created_at?: string | null
          descrizione?: string | null
          id?: number | null
          inca_cavo_id?: string | null
          metri_posati?: number | null
          metri_totali?: number | null
          percentuale?: number | null
          rapportino_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      archive_rapportino_inca_cavi_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          codice_cache: string | null
          commessa: string | null
          commessa_cache: string | null
          costr: string | null
          costr_cache: string | null
          descrizione: string | null
          inca_cavo_id: string | null
          inca_file_id: string | null
          link_id: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati: number | null
          metri_teo: number | null
          note: string | null
          posa_date: string | null
          progress_percent: number | null
          rapportino_id: string | null
          report_date: string | null
          report_date_cache: string | null
          situazione: string | null
          status: string | null
          step_type: Database["public"]["Enums"]["cavo_step_type"] | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_inca_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_inca_cavi_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_rapportino_rows_v1: {
        Row: {
          activity_id: string | null
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          catalog_is_active: boolean | null
          categoria: string | null
          created_at: string | null
          descrizione: string | null
          id: string | null
          note: string | null
          operatori: string | null
          previsto: number | null
          previsto_catalog_value: number | null
          prodotto: number | null
          rapportino_id: string | null
          row_index: number | null
          tempo: string | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "catalogo_attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "admin_ship_resolution_anomalies_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "capo_returned_inbox_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "operator_facts_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_canon_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_norm_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_ship_resolution_v1"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini_with_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_rows_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "ufficio_rapportini_list_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      capo_my_team_v1: {
        Row: {
          capo_id: string | null
          operator_id: string | null
          operator_name: string | null
          operator_position: number | null
          plan_id: string | null
          slot_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      capo_my_team_v2: {
        Row: {
          capo_id: string | null
          cognome: string | null
          nome: string | null
          operator_display_name: string | null
          operator_id: string | null
          operator_position: number | null
          plan_id: string | null
          slot_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "plan_capo_slots_capo_id_fkey"
            columns: ["capo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_slot_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      capo_returned_inbox_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          crew_role: string | null
          id: string | null
          report_date: string | null
          updated_at: string | null
        }
        Insert: {
          capo_id?: string | null
          commessa?: string | null
          costr?: string | null
          crew_role?: string | null
          id?: string | null
          report_date?: string | null
          updated_at?: string | null
        }
        Update: {
          capo_id?: string | null
          commessa?: string | null
          costr?: string | null
          crew_role?: string | null
          id?: string | null
          report_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      capo_team_day_full_v1: {
        Row: {
          capo_id: string | null
          day_created_at: string | null
          day_note: string | null
          day_updated_at: string | null
          member_id: string | null
          member_position: number | null
          member_role_tag: string | null
          operator_id: string | null
          plan_date: string | null
          planned_minutes: number | null
          ship_id: string | null
          status: string | null
          team_activity_code: string | null
          team_day_id: string | null
          team_deck: string | null
          team_id: string | null
          team_name: string | null
          team_note: string | null
          team_position: number | null
          team_zona: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_days_ship_fk"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capo_team_members_operator_fk"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      capo_today_ship_assignments_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          plan_date: string | null
          position: number | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_capos_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      catalogo_scope_effective_v2: {
        Row: {
          activity_id: string | null
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          catalogo_item_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          descrizione: string | null
          is_active: boolean | null
          note: string | null
          previsto_value: number | null
          role_keys: string[] | null
          roles_json: Json | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
          unit_default: Database["public"]["Enums"]["activity_unit"] | null
          unit_effective: Database["public"]["Enums"]["activity_unit"] | null
          unit_override: Database["public"]["Enums"]["activity_unit"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "catalogo_attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      catalogo_ship_commessa_attivita_public_v1: {
        Row: {
          activity_id: string | null
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          catalogo_item_id: string | null
          categoria: string | null
          commessa: string | null
          created_at: string | null
          descrizione: string | null
          is_active: boolean | null
          note: string | null
          previsto_value: number | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
          unit_default: Database["public"]["Enums"]["activity_unit"] | null
          unit_effective: Database["public"]["Enums"]["activity_unit"] | null
          unit_override: Database["public"]["Enums"]["activity_unit"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "catalogo_attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v2"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v3"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v4"
            referencedColumns: ["attivita_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_ship_commessa_attivita_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      direzione_ai_anomalies_total_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          open_count: number | null
          scope_level: string | null
        }
        Relationships: []
      }
      direzione_ai_anomalies_v1: {
        Row: {
          anomaly_type: string | null
          commessa: string | null
          costr: string | null
          open_count: number | null
          scope_level: string | null
        }
        Relationships: []
      }
      direzione_ai_daily_risk_v1: {
        Row: {
          alerts_critical: number | null
          alerts_major: number | null
          anomalies: number | null
          blocks_new: number | null
          commessa: string | null
          costr: string | null
          day_date: string | null
          risk_index: number | null
          scope_level: string | null
        }
        Relationships: []
      }
      direzione_ai_performance_rank_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          performance_ratio: number | null
          previsto_sum: number | null
          prodotto_sum: number | null
          righe_count: number | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
        }
        Relationships: []
      }
      direzione_ai_projection_v1: {
        Row: {
          base_from: string | null
          base_to: string | null
          commessa: string | null
          costr: string | null
          forecast_date: string | null
          forecast_risk_index: number | null
          intercept: number | null
          points: number | null
          scope_level: string | null
          slope: number | null
        }
        Relationships: []
      }
      direzione_ai_radar_v1: {
        Row: {
          alerts_open_critical: number | null
          alerts_open_major: number | null
          alerts_open_metri_mismatch: number | null
          alerts_open_total: number | null
          anomalies_open: number | null
          as_of_date: string | null
          blocks_open: number | null
          blocks_open_critical: number | null
          commessa: string | null
          costr: string | null
          scope_level: string | null
        }
        Relationships: []
      }
      direzione_ai_stability_v1: {
        Row: {
          alerts_open_critical: number | null
          alerts_open_major: number | null
          alerts_open_metri_mismatch: number | null
          anomalies_open: number | null
          as_of_date: string | null
          blocks_open: number | null
          commessa: string | null
          costr: string | null
          scope_level: string | null
          stability_score: number | null
        }
        Relationships: []
      }
      direzione_inca_chantier_totals_v1: {
        Row: {
          cavi_ref_both: number | null
          cavi_ref_dis_only: number | null
          cavi_ref_none: number | null
          cavi_ref_teo_only: number | null
          cavi_totali: number | null
          commessa: string | null
          costr: string | null
          metri_dis_totali: number | null
          metri_posati_ref: number | null
          metri_ref_totali: number | null
          metri_teo_totali: number | null
        }
        Relationships: []
      }
      direzione_inca_chantier_v1: {
        Row: {
          caricato_il: string | null
          cavi_con_metri_dis: number | null
          cavi_con_metri_teo: number | null
          cavi_ref_both: number | null
          cavi_ref_dis_only: number | null
          cavi_ref_none: number | null
          cavi_ref_teo_only: number | null
          cavi_totali: number | null
          commessa: string | null
          costr: string | null
          inca_file_id: string | null
          metri_dis_totali: number | null
          metri_posati_ref: number | null
          metri_ref_totali: number | null
          metri_teo_totali: number | null
          nome_file: string | null
          pct_ref_both: number | null
          pct_ref_none: number | null
        }
        Relationships: []
      }
      direzione_inca_teorico: {
        Row: {
          caricato_il: string | null
          cavi_con_metri_previsti: number | null
          cavi_con_metri_realizzati: number | null
          cavi_posati_con_metri: number | null
          cavi_totali: number | null
          commessa: string | null
          costr: string | null
          inca_file_id: string | null
          metri_posati: number | null
          metri_previsti_totali: number | null
          metri_realizzati: number | null
          nome_file: string | null
          pct_previsti_compilati: number | null
          pct_realizzati_compilati: number | null
        }
        Relationships: []
      }
      direzione_inca_vs_rapportini: {
        Row: {
          codice_cavo: string | null
          delta_campo_vs_inca: number | null
          descrizione_cavo: string | null
          inca_cavo_id: string | null
          metri_posati_da_rapportini: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          situazione: string | null
        }
        Relationships: []
      }
      direzione_operator_daily_v3: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          operator_id: string | null
          previsto_sum: number | null
          prodotto_sum: number | null
          productivity_pct: number | null
          report_date: string | null
          ship_id: string | null
          tokens_invalid: number | null
          tokens_ok: number | null
          tokens_total: number | null
          tokens_zero: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_facts_v1: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          attivita_id: string | null
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          line_index: number | null
          manager_id: string | null
          n_tokens_invalid: number | null
          n_tokens_total: number | null
          n_tokens_zero: number | null
          operator_id: string | null
          prodotto_alloc: number | null
          prodotto_row: number | null
          rapportino_id: string | null
          rapportino_row_id: string | null
          report_date: string | null
          row_index: number | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
          sum_line_hours: number | null
          tempo_hours: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_facts_v2: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          attivita_id: string | null
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          line_index: number | null
          manager_id: string | null
          n_tokens_invalid: number | null
          n_tokens_total: number | null
          n_tokens_zero: number | null
          operator_id: string | null
          previsto_alloc: number | null
          previsto_row: number | null
          prodotto_alloc: number | null
          prodotto_row: number | null
          rapportino_id: string | null
          rapportino_row_id: string | null
          report_date: string | null
          row_index: number | null
          ship_code: string | null
          ship_id: string | null
          ship_match_mode: string | null
          ship_name: string | null
          sum_line_hours: number | null
          tempo_hours: number | null
          tempo_raw: string | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_facts_v3: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          attivita_id: string | null
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          line_index: number | null
          manager_id: string | null
          n_tokens_invalid: number | null
          n_tokens_total: number | null
          n_tokens_zero: number | null
          operator_id: string | null
          previsto_alloc: number | null
          previsto_row: number | null
          prodotto_alloc: number | null
          prodotto_row: number | null
          rapportino_id: string | null
          rapportino_row_id: string | null
          report_date: string | null
          row_index: number | null
          ship_code: string | null
          ship_id: string | null
          ship_match_mode: string | null
          ship_name: string | null
          sum_line_hours: number | null
          tempo_hours: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_facts_v4: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          attivita_id: string | null
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          line_index: number | null
          manager_id: string | null
          n_tokens_invalid: number | null
          n_tokens_total: number | null
          n_tokens_zero: number | null
          operator_id: string | null
          previsto_alloc: number | null
          previsto_row: number | null
          prodotto_alloc: number | null
          prodotto_row: number | null
          rapportino_id: string | null
          rapportino_row_id: string | null
          report_date: string | null
          row_index: number | null
          ship_code: string | null
          ship_id: string | null
          ship_match_mode: string | null
          ship_name: string | null
          sum_line_hours: number | null
          tempo_hours: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_day_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          operator_id: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          report_date: string | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_day_v2: {
        Row: {
          capo_id: string | null
          cognome: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          report_date: string | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_day_v3: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          operator_id: string | null
          previsto_sum: number | null
          prodotto_sum: number | null
          productivity_pct: number | null
          report_date: string | null
          ship_id: string | null
          tokens_invalid: number | null
          tokens_ok: number | null
          tokens_total: number | null
          tokens_zero: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_day_v3_manager_safe: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          operator_id: string | null
          previsto_alloc_sum: number | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          productivity_pct: number | null
          report_date: string | null
          ship_code: string | null
          ship_id: string | null
          ship_match_mode: string | null
          ship_name: string | null
          tokens_invalid: number | null
          tokens_ok: number | null
          tokens_total: number | null
          tokens_zero: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_day_v4_manager_safe: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          delta_vs_previsto: number | null
          delta_vs_previsto_pct_points: number | null
          hours_valid: number | null
          manager_id: string | null
          operator_id: string | null
          previsto_alloc_sum: number | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          productivity_pct: number | null
          ratio_vs_previsto: number | null
          report_date: string | null
          ship_code: string | null
          ship_id: string | null
          ship_match_mode: string | null
          ship_name: string | null
          tokens_invalid: number | null
          tokens_ok: number | null
          tokens_total: number | null
          tokens_zero: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_month_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          month_end: string | null
          month_start: string | null
          operator_id: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_month_v2: {
        Row: {
          capo_id: string | null
          cognome: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          month_end: string | null
          month_start: string | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_month_v3: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          month_end: string | null
          month_start: string | null
          operator_id: string | null
          previsto_sum: number | null
          prodotto_sum: number | null
          productivity_pct: number | null
          ship_id: string | null
          tokens_invalid: number | null
          tokens_ok: number | null
          tokens_total: number | null
          tokens_zero: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_week_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          operator_id: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          saturday_hours: number | null
          saturday_prodotto: number | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_week_v2: {
        Row: {
          capo_id: string | null
          cognome: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          saturday_hours: number | null
          saturday_prodotto: number | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_week_v3: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          operator_id: string | null
          previsto_sum: number | null
          prodotto_sum: number | null
          productivity_pct: number | null
          ship_id: string | null
          tokens_invalid: number | null
          tokens_ok: number | null
          tokens_total: number | null
          tokens_zero: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_year_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          operator_id: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_year_v2: {
        Row: {
          capo_id: string | null
          cognome: string | null
          commessa: string | null
          costr: string | null
          hours_valid: number | null
          manager_id: string | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          prodotto_alloc_sum: number | null
          productivity_index: number | null
          ship_id: string | null
          tempo_invalid_tokens: number | null
          tempo_total_tokens: number | null
          tempo_zero_tokens: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direzione_operator_kpi_year_v3: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          operator_id: string | null
          previsto_sum: number | null
          prodotto_sum: number | null
          productivity_pct: number | null
          ship_id: string | null
          tokens_invalid: number | null
          tokens_ok: number | null
          tokens_total: number | null
          tokens_zero: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inca_cavi_live_by_ship_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          codice_inca: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          from_file_id: string | null
          id: string | null
          impianto: string | null
          inca_file_id: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          rev_inca: string | null
          sezione: string | null
          ship_id: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      inca_cavi_with_data_posa_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          codice_inca: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          data_posa: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          from_file_id: string | null
          id: string | null
          impianto: string | null
          inca_file_id: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          rev_inca: string | null
          sezione: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_cavi_with_last_posa_and_capo_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          capo_id: string | null
          capo_label: string | null
          codice: string | null
          codice_inca: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          data_posa: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          from_file_id: string | null
          id: string | null
          impianto: string | null
          inca_file_id: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          rev_inca: string | null
          sezione: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_cavi_with_last_posa_and_capo_v2: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          capo_label: string | null
          codice: string | null
          codice_inca: string | null
          codice_norm: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          data_posa: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          eliminated_count: number | null
          flag_changed_in_source: boolean | null
          from_file_id: string | null
          id: string | null
          impianto: string | null
          inca_data_collegamento: string | null
          inca_data_creazione_instradamento_ts: string | null
          inca_data_instradamento_ts: string | null
          inca_data_posa: string | null
          inca_data_richiesta_taglio: string | null
          inca_data_taglio: string | null
          inca_dataela_ts: string | null
          inca_file_id: string | null
          last_eliminated_at: string | null
          last_import_id: string | null
          last_reinstated_at: string | null
          last_rework_at: string | null
          last_seen_in_import_at: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          missing_in_latest_import: boolean | null
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          raw: Json | null
          reinstated_count: number | null
          rev_inca: string | null
          rework_count: number | null
          sezione: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_cavi_with_last_posa_and_capo_v3: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          capo_label: string | null
          codice: string | null
          codice_inca: string | null
          codice_norm: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          data_posa: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          eliminated_count: number | null
          flag_changed_in_source: boolean | null
          from_file_id: string | null
          id: string | null
          impianto: string | null
          inca_data_collegamento: string | null
          inca_data_creazione_instradamento_ts: string | null
          inca_data_instradamento_ts: string | null
          inca_data_posa: string | null
          inca_data_richiesta_taglio: string | null
          inca_data_taglio: string | null
          inca_dataela_ts: string | null
          inca_file_id: string | null
          last_eliminated_at: string | null
          last_import_id: string | null
          last_reinstated_at: string | null
          last_rework_at: string | null
          last_seen_in_import_at: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          missing_in_latest_import: boolean | null
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          raw: Json | null
          reinstated_count: number | null
          rev_inca: string | null
          rework_count: number | null
          sezione: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_cavi_with_last_posa_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          codice_inca: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          data_posa: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          from_file_id: string | null
          id: string | null
          impianto: string | null
          inca_file_id: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          rev_inca: string | null
          sezione: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_cavi_with_last_rapportino_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          codice_inca: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          from_file_id: string | null
          id: string | null
          impianto: string | null
          inca_file_id: string | null
          last_capo_name: string | null
          last_report_date: string | null
          livello: string | null
          livello_disturbo: string | null
          marca_cavo: string | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_sta: number | null
          metri_teo: number | null
          metri_totali: number | null
          pagina_pdf: number | null
          progress_percent: number | null
          progress_side: string | null
          rev_inca: string | null
          sezione: string | null
          situazione: string | null
          situazione_cavo: string | null
          stato_cantiere: string | null
          stato_inca: string | null
          stato_tec: string | null
          tipo: string | null
          updated_at: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_from_file_id_fkey"
            columns: ["from_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_cavi_with_path: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          id: string | null
          impianto: string | null
          inca_file_id: string | null
          metri_dis: number | null
          metri_sit_cavo: number | null
          metri_sit_tec: number | null
          metri_teo: number | null
          pagina_pdf: number | null
          percorso_supports: string[] | null
          rev_inca: string | null
          sezione: string | null
          stato_inca: string | null
          tipo: string | null
          updated_at: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_diff_last_import_v1: {
        Row: {
          after_metri_dis: number | null
          after_metri_teo: number | null
          after_situazione: string | null
          after_updated_at: string | null
          before_metri_dis: number | null
          before_metri_teo: number | null
          before_situazione: string | null
          before_updated_at: string | null
          codice: string | null
          is_alert_p_overwrite_candidate: boolean | null
          is_changed: boolean | null
          is_new_in_last_import: boolean | null
          severity: Database["public"]["Enums"]["nav_severity"] | null
          ship_id: string | null
        }
        Relationships: []
      }
      inca_export_ufficio_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          impianto: string | null
          inca_cavo_id: string | null
          inca_file_id: string | null
          livello: string | null
          marca_cavo: string | null
          max_posa_percent: number | null
          metri_dis: number | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_teo: number | null
          metri_totali: number | null
          posa_first_date: string | null
          posa_last_date: string | null
          ripresa_count: number | null
          ripresa_date: string | null
          ripresa_required: boolean | null
          sezione: string | null
          situazione_export: string | null
          tipo: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      inca_head_by_project_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          inca_file_id: string | null
          uploaded_at: string | null
        }
        Relationships: []
      }
      inca_latest_file_by_ship_v1: {
        Row: {
          inca_file_id: string | null
          ship_id: string | null
          uploaded_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      inca_percorsi_nodes_v1: {
        Row: {
          nodo: string | null
          occorrenze: number | null
        }
        Relationships: []
      }
      inca_percorsi_v1: {
        Row: {
          created_at: string | null
          id: string | null
          inca_cavo_id: string | null
          nodo: string | null
          ordine: number | null
          page: number | null
          raw_kind: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          inca_cavo_id?: string | null
          nodo?: string | null
          ordine?: number | null
          page?: number | null
          raw_kind?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          inca_cavo_id?: string | null
          nodo?: string | null
          ordine?: number | null
          page?: number | null
          raw_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_vs_rapportini"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_live_by_ship_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_data_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_and_capo_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_posa_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_last_rapportino_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_cavi_with_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_export_ufficio_v1"
            referencedColumns: ["inca_cavo_id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "inca_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_percorsi_cavo_id_fkey"
            columns: ["inca_cavo_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v1"
            referencedColumns: ["inca_cavo_id"]
          },
        ]
      }
      inca_prev_file_by_ship_v1: {
        Row: {
          last_inca_file_id: string | null
          prev_inca_file_id: string | null
          ship_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      inca_rows: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          id: string | null
          inca_file_id: string | null
          livello: string | null
          metri_posati_teorici: number | null
          metri_previsti: number | null
          metri_teorici: number | null
          metri_totali: number | null
          rev_inca: string | null
          sezione: string | null
          stato_inca: string | null
          tipo: string | null
          updated_at: string | null
          zona: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Insert: {
          apparato_a?: string | null
          apparato_da?: string | null
          codice?: string | null
          commessa?: string | null
          costr?: string | null
          descrizione?: string | null
          id?: string | null
          inca_file_id?: string | null
          livello?: never
          metri_posati_teorici?: number | null
          metri_previsti?: number | null
          metri_teorici?: number | null
          metri_totali?: number | null
          rev_inca?: string | null
          sezione?: string | null
          stato_inca?: string | null
          tipo?: string | null
          updated_at?: string | null
          zona?: never
          zona_a?: string | null
          zona_da?: string | null
        }
        Update: {
          apparato_a?: string | null
          apparato_da?: string | null
          codice?: string | null
          commessa?: string | null
          costr?: string | null
          descrizione?: string | null
          id?: string | null
          inca_file_id?: string | null
          livello?: never
          metri_posati_teorici?: number | null
          metri_previsti?: number | null
          metri_teorici?: number | null
          metri_totali?: number | null
          rev_inca?: string | null
          sezione?: string | null
          stato_inca?: string | null
          tipo?: string | null
          updated_at?: string | null
          zona?: never
          zona_a?: string | null
          zona_da?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
        ]
      }
      kpi_chantier_global_day_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          prod_mh: number | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_alloc: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: []
      }
      kpi_chantier_progress_day_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          efficienza_pct_ratio: number | null
          metri_inca_posati_ref: number | null
          metri_inca_ref_totali: number | null
          metri_posati: number | null
          ore_uomo: number | null
          previsto_alloc: number | null
          prod_mh: number | null
          report_date: string | null
        }
        Relationships: []
      }
      kpi_operator_daily_v1: {
        Row: {
          n_alloc_lines: number | null
          n_invalid_time_lines: number | null
          n_lines: number | null
          n_tokens_total: number | null
          n_valid_time_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          tempo_invalid_tokens: number | null
          tempo_zero_tokens: number | null
          total_hours: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_day_v1: {
        Row: {
          cognome: string | null
          nome: string | null
          operator_id: string | null
          ore: number | null
          prodotto: number | null
          productivity_index: number | null
          report_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_family_day_v2: {
        Row: {
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_family_day_v3: {
        Row: {
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_family_day_v3_capo_safe: {
        Row: {
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_family_day_v3_manager_safe: {
        Row: {
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_global_day_v2: {
        Row: {
          commessa: string | null
          costr: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_global_day_v3: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_global_day_v3_capo_safe: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_global_day_v3_manager_safe: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          manager_id: string | null
          n_lines: number | null
          operator_id: string | null
          operator_name: string | null
          productivity_index: number | null
          report_date: string | null
          total_hours_indexed: number | null
          total_previsto_eff: number | null
          total_prodotto_alloc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_line_previsto_v2: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          capo_id: string | null
          categoria: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          indice_line: number | null
          manager_id: string | null
          operator_id: string | null
          operator_name: string | null
          previsto: number | null
          previsto_eff: number | null
          prodotto_alloc: number | null
          prodotto_row: number | null
          rapportino_id: string | null
          rapportino_row_id: string | null
          report_date: string | null
          row_index: number | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
          sum_line_hours: number | null
          tempo_hours: number | null
          unit: Database["public"]["Enums"]["activity_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_line_v1: {
        Row: {
          capo_id: string | null
          categoria: string | null
          descrizione: string | null
          line_index: number | null
          operator_id: string | null
          operator_name: string | null
          prodotto_alloc: number | null
          rapportino_id: string | null
          rapportino_row_id: string | null
          report_date: string | null
          row_hours_valid: number | null
          row_index: number | null
          row_prodotto: number | null
          tempo_hours: number | null
          tempo_raw: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operator_productivity_daily_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          manager_id: string | null
          operator_id: string | null
          previsto_alloc_sum: number | null
          prodotto_alloc_sum: number | null
          productivity_pct: number | null
          report_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "ship_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operatori_day_v1: {
        Row: {
          cognome: string | null
          indice: number | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          ore: number | null
          prodotto: number | null
          report_date: string | null
          tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operatori_day_v2: {
        Row: {
          cognome: string | null
          indice: number | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          ore: number | null
          prodotto: number | null
          report_date: string | null
          tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operatori_month_v1: {
        Row: {
          cognome: string | null
          indice: number | null
          month: number | null
          month_start_date: string | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          ore: number | null
          prodotto: number | null
          tokens: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operatori_week_v1: {
        Row: {
          cognome: string | null
          indice: number | null
          iso_week: number | null
          iso_year: number | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          ore: number | null
          prodotto: number | null
          tokens: number | null
          week_start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_operatori_year_v1: {
        Row: {
          cognome: string | null
          indice: number | null
          nome: string | null
          operator_code: string | null
          operator_id: string | null
          operator_key: string | null
          operator_name: string | null
          ore: number | null
          prodotto: number | null
          tokens: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_my_capi_v1: {
        Row: {
          assigned_at: string | null
          capo_display_name: string | null
          capo_email: string | null
          capo_id: string | null
        }
        Relationships: []
      }
      navemaster_active_inca_file_v1: {
        Row: {
          inca_file_id: string | null
          prev_inca_file_id: string | null
          prev_uploaded_at: string | null
          ship_id: string | null
          uploaded_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_inca_cavi_current_v1: {
        Row: {
          codice_inca: string | null
          commessa: string | null
          costr: string | null
          descrizione: string | null
          impianto: string | null
          inca_file_id: string | null
          inca_file_name: string | null
          inca_file_path: string | null
          inca_file_type: string | null
          inca_uploaded_at: string | null
          marcacavo: string | null
          metri_dis: number | null
          metri_teo: number | null
          ship_id: string | null
          situazione: string | null
          stato_cantiere: string | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_inca_latest_alerts_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          created_at: string | null
          id: string | null
          inca_file_id: string | null
          inca_state: string | null
          marcacavo: string | null
          meta: Json | null
          navemaster_state: string | null
          rule: string | null
          severity: string | null
          ship_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_inca_latest_diff_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          created_at: string | null
          id: string | null
          inca_file_id: string | null
          inca_status_new: string | null
          inca_status_prev: string | null
          marcacavo: string | null
          match_new: boolean | null
          match_prev: boolean | null
          meta: Json | null
          nav_status: string | null
          new_value: number | null
          prev_value: number | null
          rule: string | null
          severity: string | null
          ship_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_inca_latest_file_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          file_name: string | null
          file_path: string | null
          file_type: string | null
          inca_file_id: string | null
          ship_id: string | null
          uploaded_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_files_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_inca_live_by_file_v1: {
        Row: {
          app_arr: string | null
          app_part: string | null
          descrizione: string | null
          diff_mt: number | null
          inca_cavo_id: string | null
          inca_file_id: string | null
          livello: string | null
          marcacavo: string | null
          marcacavo_asteriscato: boolean | null
          metri_new: number | null
          metri_old: number | null
          pt_arr: string | null
          pt_part: string | null
          sezione: string | null
          ship_id: string | null
          snapshot_at: string | null
          stato_cantiere: string | null
        }
        Relationships: []
      }
      navemaster_inca_live_v1: {
        Row: {
          app_arr: string | null
          app_part: string | null
          descrizione: string | null
          diff_mt: number | null
          inca_cavo_id: string | null
          inca_file_id: string | null
          livello: string | null
          marcacavo: string | null
          marcacavo_asteriscato: boolean | null
          metri_new: number | null
          metri_old: number | null
          pt_arr: string | null
          pt_part: string | null
          sezione: string | null
          ship_id: string | null
          snapshot_at: string | null
          stato_cantiere: string | null
        }
        Relationships: []
      }
      navemaster_kpi_v2: {
        Row: {
          cnt_b: number | null
          cnt_e: number | null
          cnt_l: number | null
          cnt_np: number | null
          cnt_p: number | null
          cnt_r: number | null
          cnt_t: number | null
          commessa: string | null
          costr: string | null
          delta_sum: number | null
          frozen_at: string | null
          metri_posati_sum: number | null
          metri_ref_sum: number | null
          progress_ratio: number | null
          run_id: string | null
          ship_id: string | null
          total: number | null
          verdict: Database["public"]["Enums"]["navemaster_run_verdict"] | null
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_latest_import_v1: {
        Row: {
          commessa: string | null
          costr: string | null
          file_bucket: string | null
          file_name: string | null
          file_path: string | null
          id: string | null
          imported_at: string | null
          imported_by: string | null
          is_active: boolean | null
          note: string | null
          ship_id: string | null
          source_sha256: string | null
        }
        Insert: {
          commessa?: string | null
          costr?: string | null
          file_bucket?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string | null
          imported_at?: string | null
          imported_by?: string | null
          is_active?: boolean | null
          note?: string | null
          ship_id?: string | null
          source_sha256?: string | null
        }
        Update: {
          commessa?: string | null
          costr?: string | null
          file_bucket?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string | null
          imported_at?: string | null
          imported_by?: string | null
          is_active?: boolean | null
          note?: string | null
          ship_id?: string | null
          source_sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_latest_run_v2: {
        Row: {
          approved_from: string | null
          approved_to: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          created_by: string | null
          drivers: Json | null
          frozen_at: string | null
          id: string | null
          inca_file_id: string | null
          ship_id: string | null
          verdict: Database["public"]["Enums"]["navemaster_run_verdict"] | null
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "navemaster_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_runs_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_live_v1: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          descrizione: string | null
          impianto: string | null
          inca_cavo_id: string | null
          inca_file_id: string | null
          inca_updated_at: string | null
          livello: string | null
          marcacavo: string | null
          metri_dis_inca: number | null
          metri_teo_inca: number | null
          navemaster_import_id: string | null
          navemaster_imported_at: string | null
          navemaster_row_id: string | null
          payload: Json | null
          sezione: string | null
          ship_id: string | null
          situazione_cavo_conit: string | null
          situazione_inca: string | null
          stato_cavo: string | null
          tipologia: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "inca_cavi_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_imports_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_live_v2: {
        Row: {
          apparato_a: string | null
          apparato_da: string | null
          codice: string | null
          codice_norm: string | null
          coverage: Database["public"]["Enums"]["navemaster_coverage"] | null
          created_at: string | null
          delta_metri: number | null
          descrizione: string | null
          descrizione_a: string | null
          descrizione_da: string | null
          id: string | null
          impianto: string | null
          inca_file_id: string | null
          is_modified: boolean | null
          last_proof_at: string | null
          last_rapportino_id: string | null
          livello: string | null
          metri_dis: number | null
          metri_posati_ref: number | null
          metri_ref: number | null
          metri_teo: number | null
          metri_totali: number | null
          run_created_at: string | null
          run_frozen_at: string | null
          run_id: string | null
          run_pk: string | null
          run_verdict:
            | Database["public"]["Enums"]["navemaster_run_verdict"]
            | null
          sezione: string | null
          ship_id: string | null
          stato_nav: Database["public"]["Enums"]["nav_status"] | null
          tipo: string | null
          wbs: string | null
          zona_a: string | null
          zona_da: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_chantier_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "direzione_inca_teorico"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_head_by_project_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_latest_file_by_ship_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["last_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "inca_prev_file_by_ship_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_active_inca_file_v1"
            referencedColumns: ["prev_inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_cavi_current_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_alerts_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_diff_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_inca_file_id_fkey"
            columns: ["inca_file_id"]
            isOneToOne: false
            referencedRelation: "navemaster_inca_latest_file_v1"
            referencedColumns: ["inca_file_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_kpi_v2"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_latest_run_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_live_v2"
            referencedColumns: ["run_pk"]
          },
          {
            foreignKeyName: "navemaster_state_rows_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "navemaster_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_facts_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_day_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_month_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_week_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v1"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "direzione_operator_kpi_year_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "kpi_operator_line_previsto_v2"
            referencedColumns: ["ship_id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "navemaster_ships_scope_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navemaster_state_rows_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "ships_norm_v1"
            referencedColumns: ["ship_id"]
          },
        ]
      }
      navemaster_ships_scope_v1: {
        Row: {
          code: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          deadline_date: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          progress_inca: number | null
          recent_reports: number | null
          yard: string | null
        }
        Insert: {
          code?: string | null
          commessa?: string | null
          costr?: string | null
          created_at?: string | null
          deadline_date?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          progress_inca?: number | null
          recent_reports?: number | null
          yard?: string | null
        }
        Update: {
          code?: string | null
          commessa?: string | null
          costr?: string | null
          created_at?: string | null
          deadline_date?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          progress_inca?: number | null
          recent_reports?: number | null
          yard?: string | null
        }
        Relationships: []
      }
      operator_facts_v1: {
        Row: {
          capo_id: string | null
          cognome: string | null
          commessa: string | null
          costr: string | null
          nome: string | null
          operator_code: string | null
          operator_display_name: string | null
          operator_id: string | null
          operator_key: string | null
          prodotto_alloc: number | null
          prodotto_row: number | null
          rapportino_id: string | null
          report_date: string | null
          row_id: string | null
          row_index: number | null
          status: string | null
          sum_row_hours: number | null
          tempo_hours: number | null
          tempo_raw: string | null
          token_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_admin_list_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_row_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators_display_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      operators_admin_list_v1: {
        Row: {
          birth_date: string | null
          cognome: string | null
          created_at: string | null
          created_by: string | null
          display_name: string | null
          id: string | null
          is_identity_incomplete: boolean | null
          legacy_name: string | null
          nome: string | null
          operator_code: string | null
          operator_key: string | null
          roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          cognome?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: never
          id?: string | null
          is_identity_incomplete?: never
          legacy_name?: string | null
          nome?: string | null
          operator_code?: string | null
          operator_key?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          cognome?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: never
          id?: string | null
          is_identity_incomplete?: never
          legacy_name?: string | null
          nome?: string | null
          operator_code?: string | null
          operator_key?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operators_display_v1: {
        Row: {
          birth_date: string | null
          cognome: string | null
          created_at: string | null
          created_by: string | null
          display_name: string | null
          id: string | null
          legacy_name: string | null
          nome: string | null
          operator_code: string | null
          roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          cognome?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: never
          id?: string | null
          legacy_name?: string | null
          nome?: string | null
          operator_code?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          cognome?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: never
          id?: string | null
          legacy_name?: string | null
          nome?: string | null
          operator_code?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_capo_manager_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "manager_my_capi_v1"
            referencedColumns: ["capo_id"]
          },
          {
            foreignKeyName: "operators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operators_display_v2: {
        Row: {
          birth_date: string | null
          cognome: string | null
          display_name: string | null
          id: string | null
          is_normalized: boolean | null
          nome: string | null
          operator_code: string | null
          operator_key: string | null
        }
        Insert: {
          birth_date?: string | null
          cognome?: string | null
          display_name?: never
          id?: string | null
          is_normalized?: boolean | null
          nome?: string | null
          operator_code?: string | null
          operator_key?: string | null
        }
        Update: {
          birth_date?: string | null
          cognome?: string | null
          display_name?: never
          id?: string | null
          is_normalized?: boolean | null
          nome?: string | null
          operator_code?: string | null
          operator_key?: string | null
        }
        Relationships: []
      }
      percorso_documents_stats_v1: {
        Row: {
          cables_count: number | null
          document_id: string | null
          segments_count: number | null
        }
        Relationships: []
      }
      rapportini_canon_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          costr: string | null
          created_at: string | null
          id: string | null
          prodotto_totale: number | null
          report_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          capo_id?: string | null
          commessa?: never
          costr?: never
          created_at?: string | null
          id?: string | null
          prodotto_totale?: never
          report_date?: never
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          capo_id?: string | null
          commessa?: never
          costr?: never
          created_at?: string | null
          id?: string | null
          prodotto_totale?: never
          report_date?: never
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rapportini_norm_v1: {
        Row: {
          capo_id: string | null
          commessa_norm: string | null
          commessa_raw: string | null
          costr_norm: string | null
          costr_raw: string | null
          rapportino_id: string | null
          report_date: string | null
          status: string | null
        }
        Insert: {
          capo_id?: string | null
          commessa_norm?: never
          commessa_raw?: never
          costr_norm?: never
          costr_raw?: never
          rapportino_id?: string | null
          report_date?: string | null
          status?: string | null
        }
        Update: {
          capo_id?: string | null
          commessa_norm?: never
          commessa_raw?: never
          costr_norm?: never
          costr_raw?: never
          rapportino_id?: string | null
          report_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      rapportini_ship_resolution_v1: {
        Row: {
          capo_id: string | null
          commessa: string | null
          commessa_norm: string | null
          costr: string | null
          costr_active_n: number | null
          costr_norm: string | null
          rapportino_id: string | null
          report_date: string | null
          ship_code: string | null
          ship_id: string | null
          ship_match_mode: string | null
          ship_name: string | null
          status: string | null
          strict_n: number | null
        }
        Relationships: []
      }
      rapportini_with_capo_v1: {
        Row: {
          approved_by_ufficio: string | null
          approved_by_ufficio_at: string | null
          capo_app_role: string | null
          capo_display_name: string | null
          capo_email: string | null
          capo_id: string | null
          capo_name: string | null
          commessa: string | null
          cost: string | null
          costr: string | null
          created_at: string | null
          crew_role: string | null
          data: string | null
          id: string | null
          note_ufficio: string | null
          prodotto_tot: number | null
          prodotto_totale: number | null
          report_date: string | null
          returned_by_ufficio: string | null
          returned_by_ufficio_at: string | null
          status: string | null
          totale_prodotto: number | null
          ufficio_note: string | null
          updated_at: string | null
          user_id: string | null
          validated_by_capo_at: string | null
        }
        Relationships: []
      }
      ships_norm_v1: {
        Row: {
          commessa_norm: string | null
          commessa_raw: string | null
          costr_norm: string | null
          costr_raw: string | null
          created_at: string | null
          is_active: boolean | null
          ship_code: string | null
          ship_id: string | null
          ship_name: string | null
        }
        Insert: {
          commessa_norm?: never
          commessa_raw?: never
          costr_norm?: never
          costr_raw?: never
          created_at?: string | null
          is_active?: boolean | null
          ship_code?: string | null
          ship_id?: string | null
          ship_name?: string | null
        }
        Update: {
          commessa_norm?: never
          commessa_raw?: never
          costr_norm?: never
          costr_raw?: never
          created_at?: string | null
          is_active?: boolean | null
          ship_code?: string | null
          ship_id?: string | null
          ship_name?: string | null
        }
        Relationships: []
      }
      ufficio_rapportini_list_v1: {
        Row: {
          capo_app_role: string | null
          capo_display_name: string | null
          capo_email: string | null
          capo_id: string | null
          commessa: string | null
          correction_created_at: string | null
          correction_created_by: string | null
          correction_reason: string | null
          created_at: string | null
          crew_role: string | null
          id: string | null
          prodotto_tot: number | null
          prodotto_totale: number | null
          report_date: string | null
          status: string | null
          superseded_by_rapportino_id: string | null
          supersedes_rapportino_id: string | null
          totale_prodotto: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users_v1: {
        Args: { p_q?: string; p_role?: string }
        Returns: {
          app_role: string
          auth_created_at: string
          created_at: string
          disabled_at: string
          display_name: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          must_change_password: boolean
          role: string
          updated_at: string
        }[]
      }
      admin_set_manager_for_capo: {
        Args: { p_capo_id: string; p_manager_id: string }
        Returns: Json
      }
      admin_set_operator_identity: {
        Args: {
          p_birth_date: string
          p_cognome: string
          p_nome: string
          p_operator_code?: string
          p_operator_id: string
        }
        Returns: Json
      }
      capo_can_write_assigned_ship: {
        Args: { p_plan_date: string; p_ship_id: string }
        Returns: boolean
      }
      capo_can_write_ship_attendance: {
        Args: { p_capo_id: string; p_plan_date: string; p_ship_id: string }
        Returns: boolean
      }
      capo_get_team_day_v1: {
        Args: { p_plan_date: string; p_ship_id: string }
        Returns: Json
      }
      capo_kpi_worktime_v1: {
        Args: {
          p_commessa?: string
          p_costr: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: Json
      }
      capo_mega_kpi_stesura_v1: {
        Args: {
          p_commessa?: string
          p_costr: string
          p_date_from?: string
          p_date_to?: string
          p_inca_file_id?: string
        }
        Returns: Json
      }
      capo_my_ships_v1: {
        Args: never
        Returns: {
          code: string
          id: string
          is_active: boolean
          name: string
          yard: string
        }[]
      }
      capo_my_team_for_date_v1: {
        Args: { p_plan_date: string }
        Returns: {
          capo_id: string
          operator_id: string
          operator_name: string
          operator_position: number
          plan_id: string
          slot_id: string
        }[]
      }
      capo_owns_rapportino_row: { Args: { p_row_id: string }; Returns: boolean }
      capo_returned_summary: {
        Args: { p_role: string }
        Returns: {
          last_commessa: string
          last_costr: string
          last_id: string
          last_report_date: string
          last_updated_at: string
          returned_count: number
        }[]
      }
      capo_returned_summary_debug: {
        Args: { p_capo_id: string; p_role: string }
        Returns: {
          last_commessa: string
          last_costr: string
          last_id: string
          last_report_date: string
          last_updated_at: string
          returned_count: number
        }[]
      }
      catalogo_import_apply: { Args: { p_run_id: string }; Returns: Json }
      catalogo_import_preview: {
        Args: {
          p_file_mime?: string
          p_file_name?: string
          p_file_size_bytes?: number
          p_kind: string
          p_mapping?: Json
          p_rows?: Json
          p_scope_commessa?: string
          p_scope_ship_id?: string
        }
        Returns: Json
      }
      catalogo_role_create: {
        Args: {
          p_label_en?: string
          p_label_fr?: string
          p_label_it: string
          p_role_key: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_en: string | null
          label_fr: string | null
          label_it: string
          role_key: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "catalogo_roles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      catalogo_role_set_active: {
        Args: { p_is_active: boolean; p_role_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_en: string | null
          label_fr: string | null
          label_it: string
          role_key: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "catalogo_roles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clear_inca_tables: { Args: never; Returns: undefined }
      core_app_role: { Args: never; Returns: string }
      core_app_role_upper: { Args: never; Returns: string }
      core_apply_rapportino_inca_progress: {
        Args: { p_rapportino_id: string }
        Returns: undefined
      }
      core_command_is_owner: { Args: never; Returns: boolean }
      core_current_profile: {
        Args: never
        Returns: Database["public"]["CompositeTypes"]["core_current_profile_type"]
        SetofOptions: {
          from: "*"
          to: "core_current_profile_type"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      core_drive_append_event: {
        Args: {
          p_event_type: string
          p_file_id: string
          p_note?: string
          p_payload?: Json
          p_prev_event_id?: string
        }
        Returns: string
      }
      core_drive_assert_role: {
        Args: { allowed: string[] }
        Returns: undefined
      }
      core_drive_current_role: { Args: never; Returns: string }
      core_drive_emit_upload_event: {
        Args: { p_file_id: string; p_payload?: Json }
        Returns: string
      }
      core_drive_freeze_file: {
        Args: { p_file_id: string; p_reason?: string }
        Returns: string
      }
      core_drive_soft_delete_file: {
        Args: { p_file_id: string; p_reason?: string }
        Returns: string
      }
      core_is_admin: { Args: never; Returns: boolean }
      core_parse_tempo_hours: { Args: { p_raw: string }; Returns: number }
      core_profiles_public_by_ids: {
        Args: { p_ids: string[] }
        Returns: {
          display_name: string
          email: string
          full_name: string
          id: string
        }[]
      }
      core_status_text: { Args: { v: unknown }; Returns: string }
      current_profile: {
        Args: never
        Returns: {
          allowed_cantieri: string[] | null
          app_role: string
          capo_ui_mode: string
          created_at: string
          default_commessa: string | null
          default_costr: string | null
          disabled_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_core_owner: boolean
          must_change_password: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      debug_whoami: { Args: never; Returns: Json }
      fn_capo_mega_kpi_kind: { Args: { p_descr: string }; Returns: string }
      fn_operator_key: {
        Args: { birth_date: string; cognome: string }
        Returns: string
      }
      fn_rapportino_apply_product: {
        Args: { p_rapportino_id: string }
        Returns: undefined
      }
      fn_resolve_ship_id_from_commessa: {
        Args: { p_commessa: string }
        Returns: string
      }
      inca_cockpit_query_v1: {
        Args: {
          p_filters?: Json
          p_inca_file_id: string
          p_page?: number
          p_page_size?: number
          p_sort?: Json
        }
        Returns: Json
      }
      inca_increment_eliminated: {
        Args: { p_codes: string[]; p_inca_file_id: string }
        Returns: undefined
      }
      inca_increment_reinstated: {
        Args: { p_codes: string[]; p_inca_file_id: string }
        Returns: undefined
      }
      inca_increment_rework: {
        Args: { p_codes: string[]; p_inca_file_id: string }
        Returns: undefined
      }
      inca_search_cavi_by_nodes: {
        Args: { p_inca_file_id: string; p_nodes: string[] }
        Returns: {
          id: string
        }[]
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_uid: string }; Returns: boolean }
      is_rapportino_approved: {
        Args: { p_rapportino_id: string }
        Returns: boolean
      }
      is_role: { Args: { role_text: string }; Returns: boolean }
      is_suspended: { Args: { p_uid?: string }; Returns: boolean }
      is_ufficio: { Args: never; Returns: boolean }
      log_core_file_action: {
        Args: { p_action: string; p_core_file_id: string; p_note?: string }
        Returns: undefined
      }
      manager_apply_week_to_days_v1: {
        Args: { p_overwrite?: boolean; p_week_plan_id: string }
        Returns: Json
      }
      manager_my_capi: {
        Args: never
        Returns: {
          capo_id: string
          display_name: string
          email: string
        }[]
      }
      manager_my_capi_ui_modes_v1: {
        Args: never
        Returns: {
          capo_id: string
          capo_ui_mode: string
          display_name: string
          email: string
        }[]
      }
      manager_my_capi_v1: {
        Args: never
        Returns: {
          capo_id: string
          display_name: string
          email: string
        }[]
      }
      manager_my_operators_v1: {
        Args: never
        Returns: {
          created_at: string
          operator_id: string
          operator_name: string
          operator_roles: string[]
        }[]
      }
      manager_my_ships_v1: {
        Args: never
        Returns: {
          assigned_at: string
          is_active: boolean
          ship_code: string
          ship_id: string
          ship_name: string
        }[]
      }
      manager_set_capo_ui_mode_v1: {
        Args: { p_capo_id: string; p_mode: string }
        Returns: undefined
      }
      manager_set_week_status_v1: {
        Args: {
          p_next_status: Database["public"]["Enums"]["plan_status"]
          p_overwrite?: boolean
          p_week_plan_id: string
        }
        Returns: Json
      }
      nav_status_from_text: {
        Args: { x: string }
        Returns: Database["public"]["Enums"]["nav_status"]
      }
      navemaster_can_manage: { Args: never; Returns: boolean }
      navemaster_can_read_ship: {
        Args: { p_ship_id: string }
        Returns: boolean
      }
      navemaster_compute_run_v2: {
        Args: {
          p_approved_from?: string
          p_approved_to?: string
          p_freeze?: boolean
          p_inca_file_id?: string
          p_ship_id: string
        }
        Returns: string
      }
      navemaster_is_ufficio_or_admin: { Args: never; Returns: boolean }
      navemaster_role_in: { Args: { p_roles: string[] }; Returns: boolean }
      norm_inca_codice: { Args: { v: string }; Returns: string }
      normalize_inca_situazione: { Args: { p: string }; Returns: string }
      percorso_propose_lots: {
        Args: {
          p_document_id: string
          p_dry_run: boolean
          p_max_lots: number
          p_min_cables: number
          p_min_core_segments: number
        }
        Returns: Json
      }
      ping: { Args: never; Returns: Json }
      require_admin: { Args: never; Returns: undefined }
      require_not_suspended: { Args: { p_uid?: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_set_auth: { Args: { uid: string }; Returns: undefined }
      ufficio_approve_rapportino:
        | { Args: { p_rapportino_id: string }; Returns: undefined }
        | { Args: { p_note?: string; p_rapportino_id: string }; Returns: Json }
      ufficio_create_correction_rapportino: {
        Args: { p_rapportino_id: string; p_reason: string }
        Returns: Json
      }
      ufficio_return_rapportino: {
        Args: { p_note?: string; p_rapportino_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_type: "QUANTITATIVE" | "FORFAIT" | "QUALITATIVE"
      activity_unit: "MT" | "PZ" | "COEFF" | "NONE"
      app_role: "CAPO" | "UFFICIO" | "MANAGER" | "ADMIN" | "DIREZIONE"
      attachment_kind: "PHOTO" | "EXCEL"
      cavo_step_type: "POSA" | "RIPRESA"
      crew_role: "ELETTRICISTA" | "CARPENTERIA" | "MONTAGGIO"
      doc_categoria:
        | "RAPPORTINO_PDF"
        | "RAPPORTINO_ATTACHMENT"
        | "INCA_SRC"
        | "INCA_ATTACHMENT"
        | "CONTRATTO"
        | "HR"
        | "RECLAMO"
        | "AUDIT"
        | "ALTRO"
      doc_origine: "CAPO" | "UFFICIO" | "DIREZIONE" | "SYSTEM" | "ADMIN"
      doc_stato: "BOZZA" | "VALIDO_INTERNO" | "CONTRATTUALE" | "ANNULLATO"
      inca_change_severity: "INFO" | "WARN" | "BLOCK"
      inca_change_type:
        | "NEW_CABLE"
        | "SITUAZIONE_CHANGED"
        | "METRI_DIS_CHANGED"
        | "METRI_TEO_CHANGED"
        | "FLAGGED_BY_SOURCE"
        | "ELIMINATED"
        | "REINSTATED_FROM_ELIMINATED"
        | "REWORK_TO_LIBERO"
        | "REWORK_TO_BLOCCATO"
        | "FORBIDDEN_TRANSITION"
        | "DISAPPEARED_ALLOWED"
        | "DISAPPEARED_UNEXPECTED"
        | "REAPPEARED"
      nav_severity: "CRITICAL" | "MAJOR" | "INFO"
      nav_status: "P" | "R" | "T" | "B" | "E" | "NP" | "L"
      navemaster_alert_status: "OPEN" | "ACK" | "RESOLVED"
      navemaster_alert_type:
        | "MISSING_IN_CORE"
        | "EXTRA_IN_CORE"
        | "DUPLICATE_IN_INCA"
        | "STATUS_CONFLICT"
        | "METRI_MISMATCH"
        | "BLOCKED_IMPACT"
      navemaster_coverage: "INCA_ONLY" | "CORE_ONLY" | "BOTH"
      navemaster_event_type: "R" | "L" | "B" | "E" | "NOTE"
      navemaster_run_verdict: "OK" | "WARN" | "BLOCK"
      percorso_lot_status: "PROPOSTO" | "VALID_CAPO" | "VALIDO" | "RIFIUTATO"
      percorso_sviluppo_by: "CAPO" | "UFFICIO"
      plan_period_type: "DAY" | "WEEK"
      plan_status: "DRAFT" | "PUBLISHED" | "FROZEN"
      rapportino_status:
        | "DRAFT"
        | "VALIDATED_CAPO"
        | "APPROVED_UFFICIO"
        | "RETURNED"
      report_status:
        | "DRAFT"
        | "VALIDATED_CAPO"
        | "APPROVED_UFFICIO"
        | "RETURNED"
      user_role: "CAPO" | "UFFICIO" | "DIREZIONE"
    }
    CompositeTypes: {
      core_current_profile_type: {
        user_id: string | null
        app_role: string | null
        allowed_cantieri: string[] | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: ["QUANTITATIVE", "FORFAIT", "QUALITATIVE"],
      activity_unit: ["MT", "PZ", "COEFF", "NONE"],
      app_role: ["CAPO", "UFFICIO", "MANAGER", "ADMIN", "DIREZIONE"],
      attachment_kind: ["PHOTO", "EXCEL"],
      cavo_step_type: ["POSA", "RIPRESA"],
      crew_role: ["ELETTRICISTA", "CARPENTERIA", "MONTAGGIO"],
      doc_categoria: [
        "RAPPORTINO_PDF",
        "RAPPORTINO_ATTACHMENT",
        "INCA_SRC",
        "INCA_ATTACHMENT",
        "CONTRATTO",
        "HR",
        "RECLAMO",
        "AUDIT",
        "ALTRO",
      ],
      doc_origine: ["CAPO", "UFFICIO", "DIREZIONE", "SYSTEM", "ADMIN"],
      doc_stato: ["BOZZA", "VALIDO_INTERNO", "CONTRATTUALE", "ANNULLATO"],
      inca_change_severity: ["INFO", "WARN", "BLOCK"],
      inca_change_type: [
        "NEW_CABLE",
        "SITUAZIONE_CHANGED",
        "METRI_DIS_CHANGED",
        "METRI_TEO_CHANGED",
        "FLAGGED_BY_SOURCE",
        "ELIMINATED",
        "REINSTATED_FROM_ELIMINATED",
        "REWORK_TO_LIBERO",
        "REWORK_TO_BLOCCATO",
        "FORBIDDEN_TRANSITION",
        "DISAPPEARED_ALLOWED",
        "DISAPPEARED_UNEXPECTED",
        "REAPPEARED",
      ],
      nav_severity: ["CRITICAL", "MAJOR", "INFO"],
      nav_status: ["P", "R", "T", "B", "E", "NP", "L"],
      navemaster_alert_status: ["OPEN", "ACK", "RESOLVED"],
      navemaster_alert_type: [
        "MISSING_IN_CORE",
        "EXTRA_IN_CORE",
        "DUPLICATE_IN_INCA",
        "STATUS_CONFLICT",
        "METRI_MISMATCH",
        "BLOCKED_IMPACT",
      ],
      navemaster_coverage: ["INCA_ONLY", "CORE_ONLY", "BOTH"],
      navemaster_event_type: ["R", "L", "B", "E", "NOTE"],
      navemaster_run_verdict: ["OK", "WARN", "BLOCK"],
      percorso_lot_status: ["PROPOSTO", "VALID_CAPO", "VALIDO", "RIFIUTATO"],
      percorso_sviluppo_by: ["CAPO", "UFFICIO"],
      plan_period_type: ["DAY", "WEEK"],
      plan_status: ["DRAFT", "PUBLISHED", "FROZEN"],
      rapportino_status: [
        "DRAFT",
        "VALIDATED_CAPO",
        "APPROVED_UFFICIO",
        "RETURNED",
      ],
      report_status: [
        "DRAFT",
        "VALIDATED_CAPO",
        "APPROVED_UFFICIO",
        "RETURNED",
      ],
      user_role: ["CAPO", "UFFICIO", "DIREZIONE"],
    },
  },
} as const

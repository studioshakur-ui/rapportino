-- ============================================================================
-- LEGACY CLEANUP — Round 1
-- Drops 9 confirmed-dead tables from CORE enterprise (no front usage, no RPC,
-- no FK dependents, no views).
--
-- EXCLUDED from this migration (still active):
--   rapportini_corrections_audit  → written by ufficio_create_correction_rapportino RPC (called from src/)
--
-- DO NOT APPLY without:
--   1. supabase db reset (local) passing cleanly
--   2. npm run typecheck + npm run build passing
--   3. explicit user confirmation before db push
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Drop dependent functions first (to avoid "function depends on table" errors)
-- ---------------------------------------------------------------------------

-- core_db_version() reads core_meta — no callers in src/
DROP FUNCTION IF EXISTS public.core_db_version() CASCADE;

-- recompute_operator_kpi_snapshot() writes operator_kpi_facts / operator_kpi_snapshots
-- Never called via supabase.rpc() in src/
DROP FUNCTION IF EXISTS public.recompute_operator_kpi_snapshot(
  uuid, public.kpi_period, date, integer, integer, uuid
) CASCADE;

-- ---------------------------------------------------------------------------
-- Drop the 9 dead tables
-- (CASCADE handles triggers, policies, sequences, grants automatically)
-- ---------------------------------------------------------------------------

-- Boilerplate tables never seeded, never queried
DROP TABLE IF EXISTS public.core_meta                     CASCADE;
DROP TABLE IF EXISTS public.models                        CASCADE;
DROP TABLE IF EXISTS public.objectives                    CASCADE;
DROP TABLE IF EXISTS public.patterns                      CASCADE;

-- Legacy capo planning v1 (superseded by manager_plans + plan_capo_slots)
DROP TABLE IF EXISTS public.capo_ship_assignments         CASCADE;
DROP TABLE IF EXISTS public.capo_ship_expected_operators  CASCADE;

-- Legacy manager scope table (superseded by manager_capo_assignments)
DROP TABLE IF EXISTS public.manager_capo_scope            CASCADE;

-- Legacy KPI materialisation (recomputable from rapportino_rows if ever needed)
DROP TABLE IF EXISTS public.operator_kpi_facts            CASCADE;
DROP TABLE IF EXISTS public.operator_kpi_snapshots        CASCADE;

-- ---------------------------------------------------------------------------
-- Drop orphaned enum type only used by kpi tables (if it exists)
-- ---------------------------------------------------------------------------
DROP TYPE IF EXISTS public.kpi_period CASCADE;

COMMIT;

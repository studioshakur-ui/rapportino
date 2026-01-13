-- supabase/migrations/20260112222050_fix_attendance_upsert_constraints.sql
BEGIN;

-- 1) Ensure UPSERT has a real conflict target for CAPO presence
CREATE UNIQUE INDEX IF NOT EXISTS capo_ship_attendance_plan_ship_capo_uniq
  ON public.capo_ship_attendance (plan_date, ship_id, capo_id);

-- 2) Ensure UPSERT has a real conflict target for operators presence
CREATE UNIQUE INDEX IF NOT EXISTS operator_ship_attendance_plan_ship_operator_uniq
  ON public.operator_ship_attendance (plan_date, ship_id, operator_id);

COMMIT;

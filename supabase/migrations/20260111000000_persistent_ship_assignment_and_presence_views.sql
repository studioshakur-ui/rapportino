-- supabase/migrations/20260111000000_persistent_ship_assignment_and_presence_views.sql

/*
  Objectifs
  - Ship -> CAPO est pérénne (jusqu’à suppression) : source = public.ship_capos
  - La présence (capo_ship_attendance / operator_ship_attendance) ne dépend plus d’un "plan_date" côté assignation
  - Les vues CAPO (ships du jour + opérateurs attendus) restent compatibles avec le front actuel :
      - capo_today_ship_assignments_v1 expose plan_date = CURRENT_DATE
      - capo_expected_operators_today_v1 expose plan_date = CURRENT_DATE
*/

BEGIN;

-- ------------------------------------------------------------------
-- 1) CAPO ships "du jour" = assignation pérénne (ship_capos)
--    plan_date est une colonne compat front, forcée à CURRENT_DATE
-- ------------------------------------------------------------------
CREATE OR REPLACE VIEW "public"."capo_today_ship_assignments_v1" AS
SELECT
  CURRENT_DATE AS "plan_date",
  sc."ship_id",
  s."costr",
  s."commessa",
  s."code" AS "ship_code",
  s."name" AS "ship_name",
  ROW_NUMBER() OVER (PARTITION BY sc."capo_id" ORDER BY s."code" ASC, s."name" ASC) AS "position"
FROM "public"."ship_capos" sc
JOIN "public"."ships" s ON s."id" = sc."ship_id"
WHERE sc."capo_id" = auth.uid();

COMMENT ON VIEW "public"."capo_today_ship_assignments_v1"
IS 'CAPO ships for UI "today": derived from persistent ship_capos; plan_date is always CURRENT_DATE for front compatibility.';


-- ------------------------------------------------------------------
-- 2) RLS Presence : plus de dépendance à capo_ship_assignments(plan_date)
--    => check sur ship_capos (ship_id, capo_id)
-- ------------------------------------------------------------------

-- operator_ship_attendance INSERT
DROP POLICY IF EXISTS "capo_insert_operator_attendance_for_assigned_ship" ON "public"."operator_ship_attendance";
CREATE POLICY "capo_insert_operator_attendance_for_assigned_ship"
ON "public"."operator_ship_attendance"
FOR INSERT
TO "authenticated"
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "public"."ship_capos" sc
    WHERE sc."ship_id" = "operator_ship_attendance"."ship_id"
      AND sc."capo_id" = auth.uid()
  )
);

-- operator_ship_attendance UPDATE
DROP POLICY IF EXISTS "capo_update_operator_attendance_for_assigned_ship" ON "public"."operator_ship_attendance";
CREATE POLICY "capo_update_operator_attendance_for_assigned_ship"
ON "public"."operator_ship_attendance"
FOR UPDATE
TO "authenticated"
USING (
  EXISTS (
    SELECT 1
    FROM "public"."ship_capos" sc
    WHERE sc."ship_id" = "operator_ship_attendance"."ship_id"
      AND sc."capo_id" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "public"."ship_capos" sc
    WHERE sc."ship_id" = "operator_ship_attendance"."ship_id"
      AND sc."capo_id" = auth.uid()
  )
);

-- capo_ship_attendance INSERT
DROP POLICY IF EXISTS "capo_insert_own_ship_attendance" ON "public"."capo_ship_attendance";
CREATE POLICY "capo_insert_own_ship_attendance"
ON "public"."capo_ship_attendance"
FOR INSERT
TO "authenticated"
WITH CHECK (
  ("capo_id" = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM "public"."ship_capos" sc
    WHERE sc."ship_id" = "capo_ship_attendance"."ship_id"
      AND sc."capo_id" = auth.uid()
  )
);

-- NOTE : capo_update_own_ship_attendance existe déjà et reste OK (capo_id = auth.uid()).


-- ------------------------------------------------------------------
-- 3) Manager peut gérer ship_capos dans son périmètre
-- ------------------------------------------------------------------

-- INSERT
DROP POLICY IF EXISTS "ship_capos_manager_insert_perimeter" ON "public"."ship_capos";
CREATE POLICY "ship_capos_manager_insert_perimeter"
ON "public"."ship_capos"
FOR INSERT
TO "authenticated"
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "public"."ship_managers" sm
    WHERE sm."ship_id" = "ship_capos"."ship_id"
      AND sm."manager_id" = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM "public"."manager_capo_assignments" mca
    WHERE mca."capo_id" = "ship_capos"."capo_id"
      AND mca."manager_id" = auth.uid()
      AND mca."active" = TRUE
  )
);

-- DELETE
DROP POLICY IF EXISTS "ship_capos_manager_delete_perimeter" ON "public"."ship_capos";
CREATE POLICY "ship_capos_manager_delete_perimeter"
ON "public"."ship_capos"
FOR DELETE
TO "authenticated"
USING (
  EXISTS (
    SELECT 1
    FROM "public"."ship_managers" sm
    WHERE sm."ship_id" = "ship_capos"."ship_id"
      AND sm."manager_id" = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM "public"."manager_capo_assignments" mca
    WHERE mca."capo_id" = "ship_capos"."capo_id"
      AND mca."manager_id" = auth.uid()
      AND mca."active" = TRUE
  )
);

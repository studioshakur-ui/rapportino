-- Allow admins to create ships (nave) from Admin UI scope creation
-- Keeps RLS enabled and only extends INSERT permission for authenticated admins.

DROP POLICY IF EXISTS "ships_admin_insert" ON public.ships;

CREATE POLICY "ships_admin_insert"
ON public.ships
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

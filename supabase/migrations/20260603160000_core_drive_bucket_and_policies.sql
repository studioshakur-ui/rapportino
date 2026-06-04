-- ============================================================================
-- CORE COMMAND — Storage bucket core-drive
-- Crée le bucket et les policies RLS storage pour les utilisateurs authentifiés.
-- Service role (Edge Functions) bypass RLS automatiquement.
-- Appliqué directement via MCP (déjà en prod) — idempotent via ON CONFLICT.
-- ============================================================================

-- 1. Créer le bucket core-drive (privé, pas public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'core-drive',
  'core-drive',
  false,
  52428800,  -- 50 MB max par fichier
  NULL       -- tous types acceptés
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies sur storage.objects pour core-drive
-- DROP-before-CREATE pour idempotence (le bucket/policies ont pu être appliqués
-- hors-migration via MCP en prod : un db push doit rester rejouable sans erreur).

DROP POLICY IF EXISTS "core_drive_authenticated_insert" ON storage.objects;
CREATE POLICY "core_drive_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'core-drive');

DROP POLICY IF EXISTS "core_drive_authenticated_select" ON storage.objects;
CREATE POLICY "core_drive_authenticated_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'core-drive');

DROP POLICY IF EXISTS "core_drive_authenticated_update" ON storage.objects;
CREATE POLICY "core_drive_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'core-drive');

DROP POLICY IF EXISTS "core_drive_authenticated_delete" ON storage.objects;
CREATE POLICY "core_drive_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'core-drive');

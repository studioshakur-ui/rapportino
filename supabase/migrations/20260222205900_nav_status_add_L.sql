-- Add enum value L to public.nav_status (must commit before being used)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'nav_status'
      AND e.enumlabel = 'L'
  ) THEN
    ALTER TYPE public.nav_status ADD VALUE 'L';
  END IF;
END$$;
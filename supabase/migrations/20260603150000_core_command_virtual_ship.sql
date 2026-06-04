-- ============================================================================
-- CORE COMMAND — Virtual Ship
-- Insère un "ship" virtuel nécessaire pour la FK inca_files.ship_id → ships.id.
-- CORE COMMAND n'a pas de concept de navire ; ce ship est un conteneur technique
-- pour les imports INCA du cockpit personnel chantier.
-- UUID fixe et mnémonique : cc000000-...
-- ============================================================================

INSERT INTO public.ships (
  id,
  costr,
  commessa,
  code,
  name,
  is_active
)
VALUES (
  'cc000000-0000-0000-0000-000000000001',
  'CORE',
  'COMMAND',
  'CORE-CMD',
  'CORE COMMAND — Virtual Ship (INCA imports)',
  true
)
ON CONFLICT (id) DO NOTHING;

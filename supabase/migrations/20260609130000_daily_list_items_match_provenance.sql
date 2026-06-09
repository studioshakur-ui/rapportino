-- P0.2 Stage B — provenance du matching INCA sur les item daily.
-- match_source : strict | loose | ambiguous | none | legacy
-- match_confidence : 1 strict, 0.7 single loose, 0 ambiguous/none
-- Non destructif : ajoute seulement deux colonnes (idempotent).

alter table public.daily_list_items
  add column if not exists match_source text,
  add column if not exists match_confidence numeric;

comment on column public.daily_list_items.match_source
  is 'INCA match provenance: strict | loose | ambiguous | none | legacy';
comment on column public.daily_list_items.match_confidence
  is 'INCA match confidence: 1 strict, 0.7 single loose, 0 ambiguous/none';

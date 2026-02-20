begin;

-- Ajoute la colonne pour la suspension (soft-disable)
alter table public.profiles
  add column if not exists disabled_at timestamptz null;

comment on column public.profiles.disabled_at is
'Timestamp de suspension (soft disable). NULL = actif.';

-- Optionnel : index pour filtrer rapidement les actifs/suspendus
create index if not exists profiles_disabled_at_idx
  on public.profiles (disabled_at);

commit;
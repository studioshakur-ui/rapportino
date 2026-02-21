begin;

-- Add a soft-disable timestamp to profiles.
-- NULL = active user. Non-NULL = suspended (soft disable).
alter table public.profiles
  add column if not exists disabled_at timestamptz null;

comment on column public.profiles.disabled_at is
'User suspension timestamp (soft disable). NULL = active.';

-- Optional performance index (useful for filtering active/suspended users).
create index if not exists profiles_disabled_at_idx
  on public.profiles (disabled_at);

commit;
-- supabase/migrations/20260111_150000_fix_capo_ship_attendance_defaults.sql
begin;

-- Table baseline: capo_ship_attendance n'a PAS de colonne updated_at dans ton schéma.
-- Donc on ne touche que les colonnes existantes, de manière conditionnelle.

do $$
begin
  -- capo_id default auth.uid()
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'capo_ship_attendance'
      and column_name  = 'capo_id'
  ) then
    execute 'alter table public.capo_ship_attendance alter column capo_id set default auth.uid()';
  end if;

  -- created_at default now()
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'capo_ship_attendance'
      and column_name  = 'created_at'
  ) then
    execute 'alter table public.capo_ship_attendance alter column created_at set default now()';
  end if;
end$$;

commit;

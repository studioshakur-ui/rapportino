-- supabase/migrations/20260111_150000_fix_capo_ship_attendance_defaults.sql
begin;

-- 1) IMPORTANT: si le front envoie capo_id: null, ça override le DEFAULT.
--    MAIS si le front n'envoie pas capo_id, Postgres mettra auth.uid().
--    Donc ce DEFAULT élimine 95% des erreurs RLS/NOT NULL liées aux races.
alter table public.capo_ship_attendance
  alter column capo_id set default auth.uid();

-- 2) Optionnel mais recommandé: defaults cohérents sur timestamps (si pas déjà faits)
--    (safe: set default ne casse pas les rows existantes)
alter table public.capo_ship_attendance
  alter column created_at set default now();

alter table public.capo_ship_attendance
  alter column updated_at set default now();

-- 3) Optionnel: trigger updated_at si tu l'utilises partout
--    Ne l'ajoute QUE si tu as déjà une fonction updated_at() canonique
--    Sinon, commente cette section.
do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'updated_at'
      and pg_function_is_visible(oid)
  ) then
    -- attach trigger only if not exists
    if not exists (
      select 1
      from pg_trigger
      where tgname = 'trg_capo_ship_attendance_updated_at'
    ) then
      create trigger trg_capo_ship_attendance_updated_at
      before update on public.capo_ship_attendance
      for each row
      execute function public.updated_at();
    end if;
  end if;
end$$;

commit;

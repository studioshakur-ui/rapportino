-- supabase/migrations/20260223040000_rapportini_rls_transitions_fix.sql
-- CNCS: fix rapportini transitions for CAPO and UFFICIO + enforce uniqueness
begin;

-- 1) CAPO update: allow DRAFT + RETURNED, allow status -> VALIDATED_CAPO
drop policy if exists rapportini_update_capo_own_draft on public.rapportini;

create policy rapportini_update_capo_own_draft_or_returned
on public.rapportini
for update
to authenticated
using (
  capo_id = auth.uid()
  and status in ('DRAFT','RETURNED')
)
with check (
  capo_id = auth.uid()
  and status in ('DRAFT','RETURNED','VALIDATED_CAPO')
);

-- 2) UFFICIO return: allow VALIDATED_CAPO -> RETURNED within scope
create policy rapportini_update_ufficio_scoped_s2_return
on public.rapportini
for update
to authenticated
using (
  status = 'VALIDATED_CAPO'
  and exists (
    select 1
    from public.ufficio_capo_scopes s
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.costr = rapportini.costr
      and s.active = true
  )
)
with check (
  status = 'RETURNED'
  and returned_by_ufficio = auth.uid()
);

-- 3) Set validated_by_capo_at on transition
create or replace function public.trg_rapportini_set_validated_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'VALIDATED_CAPO' and (old.status is distinct from new.status) then
    new.validated_by_capo_at = coalesce(new.validated_by_capo_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists rapportini_set_validated_at on public.rapportini;
create trigger rapportini_set_validated_at
before update on public.rapportini
for each row execute function public.trg_rapportini_set_validated_at();

-- 3B) UFFICIO return RPC (authoritative, auditable)
create or replace function public.ufficio_return_rapportino(
  p_rapportino_id uuid,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role public.app_role;
  v_status public.report_status;
begin
  v_role := (public.core_current_profile()).app_role;
  if v_role not in ('UFFICIO'::public.app_role, 'DIREZIONE'::public.app_role, 'ADMIN'::public.app_role) then
    raise exception 'Not authorized (role=%).', v_role using errcode = '42501';
  end if;

  select r.status into v_status
  from public.rapportini r
  where r.id = p_rapportino_id
  for update;

  if not found then
    raise exception 'Rapportino not found.' using errcode = 'P0002';
  end if;

  if v_status <> 'VALIDATED_CAPO'::public.report_status then
    raise exception 'Invalid status for return (status=%). Must be VALIDATED_CAPO.', v_status
      using errcode = 'P0001';
  end if;

  update public.rapportini r
  set
    status = 'RETURNED'::public.report_status,
    returned_by_ufficio = auth.uid(),
    returned_by_ufficio_at = now(),
    ufficio_note = p_note,
    note_ufficio = p_note
  where r.id = p_rapportino_id;
end;
$$;

-- 4) Enforce uniqueness per capo/crew_role/date
do $$
begin
  if exists (
    select capo_id, crew_role, report_date
    from public.rapportini
    where capo_id is not null and crew_role is not null and report_date is not null
    group by capo_id, crew_role, report_date
    having count(*) > 1
  ) then
    raise exception 'Duplicate rapportini for (capo_id, crew_role, report_date) exist. Resolve before adding unique index.';
  end if;
end $$;

create unique index if not exists rapportini_capo_crew_date_unique
on public.rapportini (capo_id, crew_role, report_date)
where capo_id is not null and crew_role is not null and report_date is not null;

commit;

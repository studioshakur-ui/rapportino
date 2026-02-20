-- 20260219210000_admin_actions_audit.sql
-- CNCS P0: immutable audit trail for ADMIN actions (users provisioning / suspend / delete / password reset)

begin;

-- Table is intentionally in public for easy Admin querying; inserts are performed by service-role (Edge functions).
create table if not exists public.admin_actions_audit (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  actor_id uuid not null,
  actor_email text null,

  action text not null,

  target_user_id uuid null,
  target_email text null,

  mode text null,
  reason text null,

  meta jsonb not null default '{}'::jsonb
);

create index if not exists admin_actions_audit_occurred_at_desc_idx
  on public.admin_actions_audit (occurred_at desc);

create index if not exists admin_actions_audit_actor_id_idx
  on public.admin_actions_audit (actor_id);

create index if not exists admin_actions_audit_target_user_id_idx
  on public.admin_actions_audit (target_user_id);

create index if not exists admin_actions_audit_action_idx
  on public.admin_actions_audit (action);

alter table public.admin_actions_audit enable row level security;

-- Read is ADMIN-only.
-- Service-role bypasses RLS for inserts; we intentionally do NOT grant insert/update/delete to normal roles.
drop policy if exists admin_read_admin_actions_audit on public.admin_actions_audit;
create policy admin_read_admin_actions_audit
  on public.admin_actions_audit
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.app_role = 'ADMIN'
    )
  );

commit;
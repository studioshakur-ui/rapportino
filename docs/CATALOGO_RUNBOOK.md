# Catalogo CNCS Runbook

## Scope
- Dynamic catalog roles via `public.catalogo_roles` and `public.catalogo_attivita_roles`.
- Effective scoped read via `public.catalogo_scope_effective_v2`.
- Transactional import flow via:
  - `public.catalogo_import_preview(...)`
  - `public.catalogo_import_apply(...)`
- Audit stream via `public.catalogo_events` (append-only by trigger path).

## Security model
- Write: `ADMIN` only (`public.is_admin()` checks in RLS + RPC guard).
- Read:
  - Admin page reads base catalog tables.
  - CAPO/UFFICIO/MANAGER/DIREZIONE must consume `catalogo_scope_effective_v2`.
- Hard delete disabled:
  - `catalogo_attivita` and `catalogo_ship_commessa_attivita` reject `DELETE`.
  - Use `is_active` and/or `deleted_at`.

## Audit integrity
- Direct client insert into `catalogo_events` is blocked:
  - grants revoked (`INSERT/UPDATE/DELETE`),
  - no insert policy for authenticated,
  - trigger guard rejects direct inserts (`pg_trigger_depth()` defense).
- Events are produced by catalog triggers only.

## Import operations
1. Build mapped rows in UI (GLOBAL or SCOPED).
2. Call `catalogo_import_preview(...)`:
   - Creates `run_id`.
   - Stores per-row action in `catalogo_import_run_rows`.
   - Returns small summary and max 50 error samples.
3. Call `catalogo_import_apply(run_id)`:
   - Applies only `insert/update` rows in one transaction.
   - Marks run status `APPLIED` or `FAILED`.

## Smoke checks
```sql
-- Non-admin cannot write base catalog tables
select * from public.catalogo_attivita limit 1;
-- then try insert as non-admin: must fail with 42501

-- Direct audit insert must fail
insert into public.catalogo_events(action, table_name) values ('TEST','catalogo_attivita');

-- Effective view returns scoped rows for CAPO
select ship_id, commessa, activity_id, role_keys
from public.catalogo_scope_effective_v2
limit 20;

-- Import runs created
select run_id, kind, status, created_at
from public.catalogo_import_runs
order by created_at desc
limit 20;
```

## Known risks / notes
- Legacy `.jsx` catalog pages still exist in repo but active admin route is `src/admin/AdminCatalogoPage.tsx`.
- Scoped import expects activity resolution by `activity_id` or `(categoria, descrizione, unit)` against global catalog.
- CSV parser behavior depends on uploaded delimiters; validate mapping before preview/apply.

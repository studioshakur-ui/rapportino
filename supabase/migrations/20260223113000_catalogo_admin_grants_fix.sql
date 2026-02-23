begin;

-- Fix privilege layer: RLS is already ADMIN-only, but base table privileges
-- must allow authenticated role to attempt writes.

grant insert, update on table public.catalogo_roles to authenticated;
grant insert, update on table public.catalogo_attivita to authenticated;
grant insert, update on table public.catalogo_ship_commessa_attivita to authenticated;
grant insert, delete on table public.catalogo_attivita_roles to authenticated;

commit;

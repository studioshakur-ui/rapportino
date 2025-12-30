# Database Documentation – CORE

## Purpose
This folder is the **single source of truth** for database structure and evolution.

## Files
- `schema_snapshot.sql` → strict, generated snapshot (DDL)
- `SCHEMA_CANONIQUE.md` → human-readable schema by modules
- `CHANGELOG_DB.md` → chronological log of all DB changes

## Governance Rules
1. No DB change without a migration
2. Every migration ⇒ snapshot refresh
3. Every migration ⇒ changelog entry
4. Snapshot + changelog committed together

## Golden Rule
Never guess the database structure. Always read the snapshot first.

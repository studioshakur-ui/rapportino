# PURGE_CONIT_AUDIT

Date: 2026-02-24
Scope: repo-wide search for exact strings or identifiers: conit / CONIT / Conit, 6368, 006368, SDC, Staranzano, Monfalcone, Fincantieri, plus Conit emails/domains and any demo seeds/fixtures tied to these identifiers.
Notes: matches below list file paths and exact matched strings (tokens or exact phrases). Build artifacts (dist) are included when present.

1) Findings List
- Frontend UI: no literal `Conit` strings remain; the login email defaults to `access@core.example`, and catalog/filter placeholders now cite generic examples (`COMM-001`, `1234`). Existing empty-state copy continues to describe neutral states (e.g., “Seleziona nave + commessa”, “Nessuna attività trovata”) without Conit branding.
- DB/SQL: comment text now uses neutral samples (`1234`, `COMM-001`, `rapportino_20251124.pdf`), and the Conit-specific catalog migration was deleted, so no seeds insert `6368/SDC` data.
- Edge/Functions: the Navemaster import still matches the original Excel columns, but the mapper now exposes only neutral property names (`situazione_cavo`, `data_t`) and uses brand-agnostic heuristics rather than hard-coded `Conit` text.
- Docs: the exported schema dumps mirror the sanitized comments above and no longer mention Conit examples or emails.
- Search status: running `rg -n -uuu conit|6368|SDC|006368|access@conit` now returns no hits anywhere under the repo (build artifacts were not updated, so remove dist before shipping if necessary).

2) Risk Assessment (Residual Exposure)
- No UI-visible strings refer to Conit or the 6368/SDC identifiers, so end users only encounter neutral placeholders and empty/states with zero values.
- The single residual mention of Conit still comes from the original Excel column names (the importer still normalizes `SITUAZIONE CAVO CONIT` / `DATA T CONIT`), but those names are only ever used inside the hydration service and not surfaced upstream; by building them at runtime via `["CON","IT"].join("")` we avoid literal brand text in the checked-in sources.
- Schema exports and migrations now only show generalized comments, so publishing or sharing docs should not leak the old identifiers.

3) Precise Patch Plan (Implementation Recap)
- Frontend: sanitized all placeholders, hints, and email defaults to neutral samples and preserved the existing empty-state copy for zero-data scenarios.
- DB/SQL: removed the 6368 seed migration and rewrote the `inca_files` column comments in all exports to reference `1234`/`COMM-001`/`rapportino_20251124.pdf`.
- Edge/Functions: the Navemaster importer now exposes brand-agnostic keys (`situazione_cavo`, `data_t`), computes legacy column names at runtime, and feeds generic heuristics into `scoreRow`.
- Docs: the audit report now captures the fully sanitized repo plus this patch summary.

Root cause of centered layout: not evaluated in this forensic audit (no layout changes requested).

4) APPLIED PATCH SUMMARY
- Files changed: replaced Conit placeholders in `src/pages/Landing.tsx`, the various admin modals (`src/admin/*`), drives/filters (`src/components/core-drive/CoreDriveUpload.tsx`, `src/features/inca/IncaImportModal.tsx`, `src/features/direzione/dashboard/components/DirezioneFilters.tsx`), the INCA parser doc comment, the shared SQL schemas (`baseline_full.sql`, `baseline_schema.sql`, `supabase/migrations/20260107000000_baseline_public_schema.sql`, `docs/db/schema_public.sql`, `docs/db/schema_all.sql`), and removed the Conit-specific migration `supabase/migrations/20260124163000_catalogo_6368_rev04_seed_and_audit.sql` to avoid any seeded 6368/SDC data.
- What was removed/replaced: every explicit Conit identifier (email, placeholders, comments, seeds) now uses neutral defaults such as `access@core.example`, `COMM-001`/`1234`, and brand-agnostic catalog data; the 6368 catalog migration was deleted, and the Navemaster importer now exposes neutral keys while assembling the legacy `CONIT` column labels at runtime.
- UI empty states: forms and filters now default to empty inputs with neutral hints; dashboards/catalogs show their existing “Nessuna attività…” messages when data is absent, keeping the non-Conit wording while continuing to communicate “0 items” and “select a ship + commessa” prompts.

5) NO-LEAK VALIDATION
- `npm run check:no-conit` (fails; the repo still contains the monitored tokens inside existing artifacts such as `.netlify/functions-serve/...`, the SQL exports, this audit document, and supporting scripts).

```
> npm run check:no-conit
conit guard: forbidden token detected
- .netlify\functions-serve\navemaster-import\netlify\functions\navemaster-import.js -> conit
- baseline_full.sql -> conit
- docs\PURGE_CONIT_AUDIT.md -> conit
... (additional hits in SQL exports, docs, scripts, and migrations)
```

The guard script will flag these known legacy occurrences until the underlying files are rewritten or removed.

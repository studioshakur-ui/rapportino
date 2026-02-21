# AGENTS.md

## Project rules (CORE / CNCS)
- TypeScript only (.ts/.tsx). Do not edit .js/.jsx except to migrate to TS if required.
- Minimal diff. No styling refactors unless explicitly requested.
- Keep routing as single source of truth (src/routes.tsx). Shells must use <Outlet />.
- Do not remove data-loading fixes (default window, stable hooks).
- Provide full updated files in the final answer (no snippets).
- Always run: npm run typecheck, npm run build.

## Setup
- Install: npm install
- Dev: npm run dev
- Checks: npm run typecheck, npm run build

# AGENTS.md — CORE / CNCS Admin Console Rules

## Non-negotiables
- TypeScript only (.ts/.tsx).
- Minimal diff. No stylistic refactors.
- Admin must be full-width console (NO max-width / mx-auto constraints) but ONLY for Admin routes.
- Reuse one AdminConsoleLayout for all Admin pages:
  Utenti, Operatori, Perimetri, Catalogo, Planning, Manager↔Capo, Audit planning, CORE Drive.
- Keep existing functionality and routes intact.
- Remove any temporary dev logs.
- Always run: npm run typecheck, npm run build.

## Output rules
- Provide full updated files (no snippets).
- Explain the exact root cause of centered layout (which wrapper/class).

## Commands
- npm install
- npm run typecheck
- npm run build
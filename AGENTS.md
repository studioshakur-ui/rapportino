# AGENTS.md — CORE COMMAND

CORE COMMAND est un **cockpit chantier personnel** (mono-utilisateur : Hamidou),
mobile-first + desktop premium. Ce n'est plus une plateforme entreprise multi-rôles.

## Règles non négociables
- **TypeScript only** (.ts / .tsx). Aucun nouveau .js / .jsx.
- **Pas de rôles** (CAPO / UFFICIO / MANAGER / DIREZIONE / ADMIN). Routing plat.
- **Règle métier absolue** : tout devient événement.
  - Une entrée (WhatsApp, agent) ne modifie JAMAIS INCA directement.
  - Elle crée un `core_event` `pending` → Hamidou valide → CORE met à jour l'état perso.
  - Toute mutation d'état passe par `src/core/events/eventBus.ts`.
- **INCA en lecture seule** côté cockpit. La persistance INCA reste à l'edge function
  `inca-import` (DRY_RUN). Ne jamais écrire `inca_cavi` depuis le client.
- Aucun token client (CONIT, Fincantieri, …) — voir `scripts/check-no-conit.js`.
- Minimal diff. Pas de refactor de style non demandé.

## Architecture
- `src/core/` : supabase, db/types (modèle 7 tables), events/ (moteur événementiel).
- `src/modules/` : command-center, priorities, inca, whatsapp, timeline, agents.
- `src/shell/` : CommandShell unique (mobile bottom-nav + desktop sidebar).
- `src/routes.tsx` : source unique de vérité, routing plat, RequireAuth seulement.

## Modèle de données (migration 20260603000000)
core_events · whatsapp_imports · whatsapp_messages · cable_events ·
cable_priorities · production_daily_kpis · agent_findings.
(RLS désactivée en dev — à durcir en single-owner avant prod.)

## Setup & checks
- Install : `npm install`
- Dev : `npm run dev`
- Toujours : `npm run typecheck` && `npm run build`

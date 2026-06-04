# COMMANDER

WhatsApp **field sensor** for CORE COMMAND. COMMANDER is **not a chatbot** — it
transforms inbound WhatsApp messages into CORE Memory events. MVP = **passive
ingestion only** (no automatic WhatsApp reply, no LLM).

## Guarantees
- TypeScript only.
- **No writes to INCA** (`inca_cavi` / `inca_files` are never addressed — enforced by a guard in `coreMemoryClient.ts`).
- No LLM, no general chatbot.
- Separate from the React front (`apps/commander/`).

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/webhooks/meta/whatsapp` | Meta subscription handshake (`hub.challenge`) |
| POST | `/webhooks/meta/whatsapp` | Inbound messages (HMAC `X-Hub-Signature-256` verified) |

## Reuse (no duplication)
Imports the **pure** CORE Memory Engine agents directly:
- `normalizer.agent.ts` → `extractCableRefs`
- `classifier.agent.ts` → `classifyMessage`

The DB-coupled agents (`matcher`, `memoryEngine`) are **not** run here; COMMANDER
only ingests, the Memory Engine processes downstream.

## Data sink
1. Supabase table `incoming_messages` (service role) when configured.
2. Otherwise / on failure → local append-only `commander-audit.jsonl`.

The `incoming_messages` table is **proposed, not applied** — see
`migrations/PROPOSED_0001_incoming_messages.sql`.

## Commands
```powershell
# PowerShell (Windows)
cd apps/commander
npm install
npm run typecheck
npm run build
Copy-Item .env.example .env   # then fill secrets
npm run dev
```
```bash
# bash
cd apps/commander && npm install && npm run typecheck && npm run build
```

## Not included (by design, MVP)
- No deployment.
- No outbound WhatsApp messages.
- No media download.

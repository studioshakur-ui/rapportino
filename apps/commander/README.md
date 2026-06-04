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
| GET | `/health` | Liveness (Railway healthcheck target) |
| GET | `/webhooks/meta/whatsapp` | Meta subscription handshake (`hub.challenge`) |
| POST | `/webhooks/meta/whatsapp` | Inbound messages (HMAC `X-Hub-Signature-256` verified) |

The Meta webhook **Callback URL** is therefore:
`https://<your-railway-domain>/webhooks/meta/whatsapp`

## Environment
| Var | Required | Default | Notes |
|---|---|---|---|
| `META_VERIFY_TOKEN` | ✅ | — | Must match the token entered in the Meta App webhook config (GET handshake). |
| `META_APP_SECRET` | ✅ | — | Meta App → Settings → Basic. Verifies the `X-Hub-Signature-256` HMAC on every POST. |
| `SUPABASE_URL` | ⬜ | — | If set with the key below → writes to `incoming_messages` via `service_role`. |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | — | Service role bypasses RLS. Absent → JSONL audit fallback. |
| `PORT` | ⬜ | `8787` | Injected by Railway; takes precedence over `COMMANDER_PORT`. |
| `COMMANDER_PORT` | ⬜ | `8787` | Local fallback port. |
| `COMMANDER_INCOMING_TABLE` | ⬜ | `incoming_messages` | Logical sink table (INCA tables hard-rejected). |
| `COMMANDER_AUDIT_FILE` | ⬜ | `commander-audit.jsonl` | Append-only safety-net sink (always written on Supabase failure). |

See `.env.example`.

## Reuse (no duplication)
Imports the **pure** CORE Memory Engine agents directly:
- `normalizer.agent.ts` → `extractCableRefs`
- `classifier.agent.ts` → `classifyMessage`

The DB-coupled agents (`matcher`, `memoryEngine`) are **not** run here; COMMANDER
only ingests, the Memory Engine processes downstream.

## Data sink
1. Supabase table `incoming_messages` (service role) when configured.
2. Otherwise / on failure → local append-only `commander-audit.jsonl`.

The `incoming_messages` table is **applied** as
`supabase/migrations/20260604120000_commander_incoming_messages.sql` (RLS on:
`service_role` writes, single-owner read-only). The JSONL audit fallback stays
active even when the table exists — it is the safety net if Supabase is
unreachable. (`migrations/PROPOSED_0001_incoming_messages.sql` is kept only as
the superseded historical proposal.)

## Commands
```powershell
# PowerShell (Windows)
cd apps/commander
npm install
npm run typecheck
npm run build
npm test                      # GET-verify + signed-POST smoke tests (audit sink)
Copy-Item .env.example .env   # then fill secrets
npm run dev
```
```bash
# bash
cd apps/commander && npm install && npm run typecheck && npm run build && npm test
```

## Deployment (Railway)
Docker-based. **Build context = repo root** (COMMANDER bundles two pure CORE
agents from `src/features/core-command/agents/`).

1. New Railway service → Deploy from this repo.
2. **Root Directory** = repo root · **Dockerfile Path** = `apps/commander/Dockerfile`
   (or just commit `railway.json`, already provided).
3. **Variables**: `META_VERIFY_TOKEN`, `META_APP_SECRET`, and (recommended)
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. `PORT` is auto-injected.
4. **Healthcheck path** = `/health` (set in `railway.json`).
5. Start command: `node dist/index.cjs`.

Local Docker sanity check:
```powershell
docker build -f apps/commander/Dockerfile -t commander .
docker run --rm -p 8787:8787 `
  -e META_VERIFY_TOKEN=dev -e META_APP_SECRET=dev commander
```

### Wiring the Meta Cloud API webhook
1. Meta App → WhatsApp → Configuration → Webhook.
2. **Callback URL**: `https://<railway-domain>/webhooks/meta/whatsapp`
3. **Verify token**: the exact value of `META_VERIFY_TOKEN`.
4. Click *Verify and save* → Meta calls the GET handshake; COMMANDER echoes
   `hub.challenge` → green.
5. **Subscribe** to the `messages` field. Inbound messages then POST in, are
   HMAC-verified, mapped, classified, and written to `incoming_messages` (or the
   audit file).

## Not included (by design, MVP)
- No outbound WhatsApp messages / no auto-reply.
- No LLM in ingestion.
- No media download.

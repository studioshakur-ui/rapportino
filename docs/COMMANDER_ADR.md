# COMMANDER ADR

## Decision

`COMMANDER` is an independent backend service connected directly to `Meta WhatsApp Cloud API`.

It does not run in the React frontend.
It does not write to `INCA`.
It does not reconstruct `Cable Story`.
It does not use LLMs in ingestion.

## Target flow

`Meta WhatsApp Cloud API -> Commander Service -> CORE COMMAND Internal API -> Supabase -> Memory Engine -> Cable Story -> Advisor`

## Scope implemented in this scaffold

- Meta webhook verification contract
- Meta signature verification
- Closed command router
- Internal API client contracts
- Deterministic command handlers
- Allowlist gate
- Outbound Meta sender
- Runnable Node HTTP entrypoint
- In-memory ingress idempotence store
- Health and debug endpoints for local testing

## Runtime modules

- `src/commander/webhooks`
- `src/commander/router`
- `src/commander/commands`
- `src/commander/memory`
- `src/commander/story`
- `src/commander/risk`
- `src/commander/priority`
- `src/commander/production`
- `src/commander/infra`

## Next implementation step

Replace the in-memory ingress store with a persistent table and add queue-based retries plus dead-letter handling.

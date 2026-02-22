# INCA Import Runbook

## Current Flow (Storage-first)

1. UI uploads XLSX to Supabase Storage bucket `core-drive`.
2. Path format: `inca/{costr}/{commessa}/{yyyy-mm-dd}/{uuid}-{filename}`.
3. UI calls:
   - `inca-import` for `DRY_RUN` with JSON payload:
     - `storage_bucket`, `storage_path`, `file_name`, `costr`, `commessa`, `projectCode`, `note`
   - `inca-sync` for sync/write with JSON payload:
     - same fields + `force` and optional `shipId`.

Legacy multipart input is still accepted for backward compatibility, but rejected above 2 MB with explicit migration guidance.

## Why WORKER_LIMIT happened

Previous implementation could hit memory/CPU limits because it:

- Uploaded XLSX directly in function body (multipart).
- Built very large in-memory structures:
  - whole-row arrays + parsed arrays + raw copies
  - canonical full-file `join(\"\\n\")` strings for hashing
  - large diff payloads with full `before/after` objects
  - monolithic insert payload arrays before chunking

## Hardening applied

- Storage-first transport for both analysis and sync.
- `inca-import` (DRY_RUN-only):
  - rejects non-DRY modes
  - lightweight summary response only (small counts/samples)
  - max 50 error samples
- `inca-sync`:
  - supports JSON storage-first and guarded legacy fallback
  - hashes source bytes directly (`sha256` on `Uint8Array`)
  - no `canonLines.join(\"\\n\")` allocation
  - no `raw` row retention in parsed model
  - diff response is capped (`50` samples max) and count-based
  - DB inserts chunked without building one global payload
  - structured completion logs include `durationMs`, `sizeBytes`, row counts

## Troubleshooting

### Error: `WORKER_LIMIT` / `Memory limit exceeded` / `CPU time exceeded`

1. Verify caller uses storage-first JSON payload (not raw file multipart).
2. If legacy multipart is still used, switch UI/client to upload file in Storage first.
3. Check function logs:
   - `inputSource`
   - `sizeBytes`
   - `totalRows`, `totalCables`
   - `durationMs`

### Error: `Legacy multipart file too large (...)`

Expected behavior. Use storage-first call with:
- `storage_bucket`
- `storage_path`

### Error: `shipId mancante`

`inca-sync` needs a head `inca_files` row with valid `ship_id`.
Provide `shipId` in payload for first import of `(costr, commessa)` if no previous ship can be inferred.

## Manual verification

1. Small XLSX:
   - Run `Analizza` then `Sync`.
   - Expect `ok: true` and stable counts.
2. Large XLSX:
   - No worker crash in storage-first mode.
   - Legacy multipart should fail early with clear migration message.

## Risk Log

- XLSX parsing still loads workbook in memory (library limitation), but major avoidable allocations were removed.
- Very large historical `inca_cavi` snapshots can still impact DB query time when computing diffs.
- If edge runtime limits are tightened further, consider splitting very large sync jobs into async queued batches.

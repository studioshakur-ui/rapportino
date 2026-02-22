# Windows Build Runbook (EPERM / esbuild)

## Symptom
- `npm run build` fails on Windows with:
  - `Error: spawn EPERM`
  - during `vite build` while loading `vite.config.mjs`

## Probable cause
`esbuild` attempts to spawn a background service process, which can be blocked by Windows permissions or antivirus policies. This manifests as `spawn EPERM`.

## Verified workaround (auditable)
Use the dedicated Windows build script which disables the esbuild service:

```powershell
npm run build:win
```

This sets `ESBUILD_DISABLE_SERVICE=1` for the build only.

## If EPERM persists
If the error still occurs after `build:win`, the esbuild binary itself is being blocked.
In that case, allowlist these paths in your Windows security/AV policy:
- `node_modules\esbuild\`
- `node_modules\.bin\esbuild`

## Success criteria
- `npm run typecheck` completes with 0 errors
- `npm run build:win` completes and produces the Vite build output (no EPERM)

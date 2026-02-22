# Windows Build (EPERM / esbuild spawn)

## Symptom
`npm run build` fails on Windows with:

- `failed to load config ...`
- `Error: spawn EPERM` from esbuild

## Cause (likely)
esbuild tries to spawn its background service and is blocked by Windows permissions/AV.

## Fix (auditable)
Use the Windows build script that disables the esbuild service:

```powershell
npm run build:win
```

This runs `vite build` with `ESBUILD_DISABLE_SERVICE=1`.

## Success criteria
- `npm run typecheck` succeeds
- `npm run build:win` succeeds on Windows

# Build Windows (esbuild EPERM)

## Sintomi
- `npm run build` fallisce con: `Error: spawn EPERM` durante il caricamento di `vite.config.mjs`.

## Causa probabile
Su Windows, l’esecuzione del servizio esbuild può essere bloccata da policy o da antivirus/EDR.

## Comando consigliato (Windows)
Usa lo script dedicato che disabilita il service esbuild:

```powershell
npm run build:win
```

## Criteri di successo
- Output `vite build` senza errori.
- Cartella `dist/` generata correttamente.

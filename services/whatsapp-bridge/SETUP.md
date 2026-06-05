# CORE COMMAND — WhatsApp Bridge

Connecte le groupe WhatsApp chantier à Supabase **sans passer par Meta**.
Utilise `whatsapp-web.js` (WhatsApp Web automatisé via Puppeteer).

## Prérequis

- Node.js 18+
- Google Chrome ou Chromium installé (Puppeteer l'utilise)
- Un téléphone avec WhatsApp (pour scanner le QR code une fois)

## Installation (5 minutes)

```bash
# 1. Aller dans le dossier
cd services/whatsapp-bridge

# 2. Installer les dépendances
npm install

# 3. Copier la config
cp .env.example .env
```

## Configuration `.env`

```env
SUPABASE_URL=https://XXXXXXXXXXXXXX.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Settings → API → service_role

# Nom exact du groupe WhatsApp (casse exacte)
WATCH_GROUPS=Chantier Nave 6368
```

Pour trouver le nom exact du groupe : lancer le bridge une fois sans WATCH_GROUPS,
il affichera tous les groupes disponibles.

## Démarrage

```bash
npm run dev
```

La première fois, un QR code s'affiche dans le terminal.

**Scanner ce QR code** avec WhatsApp :
- Ouvrir WhatsApp sur le téléphone
- ⋮ Menu → Appareils liés → Lier un appareil
- Scanner le QR code affiché dans le terminal

La session est sauvegardée dans `.wwebjs_auth/` — le QR code n'est demandé qu'une seule fois.

## Fonctionnement

```
[16:13:34] Shamim Riva: IRS 002 / IRS 004 / 100%
     ↓
Bridge détecte: IRS 002, IRS 004 (câbles), 100% (progress)
     ↓
INSERT whatsapp_messages (avec hash pour éviter doublons)
INSERT incoming_messages (pour pipeline CORE COMMAND)
     ↓
CORE COMMAND voit les messages en temps réel
```

## Statut

Le bridge expose un endpoint de statut :
```
http://localhost:3099/
```

CORE COMMAND affiche automatiquement l'état du bridge dans le Command Center (barre verte/rouge).

## En production (VPS)

```bash
# Avec PM2 pour redémarrage automatique
npm install -g pm2
pm2 start "npm run start" --name core-whatsapp-bridge
pm2 save
pm2 startup
```

## Groupes multiples

```env
WATCH_GROUPS=Chantier Nave,Ponte 10 Team,CORE Chantier
```

## Dépannage

**"Browser not found"** → Installer Chrome : `npx puppeteer browsers install chrome`

**QR code expiré** → Supprimer `.wwebjs_auth/` et relancer : `npm run clean && npm run dev`

**Session invalide** → Même chose : `npm run clean && npm run dev`

**Messages en double** → Normal, le bridge déduplique via `message_hash`

# CORE COMMAND — Telegram Bridge

## Setup en 5 minutes

### Étape 1 — Créer le bot (2 min)

1. Ouvrir Telegram → chercher **@BotFather**
2. Envoyer `/newbot`
3. Choisir un nom : `CORE COMMAND Bot`
4. Choisir un username : `core_command_nave_bot` (doit finir par `bot`)
5. Copier le token reçu : `7123456789:AAFxxxxxx...`

### Étape 2 — Ajouter le bot au groupe

1. Ouvrir le groupe chantier sur Telegram
2. Modifier le groupe → Ajouter membre → chercher `@core_command_nave_bot`
3. L'ajouter comme **administrateur** (pour lire tous les messages)

### Étape 3 — Configurer .env

```bash
cd services/telegram-bridge
cp .env.example .env
```

Remplir `.env` :
```
BOT_TOKEN=7123456789:AAFxxxxxx...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
WATCH_CHAT_IDS=    # laisser vide pour l'instant
```

### Étape 4 — Trouver l'ID du groupe

```bash
npm install
npm run dev
```

Envoyer n'importe quel message dans le groupe. Le terminal affiche :

```
📋 Groupe détecté: "Chantier Nave 6368" → ID: -1001234567890
   Ajouter dans .env : WATCH_CHAT_IDS=-1001234567890
```

Arrêter avec Ctrl+C, ajouter l'ID dans `.env`, relancer.

### Étape 5 — Lancer en production

```bash
npm run dev   # développement (avec rechargement auto)
npm run start # production
```

---

## Ce qui se passe pour chaque message

```
[16:13] Shamim: IRS 002 / IRS 004 / TCK 621 / 100%
   ↓
Bridge détecte: IRS 002, IRS 004, TCK 621 (câbles) | 100% (progress)
   ↓
INSERT whatsapp_messages  → pipeline CORE COMMAND existant
INSERT incoming_messages  → pour le Memory Engine
   ↓
Command Center se met à jour automatiquement
```

---

## Garder le bridge actif (PM2)

```bash
npm install -g pm2
pm2 start "npm run start" --name core-telegram
pm2 save && pm2 startup
```

## Statut

```
http://localhost:3098/
```

Visible dans le Command Center (barre verte si connecté).

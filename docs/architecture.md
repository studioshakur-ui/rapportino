# Architecture CORE / CNCS

## Principes
- Une source de vérité par donnée
- Chaîne : Manager → Capo → Admin/Direzione
- Pas de parsing XLSX côté front
- Écritures critiques via backend contrôlé

## Serverless
- Supabase Edge Functions : écritures métier
- Netlify Functions : imports spécifiques si documentés

Toute exception doit être écrite ici.

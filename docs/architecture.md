# Architecture CORE / CNCS

## Principes
- Une source de vérité par donnée
- Chaîne : Manager → Capo → Admin/Direzione
- Pas de parsing XLSX côté front
- Écritures critiques via backend contrôlé

## Serverless
- Supabase Edge Functions : écritures métier
- Netlify Functions : imports spécifiques si documentés

## UFFICIO Acting-For Delegation (CNCS Exception)
Some CAPO may not be autonomous in using CORE.
In such case, UFFICIO may create/edit rapportini on behalf of CAPO.
This is strictly controlled via ufficio_capo_scopes and fully auditable.

Toute exception doit être écrite ici.

# CORE COMMAND — Official INCA Status Dictionary

> **Statut : RÈGLE MÉTIER CANONIQUE.**
> Source de vérité du code : `src/core/inca/statusDictionary.ts`.
> Ce document et ce fichier doivent rester synchronisés.

---

## 1. Dictionnaire officiel

| Code | Label (IT)                     | Catégorie   | Complet | Bloqué |
| ---- | ------------------------------ | ----------- | ------- | ------ |
| `P`  | Posato                         | posed       | non     | non    |
| `T`  | Tagliato                       | cut         | non     | non    |
| `R`  | Richiesto                      | requested   | non     | non    |
| `1`  | Collegato partenza             | connected   | non     | non    |
| `2`  | Collegato arrivo               | connected   | non     | non    |
| `C`  | Collegato partenza e arrivo    | connected   | **oui** | non    |
| `B`  | Bloccato                       | blocked     | non     | **oui**|
| `E`  | Eliminato                      | removed     | oui     | non    |

> Tout code hors de cette liste est **inconnu** et doit être traité comme tel
> (`normalizeIncaStatusCode()` renvoie `null`). Ne jamais inventer de code.

---

## 2. Règle métier — deux vérités

CORE COMMAND distingue **deux sources de vérité** qui ne doivent jamais être
confondues :

| Source                | Représente              | Exemple                |
| --------------------- | ----------------------- | ---------------------- |
| **INCA**              | la **vérité technique** | `situazione_inca = P`  |
| **Telegram / terrain**| la **vérité opérationnelle** | message « posato ✅ » |

INCA dit ce qui **devrait** être ; le terrain dit ce qui **est réellement** fait.

---

## 3. `P` n'est PAS une confirmation terrain

`P` (Posato) dans INCA est une **intention/déclaration technique**, pas une preuve
que le câble est réellement posé sur le terrain.

### Exemple — INCA `P` **sans** preuve terrain

```
INCA = P
(aucun message / événement terrain)
        ↓
Posato INCA non confirmé
```

### Exemple — INCA `P` **avec** preuve terrain

```
INCA = P
+ preuve terrain (CABLE_POSATO / POSED_REPORTED / 100%)
        ↓
Confirmé terrain
```

> **Règle absolue : ne jamais considérer `P` comme automatiquement confirmé.**
> La confirmation terrain provient des événements (`cable_events`, `core_events`,
> messages WhatsApp), pas du statut INCA. Voir
> `dailyLists.logic.ts → computeItemStatus()` et
> `equipment.logic.ts → isFieldConfirmed()`.

---

## 4. Lecture croisée INCA × terrain

| INCA  | Preuve terrain | Lecture métier                         |
| ----- | -------------- | -------------------------------------- |
| `P`   | non            | Posato INCA non confirmé (à vérifier)  |
| `P`   | oui            | Confirmé terrain                       |
| `B`   | —              | Bloqué (priorité absolue)              |
| `C`   | —              | Connecté complet (technique)           |
| absent| oui            | Preuve terrain hors INCA (à rapprocher)|

---

## 5. Rappel — INCA est read-only

CORE COMMAND **ne réécrit jamais** `inca_cavi`. Toutes les opérations INCA sont en
lecture seule. Le statut INCA est une **donnée d'entrée**, jamais une sortie.

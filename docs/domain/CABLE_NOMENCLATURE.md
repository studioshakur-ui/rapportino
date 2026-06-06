# CORE COMMAND — Canonical Cable Nomenclature

> **Statut : RÈGLE MÉTIER CANONIQUE — NON NÉGOCIABLE.**
> Ce document fait autorité pour Codex, Claude, tout agent IA, tout prompt et
> tout développeur présent ou futur. En cas de doute, ce document gagne.

---

## 0. Règle absolue

**Ne jamais supposer que :**

```
1-1 N AH 163
```

**et**

```
N AH 163
```

**sont le même câble.**

Ils sont **deux câbles distincts**. Cette hypothèse a déjà causé un bug métier
critique dans CORE COMMAND. Elle ne doit **plus jamais** être réintroduite.

---

## 1. Anatomie d'un code câble

Un code câble se compose, dans l'ordre :

```
[ PRÉFIXE ALIMENTO ]   TÊTE   FAMILLE   NUMÉRO   [ SUFFIXE ]
     1-1                 N       AH        163        (A)
```

| Segment            | Exemple | Obligatoire | Rôle                                            |
| ------------------ | ------- | ----------- | ----------------------------------------------- |
| Préfixe alimento   | `1-1`   | non         | **Fait partie de l'identité.** Distingue l'alimento du câble standard. |
| Tête (1 lettre)    | `N`     | oui         | Première lettre du marquage.                     |
| Famille (1-4 lett.)| `AH`    | oui         | Suite de lettres.                                |
| Numéro (2-5 chif.) | `163`   | oui         | Numéro du câble.                                 |
| Suffixe (1 lettre) | `A`     | non         | Variante optionnelle.                            |

### Câble standard

```
N AH 163
```

### Alimento (avec préfixe)

```
1-1 N AH 163
```

**Le préfixe numérique fait partie de l'identité du câble.**

Tous les câbles commençant par un préfixe de la forme `<chiffre>-<chiffre>` :

```
1-1
1-5
2-2
1-7
...
```

**sont des alimenti.** Le préfixe **ne doit jamais être supprimé.**

---

## 2. Trois représentations — ne jamais les confondre

CORE COMMAND manipule **trois** formes d'un code câble. Chaque couche a son rôle.

| Couche       | Forme          | Exemple        | Usage                                   |
| ------------ | -------------- | -------------- | --------------------------------------- |
| **Storage**  | valeur INCA exacte | `1-1 N AH 163` | Stockée telle quelle, **jamais mutée**. C'est la vérité. |
| **Matching** | `normalized_code`  | `NAH 163`      | Compact, **interne uniquement**. Sert à rapprocher des événements. **Jamais affiché.** |
| **Display**  | `display_code`     | `1-1 N AH 163` | Toujours produit par `formatCableDisplay()`. **Seule forme montrée à l'humain.** |

> **Implémentation :** `src/core/cable/cableDisplay.ts` → `formatCableDisplay(code)`.
> Toute l'UI passe par cette fonction. Aucun composant ne formatte un code localement.

---

## 3. Interdictions

Il est **formellement interdit** de :

- ❌ supprimer le préfixe alimento (`1-1`, `1-5`, …) ;
- ❌ normaliser un code en supprimant son préfixe ;
- ❌ matcher automatiquement un alimento avec sa version sans préfixe ;
- ❌ fusionner les deux entités (`1-1 N AH 163` et `N AH 163`) ;
- ❌ afficher à l'utilisateur la forme compacte de matching (`NAH163`, `TKV001`, `IRS002`).

---

## 4. Matching — autorisé vs interdit

### ✅ Matching autorisé (même identité)

```
1-1 N AH 163   ==   1-1 N AH 163
N AH 163       ==   N AH 163
```

Un code matche uniquement avec **lui-même** (préfixe inclus, après normalisation
d'espacement / casse via `normalized_code`).

### ❌ Matching interdit (identités différentes)

```
1-1 N AH 163   ≠   N AH 163
```

Un alimento ne matche **jamais** sa version sans préfixe, et inversement.

---

## 5. Portée

Cette règle s'applique **partout**, sans exception :

- INCA Import
- Daily Lists
- Cable Story
- Equipment Story
- Memory Engine
- Telegram Bridge
- COMMANDER

---

## 6. Dette connue (à corriger au niveau données)

> ⚠️ `dailyLists.parser.ts → normalizePdfCableCode()` **supprime** actuellement le
> préfixe de section/alimento (`SECTION_PREFIX_RE`). Tant que cette dette n'est pas
> résorbée, le `normalized_code` stocké pour un alimento peut être identique à celui
> du câble standard correspondant — c'est précisément le risque de fusion décrit ici.
>
> **Règle pour toute évolution future :** le `storage` doit conserver la valeur INCA
> exacte (préfixe compris), et le `normalized_code` utilisé pour le matching doit
> **inclure** le préfixe alimento. Ne jamais « simplifier » en retirant le préfixe.

---

## 7. Checklist pour agents / prompts

Avant de comparer, fusionner, dédupliquer ou afficher un code câble :

- [ ] Le préfixe alimento est-il préservé dans le storage ?
- [ ] Le matching distingue-t-il `1-1 X` de `X` ?
- [ ] L'affichage passe-t-il par `formatCableDisplay()` ?
- [ ] Aucune forme compacte (`NAH163`) n'est montrée à l'utilisateur ?

Si une seule case n'est pas cochée : **stop, c'est un bug métier.**

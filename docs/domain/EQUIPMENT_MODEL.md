# CORE COMMAND — Equipment-Centric Model

> **Statut : RÈGLE MÉTIER CANONIQUE.**
> Source de vérité du code : `src/modules/equipment/`.

---

## 1. Règle fondamentale

**Le câble n'est PAS l'entité principale. L'équipement est l'entité principale.**

Un câble n'existe que parce qu'il **relie des équipements**. La question métier
n'est pas « où en est ce câble ? » mais « cet **équipement** est-il prêt ? ».
Le câble est un *lien*, l'équipement est un *nœud*.

---

## 2. Hiérarchie officielle

```
Navire
  ↓
Système
  ↓
Équipement
  ↓
Câble (lien entre deux équipements)
```

| Niveau     | Rôle                                                        |
| ---------- | ---------------------------------------------------------- |
| Navire     | Périmètre global du projet.                                 |
| Système    | Regroupement fonctionnel (propulsion, énergie, etc.).      |
| Équipement | **Entité principale.** Possède des câbles entrants/sortants.|
| Câble      | Lien orienté entre deux équipements (`incoming` / `outgoing`). |

---

## 3. Le câble comme lien orienté

Chaque câble relie une **partenza** (départ) à un **arrivo** (arrivée). Vu depuis
un équipement, un câble est donc :

- **`incoming`** — le câble arrive sur cet équipement ;
- **`outgoing`** — le câble part de cet équipement.

> Implémentation : `equipment.types.ts → EquipmentLinkedCable.direction`,
> agrégé dans `equipment.logic.ts → buildEquipmentStory()`.

---

## 4. Avancement d'un équipement

L'état d'un équipement se **déduit de ses câbles**, en croisant la vérité INCA et
la vérité terrain (voir `INCA_STATUS_DICTIONARY.md`) :

- nombre de câbles liés (`total_cables`) ;
- câbles **confirmés terrain** (`confirmed_by_field`, via `isFieldConfirmed()`) ;
- câbles **sans preuve** (`without_field_evidence`) ;
- problèmes ouverts (`risk_reasons`, bloquants, priorités).

Le **niveau de risque** d'un équipement (`low | medium | high | critical`) agrège
ces signaux. Un équipement n'est « prêt » que lorsque **tous** ses câbles sont
confirmés terrain — pas seulement marqués `P` dans INCA.

---

## 5. Identité des câbles d'un équipement

Les câbles liés à un équipement suivent **strictement** la nomenclature canonique
(`CABLE_NOMENCLATURE.md`) :

- le préfixe alimento (`1-1`, `1-5`, …) fait partie de l'identité du câble et
  **distingue** deux liens différents sur le même équipement ;
- l'affichage d'un code câble passe **toujours** par `formatCableDisplay()` ;
- le matching utilise `normalized_code`, jamais l'affichage.

> Un alimento `1-1 N AH 163` et un câble `N AH 163` branchés sur le même
> équipement sont **deux liens distincts** et ne doivent jamais être fusionnés.

---

## 6. Portée

Ce modèle s'applique à : Equipment Story, Daily List Detail (équipements touchés),
Command Center, COMMANDER, Memory Engine.

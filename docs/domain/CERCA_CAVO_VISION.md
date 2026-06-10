# CORE COMMAND — Cerca Cavo : Vision, Contrat & Convergence

> **Statut : DIRECTION PRODUIT + MÉTIER + IA — FAIT AUTORITÉ.**
> Ce document fige le contrat de la recherche câble et du moteur de preuve.
> Il fait autorité pour Codex, Claude, tout agent IA et tout développeur.
> En cas de conflit avec une implémentation existante, **ce document gagne** et
> l'implémentation doit converger vers lui.
>
> Lire d'abord : `CABLE_NOMENCLATURE.md` (identité câble) et
> `INCA_STATUS_DICTIONARY.md` (statuts INCA). Ce document s'appuie dessus.

---

## 0. Phrase directrice

> **La recherche CORE COMMAND est le radar terrain qui transforme un code, un
> message ou un doute en preuve, statut et action — sans jamais inventer ni
> mentir.**

`Cerca Cavo` n'est pas une barre de recherche. C'est :

```
Cerca Cavo = radar terrain + mémoire câble + preuve + statut + action.
```

---

## 1. Règle absolue — intelligente, jamais mensongère

**Ne jamais afficher une preuve comme liée à un câble si le câble cible n'est
pas réellement détecté dans le texte/OCR, ou validé manuellement par le capo.**

Corollaire technique (invariant, pas un détail UI) :

> **Si le code ne peut pas être surligné (`highlight_start`/`highlight_end`)
> dans la preuve, la preuve ne peut pas être confirmée automatiquement.**

La confiance n'est pas un score décoratif : c'est une **provenance**. Une preuve
à 100 % sans highlight exact est moins fiable qu'une preuve à 65 % surlignable.

---

## 2. Décision de convergence — UN SEUL moteur de preuve

### 2.1 Le problème constaté (audit du 2026-06-10)

Il existe aujourd'hui **deux moteurs de vérité parallèles**, avec deux
vocabulaires incompatibles :

| Moteur | Fichier | Vocabulaire | Consommé par |
| ------ | ------- | ----------- | ------------ |
| **A — Forensic** | `src/core/cable/cableEvidence.ts` | `linked` / `ambiguous` / `related` | ❌ personne (tests seuls) |
| **B — Liste** | `src/modules/daily-lists/dailyLists.logic.ts` | `confirmed_field` / `likely_laid` / `to_verify` / `no_evidence` | ✅ toute l'app |

Le moteur dont le vocabulaire correspond à cette vision (A) n'est **branché nulle
part**. Le produit tourne sur B. Côté serveur, chaque edge function
(`classify-incoming`, `parse-terrain-image`, `ai-cockpit`) ajoute **encore** sa
propre extraction de code → 3 moteurs serveur supplémentaires.

### 2.2 La décision

> **`cableEvidence.ts` (moteur A) devient la source unique de la PREUVE et du
> LIEN. Tous les autres chemins d'extraction/classification de preuve doivent
> converger vers lui et être retirés.**

Le partage des responsabilités est strict et **non contaminable** :

| Couche | Fichier (source unique) | Répond à |
| ------ | ----------------------- | -------- |
| **Identité** | `src/core/cable/cableIdentity.ts` | *Qui est ce câble ?* (normalisation strict/loose) |
| **Preuve / Lien** | `src/core/cable/cableEvidence.ts` | *Ce texte prouve-t-il CE câble ?* (linked/ambiguous/related) |
| **Statut terrain** | `src/domain/core-engine/fieldVerification.ts` | *Cette preuve change-t-elle l'état terrain ?* (partenza/arrivo) |

**Interdiction de contamination** : un agent qui détecte un code n'a PAS le droit
de toucher au statut terrain. Seul `fieldVerification` + une phrase claire ou une
validation capo peut changer `Stato campo`.

---

## 3. Les 4 classes de signal (vocabulaire canonique italien)

Tout signal (Telegram, OCR, message libre) tombe dans exactement une classe.
Ce sont les `bucket` de `classifyCableEvidence`.

| Classe (UI italien) | `bucket` | Définition | Effet sur statut |
| ------------------- | -------- | ---------- | ---------------- |
| **Prove collegate** | `linked` | Câble cible détecté explicitement (highlight exact) OU validé capo | Peut alimenter le statut *avec une phrase claire* |
| **Candidati ambigui** | `ambiguous` | OCR faible, loose match, variante, code similaire | **Jamais** auto-lié. Validation capo requise |
| **Segnali correlati** | `related` | Même contexte, contient d'AUTRES codes, mais pas le câble cible | **Aucun** effet sur le statut |
| **Non collegato** | `none` | Aucun lien fiable | Aucun |

**Règle d'or** : un loose match n'est **jamais** une preuve confirmée. Le premier
code d'un message n'est **jamais** présumé être le câble recherché.

---

## 4. Le contrat forensic (champs obligatoires par résultat)

Chaque résultat de recherche/preuve doit pouvoir s'expliquer entièrement. C'est
la sortie de `classifyCableEvidence` (`CableEvidenceMatch`) :

| Champ | UI (italien) | Rôle |
| ----- | ------------ | ---- |
| `target_cable_code` | Cavo cercato | Le câble demandé |
| `raw_detected_code` | Codice rilevato | Tel qu'écrit dans le texte/OCR |
| `normalized_detected_code` | Codice normalizzato | Forme canonique |
| `match_type` | Tipo match | exact/strict/loose/ocr/telegram/manual/ambiguous/none |
| `bucket` | Stato prova | linked / ambiguous / related |
| `match_confidence` | Confidenza | 0–1 |
| `match_reason` | Motivo | Phrase explicative |
| `source_text_excerpt` | Estratto | Contexte autour du match |
| `highlight_start` / `highlight_end` | (surlignage) | **Si null → pas de confirmation auto** |
| `requires_human_validation` | Validazione richiesta | Sign-off capo nécessaire |
| `validated_by` / `validated_at` | (audit) | Trace de validation (à persister) |

---

## 5. Statut terrain ≠ lien de preuve

Une preuve **liée** ne suffit **pas** à changer le statut terrain.

**Exemple canonique** — message contenant uniquement `I S E 002` :

```
Prove collegate     : OUI  (bucket = linked, highlight exact)
Stato operativo     : Da verificare   ← inchangé
```

Pour changer `Stato campo`, il faut une **phrase claire** ou une **validation
capo** :

```
trovato partenza · trovato arrivo · trovato entrambi · non trovato ·
da ricontrollare · bloccato · collegato · validation manuelle capo
```

Ne jamais confondre :

- `da verificare` ≠ `bloccato`
- contexte ≠ preuve
- `app_partenza`/`app_arrivo` (apparato) ≠ état terrain partenza/arrivo

### Deux zones séparées dans la fiche

```
1. STATO CAMPO
   Partenza : Trovato / Da verificare / Non trovato / Da ricontrollare / Bloccato
   Arrivo   : Trovato / Da verificare / Non trovato / Da ricontrollare / Bloccato
   Stato op.: Da verificare / Parziale / Collegato / Bloccato / Da ricontrollare

2. APPARATI
   Apparato partenza : …
   Apparato arrivo   : …
```

Source de vérité : `fieldVerification.deriveCableFieldState()` (modèle 2 axes,
déjà implémenté) + `isRealBlocker()` (SSOT du blocage).

---

## 6. Segmentation intelligente — la fausse lettre finale

Les chaînes terrain denses collent la tête d'un code au suffixe du précédent.

**Exemples attendus :**

| Entrée | Doit produire | Ne doit PAS produire |
| ------ | ------------- | -------------------- |
| `C CS 515 C s 549` | `C CS 515` + `C S 549` | `C CS 515 C` |
| `CCS 515 C s 549` | `CCS 515` | `CCS 515 C` |
| `TKV 017 I` *(si existe au catalogue)* | `TKV 017 I` | — |
| `BT 025 C` *(si existe)* | `BT 025 C` | — |

**Algorithme (faisant autorité) :**

1. Détecter le candidat (regex, max **3 lettres** — voir §8).
2. Vérifier le code **complet (avec suffixe)** contre le catalogue (INCA/liste/SDC).
3. S'il existe → garder le code complet.
4. Sinon, essayer **sans** la lettre finale → si la base existe, l'utiliser.
5. Si la lettre finale est suivie de tokens formant un autre code → la traiter
   comme **début du code suivant**.
6. Sinon → classer en **candidat ambigu**, jamais en preuve confirmée.

⚠️ **Ne jamais retirer toutes les lettres finales** : certains suffixes sont
réels (`TKV 017 I`, `BT 025 C`, `RS 002 T`). La validation contre les **données
réelles** est ce qui tranche, pas une heuristique aveugle.

Implémenté à ce jour dans `cableEvidence.resolveSuffix()` :
- mode **catalogue** (si `knownCodes` fourni) = autoritaire ;
- mode **heuristique texte** (sinon) = fallback. Le mode catalogue devient la
  norme dès que la Phase 1 (catalogue mémoire) est livrée.

---

## 7. Le catalogue mémoire — socle invisible (dépendance critique)

`knownCodes` est aujourd'hui un `Set` vide tant que personne ne l'alimente. Or il
est **sous** la segmentation (§6) ET sous l'autocomplete/ranking (§9–10).

**Contrat du service `cableCatalog` (à construire en Phase 1) :**

- Source : `inca_cavi` (lecture seule) + liste active + SDC.
- Forme : `ReadonlySet<compactKey>` où `compactKey = cableKeyCompact(normalizeCableStrict(code))`.
- Chargé au login, rafraîchi à l'import d'une liste.
- **INCA reste strictement en lecture seule côté cockpit** (cf. règle projet :
  toute persistance INCA passe par l'edge function `inca-import`, jamais le client).
- Exposé à : `resolveSuffix` (segmentation), autocomplete, ranking.

---

## 8. Identité câble — rappel de bornes (cf. CABLE_NOMENCLATURE.md)

- **Tous les codes câble ont au plus 3 lettres** (ex. ISE, CCS, TCC, TKV).
  Les regex de détection sont bornés en conséquence (`{1,2}` après la 1re
  lettre ; longueur lettres ∈ [2,3]). Tout mot de 4+ lettres (PONTE, SCALA,
  QUADRO…) est rejeté **structurellement**, pas par liste noire.
- Le **préfixe alimento** (`1-5`, `2-1`…) fait partie de l'identité : `1-5 IRS 002`
  ≠ `IRS 002`. Clé `strict` = préfixe préservé ; clé `loose` = préfixe retiré
  (pour les signaux libres type Telegram qui ne l'écrivent jamais).

---

## 9. La fiche câble cible (sortie attendue)

```
ISE 002

STATO CAMPO
  Stato operativo : Da verificare
  Partenza        : Da verificare
  Arrivo          : Da verificare

PROVE COLLEGATE : 1
  Codice rilevato : I S E 002
  Confidenza      : 100%
  Motivo          : codice target rilevato esplicitamente nel testo
  Estratto        : …LK 014 [I S E 002] GF 001…   ← highlight exact

CANDIDATI AMBIGUI : 0
SEGNALI CORRELATI : 1   (contiene altri codici, non questo cavo)

APPARATI
  Apparato partenza : …
  Apparato arrivo   : …
INCA : …   SDC : …   Lista : …

AZIONE CONSIGLIATA
  Richiedere conferma partenza / arrivo.
```

Variantes :

- **Partiel** : `Stato operativo : Parziale — manca arrivo` · Partenza Trovato ·
  Arrivo Da verificare · Azione : Verificare arrivo.
- **Ambigu** : `Candidato ambiguo · Codice simile trovato · Validazione capo richiesta.`
- **Corrélé** : `Segnale correlato · Contiene altri codici, non questo cavo · Nessuna azione.`

**Couverture actuelle estimée** : ~60 % des lignes de cette fiche sont déjà
alimentables par du code existant (statut 2 axes + evidence forensic + repo).
Le blocage est de **câblage** (brancher le bon moteur sur la page), pas
algorithmique. Seule `Azione consigliata` est entièrement à dériver
(`statut × preuve → action`).

---

## 10. Recherche multi-source, types & ranking

### Sources à interroger

liste du jour · listes précédentes · INCA · SDC · `daily_list_items` ·
`cable_events` · `core_events` · Telegram · OCR photos · preuves manuelles ·
apparati · ESWBS · systèmes · Situazione 16:30 · historique câble.

### Types de requête

| Type | Exemple | Comportement |
| ---- | ------- | ------------ |
| Code exact | `ISE 002` | Fiche directe |
| Code espacé | `I S E 002` | Idem (normalisation) |
| Code partiel | `ISE` | Prefix-search → tous les ISE + état |
| OCR approximatif | `1SE OO2` | Candidats ambigus |
| Apparato | `415001120001` | Fiche apparato |
| ESWBS / système | … | Câbles impactés |
| Message terrain | `cavi senza arrivo` | Liste filtrée |
| Historique | `chi ha toccato questo cavo?` | Auteurs + events |
| Preuve | `OCR falliti oggi` | Preuves à valider |
| Action | `trovati partenza ma non arrivo` | Liste actionnable |

**Tri du sélecteur (intent)** : 80 % des cas sont tranchés **sans LLM**
(regex + heuristique : est-ce un code ou une intention ?). LLM en fallback
uniquement. Code → navigation ; intention → filtres ; question libre →
Assistente avec pré-contexte.

### Ranking terrain (pas alphabétique)

1. match exact dans la liste active
2. preuve confirmée récente
3. validation manuelle capo
4. câble à vérifier aujourd'hui
5. câble partiel partenza/arrivo
6. apparato ouvert
7. incohérence à vérifier
8. OCR faible / candidat ambigu
9. historique ancien
10. signaux contextuels

### Actions rapides depuis un résultat

`Trovato a partenza` · `Trovato ad arrivo` · `Trovato a entrambi` ·
`Non trovato` · `Da ricontrollare` · `Bloccato` · `Associa prova` ·
`Valida prova` · `Ignora segnale` · `Apri apparato` · `Apri storia` ·
`Copia per Situazione`.

> ❌ **Jamais** de bouton vague « Verificato ». Une action = une transition
> explicite et nommée.

---

## 11. Situazione 16:30 — aucun chiffre mort

Chaque chiffre de la Situazione doit être **explicable par la recherche** :

- `Senza evidenza campo: 10` → clic → les 10 câbles.
- `Bloccati reali: 2` → clic → preuve + raison + auteur + heure + action.

Source : `dailySituation.ts` (métriques déjà drillables) reliée à la recherche.

---

## 12. Persistance forensic (audit historique)

À terme, persister par preuve résolue (table `cable_evidence` ou extension) :

```
target_cable_code · raw_detected_code · normalized_detected_code · match_type ·
link_status · match_confidence · match_reason · source_text_excerpt ·
highlight_start · highlight_end · requires_human_validation ·
validated_by · validated_at
```

Pourquoi : pouvoir auditer **plus tard** *pourquoi* un câble était considéré
lié / ambigu / validé. Aujourd'hui la classification est recalculée au render,
donc non auditable historiquement.

---

## 13. Design & langue

- **Mobile-first, light premium, italien partout** pour les libellés visibles.
- Par défaut : résumé clair + preuve principale + statut + action. Détail
  forensic replié derrière `Dettagli forensic`.
- Les signaux non liés (`related`) sont **secondaires/repliés**. Ne jamais
  polluer la fiche câble avec ce qui ne concerne pas directement le câble.
- Libellés canoniques : Prove collegate · Candidati ambigui · Segnali correlati ·
  Non collegato · Validazione richiesta · Nessuna azione · Codice rilevato ·
  Cavo cercato · Motivo · Confidenza · Azione consigliata · Stato campo · Apparati.

---

## 14. Plan de phases (ordre corrigé par l'audit)

> L'ordre ci-dessous **remplace** la numérotation initiale du brief. Justification :
> on ne construit pas la recherche sur deux vérités contradictoires (→ Phase 0
> d'unification d'abord), et le catalogue est un **socle** sous la segmentation ET
> la recherche (→ remonté en Phase 1).

| Phase | Objectif | Débloque | Risque |
| ----- | -------- | -------- | ------ |
| **0 — Unifier la vérité** | Brancher `cableEvidence` sur `CableDetailPage` (3 sections + highlight + Stato campo 2 axes). Retirer le vocabulaire doublon de `dailyLists.logic`. | La fiche câble cible devient réelle. Une seule vérité. | Faible (moteur déjà testé) |
| **1 — Catalogue mémoire** | Service `cableCatalog` (INCA+liste+SDC, read-only, en mémoire). Alimente `knownCodes`, autocomplete, ranking. | Segmentation fiable + recherche instantanée. | Faible/moyen |
| **2 — Ingestion unifiée** | Edge functions (`classify-incoming`, `parse-terrain-image`, `ai-cockpit`) importent `cableIdentity`/`cableEvidence`. Fin des moteurs serveur parallèles. | Telegram/OCR/IA parlent le même langage. | Moyen |
| **3 — Persistance forensic** | Table `cable_evidence` (§12). Sign-off capo sur ambigus. | Audit historique. | Moyen |
| **4 — Recherche radar** | Autocomplete, ranking terrain, multi-source, actions rapides, texte libre → intent. | La vision « radar terrain » complète. | Moyen/élevé |

---

## 15. Ce que l'IA ne doit JAMAIS faire (garde-fous)

L'IA est une **couche métier invisible**, pas un chatbot décoratif. Elle lit,
détecte, classe, évalue la confiance, explique, signale l'ambiguïté, propose une
action et **demande validation**. Elle ne doit **jamais** :

- inventer un câble ;
- fermer automatiquement un câble ou un apparato ;
- transformer un message ambigu en preuve confirmée ;
- transformer une preuve liée en « trovato » sans phrase claire ;
- confondre `da verificare` avec `bloccato` ;
- confondre contexte avec preuve ;
- utiliser un loose match comme preuve confirmée ;
- prendre le premier code d'un message comme preuve du câble recherché ;
- décider à la place du capo.

---

*Dernière mise à jour : 2026-06-10. Document directeur — toute implémentation de
`Cerca Cavo` ou du moteur de preuve doit s'y conformer ou le faire évoluer
explicitement.*

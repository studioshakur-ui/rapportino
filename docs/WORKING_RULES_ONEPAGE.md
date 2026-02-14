# FICHE MÉTIER – RESPONSABLE SYSTÈMES & ARCHITECTURE (CORE)

## 1. RÔLE

Le Responsable Systèmes & Architecture est garant :
- de la cohérence globale du système CORE
- de l’intégrité des données
- de la précision technique et fonctionnelle
- de la traçabilité des décisions

Il agit comme **architecte, contrôleur et garant qualité**.

---

## 2. RESPONSABILITÉS CLÉS

- Définir et maintenir l’architecture technique
- Garantir l’intégrité de la base de données
- Valider toute évolution structurelle
- Refuser toute implémentation approximative
- Documenter les règles, choix et contraintes

---

## 3. PHILOSOPHIE DE TRAVAIL

- La précision est prioritaire à la rapidité
- Une erreur structurelle est critique
- La clarté prévaut sur l’intuition
- La discipline protège la qualité

---

## 4. RÈGLES OPÉRATIONNELLES

### Base de données
- Toute modification DB doit être traçable
- Le snapshot DB est la vérité technique
- Aucun changement DB sans mise à jour documentaire
- Le snapshot n’est jamais modifié manuellement

### Code
- Aucun code sans contexte complet
- Aucun fichier critique partiel
- Aucun test “pour voir”

### Documentation
- Toute règle importante est écrite
- La documentation est versionnée
- Ce qui n’est pas documenté n’est pas fiable

---

## 5. LIMITES & INTERDICTIONS

- Deviner une structure
- Continuer sans visibilité complète
- Corriger après coup une erreur évitable
- Accumuler de la dette technique consciente

---

## 6. POSTURE PROFESSIONNELLE

- Responsabilité individuelle élevée
- Décisions assumées
- Traçabilité systématique
- Rigueur constante, même sous pression

---

## 7. RÈGLE FINALE

> La qualité du système dépend directement de la rigueur de son responsable.

Ces règles décrivent une **discipline professionnelle**.
Elles ne constituent pas des actions à exécuter systématiquement,
mais des obligations à respecter lorsqu’un changement structurel est effectué.

- Lors de l’envoi de fichiers compressés (ZIP) :
  - **Ne jamais envoyer tout le projet**
  - **Uniquement les fichiers strictement concernés**
  - Les chemins exacts doivent être respectés
  - Aucun ZIP sans nécessité explicite
LES MIGRATIONS DB TOUJOURS EN .SQL
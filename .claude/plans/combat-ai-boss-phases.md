# LOT B — Profondeur de combat : IA & phases de boss

> Branche : `claude/combat-ai-boss-phases` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT B.

## Constat de départ (vérifié dans le code)
- `enemyTurn` (battle.js:653) choisissait la cible **au hasard** (`alive[random]`).
- `tryEnemyAbility` (battle-spells.js) choisissait la capacité via `.find(random<chance)` —
  **aucune lecture de `enemy.ai`**, alors que le champ existe sur la quasi-totalité
  des monstres (`aggressive`/`cautious`/`random`).
- Aucun boss n'avait de phase/pattern : boss = gros minion.
- Instances ennemies = deep-copy JSON (dungeon-scaling.js:94) → muter `atk`/pousser
  une capacité est sûr (pas de corruption des templates `MONSTERS`).

## Réalisé

- [x] **B1a — ciblage piloté par `ai`** : `_chooseEnemyTarget(enemy, alive)` (battle.js).
  - `aggressive` → cible les PV les plus bas (focus fire / achève).
  - `cautious` → cible l'ATK la plus haute (neutralise la menace).
  - `random`/défaut → aléatoire (comportement historique).
  - Solo (1 cible) = no-op naturel.
- [x] **B1b — choix de capacité piloté par `ai`** (battle-spells.js `tryEnemyAbility`).
  - Filtre des capacités dont le jet réussit, puis sélection par tempérament :
    `aggressive` → préfère `damage`/`drain` ; `cautious` → si PV < 35 % préfère
    `heal`/`drain`, sinon `weaken`/`dispel` ; `random` → 1ʳᵉ déclarée (historique).
  - Heuristique anti-Double-Garde (weaken ×1.5) **préservée**.
- [x] **B2 — phases de boss data-driven** : `_checkBossPhases(enemy)` (battle.js),
  appelé en tête du tour de chaque ennemi. Champ optionnel `phases: [{ atPct,
  atkMult?, magMult?, healPct?, gainAbility?, msg? }]` (trié par seuil ↓).
  Déclenché une fois par seuil franchi (`_phaseIdx`), réinitialisé par combat.
  - Données : **Voldemort Ressuscité** (enrage à 50 %, puis Terreur/peur à 25 %)
    et **Basilic Mineur** (frénésie + venin à 50 %).
- [x] **Tests** : `scenarioEnemyAiAndBossPhases` (smoke.js) — ciblage aggressive/cautious,
  choix heal d'un cautious à bas PV, enrage+gainAbility au seuil sans re-déclenchement.
  Suite complète **122/122 verte**.

## Hors scope (reporté, cf. plan principal §3 LOT B)
- **B3** nouveaux archétypes de capacités (`summon`, `enrage_self`, `aura`) — itératif,
  à faire après retour de jeu. (Un mini-enrage est couvert par les phases.)
- **B4** rééquilibrage Legilimens — à trancher avec l'utilisateur (pas un problème
  ressenti confirmé).
- Évaluation des phases **pendant** le tour héros (actuellement au tour suivant de
  l'ennemi) — suffisant pour le MVP ; à affiner si le délai d'un tour gêne.

## Journal
| Date | Note |
|------|------|
| 2026-05-29 | B1 (ciblage + choix) + B2 (phases) implémentés et testés. B3/B4 reportés. |

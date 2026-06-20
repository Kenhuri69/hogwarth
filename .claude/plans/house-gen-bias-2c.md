# Lot 2c — Biais de génération par Maison (levier cosmétique power-neutral)

> Plan vivant (guidelines §5). Branche `claude/endgame-house-gen-bias`.
> Item 2c de `roadmap-phase-3-4-closure.md`. Spec : doc 10 §10.6 (« Biais de
> génération par Maison — V2 »).

## Arbitrage (2026-06-20, AskUserQuestion)
Le levier MAJEUR (pondération de types de salle) est **bloqué par le gate de
release** du §10.6 : un sim d'équilibrage neutre (Item 3) doit prouver 0 écart
de win-rate AVANT merge. Il **reste différé** derrière ce gate (V1 cosmétique
reste le comportement réel pour la génération).

Livré maintenant (user a tranché) : le levier **skin visuel de Maison** —
power-neutral **par construction** (aucun nom/stat/résistance/butin touché),
donc 0 sim requis.

## Décision d'implémentation
Une **livrée de Maison** purement visuelle sur les cartes d'ennemi en combat,
pilotée par `chosenHouse` (la Maison du **spectateur** — le donjon « se lit »
différemment selon la Maison du héros, §10.6). Aucune touche au chemin de
spawn/scaling (`scaleMonster` intact) → impossible d'altérer la difficulté.

- `js/battle-ui.js` : helper PUR `houseSkinClass(house, enabled)` → `'house-skin-<h>'`
  ou `''`. Flag `HOUSE_SKIN_ENABLED` (repli V1 = `false`). `renderEnemyGroup`
  ajoute la classe à `.enemy-card`. Défensif (`typeof chosenHouse`).
- `css/style.css` : `.enemy-card.house-skin-<house>` — fine aura colorée
  (palette de Maison) sur l'icône, **subtile**, composant avec variant/corruption.
- `tests/units.js` : couverture du helper pur (4 Maisons + flag off + inconnu).
- cache-bump : `battle-ui.js`, `style.css`.
- Docs : 10 §10.6 (skin V2 = livré, visuel), closure plan 2c ✅, REVUE biais row.

## Garde-fous (du §10.6, respectés)
- **Power-neutral strict** : 0 stat/résistance/butin/spawn modifié — garanti par
  construction (rendu seul). Pas besoin du sim de l'Item 3 pour CE levier.
- **Désactivable** (flag `HOUSE_SKIN_ENABLED`).
- Pondération de salles = **hors-scope ici**, gardée derrière le gate sim (Item 3).

## Étapes
1. Helper pur + flag + câblage `renderEnemyGroup` → verify: `units.js` vert.
2. CSS livrée 4 Maisons → verify: rendu subtil, composant variant/corruption.
3. cache-bump (battle-ui, style) → verify: `check_cache_versions` exit 0.
4. Docs réconciliés → verify: `check_doc_modules` exit 0.
5. smoke + units + pwa verts → commit + push + PR.

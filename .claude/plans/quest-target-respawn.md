# Plan — Respawn des cibles de quête manquantes

## Contexte

Symptôme rapporté : joueur niveau 7, étage 4, `chouette_perdue` active dans le
journal — mais aucune Chouette Ensorcelée n'apparaît sur la map (étage 4
entièrement exploré).

## Cause racine

`spawnQuestMonsters` (`dungeon.js:223`) n'est appelé qu'à l'acceptation de la
quête, depuis `acceptQuest` (`quests.js:267`). Pour les **vieilles saves** où
la quête a été acceptée avant l'ajout du hook `spawnOnAccept` sur
`chouette_perdue` (ou pour tout autre désynchro), la cible n'a jamais été
injectée dans `enemyMap`. Aucun mécanisme rétroactif n'existe.

## Correctif

Ajouter `_ensureActiveKillQuestTargets(floor)` (dungeon.js) :
- Scanne `activeQuests`.
- Pour chaque step `kill` non terminé déclaré dans un template avec
  `spawnOnAccept`, et dont `monsterId === spawnOnAccept.targetMonsterId` :
  - Compte les instances déjà présentes dans `enemyMap`.
  - Calcule le manque = `step.amount - step.progress - instancesPresentes`.
  - Place ce nombre de monstres sur des cases FLOOR libres (réutilise la
    logique de `spawnQuestMonsters` sans les `extraRandomCount`).
- Idempotente : no-op si toutes les cibles sont déjà présentes.

Wire :
- `generateDungeon(floor)` → en fin de fonction, avant retour.
- `_restoreFloorFromCache(floor)` → après `_respawnEnemiesOnEntry` et avant
  `_migrateMissingNpcsForFloor`.

## Étapes

1. [x] Diagnostic confirmé par l'utilisateur (vieille acceptation, étage 4 exploré).
2. [ ] Créer ce plan markdown → vérif : fichier présent.
3. [ ] Implémenter `_ensureActiveKillQuestTargets` dans `dungeon.js` → vérif : fonction définie + JSDoc court.
4. [ ] Brancher dans `generateDungeon` et `_restoreFloorFromCache` → vérif : grep des deux call sites.
5. [ ] Ajouter au MANIFEST de `loader.js` → vérif : entrée présente.
6. [ ] Ajouter un cas dans `tests/smoke.js` qui :
   - démarre une partie,
   - simule la "vieille acceptation" en injectant manuellement `chouette_perdue` dans `activeQuests` sans appel à `spawnQuestMonsters`,
   - téléporte sur l'étage 4 (`currentFloor = 4; generateDungeon(4)`) → vérif que la chouette est dans `enemyMap`.
7. [ ] Lancer `node tests/smoke.js` → tous les scénarios passent.
8. [ ] Commit + push sur `claude/fix-missing-aggrid-character-MZRqf`.

## Non-objectifs

- Pas de feedback visuel pour le joueur (addMsg) — silencieux, c'est de la
  migration.
- Pas d'extension aux quêtes `item` (pas de `spawnOnAccept` item dans le
  catalogue actuel).

# Garantir le spawn du boss final (étage 10)

## Problème

L'escalier descendant de l'étage 10 est scellé tant que `voldemort_revenu`
(Voldemort Ressuscité) n'est pas vaincu (`movement-floors.js:208` +
`endgame.js — checkVictoryTrigger`). C'est la condition de victoire.

Or `voldemort_revenu` n'a **aucun placement garanti** : c'est une entrée
du pool de rencontres aléatoires de l'étage 10 avec `weight: 1` sur un
poids total de 98 (~1 % par ennemi généré, 30 monstres éligibles). Un
joueur peut donc nettoyer tout l'étage 10 sans jamais le rencontrer →
soft-lock de progression (escalier scellé, plus rien à combattre, respawn
20 % rejoue le même pool à ~1 %).

Reproduit par la save fournie (perso niv. 13, étage 10) : `voldemort_revenu`
kills = 0, carte d'ennemis étage 10 vide.

## Correctif

Garde-fou `_ensureFinalBossPresent(floor)` (modèle `_ensureStairsExist`),
idempotent : place `voldemort_revenu` sur une case FLOOR libre quand
`floor === 10 && !victoryAchieved` et qu'il n'est pas déjà présent.
Placement privilégié près de l'escalier descendant scellé (l'antre du boss).

### Étapes

1. [x] Helper `_ensureFinalBossPresent(floor)` dans `dungeon-spawning.js`.
   → vérif : place 1 boss si absent à floor 10 pré-victoire ; no-op sinon
     (déjà présent / floor ≠ 10 / victoire acquise).
2. [x] Câblage `generateDungeon` (dungeon.js, après `_ensureStairsExist`).
3. [x] Câblage `_restoreFloorFromCache` (movement-floors.js).
4. [x] Câblage `_applyState` (save.js) → répare les saves existantes
   (étage 10 déjà nettoyé).
5. [x] Ajout au MANIFEST loader (cohérence avec les autres `_ensure*`).
6. [x] Scénario smoke `scenarioFinalBossGuaranteed` + enregistrement.
   → vérif : `node tests/smoke.js`.

## Notes

- N'altère pas la map (pas de cellule spéciale) : seul `enemyMap` est touché,
  cohérent avec le reste des garde-fous de `dungeon-spawning.js`.
- Post-victoire (`victoryAchieved`) : no-op → la Boucle Ténébreuse n'est pas
  polluée par un boss permanent.

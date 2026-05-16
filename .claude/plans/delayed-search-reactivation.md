# Fouille renouvelée — réactivation différée de la fouille

## Objectif

Transformer la fouille (`searchRoom`) en ressource renouvelable : une case
fouillée redevient fouillable après un délai exprimé en **pas de marche**.
Le délai dépend de la difficulté (ratio appliqué à un socle de 60 pas).

## Décisions

- **Toujours actif** — remplace le comportement « 1 fouille / case / étage ».
- **Délai = pas de marche** (compteur global `stepCount`, déterministe,
  persistable).
- **Délai par difficulté** (socle 60) :
  | Difficulté | Ratio | Délai (pas) |
  |------------|-------|-------------|
  | Facile     | 0.75  | 45  |
  | Normal     | 1.00  | 60  |
  | Difficile  | 1.33  | 80  |
  | Expert     | 1.66  | 100 |
- **Anti-farm dégressif** : à partir de la 2ᵉ fouille d'une même case,
  seul l'or peut tomber (et il est divisé par 2). Items/herbes désactivés.

## Étapes

1. `state.js` — ajouter `searchRechargeSteps` aux 4 entrées
   `DIFFICULTY_SETTINGS` ; déclarer `let stepCount = 0` ; `searchedCells`
   devient une `Map<"x,y", {at, count}>`.
   → vérif : `node tests/smoke.js` reste vert.
2. `movement.js` — incrémenter `stepCount` dans `_step` ; helpers
   `_searchRechargeSteps()`, `_searchCellStatus(key)`,
   `_searchedCellsFromArray(arr)` ; réécrire `_updateSearchBtn` et
   `searchRoom` ; adapter `_restoreFloorFromCache`.
   → vérif : bouton Fouiller passe grisé puis se réactive après le délai.
3. `save.js` — sérialiser/restaurer `stepCount` ; restaurer
   `searchedCells` via `_searchedCellsFromArray` (migration legacy :
   anciennes entrées chaîne ignorées → mode redémarre proprement).
   → vérif : round-trip save/load conserve `{at,count}` et `stepCount`.
4. `ui.js` — `updateRoomStatus` affiche « ✓ Fouillé » seulement pendant
   la recharge.
   → vérif : tag disparaît une fois la case réactivée.
5. `tests/smoke.js` — nouveau scénario `scenarioDelayedSearch` :
   machine d'état (fresh→recharging→ready), scaling difficulté,
   round-trip save, migration legacy.
   → vérif : scénario vert, suite complète verte.

## Avancement

- [x] Étape 1 — state.js
- [x] Étape 2 — movement.js
- [x] Étape 3 — save.js
- [x] Étape 4 — ui.js
- [x] Étape 5 — smoke test

## Écarts constatés

- `Array.from(searchedCells)` fonctionne tel quel sur une `Map` (produit
  les entrées `[clé, valeur]`) — aucun changement nécessaire côté
  sérialisation amont, seule la **dé**sérialisation change.
- Pas de reset explicite de `stepCount` : la recharge est relative
  (`stepCount - at`), donc l'échelle absolue n'a pas d'importance tant
  qu'elle est cohérente entre la sauvegarde de `at` et la lecture.

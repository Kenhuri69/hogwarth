# Rééquilibrage : Repos, Garde, Fouille

Trois ajustements de mécaniques demandés.

## 1. Repos interrompu → bénéfice partiel
- `rest()` (`movement.js`) : quand une rencontre interrompt le repos, le
  groupe conserve **50 %** du soin normal avant le combat.
- Soin normal = 30 % PV/PM max → soin interrompu = 15 % PV/PM max.
- Constante `REST_INTERRUPT_HEAL_FRACTION = 0.5` dans `data.js`.
- Vérif : `node tests/smoke.js` vert ; lecture du code.

## 2. Garde — regen PM 1 tour sur 2
- L'action Garde reste empilable (Double-Garde inchangée).
- Seule la **régénération de PM** passe en cooldown : possible une fois
  tous les deux tours par personnage.
- Nouveau global `guardRegenCooldown = [0, 0]` (`state.js`).
- `startBattle` le réinitialise ; décrément à chaque round dans `enemyTurn`.
- Vérif : lecture du code ; smoke test vert.

## 3. Fouille — découverte de malus
- `searchRoom()` (`movement.js`) : avant le tirage de butin, deux jets
  indépendants de **1 %** :
  - monstre de l'étage courant → `startBattle(pickSimilarEnemy())`.
  - piège → `_triggerSearchTrap()`, effet **aléatoire** parmi 3 variantes
    (dégâts groupe / dégâts solo / dégâts groupe + DoT), jamais létal.
- Constantes `SEARCH_MONSTER_CHANCE` / `SEARCH_TRAP_CHANCE = 0.01`.
- Vérif : smoke test vert.

## Étapes
1. `data.js` : 3 constantes → verif lecture
2. `state.js` : `guardRegenCooldown` → verif lecture
3. `battle.js` : reset + gate regen + décrément → verif lecture
4. `movement.js` : repos partiel + jets fouille + trap → verif lecture
5. `node tests/smoke.js` → vert
6. Mise à jour CLAUDE.md (lignes Garde / Fouille / Repos)

# Panneau d'info monstre en combat

## Objectif
En combat, ouvrir un panneau d'information sur un monstre via **clic** (desktop)
ou **appui long** (tactile) sur sa carte. Les infos révélées s'enrichissent
selon le nombre de monstres de cette espèce déjà vaincus.

## Décisions (validées avec l'utilisateur)
- Paliers de révélation « Faiblesses gardées secrètes » :
  - 0 kill  → identité (icône, nom, catégorie, danger), PV, description.
  - ≥1 kill → caractéristiques chiffrées + lore.
  - ≥3 kills → résistances & faiblesses élémentaires.
  - ≥5 kills → capacités spéciales + butin + habitat/anecdote.
- Faiblesses affichées **uniquement dans le panneau** (pas de pastille
  permanente sur la carte ennemie).

## Étapes
1. `state.js` : ajouter `monsterKills = {}` (compteur par id d'espèce).
   → vérif : global déclaré.
2. `main.js` : réinitialiser `monsterKills = {}` dans `startGame` (à côté
   de `totalKills = 0`). → vérif : reset à chaque nouvelle partie.
3. `save.js` : sérialiser/restaurer `monsterKills`. → vérif : survit à un
   save/load.
4. `battle.js` : dans `endBattle(won)`, incrémenter `monsterKills[e.id]`
   pour chaque ennemi vaincu. → vérif : compteur monte après victoire.
5. `index.html` : ajouter `#monster-info-overlay` dans `#encounter-overlay`.
6. `css/style.css` : styliser l'overlay + panneau.
7. `battle-ui.js` : `showMonsterCombatInfo(idx)`, `closeMonsterCombatInfo()`,
   handlers clic/appui-long câblés dans `renderEnemyGroup`.
   → vérif : clic ouvre, appui long ouvre, paliers respectés.
8. `loader.js` : enregistrer `monsterKills` + `showMonsterCombatInfo` au
   MANIFEST.
9. `node tests/smoke.js` vert.

## Suivi
- [x] Étapes 1-9 implémentées
- [x] `node tests/smoke.js` vert (scénario `scenarioMonsterCombatInfo` ajouté)
- Note : `scenarioRespawn20Percent` (T5) présente une instabilité
  intermittente pré-existante (un monstre généré sur la case de départ
  du joueur) — indépendante de cette feature (chemins de code disjoints :
  génération de donjon vs panneau d'info).

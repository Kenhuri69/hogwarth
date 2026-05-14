# Plan — Sort de Téléportation (Portus)

Ajout d'un sort utilitaire premium achetable cher en boutique, qui amorce
un système de **sorts hors combat** réutilisable.

## Décisions de scope

- **Une seule nouvelle mécanique de fond** : `effect:"teleport"` dans
  `SPELLS`, géré séparément en combat et hors combat.
- **L'extension du sort de soin hors combat est hors scope** de cette PR :
  la modale "Sorts hors combat" reste cliquable mais seul Portus est jouable
  dans cette version (autres sorts marqués "uniquement en combat"). Le
  câblage permet d'ajouter Episkey/Reparo ultérieurement sans refonte.
- **Pas de nouveau bouton dédié** : on réutilise le bouton 📖 Sorts existant.
  Hors combat, ses entrées deviennent cliquables.
- **Le livre `livre_portus`** s'achète au shop fixe à 2 800 G, débloqué
  étage 6. Il enseigne le sort à tout le groupe (cohérent avec le système
  spellbooks existant). Aucune contrainte de niveau côté code — c'est le
  coût en or et l'étage de déblocage qui font la barrière.

## Étapes

### 1. Plan + icône PNG
- [x] Créer ce fichier.
- [x] Générer `img/icons/spells/teleportation.png` (128×128, vortex bleu-violet
      avec runes dorées) via script Python/Pillow procédural.
- **Vérifier** : fichier présent et taille raisonnable (< 30 ko).

### 2. Données (`data.js` + `item-icons.js` + `shop.js`)
- [x] Ajouter le sort `Portus` dans `SPELLS` (cost 52 PM en combat,
      power 0, effect `"teleport"`, outOfCombatCost 38).
- [x] Ajouter `audio-sfx.js` freqMap entry pour `Portus`.
- [x] Ajouter `livre_portus` dans `ITEMS` (price 2800, spellbook, spell:`Portus`).
- [x] Référencer `Portus` dans `SPELL_ICON_REGISTRY`.
- [x] Ajouter `{ id: "livre_portus", minFloor: 6 }` à `SHOP_CATALOG`.
- **Vérifier** : `node tests/smoke.js` reste vert.

### 3. État + sauvegarde (`state.js` + `save.js` + `movement.js` + `main.js`)
- [x] Déclarer `let visitedFloors = new Set([1])` dans `state.js`.
- [x] Mettre à jour à `goDeeper()` / `goUp()` (et au `confirmHeroSelection`/`startGame`).
- [x] Sérialiser/désérialiser dans `_serializeState` / `_applyState`.
- [x] Reset dans `main.js — startGame` (nouvelle partie).
- **Vérifier** : visitedFloors persiste après un load (ajout au smoke optionnel).

### 4. Effet du sort (`battle-spells.js` + nouveau module `teleport.js`)
Pour limiter la surface : un nouveau module dédié `js/teleport.js` expose
les helpers, et `battle-spells.js` route `effect:"teleport"` vers ces helpers.
- [x] `_pickRandomFreeFloorCell(floor)` : retourne `{x,y}` sur une cellule
      `CELL.FLOOR` libre (pas de mur, pas d'ennemi, pas le joueur).
- [x] `teleportInCombat(mode, targetIdx)` :
      - `mode='party'` → `endBattle(false)`, déplace party sur case libre du même étage.
      - `mode='enemy'` → retire l'ennemi du `enemyGroup` (sans XP/loot), il
        respawn sur une case libre via `enemyMap`. Garde-fous (boss,
        nombre d'ennemis > 1, 1 utilisation/combat via flag).
      - **Bosses** : on identifie un boss par `monster.danger >= 10` ou par
        une short-list d'IDs hardcodée (`bellatrix`, `voldemort_affaibli`,
        `voldemort_revenu`). Cohérent avec le bestiaire actuel.
- [x] `teleportOutOfCombat(floor)` :
      - Vérifie que floor ∈ `visitedFloors` et floor ≠ `currentFloor`.
      - Bascule l'étage (similaire à `goDeeper`/`goUp` mais étage arbitraire).
      - Place le joueur sur une case libre random.
      - 12 % de chance d'ajouter +30G par étage ou +20 PV/PM full au groupe
        (bonus simple, pas de fontaine/coffre spawn pour éviter de toucher
        à la génération).
- **Vérifier** : tests manuels (smoke) — sort lancé en combat / hors combat
      ne plante pas, la grille de jeu se redessine.

### 5. UX combat (`battle-spells.js` + `battle-ui.js`)
- [x] Quand `Portus` est sélectionné en combat, ouvrir un overlay de choix
      A/B : « Téléporter mon groupe » vs « Téléporter un ennemi ».
- [x] Si le joueur choisit « ennemi », utiliser le selecteur de cible existant
      (`showTargetSelection('spell_dmg')`) avec un message custom.
- [x] Si « groupe », exécuter directement.
- [x] Flag `_teleportUsedThisFight` reset dans `startBattle`.
- **Vérifier** : Portus disable / message si déjà utilisé ou interdit.

### 6. UX hors combat (`inventory.js`)
- [x] `openSpells()` : rendre les entrées cliquables et appeler
      `castSpellOutOfCombat(spellName, charIdx)` quand l'effet le supporte.
- [x] Pour Portus : ouvrir un nouvel overlay de choix d'étage (grille des
      étages visités).
- [x] Confirmer avant lancement, gros boutons, max 4-5 colonnes pour mobile.
- **Vérifier** : la modale s'affiche, l'étage sélectionné devient l'étage
      courant et le canvas se redessine.

### 7. Test smoke
- [x] `node tests/smoke.js` reste vert. Ajouter un scénario dédié n'est pas
      strictement requis (sort optionnel) ; à éviter si trop intrusif.

### 8. Commit + push
- [x] Commit unique sur `claude/add-teleportation-spell-0AkFh`.
- [x] Push (`git push -u origin claude/add-teleportation-spell-0AkFh`).

## Risques / écarts

- Le système hors combat n'extend que Portus pour cette PR (et non Episkey/Reparo
  comme le mentionne le brief). À documenter dans le commit pour éviter une
  attente non couverte. Le câblage `castSpellOutOfCombat` est extensible.
- La PNG est procédurale (Pillow) faute d'asset artistique livré ; sera
  remplacée plus tard par une vraie image si nécessaire.
- Sur les étages avec très peu de cases libres (cas rare), `_pickRandomFreeFloorCell`
  retourne `null` → message d'échec et remboursement du PM.

## Itération 2 — équilibrage (post-revue)

Après revue : Portus était trop puissant. Ajustements :

- **Bonus 12 % à l'arrivée** désormais 50/50 positif/négatif :
  - Positif (6 %) : soin **HP only** (3 + niveau d'étage × 5 PV, plafonné par hpMax),
    pas de full heal, pas de PM restauré.
  - Négatif (6 %) : 50/50 entre piège (`-X PV` sur un perso random, scalé étage)
    et apparition d'un ennemi (combat immédiat avec un monstre éligible à
    l'étage d'arrivée).
- **Cooldown hors combat** : 2 transitions d'étage (escaliers, `goDeeper`
  OU `goUp`) avant de pouvoir relancer Portus hors combat. Un compteur
  `portusOocCooldown` est décrémenté à chaque transition.
- **Cooldown en combat** : 3 combats gagnés (`endBattle(won=true)`) avant
  de pouvoir relancer Portus en combat. Compteur `portusFightCooldown`.
- Les deux compteurs sont persistés dans le save (`_serializeState` /
  `_applyState`) et reset à `startGame`.
- L'UI affiche le cooldown restant à la place du coût PM quand le sort
  est en attente.


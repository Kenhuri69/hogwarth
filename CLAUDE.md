# Poudlard & Magie — Mémoire Projet

RPG en tour par tour inspiré de *Might & Magic Book One*, univers Harry Potter.
Vanilla JS / HTML5 Canvas, zéro dépendance, zéro build step.

---

## Structure des fichiers

```
index.html               Point d'entrée unique
css/style.css            Toute la mise en page (thème parchemin/or)
js/
  data.js        →  Constantes : MAP_W/H, CELL, CHARACTERS, ENEMIES, ITEMS, SPELLS, SHOPS
  state.js       →  Variables globales mutables (player, player2, party, dungeon, combat…)
  ui.js          →  updateUI(), _updateCharBar(idx), openCharacter(), addMsg(), addLog()
  dungeon.js     →  generateDungeon(), generateEnemyMap(), generateItemMap()
  renderer.js    →  drawScene() — rendu 3D canvas raycasting-like
  movement.js    →  move(), handleCellEntry(), searchRoom(), rest(), interact()
  battle.js      →  startBattle(), battleAction(), enemyTurn(), endBattle(), checkLevelUp()
  inventory.js   →  openInventory(), useItem(), openSpells(), openBattleSpells(), openBattleItems()
  shop.js        →  openShop(), buyItem()
  save.js        →  saveGame(), loadGame()  — LocalStorage clé : hogwarts_rpg_save
  main.js        →  startGame(), init(), keyboard listeners
.github/workflows/deploy.yml   →  CI GitHub Pages (push master → déploiement automatique)
```

Ordre de chargement des scripts dans `index.html` :
`data → state → ui → dungeon → renderer → movement → battle → inventory → shop → save → main`

---

## Architecture globale

- **Pas de modules ES** : tous les fichiers partagent le scope global via `<script>` séquentiels.
- **Pas de bundler** : les fichiers sont servis directement par GitHub Pages.
- Les fonctions d'un fichier peuvent appeler celles de n'importe quel autre fichier chargé avant.

---

## Groupe de personnages

```
player  ──┐
           ├─→ party[0]   Harry Potter   (🧙)
player2 ──┘
           └─→ party[1]   Hermione Granger (🧙‍♀️)
```

- `player` et `party[0]` pointent vers le **même objet** — ne jamais réassigner ces variables,
  utiliser `Object.assign()` pour les modifier (voir `save.js`).
- **Or et inventaire partagés** : portés par `player.gold` / `player.inventory`.
- **XP partagée** : stockée sur `player.xp` / `player.xpNext`.
- `player2.gold` et `player2.inventory` existent mais ne sont pas utilisés.

### Stats par personnage

| Stat  | Harry | Hermione |
|-------|-------|----------|
| PV    | 35    | 28       |
| PM    | 22    | 35       |
| FOR   | 9     | 6        |
| INT   | 11    | 17       |
| AGI   | 12    | 10       |
| END   | 10    | 7        |
| LCK   | 15    | 12       |
| MAG   | 10    | 16       |
| ATK   | 5     | 3        |
| DEF   | 2     | 2        |

Harry : sorts offensifs + Protego
Hermione : sorts de soin/support + forte magie

---

## Système de combat

### Variables d'état (state.js)
```js
inBattle          // bool
enemyGroup        // [{...enemyData, currentHp, disarmed}, …]  1 à 3 ennemis
currentBattleChar // 0 = Harry, 1 = Hermione
shieldTurns       // [0, 0]  — bouclier par personnage
pendingAction     // 'attack' | 'spell' | null  (en attente de sélection de cible)
pendingSpell      // nom du sort en attente
```

### Tour de jeu
```
Harry agit → advanceBattleChar() → Hermione agit → advanceBattleChar() → Ennemis agissent → retour Harry
```
Si un personnage est KO, son tour est sauté automatiquement.

### Taille du groupe ennemi (par étage)
| Étage | 1 ennemi | 2 ennemis | 3 ennemis |
|-------|----------|-----------|-----------|
| 1–2   | 65 %     | 35 %      | —         |
| 3–4   | 30 %     | 45 %      | 25 %      |
| 5+    | 20 %     | 35 %      | 45 %      |

### Sélection de cible
Quand plusieurs ennemis sont en vie, `showTargetSelection(actionType)` affiche les boutons
dans `#target-selection` / `#target-buttons`. `pendingAction` et `pendingSpell` mémorisent
l'action en attente jusqu'au clic.

---

## IDs HTML importants

### Panneau gauche — groupe
| ID              | Contenu                        |
|-----------------|-------------------------------|
| `char-card-0`   | Carte Harry (div.party-card)   |
| `char-card-1`   | Carte Hermione (div.party-card)|
| `hp-text-{0,1}` | Texte PV                       |
| `hp-bar-{0,1}`  | Barre PV                       |
| `sp-text-{0,1}` | Texte PM                       |
| `sp-bar-{0,1}`  | Barre PM                       |
| `xp-text`       | XP partagée (texte)            |
| `xp-bar`        | XP partagée (barre)            |

### Overlay de combat
| ID                    | Rôle                                    |
|-----------------------|-----------------------------------------|
| `encounter-overlay`   | Conteneur combat (display:flex/none)    |
| `enemy-group`         | Cartes ennemis rendues par JS           |
| `battle-char-indicator` | "🧙 Tour de Harry Potter"             |
| `battle-log`          | Texte du dernier événement              |
| `target-selection`    | Zone sélection cible (display:none/flex)|
| `target-buttons`      | Boutons générés dynamiquement           |

---

## Rendu 3D (renderer.js)

Canvas 2D, pseudo-raycasting directionnel (pas de DDA).
- Profondeur : 5 niveaux (`DEPTH = 5`)
- Couleurs de pierre chaudes : `#8a6840` → `#181008` (proche → loin)
- `drawFloorLines()` : lignes de convergence vers le point de fuite
- `drawStoneBlocks()` : joints de maçonnerie sur les murs frontaux
- `addTorchGlow()` : halo atmosphérique chaud
- `drawForegroundFrame()` : bordure dorée décorative au premier plan

---

## Sauvegarde

Clé LocalStorage : `hogwarts_rpg_save`

```js
// Sauvegarde
{ party: [player, player2], currentFloor, playerX, playerY, playerDir,
  dungeon, visited, enemyMap, itemMap }

// Chargement — IMPORTANT : Object.assign pour préserver les références
Object.assign(player,  gs.party[0]);
Object.assign(player2, gs.party[1]);
party[0] = player;
party[1] = player2;
```

Ne jamais faire `player = gs.party[0]` : cela casserait la référence `party[0] === player`.

---

## Déploiement

- Dépôt : https://github.com/Kenhuri69/hogwarth
- URL publique : https://kenhuri69.github.io/hogwarth/
- Pipeline : `.github/workflows/deploy.yml` — déclenché à chaque push sur `master`
- Prérequis côté GitHub : Settings → Pages → Source = **GitHub Actions**

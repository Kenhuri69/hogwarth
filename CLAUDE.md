# Poudlard & Magie — Mémoire Projet

RPG en tour par tour inspiré de *Might & Magic Book One*, univers Harry Potter.
Vanilla JS / HTML5 Canvas, zéro dépendance, zéro build step.

---

## Structure des fichiers

```
index.html               Point d'entrée unique
css/style.css            Toute la mise en page (thème parchemin/or + responsive mobile)
js/
  monsters.js    →  ⭐ FICHIER ENRICHISSABLE : registre complet des créatures (MONSTERS[])
  data.js        →  Constantes : MAP_W/H, CELL, CHARACTERS, ITEMS, SPELLS, LOCATIONS
                    ENEMIES = MONSTERS (alias de compatibilité)
  state.js       →  Variables globales mutables (player, player2, party, partySize, dungeon, combat…)
  ui.js          →  updateUI(), _updateCharBar(idx), openCharacter(), addMsg(), addLog()
  dungeon.js     →  generateDungeon(), weightedPick(), scaleMonster()
  renderer.js    →  drawScene() — rendu 3D canvas raycasting-like
  movement.js    →  move(), handleCellEntry(), searchRoom(), rest(), interact()
  battle.js      →  startBattle(), battleAction(), enemyTurn(), tryEnemyAbility(), endBattle(), checkLevelUp()
  inventory.js   →  openInventory(), useItem(), openSpells(), openBattleSpells(), openBattleItems()
  shop.js        →  openShop(), buyItem()
  save.js        →  saveGame(), loadGame()  — LocalStorage clé : hogwarts_rpg_save
  main.js        →  showPlayerSelect(), startGame(count), keyboard listeners
.github/workflows/deploy.yml   →  CI GitHub Pages (push master → déploiement automatique)
```

Ordre de chargement des scripts dans `index.html` :
`monsters → data → state → ui → dungeon → renderer → movement → battle → inventory → shop → save → main`

---

## Architecture globale

- **Pas de modules ES** : tous les fichiers partagent le scope global via `<script>` séquentiels.
- **Pas de bundler** : les fichiers sont servis directement par GitHub Pages.
- Les fonctions d'un fichier peuvent appeler celles de n'importe quel autre fichier chargé avant.

---

## Choix du nombre de joueurs

Au démarrage, `showPlayerSelect()` affiche un écran de sélection.
- **Solo (1)** : Harry seul — `partySize = 1`, carte Hermione masquée, indicateur de tour masqué.
- **Duo (2)** : Harry + Hermione — comportement complet.

`partySize` est sauvegardé dans le LocalStorage et restauré au chargement.

### Taille des groupes ennemis selon partySize

| Mode  | Étage 1-2 | Étage 3-4       | Étage 5+        |
|-------|-----------|-----------------|-----------------|
| Solo  | 1 seul    | 70% / 30% (1/2) | 50% / 50% (1/2) |
| Duo   | 65% / 35% (1/2) | 30% / 45% / 25% (1/2/3) | 20% / 35% / 45% (1/2/3) |

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
- En mode solo, `party` contient toujours les deux objets mais `partySize = 1` contrôle toute la logique.

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
partySize         // 1 ou 2 — choisi à l'écran de démarrage
enemyGroup        // [{...monsterData scalé, currentHp, disarmed}, …]  1 à 3 ennemis
currentBattleChar // 0 = Harry, 1 = Hermione
shieldTurns       // [0, 0]  — bouclier par personnage
pendingAction     // 'attack' | 'spell_dmg' | null
pendingSpell      // nom du sort en attente de sélection de cible
```

### Tour de jeu
```
Harry agit → advanceBattleChar()
  si partySize=2 et Hermione vivante → Hermione agit → advanceBattleChar()
Ennemis agissent (tryEnemyAbility ou attaque physique) → retour Harry
```
Si un personnage est KO, son tour est sauté automatiquement.

### Capacités spéciales des ennemis (tryEnemyAbility)
Chaque ennemi peut avoir un tableau `abilities[]`. À chaque tour ennemi,
chaque capacité est tentée selon sa `chance` (0.0–1.0).
- `"damage"` → dégâts magiques (power + mag/2)
- `"heal"`   → l'ennemi se soigne
- `"weaken"` → réduit la DEF de la cible
- `"drain"`  → draine des PV et s'en soigne à moitié

### Résistances / Faiblesses
`enemy.resist[]` → sorts atténués de 50%, affiche 🔰
`enemy.weak[]`   → sorts amplifiés de 50%, affiche 💥
Valeurs possibles : `"stun"` `"burn"` `"disarm"` `"instant"`

### Drops
Après victoire, `endBattle()` tire indépendamment chaque entrée de `enemy.drops[]`.
Si le tirage réussit et l'inventaire n'est pas plein, l'objet est ajouté.

### Sélection de cible
Quand plusieurs ennemis sont en vie, `showTargetSelection(actionType)` affiche les boutons
dans `#target-selection` / `#target-buttons`. `pendingAction` et `pendingSpell` mémorisent
l'action en attente jusqu'au clic.

---

## Système de monstres (monsters.js)

**Ce fichier est le seul à modifier pour ajouter ou modifier des ennemis.**
Le moteur s'adapte automatiquement sans toucher au reste du code.

### Propriétés complètes d'un monstre

| Propriété | Type | Rôle |
|-----------|------|------|
| `id` | string | Identifiant unique |
| `name` | string | Nom affiché |
| `icon` | string | Emoji |
| `category` | string | `"bête"` `"humain"` `"fantôme"` `"créature"` `"être magique"` |
| `desc` | string | Message d'apparition en combat |
| `lore` | string | Texte de lore |
| `minFloor` | number | Étage minimum d'apparition |
| `maxFloor` | number\|null | Étage maximum (`null` = sans limite) |
| `weight` | number | Fréquence de tirage (10=commun, 5=rare, 2=très rare) |
| `hp/atk/def/mag/agi/lck` | number | Stats de base (avant scaling) |
| `scale` | number | Coefficient de progression par étage (0.15 lent → 0.40 rapide) |
| `abilities` | array | Capacités spéciales (voir ci-dessus) |
| `ai` | string | `"aggressive"` `"cautious"` `"random"` |
| `resist` | string[] | Sorts atténués de 50% |
| `weak` | string[] | Sorts amplifiés de 50% |
| `xp` | number | XP de base |
| `gold` | number\|{min,max} | Or de base (scalé automatiquement) |
| `drops` | [{itemId, chance}] | Drops potentiels après victoire |

### Fonctions moteur associées (dungeon.js)
```js
weightedPick(pool)          // tirage pondéré selon .weight
scaleMonster(base, floor)   // applique le scaling + résout gold en nombre
```

### Monstres définis (36 au total)
| Étages | Monstres |
|--------|---------|
| 1–3    | Chat de Mme Norris, Luciole des Marais, Cornichon de Cornouailles, Portrait Hostile, Peeve, Mimi Geignarde, Serpent des Cachots |
| 2–6    | Chouette Ensorcelée, Mandragore Sauvage, Kappa des Douves, Épouvantard, Gobelin Rebelle, Araignée Géante |
| 3–7    | Bundimun Venimeux, Homme-Araignée, Méduse Noire, Troll des Toilettes, Centaure Hostile, Détraqueur |
| 4–9    | Hippogriffe en Furie, Inférius, Loup-Garou Enragé, Sorcière des Ténèbres |
| 5+     | Mangemort Masqué, Jeune Acromantule, Détraqueur Gardien, Troll des Cavernes, Sorcier Renégat |
| 6+     | Basilic Mineur, Chimère de Poudlard, Ombre de Quirrell, Nagini |
| 7+     | Mangemort d'Élite |
| 8+     | Bellatrix Lestrange, Voldemort Affaibli |
| 10+    | Voldemort Ressuscité |

**Icônes SVG** définies dans `icons.js` pour tous les monstres majeurs.
Les monstres sans SVG propre héritent du SVG de leur catégorie.
Un **TEMPLATE commenté** se trouve en bas de `monsters.js`.

---

## IDs HTML importants

### Écrans
| ID | Rôle |
|----|------|
| `title-screen` | Écran titre (onclick → showPlayerSelect) |
| `player-select-screen` | Choix 1 ou 2 joueurs |
| `game-container` | Grille principale du jeu |
| `death-screen` | Écran de mort |

### Panneau gauche — groupe
| ID              | Contenu                         |
|-----------------|---------------------------------|
| `char-card-0`   | Carte Harry (div.party-card)    |
| `char-card-1`   | Carte Hermione (masquée si solo)|
| `hp-text-{0,1}` | Texte PV                        |
| `hp-bar-{0,1}`  | Barre PV                        |
| `sp-text-{0,1}` | Texte PM                        |
| `sp-bar-{0,1}`  | Barre PM                        |
| `xp-container`  | Conteneur XP partagée           |
| `xp-text`       | XP partagée (texte)             |
| `xp-bar`        | XP partagée (barre)             |

### Overlay de combat
| ID                      | Rôle                                    |
|-------------------------|-----------------------------------------|
| `encounter-overlay`     | Conteneur combat (display:flex/none)    |
| `enemy-group`           | Cartes ennemis rendues par JS           |
| `battle-char-indicator` | Tour actif — masqué en mode solo        |
| `battle-log`            | Texte du dernier événement              |
| `target-selection`      | Zone sélection cible (display:none/flex)|
| `target-buttons`        | Boutons générés dynamiquement           |

### Barre de commandes
| Classe / ID       | Rôle |
|-------------------|------|
| `.desktop-dir`    | Boutons WASD — masqués sur mobile |
| `.mobile-dir`     | D-pad tactile — masqué sur desktop |
| `.dpad-btn`       | Bouton individuel du D-pad |
| `.action-group`   | Groupe boutons actions |
| `.btn-label`      | Labels texte — masqués sur mobile |

---

## Responsive mobile (≤ 700px)

- Layout devient une colonne unique : header → left (bandeau HP) → main → footer
- Panneau droit masqué
- D-pad tactile (`.mobile-dir`) remplace les boutons WASD (`.desktop-dir`)
- Boutons action en grille 2×3 avec emoji uniquement
- Touch targets minimum 44px
- Modales en 96vw scrollable
- Utilise `100dvh` pour éviter les problèmes de barre URL mobile

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
{ party: [player, player2], partySize,
  currentFloor, playerX, playerY, playerDir,
  dungeon, visited, enemyMap, itemMap }

// Chargement — IMPORTANT : Object.assign pour préserver les références
Object.assign(player,  gs.party[0]);
Object.assign(player2, gs.party[1]);
party[0] = player;
party[1] = player2;
if (gs.partySize) partySize = gs.partySize;
```

Ne jamais faire `player = gs.party[0]` : cela casserait la référence `party[0] === player`.

---

## Déploiement

- Dépôt : https://github.com/Kenhuri69/hogwarth
- URL publique : https://kenhuri69.github.io/hogwarth/
- Pipeline : `.github/workflows/deploy.yml` — déclenché à chaque push sur `master`
- Prérequis côté GitHub : Settings → Pages → Source = **GitHub Actions**

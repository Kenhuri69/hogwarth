# Poudlard & Magie — Mémoire Projet

RPG en tour par tour inspiré de *Might & Magic Book One*, univers Harry Potter.
Vanilla JS / HTML5 Canvas, zéro dépendance, zéro build step.

---

## Structure des fichiers

```
index.html               Point d'entrée unique
css/style.css            Toute la mise en page (thème parchemin/or + responsive mobile)
js/
  audio.js         →  AudioSystem{} — core : init, state, toggleMute, toggleVoice, stopMusic
  audio-music.js   →  AudioSystem — musique ambiante et combat (playAmbientMusic, startCombatMusic…)
  audio-sfx.js     →  AudioSystem — effets sonores et voix (playHit, playSpellCast, speakSpell…)
  icons.js         →  SVG inline pour chaque monstre majeur — getMonsterIconHtml()
  monsters.js      →  ⭐ FICHIER ENRICHISSABLE : registre complet des créatures (MONSTERS[])
  data.js          →  Constantes : MAP_W/H, CELL, CHARACTERS, ITEMS, SPELLS, LOCATIONS
                      ENEMIES = MONSTERS (alias de compatibilité)
  state.js         →  Variables globales mutables (player, player2, party, partySize,
                      dungeon, combat, seenMonsters, activeQuests…)
  ui.js            →  updateUI(), openCharacter(), addMsg(), closeModal(), changeDifficulty()
  ui-bestiary.js   →  openBestiary(), filterBestiary(), showMonsterDetail(), showBestiaryList()
  dungeon.js       →  generateDungeon(), weightedPick(), scaleMonster()
  renderer.js      →  drawDungeon(), drawCorridor() — rendu 3D canvas + textures + fog
  renderer-effects.js → drawTorch(), drawStoneBlocks(), drawFloorLines(), drawCellMarker()…
  renderer-minimap.js → renderMinimap(), _buildMinimapCells()
  movement.js      →  move(), handleCellEntry(), searchRoom(), rest(), interact()
  battle.js        →  startBattle(), battleAction(), enemyTurn(), endBattle(), checkLevelUp()
  battle-spells.js →  castSpellInBattle(), tryEnemyAbility()
  battle-ui.js     →  renderEnemyGroup(), showTargetSelection(), updateBattleCharIndicator()
  inventory.js     →  openInventory(), useItem(), showEquipMenu(), equipItem(),
                      recalculateStats(), openSpells(), openBattleSpells(), openBattleItems()
  quests.js        →  openQuestLog(), renderQuestList(), checkQuestCompletion(),
                      completeQuest(), checkKillQuests()
  shop.js          →  openShop(), buyItem() — catalogue progressif selon étage + garde-fous
  save.js          →  saveGame(), loadGame()  — LocalStorage clé : hogwarts_rpg_save
  main.js          →  showPlayerSelect(), startGame(count), keyboard listeners
.github/workflows/deploy.yml   →  CI GitHub Pages (push master → déploiement automatique)
```

Ordre de chargement des scripts dans `index.html` :
`audio → audio-music → audio-sfx → icons → monsters → data → state → ui → ui-bestiary → dungeon → textures → renderer → renderer-effects → renderer-minimap → movement → battle → battle-spells → battle-ui → inventory → quests → shop → save → main`

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

Harry : sorts offensifs + Protego — commence avec : Expelliarmus, Stupefix, Episkey, Protego, Incendio
Hermione : sorts de soin/support + forte magie — commence avec : Episkey, Protego, Incendio, Accio

---

## Système d'équipement (inventory.js)

Chaque personnage a ses propres slots d'équipement (`c.equipped`), distincts de l'inventaire partagé.

### Champs sur chaque personnage (state.js)
```js
equipped: { wand: null, armor: null, acc: null }  // objets équipés (copie complète de l'item)
_baseAtk, _baseDef, _baseMag, _baseLck            // stats de base qui croissent au level-up
                                                   // indépendamment des bonus d'équipement
```

### Flux d'équipement
```
useItem(idx, battleMode)
  └─ si type !== 'consumable' && !battleMode → showEquipMenu(item, idx)
       └─ solo : equipItem(idx, 0)   directement
          duo  : affiche prompt Harry / Hermione dans la grille
                 → equipItem(inventoryIdx, charIdx)
                     ├─ c.equipped[slot] = {...item}
                     ├─ c.wand / c.armor / c.acc = item.name  (strings legacy)
                     ├─ player.inventory.splice(inventoryIdx, 1)
                     └─ recalculateStats()
```

### recalculateStats()
Doit être appelé après chaque équipement **et** après chaque level-up.
```js
// Pour chaque personnage du groupe :
c.atk = c._baseAtk + (wand.bonusAtk || 0) + ...
c.def = c._baseDef + (armor.bonusDef || 0) + ...
c.mag = c._baseMag + (wand.bonusMag || 0) + (acc.bonusMag || 0) + ...
c.lck = c._baseLck + (acc.bonusLck || 0) + ...
```

### Items équipables (data.js)
| ID | Type | Bonus | Effet spécial |
|----|------|-------|---------------|
| `wand1` | wand | bonusAtk:2 | — |
| `wand2` | wand | bonusAtk:5, bonusMag:3 | — |
| `robe1` | armor | bonusDef:3 | — |
| `amulette` | acc | bonusMag:4, bonusLck:3 | `grantsSpell:"Reparo"` (enseigné à l'équipement) |
| `broom` | acc | — | fuite garantie |

En combat, les équipements sont grisés et non cliquables dans l'inventaire.

### Items spellbook (data.js)
Les livres de sorts ont `type:"spellbook"` et un champ `spell` (nom exact dans SPELLS).
Cliquer un livre hors combat enseigne le sort à **tout le groupe actif** et consomme le livre.

| ID | Nom | Sort enseigné | Disponible |
|----|-----|--------------|------------|
| `livre_sortileges` | Sortilèges Standards, Vol.3 | Wingardium Leviosa | Boutique, coffre ≥ étage 2 |
| `livre_soin` | Potions & Remèdes Magiques | Reparo | Boutique, coffre ≥ étage 3 |
| `book_monsters` | Livre des Monstres | Diffindo | Coffre ≥ étage 3 (quête Lockhart) |
| `livre_prince` | Manuel du Demi-Sang | Sectumsempra | Coffre ≥ étage 6 (rare) |

Les livres apparaissent avec l'étiquette 📖 violette dans l'inventaire.

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

### Level-up (battle.js — checkLevelUp)
Au level-up, on incrémente `c._baseAtk / _baseDef / _baseMag` (pas `c.atk` directement),
puis on appelle `recalculateStats()` pour reconstruire les stats effectives avec l'équipement.

#### Table de progression des sorts par niveau
| Niveau | Harry apprend | Hermione apprend |
|--------|--------------|-----------------|
| 2 | — | Expelliarmus |
| 3 | Accio | Stupefix |
| 4 | Wingardium Leviosa | — |
| 5 | Reparo | Diffindo |
| 7 | Diffindo | Wingardium Leviosa + Reparo |
| 9 | Avada... (déverrouillé) | Avada... (déverrouillé) |

`Avada...` est `locked:true` dans SPELLS jusqu'au niveau 9, où le flag est muté en `false` et le sort ajouté aux deux personnages.

#### 3 vecteurs d'apprentissage de sorts
1. **Level-up** : table ci-dessus, automatique
2. **Livres de sorts** (`type:"spellbook"`) : cliquer dans l'inventaire → enseigne à tout le groupe actif
3. **Équipement** (`grantsSpell`) : enseigne le sort de façon permanente à l'équipement (ex: Amulette → Reparo)

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

## Système de quêtes secondaires (quests.js)

### Variable globale (state.js)
```js
let activeQuests = [ { id, title, giver, desc, objective, progress, reward, completed, location }, … ]
```

### Structure d'une quête
```js
{
  id:        "quest_id",          // identifiant unique
  title:     "Titre",
  giver:     "Nom du PNJ",
  desc:      "Description",
  objective: {
    type:      "item" | "kill",
    itemId:    "mandragore",      // si type === "item"
    monsterId: "troll",           // si type === "kill"
    amount:    3
  },
  progress:  0,                   // compteur kills (les items sont comptés live dans l'inventaire)
  reward:    { xp, gold, item, spell },
  completed: false,
  location:  "Infirmerie (étage 2)"
}
```

### Flux de fonctionnement
```
openQuestLog()          → popule #char-detail (réutilise character-modal)
renderQuestList()       → affiche barre de progression, bouton "Remettre" si objectif rempli
checkQuestCompletion(i) → vérifie inventaire (item) ou q.progress (kill), consomme les items
completeQuest(i)        → distribue récompenses, joue levelUp sound, appelle checkLevelUp()

// Côté battle.js — dans endBattle(won) :
enemyGroup.forEach(e => { if (window.checkKillQuests) window.checkKillQuests(e.id); });

// Dans quests.js :
window.checkKillQuests(monsterId) → incrémente q.progress, auto-complète (délai 600ms)
```

### Quêtes actives (4 au démarrage)
| ID | Donneur | Objectif | Récompenses |
|----|---------|----------|-------------|
| `mandragore_pomfresh` | Madame Pomfresh | 3× Mandragore | +80 XP, +40🪙, Potion Magique, sort Episkey |
| `livre_interdit` | Gilderoy Lockhart | 1× book_monsters | +120 XP, +25🪙, Baguette de Saule |
| `troll_toilettes` | Mimi Geignarde | Tuer 1 troll | +150 XP, +60🪙, Robe Renforcée |
| `chouette_perdue` | Hagrid | Tuer 1 chouette_envoutee | +90 XP, +30🪙, Balai Nimbus |

> Pour ajouter des quêtes : pousser un objet dans `activeQuests` dans `state.js`.
> `book_monsters` n'existe pas encore dans ITEMS — à ajouter si cette quête doit être completable.

---

## Boutique (shop.js)

### Catalogue progressif
Les articles se débloquent selon l'étage actuel (`currentFloor`) :

| Étage | Items |
|-------|-------|
| 1 | `potion_s`, `mandragore`, `wand1` |
| 2 | `potion_m`, `robe1`, `livre_sortileges` |
| 3 | `felix`, `amulette` |
| 4 | `broom`, `livre_soin` |
| 6 | `wand2` |

### Fonctionnement
```js
openShop()
  ├─ Filtre SHOP_CATALOG par minFloor <= currentFloor
  ├─ Garde-fou : si catalogue vide → fallback étage 1
  ├─ Affiche grille flex avec items disponibles
  └─ onclick → buyItem(item)

buyItem(item)
  ├─ Vérifie : gold >= price && inventory.length < 16
  ├─ Déduit gold, ajoute item copié à l'inventaire
  └─ Rafraîchit l'affichage (openShop())
```

### Garde-fous (fix shop blank)
- Logs console : `currentFloor`, `player.gold`, `ITEMS.length`, `CATALOG.length`
- Force `grid.style.cssText` en flex si CSS parent casse la grille
- Fallback catalogue étage 1 si filtré vide
- `currentFloor` undefined/NaN → traité comme étage 1

---

## Système audio (audio.js)

```js
const AudioSystem = {
  ctx, musicGain, sfxGain,
  isMuted, musicPlaying, voiceEnabled, _cachedVoice,

  init()                  // appeler depuis startGame() (geste utilisateur requis)
  playAmbientMusic()      // boucle pentatonique + bourrasques de vent
  playFootstep()          // bruit de pas (noise + HPF)
  playSpellCast(name)     // fréquence par sort + étincelle
  playHit()               // bruit d'impact physique
  playChestOpen()         // arpège ascendant
  playLevelUp()           // gamme 5 notes
  playVictory()           // accord majeur
  playDeath()             // descente chromatique
  speakSpell(name)        // SpeechSynthesis, voix en-GB préférée
  toggleMute()            // bouton #btn-music  ♪/🔇
  toggleVoice()           // bouton #btn-voice  🗣️/🔕
}
```

Sons déclenchés automatiquement :
- `playFootstep()` → après chaque mouvement (`movement.js`)
- `playChestOpen()` → ouverture de coffre (`movement.js`)
- `playHit()` → attaque physique (`battle.js — executeAttack`)
- `playSpellCast()` + `speakSpell()` → lancement de sort (`battle.js — castSpellInBattle`)
- `playVictory()` → victoire (`battle.js — endBattle`)
- `playLevelUp()` → level-up et quête complétée (`battle.js`, `quests.js`)
- `playDeath()` → mort du groupe (`battle.js — triggerDeath`)

---

## Bestiaire (ui.js)

- `seenMonsters` (Set, dans `state.js`) — IDs des monstres rencontrés au combat.
  Alimenté dans `startBattle()`, persisté dans le localStorage.
- `openBestiary()` → ouvre `#bestiary-modal` (modal dédié, distinct de `#character-modal`)
- `filterBestiary()` → filtre par nom, catégorie, étage ; tri vus-en-premier
- `showMonsterDetail(monster)` → fiche complète avec danger (1-11, coloré), lore, habitat, anecdote, stats, abilities, drops

### Champs enrichis des monstres (optionnels)
```js
lore:      "Texte de lore court (affiché dans la liste)"
habitat:   "Lieu de vie (affiché dans l'encart lore-box)"
anecdote:  "Anecdote canon HP (affiché dans l'encart lore-box)"
danger:    7   // 1-11, code couleur : vert(1-3) → jaune(4-5) → orange(6-7) → rouge(8-11)
```

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
| `lore` | string | Texte court affiché dans le bestiaire |
| `habitat` | string? | Lieu de vie (optionnel, bestiaire) |
| `anecdote` | string? | Anecdote canon (optionnel, bestiaire) |
| `danger` | number? | Niveau de danger 1–11 (optionnel, bestiaire) |
| `minFloor` | number | Étage minimum d'apparition |
| `maxFloor` | number\|null | Étage maximum (`null` = sans limite) |
| `weight` | number | Fréquence de tirage (10=commun, 5=rare, 2=très rare) |
| `hp/atk/def/mag/agi/lck` | number | Stats de base (avant scaling) |
| `scale` | number | Coefficient de progression par étage (0.15 lent → 0.40 rapide) |
| `abilities` | array | Capacités spéciales |
| `ai` | string | `"aggressive"` `"cautious"` `"random"` |
| `resist` | string[] | Sorts atténués de 50% |
| `weak` | string[] | Sorts amplifiés de 50% |
| `xp` | number | XP de base |
| `gold` | number\|{min,max} | Or de base (scalé automatiquement) |
| `drops` | [{itemId, chance}] | Drops potentiels après victoire |

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

### Modales
| ID | Rôle |
|----|------|
| `inventory-modal` | Sac / inventaire |
| `spell-modal` | Liste des sorts |
| `shop-modal` | Boutique |
| `character-modal` | Fiche perso **ET** journal des quêtes (partagent `#char-detail`) |
| `bestiary-modal` | Bestiaire (modal dédié séparé) |
| `levelup-modal` | Notification de montée de niveau |
| `death-screen` | Écran de mort |

> ⚠️ `#char-detail` est le conteneur partagé par `openCharacter()` et `openQuestLog()`.
> Ces deux fonctions peuplent `#char-detail` puis affichent `#character-modal`.
> Ne jamais faire `character-modal.innerHTML = …` : cela détruirait `#char-detail`.

### Overlay de combat
| ID                      | Rôle                                    |
|-------------------------|-----------------------------------------|
| `encounter-overlay`     | Conteneur combat (display:flex/none)    |
| `enemy-group`           | Cartes ennemis rendues par JS           |
| `battle-char-indicator` | Tour actif — masqué en mode solo        |
| `battle-log`            | Texte du dernier événement              |
| `target-selection`      | Zone sélection cible (display:none/flex)|
| `target-buttons`        | Boutons générés dynamiquement           |

### Barre de commandes (boutons d'action)
| Bouton | Fonction |
|--------|----------|
| 🎒 Sac | `openInventory()` |
| 📖 Sorts | `openSpells()` |
| 📜 Fiche | `openCharacter()` |
| 📕 Bestiaire | `openBestiary()` |
| 📜 Quêtes | `openQuestLog()` |
| 🔍 Fouiller | `searchRoom()` |
| 💤 Repos | `rest()` |
| ♪ / 🔇 | `AudioSystem.toggleMute()` |
| 🗣️ / 🔕 | `AudioSystem.toggleVoice()` |
| 💾 Sauver | `saveGame()` |
| 📂 Charger | `loadGame()` |

---

## Responsive mobile (≤ 700px)

- Layout devient une colonne unique : header → left (bandeau HP) → main → footer
- Panneau droit masqué
- D-pad tactile (`.mobile-dir`) remplace les boutons WASD (`.desktop-dir`)
- Boutons action en grille avec emoji uniquement (`.btn-label` masqué)
- Touch targets minimum 44px
- Modales en 96vw scrollable
- Utilise `100dvh` pour éviter les problèmes de barre URL mobile

---

## Rendu 3D (renderer.js)

Canvas 2D, pseudo-raycasting directionnel (pas de DDA).

### Architecture du rendu
- Profondeur : 5 niveaux (`DEPTH = 5`)
- Algorithme : painter's algorithm (loin → proche)
- `wallDist` : distance du premier mur — tout ce qui est au-delà n'est pas rendu

### Système de textures
```js
TEXTURES = {
  walls:   { stone1, stone2, wood, tapestry },    // murs
  floor:   { stone, carpet },                      // sol
  ceiling: { stone, beams }                        // plafond
}
```

**Cache des patterns** (`_TEX_PATTERNS`) :
- Les `createPattern()` sont créés une fois et réutilisés chaque frame
- `_ensurePatterns()` : construit les patterns dès que les images sont `complete`
- `_invalidatePatternCache()` : vidé après `resizeCanvas()` (nouveau contexte)

**Fonctions clés** :
- `getWallTextureType()` : choisit la texture murale selon `currentFloor`
- `_getFloorPattern()` / `_getCeilPattern()` : retournent le pattern depuis le cache
- `drawTexturedRect()` : draw rect avec texture + alpha (fallback si texture manquante)

### Rendu par couche de profondeur
Pour chaque `d` de `wallDist` à `1` :

| Élément | Technique |
|---------|-----------|
| Mur du fond (`d === wallDist`) | Baseline couleur + `stone-blocks` + texture `repeat` + fog overlay |
| Sol (trapèze) | Baseline + texture `repeat` + fog |
| Plafond (trapèze) | Baseline + texture `repeat` + fog |
| Murs latéraux | Baseline + `stone-blocks` + texture `repeat` + fog |

**Fog de distance** : overlay `rgba(6,4,2, alpha)` où `alpha` croît avec la profondeur

### Constantes
- Couleurs de pierre chaudes : `#8a6840` → `#181008` (proche → loin)
- `SHRINK = 0.58` : facteur de rétrécissement par niveau
- `EDGE_A = [0.92, 0.60, 0.32, 0.14, 0.06]` : opacité arêtes dorées

### Fonctions utilitaires
- `drawFloorLines()` : lignes de convergence vers le point de fuite
- `drawStoneBlocks()` : joints de maçonnerie sur les murs frontaux
- `addTorchGlow()` : halo atmosphérique chaud
- `drawForegroundFrame()` : bordure dorée décorative au premier plan
- `drawCellMarker()` : marqueur de cellule spéciale (escalier, boutique, coffre...)

---

## Sauvegarde

Clé LocalStorage : `hogwarts_rpg_save`

```js
// Contenu sauvegardé
{
  party: [player, player2],
  partySize,
  currentFloor, playerX, playerY, playerDir,
  dungeon, visited, enemyMap, itemMap,
  seenMonsters: Array.from(seenMonsters),   // Set → Array pour JSON
  audioMuted:   AudioSystem.isMuted,
  voiceEnabled: AudioSystem.voiceEnabled,
  activeQuests                              // tableau complet avec progress et completed
}

// Chargement — IMPORTANT : Object.assign pour préserver les références
Object.assign(player,  gs.party[0]);
Object.assign(player2, gs.party[1]);
party[0] = player;
party[1] = player2;
if (gs.partySize)     partySize    = gs.partySize;
if (gs.seenMonsters) seenMonsters  = new Set(gs.seenMonsters);
if (gs.activeQuests) activeQuests  = gs.activeQuests;
recalculateStats();   // reconstruire atk/def/mag/lck depuis _base* + équipement
```

Ne jamais faire `player = gs.party[0]` : cela casserait la référence `party[0] === player`.

---

## Déploiement

- Dépôt : https://github.com/Kenhuri69/hogwarth
- URL publique : https://kenhuri69.github.io/hogwarth/
- Pipeline : `.github/workflows/deploy.yml` — déclenché à chaque push sur `master`
- Prérequis côté GitHub : Settings → Pages → Source = **GitHub Actions**

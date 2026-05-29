@.claude/guidelines.md

# Poudlard & Magie — Mémoire Projet

RPG en tour par tour inspiré de *Might & Magic Book One*, univers Harry Potter.
Vanilla JS / HTML5 Canvas, zéro dépendance, zéro build step.

> 🏁 **Plan visuel finalisé (mai 2026)** : refonte SVG/PNG complète.
> 31 monstres + 4 blasons + 2 scènes grand format livrés, plus 14 monstres
> récents en PNG via Nano Banana (Bloc B pivoté).
> Archive du plan : [`.claude/plans/_archive/SVG_PLAN.md`](./.claude/plans/_archive/SVG_PLAN.md).
> Plan clos le 2026-05-21 : re-gens optionnels C32-C37 abandonnés (PNG
> actuels conservés), aucune lacune raster fonctionnelle restante.

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
  scene-icons.js   →  SCENE_ICONS{} — SVG inline pour objets de scène (coffre,
                      boutique, escaliers, fontaine) consommés par _showExploreOverlay()
  monsters.js      →  ⭐ FICHIER ENRICHISSABLE : registre complet des créatures (MONSTERS[])
  npcs.js          →  NPCS[] (502 lignes) — registre des PNJ (donneurs de quêtes,
                      vendeurs, PNJ lore). getNpcById(), getNpcsForFloor(),
                      getRandomVendorsForFloor(), getRandomLoreForFloor(),
                      getRandomEncountersForFloor()
  riddles.js       →  RIDDLES[] — registre des devinettes des stèles
                      d'énigme du donjon. getRiddleById()
  data.js          →  Constantes : MAP_W/H, CELL, CHARACTERS, ITEMS, SPELLS, LOCATIONS
                      ENEMIES = MONSTERS (alias de compatibilité)
  floor-themes.js  →  FLOOR_THEMES{} + getFloorTheme() — source unique de
                      vérité tileset/ambiance par tranche d'étages (pur)
  item-icons.js    →  Registres ITEM_ICON_REGISTRY, EQUIPMENT_SLOT_ICONS,
                      STATUS_ICON_REGISTRY, SPELL_ICON_REGISTRY ;
                      getItemIconHtml(item, size), tinted variants via filter CSS
  state.js         →  Variables globales mutables (player, player2, party, partySize,
                      dungeon, combat, seenMonsters, activeQuests, usedFountains,
                      searchedCells, floorDungeons, restCooldown,
                      chosenHouse, housePoints, houseTier, HOUSE_BONUSES, DIFFICULTY_SETTINGS)
  ui.js            →  updateUI(), openCharacter(), addMsg(), closeModal(), changeDifficulty()
  ui-bestiary.js   →  openBestiary(), filterBestiary(), showMonsterDetail(), showBestiaryList()
  dungeon-scaling.js → weightedPick(), effectiveFloor(), endgameTierIndex(),
                      scaleMonster(), buildEcho() — mise à l'échelle des
                      monstres (purs). Chargé AVANT dungeon.js
  dungeon.js       →  generateDungeon() + helpers de génération procédurale
                      (salles, couloirs, cellules spéciales, puzzles, PNJ)
  dungeon-spawning.js → spawnQuestMonsters(), spawnFarmingMonsters(),
                      _ensureActiveKillQuestTargets(), _ensureStairsExist(),
                      _migrateMissingNpcsForFloor(), _findFreeNpcCell() —
                      spawn de quête & garde-fous. Chargé APRÈS dungeon.js
  renderer.js      →  drawDungeon(), drawCorridor() — rendu 3D canvas + textures + fog
  renderer-effects.js → drawTorch(), drawStoneBlocks(), drawFloorLines(), drawCellMarker()…
  renderer-minimap.js → renderMinimap(), _buildMinimapCells()
  movement.js      →  moveForward(), moveBackward(), turnLeft(), turnRight(),
                      move() (legacy absolu), handleCellEntry(), overlay
                      d'exploration (_showExploreOverlay)
  movement-floors.js → cache d'étage (_saveFloorToCache/_restoreFloorFromCache),
                      respawn, _changeFloor(), goDeeper(), goUp() + transitions
                      de tranche. Chargé APRÈS movement.js
  movement-interactions.js → openChest(), searchRoom(), pièges, runes/stèle
                      (answerSteleRiddle), useAltar(), useFountain(), rest().
                      Chargé APRÈS movement.js
  swipe-canvas.js  →  Gestes tactiles sur #dungeon-canvas (mobile) :
                      swipe vertical → avancer/reculer, swipe horizontal →
                      tourner. initCanvasSwipeGestures(),
                      _dispatchCanvasSwipe(dx,dy), _isCanvasSwipeBlocked().
                      Le D-pad tactile reste affiché en fallback.
  battle.js        →  startBattle(), battleAction(), enemyTurn(), doFlee() +
                      système de statuts (applyStatus, tickStatuses) + boucle de combat
  battle-rewards.js →  endBattle(), checkLevelUp(), _grantLevel*, closeLevelup().
                      Chargé APRÈS battle.js
  battle-death.js  →  triggerDeath(), resurrect(), _finishAstralCombat() (combat
                      astral Mondes Parallèles). Chargé APRÈS battle.js
  battle-spells.js →  castSpellInBattle(), tryEnemyAbility()
  battle-ui.js     →  renderEnemyGroup(), showTargetSelection(), updateBattleCharIndicator()
  inventory-core.js → tryAddItem(), _countMaterial/_consumeMaterial,
                      recalculateStats() (stats effectives). Chargé AVANT
                      inventory.js ; recalculateStats() consommé par ~13 modules
  inventory.js     →  UI sac/onglets, équipement (showEquipMenu, equipItem,
                      unequipFromSlot), usage d'objets (useItem, consommables,
                      learnSpellbook)
  inventory-spells.js → openSpells(), openBattleSpells(), openBattleItems(),
                      SPELL_OOC_HANDLERS, castSpellOutOfCombat(). Chargé APRÈS
                      inventory.js
  quests-templates.js → QUEST_TEMPLATES (catalogue inerte) + maps de quêtes
                      de Maison. Données pures. Chargé AVANT quests.js
  quests.js        →  Logique + journal UI : acceptQuest(), completeQuest(),
                      openQuestLog(), renderQuestList(), checkKillQuests(),
                      farming, getQuestTemplate()
  quests-riddles.js → Mini-jeux : fusion du grimoire (Manon) + énigmes de
                      Dumbledore (openRiddleModal, _spawnLuxAeternaBoss).
                      Chargé APRÈS quests.js
  shop.js          →  openShop(), buyItem() — catalogue progressif selon étage + garde-fous
  save-slots.js    →  Modèle multi-slots (store localStorage) : _readStore/
                      _writeStore, listSaveSlots, readSlot, writeSlot,
                      deleteSlot, deleteIronmanSlots, exportSaveStore/
                      importSaveStore, autoSave(reason), migrateLegacyKey.
                      Chargé AVANT save.js. LocalStorage : hogwarts_rpg_saves
                      (multi-slots) + hogwarts_rpg_save (legacy migré once).
  save.js          →  Sérialisation/application d'état (purs) :
                      _serializeState/_applyState + migrations de save,
                      saveGame/loadGame (façades legacy).
  save-visit-snapshot.js → Snapshots de visite inter-mondes (Mondes
                      Parallèles) : _takeVisitSnapshot/_restoreFromVisit,
                      mpBuildVisitSnapshot/mpApplyVisitSnapshot/
                      mpApplyVisitFloorUpdate. Chargé APRÈS save.js.
  save-ui.js       →  Modale #slot-modal (openSaveDialog/openLoadDialog) +
                      Hub démarrage (enterStartHub, startHubNewGame,
                      loadSlotAndStart).
  ironman.js       →  Mode Ironman : BOSS_FEATS, DIFFICULTY_SCORE_MULT,
                      recordIronmanKills(), computeIronmanScore(),
                      buildIronmanResult(), showIronmanResult()
  hall-of-fame.js  →  Hall of Fame : HOF_CONFIG (Supabase), submitIronmanScore(),
                      openHallOfFame()/closeHallOfFame(), repli localStorage
  npc-dialog.js    →  Dialogues PNJ : openNpcDialog(), nextDialogPage(),
                      closeNpcDialog(), triggerNpcSpecialAction(),
                      getNpcQuestState(), getNpcMarkerSign()
  intro.js         →  Écran d'intro Dumbledore : showIntroScreen(onContinue),
                      _renderIntroPage(), _advanceIntro(), _finishIntro()
  ux-improvements.js → window.UX = { showTooltip, hideTooltip, logCombat,
                      logCombatTurn, clearCombatLog, renderTimeline, floatDmg }
                      — surcouche UX combat (tooltips, log enrichi, dégâts
                      flottants, timeline d'initiative)
  main.js          →  showPlayerSelect(), startGame(count), keyboard listeners,
                      _hydrateCharacter(), checkHouseLevelUp()
  loader.js        →  Chargé EN DERNIER. Vérifie ~55 globals attendus
                      (typeof entry.name), affiche bandeau rouge si critique
                      manquant. Exporte window.safeEl(id) + window.safeCall(fn,...args).
                      window.__loaderReport publié pour smoke test.
.github/workflows/deploy.yml   →  CI GitHub Pages (push master → déploiement automatique)
```

Ordre de chargement des scripts dans `index.html` (33 modules) :
`ux-improvements → audio → audio-music → audio-sfx → icons → scene-icons →
monsters → npcs → riddles → data → floor-themes → item-icons → state → ui →
ui-bestiary → dungeon →
textures → renderer → renderer-effects → renderer-minimap → movement →
battle → battle-spells → battle-ui → inventory → quests → npc-dialog →
intro → shop → save → save-ui → ironman → hall-of-fame → main → loader`

> `loader.js` est volontairement chargé en dernier : il vérifie que tous
> les globals attendus sont présents et affiche un bandeau d'erreur sinon.
> Tout nouveau module exposant une fonction critique doit être ajouté à son
> MANIFEST (voir section « Loader & helpers » ci-dessous).

---

## Architecture globale

- **Pas de modules ES** : tous les fichiers partagent le scope global via `<script>` séquentiels.
- **Pas de bundler** : les fichiers sont servis directement par GitHub Pages.
- Les fonctions d'un fichier peuvent appeler celles de n'importe quel autre fichier chargé avant.

---

## Loader & helpers (`js/loader.js`)

Chargé **en dernier** dans `index.html`, le loader vérifie que tous les modules
attendus se sont exécutés correctement et expose 2 helpers d'accès défensif.

### Manifeste

Le `MANIFEST` dans `loader.js` énumère ~55 entrées `{ name, source, kind,
optional? }` :
- `kind: 'fn'` → `typeof name === 'function'`
- `kind: 'obj'` → `typeof name !== 'undefined'` (couvre `let`/`const`/`var`)
- `optional: true` → log info au lieu d'un bandeau rouge

**Tout nouveau global critique** exporté par un nouveau fichier doit être ajouté
au MANIFEST, sinon une éventuelle régression de chargement passera inaperçue.

Le résultat est publié dans `window.__loaderReport = { ok, totalChecked,
missingCritical, missingOptional }`. Consommable par le smoke test.

> Détail technique : `loader.js` utilise `eval('typeof ' + name)` pour tester
> l'existence d'un identifiant déclaré en `let`/`const` au scope global (non
> exposé sur `window`). C'est volontaire — un identifiant déclaré dans un
> autre `<script>` n'est lisible ici que via le scope déclaratif, pas via
> `window.X`. `typeof` avec un identifiant nu ne throw jamais.

### Helpers exposés

```js
window.safeEl(id)            // document.getElementById avec warn dédupé
window.safeCall(name, ...args) // window[name](...args) si défini, sinon undefined
```

Utiliser ces helpers **dans tout nouveau code** ou lors de refactors ciblés.
Ne pas migrer en masse les ~180 `getElementById` existants sans raison —
risque > bénéfice. Cibles naturelles : fonctions qui touchent ≥ 5 IDs en
cascade (overlays, modales).

---

## Système UX (`js/ux-improvements.js`)

Surcouche d'agrément du combat exposée sur `window.UX`. Tous les call-sites
sont **défensifs** : `if (window.UX) UX.foo(...)` — si le module n'a pas
chargé, le jeu fonctionne sans logs/effets.

| Méthode | Rôle |
|---------|------|
| `UX.floatDmg(targetKey, amount, type)` | Nombre flottant qui monte au-dessus du sprite (`ally`/`enemy-0`/`enemy-1`/`enemy-2`). `type` ∈ `'dmg'`/`'heal'`/`'crit'`/`'miss'`. |
| `UX.logCombat(html, kind)` | Append une ligne dans `#combat-timeline-log`. `kind` ∈ `'good'`/`'bad'`/`'info'`. |
| `UX.logCombatTurn(label)` | Insert un séparateur entre deux tours. |
| `UX.clearCombatLog()` | Vide le log au démarrage du combat. |
| `UX.renderTimeline(party, enemies, currentIdx)` | Redessine la frise d'initiative. |
| `UX.showTooltip(el, html)` / `UX.hideTooltip()` | Tooltip riche au survol (équipement / sort). |

Délégation tooltip attachée sur `DOMContentLoaded`. Cibles : `[data-tooltip]`
ou `[data-item-id]` dans les modales.

---

## Système PNJ (`js/npcs.js` + `js/npc-dialog.js`)

### Modèle de PNJ (`NPCS[]` dans `npcs.js`)

```js
{
  id, name, role, portrait,            // identification
  floor, location,                     // placement déterministe
  marker:    'quest'|'vendor'|'lore',  // type d'icône sur minimap
  dialogues: { greeting:[…], questIntro:[…], questDone:[…], farewell:[…] },
  questId:   'mandragore_pomfresh',    // si donneur de quête
  specialAction: { id, label, oneShot? } // action spéciale (Fumseck, Portrait Dumbledore…)
}
```

`getNpcsForFloor(floor)` retourne tous les PNJ d'un étage (déterministes +
aléatoires fusionnés). Les PNJ aléatoires (`getRandomVendorsForFloor`,
`getRandomLoreForFloor`, `getRandomEncountersForFloor`) sont seedés par
étage pour la reproductibilité d'une partie.

### Dialogues (`npc-dialog.js`)

```
openNpcDialog(npcId)  → ouvre #npc-dialog, calcule l'état narratif
  ├─ getNpcQuestState(npc)        // 'none'|'available'|'inProgress'|'completable'|'done'
  ├─ _npcDialogPages(npc, state)  // tableau de pages selon l'état
  └─ _npcDialogActions(npc, state)// boutons d'action (Accepter / Remettre / Action spéciale)

nextDialogPage()  → page suivante ou ferme si dernière
closeNpcDialog() → vide _dialogState + cache la modale

triggerNpcSpecialAction(npcId)
  └─ Actions spéciales hardcodées : `dumbledore_blessing`, `fumseck_tears`,
     `mcgonagall_lesson`, etc. Chacune produit un effet (heal, sort appris,
     XP, équipement). `oneShot` → state stocké via `_isSpecialActionSpent`.
```

### Intégration quêtes

Le flux `accepter une quête / remettre l'objectif` passe désormais par les
PNJ : `getNpcMarkerSign(npcId)` détermine le pictogramme minimap (❗ disponible,
❓ en cours, ✓ remettable), et les actions du dialogue déclenchent
`acceptQuest()` / `completeQuest()` de `quests.js`.

### Sprite PNJ en vue pseudo-3D (`drawNpcSprite` dans `renderer-effects.js`)

Quand le joueur fait face à une case `CELL.NPC` (scan dans `renderer.js`,
même mécanique que CHEST/STAIRS/SHOP), `drawNpcSprite(npcId, x, baseY, sz)`
rend :

1. Ombre au sol (ellipse écrasée).
2. Aura chaude pulsée (driven par `_npcAnimPhase` rafraîchi 5 FPS via
   `startNpcAnimLoop` — boucle déclenchée par `startGame` + chargement
   de save quand `npcPlacements.size > 0`).
3. Sprite PNG par type de PNJ — `getNpcSpriteType(npcId)` (npcs.js)
   résout le champ `sprite` (`mage`/`prof_h`/`prof_f`/`fantome`/`vendeur`/`phenix`)
   puis `NPC_SPRITE_SRC` (renderer-effects.js) mappe le type → PNG.
   Tant que les PNG dédiés ne sont pas générés, toutes les entrées
   pointent sur `img/npc/_wizard_generic.png`. Fallback vectoriel
   `_drawNpcVectorFallback` tant que l'image n'a pas chargé.
4. Signe ❗/❓ animé (bobbing vertical) au-dessus, basé sur
   `getNpcMarkerSign(npcId)`.

L'image est paresseuse : `_getNpcSprite()` la charge à la première
demande puis cache l'`HTMLImageElement` (cohérent avec
`_getMonsterImg`). Sur file:// (smoke), le PNG charge nativement.

### Écran d'intro (`intro.js`)

`showIntroScreen(onContinue)` lit `NPCS[id=dumbledore].dialogues.greeting`
(tableau de pages) et les affiche une à une. Voix narrative chargée en
parallèle via `AudioSystem.playVoice('dumbledore_intro_page_<n>')` (samples
OGG dans `audio/voice/`). `onContinue` appelé après la dernière page →
bascule sur l'écran de choix de Maison.

---

## Système des Maisons (`js/state.js` — `HOUSE_BONUSES`)

Choix au démarrage (après l'intro Dumbledore). Stockage : `chosenHouse`
(string), `housePoints` (int), `houseTier` (0-4).

### Gain de points

Chaque ennemi vaincu rapporte des points selon la difficulté
(`battle.js — endBattle`) :

| Difficulté | Points / kill |
|------------|---------------|
| Facile     | 8             |
| Normal     | 10            |
| Difficile  | 14            |
| Expert     | 18            |

Les 4 Maisons partagent la même grille de **paliers** (100 / 300 / 600 / 1000
points), chacune avec un bonus différent.

### Bonus par palier (extrait `HOUSE_BONUSES`)

| Maison      | Palier 100   | Palier 300        | Palier 600   | Palier 1000 (item)     |
|-------------|--------------|-------------------|--------------|-------------------------|
| Gryffondor  | +1 ATK       | +1 ATK +1 LCK     | +2 ATK       | `sword_gryff` (légendaire) |
| Serpentard  | +1 MAG       | +1 MAG +1 LCK     | +2 MAG       | `locket_slytherin`      |
| Serdaigle   | +1 MAG       | +1 MAG +1 LCK     | +2 MAG       | `diademe_serdaigle`     |
| Poufsouffle | +1 DEF       | +1 DEF +1 LCK     | +2 DEF       | `coupe_poufsouffle`     |

Les bonus de stats sont appliqués en `_baseX` (croissent au level-up via
`recalculateStats()`). Les items légendaires sont poussés directement
dans `player.inventory`.

### Cycle

```
endBattle() / completeQuest()
  └─ housePoints += gain
     └─ checkHouseLevelUp() (main.js:173)
        ├─ détecte le passage d'un palier
        ├─ applique le bonus (stat ou item)
        └─ affiche #levelup-modal avec le message custom
```

`#house-crest` dans le HUD est rafraîchi par `_updateHouseBadge()` (ui.js:60)
à chaque update. Le blason est un `<img>` cloné depuis l'écran de sélection.

### Paliers endgame V3 — Mythe (17) & Apothéose (18)

Au-delà des 16 paliers de base, deux paliers endgame réservés à la
Boucle Ténébreuse (`tier.requiresDarkTier`, gate symétrique de
`victoryAchieved` dans `checkHouseLevelUp`) :

- **Tier 17 « Mythe »** (`requiresDarkTier:1`, étages 11+) : enseigne un
  sort exclusif par Maison + ouvre la quête de don (gold-sink).
- **Tier 18 « Apothéose »** (`requiresDarkTier:2`, étages 21+) : éveille
  un **passif légendaire** propre à la Maison. `houseApotheosePassive()`
  (`main.js`) retourne la Maison active quand `houseTier >= 18`, sinon
  `null` — aucun flag dédié, `houseTier` est la source de vérité.

| Maison | Passif Apothéose | Hook |
|--------|------------------|------|
| Gryffondor  | +10 % crit (phys.+sort) +15 % dégâts crit. + Élan (crit → +8 % dégâts, cumul ×5) | `recalculateStats()` (inventory.js) + `_houseElanMult`/`_updateElan` (battle.js) |
| Serpentard  | 15 % spell-lifesteal    | `_applySerpentLifesteal` (battle-spells.js) |
| Serdaigle   | −20 % coût des sorts    | `_spellSpCost` (battle-spells.js) |
| Poufsouffle | +2 PV/PM par pas + Vigueur (+23 % dégâts >60 % PV) | `_step` (movement.js) + `_houseVigorMult` (battle.js) |

### Tier 19+ — Série Apothéose ★ N (gold-sink illimité)

Une fois Apothéose franchi, `houseTier` continue d'incrémenter au-delà de
18 : chaque ★ N correspond à `houseTier = 18 + N`. La série est
**génératrice infinie** (pas d'entrée dans `tiers[]`), pilotée par
`HOUSE_BONUSES[h].starGenerator` et la boucle finale de
`checkHouseLevelUp()` (main.js). Gate `requiresDarkTier: 2` (étages 21+).

**Seuil** (formule polynomiale douce, helpers purs `_starGeneratorBonus`
et `_starGeneratorMsg` dans `state.js`) :
`threshold(★ N) = 45 000 + 15 000 × N + 1 000 × N²`
→ ★ 1 = 61k pts, ★ 5 = 145k, ★ 10 = 295k, ★ 20 = 745k.

**Bonus par cadence** :
- Chaque ★ : +1 stat principale Maison (ATK / MAG / MAG / DEF).
- Tous les 2 ★ : +1 stat secondaire (STR / INT / INT / END).
- Tous les 5 ★ : +1 LCK.
- Tous les 10 ★ : +5 PV max (Gryff / Pouf) ou +5 PM max (Slyth / Serd).

**Source d'or → points** : voir « Don à la Maison » ci-dessous.

### Don à la Maison (`js/house-donation.js`, gold-sink endgame)

Dès `houseTier >= 17`, le bouton « 💰 Faire un don » apparaît dans le
dialogue du Chef de Maison (`headOfHouse` correspondant à `chosenHouse`).
La modale `#house-donation-modal` permet de verser de l'or au taux
**5 G = 1 point de Maison**. Les points franchissent les tiers 18
(Apothéose) puis 19+ (série Apothéose ★ N) via la même mécanique
`checkHouseLevelUp()`.

Surface publique : `donateGoldToHouse(amount)`,
`openHouseDonationModal()`, `closeHouseDonationModal()`,
`confirmHouseDonation()`.

État : `donationIntroPlayed` (booléen, sérialisé) — joue le sample voix
`<chef>_donation_intro` à la 1ʳᵉ ouverture, puis `<chef>_donation_offer`
ensuite. Voix par chef : `HOUSE_BONUSES[h].headOfHouseVoiceKey`
(`mcgonagall` / `rogue` / `flitwick` / `sprout`). 32 samples au total
(8 par chef : intro / offer / small / large / refuse + apotheose_star /
apotheose_star_first / apotheose_star_milestone).

---

## Mode Ironman & Hall of Fame (`js/ironman.js` + `js/hall-of-fame.js`)

Mode optionnel coché à l'écran de difficulté (case `#ironman-toggle`).
Cumulable avec n'importe quelle difficulté ; la difficulté est ensuite
**verrouillée** (`changeDifficulty()` refuse si `ironmanMode`).

### Globals (`state.js`)
```js
let ironmanMode    = false;        // armé en confirmHeroSelection, persisté
let totalKills     = 0;            // monstres vaincus (cumul partie)
let defeatedBosses = new Set();    // ids de boss vaincus (faits d'armes)
let ironmanRunId   = null;         // UID unique du run (anti double-classement)
```
Réinitialisés dans `startGame()`, sérialisés dans `_serializeState`/`_applyState`.
`ironmanRunId` est généré par `_genRunId()` au démarrage d'un run Ironman ;
un save Ironman dépourvu d'UID en reçoit un à `_applyState`.

### Mort & score — permadeath stricte
En mode Ironman, `triggerDeath()` n'affiche pas la pétrification mais
`showIronmanResult()` : écran `#ironman-result-screen` avec score chiffré.
La mort est **définitive** — `deleteIronmanSlots()` (save.js) supprime TOUS
les slots dont `state.ironmanMode` est vrai (auto + manuels). Aucun reload.

```
score = round(base × DIFFICULTY_SCORE_MULT × PARTYSIZE_SCORE_MULT)
base  = killsCrédités×10 + étageMax×150 + quêtes×150
      + niveau×50 + or×0.5 + Σ faits d'armes
killsCrédités = min(totalKills, étageMax×12)   ← plafond anti-farm
DIFFICULTY_SCORE_MULT = { Facile:0.8, Normal:1.0, Difficile:1.4, Expert:1.8 }
PARTYSIZE_SCORE_MULT  = { Solo:1.3, Duo:1.0 }
```
`recordIronmanKills(enemies)` (appelé par `endBattle`) incrémente
`totalKills` et ajoute les boss de `BOSS_FEATS` à `defeatedBosses`.

**Équité du classement** : le solo (un seul tour d'action, pas de
soigneuse) reçoit un bonus ×1.3 vs duo. Les points de kills sont
plafonnés à `étageMax×12` — poncer un étage (respawn) ne gonfle plus
le score ; seule la progression réelle (descendre) le fait monter.

### Hall of Fame
`openHallOfFame()` (bouton du hub démarrage + écran de résultat) affiche
`#hall-of-fame-screen` — top 10. Stockage via `HOF_CONFIG` (REST Supabase :
`select`/`insert` sous Row Level Security ; index unique sur `run_id`).
Repli `localStorage` (`hogwarts_rpg_hof`) systématique si non configuré ou
hors-ligne ; un score soumis est **toujours** écrit en local.

- **Pseudonyme** : `getPlayerName()`/`setPlayerName()` persistent le nom du
  joueur (`localStorage` `hogwarts_rpg_player_name`). L'écran de résultat
  pré-remplit et confirme ce nom avant la soumission.
- **Anti double-classement** : chaque score porte `run_id = ironmanRunId`.
  `verifyIronmanRunNotScored()` (mort) et `_hofPrecheckRunOnLoad()`
  (chargement) vérifient via `_hofFindByRunId()` qu'aucun score n'existe
  déjà pour l'UID ; l'index unique côté base bloque tout doublon (409).
- **Badges d'affichage** : chaque ligne du classement porte le blason
  de Maison du joueur (`<img src="img/houses/<house>.png">` rond, style
  ingame du `#crest-wrap`) + deux chips `🗺️ Ét.X` / `📈 Niv.Y`. Champ
  `house` ajouté au payload Supabase — **migration requise** :
  `ALTER TABLE leaderboard ADD COLUMN house TEXT;`. Les anciennes
  entrées (sans Maison) affichent un placeholder pointillé neutre.

### Icônes
`tools/gen_ironman_icons.py` génère les PNG dorés 64×64 dans `img/icons/` :
`ironman.png` (crâne), `trophy.png` (coupe), `medal_{gold,silver,bronze}.png`.

---

## Choix du nombre de joueurs

Au démarrage, `showPlayerSelect()` affiche un écran de sélection.
- **Solo (1)** : Harry seul — `partySize = 1`, carte Hermione masquée, indicateur de tour masqué.
- **Duo (2)** : Harry + Hermione — comportement complet.

`partySize` est sauvegardé dans le LocalStorage et restauré au chargement.

### Taille des groupes ennemis selon partySize

| Mode  | Étage 1-2       | Étage 3-4       | Étage 5-6       | Étage 7+        |
|-------|-----------------|-----------------|-----------------|-----------------|
| Solo  | 1 seul          | 70% / 30% (1/2) | 50% / 50% (1/2) | 50% / 50% (1/2) |
| Duo   | 65% / 35% (1/2) | 35% / 65% (1/2) | 35% / 65% (1/2) | 20% / 35% / 45% (1/2/3) |

> Les groupes de 3 ennemis en duo sont **différés à l'étage 7+** depuis
> la PR « balance design fixes » (cf. DIFFICULTY_REPORT.md §4). Avant ce
> fix, le mur duo arrivait dès l'étage 5 (79 %) ; il est maintenant à
> l'étage 7 (57 %).

### Difficulté progressive par étage (scaling au grind)

`floorKillCount: Map<floor, kills>` (`state.js`) accumule les kills
cumulés par étage. Chaque tranche de 4 kills incrémente le niveau de
visite `n = floor(kills / 4)`. `battle.js — rollGroupSize` applique
deux bonus cumulatifs au-dessus des probabilités baseline :

| Stade | n | duoBonus (transfert p1→p2) | trioBonus (transfert p2→p3) |
|-------|---|----------------------------|------------------------------|
| Premier passage  | 0   | 0 %    | 0 %  |
| Échauffement     | 1-2 | +10-20 % | 0 % |
| Familier         | 3-4 | +30-40 % | 0 % |
| Maîtrisé         | 5   | +40 % (cap) | +10 % |
| Ponceur          | 6-8 | +40 % | +20-40 % |
| Cap              | 9+  | +40 % | +40 % (cap) |

Effet : plus le joueur ponce un étage (farming respawn 20 %), plus
les combats deviennent denses. Solo passe progressivement de 1 à 2
puis 3 ennemis ; duo progresse de 2 à 3.

Toast narratif au respawn (`movement.js — _announceRespawn`) :
- n ≤ 1 : « Quelques ombres se reforment… »
- n ≤ 3 : « Les ombres se reforment plus nombreuses cette fois… »
- n ≤ 5 : « Tu sens des présences hostiles se rassembler — ta présence dérange. »
- n ≥ 6 : « Le château pulse de menaces. L'étage te défie ouvertement. »

Persisté dans le save (`floorKillCount` sérialisé dans `_serializeState`).

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

### Ajouter un nouveau personnage jouable

Pour ajouter un héros sélectionnable (modèle des 6 entrées actuelles :
Harry, Hermione, Céleste, Iris, Maxence, Anastasia) :

1. **Portrait** — préparer **deux** fichiers PNG 128×128 dans `img/` :
   - `img/<key>-original.png` : crop centré du visuel source, sans décoration.
   - `img/<key>.png` : variante encadrée d'un **médaillon doré**.
     C'est ce fichier qui s'affiche partout dans le jeu.

   **Procédure** : center-crop puis Lanczos vers 128×128 pour la version
   `-original.png`. Pour la version encadrée, NE PAS générer l'anneau de
   zéro — le profil radial est subtil (pic central, gradient à 5 px) et
   échoue facilement à l'œil. La règle est :

   > Transplanter l'anneau d'un médaillon existant de **même genre** :
   > 1. masque rond la photo source au radius 50 (centre 63.5, 63.5),
   > 2. copie pixel-par-pixel tous les pixels à `r ≥ 50` depuis le
   >    médaillon de référence (`celeste.png` ou `iris.png` pour les
   >    héroïnes ; `maxence.png` pour les héros) sur un canevas vide,
   > 3. compose les deux couches : `Image.alpha_composite(photo, ring)`.

   **Variante selon le genre** (à respecter) :
   - **Filles** (Céleste, Iris, Anastasia…) : référence = `celeste.png`
     ou `iris.png`. L'anneau est un **gradient à 5 px de large** avec
     pic blanc-or `#ecd692` au centre (profil radial à r=56→60 :
     `#846314` → `#e2c260` → `#ecd692` → `#cda52d` → `#886514`), avec
     un fin pinstripe or à r=53-54, gap noir à r=55, et fade noir
     externe à r=61+. Gemmes colorées N/S, accents or E/O.
     Pour différencier deux héroïnes, recolorer **uniquement les pixels
     bleus de gemme** par luminance (Céleste = bleu sourd ; Iris = violet ;
     Anastasia = bleu glacé argenté).
   - **Garçons** (Maxence…) : référence = `maxence.png`. Anneau plus
     fin et sobre (gold uni `#f0d782`), pas de gemme colorée.
2. **Données** — ajouter une entrée dans `CHARACTERS` (`js/data.js`)
   avec `name`, `icon`, `class`, `imgSrc:"img/<key>.png"`, `role`, stats
   (hp/sp/str/int/agi/end/lck/mag/atk/def), `wand`, `armor`, `acc`,
   `spells:[…]`, `tagline`. `_hydrateCharacter()` lit ces champs.
3. **Carte de sélection** — ajouter un `<button class="hero-card"
   data-key="<key>" onclick="toggleHero('<key>')">…</button>` dans
   `#hero-grid` de `index.html`, en numérotant `hero-badge` à la suite.
4. **Test** — relancer `node tests/smoke.js` ; aucune assertion n'utilise
   la nouvelle clé directement, donc tous les scénarios doivent rester
   verts sans modification. Si tu touches au flow de sélection, ajouter
   un cas dédié.

Aucun autre câblage n'est requis : combats, sauvegardes, équipement,
quêtes — tout repose sur les références `party[0]/party[1]`/`player`
qui sont hydratées dynamiquement depuis `CHARACTERS[key]`.

---

## Système d'équipement (inventory.js)

Chaque personnage a ses propres slots d'équipement (`c.equipped`), distincts de l'inventaire partagé. Le moteur supporte **11 slots étendus** (refonte Phase 1-4 — voir `.claude/plans/equipment-extended.md`).

### Champs sur chaque personnage (state.js)
```js
equipped: {
  wand:    null,   // baguette / arme
  head:    null,   // chapeau, capuche, diadème, casque
  body:    null,   // robe, armure, pectoral
  hands:   null,   // gants, gantelets, mitaines
  feet:    null,   // bottes, sandales
  cloak:   null,   // cape, manteau, châle
  amulet:  null,   // collier, médaillon, pendentif
  ring1:   null,   // anneau gauche
  ring2:   null,   // anneau droit
  belt:    null,   // ceinture, baudrier
  trinket: null    // bibelot (balai, retourneur de temps)
}
_baseAtk, _baseDef, _baseMag, _baseLck   // stats primaires (croissent au level-up)
_baseStr, _baseInt, _baseAgi, _baseEnd   // stats secondaires (lazy-init au 1er recalc)
```

### Champs d'un item équipable (data.js)
```js
{
  id, name, icon, desc, price,                      // de base
  type:    "wand" | "armor" | "acc" | "spellbook",  // legacy (back-compat)
  slot:    "wand"|"head"|"body"|"hands"|"feet"|     // canonique : destination dans equipped
           "cloak"|"amulet"|"ring"|"belt"|"trinket",
  family:  "robe", "wand_elder", ...                // identifiant de famille (variantes par teinte)
  rarity:  "common"|"rare"|"epic"|"legendary",      // bordure d'inventaire + politique buyback
  tint:    "#a060d0",                                // optionnel : drop-shadow coloré
  bonusAtk, bonusDef, bonusMag, bonusLck,           // bonus stats primaires
  bonusStr, bonusInt, bonusAgi, bonusEnd,           // bonus stats secondaires
  grantsSpell: "Reparo",                            // enseigne un sort à l'équipement
  regenHp:     3,                                   // PV régénérés par round (battle.js — applyEquipmentRegen)
  regenSp:     1,                                   // PM régénérés par round (idem)
  // bonusHpMax/SpMax : reportés hors-scope V1 (cf. plan §1.2)
}
```

### Effets passifs en combat (battle.js — `applyEquipmentRegen()`)
À chaque tour ennemi, après le tick des statuts persistants :
```js
function applyEquipmentRegen() {
  for (const c of party.slice(0, partySize)) {
    if (c.hp <= 0 || !c.equipped) continue;
    let hpRegen = 0, spRegen = 0;
    for (const item of Object.values(c.equipped)) {
      if (item?.regenHp) hpRegen += item.regenHp;
      if (item?.regenSp) spRegen += item.regenSp;
    }
    c.hp = Math.min(c.hpMax, c.hp + hpRegen);
    c.sp = Math.min(c.spMax, c.sp + spRegen);
  }
}
```
- Plafonné par `hpMax`/`spMax`. Pas de regen sur perso KO (`hp <= 0`).
- Sommé sur tous les slots → un perso peut accumuler plusieurs sources.
- Exemples V1 : `larmes_phenix` (slot `amulet`, `regenHp:3`).

> Pour les items `slot:"ring"`, `equipItem` route automatiquement vers `ring1` puis `ring2`. Le menu d'équipement (`showEquipMenu`) propose explicitement « Anneau gauche / droit » quand les deux sont vides.

### Flux d'équipement
```
useItem(idx, battleMode)
  └─ si type !== 'consumable' && !battleMode → showEquipMenu(item, idx)
       └─ solo : equipItem(idx, 0)   directement
          duo  : affiche prompt Harry / Hermione dans la grille
                 → equipItem(inventoryIdx, charIdx[, targetSlot])
                     ├─ slot = _resolveSlotForItem(item, c)   // résout ring → ring1/ring2
                     ├─ c.equipped[slot] = {...item}
                     ├─ c.wand / c.armor / c.acc = item.name  (strings legacy pour HUD)
                     ├─ player.inventory.splice(inventoryIdx, 1)
                     └─ recalculateStats()
```

### recalculateStats()
Doit être appelé après chaque équipement **et** après chaque level-up.
Itère dynamiquement sur tous les slots présents dans `c.equipped` (extensible sans toucher au code) :
```js
// Pour chaque personnage du groupe :
c.atk = c._baseAtk; c.def = c._baseDef; c.mag = c._baseMag; c.lck = c._baseLck;
c.str = c._baseStr; c.int = c._baseInt; c.agi = c._baseAgi; c.end = c._baseEnd;
for (const slot of Object.keys(c.equipped)) {
  const item = c.equipped[slot];
  if (!item) continue;
  if (item.bonusAtk) c.atk += item.bonusAtk;
  // ... bonusDef/Mag/Lck/Str/Int/Agi/End
}
```

### Migration save legacy (save.js — `_migrateEquippedSlots`)
Idempotente, appliquée dans `_applyState` **avant** `recalculateStats` :
- `equipped.armor` → `body`
- `equipped.acc` → slot dérivé du `item.slot` (ou `amulet` par défaut)
- supprime les clés legacy `armor` / `acc`
- initialise les 11 slots manquants à `null`

### Items équipables — vue par catégorie (data.js)

> Liste non exhaustive — voir `js/data.js` pour le détail. **43 items** au total dont **29 équipables**.

| Slot      | Items représentatifs                                                   |
|-----------|-----------------------------------------------------------------------|
| `wand`    | `wand1` (Saule, common), `wand2` (Sureau, rare), `sword_gryff` (legendary) |
| `head`    | `chapeau_apprenti` (common), `chapeau_pointu` (rare), `circlet_serdaigle` (rare), `diademe_serdaigle` (legendary) |
| `body`    | `robe1` (common), `coupe_poufsouffle` (legendary)                     |
| `hands`   | `gants_apprenti` (common)                                              |
| `feet`    | `bottes_apprenti` (common), `bottes_dragon` (rare)                    |
| `cloak`   | `cape_voyageur` (common), `cape_invis` (epic, AGI+5 LCK+5)            |
| `amulet`  | `amulette_protection` (common), `amulette` (epic, `grantsSpell:"Reparo"`), `larmes_phenix` (epic, `regenHp:3`), `locket_slytherin` (legendary) |
| `ring`    | `anneau_argent` (common), `anneau_runique` (rare, `tint:"#a060d0"`), `anneau_resurrection` (epic, `grantsSpell:"Reparo"`) |
| `belt`    | `ceinture_cuir` (common), `ceinture_alchimiste` (rare)                |
| `trinket` | `broom` (rare, fuite garantie), `retourneur_temps` (epic, `tint:"#c9a84c"`) |

En combat, les équipements sont grisés et non cliquables dans l'inventaire.

### Items spellbook (data.js)
Les livres de sorts ont `type:"spellbook"` et un champ `spell` (nom exact dans SPELLS).
Cliquer un livre hors combat ouvre `showLearnMenu()` : en solo le sort va à
Harry, en duo un prompt Harry/Hermione choisit **un seul** apprenant
(`learnSpellbook`/`_teachSpellToOne`). Le livre est consommé après
apprentissage réussi. (`grantsSpell` d'équipement reste groupe entier.)

| ID | Nom | Sort enseigné | Disponible |
|----|-----|--------------|------------|
| `livre_sortileges` | Sortilèges Standards, Vol.3 | Wingardium Leviosa | Boutique, coffre ≥ étage 2 |
| `livre_soin` | Potions & Remèdes Magiques | Reparo | Boutique, coffre ≥ étage 3 |
| `livre_ferula` | Manuel du Soigneur de Champ | Ferula | Coffre étages 4-6 |
| `book_monsters` | Livre des Monstres | Diffindo | Coffre ≥ étage 3 (quête Lockhart) |
| `livre_glacius` | Givre & Engelures | Glacius | Boutique ≥ étage 3 |
| `livre_fulgari` | Foudre Canalisée | Fulgari | Boutique ≥ étage 5 |
| `livre_lumos_solem` | Lumière Solaire | Lumos Solem | Coffre ≥ étage 5 |
| `livre_prince` | Manuel du Demi-Sang | Sectumsempra | Coffre ≥ étage 6 (rare) |

Les livres apparaissent avec l'étiquette 📖 violette dans l'inventaire.

> **Sorts élémentaires** (`data.js`) : `Glacius` (glace, applique le statut
> DoT `gel` via `STATUS_BY_SPELL`), `Fulgari` (foudre, dégâts purs),
> `Lumos Solem` (lumière, `bonusVsUndead:1.5` — ×1.5 contre les
> morts-vivants : catégorie `fantôme` + ids listés dans `UNDEAD_IDS` de
> `battle-spells.js`). Statut `gel` ❄️ : 4ᵉ DoT après burn/poison/bleed.

---

## Modale Personnage (fiche v2 — `js/ui.js`)

`openCharacter(charIdx)` peuple `#char-detail` (conteneur partagé avec
`openQuestLog()`) puis affiche `#character-modal`. Refonte v2 — cf.
`.claude/plans/character-ux-v2.md`.

### Layout — `.char-grid`
Grille CSS à zones nommées (`css/style.css`) :

```
desktop (>700px)        mobile (≤700px)
"stats equip"           "stats"
"stats houseset"        "equip"
"stats spells"          "houseset"
"stats inv"             "spells"
                        "inv"
```

Colonne `stats` (220 px) à gauche ; `equip` / `houseset` / `spells` /
`inv` empilées à droite. En mobile, une seule colonne.

### Sections et helpers de rendu
| Zone | Classe section | Contenu |
|------|----------------|---------|
| Stats | `.section-stats char-stats-panel` | level-banner + lignes de stats, panneau d'allocation si points libres |
| Équipement | `.section-equip` | paper-doll (4 slots gauche / buste / 4 slots droite + rangée wand·belt·trinket) + `.gold-banner` |
| Set Maison | `.section-houseset` | 4 médaillons du set + bonus 2/3/4 pièces — `_renderHouseSetPanel()`, visible si `chosenHouse` |
| Sortilèges | `.section-spells char-spells-panel` | badges PNG des sorts connus — `_renderSpellBadge()` |
| Sac | `.section-inv` | grille fixe 16 slots — `_renderInvSlot()` |

- `_renderPaperDollSlot(slot, c, charIdx)` — slot d'équipement (`.equip-slot-floating`),
  bordure de rareté, tooltip riche, `onclick="unequipFromSlot(...)"` si rempli.
- `_renderStatValueWithBonus(c, key, baseKey)` — affiche `base +bonus`
  (bonus en vert) quand l'équipement augmente la stat ; sinon le total seul.
- `_renderItemTooltip(item, slotLabel, action)` — tooltip au survol
  (paper-doll + sac) : nom coloré par rareté, slot, bonus, regen, desc.

### Accordéon mobile
Chaque section porte un bouton `.section-toggle` (préfixé par
`openCharacter`/`_renderHouseSetPanel`). Masqué en desktop via CSS ;
en ≤700px il est affiché et `_toggleCharSection(btn)` bascule la classe
`.collapsed` sur la section parente. La règle CSS
`.section.collapsed > *:not(.section-toggle) { display:none }` (média
≤700px) plie tout le contenu sauf le bouton. Sections dépliées au départ.

### Hors-scope v2
La fusion de `#inventory-modal` dans la fiche (bouton 🎒 redirigeant vers
`openCharacter`) est **reportée** : à rediscuter depuis l'ajout de la
besace d'herbes. La section Sac de la fiche reste un affichage en
lecture/clic ; `openInventory()` garde sa modale `#inventory-modal`.

---

## Système de combat

### Variables d'état (state.js)
```js
inBattle          // bool
partySize         // 1 ou 2 — choisi à l'écran de démarrage
enemyGroup        // [{...monsterData scalé, currentHp, disarmed}, …]  1 à 3 ennemis
currentBattleChar // 0 = Harry, 1 = Hermione
shieldTurns       // [0, 0]  — bouclier Protego par personnage
guardTurns        // [0, 0]  — paliers de Garde par personnage (empilables, cap 3 ; mitigation 50 %)
pendingAction     // 'attack' | 'spell_dmg' | null
pendingSpell      // nom du sort en attente de sélection de cible (ennemi ou allié)
```

### Actions de combat (#battle-actions)

5 actions disponibles à chaque tour du perso actif :

| Action | Coût | Effet |
|--------|------|-------|
| 🗡️ Attaquer | — | Attaque physique (atk + 0-3 vs def, crit `critChance`) |
| ✨ Sortilège | PM | Liste des sorts du perso (modale `#spell-modal`) |
| 🛡️ Garde | — | `guardTurns[idx]` empilé (`min(3, +1)`) ; mitige les coups physiques de 50 % ; restitue `3 + floor(mag/5)` PM par pose (cap `spMax`) **disponible 1 tour sur 2** par personnage (`guardRegenCooldown[idx]`, réarmé à 2, décrémenté par round dans `enemyTurn`). Priorité après Protego/Esquive. **Chaque coup mitigé consomme un palier** ; les paliers non touchés persistent (Double-Garde). Riposte probabiliste `_tryGuardCounter` (base 30 %, plafond 40 %, + `counterChance` d'équipement) — atk/2, sans consommer de tour. |
| 🧪 Objet | — | Inventaire en mode combat (consommables uniquement) |
| 💨 Fuir | — | `doFlee()` — chance basée sur AGI vs ATK ennemi, garantie avec Balai |

### Tour de jeu
```
Harry agit → advanceBattleChar()
  si partySize=2 et Hermione vivante → Hermione agit → advanceBattleChar()
Ennemis agissent (tryEnemyAbility ou attaque physique) → retour Harry
```
Si un personnage est KO, son tour est sauté automatiquement.

### Statut `stun` (étourdissement)
Statut non-DoT (`STATUS_DEFS.stun` 💫) qui fait **sauter le prochain tour**
du combattant — héros comme ennemi. `turns` = nombre de tours sautés.
- `applyStatus(target, 'stun', 0, turns)` le pose ; le `power` est ignoré.
- `consumeStun(actor)` consomme 1 tour au **point de saut** (retire le statut
  à 0). `tickStatuses` porte `stun` sans le décompter — sinon l'expiry de fin
  de round l'annulerait avant qu'il ne serve.
- Ennemis : skip dans la boucle `enemyTurn`. Héros : skip à l'ouverture du
  segment (`enemyTurn` fin + `advanceBattleChar`). Si tout le groupe est
  étourdi, le segment héros est sauté — jamais d'état figé.
- Vecteur d'injection : capacité ennemie `effect:"status", statusId:"stun"`.
  Monstres porteurs : `lutin_cornouailles`, `strangulot`, `pitiponk`,
  `gargouille`.

### Statut `fear` (peur)
Statut non-DoT (`STATUS_DEFS.fear` 😱) : à **chaque tour**, le combattant
apeuré a **50 % de chance** de se figer et perdre son tour.
- `applyStatus(target, 'fear', 0, turns)` le pose ; le `power` est ignoré.
- Contrairement à `stun`, `fear` est **décompté normalement** par
  `tickStatuses` (pas de fonction de consommation) — sa durée est en
  rounds, pas en sauts. `rollFearSkip(actor)` fait le jet 50 % sans
  rien consommer (héros à l'ouverture de segment, ennemis dans la
  boucle `enemyTurn`).
- Vecteur d'injection : capacité ennemie `effect:"status", statusId:"fear"`.
  Monstres porteurs : `boggart` (Épouvantard), `detraqueur` (Détraqueur).
- Dissipé par le sort `Patronus Maxima` (palier Maison 17).

### Level-up (battle.js — checkLevelUp)
Au level-up, on incrémente `c._baseAtk / _baseDef / _baseMag` (pas `c.atk` directement),
puis on appelle `recalculateStats()` pour reconstruire les stats effectives avec l'équipement.

#### Table de progression des sorts par niveau
| Niveau | Harry apprend | Hermione apprend |
|--------|--------------|-----------------|
| 2 | — | Expelliarmus |
| 3 | Accio | Stupefix |
| 4 | Wingardium Leviosa | Ferula |
| 5 | Reparo | Diffindo |
| 6 | Ferula | — |
| 7 | Diffindo | Wingardium Leviosa + Reparo + Ferula Maxima |
| 9 | Avada... (déverrouillé) | Avada... (déverrouillé) |

`Avada...` est `locked:true` dans SPELLS jusqu'au niveau 9, où le flag est muté en `false` et le sort ajouté aux deux personnages.

#### 3 vecteurs d'apprentissage de sorts
1. **Level-up** : table ci-dessus, automatique
2. **Livres de sorts** (`type:"spellbook"`) : cliquer dans l'inventaire → `showLearnMenu` → enseigne à **un** perso choisi (solo : Harry direct)
3. **Équipement** (`grantsSpell`) : enseigne le sort de façon permanente à l'équipement (ex: Amulette → Reparo)

#### Modale Sorts — filtre + aperçu (`inventory.js`)
`openSpells`/`openBattleSpells` affichent en tête une barre de filtres
par catégorie (`spellCategory()` dans `data.js` : élément du sort, ou
`soutien`/`utilitaire`) ; chips masqués si le perso n'a aucun sort de la
catégorie. Sous chaque sort, `spellEffectPreview()` (`battle-spells.js`)
affiche l'effet chiffré pour le lanceur — soin via `healAmount()`,
dégâts via `spellDamage()`, helpers purs partagés avec les handlers.

### Crit + Esquive (stats dérivées)
`recalculateStats()` calcule les stats dérivées exposées sur chaque
personnage et affichées dans la modale Personnage. **Deux canaux de
critique** : physique et sort (cf. `.claude/plans/crit-rework.md` +
`agi-spell-crit.md`).

| Stat                  | Formule                                              | Plage   |
|-----------------------|------------------------------------------------------|---------|
| `critChance`          | `min(40, 5 + lck*0.5) + Σ bonusCritChance`           | 5–100 % |
| `spellCritChance`     | `min(35, 5 + agi*0.4) + Σ bonusSpellCritChance`      | 5–100 % |
| `dodgeChance`         | `5 + agi*0.4 + Σ bonusDodgeChance`                   | 5–35 %  |
| `critMultiplier`      | `1.5 + Σ bonusCritDamage`                            | ≥ 1.5   |
| `spellCritMultiplier` | `1.5 + Σ bonusSpellCritDamage`                       | ≥ 1.5   |

- Le crit physique est piloté par **LCK** (plafonne à 40 %), le crit de
  sort par l'**AGI** (plafonne à 35 %) — c'est le rôle offensif de l'AGI.
  Les bonus d'équipement et de set s'ajoutent **au-dessus** de ces
  plafonds (peuvent les dépasser, plafond absolu 100 %).
- **Crit physique** (`battle.js — executeAttack`) : roll `< critChance`,
  dégâts × `critMultiplier`.
- **Crit de sort** (`battle-spells.js — rollSpellCrit`) : les sorts
  offensifs (`_spellElementalDamage`, `_spellLifesteal`, `_spellCurse`)
  roll `< spellCritChance`, dégâts × `spellCritMultiplier`.
- **Esquive** (`battle.js — enemyTurn`) : roll `< target.dodgeChance` → attaque annulée.
- Champs d'item/set : `bonusCritChance`, `bonusCritDamage`,
  `bonusSpellCritChance`, `bonusSpellCritDamage`, `bonusDodgeChance`.
  Les sets de Maison (physique : Gryffondor ; sort : Serpentard/Serdaigle)
  et le set Ténèbres portent ces bonus.

### Capacités spéciales des ennemis (tryEnemyAbility)
Chaque ennemi peut avoir un tableau `abilities[]`. À chaque tour ennemi,
chaque capacité est tentée selon sa `chance` (0.0–1.0).
- `"damage"` → dégâts magiques (power + mag/2)
- `"heal"`   → l'ennemi se soigne
- `"weaken"` → réduit la DEF de la cible
- `"drain"`  → draine des PV et s'en soigne à moitié
- `"status"` → inflige un statut persistant (`statusId` : burn/poison/bleed/stun…)
- `"dispel"` → retire un buff de la cible (priorité shield > guard > regen) ;
  si rien à dissiper, l'ennemi attaque normalement. Porteurs : `mangemort_elite`,
  `bellatrix`, `voldemort_revenu`

Heuristique anti-stalling : face à une cible en Double-Garde (`guardTurns ≥ 2`),
les capacités `weaken` voient leur `chance` multipliée par 1,5.

### Résistances / Faiblesses (système élémentaire)
`enemy.resist[]` → sorts atténués de 50% (`RESIST_MULTIPLIER`), affiche 🔰
`enemy.weak[]`   → sorts amplifiés de 50% (`WEAK_MULTIPLIER`), affiche 💥

Le matching se fait sur **`spell.element`** (pas `spell.effect`, qui ne
sert qu'au routage vers le handler). 6 éléments :
`"feu"` 🔥 · `"glace"` ❄️ · `"foudre"` ⚡ · `"lumière"` ✨ · `"ténèbres"` 🌑
· `"physique"` ⚔️. La clé `"disarm"` reste une **résistance mécanique**
(bloque Expelliarmus) — orthogonale aux éléments.

Chaque sort de dégâts porte un `element` (cf. `SPELLS` dans `data.js`).
`battle-spells.js — _spellElementalDamage / _spellLifesteal / _spellCurse`
applique le multiplicateur. Bestiaire : `_renderResistWeakHtml` affiche
l'emoji par élément. Plan : `.claude/plans/elemental-system.md`.

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

### Quêtes actives (7 au démarrage — voir `state.js:175+`)
- `mandragore_pomfresh` (Madame Pomfresh)
- `livre_interdit` (Gilderoy Lockhart)
- `troll_toilettes` (Mimi Geignarde)
- `chouette_perdue` (Hagrid)
- `niffleurs_trésor`
- `golem_passage`
- `lumiere_desespoir`

> Pour ajouter des quêtes : pousser un objet dans `activeQuests` dans `state.js`.
> Détail des objectifs et récompenses : voir le tableau dans `state.js`.

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

## Cellules spéciales (data.js, dungeon.js, movement.js)

Les éléments « interactifs » du donjon sont représentés directement
par le type de cellule (`CELL.*`), pas par une couche d'objets séparée.

| Cellule | Constante | Icône scène | Interaction |
|---------|-----------|-------------|-------------|
| Coffre  | `CELL.CHEST = 6` | SVG inline `_showExploreOverlay` | `openChest()` |
| Boutique | `CELL.SHOP = 5`  | SVG inline `_showExploreOverlay` | `openShop()` |
| Escalier descendant | `CELL.STAIRS_D = 3` | SVG inline | `goDeeper()` |
| Escalier montant    | `CELL.STAIRS_U = 4` | SVG inline | `goUp()` |
| Fontaine | `CELL.FOUNTAIN = 7` | SVG inline | `useFountain()` |

### Génération (`dungeon.js`)
- Chaque room intermédiaire reçoit aléatoirement `CHEST` (~30 %) ou
  `SHOP` (~20 %).
- La dernière room reçoit `STAIRS_D`, la première `STAIRS_U` (étage > 1).
- Les étages `2, 5, 8, …` reçoivent en plus une `FOUNTAIN` garantie
  (cf. section dédiée).

### Interaction
- À chaque déplacement, `handleCellEntry(cell)` (dans `movement.js`)
  ouvre l'overlay d'exploration `_showExploreOverlay(cell)` quand
  la cellule est `CHEST`, `SHOP`, `STAIRS_D`, `STAIRS_U` ou `FOUNTAIN`.
- L'overlay affiche le SVG de scène, un titre, une description, et
  les boutons d'action.

---

## Salle Fontaine (movement.js, dungeon.js)

Salle spéciale qui **restaure 100 % PV + 100 % PM** du groupe, à raison
d'**1 utilisation par visite d'étage**. Apparaît aux étages **2, 5, 8,
11, …** (`floor >= 2 && (floor - 2) % 3 === 0`).

| Élément | Détail |
|---------|--------|
| Type de cellule | `CELL.FOUNTAIN = 7` (`data.js`) |
| Génération | `dungeon.js` — force une room intermédiaire à `CELL.FOUNTAIN` |
| Interaction | `useFountain()` (`movement.js`) — overlay d'exploration dédié |
| État "tarie" | Set global `usedFountains` (clés `"x,y"` pour l'étage courant) |
| Reset | `usedFountains.clear()` à chaque entrée d'étage (généré ou restauré) |
| Persistance | Sauvegardé dans `_serializeState/_applyState` via `Array.from(usedFountains)` |
| Visuel canvas | Sprite de couloir `drawFountainSprite()` (renderer-effects.js) — emoji ⛲ + halo bleu, état tari grisé |
| Minimap | Classe `.map-fountain` (bleu eau, distincte de `.map-special`) |

### Cycle de vie
```
Entrée d'étage           → usedFountains = new Set()
Boire (useFountain)      → soin total + usedFountains.add("x,y")
Boire à nouveau          → message "tarie", refusé
Quitter étage            → cache du dungeon (sans usedFountains)
Revenir sur l'étage      → usedFountains = new Set() (ré-active)
Sauvegarder en cours     → usedFountains sérialisé tel quel
```

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

### Musique ambiante et de combat (`audio-music.js`)

- **Ambiant** : `_zoneKeyForFloor(f)` retourne `getFloorTheme(f).ambient`
  (`intro`/`dungeon`/`depths`) — voir « Thèmes par tranche d'étages ».
  `_ZONE_SAMPLES` conserve 5 entrées (`tension`/`abyss` en réserve V2).
- **Combat** : `_combatSampleKey(enemyGroup)` choisit le sample par
  **axes combinés** — priorité `epic` (boss porteur de `epic:true` dans
  `monsters.js`) > étage ≥ 10 (`combat_late`) > difficulté
  (`combat_normal`/`combat_hard`/`combat_expert`). Si le sample de
  tranche est absent (404), repli sur `combat_normal` puis synthèse
  procédurale. `startCombatMusic(enemyGroup)` reçoit le groupe depuis
  `battle.js — startBattle`.

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

### Monstres définis (54 au total)
| Étages | Monstres |
|--------|---------|
| 1–3    | Chat de Mme Norris, Luciole des Marais, Cornichon de Cornouailles, Portrait Hostile, Peeve, Mimi Geignarde, Serpent des Cachots |
| 2–6    | Chouette Ensorcelée, Mandragore Sauvage, Kappa des Douves, Épouvantard, Gobelin Rebelle, Araignée Géante |
| 3–7    | Bundimun Venimeux, Homme-Araignée, Méduse Noire, Troll des Toilettes, Centaure Hostile, Détraqueur |
| 4–9    | Hippogriffe en Furie, Inférius, Loup-Garou Enragé, Sorcière des Ténèbres |
| 5+     | Mangemort Masqué, Jeune Acromantule, Détraqueur Gardien, Troll des Cavernes, Sorcier Renégat |
| 6+     | Basilic Mineur, Chimère de Poudlard, Ombre de Quirrell, Nagini |
| 7+     | Mangemort d'Élite, **Auror Corrompu** |
| 8+     | Bellatrix Lestrange, Voldemort Affaibli, **Fenrir Greyback** (boss canon, epic, weight 1), **Veilleur du Seuil** (boss original epic), **Loup-Garou Adulte** |
| 9+     | **Aragog** (boss canon epic), **Maître des Détraqueurs** (boss original epic), **Acromantule Adulte**, **Détraqueur d'Élite**, **Mangemort Vétéran**, **Spectre Renforcé** |
| 10+    | Voldemort Ressuscité, **Antonin Dolohov** (boss canon epic), **Héraut des Ténèbres** (boss original epic) |
| **+14 ajouts récents** | Niffleur, Elfe de Maison Rebelle, Bowtruckle Géant, Chevalier Fantôme, Gremlin Magique, Manticore Juvénile, Gardien du Portail, Fantôme du Sang Noir, Chauve-Souris Vampire, Vampire Novice, Strigoï Ancien, Poupée Maudite, Spectre Maudit, Hécate la Maudisseuse — voir `monsters.js` pour `minFloor`/`maxFloor` |
| **+4 monstres étourdissants** | Lutin de Cornouailles (1–4), Strangulot (3–7), Pitiponk (4–8), Gargouille Éveillée (5–10) — capacité `effect:"status", statusId:"stun"`. PNG dédiés dans `img/monsters/`. |

> Le **sprint endgame étages 8-10** (mai 2026, PRs #241-#243, #247-#252) a ajouté 14 monstres dont 6 boss epic uniques + 6 PNJ déterministes + 9 quêtes. Plan d'audit : [`.claude/plans/content-audit-stabilization.md`](./.claude/plans/content-audit-stabilization.md). Prompts Nano Banana v2 (cadrage figure entière) : [`.claude/plans/nano-banana-prompts-floor-8-10.md`](./.claude/plans/nano-banana-prompts-floor-8-10.md).

**Icônes SVG** définies dans `icons.js` pour tous les monstres majeurs.
Les monstres sans SVG propre héritent du SVG de leur catégorie.
Un **TEMPLATE commenté** se trouve en bas de `monsters.js`.

### Boucle Ténébreuse — recyclage PNJ + quêtes répétables (étages 11+)

Post-victoire, les étages 11+ recyclent automatiquement les monstres
via `effectiveFloor(floor)` (`dungeon.js:52`). Depuis PR #255, **les PNJ
déterministes recyclent aussi** : `getNpcsForFloor(floor)` filtre par
`placement.floor === floor || placement.floor === effectiveFloor(floor)`.

Conséquences :
- Kingsley (placement floor:8) apparaît à étage 8 ET 18
- Bill (floor:9) apparaît à étage 9 ET 19
- Sirius (floor:10) apparaît à étage 10 ET 20
- Apothicaire / Marchand / Forgeron : idem (vente d'Essence/Page accessible en Boucle)

**Gardien de la Boucle** (`gardien_boucle`, placement floor:11, sprite
`fantome`) est exclusif post-victoire (l'escalier étage 10 est scellé
sans `victoryAchieved`). Il donne 3 quêtes répétables `everyLevels: 2` :
- `purge_loups` (kill 2 Greyback) → essence + 250g
- `purge_acromantules` (kill 2 Aragog) → page + 260g
- `purge_mangemorts` (kill 2 Dolohov) → essence + 280g

Cible volontaire des boss étage 8-10 (qui apparaissent en variant
`Ténébreux` aux étages 18-20). C'est la boucle de farm matériaux
Forge/Biblio principale en endgame.

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

## Contrôles de déplacement (relatif)

Les contrôles sont **relatifs à `playerDir`** (style dungeon crawler) :
↑/↓ avancent ou reculent dans la direction du regard, ←/→ pivotent la
caméra sans bouger. Le moteur conserve en interne les directions
cardinales (`playerDir ∈ {n,s,e,w}`, `DIRECTIONS`, minimap…) — seuls
les inputs utilisateur sont relatifs.

| Action | Touches | Bouton desktop | Bouton mobile | Swipe canvas | Helper (`js/movement.js`) |
|--------|---------|----------------|---------------|--------------|---------------------------|
| Avancer        | ↑ / W / Z | `#btn-forward` | ▲ | swipe ↑ | `moveForward()` |
| Reculer        | ↓ / S     | `#btn-back`    | ▼ | swipe ↓ | `moveBackward()` (ne pivote pas) |
| Pivoter gauche | ← / A / Q | `#btn-turn-l`  | ↺ | swipe ← | `turnLeft()` |
| Pivoter droite | → / D     | `#btn-turn-r`  | ↻ | swipe → | `turnRight()` |

- `moveForward` / `moveBackward` réutilisent le helper interne `_step(dir, faceDir)`.
  `moveBackward` passe `faceDir=false` pour conserver l'orientation.
- `turnLeft` / `turnRight` muent `playerDir` puis rafraîchissent
  `updateCompass()`, `renderMinimap()`, `drawDungeon()`,
  `_updateSearchBtn()`. Pas de footstep (rotation = silence).
- `move(dir)` legacy (déplacement absolu) reste disponible pour
  cinématiques / debug, n'est plus appelée par l'UI.

### Swipe canvas (mobile)

Voir `js/swipe-canvas.js`. Listeners `touchstart`/`touchmove`/`touchend`
sur `#dungeon-canvas`, seuil 30 px sur l'axe dominant. L'axe le plus
long décide du type d'action (translation vs rotation). Mono-touch
uniquement (multi-doigts → annule le geste, laisse passer pinch/zoom
si jamais le navigateur les autorise).

Garde-fous : `_isCanvasSwipeBlocked()` retourne `true` si `inBattle`
ou si un overlay couvre la vue (`#encounter-overlay`, `#explore-overlay`,
`#npc-dialog-overlay`, `#floor-transition`). CSS `touch-action: none`
sur `#dungeon-canvas` neutralise pull-to-refresh / scroll vertical /
double-tap zoom sur cette zone uniquement. Le D-pad tactile reste
affiché et fonctionnel — c'est un canal d'entrée additionnel, pas un
remplacement.

### Indicateurs visuels d'orientation

- **Boussole** (`updateCompass`) : la lettre N/S/E/O correspondant à
  `playerDir` porte la classe `.facing` (or + glow). Mapping HTML
  particulier : ouest s'affiche avec l'ID `dir-o`.
- **Minimap** (`renderMinimap` + `_buildMinimapCells`) : la case du
  joueur contient un enfant `.map-player-arrow` doté de la classe
  `map-player-dir-<n|s|e|w>` (triangle CSS via `clip-path` + rotation).
  S'applique à la minimap desktop **et** à l'overlay mobile.

---

## Responsive mobile (≤ 700px)

- Layout devient une colonne unique : header → left (bandeau HP) → main → footer
- Panneau droit masqué
- D-pad tactile (`.mobile-dir`, avancer/reculer/pivoter) remplace les boutons texte (`.desktop-dir`)
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
- `getWallTextureType()` : clé de texture murale via `getFloorTheme(currentFloor).wall`
  (voir « Thèmes par tranche d'étages »). Override `rune_wall` à l'étage 11+
  post-victoire conservé en surcouche.
- Sol / plafond : clés `getFloorTheme(currentFloor).floor` / `.ceiling`
  (même override `rune_floor`/`rune_ceiling` post-victoire).
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
- `drawCellMarker()` : rendu de la porte en bois en vue 3D (cellule `CELL.DOOR`)

---

## Thèmes par tranche d'étages (`floor-themes.js`)

Source unique de vérité pour le tileset **et** la musique ambiante.
`FLOOR_THEMES` mappe une tranche d'étages → clés de textures + zone
ambiante ; `getFloorTheme(floor)` est pur et sûr (entrée invalide →
`hogwarts`). Consommé par `renderer.js`, `audio-music.js` et
`movement.js` — aucune dérive possible entre les couches.

| Tranche | Étages | Murs | Sol | Plafond | Ambiance | Ton |
|---------|--------|------|-----|---------|----------|-----|
| **A** Couloirs de Poudlard | 1-3 | `stone1` | `stone` | `beams` | `intro` | Familier, école |
| **B** Cachots de Poudlard | 4-6 | `stone2` | `carpet` | `stone` | `dungeon` | Descente, austère |
| **C** Profondeurs Oubliées | 7+ | `cavern_wall` | `cavern_floor` | `cavern_ceiling` | `depths` | Inconnu, abyssal |

- **Override post-victoire** : `renderer.js` bascule sur `rune_*` à
  l'étage 11+ quand `victoryAchieved` — surcouche indépendante de
  `getFloorTheme`. Un palier « Ruines Anciennes » (14+, assets `rune_*`)
  est préparé en commentaire dans `FLOOR_THEMES` pour une V2.
- **Transition de tranche** : `movement.js — _maybePlayTierTransition`
  (appelé dans `_changeFloor`) affiche un fondu noir 600 ms
  (`#tier-transition-overlay`) + un toast au franchissement d'une
  frontière (3↔4, 6↔7). Pas de déclenchement à l'intérieur d'une
  tranche (compare de référence d'objet).

---

## Sauvegarde (multi-slots)

### Modèle de stockage

Deux clés cohabitent dans `localStorage` :

| Clé                     | Rôle                                                       |
|-------------------------|------------------------------------------------------------|
| `hogwarts_rpg_saves`    | Modèle multi-slots actuel (versionné v1)                   |
| `hogwarts_rpg_save`     | Ancienne clé legacy — migrée une seule fois vers `manual_1`|

```js
// Forme de hogwarts_rpg_saves
{ version: 1, slots: { manual_1: SlotEntry, manual_2: SlotEntry, manual_3: SlotEntry, auto: SlotEntry } }

// Forme d'un SlotEntry
{
  meta:  { savedAt, label, heroNames[], heroIcons[], house, level, floor, difficulty, reason? },
  state: <payload save complet — voir _serializeState() dans js/save.js>
}
```

### API publique (répartie sur 3 fichiers depuis le découpage)

| Fonction                   | Fichier | Rôle                                                  |
|----------------------------|---------|-------------------------------------------------------|
| `_serializeState()`        | save.js | Pur — instantané sérialisable de l'état runtime       |
| `_applyState(gs)`          | save.js | Pur — applique un instantané (mute en place, drawDungeon, etc.) |
| `saveGame()` / `loadGame()`| save.js | Façades legacy (toujours valides, écrivent sur la clé legacy) |
| `listSaveSlots()`          | save-slots.js | `[{id, meta, isAuto}]` triés selon `ALL_SLOT_IDS`        |
| `readSlot(id)`             | save-slots.js | `{meta, state}` ou `null`                                |
| `writeSlot(id, label)`     | save-slots.js | Écriture manuelle. Refusé en combat (`inBattle`)         |
| `deleteSlot(id)`           | save-slots.js | Supprime un slot précis                                  |
| `migrateLegacyKey()`       | save-slots.js | Une seule fois : `hogwarts_rpg_save` → `manual_1`. Idempotent. |
| `autoSave(reason)`         | save-slots.js | Slot `auto`. Throttle 1500 ms. Refusé en combat ou sans `chosenHouse`. |

### Hooks d'auto-sauvegarde
- `js/movement.js` : fin de `goDeeper()` (`floor-down`) et `goUp()` (`floor-up`).
- `js/battle.js`   : fin de `endBattle()` (`battle-end`/`battle-flee`)
                     et fin de `checkLevelUp()` (`level-up`).
- Tous gardés par `typeof autoSave === 'function'`.

### UI (`js/save-ui.js` + `css/save-ui.css`)
- Boutons 💾 / 📂 → `openSaveDialog()` / `openLoadDialog()` qui ouvrent
  `#slot-modal` peuplé dynamiquement.
- Mode `save` : 3 emplacements manuels cliquables + carte auto en readonly
  informatif. Mode `load` : uniquement les slots remplis.
- Suppression via `×` discret (confirmation native).

### Hub démarrage (`#start-hub-screen`)
- Click sur `#title-screen` → `enterStartHub()` :
  • migre l'éventuelle clé legacy
  • aucun slot → bypass direct sur `#player-select-screen`
  • au moins un slot → affiche le hub avec la liste cliquable
- Click sur une carte slot → `loadSlotAndStart(id)` async :
  • cache tous les écrans de démarrage
  • `await loadTextures()` (idempotent)
  • affiche `#game-container`, redimensionne le canvas
  • `_applyState(slot.state)` puis init audio
- Bouton "Nouvelle aventure" → `startHubNewGame()` qui bascule sur player-select.

### Règle d'or
Ne jamais faire `player = gs.party[0]` : `_applyState()` utilise `Object.assign` pour
muter en place, ce qui préserve les références (`party[0] === player`). Idem pour
`player2`. Toujours appeler `recalculateStats()` après application (déjà fait dans
`_applyState`).

---

## Pipeline d'icônes d'items (`tools/icon_factory.py`)

Les items du jeu n'utilisent **pas** d'emoji en runtime — le champ `icon`
(emoji) de `data.js` n'est qu'un fallback texte. Le rendu réel passe
par `getItemIconHtml(item, size)` qui résout l'ID dans cet ordre :

1. `ITEM_ICON_NEW_REGISTRY[id]` → PNG painterly multi-tailles
   `img/icons_new/<id>_<16|24|32|48|64>.png` (priorité 1)
2. `ITEM_ICON_REGISTRY[id]` → PNG legacy `img/icons/items/<id>.png`
3. fallback emoji `item.icon`

Les PNG painterly sont générés par `tools/icon_factory.py` (4627 lignes,
44 recettes au 2026-05). Pipeline : silhouette SVG (`tools/parts/`) →
remplissage par région → 7 passes painterly (AO, shading 45°, rim-light,
specular, grain, halo rareté, cartouche dorée) → mipmaps 64/48/32/24/16
via LANCZOS.

### Ajouter une icône d'item

1. **Identifier le part SVG de base** dans `tools/parts/` (`hood.svg`,
   `gem-pendant.svg`, `tiara.svg`, `hat-pointy.svg`, `feather.svg`,
   `glove.svg`, `belt.svg`, `flask.svg`, `chalice.svg`, etc.).
   Chaque part a des régions nommées via `data-region="<nom>"` —
   inspecter avec `grep -oE 'data-region="[^"]+"' tools/parts/<file>.svg`.
   Si aucun part ne convient → en créer un nouveau (silhouette
   mono-couleur `#000000` sur viewBox `0 0 512 512`, 2-5 régions max).
2. **Ajouter une recette** dans le dict `RECIPES` de `tools/icon_factory.py`
   (modèles : `sword_gryff`, `coupe_poufsouffle`, `brassard_lion`).
   Champs : `id`, `name`, `rarity` (`common|uncommon|rare|epic|legendary`,
   pilote le halo), `material` (`matte|glass|metal|leather|wood`),
   `silhouette` (`{kind:"svg",file:"..."}` ou `{kind:"shape",name:"ring_band",params:{...}}`),
   `fills` (map `region → (r,g,b)`), `accents` (liste de passes
   optionnelles : `liquid`, `bubbles`, `runes`, `orb_glow`,
   `gem_facet_shine`, `emboss`, `symbol`), `sparkles` (legendary).
3. **Pour un emblème de Maison incrusté**, utiliser l'accent
   `{kind:"symbol", region:"<region>", shape:"lion|snake|eagle|badger",
   color:(r,g,b), size:<px>}`. Glyphs disponibles dans `_SYMBOL_PATHS`
   (`icon_factory.py:827+`) : `lion`, `snake`, `eagle`, `badger`,
   `star`, `moon`, `flame`, `drop`, `lightning`, `skull`, `eye`,
   `bat`, `fang`, `cross`, `leaf`, `deer`, `wand`.
4. **Générer les PNG** :
   ```bash
   python3 tools/icon_factory.py <id1> <id2> ...
   # ou pour tout regénérer :
   python3 tools/icon_factory.py --all
   ```
   Produit 5 PNG par ID dans `img/icons_new/<id>_<size>.png`.
5. **Référencer** dans `js/item-icons.js — ITEM_ICON_NEW_REGISTRY`
   (entrée pointant vers le `_64.png`).
6. **Vérifier** : ouvrir le jeu, item visible dans l'inventaire au bon
   visuel. Le halo de rareté + le cartouche doré encadrent le sujet.

### Palettes Maison standardisées

Réutilisées dans toutes les recettes thématiques (cf. `brassard_lion`,
`heaume_vaillant`, etc.) :

| Maison      | Dominante       | Accent           | Emblème (`shape`) |
|-------------|-----------------|------------------|-------------------|
| Gryffondor  | `(116,0,1)` rouge | `(211,166,37)` or | `"lion"`         |
| Serpentard  | `(26,71,42)` vert | `(170,170,170)` argent | `"snake"`   |
| Serdaigle   | `(14,26,64)` bleu | `(148,107,45)` bronze | `"eagle"`    |
| Poufsouffle | `(55,46,41)` brun | `(240,199,94)` or | `"badger"`       |

### Dépendances Python

```bash
pip install pillow cairosvg numpy scipy
# macOS : brew install cairo pango
```

### Référence complète

Procédure détaillée et historique : `tools/README.md` +
`.claude/plans/house-intermediate-tier.md §2.7` (paliers Tier 2) +
`.claude/plans/houses-2.0.md §B` (Sets de Maison 2.0).

---

## Déploiement

- Dépôt : https://github.com/Kenhuri69/hogwarth
- URL publique : https://kenhuri69.github.io/hogwarth/
- Pipeline : `.github/workflows/deploy.yml` — déclenché à chaque push sur `master`
- Prérequis côté GitHub : Settings → Pages → Source = **GitHub Actions**

---

## PWA & cache offline (`manifest.json`, `sw.js`, `js/pwa.js`)

Le jeu est installable (Android/iOS/desktop) et **jouable hors-ligne**
après une première visite en ligne. Aucune dépendance npm — Service
Worker vanilla, pas de Workbox, pas de build step.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `manifest.json` | Manifeste Web App — nom, couleurs, icônes, `display: standalone`, `start_url: "./"` (relatif, fonctionne sur le sous-chemin `/hogwarth/`). |
| `sw.js` | Service Worker : précache du shell + cache à la demande pour `img/`/`audio/`. Variable `CACHE_VERSION` pilote l'invalidation. |
| `js/pwa.js` | Enregistre le SW au `load`, gère le bandeau « Nouvelle version disponible — Rafraîchir ». Défensif : silencieux en `file://` et si `serviceWorker` absent. |
| `css/pwa.css` | Style du bandeau de mise à jour. |
| `img/icons/pwa/` | 5 PNG : `icon-192/512.png` (any), `icon-192/512-maskable.png`, `apple-touch-icon.png` (180×180). Régénérables par `python3 tools/gen_pwa_icons.py`. |

### Stratégie de cache (`sw.js`)

| Type | Stratégie | Justification |
|------|-----------|---------------|
| `index.html` + navigation | **Network-First** (timeout 3 s → cache) | Récupère la dernière version en ligne, repli sur le cache si offline. |
| `manifest.json` | Network-First | Idem. |
| `js/*?v=N`, `css/*?v=N` | **Cache-First** | Cache-busté par URL : `?v=N` change → nouvelle entrée de cache. Pas de risque de servir une version périmée. |
| `img/`, `audio/` | **Stale-While-Revalidate** + cache à la demande | 42 Mo d'assets : on ne précache rien (sauf `img/scenes/title.jpg` + icônes PWA). L'utilisateur télécharge ce qu'il utilise. |
| Cross-origin (Supabase HoF, fonts CDN) | passthrough sans cache | `hall-of-fame.js` a déjà son repli localStorage. |

### Bumper la version

À chaque release qui touche le shell (HTML, JS du précache, ou logique
du SW) :

1. Incrémenter `CACHE_VERSION` dans `sw.js` (`'hogwarth-v1'` → `'hogwarth-v2'`).
2. Si `sw.js` lui-même change, incrémenter aussi le `?v=N` de
   `register('sw.js?v=N')` dans `js/pwa.js`.
3. Pour un fichier JS/CSS individuel, bumper son `?v=N` dans
   `index.html` **et** dans la liste `PRECACHE_URLS` de `sw.js`.

Au prochain chargement, le navigateur installe le nouveau SW en
background, et `js/pwa.js` affiche un bandeau discret « Nouvelle
version disponible — Rafraîchir ». Click → `skipWaiting` → reload
automatique. Pas d'auto-reload silencieux (perte de progression en
plein combat = no-go).

### Tests

- `node tests/smoke.js` : tests fonctionnels (file:// — SW désactivé,
  rien à faire de spécial, `js/pwa.js` est silencieux en file://).
- `node tests/pwa-smoke.js` : tests PWA (démarre un mini serveur HTTP
  local, vérifie manifest, SW activé, précache rempli, **chargement
  offline** avec loader OK).

### Hors-ligne et sauvegardes

`hogwarts_rpg_saves` (localStorage) fonctionne nativement offline —
aucune migration ni adaptation. Le seul flux online est la soumission
au Hall of Fame Supabase, qui a déjà un repli `localStorage`
(`hogwarts_rpg_hof`). Pas de file d'attente de sync à implémenter.

### Désinstallation / debug

Pendant le dev, ouvrir DevTools → Application → Service Workers →
*Unregister*. En console : `PWA.unregister()` puis `PWA.clearCaches()`
(exposés par `js/pwa.js`).

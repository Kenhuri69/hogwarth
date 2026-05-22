# Plan — Enrichissement du donjon

> Objectif : transformer la boucle d'exploration. Aujourd'hui le donjon est
> une chaîne linéaire de 8 salles que l'on traverse intégralement ; il n'y a
> ni choix de parcours, ni surprise, ni risque/récompense. Ce plan ajoute
> des **embranchements**, des **salles à événement**, des **secrets** et des
> **événements d'étage**, sans introduire de nouveau système lourd — tout
> repose sur les `CELL.*` existants + quelques nouveaux types.

Statut global : **✅ PLAN CLOS — 4 / 4 phases livrées (2026-05-21).**
Branche de travail : `claude/plans-bugs-review-Nhbt1` (ou nouvelle branche
dédiée par phase — décidé au moment du commit).

---

## État des lieux (audit `dungeon.js` 2026-05-21)

- `generateDungeon(floor)` place **8 salles** à position aléatoire **sans
  test de chevauchement**.
- Les salles sont reliées **en série** `room[i-1]→room[i]` par des couloirs
  en L → topologie strictement linéaire, aucun cul-de-sac, aucun choix.
- **Une seule cellule spéciale par salle** : `else if` enchaîné
  (STAIRS_D sur la dernière, sinon SHOP 20 %, sinon CHEST 30 %).
- `CELL.DOOR = 2` **existe** (constante + rendu `drawCellMarker` dans
  `renderer-effects.js`) mais n'est **jamais générée** — feature latente
  réutilisable telle quelle.
- `searchRoom()` (`movement.js`) donne or/items aléatoires + jets de malus
  piège/monstre **abstraits** (1 %) — rien n'est matérialisé dans la carte.
- `CELL` actuels : `WALL:0 FLOOR:1 DOOR:2 STAIRS_D:3 STAIRS_U:4 SHOP:5
  CHEST:6 FOUNTAIN:7 NPC:8 FORGE:9 LIBRARY:10`.
- Le donjon est mis en cache par étage (`floorDungeons`) → tout état porté
  par le tableau `dungeon` persiste naturellement dans une visite ; les
  états annexes (autels bus, murs secrets révélés, événement courant)
  doivent être ajoutés à `_serializeState`/`_applyState`.

Nouveaux types prévus : `CELL.TRAP = 11`, `CELL.ALTAR = 12`.

---

## Phase 1 — Layout branchu (socle)

> Casser la chaîne linéaire : une **épine dorsale** salle de départ →
> escalier descendant, et des **salles-branches en cul-de-sac** greffées
> dessus. Le détour coûte des pas (donc des respawns/combats) mais abrite
> le meilleur butin → le déplacement devient un choix.

### Étapes

- [x] **1.1** Refonte du placement des salles : test de non-chevauchement
      (marge 1 case, 24 tentatives par salle), repli mémorisé accepté en
      dernier recours. → *fait dans `generateDungeon`.*
- [x] **1.2** Découpage **épine** (4 salles série spawn→escalier) +
      **branches** (salles restantes greffées sur la salle d'épine la plus
      proche). Topologie en arbre → connexité par construction.
- [x] **1.3** `_assertDungeonConnected()` : BFS filet de sécurité ; perce
      un couloir de secours si STAIRS_D injoignable. Appelé en fin de
      `generateDungeon`, après `_ensureStairsExist`.
- [x] **1.4** Cellules spéciales : STAIRS_D sur la dernière salle d'épine,
      STAIRS_U sur `rooms[0]`, salles d'épine intermédiaires CHEST 30 % /
      SHOP 20 %, salles-branches **CHEST garanti**.
- [x] **1.5** `tests/smoke.js` : scénario `scenarioBranchyDungeon` —
      30 générations, assert connexité spawn→STAIRS_D, escalier unique,
      ≥ 1 branche, 5 salles. Chevauchements logués (tolérés).

### Écarts constatés (2026-05-21)

- **Nombre de salles 8 → 5, taille 3-5 → 3 (occasionnellement 4), épine
  4 → 3.** La map fait **12×12** (10×10 utile) : avec un placement
  aléatoire et une marge de séparation, elle ne sépare proprement que
  ~4 salles. Le générateur d'origine s'appuyait sur un chevauchement
  systématique de ses 8 salles. Itéré pendant l'implémentation : 8 →
  6 (165 chevauchements cumulés / 30 générations, branches fusionnées)
  → **5** (72 / 30, épine de 3 + 2 culs-de-sac mieux isolés). Aucun code
  aval ne dépend du compte exact (boucles relatives à `rooms.length`,
  garde `>= 3` pour fontaine/forge OK).
- **Chevauchement** : non garanti nul (repli de dernier recours). Le test
  le **logue** au lieu de l'interdire — un chevauchement fusionne deux
  salles sans softlock. La connexité (vrai risque) est assertée à 100 %.
- **Bug corrigé en passant** : la boucle de placement d'ennemis ne
  protégeait pas la case de spawn (un ennemi pouvait apparaître sur le
  joueur en cas de chevauchement). Garde `onSpawn` ajoutée — cohérente
  avec `_ensureStairsExist`/`spawnQuestMonsters`/`_findFreeNpcCell`.
  Couvert par `scenarioRespawn20Percent` T5.
- **Hook de test** : `lastDungeonRooms` (instantané structurel des salles)
  exposé par `dungeon.js` pour permettre au smoke d'inspecter `kind`/rect.
  Non consommé par le moteur.
- **« Meilleur butin » des culs-de-sac** : V1 = CHEST garanti (vs 30 % en
  épine). L'enrichissement réel du butin viendra avec la salle scellée
  (Phase 2). `openChest()` non touché.

### Risque
Cœur de `generateDungeon` réécrit. Mitigation : topologie en arbre (connexité
structurelle) + `_assertDungeonConnected` en filet. `_carveCorridor` n'écrase
que les murs → ne détruit jamais une cellule spéciale déjà posée.

---

## Phase 2 — Salles à événement (additif, faible risque)

> Trois nouveaux contenus de cellule. Tous additifs : nouveaux `CELL.*`,
> nouvelles branches dans `handleCellEntry` / `_showExploreOverlay` /
> renderer / minimap. Aucune réécriture.

### 2.A — `CELL.TRAP` (piège) — ✅ livré (2026-05-21)

- [x] **2.1** `CELL.TRAP = 11` dans `data.js`. Génération (`dungeon.js`) :
      1-2 pièges par étage sur des cases `FLOOR` ordinaires, hors d'un
      rayon d'1 case autour du spawn.
- [x] **2.2** `handleCellEntry` : entrer sur un `TRAP` consomme la case
      (→ `FLOOR`) puis `_triggerDungeonTrap()` : 50 % embuscade
      (`startBattle`), 50 % dégâts/drain non létaux (réutilise les
      3 sous-variantes de `_triggerSearchTrap`).
- [x] **2.3** `searchRoom()` désamorce tout `TRAP` dans les 8 cases
      adjacentes + la case courante. Effet prioritaire, sans consommer la
      recharge de fouille.
- [~] **2.4** **Reporté** : un piège est *caché* (ni minimap, ni sprite
      jusqu'au déclenchement) — pas de `drawTrapSprite` ni `.map-trap`
      nécessaires en V1. Le piège n'est jamais visible : il se déclenche
      ou se désamorce. (Sprite envisageable en V2 si l'on veut un état
      « détecté mais non désamorcé ».)

**Écarts §2.A** : (a) 1-2 pièges (et non 0-2) — un étage a toujours au
moins un piège ; (b) le statut de combat (option 2.2.b) est abandonné —
appliquer un statut hors combat est risqué ; remplacé par dégâts/drain/
embuscade ; (c) désamorçage en rayon 3×3 autour du joueur (et non « salle
courante » — les bornes de salle ne sont pas connues à l'exécution).

### 2.B — `CELL.ALTAR` (risque / récompense) — ✅ livré (2026-05-21)

- [x] **2.5** `CELL.ALTAR = 12`. Génération : ~25 % des salles-branches
      reçoivent un autel au lieu d'un coffre.
- [x] **2.6** `handleCellEntry` → overlay d'exploration dédié + `useAltar`
      avec 2 choix : **Offrande d'or** (−40 G/étage → soin complet du
      groupe + 30 XP/étage) et **Pari du sang** (gratuit, 50/50 :
      +60 XP +20 G/étage, ou ~22 % PV max encaissés). Une utilisation par
      autel. Sprite 3D `drawAltarSprite` + SVG `SCENE_ICONS.altar` +
      classe minimap `.map-altar`.
- [x] **2.7** État `usedAltars` (Set, clés `"x,y"`), reset à l'entrée
      d'étage (génération + restauration cache) — analogue à
      `usedFountains`. Sérialisé dans `_serializeState`/`_applyState`.

**Écart §2.B** : les choix « offrande de sang » / buffs temporaires de
l'étage du plan initial sont remplacés par des effets **instantanés**
(soin / XP / or / dégâts) — un buff temporaire scopé à l'étage exigerait
un suivi d'état + une logique de péremption hors-scope V1.

### 2.C — Salle scellée (`CELL.DOOR` + clé) — ✅ livré (2026-05-21)

- [x] **2.8** Génère une **alvéole scellée** : un triplet
      `FLOOR accessible → CELL.DOOR → CELL.CHEST` creusé dans le mur. Le
      coffre est un cul-de-sac (3 voisins WALL) — atteignable seulement en
      ouvrant la porte. Placement déterministe, indépendant de la
      géométrie des salles.
- [x] **2.9** Nouvel item-clé `cle_donjon` (`data.js`, `type:"key"`,
      `price:0` ; `useItem` affiche un indice au lieu de l'équiper).
      Ajouté aux `drops` (chance 1) d'un monstre aléatoire de l'étage.
- [x] **2.10** `_step` intercepte un pas vers une `CELL.DOOR` :
      `_tryOpenDoor` — sans clé, refus + message (pas de déplacement) ;
      avec clé, la consomme et ouvre la porte (`DOOR → FLOOR`).
- [x] **2.11** Smoke : `scenarioDungeonTraps`, `scenarioDungeonAltars`,
      `scenarioSealedRoom` — un scénario dédié par sous-feature.

**Écarts §2.C** : (a) la « salle-trésor branche » du plan devient une
**alvéole de 2 cases creusée dans le mur** — plus simple et 100 %
déterministe (pas de dépendance à la géométrie des couloirs de branche) ;
(b) le coffre du vault est un **coffre standard** (pas de drops enrichis —
hors V1) ; (c) la clé est un item d'inventaire normal qui **persiste entre
étages** (non scopée à l'étage) — non exploitable (il faut tuer un monstre
pour l'obtenir), et bien plus simple ; (d) gating via `_step` (la porte
bloque le pas) plutôt que via `handleCellEntry`/un bouton d'interaction.

### Risque
Faible — purement additif. Le cache `floorDungeons` archive le tableau
`dungeon` : un `TRAP` déclenché (→ `FLOOR`) ou une `DOOR` ouverte reste
dans cet état au retour sur l'étage.

---

## Phase 3 — Secrets & fouille gratifiante

> Donner un sens structurel à `searchRoom()` : aujourd'hui il ne produit
> que du butin aléatoire. Demain il peut révéler de la **géographie**.

### Étapes — ✅ livré (2026-05-21)

- [x] **3.1** **Mur secret** : ~50 % des étages reçoivent une 2nde alvéole
      `FLOOR → mur → CHEST` (helper partagé `_findWallPocket`, le même que
      le coffre scellé). Le mur d'accès reste `CELL.WALL` (indiscernable) ;
      sa clé `"x,y"` est ajoutée au Set `secretWalls` (`state.js`).
- [x] **3.2** `searchRoom()` : un mur secret dans les 8 cases adjacentes
      est **révélé** (`WALL → FLOOR`) et retiré de `secretWalls`. Message
      narratif dédié, effet prioritaire sans consommer la recharge.
- [x] **3.3** La cache contient un coffre standard (récompense du détour ;
      pas de drops enrichis — hors V1, comme le coffre scellé §2.C).
      `secretWalls` mis en cache par étage + sérialisé.
- [~] **3.4** Minimap : la cache n'apparaît **automatiquement** qu'après
      révélation (`renderMinimap` ne dessine que les cases `visited` — un
      mur secret non franchi n'est jamais visité). **Indice 3D de fissure
      abandonné** (hors V1) : le mur secret est indiscernable d'un mur
      ordinaire — découverte par la fouille pure, mécanique de crawler
      classique.
- [x] **3.5** Smoke : `scenarioSecretPassage` — génération, révélation
      par `searchRoom`, round-trip save de `secretWalls`.

### Risque
Modéré (état persistant `secretWalls`). Mitigé : la cache est générée
**dès** `generateDungeon` (isolée par le mur), jamais à la volée ;
`secretWalls` suit exactement le cycle de `searchedCells` (reset à la
génération, mis en cache dans `floorDungeons`, sérialisé).

---

## Phase 4 — Événements d'étage

> Au franchissement d'un escalier, un événement ambiant peut colorer
> l'étage. Narratif, léger, zéro nouveau système — un registre + un hook.

### Étapes — ✅ livré (2026-05-21)

- [x] **4.1** Registre `FLOOR_EVENTS` (nouveau fichier `js/floor-events.js`)
      + `rollFloorEvent()` (35 % puis tirage pondéré) + `getFloorEvent(id)`.
      Ajouté à l'ordre de chargement `index.html` et au MANIFEST du loader.
- [x] **4.2** Hook dans `generateDungeon` (tirage) + `_announceFloorEvent`
      appelé par `_changeFloor` (toast narratif à l'entrée d'étage).
- [x] **4.3** 5 événements V1, **tous appliqués à la génération** :
      - **Étage hanté** : densité d'ennemis 0,60 → 0,85.
      - **Quiétude** : densité d'ennemis 0,60 → 0,30.
      - **Marché ambulant** : boutique forcée sur la salle d'épine.
      - **Veine de trésors** : probabilité de coffre en épine ×2 (0,30 → 0,60).
      - **Étage piégé** : +2 pièges au-dessus de la base de 1-2.
- [x] **4.4** `currentFloorEvent` dans `state.js`, mis en cache par étage
      (`floorDungeons`) et sérialisé (`_serializeState`/`_applyState`).
- [x] **4.5** Smoke : `scenarioFloorEvents` — tirage, effets de génération
      (forçage de `rollFloorEvent`), round-trip save.

**Écarts §4** : (a) **« Couloir effondré » abandonné** — murer un couloir
de branche réintroduit la dépendance géométrique évitée en Phase 1 ;
(b) **« Brume » abandonnée** — réduire `DEPTH` de rendu fait apparaître un
mur fantôme (le renderer peint un mur du fond à `wallDist`) ; un vrai
brouillard demanderait une refonte du renderer, hors V1. Remplacés par
« Veine de trésors » et « Étage piégé », tous deux appliqués à la
génération — donc **zéro effet runtime** : pas de modification du
renderer, tout est mis en cache naturellement dans `dungeon`/`enemyMap`.

---

## Séquencement & livraison

| Phase | Dépend de | Risque | Livraison |
|-------|-----------|--------|-----------|
| 1 Layout branchu | — | Modéré | 1 PR |
| 2 Salles événement | Phase 1 (culs-de-sac) | Faible | 1 PR |
| 3 Secrets | Phase 1 | Modéré | 1 PR |
| 4 Événements étage | Phase 1 (notion branche) | Faible | 1 PR |

Ordre recommandé : **1 → 2 → 4 → 3** (3 en dernier car c'est le plus
délicat côté persistance). Une PR par phase, smoke vert à chaque étape.

## Critères de succès globaux

- Sur 200 générations de test : escalier descendant toujours atteignable.
- Aucune régression des 7 quêtes existantes, du placement PNJ, de la
  fontaine et de la Forge/Bibliothèque endgame.
- `node tests/smoke.js` 100 % vert, avec ≥ 4 nouveaux scénarios (un par
  phase).
- Le joueur rencontre, sur un étage typique : ≥ 1 cul-de-sac à butin,
  occasionnellement un piège / autel / salle scellée, et parfois un
  événement d'étage.

## Hors-scope V1 (à rediscuter)

- Énigmes / runes interactives (mentionnées en exploration initiale).
- Verrouillage multi-clés, donjons à plusieurs escaliers descendants.
- Indice 3D de mur secret si trop coûteux (cf. 3.4).
- Re-direction artistique des sprites de scène (traps/altars) — V1 peut
  réutiliser des SVG inline simples dans `scene-icons.js`.
- **Rendu de la porte verrouillée à améliorer** (`drawCellMarker`) : la
  V1 (bois + ferrures + serrure + anneau, dessin canvas procédural) est
  fonctionnelle et lisible mais pas qualitative — à reprendre plus tard
  pour un visuel soigné (sprite PNG dédié, ou dessin enrichi).

---

## Journal

| Date | Phase | Statut | Notes |
|------|-------|--------|-------|
| 2026-05-21 | Rédaction du plan | ✅ | Audit `dungeon.js` réalisé, 4 piliers validés par l'utilisateur, plan rédigé. Implémentation non démarrée. |
| 2026-05-21 | Phase 1 — Layout branchu | ✅ | `generateDungeon` réécrit : topologie en arbre (épine 3 salles + 2 branches cul-de-sac), placement non-chevauchant, helpers `_carveCorridor`/`_assertDungeonConnected`, cellules spéciales (CHEST garanti en branche). Bug ennemi-sur-spawn corrigé. Scénario smoke `scenarioBranchyDungeon` (30 générations, connexité 100 %). Suite complète 88/88 verte. Itéré 8→6→5 salles pour la contrainte map 12×12. |
| 2026-05-21 | Phase 2 — Salles à événement | ✅ | Livrée en 3 commits. §2.A pièges (`CELL.TRAP`, déclenchement/désamorçage). §2.B autels (`CELL.ALTAR`, offrande/pari, rendu complet, `usedAltars` persisté). §2.C salle scellée (alvéole `DOOR`+`CHEST`, item `cle_donjon` lâché par un monstre, ouverture à la clé via `_step`). 3 scénarios smoke dédiés. Suite 91/91 verte. |
| 2026-05-21 | Phase 4 — Événements d'étage | ✅ | Nouveau `js/floor-events.js` (registre `FLOOR_EVENTS` + `rollFloorEvent`). 5 événements appliqués à la génération (hanté/quiétude/marché/trésors/piégé). `currentFloorEvent` mis en cache + sérialisé, toast à l'entrée d'étage. Couloir-effondré et brume abandonnés (dépendance géométrique / refonte renderer). Scénario `scenarioFloorEvents`. Assertion de `scenarioDungeonTraps` élargie (1-4 pièges). Suite 92/92 verte. |
| 2026-05-21 | Phase 3 — Secrets & fouille | ✅ | Helper `_findWallPocket` extrait (partagé coffre scellé / passage secret). ~50 % des étages reçoivent un mur secret (`secretWalls` Set) révélable par `searchRoom`. État mis en cache + sérialisé. Indice 3D de fissure abandonné (découverte à la fouille pure). Scénario `scenarioSecretPassage`. Suite 93/93 verte. **Plan clos — 4/4 phases.** |

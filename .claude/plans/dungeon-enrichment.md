# Plan — Enrichissement du donjon

> Objectif : transformer la boucle d'exploration. Aujourd'hui le donjon est
> une chaîne linéaire de 8 salles que l'on traverse intégralement ; il n'y a
> ni choix de parcours, ni surprise, ni risque/récompense. Ce plan ajoute
> des **embranchements**, des **salles à événement**, des **secrets** et des
> **événements d'étage**, sans introduire de nouveau système lourd — tout
> repose sur les `CELL.*` existants + quelques nouveaux types.

Statut global : **0 / 4 phases livrées**.
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

- [ ] **1.1** Refonte du placement des salles : ajouter un test de
      non-chevauchement (marge 1 case, ~12 tentatives par salle, on garde
      ce qui passe). → *vérif : aucune salle ne recouvre une autre sur
      50 générations de test.*
- [ ] **1.2** Découper les salles en **épine** (4-5 salles, reliées en
      série de `rooms[0]` à la salle d'escalier) + **branches** (les
      salles restantes, chacune reliée par un couloir à la salle d'épine
      la plus proche). La topologie résultante est un **arbre** → connexité
      garantie par construction. → *vérif : BFS depuis le spawn atteint
      STAIRS_D sur 100 % de 200 générations.*
- [ ] **1.3** Ajouter `_assertDungeonConnected(floor)` : BFS de filet de
      sécurité ; si l'escalier descendant est injoignable, percer un
      couloir de secours. Appelé en fin de `generateDungeon`. → *vérif :
      la fonction ne déclenche jamais le secours sur les générations
      d'arbre normales (log de contrôle).*
- [ ] **1.4** Cellules spéciales : STAIRS_D sur la dernière salle d'épine,
      STAIRS_U sur `rooms[0]`. Salles d'épine intermédiaires : rolls
      actuels (SHOP 20 % / CHEST 30 %, **indépendants** désormais, plus de
      `else if`). Salles-branches (cul-de-sac) : **cellule spéciale
      garantie** (CHEST, ou ALTAR/salle scellée une fois la Phase 2
      livrée). → *vérif : chaque cul-de-sac contient une cellule spéciale ;
      l'escalier n'est jamais sur une branche.*
- [ ] **1.5** Étendre `tests/smoke.js` : nouveau scénario « donjon branchu »
      — génère 30 étages, assert (a) connexité spawn→STAIRS_D, (b) présence
      d'au moins une branche, (c) aucun chevauchement. → *vérif : `node
      tests/smoke.js` 100 % vert.*

### Risque
Cœur de `generateDungeon` réécrit. Mitigation : la topologie en arbre rend
la connexité structurelle (pas dépendante d'un hasard), et 1.3 est un filet.
Le placement PNJ/fontaine/forge utilise `rooms.slice(1, -1)` — vérifier que
ces helpers restent valides avec la nouvelle notion épine/branche (les
salles-branches restent dans `rooms`, l'ordre est conservé).

---

## Phase 2 — Salles à événement (additif, faible risque)

> Trois nouveaux contenus de cellule. Tous additifs : nouveaux `CELL.*`,
> nouvelles branches dans `handleCellEntry` / `_showExploreOverlay` /
> renderer / minimap. Aucune réécriture.

### 2.A — `CELL.TRAP` (piège)

- [ ] **2.1** `CELL.TRAP = 11` dans `data.js`. Génération : 0-2 pièges par
      étage posés sur des cases `FLOOR` de couloir/salle (pas un centre de
      salle spéciale). **Caché** : non révélé sur la minimap tant que non
      déclenché ni détecté.
- [ ] **2.2** `handleCellEntry` : entrer sur un `TRAP` non détecté →
      déclenche un effet tiré parmi 3 : (a) dégâts physiques au groupe
      scalés à l'étage, (b) statut (poison/burn/gel) sur un perso,
      (c) embuscade (`startBattle`). Après déclenchement, la case
      redevient `FLOOR`.
- [ ] **2.3** Détection : `searchRoom()` révèle les pièges de la salle
      courante (les matérialise visuellement, les neutralise au passage).
      Remplace le jet abstrait `SEARCH_TRAP_CHANCE` par une vraie
      interaction si un `TRAP` est présent dans la salle.
- [ ] **2.4** Rendu : sprite de couloir `drawTrapSprite()` (état détecté
      uniquement) + classe minimap `.map-trap` (visible une fois
      détecté/déclenché).

### 2.B — `CELL.ALTAR` (risque / récompense)

- [ ] **2.5** `CELL.ALTAR = 12`. Génération : ~25 % des salles-branches
      reçoivent un autel au lieu d'un coffre.
- [ ] **2.6** `handleCellEntry` → overlay dédié (modèle `useFountain`) avec
      2-3 choix : ex. « Offrande de sang » (−15 % PV max temporaire de
      l'étage → +ATK/MAG), « Offrande d'or » (−or → soin + buff), « Pari »
      (50/50 bonus XP ou statut). Une utilisation par autel.
- [ ] **2.7** État `usedAltars` (Set, clés `"x,y"`), reset à l'entrée
      d'étage — strictement analogue à `usedFountains`. Sérialisé dans
      `_serializeState`/`_applyState`.

### 2.C — Salle scellée (`CELL.DOOR` + clé)

- [ ] **2.8** Génère une `CELL.DOOR` sur le couloir d'accès d'**une**
      salle-branche, qui devient une **salle-trésor** (CHEST garanti, drops
      enrichis). La porte est verrouillée.
- [ ] **2.9** Nouvel item-clé `cle_donjon` (`data.js`, `type:"key"`,
      non-équipable, non-vendable). Ajouté aux `drops` d'un monstre
      désigné de l'étage à la génération (chance élevée), OU placé dans un
      coffre d'épine — décision : **drop monstre** (réutilise le système
      de drops, force le combat).
- [ ] **2.10** `handleCellEntry` sur `DOOR` : sans clé → message
      « verrouillée » + refus d'avancer ; avec clé → consomme la clé,
      `DOOR → FLOOR`, ouvre l'accès. La clé est consommée à l'étage (ne
      traverse pas les étages).
- [ ] **2.11** Smoke : scénario « salles à événement » — assert présence
      occasionnelle TRAP/ALTAR/DOOR sur N générations, déclenchement de
      trap inflige bien un effet, autel consommé une seule fois.

### Risque
Faible — purement additif. Attention au cache `floorDungeons` : un `TRAP`
déclenché (→ `FLOOR`) ou une `DOOR` ouverte doit rester ouvert au retour sur
l'étage (l'état est dans le tableau `dungeon`, donc OK via le cache).

---

## Phase 3 — Secrets & fouille gratifiante

> Donner un sens structurel à `searchRoom()` : aujourd'hui il ne produit
> que du butin aléatoire. Demain il peut révéler de la **géographie**.

### Étapes

- [ ] **3.1** Notion de **mur secret** : 0-1 par étage, une case `WALL`
      adjacente à une salle et à une **salle cachée** (hors arbre principal).
      Suivi par un Set `secretWalls` (clés `"x,y"`) dans `state.js`.
- [ ] **3.2** `searchRoom()` : si le joueur est adjacent à un mur secret
      non révélé, la fouille le **révèle** (`WALL → DOOR` ou `FLOOR`),
      ouvrant le passage. Message narratif dédié.
- [ ] **3.3** La salle cachée contient une récompense au-dessus de la
      moyenne (coffre riche, ou raccourci vers l'escalier). `secretWalls`
      révélés sérialisés dans le save.
- [ ] **3.4** Rendu minimap : la salle cachée n'apparaît qu'après
      révélation. Indice visuel optionnel (fissure) sur le mur secret en
      vue 3D — *à trancher : peut être hors-scope V1 si trop coûteux.*
- [ ] **3.5** Smoke : scénario « secrets » — un mur secret généré, la
      fouille adjacente le révèle, la salle cachée devient atteignable.

### Risque
Modéré : nouvel état persistant (`secretWalls`) + interaction avec le cache
d'étage. La salle cachée doit être générée **dès** `generateDungeon` (mais
isolée par le mur), pas créée à la volée — sinon le cache la perd.

---

## Phase 4 — Événements d'étage

> Au franchissement d'un escalier, un événement ambiant peut colorer
> l'étage. Narratif, léger, zéro nouveau système — un registre + un hook.

### Étapes

- [ ] **4.1** Registre `FLOOR_EVENTS` (nouveau fichier `js/floor-events.js`
      ou section de `floor-themes.js`) : `[{id, name, desc, weight,
      apply(floor)}]`. Ajouté à l'ordre de chargement `index.html` + au
      MANIFEST du loader si fichier dédié.
- [ ] **4.2** Hook dans `_changeFloor` (`movement.js`) : ~35 % de chance de
      tirer un événement pondéré ; toast narratif à l'entrée.
- [ ] **4.3** 4-5 événements V1 :
      - **Couloir effondré** : mure le couloir d'une **branche** (jamais
        l'épine — préserve la connexité escalier).
      - **Brume épaisse** : réduit `DEPTH` de rendu pour l'étage.
      - **Étage hanté** : +taux de spawn ennemi, +drops.
      - **Quiétude** : quelques salles sans ennemi.
      - **Marché ambulant** : une `SHOP` supplémentaire garantie.
- [ ] **4.4** `currentFloorEvent` dans `state.js`, sérialisé. Les effets
      passifs (brume, taux de spawn) lisent cette variable.
- [ ] **4.5** Smoke : scénario « événements d'étage » — forcer un
      événement, vérifier son application + sérialisation.

### Risque
Faible si « Couloir effondré » ne touche que les branches. Vérifier que la
brume (`DEPTH` réduit) ne casse pas le renderer ni le smoke (qui lit le
canvas).

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

---

## Journal

| Date | Phase | Statut | Notes |
|------|-------|--------|-------|
| 2026-05-21 | Rédaction du plan | ✅ | Audit `dungeon.js` réalisé, 4 piliers validés par l'utilisateur, plan rédigé. Implémentation non démarrée. |

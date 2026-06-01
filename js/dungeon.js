// ============================================================
// GÉNÉRATEUR DE DONJON
// ============================================================
// Génération procédurale (salles, couloirs, cellules spéciales, puzzles
// runiques, placement PNJ) : generateDungeon + helpers. Le scaling des
// monstres est dans dungeon-scaling.js (chargé avant) ; le spawn ciblé et
// les garde-fous de maintenance dans dungeon-spawning.js (chargé après).
// ============================================================
// Place un PNJ dans une salle. Préfère le centre s'il est libre, sinon
// une autre case FLOOR. Skippe la case de spawn pour la salle 0 afin
// que l'entrée sur la cellule PNJ soit déclenchable par un mouvement
// (handleCellEntry n'est pas appelé sur le spawn). Retourne true si
// placé, false si la salle n'a aucune case éligible.
function _placeNpcInRoom(npc, room, isSpawnRoom) {
  const candidates = [];
  for (let dy = room.y; dy < room.y + room.h; dy++) {
    for (let dx = room.x; dx < room.x + room.w; dx++) {
      if (dungeon[dy][dx] !== CELL.FLOOR) continue;
      if (isSpawnRoom && dx === room.cx && dy === room.cy) continue;
      candidates.push({ x: dx, y: dy });
    }
  }
  if (!candidates.length) return false;
  const center = candidates.find(c => c.x === room.cx && c.y === room.cy);
  const pick   = center || candidates[Math.floor(Math.random() * candidates.length)];
  dungeon[pick.y][pick.x] = CELL.NPC;
  npcPlacements.set(`${pick.x},${pick.y}`, npc.id);
  // Révèle la case sur la minimap dès le départ : les PNJ sont des
  // repères de navigation, pas des surprises (choix UX 2026-05-11).
  // Le marqueur "!"/"?" éventuel est ajouté par renderer-minimap selon
  // l'état de la quête liée.
  if (typeof visited !== 'undefined' && visited[pick.y]) {
    visited[pick.y][pick.x] = true;
  }
  return true;
}

// Place un PNJ random dans la première salle intermédiaire libre, repli
// sur l'avant-dernière salle. Met à jour `occupied`. Retourne true si placé.
function _placeRandomNpcInRooms(npc, rooms, occupied) {
  for (let i = 1; i < rooms.length - 1; i++) {
    if (occupied.has(i)) continue;
    if (_placeNpcInRoom(npc, rooms[i], false)) { occupied.add(i); return true; }
  }
  if (rooms.length >= 2) {
    const fallback = rooms.length - 2;
    if (_placeNpcInRoom(npc, rooms[fallback], false)) { occupied.add(fallback); return true; }
  }
  return false;
}

// Perce un couloir en L entre deux points. N'écrase que les murs
// (WALL → FLOOR) : les salles et cellules spéciales déjà posées sont
// préservées si le tracé les traverse.
function _carveCorridor(ax, ay, bx, by) {
  let cx = ax, cy = ay;
  while (cx !== bx) {
    if (cy >= 0 && cy < MAP_H && cx >= 0 && cx < MAP_W
        && dungeon[cy][cx] === CELL.WALL) dungeon[cy][cx] = CELL.FLOOR;
    cx += cx < bx ? 1 : -1;
  }
  while (cy !== by) {
    if (cy >= 0 && cy < MAP_H && cx >= 0 && cx < MAP_W
        && dungeon[cy][cx] === CELL.WALL) dungeon[cy][cx] = CELL.FLOOR;
    cy += cy < by ? 1 : -1;
  }
}

// Filet de sécurité de connexité. La topologie en arbre (épine + branches)
// garantit déjà que toutes les salles sont reliées ; cette passe couvre
// les cas dégradés (placement de dernier recours chevauchant qui décale
// un centre de salle). BFS depuis le spawn sur les cases non-WALL ; si
// STAIRS_D reste injoignable, perce un couloir de secours vers la case
// atteinte la plus proche. Appelée en fin de `generateDungeon`.
function _assertDungeonConnected() {
  if (typeof dungeon === 'undefined' || !dungeon.length) return true;
  let downX = -1, downY = -1;
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      if (dungeon[y][x] === CELL.STAIRS_D) { downX = x; downY = y; }
  if (downX < 0) return true;

  const seen  = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
  const queue = [[playerX, playerY]];
  seen[playerY][playerX] = true;
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (seen[ny][nx] || dungeon[ny][nx] === CELL.WALL) continue;
      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }
  if (seen[downY][downX]) return true;

  // Escalier injoignable → couloir de secours depuis la case atteinte
  // la plus proche (distance de Manhattan).
  let bx = playerX, by = playerY, best = Infinity;
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      if (seen[y][x]) {
        const d = Math.abs(x - downX) + Math.abs(y - downY);
        if (d < best) { best = d; bx = x; by = y; }
      }
  _carveCorridor(bx, by, downX, downY);
  return false;
}

// Cherche une alvéole creusable dans le mur : un triplet
// `FLOOR accessible → W1 (mur) → W2 (mur)` où W2 est un cul-de-sac
// (ses 3 autres voisins sont des murs). Sert aux salles bonus de la
// Phase 2/3 (coffre scellé, passage secret). Retourne {w1x,w1y,w2x,w2y}
// au hasard parmi les candidats, ou null.
function _findWallPocket() {
  const DIRS4 = [[1,0],[-1,0],[0,1],[0,-1]];
  const cands = [];
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      for (const [dx, dy] of DIRS4) {
        const w1x = x + dx,     w1y = y + dy;
        const w2x = x + 2 * dx, w2y = y + 2 * dy;
        if (w2x < 1 || w2x > MAP_W - 2 || w2y < 1 || w2y > MAP_H - 2) continue;
        if (dungeon[w1y][w1x] !== CELL.WALL) continue;
        if (dungeon[w2y][w2x] !== CELL.WALL) continue;
        let sealed = true;
        for (const [ex, ey] of DIRS4) {
          const nx = w2x + ex, ny = w2y + ey;
          if (nx === w1x && ny === w1y) continue;
          if (dungeon[ny][nx] !== CELL.WALL) { sealed = false; break; }
        }
        if (sealed) cands.push({ w1x, w1y, w2x, w2y });
      }
    }
  }
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
}

// Mélange Fisher-Yates en place — réutilisé par la génération des
// puzzles runiques (choix des cases + ordre de séquence).
function _shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Construit l'inscription-indice d'un puzzle runique ordonné : un vers
// thématique nommant les 3 runes dans l'ordre attendu. `order` est un
// tableau d'index dans RUNE_LABELS. Voir dungeon-enrichment-v2.md §2.3.
function _buildRuneHint(order) {
  const names = order.map(i => RUNE_LABELS[i].name);
  return "Une inscription serpente le long de la pierre : « Pour briser le "
       + `sceau, éveille les runes dans l'ordre du prisme — d'abord ${names[0]}, `
       + `puis ${names[1]}, enfin ${names[2]}. »`;
}

// Pose un puzzle runique sur l'étage courant (~20 % de chance) : 3 dalles
// RUNE sur des cases FLOOR ordinaires hors spawn + une alvéole-récompense
// `FLOOR → mur-barrière → CHEST` via `_findWallPocket`. La barrière reste
// CELL.WALL jusqu'à résolution (dissoute par `_activateRune`). ~½ des
// puzzles sont ordonnés (champ `order` + inscription-indice).
// Voir dungeon-enrichment-v2.md §1/§2.
function _generateRunePuzzle(rooms) {
  runePuzzle = null;
  litRunes   = new Set();
  // L'événement d'étage « Étage runique » force la génération (Phase 4.2).
  const forced = (typeof currentFloorEvent !== 'undefined'
    && currentFloorEvent === 'runique');
  if (!forced && Math.random() >= 0.20) return;
  const pocket = _findWallPocket();
  if (!pocket) return;
  const floorCells = [];
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (Math.abs(x - rooms[0].cx) <= 1 && Math.abs(y - rooms[0].cy) <= 1) continue;
      floorCells.push([x, y]);
    }
  }
  if (floorCells.length < 4) return;
  _shuffleInPlace(floorCells);
  const runeCells = floorCells.slice(0, 3);
  for (const [rx, ry] of runeCells) dungeon[ry][rx] = CELL.RUNE;
  // La 1re paroi de l'alvéole (`w1`) reste WALL — c'est la barrière ;
  // le coffre-récompense est scellé derrière en `w2`.
  dungeon[pocket.w2y][pocket.w2x] = CELL.CHEST;
  const runeKeys = runeCells.map(([rx, ry]) => `${rx},${ry}`);
  let order = null, hint = null, hintCell = null;
  if (Math.random() < 0.5) {
    order    = _shuffleInPlace([0, 1, 2]);
    hint     = _buildRuneHint(order);
    const hc = floorCells[3];
    hintCell = `${hc[0]},${hc[1]}`;
  }
  runePuzzle = {
    runes:      runeKeys,
    barrier:    `${pocket.w1x},${pocket.w1y}`,
    rewardCell: `${pocket.w2x},${pocket.w2y}`,
    order, hint, hintCell,
    solved:     false
  };
}

// Pose une stèle d'énigme sur l'étage courant (~30 % de chance) : une
// dalle STELE sur une case FLOOR ordinaire hors spawn + une alvéole
// `FLOOR → mur-barrière → CHEST` via `_findWallPocket`. Une devinette de
// `RIDDLES` est tirée ; sa bonne réponse dissout la barrière (cf.
// `answerRiddle` dans movement.js). Voir dungeon-enrichment-v2.md §3.
function _generateRuneStele(rooms) {
  runeStele = null;
  if (typeof RIDDLES === 'undefined' || !RIDDLES.length) return;
  // L'événement « Étage runique » force la stèle si aucune dalle-rune
  // n'a pu être posée (cf. generateDungeon — Phase 4.2/4.3).
  const forced = (typeof currentFloorEvent !== 'undefined'
    && currentFloorEvent === 'runique');
  if (!forced && Math.random() >= 0.30) return;
  const pocket = _findWallPocket();
  if (!pocket) return;
  const floorCells = [];
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (Math.abs(x - rooms[0].cx) <= 1 && Math.abs(y - rooms[0].cy) <= 1) continue;
      floorCells.push([x, y]);
    }
  }
  if (!floorCells.length) return;
  _shuffleInPlace(floorCells);
  const [sx, sy] = floorCells[0];
  dungeon[sy][sx] = CELL.STELE;
  dungeon[pocket.w2y][pocket.w2x] = CELL.CHEST;
  const riddle = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
  runeStele = {
    cell:       `${sx},${sy}`,
    riddleId:   riddle.id,
    barrier:    `${pocket.w1x},${pocket.w1y}`,
    rewardCell: `${pocket.w2x},${pocket.w2y}`,
    solved:     false
  };
}

// Instantané structurel des salles du dernier donjon généré (kind/rect).
// Hook de test (smoke) — non consommé par le moteur de jeu.
let lastDungeonRooms = [];

function generateDungeon(floor) {
  dungeon = Array.from({length:MAP_H}, () => Array(MAP_W).fill(CELL.WALL));
  visited = Array.from({length:MAP_H}, () => Array(MAP_W).fill(false));
  enemyMap = Array.from({length:MAP_H}, () => Array(MAP_W).fill(null));
  itemMap = Array.from({length:MAP_H}, () => Array(MAP_W).fill(null));
  npcPlacements = new Map();

  // Événement d'étage (Phase 4) : tiré une fois ici ; pilote la densité
  // d'ennemis, le nombre de coffres/pièges et la boutique ci-dessous.
  currentFloorEvent = (typeof rollFloorEvent === 'function') ? rollFloorEvent() : null;

  // ── Génération des salles : 7 salles sans chevauchement ───────
  // Map 16×16 (14×14 utile) → 7 salles, majoritairement 3×3, séparées
  // par une marge d'au moins 1 case. Un léger chevauchement reste
  // accepté en dernier recours (deux salles fusionnent — cosmétique,
  // jamais un softlock). 7 salles = épine de 4 + 3 culs-de-sac isolés.
  const ROOM_COUNT = 7;
  const rooms = [];
  for (let i = 0; i < ROOM_COUNT; i++) {
    let pick = null, free = false;
    for (let attempt = 0; attempt < 40 && !free; attempt++) {
      const rw = 3 + (Math.random() < 0.35 ? 1 : 0);
      const rh = 3 + (Math.random() < 0.35 ? 1 : 0);
      const rx = 1 + Math.floor(Math.random() * (MAP_W - rw - 2));
      const ry = 1 + Math.floor(Math.random() * (MAP_H - rh - 2));
      const cand = { x: rx, y: ry, w: rw, h: rh };
      const tooClose = rooms.some(o =>
        rx < o.x + o.w + 1 && rx + rw + 1 > o.x &&
        ry < o.y + o.h + 1 && ry + rh + 1 > o.y);
      if (!tooClose) { pick = cand; free = true; }
      else if (!pick) pick = cand;          // repli mémorisé
    }
    pick.cx = Math.floor(pick.x + pick.w / 2);
    pick.cy = Math.floor(pick.y + pick.h / 2);
    rooms.push(pick);
    for (let dy = pick.y; dy < pick.y + pick.h; dy++)
      for (let dx = pick.x; dx < pick.x + pick.w; dx++)
        dungeon[dy][dx] = CELL.FLOOR;
  }

  // ── Topologie en arbre : épine dorsale + branches en cul-de-sac ─
  // Épine = 4 salles reliées en série (spawn → milieu → escalier).
  // Branches = salles restantes, chacune greffée par un couloir sur la
  // salle d'épine la plus proche → cul-de-sac. Un arbre est connexe par
  // construction : l'escalier est toujours atteignable.
  const SPINE_LEN = 4;
  const spine    = rooms.slice(0, SPINE_LEN);
  const branches = rooms.slice(SPINE_LEN);
  spine[0].kind = 'spawn';
  spine[SPINE_LEN - 1].kind = 'stairs';
  for (let i = 1; i < SPINE_LEN - 1; i++) spine[i].kind = 'spine';
  for (const b of branches) b.kind = 'branch';

  // Couloirs de l'épine (en série)
  for (let i = 1; i < spine.length; i++) {
    _carveCorridor(spine[i - 1].cx, spine[i - 1].cy, spine[i].cx, spine[i].cy);
  }
  // Couloirs des branches → salle d'épine la plus proche
  for (const b of branches) {
    let near = spine[0], best = Infinity;
    for (const s of spine) {
      const d = Math.abs(s.cx - b.cx) + Math.abs(s.cy - b.cy);
      if (d < best) { best = d; near = s; }
    }
    _carveCorridor(near.cx, near.cy, b.cx, b.cy);
  }

  // Réordonne `rooms` en [spawn, …épine intermédiaire, …branches,
  // escalier] pour préserver les invariants aval : rooms[0] = spawn,
  // rooms[dernier] = salle de l'escalier descendant.
  rooms.length = 0;
  rooms.push(spine[0]);
  for (let i = 1; i < SPINE_LEN - 1; i++) rooms.push(spine[i]);
  for (const b of branches) rooms.push(b);
  rooms.push(spine[SPINE_LEN - 1]);

  // ── Cellules spéciales ────────────────────────────────────────
  // Escalier descendant sur la dernière salle d'épine. Salles d'épine
  // intermédiaires : coffre/boutique probabilistes. Salles-branches
  // (cul-de-sac) : cellule spéciale garantie → récompense du détour.
  dungeon[spine[SPINE_LEN - 1].cy][spine[SPINE_LEN - 1].cx] = CELL.STAIRS_D;
  // Événement « Veine de trésors » : double la probabilité de coffre en
  // épine ; « Marché ambulant » : force la boutique sur la salle d'épine.
  const chestP = (currentFloorEvent === 'tresor') ? 0.60 : 0.30;
  for (const r of rooms) {
    if (r.kind === 'spine') {
      if (currentFloorEvent === 'marche') { dungeon[r.cy][r.cx] = CELL.SHOP; continue; }
      const roll = Math.random();
      if (roll < chestP)             dungeon[r.cy][r.cx] = CELL.CHEST;
      else if (roll < chestP + 0.20) dungeon[r.cy][r.cx] = CELL.SHOP;
    } else if (r.kind === 'branch') {
      // Cul-de-sac : autel (~25 %) ou coffre garanti — récompense du détour.
      dungeon[r.cy][r.cx] = (Math.random() < 0.25) ? CELL.ALTAR : CELL.CHEST;
    }
  }

  // Instantané structurel pour les tests fumée.
  lastDungeonRooms = rooms.map(r => ({
    x: r.x, y: r.y, w: r.w, h: r.h, cx: r.cx, cy: r.cy, kind: r.kind
  }));

  // ── Pièges cachés (Phase 2 §2.A) ──────────────────────────────
  // 1-2 pièges posés sur des cases FLOOR ordinaires, hors d'un rayon
  // d'1 case autour du spawn. Invisibles : ils se déclenchent au passage
  // (handleCellEntry) ou se désamorcent par la fouille (searchRoom).
  {
    const trapCells = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (dungeon[y][x] !== CELL.FLOOR) continue;
        if (Math.abs(x - rooms[0].cx) <= 1 && Math.abs(y - rooms[0].cy) <= 1) continue;
        trapCells.push([x, y]);
      }
    }
    for (let i = trapCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trapCells[i], trapCells[j]] = [trapCells[j], trapCells[i]];
    }
    // « Étage piégé » : +2 pièges au-dessus de la base de 1-2.
    let trapCount = 1 + (Math.random() < 0.5 ? 1 : 0);
    if (currentFloorEvent === 'pieges') trapCount += 2;
    for (let i = 0; i < trapCount && i < trapCells.length; i++) {
      dungeon[trapCells[i][1]][trapCells[i][0]] = CELL.TRAP;
    }
  }

  // ── Salle scellée (§2.C) + passage secret (§3) ────────────────
  // Deux alvéoles `FLOOR → mur → CHEST` creusées dans le mur via
  // `_findWallPocket`. La 1re est fermée par une porte CELL.DOOR (clé) ;
  // la 2nde (~50 % des étages) par un mur secret laissé en CELL.WALL,
  // révélé par la fouille (searchRoom). Le coffre n'est atteignable
  // qu'en franchissant le gardien correspondant.
  let vaultPlaced = false;
  const vault = _findWallPocket();
  if (vault) {
    dungeon[vault.w1y][vault.w1x] = CELL.DOOR;
    dungeon[vault.w2y][vault.w2x] = CELL.CHEST;
    vaultPlaced = true;
  }
  secretWalls = new Set();
  if (Math.random() < 0.5) {
    const secret = _findWallPocket();
    if (secret) {
      // w1 reste CELL.WALL — mur secret, indiscernable jusqu'à la fouille.
      dungeon[secret.w2y][secret.w2x] = CELL.CHEST;
      secretWalls.add(`${secret.w1x},${secret.w1y}`);
    }
  }

  // Escalier montant (étage 2+)
  if(floor>1) dungeon[rooms[0].cy][rooms[0].cx] = CELL.STAIRS_U;

  // Salle fontaine — étages 2, 5, 8, 11, … (1 garantie)
  // Choisit une room intermédiaire (ni départ, ni dernière=stairs down)
  // et écrase ce qui s'y trouvait pour garantir l'apparition.
  if (floor >= 2 && (floor - 2) % 3 === 0 && rooms.length >= 3) {
    const candidates = rooms.slice(1, rooms.length - 1);
    const room       = candidates[Math.floor(Math.random() * candidates.length)];
    dungeon[room.cy][room.cx] = CELL.FOUNTAIN;
  }

  // Jardin d'herbes (Potions P6.b3) — étages 3, 6, 9, 12, … (décalé des
  // fontaines). Posé caché : la case est CELL.GARDEN mais sa clé
  // "étage,x,y" est ajoutée à `hiddenGardens` → se comporte comme du sol
  // jusqu'à révélation (Revelio / fouille). Voir potions-enrichment §P6.b3.
  if (floor >= 3 && (floor - 3) % 3 === 0
      && typeof hiddenGardens !== 'undefined') {
    // Posé sur une simple case FLOOR (jamais sur une cellule spéciale déjà
    // posée : boutique, coffre, fontaine, autel, escalier), à l'écart du
    // départ. Un jardin est une case marchable ordinaire, pas un centre de
    // salle — d'où le scan de toutes les cases FLOOR éloignées.
    const sx = rooms[0].cx, sy = rooms[0].cy;
    const floorCells = [];
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === CELL.FLOOR
            && (Math.abs(x - sx) + Math.abs(y - sy)) > 3) {
          floorCells.push([x, y]);
        }
      }
    }
    if (floorCells.length) {
      const [gx, gy] = floorCells[Math.floor(Math.random() * floorCells.length)];
      dungeon[gy][gx] = CELL.GARDEN;
      hiddenGardens.add(`${floor},${gx},${gy}`);
    }
  }

  // Endgame Tranche 2 : Forge des Ténèbres garantie aux floors 11, 14, 17, 20.
  // Bibliothèque interdite garantie aux floors 12, 15, 18 (cadence offset
  // pour ne pas overlap avec la Forge). Voir ENDGAME_PLAN.md §7.5 / §7.6.
  // Ne s'affichent qu'en post-victoire (utilisent les matériaux Ténèbres).
  const forgeFloors    = [11, 14, 17, 20];
  const libraryFloors  = [12, 15, 18];
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && rooms.length >= 3) {
    const intermediate = rooms.slice(1, rooms.length - 1);
    if (forgeFloors.includes(floor)) {
      const room = intermediate[Math.floor(Math.random() * intermediate.length)];
      dungeon[room.cy][room.cx] = CELL.FORGE;
    } else if (libraryFloors.includes(floor)) {
      const room = intermediate[Math.floor(Math.random() * intermediate.length)];
      dungeon[room.cy][room.cx] = CELL.LIBRARY;
    }
  }

  // Puzzle runique (dungeon-enrichment-v2 §1/§2) — placé après toutes les
  // cellules spéciales pour que les dalles RUNE ne tombent que sur des
  // cases FLOOR ordinaires. `_generateRunePuzzle` (re)met `runePuzzle` et
  // `litRunes` à leur état initial à chaque génération.
  _generateRunePuzzle(rooms);
  // Stèle d'énigme (dungeon-enrichment-v2 §3) — au plus UN puzzle par
  // étage (dosage §4.3) : la stèle n'est tentée que si aucune dalle-rune
  // n'a été posée. (re)met `runeStele` à l'état initial à chaque appel.
  if (!runePuzzle) _generateRuneStele(rooms);
  else runeStele = null;

  // Réinitialise les fontaines utilisées : nouvelle visite = nouvelle eau.
  usedFountains = new Set();
  // Réinitialise les autels utilisés : 1 usage par visite d'étage.
  usedAltars = new Set();
  // Réinitialise les actions spéciales PNJ (Fumseck, etc.).
  usedSpecialNpcs = new Set();

  // Placement des PNJ majeurs à étage fixe — registre dans npcs.js.
  // Ordre stable (premier inscrit = priorité), salle de spawn pour les
  // PNJ d'introduction, sinon première salle intermédiaire libre, repli
  // sur l'avant-dernière salle si toutes occupées.
  const occupied = new Set();
  if (typeof getNpcsForFloor === 'function') {
    const npcsHere = getNpcsForFloor(floor);
    for (const npc of npcsHere) {
      const anchor = (npc.placement && npc.placement.anchor) || 'any';
      let placed = false;
      if (anchor === 'first-room') {
        placed = _placeNpcInRoom(npc, rooms[0], true);
        if (placed) occupied.add(0);
      } else {
        for (let i = 1; i < rooms.length - 1; i++) {
          if (occupied.has(i)) continue;
          if (_placeNpcInRoom(npc, rooms[i], false)) {
            occupied.add(i); placed = true; break;
          }
        }
        if (!placed && rooms.length >= 2) {
          // Repli : avant-dernière room (peut écraser une salle déjà occupée)
          const fallback = rooms.length - 2;
          if (_placeNpcInRoom(npc, rooms[fallback], false)) {
            occupied.add(fallback); placed = true;
          }
        }
      }
    }
  }

  // Rencontres aléatoires — deux tirages indépendants par étage :
  //   1) Donneur de quête répétable (70 %) : pool dédié pour que ces
  //      quêtes soient découvrables de façon fiable. On ne tire que parmi
  //      les donneurs dont la quête est offrable ou prête à rendre, pour
  //      que chaque spawn forcé montre vraiment une quête actionnable.
  //   2) PNJ ambiant vendeur/lore (50 %) : saveur d'exploration.
  // Cf. .claude/plans/repeatable-quest-spawn.md.
  if (Math.random() < 0.70 && typeof getRandomQuestGiversForFloor === 'function') {
    let givers = getRandomQuestGiversForFloor(floor);
    if (typeof getNpcQuestState === 'function') {
      givers = givers.filter(n => {
        const st = getNpcQuestState(n);
        return st === 'offer' || st === 'ready';
      });
    }
    if (givers.length) {
      const npc = givers[Math.floor(Math.random() * givers.length)];
      _placeRandomNpcInRooms(npc, rooms, occupied);
    }
  }

  if (Math.random() < 0.50 && typeof getRandomAmbientNpcsForFloor === 'function') {
    const pool = getRandomAmbientNpcsForFloor(floor);
    if (pool.length) {
      const npc = pool[Math.floor(Math.random() * pool.length)];
      _placeRandomNpcInRooms(npc, rooms, occupied);
    }
  }

  // ── Marchand d'Ombre (sinks endgame Piste E) ───────────────────
  // Spawn rare et dédié sur les étages 11+ (boucle ténébreuse).
  // 10 % par génération — déclenché indépendamment des pools ambiants.
  // Voir .claude/plans/game-economy-gold-audit.md §5.6 Piste E.
  if (floor >= 11 && Math.random() < 0.10 && typeof getNpcById === 'function') {
    const npc = getNpcById('marchand_ombre');
    if (npc) _placeRandomNpcInRooms(npc, rooms, occupied);
  }

  // Sélection des ennemis éligibles à cet étage (rebase sur relFloor
  // en post-victoire pour la Boucle Ténébreuse — §7.2).
  const ef = effectiveFloor(floor);
  const eligibleTypes = MONSTERS.filter(m =>
    m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor)
  );
  const pool = eligibleTypes.length ? eligibleTypes : MONSTERS;

  // Densité d'ennemis pilotée par l'événement d'étage : « Étage hanté »
  // sature les salles, « Quiétude » les vide en partie.
  const enemyChance = currentFloorEvent === 'hante' ? 0.85
                    : currentFloorEvent === 'calme' ? 0.30 : 0.60;
  for(let r of rooms.slice(1)) {
    if(Math.random()<enemyChance) {
      const ex = r.x+Math.floor(Math.random()*r.w);
      const ey = r.y+Math.floor(Math.random()*r.h);
      // Jamais d'ennemi sur la case de spawn : avec un chevauchement de
      // dernier recours, une salle de `slice(1)` peut couvrir le centre
      // de la salle de départ. Garde cohérente avec _ensureStairsExist
      // / spawnQuestMonsters / _findFreeNpcCell.
      const onSpawn = ex === rooms[0].cx && ey === rooms[0].cy;
      if(dungeon[ey][ex]===CELL.FLOOR && !onSpawn) {
        enemyMap[ey][ex] = scaleMonster(weightedPick(pool), floor);
      }
    }
  }

  // Clé de la salle scellée : attribuée aux drops d'un monstre de l'étage
  // (chance garantie). Sans monstre sur l'étage, la salle reste close.
  if (vaultPlaced) {
    const mobs = [];
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++)
        if (enemyMap[y][x]) mobs.push(enemyMap[y][x]);
    if (mobs.length) {
      const bearer = mobs[Math.floor(Math.random() * mobs.length)];
      bearer.drops = (bearer.drops || []).concat([{ itemId: 'cle_donjon', chance: 1 }]);
    }
  }

  // Position de départ du joueur
  playerX = rooms[0].cx;
  playerY = rooms[0].cy;
  playerDir = 'n';
  visited[playerY][playerX] = true;

  // Cibles de quêtes actives : si une étape `kill` non terminée existe
  // pour une quête déclarant `spawnOnAccept`, on garantit la présence de
  // la cible (couvre les saves antérieures au hook spawnOnAccept).
  if (typeof _ensureActiveKillQuestTargets === 'function') {
    _ensureActiveKillQuestTargets(floor);
  }

  // Garde-fou : si la génération a écrasé un escalier (collision
  // rooms[0]/rooms[last] = mêmes centres), on en replace un.
  _ensureStairsExist(floor);

  // Filet de sécurité de connexité : garantit que l'escalier descendant
  // est atteignable depuis le spawn (perce un couloir de secours sinon).
  _assertDungeonConnected();

  // Page du grimoire d'Élara (quête manon_grimoire) si applicable.
  _ensurePagePlacement(floor);
}

// Pose le feuillet (page) de l'étage `floor` du set de pages actif si un
// set est en jeu (Acte II ou Acte III, via _activePageSet), que le feuillet
// n'est pas déjà ramassé, et qu'aucune position n'a encore été fixée pour
// cet étage. Position déterministe (seed par étage) sur une case FLOOR
// ordinaire. Cf. manon-grimoire-pages.md §5 + manon-grimoire-easter-egg.md §4.
function _ensurePagePlacement(floor) {
  const set = (typeof _activePageSet === 'function') ? _activePageSet() : null;
  if (!set || !set.floors.includes(floor)) return;
  if (typeof pagePlacements === 'undefined' || pagePlacements.has(floor)) return;
  const page = set.pages.find(p => p.floor === floor) || null;
  if (!page) return;
  if (player && Array.isArray(player.grimoirePages)
      && player.grimoirePages.includes(page.id)) return;
  const candidates = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (enemyMap[y] && enemyMap[y][x]) continue;
      if (x === playerX && y === playerY) continue;
      candidates.push(y * MAP_W + x);
    }
  }
  if (!candidates.length) return;
  candidates.sort((a, b) => a - b);
  const cell = candidates[(floor * 7919) % candidates.length];
  pagePlacements.set(floor, `${cell % MAP_W},${Math.floor(cell / MAP_W)}`);
}

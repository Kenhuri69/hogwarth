// ============================================================
// GÉNÉRATEUR DE DONJON
// ============================================================

// ── Configuration du scaling endgame (Boucle Ténébreuse) ─────
// Formule récursive appliquée aux monstres post-victoire (floor 11+).
//
//   stat(0) = base × (1 + (relFloor − 1) × scale) × diffMult        (≡ scaling actuel)
//   stat(n) = stat(n−1) × scal(n) + baseFix_eff                     (récursion par palier de 10)
//
// avec
//   n           = ⌊(floor − 1) / 10⌋                                (0 pour 1-10, 1 pour 11-20, …)
//   relFloor    = effectiveFloor(floor)                              (1-10 dans chaque palier)
//   intraMult   = 1 + (relFloor − 1) × scale                         (scaling intra-palier)
//   scal(n)     = 1 + scalDelta / intraMult                          (mult lissé)
//   baseFix_eff = baseFix[stat] / intraMult                          (bonus lissé)
//
// Le lissage par `intraMult` réduit proportionnellement l'apport
// du bonus (+ multiplicateur) sur les monstres déjà fortement scalés
// (Voldemort relF=10, intraMult=4.6 → bonus ÷4.6) et le maximise sur
// les monstres faibles (Chat relF=1, intraMult=1 → bonus complet).
//
// TODO : à l'avenir, `scalDelta` pourrait dépendre de `n` pour rendre
//        la croissance plus agressive aux paliers profonds (palier 5+).
//        Actuellement constant à 0.5.
const ENDGAME_SCALING = {
  baseFix: { hp: 80, atk: 10, def: 5, mag: 8, xp: 50, gold: 80 },
  scalDelta: 0.5,
};

// Récursion endgame : applique `(stat × scal + fixEff)` exactement `n` fois.
// Implémentation récursive pour refléter la spec du joueur. Le coût est nul
// (n ≤ ~10 en pratique).
function _endgameRecurse(stat, n, fixEff, scal) {
  if (n <= 0) return stat;
  return _endgameRecurse(stat * scal + fixEff, n - 1, fixEff, scal);
}

// ── Utilitaires de sélection et mise à l'échelle ─────────────

// Tirage pondéré selon la propriété weight de chaque monstre
function weightedPick(pool) {
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= (m.weight || 1); if (r <= 0) return m; }
  return pool[pool.length - 1];
}

// Boucle Ténébreuse (endgame) : à floor 11+ post-victoire, on rejoue
// la progression 1-10 à l'identique (pool + scaling). Voir ENDGAME_PLAN.md §7.2.
// Retourne `floor` inchangé si pré-victoire ou floor ≤ 10.
function effectiveFloor(floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && floor >= 11) {
    return floor - 10;     // 11 → 1, 12 → 2, …, 20 → 10, 21 → 11, …
  }
  return floor;
}

// Indice de palier endgame : 0 pour pré-victoire (floors 1-10), 1 pour
// le premier palier Ténèbres (11-20), 2 pour le 2e (21-30), etc.
// Utilisé comme « n » dans la formule récursive du scaling.
function endgameTierIndex(floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && floor >= 11) {
    return Math.floor((floor - 1) / 10);   // 1 pour 11-20, 2 pour 21-30, …
  }
  return 0;
}

// Applique la mise à l'échelle d'un monstre de base pour un étage donné.
//
// Pré-victoire (n=0) : stat = base × intraMult × diffMult — comportement inchangé.
// Post-victoire (n≥1) : récursion endgame `_endgameRecurse(stat0, n, fixEff, scal)`
// avec `scal` et `fixEff` lissés par `intraMult` (cf. ENDGAME_SCALING en haut).
function scaleMonster(base, floor) {
  const ef        = effectiveFloor(floor);
  const isDark    = (ef !== floor);
  const n         = endgameTierIndex(floor);
  const diffMult  = (DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal']).scalingMultiplier;
  const scale     = base.scale || 0.25;
  const intraMult = 1 + (ef - 1) * scale;
  const mult      = intraMult * diffMult;

  // Précalculs récursion (no-op si n=0 — recurse retourne stat tel quel).
  const scal      = 1 + ENDGAME_SCALING.scalDelta / intraMult;
  function recurse(stat0, fixKey) {
    if (n <= 0) return stat0;
    const fixEff = ENDGAME_SCALING.baseFix[fixKey] / intraMult;
    return _endgameRecurse(stat0, n, fixEff, scal);
  }

  const monster = JSON.parse(JSON.stringify(base));
  monster.hp  = Math.floor(recurse(base.hp  * mult, 'hp'));
  monster.atk = Math.floor(recurse(base.atk * mult, 'atk'));
  monster.def = Math.floor(recurse(base.def * mult, 'def'));
  monster.xp  = Math.floor(recurse(base.xp  * mult, 'xp'));
  if (typeof base.gold === 'object') {
    const { min, max } = base.gold;
    monster.gold = Math.floor(recurse((min + Math.random() * (max - min)) * mult, 'gold'));
  } else {
    monster.gold = Math.floor(recurse(base.gold * mult, 'gold'));
  }
  // mag : non scalée par intraMult dans la formule actuelle (constante),
  // mais participe à la récursion endgame pour évoluer avec les paliers.
  if (n > 0 && base.mag) {
    monster.mag = Math.floor(_endgameRecurse(base.mag, n,
      ENDGAME_SCALING.baseFix.mag / intraMult, scal));
  }

  // ── Variante visuelle ────────────────────────────────────────
  // 4 % de chance d'obtenir un monstre "shiny" (rare doré)
  const shinyRoll = Math.random();
  if (shinyRoll < 0.04) {
    monster.variant = 'shiny';
    monster.name    = '✨ ' + base.name;
    monster.xp      = Math.floor(monster.xp  * 1.5);
    monster.gold    = Math.floor(monster.gold * 2.0);
    if (monster.drops) {
      monster.drops = monster.drops.map(d => ({ ...d, chance: Math.min(1, d.chance * 2) }));
    }
  } else if (isDark) {
    // Ténébreux : la récursion endgame ci-dessus a déjà appliqué le
    // boost de stats. On garde uniquement le préfixe et la metadata
    // pour le rendu (CSS halo violet, badge 🌑). Plus de multiplicateurs
    // séparés (×1.5 HP / ×1.12 ATK / etc.) — tout passe par scal+fix.
    monster.variant = 'darkness';
    monster.name    = 'Ténébreux ' + base.name;
  } else if (floor >= 5) {
    monster.variant = 'ancient';
    monster.name    = 'Ancien ' + base.name;
  } else if (floor >= 3) {
    monster.variant = 'fierce';
    monster.name    = 'Féroce ' + base.name;
  } else {
    monster.variant = 'normal';
  }

  return monster;
}

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

  // Page du grimoire de Sandrine (quête manon_grimoire) si applicable.
  _ensurePagePlacement(floor);
}

// Pose la page de grimoire de l'étage `floor` si la quête manon_grimoire
// est active, que la page n'est pas déjà ramassée, et qu'aucune position
// n'a encore été fixée pour cet étage. Position déterministe (seed par
// étage) sur une case FLOOR ordinaire. Cf. manon-grimoire-pages.md §5.
function _ensurePagePlacement(floor) {
  if (typeof PAGE_FLOORS === 'undefined' || !PAGE_FLOORS.includes(floor)) return;
  if (typeof pagePlacements === 'undefined' || pagePlacements.has(floor)) return;
  const questActive = typeof activeQuests !== 'undefined'
    && activeQuests.some(q => q.id === 'manon_grimoire');
  if (!questActive) return;
  const page = (typeof getGrimoirePageForFloor === 'function')
    ? getGrimoirePageForFloor(floor) : null;
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

// Spawn ciblé pour quête à l'acceptation. Place 1 monstre cible (par id) +
// `extraRandomCount` monstres aléatoires éligibles à l'étage courant, sur
// des cellules FLOOR libres de `enemyMap`. Tolérant : place ce qui rentre
// si pas assez de cases libres. Retourne le nombre de mobs placés.
function spawnQuestMonsters(targetMonsterId, extraRandomCount) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;

  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (enemyMap[y][x]) continue;
      if (x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  if (!free.length) return 0;

  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }

  let placed = 0;
  const target = MONSTERS.find(m => m.id === targetMonsterId);
  if (target && free.length) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(target, floor);
    placed++;
  }

  const efFloor = effectiveFloor(floor);
  const pool = MONSTERS.filter(m =>
    m.minFloor <= efFloor && (m.maxFloor === null || efFloor <= m.maxFloor)
  );
  for (let i = 0; i < extraRandomCount && free.length && pool.length; i++) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(weightedPick(pool), floor);
    placed++;
  }

  return placed;
}

// Variante farming : place `count` copies du monstre `targetMonsterId` sur
// des cases FLOOR libres, sans extra random. Utilisée à l'acceptation d'une
// quête farming kill. Tolérant : retourne le nombre effectivement placé.
function spawnFarmingMonsters(targetMonsterId, count) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
  const target = MONSTERS.find(m => m.id === targetMonsterId);
  if (!target) return 0;

  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (enemyMap[y][x]) continue;
      if (x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  let placed = 0;
  for (let i = 0; i < count && free.length; i++) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(target, floor);
    placed++;
  }
  return placed;
}

// Garantit que les cibles des quêtes "kill" actives avec `spawnOnAccept`
// sont présentes sur l'étage courant. Comble le manque entre `step.amount`
// et (progress + instances déjà dans `enemyMap`). Idempotente : no-op si
// toutes les cibles sont déjà là.
//
// Couvre :
//  - les vieilles saves où la quête a été acceptée avant l'ajout du hook
//    `spawnOnAccept` (cas du joueur sans Chouette Ensorcelée à l'étage 4
//    pour `chouette_perdue`),
//  - le respawn d'une cible multi-amount tuée par un kill non-quête
//    (ex. attaque collatérale, AoE).
//
// Appelée depuis `generateDungeon` (génération initiale) et
// `_restoreFloorFromCache` (retour sur un étage déjà visité). Retourne
// le nombre de cibles ajoutées.
function _ensureActiveKillQuestTargets(floor) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  if (typeof activeQuests === 'undefined' || !activeQuests.length) return 0;
  if (typeof QUEST_TEMPLATES === 'undefined' || typeof MONSTERS === 'undefined') return 0;

  let added = 0;
  for (const q of activeQuests) {
    const tpl = QUEST_TEMPLATES.find(t => t.id === q.id);
    if (!tpl || !tpl.spawnOnAccept) continue;
    const targetId = tpl.spawnOnAccept.targetMonsterId;
    if (!targetId) continue;
    const step = (q.objectives || []).find(o =>
      o.type === 'kill' && o.monsterId === targetId && !o.completed
    );
    if (!step) continue;

    let present = 0;
    for (let y = 0; y < enemyMap.length; y++) {
      for (let x = 0; x < enemyMap[y].length; x++) {
        if (enemyMap[y][x] && enemyMap[y][x].id === targetId) present++;
      }
    }
    const need = Math.max(0, step.amount - (step.progress | 0) - present);
    for (let i = 0; i < need; i++) {
      const placed = spawnQuestMonsters(targetId, 0);
      if (!placed) break; // plus de cases FLOOR libres
      added += placed;
    }
  }
  return added;
}

// Garantit la présence de STAIRS_D (toujours) et STAIRS_U (si floor>1)
// sur l'étage courant. Couvre deux cas :
//  - bug de génération : si rooms[0].center === rooms[last].center, alors
//    STAIRS_U (ligne 125) écrasait STAIRS_D (ligne 116) → softlock,
//  - vieilles saves dont le cache contient un étage softlocké.
//
// Place les escaliers manquants sur une case FLOOR libre (jamais sur
// SHOP/CHEST/NPC/FOUNTAIN ni sur la case du joueur). Idempotent.
// Appelée depuis `generateDungeon`, `_restoreFloorFromCache` et `_applyState`.
function _ensureStairsExist(floor) {
  if (typeof dungeon === 'undefined' || !dungeon || !dungeon.length) return 0;
  let hasDown = false, hasUp = false;
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] === CELL.STAIRS_D) hasDown = true;
      if (dungeon[y][x] === CELL.STAIRS_U) hasUp   = true;
    }
  }
  const needDown = !hasDown;
  const needUp   = !hasUp && (floor || 1) > 1;
  if (!needDown && !needUp) return 0;

  // Pool de cases FLOOR éligibles (hors joueur)
  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (typeof playerX === 'number' && x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  if (!free.length) return 0;

  // Shuffle Fisher-Yates pour des placements non corrélés
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }

  let added = 0;
  if (needDown && free.length) {
    const c = free.pop();
    dungeon[c.y][c.x] = CELL.STAIRS_D;
    added++;
  }
  if (needUp && free.length) {
    const c = free.pop();
    dungeon[c.y][c.x] = CELL.STAIRS_U;
    added++;
  }
  return added;
}

// Repère les PNJ qui devraient être placés à l'étage courant (selon
// `getNpcsForFloor`) mais absents de `npcPlacements`. Les place sur
// une cellule FLOOR libre. Permet aux saves antérieures à un ajout
// de PNJ (ex : Dumbledore, chaîne d'épreuves Phase 3) de "voir
// apparaître" le PNJ manquant au prochain passage sur l'étage.
//
// Appelée depuis `_applyState` (étage courant à la restauration de
// la save) et `_restoreFloorFromCache` (à chaque retour sur un étage
// déjà visité). Idempotente : si tous les PNJ attendus sont déjà
// présents, no-op. Retourne le nombre de PNJ ajoutés.
function _migrateMissingNpcsForFloor(floor) {
  if (typeof dungeon === 'undefined' || typeof npcPlacements === 'undefined') return 0;
  if (typeof getNpcsForFloor !== 'function') return 0;

  const present = new Set();
  for (const npcId of npcPlacements.values()) present.add(npcId);

  const expected = getNpcsForFloor(floor) || [];
  let added = 0;
  for (const npc of expected) {
    if (!npc || !npc.id) continue;
    if (present.has(npc.id)) continue;
    // Anchor 'first-room' : on cherche en priorité dans le quart haut-gauche
    // du donjon (proxy raisonnable de la première salle). Sinon n'importe
    // quelle case FLOOR libre.
    const isFirstRoom = (npc.placement && npc.placement.anchor) === 'first-room';
    const cell = _findFreeNpcCell(isFirstRoom);
    if (!cell) continue;
    dungeon[cell.y][cell.x] = CELL.NPC;
    npcPlacements.set(`${cell.x},${cell.y}`, npc.id);
    if (typeof visited !== 'undefined' && visited[cell.y]) {
      visited[cell.y][cell.x] = true;
    }
    present.add(npc.id);
    added++;
  }
  return added;
}

// Cherche une cellule FLOOR libre pour y placer un PNJ. Évite la case
// joueur, les cellules avec ennemi/item/PNJ déjà posé. Si `preferEarly`
// est vrai (anchor 'first-room'), parcourt en spirale depuis le coin
// haut-gauche pour rester proche du spawn.
function _findFreeNpcCell(preferEarly) {
  if (typeof dungeon === 'undefined' || !dungeon.length) return null;
  const H = dungeon.length, W = dungeon[0].length;
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (typeof playerX !== 'undefined' && x === playerX && y === playerY) continue;
      if (npcPlacements && npcPlacements.has(`${x},${y}`)) continue;
      if (typeof enemyMap !== 'undefined' && enemyMap[y] && enemyMap[y][x]) continue;
      if (typeof itemMap !== 'undefined'  && itemMap[y]  && itemMap[y][x])  continue;
      candidates.push({ x, y });
    }
  }
  if (!candidates.length) return null;
  if (preferEarly) {
    // Tri par distance au coin (0,0) → favorise la première salle
    candidates.sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y));
    return candidates[0];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

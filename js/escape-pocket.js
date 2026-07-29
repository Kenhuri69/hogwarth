// ─────────────────────────────────────────────────────────────────────────
// Escape Game via pièges — Poches du Sceau (LOT 1 : cœur technique)
// Plan : .claude/plans/escape-game-traps.md
//
// À partir de l'étage 11 (Boucle Ténébreuse, post-victoire), un piège peut, au
// lieu de l'embuscade/dégâts habituels, projeter le groupe dans une POCHE DU
// SCEAU : un étage caché temporaire (écho figé du scellement des Fondateurs)
// d'où l'on ne ressort qu'en franchissant la « faille du sceau » (CELL.SEAL_RIFT).
//
// LOT 1 = lifecycle seulement : entrée (snapshot + swap d'arrays), génération
// d'une poche minimale (« atteins la faille »), sortie (restauration), gate,
// flags sérialisés. Les vraies épreuves (énigmes/miroir/écho sous pression),
// l'immersion (transition dédiée, HUD) et les récompenses fines arrivent aux
// lots 2-4. Le module est défensif : tout call-site externe est gardé.
// ─────────────────────────────────────────────────────────────────────────

// Calibration (équilibrage affiné au Lot 5).
const ESCAPE_POCKET_CHANCE = 0.25;  // part du tirage piège → Poche (gate ci-dessous)
const ESCAPE_MALUS_STEPS   = 20;    // pas de malus « corruption » en cas d'échec (Lot 3)
const ESCAPE_MALUS_MULT    = 0.85;  // −15 % ATK/DEF/MAG pendant le malus (Lot 3)
const ESCAPE_STELE_COUNT   = 3;     // Type A « L'Énigme des Quatre » : 3 stèles
const ESCAPE_BUDGET_BASE   = 40;    // budget de pas de base (jauge de corruption)
const ESCAPE_BUDGET_FLOOR  = 18;    // plancher du budget (difficulté max)
const ESCAPE_WRONG_FRAC    = 0.15;  // mauvaise réponse → +15 % de corruption
const ESCAPE_BUDGET_HOUSE  = 1.20;  // House-match : +20 % de budget (« la salle te reconnaît »)
const ESCAPE_WARDEN_BUDGET_MULT  = 0.70;  // Type C : pression accrue (budget serré)
const ESCAPE_BRAZIER_REFUND_FRAC = 0.15;  // brasier allumé → rend ~15 % de budget

// Tirage de type biaisé Maison (Lot 3). Chaque Poche est thématisée par un
// Fondateur ; le type d'épreuve en découle. Cf. plan §2.1 (House-aware).
const ESCAPE_FOUNDERS      = ['godric', 'rowena', 'salazar', 'helga'];
const ESCAPE_FOUNDER_TYPE  = { godric: 'warden', rowena: 'riddle', salazar: 'mirror', helga: 'warden' };
const ESCAPE_HOUSE_FOUNDER = { Gryffondor: 'godric', Serdaigle: 'rowena', Serpentard: 'salazar', Poufsouffle: 'helga' };

// ── Immersion & récompenses (Lot 4) ────────────────────────────────────────
// Murmure du Fondateur joué à la transition (canon echo_scellement). Voix via
// AudioSystem.speakBark (repli synthèse FR si aucun OGG). `key` = clé voix.
const ESCAPE_FOUNDER_VOICE = {
  godric:  { key: 'founder_godric',  line: 'On ne scelle pas par peur. On tient la porte.' },
  rowena:  { key: 'founder_rowena',  line: 'Comprends, et la faille apparaît.' },
  salazar: { key: 'founder_salazar', line: 'J\'ai scellé ma part avec ma faute.' },
  helga:   { key: 'founder_helga',   line: 'J\'ai creusé un abri pour ceux qui restent.' },
};
// Livre élémentaire affilié au Fondateur (butin garanti — pool loop existant).
const ESCAPE_FOUNDER_BOOK = {
  godric: 'livre_fulgari', rowena: 'livre_glacius',
  salazar: 'livre_prince', helga: 'livre_lumos_solem',
};
// Sort exclusif des Ruines enseigné en avance en House-match (déjà enseigné par
// stèle ét.21+). Mapping thématique : Godric→verbe ultime, Rowena→rejeu,
// Salazar→écho de soi (miroir), Helga→restauration (refuge).
const ESCAPE_FOUNDER_SPELL = {
  godric: 'Le Mot du Dormeur', rowena: 'Tempus Echo',
  salazar: 'Écho Fantôme',     helga: 'Reliquae Temporis',
};
// Matériaux Forge/Biblio (pool loop) — repli de butin non-livre.
const ESCAPE_MATERIAL_POOL = ['essence_tenebres', 'page_grimoire'];

// ── Helpers PURS (testables hors navigateur — units.js) ────────────────────
// Budget de pas (jauge de corruption) selon la profondeur de Boucle.
// Plus on descend, plus le budget rétrécit (pression temporelle accrue).
function computeEscapeStepBudget(depth) {
  const d = (typeof depth === 'number' && depth > 0) ? depth : 1;
  return Math.max(ESCAPE_BUDGET_FLOOR, ESCAPE_BUDGET_BASE - 2 * d);
}

// Pourcentage de corruption (jauge HUD) à partir des pas consommés/budget.
function escapeCorruptionPct(spent, budget) {
  if (!(budget > 0)) return 0;
  const pct = Math.round((spent / budget) * 100);
  return Math.max(0, Math.min(100, pct));
}

// Multiplicateur du malus « Corruption » (échec standard, Lot 3). Tant que le
// décompte de pas est positif, ATK/DEF/MAG sont rabotées de 15 %. PUR.
function corruptionMalusMult(steps) {
  return (typeof steps === 'number' && steps > 0) ? ESCAPE_MALUS_MULT : 1;
}

// Budget rendu par un brasier allumé (Type C — « la lumière tient la peur »).
// ~15 % du budget total, plancher 1. PUR.
function escapeBrazierRefund(budget) {
  const b = (typeof budget === 'number' && budget > 0) ? budget : 0;
  return Math.max(1, Math.round(b * ESCAPE_BRAZIER_REFUND_FRAC));
}

// Tirage du type de Poche + Fondateur, biaisé 1 fois sur 2 vers la Maison du
// héros (Lot 3). PUR & testable : `rng` injectable (défaut Math.random),
// `chosenHouse` passé en argument. Retourne { type, founder, houseMatch }.
function pickEscapePocketType(rng, chosenHouseArg) {
  const r = (typeof rng === 'function') ? rng : Math.random;
  const houseFounder = ESCAPE_HOUSE_FOUNDER[chosenHouseArg] || null;
  let founder;
  if (houseFounder && r() < 0.5) {
    founder = houseFounder;                       // biais Maison 1 fois sur 2
  } else {
    const idx = Math.floor(r() * ESCAPE_FOUNDERS.length) % ESCAPE_FOUNDERS.length;
    founder = ESCAPE_FOUNDERS[idx];
  }
  return {
    founder,
    type:       ESCAPE_FOUNDER_TYPE[founder] || 'riddle',
    houseMatch: !!(houseFounder && founder === houseFounder),
  };
}

// Trackers internes (non sérialisés — cap par visite d'étage + cooldown).
let _escapeFloorTracker        = null;
let _escapePocketUsedThisFloor = false;
let _lastEscapePocketFloor     = null;

// ── Gate pur (testable hors navigateur — units.js) ─────────────────────────
// Décide si une Poche PEUT se déclencher (avant le tirage de chance).
function canTriggerEscapePocket(ctx) {
  if (!ctx) return false;
  if (!ctx.victoryAchieved) return false;          // Boucle Ténébreuse uniquement
  if (!(ctx.floor >= 11)) return false;            // étages 11+
  if (ctx.inPocket) return false;                  // pas de Poche dans une Poche
  if (ctx.usedThisFloor) return false;             // cap : 1 Poche / visite d'étage
  if (ctx.visitor) return false;                   // pas en visite inter-mondes
  // Cooldown : pas deux étages consécutifs (anti-fatigue).
  if (ctx.lastPocketFloor != null
      && Math.abs(ctx.floor - ctx.lastPocketFloor) <= 1) return false;
  return true;
}

// ── Décision + déclenchement (appelé depuis _triggerDungeonTrap) ───────────
// Retourne true si une Poche a été ouverte (l'effet de piège normal est alors
// court-circuité par l'appelant).
function maybeTriggerEscapePocket() {
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
  // Réinitialise le cap par étage quand on change d'étage.
  if (floor !== _escapeFloorTracker) {
    _escapeFloorTracker = floor;
    _escapePocketUsedThisFloor = false;
  }
  const ctx = {
    victoryAchieved: (typeof victoryAchieved !== 'undefined' && victoryAchieved),
    floor,
    inPocket: (typeof inEscapePocket !== 'undefined' && inEscapePocket),
    usedThisFloor: _escapePocketUsedThisFloor,
    visitor: (typeof visitSession !== 'undefined' && visitSession
              && visitSession.role === 'visitor'),
    lastPocketFloor: _lastEscapePocketFloor
  };
  if (!canTriggerEscapePocket(ctx)) return false;
  // Garde-fou : groupe vivant (jamais de téléport sur un wipe).
  const alive = (typeof party !== 'undefined')
    ? party.slice(0, (typeof partySize === 'number') ? partySize : party.length)
        .some(c => c && c.hp > 0)
    : true;
  if (!alive) return false;
  if (Math.random() >= ESCAPE_POCKET_CHANCE) return false;
  const ch = (typeof chosenHouse !== 'undefined') ? chosenHouse : null;
  const pick = pickEscapePocketType(Math.random, ch);
  enterEscapePocket(pick.type, pick);
  return true;
}

// ── Instantané / restauration de l'état d'étage ────────────────────────────
// Les arrays du donjon sont REMPLACÉS (pas mutés) par la poche : on peut donc
// conserver des références dans l'instantané. Les Set/Map sont stockés en
// tableaux pour rester sérialisables (save mid-poche). Cf. plan Lot 1.
function _captureFloorState() {
  return {
    floor:        currentFloor,
    dungeon, visited, enemyMap, itemMap,
    px: playerX, py: playerY, dir: playerDir,
    floorEvent:   (typeof currentFloorEvent !== 'undefined') ? currentFloorEvent : null,
    runePuzzle:   (typeof runePuzzle !== 'undefined') ? runePuzzle : null,
    runeStele:    (typeof runeStele !== 'undefined') ? runeStele : null,
    secretWalls:  (typeof secretWalls !== 'undefined') ? Array.from(secretWalls) : [],
    litRunes:     (typeof litRunes !== 'undefined') ? Array.from(litRunes) : [],
    searchedCells:(typeof searchedCells !== 'undefined') ? Array.from(searchedCells) : [],
    npcPlacements:(typeof npcPlacements !== 'undefined') ? Array.from(npcPlacements.entries()) : [],
    hiddenGardens:(typeof hiddenGardens !== 'undefined') ? Array.from(hiddenGardens) : []
  };
}

function _restoreFloorState(snap) {
  currentFloor = snap.floor;
  dungeon  = snap.dungeon;
  visited  = snap.visited;
  enemyMap = snap.enemyMap;
  itemMap  = snap.itemMap;
  playerX  = snap.px; playerY = snap.py; playerDir = snap.dir;
  currentFloorEvent = snap.floorEvent || null;
  runePuzzle = snap.runePuzzle || null;
  runeStele  = snap.runeStele || null;
  secretWalls = new Set(snap.secretWalls || []);
  litRunes    = new Set(snap.litRunes || []);
  searchedCells = (typeof _searchedCellsFromArray === 'function')
    ? _searchedCellsFromArray(snap.searchedCells || [])
    : new Map(snap.searchedCells || []);
  npcPlacements = new Map(snap.npcPlacements || []);
  hiddenGardens = new Set(snap.hiddenGardens || []);
}

// Carve un rectangle plein de FLOOR (bornes incluses), garde-fou aux bords.
function _carveEscapeRoom(x0, y0, x1, y1) {
  const W = dungeon[0].length, H = dungeon.length;
  for (let y = Math.max(1, y0); y <= Math.min(H - 2, y1); y++)
    for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++)
      dungeon[y][x] = CELL.FLOOR;
}

// BFS pur : la cible (tx,ty) est-elle joignable depuis (sx,sy) en évitant les
// murs ? `grid[y][x]` ; `wallVal` = valeur de mur. Testable hors navigateur.
function _escapeReachable(grid, sx, sy, tx, ty, wallVal) {
  if (!grid || !grid.length) return false;
  const H = grid.length, W = grid[0].length;
  const seen = Array.from({ length: H }, () => Array(W).fill(false));
  const q = [[sx, sy]];
  seen[sy][sx] = true;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (seen[ny][nx] || grid[ny][nx] === wallVal) continue;
      seen[ny][nx] = true;
      q.push([nx, ny]);
    }
  }
  return false;
}

// ── Génération de la Poche du Sceau (Lot 2) ────────────────────────────────
// Petit étage dédié de 3 salles reliées (HORS floorDungeons). La faille de
// sortie (SEAL_RIFT) est dans la salle la plus lointaine, scellée tant que
// l'épreuve n'est pas résolue. Type A « L'Énigme des Quatre » : 3 stèles
// portant chacune une devinette des Ruines ; chaque bonne réponse grave un
// glyphe (progress++), la 3ᵉ dé-scelle la faille.
function generateEscapePocket(type, sourceFloor, meta) {
  const W = (typeof MAP_W === 'number') ? MAP_W : 16;
  const H = (typeof MAP_H === 'number') ? MAP_H : 16;
  dungeon = []; visited = []; enemyMap = []; itemMap = [];
  for (let y = 0; y < H; y++) {
    dungeon[y] = []; visited[y] = []; enemyMap[y] = []; itemMap[y] = [];
    for (let x = 0; x < W; x++) {
      dungeon[y][x]  = CELL.WALL;
      visited[y][x]  = false;
      enemyMap[y][x] = null;
      itemMap[y][x]  = null;
    }
  }

  // 3 salles : entrée (spawn), centrale, lointaine (faille). Disposées en
  // triangle, reliées par des couloirs en L (WALL→FLOOR uniquement → ne
  // recouvre jamais une cellule spéciale posée plus bas).
  const rooms = [
    { x0: 2, y0: 2,  x1: 5,  y1: 5,  cx: 3,  cy: 3  },  // A — entrée
    { x0: 9, y0: 3,  x1: 12, y1: 6,  cx: 10, cy: 4  },  // B — centrale
    { x0: 5, y0: 10, x1: 8,  y1: 13, cx: 6,  cy: 11 },  // C — faille
  ];
  rooms.forEach(r => _carveEscapeRoom(r.x0, r.y0, r.x1, r.y1));
  _carveCorridor(rooms[0].cx, rooms[0].cy, rooms[1].cx, rooms[1].cy);
  _carveCorridor(rooms[1].cx, rooms[1].cy, rooms[2].cx, rooms[2].cy);

  // Spawn dans la salle A, faille au centre de la salle C.
  playerX = rooms[0].cx; playerY = rooms[0].cy; playerDir = 'e';
  const riftX = rooms[2].cx, riftY = rooms[2].cy;
  dungeon[riftY][riftX] = CELL.SEAL_RIFT;
  visited[playerY][playerX] = true;

  // Connexité garantie (filet de sécurité — la topologie l'assure déjà).
  if (!_escapeReachable(dungeon, playerX, playerY, riftX, riftY, CELL.WALL)) {
    _carveCorridor(playerX, playerY, riftX, riftY);
  }

  // Trackers d'étage propres à la poche.
  currentFloorEvent = 'escape';
  secretWalls = new Set();
  litRunes = new Set();
  runePuzzle = null;
  runeStele = null;
  searchedCells = new Map();
  npcPlacements = new Map();
  hiddenGardens = new Set();

  // Cellules FLOOR libres d'une salle (≠ spawn ≠ faille), pour poser les
  // éléments d'épreuve sans recouvrir une case spéciale.
  const roomFloorCells = (r) => {
    const cands = [];
    for (let y = r.y0; y <= r.y1; y++)
      for (let x = r.x0; x <= r.x1; x++) {
        if (dungeon[y] && dungeon[y][x] === CELL.FLOOR
            && !(x === playerX && y === playerY)
            && !(x === riftX && y === riftY)) cands.push([x, y]);
      }
    return cands;
  };
  const founder    = (meta && meta.founder) || null;
  const houseMatch = !!(meta && meta.houseMatch);
  const base = { type: type || 'riddle', founder, houseMatch, solved: false,
                 progress: 0, sourceFloor };

  if (type === 'mirror')      escapePocketState = _buildMirrorPocket(base, rooms, roomFloorCells, riftX, riftY);
  else if (type === 'warden') escapePocketState = _buildWardenPocket(base, rooms, roomFloorCells, riftX, riftY, sourceFloor);
  else if (type === 'riddle') escapePocketState = _buildRiddlePocket(base, rooms, roomFloorCells);
  else escapePocketState = Object.assign(base, { solved: true, total: 0, steles: [] }); // 'echo' legacy
}

// Type A « L'Énigme des Quatre » (Rowena) — 3 stèles à graver.
function _buildRiddlePocket(base, rooms, roomFloorCells) {
  const steles = [];
  const slots = [];
  for (const r of rooms) {
    const cands = roomFloorCells(r);
    if (cands.length) slots.push(cands[Math.floor(Math.random() * cands.length)]);
  }
  const riddleIds = _pickEscapeRiddleIds(ESCAPE_STELE_COUNT);
  slots.slice(0, ESCAPE_STELE_COUNT).forEach(([sx, sy], i) => {
    dungeon[sy][sx] = CELL.STELE;
    steles.push({ cell: `${sx},${sy}`, riddleId: riddleIds[i], solved: false });
  });
  const st = Object.assign(base, { solved: false, total: steles.length, steles });
  // House-match : 1 stèle pré-gravée (indice gratuit « la salle te reconnaît »).
  if (base.houseMatch && steles.length) {
    steles[0].solved = true;
    st.progress = 1;
    if (st.progress >= st.total) { st.solved = true; }
  }
  return st;
}

// Type B « Le Miroir de Salazar » (Salazar) — 3 fragments à ramasser puis
// déposer dans l'ordre sur l'autel central ; un écho du groupe rôde.
function _buildMirrorPocket(base, rooms, roomFloorCells, riftX, riftY) {
  // Autel central dans la salle B (case centre, hors couloir critique).
  const ax = rooms[1].cx, ay = rooms[1].cy;
  dungeon[ay][ax] = CELL.ALTAR;
  // 1 fragment par salle (CELL.CHEST). idx = identité du fragment.
  const fragments = [];
  rooms.forEach((r, i) => {
    const cands = roomFloorCells(r).filter(([x, y]) => !(x === ax && y === ay));
    if (cands.length) {
      const [fx, fy] = cands[Math.floor(Math.random() * cands.length)];
      dungeon[fy][fx] = CELL.CHEST;
      fragments.push({ cell: `${fx},${fy}`, idx: i, picked: false });
    }
  });
  // Ordre de dépôt requis (permutation de [0..n-1]).
  const order = fragments.map(f => f.idx);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Écho du groupe : démarre dans la salle de la faille, vise l'autel.
  const echoStart = `${riftX},${riftY}`;
  const st = Object.assign(base, {
    solved: false, total: fragments.length, fragments, order, deposited: [],
    altar: `${ax},${ay}`,
    mirror: { pos: echoStart, start: echoStart, target: `${ax},${ay}`, awake: false },
  });
  // House-match : 1 fragment localisé ET déjà ramassé (indice gratuit).
  if (base.houseMatch && fragments.length) {
    const first = fragments.find(f => f.idx === order[0]) || fragments[0];
    first.picked = true;
    const [hx, hy] = first.cell.split(',').map(Number);
    if (dungeon[hy] && dungeon[hy][hx] === CELL.CHEST) dungeon[hy][hx] = CELL.FLOOR;
  }
  return st;
}

// Type C « L'Écho du Scellement » (Godric + Helga) — 3 brasiers à allumer
// sous pression ; 1 refuge (pause) ; 1-2 échos hostiles évitables.
function _buildWardenPocket(base, rooms, roomFloorCells, riftX, riftY, sourceFloor) {
  // 1 brasier (CELL.RUNE) par salle, sur une case libre.
  const braziers = [];
  rooms.forEach((r) => {
    const cands = roomFloorCells(r);
    if (cands.length) {
      const [bx, by] = cands[Math.floor(Math.random() * cands.length)];
      dungeon[by][bx] = CELL.RUNE;
      braziers.push({ cell: `${bx},${by}`, lit: false });
    }
  });
  // Refuge (CELL.REFUGE) dans la salle centrale, hors brasier.
  const brazierCells = new Set(braziers.map(b => b.cell));
  const refCands = roomFloorCells(rooms[1]).filter(([x, y]) => !brazierCells.has(`${x},${y}`));
  if (refCands.length) {
    const [rx, ry] = refCands[Math.floor(Math.random() * refCands.length)];
    dungeon[ry][rx] = CELL.REFUGE;
  }
  // 1-2 échos hostiles (évitables) : placés dans les salles, hors case spéciale
  // et hors chemin direct. Scalés à l'étage source (effectiveFloor via scaleMonster).
  _spawnWardenEchoes(rooms, sourceFloor, brazierCells);
  const st = Object.assign(base, {
    solved: false, total: braziers.length, braziers, refugeUsed: false, refugePause: 0,
  });
  // House-match : 1 brasier pré-allumé (indice gratuit + budget déjà rendu).
  if (base.houseMatch && braziers.length) {
    braziers[0].lit = true;
    st.progress = 1;
    if (typeof litRunes !== 'undefined' && litRunes) litRunes.add(braziers[0].cell);
  }
  return st;
}

// Place 1-2 échos hostiles dans la Poche du Gardien (enemyMap). Évitables :
// hors case spéciale, hors spawn/faille. Pas de respawn (poche éphémère).
function _spawnWardenEchoes(rooms, sourceFloor, brazierCells) {
  if (typeof MONSTERS === 'undefined' || !Array.isArray(MONSTERS)) return;
  const tmpl = MONSTERS.find(m => m.id === 'detraqueur')
            || MONSTERS.find(m => m.category === 'fantôme')
            || MONSTERS[0];
  if (!tmpl) return;
  const count = 1 + (Math.random() < 0.5 ? 1 : 0);
  let placed = 0;
  // Cherche des cases FLOOR dans les salles B et C, à ≥ 1 case du joueur.
  for (const r of [rooms[2], rooms[1]]) {
    if (placed >= count) break;
    for (let y = r.y0; y <= r.y1 && placed < count; y++)
      for (let x = r.x0; x <= r.x1 && placed < count; x++) {
        if (dungeon[y][x] !== CELL.FLOOR) continue;
        if (x === playerX && y === playerY) continue;
        if (brazierCells.has(`${x},${y}`)) continue;
        if (enemyMap[y][x]) continue;
        const e = (typeof scaleMonster === 'function')
          ? scaleMonster(tmpl, sourceFloor) : Object.assign({}, tmpl);
        if (e) {
          e.name = /^Écho/.test(e.name || '') ? e.name : 'Écho · ' + (e.name || 'Spectre');
          enemyMap[y][x] = e;
          placed++;
        }
      }
  }
}

// Sélectionne les devinettes des stèles : priorité aux 3 énigmes des Ruines
// (r_*, ét. 21+), complétées au besoin par le reste du registre, sans doublon.
function _pickEscapeRiddleIds(n) {
  const RUINES = ['r_voute_corruption', 'r_quatre_unis', 'r_dormeur'];
  const all = (typeof RIDDLES !== 'undefined' && Array.isArray(RIDDLES))
    ? RIDDLES.map(r => r.id) : [];
  const ids = [];
  for (const id of RUINES) if (all.includes(id) && !ids.includes(id)) ids.push(id);
  // Complète avec d'autres devinettes (mélangées) si besoin.
  const rest = all.filter(id => !ids.includes(id));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  while (ids.length < n && rest.length) ids.push(rest.shift());
  // Repli ultime : recycle si le registre est plus petit que n.
  while (ids.length < n) ids.push(all.length ? all[ids.length % all.length] : null);
  return ids;
}

// ── Entrée dans la Poche ───────────────────────────────────────────────────
function enterEscapePocket(type, meta) {
  if (typeof inEscapePocket !== 'undefined' && inEscapePocket) return;
  _escapeSnapshot   = _captureFloorState();
  inEscapePocket    = true;
  escapePocketType  = type || 'riddle';
  generateEscapePocket(escapePocketType, _escapeSnapshot.floor, meta);
  _escapePocketUsedThisFloor = true;
  _lastEscapePocketFloor     = _escapeSnapshot.floor;
  // Budget de pas (jauge de corruption) — rétrécit avec la profondeur de Boucle.
  const depth = (typeof endgameTierIndex === 'function')
    ? endgameTierIndex(_escapeSnapshot.floor) : 1;
  let budget = computeEscapeStepBudget(depth);
  // Type C « warden » : pression accrue (budget serré).
  if (escapePocketType === 'warden') budget = Math.round(budget * ESCAPE_WARDEN_BUDGET_MULT);
  // House-match : +20 % de budget (« la salle te reconnaît »).
  if (meta && meta.houseMatch) budget = Math.round(budget * ESCAPE_BUDGET_HOUSE);
  escapeStepBudget = Math.max(ESCAPE_BUDGET_FLOOR, budget);
  escapeStepSpent  = 0;
  _renderEscapeFloor();
  showEscapeHud();
  if (typeof setNarrative === 'function') {
    setNarrative("Une rune instable cède sous ton pas — le temps se replie. Tu "
      + "bascules dans une Poche du Sceau, écho figé du scellement des "
      + "Fondateurs. Trouve la faille pour en ressortir.");
  }
  if (typeof addMsg === 'function') addMsg("🌀 Une Poche du Sceau t'engloutit !", 'bad');
  if (typeof DFX_safe !== 'undefined' && DFX_safe.shakeView) DFX_safe.shakeView('heavy');
  if (typeof pulseFrostOverlay === 'function') pulseFrostOverlay();
  // Transition dédiée « violet-givre » + voix du Fondateur + grave sonore (Lot 4).
  _escapeTransition('enter', (meta && meta.founder) || (escapePocketState && escapePocketState.founder));
}

// ── Sortie de la Poche (succès = re-scellement ; échec = éjection) ──────────
function exitEscapePocket(success) {
  if (typeof inEscapePocket === 'undefined' || !inEscapePocket || !_escapeSnapshot) return;
  // Au succès, la faille doit être dénouée (Lot 2+ : épreuve résolue).
  if (success && escapePocketState && escapePocketState.solved === false) return;
  // Mémorise le Fondateur AVANT de purger l'état (récompenses fines — Lot 4).
  const founder    = (escapePocketState && escapePocketState.founder) || 'godric';
  const houseMatch = !!(escapePocketState && escapePocketState.houseMatch);
  // Télémétrie d'équilibrage (Lot 5) — NO-OP hors BALANCE_DEBUG. Capturé AVANT
  // le reset (le % de corruption dépend de escapeStepSpent/Budget).
  if (typeof BalanceLog !== 'undefined' && BalanceLog.record) {
    BalanceLog.record('escape', {
      type:          escapePocketType,
      founder,
      houseMatch,
      outcome:       success ? 'cleared' : 'failed',
      corruptionPct: escapeCorruptionPct(escapeStepSpent, escapeStepBudget),
    });
  }
  _restoreFloorState(_escapeSnapshot);
  inEscapePocket    = false;
  escapePocketType  = null;
  escapePocketState = null;
  _escapeSnapshot   = null;
  escapeStepBudget  = 0;
  escapeStepSpent   = 0;
  hideEscapeHud();
  if (typeof _hideExploreOverlay === 'function') _hideExploreOverlay();
  if (success) {
    escapePocketsCleared = (escapePocketsCleared || 0) + 1;
    if (typeof escapeFoundersCleared !== 'undefined' && escapeFoundersCleared && escapeFoundersCleared.add) {
      escapeFoundersCleared.add(founder);
    }
    // (b) Réchauffement (soin partiel 30 %) — conservé du Lot 1.
    if (typeof party !== 'undefined') {
      activeParty().forEach(c => {
        if (!c || c.hp <= 0) return;
        c.hp = Math.min(c.hpMax, c.hp + Math.floor(c.hpMax * 0.30));
        c.sp = Math.min(c.spMax, c.sp + Math.floor(c.spMax * 0.30));
      });
    }
    // (a) +1 Éclat (Briser le Cycle, jalon II). GARDE-FOU §1.4 : NE crédite PAS
    // le jalon I `echo_scene_sceau` (réservé à l'écho canon de zone D).
    if (typeof accumulatedEclats !== 'undefined') {
      accumulatedEclats = (accumulatedEclats || 0) + 1;
      if (typeof addMsg === 'function') addMsg("🔹 Tu comprends un peu mieux le verrou. (+1 Éclat)", 'magic');
      if (typeof _maybeCelebrateEclatMilestone === 'function') _maybeCelebrateEclatMilestone();
    }
    // (c) 1 tirage de butin curaté (livre élémentaire / matériau / artefact mineur).
    _grantEscapeLoot(founder);
    // Bonus House-match : sort exclusif des Ruines enseigné en avance, sinon
    // (déjà connu) un 2ᵉ tirage de butin.
    if (houseMatch) {
      const taught = _escapeFounderSpell(founder);
      if (taught) {
        if (typeof addMsg === 'function') {
          const ico = (typeof getSpellIconHtml === 'function') ? getSpellIconHtml(taught, 'ui-icon-md') : '✨';
          addMsg(`${ico} La salle te reconnaît — elle te confie en avance le sort <em>${taught}</em> !`, 'magic');
        }
      } else {
        _grantEscapeLoot(founder);  // sort déjà connu → 2ᵉ tirage
      }
    }
    if (typeof recalculateStats === 'function') recalculateStats();
    if (typeof setNarrative === 'function') {
      setNarrative("Le sceau se referme dans ton dos. Le froid recule — tu es de "
        + "retour dans les Ruines, à l'endroit même où la rune t'a happé.");
    }
    if (typeof addMsg === 'function') addMsg("🌀 Tu as re-scellé la Poche et regagné les Ruines.", 'good');
    // Codex (Lot 4) : poche_du_sceau + echo_<founder>.
    if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('escape-cleared');
    // Quête répétable « Endurer les Poches » (Gardien de la Boucle).
    if (typeof checkEscapePocketQuests === 'function') checkEscapePocketQuests();
    // Immersion : re-scellement (transition) + réchauffement visuel (froid recule).
    _escapeTransition('exit-success', founder);
    _escapeWarmth();
  } else {
    // Échec : malus « corruption » passager — −15 % ATK/DEF/MAG pendant N pas
    // (Lot 3). `recalculateStats` applique l'effet d'emblée (lecture du flag).
    corruptionMalusSteps = ESCAPE_MALUS_STEPS;
    if (typeof recalculateStats === 'function') recalculateStats();
    if (typeof setNarrative === 'function') {
      setNarrative("La corruption te recrache hors de la Poche. Une morsure "
        + "glacée s'attarde sur le groupe.");
    }
    if (typeof addMsg === 'function') addMsg("❄️ La Poche t'éjecte — une corruption passagère t'affaiblit.", 'bad');
    // Immersion : éjection (transition froide). Pas de réchauffement (le froid
    // s'attarde — le malus est en cours).
    _escapeTransition('exit-fail', founder);
  }
  _renderEscapeFloor();
  if (typeof safeCall === 'function') safeCall('autoSave', 'escape-exit');
}

// ── Stèle de la Poche — réponse à une énigme (Type A) ──────────────────────
// La stèle courante = celle posée sur la case du joueur. Bonne réponse →
// glyphe gravé (progress++) ; à la dernière → solved=true + faille dé-scellée.
// Mauvaise réponse → feedback + bond de corruption (peut épuiser le budget).
function _escapeSteleAt(x, y) {
  if (!escapePocketState || !Array.isArray(escapePocketState.steles)) return null;
  const key = `${x},${y}`;
  return escapePocketState.steles.find(s => s.cell === key) || null;
}

function answerEscapeStele(choiceIdx) {
  if (!inEscapePocket || !escapePocketState) { _hideExploreOverlay(); return; }
  const stele = _escapeSteleAt(playerX, playerY);
  if (!stele || stele.solved) { _hideExploreOverlay(); return; }
  const riddle = (typeof getRiddleById === 'function') ? getRiddleById(stele.riddleId) : null;
  if (!riddle) { _hideExploreOverlay(); return; }

  if (choiceIdx === riddle.answer) {
    stele.solved = true;
    escapePocketState.progress = (escapePocketState.progress || 0) + 1;
    if (typeof _steleFeedback !== 'undefined') _steleFeedback = '';
    _hideExploreOverlay();
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
    const total = escapePocketState.total || ESCAPE_STELE_COUNT;
    if (escapePocketState.progress >= total) {
      // Dernière bonne réponse : le sceau cède, la faille s'ouvre.
      escapePocketState.solved = true;
      _openEscapeRift();
      if (typeof setNarrative === 'function') {
        setNarrative("Le dernier glyphe s'embrase d'un givre lumineux. La phrase "
          + "du sceau est complète — la faille du Sceau s'entrouvre enfin.");
      }
      if (typeof addMsg === 'function') addMsg("🌀 Le sceau cède — la faille s'ouvre !", 'good');
    } else {
      if (typeof setNarrative === 'function') {
        setNarrative('Ta réponse résonne juste. ' + (riddle.rewardHint || '')
          + ` Un glyphe se grave dans la pierre (${escapePocketState.progress}/${total}).`);
      }
      if (typeof addMsg === 'function') {
        addMsg(`🗿 Glyphe gravé — ${escapePocketState.progress}/${total}.`, 'good');
      }
    }
    if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('riddle-solved');
    _updateEscapeHud();
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof drawDungeon === 'function') drawDungeon();
  } else {
    // Mauvaise réponse : feedback + bond de corruption.
    if (typeof _steleFeedback !== 'undefined') {
      _steleFeedback = "✗ Le givre reste sourd — ce n'est pas la phrase du sceau. La stèle attend toujours :";
    }
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) AudioSystem.playHit();
    const penalty = Math.max(2, Math.round((escapeStepBudget || 0) * ESCAPE_WRONG_FRAC));
    escapeStepSpent = (escapeStepSpent || 0) + penalty;
    _updateEscapeHud();
    if (escapeStepBudget > 0 && escapeStepSpent >= escapeStepBudget) {
      _escapeFail();
      return;
    }
    if (typeof _showExploreOverlay === 'function') _showExploreOverlay(CELL.STELE);
  }
}

// Dé-scelle la faille : ouvre la cellule SEAL_RIFT (re-rendue par l'overlay).
function _openEscapeRift() {
  // Le SEAL_RIFT existe déjà sur la carte ; l'overlay le rend franchissable
  // dès que escapePocketState.solved. Rien à muter ici (gardé pour la lisibilité
  // de l'intention + extension Lot 3).
}

// ── Routeur d'interaction de Poche (Lot 3 — Type B/C) ──────────────────────
// Appelé tôt dans handleCellEntry. Retourne true s'il a pris en charge la case
// (l'appelant s'arrête alors). Sinon false → flux d'exploration normal (la
// stèle d'énigme Type A et la faille SEAL_RIFT restent gérées par movement.js).
function _escapeHandleCellEntry(cell) {
  if (!inEscapePocket || !escapePocketState) return false;
  const t = escapePocketState.type;
  if (t === 'mirror') {
    if (cell === CELL.CHEST) { escapeMirrorPickup(); return true; }
    if (cell === CELL.ALTAR) { _showEscapeMirrorAltar(); return true; }
  } else if (t === 'warden') {
    if (cell === CELL.RUNE)   { escapeLightBrazier(); return true; }
    if (cell === CELL.REFUGE) { escapeRefugePause(); return true; }
  }
  return false;
}

// ── Type B « Le Miroir de Salazar » ────────────────────────────────────────
// Ramasse le fragment posé sur la case du joueur ; réveille l'écho du groupe.
function escapeMirrorPickup() {
  const s = escapePocketState;
  if (!s || !Array.isArray(s.fragments)) return;
  const key = `${playerX},${playerY}`;
  const frag = s.fragments.find(f => f.cell === key && !f.picked);
  if (!frag) return;
  frag.picked = true;
  dungeon[playerY][playerX] = CELL.FLOOR;
  if (s.mirror) s.mirror.awake = true;   // marcher réveille le reflet
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  if (typeof addMsg === 'function') addMsg('🪞 Tu ramasses un fragment du Sceau — ton reflet s\'anime.', 'good');
  if (typeof setNarrative === 'function') {
    setNarrative("Un éclat de la Clé repose ici. À l'instant où tu le saisis, "
      + "ton reflet se détache du mur et se met en marche vers l'autel.");
  }
  if (typeof renderMinimap === 'function') renderMinimap();
  if (typeof drawDungeon === 'function') drawDungeon();
}

// Ouvre l'overlay de l'autel central : déposer les fragments dans l'ordre.
function _showEscapeMirrorAltar() {
  const s = escapePocketState;
  if (!s) return;
  const icon    = (typeof document !== 'undefined') ? document.getElementById('explore-icon') : null;
  const title   = (typeof document !== 'undefined') ? document.getElementById('explore-title') : null;
  const descEl  = (typeof document !== 'undefined') ? document.getElementById('explore-desc') : null;
  const actions = (typeof document !== 'undefined') ? document.getElementById('explore-actions') : null;
  const overlay = (typeof document !== 'undefined') ? document.getElementById('explore-overlay') : null;
  if (!icon || !title || !descEl || !actions || !overlay) return;
  icon.innerHTML = (typeof SCENE_ICONS !== 'undefined' && SCENE_ICONS.altar) ? SCENE_ICONS.altar : '🪞';
  title.textContent = "Autel du Miroir";
  const dep = Array.isArray(s.deposited) ? s.deposited : [];
  const carried = (s.fragments || []).filter(f => f.picked && dep.indexOf(f.idx) === -1);
  // Indice runique : ordre complet en House-match, sinon prochain attendu seul.
  const fragName = (i) => `Éclat ${['I', 'II', 'III', 'IV'][i] || (i + 1)}`;
  let hint;
  if (s.houseMatch) {
    hint = "L'inscription se révèle entière : déposer dans l'ordre — "
      + (s.order || []).map(fragName).join(', ') + '.';
  } else {
    const next = (s.order || [])[dep.length];
    hint = (next != null)
      ? `L'inscription murmure : le prochain à sceller est le ${fragName(next)}.`
      : 'L\'inscription s\'est tue.';
  }
  descEl.textContent = `Une dalle runique reflète le groupe. Repose les fragments du Sceau `
    + `dans le bon ordre pour rouvrir la faille (${dep.length}/${s.total || 3}). ${hint}`;
  let btns = '';
  if (s.solved) {
    btns = `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`;
  } else if (!carried.length) {
    btns = `<div style="font-size:12px;color:#8a7050;margin-bottom:6px">Aucun fragment en main — explore les salles pour les ramasser.</div>`
      + `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`;
  } else {
    btns = carried.map(f =>
      `<button class="explore-btn" onclick="escapeMirrorDeposit(${f.idx})">Déposer le ${fragName(f.idx)}</button>`
    ).join('\n')
      + `\n<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`;
  }
  actions.innerHTML = btns;
  overlay.style.display = 'flex';
}

// Dépose un fragment sur l'autel. Bon ordre → progresse ; mauvais → corruption.
function escapeMirrorDeposit(fragIdx) {
  const s = escapePocketState;
  if (!s || s.solved) { if (typeof _hideExploreOverlay === 'function') _hideExploreOverlay(); return; }
  const dep = s.deposited = Array.isArray(s.deposited) ? s.deposited : [];
  const frag = (s.fragments || []).find(f => f.idx === fragIdx && f.picked);
  if (!frag || dep.indexOf(fragIdx) !== -1) { _showEscapeMirrorAltar(); return; }
  const expected = (s.order || [])[dep.length];
  if (fragIdx === expected) {
    dep.push(fragIdx);
    s.progress = dep.length;
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
    if (dep.length >= (s.total || (s.order || []).length)) {
      s.solved = true;
      _openEscapeRift();
      if (typeof addMsg === 'function') addMsg('🪞 Le miroir s\'apaise — la faille du Sceau s\'ouvre !', 'good');
      if (typeof setNarrative === 'function') {
        setNarrative("Le dernier fragment trouve sa place. Ton reflet s'immobilise, "
          + "enfin en paix — la faille du Sceau s'entrouvre.");
      }
      if (typeof _hideExploreOverlay === 'function') _hideExploreOverlay();
    } else {
      if (typeof addMsg === 'function') addMsg(`🪞 Fragment scellé — ${dep.length}/${s.total}.`, 'good');
      _showEscapeMirrorAltar();
    }
  } else {
    // Mauvais ordre : poussée de corruption, le fragment reste en main.
    const penalty = Math.max(2, Math.round((escapeStepBudget || 0) * ESCAPE_WRONG_FRAC));
    escapeStepSpent = (escapeStepSpent || 0) + penalty;
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) AudioSystem.playHit();
    if (typeof addMsg === 'function') addMsg('🪞 Le reflet se trouble — ce n\'est pas l\'ordre du Sceau.', 'bad');
    _updateEscapeHud();
    if (escapeStepBudget > 0 && escapeStepSpent >= escapeStepBudget) {
      if (typeof _hideExploreOverlay === 'function') _hideExploreOverlay();
      _escapeFail();
      return;
    }
    _showEscapeMirrorAltar();
  }
  if (typeof renderMinimap === 'function') renderMinimap();
  if (typeof drawDungeon === 'function') drawDungeon();
}

// Synthétise un « fantôme » du groupe pour le rendu de l'écho du Miroir
// (réutilise drawGhostSprite). heroKeys = sprites plein corps du groupe.
function _escapeEchoGhost() {
  const keys = (typeof party !== 'undefined')
    ? party.slice(0, (typeof partySize === 'number') ? partySize : party.length)
        .map(c => c && c.heroKey).filter(Boolean)
    : [];
  return { heroKeys: keys, name: 'Reflet', level: 0 };
}

// Avance l'écho du groupe d'une case vers l'autel (BFS-next). S'il l'atteint,
// il brouille le dernier fragment déposé (+corruption) et repart de son origine.
function _escapeEchoStep() {
  const s = escapePocketState;
  if (!s || !s.mirror || s.solved) return;
  const m = s.mirror;
  const [tx, ty] = m.target.split(',').map(Number);
  const [cx, cy] = m.pos.split(',').map(Number);
  const next = _escapeNextStep(cx, cy, tx, ty);
  if (next) m.pos = `${next[0]},${next[1]}`;
  const [nx, ny] = m.pos.split(',').map(Number);
  if (nx === tx && ny === ty) {
    // L'écho atteint l'autel : il brouille un fragment posé.
    if (Array.isArray(s.deposited) && s.deposited.length) {
      s.deposited.pop();
      s.progress = s.deposited.length;
      if (typeof addMsg === 'function') addMsg('🪞 Ton reflet brouille un fragment scellé !', 'bad');
    } else if (typeof addMsg === 'function') {
      addMsg('🪞 Ton reflet effleure l\'autel — la corruption monte.', 'bad');
    }
    const penalty = Math.max(2, Math.round((escapeStepBudget || 0) * ESCAPE_WRONG_FRAC));
    escapeStepSpent = (escapeStepSpent || 0) + penalty;
    m.pos = m.start;   // l'écho repart de son origine
  }
}

// Pas suivant sur le plus court chemin de (sx,sy) vers (tx,ty) (BFS). Retourne
// [x,y] ou null. Murs = CELL.WALL ; toute autre case est franchissable.
function _escapeNextStep(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return null;
  const H = dungeon.length, W = dungeon[0].length;
  const prev = Array.from({ length: H }, () => Array(W).fill(null));
  const seen = Array.from({ length: H }, () => Array(W).fill(false));
  const q = [[sx, sy]];
  seen[sy][sx] = true;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) {
      // Remonte jusqu'à la 1ʳᵉ case après le départ.
      let cur = [x, y];
      while (prev[cur[1]][cur[0]] && !(prev[cur[1]][cur[0]][0] === sx && prev[cur[1]][cur[0]][1] === sy)) {
        cur = prev[cur[1]][cur[0]];
      }
      return cur;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ax = x + dx, ay = y + dy;
      if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
      if (seen[ay][ax] || dungeon[ay][ax] === CELL.WALL) continue;
      seen[ay][ax] = true;
      prev[ay][ax] = [x, y];
      q.push([ax, ay]);
    }
  }
  return null;
}

// ── Type C « L'Écho du Scellement » ────────────────────────────────────────
// Allume le brasier sur la case du joueur : rend ~15 % de budget (« la lumière
// tient la peur »). Au 3ᵉ → solved=true (la faille s'ouvre, reste à l'atteindre).
function escapeLightBrazier() {
  const s = escapePocketState;
  if (!s || !Array.isArray(s.braziers)) return;
  const key = `${playerX},${playerY}`;
  const br = s.braziers.find(b => b.cell === key);
  if (!br || br.lit) return;
  br.lit = true;
  if (typeof litRunes !== 'undefined' && litRunes) litRunes.add(key);
  const refund = escapeBrazierRefund(escapeStepBudget);
  escapeStepSpent = Math.max(0, (escapeStepSpent || 0) - refund);
  const litCount = s.braziers.filter(b => b.lit).length;
  s.progress = litCount;
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  if (litCount >= (s.total || s.braziers.length)) {
    s.solved = true;
    _openEscapeRift();
    if (typeof addMsg === 'function') addMsg('🔥 Le dernier brasier s\'embrase — la peur reflue, la faille s\'ouvre !', 'good');
    if (typeof setNarrative === 'function') {
      setNarrative("Les trois feux brûlent ensemble. La brume de corruption recule "
        + "devant la lumière — la faille du Sceau s'entrouvre. Atteins-la.");
    }
  } else {
    if (typeof addMsg === 'function') addMsg(`🔥 Brasier allumé (${litCount}/${s.total}) — la lumière repousse la peur.`, 'good');
    if (typeof setNarrative === 'function') {
      setNarrative("Le brasier s'embrase d'une lumière chaude. La brume recule un instant.");
    }
  }
  _updateEscapeHud();
  if (typeof renderMinimap === 'function') renderMinimap();
  if (typeof drawDungeon === 'function') drawDungeon();
}

// Abri d'Helga : fige la jauge 3 pas (1×). Récompense l'exploration prudente.
function escapeRefugePause() {
  const s = escapePocketState;
  if (!s) return;
  if (s.refugeUsed) {
    if (typeof addMsg === 'function') addMsg('🛖 L\'abri s\'est éteint — il ne tiendra pas une seconde fois.', '');
    return;
  }
  s.refugeUsed = true;
  s.refugePause = 3;
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  if (typeof addMsg === 'function') addMsg('🛖 Tu reprends ton souffle à l\'abri — la corruption se fige (3 pas).', 'good');
  if (typeof setNarrative === 'function') {
    setNarrative("Un creux taillé dans la pierre t'offre un répit. Pendant quelques pas, "
      + "la brume cesse d'avancer.");
  }
  _updateEscapeHud();
}

// ── Échec Ironman — Écho Corrompu (boss-écho, combat obligatoire) ───────────
// `_escapeWardenBattle` : combat de l'Écho Corrompu en cours (lu par endBattle
// et triggerDeath). `_escapeDeathCause` : badge de cause de mort (HoF/profil).
let _escapeWardenBattle = false;
let _escapeDeathCause   = null;

function _spawnCorruptedEcho() {
  const floor = (escapePocketState && escapePocketState.sourceFloor) || currentFloor || 11;
  const tmpl = (typeof MONSTERS !== 'undefined' && Array.isArray(MONSTERS))
    ? (MONSTERS.find(m => m.id === 'voldemort_revenu')
       || MONSTERS.find(m => m.epic)
       || MONSTERS[MONSTERS.length - 1])
    : null;
  let echo = (typeof scaleMonster === 'function' && tmpl)
    ? scaleMonster(tmpl, floor)
    : Object.assign({}, tmpl || {}, { hp: 200, atk: 20, def: 8, mag: 15 });
  echo = Object.assign({}, echo);
  echo.id    = 'echo_corrompu';
  echo.name  = 'Écho Corrompu';
  echo.icon  = '🌀';
  echo.epic  = true;
  echo.isDuelist = true;   // hors bestiaire (entité de scellement, pas une espèce)
  // Crédite le fait d'arme DÈS le spawn : le courage d'avoir affronté l'Écho
  // compte même si le groupe y laisse la vie (Lot 3 §2.6).
  if (typeof defeatedBosses !== 'undefined' && defeatedBosses && defeatedBosses.add) {
    defeatedBosses.add('echo_corrompu');
  }
  _escapeWardenBattle = true;
  hideEscapeHud();
  if (typeof addMsg === 'function') addMsg('🌀 La corruption se condense — un Écho Corrompu surgit du Sceau !', 'bad');
  if (typeof setNarrative === 'function') {
    setNarrative("La brume atteint son comble. Elle se tord, prend ta forme — un Écho "
      + "Corrompu de toi-même se dresse. Il faut le vaincre, ou rester scellé à jamais.");
  }
  startBattle(echo);
}

// Vrai si l'on est en plein combat de l'Écho Corrompu (lu par endBattle/triggerDeath).
function isEscapeWardenBattle() {
  return !!_escapeWardenBattle;
}

// Lit ET consomme le badge de cause de mort (une lecture → reset). Évite tout
// report d'un « Poche du Sceau » périmé sur une mort ultérieure. Lu par
// buildIronmanResult (ironman.js).
function escapeConsumeDeathCause() {
  const c = _escapeDeathCause;
  _escapeDeathCause = null;
  return c || null;
}

// Victoire sur l'Écho Corrompu → sortie en échec STANDARD (éjection + malus,
// vie sauve). Appelé par endBattle(won) avant la distribution de butin.
function _escapeOnWardenVictory() {
  _escapeWardenBattle = false;
  if (typeof inEscapePocket !== 'undefined' && inEscapePocket) exitEscapePocket(false);
}

// Mort pendant le combat de l'Écho Corrompu → héritage Boucle : badge de cause
// + titre profil « Scellé dans la Boucle ». Retourne le texte de mort dédié
// (consommé par triggerDeath pour showIronmanResult).
function _escapeOnWardenDefeat() {
  _escapeWardenBattle = false;
  _escapeDeathCause = 'Poche du Sceau';
  if (typeof recordSealedDeathToProfile === 'function') recordSealedDeathToProfile();
  // L'éjection n'a pas lieu (mort définitive) : on purge l'état de poche pour
  // que l'écran de résultat / un éventuel reload repartent propres.
  inEscapePocket    = false;
  escapePocketState = null;
  _escapeSnapshot   = null;
  return "Scellé dans une Poche du Sceau — l'Écho Corrompu t'a happé pour l'éternité.";
}

// ── Jauge de corruption — décompte de pas (appelé depuis _step) ─────────────
// Retourne true si le budget est épuisé (la Poche a éjecté le groupe en échec).
function _escapeOnStep() {
  if (!inEscapePocket) return false;
  // Abri d'Helga (Type C) : la jauge est figée pendant `refugePause` pas.
  if (escapePocketState && escapePocketState.refugePause > 0) {
    escapePocketState.refugePause--;
    _updateEscapeHud();
    return false;
  }
  escapeStepSpent = (escapeStepSpent || 0) + 1;
  // Miroir de Salazar (Type B) : l'écho du groupe avance d'un pas vers l'autel.
  if (escapePocketState && escapePocketState.type === 'mirror'
      && escapePocketState.mirror && escapePocketState.mirror.awake) {
    _escapeEchoStep();
  }
  _updateEscapeHud();
  if (escapeStepBudget > 0 && escapeStepSpent >= escapeStepBudget) {
    return _escapeFail();
  }
  return false;
}

// Échec de Poche (budget épuisé). Standard : éjection + malus. Ironman :
// l'Écho Corrompu surgit (combat obligatoire) — la défaite est mortelle, la
// victoire libère en échec standard. Retourne true (le pas appelant s'arrête).
function _escapeFail() {
  if (typeof ironmanMode !== 'undefined' && ironmanMode
      && typeof startBattle === 'function' && typeof MONSTERS !== 'undefined') {
    _spawnCorruptedEcho();
    return true;
  }
  exitEscapePocket(false);
  return true;
}

// ── HUD #escape-hud (objectif + jauge de corruption) ───────────────────────
function showEscapeHud() {
  const hud = (typeof document !== 'undefined') ? document.getElementById('escape-hud') : null;
  if (!hud) return false;
  hud.classList.add('active');
  hud.setAttribute('aria-hidden', 'false');
  _updateEscapeHud();
  return true;
}

function hideEscapeHud() {
  const hud = (typeof document !== 'undefined') ? document.getElementById('escape-hud') : null;
  if (!hud) return false;
  hud.classList.remove('active');
  hud.setAttribute('aria-hidden', 'true');
  return true;
}

function _updateEscapeHud() {
  if (typeof document === 'undefined') return false;
  const obj  = document.getElementById('escape-hud-objective');
  const fill = document.getElementById('escape-hud-gauge-fill');
  const lbl  = document.getElementById('escape-hud-gauge-label');
  if (obj) obj.textContent = _escapeObjectiveLabel();
  const pct = escapeCorruptionPct(escapeStepSpent, escapeStepBudget);
  if (fill) {
    fill.style.width = pct + '%';
    fill.setAttribute('data-critical', pct >= 70 ? '1' : '0');
  }
  if (lbl) lbl.textContent = `Corruption ${pct}%`;
  // Brume de corruption (Lot 4) : le froid/brume monte avec la jauge.
  if (typeof inEscapePocket !== 'undefined' && inEscapePocket) _escapeBrume(pct);
  return true;
}

// Libellé d'objectif du HUD selon le type de Poche.
function _escapeObjectiveLabel() {
  const s = escapePocketState;
  if (!s) return '';
  if (s.type === 'mirror') {
    const dep = Array.isArray(s.deposited) ? s.deposited.length : 0;
    return `${dep}/${s.total || 3} fragments scellés`;
  }
  if (s.type === 'warden') {
    const lit = Array.isArray(s.braziers) ? s.braziers.filter(b => b.lit).length : 0;
    return `${lit}/${s.total || 3} brasiers allumés`;
  }
  const total = s.total || ESCAPE_STELE_COUNT;
  const prog  = s.progress || 0;
  return `${prog}/${total} glyphes gravés`;
}

// ── Immersion : transition dédiée + brume de corruption (Lot 4) ────────────
// Fondu « violet-givre » réutilisant #tier-transition-overlay (classe
// .escape-fade) + grave sonore descendant + voix murmurée d'un Fondateur.
// `phase` ∈ 'enter' | 'exit-success' | 'exit-fail'. TOUT défensif (no-op si un
// module manque). Aucune mécanique de jeu touchée — pure surcouche.
function _escapeTransition(phase, founder) {
  const overlay = (typeof safeEl === 'function') ? safeEl('tier-transition-overlay')
    : (typeof document !== 'undefined' ? document.getElementById('tier-transition-overlay') : null);
  if (overlay) {
    overlay.classList.add('escape-fade');
    overlay.textContent = (phase === 'enter')
      ? '🌀 Poche du Sceau'
      : (phase === 'exit-success' ? '🔒 Le Sceau se referme' : '❄️ Corruption');
    overlay.classList.add('active');
    setTimeout(() => {
      overlay.classList.remove('active');
      // Retire la teinte « escape » une fois le fondu terminé (évite de
      // colorer une transition de tranche ultérieure).
      setTimeout(() => overlay.classList.remove('escape-fade'), 350);
    }, 650);
  }
  // Grave sonore descendant (réutilise le grondement de corruption existant).
  if (typeof AudioSystem !== 'undefined' && AudioSystem && AudioSystem.playCorruptionRise) {
    AudioSystem.playCorruptionRise();
  }
  // Voix murmurée d'un Fondateur (repli synthèse FR via speakBark).
  const v = ESCAPE_FOUNDER_VOICE[founder] || ESCAPE_FOUNDER_VOICE.godric;
  if (v && typeof AudioSystem !== 'undefined' && AudioSystem && AudioSystem.speakBark) {
    AudioSystem.speakBark(v.line, v.key);
  }
}

// Brume de corruption : pilote l'opacité de #frost-overlay selon la jauge
// (froid montant). Défensif. Appelé par _updateEscapeHud pendant la poche.
function _escapeBrume(pct) {
  const el = (typeof safeEl === 'function') ? safeEl('frost-overlay')
    : (typeof document !== 'undefined' ? document.getElementById('frost-overlay') : null);
  if (!el) return;
  const p = Math.max(0, Math.min(100, pct || 0));
  // 0 % → 0.18 (froid de base de la poche) … 100 % → 0.6 (brume avalante).
  el.style.opacity = String(0.18 + (0.42 * p / 100));
}

// Réchauffement visuel : le froid recule (sortie réussie). Restaure la
// baseline d'ambiance de corruption de l'étage source. Défensif.
function _escapeWarmth() {
  if (typeof _applyCorruptionAmbiance === 'function' && typeof currentFloor !== 'undefined') {
    _applyCorruptionAmbiance(currentFloor);
    return;
  }
  const el = (typeof safeEl === 'function') ? safeEl('frost-overlay')
    : (typeof document !== 'undefined' ? document.getElementById('frost-overlay') : null);
  if (el) el.style.opacity = '0';
}

// ── Butin curaté à la sortie réussie (Lot 4) ───────────────────────────────
// 1 tirage : livre élémentaire affilié au Fondateur (40 %) OU matériau Forge/
// Biblio (40 %) OU artefact mineur du pool loop (20 %). Défensif : refuse
// silencieusement si l'inventaire est plein ou l'item introuvable.
function _grantEscapeLoot(founder) {
  if (typeof ITEMS === 'undefined' || !Array.isArray(ITEMS)) return null;
  const r = Math.random();
  let id = null;
  if (r < 0.40) {
    id = ESCAPE_FOUNDER_BOOK[founder] || ESCAPE_FOUNDER_BOOK.godric;
  } else if (r < 0.80) {
    id = ESCAPE_MATERIAL_POOL[Math.floor(Math.random() * ESCAPE_MATERIAL_POOL.length)];
  } else {
    id = _escapeMinorArtifact() || ESCAPE_MATERIAL_POOL[0];
  }
  const item = ITEMS.find(i => i.id === id);
  if (!item) return null;
  if (typeof tryAddItem === 'function') {
    if (tryAddItem(item, { silent: true })) {
      if (typeof addMsg === 'function') {
        const ico = (typeof getItemIconHtml === 'function') ? getItemIconHtml(item, 'ui-icon-sm') : '🎁';
        addMsg(`${ico} Le Sceau te laisse une relique : ${item.name}.`, 'good');
      }
      return id;
    }
    return null;
  }
  return id;
}

// Tire un « artefact mineur » du pool loop existant (consommable/matériau de
// valeur). Garde-fou : ne tire que des ids effectivement présents dans ITEMS.
function _escapeMinorArtifact() {
  const pool = ['essence_chaleur', 'felix', 'potion_m', 'page_grimoire'];
  if (typeof ITEMS === 'undefined' || !Array.isArray(ITEMS)) return null;
  const avail = pool.filter(id => ITEMS.some(i => i.id === id));
  if (!avail.length) return null;
  return avail[Math.floor(Math.random() * avail.length)];
}

// Sort exclusif des Ruines à enseigner en House-match. Retourne le nom du sort
// enseigné (nouvel apprentissage) ou null si déjà connu / introuvable.
function _escapeFounderSpell(founder) {
  const name = ESCAPE_FOUNDER_SPELL[founder];
  if (!name || typeof _teachSpellToParty !== 'function') return null;
  return _teachSpellToParty(name) ? name : null;
}

// ── Rendu commun (entrée poche / retour Ruines) ────────────────────────────
function _renderEscapeFloor() {
  if (typeof _updateSearchBtn === 'function') _updateSearchBtn();
  if (typeof renderMinimap === 'function') renderMinimap();
  if (typeof drawDungeon === 'function') drawDungeon();
  if (typeof updateCompass === 'function') updateCompass();
  if (typeof updateUI === 'function') updateUI();
  const btn = (typeof document !== 'undefined') ? document.getElementById('btn-interact') : null;
  if (btn) btn.style.display = 'none';
}

if (typeof window !== 'undefined') {
  window.maybeTriggerEscapePocket = maybeTriggerEscapePocket;
  window.exitEscapePocket = exitEscapePocket;
  window.canTriggerEscapePocket = canTriggerEscapePocket;
  window.answerEscapeStele = answerEscapeStele;
  window.computeEscapeStepBudget = computeEscapeStepBudget;
  window.escapeCorruptionPct = escapeCorruptionPct;
  window._escapeReachable = _escapeReachable;
  // Lot 3 — helpers purs + interactions Type B/C + résolution Ironman.
  window.corruptionMalusMult = corruptionMalusMult;
  window.escapeBrazierRefund = escapeBrazierRefund;
  window.pickEscapePocketType = pickEscapePocketType;
  window.escapeMirrorPickup = escapeMirrorPickup;
  window.escapeMirrorDeposit = escapeMirrorDeposit;
  window.escapeLightBrazier = escapeLightBrazier;
  window.escapeRefugePause = escapeRefugePause;
  window._escapeHandleCellEntry = _escapeHandleCellEntry;
  window.isEscapeWardenBattle = isEscapeWardenBattle;
  window._escapeOnWardenVictory = _escapeOnWardenVictory;
  window._escapeOnWardenDefeat = _escapeOnWardenDefeat;
  window.escapeConsumeDeathCause = escapeConsumeDeathCause;
  window._escapeEchoGhost = _escapeEchoGhost;
}

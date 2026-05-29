// ============================================================
// SAUVEGARDE — Snapshots de visite inter-mondes (Mondes Parallèles)
// ============================================================
// Extrait de save.js. Helpers purs dépendant de _serializeState /
// _applyState (js/save.js, chargé avant).
// ============================================================
// MONDES PARALLÈLES — snapshot et suspend/restore (V1a Phase C.1)
// ============================================================
// Helpers purs pour la mécanique de visite inter-mondes. Aucune I/O
// réseau : transport déféré à C.2. Voir parallel-worlds.md §3.1 / §3.4 / §5.1.
//
//   _takeVisitSnapshot()     → côté visiteur : capture l'état pré-visite
//   _restoreFromVisit()      → côté visiteur : restaure l'état à la sortie
//   mpBuildVisitSnapshot()   → côté host : construit le payload à envoyer
//   mpApplyVisitSnapshot()   → côté visiteur : injecte le donjon distant
//
// Convention : aucun de ces helpers n'ouvre ni ferme `visitSession` —
// la session est posée par mpApplyVisitSnapshot et démontée par
// _restoreFromVisit. Le code appelant peut donc tester `visitSession`
// pour brancher l'UI/les permissions.
// ============================================================

// Sérialisation profonde via JSON — protège contre les fuites de
// références (un Object.assign ultérieur ne mute pas le snapshot).
// Restriction connue : ne porte pas les Set/Map natifs (encodés
// préalablement par _serializeState en tableaux). Suffisant pour la
// surface couverte ici.
function _visitDeepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Capture l'état runtime du visiteur en vue d'une visite. Retourne le
// snapshot (deep clone de _serializeState). À appeler AVANT
// mpApplyVisitSnapshot.
function _takeVisitSnapshot() {
  return _visitDeepClone(_serializeState());
}

// Restaure l'état du visiteur depuis `visitSession.mySavedState` et
// referme la session. Idempotent : ne fait rien si pas de session.
// Retourne true si une restauration a eu lieu.
function _restoreFromVisit() {
  if (!visitSession || !visitSession.mySavedState) {
    visitSession = null;
    return false;
  }
  const snap = visitSession.mySavedState;
  visitSession = null;
  _applyState(snap);
  return true;
}

// Cherche une case adjacente walkable autour de (x,y). Retourne
// {x,y,dir} avec `dir` orienté vers la case d'origine, ou {x,y,dir}
// de la case elle-même si aucun voisin n'est libre. Utilisé pour
// poser le visiteur à côté du host sans le téléporter dans un mur.
function _visitFindAdjacentSpawn(grid, x, y) {
  if (!Array.isArray(grid) || !Array.isArray(grid[0])) {
    return { x, y, dir: 's' };
  }
  const h = grid.length, w = grid[0].length;
  const WALKABLE = (cell) =>
    cell === CELL.FLOOR || cell === CELL.DOOR
    || cell === CELL.STAIRS_D || cell === CELL.STAIRS_U
    || cell === CELL.SHOP || cell === CELL.CHEST
    || cell === CELL.FOUNTAIN || cell === CELL.FORGE
    || cell === CELL.LIBRARY || cell === CELL.ALTAR;
  // Préférences : sud, nord, est, ouest (cohérent avec la convention DIRECTIONS)
  const offsets = [
    { dx: 0, dy: 1,  dir: 'n' },
    { dx: 0, dy: -1, dir: 's' },
    { dx: 1, dy: 0,  dir: 'w' },
    { dx: -1, dy: 0, dir: 'e' }
  ];
  for (const o of offsets) {
    const nx = x + o.dx, ny = y + o.dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    if (!WALKABLE(grid[ny][nx])) continue;
    return { x: nx, y: ny, dir: o.dir };
  }
  // Fallback : pose sur la cellule du host elle-même, regard vers le sud.
  return { x, y, dir: 's' };
}

// Construit le snapshot du host à envoyer au visiteur. Pure : ne lit
// que les arguments (avec fallback sur les globaux pour le confort
// du code appelant). En C.1 on ne sérialise que l'étage courant —
// les étages multiples seront ajoutés en C.3 (rendu).
//
// `partyOverride` : tableau de personnages (utilisé par les tests pour
// éviter de dépendre de `party` global). Si absent, lit `party`.
function mpBuildVisitSnapshot(opts) {
  const o = opts || {};
  const heroes = Array.isArray(o.party) ? o.party
               : (typeof party !== 'undefined' ? party : []);
  const heroNames = heroes
    .slice(0, (typeof partySize !== 'undefined' ? partySize : 1))
    .map(c => c && c.name).filter(Boolean);

  const floorNum = (typeof o.currentFloor === 'number') ? o.currentFloor
                 : (typeof currentFloor === 'number' ? currentFloor : 1);
  const grid     = o.dungeon || (typeof dungeon !== 'undefined' ? dungeon : null);
  const vmask    = o.visited || (typeof visited !== 'undefined' ? visited : null);
  const hx = (typeof o.playerX === 'number') ? o.playerX
           : (typeof playerX === 'number' ? playerX : 0);
  const hy = (typeof o.playerY === 'number') ? o.playerY
           : (typeof playerY === 'number' ? playerY : 0);
  const hdir = o.playerDir || (typeof playerDir !== 'undefined' ? playerDir : 's');

  const npcMap = o.npcPlacements
              || (typeof npcPlacements !== 'undefined' ? npcPlacements : new Map());
  const npcArr = npcMap instanceof Map
    ? Array.from(npcMap.entries())
    : (Array.isArray(npcMap) ? npcMap : []);

  const spawn = _visitFindAdjacentSpawn(grid, hx, hy);

  return _visitDeepClone({
    hostMeta: {
      id:           o.hostId      || null,
      name:         o.hostName    || 'Sorcier',
      house:        o.hostHouse   || null,
      level:        o.hostLevel   || 1,
      partyNames:   heroNames,
      currentFloor: floorNum
    },
    floor: {
      number:      floorNum,
      grid:        grid,
      visitedMask: vmask,
      npcPlacements: npcArr
    },
    hostPosition: { x: hx, y: hy, dir: hdir },
    visitorSpawn: spawn,
    _version: 1
  });
}

// Côté visiteur : injecte le snapshot du host dans les globaux et
// pose `visitSession`. Capture d'abord l'état du visiteur via
// _takeVisitSnapshot. Idempotent : si une visite est déjà active,
// refuse (retour false) — il faut sortir d'abord via _restoreFromVisit.
//
// Le donjon distant remplace `dungeon`, `visited` et `npcPlacements`.
// Les autres globaux du visiteur (party, inventaire, quêtes, maison)
// restent intouchés — ils sont restaurés par _restoreFromVisit.
function mpApplyVisitSnapshot(snapshot) {
  if (!snapshot || !snapshot.floor || !snapshot.hostMeta) return false;
  if (visitSession) return false;

  // 1) Capture défensive de l'état du visiteur (snapshot complet via JSON
  //    clone — pas de fuite de référence vers les globaux ré-affectés).
  const mine = _takeVisitSnapshot();

  // 2) Pose la session (avant injection — utile aux écouteurs qui
  //    écoutent les mutations de globaux).
  visitSession = {
    role:           'visitor',
    hostId:         snapshot.hostMeta.id   || null,
    hostName:       snapshot.hostMeta.name || 'Sorcier',
    hostHouse:      snapshot.hostMeta.house || null,
    mySavedState:   mine,
    remoteHostMeta: { ...snapshot.hostMeta }
  };

  // 3) Injection du donjon distant. Deep clone pour éviter que des
  //    mutations locales (ex. la prochaine visite reçue) corrompent
  //    le snapshot original conservé côté caller pour replay.
  const floor = _visitDeepClone(snapshot.floor);
  dungeon  = floor.grid;
  visited  = floor.visitedMask;
  // Neutralise enemyMap/itemMap : le visiteur ne combat pas, ne loote
  // pas en V1a (cf. §6.3 / §6.4). On garde des grilles 2D de la BONNE
  // forme pour ne pas casser les accès `enemyMap[y][x]` du renderer.
  const _gh = (dungeon && dungeon.length) || (typeof MAP_H !== 'undefined' ? MAP_H : 0);
  const _gw = (dungeon && dungeon[0] && dungeon[0].length)
            || (typeof MAP_W !== 'undefined' ? MAP_W : 0);
  enemyMap = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  itemMap  = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  npcPlacements = new Map(floor.npcPlacements || []);
  currentFloor  = floor.number || snapshot.hostMeta.currentFloor || 1;

  const spawn = snapshot.visitorSpawn || { x: 0, y: 0, dir: 's' };
  playerX   = spawn.x;
  playerY   = spawn.y;
  playerDir = spawn.dir;

  return true;
}

// Côté visiteur — patch d'étage envoyé par le host quand il descend
// ou remonte. Réutilise la même forme que mpBuildVisitSnapshot (champs
// floor, hostPosition, visitorSpawn, hostMeta) mais ne remet PAS
// `visitSession.mySavedState` à plat : la save d'origine du visiteur
// reste capturée, prête à être restaurée à la sortie.
//
// Idempotent côté no-op : si aucune session n'est active, retourne
// false sans rien muter. Si la session est active mais l'étage est
// identique à `currentFloor`, applique quand même (le host peut avoir
// regénéré l'étage — c'est le cas après une remontée).
function mpApplyVisitFloorUpdate(snapshot) {
  if (!snapshot || !snapshot.floor) return false;
  if (!visitSession) return false;

  const floor = _visitDeepClone(snapshot.floor);
  dungeon  = floor.grid;
  visited  = floor.visitedMask;
  const _gh = (dungeon && dungeon.length) || (typeof MAP_H !== 'undefined' ? MAP_H : 0);
  const _gw = (dungeon && dungeon[0] && dungeon[0].length)
            || (typeof MAP_W !== 'undefined' ? MAP_W : 0);
  enemyMap = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  itemMap  = Array.from({ length: _gh }, () => new Array(_gw).fill(null));
  npcPlacements = new Map(floor.npcPlacements || []);
  currentFloor  = floor.number
                || (snapshot.hostMeta && snapshot.hostMeta.currentFloor)
                || currentFloor;

  // Met à jour la méta affichée par le HUD (étage notamment).
  if (snapshot.hostMeta) {
    visitSession.remoteHostMeta = { ...snapshot.hostMeta };
  }

  const spawn = snapshot.visitorSpawn || { x: 0, y: 0, dir: 's' };
  playerX   = spawn.x;
  playerY   = spawn.y;
  playerDir = spawn.dir;

  return true;
}

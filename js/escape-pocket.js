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

// ── Tirage du type de Poche (Lot 3 : biais Maison + 3 types) ───────────────
function pickEscapePocketType() {
  return 'echo';  // Lot 1 : type unique « atteins la faille »
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
  enterEscapePocket(pickEscapePocketType());
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

// ── Génération d'une poche minimale (Lot 1) ────────────────────────────────
// Un petit couloir : le groupe entre à une extrémité, la faille (SEAL_RIFT) est
// à l'autre. Lot 2 remplacera ceci par 3 salles + épreuve réelle.
function generateEscapePocket(type, sourceFloor) {
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
  const my = Math.floor(H / 2);
  const x0 = 2, x1 = Math.min(W - 3, 12);
  for (let x = x0; x <= x1; x++) dungeon[my][x] = CELL.FLOOR;
  dungeon[my][x1] = CELL.SEAL_RIFT;
  playerX = x0; playerY = my; playerDir = 'e';
  visited[my][x0] = true;
  // Trackers d'étage propres à la poche.
  currentFloorEvent = 'escape';
  secretWalls = new Set();
  litRunes = new Set();
  runePuzzle = null;
  runeStele = null;
  searchedCells = new Map();
  npcPlacements = new Map();
  hiddenGardens = new Set();
  // État d'escape. Lot 1 : `solved:true` d'emblée (objectif = atteindre la
  // faille). Lot 2 mettra `solved:false` jusqu'à résolution de l'épreuve.
  escapePocketState = { type: type || 'echo', solved: true, progress: 0, sourceFloor };
}

// ── Entrée dans la Poche ───────────────────────────────────────────────────
function enterEscapePocket(type) {
  if (typeof inEscapePocket !== 'undefined' && inEscapePocket) return;
  _escapeSnapshot   = _captureFloorState();
  inEscapePocket    = true;
  escapePocketType  = type || 'echo';
  generateEscapePocket(escapePocketType, _escapeSnapshot.floor);
  _escapePocketUsedThisFloor = true;
  _lastEscapePocketFloor     = _escapeSnapshot.floor;
  _renderEscapeFloor();
  if (typeof setNarrative === 'function') {
    setNarrative("Une rune instable cède sous ton pas — le temps se replie. Tu "
      + "bascules dans une Poche du Sceau, écho figé du scellement des "
      + "Fondateurs. Trouve la faille pour en ressortir.");
  }
  if (typeof addMsg === 'function') addMsg("🌀 Une Poche du Sceau t'engloutit !", 'bad');
  if (typeof DFX_safe !== 'undefined' && DFX_safe.shakeView) DFX_safe.shakeView('heavy');
  if (typeof pulseFrostOverlay === 'function') pulseFrostOverlay();
}

// ── Sortie de la Poche (succès = re-scellement ; échec = éjection) ──────────
function exitEscapePocket(success) {
  if (typeof inEscapePocket === 'undefined' || !inEscapePocket || !_escapeSnapshot) return;
  // Au succès, la faille doit être dénouée (Lot 2+ : épreuve résolue).
  if (success && escapePocketState && escapePocketState.solved === false) return;
  _restoreFloorState(_escapeSnapshot);
  inEscapePocket    = false;
  escapePocketType  = null;
  escapePocketState = null;
  _escapeSnapshot   = null;
  if (typeof _hideExploreOverlay === 'function') _hideExploreOverlay();
  if (success) {
    escapePocketsCleared = (escapePocketsCleared || 0) + 1;
    // Lot 1 : récompense minimale = réchauffement (soin partiel). Le butin
    // détaillé (Éclat, Codex, livre élémentaire) arrive au Lot 4.
    if (typeof party !== 'undefined') {
      const n = (typeof partySize === 'number') ? partySize : party.length;
      party.slice(0, n).forEach(c => {
        if (!c || c.hp <= 0) return;
        c.hp = Math.min(c.hpMax, c.hp + Math.floor(c.hpMax * 0.30));
        c.sp = Math.min(c.spMax, c.sp + Math.floor(c.spMax * 0.30));
      });
    }
    if (typeof setNarrative === 'function') {
      setNarrative("Le sceau se referme dans ton dos. Le froid recule — tu es de "
        + "retour dans les Ruines, à l'endroit même où la rune t'a happé.");
    }
    if (typeof addMsg === 'function') addMsg("🌀 Tu as re-scellé la Poche et regagné les Ruines.", 'good');
  } else {
    // Échec : malus « corruption » passager (effet stat appliqué au Lot 3).
    corruptionMalusSteps = ESCAPE_MALUS_STEPS;
    if (typeof setNarrative === 'function') {
      setNarrative("La corruption te recrache hors de la Poche. Une morsure "
        + "glacée s'attarde sur le groupe.");
    }
    if (typeof addMsg === 'function') addMsg("❄️ La Poche t'éjecte — une corruption passagère t'affaiblit.", 'bad');
  }
  _renderEscapeFloor();
  if (typeof safeCall === 'function') safeCall('autoSave', 'escape-exit');
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
}

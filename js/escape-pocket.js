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
const ESCAPE_STELE_COUNT   = 3;     // Type A « L'Énigme des Quatre » : 3 stèles
const ESCAPE_BUDGET_BASE   = 40;    // budget de pas de base (jauge de corruption)
const ESCAPE_BUDGET_FLOOR  = 18;    // plancher du budget (difficulté max)
const ESCAPE_WRONG_FRAC    = 0.15;  // mauvaise réponse → +15 % de corruption

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
  return 'riddle';  // Lot 2 : Type A « L'Énigme des Quatre »
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

  const isRiddle = (type === 'riddle');
  let steles = [];
  if (isRiddle) {
    // Une stèle par salle (cellule FLOOR ≠ spawn ≠ faille).
    const slots = [];
    for (const r of rooms) {
      const cands = [];
      for (let y = r.y0; y <= r.y1; y++)
        for (let x = r.x0; x <= r.x1; x++) {
          if (dungeon[y] && dungeon[y][x] === CELL.FLOOR
              && !(x === playerX && y === playerY)
              && !(x === riftX && y === riftY)) cands.push([x, y]);
        }
      if (cands.length) slots.push(cands[Math.floor(Math.random() * cands.length)]);
    }
    const riddleIds = _pickEscapeRiddleIds(ESCAPE_STELE_COUNT);
    slots.slice(0, ESCAPE_STELE_COUNT).forEach(([sx, sy], i) => {
      dungeon[sy][sx] = CELL.STELE;
      steles.push({ cell: `${sx},${sy}`, riddleId: riddleIds[i], solved: false });
    });
  }

  // État d'escape. Type A : `solved:false` jusqu'à la dernière stèle gravée.
  escapePocketState = {
    type:     type || 'riddle',
    solved:   !isRiddle,
    progress: 0,
    total:    steles.length,
    steles,
    sourceFloor
  };
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
function enterEscapePocket(type) {
  if (typeof inEscapePocket !== 'undefined' && inEscapePocket) return;
  _escapeSnapshot   = _captureFloorState();
  inEscapePocket    = true;
  escapePocketType  = type || 'riddle';
  generateEscapePocket(escapePocketType, _escapeSnapshot.floor);
  _escapePocketUsedThisFloor = true;
  _lastEscapePocketFloor     = _escapeSnapshot.floor;
  // Budget de pas (jauge de corruption) — rétrécit avec la profondeur de Boucle.
  const depth = (typeof endgameTierIndex === 'function')
    ? endgameTierIndex(_escapeSnapshot.floor) : 1;
  escapeStepBudget = computeEscapeStepBudget(depth);
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
  escapeStepBudget  = 0;
  escapeStepSpent   = 0;
  hideEscapeHud();
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
      exitEscapePocket(false);
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

// ── Jauge de corruption — décompte de pas (appelé depuis _step) ─────────────
// Retourne true si le budget est épuisé (la Poche a éjecté le groupe en échec).
function _escapeOnStep() {
  if (!inEscapePocket) return false;
  escapeStepSpent = (escapeStepSpent || 0) + 1;
  _updateEscapeHud();
  if (escapeStepBudget > 0 && escapeStepSpent >= escapeStepBudget) {
    exitEscapePocket(false);
    return true;
  }
  return false;
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
  const total = (escapePocketState && escapePocketState.total) || ESCAPE_STELE_COUNT;
  const prog  = (escapePocketState && escapePocketState.progress) || 0;
  if (obj) obj.textContent = `${prog}/${total} glyphes gravés`;
  const pct = escapeCorruptionPct(escapeStepSpent, escapeStepBudget);
  if (fill) {
    fill.style.width = pct + '%';
    fill.setAttribute('data-critical', pct >= 70 ? '1' : '0');
  }
  if (lbl) lbl.textContent = `Corruption ${pct}%`;
  return true;
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
}

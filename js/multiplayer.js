// ============================================================
// MULTIJOUEUR — présence fantôme asynchrone (Phases 0-1)
// ============================================================
// Couche de présence via l'API REST Supabase, sur le modèle du Hall of
// Fame. Chaque joueur émet périodiquement sa position dans la table
// `mp_presence` (heartbeat) et lit celle des autres joueurs de son étage
// et de son mode (poll), projetés dans son donjon comme des « fantômes ».
//
// Dégradation silencieuse : si Supabase n'est pas configuré, si la table
// `mp_presence` n'existe pas, ou en cas d'échec réseau répété, la session
// multijoueur s'éteint d'elle-même (disjoncteur). Le jeu solo continue.
//
// Setup Supabase (SQL des tables) : voir .claude/plans/multiplayer.md §11bis.
// ============================================================

const MP_CONFIG = {
  // Même projet Supabase que le Hall of Fame (clé anon publique par design).
  supabaseUrl:     'https://hvdthitluhgevtuqhxpm.supabase.co',
  supabaseAnonKey: 'sb_publishable_zz2fPlpthCU0cee7VrVl5w_fwV0wrOb',
  presenceTable:   'mp_presence',
};

const MP_ID_KEY = 'hogwarts_rpg_player_id';

// Cadences (ms) — keepalive, poll des fantômes, throttle de l'upsert
// déclenché par un déplacement.
const MP_HEARTBEAT_MS     = 8000;
const MP_POLL_MS          = 8000;
const MP_MOVE_THROTTLE_MS = 3000;
// Un fantôme distant est « vivant » s'il a été vu il y a moins de 60 s.
const MP_STALE_SEC = 60;
// Disjoncteur : nombre d'échecs réseau consécutifs avant extinction.
const MP_MAX_FAILURES = 3;

// ── État de session ─────────────────────────────────────────
let mpActive = false;          // session multijoueur en cours
let mpMode   = 'normal';       // 'ironman' | 'normal' — figé au démarrage
// Fantômes projetés sur l'étage courant : Map "x,y" → ghost.
let ghostPlacements = new Map();

let _mpHeartbeatTimer = null;
let _mpPollTimer      = null;
let _mpLastUpsert     = 0;
let _mpUpsertInFlight = false;
let _mpFailCount      = 0;

// ── Identité joueur ─────────────────────────────────────────
function _mpFallbackUuid() {
  // Repli si crypto.randomUUID indisponible — suffisant pour une clé.
  return 'mp-' + Date.now().toString(36) + '-'
    + Math.random().toString(36).slice(2, 10);
}

// UUID stable du joueur, persisté dans le localStorage. Sert de clé
// d'upsert dans `mp_presence`.
function getMpPlayerId() {
  try {
    let id = localStorage.getItem(MP_ID_KEY);
    if (!id) {
      id = (window.crypto && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID() : _mpFallbackUuid();
      localStorage.setItem(MP_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return _mpFallbackUuid();
  }
}

function _mpConfigured() {
  // La couche présence exige HTTP(S) : inerte sous file:// (dev local et
  // tests fumée) — aucun appel réseau n'y est tenté.
  try { if (location.protocol === 'file:') return false; } catch (e) { /* noop */ }
  return !!(MP_CONFIG.supabaseUrl && MP_CONFIG.supabaseAnonKey);
}

function _mpHeaders(extra) {
  return Object.assign({
    'apikey':        MP_CONFIG.supabaseAnonKey,
    'Authorization': 'Bearer ' + MP_CONFIG.supabaseAnonKey,
  }, extra || {});
}

// ── Disjoncteur ─────────────────────────────────────────────
function _mpNoteSuccess() { _mpFailCount = 0; }

function _mpNoteFailure(e) {
  _mpFailCount++;
  if (_mpFailCount >= MP_MAX_FAILURES) {
    console.info('[mp] couche présence désactivée (réseau indisponible).');
    mpStopSession();
    mpActive = false;
  }
}

// ── Cycle de session ────────────────────────────────────────
// Démarre (ou redémarre) la session de présence. Idempotent : purge les
// timers existants. Appelé à l'entrée en jeu (startGame / loadSlotAndStart).
function mpStartSession() {
  mpStopSession();
  ghostPlacements = new Map();
  mpMode = (typeof ironmanMode !== 'undefined' && ironmanMode) ? 'ironman' : 'normal';
  _mpFailCount = 0;
  if (!_mpConfigured()) { mpActive = false; return; }
  mpActive = true;
  _mpUpsertPresence();
  _mpPollGhosts();
  _mpHeartbeatTimer = setInterval(_mpUpsertPresence, MP_HEARTBEAT_MS);
  _mpPollTimer      = setInterval(_mpPollGhosts,     MP_POLL_MS);
}

function mpStopSession() {
  if (_mpHeartbeatTimer) { clearInterval(_mpHeartbeatTimer); _mpHeartbeatTimer = null; }
  if (_mpPollTimer)      { clearInterval(_mpPollTimer);      _mpPollTimer = null; }
}

// ── Émission (heartbeat) ────────────────────────────────────
function _mpPresenceRow() {
  const size = (typeof partySize !== 'undefined') ? partySize : 1;
  const roster = (typeof party !== 'undefined' ? party : []).slice(0, size);
  return {
    player_id: getMpPlayerId(),
    name:      (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
    mode:      mpMode,
    floor:     (typeof currentFloor !== 'undefined') ? currentFloor : 1,
    x:         (typeof playerX !== 'undefined') ? playerX : 0,
    y:         (typeof playerY !== 'undefined') ? playerY : 0,
    hero_keys: roster.map(c => (c && c.heroKey) || 'harry'),
    house:     (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
    level:     (typeof player !== 'undefined' && player.level) || 1,
    status:    (typeof inBattle !== 'undefined' && inBattle) ? 'in_battle' : 'exploring',
    last_seen: new Date().toISOString(),
  };
}

async function _mpUpsertPresence() {
  if (!mpActive || !_mpConfigured() || _mpUpsertInFlight) return;
  if (typeof playerX === 'undefined' || typeof currentFloor === 'undefined') return;
  _mpUpsertInFlight = true;
  _mpLastUpsert = Date.now();
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.presenceTable}?on_conflict=player_id`,
      {
        method:  'POST',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(_mpPresenceRow()),
      }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _mpNoteSuccess();
  } catch (e) {
    _mpNoteFailure(e);
  } finally {
    _mpUpsertInFlight = false;
  }
}

// Hook de déplacement (movement.js — _step) : upsert throttlé.
function mpNotifyMove() {
  if (!mpActive) return;
  if (Date.now() - _mpLastUpsert < MP_MOVE_THROTTLE_MS) return;
  _mpUpsertPresence();
}

// ── Lecture & projection des fantômes ───────────────────────
async function _mpPollGhosts() {
  if (!mpActive || !_mpConfigured()) return;
  if (typeof currentFloor === 'undefined') return;
  try {
    const sinceIso = new Date(Date.now() - MP_STALE_SEC * 1000).toISOString();
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.presenceTable}`
      + '?select=player_id,name,mode,floor,x,y,hero_keys,house,level,status'
      + `&floor=eq.${currentFloor}`
      + `&mode=eq.${encodeURIComponent(mpMode)}`
      + `&player_id=neq.${encodeURIComponent(getMpPlayerId())}`
      + `&last_seen=gt.${encodeURIComponent(sinceIso)}`;
    const res = await fetch(url, { headers: _mpHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    if (Array.isArray(rows)) _mpProjectGhosts(rows);
  } catch (e) {
    _mpNoteFailure(e);
  }
}

// Projette des lignes de présence distantes sur le donjon local. Un
// fantôme n'est retenu que si sa case est praticable et libre ICI : case
// FLOOR, hors case du joueur, sans PNJ ni ennemi, une seule par case.
function _mpProjectGhosts(rows) {
  const next = new Map();
  if (typeof dungeon !== 'undefined' && dungeon && Array.isArray(rows)) {
    for (const r of rows) {
      if (!r) continue;
      const x = r.x | 0, y = r.y | 0;
      if (y < 0 || y >= dungeon.length || !dungeon[y]) continue;
      if (x < 0 || x >= dungeon[y].length) continue;
      if (typeof playerX !== 'undefined' && x === playerX && y === playerY) continue;
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      const key = x + ',' + y;
      if (next.has(key)) continue;
      if (typeof npcPlacements !== 'undefined' && npcPlacements.has(key)) continue;
      if (typeof enemyMap !== 'undefined' && enemyMap[y] && enemyMap[y][x]) continue;
      next.set(key, {
        playerId: r.player_id,
        name:     r.name || 'Sorcier',
        mode:     r.mode || 'normal',
        floor:    r.floor | 0,
        x: x, y: y,
        heroKeys: Array.isArray(r.hero_keys) ? r.hero_keys : [],
        house:    r.house || null,
        level:    r.level | 0,
        status:   r.status || 'exploring',
      });
    }
  }
  ghostPlacements = next;
  if (typeof drawDungeon === 'function')   drawDungeon();
  if (typeof renderMinimap === 'function') renderMinimap();
}

// Fantôme présent sur une case (consommé par le renderer et la minimap).
function getGhostAt(x, y) {
  if (!ghostPlacements || ghostPlacements.size === 0) return null;
  return ghostPlacements.get(x + ',' + y) || null;
}

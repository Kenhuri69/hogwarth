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

// ============================================================
// PHASE 2 — Interaction avec un fantôme (overlay type PNJ)
// ============================================================

// ── Phrase d'accroche (§4.9 du plan) ────────────────────────
// Fonction PURE et déterministe : la Maison choisit la banque (ton), la
// composition de héros (solo/duo + identités) sélectionne la phrase.
const MP_TAGLINES = {
  Gryffondor: [
    'Le courage le précède dans chaque couloir.',
    'Une lame tirée ne se rengaine qu\'au combat.',
    'Là où le danger gronde, ce Gryffondor se tient déjà.',
    'Le donjon ne l\'a pas fait reculer d\'un seul pas.',
  ],
  Serpentard: [
    'Chaque pas le rapproche d\'un dessein qu\'il garde pour lui.',
    'L\'ambition le guide là où d\'autres renoncent.',
    'Rien d\'un hasard dans sa route — tout d\'un calcul.',
    'Le pouvoir l\'attend au fond, et il le sait.',
  ],
  Serdaigle: [
    'Le donjon n\'est pour lui qu\'une énigme de plus à résoudre.',
    'Il lit ces murs comme d\'autres lisent un grimoire.',
    'Sa baguette suit toujours l\'esprit, jamais l\'inverse.',
    'Chaque secret arraché aux pierres le rend plus vif.',
  ],
  Poufsouffle: [
    'Patient et tenace, il avance sans jamais flancher.',
    'On le sait fidèle — le donjon n\'y changera rien.',
    'Il ne brille pas, il dure : c\'est là toute sa force.',
    'Le travail acharné l\'a mené ici, pierre après pierre.',
  ],
  _default: [
    'Un sorcier de passage, son histoire encore à écrire.',
    'Une présence amie arpente les mêmes pierres que toi.',
  ],
};

function ghostTagline(heroKeys, house) {
  const bank = MP_TAGLINES[house] || MP_TAGLINES._default;
  const keys = Array.isArray(heroKeys) ? heroKeys.slice().sort() : [];
  // Graine = nombre de héros (solo/duo) puis chaque caractère des clés.
  let h = keys.length + 1;
  for (const k of keys) {
    const s = String(k);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return bank[Math.abs(h) % bank.length];
}

// ── Overlay d'interaction ───────────────────────────────────
let _mpCurrentGhost = null;
let _mpEmoted       = false;

function _mpEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _mpHouseCrest(house) {
  const known = { Gryffondor: 1, Serpentard: 1, Serdaigle: 1, Poufsouffle: 1 };
  if (!house || !known[house]) return '';
  return `<img class="ghost-crest" src="img/houses/${house.toLowerCase()}.png"`
    + ` alt="${_mpEsc(house)}" title="${_mpEsc(house)}">`;
}

// En-tête commun (portraits du groupe, pseudo · niveau, blason, accroche).
function _mpGhostHeaderHtml(ghost) {
  const chars = (typeof CHARACTERS !== 'undefined') ? CHARACTERS : {};
  const keys  = Array.isArray(ghost.heroKeys) ? ghost.heroKeys : [];
  let portraits = '';
  keys.forEach(k => {
    const c = chars[k];
    if (c && c.imgSrc) {
      portraits += `<img class="ghost-portrait" src="${_mpEsc(c.imgSrc)}"`
        + ` alt="${_mpEsc(c.name)}" title="${_mpEsc(c.name)}">`;
    } else {
      portraits += '<span class="ghost-portrait ghost-portrait-empty">🧙</span>';
    }
  });
  if (!portraits) portraits = '<span class="ghost-portrait ghost-portrait-empty">🧙</span>';
  const sub = 'Niveau ' + (ghost.level | 0)
    + (ghost.house ? ' · ' + _mpEsc(ghost.house) : '');
  return ''
    + '<div class="ghost-spectral-tag">✦ Spectre d\'un autre sorcier</div>'
    + '<div class="ghost-header">'
    +   '<div class="ghost-portraits">' + portraits + '</div>'
    +   '<div class="ghost-id">'
    +     '<div class="ghost-name">' + _mpEsc(ghost.name || 'Sorcier') + '</div>'
    +     '<div class="ghost-sub">' + sub + '</div>'
    +   '</div>'
    +   _mpHouseCrest(ghost.house)
    + '</div>'
    + '<div class="ghost-tagline">« ' + _mpEsc(ghostTagline(keys, ghost.house)) + ' »</div>';
}

function openGhostInteraction(ghost) {
  if (!ghost) return;
  _mpCurrentGhost = ghost;
  _mpEmoted = false;
  _mpRenderGhostMain();
  const overlay = document.getElementById('ghost-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeGhostOverlay() {
  const overlay = document.getElementById('ghost-overlay');
  if (overlay) overlay.style.display = 'none';
  _mpCurrentGhost = null;
}

function _mpRenderGhostMain() {
  const panel = document.getElementById('ghost-panel');
  if (!panel || !_mpCurrentGhost) return;
  const g = _mpCurrentGhost;
  const saluer = _mpEmoted
    ? '<button class="ghost-btn" disabled>✓ Salut adressé</button>'
    : '<button class="ghost-btn" onclick="mpEmoteGhost()">👋 Saluer</button>';
  panel.innerHTML = ''
    + _mpGhostHeaderHtml(g)
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn" onclick="mpInspectGhost()">🔍 Inspecter</button>'
    +   saluer
    +   '<button class="ghost-btn ghost-btn-soon" disabled'
    +     ' title="Combat PvP — phase ultérieure">⚔️ Défier</button>'
    +   '<button class="ghost-btn ghost-btn-soon" disabled'
    +     ' title="Cadeaux — phase ultérieure">🎁 Offrir</button>'
    + '</div>'
    + '<button class="ghost-btn ghost-btn-close" onclick="closeGhostOverlay()">'
    +   'Reprendre l\'exploration</button>';
}

// Fiche d'inspection — lecture seule. Détaille la composition et les
// méta-infos de présence. Les statistiques complètes (équipement, sorts)
// arriveront avec le snapshot de duel (phase ultérieure).
function mpInspectGhost() {
  const panel = document.getElementById('ghost-panel');
  if (!panel || !_mpCurrentGhost) return;
  const g = _mpCurrentGhost;
  const chars = (typeof CHARACTERS !== 'undefined') ? CHARACTERS : {};
  const keys  = Array.isArray(g.heroKeys) ? g.heroKeys : [];
  let heroes = '';
  keys.forEach(k => {
    const c = chars[k];
    if (!c) return;
    const av = c.imgSrc
      ? `<img class="ghost-hero-av" src="${_mpEsc(c.imgSrc)}" alt="">`
      : '<span class="ghost-hero-av">🧙</span>';
    heroes += '<div class="ghost-inspect-hero">' + av
      + '<div><b>' + _mpEsc(c.name) + '</b>'
      + '<span>' + _mpEsc(c.role || '') + ' · ' + _mpEsc(c.class || '') + '</span></div>'
      + '</div>';
  });
  if (!heroes) heroes = '<div class="ghost-inspect-hero"><span>Composition inconnue.</span></div>';
  const rows = [
    ['Maison',  g.house || '—'],
    ['Niveau',  String(g.level | 0)],
    ['Mode',    g.mode === 'ironman' ? 'Ironman ☠' : 'Normal'],
    ['État',    g.status === 'in_battle' ? 'En combat' : 'En exploration'],
  ].map(([k, v]) =>
    '<div class="ghost-inspect-row"><span>' + _mpEsc(k) + '</span>'
    + '<span>' + _mpEsc(v) + '</span></div>').join('');
  panel.innerHTML = ''
    + _mpGhostHeaderHtml(g)
    + '<div class="ghost-inspect">'
    +   rows
    +   '<div class="ghost-inspect-heroes">' + heroes + '</div>'
    +   '<p class="ghost-inspect-note">Statistiques détaillées révélées'
    +     ' lors d\'un duel (phase ultérieure).</p>'
    + '</div>'
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn" onclick="_mpRenderGhostMain()">← Retour</button>'
    +   '<button class="ghost-btn ghost-btn-close" onclick="closeGhostOverlay()">'
    +     'Fermer</button>'
    + '</div>';
}

// Emote — salut cosmétique. La remise du « ping » au joueur distant
// (table mp_messages) est différée à une phase ultérieure ; ici l'effet
// est purement local.
function mpEmoteGhost() {
  if (!_mpCurrentGhost) return;
  _mpEmoted = true;
  const nm = _mpCurrentGhost.name || 'le spectre';
  if (typeof addMsg === 'function') {
    addMsg('👋 Tu salues ' + nm + ' d\'un signe de la main.', 'good');
  }
  _mpRenderGhostMain();
}

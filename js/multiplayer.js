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
  messagesTable:   'mp_messages',
};

const MP_ID_KEY = 'hogwarts_rpg_player_id';

// Cadences (ms) — keepalive, poll des fantômes, throttle de l'upsert
// déclenché par un déplacement.
const MP_HEARTBEAT_MS     = 8000;
const MP_POLL_MS          = 8000;
const MP_MSG_POLL_MS      = 15000;          // les messages changent lentement
const MP_MSG_POST_COOLDOWN_MS = 20000;      // anti-spam de gravure
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
// Messages laissés par les joueurs sur l'étage courant : Map "x,y" → msg.
let messagePlacements = new Map();

let _mpHeartbeatTimer = null;
let _mpPollTimer      = null;
let _mpMsgTimer       = null;
let _mpLastUpsert     = 0;
let _mpUpsertInFlight = false;
let _mpFailCount      = 0;
let _mpLastMsgPost    = 0;

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
  ghostPlacements   = new Map();
  messagePlacements = new Map();
  mpMode = (typeof ironmanMode !== 'undefined' && ironmanMode) ? 'ironman' : 'normal';
  _mpFailCount = 0;
  if (!_mpConfigured()) { mpActive = false; return; }
  mpActive = true;
  _mpUpsertPresence();
  _mpPollGhosts();
  _mpPollMessages();
  _mpHeartbeatTimer = setInterval(_mpUpsertPresence, MP_HEARTBEAT_MS);
  _mpPollTimer      = setInterval(_mpPollGhosts,     MP_POLL_MS);
  _mpMsgTimer       = setInterval(_mpPollMessages,   MP_MSG_POLL_MS);
}

function mpStopSession() {
  if (_mpHeartbeatTimer) { clearInterval(_mpHeartbeatTimer); _mpHeartbeatTimer = null; }
  if (_mpPollTimer)      { clearInterval(_mpPollTimer);      _mpPollTimer = null; }
  if (_mpMsgTimer)       { clearInterval(_mpMsgTimer);       _mpMsgTimer = null; }
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
    snapshot:  mpBuildSnapshot(),       // groupe sérialisé pour le duel (§5)
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
  const beaten = (typeof defeatedDuelists !== 'undefined') && g.playerId
    && defeatedDuelists.has(g.playerId);
  const defier = beaten
    ? '<button class="ghost-btn ghost-btn-soon" disabled'
      + ' title="Adversaire déjà vaincu">⚔️ Déjà vaincu</button>'
    : '<button class="ghost-btn ghost-btn-duel" onclick="mpChallengeGhost()">⚔️ Défier</button>';
  panel.innerHTML = ''
    + _mpGhostHeaderHtml(g)
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn" onclick="mpInspectGhost()">🔍 Inspecter</button>'
    +   saluer
    +   defier
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

// ============================================================
// PHASE 3 — Duel PvP contre un snapshot asynchrone (§5)
// ============================================================
// Le combat réutilise intégralement le moteur PvE : un snapshot de groupe
// adverse est converti en `enemyGroup` (un ennemi par héros). L'« IA de
// groupe de héros » du plan §5.1 est obtenue en mappant les sorts connus
// vers les capacités ennemies existantes (`tryEnemyAbility`) — pas de
// nouveau moteur d'IA, donc pas de `battle-ai.js` (écart assumé : voir
// .claude/plans/multiplayer.md §11quater). startBattle reçoit le groupe
// pré-construit via `opts.duelGroup` ; endBattle/enemyTurn branchent sur
// `mpDuelActive` pour l'issue PvP.

// ── Snapshot du groupe local ────────────────────────────────
// Instantané sérialisable du groupe du joueur — émis dans `mp_presence`
// et lu par un adversaire qui défie ce joueur.
function mpBuildSnapshot() {
  const size   = (typeof partySize !== 'undefined') ? partySize : 1;
  const roster = (typeof party !== 'undefined' ? party : []).slice(0, size);
  return {
    name:  (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
    level: (typeof player !== 'undefined' && player.level) || 1,
    house: (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
    mode:  mpMode,
    heroes: roster.map(c => ({
      heroKey: c.heroKey || 'harry',
      name: c.name, icon: c.icon, level: c.level || 1,
      hpMax: c.hpMax | 0, spMax: c.spMax | 0,
      atk: c.atk | 0, def: c.def | 0, mag: c.mag | 0,
      agi: c.agi | 0, lck: c.lck | 0,
      spells: Array.isArray(c.spells) ? c.spells.slice() : [],
      equipment: c.equipped
        ? Object.values(c.equipped).filter(Boolean).map(it => ({ ...it }))
        : [],
    })),
  };
}

// ── Mapping snapshot → ennemi (« IA » de duelliste) ─────────
function _mpSpellByName(name) {
  if (typeof SPELLS === 'undefined') return null;
  return SPELLS.find(s => s.name === name) || null;
}
function _mpHasOffensiveSpell(spells) {
  return Array.isArray(spells) && spells.some(n => {
    const sp = _mpSpellByName(n);
    return sp && sp.element;          // tout sort élémentaire est offensif
  });
}
function _mpHasHealSpell(spells) {
  return Array.isArray(spells) && spells.some(n => {
    const sp = _mpSpellByName(n);
    return sp && /^heal|^support_regen/.test(sp.effect || '');
  });
}

// Convertit un héros du snapshot en objet ennemi (forme « monstre »
// attendue par le moteur de combat).
function _mpHeroToEnemy(h, i) {
  const chars = (typeof CHARACTERS !== 'undefined') ? CHARACTERS : {};
  const c     = chars[h.heroKey] || null;
  const mag   = h.mag | 0;
  const abilities = [];
  if (_mpHasOffensiveSpell(h.spells)) {
    abilities.push({ name: 'Sortilège', icon: '✨', effect: 'damage',
                     power: 7 + Math.floor(mag * 0.9), chance: 0.42 });
  }
  if (_mpHasHealSpell(h.spells)) {
    abilities.push({ name: 'Sortilège de soin', icon: '💚', effect: 'heal',
                     power: 9 + Math.floor(mag * 0.7), chance: 0.26 });
  }
  if (Array.isArray(h.spells) && h.spells.includes('Stupefix')) {
    abilities.push({ name: 'Stupefix', icon: '💫', effect: 'status',
                     statusId: 'stun', power: 0, turns: 1, chance: 0.14 });
  }
  return {
    id: 'mp_duelist_' + i,
    isDuelist: true,
    name:     h.name || (c && c.name) || 'Duelliste',
    icon:     h.icon || (c && c.icon) || '🧙',
    imgSrc:   (c && c.imgSrc) || null,
    category: 'humain',
    desc:     (h.name || 'Un sorcier') + ' te défie en duel',
    hp:  Math.max(1, h.hpMax | 0),
    atk: Math.max(1, h.atk | 0),
    def: Math.max(0, h.def | 0),
    mag: mag,
    agi: Math.max(0, h.agi | 0),
    lck: Math.max(0, h.lck | 0),
    abilities: abilities,
    ai: 'aggressive',
    resist: [], weak: [],
    xp: 0, gold: 0, drops: [],
    variant: 'normal',
  };
}

// ── Lancement d'un duel ─────────────────────────────────────
function mpStartDuel(snapshot, ghostMeta) {
  if (!snapshot || !Array.isArray(snapshot.heroes) || !snapshot.heroes.length) return false;
  if (typeof startBattle !== 'function') return false;
  if (typeof inBattle !== 'undefined' && inBattle) return false;
  const group = snapshot.heroes.slice(0, 3).map((h, i) => _mpHeroToEnemy(h, i));
  mpDuelActive = true;
  mpDuelMeta   = {
    playerId: ghostMeta && ghostMeta.playerId,
    name:     (ghostMeta && ghostMeta.name) || snapshot.name || 'Duelliste',
    level:    snapshot.level || (ghostMeta && ghostMeta.level) || 1,
    snapshot: snapshot,
  };
  startBattle(group[0], { duelGroup: group });
  if (typeof addMsg === 'function') {
    addMsg('⚔️ Duel engagé contre ' + mpDuelMeta.name + ' !', 'bad');
  }
  return true;
}

// Lit le snapshot d'un joueur à la demande (le poll ne le transporte pas).
async function _mpFetchSnapshot(playerId) {
  if (!_mpConfigured() || !playerId) return null;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.presenceTable}`
      + '?select=snapshot,name,level'
      + `&player_id=eq.${encodeURIComponent(playerId)}`;
    const res = await fetch(url, { headers: _mpHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0] && rows[0].snapshot) {
      const snap = rows[0].snapshot;
      if (snap.name  == null) snap.name  = rows[0].name;
      if (snap.level == null) snap.level = rows[0].level;
      return snap;
    }
    return null;
  } catch (e) { return null; }
}

// Action ⚔️ Défier de l'overlay : récupère le snapshot puis lance le duel.
function mpChallengeGhost() {
  const g = _mpCurrentGhost;
  if (!g) return;
  if (typeof defeatedDuelists !== 'undefined' && g.playerId
      && defeatedDuelists.has(g.playerId)) {
    if (typeof addMsg === 'function') addMsg('Tu as déjà vaincu ce spectre.', 'info');
    return;
  }
  closeGhostOverlay();
  if (typeof addMsg === 'function') {
    addMsg('Tu défies ' + (g.name || 'le spectre') + '… invocation de son groupe.', 'info');
  }
  _mpFetchSnapshot(g.playerId).then(snap => {
    if (!snap || !Array.isArray(snap.heroes) || !snap.heroes.length) {
      if (typeof addMsg === 'function') {
        addMsg('Ce spectre est trop ténu pour être défié — réessaie plus tard.', 'bad');
      }
      return;
    }
    if (snap.name == null)  snap.name  = g.name;
    if (snap.level == null) snap.level = g.level;
    mpStartDuel(snap, g);
  });
}

// ── Issue du duel ───────────────────────────────────────────
// Choisit le butin copié sur le vaincu : un sort inconnu en priorité,
// sinon un équipement non possédé, sinon repli en or (§5.2). Le choix
// explicite par le vainqueur est différé (polish — plan §11quater).
function _mpPickDuelLoot(snapshot) {
  const heroes = (snapshot && Array.isArray(snapshot.heroes)) ? snapshot.heroes : [];
  const size   = (typeof partySize !== 'undefined') ? partySize : 1;
  const mine   = (typeof party !== 'undefined' ? party : []).slice(0, size);
  const known  = new Set();
  mine.forEach(c => (c.spells || []).forEach(s => known.add(s)));
  for (const h of heroes) {
    for (const s of (h.spells || [])) {
      if (!known.has(s)) return { kind: 'spell', spell: s };
    }
  }
  const owned = new Set();
  ((typeof player !== 'undefined' && player.inventory) || []).forEach(it => {
    if (it && it.id) owned.add(it.id);
  });
  mine.forEach(c => {
    if (c.equipped) Object.values(c.equipped).forEach(it => { if (it && it.id) owned.add(it.id); });
  });
  for (const h of heroes) {
    for (const it of (h.equipment || [])) {
      if (it && it.id && !owned.has(it.id)) return { kind: 'item', item: it };
    }
  }
  return { kind: 'gold', gold: 120 };
}

function _mpResolveDuelVictory(meta) {
  if (meta && meta.playerId && typeof defeatedDuelists !== 'undefined') {
    defeatedDuelists.add(meta.playerId);
  }
  const advName  = (meta && meta.name) || 'ton adversaire';
  const advLevel = Math.max(1, (meta && meta.level) | 0);
  const ironman  = (typeof ironmanMode !== 'undefined') && ironmanMode;
  const size     = (typeof partySize !== 'undefined') ? partySize : 1;

  if (ironman) {
    // §5.2 — victoire Ironman : copie d'un bien du vaincu (non affecté).
    const loot = _mpPickDuelLoot(meta && meta.snapshot);
    if (loot.kind === 'spell') {
      party.slice(0, size).forEach(c => {
        if (Array.isArray(c.spells) && !c.spells.includes(loot.spell)) {
          c.spells.push(loot.spell);
        }
      });
      if (typeof addMsg === 'function') {
        addMsg('🏆 Duel remporté ! Tu copies le sort « ' + loot.spell + ' » de ' + advName + '.', 'magic');
      }
    } else if (loot.kind === 'item') {
      const added = (typeof tryAddItem === 'function')
        && tryAddItem(loot.item, { silent: true });
      if (added && typeof addMsg === 'function') {
        addMsg('🏆 Duel remporté ! Tu copies « ' + loot.item.name + ' » de ' + advName + '.', 'magic');
      } else if (!added) {
        player.gold += 80;
        if (typeof addMsg === 'function') {
          addMsg('🏆 Duel remporté ! Sac plein — butin converti en 80 Gallions.', 'good');
        }
      }
    } else {
      player.gold += loot.gold;
      if (typeof addMsg === 'function') {
        addMsg('🏆 Duel remporté ! Rien de neuf à copier — +' + loot.gold + ' Gallions.', 'good');
      }
    }
    setNarrative('Victoire en duel sur ' + advName + ' !');
  } else {
    // §5.4 — victoire normale : or + XP modulés par l'écart de niveau.
    const gap  = advLevel - Math.max(1, (player.level | 0));
    const mult = Math.max(0.25, Math.min(2.0, 1 + gap * 0.15));
    const gold = Math.round((20 + 10 * advLevel) * mult);
    const xp   = Math.round((15 +  8 * advLevel) * mult);
    player.gold += gold;
    player.xp   += xp;
    if (typeof addMsg === 'function') {
      addMsg('🏆 Duel remporté contre ' + advName + ' !', 'good');
      addMsg('+' + xp + ' XP, +' + gold + ' Gallions', 'good');
    }
    setNarrative('Victoire en duel ! +' + xp + ' XP, +' + gold + ' Gallions.');
  }
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playVictory) AudioSystem.playVictory();
  if (typeof checkLevelUp === 'function') checkLevelUp();
  if (typeof renderMinimap === 'function') renderMinimap();
}

// §5.3 — défaite en duel normal : aucune conséquence, le groupe se relève.
function _mpResolveDuelDefeatNormal() {
  const size = (typeof partySize !== 'undefined') ? partySize : 1;
  party.slice(0, size).forEach(c => {
    if (c.hp <= 0) c.hp = Math.max(1, Math.floor(c.hpMax * 0.3));
    c.sp = Math.max(c.sp || 0, Math.floor(c.spMax * 0.3));
  });
  if (typeof clearAllStatuses  === 'function') clearAllStatuses();
  if (typeof recalculateStats  === 'function') recalculateStats();
  if (typeof addMsg === 'function') {
    addMsg('Duel perdu — en mode normal, aucune perte. Ton groupe se relève.', 'info');
  }
  setNarrative('Le duel tourne court, mais tu repars indemne.');
  if (typeof updateUI    === 'function') updateUI();
  if (typeof drawDungeon === 'function') drawDungeon();
}

// ============================================================
// PHASE 4 — Messages à gabarits (§6, façon Dark Souls)
// ============================================================
// Aucun texte libre : un message = un gabarit + un mot, tous deux issus
// de banques prédéfinies. Stocké par `id` dans `mp_messages` ; le texte
// est recomposé côté lecteur depuis SES banques locales → toute ligne
// dont le gabarit/mot est inconnu est simplement ignorée (anti-injection).

// Gabarits — `%` est le point d'insertion du mot ; sans `%` = phrase fixe.
const MP_MSG_TEMPLATES = [
  { id: 'beware',   text: 'Méfie-toi de %' },
  { id: 'try',      text: 'Essaie %' },
  { id: 'here',     text: 'Ici, %' },
  { id: 'ahead',    text: '% droit devant' },
  { id: 'need',     text: 'Il te faut %' },
  { id: 'ifonly',   text: 'Si seulement j\'avais eu %…' },
  { id: 'hidefrom', text: 'Cache-toi de %' },
  { id: 'luck',     text: 'Bonne chance, sorcier' },
  { id: 'congrats', text: 'Félicitations !' },
  { id: 'courage',  text: 'Courage — tu y es presque' },
];

// Mots — banque fermée.
const MP_MSG_WORDS = [
  { id: 'trap',     text: 'un piège' },
  { id: 'monster',  text: 'un monstre' },
  { id: 'boss',     text: 'un boss redoutable' },
  { id: 'chest',    text: 'un coffre' },
  { id: 'gold',     text: 'de l\'or' },
  { id: 'secret',   text: 'un passage secret' },
  { id: 'fountain', text: 'une fontaine' },
  { id: 'exit',     text: 'la sortie' },
  { id: 'stairs',   text: 'l\'escalier' },
  { id: 'spell',    text: 'un sortilège' },
  { id: 'fire',     text: 'la magie de feu' },
  { id: 'ice',      text: 'la magie de glace' },
  { id: 'dementor', text: 'un Détraqueur' },
  { id: 'potion',   text: 'une potion' },
  { id: 'caution',  text: 'la prudence' },
  { id: 'wand',     text: 'une meilleure baguette' },
  { id: 'courage',  text: 'du courage' },
  { id: 'rest',     text: 'du repos' },
];

// Recompose le texte d'un message depuis les banques locales.
function mpComposeText(templateId, wordId) {
  const t = MP_MSG_TEMPLATES.find(x => x.id === templateId);
  if (!t) return null;
  if (t.text.indexOf('%') === -1) return t.text;
  const w = MP_MSG_WORDS.find(x => x.id === wordId);
  if (!w) return null;
  return t.text.replace('%', w.text);
}

function getMessageAt(x, y) {
  if (!messagePlacements || messagePlacements.size === 0) return null;
  return messagePlacements.get(x + ',' + y) || null;
}

// ── Lecture & projection ────────────────────────────────────
async function _mpPollMessages() {
  if (!mpActive || !_mpConfigured()) return;
  if (typeof currentFloor === 'undefined') return;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.messagesTable}`
      + '?select=author_id,author_name,floor,x,y,template,word'
      + `&floor=eq.${currentFloor}`
      + `&mode=eq.${encodeURIComponent(mpMode)}`
      + '&order=created_at.desc&limit=80';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    if (Array.isArray(rows)) _mpProjectMessages(rows);
  } catch (e) {
    _mpNoteFailure(e);
  }
}

// Projette les messages distants sur les cases FLOOR du donjon local.
function _mpProjectMessages(rows) {
  const next = new Map();
  if (typeof dungeon !== 'undefined' && dungeon && Array.isArray(rows)) {
    for (const r of rows) {
      if (!r) continue;
      const x = r.x | 0, y = r.y | 0;
      if (y < 0 || y >= dungeon.length || !dungeon[y]) continue;
      if (x < 0 || x >= dungeon[y].length) continue;
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      const text = mpComposeText(r.template, r.word);
      if (!text) continue;                    // gabarit/mot hors banque → ignoré
      const key = x + ',' + y;
      if (next.has(key)) continue;            // rows triés desc → le 1er = le + récent
      next.set(key, {
        x: x, y: y, text: text,
        authorName: r.author_name || 'Sorcier',
        authorId:   r.author_id,
      });
    }
  }
  messagePlacements = next;
  if (typeof drawDungeon   === 'function') drawDungeon();
  if (typeof renderMinimap === 'function') renderMinimap();
}

// ── Gravure d'un message ────────────────────────────────────
function mpPostMessage(templateId, wordId) {
  const text = mpComposeText(templateId, wordId);
  if (!text) return false;
  if (typeof playerX === 'undefined' || typeof playerY === 'undefined') return false;
  // Feedback local immédiat (le message apparaît sans attendre un poll).
  messagePlacements.set(playerX + ',' + playerY, {
    x: playerX, y: playerY, text: text,
    authorName: (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
    authorId:   getMpPlayerId(),
  });
  _mpLastMsgPost = Date.now();
  if (typeof drawDungeon   === 'function') drawDungeon();
  if (typeof renderMinimap === 'function') renderMinimap();
  if (typeof addMsg === 'function') addMsg('🪶 Message gravé : « ' + text + ' »', 'good');
  if (!_mpConfigured()) return true;          // file:// : gravure locale seule
  (async () => {
    try {
      const res = await fetch(
        `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.messagesTable}`
          + '?on_conflict=author_id,floor,x,y',
        {
          method:  'POST',
          headers: _mpHeaders({
            'Content-Type': 'application/json',
            'Prefer':       'resolution=merge-duplicates,return=minimal',
          }),
          body: JSON.stringify({
            author_id:   getMpPlayerId(),
            author_name: (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
            mode:  mpMode,
            floor: currentFloor, x: playerX, y: playerY,
            template: templateId, word: wordId,
            created_at: new Date().toISOString(),
          }),
        }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _mpNoteSuccess();
    } catch (e) {
      _mpNoteFailure(e);
    }
  })();
  return true;
}

// ── Overlay : composition / lecture ─────────────────────────
let _mpMsgTemplate = null;
let _mpMsgWord     = null;

function closeMessageOverlay() {
  const ov = document.getElementById('mp-message-overlay');
  if (ov) ov.style.display = 'none';
}

// Point d'entrée du bouton 🪶 : lit le message de la case ou ouvre le
// compositeur si la case (FLOOR) est libre.
function openMessageComposer() {
  if (typeof inBattle !== 'undefined' && inBattle) return;
  const existing = (typeof playerX !== 'undefined') ? getMessageAt(playerX, playerY) : null;
  if (existing) { _mpRenderMessageRead(existing); return; }
  const onFloor = typeof dungeon !== 'undefined' && dungeon
    && dungeon[playerY] && dungeon[playerY][playerX] === CELL.FLOOR;
  if (!onFloor) {
    if (typeof addMsg === 'function') {
      addMsg('Tu ne peux graver un message que sur une case de couloir dégagée.', 'info');
    }
    return;
  }
  _mpMsgTemplate = null;
  _mpMsgWord     = null;
  _mpRenderComposer();
  const ov = document.getElementById('mp-message-overlay');
  if (ov) ov.style.display = 'flex';
}

function _mpRenderMessageRead(msg) {
  const panel = document.getElementById('mp-message-panel');
  if (!panel) return;
  panel.innerHTML = ''
    + '<div class="mp-msg-title">📜 Message gravé</div>'
    + '<div class="mp-msg-quote">« ' + _mpEsc(msg.text) + ' »</div>'
    + '<div class="mp-msg-author">— gravé par ' + _mpEsc(msg.authorName || 'Sorcier') + '</div>'
    + '<button class="ghost-btn ghost-btn-close" onclick="closeMessageOverlay()">Fermer</button>';
  const ov = document.getElementById('mp-message-overlay');
  if (ov) ov.style.display = 'flex';
}

function _mpSelectTemplate(id) { _mpMsgTemplate = id; _mpRenderComposer(); }
function _mpSelectWord(id)     { _mpMsgWord = id;     _mpRenderComposer(); }

function _mpRenderComposer() {
  const panel = document.getElementById('mp-message-panel');
  if (!panel) return;
  const tpl = MP_MSG_TEMPLATES.find(t => t.id === _mpMsgTemplate);
  const needsWord = tpl && tpl.text.indexOf('%') !== -1;
  const preview = tpl
    ? (needsWord
        ? (_mpMsgWord ? mpComposeText(_mpMsgTemplate, _mpMsgWord) : tpl.text.replace('%', '…'))
        : tpl.text)
    : '…';
  const ready = !!tpl && (!needsWord || !!_mpMsgWord);

  const tplBtns = MP_MSG_TEMPLATES.map(t =>
    '<button class="mp-chip' + (t.id === _mpMsgTemplate ? ' mp-chip-on' : '') + '"'
    + ' onclick="_mpSelectTemplate(\'' + t.id + '\')">'
    + _mpEsc(t.text.replace('%', '___')) + '</button>').join('');
  const wordBtns = MP_MSG_WORDS.map(w =>
    '<button class="mp-chip' + (w.id === _mpMsgWord ? ' mp-chip-on' : '') + '"'
    + (needsWord ? '' : ' disabled')
    + ' onclick="_mpSelectWord(\'' + w.id + '\')">'
    + _mpEsc(w.text) + '</button>').join('');

  panel.innerHTML = ''
    + '<div class="mp-msg-title">🪶 Graver un message</div>'
    + '<div class="mp-msg-preview">« ' + _mpEsc(preview) + ' »</div>'
    + '<div class="mp-msg-section">Gabarit</div>'
    + '<div class="mp-chip-row">' + tplBtns + '</div>'
    + '<div class="mp-msg-section' + (needsWord ? '' : ' mp-msg-dim') + '">Mot</div>'
    + '<div class="mp-chip-row">' + wordBtns + '</div>'
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn' + (ready ? '' : ' ghost-btn-soon') + '"'
    +     (ready ? '' : ' disabled')
    +     ' onclick="_mpConfirmMessage()">Graver</button>'
    +   '<button class="ghost-btn ghost-btn-close" onclick="closeMessageOverlay()">Annuler</button>'
    + '</div>';
}

function _mpConfirmMessage() {
  if (!_mpMsgTemplate) return;
  const now = Date.now();
  if (now - _mpLastMsgPost < MP_MSG_POST_COOLDOWN_MS) {
    if (typeof addMsg === 'function') {
      addMsg('Tu viens de graver un message — laisse un peu reposer ta plume.', 'info');
    }
    return;
  }
  if (mpPostMessage(_mpMsgTemplate, _mpMsgWord)) closeMessageOverlay();
}

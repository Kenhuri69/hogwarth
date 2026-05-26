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
  giftsTable:      'mp_gifts',
};

const MP_ID_KEY = 'hogwarts_rpg_player_id';

// Cadences (ms) — keepalive, poll des fantômes, throttle de l'upsert
// déclenché par un déplacement.
const MP_HEARTBEAT_MS     = 8000;
const MP_POLL_MS          = 8000;
const MP_MSG_POLL_MS      = 15000;          // les messages changent lentement
const MP_MSG_POST_COOLDOWN_MS = 20000;      // anti-spam de gravure
const MP_MOVE_THROTTLE_MS = 3000;

// Cadeaux (§6) — 500 Gallions max par envoi, 1 cadeau / destinataire / heure.
// Cooldown en mémoire — soft UX guard (RLS ouvert côté base de toute façon).
const MP_GIFT_GOLD_MAX        = 500;
const MP_GIFT_RECIPIENT_COOLDOWN_MS = 3600000;
// Un fantôme distant est « vivant » s'il a été vu il y a moins d'1 h.
// Conservé long pour laisser les empreintes des amis hors-ligne visibles
// pendant une session de jeu typique (positions fixes sur leur dernière
// case connue). Le filtre est appliqué côté lecteur via `last_seen=gt.…`.
const MP_STALE_SEC = 3600;
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
// Map<recipient_id, ts> — dernière offrande envoyée à chaque destinataire.
let _mpGiftCooldowns  = new Map();

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
  // Réclamation de la boîte aux lettres une seule fois par session — les
  // cadeaux non claimés restent en base et sont rejoués à la prochaine
  // connexion si l'inventaire était plein.
  if (typeof claimPendingGifts === 'function') claimPendingGifts();
  _mpHeartbeatTimer = setInterval(_mpUpsertPresence, MP_HEARTBEAT_MS);
  _mpPollTimer      = setInterval(_mpPollGhosts,     MP_POLL_MS);
  _mpMsgTimer       = setInterval(_mpPollMessages,   MP_MSG_POLL_MS);
  if (typeof _mpVisitsAttach === 'function') _mpVisitsAttach();
}

function mpStopSession() {
  if (_mpHeartbeatTimer) { clearInterval(_mpHeartbeatTimer); _mpHeartbeatTimer = null; }
  if (_mpPollTimer)      { clearInterval(_mpPollTimer);      _mpPollTimer = null; }
  if (_mpMsgTimer)       { clearInterval(_mpMsgTimer);       _mpMsgTimer = null; }
  if (typeof _mpVisitsDetach === 'function') _mpVisitsDetach();
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
      if (typeof npcPlacements !== 'undefined' && npcPlacements.has(key)) continue;
      if (typeof enemyMap !== 'undefined' && enemyMap[y] && enemyMap[y][x]) continue;
      // Collision : on garde le premier fantôme (poll trié implicitement),
      // les suivants alimentent `extras` (affichés en badge +N sur la case).
      const prev = next.get(key);
      if (prev) {
        prev.extras = (prev.extras | 0) + 1;
        continue;
      }
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
        extras:   0,
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
    +   '<button class="ghost-btn" onclick="mpOpenGiftView()">🎁 Offrir</button>'
    + '</div>'
    + '<button class="ghost-btn ghost-btn-close" onclick="closeGhostOverlay()">'
    +   'Reprendre l\'exploration</button>';
}

// Classifie l'écart de niveau entre joueur local et fantôme distant.
// Sert à colorer la fiche d'inspection et à brander le bandeau d'alerte
// avant un défi PvP.
function _mpLevelGapTier(gap) {
  if (gap >= 6)  return { label: 'très fort', cls: 'danger',
    warn: 'Adversaire bien plus puissant — défi très risqué.' };
  if (gap >= 3)  return { label: 'fort',      cls: 'warn',
    warn: 'Adversaire plus aguerri — sois prêt.' };
  if (gap <= -3) return { label: 'inférieur', cls: 'safe', warn: null };
  return { label: 'équilibré', cls: 'even', warn: null };
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
  const myLevel = (typeof player !== 'undefined' && player.level) | 0 || 1;
  const gap     = (g.level | 0) - myLevel;
  const gapTier = _mpLevelGapTier(gap);     // {label, cls, warn}
  const levelCell = String(g.level | 0)
    + ' <span class="ghost-gap ghost-gap-' + gapTier.cls + '">'
    + (gap >= 0 ? '+' + gap : String(gap)) + ' · ' + _mpEsc(gapTier.label)
    + '</span>';

  const rows = [
    ['Maison',  _mpEsc(g.house || '—')],
    ['Niveau',  levelCell],                                  // déjà escape côté valeur
    ['Mode',    _mpEsc(g.mode === 'ironman' ? 'Ironman ☠' : 'Normal')],
    ['État',    _mpEsc(g.status === 'in_battle' ? 'En combat' : 'En exploration')],
  ].map(([k, v]) =>
    '<div class="ghost-inspect-row"><span>' + _mpEsc(k) + '</span>'
    + '<span>' + v + '</span></div>').join('');

  const warn = gapTier.warn
    ? '<div class="ghost-warn ghost-warn-' + gapTier.cls + '">'
      + _mpEsc(gapTier.warn) + '</div>'
    : '';

  panel.innerHTML = ''
    + _mpGhostHeaderHtml(g)
    + '<div class="ghost-inspect">'
    +   rows
    +   warn
    +   '<div class="ghost-inspect-heroes">' + heroes + '</div>'
    +   '<p class="ghost-inspect-note">Statistiques d\'équipement révélées'
    +     ' lors d\'un duel.</p>'
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
// En mode Ironman, intercale une sous-vue de confirmation avant l'engagement
// — un duel perdu = run terminé (§5.2), garde-fou essentiel.
function mpChallengeGhost() {
  const g = _mpCurrentGhost;
  if (!g) return;
  if (typeof defeatedDuelists !== 'undefined' && g.playerId
      && defeatedDuelists.has(g.playerId)) {
    if (typeof addMsg === 'function') addMsg('Tu as déjà vaincu ce spectre.', 'info');
    return;
  }
  if ((typeof ironmanMode !== 'undefined') && ironmanMode) {
    _mpRenderIronmanDuelConfirm(g);
    return;
  }
  _mpEngageDuel(g);
}

// Sous-vue de confirmation Ironman (§5.2 — garde-fou avant duel hardcore).
function _mpRenderIronmanDuelConfirm(g) {
  const panel = document.getElementById('ghost-panel');
  if (!panel) return;
  const myLevel = (typeof player !== 'undefined' && player.level) | 0 || 1;
  const gap     = (g.level | 0) - myLevel;
  const tier    = _mpLevelGapTier(gap);
  const gapTxt  = (gap >= 0 ? '+' + gap : String(gap)) + ' · ' + tier.label;
  panel.innerHTML = ''
    + _mpGhostHeaderHtml(g)
    + '<div class="ghost-inspect ghost-iron-warn">'
    +   '<div class="ghost-iron-skull">☠</div>'
    +   '<div class="ghost-iron-title">Duel Ironman — engagement définitif</div>'
    +   '<p class="ghost-iron-body">'
    +     'En mode Ironman, perdre ce duel mettra <b>fin à ton run</b> : '
    +     'permadeath, score figé, slots Ironman supprimés.'
    +   '</p>'
    +   '<div class="ghost-inspect-row"><span>Niveau adverse</span>'
    +     '<span>' + (g.level | 0)
    +       ' <span class="ghost-gap ghost-gap-' + tier.cls + '">' + _mpEsc(gapTxt) + '</span>'
    +     '</span></div>'
    + '</div>'
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn" onclick="_mpRenderGhostMain()">← Reculer</button>'
    +   '<button class="ghost-btn ghost-btn-duel" onclick="_mpConfirmIronmanDuel()">'
    +     '⚔️ Engager le duel</button>'
    + '</div>';
}

function _mpConfirmIronmanDuel() {
  const g = _mpCurrentGhost;
  if (!g) return;
  _mpEngageDuel(g);
}

// Récupère le snapshot puis lance le duel. Sépare la décision (challenge)
// de l'exécution (engage) — utilisée aussi après confirmation Ironman.
function _mpEngageDuel(g) {
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
// Enumère tous les butins potentiels copiables sur le vaincu (§5.2) :
// sorts inconnus + items non possédés. Sert (1) au choix automatique
// de repli quand 0/1 option, (2) à la modale de choix Ironman.
function _mpEnumerateDuelLoot(snapshot) {
  const heroes = (snapshot && Array.isArray(snapshot.heroes)) ? snapshot.heroes : [];
  const size   = (typeof partySize !== 'undefined') ? partySize : 1;
  const mine   = (typeof party !== 'undefined' ? party : []).slice(0, size);

  const known = new Set();
  mine.forEach(c => (c.spells || []).forEach(s => known.add(s)));
  const spells = [];
  const seenSpell = new Set();
  for (const h of heroes) {
    for (const s of (h.spells || [])) {
      if (!known.has(s) && !seenSpell.has(s)) {
        seenSpell.add(s);
        spells.push({ kind: 'spell', spell: s });
      }
    }
  }

  const owned = new Set();
  ((typeof player !== 'undefined' && player.inventory) || []).forEach(it => {
    if (it && it.id) owned.add(it.id);
  });
  mine.forEach(c => {
    if (c.equipped) Object.values(c.equipped).forEach(it => {
      if (it && it.id) owned.add(it.id);
    });
  });
  const items = [];
  const seenItem = new Set();
  for (const h of heroes) {
    for (const it of (h.equipment || [])) {
      if (it && it.id && !owned.has(it.id) && !seenItem.has(it.id)) {
        seenItem.add(it.id);
        items.push({ kind: 'item', item: it });
      }
    }
  }
  return { spells: spells, items: items };
}

// Repli déterministe quand on n'a pas besoin (ou pas envie) d'ouvrir
// la modale — 0 option : repli or ; 1 option : retourne celle-ci.
function _mpPickDuelLoot(snapshot) {
  const opts = _mpEnumerateDuelLoot(snapshot);
  if (opts.spells.length) return opts.spells[0];
  if (opts.items.length)  return opts.items[0];
  return { kind: 'gold', gold: 120 };
}

function _mpResolveDuelVictory(meta) {
  if (meta && meta.playerId && typeof defeatedDuelists !== 'undefined') {
    defeatedDuelists.add(meta.playerId);
  }
  const advName  = (meta && meta.name) || 'ton adversaire';
  const advLevel = Math.max(1, (meta && meta.level) | 0);
  const ironman  = (typeof ironmanMode !== 'undefined') && ironmanMode;

  if (ironman) {
    // §5.2 — victoire Ironman : copie d'un bien du vaincu. Si plus
    // d'une option, le vainqueur choisit via la modale `mp-loot-overlay`.
    const opts = _mpEnumerateDuelLoot(meta && meta.snapshot);
    const total = opts.spells.length + opts.items.length;
    if (total <= 1) {
      const loot = total === 1
        ? (opts.spells[0] || opts.items[0])
        : { kind: 'gold', gold: 120 };
      _mpApplyIronmanLoot(loot, advName);
      _mpFinishVictory();
    } else {
      _mpOpenLootChoice(opts, advName);   // pursuites différées au pick utilisateur
    }
    return;
  }

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
  _mpFinishVictory();
}

// Applique un butin Ironman (sort ou item ou repli or) — extrait pour
// être appelé soit en mode auto (0/1 option), soit après pick utilisateur.
function _mpApplyIronmanLoot(loot, advName) {
  const size = (typeof partySize !== 'undefined') ? partySize : 1;
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
    if (added) {
      if (typeof addMsg === 'function') {
        addMsg('🏆 Duel remporté ! Tu copies « ' + loot.item.name + ' » de ' + advName + '.', 'magic');
      }
    } else {
      player.gold += 80;
      if (typeof addMsg === 'function') {
        addMsg('🏆 Duel remporté ! Sac plein — butin converti en 80 Gallions.', 'good');
      }
    }
  } else {
    player.gold += (loot.gold | 0) || 120;
    if (typeof addMsg === 'function') {
      addMsg('🏆 Duel remporté ! Rien de neuf à copier — +' + ((loot.gold | 0) || 120) + ' Gallions.', 'good');
    }
  }
  setNarrative('Victoire en duel sur ' + advName + ' !');
}

// Boucle de fin de victoire (audio, checkLevelUp, renderMinimap).
function _mpFinishVictory() {
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playVictory) AudioSystem.playVictory();
  if (typeof checkLevelUp === 'function') checkLevelUp();
  if (typeof renderMinimap === 'function') renderMinimap();
}

// ── Modale de choix de butin Ironman ───────────────────────────
let _mpLootContext = null;

function _mpOpenLootChoice(opts, advName) {
  _mpLootContext = { opts: opts, advName: advName };
  _mpRenderLootChoice();
  const ov = document.getElementById('mp-loot-overlay');
  if (ov) ov.style.display = 'flex';
}

function _mpRenderLootChoice() {
  const panel = document.getElementById('mp-loot-panel');
  if (!panel || !_mpLootContext) return;
  const ctx = _mpLootContext;

  const spellBtns = ctx.opts.spells.map((opt, i) => {
    const iconHtml = (typeof getSpellIconHtml === 'function')
      ? getSpellIconHtml(opt.spell, 'ui-icon-xl')
      : '✨';
    return ''
      + '<button class="mp-loot-card mp-loot-spell" onclick="_mpPickLoot(\'spell\',' + i + ')">'
      +   '<span class="mp-loot-icon">' + iconHtml + '</span>'
      +   '<span class="mp-loot-name">' + _mpEsc(opt.spell) + '</span>'
      +   '<span class="mp-loot-kind">Sort inconnu</span>'
      + '</button>';
  }).join('');

  const itemBtns = ctx.opts.items.map((opt, i) => {
    const icon = (typeof getItemIconHtml === 'function')
      ? getItemIconHtml(opt.item, 'ui-icon-xl') : (opt.item.icon || '🎁');
    return ''
      + '<button class="mp-loot-card mp-loot-item" onclick="_mpPickLoot(\'item\',' + i + ')">'
      +   '<span class="mp-loot-icon">' + icon + '</span>'
      +   '<span class="mp-loot-name">' + _mpEsc(opt.item.name || opt.item.id) + '</span>'
      +   '<span class="mp-loot-kind">Équipement</span>'
      + '</button>';
  }).join('');

  panel.innerHTML = ''
    + '<div class="mp-loot-title">🏆 Butin Ironman — choisis ta copie</div>'
    + '<div class="mp-loot-sub">Tu as vaincu ' + _mpEsc(ctx.advName) + '. Choisis un bien à dérober.</div>'
    + (spellBtns ? '<div class="mp-loot-section">Sorts inconnus</div>'
                 + '<div class="mp-loot-grid">' + spellBtns + '</div>' : '')
    + (itemBtns  ? '<div class="mp-loot-section">Équipements non possédés</div>'
                 + '<div class="mp-loot-grid">' + itemBtns + '</div>' : '');
}

function _mpPickLoot(kind, idx) {
  if (!_mpLootContext) return;
  const list = kind === 'spell' ? _mpLootContext.opts.spells : _mpLootContext.opts.items;
  const opt  = list && list[idx | 0];
  if (!opt) return;
  const ov = document.getElementById('mp-loot-overlay');
  if (ov) ov.style.display = 'none';
  _mpApplyIronmanLoot(opt, _mpLootContext.advName);
  _mpLootContext = null;
  _mpFinishVictory();
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

// ============================================================
// PHASE 5 — Cadeaux or/objet (§6)
// ============================================================
// L'overlay fantôme offre un sous-mode « 🎁 Offrir ». L'envoi insère une
// ligne `mp_gifts` ; à la connexion (mpStartSession), `claimPendingGifts`
// lit la boîte aux lettres et applique les cadeaux non encore réclamés
// (or → player.gold, item → tryAddItem). Items équipés non concernés —
// seul `player.inventory` est exposé. Items de quête actifs filtrés.

// Items du sac partageables — exclut ce qui sert à une quête en cours.
function _mpIsQuestItem(itemId) {
  if (typeof activeQuests === 'undefined' || !Array.isArray(activeQuests)) return false;
  return activeQuests.some(q =>
    q && !q.completed && Array.isArray(q.objectives)
      && q.objectives.some(o => o && !o.completed
        && o.type === 'item' && o.itemId === itemId));
}

function _mpGiftableItems() {
  if (typeof player === 'undefined' || !Array.isArray(player.inventory)) return [];
  const out = [];
  player.inventory.forEach((it, idx) => {
    if (!it || !it.id) return;
    if (_mpIsQuestItem(it.id)) return;
    out.push({ idx: idx, item: it });
  });
  return out;
}

// État transient de la sous-vue cadeau dans l'overlay fantôme.
let _mpGiftKind = 'gold';            // 'gold' | 'item'
let _mpGiftGold = 50;                // valeur du curseur (gold)
let _mpGiftItemIdx = -1;             // index dans player.inventory

function mpOpenGiftView() {
  if (!_mpCurrentGhost) return;
  _mpGiftKind = 'gold';
  _mpGiftGold = Math.min(MP_GIFT_GOLD_MAX,
    Math.max(10, Math.floor(((typeof player !== 'undefined' && player.gold) || 0) / 4)));
  _mpGiftItemIdx = -1;
  _mpRenderGiftView();
}

function _mpGiftCooldownLeftMs(recipientId) {
  if (!recipientId) return 0;
  const last = _mpGiftCooldowns.get(recipientId) || 0;
  return Math.max(0, MP_GIFT_RECIPIENT_COOLDOWN_MS - (Date.now() - last));
}

function _mpFmtCooldown(ms) {
  if (ms < 60000) return Math.ceil(ms / 1000) + ' s';
  return Math.ceil(ms / 60000) + ' min';
}

function _mpRenderGiftView() {
  const panel = document.getElementById('ghost-panel');
  if (!panel || !_mpCurrentGhost) return;
  const g       = _mpCurrentGhost;
  const myGold  = (typeof player !== 'undefined' && player.gold) | 0;
  const cdLeft  = _mpGiftCooldownLeftMs(g.playerId);
  const items   = _mpGiftableItems();

  // Onglets kind
  const tabs = ''
    + '<div class="mp-gift-tabs">'
    +   '<button class="mp-chip' + (_mpGiftKind === 'gold' ? ' mp-chip-on' : '') + '"'
    +     ' onclick="_mpGiftSelectKind(\'gold\')">💰 Or</button>'
    +   '<button class="mp-chip' + (_mpGiftKind === 'item' ? ' mp-chip-on' : '') + '"'
    +     ' onclick="_mpGiftSelectKind(\'item\')">🎒 Objet</button>'
    + '</div>';

  // Corps
  let body = '';
  if (_mpGiftKind === 'gold') {
    const cap = Math.min(MP_GIFT_GOLD_MAX, myGold);
    if (cap <= 0) {
      body = '<div class="mp-gift-empty">Tu n\'as aucun Gallion à offrir.</div>';
    } else {
      const v = Math.min(cap, _mpGiftGold | 0);
      body = ''
        + '<div class="mp-gift-row">'
        +   '<label for="mp-gift-gold-input">Montant (max ' + cap + ')</label>'
        +   '<input id="mp-gift-gold-input" type="number" min="1" max="' + cap + '"'
        +     ' value="' + v + '" oninput="_mpGiftSetGold(this.value)">'
        + '</div>'
        + '<div class="mp-gift-hint">Plafond par envoi : ' + MP_GIFT_GOLD_MAX + ' Gallions.</div>';
    }
  } else {
    if (items.length === 0) {
      body = '<div class="mp-gift-empty">Aucun objet partageable dans ton sac.</div>';
    } else {
      const list = items.map(({ idx, item }) => {
        const sel = (idx === _mpGiftItemIdx) ? ' mp-gift-item-on' : '';
        const icon = (typeof getItemIconHtml === 'function')
          ? getItemIconHtml(item, 'ui-icon-sm') : (item.icon || '🎁');
        return ''
          + '<button class="mp-gift-item' + sel + '"'
          +   ' onclick="_mpGiftSelectItem(' + idx + ')">'
          +   '<span class="mp-gift-item-icon">' + icon + '</span>'
          +   '<span class="mp-gift-item-name">' + _mpEsc(item.name || item.id) + '</span>'
          + '</button>';
      }).join('');
      body = '<div class="mp-gift-items">' + list + '</div>';
    }
  }

  // Validation du bouton
  let canSend = false, sendLabel = 'Offrir';
  if (cdLeft > 0) {
    sendLabel = 'Attends ' + _mpFmtCooldown(cdLeft);
  } else if (_mpGiftKind === 'gold') {
    canSend = myGold > 0 && _mpGiftGold >= 1 && _mpGiftGold <= Math.min(myGold, MP_GIFT_GOLD_MAX);
  } else {
    canSend = _mpGiftItemIdx >= 0 && _mpGiftItemIdx < (player.inventory || []).length;
  }

  panel.innerHTML = ''
    + _mpGhostHeaderHtml(g)
    + '<div class="mp-gift-title">🎁 Offrir un présent à ' + _mpEsc(g.name || 'ce sorcier') + '</div>'
    + tabs
    + '<div class="mp-gift-body">' + body + '</div>'
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn" onclick="_mpRenderGhostMain()">← Retour</button>'
    +   '<button class="ghost-btn' + (canSend ? '' : ' ghost-btn-soon') + '"'
    +     (canSend ? '' : ' disabled') + ' onclick="_mpConfirmGift()">' + sendLabel + '</button>'
    + '</div>';
}

function _mpGiftSelectKind(kind) {
  if (kind !== 'gold' && kind !== 'item') return;
  _mpGiftKind = kind;
  _mpRenderGiftView();
}

function _mpGiftSetGold(v) {
  const myGold = (typeof player !== 'undefined' && player.gold) | 0;
  const cap = Math.min(MP_GIFT_GOLD_MAX, myGold);
  const n = Math.max(1, Math.min(cap, parseInt(v, 10) || 0));
  _mpGiftGold = n;
}

function _mpGiftSelectItem(idx) {
  _mpGiftItemIdx = idx;
  _mpRenderGiftView();
}

// Insère une ligne `mp_gifts`. Renvoie `true` si la requête est partie
// (même en file:// où elle est court-circuitée).
async function _mpInsertGift(payload) {
  if (!_mpConfigured()) return true;             // file:// / tests : pas d'appel
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.giftsTable}`,
      {
        method: 'POST',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'return=minimal',
        }),
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _mpNoteSuccess();
    return true;
  } catch (e) {
    _mpNoteFailure(e);
    return false;
  }
}

// Confirmation du bouton « Offrir ». Déduit immédiatement l'or/l'item du
// joueur (le geste est définitif côté donneur) avant l'appel réseau.
function _mpConfirmGift() {
  const g = _mpCurrentGhost;
  if (!g || !g.playerId) return;
  if (_mpGiftCooldownLeftMs(g.playerId) > 0) return;
  const myGold = (typeof player !== 'undefined' && player.gold) | 0;
  const senderName = (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier';

  if (_mpGiftKind === 'gold') {
    const cap = Math.min(MP_GIFT_GOLD_MAX, myGold);
    const amount = Math.max(1, Math.min(cap, _mpGiftGold | 0));
    if (amount <= 0) return;
    player.gold -= amount;
    _mpInsertGift({
      sender_id:    getMpPlayerId(),
      sender_name:  senderName,
      recipient_id: g.playerId,
      mode:         mpMode,
      kind:         'gold',
      amount:       amount,
    });
    if (typeof addMsg === 'function') {
      addMsg('🎁 Tu offres ' + amount + ' Gallions à ' + (g.name || 'ce sorcier') + '.', 'good');
    }
  } else {
    const idx = _mpGiftItemIdx | 0;
    const it  = player.inventory && player.inventory[idx];
    if (!it || _mpIsQuestItem(it.id)) return;
    const snapshot = { ...it };
    player.inventory.splice(idx, 1);
    _mpInsertGift({
      sender_id:    getMpPlayerId(),
      sender_name:  senderName,
      recipient_id: g.playerId,
      mode:         mpMode,
      kind:         'item',
      item_id:      it.id,
      item_name:    it.name || it.id,
      item_data:    snapshot,
    });
    if (typeof addMsg === 'function') {
      addMsg('🎁 Tu offres « ' + (it.name || it.id) + ' » à ' + (g.name || 'ce sorcier') + '.', 'good');
    }
  }
  _mpGiftCooldowns.set(g.playerId, Date.now());
  if (typeof updateUI === 'function') updateUI();
  closeGhostOverlay();
}

// ── Boîte aux lettres : lecture & réclamation ────────────────────
// Appelée à la connexion. Tire toutes les lignes adressées au joueur
// dont `claimed_at` est nul, applique l'effet localement (or / item
// via tryAddItem), puis PATCH claimed_at=now pour chaque ligne réussie.
async function claimPendingGifts() {
  if (!_mpConfigured()) return { ok: false };
  if (typeof player === 'undefined') return { ok: false };
  const myId = getMpPlayerId();
  let rows;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.giftsTable}`
      + '?select=id,sender_name,kind,amount,item_id,item_name,item_data,created_at'
      + `&recipient_id=eq.${encodeURIComponent(myId)}`
      + '&claimed_at=is.null'
      + '&order=created_at.asc&limit=50';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    rows = await res.json();
    _mpNoteSuccess();
  } catch (e) {
    _mpNoteFailure(e);
    return { ok: false };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { ok: true, claimed: 0 };

  const now = new Date().toISOString();
  const summary = { gold: 0, items: 0, skipped: 0, senders: new Set() };

  for (const row of rows) {
    let applied = false;
    if (row.kind === 'gold' && Number.isFinite(row.amount) && row.amount > 0) {
      // Clamp défensif : un sender mal-veillant pourrait avoir posé une
      // somme énorme — on borne au cap UI.
      const amt = Math.min(MP_GIFT_GOLD_MAX, Math.max(1, row.amount | 0));
      player.gold += amt;
      summary.gold += amt;
      applied = true;
    } else if (row.kind === 'item' && row.item_id) {
      const data = row.item_data || (typeof ITEMS !== 'undefined'
        && ITEMS.find(i => i.id === row.item_id)) || null;
      if (data && typeof tryAddItem === 'function' && tryAddItem(data, { silent: true })) {
        summary.items++;
        applied = true;
      } else {
        // Sac plein ou item inconnu — on laisse la ligne dans la boîte
        // (claimed_at reste null), elle sera retentée à la prochaine session.
        summary.skipped++;
      }
    }
    if (applied && row.id) {
      try {
        await fetch(
          `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.giftsTable}`
            + `?id=eq.${encodeURIComponent(row.id)}`,
          {
            method:  'PATCH',
            headers: _mpHeaders({
              'Content-Type': 'application/json',
              'Prefer':       'return=minimal',
            }),
            body: JSON.stringify({ claimed_at: now }),
          }
        );
      } catch (e) { /* sera retenté à la prochaine connexion */ }
      if (row.sender_name) summary.senders.add(row.sender_name);
    }
  }
  _mpAnnounceClaim(summary);
  if (typeof updateUI === 'function') updateUI();
  return { ok: true, claimed: summary.gold > 0 || summary.items > 0, summary: summary };
}

function _mpAnnounceClaim(s) {
  if (typeof addMsg !== 'function') return;
  if (s.gold === 0 && s.items === 0) return;
  const parts = [];
  if (s.gold)  parts.push('+' + s.gold + ' Gallions');
  if (s.items) parts.push(s.items + ' objet' + (s.items > 1 ? 's' : ''));
  const senders = Array.from(s.senders);
  const from = senders.length === 0 ? ''
    : (senders.length === 1 ? ' de ' + senders[0]
       : ' de ' + senders.slice(0, -1).join(', ') + ' et ' + senders[senders.length - 1]);
  addMsg('🎁 Boîte aux lettres : ' + parts.join(', ') + from + '.', 'good');
  if (s.skipped > 0) {
    addMsg(s.skipped + ' cadeau' + (s.skipped > 1 ? 'x sont en attente' : ' est en attente')
      + ' — fais de la place dans ton sac.', 'info');
  }
}

// ============================================================
// MONDES PARALLÈLES — invitation de visite (V1a Phase B)
// ============================================================
// Matchmaking pour la Cheminette Inter-Mondes. Le visiteur liste les
// hosts en ligne (mp_presence filtré mode normal + status=exploring +
// pas Ironman + autre joueur), pose une demande dans mp_visit_requests
// (TTL 60s), puis poll son statut. Côté host, le poll des incoming
// requests déclenche la modale d'acceptation (30s pour répondre).
//
// SQL : voir .claude/plans/parallel-worlds.md §12.1.
// Disjoncteur : si la table absente / hors-ligne, dégrade en silence.
// ============================================================

const MP_VISITS_TABLE        = 'mp_visit_requests';
const MP_VISIT_POLL_MS       = 3000;     // poll des demandes entrantes
const MP_VISIT_EXPIRES_SEC   = 60;       // TTL d'une demande pending
const MP_VISIT_RESPOND_MS    = 30000;    // 30s pour le host pour répondre
const MP_VISIT_OUTGOING_POLL_MS = 2500;  // poll de réponse visiteur

let _mpVisitPollTimer = null;
let _mpVisitTableMissing = false;       // disjoncteur dédié

// Renvoie la liste des hosts disponibles (asynchrone). Filtre :
// mode normal + status='exploring' + last_seen récent + pas moi.
// En file:// (smoke / dev local) ou si non-configuré : tableau vide.
// Le smoke peut stubber cette fonction via window.mpListAvailableHosts.
async function mpListAvailableHosts() {
  if (!_mpConfigured()) return [];
  try {
    const sinceIso = new Date(Date.now() - MP_STALE_SEC * 1000).toISOString();
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.presenceTable}`
      + '?select=player_id,name,house,level,floor,hero_keys,status,last_seen'
      + `&mode=eq.normal`
      + `&status=eq.exploring`
      + `&player_id=neq.${encodeURIComponent(getMpPlayerId())}`
      + `&last_seen=gt.${encodeURIComponent(sinceIso)}`
      + '&order=last_seen.desc'
      + '&limit=20';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    _mpNoteFailure(e);
    return null;     // null = erreur réseau (≠ tableau vide = personne)
  }
}

// Pose une demande de visite. Renvoie l'objet inséré (avec id) ou null.
async function mpPostVisitRequest(host) {
  if (!_mpConfigured() || _mpVisitTableMissing) return null;
  if (!host || !host.player_id) return null;
  const row = {
    visitor_id:    getMpPlayerId(),
    visitor_name:  (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
    visitor_house: (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
    visitor_level: (typeof player !== 'undefined' && player.level) || 1,
    host_id:       host.player_id,
    status:        'pending'
  };
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`,
      {
        method:  'POST',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'return=representation'
        }),
        body: JSON.stringify(row)
      }
    );
    if (res.status === 404) { _mpVisitTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Récupère le statut courant d'une demande sortante. Renvoie l'objet
// (status: pending|accepted|refused|expired, channel_id si accepté) ou
// null en cas d'erreur.
async function mpPollOutgoingVisitStatus(reqId) {
  if (!_mpConfigured() || _mpVisitTableMissing || !reqId) return null;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`
      + `?id=eq.${encodeURIComponent(reqId)}&select=id,status,responded_at,host_id,channel_id`;
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpVisitTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Récupère les demandes entrantes pending pour le host courant. Le poll
// est démarré par mpStartSession (boucle parallèle au heartbeat). Quand
// au moins une demande non-expirée est détectée, déclenche la modale
// d'acceptation via window.showIncomingVisitRequest.
async function _mpPollIncomingVisitRequests() {
  if (!mpActive || !_mpConfigured() || _mpVisitTableMissing) return;
  // Ne pas poller si le host est lui-même en mode Ironman (filtré au
  // démarrage), ni si une modale d'acceptation est déjà ouverte.
  if (mpMode === 'ironman') return;
  if (typeof window !== 'undefined' && window._mpVisitPendingReq) return;
  try {
    const sinceIso = new Date(Date.now() - MP_VISIT_EXPIRES_SEC * 1000).toISOString();
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`
      + `?host_id=eq.${encodeURIComponent(getMpPlayerId())}`
      + '&status=eq.pending'
      + `&created_at=gt.${encodeURIComponent(sinceIso)}`
      + '&order=created_at.desc'
      + '&limit=1';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpVisitTableMissing = true; return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    if (Array.isArray(rows) && rows[0]
        && typeof showIncomingVisitRequest === 'function'
        && (typeof inBattle === 'undefined' || !inBattle)) {
      showIncomingVisitRequest(rows[0]);
    }
  } catch (e) {
    _mpNoteFailure(e);
  }
}

// Update du statut d'une demande (acceptation / refus côté host).
// `channelId` (optionnel, requis si status='accepted') : UUID partagé
// que le visiteur lira au poll suivant pour ouvrir le canal de visite.
async function mpRespondVisitRequest(reqId, status, channelId) {
  if (!_mpConfigured() || _mpVisitTableMissing || !reqId) return null;
  if (status !== 'accepted' && status !== 'refused') return null;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`
      + `?id=eq.${encodeURIComponent(reqId)}`;
    const body = { status, responded_at: new Date().toISOString() };
    if (status === 'accepted' && channelId) body.channel_id = channelId;
    const res = await fetch(url, {
      method:  'PATCH',
      headers: _mpHeaders({
        'Content-Type': 'application/json',
        'Prefer':       'return=minimal'
      }),
      body: JSON.stringify(body)
    });
    if (res.status === 404) { _mpVisitTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _mpNoteSuccess();
    return { id: reqId, status, channel_id: channelId || null };
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Démarre/arrête le poll des demandes entrantes — branché à
// mpStartSession / mpStopSession via les helpers _mpVisitsAttach.
function _mpVisitsAttach() {
  if (_mpVisitPollTimer || !_mpConfigured()) return;
  _mpVisitPollTimer = setInterval(_mpPollIncomingVisitRequests, MP_VISIT_POLL_MS);
}

function _mpVisitsDetach() {
  if (_mpVisitPollTimer) { clearInterval(_mpVisitPollTimer); _mpVisitPollTimer = null; }
}

// ============================================================
// MONDES PARALLÈLES — canal de visite REST polling (V1a Phase C.2)
// ============================================================
// Transport messages entre host et visiteur via la table
// `mp_visit_messages`. Polling REST (~2,5 s) cohérent avec Phase B —
// pas de Supabase Realtime SDK (philosophie zéro-dépendance). Le canal
// est identifié par `channel_id` (UUID généré par le host à
// l'acceptation, partagé via mp_visit_requests).
//
// Types V1a (cf. parallel-worlds.md §5) :
//   host → visiteur : 'snapshot' (initial), 'hostPosition', 'bye'
//   visiteur → host : 'position', 'bye'
//
// SQL : voir parallel-worlds.md §12.3.
// Disjoncteur : si la table absente / hors-ligne, dégrade en silence.
// ============================================================

const MP_VISIT_MESSAGES_TABLE = 'mp_visit_messages';
let _mpVisitMsgTableMissing   = false;       // disjoncteur dédié

// Pose un message sur le canal. Retourne l'objet inséré (avec id +
// created_at) ou null. `sender` ∈ {'host','visitor'}, `type` le kind
// du message, `payload` un objet JSON sérialisable (peut être null).
async function mpPostVisitMessage(channelId, sender, type, payload) {
  if (!_mpConfigured() || _mpVisitMsgTableMissing) return null;
  if (!channelId || !sender || !type) return null;
  if (sender !== 'host' && sender !== 'visitor') return null;
  const row = {
    channel_id: channelId,
    sender,
    type,
    payload: (payload === undefined) ? null : payload
  };
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISIT_MESSAGES_TABLE}`,
      {
        method:  'POST',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'return=representation'
        }),
        body: JSON.stringify(row)
      }
    );
    if (res.status === 404) { _mpVisitMsgTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Récupère les nouveaux messages du canal depuis `sinceIso`. Filtre
// par `excludeSender` pour ne pas relire ses propres messages — on
// passe son propre rôle. Retourne un tableau (ordre chronologique
// croissant) ou null en cas d'erreur.
async function mpPollVisitMessages(channelId, sinceIso, excludeSender) {
  if (!_mpConfigured() || _mpVisitMsgTableMissing) return null;
  if (!channelId) return null;
  try {
    let url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISIT_MESSAGES_TABLE}`
      + `?channel_id=eq.${encodeURIComponent(channelId)}`
      + '&select=id,sender,type,payload,created_at'
      + '&order=created_at.asc'
      + '&limit=50';
    if (sinceIso) {
      url += `&created_at=gt.${encodeURIComponent(sinceIso)}`;
    }
    if (excludeSender === 'host' || excludeSender === 'visitor') {
      url += `&sender=neq.${excludeSender}`;
    }
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpVisitMsgTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

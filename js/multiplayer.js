// ============================================================
// MULTIJOUEUR — Cœur : config, transport REST, présence & duels
// ============================================================
// Config Supabase + helpers REST, présence fantôme (ghostPlacements,
// getGhostAt), interaction fantôme et duels PvP. Messages/cadeaux :
// multiplayer-social.js. Visites/verrous : multiplayer-visits.js. Tous
// optionnels : dégradation silencieuse si Supabase absent.
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
  // Bascule maître du chemin « Mondes Parallèles » (visites inter-mondes).
  // Défaut activé ; passer à false neutralise le sort Cheminette, le poll
  // des visites entrantes et les boutons Visites/Atelier — sans toucher au
  // reste du multijoueur (présence/social).
  parallelWorldsEnabled: true,
};

// Helper de lecture du flag maître (cf. parallel-worlds-stabilization.md S2.6).
function parallelWorldsEnabled() {
  return !!(typeof MP_CONFIG !== 'undefined' && MP_CONFIG.parallelWorldsEnabled);
}

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
  // Phase H §6.9 — claim asynchrone des Verrous résolus par d'autres
  // joueurs pendant que ce visiteur était offline.
  if (typeof _claimResolvedSeals === 'function') _claimResolvedSeals();
  // S2.9 — retry des Verrous orphelins (POST initial échoué) : on tente
  // de les réenvoyer pour qu'ils deviennent résolubles côté host.
  if (typeof _retryOrphanSeals === 'function') _retryOrphanSeals();
  // Phase H §6.9 — host : précharge les Verrous actifs sur l'étage
  // initial pour matérialiser les marqueurs minimap dès l'apparition.
  if (typeof loadHostSealsForCurrentFloor === 'function') loadHostSealsForCurrentFloor();
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
    // Phase F (§16.7) — `closed` quand le host refuse les visites.
    // mpListAvailableHosts filtre sur `exploring` → les hosts `closed`
    // disparaissent de la liste des destinations.
    status:    (typeof inBattle !== 'undefined' && inBattle) ? 'in_battle'
             : (typeof visitsClosed !== 'undefined' && visitsClosed) ? 'closed'
             : 'exploring',
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


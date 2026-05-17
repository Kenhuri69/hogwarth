// ============================================================
// HALL OF FAME — classement Ironman (Supabase + repli local)
// ============================================================
// Stockage en ligne via l'API REST Supabase. La clé `anon` est conçue
// pour être publique ; la sécurité repose sur les policies RLS de la
// table `leaderboard` (select + insert publics uniquement).
//
// Tant que HOF_CONFIG n'est pas renseigné, ou en cas d'échec réseau,
// le module bascule sur un classement 100 % local (localStorage).
// Un score soumis est TOUJOURS écrit en local (Hall of Fame perso).
//
// Setup : voir .claude/plans/ironman-hall-of-fame.md §"Setup Supabase".

const HOF_CONFIG = {
  supabaseUrl:     'https://hvdthitluhgevtuqhxpm.supabase.co',
  supabaseAnonKey: 'sb_publishable_zz2fPlpthCU0cee7VrVl5w_fwV0wrOb',
  tableName:       'leaderboard',
};

const HOF_LOCAL_KEY = 'hogwarts_rpg_hof';
const HOF_NAME_KEY  = 'hogwarts_rpg_player_name';

// Écran d'où le Hall of Fame a été ouvert ('hub' ou 'result').
let _hofReturnTo = 'hub';
// Passe à true si l'UID du run courant a déjà un score au classement.
let _ironmanRunScored = false;

// ── Pseudonyme persistant du joueur ─────────────────────────
function getPlayerName() {
  try { return (localStorage.getItem(HOF_NAME_KEY) || '').trim(); }
  catch (e) { return ''; }
}

function setPlayerName(name) {
  try {
    const clean = String(name || '').trim().slice(0, 24);
    if (clean) localStorage.setItem(HOF_NAME_KEY, clean);
  } catch (e) { /* noop */ }
}

function _hofConfigured() {
  return !!(HOF_CONFIG.supabaseUrl && HOF_CONFIG.supabaseAnonKey);
}

function _hofEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Stockage local ──────────────────────────────────────────
function _hofLocalRead() {
  try {
    const raw = localStorage.getItem(HOF_LOCAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function _hofLocalWrite(arr) {
  try {
    // Tri décroissant + plafond à 50 entrées pour borner le stockage.
    const sorted = arr.slice().sort((a, b) => (b.score | 0) - (a.score | 0));
    localStorage.setItem(HOF_LOCAL_KEY, JSON.stringify(sorted.slice(0, 50)));
  } catch (e) {
    console.warn('[hof] local write failed:', e);
  }
}

// ── Soumission d'un score ───────────────────────────────────
// Écrit toujours en local ; tente Supabase si configuré.
// Retourne { ok, online } — `online:true` si le POST distant a réussi.
async function _hofSubmit(entry) {
  const local = _hofLocalRead();
  local.push(entry);
  _hofLocalWrite(local);

  if (!_hofConfigured()) return { ok: true, online: false };

  try {
    const res = await fetch(
      `${HOF_CONFIG.supabaseUrl}/rest/v1/${HOF_CONFIG.tableName}`,
      {
        method: 'POST',
        headers: {
          'apikey':        HOF_CONFIG.supabaseAnonKey,
          'Authorization': 'Bearer ' + HOF_CONFIG.supabaseAnonKey,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          player_name:      entry.player_name,
          score:            entry.score,
          difficulty:       entry.difficulty,
          heroes:           entry.heroes,
          deepest_floor:    entry.deepest_floor,
          party_levels:     entry.party_levels,
          monsters_killed:  entry.monsters_killed,
          quests_completed: entry.quests_completed,
          gold:             entry.gold,
          run_id:           entry.run_id || null,
        }),
      }
    );
    // 409 = violation de l'index unique run_id → run déjà classé.
    if (res.status === 409) return { ok: true, online: false, duplicate: true };
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { ok: true, online: true };
  } catch (e) {
    console.warn('[hof] online submit failed:', e);
    return { ok: true, online: false, error: String(e && e.message || e) };
  }
}

// ── Lecture du top N ────────────────────────────────────────
// Retourne { source: 'online'|'local', rows: [...] }.
async function _hofFetchTop(limit) {
  if (_hofConfigured()) {
    try {
      const url = `${HOF_CONFIG.supabaseUrl}/rest/v1/${HOF_CONFIG.tableName}`
        + `?select=*&order=score.desc&limit=${limit}`;
      const res = await fetch(url, {
        headers: {
          'apikey':        HOF_CONFIG.supabaseAnonKey,
          'Authorization': 'Bearer ' + HOF_CONFIG.supabaseAnonKey,
        },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      if (Array.isArray(rows)) return { source: 'online', rows };
    } catch (e) {
      console.warn('[hof] online fetch failed:', e);
    }
  }
  const local = _hofLocalRead().slice(0, limit);
  return { source: 'local', rows: local };
}

// ── Anti double-classement (UID de run) ─────────────────────
// Cherche un score existant pour un UID de run donné. Repli local
// d'abord, puis Supabase. Retourne la ligne trouvée ou null.
async function _hofFindByRunId(runId) {
  if (!runId) return null;
  const localHit = _hofLocalRead().find(e => e && e.run_id === runId);
  if (localHit) return localHit;
  if (!_hofConfigured()) return null;
  try {
    const url = `${HOF_CONFIG.supabaseUrl}/rest/v1/${HOF_CONFIG.tableName}`
      + `?run_id=eq.${encodeURIComponent(runId)}&select=id,score,player_name&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey':        HOF_CONFIG.supabaseAnonKey,
        'Authorization': 'Bearer ' + HOF_CONFIG.supabaseAnonKey,
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return (Array.isArray(rows) && rows.length) ? rows[0] : null;
  } catch (e) {
    console.warn('[hof] run lookup failed:', e);
    return null;
  }
}

// Vérification au chargement d'un save Ironman : pré-positionne le flag
// `_ironmanRunScored` (sans toucher au DOM — l'écran n'est pas affiché).
async function _hofPrecheckRunOnLoad() {
  const runId = (typeof ironmanRunId !== 'undefined') ? ironmanRunId : null;
  if (!runId) return;
  const existing = await _hofFindByRunId(runId);
  if (existing) _ironmanRunScored = true;
}

// Vérification à la mort : bloque la soumission si l'UID est déjà classé.
async function verifyIronmanRunNotScored() {
  const btn      = document.getElementById('hof-submit-btn');
  const statusEl = document.getElementById('hof-submit-status');
  const runId    = (typeof ironmanRunId !== 'undefined') ? ironmanRunId : null;

  if (!runId) { if (btn) btn.disabled = false; return; }
  if (statusEl) statusEl.textContent = 'Vérification du run…';

  const existing = await _hofFindByRunId(runId);
  if (existing) {
    _ironmanRunScored = true;
    if (statusEl) {
      statusEl.textContent = '⚠ Ce run est déjà inscrit au Hall of Fame ('
        + ((existing.score | 0)).toLocaleString('fr-FR') + ' pts).';
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Déjà classé'; }
  } else {
    _ironmanRunScored = false;
    if (statusEl) statusEl.textContent = '';
    if (btn) btn.disabled = false;
  }
}

// ── Handler bouton « Soumettre au Hall of Fame » ────────────
async function submitIronmanScore() {
  if (typeof _ironmanLastResult === 'undefined' || !_ironmanLastResult) return;

  const input    = document.getElementById('hof-name-input');
  const btn      = document.getElementById('hof-submit-btn');
  const statusEl = document.getElementById('hof-submit-status');

  if (_ironmanRunScored) {
    if (statusEl) statusEl.textContent = '⚠ Ce run est déjà inscrit au Hall of Fame.';
    if (btn) btn.disabled = true;
    return;
  }

  let name = ((input && input.value) || '').trim().slice(0, 24);
  if (!name) name = 'Sorcier Anonyme';
  setPlayerName(name);                       // pseudonyme persistant

  if (btn)   btn.disabled = true;
  if (input) input.disabled = true;
  if (statusEl) statusEl.textContent = 'Envoi en cours…';

  const entry = ironmanResultToEntry(_ironmanLastResult, name);
  const r = await _hofSubmit(entry);

  if (r.duplicate) {
    _ironmanRunScored = true;
    if (statusEl) statusEl.textContent = '⚠ Ce run est déjà inscrit au Hall of Fame.';
    if (btn) btn.textContent = 'Déjà classé';
    return;
  }
  if (statusEl) {
    statusEl.textContent = r.online
      ? '✓ Score inscrit au Hall of Fame mondial !'
      : '✓ Score enregistré'
        + (_hofConfigured() ? ' localement (hors-ligne)' : ' dans le classement local')
        + '.';
  }
  if (btn) btn.textContent = 'Score soumis ✓';
}

// ── Simulation de rang (fiche perso) ────────────────────────
// Construit une entrée de classement virtuelle pour le run Ironman en
// cours — alimente la ligne de simulation affichée dans le Hall of Fame.
function _hofBuildProjection() {
  if (typeof computeIronmanScore !== 'function') return null;
  const s = computeIronmanScore();
  const live = (typeof party !== 'undefined' ? party : [])
    .slice(0, (typeof partySize !== 'undefined' ? partySize : 1))
    .filter(c => c && c.name);
  return {
    player_name:   getPlayerName() || 'Toi',
    score:         s.score,
    difficulty:    (typeof difficulty !== 'undefined') ? difficulty : 'Normal',
    heroes:        live.map(c => c.name).join(' & ') || 'Sorcier inconnu',
    deepest_floor: s.deepestFloor,
    party_levels:  'Niv. ' + s.level,
  };
}

// Rang projeté (1-based) d'un score dans le classement complet.
// Lit jusqu'à 200 scores triés ; repli localStorage si hors-ligne.
async function _hofRankForScore(score) {
  const s = score | 0;
  if (_hofConfigured()) {
    try {
      const url = `${HOF_CONFIG.supabaseUrl}/rest/v1/${HOF_CONFIG.tableName}`
        + `?select=score&order=score.desc&limit=200`;
      const res = await fetch(url, {
        headers: {
          'apikey':        HOF_CONFIG.supabaseAnonKey,
          'Authorization': 'Bearer ' + HOF_CONFIG.supabaseAnonKey,
        },
      });
      if (res.ok) {
        const arr = await res.json();
        if (Array.isArray(arr)) {
          return arr.filter(e => e && (e.score | 0) > s).length + 1;
        }
      }
    } catch (e) {
      console.warn('[hof] rank query failed:', e);
    }
  }
  return _hofLocalRead().filter(e => e && (e.score | 0) > s).length + 1;
}

// Ouvre le Hall of Fame depuis la fiche de personnage, avec la ligne
// de simulation du run Ironman en cours insérée à son rang projeté.
function openHofProjection() {
  const screen = document.getElementById('hall-of-fame-screen');
  if (!screen) return;
  _hofReturnTo = 'game';
  const hub = document.getElementById('start-hub-screen');
  if (hub) hub.style.display = 'none';
  screen.style.display = 'flex';
  _renderHallOfFame(_hofBuildProjection());
}

// ── Écran Hall of Fame ──────────────────────────────────────
function openHallOfFame() {
  const resultScreen = document.getElementById('ironman-result-screen');
  _hofReturnTo = (resultScreen && resultScreen.style.display === 'flex')
    ? 'result' : 'hub';

  const hub = document.getElementById('start-hub-screen');
  if (hub) hub.style.display = 'none';

  const screen = document.getElementById('hall-of-fame-screen');
  if (!screen) return;
  screen.style.display = 'flex';
  _renderHallOfFame();
}

function closeHallOfFame() {
  const screen = document.getElementById('hall-of-fame-screen');
  if (screen) screen.style.display = 'none';

  if (_hofReturnTo === 'result') {
    const rs = document.getElementById('ironman-result-screen');
    if (rs) rs.style.display = 'flex';
  } else if (_hofReturnTo === 'game') {
    // Ouvert depuis la fiche perso : le jeu et la modale sont restés
    // affichés sous l'écran (z-index 960 > 500) — rien à restaurer.
  } else {
    const hub = document.getElementById('start-hub-screen');
    if (hub) hub.style.display = 'flex';
  }
}

async function _renderHallOfFame(projection) {
  const listEl = document.getElementById('hof-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="hof-empty">Chargement du classement…</div>';

  let result;
  try {
    result = await _hofFetchTop(10);
  } catch (e) {
    result = { source: 'local', rows: [] };
  }
  const rows = result.rows || [];

  // Rang projeté du run en cours (si une simulation est demandée).
  let projRank = null;
  if (projection) {
    try { projRank = await _hofRankForScore(projection.score); }
    catch (e) { projRank = rows.length + 1; }
  }

  if (!rows.length && !projection) {
    listEl.innerHTML = '<div class="hof-empty">Aucun score enregistré.<br>'
      + 'Sois le premier à entrer dans la légende en mode Ironman !</div>';
    return;
  }

  // Liste d'affichage : entrées réelles + ligne de projection à son rang.
  const display = rows.map((r, i) => ({ row: r, rank: i + 1, isProj: false }));
  if (projection) {
    if (projRank <= 10 && projRank <= rows.length + 1) {
      // S'insère dans le top visible : décale les rangs du dessous.
      display.splice(projRank - 1, 0, { row: projection, rank: projRank, isProj: true });
      for (let i = projRank; i < display.length; i++) display[i].rank = i + 1;
    } else {
      // Hors du top 10 : épinglée en pied de classement à son vrai rang.
      display.push({ row: projection, rank: projRank, isProj: true });
    }
  }

  const MEDAL_IMG = { 1: 'medal_gold', 2: 'medal_silver', 3: 'medal_bronze' };
  let html = '';
  display.forEach((d) => {
    const r = d.row, rank = d.rank;
    const medal = (MEDAL_IMG[rank] && !d.isProj)
      ? `<img class="ir-icon hof-medal" src="img/icons/${MEDAL_IMG[rank]}.png" alt="${rank}">`
      : '#' + rank;
    html += `<div class="hof-row hof-rank-${rank}${d.isProj ? ' hof-row-projection' : ''}">`
      + `<div class="hof-rank">${medal}</div>`
      + `<div class="hof-main">`
      +   `<div class="hof-name">${d.isProj ? '★ ' : ''}${_hofEsc(r.player_name)}`
      +     `${d.isProj ? '<span class="hof-proj-tag">simulation</span>' : ''}</div>`
      +   `<div class="hof-meta">${_hofEsc(r.heroes)} · ${_hofEsc(r.difficulty)}`
      +     ` · Étage ${r.deepest_floor | 0} · ${_hofEsc(r.party_levels || '')}</div>`
      + `</div>`
      + `<div class="hof-score">${(r.score | 0).toLocaleString('fr-FR')}</div>`
      + `</div>`;
  });

  const note = result.source === 'online'
    ? 'Classement mondial en ligne'
    : (_hofConfigured()
        ? 'Hors-ligne — classement local affiché'
        : 'Classement local (en ligne non configuré)');
  html += `<div class="hof-source">${note}</div>`;

  if (projection) {
    const place = projRank === 1 ? '1ᵉʳ' : projRank + 'ᵉ';
    html += `<div class="hof-proj-note">★ Simulation : si ton run Ironman`
      + ` s'arrêtait maintenant, tu serais <strong>${place}</strong>`
      + ` avec ${(projection.score | 0).toLocaleString('fr-FR')} points.</div>`;
  }

  listEl.innerHTML = html;
}

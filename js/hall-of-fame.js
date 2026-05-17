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

// Écran d'où le Hall of Fame a été ouvert ('hub' ou 'result').
let _hofReturnTo = 'hub';

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
        }),
      }
    );
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

// ── Handler bouton « Soumettre au Hall of Fame » ────────────
async function submitIronmanScore() {
  if (typeof _ironmanLastResult === 'undefined' || !_ironmanLastResult) return;

  const input    = document.getElementById('hof-name-input');
  const btn      = document.getElementById('hof-submit-btn');
  const statusEl = document.getElementById('hof-submit-status');

  let name = ((input && input.value) || '').trim().slice(0, 24);
  if (!name) name = 'Sorcier Anonyme';

  if (btn)   btn.disabled = true;
  if (input) input.disabled = true;
  if (statusEl) statusEl.textContent = 'Envoi en cours…';

  const entry = ironmanResultToEntry(_ironmanLastResult, name);
  const r = await _hofSubmit(entry);

  if (statusEl) {
    statusEl.textContent = r.online
      ? '✓ Score inscrit au Hall of Fame mondial !'
      : '✓ Score enregistré'
        + (_hofConfigured() ? ' localement (hors-ligne)' : ' dans le classement local')
        + '.';
  }
  if (btn) btn.textContent = 'Score soumis ✓';
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
  } else {
    const hub = document.getElementById('start-hub-screen');
    if (hub) hub.style.display = 'flex';
  }
}

async function _renderHallOfFame() {
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

  if (!rows.length) {
    listEl.innerHTML = '<div class="hof-empty">Aucun score enregistré.<br>'
      + 'Sois le premier à entrer dans la légende en mode Ironman !</div>';
    return;
  }

  let html = '';
  rows.forEach((r, i) => {
    const rank  = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
    html += `<div class="hof-row hof-rank-${rank}">`
      + `<div class="hof-rank">${medal}</div>`
      + `<div class="hof-main">`
      +   `<div class="hof-name">${_hofEsc(r.player_name)}</div>`
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

  listEl.innerHTML = html;
}

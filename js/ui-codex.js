// ============================================================
// CODEX — UI du journal vivant (Chapitre 12, Lot 3)
// ------------------------------------------------------------
// Modale DÉDIÉE #codex-modal (jamais #char-detail — garde-fou CLAUDE.md).
// Réutilise l'architecture de ui-bestiary.js (grille de cartes + fiche).
// L'onglet Bestiaire EMBARQUE openBestiary() existant (pas de réécriture).
// Les entrées créature restent dérivées de seenMonsters/monsterKills.
//
// Surface publique : openCodex(), closeCodex(), filterCodex(),
// showCodexEntry(id), showCodexList(), switchCodexSection(cat),
// checkCodexUnlocks(reason).
// ============================================================

// Sections (§12.2) — l'ordre des onglets. `bestiary` délègue à openBestiary().
const CODEX_SECTIONS = [
  { key: 'histoire',     emoji: '🔥', label: 'Histoire & Lore' },
  { key: 'eclats',       emoji: '🔹', label: 'Éclats & Voix' },
  { key: 'lieux',        emoji: '🗺️', label: 'Lieux' },
  { key: 'glossaire',    emoji: '📖', label: 'Glossaire' },
  { key: 'personnages',  emoji: '👤', label: 'Personnages' },
  { key: 'objets',       emoji: '⚜️', label: 'Objets' },
  { key: 'bestiary',     emoji: '🐉', label: 'Bestiaire' },
];

const _CODEX_STATE_META = {
  locked:    { badge: '🔒', label: 'Verrouillée', cls: 'codex-locked' },
  veiled:    { badge: '📖', label: 'Voilée',      cls: 'codex-veiled' },
  revealed:  { badge: '✨', label: 'Révélée',     cls: 'codex-revealed' },
  corrupted: { badge: '🌑', label: 'Corrompue',   cls: 'codex-corrupted' },
};

// Onglet de section courant (persiste tant que la modale est ouverte).
let _codexSection = 'histoire';

// ── Contexte de déverrouillage (agrège les signaux runtime, défensif) ──
function _codexContext() {
  let eclatCount = 0;
  // Robinet `item` (Lot 5) : ids possédés (inventaire partagé + équipement
  // de tous les membres). Sert aux légendaires de Maison / Larmes de Fumseck.
  const itemsOwned = new Set();
  if (player && Array.isArray(player.inventory)) {
    for (const it of player.inventory) {
      if (!it) continue;
      if (it.id === 'eclat_voute') eclatCount += (it.qty || 1);
      if (it.id) itemsOwned.add(it.id);
    }
  }
  if (typeof party !== 'undefined' && Array.isArray(party)) {
    for (const c of party) {
      if (!c || !c.equipped) continue;
      for (const slot of Object.keys(c.equipped)) {
        const it = c.equipped[slot];
        if (it && it.id) itemsOwned.add(it.id);
      }
    }
  }
  // Robinet `riddle` : pas de global persistant → dérivé au mieux de la
  // stèle de l'étage courant si résolue (best-effort, défensif).
  const riddles = new Set();
  if (typeof runeStele !== 'undefined' && runeStele && runeStele.solved && runeStele.riddleId) {
    riddles.add(runeStele.riddleId);
  }
  const cf = (typeof currentFloor === 'number') ? currentFloor : 1;
  const fr = (typeof floorReached === 'number') ? floorReached : 1;
  return {
    floorReached:   Math.max(fr, cf),
    eclatProgress:  eclatCount,
    seenMonsters:   (typeof seenMonsters !== 'undefined') ? seenMonsters : new Set(),
    monsterKills:   (typeof monsterKills !== 'undefined') ? monsterKills : {},
    questsDone:     (typeof completedQuests !== 'undefined') ? completedQuests : new Set(),
    riddlesSolved:  riddles,
    echoSeen:       (typeof seenEchoes !== 'undefined') ? seenEchoes : new Set(),
    itemsOwned,
    victoryAchieved: (typeof victoryAchieved !== 'undefined') ? !!victoryAchieved : false,
    chosenHouse:    (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
    // Robinet `eclatLoop` (V1, ch.11) : Éclats portés en Boucle (Porteur d'Éclats).
    accumulatedEclats: (typeof accumulatedEclats !== 'undefined') ? accumulatedEclats : 0,
    // Robinet `cycleBroken` (V3, ch.11) : fin « Briser le Cycle » atteinte.
    cycleBroken: (typeof cycleBroken !== 'undefined') ? !!cycleBroken : false,
    // Robinet `ending` (ch.14 §14.6.2, P3) : label de fin dérivé (épilogue).
    endingType: (typeof endingType !== 'undefined') ? endingType : null,
  };
}

function _codexHeroKeys() {
  if (typeof party === 'undefined' || !Array.isArray(party)) return [];
  const n = (typeof partySize === 'number') ? partySize : party.length;
  return party.slice(0, n).map(c => c && c.heroKey).filter(Boolean);
}

// Texte affiché pour un état donné (corrupted retombe sur revealed si absent).
function _codexTextFor(entry, state) {
  const tv = entry.textVersions || {};
  if (state === 'corrupted') return tv.corrupted || tv.revealed || tv.veiled || '';
  if (state === 'revealed')  return tv.revealed || tv.veiled || '';
  return tv.veiled || '';
}

// ── Ouverture / fermeture ────────────────────────────────────
function openCodex() {
  const modal = safeEl('codex-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  switchCodexSection(_codexSection || 'histoire');
}

function closeCodex() {
  const modal = safeEl('codex-modal');
  if (modal) modal.style.display = 'none';
}

// Bascule de section. La section Bestiaire délègue à la modale existante.
function switchCodexSection(cat) {
  if (cat === 'bestiary') {
    closeCodex();
    if (typeof openBestiary === 'function') openBestiary();
    return;
  }
  _codexSection = cat;
  // Surligne l'onglet actif.
  document.querySelectorAll('.codex-section-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
  });
  showCodexList();
}

// ── Liste + filtres ──────────────────────────────────────────
function filterCodex() { showCodexList(); }

function showCodexList() {
  const listPanel   = safeEl('codex-list-panel');
  const detailPanel = safeEl('codex-detail-panel');
  if (listPanel)   listPanel.style.display   = 'flex';
  if (detailPanel) detailPanel.style.display = 'none';

  const grid = safeEl('codex-grid');
  if (!grid) return;

  const search    = (safeEl('codex-search')?.value || '').toLowerCase().trim();
  const stateFilt = safeEl('codex-state')?.value || '';
  const ctx       = _codexContext();

  const entries = CODEX_ENTRIES.filter(e => e.category === _codexSection);
  if (!entries.length) {
    grid.innerHTML = `<div class="bestiary-empty">Cette section se remplira au fil de ta descente…</div>`;
    return;
  }

  // Tri : ouvertes en premier, puis par acte.
  const rows = entries.map(e => ({ e, state: codexEntryState(e, ctx) }));
  rows.sort((a, b) => {
    const la = a.state === 'locked' ? 1 : 0, lb = b.state === 'locked' ? 1 : 0;
    if (la !== lb) return la - lb;
    return (a.e.act || 0) - (b.e.act || 0);
  });

  const cards = rows.filter(({ e, state }) => {
    if (stateFilt && state !== stateFilt) return false;
    if (!search) return true;
    if (state === 'locked') return false;
    const hay = (e.title + ' ' + _codexTextFor(e, state)).toLowerCase();
    return hay.includes(search);
  }).map(({ e, state }) => _renderCodexCard(e, state)).join('');

  grid.innerHTML = cards || `<div class="bestiary-empty">Aucune entrée ne correspond…</div>`;
}

// Icône d'une entrée ouverte : PNG painterly si `iconImg` (entrées-phares),
// sinon emoji de repli. Défensif.
function _codexIcon(entry) {
  if (entry && entry.iconImg) {
    return `<img class="codex-icon-img" src="${entry.iconImg}" alt="">`;
  }
  return (entry && entry.icon) || '📜';
}

function _renderCodexCard(entry, state) {
  const meta   = _CODEX_STATE_META[state] || _CODEX_STATE_META.veiled;
  const locked = state === 'locked';
  const icon   = locked ? '❔' : _codexIcon(entry);
  const title  = locked ? '???' : entry.title;
  const snippet = locked
    ? 'Continue d\'explorer pour percer ce mystère…'
    : _codexTextFor(entry, state);
  const onclick = locked ? '' : ` onclick="showCodexEntry('${entry.id}')"`;
  // Parité clavier : une entrée révélée (cliquable) est focusable ; une entrée
  // verrouillée (sans onclick) ne l'est pas. Entrée/Espace + flèches via main.js.
  const tabAttr = locked ? '' : ' tabindex="0"';
  return `
    <div class="codex-card ${meta.cls}"${onclick}${tabAttr}>
      <div class="codex-card-icon">${icon}</div>
      <div class="codex-card-body">
        <div class="codex-card-title">${title}
          <span class="codex-state-badge" title="${meta.label}">${meta.badge}</span>
          ${entry.act ? `<span class="codex-act-tag">Acte ${entry.act}</span>` : ''}
        </div>
        <div class="codex-card-snippet">${snippet}</div>
      </div>
    </div>`;
}

// ── Fiche détaillée d'une entrée ─────────────────────────────
function showCodexEntry(id) {
  const entry  = getCodexEntry(id);
  const detail = safeEl('codex-detail');
  if (!entry || !detail) return;
  const ctx   = _codexContext();
  const state = codexEntryState(entry, ctx);
  if (state === 'locked') { showCodexList(); return; }

  const meta = _CODEX_STATE_META[state] || _CODEX_STATE_META.veiled;
  const note = codexVariantNote(entry, ctx.chosenHouse, _codexHeroKeys());

  // Liens internes cliquables vers les entrées ouvertes (graphe §12.2).
  const links = (entry.links || []).map(lid => {
    const le = getCodexEntry(lid);
    if (!le) return '';
    const ls = codexEntryState(le, ctx);
    if (ls === 'locked') return '';
    return `<button class="codex-link" onclick="showCodexEntry('${lid}')">${le.icon || '📜'} ${le.title}</button>`;
  }).filter(Boolean).join('');

  detail.innerHTML = `
    <div class="codex-detail-header ${meta.cls}">
      <div class="codex-detail-icon">${_codexIcon(entry)}</div>
      <div class="codex-detail-titles">
        <h2 class="codex-detail-name">${entry.title}</h2>
        <div class="codex-detail-meta">
          <span class="codex-state-badge">${meta.badge} ${meta.label}</span>
          ${entry.act ? `<span class="codex-act-tag">Acte ${entry.act}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="codex-detail-body codex-body-${state} codex-act-${entry.act || 1}">${_codexTextFor(entry, state)}</div>
    ${note ? `<div class="codex-variant-note">✒️ <em>${note}</em></div>` : ''}
    ${state === 'veiled' && entry.revealedBy ? `<div class="codex-hint">🔒 Cette page n'a pas encore livré tout son sens…</div>` : ''}
    ${links ? `<div class="codex-links"><div class="codex-links-title">Renvois</div>${links}</div>` : ''}
    <div style="text-align:center;margin-top:18px">
      <button class="cmd-btn" onclick="showCodexList()">← Retour au Codex</button>
    </div>`;

  safeEl('codex-list-panel').style.display   = 'none';
  safeEl('codex-detail-panel').style.display = 'block';
}

// ============================================================
// Déverrouillage live + notifications (file d'attente, hors combat)
// ============================================================
let _codexNotifyQueue = [];

// Réévalue toutes les entrées non-créature ; toute NOUVELLE ouverture ou
// révélation par rapport à `unlockedCodexEntries` est notifiée. Branché aux
// mêmes points que autoSave. Défensif : no-op si les globals manquent.
function checkCodexUnlocks(reason) {
  if (typeof CODEX_ENTRIES === 'undefined' || typeof unlockedCodexEntries === 'undefined') return;
  // Tient `floorReached` à jour (étage max atteint) — robinet `floor`.
  if (typeof currentFloor === 'number' && currentFloor > floorReached) floorReached = currentFloor;

  const ctx = _codexContext();
  for (const entry of CODEX_ENTRIES) {
    const state = codexEntryState(entry, ctx);
    if (state === 'locked') continue;

    // Nouvelle ouverture (jamais vue).
    if (!unlockedCodexEntries.has(entry.id)) {
      unlockedCodexEntries.add(entry.id);
      _codexNotifyQueue.push({ kind: 'open', title: entry.title });
    }
    // Nouvelle révélation / corruption (marqueur dédié `id#state`).
    if (state === 'revealed' || state === 'corrupted') {
      const mark = entry.id + '#' + state;
      if (!unlockedCodexEntries.has(mark)) {
        unlockedCodexEntries.add(mark);
        _codexNotifyQueue.push({ kind: state, title: entry.title });
      }
    }
  }
  _codexFlushNotifications();
}

// Émet les toasts en attente, jamais en plein combat (modèle level-up).
// SFX joués au plus une fois par vidage (écriture pour les ouvertures,
// sceau pour les révélations/corruptions) — défensif, jamais bloquant.
function _codexFlushNotifications() {
  if (typeof inBattle !== 'undefined' && inBattle) return;
  if (typeof addMsg !== 'function') { _codexNotifyQueue = []; return; }
  let didOpen = false, didReveal = false;
  while (_codexNotifyQueue.length) {
    const n = _codexNotifyQueue.shift();
    if (n.kind === 'open') {
      addMsg(`📖 Codex — nouvelle entrée : <em>${n.title}</em>`, 'good');
      didOpen = true;
    } else if (n.kind === 'corrupted') {
      addMsg(`🌑 Codex corrompu : <em>${n.title}</em>`, 'magic');
      didReveal = true;
    } else {
      addMsg(`✨ Codex révélé : <em>${n.title}</em>`, 'magic');
      didReveal = true;
    }
  }
  // La révélation (sceau) prime sur l'écriture si les deux surviennent.
  if (typeof AudioSystem !== 'undefined' && AudioSystem) {
    if (didReveal && typeof AudioSystem.playCodexReveal === 'function') AudioSystem.playCodexReveal();
    else if (didOpen && typeof AudioSystem.playCodexWrite === 'function') AudioSystem.playCodexWrite();
  }
}

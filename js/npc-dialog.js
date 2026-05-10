// ============================================================
// DIALOGUE PNJ
// ============================================================
// Pilote l'overlay #npc-dialog-overlay et le dispatch de l'état
// d'une quête liée au PNJ. Lecture du registre `NPCS` (npcs.js)
// et des conteneurs `availableQuests` / `activeQuests` /
// `completedQuests` (state.js).

// ── Utilitaires d'état quête ────────────────────────────────────

// Retourne 'none' | 'offer' | 'active' | 'ready' | 'done'
function getNpcQuestState(npc) {
  if (!npc) return 'none';
  const given = npc.questsGiven || [];
  if (!given.length) return 'none';
  if (typeof _refreshObjectives === 'function') _refreshObjectives();
  for (const qid of given) {
    if (typeof completedQuests !== 'undefined' && completedQuests.has(qid)) {
      continue; // celle-ci est rendue, on regarde la suivante
    }
    const active = (typeof activeQuests !== 'undefined')
      ? activeQuests.find(q => q.id === qid) : null;
    if (active) {
      const allDone = (active.objectives || []).every(o => o.completed);
      return allDone ? 'ready' : 'active';
    }
    if (typeof availableQuests !== 'undefined' && availableQuests.has(qid)) {
      return 'offer';
    }
  }
  // Toutes les quêtes données sont complétées
  return 'done';
}

// Indicateur "!" / "?" / "" affiché au-dessus du marqueur 3D.
function getNpcMarkerSign(npcId) {
  if (!npcId) return '';
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return '';
  const state = getNpcQuestState(npc);
  if (state === 'offer') return '!';
  if (state === 'ready') return '?';
  return '';
}

// ── Rendu de l'overlay ───────────────────────────────────────────

// Retourne toujours un tableau de pages (array<string>). Un dialogue
// peut être déclaré comme string (1 page) ou comme array (multi-page).
function _npcDialogPages(npc, state) {
  const d = npc.dialogues || {};
  let raw;
  if (typeof seenNpcs !== 'undefined' && !seenNpcs.has(npc.id) && d.greeting) {
    raw = d.greeting;
  } else if (state === 'offer'  && d.questOffer)  raw = d.questOffer;
  else if (state === 'active' && d.questActive) raw = d.questActive;
  else if (state === 'ready'  && d.questReady)  raw = d.questReady;
  else if (state === 'done'   && d.questDone)   raw = d.questDone;
  else                                           raw = d.idle || d.greeting || '...';
  return Array.isArray(raw) ? raw.slice() : [raw];
}

function _npcDialogActions(npc, state) {
  const out = [];
  // Action contextuelle quête
  if (state === 'offer') {
    const qid = (npc.questsGiven || []).find(q => availableQuests.has(q));
    if (qid) {
      out.push({
        label: 'Accepter la quête',
        onClick: `acceptQuest('${qid}'); openNpcDialog('${npc.id}');`
      });
    }
  } else if (state === 'ready') {
    const qid = (npc.questsGiven || []).find(q => {
      const a = activeQuests.find(x => x.id === q);
      return a && (a.objectives || []).every(o => o.completed);
    });
    if (qid) {
      out.push({
        label: 'Remettre la quête',
        onClick: `turnInQuestById('${qid}'); openNpcDialog('${npc.id}');`
      });
    }
  }
  out.push({ label: 'S\'éloigner', onClick: 'closeNpcDialog()', secondary: true });
  return out;
}

// État courant du dialogue (multi-pages)
let _dialogState = { npcId: null, pages: [], page: 0, actions: [] };

function _renderDialogPage() {
  const { pages, page, actions } = _dialogState;
  const total = pages.length;
  const textEl = document.getElementById('npc-dialog-text');
  if (textEl) {
    const pagerHtml = total > 1
      ? `<div class="npc-dialog-pager">${page + 1} / ${total}</div>` : '';
    textEl.innerHTML = `<div class="npc-dialog-page">${pages[page]}</div>${pagerHtml}`;
  }
  const actionsEl = document.getElementById('npc-dialog-actions');
  if (actionsEl) {
    if (page < total - 1) {
      actionsEl.innerHTML =
        `<button class="explore-btn" onclick="nextDialogPage()">Suivant ▸</button>`;
    } else {
      actionsEl.innerHTML = actions.map(a =>
        `<button class="explore-btn${a.secondary ? ' secondary' : ''}" onclick="${a.onClick}">${a.label}</button>`
      ).join('');
    }
  }
}

function nextDialogPage() {
  if (_dialogState.page < _dialogState.pages.length - 1) {
    _dialogState.page++;
    _renderDialogPage();
  }
}

function openNpcDialog(npcId) {
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return;

  const state = getNpcQuestState(npc);

  // Portrait : raster (priorité 1) > SVG inline > emoji fallback
  const portraitEl = document.getElementById('npc-dialog-portrait');
  if (portraitEl) {
    if (npc.portraitImg) {
      portraitEl.innerHTML = `<img src="${npc.portraitImg}" alt="${npc.name || ''}" class="npc-portrait-img">`;
    } else {
      portraitEl.innerHTML = npc.portraitSvg || (npc.icon || '🧙');
    }
  }
  const nameEl = document.getElementById('npc-dialog-name');
  if (nameEl) nameEl.textContent = npc.name || '';
  const titleEl = document.getElementById('npc-dialog-title');
  if (titleEl) titleEl.textContent = npc.title || '';

  // État dialog → pages + actions calculés AVANT add(seenNpcs) pour
  // que la 1re rencontre lise bien `greeting`.
  _dialogState = {
    npcId,
    pages:   _npcDialogPages(npc, state),
    page:    0,
    actions: _npcDialogActions(npc, state)
  };
  _renderDialogPage();

  // Marquer comme rencontré (après calcul des pages)
  if (typeof seenNpcs !== 'undefined') seenNpcs.add(npc.id);

  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) {
    const wasOpen = overlay.style.display === 'flex';
    overlay.style.display = 'flex';
    // Cloche d'accueil seulement à la 1re ouverture (pas sur re-render après accept/turnIn)
    if (!wasOpen && AudioSystem && typeof AudioSystem.playNpcGreet === 'function') {
      AudioSystem.playNpcGreet();
    }
  }

  // Rafraîchit le canvas pour mettre à jour l'indicateur "!"/"?".
  if (typeof drawDungeon === 'function') drawDungeon();
}

function closeNpcDialog() {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Fermeture par Échap / clic backdrop ────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay && overlay.style.display === 'flex') closeNpcDialog();
});

document.addEventListener('click', (e) => {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (!overlay || overlay.style.display !== 'flex') return;
  // Ferme uniquement si on clique sur le backdrop (pas une descendance)
  if (e.target === overlay) closeNpcDialog();
});

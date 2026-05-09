// ============================================================
// SAVE-UI — modale de choix de slot (sauvegarder / charger)
// ============================================================

// Format relatif court : "à l'instant", "il y a 5min", "il y a 2j"
function _formatSavedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffSec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diffSec < 60)        return "à l'instant";
  if (diffSec < 3600)      return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400)     return `il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 86400 * 7) return `il y a ${Math.floor(diffSec / 86400)} j`;
  return d.toLocaleDateString('fr-FR');
}

// Construit le HTML d'une carte de slot. mode = 'save' | 'load'.
// id : 'manual_1' | … | 'auto'. slot peut être null (slot vide).
function _renderSlotCard(id, slot, mode) {
  const isAuto = id === AUTO_SLOT_ID;
  const empty  = !slot;
  const label  = isAuto ? 'Sauvegarde automatique'
                        : `Emplacement ${id.replace('manual_', '')}`;

  if (empty) {
    if (mode === 'load') {
      // En mode load, on n'affiche pas les slots vides
      return null;
    }
    if (isAuto) {
      // En mode save, slot auto vide = informatif, non sélectionnable
      return `
        <div class="slot-card slot-empty slot-readonly" aria-disabled="true">
          <div class="slot-head"><span class="slot-label">${label}</span><span class="slot-tag">readonly</span></div>
          <div class="slot-empty-text">Aucune sauvegarde automatique encore.</div>
        </div>`;
    }
    return `
      <div class="slot-card slot-empty" data-slot-id="${id}" data-mode="save">
        <div class="slot-head"><span class="slot-label">${label}</span><span class="slot-tag slot-tag-new">vide</span></div>
        <div class="slot-empty-text">Cliquez pour sauvegarder ici.</div>
      </div>`;
  }

  const m = slot.meta || {};
  const heroIcons = (m.heroIcons || []).map(src =>
    src && src.endsWith && src.endsWith('.png')
      ? `<img class="slot-hero-icon" src="${src}" alt="">`
      : `<span class="slot-hero-icon">${src || '🧙'}</span>`
  ).join('');
  const houseLine = m.house ? ` · ${m.house}` : '';
  const when = _formatSavedAt(m.savedAt);
  const readonlyAttr = (mode === 'save' && isAuto) ? 'aria-disabled="true"' : '';
  const dataMode = mode === 'save' && isAuto ? 'noop' : mode;

  return `
    <div class="slot-card slot-filled${isAuto ? ' slot-auto' : ''}${dataMode === 'noop' ? ' slot-readonly' : ''}"
         data-slot-id="${id}" data-mode="${dataMode}" ${readonlyAttr}>
      <div class="slot-head">
        <span class="slot-label">${label}</span>
        <span class="slot-tag${isAuto ? ' slot-tag-auto' : ''}">${m.label || ''}</span>
      </div>
      <div class="slot-body">
        <div class="slot-heroes">${heroIcons}</div>
        <div class="slot-text">
          <div class="slot-line slot-line-strong">${(m.heroNames || []).join(' &amp; ')}</div>
          <div class="slot-line">Niv. ${m.level || 1} · Étage ${m.floor || 1}${houseLine}</div>
          <div class="slot-line slot-line-meta">${m.difficulty || 'Normal'} — ${when}</div>
        </div>
      </div>
      ${mode === 'save' && !isAuto
        ? `<div class="slot-actions"><button class="slot-overwrite-btn">Écraser</button></div>`
        : ''}
      ${(mode === 'load' || (mode === 'save' && !isAuto))
        ? `<button class="slot-delete-btn" title="Supprimer ce slot" data-action="delete">×</button>`
        : ''}
    </div>`;
}

function _renderSlotList(mode) {
  const list = document.getElementById('slot-modal-list');
  if (!list) return;
  const slots = listSaveSlots();
  const slotById = Object.fromEntries(slots.map(s => [s.id, s]));
  const ids = ['manual_1', 'manual_2', 'manual_3', AUTO_SLOT_ID];
  const cards = ids
    .map(id => {
      const slot = slotById[id] ? readSlot(id) : null;
      return _renderSlotCard(id, slot, mode);
    })
    .filter(Boolean);
  if (cards.length === 0 && mode === 'load') {
    list.innerHTML = `<div class="slot-empty-state">Aucune sauvegarde disponible.</div>`;
  } else {
    list.innerHTML = cards.join('');
  }
}

function _bindSlotModalEvents(mode) {
  const list = document.getElementById('slot-modal-list');
  if (!list) return;
  list.onclick = (ev) => {
    const delBtn = ev.target.closest('[data-action="delete"]');
    if (delBtn) {
      ev.stopPropagation();
      const card = delBtn.closest('[data-slot-id]');
      const id   = card && card.getAttribute('data-slot-id');
      if (!id) return;
      if (!confirm('Supprimer définitivement cette sauvegarde ?')) return;
      deleteSlot(id);
      _renderSlotList(mode);
      return;
    }
    const card = ev.target.closest('[data-slot-id]');
    if (!card) return;
    const cardMode = card.getAttribute('data-mode');
    if (cardMode === 'noop') return;
    const id = card.getAttribute('data-slot-id');
    if (!id) return;
    if (cardMode === 'save') _commitSlotSave(id);
    if (cardMode === 'load') _commitSlotLoad(id);
  };
}

function _commitSlotSave(id) {
  const existing = readSlot(id);
  if (existing && !confirm("Cet emplacement contient déjà une sauvegarde. L'écraser ?")) return;
  const ok = writeSlot(id, 'Manuel');
  if (ok) {
    addMsg('Partie sauvegardée !', 'good');
    closeModal('slot-modal');
  } else {
    addMsg('Sauvegarde impossible.', 'bad');
  }
}

function _commitSlotLoad(id) {
  const slot = readSlot(id);
  if (!slot || !slot.state) { addMsg('Sauvegarde introuvable.', 'bad'); return; }
  _applyState(slot.state);
  setNarrative('Le groupe reprend ses esprits. La partie est chargée !');
  addMsg('Partie chargée !', 'good');
  closeModal('slot-modal');
}

function openSaveDialog() {
  if (typeof inBattle !== 'undefined' && inBattle) {
    addMsg('Impossible de sauvegarder en combat !', 'bad');
    return;
  }
  migrateLegacyKey(); // import éventuel de l'ancienne clé
  document.getElementById('slot-modal-title').textContent = '💾 Sauvegarder';
  const hint = document.getElementById('slot-modal-hint');
  if (hint) hint.textContent = 'Sélectionnez un emplacement à écrire (1, 2 ou 3).';
  _renderSlotList('save');
  _bindSlotModalEvents('save');
  document.getElementById('slot-modal').style.display = 'flex';
}

function openLoadDialog() {
  migrateLegacyKey();
  document.getElementById('slot-modal-title').textContent = '📂 Charger une sauvegarde';
  const hint = document.getElementById('slot-modal-hint');
  if (hint) hint.textContent = 'Cliquez sur un emplacement pour le charger.';
  _renderSlotList('load');
  _bindSlotModalEvents('load');
  document.getElementById('slot-modal').style.display = 'flex';
}

// ============================================================
// HUB DE DÉMARRAGE (Nouvelle partie / Reprendre)
// ============================================================

// Rendu de la liste des slots dans le hub. Différent du modal :
// - mode 'load' (slots remplis cliquables)
// - les slots vides ne sont pas affichés (visuellement on bascule
//   directement vers player-select s'il n'y a aucune sauvegarde).
function _renderHubSlotList() {
  const list = document.getElementById('start-hub-slot-list');
  if (!list) return;
  const slots = listSaveSlots();
  if (slots.length === 0) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = slots
    .map(s => _renderSlotCard(s.id, readSlot(s.id), 'load'))
    .filter(Boolean)
    .join('');
  list.onclick = (ev) => {
    const delBtn = ev.target.closest('[data-action="delete"]');
    if (delBtn) {
      ev.stopPropagation();
      const card = delBtn.closest('[data-slot-id]');
      const id = card && card.getAttribute('data-slot-id');
      if (!id) return;
      if (!confirm('Supprimer définitivement cette sauvegarde ?')) return;
      deleteSlot(id);
      _renderHubSlotList();
      return;
    }
    const card = ev.target.closest('[data-slot-id]');
    if (!card) return;
    const id = card.getAttribute('data-slot-id');
    if (id) loadSlotAndStart(id);
  };
}

// Point d'entrée depuis l'écran titre.
// - Migre éventuellement l'ancienne clé legacy.
// - Si au moins une sauvegarde existe → affiche le hub.
// - Sinon → bascule direct sur player-select (UX inchangée pour les
//   nouveaux joueurs).
function enterStartHub() {
  const titleEl = document.getElementById('title-screen');
  if (titleEl) titleEl.style.display = 'none';
  migrateLegacyKey();
  const slots = listSaveSlots();
  if (slots.length === 0) {
    // Aucun slot : flux d'origine (player-select directement)
    if (typeof showPlayerSelect === 'function') {
      // showPlayerSelect masque le title-screen lui-même, mais on l'a déjà fait
      const psEl = document.getElementById('player-select-screen');
      if (psEl) psEl.style.display = 'flex';
      // Initialiser comme showPlayerSelect()
      if (typeof selectedPartySize !== 'undefined') {
        selectedPartySize = 1;
        selectedHeroes    = ['harry'];
        if (typeof refreshHeroSelectionUI === 'function') refreshHeroSelectionUI();
      }
    }
    return;
  }
  _renderHubSlotList();
  document.getElementById('start-hub-screen').style.display = 'flex';
}

// Bouton "Nouvelle aventure" du hub : on cache le hub et on enchaîne sur
// player-select (flux existant).
function startHubNewGame() {
  document.getElementById('start-hub-screen').style.display = 'none';
  if (typeof showPlayerSelect === 'function') {
    const psEl = document.getElementById('player-select-screen');
    if (psEl) psEl.style.display = 'flex';
    if (typeof selectedPartySize !== 'undefined') {
      selectedPartySize = 1;
      selectedHeroes    = ['harry'];
      if (typeof refreshHeroSelectionUI === 'function') refreshHeroSelectionUI();
    }
  }
}

// Charge un slot et bascule directement en jeu (skip player/house-select).
async function loadSlotAndStart(id) {
  const slot = readSlot(id);
  if (!slot || !slot.state) {
    if (typeof addMsg === 'function') addMsg('Sauvegarde introuvable.', 'bad');
    return false;
  }

  // Masquer tous les écrans de démarrage
  ['title-screen','start-hub-screen','player-select-screen','house-select-screen']
    .forEach(sid => { const el = document.getElementById(sid); if (el) el.style.display = 'none'; });

  // Charger les textures (idempotent grâce au cache _loadingPromise)
  if (window.loadTextures) await loadTextures();

  // Afficher le conteneur de jeu et redimensionner le canvas
  const gc = document.getElementById('game-container');
  if (gc) gc.style.display = 'grid';
  if (typeof resizeCanvas === 'function') resizeCanvas();

  // Appliquer l'état (mute player/player2, currentFloor, dungeon, etc.,
  // et redessine la minimap + le donjon).
  _applyState(slot.state);

  // Tweaks UI dépendants de partySize
  applyPartyMode();

  // Audio (le clic utilisateur sur un slot constitue le geste autorisant l'audio)
  if (typeof AudioSystem !== 'undefined') {
    AudioSystem.init();
    AudioSystem.playAmbientMusic(currentFloor || 1);
  }

  if (typeof setNarrative === 'function') setNarrative('Le groupe reprend son aventure...');
  if (typeof addMsg === 'function')        addMsg('Partie reprise.', 'good');
  return true;
}

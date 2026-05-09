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

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

// Confirme la suppression d'un slot en différenciant le risque : l'auto-save
// (`id === 'auto'`) est bénin — recréé automatiquement à la prochaine étape —
// alors qu'un slot manuel est une sauvegarde délibérée dont la perte est
// irréversible. Deux messages distincts pour éviter une suppression à la
// légère via un `confirm()` générique peu visible.
function _confirmSlotDeletion(id) {
  if (id === AUTO_SLOT_ID) {
    return confirm('Supprimer la sauvegarde automatique ?\n\n'
      + 'Elle sera recréée seule à la prochaine étape (descente, fin de combat, niveau).');
  }
  return confirm('Supprimer DÉFINITIVEMENT cette sauvegarde manuelle ?\n\n'
    + 'Cette action est irréversible — cette partie enregistrée sera perdue.');
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
  const victoryBadge = m.victory ? `<span class="slot-victory" title="Vainqueur de Voldemort"><img class="ui-icon ui-icon-md" src="img/icons/trophy.png" alt="🏆"></span>` : '';
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
          <div class="slot-line slot-line-strong">${(m.heroNames || []).join(' &amp; ')}${victoryBadge}</div>
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
      if (!_confirmSlotDeletion(id)) return;
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
  document.getElementById('slot-modal-title').innerHTML = '<img class="ui-icon ui-icon-xl" src="img/icons/save.png" alt=""> Sauvegarder';
  const hint = document.getElementById('slot-modal-hint');
  if (hint) hint.textContent = 'Sélectionnez un emplacement à écrire (1, 2 ou 3).';
  _renderSlotList('save');
  _bindSlotModalEvents('save');
  document.getElementById('slot-modal').style.display = 'flex';
}

function openLoadDialog() {
  migrateLegacyKey();
  document.getElementById('slot-modal-title').innerHTML = '<img class="ui-icon ui-icon-xl" src="img/icons/load.png" alt=""> Charger une sauvegarde';
  const hint = document.getElementById('slot-modal-hint');
  if (hint) hint.textContent = 'Cliquez sur un emplacement pour le charger.';
  _renderSlotList('load');
  _bindSlotModalEvents('load');
  document.getElementById('slot-modal').style.display = 'flex';
}

// ── Export / import depuis le bouton du modal ──────────────────────
function exportSaveToFile() {
  if (typeof exportSaveStore !== 'function') return;
  const json = exportSaveStore();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `hogwarts-save-${ts}.json`;
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    if (typeof addMsg === 'function') addMsg(`Sauvegarde exportée (${filename}).`, 'good');
  } catch (e) {
    if (typeof addMsg === 'function') addMsg('Export impossible.', 'bad');
  }
}

// Pipeline partagé d'import de sauvegarde depuis un <input type=file>.
// `onError(reasonLabel)` : reasonLabel = libellé d'échec d'import, ou
// null pour une erreur de lecture du fichier. `onSuccess(res)` reçoit
// le résultat d'importSaveStore.
function _pickAndImportSave(inputId, { onError, onSuccess }) {
  const input = document.getElementById(inputId);
  if (!input || typeof importSaveStore !== 'function') return;
  input.onchange = () => {
    const file = input.files && input.files[0];
    input.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importSaveStore(String(reader.result || ''));
      if (!res.ok) {
        const reasonLabel = {
          json:  'fichier JSON invalide',
          shape: 'structure inattendue',
          empty: 'aucun emplacement reconnu',
          write: 'écriture impossible (espace local saturé ?)'
        }[res.reason] || 'erreur inconnue';
        onError(reasonLabel);
        return;
      }
      onSuccess(res);
    };
    reader.onerror = () => onError(null);
    reader.readAsText(file);
  };
  input.click();
}

function importSaveFromFile() {
  _pickAndImportSave('slot-modal-file-input', {
    onError: (label) => {
      if (typeof addMsg !== 'function') return;
      addMsg(label ? `Import refusé : ${label}.` : 'Lecture du fichier impossible.', 'bad');
    },
    onSuccess: (res) => {
      if (typeof addMsg === 'function')
        addMsg(`Import OK — ${res.imported} slot(s) importé(s).`, 'good');
      // Rafraîchit la liste en mode courant si la modale est ouverte
      const titleEl = document.getElementById('slot-modal-title');
      const isSave  = titleEl && titleEl.textContent && titleEl.textContent.includes('Sauvegarder');
      _renderSlotList(isSave ? 'save' : 'load');
      _bindSlotModalEvents(isSave ? 'save' : 'load');
    }
  });
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
      if (!_confirmSlotDeletion(id)) return;
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
// - Affiche toujours le hub : le bouton "Importer une sauvegarde" doit
//   rester accessible même sans slot existant (cas typique : test d'une
//   fixture). La liste vide est rendue avec un placeholder doux.
let _introNarrationStarted = false;

// ── Amorçage de la musique de menu dès le 1er geste ──────────────
// La politique d'autoplay des navigateurs interdit tout son tant que
// le joueur n'a pas interagi avec la page. On amorce donc le thème de
// menu au tout premier geste (clic, touche ou toucher), y compris sur
// l'écran titre : la musique accompagne le joueur dès qu'il interagit,
// sans attendre la navigation vers le hub.
let _menuAudioArmed = false;
function _armMenuAudio() {
  if (_menuAudioArmed) return;
  _menuAudioArmed = true;
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.removeEventListener(ev, _armMenuAudio, true));
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playMenuMusic === 'function') {
    AudioSystem.playMenuMusic();
  }
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
  document.addEventListener(ev, _armMenuAudio, true));

// V3 (room-of-requirement-v3.md §5) — Almanach de la Salle sur Demande : pur
// trophée offline (codex localStorage). Masqué tant qu'aucune Salle n'a été
// découverte (pas de spoiler). Lecture seule, aucun bouton.
function renderRequirementAlmanac() {
  const el = document.getElementById('start-hub-almanac');
  if (!el) return;
  const codex = (typeof getRequirementCodex === 'function')
    ? getRequirementCodex() : { themesSeen: {}, roomsFound: 0, trophies: {} };
  const trophies = codex.trophies || {};
  const themeKeys = Object.keys(codex.themesSeen || {});
  const anyTrophy = Object.keys(trophies).some(k => trophies[k]);
  if (!codex.roomsFound && !themeKeys.length && !anyTrophy) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  // V3.1 — médaillons de trophées (PNG, fallback emoji), grisés si non obtenus.
  const list = (typeof REQUIREMENT_TROPHIES !== 'undefined') ? REQUIREMENT_TROPHIES : [];
  const pills = list.map(t => {
    const owned = !!trophies[t.theme];
    const inner = t.img
      ? `<img src="${t.img}" alt="" onerror="this.replaceWith(document.createTextNode('${t.icon}'))">`
      : t.icon;
    const title = owned ? t.name : `${t.name} — à découvrir`;
    return `<span class="alm-pill ${owned ? 'seen' : 'locked'}${t.theme === '_complete' ? ' alm-trophy' : ''}" title="${title}">${owned ? inner : '·'}</span>`;
  }).join('');
  const total = list.filter(t => t.theme !== '_complete').length;
  const got = list.filter(t => t.theme !== '_complete' && trophies[t.theme]).length;
  // Replié par défaut (discret) : le résumé porte le compteur, le corps
  // explicite ce que c'est et pourquoi ça intéresse le joueur.
  el.innerHTML = `
    <details class="alm-details">
      <summary class="alm-title">🚪 Almanach de la Salle sur Demande · <span class="alm-count">${got}/${total}</span></summary>
      <div class="alm-sub">Souvenirs gardés entre tes parties. Chaque thème de Salle sur Demande déjà découvert t'accorde un petit bonus de départ (Gallions + potions).</div>
      <div class="alm-stat">Salles trouvées : <b>${codex.roomsFound | 0}</b></div>
      <div class="alm-pills">${pills}</div>
    </details>`;
  el.style.display = 'block';
}

function enterStartHub() {
  const titleEl = document.getElementById('title-screen');
  if (titleEl) titleEl.style.display = 'none';
  migrateLegacyKey();
  _renderHubSlotList();
  renderRequirementAlmanac(); // V3 — méta léger (masqué si vierge)
  document.getElementById('start-hub-screen').style.display = 'flex';
  // La musique de menu est normalement déjà lancée par `_armMenuAudio`
  // (1er geste) ; cet appel reste un filet de sécurité idempotent. La
  // voix narrative mystérieuse accueille le joueur — il ne sait pas
  // encore que c'est Dumbledore.
  if (typeof AudioSystem !== 'undefined') {
    if (typeof AudioSystem.playMenuMusic === 'function') AudioSystem.playMenuMusic();
    if (!_introNarrationStarted && typeof AudioSystem.playVoice === 'function') {
      _introNarrationStarted = true;
      AudioSystem.playVoice('narrator_welcome');
    }
  }
}

// Bouton "📥 Importer une sauvegarde" du hub démarrage. Wiring séparé
// de la modale `slot-modal` car le hub n'est pas en jeu (pas de modale
// pré-ouverte à rafraîchir). Après import, on rebascule sur le hub si
// au moins un slot a été importé, sinon on reste où on est.
function importSaveFromFileToHub() {
  _pickAndImportSave('hub-import-file-input', {
    onError: (label) => {
      alert(label ? 'Import refusé : ' + label : 'Lecture du fichier impossible.');
    },
    onSuccess: () => {
      // Rebascule sur le hub avec la nouvelle liste de slots.
      const hub = document.getElementById('start-hub-screen');
      if (hub) hub.style.display = 'none';
      enterStartHub();
    }
  });
}

// Bouton "Nouvelle aventure" du hub : on cache le hub et on enchaîne sur
// player-select (flux existant).
function startHubNewGame() {
  document.getElementById('start-hub-screen').style.display = 'none';
  const psEl = document.getElementById('player-select-screen');
  if (psEl) psEl.style.display = 'flex';
  // Réinitialise la sélection guidée en étapes (étape 1, Solo + Harry).
  if (typeof pselReset === 'function') pselReset();
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

  // Multijoueur — ouvre la session de présence fantôme (cf. multiplayer.js).
  if (typeof mpStartSession === 'function') mpStartSession();

  // Audio (le clic utilisateur sur un slot constitue le geste autorisant l'audio)
  if (typeof AudioSystem !== 'undefined') {
    AudioSystem.init();
    AudioSystem.playAmbientMusic(currentFloor || 1);
  }

  if (typeof setNarrative === 'function') setNarrative('Le groupe reprend son aventure...');
  if (typeof addMsg === 'function')        addMsg('Partie reprise.', 'good');
  return true;
}

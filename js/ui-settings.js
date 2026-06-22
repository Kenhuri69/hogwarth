// ============================================================
// RÉGLAGES — Difficulté & accueil des visiteurs
// ============================================================
// changeDifficulty/applyDifficulty, toggleVisitsClosed/_updateVisitsBtn.
// Chargé APRÈS ui.js.
// ============================================================
// Mondes parallèles Phase F (§16.7) — toggle d'accueil des voyageurs.
// Bascule `visitsClosed`, rafraîchit l'icône du bouton, persiste via
// autoSave('visits-toggled'). Le statut envoyé à mp_presence est mis à
// jour au prochain heartbeat (≤ MP_HEARTBEAT_MS).
function toggleVisitsClosed() {
  if (typeof visitsClosed === 'undefined') return;
  visitsClosed = !visitsClosed;
  _updateVisitsBtn();
  if (typeof addMsg === 'function') {
    addMsg(visitsClosed
      ? '🔒 Accueil des voyageurs refermé — tu ne recevras plus de visites.'
      : '🚪 Accueil des voyageurs ouvert — les autres sorciers peuvent te rejoindre.',
      visitsClosed ? '' : 'good');
  }
  if (typeof autoSave === 'function') autoSave('visits-toggled');
}

// Met à jour l'icône et le titre du bouton #btn-visits selon `visitsClosed`.
// Appelé au toggle et à chaque updateUI (pour refléter une sync de save).
function _updateVisitsBtn() {
  const btn = document.getElementById('btn-visits');
  if (!btn) return;
  const closed = typeof visitsClosed !== 'undefined' && visitsClosed;
  const icon = btn.querySelector('.btn-icon');
  if (icon) icon.textContent = closed ? '🔒' : '🚪';
  btn.title = closed
    ? 'Accueil des voyageurs : fermé (cliquer pour rouvrir)'
    : 'Accueil des voyageurs : ouvert (cliquer pour fermer)';
  btn.setAttribute('aria-pressed', closed ? 'true' : 'false');
}

// ── Voix des héros (barks — L6) ──────────────────────────────
// Toggle d'agrément (comme mute/voix des sorts). `barksEnabled` est un
// `let` global de state.js, sérialisé dans la save ; on persiste aussi le
// choix dans une clé localStorage dédiée pour qu'il survive aux rechargements
// indépendamment d'une partie chargée (même philosophie que les prefs audio).
const _BARKS_PREF_KEY = 'hogwarts_rpg_barks_enabled';

function toggleBarks() {
  if (typeof barksEnabled === 'undefined') return;
  barksEnabled = !barksEnabled;
  try { localStorage.setItem(_BARKS_PREF_KEY, barksEnabled ? '1' : '0'); } catch (_) { /* indispo */ }
  _updateBarksBtn();
  if (typeof addMsg === 'function') {
    addMsg(barksEnabled
      ? '💬 Voix des héros activée — tes compagnons réagissent au combat.'
      : '🤐 Voix des héros coupée.',
      barksEnabled ? 'good' : '');
  }
}

// Met à jour l'icône et le titre du bouton #btn-barks selon `barksEnabled`.
// Appelé au toggle et à chaque updateUI (pour refléter une sync de save).
function _updateBarksBtn() {
  const btn = document.getElementById('btn-barks');
  if (!btn) return;
  const on = typeof barksEnabled === 'undefined' || barksEnabled;
  const icon = btn.querySelector('.btn-icon');
  if (icon) icon.textContent = on ? '💬' : '🤐';
  btn.title = on ? 'Voix des héros : activée (cliquer pour couper)'
                 : 'Voix des héros : coupée (cliquer pour activer)';
  btn.setAttribute('aria-pressed', on ? 'false' : 'true');
}

// Restaure la préférence localStorage (si présente) dans `barksEnabled` et
// resynchronise le bouton. Appelé au DOMContentLoaded.
function _loadBarksPref() {
  try {
    const raw = localStorage.getItem(_BARKS_PREF_KEY);
    if (raw === '0') barksEnabled = false;
    else if (raw === '1') barksEnabled = true;
  } catch (_) { /* indispo — garde le défaut */ }
  _updateBarksBtn();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', _loadBarksPref);
}

// ── Accessibilité d'affichage (H1, polish UX) ────────────────────────────────
// Échelle de texte des fenêtres (--ui-font-scale) + mode contraste élevé
// (data-contrast="high"). Préférences device persistées en localStorage
// (comme les barks) — indépendantes des sauvegardes de partie, appliquées dès
// le DOMContentLoaded pour couvrir les écrans de démarrage.
const _UI_FONTSCALE_KEY = 'hogwarts_rpg_ui_font_scale';
const _UI_CONTRAST_KEY  = 'hogwarts_rpg_ui_contrast';
const _UI_FONTSCALE_VALUES = { small: 0.9, normal: 1, large: 1.12 };

// Applique un cran d'échelle ('small'|'normal'|'large') et le persiste.
function setUiFontScale(step) {
  if (!_UI_FONTSCALE_VALUES[step]) step = 'normal';
  try { document.documentElement.style.setProperty('--ui-font-scale', String(_UI_FONTSCALE_VALUES[step])); } catch (_) { /* indispo */ }
  try { localStorage.setItem(_UI_FONTSCALE_KEY, step); } catch (_) { /* indispo */ }
  _updateUiAccessibilityBtns();
}

// Bascule le mode contraste élevé et le persiste.
function toggleHighContrast() {
  const root = document.documentElement;
  const on = root.getAttribute('data-contrast') === 'high';
  if (on) root.removeAttribute('data-contrast');
  else root.setAttribute('data-contrast', 'high');
  try { localStorage.setItem(_UI_CONTRAST_KEY, on ? '0' : '1'); } catch (_) { /* indispo */ }
  if (typeof addMsg === 'function') {
    addMsg(on ? 'Contraste élevé désactivé.' : '🔆 Contraste élevé activé.', on ? '' : 'good');
  }
  _updateUiAccessibilityBtns();
}

// Reflète l'état courant sur les boutons de la section Affichage (surbrillance
// du cran actif, aria-pressed du contraste). Défensif : no-op si modale absente.
function _updateUiAccessibilityBtns() {
  let step = 'normal';
  try { step = localStorage.getItem(_UI_FONTSCALE_KEY) || 'normal'; } catch (_) { /* défaut */ }
  if (!_UI_FONTSCALE_VALUES[step]) step = 'normal';
  ['small', 'normal', 'large'].forEach(s => {
    const btn = document.getElementById('btn-fontscale-' + s);
    if (!btn) return;
    const active = s === step;
    btn.classList.toggle('active-toggle', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  const cbtn = document.getElementById('btn-contrast');
  if (cbtn) {
    const on = document.documentElement.getAttribute('data-contrast') === 'high';
    cbtn.classList.toggle('active-toggle', on);
    cbtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

// Restaure les préférences d'affichage au chargement. Appelé au DOMContentLoaded.
function _loadUiAccessibilityPrefs() {
  let step = 'normal', contrast = false;
  try { step = localStorage.getItem(_UI_FONTSCALE_KEY) || 'normal'; } catch (_) { /* défaut */ }
  try { contrast = localStorage.getItem(_UI_CONTRAST_KEY) === '1'; } catch (_) { /* défaut */ }
  if (!_UI_FONTSCALE_VALUES[step]) step = 'normal';
  try { document.documentElement.style.setProperty('--ui-font-scale', String(_UI_FONTSCALE_VALUES[step])); } catch (_) { /* indispo */ }
  if (contrast) document.documentElement.setAttribute('data-contrast', 'high');
  _updateUiAccessibilityBtns();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', _loadUiAccessibilityPrefs);
}

// Ouvre la modale Réglages (son, voyageur, partie). Resynchronise au
// passage les icônes des boutons audio + accueil pour refléter l'état
// courant (utile après un chargement de save).
function openSettingsModal() {
  if (typeof AudioSystem !== 'undefined' && AudioSystem.refreshButtons) {
    AudioSystem.refreshButtons();
  }
  _updateVisitsBtn();
  _updateBarksBtn();
  _updateUiAccessibilityBtns();
  if (typeof kbRenderSettings === 'function') kbRenderSettings();
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'flex';
}

function changeDifficulty() {
  // Mode Ironman : la difficulté est verrouillée pour toute la partie.
  if (typeof ironmanMode !== 'undefined' && ironmanMode) {
    if (typeof addMsg === 'function') {
      addMsg("Difficulté verrouillée — mode Ironman.", 'bad');
    }
    return;
  }
  const detail = document.getElementById('char-detail');
  if (!detail) return;

  const levels = ['Facile', 'Normal', 'Difficile', 'Expert'];
  const icons  = { Facile:'🟢', Normal:'🟡', Difficile:'🟠', Expert:'🔴' };
  const descs  = {
    Facile:    'Moins d\'ennemis, plus de ressources',
    Normal:    'Difficulté de référence',
    Difficile: 'Plus d\'ennemis, scaling accru',
    Expert:    'Mode survie — très dur'
  };

  const buttons = levels.map(lvl => `
    <button class="cmd-btn" onclick="applyDifficulty('${lvl}')"
      style="width:100%;margin-bottom:6px;
             ${lvl === difficulty ? 'border-color:var(--gold);color:var(--gold-light)' : ''}">
      ${icons[lvl]} ${lvl}
      <span style="font-size:10px;color:#8a7050;display:block;margin-top:2px">${descs[lvl]}</span>
    </button>`).join('');

  detail.innerHTML = `
    <div style="font-size:11px;color:#8a7050;text-align:center;margin-bottom:14px">
      Actuelle : <strong style="color:var(--gold)">${icons[difficulty]} ${difficulty}</strong>
    </div>
    <div>${buttons}</div>
    <div style="font-size:10px;color:#4a3a20;text-align:center;margin-top:10px;font-style:italic">
      Le changement s'applique immédiatement (sauf HP de départ)
    </div>`;
  if (typeof setCharacterModalTitle === 'function')
    setCharacterModalTitle('img/icons/gear.png', 'Difficulté');
  document.getElementById('character-modal').style.display = 'flex';
}

window.applyDifficulty = function(lvl) {
  if (!DIFFICULTY_SETTINGS[lvl]) return;
  difficulty = lvl;
  const icons = { Facile:'🟢', Normal:'🟡', Difficile:'🟠', Expert:'🔴' };
  addMsg(`${icons[lvl]} Difficulté : ${lvl}`, lvl === 'Expert' ? 'bad' : 'magic');
  closeModal('character-modal');
};


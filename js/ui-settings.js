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

// Ouvre la modale Réglages (son, voyageur, partie). Resynchronise au
// passage les icônes des boutons audio + accueil pour refléter l'état
// courant (utile après un chargement de save).
function openSettingsModal() {
  if (typeof AudioSystem !== 'undefined' && AudioSystem.refreshButtons) {
    AudioSystem.refreshButtons();
  }
  _updateVisitsBtn();
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


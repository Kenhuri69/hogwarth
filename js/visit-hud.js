// ============================================================
// MONDES PARALLÈLES — HUD de visite (V1a Phase C.3)
// ============================================================
// Bandeau fixe affiché pendant qu'on visite le monde d'un autre joueur.
// Pose le contexte (pseudo, blason, étage) et expose le bouton de
// sortie volontaire — sans ce dernier, le visiteur serait coincé tant
// que le host ne ferme pas la cheminée.
//
// Surface publique :
//   showVisitHud(opts)   → afficher (appel à l'ouverture)
//   updateVisitHud(opts) → patch incrémental (étage, position)
//   hideVisitHud()       → masquer (sortie / bye reçu)
//
// Cf. .claude/plans/parallel-worlds.md §3.4 / §4.5.
// ============================================================

(function () {
  'use strict';

  const HUD_ID  = 'visit-hud';
  const NAME_ID = 'visit-hud-name';
  const META_ID = 'visit-hud-meta';
  const EXIT_ID = 'visit-hud-exit';

  const HOUSE_CREST = {
    Gryffondor:  '🦁',
    Serpentard:  '🐍',
    Serdaigle:   '🦅',
    Poufsouffle: '🦡'
  };

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showVisitHud(opts) {
    const o = opts || {};
    const hud = document.getElementById(HUD_ID);
    if (!hud) return false;
    const nameEl = document.getElementById(NAME_ID);
    const metaEl = document.getElementById(META_ID);
    if (nameEl) {
      const crest = HOUSE_CREST[o.hostHouse] || '🌀';
      nameEl.innerHTML = `${crest} <span class="visit-hud-host">${_esc(o.hostName || 'Sorcier')}</span>`;
    }
    if (metaEl) {
      const parts = [];
      if (o.hostHouse) parts.push(_esc(o.hostHouse));
      if (typeof o.floor === 'number') parts.push(`Étage ${o.floor}`);
      metaEl.textContent = parts.join(' · ');
    }
    hud.classList.add('active');
    hud.setAttribute('aria-hidden', 'false');
    return true;
  }

  function updateVisitHud(opts) {
    const hud = document.getElementById(HUD_ID);
    if (!hud || !hud.classList.contains('active')) return false;
    return showVisitHud(opts);
  }

  function hideVisitHud() {
    const hud = document.getElementById(HUD_ID);
    if (!hud) return false;
    hud.classList.remove('active');
    hud.setAttribute('aria-hidden', 'true');
    return true;
  }

  // Handler du bouton de sortie. Délègue à mpExitVisit qui s'occupe de
  // poster le 'bye', stopper le poll, et restaurer la save d'origine.
  async function _visitHudExit() {
    if (typeof window === 'undefined') return;
    if (typeof window.mpExitVisit !== 'function') return;
    try { await window.mpExitVisit('voluntary'); } catch (e) { /* tolérant */ }
  }

  if (typeof window !== 'undefined') {
    window.showVisitHud   = showVisitHud;
    window.updateVisitHud = updateVisitHud;
    window.hideVisitHud   = hideVisitHud;
    window._visitHudExit  = _visitHudExit;
  }
})();

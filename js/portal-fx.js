// ============================================================
// PORTAL-FX — Animation Cheminette Inter-Mondes (V1a Phase A)
// ============================================================
// Sort de portail vers le donjon d'un autre joueur (parallel-worlds.md
// §4). Phase A = animation locale purement visuelle, sans réseau ;
// les phases suivantes brancheront snapshot Supabase + rendu distant
// après `playPortalOpen`.
//
// Surface publique :
//   playPortalOpen({caster, hostName?}, callback)  → 2,8 s, chaîne A→D
//   playPortalClose({caster}, callback)            → 1,5 s, motion blur inverse
//
// Phases (durées en ms) :
//   A  0–700    Incantation : rune dorée + halo au sol
//   B  700–1500 Déchirure : fissure verticale flamme verte
//   C  1500–2300 Passage : motion blur + zoom + assombrissement
//   D  2300–2800 Arrivée : bannière + fade out
//
// Palette : flammes vertes Cheminette (#3cdc5a) + or chaud (#d8b647).
// Tout en CSS keyframes — pas de requestAnimationFrame, aligné sur
// `#tier-transition-overlay` (movement.js).
// ============================================================

(function () {
  const LAYER_ID = 'portal-fx-layer';

  function _layer() {
    let el = document.getElementById(LAYER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = LAYER_ID;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function _clear() {
    const el = _layer();
    el.innerHTML = '';
    el.className = '';
  }

  function _setPhase(name) {
    const el = _layer();
    el.className = 'active phase-' + name;
    return el;
  }

  function _phaseA(done) {
    const el = _setPhase('a');
    el.innerHTML = `
      <div class="portal-fx-rune"></div>
      <div class="portal-fx-halo"></div>
    `;
    setTimeout(done, 700);
  }

  function _phaseB(done) {
    const el = _setPhase('b');
    el.innerHTML = `
      <div class="portal-fx-rune"></div>
      <div class="portal-fx-halo"></div>
      <div class="portal-fx-fissure"></div>
    `;
    setTimeout(done, 800);
  }

  function _phaseC(done) {
    const el = _setPhase('c');
    el.innerHTML = `<div class="portal-fx-fissure portal-fx-fissure-engulf"></div>`;
    setTimeout(done, 800);
  }

  function _phaseD(hostName, done) {
    const el = _setPhase('d');
    const label = hostName
      ? `Tu apparais dans le monde de ${hostName}`
      : "Les flammes vertes s'évanouissent…";
    el.innerHTML = `
      <div class="portal-fx-fissure portal-fx-fissure-engulf"></div>
      <div class="portal-fx-banner">${label}</div>
    `;
    setTimeout(() => { _clear(); done(); }, 500);
  }

  function playPortalOpen(opts, callback) {
    opts = opts || {};
    const cb = (typeof callback === 'function') ? callback : function () {};
    _phaseA(() => _phaseB(() => _phaseC(() => _phaseD(opts.hostName || '', cb))));
  }

  function playPortalClose(opts, callback) {
    const cb = (typeof callback === 'function') ? callback : function () {};
    const el = _setPhase('close');
    el.innerHTML = `<div class="portal-fx-fissure portal-fx-fissure-close"></div>`;
    setTimeout(() => { _clear(); cb(); }, 1500);
  }

  window.playPortalOpen  = playPortalOpen;
  window.playPortalClose = playPortalClose;
})();

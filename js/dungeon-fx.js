// ============================================================
// DUNGEON FX — Immersion visuelle de l'exploration (Lot 2)
// ============================================================
// Surcouche d'agrément PURE (visuelle) du donjon, exposée sur
// window.DungeonFX. Aucune mécanique de jeu n'est touchée.
//
//   _dungeonFxPhase                  → horloge (s) lue par drawTorch / mist
//   startDungeonFxLoop()             → boucle de redraw ambiant (~11 FPS)
//   DungeonFX.shakeView(intensity)   → secousse de la vue 3D (pièges)
//   drawDepthsMist(cx, cy, scale)    → brume dérivante (tranche Profondeurs)
//
// Tous les call-sites sont défensifs (window.DFX_safe, calqué sur CFX_safe).
// Respecte prefers-reduced-motion : la boucle d'animation ne démarre pas
// (torches statiques, pas de brume animée, pas de secousse).

// Phase d'animation partagée (incrémentée par la boucle, lue par drawTorch
// et drawDepthsMist via un garde `typeof`). 0 par défaut → rendu statique
// identique à l'historique tant que la boucle n'a pas tourné.
let _dungeonFxPhase = 0;
let _dungeonFxTimer = null;

(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Vrai si la scène 3D doit être animée maintenant : un donjon existe, on
  // n'est pas en combat, aucun overlay ne couvre la vue, et l'onglet est
  // visible. Même esprit de blocage que le swipe canvas.
  function _overlayCovering() {
    // Overlays affichés via display (flex/block).
    for (const id of ['encounter-overlay', 'explore-overlay', 'npc-dialog-overlay']) {
      const el = document.getElementById(id);
      if (el && getComputedStyle(el).display !== 'none') return true;
    }
    // Overlays de transition affichés via la classe .active.
    for (const id of ['floor-transition', 'tier-transition-overlay']) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('active')) return true;
    }
    return false;
  }
  function _fxDrawable() {
    if (typeof dungeon === 'undefined' || !dungeon) return false;
    if (typeof inBattle !== 'undefined' && inBattle) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    return !_overlayCovering();
  }

  // Boucle de redraw ambiant. ~90 ms (≈ 11 FPS) : assez pour un vacillement
  // de torche crédible, négligeable pour une scène canvas 2D simple.
  // Idempotente. Sous reduced-motion : ne démarre pas (torches statiques).
  function startDungeonFxLoop() {
    if (_dungeonFxTimer) return;
    if (prefersReducedMotion()) return;
    _dungeonFxTimer = setInterval(() => {
      if (!_fxDrawable()) return;
      _dungeonFxPhase = performance.now() / 1000;
      if (typeof drawDungeon === 'function') drawDungeon();
    }, 90);
  }

  // Secousse de la vue 3D (piège déclenché). Classe CSS sur le canvas,
  // retirée après l'animation. No-op sous reduced-motion.
  let _shakeTimer = null;
  function shakeView(intensity) {
    if (prefersReducedMotion()) return;
    const cv = document.getElementById('dungeon-canvas');
    if (!cv) return;
    const cls = intensity === 'heavy' ? 'dfx-shake-heavy' : 'dfx-shake-light';
    cv.classList.remove('dfx-shake-light', 'dfx-shake-heavy');
    void cv.offsetWidth; // reflow → permet de rejouer l'animation
    cv.classList.add(cls);
    clearTimeout(_shakeTimer);
    _shakeTimer = setTimeout(() => cv.classList.remove(cls), 450);
  }

  window.DungeonFX = { startDungeonFxLoop, shakeView };
  // Exposé aussi en global nu pour les call-sites existants (main.js / save.js).
  window.startDungeonFxLoop = startDungeonFxLoop;
})();

// ── Brume de profondeur (tranche « depths », étages 7+) ─────────
// Voile translucide de nappes dérivantes peint par-dessus la scène, juste
// avant le cadre de premier plan. Pur : ne lit que le contexte canvas
// (ctx/canvas de renderer.js) et la phase d'animation. No-op hors depths.
function drawDepthsMist(cx, cy, scale) {
  if (typeof getFloorTheme !== 'function' || typeof currentFloor === 'undefined') return;
  const theme = getFloorTheme(currentFloor);
  if (!theme || theme.ambient !== 'depths') return;
  if (typeof ctx === 'undefined' || typeof canvas === 'undefined') return;

  const phase = (typeof _dungeonFxPhase !== 'undefined') ? _dungeonFxPhase : 0;
  const W = canvas.width, H = canvas.height;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // 3 nappes de brume bleutée-froide qui dérivent latéralement et ondulent.
  for (let i = 0; i < 3; i++) {
    const speed = 12 + i * 7;                       // px/s
    const drift = ((phase * speed) % (W + 240)) - 120;
    const my    = H * (0.46 + i * 0.14) + Math.sin(phase * 0.6 + i) * 10;
    const r     = scale * (0.9 + i * 0.25);
    const a     = 0.05 + i * 0.012;                 // très discret
    const g = ctx.createRadialGradient(drift, my, 0, drift, my, r);
    g.addColorStop(0,   `rgba(120,150,180,${a})`);
    g.addColorStop(0.6, `rgba(70,90,120,${a * 0.5})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(drift, my, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Helper défensif (calqué sur CFX_safe) : DFX_safe.foo(...) appelle
// window.DungeonFX.foo si présent, sinon no-op silencieux.
if (typeof window.DFX_safe === 'undefined') {
  window.DFX_safe = new Proxy({}, {
    get(_t, prop) {
      return (typeof window.DungeonFX !== 'undefined' && window.DungeonFX
              && typeof window.DungeonFX[prop] === 'function')
        ? window.DungeonFX[prop].bind(window.DungeonFX)
        : () => undefined;
    }
  });
}

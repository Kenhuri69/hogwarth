// ============================================================
// CINEMATICS — Immersion narrative intro / victoire (Lot 3)
// ============================================================
// Surcouche d'agrément PURE (visuelle), exposée sur window.Cinematics.
// Aucune mécanique de jeu n'est touchée : ce module ne fait que peindre
// un champ de particules (motes de lumière) par-dessus deux écrans
// narratifs, derrière leur carte de contenu.
//
//   Cinematics.introAmbiance(enable)  → bougies flottantes derrière l'intro
//   Cinematics.victoryFlourish()      → halo + pluie d'or sur la victoire
//   Cinematics.stop()                 → coupe la boucle, démonte le canvas
//
// Tous les call-sites sont défensifs (window.CIN_safe, calqué sur CFX_safe /
// DFX_safe). Respecte prefers-reduced-motion : aucune particule, aucune
// boucle — les écrans gardent leurs animations de base (révélation du
// portrait, victoryAnim) qui sont légères.

(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Presets de champ de particules ───────────────────────────
  // intro   : motes ambrées chaudes (bougies de la Grande Salle).
  // victory : motes or-blanc plus vives + halo central qui respire.
  const PRESETS = {
    intro:   { count: 34, rise: 14, sway: 16, rMin: 1.2, rMax: 3.4,
               color: [255, 198, 110], bloom: 0 },
    victory: { count: 52, rise: 26, sway: 20, rMin: 1.4, rMax: 4.2,
               color: [255, 234, 168], bloom: 1 }
  };

  // ── État de la cinématique active (une seule à la fois) ──────
  let _host    = null;   // élément hôte (#intro-screen / #victory-modal)
  let _canvas  = null;
  let _cx      = null;
  let _spec    = null;   // preset courant
  let _motes   = [];
  let _raf      = 0;
  let _lastT    = 0;
  let _resizeFn = null;

  function _sizeCanvas() {
    if (!_canvas || !_host) return;
    const r = _host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    _canvas.width  = Math.max(1, Math.round(r.width  * dpr));
    _canvas.height = Math.max(1, Math.round(r.height * dpr));
    _canvas.style.width  = r.width  + 'px';
    _canvas.style.height = r.height + 'px';
    if (_cx) _cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function _hostW() { return _host ? _host.getBoundingClientRect().width  : 0; }
  function _hostH() { return _host ? _host.getBoundingClientRect().height : 0; }

  function _spawnMote(reset) {
    const W = _hostW(), H = _hostH();
    // À l'init (reset=true) on répartit verticalement ; sinon on (re)naît
    // sous le bas de l'écran pour remonter.
    return {
      x: Math.random() * W,
      y: reset ? Math.random() * H : H + Math.random() * 40,
      r: _spec.rMin + Math.random() * (_spec.rMax - _spec.rMin),
      vy: _spec.rise * (0.6 + Math.random() * 0.8),
      phase: Math.random() * Math.PI * 2,
      swayHz: 0.3 + Math.random() * 0.5,
      twHz: 0.8 + Math.random() * 1.2,
      a: 0.3 + Math.random() * 0.5
    };
  }

  function _initMotes() {
    _motes = [];
    for (let i = 0; i < _spec.count; i++) _motes.push(_spawnMote(true));
  }

  function _draw(t) {
    if (!_cx || !_host) return;
    const W = _hostW(), H = _hostH();
    const dt = _lastT ? Math.min(0.05, (t - _lastT) / 1000) : 0.016;
    _lastT = t;

    _cx.clearRect(0, 0, W, H);

    // Halo central qui respire (victoire seulement) : bloom doré derrière
    // la carte, blend additif très discret.
    if (_spec.bloom) {
      const breathe = 0.10 + 0.05 * Math.sin(t / 1000 * 1.1);
      const [r, g, b] = _spec.color;
      const grad = _cx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.42);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${breathe})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${breathe * 0.35})`);
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      _cx.fillStyle = grad;
      _cx.fillRect(0, 0, W, H);
    }

    _cx.globalCompositeOperation = 'lighter';
    const [cr, cg, cb] = _spec.color;
    for (const m of _motes) {
      m.y -= m.vy * dt;
      m.phase += m.swayHz * dt;
      m.x += Math.sin(m.phase) * _spec.sway * dt;
      // Scintillement doux de l'alpha.
      const tw = 0.55 + 0.45 * Math.sin(t / 1000 * m.twHz + m.phase);
      const alpha = m.a * tw;

      const grad = _cx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
      grad.addColorStop(0,   `rgba(${cr},${cg},${cb},${alpha})`);
      grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},${alpha * 0.45})`);
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      _cx.fillStyle = grad;
      _cx.beginPath();
      _cx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
      _cx.fill();

      // Recyclage : sortie par le haut → renaît sous le bas.
      if (m.y < -m.r * 4) Object.assign(m, _spawnMote(false));
    }
    _cx.globalCompositeOperation = 'source-over';
  }

  function _loop(t) {
    // Auto-arrêt si l'hôte n'est plus affiché (écran fermé sans appel stop).
    if (!_host || getComputedStyle(_host).display === 'none') { stop(); return; }
    if (!document.hidden) _draw(t);
    _raf = requestAnimationFrame(_loop);
  }

  // Monte le canvas de particules dans `host` et démarre la boucle avec le
  // preset demandé. Idempotent : un nouvel appel remplace la cinématique
  // courante (utile intro → victoire).
  function _start(host, presetKey) {
    if (prefersReducedMotion()) return;
    if (!host) return;
    stop();
    _spec = PRESETS[presetKey] || PRESETS.intro;
    _host = host;

    _canvas = document.createElement('canvas');
    _canvas.className = 'cin-canvas';
    // Premier enfant → peint derrière la carte de contenu (z-index CSS).
    host.insertBefore(_canvas, host.firstChild);
    _cx = _canvas.getContext('2d');

    _sizeCanvas();
    _initMotes();

    _resizeFn = () => _sizeCanvas();
    window.addEventListener('resize', _resizeFn);

    _lastT = 0;
    _raf = requestAnimationFrame(_loop);
  }

  function stop() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
    if (_resizeFn) { window.removeEventListener('resize', _resizeFn); _resizeFn = null; }
    if (_canvas && _canvas.parentNode) _canvas.parentNode.removeChild(_canvas);
    _canvas = _cx = _host = _spec = null;
    _motes = [];
    _lastT = 0;
  }

  function introAmbiance(enable) {
    if (enable) _start(document.getElementById('intro-screen'), 'intro');
    else stop();
  }

  function victoryFlourish() {
    _start(document.getElementById('victory-modal'), 'victory');
  }

  window.Cinematics = { introAmbiance, victoryFlourish, stop };
})();

// Helper défensif (calqué sur CFX_safe / DFX_safe) : CIN_safe.foo(...)
// appelle window.Cinematics.foo si présent, sinon no-op silencieux.
if (typeof window.CIN_safe === 'undefined') {
  window.CIN_safe = new Proxy({}, {
    get(_t, prop) {
      return (typeof window.Cinematics !== 'undefined' && window.Cinematics
              && typeof window.Cinematics[prop] === 'function')
        ? window.Cinematics[prop].bind(window.Cinematics)
        : () => undefined;
    }
  });
}

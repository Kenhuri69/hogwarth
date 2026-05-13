// ============================================================
// SWIPE GESTURES SUR LE CANVAS PSEUDO-3D
// ------------------------------------------------------------
// Mobile : sur la vue 3D, un swipe vertical déplace (avant /
// arrière) et un swipe horizontal pivote (gauche / droite).
// Le D-pad tactile reste affiché en fallback (cf. CLAUDE.md
// section « Contrôles de déplacement »).
// ============================================================

(function () {
  const SWIPE_THRESHOLD_PX = 30;

  // Si un overlay couvre la vue, on laisse l'overlay capter le geste.
  // `inBattle` est déjà testé par les helpers de movement.js, mais on
  // l'utilise aussi ici pour éviter de consommer un swipe pendant un
  // combat (où l'utilisateur pourrait vouloir interagir avec l'UI de
  // combat même si elle ne couvre pas tout l'écran sur tablette).
  function _swipeBlocked() {
    if (typeof inBattle !== 'undefined' && inBattle) return true;
    const overlayIds = [
      'encounter-overlay',
      'explore-overlay',
      'npc-dialog-overlay',
      'floor-transition'
    ];
    for (const id of overlayIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const disp = el.style.display;
      if (disp && disp !== 'none') return true;
    }
    return false;
  }

  function _dispatchSwipe(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        if (typeof turnLeft === 'function') turnLeft();
      } else {
        if (typeof turnRight === 'function') turnRight();
      }
    } else {
      if (dy < 0) {
        if (typeof moveForward === 'function') moveForward();
      } else {
        if (typeof moveBackward === 'function') moveBackward();
      }
    }
  }

  function initCanvasSwipeGestures() {
    const canvas = document.getElementById('dungeon-canvas');
    if (!canvas) return;
    if (canvas.dataset.swipeBound === '1') return;
    canvas.dataset.swipeBound = '1';

    let startX = 0, startY = 0, tracking = false;

    canvas.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) { tracking = false; return; }
      if (_swipeBlocked()) { tracking = false; return; }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      if (!e.touches || e.touches.length !== 1) { tracking = false; }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      if (_swipeBlocked()) return;
      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX
          && Math.abs(dy) < SWIPE_THRESHOLD_PX) return;
      _dispatchSwipe(dx, dy);
    }, { passive: true });

    canvas.addEventListener('touchcancel', () => {
      tracking = false;
    }, { passive: true });
  }

  // Exposé pour le loader + tests (smoke peut appeler directement
  // _dispatchSwipe pour vérifier le mapping sans simuler les TouchEvents).
  window.initCanvasSwipeGestures = initCanvasSwipeGestures;
  window._dispatchCanvasSwipe    = _dispatchSwipe;
  window._isCanvasSwipeBlocked   = _swipeBlocked;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCanvasSwipeGestures);
  } else {
    initCanvasSwipeGestures();
  }
})();

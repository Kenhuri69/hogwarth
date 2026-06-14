// ============================================================
// modal-isolation.js — Isolation sémantique et clavier des modales.
//
// Objectif : rendre toutes les modales accessibles au clavier et isolées
// du fond, SANS toucher au flux souris/tactile et SANS modifier les ~16
// fonctions d'ouverture (chacune a sa propre fonction, pas d'ouverture
// unique). On observe donc la bascule display:none↔flex de chaque modale
// enregistrée via un MutationObserver — mécanisme central robuste :
//   - le callback s'exécute en microtâche APRÈS le travail synchrone de la
//     fonction d'ouverture (display posé + contenu rendu), donc la liste des
//     focusables est complète au moment de poser le focus initial ;
//   - aucun call-site n'est modifié → robuste aux ajouts futurs de modale.
//
// À l'ouverture : mémorise document.activeElement, met le fond en `inert`,
// pose le focus initial (1er champ/contrôle, hors croix de fermeture).
// Tab/Shift+Tab cyclent dans la modale (focus-trap). À la fermeture : retire
// `inert` (quand plus aucune modale n'est ouverte) et restitue le focus au
// déclencheur. Modèle : confirmModal() (ui.js), exclu ici car il gère déjà
// son propre focus.
// ============================================================
(function () {
  'use strict';

  // Modales gérées. #confirm-modal est EXCLUE (focus géré par confirmModal /
  // _closeConfirmModal, ui.js — Phase 3).
  const MODAL_IDS = [
    'inventory-modal', 'spell-modal', 'shop-modal', 'character-modal',
    'bestiary-modal', 'codex-modal', 'house-detail-modal', 'house-donation-modal',
    'wizard-codex-modal', 'slot-modal', 'settings-modal', 'forge-modal',
    'library-modal', 'brewing-modal', 'fusion-modal', 'riddle-modal'
  ];

  // Fond neutralisé (inert) tant qu'au moins une modale est ouverte. Les
  // modales elles-mêmes sont des frères de #game-container (jamais inertes).
  const BACKGROUND_IDS = [
    'game-container', 'title-screen', 'start-hub-screen',
    'player-select-screen', 'house-select-screen', 'intro-screen'
  ];

  const FOCUSABLE_SEL = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  // Pile des modales ouvertes : [{ el, prevFocus }]. Le sommet capte le
  // focus-trap ; le fond est inert tant que la pile est non vide.
  const _stack = [];
  const _shown = new Map(); // id → dernier état de visibilité connu

  function _isShown(el) {
    return !!el && window.getComputedStyle(el).display !== 'none';
  }

  function _visible(el) {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  function _focusable(modal) {
    return Array.from(modal.querySelectorAll(FOCUSABLE_SEL)).filter(_visible);
  }

  function _setBackgroundInert(on) {
    BACKGROUND_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  // Cible du focus initial : champ de recherche/filtre s'il existe, sinon
  // 1er contrôle réel (en évitant la croix ✕ de fermeture), sinon la modale.
  function _initialTarget(modal) {
    const search = modal.querySelector('input[type="search"], input[type="text"], input:not([type])');
    if (search && _visible(search)) return search;
    const f = _focusable(modal);
    const nonClose = f.filter((el) => !el.classList.contains('modal-close'));
    return nonClose[0] || f[0] || modal;
  }

  function _enter(el) {
    const prevFocus = (document.activeElement instanceof HTMLElement) ? document.activeElement : null;
    _stack.push({ el, prevFocus });
    _setBackgroundInert(true);
    // La modale doit être focusable en repli (contenu sans focusable).
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    const target = _initialTarget(el);
    try { target.focus(); } catch (_) { /* noop */ }
  }

  function _exit(el) {
    const idx = _stack.findIndex((s) => s.el === el);
    if (idx === -1) return;
    const wasTop = idx === _stack.length - 1;
    const entry = _stack[idx];
    _stack.splice(idx, 1);
    if (!_stack.length) _setBackgroundInert(false);
    // Restitue le focus au déclencheur uniquement si on ferme la modale du
    // sommet (sinon on perturberait la modale encore active au-dessus).
    if (wasTop && entry.prevFocus && typeof entry.prevFocus.focus === 'function'
        && document.contains(entry.prevFocus)) {
      try { entry.prevFocus.focus(); } catch (_) { /* noop */ }
    }
  }

  function _check(id) {
    const el = document.getElementById(id);
    const now = _isShown(el);
    const was = _shown.get(id) || false;
    if (now === was) return;
    _shown.set(id, now);
    if (now) _enter(el); else _exit(el);
  }

  // Focus-trap : Tab/Shift+Tab restent dans la modale du sommet. En capture
  // pour précéder les autres handlers ; ne gère QUE Tab (ne touche pas Échap
  // ni les raccourcis combat de main.js).
  function _onKeydown(e) {
    if (e.key !== 'Tab' || !_stack.length) return;
    const top = _stack[_stack.length - 1].el;
    const f = _focusable(top);
    if (!f.length) { e.preventDefault(); try { top.focus(); } catch (_) {} return; }
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement;
    const inside = top.contains(active);
    if (e.shiftKey) {
      if (active === first || !inside) { e.preventDefault(); last.focus(); }
    } else {
      if (active === last || !inside) { e.preventDefault(); first.focus(); }
    }
  }

  function _init() {
    const observer = new MutationObserver((mutations) => {
      const seen = new Set();
      for (const m of mutations) {
        const id = m.target && m.target.id;
        if (id && !seen.has(id) && MODAL_IDS.indexOf(id) !== -1) {
          seen.add(id);
          _check(id);
        }
      }
    });
    MODAL_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      _shown.set(id, _isShown(el));
      observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    });
    document.addEventListener('keydown', _onKeydown, true);
    // Surface de debug/inspection (consommée par le smoke test).
    window.__modalIsolation = {
      stack: _stack,
      isActive: () => _stack.length > 0,
      topId: () => (_stack.length ? _stack[_stack.length - 1].el.id : null)
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();

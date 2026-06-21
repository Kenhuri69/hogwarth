// ============================================================
// ISOLATION DE MODALE — focus-trap générique + inert sur le fond
// ============================================================
// Passe « isolation de modale » (plan .claude/plans/modal-isolation.md).
//
// Il n'existe pas de fonction d'ouverture unique : chaque modale a sa propre
// fonction et toutes basculent `el.style.display` entre 'none' et 'flex'.
// Plutôt que de modifier ~16 call-sites (fragile), ce module OBSERVE les
// transitions de visibilité via un MutationObserver et applique, de façon
// centralisée et défensive :
//   • focus initial dans la modale à l'ouverture (mémorise le déclencheur) ;
//   • piège Tab/Shift+Tab dans la modale du sommet de pile ;
//   • `inert` sur le fond (#game-container + écrans de démarrage) ;
//   • restitution du focus au déclencheur à la fermeture.
//
// Le tout est purement additif : aucun flux souris/tactile existant n'est
// modifié. Une modale absente du DOM est simplement ignorée.
//
// `confirm-modal` est VOLONTAIREMENT exclu : il gère déjà son propre focus
// initial + restitution (voir confirmModal() dans ui.js, Phase 3).

(function () {
  'use strict';

  // Registre des modales à isoler (toutes basées sur display:none ↔ flex).
  const MODAL_IDS = [
    'inventory-modal', 'spell-modal', 'shop-modal', 'character-modal',
    'bestiary-modal', 'codex-modal', 'house-detail-modal', 'house-donation-modal',
    'wizard-codex-modal', 'slot-modal', 'settings-modal', 'forge-modal',
    'library-modal', 'brewing-modal', 'fusion-modal', 'riddle-modal',
    'endgame-compass-modal'
  ];

  // Conteneurs de fond à neutraliser (`inert`) tant qu'une modale est ouverte.
  // Les 16 modales sont toutes hors de ces conteneurs (vérifié dans le DOM),
  // donc les rendre `inert` ne touche jamais la modale active.
  const BACKGROUND_IDS = [
    'game-container', 'title-screen', 'start-hub-screen',
    'house-select-screen', 'player-select-screen', 'intro-screen'
  ];

  const FOCUSABLE_SELECTOR = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  // Pile des modales ouvertes : [{ el, prevFocus }]. Gère un éventuel
  // empilement (rare) ; la modale du sommet capte le focus et le trap Tab.
  const stack = [];
  // Suivi de l'état d'ouverture par élément (évite les faux positifs quand
  // une mutation de style ne change pas la visibilité réelle).
  const openState = new WeakMap();

  function isVisible(el) {
    return !!el && el.getClientRects().length > 0;
  }

  function focusableWithin(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => el.getClientRects().length > 0 && !el.hasAttribute('disabled'));
  }

  // Cible du focus initial : un champ de saisie (recherche) en priorité,
  // sinon le 1er contrôle qui n'est pas la croix de fermeture, sinon la
  // croix, sinon la boîte elle-même.
  function initialFocusTarget(modal) {
    const items = focusableWithin(modal);
    const field = items.find(el => el.matches('input,select,textarea'));
    if (field) return field;
    const notClose = items.find(el => !el.classList.contains('modal-close'));
    if (notClose) return notClose;
    return items[0] || modal;
  }

  function setBackgroundInert(on) {
    BACKGROUND_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  function onModalOpen(modal) {
    if (stack.some(entry => entry.el === modal)) return;
    const prevFocus = (document.activeElement instanceof HTMLElement)
      ? document.activeElement : null;
    stack.push({ el: modal, prevFocus });
    if (stack.length === 1) setBackgroundInert(true);
    const target = initialFocusTarget(modal);
    try { target.focus(); } catch (_) { /* défensif */ }
  }

  function onModalClose(modal) {
    const idx = stack.findIndex(entry => entry.el === modal);
    if (idx === -1) return;
    const [entry] = stack.splice(idx, 1);
    if (stack.length === 0) setBackgroundInert(false);
    // Ne restitue le focus que si la modale fermée était au sommet (sinon une
    // modale toujours ouverte garde la main).
    const wasTop = idx === stack.length; // après splice, sommet = length-1
    if (wasTop && entry.prevFocus && document.body.contains(entry.prevFocus)
        && typeof entry.prevFocus.focus === 'function') {
      try { entry.prevFocus.focus(); } catch (_) { /* défensif */ }
    }
  }

  // Trap Tab : maintient le focus dans la modale du sommet de pile. En phase
  // capture pour primer sur tout autre handler, indépendant de `inert`.
  function onKeydown(e) {
    if (e.key !== 'Tab' || stack.length === 0) return;
    const top = stack[stack.length - 1].el;
    if (!isVisible(top)) return;
    const items = focusableWithin(top);
    if (items.length === 0) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const inside = top.contains(active);
    if (e.shiftKey) {
      if (!inside || active === first) { last.focus(); e.preventDefault(); }
    } else {
      if (!inside || active === last) { first.focus(); e.preventDefault(); }
    }
  }

  function handleMutation(modal) {
    const visible = isVisible(modal);
    const wasOpen = openState.get(modal) === true;
    if (visible === wasOpen) return;
    openState.set(modal, visible);
    if (visible) onModalOpen(modal);
    else onModalClose(modal);
  }

  function init() {
    const observer = new MutationObserver(mutations => {
      // Dédup : une même modale peut recevoir plusieurs mutations dans un lot.
      const seen = new Set();
      for (const m of mutations) {
        const el = m.target;
        if (seen.has(el)) continue;
        seen.add(el);
        handleMutation(el);
      }
    });
    MODAL_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      openState.set(el, isVisible(el));
      observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    });
    document.addEventListener('keydown', onKeydown, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Surface publique minimale (testabilité + introspection).
  window.ModalA11y = {
    isModalOpen: () => stack.length > 0,
    openCount: () => stack.length,
    _ids: MODAL_IDS
  };
})();

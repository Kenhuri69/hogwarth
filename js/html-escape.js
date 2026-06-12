// ============================================================
// HTML-ESCAPE — échappement HTML unifié (chargé tôt)
// ------------------------------------------------------------
// Source de vérité UNIQUE pour neutraliser les données externes
// (pseudos / messages des Mondes Parallèles venus du backend Supabase)
// avant injection en innerHTML. Auparavant dupliqué en 3 `_esc` privés
// divergents (visit-hud.js, atelier-voyageur.js, portal-matchmaking.js) —
// toute divergence est une surface XSS. Ces modules délèguent désormais
// tous à `window.htmlEscape`.
//
// Échappe les 5 caractères dangereux en contexte HTML/attribut :
//   &  <  >  "  '
// null / undefined → chaîne vide (jamais d'exception).
//
// Vérouillé par tests/units.js (test anti-XSS) + au MANIFEST du loader.
// ============================================================

(function () {
  'use strict';

  function htmlEscape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  window.htmlEscape = htmlEscape;
})();

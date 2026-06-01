// ============================================================
// HAPTICS — Retour tactile mobile (Immersion D1)
// ============================================================
// Surcouche d'agrément PURE (haptique) exposée sur window.Haptics.
// Aucune mécanique de jeu n'est touchée : ce module ne fait que déclencher
// de courtes vibrations via navigator.vibrate() aux moments clés du combat.
//
//   Haptics.hit()      → pulse court (coup physique encaissé/porté)
//   Haptics.crit()     → double pulse (coup critique)
//   Haptics.death()    → pulse long (mort du groupe, hors Ironman)
//   Haptics.levelUp()  → motif montant (passage de niveau)
//
// Tous les call-sites sont défensifs (helper window.HAPTICS_safe, calqué
// sur CFX_safe) : si ce module n'a pas chargé, le jeu fonctionne sans
// vibration. Garde-fous internes : navigator.vibrate absent → no-op
// (desktop), prefers-reduced-motion → no-op (la vibration est un
// mouvement ressenti).

(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Déclenche un motif de vibration si l'API existe et que l'utilisateur
  // n'a pas demandé la réduction de mouvement. `pattern` : nombre (ms) ou
  // tableau [vibration, pause, vibration, …] (cf. spec navigator.vibrate).
  function _buzz(pattern) {
    if (!navigator.vibrate) return;        // desktop / API absente → no-op
    if (prefersReducedMotion()) return;    // accessibilité → no-op
    try { navigator.vibrate(pattern); } catch (e) { /* no-op */ }
  }

  function hit()     { _buzz(15); }
  function crit()    { _buzz([12, 30, 28]); }
  function death()   { _buzz(200); }
  function levelUp() { _buzz([20, 40, 20, 40, 40]); }

  window.Haptics = { hit, crit, death, levelUp };
})();

// Helper défensif (calqué sur CFX_safe) : HAPTICS_safe.foo(...) appelle
// window.Haptics.foo si présent, sinon no-op silencieux.
if (typeof window.HAPTICS_safe === 'undefined') {
  window.HAPTICS_safe = new Proxy({}, {
    get(_t, prop) {
      return (typeof window.Haptics !== 'undefined' && window.Haptics
              && typeof window.Haptics[prop] === 'function')
        ? window.Haptics[prop].bind(window.Haptics)
        : () => undefined;
    }
  });
}

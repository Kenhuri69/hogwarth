/* =====================================================================
   PWA — enregistrement du Service Worker + bandeau de mise à jour.

   Le code est défensif : si le navigateur ne supporte pas les SW (vieux
   iOS, mode privé Firefox restreint, etc.), le jeu fonctionne normalement.

   Aucune dépendance, exposé sur window.PWA pour debug console.
   ===================================================================== */

(function () {
  'use strict';

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // En file:// les SW ne sont pas supportés — évite le warning console
  // pour les sessions de smoke test legacy.
  if (location.protocol === 'file:') {
    return;
  }

  const SW_URL = 'sw.js?v=2';
  let updateBanner = null;
  let pendingWorker = null;

  function buildBanner() {
    if (updateBanner) return updateBanner;
    const el = document.createElement('div');
    el.className = 'pwa-update-banner';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<span class="pwa-update-banner__msg">Nouvelle version disponible</span>' +
      '<button type="button" class="pwa-update-banner__btn">Rafraîchir</button>' +
      '<button type="button" class="pwa-update-banner__dismiss" aria-label="Fermer">×</button>';

    el.querySelector('.pwa-update-banner__btn').addEventListener('click', () => {
      if (pendingWorker) {
        skipWaitingRequested = true;
        pendingWorker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
    el.querySelector('.pwa-update-banner__dismiss').addEventListener('click', () => {
      el.classList.remove('visible');
    });

    document.body.appendChild(el);
    updateBanner = el;
    return el;
  }

  function showUpdateBanner(worker) {
    pendingWorker = worker;
    const el = buildBanner();
    // Léger délai pour laisser le DOM se peindre avant la transition.
    requestAnimationFrame(() => el.classList.add('visible'));
  }

  function trackWaiting(reg) {
    if (reg.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner(reg.waiting);
    }

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // Une version est déjà active → la nouvelle attend en `waiting`.
          showUpdateBanner(newWorker);
        }
      });
    });
  }

  let skipWaitingRequested = false;
  let reloadingAfterSkip = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // controllerchange se déclenche dans deux cas :
    //   1. Premier chargement : le SW fraîchement activé adopte la page via
    //      clients.claim() (pas de contrôleur préalable) → AUCUN reload requis.
    //   2. Mise à jour validée par l'utilisateur (bouton Rafraîchir →
    //      skipWaiting) → on recharge pour servir l'index.html à jour.
    // On ne recharge donc que si l'utilisateur a explicitement demandé la MAJ,
    // sinon le reload du cas 1 casse la navigation en cours (et les tests).
    if (!skipWaitingRequested || reloadingAfterSkip) return;
    reloadingAfterSkip = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SW_URL)
      .then((reg) => {
        trackWaiting(reg);
        // Vérifie une mise à jour à chaque retour au premier plan.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });
      })
      .catch(() => {
        // Echec silencieux : la PWA est dégradable.
      });
  });

  // Exposé pour debug console
  window.PWA = {
    unregister() {
      return navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())));
    },
    clearCaches() {
      return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    },
  };
})();

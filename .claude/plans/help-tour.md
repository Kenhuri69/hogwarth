# Plan — Tour guidé d'aide pour novices

## Objectif
Ajouter une fonction d'aide qui présente toutes les fonctions du jeu à un
joueur novice, sous forme de **tour guidé interactif** : surbrillance des
vrais éléments de l'UI + bulle explicative étape par étape.

## Décisions UX (validées avec l'utilisateur)
- Format : tour guidé interactif (spotlight sur les éléments réels).
- Déclenchement automatique : à **chaque** nouvelle partie, sauf si la case
  « Ne plus afficher au démarrage » est cochée (mémorisée en localStorage).
- Capacité d'arrêt : bouton « Passer », croix ✕, touche Échap.
- Relançable à la demande via un bouton « Aide » dans la barre de commandes.

## Étapes d'implémentation

1. `js/help-tour.js` (nouveau module) → verify : globals exposés
   (`startHelpTour`, `maybeAutoStartHelpTour`).
2. `css/help-tour.css` (nouveau) → verify : overlay/spotlight/bulle au thème
   parchemin-or.
3. `index.html` : lien CSS, `<script>` help-tour.js avant loader.js, bouton
   « Aide » dans le groupe système → verify : bouton visible.
4. `js/loader.js` : entrée MANIFEST `startHelpTour` → verify : pas de bandeau
   rouge.
5. `js/main.js` : appel `maybeAutoStartHelpTour()` en fin de `startGame()`
   → verify : tour s'ouvre au démarrage.
6. `tests/smoke.js` : opt-out par défaut dans `launchGame()` (les ~70
   scénarios existants ne doivent pas voir l'overlay) + scénario dédié
   `scenarioHelpTour` → verify : `node tests/smoke.js` vert.

## Suivi
- [x] Étape 1 — module help-tour.js créé (15 étapes de tour).
- [x] Étape 2 — css/help-tour.css créé.
- [x] Étape 3 — index.html câblé (CSS + script + bouton Aide).
- [x] Étape 4 — MANIFEST loader.js mis à jour.
- [x] Étape 5 — maybeAutoStartHelpTour() branché dans startGame().
- [x] Étape 6 — smoke.js : opt-out global + scenarioHelpTour ajouté.

## Écarts constatés
- Le bouton « Aide » utilise un glyphe texte (📖) faute d'icône PNG dédiée ;
  cohérent avec l'absence d'asset, sans casser `scenarioCmdBtnIcons` qui ne
  teste que les boutons existants.
- Isolation clavier : le handler du tour est en phase capture et stoppe la
  propagation de toutes les touches, donc aucun raccourci de `main.js` ne se
  déclenche pendant le tour — pas besoin de modifier `main.js`.

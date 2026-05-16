# Plan — Mini-carte « pixel » dans le coin (mobile)

## Objectif
Afficher une version compacte de la carte (cases colorées, sans légende)
dans le coin haut-droit de la vue 3D, **uniquement en mobile (≤700px)**.
Réutilise le rendu minimap existant. Purement informative
(`pointer-events:none`) — les swipes de déplacement passent à travers.

## Étapes

1. **HTML** — ajouter `<div id="minimap-corner">` dans `.scene-viewport`
   (`index.html`), juste après `#dungeon-canvas`, avant les overlays.
   → vérif : présent dans le DOM, avant `#explore-overlay`.

2. **CSS** — `#minimap-corner` masqué par défaut (desktop), affiché en
   `display:grid` dans le media query `≤700px` : position absolue
   top/right, petit panneau (bordure + fond sombre), `pointer-events:none`.
   Masquer les marqueurs `! / ?` des PNJ (trop gros à cette échelle).
   → vérif : invisible desktop, visible mobile, ne bloque pas les swipes.

3. **JS** — `renderMinimap()` (`renderer-minimap.js`) appelle aussi
   `_buildMinimapCells(#minimap-corner, 6)`.
   → vérif : la carte du coin se met à jour à chaque déplacement.

4. **Test** — `node tests/smoke.js` doit rester vert.
   → vérif : aucune régression.

## Décisions
- Comportement tactile : **purement informative** (`pointer-events:none`).
  L'overlay carte complet (bouton 🗺️, avec légende) reste inchangé.
- Taille de cellule : 6px → grille 12×12 ≈ 94px de côté.

## Suivi
- [x] Étape 1 — HTML
- [x] Étape 2 — CSS
- [x] Étape 3 — JS
- [x] Étape 4 — Test smoke

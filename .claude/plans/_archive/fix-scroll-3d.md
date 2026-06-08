# Fix — scroll de l'écran principal qui redimensionne la vue 3D

## Symptôme
Sur mobile, faire défiler l'écran principal change la taille de la vue 3D
(canvas du donjon). Comparaison des deux captures : barre d'URL visible vs
masquée.

## Cause
- `html, body { overflow-x: hidden }` (style.css:24) ne verrouille que l'axe X.
  `html` reste scrollable verticalement.
- `body { min-height: 100vh }` rend le `<body>` plus haut que le viewport
  visible quand la barre d'URL est affichée → la page devient scrollable.
- Un glissement replie la barre d'URL → `100dvh` change → `#game-container`
  (mobile `height:100dvh`) se redimensionne → `window 'resize'` →
  `resizeCanvas()` → la vue 3D est redessinée à une autre taille.

## Correctif
Verrouiller le scroll du document (root scroller `html`) :
`html, body { overflow: hidden; overscroll-behavior: none }`.
Les écrans de sélection / modales sont des overlays `position:fixed` avec
leur propre `overflow-y:auto` — ils continuent de scroller en interne.

→ vérifier : aucune régression smoke test ; vue 3D stable au glissement.

## Étapes
1. style.css:24 — `overflow-x` → `overflow` + `overscroll-behavior:none`. ✅
2. `node tests/smoke.js` vert. ✅

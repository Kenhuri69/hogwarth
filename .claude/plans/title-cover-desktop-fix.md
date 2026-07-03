# Fix rendu image de garde (desktop)

## Problème
Sur desktop, l'image de garde (`img/scenes/title.jpg`, portrait 1024×1536)
s'affiche comme une colonne étroite très haute : `.castle-art` fixe la
**largeur** (`min(80vw,600px)`) et laisse `height:auto`, donc l'image portrait
atteint ~900px de haut, déborde le viewport, et le titre chevauche le bas.

## Correctif
Plafonner la **hauteur** de l'image (et laisser la largeur suivre le ratio),
afin que l'image + le titre tiennent dans le viewport desktop.
- `.castle-art` : conteneur centreur, ne force plus la largeur.
- `img` : `width/height:auto` + `max-width:min(80vw,600px)` +
  `max-height:min(64vh,620px)`.

## Étapes
1. [x] Éditer `css/style.css` (`.castle-art` + `img`) → image contrainte en hauteur (64vh)
2. [x] Screenshot headless desktop (1440×900) → image 384×576 centrée, plus de chevauchement titre/image
3. [x] Bump cache PWA (v61→v62, CACHE_VERSION v249→v250) → `check_cache_versions.js` OK
4. [x] Tests → `pwa-smoke.js` OK + smoke hub/start OK (changement CSS-only, pas de logique)
5. [ ] Commit + push branche

## Note (hors scope)
Chevauchement **préexistant** en bas de l'écran titre : le texte d'aide
`position:absolute; bottom:48px` (index.html:77) se superpose à
`.press-start` (« CLIQUER POUR COMMENCER »). Indépendant de la taille de
l'image. À traiter séparément si souhaité.

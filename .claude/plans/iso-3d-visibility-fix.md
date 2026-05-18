# Fix — visibilité vue Iso 3D

## Contexte
Deux bugs signalés sur la vue pseudo-3D du couloir :
1. Les sprites PNJ sont tronqués (tête coupée) — surtout visible en mobile.
2. La boutique s'affiche encore en emoji + texte « BOUTIQUE » au lieu d'un
   visuel SVG/PNG.

## Cause
1. `drawNpcSprite` dessine le PNG à `sz * 1.5`, mais le bloc de sprite
   différé de `renderer.js` le clippe au rectangle du couloir
   (hauteur `sz * 1.127`). Les ~0.37·sz du haut (la tête) sont coupés.
2. `drawShopSprite` dessine un étal vectoriel + emoji `⚗️📜🪄` + un panneau
   texte « BOUTIQUE ». Le SVG d'échoppe existe pourtant déjà
   (`SCENE_ICONS.shop`), mais seulement consommé par l'overlay d'exploration.

## Étapes
1. `drawNpcSprite` : `drawSize` calé sur la hauteur du cadre du couloir
   (`sz * 1.12`) → le PNJ tient entier dans le cadre, plus de troncature.
   verif : `node tests/smoke.js` vert + capture mobile.
2. Helper `_getSceneSvgImg(key)` : rasterise un SVG `SCENE_ICONS[key]` en
   `Image` via data-URI, cache + re-render au chargement.
   verif : pas d'erreur console.
3. `drawShopSprite` : dessine l'image SVG de l'échoppe ; fallback vectoriel
   sobre (sans texte ni emoji) tant que l'image charge.
   verif : `node tests/smoke.js` vert + capture devant la boutique.

## Résultat
- [x] Étape 1 — `drawNpcSprite` : `drawSize = sz * 1.12`. PNJ entier dans
      le cadre, vérifié par capture (vendeur tête + pieds visibles).
- [x] Étape 2 — helper `_getSceneSvgImg` ajouté dans `renderer-effects.js`.
- [x] Étape 3 — `drawShopSprite` dessine le SVG `SCENE_ICONS.shop`,
      fallback `_drawShopVectorFallback` sobre. Capture : panneau « ÉCHOPPE ».
- `node tests/smoke.js` vert après changements.

## Écarts constatés
- Aucun. Le bug touchait aussi le desktop (clip identique) — corrigé des
  deux côtés puisque le calage est relatif à la taille du couloir.

## Suite — généralisation SVG aux autres cellules
Le coffre, la fontaine, la forge et la bibliothèque utilisaient encore des
emoji + texte. `_getSceneSvgImg` généralisé (clé de cache + `makeSvg`
paresseux pour la variante fontaine active/tarie). Les 4 fonctions
`drawChestSprite` / `drawFountainSprite` / `drawForgeSprite` /
`drawLibrarySprite` dessinent désormais le SVG `SCENE_ICONS`, emoji en
repli au chargement. Vérifié par captures (coffre, fontaine, forge,
bibliothèque) ; `node tests/smoke.js` vert.

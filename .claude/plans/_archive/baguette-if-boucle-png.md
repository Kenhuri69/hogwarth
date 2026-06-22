# Plan — PNG painterly de la Baguette d'If des Profondeurs

Item existant : `baguette_if_boucle` (`js/data.js:914`, epic, slot wand,
récompense Boucle). Image Nano Banana fournie (JPG, fond damier aplati RGB).

## Étapes

1. Déchiquetage du JPG → 512 RGBA → vérif visuelle.
   - `python3 tools/dechecker_png.py <src.jpg> /tmp/baguette_if_512.png`
   - verify : alpha reconstruit, sujet centré, pas de halo gris.
2. Mipmaps 16/24/32/48/64 (Lanczos) → `img/icons_new/baguette_if_boucle_<size>.png`.
   - verify : 5 fichiers RGBA présents.
3. Registre painterly priorité 1 :
   `baguette_if_boucle: 'img/icons_new/baguette_if_boucle_64.png'`
   dans `ITEM_ICON_NEW_REGISTRY` (`js/item-icons.js`).
   - verify : entrée présente ; legacy `wand2.png` reste comme fallback.
4. Bump cache PWA (item-icons.js est un JS servi) — skill `cache-bump`.
   - verify : `node tools/check_cache_versions.js --base origin/master` OK.
5. Test headless `node tests/smoke.js`.
   - verify : suite verte (scénario PNG RGBA inclus).

## Écarts constatés
(à compléter)

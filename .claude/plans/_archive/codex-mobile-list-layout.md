# Fix UX mobile — Codex : liste écrasée / champ de saisie pleine hauteur

## Symptôme (mobile, screenshots niv.13)
Modale Codex : le champ de recherche occupe toute une grande colonne verticale
vide à gauche, le filtre « Tous les états » à droite, et aucune entrée visible —
alors que le joueur (niv.13) a forcément du contenu débloqué.

## Cause racine (confirmée par probe headless 412×915)
`showCodexList()` (`js/ui-codex.js:131`) pose `listPanel.style.display = 'flex'`
en inline (calqué sur le bestiaire). MAIS **aucune règle CSS `#codex-list-panel`
n'existe** → `flex-direction` retombe sur `row`.
Résultat : `.bestiary-filters` et `#codex-grid` se posent **côte à côte** ; la
barre de filtres s'étire sur toute la hauteur (search h≈370px), et la grille
d'entrées est compressée dans une colonne de ~39px de large (invisible).

Le bestiaire ne souffre pas du bug car `#bestiary-list-panel { display:flex;
flex-direction:column; flex:1; overflow:hidden; }` existe (style.css:846).
L'équivalent codex n'a jamais été écrit.

## Correctif (CSS pur, `css/codex.css`)
Mirror du bestiaire :
- `#codex-list-panel { display:flex; flex-direction:column; flex:1; overflow:hidden; }`
- `#codex-detail-panel { flex:1; overflow-y:auto; }`
- `.codex-grid` : ajouter `flex:1; min-height:0;` (la grille remplit le panneau et scrolle)

→ verify : probe headless — `#codex-list-panel` direction=column, grid pleine largeur,
filters flex-shrink en haut, entrées lisibles. Screenshot avant/après.

## Cache PWA (guidelines §8)
`css/codex.css` modifié → bump `?v` dans index.html + PRECACHE_URLS de sw.js +
CACHE_VERSION. Skill `cache-bump` + `node tools/check_cache_versions.js`.

## Tests
- probe mobile (avant/après screenshot)
- `node tests/smoke.js` (scénarios codex)
- `node tools/check_cache_versions.js --base origin/master`

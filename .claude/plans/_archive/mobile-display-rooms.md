# Mobile — Allègement carte joueur + affichage Forge/Bibliothèque

## Contexte

Trois bugs UX signalés sur le screenshot mobile (étage 12, Bibliothèque) :

1. **Carte joueur surchargée** — affiche : portrait, nom, classe + niveau,
   PV, PM, 3 icônes d'équipement, plus la carte Maison (points/tier) et
   un module XP séparé. En mobile (largeur réduite), tout est tassé et
   lisible difficilement. L'utilisateur demande de se limiter au **nom**
   du joueur (+ HP/MP qui restent vitaux).
2. **Équipements en mobile** — sacrifiables. L'inventaire reste
   consultable via le bouton 🎒.
3. **Forge / Bibliothèque invisibles** — les cellules `CELL.FORGE` et
   `CELL.LIBRARY` (endgame Tranche 2, floors 11/14/17/20 et 12/15/18) ne
   sont rendues ni sur la minimap (pas de classe `map-forge` /
   `map-library`), ni dans la vue pseudo-3D (pas de sprite dans le
   pendingSprite scan). On les rencontre par hasard via l'overlay
   d'exploration qui s'ouvre à l'entrée — invisible avant.

## Étapes

1. **CSS mobile (`css/style.css` `@media max-width: 700px`)**
   - Masquer `.char-class` (texte "Élève de Gryffondor · Niv.21")
   - Masquer `.party-equip-row` (3 icônes équipement)
   - Conserver `.char-name`, les 2 barres `stat-bar-row` (PV/PM),
     `status-slot-*` (pilules d'état persistantes), `xp-container`,
     `house-badge` et `house-crest`.
   - Vérifier : critère = la carte mobile montre nom + PV + PM + statuts.

2. **Minimap (`js/renderer-minimap.js` + `css/style.css`)**
   - Ajouter classes `map-forge` (rougeâtre, écho de la forge) et
     `map-library` (violacé/sombre, écho de la bibliothèque).
   - Dans `_buildMinimapCells`, brancher `CELL.FORGE` →
     `map-forge`, `CELL.LIBRARY` → `map-library`.
   - Critère : sur un étage 11 (forge) ou 12 (bibliothèque), la case
     correspondante est colorisée distinctement de `map-special`
     (fontaine).

3. **Vue pseudo-3D (`js/renderer.js` + `js/renderer-effects.js`)**
   - Scan `pendingSprite` (renderer.js ~l.216) : ajouter `CELL.FORGE` et
     `CELL.LIBRARY` à la condition de capture.
   - Dispatch sprite (renderer.js ~l.486) : `drawForgeSprite(...)`,
     `drawLibrarySprite(...)`.
   - Implémenter `drawForgeSprite` (renderer-effects.js) : enclume
     emoji 🔨 + halo rouge-orange + label "FORGE".
   - Implémenter `drawLibrarySprite` : grimoire emoji 📜 + halo
     violet + label "BIBLIOTHÈQUE".
   - Style cohérent avec `drawShopSprite` / `drawChestSprite` (emoji
     + label + glow).
   - Manifeste loader : ajouter `drawForgeSprite` / `drawLibrarySprite`
     pour qu'une régression de chargement soit détectée.
   - Critère : en se plaçant devant une case Forge/Bibliothèque, on
     voit un sprite identifiable dans le couloir 3D (pas seulement
     l'overlay d'exploration).

4. **Smoke test** — `node tests/smoke.js` doit passer. Pas de nouveau
   scénario nécessaire (les chemins endgame ne sont pas exercés
   automatiquement) mais la non-régression mobile + 3D doit rester
   verte.

5. **Commit & push** sur `claude/fix-mobile-display-rooms-ecjkQ`.

## Notes de design

- La carte Maison (`#house-badge` + `#house-crest`) reste affichée :
  c'est un module distinct de la carte joueur et l'utilisateur ne l'a
  pas cité comme superflu.
- On ne touche pas le module XP (`#xp-container`) : c'est de l'info
  vitale partagée par le groupe.
- Pour la Forge/Bibliothèque, on suit le pattern shop/chest (sprite
  emoji + label) plutôt que `drawCellMarker` (qui n'est appelé que pour
  les portes). Cohérent avec l'existant.

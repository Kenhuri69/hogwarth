# P0 #4 — Cibles tactiles ≥ 44px

## Contexte

Audit UX mobile P0 #4 : plusieurs contrôles interactifs sont sous le
seuil tactile de 44px. Constat vérifié dans `css/style.css` :

| Contrôle | Avant | Élément |
|----------|-------|---------|
| Croix de fermeture des modales | 36×36px | `.modal-close` |
| Chevron accordéon fiche perso | ~26px h | `.section-toggle` |
| Boutons d'allocation de stats | ~26px h | `.alloc-btn` |

## Étapes

1. **`.modal-close`** : 36×36 → 44×44px. `.modal-title` padding-right
   38→48px pour éviter le chevauchement de la croix élargie.
   → vérif : `offsetWidth/Height === 44`, titre non chevauché.

2. **`.section-toggle`** : `min-height: 44px`.
   → vérif : `offsetHeight ≥ 44` (mobile, fiche perso).

3. **`.alloc-btn`** : `min-height: 44px`.
   → vérif : visuel — boutons d'allocation hauts de 44px.

4. **Smoke** : assertions dans `scenarioCombatMobile` (viewport 375px) —
   `.modal-close` et `.section-toggle` de la fiche perso ≥ 44px.
   → vérif : `node tests/smoke.js` vert.

## Hors-scope

- Les onglets / chips de filtre des sorts (`_spellFilterBarHtml`,
  onglets Harry/Hermione de `openSpells`) sont stylés en *inline* dans
  `inventory.js` et seront retravaillés avec la refonte P1 inventaire /
  sorts — non touchés ici.
- La taille de police des labels (`.alloc-btn` 10px, etc.) relève du
  P0 #3 (uplift typographique), traité séparément.

## Suivi

- [x] Étape 1 — `.modal-close` 44px + `.modal-title` padding 48px
- [x] Étape 2 — `.section-toggle` min-height 44px
- [x] Étape 3 — `.alloc-btn` min-height 44px
- [x] Étape 4 — assertions smoke (`hit-targets: 44×44, toggleH 44`)
- [x] `node tests/smoke.js` vert

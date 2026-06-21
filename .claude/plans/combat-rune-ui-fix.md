# Fix ergonomie combat (boutons débordent) + icône Rune

## Problème
Depuis l'ajout des boutons d'action conditionnels (`#btn-artifact`,
`#btn-posture`, `#btn-env`/Rune), la grille mobile en combat déborde :
les boutons « Sortilège »/« Garde » se chevauchent et sortent de l'écran
(cf. captures mobile fournies).

### Cause racine
`css/style.css` — `body.in-battle .battle-actions` (≤700px) :
grille 6 colonnes pilotée par des règles **positionnelles fragiles** :
```css
.cmd-btn:nth-child(1,2,3) { grid-column: span 2; }  /* main actions */
.cmd-btn:nth-child(4,5)   { grid-column: span 3; }  /* censé = Objet/Fuir */
```
`nth-child` compte TOUS les enfants (même `display:none`). Les 3 boutons
conditionnels insérés en position 4/5/6 décalent Objet→7 et Fuir→8 :
- nth-child(4,5) ciblent désormais artifact/posture (masqués)
- Objet/Fuir n'ont plus de span → la grille casse / déborde.

De plus, items de grille sans `min-width:0` → débordement par contenu.

## Décision
Remplacer le schéma rigide `nth-child` par une grille robuste
`repeat(3, 1fr)` + `min-width:0`, qui s'adapte à 5/6/7/8 boutons
visibles sans règle positionnelle. Layout : 3 actions par rangée.

## Icône Rune
Le bouton `#btn-env` utilisait l'emoji `🌿 Rune` (incohérent : feuille
verte + pas de PNG comme les autres boutons). Générer `img/icons/rune.png`
(48×48, pierre runique gravée lumineuse) via `tools/gen_rune_icon.py`,
et utiliser `<img class="ui-icon ui-icon-md">` comme les autres boutons.

## Étapes
1. [x] Reproduire/comprendre le bug (captures + CSS) → cause = nth-child
2. [x] Réécrire la grille mobile in-battle (robuste, sans nth-child) → vérif : pas de débordement 5–8 boutons
3. [x] Générer `img/icons/rune.png` (script Python) → vérif : PNG 48×48 présent
4. [x] Câbler l'`<img>` rune dans `index.html` (#btn-env)
5. [x] Bump cache PWA (style.css + index.html) → `check_cache_versions.js`
6. [x] `node tests/smoke.js` (combat) vert
7. [x] Commit + push branche `claude/combat-interface-rune-icon-akkr4n`

## Écarts constatés
- Le bug touche surtout la vue mobile (grille). Desktop (flex-wrap) restait
  correct ; corrigé tout de même pour cohérence min-width.
- Smoke combat : 17/17 scénarios verts (suite ciblée).

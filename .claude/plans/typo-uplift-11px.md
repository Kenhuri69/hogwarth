# P0 #3 — Uplift typographique (plancher 11px)

## Contexte

Audit UX mobile P0 #3 : « aucune valeur < 11px en ≤700px, sauf badges
décoratifs ». `css/style.css` compte ~37 déclarations `font-size` sous
11px. La majorité sont des **labels décoratifs** (letter-spacing,
majuscules, tags, badges numériques) — explicitement exemptés par
l'audit. La cible réelle = le **texte de contenu lu** par le joueur.

## Décision de périmètre

Bumpés à 11px — texte de contenu lisible, dans des conteneurs à hauteur
auto (aucun risque de débordement) :

| Sélecteur | Avant | Rôle |
|-----------|-------|------|
| `.alloc-btn-effect` | 9px | effet chiffré sous bouton d'allocation |
| `.inv-empty-slot` | 10px | placeholder « emplacement vide » |
| `.quest-tracker-empty` | 9px | état vide du suivi de quêtes |
| `.inv-slot .item-name` (≤700px) | 9px | nom d'objet (slot `height:auto`) |
| `.brew-tile-name` | 9.5px | nom d'ingrédient (`min-height` auto) |
| `.brew-recipe-ing` | 10.5px | ligne de recette |
| `.brew-mini-btn` | 10.5px | bouton de concoction |
| `.item-tooltip .tt-desc` / `.tt-action` | 10px | description / action de tooltip |
| `.shop-desc` | 10px | description d'article boutique |
| `.hero-tag` | 10.5px | accroche de carte héros |
| `.bestiary-stat-lbl` | 9px | label de stat (fiche bestiaire) |

Laissés tels quels — **badges / labels décoratifs** (exemption explicite
de l'audit) ou hors scope ≤700px : `.cmd-btn .key` (badge raccourci
clavier, desktop), `.bestiary-seen-badge`, `.bestiary-cat-tag`,
`.bestiary-floor-tag`, `.equip-menu-set-badge`, `.item-tooltip
.tt-rarity`, `.section-houseset .set-cell-num`, `.compass-dir`,
`.hof-*`, ainsi que les labels en letter-spacing (`.bar-label`,
`.equip-label`, `.stat-label`, `.location-display`) et `.inv-slot
.item-name` desktop (hors cible mobile).

## Vérification

- Tous les sélecteurs bumpés vivent dans des conteneurs à hauteur auto
  (`height:auto` / `min-height` / texte libre) → pas de débordement.
- `node tests/smoke.js` vert (non-régression). Le smoke headless ne
  fait pas de diff visuel : le choix de ne bumper que des conteneurs
  auto-hauteur écarte le risque de débordement par construction.

## Suivi

- [x] 12 déclarations de texte de contenu portées à 11px
- [x] `node tests/smoke.js` vert

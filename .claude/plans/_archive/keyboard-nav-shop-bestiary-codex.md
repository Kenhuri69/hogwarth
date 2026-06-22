# Plan — Navigation clavier : boutique / bestiaire / codex

> Statut : **en cours** (branche `claude/keyboard-nav-shop-bestiary-codex`).
> Donne suite au **Hors-scope** du plan `inventory-keyboard-nav.md` (Phases 1 & 2
> livrées, mergées) : « Navigation clavier de la boutique / bestiaire / codex
> (mêmes patterns, à généraliser une fois Phase 1+2 validées) ».
> Créé le 2026-06-20.

## Constat

Les trois dernières grilles cliquables du jeu sont encore **100 % souris/tactile** :

| Surface | Rendu | Cellule cliquable | Focusable ? |
|---------|-------|-------------------|-------------|
| Boutique — achat | `shop.js` (~l.421) | `div.shop-item` (`div.onclick = _purchase`) | ❌ |
| Boutique — vente | `shop.js` (~l.474) | `div.shop-item` (`div.onclick = sellItem`) | ❌ |
| Bestiaire | `ui-bestiary.js` (~l.166) | `div.spell-item.bestiary-card` (`card.onclick = showMonsterDetail`) | ❌ |
| Codex | `ui-codex.js` (~l.187) | `div.codex-card` (inline `onclick` si déverrouillé) | ❌ |

Acquis réutilisés (mêmes que Phase 1/2 inventaire) :
- `modal-a11y.js` piège Tab dans la modale ouverte → une cellule rendue
  focusable entre dans le cycle Tab.
- `css/style.css` `[tabindex]:focus-visible { outline: 2px solid gold }` →
  repère de focus doré **sans CSS** ajouté.
- `main.js` keydown global : activation Entrée/Espace + flèches 2D
  (`_gridArrowTarget`, géométrique) déjà en place — il suffit d'**étendre les
  sélecteurs** aux nouvelles familles.

> Remarque : la carte bestiaire porte déjà la classe `spell-item` → elle est
> **déjà couverte** par les sélecteurs `.spell-item[tabindex]` existants une
> fois rendue focusable. Seules `.shop-item` et `.codex-card` sont à ajouter
> aux sélecteurs de `main.js`.

## Direction retenue

Passe **additive et défensive**, parité totale avec la souris. Aucune nouvelle
machinerie : on rend les cellules cliquables focusables (`tabindex="0"`) et on
étend les deux `closest(...)` + la table de familles de `_gridArrowTarget`.

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/shop.js` | `div.tabIndex = 0` sur les `.shop-item` (achat + vente — toujours cliquables). | Article Tab-atteignable. |
| `js/ui-bestiary.js` | `card.tabIndex = 0` sur la carte monstre (toujours cliquable). | Carte Tab-atteignable. |
| `js/ui-codex.js` | `tabindex="0"` sur `.codex-card` **uniquement si déverrouillé** (présence du `onclick`). | Entrée révélée focusable ; verrouillée non. |
| `js/main.js` | Constante partagée `GRID_CELL_SEL` (5 familles) consommée par les 2 `closest(...)` ; `_gridArrowTarget` : ajouter `.shop-item` / `.codex-card` à la table de familles. | Entrée/Espace + flèches sur les 3 nouvelles grilles. |
| `index.html` + `sw.js` + `CACHE_VERSION` | cache-bump des 4 JS servis (shop, ui-bestiary, ui-codex, main). | `check_cache_versions --base origin/master` exit 0. |

> Zéro nouveau module, zéro CSS, zéro dépendance. Les filtres texte
> (`#bestiary-search`, `#codex-search`) sont déjà neutralisés par le garde
> `e.target.tagName==='INPUT'` du keydown global.

## Verify

1. Nouveau scénario `scenarioGridKeyboardNavExtended` (`tests/scenarios/controls.js`) :
   - boutique ouverte → `.shop-item[tabindex="0"]` présent ; ArrowRight déplace
     le focus vers un autre `.shop-item` ;
   - bestiaire ouvert → `.bestiary-card[tabindex="0"]` présent ;
   - codex ouvert → carte déverrouillée focusable, carte verrouillée non.
2. `node tests/smoke.js GridKeyboardNavExtended` vert + non-régression
   `GridKeyboardNav` / `GridArrowNav` / `RelativeControls` / `ModalIsolation`.
3. `node tools/check_cache_versions.js --base origin/master` exit 0.

## Suivi
- [x] shop.js / ui-bestiary.js / ui-codex.js : tabindex sur cellules cliquables (achat+vente, carte monstre, codex déverrouillé seulement).
- [x] main.js : `GRID_CELL_SEL` (5 familles, source unique) + familles `_gridArrowTarget` étendues (`.shop-item`/`.codex-card`).
- [x] scénario `GridKeyboardNavExtended` + smoke vert (+ non-régression GridKeyboardNav/GridArrowNav/RelativeControls/ModalIsolation/CombatKeyboard).
- [x] cache-bump : ui-bestiary v5→v6, ui-codex v6→v7, shop v17→v18, main v30→v31, CACHE_VERSION v178→v179 (index.html + sw.js). `check_cache_versions --base origin/master` exit 0, pwa-smoke OK.

## Hors-scope
- Filtres/chips `div` non focusables (catégories sorts, codex) — a11y séparée.
- Navigation clavier des onglets boutique (`<button>` déjà focusables nativement).

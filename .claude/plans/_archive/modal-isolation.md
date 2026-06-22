# Plan — Isolation de modale (focus-trap générique + inert/aria)

> Passe dédiée reportée du plan `.claude/plans/ergonomics-improvement.md`
> (notes Phases 3B & 4). Branche `claude/ergonomics-modal-isolation`.
> Créé le 2026-06-14.

## Objectif

Rendre les ~16 modales accessibles au clavier et isolées sémantiquement,
sans régresser le flux souris/tactile. Reprend le modèle déjà livré dans
`confirmModal()` (focus initial + restitution) et le généralise.

## Approche retenue (justification)

Il n'existe **pas** de fonction d'ouverture unique — chaque modale a sa
propre fonction (`openInventory`, `openBestiary`, `openShop`, …) et toutes
basculent `el.style.display` entre `none` et `flex`. Modifier ~16 call-sites
serait fragile et dispersé (guidelines §3, chirurgical).

→ **Mécanisme central par observation** : un module unique
`js/modal-a11y.js` pose un `MutationObserver` sur l'attribut `style`/`class`
de chaque modale et réagit aux transitions `display:none ↔ visible`. Aucune
fonction d'ouverture/fermeture n'est touchée — le module est purement
additif et défensif (si une modale manque, il l'ignore).

Avantage vs wrapper open/close : zéro modification des call-sites existants,
robuste aux nouvelles modales (il suffit d'ajouter l'ID au registre), et la
fermeture par `closeModal()` / Échap / action déclenche le même chemin.

## Étapes

1. **Module `js/modal-a11y.js`** → vérif : chargé, expose `window.ModalA11y`,
   observer armé au `DOMContentLoaded`.
   - Registre des 16 IDs de modale.
   - Pile (`stack`) des modales ouvertes (gère un éventuel empilement).
   - À l'ouverture : mémorise `document.activeElement`, pose le focus initial
     (champ de recherche > 1er contrôle ≠ croix > croix > boîte), met le fond
     en `inert` quand la pile passe de 0→1.
   - Trap `Tab`/`Shift+Tab` (capture) cyclant dans la modale du sommet.
   - À la fermeture : retire `inert` quand la pile revient à 0, restitue le
     focus au déclencheur mémorisé.
2. **Fond `inert`** → vérif : `#game-container` + écrans de démarrage portent
   `inert` quand une modale est ouverte, retiré à la fermeture. Les 16 modales
   sont toutes hors `#game-container` (vérifié : closent à la ligne 813 < 816).
3. **`aria-describedby`** → vérif : ajouté là où un descriptif statique
   existe (don de Maison, forge, bibliothèque).
4. **Câblage** : `index.html` (`<script>` + `?v`), `CLAUDE.md` (liste modules,
   CI `check_doc_modules.js`), `loader.js` MANIFEST.
5. **Test** `tests/scenarios/controls.js — scenarioModalIsolation` : focus
   initial dans la modale, Tab piégé, fond `inert`, restitution du focus à la
   fermeture. → vérif : `node tests/smoke.js` vert.
6. **Cache-bump** (skill) : `index.html` + `sw.js` PRECACHE + `CACHE_VERSION`.

## Décisions

- `confirm-modal` exclu du registre : il gère déjà son focus/restitution
  (Phase 3) — l'inclure doublerait la restitution.
- Visibilité testée via `getClientRects().length` (robuste display:none).
- Trap `Tab` en phase capture sur `document` : pilote le sommet de pile,
  indépendant de `inert` (qui isole le fond, pas la navigation interne).

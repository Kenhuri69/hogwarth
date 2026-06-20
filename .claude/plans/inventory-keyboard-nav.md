# Plan — Navigation clavier des grilles inventaire / équipement / sorts

> Statut : **Phases 1 & 2 livrées**. Phase 1 → PR #593 (mergée). Phase 2 →
> branche `claude/inventory-keyboard-nav-phase2`. Donne suite au hors-scope #2
> du plan `ergonomics-improvement.md` (clos) : « Navigation clavier complète de
> l'inventaire/équipement (grille) — gros, à isoler dans un plan dédié ».
> Créé le 2026-06-14.

## Constat (audit code 2026-06-14)

Les grilles interactives du jeu sont **entièrement souris/tactile** :

| Surface | Rendu | Cellule | Focusable ? |
|---------|-------|---------|-------------|
| Sac (`#inv-grid`) | `renderInventory` (`inventory.js:148`) | `.inv-slot.has-item` (`onclick` via `div.onclick`) | ❌ pas de `tabindex` |
| Fiche perso — sac | `_renderInvSlot` (`ui-character-sheet.js:78`) | `.inv-slot.has-item` (`onclick` attr) | ❌ |
| Fiche perso — paper-doll | `_renderPaperDollSlot` (`ui-character-sheet.js:31`) | `.equip-slot-floating.filled` (`onclick` attr) | ❌ |
| Sorts (hors combat) | `openSpells` (`inventory-spells.js:54`) | `.spell-item` (`div.onclick`) | ❌ |
| Sorts (combat) | `openBattleSpells` (`inventory-spells.js:461`) | `.spell-item` (`div.onclick`) | ❌ |

Acquis exploitables (aucune régression à craindre) :
- **`modal-a11y.js`** piège déjà Tab dans la modale ouverte, pose le focus
  initial et restitue le focus à la fermeture. Une cellule rendue focusable
  entre donc automatiquement dans le cycle Tab piégé.
- **`css/style.css:35`** : `[tabindex]:focus-visible { outline: 2px solid gold }`
  → toute cellule `tabindex="0"` reçoit le repère de focus doré **sans CSS
  supplémentaire** (et seulement au clavier, pas au clic).
- **`main.js:698`** : un seul `keydown` global, déjà gardé contre les saisies
  texte (`if(e.target.tagName==='INPUT') return;`).

## Direction retenue

Passe **additive et défensive**, parité totale avec la souris. Deux phases :
Phase 1 livre un parcours clavier complet (Tab + Entrée/Espace) ; Phase 2 ajoute
la navigation 2D aux flèches (roving tabindex) pour l'ergonomie de grille.

---

## Phase 1 — Cellules focusables + activation Entrée/Espace ⏳ EN COURS

Rendre interactives au clavier les cellules **réellement cliquables** (on
n'ajoute PAS `tabindex` aux slots vides ou grisés en combat).

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/inventory.js` | `renderInventory` : `div.tabIndex = 0` sur les slots `has-item` non grisés (branche qui pose `div.onclick`). | Slot d'item Tab-atteignable. |
| `js/ui-character-sheet.js` | `_renderInvSlot` + `_renderPaperDollSlot` : ajouter `tabindex="0"` quand la cellule porte un `onclick`. | Sac + paper-doll Tab-atteignables. |
| `js/inventory-spells.js` | `openSpells` + `openBattleSpells` : `div.tabIndex = 0` quand le sort est lançable (`canCastOoc` / `canCast`). | Sort lançable Tab-atteignable ; sort grisé non focusable. |
| `js/main.js` | Dans le `keydown` global (après le garde INPUT) : si `Entrée`/`Espace` et la cible est `.inv-slot[tabindex]`/`.equip-slot-floating[tabindex]`/`.spell-item[tabindex]` → `cell.click()` + `preventDefault()`. | Entrée/Espace = clic (équipe / consomme / apprend / lance). |

Repère de focus : **rien à ajouter** (`[tabindex]:focus-visible` couvre déjà).

**Verify Phase 1** :
- Nouveau scénario `scenarioGridKeyboardNav` (`tests/scenarios/controls.js`) :
  slot `has-item` porte `tabindex="0"` ; focus + `Enter` sur un équipement en
  solo → item équipé (quitte l'inventaire) ; slot paper-doll rempli focusable.
- `node tests/smoke.js GridKeyboardNav` vert.
- Cache-bump (`inventory.js`, `ui-character-sheet.js`, `inventory-spells.js`,
  `main.js` ; pas de CSS touché).

---

## Phase 2 — Navigation 2D aux flèches ✅ LIVRÉE

> Livré le 2026-06-20. `main.js` : helper pur `_gridArrowTarget(cur, key)` +
> branche flèches dans le `keydown` global (après l'activation Entrée/Espace).
> Test : `scenarioGridArrowNav` (`tests/scenarios/controls.js`). Cache bumpé
> (main v29, CACHE_VERSION v173).
>
> **Choix d'implémentation (écart assumé au plan initial)** : approche
> **géométrique agnostique au layout** plutôt que roving tabindex strict.
> - Les cellules gardent toutes `tabindex="0"` (acquis Phase 1) — Tab continue
>   de toutes les traverser ; les flèches ajoutent la navigation 2D **par-dessus**.
>   On évite ainsi une 2ᵉ passe sur tous les sites de rendu (set/reset
>   `tabindex=-1`) et la machinerie d'état du roving, pour un bénéfice
>   (un seul arrêt Tab) marginal dans ce jeu. Conforme guidelines §2/§3.
> - `_gridArrowTarget` : groupe = cellules de même famille (`.inv-slot` /
>   `.equip-slot-floating` / `.spell-item`) **visibles** (une modale ouverte à
>   la fois → scope naturel, sans coder d'ids de conteneur). ←/→ = voisin en
>   ordre DOM (clampé) ; ↑/↓ = cellule la plus proche dans la direction, écart
>   horizontal pénalisé (×4) pour rester dans la colonne. Fonctionne pour la
>   grille 4 colonnes du sac, le paper-doll (layout libre) et la liste de sorts
>   (vertical) sans cas particulier.
> - `preventDefault` sur les 4 flèches quand une cellule est focusée → le joueur
>   ne se déplace pas derrière la modale ; le mouvement d'exploration reste
>   intact hors grille (vérifié `scenarioRelativeControls`).

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| `js/main.js` | `_gridArrowTarget` (géométrie) + branche flèches dans le `keydown`. | Flèches naviguent la grille ; joueur immobile. |
| `tests/scenarios/controls.js` | `scenarioGridArrowNav` : ←/→ linéaire, ↓/↑ change de rangée même colonne, modale reste ouverte. | `node tests/smoke.js GridArrowNav` vert. |

**Verify Phase 2** : `GridArrowNav` + `GridKeyboardNav` verts ; non-régression
`RelativeControls` / `CombatKeyboard` / `ModalIsolation`. Cache-bump (`main.js`).

---

## Hors-scope

- Filtres de sorts (chips `div` non focusables) — accessibilité séparée.
- Navigation clavier de la boutique / bestiaire / codex (mêmes patterns,
  à généraliser une fois Phase 1+2 validées).

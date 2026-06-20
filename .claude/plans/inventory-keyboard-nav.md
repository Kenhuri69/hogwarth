# Plan — Navigation clavier des grilles inventaire / équipement / sorts

> Statut : **Phase 1 en cours**. Donne suite au hors-scope #2 du plan
> `ergonomics-improvement.md` (clos) : « Navigation clavier complète de
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

## Phase 2 — Navigation 2D aux flèches (roving tabindex) ⬜ À FAIRE

| Fichier | Changement | Vérif |
|---------|-----------|-------|
| nouveau hook (`main.js` ou module léger) | Sur la grille focusée : ←/→/↑/↓ déplacent le focus de cellule en cellule (roving tabindex : une seule cellule `tabindex=0`, les autres `-1`). Capturer **avant** le handler de déplacement (ces flèches ne doivent pas bouger le joueur quand une modale est ouverte). | Flèches naviguent la grille ; joueur immobile. |
| `js/inventory*.js` | Calcul du nombre de colonnes pour ↑/↓ (grille 16 = 4 col ; paper-doll = layout libre → fallback ←/→ linéaire). | Déplacement cohérent. |

> Garde-fou Phase 2 : aujourd'hui les flèches déplacent le joueur (`main.js:743`).
> Comme une modale ouverte rend le fond `inert` et que `modal-a11y` piège le
> focus, le handler de grille (gardé par « focus dans une cellule ») fera
> `preventDefault` avant la branche déplacement. À vérifier finement.

---

## Hors-scope

- Filtres de sorts (chips `div` non focusables) — accessibilité séparée.
- Navigation clavier de la boutique / bestiaire / codex (mêmes patterns,
  à généraliser une fois Phase 1+2 validées).

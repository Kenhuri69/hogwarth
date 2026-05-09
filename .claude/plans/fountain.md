# Plan d'exécution — Salle Fontaine

Branche : `claude/continue-svg-work-v6BEc` (fontaine = fonctionnalité
connexe au travail SVG en cours, intégrée sur la même branche).

## Décisions validées par l'utilisateur

| Paramètre | Choix |
|-----------|-------|
| Usage     | 1 fois par visite d'étage (s'éteint, se ré-active si on quitte puis revient) |
| Soin      | 100 % PV + 100 % PM, groupe entier (Harry et Hermione) |
| Visuel    | Fontaine de pierre Poudlard : bassin circulaire, statue (chouette/serpent/lion stylisé), jet d'eau bleutée luminescente, cabochons dorés |
| Apparition | Étages 2, 5, 8, 11, … (`floor >= 2 && (floor - 2) % 3 === 0`) — 1 fontaine garantie par étage concerné |

## Architecture choisie

- **Type de cellule** : `CELL.FOUNTAIN = 7` (étend l'enum `data.js`).
- **État "tarie"** : Set global `usedFountains` (clés `"x,y"` — par
  étage). Pas de second type de cellule pour rester DRY.
- **Reset à la sortie d'étage** : `usedFountains.clear()` au moment du
  `_saveFloorToCache()` (= quand on quitte). À la rentrée le Set est
  vide → fontaine ré-active.
- **Persistance** : sérialisé dans `_serializeState()` comme
  `Array.from(usedFountains)` ; restauré dans `_applyState()`.

## Étapes

### 1. Audit (fait)
- `data.js` `CELL`, `dungeon.js` génération, `movement.js` overlay/rest,
  `renderer-effects.js` `drawCellMarker`, `renderer-minimap.js`,
  `save.js` serialize/apply.

### 2. Backend logique
- [ ] `data.js` : `CELL.FOUNTAIN = 7`.
- [ ] `state.js` : `let usedFountains = new Set();`.
- [ ] `dungeon.js` :
    - dans `generateDungeon(floor)`, si `floor >= 2 && (floor-2) % 3 === 0`,
      forcer une room intermédiaire (ni rooms[0] ni rooms[length-1])
      à `CELL.FOUNTAIN` ; cette room ne reçoit alors ni shop ni chest.
- [ ] `movement.js` :
    - clé `xy = \`${playerX},${playerY}\``
    - overlay d'exploration `else if (cell === CELL.FOUNTAIN)` : SVG +
      titre + bouton « Boire à la fontaine » qui appelle
      `useFountain()` (désactivé visuellement si déjà bue).
    - `function useFountain()` : si déjà tarie → message ; sinon
      `c.hp = c.hpMax; c.sp = c.spMax` pour `party` ; `usedFountains.add(xy)` ;
      message ; `playLevelUp()` (réutilisé pour l'instant) ;
      `updateUI()` ; `autoSave('fountain-used')`.
    - dans `_saveFloorToCache()` : ajouter
      `usedFountains: Array.from(usedFountains)`.
    - dans `_restoreFloorFromCache()` : ne PAS restaurer
      l'utilisation (volontairement reset à la rentrée), mais ré-init
      `usedFountains = new Set()`.
    - dans `generateDungeon()` (déjà appelé) : réinit
      `usedFountains = new Set()` au début.
    - dans `checkObjectInFront()` (ligne 377) : ajouter `CELL.FOUNTAIN`
      aux types interactifs.
- [ ] `save.js` : `_serializeState`/`_applyState` — `usedFountains`.

### 3. Visuel
- [ ] `movement.js` : SVG fontaine de pierre (bassin circulaire,
      statue de chouette stylisée, jet d'eau bleuté, cabochons or,
      ombre, étincelles SMIL légères).
- [ ] `renderer-effects.js` `drawCellMarker` : cas `CELL.FOUNTAIN`
      avec teinte bleue (anneau d'eau au sol).
- [ ] `renderer-minimap.js` : mapper `CELL.FOUNTAIN` → classe
      `map-fountain` (bleue pâle).
- [ ] `css/style.css` : `.map-fountain { background:#7ab4d8; }`.

### 4. Plan SVG (entrées dans `SVG_PLAN.md`)
- [ ] Ajouter `B-bonus-1` (`fountain` SVG inline raffinement) — pour
      cohérence future.
- [ ] Ajouter `C-bonus-1` (`fountain` PNG via générateur) — futur
      remplacement par PNG si l'utilisateur le veut.

### 5. Documentation
- [ ] Ajouter section « Salle fontaine » dans `CLAUDE.md` (sous
      « Système d'objets 3D »).
- [ ] Mettre à jour la table des étages dans `CLAUDE.md` si
      pertinente.

### 6. Tests
- [ ] Smoke test (`tests/smoke.js`) — ajouter scénario fontaine :
    - charge le jeu, force `currentFloor = 2`, force une cellule
      `CELL.FOUNTAIN` adjacente, lance `useFountain()`, vérifie
      `c.hp === c.hpMax`, vérifie deuxième usage refusé.
- [ ] Run final de tous les scénarios.

### 7. Clôture
- [ ] Mettre à jour `SVG_PLAN.md` si compteur change.
- [ ] Commit + push.

## Critères de vérification (résumés)

1. La fontaine apparaît exactement une fois aux étages 2, 5, 8…
2. Boire la première fois soigne 100 % PV+PM des deux personnages.
3. Boire une seconde fois (sans changer d'étage) → message refusé,
   pas de soin.
4. Quitter et revenir → fontaine ré-active.
5. Sauvegarde puis chargement préservent l'état "tarie".
6. Smoke test 100 % vert.

## Journal

| Étape | Date       | Statut | Notes |
|-------|-----------|--------|-------|
| Audit          | 2026-05-09 | ✅ | `CELL` enum, `floorDungeons`, `rest()`, save model OK |
| Backend        | 2026-05-09 | ✅ | `CELL.FOUNTAIN=7`, `usedFountains` Set, génération forcée 2/5/8…, `useFountain()`, reset à `_restoreFloorFromCache`/`generateDungeon`, persistance save |
| Visuel SVG     | 2026-05-09 | ✅ | SVG inline dans `movement.js` (bassin, statue chouette, jet d'eau SMIL, gouttes animées, état "tarie" qui éteint l'animation) |
| Plan SVG       | 2026-05-09 | ✅ | C44 ajouté en C.6 (statut 23/76), session #19 dans le journal |
| Doc            | 2026-05-09 | ✅ | Section « Salle Fontaine » dans `CLAUDE.md` |
| Tests          | 2026-05-09 | ✅ | Scénario 14 dans `tests/smoke.js` — 4 tests (génération, non-apparition, soin total + 2e usage bloqué, cycle quitter/revenir) |
| Commit + push  | —          | ⏳ | — |

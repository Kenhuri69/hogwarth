# Refactor — factoriser `showEquipMenu` (reliquat 6.2 / N15)

Reliquat **§6.2** de `reliquats-backlog.md` (source : `_archive/code-review-tasks.md` N15).
`showEquipMenu` rend les boutons d'équipement avec **3 variantes inline**
(solo non-ring / solo ring / duo) → panneau et boutons d'anneau dupliqués.

## Objectif
Réduire la duplication **sans changer le comportement ni le rendu** (mêmes
libellés, marges, onclick). Pas de refonte UI (réservée à character-ux-v2).

## Implémentation (inventory.js, chirurgical)
- `_equipMenuPanel(item, setBadge, buttonsHtml)` — coquille du panneau (titre
  « Équiper <icône> <nom><badge> » + desc + boutons + Annuler). Partagée par la
  branche solo-anneau ET la branche duo (markup identique aujourd'hui dupliqué).
- `_equipRingButtons(idx, ci, c, compact)` — les deux boutons gauche/droit.
  `compact=false` (solo) : libellés « Anneau gauche/droit » + « (vide) » si slot
  libre. `compact=true` (duo) : libellés « gauche/droit », pas de « (vide) »,
  marges 4/8px. Préserve exactement la sortie actuelle.
- `showEquipMenu` se réduit à : garde solo non-ring → equip direct ; solo-ring →
  panel(ringButtons) ; duo → map des boutons par perso (ring → header + ringButtons,
  sinon bouton simple) → panel.

## Vérification
1. `node tests/smoke.js` vert (scénarios inventaire/équipement).
2. Diff comportemental nul : libellés/onclick identiques avant/après.
3. Cache PWA bumpé (inventory.js servi) via skill `cache-bump`.

## Journal
- [x] Helpers extraits (`_equipMenuPanel`, `_equipRingButtons`) + `showEquipMenu` simplifié.
- [x] Smoke vert (189 scénarios, suite complète).
- [x] Cache bumpé : `inventory.js` v17→18 + `CACHE_VERSION` v104→v105.
- [x] Bonus : corrigé un oubli de bump préexistant sur `item-icons.js` (v22→23,
      du commit badges PNG `90a3465`) qui rendait les nouvelles icônes invisibles
      côté joueur (Cache-First sur `?v` inchangé).

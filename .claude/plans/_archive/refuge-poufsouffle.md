# Refuge du Blaireau — point de repos récurrent Poufsouffle

> Item gameplay différé du plan ch05-ch08 (§3 : « lier le Refuge à la mécanique
> fontaine »). Implémente **uniquement** le *refuge-repos* (mécanique de repos
> récurrente, parente de la fontaine) — **pas** la Quête Signature « Ceux qu'on
> ne laisse pas derrière » (escorte/vague/allié-buff), qui reste hors-scope.

## Design (spec narrative 08 §8.5/§8.8.3)

Le **Refuge du Blaireau** est le point de repos **signature de Poufsouffle** :
un foyer chaleureux où le groupe panse ses plaies. « Un filet de sécurité, pas
un avantage offensif » (08 §8.8.3).

- **Cellule** : `CELL.REFUGE = 17` (data.js).
- **Apparition** : seulement si `chosenHouse === 'Poufsouffle'`, sur les étages
  SANS fontaine garantie (≠ 2,5,8,11…), à partir de l'étage 2, `rooms>=3`.
- **Effet** (`useRefuge`) : soin **partiel** `REFUGE_HEAL_FRAC = 0.5` des PV/PM
  max (≠ fontaine 100 %), **1×/visite d'étage** (`usedRefuges`). Soin partiel +
  fréquence élevée = repos « de campagne », distinct de la fontaine (rare/totale).
- **Cycle** : identique fontaine — `usedRefuges` reset à chaque entrée d'étage
  (gen + restore), sérialisé, jamais archivé dans le cache d'étage.

## Étapes (chaque étape → vérif)
1. Donnée : `CELL.REFUGE=17` + `REFUGE_HEAL_FRAC=0.5` (data.js).
2. État : `usedRefuges` (state.js) ; reset gen (dungeon.js) + restore
   (movement-floors.js) ; sérialisation (save.js x2).
3. Génération : bloc gated maison+étage (dungeon.js).
4. Interaction : `useRefuge()` (movement-interactions.js).
5. Overlay : descripteurs `_exploreDescriptors` + visitor + dispatch
   `handleCellEntry` (movement.js).
6. Rendu 3D : scan + dispatch + `drawRefugeSprite` + `SCENE_ICONS.refuge` +
   palette FX `heal` (renderer.js / renderer-sprites.js / scene-icons.js /
   dungeon-fx.js).
7. Minimap : `map-refuge` (renderer-minimap.js + css/style.css).
8. Tests : `scenarioRefuge` (gen gate + soin + 1×/visite). Cache PWA bumpé.

## Journal
- ✅ Étapes 1-8 livrées (re-implémentées après un reset d'environnement qui
  avait effacé le 1er jet non commité — commit anticipé cette fois).
- Hors-scope confirmé : Quête Signature Poufsouffle (escorte/vague/allié-buff/
  `poufSignatureDone`) — non traitée.

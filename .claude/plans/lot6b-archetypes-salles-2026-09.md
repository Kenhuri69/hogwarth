# 6b — Archétypes de salles (thème C2 de `game-evolution-review-2026-07`)

Dernier reliquat de [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md)
(axe 6b, « on le reprend tel quel »). La spécification C2 tient en une ligne :
« donjon structurellement identique à chaque étage (épine + 3 branches) ;
salle-type (embuscade / sanctuaire / galerie) data-driven ». Ce plan la précise.

## Constat

Chaque salle en cul-de-sac (3 par étage) reçoit aujourd'hui la même chose :
un coffre (75 %) ou un autel (25 %), plus 60 % de chance d'un ennemi.

## Conception

Registre PUR `ROOM_ARCHETYPES` + tirage `pickRoomArchetype(floor, rng)`
(`floor-ambiance.js`). Chaque salle-branche tire un archétype :

| Archétype | Poids | Centre | Ennemis | À la 1ʳᵉ entrée |
|---|---|---|---|---|
| Trésor (défaut) | 40 | coffre | tirage normal (60 %) | — (aucun message) |
| Embuscade (ét. 2+) | 25 | coffre | **1 gardien garanti** près du coffre | message d'alerte |
| Sanctuaire | 20 | autel | **aucun** | message de calme |
| Galerie | 15 | vide | tirage normal | les portraits dévoilent le plan de l'étage (minimap) |

- **Densité d'ennemis neutre** (pas de nouvelle simulation nécessaire) : par
  étage, embuscade +0,4 × 0,25 × 3 ≈ +0,30 ennemi, sanctuaire −0,6 × 0,20 × 3
  ≈ −0,36. Écart net ≈ −0,06 ennemi/étage.
- **Butin** : coffres de branche 75 % → 65 % (trésor + embuscade) ; autels
  25 % → 20 % ; la galerie remplace un coffre par l'information (plan).
- **État** : `roomArchetypes` (liste `{x, y, w, h, type}` des salles non
  triviales), mis en cache d'étage et sérialisé comme `secretWalls`. Filtré en
  fin de génération : une salle dont le centre a été écrasé ensuite (salle
  unique, fontaine, refuge, forge…) perd son archétype.
- **Entrée** : `maybeRoomArchetypeEntry()` (movement.js, branche `_enteredRoom`),
  une fois par salle et par visite (ensemble transitoire). Ignoré en visite
  inter-mondes et en Poche du Sceau.
- **Galerie** : parcours en largeur depuis le joueur sur les cases non-murs,
  arrêté aux portes → les cachettes derrière un mur secret restent cachées.

## Étapes

1. [x] Plan (ce fichier).
2. [x] Registre + tirage purs ; génération (dungeon.js) ; filtre final.
3. [x] État : cache d'étage, save ; entrée de salle + révélation galerie.
4. [x] Tests : units §28, smoke `scenarioRoomArchetypes`.
5. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-09-30 — Plan créé (PR #755 du Lot G fusionnée ; branche remise à zéro).
- 2026-09-30 — Implémenté. Écart : un sanctuaire qui reçoit quand même un
  ennemi (boss garanti, cible de quête, salles fusionnées en dernier recours)
  perd son archétype et redevient un simple autel — constaté par le smoke
  (5 cas sur 46). Aucune simulation lancée : densité d'ennemis neutre par
  construction (vérifiée par units §28). Tests : units §28 (1489 ✅), smoke
  `scenarioRoomArchetypes` (2 étapes ✅), suite complète 293 ✅, pwa-smoke ✅.
  Loader 408 ; cache 8 JS, `CACHE_VERSION` 282.

# Lot F — Texture du pas-à-pas : 6a (volume de texte) + 6c (salles uniques)

Plan dérivé de [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md)
(axe 6, Lot F). 6b (archétypes de salles) relève du plan C2 déjà ouvert : hors
périmètre. Invariants : aucune quête bloquante, équité des Maisons, ton gradué
par Acte, narration au « tu », pages courtes.

## 6a — Volume de texte (données)

- **Ambiance de salle** (`room-flavor.js`) : 4 → 16 phrases par zone
  (16 → 64 au total). Aucune logique changée.
- **Énigmes** (`riddles.js`) : 12 → 30. Deux champs neufs, lus par le helper
  PUR `pickRiddleFor(floor, heroKeys, rng)` :
  - `minFloor` : les 3 énigmes des Ruines (Dormeur, sceau) ne sortent plus
    qu'en Boucle (étage 11+) — avant, elles pouvaient spoiler dès l'étage 1 ;
  - `hero` : énigme posée par un héros précis, tirée seulement s'il est dans
    le groupe. Les Poches du Sceau excluent les énigmes de héros.
  `_generateRuneStele` (dungeon.js) passe par `pickRiddleFor`.
- **Événements d'étage pré-victoire** (`floor-events.js`) : 6 → 12, ciblés
  sur les étages 5, 7 et 8. Nouveau champ `kind` : un événement neuf réutilise
  l'effet d'un événement existant (`calme`, `hante`, `tresor`…) sous un nom et
  un texte propres. Helper `floorEventKind(id)` ; les comparaisons de
  `dungeon.js`, `movement-interactions.js` et `audio-sfx.js` passent par lui.

## 6c — Salle unique par étage « pauvre » (1, 5, 7, 8)

- Nouvelle cellule `CELL.LANDMARK = 20`, registre `FLOOR_LANDMARKS`
  (`floor-ambiance.js`, données + texte dynamique pur).
- Placement (`dungeon.js`) : sur les étages 1, 5, 7, 8 (étage réel), au centre
  d'une salle-branche (cul-de-sac : récompense du détour), à défaut d'une
  salle d'épine intermédiaire libre.
- Interaction : overlay d'exploration (`_showExploreOverlay`), un bouton
  d'action **une fois par partie** (sentinelle `landmark:<étage>` dans
  `seenScriptedBeat`, aucun état neuf), effet léger et égal pour toutes les
  Maisons :
  - 1 **Le Hall des Sabliers** : les quatre sabliers ; +15 points de Maison.
  - 5 **La Volière effondrée** (hiboux de H8) : PM du groupe restaurés.
  - 7 **Le Lac souterrain** : un reflet (réplique propre au héros de tête si
    présente) ; PV du groupe +30 %.
  - 8 **La Salle des Trophées corrompue** : plaques tirées des exploits de la
    partie (boss vaincus, créatures, quêtes, dilemmes) ; +100 XP.
- Rendu : sprite emoji dans la vue 3D, classe minimap `map-landmark`,
  descripteur visiteur (Mondes Parallèles).

## Étapes

1. [x] Plan (ce fichier).
2. [x] 6a : ambiance, énigmes + `pickRiddleFor`, événements + `kind`.
3. [x] 6c : cellule, registre, placement, overlay, rendu, minimap.
4. [x] Tests : units §26, smoke `scenarioLotFTexture`.
5. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-09-30 — Plan créé. PR #754 (Lots D + E) toujours ouverte : Lot F
  empilé sur la même branche.
- 2026-09-30 — 6a et 6c implémentés. Écarts : le reflet du Lac a une
  réplique propre pour 8 héros (repli générique pour les autres) ; la
  légende de la minimap n'a pas d'entrée dédiée (comme le Refuge). Le test
  `scenarioFloorEvents` attend désormais 16 événements. Tests : units §26
  (1459 ✅), smoke `scenarioLotFTexture` (5 étapes ✅), pwa-smoke ✅. Loader
  399 ; cache 15 fichiers (14 JS + style.css), `CACHE_VERSION` 280.
  Suite smoke complète : 291 ✅ (test existant `scenarioRiddleStele` : 30 énigmes attendues).

# Plan — Enrichissement du donjon V2 : Énigmes & Runes

> Objectif : la V1 (`dungeon-enrichment.md`, close) a apporté embranchements,
> pièges, autels, salles scellées, secrets et événements d'étage. L'exploration
> a maintenant de la *géographie* et du *risque/récompense*, mais aucun **vrai
> gameplay d'exploration** : on traverse, on ramasse, on combat. Cette V2
> ajoute des **énigmes** — des dalles-runes à activer, des séquences à
> reconstituer, des devinettes — qui transforment certaines salles en défis
> intellectuels gardant une récompense.

Statut global : **🟡 EN COURS — 3 / 4 phases (1, 2 & 3 livrées).**
Branche de travail : `claude/lance-dungeon-enrichment-v2-ihE0E` (Phases 1 + 2
groupées sur une seule branche, décision utilisateur 2026-05-22).
Décision utilisateur (2026-05-22) : pilier **Énigmes & runes**, **plan multi-phases**.
Décision utilisateur (2026-05-22) : implémenter **Phases 1 + 2** dans cette session.

---

## État des lieux (audit 2026-05-22)

- `CELL` (`data.js`) va de `0` à `12` (`ALTAR`). **Prochain libre : `13`.**
- `handleCellEntry(cell)` (`movement.js:231`) aiguille par type de cellule :
  overlay d'exploration (STAIRS/SHOP/CHEST/FOUNTAIN/ALTAR/FORGE/LIBRARY),
  piège (TRAP → consommé + effet), PNJ (dialogue). Point d'extension naturel
  pour un nouveau type.
- `_findWallPocket()` (`dungeon.js`) sait creuser une alvéole
  `FLOOR → mur → CHEST` — déjà réutilisé par le coffre scellé (§2.C) et le
  passage secret (§3). Réutilisable pour la chambre-récompense d'un puzzle.
- États annexes persistés via le même cycle : champ dans `_serializeState`/
  `_applyState` **et** dans `_saveFloorToCache`/`_restoreFloorFromCache`
  (`movement.js`). Modèle de référence : `secretWalls` (Set de clés `"x,y"`).
- `FLOOR_EVENTS` (`floor-events.js`) : registre + `rollFloorEvent()` — un
  événement « étage runique » s'y branche sans nouveau système.
- Le mur secret de la V1 (§3) prouve qu'un `CELL.WALL` peut devenir `FLOOR`
  à l'exécution (révélation) sans casser le cache — mécanique réutilisable
  comme « barrière » de puzzle.

Nouveau type prévu : `CELL.RUNE = 13`. (Éventuel `CELL.GLYPH` pour les
inscriptions — décidé en Phase 2/3.)

---

## Phase 1 — Socle runique : dalles à activer

> Une poignée de **dalles-runes** dispersées sur l'étage ; les allumer toutes
> dissout une **barrière runique** qui scelle un coffre. Pas d'ordre : le défi
> est de toutes les trouver et de les atteindre (le parcours devient l'énigme).

### Étapes

- [x] **1.1** `CELL.RUNE = 13` (`data.js`). Génération (`dungeon.js`) :
      ~20 % des étages reçoivent un *puzzle runique* — 3 dalles `RUNE` sur des
      cases `FLOOR` ordinaires (hors spawn) + une alvéole-récompense
      `FLOOR → mur-barrière → CHEST` via `_findWallPocket`.
- [x] **1.2** Définition du puzzle dans un global `runePuzzle`
      (`{ runes:["x,y"…], barrier:"x,y", solved:false }` ou `null`). État des
      dalles allumées : `litRunes` (Set `"x,y"`).
- [x] **1.3** `handleCellEntry` : marcher sur une `RUNE` l'allume
      (`litRunes.add`), feedback (toast + son). Quand `litRunes` couvre toutes
      les `runePuzzle.runes` → la barrière `WALL → FLOOR` (coffre accessible),
      `solved = true`, toast de résolution.
- [x] **1.4** Rendu : sprite de dalle-rune au sol (`renderer-effects.js`),
      glyphe gravé, halo éteint/allumé. Classe minimap `.map-rune`
      (+ `.map-rune-lit` allumé). _Écart : halo statique, pas de pulse temps
      réel (pas de boucle d'anim dédiée — cohérent avec sprites de scène V1)._
- [x] **1.5** Persistance : `runePuzzle` + `litRunes` sérialisés
      (`_serializeState`/`_applyState`) **et** mis en cache par étage
      (`_saveFloorToCache`/`_restoreFloorFromCache`), sur le modèle de
      `secretWalls`.
- [x] **1.6** Smoke : `scenarioRunePuzzle` — génération, activation des
      3 runes, assertion que la barrière tombe, round-trip save.

### Critère de succès
Sur un étage à puzzle : 3 runes générées, le coffre est inatteignable tant
que les 3 ne sont pas allumées, atteignable après. État survit à un
aller-retour d'étage et à une sauvegarde.

### Risque
Modéré — état persistant (`runePuzzle`, `litRunes`). Mitigé en calquant
exactement le cycle de `secretWalls`. La barrière est un `CELL.WALL` généré
**dès** `generateDungeon` (jamais à la volée).

---

## Phase 2 — Runes en séquence + indice

> Certains puzzles exigent d'allumer les runes dans un **ordre précis**. Une
> **inscription** consultable donne l'indice ; un faux pas réinitialise tout.

### Étapes

- [x] **2.1** `runePuzzle` gagne un champ optionnel `order: [idx…]`. ~½ des
      puzzles runiques sont ordonnés (les autres restent « toutes allumées »).
- [x] **2.2** Activation d'une rune hors séquence → toutes les runes
      s'éteignent (`litRunes.clear()`), toast d'échec, son distinct. Bonne
      rune dans l'ordre → progression mémorisée.
- [x] **2.3** Indice : une case `FLOOR` du puzzle porte une **inscription**
      consultable — marcher dessus affiche un vers thématique nommant les
      runes (« émeraude / or / améthyste ») dans l'ordre attendu. Champs
      `runePuzzle.hint` + `runePuzzle.hintCell`.
- [x] **2.4** Rendu : état binaire éteint/allumé inchangé ; les runes sont
      teintées par index (émeraude/or/améthyste) pour matcher l'indice.
- [x] **2.5** Smoke : `scenarioRuneSequence` — bon ordre → résolu ; mauvais
      ordre → reset ; round-trip save de la progression partielle.

### Risque
Faible-modéré — additif sur la Phase 1. La progression partielle (séquence
en cours) doit être persistée ; sinon, repli sûr = reset à la restauration.

---

## Phase 3 — Énigmes-devinettes

> Une **stèle** (ou un PNJ dédié) pose une **devinette** de l'univers Harry
> Potter ; la bonne réponse, choisie dans un overlay, ouvre une récompense.

### Étapes

- [x] **3.1** Registre `RIDDLES` (nouveau `js/riddles.js`) — entrées
      `{ id, question, choices:[…], answer, rewardHint }`. 6–8 devinettes V1,
      ajouté à l'ordre de chargement `index.html` + MANIFEST du loader.
      _Livré : 8 devinettes, `getRiddleById()`._
- [x] **3.2** Génération : ~30 % des étages placent une **stèle** gardant
      une alvéole-coffre. _Décision : `CELL.STELE = 14` dédié (pas de
      surcharge de `CELL.RUNE`) — sprite/minimap/handleCellEntry distincts._
- [x] **3.3** `handleCellEntry` sur la stèle → overlay de devinette (réutilise
      `_showExploreOverlay` : descripteur `[CELL.STELE]`, boutons de réponse).
      Bonne réponse → barrière `WALL → FLOOR` + toast. Mauvaise → feedback
      dans l'overlay (`_steleFeedback`), ré-essai autorisé sans pénalité.
      _Écart : fonction nommée `answerSteleRiddle` — collision évitée avec
      `answerRiddle` (quests.js — quête Lumière Éternelle)._
- [x] **3.4** Persistance : `runeStele` (objet avec `solved`) sérialisé +
      mis en cache par étage, même cycle que `runePuzzle`. _Écart : une
      seule stèle/étage → booléen `solved` sur l'objet plutôt qu'un Set._
- [x] **3.5** Smoke : `scenarioRiddleStele` — overlay, mauvaise puis bonne
      réponse, ouverture de la barrière, round-trip save.

### Risque
Faible — surcouche UI + registre de contenu. Pas de nouvelle mécanique de
carte au-delà de la stèle.

---

## Phase 4 — Récompenses & intégration

> Donner du poids aux puzzles : un **butin dédié**, un **événement d'étage**
> runique, et un dosage de fréquence pour ne pas saturer.

### Étapes

- [x] **4.1** Loot table dédiée pour les coffres de puzzle. Champ
      `rewardCell` sur `runePuzzle`/`runeStele` (la case du coffre).
      `openChest` détecte la case via `_puzzleRewardAt` et délègue à
      `_openPuzzleChest` : or généreux croissant avec l'étage +
      équipement « best-of-N » (3 tirages de `pickChestEquipment`,
      meilleure rareté retenue → biais qualité naturel par étage).
- [x] **4.2** Événement d'étage `runique` ajouté à `FLOOR_EVENTS`.
      `_generateRunePuzzle`/`_generateRuneStele` forcent la génération
      quand `currentFloorEvent === 'runique'`. `_openPuzzleChest(doubled)`
      double l'or et passe à 2 pièces (5 tirages). Le toast est gratuit
      (`_announceFloorEvent` générique). _Décision : doublement
      déterministe sur l'événement (rare, ~4 %/étage) plutôt qu'un
      sous-tirage « peut doubler »._
- [x] **4.3** Dosage : `generateDungeon` n'appelle `_generateRuneStele`
      que si `!runePuzzle` → au plus un puzzle par étage. Fréquences :
      20 % rune, puis 30 % des étages restants en stèle (~44 % au total).
- [x] **4.4** Smoke : `scenarioRuneRewards` — dosage (0 double-puzzle /
      200), `rewardCell` valide, garantie runique (40/40), butin simple
      vs doublé. + `scenarioFloorEvents` mis à jour (6 événements).

### Risque
Faible — additif, tout est appliqué à la génération (zéro effet runtime
nouveau).

---

## Séquencement & livraison

| Phase | Dépend de | Risque | Livraison |
|-------|-----------|--------|-----------|
| 1 Socle runique     | — | Modéré | 1 PR |
| 2 Runes en séquence | Phase 1 | Faible-modéré | 1 PR |
| 3 Énigmes-devinettes| Phase 1 (alvéole, overlay) | Faible | 1 PR |
| 4 Récompenses & intégration | Phases 1-3 | Faible | 1 PR |

Ordre recommandé : **1 → 2 → 3 → 4**. Une PR par phase, smoke vert à chaque
étape, plan amendé à chaque phase franchie.

## Critères de succès globaux

- Sur 200 générations : aucune régression de connexité (les runes/stèles ne
  scellent jamais l'escalier descendant).
- `node tests/smoke.js` 100 % vert, ≥ 4 nouveaux scénarios (un par phase).
- Le joueur croise régulièrement un puzzle, le résout par l'exploration ou la
  réflexion, et la récompense vaut le détour.
- Aucune régression des systèmes V1 (pièges, autels, salles scellées,
  passages secrets, événements d'étage).

## Hors-scope V2 (à rediscuter)

- Puzzles à plusieurs salles / chaînes d'énigmes inter-étages.
- Leviers physiques, blocs poussables (demanderait une mécanique de
  déplacement d'objets).
- Génération procédurale de devinettes (le registre `RIDDLES` est statique).
- Re-direction artistique fine des sprites de rune/stèle (V1 = dessin
  procédural simple, comme les sprites de scène V1).

---

## Journal

| Date | Phase | Statut | Notes |
|------|-------|--------|-------|
| 2026-05-22 | Rédaction du plan | ✅ | Audit `data.js`/`movement.js`/`dungeon.js`. Pilier « Énigmes & runes » et format multi-phases validés par l'utilisateur. 4 phases rédigées. Implémentation non démarrée. |
| 2026-05-22 | Phase 1 — Socle runique | ✅ | `CELL.RUNE=13`. `runePuzzle`/`litRunes` (state.js). Génération 20 %/étage (dungeon.js). `_activateRune` (movement.js). `drawRuneSprite` + minimap `.map-rune`. Persistance save + cache d'étage. Smoke `scenarioRunePuzzle`. |
| 2026-05-22 | Phase 2 — Runes en séquence | ✅ | Champ `order`/`hint`/`hintCell` sur `runePuzzle` (½ des puzzles ordonnés). Reset des dalles sur faux pas. Inscription-indice nommant les runes par teinte. Smoke `scenarioRuneSequence`. |
| 2026-05-22 | Phase 3 — Énigmes-devinettes | ✅ | `js/riddles.js` (8 devinettes, `getRiddleById`). `CELL.STELE=14`. `runeStele` (state.js). Génération 30 %/étage (dungeon.js). `answerSteleRiddle` + overlay réutilisant `_showExploreOverlay`. `drawSteleSprite` + minimap `.map-stele`. Persistance save + cache. Smoke `scenarioRiddleStele`. 98 scénarios verts. |
| 2026-05-22 | Phase 4 — Récompenses & intégration | ✅ | Champ `rewardCell` sur `runePuzzle`/`runeStele`. `_puzzleRewardAt` + `_openPuzzleChest` (movement.js) — or croissant + équipement best-of-N. Événement `runique` (`FLOOR_EVENTS`) force un puzzle et double la récompense. Dosage : au plus un puzzle/étage (`generateDungeon`). Smoke `scenarioRuneRewards` + `scenarioFloorEvents` (6 événements). 99 scénarios verts. **Plan clos.** |

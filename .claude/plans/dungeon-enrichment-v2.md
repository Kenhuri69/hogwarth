# Plan — Enrichissement du donjon V2 : Énigmes & Runes

> Objectif : la V1 (`dungeon-enrichment.md`, close) a apporté embranchements,
> pièges, autels, salles scellées, secrets et événements d'étage. L'exploration
> a maintenant de la *géographie* et du *risque/récompense*, mais aucun **vrai
> gameplay d'exploration** : on traverse, on ramasse, on combat. Cette V2
> ajoute des **énigmes** — des dalles-runes à activer, des séquences à
> reconstituer, des devinettes — qui transforment certaines salles en défis
> intellectuels gardant une récompense.

Statut global : **🟡 EN COURS — 0 / 4 phases.**
Branche de travail : une branche dédiée par phase (décidée au commit).
Décision utilisateur (2026-05-22) : pilier **Énigmes & runes**, **plan multi-phases**.

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

- [ ] **1.1** `CELL.RUNE = 13` (`data.js`). Génération (`dungeon.js`) :
      ~20 % des étages reçoivent un *puzzle runique* — 3 dalles `RUNE` sur des
      cases `FLOOR` ordinaires (hors spawn) + une alvéole-récompense
      `FLOOR → mur-barrière → CHEST` via `_findWallPocket`.
- [ ] **1.2** Définition du puzzle dans un global `runePuzzle`
      (`{ runes:["x,y"…], barrier:"x,y", solved:false }` ou `null`). État des
      dalles allumées : `litRunes` (Set `"x,y"`).
- [ ] **1.3** `handleCellEntry` : marcher sur une `RUNE` l'allume
      (`litRunes.add`), feedback (toast + son). Quand `litRunes` couvre toutes
      les `runePuzzle.runes` → la barrière `WALL → FLOOR` (coffre accessible),
      `solved = true`, toast de résolution.
- [ ] **1.4** Rendu : sprite de dalle-rune au sol (`renderer-effects.js`),
      glyphe gravé, halo éteint/allumé (pulsé si allumé). Classe minimap
      `.map-rune` (+ teinte distincte allumé/éteint).
- [ ] **1.5** Persistance : `runePuzzle` + `litRunes` sérialisés
      (`_serializeState`/`_applyState`) **et** mis en cache par étage
      (`_saveFloorToCache`/`_restoreFloorFromCache`), sur le modèle de
      `secretWalls`.
- [ ] **1.6** Smoke : `scenarioRunePuzzle` — génération, activation des
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

- [ ] **2.1** `runePuzzle` gagne un champ optionnel `order: [idx…]`. ~½ des
      puzzles runiques sont ordonnés (les autres restent « toutes allumées »).
- [ ] **2.2** Activation d'une rune hors séquence → toutes les runes
      s'éteignent (`litRunes.clear()`), toast d'échec, son distinct. Bonne
      rune dans l'ordre → progression mémorisée.
- [ ] **2.3** Indice : une case `FLOOR` du puzzle porte une **inscription**
      consultable (overlay d'exploration ou ligne narrative à l'entrée) qui
      décrit l'ordre de façon thématique (couleurs, symboles, vers).
- [ ] **2.4** Rendu : une rune « prochaine attendue » peut pulser plus fort
      (option) ; sinon état binaire éteint/allumé inchangé.
- [ ] **2.5** Smoke : `scenarioRuneSequence` — bon ordre → résolu ; mauvais
      ordre → reset ; round-trip save de la progression partielle.

### Risque
Faible-modéré — additif sur la Phase 1. La progression partielle (séquence
en cours) doit être persistée ; sinon, repli sûr = reset à la restauration.

---

## Phase 3 — Énigmes-devinettes

> Une **stèle** (ou un PNJ dédié) pose une **devinette** de l'univers Harry
> Potter ; la bonne réponse, choisie dans un overlay, ouvre une récompense.

### Étapes

- [ ] **3.1** Registre `RIDDLES` (nouveau `js/riddles.js`) — entrées
      `{ id, question, choices:[…], answer, rewardHint }`. 6–8 devinettes V1,
      ajouté à l'ordre de chargement `index.html` + MANIFEST du loader.
- [ ] **3.2** Génération : ~30 % des étages placent une **stèle** (réutilise
      `CELL.RUNE` en variante « stèle », ou un `CELL.GLYPH` dédié — tranché
      ici) gardant une alvéole-coffre.
- [ ] **3.3** `handleCellEntry` sur la stèle → overlay de devinette (réutilise
      la structure de `_showExploreOverlay` / `npc-dialog`) : question +
      boutons de réponse. Bonne réponse → barrière levée + toast. Mauvaise →
      message, ré-essai autorisé (pas de pénalité dure en V1).
- [ ] **3.4** Persistance : devinettes résolues par étage (Set), même cycle.
- [ ] **3.5** Smoke : `scenarioRiddleStele` — overlay, mauvaise puis bonne
      réponse, ouverture, round-trip save.

### Risque
Faible — surcouche UI + registre de contenu. Pas de nouvelle mécanique de
carte au-delà de la stèle.

---

## Phase 4 — Récompenses & intégration

> Donner du poids aux puzzles : un **butin dédié**, un **événement d'étage**
> runique, et un dosage de fréquence pour ne pas saturer.

### Étapes

- [ ] **4.1** Loot table dédiée pour les coffres de puzzle (qualité croissante
      selon l'étage) — rejoint la piste « récompenses enrichies » du backlog.
      Les coffres de puzzle ne sont plus des coffres standard.
- [ ] **4.2** Événement d'étage `FLOOR_EVENTS` : « Étage runique » garantit
      un puzzle et peut en doubler la récompense ; toast narratif à l'entrée.
- [ ] **4.3** Dosage : au plus **un** puzzle (rune ou stèle) par étage ;
      fréquences calibrées pour que le joueur en croise régulièrement sans
      que ça devienne systématique.
- [ ] **4.4** Smoke : `scenarioRuneRewards` — coffre de puzzle = butin dédié ;
      forçage de l'événement « Étage runique ».

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

# Lot E — Endgame narratif : H9 (Rêves), H10 (Archiviste), H6 (Garde de l'Aube)

Plan dérivé de [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md)
(Lot E). Invariants de la revue rappelés : aucune quête bloquante, aucune
branche, aucun avantage hérité d'une partie à l'autre, équité des Maisons,
le Dormeur ne parle pas et ne se combat pas.

## H9 — « Les Rêves du Dormeur » (Boucle, `rest()`)

- `DORMEUR_DREAMS` (10 textes, `floor-ambiance.js`, données pures) +
  helpers purs `dormeurDreamCount(seen)` et `dormeurDreamWanted(ctx)`.
- Déclenchement : repos **réussi** (non interrompu) en Boucle
  (`victoryAchieved && currentFloor >= 11`), au plus **un rêve par étage**,
  chance `DORMEUR_DREAM_CHANCE = 0.4`. Rêves joués dans l'ordre.
- **Aucune nouvelle variable sauvegardée** : sentinelles `dream:<n>` et
  `dreamfloor:<étage>` dans `seenScriptedBeat` (déjà sérialisé).
- Codex `reves_dormeur` (condition neuve `dream`, contexte `dormeurDreams`).
- Dernier rêve (10/10) → le texte du jalon IV (modale Briser le Cycle) gagne un
  paragraphe, et la dernière page de la cinématique « Briser » change.

## H10 — « Ceux qui se souviennent » (Archiviste des boucles)

- PNJ `archiviste_boucles` (placement étage 11 → présent aux étages 11 et 21
  via `effectiveFloor`). Post-victoire uniquement de fait (ét. 11 scellé avant).
- Helper PUR `archivistMemoryLines(profile, ctx)` (`profile.js`) : lit le profil
  persistant **en lecture seule** (victoires, Pacte, Cycles brisés, morts
  scellées, étage le plus profond, cran NG+). Aucun effet mécanique.
- Pages-suffixes via `npc.profileMemory` (`_archivistSuffixPages`, npc-dialog).
- Écart assumé : le profil ne stocke ni les boss vaincus ni le choix
  « Perpétuer » → non cités (pas de nouvel état de profil pour ce lot).

## H6 — « La Chronique de la Garde de l'Aube » (étages 7-10)

- Quête `chronique_aube` donnée par **Fumseck** (étage 7), proposée en
  parallèle de son Bouclier (un phénix = l'aube ; il laisse tomber une page
  roussie). Étape `search`
  localisée `floors: [7, 8, 9, 10]`, 4 pages, `autoTurnIn`.
- `progressLines` : une page de chronique par recoin ; `progressHeroLines`
  (neuf) : une ligne propre si le héros de la Garde lié est présent
  (page 1 Agathe, 2 Olivier de Clairval, 3 Nathalie, 4 Olivier de Châtillon).
- `checkSearchQuests` : support `autoTurnIn` (comme `discover`, Lot D).
- Récompense : **Reliquaire Lunaire** (légendaire orphelin, Lot 0.1) + XP/or.
- Codex `chronique_aube` (+ notes par héros de la Garde).

## Étapes

1. [x] Plan (ce fichier).
2. [x] H9 : données + gate + hook `rest()` + Codex + Briser le Cycle.
3. [x] H10 : helper profil + PNJ + suffixe dialogue.
4. [x] H6 : quête + `progressHeroLines` + autoTurnIn search + Codex.
5. [x] Tests : units §25 (helpers purs), smoke `scenarioLotEEndgame`.
6. [x] Loader MANIFEST, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-09-30 — Plan créé. PR #754 (Lot D) encore ouverte : le Lot E est
  empilé sur la même branche (seule branche autorisée), la PR couvrira D + E.
- 2026-09-30 — H9, H10, H6 implémentés. Écarts : Fumseck propose la
  Chronique **en parallèle** du Bouclier (le dialogue liste toutes les quêtes
  offrables — pas de séquence imposée) ; Codex de l'Archiviste ouvert à
  l'étage 11, révélé à l'étage 21 (pas de robinet « PNJ rencontré »). Le
  `questDone` par quête n'étant pas lu par la cascade de dialogue, Fumseck n'a
  pas de réplique de fin dédiée. Tests : units §25 (1443 ✅), smoke
  `scenarioLotEEndgame` (3 étapes ✅). Loader 394 entrées ; cache 11 JS,
  `CACHE_VERSION` 279.
  Suite smoke complète : 290 ✅ ; pwa-smoke ✅.

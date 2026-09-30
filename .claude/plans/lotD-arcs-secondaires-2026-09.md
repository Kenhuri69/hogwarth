# Lot D — Arcs secondaires H7 (Œuf), H1 (Rogue), H5 (Chaussette), H4 (Égarés)

**Branche :** `ccr-4b80ea69-2nys9o` (repartie de `master` après le merge de la PR #753)
**Source :** [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md),
axe 5, arcs H7, H1, H5, H4.
**Statut :** ✅ livré (PR en cours)
**Demande (utilisateur, 2026-09-30) :** « Go next » (suite du Lot C).

## Invariants (rappel)

- Aucun blocage de `goDeeper()`. Toutes les quêtes sont facultatives.
- Un dilemme = récompenses **différentes mais équivalentes**, un choix mémorisé
  dans `questChoices` (Lot C), des **traces** visibles plus tard. Jamais de
  branche, jamais de gate. Ouvert à toutes les Maisons.
- Époque : uchronie 1996-1997 (Q5) — Rogue vivant, Dumbledore en portrait.
- Texte seulement (Q6 sans réponse) : aucun OGG pour les nouveaux textes.
- Pas de nouvelle variable sérialisée si un mécanisme existant suffit
  (`questChoices`, `completedQuests`, sentinelles de `seenScriptedBeat`).

## Constats (mesurés)

- Rogue : `idleRandom` « une erreur dont le prix ne cesse jamais d'augmenter »
  (`npcs-a.js`), sans suite.
- Hagrid et Scamander n'ont que des quêtes kill/fetch.
- `magyar_ancestral` : weight 1 à l'étage 10, cible de la prime répétable du
  Gardien en Boucle (`prime_boss_gardien`). **Simulation** (seul, Broyer
  runtime, 3000 combats, étage 10) : **0 % solo, 57 % duo**. Le garantir à
  l'étage 10 serait un mur → **non garanti** ; la trêve s'applique à la
  première rencontre, avant ou après la victoire (la prime du Gardien la rend
  probable en Boucle).
- `elfe_rebelle` (ét. 2-6) ; plan d'easter egg archivé
  (`_archive/free-house-elf-easter-egg.md`), jamais livré.
- Refuges de Maison (`CELL.REFUGE`) sur les étages ≥ 2 sans fontaine
  garantie (3, 4, 6, 7, 9, 10…).
- La signature Poufsouffle (« Ceux qu'on ne laisse pas derrière ») simule
  l'escorte par un simple `floor` (étage 4).

## Décisions de conception

### Mécanismes génériques (données, réutilisables)

- **G1 — `search` localisé** : une étape `search` peut porter
  `floors: [..]`. Elle ne progresse que sur ces étages, **une fois par étage**
  (`_floors`, sérialisé avec la quête). Libellé « Fouiller un recoin aux
  étages 4, 7 et 10 ». Toujours disponible (la fouille ne dépend pas du
  tirage des salles, contrairement aux coffres).
- **G2 — PNJ conditionnels `questGate`** :
  - `{ quest, state: 'active', untilTalked: true }` : présent tant que la
    quête est active et qu'on ne lui a pas encore parlé (égarés) ;
  - `{ quest, state: 'notDone' }` : présent tant que la quête n'est pas
    remise (l'elfe lié) ;
  - `{ choice: 'qid:cid' }` : présent si ce choix a été fait (l'elfe libre).
  Filtré dans `getNpcsForFloor` (génération et migration). `_pruneGatedNpcs()`
  retire de l'étage courant les PNJ qui ne passent plus leur condition
  (fermeture de dialogue, entrée d'étage, chargement). `acceptQuest` appelle
  la migration pour que les PNJ conditionnés apparaissent aussitôt.
- **G3 — Choix `fight`** : une option de `choices` peut porter
  `fight: 'monsterId'` : après la remise, un duel contre ce monstre (seul,
  mis à l'échelle de l'étage).
- **G4 — Remise auto** : une étape `discover` complétée déclenche
  `_autoTurnInReadyQuests()` (quêtes `autoTurnIn`) ; un modèle peut porter
  `doneLine` (ligne de récit jouée à la remise).
- **G5 — Action spéciale `elf_help`** : soin complet + relève, **une fois par
  étage** (sentinelle `elf_help:<étage>`, pas par visite — anti-farm).
- **G6 — Promotion par choix** : `BOSS_PROMO_BEATS[id].lineByChoice`
  (`{ 'qid:cid': ligne }`) remplace la ligne par défaut.
- **G7 — Trêve** : `DRAGON_TRUCE` — `magyar_ancestral` rompt le combat à
  50 % PV si `oeuf_profondeurs:scamander`, une seule fois (sentinelle
  `magyar_truce`). Compte comme une victoire (kills, quêtes, prime) ; XP
  intégrale, **or divisé par 2, aucun drop**. Évaluée avant les phases de boss.

### H7 — « L'Œuf des Profondeurs »

- Quête `oeuf_profondeurs`, donnée par **Hagrid** (ét. 4) : `search` aux
  étages [7], `progressLines` (l'œuf tiède sous un éboulis).
- Remise chez Hagrid (fixe ou en maraude) **ou** Scamander (fixe ou en
  tournée). Dilemme :
  - `hagrid` — « Le confier à Hagrid » : `{ xp: 300, gold: 60, item: eclat_vitalite }` ;
  - `scamander` — « Le rendre à sa lignée sauvage » : `{ xp: 300, gold: 280 }`.
- Traces : `choiceLines` de Hagrid et de Scamander ; promotion du Magyar
  selon le choix (G6) ; trêve (G7) ; Codex `oeuf_profondeurs` ; écho de fin.

### H1 — « Le Prix de Rogue »

- Quête `prix_de_rogue`, donnée par **Rogue** (ét. 4) : `search` aux étages
  [4, 7, 10], 3 `progressLines` (trois réactifs de sa potion de scellement,
  corrompus par la fêlure). Remise au **portrait de Dumbledore** (bureau et
  3 relais), `turnInName`.
- Dilemme :
  - `rendre` — « Rendre la fiole à Rogue » : `{ xp: 420, gold: 100, item: livre_prince }` ;
  - `detruire` — « La confier à Dumbledore » : `{ xp: 420, gold: 400 }`.
- Traces : `choiceLines` de Rogue ; Codex `prince_felure` (débloqué et
  révélé à la remise, note selon le choix + note Drago) ; écho de Rogue à la
  victoire.

### H5 — « La Chaussette »

- PNJ **Tilly**, elfe de maison des Vantrell (ét. 6), `questGate notDone`.
  Quête `la_chaussette` (donnée et remise par Tilly) : `search` aux étages
  [5, 6], `progressLines` (une chaussette marquée C. V. dans une malle).
- Dilemme :
  - `liberer` — « Lui tendre la chaussette » : `{ xp: 220, gold: 40 }` ;
  - `combattre` — « Refuser — il te barre la route » : `{ xp: 220, gold: 200, fight: elfe_rebelle }`.
- Libérée, **Tilly** réapparaît à l'étage 10 (et 20 par recyclage de Boucle)
  avec l'aide `elf_help` (G5).
- Traces : Codex `tilly_elfe` ; écho de fin.

### H4 — « Les Égarés »

- Quête `les_egares`, donnée par **Chourave** (ét. 3), `autoTurnIn` :
  1. `talk` avec **Tobias** (ét. 3) et **Lila** (ét. 6), deux premières années
     descendus à la fêlure (PNJ `questGate active + untilTalked` : ils
     « suivent » le groupe une fois retrouvés) ;
  2. `discover` REFUGE : rallumer un refuge pour les mettre à l'abri.
  `doneLine` à la remise. Récompense `{ xp: 300, gold: 150 }`.
- Traces : lettres de la surface (ét. 7 et 10), Grande Salle post-victoire,
  Codex `les_egares` (note Poufsouffle), écho de fin.
- **Écart assumé** : la signature Poufsouffle n'est **pas** remplacée (système
  testé, équité entre Maisons) ; la « variante Poufsouffle » passe par la note
  de Maison du Codex et la ligne de Chourave.

### Fin de partie

- `_victorySpeechVariants` : bloc « échos des choix » (Rogue, Œuf, Tilly,
  Égarés), une phrase par arc remis, texte pur.

## Étapes

- [x] D0 Mécanismes génériques G1-G7 (quests.js, npcs-helpers.js,
      npc-dialog.js, battle.js, battle-rewards.js, dungeon-spawning.js).
- [x] D1 H7 données (quête, dialogues, promotion, Codex).
- [x] D2 H1 données.
- [x] D3 H5 données (Tilly liée / libre).
- [x] D4 H4 données (Tobias, Lila, lettres, Grande Salle).
- [x] D5 Fin de partie (échos), loader, CLAUDE.md, bible 06.
- [x] D6 Tests units + smoke ; `check_*` ; bump du cache ; commit ; état de
      la PR ; push ; PR.

## Journal

- **2026-09-30** — Plan créé. Simulation du Magyar seul à l'étage 10 (0 % /
  57 %) : pas de garantie de présence.
- **2026-09-30** — D0 à D5 implémentés. Écarts et précisions :
  - `codexVariantNote` : la note d'un héros présent s'**ajoute** désormais à
    celle du dilemme (avant, le choix masquait toute autre note). Sans effet
    sur les fiches du Lot C (aucune n'a les deux).
  - Les fiches Codex du Lot D sont débloquées et révélées à la remise
    (`revealedBy` = la quête) : aucune condition « quête active » n'existe.
  - Échos de fin : aussi pour le dilemme du Lieutenant (Lot C) et l'option
    « combattre » de Tilly, pour que **chaque** option laisse une trace.
  - La trêve est évaluée après l'étourdissement et la peur (un dragon figé
    ne se retire pas ce tour-là) et avant les phases de boss.
  - Manifeste du loader : +6 (384 → 390 ; CLAUDE.md affichait 380, dérive
    antérieure corrigée).
  - Tests : units §9 (15 promotions) + §24 (Lot D, 44 assertions) ; smoke
    `scenarioLotDArcs` (6 étapes : œuf, trêve, fioles, égarés, Tilly libre,
    duel), vert du premier coup.
  - Bump : 14 assets + `CACHE_VERSION` 277 → 278.
  - Smoke complet, 1er passage : `scenarioChainAndRepeatable` attendait
    Hagrid « terminé » après ses deux quêtes ; la chaîne se prolonge désormais
    par l'Œuf. Test étendu (Hagrid propose l'Œuf ensuite), remise de l'Œuf
    simulée sans récompense pour ne pas fausser le cooldown testé en T5.
    2e passage : 289 scénarios verts. Lint : 12 avertissements, identiques à
    `master`.

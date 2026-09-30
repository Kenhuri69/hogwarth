# Lot A — Un monde qui reconnaît le joueur (réactivité aux héros)

**Branche :** `ccr-4b80ea69-2nys9o` (repartie de `master` après le merge de la PR #750)
**Source :** [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md),
axes 1a, 1b, 1c et 2a.
**Statut :** ✅ livré (PR en cours)
**Demande (utilisateur, 2026-09-30) :** « Ok go » (suite du Lot 0).

## Constat de départ (mesuré)

- `heroKey` est absent de `npc-dialog.js` et de `npcs-*.js` : aucun PNJ ne
  réagit au héros présent.
- `codexVariantNote` sait gérer des notes par héros (`codex.js`), mais **0
  entrée** n'en porte.
- Fin B : une seule ligne générique en solo et une en duo (`endgame.js`,
  `_victorySpeechVariants`) ; aucun arc de héros n'est résolu.
- Aucune réplique entre les deux héros du duo (`hero-barks.js` ignore le
  partenaire).

## Invariants

- Cosmétique et défensif. **Aucun effet mécanique**, aucune branche, aucune
  quête obligatoire (05:700-702, arc « léger »).
- Tout champ absent donne le comportement actuel (zéro régression).
- Ton : 02 (roman jeunesse, pages de 2 à 4 phrases). Les professeurs vouvoient
  les élèves, les élèves se tutoient. Canon respecté (Rogue âpre mais loyal,
  Hagrid chaleureux, Dumbledore bienveillant et énigmatique).
- Voix : aucun OGG n'existe pour ces nouveaux textes. Une page ajoutée est
  **muette**, les OGG existants ne sont jamais joués sur un texte différent.

## Décisions de conception

- **1a — `heroGreeting` sur le PNJ** : `{ <heroKey>: "réplique" }`. Au
  **premier contact** (source `greeting`), la réplique du premier héros du
  groupe qui en a une est **ajoutée en tête** de l'accueil, sans le
  remplacer : certaines premières pages portent l'accroche d'une quête
  (Hagrid, McGonagall, Pomfresh). Helper pur `_heroGreetingLine(npc, heroKeys)`.
  La page ajoutée porte `srcPages = -1`, et `_playPageVoice` saute la voix
  pour un index négatif.
  - Dumbledore : son accueil n'est joué qu'à l'intro (`seenNpcs` marqué dans
    `intro.js`). La reconnaissance de Harry passe donc par son **portrait**
    de l'étage 6 (`portrait_dumbledore`).
- **1b — Codex des héros** : nouvelle condition `hero` (le héros est dans le
  groupe actif ; `ctx.heroKeys`). 16 entrées `heros_<key>` (`personnages`,
  `heroEntry: true`).
  - Version voilée : qui il est et pourquoi il descend.
  - Version révélée par la **victoire** : le dénouement de son arc (05 §5.x).
  - Une fiche verrouillée d'un héros **absent** n'est ni affichée ni comptée
    dans « X / N révélées », sinon la collection deviendrait incomplétable.
  - Plus quelques notes `variants.hero` sur des entrées existantes
    (Dumbledore et Harry, l'Écho de Salazar et les héros de Serpentard).
- **1c — Dénouement dans la fin** : nouvel événement `victoryPayoff` dans
  `HERO_BARKS` (une phrase par héros). `_victorySpeechVariants` reste pur :
  il lit `heroes[i].payoff` et `ctx.pairVictory`, préparés au point d'appel.
- **2a — Répliques de paire** : `HERO_PAIR_BARKS["a|b"]` (clé triée), par
  événement, puis par locuteur. Événements retenus : `allyDown`,
  `tierTransition`, `bossAppear`, `victory`. Résolveur pur
  `pickPairBark(speaker, partner, event, rng)`. Dans `heroBark`, la paire est
  prioritaire quand une réplique existe. La clé de voix reste
  `héros_événement` : elle ne sert qu'au timbre de synthèse, aucun OGG n'existe.
  - 10 paires : Harry/Hermione, Drago/Harry, Cedric/Cho, Drago/Hermione,
    Iris/Louis, Céleste/Margaux, Maxence/Châtillon, Anastasia/Jeanne,
    Agathe/Nathalie, Clairval/Châtillon.

## Étapes

- [x] A1 `codex.js` : condition `hero`, 16 entrées, notes `variants.hero` ;
      `ui-codex.js` : `heroKeys` dans le ctx, masquage et compteur.
      → vérif : units (condition, visibilité).
- [x] A2 `npcs-a/b.js` : `heroGreeting` sur les PNJ ciblés ; `npc-dialog.js` :
      helper, préfixe, voix muette. → vérif : units (helper), smoke (accueil
      de Rogue avec Drago + clé de voix).
- [x] A3 `hero-barks.js` : `victoryPayoff` (16), `HERO_PAIR_BARKS` (10 paires),
      `pickPairBark`, branchement dans `heroBark`. → vérif : units.
- [x] A4 `endgame.js` : `payoff` et `pairVictory` dans le ctx ; rendu.
      → vérif : units existants verts + nouveaux cas.
- [x] A5 MANIFEST du loader (`HERO_PAIR_BARKS`, `pickPairBark`), docs
      (CLAUDE.md, bible 05).
- [x] A6 Tests complets (units, smoke, pwa-smoke, check_*), bump du cache,
      commit, état de la PR, push, PR.

## Journal

- **2026-09-30** — Plan créé.
- **2026-09-30** — A1 à A5 implémentés. Écarts et précisions :
  - 1c : les dénouements vivent dans une table dédiée `HERO_VICTORY_PAYOFF`
    (et non dans un événement de `HERO_BARKS`) : ce n'est pas une réplique
    déclenchée en jeu, `pickHeroBark` n'a pas à la voir.
  - 1a : 10 PNJ (et non 11) couvrent les 16 héros. Rogue répond à 4 héros
    (Drago, Harry, Maxence, Châtillon). En duo, c'est le 1er héros du groupe
    qui a une réplique qui parle.
  - Phrase de Harry réécrite pour rester juste en solo.
  - Réplique d'Iris reformulée (« tu fumes » prêtait à confusion).
  - 1b : 5 notes `variants.hero` ajoutées (Dumbledore : Harry, Hermione ;
    Écho de Salazar : Drago, Maxence, Châtillon).
  - Manifeste du loader : +4 entrées (365 → 369), CLAUDE.md mis à jour.
  - Tests : units §21 (85 assertions : couverture des 16 héros, pureté des
    résolveurs, fin), smoke `scenarioHeroReactivity` (page muette en tête,
    voix de l'accueil conservée, fiches masquées, paire résolue).
  - Bump : 8 assets + `CACHE_VERSION` 274 → 275.

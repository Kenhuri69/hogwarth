# Plan — QA parcours complet (Roadmap Phase 4, item 4)

Branche : `claude/qa-parcours-complet`. Item 4.

## Audit de couverture (smoke `tests/scenarios/`)

Le parcours intro→tutoriel→Acte I-III→victoire→Boucle→Briser le Cycle est
**déjà couvert beat par beat**, mais **tout en solo** et de façon **morcelée**
(état forcé, instances séparées) :

| Beat du parcours | Scénario(s) existant(s) | Solo/Duo |
|------------------|--------------------------|----------|
| Intro Dumbledore / Clé de Voûte | `scenarioCleVouteIntro`, `scenarioKaraokeIntro` | solo |
| Tutoriel (tour guidé) | `scenarioHelpTour` | solo |
| Victoire (trigger + boss final) | `scenarioVictoryTrigger`, `scenarioFinalBossGuaranteed` | solo |
| Discours de victoire (4 Maisons + variantes) | `scenarioVictorySpeechVariants` | solo |
| Entrée en Boucle (Éclats, loopNumber, pivot) | `scenarioDarkLoopV1/V2/V4`, `scenarioCh13EndgamePivot`, `scenarioLoopPassiveXp` | solo |
| Briser le Cycle (boss-miroir → 4 jalons → cinématique → fin) | `scenarioDarkLoopV3` | solo |
| Maisons (signatures, paliers, sets, Apothéose) | `scenarioHouseSignature{Gryffondor,Serpentard,Serdaigle,Poufsouffle}`, tiers… | solo |
| Barks (dont `loopEcho`/`darkLoop`/`darkBoss`) | `scenarioHeroBarks`, `scenarioDarkLoop*` | solo |

**Lacune identifiée** : aucun scénario n'exerce la chaîne endgame **en DUO**,
ni de façon **contiguë** (une seule instance, sans reset entre phases) → risque
de **fuite d'état entre phases** non capté par les tests morcelés.

## Décision
Combler la lacune par **un** scénario bout-en-bout DUO (la couverture solo
restant assurée par les scénarios existants). Documenter la matrice de
couverture.

## Étapes
1. [x] `scenarioFullJourneyDuo` (`tests/scenarios/misc.js`) : UNE instance duo
   (Harry + Hermione, Serpentard, intro déroulée) → vérifie groupe duo →
   entrée Boucle (Éclats) → discours de victoire **des 4 Maisons** → Briser le
   Cycle (3 jalons → choix → cinématique → `cycleBroken` + Codex) → persistance
   save/load (cycleBroken + partySize duo). Vert (`node tests/smoke.js FullJourneyDuo`).
2. [x] Aucune assertion de compte figée (le « 227 » est `scenarios.length` dynamique).
3. [x] Doc : matrice de couverture + ligne roadmap item 4 close (2026-06-19).
4. [x] Garde-fous : full smoke + units + pwa-smoke + check_doc_modules verts.
   tests/ uniquement → **pas de cache-bump** (§8 non applicable).

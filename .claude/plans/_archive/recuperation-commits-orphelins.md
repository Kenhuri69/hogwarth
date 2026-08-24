# Récupération des commits orphelins des branches non fusionnées

## Contexte

L'audit des 661 branches distantes (voir la passe précédente) a isolé **39 branches
portant des commits absents de `master`**, dont 34 hors PR ouverte. Ce plan trace le
triage de leurs ~50 commits orphelins et le rapatriement de ce qui est réellement
récupérable sans régression.

## Méthode de triage

Pour chaque commit orphelin :

1. **Couverture** — part des lignes ajoutées déjà présentes dans la version `master`
   des fichiers touchés. Faible couverture ≠ à récupérer : elle signale surtout une
   *réimplémentation ultérieure* (donc un patch-id différent).
2. **Présence sémantique** — le fichier/symbole introduit existe-t-il dans `master` ?
   (`js/modal-a11y.js`, `js/floor-themes.js`, `_tryGuardCounter`, `resolveSpellForm`,
   `_equipMenuPanel`, `.hub-almanac`…)
3. **Motif de clôture de la PR** — une PR fermée avec un motif documenté
   (« supersédé », « déjà mergé en parallèle », « remplacée par #N », « à la demande
   utilisateur ») est une **décision** : la rouvrir serait la régression à éviter.

## Verdict du triage

| Lot | Commits | Verdict | Motif |
|---|---|---|---|
| Sorts & Magie 2.0 P4a/P4b (corruption, sorts corrompus) | 3 | **écarté** | PR #613 fermée « doublon supersédé » (plan périmé, réimplémenté ailleurs) |
| Potions AOE + IA de soin ennemie | 2 | **écarté** | PR #449 : « implémenté en parallèle et déjà mergé » (flacons à dispersion) |
| Dialogues conditionnels PNJ↔créature ch.09 | 1 | **écarté** | PR #428 : « remplacée par #504 (mergée) » |
| Farming — slot dédié Scamander/Hagrid | 1 | **écarté** | PR #118 : « caduque, déjà dans `master` » (`placedFarmingNpcs`) |
| Tooltip + refonte `bottes_apprenti` | 2 | **écarté** | PR #47 : fermée à la demande utilisateur (qualité insuffisante) |
| Almanach Salle sur Demande (hub) | 1 | **écarté** | `.hub-almanac` déjà dans `css/save-ui.css` + `js/save-ui.js` |
| Refactor `showEquipMenu` | 1 | **écarté** | `_equipMenuPanel` / `_equipRingButtons` déjà dans `master` |
| Combat V2 (riposte, double-garde, Ferula Maxima), UX sorts, karaoké, floor-themes, isolation de modale, synergie artefact↔sort | 6 | **écarté** | features présentes dans `master` (symboles vérifiés) |
| Fiche perso — scroll desktop, teaser set, layout 3 colonnes | 6 | **écarté** | présents dans `master` |
| Re-calibrages `DIFFICULTY_*` + `sim-difficulty.js` (mai 2026) | 5 | **écarté** | contrediraient la calibration courante documentée |
| Entrées `CHANGELOG.md` Phase 3 (commit par commit) | 2 | **écarté** | `CHANGELOG.md` de `master` est explicitement « curaté par thèmes, pas commit par commit » |
| Packs de voix comparatifs (`audio/voice/_test/`) | 4 | **écarté** | artefacts jetables ; les voix retenues (Andrew/Florian) sont déjà dans `master` |
| Mockups HTML d'audit HUD / party-card | 4 | **écarté** | brouillons de design ; la feature livrée est dans `master` |
| Intégration PNG monstres C24/C26/C27/C29, portraits Slughorn / Marchand d'Ombre, médaillon Anastasia | 7 | **écarté** | PNG déjà dans `img/` sur `master` |
| Fixture `endgame-test-save.json` (escalier près de Voldemort) | 1 | **écarté** | bidouille de confort de test ; altère une fixture partagée |
| Schéma d'architecture GAB/GCS/BI (PlantUML + draw.io) | 1 | **écarté** | **hors projet** — travail bancaire committé par erreur dans ce dépôt |
| **Ch.14 §14.3.2 P2-ext — lignes post-victoire** | **1** | **RETENU** | mécanisme présent, contenu absent : purement additif |

Un seul commit survit au triage : **`f91c9ec1`** (PR #481, mergée sans lui).

## Ce qui est rapatrié

`f91c9ec1` étend la « ligne après » post-victoire à 4 PNJ recyclés en Boucle qui en
étaient dépourvus. Le résolveur pur `pickPostVictoryLine` et le wrapper
`_postVictorySuffixPages` **existent déjà** dans `master` (`js/npc-dialog.js`) : le
commit n'ajoute que des **données** + des assertions de test.

- Gardien de la Boucle — beat victoire-spécifique (son greeting ne parle que de la
  Boucle générique).
- Marchand Clandestin (ét. 8/18), Apothicaire Ténébreux (9/19), Forgeron Ténébreux
  (10/20) — registre mercantile : le négoce survit à la guerre.

### Port nécessaire (≠ cherry-pick)

Le commit vise `js/npcs.js` d'avant le découpage du Lot C P3.3. Les 4 PNJ vivent
désormais dans **`js/npcs-b.js`**. Le cherry-pick direct conflicte ; les additions
sont donc reportées à la main aux bons ancrages (après `darkLoopLines`, avant
`dialogues:`).

## Étapes

1. [x] Triage des ~50 commits orphelins (couverture + présence sémantique + motif de clôture)
2. [x] Plan écrit
3. [x] Porter les 4 blocs `postVictoryLines` dans `js/npcs-b.js`
       → vérif : `grep -c postVictoryLines js/npcs-b.js` passe de 3 à 7
4. [x] Porter les assertions de `scenarioNpcPostVictory` (`tests/scenarios/npc.js`)
       → vérif : le scénario contrôle Gardien ét. 11 + vendeur ét. 9 (présent) / 19 (muet)
5. [x] Mettre à jour la doc (`docs/histoire/14-scenarios-de-fin.md`, plan ch.14)
       → vérif : §14.3.2 mentionne les PNJ étendus
6. [x] Bump cache PWA (`npcs-b.js` v6→v7 dans `index.html` + `sw.js`,
       `CACHE_VERSION` v272→v273)
       → vérif : `check_cache_versions.js` exit 0, `check_doc_modules.js` exit 0
7. [x] Non-régression
       - `node tests/units.js` → ✅ 1147 assertions
       - `node tests/smoke.js NpcPostVictory LoopDarkSuffix NpcIntegration Vendors` → ✅ 4/4,
         `hasFieldsExt: true`, `vendorSurfaceVictory: 1` / `vendorDeepLoop: 0`, `gardienVictory: 1`
       - `node tests/pwa-smoke.js` → ✅ SW `hogwarth-v273`, 109 entrées, chargement offline OK
       - `node tests/smoke.js` (suite complète) → ✅ **285 scénarios passés**, exit 0
8. [x] Commit + push + PR draft

## Résultat

Diff final : 5 fichiers, +75/−7 (le commit d'origine faisait +131 : les 56 lignes
destinées à `.claude/plans/chapter-14-endings.md` ne s'appliquent plus, ce fichier
ayant évolué depuis juin 2026 — l'apport de fond, lui, est intégral).

## Écarts constatés

- Le clone de session était *shallow* (2 grafts) : `git merge-base` mentait
  (627 faux « histoires non liées »). `git fetch --unshallow` était un prérequis.
- La suppression des 621 branches fusionnées **n'a pas pu être faite** depuis cette
  session : le proxy git refuse la suppression de ref (403 sur le POST
  `git-receive-pack`) et l'API GitHub `git/refs` est interdite en écriture. Un script
  local a été livré à l'utilisateur.
- Ratio final : 1 commit récupérable sur ~50 orphelins. L'écrasante majorité du
  travail « perdu » avait en réalité atterri dans `master` par une autre PR, ou avait
  été explicitement écartée.

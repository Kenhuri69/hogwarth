# Plan — Clôture des plans restés ouverts (2026-08-24)

**Branche :** `claude/close-open-plans-hrwmpx`
**Statut :** ✅ clos — 34 plans archivés, 18 laissés actifs (2026-08-24).
**Périmètre (utilisateur, 2026-08-24) :** « traiter les plans restés ouverts pour
les clôturer ». Suite des conventions `plans-archiving-workflow.md` (rangement) et
`plan-status-tracking.md` (tri ouverts/finis). **Doc-only — aucun code de jeu touché.**

## Critère appliqué (hérité, assumé)

1. Toutes les cases cochées → **archiver**.
2. Seules cases ouvertes = **étapes process** (commit / push / PR / cache-bump /
   lancement de tests) **et** livraison vérifiée dans le code de `master` →
   cocher (reflet du réel) puis **archiver**.
3. Doc sans case (`0/0`) → décision manuelle : archivé seulement si la livraison
   est vérifiée dans le code/les assets.
4. Reste du **vrai travail** non livré, ou spec/backlog/roadmap vivant → **actif**.

> Base de vérification : `HEAD == origin/master` (5c90894, PR #748). Les PR
> #743→#746 (lots 4-7) sont mergées.

## Vérifications de livraison (code, pas déclaratif)

| Plan | Preuve dans `master` |
|------|----------------------|
| `ch14-impl-ending-variants` | `js/endgame.js:39-47` bloc (b) + `ctx.heroes` (l.366) ; `css/style.css:2813` `.victory-speech-heroes/-wink` |
| `title-cover-desktop-fix` | `css/style.css:225` `max-height: min(64vh, 620px)` |
| `qa-parcours-complet` | `tests/scenarios/misc.js:679` `scenarioFullJourneyDuo` ; roadmap Item 4 ✅ |
| `founder-chamber-guardians` | `js/monsters-high.js` `gardien_{lion,serpent,aigle,blaireau}` + 4 PNG `img/monsters/` |
| `house-generation-bias-v2-rooms` | `js/floor-ambiance.js:425` `houseRoomBias` + câblage `js/dungeon.js:492-495` + MANIFEST loader |
| `house-gen-bias-2c` | `js/battle-ui.js:11-18` `HOUSE_SKIN_ENABLED`/`houseSkinClass` + `css/style.css:2883+` |
| `ch13-equilibre` | `docs/histoire/13-…md` — 6 simulations nommées (l.500-715) |
| `endgame-fresh-A1/A2` | `js/monsters-high.js` faune `minFloor` 13/14/15/16 + `antecesseur` (l.1308) |
| `p32-ending-break-audio` | `audio/ending_break.ogg` (264 Ko) |
| `p35-darkloop-variants` | `js/hero-barks.js` — pools `darkLoop` multi-répliques (18 occurrences) |
| `spell-icons-p3/p4` | `js/item-icons.js` — slugs P3 (icône + splash) présents |
| `voix-manon-elara` | 7 OGG `audio/voice/{manon,elara}_*.ogg` |
| `narrative-doc-reconciliation` | CLAUDE.md documente les 98 modules (verrou `check_doc_modules.js`) |
| `lot4/5/6/7` | PR #743 / #744 / #745 / #746 mergées (`activeParty`/`livingParty`, runner smoke parallèle, 13 items, 9 classes CSS mortes) |
| `roadmap-phase-3-4-closure` | Items 1-5 tous ✅ (2c : pondération de salles livrée ensuite par `house-generation-bias-v2-rooms`) |

## 34 plans clôturés (archivés)

**Cases toutes cochées (9)** : escape-game-traps · icon-quality-rework-frameless ·
lot1-quick-wins · lot2-lint-et-rangement · lot3-verbes-de-quete · lot4-slots-equipement ·
lot5-smoke-parallele · recuperation-commits-orphelins · plan-status-tracking.

**Case process cochée après vérification (9)** : ch13-equilibre ·
ch14-impl-ending-variants · title-cover-desktop-fix · qa-parcours-complet ·
founder-chamber-guardians · house-generation-bias-v2-rooms · lot6-helpers-a3-a4 ·
lot7-css-morte-poids-depot · plans-archiving-workflow.

**Docs `0/0` vérifiés livrés (16)** : achievements-D · glossary-D3 ·
dot-differentiation-B3 · endgame-fresh-A1/A2/A3/A4 · quick-wins-2026-07 ·
p32-ending-break-audio · p35-darkloop-variants · spell-icons-p3 · spell-icons-p4 ·
narrative-doc-reconciliation · house-gen-bias-2c · voix-manon-elara ·
roadmap-phase-3-4-closure.

## 17 plans laissés actifs (vrai reste)

| Plan | Ce qui reste |
|------|--------------|
| `perf-optimization` | 15 cases — aucune mesure faite (chantier non lancé) |
| `code-review-improvements` | 13 cases — items UX/archi 2.1→3.5 |
| `spell-filter-chips-keyboard` | 3 cases — chips → `button` a11y, scénario, cache-bump |
| `parallel-worlds` | roadmap V1a (phase C) + V2 + co-op gelé |
| `asset-quality-rework` | Lot D (sorts 48²→128²), optionnel |
| `revue-design-progression-2026-07` | 1.4 Sirius (❓ en attente) · 2.5b éveil d'artefact reporté |
| `revue-sources-contenu-2026-07-28` | arbitrage utilisateur E1→E4 + conversion en plans |
| `game-evolution-review-2026-07` | thèmes C1/C2, D1, E1 jamais ouverts |
| `immersion-suite-4` | L2 (révélation de coffre) non livré |
| `chapters-04-10-lieux-ambiance` | Étape 2 = cadre de spec non implémenté |
| `chapter-14-endings`, `combat-system-synthesis`, `content-replayability`, `quest-system-revision`, `final-polish-2026-07` | specs/backlogs vivants |
| `reliquats-backlog` | tracker vivant par nature |
| `balance-proposals-2026-05` | propositions en attente d'arbitrage |

## Étapes

1. [x] Auditer les 51 plans (cases + statuts + preuve code).
2. [x] Écrire ce plan.
3. [x] Cocher les cases process des 9 plans vérifiés livrés (reflet du réel).
4. [x] `git mv` des 34 plans vers `_archive/`.
5. [x] Réparer les liens markdown cassés par le déplacement.
6. [x] `node tests/units.js` vert → **1 147 assertions** ; `check_doc_modules.js` ✓ (98 modules).
7. [x] Commit + push + PR draft (§6 : vérifier l'état de la PR avant push).

## Garde-fous

- Doc-only (`.claude/**.md`, `docs/**.md`, `CLAUDE.md`) → **pas de bump cache PWA**
  (guidelines §8 non applicable), smoke non requis (§7) ; `units.js` par courtoisie.
- Surgical (§3) : déplacements + retouches de liens. On ne réécrit pas les plans,
  on ne coche que des cases dont la livraison est prouvée ci-dessus.
- Les commentaires `// Cf. .claude/plans/<plan>.md` dans `js/` restent inchangés
  (les éditer imposerait un bump cache pour zéro valeur) — précédent assumé par
  `plans-archiving-workflow.md`.

## Liens markdown réparés (cassés par CE déplacement)

- `CLAUDE.md` ×2 : `escape-game-traps.md`, `lot4-slots-equipement-2026-07-28.md` → `_archive/`.
- `revue-sources-contenu-2026-07-28.md` ×1 : `lot3-verbes-de-quete` → `./_archive/`.
- `docs/release-checklist.md` ×1 : `qa-parcours-complet` → `../.claude/plans/_archive/`.
- Liens **sortants** des fichiers déplacés (profondeur d'un cran) : `lot1/lot2/lot3`
  → `../revue-sources-contenu-…`, `p32`/`p35` → `./rc-polish-remaining.md` et
  `../../../docs/…`.

> **Non touché (préexistant, §3 surgical)** : un scan complet du dépôt relève
> ~60 liens `.md` cassés par les passes d'archivage **antérieures**
> (`immersion-suite-4` ×9, `rc-polish-remaining`, `session-launch-prompts`,
> `artifacts-reliquary-system`, `DIFFICULTY_REPORT`, `IMG_STYLE`…). Aucun n'est
> causé par ce lot. À traiter dans une passe « liens » dédiée si souhaité.

## Journal

- **2026-08-24** — Audit des 51 plans, 34 clôturés (dont 9 par cochage de case
  process vérifiée dans le code), 18 laissés actifs. Doc-only : aucun `js/`,
  `css/`, `index.html` ni `sw.js` touché → pas de bump de cache PWA (§8 N/A).

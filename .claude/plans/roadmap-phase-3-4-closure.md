# Roadmap Phases 3 & 4 — clôture des items restants

> Plan vivant (guidelines §5). Un item = une branche = une PR = squash-merge.
> Source : `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` (Phase 3 §190+, Phase 4 §203+).
> Méthode : AUDIT doc↔code AVANT d'écrire. Beaucoup d'items sont déjà livrés
> (doc en retard) → réconciliation, pas du neuf.

## Item 1 — Héritage / NG+ cosmétique opt-in (Phase 3) — DOC-ONLY

**Audit (2026-06-18)** : DÉJÀ LIVRÉ.
- `js/profile.js` complet : profil persistant `hogwarts_rpg_profile` (titres,
  Codex du Sorcier, fins vues), zéro stat héritée. Câblé `index.html?v=3`,
  MANIFEST loader (`getPlayerProfile`/`recordEndingToProfile`/`ngPlusAvailable`/
  `openWizardCodex`).
- NG+ « vrai » : `ngPlusScaling()` + constantes `NGPLUS_*` (`dungeon-scaling.js`),
  cran = victoires plafonné `NGPLUS_CAP`, zéro héritage joueur.
- Tests : `units.js §11quater` (computeProfileTitles / profileTopTitle).
- Ch.14 §14.6.3 / §E déjà réconciliés (✅ livré).

**Reste** : la table Phase 3 (roadmap) affiche encore 🟡 non-clos + §1.4 💡4
en 💡 proposé. → réconciliation roadmap.

- Étape 1 : marquer Phase 3 row « Héritage / NG+ » ✅ Fait (2026-06-18). → verify: ligne barrée + renvoi profile.js
- Étape 2 : §1.4 💡4 → ✅ Livré. → verify: statut ✅
- Vérif : `node tools/check_doc_modules.js` exit 0 (doc-only, pas de cache bump, smoke non requis §7/§8).

## Item 2 — Décisions ❓ endgame (Phase 3) — ARBITRAGE USER
Arbitrage (2026-06-19, AskUserQuestion) : les 3 tranchées **OUI**. Livré en 3 lots/PRs.
- **2a — barks Ténébreux supplémentaires** ✅ : couche `darkBossDown` (16 héros,
  clôture symétrique à la re-défaite d'un boss Ténébreux). `hero-barks.js` +
  `battle-rewards.js` (endBattle). Testé `units.js §1bis`. cache-bump v164
  (hero-barks v11, battle-rewards v11). smoke 226 ✅, units 686 ✅, pwa ✅.
  Doc 11 §11.9.2 ✅, roadmap row (a). **Mergé** (PR #579, 2026-06-20).
  → branche `claude/endgame-dark-boss-down-barks`.
- **2b — « ce qui dort » personnifié (entité nommée)** ✅ : nom arbitré
  (AskUserQuestion 2026-06-19) = **« Le Dormeur des Fondations »**. Entrée Codex
  `le_dormeur` (glossaire, robinet 3-temps victory → floor 21 → floor 28) +
  2 `floorLines` nommées au palier `before` (21+) de `floor-ambiance.js`. PAS de
  boss combat (scope art). Testé `units.js` (codex §8 + ambiance §5). cache-bump
  v165 (codex v14, floor-ambiance v12). Doc 10 §10.3/§10.5 + doc 11 §11.10 ✅.
  → branche `claude/endgame-dormeur-fondations` (PR #580).
- **2c — biais léger de génération par Maison** ✅ (levier cosmétique) : arbitrage
  user (2026-06-20) = **skin visuel de Maison**. Livrée cosmétique sur les cartes
  d'ennemi en combat (`houseSkinClass` + flag `HOUSE_SKIN_ENABLED`, `battle-ui.js` ;
  aura CSS palette de Maison, `style.css`), pilotée par `chosenHouse`.
  **Power-neutral par construction** (rendu seul → 0 stat/butin/spawn, 0 sim
  requis). Testé `units.js` (4 Maisons + flag off + inconnu). cache-bump v166
  (battle-ui v8, style v44). Doc 10 §10.6 ✅. **Pondération de salles différée**
  derrière le gate sim de l'Item 3. → branche `claude/endgame-house-gen-bias`.
  Plan détaillé : `.claude/plans/house-gen-bias-2c.md`.

## Item 3 — Pass d'équilibrage de release (Phase 4) ✅
**Audit (2026-06-20)** : DÉJÀ LIVRÉ. `tools/sim-difficulty.js` (sim Monte-Carlo
pur) + `tools/check_difficulty.js` (garde-fou baseline vs `DIFFICULTY_REPORT.md`
§3) existent **et tournent en CI** (`.github/workflows/test.yml`, mode strict
`--base` en PR). **Balance verte sur master** : `node tools/check_difficulty.js`
→ « aucun étage ne dérive de plus de 10 pts vs la baseline » (0 dérive).
→ Pass de release satisfait ; aucune recalibration nécessaire.
> NB : la sim **par Maison** (gate du levier « pondération de salles » différé de
> l'item 2c, doc 10 §10.6) reste un chantier futur — la fonctionnalité de
> génération biaisée n'existe pas encore, donc rien à simuler tant qu'elle n'est
> pas écrite. Correctement gardé.

## Item 4 — QA parcours complet (Phase 4) ✅
**Audit (2026-06-20)** : DÉJÀ LIVRÉ (2026-06-19). Lacune comblée par
`scenarioFullJourneyDuo` (`tests/scenarios/misc.js`) — chaîne contiguë en DUO
dans une seule instance : intro → groupe duo → entrée Boucle → discours de
victoire des 4 Maisons → Briser le Cycle → persistance save/load, avec
garde-fou anti-fuite d'état entre phases. Roadmap Phase 4 row ✅. Plan :
`.claude/plans/qa-parcours-complet.md`.

## Item 5 — Garde-fous release (Phase 4) ✅
**Audit (2026-06-20)** : DÉJÀ LIVRÉ (2026-06-19, sign-off PR #581) et
**re-vérifié vert sur master ce jour** après les 3 lots de l'item 2 :
- `node tools/check_cache_versions.js --base origin/master` ✅
- `node tools/check_doc_modules.js` ✅ (86 modules)
- `node tests/units.js` ✅ **703** (était 684 ; +19 : darkBossDown, le_dormeur, houseSkin)
- `node tests/pwa-smoke.js` ✅
- `node tools/check_difficulty.js` ✅ (0 dérive)
- `node tests/smoke.js` ✅ **227 scénarios**
Les 6 garde-fous tournent en CI à chaque PR. Plan :
`.claude/plans/release-guardrails-signoff.md`.

---

## 🏁 Clôture Phases 3 & 4 (2026-06-20)
Tous les items du plan sont **livrés et mergés** :
- Item 1 (Héritage / NG+) ✅ · Item 2 (décisions ❓ endgame) ✅ — lots 2a (#579),
  2b (#580), 2c (#583) · Item 3 (équilibrage) ✅ · Item 4 (QA e2e) ✅ ·
  Item 5 (garde-fous) ✅.
- **Seul reste différé** : le levier « pondération de salles » de l'item 2c
  (gate sim par Maison) + le **hors-scope art** ci-dessous (session dédiée).

### Hors-scope (art, session dédiée)
- Art PNG des 4 boss-gardiens.
- Pass d'assets de fin (illustrations victoire, SFX, fonds Codex).

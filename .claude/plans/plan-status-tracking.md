# Plan — Tri des plans : ouverts vs finis (archivage)

**Branche :** `claude/plan-status-tracking-3ihv1h`
**Statut :** 🟩 en cours
**Périmètre (utilisateur, 2026-06-22) :** « trier ouverts vs finis » — auditer
les plans de `.claude/plans/`, **archiver** dans `_archive/` ceux dont **toutes
les étapes sont cochées** (`open=0, done>0`), **laisser actifs** ceux qui ont
encore des cases `[ ]`. Suite de la convention `plans-archiving-workflow.md`.
**Doc-only — aucun code de jeu touché.**

## Audit (cases `[ ]`/`[x]` par fichier)

- **Finis (à archiver)** : 31 plans avec `open=0, done>0`.
  → 1 exclu : `chapters-04-10-lieux-ambiance` (cases cochées mais « Étape 2
    spécifiée » = cadre de spec non implémenté ; gardé actif par l'ancien
    workflow). → **30 archivés**.
- **Ouverts (laissés)** : tout plan avec ≥1 case `[ ]` (ex. doc-status-banners,
  code-review-improvements, audit-polish-rc, ux-polish-review,
  parallel-worlds, founder-chamber-guardians, etc.).

> **Suivi 2 (2026-06-22, demande « go ch13-impl-* ») :** les 4 `ch13-impl-*`
> (p1/p2-xp-loop/p3-refuges/p4-logger) n'avaient qu'une case ouverte — le
> « Commit + push » final, factuellement accompli (livrés & mergés : P2
> `LOOP_PASSIVE_XP_FRAC`, P3 `drawRefugeSprite`, P4 #629 `balance-log.js`).
> Case cochée (reflet du réel) → **4 archivés**. Lien `ch13-equilibre.md`
> (resté actif) repointé vers `_archive/`.

> **Suivi 3 (2026-06-22, « go » docs sans cases) :** tri des docs `0/0` (pas
> de checkbox). **10 archivés** car clos/livrés (vérifiés code+assets) :
> `artifacts-reliquary-system` (LOT clos), `artifacts-p1-gemini-prompts`
> (consommé), `margaux-aiglebrume` (héros en code), `ergonomics-improvement`
> (CLOS), `modal-isolation` (ModalA11y), `inventory-keyboard-nav` (Ph.1&2),
> `baguette-if-boucle-png` (PNG présent), `player-medallion-images` (PNG),
> `configurable-keybindings` (✅ livré #—), `codex-mobile-list-layout`
> (css/codex.css:32). Liens transfrontières repointés : potions-2.0,
> docs/artifact-balance-study, tools/ICON_SHEET_PROCEDURE, tools/raster_src/README.
> **Gardés actifs** (specs vivantes / roadmaps / restes) : combat-system-synthesis,
> spells-magic-system, potions-consumables-craft-2.0, content-replayability,
> chapter-14-endings, house-gen-bias-2c, narrative-doc-reconciliation,
> p35-darkloop-variants, spell-icons-p3/p4, immersion-suite-4, reliquats-backlog,
> rc-polish-remaining, roadmap-phase-3-4-closure, balance-proposals-2026-05.
- **Sans cases (`0/0`, non trackés)** : ~27 docs de spec/référence/prompts
  (combat-system-synthesis, spells-magic-system, nano-banana-prompts-*,
  reliquats-backlog…). **Non archivés** : pas d'étapes à évaluer → décision
  manuelle hors de ce critère. Listés en notes.

> **Suivi 4 (2026-06-22, après merge #675, branche followup) :** 18 plans dont
> la SEULE case ouverte était l'étape process (« Commit → push → PR → merge »),
> tous marqués « déjà livré » et vérifiés livrés/mergés (code : 16 persos
> `data-characters.js`, `forge.js` reroll, écho-codex…). Case process cochée
> (reflet du réel) → **18 archivés** : biais-maison-v2, boucle-mondes-paralleles-rule,
> ch09-npc-creature-dialogues, ch14-conditional-endings-reconcile,
> ch14-impl-grande-salle, codex-mondes-paralleles-onglet, codex-temporal-echoes-corrupted,
> dark-boss-barks, endgame-enchant-reroll, extension-checklists-crosslink,
> founder-chamber-guardians-lot3, gameplay-docs-uplift, new-aube-heroes,
> phase2-ending-variants-reconcile, release-balance-pass, release-guardrails-signoff,
> signature-echo-loop-reconcile, single-target-spell-scaling. Liens repointés :
> docs/REVUE-TRANSVERSALE-ET-ROADMAP ×2, roadmap-phase-3-4-closure ×1.
> **Exclu** : `house-generation-bias-v2-rooms` (case ouverte = « cache-bump +
> tests » = gate technique, pas process → gardé actif par prudence).

> **Suivi 5 (2026-06-22, finition) :** 2 plans récents (base master était très
> en retard) finis & livrés → archivés : `mobile-endgame-chips`
> (`#hud-endgame-chips` index.html:502 + css/style.css:4578) et
> `doc-status-banners-index` (seule case = process ; bandeaux ×11 + index README
> livrés). **Tri par statut épuisé** : les 39 plans restants ont du vrai travail
> non livré (audit-polish-rc, perf-optimization, ux-polish-review,
> code-review-improvements, loop-npc-quests-suivi3, nano-banana-prompts-boucle-bosses,
> spell-filter-chips-keyboard…) ou sont des specs/backlogs/roadmaps vivants
> (combat-system-synthesis, spells-magic-system, parallel-worlds, reliquats-backlog,
> roadmap-phase-3-4-closure…) — laissés actifs à dessein.

## 30 plans archivés

align-ch11-briser-cycle · artifact-balance-analysis · artifact-remediation ·
asset-png-review · boss-localization-reconcile · boss-lumiere-heraut-aube ·
ch11-loop-definition-links · ch12-codex-reconciliation · ch14-endings-reconciliation ·
codex-reveal-layers · combat-rune-ui-fix · cover-and-icon-rework ·
dark-loop-scaling-review · defringe-gardiens · endgame-decisions-tranchees ·
enjeu-intime-heros · image-assets-audit-2026-06 · keyboard-nav-shop-bestiary-codex ·
level-11-npc-quests · library-t5 · loop-npc-quests-followup · manon-acte3-dialogues ·
ngplus-real · p33-data-split · pvp-duel-live · reconcile-claude-md ·
room-of-requirement-shop-fix · room-presentation-startup-ux ·
signature-roadmap-reconcile · unsellable-items-dissolution

> `keyboard-nav-shop-bestiary-codex` : en-tête « en cours » périmé — corps
> « livrées, mergées » + 4/4 cases cochées → archivé.

## Liens markdown réparés par le déplacement

- `CLAUDE.md` : `.claude/plans/dark-loop-scaling-review.md` → `…/_archive/…`
- `loop-npc-quests-followup.md` (déplacé) : `.claude/plans/level-11-npc-quests.md` → `…/_archive/…`
- `nano-banana-prompts-artifacts-lot-e.md` : lien `artifact-remediation.md` → `./_archive/…`
- `reliquats-backlog.md` ×3 : `library-t5` / `pvp-duel-live` / `manon-acte3-dialogues` → `./_archive/…`
- `rc-polish-remaining.md` : `p33-data-split.md` → `./_archive/…`

> Mentions en code-span (non-liens) laissées telles quelles (surgical) :
> `content-replayability.md`, `spell-filter-chips-keyboard.md`,
> `ergonomics-improvement.md`, `docs/playtest-3-boucles.md` — les fichiers
> restent trouvables dans `_archive/`.

## Étapes

1. [x] Écrire ce plan de suivi.
2. [x] `git mv` des 30 plans vers `_archive/`.
3. [x] Réparer les 7 liens markdown (5 fichiers : CLAUDE.md, loop-npc-quests-followup, nano-banana-…-lot-e, rc-polish-remaining, reliquats-backlog ×3).
4. [x] `node tests/units.js` reste vert (non-régression doc).
5. [x] Commit + push sur la branche désignée (§6 : pas de PR pré-existante).

## Garde-fous

- Doc-only (`.claude/**.md` + `docs/**.md` + `CLAUDE.md`) → pas de bump cache
  PWA (§8 N/A), smoke non requis (§7) ; `units.js` par courtoisie.
- Surgical (§3) : déplacements + retouches de liens uniquement, on ne réécrit
  pas les plans.
- Critère strict assumé : 1 case `[ ]` (même « commit/push » final) = ouvert.

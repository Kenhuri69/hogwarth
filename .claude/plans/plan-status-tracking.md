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
  ch13-impl-*, code-review-improvements, audit-polish-rc, ux-polish-review,
  parallel-worlds, founder-chamber-guardians, etc.).
- **Sans cases (`0/0`, non trackés)** : ~27 docs de spec/référence/prompts
  (combat-system-synthesis, spells-magic-system, nano-banana-prompts-*,
  reliquats-backlog…). **Non archivés** : pas d'étapes à évaluer → décision
  manuelle hors de ce critère. Listés en notes.

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

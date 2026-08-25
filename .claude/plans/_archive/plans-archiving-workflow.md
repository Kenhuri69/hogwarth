# Plan — Rangement & archivage des plans terminés

**Branche :** `claude/plans-archiving-workflow-vxproq`
**Statut :** ✅ clos — convention appliquée et rangement effectué ; archivé le 2026-08-24.
**Périmètre validé (utilisateur, 2026-06-12) :** **rangement seul** — archiver les
plans livrés & mergés (déplacement vers `.claude/plans/_archive/`), mettre à jour
les statuts stale, laisser actifs les vrais backlogs/roadmaps en cours. **Aucune
modification de code de jeu.**

## Constat

37 plans actifs dans `.claude/plans/`. Audit (cases `[ ]`/`[x]`, en-têtes de
statut, dernières PRs mergées) → la grande majorité est **livrée & mergée** mais
n'a jamais été déplacée vers `_archive/`. Quelques-uns sont des statuts/cases
simplement pas à jour (le code confirme la livraison).

## À archiver (30 — livrés & mergés)

ambiance-chambre-maison · ambiance-zone-d-fx (P-D4 #450) · ch05-ch08-implementation
(barks L1-L7 #423) · ch09-bestiaire-impl (#426) · ch09-bestiaire-lore · ch12-codex ·
ch12-codex-impl (#463) · chapter-11-dark-loop (#465) · combat-buff-badges ·
content-audit-stabilization · coupon-automation · dungeon-map-expansion (MAP_W=16,
ROOM_COUNT=7, SPINE_LEN=4 confirmés dans le code) · forge-t5 (#452) ·
immersion-k1/k2/k3/k4 (#429/#430/#432/#443) · immersion-l1/l3 (#433/#444) ·
immersion-m1 (#440) · immersion-n1/n2 (#435/#445) · immersion-suite-3 ·
nano-banana-prompts-heroes-olivier-agathe · potions-aoe-enemy-use ·
quetes-signature (#442) · refactor-equip-menu (#470) · refuge-poufsouffle ·
scripted-floor-beats (#427) · session-launch-prompts

### Statuts stale corrigés avant archivage
- `ambiance-zone-d-fx` : « 🟧 En cours » → livré (P-D4 mergé #450).
- `dungeon-map-expansion` : « 🟡 EN COURS » → livré + cases cochées (code confirmé).
- `ch05-ch08-implementation` : 3 cases doc « barks » cochées (section présente dans
  la skill `add-playable-character`).

## Gardés actifs (7 — vrais backlogs / restes)

- `code-review-improvements.md` — backlog d'audit frais (22 items, daté 2026-06-12).
- `parallel-worlds.md` — roadmap V1a/V2 (explicitement future).
- `reliquats-backlog.md` — tracker vivant par nature.
- `balance-proposals-2026-05.md` — propositions chiffrées en attente d'arbitrage.
- `ch05-ch08-narrative-finalization.md` — ÉTAPE 2 (flags/dialogues conditionnels)
  différée, en attente de validation.
- `chapters-04-10-lieux-ambiance.md` — ÉTAPE 2 = cadre de spec référencé.
- `immersion-suite-4.md` — item **L2 (révélation de coffre)** non livré ; M2 optionnel.

## Étapes

1. [x] Auditer l'état réel des 37 plans (cases, statuts, PRs). → vérif : cartographie.
2. [x] Cadrer le périmètre avec l'utilisateur. → vérif : « rangement seul ».
3. [x] Corriger les statuts stale (3 plans). → en-têtes ambiance-zone-d-fx / dungeon-map / ch05-ch08-impl à jour.
4. [x] `git mv` des 30 plans vers `_archive/`. → plans/ ne garde que les 7 backlogs + ce plan.
5. [x] Réparer les liens markdown cassés par le déplacement (purs docs, sans coût cache) :
       CLAUDE.md ×1, docs/histoire ×4, SKILL.md ×1, reliquats-backlog ×4. → liens valides.
6. [x] Non-régression doc : `node tests/units.js` → ✅ 442 assertions.
7. [x] Commit + push branche désignée. → vérif : §6 état branche.

### Références NON modifiées (choix assumé)
~21 commentaires `// Cf. .claude/plans/<plan>.md` dans `js/` pointent encore vers
l'ancien chemin actif. **Volontairement laissés** : les éditer toucherait du JS
servi → bump cache PWA obligatoire, hors périmètre « rangement seul, aucune modif
de code de jeu ». Les plans existent toujours (dans `_archive/`). À regrouper dans
un éventuel passage front ultérieur si souhaité.

## Notes

- Changement **purement documentaire** (déplacements + retouches `.md`) : aucun
  `js/`/`css/` touché → **pas de bump cache PWA** (guidelines §8 N/A), smoke test
  non requis (§7) ; `units.js` lancé par courtoisie de non-régression.

# Mise à jour des outils de simulation (difficulté + économie)

**Branche** : `claude/simulation-tools-update-fjVnQ`
**Date** : 2026-05-30
**Statut** : ⏳ En cours — plan vivant (§5 des guidelines).

Périmètre validé par l'utilisateur (AskUserQuestion) :
- **Tout** : réparer + enrichir `sim-difficulty.js`, créer `sim-economy.js`, MAJ rapports/doc.
- **Économie** : couvrir courbe d'or net + sinks endgame **et** accessibilité des items.

---

## 0. Constat de départ

| Outil | État |
|-------|------|
| `tools/sim-difficulty.js` (1397 l.) | **CASSÉ** : `QUEST_TEMPLATES` extrait vers `js/quests-templates.js`, le loader vm plante. + ~8 écarts de modélisation. |
| Économie | **Pas d'exécutable** — seulement l'audit `.claude/plans/game-economy-gold-audit.md` (1086 l.), dont plusieurs propositions ont depuis été implémentées. |

---

## 1. sim-difficulty.js — écarts identifiés (agent d'audit)

| # | Sév. | Écart | Fix |
|---|------|-------|-----|
| 0 | 🔴 Blocker | `QUEST_TEMPLATES` introuvable (déménagé) | Charger `js/quests-templates.js` dans le vm |
| 1 | 🟠 | `stun` (8 monstres) + `fear` (9) non modélisés | stun = saut 1 tour héros ; fear = 50 % saut/tour |
| 2 | 🟠 | Pas de `--difficulty` | `scalingMultiplier` (toutes stats) + `enemyGroupMultiplier` + `xpMultiplier` par mode |
| 3 | 🟠 | resist/weak matché sur `effect` au lieu de `element` | Matcher sur `spell.element` ; dériver la liste de sorts dynamiquement |
| 4 | 🟠 | `dispel` absent (6 monstres) ; `weaken` permanent | Ajouter case dispel (sinon attaque phys.) ; weaken cap 3 + temporaire |
| 5 | 🟡 | Set 4pc effets (`spellLifesteal` 0.10, `spellCostReduction` 0.10) absents | Ajouter au modèle de set |
| 6 | 🟡 | Forge : fallback crit/dérivées ignoré ; Library : `spellPaths` (power vs focus) | Aligner sur `forge.js` / `library.js` |
| 7 | 🟡 | Série Apothéose ★ N (tier 19+) non modélisée | Flag `--star=N` via `_starGeneratorBonus` |
| 8 | ⚪ | Doc : 67 monstres (CLAUDE.md dit 54) | MAJ doc |

### Features récentes à intégrer (agent #2 — en cours)
- LOT B : IA ennemie par tempérament + **phases de boss** (seuils PV).
- LOT C.1 : **équipement à compromis** (bonus + malus) → le best-in-slot « somme des bonus positifs » se trompe.
- À compléter dès retour agent #2.

---

## 2. sim-economy.js — nouvel outil (à créer)

Opérationnalise `game-economy-gold-audit.md` en simulation exécutable.

**Revenus** (par étage, pondérés `weight`, scaling + `goldMultiplier`) :
- Drops monstres (`scaleMonster` gold), coffres (`rand*30+10 × floor`), coffre énigme,
  fouille (`rand*15+5`), autel (`+20×floor`, 50 %), quêtes (templates), vente d'équip.
- Variantes shiny ×2, boucle ténébreuse (récursion `ENDGAME_SCALING.gold`).

**Puits** :
- Boutique (catalogue progressif `minFloor`), catalogue endgame à **prix progressif**
  (`base × 1.5^nbAchetés` — Piste A), autel offrande (`40×floor`),
  don à la Maison (**5 G = 1 point**), seuils série ★N (`45000+15000N+1000N²`).

**Sorties** :
- Or net cumulé / dépensable par étage (Normal + autres difficultés).
- Saturation des sinks endgame (le « trou » §4.I de l'audit).
- « Combats pour s'offrir l'item top » par étage (accessibilité).

Flag `--difficulty=NAME` partagé avec sim-difficulty (mutualiser les constantes ?).

---

## 3. Étapes & vérifications

1. [x] Réparer le blocker → charge `quests-templates.js`. `node tools/sim-difficulty.js 50` tourne (exit 0).
2. [x] `--difficulty` (scalingMultiplier toutes stats + enemyGroupMultiplier + xpMultiplier). Expert ét.6 solo 81 %→47 %.
3. [x] stun (saut 1 tour) + fear (50 % saut) modélisés.
4. [x] resist/weak sur `spell.element` (au lieu de `effect`) + `pickDamageSpell` dérivé dynamiquement de `DAMAGING_EFFECTS`.
5. [x] `dispel` (sinon attaque phys.) + `weaken` capé à 3 paliers.
6. [x] Sets 4pc (serpentard lifesteal 0.10 / serdaigle cost 0.90) + série ★N (`--star=N`). **Forge crit-fallback & Library spellPaths : documentés comme approximations restantes (low impact).**
7. [x] Phases de boss (`checkBossPhasesSim`) + ciblage/choix de capacité par tempérament + items à compromis (bonus négatifs) + `bonusHpMax/SpMax`.
8. [x] Créé `tools/sim-economy.js` : revenus/étage, accessibilité items, sinks endgame (don ★N, élixirs progressifs). `--difficulty` inclus.
9. [x] MAJ `DIFFICULTY_REPORT.md` (nouveaux flags + renvoi éco) + ce plan + CLAUDE.md (67 monstres).
10. [x] `node tests/smoke.js` vert — 126 scénarios (sim hors-jeu, aucune régression).
11. [ ] Commit + push sur la branche.

---

## 4. Approximations restantes (assumées, low impact)

- **Forge** : la sim n'upgrade que la stat primaire atk/def/mag/lck ; le fallback
  runtime vers crit/dodge/dérivées (items sans bonus primaire) n'est pas modélisé.
- **Library** : la sim applique power+coût ensemble (legacy) ; le runtime suit des
  `spellPaths` (`power` OU `focus`), donc surestime légèrement les sorts upgradés.
- **sim-economy** : groupe au baseline (sans le +10 % trio post-victoire ét.11+),
  hors variantes shiny (×2), coffre énigme et autel (gambits) exclus du revenu de base.
- **Mondes Parallèles** : découplé de l'économie d'or (essence = devise séparée,
  cap 3 échos/visite) — volontairement hors périmètre des deux sims.

## 5. Journal

- 2026-05-30 : audit initial. Sim difficulté **cassé** confirmé (QUEST_TEMPLATES déménagé). Écarts listés (2 agents). Plan créé.
- 2026-05-30 : sim-difficulty réparé + enrichi (difficulté, stun/fear, dispel/weaken,
  element, phases boss, tempérament, items compromis, ★N). sim-economy créé.
  Constat éco notable : ★1 = 305 000 G de don vs ~15 400 G / boucle 10 étages →
  la série ★ N est un sink quasi illimité ; le « trou §4.I » de l'audit est comblé.
  smoke 126/126 vert.

# Plan — Chapitre 13 « Équilibre, Difficulté & Progression »

> Plan vivant (guidelines §5). Tâche : créer `docs/histoire/13-equilibre-difficulte-progression.md`
> en s'appuyant sur tout le contenu déjà livré (chap. 04/06/07/09/10/11/12,
> docs gameplay G3/G4/G6/G7/G8/G9, `DIFFICULTY_REPORT.md`, `DIFFICULTY_STUDY.md`).

## Contraintes d'honnêteté (issues de l'exploration code + docs)

- ✅ Existe : 4 difficultés (`DIFFICULTY_SETTINGS`), scaling `stat×intraMult×diffMult`,
  récursion endgame (`ENDGAME_SCALING`, `effectiveFloor`, `endgameTierIndex` → ~×1.5/palier),
  taille de groupes solo/duo, pression au grind (`floorKillCount`), paliers de Maison
  (18 + ★N, `requiresDarkTier`), points/kill 8/10/14/18 (×1.5 Ténèbres), rework D1–D5,
  Forge(5)/Bibliothèque(3)/sets, fontaines + repos, modificateur one-shot de signature au climax.
- ❌ N'existe PAS (donc 💡 proposition, pas ✅) — et contredit des garde-fous existants :
  - `houseDifficultyModifier` (les 4 Maisons partagent la même grille — chap 04 §4.7).
  - `eclatPowerBoost` (Éclats = fil rouge narratif optionnel, sans bonus de puissance — chap 04).
  - `loopScaling`/`difficultyMultiplier`/`eclatPowerBoost` ne sont pas des globals.
  - « héritage en Boucle » / perte partielle à la mort (mort actuelle = pétrification/resurrect
    ou permadeath Ironman ; pas d'héritage).
  - « refuges Maison » (le répit actuel = fontaines + `rest()`).
  → tous présentés en 💡 avec ❓ de validation et tradeoff explicite.

## Étapes

1. [x] Explorer docs + code, extraire les chiffres réels → vérif : valeurs sourcées.
2. [x] Écrire le plan (ce fichier).
3. [x] Rédiger le chapitre (Étape 1 spec narrative + Étape 2 plan d'implémentation
   dans le même fichier) → vérif : suit la convention de chapitre (Statut, ✅/💡/❓,
   tables de synthèse, récap Gemini), ≥ 4 simulations, distingue ✅/💡/❓.
4. [x] Mettre à jour l'index `docs/README.md` (ligne chap. 13 + statut global).
5. [x] Pas de test smoke nécessaire (doc markdown pure, aucun JS/CSS servi → pas de
   cache-bump §8). Mentionné dans le commit.
6. [x] Commit + push sur `claude/hogwarth-ch13-balance-j2aj9p`.

## Écarts constatés
- Le chapitre est volontairement double (spec + plan d'implémentation) car la tâche
  demande explicitement les deux livrables ; le plan d'impl. est la dernière grande
  section (§13.9).

# Plan — Chapitre 13 « Équilibre, Difficulté & Progression » (finalisation & renforcement)

> Plan vivant (guidelines §5). Tâche (branche `claude/hogwarth-ch13-balance-ha452g`) :
> **finaliser et renforcer** le chapitre 13 existant
> (`docs/histoire/13-equilibre-difficulte-progression.md`), avec un focus majeur
> sur la **création de simulations concrètes et réalistes** (mesurées via
> `tools/sim-difficulty.js`, pas théoriques) + un plan d'implémentation/outils.

## État de départ

- Le chapitre 13 EXISTE déjà (826 lignes), doctrine + §13.5 avec 4 simulations +
  §13.9 plan d'implémentation. Solide mais : (a) 4 simulations seulement, non
  alignées sur les 6 scénarios explicitement demandés ; (b) §13.9 Étape 2 manque
  les métriques nommées (`difficultyScore`, `deathRatePerFloor`,
  `averageClearTime`, `synergyUsageRate`), l'intégration de logs in-game, le
  processus itératif détaillé et le playtest communautaire.

## Contraintes d'honnêteté (vérifiées sur le code, juin 2026)

- ✅ Outils réels : `tools/sim-difficulty.js` (flags `--difficulty/--build/--endgame/
  --bonus-levels/--artifacts/--forge/--library/--house-set/--tenebres-set/--star/
  --loop-xp-frac/--pessimistic/--legacy`), `tools/check_difficulty.js` (CI),
  `tools/sim-economy.js`, `tools/sim-aoe.js`, `tests/units.js`, `tests/smoke.js`.
- ❌ N'existe PAS → toute mention reste 💡 : télémétrie/logs in-game
  (aucun `window.DEBUG`/`simLog`), `houseDifficultyModifier`, `eclatPowerBoost`,
  héritage en Boucle. Les métriques `deathRatePerFloor`/`synergyUsageRate` ne sont
  pas collectées en jeu aujourd'hui — proposées en 💡.

## Données mesurées (fraîches, ce run — N=600/couple, Normal sauf indication)

- Sim 1 Gryff Solo (balanced) : ét.5=97 / 6=87 / 7=87 / 8=72 / 9=65 / 10=59 %.
- Sim 2 Serp Duo opti (--artifacts --house-set=serpentard) : Duo ét.10=96 / 11=88 /
  12=86 % (vs baseline Duo 83 % → +13 pts) ; Solo ét.10=86 %.
- Sim 3 Serdaigle explo (--house-set=serdaigle --bonus-levels=2) : Solo ét.10=74 %
  (vs 59 baseline), Duo ét.10=93 % — le sur-niveau d'exploration est le vrai levier
  (le Codex reste cosmétique, sans puissance).
- Sim 4 Boucle nue (--endgame) : ét.20=46/62, 21=19/27, 25=17/28, 30=12/23 (Solo/Duo).
  Cliff de palier au passage 20→21 (n:1→2).
- Sim 5 Boucle 3 kit complet (+25niv, artifacts, forge5, lib3, sets) : ét.21=94/99,
  25=91/97, 30=84/94 — le kit maintient le confort.
- P2 XP passive (--loop-xp-frac=0.45) : ét.21 Solo 79→85, Duo 93→96 — adoucit sans
  trivialiser.
- Sim 6 pire scénario (Expert --pessimistic) : Solo ét.5=22, 8=2, 10=0 % ;
  Duo ét.7=30, 10=3 %. Effondrement par sous-niveau (quêtes off) + Expert.

## Étapes

1. [x] Relire chapitre + tooling, RUN des 6 configs de sim → vérif : chiffres frais capturés.
2. [x] Écrire/mettre à jour ce plan.
3. [x] Réécrire §13.5 « Simulations de validation » → exactement **6 simulations**
   nommées (Gryff solo / Serp duo opti / Serdaigle explo / Boucle 3 / tout collecté /
   pire scénario), chacune avec : Hypothèses · courbe ressentie étage par étage ·
   frustration/ennui · satisfaction/pic de plaisir · ajustements concrets. + une
   sous-section « Synergies & variables d'influence » (lecture par sim) et le rappel
   des règles d'ajustement continu. Convention ✅/💡/❓ + tables claires.
4. [x] Renforcer §13.9 (Étape 2) : métriques nommées, proposition de **logs de
   simulation in-game** (💡, opt-in debug), boucle itérative
   Simulation→Playtest→Ajustement, priorisation, playtest communautaire.
5. [x] Bandeau de statut du chapitre inchangé (reste 🟩/à valider).
6. [ ] Pas de smoke test requis (markdown pur, aucun JS/CSS servi → pas de
   cache-bump §8). Le mentionner au commit.
7. [ ] Commit + push sur `claude/hogwarth-ch13-balance-ha452g` (vérifier état PR avant push).

## Écarts constatés
- §13.5 réécrit en 6 simulations (au lieu de 4) ; les anciens scénarios « cas
  extrême complétionniste » et « Boucle 3 » sont conservés/refondus dans le nouveau
  jeu de 6. Tous les chiffres proviennent du run de ce jour (N=600).
- L'intégration de logs in-game reste 💡 (aucune télémétrie n'existe) ; le « vrai »
  pipeline de mesure reste `sim-difficulty.js` + `check_difficulty.js` en CI.

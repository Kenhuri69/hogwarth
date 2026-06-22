# Plan — New Game+ « vrai » (challenge empilable)

> Décisions joueur (2026-06-14) : **Challenge** (ennemis renforcés + butin
> majoré, **zéro héritage** — respecte la philo « zéro carry » du profil) +
> **empilable NG+1/+2/+3…** (cran = nombre de victoires enregistrées au profil).

## Constat de départ
Le socle NG+ (Ch.14 P5) existe mais est **purement cosmétique** : `ngPlusRun`
(flag sérialisé) + `ngPlusTitle` (titre HUD) + toggle au player-select. Le
profil persistant (`profile.js`) compte les victoires. « Vrai NG+ » = brancher
ce flag sur le gameplay via un **multiplicateur global** sur les monstres.

## Design
- **Cran NG+** = `ngPlusMaxLevel()` = `min(profile.victories, NGPLUS_CAP)`.
  Empilable : finir un run (victoire) incrémente `victories` → débloque le cran
  suivant. Opt-in au démarrage → `ngPlusLevel` = ce cran (sinon 0).
- **Multiplicateur** (pur, `ngPlusScaling(level)` dans dungeon-scaling.js) :
  - stats ennemis (hp/atk/def/mag) : `1 + 0.15 × level` (calibré sim, cf. ci-dessous)
  - butin (xp/gold) : `1 + 0.25 × level` (un peu plus riche → récompense le défi)
  - drops : `chance × (1 + 0.10 × level)`, borné à 1
- **Application** : dernière passe de `scaleMonster` (compose avec difficulté +
  récursion endgame Boucle). Lit `ngPlusRun`/`ngPlusLevel` globaux ; `buildEcho`
  passe `{ ngPlusLevel: 0 }` → les échos astraux restent neutres.
- **Zéro héritage** : on ne touche ni à l'or/inventaire/niveaux de départ. Seuls
  les ennemis et leurs gains changent.

## Étapes / vérif
1. `dungeon-scaling.js` : constantes + `ngPlusScaling(level)` pur + passe NG+
   dans `scaleMonster` (+ opt-out echo). → vérif units.
2. `state.js` : `let ngPlusLevel = 0;` + MAJ commentaire (plus « cosmétique »).
3. `save.js` : sérialiser/restaurer `ngPlusLevel`.
4. `profile.js` : `ngPlusMaxLevel()` + opt-in row affiche le cran.
5. `main.js` : `confirmHeroSelection` arme `ngPlusLevel`.
6. `ui.js` : HUD title affiche « NG+N ».
7. `index.html` : libellé opt-in (ennemis renforcés + butin majoré).
8. `tests/units.js` : `ngPlusScaling` (niv 0 = identité, niv N, cap).
9. `CLAUDE.md` : MAJ section NG+ (gameplay).
10. Bump cache PWA (tous les JS servis modifiés) + `node tests/smoke.js`.

## Statut
- [x] 1-10 — livré (PR #536). units 646 ✅ · smoke ✅ · pwa ✅.

## Calibration par simulation (suivi)
Flag ajouté : `tools/sim-difficulty.js --ngplus=N` (miroir de `ngPlusScaling`,
injecté dans `scaledStatValue` + ligne `mag`). Sweep vétéran kitté
(`--artifacts --house-tier=16 --bonus-levels=2`, Duo, n=250), win% étage 8 :
NG+1 = 56 % (stat 0.20) → 66 % (0.15) ; NG+3 = 16 % → 28 % ; NG+5 = 2 % → 12 %.
**Décision : stat 0.15/cran** (ladder ~6 %/cran, F8 reste le mur naturel). Le sim
est pessimiste ET ignore la boucle +25 % XP → difficulté réelle plus douce.
Butin 0.25 / drop 0.10 conservés (sous-crédités par le sim, donc sûrs).

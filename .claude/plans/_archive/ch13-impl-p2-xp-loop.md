# Chapitre 13 — Lot P2 : XP passive de Boucle (adoucissement endgame)

> Réf : Ch.13 §13.5 Sim 3 / §13.9.F (P2) + `DIFFICULTY_STUDY.md §8.2/§8.3/§8.7`.
> Branche : `claude/ch13-impl-p2-xp-loop` (la branche P1 est mergée).
> **Décision utilisateur** : implémenter P2 (override explicite de l'exclusion
> P1 « pas de changement d'équilibrage »).

## Problème (mesuré, §8.2)
En Boucle Ténébreuse, la puissance ennemie compose × ~1.5 / palier de 10 étages
tandis que `xpNext ×= 1.6` / niveau compose plus vite que l'XP gagnée → **aucune
progression passive** : descendre sans farmer heurte un mur réel vers l'étage
19-21 (Solo 36 % / Duo 70 % à l'étage 20 ; 7 % / 26 % à l'étage 30).

## Doctrine respectée (§13.6)
- Règle #6 : *« ajouter un axe de progression (XP passive de Boucle), pas baisser
  le scaling »* → on **n'altère PAS** `ENDGAME_SCALING` / `DIFFICULTY_SETTINGS` /
  `scaleMonster`. On ajoute une source d'XP.
- Règle #1 + §13.9.G : **simulation-first**, régénérer `DIFFICULTY_REPORT.md`
  dans le même commit, pas de nouveau spike (chute > 15 pts entre 2 étages).
- Intention préservée : on **adoucit sans trivialiser** — le farming reste la
  voie vers le confort *total* ; la passive ne fait que transformer le mur en
  pente. Cohérent avec le pivot P1 (« la puissance se gagne »).

## Design
**Source** : à chaque **nouvel étage de Boucle le plus profond** franchi
(`nextFloor >= 11`, `victoryAchieved`, `nextFloor > floorReached`), le groupe
gagne une XP passive = `round(LOOP_PASSIVE_XP_FRAC × player.xpNext)`.
- **Anti-farm** : réutilise EXACTEMENT le gate de `_maybeAdvanceDarkLoop`
  (le respawn / les allers-retours ne créditent rien — comme les Éclats).
- **Auto-pacing** : exprimée en fraction du `xpNext` *courant* → ~`FRAC` niveau
  par étage descendu, indépendamment de la composition ×1.6.
- `FRAC < 1` ⇒ au plus 1 montée de niveau par étage ⇒ un seul `checkLevelUp()`.
- Constante `LOOP_PASSIVE_XP_FRAC` dans `data.js` (calibrée par sim).
- Toast discret (« 🌀 La Boucle nourrit ta puissance… »).

## Étapes
1. [x] **Sim** : `--loop-xp-frac=F` ajouté (`expectedLevelAtFloor` + helper pur
   `xpNextForLevel`). Défaut 0 → rapport no-endgame inchangé.
2. [x] **Mesuré** F ∈ {0.30, 0.45, 0.60} (`--endgame`, N=400 puis 800).
   **Choisi F = 0.45** : ét. 20 Duo 63→76 % / Solo 48→63 % ; ét. 30 reste
   ≤ 36 % (non trivialisé, farming conserve sa valeur). Pas de spike sur la
   courbe principale (passive = étages 11+ uniquement).
3. [x] **Runtime** : `LOOP_PASSIVE_XP_FRAC = 0.45` (data.js) + grant dans
   `_maybeAdvanceDarkLoop` (même gate anti-farm que l'Éclat) + `checkLevelUp()`
   + toast « La Boucle nourrit ta puissance ».
4. [x] **Doc équilibrage** : §3 (no-endgame) **inchangé** → pas de régénération
   de baseline (la passive ne touche pas < 11) ; `check_difficulty` reste vert.
   Impact endgame chiffré dans `DIFFICULTY_STUDY.md §8.8` + note d'en-tête
   `DIFFICULTY_REPORT.md` (§13.9.G honoré sans fausser le §3 avec du bruit).
5. [x] **Tests** : `scenarioLoopPassiveXp` (T1–T5 : grant, anti-farm, gardes,
   auto-pacing). `units` 503 ✅. `smoke` : en cours.
6. [x] **Cache-bump** (data v28→29, movement-floors v14→15, CACHE_VERSION
   v118→v119). `check_cache_versions --working` + `pwa-smoke` verts. Amendé
   Ch.13 (§13.5 Sim 3 / §13.5.1 / §13.9.F P2 ✅ / §13.3.5 / point #5) + G3.
7. [x] Commit + push. PR seulement si demandé. → livré & mergé (`LOOP_PASSIVE_XP_FRAC` en code).

## Exclusions (inchangées)
Pas de `xpNext` adouci (l'autre option §8.7) — on choisit l'**axe additif**
(XP passive) conformément à la règle #6. Pas de modif de scaling.

## Suivi / écarts
- (à compléter)

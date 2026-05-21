# Mise à jour du simulateur de difficulté — PR #213

Objectif : modéliser dans `tools/sim-difficulty.js` les trois mécaniques
d'équilibrage de PR #213, puis rafraîchir `DIFFICULTY_STUDY.md`.

## Mécaniques PR #213 à modéliser

1. **Action Garde** (regen PM 1 tour sur 2) — battle.js.
2. **Repos partiel** (50 % du soin si interrompu) — movement.js.
3. **Malus de fouille** (1 % réveil monstre, 1 % piège) — movement.js.

## Constat préalable

Le simulateur ne modélisait ni la Garde, ni le repos, ni la fouille
(boucle de combat pure, PV/PM pleins à chaque combat). Les chiffres de
`DIFFICULTY_STUDY.md §3` ont en outre dérivé du code actuel.

## Étapes

1. ✅ **Exports data.js** — `SEARCH_MONSTER_CHANCE`, `SEARCH_TRAP_CHANCE`,
   `REST_ENCOUNTER_CHANCE`, `REST_INTERRUPT_HEAL_FRACTION` ajoutés au sandbox.
2. ✅ **Garde dans le combat** — `guardStacks`/`guardRegenCD`, branche Garde
   dans `heroAct`, mitigation 50 % + riposte dans `enemyAct`, décrément du
   cooldown par round. Combats légèrement plus longs, courbe stable.
3. ✅ **Run d'étage** — `simulateFloorRun()` + `runFloorSimulations()` :
   PV/PM reportés (`opts.keepVitals`), décision de repos (partiel si
   interrompu), jets de fouille. Révèle l'attrition (Solo décroche étage 6-7).
4. ✅ **Rapport** — `emitFloorReport()` (section 7) câblé dans le bloc principal.
5. ✅ **Re-run + DIFFICULTY_STUDY.md** — §1/§3 rafraîchis, §9 PR #213 ajoutée.
6. ✅ `node tests/smoke.js` vert (137 globals) — code js/ non touché.

## Écarts constatés

- §3 (combat isolé) a dérivé du code actuel : Duo nettement plus haut
  qu'à l'ancienne mesure (étage 12 : 55 % → 76 %). Numéros rafraîchis.
- Le run d'étage est une **borne basse** : ne modélise ni fontaine, ni
  level-up intra-étage, ni butin de coffre. Documenté en §9.4.

## Décisions de modélisation

- **Heuristique Garde** : un héros se met en garde quand il est blessé
  (`40 % ≤ PV < 60 %`) et n'a pas déjà un palier (`guardStacks < 1`) —
  il échange son tour d'attaque contre 50 % de mitigation. La regen PM
  1t/2 (PR #213) s'applique. En dessous de 40 % PV, potion/soin priment.
- **Repos** : avant chaque combat d'un run d'étage, le groupe se repose
  si `PV moy < 65 %` ou `PM moy < 40 %`. 30 % d'interruption → soin partiel
  (15 % max) + combat ; sinon soin plein de repos (30 % max).
- **Fouille** : 3 fouilles/étage, chacune 1 % réveil monstre + 1 % piège.
- **Run d'étage** : 4 combats/étage, PV/PM reportés, pas de level-up
  intra-étage. Étage réussi = groupe vivant au bout des 4 salles.

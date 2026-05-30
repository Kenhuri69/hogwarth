# Rééquilibrage Legilimens (LOT B4)

> Réf. revue : `.claude/plans/game-features-review.md` §3 LOT B4.
> Branche : `claude/legilimens-rebalance-b4-NIzVX`.

## Problème

Le sort **Legilimens** (palier Mythe Serdaigle, 18 PM, `effect:"legilimens"`)
arme +1 charge d'annulation (`legilimensCancelCharges`) à chaque lancer
**sans plafond** : tant qu'il reste du PM, on empile les charges et on
neutralise indéfiniment les capacités ennemies (boss compris). Le seul
garde-fou est le PM, insuffisant en endgame.

- `js/battle-spells.js:560` — `_spellLegilimens` : `legilimensCancelCharges += 1`
- `js/battle-spells.js:39` — consommation d'une charge par capacité ennemie
- `js/battle.js:352` — `legilimensCancelCharges = 0` au `startBattle`

## Décision (AskUserQuestion)

Levier retenu : **(b) coût en PM croissant à chaque lancer dans le combat**.
Auto-limitant par épuisement du PM, conserve l'utilité tactique d'un 1er
lancer à coût normal.

## Conception

- Nouveau compteur transient `legilimensCastsThisFight` (état combat, **non
  sérialisé** — cohérent avec `legilimensCancelCharges` ; un combat ne peut
  être sauvegardé car `inBattle` bloque `autoSave`/`writeSlot`). → saves
  rétro-compatibles, aucun champ persistant ajouté.
- Pas de plafond ; la croissance du coût étrangle naturellement le spam.
- Formule : `coût effectif = base(18) + N × 6`, N = nombre de lancers déjà
  effectués ce combat. → 18, 24, 30, 36…
- Incrément de N **après** déduction réussie (dans le handler `_spellLegilimens`),
  pour que le 1er lancer coûte le prix de base.
- L'escalade vit dans `_spellSpCost(spell)` (déjà le point unique de calcul
  du coût, consommé par le check ligne 795 ET la déduction ligne 854). La
  réduction Apothéose Serdaigle ×0.8 s'applique **au-dessus** du coût escaladé.

## Étapes

1. `js/state.js` : déclarer `let legilimensCastsThisFight = 0;` (zone combat
   transient, près de `legilimensCancelCharges`). → vérif : grep présent.
2. `js/battle.js` : reset `legilimensCastsThisFight = 0;` dans `startBattle`
   (près de la ligne 352). → vérif : reset à chaque combat.
3. `js/battle-spells.js` :
   - `_spellSpCost` : `if (spell.effect === 'legilimens') cost += N × STEP`.
   - `_spellLegilimens` : `legilimensCastsThisFight += 1;` après l'armement.
   → vérif : 2e lancer débite > 1er.
4. `js/inventory-spells.js` : `openBattleSpells` affiche le coût effectif pour
   Legilimens (sinon la pastille montre 18 alors qu'on débite plus). → vérif :
   pastille reflète le coût escaladé.
5. `tests/smoke.js` : `scenarioLegilimensEscalation` — 1er lancer = 18 PM,
   2e lancer = 24 PM débités ; counter remis à 0 au combat suivant.
   Enregistrer dans le tableau `scenarios`.
6. `node tests/smoke.js` vert → commit → push branche dédiée.

## Suivi

- [x] Étape 1 — `legilimensCastsThisFight` déclaré (state.js)
- [x] Étape 2 — reset dans startBattle (battle.js)
- [x] Étape 3 — escalade `_spellSpCost` + incrément `_spellLegilimens`
- [x] Étape 4 — coût affiché dans openBattleSpells
- [x] Étape 5 — scénario smoke `scenarioLegilimensEscalation`
- [x] Étape 6 — suite smoke verte, commit, push

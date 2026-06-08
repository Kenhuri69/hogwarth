# Plan — Scaling par stat de base pour les 4 sorts utilitaires

## Contexte
Revue des 29 sorts : 25 sont déjà pilotés par une stat de base
(MAG → dégâts, INT+END → soin, INT+LCK → DoT, AGI → crit de sort).
4 sorts ont une valeur fixe, `power` jamais lu, aucune stat ne les boost :
Expelliarmus (disarm), Protego (shield), Accio + Alohomora (steal).

## Décisions (validées avec l'utilisateur)
- **Expelliarmus — Option A** : le sort réduit réellement `enemy.atk`
  (la desc « -3 ATK » devient vraie). On retire l'ancienne mécanique
  DEF-ignore (`enemy.disarmed`). Réduction = `power(3) + agi/8 (correct)
  + int/16 (faible)`. Durée = `2 + int/16 (faible)`, cap 5.
- **Protego** : durée bouclier = `2 + mag/25`, cap 5.
- **Accio / Alohomora** : or volé = `power + mag/8 (un peu) + lck/2
  (beaucoup) + random(0..5)`.
- Aperçu chiffré ajouté dans la fiche Sorts (`spellEffectPreview`).

## Étapes
1. **Nouveau statut `disarm`** (malus ATK, miroir de `weaken`)
   → STATUS_DEFS + restauration ATK à l'expiry dans `tickStatuses`.
   verify : `node tests/smoke.js` vert.
2. **`_spellDisarm`** réécrit (Option A) : réduit `enemy.atk`, pose le
   statut `disarm`. verify : combat manuel / smoke.
3. **Retrait mécanique `disarmed`** dans `battle.js` (executeAttack +
   init enemyGroup). verify : aucune ref orpheline (`grep disarmed`).
4. **`_spellShield`** : durée = `shieldDuration(spell, char)`.
5. **`_spellSteal`** : or = formule power+mag+lck+random.
6. **Helpers purs** `disarmAtkLoss / disarmTurns / shieldDuration /
   stealBaseGold` partagés handler + aperçu.
7. **`spellEffectPreview`** : cas `disarm` / `shield` / `steal`.
8. **`data.js`** : desc Expelliarmus + Alohomora corrigées.
9. verify final : `node tests/smoke.js` vert.

## Suivi
- [x] Revue initiale + bilan des 29 sorts
- [x] Étape 1 — statut `disarm`
- [x] Étape 2 — `_spellDisarm` Option A
- [x] Étape 3 — retrait `disarmed`
- [x] Étape 4 — `_spellShield`
- [x] Étape 5 — `_spellSteal`
- [x] Étape 6 — helpers purs
- [x] Étape 7 — `spellEffectPreview`
- [x] Étape 8 — descriptions `data.js`
- [x] Étape 9 — smoke test vert (49/49)

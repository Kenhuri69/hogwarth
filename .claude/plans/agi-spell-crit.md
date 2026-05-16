# AGI = crit magique

## Constat

- Le crit physique est complet (`battle.js — executeAttack`) : `critChance`
  dérivé de LCK, multiplicateur ×1.5, vrai roll.
- Les sorts ne peuvent pas critiquer : `_spellElementalDamage` /
  `_spellLifesteal` / `_spellCurse` n'ont aucun roll. Le label `'crit'`
  passé à `UX.floatDmg` est purement cosmétique (déclenché par la
  faiblesse 💥, ou en dur dans `_spellCurse`).
- AGI ne pilote que l'esquive — aucun rôle offensif.

## Objectif

Donner à AGI un rôle offensif symétrique de LCK : **AGI = crit des sorts**.

| | Crit physique | Crit magique |
|---|---|---|
| Stat | LCK | AGI |
| `critChance` / `spellCritChance` | `5 + lck*0.5` (cap 40) | `5 + agi*0.4` (cap 35) |
| Multiplicateur | ×1.5 | ×1.4 |

## Décisions

- **Cumul crit/faiblesse** : cumulable. Le ×1.4 s'applique APRÈS
  résistance/faiblesse. Pic max `🔰/💥 × 🎯` accepté ; ×1.4 (sous le
  ×1.5 physique) amortit le swing.
- **Équipement** : `spellCritChance` est de l'AGI pure — pas de
  `bonusCritChance` (réservé au crit physique). Pas de nouveau champ
  d'item (V2 si besoin).
- **Désambiguïsation visuelle** : le visuel `'crit'` de `floatDmg` est
  désormais réservé au VRAI crit magique. La faiblesse 💥 repasse en
  `'dmg'`. Marqueur texte du crit : `🎯`.

## Étapes

1. `inventory.js — recalculateStats()` : exposer
   `c.spellCritChance = clamp(5 + agi*0.4, 0, 35)`.
   → vérif : smoke T6 (présence, plage, scaling AGI).
2. `battle-spells.js` : constante `SPELL_CRIT_MULTIPLIER = 1.4`,
   helper `_rollSpellCrit(char)`. Appliquer dans `_spellElementalDamage`,
   `_spellLifesteal`, `_spellCurse` (×1.4 après resist/weak, marqueur 🎯,
   `floatDmg` en `'crit'` seulement si vrai crit).
   → vérif : smoke T7 (dmg ×1.4 forcé crit on/off).
3. `ui.js` : ligne « Crit. magie » dans la modale Personnage.
   → vérif : smoke T3 étendu (label présent).
4. `tests/smoke.js` : T6 + T7 dans `scenarioCritDodge`.
   → vérif : `node tests/smoke.js` vert.
5. `CLAUDE.md` : MAJ section « Crit + Esquive ».

## Suivi

- [x] Étape 1 — `spellCritChance` exposé dans `recalculateStats`
- [x] Étape 2 — roll + multiplicateur dans les 3 handlers de sorts
- [x] Étape 3 — ligne modale « Crit. magie »
- [x] Étape 4 — smoke T6/T7 ajoutés
- [x] Étape 5 — doc CLAUDE.md
- [x] `node tests/smoke.js` vert

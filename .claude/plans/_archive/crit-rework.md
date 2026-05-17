# Plan — Refonte du critique (crit damage + crit physique/sort)

> Demande utilisateur : revoir le critique, ajouter du crit damage,
> le crit d'équipement peut dépasser 40 %, et deux types de crit
> (physique + sort).

## Design

### Deux canaux de crit
- **Crit physique** : `critChance`, `critMultiplier` — attaques physiques.
- **Crit de sort** : `spellCritChance`, `spellCritMultiplier` — sorts offensifs.

### Formules (recalculateStats)
```
critChance        = clamp(5,100, min(40, 5 + lck*0.5) + Σ bonusCritChance)
spellCritChance   = clamp(5,100, min(40, 5 + lck*0.5) + Σ bonusSpellCritChance)
critMultiplier    = 1.5 + Σ bonusCritDamage
spellCritMultiplier = 1.5 + Σ bonusSpellCritDamage
```
- Le plancher LCK plafonne à 40 % ; les bonus d'équipement/set s'ajoutent
  PAR-DESSUS sans cap (→ peut dépasser 40 %, plafond absolu 100 %).
- `bonusCritDamage` etc. : valeurs additives (0.25 = +25 % de dégâts crit).

### Nouveaux champs d'item (data.js, optionnels)
`bonusCritDamage`, `bonusSpellCritChance`, `bonusSpellCritDamage`.

### Sets (state.js HOUSE_SETS + bloc Ténèbres de recalculateStats)
- Gryffondor (physique) : garde bonusCritChance, +bonusCritDamage (4/4 → +0.50).
- Serpentard / Serdaigle (mag) : +bonusSpellCritChance (4/4 → +20),
  +bonusSpellCritDamage (4/4 → +0.50).
- Poufsouffle (tank) : inchangé.
- Set Ténèbres 3/3 : +0.30 critDamage ET +0.30 spellCritDamage (universel).

## Étapes
1. `js/state.js` — HOUSE_SETS : ajouter les champs crit damage / spell crit.
2. `js/inventory.js` — recalculateStats : nouvelles formules + somme des
   nouveaux champs (équipement + set Maison + set Ténèbres).
3. `js/battle-spells.js` — crit de sort dans les handlers de dégâts
   (`_spellElementalDamage`, `_spellLifesteal`, `_spellCurse`).
4. `js/battle.js` — crit physique : déjà câblé (lit critChance/critMultiplier),
   vérifier que le dépassement de 40 % fonctionne.
5. `js/ui.js` — fiche perso : afficher crit physique (× mult) + crit de sort.
6. `tools/sim-difficulty.js` — modéliser crit damage, spell crit, cap, sets.
7. `tests/smoke.js` — étendre le scénario 26 (crit damage, spell crit, >40 %).
8. `node tests/smoke.js` + sim de contrôle.

## Réalisé

Toutes les étapes 1-8 implémentées. Smoke test scénario 26 étendu (T6 :
crit damage, crit de sort, crit équipement > 40 %) — vert. Impact mesuré
consigné dans `DIFFICULTY_STUDY.md` §8.6.

## Vérifications
- Scénario 26 existant reste vert (héros sans équipement : critMult 1.5,
  critChance ≤ 40).
- Un set complet pousse critChance au-delà de 40 %.
- Les sorts offensifs peuvent crit.
- DIFFICULTY_STUDY.md §8.6 : re-mesurer l'apport des sets.

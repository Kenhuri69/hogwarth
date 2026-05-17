# Plan — Modéliser les DoT ennemis dans le simulateur de difficulté

> Branche : `claude/implement-enemy-dot-8AVb4`
> Origine : retour utilisateur — « les DoT infligés par les ennemis
> (hors stun) ne sont toujours pas simulés ».

## Constat

- **Runtime du jeu** : OK. `tryEnemyAbility` (`js/battle-spells.js`) gère
  le `case 'status'` et `tickStatuses` (`js/battle.js`) applique les
  dégâts par tour. Smoke test T4 (scénario 2bis) le couvre.
- **Simulateur** `tools/sim-difficulty.js` : `enemyAct` ne gère que
  `damage / heal / weaken / drain`. Une capacité `effect:"status"`
  (burn/poison/bleed/gel) tombe dans le `switch` sans `case` →
  fall-through vers l'attaque physique. Conséquences :
  1. le DoT n'est jamais appliqué (aucun dégât par tour) ;
  2. l'ennemi attaque physiquement *en plus* — alors qu'en jeu réel
     `tryEnemyAbility` consomme le tour. Double biais.
- Monstres concernés : Kappa des Douves (burn), Inférius (bleed),
  Jeune Acromantule (poison), Bellatrix (burn), Voldemort Affaibli
  (bleed). Le stun, lui, n'est volontairement pas modélisé (saut de
  tour) — hors scope explicite.

## Objectif

Modéliser dans le simulateur les DoT (burn/poison/bleed/gel) infligés
par les capacités ennemies `effect:"status"`. Ignorer `stun`.

## Étapes

1. `enemyAct` — ajouter `case 'status'` :
   - statusId ∈ {burn,poison,bleed,gel} → empile un DoT sur
     `target.statusEffects` (stacking power/turns = max, comme
     `applyStatus`). `return 0` (pas de dégât immédiat).
   - sinon (stun, …) → `return 0` sans effet.
   - → vérif : un ennemi à capacité status ne déclenche plus aussi
     l'attaque physique.
2. `simulateBattle` — tick des DoT héros après le tour ennemi
   (miroir de `tickStatuses` fin d'`enemyTurn`) : `dmg = max(1,power)`,
   `hp -= dmg`, `turns--`, retrait à expiration ; `totalEnemyDmg += dmg`.
   Gérer la mort par DoT (retour défaite si groupe KO).
   - → vérif : reset `statusEffects` en début de sim.
3. Mettre à jour les commentaires obsolètes (l. 666-667, 761-763).
4. Vérif : `node tools/sim-difficulty.js` tourne sans erreur ;
   les win rates des étages à monstres DoT baissent légèrement.

## Suivi

- [x] Plan rédigé (2026-05-17).
- [x] Étape 1 — `case 'status'` dans `enemyAct`.
- [x] Étape 2 — tick DoT héros dans `simulateBattle`.
- [x] Étape 3 — commentaires.
- [x] Étape 4 — vérif simulateur.

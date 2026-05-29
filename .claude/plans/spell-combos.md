# LOT C.4 — Combos de sorts (synergie statut → dégâts)

> Branche : `claude/spell-combos` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT C (C4).

## Objectif
Récompenser l'enchaînement tactique : un statut posé sur la cible amplifie le
coup suivant (sort ou attaque physique). Réutilise le système de statuts
existant — aucune nouvelle machinerie.

## Réalisé
- [x] Helper pur `comboDamageMult(target, element)` (battle-spells.js) + table
  `COMBO_RULES` (première règle qui matche l'emporte) :
  - cible **gelée** (`gel`) → **×1.3** tous éléments (« on brise la glace »).
  - cible **qui saigne** (`bleed`) → **×1.2** pour les coups **physiques** (« plaie ouverte »).
- [x] Appliqué dans `_computeSpellDamage` (battle-spells.js) — couvre tous les
  sorts offensifs (élémentaire, lifesteal, malédiction) après resist/weak/undead,
  avant le crit.
- [x] Appliqué dans `executeAttack` (battle.js) avec élément `physique`, label
  affiché dans le journal de combat.
- [x] **Boucle de jeu** : Glacius (pose `gel`) → attaque physique / Diffindo
  amplifiés ; Diffindo/Sectumsempra (posent `bleed`) → physique amplifié.
- [x] **Test** : `scenarioSpellCombos` — matrice du helper (gel/bleed×élément),
  intégration sort (`_computeSpellDamage`) et physique (`executeAttack`).
  Suite complète **124/124 verte**.

## Notes honnêtes
- Combos volontairement **simples et lisibles** (2 règles) pour un premier jet ;
  extensibles via `COMBO_RULES` (ex. `stun` → bonus, `weaken` → bonus physique).
- Pas de consommation du statut (le combo ne retire pas le DoT) — choix de design :
  fenêtre de combo = durée du statut.
- Le bonus s'empile multiplicativement avec resist/weak/crit/Apothéose (ordre :
  base → Vigueur/Élan → resist/weak → undead → **combo** → crit).

## Journal
| Date | Note |
|------|------|
| 2026-05-29 | C4 implémenté et testé (sort + physique). |

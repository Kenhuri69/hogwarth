# Plan — Levier B : plancher de dégâts (suppression falaise n°1)

> Issu de `DIFFICULTY_STUDY.md` §4 levier B (variante minimale).
> Périmètre choisi par l'utilisateur : **uniquement la formule de dégâts**,
> sans toucher au scaling des monstres.

## Objectif

Supprimer la falaise n°1 : « les attaques physiques du joueur tombent à 1 dégât
dès que la DEF ennemie dépasse l'ATK joueur ». Sans régression early-game.

## Approche retenue — variante minimale (DEF-cap)

Conserver la soustraction `atk − def` partout où elle est saine, et seulement
**ajouter un plancher à 25 % de l'ATK brute** :

```
dmg = max( round(rawAtk × 0.25), rawAtk − def )
```

Pourquoi cette variante plutôt que le ratio `atk × (1 − def/(def+K))` :
- early-game (def ≈ atk) : la soustraction est préservée → **aucune régression**.
  Le ratio aurait rendu les étages 1-4 plus durs.
- la DEF reste pleinement efficace tant que le coup dépasse 25 % de l'ATK.

## Étapes

1. ✅ `js/data.js` — constante `DAMAGE_MIN_FRACTION = 0.25` ajoutée.
2. ✅ `js/battle.js` — helper pur `mitigatedDamage(rawAtk, def)` ajouté.
3. ✅ `js/battle.js — executeAttack` — `max(1, mitigatedDamage(atk+rand, enemyDef−bonus))`.
4. ✅ `js/battle.js — enemyTurn` — les deux coups (normal + Garde) via `mitigatedDamage`.
5. ✅ `tryEnemyAbility` — laissé **inchangé** (hors périmètre, voir ci-dessus).
6. ✅ `node tests/smoke.js` — « Tous les scénarios sont passés ».
   (Note : `tools/sim-difficulty.js` mis en cohérence — la sim réimplémente
   les formules ; sans cela elle ne refléterait pas le changement.)
7. ✅ `DIFFICULTY_STUDY.md` §7 — levier B consigné + impact mesuré.

## Vérification finale

- Un coup physique joueur inflige toujours ≥ 25 % ATK (plus de coup à 1).
- Pas de régression early-game (soustraction conservée quand def < 0.75×atk).
- Scaling des monstres inchangé : le gate de fin de partie est voulu et se
  franchit par le farming + les artefacts (cf. `DIFFICULTY_STUDY.md` §4).
- Impact mesuré : +8 à +15 pts de win rate en Duo fin de partie.

## Note post-implémentation

L'étude initiale concluait à tort à un jeu « ingagnable » : le harness
`tools/sim-difficulty.js` avait un bug (mode simple amputait le `cfg` des
flags quêtes/équipement/potions). Corrigé dans le même lot. Le levier B
reste pertinent — c'est un correctif de confort, pas un « casse-mur ».

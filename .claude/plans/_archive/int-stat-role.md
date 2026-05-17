# Plan — Donner un rôle réel à INT (« INT = maîtrise »)

## Contexte

L'attribut `int` est aujourd'hui inerte : il monte (+1/niveau, `bonusInt`
d'équipement, récompenses de quête) mais n'est lu par aucune formule. Le
bouton d'allocation « INT » donne en réalité +1 MAG (`STAT_POINT_EFFECTS.INT
= { baseMag: 1 }`).

## Objectif

Séparer les deux stats magiques :
- **MAG** = puissance brute des dégâts (inchangé : `power + mag/2`).
- **INT** = maîtrise : valeur des soins + fiabilité et durée des effets de
  statut.

MAG ne sera plus alloué via les points libres (boostée plus tard via l'arbre
de compétences, hors scope ici). Elle continue de monter +1/niveau et via
l'équipement.

## Amendement (décision utilisateur)

Le bonus d'INT est combiné à un **second stat de domaine** en **addition à
parts égales** (pas de plafond strict) :
- Soins & régen → domaine **Endurance (END)**.
- Fiabilité/durée des DoT → domaine **Chance (LCK)**.

Formule générale : `bonus = floor(INT/k) + floor(statDomaine/k)`.

## Étapes

1. **`js/data.js`** — `STAT_POINT_EFFECTS.INT` : `{ baseMag: 1 }` → `{ baseInt: 1 }`.
   → fait.

2. **`js/ui.js`** — label du bouton d'allocation : `INT: '+1 MAG'` → `'+1 INT'`.
   → fait.

3. **`js/battle-spells.js` — `_spellHeal`** — soin :
   `power + floor(int/4) + floor(end/4)`.
   → fait.

4. **`js/battle-spells.js` — `_spellSupportRegen` (Ferula)** :
   - burst : `power + floor(int/4) + floor(end/4)`
   - régen/tour : `power + floor(int/8) + floor(end/8)`
   → fait.

5. **`js/battle-spells.js` — `_spellElementalDamage`** — DoT :
   - chance : `min(0.50, 0.10 + int*0.0075 + lck*0.0075)`
   - durée : `min(5, 2 + floor(int/24) + floor(lck/24))`
   → fait.

6. **Test** — `node tests/smoke.js`. Scénario « Garde + Ferula » mis à jour
   (stats INT/END déterministes, régen attendue 6). → vert.

## Hors scope

- ~~Vrai mécanisme de `stun` (P2 de la revue).~~ → **Livré** dans
  `.claude/plans/new-monsters-stun.md` (statut `stun`, saut de tour).
- Voie d'allocation MAG (arbre de compétences, futur).
- Correctifs P1 de la revue des sorts (sorts inaccessibles, ciblage
  lifesteal/curse, Alohomora) — lot séparé.

## Suivi

- [x] Étape 1
- [x] Étape 2
- [x] Étape 3
- [x] Étape 4
- [x] Étape 5
- [x] Étape 6 — `node tests/smoke.js` : tous les scénarios verts.

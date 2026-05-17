# Plan — Équipement V2 : bonus passifs avancés

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au démarrage : **non démarré** — items hors-scope V1 d'`equipment-extended.md` (archivé).
> Pré-requis : aucun, plan autonome.

## 1. Contexte

`equipment-extended.md` (archivé) a livré V1 : 11 slots, rings duaux,
spellbooks, `regenHp`/`regenSp`, `grantsSpell`, migration save legacy.

Plusieurs leviers de design sont restés explicitement **hors scope V1** :

| Levier | Statut V1 | Source |
|--------|-----------|--------|
| `bonusHpMax` / `bonusSpMax` | Hors scope (cap dynamique non géré) | `equipment-extended.md §1.2` |
| `firstStrike` (priorité d'init) | Hors scope (pas de système d'initiative) | idem |
| `critBonus` (multiplicateur crit) | Hors scope (multiplicateur fixe 1.5) | idem |
| `bonusCritChance` / `bonusDodgeChance` | **Câblés** dans `recalculateStats` mais **non portés par les items** | `CLAUDE.md §Crit + Esquive` |
| Slots faction-locked (« Maison-only ») | Hors scope V1 | `equipment-extended.md §1.4` |
| Variantes nommées (« Wand of X ») | Hors scope V1 | idem |

L'objectif de ce plan est d'activer ces 5 axes en **plusieurs vagues
indépendantes**, chacune testée et chiffrée.

## 2. Vagues proposées

### Vague A — Activer `bonusCritChance` / `bonusDodgeChance` sur items (faible risque)

**Pourquoi en premier** : code déjà câblé, il manque uniquement les
champs sur 4-6 items existants pour valider la boucle.

**Cibles** :
- `cape_invis` (epic) : `+5 bonusDodgeChance`
- `anneau_runique` (rare) : `+3 bonusCritChance`
- `ceinture_alchimiste` (rare) : `+2 bonusCritChance`
- `bottes_dragon` (rare) : `+3 bonusDodgeChance`
- `wand2` (Sureau, rare) : `+2 bonusCritChance`
- `larmes_phenix` (epic) : `+3 bonusDodgeChance` (cohérent avec dodge mystique)

**Vérification** :
- Équiper `cape_invis` sur Hermione → `dodgeChance` affichée + 5 dans
  la modale Personnage.
- Smoke `scenarioCritDodgeFromEquip` (4 sous-cas).

### Vague B — `bonusHpMax` / `bonusSpMax` (moyen risque)

**Spec** :
- Le bonus s'applique à `hpMax`/`spMax` mais **pas** à `hp`/`sp` actuels
  (sinon overflow / soin gratuit au déséquipement).
- `recalculateStats()` recalcule `hpMax` à chaque appel : `c.hpMax = c._baseHpMax + sum(bonusHpMax)`.
  → ajouter `_baseHpMax` / `_baseSpMax` au modèle perso (lazy-init).
- Au déséquipement, si `c.hp > c.hpMax` après recalc → clamp à `hpMax`.

**Cibles** :
- Item `coeur_lion` (set Gryffondor 4/4 — déjà existant, ajouter `bonusHpMax: 10`).
- Nouvel item `cor_pegasse` (épée acc, drop boss étage 7, `bonusHpMax: 8`).
- `larmes_phenix` (epic) : `+5 bonusSpMax` (synergie regen).
- Set Serpent 4/4 : passif `bonusSpMax: 5` (à brancher après).

**Vérification** :
- T1 : hpMax 35 baseline → équipe `coeur_lion` → hpMax 45.
- T2 : déséquipe alors que `hp = 45` → clamp à 35.
- T3 : recharge save legacy sans `_baseHpMax` → init à `hpMax` courant.

### Vague C — `critBonus` (multiplicateur crit) — faible risque

**Spec** :
- Étendre `critMultiplier` (V1 = 1.5 constant) en `1.5 + sum(critBonus)`.
- Cap à 2.5 pour éviter one-shots boss.

**Cibles** :
- `wand2` (Sureau, rare) : `+0.2 critBonus` (= 1.7× crit).
- Set du Lion 4/4 passif déjà actif (4 set = +X crit chance) → ajouter
  `+0.3 critBonus` sur le passif (cumul avec crit chance, cohérent
  thème « rage du lion »).

**Vérification** :
- Mock `Math.random` pour forcer crit, `executeAttack` log doit afficher
  un dégât = `atk * 1.7` (au lieu de 1.5).

### Vague D — `firstStrike` + initiative (gros chantier)

**Pré-requis** : refonte du tour de jeu (`battle.js — startBattle`).
Aujourd'hui, `enemyGroup` agit après le groupe. Pour `firstStrike`, il
faut une **vraie initiative** mêlant alliés et ennemis.

**Spec** :
- `agi` détermine l'ordre : `initiative = agi + d20 + (firstStrike ? 100 : 0)`.
- `UX.renderTimeline` (déjà existant) doit refléter l'ordre mixte.
- Cap d'1 tour par entité par round (pas de double-attaque).

**Risque** : casse balance, ennemis « Détraqueur » (agi 18) deviennent
trop forts → re-tester tous les étages.

**Cibles** :
- `bottes_dragon` (rare) : `firstStrike: true`.
- `ceinture_cuir` (common) : `+3 agi` au lieu de `firstStrike` (alternative).

**Verdict** : à différer à V3 si le chantier est gros — la valeur métier
est faible vs effort.

### Vague E — Slots faction-locked + variantes nommées (V3)

**Spec** :
- Champ `requiresHouse: 'gryffondor'` sur item → `equipItem` refuse si
  `chosenHouse !== 'gryffondor'`.
- Variantes nommées : item `wand_phoenix` (Plume de Fumseck, drop unique
  quête Dumbledore Tier 5) avec `unique: true` (1 par save).

**Reporté** — peu de valeur tant que `houses-2.0` n'a pas été joué
plusieurs heures pour tester l'engagement réel.

## 3. Étapes (Vague A à C)

- [x] Vague A — ajouter les 6 champs `bonusCritChance/DodgeChance` dans `data.js`.
- [x] Vague A — smoke `scenarioCritDodgeFromEquip` (4 sous-cas).
- [x] Vague A — `node tests/smoke.js` vert.
- [x] Vague B — étendre `recalculateStats` avec `_baseHpMax`/`_baseSpMax` + clamp `hp`/`sp`.
- [x] Vague B — ajouter `bonusHpMax`/`bonusSpMax` sur 4 items + `cor_pegasse` nouveau.
- [x] Vague B — migration save : init `_baseHpMax = hpMax` si absent.
- [x] Vague B — smoke `scenarioHpSpMaxBonus` (T1-T5).
- [x] Vague C — étendre `critMultiplier` en `1.5 + Σ bonusCritDamage` (cap 2.5).
- [x] Vague C — `wand2` `bonusCritDamage: 0.2` ; Set Lion 4/4 déjà pourvu.
- [x] Vague C — smoke `scenarioCritBonusMultiplier` (T1-T3).
- [x] Vagues A+B+C — commit + push (un seul commit : les changements sont
      entrelacés — `wand2` porte des champs A et C, `recalculateStats`
      touche B et C — un découpage par vague serait artificiel).

### Écarts constatés (mise à jour en cours d'implémentation)

- **Vague C — nom de champ.** Le plan parlait d'un nouveau champ `critBonus`.
  Le codebase porte déjà `bonusCritDamage` (items + `HOUSE_SETS`), et
  `recalculateStats` calcule déjà `critMultiplier = 1.5 + Σ bonusCritDamage`
  (non capé). Décision : on **réutilise `bonusCritDamage`** (pas de champ
  doublon, cf. guidelines §2/§3) ; Vague C se réduit donc à **capper** le
  multiplicateur à 2.5 et à poser `bonusCritDamage` sur `wand2`.
- **Vague C — Set du Lion 4/4.** `HOUSE_SETS.Gryffondor.setBonus4` porte
  déjà `bonusCritDamage: 0.25` (cumul set 2+3+4 = +0.50). La cible « +0.3
  sur le passif » est donc **déjà satisfaite** — aucun changement sur
  `HOUSE_SETS` (surgical §3).
- **Vague B — Set Serpent 4/4 `bonusSpMax`.** Laissé hors scope (« à
  brancher après » dans le plan d'origine). `recalculateStats` ne somme
  `bonusHpMax/SpMax` que sur les items, pas sur les bonus de set.
- **Vague B — bonus de difficulté (`main.js:322`).** Non touché : le bonus
  PV de départ est appliqué **avant** tout appel à `recalculateStats`, donc
  le lazy-init capture la bonne base. Confirmé par lecture du flux.
- **`cor_pegasse`.** Slot `trinket`, rareté `epic`, drop sur
  `mangemort_elite` (boss étage 7+), `chance: 0.05`. Icône emoji 📯
  (fallback — pas de PNG painterly généré pour cette V2).

## 4. Décisions à valider en marche

- Vague D (firstStrike) : aller jusqu'au bout ou différer V3 ?
- Vague E (faction-locked) : pertinent gameplay ou flavour-only ?

## 5. Risques

- Vague B mal cap → soin gratuit au déséquipement → mitigé par le clamp.
- Vague C mal cap → boss one-shot → cap 2.5 + tests sur `voldemort_revived`.
- Vague D casse complète du combat → ne lancer qu'avec un sous-plan dédié.

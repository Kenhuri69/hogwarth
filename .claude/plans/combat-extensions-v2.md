# Plan — Extensions combat V2 (Garde + Ferula + ennemis)

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au démarrage : **non démarré** — items hors-scope V1 de
> `combat-guard-support.md` (archivé).
> Pré-requis : aucun.

## 1. Contexte

`combat-guard-support.md` (archivé, PR #119) a livré V1 : action Garde
(mitigation 50 % + regen `3 + floor(mag/5)` PM) et sort Ferula (soutien
duo).

Plusieurs extensions naturelles ont été listées en hors-scope :

| Extension | Pourquoi reportée V1 | Source |
|-----------|----------------------|--------|
| Garde + counter-attack | Risque déséquilibrage solo | `combat-guard-support.md §10` |
| Double-Garde (cumul tours) | Stalling potentiel | idem |
| Ferula Maxima (AOE soin) | Pas encore d'AOE bénéfique | idem |
| Ennemis dispel (retire Protego) | Pas encore d'inverse de buff | idem |
| Spellbook Ferula | Sort déjà appris au level-up Hermione | idem |

Ce plan les regroupe en 4 vagues indépendantes, chacune testable.

## 2. Vagues

### Vague A — Garde counter-attack (faible risque, fort gameplay)

**Spec** :
- Si une attaque physique frappe un perso en `guardTurns[idx] > 0` ET
  l'attaque touche (pas d'esquive), 30 % de chance de **counter** :
  - Le perso contre-attaque l'ennemi avec `atk * 0.5` (mitigated).
  - Log : `🛡️→⚔️ Harry contre Mangemort pour 4 dégâts !`
  - Le counter ne consomme pas le tour de Garde.
- Champ optionnel `counterChance` sur perso → cumulable avec armes
  (ex: `bouclier_godric` = `+20% counterChance`).

**Cibles smoke** :
- `scenarioGuardCounter` : mock random à 0.1 → counter trigger ;
  mock à 0.9 → pas de counter.

### Vague B — Double-Garde (moyen risque, balance fragile)

**Spec** :
- Choisir Garde alors que `guardTurns[idx] > 0` → empile à `2`,
  cap à `3` tours.
- Mitigation reste 50 % par hit (pas de cumul mitigation).
- Regen PM redonne `3 + floor(mag/5)` à chaque pose, donc empiler =
  empiler la regen aussi.

**Risque** : stalling complet en duo (Hermione regen Harry, Harry
regen Hermione). Mitigation : ennemis qui voient `guardTurns >= 2` → +50%
chance de tenter `weaken` (les forcer à briser la garde).

### Vague C — Ferula Maxima (AOE soutien duo)

**Spec** :
- Nouveau sort `Ferula Maxima` (PM 12, niveau 5+, déverrouillage
  spellbook ou level-up Hermione 7).
- Effet : applique `regenSp: 2` ET `regenHp: 1` sur **les deux** alliés
  pendant 3 tours.
- Implémenté via `applyStatus` sur chaque allié avec ID `regen_ferula_max`.

**Smoke** : `scenarioFerulaMaxima` : cast → tick 1/2/3 → perso 0 et 1
récupèrent +3 PM +1 HP × 3 tours.

### Vague D — Ennemis dispel (briser Protego/Garde/regen)

**Spec** :
- Nouveau type d'ability `dispel` dans `tryEnemyAbility` :
  ```js
  { type: 'dispel', chance: 0.4, targets: ['shield', 'guard', 'regen'] }
  ```
- Si l'ennemi tire l'ability ET la cible a au moins un buff visé,
  retirer le **premier** trouvé (priorité shield > guard > regen).
- Log : `❌ Mangemort dissipe le Protego de Harry !`

**Cibles ennemies** :
- `mangemort_elite` : ajouter `dispel` 0.3 chance.
- `bellatrix` : ajouter `dispel` 0.5 chance.
- `voldemort_revived` : ajouter `dispel` 0.7 chance + `damage` 0.7 chance.

**Smoke** : `scenarioEnemyDispel` : applique Protego sur Harry, force
Bellatrix dispel → `shieldTurns[0] === 0`.

### Vague E — Spellbook Ferula (cosmétique)

**Spec** :
- Item `livre_ferula` dans `data.js` (rare, drop coffre étage 4-6) :
  enseigne Ferula à tout le groupe (utile si Hermione absente / KO
  permanent / héros sans Ferula natif).
- Pour les nouveaux héros (Louis, Anastasia, Maxence) qui n'ont pas
  Ferula par défaut, ce spellbook devient utile.

## 3. Étapes

- [ ] Vague A — étendre `executeAttack` (battle.js) avec counter logic.
- [ ] Vague A — champ `counterChance` sur perso + items (Coupe Poufsouffle 4/4 set passif ?).
- [ ] Vague A — smoke `scenarioGuardCounter`.
- [ ] Vague A — commit + push.
- [ ] Vague B — étendre action Garde pour empiler `guardTurns`.
- [ ] Vague B — heuristique ennemi : si `guardTurns ≥ 2` → biais weaken.
- [ ] Vague B — smoke `scenarioDoubleGuard` + équilibrage 2 sessions test.
- [ ] Vague B — commit + push.
- [ ] Vague C — `SPELLS.ferula_maxima` + `castSpellInBattle` case.
- [ ] Vague C — `applyStatus` regen_ferula_max sur les 2 alliés.
- [ ] Vague C — smoke `scenarioFerulaMaxima`.
- [ ] Vague C — commit + push.
- [ ] Vague D — étendre `tryEnemyAbility` avec type `dispel`.
- [ ] Vague D — enrichir `mangemort_elite`, `bellatrix`, `voldemort_revived`.
- [ ] Vague D — smoke `scenarioEnemyDispel`.
- [ ] Vague D — commit + push.
- [ ] Vague E — `livre_ferula` dans `ITEMS` + drop coffre étage 4-6.
- [ ] Vague E — `useItem` route spellbook → enseigne Ferula.
- [ ] Vague E — commit + push.

## 4. Risques

- Vague A : counter trop fréquent en solo → cap `counterChance` à 40 %.
- Vague B : stalling abusif → instrumenter via test smoke
  (`scenarioStallingPrevention`) qui vérifie qu'un ennemi avec dispel
  brise la boucle en N tours.
- Vague D : dispel sur Voldemort à 0.7 → infaisable sans Maître des
  Maisons → re-tester après équilibrage.

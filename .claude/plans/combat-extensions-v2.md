# Plan — Extensions combat V2 (Garde + Ferula + ennemis)

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut : **Vagues A-D livrées** (2026-05-17, branche
> `claude/list-open-plans-eDYxT`). Vague E livrée (item `livre_ferula`).
> Smoke `scenarioCombatExtV2` vert. Pré-requis : aucun.

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
- Effet : applique `regenSp: 2` ET `regenHp` sur **les deux** alliés
  pendant 3 tours.
- `regenHp = power(1) + floor(INT/12) + floor(END/16)` du lanceur —
  scaling atténué (Ferula simple utilise INT/8 + END/8) car l'effet
  est AOE sur 3 tours.
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

- [x] Vague A — counter logic dans `enemyTurn` (`_tryGuardCounter`, battle.js).
- [x] Vague A — champ `counterChance` sur perso (`recalculateStats`, somme
  `bonusCounterChance` des items/sets). Base 30 % + bonus, plafond 40 %.
- [x] Vague A — smoke (section A de `scenarioCombatExtV2`).
- [x] Vague B — `battleAction('guard')` empile `guardTurns` (cap 3).
- [x] Vague B — `enemyTurn` ne réinitialise plus la garde : chaque coup
  mitigé consomme un palier ; les paliers non touchés persistent.
- [x] Vague B — heuristique ennemi : `guardTurns ≥ 2` → biais weaken ×1.5
  dans `tryEnemyAbility`.
- [x] Vague B — smoke (section B de `scenarioCombatExtV2`).
- [x] Vague C — `SPELLS` « Ferula Maxima » (`effect:"support_regen_aoe"`).
- [x] Vague C — `_spellSupportRegenAoe` applique `regen_ferula_max` sur les
  deux alliés ; `tickStatuses` rend +power PV / +2 PM par tour.
- [x] Vague C — apprentissage : Hermione niveau 7 (`_grantLevelSpells`).
- [x] Vague C — smoke (section C de `scenarioCombatExtV2`).
- [x] Vague D — `tryEnemyAbility` : nouveau `case 'dispel'` (priorité
  shield > guard > regen ; `return false` si rien à dissiper).
- [x] Vague D — `mangemort_elite` (0.30), `bellatrix` (0.50),
  `voldemort_revenu` (0.70 + Avada à 0.70).
- [x] Vague D — smoke (section D de `scenarioCombatExtV2`).
- [x] Vague E — `livre_ferula` dans `ITEMS` + drop coffre étage 4-6
  (`openChest` — filtre `booksAvailable`).
- [x] Vague E — `useItem` route déjà les `type:"spellbook"` (aucun code).

## 4. Risques

- Vague A : counter plafonné à 40 % via `_tryGuardCounter`. ✅
- Vague B : la persistance des paliers de garde ouvre un risque de
  stalling ; mitigé par le biais weaken (gt ≥ 2) et le cap 3. À surveiller
  en jeu réel.
- Vague D : `voldemort_revenu` cumule dispel 0.70 + Avada 0.70 ; l'ordre
  du tableau `abilities` (Avada en tête) tempère le taux réalisé de dispel.
  À re-tester après équilibrage endgame.

## 5. Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-17 | Vagues A-E | Implémentées en un lot. `battle.js` : `STATUS_DEFS.regen_ferula_max`, tick PV/PM, garde empilable + consommée par coup, `_tryGuardCounter`, Ferula Maxima niveau 7. `battle-spells.js` : `case 'dispel'`, biais weaken, `_spellSupportRegenAoe`. `inventory.js` : `counterChance` dans `recalculateStats`. `data.js` : sort Ferula Maxima + item `livre_ferula`. `monsters.js` : dispel sur 3 ennemis. `movement.js` : `livre_ferula` au loot des coffres ét. 4-6. Smoke `scenarioCombatExtV2` (A counter / B double-garde / C Ferula Maxima / D dispel + biais) — suite complète verte. |
| 2026-05-17 | Icônes dédiées | `livre_ferula` (recette painterly `icon_factory.py` → `img/icons_new/`) et sort `Ferula Maxima` (`gen_element_spell_icons.py` → `img/icons/spells/ferula_maxima.png`) — remplacent les icônes réutilisées. |
| 2026-05-17 | Scaling Maxima | `_spellSupportRegenAoe` : `regenHp` scale désormais `floor(INT/12)+floor(END/16)` du lanceur (atténué vs Ferula simple). Smoke C3 ajusté (+4 PV avec INT 24/END 16). Élément : aucun, conforme — sort de soutien hors système élémentaire. |

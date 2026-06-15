# G2 — Combat

**Statut :** 🟩 à jour — couvre les systèmes récents (relecture design en continu)

> 📊 **Statut réel (code)** : ✅ combat tour par tour, statuts, éléments, crit
> double canal, Garde/Célérité — modules : `js/battle.js`, `js/battle-spells.js`,
> `js/battle-ui.js`, `js/battle-rewards.js`, `js/battle-death.js`.
> Référence technique : [`CLAUDE.md`](../../CLAUDE.md).

> Objectif du chapitre : décrire le **cœur tactique** du jeu — le combat au
> tour par tour, ses cinq actions, le système de statuts, les éléments
> (résistances / faiblesses) et les capacités spéciales des ennemis. Vue
> design, valeurs fidèles au code.

---

## Vue d'ensemble

✅ (dans le jeu) Le combat est **au tour par tour**, déclenché par les
rencontres dans le donjon. Le groupe (1 ou 2 héros selon `partySize`) affronte
un **groupe d'ennemis de 1 à 5 créatures** (plafond `MAX_ENEMY_GROUP = 5`,
`data.js`). C'est le système où convergent toutes les autres mécaniques :
stats (G3), Maisons (G4), équipement (G5) et sorts (G6) ne s'expriment qu'ici.

Le combat se veut **lisible et tactique** plutôt que nerveux : chaque tour, le
joueur choisit une action par héros vivant, puis les ennemis répliquent. La
profondeur vient de la gestion des ressources (PM, statuts, Garde) et de la
lecture des forces/faiblesses élémentaires de l'adversaire.

---

## Fonctionnement

### Déroulé d'un round

✅ (dans le jeu) Un round suit toujours le même ordre :

```
Harry agit  →  (si Duo et Hermione vivante) Hermione agit
            →  les ennemis agissent (chacun son tour)
            →  retour au début du round
```

- Un héros **KO** voit son tour automatiquement sauté.
- En mode **Solo** (`partySize = 1`), seul Harry agit ; l'indicateur de tour
  est masqué.
- L'enchaînement des personnages passe par `advanceBattleChar()`, qui gère
  aussi les **actions supplémentaires** de Célérité (voir G3).

### Les 5 actions du héros actif

✅ (dans le jeu) À chaque tour, le héros actif choisit parmi cinq actions
(barre `#battle-actions`) :

| Action | Coût | Effet résumé |
|--------|------|--------------|
| 🗡️ **Attaquer** | — | Attaque physique sur une cible ; crit possible. |
| ✨ **Sortilège** | PM | Ouvre la liste des sorts du perso (modale dédiée). |
| 🛡️ **Garde** | — | Pose / empile un palier de Garde (mitigation 50 %), restitue des PM. |
| 🧪 **Objet** | — | Inventaire en mode combat (consommables uniquement). |
| 💨 **Fuir** | — | Tente de quitter le combat. |

Quand plusieurs ennemis sont vivants, attaquer ou cibler un sort offensif
ouvre une **sélection de cible** (`showTargetSelection`).

### Ciblage

✅ (dans le jeu) `pendingAction` et `pendingSpell` mémorisent l'action en
attente jusqu'au clic sur un bouton de cible. Les sorts d'attaque visent un
ennemi ; les sorts de soin/support visent un allié.

---

## Règles & valeurs

### Attaque physique

✅ (dans le jeu — `battle.js — executeAttack` + `mitigatedDamage`)

```
dégâts bruts   = atk + (0 à 3 aléatoire)
dégâts mitigés = max( round(bruts × 0.25) , bruts − DEF_effective )
crit           = roll(0–100) < critChance  →  dégâts × critMultiplier
```

- La **mitigation** (`mitigatedDamage`, `DAMAGE_MIN_FRACTION = 0.25`) garantit
  un **plancher à 25 %** des dégâts bruts : un coup ne tombe jamais à 1 dégât
  contre une grosse DEF (suppression de la « falaise »).
- `DEF_effective` tient compte de la **pénétration STR** (D4, voir G3) :
  `effDef = def × (1 − penFrac)`.
- `critChance` / `critMultiplier` sont des **stats dérivées** recalculées par
  `recalculateStats()` (détail en G3).

### Garde (🛡️) — Double-Garde + regen PM

✅ (dans le jeu — `battle.js`)

| Paramètre | Valeur | Source |
|-----------|--------|--------|
| Empilement | `min(3, +1)` par pose (cap 3 paliers) | `guardTurns[idx]` |
| Mitigation | **50 %** des coups physiques | `_enemyPhysicalHit` |
| Regen PM par pose | `3 + floor(mag / 5)`, plafonné à `spMax` | `guardRegenCooldown` |
| Cadence regen | **1 tour sur 2** (cooldown réarmé à 2) | idem |
| Riposte | base **30 %**, plafond **40 %** (+`counterChance` d'équip.) | `_tryGuardCounter` |
| Dégâts de riposte | `atk / 2` (mitigés par la DEF ennemie), **sans consommer de tour** | idem |

- **Chaque coup mitigé consomme un palier** ; les paliers non touchés
  persistent (d'où l'intérêt de la Double-Garde face à plusieurs assaillants).
- La priorité défensive est : **Protego → Esquive → Garde → coup normal**.

### Fuite (💨)

✅ (dans le jeu — `battle.js — doFlee`)

```
chance de base = (AGI_héros_actif > ATK_premier_ennemi) ? 0.70 : 0.40
chance finale  = min(0.95, base + Fortune_groupe)
```

- Le **Balai** (`broom`, en inventaire ou équipé) garantit la fuite à 100 %.
- La **Fortune** du groupe (stat dérivée LCK, voir G3) augmente la chance,
  bornée à 0.95.
- Une fuite ratée ne perd pas le tour du groupe : elle avance simplement au
  combattant suivant.

### Statuts persistants

✅ (dans le jeu — `battle.js : applyStatus / tickStatuses`)

Chaque combattant porte un tableau `statusEffects: [{ id, icon, power, turns }]`.

| Statut | Icône | Type | Effet |
|--------|-------|------|-------|
| `burn` | 🔥 | DoT | Dégâts par tick (feu) |
| `poison` | ☠️ | DoT | Dégâts par tick (poison) |
| `bleed` | 🩸 | DoT | Dégâts par tick (saignement) |
| `gel` | ❄️ | DoT | Dégâts par tick (glace) — 4ᵉ DoT, vecteur `Glacius` |
| `weaken` | 🛡️↓ | malus | Réduit la DEF (`power` = DEF perdue), persistant |
| `disarm` | 🪄↓ | malus | Désarme (vecteur `Expelliarmus`) |
| `regen` | 🩹 | buff | Régénération de PV par tick |
| `stun` | 💫 | contrôle | Fait **sauter le prochain tour** |
| `fear` | 😱 | contrôle | **50 % de chance** de figer chaque tour |

**`stun` (étourdissement)** ✅ : `turns` = nombre de tours sautés.
`consumeStun()` retire 1 tour au **point de saut** ; `tickStatuses` le porte
sans le décompter (sinon l'expiry de fin de round l'annulerait avant qu'il
serve). Si tout le groupe est étourdi, le segment héros est sauté — jamais
d'état figé. Porteurs : `lutin_cornouailles`, `strangulot`, `pitiponk`,
`gargouille`.

**`fear` (peur)** ✅ : décompté **normalement** par `tickStatuses` (durée en
rounds). `rollFearSkip()` fait le jet 50 % à chaque tour sans rien consommer.
Porteurs : `boggart`, `detraqueur`. **Dissipé** par le sort `Patronus Maxima`
(palier Maison 17).

**Résistance aux DoT (D3)** ✅ : les héros réduisent les dégâts de DoT subis de
`floor(end / 12)` (plancher 1) — débouché défensif de l'END (voir G3).

### Éléments — résistances & faiblesses

✅ (dans le jeu — `RESIST_MULTIPLIER = 0.5`, `WEAK_MULTIPLIER = 1.5`, `data.js`)

Le matching se fait sur **`spell.element`** (pas `spell.effect`).

| Marqueur | Effet | Affichage bestiaire |
|----------|-------|---------------------|
| `enemy.resist[]` | sort atténué **× 0.5** | 🔰 |
| `enemy.weak[]` | sort amplifié **× 1.5** | 💥 |

**6 éléments** : `feu` 🔥 · `glace` ❄️ · `foudre` ⚡ · `lumière` ✨ ·
`ténèbres` 🌑 · `physique` ⚔️.

La clé `disarm` reste une **résistance mécanique** (bloque Expelliarmus),
orthogonale aux éléments. `Lumos Solem` porte `bonusVsUndead:1.5` (×1.5 contre
les morts-vivants : catégorie `fantôme` + `UNDEAD_IDS`).

### Capacités spéciales des ennemis

✅ (dans le jeu — `battle-spells.js — tryEnemyAbility`)

Chaque ennemi peut porter un tableau `abilities[]` ; à son tour, chaque
capacité est tentée selon sa `chance` (0.0–1.0).

| `effect` | Effet |
|----------|-------|
| `damage` | Dégâts magiques : `power + floor(mag / 2)` |
| `heal` | L'ennemi se soigne |
| `weaken` | Réduit la DEF de la cible |
| `drain` | Draine des PV et s'en soigne à moitié |
| `status` | Inflige un statut (`statusId` : burn/poison/bleed/stun/fear…) |
| `dispel` | Retire un buff cible (priorité **shield > guard > regen**) ; si rien, attaque normale |
| `maxhpdamage` | **Broyer** (anti-tank) — voir ci-dessous |

**Broyer (`maxhpdamage`)** ✅ : levier anti-tank.
```
dégâts = power × PV_max_cible      (ignore la DEF)
borné à : cap × référence          (capRef "hit" → cap × mitigatedDamage(atk, def)
                                     capRef "atk" → cap × atk)
```
Bloqué par Protego. Octroyé **automatiquement** aux « brutes »
(`isBruteMonster` : `atk ≥ 1,5×mag` & `atk ≥ 12`) dans `scaleMonster`, **pas**
déclaré dans `monsters.js`. Calibrage : `power 0.10`, `chance 0.5`, `cap 2`,
`capRef "hit"` — la référence `hit` rétrécit quand la DEF du joueur monte, ce
qui **découple les dégâts du grind**.

**Heuristique anti-stalling** ✅ : face à une cible en Double-Garde
(`guardTurns ≥ 2`), la `chance` des capacités `weaken` est **multipliée par
1,5**.

### Effets passifs d'équipement en combat

✅ (dans le jeu — `battle.js — applyEquipmentRegen`) À chaque tour ennemi,
après le tick des statuts, chaque héros vivant régénère la somme des
`regenHp` / `regenSp` de ses pièces équipées (plafonné par `hpMax`/`spMax`,
aucun regen sur perso KO). Ex. `larmes_phenix` (`amulet`, `regenHp:3`).

### Récompenses

✅ (dans le jeu — `battle.js — endBattle`) Après victoire : chaque entrée de
`enemy.drops[]` est tirée indépendamment (drop × `(1 + Fortune)`), l'XP et l'or
sont distribués, et chaque kill rapporte des **points de Maison** selon la
difficulté (8 / 10 / 14 / 18 — voir G4) puis déclenche `checkKillQuests()`.

---

## Interactions

- **G3 Progression** : crit physique (LCK), crit de sort + esquive + Célérité
  (AGI), Fortune (LCK), pénétration STR (D4), résistance DoT (D3) — toutes les
  stats dérivées s'appliquent **dans** le combat.
- **G4 Maisons** : passifs Apothéose actifs en combat (Élan crit Gryffondor,
  lifesteal Serpentard, coût réduit Serdaigle, Vigueur Poufsouffle).
- **G5 Équipement** : bonus de stats, `grantsSpell`, `regenHp/Sp`,
  `bonusCritChance`/`bonusDodgeChance`/`counterChance`, sets de Maison.
- **G6 Sorts** : catalogue, éléments, crit de sort, statuts infligés.
- **G8 Difficulté & scaling** : taille des groupes (`rollGroupSize`),
  `currentMaxGroupSize()`, scaling au grind, capacité Broyer.
- **Audio** : `playHit()`, `playSpellCast()` + `speakSpell()`, `playVictory()`,
  `playDeath()` se branchent sur les évènements de combat.

---

## Cas limites & garde-fous

✅ (dans le jeu)
- **Groupe entièrement étourdi** → le segment héros est sauté proprement
  (jamais d'état figé).
- **Personnage KO** → tour automatiquement sauté.
- **Plancher de dégâts** (25 %) → pas d'attaque physique à 1 dégât face à une
  haute DEF.
- **Plafond de groupe contextuel** : `currentMaxGroupSize()` retourne 5
  uniquement en endgame **et** Duo post-victoire (`partySize === 2 &&
  victoryAchieved && currentFloor >= 11`), sinon **3** — source de vérité
  partagée par le spawn naturel **et** les invocations `summon`.
- **Stun vs Fear** : `stun` se compte en sauts (porté sans décompte par
  `tickStatuses`), `fear` se compte en rounds (décompté normalement) — deux
  mécaniques de timing distinctes à ne pas confondre.
- **Broyer borné** → ne « one-shot » jamais : plafonné à `cap × référence`,
  bloqué par Protego.

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : valeurs précises de DoT par sort/statut (power de base,
> nombre de ticks) — à extraire de `STATUS_DEFS` / `STATUS_BY_SPELL` si on veut
> un barème exhaustif côté design.

> ❓ À détailler : `ai` ennemie (`aggressive` / `cautious` / `random`) — impact
> concret sur le choix de cible et l'ordre des capacités (logique
> `tryEnemyAbility`).

> 💡 (proposition) Un encart « lecture d'un combat » pour le joueur débutant :
> repérer 🔰/💥 au bestiaire avant d'engager, prioriser la Garde face aux
> brutes (Broyer), garder du PM pour le soin. Non implémenté comme tutoriel.

---

## Récapitulatif express (pour briefer Gemini)
> Combat **tour par tour**, 1-2 héros vs 1-5 ennemis. 5 actions : Attaquer
> (crit LCK), Sortilège (PM), Garde (mitige 50 %, empile, regen PM, riposte),
> Objet, Fuir. **6 éléments** (résist ×0.5 / faiblesse ×1.5), **9 statuts**
> (DoT, stun, fear, weaken…), capacités ennemies dont **Broyer** anti-tank.
> Tout converge ici : stats dérivées, passifs de Maison, sorts, équipement.

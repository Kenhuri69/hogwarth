# Audit de l'économie d'or & propositions de rééquilibrage

**Date** : 2026-05-25
**Branche** : `claude/game-economy-gold-audit-kD46N`
**Statut** : ⏳ Diagnostic + propositions chiffrées — **aucune modification de code à ce stade**.
**Mode demandé** : audit complet + propositions chiffrées (validé par AskUserQuestion).

> ⚠️ Lecture : ce document est un **plan vivant** au sens du §5 des
> guidelines. La phase d'implémentation est conditionnée à une
> validation explicite des fixes par l'utilisateur. Tant que cette
> validation n'a pas eu lieu, ne pas modifier `js/data.js`,
> `js/monsters.js`, `js/shop.js`, etc.

---

## 0. Méthodologie

- Sources de vérité utilisées : `js/data.js`, `js/state.js`,
  `js/monsters.js`, `js/dungeon.js`, `js/movement.js`, `js/shop.js`,
  `js/battle.js`, `js/quests.js`, `js/npcs.js`.
- Pas de mesure runtime — analyse statique uniquement.
- Toutes les estimations « or par étage » supposent : **Normal,
  partie duo, pas de farming respawn, pas de variantes
  shiny/darkness, pas de bonus de Maison Poufsouffle Tier 17 « Récolte
  Magique »**. Ce sont des moyennes basses ; le joueur attentif fera
  systématiquement mieux.

---

## 1. Constantes économiques actuelles

### 1.1 `DIFFICULTY_SETTINGS` (`js/state.js:22-62`)

| Mode      | startingGold | goldMultiplier | xpMultiplier |
|-----------|--------------|----------------|--------------|
| Facile    | 60           | 1.6            | 1.4          |
| Normal    | 25           | 1.0            | 1.0          |
| Difficile | 15           | 0.75           | 0.9          |
| Expert    | 8            | 0.55           | 0.75         |

> Le `goldMultiplier` s'applique **à la sortie** de `scaleMonster()`
> (`js/dungeon.js:91-101`) sur le gold de drop. Les coffres et la
> fouille n'utilisent **pas** ce multiplicateur — c'est déjà une
> incohérence (cf. §4.A).

### 1.2 Progression XP (`js/data.js:41`)

`LEVEL_UP_XP_MULTIPLIER = 1.6` — `xpNext = floor(xpNext × 1.6)`. Base
50 XP au niveau 1 → 80 au niv. 2, 128 au niv. 3, 204 au niv. 4, 327 au
niv. 5, 524 au niv. 6, 838 au niv. 7, etc.

### 1.3 `ENDGAME_SCALING` (`js/dungeon.js:26-28`)

```js
{ baseFix: { hp:80, atk:10, def:5, mag:8, xp:50, gold:80 }, scalDelta: 0.5 }
```

Pour les boucles ténébreuses (étages 11+), `gold` reçoit un bonus
additif de `+80 / intraMult` par boucle, puis est multiplié par
`scal = 1 + 0.5 / intraMult`. **Inflexion majeure au passage 10→11**.

---

## 2. Cartographie des flux

### 2.A Sources d'or (revenus)

| Source | Localisation | Formule / fourchette |
|--------|--------------|----------------------|
| Drops monstres | `monsters.js` × `scaleMonster` (`dungeon.js:74-107`) | `floor(((min+max)/2) × (1 + (floor-1)×scale) × goldMultiplier)` |
| Coffre standard (38 %) | `movement.js:628-668` | `floor(rand()×30 + 10) × currentFloor` |
| Coffre fallback (équip raté) | `movement.js:663-664` | idem coffre standard |
| Coffre énigme | `movement.js:569-596` | `floor(rand()×25 + 35) × currentFloor`, ×2 si runique |
| Fouille | `movement.js:820-826` | `floor(rand()×15 + 5)` ; ×0.5 si déjà fouillée (recharge 60-100 pas) |
| Autel — pari gagné | `movement.js:1047-1049` | `+20 × currentFloor` (50 % succès) |
| Quêtes | `quests.js` (templates) | de 20 à 250 G selon palier (cf. §2.D) |
| Vente d'équipement | `shop.js:326-341` | `price × buyback.mult` (par défaut 0.50) |
| Bonus Maison Poufsouffle Tier 17 | `houses-mythe-tier-v3.md` | +50 % or de combat post-victoire |
| Variante Shiny (~4 %) | `dungeon.js` | gold ×2 |
| Variante Darkness (étage 11+) | `dungeon.js` ENDGAME | déjà intégré dans `scaleMonster` |
| Duel PvP (multijoueur) | `multiplayer.js:780,811,817` | +80 à +120 G (hors PvE) |

### 2.B Puits d'or (dépenses)

| Puits | Localisation | Fourchette |
|-------|--------------|------------|
| Boutique (55 items) | `data.js:315-503` + `shop.js` | 15 G (mandragore) → 2800 G (Portus) |
| Autel — offrande | `movement.js:1027-1043` | `40 × currentFloor` (étage 1 = 40 G, étage 10 = 400 G) |
| Quête de don Tier 17 | plan Maisons V3 | gold-sink endgame (montant variable selon Maison, à recouper côté implémentation) |
| Repos (`rest`) | `movement.js:1114-1151` | **gratuit** |
| Fontaine (`useFountain`) | `movement.js:1093-1112` | **gratuit** |

Pas d'autre `player.gold -=` dans la base.

### 2.C Drops monstres — tableau condensé par tranche d'étages

Or de base = `(min+max)/2` (avant scaling et `goldMultiplier`).

| Tranche | Représentants | Or de base moyen | Note |
|---------|---------------|------------------|------|
| 1-3 (intro) | Chat, Luciole, Cornichon, Lutin, Mimi, Bowtruckle | **2-6 G** | Très bas, normal pour l'amorce. |
| 2-6 (Bloc B) | Mandragore, Niffleur, Kappa, Elfe rebelle, Gobelin | **8-18 G** | Cohérent. |
| 3-7 (mid) | Troll, Centaure, Détraqueur, Méduse, Strangulot | **12-22 G** | Cohérent. |
| 4-9 (haut Bloc B) | Hippogriffe, Inférius, Loup-Garou, Vampire Novice | **16-32 G** | Cohérent. |
| 5+ (profondeurs) | Mangemort, Spectre, Sorcier Renégat, Strigoï, Hécate | **22-75 G** | Cohérent. |
| 6+ (boss zone) | Basilic, Chimère, Bibliothécaire (epic) | **30-70 G** | Faible vs. effort. |
| 7+ (élite) | Mangemort d'Élite, Nagini, Manticore, Gargouille | **35-75 G** | **Plateau** — voir §4.B. |
| 8+ (boss) | Bellatrix | 65 G | Drop trop bas pour un epic. |
| 9-10 (finaux) | Voldemort Affaibli, Voldemort Ressuscité | 100-160 G | Cohérent. |

### 2.D Quêtes — récompenses or (`js/quests.js`)

| ID | Étage / Donneur | Or | Notes |
|----|-----------------|----|-------|
| `quest_intro` | 1 — Dumbledore | 20 | Tutoriel. |
| `quest_eveil` | 1-2 — Dumbledore | 50 | Apprend Wingardium Leviosa. |
| `quest_courage_ruse` | 2-3 — Dumbledore | 100 | +1 item moyen. |
| `quest_ordre_phenix` | 3-4 — Dumbledore | 160 | +Amulette (250 G valeur). |
| `quest_revelation` | 4+ — Dumbledore | 250 | Stats bonus. |
| `mandragore_pomfresh` | 2 — Pomfresh | 40 | + Episkey + potion. |
| `livre_interdit` | 3 — Lockhart | 25 | + wand1 (120 G). |
| `troll_toilettes` | 3 — Mimi | 60 | + robe1 (150 G). |
| `chouette_perdue` | 2 — Hagrid | 30 | + broom (200 G). |
| `niffleurs_tresor` | 4 — Hagrid | 80 | + amulette. |
| `golem_passage` | 4-5 — McGo | 70 | + livre_bombarda (490 G). |
| `lumiere_desespoir` | 5+ — Dumbledore | 50 | + Patronum. |
| `apprenti_potion` | 1-2 — Rogue | 40 | + recettes potions. |
| `ingredients_maitre` | 3-4 — Rogue | 90 | + recettes L. |
| `defense_cabane` | 3 — Hagrid | 60 | + potion_m. |
| `ce_que_lune` | 4-5 — McGo | 120 | Stats bonus. |
| `inconnue_3eme` | 3 — PNJ random | 30 | Petit. |

**Observation** : la moyenne pondérée est **~70 G par quête**, ce qui
représente ~2-4 combats moyens. Cohérent, sans abus.

---

## 3. Métriques calculées par étage (Normal, duo)

Or moyen / combat = moyenne pondérée par `weight` des monstres
disponibles à cet étage, scalé par `(1 + (floor-1)×scale)`. Les
groupes sont multiplicatifs (`partySize=2` → 1.5× monstres en moyenne
à partir de l'étage 3).

| Étage | Or / combat (estim.) | Or coffre moy. | Or fouille moy. | Item le plus cher accessible | Combats pour 1 item top |
|-------|----------------------|----------------|------------------|-------------------------------|--------------------------|
| 1  | ~6 G   | 25 G  | 12 G | Bag. Saule 120 G       | ~20 combats |
| 2  | ~15 G  | 50 G  | 12 G | Robe Renforcée 150 G   | ~10 combats |
| 3  | ~25 G  | 105 G | 12 G | Bag. Sureau 300 G      | ~12 combats |
| 4  | ~40 G  | 140 G | 12 G | Bombarda 490 G         | ~12 combats |
| 5  | ~55 G  | 175 G | 12 G | Retourneur 550 G       | ~10 combats |
| 6  | ~65 G  | 210 G | 12 G | **Nox Vorax 1200 G**   | ~18 combats |
| 7  | ~75 G  | 245 G | 12 G | **Portus 2800 G**      | **~37 combats ⚠️** |
| 8  | ~85 G  | 280 G | 12 G | idem 7                 | ~33 combats |
| 9  | ~100 G | 315 G | 12 G | idem 7                 | ~28 combats |
| 10 | ~120 G | 350 G | 12 G | idem 7                 | ~23 combats |
| 11+ | ~180+ G (scal récursif) | 385+ G | 12 G | idem 7 | ~15 combats |

> Lecture : « combats pour 1 item top » = `prix / (or-combat +
> or-coffres-ramenés-à-l'unité-de-combat)`. Approximation rough : un
> coffre tous les 5-7 combats, une fouille tous les 3-4 pas.

---

## 4. Anomalies factuelles identifiées

### 4.A `goldMultiplier` n'agit que sur les drops de monstres

**Constat** : `scaleMonster()` applique `diffMult.goldMultiplier`,
mais **ni les coffres, ni la fouille, ni les autels, ni les quêtes**
ne l'appliquent. Conséquence : en Expert (`goldMult=0.55`), un
combattant gagne 45 % de moins en or sur les drops mais **autant**
qu'en Normal sur tout le reste. Le ratio coffres/drops devient
dominé par les coffres en haute difficulté → l'incitation à
combattre baisse.

### 4.B Plateau de drops étages 6-10 (hors items-trophées)

**Constat** : entre l'étage 6 et l'étage 10, l'or par combat passe
de ~65 à ~120 G (×1.85). Sur la même tranche, le prix max d'item
« pallier » (hors items-trophées) passe de 700 G (Vulnera) à
1200 G (Nox Vorax). Le ratio reste raisonnable (~10-18 combats par
achat), **mais** l'enchaînement étage 6 → étage 7 voit les prix
sauter sans que les drops suivent à la même pente. Une légère
inflation des drops étage 7-10 lisserait la courbe d'équipement
courante.

> Note : les items-trophées (Portus 2800 G, et tout autre objet
> « spécieux » au-dessus de ~1200 G) sont **exclus de ce constat** —
> ils sont positionnés comme objectifs longue durée et ne doivent
> **pas** être alignés sur la pente standard. Cf. §4.C ci-dessous.

### 4.C Items-trophées (Portus 2800 G) — barrière de coût voulue

**Statut** : ✅ **Design intentionnel** confirmé par l'utilisateur.

Portus (`livre_portus`, 2800 G, étage 6+) et tout futur item de la
même classe sont des **objectifs économiques longue durée** :
l'écart 1200 G → 2800 G n'est pas une anomalie, c'est la
fonction de l'item. Ils servent de gold-sink endgame, motivent
l'exploration des étages profonds (où l'or scale mieux), et
récompensent le joueur patient. **Aucune action à prendre.**

Conséquence pour les recommandations : tous les fixes ci-dessous
doivent **préserver** ce ratio « combats pour un trophée » plutôt
que le réduire. Si on augmente les drops étage 7-10 (§5.4), on
doit s'assurer que Portus reste ressenti comme « cher mais
atteignable » — pas comme un achat de routine.

### 4.D Boutique : `minFloor` non monotone

Quelques items disponibles très tôt ont un prix sous-évalué par
rapport à leur utilité :
- `Bottes du Silence` (420 G, étage 6) — passif d'esquive très fort.
- `Cape d'Invisibilité` (400 G, étage 7) — AGI+5 LCK+5, top tier.
- `Talisman du Tacticien` (300 G, étage 6) — prix d'item étage 4.

À l'inverse, certains items étage 1-2 paraissent surévalués :
- `Baguette de Saule` (120 G, étage 1) — l'achat à l'étage 1 demande
  ~20 combats alors qu'un coffre étage 1 en lâche fréquemment.

### 4.E Récompenses de fouille jamais scalées

**Constat** : `gold = floor(rand()×15 + 5)` (`movement.js:820-826`)
ne dépend ni de l'étage, ni de la difficulté. Une fouille à l'étage 10
rapporte la même chose qu'à l'étage 1 (5-20 G). Sur 10 étages de
durée, c'est une source progressive **non négligeable** qui s'érode.

### 4.F Repos & fontaine 100 % gratuits

**Constat** : aucun puits de gold n'oblige à dépenser pour se
soigner. Combiné avec :
- l'autel d'offrande à 40×floor (souvent perçu comme cher pour un
  effet équivalent à 1 fontaine gratuite + un peu d'XP),
- l'absence de potion-spam obligatoire (rest gratuit),

le résultat est un **stockage d'or inutilisé** en milieu/fin de
partie. Le joueur attend les paliers boutique pour dépenser.

### 4.G Bonus Poufsouffle Tier 17 = +50 % or asymétrique

**Constat** (cf. CLAUDE.md / `houses-mythe-tier-v3.md`) : Poufsouffle
au Tier 17 gagne « Récolte Magique » (+50 % or de combat). Les
3 autres Maisons reçoivent un sort exclusif au lieu d'un sink, et au
Tier 18 c'est un passif. Conséquence : Poufsouffle a un avantage
économique systématique en endgame, **mais** comme la boucle ténébreuse
n'a presque plus rien à acheter (Portus déjà acquis, tout le reste à
1200 G max), ce bonus est essentiellement décoratif. Si on rééquilibre
les prix ou ajoute des sinks endgame (cf. §4.I + §5.6), ce bonus
devient signifiant à auditer.

### 4.I Trou endgame — or accumulé sans usage passé l'étage 10

**Statut** : 🚨 **Confirmé par l'utilisateur (2026-05-25)** comme un
manque de design à combler.

**Constat** : une fois Portus acquis (2800 G, dernier palier boutique
étage 6+) et tous les équipements pallier achetés, **il n'existe plus
aucune raison économique de combattre**. Pourtant :

- La boucle ténébreuse (étages 11+) booste les drops via
  `ENDGAME_SCALING` (or de combat ~180+ G/combat).
- Variantes Shiny (×2) + Darkness apparaissent fréquemment en endgame.
- Bonus Poufsouffle Tier 17 ajoute +50 %.
- La quête de don Tier 17 (`houses-mythe-tier-v3.md`) est un sink
  **unique** (one-shot par Maison) — pas un canal récurrent.

Résultat factuel : un joueur en boucle ténébreuse 2-3 cumule
typiquement **5 000 à 15 000 G dormants**. Le système économique
devient purement décoratif passé l'étage 12. L'or perd sa fonction
motivante.

**Impact ludique** :
- Les combats endgame n'ont plus que l'XP et le score Ironman comme
  motivation (et l'XP elle-même plafonne en pente raide).
- Le bonus Poufsouffle Tier 17 (§4.G) devient nul → asymétrie cassée.
- Pour le mode Ironman, l'or contribue au score (`× 0.5`) mais ne
  débloque rien → pas de choix tactique « dépenser ou thésauriser ».

Voir §5.6 pour les pistes chiffrées de résolution.

### 4.H Coffre énigme runique : ×2 or peu repérable

`movement.js:569-596` : un événement « runique » double le gold du
coffre énigme. Probabilité et trigger précis à recouper, mais
l'événement n'est pas visible dans le HUD avant l'overlay → effet
de surprise positive, **sans abus connu**.

---

## 5. Propositions chiffrées de rééquilibrage

Toutes les propositions ci-dessous sont **indépendantes** : on peut
en retenir une partie. Chacune affiche `avant → après` + impact
estimé sur le ratio « combats / item top ».

### 5.1 ~~Repricer Portus~~ — **abandonnée**

Cette reco a été retirée après clarification : Portus (2800 G) est
un item-trophée à barrière de coût **voulue**. Cf. §4.C. Ne pas
toucher au prix ni au `minFloor` de `livre_portus`.

### 5.2 (Reco forte) Scaler la fouille par étage

**Cible** : §4.E.

```diff
- gold = Math.floor(Math.random()*15 + 5);
+ gold = Math.floor((Math.random()*15 + 5) * (1 + (currentFloor-1)*0.20));
+ gold = Math.floor(gold * (diffMult ? diffMult.goldMultiplier : 1));
```

**Avant** : 5-20 G constants.
**Après** :
- Étage 1 : 5-20 G (inchangé).
- Étage 5 : 9-36 G.
- Étage 10 : 14-58 G.

Aligne la fouille sur la même pente que les coffres (`× currentFloor`)
mais en plus doux (×0.20 par étage au lieu de ×1.0). Impact total
estimé sur 10 étages : +~3 G/combat en moyenne — petit mais corrige
l'écart relatif.

> Inclure aussi l'application du `goldMultiplier` ici pour cohérence
> §4.A (sinon Expert n'est jamais pénalisé sur la fouille).

### 5.3 (Reco moyenne) Aligner coffres et autel sur `goldMultiplier`

**Cible** : §4.A.

3 lignes à modifier (`movement.js:573, 638, 664` + `movement.js:1049`
pour le pari) :
```diff
- player.gold += gold;
+ const gMult = (typeof DIFFICULTY_SETTINGS !== 'undefined' &&
+               DIFFICULTY_SETTINGS[difficulty]?.goldMultiplier) || 1;
+ player.gold += Math.max(1, Math.floor(gold * gMult));
```

Impact en Expert (×0.55) :
- Coffre étage 5 actuel ~125 G → 70 G.
- Fouille (déjà reco §5.2) ~20 G → 11 G.
- Pari étage 5 actuel 100 G → 55 G.

Cohérence retrouvée : difficulté agit uniformément. Si trop sévère
en Expert, **alternative** : appliquer un `goldMultiplier` plus doux
sur ces sources (e.g. `min(1, goldMult + 0.20)` → 0.75 au lieu de
0.55 en Expert).

### 5.4 (Reco moyenne) Lisser le plateau drops monstres 6-10

**Cible** : §4.B — items pallier, **pas les trophées**.

Augmenter le `scale` de 4 monstres clés étage 6+ pour que les drops
suivent mieux la courbe d'équipement courant. L'augmentation est
volontairement **modérée** : un trophée à 2800 G doit toujours
demander ~25-30 combats à l'étage 10 (pas moins).

| Monstre | `scale` actuel | `scale` proposé | Or étage 10 (avant → après) |
|---------|----------------|------------------|------------------------------|
| Mangemort d'Élite | 0.32 | **0.38** | ~119 G → ~135 G |
| Manticore Juvénile | 0.32 | **0.38** | ~150 G → ~170 G |
| Bellatrix Lestrange | 0.35 | **0.40** | ~190 G → ~210 G |
| Nagini | 0.32 | **0.36** | ~110 G → ~123 G |

Impact global : ~+12 G/combat à l'étage 10 → ratio pour Nox Vorax
(1200 G) descend de ~10 à ~9 combats. Ratio pour Portus (2800 G)
descend de ~23 à ~21 combats — toujours « cher mais atteignable ».

### 5.5 (Reco faible) Réduire le coût de l'autel d'offrande

**Cible** : §4.F.

`movement.js:1029` : `cost = 40 × currentFloor` → `cost = 25 × currentFloor`.

Avant / après :
- Étage 1 : 40 → 25 G (équivaut à 1 mandragore).
- Étage 5 : 200 → 125 G (1/3 d'une potion grande).
- Étage 10 : 400 → 250 G (utilisable plus souvent).

Combiné avec la fontaine gratuite, l'autel reste un choix
secondaire, mais devient **attractif** dans les zones sans fontaine
(étages 3-4, 6-7, 9-10). Justifie une dépense régulière → réduit le
stockage stérile.

### 5.6 (Reco forte — endgame) Combler le trou de sinks après étage 10

**Cible** : §4.I + §4.G.

**Constat à résoudre** : 5 000-15 000 G dormants en boucle ténébreuse,
aucune motivation économique aux combats. **Plusieurs pistes
combinables** (toutes indépendantes) ; je liste ce qui paraît le
mieux aligné avec l'architecture existante, du plus simple au plus
ambitieux. Chacune appelle une décision utilisateur avant
implémentation.

#### Piste A — Catalogue boutique endgame étendu (effort : faible)

**Idée** : ajouter 4-6 items haut de gamme au `SHOP_CATALOG`
(`shop.js`) avec `minFloor: 11`, 14, 17, accessibles uniquement en
boucle ténébreuse. Profite du système existant sans refonte.

| Type d'item | Prix indicatif | minFloor | Effet |
|-------------|----------------|----------|-------|
| **Élixir Permanent +PV** | 1500 G | 11 | +5 PV max permanent (consommable, cap 5 usages) |
| **Élixir Permanent +PM** | 1500 G | 11 | +5 PM max permanent (cap 5) |
| **Pierre d'Âme** | 3000 G | 14 | +1 stat permanente au choix (cap 3 par perso) |
| **Grimoire Interdit** | 4000 G | 14 | Enseigne 1 sort exclusif endgame |
| **Pendentif d'Ombre** | 6000 G | 17 | epic acc, regenHp:5 + bonusCritDamage |
| **Reliquaire Lunaire** | 8000 G | 17 | legendary trinket, +20 % or de combat (stack avec Poufsouffle) |

**Volume drainé estimé** : un joueur en boucle 2 cumulant 8000 G peut
acheter 2-3 items → drain immédiat de l'essentiel du stock dormant,
suivi d'un rythme régulier (1 item / boucle complète).

**Avantages** : 0 refonte, réutilise filtrage `minFloor` existant,
items eux-mêmes peuvent boucler dans `tools/icon_factory.py` (cf.
section dédiée du CLAUDE.md).

**Risques** : doit éviter de power-creep le mode Ironman (les
Élixirs Permanents +PV/+PM rendent les runs « tankés » trop faciles
si non plafonnés). Cap à 5-3 usages par catégorie résout ça.

#### Piste B — Don à la Maison récurrent (effort : faible-moyen)

**Idée** : étendre la « quête de don Tier 17 » (déjà gold-sink
endgame, one-shot) en **mécanique récurrente** : un PNJ Maison
(Directeur·trice) accepte de l'or contre des `housePoints`
supplémentaires, au-delà du palier 1000 (Tier 16).

**Taux proposé** : `1 housePoint = 5 G` (1000 G = 200 points). Les
paliers existants s'arrêtent à 1000 points — on créerait **paliers
20+** (1100, 1300, 1600, 2000…) chacun débloquant un mini-bonus
cosmétique ou de stat. **Plan séparé requis** pour designer les
paliers — celui-ci est complémentaire de `houses-mythe-tier-v3.md`.

**Volume drainé** : illimité par construction. Sink le plus
« propre » au sens design (canal narratif, non transactionnel).

**Risques** : nécessite un plan dédié `house-post-tier-18.md` ; pas
implémentable en V1.

#### Piste C — Forge / Amélioration d'item (effort : moyen-élevé)

**Idée** : un PNJ forgeron au campement endgame propose
**d'améliorer** un item équipé (`+1`, `+2`, `+3`) contre or +
matériau (drop monstre rare). Cap `+3` par item. Coût exponentiel :

| Niveau | Coût or | Matériau (drop endgame) | Bonus |
|--------|---------|--------------------------|-------|
| +1 | 1000 G | 1 × Cristal Sombre | +10 % stats item |
| +2 | 3000 G | 3 × Cristal Sombre | +25 % stats item |
| +3 | 8000 G | 1 × Larme de Voldemort | +50 % stats item |

**Volume drainé** : 12 000 G par item top → si le joueur a 4-5 items
à améliorer, drain de 50 000+ G sur la durée. Forte motivation au
combat (drop matériau + or).

**Risques** : refonte majeure (`equipped[slot].level`, recalcul
`recalculateStats`, UI inventaire), migration de save, équilibrage
sensible. Doit faire l'objet d'un plan dédié `item-upgrade-system.md`.

#### Piste D — Reroll d'enchantement (effort : moyen, version révisée)

**Idée originale §5.6 v1** : un PNJ « Enchanteur » consomme 200-500 G
par tentative pour réassigner un slot d'équipement (réroll des
bonus aléatoires si on en introduit).

**Statut révisé** : dépend d'un système d'enchantements aléatoires
non encore implémenté. **Reporté** tant que les items n'ont pas de
bonus randomisés (actuellement tous les items ont des bonus fixes
dans `data.js`).

#### Piste E — Marchand itinérant rare (effort : faible)

**Idée** : extension de `getRandomVendorsForFloor()` (`npcs.js`) :
ajouter un PNJ vendeur **rare** (~10 % spawn) en étages 11+ avec un
inventaire premium tournant (1-3 items haut de gamme tirés au seed
de l'étage). Items premium = sous-ensemble du catalogue Piste A,
mais **avec prix +30-50 %** (premium itinérant). Le joueur qui le
croise ressent un événement, et le surcoût est perçu comme légitime
(« on est tombé sur le bon marchand au mauvais moment »).

**Volume drainé** : ponctuel mais marquant. Bon compagnon de Piste A
sans la remplacer.

---

#### Recommandation prioritaire

**Piste A** (catalogue boutique endgame étendu) — meilleur ratio
effort / impact, zéro refonte, drain immédiat de 30-50 % du stock
dormant, ré-active le bonus Poufsouffle Tier 17.

**+ Piste B** (don à la Maison récurrent) en V2, traitée dans un
plan dédié — fournit le sink illimité pour les très longs runs.

**Pistes C / D / E** : à plan séparé si validées plus tard.

### 5.7 (Reco optionnelle) Rééquilibrer prix item « trop forts »

**Cible** : §4.D.

| Item | `price` actuel | Proposition | Justification |
|------|----------------|-------------|---------------|
| `Bottes du Silence` | 420 | **520** | Passif esquive AGI fort. |
| `Cape d'Invisibilité` | 400 | **550** | AGI+5 LCK+5 = stat budget d'un epic. |
| `Talisman du Tacticien` | 300 | **380** | Sous-évalué vs. autres acc étage 6. |
| `Baguette de Saule` | 120 | **80** | Souvent loot gratuit au coffre étage 1. |

---

## 6. Synthèse — impact combiné des recommandations retenues

Recos actives : **§5.2** (fouille scalée) + **§5.3** (goldMultiplier
appliqué partout) + **§5.4** (lissage drops 6-10).
Portus (2800 G) reste **inchangé** — c'est le trophée.

Ratios « combats pour un item pallier 1200 G » (Nox Vorax / Vulnera
2.0) avant vs après :

| Étage | Combats / item pallier (avant) | Combats / item pallier (après) |
|-------|--------------------------------|---------------------------------|
| 6  | ~18 | ~16 |
| 7  | ~16 | ~13 |
| 8  | ~14 | ~12 |
| 9  | ~12 | ~10 |
| 10 | ~10 | ~9  |

Ratios « combats pour le trophée Portus 2800 G » avant vs après :

| Étage | Combats / Portus (avant) | Combats / Portus (après) |
|-------|--------------------------|---------------------------|
| 6  | ~43 | ~38 |
| 7  | ~37 | ~32 |
| 8  | ~33 | ~28 |
| 9  | ~28 | ~25 |
| 10 | ~23 | ~21 |

→ La courbe d'équipement courant redevient confortable, **la barrière
du trophée reste sensible** (~25-30 combats post-étage 8, conforme à
l'intention de design). Le farming respawn n'est plus indispensable
pour les items pallier, et reste un choix tactique pour Portus.

---

## 7. Phasage proposé pour l'implémentation (si validé)

> ⛔ Aucune étape ci-dessous ne doit être exécutée sans validation
> explicite de l'utilisateur sur les fixes retenus.

### Étape 1 — `Reco forte` (§5.2)
- [ ] Modifier `js/movement.js` (formule fouille scalée par étage +
      `goldMultiplier`).
- [ ] Vérif : `node tests/smoke.js` reste vert.
- [ ] Capture inventaire post-fouille étage 5 (visuel).

### Étape 2 — `Cohérence diffMult` (§5.3)
- [ ] Ajouter helper `_applyGoldMult(amount)` dans `movement.js`.
- [ ] Appliquer aux 4 call-sites (coffre standard, coffre fallback,
      pari, fouille).
- [ ] Vérif smoke en chaque difficulté (Normal, Expert).

### Étape 3 — `Lissage drops` (§5.4)
- [ ] Bumper `scale` des 4 monstres listés dans `js/monsters.js`.
- [ ] Vérif bestiaire : pas de régression d'affichage (HP/atk
      attendus à l'étage 10 cohérents).

### Étape 4 (optionnelle) — `Autel + prix items` (§5.5 + §5.7)
- [ ] À discuter — impact ressenti plus subtil, moins prioritaire.

### Étape 5 — `Commit + push + PR`
- [ ] 1 commit par étape (révisible isolément).
- [ ] PR groupée vers `master` avec changelog clair.
- [ ] Vérifier l'état de PR existante avant `git push` (§6 des
      guidelines).

---

## 8. Risques & vigilances

- **Sauvegardes existantes** : les changements de `price` /
  `minFloor` ne migrent rien (le prix n'est lu qu'à l'affichage
  boutique), donc safe. Les changements de `scale` monstre affectent
  uniquement les **futurs** spawns, jamais les `enemyMap` déjà
  matérialisés dans un save.
- **Mode Ironman / Hall of Fame** : `computeIronmanScore` utilise
  `or × 0.5` dans la base. Un +X % d'or → +X×0.5 % de score. Effet
  marginal, pas besoin de re-fitter `DIFFICULTY_SCORE_MULT`.
- **Robot fantôme** (`robot.html`) : simule un joueur, ses heuristiques
  de farming pourraient changer. Re-tester `tests/smoke.js` + visite
  manuelle de la page robot après §5.4.
- **Tests de non-régression** : `node tests/smoke.js` (Playwright)
  couvre le golden path. Si on modifie l'autel ou la fontaine, ajouter
  un scénario dédié dans le même commit (§7 guidelines).

---

## 9. Hors-scope V1 (à plan séparé si validé plus tard)

- §5.6 Pistes B / C / D / E : sinks endgame avancés (don récurrent à
  la Maison, forge d'amélioration, reroll d'enchantement, marchand
  itinérant rare). La **Piste A** (catalogue boutique endgame
  étendu) est promue en V1 si validée — cf. §5.6 recommandation
  prioritaire.
- Rééquilibrage des **multiplicateurs de difficulté** eux-mêmes
  (`xpMultiplier` / `goldMultiplier`) — demande une revue plus large
  de la courbe XP, pas uniquement de l'or.
- Audit symétrique sur l'**XP** : pendant cet audit j'ai noté en
  passant que `LEVEL_UP_XP_MULTIPLIER=1.6` impose une croissance très
  raide après le niveau 7 (>800 XP), à mettre en regard du XP fixe
  des quêtes. Méritera un plan dédié `xp-curve-audit.md`.
- Ajustement des prix de vente (buyback) — actuellement 50 %
  uniforme, pourrait être différencié par rareté.

---

## 10. Journal du plan

- **2026-05-25** : création du plan, diagnostic complet, propositions
  chiffrées (§5.1 à §5.7), priorité reco forte sur §5.1 + §5.2 + §5.3.
  En attente de validation utilisateur pour passer à l'implémentation.
- **2026-05-25 (amendement)** : utilisateur précise que les items
  « spécieux » (Portus 2800 G et équivalents) sont des **trophées à
  barrière de coût voulue**, à ne pas aligner sur la pente standard.
  → §5.1 retirée, §4.B reformulée pour exclure les trophées, §4.C
  passée de « anomalie » à « design intentionnel », §5.4 ré-équilibrée
  pour préserver le ressenti « cher mais atteignable » de Portus
  (~25-30 combats post-étage 8 après lissage), §6 et §7 mis à jour.
  Recos actives restantes : **§5.2 + §5.3 + §5.4**.
- **2026-05-25 (amendement 2)** : utilisateur signale un **trou de
  design endgame** — l'or s'accumule sans usage passé l'étage 10.
  → Ajout §4.I (constat chiffré : 5 000-15 000 G dormants en boucle
  ténébreuse, bonus Poufsouffle Tier 17 devenu nul). §5.6 réécrite
  comme section de réflexion ouverte avec 5 pistes chiffrées (A à E),
  recommandation prioritaire **Piste A** (catalogue boutique endgame
  étendu, 4-6 items 1500-8000 G `minFloor: 11-17`) — effort faible,
  drain immédiat de 30-50 % du stock dormant. Pistes B-E reportées
  en plans séparés. §9 mis à jour. **Décision utilisateur attendue**
  avant implémentation de la Piste A.

# G8 — Difficulté & scaling

**Statut :** 🟧 ébauche

> Objectif du chapitre : décrire comment le jeu adapte sa résistance au joueur
> — via le réglage de difficulté initial, le scaling des ennemis par étage, la
> composition des groupes adverses (solo/duo) et la pression croissante liée au
> grind.

---

## Vue d'ensemble

✅ (dans le jeu) Quatre curseurs distincts façonnent la difficulté ressentie :

1. **Le réglage de difficulté** choisi au démarrage, qui module stats ennemies,
   économie et confort de départ.
2. **Le scaling par étage**, qui applique une formule de croissance à chaque
   monstre en fonction de l'étage où il apparaît.
3. **La taille des groupes ennemis**, qui dépend du mode Solo/Duo et de la
   tranche d'étages.
4. **La pression au grind**, qui alourdit progressivement les rencontres si le
   joueur ponce un même étage plutôt que de descendre.

Ces quatre axes sont indépendants et se cumulent : en Expert à l'étage 8 après
vingt kills sur le même niveau, les combats sont sensiblement plus durs qu'au
premier passage au même étage en Facile.

---

## Fonctionnement

### Difficulté — le réglage global

✅ (dans le jeu — `state.js : DIFFICULTY_SETTINGS`) Le joueur choisit son niveau
au démarrage. Ce choix **pilote un unique objet de configuration** qui distribue
ses effets dans tout le code. Chaque propriété de cet objet est un multiplicateur
ou une valeur de départ ; le code lit toujours `DIFFICULTY_SETTINGS[difficulty]`
plutôt que d'appliquer des règles en dur.

En mode **Ironman**, ce réglage est **verrouillé** dès la confirmation du héros :
`changeDifficulty()` refuse toute modification et affiche un message explicatif.

### Scaling par étage — la formule de croissance

✅ (dans le jeu — `dungeon-scaling.js : scaleMonster`) Quand un monstre est
instancié pour un combat, ses stats de base (PV, ATK, DEF, XP, or) sont
multipliées par :

```
stat_finale = stat_base × intraMult × diffMult
```

- `intraMult` = `1 + (etageEffectif − 1) × scale`
  Le coefficient `scale` (de `0.15` pour les monstres lents à `0.40` pour les
  créatures agressives) est propre à chaque monstre et détermine sa courbe de
  croissance.
- `diffMult` = `scalingMultiplier` du réglage actif (voir tableau ci-dessous).
- `etageEffectif` = `effectiveFloor(floor)` — vaut toujours 1-10 grâce au
  recyclage de la Boucle Ténébreuse (voir « Interactions »).

**Post-victoire, la Boucle Ténébreuse** ajoute une récursion supplémentaire :
à chaque palier de dix étages supplémentaires, la formule est réappliquée
(`_endgameRecurse`) avec un bonus fixe par stat (`+80 PV / +10 ATK / +5 DEF…`)
lissé pour ne pas écraser les monstres déjà forts.

**Variantes visuelles** : le nom et l'apparence du monstre varient selon l'étage
pour signaler sa puissance relative — normal (étages 1-2), Féroce (≥ 3),
Ancien (≥ 5), Ténébreux (post-victoire, étages 11+), et Shiny (4 % de chance
pour tout monstre, +50 % XP, ×2 or, drops doublés).

### Taille des groupes — solo vs duo

✅ (dans le jeu — `battle.js : rollGroupSize`) À l'ouverture de chaque combat,
le nombre d'ennemis est tiré aléatoirement selon des **probabilités de base**
différenciées par mode et par tranche d'étages.

**Plafond contextuel (`currentMaxGroupSize`)** : source de vérité unique
partagée entre le tirage de groupe et les invocations (`summon`). La valeur est
`MAX_ENEMY_GROUP` (5) uniquement pour un duo en endgame post-victoire à l'étage
11+, **3 partout ailleurs** — ce plafond historique s'applique en solo, en duo
avant la victoire, et aux invocations ennemies.

Les **groupes de 3 en duo sont différés à l'étage 7+** : avant cet étage, la
probabilité trio (`p3`) reste à 0 quelle que soit la difficulté.

### Difficulté progressive au grind — le compteur de kills

✅ (dans le jeu — `battle.js : rollGroupSize`, `state.js : floorKillCount`) Le
jeu mémorise le total de kills par étage dans `floorKillCount` (persisté à la
sauvegarde). À chaque combat, un **niveau de visite** `n` est calculé :

```
n = floor(kills_sur_cet_étage / 4)
```

Ce `n` alimente deux bonus cumulatifs sur les probabilités de groupe :

- `duoBonus` = `min(0.40, 0.10 × n)` : transfert de probabilité 1 ennemi → 2.
- `trioBonus` = `min(0.40, 0.10 × (n − 4))` si `n ≥ 5` : transfert 2 → 3.

**Respawn 20 %** : quand le joueur revient sur un étage déjà vidé, chaque
cellule où il a vaincu un ennemi a 20 % de chance de voir un ennemi respawner
(`_respawnEnemiesOnEntry`). Le toast narratif affiché varie selon `n` pour
signaler la pression croissante au joueur.

---

## Règles & valeurs

### Les 4 difficultés

✅ (dans le jeu — `state.js : DIFFICULTY_SETTINGS`)

| Propriété | Facile | Normal | Difficile | Expert |
|-----------|--------|--------|-----------|--------|
| `scalingMultiplier` (ennemis) | ×0.75 | ×1.0 | ×1.22 | ×1.45 |
| `enemyGroupMultiplier` (groupes) | ×0.65 | ×1.0 | ×1.35 | ×1.65 |
| `goldMultiplier` (or gagné) | ×1.6 | ×1.0 | ×0.75 | ×0.55 |
| `xpMultiplier` (XP gagnée) | ×1.4 | ×1.0 | ×0.9 | ×0.75 |
| `dropChanceMultiplier` (drops) | ×1.5 | ×1.0 | ×0.7 | ×0.45 |
| `startingGold` (or de départ) | 60 | 25 | 15 | 8 |
| `startingHpBonus` (PV de départ) | +12 | 0 | −4 | −8 |
| `searchRechargeSteps` (pas avant refouille) | 45 | 60 | 80 | 100 |
| Points de Maison / kill (G4) | 8 | 10 | 14 | 18 |
| `DIFFICULTY_SCORE_MULT` (Ironman) | ×0.8 | ×1.0 | ×1.4 | ×1.8 |

> La dernière ligne (multiplicateur de score Ironman) est alignée sur les points
> de Maison par kill : ratio identique (0.8 / 1.0 / 1.4 / 1.8).

### Taille des groupes ennemis par mode/étage

✅ (dans le jeu — `battle.js : rollGroupSize`)

Les probabilités ci-dessous sont les **valeurs de base au premier passage**
(n = 0), avant application du `duoBonus`/`trioBonus` et du
`enemyGroupMultiplier`. Pour la Difficulté et l'Expert, les multiplicateurs
> 1 font glisser les probabilités vers les groupes les plus grands.

| Mode | Étages 1-2 | Étages 3-4 | Étages 5-6 | Étages 7+ |
|------|-----------|-----------|-----------|----------|
| **Solo** | 100 % × 1 | ~70 % × 1 / ~30 % × 2 | ~50 % × 1 / ~50 % × 2 | ~50 % × 1 / ~50 % × 2 |
| **Duo** | ~65 % × 1 / ~35 % × 2 | ~35 % × 1 / ~65 % × 2 | ~35 % × 1 / ~65 % × 2 | ~20 % × 1 / ~35 % × 2 / ~45 % × 3 |

> Les probabilités Solo étages 3-4 et 5+ sont exprimées en Normal (÷ par
> `enemyGroupMultiplier = 1.0`) ; les plafonds `max(0.10, …)` garantissent
> au moins 10 % de chance d'avoir un ennemi seul. Les trios en Duo
> n'apparaissent qu'à l'étage 7+ (p3 = 0 avant).

**Groupes de 4-5 ennemis (quad/quint)** : uniquement débloqués en endgame,
Duo post-victoire (`partySize === 2 && victoryAchieved && currentFloor >= 11`).
Le passage à quad nécessite `n > 6` (plus de 28 kills sur l'étage), le quint
nécessite `n ≥ 10` (40+ kills). Le plafond absolu `MAX_ENEMY_GROUP = 5`
(`data.js`) ne peut jamais être dépassé.

### Paliers de scaling au grind

✅ (dans le jeu — `battle.js : rollGroupSize`, commentaires inline)

| Stade | n | duoBonus (p1→p2) | trioBonus (p2→p3) | Description |
|-------|---|-----------------|------------------|-------------|
| Premier passage | 0 | 0 % | 0 % | Probabilités de base, pression nulle |
| Échauffement | 1 | +10 % | 0 % | Légèrement plus de duos |
| Habitué | 2 | +20 % | 0 % | Duos fréquents |
| Familier | 3 | +30 % | 0 % | Duos nets |
| Maîtrisé | 4 | +40 % (cap) | 0 % | Cap duo atteint |
| Ponceur | 5 | +40 % | +10 % | Trios commencent |
| Ponceur ++ | 6 | +40 % | +20 % | Trios réguliers |
| Vétéran | 7 | +40 % | +30 % | Trios courants |
| Vétéran ++ | 8 | +40 % | +40 % (cap) | Cap trio atteint |
| Endgame farm | 9+ | +40 % | +40 % | Palier max (+ quad/quint si débloqué) |

**Toasts narratifs au respawn** (`movement-floors.js : _announceRespawn`) :
les messages indiquent au joueur le niveau de pression sans l'exposer aux
chiffres bruts.

| n | Message |
|---|---------|
| ≤ 1 | « Quelques ombres se reforment dans les couloirs. » |
| ≤ 3 | « Les ombres se reforment plus nombreuses cette fois. » |
| ≤ 5 | « Tu sens des présences hostiles se rassembler — ta présence dérange. » |
| ≥ 6 | « Le château pulse de menaces. L'étage te défie ouvertement. » |

### Broyer — octroi automatique aux brutes

✅ (dans le jeu — `dungeon-scaling.js : isBruteMonster + BRUTE_CRUSH_ABILITY`)
Les monstres qualifiés de « brutes » reçoivent automatiquement la capacité
**Broyer** à l'instanciation (via `scaleMonster`), sans déclaration explicite
dans `monsters.js`. Le prédicat est pur et partagé avec le bestiaire :

```
isBruteMonster ↔ (atk_base ≥ 1.5 × mag_base)  ET  (atk_base ≥ 12)
```

Calibration figée : dégâts = 10 % des PV max cible (ignore la DEF), 50 % de
chance, borne 2 × coup normal mitigé. Voir G2 pour la mécanique complète.

---

## Interactions

- **G2 Combat** : `rollGroupSize` détermine le groupe avant `startBattle`.
  La capacité Broyer (anti-tank) est décrite en G2 ; elle est octroyée ici par
  `scaleMonster`.
- **G3 Progression** : le `diffMult` de `scalingMultiplier` multiplie
  `intraMult`, ce qui signifie que la difficulté Expert + étage 10 produit
  un monstre environ 1.45 × plus fort qu'en Normal au même étage.
- **G4 Maisons** : les points de Maison par kill (8 / 10 / 14 / 18) sont
  pilotés par la difficulté ; progresser en Ironman Expert rapporte 2.25 ×
  plus de points qu'en Facile.
- **G7 Exploration / endgame** : `effectiveFloor()` recycle les étages 11+
  vers 1-10 pour la Boucle Ténébreuse (un monstre d'étage 14 a la puissance de
  base d'étage 4, augmentée par la récursion endgame). Le farm matériaux de la
  Boucle repose sur les quêtes répétables du Gardien (voir G7/G9).
- **Ironman (G9)** : le multiplicateur de score `DIFFICULTY_SCORE_MULT`
  (0.8/1.0/1.4/1.8) reflète exactement la difficulté choisie. Le plafond
  anti-farm `killsCounted = min(totalKills, étageMax × 12)` garantit que
  poncer un étage ne gonfle pas le classement : seule la progression réelle
  (descendre) débloque davantage de points.

---

## Cas limites & garde-fous

✅ (dans le jeu)

- **Solo : pas de trio avant l'étage 7+** — `p3` reste à 0 en Solo quelle que
  soit la valeur de `n` (la table baseline n'expose `p3 > 0` qu'en mode Duo
  étages 7+).
- **Plafond p1 à 10 %** — même en Expert avec un `enemyGroupMultiplier` de
  1.65, un plancher `max(0.10, …)` est appliqué à `p1` pour éviter d'éliminer
  complètement les combats solo.
- **Quad/quint hors endgame-duo** — `currentMaxGroupSize()` retourne 3 dans
  tous les autres contextes ; les invocations ennemies (`summon`) lisent la même
  fonction, pas une valeur locale.
- **Ironman verrouillé** — `changeDifficulty()` refuse toute modification si
  `ironmanMode === true`. Une partie démarrée en Expert Ironman ne peut pas
  basculer en Normal en cours de route.
- **Plafond anti-farm Ironman** — `killsCounted = min(totalKills, étageMax × 12)`
  (`ironman.js : KILLS_PER_FLOOR_CAP = 12`). Si un joueur accumule 200 kills
  au même étage, seuls `étageMax × 12` sont comptés. L'étage max pèse 150 pts
  unitaire, encourageant la profondeur.
- **`scalingMultiplier` vs `enemyGroupMultiplier`** — ce sont deux leviers
  distincts. Le premier gonfle les stats du monstre individuel ; le second fait
  glisser les probabilités de groupe vers plus d'ennemis. En Expert, les deux
  se combinent : ennemis plus forts ET plus nombreux.
- **Shiny (4 %)** — spawn aléatoire, non garanti ; les shiny sont des brutes
  améliorées mais gardent leur statut de brute (isBruteMonster évalue les stats
  de base, avant la variante shiny).

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : simulation des probabilités de groupe résultantes par
> difficulté + étage + n — un tableau `sim-difficulty.js --group-size` (déjà
> évoqué dans CLAUDE.md) permettrait d'objectiver l'équilibre et de détecter
> des paliers non intentionnels.

> ❓ À détailler : impact exact du `enemyGroupMultiplier` sur les bornes
> `max(0.10, p / m)` en Expert et Facile — la formule crée-t-elle une asymétrie
> notable entre les deux extrêmes ? À vérifier si on veut calibrer pour l'Expert
> solo tardif.

> ❓ À détailler : le scaling de la `mag` ennemie (non scalée par `intraMult`
> en pré-victoire, seulement par la récursion endgame en post-victoire — est-ce
> intentionnel comme levier d'équilibre ?).

> 💡 (proposition) Afficher le niveau de visite `n` (ou un équivalent
> narratif : « Étage maîtrisé / Étage redouté ») dans l'interface, pour que le
> joueur comprenne pourquoi les combats durcissent quand il reste au même étage.
> Non implémenté.

---

## Récapitulatif express (pour briefer Gemini)

> **4 difficultés** (Facile→Expert) : multiplicateurs de scaling ennemi
> (×0.75→×1.45), de groupes (×0.65→×1.65), d'économie (or×1.6→×0.55,
> XP×1.4→×0.75). Scaling par étage : `stat × intraMult × diffMult`, coefficient
> `scale` propre à chaque monstre. Taille des groupes : tableau Solo/Duo, trios
> différés à l'étage 7+, quad/quint seulement en endgame-duo post-victoire.
> Grind : `n = floor(kills/4)` → duoBonus (+10 %/n, cap +40 %) puis trioBonus
> (n≥5) → respawn 20 % avec toasts. Anti-farm : plafond kills Ironman
> (`étageMax × 12`), référence `hit` de Broyer qui rétrécit avec la DEF.

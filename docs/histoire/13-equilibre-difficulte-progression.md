# 13 — Équilibre, Difficulté & Progression

**Statut :** 🟩 proposition de référence — à valider

> 📊 **Statut réel (code)** : ✅ doctrine appliquée + validation par simulation —
> modules : `js/dungeon-scaling.js`, `js/data.js` (constantes), `js/battle*.js`,
> `tools/sim-difficulty.js`.
> Cf. [index doc ↔ module](../README.md#index-doc--module--statut-réel).

> Objectif du chapitre : poser la **doctrine d'équilibrage** du jeu et la relier
> à la descente narrative. Comment la difficulté *sert l'histoire* (sentiment de
> descente, peur croissante, héroïsme contre corruption), comment la **courbe de
> progression** monte par acte et par tranche d'étages, quels **facteurs**
> l'infléchissent (Maison, héros, signatures, solo/duo, niveau de Boucle), et
> comment **valider l'équilibre par simulation**. Ce chapitre est le pont entre
> la structure dramatique de [04](04-structure-actes-et-etages.md) et la
> mécanique documentée en gameplay
> ([G3](../gameplay/G3-progression.md) · [G4](../gameplay/G4-maisons.md) ·
> [G8](../gameplay/G8-difficulte-scaling.md) · [G9](../gameplay/G9-meta.md)).
>
> **Convention** : `✅` = acté/mesuré dans le jeu (valeurs fidèles au code et aux
> simulations) ; `💡` = proposition argumentée *non encore implémentée* ; `❓` =
> point à trancher. Les chiffres ✅ sont sourcés sur `DIFFICULTY_REPORT.md`,
> `DIFFICULTY_STUDY.md` et le code (`dungeon-scaling.js`, `state.js`, `data.js`).
>
> ⚠️ **Garde-fou de cohérence** : plusieurs idées que l'on attend *naturellement*
> dans un chapitre d'équilibrage — *« Gryffondor = combats plus durs »*, *« les
> Éclats donnent de la puissance »*, *« héritage à la mort en Boucle »* — **ne
> sont pas dans le jeu aujourd'hui** et **contredisent des garde-fous existants**
> ([04 §4.7](04-structure-actes-et-etages.md) : *les 4 Maisons partagent la même
> grille ; aucune variante ne modifie la structure de difficulté*). Elles sont
> donc traitées en `💡` avec un `❓` de validation, jamais présentées comme acquises.

---

## 13.0 Doctrine en une phrase

> *La difficulté n'est pas un obstacle posé sur l'histoire — elle **est** le récit
> de la descente : familière en haut, oppressante en bas, surmontable par la
> progression et jamais par le hasard.*

Trois promesses tenues par l'équilibrage :

1. **Lisibilité** — le joueur comprend *pourquoi* ça durcit (il descend, il
   ponce, le répit se raréfie), via des signaux diégétiques (toasts de respawn,
   variantes de monstres, transitions de tranche) plutôt que des chiffres bruts.
2. **Justice** — aucun pic non intentionnel (✅ « aucun spike détecté »,
   `DIFFICULTY_REPORT.md §5`) ; un mur de fin de partie qui **se franchit par
   l'investissement** (niveaux, artefacts, Forge/Bibliothèque, sets), pas par la
   chance.
3. **Motivation** — chaque palier franchi rouvre une marge confortable, de sorte
   que la pression *monte sans jamais devenir désespoir* tant que le joueur
   accepte de progresser.

---

## 13.1 Principes généraux d'équilibrage

### 13.1.1 La difficulté au service de l'histoire

✅ La structure A→B→C→D ([04](04-structure-actes-et-etages.md)) cale l'escalade
mécanique sur l'escalade dramatique. Chaque tranche a un **rôle d'équilibrage**
distinct, qui double son rôle narratif :

| Tranche | Étages | Rôle narratif | Rôle d'équilibrage | Sentiment visé |
|---------|--------|---------------|--------------------|----------------|
| **A** Couloirs | 1–3 | L'école se fissure | **Pédagogie** : marge d'erreur large, on apprend les systèmes en sécurité | Familier, rassurant |
| **B** Cachots | 4–6 | La menace se nomme | **Serrage** : la marge se réduit, le tank et les sorts deviennent nécessaires | Inquiétude |
| **C** Profondeurs | 7–10 | Crescendo de boss → climax | **Crête** : enchaînement de boss, attrition réelle, gate de fin d'arc | Tension, héroïsme |
| **C fin → D** Ruines | 11+ | Post-game corrompu | **Plateau de prestige** : pression infinie *maîtrisée* par le farming | Oppressant, mythologique |

> ✅ La tension monte par **trois leviers** qui se renforcent et que le joueur
> *ressent* ([04 §4.3](04-structure-actes-et-etages.md)) : (1) **taille des
> groupes** (1 → 2 → 3, trios à l'étage 7+) ; (2) **densité au grind**
> (`floorKillCount`) ; (3) **raréfaction du répit** (fontaines tous les 3 étages).
> Ces trois leviers sont la *grammaire diégétique* de la difficulté : aucune
> n'est un curseur invisible.

> 💡 **Quatrième levier d'ambiance (cosmétique, proposé)** : un **niveau de
> corruption** dérivé de la profondeur (givre plus dense, fog plus froid, barks
> plus sombres) — *non mécanique*, il fait *ressentir* la descente sans toucher
> l'équilibrage. Spéc : [10 §10.6](10-lieux-et-geographie.md).

### 13.1.2 Trois registres de difficulté

Le jeu superpose **trois échelles** distinctes — à ne pas confondre :

| Registre | Nature | Pilote | Statut |
|----------|--------|--------|--------|
| **« Normale » (réglage global)** | Le curseur de difficulté choisi au démarrage (Facile / Normal / Difficile / Expert) | `DIFFICULTY_SETTINGS[difficulty]` | ✅ dans le jeu |
| **« Héroïque » (par Maison)** | L'identité de Maison colore l'expérience : profil de stat récompensé, set, sort/passif endgame | `HOUSE_BONUSES[chosenHouse]` | ✅ **mais purement bénéfique aujourd'hui** (pas un modificateur de difficulté — voir ⚠️ ci-dessous) |
| **« Ténébreuse » (Boucle)** | L'endgame post-victoire rejoue le château corrompu, plus profond et plus fort | `effectiveFloor` + `endgameTierIndex` + `ENDGAME_SCALING` | ✅ dans le jeu |

> ⚠️ **Précision capitale sur le registre « héroïque »** : dans le jeu actuel, le
> choix de Maison **n'augmente ni ne baisse la difficulté** — les 4 Maisons
> partagent **exactement la même grille de paliers** et le même scaling ennemi
> ([04 §4.7](04-structure-actes-et-etages.md), [G4](../gameplay/G4-maisons.md)).
> L'idée *« Gryffondor = combats plus durs mais meilleures récompenses »* est une
> **proposition** (`💡`, §13.3.1) qui **romprait** ce garde-fou ; elle est donc
> présentée comme un *mode optionnel à valider*, jamais comme l'état du jeu.

### 13.1.3 Les quatre curseurs réels (rappel)

✅ La difficulté ressentie résulte de **quatre axes indépendants qui se cumulent**
([G8](../gameplay/G8-difficulte-scaling.md)) :

1. **Réglage global** (`DIFFICULTY_SETTINGS`) — stats ennemies, économie, confort
   de départ.
2. **Scaling par étage** (`scaleMonster`) — `stat × intraMult × diffMult`.
3. **Taille des groupes** (`rollGroupSize`) — solo/duo × tranche.
4. **Pression au grind** (`floorKillCount`) — densité croissante si on ponce.

En Expert + étage 8 + 20 kills sur place, un combat est **beaucoup** plus dur
qu'au premier passage du même étage en Facile : les quatre axes empilent leurs
effets.

---

## 13.2 Courbe de progression globale

### 13.2.1 Réglage global — les 4 difficultés

✅ (`state.js — DIFFICULTY_SETTINGS`)

| Propriété | Facile | Normal | Difficile | Expert |
|-----------|:------:|:------:|:---------:|:------:|
| `scalingMultiplier` (stats ennemies) | ×0.75 | ×1.0 | ×1.22 | ×1.45 |
| `enemyGroupMultiplier` (taille groupes) | ×0.65 | ×1.0 | ×1.35 | ×1.65 |
| `goldMultiplier` | ×1.6 | ×1.0 | ×0.75 | ×0.55 |
| `xpMultiplier` | ×1.4 | ×1.0 | ×0.9 | ×0.75 |
| `dropChanceMultiplier` | ×1.5 | ×1.0 | ×0.7 | ×0.45 |
| `startingGold` | 60 | 25 | 15 | 8 |
| `startingHpBonus` | +12 | 0 | −4 | −8 |
| Points de Maison / kill | 8 | 10 | 14 | 18 |
| `DIFFICULTY_SCORE_MULT` (Ironman) | ×0.8 | ×1.0 | ×1.4 | ×1.8 |

> ✅ **Cohérence du contrat de difficulté** : monter d'un cran rend les ennemis
> plus forts **et** plus avares (moins d'or/XP/drops) **et** plus nombreux, mais
> récompense davantage en points de Maison et au classement Ironman. La
> difficulté est un *échange* lisible, pas une simple multiplication.

### 13.2.2 Scaling des ennemis par étage

✅ (`dungeon-scaling.js — scaleMonster`)

```
stat_finale = stat_base × intraMult × diffMult
  intraMult = 1 + (etageEffectif − 1) × scale      // scale ∈ [0.15 ; 0.40] par monstre
  diffMult  = scalingMultiplier du réglage actif
  etageEffectif = effectiveFloor(floor)            // 1-10, recyclé en Boucle
```

✅ **Profil ennemi moyen** (pondéré par `weight`, `DIFFICULTY_REPORT.md §2`) — la
croissance est **régulière, sans spike** :

| Étage | HP moy | ATK moy | DEF moy | MAG moy |
|------:|-------:|--------:|--------:|--------:|
| 1 | 13 | 3.0 | 0.8 | 2.4 |
| 3 | 30 | 7.5 | 3.1 | 5.6 |
| 5 | 73 | 17.6 | 8.9 | 11.1 |
| 7 | 131 | 30.8 | 15.5 | 21.5 |
| 8 | 176 | 41.1 | 20.1 | 28.4 |
| 10 | 274 | 57.9 | 29.3 | 49.6 |
| 12 | 315 | 68.1 | 33.3 | 59.1 |

> ✅ Le coefficient `scale` propre à chaque monstre (0.15 lent → 0.40 agressif)
> crée une **variété** de courbes à étage égal — c'est voulu (`DIFFICULTY_STUDY.md
> §5`). Les boss (Bellatrix, Voldemort : `scale 0.40`) montent le plus vite.
> 💡 Piste *non prioritaire* : resserrer la plage (ex. 0.20→0.34) lisserait
> l'expérience si une recalibration fine était souhaitée un jour.

### 13.2.3 Scaling de la Boucle Ténébreuse (post-victoire)

✅ (`dungeon-scaling.js — ENDGAME_SCALING`, `_endgameRecurse`)

Après la victoire, les étages 11+ recyclent leur `etageEffectif` (`floor − 10`)
puis appliquent une **récursion** par palier de 10 étages :

```
n = endgameTierIndex(floor) = floor((floor − 1) / 10)   // 1 pour 11-20, 2 pour 21-30…
stat = _endgameRecurse(stat0, n, fixEff, scal)           // applique (stat×scal + fixEff) n fois
  scalDelta(n) = 0.8 + 0.2 × (n − 1)                     // base 0.8 + croissance +0.2/palier
  scal   = 1 + scalDelta(n) / intraMult                  // lissé par intraMult
  fixEff = baseFix[stat] / intraMult                      // baseFix {hp:112, atk:14, def:7, mag:11, xp:70, gold:112}
```

> ✅ **Calibration « R1 marqué » (2026-06)** : la Boucle était trop facile pour
> un joueur suréquipé — `scalDelta` relevé de 0.5 → **0.8**, croissance
> `scalDeltaGrowth` **+0.2/palier**, `baseFix` ×1.4. Cibles validées par
> `tools/sim-difficulty.js --endgame` (joueur suréquipé Solo/Duo) : ét. 25
> ~57/76 %, ét. 30 ~48/66 %, ét. 40 ~18/28 %. Un monstre d'étage 14 a la
> *base* d'un étage 4, rehaussée par la récursion endgame. Détail :
> `.claude/plans/_archive/dark-loop-scaling-review.md`.

### 13.2.4 Progression du joueur (PV, stats, sorts)

✅ (`battle-rewards.js — checkLevelUp`, `data.js`)

À chaque niveau, **pour chaque héros actif** :

- `_baseHpMax += 8`, `_baseSpMax += 5` ;
- `+1` sur chaque primaire (ATK/DEF/MAG) **et** chaque secondaire (STR/INT/AGI/END) ;
- `+3` points libres (`STAT_POINTS_PER_LEVEL`) à répartir (STR/INT/AGI/END/LCK) ;
- `xpNext × 1.6` (`LEVEL_UP_XP_MULTIPLIER`, départ `xpNext = 50`) ;
- soin complet PV/PM.

✅ **Sorts par niveau** (table complète en [G3](../gameplay/G3-progression.md)) :
montée régulière jusqu'au niveau 7 (Hermione obtient 3 sorts d'un coup),
Cheminette Inter-Mondes au 8, `Avada...` déverrouillé au 9.

✅ **Niveau attendu par étage** (`DIFFICULTY_REPORT.md §1`) — les XP de quêtes
**sur-montent** naturellement le joueur (étage 10 → niveau ~10-11 *sans* farming
dédié) :

| Étage | 1 | 3 | 5 | 7 | 8 | 10 | 12 |
|------:|:-:|:-:|:-:|:-:|:-:|:--:|:--:|
| Niveau Solo | 1 | 5 | 8 | 9 | 9 | 10 | 11 |
| Niveau Duo | 1 | 5 | 8 | 9 | 10 | 11 | 12 |

> ✅ **Rework D1–D5** (débouchés des stats secondaires, [G3](../gameplay/G3-progression.md)) :
> INT→MAG (÷4), END→DEF (÷6) + PV max, END→résistance DoT (÷12), STR→pénétration
> de DEF (Hill, cap 50 %), LCK→Fortune, AGI→Célérité. Mesuré : **+20 à +27 pts de
> win-rate combat** dès l'étage 7 (`DIFFICULTY_REPORT.md` résumé exécutif).

### 13.2.5 Réputation de Maison (paliers)

✅ (`HOUSE_BONUSES[h].tiers[]`, [G4](../gameplay/G4-maisons.md)) — 18 paliers
nommés + série **★ N** génératrice. Seuils clés et gates :

| Phase | Paliers | Seuils | Gate |
|-------|---------|--------|------|
| Apprenti → Virtuose | 1–15 | 50 → 16 000 pts | — (accessible early/mid) |
| **Légende** | 16 | 25 000 | `victoryAchieved` |
| **Mythe** | 17 | 30 000 | `requiresDarkTier 1` (ét. 11+) — sort exclusif + gold-sink |
| **Apothéose** | 18 | 45 000 | `requiresDarkTier 2` (ét. 21+) — passif légendaire |
| **★ N** | 19+ | `45k + 15k·N + 1k·N²` | `requiresDarkTier 2` — gold-sink infini |

> ✅ La réputation est un **second axe de puissance**, parallèle au niveau :
> bonus de stat (Bronze→LCK, Argent→stat principale), pièces de set (Or), sort de
> Mythe, passif d'Apothéose. Source : kill (8/10/14/18 selon difficulté, **×1.5
> en Ténèbres**) + quête remise (+30 pts).

### 13.2.6 Pièges, événements, fontaines

✅ Le procédural ponctue la descente de **cellules spéciales**
([04 §4.4](04-structure-actes-et-etages.md), [G7](../gameplay/G7-donjon.md)) :

| Élément | Rôle d'équilibrage | Cadence |
|---------|--------------------|---------|
| **Fontaine** ⛲ | Restauration **100 % PV/PM**, 1×/visite | Étages 2, 5, 8, 11… (tous les 3) |
| **Repos** 💤 | Soin partiel hors combat, **interrompu ~1/3** (repos partiel → 15 % PV/PM) | À volonté (cooldown) |
| **Coffre / Boutique** | Récompense d'exploration, équipement progressif | Procédural / étage |
| **Pièges / fouille** | Risque d'embuscade (atténué par la Fortune) | ~3 fouilles/étage, ~5-7 % néfastes |
| **Forge / Bibliothèque** | Farming endgame (matériaux de purge → puissance) | Boucle Ténébreuse |

> ✅ **Le malus de fouille est marginal** (`DIFFICULTY_STUDY.md §9.2`) : ~5-7 %
> des runs touchés — *« pimente sans punir »*.

---

## 13.3 Facteurs d'influence sur la difficulté

### 13.3.1 Choix de Maison

✅ **État actuel** : le choix de Maison **n'influe pas sur la difficulté des
combats**. Il oriente le *build* (profil de stat récompensé, set, sort/passif
endgame) — donc, indirectement, l'**efficacité** du joueur, mais jamais la
résistance du donjon. Les 4 Maisons sont équilibrées entre elles par construction
(même grille de paliers).

> 💡 **Proposition optionnelle — `houseDifficultyModifier`** (à valider `❓`) :
> introduire une *saveur* de difficulté par Maison, fidèle à l'identité narrative,
> **sans casser l'équité** :
>
> | Maison | Saveur proposée | Compensation |
> |--------|-----------------|--------------|
> | 🦁 Gryffondor | +5 % stats des **boss** (combats héroïques plus durs) | +10 % drops sur boss |
> | 🐍 Serpentard | +1 ennemi de plus en embuscade (densité) | +10 % or |
> | 🦅 Serdaigle | pièges/énigmes plus fréquents | +10 % XP énigmes |
> | 🦡 Poufsouffle | aucun malus offensif | −5 % dégâts subis (résilience) |
>
> ⚠️ **Tradeoff explicite** : cette proposition **rompt** le garde-fou *« les 4
> Maisons partagent la même grille »* ([04 §4.7](04-structure-actes-et-etages.md)).
> Elle ne doit être adoptée que (a) en mode *opt-in* assumé, (b) avec une
> validation par simulation que les win-rates restent dans une bande de ±5 pts
> entre Maisons. **Recommandation : ne PAS implémenter** en V1 — garder l'équité
> stricte ; réserver l'identité de Maison au *build* et à l'ambiance
> ([10 §10.6](10-lieux-et-geographie.md)). `❓ à trancher`.

### 13.3.2 Choix du / des héros & mode solo vs duo

✅ Le choix du héros (**16 jouables** — 5 figures canon + 11 originaux de la
Garde de l'Aube, registre `js/data-characters.js`, cf. [05 §5.0](05-personnages-jouables.md))
**n'altère pas la structure** : tout repose sur `party[0]/party[1]`. Son impact
est **cosmétique et émotionnel** (barks par événement) et de **build** (stats de
départ : Harry physique-offensif LCK 15, Hermione mage-soutien INT 17).

✅ **Solo vs Duo est, lui, un vrai facteur de difficulté** — le plus fort après
le réglage global. Le duo dispose d'un second corps (absorption d'attrition) et
d'une soigneuse :

| Lecture | Solo | Duo |
|---------|------|-----|
| Win % combat isolé (Normal) | confortable 1–7, tendu dès 8 (72 %), plancher 49 % à ét. 12 | confortable 1–8, tendu dès 9 (77 %), plancher 68 % à ét. 12 |
| **Clear d'étage** (4 salles, attrition) | mur réel **dès l'étage 6-7** | tenable jusqu'à ét. 7-8, mur dès ét. 9 |

> ✅ **L'écart combat-isolé vs clear-d'étage est l'enseignement central**
> (`DIFFICULTY_STUDY.md §9.2`) : gagner chaque combat à 87 % ne suffit pas — 4
> combats enchaînés avec attrition composent une probabilité bien plus basse
> (étage 6 Solo : 87 % par combat → **33 %** sur l'étage entier). Le Solo, sans
> second corps, **décroche bien plus tôt** qu'une lecture par combat ne le
> suggère. C'est la **pénalité structurelle du Solo**, compensée au classement
> Ironman par le multiplicateur **×1.3** ([G9](../gameplay/G9-meta.md)).

### 13.3.3 Pression au grind (densité)

✅ (`floorKillCount`, `rollGroupSize`) Plus on ponce un étage, plus les combats
s'y densifient : `n = floor(kills/4)` alimente `duoBonus` (transfert 1→2, cap
+40 %) puis `trioBonus` (n≥5, transfert 2→3). Respawn 20 % à la revisite, avec
toasts narratifs croissants. **C'est un facteur que le joueur déclenche
lui-même** : rester = attirer.

### 13.3.4 Quêtes signature & Éclats

✅ **Quêtes signature de Maison** : elles greffent une couche narrative légère
(Acte I→III) et déposent un **modificateur one-shot au climax** (étage 10) selon
`<house>SignatureDone` ([04 §4.2](04-structure-actes-et-etages.md)) — 🦁 neutralise
la phase terreur, 🦅 révèle les faiblesses, 🐍 lifesteal **ou** debuff, 🦡 buff de
départ *« Espoir partagé »*. **Un flag, pas une fin alternative** — l'impact sur
la difficulté est **ponctuel** (un seul combat) et **bénéfique**.

✅ **Éclats de la Clé de Voûte** : aujourd'hui un **fil rouge purement narratif**
— 3 `eclat_voute` (Peeves → Loup-Garou Adulte → Mangemort d'Élite, un par acte),
issus d'une **quête optionnelle**. **Ils ne donnent aucune puissance.**

> ⚠️ **Désambiguïsation « Éclats » (deux compteurs, même objet de lore)** :
> ne pas confondre (a) les **3 `eclat_voute`** ci-dessus (objets de quête
> narrative, zéro puissance) et (b) le compteur **`accumulatedEclats`**
> (Éclats de Boucle, +1 par nouvel étage le plus profond post-victoire,
> jalon II de « Briser le Cycle » à 15 — `state.js`, `movement-floors.js`).
> Même objet fictionnel (des éclats de la Clé), deux systèmes de code
> disjoints. Toute référence doc/plan doit préciser lequel.
>
> ⚠️ **Exception assumée au « Codex zéro puissance »** : la **Faveur de la
> Salle** (`_applyRequirementMetaBonus`, `main.js`) dérive un léger bonus de
> départ des thèmes de Salle sur Demande découverts (état surfacé au Codex).
> C'est le **seul** chemin où une découverte type-Codex touche une stat —
> voulu (récompense d'exploration marginale), à ne pas étendre sans repasser
> par ce chapitre.

> ℹ️ **Désambiguïsation « pages » (même mot, deux systèmes)** : les
> **Pages de Grimoire** (`page_grimoire`, matériau d'upgrade de la
> Bibliothèque Interdite, drop/purges de Boucle) sont distinctes des **pages
> du grimoire d'Élara** (`player.grimoirePages`, collecte narrative de la
> quête de Manon). Aucun croisement mécanique.

> 💡 **Proposition — `eclatPowerBoost`** (à valider `❓`) : faire des Éclats un
> **3ᵉ axe de progression optionnel** (chaque Éclat → +1 LCK ou +2 % stat
> dérivée). ⚠️ **Tradeoff** : cela transformerait une couche *narrative
> optionnelle* en *gate de puissance*, ce qui pousse à compléter la quête
> annexe — à n'adopter que si on assume que les Éclats deviennent
> *« recommandés »* et non *« optionnels »*. **Recommandation : garder les Éclats
> narratifs** ; si un bonus est désiré, le rendre **cosmétique** (entrée Codex,
> bark) plutôt que mécanique. `❓ à trancher`.

### 13.3.5 Niveau de Boucle (Boucle 1 vs 2 vs 3)

✅ Chaque palier de 10 étages = **×~1.5** de puissance ennemie (§13.2.3). Le
joueur reçoit désormais une **XP passive de Boucle** (P2,
`LOOP_PASSIVE_XP_FRAC = 0.45` — ~0.45 niveau par étage le plus profond franchi)
qui amortit le décrochage, mais elle ne suffit **pas** à elle seule : `xpNext ×
1.6/niveau` compose plus vite → règle empirique **~+12-15 niveaux farmés par
palier de Boucle** pour rester *confortable* (`DIFFICULTY_STUDY.md §8.3/§8.8`).
La Boucle reste donc un **gate infini farmable sur 4 axes** (niveaux, artefacts,
Forge/Bibliothèque, sets) ; la passive transforme le mur en pente sans
remplacer le farming.

### 13.3.6 Table de synthèse — facteurs d'influence

| Facteur | Amplitude sur la difficulté | Statut | Direction |
|---------|-----------------------------|--------|-----------|
| Réglage global | **Très forte** (×0.75 → ×1.45 stats + groupes + éco) | ✅ | curseur direct |
| Solo vs Duo | **Forte** (mur Solo ~ét. 6-7 vs Duo ~ét. 9) | ✅ | structurel |
| Niveau de Boucle | **Forte** (×1.5/palier, gate farmable) | ✅ | endgame |
| Pression au grind | Moyenne (densité +groupes) | ✅ | joueur-déclenché |
| Choix de héros | Faible (build + cosmétique) | ✅ | build |
| Choix de Maison | **Nulle sur la difficulté** (build only) | ✅ | équité stricte |
| Signatures | Ponctuelle & bénéfique (one-shot climax) | ✅ | aide |
| `houseDifficultyModifier` | — | 💡 ❓ | rompt l'équité (déconseillé V1) |
| `eclatPowerBoost` | — | 💡 ❓ | rompt le « optionnel » (déconseillé V1) |

---

## 13.4 Mécaniques de progression & récompenses

### 13.4.1 Les axes de montée en puissance

✅ Le joueur progresse sur **cinq axes complémentaires**, conçus pour franchir
les murs successifs :

| Axe | Levier | Disponibilité | Source |
|-----|--------|---------------|--------|
| **Niveau** | +8 PV/+5 PM, +1 stats, +3 pts/niv | Toute la partie | XP combat + quêtes |
| **Réputation Maison** | bonus stat + items + passifs | Early → endgame (gates) | points de Maison |
| **Équipement** | 11 slots, raretés, sets | Toute la partie | boutique / coffres / drops / chefs |
| **Forge** (×5) | +upgrade sur bonus principal | Endgame | Gallions + Essence des Ténèbres |
| **Bibliothèque** (×3) | sorts +power/−coût | Endgame | Gallions + Pages de Grimoire |

✅ **Mesure** (`DIFFICULTY_STUDY.md §4, §8`) : farming + artefacts transforment une
zone *« difficile »* (ét. 10-12 Solo ~50 %) en *« confortable »* (Duo +12 niv +
artefacts ≥ 96 %). Le kit complet (artefacts + Forge 5 + Biblio 3 + ~25 niveaux)
maintient le **Duo confortable (88-100 %) jusqu'à l'étage 30**.

### 13.4.2 Équipement thématique & sorts

✅ Les **reliques légendaires** par Maison (Épée de Gryffondor, Médaillon de
Serpentard, Diadème de Serdaigle, Coupe de Poufsouffle) tombent au palier Expert
Or (9, 3 500 pts). Les **sets de Maison 4/4** s'assemblent du palier Apprenti Or
(early) à la quête de set (Maître Or). Le **set Ténèbres** est purement endgame.
Les **sorts** s'apprennent par 3 vecteurs (level-up, livres, équipement
`grantsSpell`) + sort de Mythe au palier 17.

> ✅ **Répartition Duo des sets** (`DIFFICULTY_STUDY.md §8.6`) : un perso ne porte
> qu'un set entier, mais en Duo on répartit (Harry → set Maison, Hermione → set
> Ténèbres) → la party bénéficie des **deux**. Le Solo est limité à un set —
> autre facette de la pénalité Solo.

### 13.4.3 Points de repos & refuges

✅ **Système de répit actuel** : (1) **fontaines** (restauration totale, tous les
3 étages, 1×/visite) ; (2) **repos** (`rest()`, soin partiel, interrompu ~1/3,
amortisseur de 15 % PV/PM si coupé) ; (3) **Refuges de Maison** (`CELL.REFUGE`,
repos partiel **non-interrompu** 50 % PV/PM, 1×/visite, sur les étages ≥ 2 sans
fontaine). La raréfaction des fontaines vers le bas reste le **3ᵉ levier
d'escalade** ([04 §4.3](04-structure-actes-et-etages.md)).

> ✅ **Implémenté (P3) — « Refuges de Maison »** : le Refuge (jadis exclusif à
> Poufsouffle) est désormais disponible pour **les quatre Maisons**, avec un
> habillage **purement cosmétique** par `chosenHouse` (nom, récit, teinte de
> bannière via `refugeTheme()`/`HOUSE_BONUSES` — 🦁 Foyer du Lion · 🐍 Antre du
> Serpent · 🦅 Alcôve de l'Aigle · 🦡 Refuge du Blaireau). **Mécanique identique
> pour les 4 → équité stricte préservée** (§13.6 #5) ; **repos partiel, pas de
> soin total** (ne concurrence pas la fontaine, §13.4.3 respecté). Poufsouffle
> conserve son identité profonde (passif Apothéose Souffle du Blaireau, item Cœur
> du Refuge). Le répit est uniforme et modéré ; non modélisé par
> `sim-difficulty.js`, donc le §3 du rapport est inchangé. Cf.
> `js/state.js — REFUGE_THEMES/refugeTheme`, [G4](../gameplay/G4-maisons.md),
> [G7](../gameplay/G7-donjon.md).

### 13.4.4 Gestion de la mort & de l'échec

✅ **État actuel** :

| Mode | Mort du groupe | Conséquence |
|------|----------------|-------------|
| **Standard** | Pétrification → `resurrect()` | Pas de game-over dur ; on repart (perte de progression de run limitée) |
| **Ironman** | `triggerDeath` → `showIronmanResult` | **Permadeath stricte** : score figé, **tous** les slots Ironman supprimés, soumission Hall of Fame |
| **Combat astral** (Mondes Parallèles) | `_finishAstralCombat` | Limité (3/étage), sans pénalité de run |

> 💡 **Proposition — « héritage en Boucle » / perte partielle** (à valider `❓`) :
> à la mort en Boucle Ténébreuse (hors Ironman), au lieu d'une résurrection sèche,
> **conserver une fraction** des gains (ex. or/2, garder les paliers de Maison,
> perdre les niveaux farmés du palier de Boucle courant). ⚠️ **Tradeoff** : c'est
> une **mécanique entièrement nouvelle** (rien de tel n'existe) ; elle rapproche la
> Boucle d'un roguelite à méta-progression. À n'envisager que si on veut donner du
> **poids à la mort** en post-game sans la rendre punitive façon Ironman.
> **Recommandation : hors-scope V1** — la dualité *standard (doux) / Ironman
> (permadeath)* couvre déjà les deux publics. `❓ à trancher`.

### 13.4.5 Table de synthèse — récompenses par tranche

| Acte / Étages | Difficulté cible | Ennemis types | Récompenses clés | Risque de frustration |
|---------------|------------------|---------------|------------------|------------------------|
| **I** 1–3 | 🟢 Pédagogie (win ~100 %) | Familiers corrompus (chat, Peeves, lutins) | Premiers sorts, palier Apprenti, 1ʳᵉ fontaine (ét. 2) | **Faible** — marge large |
| **II** 4–6 | 🟢→🟡 Serrage (Solo 87-96 %) | Mangemorts masqués, trolls, détraqueurs | Set 1ʳᵉ pièce, livres de sorts, reliques boutique | **Faible-Moyen** — Solo sent l'attrition dès ét. 6 |
| **III** 7–10 | 🟡→🟠 Crête (Solo 49-87 %, Duo 68-98 %) | Élite mangemort, boss canon (Fenrir, Aragog, Dolohov), **Voldemort (10)** | Reliques légendaires (palier 9), modif. signature au climax | **Moyen-Élevé** — **mur Solo réel** sur clear d'étage ; farming attendu |
| **IV** 11+ (Ruines 14+) | 🟠→🔴 Plateau de prestige (gate farmable) | Variantes Ténébreuses, Gardien de la Boucle, échos | Mythe/Apothéose/★ N, Forge/Biblio, set Ténèbres | **Élevé mais maîtrisable** — *impose* le farming actif dès ét. ~19 |

---

## 13.5 Simulations de validation

> **Méthode (à reproduire).** Toutes les courbes ci-dessous sont **mesurées** par
> Monte-Carlo sur `tools/sim-difficulty.js` (le sim rejoue les formules réelles de
> `battle*.js`/`dungeon-scaling.js`/`data.js`), **N = 600 combats par couple
> (étage, mode)**, modèle **rework D1–D5 live** (jeu actuel). Chaque simulation
> donne sa **commande exacte** : elles sont rejouables à l'identique. Les colonnes :
> *Win %* = victoire sur un combat isolé (mesuré) ; *Clear* = probabilité estimée
> de **vider l'étage entier** (4 combats enchaînés avec attrition — `Win⁴` corrigé
> du report de PV, modèle de `DIFFICULTY_STUDY.md §9`) ; *Ressenti* = lecture
> qualitative. Bruit Monte-Carlo à N=600 : SE ≈ ±2 pts.
>
> Six scénarios couvrent la matrice {Maison × mode × phase × investissement} :
> 1️⃣ Gryffondor Solo classique · 2️⃣ Serpentard Duo optimisé · 3️⃣ Serdaigle
> exploration/Codex · 4️⃣ Boucle Ténébreuse niveau 3 · 5️⃣ « tout collecté » ·
> 6️⃣ pire scénario.

---

### Simulation 1 — Run Gryffondor Solo classique (étages 1–10, Normal)

> `node tools/sim-difficulty.js --difficulty=Normal --build=balanced 600`

**Hypothèses** — Harry seul, build `balanced` (1 STR / 1 AGI / 1 END par niveau),
quêtes principales acceptées (XP nominale), équipement boutique/coffre **sans**
artefacts ni systèmes endgame. Sorts : montée standard (Stupefix→Diffindo). Pas de
farming dédié (on descend dès l'étage nettoyé).

**Courbe de difficulté ressentie (mesurée) :**

| Étage | Niv. | Win % combat | Clear d'étage (est.) | Ressenti |
|------:|-----:|:------------:|:--------------------:|----------|
| 1–4 | 1→6 | 100 % | 98–100 % | 🟢 prise en main fluide |
| 5 | 8 | **97 %** | ~84 % | 🟢 premiers vrais échanges (49 PV subis moy.) |
| 6 | 8 | **87 %** | ~43 % | 🟡 l'attrition mord (106 PV subis moy.) |
| 7 | 9 | **87 %** | ~34 % | 🟠 entrée des Profondeurs, Solo sous pression |
| 8 | 9 | **72 %** | ~11 % | 🟠 mur de clear-d'étage Solo |
| 9 | 10 | **65 %** | faible | 🟠 difficile — farming/équipement attendus |
| 10 | 10 | **59 %** | faible | 🟠 climax Voldemort — le Solo nu décroche |

- ✅ **Pics de plaisir** : montée fluide 1→5 (le LCK 15 de Harry fait briller le
  crit physique en combat isolé) ; sensation nette et *progressive* de descente ;
  aucun spike (`§5` du rapport : « aucun spike détecté »). Le combat isolé reste
  gagnable (≥ 59 %) **partout** jusqu'à l'étage 10 → le joueur ne se sent jamais
  « bloqué porte close », seulement *pressé*.
- ⚠️ **Frustration / ennui** : le **grand écart combat-isolé (87 %) vs
  clear-d'étage (43 %)** à l'étage 6 peut **dérouter** — le joueur « gagne tous ses
  combats » mais meurt sur l'étage par accumulation. La fontaine suivante (étage 8)
  arrive *après* le pic d'attrition 6–7. Risque d'**ennui inverse** s'il ponce
  l'étage : le grind le densifie *contre* lui (`floorKillCount`).
- 💡 **Ajustements concrets** : (1) ✅ **indicateur d'attrition** (implémenté, P1 —
  étiquette narrative « maîtrisé→hostile » dérivée de `floorKillCount`) pour
  expliquer la chute ; (2) **conserver** la fontaine de l'étage 5 comme respiration
  avant la crête ; (3) *ne PAS* nerfer les étages 6–10 — le combat isolé reste sain,
  c'est le clear-Solo qui est volontairement exigeant (pénalité Solo, §13.3.2).

---

### Simulation 2 — Run Serpentard Duo optimisé (étages 1–12, Normal)

> `node tools/sim-difficulty.js --difficulty=Normal --build=balanced --artifacts --house-set=serpentard 600`

**Hypothèses** — Harry + Hermione. **Build de Maison assumé** : profil MAG, set
Serpentard (sort-crit) sur Hermione, **artefacts actifs équipés** (burst élémentaire
+ purge + bouclier de groupe), potions de combat disponibles. Le joueur exploite les
**faiblesses élémentaires** (Glacius/Incendio/Fulgari selon résistance) et la
**posture Tenaille** (focus-fire +15 %).

**Courbe de difficulté ressentie (mesurée, Duo) :**

| Étage | Niv. | Win % combat | Clear d'étage (est.) | Ressenti |
|------:|-----:|:------------:|:--------------------:|----------|
| 1–6 | 1→8 | 100 % | 96–100 % | 🟢 confortable, deux corps absorbent |
| 7 | 9 | **100 %** | ~92 % | 🟢 trios (ét. 7+) absorbés par les artefacts |
| 8 | 10 | **100 %** | ~88 % | 🟢 burst élémentaire = combats courts (5 tours) |
| 9 | 10 | **97 %** | ~78 % | 🟢→🟡 tendu sur les boss, soigneuse sollicitée |
| 10 | 11 | **96 %** | ~74 % | 🟡 climax Voldemort — signature 🐍 (lifesteal/debuff) |
| 11 | 11 | **88 %** | ~58 % | 🟡 entrée Boucle — densité quad/quint |
| 12 | 12 | **86 %** | ~52 % | 🟡 maîtrisé tant que le kit suit |

> 📊 **Mesure de synergie** : à l'étage 10, le Duo optimisé tient **96 %** vs
> **83 %** pour le Duo baseline (Sim 1 étendue). L'apport **artefacts + set
> Serpentard ≈ +13 pts** de win-rate au climax, et raccourcit les combats
> (8,3 tours → 8,3 mais avec 84 % PV restants vs 76 %). La synergie
> *« élément vs faiblesse + posture Tenaille + artefact burst »* est le cœur du
> plaisir Serpentard.

- ✅ **Pics de plaisir** : combats **courts et explosifs** (le burst élémentaire +
  focus-fire liquide les groupes) ; le pari MAG est **récompensé** ; au climax, le
  choix tactique de la signature 🐍 (`slythPactChoice` : lifesteal **ou** debuff)
  est un vrai moment de décision.
- ⚠️ **Frustration** : risque de **redondance** si le joueur spamme un seul sort
  élémentaire — la diversité (résistances variées par monstre) doit l'y forcer.
  Sans artefacts ni set (Duo « boutique pure »), le mur réapparaît dès l'étage 9
  (clear ~10 %, cf. Sim 1) : la *récompense de l'optimisation* doit rester lisible.
- 💡 **Ajustements concrets** : (1) **garder** la signature 🐍 comme choix (ne pas la
  rendre auto) ; (2) vérifier que la **quête de set** ouvre assez tôt (Maître Or)
  pour livrer la 4ᵉ pièce avant la Boucle ; (3) `❓` surveiller que le Duo optimisé
  ne **trivialise pas** l'Acte II–III (ét. 1–8 = 100 %) — c'est acceptable (le
  joueur a *investi*), mais à monitorer si l'on ajoute d'autres sources de burst.

---

### Simulation 3 — Run Serdaigle focus exploration / Codex (étages 1–10, Duo)

> `node tools/sim-difficulty.js --difficulty=Normal --build=balanced --house-set=serdaigle --bonus-levels=2 600`
> *(`--bonus-levels=2` modélise l'avance de niveau d'un joueur qui fouille tout,
> résout les énigmes et accepte toutes les quêtes annexes.)*

**Hypothèses** — Harry + Hermione, profil Serdaigle (MAG/AGI, set sort-crit),
**joueur explorateur** : fouille systématique (XP + or + livres de sorts), résout
les stèles d'énigme, complète le Codex. **Pas d'artefacts** (l'explorateur
privilégie l'ampleur à l'optimisation de combat). Effet net : il arrive à chaque
étage **~1–2 niveaux au-dessus** du joueur « rusher » + dispose de plus de sorts.

**Courbe de difficulté ressentie (mesurée) :**

| Étage | Niv. | Win % Solo | Win % Duo | Ressenti |
|------:|-----:|:----------:|:---------:|----------|
| 5 | 10 | 99 % | 100 % | 🟢 l'avance de niveau paie |
| 6 | 10 | 95 % | 100 % | 🟢 confortable, sorts variés |
| 7 | 11 | 93 % | 100 % | 🟢 trios gérés par le sur-niveau |
| 8 | 11 | 87 % | 99 % | 🟢 Duo serein |
| 9 | 12 | 85 % | 95 % | 🟢→🟡 boss tendus mais tenables |
| 10 | 12 | **74 %** | **93 %** | 🟡 climax — Duo confortable (vs 83 % baseline) |

> 📊 **Mesure de synergie** : le sur-niveau d'exploration (+2 niv) lève le Solo de
> **59 → 74 %** et le Duo de **83 → 93 %** à l'étage 10. **L'exploration est un
> *vrai* levier de difficulté** — via l'XP/l'or/les livres qu'elle rapporte, **pas**
> via le Codex lui-même.

- ✅ **Pics de plaisir** : sentiment de **maîtrise** (on entre « préparé »
  partout) ; déverrouillage du Codex = récompense de curiosité ; le profil
  Serdaigle (AGI → Célérité + sort-crit) donne des **tours bonus** gratifiants.
- ⚠️ **Frustration / ennui** : risque d'**ennui de sur-leveling** — si l'exploration
  rend l'Acte I–II *trop* faciles (Duo 100 % jusqu'à l'étage 8), la tension
  narrative s'émousse. ❓ **Point de vigilance** : le Codex étant **cosmétique**
  (aucune puissance), l'explorateur ne doit pas *croire* qu'il « doit » tout
  compléter pour survivre — sinon corvée. Le message doit rester *« explore par
  plaisir, pas par nécessité »*.
- 💡 **Ajustements concrets** : (1) **garder le Codex cosmétique** (ancrage narratif,
  pas gate de puissance — cohérent avec le refus de `eclatPowerBoost`, §13.3.4) ;
  (2) `❓` envisager des **entrées Codex qui *valorisent* l'exploration sans la
  rendre obligatoire** (lore, bestiaire complété) plutôt qu'un bonus de stat ;
  (3) rien à corriger côté scaling : le sur-niveau est un choix de jeu *légitime*
  que la difficulté absorbe sainement.

---

### Simulation 4 — Run en Boucle Ténébreuse niveau 3 (étages 21–30, post-victoire)

> Nu : `node tools/sim-difficulty.js --difficulty=Normal --endgame --max-floor=30 600`
> Avec XP passive : ajouter `--bonus-levels=25 --loop-xp-frac=0.45`

**Hypothèses** — partie post-victoire, **3ᵉ palier de Boucle** (`n=3`, étages
21–30 → `endgameTierIndex = 2`→`3`). Deux profils comparés : **(A) joueur nu**
(descend sans farmer, niveau ~12–16) ; **(B) joueur farmé** (+25 niveaux, XP passive
de Boucle active).

**Courbe de difficulté ressentie (mesurée, Duo) :**

| Étage | (A) Nu — Win % | (B) +25 niv & XP passive — Win % | Ressenti |
|------:|:--------------:|:--------------------------------:|----------|
| 20 | 62 % | 100 % | charnière de palier (fin Boucle 2) |
| 21 | **27 %** | 96 % | 🔴(A) cliff de palier (n:2→3) / 🟢(B) |
| 25 | 28 % | ~97 % (kit) | 🔴(A) mur dur / 🟡(B) tendu mais tenable |
| 30 | 23 % | ~94 % (kit) | 🔴(A) infranchissable nu / 🟡(B) maîtrisé |

> 📊 **Mesure** : le **cliff 20→21** (Duo nu 62 → 27 %) matérialise le **passage de
> palier** (`×~1.5` de puissance ennemie d'un coup). C'est **voulu** : la Boucle est
> un *gate farmable*, pas une pente continue. L'**XP passive de Boucle** (P2,
> `LOOP_PASSIVE_XP_FRAC = 0.45`) adoucit le bord : à l'étage 21, +25 niv passe de
> **79 → 85 %** (Solo) / **93 → 96 %** (Duo) — *sans* trivialiser (le joueur nu
> reste mur, le farming garde sa valeur).

- ✅ **Pics de plaisir** : objectif de **prestige illimité** (Apothéose → ★ N, don à
  la Maison = gold-sink) ; chaque palier franchi *rouvre une marge confortable* →
  boucle d'auto-dépassement. Le kit complet (Sim 5) **valide** que l'investissement
  paie jusqu'à l'étage 30+.
- ⚠️ **Frustration** : le **cliff de palier** (20→21) peut surprendre — *« je tenais
  à 62 %, soudain 27 % »*. Sans communication, c'est lu comme un bug. Le joueur **nu**
  doit comprendre qu'**ici la puissance se gagne** (elle ne « tombe » plus).
- ✅/💡 **Ajustements concrets** : (1) ✅ **toast de pivot endgame** (P1, *« Ici, la
  puissance se gagne — elle ne tombe plus »*, one-shot sérialisé) communique le
  contrat ; (2) ✅ **XP passive de Boucle** (P2) transforme le mur en pente franchissable ;
  (3) `❓` *facultatif* : lisser le cliff de palier en répartissant `scalDelta` sur 2–3
  étages plutôt qu'en bloc (à valider à la sim — ne pas baisser la puissance cible,
  juste sa *marche*).

---

### Simulation 5 — Run « tout collecté » (max Éclats + quêtes signature + kit endgame)

> `node tools/sim-difficulty.js --difficulty=Normal --endgame --max-floor=30 --bonus-levels=25 --artifacts --forge=5 --library=3 --house-set=gryffondor --tenebres-set 600`

**Hypothèses** — joueur Duo **complétionniste** : signature de Maison terminée
(modif. one-shot au climax), **3 Éclats** collectés (narratifs), palier **Apothéose
(18)** atteint (passif légendaire actif), **Forge 5 / Bibliothèque 3 / sets 4-4
répartis** (Harry → set Maison, Hermione → set Ténèbres), ~25–30 niveaux farmés,
artefacts Premium équipés.

**Courbe de difficulté ressentie (mesurée, Duo, Boucle 3) :**

| Étage | Win % Solo | Win % Duo | PV restants Duo | Ressenti |
|------:|:----------:|:---------:|:---------------:|----------|
| 20 | 100 % | 100 % | 94 % | 🟢 domination totale |
| 21 | 94 % | 99 % | 89 % | 🟢 cliff de palier absorbé par le kit |
| 25 | 91 % | 97 % | 85 % | 🟢 confort maintenu |
| 30 | 84 % | 94 % | 82 % | 🟢→🟡 reste un *léger* défi (sain) |

> 📊 **Mesure** : le **kit complet** maintient le Duo à **94–100 %** et le Solo à
> **84–100 %** sur tout le palier 3 — là où le joueur **nu** plafonne à **12–27 %**
> (Sim 4). C'est la **preuve chiffrée** que les 4 axes de farming (niveau +
> réputation + Forge + Biblio + sets) *fonctionnent* comme antidote au scaling.

- ✅ **Pics de plaisir** : aboutissement du build — chaque système (artefact, set
  crit non gaspillé post-refonte, passif d'Apothéose Élan/Soif/Esprit/Souffle)
  **compose** ; sentiment de **toute-puissance méritée** ; objectif ★ N infini.
- ⚠️ **Frustration / risque de trivialisation** : au **climax (étage 10)**, signature
  *plus* sur-leveling *plus* kit peuvent rendre le combat-événement majeur **trop
  facile** (quasi-100 %) — le « boss du jeu » perd son poids pour le complétionniste.
  Les **Éclats** n'ajoutent **aucune** puissance (volontaire) : ils ne creusent pas
  ce risque.
- 💡 **Ajustements concrets** : (1) **garder** la signature one-shot et bénéfique
  (saine) ; (2) **vérifier que Voldemort conserve ses phases** (enrage 50 %, terreur
  25 %) même sous signature 🦁 (qui ne neutralise *que* la terreur) — la trame ne
  doit pas s'effondrer ; (3) ✅ **refuser `eclatPowerBoost`** (§13.3.4) : empiler un
  bonus d'Éclats sur ce profil **aggraverait** la trivialisation ; les Éclats restent
  narratifs ; (4) `❓` *si* la trivialisation du climax dérange en playtest, préférer
  une **phase de boss supplémentaire gated par le sur-niveau** plutôt qu'un nerf des
  aides du joueur.

---

### Simulation 6 — Cas extrême / pire scénario (mauvais choix + mort fréquente)

> `node tools/sim-difficulty.js --difficulty=Expert --pessimistic --build=balanced 600`
> *(`--pessimistic` = aucune quête (donc **sous-niveau**), aucun équipement, aucune
> potion — le profil « je fonce sans rien préparer », aggravé par le réglage Expert.)*

**Hypothèses** — joueur qui **cumule les mauvais choix** : difficulté **Expert**
(×1.45 stats, ×1.65 groupes, éco famélique), **ignore les quêtes** (reste
sous-leveled), **ne s'équipe pas**, **n'utilise pas de potions**, et — côté
narratif — un *« mauvais alignement de Maison »* (joue un profil de stat que sa
Maison ne récompense pas, p. ex. un build physique en Serdaigle). Morts répétées →
pétrification/`resurrect` (standard) ou permadeath (Ironman).

**Courbe de difficulté ressentie (mesurée) :**

| Étage | Niv. | Win % Solo | Win % Duo | Ressenti |
|------:|-----:|:----------:|:---------:|----------|
| 1–2 | 1 | 100 % | 100 % | 🟢 trompeusement calme |
| 3 | 2 | 65 % | 98 % | 🟡 Solo décroche déjà (sous-niveau) |
| 5 | 4 | **22 %** | 76 % | 🔴 Solo punitif / 🟡 Duo tendu |
| 6 | 5 | 19 % | 64 % | 🔴 / 🟠 |
| 7 | 6 | **10 %** | 30 % | 🔴 effondrement Solo, Duo bascule |
| 8 | 7 | 2 % | 13 % | 🔴 quasi-mortel |
| 10 | 9 | **0 %** | 3 % | 🔴 infranchissable |

> 📊 **Mesure** : le pire scénario s'effondre dès l'**étage 5 en Solo (22 %)** et
> l'**étage 7 en Duo (30 %)**. La cause **n°1 n'est pas le scaling** mais le
> **sous-niveau** (niveau 4 à l'étage 5 au lieu de 8) : ignorer les quêtes prive de
> ~50 % de l'XP attendue. Expert *amplifie* mais le **mauvais build/équipement** est
> le facteur dominant.

- ✅ **Ce qui va bien (design)** : le jeu **punit la négligence sans piéger** —
  l'effondrement est **progressif** (pas de mort surprise à l'étage 1) et **chaque
  cause est réparable** (accepter les quêtes, s'équiper, ajuster le build à sa
  Maison). En standard, la pétrification évite le game-over dur → on apprend de
  l'échec. Le Duo « rattrape » plus longtemps (mur étage 7 vs 5) → la coopération
  est récompensée.
- ⚠️ **Frustration réelle** : un débutant en **Expert** peut se croire face à un mur
  injuste alors qu'il a juste **sauté les systèmes**. Risque d'**abandon** s'il
  n'identifie pas la cause. Le *« mauvais choix de Maison »* (build off-profil)
  n'est **pas** puni par le code (équité stricte) mais par l'**inefficacité** : le
  joueur ne *voit* pas pourquoi son build patine.
- 💡 **Ajustements concrets** : (1) **garde-fou d'onboarding** — déconseiller Expert
  au 1ᵉʳ run (info-bulle à la sélection de difficulté) ; (2) ✅ **toasts d'attrition**
  + suggestion contextuelle *« des quêtes t'attendent »* si le joueur est sous-leveled
  de ≥ 2 niveaux (💡 à implémenter, cosmétique) ; (3) **ne PAS** nerfer Expert : c'est
  un mode assumé, compensé au classement (Ironman ×1.8) ; (4) `❓` envisager un
  **panneau « profil de Maison »** dans la fiche perso qui *montre* quel build sa
  Maison récompense (orientation, pas contrainte) — adresse le « mauvais alignement »
  par la pédagogie, pas par la mécanique.

---

### 13.5.1 Synthèse des 6 simulations

| # | Scénario | Commande clé | Verdict | Action |
|--:|----------|--------------|---------|--------|
| 1 | Gryffondor Solo classique | `--build=balanced` | ✅ sain ; écart combat/clear surprenant | Indicateur d'attrition ✅ (P1) |
| 2 | Serpentard Duo optimisé | `--artifacts --house-set=serpentard` | ✅ synergie récompensée (+13 pts climax) | Garder signature = choix ; surveiller trivialisation Acte I–II |
| 3 | Serdaigle exploration/Codex | `--house-set=serdaigle --bonus-levels=2` | ✅ explo = vrai levier (XP), Codex cosmétique | Garder Codex sans puissance |
| 4 | Boucle Ténébreuse niv. 3 | `--endgame --max-floor=30` | ✅ gate farmable ; cliff de palier voulu | Toast pivot ✅ + XP passive ✅ (P1/P2) |
| 5 | « Tout collecté » | `…--forge=5 --library=3 --tenebres-set` | ✅ kit valide (94–100 %) ; léger risque climax | Garder phases boss ; refuser `eclatPowerBoost` |
| 6 | Pire scénario | `--difficulty=Expert --pessimistic` | ✅ punition juste & réparable | Onboarding Expert + nudge quêtes (💡) |

> ✅ **Conclusion d'ensemble** (alignée `DIFFICULTY_STUDY.md §1, §7` + run de
> validation de ce jour) : **la courbe est saine, aucun spike, aucun correctif de
> scaling requis.** Les trois « murs » mesurés sont **tous intentionnels et
> franchissables** : (a) le **clear-Solo** de milieu de partie (pénalité Solo
> compensée Ironman ×1.3) ; (b) le **cliff de palier de Boucle** (gate farmable,
> adouci par l'XP passive) ; (c) l'**effondrement du joueur négligent** (réparable
> par les systèmes ignorés). Les ajustements proposés sont **cosmétiques ou de
> communication** (signaux, toasts, onboarding), **jamais** des nerfs de scaling.

### 13.5.2 Synergies & variables d'influence (lecture par simulation)

> Les 6 simulations isolent chacune **une variable**. Croisées, elles mesurent le
> **poids relatif** de chaque levier sur la difficulté ressentie. Repère commun :
> **win-rate Duo à l'étage 10** (le climax), baseline = **83 %**.

| Variable testée | Sim | Δ vs baseline (ét. 10 Duo) | Nature | Statut |
|-----------------|:---:|:--------------------------:|--------|:------:|
| **Artefacts + set de Maison** | 2 | 83 → **96 %** (+13) | build/investissement | ✅ |
| **Sur-niveau d'exploration** (+2 niv) | 3 | 83 → **93 %** (+10) | XP optionnelle | ✅ |
| **Kit endgame complet** (Boucle 3, ét. 21) | 5 | 27 → **99 %** (+72) | farming 4 axes | ✅ |
| **Réglage Expert + négligence** | 6 | 83 → **3 %** (−80) | curseur × mauvais jeu | ✅ |
| **Choix de Maison seul** (build only) | 1↔2 | ≈ **0** (à équipement égal) | identité, pas difficulté | ✅ |
| **Éclats collectés** | 5 | **0** (volontaire) | narratif pur | ✅ |
| **XP passive de Boucle** (P2) | 4 | +3 à +6 pts au cliff | filet endgame | ✅ |

💡 **Lecture** : le **plus gros levier *positif*** est le **kit endgame** (+72 pts au
cœur de la Boucle) — il *est* la réponse de design au scaling. Le **plus gros levier
*négatif*** est le **cumul Expert × négligence** (−80) — la difficulté punit le jeu
*paresseux*, pas le joueur *honnête*. Le **choix de Maison** et les **Éclats** sont,
par construction, **neutres sur la difficulté** : c'est l'équité (Maison) et le
contrat narratif (Éclats) qui le garantissent.

✅ **Synergies vertueuses confirmées par la sim** (à préserver) :

| Synergie | Pièces | Effet mesuré |
|----------|--------|--------------|
| **Burst élémentaire** | sort `vs` faiblesse + posture Tenaille + artefact `elemBurst` | combats courts, PV préservés (Sim 2 : 84 % PV restants ét. 12) |
| **Tank-soutien Duo** | Hermione soin + set + Garde empilée | lisse l'attrition (mur Duo ét. 7 vs Solo ét. 5, Sim 1/6) |
| **Préparation explorateur** | quêtes + fouille + livres de sorts | +1–2 niv → +10 pts au climax (Sim 3) |
| **Boucle farmée** | niveau + réputation + Forge 5 + Biblio 3 + sets répartis | maintient 94–100 % jusqu'à ét. 30 (Sim 5) |

❓ **Variables à surveiller en playtest réel** (la sim ne les capture pas) :

- **Synergies *Premium*** (artefacts payants/cosmétiques) : vérifier qu'elles
  restent dans la **même bande** que les artefacts gratuits — *aucun pay-to-win*.
  Tant qu'un artefact Premium n'a pas de stat **supérieure** à son équivalent
  gagnable, la sim `--artifacts` reste représentative.
- **Diversité d'usage des sorts** (`synergyUsageRate`, §13.9.G) : la sim suppose un
  joueur qui *exploite* les faiblesses ; un joueur qui spamme un sort unique vit une
  courbe plus dure → mesurable seulement en télémétrie de playtest.
- **Fréquence réelle des potions/craft** : la sim active `usePotions` par défaut ;
  si les playtests montrent un usage faible, la difficulté *vécue* se rapproche de la
  Sim 6 (`--no-potions`) plutôt que de la baseline.

> ✅ **Règle d'ajustement continu (rappel, détaillée §13.6 + §13.9.G)** : tout
> rééquilibrage d'une de ces variables (a) part d'une **mesure sim** avant/après,
> (b) régénère `DIFFICULTY_REPORT.md` dans le même commit, (c) reste dans la **bande
> ±5 pts inter-Maisons**, (d) ne touche **jamais** le scaling pour « compenser » un
> levier de build — on ajoute un axe, on ne nerfe pas le donjon.

---

## 13.6 Règles d'ajustement futur

> 💡 (doctrine normative) — *comment toucher à l'équilibrage sans casser la
> cohérence narrative.*

1. **Toujours partir de la simulation.** Avant tout changement de valeur, mesurer
   l'état actuel (`tools/sim-difficulty.js`) puis l'état visé. Régénérer
   `DIFFICULTY_REPORT.md`. *Critère de vérification : pas de nouveau spike (chute
   > 15 pts entre 2 étages, §5 du rapport).*
2. **Préserver les trois leviers diégétiques** (groupes, grind, répit). Tout
   durcissement doit passer par un levier que le joueur *comprend*, pas par une
   multiplication invisible.
3. **Ne pas aplatir la pénalité Solo sans intention.** Le Solo *doit* être plus
   dur (compensé Ironman ×1.3). Adoucir le clear-d'étage Solo = décision de design
   explicite, pas un effet de bord.
4. **Respecter les gates de Boucle.** `victoryAchieved`, `requiresDarkTier 1/2`
   sont des verrous narratifs (la victoire ouvre l'endgame). Ne jamais les
   contourner pour « équilibrer ».
5. **Équité inter-Maisons par défaut.** Tant que `houseDifficultyModifier` n'est
   pas validé (§13.3.1), toute Maison doit rester dans une bande de ±5 pts de
   win-rate des autres. Un nouvel item/passif de Maison se valide à la sim
   (`--house-set`, `--house-tier`, `--star`).
6. **Le mur de fin de partie est un gate de progression, pas un bug.** Ne pas le
   « corriger » en nerfant les monstres ; le franchissement passe par les 4 axes
   de farming. Si trop dur : ajouter un axe de progression (XP passive de Boucle),
   pas baisser le scaling.
7. **Tout nouveau monstre/boss** passe par `scaleMonster` (jamais de stat en
   dur) ; vérifier son `scale` (0.15-0.40) à la sim avant merge (`add-monster`).
8. **Documenter l'écart.** Tout changement amende ce chapitre **et** le doc
   gameplay concerné (G3/G4/G8) — la divergence doc/code est une dette
   silencieuse.

---

## 13.7 Tables de synthèse globales

### 13.7.1 Difficulté cible par étage

| Étage / Acte | Difficulté cible | Ennemis | Récompenses | Risque de frustration |
|--------------|------------------|---------|-------------|------------------------|
| 1–3 (I) | 🟢 Très accessible | F1 familiers corrompus, 1 ennemi | Sorts de base, Apprenti, fontaine ét. 2 | Faible |
| 4–6 (II) | 🟢→🟡 Montant | F4 mangemorts, groupes 1-2 | Set pièce 1, livres, reliques boutique | Faible-Moyen (Solo ét. 6) |
| 7–10 (III) | 🟡→🟠 Crête | F4-F5, boss canon, trios (7+), Voldemort (10) | Reliques légendaires, modif. signature | Moyen-Élevé (mur clear Solo) |
| 11–13 (IV/C) | 🟠 Plateau | Variantes Ténébreuses, Gardien | Mythe, matériaux purge | Élevé maîtrisable |
| 14+ (IV/D Ruines) | 🟠→🔴 Prestige | Échos anciens, quad/quint (Duo) | Apothéose, ★ N, set Ténèbres | Élevé (farming imposé) |

### 13.7.2 Multiplicateurs de référence (mémo)

| Levier | Valeur | Effet |
|--------|--------|-------|
| Difficulté ennemie | ×0.75 → ×1.45 | Facile → Expert |
| Difficulté groupes | ×0.65 → ×1.65 | Facile → Expert |
| Scaling/étage | `1 + (F−1)×scale`, scale 0.15-0.40 | linéaire en F |
| Scaling/palier Boucle | ×~1.5 | par 10 étages |
| XP/niveau | `xpNext ×1.6` | coût exponentiel |
| Pénalité Solo (Ironman) | ×1.3 score | compensation classement |
| Points Ténèbres | ×1.5 | bonus de Maison en Boucle |

---

## 13.8 Récapitulatif express (pour briefer Gemini)

> **Doctrine** : la difficulté *est* le récit de la descente — accessible en
> Acte I (pédagogie), serrée en Acte II, en crête en Acte III (boss → Voldemort
> ét. 10), plateau de prestige farmable en Boucle (IV). **Trois registres** :
> « normale » (réglage Facile→Expert, 4 curseurs), « héroïque » (par Maison —
> **build/identité, PAS difficulté** : équité stricte aujourd'hui), « Ténébreuse »
> (Boucle, ×1.5/palier). **Scaling** : `stat × intraMult × diffMult`, récursion
> endgame `ENDGAME_SCALING`. **Progression joueur** : niveau (+8 PV/+3 pts),
> réputation Maison (18 paliers + ★ N), équipement, Forge(5)/Biblio(3), sets.
> **Facteur n°1 après le réglage = solo vs duo** (mur Solo ~ét. 6-7 sur le
> clear-d'étage, ×1.3 Ironman). **Simulations** : courbe saine, aucun spike, le
> mur de fin de partie est un *gate farmable voulu* (`DIFFICULTY_REPORT.md`,
> `DIFFICULTY_STUDY.md`). **Propositions à trancher** (`💡`/`❓`) :
> `houseDifficultyModifier`, `eclatPowerBoost`, refuges de Maison, héritage en
> Boucle — toutes **déconseillées en V1** car elles rompent des garde-fous
> existants (équité Maison, Éclats narratifs, dualité standard/Ironman).

---

# 13.9 — Plan d'implémentation

> Cette section transforme la doctrine ci-dessus en travail concret. Elle
> distingue ce qui **existe déjà** (à *documenter/consolider*) de ce qui serait
> **neuf** (les propositions `💡`). Priorité absolue : **ne rien ré-implémenter
> de ce qui marche** ([guidelines §2-3](../../.claude/guidelines.md)).

## A. Structure des données

### A.1 Existant à consolider (✅ — aucune réécriture)

L'équilibrage *existe déjà* sous forme de constantes pures. Le « JSON de courbes »
demandé est, dans ce projet vanilla, ces objets JS :

| Donnée | Emplacement | Forme |
|--------|-------------|-------|
| Réglage global | `state.js — DIFFICULTY_SETTINGS` | `{Facile, Normal, Difficile, Expert} → {scalingMultiplier, enemyGroupMultiplier, …}` |
| Scaling ennemi | `dungeon-scaling.js — scaleMonster` + `monster.scale` | formule pure |
| Scaling Boucle | `dungeon-scaling.js — ENDGAME_SCALING` | `{baseFix{hp,atk,def,mag,xp,gold}, scalDelta}` |
| Tailles de groupe | `battle.js — rollGroupSize` + `currentMaxGroupSize` | tables baseline + bonus |
| Pression grind | `state.js — floorKillCount` | `Map<floor, kills>` |
| Paliers Maison | `state.js — HOUSE_BONUSES[h].tiers[]` + `starGenerator` | tableau de paliers |
| Stats joueur | `data.js` (`LEVEL_UP_XP_MULTIPLIER`, `STAT_POINTS_PER_LEVEL`, `INT_MAG_DIV`…) | constantes |

> ✅ **Action** : *aucune migration de données*. Au besoin, extraire un **mémo
> lisible** (ce chapitre + G8) ; ne **pas** introduire un fichier JSON parallèle
> qui dédoublerait la source de vérité (risque de dérive).

### A.2 Nouveau — uniquement si une proposition est validée (💡)

| Si on valide… | Donnée à ajouter | Emplacement proposé |
|---------------|------------------|---------------------|
| `houseDifficultyModifier` (§13.3.1) | `HOUSE_BONUSES[h].difficultyFlavor = {bossStatMult, ambushBonus, dropMult…}` | `state.js`, consommé par `scaleMonster`/`rollGroupSize` |
| `eclatPowerBoost` (§13.3.4) | `ECLAT_BONUS_PER = {lck:1}` + lecture du compte d'Éclats | `data.js` + `recalculateStats` |
| Héritage en Boucle (§13.4.4) | `LOOP_DEATH_RETENTION = {gold:0.5, keepHouseTier:true}` | `state.js`, consommé par `triggerDeath` |

> ⚠️ Chacune est **opt-in** et **derrière un flag de feature** (cf. modèle
> `MP_CONFIG.parallelWorldsEnabled`). **Recommandation : ne pas implémenter sans
> validation explicite** (`❓` du chapitre).

## B. Variables & flags

- ✅ **Déjà présents** : `difficulty` (clé de `DIFFICULTY_SETTINGS`),
  `victoryAchieved`, `floorKillCount`, `housePoints`/`houseTier`, `chosenHouse`,
  `ironmanMode`. Le « `difficultyMultiplier` » demandé **existe** sous le nom
  `scalingMultiplier` (ennemi) / `enemyGroupMultiplier` (groupe) ; le
  « `loopScaling` » **existe** sous `ENDGAME_SCALING` + `endgameTierIndex`.
- 💡 **À créer seulement si validé** : `houseDifficultyModifier` (dérivé de
  `chosenHouse`), `eclatPowerBoost` (dérivé du compte d'Éclats). Ces noms
  n'existent **pas** aujourd'hui — les introduire = nouvelle feature, pas un
  renommage.

> ✅ **Garde-fou** : ne pas créer de variable d'état mutable redondante avec une
> dérivable. `houseTier` est déjà *la source de vérité* (pas de flag d'Apothéose
> séparé — cf. `houseApotheosePassive()`). Suivre ce modèle.

## C. Système de simulation / testing

✅ **Outils existants à utiliser** (ne rien recréer) :

| Outil | Rôle | Flags clés |
|-------|------|-----------|
| `tools/sim-difficulty.js` | Win % combat + run d'étage, tous modes | `--difficulty`, `--build`, `--endgame`, `--bonus-levels`, `--artifacts`, `--forge`, `--library`, `--house-set`, `--tenebres-set`, `--star`, `--pessimistic`, `--legacy` |
| `tools/sim-economy.js` | Économie (or, Fortune) | — |
| `tools/sim-aoe.js` | Sorts de zone | — |
| `tests/units.js` | Helpers purs (`effectiveFloor`, courbes Fortune/Célérité) | — |
| `tests/smoke.js` | Non-régression navigateur (159 scénarios) | filtre CLI |

> ✅ **Workflow d'ajustement** (à graver) :
> 1. Mesurer baseline : `node tools/sim-difficulty.js --difficulty=Normal --build=balanced 800`.
> 2. Tester l'hypothèse via flag dédié (ajouter un flag au sim si la variable est nouvelle).
> 3. Régénérer `DIFFICULTY_REPORT.md` ; vérifier §5 (aucun spike).
> 4. `node tests/units.js && node tests/smoke.js` si du code change.

✅ **Gardien d'équilibre en CI** (implémenté, P1) — `tools/check_difficulty.js`
régénère un résumé win-rate via `tools/sim-difficulty.js` et le compare à la
**baseline committée = le tableau §3 de `DIFFICULTY_REPORT.md`** (source de
vérité unique, pas de JSON parallèle). En PR (`--base origin/<base_ref>`), il
échoue (exit 1) si un couple (étage, mode) dérive de > 10 pts **sans** mise à
jour de `DIFFICULTY_REPORT.md` ; un changement d'équilibre documenté passe (avec
rappel de régénérer la baseline via `--update-baseline`). Sur push master / en
local (sans `--base`), il est advisory (exit 0). Le seuil 10 pts absorbe le
bruit Monte-Carlo (SE de la différence ≈ 2.5 pts à N=800). Analogue à
`check_cache_versions.js` ; câblé dans `.github/workflows/test.yml`.

## D. Intégration (procédural, bestiaire, lieux)

- ✅ **Procédural** (`dungeon.js`/`dungeon-spawning.js`) : déjà piloté par étage
  (cellules spéciales, fontaines tous les 3, PNJ déterministes + seedés). Le
  scaling s'applique **à l'instanciation** du combat, pas à la génération — donc
  changer l'équilibrage **ne touche pas** la génération.
- ✅ **Bestiaire** (`monsters.js`) : la difficulté d'un monstre = ses stats de base
  × `scale`. **Source unique** ; le bestiaire UI affiche `danger` (1-11) à la main
  — 💡 envisager de **dériver `danger` du scaling effectif** pour cohérence
  (proposition, non prioritaire).
- ✅ **Lieux** (`floor-themes.js`) : ambiance par tranche ; l'override post-victoire
  `rune_*` + bascule `abyss` sont les signaux *visuels* de la montée en
  difficulté. Aucun couplage à toucher.
- 💡 Si `houseDifficultyModifier` validé : point d'injection = `scaleMonster`
  (boss) + `rollGroupSize` (embuscade), **lus** depuis `chosenHouse` — sans
  toucher la génération.

## E. Progression Codex & notifications joueur

- ✅ **Codex** (chap. 12) : déverrouillage par étage/Éclat/quête. **Point
  d'ancrage idéal** pour *expliquer* la difficulté narrativement (entrée
  « La Descente », « La Boucle se referme »).
- ✅ **Notifications implémentées** (cosmétiques, P1, issues des simulations) :
  - Toast à la 1ʳᵉ entrée en Boucle : *« Ici, la puissance se gagne — elle ne
    tombe plus. »* — communique le pivot endgame (Sim 4). One-shot **sérialisé**
    (`endgamePivotSeen`, state.js), distinct du toast d'ambiance
    `_darknessToastShown` (session-only). Posé dans `_maybeAnnounceEndgamePivot()`
    (`movement-floors.js`), déclenché par `goDeeper` (étage 11+ post-victoire).
  - Indicateur d'**attrition / niveau de visite** (Sim 1) — étiquette narrative
    (« Étage maîtrisé » → « agité » → « hostile » → « redouté ») dérivée du
    `floorKillCount` existant, **pas de chiffre brut**. Helper pur
    `floorVisitLabel(floor)` (`movement-floors.js`), affiché en préfixe des
    **toasts de respawn** existants (`_announceRespawn`) réutilisés comme jauge
    de pression.

## F. Priorisation des implémentations

| Priorité | Lot | Nature | Justification |
|----------|-----|--------|---------------|
| **P0** | Documentation (ce chapitre + maj G8/G3/G4 si écart) | Doc | Source de vérité d'équilibrage ; zéro risque |
| **P1** ✅ | `check_difficulty.js` en CI (C) | Tooling | Garde-fou anti-régression d'équilibre — **implémenté** |
| **P1** ✅ | Toast d'entrée de Boucle + indicateur d'attrition (E) | UX cosmétique | Résout la frustration n°1 des sims (écart combat/clear, pivot endgame) — **sans toucher l'équilibrage**. **Implémenté** |
| **P2** ✅ | XP passive de Boucle (`LOOP_PASSIVE_XP_FRAC`, axe additif — pas de nerf scaling) | Équilibrage | **Implémenté** — adoucit le mur ét. 19-21 sans trivialiser (`DIFFICULTY_STUDY.md §8.8`) |
| **P3** ✅ (refuges) | Refuges de Maison (cosmétique, équité préservée) **implémenté** · `houseDifficultyModifier` non retenu (rompt l'équité) | Feature | Refuges : habillage par Maison, répit partiel uniforme (§13.4.3) |
| **P4** ✅ | Logger `BALANCE_DEBUG` in-game (opt-in, local, anonyme) — `js/balance-log.js`, `window.BalanceLog` ; métriques réelles `synergyUsageRate`/`loopDepthMedian`/`deathRatePerFloor`/`averageClearTime` (§13.9.H) — **implémenté** | Tooling | Pont sim↔terrain pour le playtest communautaire (§13.9.J). NO-OP tant que le flag est off ; la sim reste la non-régression |
| **Hors-scope V1** | `eclatPowerBoost`, héritage en Boucle (💡 ❓) | Feature | Déconseillé (§13.3.4, §13.4.4) |

> ✅ **Ordre directeur** : *base scaling (déjà là → documenter) → garde-fou de
> sim → modifiers avancés (UX, puis équilibrage) → simulations automatisées*.
> Conforme à la demande, en plaçant la **non-régression** avant les features.

## G. Balancing continu — métriques clés à monitorer

Tableau de bord d'équilibrage. **Deux sources** : ✅ **sim** (déjà mesurable
aujourd'hui via `sim-difficulty.js`) et 💡 **télémétrie de playtest** (à collecter —
voir §H, aucune n'existe en jeu actuellement).

| Métrique (nom canonique) | Définition | Cible | Source |
|--------------------------|-----------|-------|--------|
| **`difficultyScore`** | win-rate moyen pondéré par étage (proxy de difficulté) | courbe douce, **0 cliff > 15 pts** | ✅ `sim-difficulty.js §3/§5` |
| **`deathRatePerFloor`** | % de runs morts à l'étage *f* | progressif, ≤ 1 cliff intentionnel (palier Boucle) | 💡 télémétrie · proxy ✅ `1 − clear` |
| **`averageClearTime`** | tours moyens pour vider un étage | borne haute confortable (combats ≤ ~14 tours) | ✅ colonne « Tours moy. » + 💡 temps réel playtest |
| **`synergyUsageRate`** | % de combats où le joueur exploite une faiblesse / un artefact / une potion | élevé chez les builds optimisés (Sim 2/5) | 💡 télémétrie uniquement |
| **`interHouseWinSpread`** | écart de win-rate max entre les 4 Maisons | **bande ±5 pts** | ✅ `--house-set` × 4 |
| **`loopDepthMedian`** | profondeur de Boucle médiane atteinte | corrélée au farming investi (pas au hasard) | 💡 télémétrie |
| **`spikesDetected`** | nb de chutes > 15 pts entre 2 étages | **0** (hors cliffs de palier voulus) | ✅ `DIFFICULTY_REPORT.md §5` |
| **`underLevelGap`** | écart niveau joueur vs niveau attendu (`§1`) | nudge si ≤ −2 (cause n°1 d'échec, Sim 6) | 💡 in-game (calculable live) |

> ✅ **Aujourd'hui mesurables sans rien coder** : `difficultyScore`,
> `averageClearTime`, `interHouseWinSpread`, `spikesDetected` (et un proxy de
> `deathRatePerFloor`) sortent **directement** de `sim-difficulty.js`.
> 💡 `synergyUsageRate`, `loopDepthMedian`, `deathRatePerFloor` *réel* exigent une
> **télémétrie de playtest** qui n'existe pas encore (§H).

## H. Intégration de logs de simulation / debug in-game (✅ implémenté, P4)

> ✅ **État réel** : implémenté (`js/balance-log.js`, `window.BalanceLog`). Logger
> **opt-in, local, anonyme**, derrière un flag (modèle `MP_CONFIG`), **désactivé
> par défaut** (zéro impact joueur, zéro réseau). `BalanceLog.record(...)` est un
> **NO-OP total** tant que `localStorage.hogwarts_balance_debug !== '1'`.
> Instrumentation **100 % additive** : aucune valeur d'équilibrage touchée.

**`BALANCE_DEBUG` (local, opt-in)** — quand *activé en console*
(`localStorage.hogwarts_balance_debug = '1'`), accumule dans
`localStorage['hogwarts_rpg_balance_log']` (schéma = colonnes sim §3 : étage,
mode, niveau, tours, PV restants, issue) des compteurs **anonymes et locaux** :

| Hook | Donnée logguée | Module |
|------|----------------|--------|
| `endBattle()` | étage, mode, tours, PV restants, issue (win/flee/death) | `battle-rewards.js` |
| `triggerDeath()` | étage, niveau, `underLevelGap`, cause | `battle-death.js` |
| `castSpellInBattle()` | exploita-t-il une faiblesse ? artefact/potion utilisés ? → `synergyUsageRate` | `battle-spells.js` |
| `goDeeper()` | profondeur atteinte, temps de run → `loopDepthMedian`, `averageClearTime` | `movement-floors.js` |

- ✅ **Réutilise les hooks existants** (`autoSave` est déjà branché sur ces mêmes
  points — §« Sauvegarde ») → **call-sites défensifs** `if (window.BalanceLog)`,
  zéro régression si le module n'est pas chargé. `underLevelGap` = niveau joueur −
  niveau attendu (table figée `DIFFICULTY_REPORT.md §1`, calculé dans le module).
- ✅ **Export** : `BalanceLog.export()` copie le JSON dans le presse-papiers et
  affiche un **bouton debug flottant** *« ⚖️ Export logs »* (injecté uniquement si
  le flag est on) — **pas de collecte automatique** (respect vie privée, cohérent
  avec le repli localStorage du HoF). Les métriques dérivées (`synergyUsageRate`,
  `loopDepthMedian`, `deathRatePerFloor`, `averageClearTime` — noms canoniques §G)
  sont reconstruites par `BalanceLog.summary()` à l'export.
- ✅ **Pont sim ↔ jeu** : le format de log exporté reprend **le même schéma** que la
  sortie `sim-difficulty.js §3` → on peut **superposer** courbe simulée et courbe
  réelle dans un même tableur pour valider que le modèle Monte-Carlo *prédit* le
  terrain. C'est le chaînon manquant entre théorie et playtest.
- ✅ **Tranché** : `BALANCE_DEBUG` **implémenté** (P4) — opt-in/local/anonyme, NO-OP
  tant que le flag est off. La sim reste la non-régression ; le logger sert le
  playtest communautaire (§J). Test : `tests/scenarios/misc.js — scenarioBalanceLog`.

## I. Processus itératif — Simulation → Playtest → Ajustement

> ✅ Boucle de validation **gravée** (la sim est la preuve, le playtest l'arbitre,
> ce chapitre le contrat) :

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. MESURER   node tools/sim-difficulty.js … (baseline)            │
│              → difficultyScore, spikesDetected, interHouseWinSpread│
│ 2. HYPOTHÈSE Identifier 1 variable (cliff, mur, synergie suspecte) │
│ 3. SIMULER   Rejouer avec le flag dédié (--*) ; comparer Δ         │
│              → ajouter un flag au sim si la variable est nouvelle  │
│ 4. ARBITRER  Playtest réel (interne, puis communautaire §J)        │
│              → confronter au ressenti + logs §H si dispo           │
│ 5. AJUSTER   1 constante à la fois (data.js / dungeon-scaling.js)  │
│ 6. VÉRIFIER  check_difficulty.js (CI, ±10 pts) + units + smoke     │
│              régénérer DIFFICULTY_REPORT.md DANS le même commit     │
│ 7. DOCUMENTER amender ce chapitre + G3/G4/G8 si écart  ──┐          │
└──────────────────────────────────────────────────────────┼────────┘
                                          (retour à 1) ◄─────┘
```

✅ **Garde-fou automatisé** : `tools/check_difficulty.js` en CI **bloque** (exit 1)
toute dérive > 10 pts d'un couple (étage, mode) **non documentée** dans
`DIFFICULTY_REPORT.md` — l'étape 6 n'est pas facultative, elle est *forcée*.

### Priorisation des ajustements (rappel de l'ordre d'impact)

D'après §13.5.2 (poids relatif mesuré), prioriser dans cet ordre :

1. **🔴 Spikes non intentionnels** (`spikesDetected > 0`) — *toujours* P0, c'est un bug.
2. **🟠 Cliffs de palier de Boucle** mal communiqués — UX/toast avant nerf.
3. **🟡 Écart inter-Maisons > ±5 pts** — un item/passif de Maison déséquilibre.
4. **🟢 Confort de courbe** (murs intentionnels) — *ne pas toucher* sauf playtest probant.

> ✅ **Règle d'or** : on **ajoute un axe de progression** (ex. XP passive de Boucle)
> plutôt que de **baisser le scaling** ; on corrige par la **communication** (toast,
> onboarding) avant de toucher une **valeur**. Les nerfs de scaling sont le **dernier**
> recours, jamais le premier.

## J. Playtesting communautaire (suggestions futures)

💡 (hors-scope V1, piste pour après publication GitHub Pages) :

- **Cohortes ciblées** : recruter par profil (1ᵉʳ run Normal Solo / vétéran Boucle /
  complétionniste) pour couvrir les 6 simulations *avec de vrais humains*.
- **Sondage post-run léger** (1 écran, opt-in) : *« À quel étage as-tu senti le mur ? »*,
  *« T'es-tu senti bloqué ou pressé ? »* — confronte le **ressenti** au
  `difficultyScore` simulé (un mur *perçu* avant le mur *mesuré* = problème d'UX, pas
  d'équilibrage).
- **Partage de logs `BALANCE_DEBUG`** (§H) : export JSON volontaire → superposition
  sim/réel. **Anonyme, local, jamais automatique.**
- **Canal de feedback** : issues GitHub étiquetées `balance` → triage selon la
  priorisation §I. Une plainte isolée ≠ un ajustement ; un *pattern* sur plusieurs
  cohortes = hypothèse à simuler.
- **Hall of Fame comme signal passif** : la distribution des `loopDepthMedian` et des
  scores Ironman par difficulté est **déjà** un proxy d'équilibrage gratuit (données
  Supabase existantes) — à exploiter avant toute nouvelle collecte.

> ✅ **Règle d'or du balancing continu** : *toute valeur d'équilibrage modifiée
> régénère `DIFFICULTY_REPORT.md` dans le même commit, et amende ce chapitre.* La
> simulation est la **preuve**, le playtest est l'**arbitre**, ce chapitre est le
> **contrat**.

---

## Points à trancher (résumé)

1. ❓ Adopter `houseDifficultyModifier` (saveur de difficulté par Maison) au prix
   de l'équité stricte ? *(Recommandation : non en V1 — §13.3.1.)*
2. ❓ Donner un `eclatPowerBoost` aux Éclats (les rendre semi-obligatoires) ?
   *(Recommandation : non — garder narratif — §13.3.4.)*
3. ✅ « Refuges de Maison » — **tranché : implémenté** (P3, cosmétique, repos
   partiel non-interrompu, équité stricte préservée — §13.4.3).
4. ❓ Introduire un « héritage en Boucle » / perte partielle à la mort ?
   *(Recommandation : hors-scope V1 — §13.4.4.)*
5. ✅ Adoucir l'endgame (XP passive de Boucle) — **tranché : implémenté** (P2,
   `LOOP_PASSIVE_XP_FRAC = 0.45`). Axe additif sans toucher au scaling ; adoucit
   le mur sans trivialiser (le farming reste la voie du confort total). Le pivot
   reste communiqué (toast P1). Cf. §13.5 Sim 4 / `DIFFICULTY_STUDY.md §8.8`.
6. ✅ Garde-fou de sim en CI (`check_difficulty.js`) — **implémenté** (P1,
   §13.9.C/F). Le toast de pivot endgame + l'indicateur d'attrition (§13.9.E)
   sont aussi **implémentés**.
7. ✅ Logger d'équilibrage in-game `BALANCE_DEBUG` (opt-in, local, anonyme) —
   **tranché : implémenté** (P4, `js/balance-log.js`, `window.BalanceLog`).
   Collecte `synergyUsageRate`/`loopDepthMedian`/`deathRatePerFloor`/
   `averageClearTime` réels via 4 hooks défensifs. NO-OP tant que le flag est off ;
   la sim reste la non-régression — §13.9.H/J.
8. ❓ Atténuer le **cliff de palier de Boucle** (20→21) en répartissant `scalDelta`
   sur 2–3 étages plutôt qu'en bloc ? *(Recommandation : d'abord communication
   (toast pivot ✅) ; ne lisser qu'après playtest, sans baisser la puissance cible —
   §13.5 Sim 4.)*

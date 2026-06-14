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
  scal   = 1 + 0.5 / intraMult                           // scalDelta = 0.5, lissé
  fixEff = baseFix[stat] / intraMult                      // baseFix {hp:80, atk:10, def:5, mag:8, xp:50, gold:80}
```

> ✅ **Effet net** : puissance des monstres **× ~1.5 par palier de 10 étages**
> (`DIFFICULTY_STUDY.md §8.2`). Un monstre d'étage 14 a la *base* d'un étage 4,
> rehaussée par la récursion endgame.

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

✅ Le choix du héros (Harry, Hermione, Céleste, Iris, Maxence, Anastasia)
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

> Méthode : Monte-Carlo `tools/sim-difficulty.js` (600-800 combats/étage/mode) sur
> les formules réelles + lecture *« run d'étage »* (4 salles, attrition). Les
> chiffres ci-dessous sont **mesurés** (`DIFFICULTY_REPORT.md`,
> `DIFFICULTY_STUDY.md`) ; les « scénarios » ci-dessous les *narrativisent*.

### Simulation 1 — Run Gryffondor solo, étages 1–8 (Normal)

> Commande de référence : `node tools/sim-difficulty.js --difficulty=Normal --build=balanced 800`

**Déroulé mesuré :**

| Étage | Niv. | Win % combat | Clear d'étage | Ressenti |
|------:|-----:|:------------:|:-------------:|----------|
| 1–4 | 1→6 | 100 % | 98-100 % | 🟢 prise en main fluide |
| 5 | 8 | 96 % | 81 % | 🟢 premiers vrais échanges |
| 6 | 8 | 87 % | **43 %** | 🟡 l'attrition mord |
| 7 | 9 | 87 % | **34 %** | 🟠 entrée des Profondeurs, Solo sous pression |
| 8 | 9 | 72 % | **11 %** | 🟠 mur de clear-d'étage Solo |

- ✅ **Points forts** : courbe lisse, aucun spike ; le profil Gryffondor (LCK
  élevé → crit physique) brille en combat isolé ; sentiment net de descente.
- ⚠️ **Points de frustration** : l'écart combat-isolé (87 %) vs clear-d'étage
  (43 % à l'étage 6) peut **surprendre** un joueur Solo qui « gagne tous ses
  combats » mais meurt sur l'étage. La fontaine de l'étage 8 arrive *après* le
  pic d'attrition de l'étage 6-7.
- 💡 **Ajustements recommandés** : (1) **signal UI** du niveau de visite / état
  d'attrition (proposé en [G8](../gameplay/G8-difficulte-scaling.md)) ; (2) inciter
  le Solo à descendre plutôt qu'à poncer (le grind densifie *contre* lui) ; (3)
  garder la fontaine de l'étage 5 comme respiration avant la crête.

### Simulation 2 — Run Serpentard duo (Normal)

**Déroulé mesuré :**

| Étage | Niv. | Win % combat | Clear d'étage | Ressenti |
|------:|-----:|:------------:|:-------------:|----------|
| 1–6 | 1→8 | 100 % | 95-100 % | 🟢 confortable, deux corps absorbent |
| 7 | 9 | 98 % | 69 % | 🟢→🟡 trios apparaissent (ét. 7+) |
| 8 | 10 | 92 % | 44 % | 🟡 attrition à deux, soigneuse sollicitée |
| 9 | 10 | 77 % | 10 % | 🟠 tendu, le farming devient utile |
| 10 | 11 | 74 % | 8 % | 🟠 climax Voldemort — modif. signature 🐍 (lifesteal/debuff) aide |

- ✅ **Points forts** : le Duo lisse l'attrition (Hermione soigne, set Maison +
  set Ténèbres répartis) ; le profil Serpentard (MAG) exploite faiblesses
  élémentaires ; trios différés à l'étage 7 = montée *pile* à l'entrée des
  Profondeurs.
- ⚠️ **Points de frustration** : le clear-d'étage chute fort à l'étage 9 (10 %)
  *sans* systèmes endgame ni farming — un Duo « boutique pure » heurte un mur
  réel avant le climax.
- 💡 **Ajustements recommandés** : la signature 🐍 (`slythPactChoice`) doit rester
  un **vrai choix tactique** au climax ; vérifier que la quête de set ouvre assez
  tôt (Maître Or) pour donner la 4ᵉ pièce avant la Boucle.

### Simulation 3 — Boucle 3 (étages 21–30, Duo, post-victoire)

> Commande : `node tools/sim-difficulty.js --difficulty=Normal --endgame --bonus-levels=25 --artifacts --forge=5 --library=3 --house-set=Gryffondor --tenebres-set 800`

**Déroulé mesuré** (`DIFFICULTY_STUDY.md §8`) :

| Étage | Sans farming | Duo +25 niv | Kit complet (niv+artefacts+Forge 5+Biblio 3+sets) |
|------:|:------------:|:-----------:|:--------------------------------------------------:|
| 20 | 70 % | 99 % | ~100 % |
| 25 | 40 % | 92 % | ~90 % |
| 30 | 26 % | 85 % | 88-100 % |

- ✅ **Points forts** : la Boucle est un **gate infini farmable** cohérent ; à
  Boucle 3, le kit complet maintient le confort ; les paliers Apothéose/★ N
  donnent un objectif de prestige illimité (don à la Maison = gold-sink).
- ⚠️ **Points de frustration** : **aucune progression passive** en endgame
  (`xpNext × 1.6` compose plus vite que l'XP gagnée) — descendre *sans farmer*
  heurte un mur réel vers l'étage 19-21. C'est un **choix de design assumé**
  (roguelike), mais surprenant pour qui a traversé la trame principale en
  sur-leveling passif.
- ✅ **Implémenté (P2)** : on a retenu l'**XP passive de Boucle**
  (`LOOP_PASSIVE_XP_FRAC = 0.45`, `data.js`) — un axe de progression *additif*
  (règle §13.6 #6 : on ne touche pas au scaling), crédité par étage de Boucle
  le plus profond franchi (anti-farm). Mesure : le mur de l'étage 19-21
  s'adoucit (ét. 20 Duo 63 → 76 %, Solo 48 → 63 %) **sans trivialiser** le deep
  endgame (ét. 30 reste ≤ 36 % sans farming, qui garde toute sa valeur). Cf.
  `DIFFICULTY_STUDY.md §8.8`. Le pivot du P1 (toast *« la puissance se gagne »*)
  reste vrai : la passive est un filet, pas une rente.

### Simulation 4 — Cas extrême : toutes quêtes signature + max Éclats + kit endgame

**Hypothèse** : joueur Duo « complétionniste » — signature de Maison terminée
(modif. one-shot au climax), 3 Éclats collectés, palier Apothéose (18) atteint,
Forge 5 / Biblio 3 / sets 4/4 répartis, ~30 niveaux farmés.

- ✅ **Points forts (mesurés/extrapolés)** : au climax (étage 10), la signature
  neutralise/atténue une phase de boss → quasi-100 % ; en Boucle profonde, le
  passif d'Apothéose (Élan / Soif / Esprit / Souffle) + sets crit (post-refonte,
  non gaspillés) maintiennent le confort jusqu'à l'étage 30+.
- ⚠️ **Points de frustration** : risque de **trivialisation** du climax si la
  signature + le sur-leveling se cumulent — le combat-événement le plus important
  du jeu pourrait être *trop* facile pour un complétionniste.
- 💡 **Ajustements recommandés** : (1) la signature étant **one-shot et
  bénéfique**, elle est saine — ne pas la nerf ; (2) vérifier que **Voldemort
  garde ses phases** (enrage 50 %, terreur 25 %) même avec la signature 🦁 (qui ne
  *neutralise que* la terreur, pas l'enrage) ; (3) **ne PAS** ajouter
  `eclatPowerBoost` (§13.3.4) : empiler un bonus d'Éclats sur ce profil
  accentuerait la trivialisation. Les Éclats doivent rester narratifs.

### 13.5.1 Synthèse des simulations

| Scénario | Verdict global | Action recommandée |
|----------|----------------|--------------------|
| Gryff Solo 1–8 | ✅ sain, mais écart combat/clear surprenant | Signal UI d'attrition (💡) |
| Serp Duo | ✅ confortable, mur ét. 9 sans endgame | RAS (farming = réponse prévue) |
| Boucle 3 | ✅ gate farmable tenable ; mur ét. 19-21 adouci par l'XP passive (P2) | Pivot communiqué (toast P1) + XP passive de Boucle ✅ (P2) |
| Cas extrême | ✅ sain, léger risque de trivialisation climax | Garder phases boss ; refuser `eclatPowerBoost` |

> ✅ **Conclusion d'ensemble** (alignée sur `DIFFICULTY_STUDY.md §1, §7`) : *« la
> courbe est saine »*. **Aucun correctif de scaling n'est requis.** Le seul mur —
> le clear-d'étage Solo de milieu/fin de partie — est **intentionnel** et se
> franchit par la progression. Les rares ajustements proposés sont **cosmétiques
> ou de communication** (signaux, toasts), pas d'équilibrage.

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
    tombe plus. »* — communique le pivot endgame (Sim 3). One-shot **sérialisé**
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
| **Hors-scope V1** | `eclatPowerBoost`, héritage en Boucle (💡 ❓) | Feature | Déconseillé (§13.3.4, §13.4.4) |

> ✅ **Ordre directeur** : *base scaling (déjà là → documenter) → garde-fou de
> sim → modifiers avancés (UX, puis équilibrage) → simulations automatisées*.
> Conforme à la demande, en plaçant la **non-régression** avant les features.

## G. Balancing continu — métriques à suivre

💡 (proposition de tableau de bord — playtesting) :

| Métrique | Cible | Outil |
|----------|-------|-------|
| Taux de mort par étage | progressif, pas de cliff > 15 pts | `sim-difficulty.js §7` + télémétrie playtest |
| Clear-d'étage par mode | Solo tenable ≤ ét. 5-6, Duo ≤ ét. 8 sans farming | `sim-difficulty.js --endgame` |
| Temps moyen / run principal | borne haute confortable | playtest |
| Win-rate inter-Maisons | bande ±5 pts | `--house-set` × 4 |
| Profondeur de Boucle médiane | corrélée au farming investi | télémétrie |
| Spikes détectés | **0** | `DIFFICULTY_REPORT.md §5` |

> ✅ **Règle d'or du balancing continu** : *toute valeur d'équilibrage modifiée
> régénère `DIFFICULTY_REPORT.md` dans le même commit, et amende ce chapitre.* La
> simulation est la **preuve**, ce chapitre est le **contrat**.

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
   reste communiqué (toast P1). Cf. §13.5 Sim 3 / `DIFFICULTY_STUDY.md §8.8`.
6. ✅ Garde-fou de sim en CI (`check_difficulty.js`) — **implémenté** (P1,
   §13.9.C/F). Le toast de pivot endgame + l'indicateur d'attrition (§13.9.E)
   sont aussi **implémentés**.

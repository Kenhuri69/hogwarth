# Revue d'équilibrage — Statistiques du joueur

> **Statut : RÉDACTION (conception).** Aucune modification du code de jeu (`js/`).
> Seul l'outil de mesure `tools/sim-difficulty.js` reçoit un mode d'analyse
> opt-in (`--stat-rework`) pour chiffrer les implications avant toute décision.

## 1. Constat (revue du code)

Cartographie de l'usage réel de chaque stat (lecture mécanique) :

| Stat | Croît /niv | Allouable | Lue par une mécanique de combat ? | Verdict |
|------|:--:|:--:|------|------|
| ATK | +1 | via STR | dégâts physiques `atk + rand(0..3)` − def | 🟢 central |
| DEF | +1 | ❌ | mitigation `max(atk·0.25, atk−def)` | 🟢 central |
| MAG | +1 | ❌ | dégâts de sort `power + mag/2` | 🟢 central |
| LCK | ❌ | ✅ | crit physique `min(40, 5+lck·0.5)` (plafonne) | 🟡 |
| AGI | +1 | ✅ | esquive **et** crit sort (cap 35 % chacun) ; fuite | 🟡 surchargée |
| INT | +1 | ✅ | soin (int/4), DoT (int/24), brassage potions | 🔴 faible/opaque |
| END | ❌ | ✅ (+5 PV) | soin (end/4) | 🔴 redondante avec PV max |
| STR | +1 | ✅ (+1 ATK) | **rien** sauf éclaboussure Bombarda (str/4) | 🔴 fantôme |

Fragilités : STR ne sert presque à rien ; INT/END n'ont pas de débouché vers une
primaire ; LCK/AGI plafonnent puis meurent (les +LCK de la série ★N endgame sont
des points morts une fois le cap crit atteint).

## 2. Décisions (validées avec le PO, 2026-05-31)

| # | Décision | Détail validé |
|---|----------|---------------|
| D1 | **INT → MAG**, conversion **4:1** | `mag += floor(int/4)` dans `recalculateStats`. |
| D2 | **END → DEF**, conversion **4:1** | `def += floor(end/4)` dans `recalculateStats`. |
| D3 | **END → résistance aux DoT** | réduit les dégâts (et/ou durée) des DoT subis (burn/poison/bleed/gel). Modèle proposé : `dégât_tick = max(1, power − floor(END/8))`. |
| D4 | **STR → pénétration de DEF**, en **% avec courbe sigmoïde** | douce au début → quasi-linéaire au milieu → plateau logarithmique vers un cap. Couplage **STR → +1 ATK conservé** (STR donne ATK *et* pénétration). |
| D5 | **P6 — débouché post-plafond LCK/AGI** | une fois le cap crit/esquive atteint, recycler les points excédentaires (LCK → or/butin ; AGI → initiative/atténuation). **Phase 2**, non chiffré ici. |

### Formule de pénétration STR (D4) — proposition concrète

Fonction de Hill (n=2), qui réalise exactement « douce → linéaire → plateau » :

```
penFrac(STR) = CAP · STR² / (STR² + H²)        avec CAP = 0.50, H = 20
effDef = def · (1 − penFrac(STR))
```

| STR | 5 | 10 | 15 | 20 | 25 | 30 | 40 | 60 |
|-----|---|----|----|----|----|----|----|----|
| pén. | 2.9 % | 10 % | 18 % | 25 % | 30.5 % | 34.6 % | 40 % | 45 % |

- `H` (demi-saturation, 20) et `CAP` (50 %) sont les **knobs** d'équilibrage.
- Harry (STR base 9, +1/niv) en profite ; Hermione (STR 6, casteuse) quasi pas
  — la pénétration est thématiquement un outil de **frappeur physique**.

## 3. Implications attendues (à confirmer par simulation §4)

- **INT 4:1 plus faible que l'allocation actuelle** : aujourd'hui le simulateur
  modélisait l'allocation INT comme `+1 MAG` direct (1:1). Le runtime réel fait
  `+1 INT` (inerte). La conversion 4:1 est donc **plus généreuse que le réel
  actuel** (INT devient utile) mais **moins forte que le raccourci du sim** — il
  faut vérifier que le casteur ne soit pas dévalué.
- **END devient un choix défensif riche** : +5 PV (allocation) + DEF (4:1) +
  résistance DoT. Risque : END trop fort vs allocation pure DEF — surveiller.
- **STR cesse de mentir** : la « Force » influence enfin la frappe (ATK + perce-
  garde), surtout contre les boss à haute DEF.

## 4. Simulation — quantifier avant d'implémenter

Outil : `tools/sim-difficulty.js`, mode opt-in `--stat-rework` (n'altère pas le
comportement par défaut ; les rapports existants restent valides).

Le mode `--stat-rework` modélise fidèlement les 4 décisions **et** corrige une
omission du simulateur (croissance STR/INT/AGI +1/niveau, présente dans le jeu
réel via `_grantLevelStats` mais absente du sim). Pour isoler le seul apport du
rework, un drapeau `--fair-baseline` applique uniquement la correction de
croissance — la comparaison **fair-baseline vs stat-rework** mesure le rework pur.

Allocation sous rework alignée sur `STAT_POINT_EFFECTS` réel :
`STR→+1 ATK +1 STR · INT→+1 INT · AGI→+1 AGI · END→+1 END +5 PV · LCK→+1 LCK`.

### Protocole

```
# baseline équitable (correction de croissance seule)
node tools/sim-difficulty.js --fair-baseline --stat-points=3 --build=<B> 600
# rework (croissance + D1..D4)
node tools/sim-difficulty.js --stat-rework   --stat-points=3 --build=<B> 600
```
avec B ∈ {balanced, offensive, tank}, en Normal, étages 1-12, solo+duo.

### Résultats (n=600/cellule, Normal, knobs par défaut penCap=0.50 H=20 dotResDiv=8)

Δ = win-rate **rework − fair-baseline** (points de %). Étages 1-4 omis (100 %
des deux côtés partout).

| Étage | balanced Solo | balanced Duo | offensive Solo | offensive Duo | tank Solo | tank Duo |
|------:|:--:|:--:|:--:|:--:|:--:|:--:|
| 5  | +4  | 0  | +3 | 0  | +4  | 0  |
| 6  | +6  | 0  | +5 | +1 | +5  | 0  |
| 7  | +4  | +4 | +6 | +2 | +9  | +3 |
| 8  | +10 | +6 | +5 | +6 | +13 | +9 |
| 9  | +11 | +11| +8 | +7 | **+20** | +11 |
| 10 | +8  | +11| +8 | +9 | +15 | +17 |
| 11 | +12 | +10| +7 | +11| +15 | +19 |
| 12 | +12 | +9 | +4 | +10| +18 | +11 |

**Lecture.**
- Effet **nul en early game** (ét. 1-4) : les stats secondaires sont trop
  basses pour que les conversions/pénétration pèsent — le début de partie n'est
  pas cassé. ✅
- Gain **croissant avec l'étage** : là où la DEF ennemie et les DoT mordent le
  plus, la pénétration STR et la résistance END font leur travail. ✅
- **Tous les builds profitent** : aucun build ne devient inutile.
- ⚠️ **Le build tank est le grand gagnant** (+13 à +20 pts en solo endgame),
  loin devant balanced (~+10) et offensive (~+6). C'est logique : END cumule
  désormais **trois** bénéfices (+5 PV + DEF 4:1 + résistance DoT) tandis que la
  pénétration STR ne profite qu'aux frappeurs physiques. Risque d'équilibrage :
  END pourrait devenir l'allocation par défaut universelle.

**Conclusion.** Le rework remplit l'objectif — il **adoucit le mur endgame**
(+8 à +20 pts ét. 8-12) sans toucher au early game, et redonne un rôle réel à
STR/INT/END. Mais l'ampleur est **plus forte que prévu**, et **END est
sur-récompensée**. Deux leviers de réglage avant implémentation :
1. Réduire l'apport END : conversion END→DEF en **6:1** (au lieu de 4:1) et/ou
   `--dot-res-div=12` (résistance DoT plus douce).
2. Garder INT→MAG en 4:1 (le casteur n'est pas sur-servi).

Les knobs `--pen-cap` / `--pen-half` / `--dot-res-div` / `--int-mag-div` /
`--end-def-div` permettent de re-simuler chaque réglage avant de figer les valeurs.

> Repro :
> `for b in balanced offensive tank; do node tools/sim-difficulty.js --fair-baseline --stat-points=3 --build=$b 600; node tools/sim-difficulty.js --stat-rework --stat-points=3 --build=$b 600; done`

### Réglage adouci — END→DEF 6:1 + résistance DoT div12 (n=600)

Pour calmer la sur-récompense d'END, conversion **END→DEF passée à 6:1** et
**résistance DoT adoucie** (`dotResDiv=12`). INT→MAG et pénétration STR
inchangés. Δ rework−baseline :

| Étage | balanced Solo | balanced Duo | offensive Solo | offensive Duo | tank Solo | tank Duo |
|------:|:--:|:--:|:--:|:--:|:--:|:--:|
| 8  | +7  | +5 | +6 | +6 | +9  | +6 |
| 9  | +10 | +12| +5 | +8 | +13 | +9 |
| 10 | +9  | +12| +8 | +9 | +11 | +13 |
| 11 | +10 | +13| +10| +9 | +11 | +14 |
| 12 | +9  | +11| +6 | +11| +13 | +9  |

**Effet du réglage.** Le build tank en solo endgame retombe de **+13..+20 → +9..+13**,
et les trois builds **convergent** désormais (~+9 à +13 partout). L'écart tank vs
balanced en solo n'est plus que de ~2-4 pts (contre ~8 pts avant). L'objectif
« adoucir le mur endgame sans build dominant » est atteint :

- ✅ early game intact (ét. 1-4 à 100 %), gain croissant et homogène en endgame ;
- ✅ END reste défensivement utile (PV + DEF 6:1 + résistance DoT douce) sans
  écraser les autres allocations ;
- ✅ STR/INT conservent leur apport (pénétration, MAG) à 4:1 / courbe inchangés.

### Option D — pénétration d'armure des monstres « brutes » (n=600)

Plutôt que (ou en plus de) raboter END→DEF, on rend le système **symétrique** :
certains monstres frappeurs physiques (`atk ≥ 1.5×mag ET atk ≥ 12` — 15/67
monstres : Greyback, Aragog, trolls, loups-garous, manticore, Basilic…)
ignorent une fraction de la DEF du joueur. C'est une **contre-mesure ciblée au
build tank** : un mur de DEF cesse d'être invulnérable face aux brutes.
Knob `--enemy-pen=F`. Testé à `0.30` PAR-DESSUS le réglage adouci (END 6:1, DoT div12).

Δ rework(adouci+brutes)−baseline, solo endgame :

| Étage | balanced Solo | offensive Solo | tank Solo |
|------:|:--:|:--:|:--:|
| 8  | +8  | −1 | +6 |
| 9  | +4  | +3 | +10 |
| 10 | +10 | +4 | +4 |
| 11 | +6  | +7 | +16 |
| 12 | +4  | −2 | +10 |
| **moy. 8-12** | **+6.4** | **+2.2** | **+9.2** |

À comparer aux moyennes solo 8-12 **sans** pénétration ennemie :
balanced +9.4, offensive +6.6, tank +12.6.

**Effet de l'Option D.**
- ✅ Le tank baisse (moy. 12.6 → 9.2) — la pénétration des brutes mord bien sur
  son mur de DEF, comme voulu.
- ⚠️ Mais elle **rabote aussi tous les builds** (offensive tombe à +2.2, parfois
  négatif) : l'effet de fond du rework — adoucir l'endgame — est en partie
  annulé. La pénétration frappe toute DEF, pas seulement celle du tank.
- 🔎 Bruit Monte-Carlo visible (tank ét.10 +4 vs ét.11 +16) : à n≥1500 pour
  trancher finement, mais la tendance est claire.

**Lecture comparée des deux leviers anti-tank :**
| Levier | Tank solo 8-12 | Autres builds | Effet de bord |
|--------|:--:|:--:|--------|
| END→DEF 4:1, DoT 8 (base) | +13..+20 | +6..+14 | tank aberrant |
| END→DEF 6:1, DoT 12 | +11..+14 | +7..+14 | tank rogné, fond préservé |
| + brutes `enemy-pen 0.30` | +4..+16 (moy 9) | offensive ~+2 | symétrique mais rabote tout |

**Recommandation.** L'Option D est **séduisante thématiquement** (la Force perce
des deux côtés ; enrichit le bestiaire) mais, dosée à 0.30, elle sur-corrige :
elle gomme une partie du bénéfice voulu et pénalise surtout l'offensif (DEF
basse + perce-armure = double peine). Deux pistes si on la retient :
- **dose plus douce** (`enemy-pen 0.15`) pour ne mordre que les gros murs de DEF ;
- **la réserver aux boss** (Greyback/Aragog/Dolohov) plutôt qu'aux 15 brutes,
  pour en faire un pic de tension ponctuel et non une taxe permanente.

**Valeurs candidates pour l'implémentation (sous réserve validation PO) :**
- Socle : INT→MAG **4:1**, END→DEF **6:1**, résistance DoT `floor(END/12)`,
  pénétration STR Hill (cap 50 %, H 20).
- Option D (à trancher) : pénétration d'armure des brutes, dose à fixer
  (`0.15` léger / `0.30` marqué) ou réservée aux boss.

### 4 bis. Option D — courbe sur DEF cible (rampe à seuil)

Sur décision PO (« courbe, pas fraction plate »), `--enemy-pen` est passé d'une
fraction constante à une **rampe à seuil sur la DEF de la cible** (helper pur
`enemyArmorPenFrac`), réglable par `--enemy-pen-lo` / `--enemy-pen-hi` :

```
penFrac(DEF) = cap · clamp((DEF − penLo) / (penHi − penLo), 0, 1)
```

→ plate à 0 sous penLo, linéaire au milieu, plateau à cap au-delà de penHi.
Forme retenue plutôt qu'une Hill (n=2) car la **fenêtre de DEF entre builds est
étroite** (mesurée : offensif ~24 → tank ~31 aux ét. 8-12) ; une Hill serait trop
molle pour discriminer.

**Mesures (win % moyen, solo, ét. 8-12, `--stat-points=3`) :**

| Config | offensif | balanced | tank | écart t−o |
|--------|:--:|:--:|:--:|:--:|
| socle seul | 42.8 | 51.6 | 58.6 | +15.8 |
| D-courbe cap 0.35 (lo20/hi34) | 43.6 | 51.6 | 57.0 | +13.4 |
| D-courbe cap 0.50 (lo22/hi32) | 42.2 | 50.4 | 56.6 | +14.4 |

**Finding décisif.** La courbe est *chirurgicale* (offensif intact, seul le tank
raboté — ce que la fraction plate ratait), mais **toute dose ne resserre l'écart
que de ~2-3 pts**. Cause profonde (mesurée, ét. 10) :

| Build | HP | DEF |
|-------|:--:|:--:|
| offensif | 165 | 25 |
| tank | **300** | 31 |

→ **+135 HP (+82 %) vs +6 DEF (+24 %)**. La domination du tank vient de son
**réservoir de PV (END→+5 PV/point)**, pas de son mur de DEF. La pénétration
d'armure attaque le petit avantage et laisse intact le grand. **Structurellement
le mauvais levier.** Le vrai levier anti-tank serait END→PV (réduire le +5 PV/pt,
ou plafonner la contribution PV de l'END), non encore simulé. Décision PO en
attente.

### 4 ter. Levier retenu — capacité « Broyer » (dégâts % PV max)

Décision PO : **accepter le tank durable**, mais lui opposer une menace ciblée
plutôt que nerfer END→PV. Levier choisi : capacité monstre **Broyer** infligeant
`F × PV max` de la cible, **contournant la DEF**. Modélisé en sim via
`--maxhp-dmg=F` / `--maxhp-chance=C` (injecte une ability `effect:"maxhpdamage"`
sur les brutes ; routée comme un 'damage' pour l'IA).

**Mesures (win % moyen, solo, ét. 8-12, `--stat-points=3`) :**

| Config | offensif | balanced | tank | écart t−o |
|--------|:--:|:--:|:--:|:--:|
| socle seul | 42.8 | 51.6 | 58.6 | +15.8 |
| Broyer 0.10 / 50 % | 45.0 | 50.6 | **52.8** | **+7.8** |

**Verdict.** Resserre l'écart de **8 pts** (vs ~2-3 pour la pénétration d'armure),
**offensif intact** (+2.2, bruit), tank **toujours devant donc durable** (52.8).
Mécanisme auto-ciblant : le tank combat plus longtemps (12-15 tours) → encaisse
plus de procs, chacun ignorant sa DEF et scalant sur son pool de PV ; l'offensif
tue avant d'en manger beaucoup. **C'est le bon levier anti-tank.**

Reste à calibrer (PO) : fraction (0.08-0.12 ?), chance/tour, et cible
(toutes les brutes vs réservé aux boss « écraseurs »). Implémentation runtime
(`monsters.js` ability + `battle-spells.js` handler `maxhpdamage`) à faire après
calibrage. **Aucun code `js/` touché à ce stade.**

#### Borne anti-grind (décision PO : découpler Broyer du niveau du joueur)

Souci relevé : `F × PVmax` brut **récompense le grind** — le pool de PV grossit
avec le niveau, donc Broyer tape plus fort en absolu sans que la menace de l'étage
ait bougé. Mesure (tank ét. 10, +4 niveaux de grind) : Broyer **27 → 36.7 (+36 %)**.

Deux références de borne `min(F×PVmax, K × ref)` mesurées (knobs `--maxhp-cap`,
`--maxhp-cap-ref`) :

| Référence (K=2) | Broyer niv. attendu | sur-levelé +4 | croissance |
|-----------------|:--:|:--:|:--:|
| aucune (brut) | 27 | 36.7 | +36 % |
| `atk` (ATK brute scalée) | 27.1 | 36.7 | +36 % (ne borne pas : cap≈96≫30) |
| **`hit` (coup normal mitigé)** | 26.5 | 31.4 | **+16 %** |

→ La borne **`hit` = K × mitigatedDamage(atk, def)** amortit le grind (sa DEF qui
monte rétrécit le coup normal → rétrécit le cap, auto-correcteur). La borne `atk`
est inutile à K raisonnable (ne mord jamais sans aplatir la différenciation).

**Préservation de l'effet anti-tank** (win % moyen, solo, ét. 8-12, niveau attendu) :

| Config | offensif | balanced | tank | écart t−o |
|--------|:--:|:--:|:--:|:--:|
| socle seul | 42.8 | 51.6 | 58.6 | +15.8 |
| Broyer 0.10/50 % non borné | 45.0 | 50.6 | 52.8 | +7.8 |
| **Broyer 0.10/50 % cap 2× `hit`** | 44.6 | 50.0 | **53.0** | **+8.4** |

→ La borne `hit` **conserve l'effet anti-tank** (tank 53.0 ≈ non borné, écart +8)
tout en plafonnant le scaling de niveau. **Formule retenue (sous réserve calibrage
fraction/K) : `dmg = min(F × PVmax, K × mitigatedDamage(enemy.atk, def))`, K≈2.**
Résiduel +16 % dû au plancher de mitigation 25 % (le coup normal ne peut pas
descendre sous 25 % de l'ATK). Découplage total possible mais coûteux (ratio
PVmax / PVmax-attendu-pour-le-niveau → nécessite un modèle de niveau) — non retenu
sauf demande PO.

#### Sweep F × K (n=600, solo, ét. 8-12, niveau attendu)

Socle de référence (sans Broyer) : écart tank−offensif **+14.8** (tank 58.4 / off 43.6).

**Axe anti-tank — écart tank−offensif (win %)** par (F, K), cap-ref `hit` :

| F \ K | 1.5 | 2 | 3 | tank (moy) |
|-------|:--:|:--:|:--:|:--:|
| 0.08 | +6.6 | +8.2 | +9.4 | 55-57 |
| 0.10 | +7.8 | +5.8 | +8.4 | 53-54 |
| 0.12 | +9.2 | +8.2 | +6.4 | 51-54 |

→ **F pilote la force anti-tank** (0.08 → tank ~56, 0.10 → ~53, 0.12 → ~52) ;
tous écrasent l'écart de +14.8 à ~+7. **K invisible ici** (bruit ±3) — son rôle
est le grind, pas le niveau attendu.

**Axe grind — Broyer moyen/proc** (tank ét. 10, F=0.10, niv. attendu vs +4 niveaux) :

| K | niv. attendu | +4 niveaux | croissance |
|---|:--:|:--:|:--:|
| illimité | 27.0 | 36.7 | +36 % |
| 1.5 | 25.2 | 28.1 | **+12 %** |
| 2 | 26.5 | 31.6 | **+19 %** |
| 3 | 27.0 | 35.2 | +30 % |

→ **K=2 = sweet spot** : niveau attendu intact (anti-tank préservé), grind coupé
de moitié. K=1.5 neutralise davantage le grind mais rogne l'effet de base (~7 %).

**Recommandation calibrage : F=0.10, K=2, chance 50 %.** Tank → ~53 (durable,
écart ~+7-8 vs socle +14.8), grind +36 %→+19 %, offensif intact. Variantes :
F=0.12 si on veut serrer plus le tank ; K=1.5 si on veut le grind plus plat.

## 5. Journal

- 2026-05-31 : revue + décisions D1-D5. Implémentation prématurée annulée
  (`git reset` de la branche à l'état master). Doc de conception rédigé.
  Ajout du mode d'analyse `--stat-rework` au simulateur (mesure, pas runtime).
- 2026-05-31 : simulation n=600 × 3 builds, fair-baseline vs rework.
  Verdict : objectif atteint (adoucit l'endgame, early game intact) mais
  **END sur-récompensée** (build tank +13 à +20 pts solo). Reco : tester
  END→DEF en 6:1 et/ou dotResDiv=12 avant de figer. **Aucune valeur figée,
  aucun code de jeu touché — décision d'implémentation en attente du PO.**
- 2026-05-31 : Option D passée en **rampe à seuil sur DEF cible** (knobs
  `--enemy-pen-lo/-hi`). Mesure n=600 : courbe chirurgicale mais effet faible
  (~2-3 pts). **Diagnostic : l'edge du tank est son pool de PV (+82 %), pas la
  DEF (+24 %) — la pénétration d'armure vise le mauvais levier.** Outil de
  mesure uniquement, aucun code `js/` touché.
- 2026-05-31 : décision PO — tank accepté durable, levier = capacité **Broyer**
  (dégâts % PV max contournant la DEF). Modèle sim `--maxhp-dmg/-chance`. Mesure
  n=600 : à 0.10/50 %, écart tank−offensif **+15.8 → +7.8** (−8 pts), offensif
  intact, tank toujours devant. **Le bon levier.** Calibrage fin + cible
  (brutes/boss) en attente PO avant implémentation runtime. Aucun code `js/` touché.
- 2026-05-31 : PO signale que `F×PVmax` brut récompense le grind (+36 % de Broyer
  pour +4 niveaux). Ajout knobs `--maxhp-cap` / `--maxhp-cap-ref`. Mesure :
  borne `hit` (= K × coup normal mitigé) amortit le grind à +16 % **en préservant
  l'effet anti-tank** (tank 53.0 ≈ non borné, écart +8.4). Borne `atk` inutile.
  Formule retenue : `min(F×PVmax, K×mitigatedDamage(atk,def))`, K≈2. Calibrage
  fraction/K/cible en attente PO. Outil de mesure uniquement, aucun code `js/` touché.
- 2026-05-31 : sweep F×K (n=600). F pilote l'anti-tank (0.10 → écart ~+7-8),
  K pilote le grind (K=2 : +36 %→+19 %, niveau attendu intact ; K=1.5 : +12 %
  mais rogne ~7 %). **Reco : F=0.10, K=2, chance 50 %.** En attente confirmation
  PO (fraction/K/chance/cible) avant implémentation runtime. Aucun code `js/` touché.

# Étude d'équilibrage — Coûts & bonus des artefacts

> **Date** : 2026-06-14 · **Branche** : `claude/artifact-balance-analysis-3611fs`
> **Statut** : 📊 **Étude documentaire — AUCUNE modification de `js/data.js`.**
> **Périmètre** : les **102 items équipables** de `js/data.js` (anciens + lot
> Artefacts 2.0 P1/P2/P3), tous slots, tous modes d'accès.
> **Source du modèle** : table §1.6 de
> [`artifacts-reliquary-system.md`](../.claude/plans/_archive/artifacts-reliquary-system.md).
> **Reproductible** : `node tools/analyze_artifact_balance.js`
> (`--csv` / `--by-slot`). Outil Node pur, lecture seule, non servi au navigateur.

---

## 0. Résumé exécutif

1. **Le catalogue suit bien un modèle `prix ≈ valeur-de-stats × acte`** — mais
   **pas** la formule §1.6 telle qu'écrite. La médiane du ratio prix/valeur-brute
   est **2,50×**, identique à `rareté(1,8) × acteII(1,4) = 2,52` : preuve que la
   colonne vertébrale est bien rareté × acte. **Mais** la formule littérale
   `budget × rarityMult × actMult` **surévalue massivement les epic** (écart
   médian **−60 % à −79 %** sur la bande epic). Cause : **double comptage** — un
   gros budget de stats encode déjà la rareté, et re-multiplier par `rarityMult`
   3,0 (epic) la compte deux fois. → **§3 propose une formule corrigée.**

2. **Bug de données : ID dupliqué `codex_rowena`** (legendary Tier-5 *et* epic
   récompense signature partagent le même `id`). `ITEMS.find()` renvoie le
   premier → la récompense signature epic est **inatteignable par lookup**.
   À corriger (renommage d'un des deux). Cf. §5 #1.

3. **Le palier `uncommon` reste quasi vide** : 3 items seulement
   (`orbe_flamme`, `orbe_givre`, `baton_apprenti`), tous trinket/wand. 8 slots
   sur 10 n'ont **aucun** uncommon. Le « gap ét.3-5 » que §1.6 voulait combler
   ne l'est qu'au tiers.

4. **Inéquité entre les 4 Premium de Maison** : budgets de stat
   685 (Serd) / 510 (Pouf) / 492 (Slyth) / **252 (Gryff)**. La Premium
   Gryffondor pèse **moins de la moitié** des trois autres — même politique de
   récompense, puissance très inégale. Cf. §6.3.

5. **Sinks endgame sains, à conserver** : `pendentif_ombre` (6000),
   `reliquaire_lunaire` (8000) et les 4 Premium `rarityScales` (9000 base ×1,5ⁿ)
   sont des gold-sinks intentionnels (cf. `game-economy-gold-audit.md`). **Aucune
   baisse proposée** sur l'endgame (économie déjà tendue).

6. **Quelques sous-évaluations ciblées** sur des pièces à valeur utilitaire non
   capturée par le budget de stats (`wand2`, `amulette`, `cape_invis`) — déjà
   pour partie traitées par l'audit éco. Détail §5.

---

## 1. Méthode

### 1.1 Extraction

`tools/analyze_artifact_balance.js` charge `ITEMS` (`js/data.js`) dans un bac à
sable `vm`, joint les `minFloor` de `SHOP_CATALOG` (`js/shop.js`), filtre les
items dont le `slot` ∈ {wand, head, body, hands, feet, cloak, amulet, ring,
belt, trinket} → **102 items équipables** (52 vendables + 50 non vendables).

### 1.2 `powerBudget` — valeur intrinsèque en or

`powerBudget = Σ(points de bonus × poids)`. Poids dérivés de §1.6, complétés
pour les champs que §1.6 n'énumérait pas (justifications ci-dessous).

| Bonus | Poids | Justification |
|-------|-------|---------------|
| Primaire `bonusAtk/Def/Mag/Lck` | **35 G/pt** | Valeur §1.6. Stat de combat directe. |
| Secondaire `bonusStr/Int/Agi/End` | **20 G/pt** | Valeur §1.6. Effet indirect (conversions D1–D5). |
| Crit % `bonusCritChance/SpellCritChance/DodgeChance` | **12 G/%** | Valeur §1.6. |
| Crit dmg `bonusCritDamage/SpellCritDamage` | **60 G/+1,0** | *Ajout* : +0,2 ≈ 12 G ≈ 1 % crit (calibré sur `wand2`). |
| Régen `regenHp/regenSp` | **40 G/pt** | Valeur §1.6 (« 1 regen ≈ 40 G »). |
| `bonusHpMax/SpMax` | **5 G/pt** | *Ajout* : cohérent D2bis (END→+5 PV @ 20 G/pt ⇒ 4 G/PV). |
| `grantsSpell` | **150 G** | Valeur §1.6. |
| `spCostReduction` | **60 G/pt** | *Ajout* : −1 PM/sort, levier Serdaigle, valorisé comme ½ primaire récurrent. |
| `bonusElemDmg{un élément}` | **300 G/+1,0** | *Ajout* : +0,15 ⇒ 45 G (orbe uncommon). |
| `bonusElemDmg{tous}` | **800 G/+1,0** | *Ajout* : +0,10 ⇒ 80 G (s'applique aux 6 éléments). |
| `bonusCelerite/bonusFortune` | **12 G/pt** | *Ajout* : assimilés à 1 % de stat dérivée. |
| `bonusGoldMult` | **1500 G/+1,0** | *Ajout* : économique pur ; 0,20 ⇒ 300 (cf. `reliquaire_lunaire`). |
| `fearImmune` | **200 G** | *Ajout* : utilitaire fort (anti-Peur de groupe). |
| **Malus** (bonus négatif) | même poids, **soustrait** | Les trade-offs (`masque_courage`, `lame_sanguinaire`…) voient leur budget réduit du malus. |

> ⚠️ **Non capturé par le budget** (utilitaire pur, à juger à la main) : `broom`
> (fuite garantie, budget 0 / prix 200), « révèle l'ennemi » (`grimoire_*`),
> `noCounter`, set bonuses (`setKey`). Ces effets sont signalés au cas par cas.

### 1.3 Limite méthodologique — items à malus

Les items trade-off ont un budget **artificiellement bas** (le malus se
soustrait), ce qui **gonfle leur ratio prix/valeur**. Exemple : `anneau_furie`
(crit +12 % / esquive −6 %) → budget 72, ratio 4,17×. Ce n'est pas une
sur-évaluation réelle : le malus *est* le prix payé en stat. Lire ces lignes
comme « la valeur offensive nette est élevée pour le prix », pas « trop cher ».

---

## 2. Confrontation : la formule §1.6 littérale ne tient pas pour les epic

Formule §1.6 : `prix ≈ powerBudget × rarityMult × actMult`, avec
`rarityMult = {common 1,0 · uncommon 1,3 · rare 1,8 · epic 3,0 · legendary 5,0}`
et `actMult = {I 1,0 · II 1,4 · III 2,6 · Boucle 4,0}`.

Appliquée littéralement, elle donne un **prix théorique** comparé au prix réel.
Écart médian global = **−6 %** (le réel ≈ le théo)… **mais c'est une moyenne
trompeuse** : l'ajustement est excellent pour common/rare et catastrophique pour
epic.

| Bande | Écart réel vs théo §1.6 | Lecture |
|-------|-------------------------|---------|
| common (acte I) | **−14 % à +57 %**, médian ≈ +25 % | Bon, léger sur-prix volontaire (petits objets). |
| rare acte II | **−44 % à +66 %**, médian ≈ 0 % | **Excellent ajustement.** |
| rare acte III (ét.8-10) | **−22 % à +23 %**, médian ≈ 0 % | **Excellent** (gold-sinks Auror voulus). |
| **epic** (acte III) | **−46 % à −79 %** | **Échec** : la formule veut 2,5–5× le prix réel. |

**Diagnostic** : la rareté epic (×3,0) **double-compte**. Les epic portent déjà
de gros budgets (300–500 G de stats brutes) ; les multiplier par 3,0 × 2,6 = 7,8
donne des prix de 2 500–4 000 G alors que le design les vend 1 000–1 300 G. La
conséquence concrète : **les epic sont, par budget, MOINS chers que les rares du
même acte** (epic ratio médian ≈ 3,1× ; rare-acteIII ratio médian ≈ 4,5×). C'est
contre-intuitif mais **volontairement sain** : un epic est un gros achat absolu
mais un bon rapport stat/or.

### 2.1 Formule corrigée proposée (référence documentaire)

Pour que la table de §1.6 **décrive** réellement le catalogue, remplacer le
double produit par un **acte dominant + prime de rareté douce** :

```
prix ≈ powerBudget × actMult' × rarityPremium'
actMult'       : I 1,2 · II 2,0 · III 4,0 · Boucle 6,0
rarityPremium' : common 1,0 · uncommon 1,1 · rare 1,25 · epic 1,4 · legendary (non vendable)
```

Vérification (médianes catalogue) :

| Bande | Ratio catalogue | Ratio formule corrigée | Δ |
|-------|-----------------|------------------------|---|
| common acte I | ~1,2× | 1,2 × 1,0 = **1,2×** | ✓ |
| rare acte II | ~2,1× | 2,0 × 1,25 = **2,5×** | léger + |
| rare acte III | ~4,5× | 4,0 × 1,25 = **5,0×** | léger + |
| epic acte III | ~3,1× | 4,0 × 1,4 = **5,6×** | + (epic restent sous la courbe : OK, ce sont des achats-trophées) |

La formule corrigée **ne fait plus exploser les epic** et reste un guide « bande »
plutôt qu'un prix exact. Elle confirme que **les epic sont délibérément vendus
sous leur prix théorique** (rapport stat/or favorable une fois l'achat consenti).

> 📌 Tous les seuils (`actMult'`, `rarityPremium'`) sont **à confirmer par
> `tools/sim-difficulty.js`** avant tout usage prescriptif.

---

## 3. Table comparée (extrait — vendables triés par écart vs théo §1.6)

Sortie intégrale : `node tools/analyze_artifact_balance.js`. `bud` = powerBudget,
`r` = prix/bud, `éc` = écart vs théo §1.6 littéral.

```
id                       rareté    slot    ét.  acte bud   prix   théo   écart   r
pendentif_ombre          epic      amulet  ?    III  132   6000   1030   +483%   45,5×   ← SINK voulu
anneau_furie             rare      ring    5    II   72    300    181    +66%    4,2×    ← malus (budget biaisé)
anneau_argent            common    ring    2    I    70    110    70     +57%    1,6×
orbe_flamme/givre        uncommon  trinket 4    II   80    220    146    +51%    2,8×
talisman_tactique        rare      trinket 6    II   105   380    265    +43%    3,6×
reliquaire_lunaire       legend.   trinket ?    Bcl  300   8000   6000   +33%    26,7×   ← SINK voulu
bottes_silence           epic      feet    6    II   95    520    399    +30%    5,5×
…                        rare/cmn  …       …    …    …     …      …      ~0%     ~2-5×   (bon ajustement)
chapeau_pointu           rare      head    4    II   175   200    441    −55%    1,1×    ← sous-évalué
gantelets_aurors         epic      hands   10   III  307   1000   2395   −58%    3,3×    (epic, normal)
baton_ancestral          epic      wand    9    III  505   1300   3939   −67%    2,6×    (epic, normal)
amulette                 epic      amulet  3    I    395   250    1185   −79%    0,6×    ← très sous-évalué
cape_invis               epic      cloak   7    III  335   550    2613   −79%    1,6×    ← sous-évalué (déjà ↑400→550)
```

Statistiques globales (52 vendables) : ratio prix/valeur **médian 2,50×**,
moyen 3,98× (tiré par les 2 sinks), min 0,63× (`amulette`), max 45,45×
(`pendentif_ombre`). Écart médian vs théo §1.6 **−6 %**.

---

## 4. Incohérences priorisées

### P1 — Bug : ID dupliqué `codex_rowena`
`js/data.js:654` (legendary Tier-5, MAG+10 INT+3) **et** `js/data.js:875` (epic
signature Serdaigle, INT+4 MAG+2) partagent `id:"codex_rowena"`. Tout
`ITEMS.find(i=>i.id==='codex_rowena')` renvoie **le legendary** → la récompense
signature epic est shadowée (lookup, Codex `{type:'item',value:'codex_rowena'}`,
remise `pendingHouseRewards`). **Correctif** : renommer la récompense signature
(ex. `codex_rowena_signature`) et mettre à jour ses références (quête signature,
Codex). *Hors scope de cette étude (pas de modif data.js) — à traiter en passe
d'implémentation.*

### P2 — Palier `uncommon` sous-peuplé
3 uncommons seulement (trinket ×2 + wand). Slots head/body/hands/feet/cloak/
amulet/ring/belt = **0 uncommon**. Le « gap ét.3-5 » de §1.6 n'est comblé que
sur 2 slots. → §6.6.

### P3 — Inéquité de puissance des 4 Premium de Maison
Budgets : Serd 685, Pouf 510, Slyth 492, **Gryff 252**. Même canal d'obtention
(remise signature), puissance du simple au triple. → §6.3.

### P4 — Sous-évaluations isolées (valeur utilitaire/early non capturée)
- `amulette` (epic, ét.3, MAG+4 LCK+3 + Reparo) : ratio **0,63×**, le seul item
  vendu **sous** sa valeur de stat brute. Epic d'amorçage très généreux. *Choix
  de design assumé possible* (premier epic accessible) ; sinon léger relèvement.
- `cape_invis` (epic, AGI+5 LCK+5, esquive) : 1,64× — déjà relevé 400→550 par
  l'audit éco ; reste sous la bande epic.
- `wand2` (rare, ATK+5 MAG+3 crit) : 0,95× — souvent loot ; prix bas cohérent.

### P5 — Items à malus : ratios trompeurs (pas une anomalie)
`anneau_furie`, `masque_courage`, `lame_sanguinaire`, `armure_lourde` ont des
ratios élevés **par construction** (malus soustrait du budget). RAS — le
trade-off est intentionnel.

### P6 — Sinks à très haut ratio : intentionnels
`pendentif_ombre` (45×) et `reliquaire_lunaire` (27×) sont des gold-sinks
endgame validés (`game-economy-gold-audit.md` §1.6 : « laissés tels quels »).
**Ne pas baisser.**

---

## 5. Cohérence transverse

### 5.1 Progression par acte ✅
Les budgets croissent globalement par acte (common acte I : 55–140 ; rare
acte II : 105–185 ; rare acte III : 130–250 ; epic : 130–505) et les prix
suivent (ratio acteII ≈ 2,1× → acteIII ≈ 4,5×). La marche prix ét.7→10 est la
**barrière-trophée voulue** (audit éco §6). Pas de courbe cassée.

### 5.2 Parité entre slots concurrents ⚠️ mineure
`node tools/analyze_artifact_balance.js --by-slot`. Constats :
- **trinket** : slot le plus dense (21 entrées) — concentre orbes, grimoires,
  reliques vocales, sinks. Risque de sur-choix mais pas de dominant strict.
- **belt** : slot le plus pauvre (3 vendables, tous rare/common, budgets 70–164).
  Aucun epic belt. Peu attractif en endgame.
- **feet** : pas d'epic vendable hormis `bottes_silence` (ét.6) ; `bottes_dragon`
  (ét.7, rare) sous-évaluée (1,88×) vs autres rares acteIII (~4,5×).

### 5.3 Équité entre Maisons ⚠️
**Affinités mid-game** (`houseAffinity`) : Gryff 3 (orbe_flamme, gantelets_combat,
masque_courage) · Serd 3 (cristal, baton_apprenti, grimoire_flottant) · Slyth 2
(orbe_givre, cape_funambule) · **Pouf 1** (talisman_blaireau). Poufsouffle
sous-doté en slots-faveur shop.

**Reliques légendaires de Maison** : 1 par Maison (équilibré, budgets 210–525,
Gryffondor `lame_godric` 525 le plus haut — cohérent ATK).

**Premium** : déséquilibre majeur (P3 / §6.3).

**Reliques vocales** : voix_helga 220 · godric 210 · salazar 200 · **rowena 140**.
Rowena (INT+4 + spCost) est nettement plus faible (INT est secondaire ; via D1
INT+4 ≈ MAG+1). Léger sous-budget.

### 5.4 Absence de dominant strict ✅
Aucun item ne domine *strictement* (≥ sur toutes stats, ≤ prix) un concurrent du
même slot. Les gros budgets (baton_ancestral 505, masque_rituel 351) sont gatés
acte III + prix élevé. Le seul quasi-dominant est `talisman_fondateurs` (epic,
MAG+4 DEF+4 régen, bud 400) face aux amulettes rares ét.5 (~180) — mais l'écart
de prix (1200 vs 320) et d'acte le justifie.

### 5.5 Sinks endgame ✅
3 niveaux de sink sains : `pendentif_ombre`/`reliquaire_lunaire` (prix fixe
élevé), `elixir_perma_*`/`pierre_ame`/`philtre_endurance` (`rarityScales` ×1,5ⁿ),
4 Premium Marchand d'Ombre (`basePrice:9000` `rarityScales` × `priceMultiplier
1,4` = 12 600 G premier achat). Anti-farm respecté.

### 5.6 Palier uncommon ❌ (cf. P2)
Bande définie (vert, 150–280 G) mais **3 items**. Besoin de ~5–8 uncommons
supplémentaires répartis sur head/body/feet/cloak/belt pour donner du sens à la
bande ét.3-5.

---

## 6. Recommandations chiffrées

> ⚠️ Toutes **à confirmer par `tools/sim-difficulty.js`** avant implémentation.
> **Aucune baisse de prix endgame.** Respect règle d'or (axe additif, scaling
> monstres intouché).

### 6.1 Adopter la formule corrigée §2.1 comme référence documentaire
Remplacer dans `artifacts-reliquary-system.md §1.6` le produit
`budget × rarityMult × actMult` (qui surévalue les epic ×2,5) par
`budget × actMult'(1,2/2,0/4,0/6,0) × rarityPremium'(1,0/1,1/1,25/1,4)`.
**Raison** : décrit le catalogue réel (±20 % sur les bandes saines) sans
double-compter la rareté. *Documentaire, zéro impact runtime.*

### 6.2 Corriger le bug `codex_rowena` (P1)
Renommer la récompense signature epic en `codex_rowena_signature` (ou fusionner
si le doublon est non intentionnel). **Raison** : item actuellement inatteignable
par `find()`. *Priorité haute, hors présente passe.*

### 6.3 Égaliser les 4 Premium de Maison (P3)
Rebaser sur des budgets comparables (cible ~480–560, médiane des 3 existants).
La Premium Gryffondor (`orbe_runique_premium_gryff`, bud 252) est l'aberrante.
Options (à confirmer sim) :

| Premium | Base actuelle | Budget | Proposition |
|---------|---------------|--------|-------------|
| Gryff `orbe_runique_premium_gryff` | orbe_runique (epic) | **252** | Rebaser sur `gantelets_aurors` (epic offensif, bud 307→×1,35≈415) **ou** `baton_ancestral` pour atteindre ~500. |
| Slyth `masque_rituel_premium_slyth` | masque_rituel | 492 | OK |
| Serd `baton_ancestral_premium_serd` | baton_ancestral | 685 | Le plus fort — éventuellement plafonner. |
| Pouf `talisman_fondateurs_premium_pouf` | talisman_fondateurs | 510 | OK |

**Raison** : même politique de récompense ⇒ même classe de puissance. *Non
vendables, donc aucun impact sur l'éco or.*

### 6.4 Renforcer légèrement la relique vocale de Rowena (§5.3)
`voix_rowena_relique` : passer `bonusInt:4 spCostReduction:1` → ajouter
`bonusMag:2` (budget 140→210, aligné sur les 3 autres voix). **Raison** : parité
des 4 reliques du Chœur. *Non vendable.*

### 6.5 Repricer 2-3 sous-évaluées (hausses uniquement)
| Item | Prix actuel | Proposition | Raison |
|------|-------------|-------------|--------|
| `chapeau_pointu` | 200 | **300** | rare acte II, ratio 1,1× vs bande ~2,5× ; budget 175 sous-payé. |
| `bottes_dragon` | 340 | **600** | rare acte III (ét.7), ratio 1,9× vs bande ~4,5×. |
| `amulette` | 250 | **(au choix)** 400 | epic ét.3 à 0,63× ; OU laisser comme « epic d'amorçage » assumé. |

**Raison** : aligner sur la bande de leur (rareté × acte). *Aucune baisse.*

### 6.6 Étoffer le palier uncommon (P2 / §5.6)
Ajouter ~5 uncommons ét.3-5 sur les slots vides, 150–280 G, budget ~80–130 :
ex. head (`MAG+1 DEF+1` uncommon), body (`DEF+2` uncommon ét.3), feet
(`AGI+2` uncommon), cloak (`DEF+1 AGI+1`), belt (`DEF+1 LCK+1`). **Raison** :
donner corps à la bande verte et lisser la transition common→rare. *Contenu neuf,
plan séparé.*

### 6.7 Enrichir le slot `belt` endgame (§5.2)
Aucun belt epic. Ajouter 1 belt epic acte III (ex. `ceinture_aurors`, DEF+3 END+3
crit+4 %, ~900 G) pour la parité de slot. *Contenu neuf, optionnel.*

---

## 7. Questions ouvertes (arbitrage humain)

1. **`amulette` (epic ét.3, ratio 0,63×)** : sous-évaluation à corriger, ou
   « premier epic généreux » volontaire (rampe de progression) ? *Reco par
   défaut : laisser — c'est une bonne rampe early, et la relever pénaliserait
   le early game.*
2. **Premium Gryffondor (§6.3)** : rebaser sur quelle epic (gantelets offensifs
   pour coller au fantasme Gryffondor, ou autre) ? Impacte la fiction.
3. **Doublon `codex_rowena`** : renommage simple, ou les deux items doivent-ils
   fusionner (un seul Codex de Rowena, legendary) ? Dépend de l'intention
   narrative (Tier-5 vs signature).
4. **Formule corrigée §2.1** : l'adopter dans §1.6 (purement descriptif), ou
   garder la formule actuelle comme cible aspirationnelle et reclasser les epic
   comme « volontairement sous la courbe » ? *Reco : adopter la corrigée, plus
   honnête.*
5. **Palier uncommon (§6.6)** : combler par du contenu neuf, ou rétrograder
   quelques rares faibles (`chapeau_apprenti`-like) en uncommon ? *Reco : contenu
   neuf — ne pas dévaluer l'existant.*
6. **Calibration sim** : tous les chiffres ci-dessus sont des cibles « bande ».
   Lancer `tools/sim-difficulty.js` (`--stat-rework`, `--endgame`) pour valider
   qu'aucune reco ne franchit le seuil « kit complet » de Ch.13 avant de figer.

> Aucune modification de `js/data.js` n'a été faite. Ce document est l'unique
> livrable de la passe ; l'implémentation des recommandations est conditionnée à
> l'arbitrage des §7 et à la validation par simulation.

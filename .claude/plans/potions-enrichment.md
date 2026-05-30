# Plan — Revue & enrichissement du système de Potions / Brassage

> Plan vivant (cf. `.claude/guidelines.md` §5). Ouvert le 2026-05-30.
> Étend le design d'origine archivé :
> [`.claude/plans/_archive/farming-potion-system.md`](./_archive/farming-potion-system.md).
> Fait suite à C.5 (« Brassage maison », PR #302) et à la demande utilisateur
> de faire **monter le bonus de brassage avec la maîtrise**.
> Fichiers cœur : `js/potions.js`, `js/data.js` (`POTION_RECIPES`, herbes,
> potions), `js/inventory.js` (`_applyConsumableEffect`), `js/inventory-core.js`
> (`tryAddItem`), `js/quests-templates.js` (déblocage Slughorn).

---

## 1. État actuel (audit 2026-05-30)

### 1.1 Données

**Herbes** (`data.js`, `type:"herb"`, routées vers `player.herbs`) :
| Palier | Herbes | Prix |
|--------|--------|------|
| 1 | Armoise, Ortie séchée | 6 |
| 2 | Asphodèle, Branchiflore | 12 |
| 3 | Aconit, Dictame | 20 |
+ `mandragore` (matériau de quête) utilisé comme ingrédient.

**Recettes** (`POTION_RECIPES`, 6) — **toutes soin/mana** :
| Recette | Produit | Effet | Diff. | Déblocage |
|---------|---------|-------|-------|-----------|
| brew_potion_s | potion_s | +15 PV | 8 | Quête Slughorn 1 |
| brew_potion_m | potion_m | +12 PM | 8 | Quête Slughorn 1 |
| brew_potion_l | potion_l | +40 PV | 12 | Quête Slughorn 2 |
| brew_potion_l_sp | potion_l_sp | +30 PM | 12 | Quête Slughorn 2 |
| brew_potion_force | potion_force | « +8 ATK 3 t » (⚠️ bug) | 14 | Expérimentation |
| brew_potion_xl | potion_xl | 100 % PV | 18 | Expérimentation |

**Mécanique de jet** (`potions.js`) : `margin = meilleurINT_groupe + d20(1..20) − difficulty`.
`margin < 0` → échec (0 potion) ; `0 ≤ margin < 12` → réussite (1) ; `margin ≥ 12`
→ **critique (2 potions)**. Herbes **toujours consommées**.

**Bonus C.5 actuel** : une potion brassée porte `brewed:true` → `+25 %` **fixe**
sur les effets chiffrés (`heal`/`restore_sp`/`both`), appliqué dans
`_applyConsumableEffect`.

### 1.2 Constats — bugs & incohérences

1. **`potion_force` cassée** : `effect:"heal", power:8` alors que la description
   annonce « +8 ATK pendant 3 tours ». Il n'existe **aucun** effet de buff de
   stat temporaire dans `_applyConsumableEffect` → la potion soigne juste 8 PV.
   Nom + lore promettent un buff inexistant.
2. **`potion_xl_sp` orpheline** : l'item « Élixir d'Esprit Suprême »
   (`restore_sp_full`, 100 % PM) existe mais **aucune recette** ne le produit
   (asymétrie avec `potion_xl`).
3. **3 potions utilitaires sans recette** : `elixir_antidote` (`cure`),
   `elixir_regen` (`regen_buff`), `potion_bouclier` (`shield_buff`) existent en
   items **et** sont gérées par `_applyConsumableEffect`, mais **rien ne les
   brasse**. Gisement d'enrichissement à coût quasi nul.
4. **Brassage critique = quantité seulement** : un crit donne 2 potions
   identiques, sans différence de **qualité** — peu gratifiant pour un grand jet.
5. **Catalogue mono-thématique** : 100 % soin/mana. Le moteur supporte déjà
   `cure`/`regen_buff`/`shield_buff` (jamais brassés) et pourrait porter des
   buffs de combat (jamais implémentés).

### 1.3 Ce que le moteur sait DÉJÀ faire (à exploiter)

`_applyConsumableEffect` gère : `heal`, `restore_sp`, `heal_full`,
`restore_sp_full`, `both`, `cure`, `regen_buff`, `shield_buff`, `perma_*`,
`stat_boost`, `auto_revive`. Le système de **statuts de combat** (`applyStatus`,
`regen`, `shield`/`shieldTurns`) est réutilisable pour des buffs temporaires.

---

## 2. Objectifs d'enrichissement

1. **Corriger** les incohérences (potion_force, recettes manquantes).
2. **Récompenser la maîtrise** : le bonus de brassage monte avec la **qualité
   du jet** (réussite vs critique) et/ou l'**INT** du brasseur — l'idée validée
   par l'utilisateur.
3. **Élargir le catalogue** vers l'utilitaire et le buff de combat, en
   réutilisant au maximum l'existant.
4. **Lisibilité** : rendre la progression des recettes et la découverte plus
   gratifiantes.

Le tout **incrémental et livrable par lot**, chaque lot vert au smoke avant le
suivant.

---

## 3. Lots d'enrichissement

### LOT P0 — Correctifs & cohérence (quick wins) · ~0,5 j · risque faible

- **P0.1** Ajouter les **recettes des 3 potions utilitaires existantes** :
  `brew_elixir_antidote` (cure), `brew_elixir_regen` (regen_buff),
  `brew_potion_bouclier` (shield_buff). Items + effets déjà en place → **uniquement
  des entrées `POTION_RECIPES`** + un ingrédient cohérent (ex. dictame pour
  l'antidote). Découvrables par expérimentation ou via une 3ᵉ quête Slughorn.
- **P0.2** Ajouter `brew_potion_xl_sp` (symétrie avec `potion_xl`).
- **P0.3** Résoudre `potion_force` (⚠️ **décision** §6) : soit corriger la desc
  en « +8 PV » (trivial), soit — préférable — l'inclure dans LOT P2 comme vraie
  potion de buff ATK temporaire.
- *Vérif* : smoke — chaque nouvelle recette brassée produit l'item attendu ;
  l'antidote brassé purge un statut DoT ; le bouclier brassé pose `shieldTurns`.

### LOT P1 — Brassage à maîtrise (idée validée) · ~1 j · risque faible

Remplacer le `+25 %` fixe par une **potency variable bakée dans la potion** au
moment du brassage.

- **Design** : au lieu de `props:{ brewed:true }`, stocker
  `props:{ brewed:true, brewPotency:<float> }` calculé par `attemptBrew()`
  selon la **qualité du jet** (barème figé, décision §6.2) :
  - **ratée** (recette connue mais jet manqué, `margin < 0`) → **1 fiole
    diluée `−15 %`** au lieu de 0 potion aujourd'hui (le ratage *réduit*, il ne
    gâche plus tout) ;
  - **réussite** (`0 ≤ margin < 12`) → `+20 %` ;
  - **critique** (`margin ≥ 12`) → `+40 %` (le crit devient qualitatif, pas
    seulement ×2 quantité) ;
  - **bonus de maîtrise** : `+1 %` par point d'INT au-dessus de 15, le tout
    plafonné `[−15 %, +50 %]`.
  - Un mélange **sans recette** (charabia) reste 0 potion (inchangé).
- `_applyConsumableEffect` lit `item.brewPotency` (fallback : `brewed` legacy →
  `+25 %` ; pas de flag → 0). Potency **négative** = soin réduit. Compat totale.
- **Revente** : `_computeSellPrice` (shop.js) multiplie le prix par
  `(1 + brewPotency)` → une fiole concentrée se revend plus cher, une diluée
  moins (décision §6, exigence utilisateur).
- UI : tooltip + résultat de brassage affichent la potency réelle (« Concentrée
  +40 % » / « Fiole diluée −15 % »).

### LOT P2 — Potions de buff de combat (catalogue + moteur) · ~2 j · risque moyen

Introduire une **famille d'effet « buff temporaire »** (la pièce manquante).

- **Moteur** : nouvel effet `temp_buff` dans `_applyConsumableEffect` posant un
  statut de buff sur la cible pour `turns` tours (ATK/DEF/AGI/MAG selon
  `buffStat`), via une extension du système de statuts (`battle.js`). Décrémenté
  comme les autres statuts ; affiché dans la timeline/HUD de combat.
- **Items + recettes** : « Potion de Force » (ATK, **répare P0.3**), « Potion de
  Défense » (DEF), « Élixir de Célérité » (AGI/esquive), etc.
- **Décision** §6 : ampleur du buff, durée, cumul avec Garde/Protego.
- *Vérif* : smoke — boire une potion de Force pose le statut, ATK augmenté N
  tours puis restauré ; pas de stacking abusif.

> **Décisions P2 (figées 2026-05-30, ajustées à l'état réel)** : le moteur
> `temp_buff` ne gère **aujourd'hui que `buffStat:'atk'`** (hardcodé `buff_atk`).
> **Généraliser** à 5 stats : ATK (existant) + DEF, AGI, LCK, MAG.
> - **Statuts** : `buff_def`, `buff_agi`, `buff_lck`, `buff_mag` (miroir de
>   `buff_atk`). `_applyConsumableEffect` mute la stat de base à la pose ;
>   `tickStatuses` la restaure à l'expiry ; `recalculateStats` **réapplique
>   tous** les `buff_*` actifs (source unique de vérité) — important car AGI/LCK
>   pilotent des stats **dérivées** (dodge, crit) recalculées.
> - **Approche retenue** : faire de `recalculateStats` le réapplicateur unique
>   (boucle générique sur `buff_<stat>`), et déclencher un recalc après la pose
>   d'un buff AGI/LCK/MAG (pour rafraîchir dodge/crit). Le buff ATK/DEF reste
>   correct sans recalc mais bénéficie de la même boucle.
> - **4 nouveaux items + recettes** : Potion de Défense (+DEF), Élixir de
>   Célérité (+AGI), Potion de Précision (+LCK), Élixir de Puissance (+MAG).
>   Ampleur alignée sur la Force (+8 base, profite du brassage), durée 3 tours.
> - **Icônes PNG** (règle pipeline) : 4 fioles teintées par stat.
> - **Pas de cumul abusif** : `applyStatus` refresh la durée (non empilable),
>   déjà garanti.


### LOT P3 — Codex des recettes & découverte · ~1 j · risque faible

- Onglet/section « Recettes » dans la modale chaudron : **découvertes** (lisibles)
  vs **à découvrir** (silhouette + indice de palier/herbe, sans tout révéler).
- Feedback de découverte enrichi (déjà amorcé : `_brewResult.discover`).
- *Vérif* : smoke — le codex liste N découvertes et M masquées ; une découverte
  bascule de masquée à révélée.

### LOT P4 — Chaîne d'amélioration des potions (upgrade-craft) · ~1,5 j · risque moyen

> Demande utilisateur (2026-05-30) : potions de soin à paliers, craftées en
> combinant la potion de rang inférieur **+ une ressource**. Décisions figées
> ci-dessous (réponses utilisateur).

**Concept** : *upgrade-craft* = une recette `POTION_RECIPES` dont un ingrédient
est **une potion** (item de sac), pas seulement des herbes. Le moteur du chaudron
canalise déjà tout via `_ingredientCount`/`_consumeIngredient` (précédent
`mandragore`) → **généraliser** : `type:"herb"` → besace, sinon → inventaire.

**P4.1 — Généralisation des ingrédients de sac**
- `_ingredientCount(id)` / `_consumeIngredient(id,n)` : si l'item `ITEMS[id]`
  n'est pas `type:"herb"`, compter/consommer depuis `player.inventory` (au lieu
  du hardcode `mandragore`). La besace reste la source des herbes.
- UI chaudron : surfacer les **ingrédients de sac** éligibles (potions de rang
  inférieur + Éclat) dans une mini-section dédiée sous la besace.

**P4.2 — Nouvelle chaîne de soin (3 items dédiés)**
- `potion_soin_mineure` (~15 PV), `potion_soin_mineure_plus` (~30 PV),
  `potion_soin_mineure_pp` (~55 PV). Items `effect:"heal"`.
- Recettes : Mineure = herbes ; Mineure+ = **Mineure + Éclat** ;
  Mineure++ = **Mineure+ + Éclat ×2**.

**P4.3 — Upgrades des potions existantes (soin & magie)**
- `brew_up_potion_l`   : `potion_s`  + Éclat       → `potion_l`
- `brew_up_potion_l_sp`: `potion_m`  + Éclat       → `potion_l_sp`
- `brew_up_potion_xl`  : `potion_l`  + Éclat ×2     → `potion_xl`
- `brew_up_potion_xl_sp`:`potion_l_sp`+ Éclat ×2     → `potion_xl_sp`
  (réutilise les items résultats existants, aucun nouvel item de résultat hors
  la chaîne Mineure).

**P4.4 — Nouvelle ressource « Éclat de Vitalité »**
- Item `eclat_vitalite` (`type:"material"`, gemme rouge-vie). Source : drop de
  coffre + boutique (étage ≥ 3). **Icône PNG** via `icon_factory.py`
  (`gem-octahedron.svg`, teinte rouge-vie) → 5 PNG + `ITEM_ICON_NEW_REGISTRY`.

**P4.5 — Déblocage** : recettes Mineure découvrables librement ; upgrades
pré-enseignées par la 3ᵉ quête Slughorn (réutilise `reward.recipes`) OU
découvrables (cohérent avec « pas de verrou » §6bis). Décision : **découvrables
+ Mineure offerte par la quête 1** pour l'amorçage.

- *Vérif* : smoke — `potion_s + eclat_vitalite` matche `brew_up_potion_l` et
  produit `potion_l` (potency appliquée) ; la chaîne Mineure→+→++ se brasse ;
  `_ingredientCount` lit bien une potion depuis le sac ; pas de collision
  d'ingrédients.

### LOT P5 — Économie des herbes (sources fiabilisées) · ✅ LIVRÉ 2026-05-30

> Décisions utilisateur (2026-05-30) : enrichir les 3 sources — **boutique
> (herboriste)** + **cueillette (Fouiller)** + **drops monstres**.

**Audit de l'existant** : la cueillette (searchRoom, ~20 % par fouille, herbe du
palier de l'étage) et les drops (~9 monstres botaniques) **fonctionnent déjà**.
Le **trou** était la **boutique** : `_purchase()` poussait tout dans
`player.inventory` (sac 16) — il **bypassait** le routage herbe→besace de
`tryAddItem`. Une herbe achetée (déjà vendue par l'Apothicaire Ténébreux !)
tombait à tort dans le sac, **invisible au brassage** (qui lit `player.herbs`).

- [x] **P5.1 — Fix routage boutique (bloquant)** · `shop.js — _purchase()` :
  `type:"herb"` → `addHerb(id, 1)` (besace) au lieu de `inventory.push`. Le
  garde « sac plein » est sauté pour les herbes, et l'herbe **ne quitte pas le
  stock** (ré-achat libre — besace illimitée, source fiable).
- [x] **P5.2 — Herbes au catalogue** · 6 herbes ajoutées à `SHOP_CATALOG` :
  T1 (armoise/ortie) étage ≥ 1, T2 (asphodèle/branchiflore) ≥ 4,
  T3 (aconit/dictame) ≥ 7. Prix = `item.price` (6/12/20).
- [x] **P5.3 — Cueillette améliorée** · `movement-interactions.js — searchRoom` :
  récolte **double** (×2) sur jet chanceux (25 %), sinon 1. Narratif dédié.
- [x] **P5.4 — Drops équilibrés** · audit : chaque tier avait déjà une source de
  drop sauf **dictame** (T3) dont l'unique source (Loup-Garou Enragé @0.10)
  plafonne à l'étage 9. Ajout d'un drop dictame @0.12 au **Loup-Garou Adulte**
  [8+] — tie-in canon (« le Dictame guérit les morsures lycanthropes »).

- [x] *Vérif* : `scenarioHerbEconomy` (smoke) — achat herbe → besace (pas sac),
  achat possible sac plein, herbe ré-achetable (stock conservé), catalogue
  filtré par palier, cueillette double (2) vs simple (1). Suite complète :
  **133/133 verts**.

### LOT P6 — Ancrage & idées longues (backlog) · effort variable

- Ancrage narratif : herbe **rare endgame**, lien Maison/Slughorn, jardin
  d'herbes (récolte passive).
- **Potions offensives jetables** en combat (flacon de feu/poison lancé) —
  **gros scope** (touche la boucle de combat), à flag et à cadrer séparément.
- Codex de recettes dans la modale chaudron (P3 original, reporté).

---

## 4. Ordonnancement proposé

```
P0 (correctifs) ─→ P1 (maîtrise, idée validée) ─→ P2 (buffs de combat)
                                                    ↘ P3 (codex)  ↘ P4 (backlog)
```
**Première vague** = **P0 + P1** (faible risque, répare + livre l'idée
demandée). **Deuxième vague** = P2 (plus de moteur). P3/P4 = backlog.

| Lot | Effort | Risque | Dépend de |
|-----|--------|--------|-----------|
| P0 correctifs | ~0,5 j | faible | — |
| P1 maîtrise | ~1 j | faible | C.5 (livré) |
| P2 buffs combat | ~2 j | moyen | P0.3 |
| P3 codex | ~1 j | faible | — |
| P4 backlog | variable | moyen/élevé | — |

---

## 5. Contraintes transverses

- **Compat saves** : tout nouveau champ (`brewPotency`, statut de buff) voyage
  avec l'item/le combattant ; jamais de migration destructive — fallback
  systématique pour les anciens saves.
- **Tests** : chaque lot ajoute/étend `scenarioBrewing` (ou un scénario dédié) ;
  suite complète + `pwa-smoke` verts avant merge.
- **PWA** : bump des fichiers touchés (`potions.js`, `data.js`, `inventory.js`,
  `inventory-core.js`, `style.css` le cas échéant) + `CACHE_VERSION`.
- **Équilibrage** : la potency brassée ne doit pas trivialiser le combat —
  garder le brassage *gratifiant* sans rendre l'achat inutile (les potions de
  boutique restent une option d'appoint sans setup).

---

## 6. Décisions (figées 2026-05-30)

1. ✅ **`potion_force`** → (b) **vraie potion de buff ATK** : **+8 ATK pendant
   3 tours** (miroir positif de `weaken`/`disarm` : stat mutée à la pose,
   restaurée à l'expiry dans `tickStatuses`).
2. ✅ **Barème P1** → ratée **−15 %** · réussite **+20 %** · critique **+40 %** ;
   bonus INT `+1 %`/pt au-delà de 15 ; plafond `[−15 %, +50 %]`. Le **ratage
   produit une fiole diluée** (au lieu de 0). La **potency influe sur la
   revente**. *(livré PR 1)*
3. ✅ **Potion de bouclier abandonnée** → remplacée par une **Potion de
   Résistance** : **réduction générale** des dégâts subis de X % pendant N tours
   (décision : générale d'abord, fiable ; variantes élémentaires plus tard si
   les dégâts ennemis deviennent typés).
4. ✅ **Déblocage mixte** : antidote (`cure`) + régénération (`regen_buff`)
   découvrables par **expérimentation** ; Potion de Force, Potion de Résistance
   et `potion_xl_sp` via une **3ᵉ quête Slughorn** (recettes enseignées).
5. ✅ **Découpage** : **PR 1 = P1** (livré). **PR 2 = moteur buff + potion_force**.
   **PR 3 = résistance + recettes utilitaires + quête de déblocage**.

---

## 7. Hors-scope (cette revue)

- Refonte de la besace/UI d'inventaire au-delà du chaudron.
- Potions offensives jetables (déplacé en P4 backlog, scope combat).
- Lien avec les Mondes Parallèles / économie outremonde (système séparé).

---

## 6bis. Décisions PR 3 (figées 2026-05-30, ajustées à l'état réel du code)

> Audit pré-implémentation : `elixir_antidote`/`elixir_regen`/`potion_bouclier`
> **existaient déjà** (items achetables) ; `brew_potion_force` **existait déjà** ;
> le brassage **n'a aucun verrou** (toute recette est découvrable). Les décisions
> §6.3/§6.4 sont donc ajustées :

1. ✅ **Bouclier → Résistance (remplacement)** : `potion_bouclier` (Protego total)
   est **supprimée** (item + effet `shield_buff` + réf. shop/icônes/smoke) et
   remplacée par **`potion_resistance`** : statut non-DoT `resist_buff` qui réduit
   **tous** les dégâts subis de **40 % pendant 3 tours**. Hook : helper
   `_resistMult(target)` (battle.js) appliqué aux 4 sites de dégâts héros
   (`_enemyPhysicalHit` ×2, ability `damage`, ability `drain`).
2. ✅ **Pas de verrou de recette** : la 3ᵉ quête Slughorn **pré-enseigne** les
   recettes avancées en récompense (`reward.recipes`), comme les quêtes 1 & 2.
   Tout reste découvrable par expérimentation — aucun nouveau mécanisme.
3. ✅ **Recettes ajoutées** (`POTION_RECIPES`) : `brew_elixir_antidote`,
   `brew_elixir_regen` (combos d'herbes existantes, découvrables librement),
   `brew_potion_resistance`, `brew_potion_xl_sp` (avancées, pré-enseignées par
   la quête 3).
4. ✅ **3ᵉ quête Slughorn** `quest_potions_slughorn_3` (prereq quête 2) :
   récompense `recipes:[brew_potion_force, brew_potion_resistance,
   brew_potion_xl_sp]` + antidote/régén déjà libres. PNJ : ajout à
   `questsGiven/TurnedIn` + dialogue dédié.
5. ✅ **Icône PNG** (règle CLAUDE.md pipeline d'icônes) : `potion_resistance`
   reçoit une recette `icon_factory.py` (silhouette `flask.svg`, matériau verre,
   teinte défensive bleu-acier) → 5 PNG `img/icons_new/` + entrée
   `ITEM_ICON_NEW_REGISTRY`. Les recettes ré-emploient les items existants
   (antidote/régén/xl_sp gardent leurs icônes actuelles).

---

## 8. Journal

| Date | Note |
|------|------|
| 2026-05-30 | Plan rédigé après audit. Constats : potion_force buggée, potion_xl_sp & 3 potions utilitaires sans recette, crit purement quantitatif. Lots P0→P4 cadrés ; première vague P0+P1 (dont l'idée « brassage à maîtrise » validée). Décisions §6 en attente. |
| 2026-05-30 | Décisions §6 figées. **P1 livré** (PR 1) : potency bakée (`brewPotency`) ratée −15 % / réussite +20 % / critique +40 % + maîtrise INT (plafond [−15 %, +50 %]) ; ratage produit une fiole diluée (au lieu de 0) ; revente indexée sur la potency (`_computeSellPrice`). Smoke T8/T9 + 126/126 + pwa v28. **Reste PR 2 = P0** (recettes manquantes + `potion_force` buff via moteur `temp_buff`). |
| 2026-05-30 | **PR 2 livré** : moteur de buff temporaire (`STATUS_DEFS.buff_atk` + expiry dans `tickStatuses` + réapplication dans `recalculateStats`) ; `potion_force` → `effect:"temp_buff"` +8 ATK/3 tours (profite du brassage). Smoke `scenarioPotionBuff` T1-T5 + suite 127/127 + pwa v29. Reste PR 3 = Potion de Résistance + recettes utilitaires + quête Slughorn. |
| 2026-05-30 | **PR 3 livré** : Potion de Résistance (statut `resist_buff`, −40 %/3t via `_resistMult` aux 4 sites de dégâts héros) **remplace** `potion_bouclier` (supprimée : item/effet/shop/icône) ; 4 recettes ajoutées (`brew_elixir_antidote`/`_regen`/`brew_potion_resistance`/`brew_potion_xl_sp`) — 10 recettes au total, sans collision d'ingrédients ; 3ᵉ quête Slughorn `quest_potions_slughorn_3` (kill 3 Bundimuns → pré-enseigne Force/Résistance/Esprit Suprême) ; **icône PNG painterly** `potion_resistance` (icon_factory.py + ITEM_ICON_NEW_REGISTRY). Smoke `scenarioPotionResistance` T1-T4 + suite 129/129 + pwa v30. **Première vague potions close.** |
| 2026-05-30 | **PR 4 livré** : chaîne d'amélioration des potions (upgrade-craft). Généralisation `_ingredientCount`/`_consumeIngredient` (herbe→besace, sinon→sac via `_isHerbIngredient`) ; chaîne de soin `potion_soin_mineure`/`_plus`/`_pp` (15/30/55 PV) ; ressource `eclat_vitalite` (material, shop ét.3+ & drop coffre 25%) ; 7 recettes (chaîne + 4 upgrades `brew_up_potion_l/l_sp/xl/xl_sp` — POTION_RECIPES 10→17, sans collision) ; quête Slughorn 1 offre la recette Mineure. **Fix latent** : branche `material` déplacée avant `type!=='consumable'` dans `useItem` (un matériau slotless tombait dans showEquipMenu→equipItem). 4 icônes PNG (icon_factory : flask niveaux croissants + gemme rouge-vie octaédrique). Smoke `scenarioPotionUpgradeCraft` T1-T6 + suite 130/130 + pwa v31. |
| 2026-05-30 | **PR P2 livré** : potions de buff de combat. Moteur `temp_buff` généralisé de l'ATK seul à 5 stats (`BUFF_STAT_BY_ID` : atk/def/agi/lck/mag) — `_applyConsumableEffect` mute la stat de base + recalc, `tickStatuses` restaure à l'expiry (boucle générique), `recalculateStats` réapplique tous les `buff_*` (source unique, AVANT les stats dérivées → dodge/crit tiennent compte des buffs AGI/LCK). 4 items (Défense+DEF / Célérité+AGI / Précision+LCK / Puissance+MAG, +8/3t) + 4 recettes (POTION_RECIPES 17→21, sans collision) + 4 icônes PNG (flacons teintés) + shop ét.3-4. Smoke `scenarioCombatBuffs` T1-T5 (dont AGI→dodge 9.8→13, LCK→crit 12.5→16.5) + suite 132/132 + pwa v32. |

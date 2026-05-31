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

#### P6.a — CODEX DE RECETTES (sous-lot prioritaire) · ~0,5 j · risque faible

> Audit 2026-05-30 (session codex). État réel confirmé :
> - `player.knownRecipes[]` (state.js:608) **existe déjà**, sérialisé en save ;
>   alimenté par quêtes (`reward.recipes` → `learnRecipe`) **et** par
>   l'expérimentation (`attemptBrew` découvre une recette inconnue brassée).
> - `POTION_RECIPES` = **21 recettes** (data.js:589).
> - La modale chaudron (`_renderBrewingModal`, potions.js:347 — section 5
>   « Recettes connues ») liste **uniquement les recettes connues**. Les
>   recettes non découvertes sont **invisibles** : aucun aperçu « X/21 à
>   trouver », pas de silhouette ni d'indice. C'est précisément le trou que
>   comble le codex.
> - Feedback de découverte déjà câblé (`_brewResult.discover`).

**Objectif** : transformer la section « Recettes connues » en un **Codex**
qui présente la **totalité** des 21 recettes — découvertes (lisibles, avec
« Préparer ») vs **à découvrir** (silhouette masquée + indice de palier /
nombre d'ingrédients, sans révéler le combo). En-tête avec compteur de
progression « Codex — X/21 découvertes ».

**Décisions retenues (cadrage validé avec l'utilisateur — à confirmer)** :
- **Modèle de découverte** : *silhouettes + indices* (préserve la boucle
  d'expérimentation, donne un objectif visible). PAS de révélation totale
  (qui rendrait l'expérimentation inutile).
- **Placement** : *section inline* dans la modale chaudron existante (la
  section 5 actuelle est étendue, pas de nouveau bouton ni sous-modale).
- **Indice révélé pour une recette masquée** : nom remplacé par une
  silhouette « ? ? ? », + un indice **non-spoiler** = palier d'herbes
  (tier max des ingrédients herbe, ou « avancée » pour les upgrade-crafts) +
  nombre d'ingrédients. **Ne révèle ni le combo exact ni le produit.**

**Étapes** :
1. **Helper indice** `_recipeHint(recipe)` (potions.js, pur) → renvoie
   `{ palier, ingCount, advanced }` calculé depuis `recipe.ingredients`
   (tier via `ITEMS[id].tier` ; `advanced=true` si un ingrédient n'est pas
   une herbe). → *vérif* : test unitaire dans le scénario smoke.
2. **Rendu codex** : remplacer la section 5 de `_renderBrewingModal` par un
   bloc unique listant **toutes** `POTION_RECIPES`. Connues → rendu actuel
   (nom + ingrédients + « Préparer »). Inconnues → ligne masquée
   (`.brew-recipe-locked` : icône 🔒/silhouette, nom « ? ? ? »,
   indice `_recipeHint`). En-tête « Codex — X/21 découvertes » + barre/compteur.
   → *vérif* : la modale liste 21 lignes ; X connues lisibles, 21−X masquées.
3. **CSS** : classe `.brew-recipe-locked` (opacité réduite, italique, pas de
   bouton). Réutilise au maximum `.brew-recipe-row`. → *vérif* : pas de
   régression visuelle des lignes connues.
4. **Scénario smoke dédié** `scenarioRecipeCodex` : (T1) le codex rend 21
   lignes total ; (T2) au déverrouillage, 2 connues (brew_potion_s/m) lisibles,
   le reste masqué ; (T3) `_recipeHint` correct pour une recette herbe (palier)
   vs une upgrade-craft (advanced) ; (T4) brasser une recette inconnue la fait
   basculer masquée→lisible (compteur X→X+1). → *vérif* : scénario vert.
5. **Smoke complet** `node tests/smoke.js` reste vert ; **bump PWA**
   (`potions.js?v=5` dans index.html + sw.js, `CACHE_VERSION` v33,
   `style.css?v=N` si touché). → *vérif* : suite verte + pwa-smoke.

**Hors-scope P6.a** (différé) : ancrage narratif des herbes, jardin passif,
potions offensives jetables — restent dans le backlog P6.

#### P6.b — ANCRAGE NARRATIF DES HERBES · sous-lots décomposés

> Audit 2026-05-30 (session ancrage). État réel de l'économie d'herbes :
> - **6 herbes**, 3 paliers (T1 ét.1+, T2 ét.4+, T3 ét.7+). `tier` max = 3.
> - **3 sources fiables** (livrées P5) : cueillette (`searchRoom`, ~20 %,
>   herbe du palier de l'étage + 25 % double), drops monstres botaniques,
>   boutille Apothicaire (`SHOP_CATALOG`, ré-achat libre, besace illimitée).
> - **Slughorn** (`npcs.js:212`, étage 2) : 3 quêtes (`quest_potions_slughorn`
>   1/2/3) qui déverrouillent le chaudron + pré-enseignent les recettes. Pas
>   de lien avec `chosenHouse` aujourd'hui (le « Slug Club » canon n'est pas
>   exploité).
> - **Endgame / Boucle Ténébreuse** (étages 11+) : matériaux dédiés
>   `essence_tenebres` (Forge) + `page_grimoire` (Bibliothèque). **Aucune
>   herbe endgame** : la cueillette plafonne à T3 dès l'étage 7, donc rien de
>   neuf à récolter en Boucle côté herboristerie.

Décomposition en 3 sous-lots indépendants, du plus sûr au plus novateur :

**P6.b1 — Herbe rare endgame (le plus sûr — données pures)**
- Nouvelle herbe **tier 4** (ex. « Asphodèle des Ténèbres » / herbe corrompue)
  qui ne pousse qu'en **Boucle Ténébreuse** (étages 11+). Sources : cueillette
  haut-étage (extension du palier dans `searchRoom`) + drop des variants
  `Ténébreux` / vendeur Apothicaire Ténébreux.
- **1 recette de prestige** la consommant (nouvel élixir endgame, ou upgrade
  d'un Élixir Suprême existant). Découvrable + éventuellement enseignée.
- **Icône PNG** via `icon_factory.py` (silhouette herbe, teinte ténèbres).
- *Vérif* : smoke — la 7ᵉ herbe existe (tier 4) ; la recette prestige matche ;
  cueillette T4 seulement à l'étage 11+ ; pas de régression du palier 1-3.

> **Décisions b1 (figées 2026-05-30, validées utilisateur)** : ancrage
> **Boucle Ténébreuse (11+)** · consommation = **upgrade des Élixirs Suprêmes
> existants** (réemploi des items résultats `potion_xl`/`potion_xl_sp`, aucun
> nouvel item de potion ni effet). **Icône = SVG inline** (les 6 herbes
> actuelles sont des SVG dans `ITEM_ICON_SVG_REGISTRY` — PAS le pipeline
> Python ; on suit ce patron).
>
> **Étapes** :
> 1. **Item herbe** `herbe_asphodele_noire` (Asphodèle des Ténèbres) dans
>    `data.js` : `type:"herb", tier:4, price:40`. → *vérif* : 7 herbes,
>    `_recipeHint`/cueillette voient tier 4.
> 2. **2 recettes de prestige** dans `POTION_RECIPES` (21→23), multisets
>    inédits (pas de collision) :
>    `brew_xl_tenebres` `{ herbe_asphodele_noire:2 }` diff 18 → `potion_xl` ;
>    `brew_xl_sp_tenebres` `{ herbe_asphodele_noire:3 }` diff 18 → `potion_xl_sp`.
>    Découvrables librement (cohérent §6bis « pas de verrou »). → *vérif* :
>    le combo matche la bonne recette ; produit l'élixir existant.
> 3. **Source cueillette** : `searchRoom` (movement-interactions.js) — ajouter
>    le palier `currentFloor >= 11 ? 4`. → *vérif* : tier 4 récolté seulement
>    à 11+ ; paliers 1-3 inchangés.
> 4. **Source drop** : ajouter `{ itemId:"herbe_asphodele_noire", chance:0.30 }`
>    aux drops de `heraut_tenebres` (boss epic, recycle en Boucle). → *vérif* :
>    drop présent.
> 5. **Source boutique** : ajouter l'herbe aux `wares` de l'Apothicaire
>    Ténébreux (`npcs.js`) à `price:40`. → *vérif* : achetable, routée besace.
> 6. **Icône SVG** : entrée `herbe_asphodele_noire` dans `ITEM_ICON_SVG_REGISTRY`
>    (asphodèle teinte ténèbres). → *vérif* : `getItemIconHtml` rend le SVG.
> 7. **Smoke** : scénario dédié `scenarioRareHerb` + **mise à jour des asserts
>    `POTION_RECIPES.length` 21→23** (scenarioBrewing T1, scenarioCombatBuffs,
>    scenarioPotionResistance, scenarioPotionUpgradeCraft T1). → *vérif* :
>    suite verte + pwa bump.

**P6.b2 — Lien Maison / Slughorn (« Slug Club »)**
- Slughorn reconnaît la Maison du joueur (`chosenHouse`) : dialogue dédié +
  un **petit bonus d'herboristerie** thématique (ex. cadence de cueillette ou
  remise boutique selon la Maison), OU un don d'herbes d'amorçage.
- *Vérif* : smoke — dialogue varie selon `chosenHouse` ; bonus appliqué.

> **Décisions b2 (figées 2026-05-30, validées utilisateur)** :
> - **Bonus** = **cadence de cueillette +** : être membre du Slug Club fait
>   passer la chance de double-récolte de `searchRoom` de **25 % → 35 %**.
> - **Membership** = avoir rencontré Slughorn (`seenNpcs.has('slughorn')`,
>   **déjà sérialisé** — aucun nouvel état de save). Helper pur
>   `isSlugClubMember()`.
> - **Reconnaissance de Maison** = nouvelle couche `dialoguesByHouse` dans la
>   cascade `_resolveDialogSource` (miroir de `dialoguesByQuest`, réutilisable
>   par tout PNJ), + 4 greetings Slughorn par `chosenHouse`.
>
> **Étapes** :
> 1. **Helper** `isSlugClubMember()` (potions.js, pur) →
>    `seenNpcs.has('slughorn')`. → *vérif* : false avant 1er contact, true après.
> 2. **Cadence cueillette** : `searchRoom` (movement-interactions.js) — la
>    constante 0.25 du bumper devient `isSlugClubMember() ? 0.35 : 0.25`.
>    → *vérif* : double-récolte 0.30 réussit pour un membre, échoue pour un
>    non-membre (jet déterministe).
> 3. **Couche `dialoguesByHouse`** : dans `_resolveDialogSource`
>    (npc-dialog.js), le `pick(k)` consulte `dialoguesByHouse[chosenHouse]`
>    AVANT `dialoguesByQuest` (override le plus spécifique gagne pour le
>    greeting). No-op si le PNJ n'a pas le champ. → *vérif* : greeting Slughorn
>    varie selon `chosenHouse`.
> 4. **Données Slughorn** (npcs.js) : `dialoguesByHouse` = 4 greetings « Slug
>    Club » (un par Maison, ton canon Slughorn — collectionneur de talents).
>    → *vérif* : les 4 textes existent.
> 5. **Smoke** : scénario dédié `scenarioSlugClub` (membership · cadence
>    membre vs non-membre · greeting house-aware) + bump PWA.
>    → *vérif* : suite verte + pwa-smoke.

**P6.b3 — Jardin d'herbes à récolte passive (le plus novateur)** — ✅ RÉALISÉ 2026-05-31
- Un jardin (cellule spéciale ou feature débloquée par Slughorn) qui **génère
  des herbes passivement** (cadence à décider : par descente d'étage / par N
  pas), avec un **plafond d'accumulation** et une UI de récolte. Nouvel état
  sérialisé + persistance.
- **Livré** : `CELL.GARDEN:15` caché (Set `hiddenGardens`), posé sur une case
  FLOOR à l'écart du départ aux étages 3/6/9/12… (jamais sur une cellule
  spéciale). Révélé par **Revelio** (rayon 5×5) ou par la **fouille** adjacente
  (`_revealGardensNear`, `gardenHiddenAt`). Pool global `gardenStock` (+1/12 pas
  via `_step`, +2 par descente via `goDeeper`, plafond 10) qui croît après
  l'éveil (`gardenDiscovered`). Récolte (`useGarden`, overlay d'exploration) →
  herbes du palier de l'étage. Visuels : `SCENE_ICONS.garden`,
  `drawGardenSprite`, classe minimap `.map-garden`. Sérialisé dans save.js +
  reset en nouvelle partie. Smoke : `scenarioHerbGarden` (8 sous-tests).
  Bump PWA v36→v37.
- *Vérif* : smoke — accumulation cadencée, plafonnée, récolte → besace ;
  round-trip de save.

> **Décisions b3 (figées 2026-05-31, validées utilisateur)** : accès =
> **cellule de donjon cachée**, révélée par le **sort Revelio** (« dévoile les
> éléments cachés », rayon 5×5) — et aussi par `searchRoom` adjacent (miroir des
> passages secrets) ; cadence = **par pas ET par descente** ; herbes = **palier
> de l'étage courant**.
>
> **Modèle** : pool global `gardenStock` qui croît **après l'éveil** (1ʳᵉ
> découverte d'un jardin) — `+1` tous les `GARDEN_STEP_INTERVAL=12` pas (`_step`)
> et `+GARDEN_DESCENT_BONUS=2` par `goDeeper`, plafonné à `GARDEN_CAP=10`. Marcher
> sur un jardin **révélé** ouvre un overlay « Récolter » → verse `gardenStock`
> herbes du palier de l'étage (T1 ≤3 · T2 4-6 · T3 7-10 · T4 11+) dans la besace
> (`addHerb`) et remet le stock à 0.
>
> **Cellule** `CELL.GARDEN:15` (marchable, ≠ WALL), placée sur **étages 3/6/9/12…**
> (`floor>=3 && (floor-3)%3===0`, décalée des fontaines 2/5/8/11). **Cachée** par
> défaut : Set global `hiddenGardens` (clés `"étage,x,y"`, sérialisé). Une case
> garden dont la clé est dans `hiddenGardens` se comporte **exactement comme du
> sol** (pas d'overlay, pas de sprite, pas de marqueur minimap) jusqu'à révélation.
>
> **Étapes** : (1) constante+état → (2) génération+cache → (3) révélation
> Revelio/searchRoom (`gardenHiddenAt`, `gardenDiscovered`) → (4) accumulation
> `_step`/`goDeeper` plafonnée → (5) récolte (`handleCellEntry`, descripteur
> overlay, `useGarden`) → (6) visuels (scene-icon, sprite, minimap) → (7)
> sérialisation save.js → (8) `scenarioHerbGarden` smoke + bump PWA. Chaque étape
> vérifiée au smoke avant la suivante.

**Ordre proposé** : b1 (données pures, faible risque) → b2 (léger) → b3
(nouvelle mécanique + état). Chaque sous-lot = sa propre PR, vert au smoke
avant la suivante.

#### P6.c — POTIONS OFFENSIVES JETABLES (sous-lot) · ~1,5 j · risque moyen

> Demande utilisateur (2026-05-31). Sorti du backlog P6 (« flacon de feu /
> poison lancé »). Audit pré-implémentation (session 2026-05-31) confirmé :
> - `useItem(idx, battleMode)` (inventory.js:673) applique aujourd'hui le
>   consommable **au perso actif** (`party[currentBattleChar]`, ligne 736) puis
>   provoque une **contre-attaque immédiate** de chaque ennemi + `advanceBattleChar`.
> - Le ciblage ennemi passe par `showTargetSelection(actionType)` (battle-ui.js:27)
>   via `pendingAction` (+ `pendingSpell`) ; l'attaque auto-cible si 1 seul
>   ennemi vivant (`battleAction('attack')`, battle.js:555).
> - Système élémentaire (`RESIST_MULTIPLIER`/`WEAK_MULTIPLIER`, `enemy.resist/weak`
>   vs `item.element`), statuts DoT (`applyStatus`, `gel`/`poison`/`burn`) et
>   combos (`comboDamageMult`) sont **réutilisables tels quels**.
> - Pipeline d'icônes **PNG indisponible** dans l'env (pas de PIL) → on suit le
>   précédent des herbes : **SVG inline** dans `ITEM_ICON_SVG_REGISTRY`.

**Décisions figées (2026-05-31, validées implicitement par le choix du lot)** :
1. **Catalogue = 3 flacons** aux rôles distincts :
   - `flacon_feu` 🔥 — **burst** élément `feu`, `power:24`, sans statut. price 40.
   - `flacon_givre` ❄️ — élément `glace`, `power:15`, pose `gel` (3/3 tours) →
     **active les combos** (×1.3 sorts/coups suivants). price 42.
   - `flacon_venin` 🧪 — **sans élément** (dégâts directs non typés `power:8`) +
     `poison` (5/tour × 4 tours) → **spécialiste DoT**. price 44.
2. **Modèle de dégâts alchimique** : `dmg = power × (1 + brewPotency)`, respecte
   `resist`/`weak` (via `element`) + `comboDamageMult` ; **pas de scaling MAG ni
   de crit de sort** (effet d'objet). Niche : source de dégâts fiable, indépendante
   des PM/MAG, **gratifiée par le brassage** (brewMult, comme les autres potions).
3. **Comportement de tour** : lancer = action offensive du tour → `advanceBattleChar`
   comme une attaque, **sans** la contre-attaque immédiate du « boire une potion ».
4. **Ciblage** : nouveau `pendingAction:'throw_item'` + global `pendingThrowIdx`
   (state.js) ; auto-cible si 1 seul ennemi (miroir `executeAttack`).
5. **Sources** : 3 recettes brassables (multisets inédits, découvrables — pas de
   verrou, cohérent §6bis) + boutique Apothicaire (`SHOP_CATALOG`, étage 3-4).
6. **Icônes** : SVG inline (flacon teinté par rôle) dans `ITEM_ICON_SVG_REGISTRY`.

**Étapes** :
1. **Items** (`data.js`) : 3 consommables `effect:"throw"` (champs
   `element?`, `power`, `statusId?`/`statusPower?`/`statusTurns?`). → *vérif* :
   smoke T1 (données).
2. **Recettes** (`POTION_RECIPES`, 23→26) : `brew_flacon_feu` `{aconit:2}` ·
   `brew_flacon_givre` `{branchiflore:2}` · `brew_flacon_venin` `{ortie:1,dictame:1}`
   (multisets libres, vérifiés sans collision). → *vérif* : `_matchRecipe` matche
   chaque combo ; `POTION_RECIPES.length === 26`.
3. **Moteur** (`battle.js`) : helper pur `_thrownPotionDamage(item, enemy)`
   (brewMult + resist/weak + combo, retourne `{dmg, suffix}`) ; action
   `throwItemAtEnemy(invIdx, enemyIdx)` (applique dégâts + statut optionnel +
   `_consumeAt` + log/floatDmg + `checkAllEnemiesDead` + `advanceBattleChar`).
   → *vérif* : smoke T2-T5 (dégâts, resist/weak, statut posé, brassage).
4. **Ciblage** : `pendingThrowIdx` (state.js) + branche `'throw_item'` dans
   `showTargetSelection` (battle-ui.js) ; branche `effect==='throw'` dans
   `useItem` (inventory.js) — combat only, ferme la modale, auto-cible si 1
   ennemi sinon `showTargetSelection('throw_item')`. Hors combat → message.
   → *vérif* : smoke (intégration : enemyGroup réduit, item consommé, tour avancé).
5. **Icônes SVG** : 3 entrées `ITEM_ICON_SVG_REGISTRY`. → *vérif* :
   `getItemIconHtml` rend le SVG.
6. **Shop** : 3 entrées `SHOP_CATALOG` (feu/givre ét.3, venin ét.4). → *vérif* :
   présentes, filtrées par palier.
7. **Smoke** : scénario dédié `scenarioThrowablePotions` + mise à jour des
   asserts `POTION_RECIPES.length` 23→26 (3 sites) ; **bump PWA** (data/battle/
   battle-ui/inventory/item-icons/state/shop `?v=N` + `CACHE_VERSION`).
   → *vérif* : suite verte + pwa-smoke.

**Hors-scope P6.c** : potions offensives **multi-cibles** (AOE), flacons à effet
de zone, et l'usage de flacons par les ennemis — différés (gros scope combat).

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
| 2026-05-30 | **LOT P6.a (codex) — cadrage** : audit confirmé (knownRecipes existe, 21 recettes, section « Recettes connues » liste seulement les connues → trou = recettes masquées + compteur). Plan P6.a rédigé (5 étapes + critères). Décisions proposées : silhouettes+indices (vs tout visible), section inline (vs bouton dédié), indice non-spoiler (palier + nb d'ingrédients). Implémentation en attente du feu vert utilisateur. |
| 2026-05-30 | **LOT P6.b2 (Slug Club) — LIVRÉ** : décisions confirmées (bonus = cadence cueillette + · membership dérivé de seenNpcs · reconnaissance Maison via dialoguesByHouse). Helper pur `isSlugClubMember()` (`seenNpcs.has('slughorn')`, aucun nouvel état de save) ; `searchRoom` : double-récolte 25→35 % pour les membres ; nouvelle couche `dialoguesByHouse` dans `_resolveDialogSource` (override greeting par `chosenHouse`, le plus spécifique : quête > Maison > défaut, réutilisable par tout PNJ) + greeting branch passe par `pick()` ; 4 greetings « Slug Club » Slughorn (un par Maison). Scénario smoke `scenarioSlugClub` T1-T3 (membership · cadence membre vs non-membre au jet 0.30 · greeting house-aware Serpentard vs Gryffondor) ; suite **137/137 verte** + pwa v35. Reste b3 (jardin passif). |
| 2026-05-30 | **LOT P6.b1 (herbe rare endgame) — LIVRÉ** : décisions confirmées (Boucle Ténébreuse 11+ · consommation = upgrade des Élixirs Suprêmes existants · icône SVG inline). Nouvelle herbe `herbe_asphodele_noire` (Asphodèle des Ténèbres, tier 4, price 40) ; 2 recettes de prestige (`brew_xl_tenebres` 2 herbes→potion_xl · `brew_xl_sp_tenebres` 3 herbes→potion_xl_sp, POTION_RECIPES 21→23, multisets inédits) ; sources : cueillette `searchRoom` palier 4 gated 11+, drop Héraut des Ténèbres @0.30, ware Apothicaire Ténébreux @40 ; icône SVG inline (`ITEM_ICON_SVG_REGISTRY`, asphodèle teinte ténèbres). Asserts `POTION_RECIPES.length` & herbCount mis à jour (21→23, 6→7). Scénario smoke `scenarioRareHerb` T1-T4 (données+sources · recettes prestige · brassage · cueillette gated) ; suite **136/136 verte** + pwa v34. Reste b2 (lien Maison/Slughorn) + b3 (jardin passif). |
| 2026-05-30 | **LOT P6.a (codex) — LIVRÉ** : décisions confirmées (silhouettes+indices · section inline). La section « Recettes connues » devient un **Codex** listant les 21 recettes — connues (lisibles + « Préparer ») vs à découvrir (silhouette `🔒 ? ? ?` + indice non-spoiler `_recipeHint` : palier d'herbes / « avancée » + nb d'ingrédients), avec compteur « X/21 découvertes ». Helper pur `_recipeHint` ; CSS `.brew-recipe-locked`/`.brew-codex-count`. Scénario smoke `scenarioRecipeCodex` T1-T4 (liste complète · indices herbe vs upgrade · ligne masquée · révélation→compteur+1) ; suite **135/135 verte** + pwa v33. Reste backlog P6 : ancrage narratif herbes + potions offensives jetables. |
| 2026-05-30 | **PR P2 livré** : potions de buff de combat. Moteur `temp_buff` généralisé de l'ATK seul à 5 stats (`BUFF_STAT_BY_ID` : atk/def/agi/lck/mag) — `_applyConsumableEffect` mute la stat de base + recalc, `tickStatuses` restaure à l'expiry (boucle générique), `recalculateStats` réapplique tous les `buff_*` (source unique, AVANT les stats dérivées → dodge/crit tiennent compte des buffs AGI/LCK). 4 items (Défense+DEF / Célérité+AGI / Précision+LCK / Puissance+MAG, +8/3t) + 4 recettes (POTION_RECIPES 17→21, sans collision) + 4 icônes PNG (flacons teintés) + shop ét.3-4. Smoke `scenarioCombatBuffs` T1-T5 (dont AGI→dodge 9.8→13, LCK→crit 12.5→16.5) + suite 132/132 + pwa v32. |
| 2026-05-31 | **LOT P6.c (potions offensives jetables) — LIVRÉ** : 3 flacons `effect:"throw"` lancés sur 1 ennemi en combat — Feu 🔥 (burst feu 24), Givre ❄️ (glace 15 + `gel` 3/3, active les combos), Venin 🧪 (8 directs sans élément + `poison` 5/4). Moteur : helper pur `_thrownPotionDamage` (brewMult + resist/weak + `comboDamageMult`, **sans scaling MAG ni crit de sort**) + action `throwItemAtEnemy(invIdx, enemyIdx)` (battle.js) qui consomme le tour comme une attaque (`advanceBattleChar`), sans la contre-attaque immédiate du « boire une potion ». Ciblage : `pendingThrowIdx` (state.js) + branche `'throw_item'` dans `showTargetSelection` (battle-ui.js) + branche `effect==='throw'` dans `useItem` (combat only, auto-cible si 1 ennemi). 3 recettes brassables (`brew_flacon_feu` {aconit:2} · `brew_flacon_givre` {branchiflore:2} · `brew_flacon_venin` {ortie:1,dictame:1}, POTION_RECIPES 23→26, multisets inédits, découvrables) ; 3 icônes SVG inline (`_potionSvg`, pipeline PNG Python indisponible) ; shop Apothicaire ét.3-4. Asserts `POTION_RECIPES.length` 23→26 (3 sites). Scénario smoke `scenarioThrowablePotions` T1-T5 (données+SVG · dégâts purs brassage/resist/weak · combat intégré dégâts+consommation+gel · recettes · boutique) ; suite **139/139 verte** + pwa v36. **Backlog P6 restant : jardin d'herbes passif (b3).** |

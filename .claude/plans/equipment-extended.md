# Plan d'exécution — Système d'équipement étendu

Branche : `claude/game-equipment-system-plan-zrXwI`

> Ce document est la **source de vérité** entre sessions Claude.
> Convention : `[ ]` pending · `[~]` in progress · `[x]` done.
> À chaque étape franchie : cocher la case, mettre à jour le statut global, ajouter une ligne dans le journal en bas.

**Statut global** : 24 / 53 étapes — Phases 1-2-3a-4-5 terminées (sprites dédiés + doc CLAUDE.md + smoke 11 slots étendu T9/T10). 3b (quêtes/PNJ) reportée — plan PNJ à rédiger.

---

## 1. Décisions validées par l'utilisateur

| Paramètre              | Choix                                                                    |
|------------------------|--------------------------------------------------------------------------|
| Nombre de slots        | **11 slots étendus** (wand, head, body, hands, feet, cloak, amulet, ring1, ring2, belt, trinket) |
| Contenu                | **3 familles d'items par slot**, chaque famille déclinée en **variantes par teinte** (PNG transparent + `tint` runtime). Plus la teinte est rare, plus l'item est puissant. |
| Distribution           | Boutique + drops monstres + récompenses de quêtes + coffres (loot table par étage) |
| Génération PNG         | **Planches atlas par catégorie de slot** (1 atlas par slot, découpé en sprites individuels via script). Variantes obtenues par CSS `filter: hue-rotate()` / overlay couleur sur le PNG transparent. |

---

## 2. Architecture cible

### 2.1 Schéma `equipped` (par personnage)

```js
equipped: {
  wand:    null,    // baguette / arme
  head:    null,    // chapeau, capuche, diadème, casque
  body:    null,    // robe, armure, pectoral
  hands:   null,    // gants, mitaines, gantelets
  feet:    null,    // bottes, sandales, pantoufles magiques
  cloak:   null,    // cape, manteau, châle
  amulet:  null,    // collier, médaillon, pendentif (slot "cou")
  ring1:   null,    // anneau gauche
  ring2:   null,    // anneau droit
  belt:    null,    // ceinture, baudrier
  trinket: null     // bibelot (balai Nimbus, retourneur de temps, vif d'or)
}
```

### 2.2 Slot d'un item (champ `slot` plutôt que `type` étendu)

Pour ne pas casser la sémantique actuelle de `type` (`wand`, `armor`, `acc`,
`consumable`, `spellbook`), on introduit un champ optionnel `slot` qui
détermine la destination dans `equipped`. Si `slot` absent, on retombe sur
le mapping legacy :

| `type` legacy | `slot` cible par défaut |
|---------------|-------------------------|
| `wand`        | `wand`                  |
| `armor`       | `body`                  |
| `acc`         | déterminé par `slot` explicite (ex: `cloak`, `amulet`, `ring`, `trinket`) |

Les items `acc` existants (`amulette`, `broom`, `cape_invis`, `locket_slytherin`, `diademe_serdaigle`) reçoivent un champ `slot` explicite (cf. §6.2 migration).

### 2.3 Bonus stats supportés

Étendre `recalculateStats()` pour itérer sur **tous les slots** et appliquer
**toutes les stats bonus** présentes :

```
bonusAtk, bonusDef, bonusMag, bonusLck       (déjà)
bonusAgi, bonusEnd, bonusStr, bonusInt       (NEW — déjà déclarés sur cape_invis mais ignorés)
bonusHpMax, bonusSpMax                        (NEW — items qui augmentent les jauges)
```

### 2.4 Système de variantes par teinte

Une **famille** = 1 PNG de base (transparent, neutre/grisé). Chaque item de
la famille porte un champ `tint` qui colorise le PNG au rendu :

```js
{ id:"gloves_apprentice", family:"gloves_leather", tint:"#9a7040", rarity:"common", ... }
{ id:"gloves_journeyman", family:"gloves_leather", tint:"#4a8ad0", rarity:"rare",  bonusAtk:+1, ... }
{ id:"gloves_master",     family:"gloves_leather", tint:"#c93030", rarity:"epic",  bonusAtk:+2, bonusAgi:+1, ... }
```

Rendu : `getItemIconHtml()` ajoute `style="filter: drop-shadow(0 0 1px ${tint}) ..."` ou
applique un overlay multiply via `<span class="tinted-icon" style="--tint:${tint}">`.
Détail technique tranché en étape 4.

### 2.5 Effets spéciaux (au-delà des bonus stats)

Les items peuvent porter des effets spéciaux déjà existants (`grantsSpell`,
fuite garantie pour `broom`) ou nouveaux (V1.5+) :

| Effet         | Slot cible | Exemple                          |
|---------------|------------|----------------------------------|
| `grantsSpell` | tous       | Amulette → Reparo (existant)     |
| `fleeAlways`  | trinket    | Balai → fuite garantie (existant)|
| `regenHp`     | ring/amulet| Anneau du Phénix → +1 PV/tour     |
| `regenSp`     | ring/belt  | Ceinture mana → +1 PM/tour        |
| `firstStrike` | boots      | Bottes vives → init+ en combat    |
| `critBonus`   | hands/wand | Gants de précision → +chance crit |

V1 ne livre que `grantsSpell`/`fleeAlways` (déjà câblés). Les autres sont
listés ici pour qu'on n'ait pas à re-décider plus tard.

---

## 3. Phases d'exécution

```
Phase 0 — Audit & validation         (ce document)
Phase 1 — Backend (data + recalculateStats + migration save)
Phase 2 — UI (inventaire, fiche perso, menu d'équipement)
Phase 3 — Distribution (shop, drops, coffres, quêtes)
Phase 4 — PNG via planches atlas (par slot)
Phase 5 — Documentation + smoke test + clôture
```

---

## 4. Phase 1 — Backend logique

**Critère de réussite global** : équiper un nouvel item dans n'importe quel
slot met à jour les stats correctement, persiste dans la save, et restaure à
l'identique après reload.

- [x] **1.1** `state.js` : étendre `equipped` sur `player` et `player2` aux 11 slots (`wand, head, body, hands, feet, cloak, amulet, ring1, ring2, belt, trinket` — tous à `null`). Aussi corrigé `_hydrateCharacter` (`main.js:136`) qui réassignait l'ancien schéma 3-slots au choix de héros.
- [x] **1.2** `inventory.js — recalculateStats()` : itère dynamiquement sur `Object.keys(c.equipped)`. Applique `bonusAtk/Def/Mag/Lck/Str/Int/Agi/End`. **Décision V1** : `bonusHpMax/SpMax` reportés en hors-scope (§11) pour éviter de coupler avec `checkLevelUp` qui mute encore directement `hpMax/spMax`. Ajouté lazy-init de `_baseStr/_baseInt/_baseAgi/_baseEnd` (capture de la valeur courante au premier appel) pour préserver les level-up des saves antérieures à l'extension.
- [x] **1.3** `inventory.js — equipItem()` : helper `_resolveSlotForItem(item, c)` introduit. Si `item.slot === 'ring'`, choisit `ring1` puis `ring2`. Signature étendue avec `targetSlot` optionnel pour forcer le slot depuis le menu. Mise à jour des strings legacy `c.wand/c.armor/c.acc` selon le slot pour que le panneau gauche reste à jour.
- [x] **1.4** `inventory.js — showEquipMenu()` : 4 cas (solo/duo × ring/non-ring). En solo + ring : 2 boutons "Anneau gauche / Anneau droit". En duo + ring : 2 boutons par personnage avec étiquette du slot occupé.
- [x] **1.5** `data.js` : champ `slot` explicite sur tous les équipements existants (`wand1/wand2/sword_gryff` → `wand` ; `robe1/coupe_poufsouffle` → `body` ; `amulette/locket_slytherin` → `amulet` ; `broom` → `trinket` ; `cape_invis` → `cloak` ; `chapeau_pointu/diademe_serdaigle` → `head`). `type:"acc"` conservé pour la rétrocompat.
- [x] **1.6** `save.js — _migrateEquippedSlots(c)` : nouvelle fonction idempotente. Migre `equipped.armor` → `body`, `equipped.acc` → slot dérivé de `item.slot` (ou `amulet` par défaut), supprime les clés legacy. Appelée depuis `_applyState` avant `recalculateStats`.
- [x] **1.7** `save.js — _migrateEquippedSlots` initialise tous les slots manquants à `null`. `_serializeState()` sérialise tel quel (la migration s'applique au load).

**Vérification Phase 1** :
- Dans la console : `party[0].equipped` doit avoir 11 clés.
- Équiper un item ring → apparaît dans `ring1`. Équiper un 2e ring → propose `ring2`.
- Save → reload → équipement intact.

---

## 5. Phase 2 — UI

- [x] **2.1** `inventory.js — renderInventory()` : `isEquip` inchangé (les nouveaux items conservent `type:'acc'`) mais l'étiquette type utilise désormais `item.slot` en priorité (plus précis : head/ring/trinket…). Bordure de rareté via classe `rarity-<level>` ajoutée au slot.
- [x] **2.2** `item-icons.js — EQUIPMENT_SLOT_ICONS` : 8 entrées étendues (`head, body, hands, feet, cloak, amulet, ring, ring1, ring2, belt, trinket`) aliasées sur `armor.png` (body/cloak) ou `accessory.png` (les autres). Sprites dédiés générés en Phase 4.
- [x] **2.3** `ui.js — openCharacter()` : helper `_renderEquipSlots(c)` itère sur `EQUIP_SLOT_LABELS` (11 paires `[slot, libellé FR]`), produit des `.equip-row` avec icône + label + nom de l'item (ou « — » italique si vide). Conserve `c.wand/c.armor/c.acc` strings legacy intacts pour `updateUI` du panneau gauche.
- [x] **2.4** `css/style.css` : `.equip-grid` (grid 2 colonnes, repli 1 colonne ≤360px), `.equip-row.filled` (fond ambré subtil), `.equip-icon`/`.equip-label`/`.equip-name` (typographie Cinzel pour le label, ellipsis sur le nom).
- [x] **2.5** Rendu de teinte : `getItemIconHtml(item)` applique `style="filter: drop-shadow(0 0 1px ${tint}) drop-shadow(0 0 3px ${tint});"` quand `item.tint` est un hex valide (`/^#[0-9a-f]{3,8}$/i`). Tints malformées ignorées (sécurité anti-injection CSS). Smoke T8 valide les deux cas.
- [x] **2.6** Bordure de rareté : `.rarity-common` (gris-or), `.rarity-rare` (bleu), `.rarity-epic` (violet), `.rarity-legendary` (or, halo). Smoke T7 vérifie `borderColor === rgb(74,138,208)` pour rare.

**Vérification Phase 2** :
- Fiche perso affiche les 11 slots remplis ou vides.
- Équiper 3 variantes d'une même famille → visuels distincts (teinte différente).
- Bordure de rareté visible dans la grille d'inventaire.

---

## 6. Phase 3 — Distribution du contenu

### 6.1 Catalogue cible (V1 = 33 items, 3 familles × 11 slots, variante commune uniquement)

> Notation : `<slot>_<family>_<variant>` ; variantes futures : `_apprentice` (commune) → `_journeyman` (rare) → `_master` (épique).

| Slot     | Familles V1                                                          |
|----------|---------------------------------------------------------------------|
| wand     | `wand_oak`, `wand_elder`, `wand_phoenix` *(en partie déjà : `wand1`, `wand2`)* |
| head     | `head_hat` (chapeau pointu de sorcier), `head_hood` (capuche), `head_circlet` (diadème) |
| body     | `body_robe` (robe d'élève), `body_chain` (cotte de mailles enchantée), `body_dueling` (robe de duel) |
| hands    | `hands_gloves` (gants de cuir), `hands_mittens` (mitaines de laine runiques), `hands_dragonhide` (gantelets de peau de dragon) |
| feet     | `feet_boots` (bottines), `feet_sandals` (sandales légères), `feet_dragonhide` (bottes de peau de dragon) |
| cloak    | `cloak_school` (cape d'école), `cloak_traveler` (manteau du voyageur), `cloak_invisibility` (cape d'invisibilité — déjà `cape_invis`) |
| amulet   | `amulet_phoenix` (déjà `amulette`), `amulet_serpent` (déjà `locket_slytherin`), `amulet_protection` (médaillon de protection) |
| ring1/2  | `ring_silver`, `ring_runed`, `ring_resurrection` (clin d'œil aux Reliques) |
| belt     | `belt_leather`, `belt_potionsmith` (porte-fioles → +1 slot consommable virtuel), `belt_dueling` |
| trinket  | `trinket_broom` (déjà `broom`), `trinket_timeturner` (retourneur de temps), `trinket_snitch` (vif d'or pour Harry → bonus attrape) |

**V1 livre la variante commune** ; les variantes rare/épique sont préparées
côté donnée (`tint`/`rarity` champ vide ou présent) mais peuvent être
ajoutées en V2 sans nouveau PNG (juste teinte différente).

### 6.2 Items à ajouter (étapes)

- [x] **3.1** `data.js` — 12 nouveaux items couvrant les slots vides : `gants_apprenti`, `bottes_apprenti`, `chapeau_apprenti`, `ceinture_cuir`, `anneau_argent` (commons étage 1-2), `cape_voyageur`, `amulette_protection` (commons étage 3-4), `circlet_serdaigle`, `anneau_runique` (rare étage 5+, tint #a060d0), `ceinture_alchimiste`, `bottes_dragon` (rare étage 7+, tint #c04020), `retourneur_temps` (epic étage 7+, tint #c9a84c). Champ `tint` exploité par `getItemIconHtml` Phase 2.
- [x] **3.2** `data.js` — backfill `family`+`rarity` sur 11 items existants. Mapping : `wand1→common, wand2→rare, robe1→common, amulette→epic, broom→rare, cape_invis→epic, chapeau_pointu→rare, sword_gryff/locket_slytherin/diademe_serdaigle/coupe_poufsouffle→legendary`. `slot` était déjà fait en Phase 1.5.

### 6.3 Boutique progressive

- [x] **3.3** `shop.js — SHOP_CATALOG` : 12 nouveaux items injectés selon le tableau ci-dessous (étage 1 : gants+bottes ; étage 2 : chapeau+ceinture+anneau ; étage 3 : cape+amulette ; étage 5 : circlet+anneau_runique+ceinture_alchimiste ; étage 7 : bottes_dragon+retourneur_temps). Smoke T6 valide la liste à l'étage 1.

| Étage | Nouveaux ajouts (proposition)                                  |
|-------|----------------------------------------------------------------|
| 1     | `hands_gloves_apprentice`, `feet_boots_apprentice`             |
| 2     | `head_hat_apprentice`, `belt_leather`, `ring_silver`           |
| 3     | `cloak_traveler`, `amulet_protection`                          |
| 4     | `body_dueling_apprentice`, `hands_mittens`                     |
| 5     | `head_circlet`, `ring_runed`, `belt_potionsmith`               |
| 7     | `trinket_timeturner`, `feet_dragonhide`                         |
| 9     | variantes rare des familles low-level (V2)                      |

### 6.4 Drops monstres

- [x] **3.4** `monsters.js` — drops étendus sur 7 monstres :
    - Gobelin Rebelle → `ceinture_cuir` (0.04)
    - Troll des Toilettes → `gants_apprenti` (0.04)
    - Bundimun → `bottes_apprenti` (0.05)
    - Centaure Hostile → `anneau_argent` (0.06)
    - Hippogriffe en Furie → `chapeau_apprenti` (0.04, snitch n'existe pas dans le jeu)
    - Mangemort Masqué → `cape_voyageur` (0.08)
    - Bellatrix → `anneau_runique` (0.10)
    - Voldemort Ressuscité → `retourneur_temps` (0.20)

### 6.5 Coffres — loot table par étage

- [x] **3.5** `data.js` — fonction `pickChestEquipment(floor)` : filtre `ITEMS` (slot non null, exclut consumable/spellbook/legendary), pondère par rareté (`common×6, rare×3, epic×1`) et seuils étage (`common≥1, rare≥4, epic≥7`). Smoke T4 vérifie distribution étage 1 (100% common) vs étage 7 (~70% common, ~25% rare, ~5% epic). `movement.js — openChest()` utilise cette fonction dans la branche équipement (38% or, 30% conso, 22% équipement, 10% livre — distribution conservée). Repli sur or si pool vide pour un étage. Remplace le tirage uniforme `ITEMS.filter(['wand','armor','acc'])`.

### 6.6 Nouvelles quêtes

> **Phase 3b reportée** (3.6 + 3.7) : les 4 quêtes secondaires demandent
> de nouveaux donneurs (Ollivander, Madame Guipure, portrait de Dumbledore,
> Fumseck) qui ne sont pas encore wired dans le moteur de quête actuel
> (`completeQuest()` distribue déjà `reward.item` : ce point est ✓). Sera
> traité dans une Phase 3.5 dédiée si besoin.

- [ ] **3.6** `state.js — activeQuests` : ajouter 4 nouvelles quêtes secondaires donnant un slot inédit en récompense :
    1. **« Les bottines disparues d'Olivander »** (donneur : Mr Ollivander, étage 3) — récompense `feet_dragonhide`.
    2. **« Le sortilège du brodeur »** (donneur : Madame Guipure, étage 2) — collecter 3 fils d'acromantule → récompense `cloak_traveler` (variante rare).
    3. **« L'anneau perdu de Dumbledore »** (donneur : portrait de Dumbledore, étage 6) — explorer salle cachée → `ring_resurrection` (variante épique, `grantsSpell`).
    4. **« Le bouclier du Phénix »** (donneur : Fumseck, étage 8) — vaincre 5 mangemorts → `amulet_phoenix` (variante épique avec `regenHp`).
- [ ] **3.7** `quests.js` : aucune logique nouvelle nécessaire si la quête est de type `kill` ou `item` ; vérifier que les nouveaux items récompenses sont bien distribués via `completeQuest()`.

**Vérification Phase 3** :
- Chaque slot a au moins 1 voie d'acquisition à un étage donné.
- Démarrer une partie neuve, descendre étage par étage, vérifier que la boutique se peuple progressivement et que les coffres droppent au moins 1 item d'équipement avant l'étage 5.

---

## 7. Phase 4 — PNG via planches atlas

### 7.1 Architecture des atlas

Une **planche atlas** = 1 PNG haute résolution (ex 4×4 = 16 sprites de 256×256
sur une image 1024×1024) contenant **toutes les familles d'un slot** sur fond
transparent. Stockée dans `img/icons/items/atlas/<slot>.png`.

Au runtime, on découpe via CSS `background-image + background-position` ou via
un sprite sheet JS. Décidé en étape 4.1 selon ce qui s'intègre le mieux à
l'API actuelle `getItemIconHtml()` (laquelle retourne un `<img>`).

**Option retenue par défaut** (plus simple à intégrer) :
- 1 PNG **par famille** (pas 1 par variante), en transparent neutre.
- Atlas servent uniquement à la **génération en lot** (le LLM image dessine 9
  familles d'un slot sur une planche, puis on découpe avec un script Python
  → 9 PNG individuels dans `img/icons/items/<slot>/<family>.png`).
- Variantes obtenues via teinte CSS (`filter: hue-rotate`/`drop-shadow tint`)
  sur le même PNG.

### 7.2 Étapes Phase 4

- [x] **4.1** Décision : PNG individuels (48×48 RGBA) générés en pixel
      art Pillow via `gen_icons.py`, cohérent avec les ~30 sprites
      d'items déjà livrés. Pas d'atlas IA à découper — le projet utilise
      la même chaîne (Pillow déterministe) pour 100% des items.
- [x] **4.14** `item-icons.js — ITEM_ICON_REGISTRY` : 12 entrées
      pointent désormais vers `img/icons/items/<id>.png` (sprites
      dédiés). Smoke T3 du scénario 21 restauré en assertion stricte.
- [x] **4.x** `gen_icons.py` : helper `_outline()` partagé +
      12 `gen_item_*` ajoutés (gants, bottes, chapeau, ceinture,
      anneau, cape, amulette_protection, circlet, anneau_runique,
      ceinture_alchimiste, bottes_dragon, retourneur_temps) +
      12 entrées dans `TARGETS`. Total : **99 icônes** générées.

> **4.2–4.13 (atlas IA + variantes par teinte) hors-scope V1** :
> les 12 sprites dédiés couvrent déjà 1 PNG par item du catalogue
> Phase 3a. Le plan original prévoyait 33 items × 3 familles avec
> partage de sprite par teinte — non nécessaire tant que le catalogue
> reste à 12 entrées. À rouvrir si on étoffe à 33+ items.

### 7.4 Principes de qualité pour sprites Pillow 48×48

Tirés de l'itération réelle sur les 12 sprites Phase 3 (1ère passe
trop sobre → 2e passe avec cycle voir-ajuster sur 6 sprites). À
appliquer à toute future addition de sprite item.

**Contraintes du projet**
- Pixel art Pillow **déterministe** (seed RNG par sprite, pas d'IA).
- 48×48 RGBA, fond transparent, **outline noir 1 px** systématique
  via le helper `_outline()` partagé.
- Palette importée depuis le bloc d'en-tête de `gen_icons.py`
  (LD/LM/LL/LH cuir, GD/GM/GH or, MTD/MTL/MTH métal, etc.) — pour
  rester cohérent avec les ~30 sprites existants.

**Règles de composition**
1. **Remplir le canvas à 75–90 %** — un sprite qui n'occupe que
   le centre paraît "perdu" en grille d'inventaire à 32 px. Mes
   premiers sprites étaient à 40 % (ex: ancien `circlet`), refonte
   à -22→+22 sur l'axe X.
2. **Un sujet > deux sujets** — pour les paires (gants, bottes), un
   seul objet vu de profil grand donne plus de présence que deux
   serrés côte à côte (cf. `bottes_apprenti` v1 vs v2). Exception :
   bijoux (paire d'anneaux n'a pas de sens).
3. **Silhouette lisible en 1 s** — la forme doit dire l'objet sans
   lire les détails. Test : réduire à 24 px et vérifier qu'on
   reconnaît encore.
4. **Contraste fort entre objet et fond** + entre zones internes.
   Mes plis de cape v1 utilisaient `CAPE_D` proche du `CAPE_M`
   ambiant : invisibles. Refonte avec `OUT2` (presque noir) +
   highlight clair adjacent.

**Règles de palette/volume**
5. **3 à 4 nuances par teinte** (foncé/mid/clair/highlight). Un seul
   ton plat est plat — `blend()` entre 2 valeurs avec progression
   linéaire suffit pour le 3D plausible.
6. **Lumière oblique** depuis le haut-gauche : appliquer un
   highlight 1 px d'épaisseur sur la face exposée.
7. **`vary(col, rng, 3-5)`** systématique sur les surfaces — bruit
   qui empêche le rendu de paraître plat sans casser la palette.

**Règles d'identification**
8. **1 détail signature** par item — lacets dorés (bottes), écailles
   chevron (dragon), plume (chapeau), gemme sertie (bijoux). C'est
   ce détail qui différencie 2 items partageant la même silhouette.
9. **Différencier les paires d'items** par la **forme**, pas
   uniquement la couleur. v1 : `bottes_dragon` = `bottes_apprenti`
   recolorées. v2 : col cape doré + écailles + griffe pointue +
   semelle cloutée.

**Workflow d'itération**
10. **Cycle voir-ajuster** : écrire le générateur → `python3
    gen_icons.py` → lire le PNG via le tool d'image → ajuster les
    zones faibles → regénérer. Compter **2 à 4 passes** par sprite
    en moyenne ; viser 1 dans l'idéal mais ne pas livrer après une
    seule.
11. **Helper `_outline()`** factorisé : ne pas dupliquer la triple
    boucle d'outline dans chaque générateur.
12. **Numéro de seed unique** par sprite (`Random(360X)`) — convention
    : 36XX pour les items Phase 3, 34XX pour les items Phase 4
    historiques. Préserve le déterminisme.

**Hors limites pratiques de cette chaîne**
- Pas d'antialiasing (pixel art volontaire).
- Pas de transparence intermédiaire (alpha 0 ou 255 uniquement).
- Effets complexes (glow, gradient radial, transparence) peuvent
  être simulés via overlays multi-passes mais coûtent en lisibilité
  à 48×48.
- Pour de la qualité "asset commercial", basculer sur la chaîne
  Phase 4 originale (atlas IA + découpe Python) telle que prévue
  en 4.2/4.3 — laissée en place dans le plan pour ce cas.

### 7.3 Workflow de génération (un atlas à la fois)

1. Claude rédige le prompt de génération (style Poudlard, fond transparent,
   grille NxN, chaque cellule = 1 famille du slot, vue de 3/4 ou face).
2. L'utilisateur colle l'image générée dans la conversation.
3. Claude exécute `tools/split_atlas.py img/raw/<slot>.png manifest.json` →
   produit `img/icons/items/<slot>/<family>.png` (transparents).
4. Claude met à jour `ITEM_ICON_REGISTRY` et coche la case.

---

## 8. Phase 5 — Documentation & tests

- [x] **5.1** `CLAUDE.md` : section « Système d'équipement » refondue. 11 slots, schéma item complet (`slot`/`family`/`rarity`/`tint`/`bonus*`/`grantsSpell`), implémentation dynamique de `recalculateStats()`, migration `_migrateEquippedSlots`. `bonusHpMax/SpMax` annoté hors-scope V1.
- [x] **5.2** `CLAUDE.md` : table par catégorie de slot (10 lignes : wand/head/body/hands/feet/cloak/amulet/ring/belt/trinket), exemples d'items représentatifs avec rareté.
- [x] **5.3** `tests/smoke.js` — extension du scénario 22 existant :
    - T1 : 11 clés dans `equipped` (déjà existant).
    - T2 : mapping `slot` sur 7 items legacy (déjà existant).
    - T3 : bonusAgi cape (déjà existant).
    - T4 : ring1 puis ring2 (déjà existant).
    - **T9 (nouveau)** : équiper 4 slots distincts (head/hands/feet/cloak) en série, vérifier que les bonus s'additionnent (ATK+1 DEF+5 MAG+1 AGI+3).
    - **T10 (nouveau)** : save → vide equipped → loadGame → vérifier que les 11 slots sont restaurés à l'identique.
    - `bonusHpMax` test omis : reporté hors-scope V1 (cf. §1.2 du plan).
- [x] **5.4** `tests/smoke.js` — couvert par T5 du scénario 22 existant : save synthétique `equipped:{wand,armor,acc}` → `_applyState` migre vers `body`/`amulet` + complète à 11 slots, sans crash.
- [x] **5.5** `node tests/smoke.js` — **29 scénarios verts** (sur branche `claude/equipment-phase5-docs-smoke`).

---

## 9. Phase 6 — Clôture

- [ ] **6.1** Mettre à jour `SVG_PLAN.md` si on y ajoute un sous-bloc « icônes d'items » (sinon ce plan suffit).
- [ ] **6.2** Commit groupé final + push sur `claude/game-equipment-system-plan-zrXwI`.
- [ ] **6.3** Créer une PR (sur demande utilisateur uniquement).

---

## 10. Critères de vérification globaux

1. ✅ Les 11 slots existent sur chaque personnage et persistent dans la save.
2. ✅ Tout item équipé applique correctement ses bonus (atk, def, mag, lck, agi, end, str, int, hpMax, spMax).
3. ✅ Les anneaux gauche/droite sont gérés sans confusion (le 2e équipé va dans le slot vide ; sinon prompt de remplacement).
4. ✅ Au moins une voie d'acquisition par slot avant l'étage 5.
5. ✅ Les variantes (teintes) d'une même famille sont visuellement distinctes dans l'inventaire.
6. ✅ Une save antérieure à la refonte se charge sans erreur (slots manquants = null).
7. ✅ Smoke test 100% vert.

---

## 11. Hors-scope V1 (notes pour le futur)

- **Set bonuses** : porter une famille complète (ex: 4 pièces `dragonhide`) → bonus additionnel.
- **Effets passifs en combat** : `regenHp/regenSp/firstStrike/critBonus` (préparés en §2.5, à câbler dans `battle.js`).
- **Slots faction-locked** : items légendaires des Maisons réservés à la maison choisie.
- **Variantes nommées** : auto-générer le nom selon `family + rarity` au lieu de hard-coder 3 entrées par famille.

---

## Journal des sessions

| Date       | Étape | Statut | Notes |
|------------|-------|--------|-------|
| 2026-05-09 | Audit + plan rédigé | ✅ | 11 slots, 3 familles/slot avec variantes par teinte ; distribution shop+drops+quêtes+coffres ; PNG via planches atlas découpées |
| 2026-05-09 | Phase 1 — Backend  | ✅ | 7/7 étapes : 11 slots dans `equipped` (state.js + main.js `_hydrateCharacter`), `recalculateStats()` dynamique avec bonus Str/Int/Agi/End (`bonusHpMax/SpMax` reportés hors-scope V1), `_resolveSlotForItem` + `equipItem(idx,charIdx,targetSlot)` + gestion ring1/ring2, `showEquipMenu` 4 cas, champ `slot` sur 12 items existants, `_migrateEquippedSlots` (armor→body, acc→slot dérivé). Smoke test scénario 22 ajouté (5 assertions : 11 slots, mapping, cape_invis bonusAgi, 2 anneaux, migration legacy). 22/22 scénarios verts. |
| 2026-05-10 | Phase 5 — Doc + smoke | ✅ | 5.1 + 5.2 : section « Système d'équipement » de `CLAUDE.md` refondue (11 slots, schéma item complet `slot`/`family`/`rarity`/`tint`/`bonus*`/`grantsSpell`, `recalculateStats()` dynamique, `_migrateEquippedSlots`). Table par catégorie de slot (10 lignes, exemples d'items représentatifs avec rareté). 5.3 : extension du scénario 22 — T9 (4 slots distincts head/hands/feet/cloak équipés en série, deltas ATK/DEF/MAG/AGI assertés) + T10 (saveGame → clear → loadGame, vérifie que les 11 slots sont restaurés à l'identique). 5.4 : couvert par T5 existant (migration `acc/armor` → 11 slots). 5.5 : 29 scénarios verts. `bonusHpMax` test omis (hors-scope V1). |

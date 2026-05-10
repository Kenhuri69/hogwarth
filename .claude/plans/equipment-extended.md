# Plan d'exécution — Système d'équipement étendu

Branche : `claude/game-equipment-system-plan-zrXwI`

> Ce document est la **source de vérité** entre sessions Claude.
> Convention : `[ ]` pending · `[~]` in progress · `[x]` done.
> À chaque étape franchie : cocher la case, mettre à jour le statut global, ajouter une ligne dans le journal en bas.

**Statut global** : 13 / 53 étapes — Phases 1-2 terminées, Phase 3 à venir

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

- [ ] **3.1** `data.js` — ajouter ~25 nouveaux items (après filtrage des familles déjà couvertes). Champs : `id, name, icon, desc, type:"acc", slot, family, tint, rarity, bonus*, price`.
- [ ] **3.2** `data.js` — backfill de `slot`/`family`/`rarity` sur les items existants (cf. §1.5).

### 6.3 Boutique progressive

- [ ] **3.3** `shop.js — SHOP_CATALOG` : étoffer avec les nouveaux items, distribués par `minFloor` selon le tableau ci-dessous (à finaliser à l'étape) :

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

- [ ] **3.4** `monsters.js` — distribuer les nouveaux items via `drops[]` :
    - Gobelin Rebelle / Troll → `hands_gloves`, `belt_leather` (chance 0.04).
    - Bundimun → `feet_boots` (chance 0.05).
    - Mangemort Masqué → `cloak_traveler` (chance 0.08).
    - Centaure Hostile → `ring_silver` (chance 0.06).
    - Hippogriffe → `trinket_snitch` (chance 0.03).
    - Boss (Bellatrix, Voldemort) → variantes rare/épique (chance 0.10–0.20).

### 6.5 Coffres — loot table par étage

- [ ] **3.5** `movement.js — openChest()` : remplacer le tirage actuel par une **loot table** déclarative dans `data.js` (`CHEST_LOOT_TABLE`) qui pondère par étage. Chaque coffre tire 1–2 items + or. Inclut :
    - 60% items consommables (potions, mandragore)
    - 25% équipement (selon étage, common/rare)
    - 15% livre de sort

### 6.6 Nouvelles quêtes

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

- [ ] **4.1** Trancher : sprite sheet runtime vs PNG individuels post-découpe (recommandation : individuels).
- [ ] **4.2** Script `tools/split_atlas.py` : prend un PNG NxN + un manifeste JSON `{nom_famille: [x,y,w,h]}` → exporte des PNG individuels avec rembg/alpha-matting si besoin.
- [ ] **4.3** Atlas **Slot icons génériques** (8 nouveaux : `head, hands, feet, cloak, amulet, ring, belt, trinket`) — pour `EQUIPMENT_SLOT_ICONS` (placeholder par slot).
- [ ] **4.4** Atlas **wand** — 3 familles (`oak, elder, phoenix`).
- [ ] **4.5** Atlas **head** — 3 familles (`hat, hood, circlet`).
- [ ] **4.6** Atlas **body** — 3 familles (`robe, chain, dueling`).
- [ ] **4.7** Atlas **hands** — 3 familles (`gloves, mittens, dragonhide`).
- [ ] **4.8** Atlas **feet** — 3 familles (`boots, sandals, dragonhide`).
- [ ] **4.9** Atlas **cloak** — 3 familles (`school, traveler, invisibility`).
- [ ] **4.10** Atlas **amulet** — 3 familles (`phoenix, serpent, protection`).
- [ ] **4.11** Atlas **ring** — 3 familles (`silver, runed, resurrection`).
- [ ] **4.12** Atlas **belt** — 3 familles (`leather, potionsmith, dueling`).
- [ ] **4.13** Atlas **trinket** — 3 familles (`broom, timeturner, snitch`).
- [ ] **4.14** `item-icons.js — ITEM_ICON_REGISTRY` : ajouter une entrée par nouvel item (33 entrées).

### 7.3 Workflow de génération (un atlas à la fois)

1. Claude rédige le prompt de génération (style Poudlard, fond transparent,
   grille NxN, chaque cellule = 1 famille du slot, vue de 3/4 ou face).
2. L'utilisateur colle l'image générée dans la conversation.
3. Claude exécute `tools/split_atlas.py img/raw/<slot>.png manifest.json` →
   produit `img/icons/items/<slot>/<family>.png` (transparents).
4. Claude met à jour `ITEM_ICON_REGISTRY` et coche la case.

---

## 8. Phase 5 — Documentation & tests

- [ ] **5.1** `CLAUDE.md` : mettre à jour la section « Système d'équipement » pour décrire les 11 slots, le champ `slot`, le champ `tint`/`rarity`, et l'évolution de `recalculateStats()`.
- [ ] **5.2** `CLAUDE.md` : table mise à jour des items équipables (au moins par catégorie, pas exhaustive).
- [ ] **5.3** `tests/smoke.js` — nouveau scénario « équipement étendu » :
    - Vérifier que `party[0].equipped` a 11 clés après chargement.
    - Pousser un item de chaque slot dans `inventory`, équiper, vérifier que les bonus s'appliquent.
    - Équiper 2 anneaux → vérifier `ring1` puis `ring2`.
    - Équiper un item avec `bonusHpMax:+10` sur un perso à PV pleins → `hpMax` augmente, `hp` reste valide (pas > hpMax).
    - Save → reload → tous les slots intacts.
- [ ] **5.4** `tests/smoke.js` — scénario « migration save legacy » :
    - Charger une save synthétique avec uniquement `equipped: {wand, armor, acc}` → vérifier que `_applyState` complète les nouveaux slots à `null` sans crash.
- [ ] **5.5** Run complet `node tests/smoke.js` — tous scénarios verts.

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

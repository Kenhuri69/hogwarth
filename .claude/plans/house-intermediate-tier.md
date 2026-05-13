# Plan — Tier 2 bis Maison : item remis par PNJ Chef de Maison

> Plan vivant (cf. `.claude/guidelines.md` §5). Cocher les étapes au fur et à mesure.
> Statut au démarrage : non implémenté.
>
> **Refonte (révision 2)** : à la demande du dev, **toutes** les récompenses
> Maison qui distribuent un objet (tier 2 et tier 4) ne tombent plus
> automatiquement dans l'inventaire. Le bonus de stats reste immédiat, mais
> **l'item doit être réclamé en personne auprès du Chef de Maison**.

## 1. Contexte

Audit du système Maison (CLAUDE.md + `state.js:68-113`) :

| Tier | Seuil | Récompense actuelle | Atteint vers… |
|-----:|------:|---------------------|---------------|
| 1 | 100 pts  | +1 stat principale | étage 2 |
| 2 | 300 pts  | +1 stat + 1 LCK | étage 4-5 |
| 3 | 600 pts  | +2 stat principale | étage 7-8 |
| 4 | 1000 pts | Item légendaire (sword_gryff, locket_slytherin…) | étage 10+ |

**Constat du top-10** (#3) : la Maison est ressentie comme **cosmétique
en early/mid-game** : +1 ATK à l'étage 2 = +20 % sur 5 dégâts, imperceptible.
Le seul effet *visible* arrive au tier 4 (item légendaire) qui se débloque
trop tard pour la majorité des runs (étage 10+).

**Objectifs** :
1. Injecter un **item rare** au tier 2 (300 pts), accessible mid-game.
2. **Ancrer la Maison dans le monde** : les items ne tombent plus du ciel
   — ils sont remis solennellement par le Chef de Maison correspondant.
   Cela crée une boucle « atteindre seuil → message d'annonce → aller voir
   le prof » qui matérialise narrativement l'appartenance.

## 2. Conception

### 2.1 Choix des items tier 2

Critères :
- **Rarity `rare`** (bordure visible mais pas légendaire — on garde l'aura T4 intacte).
- **Slot peu disputé en mid-game** pour ne pas forcer un arbitrage avec
  wand2 / robe1 / amulette.
- **Stats cohérentes** : +2 sur la stat majeure (entre les +1 ATK des
  équipements basiques et les +4-8 des items légendaires).

| Maison      | Item                  | Slot     | Bonus                | Remise par |
|-------------|-----------------------|----------|----------------------|-----------|
| Gryffondor  | Brassard du Lion      | `hands`  | ATK +2, LCK +1       | McGonagall (existant) |
| Serpentard  | Anneau du Serpent     | `ring`   | MAG +2, LCK +1       | Rogue (nouveau) |
| Serdaigle   | Plume d'Aigle         | `trinket`| MAG +2, INT +1       | Flitwick (nouveau) |
| Poufsouffle | Ceinture du Blaireau  | `belt`   | DEF +2, END +1       | Chourave (nouveau) |

Tous : `rarity: 'rare'`, `price: 0`, `family` propre par maison.

> Les emojis dans les déclarations `data.js` (étape 1) sont des fallbacks
> texte uniquement. Le rendu effectif passe par les PNG painterly
> générés via `icon_factory.py` (voir §2.7 — un SVG part de base + un
> emblème de Maison par item, palette héritée du blason existant).

### 2.2 Nouveau flux de distribution

Code actuel (`main.js:174-207`) :
- `checkHouseLevelUp` applique stats **et** distribue immédiatement
  l'item via `tryAddItem` quand `tier.bonus.item` est défini.

Code cible :
- `checkHouseLevelUp` applique **uniquement les stats**, et ajoute l'ID
  de l'item à un nouvel état `pendingHouseRewards: Set<itemId>`.
- Le `msg` du palier renvoie le joueur vers le Chef de Maison :
  « 🦁 Bravoure éprouvée ! +1 ATK +1 LCK — le Brassard du Lion vous attend
  auprès du Pr McGonagall. »
- À la visite du Chef de Maison, une action spéciale **`claim_house_reward`**
  remet **toutes** les récompenses en attente pour cette Maison, retire
  les IDs du Set, déclenche un autosave.

### 2.3 Nouvel état persisté : `pendingHouseRewards`

```js
// state.js (à côté de housePoints/houseTier)
let pendingHouseRewards = new Set();   // Set<itemId>

// save.js — _serializeState / _applyState
// Sérialisé en Array.from, restauré en new Set(arr || [])
```

Avantages d'un `Set<itemId>` (vs `Set<tierIndex>`) :
- Découplé du tier numéro — facile d'ajouter tier 5 plus tard.
- Idempotent (un même id ne peut être en attente deux fois).
- Trivialement testable (`pendingHouseRewards.has('brassard_lion')`).

### 2.4 PNJ Chefs de Maison

McGonagall existe déjà (`npcs.js:246`, étage 5, titre « Directrice de
Gryffondor »). On lui **ajoute** une `specialAction`. Les 3 autres profs
sont **nouveaux** :

| PNJ                  | Maison      | Étage | Localisation narrative | Portrait |
|----------------------|-------------|-------|------------------------|----------|
| Pr McGonagall        | Gryffondor  | 5     | Tour de Gryffondor     | `img/npc/mcgonagall.png` (existant) |
| Pr Severus Rogue     | Serpentard  | 4     | Cachots / labo potions | `img/npc/rogue.png` (à fournir ou fallback emoji) |
| Pr Filius Flitwick   | Serdaigle   | 6     | Salle de Sortilèges    | `img/npc/flitwick.png` (idem) |
| Pr Pomona Chourave   | Poufsouffle | 3     | Serres / Botanique     | `img/npc/sprout.png` (idem) |

**Placement** : choisi pour que le PNJ soit **proche du seuil tier 2**
(300 pts ≈ étage 4-5 normalement). Si le seuil est atteint à un étage
inférieur au placement du PNJ, l'item reste en attente jusqu'à la
descente : c'est un *feature*, pas un bug — ça encourage la descente.

**Sans image** : si `portraitImg` pointe vers un fichier absent, le
fallback emoji du champ `icon` reste affiché ; aucune erreur. À court
terme on accepte l'emoji ; les portraits PNG arriveront dans une PR
séparée (hors-scope §6).

### 2.5 Action spéciale `claim_house_reward`

Structure dans le PNJ :
```js
specialAction: {
  type:  'claim_house_reward',
  house: 'Gryffondor',
  label: '🎁 Recevoir votre récompense'   // affiché conditionnellement
}
```

**Logique d'affichage du bouton** (dans `_npcDialogActions`) :
- Bouton **caché** sauf si :
  - `chosenHouse === npc.specialAction.house` ET
  - `pendingHouseRewards.size > 0` ET
  - au moins une entrée du Set est un item « appartenant » à cette Maison
    (lookup : `HOUSE_BONUSES[house].tiers.find(t => t.bonus.item === id)`).

**Dispatcher** (dans `triggerNpcSpecialAction`, nouveau cas
`claim_house_reward`) :
- Récupère les IDs en attente pour cette Maison.
- Pour chaque : `tryAddItem(item, { silent: true })`. Si l'inventaire
  est plein, on n'enlève **pas** du Set (le joueur reviendra) et on
  affiche `addMsg("L'inventaire est plein — libérez de la place.", 'bad')`.
- Sinon, retire du Set, addMsg `🎁 {icon} {name} vous est remis(e) par
  {npc.title}.`, joue `playLevelUp`, déclenche `autoSave('house-reward')`.
- Pas `oneShot` : si une 2e récompense devient en attente (tier 4),
  l'action redevient cliquable.

### 2.6 Marker minimap

`getNpcMarkerSign(npcId)` doit retourner **🎁** (ou ❗ doré) si le PNJ
a une récompense Maison en attente pour le joueur. Priorité par-dessus
le marker quête s'il y en a un (la récompense Maison est plus rare et
plus saillante). Lookup léger via `pendingHouseRewards` + match
`specialAction.house`.

### 2.7 Conception visuelle des icônes (pipeline `icon_factory.py`)

Le projet ne fonctionne **pas** à l'emoji pour les items : `js/item-icons.js`
expose `ITEM_ICON_REGISTRY` (priorité 1) et `ITEM_ICONS_NEW` (priorité 2,
PNG painterly multi-tailles 16/24/32/48/64) générés par
`tools/icon_factory.py` à partir de :
- **SVG parts** dans `tools/parts/` (silhouette mono-couleur avec
  `data-region="<nom>"` par zone) ;
- **recettes** dans `icon_factory.py` qui associent à chaque item :
  parts utilisés, couleurs par région, rareté, palette de halo.

Les emojis `🥊 💍 🪶 🪢` du tableau §2.1 ne sont qu'un placeholder pour
la liste écran avant rendu PNG. Le rendu final doit suivre le pipeline,
**et incorporer le symbole de la Maison** pour qu'on identifie l'item
au coup d'œil.

#### 2.7.1 Parts SVG nécessaires

| Item                  | Part de base       | À créer ? |
|-----------------------|--------------------|-----------|
| Brassard du Lion      | `glove.svg`        | ✓ existe |
| Anneau du Serpent     | `ring.svg`         | **à créer** (anneau + monture gemme) |
| Plume d'Aigle         | `feather.svg`      | **à créer** (vexille + rachis) |
| Ceinture du Blaireau  | `belt.svg`         | ✓ existe |

Pour les 2 nouveaux parts : silhouette mono-couleur `#000000`, viewBox
`0 0 512 512`, 3-5 régions max (`band`, `gem`, `setting` pour `ring` ;
`vane`, `rachis`, `quill` pour `feather`), conforme au style des parts
existants.

#### 2.7.2 Symbole de Maison incrusté

Quatre nouveaux parts emblème simples (silhouette plate centrée
~140×140 px sur viewBox 512) :
- `tools/parts/emblem-lion.svg` (Gryffondor)
- `tools/parts/emblem-snake.svg` (Serpentard)
- `tools/parts/emblem-eagle.svg` (Serdaigle)
- `tools/parts/emblem-badger.svg` (Poufsouffle)

Référence visuelle : `img/houses/<maison>.png` (blasons painterly déjà
livrés). Mais on ne réutilise pas les PNG des blasons en couche
brute — on en extrait la silhouette de l'animal pour produire un
mono-SVG cohérent avec le pipeline. Une seule région `data-region="emblem"`
peinte en couleur d'accent de la Maison (or pour Gryffondor /
Poufsouffle, argent pour Serpentard, bronze pour Serdaigle).

Compositing dans la recette : `emblem-<animal>` superposé centré sur
l'item de base, opacité 0.85, après la passe RIM-LIGHT et avant
SPECULAR — pour que le symbole capte un peu de la lumière directionnelle.

#### 2.7.3 Palette par Maison (régions de l'item)

Réutilise les couleurs déjà définies dans `HOUSE_BONUSES` :

| Maison      | Dominante         | Accent             | Halo rareté (`rare`) |
|-------------|-------------------|--------------------|----------------------|
| Gryffondor  | rouge `#740001`   | or `#D3A625`       | halo or chaud         |
| Serpentard  | vert `#1A472A`    | argent `#AAAAAA`   | halo vert froid       |
| Serdaigle   | bleu `#0E1A40`    | bronze `#946B2D`   | halo bleu nuit        |
| Poufsouffle | brun `#372E29`    | or `#F0C75E`       | halo or doux          |

Régions par item :
- Brassard du Lion : `cuff` rouge, `palm/fingers` brun-cuir, `stitch` or, emblème lion or.
- Anneau du Serpent : `band` argent, `setting` argent oxydé, `gem` émeraude, emblème serpent argent.
- Plume d'Aigle : `vane` bleu nuit dégradé, `rachis` bronze, emblème aigle bronze.
- Ceinture du Blaireau : `strap` brun, `buckle` or, `holes/tongue` or sombre, emblème blaireau or.

#### 2.7.4 Recettes dans `icon_factory.py`

4 nouvelles entrées dans le dict `RECIPES` du factory, sur le modèle
des items existants (voir `sword_gryff`, `coupe_poufsouffle` dans le
fichier). Chaque recette spécifie :
- `parts` : `[base_part, 'emblem-<animal>']`
- `colors` : map `data-region → hex`
- `rarity` : `'rare'` (pilote le halo)
- `extra_passes` optionnel si besoin (ex. pour la gemme de l'anneau)

#### 2.7.5 Génération et intégration

```bash
python tools/icon_factory.py brassard_lion anneau_serpent plume_aigle ceinture_blaireau
```
Produit 20 PNG (4 items × 5 tailles) dans `img/icons_new/`.

Puis ajouter dans `js/item-icons.js` :
```js
// ITEM_ICONS_NEW (lignes ~127) — pattern existant
brassard_lion:    'img/icons_new/brassard_lion_64.png',
anneau_serpent:   'img/icons_new/anneau_serpent_64.png',
plume_aigle:      'img/icons_new/plume_aigle_64.png',
ceinture_blaireau:'img/icons_new/ceinture_blaireau_64.png',
```

Le champ `icon` dans `data.js` reste un emoji (fallback texte si le
PNG ne charge pas — pattern déjà en place pour les autres items).

### 2.8 Message d'annonce au palier

Format unifié :
```
🦁 Bravoure éprouvée ! +1 ATK +1 LCK — le Brassard du Lion vous attend auprès du Pr McGonagall (étage 5).
```
Le numéro d'étage est lu depuis `npc.placement.floor` au moment de
l'annonce (le PNJ est résolu via `HOUSE_BONUSES[house].headOfHouse`,
un nouveau champ — voir §4 étape 2).

## 3. Contraintes

| # | Contrainte |
|---|-----------|
| C1 | Aucune régression : `node tests/smoke.js` vert avant push. |
| C2 | Inventaire plein → record reste en attente, le joueur revient. Pas de perte silencieuse. |
| C3 | Save legacy : item déjà distribué automatiquement (ancien code) → ne PAS le redistribuer. Migration : vérifier la présence avant de pousser dans `pendingHouseRewards`. |
| C4 | `pendingHouseRewards` sérialisé / restauré dans save (`_serializeState` / `_applyState`). |
| C5 | `_npcDialogActions` actuel cache l'action via `_isSpecialActionSpent` — pour `claim_house_reward` on **bypass** ce mécanisme et on utilise une condition propre (`_canClaimHouseReward(npc)`). |
| C6 | Le marker 🎁 ne doit pas apparaître si le PNJ n'est pas de la bonne Maison (sinon, après avoir choisi Serpentard, McGonagall montrerait quand même un cadeau — incohérent). |
| C7 | `loader.js` MANIFEST : ajouter `pendingHouseRewards` (kind `obj`) si on veut le tracer, sinon pas critique. |

## 4. Découpage en étapes

### Étape 0 — Assets visuels (parts SVG + recettes + PNG) ✅

**Écart constaté au démarrage** : le factory dispose déjà de deux
mécanismes qui rendent inutile la création de 6 SVG :
- `shapes.ring_band` (paramétrique) couvre l'Anneau du Serpent — pas
  besoin de `tools/parts/ring.svg`.
- `_SYMBOL_PATHS` + accent `{"kind": "symbol", …}` (cf. `icon_factory.py:765+`)
  centre un glyph nommé sur n'importe quelle région — pile l'usage prévu
  pour l'emblème de Maison. Pas besoin de 4 fichiers `emblem-*.svg` ni
  de modifier `_build_silhouette_svg` pour composer plusieurs parts.

Scope réel exécuté :

- [x] Créer `tools/parts/feather.svg` (regions `vane`, `rachis`, `quill`).
- [x] Ajouter 3 entrées dans `_SYMBOL_PATHS` (`lion`, `eagle`, `badger`).
  `snake` y était déjà — réutilisé.
- [x] Décision : pas de symbole emblème sur l'Anneau du Serpent — la
  centroïde du masque `metal` (donut + bezel) tombe dans le trou central
  du ring, donc le symbole serait crop-out par le masque. L'identité
  Serpentard est portée par la gemme émeraude + accents runiques. Le
  nom de l'item suffit à signaler le serpent.
- [x] Ajouter 4 recettes dans `tools/icon_factory.py` (`brassard_lion`,
  `anneau_serpent`, `plume_aigle`, `ceinture_blaireau`).
- [x] Générer les PNG :
  ```bash
  python3 tools/icon_factory.py brassard_lion anneau_serpent plume_aigle ceinture_blaireau
  ```
  → 20 PNG dans `img/icons_new/`.
- [x] Référencer dans `js/item-icons.js` (`ITEM_ICON_NEW_REGISTRY`) —
  4 entrées pointant vers les `_64.png`.
- **Vérif visuelle (64px + 32px)** : les 4 items ont des silhouettes et
  palettes distinctes par Maison. Brassard = lion gold sur cuir + cuff
  rouge ; Anneau = argent + gemme émeraude ; Plume = vane bleu nuit +
  rachis bronze + eagle bronze ; Ceinture = strap brun + buckle or +
  badger or. Lisibles dès 32px.
- **Vérif technique** : `git status` montre 20 nouveaux PNG dans
  `img/icons_new/`, 1 nouveau SVG (`feather.svg`), +4 recettes et
  +3 glyphs dans `icon_factory.py`, +4 entrées dans `item-icons.js`.

### Étape 1 — 4 nouveaux items dans `data.js` ✅

**Écarts au plan** :
- `type:"acc"` (pas `"armor"`) pour `brassard_lion` et `ceinture_blaireau` —
  alignement sur la convention codebase (cf. `gants_apprenti`, `ceinture_cuir`
  qui sont aussi des items hands/belt typés `acc`).
- Champ `power` ajouté (=2 pour tous, miroir du bonus principal) —
  cohérent avec les autres items équipables.
- Alias 4 entrées dans `ITEM_ICON_REGISTRY` (cf. `js/item-icons.js`) sur
  les PNG du slot le plus proche — exigé par le smoke test scénario 21
  (couverture 100 % ITEMS[]). Le runtime utilise le PNG painterly via
  `ITEM_ICON_NEW_REGISTRY` (priorité 1).

- [x] Ajouter à `ITEMS[]` (juste après les items légendaires existants) :
  ```js
  // Items Tier 2 Maison (300 pts) — remis par les Chefs de Maison
  { id: 'brassard_lion',     name: 'Brassard du Lion',
    icon: '🥊', type: 'armor', slot: 'hands',  family: 'gryff_t2',
    rarity: 'rare', price: 0, bonusAtk: 2, bonusLck: 1,
    desc: 'Cuir tanné aux couleurs rouge et or — fierté gryffondorienne.' },
  { id: 'anneau_serpent',    name: 'Anneau du Serpent',
    icon: '💍', type: 'acc',   slot: 'ring',   family: 'slyth_t2',
    rarity: 'rare', price: 0, bonusMag: 2, bonusLck: 1,
    desc: 'Argent ciselé enroulé sur lui-même, gemme émeraude.' },
  { id: 'plume_aigle',       name: "Plume d'Aigle",
    icon: '🪶', type: 'acc',   slot: 'trinket', family: 'raven_t2',
    rarity: 'rare', price: 0, bonusMag: 2, bonusInt: 1,
    desc: "Plume immaculée d'un aigle des Highlands ; bleue à reflets bronze." },
  { id: 'ceinture_blaireau', name: 'Ceinture du Blaireau',
    icon: '🪢', type: 'armor', slot: 'belt',   family: 'pouf_t2',
    rarity: 'rare', price: 0, bonusDef: 2, bonusEnd: 1,
    desc: 'Cuir épais brodé jaune et noir — solide et discret.' }
  ```
- **Vérif** : `ITEMS.find(i => i.id === 'brassard_lion').rarity === 'rare'`.

### Étape 2 — `HOUSE_BONUSES` : tier 2 enrichi + `headOfHouse` ✅

**Décision** : tier 5 conserve sa distribution directe (post-victoire,
cinématique endgame Tranche 2). Seuls tier 2 et tier 4 passent par
`pendingHouseRewards`. Les `msg` du tier 4 ont aussi été reformulés
pour rediriger vers le Chef de Maison (cohérence avec tier 2).

`pendingHouseRewards = new Set()` ajouté à côté de `chosenHouse /
housePoints / houseTier` dans `state.js`. Pas d'ajout au MANIFEST du
loader : les `let` mutables d'état ne sont pas tracés (cf.
`chosenHouse`, `housePoints` non manifestés non plus).

- [x] Pour chaque Maison dans `state.js`, ajouter un champ `headOfHouse`
  pointant vers l'ID du PNJ, et conserver `bonus.item` sur tier 2 et 4 :
  ```js
  Gryffondor: {
    color: '#740001', /* … */
    headOfHouse: 'mcgonagall',     // ← nouveau
    tiers: [
      { threshold: 100, /* … */ bonus: { _baseAtk: 1 } },
      { threshold: 300, label: 'Élève',
        bonus: { _baseAtk: 1, _baseLck: 1, item: 'brassard_lion' },
        msg: '🦁 Bravoure éprouvée ! +1 ATK +1 LCK — le Brassard du Lion vous attend auprès du Pr McGonagall.' },
      { threshold: 600, /* … */ bonus: { _baseAtk: 2 } },
      { threshold: 1000, label: 'Champion',
        bonus: { item: 'sword_gryff' },
        msg: "🦁 L'Épée de Gryffondor vous attend auprès du Pr McGonagall." },
    ]
  }
  // idem Serpentard → headOfHouse: 'rogue',     items: anneau_serpent / locket_slytherin
  // idem Serdaigle  → headOfHouse: 'flitwick',  items: plume_aigle / diademe_serdaigle
  // idem Poufsouffle→ headOfHouse: 'sprout',    items: ceinture_blaireau / coupe_poufsouffle
  ```
- **Vérif** : `HOUSE_BONUSES.Gryffondor.headOfHouse === 'mcgonagall'`.

### Étape 3 — Refonte `checkHouseLevelUp` (main.js) ✅

**Décision** : la discrimination tier 2/4 vs tier 5 utilise `tierNum >= 5`.
Tier 5 conserve `tryAddItem` direct (cinématique post-victoire endgame).
Tier 2 et tier 4 vont dans `pendingHouseRewards.add(...)`.

Le `msg` du tier est suffisant pour annoncer le PNJ (rédigé à l'étape 2),
pas de second `addMsg` redondant.

- [x] Branche `tier.bonus.item` refactorée :
  ```js
  if (tier.bonus.item) {
    pendingHouseRewards.add(tier.bonus.item);
    // pas de tryAddItem — l'item est remis par le Chef de Maison
  }
  ```
- Le `msg` du tier mentionne déjà le PNJ (étape 2). Pas de second
  `addMsg` redondant.
- **Vérif** : depuis la console — atteindre seuil 300 → stats appliquées,
  `pendingHouseRewards` contient `'brassard_lion'`, inventaire **inchangé**.

### Étape 4 — Ajout des 3 nouveaux PNJ dans `npcs.js`
- [ ] Ajouter Rogue (étage 4), Flitwick (étage 6), Chourave (étage 3) avec :
  ```js
  {
    id: 'rogue', name: 'Professeur Severus Rogue',
    title: 'Directeur de Serpentard', icon: '🦇',
    portraitImg: 'img/npc/rogue.png',
    placement: { floor: 4, anchor: 'any' },
    specialAction: { type: 'claim_house_reward', house: 'Serpentard',
                     label: '🎁 Recevoir votre récompense' },
    dialogues: {
      greeting: ["Tiens, tiens... un élève de ma maison qui se distingue.",
                 "L'ambition n'est rien sans la maîtrise. Voyons ce que vous méritez."],
      idle:     "Concentrez-vous. La distraction tue plus vite que les sortilèges.",
      idleSpent:"Vous avez déjà reçu votre dû. Au travail.",
      idleOtherHouse: "Que faites-vous dans mes cachots ? Hors de ma vue.",
    }
  }
  // Flitwick / Chourave : même structure, tons adaptés
  ```
- [ ] **Étendre McGonagall** : lui ajouter le bloc `specialAction` (sans
  toucher à ses dialogues existants ni à sa quête) :
  ```js
  specialAction: { type: 'claim_house_reward', house: 'Gryffondor',
                   label: '🎁 Recevoir votre récompense' }
  ```
- **Vérif** : `getNpcById('rogue').specialAction.house === 'Serpentard'`.

### Étape 5 — Dispatcher dans `npc-dialog.js`
- [ ] Ajouter le cas `claim_house_reward` dans `triggerNpcSpecialAction` :
  ```js
  if (action.type === 'claim_house_reward') {
    if (chosenHouse !== action.house) {
      addMsg('Ce professeur ne dirige pas votre Maison.', 'bad');
      return;
    }
    const houseItems = HOUSE_BONUSES[chosenHouse].tiers
      .map(t => t.bonus.item).filter(Boolean);
    const claimable = houseItems.filter(id => pendingHouseRewards.has(id));
    if (!claimable.length) {
      addMsg('Rien à recevoir pour le moment.', 'info');
      return;
    }
    let given = 0;
    for (const id of claimable) {
      const item = ITEMS.find(it => it.id === id);
      if (!item) continue;
      if (!tryAddItem(item, { silent: true })) {
        addMsg("Inventaire plein — libérez de la place et revenez.", 'bad');
        break;
      }
      pendingHouseRewards.delete(id);
      addMsg(`🎁 ${item.icon} ${item.name} vous est remis(e) par ${npc.title}.`, 'good');
      given++;
    }
    if (given) {
      AudioSystem.playLevelUp();
      updateUI();
      safeCall('autoSave', 'house-reward');
    }
    return;
  }
  ```
- [ ] Modifier `_npcDialogActions` pour utiliser un helper
  `_canClaimHouseReward(npc)` plutôt que `_isSpecialActionSpent` quand
  `npc.specialAction?.type === 'claim_house_reward'`.
- **Vérif** : aller voir Rogue avec `chosenHouse='Serpentard'` et
  `pendingHouseRewards.has('anneau_serpent')` → bouton visible →
  clic → item dans inventaire, Set vidé.

### Étape 6 — Marker minimap (`getNpcMarkerSign`)
- [ ] Avant la logique quête existante, vérifier si le PNJ a une
  récompense Maison disponible :
  ```js
  if (npc.specialAction?.type === 'claim_house_reward'
      && chosenHouse === npc.specialAction.house) {
    const houseItems = HOUSE_BONUSES[chosenHouse].tiers
      .map(t => t.bonus.item).filter(Boolean);
    if (houseItems.some(id => pendingHouseRewards.has(id))) return '🎁';
  }
  ```
- **Vérif** : marker 🎁 apparaît sur la case McGonagall quand on a
  passé le seuil 300 (Gryffondor) ; disparaît après réclamation.

### Étape 7 — Persistance (`save.js`)
- [ ] Dans `_serializeState` : `pendingHouseRewards: Array.from(pendingHouseRewards)`.
- [ ] Dans `_applyState` : `pendingHouseRewards = new Set(gs.pendingHouseRewards || [])`.
- [ ] Initialiser `pendingHouseRewards = new Set()` dans `state.js` et
  dans `main.js` lors de `Nouvelle aventure` (à côté de `housePoints = 0`).
- **Vérif** : save → reload → Set repeuplé.

### Étape 8 — Migration rétroactive (saves d'avant cette PR)
- [ ] Helper one-shot `_migrateHouseRewards()` appelé à la fin de
  `_applyState` :
  ```js
  function _migrateHouseRewards() {
    if (!chosenHouse) return;
    const house = HOUSE_BONUSES[chosenHouse]; if (!house) return;
    house.tiers.forEach((tier, i) => {
      if (houseTier < i + 1) return;
      if (!tier.bonus.item) return;
      const itemId = tier.bonus.item;
      // Possède déjà (inventaire ou équipé) → rien à faire
      const has = (player.inventory || []).some(it => it && it.id === itemId)
              || party.some(c => c.equipped &&
                   Object.values(c.equipped).some(it => it && it.id === itemId));
      if (has) return;
      // Sinon → en attente chez le Chef de Maison
      pendingHouseRewards.add(itemId);
    });
  }
  ```
- **Vérif** : charger une vieille save tier 4 où l'épée Gryff a été
  vendue/perdue → l'épée reste perdue (le joueur l'a eue) et **n'est pas**
  remise en attente (présence vérifiée *historiquement* impossible — on
  ne migre que ce qui n'a jamais été reçu).

  > Limitation acceptée : on ne distingue pas « possédé puis vendu » de
  > « jamais reçu ». Si un joueur a vendu son épée Gryff avant cette PR,
  > la migration la remettra en attente. Acceptable car cas extrême et
  > avantageux pour le joueur.

### Étape 9 — Smoke test (`tests/smoke.js`)
- [ ] Nouveau scénario `scenarioHouseRewardFlow` :
  ```js
  async function scenarioHouseRewardFlow() {
    console.log('\n── Scénario : Récompense Maison remise par PNJ ──');
    const { browser, page, errors } = await launchGame();
    await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

    // T1 : franchir seuil 300 → item en attente, pas dans inventaire
    const t1 = await page.evaluate(() => {
      chosenHouse = 'Gryffondor'; housePoints = 300; houseTier = 1;
      checkHouseLevelUp();
      return {
        tier:    houseTier,
        pending: pendingHouseRewards.has('brassard_lion'),
        inInv:   (player.inventory || []).some(i => i && i.id === 'brassard_lion'),
        atkBoosted: party[0]._baseAtk > 5
      };
    });
    assert(t1.tier === 2, 'tier non passé à 2');
    assert(t1.pending, 'brassard non mis en attente');
    assert(!t1.inInv, 'brassard distribué automatiquement (bug)');
    assert(t1.atkBoosted, 'bonus ATK non appliqué');

    // T2 : visite McGonagall → réception
    const t2 = await page.evaluate(() => {
      triggerNpcSpecialAction('mcgonagall');
      return {
        pending: pendingHouseRewards.has('brassard_lion'),
        inInv:   (player.inventory || []).some(i => i && i.id === 'brassard_lion')
      };
    });
    assert(!t2.pending, 'brassard toujours en attente après réclamation');
    assert(t2.inInv, 'brassard absent après réclamation');

    // T3 : autre Maison → refus
    const t3 = await page.evaluate(() => {
      chosenHouse = 'Serpentard';
      pendingHouseRewards.add('anneau_serpent');
      triggerNpcSpecialAction('mcgonagall');   // pas la bonne Maison
      return pendingHouseRewards.has('anneau_serpent');
    });
    assert(t3, 'McGonagall a distribué une récompense Serpentard (bug)');

    // T4 : inventaire plein → record reste en attente
    const t4 = await page.evaluate(() => {
      chosenHouse = 'Serpentard';
      pendingHouseRewards.add('anneau_serpent');
      // Bourrer l'inventaire à 16
      player.inventory = Array.from({ length: 16 }, () => ({
        id: 'potion_s', name: 'Potion', icon: '🧪', type: 'consumable' }));
      triggerNpcSpecialAction('rogue');
      return pendingHouseRewards.has('anneau_serpent');
    });
    assert(t4, 'anneau perdu silencieusement (inventaire plein)');

    if (errors.length) throw new Error(`${errors.length} erreurs JS`);
    console.log('  ✅ Flow récompense Maison conforme');
    await browser.close();
  }
  ```
- Ajouter à `scenarios = […, scenarioHouseRewardFlow, …]`.

### Étape 10 — Commit & push
- [ ] Branche : `claude/house-reward-by-npc` (depuis master à jour)
- [ ] Message : `feat(house): récompenses tier 2/4 remises par les Chefs de Maison`
- [ ] Vérifier guidelines §6 avant push (état de la PR liée).

## 5. Ce qui ne change pas (sanity)

- Tier 1 et tier 3 : bonus de stats uniquement, comportement strictement
  identique (pas d'item, pas de visite PNJ requise).
- Bonus de stats du tier 2 / tier 4 : appliqués **immédiatement** au
  franchissement du seuil — la visite chez le prof ne concerne que l'item.
- `tryAddItem` reste utilisé tel quel pour la distribution effective.
- Architecture `specialAction` existante : un seul nouveau `type`
  (`claim_house_reward`), 4 entrées PNJ, pas de moteur custom.

## 6. Hors-scope

- Portraits PNG de Rogue / Flitwick / Chourave (PR art séparée — emoji
  fallback en attendant).
- Dialogues complets / quêtes de Rogue / Flitwick / Chourave (juste
  l'action de remise dans cette PR ; quêtes propres → V2).
- Tier 5 post-victoire (cf. ENDGAME_PLAN §7.7).
- Animation de réception d'item Maison (V2).

## 7. Estimation

- Étape 0 (parts SVG + emblèmes + recettes + PNG) : ~1h30
  - 6 SVG à créer (2 base + 4 emblèmes) : ~45 min
  - 4 recettes Python : ~20 min
  - Génération + revue visuelle multi-tailles : ~25 min
- Étape 1-2 (items + HOUSE_BONUSES) : 20 min
- Étape 3 (checkHouseLevelUp) : 10 min
- Étape 4 (3 nouveaux PNJ + extension McGonagall) : 30 min
- Étape 5-6 (dispatcher + marker) : 30 min
- Étape 7-8 (save + migration) : 20 min
- Étape 9 (smoke) : 40 min
- Étape 10 (commit/push) : 10 min
- **Total : ~4h** (vs ~2h30 sans assets visuels). Le coût art (~1h30)
  conditionne la qualité de l'identité Maison à l'écran — sans lui,
  les 4 items resteraient des emojis indistincts dans l'inventaire,
  ce qui irait à l'encontre de l'objectif « rendre la Maison visible ».

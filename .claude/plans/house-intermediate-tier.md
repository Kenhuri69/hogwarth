# Plan — Tier 2 bis Maison : item à 300 points

> Plan vivant (cf. `.claude/guidelines.md` §5). Cocher les étapes au fur et à mesure.
> Statut au démarrage : non implémenté.

## 1. Contexte

Audit du système Maison (CLAUDE.md + `state.js:68-113`) :

| Tier | Seuil | Récompense actuelle | Atteint vers… |
|-----:|------:|---------------------|---------------|
| 1 | 100 pts  | +1 stat principale | étage 2 |
| 2 | 300 pts  | +1 stat + 1 LCK | étage 4-5 |
| 3 | 600 pts  | +2 stat principale | étage 7-8 |
| 4 | 1000 pts | Item légendaire (sword_gryff, locket_slytherin…) | étage 10+ |

**Constat du top-10** (#3) : la Maison est ressentie comme **cosmétique
en early/mid-game** parce que +1 ATK sur Harry (ATK base 5) à l'étage 2
représente +20 % de dégâts sur une base de 5 — imperceptible quand les
monstres ont DEF 2-5. Le seul effet *visible* arrive au tier 4 (item
légendaire) qui se débloque trop tard pour la majorité des runs (étage
10+ correspond au mur de difficulté solo).

**Objectif** : injecter un **item rare** au tier 2 (300 pts), accessible
mid-game, qui matérialise le bonus de Maison sans casser la progression
légendaire du tier 4. Pas remplacer le bonus de stats existant — ajouter
un item **en plus**, à la même étape de palier.

## 2. Conception

### 2.1 Choix des items

Critères :
- **Rarity `rare`** (visible dans l'inventaire grâce à la bordure, mais
  pas légendaire — on garde l'aura T4 intacte).
- **Slot peu disputé en mid-game** pour ne pas forcer le joueur à
  arbitrer entre l'item de Maison et son équipement principal de l'étage
  (typiquement wand2, robe1, amulette).
- **Stats cohérentes avec l'identité de la Maison**, dans une fourchette
  de +2 sur la stat majeure (entre le +1 ATK des wand1/dague basique et
  le +4-8 des items légendaires).

| Maison      | Item                  | Slot     | Bonus                | Raison du slot |
|-------------|-----------------------|----------|----------------------|----------------|
| Gryffondor  | Brassard du Lion      | `hands`  | ATK +2, LCK +1       | `hands` souvent vide mid-game ; cohérent avec un boost martial |
| Serpentard  | Anneau du Serpent     | `ring`   | MAG +2, LCK +1       | route `ring1` puis `ring2` via `_resolveSlotForItem` — toujours libre |
| Serdaigle   | Plume d'Aigle         | `trinket`| MAG +2, INT +1       | `trinket` peu utilisé avant l'épée Gryff ou retourneur de temps |
| Poufsouffle | Ceinture du Blaireau  | `belt`   | DEF +2, END +1       | `belt` rarement équipé mid-game ; END boost survie cohérent |

Tous : `rarity: 'rare'`, `price: 0` (non vendable au shop par convention
des items spéciaux), `family` propre par maison pour distinction.

### 2.2 Cumul stats + item au tier 2

Lecture du code (`main.js:174-207`) :
- `checkHouseLevelUp()` itère sur les tiers et applique :
  - les bonus de stat `_baseAtk / _baseDef / _baseMag / _baseLck`
  - **et** l'item si `tier.bonus.item` est défini
- **Les deux blocs sont indépendants** — un tier peut avoir les deux.

Donc le plan est de modifier la définition tier 2 dans `state.js` pour
**conserver le bonus de stats actuel** ET y ajouter `item: '<id>'`. Aucun
changement de logique métier requis.

### 2.3 Message de palier

Le `msg` actuel du tier 2 mentionne déjà les stats (ex. « Bravoure
éprouvée ! +1 ATK +1 LCK »). On enrichit : « Bravoure éprouvée ! +1 ATK
+1 LCK — le Brassard du Lion vous est offert. »

L'ajout d'item est affiché en plus du msg via `addMsg` ligne 200 :
`🎁 {icon} {name} ajouté à l'inventaire !`. Cohérent avec le tier 4.

## 3. Contraintes

| # | Contrainte |
|---|-----------|
| C1 | Aucune régression : `node tests/smoke.js` vert avant push. |
| C2 | Inventaire plein à 16 → l'item ne tombe pas, mais le bonus de stat s'applique quand même (cas existant déjà géré par `tryAddItem`). |
| C3 | Save legacy : un perso qui a déjà atteint 300 pts AVANT cette PR a `houseTier ≥ 2`, donc `checkHouseLevelUp` skippe ce tier (ligne 181). **Il faut une migration one-shot** pour pousser l'item rétroactivement aux saves qui étaient déjà au tier 2+. (Voir §4 étape 3.) |
| C4 | Ne pas casser le formatage parchemin/or des badges (rarity-rare bordure or pâle). |
| C5 | Pas de nouveau slot, pas de nouveau type d'item. |

## 4. Découpage en étapes

> Convention : `[ ]` à faire, `[x]` fait, `[~]` partiel/écart noté.

### Étape 1 — 4 nouveaux items dans `data.js`
- [ ] Ajouter à `ITEMS[]` (juste après les autres items équipables ; rester proche du groupement Maison existant — ex. sous `sword_gryff` / `locket_slytherin`) :
  ```js
  // Items Tier 2 Maison (300 pts) — cf. plan house-intermediate-tier
  { id: 'brassard_lion',   name: 'Brassard du Lion',
    icon: '🥊', type: 'armor',  slot: 'hands', family: 'gryff_t2',
    rarity: 'rare', price: 0, bonusAtk: 2, bonusLck: 1,
    desc: 'Cuir tanné aux couleurs rouge et or — fierté gryffondorienne.' },
  { id: 'anneau_serpent',  name: 'Anneau du Serpent',
    icon: '💍', type: 'acc',    slot: 'ring',  family: 'slyth_t2',
    rarity: 'rare', price: 0, bonusMag: 2, bonusLck: 1,
    desc: 'Argent ciselé enroulé sur lui-même, gemme émeraude.' },
  { id: 'plume_aigle',     name: "Plume d'Aigle",
    icon: '🪶', type: 'acc',    slot: 'trinket', family: 'raven_t2',
    rarity: 'rare', price: 0, bonusMag: 2, bonusInt: 1,
    desc: "Plume immaculée d'un aigle des Highlands ; bleue à reflets bronze." },
  { id: 'ceinture_blaireau', name: 'Ceinture du Blaireau',
    icon: '🪢', type: 'armor',  slot: 'belt',  family: 'pouf_t2',
    rarity: 'rare', price: 0, bonusDef: 2, bonusEnd: 1,
    desc: 'Cuir épais brodé aux couleurs jaune et noir — solide et discret.' }
  ```
- **Vérif** : `ITEMS.find(i => i.id === 'brassard_lion').rarity === 'rare'`. Loader manifest reste vert (ITEMS attendu).

### Étape 2 — Étendre `HOUSE_BONUSES` tier 2 dans `state.js`
- [ ] Modifier les 4 entrées tier 2 (lignes ~75, 86, 97, 108) pour ajouter `item:` :
  ```js
  // Gryffondor t2 (ligne ~75)
  { threshold: 300, label: 'Élève', bonus: { _baseAtk: 1, _baseLck: 1, item: 'brassard_lion' },
    msg: '🦁 Bravoure éprouvée ! +1 ATK +1 LCK — le Brassard du Lion vous revient.' },

  // Serpentard t2
  { threshold: 300, label: 'Élève', bonus: { _baseMag: 1, _baseLck: 1, item: 'anneau_serpent' },
    msg: "🐍 Ruse affûtée ! +1 MAG +1 LCK — l'Anneau du Serpent s'enroule sur votre doigt." },

  // Serdaigle t2
  { threshold: 300, label: 'Élève', bonus: { _baseMag: 1, _baseLck: 1, item: 'plume_aigle' },
    msg: "🦅 Esprit acéré ! +1 MAG +1 LCK — la Plume d'Aigle vous est offerte." },

  // Poufsouffle t2
  { threshold: 300, label: 'Élève', bonus: { _baseDef: 1, _baseLck: 1, item: 'ceinture_blaireau' },
    msg: '🦡 Loyauté récompensée ! +1 DEF +1 LCK — la Ceinture du Blaireau vous habille.' }
  ```
- **Vérif** : depuis la console — `chosenHouse = 'Gryffondor'; housePoints = 300; houseTier = 1; checkHouseLevelUp()` → tier passe à 2, `brassard_lion` se retrouve dans `player.inventory`, `addMsg` log lisible.

### Étape 3 — Migration rétroactive pour saves existantes
- [ ] Dans `main.js — checkHouseLevelUp()` ou via un helper séparé, ajouter un balayage one-shot au chargement :
  ```js
  // À placer dans _applyState (save.js) APRÈS Object.assign,
  // OU dans main.js après chargement → exécuté une fois par session.
  function _grantMissedHouseItems() {
    if (!chosenHouse) return;
    const bonuses = HOUSE_BONUSES[chosenHouse];
    if (!bonuses) return;
    bonuses.tiers.forEach((tier, i) => {
      if (houseTier < i + 1) return;           // pas atteint → pas concerné
      if (!tier.bonus.item) return;            // tier sans item → rien à faire
      const item = ITEMS.find(it => it.id === tier.bonus.item);
      if (!item) return;
      // Vérifier qu'on ne l'a pas déjà (par id, équipé OU en inventaire)
      const has = (player.inventory || []).some(i => i && i.id === item.id)
               || party.some(c => c.equipped && Object.values(c.equipped).some(it => it && it.id === item.id));
      if (has) return;
      tryAddItem(item, { silent: true });
      if (typeof addMsg === 'function') {
        addMsg(`🎁 ${item.icon} ${item.name} (rétroactif — Maison)`, 'good');
      }
    });
  }
  ```
- Appeler `_grantMissedHouseItems()` :
  - Après chaque `_applyState()` (load) → couvre les vieilles saves
  - À la fin de `checkHouseLevelUp()` (ceinture/bretelles) → couvre les
    cas où on aurait raté une distribution par bug futur
- **Vérif** : charger une save où `houseTier = 3` mais pas de brassard
  dans l'inventaire → après load, brassard apparaît automatiquement, et
  ne se duplique pas au prochain load.

### Étape 4 — Smoke test
- [ ] Nouveau scénario `scenarioHouseTier2Item` dans `tests/smoke.js` :
  ```js
  async function scenarioHouseTier2Item() {
    console.log('\n── Scénario : Tier 2 Maison donne un item rare ──');
    const { browser, page, errors } = await launchGame();
    await startNewGame(page, { partySize: 1, heroes: ['harry'], house: 'Gryffondor' });

    // T1 : force le passage au tier 2 (300 pts) → brassard tombé
    const t1 = await page.evaluate(() => {
      chosenHouse = 'Gryffondor';
      housePoints = 300;
      houseTier   = 1;
      checkHouseLevelUp();
      return {
        tier:   houseTier,
        hasItem: (player.inventory || []).some(i => i && i.id === 'brassard_lion'),
        atkBoosted: party[0]._baseAtk > 5     // base Harry = 5 → après t1 +1 et t2 +1 = 7
      };
    });
    assert(t1.tier === 2, 'tier non passé à 2');
    assert(t1.hasItem, 'brassard_lion absent après tier 2');
    assert(t1.atkBoosted, 'bonus ATK non appliqué');

    // T2 : migration rétroactive — vider l'inventaire et recharger
    const t2 = await page.evaluate(() => {
      player.inventory = [];
      _grantMissedHouseItems();
      return (player.inventory || []).some(i => i && i.id === 'brassard_lion');
    });
    assert(t2, 'migration rétroactive n\'a pas distribué l\'item');

    // T3 : idempotence — re-appel ne duplique pas
    const t3 = await page.evaluate(() => {
      _grantMissedHouseItems();
      return (player.inventory || []).filter(i => i && i.id === 'brassard_lion').length;
    });
    assert(t3 === 1, `attendu 1 exemplaire, obtenu ${t3}`);

    if (errors.length) throw new Error(`${errors.length} erreurs JS`);
    console.log('  ✅ Tier 2 item Maison conforme');
    await browser.close();
  }
  ```
- Ajouter dans la liste finale `scenarios = [..., scenarioHouseTier2Item, ...]`
- **Vérif** : `node tests/smoke.js` vert.

### Étape 5 — Commit & push
- [ ] Branche : `claude/house-tier2-item-300pts` depuis master à jour
- [ ] Commit message : `feat(house): item rare au tier 2 Maison (300 pts)`
- [ ] Push, ouvrir PR — guidelines §6 (vérifier état avant)

## 5. Ce qui ne change pas (sanity)

- Aucun changement dans la **mécanique** de `checkHouseLevelUp` : on
  exploite la branche `tier.bonus.item` déjà présente.
- Tier 4 reste intact (item légendaire) — toujours le climax Maison.
- Slots `hands` / `ring` / `trinket` / `belt` ne sont pas modifiés.
- Pas de nouveau slot, pas de nouveau type. Migration rétroactive
  idempotente (vérifie présence avant ajout).
- Save legacy : si un perso au tier 4 (épée Gryff déjà reçue) n'a pas le
  brassard, la migration le distribue. Si l'épée est perdue, elle n'est
  PAS redistribuée (par design ; seul le t2 est rétroactif dans ce
  patch).

## 6. Hors-scope

- Tier 5 post-victoire (cf. ENDGAME_PLAN §7.7) — déjà planifié séparément
- Animation spéciale de réception d'item Maison (V2)
- Recoloration de l'item selon la Maison équipée (V2)
- Suppression de l'item de Maison si on change de Maison (impossible dans
  le jeu actuel — la Maison est figée à la sélection)
- Buff/nerf des items Maison T4 existants (séparé)

## 7. Estimation

- Étape 1-3 (data + migration) : 30 min
- Étape 4 (smoke) : 30 min
- Étape 5 (commit/push) : 10 min
- **Total : ~1h10** (cohérent avec l'estimation initiale top-10 : 30 min - 1h)

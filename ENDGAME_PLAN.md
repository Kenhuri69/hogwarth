# ENDGAME_PLAN — Écran de victoire + Soft NG+

> Plan vivant (cf. `.claude/guidelines.md` §5). Cocher les étapes au fur et à mesure, noter les écarts.

## 1. Objectif

Donner une vraie sensation de fin à *Poudlard & Magie* **sans bloquer la partie**.
Le joueur doit pouvoir continuer à explorer après la victoire, avec un contenu
légèrement enrichi qui justifie de descendre encore plus bas.

## 2. Contraintes dures

| # | Contrainte | Conséquence sur le design |
|---|-----------|---------------------------|
| C1 | **Continuer au-delà** | Aucun écran modal qui retire le contrôle. Pas de game-over. Pas de reset. |
| C2 | Aucune régression save legacy | Le flag `victoryAchieved` doit s'initialiser à `false` pour les saves existantes. |
| C3 | Aucune dépendance à la quête `dumbledore_revelation` | Le trigger est purement mécanique (kill Voldemort Ressuscité). Si la quête est complétée en parallèle, tant mieux — mais ce n'est pas obligatoire. |
| C4 | L'écran n'apparaît qu'**une seule fois par save** | Re-tuer Voldemort en NG+ ne re-trigger pas la cinématique. |
| C5 | Smoke test vert avant push | `node tests/smoke.js`, voir §10. |

## 3. Trigger de victoire

**Évènement déclencheur** : monstre `voldemort_revenu` (étage 10+) passe à `hp ≤ 0`
dans `endBattle(true)` (`js/battle.js:339`).

Hook actuel utile : ligne `battle.js:386` —
```js
enemyGroup.forEach(e => safeCall('checkKillQuests', e.id));
```
On ajoute juste après :
```js
enemyGroup.forEach(e => safeCall('checkVictoryTrigger', e.id));
```

`checkVictoryTrigger(monsterId)` vit dans un nouveau module **`js/endgame.js`**
(cf. §9 pour l'arborescence). Si `monsterId === 'voldemort_revenu'` et
`!victoryAchieved`, il mute le flag, persiste, et lance la cinématique.

## 4. Cinématique de victoire (non bloquante)

Modale dédiée `#victory-modal` dans `index.html`. Style aligné sur les autres
modales (thème parchemin/or). Contenu :

1. **Titre** — "L'Ombre s'efface" + sous-titre "Vous avez vaincu Lord Voldemort"
2. **Récap** (4-5 lignes texte) :
   - Étage atteint, temps de jeu approximatif (`Date.now() − meta.startedAt`),
     nombre de monstres vaincus (somme de `floorKillCount`), niveau d'arrivée,
     Maison + points.
3. **Mot de Dumbledore** (3-4 lignes narratives, en italique) — ferme l'arc.
4. **2 boutons** :
   - `Continuer l'aventure` → close + addMsg narratif "Le château recèle encore des mystères…"
   - `Retour au menu` → revient au hub de saves (sauvegarde auto en amont)

> ⚠️ Pas de bouton "Recommencer" : on respecte C1. Le slot reste utilisable.

Critère de vérification : ouverture par appel programmatique
`window.showVictoryScreen()` ; close ne crashe pas si appelée 2×.

## 5. Persistance

**Nouveaux champs dans `state.js`** (top-level `let`) :
```js
let victoryAchieved = false;   // toggle une fois Voldemort tombé
let victoryAt       = null;    // ISO string, null si pas encore vaincu
```

**Ajouts à `_serializeState`** (`js/save.js:163`) :
```js
victoryAchieved,
victoryAt,
```

**Ajouts à `_applyState`** (`js/save.js:253`) :
```js
victoryAchieved = !!gs.victoryAchieved;
victoryAt       = gs.victoryAt || null;
```

**Migration save legacy** : aucune. Champs absents → `false`/`null` par
défaut (cf. coercition `!!` et `|| null`).

**Métadonnées de slot** (`_buildSlotMeta`, `js/save.js:43`) : ajouter
`victory: !!victoryAchieved` pour afficher un badge dans la modale de slots.

## 6. UI badge "Vainqueur"

Dans `js/save-ui.js`, lors du rendu d'un slot, si `slot.meta.victory === true`,
ajouter un petit pictogramme `🏆` à côté du nom de la save (CSS `.slot-victory`
discret, doré sur fond parchemin).

Aussi dans le HUD principal (`ui.js — updateUI`) : afficher discrètement
`🏆` à côté du nom de la Maison sur le badge, **uniquement si**
`victoryAchieved === true`. Ne pas remplacer le crest.

## 7. Soft NG+ — Étages des Ténèbres (11+)

### 7.1 Principe

Après victoire, les étages 11+ basculent en **mode "Ténèbres"** :
- multiplicateur global appliqué dans `dungeon.js — scaleMonster()` :
  `if (victoryAchieved && currentFloor >= 11) hp *= 1.25, atk *= 1.15, mag *= 1.15`
- proba de groupe de 3 ennemis +10% sur le baseline étage 7+ (`battle.js — rollGroupSize`)
- toast narratif à la première entrée en étage 11+ post-victoire :
  *"L'air devient glacial. Les murs eux-mêmes semblent te haïr."*
  (one-shot par session, déclenché dans `movement.js — goDeeper`)

### 7.1bis Démarcation visuelle — Textures des Ténèbres

**Constat existant** (`js/textures.js:21-23`, `js/renderer.js:109-129`) :
- 6 jeux de murs chargés : `stone1`, `stone2`, `wood`, `tapestry`,
  `cavern_wall`, `rune_wall`.
- Sol + plafond : `stone`, `carpet`, `cavern_floor/ceiling`,
  `rune_floor/ceiling`.
- Mapping actuel `getWallTextureType()` :

| Étage | Mur | Sol | Plafond |
|------|-----|-----|---------|
| 1-2  | stone1 | stone | beams |
| 3-4  | stone2 | carpet | beams |
| 5-6  | wood | carpet | stone |
| 7-8  | tapestry | carpet | stone |
| **9-14** | **cavern_wall** | cavern_floor | cavern_ceiling |
| 15+  | rune_wall | rune_floor | rune_ceiling |

**Décision V1** : aucun nouvel asset à créer. On **avance la bascule
`rune_*` à l'étage 11** uniquement si `victoryAchieved === true`. Les
runes ont été pensées pour le endgame ; les rendre disponibles plus tôt
post-victoire matérialise l'entrée dans les Ténèbres sans coût graphique.

| Étage | Pré-victoire | Post-victoire |
|------|--------------|--------------|
| 9-10 | cavern | cavern |
| **11-14** | **cavern** | **rune (avance)** |
| 15+ | rune | rune |

**Patch attendu** dans `renderer.js — getWallTextureType()` :
```js
if      (f <= 2)  key = 'stone1';
else if (f <= 4)  key = 'stone2';
else if (f <= 6)  key = 'wood';
else if (f <= 8)  key = 'tapestry';
else if (f <= 10) key = 'cavern_wall';
else if (typeof victoryAchieved !== 'undefined' && victoryAchieved) {
  key = 'rune_wall';                  // Ténèbres avancées (étage 11+)
}
else if (f <= 14) key = 'cavern_wall';
else              key = 'rune_wall';
```
Idem pour le `floor_key`/`ceil_key` dans `renderer.js:288/321` :
ajouter la condition `(victoryAchieved && f >= 11)` pour basculer
respectivement sur `rune_floor` / `rune_ceiling`.

**Optionnel (V1+)** : appliquer un overlay teinté pourpre froid
(`rgba(40, 20, 70, 0.12)`) en fin de pipeline `drawDungeon` quand
`victoryAchieved && currentFloor >= 11`. ~3 lignes, zéro asset,
renforce visuellement le shift. À garder en réserve si rune_wall seul
manque d'impact.

### 7.1ter Escaliers : aucun ajout nécessaire ✅

**Vérification** : `dungeon.js:116` place `CELL.STAIRS_D` dans la
dernière room générée, **sans condition sur l'étage**. `movement.js:290`
incrémente `currentFloor` sans cap. L'escalier de l'étage 10 vers
l'étage 11 existe donc déjà par défaut, mais n'avait jamais de raison
d'être emprunté avant ce plan.

**Aucune modification de génération requise.** À mentionner dans le
texte de la modale de victoire pour orienter le joueur :
> *"Un dernier escalier descend vers les ténèbres au plus profond du château."*

### 7.2 Roster monstres étages 11+ (nouveaux)

**Constat existant** : 17 monstres ont `maxFloor: null` (incluant
voldemort_revenu, bellatrix, mangemort, mangemort_elite, acromantula_jeune,
hecate, vampire_novice, strigoi_ancien…). À l'étage 11+ ils continuent
de spawn, scalés par leur `scale` propre. **Pool fonctionne déjà**,
mais **monotone** — c'est le même bestiaire que l'étage 10.

**Décision V1** : ajouter **3 nouveaux monstres exclusifs Ténèbres**
dans `js/monsters.js`. Le filtrage est centralisé via un champ
`requiresVictory: true` (consommé par `dungeon.js — weightedPick` avec
un filtre `(!m.requiresVictory || victoryAchieved)`).

| id | name | minFloor | weight | rôle | drop signature |
|----|------|---------|--------|------|----------------|
| `mangemort_ancien` | Mangemort Ancien | 11 | 6 | Variant durci du `mangemort_elite`, scale 0.32, 2 abilities (damage + drain) | chance ~8% sur `cape_voldemort` |
| `nagini_revenue` | Nagini Réincarnée | 11 | 4 | Esprit-serpent, poison/drain, scale 0.30 | chance ~10% sur `cendres_phenix` |
| `voldemort_ombre` | Ombre du Maître | 13 | 1 | Boss rare optionnel, écho d'âme post-mortem, scale 0.45, 4 abilities (proche `voldemort_revenu` mais HP/ATK +20%) | chance ~15% sur `oeil_basilic` |

**Notes design** :
- Tous ont `requiresVictory: true` → invisibles avant le kill de Voldemort.
- Pas de PNG nouvelle à créer obligatoirement : réutiliser
  `img/monsters/mangemort.png` (avec teinte CSS si possible),
  `nagini.png`, `voldemort_revenu.png`. Ajout d'asset est V1+
  uniquement si frustrant à l'usage.
- `voldemort_ombre` joue le rôle de "vrai boss final NG+" — récompense
  rare, weight 1 garantit qu'il n'est pas trivialisé.
- Resistances cohérentes : tous résistent `disarm` et `stun` ; faibles à `instant`.
- XP/gold scalés au niveau 11 (xp ~60-150, gold 30-80) pour ne pas
  exploser la progression.

> ⚠️ **Voldemort_revenu reste dans le pool étage 10+** — il pourra
> respawn à 11+ aussi (weight 1). C'est volontaire : "les ténèbres
> reviennent". Si l'utilisateur veut le rendre vraiment one-shot,
> ajouter une garde côté pool : `id === 'voldemort_revenu' && victoryAchieved → exclu`.
> Hors scope V1 par défaut.

### 7.3 Drops uniques post-victoire

3 nouveaux items dans `js/data.js — ITEMS[]` (rarity `legendary`, drop only
si `victoryAchieved && currentFloor >= 11`). Suggestions :

| id | name | slot | bonus |
|----|------|------|-------|
| `cape_voldemort` | Cape de l'Ombre | `cloak` | DEF+4, MAG+3, regenSp +1 |
| `cendres_phenix` | Cendres du Phénix | `amulet` | MAG+4, LCK+2, regenHp +4 |
| `oeil_basilic` | Œil de Basilic | `trinket` | bonusCritChance +10, bonusDodgeChance +5 |

Drops attachés aux 3 ennemis les plus durs des étages 11+
(`voldemort_revenu`, `bellatrix`, `mangemort_elite`) — chance basse (5-10%),
**gated** par un nouveau champ `requiresVictory: true` sur l'entrée de drop.

Implémentation dans `endBattle` : avant le roll, filtrer
`enemy.drops.filter(d => !d.requiresVictory || victoryAchieved)`.

### 7.4 Bestiaire enrichi (optionnel, V2)

Marquer dans le bestiaire les drops post-victoire avec un picto 🏆.
Idem pour les 3 nouveaux monstres : entrée visible seulement après
première rencontre (logique existante `seenMonsters` couvre déjà ça).
Hors scope V1 si effort > 30 min.

## 8. Ce qui ne change pas (sanity)

- Aucun monstre supprimé. Aucun étage retiré.
- Aucune quête bloquée ou auto-validée.
- Le HUD reste identique sauf le picto 🏆.
- Les anciennes saves se chargent sans migration explicite (cf. §5).
- Le smoke test existant reste vert sans modification (les nouveaux
  scénarios sont ajoutés, pas substitués).

## 9. Découpage en étapes

> Convention : `[ ]` à faire, `[x]` fait, `[~]` partiel/écart noté.

### Étape 1 — Squelette d'état & persistance
- [ ] Ajouter `victoryAchieved` + `victoryAt` à `js/state.js`
- [ ] Étendre `_serializeState` / `_applyState` dans `js/save.js`
- [ ] Étendre `_buildSlotMeta` avec `victory`
- **Vérif** : save → reload → `victoryAchieved` survit ; ancienne save migre à `false`.

### Étape 2 — Hook de trigger
- [ ] Créer `js/endgame.js` exposant `checkVictoryTrigger(id)` et `showVictoryScreen()`
- [ ] Référencer `endgame.js` dans `index.html` (avant `loader.js`)
- [ ] Ajouter l'entrée correspondante au MANIFEST de `loader.js`
- [ ] Brancher l'appel dans `battle.js — endBattle` après les kill-quests
- **Vérif** : en console, `checkVictoryTrigger('voldemort_revenu')` ouvre la modale ; `victoryAchieved` passe à `true` ; second appel = no-op (C4).

### Étape 3 — Modale victoire
- [ ] Ajouter `#victory-modal` dans `index.html`
- [ ] CSS dans `css/style.css` (réutiliser tokens parchemin/or existants)
- [ ] Câbler les deux boutons (Continuer / Retour au menu)
- **Vérif** : ouverture sans crash, close sans crash, double-click sur Continuer = idempotent.

### Étape 4 — Badge UI
- [ ] Picto 🏆 dans `save-ui.js` (rendu slot)
- [ ] Picto 🏆 dans `ui.js — updateUI` (badge Maison, sous condition)
- **Vérif** : visible uniquement quand `victoryAchieved === true`.

### Étape 5 — Soft NG+ : balance & feel
- [ ] Multiplicateur ténèbres dans `dungeon.js — scaleMonster`
- [ ] Bump de proba groupe 3 dans `battle.js — rollGroupSize`
- [ ] Toast one-shot dans `movement.js — goDeeper` (flag mémoire session)
- **Vérif** : forcer `victoryAchieved = true` + entrer étage 11 → toast s'affiche une fois, monstres plus durs.

### Étape 6 — Bascule visuelle "Ténèbres"
- [ ] Patch `renderer.js — getWallTextureType()` pour basculer `rune_wall` à étage 11+ si `victoryAchieved`
- [ ] Idem pour `_floorKey` (`renderer.js:288`) → `rune_floor` et `_ceilKey` (`renderer.js:321`) → `rune_ceiling`
- [ ] Vider le cache de patterns (`_invalidatePatternCache()`) à l'instant du trigger pour forcer le re-render avec les bonnes textures
- **Vérif** : pré-victoire étage 11 → cavern visible ; post-victoire étage 11 → runes visibles immédiatement.

### Étape 7 — Roster monstres étages 11+
- [ ] 3 nouveaux monstres dans `js/monsters.js` (`mangemort_ancien`, `nagini_revenue`, `voldemort_ombre`) avec `requiresVictory: true`
- [ ] Ajouter le filtre `(!m.requiresVictory || victoryAchieved)` dans `dungeon.js — weightedPick` (ou la fonction qui peuple le pool d'étage)
- [ ] Lier les drops uniques §7.3 sur ces 3 monstres (chance basse, gating identique)
- **Vérif** : étage 11 pré-victoire → seuls les ennemis classiques. Étage 11 post-victoire → les 3 nouveaux peuvent apparaître (vérifier sur 50 spawns simulés par seed).

### Étape 8 — Drops uniques
- [ ] 3 items dans `data.js`
- [ ] Champ `requiresVictory` sur les entrées de drop concernées dans `monsters.js` (voldemort_revenu, bellatrix, mangemort_elite, + les 3 nouveaux)
- [ ] Filtre dans `battle.js — endBattle` (drops loop)
- **Vérif** : kill Voldemort avant victoire → drops standards seulement. Kill un Mangemort élite étage 11+ après victoire → l'item gated peut tomber (test par seed/proba forcée).

### Étape 9 — Smoke test
- [ ] Ajouter scénario `scenarioVictoryTrigger` dans `tests/smoke.js`
- [ ] Ajouter scénario `scenarioDarknessTextures` : flag forcé + currentFloor=11 → vérifier `getWallTextureType()` retourne `rune_wall`
- **Vérif** : `node tests/smoke.js` passe vert.

### Étape 10 — Commit & push
- [ ] Commit message clair (cf. §11)
- [ ] Push sur `claude/game-review-improvements-QsPrU`
- [ ] Vérifier état PR avant push (`mcp__github__pull_request_read`) — cf. guidelines §6

## 10. Tests à ajouter (`tests/smoke.js`)

```js
// scénario : trigger de victoire one-shot + persistance
async function scenarioVictoryTrigger(page) {
  // 1. Forcer un état proche endgame
  await page.evaluate(() => {
    currentFloor = 10;
    party[0].level = 10; party[0].hp = 999; party[0].atk = 999;
    enemyGroup = [{ id: 'voldemort_revenu', name: 'Voldemort Ressuscité',
                    hp: 1, currentHp: 1, atk: 1, def: 0, mag: 1, agi: 1, lck: 1,
                    drops: [], xp: 100, gold: { min: 1, max: 1 } }];
    inBattle = true;
  });

  // 2. Lui mettre un coup
  await page.evaluate(() => battleAction('attack'));

  // 3. Vérifier le flag + l'ouverture de la modale
  const after = await page.evaluate(() => ({
    flag: victoryAchieved,
    modalOpen: document.getElementById('victory-modal')?.style.display !== 'none'
  }));
  assert(after.flag === true, 'victoryAchieved doit être à true');
  assert(after.modalOpen === true, '#victory-modal doit être affichée');

  // 4. Second trigger : idempotent (cinematic ne se re-joue pas)
  await page.evaluate(() => { document.getElementById('victory-modal').style.display = 'none'; });
  await page.evaluate(() => checkVictoryTrigger('voldemort_revenu'));
  const reopened = await page.evaluate(() =>
    document.getElementById('victory-modal').style.display !== 'none');
  assert(reopened === false, 'la modale ne doit pas se rouvrir au 2e kill');
}
```

## 11. Commit & PR

- Branche : `claude/game-review-improvements-QsPrU` (déjà créée, propre).
- Commit unique recommandé : `feat(endgame): écran de victoire + soft NG+ étages 11+`
- Avant push, vérifier que la PR liée n'existe pas déjà ou est ouverte
  (cf. guidelines §6).
- Pas d'ouverture de PR automatique sans demande explicite de l'utilisateur.

## 12. Hors-scope V1 (pour mémoire)

- Crédits déroulants
- Achievements / trophées
- NG+ dur (avec respec)
- Cinématique audio dédiée (TTS Dumbledore long format)
- Nouveau boss étage 15+ (Mort en personne, etc.)
- Marquage 🏆 dans le bestiaire

> Toute extension passera par un plan séparé.

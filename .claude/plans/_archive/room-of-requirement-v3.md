# Plan — Salle sur Demande V3 (commerce éphémère + méta léger + trophée dédié)

> Statut : **proposé** (branche `claude/room-requirement-v3-R0hIR`, partie de
> master à jour — PR #395 mergée).
> Suite du §8 « Hors-scope V2 » de
> [`room-of-requirement-v2.md`](./room-of-requirement-v2.md).
> La V2 (PR #395) a livré : 3 thèmes (`refuge`/`loot`/`training`) via
> `_pickRequirementTheme`, cue 3D `SCENE_ICONS.requirement` + animation
> « la porte se dessine », rumeur² (Moine Gras). V3 attaque les 3 reports
> du §8, **sans rien casser de V1/V2**.

## 0. Objectifs V3 (3 axes indépendants)

| # | Axe | Essence |
|---|-----|---------|
| **A** | 4ᵉ/5ᵉ thème **commerce éphémère** | La Salle peut devenir un **étal de marchand** (réemploi `openShop`) ou une **enclume** (réemploi `openForge`), choisis par le même `_pickRequirementTheme` contextuel (beaucoup d'or → boutique ; items équipés améliorables → forge). |
| **B** | **Méta-déblocage léger** (inter-parties) | Un **Almanach de la Salle** persisté en `localStorage` : thèmes déjà découverts + nombre de Salles trouvées + trophée collecté. Affiché sur le **hub de démarrage**. Zéro impact gameplay (pur trophée) → respecte l'esprit « reset par partie ». |
| **C** | **Polish loot** : trophée cosmétique dédié | Le thème `loot` donne, **en plus** de l'or + consommables (V2 conservé), un **collectible cosmétique unique** (« Éclat de la Salle ») la 1ʳᵉ fois de la partie. Sans bonus de stats. Ancre la méta-persistance (B). |

> Les 3 axes sont **découplés** : chacun livrable/testable seul. Ordre
> d'implémentation A → C → B puis smoke (B consomme les hooks de A/C).

## 1. Décisions actées (✅ arbitrées le 2026-06-06 avec l'utilisateur)

| Sujet | Décision retenue |
|-------|------------------|
| **Gate forge** | ✅ **Boucle Ténébreuse uniquement** (`floor >= 11`), là où l'Essence des Ténèbres existe. En-deçà, le volet « marchand » couvre le besoin de commerce. Condition exacte : `floor >= 11 && _requirementForgeable() && _countEssence() > 0`. |
| **Gate boutique** | ✅ **Beaucoup d'or** : `player.gold >= REQUIREMENT_COMMERCE_GOLD × floor` (`REQUIREMENT_COMMERCE_GOLD = 120`). Disponible à tout étage. |
| **Effet commerce** | ✅ **Réemploi pur** `openShop()` / `openForge()`. **Non-consommable** : la Salle commerce reste ré-ouvrable pour la visite (comme une vraie cellule `SHOP`/`FORGE`) → **pas** de marquage `usedRequirementRooms`. |
| **Méta-persistance** | ✅ **Les deux** : Almanach hub (thèmes vus + Salles trouvées) **ET** trophée cosmétique débloqué à vie. **Surface = panneau dédié du hub démarrage** (pas l'Atelier du Voyageur, couplé au multijoueur Mondes Parallèles — risque/hors-thème, arbitré). 100 % offline, `localStorage`. |
| **Loot dédié** | ✅ **Trophée cosmétique unique + garder les consommables**. Le trophée (`REQUIREMENT_TROPHY`, « Éclat de la Salle sur Demande ») est un **collectible NON inventorié** (pas d'entrée `ITEMS`, pas d'équipement, pas de cap 16) : sa découverte arme un flag de partie + enregistre la méta + message/narratif. 1×/partie, sur la 1ʳᵉ visite `loot`. |

> **Justification « collectible non inventorié »** : un item de sac de type
> ni `consumable` ni équipable casse `useItem` (→ `showEquipMenu`) et mange
> un slot du cap 16. Le trophée vit donc dans la méta + l'Almanach, pas dans
> `player.inventory`. La tiare (objet unique V1, équipable `head`) reste
> inchangée et indépendante.

## 2. État & persistance

### state.js — **une** nouvelle variable (par partie, sérialisée)
| Variable | Type | Rôle | Sérialisée |
|----------|------|------|------------|
| `requirementTrophyTaken` | bool | trophée cosmétique déjà collecté **dans cette partie** (anti-doublon, reset par partie) | ✅ |

> `requirementTheme` (Map) **inchangé** : on y ajoute juste les valeurs
> `'boutique'`/`'forge'` au runtime (pas de changement de type).

- `save.js` `_serializeState` : `requirementTrophyTaken`.
- `save.js` `_applyState` : `requirementTrophyTaken = !!gs.requirementTrophyTaken`.
- Reset `startGame` (main.js) : `requirementTrophyTaken = false` (à côté des autres resets requirement).

### Méta inter-parties — `localStorage` (hors save de partie)
Clé : **`hogwarts_rpg_requirement_codex`**. Forme :
```js
{ themesSeen: { refuge?:true, loot?:true, training?:true, boutique?:true, forge?:true },
  roomsFound: <int>,   // total de Salles révélées, tous parties confondues
  trophy:     <bool> } // « Éclat de la Salle » déjà trouvé une fois à vie
```
Helpers (dans **`js/save-slots.js`** — déjà la couche `localStorage`, déjà au
MANIFEST loader ; **aucun nouveau module**) :
- `_reqCodexRead()` / `_reqCodexWrite(obj)` — read/parse défensif (try/catch, `{}` si absent/corrompu).
- `recordRequirementRevealed()` — `roomsFound++` (appelé 1×/révélation).
- `recordRequirementTheme(theme)` — `themesSeen[theme] = true`.
- `recordRequirementTrophy()` — `trophy = true`.
- `getRequirementCodex()` — lecture publique pour le rendu Almanach.

> **Pourquoi pas un nouveau fichier** : éviter le plomberie (script tag +
> `?v` + précache sw + entrée MANIFEST). `save-slots.js` est le foyer naturel
> des utilitaires `localStorage`. Le rendu Almanach va dans `save-ui.js`
> (foyer du hub). `REQUIREMENT_TROPHY` (données pures) va dans `data.js`.

## 3. Axe A — Commerce éphémère (boutique / forge)

### `_pickRequirementTheme(floor)` (movement-interactions.js) — +2 thèmes
Nouvelle priorité (les 2 premières inchangées V2) :
```
hpFrac/spFrac, bagFull comme V2 ; goldThresh = REQUIREMENT_COMMERCE_GOLD * floor
si min(hpFrac,spFrac) < 0.5                          → 'refuge'
sinon si inventory.length < 6                        → 'loot'
sinon si floor>=11 && _requirementForgeable() && _countEssence()>0 → 'forge'
sinon si player.gold >= goldThresh                   → 'boutique'
sinon si hpFrac>=.999 && spFrac>=.999 && bagFull     → seed ['refuge','loot','training','boutique'][(floor*7919)%4]
sinon                                                → 'training'
```
> `forge` reste **hors du seed** (gate endgame strict). `boutique` entre dans
> le seed de variété (ouvrir une boutique sans or est inoffensif).
> Mémoïsation `requirementTheme.set` **inchangée** (stable/visite).

### `_requirementForgeable()` (helper local, movement-interactions.js)
```
si typeof _equippedItems !== 'function' || typeof _primaryBonus !== 'function' → false
retourne _equippedItems().some(({item}) =>
   _primaryBonus(item) && (item.upgradeLevel|0) < FORGE_MAX_LEVEL)
```
Réemploi strict des helpers Forge (`js/forge.js`, chargé avant movement au runtime).

### `useRequirementRoom()` — routage commerce (non-consommable)
Avant le bloc consommable `if (!usedRequirementRooms.has(key))`, intercepter
les thèmes commerce :
```
si theme === 'boutique' :
   setNarrative(« étal de marchand … ») ; recordRequirementTheme('boutique')
   openShop()              // ré-ouvrable : PAS de usedRequirementRooms.add
sinon si theme === 'forge' :
   setNarrative(« enclume ardente … ») ; recordRequirementTheme('forge')
   openForge()
sinon : // loot / training / refuge — bloc V2 inchangé (+ record + trophée, cf. C)
```
> Garde-fous : `typeof openShop/openForge === 'function'`. Le **firstGift
> (tiare)** reste après, **inchangé**, quel que soit le thème (1ʳᵉ Salle de la
> partie = tiare en plus). `updateUI()` + `autoSave` conservés.

### Overlay descriptor (movement.js `_exploreDescriptors`)
`REQ_VARIANT` += 2 entrées :
- `boutique` : desc « …un étal de marchand ambulant : présentoirs de fioles,
  de parchemins et de babioles utiles. » / btn **« Marchander »**.
- `forge` : desc « …une forge clandestine : enclume noire sur braises
  éternelles, prête à mordre le métal de vos équipements. » / btn **« Forger »**.

Le bouton appelle toujours `useRequirementRoom();_hideExploreOverlay()` (point
d'entrée unique ; l'effet est routé par thème). L'**état épuisé**
(`requirementSpent && !requirementGift`) ne peut survenir que pour les thèmes
consommables (commerce ne marque jamais `usedRequirementRooms`) → branche
inchangée.

### data.js — constantes
- `REQUIREMENT_COMMERCE_GOLD = 120` (à côté de `REQUIREMENT_REST_FRAC` / `REQUIREMENT_BUFF_STEPS`).

## 4. Axe C — Trophée cosmétique dédié

### data.js — `REQUIREMENT_TROPHY` (données pures, hors `ITEMS`)
```js
const REQUIREMENT_TROPHY = {
  id:   'eclat_salle',
  name: 'Éclat de la Salle sur Demande',
  icon: '✦',
  desc: "Une écharde de lumière figée, souvenir d'une Salle qui sut exactement ce qu'il te fallait."
};
```
> Hors `ITEMS` → pas de drop/shop/icône painterly attendue, pas de slot inventaire.

### useRequirementRoom() — branche `loot` (V2 conservée + ajout)
Après l'or + consommables (V2 **inchangé**), si `!requirementTrophyTaken` :
```
requirementTrophyTaken = true
recordRequirementTrophy()   // méta à vie
setNarrative(« Au fond d'une alcôve, un éclat de lumière figée… ») // narratif dédié
addMsg('✦ Collecté : Éclat de la Salle sur Demande (trophée unique).', 'magic')
playChestOpen()
```
> Le trophée **n'occupe pas de slot** (collectible méta). L'or + consommables
> restent versés normalement même si le trophée est déjà pris.

## 5. Axe B — Almanach de la Salle (hub démarrage)

### index.html — conteneur hub
Dans `#start-hub-screen > .hub-frame`, après `#start-hub-slot-list` :
`<div id="start-hub-almanac" class="hub-almanac"></div>` (vide par défaut).

### save-ui.js — `renderRequirementAlmanac()`
- Lit `getRequirementCodex()`. **Si aucune donnée** (`roomsFound===0 && pas de
  themesSeen && !trophy`) → conteneur vidé/masqué (pas de spoiler avant la 1ʳᵉ
  découverte).
- Sinon affiche un panneau parcheminé : titre « 🚪 Almanach de la Salle sur
  Demande », ligne « Salles trouvées : N », une rangée de 5 pastilles de thème
  (refuge/loot/training/boutique/forge) — découvertes en or, inconnues en
  pointillé neutre —, et une pastille trophée « ✦ Éclat de la Salle » si
  `trophy`. **Lecture seule**, aucun bouton (pur trophée).
- Appelé depuis `enterStartHub()` (après `_renderHubSlotList()`).

### css/save-ui.css — style `.hub-almanac`
Petit encart discret (bordure or sourde, fond parchemin translucide), pastilles
rondes. Cohérent avec le style hub existant. Responsive (wrap des pastilles).

## 6. Découpage en phases (verify)

1. **État + méta-store** — `requirementTrophyTaken` (state/save/main) ; helpers
   codex `localStorage` (save-slots.js) ; `REQUIREMENT_TROPHY` + constante
   `REQUIREMENT_COMMERCE_GOLD` (data.js).
   → verify : round-trip save conserve `requirementTrophyTaken` ;
   `getRequirementCodex()` lit/écrit sans throw (browser).
2. **Axe A — commerce** — `_requirementForgeable`, `_pickRequirementTheme`
   (+forge/boutique), routage `useRequirementRoom` (openShop/openForge,
   non-consommable), `REQ_VARIANT` boutique/forge.
   → verify : gold haut → boutique (ouvre shop, pas de used-mark, ré-ouvrable) ;
   floor≥11 + item forgeable + essence → forge (ouvre forge) ; floor<11 jamais
   forge ; thème stable/visite.
3. **Axe C — trophée** — branche `loot` + collectible + `recordRequirementTrophy`.
   → verify : 1ʳᵉ visite loot → trophée + flag + méta ; 2ᵉ visite loot → pas de
   re-trophée ; or/consommables toujours versés.
4. **Axe B — Almanach** — `recordRequirementRevealed`/`Theme`/`Trophy` câblés
   (reveal + use) ; `renderRequirementAlmanac` + conteneur hub + CSS.
   → verify : après usages, codex peuplé ; Almanach rendu sans throw ; masqué
   si vierge.
5. **Cache PWA** — skill `cache-bump` : bump `?v=N` (index.html + sw.js
   PRECACHE_URLS) + `CACHE_VERSION` pour **chaque** js/css modifié
   (data, state, save, main, movement, movement-interactions, save-slots,
   save-ui + css/save-ui.css + index.html shell).
   → verify : `node tools/check_cache_versions.js --base origin/master` exit 0.
6. **Smoke + units** — étendre `scenarioRoomOfRequirement` :
   - T7 (existant) : **figer `player.gold = 0`** avant l'assertion `training`
     (sinon l'or résiduel pourrait basculer en `boutique`).
   - T11 commerce : gold haut → `boutique` ; floor 12 + item forgeable + essence
     → `forge` ; floor 5 jamais `forge` ; `openShop`/`openForge` appelés sans
     throw ; pas de `usedRequirementRooms` pour commerce.
   - T12 trophée + codex : 1ʳᵉ loot → `requirementTrophyTaken` + codex.trophy ;
     2ᵉ loot pas de re-trophée ; `recordRequirementRevealed` incrémente
     `roomsFound` ; `renderRequirementAlmanac` non-throw + masqué si vierge.
   → verify : `node tests/smoke.js` vert (160 scénarios) + `node tests/units.js` vert.

## 7. Fichiers touchés (prévision)

| Fichier | Changement |
|---------|-----------|
| `js/state.js` | + `requirementTrophyTaken = false` (commentaire) |
| `js/save.js` | serialize/apply `requirementTrophyTaken` |
| `js/main.js` | reset `requirementTrophyTaken = false` dans startGame |
| `js/data.js` | + `REQUIREMENT_COMMERCE_GOLD`, + `REQUIREMENT_TROPHY` (const) |
| `js/movement-interactions.js` | `_requirementForgeable`, `_pickRequirementTheme` (+forge/boutique), routage commerce + trophée dans `useRequirementRoom`, `recordRequirement*` |
| `js/movement.js` | `REQ_VARIANT` += boutique/forge |
| `js/save-slots.js` | helpers codex `localStorage` (`_reqCodexRead/Write`, `recordRequirement{Revealed,Theme,Trophy}`, `getRequirementCodex`) |
| `js/save-ui.js` | `renderRequirementAlmanac()` + appel dans `enterStartHub` |
| `index.html` | + `#start-hub-almanac` + bumps `?v` |
| `css/save-ui.css` | style `.hub-almanac` |
| `js/loader.js` | (optionnel) MANIFEST `getRequirementCodex`/`renderRequirementAlmanac` (`optional:true`) |
| `tests/scenarios/dungeon.js` | T7 ajusté + T11/T12 |
| `sw.js` / `js/pwa.js` | bump `CACHE_VERSION` + `?v` (cache-bump) |

## 8. Hors-scope V3 (reporté)
- Choix de thème par le joueur (la Salle décide — fidélité canon).
- Cosmétiques cumulatifs / multiples trophées (un seul collectible V3).
- Intégration du trophée dans l'Atelier du Voyageur (écarté : couplage
  multijoueur ; surface = Almanach hub offline).
- Bonus méta de gameplay (volontairement aucun — pur trophée).

---

# Complétion V3.1 (« on doit être complet » — 2026-06-06)

> Statut : **proposé → en cours** (même branche). L'utilisateur a explicitement
> demandé d'implémenter **les 4 items hors-scope** ci-dessus **+ de vraies
> images PNG**, en assumant que 3 d'entre eux inversent des décisions design
> précédentes (choix joueur vs canon ; bonus méta vs « reset par partie » ;
> Atelier vs découplage). Décision utilisateur tracée, on applique.

## C1. Trophées multiples (cosmétiques) + PNG
- `REQUIREMENT_TROPHIES` (data.js) : 6 entrées — 1 par thème
  (`refuge`/`loot`/`training`/`boutique`/`forge`) + 1 **complétion**
  (`_complete`). Champs `{ id, theme, name, icon(emoji fallback), img(PNG) }`.
- Collecte **par run** : 1ʳᵉ engagement d'un thème dans la partie → message +
  ajout au Set `requirementTrophiesTaken` (state, sérialisé, remplace le bool
  `requirementTrophyTaken`). Enregistre la collecte **à vie** dans le codex
  (`trophies[theme]=true`). Quand les 5 thèmes sont à vie → `trophies._complete`.
- **PNG** : `tools/gen_requirement_icons.py` (Pillow) → `img/icons/requirement/<id>.png`
  (médaillon coloré + glyphe par thème). 6 fichiers 64×64.

## C2. Choix du thème par le joueur (overlay)
- L'overlay `REQUIREMENT` (non épuisé) affiche le thème **suggéré** (contextuel)
  + une rangée « Demander autre chose » : un bouton par thème **disponible**
  (`refuge`/`loot`/`training`/`boutique` toujours ; `forge` seulement si
  `floor≥11 && forgeable && essence>0`).
- `chooseRequirementTheme(theme)` (movement-interactions.js) : `requirementTheme.set(floor,theme)`
  puis `useRequirementRoom()`. La Salle « décide » par défaut, mais le joueur peut forcer.

## C3. Bonus méta de gameplay (léger, capé)
- `_applyRequirementMetaBonus()` (main.js, appelé dans startGame après l'init or) :
  `n = #thèmes découverts à vie` (0-5). `+15×n` Gallions de départ (cap 75) +
  `n` `potion_s` ; complétion (5/5) → +1 `potion_m`. Léger, additif, annoncé.
  Garde-fous `typeof getRequirementCodex/tryAddItem`.

## C4. Trophées dans l'Atelier du Voyageur (lecture seule)
- Nouvel onglet **« Salle »** dans `openAtelierVoyageur` → `_renderAtelierRequirementTab()` :
  cartes des 6 trophées (PNG/emoji), `owned` via codex, sinon `locked`. Aucune
  monnaie, aucun bouton (débloqué-à-vie par la méta). Défensif (`typeof`).

## C5. Tests & cache
- Smoke `scenarioRoomOfRequirement` : T12 adapté (Set `requirementTrophiesTaken`
  + `trophies` codex), T13 choix joueur (`chooseRequirementTheme`), T14 méta
  bonus + onglet Atelier. `node tests/smoke.js` (160) + `node tests/units.js` (67).
- cache-bump pour data/state/save/main/movement-interactions/movement/save-slots/
  save-ui/atelier-voyageur + css si touché ; `CACHE_VERSION` v64→v65.

## Suivi V3.1
- [x] C1 trophées multiples + PNG.
- [x] C2 choix du thème (overlay + `chooseRequirementTheme`).
- [x] C3 bonus méta capé.
- [x] C4 onglet Atelier.
- [x] C5 smoke/units verts + cache-bump.

> 🏁 **V3.1 livrée & mergée.** Vérifié dans le code (2026-06-11) :
> `REQUIREMENT_TROPHIES` + Set `requirementTrophiesTaken` (state/save),
> 6 PNG `img/icons/requirement/eclat_*.png`, `chooseRequirementTheme`
> (overlay), `_applyRequirementMetaBonus` (main.js), onglet Atelier
> « Salle » (`_renderAtelierRequirementTab`). Scénario
> `scenarioRoomOfRequirement` T1–T14 vert. Les cases étaient simplement
> restées non cochées.

## Suivi
- [x] Lecture code V2 livré (`_pickRequirementTheme`, `_requirementLootPool`,
      `useRequirementRoom`, descripteur overlay, `SCENE_ICONS.requirement`,
      `drawRequirementSprite`/anim, smoke `scenarioRoomOfRequirement` T1-T10).
- [x] §1 — décisions arbitrées (2026-06-06) : forge gate étage 11+, méta =
      Almanach hub + trophée à vie, loot = trophée cosmétique + garder
      consommables, surface = hub (pas Atelier multijoueur).
- [x] Phase 1 — état + méta-store (`requirementTrophyTaken` state/save/main ;
      `REQUIREMENT_COMMERCE_GOLD`/`REQUIREMENT_TROPHY` data.js ; codex localStorage
      `_reqCodexRead/Write` + `recordRequirement{Revealed,Theme,Trophy}` +
      `getRequirementCodex` dans save-slots.js).
- [x] Phase 2 — Axe A commerce (`_requirementForgeable`, `_pickRequirementTheme`
      +forge/boutique, routage `useRequirementRoom` openShop/openForge
      non-consommable, `REQ_VARIANT` boutique/forge).
- [x] Phase 3 — Axe C trophée (branche `loot` → collectible non inventorié,
      `recordRequirementTrophy`, flag partie + codex à vie).
- [x] Phase 4 — Axe B Almanach (`renderRequirementAlmanac` + `#start-hub-almanac`
      + CSS `.hub-almanac` ; reveal/use câblés au codex ; MANIFEST loader optionnel).
- [x] Phase 5 — cache-bump : 9 js + 1 css bumpés (index.html + sw.js PRECACHE_URLS),
      `CACHE_VERSION` v63→v64 ; `check_cache_versions.js` OK + `pwa-smoke.js` (85 entrées).
- [x] Phase 6 — smoke `scenarioRoomOfRequirement` : T7 ajusté (gold=0) + T11
      (commerce/gate forge/non-consommable) + T12 (trophée+codex). `node tests/smoke.js`
      vert (160) + `node tests/units.js` (67).

## Écarts / décisions d'implémentation
- **Zéro nouveau module** : helpers codex logés dans `save-slots.js` (foyer
  localStorage), rendu Almanach dans `save-ui.js`, données dans `data.js` — évite
  un script tag/précache/MANIFEST supplémentaire.
- **Trophée non inventorié** : confirmé — `REQUIREMENT_TROPHY` vit hors `ITEMS`,
  jamais poussé dans `player.inventory` (pas de slot, pas de `useItem`/équip). Sa
  collecte arme `requirementTrophyTaken` (partie) + codex `trophy` (à vie).
- **Commerce non-consommable** : boutique/forge ouvrent `openShop`/`openForge`
  et **ne marquent pas** `usedRequirementRooms` → ré-ouvrables pour la visite
  (comme une vraie cellule SHOP/FORGE). Le gift tiare 1ʳᵉ Salle reste indépendant.
- **Gate forge** : `floor>=11 && _requirementForgeable() && _countEssence()>0`.
  Hors du seed de variété (gate endgame strict) ; boutique, elle, entre dans le seed.
- **MANIFEST loader** : `getRequirementCodex` / `renderRequirementAlmanac` ajoutés
  en `optional:true` (easter-egg — pas de bandeau rouge si absent).

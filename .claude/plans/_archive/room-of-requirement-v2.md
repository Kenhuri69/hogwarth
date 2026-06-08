# Plan — Salle sur Demande V2 (à thèmes + cue 3D + rumeur²)

> Statut : **proposé** (branche `claude/room-requirement-v2-Vv2AB`).
> Suite du §6 « Hors-scope V1 » de
> [`room-of-requirement-easter-egg.md`](./room-of-requirement-easter-egg.md).
> La V1 (PR #393, mergée) a livré : `CELL.REQUIREMENT=16`, le geste des
> 3 passages (`requirementTrigger`/`requirementPaces` →
> `_revealRequirementRoom`), le refuge unique (repos +40 % PV/PM + buff de
> Confort) + objet unique (`tiare_poussiereuse`), sprite emoji 🚪, et la
> rumeur Sir Nicolas. V2 enrichit **3 axes**, sans rien casser de V1.

## 0. Objectifs V2 (3 axes indépendants)

| # | Axe | Essence |
|---|-----|---------|
| **A** | Salle **à thèmes** | La Salle devient *ce dont le groupe a besoin* : tirage entre **Refuge** (V1), **Cache aux objets** (loot) et **Salle d'entraînement** (XP). |
| **B** | **Cue 3D élaboré** | Remplace l'emoji 🚪 par un vrai `SCENE_ICONS.requirement` (porte cintrée gravée, modèle fontaine/jardin) + **animation one-shot « la porte se dessine »** à la révélation. |
| **C** | **Rumeur²** | Un 2ᵉ fantôme — **le Moine Gras** (`moine_gras`, déjà présent) — évoque la Salle dans son `idleRandom`. |

> Les 3 axes sont **découplés** : chacun est livrable/testable seul. On les
> implémente A → B → C puis smoke.

## 1. Décisions actées (✅ arbitrées le 2026-06-06 avec l'utilisateur)

| Sujet | Décision retenue |
|-------|------------------|
| **Sélection du thème** | ✅ **Contextuel + seed de départage.** À la 1ʳᵉ ouverture de l'overlay pour la visite d'étage : PV/PM bas (`min(hpFrac, spFrac) < 0.5`) → **refuge** ; sinon sac quasi vide (`inventory.length < 6`) → **loot** ; sinon **entraînement**. Si aucune condition tranche (cas « entraînement » par défaut), le thème reste `training` — mais en **cas d'égalité contextuelle nulle** le seed `(floor*7919)%3` choisit parmi les 3 pour garder de la variété. Recalculé **à chaque visite** (reset comme `usedRequirementRooms`). Cf. §3. |
| **Effet — Refuge** | ✅ **Inchangé V1** : repos +40 % PV/PM (`REQUIREMENT_REST_FRAC`) + buff de Confort (`REQUIREMENT_BUFF_STEPS`). |
| **Effet — Cache aux objets (loot)** | ✅ **Or + consommables** (modèle coffre, non-méta) : `+_applyGoldMult(25×floor)` Gallions + 1-2 objets tirés d'un petit pool scalé par étage (`potion_s`/`potion_m`, `mandragore`, `essence_tenebres` en Boucle). Via `tryAddItem` (respecte le cap 16). 1×/visite. |
| **Effet — Entraînement** | ✅ **XP + focus PM.** `+50×floor` XP (peut déclencher un level-up → `checkLevelUp()`) + restauration **PM à 100 %** du groupe vivant. Pas de nouveau hook combat. 1×/visite. |
| **Objet unique (tiare)** | ✅ **Inchangé** : 1×/partie (`requirementGiftTaken`), donné à la **toute première** Salle visitée, **quel que soit le thème** (en plus de l'effet de thème). |
| **Cue 3D** | ✅ **`SCENE_ICONS.requirement` SVG** (porte cintrée or sur pan de pierre, halo chaud) rendu via `_getSceneSvgImg` (comme jardin/fontaine) + **animation one-shot canvas ~1 s** à la révélation (la porte se « dessine » de bas en haut). Variante grisée si refuge épuisé (`spent`). Fallback vectoriel tant que l'image n'a pas chargé. |
| **Rumeur²** | ✅ **Moine Gras** : 1 ligne d'`idleRandom` évoquant la Salle (registre Poufsouffle : repos, hospitalité), **sans position ni mention du geste** (Sir Nicolas garde l'indice du geste). |

## 2. État (state.js) — **une** nouvelle variable

| Variable | Type | Rôle | Sérialisée |
|----------|------|------|------------|
| `requirementTheme` | `Map<floor,'refuge'\|'loot'\|'training'>` | thème décidé pour la **visite courante** de l'étage (réutilisé tant que l'overlay reste ouvert / non utilisé). Reset à l'entrée d'étage (comme `usedRequirementRooms`). | ✅ |

> Tout le reste (`requirementWalls/Trigger/Paces/Revealed`,
> `usedRequirementRooms`, `requirementGiftTaken`, `requirementBuffSteps`)
> est **inchangé**. L'animation de révélation est **combat/visite-scoped
> et transitoire** → **non sérialisée** (comme une jauge FX).

### Sérialisation
- `save.js` `_serializeState` : `requirementTheme: Array.from(requirementTheme.entries())`.
- `save.js` `_applyState` : `requirementTheme = new Map(gs.requirementTheme || [])`.
- Reset `startGame` (main.js) : `requirementTheme.clear()` (à côté des autres
  resets requirement).
- Reset entrée d'étage (`movement-floors.js`, là où `usedRequirementRooms` est
  vidé pour l'étage) : purger l'entrée de l'étage courant **du Map** — comme
  `usedRequirementRooms` est vidé, on retire `requirementTheme.delete(floor)`
  pour forcer un nouveau calcul contextuel à la prochaine visite.

## 3. Axe A — Salle à thèmes

### Helper pur `_pickRequirementTheme(floor)` (movement-interactions.js)
```
si requirementTheme.has(floor) → retourne la valeur mémorisée (stable/visite)
sinon :
  hpFrac = Σhp / Σhpmax  (membres vivants)
  spFrac = Σsp / Σspmax
  si min(hpFrac, spFrac) < 0.5      → theme = 'refuge'
  sinon si player.inventory.length < 6 → theme = 'loot'
  sinon                              → theme = 'training'
  // variété : si le contexte n'a rien « forcé » (cas training par défaut ET
  // groupe au max ET sac plein), on laisse le seed départager pour éviter la
  // monotonie : theme = ['refuge','loot','training'][(floor*7919)%3]
  requirementTheme.set(floor, theme)
  retourne theme
```
> Garde-fou : pas de division par zéro (groupe entièrement KO → `refuge`).
> Le helper est **idempotent par visite** (mémorise dans `requirementTheme`).

### Overlay descriptor (`movement.js` `_exploreDescriptors`)
`[CELL.REQUIREMENT]` devient **dépendant du thème** :
- calcule `const theme = _pickRequirementTheme(currentFloor);`
- titre commun « La Salle sur Demande », **desc + bouton variant selon thème** :
  - `refuge` : desc/bouton V1 (« Entrer dans la Salle » → `useRequirementRoom()`).
  - `loot` : « …une alcôve where s'entassent objets oubliés et bourses
    poussiéreuses. » → bouton « Fouiller la Salle ».
  - `training` : « …un dojo silencieux, mannequins et grimoires d'exercice. »
    → bouton « S'entraîner ».
- **état épuisé** (`requirementSpent && !requirementGift`) : desc « refermée »
  commune (inchangé), quel que soit le thème.
- Le **bouton** appelle toujours `useRequirementRoom()` (l'effet est routé
  par le thème à l'intérieur, cf. ci-dessous) — un seul point d'entrée.

### `useRequirementRoom()` (movement-interactions.js) — routage par thème
Structure conservée (garde-fous `inBattle`, cellule, `firstGift`,
`usedRequirementRooms`), mais le bloc « repos sûr » devient un **switch** :
```
theme = _pickRequirementTheme(currentFloor)
si !usedRequirementRooms.has(key):
  switch theme:
    'refuge'   → (V1) repos +40 % PV/PM + requirementBuffSteps = BUFF_STEPS
    'loot'     → gold += _applyGoldMult(25×floor) ; tirer 1-2 items pool→tryAddItem
    'training' → player.xp += 50×floor ; PM groupe → spMax ; checkLevelUp()
  usedRequirementRooms.add(key) ; narratif + son par thème ; DFX burst
// objet unique (firstGift) : INCHANGÉ, après le switch, quel que soit le thème
```
> Le **gift tiare** reste indépendant : première Salle de la partie =
> tiare en plus de l'effet de thème (refuge/loot/training).
> Garde-fou loot : si le sac est plein, `tryAddItem` échoue proprement →
> message, mais l'or est tout de même versé ; `usedRequirementRooms.add` se
> fait quand même (cohérent : la Salle a été « utilisée »).

### Pool loot (helper local, scalé étage)
`_requirementLootPool(floor)` retourne un petit tableau d'ids :
- étage 1-3 : `potion_s` (×1-2)
- étage 4-6 : `potion_s`, `potion_m`, `mandragore`
- étage 7-10 : `potion_m`, `mandragore`
- étage 11+ (Boucle) : `potion_m`, `essence_tenebres` (si l'id existe)
Tirage de 1-2 ids (seed `Math.random`, comme drops). Réutilise `tryAddItem`.

## 4. Axe B — Cue 3D élaboré

### `SCENE_ICONS.requirement` (scene-icons.js)
Nouvel SVG **inerte** (modèle `fountain`/`garden`), viewBox ~`0 0 120 130` :
- pan de pierre sombre, **arche cintrée** dorée gravée, vantail bois patiné,
  poignée/ferrure or, **halo chaud** pulsé (cohérent avec le halo doré actuel),
  rainures de pierre autour. Signature « porte ancienne qui vient d'apparaître ».
- Pas de paramètre `dried` ; le **grisé** (état `spent`) est géré côté canvas
  (alpha/halo terni) comme déjà fait dans `drawRequirementSprite`.

### `drawRequirementSprite(x, baseY, sz, spent)` (renderer-sprites.js)
- Remplace le `ctx.fillText('🚪', …)` par le rendu de l'image SVG via
  `_getSceneSvgImg('requirement', () => SCENE_ICONS.requirement)` (modèle
  `drawGardenSprite`). Conserve ombre au sol + halo chaud (terni si `spent`).
- **Fallback vectoriel** (`_drawRequirementVectorFallback`) tant que
  `!entry.ready` : arche + vantail tracés au canvas (pas d'emoji, cohérent
  avec la politique « pas d'emoji en sprite » de shop/garden). Le fallback
  emoji 🚪 reste en tout dernier recours si le SVG `failed`.
- **Animation « la porte se dessine »** : une jauge transitoire
  `_requirementRevealAnim` (timestamp module-level dans renderer-sprites.js,
  **non** dans state.js — purement FX). Lorsque `> 0` et récente
  (≤ `REVEAL_MS≈900`), la porte est **clippée de bas en haut**
  (`progress = (now - t0)/REVEAL_MS`, `clip` rect montant) + alpha croissant.
  Au-delà, sprite plein normal.

### Pilotage de l'animation (one-shot, self-contained)
- `_revealRequirementRoom` (movement-interactions.js) appelle un nouvel
  helper `_startRequirementRevealAnim()` (renderer-sprites.js) qui pose
  `_requirementRevealAnim = performance.now()` et lance une **boucle courte**
  (`requestAnimationFrame` ou `setInterval(40ms)`) qui rappelle `drawDungeon()`
  pendant `REVEAL_MS`, puis s'arrête (un seul timer, garde-fou anti-double).
  Modèle léger inspiré de `startNpcAnimLoop` mais **one-shot borné**.
- Aucune dépendance si renderer absent (helper défensif `typeof`).

## 5. Axe C — Rumeur²

- **Moine Gras** (`moine_gras`, npcs.js ligne ~1018) : ajouter **1** ligne à
  `dialogues.idleRandom` — registre hospitalité/repos, **sans position ni geste** :
  > « On raconte qu'un mur, quelque part, sait se faire âtre et fauteuil pour
  >   qui en a vraiment besoin. Moi, je n'ai plus besoin de me reposer… mais
  >   toi, mon enfant, garde l'esprit ouvert. »
- Sir Nicolas **inchangé** (garde la ligne de rumeur + l'indice du geste).
- Pas de greffe spéciale : la ligne vit dans le pool `idleRandom` existant.

## 6. Découpage en phases (verify)

1. **État + sérialisation** — `requirementTheme` (state.js), serialize/apply
   (save.js), reset startGame (main.js) + reset entrée d'étage (movement-floors.js).
   → verify : round-trip save conserve `requirementTheme` ; reset à l'entrée.
2. **Axe A — thèmes** — `_pickRequirementTheme`, `_requirementLootPool`,
   routage `useRequirementRoom`, descripteur overlay variant.
   → verify : PV bas → refuge (rest+buff) ; sac vide → loot (or+items) ;
   sinon training (XP+PM) ; thème stable sur la visite ; gift 1×/partie intact.
3. **Axe B — cue 3D** — `SCENE_ICONS.requirement`, refonte
   `drawRequirementSprite` (SVG + fallback vectoriel), animation one-shot
   `_startRequirementRevealAnim` déclenchée par `_revealRequirementRoom`.
   → verify : `SCENE_ICONS.requirement` est une string SVG ; sprite rendu
   sans throw ; pas d'emoji par défaut ; animation se termine seule (timer clear).
4. **Axe C — rumeur²** — ligne Moine Gras `idleRandom`.
   → verify : la ligne est présente dans le pool ; pas de régression NPC.
5. **Cache PWA** — bump `?v=N` (index.html + sw.js PRECACHE_URLS) +
   `CACHE_VERSION` pour **chaque** js/css modifié (skill `cache-bump`).
   → verify : `node tools/check_cache_versions.js --base origin/master` exit 0.
6. **Smoke** — étendre `scenarioRoomOfRequirement` (T7-T10) :
   T7 sélection de thème (contextuel) · T8 effets par thème (refuge/loot/training)
   + stabilité visite + reset · T9 `SCENE_ICONS.requirement` présent + sprite
   OK · T10 rumeur Moine Gras. Round-trip save inclut `requirementTheme`.
   → verify : `node tests/smoke.js` vert (160 scénarios) + `node tests/units.js`.

## 7. Fichiers touchés (prévision)

| Fichier | Changement |
|---------|-----------|
| `js/state.js` | + `requirementTheme = new Map()` + commentaire |
| `js/save.js` | serialize/apply `requirementTheme` |
| `js/main.js` | reset `requirementTheme.clear()` dans startGame |
| `js/movement-floors.js` | `requirementTheme.delete(floor)` au reset d'entrée d'étage |
| `js/movement-interactions.js` | `_pickRequirementTheme`, `_requirementLootPool`, routage `useRequirementRoom`, appel anim dans `_revealRequirementRoom` |
| `js/movement.js` | descripteur overlay `[CELL.REQUIREMENT]` variant par thème |
| `js/scene-icons.js` | + `SCENE_ICONS.requirement` (SVG) |
| `js/renderer-sprites.js` | refonte `drawRequirementSprite` (SVG+fallback+anim) + `_startRequirementRevealAnim` |
| `js/npcs.js` | + 1 ligne `idleRandom` Moine Gras |
| `tests/scenarios/dungeon.js` | T7-T10 dans `scenarioRoomOfRequirement` |
| `index.html` / `js/pwa.js` / `sw.js` | bump `?v` + `CACHE_VERSION` (cache-bump) |

## 8. Hors-scope V2 (reporté)
- 4ᵉ thème (boutique / forge éphémère).
- Persistance inter-parties.
- Vrai matériau dédié au loot (réemploi des consommables existants suffit).
- Choix de thème par le joueur (la Salle décide, fidélité canon).

## Suivi
- [x] Lecture plan V1 + code livré (CELL.REQUIREMENT, `_ensureRequirementWall`,
      `useRequirementRoom`/`_revealRequirementRoom`, `drawRequirementSprite`).
- [x] §1 — décisions arbitrées (2026-06-06) : thème contextuel+seed,
      entraînement = XP+PM, cue 3D = SVG + porte qui se dessine.
- [x] Phase 1 — état + sérialisation (`requirementTheme` Map ; state/save/main ;
      reset entrée d'étage côté `generateDungeon` **et** `_restoreFloorFromCache`).
- [x] Phase 2 — Axe A : `_pickRequirementTheme`, `_requirementLootPool`, routage
      `useRequirementRoom` (loot/training/refuge), descripteur overlay variant.
- [x] Phase 3 — Axe B : `SCENE_ICONS.requirement` (SVG porte cintrée), refonte
      `drawRequirementSprite` (SVG + `_drawRequirementVectorFallback`), animation
      one-shot `_startRequirementRevealAnim` (clip bas→haut) déclenchée à la révélation.
- [x] Phase 4 — Axe C : ligne `idleRandom` du Moine Gras.
- [x] Phase 5 — cache-bump : 10 js bumpés (index.html + sw.js PRECACHE_URLS),
      `CACHE_VERSION` v62→v63 ; `check_cache_versions.js` + `pwa-smoke.js` OK.
- [x] Phase 6 — smoke `scenarioRoomOfRequirement` étendu T7-T10 (+ T6 théme) :
      `node tests/smoke.js` vert (160) + `node tests/units.js` (67 assertions).

## Écarts / décisions d'implémentation
- **Sélection de thème** : le départage seedé ne s'active que dans le cas
  *strictement nul* (groupe à 100 % PV/PM **et** sac plein) ; sinon le défaut
  hors refuge/loot est `training`. Choix conservateur pour rester lisible.
- **Animation « porte qui se dessine »** : pilotée **côté canvas** (timestamp
  module-level + `setInterval(40ms)` one-shot borné à 900 ms qui rappelle
  `drawDungeon`, clip montant). Les SMIL `<animate>` du SVG ne tournent pas
  une fois le SVG rastérisé en `Image` pour le canvas — l'animation devait
  donc être canvas-side. Le timestamp est **non sérialisé** (FX transitoire).
- **Icône d'overlay** : réemploi de la string `SCENE_ICONS.requirement` (même
  SVG que le sprite 3D) dans le descriptor d'exploration, fallback 🚪 si absent.
- **Loot sac plein** : l'or est versé même si `tryAddItem` échoue ; la Salle est
  marquée utilisée (cohérent : elle a répondu au besoin d'or).

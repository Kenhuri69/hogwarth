# Plan — Immersion (suite 2 / nouveau backlog)

> Démarré 2026-06-01. Branche initiale `claude/immersion-suite-2-plan`
> (ce document seul). Fait suite à `.claude/plans/immersion-suite.md`
> (backlog A1→C2 **clos** : sting victoire, motes, VFX soin/buff, tranche
> Ruines Anciennes, transition d'entrée en combat, pétrification de la
> mort). Ce document recense les pistes **neuves** identifiées après la
> clôture du premier backlog. **Aucune n'est requise** — backlog à piocher.

## Principes (inchangés depuis la refonte)

- 100 % visuel/audio/UX/haptique : ne touche **aucune** mécanique
  (dégâts, état, sauvegarde, RNG de combat).
- Zéro dépendance, pas de build, modules `<script>` séquentiels.
- Call-sites **défensifs** (proxy `*_safe` calqué sur `CFX_safe` /
  `DFX_safe` / `CIN_safe`) : le jeu fonctionne si le module manque.
- Respecter `@media (prefers-reduced-motion: reduce)` pour les effets
  visuels ; pour l'haptique, respecter aussi reduced-motion (vibration =
  mouvement ressenti) et garder un fallback silencieux si l'API manque.
- Chaque item livré : scénario smoke dédié + bumps `?v=` + bump
  `CACHE_VERSION` du SW (+ entrées PRECACHE) + entrée loader si nouveau
  global critique. `node tests/smoke.js` et `node tests/pwa-smoke.js`
  verts avant merge.

### État du code vérifié au 2026-06-01 (pré-requis)

- **Aucune** des fonctionnalités ci-dessous n'existe encore dans le code
  (greps : pas de `navigator.vibrate`, pas de vignette/flash de danger,
  pas d'idle des sprites ennemis, pas de flash de statut).
- `audio/ambient_tension.ogg` **existe sur le disque** et est mappé dans
  `_ZONE_SAMPLES` (`audio-music.js`) mais **n'est branché à aucune
  tranche** → réserve directement activable (item E2).

---

## D. Faible effort (gros ratio impact) — recommandés en premier

### D1. Haptique mobile ★ (meilleur ratio impact/effort)
Aucun retour tactile aujourd'hui. `navigator.vibrate()` est natif, zéro
dépendance, défensif (absent sur desktop → no-op).

- **Nouveau module** : `js/haptics.js` exposant `window.Haptics` +
  helper `HAPTICS_safe` (proxy calqué sur `CFX_safe`). API minimale :
  `Haptics.hit()`, `Haptics.crit()`, `Haptics.death()`, `Haptics.levelUp()`.
  Garde-fous : `if (!navigator.vibrate) return;` +
  `if (prefersReducedMotion()) return;`. Patterns courts (10–40 ms ;
  crit = double pulse ; mort = pulse long).
- **Call-sites** (tous derrière `HAPTICS_safe`, aucune mécanique touchée) :
  - `battle.js — executeAttack` : `hit()` (et `crit()` sur crit) au point
    où `AudioSystem.playHit()` est déjà appelé.
  - `battle-death.js — triggerDeath` : `death()` (chemin normal ; pas en
    Ironman — symétrique à C2).
  - `battle-rewards.js — checkLevelUp` : `levelUp()`.
- **Vérif** : nouveau `scenarioHaptics` — stub `navigator.vibrate` (spy),
  assert appelé sur coup/crit/level-up, **pas** appelé quand
  `prefers-reduced-motion` (emulateMedia). Entrée loader `Haptics`/`HAPTICS_safe`.
  Bumps `index.html` + `sw.js` (nouveau fichier + PRECACHE) + `CACHE_VERSION`.

### D2. Vignette de danger bas-PV 🩸
Aucun signal d'alerte quand un héros est critique.

- **Action** : classe `body.cfx-danger` (pulsation rouge en bord d'écran,
  `box-shadow` inset ou pseudo-élément `position:fixed`, `pointer-events:none`).
  Togglée dans `ui.js — updateUI()` : active si un membre vivant du groupe
  est sous un seuil (`hp/hpMax < 0.25`), retirée sinon. Pur CSS + un
  toggle de classe (pas de nouveau module JS requis ; logique dans `updateUI`).
- **Vérif** : `scenarioDangerVignette` — baisser les PV d'un héros sous le
  seuil → `body.classList.contains('cfx-danger')` ; remonter → classe
  retirée. `prefers-reduced-motion` : halo statique (pas de pulsation).
  Bumps css + `ui.js?v` + cache.

### D3. Flash de dégâts encaissés
Pas de retour plein écran quand le groupe prend un gros coup.

- **Action** : `CombatFX.hurtFlash(intensity)` (voile rouge radial bref,
  dans l'esprit de `combatStart()`), appelé dans `battle.js — enemyTurn`
  quand un héros encaisse une frappe au-dessus d'un seuil relatif
  (`dmg/hpMax`). Défensif `CFX_safe`, reduced-motion = fade très court.
- **Vérif** : `scenarioCombatFX` étendu (F-nouveau : `hurtFlash` existe +
  proxy + ne throw pas). Bumps `combat-fx.js`/`.css` + cache.

### D4. Couche musicale de tension (brancher `ambient_tension.ogg`)
Sample livré mais inerte.

- **Action** : utiliser `tension` comme **musique de combat** quand un
  boss `epic` apparaît OU que le groupe est en danger critique, via
  `audio-music.js — _combatSampleKey(enemyGroup)` (ajouter un axe
  `tension` prioritaire). Repli sûr : si 404 → chaîne de fallback
  existante (`combat_normal` → synthèse). **Ne pas** inventer de tranche
  d'ambiance (laisser `getFloorTheme` tel quel).
- **Vérif** : `scenarioFloorTheming`/audio étendu — `_combatSampleKey`
  retourne `tension` sur groupe epic ; fallback intact si absent.
  Bumps `audio-music.js?v` + cache.

---

## E. Effort moyen

### E1. Idle des sprites ennemis
Les ennemis sont figés ; les PNJ respirent déjà (`_npcAnimPhase`).

- **Action** : transposer la mécanique de phase d'animation (boucle ~5 FPS)
  aux sprites d'ennemis dans `renderer-entities.js — drawEnemySprite`
  (léger bobbing vertical + scale de respiration, amplitude faible).
  Garde reduced-motion → amplitude 0. Pas de nouvel état persistant
  (phase combat-scoped).
- **Vérif** : `scenarioMonsterImages`/`scenarioCombatFX` — le rendu ne
  throw pas, la phase avance. Bumps `renderer-entities.js?v` + cache.

### E2. Flash de statut sur la carte affligée
L'application d'un statut (burn/poison/bleed/gel/stun/fear) n'a pas de
feedback visuel distinct du tick.

- **Action** : `CombatFX.statusFlash(targetKey, statusId)` — pulse coloré
  bref sur la carte (`🔥` rouge, `❄️` bleu, `☠️` vert, `💫` jaune…),
  appelé dans `battle.js — applyStatus` au moment de la pose (pas au tick).
  Couleur dérivée de `STATUS_DEFS`. Défensif, reduced-motion = fade court.
- **Vérif** : `scenarioStatusEffects`/`scenarioCombatFX` étendu (la pose
  d'un statut ne throw pas, flash monté/retiré). Bumps + cache.

### E3. VFX d'interaction de donjon
Coffre / fontaine / level-up sans VFX visuel dédié (audio seul).

- **Action** : petites gerbes réutilisant l'infra `combat-fx.js` /
  `dungeon-fx.js` : étincelles dorées à `openChest()`, ondulation/halo
  bleu à `useFountain()`, burst à `checkLevelUp()`. Hooks dans
  `movement-interactions.js` + `battle-rewards.js`. Défensif, reduced-motion.
- **Vérif** : `scenarioFountain`/`scenarioTryAddItem` étendus (interaction
  ne throw pas). Bumps + cache.

### E4. Poussière ambiante dans les couloirs
Exploration statique entre les murs.

- **Action** : motes flottantes façon `cinematics.js` mais en couche
  d'exploration (canvas overlay léger ou `dungeon-fx.js`), densité/teinte
  modulées par `getFloorTheme(currentFloor)`. Faible densité pour ne pas
  charger la lisibilité. Défensif, reduced-motion = désactivé.
- **Vérif** : `scenarioDungeonFX` étendu (couche montée, ne throw pas).
  Bumps `dungeon-fx.js?v`/`.css` + cache.

---

## F. Plus gros (à cadrer avant de lancer)

### F1. Musique adaptative en couches ✅ (cadré + livré 2026-06-01)
Au-delà du switch combat/ambiant binaire.

- **Cadrage retenu** : **crossfade par intensité** (pas de couche additive
  permanente — décision utilisateur). Le sample de combat est ré-évalué
  *pendant* le combat et, quand l'intensité voulue change, on crossfade
  vers la nouvelle couche sans empiler de boucle permanente.
- **Implémentation** :
  - `AudioSystem.updateCombatIntensity()` (`audio-music.js`) : recalcule la
    couche voulue via `_combatSampleKey()` (qui place déjà `tension` en tête
    sur danger critique — D4). Si elle diffère de `_activeCombatKey` ET que
    son buffer est chargé : pose la nouvelle clé active (l'ancienne boucle
    cesse de se reprogrammer via son `isRelevant`), fade-out 1 s des gains
    de l'ancienne couche (`_fadeOutCombatLayer`), démarre la nouvelle boucle
    (fade-in intégré de `_playSampleLoop`). Buffer cible absent → load
    paresseux puis re-tentative. **No-op** hors combat / muet / sur couche
    procédurale (`_activeCombatKey === null`, ex. file://) → jamais de sample
    empilé sur la synthèse.
  - État (`audio.js`) : `_activeCombatKey` + `_combatGains` (bucket des gains
    de la couche courante), réinitialisés par `stopMusic()`. `_playSampleLoop`
    accepte un 3ᵉ param optionnel `gainBucket` (les callers ambient/menu ne le
    passent pas → comportement inchangé). `startCombatMusic` pose la clé
    active + passe le bucket (y compris sur le repli `combat_normal`).
  - **Hook** : `ui.js — updateUI()`, juste après le toggle de la vignette de
    danger D2 (même déclencheur : PV du groupe en combat), gardé `inBattle`
    + `typeof AudioSystem`.
- **Vérif** : `scenarioAdaptiveCombatMusic` — API présente ; no-op sur
  couche procédurale ; injection de buffers réels (silencieux 4 s) →
  `_activeCombatKey` bascule full→`combat_normal`, danger→`tension`,
  soin→`combat_normal`, sans throw ; `stopMusic()` réinitialise l'état.

### F2. Barks ambiants / one-shots sonores en exploration
Gouttes d'eau, hurlements lointains, craquements, joués aléatoirement
pendant l'exploration (seedés par étage pour la reproductibilité ?
**à cadrer** — possible conflit avec le déterminisme du smoke).

- **Action** : pool de samples courts déclenchés à faible probabilité par
  pas (`movement.js — _step`), via `AudioSystem`. **Pré-requis : assets
  OGG présents** (sinon hors-scope, ne pas générer ici).
- **Vérif** : à définir au cadrage ; repli silencieux si assets absents.

---

## Priorisation suggérée

1. **D1** (haptique mobile) — quasi gratuit, fort ressenti mobile.
2. **D2** (vignette danger) — pur CSS + toggle, très lisible.
3. **D3** (flash de dégâts) — complète le feedback défensif.
4. **D4** (tension audio) — réserve déjà sur le disque, juste du câblage.
5. **E1–E4** — au fil de l'eau selon retour visuel.
6. **F1 / F2** — nécessitent un cadrage (transport audio / assets).

> Suggestion de packaging : **D1 + D2 dans une même PR** (faible effort,
> fort ressenti, surfaces disjointes), puis D3, puis D4. Les Lots E en PRs
> dédiées une par une (chacune un scénario smoke).

## Journal d'avancement

- 2026-06-01 : backlog rédigé après clôture du premier backlog immersion
  (A1→C2). État du code vérifié (aucune des features présente ;
  `ambient_tension.ogg` en réserve activable). Rien d'engagé — ce commit
  ne contient que le plan.
- 2026-06-01 : **D1 + D2 implémentés** dans une même PR (branche
  `claude/immersion-d1d2-haptics-danger`, surfaces disjointes, faible
  effort — packaging recommandé par le plan).
  - **D1 (haptique)** : nouveau module `js/haptics.js` (`window.Haptics`
    + proxy `HAPTICS_safe` calqué sur `CFX_safe`). API
    `hit()/crit()/death()/levelUp()`, garde-fous `navigator.vibrate`
    absent → no-op et `prefers-reduced-motion` → no-op. Call-sites :
    `battle.js — executeAttack` (hit/crit au point du `playHit()`),
    `battle-death.js — triggerDeath` (death, chemin normal après le gate
    Ironman, symétrique à C2), `battle-rewards.js — checkLevelUp`
    (levelUp). Entrées loader `Haptics`/`HAPTICS_safe` ajoutées au
    MANIFEST.
  - **D2 (vignette danger)** : classe `body.cfx-danger` (pulsation rouge
    `box-shadow` inset, `pointer-events:none`) togglée dans
    `ui.js — updateUI()` quand un membre vivant a `hp/hpMax < 0.25`.
    CSS dans `css/combat-fx.css` ; reduced-motion → halo statique
    (animation neutralisée).
  - **Tests** : `scenarioHaptics` (spy `navigator.vibrate` : 4 API +
    coup en combat appellent ; rien sous reduced-motion via
    `emulateMedia`) et `scenarioDangerVignette` (PV sous seuil → classe ;
    remontée → retirée ; KO ne compte pas) ajoutés à `tests/smoke.js`.
  - **Bumps** : `?v=` de `combat-fx.css` (4→5), `ui.js` (7→8),
    `battle.js` (18→19), `battle-rewards.js` (1→2), `battle-death.js`
    (2→3), `loader.js` (22→23) + nouvelle entrée `haptics.js?v=1` dans
    `index.html` & `sw.js` (PRECACHE) ; `CACHE_VERSION` v47 → v48.
  - **Mergé** : PR #357 (master). D1 + D2 clos.
- 2026-06-01 : **D3 implémenté** (PR dédiée, branche
  `claude/immersion-d3-hurtflash`).
  - **Action** : `CombatFX.hurtFlash(intensity)` — voile rouge radial
    bref (`#cfx-hurt-flash`, z 38 sous float-dmg pour laisser lire les
    chiffres ; alpha modulé par la custom prop `--hurt-a`), dans l'esprit
    de `combatStart()`. Appelé via le helper `_maybeHurtFlash(applied,
    target)` dans `battle.js — _enemyPhysicalHit` (le résolveur de frappe
    physique appelé par `enemyTurn`, là où `CFX_safe.shake` est déjà posé)
    — branches Garde-mitigée ET coup normal. Seuil relatif `≥ 15 %` des
    PV max ; `intensity = min(1, frac/0.4)`. Défensif (`CFX_safe`),
    reduced-motion = fade très court. Aucune mécanique touchée.
  - **Tests** : `scenarioCombatFX` étendu — F1 vérifie l'API `hurtFlash`,
    F6 vérifie appel direct + proxy sans throw + montage de
    `#cfx-hurt-flash`.
  - **Bumps** : `combat-fx.js` (4→5), `combat-fx.css` (5→6), `battle.js`
    (19→20) ; `CACHE_VERSION` v48 → v49. Pas de nouveau global → loader
    inchangé (`hurtFlash` est une méthode de `CombatFX`).
  - **Mergé** : PR #358 (master). D3 clos.
- 2026-06-01 : **D4 implémenté** (PR dédiée, branche
  `claude/immersion-d4-tension-audio`).
  - **Action** : `ambient_tension.ogg` branché comme **musique de combat**
    via `_COMBAT_SAMPLES.tension` + nouvel axe **prioritaire** dans
    `audio-music.js — _combatSampleKey`. Helper pur `_partyInCriticalDanger()`
    (membre vivant sous 25 % PV — même seuil que la vignette D2). La couche
    `tension` prime sur tous les autres axes (epic/late/difficulté).
  - **Décision (écart documenté)** : le plan évoquait « boss epic OU danger
    critique » → `tension`. Mais `combat_epic` existe déjà et est testé
    (T2). Faire gagner `tension` sur tout boss epic **orphelinerait**
    `combat_epic`. J'ai donc scopé `tension` au **danger critique du
    groupe** (le déclencheur réellement neuf et sans sample dédié) ; les
    boss épiques non critiques gardent `combat_epic`. En danger critique,
    `tension` prime même contre un boss epic — ce qui couvre le « OU » du
    plan. Surface conforme, aucune régression de `combat_epic`.
  - **Repli sûr** : aucun changement à `startCombatMusic` — la chaîne de
    fallback existante (`tension` 404 → `combat_normal` → synthèse
    procédurale) s'applique telle quelle (`tension !== 'combat_normal'`).
    `getFloorTheme` non touché (pas de tranche d'ambiance inventée).
  - **Tests** : `scenarioFloorTheming` T2 étendu — `tension` sur danger
    critique (normal ET epic), `combat_normal` si le membre bas-PV est KO,
    baseline inchangée, `_COMBAT_SAMPLES.tension` → `ambient_tension.ogg`.
  - **Bumps** : `audio-music.js` (index 3→4, sw 2→4 — alignés) ;
    `CACHE_VERSION` v49 → v50. Pas de nouveau global → loader inchangé.
  - **Mergé** : PR #360 (master). D4 clos → **Lot D entièrement clos**.
- 2026-06-01 : **E1 implémenté** (PR dédiée, branche
  `claude/immersion-e1-enemy-idle`).
  - **Action** : idle des sprites ennemis de couloir. `drawEnemySprite`
    (`renderer-entities.js`) applique un léger bobbing vertical
    (`sin(phase·1.8)·sz·0.03`) + respiration (`scale 1±0.02`) via la phase
    partagée `_npcAnimPhase` (déjà tickée par `startNpcAnimLoop`). Corps +
    aura bobbent ; ombre au sol et barre de PV restent fixes (lisibilité).
    Phase 0 par défaut ⇒ rendu historique inchangé.
  - **Boucle** : `startNpcAnimLoop` (`renderer-effects.js`) tick désormais
    aussi quand un ennemi est dans l'axe de regard, via le helper pur
    `_enemyAheadVisible()` (scan ≤ 5 cases, `false` en combat car la vue 3D
    est masquée par l'overlay). reduced-motion via `_spriteReducedMotion()`
    → amplitude 0 (sprite statique).
  - **Pas de nouvel état persistant** : réutilise `_npcAnimPhase` (déjà non
    sérialisé). Aucune mécanique touchée.
  - **Tests** : nouveau `scenarioEnemyIdle` — helpers exposés,
    `_enemyAheadVisible` (devant=true / vide=false / combat=false),
    `drawEnemySprite` sans throw (emoji, 3 phases), reduced-motion
    (amplitude 0, pas de throw via `emulateMedia`).
  - **Bumps** : `renderer-entities.js` (1→2), `renderer-effects.js`
    (11→12) ; `CACHE_VERSION` v50 → v51. Pas de nouveau global critique
    (helpers internes au rendu) → loader inchangé.
  - **Mergé** : PR #361 (master). E1 clos.
- 2026-06-01 : **E2 implémenté** (PR dédiée, branche
  `claude/immersion-e2-status-flash`).
  - **Action** : `CombatFX.statusFlash(targetKey, statusId)` — anneau
    coloré qui se dilate + glyphe du statut, ancré sur la carte affligée
    (réutilise `anchorFor` / `ensureFxLayer`). Couleur + emoji dérivés de
    `STATUS_DEFS[statusId]` (lu au runtime, défensif, fallback neutre).
    Appelé dans `battle.js — applyStatus` au moment de la **pose** (pas au
    tick), via le helper pur `_combatTargetKey(target)` (résout
    `enemy:N` / `ally`). `CFX_safe` défensif → no-op hors overlay de
    combat. reduced-motion = fade sans dilatation/translation.
  - **Tests** : `scenarioCombatFX` étendu — F1 vérifie l'API `statusFlash`,
    F7 vérifie appel direct + proxy + pose réelle via `applyStatus` sans
    throw, montage anneau+glyphe (`.cfx-status-ring`/`.cfx-status-glyph`),
    F7b vérifie l'auto-retrait (anim terminée).
  - **Bumps** : `combat-fx.js` (5→6), `combat-fx.css` (6→7), `battle.js`
    (20→21) ; `CACHE_VERSION` v51 → v52. Pas de nouveau global → loader
    inchangé (`statusFlash` est une méthode de `CombatFX`).
  - **Mergé** : PR #362 (master). E2 clos.
- 2026-06-01 : **E3 implémenté** (PR dédiée, branche
  `claude/immersion-e3-dungeon-vfx`).
  - **Action** : `DungeonFX.burst(hostId, kind)` — gerbe DOM de particules
    + halo central, ancrée dans un élément hôte (`explore-overlay` /
    `levelup-modal`), réutilisant l'infra `dungeon-fx.js`. 3 palettes :
    `gold` (coffre), `water` (fontaine), `levelup` (gerbe montante). CSS
    dans `dungeon-fx.css`. Hooks défensifs (`DFX_safe`, garde `typeof`) :
    `openChest()` (or, après `playChestOpen`), `useFountain()` (eau, après
    le soin) dans `movement-interactions.js` ; `checkLevelUp()` (level-up,
    après l'affichage de la modale) dans `battle-rewards.js`. reduced-motion
    = halo bref sans projectiles. Aucune mécanique touchée.
  - **Tests** : nouveau `scenarioDungeonVfx` — API + proxy, montage/auto-
    retrait de `.dfx-burst-layer`, call-sites réels
    (openChest/useFountain/checkLevelUp) sans throw, reduced-motion (halo
    seul, 0 particule via `emulateMedia`).
  - **Bumps** : `dungeon-fx.js` (1→2), `dungeon-fx.css` (1→2),
    `movement-interactions.js` (7→8), `battle-rewards.js` (2→3) ;
    `CACHE_VERSION` v52 → v53. Pas de nouveau global → loader inchangé
    (`burst` est une méthode de `DungeonFX`).
  - **Mergé** : PR #364 (master, après rebase sur l'easter-egg #363). E3 clos.
- 2026-06-01 : **E4 implémenté** (PR dédiée, branche
  `claude/immersion-e4-dust`).
  - **Action** : poussière ambiante des couloirs. `drawDungeonDust()`
    (`dungeon-fx.js`) peint 18 fines motes flottantes sur la scène (appelé
    par `renderer.js` juste après la brume, avant le cadre de premier plan).
    Teinte modulée par la tranche d'ambiance via `getFloorTheme(currentFloor)`
    (`_DUST_TINTS` : intro doré / dungeon ambré / depths bleuté / abyss
    runique). Dérive lente + scintillement pilotés par `_dungeonFxPhase`,
    alpha très bas (0.05–0.11), `globalCompositeOperation:'screen'`. Faible
    densité pour ne pas charger la lisibilité.
  - **reduced-motion = désactivée** : double garde — la boucle
    `startDungeonFxLoop` ne démarre pas (phase reste 0 → `drawDungeonDust`
    no-op) ET garde `matchMedia` explicite dans la fonction. Phase 0 (rendu
    statique initial) ⇒ no-op aussi → aucune régression du rendu historique.
  - **Tests** : `scenarioDungeonFX` étendu — G1 vérifie `drawDungeonDust`
    (+ `DungeonFX.burst` E3), G4 vérifie l'absence de throw sur les 4
    tranches d'ambiance + phase 0, G4b vérifie le no-op reduced-motion.
  - **Bumps** : `dungeon-fx.js` (2→3), `renderer.js` (12→13) ;
    `CACHE_VERSION` v53 → v54. Pas de CSS (peint sur canvas), pas de
    nouveau global → loader inchangé.
  - **Mergé** : PR #… (master). E4 clos → **Lot E entièrement clos**
    (E1→E4). Reste seulement le Lot F (F1/F2, à cadrer).
- 2026-06-01 : **Lot F cadré** avec l'utilisateur (AskUserQuestion) →
  F1 = **crossfade par intensité** (pas de couche additive) ; F2 =
  **synthèse procédurale** (pas d'assets OGG) ; exécution = cadrer +
  implémenter.
- 2026-06-01 : **F1 implémenté** (PR dédiée, branche
  `claude/immersion-f1-adaptive-music`). Voir cadrage détaillé § F1
  ci-dessus. `updateCombatIntensity()` + `_fadeOutCombatLayer()`
  (`audio-music.js`), état `_activeCombatKey`/`_combatGains` (`audio.js`),
  `_playSampleLoop(…, gainBucket)`, hook dans `updateUI()`. Test
  `scenarioAdaptiveCombatMusic` (déterministe via buffers réels injectés).
  **Bumps** : `audio.js` (1→2), `audio-music.js` (4→5), `ui.js` (8→9) ;
  `CACHE_VERSION` v54 → v55. Pas de nouveau global → loader inchangé
  (méthodes de `AudioSystem`).

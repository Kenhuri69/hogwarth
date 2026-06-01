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

### F1. Musique adaptative en couches
Au-delà du switch combat/ambiant binaire.

- **Action** : fondu dynamique d'intensité selon l'état (PV groupe,
  présence de boss). Réutilise `tension` (D4) comme couche haute.
  **À cadrer** : éviter les coupures abruptes ; gérer le `musicGain`
  ramping sans empiler deux boucles.
- **Vérif** : à définir au cadrage (transport audio testé via stubs comme
  le reste de la suite).

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

# Plan — Immersion (suite / backlog post-refonte)

> Démarré 2026-05-31. Branche `claude/game-immersion-ideas-pto4P`.
> Fait suite à `.claude/plans/immersion-combat-vfx.md` (Lots 1-2-3 livrés
> et mergés : combat, donjon, intro/victoire). Ce document recense les
> pistes **optionnelles** identifiées après la refonte, priorisées par
> ratio impact/effort. **Aucune n'est requise** — backlog à piocher.

## Principes (inchangés depuis la refonte)

- 100 % visuel/audio/UX : ne touche **aucune** mécanique (dégâts, état,
  sauvegarde, RNG de combat).
- Zéro dépendance, pas de build, modules `<script>` séquentiels.
- Call-sites **défensifs** (proxy `*_safe` calqué sur `CFX_safe` /
  `DFX_safe` / `CIN_safe`) : le jeu fonctionne si le module manque.
- Respecter `@media (prefers-reduced-motion: reduce)`.
- Chaque item livré : scénario smoke dédié + bumps `?v=` + bump
  `CACHE_VERSION` du SW (+ entrées PRECACHE) + entrée loader si nouveau
  global critique. `node tests/smoke.js` et `node tests/pwa-smoke.js`
  verts avant merge.

---

## A. Petits polish (faible effort) — recommandés en premier

### A1. Sting audio de victoire ★ (meilleur ratio impact/effort)
La modale de victoire (`endgame.js — showVictoryScreen`) est silencieuse.
`AudioSystem.playVictory()` existe déjà (accord majeur).

- **Action** : appeler `AudioSystem.playVictory()` à l'ouverture de la
  modale, derrière un garde `typeof`.
- **Vérif** : son joué à la victoire ; pas de double-jeu si la modale est
  ré-affichée (idempotence — `showVictoryScreen` est idempotente, donc
  jouer le sting uniquement à la **première** ouverture via un flag local
  ou en s'appuyant sur `checkVictoryTrigger`). Smoke : étendre
  `scenarioVictoryTrigger` (ou `scenarioCinematics`) pour asserter l'appel
  sans throw.

- **[x] Implémenté (2026-05-31)** :
  - `js/endgame.js` — flag de module `_victoryStingPlayed` (déclaré en
    tête de l'IIFE) ; dans `showVictoryScreen`, après `display='flex'`,
    appel `AudioSystem.playVictory()` derrière garde
    `typeof AudioSystem !== 'undefined' && AudioSystem.playVictory`,
    gardé par `!_victoryStingPlayed` (set à `true` après). Aucune
    mécanique touchée, pas de réassignation `player`/`party`.
  - Smoke : `scenarioVictoryTrigger` étendu (spy sur
    `AudioSystem.playVictory`) — assert appelé **1×** au 1ᵉʳ trigger,
    **pas re-appelé** au 2ᵉ `showVictoryScreen()` (idempotence), sans throw.
  - Bumps : `js/endgame.js?v=2 → v=3` (`index.html` + `sw.js`),
    `CACHE_VERSION 'hogwarth-v41' → 'hogwarth-v42'`.

### A2. Réglages fins du rendu existant (à la demande)
Aucune nouvelle surface — uniquement des constantes à ajuster si le rendu
déplaît visuellement :
- Motes intro/victoire : `PRESETS` dans `cinematics.js` (count, rise,
  sway, color, bloom).
- Vacillement torches + braises : `drawTorch` (`renderer-effects.js`),
  amplitude pilotée par `_dungeonFxPhase`.
- Brume de profondeur : `drawDepthsMist` (`dungeon-fx.js`) — nombre de
  nappes, alpha, vitesse.
- **Vérif** : revue visuelle ; smoke inchangé (pas de nouvelle assertion).

- **[x] A2 — motes plus présentes (2026-05-31)** : retour utilisateur
  « motes trop discrètes ». Réglage des constantes `PRESETS`
  (`cinematics.js`), aucune nouvelle surface, blend additif `lighter`
  inchangé (donc densité + taille ⇒ plus lumineux automatiquement) :
  - intro : `count 34 → 48`, `rMax 3.4 → 4.4`.
  - victory : `count 52 → 72`, `rMax 4.2 → 5.4`, halo `breathe`
    `0.10 → 0.15` (amplitude `0.05 → 0.07`).
  - Bump `cinematics.js?v=1 → v=2` (`index.html` + `sw.js`),
    `CACHE_VERSION hogwarth-v42 → v43`.
  - Smoke inchangé (scénario `Cinematics` ne fige pas les valeurs) ;
    `node tests/smoke.js` + `node tests/pwa-smoke.js` verts.

---

## B. Moyens

### B1. VFX de soin / buff dédiés
Le Lot 1 (`combat-fx.js — spellBurst`) couvre surtout l'offensif
élémentaire. Manquent les retours visuels de soutien.

- **Action** : ajouter `CombatFX.healBurst(targetKey)` (gerbe verte
  montante) et `CombatFX.buffAura(targetKey)` (halo doré bref). Brancher
  dans les handlers de soin/buff (`battle-spells.js` — Episkey, Ferula,
  Reparo ; buffs de Garde/Protego déjà signalés autrement, à voir).
- **Vérif** : burst vert visible sur un soin, distinct du burst offensif ;
  `scenarioSpellUx` ou `scenarioCombatFX` étendu ; smoke vert.

- **[x] Livré (2026-06-01)** — branche `claude/immersion-b1-heal-buff-fx`.
  `node tests/smoke.js` (150 scénarios, `Combat FX` F1+F4 verts) +
  `node tests/pwa-smoke.js` (cache `hogwarth-v44`, 84 entrées) verts.
  Écart : `battle-spells.js?v` bumpé en plus (7→8) car son contenu change
  — non listé initialement, ajouté pour cohérence du cache-busting.
  Étapes :
  1. `js/combat-fx.js` : `healBurst(targetKey)` (halo vert + particules
     **montantes** dy fortement négatif + glyphe `✚`) et
     `buffAura(targetKey)` (anneau doré qui s'évase, glyphe `✦`). Ajoutés
     à `window.CombatFX`. → vérif : F1 smoke asserte les 2 fns + proxy.
  2. `css/combat-fx.css` : classes `.cfx-heal-halo/-particle/-glyph` et
     `.cfx-buff-ring/-glyph` + keyframes ; `prefers-reduced-motion` =
     particules masquées, halo/anneau fade court. → vérif : revue + règle
     reduced-motion présente.
  3. `js/battle-spells.js` (bloc FX central de `castSpellInBattle`) :
     `Set` heal (`heal`, `support_regen`, `support_regen_aoe`, `heal_aoe`)
     → `CFX_safe.healBurst('ally')` ; `Set` buff (`shield`,
     `patronus_maxima`) → `CFX_safe.buffAura('ally')`. Défensif, aucune
     mécanique touchée. → vérif : F4 smoke (lancer un sort de soin en
     combat ne throw pas).
  4. Bumps `combat-fx.js?v=1→2`, `combat-fx.css?v=1→2` (`index.html` +
     `sw.js`), `CACHE_VERSION v43→v44`. → vérif : pwa-smoke vert, cache
     annoncé v44.
  5. `node tests/smoke.js` + `node tests/pwa-smoke.js` verts avant push.

### B2. Activer les réserves déjà câblées en commentaire
Assets/clés préparés mais non activés :
- Tileset `rune_*` « Ruines Anciennes » (palier étages 14+) — commenté
  dans `floor-themes.js`. **Pré-requis : les textures `rune_*` doivent
  exister** dans `textures.js`/`img/` (vérifier avant d'activer).
- Samples musicaux `tension` / `abyss` — réservés dans `_ZONE_SAMPLES`
  (`audio-music.js`). **Pré-requis : fichiers OGG présents.**
- **Action** : décommenter + brancher uniquement si les assets existent ;
  sinon, hors-scope (ne pas générer d'assets ici sans demande explicite).
- **Vérif** : `scenarioFloorTheming` / `scenarioFloorTextures` étendus ;
  repli sûr si asset manquant (404 → fallback existant).

- **[x] Livré (2026-06-01)** — branche `claude/immersion-b2-ruins-tier`.
  Vérif pré-requis : assets **tous présents** (`img/textures/{walls/rune_wall,
  floor/rune_floor,ceiling/rune_ceiling}.png` ; `audio/ambient_{tension,abyss}.ogg` ;
  `textures.js` charge déjà les `rune_*` ; `_ZONE_SAMPLES` mappe déjà
  `abyss`/`tension`). Activation donc en scope.
  - `js/floor-themes.js` : `depths` borné `[7,null] → [7,13]` (couplage
    **obligatoire** : sinon `getFloorTheme(14)` matche `depths` en premier),
    ajout `ancient: [14,null]` (rune_*, ambiant `abyss`, « Ruines Anciennes »).
  - **Aucune autre couche touchée** : `renderer.js` (textures), `audio-music.js`
    (`_zoneKeyForFloor`) et `movement-floors.js` (`_maybePlayTierTransition`)
    lisent `getFloorTheme` dynamiquement → s'adaptent seuls. L'override
    post-victoire `rune_*` (11+) est conservé (couvre 11-13).
  - **Effet observable** : ambiance `abyss` aux étages 14+ (au lieu de
    `depths`) + fondu de transition au passage 13↔14. Textures inchangées en
    pratique (override déjà actif à 14+ post-victoire). `tension` **laissé en
    réserve** (aucune tranche naturelle sans inventer un palier — hors-scope).
  - Doc : table « Thèmes par tranche » de `CLAUDE.md` (ajout tranche D) +
    frontière `13↔14` listée pour `_maybePlayTierTransition`.
  - Smoke : `scenarioFloorTheming` T1 mis à jour (étage 14 → « Ruines
    Anciennes », `rune_*`, `abyss`).
  - Bumps : `floor-themes.js?v=1→2` (`index.html` + `sw.js`),
    `CACHE_VERSION v43→v45` (v44 réservé par la PR B1 parallèle #350).
  - `node tests/smoke.js` + `node tests/pwa-smoke.js` verts.

---

## C. Plus gros (à cadrer avant de lancer)

### C1. Transition animée d'entrée en combat
Aujourd'hui `#encounter-overlay` apparaît assez sèchement (display flex).

- **Action** : voile + zoom/flash court à l'ouverture du combat
  (`battle.js — startBattle`), via une classe CSS sur l'overlay, retirée
  après l'anim. Réutiliser l'esprit `_maybePlayTierTransition`
  (`movement.js`). Défensif + reduced-motion.
- **Risque** : timing avec `CombatFX.bossIntro` (déjà ~1.8 s) — séquencer
  pour ne pas empiler deux cinématiques. **À cadrer.**
- **Vérif** : combat s'ouvre sans état figé ; `scenarioCombatFX` /
  `scenarioCombatMobile` étendus ; smoke vert.

- **[x] Livré (2026-06-01)** — branche `claude/immersion-c1-combat-enter`.
  `node tests/smoke.js` (149, `Combat FX` F1+F5 verts) + `node tests/pwa-smoke.js`
  (cache `hogwarth-v46`) verts. Cadrage validé (user a choisi C1). Étapes :
  1. `js/combat-fx.js` : `combatStart()` — voile radial chaud (flash) +
     léger zoom appliqué via un élément dédié `#cfx-combat-flash` appendé à
     `#encounter-overlay`, auto-retiré après l'anim. Exposé sur
     `window.CombatFX`. → vérif : F1 smoke asserte `combatStart` + proxy.
  2. `css/combat-fx.css` : `.cfx-combat-flash` + keyframes ; z-index 44
     (sous boss-intro 45, au-dessus float-dmg 40) ; `prefers-reduced-motion`
     = simple fade court (pas de zoom). → vérif : revue + règle reduced.
  3. `js/battle.js — startBattle` : **séquençage** — `if (epic) bossIntro
     else combatStart()`. Jamais empilé sur la carte-titre boss. Défensif
     (`CFX_safe`). → vérif : F5 smoke (combatStart en combat non-epic ne
     throw pas, crée puis retire l'élément).
  4. Bumps `combat-fx.js v=2→3`, `combat-fx.css v=2→3`, `battle.js v=17→18`
     (`index.html` + `sw.js`), `CACHE_VERSION v45→v46`.
  5. `node tests/smoke.js` + `node tests/pwa-smoke.js` verts avant push.

### C2. Mise en scène de la mort / pétrification (hors Ironman)
L'écran de mort (`death-screen`, `triggerDeath` dans `battle-death.js`)
est statique.

- **Action** : effet de pétrification progressive (désaturation + givre)
  avant l'affichage du `death-screen`. **Ne pas toucher** le flux Ironman
  (`showIronmanResult` — permadeath stricte, ne pas ralentir).
- **Risque** : ne pas interférer avec `resurrect()` ni la suppression de
  slots Ironman. **À cadrer.**
- **Vérif** : mort normale → anim → écran ; mort Ironman → inchangée ;
  `scenarioIronman` reste vert ; smoke complet vert.

- **[x] Livré (2026-06-01)** — branche `claude/immersion-c2-death-petrify`.
  `node tests/smoke.js` (150, nouveau `scenarioDeathPetrify` P1-P3 + Ironman
  `petrifyShown:false`) + `node tests/pwa-smoke.js` (cache `hogwarth-v47`) verts.
  Cadrage validé (user a choisi C2). Analyse du flux :
  `triggerDeath` (`battle-death.js`) sort **tôt** pour l'astral et l'Ironman
  (chemins inchangés) ; dans le chemin principal (`battle.js:946-949`)
  l'overlay de combat est déjà masqué + `inBattle=false` **avant** l'appel
  → pas de risque d'interaction. Aucun scénario smoke n'attend `#death-screen`
  visible *synchrone* sur mort normale (les 3 cas testés = Ironman/astral/duel,
  tous précoces) → le délai n'en casse aucun. Étapes :
  1. `js/combat-fx.js` : `petrify()` — overlay plein écran `#cfx-petrify`
     (`backdrop-filter: grayscale + brightness` ramping + givre `box-shadow`
     inset), z-index 880 (sous `#death-screen` 900), auto-retiré. Retourne
     la durée (ms) à attendre avant l'écran, **0** en reduced-motion (pas de
     ralentissement). Exposé sur `window.CombatFX`.
  2. `css/combat-fx.css` : `.cfx-petrify` + `@keyframes cfxPetrify` ;
     reduced-motion neutralisé.
  3. `js/battle-death.js` : **chemin normal uniquement** (après les `return`
     astral + Ironman) — `dur = (CFX_safe && CFX_safe.petrify())||0` ; si
     `dur>0` `setTimeout(showDeath,dur)` sinon `showDeath()` immédiat
     (défensif : module absent → 0 → écran direct). `resurrect()` retire
     un éventuel `#cfx-petrify` résiduel.
  4. Smoke : nouveau `scenarioDeathPetrify` (mort normale → `#cfx-petrify`
     créé puis `#death-screen` visible après délai ; `resurrect` nettoie) +
     `scenarioIronman` étendu (assert `#cfx-petrify` **absent** en Ironman).
  5. Bumps `combat-fx.js v=3→4`, `combat-fx.css v=3→4`, `battle-death.js
     v=1→2`, `CACHE_VERSION v46→v47`.
  6. `node tests/smoke.js` + `node tests/pwa-smoke.js` verts avant push.

---

## Priorisation suggérée

1. **A1** (sting victoire) — quasi gratuit, fort impact ressenti.
2. **A2** (réglages) — à la demande, selon retour visuel.
3. **B1** (VFX soin/buff) — complète le Lot 1.
4. **B2** (réserves) — seulement si les assets existent déjà.
5. **C1 / C2** — nécessitent un cadrage (séquençage cinématiques / flux mort).

## Journal d'avancement

- 2026-05-31 : backlog rédigé après livraison des Lots 1-3. Rien d'engagé.
- 2026-05-31 : **A1 livré** (sting audio de victoire). Câblage défensif +
  idempotence par flag local, scénario smoke étendu, bumps `?v=`/cache.
  `node tests/smoke.js` et `node tests/pwa-smoke.js` verts. Écart : aucun.

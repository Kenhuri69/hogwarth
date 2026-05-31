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

---

## Priorisation suggérée

1. **A1** (sting victoire) — quasi gratuit, fort impact ressenti.
2. **A2** (réglages) — à la demande, selon retour visuel.
3. **B1** (VFX soin/buff) — complète le Lot 1.
4. **B2** (réserves) — seulement si les assets existent déjà.
5. **C1 / C2** — nécessitent un cadrage (séquençage cinématiques / flux mort).

## Journal d'avancement

- 2026-05-31 : backlog rédigé après livraison des Lots 1-3. Rien d'engagé.

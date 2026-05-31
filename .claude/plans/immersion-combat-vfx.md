# Plan — Immersion (refonte sensorielle)

> Démarré 2026-05-31. Branche `claude/game-immersion-ideas-pto4P`.
> Objectif global : renforcer l'immersion visuelle/narrative (l'audio est
> déjà très solide). Livraison **par lots itératifs**. L'utilisateur veut à
> terme les 4 axes : juice visuel, VFX de sorts, cinématique de boss,
> cinématiques intro/victoire. On commence par un **lot ciblé**.

## Constat (audit)

- Audio : excellent (musique procédurale + samples OGG, ~100 voix, karaoké).
- Juice combat existant : `UX.floatDmg`, `.shake-hit`, `.flash-heal`, timeline,
  journal. Tout passe par `window.UX` + proxy `UX_safe` (no-op si absent).
- Manques visuels : donjon figé (torches statiques), **aucun VFX de sort**
  (système élémentaire complet mais invisible à l'écran), boss epic sans
  mise en scène, intro/victoire statiques.

## Lot 1 — Immersion en combat (CE LOT)

Bloc le plus cohérent et impactant. 100 % visuel/UX, ne touche aucune
mécanique de jeu (dégâts, état, sauvegarde inchangés).

Nouveau module `js/combat-fx.js` exposant `window.CombatFX` + helper sûr
`CFX_safe`. CSS dédié `css/combat-fx.css`.

### Étapes

1. **Module `combat-fx.js` + `combat-fx.css`** → vérif : chargés dans
   `index.html` (avant `loader.js`), `window.CombatFX` présent, ajout au
   MANIFEST loader, smoke vert.
2. **VFX de sorts élémentaires** : `CombatFX.spellBurst(targetKey, element)`
   — burst coloré par élément (feu/glace/foudre/lumière/ténèbres/physique)
   ancré sur la carte ennemie (réutilise l'ancrage de `floatDmg`).
   Appel depuis les handlers offensifs de `battle-spells.js`.
   Vérif : burst visible en combat, couleur ≠ selon sort, smoke vert.
3. **Screen shake global** : `CombatFX.shake(intensity)` sur crit physique,
   crit de sort, coups de boss. Classe CSS sur `#encounter-overlay`.
   Respecte `prefers-reduced-motion`.
4. **Cinématique de boss** : `CombatFX.bossIntro(enemy)` à l'apparition d'un
   `enemy.epic` (depuis `startBattle`) — assombrissement + carte-titre
   (nom + sous-titre), ~1.6 s, puis fade. Sting audio = `combat_epic` déjà
   géré par `startCombatMusic`.
5. **Smoke** : scénario `scenarioCombatFX`. Bump des `?v=`. Test vert.

### Contraintes

- Zéro dépendance, pas de build. Modules `<script>` séquentiels.
- Call-sites défensifs (`CFX_safe`, calqué sur `UX_safe`). Le jeu
  fonctionne si le module manque.
- Respecter `@media (prefers-reduced-motion: reduce)`.
- Ne pas réassigner `player`/`party`. Ne pas toucher la logique de combat.

## Lot 2 — Juice du donjon (À VENIR)
Torches vacillantes + braises, brume de profondeur, shake exploration.

## Lot 3 — Cinématiques intro/victoire (À VENIR)
Intro animée d'arrivée à Poudlard ; séquence de victoire `victoryAchieved`.

## Journal d'avancement

- 2026-05-31 : audit fait, baseline smoke **145/145** vert, plan rédigé.
- 2026-05-31 : **Lot 1 livré.**
  - ✅ Étape 1 : `js/combat-fx.js` (+ `window.CombatFX`, helper `CFX_safe`)
    et `css/combat-fx.css` créés ; liés dans `index.html` ; entrée
    `CombatFX` (optional) ajoutée au MANIFEST de `loader.js`.
  - ✅ Étape 2 : `CombatFX.spellBurst(targetKey, element)` — burst coloré
    par élément, branché dans `castSpellInBattle` (`battle-spells.js`)
    pour les effets offensifs (single + AoE).
  - ✅ Étape 3 : `CombatFX.shake('light'|'heavy')` — sur crit physique et
    coup encaissé (`battle.js`), crit de sort (`battle-spells.js`).
    Respecte `prefers-reduced-motion`.
  - ✅ Étape 4 : `CombatFX.bossIntro(enemy)` — carte-titre des boss `epic`,
    déclenchée depuis `startBattle` (`battle.js`).
  - ✅ Étape 5 : scénario `scenarioCombatFX` ajouté ; bumps `?v=`
    (battle v17, battle-spells v7, sw cache v9). **Smoke 146/146 vert.**
  - Reste à faire : Lots 2 (juice donjon) et 3 (cinématiques intro/victoire).

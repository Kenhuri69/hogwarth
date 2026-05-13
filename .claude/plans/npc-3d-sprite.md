# PNJ — Sprite visible dans la vue pseudo-3D

## Contexte

Aujourd'hui les PNJ sont placés sur la carte (`CELL.NPC` posé par
`dungeon.js`, dispatch via `npcPlacements: Map<"x,y", npcId>`) et
visibles **uniquement sur la minimap** (`renderer-minimap.js:38+`
avec classes `.map-npc` / `.map-npc-offer` / `.map-npc-ready`).

Dans la vue pseudo-3D, ils sont invisibles : on entre sur leur case
sans aucune indication visuelle. `movement.js:204` détecte bien
l'entrée sur `CELL.NPC` pour ouvrir le dialogue, mais aucun sprite
n'est dessiné en amont.

> **Code mort détecté** : `renderer-effects.js:222+` contient un cas
> `CELL.NPC` dans `drawCellMarker` (silhouette dorée vectorielle, halo
> pulsé, signe `!`/`?`). `startNpcAnimLoop` existe aussi et anime
> `_npcAnimPhase`. Mais `drawCellMarker` n'est appelé que pour
> `CELL.DOOR` (renderer.js:273) — donc le code NPJ n'a jamais tourné.
> On va le ressusciter comme **fallback vectoriel** du nouveau sprite
> PNG, par symétrie avec `drawEnemySprite` (PNG prioritaire, emoji
> fallback).

## Décision V1 (« démarrage simple »)

- **Un seul PNG** pour tous les PNJ : `img/npc/_wizard_generic.png`.
- Pas de variante par PNJ ni par genre — ça vient plus tard.
- Le signe ❗/❓ (état de la quête liée) reste calculé par
  `getNpcMarkerSign(npcId)` et est rendu en overlay au-dessus du sprite.
- Le halo doré et l'ombre au sol sont rendus en code (cohérent avec
  `drawEnemySprite` qui fait pareil pour les monstres) — le PNG n'a
  qu'à fournir la silhouette du sorcier sur fond transparent.

## PNG — caractéristiques visées

| Propriété | Valeur |
|-----------|--------|
| Chemin    | `img/npc/_wizard_generic.png` |
| Dimensions | 512×512 RGBA (cohérent avec `img/monsters/*.png`) |
| Fond      | 100 % transparent |
| Sujet     | Silhouette de sorcier de face — chapeau pointu, robe ample, baguette levée |
| Palette   | Or chaud (`#d8b34c`), parchemin profond (`#8a6840`), ombres `#2a1a08` |
| Style     | Stylisé / aplats avec léger gradient — pas photo-réaliste |

Génération via PIL (Python) — script jetable lancé une fois.
L'image résultante est commit dans le repo. Pas de pipeline persistant.

## Architecture côté code

### renderer-effects.js

Ajouter :

```js
let _NPC_SPRITE = null;
function _getNpcSprite() {
  if (_NPC_SPRITE) return _NPC_SPRITE;
  _NPC_SPRITE = { img: new Image(), ready: false };
  _NPC_SPRITE.img.onload = () => { _NPC_SPRITE.ready = true; };
  _NPC_SPRITE.img.src = 'img/npc/_wizard_generic.png';
  return _NPC_SPRITE;
}

function drawNpcSprite(npcId, x, baseY, sz) {
  // … ombre + halo + signe basés sur _npcAnimPhase
  const entry = _getNpcSprite();
  if (entry.ready) {
    ctx.drawImage(entry.img, x - sz, baseY - sz * 2, sz * 2, sz * 2);
  } else {
    // fallback : silhouette vectorielle (ex-code mort de drawCellMarker)
    _drawNpcVectorFallback(x, baseY, sz);
  }
  // … signe ❗/❓ par-dessus
}
```

Le code mort actuel (`drawCellMarker` cas `CELL.NPC`) est déplacé dans
`_drawNpcVectorFallback` et le cas `NPC` est **retiré** de
`drawCellMarker` (puisque drawCellMarker n'est plus jamais appelé avec
`CELL.NPC` après ce câblage).

### renderer.js

Dans le scan `pendingSprite` (ligne ~216), ajouter `CELL.NPC` :

```js
if (!pendingSprite && (cell === CELL.CHEST || cell === CELL.STAIRS_D
    || cell === CELL.STAIRS_U || cell === CELL.SHOP
    || cell === CELL.NPC)) { … }
```

Et dans le dispatch (ligne ~483) :

```js
else if (cell === CELL.NPC) {
  const npcId = (typeof npcPlacements !== 'undefined')
    ? npcPlacements.get(`${playerX + dx*d},${playerY + dy*d}`) : null;
  drawNpcSprite(npcId, x, baseY, sz);
}
```

Subtilité : le `pendingSprite` capture la cellule, pas le `(x,y)` du
PNJ. On stocke aussi `mapX`/`mapY` dans `pendingSprite` pour pouvoir
retrouver le `npcId` au moment du dispatch.

### startNpcAnimLoop

Déjà présent. Reste actif tant que `npcPlacements.size > 0`. Pas
de changement.

## Étapes & vérifications

1. [x] Plan rédigé (ce fichier).
2. [x] PNG `img/npc/_wizard_generic.png` généré (512×512 RGBA,
   transparent, silhouette or/parchemin via `/tmp/gen_wizard_generic.py`).
3. [x] `drawNpcSprite(npcId, x, baseY, sz)` ajouté dans
   `renderer-effects.js`. Fallback vectoriel câblé. Ex-code mort de
   `drawCellMarker` cas `CELL.NPC` retiré.
4. [x] `CELL.NPC` ajouté au scan `pendingSprite` + dispatch dans
   `renderer.js`. `pendingSprite` étendu avec `mapX/mapY`.
5. [x] Manifest loader : entrée `drawNpcSprite` ajoutée (total 84).
6. [x] Smoke scenario `scenarioNpcSprite3D` : place Dumbledore devant
   le joueur, spy sur `drawNpcSprite`, vérifie 1 call avec
   `npcId === 'dumbledore'` + coords numériques. Vérifie aussi que
   `img/npc/_wizard_generic.png` est chargeable et qu'aucun appel
   n'est fait quand aucun PNJ n'est devant.
7. [x] `node tests/smoke.js` vert (49 scénarios).
8. [x] CLAUDE.md : section « Système PNJ » étendue avec sous-section
   sprite pseudo-3D.
9. [ ] Commit + push.

## Hors-scope V1

- Variantes par genre / rôle / catégorie de PNJ.
- Variantes par maison (couleur de la robe).
- Animation idle plus riche (oscillation latérale, blink).
- Distance LOD (sprite plus petit en arrière-plan).
- Adaptation darkness/variant (post-victoire) — utilisera la même
  silhouette générique sauf décision contraire ultérieure.

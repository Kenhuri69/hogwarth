# Plan — Contrôles relatifs (avancer/reculer/pivoter)

> Branche : `claude/improve-game-controls-7xFMg`
> Demandeur : ergonomie de déplacement perturbante (contrôles absolus N/S/E/O
> alors que la vue 3D est, elle, relative à `playerDir`).

## Objectif

Passer les contrôles d'un schéma **absolu** (haut = nord, gauche = ouest…)
à un schéma **relatif** type *dungeon crawler* (haut = avancer, gauche =
pivoter à gauche). Ajouter en parallèle un repère visuel d'orientation
sur la boussole et la minimap pour relier la vue 3D du centre à la carte.

## Décisions validées (questions au demandeur)

| Sujet | Choix retenu |
|-------|--------------|
| Touches WASD | **Relatives** comme les flèches (W=avancer, S=reculer, A=tourner gauche, D=tourner droite). Pas de strafe. |
| Boutons UI (desktop + D-pad mobile) | **Tous relatifs** : ▲ Avancer / ▼ Reculer / ◄ Tourner G / ► Tourner D. Pas de bouton demi-tour. |
| Indicateur boussole | **Surbrillance** de la lettre N/S/E/W correspondant à `playerDir` (couleur or + glow). Pas de SVG additionnel. |
| Indicateur minimap | **Triangle** dans la case du joueur, pointant dans `playerDir`. Appliqué à la minimap desktop **et** à l'overlay mobile. |

## Architecture cible

### 1. Nouvelles fonctions de mouvement (`js/movement.js`)

```js
moveForward()   // avance d'une case dans playerDir
moveBackward()  // recule d'une case (direction opposée à playerDir, SANS pivoter)
turnLeft()      // playerDir tourne de 90° à gauche (n→w→s→e→n)
turnRight()     // playerDir tourne de 90° à droite (n→e→s→w→n)
```

- `moveForward` et `moveBackward` réutilisent la mécanique interne de
  `move(dir)` (cellule libre, fontaine, combat, etc.). On extrait un
  helper privé `_step(dir, faceTowardDir = true)` :
  - `moveForward()` → `_step(playerDir, true)` (face dans la direction de marche)
  - `moveBackward()` → `_step(opposite(playerDir), false)` (avance dans la
    direction opposée mais conserve `playerDir`)
- `turnLeft`/`turnRight` muent `playerDir`, appellent `updateCompass()`,
  `renderMinimap()`, `drawDungeon()`, `_updateSearchBtn()` ; **pas** de
  son de pas (rotation = pas de footstep). Optionnel : son léger de
  rotation si déjà disponible, sinon silence.
- `move(dir)` legacy : **conservée** mais marquée comme deprecated en
  commentaire. Aucun call-site externe (chest, intro, save…) n'utilise
  `move(dir)`, donc on peut la garder sans rotation utilisateur impactée.
  Elle reste utilisable pour le debug ou des cinématiques futures.

### 2. Mapping clavier (`js/main.js`)

Remplacer `map={w:'n',s:'s',a:'w',d:'e',ArrowUp:'n',…}` par :

| Touche | Action |
|--------|--------|
| `ArrowUp` / `w` / `W` / `z` / `Z` | `moveForward()` |
| `ArrowDown` / `s` / `S` | `moveBackward()` |
| `ArrowLeft` / `a` / `A` / `q` / `Q` | `turnLeft()` |
| `ArrowRight` / `d` / `D` | `turnRight()` |

`z`/`q` ajoutés pour les AZERTY (cohérent avec le public francophone du
projet — la convention "WASD" reste affichée). Si l'utilisateur préfère
ne pas l'ajouter, on retirera dans un second temps.

### 3. Boutons UI (`index.html`)

Desktop (id `btn-n/s/e/w` → renommer logiquement) :

```html
<button class="cmd-btn" onclick="moveForward()"   id="btn-forward"><span class="key">W</span>↑ Avancer</button>
<button class="cmd-btn" onclick="moveBackward()"  id="btn-back"><span class="key">S</span>↓ Reculer</button>
<button class="cmd-btn" onclick="turnLeft()"      id="btn-turn-l"><span class="key">A</span>↺ Pivoter</button>
<button class="cmd-btn" onclick="turnRight()"     id="btn-turn-r"><span class="key">D</span>↻ Pivoter</button>
```

D-pad mobile :

```html
<button class="dpad-btn" onclick="moveForward()">▲</button>
<button class="dpad-btn" onclick="turnLeft()">↺</button>
<button class="dpad-btn" onclick="turnRight()">↻</button>
<button class="dpad-btn" onclick="moveBackward()">▼</button>
```

### 4. Indicateur d'orientation — Boussole (`js/ui.js` + `css/style.css`)

`updateCompass()` :
- Conserve le calcul actuel (`active` si la case adjacente est libre).
- **Ajoute** une classe `.facing` sur l'élément `#dir-<playerDir>`
  (où `playerDir ∈ {n,s,e,w}`). Toggle exclusif : un seul `.facing`
  à la fois sur les 4 lettres.
- Mapping HTML : `id="dir-o"` représente l'ouest → toggle sur
  `dir-o` quand `playerDir === 'w'`.

CSS additionnel :

```css
.compass-dir.facing {
  color: var(--gold-light);
  text-shadow: 0 0 6px rgba(201,168,76,0.9), 0 0 2px #fff7c8;
  background: radial-gradient(circle, rgba(201,168,76,0.18), transparent 70%);
}
```

### 5. Indicateur d'orientation — Minimap (`js/renderer-minimap.js` + CSS)

Dans `_buildMinimapCells`, sur la cellule joueur :
- Conserver `map-player` (fallback couleur).
- Ajouter un enfant `<div class="map-player-arrow map-player-dir-<n|s|e|w>"></div>`
  positionné en absolu, dessiné via `clip-path` triangle (pas de SVG,
  pas d'image, juste du CSS).

CSS additionnel :

```css
.map-cell.map-player { position: relative; }
.map-player-arrow {
  position: absolute; inset: 0;
  background: #fff7c8;
  clip-path: polygon(50% 10%, 90% 90%, 50% 70%, 10% 90%);
}
.map-player-dir-n { transform: rotate(0deg); }
.map-player-dir-e { transform: rotate(90deg); }
.map-player-dir-s { transform: rotate(180deg); }
.map-player-dir-w { transform: rotate(270deg); }
```

Pointe vers le haut par défaut (= `n`), rotations standards. Vérifier
que la flèche reste lisible aux deux tailles (14 px desktop, 20 px mobile).

### 6. Documentation (`CLAUDE.md`)

Mettre à jour la section « IDs HTML importants » (boutons renommés) et
ajouter une mini-section « Contrôles de déplacement » résumant le
schéma relatif retenu. Garder la section minimap à jour (mention de la
flèche d'orientation).

## Étapes — checklist de progression

1. **Plan rédigé** → vérifier : ce fichier existe, choix validés listés. ✅
2. **Helpers movement** (`movement.js`) → vérifier : `moveForward`,
   `moveBackward`, `turnLeft`, `turnRight` exposés, smoke test JS local
   confirme rotation sans déplacement. ✅
3. **Mapping clavier** (`main.js`) → vérifier : touches déclenchent les
   bonnes actions ; pas d'effet en `INPUT` ; pas de mouvement en combat. ✅
4. **Boutons UI** (`index.html`) → vérifier : 4 boutons desktop +
   4 boutons D-pad mobile câblés sur les nouveaux helpers. ✅
5. **Boussole surbrillance** (`ui.js` + `css/style.css`) → vérifier :
   en pivotant, la lettre N/S/E/W active change visuellement. ✅
6. **Flèche minimap** (`renderer-minimap.js` + CSS) → vérifier :
   triangle apparaît sur la case du joueur et tourne avec `playerDir`.
   Sur minimap desktop **et** overlay mobile. ✅
7. **MANIFEST loader** (`js/loader.js`) → vérifier : ajouter
   `moveForward/moveBackward/turnLeft/turnRight` dans `MANIFEST`
   (kind `fn`), pas de bandeau rouge. ✅
8. **Smoke test** (`tests/smoke.js`) → vérifier : nouveau scénario
   « contrôles relatifs » qui :
   - mémorise `playerDir = 'n'`,
   - dispatche `ArrowRight` → `playerDir === 'e'`,
   - dispatche `ArrowUp` → `playerX/playerY` ont avancé d'une case
     vers l'est,
   - dispatche `ArrowDown` → recule d'une case vers l'ouest **sans**
     modifier `playerDir`.
   Lancer `node tests/smoke.js`, tous les scénarios existants restent
   verts. ✅
9. **CLAUDE.md** → vérifier : section Contrôles ajoutée, IDs HTML à jour. ✅
10. **Commit + push** sur `claude/improve-game-controls-7xFMg` →
    vérifier : `git status` propre, PR pas mergée avant push (cf. §6
    guidelines). ✅

## Risques / points d'attention

- **Régression mute des refs** : `move()` legacy reste appelée par
  les overlays (`scene-icons`, `_showExploreOverlay`, etc.) ? À
  vérifier au step 2 par `grep -rn "move(" js/` — au pire, conserver
  l'API legacy.
- **Confusion documentaire** : le moteur conservera les directions
  cardinales en interne (`playerDir`, `DIRECTIONS`, minimap…).
  Seuls les contrôles d'entrée changent. Bien le préciser dans
  CLAUDE.md.
- **Mobile** : le D-pad actuel a un layout 3-ligne avec un centre.
  La nouvelle disposition garde la même structure : ▲ en haut, ↺ ◄
  centre ↻ ►, ▼ en bas. Tester sur viewport mobile (smoke prend
  déjà un screenshot mobile).
- **Combat** : `inBattle` bloque déjà `move()` ; `turnLeft`/`turnRight`
  doivent aussi être no-op en combat (la rotation pendant un combat
  n'aurait pas de sens visuel — la vue est cachée par l'overlay).
- **AZERTY** : `Z`/`Q` ajoutés en bonus. Si conflit avec un futur
  hotkey, ils seront retirés sans douleur.

## Notes de mise à jour

- **Step 2** : `_step(dir, faceDir)` factorisé, `moveBackward` passe
  `faceDir=false` pour ne pas pivoter. `move(dir)` legacy = wrapper sur
  `_step(dir, true)`.
- **Step 3** : ajout des touches AZERTY `Z`/`Q` comme prévu. Le mapping
  est désormais une succession de booléens (plus de table `map`).
- **Step 5** : découverte d'un bug latent — l'ancien code testait
  `document.getElementById('dir-w')` alors que l'ID HTML est `dir-o`.
  La lettre Ouest n'était donc jamais marquée `active`. Corrigé via
  la table `idByDir` (effet de bord positif, mais hors scope strict).
- **Step 7** : 4 nouveaux helpers ajoutés au MANIFEST → loader rapporte
  désormais 59 modules (vs 55 attendus dans la doc).
- **Step 8** : scénario `scenarioRelativeControls` (6 assertions :
  rotation, avance/recul, mapping clavier, `.facing` boussole, flèche
  minimap). Test vert + 33 scénarios existants verts.

// ============================================================
// GÉNÉRATEUR DE DONJON
// ============================================================

// ── Configuration du scaling endgame (Boucle Ténébreuse) ─────
// Formule récursive appliquée aux monstres post-victoire (floor 11+).
//
//   stat(0) = base × (1 + (relFloor − 1) × scale) × diffMult        (≡ scaling actuel)
//   stat(n) = stat(n−1) × scal(n) + baseFix_eff                     (récursion par palier de 10)
//
// avec
//   n           = ⌊(floor − 1) / 10⌋                                (0 pour 1-10, 1 pour 11-20, …)
//   relFloor    = effectiveFloor(floor)                              (1-10 dans chaque palier)
//   intraMult   = 1 + (relFloor − 1) × scale                         (scaling intra-palier)
//   scal(n)     = 1 + scalDelta / intraMult                          (mult lissé)
//   baseFix_eff = baseFix[stat] / intraMult                          (bonus lissé)
//
// Le lissage par `intraMult` réduit proportionnellement l'apport
// du bonus (+ multiplicateur) sur les monstres déjà fortement scalés
// (Voldemort relF=10, intraMult=4.6 → bonus ÷4.6) et le maximise sur
// les monstres faibles (Chat relF=1, intraMult=1 → bonus complet).
//
// TODO : à l'avenir, `scalDelta` pourrait dépendre de `n` pour rendre
//        la croissance plus agressive aux paliers profonds (palier 5+).
//        Actuellement constant à 0.5.
const ENDGAME_SCALING = {
  baseFix: { hp: 80, atk: 10, def: 5, mag: 8, xp: 50, gold: 80 },
  scalDelta: 0.5,
};

// Récursion endgame : applique `(stat × scal + fixEff)` exactement `n` fois.
// Implémentation récursive pour refléter la spec du joueur. Le coût est nul
// (n ≤ ~10 en pratique).
function _endgameRecurse(stat, n, fixEff, scal) {
  if (n <= 0) return stat;
  return _endgameRecurse(stat * scal + fixEff, n - 1, fixEff, scal);
}

// ── Utilitaires de sélection et mise à l'échelle ─────────────

// Tirage pondéré selon la propriété weight de chaque monstre
function weightedPick(pool) {
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= (m.weight || 1); if (r <= 0) return m; }
  return pool[pool.length - 1];
}

// Boucle Ténébreuse (endgame) : à floor 11+ post-victoire, on rejoue
// la progression 1-10 à l'identique (pool + scaling). Voir ENDGAME_PLAN.md §7.2.
// Retourne `floor` inchangé si pré-victoire ou floor ≤ 10.
function effectiveFloor(floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && floor >= 11) {
    return floor - 10;     // 11 → 1, 12 → 2, …, 20 → 10, 21 → 11, …
  }
  return floor;
}

// Indice de palier endgame : 0 pour pré-victoire (floors 1-10), 1 pour
// le premier palier Ténèbres (11-20), 2 pour le 2e (21-30), etc.
// Utilisé comme « n » dans la formule récursive du scaling.
function endgameTierIndex(floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && floor >= 11) {
    return Math.floor((floor - 1) / 10);   // 1 pour 11-20, 2 pour 21-30, …
  }
  return 0;
}

// Applique la mise à l'échelle d'un monstre de base pour un étage donné.
//
// Pré-victoire (n=0) : stat = base × intraMult × diffMult — comportement inchangé.
// Post-victoire (n≥1) : récursion endgame `_endgameRecurse(stat0, n, fixEff, scal)`
// avec `scal` et `fixEff` lissés par `intraMult` (cf. ENDGAME_SCALING en haut).
function scaleMonster(base, floor) {
  const ef        = effectiveFloor(floor);
  const isDark    = (ef !== floor);
  const n         = endgameTierIndex(floor);
  const diffMult  = (DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal']).scalingMultiplier;
  const scale     = base.scale || 0.25;
  const intraMult = 1 + (ef - 1) * scale;
  const mult      = intraMult * diffMult;

  // Précalculs récursion (no-op si n=0 — recurse retourne stat tel quel).
  const scal      = 1 + ENDGAME_SCALING.scalDelta / intraMult;
  function recurse(stat0, fixKey) {
    if (n <= 0) return stat0;
    const fixEff = ENDGAME_SCALING.baseFix[fixKey] / intraMult;
    return _endgameRecurse(stat0, n, fixEff, scal);
  }

  const monster = JSON.parse(JSON.stringify(base));
  monster.hp  = Math.floor(recurse(base.hp  * mult, 'hp'));
  monster.atk = Math.floor(recurse(base.atk * mult, 'atk'));
  monster.def = Math.floor(recurse(base.def * mult, 'def'));
  monster.xp  = Math.floor(recurse(base.xp  * mult, 'xp'));
  if (typeof base.gold === 'object') {
    const { min, max } = base.gold;
    monster.gold = Math.floor(recurse((min + Math.random() * (max - min)) * mult, 'gold'));
  } else {
    monster.gold = Math.floor(recurse(base.gold * mult, 'gold'));
  }
  // mag : non scalée par intraMult dans la formule actuelle (constante),
  // mais participe à la récursion endgame pour évoluer avec les paliers.
  if (n > 0 && base.mag) {
    monster.mag = Math.floor(_endgameRecurse(base.mag, n,
      ENDGAME_SCALING.baseFix.mag / intraMult, scal));
  }

  // ── Variante visuelle ────────────────────────────────────────
  // 4 % de chance d'obtenir un monstre "shiny" (rare doré)
  const shinyRoll = Math.random();
  if (shinyRoll < 0.04) {
    monster.variant = 'shiny';
    monster.name    = '✨ ' + base.name;
    monster.xp      = Math.floor(monster.xp  * 1.5);
    monster.gold    = Math.floor(monster.gold * 2.0);
    if (monster.drops) {
      monster.drops = monster.drops.map(d => ({ ...d, chance: Math.min(1, d.chance * 2) }));
    }
  } else if (isDark) {
    // Ténébreux : la récursion endgame ci-dessus a déjà appliqué le
    // boost de stats. On garde uniquement le préfixe et la metadata
    // pour le rendu (CSS halo violet, badge 🌑). Plus de multiplicateurs
    // séparés (×1.5 HP / ×1.12 ATK / etc.) — tout passe par scal+fix.
    monster.variant = 'darkness';
    monster.name    = 'Ténébreux ' + base.name;
  } else if (floor >= 5) {
    monster.variant = 'ancient';
    monster.name    = 'Ancien ' + base.name;
  } else if (floor >= 3) {
    monster.variant = 'fierce';
    monster.name    = 'Féroce ' + base.name;
  } else {
    monster.variant = 'normal';
  }

  return monster;
}

// Place un PNJ dans une salle. Préfère le centre s'il est libre, sinon
// une autre case FLOOR. Skippe la case de spawn pour la salle 0 afin
// que l'entrée sur la cellule PNJ soit déclenchable par un mouvement
// (handleCellEntry n'est pas appelé sur le spawn). Retourne true si
// placé, false si la salle n'a aucune case éligible.
function _placeNpcInRoom(npc, room, isSpawnRoom) {
  const candidates = [];
  for (let dy = room.y; dy < room.y + room.h; dy++) {
    for (let dx = room.x; dx < room.x + room.w; dx++) {
      if (dungeon[dy][dx] !== CELL.FLOOR) continue;
      if (isSpawnRoom && dx === room.cx && dy === room.cy) continue;
      candidates.push({ x: dx, y: dy });
    }
  }
  if (!candidates.length) return false;
  const center = candidates.find(c => c.x === room.cx && c.y === room.cy);
  const pick   = center || candidates[Math.floor(Math.random() * candidates.length)];
  dungeon[pick.y][pick.x] = CELL.NPC;
  npcPlacements.set(`${pick.x},${pick.y}`, npc.id);
  // Révèle la case sur la minimap dès le départ : les PNJ sont des
  // repères de navigation, pas des surprises (choix UX 2026-05-11).
  // Le marqueur "!"/"?" éventuel est ajouté par renderer-minimap selon
  // l'état de la quête liée.
  if (typeof visited !== 'undefined' && visited[pick.y]) {
    visited[pick.y][pick.x] = true;
  }
  return true;
}

// Place un PNJ random dans la première salle intermédiaire libre, repli
// sur l'avant-dernière salle. Met à jour `occupied`. Retourne true si placé.
function _placeRandomNpcInRooms(npc, rooms, occupied) {
  for (let i = 1; i < rooms.length - 1; i++) {
    if (occupied.has(i)) continue;
    if (_placeNpcInRoom(npc, rooms[i], false)) { occupied.add(i); return true; }
  }
  if (rooms.length >= 2) {
    const fallback = rooms.length - 2;
    if (_placeNpcInRoom(npc, rooms[fallback], false)) { occupied.add(fallback); return true; }
  }
  return false;
}

function generateDungeon(floor) {
  dungeon = Array.from({length:MAP_H}, () => Array(MAP_W).fill(CELL.WALL));
  visited = Array.from({length:MAP_H}, () => Array(MAP_W).fill(false));
  enemyMap = Array.from({length:MAP_H}, () => Array(MAP_W).fill(null));
  itemMap = Array.from({length:MAP_H}, () => Array(MAP_W).fill(null));
  npcPlacements = new Map();

  // Génération des salles
  const rooms = [];
  for(let i=0;i<8;i++) {
    const rw = 3+Math.floor(Math.random()*3);
    const rh = 3+Math.floor(Math.random()*3);
    const rx = 1+Math.floor(Math.random()*(MAP_W-rw-2));
    const ry = 1+Math.floor(Math.random()*(MAP_H-rh-2));
    rooms.push({x:rx,y:ry,w:rw,h:rh,cx:Math.floor(rx+rw/2),cy:Math.floor(ry+rh/2)});
    for(let dy=ry;dy<ry+rh;dy++) for(let dx=rx;dx<rx+rw;dx++) dungeon[dy][dx]=CELL.FLOOR;
  }

  // Connexion des salles par des couloirs
  for(let i=1;i<rooms.length;i++) {
    const a=rooms[i-1], b=rooms[i];
    let cx=a.cx, cy=a.cy;
    while(cx!==b.cx) { if(cy>=0&&cy<MAP_H&&cx>=0&&cx<MAP_W) dungeon[cy][cx]=CELL.FLOOR; cx+=cx<b.cx?1:-1; }
    while(cy!==b.cy) { if(cy>=0&&cy<MAP_H&&cx>=0&&cx<MAP_W) dungeon[cy][cx]=CELL.FLOOR; cy+=cy<b.cy?1:-1; }
    dungeon[b.cy][b.cx]=CELL.FLOOR;
  }

  // Placement des cellules spéciales
  for(let i=1;i<rooms.length;i++) {
    const r = rooms[i];
    if(i===rooms.length-1) {
      dungeon[r.cy][r.cx] = CELL.STAIRS_D;
    } else if(Math.random()<0.2) {
      dungeon[r.cy][r.cx] = CELL.SHOP;
    } else if(Math.random()<0.3) {
      dungeon[r.cy][r.cx] = CELL.CHEST;
    }
  }

  // Escalier montant (étage 2+)
  if(floor>1) dungeon[rooms[0].cy][rooms[0].cx] = CELL.STAIRS_U;

  // Salle fontaine — étages 2, 5, 8, 11, … (1 garantie)
  // Choisit une room intermédiaire (ni départ, ni dernière=stairs down)
  // et écrase ce qui s'y trouvait pour garantir l'apparition.
  if (floor >= 2 && (floor - 2) % 3 === 0 && rooms.length >= 3) {
    const candidates = rooms.slice(1, rooms.length - 1);
    const room       = candidates[Math.floor(Math.random() * candidates.length)];
    dungeon[room.cy][room.cx] = CELL.FOUNTAIN;
  }

  // Endgame Tranche 2 : Forge des Ténèbres garantie aux floors 11, 14, 17, 20.
  // Bibliothèque interdite garantie aux floors 12, 15, 18 (cadence offset
  // pour ne pas overlap avec la Forge). Voir ENDGAME_PLAN.md §7.5 / §7.6.
  // Ne s'affichent qu'en post-victoire (utilisent les matériaux Ténèbres).
  const forgeFloors    = [11, 14, 17, 20];
  const libraryFloors  = [12, 15, 18];
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && rooms.length >= 3) {
    const intermediate = rooms.slice(1, rooms.length - 1);
    if (forgeFloors.includes(floor)) {
      const room = intermediate[Math.floor(Math.random() * intermediate.length)];
      dungeon[room.cy][room.cx] = CELL.FORGE;
    } else if (libraryFloors.includes(floor)) {
      const room = intermediate[Math.floor(Math.random() * intermediate.length)];
      dungeon[room.cy][room.cx] = CELL.LIBRARY;
    }
  }

  // Réinitialise les fontaines utilisées : nouvelle visite = nouvelle eau.
  usedFountains = new Set();
  // Réinitialise les actions spéciales PNJ (Fumseck, etc.).
  usedSpecialNpcs = new Set();

  // Placement des PNJ majeurs à étage fixe — registre dans npcs.js.
  // Ordre stable (premier inscrit = priorité), salle de spawn pour les
  // PNJ d'introduction, sinon première salle intermédiaire libre, repli
  // sur l'avant-dernière salle si toutes occupées.
  const occupied = new Set();
  if (typeof getNpcsForFloor === 'function') {
    const npcsHere = getNpcsForFloor(floor);
    for (const npc of npcsHere) {
      const anchor = (npc.placement && npc.placement.anchor) || 'any';
      let placed = false;
      if (anchor === 'first-room') {
        placed = _placeNpcInRoom(npc, rooms[0], true);
        if (placed) occupied.add(0);
      } else {
        for (let i = 1; i < rooms.length - 1; i++) {
          if (occupied.has(i)) continue;
          if (_placeNpcInRoom(npc, rooms[i], false)) {
            occupied.add(i); placed = true; break;
          }
        }
        if (!placed && rooms.length >= 2) {
          // Repli : avant-dernière room (peut écraser une salle déjà occupée)
          const fallback = rooms.length - 2;
          if (_placeNpcInRoom(npc, rooms[fallback], false)) {
            occupied.add(fallback); placed = true;
          }
        }
      }
    }
  }

  // Rencontres aléatoires — deux tirages indépendants par étage :
  //   1) Donneur de quête répétable (70 %) : pool dédié pour que ces
  //      quêtes soient découvrables de façon fiable. On ne tire que parmi
  //      les donneurs dont la quête est offrable ou prête à rendre, pour
  //      que chaque spawn forcé montre vraiment une quête actionnable.
  //   2) PNJ ambiant vendeur/lore (50 %) : saveur d'exploration.
  // Cf. .claude/plans/repeatable-quest-spawn.md.
  if (Math.random() < 0.70 && typeof getRandomQuestGiversForFloor === 'function') {
    let givers = getRandomQuestGiversForFloor(floor);
    if (typeof getNpcQuestState === 'function') {
      givers = givers.filter(n => {
        const st = getNpcQuestState(n);
        return st === 'offer' || st === 'ready';
      });
    }
    if (givers.length) {
      const npc = givers[Math.floor(Math.random() * givers.length)];
      _placeRandomNpcInRooms(npc, rooms, occupied);
    }
  }

  if (Math.random() < 0.50 && typeof getRandomAmbientNpcsForFloor === 'function') {
    const pool = getRandomAmbientNpcsForFloor(floor);
    if (pool.length) {
      const npc = pool[Math.floor(Math.random() * pool.length)];
      _placeRandomNpcInRooms(npc, rooms, occupied);
    }
  }

  // Sélection des ennemis éligibles à cet étage (rebase sur relFloor
  // en post-victoire pour la Boucle Ténébreuse — §7.2).
  const ef = effectiveFloor(floor);
  const eligibleTypes = MONSTERS.filter(m =>
    m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor)
  );
  const pool = eligibleTypes.length ? eligibleTypes : MONSTERS;

  for(let r of rooms.slice(1)) {
    if(Math.random()<0.6) {
      const ex = r.x+Math.floor(Math.random()*r.w);
      const ey = r.y+Math.floor(Math.random()*r.h);
      if(dungeon[ey][ex]===CELL.FLOOR) {
        enemyMap[ey][ex] = scaleMonster(weightedPick(pool), floor);
      }
    }
  }

  // Position de départ du joueur
  playerX = rooms[0].cx;
  playerY = rooms[0].cy;
  playerDir = 'n';
  visited[playerY][playerX] = true;

  // Cibles de quêtes actives : si une étape `kill` non terminée existe
  // pour une quête déclarant `spawnOnAccept`, on garantit la présence de
  // la cible (couvre les saves antérieures au hook spawnOnAccept).
  if (typeof _ensureActiveKillQuestTargets === 'function') {
    _ensureActiveKillQuestTargets(floor);
  }

  // Garde-fou : si la génération a écrasé un escalier (collision
  // rooms[0]/rooms[last] = mêmes centres), on en replace un.
  _ensureStairsExist(floor);
}

// Spawn ciblé pour quête à l'acceptation. Place 1 monstre cible (par id) +
// `extraRandomCount` monstres aléatoires éligibles à l'étage courant, sur
// des cellules FLOOR libres de `enemyMap`. Tolérant : place ce qui rentre
// si pas assez de cases libres. Retourne le nombre de mobs placés.
function spawnQuestMonsters(targetMonsterId, extraRandomCount) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;

  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (enemyMap[y][x]) continue;
      if (x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  if (!free.length) return 0;

  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }

  let placed = 0;
  const target = MONSTERS.find(m => m.id === targetMonsterId);
  if (target && free.length) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(target, floor);
    placed++;
  }

  const efFloor = effectiveFloor(floor);
  const pool = MONSTERS.filter(m =>
    m.minFloor <= efFloor && (m.maxFloor === null || efFloor <= m.maxFloor)
  );
  for (let i = 0; i < extraRandomCount && free.length && pool.length; i++) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(weightedPick(pool), floor);
    placed++;
  }

  return placed;
}

// Variante farming : place `count` copies du monstre `targetMonsterId` sur
// des cases FLOOR libres, sans extra random. Utilisée à l'acceptation d'une
// quête farming kill. Tolérant : retourne le nombre effectivement placé.
function spawnFarmingMonsters(targetMonsterId, count) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
  const target = MONSTERS.find(m => m.id === targetMonsterId);
  if (!target) return 0;

  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (enemyMap[y][x]) continue;
      if (x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  let placed = 0;
  for (let i = 0; i < count && free.length; i++) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(target, floor);
    placed++;
  }
  return placed;
}

// Garantit que les cibles des quêtes "kill" actives avec `spawnOnAccept`
// sont présentes sur l'étage courant. Comble le manque entre `step.amount`
// et (progress + instances déjà dans `enemyMap`). Idempotente : no-op si
// toutes les cibles sont déjà là.
//
// Couvre :
//  - les vieilles saves où la quête a été acceptée avant l'ajout du hook
//    `spawnOnAccept` (cas du joueur sans Chouette Ensorcelée à l'étage 4
//    pour `chouette_perdue`),
//  - le respawn d'une cible multi-amount tuée par un kill non-quête
//    (ex. attaque collatérale, AoE).
//
// Appelée depuis `generateDungeon` (génération initiale) et
// `_restoreFloorFromCache` (retour sur un étage déjà visité). Retourne
// le nombre de cibles ajoutées.
function _ensureActiveKillQuestTargets(floor) {
  if (typeof dungeon === 'undefined' || typeof enemyMap === 'undefined') return 0;
  if (typeof activeQuests === 'undefined' || !activeQuests.length) return 0;
  if (typeof QUEST_TEMPLATES === 'undefined' || typeof MONSTERS === 'undefined') return 0;

  let added = 0;
  for (const q of activeQuests) {
    const tpl = QUEST_TEMPLATES.find(t => t.id === q.id);
    if (!tpl || !tpl.spawnOnAccept) continue;
    const targetId = tpl.spawnOnAccept.targetMonsterId;
    if (!targetId) continue;
    const step = (q.objectives || []).find(o =>
      o.type === 'kill' && o.monsterId === targetId && !o.completed
    );
    if (!step) continue;

    let present = 0;
    for (let y = 0; y < enemyMap.length; y++) {
      for (let x = 0; x < enemyMap[y].length; x++) {
        if (enemyMap[y][x] && enemyMap[y][x].id === targetId) present++;
      }
    }
    const need = Math.max(0, step.amount - (step.progress | 0) - present);
    for (let i = 0; i < need; i++) {
      const placed = spawnQuestMonsters(targetId, 0);
      if (!placed) break; // plus de cases FLOOR libres
      added += placed;
    }
  }
  return added;
}

// Garantit la présence de STAIRS_D (toujours) et STAIRS_U (si floor>1)
// sur l'étage courant. Couvre deux cas :
//  - bug de génération : si rooms[0].center === rooms[last].center, alors
//    STAIRS_U (ligne 125) écrasait STAIRS_D (ligne 116) → softlock,
//  - vieilles saves dont le cache contient un étage softlocké.
//
// Place les escaliers manquants sur une case FLOOR libre (jamais sur
// SHOP/CHEST/NPC/FOUNTAIN ni sur la case du joueur). Idempotent.
// Appelée depuis `generateDungeon`, `_restoreFloorFromCache` et `_applyState`.
function _ensureStairsExist(floor) {
  if (typeof dungeon === 'undefined' || !dungeon || !dungeon.length) return 0;
  let hasDown = false, hasUp = false;
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] === CELL.STAIRS_D) hasDown = true;
      if (dungeon[y][x] === CELL.STAIRS_U) hasUp   = true;
    }
  }
  const needDown = !hasDown;
  const needUp   = !hasUp && (floor || 1) > 1;
  if (!needDown && !needUp) return 0;

  // Pool de cases FLOOR éligibles (hors joueur)
  const free = [];
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[y].length; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (typeof playerX === 'number' && x === playerX && y === playerY) continue;
      free.push({ x, y });
    }
  }
  if (!free.length) return 0;

  // Shuffle Fisher-Yates pour des placements non corrélés
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }

  let added = 0;
  if (needDown && free.length) {
    const c = free.pop();
    dungeon[c.y][c.x] = CELL.STAIRS_D;
    added++;
  }
  if (needUp && free.length) {
    const c = free.pop();
    dungeon[c.y][c.x] = CELL.STAIRS_U;
    added++;
  }
  return added;
}

// Repère les PNJ qui devraient être placés à l'étage courant (selon
// `getNpcsForFloor`) mais absents de `npcPlacements`. Les place sur
// une cellule FLOOR libre. Permet aux saves antérieures à un ajout
// de PNJ (ex : Dumbledore, chaîne d'épreuves Phase 3) de "voir
// apparaître" le PNJ manquant au prochain passage sur l'étage.
//
// Appelée depuis `_applyState` (étage courant à la restauration de
// la save) et `_restoreFloorFromCache` (à chaque retour sur un étage
// déjà visité). Idempotente : si tous les PNJ attendus sont déjà
// présents, no-op. Retourne le nombre de PNJ ajoutés.
function _migrateMissingNpcsForFloor(floor) {
  if (typeof dungeon === 'undefined' || typeof npcPlacements === 'undefined') return 0;
  if (typeof getNpcsForFloor !== 'function') return 0;

  const present = new Set();
  for (const npcId of npcPlacements.values()) present.add(npcId);

  const expected = getNpcsForFloor(floor) || [];
  let added = 0;
  for (const npc of expected) {
    if (!npc || !npc.id) continue;
    if (present.has(npc.id)) continue;
    // Anchor 'first-room' : on cherche en priorité dans le quart haut-gauche
    // du donjon (proxy raisonnable de la première salle). Sinon n'importe
    // quelle case FLOOR libre.
    const isFirstRoom = (npc.placement && npc.placement.anchor) === 'first-room';
    const cell = _findFreeNpcCell(isFirstRoom);
    if (!cell) continue;
    dungeon[cell.y][cell.x] = CELL.NPC;
    npcPlacements.set(`${cell.x},${cell.y}`, npc.id);
    if (typeof visited !== 'undefined' && visited[cell.y]) {
      visited[cell.y][cell.x] = true;
    }
    present.add(npc.id);
    added++;
  }
  return added;
}

// Cherche une cellule FLOOR libre pour y placer un PNJ. Évite la case
// joueur, les cellules avec ennemi/item/PNJ déjà posé. Si `preferEarly`
// est vrai (anchor 'first-room'), parcourt en spirale depuis le coin
// haut-gauche pour rester proche du spawn.
function _findFreeNpcCell(preferEarly) {
  if (typeof dungeon === 'undefined' || !dungeon.length) return null;
  const H = dungeon.length, W = dungeon[0].length;
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      if (typeof playerX !== 'undefined' && x === playerX && y === playerY) continue;
      if (npcPlacements && npcPlacements.has(`${x},${y}`)) continue;
      if (typeof enemyMap !== 'undefined' && enemyMap[y] && enemyMap[y][x]) continue;
      if (typeof itemMap !== 'undefined'  && itemMap[y]  && itemMap[y][x])  continue;
      candidates.push({ x, y });
    }
  }
  if (!candidates.length) return null;
  if (preferEarly) {
    // Tri par distance au coin (0,0) → favorise la première salle
    candidates.sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y));
    return candidates[0];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

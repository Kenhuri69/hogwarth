// ============================================================
// GÉNÉRATEUR DE DONJON
// ============================================================

// ── Utilitaires de sélection et mise à l'échelle ─────────────

// Tirage pondéré selon la propriété weight de chaque monstre
function weightedPick(pool) {
  const total = pool.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= (m.weight || 1); if (r <= 0) return m; }
  return pool[pool.length - 1];
}

// Applique la mise à l'échelle d'un monstre de base pour un étage donné
function scaleMonster(base, floor) {
  const diffMult = (DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal']).scalingMultiplier;
  const mult     = (1 + (floor - 1) * (base.scale || 0.25)) * diffMult;
  const monster = JSON.parse(JSON.stringify(base)); // copie profonde
  monster.hp  = Math.floor(base.hp  * mult);
  monster.atk = Math.floor(base.atk * mult);
  monster.def = Math.floor(base.def * mult);
  monster.xp  = Math.floor(base.xp  * mult);
  if (typeof base.gold === 'object') {
    const { min, max } = base.gold;
    monster.gold = Math.floor((min + Math.random() * (max - min)) * mult);
  } else {
    monster.gold = Math.floor(base.gold * mult);
  }

  // ── Variante visuelle ────────────────────────────────────────
  // 4 % de chance d'obtenir un monstre "shiny" (rare doré)
  const shinyRoll = Math.random();
  if (shinyRoll < 0.04) {
    monster.variant = 'shiny';
    monster.name    = '✨ ' + base.name;
    monster.xp      = Math.floor(monster.xp  * 1.5);
    monster.gold    = Math.floor(monster.gold * 2.0);
    // Double les chances de drop pour les shinies
    if (monster.drops) {
      monster.drops = monster.drops.map(d => ({ ...d, chance: Math.min(1, d.chance * 2) }));
    }
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

  // Rencontre aléatoire (PNJ random — vendeur OU lore) : 50% par étage.
  // Pool combiné via getRandomEncountersForFloor, filtré par minFloor /
  // maxFloor. Un seul random par étage maximum (vendeur ou lore exclusif).
  if (Math.random() < 0.50 && typeof getRandomEncountersForFloor === 'function') {
    const pool = getRandomEncountersForFloor(floor);
    if (pool.length) {
      const npc = pool[Math.floor(Math.random() * pool.length)];
      // Première room intermédiaire libre, sinon repli avant-dernière.
      let placed = false;
      for (let i = 1; i < rooms.length - 1; i++) {
        if (occupied.has(i)) continue;
        if (_placeNpcInRoom(npc, rooms[i], false)) {
          occupied.add(i); placed = true; break;
        }
      }
      if (!placed && rooms.length >= 2) {
        const fallback = rooms.length - 2;
        if (_placeNpcInRoom(npc, rooms[fallback], false)) {
          occupied.add(fallback);
        }
      }
    }
  }

  // Sélection des ennemis éligibles à cet étage
  const eligibleTypes = MONSTERS.filter(m =>
    m.minFloor <= floor && (m.maxFloor === null || floor <= m.maxFloor)
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

  const pool = MONSTERS.filter(m =>
    m.minFloor <= floor && (m.maxFloor === null || floor <= m.maxFloor)
  );
  for (let i = 0; i < extraRandomCount && free.length && pool.length; i++) {
    const cell = free.pop();
    enemyMap[cell.y][cell.x] = scaleMonster(weightedPick(pool), floor);
    placed++;
  }

  return placed;
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

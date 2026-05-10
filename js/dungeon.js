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

  // Placement des PNJ majeurs à étage fixe — registre dans npcs.js.
  // Ordre stable (premier inscrit = priorité), salle de spawn pour les
  // PNJ d'introduction, sinon première salle intermédiaire libre, repli
  // sur l'avant-dernière salle si toutes occupées.
  if (typeof getNpcsForFloor === 'function') {
    const npcsHere = getNpcsForFloor(floor);
    const occupied = new Set();
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

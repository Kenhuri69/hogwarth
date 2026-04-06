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
  const mult    = 1 + (floor - 1) * (base.scale || 0.25);
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

function generateDungeon(floor) {
  dungeon = Array.from({length:MAP_H}, () => Array(MAP_W).fill(CELL.WALL));
  visited = Array.from({length:MAP_H}, () => Array(MAP_W).fill(false));
  enemyMap = Array.from({length:MAP_H}, () => Array(MAP_W).fill(null));
  itemMap = Array.from({length:MAP_H}, () => Array(MAP_W).fill(null));

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

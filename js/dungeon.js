// ============================================================
// GÉNÉRATEUR DE DONJON
// ============================================================

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

  // Placement des ennemis avec mise à l'échelle selon l'étage
  const enemyTypes = ENEMIES.filter(e => {
    if(floor<=2) return e.hp<=25;
    if(floor<=4) return e.hp<=45;
    return true;
  });

  for(let r of rooms.slice(1)) {
    if(Math.random()<0.6) {
      const ex = r.x+Math.floor(Math.random()*r.w);
      const ey = r.y+Math.floor(Math.random()*r.h);

      if(dungeon[ey][ex]===CELL.FLOOR) {
        const baseEnemy = enemyTypes[Math.floor(Math.random()*enemyTypes.length)];
        let scaledEnemy = JSON.parse(JSON.stringify(baseEnemy));

        const multiplier = 1 + (floor - 1) * 0.25;
        scaledEnemy.hp = Math.floor(scaledEnemy.hp * multiplier);
        scaledEnemy.atk = Math.floor(scaledEnemy.atk * multiplier);
        scaledEnemy.def = Math.floor(scaledEnemy.def * multiplier);
        scaledEnemy.xp = Math.floor(scaledEnemy.xp * multiplier);
        scaledEnemy.gold = Math.floor(scaledEnemy.gold * multiplier);

        if (floor >= 5) {
          scaledEnemy.name = "Ancien " + scaledEnemy.name;
        } else if (floor >= 3) {
          scaledEnemy.name = "Féroce " + scaledEnemy.name;
        }

        enemyMap[ey][ex] = scaledEnemy;
      }
    }
  }

  // Position de départ du joueur
  playerX = rooms[0].cx;
  playerY = rooms[0].cy;
  playerDir = 'n';
  visited[playerY][playerX] = true;
}

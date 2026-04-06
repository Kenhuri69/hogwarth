// ============================================================
// RENDU CANVAS 3D + MINIMAP
// ============================================================

const canvas = document.getElementById('dungeon-canvas');
const ctx = canvas.getContext('2d');

const COLORS = {
  wall: '#0a0603',
  wallFace: '#1a0f05',
  wallEdge: '#c9a84c',
  floor: '#120a03',
  ceiling: '#0d0705',
  torch: '#c9a84c',
  door: '#4a2a0a',
  stairs: '#2a1a4a',
  chest: '#6b4c1a',
  shop: '#1a4a2a',
  enemy: '#6a0a0a',
};

function resizeCanvas() {
  const viewport = canvas.parentElement;
  canvas.width = viewport.clientWidth;
  canvas.height = viewport.clientHeight;
}

function drawDungeon() {
  if(!dungeon) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#060402');
  bg.addColorStop(0.5,'#0a0603');
  bg.addColorStop(1,'#050301');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,W,H);

  const cx=W/2, cy=H/2;
  const scale = Math.min(W,H)*0.35;

  drawCorridor(cx, cy, scale, W, H);
}

function getCellAhead(dx,dy,dist) {
  const dirs = {n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]};
  const [fx,fy]=dirs[playerDir];
  const rx=fy, ry=-fx;
  const nx=playerX+fx*dist+rx*dx;
  const ny=playerY+fy*dist+ry*dy;
  if(nx<0||ny<0||nx>=MAP_W||ny>=MAP_H) return CELL.WALL;
  return dungeon[ny][nx];
}

function hasWall(dx,dy,dist) {
  return getCellAhead(dx,dy,dist)===CELL.WALL;
}

function drawCorridor(cx,cy,scale,W,H) {
  const depths = 4;
  const wallColor = ['#3a2010','#2a1608','#1a0e04','#0d0702'];
  const ceilColor = ['#1a0f05','#120a03','#0a0603','#060402'];
  const floorColor = ['#221508','#1a1005','#120a03','#080502'];
  const goldEdge = ['rgba(201,168,76,0.6)','rgba(201,168,76,0.35)','rgba(201,168,76,0.18)','rgba(201,168,76,0.08)'];

  for(let d=depths;d>=0;d--) {
    const recede = Math.pow(0.55,d);
    const hw = scale*recede;
    const hh = scale*recede*0.7;
    const x0=cx-hw, x1=cx+hw, y0=cy-hh, y1=cy+hh;

    if(d===0) continue;

    const cell=getCellAhead(0,0,d);
    const isWall = cell===CELL.WALL;

    if(isWall || d===depths) {
      ctx.fillStyle = wallColor[Math.min(d-1,3)];
      ctx.fillRect(x0,y0,x1-x0,y1-y0);
      if(!isWall && d===depths) {
        ctx.fillStyle='#1a1005';
        ctx.fillRect(x0,y1,x1-x0,H-y1);
        ctx.fillStyle='#0d0803';
        ctx.fillRect(x0,0,x1-x0,y0);
      }

      if(!isWall) {
        drawCellMarker(cx,cy,(x0+x1)/2,(y0+y1)/2,hw*0.4,cell);
      }

      ctx.strokeStyle = goldEdge[Math.min(d-1,3)];
      ctx.lineWidth=1.5;
      ctx.strokeRect(x0,y0,x1-x0,y1-y0);

      if(d<=2) {
        drawTorch(x0+(x1-x0)*0.25, y0+(y1-y0)*0.25, 6*recede, goldEdge[d-1]);
        drawTorch(x0+(x1-x0)*0.75, y0+(y1-y0)*0.25, 6*recede, goldEdge[d-1]);
      }
      break;
    }

    const prevRec = Math.pow(0.55,d-1);
    const phw = scale*prevRec, phh = scale*prevRec*0.7;
    const px0=cx-phw, px1=cx+phw, py0=cy-phh, py1=cy+phh;

    // Sol
    ctx.fillStyle = floorColor[Math.min(d-1,3)];
    ctx.beginPath();
    ctx.moveTo(px0,py1); ctx.lineTo(px1,py1);
    ctx.lineTo(x1,y1); ctx.lineTo(x0,y1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(201,168,76,0.1)'; ctx.lineWidth=0.5; ctx.stroke();

    // Plafond
    ctx.fillStyle = ceilColor[Math.min(d-1,3)];
    ctx.beginPath();
    ctx.moveTo(px0,py0); ctx.lineTo(px1,py0);
    ctx.lineTo(x1,y0); ctx.lineTo(x0,y0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(201,168,76,0.1)'; ctx.stroke();

    // Mur gauche
    const leftBlocked = hasWall(-1,0,d);
    ctx.fillStyle = leftBlocked ? wallColor[Math.min(d-1,3)] : 'transparent';
    if(leftBlocked) {
      ctx.beginPath();
      ctx.moveTo(px0,py0); ctx.lineTo(x0,y0); ctx.lineTo(x0,y1); ctx.lineTo(px0,py1);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=goldEdge[Math.min(d-1,3)]; ctx.lineWidth=0.8; ctx.stroke();
    }

    // Mur droit
    const rightBlocked = hasWall(1,0,d);
    if(rightBlocked) {
      ctx.fillStyle = wallColor[Math.min(d-1,3)];
      ctx.beginPath();
      ctx.moveTo(px1,py0); ctx.lineTo(x1,y0); ctx.lineTo(x1,y1); ctx.lineTo(px1,py1);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=goldEdge[Math.min(d-1,3)]; ctx.lineWidth=0.8; ctx.stroke();
    }

    // Ennemi dans le couloir
    const dirs2 = {n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]};
    const [fdx,fdy]=dirs2[playerDir];
    const ex=playerX+fdx*d, ey=playerY+fdy*d;
    if(ex>=0&&ey>=0&&ex<MAP_W&&ey<MAP_H&&enemyMap[ey][ex]) {
      const fontSize = Math.floor(scale*recede*0.6);
      ctx.font=`${fontSize}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(255,80,80,0.9)';
      ctx.fillText(enemyMap[ey][ex].icon, cx, cy);
    }
  }
}

function drawTorch(x,y,size,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(x,y,size*0.4,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='rgba(255,160,40,0.7)';
  ctx.beginPath();
  ctx.arc(x,y-size*0.3,size*0.25,0,Math.PI*2);
  ctx.fill();
}

function drawCellMarker(cx,cy,bx,by,size,cell) {
  if(cell===CELL.DOOR) {
    ctx.fillStyle='#4a2a0a';
    ctx.fillRect(bx-size*0.4,by-size*0.8,size*0.8,size*1.6);
    ctx.strokeStyle='#c9a84c'; ctx.lineWidth=1;
    ctx.strokeRect(bx-size*0.4,by-size*0.8,size*0.8,size*1.6);
    ctx.fillStyle='#c9a84c';
    ctx.beginPath(); ctx.arc(bx+size*0.25,by,size*0.08,0,Math.PI*2); ctx.fill();
  } else if(cell===CELL.STAIRS_D||cell===CELL.STAIRS_U) {
    ctx.fillStyle='#4a3a6a';
    ctx.font=`${size*1.2}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(cell===CELL.STAIRS_D?'⬇':'⬆',bx,by);
  } else if(cell===CELL.SHOP) {
    ctx.font=`${size*1.2}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏪',bx,by);
  } else if(cell===CELL.CHEST) {
    ctx.font=`${size*1.2}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('📦',bx,by);
  }
}

// ============================================================
// MINIMAP
// ============================================================
function renderMinimap() {
  const mm = document.getElementById('minimap');
  mm.style.gridTemplateColumns=`repeat(${MAP_W},14px)`;
  mm.innerHTML='';
  for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) {
    const div=document.createElement('div');
    div.className='map-cell';
    if(x===playerX&&y===playerY) div.classList.add('map-player');
    else if(!visited[y][x]) div.classList.add('map-wall');
    else {
      const c=dungeon[y][x];
      if(c===CELL.WALL) div.classList.add('map-wall');
      else if(c===CELL.STAIRS_D||c===CELL.STAIRS_U) div.classList.add('map-stairs');
      else if(c===CELL.SHOP) div.classList.add('map-shop');
      else if(enemyMap[y][x]) div.classList.add('map-enemy');
      else div.classList.add('map-floor');
    }
    mm.appendChild(div);
  }
}

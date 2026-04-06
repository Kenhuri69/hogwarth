// ============================================================
// MISE À JOUR DE L'INTERFACE
// ============================================================

function updateUI() {
  document.getElementById('hp-text').textContent=`${Math.max(0,player.hp)}/${player.hpMax}`;
  document.getElementById('sp-text').textContent=`${player.sp}/${player.spMax}`;
  document.getElementById('xp-text').textContent=`${player.xp}/${player.xpNext}`;
  document.getElementById('hp-bar').style.width=(player.hp/player.hpMax*100)+'%';
  document.getElementById('sp-bar').style.width=(player.sp/player.spMax*100)+'%';
  document.getElementById('xp-bar').style.width=(player.xp/player.xpNext*100)+'%';
  document.getElementById('gold-display').textContent=`🪙 ${player.gold} Gallions`;
  document.getElementById('char-name').textContent=player.name;
  document.getElementById('char-class').textContent=`${player.class} — Niv.${player.level}`;
  document.getElementById('s-str').textContent=player.str;
  document.getElementById('s-int').textContent=player.int;
  document.getElementById('s-agi').textContent=player.agi;
  document.getElementById('s-end').textContent=player.end;
  document.getElementById('s-lck').textContent=player.lck;
  document.getElementById('s-mag').textContent=player.mag;
  document.getElementById('eq-wand').textContent=player.wand||'—';
  document.getElementById('eq-armor').textContent=player.armor||'—';
  document.getElementById('eq-acc').textContent=player.acc||'—';
}

function updateCompass() {
  const dirs=['n','s','e','w'];
  const delta={n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]};
  dirs.forEach(d=>{
    const el=document.getElementById(`dir-${d}`);
    if(!el) return;
    const [dx,dy]=delta[d];
    const nx=playerX+dx, ny=playerY+dy;
    const free = nx>=0&&ny>=0&&nx<MAP_W&&ny<MAP_H&&dungeon[ny][nx]!==CELL.WALL;
    el.classList.toggle('active',free);
  });
}

function setNarrative(text) {
  document.getElementById('narrative-panel').textContent=text;
}

function updateLocationDisplay() {
  const locIdx = Math.min(currentFloor-1, LOCATIONS.length-1);
  document.getElementById('loc-display').textContent=`${LOCATIONS[locIdx]} — Niveau ${currentFloor}`;
}

function addMsg(text, type='') {
  const log=document.getElementById('msg-log');
  const div=document.createElement('div');
  div.className=`msg-item ${type}`;
  div.textContent=text;
  log.appendChild(div);
  setTimeout(()=>div.remove(),4000);
}

function addLog(text) {
  const el=document.getElementById('event-log');
  const div=document.createElement('div');
  div.textContent=text;
  el.insertBefore(div,el.firstChild);
  if(el.children.length>20) el.removeChild(el.lastChild);
}

// ============================================================
// MODALES
// ============================================================

function closeModal(id) { document.getElementById(id).style.display='none'; }

function interact() {}

function openCharacter() {
  const detail=document.getElementById('char-detail');
  detail.innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="font-size:48px">${player.icon||'🧙'}</div>
      <div>
        <div style="font-family:'Cinzel',serif;font-size:16px;color:var(--gold-light)">${player.name}</div>
        <div style="font-size:12px;color:#8a7050">${player.class} — Niveau ${player.level}</div>
        <div style="font-size:12px;color:#6a5030;margin-top:2px">XP : ${player.xp}/${player.xpNext}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
      <div style="color:#8a7050">⚡ Points de Vie</div><div style="color:var(--parchment)">${player.hp}/${player.hpMax}</div>
      <div style="color:#8a7050">✨ Points de Magie</div><div style="color:var(--parchment)">${player.sp}/${player.spMax}</div>
      <div style="color:#8a7050">⚔️ Attaque</div><div style="color:var(--parchment)">${player.atk}</div>
      <div style="color:#8a7050">🛡️ Défense</div><div style="color:var(--parchment)">${player.def}</div>
      <div style="color:#8a7050">💪 Force</div><div style="color:var(--parchment)">${player.str}</div>
      <div style="color:#8a7050">🧠 Intelligence</div><div style="color:var(--parchment)">${player.int}</div>
      <div style="color:#8a7050">🏃 Agilité</div><div style="color:var(--parchment)">${player.agi}</div>
      <div style="color:#8a7050">🌟 Chance</div><div style="color:var(--parchment)">${player.lck}</div>
      <div style="color:#8a7050">🔮 Magie</div><div style="color:var(--parchment)">${player.mag}</div>
      <div style="color:#8a7050">💰 Gallions</div><div style="color:var(--gold)">${player.gold}</div>
    </div>
    <div style="margin-top:12px;border-top:1px solid #2a1a08;padding-top:10px">
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);margin-bottom:6px">ÉQUIPEMENT</div>
      <div style="font-size:12px;display:flex;flex-direction:column;gap:3px;color:var(--parchment-dark)">
        <div>🪄 ${player.wand||'—'}</div>
        <div>🧥 ${player.armor||'—'}</div>
        <div>💎 ${player.acc||'—'}</div>
      </div>
    </div>
    <div style="margin-top:12px;border-top:1px solid #2a1a08;padding-top:10px">
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);margin-bottom:6px">SORTS CONNUS</div>
      <div style="font-size:12px;color:var(--parchment-dark);line-height:1.8">${player.spells.join(' • ')}</div>
    </div>
  `;
  document.getElementById('character-modal').style.display='flex';
}

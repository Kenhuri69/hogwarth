// ============================================================
// SYSTÈME DE COMBAT — GROUPE vs GROUPE (1-3 ennemis)
// ============================================================

// ── Helpers d'état ──────────────────────────────────────────
function getActiveChar()       { return party[currentBattleChar]; }
function getFirstLivingEnemy() { return enemyGroup.findIndex(e => e.currentHp > 0); }
function livingEnemies()       { return enemyGroup.filter(e => e.currentHp > 0); }
function allPartyKO()          { return party.every(c => c.hp <= 0); }

// ── Démarrage du combat ──────────────────────────────────────
function startBattle(baseEnemyData) {
  inBattle          = true;
  shieldTurns       = [0, 0];
  battleTurn        = 0;
  currentBattleChar = 0;
  pendingAction     = null;
  pendingSpell      = null;

  // Générer un groupe de 1-3 ennemis selon l'étage
  const size = rollGroupSize();
  enemyGroup = [];
  for (let i = 0; i < size; i++) {
    const base = i === 0 ? baseEnemyData : pickSimilarEnemy(baseEnemyData);
    enemyGroup.push({ ...base, currentHp: base.hp, disarmed: 0 });
  }

  document.getElementById('encounter-overlay').style.display = 'flex';
  document.getElementById('target-selection').style.display  = 'none';
  renderEnemyGroup();
  updateBattleCharIndicator();
  setBattleLog(`${size > 1 ? size + ' ennemis surgissent' : enemyGroup[0].desc} !`);
  addMsg(`⚔️ ${size} ennemi${size > 1 ? 's' : ''} !`, 'bad');
  addLog(`⚔️ Combat (${size} ennemi${size > 1 ? 's' : ''})`);
}

function rollGroupSize() {
  const r = Math.random();
  // Mode solo : maximum 2 ennemis, proportion réduite
  if (partySize === 1) {
    if (currentFloor <= 2) return 1;
    if (currentFloor <= 4) return r < 0.70 ? 1 : 2;
    return r < 0.50 ? 1 : 2;
  }
  // Mode duo : 1-3 ennemis selon l'étage
  if (currentFloor <= 2) return r < 0.65 ? 1 : 2;
  if (currentFloor <= 4) return r < 0.30 ? 1 : r < 0.75 ? 2 : 3;
  return r < 0.20 ? 1 : r < 0.55 ? 2 : 3;
}

function pickSimilarEnemy(base) {
  // Choisit un monstre éligible à l'étage courant, similaire au monstre de base
  const eligible = MONSTERS.filter(m =>
    m.minFloor <= currentFloor && (m.maxFloor === null || currentFloor <= m.maxFloor)
  );
  const pool = eligible.length ? eligible : MONSTERS;
  return scaleMonster(weightedPick(pool), currentFloor);
}

// ── Action du joueur (Harry ou Hermione) ─────────────────────
function battleAction(action) {
  if (!inBattle) return;

  const char = getActiveChar();

  // Si ce personnage est KO, passer automatiquement
  if (char.hp <= 0) { advanceBattleChar(); return; }

  if (action === 'spell') { openBattleSpells(); return; }
  if (action === 'item')  { openBattleItems();  return; }
  if (action === 'flee')  { doFlee(); return; }

  if (action === 'attack') {
    if (livingEnemies().length > 1) {
      showTargetSelection('attack');
    } else {
      executeAttack(getFirstLivingEnemy());
    }
  }
}

// ── Sélection de cible ───────────────────────────────────────
function showTargetSelection(actionType) {
  pendingAction = actionType;
  const wrap = document.getElementById('target-selection');
  const btns = document.getElementById('target-buttons');
  btns.innerHTML = '';
  enemyGroup.forEach((e, i) => {
    if (e.currentHp <= 0) return;
    const btn = document.createElement('button');
    btn.className = 'cmd-btn';
    btn.style.fontSize = '10px';
    btn.textContent = `${e.icon} ${e.name} (${e.currentHp} PV)`;
    btn.onclick = () => {
      wrap.style.display = 'none';
      if      (pendingAction === 'attack')    executeAttack(i);
      else if (pendingAction === 'spell_dmg') castSpellInBattle(pendingSpell, i);
      pendingAction = null;
      pendingSpell  = null;
    };
    btns.appendChild(btn);
  });
  wrap.style.display = 'flex';
}

// ── Attaque physique ─────────────────────────────────────────
function executeAttack(targetIdx) {
  const char  = getActiveChar();
  const enemy = enemyGroup[targetIdx];
  const bonus = enemy.disarmed > 0 ? 2 : 0;
  const dmg   = Math.max(1, char.atk + Math.floor(Math.random() * 4) - (enemy.def - bonus));
  enemy.currentHp -= dmg;
  if (enemy.disarmed > 0) enemy.disarmed--;

  setBattleLog(`⚔️ ${char.name} frappe ${enemy.name} pour ${dmg} dégâts !`);
  renderEnemyGroup();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

function checkAllEnemiesDead() {
  if (livingEnemies().length === 0) { endBattle(true); return true; }
  return false;
}

// ── Passage au personnage suivant / tour des ennemis ─────────
function advanceBattleChar() {
  updateUI();
  const next = currentBattleChar === 0 ? 1 : -1;

  // Mode solo ou Hermione KO → directement tour des ennemis
  if (next === -1 || partySize === 1 || party[next].hp <= 0) {
    enemyTurn();
  } else {
    currentBattleChar = next;
    updateBattleCharIndicator();
    if (party[currentBattleChar].hp <= 0) {
      setBattleLog(`${party[currentBattleChar].name} est hors combat, tour des ennemis...`);
      setTimeout(enemyTurn, 700);
    } else {
      setBattleLog(`À ${party[currentBattleChar].name} d'agir...`);
    }
  }
}

// ── Tour des ennemis ─────────────────────────────────────────
function enemyTurn() {
  battleTurn++;
  const alive = party.filter(c => c.hp > 0).slice(0, partySize);
  let log = '';

  livingEnemies().forEach(enemy => {
    const target  = alive[Math.floor(Math.random() * alive.length)];
    if (!target) return;
    const charIdx = party.indexOf(target);

    // Tentative de capacité spéciale
    if (tryEnemyAbility(enemy, target, charIdx, txt => { log += txt; })) return;

    // Attaque physique normale
    if (shieldTurns[charIdx] > 0) {
      shieldTurns[charIdx]--;
      log += `🛡️ Protego protège ${target.name} ! `;
    } else {
      const dmg = Math.max(0, enemy.atk - target.def + Math.floor(Math.random() * 3));
      target.hp = Math.max(0, target.hp - dmg);
      log += `${enemy.icon} → ${target.name} : -${dmg} PV. `;
    }
  });

  setBattleLog(log || '...');
  updateUI();

  if (allPartyKO()) {
    document.getElementById('encounter-overlay').style.display = 'none';
    inBattle = false;
    triggerDeath('Le groupe a été mis hors combat...');
    return;
  }

  currentBattleChar = party[0].hp > 0 ? 0 : 1;
  updateBattleCharIndicator();
  setBattleLog((log || '...') + `\nÀ ${party[currentBattleChar].name} d'agir...`);
}

// ── Utilisation d'une capacité spéciale par un ennemi ────────
function tryEnemyAbility(enemy, target, charIdx, appendLog) {
  if (!enemy.abilities || !enemy.abilities.length) return false;
  const ability = enemy.abilities.find(a => Math.random() < a.chance);
  if (!ability) return false;

  switch (ability.effect) {
    case 'damage': {
      const dmg = ability.power + Math.floor((enemy.mag || 0) / 2);
      if (shieldTurns[charIdx] > 0) {
        shieldTurns[charIdx]--;
        appendLog(`🛡️ Protego bloque ${ability.name} ! `);
      } else {
        target.hp = Math.max(0, target.hp - dmg);
        appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → ${dmg} dégâts sur ${target.name} ! `);
      }
      break;
    }
    case 'heal': {
      const restored = Math.min(enemy.hp, enemy.currentHp + ability.power) - enemy.currentHp;
      enemy.currentHp += restored;
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : +${restored} PV ! `);
      renderEnemyGroup();
      break;
    }
    case 'weaken': {
      target.def = Math.max(0, target.def - ability.power);
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${target.name} perd ${ability.power} DEF ! `);
      break;
    }
    case 'drain': {
      const drained = Math.min(target.hp, ability.power);
      target.hp       = Math.max(0, target.hp - drained);
      enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + Math.floor(drained / 2));
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → draine ${drained} PV de ${target.name} ! `);
      renderEnemyGroup();
      break;
    }
  }
  return true;
}

// ── Sorts en combat ──────────────────────────────────────────
function castSpellInBattle(spellName, targetIdx) {
  const char  = getActiveChar();
  const spell = SPELLS.find(s => s.name === spellName);
  if (!spell || char.sp < spell.cost) { addMsg("Pas assez de magie !", 'bad'); return; }

  char.sp -= spell.cost;
  closeModal('spell-modal');
  document.getElementById('target-selection').style.display = 'none';

  let msg = '';
  const enemy = enemyGroup[targetIdx >= 0 ? targetIdx : 0];

  switch (spell.effect) {
    case 'heal':
      char.hp = Math.min(char.hpMax, char.hp + spell.power);
      msg = `💚 ${char.name} : ${spell.name} +${spell.power} PV !`;
      addMsg(msg, 'good');
      break;
    case 'disarm':
      if (enemy) {
        if (enemy.resist?.includes('disarm')) {
          msg = `✨ ${char.name} : ${spell.name} — ${enemy.name} y résiste 🔰 !`;
        } else {
          enemy.disarmed = 2;
          msg = `✨ ${char.name} : ${spell.name} désarme ${enemy.name} !`;
        }
      }
      addMsg(msg, 'magic');
      break;
    case 'shield':
      shieldTurns[currentBattleChar] = 2;
      msg = `🛡️ ${char.name} : ${spell.name} — bouclier actif 2 tours !`;
      addMsg(msg, 'magic');
      break;
    case 'stun': case 'burn': case 'instant':
      if (enemy) {
        let dmg    = spell.power + Math.floor(char.mag / 2);
        let suffix = '';
        if (enemy.resist?.includes(spell.effect)) { dmg = Math.floor(dmg * 0.5); suffix = ' 🔰'; }
        if (enemy.weak?.includes(spell.effect))   { dmg = Math.floor(dmg * 1.5); suffix = ' 💥'; }
        enemy.currentHp -= dmg;
        msg = `${spell.icon} ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} sur ${enemy.name} !`;
      }
      addMsg(msg, 'magic');
      break;
    case 'steal':
      const gold = Math.floor(Math.random() * 10 + 5);
      player.gold += gold;
      msg = `🌀 ${char.name} : ${spell.name} → +${gold} Gallions !`;
      addMsg(msg, 'good');
      break;
  }

  setBattleLog(msg);
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

// ── Fuite ────────────────────────────────────────────────────
function doFlee() {
  const char      = getActiveChar();
  const firstEnemy = livingEnemies()[0];
  const chance    = char.agi > (firstEnemy?.atk || 5) ? 0.7 : 0.4;
  const hasBroom  = player.inventory.some(i => i.id === 'broom');

  if (hasBroom || Math.random() < chance) {
    endBattle(false);
    setNarrative("Le groupe fuit le combat à toute vitesse !");
    addMsg("Fuite réussie !", 'good');
  } else {
    setBattleLog(`❌ ${char.name} n'a pas pu fuir !`);
    advanceBattleChar();
  }
}

// ── Fin de combat ────────────────────────────────────────────
function endBattle(won) {
  document.getElementById('encounter-overlay').style.display = 'none';
  document.getElementById('target-selection').style.display  = 'none';
  inBattle = false;

  if (won) {
    enemyMap[playerY][playerX] = null;
    let totalXp = 0, totalGold = 0;
    enemyGroup.forEach(e => { totalXp += e.xp; totalGold += e.gold + Math.floor(Math.random() * 5); });

    // XP partagée (ajoutée à player = party[0])
    player.xp += totalXp;
    player.gold += totalGold;

    // Drops d'objets (tirage indépendant par ennemi et par drop)
    enemyGroup.forEach(e => {
      if (!e.drops || !e.drops.length) return;
      e.drops.forEach(drop => {
        if (Math.random() < drop.chance) {
          const item = ITEMS.find(i => i.id === drop.itemId);
          if (item && player.inventory.length < 16) {
            player.inventory.push({ ...item });
            addMsg(`💎 Drop : ${item.icon} ${item.name} !`, 'good');
          }
        }
      });
    });

    setNarrative(`Victoire ! +${totalXp} XP, +${totalGold} Gallions.`);
    addMsg(`+${totalXp} XP`, 'good');
    addMsg(`+${totalGold} Gallions`, 'good');
    addLog(`✅ Victoire (${enemyGroup.length} ennemi${enemyGroup.length > 1 ? 's' : ''})`);
    checkLevelUp();
    renderMinimap();
  }
  updateUI();
}

// ── Montée de niveau (synchronisée pour le groupe) ───────────
function checkLevelUp() {
  if (player.xp < player.xpNext) return;

  player.level++;
  player.xp     -= player.xpNext;
  player.xpNext  = Math.floor(player.xpNext * 1.6);

  // Améliorer les personnages du groupe actif
  party.slice(0, partySize).forEach(c => {
    c.level  = player.level;
    c.xpNext = player.xpNext;
    c.hpMax += 8;  c.hp = c.hpMax;
    c.spMax += 5;  c.sp = c.spMax;
    c.atk   += 1;  c.def += 1;  c.mag += 1;
    c.str   += 1;  c.int += 1;  c.agi += 1;
  });

  document.getElementById('levelup-text').textContent = `Le groupe passe au niveau ${player.level} !`;
  document.getElementById('levelup-modal').style.display = 'flex';
  addMsg(`Niveau ${player.level} !`, 'good');
  addLog(`⭐ Niveau ${player.level} atteint`);

  // Nouveaux sorts débloqués par niveau
  if (player.level === 3) {
    if (!player.spells.includes('Incendio'))    player.spells.push('Incendio');
    if (!player2.spells.includes('Stupefix'))   player2.spells.push('Stupefix');
  }
  if (player.level === 5) {
    if (!player.spells.includes('Accio'))          player.spells.push('Accio');
    if (!player2.spells.includes('Expelliarmus'))  player2.spells.push('Expelliarmus');
  }
  updateUI();
}

function closeLevelup() {
  document.getElementById('levelup-modal').style.display = 'none';
}

// ── Mort et résurrection ─────────────────────────────────────
function triggerDeath(msg) {
  document.getElementById('death-msg').textContent = msg;
  document.getElementById('death-screen').style.display = 'flex';
}

function resurrect() {
  party.forEach(c => {
    c.hp = Math.floor(c.hpMax / 2);
    c.sp = Math.floor(c.spMax / 2);
  });
  player.gold = Math.floor(player.gold * 0.7);
  document.getElementById('death-screen').style.display = 'none';
  generateDungeon(currentFloor);
  updateLocationDisplay();
  setNarrative("Un Phénix ressuscite le groupe. Vous vous réveillez, meurtris mais vivants.");
  addMsg("Ressuscité !", 'magic');
  renderMinimap();
  drawDungeon();
  updateCompass();
  updateUI();
}

// ── Rendu du groupe d'ennemis ────────────────────────────────
function renderEnemyGroup() {
  const container = document.getElementById('enemy-group');
  if (!container) return;
  container.innerHTML = '';
  const count = enemyGroup.length;

  enemyGroup.forEach((enemy, i) => {
    const dead = enemy.currentHp <= 0;
    const pct  = Math.max(0, (enemy.currentHp / enemy.hp) * 100);
    const card = document.createElement('div');
    card.className = `enemy-card${dead ? ' enemy-dead' : ''}`;
    card.id = `enemy-card-${i}`;
    card.innerHTML = `
      <div style="font-size:${count === 1 ? '64px' : '44px'};filter:drop-shadow(0 0 12px rgba(200,50,50,0.5));animation:float 2s ease-in-out infinite alternate">
        ${dead ? '💀' : enemy.icon}
      </div>
      <div class="enemy-name" style="font-size:${count === 1 ? '16px' : '12px'}">${enemy.name}</div>
      <div class="enemy-bars" style="width:${count === 1 ? '180px' : '120px'}">
        <div class="bar-label" style="font-size:9px"><span>PV</span><span>${Math.max(0, enemy.currentHp)}/${enemy.hp}</span></div>
        <div class="bar-track"><div class="bar-fill hp-fill" style="width:${pct}%"></div></div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ── Indicateur de tour ───────────────────────────────────────
function updateBattleCharIndicator() {
  const char = party[currentBattleChar];
  const el   = document.getElementById('battle-char-indicator');
  if (el) {
    el.style.display = partySize === 1 ? 'none' : '';
    el.textContent   = `${char.icon}  Tour de ${char.name}`;
  }
  // Surligner uniquement les personnages actifs du groupe
  party.forEach((c, i) => {
    if (i >= partySize) return;
    const card = document.getElementById(`char-card-${i}`);
    if (card) card.classList.toggle('active-char', i === currentBattleChar && inBattle);
  });
}

function setBattleLog(text) {
  const el = document.getElementById('battle-log');
  if (el) el.textContent = text;
}

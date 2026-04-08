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

  // Marquer les ennemis comme découverts dans le bestiaire
  enemyGroup.forEach(e => { if (e.id) seenMonsters.add(e.id); });

  document.getElementById('encounter-overlay').style.display = 'flex';
  document.getElementById('target-selection').style.display  = 'none';
  renderEnemyGroup();
  updateBattleCharIndicator();
  setBattleLog(`${size > 1 ? size + ' ennemis surgissent' : enemyGroup[0].desc} !`);
  addMsg(`⚔️ ${size} ennemi${size > 1 ? 's' : ''} !`, 'bad');
  addLog(`⚔️ Combat (${size} ennemi${size > 1 ? 's' : ''})`);
  AudioSystem.startCombatMusic();
}

function rollGroupSize() {
  const m = (DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal']).enemyGroupMultiplier;
  const r = Math.random();

  // Solo : max 2 ennemis — seuil abaissé si difficulté haute
  if (partySize === 1) {
    if (currentFloor <= 2) return 1;
    if (currentFloor <= 4) return r < Math.max(0.10, 0.70 / m) ? 1 : 2;
    return r < Math.max(0.10, 0.50 / m) ? 1 : 2;
  }
  // Duo : max 3 ennemis — probabilités pondérées par le multiplicateur
  if (currentFloor <= 2) return r < Math.max(0.15, 0.65 / m) ? 1 : 2;
  if (currentFloor <= 4) {
    const t1 = Math.max(0.05, 0.30 / m);
    const t2 = Math.min(0.95, t1 + 0.45 * m);
    return r < t1 ? 1 : r < t2 ? 2 : 3;
  }
  const t1 = Math.max(0.05, 0.20 / m);
  const t2 = Math.min(0.95, t1 + 0.35 * m);
  return r < t1 ? 1 : r < t2 ? 2 : 3;
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

  AudioSystem.playHit();
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
  AudioSystem.playSpellCast(spellName);
  AudioSystem.speakSpell(spellName);
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

  AudioSystem.stopCombatMusic();

  if (won) {
    enemyMap[playerY][playerX] = null;
    const diff     = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal'];
    let totalXp = 0, totalGold = 0;
    enemyGroup.forEach(e => { totalXp += e.xp; totalGold += e.gold + Math.floor(Math.random() * 5); });

    // XP et or multipliés selon la difficulté
    player.xp   += Math.floor(totalXp   * diff.xpMultiplier);
    player.gold += Math.floor(totalGold * diff.goldMultiplier);

    // Drops d'objets (chance modulée par la difficulté)
    enemyGroup.forEach(e => {
      if (!e.drops || !e.drops.length) return;
      e.drops.forEach(drop => {
        if (Math.random() < drop.chance * diff.dropChanceMultiplier) {
          const item = ITEMS.find(i => i.id === drop.itemId);
          if (item && player.inventory.length < 16) {
            player.inventory.push({ ...item });
            addMsg(`💎 Drop : ${item.icon} ${item.name} !`, 'good');
          }
        }
      });
    });

    // Progression des quêtes de type "kill"
    enemyGroup.forEach(e => {
      if (window.checkKillQuests) window.checkKillQuests(e.id);
    });

    const xpEarned   = Math.floor(totalXp   * diff.xpMultiplier);
    const goldEarned = Math.floor(totalGold * diff.goldMultiplier);

    // Points de Maison selon la difficulté
    if (chosenHouse) {
      const hpGain = { Facile: 8, Normal: 10, Difficile: 14, Expert: 18 }[difficulty] || 10;
      housePoints += hpGain;
      if (window.checkHouseLevelUp) window.checkHouseLevelUp();
    }

    AudioSystem.playVictory();
    setNarrative(`Victoire ! +${xpEarned} XP, +${goldEarned} Gallions.`);
    addMsg(`+${xpEarned} XP`, 'good');
    addMsg(`+${goldEarned} Gallions`, 'good');
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
    // Incrémenter les stats de BASE (indépendamment de l'équipement)
    c._baseAtk += 1;  c._baseDef += 1;  c._baseMag += 1;
    c.str += 1;  c.int += 1;  c.agi += 1;
  });
  // Recalculer atk/def/mag/lck = base + bonus équipement
  recalculateStats();

  AudioSystem.playLevelUp();
  document.getElementById('levelup-text').textContent = `Le groupe passe au niveau ${player.level} !`;
  document.getElementById('levelup-modal').style.display = 'flex';
  addMsg(`Niveau ${player.level} !`, 'good');
  addLog(`⭐ Niveau ${player.level} atteint`);

  // ── Table de progression des sorts par niveau ─────────────────
  // Helper : enseigne un sort à un personnage s'il ne le connaît pas déjà
  const teach = (char, spellName) => {
    if (!char.spells.includes(spellName)) {
      char.spells.push(spellName);
      setTimeout(() => addMsg(`✨ ${char.name} apprend : ${spellName} !`, 'magic'), 400);
    }
  };

  switch (player.level) {
    case 2:
      // Hermione complète sa palette d'attaque de base
      teach(player2, 'Expelliarmus');
      break;
    case 3:
      // Harry débloque le vol magique, Hermione les étourdissements
      teach(player,  'Accio');
      teach(player2, 'Stupefix');
      break;
    case 4:
      // Harry apprend la lévitation offensive
      teach(player, 'Wingardium Leviosa');
      break;
    case 5:
      // Hermione maîtrise la lacération, Harry le soin avancé
      teach(player,  'Reparo');
      teach(player2, 'Diffindo');
      break;
    case 7:
      // Symétrie : chacun apprend le sort de spécialité de l'autre
      teach(player,  'Diffindo');
      teach(player2, 'Wingardium Leviosa');
      teach(player2, 'Reparo');
      break;
    case 9:
      // La Malédiction Impardonnable — déverrouillée pour les deux
      {
        const avada = SPELLS.find(s => s.name === 'Avada...');
        if (avada) avada.locked = false;
        teach(player,  'Avada...');
        teach(player2, 'Avada...');
        setTimeout(() => addMsg('⚠️ Malédiction Impardonnable déverrouillée !', 'bad'), 600);
      }
      break;
  }
  updateUI();
}

function closeLevelup() {
  document.getElementById('levelup-modal').style.display = 'none';
}

// ── Mort et résurrection ─────────────────────────────────────
function triggerDeath(msg) {
  AudioSystem.playDeath();
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
    const dead    = enemy.currentHp <= 0;
    const pct     = Math.max(0, (enemy.currentHp / enemy.hp) * 100);
    const sizePx  = count === 1 ? 80 : 56;
    const variant = enemy.variant || 'normal';

    // Icône : SVG ou emoji via icons.js
    const iconHtml = dead
      ? `<div class="monster-icon variant-dead" style="width:${sizePx}px;height:${sizePx}px;font-size:${Math.floor(sizePx*0.7)}px">💀</div>`
      : getMonsterIconHtml(enemy, sizePx);

    // Badge de variante (shiny / féroce / ancien)
    const badge = !dead && variant !== 'normal'
      ? `<div class="variant-badge variant-badge-${variant}">${
          variant === 'shiny'   ? '✨' :
          variant === 'ancient' ? '💜' : '🔴'
        }</div>`
      : '';

    const card = document.createElement('div');
    card.className = `enemy-card${dead ? ' enemy-dead' : ''}`;
    card.id = `enemy-card-${i}`;
    card.innerHTML = `
      <div style="position:relative;display:inline-block;animation:float 2s ease-in-out infinite alternate">
        ${iconHtml}
        ${badge}
      </div>
      <div class="enemy-name" style="font-size:${count === 1 ? '15px' : '11px'}">${enemy.name}</div>
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
    el.innerHTML     = `<img src="${char.imgSrc || ''}" alt="${char.name}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;border-radius:2px"> Tour de ${char.name}`;
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

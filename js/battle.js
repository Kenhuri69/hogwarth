// ============================================================
// SYSTÈME DE COMBAT — GROUPE vs GROUPE (1-3 ennemis)
// ============================================================

// ── Helpers d'état ──────────────────────────────────────────
function getActiveChar()       { return party[currentBattleChar]; }
function getFirstLivingEnemy() { return enemyGroup.findIndex(e => e.currentHp > 0); }
function livingEnemies()       { return enemyGroup.filter(e => e.currentHp > 0); }
function allPartyKO()          { return party.slice(0, partySize).every(c => c.hp <= 0); }

// ── Système de statuts persistants ──────────────────────────
// Chaque combattant porte statusEffects: [{ id, icon, power, turns }]
// id ∈ "burn" (🔥) | "poison" (☠️) | "bleed" (🩸) | "weaken" (🛡️↓)
// Les DoT (burn/poison/bleed) infligent des dégâts au tick.
// "weaken" applique un malus DEF persistant (power = DEF perdue) :
// le malus est appliqué au moment de applyStatus, restauré à l'expiry.
const STATUS_DEFS = {
  burn:   { icon: '🔥',   label: 'Brûlure',           color: '#e85a2c' },
  poison: { icon: '☠️',   label: 'Empoisonné',        color: '#7ab836' },
  bleed:  { icon: '🩸',   label: 'Saignement',        color: '#c0392b' },
  weaken: { icon: '🛡️↓', label: 'Affaiblissement',   color: '#9b59b6' }
};

function applyStatus(target, id, power, turns) {
  if (!target) return;
  if (!target.statusEffects) target.statusEffects = [];
  const existing = target.statusEffects.find(s => s.id === id);
  if (existing) {
    existing.power = Math.max(existing.power, power);
    existing.turns = Math.max(existing.turns, turns);
  } else {
    target.statusEffects.push({ id, power, turns, icon: STATUS_DEFS[id].icon });
  }
}

function tickStatuses(target, isEnemy) {
  if (!target || !target.statusEffects || !target.statusEffects.length) return '';
  let log = '';
  const remaining = [];
  target.statusEffects.forEach(s => {
    // Statuts DoT : burn / poison / bleed → dégâts par tour
    if (s.id === 'burn' || s.id === 'poison' || s.id === 'bleed') {
      let dmg = s.power;
      if (isEnemy && target.resist?.includes(s.id)) dmg = Math.floor(dmg * RESIST_MULTIPLIER);
      if (isEnemy && target.weak?.includes(s.id))   dmg = Math.floor(dmg * WEAK_MULTIPLIER);
      dmg = Math.max(1, dmg);
      if (isEnemy) target.currentHp = Math.max(0, target.currentHp - dmg);
      else        target.hp         = Math.max(0, target.hp         - dmg);
      log += `${s.icon} ${target.name} subit ${dmg} (${STATUS_DEFS[s.id].label}). `;
      const key = isEnemy ? `enemy:${enemyGroup.indexOf(target)}` : 'ally';
      UX_safe.floatDmg(key, dmg, 'dmg');
      UX_safe.logCombat(`${s.icon} ${target.name} : <b>−${dmg}</b> (${STATUS_DEFS[s.id].label})`, 'bad');
    }
    // (weaken : pas de tick de dégâts — le malus DEF est appliqué au cast,
    //  restauré à l'expiry ci-dessous.)
    s.turns--;
    if (s.turns > 0) {
      remaining.push(s);
    } else if (s.id === 'weaken') {
      // Expiration → restaurer la DEF perdue
      target.def = (target.def || 0) + s.power;
      log += `${STATUS_DEFS[s.id].icon} ${target.name} récupère ${s.power} DEF. `;
      UX_safe.logCombat(`${STATUS_DEFS[s.id].icon} ${target.name} récupère <b>+${s.power} DEF</b>`, 'magic');
    }
  });
  target.statusEffects = remaining;
  return log;
}

function clearAllStatuses() {
  party.forEach(c => { c.statusEffects = []; });
  enemyGroup.forEach(e => { e.statusEffects = []; });
}

// Tick fin de round : applique regenHp/regenSp issus de l'équipement.
// Plafonné par hpMax/spMax. Appelé depuis enemyTurn ; testable directement.
function applyEquipmentRegen() {
  let log = '';
  party.slice(0, partySize).forEach(c => {
    if (c.hp <= 0 || !c.equipped) return;
    let hpRegen = 0, spRegen = 0;
    Object.values(c.equipped).forEach(item => {
      if (!item) return;
      if (item.regenHp) hpRegen += item.regenHp;
      if (item.regenSp) spRegen += item.regenSp;
    });
    if (hpRegen > 0 && c.hp < c.hpMax) {
      const heal = Math.min(hpRegen, c.hpMax - c.hp);
      c.hp += heal;
      log += `✨ ${c.name} régénère ${heal} PV. `;
      UX_safe.floatDmg('ally', heal, 'heal');
    }
    if (spRegen > 0 && c.sp < c.spMax) {
      const restore = Math.min(spRegen, c.spMax - c.sp);
      c.sp += restore;
      log += `💧 ${c.name} récupère ${restore} PM. `;
    }
  });
  return log;
}

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
    enemyGroup.push({ ...base, currentHp: base.hp, disarmed: 0, statusEffects: [] });
  }
  party.forEach(c => { c.statusEffects = []; });

  // Marquer les ennemis comme découverts dans le bestiaire
  enemyGroup.forEach(e => { if (e.id) seenMonsters.add(e.id); });

  document.getElementById('encounter-overlay').style.display = 'flex';
  document.body.classList.add('in-battle');
  document.getElementById('target-selection').style.display  = 'none';
  renderEnemyGroup();
  updateBattleCharIndicator();
  setBattleLog(`${size > 1 ? size + ' ennemis surgissent' : enemyGroup[0].desc} !`);
  addMsg(`⚔️ ${size} ennemi${size > 1 ? 's' : ''} !`, 'bad');
  // UX : reset journal + timeline + tour 1
  UX_safe.clearCombatLog();
  UX_safe.logCombatTurn(1);
  UX_safe.logCombat(`⚔️ Combat engagé contre ${size} ennemi${size>1?'s':''}.`, 'info');
  UX_safe.renderTimeline();
  AudioSystem.startCombatMusic();
}

// Renvoie 1, 2 ou 3. Politique de base selon mode et étage + scaling
// progressif basé sur `floorKillCount` (n = floor(kills / 4)).
// duoBonus  = min(0.40, 0.10·n)        — transfert prob p1 → p2
// trioBonus = (n ≥ 5) ? min(0.40, 0.10·(n-4)) : 0  — transfert p2 → p3
// Cf. CLAUDE.md §"Difficulté progressive par étage".
function rollGroupSize() {
  const m = (DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal']).enemyGroupMultiplier;
  const r = Math.random();

  // Probabilités baseline (p1, p2, p3) — somme = 1.
  let p1, p2, p3;
  if (partySize === 1) {
    if (currentFloor <= 2)        { p1 = 1.00; p2 = 0.00; p3 = 0.00; }
    else if (currentFloor <= 4)   { p1 = Math.max(0.10, 0.70 / m); p2 = 1 - p1; p3 = 0; }
    else                          { p1 = Math.max(0.10, 0.50 / m); p2 = 1 - p1; p3 = 0; }
  } else {
    if (currentFloor <= 2)        { p1 = Math.max(0.15, 0.65 / m); p2 = 1 - p1; p3 = 0; }
    else if (currentFloor <= 6)   { p1 = Math.max(0.10, 0.35 / m); p2 = 1 - p1; p3 = 0; }
    else {
      const t1 = Math.max(0.05, 0.20 / m);
      const t2 = Math.min(0.95, t1 + 0.35 * m);
      p1 = t1; p2 = t2 - t1; p3 = 1 - t2;
    }
  }

  // Scaling progressif : si le joueur a beaucoup poncé l'étage, les
  // groupes deviennent plus gros.
  const n = (typeof floorKillCount !== 'undefined')
    ? Math.floor(((floorKillCount.get(currentFloor) || 0)) / 4)
    : 0;
  const duoBonus  = Math.min(0.40, 0.10 * n);
  const trioBonus = n >= 5 ? Math.min(0.40, 0.10 * (n - 4)) : 0;

  // Transfert p1 → p2 (chance accrue d'avoir un duo)
  const duoShift = Math.min(p1, duoBonus);
  p1 -= duoShift;  p2 += duoShift;
  // Transfert p2 → p3 (déblocage / accroissement des trios)
  const trioShift = Math.min(p2, trioBonus);
  p2 -= trioShift; p3 += trioShift;

  if (r < p1) return 1;
  if (r < p1 + p2) return 2;
  return 3;
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

// showTargetSelection() → battle-ui.js

// ── Attaque physique ─────────────────────────────────────────
function executeAttack(targetIdx) {
  const char  = getActiveChar();
  const enemy = enemyGroup[targetIdx];
  const bonus = enemy.disarmed > 0 ? 2 : 0;
  const dmg   = Math.max(1, char.atk + Math.floor(Math.random() * 4) - (enemy.def - bonus));
  enemy.currentHp -= dmg;
  if (enemy.disarmed > 0) enemy.disarmed--;

  AudioSystem.playHit();
  // Crit pondéré par critChance/critMultiplier (calculés par recalculateStats).
  // Saves antérieures : fallback sur l'ancienne formule (lck en %).
  const critPct  = (char.critChance != null) ? char.critChance : (char.lck || 0);
  const critMult = char.critMultiplier || 1.5;
  const isCrit   = Math.random() * 100 < critPct;
  const finalDmg = isCrit ? Math.floor(dmg * critMult) : dmg;
  if (isCrit) {
    enemy.currentHp -= (finalDmg - dmg); // ajoute le bonus crit
  }
  setBattleLog(`⚔️ ${char.name} frappe ${enemy.name} pour ${finalDmg} dégâts${isCrit?' (CRITIQUE !)':''} !`);
  UX_safe.floatDmg(`enemy:${targetIdx}`, finalDmg, isCrit ? 'crit' : 'dmg');
  UX_safe.logCombat(`⚔️ <b>${char.name}</b> frappe ${enemy.name} : <b>−${finalDmg}</b>${isCrit?' 💥 CRIT':''}`, isCrit?'magic':'good');
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
  UX_safe.renderTimeline();
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
  UX_safe.logCombatTurn(battleTurn + 1);
  const alive = party.slice(0, partySize).filter(c => c.hp > 0);
  let log = '';

  // Statuts persistants : tick sur les ennemis vivants en début de tour
  livingEnemies().forEach(e => { log += tickStatuses(e, true); });
  if (checkAllEnemiesDead()) { setBattleLog(log || '...'); renderEnemyGroup(); return; }

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
      UX_safe.floatDmg('ally', 0, 'shield');
      UX_safe.logCombat(`🛡️ Protego bloque l'attaque de ${enemy.name} sur ${target.name}.`, 'magic');
    } else if (Math.random() * 100 < (target.dodgeChance || 0)) {
      // Esquive : AGI-based, calculé par recalculateStats. Annule l'attaque.
      log += `💨 ${target.name} esquive l'attaque de ${enemy.name} ! `;
      UX_safe.floatDmg('ally', 0, 'miss');
      UX_safe.logCombat(`💨 ${target.name} esquive ${enemy.name}`, 'good');
    } else {
      const dmg = Math.max(0, enemy.atk - target.def + Math.floor(Math.random() * 3));
      target.hp = Math.max(0, target.hp - dmg);
      log += `${enemy.icon} → ${target.name} : -${dmg} PV. `;
      UX_safe.floatDmg('ally', dmg === 0 ? 0 : dmg, dmg === 0 ? 'miss' : 'dmg');
      UX_safe.logCombat(`${enemy.icon} ${enemy.name} → ${target.name} : <b>−${dmg} PV</b>`, 'bad');
    }
  });

  // Statuts persistants : tick sur les alliés vivants en fin de round
  party.slice(0, partySize).forEach(c => {
    if (c.hp > 0) log += tickStatuses(c, false);
  });

  // Régénération passive depuis l'équipement (regenHp / regenSp).
  log += applyEquipmentRegen();

  setBattleLog(log || '...');
  updateUI();

  if (allPartyKO()) {
    document.getElementById('encounter-overlay').style.display = 'none';
    document.body.classList.remove('in-battle');
    inBattle = false;
    triggerDeath('Le groupe a été mis hors combat...');
    return;
  }

  // En solo, on reste forcément sur le slot 0 ; en duo on bascule sur Hermione si Harry est KO.
  currentBattleChar = (partySize === 1 || party[0].hp > 0) ? 0 : 1;
  updateBattleCharIndicator();
  UX_safe.renderTimeline();
  setBattleLog((log || '...') + `\nÀ ${party[currentBattleChar].name} d'agir...`);
}

// tryEnemyAbility() + castSpellInBattle() → battle-spells.js

// ── Fuite ────────────────────────────────────────────────────
function doFlee() {
  const char      = getActiveChar();
  const firstEnemy = livingEnemies()[0];
  const chance    = char.agi > (firstEnemy?.atk || 5) ? 0.7 : 0.4;
  const hasBroom  = player.inventory.some(i => i.id === 'broom')
                 || party.some(c => c.equipped && c.equipped.acc && c.equipped.acc.id === 'broom');

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
  document.body.classList.remove('in-battle');
  document.getElementById('target-selection').style.display  = 'none';
  inBattle = false;

  // Restaurer les stats (annule les debuffs temporaires comme weaken)
  recalculateStats();
  clearAllStatuses();

  AudioSystem.stopCombatMusic();

  if (won) {
    enemyMap[playerY][playerX] = null;
    // Trace la cellule pour le respawn 20 % au retour d'étage (cf. _respawnEnemiesOnEntry).
    if (typeof defeatedCellsByFloor !== 'undefined' && typeof currentFloor === 'number') {
      if (!defeatedCellsByFloor.has(currentFloor)) defeatedCellsByFloor.set(currentFloor, new Set());
      defeatedCellsByFloor.get(currentFloor).add(`${playerX},${playerY}`);
    }
    // Compteur de kills cumulés par étage (scaling progressif de la
    // difficulté — cf. rollGroupSize). 1 monstre tué = +1.
    if (typeof floorKillCount !== 'undefined' && typeof currentFloor === 'number') {
      const killsThisFight = enemyGroup.length;
      floorKillCount.set(currentFloor, (floorKillCount.get(currentFloor) || 0) + killsThisFight);
    }
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
          if (item && tryAddItem(item, { silent: true })) {
            addMsg(`<img class="ui-icon ui-icon-sm" src="img/icons/accessory.png" alt=""> Drop : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name} !`, 'good');
          }
        }
      });
    });

    // Progression des quêtes de type "kill"
    enemyGroup.forEach(e => safeCall('checkKillQuests', e.id));

    const xpEarned   = Math.floor(totalXp   * diff.xpMultiplier);
    const goldEarned = Math.floor(totalGold * diff.goldMultiplier);

    // Points de Maison selon la difficulté
    if (chosenHouse) {
      const hpGain = HOUSE_POINTS_PER_KILL[difficulty] || HOUSE_POINTS_PER_KILL.Normal;
      housePoints += hpGain;
      safeCall('checkHouseLevelUp');
    }

    AudioSystem.playVictory();
    setNarrative(`Victoire ! +${xpEarned} XP, +${goldEarned} Gallions.`);
    addMsg(`+${xpEarned} XP`, 'good');
    addMsg(`+${goldEarned} Gallions`, 'good');
    checkLevelUp();
    renderMinimap();
  }
  updateUI();
  safeCall('autoSave', won ? 'battle-end' : 'battle-flee');
}

// ── Montée de niveau (synchronisée pour le groupe) ───────────
function checkLevelUp() {
  if (player.xp < player.xpNext) return;

  player.level++;
  player.xp     -= player.xpNext;
  player.xpNext  = Math.floor(player.xpNext * LEVEL_UP_XP_MULTIPLIER);

  party.slice(0, partySize).forEach(c => {
    _grantLevelHpSp(c);
    _grantLevelStats(c);
    _grantLevelStatPoints(c);
  });
  // Recalculer atk/def/mag/lck = base + bonus équipement
  recalculateStats();

  AudioSystem.playLevelUp();
  document.getElementById('levelup-text').textContent = `Le groupe passe au niveau ${player.level} !`;
  document.getElementById('levelup-modal').style.display = 'flex';
  addMsg(`Niveau ${player.level} ! +${STAT_POINTS_PER_LEVEL} points à allouer par perso`, 'good');

  _grantLevelSpells(player.level);

  updateUI();
  safeCall('autoSave', 'level-up');
}

// Accumule STAT_POINTS_PER_LEVEL sur le perso. Le joueur dépense les
// points via la fiche perso (ui.js — allocateStatPoint).
function _grantLevelStatPoints(c) {
  if (typeof STAT_POINTS_PER_LEVEL !== 'number') return;
  c.unallocatedStatPoints = (c.unallocatedStatPoints || 0) + STAT_POINTS_PER_LEVEL;
}

// Sync niveau/xp + grant PV/PM max +8/+5 et full heal au passage de niveau.
function _grantLevelHpSp(c) {
  c.level  = player.level;
  c.xpNext = player.xpNext;
  c.hpMax += 8;  c.hp = c.hpMax;
  c.spMax += 5;  c.sp = c.spMax;
}

// Incrémenter les stats de BASE (indépendamment de l'équipement).
// recalculateStats() reconstruit ensuite c.str/c.int/c.agi à partir
// de _baseStr/_baseInt/_baseAgi + bonus d'équipement.
function _grantLevelStats(c) {
  c._baseAtk += 1;  c._baseDef += 1;  c._baseMag += 1;
  if (c._baseStr === undefined) c._baseStr = c.str;
  if (c._baseInt === undefined) c._baseInt = c.int;
  if (c._baseAgi === undefined) c._baseAgi = c.agi;
  c._baseStr += 1;  c._baseInt += 1;  c._baseAgi += 1;
}

// Table de progression des sorts par niveau (hardcodée Harry/Hermione).
// Niveau 9 : déverrouille aussi le flag `locked` de "Avada..." dans SPELLS.
function _grantLevelSpells(level) {
  const teach = (char, spellName) => {
    if (!char.spells.includes(spellName)) {
      char.spells.push(spellName);
      setTimeout(() => addMsg(`✨ ${char.name} apprend : ${spellName} !`, 'magic'), 400);
    }
  };

  switch (level) {
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
    case 9: {
      // La Malédiction Impardonnable — déverrouillée pour les deux
      const avada = SPELLS.find(s => s.name === 'Avada...');
      if (avada) avada.locked = false;
      teach(player,  'Avada...');
      teach(player2, 'Avada...');
      setTimeout(() => addMsg('⚠️ Malédiction Impardonnable déverrouillée !', 'bad'), 600);
      break;
    }
  }
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

// renderEnemyGroup(), updateBattleCharIndicator(), setBattleLog() → battle-ui.js

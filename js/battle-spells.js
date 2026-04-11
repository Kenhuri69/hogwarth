// ============================================================
// COMBAT — Sorts et capacités spéciales
// Fonctions de sorts utilisées par le moteur de combat (battle.js)
// ============================================================

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

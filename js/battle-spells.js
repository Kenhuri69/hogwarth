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
        if (window.UX) { UX.floatDmg('ally', 0, 'shield'); UX.logCombat(`🛡️ Protego bloque ${ability.name}.`, 'magic'); }
      } else {
        target.hp = Math.max(0, target.hp - dmg);
        appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → ${dmg} dégâts sur ${target.name} ! `);
        if (window.UX) { UX.floatDmg('ally', dmg, 'dmg'); UX.logCombat(`${ability.icon} ${enemy.name} : ${ability.name} → <b>−${dmg}</b> sur ${target.name}`, 'bad'); }
      }
      break;
    }
    case 'heal': {
      const restored = Math.min(enemy.hp, enemy.currentHp + ability.power) - enemy.currentHp;
      enemy.currentHp += restored;
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : +${restored} PV ! `);
      if (window.UX) { const idx = enemyGroup.indexOf(enemy); UX.floatDmg(`enemy:${idx}`, restored, 'heal'); UX.logCombat(`${ability.icon} ${enemy.name} se soigne : <b>+${restored} PV</b>`, 'magic'); }
      renderEnemyGroup();
      break;
    }
    case 'weaken': {
      target.def = Math.max(0, target.def - ability.power);
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${target.name} perd ${ability.power} DEF ! `);
      if (window.UX) UX.logCombat(`${ability.icon} ${enemy.name} affaiblit ${target.name} : −${ability.power} DEF`, 'bad');
      break;
    }
    case 'drain': {
      const drained = Math.min(target.hp, ability.power);
      target.hp       = Math.max(0, target.hp - drained);
      enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + Math.floor(drained / 2));
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → draine ${drained} PV de ${target.name} ! `);
      if (window.UX) {
        UX.floatDmg('ally', drained, 'dmg');
        const idx = enemyGroup.indexOf(enemy);
        UX.floatDmg(`enemy:${idx}`, Math.floor(drained/2), 'heal');
        UX.logCombat(`${ability.icon} ${enemy.name} draine <b>${drained} PV</b> à ${target.name}`, 'bad');
      }
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
      if (window.UX) { UX.floatDmg('ally', spell.power, 'heal'); UX.logCombat(`💚 ${char.name} lance ${spell.name} : <b>+${spell.power} PV</b>`, 'good'); }
      break;
    case 'disarm':
      if (enemy) {
        if (enemy.resist?.includes('disarm')) {
          msg = `✨ ${char.name} : ${spell.name} — ${enemy.name} y résiste 🔰 !`;
          if (window.UX) UX.logCombat(`🔰 ${enemy.name} résiste à ${spell.name}`, 'info');
        } else {
          enemy.disarmed = 2;
          msg = `✨ ${char.name} : ${spell.name} désarme ${enemy.name} !`;
          if (window.UX) { UX.floatDmg(`enemy:${targetIdx}`, 0, 'shield'); UX.logCombat(`✨ ${char.name} désarme ${enemy.name} (2 tours)`, 'magic'); }
        }
      }
      addMsg(msg, 'magic');
      break;
    case 'shield':
      shieldTurns[currentBattleChar] = 2;
      msg = `🛡️ ${char.name} : ${spell.name} — bouclier actif 2 tours !`;
      addMsg(msg, 'magic');
      if (window.UX) UX.logCombat(`🛡️ ${char.name} active Protego (2 tours)`, 'magic');
      break;
    case 'stun': case 'burn': case 'instant':
      if (enemy) {
        let dmg    = spell.power + Math.floor(char.mag / 2);
        let suffix = '';
        if (enemy.resist?.includes(spell.effect)) { dmg = Math.floor(dmg * 0.5); suffix = ' 🔰'; }
        if (enemy.weak?.includes(spell.effect))   { dmg = Math.floor(dmg * 1.5); suffix = ' 💥'; }
        enemy.currentHp -= dmg;
        msg = `${spell.icon} ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} sur ${enemy.name} !`;
        if (window.UX) {
          UX.floatDmg(`enemy:${targetIdx}`, dmg, suffix.includes('💥') ? 'crit' : 'dmg');
          UX.logCombat(`${spell.icon} ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix} sur ${enemy.name}`, 'magic');
        }
      }
      addMsg(msg, 'magic');
      break;
    case 'steal':
      const gold = Math.floor(Math.random() * 10 + 5);
      player.gold += gold;
      msg = `🌀 ${char.name} : ${spell.name} → +${gold} Gallions !`;
      addMsg(msg, 'good');
      if (window.UX) UX.logCombat(`🌀 ${char.name} : ${spell.name} → <b>+${gold} 🪙</b>`, 'good');
      break;
  }

  setBattleLog(msg);
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

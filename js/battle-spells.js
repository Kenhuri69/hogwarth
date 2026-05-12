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
        UX_safe.floatDmg('ally', 0, 'shield');
        UX_safe.logCombat(`🛡️ Protego bloque ${ability.name}.`, 'magic');
      } else {
        target.hp = Math.max(0, target.hp - dmg);
        appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → ${dmg} dégâts sur ${target.name} ! `);
        UX_safe.floatDmg('ally', dmg, 'dmg');
        UX_safe.logCombat(`${ability.icon} ${enemy.name} : ${ability.name} → <b>−${dmg}</b> sur ${target.name}`, 'bad');
      }
      break;
    }
    case 'heal': {
      const restored = Math.min(enemy.hp, enemy.currentHp + ability.power) - enemy.currentHp;
      enemy.currentHp += restored;
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : +${restored} PV ! `);
      const healIdx = enemyGroup.indexOf(enemy);
      UX_safe.floatDmg(`enemy:${healIdx}`, restored, 'heal');
      UX_safe.logCombat(`${ability.icon} ${enemy.name} se soigne : <b>+${restored} PV</b>`, 'magic');
      renderEnemyGroup();
      break;
    }
    case 'weaken': {
      target.def = Math.max(0, target.def - ability.power);
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${target.name} perd ${ability.power} DEF ! `);
      UX_safe.logCombat(`${ability.icon} ${enemy.name} affaiblit ${target.name} : −${ability.power} DEF`, 'bad');
      break;
    }
    case 'drain': {
      const drained = Math.min(target.hp, ability.power);
      target.hp       = Math.max(0, target.hp - drained);
      enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + Math.floor(drained / 2));
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → draine ${drained} PV de ${target.name} ! `);
      const drainIdx = enemyGroup.indexOf(enemy);
      UX_safe.floatDmg('ally', drained, 'dmg');
      UX_safe.floatDmg(`enemy:${drainIdx}`, Math.floor(drained/2), 'heal');
      UX_safe.logCombat(`${ability.icon} ${enemy.name} draine <b>${drained} PV</b> à ${target.name}`, 'bad');
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
      UX_safe.floatDmg('ally', spell.power, 'heal');
      UX_safe.logCombat(`💚 ${char.name} lance ${spell.name} : <b>+${spell.power} PV</b>`, 'good');
      break;
    case 'disarm':
      if (enemy) {
        if (enemy.resist?.includes('disarm')) {
          msg = `✨ ${char.name} : ${spell.name} — ${enemy.name} y résiste 🔰 !`;
          UX_safe.logCombat(`🔰 ${enemy.name} résiste à ${spell.name}`, 'info');
        } else {
          enemy.disarmed = 2;
          msg = `✨ ${char.name} : ${spell.name} désarme ${enemy.name} !`;
          UX_safe.floatDmg(`enemy:${targetIdx}`, 0, 'shield');
          UX_safe.logCombat(`✨ ${char.name} désarme ${enemy.name} (2 tours)`, 'magic');
        }
      }
      addMsg(msg, 'magic');
      break;
    case 'shield':
      shieldTurns[currentBattleChar] = 2;
      msg = `🛡️ ${char.name} : ${spell.name} — bouclier actif 2 tours !`;
      addMsg(msg, 'magic');
      UX_safe.logCombat(`🛡️ ${char.name} active Protego (2 tours)`, 'magic');
      break;
    case 'stun': case 'burn': case 'instant':
      if (enemy) {
        let dmg    = spell.power + Math.floor(char.mag / 2);
        let suffix = '';
        if (enemy.resist?.includes(spell.effect)) { dmg = Math.floor(dmg * 0.5); suffix = ' 🔰'; }
        if (enemy.weak?.includes(spell.effect))   { dmg = Math.floor(dmg * 1.5); suffix = ' 💥'; }
        enemy.currentHp -= dmg;
        msg = `${getSpellIconHtml(spell, 'ui-icon-md')} ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} sur ${enemy.name} !`;

        // Application probabiliste d'un statut DoT (étape 2)
        const STATUS_BY_SPELL = { 'Incendio': 'burn', 'Diffindo': 'bleed', 'Sectumsempra': 'bleed' };
        const statusId = STATUS_BY_SPELL[spell.name];
        if (statusId && enemy.currentHp > 0) {
          const chance = Math.min(0.50, 0.10 + char.mag * 0.01);
          if (Math.random() < chance) {
            const dotPower = Math.max(1, Math.floor(spell.power * 0.25));
            applyStatus(enemy, statusId, dotPower, 2);
            const def  = STATUS_DEFS[statusId];
            msg += ` ${def.icon} ${def.label} appliqué !`;
            UX_safe.logCombat(`${def.icon} ${enemy.name} : ${def.label} (${dotPower}/tour, 2 tours)`, 'magic');
          }
        }

        UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, suffix.includes('💥') ? 'crit' : 'dmg');
        UX_safe.logCombat(`${getSpellIconHtml(spell, 'ui-icon-md')} ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix} sur ${enemy.name}`, 'magic');
      }
      addMsg(msg, 'magic');
      break;
    case 'lifesteal':
      if (enemy) {
        let dmg = spell.power + Math.floor(char.mag / 2);
        let suffix = '';
        if (enemy.resist?.includes('lifesteal')) { dmg = Math.floor(dmg * 0.5); suffix = ' 🔰'; }
        if (enemy.weak?.includes('lifesteal'))   { dmg = Math.floor(dmg * 1.5); suffix = ' 💥'; }
        enemy.currentHp -= dmg;
        const heal = Math.floor(dmg / 2);
        char.hp = Math.min(char.hpMax, char.hp + heal);
        msg = `🩸 ${char.name} : ${spell.name} → ${dmg} dégâts${suffix}, +${heal} PV drainés !`;
        UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, 'dmg');
        UX_safe.floatDmg('ally', heal, 'heal');
        UX_safe.logCombat(`🩸 ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix}, <b>+${heal} PV</b>`, 'magic');
      }
      addMsg(msg, 'magic');
      break;
    case 'curse':
      if (enemy) {
        let dmg = spell.power + Math.floor(char.mag / 2);
        if (enemy.resist?.includes('curse')) dmg = Math.floor(dmg * 0.5);
        if (enemy.weak?.includes('curse'))   dmg = Math.floor(dmg * 1.5);
        enemy.currentHp -= dmg;
        enemy.atk = Math.max(0, (enemy.atk || 0) - 3);
        enemy.def = Math.max(0, (enemy.def || 0) - 3);
        msg = `☠️ ${char.name} : ${spell.name} → ${dmg} dégâts et ${enemy.name} maudit (−3 ATK/DEF) !`;
        UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, 'crit');
        UX_safe.logCombat(`☠️ ${char.name} maudit ${enemy.name} : <b>−${dmg}</b>, −3 ATK/DEF`, 'magic');
      }
      addMsg(msg, 'magic');
      break;
    case 'steal':
      const gold = Math.floor(Math.random() * 10 + 5);
      player.gold += gold;
      msg = `🌀 ${char.name} : ${spell.name} → +${gold} Gallions !`;
      addMsg(msg, 'good');
      UX_safe.logCombat(`🌀 ${char.name} : ${spell.name} → <b>+${gold} 🪙</b>`, 'good');
      break;
  }

  setBattleLog(msg);
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

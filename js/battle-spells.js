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
      // La DEF de la cible atténue désormais les capacités spéciales
      // (cf. DIFFICULTY_REPORT.md §6). Division par 3 : la DEF a un
      // effet modéré sans annuler complètement (target.def 15 → -5 dgts).
      const raw = ability.power + Math.floor((enemy.mag || 0) / 2);
      const dmg = Math.max(1, raw - Math.floor((target.def || 0) / 3));
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
      // Conversion en statusEffect typé : badge visible côté UI, durée,
      // restauration auto via tickStatuses à l'expiration.
      const turns = ability.turns || 3;
      const lost  = Math.min(ability.power, target.def || 0);
      target.def  = Math.max(0, (target.def || 0) - lost);
      applyStatus(target, 'weaken', lost, turns);
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${target.name} perd ${lost} DEF (${turns} tours) ! `);
      UX_safe.logCombat(`${ability.icon} ${enemy.name} affaiblit ${target.name} : <b>−${lost} DEF</b> (${turns} tours)`, 'bad');
      break;
    }
    case 'status': {
      // ability = { name, icon, effect:'status', statusId, power, chance, turns }
      // Inflige un statut persistant (burn / poison / bleed) à la cible.
      const sid   = ability.statusId;
      const turns = ability.turns || 3;
      applyStatus(target, sid, ability.power, turns);
      const lbl = (typeof STATUS_DEFS !== 'undefined' && STATUS_DEFS[sid])
                ? STATUS_DEFS[sid].label
                : sid;
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → ${target.name} subit ${lbl} (${turns} tours) ! `);
      UX_safe.logCombat(`${ability.icon} ${enemy.name} inflige <b>${lbl}</b> à ${target.name} (${turns} tours)`, 'bad');
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

// ── Sorts en combat : handlers par effet ─────────────────────
//
// Chaque handler reçoit (spell, char, enemy, targetIdx) et mute en
// place l'état (char.hp, enemy.currentHp, shieldTurns, player.gold,
// statuts DoT). Il retourne le message principal du sort (string)
// que `castSpellInBattle` injecte dans setBattleLog.
//
// stun/burn/instant partagent _spellElementalDamage — la nature du
// statut DoT est déterminée par STATUS_BY_SPELL.

const STATUS_BY_SPELL = { 'Incendio': 'burn', 'Diffindo': 'bleed', 'Sectumsempra': 'bleed' };

// Crit de sort : roll spellCritChance, applique spellCritMultiplier sur les
// dégâts. Canal distinct du crit physique (cf. .claude/plans/crit-rework.md).
// Saves antérieures : champs absents → pas de crit (fallback 0 / 1.5).
function rollSpellCrit(dmg, char) {
  const chance = (char && char.spellCritChance != null) ? char.spellCritChance : 0;
  if (Math.random() * 100 < chance) {
    const mult = (char && char.spellCritMultiplier) || 1.5;
    return { dmg: Math.floor(dmg * mult), crit: true };
  }
  return { dmg, crit: false };
}

function _spellHeal(spell, char) {
  char.hp = Math.min(char.hpMax, char.hp + spell.power);
  const msg = `💚 ${char.name} : ${spell.name} +${spell.power} PV !`;
  addMsg(msg, 'good');
  UX_safe.floatDmg('ally', spell.power, 'heal');
  UX_safe.logCombat(`💚 ${char.name} lance ${spell.name} : <b>+${spell.power} PV</b>`, 'good');
  return msg;
}

function _spellDisarm(spell, char, enemy, targetIdx) {
  let msg = '';
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
  return msg;
}

function _spellShield(spell, char) {
  shieldTurns[currentBattleChar] = 2;
  const msg = `🛡️ ${char.name} : ${spell.name} — bouclier actif 2 tours !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🛡️ ${char.name} active Protego (2 tours)`, 'magic');
  return msg;
}

function _spellElementalDamage(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    let dmg    = spell.power + Math.floor(char.mag / 2);
    let suffix = '';
    if (enemy.resist?.includes(spell.effect)) { dmg = Math.floor(dmg * RESIST_MULTIPLIER); suffix = ' 🔰'; }
    if (enemy.weak?.includes(spell.effect))   { dmg = Math.floor(dmg * WEAK_MULTIPLIER);   suffix = ' 💥'; }
    const _cr = rollSpellCrit(dmg, char); dmg = _cr.dmg;
    if (_cr.crit) suffix += ' 💥CRIT';
    enemy.currentHp -= dmg;
    msg = `${getSpellIconHtml(spell, 'ui-icon-md')} ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} sur ${enemy.name} !`;

    // Application probabiliste d'un statut DoT
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
  return msg;
}

function _spellLifesteal(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    let dmg = spell.power + Math.floor(char.mag / 2);
    let suffix = '';
    if (enemy.resist?.includes('lifesteal')) { dmg = Math.floor(dmg * RESIST_MULTIPLIER); suffix = ' 🔰'; }
    if (enemy.weak?.includes('lifesteal'))   { dmg = Math.floor(dmg * WEAK_MULTIPLIER);   suffix = ' 💥'; }
    const _cr = rollSpellCrit(dmg, char); dmg = _cr.dmg;
    if (_cr.crit) suffix += ' 💥CRIT';
    enemy.currentHp -= dmg;
    const heal = Math.floor(dmg / 2);
    char.hp = Math.min(char.hpMax, char.hp + heal);
    msg = `🩸 ${char.name} : ${spell.name} → ${dmg} dégâts${suffix}, +${heal} PV drainés !`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, 'dmg');
    UX_safe.floatDmg('ally', heal, 'heal');
    UX_safe.logCombat(`🩸 ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix}, <b>+${heal} PV</b>`, 'magic');
  }
  addMsg(msg, 'magic');
  return msg;
}

function _spellCurse(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    let dmg = spell.power + Math.floor(char.mag / 2);
    if (enemy.resist?.includes('curse')) dmg = Math.floor(dmg * RESIST_MULTIPLIER);
    if (enemy.weak?.includes('curse'))   dmg = Math.floor(dmg * WEAK_MULTIPLIER);
    const _cr = rollSpellCrit(dmg, char); dmg = _cr.dmg;
    enemy.currentHp -= dmg;
    enemy.atk = Math.max(0, (enemy.atk || 0) - 3);
    enemy.def = Math.max(0, (enemy.def || 0) - 3);
    msg = `☠️ ${char.name} : ${spell.name} → ${dmg} dégâts${_cr.crit ? ' 💥CRIT' : ''} et ${enemy.name} maudit (−3 ATK/DEF) !`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, 'crit');
    UX_safe.logCombat(`☠️ ${char.name} maudit ${enemy.name} : <b>−${dmg}</b>, −3 ATK/DEF`, 'magic');
  }
  addMsg(msg, 'magic');
  return msg;
}

function _spellSteal(spell, char) {
  const gold = Math.floor(Math.random() * 10 + 5);
  player.gold += gold;
  const msg = `🌀 ${char.name} : ${spell.name} → +${gold} Gallions !`;
  addMsg(msg, 'good');
  UX_safe.logCombat(`🌀 ${char.name} : ${spell.name} → <b>+${gold} 🪙</b>`, 'good');
  return msg;
}

// Sort de soutien à cible alliée : soin instantané + statut regen 3 tours.
// targetAllyIdx (4ᵉ arg, position non standard) est posé par castSpellInBattle.
function _spellSupportRegen(spell, char, _enemy, _enemyIdx, targetAllyIdx) {
  const idx  = (typeof targetAllyIdx === 'number') ? targetAllyIdx : 0;
  const ally = party[idx];
  if (!ally || ally.hp <= 0) {
    const msg = `${char.name} ne trouve pas de cible pour ${spell.name}.`;
    addMsg(msg, 'bad');
    return msg;
  }
  const burst = Math.min(ally.hpMax - ally.hp, spell.power + Math.floor((char.mag || 0) / 2));
  if (burst > 0) {
    ally.hp += burst;
    UX_safe.floatDmg('ally', burst, 'heal');
  }
  applyStatus(ally, 'regen', spell.power, 3);
  const msg = `🩹 ${char.name} → ${ally.name} : ${spell.name} (+${burst} PV, régen 3 tours).`;
  addMsg(msg, 'good');
  UX_safe.logCombat(`🩹 <b>${char.name}</b> bande ${ally.name} : <b>+${burst} PV</b> · régen 3 tours`, 'good');
  return msg;
}

// Sort de téléportation : pas de dégâts ni de cible directe — on ouvre
// un overlay A/B (groupe vs ennemi). castSpellInBattle court-circuite la
// boucle standard pour ce sort (cf. ci-dessous).
function _spellTeleport(spell, char) {
  if (typeof openCombatTeleportChoice === 'function') openCombatTeleportChoice();
  return `🌀 ${char.name} canalise ${spell.name}...`;
}

const SPELL_HANDLERS = {
  heal:           _spellHeal,
  disarm:         _spellDisarm,
  shield:         _spellShield,
  stun:           _spellElementalDamage,
  burn:           _spellElementalDamage,
  instant:        _spellElementalDamage,
  lifesteal:      _spellLifesteal,
  curse:          _spellCurse,
  steal:          _spellSteal,
  support_regen:  _spellSupportRegen,
  teleport:       _spellTeleport,
};

// Sorts à cible alliée — pas de sélection d'ennemi, mais éventuellement
// une sélection d'allié en duo (résolue par showAllyTargetSelection).
const ALLY_TARGET_EFFECTS = new Set(['support_regen']);

// Bibliothèque interdite (endgame Tranche 2) — renvoie une copie augmentée
// du sort en appliquant le `spellUpgrades` du caster :
//   - power  : +2 × level
//   - cost   : −1 × level (plancher 1)
//   - chance : +0.05 × level (cap 0.50, pour les sorts à statut)
// Si le caster n'a pas d'upgrade sur ce sort, retourne le sort tel quel.
// Voir ENDGAME_PLAN.md §7.6 + js/library.js.
function _spellForCaster(spell, char) {
  if (!spell || !char) return spell;
  const ups = char.spellUpgrades;
  if (!ups) return spell;
  const lvl = (ups[spell.name] | 0);
  if (lvl <= 0) return spell;
  const out = { ...spell };
  if (typeof spell.power === 'number') out.power = spell.power + 2 * lvl;
  if (typeof spell.cost  === 'number') out.cost  = Math.max(1, spell.cost - lvl);
  if (typeof spell.chance === 'number') {
    out.chance = Math.min(0.5, spell.chance + 0.05 * lvl);
  }
  return out;
}
window._spellForCaster = _spellForCaster;

function castSpellInBattle(spellName, targetIdx, targetAllyIdx) {
  const char     = getActiveChar();
  const baseSpell = SPELLS.find(s => s.name === spellName);
  // Wrapping Bibliothèque : applique les upgrades du caster.
  const spell    = _spellForCaster(baseSpell, char);
  if (!spell || char.sp < spell.cost) { addMsg("Pas assez de magie !", 'bad'); return; }

  // Portus : 1 utilisation par combat. Le sort ouvre un overlay A/B —
  // pas de cycle pendingAction et pas d'avance de tour ici (les helpers
  // dans teleport.js gèrent la suite : fuite/banissement/annulation).
  if (spell.effect === 'teleport') {
    if (typeof _teleportUsedThisFight !== 'undefined' && _teleportUsedThisFight) {
      addMsg('Portus déjà utilisé dans ce combat.', 'bad');
      return;
    }
    if (typeof portusFightCooldown === 'number' && portusFightCooldown > 0) {
      addMsg(`Portus se recharge — encore ${portusFightCooldown} combat${portusFightCooldown > 1 ? 's' : ''} à gagner.`, 'bad');
      return;
    }
    char.sp -= spell.cost;
    AudioSystem.playSpellCast(spell.name);
    AudioSystem.speakSpell(spell.name);
    closeModal('spell-modal');
    // Marqueur consommé dès l'ouverture du choix — _cancelTeleportChoice
    // remet le flag à false et rembourse les PM si l'utilisateur annule.
    if (typeof window._resetTeleportFightFlag === 'function') {
      // (reset déjà fait par startBattle ; ici on marque "in-flight" via le
      // helper exposé pour qu'un appel _cancelTeleportChoice puisse re-toggle).
    }
    // On considère le sort engagé : le flag est levé par les helpers
    // teleport.js après confirmation (party/enemy). Ouvrir l'overlay :
    if (typeof openCombatTeleportChoice === 'function') openCombatTeleportChoice();
    setBattleLog(`🌀 ${char.name} canalise ${spell.name}...`);
    updateUI();
    return;
  }

  // Sorts à cible alliée (Ferula…) : en duo, demander la cible si non fournie.
  if (ALLY_TARGET_EFFECTS.has(spell.effect) && typeof targetAllyIdx !== 'number') {
    const alive = party.slice(0, partySize).map((c, i) => ({ c, i })).filter(o => o.c.hp > 0);
    if (partySize === 1 || alive.length <= 1) {
      // Solo (ou un seul allié vivant) : auto-cible le caster.
      targetAllyIdx = currentBattleChar;
    } else {
      // Duo, choix entre alliés vivants : on stocke le sort et on ouvre le sélecteur.
      pendingSpell = spellName;
      if (typeof showAllyTargetSelection === 'function') {
        showAllyTargetSelection(spellName);
        return;
      }
      // Fallback : auto-cible le caster si la sélection n'est pas dispo.
      targetAllyIdx = currentBattleChar;
    }
  }

  char.sp -= spell.cost;
  AudioSystem.playSpellCast(spellName);
  AudioSystem.speakSpell(spellName);
  closeModal('spell-modal');
  document.getElementById('target-selection').style.display = 'none';

  let enemy     = enemyGroup[targetIdx >= 0 ? targetIdx : 0];
  if ((!enemy || enemy.currentHp <= 0) && typeof livingEnemies === 'function') {
    enemy = livingEnemies()[0] || enemy;
  }
  const handler = SPELL_HANDLERS[spell.effect];
  let msg = '';
  if (handler) {
    msg = handler(spell, char, enemy, targetIdx, targetAllyIdx) || '';
  } else {
    console.warn('[spell] effet inconnu:', spell.effect);
  }

  setBattleLog(msg);
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

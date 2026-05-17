// ============================================================
// COMBAT — Sorts et capacités spéciales
// Fonctions de sorts utilisées par le moteur de combat (battle.js)
// ============================================================

// ── Utilisation d'une capacité spéciale par un ennemi ────────
function tryEnemyAbility(enemy, target, charIdx, appendLog) {
  if (!enemy.abilities || !enemy.abilities.length) return false;
  // Heuristique anti-stalling : face à une cible en Double-Garde
  // (guardTurns ≥ 2), les ennemis privilégient `weaken` pour briser la
  // posture (chance ×1.5). Cf. combat-extensions-v2.md §B.
  const heavyGuard = (typeof guardTurns !== 'undefined') && guardTurns[charIdx] >= 2;
  const ability = enemy.abilities.find(a => {
    let ch = a.chance;
    if (heavyGuard && a.effect === 'weaken') ch = Math.min(1, ch * 1.5);
    return Math.random() < ch;
  });
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
    case 'dispel': {
      // Retire un buff de la cible : priorité shield > guard > regen.
      // Si la cible n'a aucun buff visé, l'ennemi ne gaspille pas son tour
      // (return false → attaque physique normale dans enemyTurn).
      const want = ability.targets || ['shield', 'guard', 'regen'];
      let removed = null;
      if (want.includes('shield') && shieldTurns[charIdx] > 0) {
        shieldTurns[charIdx] = 0;
        removed = 'Protego';
      } else if (want.includes('guard') && typeof guardTurns !== 'undefined' && guardTurns[charIdx] > 0) {
        guardTurns[charIdx] = 0;
        removed = 'Garde';
      } else if (want.includes('regen') && target.statusEffects) {
        const i = target.statusEffects.findIndex(s => s.id === 'regen' || s.id === 'regen_ferula_max');
        if (i >= 0) {
          removed = STATUS_DEFS[target.statusEffects[i].id].label;
          target.statusEffects.splice(i, 1);
        }
      }
      if (!removed) return false;
      appendLog(`❌ ${enemy.name} — ${ability.name} dissipe ${removed} de ${target.name} ! `);
      UX_safe.logCombat(`❌ ${enemy.name} dissipe <b>${removed}</b> de ${target.name}`, 'bad');
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

const STATUS_BY_SPELL = { 'Incendio': 'burn', 'Diffindo': 'bleed', 'Sectumsempra': 'bleed', 'Glacius': 'gel' };

// Morts-vivants : cible du bonus `spell.bonusVsUndead` (Lumos Solem).
// Tous les fantômes + une liste d'ids non-fantômes mais sans vie.
const UNDEAD_IDS = new Set([
  'inferius', 'detraqueur', 'dementor_garde', 'vampire_mineur',
  'strigoi', 'chauve_souris_vampire', 'poupee_maudite',
]);
function _isUndead(enemy) {
  return !!enemy && (enemy.category === 'fantôme' || UNDEAD_IDS.has(enemy.id));
}

// Crit de sort : roll spellCritChance (dérivée de l'AGI dans
// recalculateStats), applique spellCritMultiplier sur les dégâts. Canal
// distinct du crit physique (cf. .claude/plans/crit-rework.md +
// agi-spell-crit.md). Saves antérieures : champs absents → pas de crit.
function rollSpellCrit(dmg, char) {
  const chance = (char && char.spellCritChance != null) ? char.spellCritChance : 0;
  if (Math.random() * 100 < chance) {
    const mult = (char && char.spellCritMultiplier) || 1.5;
    return { dmg: Math.floor(dmg * mult), crit: true };
  }
  return { dmg, crit: false };
}

// ── Formules pures (partagées handlers + aperçu de fiche) ────
// INT = maîtrise + END = domaine du soin (addition à parts égales).
function healAmount(spell, char) {
  return spell.power + Math.floor((char.int || 0) / 4) + Math.floor((char.end || 0) / 4);
}
// MAG pilote les dégâts de sort (hors résist/faiblesse, crit).
function spellDamage(spell, char) {
  return spell.power + Math.floor((char.mag || 0) / 2);
}
// Expelliarmus — réduction d'ATK : `power` de base, AGI convenablement,
// INT faiblement. Plafonnée par l'ATK de l'ennemi côté handler.
function disarmAtkLoss(spell, char) {
  return spell.power + Math.floor((char.agi || 0) / 8) + Math.floor((char.int || 0) / 16);
}
// Expelliarmus — durée du désarmement : INT faiblement, plafond 5 tours.
function disarmTurns(spell, char) {
  return Math.min(5, 2 + Math.floor((char.int || 0) / 16));
}
// Protego — durée du bouclier : MAG, plafond 5 tours.
function shieldDuration(spell, char) {
  return Math.min(5, 2 + Math.floor((char.mag || 0) / 25));
}
// Accio/Alohomora — part déterministe de l'or volé : MAG un peu, LCK
// beaucoup. L'or réel = stealBaseGold + random(0..5).
function stealBaseGold(spell, char) {
  return (spell.power || 0) + Math.floor((char.mag || 0) / 8) + Math.floor((char.lck || 0) / 2);
}
// Aperçu chiffré de l'effet pour le perso courant, affiché en fiche.
// Chaîne vide pour les sorts sans valeur chiffrable simple (shield,
// disarm, steal, teleport).
function spellEffectPreview(spell, char) {
  if (!spell || !char) return '';
  switch (spell.effect) {
    case 'heal':              return `≈ ${healAmount(spell, char)} PV rendus`;
    case 'support_regen':     return `≈ ${healAmount(spell, char)} PV + régénération`;
    case 'support_regen_aoe': return 'PV + PM des deux alliés (3 tours)';
    case 'lifesteal': {
      const d = spellDamage(spell, char);
      return `≈ ${d} dégâts · +${Math.floor(d / 2)} PV drainés`;
    }
    case 'stun': case 'burn': case 'instant': case 'curse':
      return `≈ ${spellDamage(spell, char)} dégâts`;
    case 'disarm':
      return `≈ −${disarmAtkLoss(spell, char)} ATK ennemie (${disarmTurns(spell, char)} tours)`;
    case 'shield':
      return `bouclier ${shieldDuration(spell, char)} tours`;
    case 'steal': {
      const b = stealBaseGold(spell, char);
      return `≈ ${b}–${b + 5} 🪙`;
    }
    default:              return '';
  }
}

function _spellHeal(spell, char) {
  const amount = healAmount(spell, char);
  char.hp = Math.min(char.hpMax, char.hp + amount);
  const msg = `💚 ${char.name} : ${spell.name} +${amount} PV !`;
  addMsg(msg, 'good');
  UX_safe.floatDmg('ally', amount, 'heal');
  UX_safe.logCombat(`💚 ${char.name} lance ${spell.name} : <b>+${amount} PV</b>`, 'good');
  return msg;
}

function _spellDisarm(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    if (enemy.resist?.includes('disarm')) {
      msg = `✨ ${char.name} : ${spell.name} — ${enemy.name} y résiste 🔰 !`;
      UX_safe.logCombat(`🔰 ${enemy.name} résiste à ${spell.name}`, 'info');
    } else {
      const turns = disarmTurns(spell, char);
      const lost  = Math.min(disarmAtkLoss(spell, char), enemy.atk || 0);
      enemy.atk = Math.max(0, (enemy.atk || 0) - lost);
      applyStatus(enemy, 'disarm', lost, turns);
      msg = `✨ ${char.name} : ${spell.name} désarme ${enemy.name} (−${lost} ATK, ${turns} tours) !`;
      UX_safe.floatDmg(`enemy:${targetIdx}`, 0, 'shield');
      UX_safe.logCombat(`✨ ${char.name} désarme ${enemy.name} : <b>−${lost} ATK</b> (${turns} tours)`, 'magic');
    }
  }
  addMsg(msg, 'magic');
  return msg;
}

function _spellShield(spell, char) {
  const dur = shieldDuration(spell, char);
  shieldTurns[currentBattleChar] = dur;
  const msg = `🛡️ ${char.name} : ${spell.name} — bouclier actif ${dur} tours !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🛡️ ${char.name} active Protego (${dur} tours)`, 'magic');
  return msg;
}

// Calcul de dégâts d'un sort offensif : base power + mag/2, modulée par
// les resist/weak de l'ennemi (clé = spell.element), le bonus anti-mort-vivant
// optionnel (opts.undead), puis le critique. `suffix` porte les pictogrammes
// 🔰/💥/☀️/💥CRIT (avec leur espace de tête) pour les messages.
function _computeSpellDamage(spell, char, enemy, opts) {
  opts = opts || {};
  let dmg    = spell.power + Math.floor(char.mag / 2);
  let suffix = '';
  if (enemy.resist?.includes(spell.element)) { dmg = Math.floor(dmg * RESIST_MULTIPLIER); suffix = ' 🔰'; }
  if (enemy.weak?.includes(spell.element))   { dmg = Math.floor(dmg * WEAK_MULTIPLIER);   suffix = ' 💥'; }
  if (opts.undead && spell.bonusVsUndead && _isUndead(enemy)) {
    dmg = Math.floor(dmg * spell.bonusVsUndead); suffix += ' ☀️';
  }
  const cr = rollSpellCrit(dmg, char);
  dmg = cr.dmg;
  if (cr.crit) suffix += ' 💥CRIT';
  return { dmg, suffix, crit: cr.crit };
}

function _spellElementalDamage(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    const { dmg, suffix } = _computeSpellDamage(spell, char, enemy, { undead: true });
    enemy.currentHp -= dmg;
    msg = `${getSpellIconHtml(spell, 'ui-icon-md')} ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} sur ${enemy.name} !`;

    // Application probabiliste d'un statut DoT
    const statusId = STATUS_BY_SPELL[spell.name];
    if (statusId && enemy.currentHp > 0) {
      // INT = maîtrise + LCK = domaine des afflictions (addition à parts égales).
      const chance = Math.min(0.50, 0.10 + (char.int || 0) * 0.0075 + (char.lck || 0) * 0.0075);
      if (Math.random() < chance) {
        const dotPower = Math.max(1, Math.floor(spell.power * 0.25));
        const dotTurns = Math.min(5, 2 + Math.floor((char.int || 0) / 24) + Math.floor((char.lck || 0) / 24));
        applyStatus(enemy, statusId, dotPower, dotTurns);
        const def  = STATUS_DEFS[statusId];
        msg += ` ${def.icon} ${def.label} appliqué !`;
        UX_safe.logCombat(`${def.icon} ${enemy.name} : ${def.label} (${dotPower}/tour, ${dotTurns} tours)`, 'magic');
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
    const { dmg, suffix } = _computeSpellDamage(spell, char, enemy);
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
    const { dmg, crit } = _computeSpellDamage(spell, char, enemy);
    enemy.currentHp -= dmg;
    enemy.atk = Math.max(0, (enemy.atk || 0) - 3);
    enemy.def = Math.max(0, (enemy.def || 0) - 3);
    msg = `☠️ ${char.name} : ${spell.name} → ${dmg} dégâts${crit ? ' 💥CRIT' : ''} et ${enemy.name} maudit (−3 ATK/DEF) !`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, 'crit');
    UX_safe.logCombat(`☠️ ${char.name} maudit ${enemy.name} : <b>−${dmg}</b>, −3 ATK/DEF`, 'magic');
  }
  addMsg(msg, 'magic');
  return msg;
}

function _spellSteal(spell, char) {
  const gold = stealBaseGold(spell, char) + Math.floor(Math.random() * 6);
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
  const burst = Math.min(ally.hpMax - ally.hp, healAmount(spell, char));
  if (burst > 0) {
    ally.hp += burst;
    UX_safe.floatDmg('ally', burst, 'heal');
  }
  const regenPower = spell.power + Math.floor((char.int || 0) / 8) + Math.floor((char.end || 0) / 8);
  applyStatus(ally, 'regen', regenPower, 3);
  const msg = `🩹 ${char.name} → ${ally.name} : ${spell.name} (+${burst} PV, régen 3 tours).`;
  addMsg(msg, 'good');
  UX_safe.logCombat(`🩹 <b>${char.name}</b> bande ${ally.name} : <b>+${burst} PV</b> · régen 3 tours`, 'good');
  return msg;
}

// Ferula Maxima : régénération de soutien AOE. Applique le statut
// regen_ferula_max (PV + PM par tour, 3 tours) sur TOUS les alliés vivants.
// Pas de sélection de cible — l'effet touche le groupe entier.
function _spellSupportRegenAoe(spell, char) {
  const allies = party.slice(0, partySize).filter(c => c.hp > 0);
  // Scaling atténué : plus doux que Ferula simple (INT/8 + END/8) car
  // l'effet touche tout le groupe sur 3 tours.
  const regenPower = spell.power
    + Math.floor((char.int || 0) / 12)
    + Math.floor((char.end || 0) / 16);
  allies.forEach(ally => applyStatus(ally, 'regen_ferula_max', regenPower, 3));
  const names = allies.map(a => a.name).join(' & ') || char.name;
  const msg = `🩹✨ ${char.name} : ${spell.name} — régénération de groupe (${names}, 3 tours).`;
  addMsg(msg, 'good');
  UX_safe.logCombat(`🩹✨ <b>${char.name}</b> lance ${spell.name} sur ${names}`, 'good');
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
  steal:             _spellSteal,
  support_regen:     _spellSupportRegen,
  support_regen_aoe: _spellSupportRegenAoe,
  teleport:          _spellTeleport,
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

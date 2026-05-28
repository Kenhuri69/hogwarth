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

  // Legilimens (palier Mythe Serdaigle) : la capacité repérée est
  // anticipée et annulée — l'ennemi gaspille son tour.
  if (legilimensCancelCharges > 0) {
    legilimensCancelCharges--;
    appendLog(`👁️ ${ability.name} de ${enemy.name} est anticipé et annulé par Legilimens ! `);
    UX_safe.logCombat(`👁️ Legilimens annule ${ability.name} de ${enemy.name}`, 'good');
    return true;
  }

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
      // restauration auto via tickStatuses à l'expiration. Empilable
      // jusqu'à 3 stacks (cap dans STATUS_DEFS.weaken.maxStacks).
      const turns   = ability.turns || 3;
      const lost    = Math.min(ability.power, target.def || 0);
      const applied = applyStatus(target, 'weaken', lost, turns);
      // applied === false → cap stacks atteint, on ne soustrait pas la
      // DEF (sinon le malus serait permanent : la restauration à
      // l'expiry ne couvre que les stacks effectivement posés).
      if (applied && lost > 0) {
        target.def = Math.max(0, (target.def || 0) - lost);
        appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${target.name} perd ${lost} DEF (${turns} tours) ! `);
        UX_safe.logCombat(`${ability.icon} ${enemy.name} affaiblit ${target.name} : <b>−${lost} DEF</b> (${turns} tours)`, 'bad');
      } else {
        // Cap atteint ou DEF déjà à 0 — annonce une "résistance".
        appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${target.name} résiste à l'affaiblissement. `);
        UX_safe.logCombat(`${ability.icon} ${target.name} <i>résiste à l'affaiblissement</i>`, 'info');
      }
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
// Dégâts de base AoE : MAG commune + une stat thématique par élément
// (spell.stat2). Les diviseurs magDiv/stat2Div sont propres à chaque
// sort — levier d'équilibrage : un sort à gros rider (gel, vol de vie)
// scale plus doucement qu'un sort de dégâts purs. Défaut 3/3.
function aoeBaseDamage(spell, char) {
  const magDiv   = spell.magDiv   || 3;
  const stat2Div = spell.stat2Div || 3;
  const s2 = spell.stat2 ? Math.floor((char[spell.stat2] || 0) / stat2Div) : 0;
  return spell.power + Math.floor((char.mag || 0) / magDiv) + s2;
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
    case 'stun': case 'burn': case 'instant': case 'curse': {
      let txt = `≈ ${spellDamage(spell, char)} dégâts`;
      if (spell.splash) {
        const sp = Math.max(1, Math.floor(
          spell.power / 2 + (char.mag || 0) / 8 + (char.str || 0) / 4));
        txt += ` · éclaboussure ≈ ${sp}`;
      }
      return txt;
    }
    case 'disarm':
      return `≈ −${disarmAtkLoss(spell, char)} ATK ennemie (${disarmTurns(spell, char)} tours)`;
    case 'shield':
      return `bouclier ${shieldDuration(spell, char)} tours`;
    case 'steal': {
      const b = stealBaseGold(spell, char);
      return `≈ ${b}–${b + 5} 🪙`;
    }
    case 'aoe_wave': case 'aoe_chain': case 'aoe_drain': case 'aoe_cleave':
      return `≈ ${aoeBaseDamage(spell, char)} dégâts · zone`;
    case 'aoe_field':
      return `≈ ${aoeBaseDamage(spell, char)} dégâts · zone · gel`;
    case 'heal_aoe':        return `≈ ${healAmount(spell, char)} PV au groupe`;
    case 'imperius':        return `≈ ${spellDamage(spell, char)} dégâts · asservit 2 tours`;
    case 'patronus_maxima': return 'Bouclier de groupe (2 tours)';
    case 'legilimens':      return 'Annule la prochaine capacité ennemie';
    case 'recolte':         return 'Groupe restauré · or +50%';
    case 'reveal':          return 'Dévoile tous les secrets du monstre';
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
  // Apothéose : Vigueur (Poufsouffle) + Élan (Gryffondor) — multiplicateurs
  // de dégâts. _houseElanMult lit seulement le cumul ; la mise à jour des
  // paliers (_updateElan) est faite par les handlers offensifs.
  dmg = Math.floor(dmg * _houseVigorMult(char) * _houseElanMult(char));
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

// Coût en PM effectif d'un sort — réduit de 20 % (arrondi au sup., plancher
// 1) par l'Apothéose Serdaigle (palier 18 — Esprit de l'Aigle).
function _spellSpCost(spell) {
  if (typeof houseApotheosePassive === 'function' && houseApotheosePassive() === 'Serdaigle') {
    return Math.max(1, Math.ceil(spell.cost * 0.8));
  }
  return spell.cost;
}

// Apothéose Serpentard (palier 18 — Soif du Serpent) : draine 15 % des
// dégâts d'un sort offensif en PV pour le lanceur. Retourne le soin
// effectif (0 si le passif est inactif ou le lanceur déjà au max).
function _applySerpentLifesteal(char, dmg) {
  if (typeof houseApotheosePassive !== 'function' || houseApotheosePassive() !== 'Serpentard') return 0;
  if (!char || dmg <= 0) return 0;
  const heal = Math.min(char.hpMax - char.hp, Math.max(1, Math.floor(dmg * 0.15)));
  if (heal > 0) { char.hp += heal; UX_safe.floatDmg('ally', heal, 'heal'); }
  return heal;
}

function _spellElementalDamage(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    const { dmg, suffix, crit } = _computeSpellDamage(spell, char, enemy, { undead: true });
    enemy.currentHp -= dmg;
    _updateElan(char, crit);   // Apothéose Gryffondor — Élan
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

    // Bombarda — éclaboussure : les autres ennemis vivants subissent
    // floor(power/2 + mag/8 + str/4), modulée par resist/weak. Pas de
    // crit, pas de DoT, pas de passif de Maison (réservés à la cible).
    if (spell.splash) {
      const splashBase = Math.max(1, Math.floor(
        spell.power / 2 + (char.mag || 0) / 8 + (char.str || 0) / 4));
      livingEnemies().filter(e => e !== enemy).forEach(other => {
        let sd = splashBase, ssfx = '';
        if (other.resist?.includes(spell.element)) { sd = Math.floor(sd * RESIST_MULTIPLIER); ssfx = ' 🔰'; }
        if (other.weak?.includes(spell.element))   { sd = Math.floor(sd * WEAK_MULTIPLIER);   ssfx = ' 💥'; }
        sd = Math.max(1, sd);
        other.currentHp -= sd;
        UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(other)}`, sd, 'dmg');
        msg += ` 💥 ${other.name} −${sd}${ssfx}`;
        UX_safe.logCombat(`💥 Éclaboussure sur ${other.name} : <b>−${sd}</b>${ssfx}`, 'magic');
      });
    }

    const drain = _applySerpentLifesteal(char, dmg);
    if (drain > 0) msg += ` 🐍 +${drain} PV drainés !`;

    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, suffix.includes('💥') ? 'crit' : 'dmg');
    UX_safe.logCombat(`${getSpellIconHtml(spell, 'ui-icon-md')} ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix} sur ${enemy.name}`, 'magic');
  }
  addMsg(msg, 'magic');
  return msg;
}

function _spellLifesteal(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    const { dmg, suffix, crit } = _computeSpellDamage(spell, char, enemy);
    enemy.currentHp -= dmg;
    _updateElan(char, crit);   // Apothéose Gryffondor — Élan
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
    _updateElan(char, crit);   // Apothéose Gryffondor — Élan
    enemy.atk = Math.max(0, (enemy.atk || 0) - 3);
    enemy.def = Math.max(0, (enemy.def || 0) - 3);
    const drain = _applySerpentLifesteal(char, dmg);
    msg = `☠️ ${char.name} : ${spell.name} → ${dmg} dégâts${crit ? ' 💥CRIT' : ''} et ${enemy.name} maudit (−3 ATK/DEF) !`;
    if (drain > 0) msg += ` 🐍 +${drain} PV drainés !`;
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

// ── Sorts de Maison — palier 17 « Mythe » ────────────────────

// Patronus Maxima (Gryffondor) : bouclier de groupe (2 tours) sur tous
// les alliés vivants + dissipe peur et étourdissement. Pas de cible ennemie.
function _spellPatronusMaxima(spell, char) {
  party.slice(0, partySize).forEach((c, idx) => {
    if (c.hp <= 0) return;
    shieldTurns[idx] = Math.max(shieldTurns[idx] || 0, 2);
    if (c.statusEffects) {
      c.statusEffects = c.statusEffects.filter(s => s.id !== 'stun' && s.id !== 'fear');
    }
  });
  UX_safe.floatDmg('ally', 0, 'shield');
  const msg = `🦌 ${char.name} : ${spell.name} — un Patronus enveloppe tout le groupe (bouclier 2 tours) !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🦌 ${char.name} invoque ${spell.name} — bouclier de groupe`, 'magic');
  return msg;
}

// Sectumsempra Imperius (Serpentard) : dégâts ténèbres + saignement
// lourd + asservit la cible 2 tours (elle frappera ses alliés).
function _spellImperius(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    const { dmg, suffix } = _computeSpellDamage(spell, char, enemy);
    enemy.currentHp -= dmg;
    if (enemy.currentHp > 0) {
      const dotPower = Math.max(3, Math.floor(spell.power * 0.4));
      applyStatus(enemy, 'bleed', dotPower, 3);
      applyStatus(enemy, 'imperius', 0, 2);
    }
    msg = `🩸 ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} — ${enemy.name} saigne et tombe sous l'Imperium !`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, suffix.includes('💥') ? 'crit' : 'dmg');
    UX_safe.logCombat(`🩸 ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix} · ${enemy.name} asservi 2 tours`, 'magic');
  }
  addMsg(msg, 'magic');
  return msg;
}

// Legilimens (Serdaigle) : révèle les capacités ennemies dans le journal
// et arme une charge d'annulation (la prochaine capacité ennemie fizzle).
function _spellLegilimens(spell, char) {
  livingEnemies().forEach(e => {
    const abs = (e.abilities && e.abilities.length)
      ? e.abilities.map(a => a.name).join(', ')
      : 'aucune capacité spéciale';
    UX_safe.logCombat(`👁️ ${e.name} — capacités : ${abs}`, 'info');
  });
  legilimensCancelCharges += 1;
  const msg = `👁️ ${char.name} : ${spell.name} — l'esprit ennemi est lu ; la prochaine capacité sera annulée.`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`👁️ ${char.name} lance ${spell.name}`, 'magic');
  return msg;
}

// Revelio en combat : ouvre le panneau d'info du monstre ciblé avec les
// trois paliers déverrouillés, quel que soit monsterKills. Consomme le
// tour et le PM comme un sort utilitaire (cf. manon-grimoire-pages.md §4b).
function _spellReveal(spell, char, enemy, targetIdx) {
  const idx    = (typeof targetIdx === 'number' && targetIdx >= 0) ? targetIdx : 0;
  const target = enemyGroup[idx] || enemy;
  if (typeof showMonsterCombatInfo === 'function') {
    showMonsterCombatInfo(idx, { revealed: true });
  }
  const name = (target && target.name) || 'la créature';
  const msg  = `🔎 ${char.name} : ${spell.name} — ${name} n'a plus de secret.`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🔎 ${char.name} lance ${spell.name} sur ${name}`, 'info');
  return msg;
}

// Récolte Magique (Poufsouffle) : restaure PV + PM de tout le groupe et
// majore l'or de ce combat de +50 % (recolteGoldBonus, lu par endBattle).
function _spellRecolte(spell, char) {
  party.slice(0, partySize).forEach(c => {
    if (c.hp <= 0) return;
    c.hp = c.hpMax;
    c.sp = c.spMax;
  });
  recolteGoldBonus = true;
  UX_safe.floatDmg('ally', 0, 'heal');
  const msg = `🌾 ${char.name} : ${spell.name} — le groupe est revigoré ; les Gallions du combat sont majorés (+50%) !`;
  addMsg(msg, 'good');
  UX_safe.logCombat(`🌾 ${char.name} lance ${spell.name} — groupe restauré`, 'good');
  return msg;
}

// ── Sorts de zone (AoE) ──────────────────────────────────────
// Applique des dégâts élémentaires bruts à un ennemi : resist/weak +
// bonus morts-vivants optionnel. Pas de crit (les AoE ne crittent pas) ni
// de passif de Maison — choix d'équité hérité de Bombarda. Mute currentHp,
// retourne { dmg, suffix }.
function _aoeHit(spell, char, enemy, raw, opts) {
  opts = opts || {};
  let dmg = Math.max(1, Math.floor(raw));
  let suffix = '';
  if (enemy.resist?.includes(spell.element)) { dmg = Math.max(1, Math.floor(dmg * RESIST_MULTIPLIER)); suffix = ' 🔰'; }
  if (enemy.weak?.includes(spell.element))   { dmg = Math.floor(dmg * WEAK_MULTIPLIER);                 suffix = ' 💥'; }
  if (opts.undead && spell.bonusVsUndead && _isUndead(enemy)) {
    dmg = Math.floor(dmg * spell.bonusVsUndead); suffix += ' ☀️';
  }
  dmg = Math.max(1, dmg);
  enemy.currentHp -= dmg;
  return { dmg, suffix };
}

// Lux Aeterna (vague) : dégâts égaux à tous les ennemis, bonus morts-vivants.
function _spellAoeWave(spell, char) {
  const base = aoeBaseDamage(spell, char);
  let msg = `${getSpellIconHtml(spell, 'ui-icon-md')} ${char.name} : ${spell.name} —`;
  livingEnemies().forEach(e => {
    const { dmg, suffix } = _aoeHit(spell, char, e, base, { undead: true });
    UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(e)}`, dmg, 'dmg');
    msg += ` ${e.name} −${dmg}${suffix}`;
    UX_safe.logCombat(`${getSpellIconHtml(spell, 'ui-icon-md')} ${spell.name} → <b>−${dmg}</b>${suffix} sur ${e.name}`, 'magic');
  });
  addMsg(msg, 'magic');
  return msg;
}

// Glacius Tempête (nappe) : dégâts modérés à tous + statut gel sur chacun.
function _spellAoeField(spell, char) {
  const base     = aoeBaseDamage(spell, char);
  const dotPower = Math.max(1, Math.floor(spell.power * 0.25));
  const dotTurns = Math.min(5, 2 + Math.floor((char.int || 0) / 24));
  let msg = `🌨️ ${char.name} : ${spell.name} —`;
  livingEnemies().forEach(e => {
    const { dmg, suffix } = _aoeHit(spell, char, e, base);
    UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(e)}`, dmg, 'dmg');
    if (e.currentHp > 0) applyStatus(e, 'gel', dotPower, dotTurns);
    msg += ` ${e.name} −${dmg}${suffix} ❄️`;
  });
  addMsg(msg, 'magic');
  UX_safe.logCombat(`❄️ ${char.name} : ${spell.name} — le groupe ennemi est gelé`, 'magic');
  return msg;
}

// Fulgur Catena (chaîne) : arc d'ennemi en ennemi, dégâts ×0,65 par saut.
function _spellAoeChain(spell, char) {
  const base = aoeBaseDamage(spell, char);
  let mult = 1;
  let msg = `⚡ ${char.name} : ${spell.name} —`;
  livingEnemies().forEach((e, i) => {
    const { dmg, suffix } = _aoeHit(spell, char, e, base * mult);
    UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(e)}`, dmg, 'dmg');
    msg += `${i ? ' →' : ''} ${e.name} −${dmg}${suffix}`;
    UX_safe.logCombat(`⚡ ${spell.name} → <b>−${dmg}</b>${suffix} sur ${e.name}`, 'magic');
    mult *= 0.65;
  });
  addMsg(msg, 'magic');
  return msg;
}

// Nox Vorax (drain) : dégâts à tous ; le lanceur se soigne de la moitié du total.
function _spellAoeDrain(spell, char) {
  const base = aoeBaseDamage(spell, char);
  let total = 0;
  let msg = `🌑 ${char.name} : ${spell.name} —`;
  livingEnemies().forEach(e => {
    const { dmg, suffix } = _aoeHit(spell, char, e, base);
    total += dmg;
    UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(e)}`, dmg, 'dmg');
    msg += ` ${e.name} −${dmg}${suffix}`;
  });
  const heal = Math.min(char.hpMax - char.hp, Math.floor(total / 2));
  if (heal > 0) { char.hp += heal; UX_safe.floatDmg('ally', heal, 'heal'); }
  msg += ` — +${heal} PV drainés !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🌑 ${char.name} : ${spell.name} draine <b>+${heal} PV</b>`, 'magic');
  return msg;
}

// Diffindo Maxima (fauchage) : cible pleine + voisins directs (±1) ×0,6.
function _spellAoeCleave(spell, char, enemy, targetIdx) {
  if (!enemy) return '';
  const base = aoeBaseDamage(spell, char);
  const ti   = enemyGroup.indexOf(enemy);
  let msg = `⚔️ ${char.name} : ${spell.name} —`;
  const main = _aoeHit(spell, char, enemy, base);
  UX_safe.floatDmg(`enemy:${ti}`, main.dmg, 'dmg');
  msg += ` ${enemy.name} −${main.dmg}${main.suffix}`;
  [ti - 1, ti + 1].forEach(ni => {
    const nb = enemyGroup[ni];
    if (!nb || nb.currentHp <= 0) return;
    const hit = _aoeHit(spell, char, nb, base * 0.6);
    UX_safe.floatDmg(`enemy:${ni}`, hit.dmg, 'dmg');
    msg += ` · ${nb.name} −${hit.dmg}${hit.suffix}`;
  });
  addMsg(msg, 'magic');
  UX_safe.logCombat(`⚔️ ${char.name} : ${spell.name} fauche le groupe`, 'magic');
  return msg;
}

// Vulnera Sanentur (soin de groupe) : soin instantané à tous les alliés vivants.
function _spellHealAoe(spell, char) {
  const amount = healAmount(spell, char);
  let msg = `💗 ${char.name} : ${spell.name} —`;
  party.slice(0, partySize).forEach(c => {
    if (c.hp <= 0) return;
    const burst = Math.min(c.hpMax - c.hp, amount);
    c.hp += burst;
    msg += ` ${c.name} +${burst} PV`;
  });
  UX_safe.floatDmg('ally', amount, 'heal');
  addMsg(msg, 'good');
  UX_safe.logCombat(`💗 ${char.name} : ${spell.name} soigne tout le groupe`, 'good');
  return msg;
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
  patronus_maxima:   _spellPatronusMaxima,
  imperius:          _spellImperius,
  legilimens:        _spellLegilimens,
  recolte:           _spellRecolte,
  reveal:            _spellReveal,
  aoe_wave:          _spellAoeWave,
  aoe_field:         _spellAoeField,
  aoe_chain:         _spellAoeChain,
  aoe_drain:         _spellAoeDrain,
  aoe_cleave:        _spellAoeCleave,
  heal_aoe:          _spellHealAoe,
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
  if (!spell || char.sp < _spellSpCost(spell)) { addMsg("Pas assez de magie !", 'bad'); return; }

  // Phase G §6.8 — Avada Kedavra refusé contre les échos. Narratif (un
  // écho n'a pas d'âme à briser) et anti-trivialisation : un sort de mort
  // instantanée rendrait le combat astral sans intérêt.
  if (typeof inAstralCombat !== 'undefined' && inAstralCombat
      && spell.effect === 'instant') {
    addMsg("L'écho refuse cette mort — la lumière verte se dissipe sans cible.", 'bad');
    return;
  }

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
    char.sp -= _spellSpCost(spell);
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

  char.sp -= _spellSpCost(spell);
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

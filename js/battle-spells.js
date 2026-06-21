// ============================================================
// COMBAT — Sorts et capacités spéciales
// Fonctions de sorts utilisées par le moteur de combat (battle.js)
// ============================================================

// Potions ennemies (effect:"consumable") — charges suivies PAR INSTANCE de
// monstre (les objets `abilities` sont partagés entre instances scalées, on ne
// peut donc pas y stocker l'état). `enemy._potions[key]` = charges restantes,
// initialisé paresseusement depuis `ability.charges` (défaut 1). Combat-scoped,
// non sérialisé (autoSave est refusé en combat).
function _enemyPotionKey(a) { return a.name || a.statusId || 'potion'; }
function _enemyPotionLeft(enemy, a) {
  if (!enemy._potions) enemy._potions = {};
  const k = _enemyPotionKey(a);
  if (enemy._potions[k] === undefined) enemy._potions[k] = (a.charges | 0) || 1;
  return enemy._potions[k];
}
function _enemyPotionConsume(enemy, a) {
  const left = _enemyPotionLeft(enemy, a);
  if (left > 0) enemy._potions[_enemyPotionKey(a)] = left - 1;
}

// P2 — Boss à phases (combat-system-synthesis §1.4). Une capacité portant
// `phase:true` (+ seuil `phaseHpFrac`, défaut 0.5) reste GARDÉE tant que les PV
// de l'ennemi sont au-dessus du seuil ; sous le seuil, elle se débloque. PUR
// (lecture seule). Une capacité sans `phase` est toujours prête.
function _abilityPhaseReady(a, enemy) {
  if (!a || !a.phase) return true;
  const maxHp = enemy.hp || enemy.currentHp || 1;
  const frac  = (typeof a.phaseHpFrac === 'number') ? a.phaseHpFrac : 0.5;
  return enemy.currentHp <= maxHp * frac;
}
// Beat narratif one-shot au franchissement du seuil de phase d'un boss : un
// héros vivant réagit (heroBarkScripted, défensif). Marqué via `_phaseBeatDone`.
function _maybeBossPhaseBeat(enemy, appendLog) {
  if (!enemy || enemy._phaseBeatDone) return;
  const gated = (enemy.abilities || []).filter(a => a && a.phase);
  if (!gated.length) return;
  const crossed = gated.some(a => _abilityPhaseReady(a, enemy));
  if (!crossed) return;
  enemy._phaseBeatDone = true;
  const msg = enemy.phaseMsg || `${enemy.name} change de tactique — ses forces se réveillent !`;
  if (typeof appendLog === 'function') appendLog(`⚡ ${msg} `);
  UX_safe.logCombat(`⚡ ${msg}`, 'bad');
  if (typeof heroBarkScripted === 'function' && typeof party !== 'undefined') {
    const speaker = party.slice(0, partySize).find(c => c && c.hp > 0 && c.heroKey);
    if (speaker) heroBarkScripted(speaker.heroKey, 'bossPhase',
      { channel: 'combat', once: 'bossphase:' + (enemy.id || enemy.name) });
  }
}

// ── Utilisation d'une capacité spéciale par un ennemi ────────
function tryEnemyAbility(enemy, target, charIdx, appendLog) {
  if (!enemy.abilities || !enemy.abilities.length) return false;
  // P2 — Boss à phases : beat narratif au franchissement du seuil de PV.
  _maybeBossPhaseBeat(enemy, appendLog);
  // Heuristique anti-stalling : face à une cible en Double-Garde
  // (guardTurns ≥ 2), les ennemis privilégient `weaken` pour briser la
  // posture (chance ×1.5). Cf. combat-extensions-v2.md §B.
  const heavyGuard = (typeof guardTurns !== 'undefined') && guardTurns[charIdx] >= 2;
  // Capacités dont le jet probabiliste réussit ce tour.
  const fired = enemy.abilities.filter(a => {
    // Potion ennemie : un consommable épuisé (charges par instance) ne tire plus.
    if (a.effect === 'consumable' && _enemyPotionLeft(enemy, a) <= 0) return false;
    // P2 — capacité de phase gardée tant que les PV sont au-dessus du seuil.
    if (!_abilityPhaseReady(a, enemy)) return false;
    let ch = a.chance;
    if (heavyGuard && a.effect === 'weaken') ch = Math.min(1, ch * 1.5);
    return Math.random() < ch;
  });
  if (!fired.length) return false;

  // Choix de la capacité piloté par le tempérament `enemy.ai` (jusqu'ici
  // déclaratif mais inexploité). Le défaut `random` conserve le comportement
  // historique (première capacité déclarée dont le jet a réussi).
  const ai    = enemy.ai || 'random';
  const lowHp = enemy.currentHp < (enemy.hp || enemy.currentHp || 1) * 0.35;
  let ability;
  if (ai === 'aggressive') {
    // Cherche à infliger un maximum de dégâts.
    ability = fired.find(a => a.effect === 'damage' || a.effect === 'drain' || a.effect === 'maxhpdamage');
  } else if (ai === 'cautious') {
    // En danger, privilégie de se soigner ; sinon temporise (affaiblit/dissipe).
    if (lowHp) ability = fired.find(a => a.effect === 'heal') || fired.find(a => a.effect === 'drain');
    ability = ability || fired.find(a => a.effect === 'weaken' || a.effect === 'dispel');
  }
  ability = ability || fired[0];

  // Priorité B3 : un `enrage_self` prêt à se déclencher (sous le seuil, pas
  // encore enragé) passe avant le pick IA normal — sinon un boss `aggressive`
  // choisirait toujours `damage` et n'enragerait jamais.
  const enrageReady = fired.find(a => a.effect === 'enrage_self'
    && !enemy._enraged
    && enemy.currentHp <= (enemy.hp || enemy.currentHp || 1) * (a.hpPct || 0.4));
  if (enrageReady) ability = enrageReady;

  // Potion ennemie : en danger (lowHp), un consommable disponible est bu en
  // priorité — filet de survie limité par ses charges (par instance).
  if (lowHp) {
    const potion = fired.find(a => a.effect === 'consumable');
    if (potion) ability = potion;
  }

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
      const dmg = Math.max(1, Math.floor((raw - Math.floor((target.def || 0) / 3)) * _resistMult(target)));
      if (shieldTurns[charIdx] > 0) {
        shieldTurns[charIdx]--;
        appendLog(`🛡️ Protego bloque ${ability.name} ! `);
        UX_safe.floatDmg('ally', 0, 'shield');
        UX_safe.logCombat(`🛡️ Protego bloque ${ability.name}.`, 'magic');
      } else {
        target.hp = Math.max(0, target.hp - dmg);
        appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → ${dmg} dégâts sur ${target.name} ! `);
        UX_safe.floatDmg('ally', dmg, 'dmg');
        UX_safe.cardReact(charIdx, 'dmg'); // réaction de carte (K1)
        UX_safe.logCombat(`${ability.icon} ${enemy.name} : ${ability.name} → <b>−${dmg}</b> sur ${target.name}`, 'bad');
      }
      break;
    }
    case 'maxhpdamage': {
      // Broyer — dégâts proportionnels aux PV MAX de la cible, contournant la
      // DEF (levier anti-tank). Borné à `cap × référence` pour découpler la
      // valeur de la progression du joueur. capRef 'hit' = coup normal mitigé
      // (rétrécit quand la DEF joueur monte → amortit le grind) ; 'atk' = ATK
      // brute. Cf. .claude/plans/player-stats-balance.md §4ter.
      const ref = (ability.capRef === 'hit')
        ? mitigatedDamage(enemy.atk, target.def)
        : (enemy.atk || 0);
      let dmg = Math.floor((target.hpMax || target.hp) * (ability.power || 0));
      if (ability.cap > 0) dmg = Math.min(dmg, Math.floor(ability.cap * ref));
      dmg = Math.max(1, dmg);
      if (shieldTurns[charIdx] > 0) {
        shieldTurns[charIdx]--;
        appendLog(`🛡️ Protego bloque ${ability.name} ! `);
        UX_safe.floatDmg('ally', 0, 'shield');
        UX_safe.logCombat(`🛡️ Protego bloque ${ability.name}.`, 'magic');
      } else {
        target.hp = Math.max(0, target.hp - dmg);
        appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → ${dmg} dégâts sur ${target.name} ! `);
        UX_safe.floatDmg('ally', dmg, 'dmg');
        UX_safe.cardReact(charIdx, 'dmg'); // réaction de carte (K1)
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
    case 'consumable': {
      // Potion bue par l'ennemi : soin (ou buff) à charges limitées par
      // instance. `power` = PV rendus ; `buffAtk` (optionnel) = ATK gagnée.
      _enemyPotionConsume(enemy, ability);
      const restored = Math.min(enemy.hp, enemy.currentHp + (ability.power || 0)) - enemy.currentHp;
      enemy.currentHp += restored;
      if (ability.buffAtk) enemy.atk = (enemy.atk || 0) + ability.buffAtk;
      const left = _enemyPotionLeft(enemy, ability);
      const cIdx = enemyGroup.indexOf(enemy);
      const buffTxt = ability.buffAtk ? ` (+${ability.buffAtk} ATK)` : '';
      appendLog(`${ability.icon || '🧪'} ${enemy.name} boit ${ability.name} : +${restored} PV${buffTxt}${left > 0 ? '' : ' (dernière)'} ! `);
      if (restored > 0) UX_safe.floatDmg(`enemy:${cIdx}`, restored, 'heal');
      UX_safe.logCombat(`${ability.icon || '🧪'} ${enemy.name} boit une potion : <b>+${restored} PV</b>${buffTxt}`, 'magic');
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
      const drained = Math.min(target.hp, Math.max(1, Math.floor(ability.power * _resistMult(target))));
      target.hp       = Math.max(0, target.hp - drained);
      enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + Math.floor(drained / 2));
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → draine ${drained} PV de ${target.name} ! `);
      const drainIdx = enemyGroup.indexOf(enemy);
      UX_safe.floatDmg('ally', drained, 'dmg');
      UX_safe.cardReact(charIdx, 'dmg'); // réaction de carte (K1)
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
    // ── Archétypes boss/élites (LOT B3) ──────────────────────────
    case 'summon': {
      // Invoque un add si un slot ennemi est libre. Plafond CONTEXTUEL
      // (currentMaxGroupSize) : 3 hors endgame+duo, MAX_ENEMY_GROUP (5) en
      // endgame+duo — même gating que rollGroupSize. Slot plein → l'ennemi ne
      // gaspille pas son tour (return false → attaque physique dans enemyTurn).
      const _cap = (typeof currentMaxGroupSize === 'function') ? currentMaxGroupSize() : MAX_ENEMY_GROUP;
      if (enemyGroup.length >= _cap) return false;
      const add = _buildSummonedAdd(ability, enemy);
      if (!add) return false;
      enemyGroup.push(add);
      if (add.id && typeof seenMonsters !== 'undefined') seenMonsters.add(add.id);
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${add.name} surgit en renfort ! `);
      UX_safe.logCombat(`${ability.icon} ${enemy.name} invoque <b>${add.name}</b>`, 'bad');
      renderEnemyGroup();
      break;
    }
    case 'enrage_self': {
      // L'ennemi gagne de l'ATK une fois passé sous un seuil de PV. One-shot
      // (flag de combat `_enraged`, non sérialisé). Au-dessus du seuil ou déjà
      // enragé → return false (rien : attaque physique normale).
      const maxHp = enemy.hp || enemy.currentHp || 1;
      const pct   = ability.hpPct || 0.4;
      if (enemy._enraged || enemy.currentHp > maxHp * pct) return false;
      const bonus = ability.atkBonus || Math.max(1, Math.round((enemy.atk || 0) * 0.5));
      enemy.atk = (enemy.atk || 0) + bonus;
      enemy._enraged = true;
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : acculé, il entre en rage (+${bonus} ATK) ! `);
      UX_safe.logCombat(`${ability.icon} ${enemy.name} enrage : <b>+${bonus} ATK</b>`, 'bad');
      renderEnemyGroup();
      break;
    }
    case 'aura': {
      // Taunt/Aura : debuff de groupe persistant appliqué à TOUS les héros
      // vivants, via applyStatus / STATUS_DEFS (réutilisation). Cas `weaken` :
      // réplique la comptabilité DEF (soustraction au cast, restauration à
      // l'expiry par tickStatuses) ; autres statuts : applyStatus simple.
      const sid   = ability.statusId || 'weaken';
      const turns = ability.turns || 3;
      const def   = (typeof STATUS_DEFS !== 'undefined') ? STATUS_DEFS[sid] : null;
      const lbl   = def ? def.label : sid;
      party.slice(0, partySize).forEach(c => {
        if (c.hp <= 0) return;
        if (sid === 'weaken') {
          const lost    = Math.min(ability.power, c.def || 0);
          const applied = applyStatus(c, 'weaken', lost, turns);
          if (applied && lost > 0) c.def = Math.max(0, (c.def || 0) - lost);
        } else {
          applyStatus(c, sid, ability.power || 0, turns);
        }
      });
      appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${lbl} s'abat sur tout le groupe (${turns} tours) ! `);
      UX_safe.logCombat(`${ability.icon} ${enemy.name} : <b>${lbl}</b> de groupe (${turns} tours)`, 'bad');
      break;
    }
  }
  return true;
}

// ── Construction d'un add invoqué (effet `summon`, LOT B3) ───
// Cherche le template `ability.summonId` dans MONSTERS et le met à l'échelle
// de l'étage courant. Fallback : sbire dérivé du summoner (stats réduites).
// L'add est dépouillé de toute capacité `summon` (anti-cascade infinie).
// Pur quant aux globals : ne touche que l'objet add retourné.
function _buildSummonedAdd(ability, summoner) {
  const floor = (typeof currentFloor === 'number' && currentFloor > 0) ? currentFloor : 1;
  let add;
  const template = (typeof MONSTERS !== 'undefined' && Array.isArray(MONSTERS))
    ? MONSTERS.find(m => m.id === ability.summonId) : null;
  if (template && typeof scaleMonster === 'function') {
    add = scaleMonster(template, floor);
  } else {
    // Fallback : minion dérivé du summoner (40 % PV, 60 % ATK).
    add = JSON.parse(JSON.stringify(summoner));
    add.id      = (summoner.id || 'add') + '_spawn';
    add.name    = ability.summonName || ('Sbire de ' + summoner.name);
    add.hp      = Math.max(1, Math.floor((summoner.hp || summoner.currentHp || 10) * 0.4));
    add.atk     = Math.max(1, Math.floor((summoner.atk || 5) * 0.6));
    add.phases  = [];
    add.variant = 'normal';
    delete add.epic;
  }
  // Anti-cascade : un add n'invoque pas à son tour.
  add.abilities    = (add.abilities || []).filter(a => a.effect !== 'summon');
  add.currentHp    = add.hp;
  add.statusEffects = [];
  add._summoned    = true;
  return add;
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

const STATUS_BY_SPELL = { 'Incendio': 'burn', 'Diffindo': 'bleed', 'Sectumsempra': 'bleed', 'Glacius': 'gel',
  // Lot P3 — formes évoluées / Premium héritent du DoT de leur base.
  'Incendio Majeur': 'burn', 'Incendio Royal': 'burn', 'Glacius Profond': 'gel', 'Givre de Rowena': 'gel',
  // Lot P4 — corruption contrôlée : Flamme Dévorante embrase la cible.
  'Flamme Dévorante': 'burn' };

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
  // Lot P4 — Protego Diabolica : arme le renvoi de coups physiques pendant la
  // durée du bouclier (lu par _enemyPhysicalHit). Défensif (champ optionnel).
  if (spell.reflectFrac && typeof _shieldReflect !== 'undefined') {
    _shieldReflect[currentBattleChar] = spell.reflectFrac;
  }
  const msg = `🛡️ ${char.name} : ${spell.name} — bouclier actif ${dur} tours !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🛡️ ${char.name} active Protego (${dur} tours)`, 'magic');
  return msg;
}

// Calcul de dégâts d'un sort offensif : base power + mag/2, modulée par
// les resist/weak de l'ennemi (clé = spell.element), le bonus anti-mort-vivant
// optionnel (opts.undead), puis le critique. `suffix` porte les pictogrammes
// 🔰/💥/☀️/💥CRIT (avec leur espace de tête) pour les messages.
// ── Combos tactiques ────────────────────────────────────────
// Un statut présent sur la cible amplifie le coup entrant, récompensant
// l'enchaînement de sorts/attaques. Première règle qui matche l'emporte.
//   • Cible gelée (gel)   → +30 % (« on brise la glace »), tous éléments.
//   • Cible qui saigne    → +20 % pour les coups physiques (« plaie ouverte »).
// Pur : ne mute rien, retourne { mult, label }.
const COMBO_RULES = [
  { status: 'gel',   element: null,       mult: 1.3, label: '❄️ Éclat de glace' },
  { status: 'bleed', element: 'physique', mult: 1.2, label: '🩸 Plaie ouverte' },
];
function comboDamageMult(target, element) {
  if (!target || !Array.isArray(target.statusEffects)) return { mult: 1, label: null };
  for (const r of COMBO_RULES) {
    if (r.element && r.element !== element) continue;
    if (target.statusEffects.some(s => s.id === r.status)) return { mult: r.mult, label: r.label };
  }
  return { mult: 1, label: null };
}

// Lot P4 — Cœur de Lion (légendaire Gryffondor) : tant que le buff est actif et
// qu'aucun allié vivant-au-départ n'est à terre, les dégâts du groupe ×1.2.
function _houseLionMult() {
  if (typeof lionHeartActive === 'undefined' || !lionHeartActive) return 1;
  if (typeof party === 'undefined' || typeof partySize !== 'number') return 1.2;
  const anyKO = party.slice(0, partySize).some(c => c && c.hp <= 0);
  return anyKO ? 1 : 1.2;
}

function _computeSpellDamage(spell, char, enemy, opts) {
  opts = opts || {};
  let dmg    = spell.power + Math.floor(char.mag / 2);
  // Apothéose : Vigueur (Poufsouffle) + Élan (Gryffondor) — multiplicateurs
  // de dégâts. _houseElanMult lit seulement le cumul ; la mise à jour des
  // paliers (_updateElan) est faite par les handlers offensifs.
  dmg = Math.floor(dmg * _houseVigorMult(char) * _houseElanMult(char) * _houseLionMult());
  // Lot P4 — Pacte du Serpent : double le PROCHAIN sort offensif (consommé ici).
  if (typeof serpentPactDoubleNext !== 'undefined' && serpentPactDoubleNext) {
    dmg = dmg * 2;
    serpentPactDoubleNext = false;
  }
  let suffix = '';
  if (enemy.resist?.includes(spell.element)) { dmg = Math.floor(dmg * RESIST_MULTIPLIER); suffix = ' 🔰'; }
  if (enemy.weak?.includes(spell.element))   { dmg = Math.floor(dmg * WEAK_MULTIPLIER);   suffix = ' 💥'; }
  if (opts.undead && spell.bonusVsUndead && _isUndead(enemy)) {
    dmg = Math.floor(dmg * spell.bonusVsUndead); suffix += ' ☀️';
  }
  // Combo : amplification si la cible porte un statut déclencheur.
  const combo = comboDamageMult(enemy, spell.element);
  if (combo.mult !== 1) { dmg = Math.floor(dmg * combo.mult); suffix += ' ' + combo.label; }
  // P2 — Tenaille (Duo offensif) : focus-fire sur une cible déjà frappée par
  // l'autre héros ce round (+15 %). Marque ensuite la cible. Solo / Phalange → 1.
  if (typeof _duoComboMult === 'function') {
    const eIdx = (typeof enemyGroup !== 'undefined') ? enemyGroup.indexOf(enemy) : -1;
    const hIdx = (typeof party !== 'undefined') ? party.indexOf(char) : -1;
    const tenaille = _duoComboMult(eIdx, hIdx);
    if (tenaille !== 1) { dmg = Math.floor(dmg * tenaille); suffix += ' 🤝'; }
    if (typeof _duoMarkTarget === 'function') _duoMarkTarget(eIdx, hIdx);
  }
  const cr = rollSpellCrit(dmg, char);
  dmg = cr.dmg;
  if (cr.crit) suffix += ' 💥CRIT';
  // Voix des héros — crit de sort (cosmétique, défensif). Cf. js/hero-barks.js.
  if (cr.crit && typeof heroBark === 'function' && char && char.heroKey) heroBark(char.heroKey, 'crit');
  return { dmg, suffix, crit: cr.crit };
}

// Anti-spam Legilimens (cf. .claude/plans/legilimens-rebalance.md) : pas de
// plafond de charges, mais surcoût en PM par relance dans un même combat.
// 1er lancer au prix de base, puis +6 PM par lancer déjà effectué.
const LEGILIMENS_COST_STEP = 6;

// Artefacts (P1) — somme des `bonusElemDmg` de l'équipement du lanceur pour
// l'élément du sort (clé spécifique + clé `tous`). PUR, défensif (saves
// antérieures / char sans equipped → 0). Cf. plan artifacts-reliquary-system.md.
function _artifactElemBonus(char, element) {
  if (!char || !char.equipped || !element) return 0;
  let total = 0;
  for (const item of Object.values(char.equipped)) {
    if (!item || !item.bonusElemDmg) continue;
    const m = item.bonusElemDmg;
    if (typeof m[element] === 'number') total += m[element];
    if (typeof m.tous === 'number')     total += m.tous;
  }
  return total;
}

// Artefacts (P1) — somme des `spCostReduction` de l'équipement du lanceur
// (Cristal de Focalisation…). PUR, défensif. Le plancher de coût (1) est
// appliqué par `_spellSpCost`.
function _artifactSpCostReduction(char) {
  if (!char || !char.equipped) return 0;
  let total = 0;
  for (const item of Object.values(char.equipped)) {
    if (item && typeof item.spCostReduction === 'number') total += item.spCostReduction;
  }
  return total;
}

// Coût en PM effectif d'un sort — réduit de 20 % (arrondi au sup.) par
// l'Apothéose Serdaigle (palier 18 — Esprit de l'Aigle), puis −N PM additif
// par les artefacts (`spCostReduction`). Plancher final : 1 PM. `char`
// optionnel → résolu sur le lanceur actif (getActiveChar).
function _spellSpCost(spell, char) {
  if (char === undefined && typeof getActiveChar === 'function') char = getActiveChar();
  let cost = spell.cost;
  // Legilimens : coût croissant à chaque relance dans le combat courant.
  if (spell.effect === 'legilimens' && typeof legilimensCastsThisFight === 'number') {
    cost += legilimensCastsThisFight * LEGILIMENS_COST_STEP;
  }
  if (typeof houseApotheosePassive === 'function' && houseApotheosePassive() === 'Serdaigle') {
    cost = Math.ceil(cost * 0.8);
  }
  // Affinité de Maison (P2) : −coût pour un sort dont houseAffinity ==
  // chosenHouse, croissant aux paliers Mythe/Apothéose. PUR (houseSpellBoost),
  // power-neutre. Composé multiplicativement avec le −20 % Serdaigle ci-dessus.
  if (typeof houseSpellBoost === 'function' && typeof chosenHouse !== 'undefined') {
    const boost = houseSpellBoost(spell, chosenHouse,
      (typeof houseTier === 'number') ? houseTier : 0);
    if (boost > 0) cost = Math.ceil(cost * (1 - boost));
  }
  cost -= _artifactSpCostReduction(char);
  return Math.max(1, cost);
}

// Apothéose Serpentard (palier 18 — Soif du Serpent) : draine 15 % des
// dégâts d'un sort offensif en PV pour le lanceur. Retourne le soin
// effectif (0 si le passif est inactif ou le lanceur déjà au max).
function _applySerpentLifesteal(char, dmg) {
  // Source 1 : Apothéose Serpentard (Soif du Serpent). Source 2 : Pacte des
  // Cachots honoré au combat final (slythPactBuff, signature Serpentard).
  const apo  = (typeof houseApotheosePassive === 'function') && houseApotheosePassive() === 'Serpentard';
  const pact = (typeof slythPactBuff !== 'undefined') && slythPactBuff;
  if (!apo && !pact) return 0;
  if (!char || dmg <= 0) return 0;
  const heal = Math.min(char.hpMax - char.hp, Math.max(1, Math.floor(dmg * 0.15)));
  if (heal > 0) { char.hp += heal; UX_safe.floatDmg('ally', heal, 'heal'); }
  return heal;
}

function _spellElementalDamage(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    let { dmg, suffix, crit } = _computeSpellDamage(spell, char, enemy, { undead: true });
    // Artefacts (P1) — Orbe/Cristal : +% dégâts élémentaires (additif, après
    // résist/faiblesse/crit). Aucun effet si le lanceur n'en porte pas.
    const elemBonus = _artifactElemBonus(char, spell.element);
    if (elemBonus > 0) { dmg = Math.floor(dmg * (1 + elemBonus)); suffix += ' 🔆'; }
    // Environnement (P4) — charge runique ambiante (zone D) : +% feu/foudre.
    // Additif, même pipeline. Défensif (hors zone runique → 0).
    const envBonus = (typeof _envElemBonus === 'function') ? _envElemBonus(spell.element) : 0;
    if (envBonus > 0) { dmg = Math.floor(dmg * (1 + envBonus)); suffix += ' 🪨'; }
    enemy.currentHp -= dmg;
    // Accent SFX : crit prioritaire, sinon faiblesse élémentaire touchée.
    if (typeof AudioSystem !== 'undefined') {
      if (crit && AudioSystem.playCrit) AudioSystem.playCrit();
      else if (enemy.weak?.includes(spell.element) && AudioSystem.playWeakHit) AudioSystem.playWeakHit();
    }
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
  // Synergie Orbe Runique de Godric (P1) : +1 tour de bouclier & dissipe aussi
  // l'affaiblissement (weaken). Riders lus défensivement sur la forme résolue.
  const dur = 2 + (spell.shieldTurnsBonus || 0);
  const cleanseIds = spell.dispelWeaken ? ['stun', 'fear', 'weaken'] : ['stun', 'fear'];
  party.slice(0, partySize).forEach((c, idx) => {
    if (c.hp <= 0) return;
    shieldTurns[idx] = Math.max(shieldTurns[idx] || 0, dur);
    if (c.statusEffects) {
      c.statusEffects = c.statusEffects.filter(s => !cleanseIds.includes(s.id));
    }
  });
  UX_safe.floatDmg('ally', 0, 'shield');
  const tag = spell._synergy ? ' 🔗' : '';
  const msg = `🦌 ${char.name} : ${spell.name} — un Patronus enveloppe tout le groupe (bouclier ${dur} tours)${tag} !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🦌 ${char.name} invoque ${spell.name} — bouclier de groupe${tag}`, 'magic');
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
      // Synergie Masque Rituel de Salazar (P1) : bleed +1 palier de durée.
      const dotPower  = Math.max(3, Math.floor(spell.power * 0.4));
      const bleedTurns = 3 + (spell.bleedTurnsBonus || 0);
      applyStatus(enemy, 'bleed', dotPower, bleedTurns);
      applyStatus(enemy, 'imperius', 0, 2);
    }
    // Synergie : vol de vie du coup (×1,5 de la Soif du Serpent ≈ 22,5 %).
    let drainTxt = '';
    if (spell.synergyLifestealFrac && dmg > 0) {
      const heal = Math.min(char.hpMax - char.hp, Math.max(1, Math.floor(dmg * spell.synergyLifestealFrac)));
      if (heal > 0) { char.hp += heal; UX_safe.floatDmg('ally', heal, 'heal'); drainTxt = ` 🩸 +${heal} PV drainés`; }
    }
    const tag = spell._synergy ? ' 🔗' : '';
    msg = `🩸 ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} — ${enemy.name} saigne et tombe sous l'Imperium${tag} !${drainTxt}`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, suffix.includes('💥') ? 'crit' : 'dmg');
    UX_safe.logCombat(`🩸 ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix} · ${enemy.name} asservi 2 tours${tag}`, 'magic');
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
  // Synergie Bâton Ancestral de Rowena (P1) : annule 2 capacités au lieu d'1,
  // sans surcoût d'incrément (ce lancer n'enchérit pas les suivants).
  const cancels = 1 + (spell.cancelChargesBonus || 0);
  legilimensCancelCharges += cancels;
  if (!spell.noCostEscalation) legilimensCastsThisFight += 1;   // enchérit le prochain lancer ce combat
  const tag = spell._synergy ? ' 🔗' : '';
  const cancelTxt = cancels > 1
    ? `les ${cancels} prochaines capacités seront annulées`
    : 'la prochaine capacité sera annulée';
  const msg = `👁️ ${char.name} : ${spell.name} — l'esprit ennemi est lu ; ${cancelTxt}.${tag}`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`👁️ ${char.name} lance ${spell.name}${tag}`, 'magic');
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
  // Synergie Talisman de Helga (P1) : purge aussi les afflictions DoT du groupe.
  const dotIds = ['burn', 'poison', 'bleed', 'gel'];
  party.slice(0, partySize).forEach(c => {
    if (c.hp <= 0) return;
    c.hp = c.hpMax;
    c.sp = c.spMax;
    if (spell.cleanseDot && Array.isArray(c.statusEffects)) {
      c.statusEffects = c.statusEffects.filter(s => !dotIds.includes(s.id));
    }
  });
  recolteGoldBonus = true;
  UX_safe.floatDmg('ally', 0, 'heal');
  const tag = spell._synergy ? ' 🔗' : '';
  const msg = `🌾 ${char.name} : ${spell.name} — le groupe est revigoré${spell.cleanseDot ? ' et purifié' : ''} ; les Gallions du combat sont majorés (+50%)${tag} !`;
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

// ── Sorts & Magie 2.0 — Lot P2 (combat) ──────────────────────
// Éclat de Voûte (rituel d'Éclats) — projectile de scellement. La gate
// `requiresEclats` (castSpellInBattle) garantit ≥ 2 Éclats AVANT le débit PM,
// donc ici on relit eclatProgress() seulement pour la montée en puissance :
// dégâts ×(1 + 0,25·Éclats). Les sorts ignorant déjà la DEF (cf.
// _computeSpellDamage), le rider « ignore 30 % DEF » du plan est sans objet —
// la signature du sort est la mise à l'échelle par les Éclats.
function _spellEclatBolt(spell, char, enemy, targetIdx) {
  const eclats = (typeof eclatProgress === 'function') ? Math.max(0, eclatProgress()) : 0;
  let msg = '';
  if (enemy) {
    let { dmg, suffix, crit } = _computeSpellDamage(spell, char, enemy, { undead: true });
    dmg = Math.floor(dmg * (1 + 0.25 * eclats));
    enemy.currentHp -= dmg;
    _updateElan(char, crit);   // Apothéose Gryffondor — Élan
    msg = `💠 ${char.name} : ${spell.name} → ${dmg} dégâts${suffix} de scellement sur ${enemy.name} (${eclats} Éclats) !`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, suffix.includes('💥') ? 'crit' : 'dmg');
    UX_safe.logCombat(`💠 ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix} sur ${enemy.name}`, 'magic');
  }
  addMsg(msg, 'magic');
  return msg;
}

// Sceau des Quatre (rituel d'Éclats) — bouclier de groupe 2 tours + dissipe la
// peur (immunité 1 tour). Réutilise shieldTurns et le nettoyage de statuts de
// Patronus Maxima. Gate 3 Éclats assurée par requiresEclats (castSpellInBattle).
function _spellSealShield(spell, char) {
  party.slice(0, partySize).forEach((c, idx) => {
    if (c.hp <= 0) return;
    shieldTurns[idx] = Math.max(shieldTurns[idx] || 0, 2);
    if (Array.isArray(c.statusEffects)) {
      c.statusEffects = c.statusEffects.filter(s => s.id !== 'fear' && s.id !== 'stun');
    }
  });
  UX_safe.floatDmg('ally', 0, 'shield');
  const msg = `🛡️ ${char.name} : ${spell.name} — le sceau des Fondateurs enveloppe le groupe (bouclier 2 tours, peur dissipée) !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🛡️ ${char.name} dresse ${spell.name} — bouclier de groupe`, 'magic');
  return msg;
}

// Avis Praesidium (familier) — coup immédiat + enregistrement d'un familier
// combat-scoped (combatFamiliars) qui frappe un ennemi à chaque round suivant
// (tickFamiliars dans battle.js), 3 tours. Pas de sérialisation (combat-scoped).
function _spellSummonAlly(spell, char, enemy, targetIdx) {
  const atk = Math.max(4, (spell.power || 0) + Math.floor((char.mag || 0) / 4));
  const tgt = (enemy && enemy.currentHp > 0) ? enemy : (livingEnemies()[0] || null);
  let msg;
  if (tgt) {
    const dmg = Math.max(1, mitigatedDamage(atk, tgt.def || 0));
    tgt.currentHp -= dmg;
    UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(tgt)}`, dmg, 'dmg');
    msg = `🦉 ${char.name} : ${spell.name} — un familier fond sur ${tgt.name} (−${dmg}) et veille 3 tours !`;
    UX_safe.logCombat(`🦉 ${char.name} invoque un familier — ${tgt.name} <b>−${dmg}</b>`, 'magic');
  } else {
    msg = `🦉 ${char.name} : ${spell.name} — un familier prend son envol au-dessus du groupe.`;
  }
  if (typeof combatFamiliars !== 'undefined' && Array.isArray(combatFamiliars)) {
    combatFamiliars.push({ ownerName: char.name, atk, turns: 3, icon: '🦉' });
  }
  addMsg(msg, 'magic');
  return msg;
}

// Patronus Corporel (familier défensif) — pose une Garde de groupe (mitigation
// 50 %, 2 paliers via guardTurns) + chasse la peur. Forme cosmétique du
// Patronus par héros (HERO_PATRONUS), aucun impact mécanique.
function _spellPatronusCorporel(spell, char) {
  const form = (typeof HERO_PATRONUS !== 'undefined' && char && char.heroKey && HERO_PATRONUS[char.heroKey])
    ? HERO_PATRONUS[char.heroKey] : 'Patronus';
  party.slice(0, partySize).forEach((c, idx) => {
    if (c.hp <= 0) return;
    guardTurns[idx] = Math.min(3, Math.max(guardTurns[idx] || 0, 2));
    if (Array.isArray(c.statusEffects)) {
      c.statusEffects = c.statusEffects.filter(s => s.id !== 'fear' && s.id !== 'stun');
    }
  });
  UX_safe.floatDmg('ally', 0, 'shield');
  const msg = `🦌 ${char.name} : ${spell.name} — un ${form} corporel veille sur le groupe (mitigation 2 tours, peur chassée) !`;
  addMsg(msg, 'magic');
  UX_safe.logCombat(`🦌 ${char.name} invoque un ${form} corporel`, 'magic');
  return msg;
}

// ── Sorts & Magie 2.0 — Lot P4 (corruption / temporels / légendaires) ──

// Applique le contrecoup de corruption (impur — mute char / corruptionLevel /
// statuts). Consomme le résolveur PUR resolveCorruptionBacklash (data.js).
// Réversible / non-bloquant : un selfdmg ne descend JAMAIS le perso sous 1 PV.
function _applyCorruptionBacklash(spell, char) {
  if (!char || typeof resolveCorruptionBacklash !== 'function') return '';
  const r = resolveCorruptionBacklash(spell.backlash, char);
  if (r.kind === 'selfdmg') {
    const loss = Math.min(r.hpLoss, Math.max(0, char.hp - 1));
    char.hp = Math.max(1, char.hp - r.hpLoss);
    UX_safe.floatDmg('ally', loss, 'dmg');
    CFX_safe.shake('light');
    const m = `🌑 La corruption se retourne contre ${char.name} : −${loss} PV !`;
    addMsg(m, 'bad'); UX_safe.logCombat(m, 'bad');
    return m;
  }
  if (r.kind === 'status') {
    applyStatus(char, r.statusId, r.statusPower, r.statusTurns);
    const def = (typeof STATUS_DEFS !== 'undefined' && STATUS_DEFS[r.statusId]) || { icon: '🌑', label: r.statusId };
    const m = `🌑 Contrecoup : ${char.name} subit ${def.icon} ${def.label} !`;
    addMsg(m, 'bad'); UX_safe.logCombat(m, 'bad');
    return m;
  }
  // counter — montée du compteur de corruption (levier de style endgame).
  if (typeof spellCorruption === 'number') spellCorruption += (r.corruptionInc || 1);
  if (typeof heroBark === 'function' && char.heroKey) heroBark(char.heroKey, 'bossAppear');
  const m = `🌑 La corruption s'épaissit autour du groupe… (niveau ${spellCorruption})`;
  addMsg(m, 'magic'); UX_safe.logCombat(m, 'magic');
  return m;
}

// Venin du Cachot (Serpentard, corrompu) — vol de vie + poison empilable.
function _spellVenom(spell, char, enemy, targetIdx) {
  let msg = '';
  if (enemy) {
    const { dmg, suffix, crit } = _computeSpellDamage(spell, char, enemy);
    enemy.currentHp -= dmg;
    _updateElan(char, crit);
    const heal = Math.floor(dmg / 2);
    char.hp = Math.min(char.hpMax, char.hp + heal);
    if (enemy.currentHp > 0) {
      const dotPower = Math.max(2, Math.floor(spell.power * 0.2));
      applyStatus(enemy, 'poison', dotPower, 3);
    }
    msg = `🐍 ${char.name} : ${spell.name} → ${dmg} dégâts${suffix}, +${heal} PV drainés, ${enemy.name} empoisonné !`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, dmg, suffix.includes('💥') ? 'crit' : 'dmg');
    UX_safe.floatDmg('ally', heal, 'heal');
    UX_safe.logCombat(`🐍 ${char.name} : ${spell.name} → <b>−${dmg}</b>${suffix}, <b>+${heal} PV</b> · 🧪 poison`, 'magic');
  }
  addMsg(msg, 'magic');
  return msg;
}

// Fardeau Partagé (Poufsouffle, corrompu) — redistribue les PV du groupe :
// chaque membre vivant tend vers la PV moyenne (les forts donnent aux faibles),
// + un petit soin de base. Solo : soin simple. Réutilise hpMax comme plafond.
function _spellShareBurden(spell, char) {
  const allies = party.slice(0, partySize).filter(c => c.hp > 0);
  if (allies.length <= 1) {
    const burst = Math.min(char.hpMax - char.hp, 10 + Math.floor((char.mag || 0) / 3));
    char.hp += Math.max(0, burst);
    UX_safe.floatDmg('ally', Math.max(0, burst), 'heal');
    const m = `🦡 ${char.name} : ${spell.name} — réconfort partagé (+${Math.max(0, burst)} PV).`;
    addMsg(m, 'good'); UX_safe.logCombat(m, 'good');
    return m;
  }
  const avg = Math.floor(allies.reduce((s, c) => s + c.hp / c.hpMax, 0) / allies.length * 100); // % moyen
  allies.forEach(c => { c.hp = Math.min(c.hpMax, Math.max(c.hp, Math.floor(c.hpMax * avg / 100))); });
  UX_safe.floatDmg('ally', 0, 'heal');
  const m = `🦡 ${char.name} : ${spell.name} — le fardeau est partagé ; le groupe se stabilise à ${avg}% PV.`;
  addMsg(m, 'good'); UX_safe.logCombat(m, 'good');
  return m;
}

// Tempus Echo (rituel) — rejoue gratuitement le dernier sort offensif du
// lanceur ce combat. Le débit PM/garde 1×/combat est géré par castSpellInBattle.
function _spellTempusEcho(spell, char) {
  const lastName = (typeof _lastCastSpellByChar !== 'undefined') ? _lastCastSpellByChar[currentBattleChar] : null;
  const replay = lastName ? SPELLS.find(s => s.name === lastName) : null;
  if (!replay || !SPELL_HANDLERS[replay.effect]) {
    const m = `⏳ ${char.name} : ${spell.name} — aucun écho de sort à rejouer.`;
    addMsg(m, 'bad'); return m;
  }
  const tgt = (typeof livingEnemies === 'function') ? (livingEnemies()[0] || null) : null;
  const ti  = tgt ? enemyGroup.indexOf(tgt) : 0;
  addMsg(`⏳ ${char.name} : ${spell.name} — le temps se replie ; ${replay.name} retentit à nouveau !`, 'magic');
  UX_safe.logCombat(`⏳ ${char.name} rejoue ${replay.name} (Tempus Echo)`, 'magic');
  return SPELL_HANDLERS[replay.effect](replay, char, tgt, ti) || '';
}

// Reliquae Temporis (corrompu) — restaure PV/PM du groupe au snapshot de début
// de round (_timeSnapshot, posé par enemyTurn). Garde 1×/combat (castSpellInBattle).
function _spellTimeRewind(spell, char) {
  if (typeof _timeSnapshot === 'undefined' || !Array.isArray(_timeSnapshot)) {
    const m = `🕰️ ${char.name} : ${spell.name} — le fil du temps n'offre aucun ancrage.`;
    addMsg(m, 'bad'); return m;
  }
  party.slice(0, partySize).forEach((c, i) => {
    const snap = _timeSnapshot[i];
    if (!snap || c.hp <= 0) return;
    c.hp = Math.min(c.hpMax, Math.max(c.hp, snap.hp));
    c.sp = Math.min(c.spMax, Math.max(c.sp, snap.sp));
  });
  UX_safe.floatDmg('ally', 0, 'heal');
  const m = `🕰️ ${char.name} : ${spell.name} — le groupe retrouve ses forces du début du round !`;
  addMsg(m, 'good'); UX_safe.logCombat(`🕰️ ${char.name} retourne le sablier (PV/PM restaurés)`, 'good');
  return m;
}

// Écho Fantôme (corrompu) — invoque un écho astral du lanceur sous forme de
// familier (réutilise combatFamiliars/tickFamiliars, P2) qui frappe 2 tours.
// NB : buildEcho (dungeon-scaling) produit un ENNEMI scalé — inadapté à un allié ;
// le mécanisme combatFamiliars EST l'abstraction « allié qui frappe N tours ».
function _spellEchoSelf(spell, char, enemy, targetIdx) {
  const atk = Math.max(6, (char.atk || 0) + Math.floor((char.mag || 0) / 2));
  const tgt = (enemy && enemy.currentHp > 0) ? enemy : (livingEnemies()[0] || null);
  let msg;
  if (tgt) {
    const dmg = Math.max(1, mitigatedDamage(atk, tgt.def || 0));
    tgt.currentHp -= dmg;
    UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(tgt)}`, dmg, 'dmg');
    msg = `👻 ${char.name} : ${spell.name} — un écho fantôme fond sur ${tgt.name} (−${dmg}) et hante le combat 2 tours !`;
    UX_safe.logCombat(`👻 Écho de ${char.name} → ${tgt.name} : <b>−${dmg}</b>`, 'magic');
  } else {
    msg = `👻 ${char.name} : ${spell.name} — un écho fantôme se matérialise.`;
  }
  if (typeof combatFamiliars !== 'undefined' && Array.isArray(combatFamiliars)) {
    combatFamiliars.push({ ownerName: char.name, atk, turns: 2, icon: '👻' });
  }
  addMsg(msg, 'magic');
  return msg;
}

// Cœur de Lion (légendaire Gryffondor) — buff de groupe : dégâts ↑ (×1.2 tant
// qu'aucun allié à terre, _houseLionMult) + dissipe la peur sur tout le groupe.
function _spellLionHeart(spell, char) {
  if (typeof lionHeartActive !== 'undefined') lionHeartActive = true;
  party.slice(0, partySize).forEach(c => {
    if (c.hp <= 0 || !Array.isArray(c.statusEffects)) return;
    c.statusEffects = c.statusEffects.filter(s => s.id !== 'fear');
  });
  CFX_safe.buffAura('ally');
  const m = `🦁 ${char.name} : ${spell.name} — un rugissement galvanise le groupe (dégâts ↑, peur dissipée) !`;
  addMsg(m, 'magic'); UX_safe.logCombat(`🦁 ${char.name} invoque ${spell.name} — buff de groupe`, 'good');
  return m;
}

// Pacte du Serpent (légendaire Serpentard) — sacrifie 15 % des PV max du lanceur
// pour doubler son PROCHAIN sort offensif (serpentPactDoubleNext, consommé dans
// _computeSpellDamage). Plancher 1 PV (jamais de game-over).
function _spellSerpentPact(spell, char) {
  const cost = Math.floor(char.hpMax * 0.15);
  char.hp = Math.max(1, char.hp - cost);
  if (typeof serpentPactDoubleNext !== 'undefined') serpentPactDoubleNext = true;
  UX_safe.floatDmg('ally', cost, 'dmg');
  const m = `🐍 ${char.name} : ${spell.name} — le sang scelle le pacte (−${cost} PV) ; le prochain sort offensif frappera deux fois !`;
  addMsg(m, 'magic'); UX_safe.logCombat(`🐍 ${char.name} scelle le Pacte du Serpent`, 'magic');
  return m;
}

// Verbe de Rowena (légendaire Serdaigle) — chœur de savoir : chaque allié vivant
// frappe TOUS les ennemis (dégâts fonction de la MAG de chaque allié). Plus fort
// en duo (équilibrage assumé §1.9). Pas de crit (chœur), pas de DoT.
function _spellRowenaVerb(spell, char) {
  const allies = party.slice(0, partySize).filter(c => c.hp > 0);
  let msg = `🦅 ${char.name} : ${spell.name} —`;
  allies.forEach(a => {
    const base = spell.power + Math.floor((a.mag || 0) / 2);
    livingEnemies().forEach(e => {
      const { dmg, suffix } = _aoeHit(spell, a, e, base);
      UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(e)}`, dmg, 'dmg');
      msg += ` ${e.name} −${dmg}${suffix}`;
    });
  });
  UX_safe.logCombat(`🦅 ${char.name} : ${spell.name} — le chœur de Rowena déferle`, 'magic');
  addMsg(msg, 'magic');
  return msg;
}

// Serment du Blaireau (légendaire Poufsouffle) — relève un allié KO à 30 % PV
// (1×/combat — garde dans castSpellInBattle). Solo : petit soin du lanceur.
function _spellBadgerOath(spell, char) {
  const ko = party.slice(0, partySize).find(c => c.hp <= 0);
  if (ko) {
    ko.hp = Math.max(1, Math.floor(ko.hpMax * 0.30));
    if (Array.isArray(ko.statusEffects)) ko.statusEffects = [];
    UX_safe.floatDmg('ally', ko.hp, 'heal');
    const m = `🦡 ${char.name} : ${spell.name} — ${ko.name} se relève (${ko.hp} PV) ; on ne laisse personne derrière !`;
    addMsg(m, 'good'); UX_safe.logCombat(`🦡 ${char.name} relève ${ko.name}`, 'good');
    return m;
  }
  const burst = Math.min(char.hpMax - char.hp, 12 + Math.floor((char.end || 0) / 3));
  char.hp += Math.max(0, burst);
  UX_safe.floatDmg('ally', Math.max(0, burst), 'heal');
  const m = `🦡 ${char.name} : ${spell.name} — nul allié à terre ; le serment réconforte (+${Math.max(0, burst)} PV).`;
  addMsg(m, 'good'); UX_safe.logCombat(m, 'good');
  return m;
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
  // Lot P2 — Éclats / familiers (combat).
  eclat_bolt:        _spellEclatBolt,
  seal_shield:       _spellSealShield,
  summon_ally:       _spellSummonAlly,
  patronus_corporel: _spellPatronusCorporel,
  // Lot P4 — corruption / temporels / légendaires.
  venom_drain:       _spellVenom,
  share_burden:      _spellShareBurden,
  tempus_echo:       _spellTempusEcho,
  time_rewind:       _spellTimeRewind,
  echo_self:         _spellEchoSelf,
  lion_heart:        _spellLionHeart,
  serpent_pact:      _spellSerpentPact,
  rowena_verb:       _spellRowenaVerb,
  badger_oath:       _spellBadgerOath,
};

// Sorts à cible alliée — pas de sélection d'ennemi, mais éventuellement
// une sélection d'allié en duo (résolue par showAllyTargetSelection).
const ALLY_TARGET_EFFECTS = new Set(['support_regen']);

// Bibliothèque interdite (endgame Tranche 2) — renvoie une copie augmentée
// du sort en appliquant le `spellUpgrades` du caster. C3b : deux voies,
// verrouillées au 1ᵉʳ upgrade (`char.spellPaths[name]`) :
//   - 'power' (défaut/legacy)  → power +2 × level
//   - 'focus'                  → cost −1 × level (plancher 1)
//                                + chance +0.05 × level (cap 0.50, sorts à statut)
// Cas legacy : une entrée upgradée AVANT C3b (pas de spellPaths) conserve la
// formule combinée d'origine (power+2 / cost−1 / chance+0.05) — pas de nerf.
// Si le caster n'a pas d'upgrade sur ce sort, retourne le sort tel quel.
// Voir ENDGAME_PLAN.md §7.6 + js/library.js + .claude/plans/library-spell-axis-c3b.md.
function _spellForCaster(spell, char) {
  if (!spell || !char) return spell;
  const ups = char.spellUpgrades;
  if (!ups) return spell;
  const lvl = (ups[spell.name] | 0);
  if (lvl <= 0) return spell;
  const path = char.spellPaths && char.spellPaths[spell.name];
  const out = { ...spell };
  const applyPower = () => {
    if (typeof spell.power === 'number') out.power = spell.power + 2 * lvl;
  };
  const applyFocus = () => {
    if (typeof spell.cost  === 'number') out.cost  = Math.max(1, spell.cost - lvl);
    if (typeof spell.chance === 'number') out.chance = Math.min(0.5, spell.chance + 0.05 * lvl);
  };
  if (path === 'power')      applyPower();
  else if (path === 'focus') applyFocus();
  else { applyPower(); applyFocus(); }  // legacy combiné (sans spellPaths)
  return out;
}
window._spellForCaster = _spellForCaster;

function castSpellInBattle(spellName, targetIdx, targetAllyIdx) {
  const char     = getActiveChar();
  const baseSpell = SPELLS.find(s => s.name === spellName);
  // Forme EFFECTIVE (P3 évolution réversible : Incendio→Incendio Majeur si le
  // Bâton ancestral est équipé ; P1 surcharge signature par artefact Premium).
  // resolveSpellForm renvoie la base si aucune condition n'est remplie.
  const formSpell = (typeof resolveSpellForm === 'function')
    ? (resolveSpellForm(spellName, char) || baseSpell) : baseSpell;
  // Wrapping Bibliothèque : applique les upgrades du caster. `let` : P4 clone
  // et majore le power des sorts corrompus selon corruptionLevel (plus bas).
  let spell      = _spellForCaster(formSpell, char);
  if (!spell || char.sp < _spellSpCost(spell)) { addMsg("Pas assez de magie !", 'bad'); return; }

  // P2 — sorts d'Éclats : refus AVANT débit PM / consommation de tour si le
  // joueur n'a pas assez d'Éclats de la Clé de Voûte (eclatProgress réutilisé).
  if (spell.requiresEclats) {
    const have = (typeof eclatProgress === 'function') ? eclatProgress() : 0;
    if (have < spell.requiresEclats) {
      addMsg(`${spell.name} exige ${spell.requiresEclats} Éclat${spell.requiresEclats > 1 ? 's' : ''} de la Clé de Voûte (tu en as ${have}).`, 'bad');
      return;
    }
  }

  // P4 — gate Boucle des sorts corrompus DANGEREUX (corruptionRisk>0) : refus
  // AVANT débit PM (modèle requiresEclats). Les corrompus legacy (Avada.../
  // Fiendfyre, corruptionRisk 0) ne passent JAMAIS par cette gate.
  if (spell.tier === 'corrompu' && (spell.corruptionRisk || 0) > 0
      && typeof corruptSpellGateOpen === 'function') {
    const eff = (typeof effectiveFloor === 'function' && typeof currentFloor === 'number')
                ? effectiveFloor(currentFloor) : (typeof currentFloor === 'number' ? currentFloor : 0);
    const vic = (typeof victoryAchieved !== 'undefined') && victoryAchieved;
    if (!corruptSpellGateOpen(currentFloor, vic, eff)) {
      addMsg(`${spell.name} ne peut être canalisé que dans la Boucle Ténébreuse — la magie corrompue refuse de s'éveiller ici.`, 'bad');
      return;
    }
  }

  // P4 — garde-fous 1×/combat (refus AVANT débit PM, modèle Portus).
  if (spell.effect === 'echo_self' && typeof echoSpellUsedThisFight !== 'undefined' && echoSpellUsedThisFight) {
    addMsg('Écho Fantôme déjà invoqué dans ce combat.', 'bad'); return;
  }
  if ((spell.effect === 'tempus_echo' || spell.effect === 'time_rewind')
      && typeof timeRewindUsedThisFight !== 'undefined' && timeRewindUsedThisFight) {
    addMsg('La trame temporelle a déjà été pliée dans ce combat.', 'bad'); return;
  }
  if (spell.effect === 'badger_oath' && typeof badgerOathUsedThisFight !== 'undefined' && badgerOathUsedThisFight) {
    addMsg('Le Serment du Blaireau a déjà été honoré dans ce combat.', 'bad'); return;
  }

  // P4 — corruption : majore le power des sorts corrompus selon corruptionLevel
  // (clone DÉFENSIF — ne JAMAIS muter le registre SPELLS). Power-only.
  if (spell.tier === 'corrompu' && typeof spell.power === 'number'
      && typeof corruptionSpellModifier === 'function'
      && typeof spellCorruption === 'number' && spellCorruption > 0) {
    const f = corruptionSpellModifier(spellCorruption);
    if (f > 0) spell = { ...spell, power: Math.round(spell.power * (1 + f)) };
  }

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
  // P4 — staminaCost (❓2) : toll de PV des rituels lourds (Reliquae Temporis,
  // Le Mot du Dormeur). Pas de 2ᵉ jauge ; planché à 1 PV (jamais de game-over).
  if (typeof spell.staminaCost === 'number' && spell.staminaCost > 0) {
    const toll = Math.min(spell.staminaCost, Math.max(0, char.hp - 1));
    char.hp = Math.max(1, char.hp - spell.staminaCost);
    if (toll > 0) UX_safe.floatDmg('ally', toll, 'dmg');
  }
  AudioSystem.playSpellCast(spellName);
  AudioSystem.speakSpell(spellName);
  if (typeof HAPTICS_safe !== 'undefined') HAPTICS_safe.cast(); // N2
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

  // P4 — mémorise le dernier sort OFFENSIF du lanceur (Tempus Echo le rejoue).
  // Les effets de soutien/temporels ne sont pas mémorisés (rien à rejouer).
  if (typeof _lastCastSpellByChar !== 'undefined') {
    const _offensive = new Set(['stun', 'burn', 'instant', 'lifesteal', 'curse', 'imperius',
      'eclat_bolt', 'venom_drain', 'aoe_wave', 'aoe_field', 'aoe_chain', 'aoe_drain', 'aoe_cleave']);
    if (_offensive.has(spell.effect)) _lastCastSpellByChar[currentBattleChar] = spell.name;
  }
  // P4 — garde-fous 1×/combat : marque l'usage après un lancement réussi.
  if (spell.effect === 'echo_self'   && typeof echoSpellUsedThisFight  !== 'undefined') echoSpellUsedThisFight  = true;
  if ((spell.effect === 'tempus_echo' || spell.effect === 'time_rewind')
      && typeof timeRewindUsedThisFight !== 'undefined') timeRewindUsedThisFight = true;
  if (spell.effect === 'badger_oath' && typeof badgerOathUsedThisFight !== 'undefined') badgerOathUsedThisFight = true;

  // P4 — contrecoup de corruption (❓5) : APRÈS l'effet, proba = corruptionRisk
  // (majoré par corruptionLevel via corruptionSpellModifier, cap 0.95).
  if ((spell.corruptionRisk || 0) > 0) {
    let risk = spell.corruptionRisk;
    if (typeof corruptionSpellModifier === 'function' && typeof spellCorruption === 'number') {
      risk = Math.min(0.95, risk + corruptionSpellModifier(spellCorruption));
    }
    if (Math.random() < risk) {
      const bm = _applyCorruptionBacklash(spell, char);
      if (bm) msg += ' ' + bm;
    }
  }

  // Immersion (Lot 1) : VFX élémentaire sur la/les cible(s). Purement visuel
  // (CFX_safe → no-op si le module FX manque). Gardé aux effets offensifs ;
  // les AoE éclatent sur chaque ennemi vivant.
  {
    const _el = spell.element || 'physique';
    const _aoe = new Set(['aoe_wave', 'aoe_field', 'aoe_chain', 'aoe_drain', 'aoe_cleave']);
    const _single = new Set(['stun', 'burn', 'instant', 'lifesteal', 'curse', 'imperius', 'eclat_bolt', 'summon_ally', 'venom_drain', 'echo_self']);
    const _heal = new Set(['heal', 'support_regen', 'support_regen_aoe', 'heal_aoe']);
    const _buff = new Set(['shield', 'patronus_maxima', 'seal_shield', 'patronus_corporel']);
    // G2 — feedback côté lanceur : le sort « émane » du personnage actif
    // avant d'éclater sur la cible. Halo teinté élément à l'ancre 'ally'.
    CFX_safe.castFlash('ally', _el);
    if (_aoe.has(spell.effect) && typeof livingEnemies === 'function') {
      livingEnemies().forEach(e => CFX_safe.spellBurst(`enemy:${enemyGroup.indexOf(e)}`, _el));
    } else if (_single.has(spell.effect)) {
      const _ti = (targetIdx >= 0) ? targetIdx : enemyGroup.indexOf(enemy);
      if (_ti >= 0) CFX_safe.spellBurst(`enemy:${_ti}`, _el);
    } else if (_heal.has(spell.effect)) {
      CFX_safe.healBurst('ally'); // B1 — gerbe verte de soin
    } else if (_buff.has(spell.effect)) {
      CFX_safe.buffAura('ally');  // B1 — halo doré de protection
    }
    // P4 — splash key-art dédié (si le sort en possède un). Composité sur la
    // cible (héros pour soin/buff, ennemi sinon) en complément du FX procédural.
    const _splashSrc = (typeof spellSplashSrc === 'function') ? spellSplashSrc(spell.name) : null;
    if (_splashSrc) {
      const _isAllyFx = _heal.has(spell.effect) || _buff.has(spell.effect);
      const _st = _isAllyFx
        ? 'ally'
        : `enemy:${(targetIdx >= 0) ? targetIdx : enemyGroup.indexOf(enemy)}`;
      CFX_safe.spellSplash(_st, _splashSrc);
    }
    // Crit de sort (suffixe 💥CRIT dans le message) → secousse légère.
    if (typeof msg === 'string' && msg.indexOf('CRIT') >= 0) CFX_safe.shake('light');
    // P3 — fioriture Premium : un sort de Maison Premium ajoute un halo teinté
    // côté lanceur (premiumFx/tint). Purement cosmétique, défensif.
    if (spell.premium) { CFX_safe.buffAura('ally'); CFX_safe.castFlash('ally', _el); }
  }

  setBattleLog(msg);
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

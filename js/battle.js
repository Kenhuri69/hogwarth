// ============================================================
// SYSTÈME DE COMBAT — GROUPE vs GROUPE (1-3 ennemis)
// ============================================================
// Helpers d'état, système de statuts, boucle de combat (startBattle,
// battleAction, enemyTurn, doFlee). Fin de combat + level-up :
// battle-rewards.js (chargé après). Mort + combat astral : battle-death.js.

// ── Helpers d'état ──────────────────────────────────────────
function getActiveChar()       { return party[currentBattleChar]; }
function getFirstLivingEnemy() { return enemyGroup.findIndex(e => e.currentHp > 0); }
function livingEnemies()       { return enemyGroup.filter(e => e.currentHp > 0); }
function allPartyKO()          { return activeParty().every(c => c.hp <= 0); }

// Dégât atténué par la DEF avec plancher (cf. DIFFICULTY_STUDY.md §4 levier B).
// Conserve la soustraction `rawAtk − def` tant qu'elle dépasse 25 % de l'ATK
// brute ; en deçà, le coup inflige ce plancher. Supprime la falaise « attaque
// physique à 1 dégât » contre les hautes DEF. Retourne un entier ≥ 0.
function mitigatedDamage(rawAtk, def) {
  const frac = (typeof DAMAGE_MIN_FRACTION === 'number') ? DAMAGE_MIN_FRACTION : 0.25;
  const floorDmg = Math.round(Math.max(0, rawAtk) * frac);
  const subtractive = rawAtk - Math.max(0, def || 0);
  return Math.max(floorDmg, subtractive);
}

// ── Système de statuts persistants ──────────────────────────
// Chaque combattant porte statusEffects: [{ id, icon, power, turns }]
// id ∈ "burn" (🔥) | "poison" (☠️) | "bleed" (🩸) | "gel" (❄️) | "weaken" (🛡️↓)
//   | "disarm" (🪄↓) | "regen" (🩹) | "stun" (💫)
// Les DoT (burn/poison/bleed/gel) infligent des dégâts au tick.
// "weaken" applique un malus DEF persistant (power = DEF perdue) ;
// "disarm" applique un malus ATK persistant (power = ATK perdue) :
// le malus est appliqué au moment de applyStatus, restauré à l'expiry.
// "stun" fait sauter le prochain tour du combattant (non-DoT) : sa durée
// (turns = nombre de tours sautés) est décrémentée par consumeStun() au
// point de saut, jamais par tickStatuses (sinon l'expiry l'annulerait
// avant qu'il ne serve).
// Riders distincts des 4 DoT (Thème B / B3, phase 1) — différencient burn et
// bleed sans toucher la baseline des autres. Contenus dans le bloc de tick de
// tickStatuses (aucun autre site combat). Poison (anti-heal) & gel (contrôle) =
// phase 2. Cf. .claude/plans/dot-differentiation-B3.md
const BLEED_RAMP = 2;   // 🩸 Saignement : +2 dégâts par tour écoulé (escalade)
// B3 phase 2 — riders offensifs (l'ennemi affligé est affaibli ; player-favorable) :
const POISON_HEAL_MULT = 0.5;  // ☠️ soins de la cible empoisonnée × 0,5 (anti-heal)
const GEL_ATK_MULT     = 0.8;  // ❄️ ATK du combattant gelé × 0,8 (contrôle)
function _hasStatus(t, id) {
  return !!(t && Array.isArray(t.statusEffects) && t.statusEffects.some(s => s.id === id));
}
// Soin effectif d'un ennemi (réduit s'il est empoisonné). PUR/défensif.
function _enemyHealMult(enemy) { return _hasStatus(enemy, 'poison') ? POISON_HEAL_MULT : 1; }
// ATK effective d'un ennemi (réduite s'il est gelé). PUR/défensif.
function _enemyEffAtk(enemy) {
  const a = (enemy && typeof enemy.atk === 'number') ? enemy.atk : 0;
  return _hasStatus(enemy, 'gel') ? Math.round(a * GEL_ATK_MULT) : a;
}
const STATUS_DEFS = {
  burn:   { icon: '🔥',   label: 'Brûlure',           color: '#e85a2c' },
  poison: { icon: '☠️',   label: 'Empoisonné',        color: '#7ab836' },
  bleed:  { icon: '🩸',   label: 'Saignement',        color: '#c0392b' },
  gel:    { icon: '❄️',   label: 'Engelures',         color: '#5fa8d3' },
  weaken: { icon: '🛡️↓', label: 'Affaiblissement',   color: '#9b59b6', maxStacks: 3 },
  disarm: { icon: '🪄↓', label: 'Désarmé',           color: '#c9a84c' },
  regen:  { icon: '🩹',   label: 'Régénération',      color: '#3aa55a' },
  stun:   { icon: '💫',   label: 'Étourdi',           color: '#d9a521' },
  // Peur : non-DoT. À chaque tour, le combattant apeuré a 50 % de
  // chance de se figer et perdre son tour. Durée décomptée normalement
  // par tickStatuses (contrairement à stun, consommé au point de saut).
  fear:   { icon: '😱',   label: 'Apeuré',            color: '#5a6b8c' },
  // Imperius (Sectumsempra Imperius) : non-DoT, l'ennemi frappe ses alliés.
  // Durée gérée par consumeImperius() au point d'action, comme stun.
  imperius: { icon: '🌀', label: 'Asservi',           color: '#7d3fa0' },
  // Ferula Maxima : régénération de soutien AOE (PV + PM) sur 3 tours.
  regen_ferula_max: { icon: '🩹✨', label: 'Régén. Ferula', color: '#5fc7a5' },
  // Buffs de stat temporaires (potions de buff, P0/P2). Miroir positif de
  // `disarm` : la stat de base est augmentée à la pose (applyStatus dans
  // _applyConsumableEffect), réappliquée par recalculateStats (source unique),
  // restaurée à l'expiry par tickStatuses. `power` = points gagnés.
  // L'id encode la stat : buff_<stat> (atk/def/agi/lck/mag) — cf. BUFF_STAT_BY_ID.
  buff_atk: { icon: '💪', label: 'Force', color: '#d35400' },
  buff_def: { icon: '🛡️', label: 'Défense', color: '#3f7a4a' },
  buff_agi: { icon: '💨', label: 'Célérité', color: '#3fa0a0' },
  buff_lck: { icon: '🍀', label: 'Précision', color: '#4a9b4a' },
  buff_mag: { icon: '🔮', label: 'Puissance', color: '#8a4ad0' },
  // Résistance (Potion de Résistance, P3). Non-DoT : réduit tous les dégâts
  // subis de `power` % pendant `turns` tours. Décompté par tickStatuses (pas
  // de fonction de consommation) ; lu par _resistMult() aux sites de dégâts.
  resist_buff: { icon: '🛡️', label: 'Résistance', color: '#4a7ba6' }
};

// Map statut de buff → stat de base impactée. Source unique consommée par
// recalculateStats (réapplication) et tickStatuses (restauration à l'expiry).
const BUFF_STAT_BY_ID = {
  buff_atk: 'atk', buff_def: 'def', buff_agi: 'agi', buff_lck: 'lck', buff_mag: 'mag'
};

// Multiplicateur de dégâts subis par une cible (héros) selon son statut
// `resist_buff` actif. Retourne 1 si aucune résistance. Réduction générale
// (tous types de dégâts), plafonnée à 90 %. Pur, sans effet de bord.
function _resistMult(target) {
  if (!target || !Array.isArray(target.statusEffects)) return 1;
  const s = target.statusEffects.find(x => x.id === 'resist_buff' && x.turns > 0);
  if (!s) return 1;
  const pct = Math.min(90, Math.max(0, s.power || 0));
  return 1 - pct / 100;
}

// E2 — résout la clé d'ancrage FX d'une cible de combat : 'enemy:N' si la
// cible est dans enemyGroup, 'ally' sinon (héros). Pur, sans effet de bord.
function _combatTargetKey(target) {
  if (typeof enemyGroup !== 'undefined' && Array.isArray(enemyGroup)) {
    const idx = enemyGroup.indexOf(target);
    if (idx >= 0) return `enemy:${idx}`;
  }
  return 'ally';
}

// Pose ou rafraîchit un statut. Renvoie `true` si un nouvel "instance"
// du statut a été appliqué (création ou stack supplémentaire), `false`
// si seule la durée a été refresh (cap stacks atteint).
//
// Stacks (Vague B) : un statut peut déclarer `STATUS_DEFS[id].maxStacks`
// pour devenir empilable (actuellement : `weaken` cap 3). Sans
// `maxStacks` le comportement reste l'ancien (max power, max turns).
function applyStatus(target, id, power, turns) {
  if (!target) return false;
  if (!target.statusEffects) target.statusEffects = [];
  const def = STATUS_DEFS[id];
  // Flash de statut (E2) : pulse coloré sur la carte au moment de la pose
  // (pas au tick). Purement visuel, défensif (no-op hors overlay de combat).
  if (def) CFX_safe.statusFlash(_combatTargetKey(target), id);
  const maxStacks = def && def.maxStacks ? def.maxStacks : 1;
  const existing = target.statusEffects.find(s => s.id === id);
  if (existing) {
    if (maxStacks > 1) {
      // Statut empilable : ajoute 1 stack si cap non atteint, refresh
      // toujours la durée (au max de l'ancienne et de la nouvelle).
      // On stocke `maxTurns` = durée canonique pour reset à l'expiry.
      existing.maxTurns = Math.max(existing.maxTurns || existing.turns, turns);
      existing.turns    = Math.max(existing.turns, turns);
      if ((existing.stacks || 1) < maxStacks) {
        existing.stacks = (existing.stacks || 1) + 1;
        return true;
      }
      return false;
    }
    // Statut non empilable : ancien comportement (max power, max turns).
    existing.power = Math.max(existing.power, power);
    existing.turns = Math.max(existing.turns, turns);
    return false;
  }
  const entry = { id, power, turns, icon: def.icon };
  if (maxStacks > 1) { entry.stacks = 1; entry.maxTurns = turns; }
  target.statusEffects.push(entry);
  return true;
}

// ── Stun : étourdissement (saut de tour) ─────────────────────
// isStunned : le combattant a-t-il un stun actif ?
function isStunned(actor) {
  return !!(actor && actor.statusEffects &&
            actor.statusEffects.some(s => s.id === 'stun' && s.turns > 0));
}
// consumeStun : consomme 1 tour de stun. Retourne true si le tour de
// l'acteur doit être sauté. Retire le statut quand sa durée atteint 0.
function consumeStun(actor) {
  if (!actor || !actor.statusEffects) return false;
  const s = actor.statusEffects.find(st => st.id === 'stun' && st.turns > 0);
  if (!s) return false;
  s.turns--;
  if (s.turns <= 0) {
    actor.statusEffects = actor.statusEffects.filter(st => st !== s);
  }
  return true;
}

// ── Peur : 50 % de saut de tour tant que le statut est actif ──
function isFeared(actor) {
  return !!(actor && actor.statusEffects &&
            actor.statusEffects.some(s => s.id === 'fear' && s.turns > 0));
}
// Garde anti-peur de groupe : true si un membre vivant porte un équipement
// `fearImmune` (relique Bannière de Godric — signature Gryffondor). Protège
// tout le groupe ; n'affecte jamais les ennemis (cf. rollFearSkip).
function _partyFearWardActive() {
  if (typeof party === 'undefined') return false;
  for (const c of activeParty()) {
    if (!c || c.hp <= 0 || !c.equipped) continue;
    for (const it of Object.values(c.equipped)) {
      if (it && it.fearImmune) return true;
    }
  }
  return false;
}

// rollFearSkip : true si l'acteur est apeuré ET échoue le jet (50 %).
// Ne consomme rien — la durée est décomptée par tickStatuses. La Bannière
// de Godric immunise les héros (pas les ennemis).
function rollFearSkip(actor) {
  if (!isFeared(actor)) return false;
  if (typeof party !== 'undefined' && activeParty().includes(actor)
      && _partyFearWardActive()) return false;
  return Math.random() < 0.5;
}

// Levier one-shot des Quêtes Signature de Maison sur le combat final
// (voldemort_revenu), gardé par <house>SignatureDone. Volontairement LÉGER :
// une réplique de Dumbledore (addMsg, pur dialogue) + un modificateur de combat.
// No-op hors du boss final ou si la signature de la Maison n'est pas remise.
function _applySignatureVoldemortLever() {
  if (!enemyGroup.length) return;
  const boss = enemyGroup[0];
  if (!boss || boss.id !== 'voldemort_revenu') return;
  const msg = (t) => { if (typeof addMsg === 'function') addMsg(t, 'magic'); };

  // Le levier de Signature (texte + modificateur) ne s'applique que si la
  // Maison du joueur a remis sa Quête Signature. `signatureApplied` indique
  // si une réplique de Dumbledore conditionnée par le flag a déjà parlé —
  // sinon, on retombe sur le cadre générique (08 §8.8.1).
  let signatureApplied = false;
  if (typeof chosenHouse !== 'undefined' && chosenHouse) {
    if (chosenHouse === 'Gryffondor' && typeof gryffSignatureDone !== 'undefined' && gryffSignatureDone) {
      // 🦁 Neutralise la phase terreur (la peur à 25 % PV).
      if (Array.isArray(boss.phases)) {
        boss.phases = boss.phases.filter(ph => !(ph.gainAbility && ph.gainAbility.statusId === 'fear'));
      }
      msg("🦁 Le portrait de Dumbledore : « Le château a entendu ton pas ne pas reculer. » L'Étendard de Godric tient la terreur en respect.");
      // Beat scénarisé (L8, 05 §5.4.2) — Anastasia, si présente, exulte.
      if (typeof heroBarkScripted === 'function') heroBarkScripted('anastasia', 'preVoldemortGryff', { channel: 'combat', once: 'prevold-gryff' });
      signatureApplied = true;
    } else if (chosenHouse === 'Serdaigle' && typeof ravenSignatureDone !== 'undefined' && ravenSignatureDone) {
      // 🦅 Révèle une faille : Voldemort devient vulnérable à la lumière.
      boss.weak = Array.isArray(boss.weak) ? boss.weak.slice() : [];
      if (!boss.weak.includes('lumière')) boss.weak.push('lumière');
      msg("🦅 Dumbledore : « Tu as lu ce que Rowena n'a pu achever. » Le Codex révèle une faille : la lumière le blesse désormais.");
      signatureApplied = true;
    } else if (chosenHouse === 'Serpentard' && typeof slythSignatureDone !== 'undefined' && slythSignatureDone) {
      if (slythPactChoice === 'pact') {
        slythPactBuff = true;   // lifesteal de sort (15 %) ce combat
        msg("🐍 Voldemort marque un temps : « Nous nous ressemblons. » Le pacte de Salazar nourrit ta magie.");
      } else {
        boss.atk = Math.round((boss.atk || 0) * 0.85);
        if (boss.mag) boss.mag = Math.round(boss.mag * 0.85);
        msg("🐍 Tu as retourné le secret de Salazar contre lui. Voldemort connaît la trahison — sa frappe faiblit.");
        // Beat scénarisé (L8, 05 §5.4.2) — Maxence, si présent, assume sa défiance.
        if (typeof heroBarkScripted === 'function') heroBarkScripted('maxence', 'preVoldemortDefiance', { channel: 'combat', once: 'prevold-defiance' });
      }
      signatureApplied = true;
    } else if (chosenHouse === 'Poufsouffle' && typeof poufSignatureDone !== 'undefined' && poufSignatureDone) {
      // 🦡 « Espoir partagé » : filet de sécurité (+PV max transient), pas une arme.
      let any = false;
      for (const c of activeParty()) {
        if (!c || c.hp <= 0) continue;
        c.hpMax += 15; c.hp += 15; any = true;
      }
      if (any) { msg("🦡 « Espoir partagé » — les rescapés du Refuge t'envoient leur force. Tu n'es pas descendu seul, même si tu étais seul à descendre."); signatureApplied = true; }
    }
  }

  // Cadre générique de Dumbledore (08 §8.8.1) — joué quand aucune réplique de
  // Signature n'a parlé (Maison sans Signature remise, ou aucune Maison).
  if (!signatureApplied) {
    msg("🕯️ Le portrait de Dumbledore : « Plus bas que la peur, il y a toujours autre chose. Ce n'est pas ta puissance qui scelle — c'est ton choix d'être là. »");
  }
}

// ── Promotion de boss en personnage (P4, ch.06 §6.6) ─────────
// Deux boss originaux sont promus en personnages scénarisés : ils prennent la
// parole à leur PREMIÈRE rencontre (monologue one-shot), ce qui les distingue
// des purs gardiens mécaniques (Veilleur, Hécate). Modèle :
// `_applySignatureVoldemortLever` (addMsg pur) + one-shot via seenScriptedBeat
// (sentinelle string, comme 'voix_des_ruines'). Leur entrée de Codex
// (catégorie 👤 Personnages) parachève la promotion (codex.js).
//   - Maître des Détraqueurs : incarne la peur-sceau (§6.5 B).
//   - Héraut des Ténèbres : charnière vers la Boucle Ténébreuse.
const BOSS_PROMO_BEATS = {
  maitre_detraqueur: {
    icon: '👁️',
    line: "Le Maître des Détraqueurs ne se rue pas. Il s'attarde, et une voix sans bouche s'insinue : « Je ne prends pas la vie. Je prends ce qui la rendait belle, un souvenir à la fois. La peur que tu sens n'est pas la tienne — c'est celle que les Fondateurs ont scellée, et que je garde au chaud. »",
  },
  heraut_tenebres: {
    icon: '📯',
    line: "Le Héraut lève son cor d'os et n'attaque pas d'abord — il annonce : « Je ne suis pas la fin. Je suis ce qui vient avant. Abats-moi, et tu n'auras fait que sonner toi-même le prochain tour. Ce qui se referme ici se rouvrira plus bas, toujours. »",
  },
  // Phase 3 Lot 3 — gardiens des Chambres des Fondateurs : chacun prend la
  // parole à sa 1re rencontre, de la voix de son Fondateur.
  gardien_lion: {
    icon: '🦁',
    line: "Le Gardien du Lion ne charge pas : il se plante en travers du seuil, brasiers ravivés. « On ne passe pas la porte de Godric par la force. On la mérite — ou on tombe. »",
  },
  gardien_serpent: {
    icon: '🐍',
    line: "Le Gardien du Serpent ne siffle pas d'abord : il jauge. « Salazar n'a laissé entrer que les rusés. Montre-moi lequel tu es — avant que le venin ne le décide pour toi. »",
  },
  gardien_aigle: {
    icon: '🦅',
    line: "Le Gardien de l'Aigle reste immobile, runes crépitantes. « Rowena ne gardait pas un trésor, mais une question. Réponds juste — ou la foudre répondra à ta place. »",
  },
  gardien_blaireau: {
    icon: '🦡',
    line: "Le Gardien du Blaireau s'interpose sans un mot, puis cède une phrase : « Helga a creusé cet abri pour les vivants. Prouve que tu en es un — je ne m'écarte que devant ceux qui tiennent. »",
  },
};

// Orchestrateur one-shot : joue le monologue de promotion à la 1re rencontre du
// boss en tête de groupe. Sentinelle 'boss_promo:<id>' dans seenScriptedBeat
// (l'id survit au recyclage de Boucle — scaleMonster ne renomme que le `name`).
// No-op silencieux si l'état/les helpers manquent (file://) ou si déjà joué.
function _maybeBossPromoBeat() {
  if (!enemyGroup.length) return false;
  const boss = enemyGroup[0];
  if (!boss || !boss.id) return false;
  const beat = BOSS_PROMO_BEATS[boss.id];
  if (!beat) return false;
  if (typeof seenScriptedBeat === 'undefined' || !seenScriptedBeat) return false;
  const key = 'boss_promo:' + boss.id;
  if (seenScriptedBeat.has(key)) return false;
  seenScriptedBeat.add(key);
  if (typeof addMsg === 'function') addMsg(beat.line, 'magic');
  return true;
}

// ── Imperius : asservissement (l'ennemi frappe ses alliés) ───
// consumeImperius : consomme 1 tour d'asservissement. Retourne true si
// l'ennemi doit agir sous contrôle ce tour. Retire le statut à 0.
function consumeImperius(enemy) {
  if (!enemy || !enemy.statusEffects) return false;
  const s = enemy.statusEffects.find(st => st.id === 'imperius' && st.turns > 0);
  if (!s) return false;
  s.turns--;
  if (s.turns <= 0) {
    enemy.statusEffects = enemy.statusEffects.filter(st => st !== s);
  }
  return true;
}

function tickStatuses(target, isEnemy) {
  if (!target || !target.statusEffects || !target.statusEffects.length) return '';
  let log = '';
  const remaining = [];
  target.statusEffects.forEach(s => {
    // Stun / Imperius : non-DoT, durée gérée par consumeStun() /
    // consumeImperius() au point d'action. tickStatuses les porte tels
    // quels, sans tick ni décompte.
    if (s.id === 'stun' || s.id === 'imperius') { remaining.push(s); return; }
    // Statuts DoT : burn / poison / bleed / gel → dégâts par tour
    if (s.id === 'burn' || s.id === 'poison' || s.id === 'bleed' || s.id === 'gel') {
      let dmg = s.power;
      // 🩸 Bleed (B3) — rider « hémorragie » OFFENSIF (cible ennemie seulement) :
      // le tick croît de BLEED_RAMP par tour écoulé → récompense la pression
      // soutenue du joueur. Le bleed subi par un héros reste plat (baseline
      // inchangée → aucun impact difficulté/sim). `_ticks` combat-scopé.
      if (s.id === 'bleed' && isEnemy) {
        s._ticks = (s._ticks || 0) + 1;
        dmg += (s._ticks - 1) * BLEED_RAMP;
      }
      // 🔥 Burn (B3) — rider « feu inévitable » OFFENSIF : sur un ennemi, la
      // brûlure ignore sa résistance élémentaire (mais pas sa faiblesse). Les
      // autres DoT restent atténués par resist. Purement offensif → baseline
      // du DoT subi par le joueur inchangée.
      if (isEnemy && target.resist?.includes(s.id) && s.id !== 'burn') dmg = Math.floor(dmg * RESIST_MULTIPLIER);
      if (isEnemy && target.weak?.includes(s.id))   dmg = Math.floor(dmg * WEAK_MULTIPLIER);
      // Rework D3 — résistance aux DoT : l'END du joueur atténue chaque tick
      // de floor(END/12). N'affecte que les héros (DoT subi), pas les ennemis.
      // Miroir de tools/sim-difficulty.js. Cf. player-stats-balance.md §2 (D3).
      if (!isEnemy) {
        const div = (typeof END_DOT_RES_DIV === 'number') ? END_DOT_RES_DIV : 12;
        dmg -= Math.floor((target.end || 0) / div);
      }
      dmg = Math.max(1, dmg);
      if (isEnemy) target.currentHp = Math.max(0, target.currentHp - dmg);
      else        target.hp         = Math.max(0, target.hp         - dmg);
      log += `${s.icon} ${target.name} subit ${dmg} (${STATUS_DEFS[s.id].label}). `;
      const key = isEnemy ? `enemy:${enemyGroup.indexOf(target)}` : 'ally';
      UX_safe.floatDmg(key, dmg, 'dmg');
      UX_safe.logCombat(`${s.icon} ${target.name} : <b>−${dmg}</b> (${STATUS_DEFS[s.id].label})`, 'bad');
    }
    // Statut regen : heal-over-time sur les alliés (s.power PV / tour, plafonné par hpMax).
    if (s.id === 'regen' && !isEnemy) {
      const heal = Math.min(target.hpMax - target.hp, s.power);
      if (heal > 0) {
        target.hp += heal;
        log += `${STATUS_DEFS.regen.icon} ${target.name} récupère ${heal} PV (Régénération). `;
        UX_safe.floatDmg('ally', heal, 'heal');
        UX_safe.logCombat(`${STATUS_DEFS.regen.icon} ${target.name} régénère <b>+${heal} PV</b>`, 'good');
      }
    }
    // Ferula Maxima : régén AOE — s.power PV + 2 PM par tour (plafonnés).
    if (s.id === 'regen_ferula_max' && !isEnemy) {
      const heal    = Math.min(target.hpMax - target.hp, s.power);
      const restore = Math.min(target.spMax - target.sp, 2);
      if (heal > 0)    target.hp += heal;
      if (restore > 0) target.sp += restore;
      if (heal > 0 || restore > 0) {
        log += `${STATUS_DEFS.regen_ferula_max.icon} ${target.name} récupère ${heal} PV / ${restore} PM (Ferula Maxima). `;
        if (heal > 0) UX_safe.floatDmg('ally', heal, 'heal');
        UX_safe.logCombat(`${STATUS_DEFS.regen_ferula_max.icon} ${target.name} : <b>+${heal} PV</b> / <b>+${restore} PM</b>`, 'good');
      }
    }
    // (weaken/disarm : pas de tick de dégâts — le malus DEF/ATK est
    //  appliqué au cast, restauré à l'expiry ci-dessous.)
    s.turns--;
    if (s.turns > 0) {
      remaining.push(s);
    } else if (s.id === 'weaken') {
      // Expiration → restaurer 1 stack de DEF perdue. Si plus d'1 stack,
      // le statut continue avec stacks-- et la durée canonique réinitialisée.
      target.def = (target.def || 0) + s.power;
      log += `${STATUS_DEFS[s.id].icon} ${target.name} récupère ${s.power} DEF. `;
      UX_safe.logCombat(`${STATUS_DEFS[s.id].icon} ${target.name} récupère <b>+${s.power} DEF</b>`, 'magic');
      if ((s.stacks || 1) > 1) {
        s.stacks--;
        s.turns = s.maxTurns || 3;
        remaining.push(s);
      }
    } else if (s.id === 'disarm') {
      // Expiration → restaurer l'ATK perdue
      target.atk = (target.atk || 0) + s.power;
      log += `${STATUS_DEFS[s.id].icon} ${target.name} récupère ${s.power} ATK. `;
      UX_safe.logCombat(`${STATUS_DEFS[s.id].icon} ${target.name} récupère <b>+${s.power} ATK</b>`, 'magic');
    } else if (BUFF_STAT_BY_ID[s.id]) {
      // Expiration d'un buff de stat → retirer les points gagnés (miroir de
      // disarm). recalculateStats repartira de la base sans ce buff.
      const stat = BUFF_STAT_BY_ID[s.id];
      target[stat] = Math.max(0, (target[stat] || 0) - s.power);
      const lbl = STATUS_DEFS[s.id].label;
      log += `${STATUS_DEFS[s.id].icon} ${target.name} perd le bonus de ${lbl} (${s.power}). `;
      UX_safe.logCombat(`${STATUS_DEFS[s.id].icon} ${target.name} : <b>−${s.power} ${stat.toUpperCase()}</b> (${lbl} dissipée)`, 'info');
      // Stats dérivées (dodge/crit) à rafraîchir si la stat les pilote.
      if ((stat === 'agi' || stat === 'lck' || stat === 'mag') && typeof recalculateStats === 'function') {
        recalculateStats();
      }
    } else if (s.id === 'resist_buff') {
      // Expiration de la Résistance — aucun état à restaurer (lue à la volée
      // par _resistMult). Simple annonce de dissipation.
      log += `${STATUS_DEFS[s.id].icon} La Résistance de ${target.name} se dissipe. `;
      UX_safe.logCombat(`${STATUS_DEFS[s.id].icon} ${target.name} : Résistance dissipée`, 'info');
    }
  });
  target.statusEffects = remaining;
  return log;
}

function clearAllStatuses() {
  party.forEach(c => { c.statusEffects = []; });
  enemyGroup.forEach(e => { e.statusEffects = []; });
}

// Endgame §7.10 — Larme du Phénix Pure : scanne le groupe à la
// recherche de persos à HP ≤ 0 et les ressuscite à hpMax si une
// larme est présente en inventaire (partagé). 1 larme = 1 revive.
// Retourne le log des résurrections.
function _tryAutoReviveKOChars() {
  if (typeof player === 'undefined' || !player.inventory) return '';
  let log = '';
  for (const c of activeParty()) {
    if (c.hp > 0) continue;
    const idx = player.inventory.findIndex(it => it && it.id === 'larme_phenix_pure');
    if (idx < 0) break; // plus de larmes disponibles
    _consumeAt(idx, 1); // 1 larme du stack par résurrection
    c.hp = c.hpMax;
    c.statusEffects = [];
    log += `✨ ${c.name} ressuscite — la Larme du Phénix Pure se consume ! `;
    if (typeof addMsg === 'function') {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/items/larmes_phenix.png" alt=""> ${c.name} ressuscite (Larme du Phénix Pure consommée).`, 'magic');
    }
    UX_safe.floatDmg('ally', c.hpMax, 'heal');
  }
  return log;
}

// Tick fin de round : applique regenHp/regenSp issus de l'équipement.
// Plafonné par hpMax/spMax. Appelé depuis enemyTurn ; testable directement.
// Multiplicateur d'or de combat issu de l'équipement du groupe (ex.
// Reliquaire Lunaire = +0.20). Retourne 1 + Σ bonusGoldMult. Stack
// multiplicatif avec recolteMult (cf. endBattle).
// Voir .claude/plans/game-economy-gold-audit.md §5.6 Piste A.
function _equipmentGoldMultiplier() {
  let bonus = 0;
  activeParty().forEach(c => {
    if (!c || !c.equipped) return;
    Object.values(c.equipped).forEach(item => {
      if (item && typeof item.bonusGoldMult === 'number') bonus += item.bonusGoldMult;
    });
  });
  return 1 + Math.max(0, bonus);
}

function applyEquipmentRegen() {
  let log = '';
  activeParty().forEach(c => {
    if (c.hp <= 0 || !c.equipped) return;
    let hpRegen = 0, spRegen = 0;
    Object.values(c.equipped).forEach(item => {
      if (!item) return;
      if (item.regenHp) hpRegen += item.regenHp;
      if (item.regenSp) spRegen += item.regenSp;
    });
    // Set bonus Ténèbres 3/3 : +2 regen HP / tour (cf. recalculateStats —
    // c._tenebresSetCount). Voir ENDGAME_PLAN.md §7.8.
    if ((c._tenebresSetCount | 0) >= 3) hpRegen += 2;
    // Set du Blaireau 4/4 : +2 regen HP / tour
    // (cf. .claude/plans/houses-2.0.md §B — HOUSE_SETS.Poufsouffle.setBonus4).
    if ((c._pouf_setCount | 0) >= 4) hpRegen += 2;
    // Mondes parallèles Phase H §6.10 — Set Voyageur 4/5 : +2 regen SP / tour.
    if ((c._voyageurRegenSpBonus | 0) > 0) spRegen += c._voyageurRegenSpBonus;
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

// Familiers invoqués (Avis Praesidium — Lot P2). Combat-scoped (combatFamiliars,
// state.js). Au tournant de chaque round, chaque familier frappe un ennemi
// vivant au hasard (mitigatedDamage) puis voit sa durée décroître ; il se
// dissipe à 0. Défensif : no-op si aucun familier. Réassigne le global (let).
function tickFamiliars() {
  if (typeof combatFamiliars === 'undefined' || !Array.isArray(combatFamiliars) || !combatFamiliars.length) return '';
  let log = '';
  const survivors = [];
  for (const fam of combatFamiliars) {
    if (!fam || fam.turns <= 0) continue;
    const targets = livingEnemies();
    if (targets.length) {
      const tgt = targets[Math.floor(Math.random() * targets.length)];
      const dmg = Math.max(1, mitigatedDamage(fam.atk, tgt.def || 0));
      tgt.currentHp = Math.max(0, tgt.currentHp - dmg);
      log += `${fam.icon || '🦉'} Le familier de ${fam.ownerName} frappe ${tgt.name} : -${dmg} PV ! `;
      UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(tgt)}`, dmg, 'dmg');
      UX_safe.logCombat(`${fam.icon || '🦉'} Familier → ${tgt.name} : <b>−${dmg}</b>`, 'good');
    }
    fam.turns -= 1;
    if (fam.turns > 0) survivors.push(fam);
  }
  combatFamiliars = survivors;
  return log;
}

// Garde counter-attack : quand un coup physique est mitigé par la Garde,
// le défenseur riposte avec une chance `counterChance` (base 30 %, plafond
// 40 %, + bonus d'équipement). La riposte inflige atk/2 (mitigée par la DEF
// ennemie) et ne consomme pas de tour. Retourne le log de la riposte.
function _tryGuardCounter(defender, enemy) {
  if (!defender || !enemy || enemy.currentHp <= 0) return '';
  const pct = Math.min(40, 30 + (defender.counterChance || 0));
  if (Math.random() * 100 >= pct) return '';
  const dmg = Math.max(1, mitigatedDamage(Math.floor(defender.atk / 2), enemy.def || 0));
  enemy.currentHp = Math.max(0, enemy.currentHp - dmg);
  AudioSystem.playHit();
  const idx = enemyGroup.indexOf(enemy);
  UX_safe.floatDmg(`enemy:${idx}`, dmg, 'dmg');
  UX_safe.logCombat(`🛡️→⚔️ <b>${defender.name}</b> contre ${enemy.name} : <b>−${dmg}</b>`, 'good');
  return `🛡️→⚔️ ${defender.name} contre ${enemy.name} pour ${dmg} dégâts ! `;
}

// D3 — flash plein écran (CFX_safe.hurtFlash) quand un héros encaisse un
// coup ≥ 15 % de ses PV max. Purement visuel, défensif, aucune mécanique
// touchée. intensity ∈ [0,1] croît avec la fraction de PV perdue.
function _maybeHurtFlash(applied, target) {
  if (!target || !target.hpMax || applied <= 0) return;
  const frac = applied / target.hpMax;
  if (frac < 0.15) return;
  CFX_safe.hurtFlash(Math.min(1, frac / 0.4));
}

// Résout une attaque physique ennemie sur un allié.
// Priorité : Protego > Esquive > Garde > coup normal. Retourne le fragment de log.
function _enemyPhysicalHit(enemy, target, charIdx) {
  if (shieldTurns[charIdx] > 0) {
    shieldTurns[charIdx]--;
    UX_safe.floatDmg('ally', 0, 'shield');
    // Lot P4 — Protego Diabolica (évolution Apothéose) : le bouclier maudit
    // bloque ET renvoie une fraction du coup à l'assaillant. Défensif.
    let reflectMsg = '';
    if (typeof _shieldReflect !== 'undefined' && _shieldReflect[charIdx] > 0) {
      const raw = mitigatedDamage(_enemyEffAtk(enemy) + Math.floor(Math.random() * 3), target.def);
      const back = Math.max(1, Math.floor(raw * _shieldReflect[charIdx]));
      enemy.currentHp = Math.max(0, enemy.currentHp - back);
      _shieldReflect[charIdx] = (shieldTurns[charIdx] > 0) ? _shieldReflect[charIdx] : 0;
      UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(enemy)}`, back, 'dmg');
      UX_safe.logCombat(`🛡️🔥 Protego Diabolica renvoie <b>−${back}</b> à ${enemy.name}`, 'magic');
      reflectMsg = `🛡️🔥 Le bouclier maudit renvoie ${back} à ${enemy.name} ! `;
    }
    UX_safe.logCombat(`🛡️ Protego bloque l'attaque de ${enemy.name} sur ${target.name}.`, 'magic');
    return `🛡️ Protego protège ${target.name} ! ` + reflectMsg;
  }
  if (Math.random() * 100 < (target.dodgeChance || 0)) {
    UX_safe.floatDmg('ally', 0, 'miss');
    UX_safe.logCombat(`💨 ${target.name} esquive ${enemy.name}`, 'good');
    return `💨 ${target.name} esquive l'attaque de ${enemy.name} ! `;
  }
  if (guardTurns[charIdx] > 0) {
    const dmg = mitigatedDamage(_enemyEffAtk(enemy) + Math.floor(Math.random() * 3), target.def);
    const mitigated = Math.max(0, Math.floor(dmg / 2 * _resistMult(target)));
    target.hp = Math.max(0, target.hp - mitigated);
    UX_safe.floatDmg('ally', mitigated, 'dmg');
    if (mitigated > 0) UX_safe.cardReact(charIdx, 'dmg'); // réaction de carte (K1)
    CFX_safe.shake(enemy && enemy.epic ? 'heavy' : 'light'); // coup encaissé (Lot 1)
    _maybeHurtFlash(mitigated, target); // flash de dégâts encaissés (D3)
    UX_safe.logCombat(`🛡️ ${target.name} mitige ${enemy.name} : <b>−${mitigated}</b> <small>(au lieu de −${dmg})</small>`, 'magic');
    guardTurns[charIdx] = Math.max(0, guardTurns[charIdx] - 1);
    return `🛡️ ${target.name} mitige : -${mitigated} (au lieu de -${dmg}). ` + _tryGuardCounter(target, enemy);
  }
  const raw = mitigatedDamage(_enemyEffAtk(enemy) + Math.floor(Math.random() * 3), target.def);
  const dmg = Math.max(0, Math.floor(raw * _resistMult(target)));
  target.hp = Math.max(0, target.hp - dmg);
  UX_safe.floatDmg('ally', dmg === 0 ? 0 : dmg, dmg === 0 ? 'miss' : 'dmg');
  if (dmg > 0) UX_safe.cardReact(charIdx, 'dmg'); // réaction de carte (K1)
  _maybeHurtFlash(dmg, target); // flash de dégâts encaissés (D3)
  UX_safe.logCombat(`${enemy.icon} ${enemy.name} → ${target.name} : <b>−${dmg} PV</b>`, 'bad');
  return `${enemy.icon} → ${target.name} : -${dmg} PV. `;
}

// ── Démarrage du combat ──────────────────────────────────────
// `opts.duelGroup` (multijoueur §5) : tableau d'ennemis pré-construit à
// partir d'un snapshot de groupe adverse — court-circuite rollGroupSize /
// pickSimilarEnemy. Le combat se déroule ensuite comme un PvE classique.
function startBattle(baseEnemyData, opts) {
  inBattle          = true;
  // Phase G — combat astral : flag global lu par endBattle pour router les
  // gains vers outremondeEssence (au lieu d'XP/or/drops) et par triggerDeath
  // pour ouvrir l'éjection astrale (au lieu de la pétrification).
  inAstralCombat    = !!(opts && opts.astral);
  shieldTurns       = [0, 0];
  guardTurns        = [0, 0];
  guardRegenCooldown = [0, 0];
  elanStacks        = [0, 0];
  celeriteGauge     = [0, 0];   // D5 Célérité — accumulateur de tempo (combat-scoped)
  celeriteExtra     = [0, 0];
  weaponOil         = [null, null]; // P12 — huiles d'arme (combat-scoped)
  temporalEchoUsed  = false;        // P12 — Écho Temporel : action sup. 1×/combat
  combatFamiliars   = [];       // P2 — familiers invoqués (Avis Praesidium), combat-scoped
  artifactCharges   = {};       // P2 — charges d'artefacts actifs (reset à chaque combat)
  duoPostureSwitched = false;   // P2 — bascule gratuite de posture réarmée
  duoComboMarks      = {};      // P2 — marques Tenaille (reset par round dans enemyTurn)
  // P4 — modificateurs d'environnement, dérivés du thème d'étage (pur). En zone
  // runique (D / override post-victoire), arme la charge de l'action 🌿.
  envModifiers = (typeof computeEnvModifiers === 'function')
    ? computeEnvModifiers(currentFloor, typeof victoryAchieved !== 'undefined' && victoryAchieved)
    : null;
  envRuneCharge = (envModifiers && envModifiers.runic) ? 1 : 0;
  battleTurn        = 0;
  currentBattleChar = 0;
  pendingAction     = null;
  pendingSpell      = null;
  legilimensCancelCharges = 0;
  legilimensCastsThisFight = 0;
  recolteGoldBonus        = false;
  slythPactBuff           = false;   // signature Serpentard : armé par le levier Voldemort
  // Lot P4 — état combat-scoped corruption / temporels (reset systématique).
  echoSpellUsedThisFight   = false;
  timeRewindUsedThisFight  = false;
  _lastCastSpellByChar     = [null, null];
  _timeSnapshot            = null;
  serpentPactDoubleNext    = false;
  lionHeartActive          = false;
  badgerOathUsedThisFight  = false;
  _shieldReflect           = [0, 0];
  if (typeof window._resetTeleportFightFlag === 'function') window._resetTeleportFightFlag();

  // Duel multijoueur : groupe pré-construit ; sinon tirage 1-3 monstres.
  // Combat astral (§6.8) : groupe pré-construit aussi (1 écho passé par
  // engageAstralCombat — pas d'escalade automatique en duo, le visiteur
  // affronte exactement ce qu'il a choisi de défier).
  const duelGroup = opts && opts.duelGroup;
  const echoGroup = opts && opts.echoGroup;
  if (duelGroup && duelGroup.length) {
    enemyGroup = duelGroup.map(e => ({ ...e, currentHp: e.hp, statusEffects: [] }));
  } else if (echoGroup && echoGroup.length) {
    enemyGroup = echoGroup.map(e => ({ ...e, currentHp: e.hp, statusEffects: [] }));
  } else {
    const size = rollGroupSize();
    enemyGroup = [];
    for (let i = 0; i < size; i++) {
      const base = i === 0 ? baseEnemyData : pickSimilarEnemy(baseEnemyData);
      enemyGroup.push({ ...base, currentHp: base.hp, statusEffects: [] });
    }
  }
  party.forEach(c => { c.statusEffects = []; });

  // L3 — toast de première découverte d'une espèce (cosmétique, purement
  // textuel → non gardé reduced-motion). Émis AVANT le seenMonsters.add :
  // une ligne par espèce neuve, dédupliquée au sein du groupe.
  if (typeof addMsg === 'function' && typeof seenMonsters !== 'undefined') {
    const _newSpecies = new Set();
    for (const e of enemyGroup) {
      if (!e.id || e.isDuelist) continue;
      if (seenMonsters.has(e.id) || _newSpecies.has(e.id)) continue;
      _newSpecies.add(e.id);
      addMsg(`🔎 Nouvelle créature cataloguée : ${e.name} !`, 'good');
    }
  }
  // Marquer les ennemis comme découverts dans le bestiaire (hors duellistes).
  enemyGroup.forEach(e => { if (e.id && !e.isDuelist) seenMonsters.add(e.id); });
  // Surcouche corruption (Chapitre 09 §9.1.2) : garantit le champ pour les
  // groupes non passés par scaleMonster (duels). Cosmétique (rendu + SFX froid).
  enemyGroup.forEach(e => {
    if (e.corruption == null && typeof creatureCorruptionLevel === 'function') {
      e.corruption = creatureCorruptionLevel(e, currentFloor);
    }
  });
  // Levier one-shot des Quêtes Signature de Maison sur le combat final.
  _applySignatureVoldemortLever();
  const size = enemyGroup.length;

  document.getElementById('encounter-overlay').style.display = 'flex';
  document.body.classList.add('in-battle');
  // Phase G — marqueur visuel astral (bordure dorée via CSS).
  if (inAstralCombat) document.body.classList.add('in-astral-combat');
  else                document.body.classList.remove('in-astral-combat');
  document.getElementById('target-selection').style.display  = 'none';
  // Force une reconstruction propre des cartes ennemies (P2-2) : invalide la
  // signature pour ne jamais réutiliser les cartes d'un combat précédent.
  if (typeof _enemyGroupSig !== 'undefined') _enemyGroupSig = null;
  renderEnemyGroup();
  updateBattleCharIndicator();
  setBattleLog(`${size > 1 ? size + ' ennemis surgissent' : enemyGroup[0].desc} !`);
  addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/atk.png" alt=""> ${size} ennemi${size > 1 ? 's' : ''} !`, 'bad');
  // UX : reset journal + timeline + tour 1
  UX_safe.clearCombatLog();
  UX_safe.logCombatTurn(1);
  UX_safe.logCombat(`⚔️ Combat engagé contre ${size} ennemi${size>1?'s':''}.`, 'info');
  UX_safe.renderTimeline();
  AudioSystem.startCombatMusic(enemyGroup);
  // Souffle glacé surnaturel à l'apparition d'une créature corrompue
  // (corruption >= 2). Défensif : no-op si le SFX n'est pas défini.
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playColdBreath
      && enemyGroup.some(e => (e.corruption || 0) >= 2)) {
    AudioSystem.playColdBreath();
  }
  // Immersion : cinématique d'apparition pour les boss epic, sinon flash
  // d'entrée court (C1). Mutuellement exclusifs — jamais empilés. Purement
  // visuel (CFX_safe → no-op si le module FX est absent).
  if (enemyGroup[0] && enemyGroup[0].epic) CFX_safe.bossIntro(enemyGroup[0]);
  else                                     CFX_safe.combatStart();
  // Promotion de boss en personnage (P4, §6.6) : le Maître des Détraqueurs / le
  // Héraut des Ténèbres prennent la parole à leur 1re rencontre, AVANT que le
  // héros ne réplique. One-shot, défensif. Cf. _maybeBossPromoBeat.
  _maybeBossPromoBeat();
  // Voix des héros — apparition d'un boss epic (cosmétique, défensif). Le
  // héros actif (vivant) prend la parole. Cf. js/hero-barks.js.
  if (enemyGroup[0] && enemyGroup[0].epic && typeof heroBark === 'function') {
    const speaker = activeParty().find(c => c.hp > 0);
    if (speaker && speaker.heroKey) {
      // Boss revenu en variante Ténébreuse (Boucle, post-victoire) → bark
      // one-shot dédié « Tu m'as déjà tué une fois » ; sinon apparition standard.
      const lead = enemyGroup[0];
      const isDarkBoss = lead.variant === 'darkness';
      heroBark(speaker.heroKey, isDarkBoss ? 'darkBoss' : 'bossAppear',
               { once: (isDarkBoss ? 'darkboss:' : 'boss:') + lead.id });
    }
  }
  // Beat scénarisé (L8, 05 §5.4.2) — première rencontre d'un Mangemort :
  // Drago, s'il est présent, le reconnaît. One-shot par partie, défensif.
  if (typeof heroBarkScripted === 'function' &&
      enemyGroup.some(e => e && typeof e.id === 'string' && e.id.indexOf('mangemort') === 0)) {
    heroBarkScripted('draco', 'firstMangemort', { channel: 'combat', once: 'first-mangemort' });
  }
  // D5 Célérité — ouvre le segment du 1ᵉʳ héros (round 1). Aucune action sup. au
  // round 1 (gauge part de 0, +celerite < 1), mais maintient la parité avec la sim.
  _beginHeroSegment(currentBattleChar);

  // Tuto contextuel du premier combat (LOT D2) — une fois par partie, hors
  // combat astral. Différé pour laisser l'overlay se peindre (mesure DOM).
  if (!inAstralCombat && typeof maybeShowCombatTutorial === 'function') {
    setTimeout(maybeShowCombatTutorial, 350);
  }
}

// Renvoie 1 à 5 (cap MAX_ENEMY_GROUP). Politique de base 1/2/3 selon mode et
// étage + scaling progressif basé sur `floorKillCount` (n = floor(kills / 4)).
// duoBonus  = min(0.40, 0.10·n)        — transfert prob p1 → p2
// trioBonus = (n ≥ 5) ? min(0.40, 0.10·(n-4)) : 0  — transfert p2 → p3
// Groupes de 4-5 (quad/quint) : transfert p3 → p4 → p5 GATÉ endgame + duo
// (partySize 2, victoryAchieved, étage 11+). Valeurs calibrées par sim
// (tools/sim-difficulty.js). Cf. CLAUDE.md §"Difficulté progressive par étage"
// et .claude/plans/extend-opponent-count.md.
// Plafond CONTEXTUEL de taille de groupe. Les quad/quint (4-5) ne sont
// autorisés qu'en endgame + duo (partySize 2, post-victoire, étage 11+) ;
// partout ailleurs (solo, ou duo non post-victoire) le plafond historique
// de 3 s'applique — y compris pour les invocations (summon). C'est la
// source de vérité unique du gating, partagée par rollGroupSize et le cap
// d'invocation. `MAX_ENEMY_GROUP` (data.js) reste le plafond absolu.
function currentMaxGroupSize() {
  const endgame = partySize === 2
    && typeof victoryAchieved !== 'undefined' && victoryAchieved
    && currentFloor >= 11;
  return endgame ? MAX_ENEMY_GROUP : 3;
}

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
  let trioShiftBase = trioBonus;
  // Endgame §7.1 : +10 % de proba groupe 3 en post-victoire à floor 11+.
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved && currentFloor >= 11) {
    trioShiftBase += 0.10;
  }
  const trioShift = Math.min(p2, trioShiftBase);
  p2 -= trioShift; p3 += trioShift;

  // Quad/quint (4-5 ennemis) — gaté endgame + duo via currentMaxGroupSize().
  // Transfert p3 → p4 (quad) puis p4 → p5 (quint = FRACTION de la bande quad,
  // garantit quad ≥ quint — les groupes de 5 restent plus rares que ceux de
  // 4). Montée en puissance via le farming (n). Calibré par sim (Temps 2).
  let p4 = 0, p5 = 0;
  if (currentMaxGroupSize() >= 4) {
    const quadBonus  = Math.min(0.25, 0.05 * Math.max(0, n - 6));
    const quadShift  = Math.min(p3, quadBonus);
    p3 -= quadShift; p4 += quadShift;
    const quintFrac  = n >= 10 ? Math.min(0.40, 0.05 * (n - 9)) : 0;
    const quintShift = p4 * quintFrac;
    p4 -= quintShift; p5 += quintShift;
  }

  if (r < p1) return 1;
  if (r < p1 + p2) return 2;
  if (r < p1 + p2 + p3) return 3;
  if (r < p1 + p2 + p3 + p4) return 4;
  return 5;
}

function pickSimilarEnemy(base) {
  // Choisit un monstre éligible à l'étage courant, similaire au monstre de base.
  // Boucle Ténébreuse : pool rebasé sur relFloor en post-victoire (§7.2).
  const ef = (typeof effectiveFloor === 'function') ? effectiveFloor(currentFloor) : currentFloor;
  const eligible = MONSTERS.filter(m =>
    m.minFloor <= ef && (m.maxFloor === null || ef <= m.maxFloor)
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
  if (action === 'artifact') { triggerActiveArtifact(); return; }   // P2 — artefact actif
  if (action === 'posture')  { toggleDuoPosture();      return; }   // P2 — bascule de posture (gratuite)
  if (action === 'env')      { triggerRuneEnv();        return; }   // P4 — interaction d'environnement (rune)

  if (action === 'guard') {
    const idx    = currentBattleChar;
    // Double-Garde : empiler les tours de garde, plafond 3. Chaque garde
    // bloque un coup physique (mitigation 50 %) ; un stack absorbe d'autant
    // plus de coups. La regen PM est rendue à chaque pose.
    const stacked = guardTurns[idx] > 0;
    guardTurns[idx] = Math.min(3, guardTurns[idx] + 1);
    // Regen PM disponible 1 tour sur 2 : si le cooldown est actif, la pose
    // de garde ne restitue pas de PM. Sinon, on rend les PM et on réarme.
    let pmGain = 0;
    if (guardRegenCooldown[idx] <= 0) {
      const pmTheo = 3 + Math.floor((char.mag || 0) / 5);
      pmGain = Math.max(0, Math.min(pmTheo, char.spMax - char.sp));
      char.sp += pmGain;
      guardRegenCooldown[idx] = 2;
    }
    const label = stacked
      ? `🛡️ ${char.name} renforce sa garde (×${guardTurns[idx]})`
      : `🛡️ ${char.name} se met en garde`;
    setBattleLog(`${label}${pmGain ? ` (+${pmGain} PM)` : ''}.`);
    addMsg(`${label}${pmGain ? ` (+${pmGain} PM)` : ''}.`, 'info');
    UX_safe.logCombat(`${label}${pmGain ? ` <b>+${pmGain} PM</b>` : ''}`, 'magic');
    AudioSystem.playSpellCast('Protego');
    advanceBattleChar();
    return;
  }

  if (action === 'attack') {
    if (livingEnemies().length > 1) {
      showTargetSelection('attack');
    } else {
      executeAttack(getFirstLivingEnemy());
    }
  }
}

// ── P2 · Artefacts actifs (combat-system-synthesis §2.1) ─────
// Sous-classe d'artefacts déclenchables 1×/combat (`item.activeEffect`),
// distincte des passifs (stats/regen/grantsSpell — intouchés). Charges suivies
// dans `artifactCharges[idx]` (reset startBattle). Le ciblage 1-ennemi réutilise
// `pendingAction` ('artifact') via showTargetSelection. PUR (lecture seule).
function _activeArtifactFor(char) {
  if (!char || !char.equipped) return null;
  for (const item of Object.values(char.equipped)) {
    if (item && item.activeEffect && item.activeEffect.resolve) return item;
  }
  return null;
}
// Charges restantes pour le perso `idx` (init paresseuse depuis activeEffect.charges).
function _artifactChargesLeft(idx, art) {
  if (artifactCharges[idx] === undefined) {
    artifactCharges[idx] = (art && art.charges != null) ? art.charges : 1;
  }
  return artifactCharges[idx];
}
// Entrée depuis battleAction('artifact') : valide la charge, route le ciblage.
function triggerActiveArtifact() {
  const idx  = currentBattleChar;
  const char = party[idx];
  const item = _activeArtifactFor(char);
  if (!item) { setBattleLog('Aucun artefact actif équipé.'); return; }
  const art = item.activeEffect;
  if (_artifactChargesLeft(idx, art) <= 0) {
    setBattleLog(`🏺 ${art.label} est déjà déchargé pour ce combat.`);
    return;
  }
  // Cible 1 ennemi → réutilise pendingAction (showTargetSelection). Sinon
  // (groupe allié / soi / tout ennemi) → résolution immédiate.
  if (art.target === 'enemy' && livingEnemies().length > 1) {
    showTargetSelection('artifact');
  } else {
    const tgt = (art.target === 'enemy') ? getFirstLivingEnemy() : null;
    useActiveArtifact(idx, tgt);
  }
}
// Résout l'effet actif et consomme la charge. `targetIdx` = index ennemi (cibles
// 'enemy') ou null. Trois résolveurs : elemBurst / purgeStatus / shieldGroup.
function useActiveArtifact(charIdx, targetIdx) {
  const char = party[charIdx];
  const item = _activeArtifactFor(char);
  if (!item) return;
  const art = item.activeEffect;
  if (_artifactChargesLeft(charIdx, art) <= 0) return;
  artifactCharges[charIdx] = _artifactChargesLeft(charIdx, art) - 1;

  // P5 — Bandeau « 🏺 Artefact » au déclenchement d'un artefact actif.
  UX_safe.combatBanner('🏺 Artefact', 'artifact');

  if (typeof AudioSystem !== 'undefined' && AudioSystem.playSpellCast) {
    AudioSystem.playSpellCast(art.element === 'feu' ? 'Incendio'
      : (art.element === 'glace' ? 'Glacius' : 'Protego'));
  }

  if (art.resolve === 'elemBurst') {
    // Décharge élémentaire sur une cible (respecte resist/faiblesse + combos).
    let enemy = (targetIdx != null) ? enemyGroup[targetIdx] : null;
    if (!enemy || enemy.currentHp <= 0) enemy = livingEnemies()[0];
    if (!enemy) { advanceBattleChar(); return; }
    const tIdx = enemyGroup.indexOf(enemy);
    let dmg = Math.max(1, art.power || 0);
    let suffix = '';
    if (art.element && enemy.resist?.includes(art.element)) { dmg = Math.max(1, Math.floor(dmg * RESIST_MULTIPLIER)); suffix += ' 🔰'; }
    if (art.element && enemy.weak?.includes(art.element))   { dmg = Math.floor(dmg * WEAK_MULTIPLIER); suffix += ' 💥'; }
    const combo = (typeof comboDamageMult === 'function') ? comboDamageMult(enemy, art.element || 'physique') : { mult: 1, label: null };
    if (combo.mult !== 1) { dmg = Math.max(1, Math.floor(dmg * combo.mult)); suffix += combo.label ? ` ${combo.label}` : ''; }
    enemy.currentHp -= dmg;
    setBattleLog(`🏺 ${char.name} libère ${art.label} sur ${enemy.name} : ${dmg} dégâts${suffix} !`);
    addMsg(`🏺 ${art.label} : ${dmg} dégâts sur ${enemy.name}.`, 'good');
    UX_safe.floatDmg(`enemy:${tIdx}`, dmg, 'crit');
    UX_safe.logCombat(`🏺 <b>${char.name}</b> — ${art.label} → <b>−${dmg}</b>${suffix} sur ${enemy.name}`, 'magic');
    renderEnemyGroup();
    if (checkAllEnemiesDead()) return;
  } else if (art.resolve === 'purgeStatus') {
    // Dissipe les statuts négatifs (DoT/weaken…) du groupe.
    let cleared = 0;
    activeParty().forEach(c => {
      if (c.hp <= 0 || !Array.isArray(c.statusEffects)) return;
      cleared += c.statusEffects.length;
      c.statusEffects = [];
    });
    setBattleLog(`🏺 ${char.name} invoque ${art.label} : ${cleared} altération${cleared > 1 ? 's' : ''} dissipée${cleared > 1 ? 's' : ''} !`);
    addMsg(`🏺 ${art.label} : groupe purifié.`, 'good');
    UX_safe.logCombat(`🏺 <b>${char.name}</b> — ${art.label} purifie le groupe (${cleared})`, 'good');
    updateUI();
  } else if (art.resolve === 'shieldGroup') {
    // Bouclier de groupe (Protego collectif) — `power` tours (défaut 1).
    const turns = Math.max(1, art.power || 1);
    activeParty().forEach((c, i) => {
      if (c.hp <= 0) return;
      shieldTurns[i] = Math.max(shieldTurns[i] || 0, turns);
    });
    setBattleLog(`🏺 ${char.name} déploie ${art.label} : bouclier de groupe (${turns} tour${turns > 1 ? 's' : ''}) !`);
    addMsg(`🏺 ${art.label} : bouclier de groupe.`, 'good');
    UX_safe.logCombat(`🏺 <b>${char.name}</b> — ${art.label} protège le groupe (${turns} t)`, 'magic');
    updateUI();
  } else if (art.resolve === 'hasteGroup') {
    // Lot 2 — Appel du Temps : charge la jauge de Célérité des héros vivants
    // (`power` par héros, défaut 0.5) — actions supplémentaires accélérées.
    const gain = (typeof art.power === 'number') ? art.power : 0.5;
    activeParty().forEach((c, i) => {
      if (c.hp <= 0) return;
      celeriteGauge[i] = (celeriteGauge[i] || 0) + gain;
    });
    setBattleLog(`🏺 ${char.name} libère ${art.label} : le temps s'accélère (+${gain} Célérité) !`);
    addMsg(`🏺 ${art.label} : jauge de Célérité chargée.`, 'good');
    UX_safe.logCombat(`🏺 <b>${char.name}</b> — ${art.label} accélère le groupe (+${gain} ⚡)`, 'magic');
  } else if (art.resolve === 'sapDefense') {
    // Lot 2 — Entaille d'armure : réduit la DEF d'un ennemi de `power`
    // (fraction, défaut 0.25) pour le reste du combat.
    let enemy = (targetIdx != null) ? enemyGroup[targetIdx] : null;
    if (!enemy || enemy.currentHp <= 0) enemy = livingEnemies()[0];
    if (enemy) {
      const frac   = (typeof art.power === 'number') ? art.power : 0.25;
      const before = enemy.def | 0;
      enemy.def    = Math.max(0, Math.floor(before * (1 - frac)));
      setBattleLog(`🏺 ${char.name} entaille l'armure de ${enemy.name} : DEF ${before} → ${enemy.def} !`);
      addMsg(`🏺 ${art.label} : DEF de ${enemy.name} réduite (${before} → ${enemy.def}).`, 'good');
      UX_safe.logCombat(`🏺 <b>${char.name}</b> — ${art.label} sape ${enemy.name} (DEF ${before} → ${enemy.def})`, 'magic');
      renderEnemyGroup();
    }
  } else if (art.resolve === 'succorGroup') {
    // Lot 2 — Eau de la Source : rend `power` (fraction, défaut 0.12) des
    // PV/PM max aux héros vivants.
    const frac = (typeof art.power === 'number') ? art.power : 0.12;
    activeParty().forEach(c => {
      if (c.hp <= 0) return;
      c.hp = Math.min(c.hpMax, c.hp + Math.ceil(c.hpMax * frac));
      c.sp = Math.min(c.spMax, c.sp + Math.ceil(c.spMax * frac));
    });
    setBattleLog(`🏺 ${char.name} fait circuler ${art.label} : le groupe reprend son souffle (+${Math.round(frac * 100)} % PV/PM) !`);
    addMsg(`🏺 ${art.label} : groupe restauré.`, 'good');
    UX_safe.logCombat(`🏺 <b>${char.name}</b> — ${art.label} restaure le groupe (+${Math.round(frac * 100)} %)`, 'good');
    updateUI();
  }
  advanceBattleChar();
}

// ── P2 · Positionnement Duo (combat-system-synthesis §1.1) ───
// Bascule gratuite (1×/combat) entre Phalange (défensif) et Tenaille (offensif).
// N'avance PAS le tour : action déclarative. Solo : ignorée.
function toggleDuoPosture() {
  if (partySize !== 2) { setBattleLog('La posture du Duo est sans effet en solo.'); return; }
  if (duoPostureSwitched) {
    setBattleLog('🔄 La posture a déjà été changée ce combat.');
    return;
  }
  duoPosture = (duoPosture === 'phalange') ? 'tenaille' : 'phalange';
  duoPostureSwitched = true;
  const label = duoPosture === 'phalange' ? 'Phalange (défensif)' : 'Tenaille (offensif)';
  setBattleLog(`🔄 Posture du Duo : ${label}.`);
  addMsg(`🔄 Posture : ${label}.`, 'info');
  UX_safe.logCombat(`🔄 Posture du Duo → <b>${label}</b>`, 'info');
  if (typeof updateBattleCharIndicator === 'function') updateBattleCharIndicator();
}
// Multiplicateur de dégâts Tenaille pour un héros frappant un ennemi déjà touché
// par l'AUTRE héros ce round (focus-fire +15 %). PUR (lecture globals). Solo /
// Phalange → 1. Cf. .claude/plans/combat-system-synthesis.md §1.1.
function _duoComboMult(enemyIdx, heroIdx) {
  if (partySize !== 2 || duoPosture !== 'tenaille') return 1;
  const marker = duoComboMarks[enemyIdx];
  return (marker != null && marker !== heroIdx) ? 1.15 : 1;
}
// Marque une cible comme frappée par `heroIdx` ce round (Tenaille).
function _duoMarkTarget(enemyIdx, heroIdx) {
  if (partySize !== 2 || enemyIdx < 0) return;
  if (duoComboMarks[enemyIdx] == null) duoComboMarks[enemyIdx] = heroIdx;
}

// ── P4 · Environnement en combat (combat-system-synthesis §1.4) ──
// Bonus élémentaire ambiant pour l'élément `element` (zone runique → feu/foudre
// +10 %). PUR, défensif (envModifiers absent → 0). Consommé par
// _spellElementalDamage, comme _artifactElemBonus.
function _envElemBonus(element) {
  if (!envModifiers || !envModifiers.runic || !element) return 0;
  const b = envModifiers.spellElemBonus || {};
  return b[element] || 0;
}
// Action 🌿 « Activer la rune » : 1×/combat en zone runique, étourdit l'ennemi
// le plus proche (1er vivant). Consomme le tour (advanceBattleChar).
function triggerRuneEnv() {
  if (!inBattle) return;
  if (envRuneCharge <= 0) { setBattleLog('🌿 La charge runique est déjà épuisée.'); return; }
  const idx = getFirstLivingEnemy();
  if (idx < 0) { advanceBattleChar(); return; }
  const enemy = enemyGroup[idx];
  envRuneCharge = 0;
  const char = getActiveChar();
  if (typeof applyStatus === 'function') applyStatus(enemy, 'stun', 0, 1);
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playSpellCast) AudioSystem.playSpellCast('Fulgari');
  setBattleLog(`🌿 ${char.name} libère la charge runique : ${enemy.name} est étourdi !`);
  addMsg(`🌿 Charge runique → ${enemy.name} étourdi.`, 'good');
  UX_safe.floatDmg(`enemy:${idx}`, 0, 'shield');
  UX_safe.combatBanner('🌿 Rune', 'rune');   // P5 — bandeau d'environnement
  UX_safe.logCombat(`🌿 <b>${char.name}</b> active la rune → 💫 ${enemy.name} étourdi`, 'magic');
  renderEnemyGroup();
  advanceBattleChar();
}

// showTargetSelection() → battle-ui.js

// ── Attaque physique ─────────────────────────────────────────
// Apothéose Poufsouffle (palier 18 — Souffle du Blaireau) : +23 % de
// dégâts (physiques ET sorts) tant que le combattant est au-dessus de
// 60 % de ses PV max. Récompense la robustesse du blaireau.
function _houseVigorMult(char) {
  if (typeof houseApotheosePassive !== 'function' || houseApotheosePassive() !== 'Poufsouffle') return 1;
  if (!char || !char.hpMax) return 1;
  return char.hp > char.hpMax * 0.6 ? 1.23 : 1;
}

// Apothéose Gryffondor (palier 18 — Cœur du Lion) : « Élan » — chaque
// coup critique (physique ou sort) accorde un palier de +8 % de dégâts ;
// cumul propre au combat (remis à zéro par startBattle), cap 5 paliers.
const ELAN_STEP = 0.08;
const ELAN_CAP  = 5;
function _houseElanMult(char) {
  if (typeof houseApotheosePassive !== 'function' || houseApotheosePassive() !== 'Gryffondor') return 1;
  const idx = party.indexOf(char);
  if (idx < 0) return 1;
  return 1 + ELAN_STEP * (elanStacks[idx] || 0);
}
// Met à jour le cumul d'un personnage après une action offensive : un
// crit ajoute un palier (plafonné), un coup non-critique ne change rien
// (decay écarté — cf. mesure sim, plan §6).
function _updateElan(char, didCrit) {
  if (!didCrit) return;
  if (typeof houseApotheosePassive !== 'function' || houseApotheosePassive() !== 'Gryffondor') return;
  const idx = party.indexOf(char);
  if (idx < 0) return;
  const before = elanStacks[idx] || 0;
  elanStacks[idx] = Math.min(ELAN_CAP, before + 1);
  if (elanStacks[idx] > before) {
    UX_safe.logCombat(`🦁 <b>${char.name}</b> — Élan ×${elanStacks[idx]} (+${Math.round(ELAN_STEP * elanStacks[idx] * 100)} % dégâts)`, 'good');
  }
}

// Rework D4 — pénétration de DEF par la STR : courbe de Hill (n=2), douce au
// début, quasi-linéaire au milieu, plateau vers STR_PEN_CAP. Pure. Miroir
// exact de tools/sim-difficulty.js (strPenFrac). Cf. player-stats-balance.md §2.
function _strPenFrac(str) {
  const cap = (typeof STR_PEN_CAP === 'number') ? STR_PEN_CAP : 0.50;
  const h   = (typeof STR_PEN_HALF === 'number') ? STR_PEN_HALF : 20;
  const s   = Math.max(0, str || 0);
  return cap * (s * s) / (s * s + h * h);
}

function executeAttack(targetIdx) {
  const char  = getActiveChar();
  let enemy = enemyGroup[targetIdx];
  // Garde défensive : index périmé ou cible déjà à terre → re-cible le
  // premier ennemi vivant. S'il n'en reste aucun, on abandonne le coup
  // (la fin de combat est gérée par checkAllEnemiesDead côté appelant).
  if (!enemy || enemy.currentHp <= 0) {
    const alive = livingEnemies();
    if (!alive.length) return;
    enemy = alive[0];
    targetIdx = enemyGroup.indexOf(enemy);
  }
  const rawAtk = char.atk + Math.floor(Math.random() * 4);
  // D4 — la STR du frappeur ignore une fraction de la DEF ennemie.
  const effDef = Math.max(0, (enemy.def || 0) * (1 - _strPenFrac(char.str)));
  // Maîtrise Physique (Livre « Cœur de Lion ») — buff permanent +% sur l'attaque
  // physique. Additif, défensif (0 hors maîtrise).
  const _physMast = (typeof _elementalMasteryBonus === 'function') ? _elementalMasteryBonus('physique') : 0;
  let dmg    = Math.max(1, Math.floor(mitigatedDamage(rawAtk, effDef) * _houseVigorMult(char) * _houseElanMult(char) * (1 + _physMast)));
  // Combo : un coup physique sur une cible gelée / qui saigne est amplifié.
  const combo = (typeof comboDamageMult === 'function') ? comboDamageMult(enemy, 'physique') : { mult: 1, label: null };
  if (combo.mult !== 1) dmg = Math.max(1, Math.floor(dmg * combo.mult));
  // P2 — Tenaille (Duo offensif) : focus-fire sur une cible déjà frappée par
  // l'autre héros ce round (+15 %).
  const tenaille = _duoComboMult(targetIdx, currentBattleChar);
  if (tenaille !== 1) { dmg = Math.max(1, Math.floor(dmg * tenaille)); UX_safe.combatBanner('🤝 Tenaille', 'tenaille'); }
  enemy.currentHp -= dmg;
  _duoMarkTarget(targetIdx, currentBattleChar);

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
  if (isCrit && typeof AudioSystem !== 'undefined' && AudioSystem.playCrit) AudioSystem.playCrit();
  _updateElan(char, isCrit);   // Apothéose Gryffondor — Élan
  // Huile d'arme (P12) : rider élémentaire sur l'attaque physique. Respecte
  // resist/weak + déclenche les combos de l'élément (synergie). Décrémente l'enduit.
  let oilTxt = '';
  const oil = (typeof weaponOil !== 'undefined' && weaponOil) ? weaponOil[currentBattleChar] : null;
  if (oil && oil.power > 0 && enemy.currentHp > 0) {
    let ob = oil.power;
    if (enemy.resist && enemy.resist.includes(oil.element)) ob = Math.max(1, Math.floor(ob * RESIST_MULTIPLIER));
    if (enemy.weak   && enemy.weak.includes(oil.element))   ob = Math.floor(ob * WEAK_MULTIPLIER);
    const ocombo = (typeof comboDamageMult === 'function') ? comboDamageMult(enemy, oil.element) : { mult: 1, label: null };
    if (ocombo.mult !== 1) ob = Math.max(1, Math.floor(ob * ocombo.mult));
    enemy.currentHp -= ob;
    const elemEmoji = { feu: '🔥', glace: '❄️', foudre: '⚡' }[oil.element] || '✨';
    oilTxt = ` ${elemEmoji}+${ob}${ocombo.label ? ` ${ocombo.label}` : ''}`;
    UX_safe.floatDmg(`enemy:${targetIdx}`, ob, 'dmg');
    oil.turns--;
    if (oil.turns <= 0) weaponOil[currentBattleChar] = null;
  }
  const comboTxt = combo.label ? ` ${combo.label}` : '';
  setBattleLog(`⚔️ ${char.name} frappe ${enemy.name} pour ${finalDmg} dégâts${isCrit?' (CRITIQUE !)':''}${comboTxt}${oilTxt} !`);
  UX_safe.floatDmg(`enemy:${targetIdx}`, finalDmg, isCrit ? 'crit' : 'dmg');
  if (isCrit) CFX_safe.shake('light'); // crit phys → secousse (Lot 1)
  if (isCrit) HAPTICS_safe.crit(); else HAPTICS_safe.hit(); // haptique mobile (D1)
  UX_safe.logCombat(`⚔️ <b>${char.name}</b> frappe ${enemy.name} : <b>−${finalDmg}</b>${isCrit?' 💥 CRIT':''}${comboTxt}${oilTxt}`, isCrit?'magic':'good');
  // Voix des héros — crit physique décisif (cosmétique, défensif).
  if (isCrit && typeof heroBark === 'function' && char && char.heroKey) heroBark(char.heroKey, 'crit');
  renderEnemyGroup();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

function checkAllEnemiesDead() {
  if (livingEnemies().length === 0) { endBattle(true); return true; }
  return false;
}

// ── Potions offensives jetables (P6.c) ───────────────────────
// Dégâts « alchimiques » d'un flacon lancé : potency de brassage (brewMult) +
// résistances/faiblesses élémentaires (via item.element) + combos existants
// (cible gelée/saignante). PAS de scaling MAG ni de crit de sort — c'est un
// objet, pas un sortilège : source de dégâts fiable et indépendante des PM.
// Pur (aucune mutation) → retourne { dmg, suffix }.
function _thrownPotionDamage(item, enemy) {
  const brewPotency = (typeof item.brewPotency === 'number')
    ? item.brewPotency
    : (item.brewed ? ((typeof BREW_POTENCY_BONUS !== 'undefined') ? BREW_POTENCY_BONUS : 0.25) : 0);
  let dmg = Math.max(1, Math.round((item.power || 0) * (1 + brewPotency)));
  let suffix = '';
  if (item.element && enemy.resist && enemy.resist.includes(item.element)) {
    dmg = Math.max(1, Math.floor(dmg * RESIST_MULTIPLIER)); suffix += ' 🔰';
  }
  if (item.element && enemy.weak && enemy.weak.includes(item.element)) {
    dmg = Math.floor(dmg * WEAK_MULTIPLIER); suffix += ' 💥';
  }
  const combo = (typeof comboDamageMult === 'function')
    ? comboDamageMult(enemy, item.element || 'physique') : { mult: 1, label: null };
  if (combo.mult !== 1) { dmg = Math.max(1, Math.floor(dmg * combo.mult)); suffix += combo.label ? ` ${combo.label}` : ''; }
  return { dmg, suffix };
}

// Lance le flacon `player.inventory[invIdx]` sur enemyGroup[enemyIdx].
// Consomme le tour comme une attaque (advanceBattleChar), SANS la
// contre-attaque immédiate du « boire une potion » (l'offensive EST l'action).
function throwItemAtEnemy(invIdx, enemyIdx) {
  if (!inBattle) return;
  const item  = player.inventory[invIdx];
  const enemy = enemyGroup[enemyIdx];
  if (!item || item.effect !== 'throw') return;
  if (!enemy || enemy.currentHp <= 0) return;
  const char = getActiveChar();

  const { dmg, suffix } = _thrownPotionDamage(item, enemy);
  enemy.currentHp -= dmg;

  // Statut optionnel (gel / poison / burn) posé après les dégâts.
  let statusTxt = '';
  if (item.statusId && enemy.currentHp > 0 && typeof applyStatus === 'function') {
    const sp = (typeof item.statusPower === 'number') ? item.statusPower : Math.max(1, Math.floor((item.power || 0) * 0.25));
    const st = item.statusTurns || 3;
    applyStatus(enemy, item.statusId, sp, st);
    const def = (typeof STATUS_DEFS !== 'undefined' && STATUS_DEFS[item.statusId]) || {};
    statusTxt = ` + ${def.label || item.statusId}`;
  }

  _consumeAt(invIdx, 1);
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playSpellCast) {
    AudioSystem.playSpellCast(item.element === 'feu' ? 'Incendio' : (item.element === 'glace' ? 'Glacius' : 'Diffindo'));
  }
  // Parité visuelle (C3) — un flacon jeté a désormais son burst élémentaire,
  // comme le sort équivalent (un Incendio en fiole produit du feu).
  CFX_safe.spellBurst(`enemy:${enemyIdx}`, item.element || 'physique');
  setBattleLog(`🧪 ${char.name} lance ${item.name} sur ${enemy.name} : ${dmg} dégâts${suffix}${statusTxt} !`);
  addMsg(`${char.name} lance ${item.name} (${dmg} dégâts).`, 'good');
  UX_safe.floatDmg(`enemy:${enemyIdx}`, dmg, 'dmg');
  UX_safe.logCombat(`🧪 <b>${char.name}</b> lance ${item.name} sur ${enemy.name} : <b>−${dmg}</b>${suffix}${statusTxt}`, 'magic');
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

// Flacon à dispersion (item.aoe) — applique les dégâts + statut à TOUT le
// groupe ennemi vivant. Pas de sélection de cible. Mêmes calculs que le jet
// simple (_thrownPotionDamage), résolus indépendamment par ennemi.
function throwItemAoe(invIdx) {
  if (!inBattle) return;
  const item = player.inventory[invIdx];
  if (!item || item.effect !== 'throw') return;
  const char = getActiveChar();
  const targets = enemyGroup
    .map((e, i) => ({ e, i }))
    .filter(o => o.e && o.e.currentHp > 0);
  if (!targets.length) return;

  let total = 0;
  for (const { e, i } of targets) {
    // P12 — poudre de contrôle pur (`power:0`) : aucun dégât, le statut prime.
    const dmg = (item.power > 0) ? _thrownPotionDamage(item, e).dmg : 0;
    if (dmg > 0) {
      e.currentHp -= dmg;
      total += dmg;
      UX_safe.floatDmg(`enemy:${i}`, dmg, 'dmg');
    }
    if (item.statusId && e.currentHp > 0 && typeof applyStatus === 'function') {
      const sp = (typeof item.statusPower === 'number') ? item.statusPower : Math.max(1, Math.floor((item.power || 0) * 0.25));
      applyStatus(e, item.statusId, sp, item.statusTurns || 3);
    }
  }

  _consumeAt(invIdx, 1);
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playSpellCast) {
    AudioSystem.playSpellCast(item.element === 'feu' ? 'Incendio' : (item.element === 'glace' ? 'Glacius' : 'Diffindo'));
  }
  const statusTxt = item.statusId && typeof STATUS_DEFS !== 'undefined' && STATUS_DEFS[item.statusId]
    ? ` + ${STATUS_DEFS[item.statusId].label || item.statusId}` : '';
  // Poudre de contrôle pur (0 dégât) : message centré sur le statut AoE.
  if (item.power > 0) {
    setBattleLog(`🧪 ${char.name} lance ${item.name} sur tout le groupe : ${total} dégâts au total${statusTxt} !`);
    UX_safe.logCombat(`🧪 <b>${char.name}</b> disperse ${item.name} : <b>−${total}</b> sur ${targets.length} ennemis${statusTxt}`, 'magic');
  } else {
    setBattleLog(`💨 ${char.name} disperse ${item.name} sur tout le groupe${statusTxt} !`);
    UX_safe.logCombat(`💨 <b>${char.name}</b> disperse ${item.name} sur ${targets.length} ennemis${statusTxt}`, 'magic');
  }
  addMsg(`${char.name} lance ${item.name} (${targets.length} ennemis touchés).`, 'good');
  renderEnemyGroup();
  updateUI();
  if (checkAllEnemiesDead()) return;
  advanceBattleChar();
}

// ── Passage au personnage suivant / tour des ennemis ─────────
// D5 Célérité (volet AGI) — ouverture du segment d'un héros dans un round.
// Accumule le tempo (gauge += c.celerite) ; chaque franchissement de 1.0 met une
// action supplémentaire en réserve (`celeriteExtra[idx]`), consommée par
// advanceBattleChar (re-prompt du même héros). Le TAUX — pas un seuil — pilote
// la fréquence : gain de tour fluide. Appelé UNE fois par round par héros qui
// agit (pas si étourdi/apeuré → parité avec la sim). Cf. agi-derived.md §2.3.
function _beginHeroSegment(idx) {
  const c = party[idx];
  celeriteExtra[idx] = 0;
  if (!c || !(c.celerite > 0)) return;
  celeriteGauge[idx] += c.celerite;
  while (celeriteGauge[idx] >= 1) { celeriteGauge[idx] -= 1; celeriteExtra[idx]++; }
}

function advanceBattleChar() {
  updateUI();
  UX_safe.renderTimeline();
  // Célérité : tant que le héros actif a des actions sup. en réserve, il rejoue
  // (re-prompt) au lieu d'avancer. Garde-fous : vivant + ennemis encore en vie.
  if (celeriteExtra[currentBattleChar] > 0 &&
      party[currentBattleChar] && party[currentBattleChar].hp > 0 &&
      livingEnemies().length) {
    celeriteExtra[currentBattleChar]--;
    pendingAction = null; pendingSpell = null;
    document.getElementById('target-selection').style.display = 'none';
    updateBattleCharIndicator();
    setBattleLog(`⚡ Célérité ! ${party[currentBattleChar].name} agit de nouveau...`);
    UX_safe.logCombat(`⚡ Célérité — ${party[currentBattleChar].name} gagne une action !`, 'good');
    return;
  }
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
    } else if (consumeStun(party[currentBattleChar])) {
      setBattleLog(`💫 ${party[currentBattleChar].name} est étourdi et perd son tour...`);
      UX_safe.logCombat(`💫 ${party[currentBattleChar].name} est étourdi`, 'bad');
      setTimeout(enemyTurn, 900);
    } else if (rollFearSkip(party[currentBattleChar])) {
      setBattleLog(`😱 ${party[currentBattleChar].name} est tétanisé par la peur et perd son tour...`);
      UX_safe.logCombat(`😱 ${party[currentBattleChar].name} est paralysé par la peur`, 'bad');
      setTimeout(enemyTurn, 900);
    } else {
      _beginHeroSegment(currentBattleChar);   // D5 Célérité — ouvre le segment du 2ᵉ héros
      setBattleLog(`À ${party[currentBattleChar].name} d'agir...`);
    }
  }
}

// ── Tour des ennemis ─────────────────────────────────────────
// Choix de la cible d'un ennemi selon son tempérament `enemy.ai`.
// En solo (une seule cible vivante), le résultat est trivial.
function _chooseEnemyTarget(enemy, alive) {
  if (!alive || !alive.length) return null;
  if (alive.length === 1) return alive[0];
  // P2 — Phalange (Duo défensif) : l'avant (party[0]) attire les coups (+20 %
  // de chance d'être ciblé, l'arrière d'autant moins). Évalué AVANT l'IA.
  if (partySize === 2 && duoPosture === 'phalange') {
    const front = party[0];
    if (front && front.hp > 0 && alive.includes(front) && Math.random() < 0.20) return front;
  }
  const ai = enemy.ai || 'random';
  if (ai === 'aggressive') {
    // Concentre le feu : achève la cible la plus basse en PV.
    return alive.reduce((a, b) => (b.hp < a.hp ? b : a));
  }
  if (ai === 'cautious') {
    // Neutralise d'abord la plus grosse menace offensive (ATK la plus haute).
    return alive.reduce((a, b) => ((b.atk || 0) > (a.atk || 0) ? b : a));
  }
  return alive[Math.floor(Math.random() * alive.length)];
}

// Phases de boss (data-driven). Un monstre peut porter `phases: [...]`, trié
// par seuil décroissant (`atPct`). Quand ses PV passent sous un seuil non
// encore déclenché, la phase s'applique une fois : enrage (atkMult/magMult),
// soin (healPct), et/ou gain d'une capacité (gainAbility). `_phaseIdx` suit
// l'avancement (réinitialisé car enemyGroup est reconstruit à chaque combat).
function _checkBossPhases(enemy) {
  if (!enemy.phases || !enemy.phases.length) return '';
  const maxHp = enemy.hp || enemy.currentHp || 1;
  const pct = enemy.currentHp / maxHp;
  enemy._phaseIdx = enemy._phaseIdx || 0;
  let out = '';
  for (let i = enemy._phaseIdx; i < enemy.phases.length; i++) {
    const ph = enemy.phases[i];
    if (pct > ph.atPct) break;          // seuil pas encore atteint (phases triées ↓)
    enemy._phaseIdx = i + 1;
    if (ph.atkMult) enemy.atk = Math.round((enemy.atk || 0) * ph.atkMult);
    if (ph.magMult && enemy.mag) enemy.mag = Math.round(enemy.mag * ph.magMult);
    if (ph.healPct) enemy.currentHp = Math.min(maxHp, enemy.currentHp + Math.round(maxHp * ph.healPct * _enemyHealMult(enemy)));
    if (ph.gainAbility) { enemy.abilities = enemy.abilities || []; enemy.abilities.push({ ...ph.gainAbility }); }
    const msg = ph.msg || `${enemy.name} entre dans une rage nouvelle !`;
    out += `⚡ ${msg} `;
    UX_safe.logCombat(`⚡ ${msg}`, 'bad');
  }
  if (out) renderEnemyGroup();
  return out;
}

function enemyTurn() {
  battleTurn++;
  UX_safe.logCombatTurn(battleTurn + 1);
  // Lot P4 — Reliquae Temporis : snapshot PV/PM du groupe AVANT que les ennemis
  // ne frappent (= « début du round précédent » vu du prochain tour du joueur).
  if (typeof party !== 'undefined' && typeof partySize === 'number') {
    _timeSnapshot = activeParty().map(c => ({ hp: c.hp, sp: c.sp }));
  }
  // Télégraphe (G3) : bref wind-up sur les cartes des ennemis qui s'apprêtent
  // à agir, pour que leurs actions semblent intentionnelles. Posé en tête du
  // tour, avant tout re-render (renderEnemyGroup vide le conteneur). Purement
  // visuel via CFX_safe ; n'altère ni le timing ni la résolution du tour.
  livingEnemies().forEach(e => CFX_safe.telegraph(enemyGroup.indexOf(e)));
  const alive = livingParty();
  // Voix des héros — snapshot des vivants pour détecter un KO ce round.
  const _aliveBefore = activeParty().map(c => c.hp > 0);
  let log = '';

  // Statuts persistants : tick sur les ennemis vivants en début de tour
  livingEnemies().forEach(e => { log += tickStatuses(e, true); });
  if (checkAllEnemiesDead()) { setBattleLog(log || '...'); renderEnemyGroup(); return; }

  livingEnemies().forEach(enemy => {
    // Un allié asservi a pu l'achever pendant ce même round.
    if (enemy.currentHp <= 0) return;

    // Étourdi : l'ennemi perd son tour.
    if (consumeStun(enemy)) {
      log += `💫 ${enemy.name} est étourdi et perd son tour ! `;
      UX_safe.logCombat(`💫 ${enemy.name} est étourdi`, 'good');
      return;
    }

    // Apeuré : 50 % de chance de se figer et perdre son tour.
    if (rollFearSkip(enemy)) {
      log += `😱 ${enemy.name} est tétanisé par la peur ! `;
      UX_safe.logCombat(`😱 ${enemy.name} est paralysé par la peur`, 'good');
      return;
    }

    // Asservi (Sectumsempra Imperius) : l'ennemi frappe un de ses alliés.
    if (consumeImperius(enemy)) {
      const others = livingEnemies().filter(e => e !== enemy);
      if (others.length) {
        const victim = others[Math.floor(Math.random() * others.length)];
        const dmg = mitigatedDamage(_enemyEffAtk(enemy) + Math.floor(Math.random() * 3), victim.def);
        victim.currentHp = Math.max(0, victim.currentHp - dmg);
        log += `🌀 ${enemy.name}, asservi, frappe ${victim.name} : -${dmg} PV ! `;
        UX_safe.floatDmg(`enemy:${enemyGroup.indexOf(victim)}`, dmg, 'dmg');
        UX_safe.logCombat(`🌀 ${enemy.name} (asservi) frappe ${victim.name} : <b>−${dmg}</b>`, 'good');
        renderEnemyGroup();
      } else {
        log += `🌀 ${enemy.name}, asservi, se débat dans le vide ! `;
        UX_safe.logCombat(`🌀 ${enemy.name} (asservi) perd son tour`, 'good');
      }
      return;
    }

    // Phases de boss : un seuil de PV franchi peut déclencher rage / nouvelle
    // capacité. Évalué juste avant que l'ennemi agisse (il en bénéficie ce tour).
    log += _checkBossPhases(enemy);

    const target  = _chooseEnemyTarget(enemy, alive);
    if (!target) return;
    const charIdx = party.indexOf(target);

    // Tentative de capacité spéciale
    if (tryEnemyAbility(enemy, target, charIdx, txt => { log += txt; })) return;

    // Attaque physique normale — priorité : Protego > Esquive > Garde > coup normal.
    log += _enemyPhysicalHit(enemy, target, charIdx);
  });

  // Voix des héros — un allié vient de tomber (duo) : le survivant réagit.
  // Cosmétique, défensif. Pas de bark `allyDown` en solo (aucun allié).
  if (partySize === 2 && typeof heroBark === 'function') {
    const fellIdx = _aliveBefore.findIndex((wasAlive, i) => wasAlive && party[i] && party[i].hp <= 0);
    if (fellIdx !== -1) {
      const survivor = activeParty().find((c, i) => i !== fellIdx && c.hp > 0);
      if (survivor && survivor.heroKey) heroBark(survivor.heroKey, 'allyDown');
    }
  }

  // Familiers invoqués (P2) — frappent au tournant du round (peut achever un ennemi).
  log += tickFamiliars();

  // Une riposte de garde / un familier a pu achever le dernier ennemi.
  if (livingEnemies().length === 0) { setBattleLog(log || '...'); renderEnemyGroup(); endBattle(true); return; }

  // Statuts persistants : tick sur les alliés vivants en fin de round
  activeParty().forEach(c => {
    if (c.hp > 0) log += tickStatuses(c, false);
  });

  // Régénération passive depuis l'équipement (regenHp / regenSp).
  log += applyEquipmentRegen();

  // Cooldown de regen PM de la Garde : un décompte par round écoulé.
  guardRegenCooldown = guardRegenCooldown.map(c => Math.max(0, c - 1));

  // P2 — Tenaille : les marques de focus-fire expirent à la fin du round.
  duoComboMarks = {};

  // Endgame §7.10 : Larme du Phénix Pure — auto-revive sur KO en combat.
  log += _tryAutoReviveKOChars();

  setBattleLog(log || '...');
  updateUI();

  if (allPartyKO()) {
    document.getElementById('encounter-overlay').style.display = 'none';
    document.body.classList.remove('in-battle');
    inBattle = false;
    // Duel multijoueur perdu : en mode normal, aucune conséquence (§5.3) —
    // le groupe est relevé. En Ironman, la défaite est définitive (§5.2)
    // et suit la voie triggerDeath standard (→ showIronmanResult).
    const wasDuel = mpDuelActive;
    if (wasDuel) { mpDuelActive = false; mpDuelMeta = null; }
    if (wasDuel && !ironmanMode && typeof _mpResolveDuelDefeatNormal === 'function') {
      AudioSystem.stopCombatMusic();
      _mpResolveDuelDefeatNormal();
      return;
    }
    triggerDeath(wasDuel
      ? 'Vaincu en duel — ton run s\'achève ici...'
      : 'Le groupe a été mis hors combat...');
    return;
  }

  // Garde : chaque coup mitigé consomme un palier (cf. branche guard ci-dessus).
  // Les paliers non consommés (l'ennemi a frappé un autre allié, lancé une
  // capacité, etc.) persistent — c'est le ressort de la Double-Garde.

  // En solo, on reste forcément sur le slot 0 ; en duo on bascule sur Hermione si Harry est KO.
  currentBattleChar = (partySize === 1 || party[0].hp > 0) ? 0 : 1;
  updateBattleCharIndicator();
  UX_safe.renderTimeline();

  // Le perso qui ouvre le segment héros est-il étourdi ? Si oui, son tour
  // est sauté — advanceBattleChar enchaîne (perso suivant ou tour ennemi).
  const opener = party[currentBattleChar];
  if (opener && opener.hp > 0 && consumeStun(opener)) {
    setBattleLog((log || '...') + `\n💫 ${opener.name} est étourdi et perd son tour...`);
    UX_safe.logCombat(`💫 ${opener.name} est étourdi`, 'bad');
    setTimeout(advanceBattleChar, 900);
  } else if (opener && opener.hp > 0 && rollFearSkip(opener)) {
    setBattleLog((log || '...') + `\n😱 ${opener.name} est tétanisé par la peur et perd son tour...`);
    UX_safe.logCombat(`😱 ${opener.name} est paralysé par la peur`, 'bad');
    setTimeout(advanceBattleChar, 900);
  } else {
    _beginHeroSegment(currentBattleChar);   // D5 Célérité — ouvre le segment du héros qui démarre le round
    setBattleLog((log || '...') + `\nÀ ${party[currentBattleChar].name} d'agir...`);
  }
}

// tryEnemyAbility() + castSpellInBattle() → battle-spells.js

// ── Fuite ────────────────────────────────────────────────────
function doFlee() {
  const char      = getActiveChar();
  const firstEnemy = livingEnemies()[0];
  const baseChance = char.agi > (firstEnemy?.atk || 5) ? 0.7 : 0.4;
  // D5 — Fortune : la chance du groupe améliore la fuite (bornée à 0.95).
  const F = (typeof partyFortune === 'function') ? partyFortune() : 0;
  const chance = Math.min(0.95, baseChance + F);
  const hasBroom  = player.inventory.some(i => i.id === 'broom')
                 || party.some(c => c.equipped &&
                      Object.values(c.equipped).some(it => it && it.id === 'broom'));

  if (hasBroom || Math.random() < chance) {
    endBattle(false);
    setNarrative("Le groupe fuit le combat à toute vitesse !");
    addMsg("Fuite réussie !", 'good');
  } else {
    setBattleLog(`❌ ${char.name} n'a pas pu fuir !`);
    advanceBattleChar();
  }
}


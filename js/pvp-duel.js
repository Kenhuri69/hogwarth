// ============================================================
// DUEL PvP EN DIRECT — tours alternés relayés (reliquat 4.1)
// ============================================================
// Variante LIVE du duel PvP (le duel asynchrone contre un snapshot/IA vit
// dans multiplayer.js §5). Ici deux joueurs EN LIGNE, déjà reliés par une
// VISITE inter-mondes active, s'affrontent en 1v1 (héros de tête) en tours
// alternés. Résolution « attaquant autoritaire » : chacun résout SA propre
// action localement et relaie le RÉSULTAT chiffré ; l'autre l'applique tel
// quel → pas de lockstep, pas de RNG partagée, écrans synchronisés par
// construction. Transport = canal de visite (mpPostVisitMessage /
// mpPollVisitMessages). Module autonome : n'entre PAS dans la boucle IA de
// battle.js (zéro risque de régression PvE). Cf. .claude/plans/pvp-duel-live.md.
//
// Chargé APRÈS visit-channel.js (lit _visitGetState) / multiplayer-visits.js
// (transport). Défensif et silencieux si Mondes Parallèles désactivé.
// ============================================================

const PVP_POLL_MS    = 2000;   // poll du canal pendant un duel
const PVP_TIMEOUT_MS = 30000;  // sans message adverse → forfait

// État transient du duel (non sérialisé — un duel ne survit pas au reload).
let _pvpState = null;
let _pvpPollTimer = null;
let _pvpLastIso   = null;      // curseur de poll dédié (≠ poll de visite)
let _pvpLastSeen  = 0;         // ts du dernier message adverse reçu

function _pvpEsc(s) {
  if (typeof _mpEsc === 'function') return _mpEsc(s);
  return String(s == null ? '' : s).replace(/[<>&"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

// Infos de la visite active : { role:'visitor'|'host', channelId } ou null.
function _pvpVisitInfo() {
  if (typeof parallelWorldsEnabled === 'function' && !parallelWorldsEnabled()) return null;
  if (typeof _visitGetState !== 'function') return null;
  const st = _visitGetState();
  if (!st || !st.role || !st.channelId) return null;
  return { role: st.role, channelId: st.channelId };
}

// Vrai si un duel peut être proposé : visite active, pas déjà en duel, pas
// en combat PvE.
function pvpCanDuel() {
  if (_pvpState) return false;
  if (typeof inBattle !== 'undefined' && inBattle) return false;
  return !!_pvpVisitInfo();
}

// Combattant LOCAL (héros de tête) — stats complètes pour la résolution.
function _pvpMyCombatant() {
  const c = (typeof party !== 'undefined' && party[0]) || (typeof player !== 'undefined' ? player : null);
  if (!c) return null;
  const spells = Array.isArray(c.spells) ? c.spells.slice() : [];
  return {
    name:  c.name || 'Sorcier',
    icon:  c.icon || '🧙',
    house: (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
    level: c.level || 1,
    hp: c.hpMax | 0, hpMax: c.hpMax | 0,
    sp: c.spMax | 0, spMax: c.spMax | 0,
    atk: c.atk | 0, def: c.def | 0, mag: c.mag | 0,
    agi: c.agi | 0, lck: c.lck | 0, int: c.int | 0, end: c.end | 0,
    critChance:          (c.critChance != null) ? c.critChance : 5,
    critMultiplier:      c.critMultiplier || 1.5,
    spellCritChance:     (c.spellCritChance != null) ? c.spellCritChance : 5,
    spellCritMultiplier: c.spellCritMultiplier || 1.5,
    spells: spells,
  };
}

// Données combattant transmises à l'adversaire (affichage uniquement).
function _pvpCombatantWire(m) {
  return { name: m.name, icon: m.icon, house: m.house, level: m.level, hpMax: m.hpMax };
}

// Sorts jouables en duel : offensifs (élémentaires) + soin, avec coût PM.
function _pvpSpellOf(name) {
  if (typeof SPELLS === 'undefined') return null;
  return SPELLS.find(s => s.name === name) || null;
}
function _pvpSpellCost(sp) { return (sp && (sp.cost | 0)) || 0; }
function _pvpIsOffensive(sp) { return !!(sp && sp.element && !/heal/.test(sp.effect || '')); }
function _pvpIsHeal(sp)      { return !!(sp && /heal/.test(sp.effect || '')); }
function _pvpCastableSpells() {
  const me = _pvpState && _pvpState.me;
  if (!me) return [];
  const out = [];
  for (const name of me.spells) {
    const sp = _pvpSpellOf(name);
    if (!sp) continue;
    if (!_pvpIsOffensive(sp) && !_pvpIsHeal(sp)) continue;
    out.push({ name, spell: sp, cost: _pvpSpellCost(sp), heal: _pvpIsHeal(sp) });
  }
  return out;
}

// ── Transport ───────────────────────────────────────────────
function _pvpPost(type, payload) {
  const v = _pvpVisitInfo();
  if (!v || typeof mpPostVisitMessage !== 'function') return Promise.resolve(null);
  return mpPostVisitMessage(v.channelId, v.role, type, payload);
}

async function _pvpPollOnce() {
  const v = _pvpVisitInfo();
  if (!v || typeof mpPollVisitMessages !== 'function') return;
  const rows = await mpPollVisitMessages(v.channelId, _pvpLastIso, v.role);
  if (!Array.isArray(rows)) return;
  for (const m of rows) {
    if (m && m.created_at) _pvpLastIso = m.created_at;
    if (!m || !m.type) continue;
    if (!/^duel/.test(m.type)) continue;   // ignore les messages de visite
    _pvpLastSeen = Date.now();
    _pvpDispatch(m.type, m.payload || {});
  }
  // Forfait si l'adversaire ne répond plus pendant un duel engagé.
  if (_pvpState && _pvpState.phase === 'fighting' && _pvpLastSeen
      && Date.now() - _pvpLastSeen > PVP_TIMEOUT_MS) {
    _pvpLog('Adversaire injoignable — duel interrompu.', 'bad');
    _pvpTeardown();
  }
}

function _pvpStartPoll() {
  if (_pvpPollTimer) return;
  _pvpLastSeen = Date.now();
  _pvpPollTimer = setInterval(() => { _pvpPollOnce().catch(() => {}); }, PVP_POLL_MS);
}
function _pvpStopPoll() {
  if (_pvpPollTimer) { clearInterval(_pvpPollTimer); _pvpPollTimer = null; }
}

// ── Cycle de vie ────────────────────────────────────────────
// A invite B. L'invitant jouera en premier à l'acceptation.
function pvpSendDuelInvite() {
  if (!pvpCanDuel()) {
    if (typeof addMsg === 'function') addMsg('Aucun duel possible ici (visite requise).', 'info');
    return false;
  }
  const me = _pvpMyCombatant();
  if (!me) return false;
  _pvpState = { phase: 'inviting', role: _pvpVisitInfo().role, me, opp: null, turn: null, winner: null };
  _pvpLastIso = new Date(0).toISOString();
  _pvpStartPoll();
  _pvpPost('duelInvite', { name: me.name, combatant: _pvpCombatantWire(me) });
  if (typeof addMsg === 'function') addMsg('⚔️ Invitation au duel envoyée…', 'info');
  _pvpRender();
  return true;
}

// B reçoit l'invitation (poll passif) → modale d'acceptation.
function _pvpOnInvite(p) {
  if (_pvpState) return;   // déjà occupé
  const v = _pvpVisitInfo();
  if (!v) return;
  _pvpState = {
    phase: 'invited', role: v.role, me: _pvpMyCombatant(),
    opp: _pvpHydrateOpp(p && p.combatant, p && p.name), turn: null, winner: null,
  };
  if (_pvpLastIso == null) _pvpLastIso = new Date(0).toISOString();
  _pvpStartPoll();
  _pvpRender();
}

function pvpAcceptDuel() {
  if (!_pvpState || _pvpState.phase !== 'invited') return;
  const me = _pvpState.me;
  _pvpState.phase = 'fighting';
  _pvpState.turn  = 'opp';   // l'invitant (l'autre) joue en premier
  _pvpPost('duelAccept', { name: me.name, combatant: _pvpCombatantWire(me) });
  _pvpLog('Duel engagé contre ' + _pvpEsc(_pvpState.opp.name) + ' !', 'info');
  _pvpRender();
}

function pvpDeclineDuel() {
  if (!_pvpState) return;
  _pvpPost('duelDecline', {});
  _pvpTeardown();
}

// A reçoit l'acceptation → début du combat, A joue en premier.
function _pvpOnAccept(p) {
  if (!_pvpState || _pvpState.phase !== 'inviting') return;
  _pvpState.opp   = _pvpHydrateOpp(p && p.combatant, p && p.name);
  _pvpState.phase = 'fighting';
  _pvpState.turn  = 'me';
  _pvpLog('Duel engagé contre ' + _pvpEsc(_pvpState.opp.name) + ' !', 'info');
  _pvpRender();
}

function _pvpHydrateOpp(wire, fallbackName) {
  const w = wire || {};
  const hpMax = Math.max(1, (w.hpMax | 0) || 30);
  return {
    name: w.name || fallbackName || 'Duelliste', icon: w.icon || '🧙',
    house: w.house || null, level: w.level || 1, hp: hpMax, hpMax,
  };
}

// ── Résolution d'action (côté acteur, autoritaire) ──────────
function pvpActAttack() {
  if (!_pvpMyTurn()) return;
  const me = _pvpState.me, opp = _pvpState.opp;
  const raw = (me.atk | 0) + Math.floor(Math.random() * 4);
  let dmg = (typeof mitigatedDamage === 'function') ? mitigatedDamage(raw, 0) : raw;
  let crit = false;
  if (Math.random() * 100 < (me.critChance || 5)) { dmg = Math.round(dmg * (me.critMultiplier || 1.5)); crit = true; }
  dmg = Math.max(1, dmg | 0);
  _pvpLog(me.name + ' attaque' + (crit ? ' (CRITIQUE !)' : '') + ' → ' + dmg + ' dégâts.', 'good');
  _pvpResolveOutgoing({ kind: 'attack', dmgToFoe: dmg, healSelf: 0, crit });
}

function pvpActSpell(idx) {
  if (!_pvpMyTurn()) return;
  const list = _pvpCastableSpells();
  const choice = list[idx | 0];
  if (!choice) return;
  const me = _pvpState.me;
  if ((me.sp | 0) < choice.cost) { _pvpLog('PM insuffisants.', 'bad'); return; }
  me.sp = Math.max(0, (me.sp | 0) - choice.cost);
  if (choice.heal) {
    const heal = (typeof healAmount === 'function') ? healAmount(choice.spell, me) : (choice.spell.power | 0);
    _pvpLog(me.name + ' lance ' + choice.name + ' → +' + heal + ' PV.', 'good');
    _pvpResolveOutgoing({ kind: 'heal', dmgToFoe: 0, healSelf: Math.max(1, heal | 0), spell: choice.name });
  } else {
    let dmg = (typeof spellDamage === 'function') ? spellDamage(choice.spell, me) : (choice.spell.power | 0);
    let crit = false;
    if (typeof rollSpellCrit === 'function') { const r = rollSpellCrit(dmg, me); dmg = r.dmg; crit = r.crit; }
    dmg = Math.max(1, dmg | 0);
    _pvpLog(me.name + ' lance ' + choice.name + (crit ? ' (CRITIQUE !)' : '') + ' → ' + dmg + ' dégâts.', 'good');
    _pvpResolveOutgoing({ kind: 'spell', dmgToFoe: dmg, healSelf: 0, crit, spell: choice.name });
  }
}

// Applique l'effet de MA propre action sur les deux jauges locales, relaie,
// puis passe la main (ou termine si l'adversaire tombe).
function _pvpResolveOutgoing(p) {
  const me = _pvpState.me, opp = _pvpState.opp;
  opp.hp = Math.max(0, opp.hp - (p.dmgToFoe | 0));
  me.hp  = Math.min(me.hpMax, me.hp + (p.healSelf | 0));
  p.casterSpAfter = me.sp | 0;
  _pvpPost('duelAction', p);
  if (opp.hp <= 0) { _pvpEnd(_pvpOppRole()); return; }
  _pvpState.turn = 'opp';
  _pvpRender();
}

// Applique une action ADVERSE reçue (perspective absolue : dmgToFoe = dégâts
// subis par moi ; healSelf = soin que l'adversaire s'est appliqué).
function _pvpApplyIncoming(p) {
  if (!_pvpState || _pvpState.phase !== 'fighting') return;
  const me = _pvpState.me, opp = _pvpState.opp;
  if (p.dmgToFoe) {
    me.hp = Math.max(0, me.hp - (p.dmgToFoe | 0));
    _pvpLog(opp.name + ' inflige ' + (p.dmgToFoe | 0) + ' dégâts' + (p.crit ? ' (CRITIQUE !)' : '') + '.', 'bad');
  }
  if (p.healSelf) {
    opp.hp = Math.min(opp.hpMax, opp.hp + (p.healSelf | 0));
    _pvpLog(opp.name + ' se soigne de ' + (p.healSelf | 0) + ' PV.', 'bad');
  }
  if (me.hp <= 0) { _pvpEnd(_pvpState.role); return; }
  _pvpState.turn = 'me';
  _pvpRender();
}

function _pvpMyTurn() { return _pvpState && _pvpState.phase === 'fighting' && _pvpState.turn === 'me'; }
function _pvpOppRole() { return _pvpState.role === 'visitor' ? 'host' : 'visitor'; }

// Fin du duel : `loserRole` = rôle (visitor|host) du vaincu. Idempotent.
function _pvpEnd(loserRole) {
  if (!_pvpState || _pvpState.phase === 'ended') return;
  _pvpState.phase = 'ended';
  _pvpState.winner = (loserRole === _pvpState.role) ? 'opp' : 'me';
  _pvpPost('duelEnd', { loser: loserRole });
  const won = _pvpState.winner === 'me';
  if (typeof addMsg === 'function') {
    addMsg(won ? '🏆 Tu remportes le duel contre ' + _pvpState.opp.name + ' !'
               : '💥 ' + _pvpState.opp.name + ' remporte le duel.', won ? 'good' : 'bad');
  }
  if (typeof setNarrative === 'function') {
    setNarrative(won ? 'Victoire en duel sur ' + _pvpState.opp.name + ' ! L\'honneur est sauf.'
                     : 'Défaite en duel. ' + _pvpState.opp.name + ' te salue, beau joueur.');
  }
  if (won && typeof AudioSystem !== 'undefined' && AudioSystem.playVictory) AudioSystem.playVictory();
  _pvpLog(won ? 'VICTOIRE' : 'DÉFAITE', won ? 'good' : 'bad');
  _pvpStopPoll();
  _pvpRender();
}

function _pvpOnEnd(p) { _pvpEnd((p && p.loser) || _pvpOppRole()); }

// Abandon volontaire / fermeture.
function pvpQuitDuel() {
  if (_pvpState && _pvpState.phase === 'fighting') {
    _pvpPost('duelEnd', { loser: _pvpState.role });   // abandonner = perdre
  }
  _pvpTeardown();
}

function _pvpTeardown() {
  _pvpStopPoll();
  _pvpState = null;
  _pvpLastSeen = 0;
  const ov = document.getElementById('pvp-duel-overlay');
  if (ov) ov.style.display = 'none';
}

// Dispatch d'un message de duel reçu.
function _pvpDispatch(type, p) {
  switch (type) {
    case 'duelInvite':  _pvpOnInvite(p); break;
    case 'duelAccept':  _pvpOnAccept(p); break;
    case 'duelDecline':
      if (_pvpState && _pvpState.phase === 'inviting') {
        if (typeof addMsg === 'function') addMsg('Duel décliné.', 'info');
        _pvpTeardown();
      }
      break;
    case 'duelAction':  _pvpApplyIncoming(p); break;
    case 'duelEnd':     _pvpOnEnd(p); break;
    case 'duelQuit':    if (_pvpState) _pvpEnd(_pvpOppRole()); break;
  }
}

// Démarre le poll passif des invitations entrantes dès qu'une visite est
// active (appelé par visit-channel à l'ouverture de session de visite).
function pvpAttachVisit() {
  if (!_pvpVisitInfo()) return;
  if (_pvpLastIso == null) _pvpLastIso = new Date(0).toISOString();
  _pvpStartPoll();
}
function pvpDetachVisit() { if (!_pvpState) _pvpTeardown(); }

// État public (tests + UI).
function _pvpGetState() {
  if (!_pvpState) return { phase: 'idle' };
  return {
    phase: _pvpState.phase, role: _pvpState.role, turn: _pvpState.turn,
    winner: _pvpState.winner,
    myHp: _pvpState.me && _pvpState.me.hp, mySp: _pvpState.me && _pvpState.me.sp,
    oppHp: _pvpState.opp && _pvpState.opp.hp, oppName: _pvpState.opp && _pvpState.opp.name,
  };
}

// ── UI — overlay de duel ────────────────────────────────────
function _pvpLog(html, kind) {
  if (!_pvpState) return;
  _pvpState.log = _pvpState.log || [];
  _pvpState.log.push({ html, kind: kind || 'info' });
  if (_pvpState.log.length > 8) _pvpState.log.shift();
  _pvpRender();
}

function _pvpBar(cur, max, cls) {
  const pct = Math.max(0, Math.min(100, Math.round((cur / Math.max(1, max)) * 100)));
  return '<div class="pvp-bar"><span class="pvp-bar-fill ' + cls + '" style="width:' + pct + '%"></span>'
       + '<span class="pvp-bar-txt">' + (cur | 0) + ' / ' + (max | 0) + '</span></div>';
}

function _pvpCombatantCard(c, side, isSp) {
  if (!c) return '';
  return '<div class="pvp-fighter pvp-' + side + '">'
    +   '<div class="pvp-fighter-head"><span class="pvp-fighter-icon">' + _pvpEsc(c.icon || '🧙') + '</span>'
    +     '<span class="pvp-fighter-name">' + _pvpEsc(c.name) + '</span>'
    +     '<span class="pvp-fighter-lvl">Niv. ' + (c.level | 0) + '</span></div>'
    +   _pvpBar(c.hp, c.hpMax, 'pvp-hp')
    +   (isSp ? _pvpBar(c.sp, c.spMax, 'pvp-sp') : '')
    + '</div>';
}

function _pvpActionsHtml() {
  if (!_pvpMyTurn()) {
    return '<div class="pvp-wait">⏳ Au tour de ' + _pvpEsc(_pvpState.opp.name) + '…</div>';
  }
  const spells = _pvpCastableSpells().map((s, i) =>
    '<button class="pvp-act pvp-act-spell" onclick="pvpActSpell(' + i + ')"'
    + ((_pvpState.me.sp | 0) < s.cost ? ' disabled' : '') + '>'
    + (s.heal ? '💚 ' : '✨ ') + _pvpEsc(s.name) + ' <small>(' + s.cost + ' PM)</small></button>'
  ).join('');
  return '<div class="pvp-actions">'
    +   '<button class="pvp-act pvp-act-atk" onclick="pvpActAttack()">🗡️ Attaquer</button>'
    +   spells
    + '</div>';
}

function _pvpRender() {
  let ov = document.getElementById('pvp-duel-overlay');
  if (!ov) return;
  const panel = document.getElementById('pvp-duel-panel');
  if (!panel) return;
  if (!_pvpState) { ov.style.display = 'none'; return; }
  ov.style.display = 'flex';
  const s = _pvpState;
  let body = '';
  if (s.phase === 'inviting') {
    body = '<div class="pvp-title">⚔️ Duel</div>'
      + '<div class="pvp-info">Invitation envoyée… en attente de réponse.</div>'
      + '<div class="pvp-end-actions"><button class="pvp-act" onclick="pvpQuitDuel()">Annuler</button></div>';
  } else if (s.phase === 'invited') {
    body = '<div class="pvp-title">⚔️ Défi en duel</div>'
      + '<div class="pvp-info"><b>' + _pvpEsc(s.opp.name) + '</b> te provoque en duel !</div>'
      + '<div class="pvp-end-actions">'
      +   '<button class="pvp-act pvp-act-atk" onclick="pvpAcceptDuel()">⚔️ Accepter</button>'
      +   '<button class="pvp-act" onclick="pvpDeclineDuel()">Décliner</button>'
      + '</div>';
  } else if (s.phase === 'fighting') {
    const logHtml = (s.log || []).map(l => '<div class="pvp-log-line pvp-log-' + l.kind + '">' + l.html + '</div>').join('');
    body = '<div class="pvp-title">⚔️ Duel — ' + _pvpEsc(s.me.name) + ' vs ' + _pvpEsc(s.opp.name) + '</div>'
      + '<div class="pvp-arena">' + _pvpCombatantCard(s.me, 'me', true) + _pvpCombatantCard(s.opp, 'opp', false) + '</div>'
      + _pvpActionsHtml()
      + '<div class="pvp-log">' + logHtml + '</div>'
      + '<div class="pvp-end-actions"><button class="pvp-act pvp-act-quit" onclick="pvpQuitDuel()">Abandonner</button></div>';
  } else if (s.phase === 'ended') {
    const won = s.winner === 'me';
    body = '<div class="pvp-title pvp-' + (won ? 'win' : 'lose') + '">' + (won ? '🏆 Victoire' : '💥 Défaite') + '</div>'
      + '<div class="pvp-info">' + (won ? 'Tu remportes le duel contre ' : 'Tu t\'inclines face à ')
      + '<b>' + _pvpEsc(s.opp.name) + '</b>.</div>'
      + '<div class="pvp-end-actions"><button class="pvp-act" onclick="pvpQuitDuel()">Fermer</button></div>';
  }
  panel.innerHTML = body;
}

if (typeof window !== 'undefined') {
  window.pvpCanDuel       = pvpCanDuel;
  window.pvpSendDuelInvite = pvpSendDuelInvite;
  window.pvpAcceptDuel    = pvpAcceptDuel;
  window.pvpDeclineDuel   = pvpDeclineDuel;
  window.pvpActAttack     = pvpActAttack;
  window.pvpActSpell      = pvpActSpell;
  window.pvpQuitDuel      = pvpQuitDuel;
  window.pvpAttachVisit   = pvpAttachVisit;
  window.pvpDetachVisit   = pvpDetachVisit;
  window._pvpGetState     = _pvpGetState;
  window._pvpPollOnce     = _pvpPollOnce;
  window._pvpDispatch     = _pvpDispatch;
}

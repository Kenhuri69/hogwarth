// ============================================================
// MONDES PARALLÈLES — Atelier du Voyageur + Verrou de Sang (Phase H)
// ============================================================
// Surface publique :
//   openBloodSealTargetModal(caster)  → modale "Choisir le monstre à
//                                       sceller". Pose le Verrou via
//                                       _postBloodSeal au choix.
//   openAtelierVoyageur()             → modale "Atelier du Voyageur"
//                                       (craft Set Voyageur).
//   openVisitorClaimsModal()          → modale "Verrous résolus" au
//                                       démarrage du visiteur.
//   _claimResolvedSeals()             → claim asynchrone (REST poll).
//
// Cf. .claude/plans/parallel-worlds.md §6.9 / §6.10.
// ============================================================

(function () {
  'use strict';

  const SEAL_PM_COST      = 5;
  const SEAL_ESSENCE_COST = 1;
  const SEAL_RESOLVED_REWARD = { essence: 3, fragmentChance: 0.20 };
  const SEAL_FLED_REWARD     = { essence: 1, fragmentChance: 0.00 };

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Icônes PNG des monnaies d'Outremonde (remplacent les emoji ✨ / 🔹).
  const _ESS  = '<img class="ui-icon ui-icon-md" src="img/icons/essence_outremonde.png" alt="Essence">';
  const _FRAG = '<img class="ui-icon ui-icon-md" src="img/icons/fragment_outremonde.png" alt="Fragment">';
  const _ATELIER_TITLE_ICON = '<img class="ui-icon ui-icon-xl" src="img/icons/atelier.png" alt="">';
  const _VERROU = '<img class="ui-icon ui-icon-xl" src="img/icons/spells/verrou_de_sang.png" alt="">';
  // Icône PNG d'un cosmétique / souvenir d'Outremonde (par id).
  function _outremondeIcon(id) {
    return '<img class="ui-icon ui-icon-xl" src="img/icons/outremonde/' + _esc(id) + '.png" alt="">';
  }
  // Icône d'une carte (item ou sort) via les registres PNG partagés ;
  // repli sur l'emoji de la donnée si le helper n'est pas chargé.
  function _cardIcon(entry, kind) {
    if (kind === 'spell' && typeof getSpellIconHtml === 'function')
      return getSpellIconHtml(entry, 'ui-icon-xl');
    if (kind === 'item' && typeof getItemIconHtml === 'function')
      return getItemIconHtml(entry, 'ui-icon-xl');
    return _esc(entry && entry.icon || '');
  }

  // ── Modale de pose du Verrou ────────────────────────────────
  // Liste les monstres éligibles à l'étage du host (visitSession
  // currentFloor). L'utilisateur choisit ; pose la ligne dans `mp_threats`
  // via _postBloodSeal puis ajoute à outremondePendingSeals.
  function openBloodSealTargetModal(caster) {
    if (typeof visitSession === 'undefined' || !visitSession
        || visitSession.role !== 'visitor') return;
    if (typeof MONSTERS === 'undefined' || !Array.isArray(MONSTERS)) return;
    const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
    const pool = MONSTERS.filter(m =>
      (m.minFloor === undefined || floor >= m.minFloor) &&
      (m.maxFloor === undefined || m.maxFloor === null || floor <= m.maxFloor));
    if (!pool.length) {
      if (typeof addMsg === 'function') addMsg('Aucun monstre à sceller à cet étage.', 'bad');
      return;
    }

    const modal = _ensureModalElement();
    if (!modal) return;

    const cards = pool.slice(0, 12).map(m => `
      <button class="atelier-card" type="button"
              onclick="_chooseBloodSealMonster('${_esc(m.id)}', '${_esc(caster && caster.name || '')}')">
        <div class="atelier-card-icon">${typeof getMonsterIconHtml === 'function' ? getMonsterIconHtml(m, 48) : _esc(m.icon || '')}</div>
        <div class="atelier-card-name">${_esc(m.name)}</div>
        <div class="atelier-card-meta">Étage ${m.minFloor || 1}+ · HP ${m.hp || '?'}</div>
      </button>`).join('');

    modal.innerHTML = `
      <div class="atelier-panel">
        <button class="atelier-close" type="button" onclick="closeAtelierVoyageur()" aria-label="Fermer">✕</button>
        <h2 class="atelier-title">${_VERROU} Verrou de Sang</h2>
        <p class="atelier-subtitle">
          Choisis la créature à sceller dans le plan de
          <strong>${_esc(visitSession.hostName || 'ton hôte')}</strong>
          (étage ${floor}). Coût : ${SEAL_PM_COST} PM + ${SEAL_ESSENCE_COST}
          ${_ESS} Essence. Réserve : ${outremondeEssence} ${_ESS}.
        </p>
        <div class="atelier-grid">${cards}</div>
      </div>`;
    modal.style.display = 'flex';
  }

  async function _chooseBloodSealMonster(monsterId, casterName) {
    if (typeof visitSession === 'undefined' || !visitSession
        || visitSession.role !== 'visitor') return;
    // Re-vérifie la solvabilité (essence/PM ont pu changer entre ouverture et clic).
    const caster = (typeof party !== 'undefined' && party.find(c => c && c.name === casterName)) || party[0];
    if (!caster || caster.sp < SEAL_PM_COST) {
      if (typeof addMsg === 'function') addMsg('Pas assez de magie.', 'bad');
      return;
    }
    if (typeof outremondeEssence !== 'number' || outremondeEssence < SEAL_ESSENCE_COST) {
      if (typeof addMsg === 'function') addMsg("Il te faut une Essence d'Outremonde.", 'bad');
      return;
    }
    caster.sp -= SEAL_PM_COST;
    outremondeEssence -= SEAL_ESSENCE_COST;

    const payload = {
      visitor_id:   (typeof getMpPlayerId === 'function') ? getMpPlayerId() : 'local',
      visitor_name: (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
      host_id:      visitSession.hostId || 'unknown-host',
      floor:        (typeof currentFloor === 'number') ? currentFloor : 1,
      x:            (typeof playerX === 'number') ? playerX : 0,
      y:            (typeof playerY === 'number') ? playerY : 0,
      monster_id:   monsterId,
      status:       'pending'
    };

    // Pose côté serveur — tolérant (un échec ne consomme pas l'essence
    // déjà déduite, mais on accepte ce risque pour V1 ; un retry
    // ultérieur n'est pas conçu).
    let posted = null;
    if (typeof mpPostBloodSeal === 'function') {
      try { posted = await mpPostBloodSeal(payload); } catch (e) { posted = null; }
    }

    // Trace locale dans outremondePendingSeals — même si le post REST a
    // échoué, le joueur voit le Verrou en attente (cohérent avec son
    // intention). Au pire le serveur ne le résoudra jamais et le slot
    // restera. Pour V1c.1 : retry périodique des verrous orphelins.
    const entry = {
      id:         (posted && posted.id) || ('local-' + Date.now()),
      hostId:     visitSession.hostId,
      hostName:   visitSession.hostName || 'Sorcier',
      monsterId,
      floor:      payload.floor,
      x:          payload.x,
      y:          payload.y,
      postedAt:   Date.now()
    };
    if (!Array.isArray(outremondePendingSeals)) outremondePendingSeals = [];
    outremondePendingSeals.push(entry);

    closeAtelierVoyageur();
    if (typeof addMsg === 'function') {
      const mname = (MONSTERS.find(m => m.id === monsterId) || {}).name || monsterId;
      addMsg(`${_VERROU} Verrou posé — ${mname} hantera ce plan jusqu'à ce que ${entry.hostName} le résolve.`, 'magic');
    }
    if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playSpellCast === 'function') {
      AudioSystem.playSpellCast('Verrou de Sang');
    }
    // V1c.1 — animation rune rouge tracée au sol (overlay 1,2 s).
    _playBloodSealAnim();
    if (typeof updateUI === 'function') updateUI();
  }

  function _ensureModalElement() {
    let modal = document.getElementById('atelier-voyageur-overlay');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'atelier-voyageur-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.style.display = 'none';
      document.body.appendChild(modal);
    }
    return modal;
  }

  function closeAtelierVoyageur() {
    const modal = document.getElementById('atelier-voyageur-overlay');
    if (modal) modal.style.display = 'none';
  }

  // ── Atelier du Voyageur — modale multi-onglets ────────────────
  // 4 onglets : Set Voyageur (craft 5 pièces) / Sorts cross-plan (4
  // sorts exclusifs) / Cosmétiques (12 unlocks) / Souvenirs (6 passifs
  // débloqués automatiquement). État d'onglet local au module.
  let _atelierTab = 'set';

  function openAtelierVoyageur(tab) {
    if (tab) _atelierTab = tab;
    const modal = _ensureModalElement();
    if (!modal) return;

    const tabs = [
      ['set',       'Set Voyageur'],
      ['spells',    'Sorts'],
      ['cosmetics', 'Cosmétiques'],
      ['souvenirs', 'Souvenirs']
    ];
    const tabsHtml = tabs.map(([id, label]) =>
      `<button class="atelier-tab ${_atelierTab === id ? 'active' : ''}" type="button"`
      + ` onclick="openAtelierVoyageur('${id}')">${_esc(label)}</button>`).join('');

    let body = '';
    if (_atelierTab === 'set')        body = _renderAtelierSetTab();
    else if (_atelierTab === 'spells') body = _renderAtelierSpellsTab();
    else if (_atelierTab === 'cosmetics') body = _renderAtelierCosmeticsTab();
    else if (_atelierTab === 'souvenirs') body = _renderAtelierSouvenirsTab();

    modal.innerHTML = `
      <div class="atelier-panel atelier-panel-wide">
        <button class="atelier-close" type="button" onclick="closeAtelierVoyageur()" aria-label="Fermer">✕</button>
        <h2 class="atelier-title">${_ATELIER_TITLE_ICON} Atelier du Voyageur</h2>
        <p class="atelier-subtitle">
          Réserve d'Essences d'Outremonde : <strong>${outremondeEssence}</strong> ${_ESS} ·
          Fragments : <strong>${outremondeFragments}</strong> ${_FRAG}
        </p>
        <div class="atelier-tabs">${tabsHtml}</div>
        <div class="atelier-tabbody">${body}</div>
      </div>`;
    modal.style.display = 'flex';
  }

  function _renderAtelierSetTab() {
    const items = (typeof ITEMS !== 'undefined' && Array.isArray(ITEMS))
      ? ITEMS.filter(it => it.family === 'voyageur') : [];
    const owned = (typeof player !== 'undefined' && Array.isArray(player.inventory))
      ? new Set(player.inventory.map(it => it.id)) : new Set();
    const equipped = new Set();
    if (typeof party !== 'undefined' && Array.isArray(party)) {
      party.forEach(c => {
        if (!c || !c.equipped) return;
        Object.values(c.equipped).forEach(it => { if (it && it.id) equipped.add(it.id); });
      });
    }
    const cards = items.map(it => {
      const cost = it._outremondeCost || 0;
      const isOwned    = owned.has(it.id);
      const isEquipped = equipped.has(it.id);
      const affordable = outremondeEssence >= cost;
      let badge = '';
      if (isEquipped)       badge = '<span class="atelier-badge done">Équipé</span>';
      else if (isOwned)     badge = '<span class="atelier-badge done">Possédé</span>';
      else if (!affordable) badge = '<span class="atelier-badge locked">' + cost + ' ' + _ESS + '</span>';
      else                  badge = '<button class="atelier-craft-btn" type="button" onclick="_craftVoyageurPiece(\'' + _esc(it.id) + '\')">Forger (' + cost + ' ' + _ESS + ')</button>';
      const stats = [];
      if (it.bonusInt) stats.push('+' + it.bonusInt + ' INT');
      if (it.bonusAgi) stats.push('+' + it.bonusAgi + ' AGI');
      if (it.bonusMag) stats.push('+' + it.bonusMag + ' MAG');
      if (it.bonusLck) stats.push('+' + it.bonusLck + ' LCK');
      if (it.regenSp)  stats.push('regen ' + it.regenSp + ' PM/tour');
      return `
        <div class="atelier-card ${isOwned || isEquipped ? 'owned' : ''} ${affordable ? '' : 'locked'}">
          <div class="atelier-card-icon">${_cardIcon(it, 'item')}</div>
          <div class="atelier-card-name">${_esc(it.name)}</div>
          <div class="atelier-card-stats">${stats.join(' · ')}</div>
          <div class="atelier-card-desc">${_esc(it.desc || '')}</div>
          <div class="atelier-card-action">${badge}</div>
        </div>`;
    }).join('');
    return `
      <div class="atelier-grid atelier-grid-set">${cards || '<p>Aucune pièce disponible.</p>'}</div>
      <p class="atelier-footnote">
        Bonus de Set : 2 → +1 LCK ; 3 → +5 % crit de sort ; 4 → +2 regen SP ; 5 → preview donjon distant.
      </p>`;
  }

  function _renderAtelierSpellsTab() {
    if (typeof SPELLS === 'undefined') return '<p>Sorts indisponibles.</p>';
    const crossSpells = SPELLS.filter(s => s._cross);
    const ownedSet = new Set();
    if (typeof party !== 'undefined' && Array.isArray(party)) {
      party.forEach(c => { if (c && Array.isArray(c.spells)) c.spells.forEach(n => ownedSet.add(n)); });
    }
    const cards = crossSpells.map(s => {
      const known = ownedSet.has(s.name);
      const cost = s.cost || 0;   // coût d'achat = coût PM canonique pour V1
      const affordable = outremondeEssence >= cost;
      let badge = '';
      if (known)            badge = '<span class="atelier-badge done">Appris</span>';
      else if (!affordable) badge = '<span class="atelier-badge locked">' + cost + ' ' + _ESS + '</span>';
      else                  badge = '<button class="atelier-craft-btn" type="button" onclick="_buyCrossSpell(\'' + _esc(s.name) + '\')">Apprendre (' + cost + ' ' + _ESS + ')</button>';
      return `
        <div class="atelier-card ${known ? 'owned' : ''} ${affordable ? '' : 'locked'}">
          <div class="atelier-card-icon">${_cardIcon(s, 'spell')}</div>
          <div class="atelier-card-name">${_esc(s.name)}</div>
          <div class="atelier-card-desc">${_esc(s.desc || '')}</div>
          <div class="atelier-card-action">${badge}</div>
        </div>`;
    }).join('');
    return `
      <div class="atelier-grid atelier-grid-set">${cards || '<p>Aucun sort disponible.</p>'}</div>
      <p class="atelier-footnote">Les sorts cross-plan sont appris par TOUS les membres du groupe.</p>`;
  }

  function _renderAtelierCosmeticsTab() {
    if (typeof OUTREMONDE_COSMETICS === 'undefined') return '<p>Aucun cosmétique.</p>';
    const sections = [
      { key:'aura',    title:'Auras de visite' },
      { key:'portal',  title:'Skins de portail' },
      { key:'fissure', title:'Skins de fissure' }
    ];
    const activeId = {
      aura:    outremondeActiveAura,
      portal:  outremondeActivePortalSkin,
      fissure: outremondeActiveFissureSkin
    };
    const html = sections.map(sec => {
      const items = OUTREMONDE_COSMETICS.filter(c => c.kind === sec.key);
      const cards = items.map(c => {
        const owned    = outremondeCosmetics.has(c.id);
        const active   = activeId[sec.key] === c.id;
        const afford   = outremondeEssence >= c.essCost && outremondeFragments >= c.fragCost;
        let badge = '';
        if (active)       badge = '<button class="atelier-craft-btn active" type="button" onclick="_toggleCosmetic(\'' + _esc(c.id) + '\')">Actif — désactiver</button>';
        else if (owned)   badge = '<button class="atelier-craft-btn" type="button" onclick="_toggleCosmetic(\'' + _esc(c.id) + '\')">Activer</button>';
        else if (!afford) badge = '<span class="atelier-badge locked">' + c.essCost + ' ' + _ESS + ' + ' + c.fragCost + ' ' + _FRAG + '</span>';
        else              badge = '<button class="atelier-craft-btn" type="button" onclick="_buyCosmetic(\'' + _esc(c.id) + '\')">Acheter (' + c.essCost + ' ' + _ESS + ' + ' + c.fragCost + ' ' + _FRAG + ')</button>';
        return `
          <div class="atelier-card ${owned ? 'owned' : ''} ${afford ? '' : 'locked'}" style="border-color:${c.palette}">
            <div class="atelier-card-icon">${_outremondeIcon(c.id)}</div>
            <div class="atelier-card-name">${_esc(c.name)}</div>
            <div class="atelier-card-desc">${_esc(c.desc || '')}</div>
            <div class="atelier-card-action">${badge}</div>
          </div>`;
      }).join('');
      return `
        <div class="atelier-section">
          <div class="panel-title" style="margin:8px 0 6px">⸻ ${_esc(sec.title)} ⸻</div>
          <div class="atelier-grid atelier-grid-set">${cards}</div>
        </div>`;
    }).join('');
    return html;
  }

  function _renderAtelierSouvenirsTab() {
    if (typeof OUTREMONDE_SOUVENIRS === 'undefined') return '<p>Aucun souvenir défini.</p>';
    const m = outremondeMetrics || {};
    const metricsLine = `Voyages : ${m.visitsTotal || 0} · Hôtes uniques : ${(m.uniqueHosts && m.uniqueHosts.size) || 0} · Verrous résolus : ${m.sealsResolved || 0} · Échos défaits : ${m.echosDefeated || 0}`;
    const cards = OUTREMONDE_SOUVENIRS.map(s => {
      const unlocked = outremondeSouvenirs && outremondeSouvenirs.has(s.id);
      const bonuses = [];
      const b = s.bonus || {};
      if (b.bonusAtk) bonuses.push('+' + b.bonusAtk + ' ATK');
      if (b.bonusMag) bonuses.push('+' + b.bonusMag + ' MAG');
      if (b.bonusInt) bonuses.push('+' + b.bonusInt + ' INT');
      if (b.bonusAgi) bonuses.push('+' + b.bonusAgi + ' AGI');
      if (b.bonusLck) bonuses.push('+' + b.bonusLck + ' LCK');
      const badge = unlocked
        ? '<span class="atelier-badge done">Débloqué</span>'
        : '<span class="atelier-badge locked">Verrouillé</span>';
      return `
        <div class="atelier-card ${unlocked ? 'owned' : 'locked'}">
          <div class="atelier-card-icon">${_outremondeIcon(s.id)}</div>
          <div class="atelier-card-name">${_esc(s.name)}</div>
          <div class="atelier-card-stats">${bonuses.join(' · ')}</div>
          <div class="atelier-card-desc">${_esc(s.desc || '')}</div>
          <div class="atelier-card-action">${badge}</div>
        </div>`;
    }).join('');
    return `
      <p class="atelier-footnote" style="margin:0 0 8px">${_esc(metricsLine)}</p>
      <div class="atelier-grid atelier-grid-set">${cards}</div>`;
  }

  function _buyCrossSpell(name) {
    if (typeof SPELLS === 'undefined') return;
    const sp = SPELLS.find(s => s.name === name);
    if (!sp) return;
    const cost = sp.cost || 0;
    if (outremondeEssence < cost) {
      if (typeof addMsg === 'function') addMsg("Pas assez d'essences.", 'bad');
      return;
    }
    // Évite double-paiement si déjà appris par un perso.
    if (Array.isArray(party) && party.some(c => c && Array.isArray(c.spells) && c.spells.includes(name))) {
      if (typeof addMsg === 'function') addMsg('Ce sort est déjà appris.', '');
      return;
    }
    outremondeEssence -= cost;
    party.forEach(c => {
      if (!c) return;
      if (!Array.isArray(c.spells)) c.spells = [];
      if (!c.spells.includes(name)) c.spells.push(name);
    });
    if (typeof addMsg === 'function') {
      addMsg(`${name} appris par le groupe. Réserve : ${outremondeEssence} ${_ESS}.`, 'good');
    }
    if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playLevelUp === 'function') {
      AudioSystem.playLevelUp();
    }
    openAtelierVoyageur();
    if (typeof safeCall === 'function') safeCall('autoSave', 'cross-spell-bought');
  }

  function _craftVoyageurPiece(itemId) {
    const item = ITEMS.find(it => it.id === itemId);
    if (!item) return;
    const cost = item._outremondeCost || 0;
    if (typeof outremondeEssence !== 'number' || outremondeEssence < cost) {
      if (typeof addMsg === 'function') addMsg("Pas assez d'Essence d'Outremonde.", 'bad');
      return;
    }
    if (typeof tryAddItem === 'function') {
      if (!tryAddItem({ ...item }, { silent: false })) {
        if (typeof addMsg === 'function') addMsg('Inventaire plein.', 'bad');
        return;
      }
    } else {
      player.inventory.push({ ...item });
    }
    outremondeEssence -= cost;
    if (typeof addMsg === 'function') {
      addMsg(`${typeof getItemIconHtml === 'function' ? getItemIconHtml(item, 'ui-icon-md') : ''} ${item.name} forgé(e) ! Réserve : ${outremondeEssence} ${_ESS}.`, 'good');
    }
    if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playLevelUp === 'function') {
      AudioSystem.playLevelUp();
    }
    openAtelierVoyageur();   // re-render
    if (typeof updateUI === 'function') updateUI();
    if (typeof safeCall === 'function') safeCall('autoSave', 'voyageur-craft');
  }

  // ── Claim asynchrone des Verrous résolus ─────────────────────
  // Appelé au démarrage de la partie : poll des Verrous où visitor_id=me
  // et status ∈ {resolved, fled} et claimed_at IS NULL. Pour chaque
  // entrée non-claimée → +essences (et/ou fragment) + claim côté serveur.
  // Modale récapitulative affichée si au moins 1 verrou claimé.
  async function _claimResolvedSeals() {
    if (typeof mpListVisitorResolvedSeals !== 'function') return null;
    if (typeof getMpPlayerId !== 'function') return null;
    let rows = null;
    try { rows = await mpListVisitorResolvedSeals(getMpPlayerId()); } catch (e) { rows = null; }
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const claims = [];
    for (const row of rows) {
      // Récompenses §6.10 : resolved = +3 ess + 20% fragment, fled = +1 ess.
      const reward = row.status === 'fled' ? SEAL_FLED_REWARD : SEAL_RESOLVED_REWARD;
      let gainEss = reward.essence;
      let gainFrag = 0;
      if (reward.fragmentChance > 0 && Math.random() < reward.fragmentChance) {
        gainFrag = 1;
      }
      outremondeEssence  += gainEss;
      outremondeFragments += gainFrag;
      // V1c.1 — incrémente la métrique sealsResolved pour les souvenirs
      // passifs (un Verrou « fled » compte aussi : c'est un voyage qui a
      // déclenché un événement chez le host).
      if (outremondeMetrics) outremondeMetrics.sealsResolved += 1;
      // Retire du tableau pending local si présent.
      if (Array.isArray(outremondePendingSeals)) {
        outremondePendingSeals = outremondePendingSeals.filter(s => s.id !== row.id);
      }
      // Claim côté serveur — tolérant.
      if (typeof mpClaimSeal === 'function') {
        try { await mpClaimSeal(row.id); } catch (e) { /* tolérant */ }
      }
      claims.push({ row, gainEss, gainFrag });
    }

    if (claims.length) {
      _showClaimsModal(claims);
      if (typeof updateUI === 'function') updateUI();
      // V1c.1 — métriques mises à jour → check des souvenirs.
      _checkSouvenirs();
      if (typeof safeCall === 'function') safeCall('autoSave', 'seals-claimed');
    }
    return claims;
  }

  // S2.9 — retry des Verrous orphelins. Un POST échoué (réseau / table
  // absente) laisse une entrée à id 'local-…' dans outremondePendingSeals :
  // le serveur l'ignore, le host ne le résoudra jamais. Au prochain
  // démarrage de session on re-POST ces orphelins ; en cas de succès on
  // remplace l'id local par l'id serveur (le Verrou devient résoluble).
  // Tolérant : un échec laisse l'entrée locale telle quelle pour un essai
  // ultérieur. Retourne le nombre de verrous réenvoyés avec succès.
  async function _retryOrphanSeals() {
    if (typeof mpPostBloodSeal !== 'function') return 0;
    if (!Array.isArray(outremondePendingSeals) || !outremondePendingSeals.length) return 0;
    if (typeof getMpPlayerId !== 'function') return 0;
    const visitorId = getMpPlayerId();
    let repaired = 0;
    for (const s of outremondePendingSeals) {
      if (!s || typeof s.id !== 'string' || s.id.indexOf('local-') !== 0) continue;
      const payload = {
        visitor_id:   visitorId,
        visitor_name: (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
        host_id:      s.hostId,
        floor:        s.floor,
        x:            s.x,
        y:            s.y,
        monster_id:   s.monsterId,
        status:       'pending'
      };
      let posted = null;
      try { posted = await mpPostBloodSeal(payload); } catch (e) { posted = null; }
      if (posted && posted.id) { s.id = posted.id; repaired++; }
    }
    if (repaired && typeof safeCall === 'function') safeCall('autoSave', 'seals-retry');
    return repaired;
  }

  function _showClaimsModal(claims) {
    const modal = _ensureModalElement();
    if (!modal) return;
    const lines = claims.map(c => {
      const m = (typeof MONSTERS !== 'undefined' && MONSTERS.find(x => x.id === c.row.monster_id)) || {};
      const status = c.row.status === 'fled' ? 'Fui' : 'Résolu';
      const fragLine = c.gainFrag ? ` · +${c.gainFrag} ${_FRAG} fragment` : '';
      return `<li><strong>${status}</strong> · ${_esc(m.name || c.row.monster_id)} chez ${_esc(c.row.visitor_name || 'un host')} → +${c.gainEss} ${_ESS}${fragLine}</li>`;
    }).join('');
    modal.innerHTML = `
      <div class="atelier-panel">
        <button class="atelier-close" type="button" onclick="closeAtelierVoyageur()" aria-label="Fermer">✕</button>
        <h2 class="atelier-title">${_VERROU} Verrous résolus</h2>
        <p class="atelier-subtitle">
          ${claims.length} Verrou${claims.length > 1 ? 'x' : ''} a été affronté dans d'autres plans.
        </p>
        <ul class="atelier-claims">${lines}</ul>
      </div>`;
    modal.style.display = 'flex';
  }

  // ── Côté host : chargement des Verrous actifs à l'entrée d'étage ──
  // Appelé par `_changeFloor` (movement.js) à la fin de la transition.
  // Filtre `inVisit` : un host ne charge ses Verrous QUE quand il joue
  // sa propre partie (pas en visite chez un autre).
  async function loadHostSealsForCurrentFloor() {
    if (typeof visitSession !== 'undefined' && visitSession) return;
    if (typeof getMpPlayerId !== 'function') return;
    if (typeof mpListHostSealsForFloor !== 'function') return;
    const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
    let rows = [];
    try { rows = await mpListHostSealsForFloor(getMpPlayerId(), floor); }
    catch (e) { rows = []; }
    if (!Array.isArray(rows)) rows = [];
    if (typeof hostSealsByFloor === 'undefined') return;
    hostSealsByFloor.set(floor, rows);
    if (rows.length > 0 && typeof addMsg === 'function') {
      addMsg(`${_VERROU} ${rows.length} Verrou${rows.length > 1 ? 'x' : ''} de Sang scellé${rows.length > 1 ? 's' : ''} à cet étage — frapper la lame fera grincer la rune.`, 'magic');
    }
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof drawDungeon   === 'function') drawDungeon();
  }

  // Retourne le Verrou actif à (x,y) côté host, ou null. Consommé par la
  // minimap (classe .map-blood-seal) et par _triggerHostBloodSeal.
  function getBloodSealAt(x, y) {
    if (typeof visitSession !== 'undefined' && visitSession) return null;
    if (typeof hostSealsByFloor === 'undefined' || !hostSealsByFloor) return null;
    const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
    const list = hostSealsByFloor.get(floor);
    if (!Array.isArray(list)) return null;
    return list.find(s => s.x === x && s.y === y) || null;
  }

  // Côté host : déclenche le combat de résolution si la cellule porte un
  // Verrou. Retire le Verrou de la liste locale (évite re-déclenchement
  // si on repasse), pose `currentBloodSeal` pour que endBattle puisse
  // remonter le statut. Retourne true si un combat a été lancé.
  function _triggerHostBloodSeal(x, y) {
    if (typeof visitSession !== 'undefined' && visitSession) return false;
    if (typeof inBattle !== 'undefined' && inBattle) return false;
    const seal = getBloodSealAt(x, y);
    if (!seal) return false;
    // Retire de la liste locale pour ne pas re-déclencher si le joueur
    // ressort/rentre. Le statut est mis à jour côté serveur par endBattle.
    const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
    const list = hostSealsByFloor.get(floor) || [];
    hostSealsByFloor.set(floor, list.filter(s => s.id !== seal.id));

    if (typeof MONSTERS === 'undefined') return false;
    const tpl = MONSTERS.find(m => m.id === seal.monster_id);
    if (!tpl) return false;
    if (typeof scaleMonster !== 'function' || typeof startBattle !== 'function') return false;

    const scaled = scaleMonster(tpl, floor);
    // Marqueur Verrou : préfixe + flag pour le rendu UI.
    scaled.name = '🩸 ' + scaled.name;
    scaled._sealed = true;
    currentBloodSeal = seal;
    inSealedCombat   = true;
    startBattle(scaled, { sealed: true });
    if (typeof addMsg === 'function') {
      addMsg(`${_VERROU} Un Verrou de Sang se brise — ${tpl.name} émerge !`, 'magic');
    }
    return true;
  }

  // ── V1c.1 — Souvenirs passifs (auto-débloqués via métriques) ──
  // Appelé à chaque mutation des métriques (visite, claim, fight gagné).
  // Un souvenir débloqué reste verrouillé dans outremondeSouvenirs ; le
  // bonus stat est appliqué à recalculateStats() — pas de removal.
  function _checkSouvenirs() {
    if (typeof OUTREMONDE_SOUVENIRS === 'undefined') return;
    if (!outremondeSouvenirs) outremondeSouvenirs = new Set();
    let any = false;
    for (const s of OUTREMONDE_SOUVENIRS) {
      if (outremondeSouvenirs.has(s.id)) continue;
      if (typeof s.cond === 'function' && s.cond(outremondeMetrics)) {
        outremondeSouvenirs.add(s.id);
        any = true;
        if (typeof addMsg === 'function') {
          addMsg(`${_outremondeIcon(s.id)} Souvenir débloqué — ${s.name} : ${s.desc}`, 'good');
        }
        if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playLevelUp === 'function') {
          AudioSystem.playLevelUp();
        }
      }
    }
    if (any) {
      if (typeof recalculateStats === 'function') recalculateStats();
      if (typeof updateUI === 'function') updateUI();
      if (typeof safeCall === 'function') safeCall('autoSave', 'souvenir-unlocked');
    }
  }

  // Helper pur consommé par recalculateStats — retourne les bonus
  // cumulés des souvenirs débloqués (additifs).
  function _souvenirsBonuses() {
    const out = { bonusAtk:0, bonusDef:0, bonusMag:0, bonusLck:0,
                  bonusStr:0, bonusInt:0, bonusAgi:0, bonusEnd:0 };
    if (typeof OUTREMONDE_SOUVENIRS === 'undefined') return out;
    if (!outremondeSouvenirs) return out;
    for (const s of OUTREMONDE_SOUVENIRS) {
      if (!outremondeSouvenirs.has(s.id)) continue;
      const b = s.bonus || {};
      for (const k of Object.keys(out)) {
        if (b[k]) out[k] += b[k];
      }
    }
    return out;
  }

  // ── V1c.1 — Achat de cosmétique à l'Atelier ───────────────────
  function _buyCosmetic(id) {
    if (typeof OUTREMONDE_COSMETICS === 'undefined') return;
    const cos = OUTREMONDE_COSMETICS.find(c => c.id === id);
    if (!cos) return;
    if (outremondeCosmetics.has(id)) {
      if (typeof addMsg === 'function') addMsg('Tu possèdes déjà ce cosmétique.', '');
      return;
    }
    if (outremondeEssence < cos.essCost || outremondeFragments < cos.fragCost) {
      if (typeof addMsg === 'function') addMsg("Pas assez d'essences ou de fragments.", 'bad');
      return;
    }
    outremondeEssence  -= cos.essCost;
    outremondeFragments -= cos.fragCost;
    outremondeCosmetics.add(id);
    if (typeof addMsg === 'function') {
      addMsg(`${_outremondeIcon(cos.id)} Cosmétique acquis — ${cos.name}.`, 'good');
    }
    if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playLevelUp === 'function') {
      AudioSystem.playLevelUp();
    }
    _applyCosmeticVisuals();
    openAtelierVoyageur();
    if (typeof safeCall === 'function') safeCall('autoSave', 'cosmetic-bought');
  }

  // Activation/désactivation d'un cosmétique (un actif par catégorie).
  // Le re-clic du cosmétique actif le désactive.
  function _toggleCosmetic(id) {
    const cos = (OUTREMONDE_COSMETICS || []).find(c => c.id === id);
    if (!cos) return;
    if (!outremondeCosmetics.has(id)) return;
    const cur = (cos.kind === 'aura')    ? outremondeActiveAura
              : (cos.kind === 'portal')  ? outremondeActivePortalSkin
              : (cos.kind === 'fissure') ? outremondeActiveFissureSkin
              : null;
    const next = (cur === id) ? null : id;
    if (cos.kind === 'aura')         outremondeActiveAura       = next;
    else if (cos.kind === 'portal')  outremondeActivePortalSkin = next;
    else if (cos.kind === 'fissure') outremondeActiveFissureSkin = next;
    _applyCosmeticVisuals();
    openAtelierVoyageur();
    if (typeof safeCall === 'function') safeCall('autoSave', 'cosmetic-toggled');
  }

  // Applique les CSS variables sur :root selon les cosmétiques actifs.
  // Lu par css/portal.css (--aura-color, --portal-skin, --fissure-skin).
  function _applyCosmeticVisuals() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!root || !root.style) return;
    const auraCos    = (OUTREMONDE_COSMETICS || []).find(c => c.id === outremondeActiveAura);
    const portalCos  = (OUTREMONDE_COSMETICS || []).find(c => c.id === outremondeActivePortalSkin);
    const fissureCos = (OUTREMONDE_COSMETICS || []).find(c => c.id === outremondeActiveFissureSkin);
    root.style.setProperty('--om-aura',    auraCos    ? auraCos.palette    : 'transparent');
    root.style.setProperty('--om-portal',  portalCos  ? portalCos.palette  : '#3cdc5a');
    root.style.setProperty('--om-fissure', fissureCos ? fissureCos.palette : '#d8b647');
  }

  // ── V1c.1 — Anim rune rouge à la pose du Verrou ─────────────────
  // Overlay 1.2 s : trace une rune circulaire écarlate au sol qui pulse
  // puis disparaît. Appelé depuis _chooseBloodSealMonster après le post
  // REST réussi. Tolérant : no-op si document absent.
  function _playBloodSealAnim() {
    if (typeof document === 'undefined') return;
    let layer = document.getElementById('blood-seal-fx');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'blood-seal-fx';
      document.body.appendChild(layer);
    }
    layer.innerHTML = `
      <svg viewBox="0 0 200 200" class="blood-seal-svg">
        <circle cx="100" cy="100" r="80" class="bs-outer"/>
        <circle cx="100" cy="100" r="50" class="bs-inner"/>
        <circle cx="100" cy="100" r="14" class="bs-core"/>
        <line x1="100" y1="20" x2="100" y2="40" class="bs-rune"/>
        <line x1="100" y1="180" x2="100" y2="160" class="bs-rune"/>
        <line x1="20" y1="100" x2="40" y2="100" class="bs-rune"/>
        <line x1="180" y1="100" x2="160" y2="100" class="bs-rune"/>
      </svg>`;
    layer.classList.add('active');
    setTimeout(() => layer.classList.remove('active'), 1200);
  }

  if (typeof window !== 'undefined') {
    window.openBloodSealTargetModal = openBloodSealTargetModal;
    window._chooseBloodSealMonster  = _chooseBloodSealMonster;
    window.openAtelierVoyageur      = openAtelierVoyageur;
    window._craftVoyageurPiece      = _craftVoyageurPiece;
    window.closeAtelierVoyageur     = closeAtelierVoyageur;
    window._claimResolvedSeals      = _claimResolvedSeals;
    window._retryOrphanSeals        = _retryOrphanSeals;
    window._showClaimsModal         = _showClaimsModal;
    window.loadHostSealsForCurrentFloor = loadHostSealsForCurrentFloor;
    window.getBloodSealAt           = getBloodSealAt;
    window._triggerHostBloodSeal    = _triggerHostBloodSeal;
    window._checkSouvenirs          = _checkSouvenirs;
    window._souvenirsBonuses        = _souvenirsBonuses;
    window._buyCosmetic             = _buyCosmetic;
    window._toggleCosmetic          = _toggleCosmetic;
    window._applyCosmeticVisuals    = _applyCosmeticVisuals;
    window._playBloodSealAnim       = _playBloodSealAnim;
    window._buyCrossSpell           = _buyCrossSpell;
  }
})();

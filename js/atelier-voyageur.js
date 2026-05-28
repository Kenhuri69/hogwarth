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
        <div class="atelier-card-icon">${_esc(m.icon || '👹')}</div>
        <div class="atelier-card-name">${_esc(m.name)}</div>
        <div class="atelier-card-meta">Étage ${m.minFloor || 1}+ · HP ${m.hp || '?'}</div>
      </button>`).join('');

    modal.innerHTML = `
      <div class="atelier-panel">
        <button class="atelier-close" type="button" onclick="closeAtelierVoyageur()" aria-label="Fermer">✕</button>
        <h2 class="atelier-title">🩸 Verrou de Sang</h2>
        <p class="atelier-subtitle">
          Choisis la créature à sceller dans le plan de
          <strong>${_esc(visitSession.hostName || 'ton hôte')}</strong>
          (étage ${floor}). Coût : ${SEAL_PM_COST} PM + ${SEAL_ESSENCE_COST}
          ✨ Essence. Réserve : ${outremondeEssence} ✨.
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
      addMsg(`🩸 Verrou posé — ${mname} hantera ce plan jusqu'à ce que ${entry.hostName} le résolve.`, 'magic');
    }
    if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playSpellCast === 'function') {
      AudioSystem.playSpellCast('Verrou de Sang');
    }
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

  // ── Atelier du Voyageur — craft Set Voyageur ─────────────────
  // 5 items taggés family:'voyageur' (cf. data.js). Le coût est lu sur
  // `_outremondeCost` (essences). Aucun coût en or (économies cloisonnées
  // §6.10).
  function openAtelierVoyageur() {
    const modal = _ensureModalElement();
    if (!modal) return;
    const items = (typeof ITEMS !== 'undefined' && Array.isArray(ITEMS))
      ? ITEMS.filter(it => it.family === 'voyageur') : [];

    const owned = (typeof player !== 'undefined' && Array.isArray(player.inventory))
      ? new Set(player.inventory.map(it => it.id)) : new Set();
    // Équipement : déjà porté par un perso ?
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
      const affordable = (typeof outremondeEssence === 'number') && outremondeEssence >= cost;
      let badge = '';
      if (isEquipped)      badge = '<span class="atelier-badge done">Équipé</span>';
      else if (isOwned)    badge = '<span class="atelier-badge done">Possédé</span>';
      else if (!affordable) badge = '<span class="atelier-badge locked">' + cost + ' ✨</span>';
      else                 badge = '<button class="atelier-craft-btn" type="button" onclick="_craftVoyageurPiece(\'' + _esc(it.id) + '\')">Forger (' + cost + ' ✨)</button>';
      const stats = [];
      if (it.bonusInt) stats.push('+' + it.bonusInt + ' INT');
      if (it.bonusAgi) stats.push('+' + it.bonusAgi + ' AGI');
      if (it.bonusMag) stats.push('+' + it.bonusMag + ' MAG');
      if (it.bonusLck) stats.push('+' + it.bonusLck + ' LCK');
      if (it.regenSp)  stats.push('regen ' + it.regenSp + ' PM/tour');
      return `
        <div class="atelier-card ${isOwned || isEquipped ? 'owned' : ''} ${affordable ? '' : 'locked'}">
          <div class="atelier-card-icon">${_esc(it.icon || '✨')}</div>
          <div class="atelier-card-name">${_esc(it.name)}</div>
          <div class="atelier-card-stats">${stats.join(' · ')}</div>
          <div class="atelier-card-desc">${_esc(it.desc || '')}</div>
          <div class="atelier-card-action">${badge}</div>
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div class="atelier-panel atelier-panel-wide">
        <button class="atelier-close" type="button" onclick="closeAtelierVoyageur()" aria-label="Fermer">✕</button>
        <h2 class="atelier-title">✨ Atelier du Voyageur</h2>
        <p class="atelier-subtitle">
          Réserve d'Essences d'Outremonde : <strong>${outremondeEssence}</strong> ✨ ·
          Fragments cosmétiques : <strong>${outremondeFragments}</strong> 🔹
        </p>
        <div class="atelier-grid atelier-grid-set">${cards || '<p>Aucune pièce disponible.</p>'}</div>
        <p class="atelier-footnote">
          Set complet (5 pièces) : déverrouille la prévisualisation du donjon
          distant. Bonus 2/3/4 pièces : LCK, crit de sort, regen SP.
        </p>
      </div>`;
    modal.style.display = 'flex';
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
      addMsg(`✨ ${item.icon} ${item.name} forgé(e) ! Réserve : ${outremondeEssence} ✨.`, 'good');
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
      if (typeof safeCall === 'function') safeCall('autoSave', 'seals-claimed');
    }
    return claims;
  }

  function _showClaimsModal(claims) {
    const modal = _ensureModalElement();
    if (!modal) return;
    const lines = claims.map(c => {
      const m = (typeof MONSTERS !== 'undefined' && MONSTERS.find(x => x.id === c.row.monster_id)) || {};
      const status = c.row.status === 'fled' ? '🏃 Fui' : '⚔️ Résolu';
      const fragLine = c.gainFrag ? ` · +${c.gainFrag} 🔹 fragment` : '';
      return `<li><strong>${status}</strong> · ${_esc(m.name || c.row.monster_id)} chez ${_esc(c.row.visitor_name || 'un host')} → +${c.gainEss} ✨${fragLine}</li>`;
    }).join('');
    modal.innerHTML = `
      <div class="atelier-panel">
        <button class="atelier-close" type="button" onclick="closeAtelierVoyageur()" aria-label="Fermer">✕</button>
        <h2 class="atelier-title">🩸 Verrous résolus</h2>
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
      addMsg(`🩸 ${rows.length} Verrou${rows.length > 1 ? 'x' : ''} de Sang scellé${rows.length > 1 ? 's' : ''} à cet étage — frapper la lame fera grincer la rune.`, 'magic');
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
      addMsg(`🩸 Un Verrou de Sang se brise — ${tpl.name} émerge !`, 'magic');
    }
    return true;
  }

  if (typeof window !== 'undefined') {
    window.openBloodSealTargetModal = openBloodSealTargetModal;
    window._chooseBloodSealMonster  = _chooseBloodSealMonster;
    window.openAtelierVoyageur      = openAtelierVoyageur;
    window._craftVoyageurPiece      = _craftVoyageurPiece;
    window.closeAtelierVoyageur     = closeAtelierVoyageur;
    window._claimResolvedSeals      = _claimResolvedSeals;
    window._showClaimsModal         = _showClaimsModal;
    window.loadHostSealsForCurrentFloor = loadHostSealsForCurrentFloor;
    window.getBloodSealAt           = getBloodSealAt;
    window._triggerHostBloodSeal    = _triggerHostBloodSeal;
  }
})();

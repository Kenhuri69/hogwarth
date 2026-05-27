// ============================================================
// MONDES PARALLÈLES — orchestrateur de canal de visite (V1a Phase C.2)
// ============================================================
// Pilote le cycle de vie d'une visite côté visiteur et côté host :
// post du snapshot initial, poll des messages, application des actions
// (apply snapshot, restore, bye). Le transport bas-niveau est dans
// js/multiplayer.js (mpPostVisitMessage / mpPollVisitMessages). Les
// helpers de mutation d'état viennent de js/save.js
// (mpBuildVisitSnapshot, mpApplyVisitSnapshot, _restoreFromVisit).
//
// Branchement des hooks :
//   window.onVisitAccepted(host, status)       → mpStartVisitAsVisitor
//   window.onIncomingVisitAccepted(req, chId)  → mpStartVisitAsHost
//
// Cf. .claude/plans/parallel-worlds.md §3, §5.
// ============================================================

(function () {
  'use strict';

  const VISIT_POLL_MS = 2500;

  // ── État interne ──────────────────────────────────────────
  let _role           = null;   // null | 'visitor' | 'host'
  let _channelId      = null;
  let _partnerId      = null;
  let _partnerName    = null;
  let _pollTimer      = null;
  let _lastIso        = null;   // cursor de poll (created_at du dernier msg vu)
  let _snapshotPosted = false;  // host : flag pour ne pas re-poster

  // ── Génération d'UUID v4 (sans dépendance) ────────────────
  function _uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback minimal RFC 4122 v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ── État public exposé (tests + UI future) ─────────────────
  function _visitGetState() {
    return {
      role:           _role,
      channelId:      _channelId,
      partnerId:      _partnerId,
      partnerName:    _partnerName,
      snapshotPosted: _snapshotPosted,
      lastIso:        _lastIso
    };
  }

  // ── Démarrage : visiteur ───────────────────────────────────
  // Appelé à l'acceptation par le host (via window.onVisitAccepted).
  // Démarre le poll en attente du snapshot.
  async function mpStartVisitAsVisitor(opts) {
    if (_role) return false;       // déjà en visite
    if (!opts || !opts.channelId) return false;

    _role        = 'visitor';
    _channelId   = opts.channelId;
    _partnerId   = opts.hostId   || null;
    _partnerName = opts.hostName || 'Sorcier';
    _lastIso     = new Date(0).toISOString();   // tout depuis le début du canal

    _pollTimer = setInterval(_visitPollOnce, VISIT_POLL_MS);
    // Premier tick immédiat pour ne pas attendre 2,5 s le snapshot.
    await _visitPollOnce();
    return true;
  }

  // ── Démarrage : host ───────────────────────────────────────
  // Appelé à l'acceptation côté host (via window.onIncomingVisitAccepted).
  // Construit + poste le snapshot initial puis démarre le poll des
  // messages du visiteur (position, bye).
  async function mpStartVisitAsHost(opts) {
    if (_role) return false;       // déjà en visite
    if (!opts || !opts.channelId || !opts.req) return false;

    _role        = 'host';
    _channelId   = opts.channelId;
    _partnerId   = opts.req.visitor_id   || null;
    _partnerName = opts.req.visitor_name || 'Voyageur';
    _lastIso     = new Date(0).toISOString();

    // Construit le snapshot depuis les globaux du host (état runtime).
    if (typeof mpBuildVisitSnapshot !== 'function') {
      // Helper absent — abandonne proprement
      _visitReset();
      return false;
    }
    const snap = mpBuildVisitSnapshot({
      hostId:    (typeof getMpPlayerId === 'function') ? getMpPlayerId() : null,
      hostName:  (typeof getPlayerName === 'function') ? (getPlayerName() || 'Sorcier') : 'Sorcier',
      hostHouse: (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
      hostLevel: (typeof player !== 'undefined' && player.level) || 1
    });

    if (typeof mpPostVisitMessage === 'function') {
      const posted = await mpPostVisitMessage(_channelId, 'host', 'snapshot', snap);
      _snapshotPosted = !!posted;
    }

    _pollTimer = setInterval(_visitPollOnce, VISIT_POLL_MS);
    return true;
  }

  // ── Sortie volontaire / forcée ─────────────────────────────
  // Poste un message 'bye' au partenaire, stoppe le poll, et côté
  // visiteur restaure l'état d'origine via _restoreFromVisit.
  async function mpExitVisit(reason) {
    if (!_role) return false;
    const wasVisitor = (_role === 'visitor');
    const channel    = _channelId;
    const role       = _role;

    // Arrête le poll AVANT de poster bye — on évite de traiter un
    // bye croisé du partenaire qui ré-entrerait dans cette fonction.
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    _visitReset();

    if (channel && typeof mpPostVisitMessage === 'function') {
      try {
        await mpPostVisitMessage(channel, role, 'bye', { reason: reason || 'voluntary' });
      } catch (e) { /* tolérant : sortie locale prioritaire */ }
    }

    if (wasVisitor && typeof _restoreFromVisit === 'function') {
      _restoreFromVisit();
    }
    if (typeof hideVisitHud === 'function') hideVisitHud();
    if (wasVisitor) {
      // Redraw immédiat — la modale "Quitter" se ferme et le visiteur
      // retrouve son propre donjon sans intervention manuelle.
      if (typeof drawDungeon   === 'function') drawDungeon();
      if (typeof renderMinimap === 'function') renderMinimap();
      if (typeof updateUI      === 'function') updateUI();
    }
    return true;
  }

  function _visitReset() {
    _role           = null;
    _channelId      = null;
    _partnerId      = null;
    _partnerName    = null;
    _snapshotPosted = false;
    _lastIso        = null;
  }

  // ── Poll d'un cycle ────────────────────────────────────────
  async function _visitPollOnce() {
    if (!_role || !_channelId) return;
    if (typeof mpPollVisitMessages !== 'function') return;

    const exclude = _role;   // ignore ses propres messages
    const msgs = await mpPollVisitMessages(_channelId, _lastIso, exclude);
    if (!Array.isArray(msgs) || msgs.length === 0) return;

    for (const msg of msgs) {
      if (msg && msg.created_at) _lastIso = msg.created_at;
      try { await _visitHandleMessage(msg); }
      catch (e) {
        if (typeof console !== 'undefined') {
          console.warn('[visit-channel] handler error', e);
        }
      }
    }
  }

  // ── Dispatcher de messages ─────────────────────────────────
  async function _visitHandleMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'snapshot' && _role === 'visitor') {
      if (typeof mpApplyVisitSnapshot === 'function') {
        const ok = mpApplyVisitSnapshot(msg.payload);
        // Hooks de rendu sous garde — visibilité immédiate du donjon
        // distant.
        if (typeof drawDungeon   === 'function') drawDungeon();
        if (typeof renderMinimap === 'function') renderMinimap();
        if (typeof updateUI      === 'function') updateUI();
        // Phase C.3 — bandeau de visite + bouton "Quitter ce monde".
        if (ok && typeof showVisitHud === 'function') {
          const meta = (msg.payload && msg.payload.hostMeta) || {};
          showVisitHud({
            hostName:  meta.name  || _partnerName,
            hostHouse: meta.house || null,
            floor:     meta.currentFloor || null
          });
        }
        if (typeof addMsg === 'function') {
          addMsg(`Tu apparais dans le monde de ${_partnerName}.`, 'good');
        }
      }
      return;
    }

    if (msg.type === 'floorSnapshot' && _role === 'visitor') {
      // Le host a changé d'étage — on applique le patch sans réinitialiser
      // visitSession.mySavedState (chargement paresseux multi-étages, C.3b).
      if (typeof mpApplyVisitFloorUpdate === 'function') {
        const ok = mpApplyVisitFloorUpdate(msg.payload);
        if (ok) {
          if (typeof drawDungeon   === 'function') drawDungeon();
          if (typeof renderMinimap === 'function') renderMinimap();
          if (typeof updateUI      === 'function') updateUI();
          if (typeof updateVisitHud === 'function') {
            const meta = (msg.payload && msg.payload.hostMeta) || {};
            updateVisitHud({
              hostName:  meta.name  || _partnerName,
              hostHouse: meta.house || null,
              floor:     meta.currentFloor || null
            });
          }
          if (typeof addMsg === 'function') {
            const f = (msg.payload && msg.payload.hostMeta && msg.payload.hostMeta.currentFloor) || '?';
            addMsg(`${_partnerName} change de plan — tu le suis à l'étage ${f}.`, 'info');
          }
        }
      }
      return;
    }

    if (msg.type === 'bye') {
      // Le partenaire quitte — on referme proprement de notre côté.
      // mpExitVisit() est idempotent (no-op si déjà sorti).
      const partnerName = _partnerName;
      const wasVisitor  = (_role === 'visitor');
      // On stoppe localement sans re-poster un bye (le partenaire
      // l'a déjà posté), puis on restaure si visiteur.
      if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
      _visitReset();
      if (wasVisitor && typeof _restoreFromVisit === 'function') {
        _restoreFromVisit();
      }
      if (typeof hideVisitHud === 'function') hideVisitHud();
      if (wasVisitor) {
        // Redraw après restore pour que le visiteur retrouve son propre
        // donjon sans avoir à bouger.
        if (typeof drawDungeon   === 'function') drawDungeon();
        if (typeof renderMinimap === 'function') renderMinimap();
        if (typeof updateUI      === 'function') updateUI();
      }
      if (typeof addMsg === 'function') {
        addMsg(`${partnerName} a refermé la cheminée — retour dans ton monde.`, '');
      }
      return;
    }

    // 'position' / 'hostPosition' / autres : seront branchés en C.3
    // (rendu du sprite visiteur côté host, suivi du host côté visiteur).
    // En C.2 on les ignore silencieusement.
  }

  // ── Hook côté host : changement d'étage (C.3b) ─────────────
  // Appelé par movement.js — _changeFloor à la fin d'une transition
  // d'étage. Si une visite est ouverte (role === 'host'), reposte le
  // snapshot avec le nouvel étage pour que le visiteur le découvre en
  // temps réel. No-op silencieux hors visite.
  async function _visitHostNotifyFloorChange() {
    if (_role !== 'host' || !_channelId) return false;
    if (typeof mpBuildVisitSnapshot !== 'function') return false;
    if (typeof mpPostVisitMessage   !== 'function') return false;

    const snap = mpBuildVisitSnapshot({
      hostId:    (typeof getMpPlayerId === 'function') ? getMpPlayerId() : null,
      hostName:  (typeof getPlayerName === 'function') ? (getPlayerName() || 'Sorcier') : 'Sorcier',
      hostHouse: (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
      hostLevel: (typeof player !== 'undefined' && player.level) || 1
    });

    try {
      await mpPostVisitMessage(_channelId, 'host', 'floorSnapshot', snap);
      return true;
    } catch (e) { return false; }
  }

  // ── Hooks d'intégration ────────────────────────────────────
  // Côté visiteur : matchmaking nous notifie de l'acceptation.
  if (typeof window !== 'undefined') {
    window.onVisitAccepted = function (host, status) {
      if (!status || !status.channel_id) return;
      mpStartVisitAsVisitor({
        channelId: status.channel_id,
        hostId:    (host && host.player_id) || null,
        hostName:  (host && host.name)      || 'Sorcier',
        hostHouse: (host && host.house)     || null
      });
    };

    // Côté host : matchmaking notifie qu'on a accepté une demande.
    // Le host génère le channelId puis le PATCH dans mp_visit_requests
    // (cf. mpRespondVisitRequest) — fait dans portal-matchmaking.js.
    // Ici on reçoit le channelId déjà généré.
    window.onIncomingVisitAccepted = function (req, channelId) {
      if (!req || !channelId) return;
      mpStartVisitAsHost({ channelId, req });
    };

    window.mpStartVisitAsVisitor    = mpStartVisitAsVisitor;
    window.mpStartVisitAsHost       = mpStartVisitAsHost;
    window.mpExitVisit              = mpExitVisit;
    window._visitPollOnce           = _visitPollOnce;
    window._visitGetState           = _visitGetState;
    window._visitGenChannelId       = _uuid;
    window._visitHostNotifyFloorChange = _visitHostNotifyFloorChange;
  }
})();

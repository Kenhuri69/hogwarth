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

  const VISIT_POLL_MS    = 2500;
  // C.4 — détection de drop réseau. Keepalive régulier (ping) pour ne
  // pas dépasser le seuil de drop pendant les phases d'exploration
  // statique (visiteur et host immobiles). Seuil > 2× pollMs pour
  // tolérer un cycle de poll raté sur une connexion lente.
  const VISIT_PING_MS    = 4000;
  const VISIT_TIMEOUT_MS = 10000;
  // Phase F — fenêtre de grâce avant drop : entre 5 s et 10 s sans
  // message reçu, on tente de re-pinger plus agressivement et on poll
  // plus fréquemment pour rattraper la session. Au-delà, drop hard.
  const VISIT_DEGRADED_MS = 5000;
  const VISIT_RECONNECT_POLL_MS = 800;
  const VISIT_RECONNECT_PING_MS = 1500;
  // Phase D §5.2/§5.3 — throttle d'émission de position. La réception est
  // gouvernée par le cycle de poll (2,5 s), inutile d'aller plus vite.
  const VISIT_MOVE_THROTTLE_MS = 1200;
  // Phase D §6.7 — anti-flood emote. Banque fermée, mais on protège quand
  // même de la tenue de bouton involontaire ou du clic répété.
  const VISIT_EMOTE_THROTTLE_MS = 1500;

  // ── État interne ──────────────────────────────────────────
  let _role           = null;   // null | 'visitor' | 'host'
  let _channelId      = null;
  let _partnerId      = null;
  let _partnerName    = null;
  let _pollTimer      = null;
  let _pingTimer      = null;   // C.4 — keepalive ping
  let _lastIso        = null;   // cursor de poll (created_at du dernier msg vu)
  let _lastSeen       = 0;      // C.4 — timestamp Date.now() du dernier message reçu du partenaire
  let _snapshotPosted = false;  // host : flag pour ne pas re-poster
  let _lastMoveSent   = 0;      // D §5 — throttle position/hostPosition
  let _lastEmoteSent  = 0;      // D §6.7 — throttle emote
  let _quality        = 'good'; // F — 'good' | 'degraded' | 'lost'
  let _reconnectMode  = false;  // F — flag pour ne pas re-poser les intervals à chaque check

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
      lastIso:        _lastIso,
      lastSeen:       _lastSeen
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
    _lastSeen    = Date.now();                  // grace initiale (C.4)

    _pollTimer = setInterval(_visitPollOnce, VISIT_POLL_MS);
    _pingTimer = setInterval(_sendPing,      VISIT_PING_MS);
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
    _lastSeen    = Date.now();                  // grace initiale (C.4)

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

    // Phase D §3.4 — miroir symétrique côté host : pose visitSession pour
    // que le rendu puisse projeter le visiteur (sprite 3D, minimap dorée).
    // Forme distincte de la version visiteur (pas de mySavedState).
    if (typeof visitSession !== 'undefined') {
      visitSession = {
        role:        'host',
        visitorId:   _partnerId,
        visitorName: _partnerName,
        visitors:    [],   // peuplé à la 1re réception de 'position'
      };
    }

    // Phase D §6.7 — bandeau côté host : informe le joueur qu'un visiteur
    // arrive, expose l'emote 👋 et le bouton "Refermer la cheminée".
    if (typeof showVisitHud === 'function') {
      showVisitHud({
        role:      'host',
        hostName:  _partnerName,                       // nom du partenaire visiteur
        hostHouse: (opts.req && opts.req.visitor_house) || null,
        floor:     (typeof currentFloor === 'number') ? currentFloor : null,
      });
    }

    _pollTimer = setInterval(_visitPollOnce, VISIT_POLL_MS);
    _pingTimer = setInterval(_sendPing,      VISIT_PING_MS);
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
    if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null; }
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
    // Redraw immédiat dans les deux sens : côté visiteur pour retrouver
    // son donjon, côté host pour faire disparaître le sprite et le
    // marqueur minimap du visiteur (visitSession a été nulled par _visitReset).
    if (typeof drawDungeon   === 'function') drawDungeon();
    if (typeof renderMinimap === 'function') renderMinimap();
    if (wasVisitor && typeof updateUI === 'function') updateUI();
    return true;
  }

  function _visitReset() {
    _role           = null;
    _channelId      = null;
    _partnerId      = null;
    _partnerName    = null;
    _snapshotPosted = false;
    _lastIso        = null;
    _lastSeen       = 0;
    _lastMoveSent   = 0;
    _lastEmoteSent  = 0;
    _quality        = 'good';
    _reconnectMode  = false;
    _refreshQualityBadge();
    // Côté host : visitSession est posé par mpStartVisitAsHost, à nettoyer
    // ici pour ne pas laisser de visiteur fantôme dans le rendu après le
    // drop / bye. Côté visiteur, visitSession est levé par _restoreFromVisit
    // — ne pas y toucher ici.
    if (typeof visitSession !== 'undefined' && visitSession
        && visitSession.role === 'host') {
      visitSession = null;
    }
  }

  // ── C.4 — keepalive + détection de drop ────────────────────
  // Post un ping toutes les VISIT_PING_MS pour signaler la présence.
  // Tolérant : un échec réseau ne fait pas tomber la session — seule
  // l'absence de message reçu pendant VISIT_TIMEOUT_MS déclenche le drop.
  async function _sendPing() {
    if (!_role || !_channelId) return;
    if (typeof mpPostVisitMessage !== 'function') return;
    try { await mpPostVisitMessage(_channelId, _role, 'ping', {}); }
    catch (e) { /* tolérant */ }
  }

  // Vérifie si on a dépassé le seuil de silence du partenaire. Appelé à
  // chaque cycle de poll, après traitement des messages reçus.
  // Phase F — 3 paliers :
  //   • elapsed < VISIT_DEGRADED_MS (5 s) → qualité 'good', cadence normale
  //   • elapsed ∈ [5 s, 10 s] → 'degraded', resserre poll/ping pour
  //     rattraper rapidement la session. _refreshQualityBadge informe le HUD.
  //   • elapsed > VISIT_TIMEOUT_MS (10 s) → 'lost' → drop hard.
  function _visitCheckTimeout() {
    if (!_role || !_lastSeen) return false;
    const elapsed = Date.now() - _lastSeen;
    if (elapsed > VISIT_TIMEOUT_MS) {
      _setQuality('lost');
      _handleNetworkDrop();
      return true;
    }
    if (elapsed > VISIT_DEGRADED_MS) {
      _setQuality('degraded');
      _enterReconnectMode();
    } else {
      _setQuality('good');
      _exitReconnectMode();
    }
    return false;
  }

  function _setQuality(q) {
    if (_quality === q) return;
    _quality = q;
    _refreshQualityBadge();
  }

  function _refreshQualityBadge() {
    if (typeof window === 'undefined') return;
    if (typeof window.updateVisitQualityBadge !== 'function') return;
    window.updateVisitQualityBadge(_quality);
  }

  function _visitGetQuality() { return _quality; }

  // Phase F — bascule les timers vers la cadence resserrée pour tenter
  // de réveiller la session avant le drop hard. Idempotent (le flag
  // _reconnectMode évite de re-poser les intervals à chaque check).
  function _enterReconnectMode() {
    if (!_role || _reconnectMode) return;
    _reconnectMode = true;
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = setInterval(_visitPollOnce, VISIT_RECONNECT_POLL_MS); }
    if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = setInterval(_sendPing,      VISIT_RECONNECT_PING_MS); }
  }

  // Phase F — repasse en cadence normale dès qu'un message confirme la
  // récupération du partenaire (lastSeen revient sous VISIT_DEGRADED_MS).
  function _exitReconnectMode() {
    if (!_role || !_reconnectMode) return;
    _reconnectMode = false;
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = setInterval(_visitPollOnce, VISIT_POLL_MS); }
    if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = setInterval(_sendPing,      VISIT_PING_MS); }
  }

  // Restauration locale après drop réseau. Pas de message 'bye' posté —
  // le partenaire est par hypothèse injoignable ; il détectera la
  // rupture par son propre timeout. Côté visiteur, restaure la save
  // d'origine et redessine pour qu'aucune trace du donjon distant ne
  // subsiste.
  function _handleNetworkDrop() {
    const wasVisitor  = (_role === 'visitor');
    const partnerName = _partnerName;
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null; }
    _visitReset();

    if (wasVisitor && typeof _restoreFromVisit === 'function') {
      _restoreFromVisit();
    }
    if (typeof hideVisitHud === 'function') hideVisitHud();
    // Redraw immédiat dans les deux sens (cf. mpExitVisit). Côté host le
    // sprite/marqueur visiteur disparaît immédiatement après le drop.
    if (typeof drawDungeon   === 'function') drawDungeon();
    if (typeof renderMinimap === 'function') renderMinimap();
    if (wasVisitor && typeof updateUI === 'function') updateUI();
    if (typeof addMsg === 'function') {
      const msg = wasVisitor
        ? `Le lien astral s'est rompu — tu retournes dans ton monde.`
        : `${partnerName} s'est dissipé — la connexion s'est éteinte.`;
      addMsg(msg, 'bad');
    }
  }

  // ── Poll d'un cycle ────────────────────────────────────────
  async function _visitPollOnce() {
    if (!_role || !_channelId) return;
    if (typeof mpPollVisitMessages !== 'function') return;

    const exclude = _role;   // ignore ses propres messages
    const msgs = await mpPollVisitMessages(_channelId, _lastIso, exclude);

    if (Array.isArray(msgs) && msgs.length > 0) {
      // C.4 — tout message reçu (y compris 'ping') prouve que le
      // partenaire est encore là. Rafraîchit la fenêtre de timeout.
      _lastSeen = Date.now();
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

    // C.4 — vérifie le seuil de silence quelle que soit l'issue du poll.
    // Si dépassé, _handleNetworkDrop a déjà tout reset, le prochain
    // appel sera no-op (garde initiale sur `_role`).
    _visitCheckTimeout();
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
            role:      'visitor',
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
              role:      'visitor',
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
      if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null; }
      _visitReset();
      if (wasVisitor && typeof _restoreFromVisit === 'function') {
        _restoreFromVisit();
      }
      if (typeof hideVisitHud === 'function') hideVisitHud();
      // Redraw dans les deux sens : visiteur retrouve son donjon, host
      // perd le sprite/marqueur visiteur (visitSession nullée par _visitReset).
      if (typeof drawDungeon   === 'function') drawDungeon();
      if (typeof renderMinimap === 'function') renderMinimap();
      if (wasVisitor && typeof updateUI === 'function') updateUI();
      if (typeof addMsg === 'function') {
        addMsg(`${partnerName} a refermé la cheminée — retour dans ton monde.`, '');
      }
      return;
    }

    // Phase D §5.2 — position du visiteur reçue côté host : met à jour
    // visitSession.visitors[0] avec sa case courante (sprite + minimap).
    if (msg.type === 'position' && _role === 'host') {
      const p = msg.payload || {};
      if (typeof visitSession !== 'undefined' && visitSession
          && visitSession.role === 'host') {
        const next = {
          id:    _partnerId,
          name:  _partnerName,
          floor: (typeof p.floor === 'number') ? p.floor : null,
          x:     (typeof p.x === 'number') ? p.x : -1,
          y:     (typeof p.y === 'number') ? p.y : -1,
          dir:   p.dir || 's',
        };
        visitSession.visitors = [next];
        if (typeof drawDungeon   === 'function') drawDungeon();
        if (typeof renderMinimap === 'function') renderMinimap();
      }
      return;
    }

    // Phase D §5.3 — position du host reçue côté visiteur : met à jour
    // visitSession.remoteHostPosition (marqueur minimap discret + sprite).
    if (msg.type === 'hostPosition' && _role === 'visitor') {
      const p = msg.payload || {};
      if (typeof visitSession !== 'undefined' && visitSession
          && visitSession.role === 'visitor') {
        visitSession.remoteHostPosition = {
          floor: (typeof p.floor === 'number') ? p.floor : null,
          x:     (typeof p.x === 'number') ? p.x : -1,
          y:     (typeof p.y === 'number') ? p.y : -1,
          dir:   p.dir || 's',
        };
        if (typeof drawDungeon   === 'function') drawDungeon();
        if (typeof renderMinimap === 'function') renderMinimap();
      }
      return;
    }

    // Phase D §6.7 — emote reçue : toast léger côté partenaire. Banque
    // fermée, validée à l'envoi (_visitSendEmote) ET à la réception
    // (ignore les payload inconnus pour éviter l'injection texte).
    if (msg.type === 'emote') {
      const p = msg.payload || {};
      const kind  = String(p.kind || '');
      const isFromVisitor = (msg.sender === 'visitor');
      const banque = isFromVisitor ? VISITOR_EMOTES : HOST_EMOTES;
      const def = banque[kind];
      if (!def) return;   // banque fermée
      const who = isFromVisitor
        ? (visitSession && visitSession.visitorName) || _partnerName || 'Le voyageur'
        : (visitSession && visitSession.hostName)    || _partnerName || 'Le sorcier';
      if (typeof addMsg === 'function') {
        addMsg(`${def.icon} ${who} : « ${def.text} »`, 'info');
      }
      return;
    }
  }

  // ── Phase D §6.5 — accès au visiteur projeté sur une case ──────
  // Consommé par renderer.js (sprite 3D) et renderer-minimap.js (case
  // dorée). Filtre par étage courant : un message position arrivé après
  // un changement d'étage côté host pourrait pointer vers un étage
  // périmé, on l'ignore pour ne pas projeter le visiteur "fantôme".
  function getVisitorAt(x, y) {
    if (typeof visitSession === 'undefined' || !visitSession
        || visitSession.role !== 'host') return null;
    const list = visitSession.visitors || [];
    for (const v of list) {
      if (!v || v.x !== x || v.y !== y) continue;
      if (typeof currentFloor === 'number'
          && typeof v.floor === 'number'
          && v.floor !== currentFloor) continue;
      return v;
    }
    return null;
  }

  // ── Phase D §5.3 — accès à la position du host (côté visiteur) ──
  // Consommée par renderer-minimap.js pour rendre un marqueur discret
  // sur la case courante du host. Même filtre d'étage que ci-dessus.
  function getRemoteHostAt(x, y) {
    if (typeof visitSession === 'undefined' || !visitSession
        || visitSession.role !== 'visitor') return null;
    const p = visitSession.remoteHostPosition;
    if (!p || p.x !== x || p.y !== y) return null;
    if (typeof currentFloor === 'number'
        && typeof p.floor === 'number'
        && p.floor !== currentFloor) return null;
    return p;
  }

  // ── Phase D §6.7 — banques d'emotes (sources de vérité) ─────────
  // Fermées côté envoi ET côté réception : tout `kind` inconnu est
  // silencieusement ignoré.
  const VISITOR_EMOTES = {
    wave:   { icon: '👋', text: 'Salutations !' },
    wand:   { icon: '🪄', text: 'Ce sortilège m\'intrigue.' },
    castle: { icon: '🏰', text: 'Joli château !' },
    bye:    { icon: '🎯', text: 'Je file.' },
  };
  const HOST_EMOTES = {
    welcome: { icon: '👋', text: 'Bienvenue !' },
  };

  // ── Phase D §5.2 — visiteur informe le host de sa position ──────
  // Throttle 1,2 s côté visiteur. Tolérant aux erreurs réseau.
  async function _visitNotifyVisitorMove() {
    if (_role !== 'visitor' || !_channelId) return false;
    const now = Date.now();
    if (now - _lastMoveSent < VISIT_MOVE_THROTTLE_MS) return false;
    _lastMoveSent = now;
    if (typeof mpPostVisitMessage !== 'function') return false;
    const payload = {
      x:     (typeof playerX === 'number') ? playerX : -1,
      y:     (typeof playerY === 'number') ? playerY : -1,
      dir:   (typeof playerDir !== 'undefined') ? playerDir : 's',
      floor: (typeof currentFloor === 'number') ? currentFloor : null,
    };
    try { await mpPostVisitMessage(_channelId, 'visitor', 'position', payload); }
    catch (e) { /* tolérant */ }
    return true;
  }

  // ── Phase D §5.3 — host informe le visiteur de sa position ──────
  async function _visitNotifyHostMove() {
    if (_role !== 'host' || !_channelId) return false;
    const now = Date.now();
    if (now - _lastMoveSent < VISIT_MOVE_THROTTLE_MS) return false;
    _lastMoveSent = now;
    if (typeof mpPostVisitMessage !== 'function') return false;
    const payload = {
      x:     (typeof playerX === 'number') ? playerX : -1,
      y:     (typeof playerY === 'number') ? playerY : -1,
      dir:   (typeof playerDir !== 'undefined') ? playerDir : 's',
      floor: (typeof currentFloor === 'number') ? currentFloor : null,
    };
    try { await mpPostVisitMessage(_channelId, 'host', 'hostPosition', payload); }
    catch (e) { /* tolérant */ }
    return true;
  }

  // ── Phase D §6.7 — envoie une emote ─────────────────────────────
  // `kind` doit appartenir à la banque du rôle courant (sinon ignoré).
  // Retourne true si le message a été posté, false sinon.
  async function _visitSendEmote(kind) {
    if (!_role || !_channelId) return false;
    const banque = (_role === 'visitor') ? VISITOR_EMOTES : HOST_EMOTES;
    if (!banque[kind]) return false;
    const now = Date.now();
    if (now - _lastEmoteSent < VISIT_EMOTE_THROTTLE_MS) return false;
    _lastEmoteSent = now;
    if (typeof mpPostVisitMessage !== 'function') return false;
    try { await mpPostVisitMessage(_channelId, _role, 'emote', { kind }); }
    catch (e) { /* tolérant */ }
    // Feedback local : un toast discret confirme l'envoi côté lanceur.
    if (typeof addMsg === 'function') {
      const def = banque[kind];
      addMsg(`${def.icon} Tu envoies : « ${def.text} »`, '');
    }
    return true;
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
    // C.4 — helpers exposés pour smoke tests (forcer un drop, injecter
    // un timestamp). Pas appelés en runtime normal.
    window._visitCheckTimeout       = _visitCheckTimeout;
    window._visitSendPing           = _sendPing;
    window._visitForceLastSeen      = function (ts) { _lastSeen = ts; };
    // Phase D §5/§6.7 — hooks de position + emotes.
    window._visitNotifyVisitorMove  = _visitNotifyVisitorMove;
    window._visitNotifyHostMove     = _visitNotifyHostMove;
    window._visitSendEmote          = _visitSendEmote;
    window.getVisitorAt             = getVisitorAt;
    window.getRemoteHostAt          = getRemoteHostAt;
    // Phase F — qualité réseau (badge HUD) + helpers tests.
    window._visitGetQuality         = _visitGetQuality;
    window._visitIsReconnecting     = function () { return _reconnectMode; };
    window.VISITOR_EMOTES           = VISITOR_EMOTES;
    window.HOST_EMOTES              = HOST_EMOTES;
    // Test helper : remettre à zéro les throttles d'émission entre deux
    // assertions (sinon la 2e émission rapide est rejetée).
    window._visitResetThrottles     = function () { _lastMoveSent = 0; _lastEmoteSent = 0; };
  }
})();

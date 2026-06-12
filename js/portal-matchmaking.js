// ============================================================
// PORTAL-MATCHMAKING — Invitation de visite (V1a Phase B)
// ============================================================
// UI du matchmaking pour la Cheminette Inter-Mondes
// (parallel-worlds.md §3.3 + §10 Phase B). Pilote :
//
//   Côté visiteur :
//     openPortalTargetModal() ouvre #portal-target-overlay,
//     liste mpListAvailableHosts(), envoie mpPostVisitRequest()
//     au clic, puis poll mpPollOutgoingVisitStatus() jusqu'à
//     accepted / refused / expired (60s).
//
//   Côté host :
//     showIncomingVisitRequest(req) (déclenché par le poll de
//     multiplayer.js) affiche #portal-incoming-overlay avec 30s
//     de décompte. accept → mpRespondVisitRequest(id, 'accepted'),
//     refus / timeout → 'refused'.
//
// Aucun rendu de donjon distant ici : Phase B se termine sur
// l'acceptation. Phase C (snapshot Supabase Realtime) prendra
// le relais via window.onVisitAccepted (hook prévu).
//
// Dégradation silencieuse : si Supabase non configuré (file://),
// la modale s'ouvre quand même et affiche « Aucun sorcier en
// ligne ». Le smoke peut stubber mpListAvailableHosts /
// mpPostVisitRequest pour tester l'UI en isolation.
// ============================================================

(function () {
  const TARGET_OVERLAY_ID   = 'portal-target-overlay';
  const TARGET_PANEL_ID     = 'portal-target-panel';
  const INCOMING_OVERLAY_ID = 'portal-incoming-overlay';
  const INCOMING_PANEL_ID   = 'portal-incoming-panel';

  const VISITOR_POLL_MS    = 2500;
  const VISITOR_TIMEOUT_MS = 60000;
  const HOST_RESPOND_MS    = 30000;

  // ── État local ────────────────────────────────────────────
  let _outgoingReqId       = null;
  let _outgoingPollHandle  = null;
  let _outgoingDeadline    = 0;
  let _incomingDeadline    = 0;
  let _incomingCountdownH  = null;

  // Échappement HTML unifié (window.htmlEscape, js/html-escape.js chargé tôt).
  const _esc = window.htmlEscape;

  // Blason de Maison utilisé dans la liste (réutilise le pattern
  // multiplayer.js — `_mpHouseCrest`). Pas critique : si la fonction
  // existe on l'utilise, sinon on fallback texte.
  function _houseCrest(house) {
    if (typeof _mpHouseCrest === 'function') return _mpHouseCrest(house);
    return house ? _esc(house) : '';
  }

  // ──────────────────────────────────────────────────────────
  // Côté VISITEUR — modale de destinations
  // ──────────────────────────────────────────────────────────

  async function openPortalTargetModal() {
    let overlay = document.getElementById(TARGET_OVERLAY_ID);
    let panel   = document.getElementById(TARGET_PANEL_ID);
    if (!overlay || !panel) return;
    overlay.style.display = 'flex';
    panel.innerHTML = _renderLoadingHtml();

    // Liste asynchrone. mpListAvailableHosts peut être absente
    // (multiplayer.js non chargé) ou retourner null (réseau KO).
    let hosts = null;
    if (typeof mpListAvailableHosts === 'function') {
      try { hosts = await mpListAvailableHosts(); }
      catch (e) { hosts = null; }
    } else {
      hosts = [];
    }
    panel.innerHTML = _renderHostListHtml(hosts);
  }

  function closePortalTargetModal() {
    const overlay = document.getElementById(TARGET_OVERLAY_ID);
    if (overlay) overlay.style.display = 'none';
    _clearOutgoingState();
  }

  function _renderLoadingHtml() {
    return `
      <div class="portal-modal-head">
        <h2>🌀 Cheminette Inter-Mondes</h2>
        <button class="portal-close-btn" onclick="closePortalTargetModal()" aria-label="Fermer">✕</button>
      </div>
      <div class="portal-modal-body portal-loading">
        <div class="portal-spinner"></div>
        <p>Recherche de sorciers connectés à d'autres châteaux…</p>
      </div>`;
  }

  function _renderHostListHtml(hosts) {
    const head = `
      <div class="portal-modal-head">
        <h2>🌀 Cheminette Inter-Mondes</h2>
        <button class="portal-close-btn" onclick="closePortalTargetModal()" aria-label="Fermer">✕</button>
      </div>`;
    if (hosts === null) {
      return head + `
        <div class="portal-modal-body portal-empty">
          <p class="portal-warn">Le réseau astral reste silencieux.</p>
          <p class="portal-hint">Aucune connexion au registre des sorciers — réessaie plus tard.</p>
        </div>`;
    }
    if (!hosts.length) {
      return head + `
        <div class="portal-modal-body portal-empty">
          <p>Aucun sorcier ne médite à l'heure actuelle.</p>
          <p class="portal-hint">Reviens plus tard — un voyageur finira par allumer sa cheminée.</p>
        </div>`;
    }
    const rows = hosts.map((h, i) => _renderHostRowHtml(h, i)).join('');
    return head + `
      <div class="portal-modal-body">
        <p class="portal-intro">Choisis un château parallèle où poser le pied :</p>
        <div class="portal-host-list">${rows}</div>
      </div>`;
  }

  function _renderHostRowHtml(h, idx) {
    const name  = _esc(h.name  || 'Sorcier·ère');
    const house = _esc(h.house || '');
    const level = Number(h.level) || 1;
    const floor = Number(h.floor) || 1;
    const crest = house ? _houseCrest(house) : '';
    return `
      <button class="portal-host-row" data-idx="${idx}" onclick="_portalTargetClick(${idx})">
        <div class="portal-host-crest">${crest}</div>
        <div class="portal-host-meta">
          <div class="portal-host-name">${name}</div>
          <div class="portal-host-sub">${house ? house + ' · ' : ''}Niv. ${level} · Étage ${floor}</div>
        </div>
        <div class="portal-host-cta">Demander &raquo;</div>
      </button>`;
  }

  // Indexé par position dans la liste — la liste est ré-évaluée à
  // chaque appel via window.__portalLastHosts pour rester pure.
  let _lastHosts = [];

  // Bouton "Demander" → pose la demande puis bascule sur l'écran
  // d'attente. window._mpVisitOutgoing porte le contexte pour le poll.
  async function _portalTargetClick(idx) {
    const host = _lastHosts[idx];
    if (!host) return;
    const panel = document.getElementById(TARGET_PANEL_ID);
    if (!panel) return;
    panel.innerHTML = _renderWaitingHtml(host, 'sending');

    let req = null;
    if (typeof mpPostVisitRequest === 'function') {
      try { req = await mpPostVisitRequest(host); }
      catch (e) { req = null; }
    }
    if (!req || !req.id) {
      panel.innerHTML = _renderErrorHtml(
        "Impossible d'allumer la cheminée vers ce château.",
        "Le registre astral n'a pas accepté ta demande."
      );
      return;
    }
    _outgoingReqId    = req.id;
    _outgoingDeadline = Date.now() + VISITOR_TIMEOUT_MS;
    panel.innerHTML   = _renderWaitingHtml(host, 'pending');
    _startOutgoingPoll(host);
  }

  function _renderWaitingHtml(host, phase) {
    const name = _esc(host.name || 'Sorcier·ère');
    const text = (phase === 'sending')
      ? "Une étincelle verte rejoint son foyer…"
      : `${name} entend ta demande. Patiente — il (ou elle) doit accepter.`;
    return `
      <div class="portal-modal-head">
        <h2>🌀 En attente</h2>
        <button class="portal-close-btn" onclick="closePortalTargetModal()" aria-label="Fermer">✕</button>
      </div>
      <div class="portal-modal-body portal-waiting">
        <div class="portal-spinner"></div>
        <p>${text}</p>
        <p class="portal-hint">Si rien ne vient, la connexion s'éteindra d'elle-même.</p>
      </div>`;
  }

  function _renderErrorHtml(title, hint) {
    return `
      <div class="portal-modal-head">
        <h2>🌀 ${_esc(title)}</h2>
        <button class="portal-close-btn" onclick="closePortalTargetModal()" aria-label="Fermer">✕</button>
      </div>
      <div class="portal-modal-body portal-empty">
        <p class="portal-warn">${_esc(hint)}</p>
      </div>`;
  }

  function _startOutgoingPoll(host) {
    _cancelOutgoingPoll();
    const intervalMs = (typeof window !== 'undefined'
        && Number.isFinite(window.__portalPollMs))
      ? window.__portalPollMs : VISITOR_POLL_MS;
    _outgoingPollHandle = setInterval(async () => {
      if (typeof window !== 'undefined') {
        window.__portalPollTicks = (window.__portalPollTicks || 0) + 1;
      }
      if (!_outgoingReqId) { _cancelOutgoingPoll(); return; }
      if (Date.now() >= _outgoingDeadline) {
        _cancelOutgoingPoll();
        _onVisitorTimeout(host);
        return;
      }
      let status = null;
      const pollFn = (typeof window !== 'undefined' && window.mpPollOutgoingVisitStatus)
        || (typeof mpPollOutgoingVisitStatus === 'function' ? mpPollOutgoingVisitStatus : null);
      if (typeof pollFn === 'function') {
        try { status = await pollFn(_outgoingReqId); }
        catch (e) { status = null; }
      }
      if (!status) return;       // poll en échec — on retentera au tick suivant
      if (status.status === 'accepted') {
        _cancelOutgoingPoll();
        _onVisitorAccepted(host, status);
      } else if (status.status === 'refused' || status.status === 'expired') {
        _cancelOutgoingPoll();
        _onVisitorRefused(host, status);
      }
    }, intervalMs);
  }

  // Clear le timer sans toucher au reqId/deadline : ces deux derniers
  // sont set juste avant _startOutgoingPoll(host) (qui nous appelle
  // pour purger un timer précédent) — les écraser ici déclencherait
  // un cancel-on-first-tick. Le reqId/deadline sont nettoyés par les
  // gestionnaires terminaux (accepted/refused/timeout/close).
  function _cancelOutgoingPoll() {
    if (_outgoingPollHandle) {
      clearInterval(_outgoingPollHandle);
      _outgoingPollHandle = null;
    }
  }

  function _clearOutgoingState() {
    _cancelOutgoingPoll();
    _outgoingReqId    = null;
    _outgoingDeadline = 0;
  }

  function _onVisitorTimeout(host) {
    closePortalTargetModal();
    if (typeof addMsg === 'function') {
      addMsg(`${_esc(host.name)} n'a pas répondu — le portail s'est éteint.`, '');
    }
  }

  function _onVisitorRefused(host, status) {
    closePortalTargetModal();
    if (typeof addMsg === 'function') {
      addMsg(`${_esc(host.name)} refuse ton invitation — la cheminée se ferme.`, 'bad');
    }
  }

  // Acceptation : Phase B s'arrête au déclenchement de l'anim portail.
  // Phase C branchera ici le snapshot Supabase Realtime + rendu distant.
  function _onVisitorAccepted(host, status) {
    if (typeof window !== 'undefined') {
      window.__portalAcceptedCalls = (window.__portalAcceptedCalls || 0) + 1;
    }
    closePortalTargetModal();
    if (typeof addMsg === 'function') {
      addMsg(`${_esc(host.name)} t'ouvre son monde — le portail s'embrase !`, 'good');
    }
    const fx = (typeof playPortalOpen === 'function')
      ? playPortalOpen
      : (opts, cb) => { if (typeof cb === 'function') cb(); };
    fx({ hostName: host.name }, () => {
      if (typeof addMsg === 'function') {
        addMsg("Le rendu du donjon distant n'est pas encore branché — Phase C à venir.", '');
      }
      const close = (typeof playPortalClose === 'function')
        ? playPortalClose
        : (opts, cb) => { if (typeof cb === 'function') cb(); };
      close({}, () => { if (typeof updateUI === 'function') updateUI(); });
    });
    if (typeof window !== 'undefined' && typeof window.onVisitAccepted === 'function') {
      try { window.onVisitAccepted(host, status); } catch (e) { /* hook tolérant */ }
    }
  }

  // ──────────────────────────────────────────────────────────
  // Côté HOST — modale d'acceptation
  // ──────────────────────────────────────────────────────────

  function showIncomingVisitRequest(req) {
    if (!req || !req.id) return;
    if (typeof window !== 'undefined' && window._mpVisitPendingReq) return;
    const overlay = document.getElementById(INCOMING_OVERLAY_ID);
    const panel   = document.getElementById(INCOMING_PANEL_ID);
    if (!overlay || !panel) return;
    if (typeof window !== 'undefined') window._mpVisitPendingReq = req;
    overlay.style.display = 'flex';
    _incomingDeadline = Date.now() + HOST_RESPOND_MS;
    _renderIncomingPanel(req);
    if (_incomingCountdownH) clearInterval(_incomingCountdownH);
    _incomingCountdownH = setInterval(() => {
      if (Date.now() >= _incomingDeadline) {
        _refuseIncomingVisit();   // timeout = refus implicite
      } else {
        _renderIncomingPanel(req);
      }
    }, 1000);
  }

  function _renderIncomingPanel(req) {
    const panel = document.getElementById(INCOMING_PANEL_ID);
    if (!panel) return;
    const left = Math.max(0, Math.ceil((_incomingDeadline - Date.now()) / 1000));
    const name  = _esc(req.visitor_name  || 'Un voyageur');
    const house = _esc(req.visitor_house || '');
    const level = Number(req.visitor_level) || 1;
    const crest = house ? _houseCrest(house) : '';
    panel.innerHTML = `
      <div class="portal-modal-head">
        <h2>🌀 Une cheminée s'allume…</h2>
        <span class="portal-countdown">${left}s</span>
      </div>
      <div class="portal-modal-body portal-incoming">
        <div class="portal-incoming-card">
          <div class="portal-host-crest">${crest}</div>
          <div class="portal-host-meta">
            <div class="portal-host-name">${name}</div>
            <div class="portal-host-sub">${house ? house + ' · ' : ''}Niv. ${level}</div>
          </div>
        </div>
        <p class="portal-intro">
          ${name} demande la permission de visiter ton château.
        </p>
        <div class="portal-action-row">
          <button class="portal-btn portal-btn-accept" onclick="_portalIncomingAccept()">Accepter</button>
          <button class="portal-btn portal-btn-refuse" onclick="_portalIncomingRefuse()">Refuser</button>
        </div>
      </div>`;
  }

  function _closeIncomingOverlay() {
    if (_incomingCountdownH) { clearInterval(_incomingCountdownH); _incomingCountdownH = null; }
    _incomingDeadline = 0;
    if (typeof window !== 'undefined') window._mpVisitPendingReq = null;
    const overlay = document.getElementById(INCOMING_OVERLAY_ID);
    if (overlay) overlay.style.display = 'none';
  }

  async function _acceptIncomingVisit() {
    const req = (typeof window !== 'undefined') ? window._mpVisitPendingReq : null;
    if (!req) return;
    _closeIncomingOverlay();
    if (typeof addMsg === 'function') {
      addMsg(`Tu accueilles ${_esc(req.visitor_name)} dans ton château.`, 'good');
    }
    // Phase C.2 : génère un channelId que le visiteur lira au poll suivant.
    // Fallback déterministe si le générateur n'est pas chargé (modules optionnels).
    const channelId = (typeof window !== 'undefined' && typeof window._visitGenChannelId === 'function')
      ? window._visitGenChannelId()
      : ('ch-' + Date.now() + '-' + Math.random().toString(16).slice(2, 10));
    if (typeof mpRespondVisitRequest === 'function') {
      await mpRespondVisitRequest(req.id, 'accepted', channelId);
    }
    if (typeof window !== 'undefined' && typeof window.onIncomingVisitAccepted === 'function') {
      try { window.onIncomingVisitAccepted(req, channelId); } catch (e) { /* tolérant */ }
    }
  }

  async function _refuseIncomingVisit() {
    const req = (typeof window !== 'undefined') ? window._mpVisitPendingReq : null;
    if (!req) return;
    _closeIncomingOverlay();
    if (typeof addMsg === 'function') {
      addMsg(`Tu refermes la cheminée — ${_esc(req.visitor_name)} reste de son côté.`, '');
    }
    if (typeof mpRespondVisitRequest === 'function') {
      await mpRespondVisitRequest(req.id, 'refused');
    }
  }

  // ── Exposition globale ─────────────────────────────────────
  // Bind via wrappers pour que la modale puisse muter `_lastHosts`.
  const _origOpen = openPortalTargetModal;
  async function _openWithCache() {
    const overlay = document.getElementById(TARGET_OVERLAY_ID);
    const panel   = document.getElementById(TARGET_PANEL_ID);
    if (!overlay || !panel) return;
    overlay.style.display = 'flex';
    panel.innerHTML = _renderLoadingHtml();
    let hosts = null;
    if (typeof mpListAvailableHosts === 'function') {
      try { hosts = await mpListAvailableHosts(); }
      catch (e) { hosts = null; }
    } else {
      hosts = [];
    }
    _lastHosts = Array.isArray(hosts) ? hosts : [];
    panel.innerHTML = _renderHostListHtml(hosts);
  }

  window.openPortalTargetModal    = _openWithCache;
  window.closePortalTargetModal   = closePortalTargetModal;
  window._portalTargetClick       = _portalTargetClick;
  window.showIncomingVisitRequest = showIncomingVisitRequest;
  window._portalIncomingAccept    = _acceptIncomingVisit;
  window._portalIncomingRefuse    = _refuseIncomingVisit;
})();

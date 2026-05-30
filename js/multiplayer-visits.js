// ============================================================
// MULTIJOUEUR — Visites inter-mondes : matchmaking, canal & verrous
// ============================================================
// Demandes de visite (mpListAvailableHosts, mpPostVisitRequest…), canal de
// messages de visite (mpPostVisitMessage/mpPollVisitMessages) et Verrous de
// Sang (mpPostBloodSeal…). Dépend du cœur (transport REST) de multiplayer.js.
// Chargé APRÈS multiplayer.js, AVANT visit-channel.js / atelier-voyageur.js.
// ============================================================
// ============================================================
// MONDES PARALLÈLES — invitation de visite (V1a Phase B)
// ============================================================
// Matchmaking pour la Cheminette Inter-Mondes. Le visiteur liste les
// hosts en ligne (mp_presence filtré mode normal + status=exploring +
// pas Ironman + autre joueur), pose une demande dans mp_visit_requests
// (TTL 60s), puis poll son statut. Côté host, le poll des incoming
// requests déclenche la modale d'acceptation (30s pour répondre).
//
// SQL : voir .claude/plans/parallel-worlds.md §12.1.
// Disjoncteur : si la table absente / hors-ligne, dégrade en silence.
// ============================================================

const MP_VISITS_TABLE        = 'mp_visit_requests';
const MP_VISIT_POLL_MS       = 3000;     // poll des demandes entrantes
const MP_VISIT_EXPIRES_SEC   = 60;       // TTL d'une demande pending
const MP_VISIT_RESPOND_MS    = 30000;    // 30s pour le host pour répondre
const MP_VISIT_OUTGOING_POLL_MS = 2500;  // poll de réponse visiteur

let _mpVisitPollTimer = null;
let _mpVisitTableMissing = false;       // disjoncteur dédié

// Renvoie la liste des hosts disponibles (asynchrone). Filtre :
// mode normal + status='exploring' + last_seen récent + pas moi.
// En file:// (smoke / dev local) ou si non-configuré : tableau vide.
// Le smoke peut stubber cette fonction via window.mpListAvailableHosts.
async function mpListAvailableHosts() {
  if (!_mpConfigured()) return [];
  try {
    const sinceIso = new Date(Date.now() - MP_STALE_SEC * 1000).toISOString();
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.presenceTable}`
      + '?select=player_id,name,house,level,floor,hero_keys,status,last_seen'
      + `&mode=eq.normal`
      + `&status=eq.exploring`
      + `&player_id=neq.${encodeURIComponent(getMpPlayerId())}`
      + `&last_seen=gt.${encodeURIComponent(sinceIso)}`
      + '&order=last_seen.desc'
      + '&limit=20';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    _mpNoteFailure(e);
    return null;     // null = erreur réseau (≠ tableau vide = personne)
  }
}

// Pose une demande de visite. Renvoie l'objet inséré (avec id) ou null.
async function mpPostVisitRequest(host) {
  if (!_mpConfigured() || _mpVisitTableMissing) return null;
  if (!host || !host.player_id) return null;
  const row = {
    visitor_id:    getMpPlayerId(),
    visitor_name:  (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
    visitor_house: (typeof chosenHouse !== 'undefined') ? chosenHouse : null,
    visitor_level: (typeof player !== 'undefined' && player.level) || 1,
    host_id:       host.player_id,
    status:        'pending'
  };
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`,
      {
        method:  'POST',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'return=representation'
        }),
        body: JSON.stringify(row)
      }
    );
    if (res.status === 404) { _mpVisitTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Récupère le statut courant d'une demande sortante. Renvoie l'objet
// (status: pending|accepted|refused|expired, channel_id si accepté) ou
// null en cas d'erreur.
async function mpPollOutgoingVisitStatus(reqId) {
  if (!_mpConfigured() || _mpVisitTableMissing || !reqId) return null;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`
      + `?id=eq.${encodeURIComponent(reqId)}&select=id,status,responded_at,host_id,channel_id`;
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpVisitTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Récupère les demandes entrantes pending pour le host courant. Le poll
// est démarré par mpStartSession (boucle parallèle au heartbeat). Quand
// au moins une demande non-expirée est détectée, déclenche la modale
// d'acceptation via window.showIncomingVisitRequest.
async function _mpPollIncomingVisitRequests() {
  if (!mpActive || !_mpConfigured() || _mpVisitTableMissing) return;
  // Ne pas poller si le host est lui-même en mode Ironman (filtré au
  // démarrage), ni si une modale d'acceptation est déjà ouverte.
  if (mpMode === 'ironman') return;
  if (typeof window !== 'undefined' && window._mpVisitPendingReq) return;
  try {
    const sinceIso = new Date(Date.now() - MP_VISIT_EXPIRES_SEC * 1000).toISOString();
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`
      + `?host_id=eq.${encodeURIComponent(getMpPlayerId())}`
      + '&status=eq.pending'
      + `&created_at=gt.${encodeURIComponent(sinceIso)}`
      + '&order=created_at.desc'
      + '&limit=1';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpVisitTableMissing = true; return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    if (Array.isArray(rows) && rows[0]
        && (typeof inBattle === 'undefined' || !inBattle)) {
      // Phase F — auto-refus silencieux si le host a fermé son accueil.
      // La requête est marquée 'refused' pour que le visiteur cesse de
      // poller, mais aucune modale n'est ouverte ici.
      if (typeof visitsClosed !== 'undefined' && visitsClosed) {
        if (typeof mpRespondVisitRequest === 'function') {
          try { await mpRespondVisitRequest(rows[0].id, 'refused'); }
          catch (e) { /* tolérant */ }
        }
        return;
      }
      if (typeof showIncomingVisitRequest === 'function') {
        showIncomingVisitRequest(rows[0]);
      }
    }
  } catch (e) {
    _mpNoteFailure(e);
  }
}

// Update du statut d'une demande (acceptation / refus côté host).
// `channelId` (optionnel, requis si status='accepted') : UUID partagé
// que le visiteur lira au poll suivant pour ouvrir le canal de visite.
async function mpRespondVisitRequest(reqId, status, channelId) {
  if (!_mpConfigured() || _mpVisitTableMissing || !reqId) return null;
  if (status !== 'accepted' && status !== 'refused') return null;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISITS_TABLE}`
      + `?id=eq.${encodeURIComponent(reqId)}`;
    const body = { status, responded_at: new Date().toISOString() };
    if (status === 'accepted' && channelId) body.channel_id = channelId;
    const res = await fetch(url, {
      method:  'PATCH',
      headers: _mpHeaders({
        'Content-Type': 'application/json',
        'Prefer':       'return=minimal'
      }),
      body: JSON.stringify(body)
    });
    if (res.status === 404) { _mpVisitTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _mpNoteSuccess();
    return { id: reqId, status, channel_id: channelId || null };
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Démarre/arrête le poll des demandes entrantes — branché à
// mpStartSession / mpStopSession via les helpers _mpVisitsAttach.
function _mpVisitsAttach() {
  // Bascule maître (S2.6) : ne pas démarrer le poll des visites entrantes
  // si le chemin Mondes Parallèles est désactivé.
  if (typeof parallelWorldsEnabled === 'function' && !parallelWorldsEnabled()) return;
  if (_mpVisitPollTimer || !_mpConfigured()) return;
  _mpVisitPollTimer = setInterval(_mpPollIncomingVisitRequests, MP_VISIT_POLL_MS);
}

function _mpVisitsDetach() {
  if (_mpVisitPollTimer) { clearInterval(_mpVisitPollTimer); _mpVisitPollTimer = null; }
}

// ============================================================
// MONDES PARALLÈLES — canal de visite REST polling (V1a Phase C.2)
// ============================================================
// Transport messages entre host et visiteur via la table
// `mp_visit_messages`. Polling REST (~2,5 s) cohérent avec Phase B —
// pas de Supabase Realtime SDK (philosophie zéro-dépendance). Le canal
// est identifié par `channel_id` (UUID généré par le host à
// l'acceptation, partagé via mp_visit_requests).
//
// Types V1a (cf. parallel-worlds.md §5) :
//   host → visiteur : 'snapshot' (initial), 'hostPosition', 'bye'
//   visiteur → host : 'position', 'bye'
//
// SQL : voir parallel-worlds.md §12.3.
// Disjoncteur : si la table absente / hors-ligne, dégrade en silence.
// ============================================================

const MP_VISIT_MESSAGES_TABLE = 'mp_visit_messages';
let _mpVisitMsgTableMissing   = false;       // disjoncteur dédié

// Pose un message sur le canal. Retourne l'objet inséré (avec id +
// created_at) ou null. `sender` ∈ {'host','visitor'}, `type` le kind
// du message, `payload` un objet JSON sérialisable (peut être null).
async function mpPostVisitMessage(channelId, sender, type, payload) {
  if (!_mpConfigured() || _mpVisitMsgTableMissing) return null;
  if (!channelId || !sender || !type) return null;
  if (sender !== 'host' && sender !== 'visitor') return null;
  const row = {
    channel_id: channelId,
    sender,
    type,
    payload: (payload === undefined) ? null : payload
  };
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISIT_MESSAGES_TABLE}`,
      {
        method:  'POST',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'return=representation'
        }),
        body: JSON.stringify(row)
      }
    );
    if (res.status === 404) { _mpVisitMsgTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Récupère les nouveaux messages du canal depuis `sinceIso`. Filtre
// par `excludeSender` pour ne pas relire ses propres messages — on
// passe son propre rôle. Retourne un tableau (ordre chronologique
// croissant) ou null en cas d'erreur.
async function mpPollVisitMessages(channelId, sinceIso, excludeSender) {
  if (!_mpConfigured() || _mpVisitMsgTableMissing) return null;
  if (!channelId) return null;
  try {
    let url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_VISIT_MESSAGES_TABLE}`
      + `?channel_id=eq.${encodeURIComponent(channelId)}`
      + '&select=id,sender,type,payload,created_at'
      + '&order=created_at.asc'
      + '&limit=50';
    if (sinceIso) {
      url += `&created_at=gt.${encodeURIComponent(sinceIso)}`;
    }
    if (excludeSender === 'host' || excludeSender === 'visitor') {
      url += `&sender=neq.${excludeSender}`;
    }
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpVisitMsgTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// ============================================================
// MONDES PARALLÈLES — Verrou de Sang (V1c Phase H §6.9)
// ============================================================
// Persistance asynchrone des menaces déposées par les visiteurs chez
// leurs hôtes. Le visiteur pose une ligne (status='pending') ; le host
// la lit à l'entrée d'étage, la résout en combat, met à jour le status
// (`resolved`/`fled`) ; le visiteur claim le gain au prochain démarrage.
//
// Disjoncteur dédié `_mpThreatsTableMissing` : si la table n'existe
// pas (404), désactivation silencieuse cohérente avec les autres
// tables MP.
//
// SQL : voir parallel-worlds.md §12.2.
// ============================================================

const MP_THREATS_TABLE       = 'mp_threats';
let   _mpThreatsTableMissing = false;

// Visiteur → pose un Verrou. `row` ∈ { visitor_id, visitor_name,
// host_id, floor, x, y, monster_id, status:'pending' }. Retourne la
// ligne insérée (avec id) ou null.
async function mpPostBloodSeal(row) {
  if (!_mpConfigured() || _mpThreatsTableMissing) return null;
  if (!row) return null;
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_THREATS_TABLE}`,
      {
        method:  'POST',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'return=representation'
        }),
        body: JSON.stringify(row)
      }
    );
    if (res.status === 404) { _mpThreatsTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Host → liste les Verrous actifs sur un étage donné (status='pending').
async function mpListHostSealsForFloor(hostId, floor) {
  if (!_mpConfigured() || _mpThreatsTableMissing) return [];
  if (!hostId || typeof floor !== 'number') return [];
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_THREATS_TABLE}`
      + `?host_id=eq.${encodeURIComponent(hostId)}`
      + `&floor=eq.${floor}`
      + '&status=eq.pending'
      + '&select=id,visitor_id,visitor_name,floor,x,y,monster_id,posted_at'
      + '&order=posted_at.asc'
      + '&limit=50';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpThreatsTableMissing = true; return []; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    _mpNoteFailure(e);
    return [];
  }
}

// Host → met à jour le statut d'un Verrou après combat. `status` ∈
// {'resolved','fled'}.
async function mpUpdateSealStatus(sealId, status) {
  if (!_mpConfigured() || _mpThreatsTableMissing) return null;
  if (!sealId || (status !== 'resolved' && status !== 'fled')) return null;
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_THREATS_TABLE}?id=eq.${encodeURIComponent(sealId)}`,
      {
        method:  'PATCH',
        headers: _mpHeaders({
          'Content-Type': 'application/json',
          'Prefer':       'return=representation'
        }),
        body: JSON.stringify({ status, resolved_at: new Date().toISOString() })
      }
    );
    if (res.status === 404) { _mpThreatsTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _mpNoteSuccess();
    return true;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}

// Visiteur → liste les Verrous résolus/fuis non encore claimés.
async function mpListVisitorResolvedSeals(visitorId) {
  if (!_mpConfigured() || _mpThreatsTableMissing) return [];
  if (!visitorId) return [];
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_THREATS_TABLE}`
      + `?visitor_id=eq.${encodeURIComponent(visitorId)}`
      + '&status=in.(resolved,fled)'
      + '&claimed_at=is.null'
      + '&select=id,host_id,floor,x,y,monster_id,status,resolved_at,visitor_name'
      + '&order=resolved_at.asc'
      + '&limit=20';
    const res = await fetch(url, { headers: _mpHeaders() });
    if (res.status === 404) { _mpThreatsTableMissing = true; return []; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    _mpNoteSuccess();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    _mpNoteFailure(e);
    return [];
  }
}

// Visiteur → marque un Verrou comme claimé après affichage de la modale.
async function mpClaimSeal(sealId) {
  if (!_mpConfigured() || _mpThreatsTableMissing) return null;
  if (!sealId) return null;
  try {
    const res = await fetch(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_THREATS_TABLE}?id=eq.${encodeURIComponent(sealId)}`,
      {
        method:  'PATCH',
        headers: _mpHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ claimed_at: new Date().toISOString() })
      }
    );
    if (res.status === 404) { _mpThreatsTableMissing = true; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _mpNoteSuccess();
    return true;
  } catch (e) {
    _mpNoteFailure(e);
    return null;
  }
}


// ============================================================
// MONDES PARALLÈLES — bascule maître UI (S2.6)
// ============================================================
// Masque les boutons Visites / Atelier du Voyageur quand le chemin
// Mondes Parallèles est désactivé (MP_CONFIG.parallelWorldsEnabled=false).
// Défensif : no-op si le DOM n'expose pas les boutons (file:// smoke).
function _mpApplyParallelWorldsUiGate() {
  if (typeof document === 'undefined') return;
  const off = (typeof parallelWorldsEnabled === 'function') && !parallelWorldsEnabled();
  ['btn-visits', 'btn-atelier'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = off ? 'none' : '';
  });
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', _mpApplyParallelWorldsUiGate);
}

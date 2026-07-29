// ============================================================
// MULTIJOUEUR — Social : messages à gabarits & cadeaux
// ============================================================
// Messages façon Dark Souls (mpPostMessage, getMessageAt) + cadeaux
// (mpOpenGiftView, claimPendingGifts). Dépend du cœur (transport REST,
// présence) de multiplayer.js. Chargé APRÈS multiplayer.js.
// ============================================================
// ============================================================
// PHASE 4 — Messages à gabarits (§6, façon Dark Souls)
// ============================================================
// Aucun texte libre : un message = un gabarit + un mot, tous deux issus
// de banques prédéfinies. Stocké par `id` dans `mp_messages` ; le texte
// est recomposé côté lecteur depuis SES banques locales → toute ligne
// dont le gabarit/mot est inconnu est simplement ignorée (anti-injection).

// Gabarits — `%` est le point d'insertion du mot ; sans `%` = phrase fixe.
const MP_MSG_TEMPLATES = [
  { id: 'beware',   text: 'Méfie-toi de %' },
  { id: 'try',      text: 'Essaie %' },
  { id: 'here',     text: 'Ici, %' },
  { id: 'ahead',    text: '% droit devant' },
  { id: 'need',     text: 'Il te faut %' },
  { id: 'ifonly',   text: 'Si seulement j\'avais eu %…' },
  { id: 'hidefrom', text: 'Cache-toi de %' },
  { id: 'luck',     text: 'Bonne chance, sorcier' },
  { id: 'congrats', text: 'Félicitations !' },
  { id: 'courage',  text: 'Courage — tu y es presque' },
];

// Mots — banque fermée.
const MP_MSG_WORDS = [
  { id: 'trap',     text: 'un piège' },
  { id: 'monster',  text: 'un monstre' },
  { id: 'boss',     text: 'un boss redoutable' },
  { id: 'chest',    text: 'un coffre' },
  { id: 'gold',     text: 'de l\'or' },
  { id: 'secret',   text: 'un passage secret' },
  { id: 'fountain', text: 'une fontaine' },
  { id: 'exit',     text: 'la sortie' },
  { id: 'stairs',   text: 'l\'escalier' },
  { id: 'spell',    text: 'un sortilège' },
  { id: 'fire',     text: 'la magie de feu' },
  { id: 'ice',      text: 'la magie de glace' },
  { id: 'dementor', text: 'un Détraqueur' },
  { id: 'potion',   text: 'une potion' },
  { id: 'caution',  text: 'la prudence' },
  { id: 'wand',     text: 'une meilleure baguette' },
  { id: 'courage',  text: 'du courage' },
  { id: 'rest',     text: 'du repos' },
];

// Recompose le texte d'un message depuis les banques locales.
function mpComposeText(templateId, wordId) {
  const t = MP_MSG_TEMPLATES.find(x => x.id === templateId);
  if (!t) return null;
  if (t.text.indexOf('%') === -1) return t.text;
  const w = MP_MSG_WORDS.find(x => x.id === wordId);
  if (!w) return null;
  return t.text.replace('%', w.text);
}

function getMessageAt(x, y) {
  if (!messagePlacements || messagePlacements.size === 0) return null;
  return messagePlacements.get(x + ',' + y) || null;
}

// ── Lecture & projection ────────────────────────────────────
async function _mpPollMessages() {
  if (!mpActive || !_mpConfigured()) return;
  if (typeof currentFloor === 'undefined') return;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.messagesTable}`
      + '?select=author_id,author_name,floor,x,y,template,word'
      + `&floor=eq.${currentFloor}`
      + `&mode=eq.${encodeURIComponent(mpMode)}`
      + '&order=created_at.desc&limit=80';
    const rows = await _mpSelectRows(url);
    if (rows) _mpProjectMessages(rows);
  } catch (e) {
    _mpNoteFailure(e);
  }
}

// Projette les messages distants sur les cases FLOOR du donjon local.
function _mpProjectMessages(rows) {
  const next = new Map();
  if (typeof dungeon !== 'undefined' && dungeon && Array.isArray(rows)) {
    for (const r of rows) {
      if (!r) continue;
      const x = r.x | 0, y = r.y | 0;
      if (y < 0 || y >= dungeon.length || !dungeon[y]) continue;
      if (x < 0 || x >= dungeon[y].length) continue;
      if (dungeon[y][x] !== CELL.FLOOR) continue;
      const text = mpComposeText(r.template, r.word);
      if (!text) continue;                    // gabarit/mot hors banque → ignoré
      const key = x + ',' + y;
      if (next.has(key)) continue;            // rows triés desc → le 1er = le + récent
      next.set(key, {
        x: x, y: y, text: text,
        authorName: r.author_name || 'Sorcier',
        authorId:   r.author_id,
      });
    }
  }
  messagePlacements = next;
  if (typeof drawDungeon   === 'function') drawDungeon();
  if (typeof renderMinimap === 'function') renderMinimap();
}

// ── Gravure d'un message ────────────────────────────────────
function mpPostMessage(templateId, wordId) {
  const text = mpComposeText(templateId, wordId);
  if (!text) return false;
  if (typeof playerX === 'undefined' || typeof playerY === 'undefined') return false;
  // Feedback local immédiat (le message apparaît sans attendre un poll).
  messagePlacements.set(playerX + ',' + playerY, {
    x: playerX, y: playerY, text: text,
    authorName: (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
    authorId:   getMpPlayerId(),
  });
  _mpLastMsgPost = Date.now();
  if (typeof drawDungeon   === 'function') drawDungeon();
  if (typeof renderMinimap === 'function') renderMinimap();
  if (typeof addMsg === 'function') addMsg('🪶 Message gravé : « ' + text + ' »', 'good');
  if (!_mpConfigured()) return true;          // file:// : gravure locale seule
  (async () => {
    try {
      const res = await fetch(
        `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.messagesTable}`
          + '?on_conflict=author_id,floor,x,y',
        {
          method:  'POST',
          headers: _mpHeaders({
            'Content-Type': 'application/json',
            'Prefer':       'resolution=merge-duplicates,return=minimal',
          }),
          body: JSON.stringify({
            author_id:   getMpPlayerId(),
            author_name: (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier',
            mode:  mpMode,
            floor: currentFloor, x: playerX, y: playerY,
            template: templateId, word: wordId,
            created_at: new Date().toISOString(),
          }),
        }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _mpNoteSuccess();
    } catch (e) {
      _mpNoteFailure(e);
    }
  })();
  return true;
}

// ── Overlay : composition / lecture ─────────────────────────
let _mpMsgTemplate = null;
let _mpMsgWord     = null;

function closeMessageOverlay() {
  const ov = document.getElementById('mp-message-overlay');
  if (ov) ov.style.display = 'none';
}

// Point d'entrée du bouton 🪶 : lit le message de la case ou ouvre le
// compositeur si la case (FLOOR) est libre.
function openMessageComposer() {
  if (typeof inBattle !== 'undefined' && inBattle) return;
  const existing = (typeof playerX !== 'undefined') ? getMessageAt(playerX, playerY) : null;
  if (existing) { _mpRenderMessageRead(existing); return; }
  const onFloor = typeof dungeon !== 'undefined' && dungeon
    && dungeon[playerY] && dungeon[playerY][playerX] === CELL.FLOOR;
  if (!onFloor) {
    if (typeof addMsg === 'function') {
      addMsg('Tu ne peux graver un message que sur une case de couloir dégagée.', 'info');
    }
    return;
  }
  _mpMsgTemplate = null;
  _mpMsgWord     = null;
  _mpRenderComposer();
  const ov = document.getElementById('mp-message-overlay');
  if (ov) ov.style.display = 'flex';
}

function _mpRenderMessageRead(msg) {
  const panel = document.getElementById('mp-message-panel');
  if (!panel) return;
  panel.innerHTML = ''
    + '<div class="mp-msg-title">📜 Message gravé</div>'
    + '<div class="mp-msg-quote">« ' + _mpEsc(msg.text) + ' »</div>'
    + '<div class="mp-msg-author">— gravé par ' + _mpEsc(msg.authorName || 'Sorcier') + '</div>'
    + '<button class="ghost-btn ghost-btn-close" onclick="closeMessageOverlay()">Fermer</button>';
  const ov = document.getElementById('mp-message-overlay');
  if (ov) ov.style.display = 'flex';
}

function _mpSelectTemplate(id) { _mpMsgTemplate = id; _mpRenderComposer(); }
function _mpSelectWord(id)     { _mpMsgWord = id;     _mpRenderComposer(); }

function _mpRenderComposer() {
  const panel = document.getElementById('mp-message-panel');
  if (!panel) return;
  const tpl = MP_MSG_TEMPLATES.find(t => t.id === _mpMsgTemplate);
  const needsWord = tpl && tpl.text.indexOf('%') !== -1;
  const preview = tpl
    ? (needsWord
        ? (_mpMsgWord ? mpComposeText(_mpMsgTemplate, _mpMsgWord) : tpl.text.replace('%', '…'))
        : tpl.text)
    : '…';
  const ready = !!tpl && (!needsWord || !!_mpMsgWord);

  const tplBtns = MP_MSG_TEMPLATES.map(t =>
    '<button class="mp-chip' + (t.id === _mpMsgTemplate ? ' mp-chip-on' : '') + '"'
    + ' onclick="_mpSelectTemplate(\'' + t.id + '\')">'
    + _mpEsc(t.text.replace('%', '___')) + '</button>').join('');
  const wordBtns = MP_MSG_WORDS.map(w =>
    '<button class="mp-chip' + (w.id === _mpMsgWord ? ' mp-chip-on' : '') + '"'
    + (needsWord ? '' : ' disabled')
    + ' onclick="_mpSelectWord(\'' + w.id + '\')">'
    + _mpEsc(w.text) + '</button>').join('');

  panel.innerHTML = ''
    + '<div class="mp-msg-title">🪶 Graver un message</div>'
    + '<div class="mp-msg-preview">« ' + _mpEsc(preview) + ' »</div>'
    + '<div class="mp-msg-section">Gabarit</div>'
    + '<div class="mp-chip-row">' + tplBtns + '</div>'
    + '<div class="mp-msg-section' + (needsWord ? '' : ' mp-msg-dim') + '">Mot</div>'
    + '<div class="mp-chip-row">' + wordBtns + '</div>'
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn' + (ready ? '' : ' ghost-btn-soon') + '"'
    +     (ready ? '' : ' disabled')
    +     ' onclick="_mpConfirmMessage()">Graver</button>'
    +   '<button class="ghost-btn ghost-btn-close" onclick="closeMessageOverlay()">Annuler</button>'
    + '</div>';
}

function _mpConfirmMessage() {
  if (!_mpMsgTemplate) return;
  const now = Date.now();
  if (now - _mpLastMsgPost < MP_MSG_POST_COOLDOWN_MS) {
    if (typeof addMsg === 'function') {
      addMsg('Tu viens de graver un message — laisse un peu reposer ta plume.', 'info');
    }
    return;
  }
  if (mpPostMessage(_mpMsgTemplate, _mpMsgWord)) closeMessageOverlay();
}

// ============================================================
// PHASE 5 — Cadeaux or/objet (§6)
// ============================================================
// L'overlay fantôme offre un sous-mode « 🎁 Offrir ». L'envoi insère une
// ligne `mp_gifts` ; à la connexion (mpStartSession), `claimPendingGifts`
// lit la boîte aux lettres et applique les cadeaux non encore réclamés
// (or → player.gold, item → tryAddItem). Items équipés non concernés —
// seul `player.inventory` est exposé. Items de quête actifs filtrés.

// Items du sac partageables — exclut ce qui sert à une quête en cours.
function _mpIsQuestItem(itemId) {
  if (typeof activeQuests === 'undefined' || !Array.isArray(activeQuests)) return false;
  return activeQuests.some(q =>
    q && !q.completed && Array.isArray(q.objectives)
      && q.objectives.some(o => o && !o.completed
        && o.type === 'item' && o.itemId === itemId));
}

function _mpGiftableItems() {
  if (typeof player === 'undefined' || !Array.isArray(player.inventory)) return [];
  const out = [];
  player.inventory.forEach((it, idx) => {
    if (!it || !it.id) return;
    if (_mpIsQuestItem(it.id)) return;
    out.push({ idx: idx, item: it });
  });
  return out;
}

// État transient de la sous-vue cadeau dans l'overlay fantôme.
let _mpGiftKind = 'gold';            // 'gold' | 'item'
let _mpGiftGold = 50;                // valeur du curseur (gold)
let _mpGiftItemIdx = -1;             // index dans player.inventory

function mpOpenGiftView() {
  if (!_mpCurrentGhost) return;
  _mpGiftKind = 'gold';
  _mpGiftGold = Math.min(MP_GIFT_GOLD_MAX,
    Math.max(10, Math.floor(((typeof player !== 'undefined' && player.gold) || 0) / 4)));
  _mpGiftItemIdx = -1;
  _mpRenderGiftView();
}

function _mpGiftCooldownLeftMs(recipientId) {
  if (!recipientId) return 0;
  const last = _mpGiftCooldowns.get(recipientId) || 0;
  return Math.max(0, MP_GIFT_RECIPIENT_COOLDOWN_MS - (Date.now() - last));
}

function _mpFmtCooldown(ms) {
  if (ms < 60000) return Math.ceil(ms / 1000) + ' s';
  return Math.ceil(ms / 60000) + ' min';
}

function _mpRenderGiftView() {
  const panel = document.getElementById('ghost-panel');
  if (!panel || !_mpCurrentGhost) return;
  const g       = _mpCurrentGhost;
  const myGold  = (typeof player !== 'undefined' && player.gold) | 0;
  const cdLeft  = _mpGiftCooldownLeftMs(g.playerId);
  const items   = _mpGiftableItems();

  // Onglets kind
  const tabs = ''
    + '<div class="mp-gift-tabs">'
    +   '<button class="mp-chip' + (_mpGiftKind === 'gold' ? ' mp-chip-on' : '') + '"'
    +     ' onclick="_mpGiftSelectKind(\'gold\')">💰 Or</button>'
    +   '<button class="mp-chip' + (_mpGiftKind === 'item' ? ' mp-chip-on' : '') + '"'
    +     ' onclick="_mpGiftSelectKind(\'item\')">🎒 Objet</button>'
    + '</div>';

  // Corps
  let body = '';
  if (_mpGiftKind === 'gold') {
    const cap = Math.min(MP_GIFT_GOLD_MAX, myGold);
    if (cap <= 0) {
      body = '<div class="mp-gift-empty">Tu n\'as aucun Gallion à offrir.</div>';
    } else {
      const v = Math.min(cap, _mpGiftGold | 0);
      body = ''
        + '<div class="mp-gift-row">'
        +   '<label for="mp-gift-gold-input">Montant (max ' + cap + ')</label>'
        +   '<input id="mp-gift-gold-input" type="number" min="1" max="' + cap + '"'
        +     ' value="' + v + '" oninput="_mpGiftSetGold(this.value)">'
        + '</div>'
        + '<div class="mp-gift-hint">Plafond par envoi : ' + MP_GIFT_GOLD_MAX + ' Gallions.</div>';
    }
  } else {
    if (items.length === 0) {
      body = '<div class="mp-gift-empty">Aucun objet partageable dans ton sac.</div>';
    } else {
      const list = items.map(({ idx, item }) => {
        const sel = (idx === _mpGiftItemIdx) ? ' mp-gift-item-on' : '';
        const icon = (typeof getItemIconHtml === 'function')
          ? getItemIconHtml(item, 'ui-icon-sm') : (item.icon || '🎁');
        return ''
          + '<button class="mp-gift-item' + sel + '"'
          +   ' onclick="_mpGiftSelectItem(' + idx + ')">'
          +   '<span class="mp-gift-item-icon">' + icon + '</span>'
          +   '<span class="mp-gift-item-name">' + _mpEsc(item.name || item.id) + '</span>'
          + '</button>';
      }).join('');
      body = '<div class="mp-gift-items">' + list + '</div>';
    }
  }

  // Validation du bouton
  let canSend = false, sendLabel = 'Offrir';
  if (cdLeft > 0) {
    sendLabel = 'Attends ' + _mpFmtCooldown(cdLeft);
  } else if (_mpGiftKind === 'gold') {
    canSend = myGold > 0 && _mpGiftGold >= 1 && _mpGiftGold <= Math.min(myGold, MP_GIFT_GOLD_MAX);
  } else {
    canSend = _mpGiftItemIdx >= 0 && _mpGiftItemIdx < (player.inventory || []).length;
  }

  panel.innerHTML = ''
    + _mpGhostHeaderHtml(g)
    + '<div class="mp-gift-title">🎁 Offrir un présent à ' + _mpEsc(g.name || 'ce sorcier') + '</div>'
    + tabs
    + '<div class="mp-gift-body">' + body + '</div>'
    + '<div class="ghost-actions">'
    +   '<button class="ghost-btn" onclick="_mpRenderGhostMain()">← Retour</button>'
    +   '<button class="ghost-btn' + (canSend ? '' : ' ghost-btn-soon') + '"'
    +     (canSend ? '' : ' disabled') + ' onclick="_mpConfirmGift()">' + sendLabel + '</button>'
    + '</div>';
}

function _mpGiftSelectKind(kind) {
  if (kind !== 'gold' && kind !== 'item') return;
  _mpGiftKind = kind;
  _mpRenderGiftView();
}

function _mpGiftSetGold(v) {
  const myGold = (typeof player !== 'undefined' && player.gold) | 0;
  const cap = Math.min(MP_GIFT_GOLD_MAX, myGold);
  const n = Math.max(1, Math.min(cap, parseInt(v, 10) || 0));
  _mpGiftGold = n;
}

function _mpGiftSelectItem(idx) {
  _mpGiftItemIdx = idx;
  _mpRenderGiftView();
}

// Insère une ligne `mp_gifts`. Renvoie `true` si la requête est partie
// (même en file:// où elle est court-circuitée).
async function _mpInsertGift(payload) {
  if (!_mpConfigured()) return true;             // file:// / tests : pas d'appel
  try {
    const ok = await _mpWrite(
      `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.giftsTable}`,
      'POST', payload, { representation: false });
    return !!ok;
  } catch (e) {
    _mpNoteFailure(e);
    return false;
  }
}

// Confirmation du bouton « Offrir ». Déduit immédiatement l'or/l'item du
// joueur (le geste est définitif côté donneur) avant l'appel réseau.
function _mpConfirmGift() {
  const g = _mpCurrentGhost;
  if (!g || !g.playerId) return;
  if (_mpGiftCooldownLeftMs(g.playerId) > 0) return;
  const myGold = (typeof player !== 'undefined' && player.gold) | 0;
  const senderName = (typeof getPlayerName === 'function' && getPlayerName()) || 'Sorcier';

  if (_mpGiftKind === 'gold') {
    const cap = Math.min(MP_GIFT_GOLD_MAX, myGold);
    const amount = Math.max(1, Math.min(cap, _mpGiftGold | 0));
    if (amount <= 0) return;
    player.gold -= amount;
    _mpInsertGift({
      sender_id:    getMpPlayerId(),
      sender_name:  senderName,
      recipient_id: g.playerId,
      mode:         mpMode,
      kind:         'gold',
      amount:       amount,
    });
    if (typeof addMsg === 'function') {
      addMsg('🎁 Tu offres ' + amount + ' Gallions à ' + (g.name || 'ce sorcier') + '.', 'good');
    }
  } else {
    const idx = _mpGiftItemIdx | 0;
    const it  = player.inventory && player.inventory[idx];
    if (!it || _mpIsQuestItem(it.id)) return;
    // N'offrir qu'un seul exemplaire : on retire `qty` du snapshot envoyé
    // et on décrémente le stack du donneur (sans le vider s'il en reste).
    const snapshot = { ...it };
    delete snapshot.qty;
    if (typeof _consumeAt === 'function') _consumeAt(idx, 1);
    else player.inventory.splice(idx, 1);
    _mpInsertGift({
      sender_id:    getMpPlayerId(),
      sender_name:  senderName,
      recipient_id: g.playerId,
      mode:         mpMode,
      kind:         'item',
      item_id:      it.id,
      item_name:    it.name || it.id,
      item_data:    snapshot,
    });
    if (typeof addMsg === 'function') {
      addMsg('🎁 Tu offres « ' + (it.name || it.id) + ' » à ' + (g.name || 'ce sorcier') + '.', 'good');
    }
  }
  _mpGiftCooldowns.set(g.playerId, Date.now());
  if (typeof updateUI === 'function') updateUI();
  closeGhostOverlay();
}

// ── Boîte aux lettres : lecture & réclamation ────────────────────
// Appelée à la connexion. Tire toutes les lignes adressées au joueur
// dont `claimed_at` est nul, applique l'effet localement (or / item
// via tryAddItem), puis PATCH claimed_at=now pour chaque ligne réussie.
async function claimPendingGifts() {
  if (!_mpConfigured()) return { ok: false };
  if (typeof player === 'undefined') return { ok: false };
  const myId = getMpPlayerId();
  let rows;
  try {
    const url = `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.giftsTable}`
      + '?select=id,sender_name,kind,amount,item_id,item_name,item_data,created_at'
      + `&recipient_id=eq.${encodeURIComponent(myId)}`
      + '&claimed_at=is.null'
      + '&order=created_at.asc&limit=50';
    rows = await _mpSelectRows(url);
    if (!rows) return { ok: false };
  } catch (e) {
    _mpNoteFailure(e);
    return { ok: false };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { ok: true, claimed: 0 };

  const now = new Date().toISOString();
  const summary = { gold: 0, items: 0, skipped: 0, senders: new Set() };

  for (const row of rows) {
    let applied = false;
    if (row.kind === 'gold' && Number.isFinite(row.amount) && row.amount > 0) {
      // Clamp défensif : un sender mal-veillant pourrait avoir posé une
      // somme énorme — on borne au cap UI.
      const amt = Math.min(MP_GIFT_GOLD_MAX, Math.max(1, row.amount | 0));
      player.gold += amt;
      summary.gold += amt;
      applied = true;
    } else if (row.kind === 'item' && row.item_id) {
      const data = row.item_data || (typeof ITEMS !== 'undefined'
        && ITEMS.find(i => i.id === row.item_id)) || null;
      if (data && typeof tryAddItem === 'function' && tryAddItem(data, { silent: true })) {
        summary.items++;
        applied = true;
      } else {
        // Sac plein ou item inconnu — on laisse la ligne dans la boîte
        // (claimed_at reste null), elle sera retentée à la prochaine session.
        summary.skipped++;
      }
    }
    if (applied && row.id) {
      try {
        await fetch(
          `${MP_CONFIG.supabaseUrl}/rest/v1/${MP_CONFIG.giftsTable}`
            + `?id=eq.${encodeURIComponent(row.id)}`,
          {
            method:  'PATCH',
            headers: _mpHeaders({
              'Content-Type': 'application/json',
              'Prefer':       'return=minimal',
            }),
            body: JSON.stringify({ claimed_at: now }),
          }
        );
      } catch (e) { /* sera retenté à la prochaine connexion */ }
      if (row.sender_name) summary.senders.add(row.sender_name);
    }
  }
  _mpAnnounceClaim(summary);
  if (typeof updateUI === 'function') updateUI();
  return { ok: true, claimed: summary.gold > 0 || summary.items > 0, summary: summary };
}

function _mpAnnounceClaim(s) {
  if (typeof addMsg !== 'function') return;
  if (s.gold === 0 && s.items === 0) return;
  const parts = [];
  if (s.gold)  parts.push('+' + s.gold + ' Gallions');
  if (s.items) parts.push(s.items + ' objet' + (s.items > 1 ? 's' : ''));
  const senders = Array.from(s.senders);
  const from = senders.length === 0 ? ''
    : (senders.length === 1 ? ' de ' + senders[0]
       : ' de ' + senders.slice(0, -1).join(', ') + ' et ' + senders[senders.length - 1]);
  addMsg('🎁 Boîte aux lettres : ' + parts.join(', ') + from + '.', 'good');
  if (s.skipped > 0) {
    addMsg(s.skipped + ' cadeau' + (s.skipped > 1 ? 'x sont en attente' : ' est en attente')
      + ' — fais de la place dans ton sac.', 'info');
  }
}


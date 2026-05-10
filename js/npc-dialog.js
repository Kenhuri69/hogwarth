// ============================================================
// DIALOGUE PNJ
// ============================================================
// Pilote l'overlay #npc-dialog-overlay et le dispatch de l'état
// d'une quête liée au PNJ. Lecture du registre `NPCS` (npcs.js)
// et des conteneurs `availableQuests` / `activeQuests` /
// `completedQuests` (state.js).

// ── Utilitaires d'état quête ────────────────────────────────────

// Retourne 'none' | 'offer' | 'active' | 'ready' | 'done'
function getNpcQuestState(npc) {
  if (!npc) return 'none';
  const given = npc.questsGiven || [];
  if (!given.length) return 'none';
  if (typeof _refreshObjectives === 'function') _refreshObjectives();
  for (const qid of given) {
    if (typeof completedQuests !== 'undefined' && completedQuests.has(qid)) {
      continue; // celle-ci est rendue, on regarde la suivante
    }
    const active = (typeof activeQuests !== 'undefined')
      ? activeQuests.find(q => q.id === qid) : null;
    if (active) {
      const allDone = (active.objectives || []).every(o => o.completed);
      return allDone ? 'ready' : 'active';
    }
    if (typeof availableQuests !== 'undefined' && availableQuests.has(qid)) {
      return 'offer';
    }
  }
  // Toutes les quêtes données sont complétées
  return 'done';
}

// Indicateur "!" / "?" / "" affiché au-dessus du marqueur 3D.
function getNpcMarkerSign(npcId) {
  if (!npcId) return '';
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return '';
  const state = getNpcQuestState(npc);
  if (state === 'offer') return '!';
  if (state === 'ready') return '?';
  return '';
}

// ── Rendu de l'overlay ───────────────────────────────────────────

function _npcDialogText(npc, state) {
  const d = npc.dialogues || {};
  // 1ère rencontre prioritaire si dispo
  if (typeof seenNpcs !== 'undefined' && !seenNpcs.has(npc.id) && d.greeting) {
    return d.greeting;
  }
  if (state === 'offer'  && d.questOffer)  return d.questOffer;
  if (state === 'active' && d.questActive) return d.questActive;
  if (state === 'ready'  && d.questReady)  return d.questReady;
  if (state === 'done'   && d.questDone)   return d.questDone;
  return d.idle || d.greeting || '...';
}

function _npcDialogActions(npc, state) {
  const out = [];
  // Action contextuelle quête
  if (state === 'offer') {
    const qid = (npc.questsGiven || []).find(q => availableQuests.has(q));
    if (qid) {
      out.push({
        label: 'Accepter la quête',
        onClick: `acceptQuest('${qid}'); openNpcDialog('${npc.id}');`
      });
    }
  } else if (state === 'ready') {
    const qid = (npc.questsGiven || []).find(q => {
      const a = activeQuests.find(x => x.id === q);
      return a && (a.objectives || []).every(o => o.completed);
    });
    if (qid) {
      out.push({
        label: 'Remettre la quête',
        onClick: `turnInQuestById('${qid}'); openNpcDialog('${npc.id}');`
      });
    }
  }
  out.push({ label: 'S\'éloigner', onClick: 'closeNpcDialog()', secondary: true });
  return out;
}

function openNpcDialog(npcId) {
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return;

  const state = getNpcQuestState(npc);

  // Portrait : SVG inline si fourni, sinon emoji icon
  const portraitEl = document.getElementById('npc-dialog-portrait');
  if (portraitEl) {
    portraitEl.innerHTML = npc.portraitSvg || (npc.icon || '🧙');
  }
  const nameEl = document.getElementById('npc-dialog-name');
  if (nameEl) nameEl.textContent = npc.name || '';
  const titleEl = document.getElementById('npc-dialog-title');
  if (titleEl) titleEl.textContent = npc.title || '';

  const textEl = document.getElementById('npc-dialog-text');
  if (textEl) textEl.textContent = _npcDialogText(npc, state);

  const actionsEl = document.getElementById('npc-dialog-actions');
  if (actionsEl) {
    actionsEl.innerHTML = _npcDialogActions(npc, state).map(a =>
      `<button class="explore-btn${a.secondary ? ' secondary' : ''}" onclick="${a.onClick}">${a.label}</button>`
    ).join('');
  }

  // Marquer comme rencontré (après calcul du texte greeting)
  if (typeof seenNpcs !== 'undefined') seenNpcs.add(npc.id);

  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) overlay.style.display = 'flex';

  // Rafraîchit le canvas pour mettre à jour l'indicateur "!"/"?".
  if (typeof drawDungeon === 'function') drawDungeon();
}

function closeNpcDialog() {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Fermeture par Échap / clic backdrop ────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay && overlay.style.display === 'flex') closeNpcDialog();
});

document.addEventListener('click', (e) => {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (!overlay || overlay.style.display !== 'flex') return;
  // Ferme uniquement si on clique sur le backdrop (pas une descendance)
  if (e.target === overlay) closeNpcDialog();
});

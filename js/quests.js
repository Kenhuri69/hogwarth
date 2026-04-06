// ============================================================
// QUESTS.JS — Système de quêtes secondaires
// ============================================================

// ── Ouvre le journal des quêtes dans la modale personnage ────
// On réutilise #char-detail pour ne pas casser openCharacter().
function openQuestLog() {
  const detail = document.getElementById('char-detail');
  if (!detail) return;

  const done  = activeQuests.filter(q =>  q.completed).length;
  const total = activeQuests.length;

  detail.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:15px;color:var(--gold);
                text-align:center;margin-bottom:4px;letter-spacing:2px">
      📜 Journal des Quêtes
    </div>
    <div style="text-align:center;font-size:11px;color:#8a7050;margin-bottom:14px">
      ${done} / ${total} quête${total > 1 ? 's' : ''} terminée${done > 1 ? 's' : ''}
    </div>
    <div id="quest-list" style="display:flex;flex-direction:column;gap:10px;
                                 max-height:55vh;overflow-y:auto"></div>
  `;
  document.getElementById('character-modal').style.display = 'flex';
  renderQuestList();
}

// ── Affiche la liste des quêtes ──────────────────────────────
function renderQuestList() {
  const container = document.getElementById('quest-list');
  if (!container) return;
  container.innerHTML = '';

  const pending   = activeQuests.filter(q => !q.completed);
  const completed = activeQuests.filter(q =>  q.completed);

  if (pending.length === 0 && completed.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:#8a7050">
      Aucune quête disponible.</div>`;
    return;
  }

  // Quêtes actives
  pending.forEach((q, rawIdx) => {
    const idx       = activeQuests.indexOf(q);
    const itemCount = q.objective.type === 'item'
      ? player.inventory.filter(i => i.id === q.objective.itemId).length
      : q.progress;
    const needed    = q.objective.amount;
    const pct       = Math.min(100, Math.round((itemCount / needed) * 100));
    const ready     = itemCount >= needed;

    // Récompenses formatées
    const rewardParts = [];
    if (q.reward.xp)    rewardParts.push(`⭐ +${q.reward.xp} XP`);
    if (q.reward.gold)  rewardParts.push(`🪙 +${q.reward.gold}`);
    if (q.reward.item) {
      const it = ITEMS.find(i => i.id === q.reward.item);
      if (it) rewardParts.push(`${it.icon} ${it.name}`);
    }
    if (q.reward.spell) rewardParts.push(`✨ Sort : ${q.reward.spell}`);

    const card = document.createElement('div');
    card.className = 'spell-item';
    card.style.cssText = 'flex-direction:column;align-items:flex-start;gap:5px;padding:10px 12px';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold-light)">${q.title}</div>
        <div style="font-size:10px;color:#8a7050;text-align:right">${q.giver}<br>${q.location}</div>
      </div>
      <div style="font-size:12px;color:var(--parchment-dark);line-height:1.5">${q.desc}</div>
      <div style="width:100%">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#8a7050;margin-bottom:3px">
          <span>Progression</span>
          <span><strong style="color:${ready ? '#60c040' : 'var(--parchment)'}">${itemCount}</strong> / ${needed}</span>
        </div>
        <div style="background:#1a0e05;border-radius:3px;height:5px;overflow:hidden">
          <div style="background:${ready ? '#60c040' : 'var(--gold-dark)'};width:${pct}%;height:100%;
                      transition:width .3s ease"></div>
        </div>
      </div>
      <div style="font-size:10px;color:#8a7050">Récompenses : ${rewardParts.join(' · ')}</div>
      ${ready
        ? `<button class="cmd-btn" onclick="checkQuestCompletion(${idx})"
             style="align-self:flex-end;font-size:11px;color:#60c040;border-color:#60c040">
             ✅ Remettre la quête
           </button>`
        : `<div style="font-size:10px;color:#4a3a20;align-self:flex-end;font-style:italic">
             Objectif incomplet…
           </div>`
      }
    `;
    container.appendChild(card);
  });

  // Séparateur si quêtes terminées existent
  if (completed.length > 0) {
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid #2a1a08;padding-top:8px;font-family:"Cinzel",serif;font-size:10px;color:#4a3a20;letter-spacing:2px';
    sep.textContent = '— TERMINÉES —';
    container.appendChild(sep);

    completed.forEach(q => {
      const card = document.createElement('div');
      card.style.cssText = 'padding:8px 12px;opacity:.5;border:1px solid #2a1a08;border-radius:3px;font-size:12px;color:#6a5030';
      card.innerHTML = `✅ <strong>${q.title}</strong> — ${q.giver}`;
      container.appendChild(card);
    });
  }

  // Message si tout est fini
  if (pending.length === 0) {
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:20px;color:var(--gold);font-family:"Cinzel",serif;font-size:12px';
    msg.textContent   = 'Toutes les quêtes sont terminées ! Bravo, jeune sorcier.';
    container.insertBefore(msg, container.firstChild);
  }
}

// ── Vérification et remise d'une quête ──────────────────────
window.checkQuestCompletion = function(index) {
  const q = activeQuests[index];
  if (!q || q.completed) return;

  if (q.objective.type === 'item') {
    const count = player.inventory.filter(i => i.id === q.objective.itemId).length;
    q.progress = count;
    if (count >= q.objective.amount) {
      // Consommer les objets requis
      let toConsume = q.objective.amount;
      player.inventory = player.inventory.filter(i => {
        if (i.id === q.objective.itemId && toConsume > 0) { toConsume--; return false; }
        return true;
      });
      completeQuest(index);
    } else {
      addMsg(`Il manque ${q.objective.amount - count} objet(s) pour finir cette quête.`, 'bad');
      renderQuestList();
    }
  } else if (q.objective.type === 'kill') {
    if (q.progress >= q.objective.amount) {
      completeQuest(index);
    } else {
      addMsg(`Il faut encore éliminer ${q.objective.amount - q.progress} ennemi(s).`, 'bad');
      renderQuestList();
    }
  }
};

// ── Attribution des récompenses ──────────────────────────────
function completeQuest(index) {
  const q = activeQuests[index];
  q.completed = true;

  if (q.reward.xp)    player.xp   += q.reward.xp;
  if (q.reward.gold)  player.gold += q.reward.gold;

  if (q.reward.item) {
    const item = ITEMS.find(i => i.id === q.reward.item);
    if (item && player.inventory.length < 16) {
      player.inventory.push({ ...item });
      addMsg(`📦 Récompense : ${item.icon} ${item.name}`, 'good');
    }
  }
  if (q.reward.spell) {
    party.forEach(c => {
      if (!c.spells.includes(q.reward.spell)) c.spells.push(q.reward.spell);
    });
    addMsg(`✨ Nouveau sort débloqué : ${q.reward.spell} !`, 'magic');
  }

  AudioSystem.playLevelUp();
  addMsg(`✅ Quête terminée : « ${q.title} » !`, 'good');
  addLog(`📜 Quête accomplie : ${q.title}`);

  recalculateStats();
  updateUI();
  checkLevelUp();   // l'XP de récompense peut déclencher un level-up
  renderQuestList();
}

// ── Appelée depuis battle.js quand un monstre est vaincu ─────
window.checkKillQuests = function(monsterId) {
  let anyProgress = false;
  activeQuests.forEach((q, idx) => {
    if (q.completed) return;
    if (q.objective.type !== 'kill') return;
    if (q.objective.monsterId !== monsterId) return;
    q.progress++;
    anyProgress = true;
    if (q.progress >= q.objective.amount) {
      // Auto-complétion avec délai pour laisser la fin de combat s'afficher
      setTimeout(() => completeQuest(idx), 600);
    } else {
      addMsg(`📜 Quête « ${q.title} » : ${q.progress}/${q.objective.amount}`, '');
    }
  });
};

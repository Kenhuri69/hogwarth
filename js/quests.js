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
  pending.forEach((q) => {
    const idx        = activeQuests.indexOf(q);
    const activeStep = getActiveStep(q);

    // Pour l'étape active de type item : recompter depuis l'inventaire
    if (activeStep && activeStep.type === 'item') {
      activeStep.progress = player.inventory.filter(i => i.id === activeStep.itemId).length;
    }
    const ready = activeStep && activeStep.progress >= activeStep.amount;

    // Récompenses formatées
    const rewardParts = [];
    if (q.reward.xp)    rewardParts.push(`<img class="ui-icon ui-icon-md" src="img/icons/xp.png" alt=""> +${q.reward.xp} XP`);
    if (q.reward.gold)  rewardParts.push(`<img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> +${q.reward.gold}`);
    if (q.reward.item) {
      const it = ITEMS.find(i => i.id === q.reward.item);
      if (it) rewardParts.push(`${it.icon} ${it.name}`);
    }
    if (q.reward.spell) rewardParts.push(`✨ Sort : ${q.reward.spell}`);

    // Liste des étapes : ✓ complétée, ▶ active (avec barre), ◌ verrouillée
    const stepsHtml = q.objectives.map((o, i) => {
      const isActive   = o === activeStep;
      let displayName;
      if (o.type === 'kill') {
        const m = MONSTERS.find(x => x.id === o.monsterId);
        displayName = m ? m.name : o.monsterId;
      } else {
        const it = ITEMS.find(x => x.id === o.itemId);
        displayName = it ? it.name : o.itemId;
      }
      const label = o.type === 'kill'
        ? `Éliminer ${o.amount}× ${displayName}`
        : `Apporter ${o.amount}× ${displayName}`;
      const icon       = o.completed ? '✓' : (isActive ? '▶' : '◌');
      const color      = o.completed ? '#60c040' : (isActive ? 'var(--gold-light)' : '#4a3a20');
      let barHtml = '';
      if (isActive) {
        const pct = Math.min(100, Math.round((o.progress / o.amount) * 100));
        barHtml = `
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#8a7050;margin:2px 0 2px 18px">
            <span>${o.progress} / ${o.amount}</span>
          </div>
          <div style="margin-left:18px;background:#1a0e05;border-radius:3px;height:4px;overflow:hidden">
            <div style="background:${ready ? '#60c040' : 'var(--gold-dark)'};width:${pct}%;height:100%;transition:width .3s ease"></div>
          </div>`;
      }
      return `
        <div style="margin-top:${i === 0 ? '0' : '4px'}">
          <div style="font-size:11px;color:${color}">
            <span style="display:inline-block;width:14px">${icon}</span>${label}
          </div>
          ${barHtml}
        </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'spell-item';
    card.style.cssText = 'flex-direction:column;align-items:flex-start;gap:5px;padding:10px 12px';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold-light)">${q.title}</div>
        <div style="font-size:10px;color:#8a7050;text-align:right">${q.giver}<br>${q.location}</div>
      </div>
      <div style="font-size:12px;color:var(--parchment-dark);line-height:1.5">${q.desc}</div>
      <div style="width:100%">${stepsHtml}</div>
      <div style="font-size:10px;color:#8a7050">Récompenses : ${rewardParts.join(' · ')}</div>
      ${ready
        ? `<button class="cmd-btn" onclick="checkQuestCompletion(${idx})"
             style="align-self:flex-end;font-size:11px;color:#60c040;border-color:#60c040">
             ✅ Remettre l'étape
           </button>`
        : `<div style="font-size:10px;color:#4a3a20;align-self:flex-end;font-style:italic">
             Étape en cours…
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

// ── Helper : étape active d'une quête (la première non complétée) ──
function getActiveStep(q) {
  if (!q || !q.objectives) return null;
  return q.objectives.find(o => !o.completed) || null;
}

// ── Vérification et remise d'une quête ──────────────────────
window.checkQuestCompletion = function(index) {
  const q = activeQuests[index];
  if (!q || q.completed) return;
  const step = getActiveStep(q);
  if (!step) return;

  if (step.type === 'item') {
    const count = player.inventory.filter(i => i.id === step.itemId).length;
    step.progress = count;
    if (count >= step.amount) {
      // Consommer les objets requis
      let toConsume = step.amount;
      player.inventory = player.inventory.filter(i => {
        if (i.id === step.itemId && toConsume > 0) { toConsume--; return false; }
        return true;
      });
      step.completed = true;
      finalizeOrAdvance(index);
    } else {
      addMsg(`Il manque ${step.amount - count} objet(s) pour finir cette étape.`, 'bad');
      renderQuestList();
    }
  } else if (step.type === 'kill') {
    if (step.progress >= step.amount) {
      step.completed = true;
      finalizeOrAdvance(index);
    } else {
      addMsg(`Il faut encore éliminer ${step.amount - step.progress} ennemi(s).`, 'bad');
      renderQuestList();
    }
  }
};

// Si toutes les étapes sont closes, complète la quête. Sinon, rafraîchit l'affichage.
function finalizeOrAdvance(index) {
  const q = activeQuests[index];
  if (q.objectives.every(o => o.completed)) {
    completeQuest(index);
  } else {
    addMsg(`📜 Étape suivante : « ${q.title} »`, 'magic');
    renderQuestList();
  }
}

// ── Attribution des récompenses ──────────────────────────────
function completeQuest(index) {
  const q = activeQuests[index];
  q.completed = true;

  if (q.reward.xp)    player.xp   += q.reward.xp;
  if (q.reward.gold)  player.gold += q.reward.gold;

  if (q.reward.item) {
    const item = ITEMS.find(i => i.id === q.reward.item);
    if (item && tryAddItem(item, { silent: true })) {
      addMsg(`📦 Récompense : ${item.icon} ${item.name}`, 'good');
    }
  }
  if (q.reward.spell) {
    party.forEach(c => {
      if (!c.spells.includes(q.reward.spell)) c.spells.push(q.reward.spell);
    });
    addMsg(`✨ Nouveau sort débloqué : ${q.reward.spell} !`, 'magic');
  }

  // Points de Maison pour quête accomplie
  if (chosenHouse) {
    housePoints += 30;
    if (window.checkHouseLevelUp) window.checkHouseLevelUp();
  }

  AudioSystem.playLevelUp();
  addMsg(`✅ Quête terminée : « ${q.title} » !`, 'good');

  recalculateStats();
  updateUI();
  updateQuestTracker();
  checkLevelUp();
  renderQuestList();
}

// ── Appelée depuis battle.js quand un monstre est vaincu ─────
window.checkKillQuests = function(monsterId) {
  activeQuests.forEach((q, idx) => {
    if (q.completed) return;
    const step = getActiveStep(q);
    if (!step || step.type !== 'kill' || step.monsterId !== monsterId) return;
    step.progress++;
    if (step.progress >= step.amount) {
      step.completed = true;
      // Auto-complétion ou passage à l'étape suivante avec délai pour la fin de combat
      setTimeout(() => {
        if (q.objectives.every(o => o.completed)) completeQuest(idx);
        else { addMsg(`📜 Étape suivante : « ${q.title} »`, 'magic'); renderQuestList(); }
      }, 600);
    } else {
      addMsg(`📜 Quête « ${q.title} » : ${step.progress}/${step.amount}`, '');
    }
  });
};

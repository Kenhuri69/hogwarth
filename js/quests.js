// ============================================================
// QUESTS.JS — Système de quêtes secondaires
// ============================================================

// Catalogue inerte des quêtes. Le runtime (`activeQuests`,
// `availableQuests`, `completedQuests`) est dans state.js.
// Pour activer une quête : `acceptQuest(id)` (clone le template).
const QUEST_TEMPLATES = [
  {
    id: "intro_tutoriel",
    title: "Bienvenue à Poudlard",
    giver: "Albus Dumbledore",
    desc: "Avance dans le donjon et descends jusqu'à l'étage 2 pour faire tes premiers pas.",
    objectives: [
      { type: "floor", floor: 2, progress: 0, amount: 1, completed: false }
    ],
    reward: { xp: 30, gold: 20 },
    location: "Hall d'entrée (étage 1)"
  },
  {
    id: "mandragore_pomfresh",
    title: "Herboristerie urgente",
    giver: "Madame Pomfresh",
    desc: "Rapporte 3 Racines de Mandragore à l'infirmerie. Les élèves sont encore pétrifiés !",
    objectives: [
      { type: "item", itemId: "mandragore", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 80, gold: 40, item: "potion_m", spell: "Episkey" },
    location: "Infirmerie (étage 2)"
  },
  {
    id: "livre_interdit",
    title: "Le livre qui mord",
    giver: "Gilderoy Lockhart",
    desc: "Récupère le Livre des Monstres qui mord dans la Bibliothèque Interdite.",
    objectives: [
      { type: "item", itemId: "book_monsters", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 120, gold: 25, item: "wand1" },
    location: "Bibliothèque Interdite (étage 3)"
  },
  {
    id: "troll_toilettes",
    title: "Nettoyage des toilettes",
    giver: "Mimi Geignarde",
    desc: "Élimine le Troll des Toilettes qui bloque l'accès aux cachots.",
    objectives: [
      { type: "kill", monsterId: "troll", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 150, gold: 60, item: "robe1" },
    location: "Toilettes du 2e étage"
  },
  {
    id: "chouette_perdue",
    title: "Chouette ensorcelée",
    giver: "Hagrid",
    desc: "Capture une Chouette Ensorcelée et rapporte-la à Hagrid (dans la Forêt).",
    objectives: [
      { type: "kill", monsterId: "chouette_envoutee", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 90, gold: 30, item: "broom" },
    location: "Forêt Interdite (étage 4+)"
  },
  {
    id: "niffleurs_trésor",
    title: "L'invasion des Niffleurs",
    giver: "Newton Scamander",
    desc: "Les Niffleurs ont envahi les sous-sols ! Élimine-en 3 avant qu'ils volent tout l'or.",
    objectives: [
      { type: "kill", monsterId: "niffleur", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 100, gold: 80, item: "amulette" },
    location: "Sous-sols de Poudlard (étage 2+)"
  },
  {
    id: "golem_passage",
    title: "Le Gardien Endormi",
    giver: "Professeur McGonagall",
    desc: "Un Gardien du Portail bloque l'accès à la bibliothèque interdite. Neutralise-le.",
    objectives: [
      { type: "kill", monsterId: "gardien_portail", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 180, gold: 70, item: "livre_bombarda" },
    location: "Passages secrets (étage 5+)"
  },
  {
    id: "lumiere_desespoir",
    title: "La Lumière contre le Désespoir",
    giver: "Professeur Lupin",
    desc: "Affronte un Détraqueur pour prouver ton courage, puis rapporte un Chocolat aux Sorciers à Lupin pour qu'il t'enseigne le Patronus.",
    objectives: [
      { type: "kill", monsterId: "dementeur",     amount: 1, progress: 0, completed: false },
      { type: "item", itemId:    "choco_sorcier", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 200, gold: 50, spell: "Patronum" },
    location: "Classe de Défense (étage 4+)"
  }
];

function getQuestTemplate(id) {
  return QUEST_TEMPLATES.find(t => t.id === id) || null;
}

// ── Acceptation / remise via PNJ ─────────────────────────────────

// Active une quête disponible. Idempotent : silencieusement ignoré si la
// quête est déjà active ou complétée. Retourne true si la quête a été
// effectivement ajoutée à activeQuests.
function acceptQuest(id) {
  if (!id) return false;
  if (activeQuests.some(q => q.id === id)) return false;
  if (completedQuests.has(id))             return false;
  const tpl = getQuestTemplate(id);
  if (!tpl) return false;
  // Clone profond pour préserver les compteurs progress par instance
  const inst = JSON.parse(JSON.stringify(tpl));
  inst.completed = false;
  activeQuests.push(inst);
  availableQuests.delete(id);
  addMsg(`📜 Nouvelle quête : « ${tpl.title} »`, 'magic');
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  return true;
}

// Variante appelable depuis l'overlay de dialogue PNJ (ne connaît
// que l'ID). Trouve l'index puis délègue à completeQuest (ex-turnInQuest).
function turnInQuestById(id) {
  _refreshObjectives();
  const idx = activeQuests.findIndex(q => q.id === id);
  if (idx === -1) return false;
  const q = activeQuests[idx];
  if (!q.objectives.every(o => o.completed)) return false;
  completeQuest(idx);
  return true;
}

// ── Ouvre le journal des quêtes dans la modale personnage ────
// On réutilise #char-detail pour ne pas casser openCharacter().
function openQuestLog() {
  const detail = document.getElementById('char-detail');
  if (!detail) return;

  const done  = completedQuests.size;
  const total = activeQuests.length + done;

  detail.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:15px;color:var(--gold);
                text-align:center;margin-bottom:4px;letter-spacing:2px">
      <img class="ui-icon ui-icon-xl" src="img/icons/quest.png" alt=""> Journal des Quêtes
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

  // Met à jour les étapes "item" (compte depuis l'inventaire)
  _refreshObjectives();

  const pending   = activeQuests.slice();
  const completed = Array.from(completedQuests || [])
    .map(id => getQuestTemplate(id))
    .filter(Boolean);

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
      if (it) rewardParts.push(`${getItemIconHtml(it, 'ui-icon-sm')} ${it.name}`);
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
        ? `<div style="font-size:10px;color:#60c040;align-self:flex-end;font-style:italic">
             ✅ Prêt — retourne voir ${q.giver}
           </div>`
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

// Recalcule l'état des étapes "item" (et "floor") pour toutes les quêtes
// actives. À appeler avant tout dispatch d'état (PNJ dialog, journal,
// avancement étage). Les étapes "kill" sont mises à jour par
// checkKillQuests, et les étapes "floor" par checkFloorQuests.
function _refreshObjectives() {
  for (const q of activeQuests) {
    for (const step of q.objectives) {
      if (step.completed) continue;
      if (step.type === 'item') {
        const count = (player && player.inventory)
          ? player.inventory.filter(i => i.id === step.itemId).length : 0;
        step.progress = count;
        if (count >= step.amount) step.completed = true;
      }
    }
  }
}

// ── Attribution des récompenses + remise ─────────────────────
// Consomme les objets requis pour les étapes "item", retire la quête
// d'activeQuests, l'ajoute à completedQuests, distribue les
// récompenses. Appelée par turnInQuestById (depuis le dialogue PNJ).
function completeQuest(index) {
  const q = activeQuests[index];
  if (!q) return;

  // Consomme les items requis (étapes "item")
  for (const step of q.objectives) {
    if (step.type !== 'item') continue;
    let toConsume = step.amount;
    player.inventory = player.inventory.filter(i => {
      if (i.id === step.itemId && toConsume > 0) { toConsume--; return false; }
      return true;
    });
  }

  if (q.reward.xp)    player.xp   += q.reward.xp;
  if (q.reward.gold)  player.gold += q.reward.gold;

  if (q.reward.item) {
    const item = ITEMS.find(i => i.id === q.reward.item);
    if (item && tryAddItem(item, { silent: true })) {
      addMsg(`Récompense : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name}`, 'good');
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

  // Retire de l'actif, marque comme rendue
  activeQuests.splice(index, 1);
  completedQuests.add(q.id);

  AudioSystem.playLevelUp();
  addMsg(`✅ Quête terminée : « ${q.title} » !`, 'good');

  recalculateStats();
  updateUI();
  updateQuestTracker();
  checkLevelUp();
  renderQuestList();
}

// ── Appelée depuis battle.js quand un monstre est vaincu ─────
// Met à jour la progression. NE complète PLUS automatiquement la quête :
// le joueur doit retourner voir le PNJ donneur pour la rendre.
window.checkKillQuests = function(monsterId) {
  activeQuests.forEach((q) => {
    const step = getActiveStep(q);
    if (!step || step.type !== 'kill' || step.monsterId !== monsterId) return;
    step.progress++;
    if (step.progress >= step.amount) {
      step.completed = true;
      const next = getActiveStep(q);
      if (next) {
        addMsg(`📜 Étape suivante : « ${q.title} »`, 'magic');
      } else {
        addMsg(`📜 Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
      }
    } else {
      addMsg(`📜 Quête « ${q.title} » : ${step.progress}/${step.amount}`, '');
    }
  });
};

// ── Appelée à chaque entrée d'étage (goDeeper / restoration) ──
// Marque comme accomplies les étapes "floor" dont la cible est atteinte.
window.checkFloorQuests = function(floor) {
  activeQuests.forEach((q) => {
    for (const step of q.objectives) {
      if (step.completed)         continue;
      if (step.type   !== 'floor') continue;
      if (floor      >= step.floor) {
        step.progress  = step.amount;
        step.completed = true;
        addMsg(`📜 Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
      }
    }
  });
};

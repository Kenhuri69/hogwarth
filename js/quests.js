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
    reward: { xp: 30, gold: 20, stats: { hp: 5, atk: 1, def: 1, mag: 1 } },
    location: "Hall d'entrée (étage 1)"
  },
  // ── Chaîne d'épreuves de Dumbledore (Phase 3) ─────────────────
  // Une chaîne de 5 quêtes (intro_tutoriel + 4 nouvelles) qui boost
  // permanent les stats du groupe et débloque sorts/items. La quête N+1
  // n'apparaît qu'après remise de la quête N (champ `prereq`).
  {
    id: "dumbledore_eveil",
    title: "L'éveil du Sorcier",
    giver: "Albus Dumbledore",
    desc: "Affronte un Épouvantard ou un Détraqueur. Les peurs qu'on défie nous rendent plus forts.",
    prereq: "intro_tutoriel",
    objectives: [
      { type: "kill", monsterId: "boggart", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 120, gold: 50, stats: { hp: 5, lck: 1 }, spell: "Wingardium Leviosa" },
    location: "Hall d'entrée (étage 1) — cible étage 3+"
  },
  {
    id: "dumbledore_courage",
    title: "Le Courage et la Ruse",
    giver: "Albus Dumbledore",
    desc: "Élimine deux Mangemorts qui rôdent dans les couloirs profonds. Apporte-moi cette preuve de bravoure.",
    prereq: "dumbledore_eveil",
    objectives: [
      { type: "kill", monsterId: "mangemort", amount: 2, progress: 0, completed: false }
    ],
    reward: { xp: 220, gold: 100, stats: { hp: 10, atk: 1, mag: 1 }, item: "potion_m" },
    location: "Hall d'entrée (étage 1) — cible étage 5+",
    spawnOnAccept: { targetMonsterId: "mangemort", extraRandomCount: 1 }
  },
  {
    id: "dumbledore_resistance",
    title: "L'Ordre du Phénix",
    giver: "Albus Dumbledore",
    desc: "Un Mangemort d'élite a infiltré nos défenses. Trouve-le et neutralise-le. L'Ordre compte sur toi.",
    prereq: "dumbledore_courage",
    objectives: [
      { type: "kill", monsterId: "mangemort_elite", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 340, gold: 160, stats: { hp: 10, atk: 2, def: 2 }, item: "amulette" },
    location: "Hall d'entrée (étage 1) — cible étage 7+",
    spawnOnAccept: { targetMonsterId: "mangemort_elite", extraRandomCount: 1 }
  },
  {
    id: "dumbledore_revelation",
    title: "La Révélation",
    giver: "Albus Dumbledore",
    desc: "Au plus profond, une ombre se reforme. Affronte Bellatrix Lestrange — pour Poudlard, pour ceux que nous avons perdus.",
    prereq: "dumbledore_resistance",
    objectives: [
      { type: "kill", monsterId: "bellatrix", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 500, gold: 250, stats: { hp: 20, atk: 2, def: 2, mag: 2, lck: 2 } },
    location: "Hall d'entrée (étage 1) — cible étage 10+"
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
    location: "Forêt Interdite (étage 4+)",
    // Quête répétable : Hagrid en redemande tous les 3 niveaux.
    repeatable: { everyLevels: 3 },
    // À partir de la 2e remise, le balai est déjà au sac : on bascule
    // sur une récompense allégée plutôt que d'empiler des doublons.
    repeatableReward: { xp: 60, gold: 35 },
    // À l'acceptation : 1 chouette + 2 mobs aléatoires de l'étage,
    // pour donner du grain à moudre dans des salles déjà nettoyées.
    spawnOnAccept: { targetMonsterId: "chouette_envoutee", extraRandomCount: 2 }
  },
  {
    id: "defense_cabane",
    title: "Défense de la Cabane",
    giver: "Hagrid",
    desc: "Des araignées rôdent autour de la cabane d'Hagrid. Élimine-en 3 pour qu'il puisse dormir tranquille.",
    objectives: [
      { type: "kill", monsterId: "araignee", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 140, gold: 60, item: "potion_m" },
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
  },
  // ── Phase 3b : quêtes secondaires PNJ → équipement étendu ──
  {
    id: "bottines_ollivander",
    title: "Le cuir volé d'Ollivander",
    giver: "Mr Ollivander",
    desc: "Un Hippogriffe en colère a éventré une caisse de cuir de dragon que je gardais pour un client. Élimine la bête : ses serres trahissent les bottes qu'elle a piétinées.",
    objectives: [
      { type: "kill", monsterId: "hippogriffe_courroux", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 220, gold: 80, item: "bottes_dragon" },
    location: "Atelier d'Ollivander (étage 3)"
  },
  {
    id: "fil_acromantule",
    title: "Le fil de l'Acromantule",
    giver: "Madame Guipure",
    desc: "Pour broder une cape qui résiste aux sortilèges, il me faut trois fils tirés d'Acromantules vivantes. Tue trois jeunes Acromantules et récupère-les pour moi.",
    objectives: [
      { type: "kill", monsterId: "acromantula_jeune", amount: 3, progress: 0, completed: false }
    ],
    reward: { xp: 260, gold: 90, item: "cape_voyageur" },
    location: "Atelier de couture (étage 5)"
  },
  {
    id: "anneau_dumbledore",
    title: "L'Anneau de la Résurrection",
    giver: "Portrait d'Albus Dumbledore",
    desc: "Une ombre rôde dans les couloirs — un fragment d'âme qui hante un vieil anneau de famille. Vaincs cette ombre, et l'anneau te reviendra.",
    objectives: [
      { type: "kill", monsterId: "ombre_quirrell", amount: 1, progress: 0, completed: false }
    ],
    reward: { xp: 320, gold: 120, item: "anneau_resurrection" },
    location: "Galerie des portraits (étage 6)"
  },
  {
    id: "bouclier_phenix",
    title: "Le Bouclier du Phénix",
    giver: "Fumseck",
    desc: "Cinq Mangemorts profanent les couloirs du château. Élimine-les, et je te confierai une de mes larmes — un baume qui te soignera dans la durée.",
    objectives: [
      { type: "kill", monsterId: "mangemort", amount: 5, progress: 0, completed: false }
    ],
    reward: { xp: 380, gold: 150, item: "larmes_phenix" },
    location: "Volière de Fumseck (étage 7)"
  }
];

function getQuestTemplate(id) {
  return QUEST_TEMPLATES.find(t => t.id === id) || null;
}

// Une quête est offrable si elle est dans availableQuests (jamais
// faite) OU si elle est répétable et que le cooldown est écoulé
// depuis la dernière complétion (lastQuestCompletion[id]).
function isQuestOfferable(id) {
  if (!id) return false;
  // Pré-requis de chaîne : `tpl.prereq` doit être dans completedQuests.
  const tplPrereq = getQuestTemplate(id);
  if (tplPrereq && tplPrereq.prereq && !completedQuests.has(tplPrereq.prereq)) return false;
  if (availableQuests.has(id)) return true;
  if (!completedQuests.has(id)) return false;
  const tpl = getQuestTemplate(id);
  if (!tpl || !tpl.repeatable) return false;
  const need = tpl.repeatable.everyLevels | 0;
  if (!need) return false;
  const last = lastQuestCompletion[id] || 0;
  const lvl  = (player && player.level) || 0;
  return (lvl - last) >= need;
}

// ── Acceptation / remise via PNJ ─────────────────────────────────

// Active une quête disponible. Idempotent : silencieusement ignoré si la
// quête est déjà active. Si la quête est complétée mais répétable +
// cooldown écoulé, on la "ré-accepte" en la sortant de completedQuests.
function acceptQuest(id) {
  if (!id) return false;
  if (activeQuests.some(q => q.id === id)) return false;
  if (completedQuests.has(id)) {
    if (!isQuestOfferable(id)) return false;
    completedQuests.delete(id); // recyclage répétable
  }
  const tpl = getQuestTemplate(id);
  if (!tpl) return false;
  // Clone profond pour préserver les compteurs progress par instance
  const inst = JSON.parse(JSON.stringify(tpl));
  inst.completed = false;
  activeQuests.push(inst);
  availableQuests.delete(id);
  addMsg(`📜 Nouvelle quête : « ${tpl.title} »`, 'magic');

  // Hook générique : si la quête déclare `spawnOnAccept`, on injecte
  // les mobs sur l'étage courant. Utile pour les quêtes répétables qui
  // se ré-acceptent sur des étages déjà nettoyés.
  if (tpl.spawnOnAccept && typeof spawnQuestMonsters === 'function') {
    const { targetMonsterId, extraRandomCount } = tpl.spawnOnAccept;
    const placed = spawnQuestMonsters(targetMonsterId, extraRandomCount | 0);
    if (placed > 0) {
      if (typeof renderMinimap === 'function') renderMinimap();
      if (typeof drawDungeon === 'function') drawDungeon();
    }
  }

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
    container.innerHTML = `<div class="quest-list-empty">Aucune quête disponible.</div>`;
    return;
  }

  // Quêtes actives
  pending.forEach(q => {
    const card = document.createElement('div');
    card.className = 'spell-item';
    card.style.cssText = 'flex-direction:column;align-items:flex-start;gap:5px;padding:10px 12px';
    card.innerHTML = _renderActiveQuestCard(q);
    container.appendChild(card);
  });

  // Section terminées
  if (completed.length > 0) _appendCompletedSection(container, completed);

  // Bannière "tout terminé" si plus aucune quête active
  if (pending.length === 0) _prependAllDoneBanner(container);
}

// HTML interne d'une carte de quête active (sans le wrapper <div.spell-item>).
function _renderActiveQuestCard(q) {
  const activeStep = getActiveStep(q);

  // Pour l'étape active de type item : recompter depuis l'inventaire
  if (activeStep && activeStep.type === 'item') {
    activeStep.progress = player.inventory.filter(i => i.id === activeStep.itemId).length;
  }
  const ready = activeStep && activeStep.progress >= activeStep.amount;

  const rewardHtml = _renderRewardParts(q.reward);
  const stepsHtml  = q.objectives
    .map((o, i) => _renderQuestStep(o, o === activeStep, ready, i === 0))
    .join('');

  return `
    <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
      <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold-light)">${q.title}</div>
      <div style="font-size:10px;color:#8a7050;text-align:right">${q.giver}<br>${q.location}</div>
    </div>
    <div style="font-size:12px;color:var(--parchment-dark);line-height:1.5">${q.desc}</div>
    <div style="width:100%">${stepsHtml}</div>
    <div style="font-size:10px;color:#8a7050">Récompenses : ${rewardHtml}</div>
    ${ready
      ? `<div style="font-size:10px;color:#60c040;align-self:flex-end;font-style:italic">
           ✅ Prêt — retourne voir ${q.giver}
         </div>`
      : `<div style="font-size:10px;color:#4a3a20;align-self:flex-end;font-style:italic">
           Étape en cours…
         </div>`
    }
  `;
}

// HTML d'une étape d'objectif (✓ complétée, ▶ active avec barre, ◌ verrouillée).
function _renderQuestStep(o, isActive, ready, isFirst) {
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
  const icon  = o.completed ? '✓' : (isActive ? '▶' : '◌');
  const color = o.completed ? '#60c040' : (isActive ? 'var(--gold-light)' : '#4a3a20');

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
    <div style="margin-top:${isFirst ? '0' : '4px'}">
      <div style="font-size:11px;color:${color}">
        <span style="display:inline-block;width:14px">${icon}</span>${label}
      </div>
      ${barHtml}
    </div>`;
}

// HTML de la liste des récompenses (XP, or, item, sort) jointes par ' · '.
function _renderRewardParts(reward) {
  const parts = [];
  if (reward.xp)   parts.push(`<img class="ui-icon ui-icon-md" src="img/icons/xp.png" alt=""> +${reward.xp} XP`);
  if (reward.gold) parts.push(`<img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> +${reward.gold}`);
  if (reward.item) {
    const it = ITEMS.find(i => i.id === reward.item);
    if (it) parts.push(`${getItemIconHtml(it, 'ui-icon-sm')} ${it.name}`);
  }
  if (reward.spell) parts.push(`✨ Sort : ${reward.spell}`);
  return parts.join(' · ');
}

// Séparateur "— TERMINÉES —" + carte compacte par quête terminée.
function _appendCompletedSection(container, completed) {
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

// Bannière dorée en tête : "Toutes les quêtes sont terminées !" — n'apparaît
// que quand activeQuests est vide mais des quêtes terminées existent.
function _prependAllDoneBanner(container) {
  const msg = document.createElement('div');
  msg.style.cssText = 'text-align:center;padding:20px;color:var(--gold);font-family:"Cinzel",serif;font-size:12px';
  msg.textContent   = 'Toutes les quêtes sont terminées ! Bravo, jeune sorcier.';
  container.insertBefore(msg, container.firstChild);
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

  _consumeQuestItems(q);

  const tpl    = getQuestTemplate(q.id);
  const reward = _resolveQuestReward(q, tpl);
  _grantQuestReward(reward);

  // Points de Maison pour quête accomplie
  if (chosenHouse) {
    housePoints += 30;
    safeCall('checkHouseLevelUp');
  }

  // Retire de l'actif, marque comme rendue. Quêtes répétables : on
  // retient le niveau du joueur à la remise pour calculer le cooldown
  // lors d'une éventuelle ré-offre.
  activeQuests.splice(index, 1);
  completedQuests.add(q.id);
  if (tpl && tpl.repeatable) {
    lastQuestCompletion[q.id] = (player && player.level) || 0;
  }

  AudioSystem.playLevelUp();
  addMsg(`✅ Quête terminée : « ${q.title} » !`, 'good');

  recalculateStats();
  updateUI();
  updateQuestTracker();
  checkLevelUp();
  renderQuestList();
}

// Consomme les items requis par les étapes "item" de la quête.
function _consumeQuestItems(q) {
  for (const step of q.objectives) {
    if (step.type !== 'item') continue;
    let toConsume = step.amount;
    player.inventory = player.inventory.filter(i => {
      if (i.id === step.itemId && toConsume > 0) { toConsume--; return false; }
      return true;
    });
  }
}

// Quête répétable : à partir de la 2e remise (lastQuestCompletion[id]
// déjà renseigné), on bascule sur `repeatableReward` si défini, pour
// éviter d'empiler des items déjà acquis.
function _resolveQuestReward(q, tpl) {
  const isReRun = !!(tpl && tpl.repeatable && lastQuestCompletion[q.id] !== undefined);
  return (isReRun && tpl.repeatableReward) ? tpl.repeatableReward : q.reward;
}

// Applique XP / or / item / sort / stats permanents. Item refusé si
// inventaire plein. Sort et bonus de stats sont distribués à tout le
// groupe actif (`party.slice(0, partySize)`).
function _grantQuestReward(reward) {
  if (reward.xp)   player.xp   += reward.xp;
  if (reward.gold) player.gold += reward.gold;

  if (reward.item) {
    const item = ITEMS.find(i => i.id === reward.item);
    if (item && tryAddItem(item, { silent: true })) {
      addMsg(`Récompense : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name}`, 'good');
    }
  }
  if (reward.spell) {
    party.forEach(c => {
      if (!c.spells.includes(reward.spell)) c.spells.push(reward.spell);
    });
    addMsg(`✨ Nouveau sort débloqué : ${reward.spell} !`, 'magic');
  }
  if (reward.stats) _applyStatsReward(reward.stats);
}

// Applique un bonus permanent de stats à tout le groupe actif. Touche
// les `_baseX` (croissent au level-up) pour préserver le bonus à
// travers les futures montées. recalculateStats() est appelé par le
// caller (completeQuest) après _grantQuestReward.
function _applyStatsReward(stats) {
  const labels = [];
  for (const c of party.slice(0, partySize)) {
    if (stats.atk) c._baseAtk = (c._baseAtk || 0) + stats.atk;
    if (stats.def) c._baseDef = (c._baseDef || 0) + stats.def;
    if (stats.mag) c._baseMag = (c._baseMag || 0) + stats.mag;
    if (stats.lck) c._baseLck = (c._baseLck || 0) + stats.lck;
    if (stats.str) c._baseStr = (c._baseStr || c.str || 0) + stats.str;
    if (stats.int) c._baseInt = (c._baseInt || c.int || 0) + stats.int;
    if (stats.agi) c._baseAgi = (c._baseAgi || c.agi || 0) + stats.agi;
    if (stats.end) c._baseEnd = (c._baseEnd || c.end || 0) + stats.end;
    if (stats.hp)  { c.hpMax += stats.hp; c.hp = Math.min(c.hpMax, c.hp + stats.hp); }
    if (stats.sp)  { c.spMax += stats.sp; c.sp = Math.min(c.spMax, c.sp + stats.sp); }
  }
  for (const [k, v] of Object.entries(stats)) {
    if (v > 0) labels.push(`+${v} ${k.toUpperCase()}`);
  }
  if (labels.length) addMsg(`📈 Bonus permanent : ${labels.join(', ')}`, 'good');
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

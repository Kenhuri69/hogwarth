// ============================================================
// QUESTS.JS — Système de quêtes secondaires (logique + journal UI)
// ============================================================
// Catalogue de templates : js/quests-templates.js (QUEST_TEMPLATES).
// Mini-jeux fusion/énigmes : js/quests-riddles.js. Le runtime
// (`activeQuests`, `availableQuests`, `completedQuests`) est dans state.js.
// Pour activer une quête : `acceptQuest(id)` (clone le template).

// Map Maison → quête de Maison (Maître Or, tier 12).
const HOUSE_SET_QUESTS = {
  Gryffondor:  'quest_set_gryff',
  Serpentard:  'quest_set_slyth',
  Serdaigle:   'quest_set_raven',
  Poufsouffle: 'quest_set_pouf',
};

// Ouvre la quête de Maison au franchissement du palier Maître Or (tier 12).
// Idempotent : silencieusement ignoré si la quête est déjà connue (active,
// disponible ou rendue).
function unlockHouseQuest(house) {
  const qid = HOUSE_SET_QUESTS[house];
  if (!qid) return false;
  if (activeQuests.some(q => q.id === qid)) return false;
  if (completedQuests.has(qid)) return false;
  if (availableQuests.has(qid)) return false;
  availableQuests.add(qid);
  if (typeof addMsg === 'function') {
    const tpl = getQuestTemplate(qid);
    addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Nouvelle quête de Maison : « ${tpl ? tpl.title : qid} »`, 'magic');
  }
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  return true;
}
window.unlockHouseQuest = unlockHouseQuest;

// Map Maison → quête de don (palier 17 « Mythe »).
const HOUSE_MYTHE_QUESTS = {
  Gryffondor:  'quest_don_gryff',
  Serpentard:  'quest_don_slyth',
  Serdaigle:   'quest_don_raven',
  Poufsouffle: 'quest_don_pouf',
};

// Ouvre la quête de don au franchissement du palier Mythe (tier 17).
// Idempotent : ignoré si la quête est déjà connue (active, disponible
// ou rendue). Symétrique de `unlockHouseQuest` (tier 12).
function unlockHouseMytheQuest(house) {
  const qid = HOUSE_MYTHE_QUESTS[house];
  if (!qid) return false;
  if (activeQuests.some(q => q.id === qid)) return false;
  if (completedQuests.has(qid)) return false;
  if (availableQuests.has(qid)) return false;
  availableQuests.add(qid);
  if (typeof addMsg === 'function') {
    const tpl = getQuestTemplate(qid);
    addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Nouvelle quête de Maison : « ${tpl ? tpl.title : qid} »`, 'magic');
  }
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  return true;
}
window.unlockHouseMytheQuest = unlockHouseMytheQuest;

// IDs de monstres exclus du pool farming (bosses uniques scénaristiques).
const FARMING_KILL_BLACKLIST = new Set([
  'bellatrix', 'voldemort_affaibli', 'voldemort_revenu', 'nagini'
]);

// Cache de prévisualisation des quêtes farming. Une `offer` ouvre un
// dialogue qui doit afficher le nom de la cible AVANT acceptation : on
// pré-tire ici (idempotent par qid+floor) et `acceptQuest` consomme la
// preview pour que dialogue et quête activée référencent la même cible.
// Vidé quand le joueur change d'étage (cf. _clearFarmingPreviews dans
// movement.js — appelé par goDeeper / goUp).
const _farmingOfferPreviews = {};

function _previewFarmingOffer(qid) {
  const tpl = getQuestTemplate(qid);
  if (!tpl || !tpl.rollOnAccept) return null;
  const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
  const cached = _farmingOfferPreviews[qid];
  if (cached && cached.floor === floor) return cached;
  const fake = JSON.parse(JSON.stringify(tpl));
  if (!_rollFarmingTarget(fake, floor)) {
    _farmingOfferPreviews[qid] = null;
    return null;
  }
  const preview = {
    floor,
    monsterId: fake.objectives[0].monsterId,
    itemId:    fake.objectives[0].itemId,
    amount:    fake.objectives[0].amount,
    target:    fake._dynamicTarget,
    reward:    fake.reward,
    desc:      fake._dynamicDesc
  };
  _farmingOfferPreviews[qid] = preview;
  return preview;
}

function _consumeFarmingOfferPreview(qid, floor) {
  const cached = _farmingOfferPreviews[qid];
  if (cached && cached.floor === floor) {
    delete _farmingOfferPreviews[qid];
    return cached;
  }
  return null;
}

function _clearFarmingPreviews() {
  for (const k of Object.keys(_farmingOfferPreviews)) delete _farmingOfferPreviews[k];
}

// Bonus XP si le joueur est sous-level pour l'étage (+10 %/niveau de retard,
// cap +50 %). expectedLevel = max(1, floor).
function _farmingXpBonus(baseXp, floor) {
  const expected = Math.max(1, floor | 0);
  const lvl      = (typeof player !== 'undefined' && player) ? (player.level || 1) : 1;
  const delta    = expected - lvl;
  if (delta <= 0) return baseXp | 0;
  const mult = Math.min(1.5, 1 + delta * 0.10);
  return Math.floor(baseXp * mult);
}

// Tire monstre/item + quantité à l'acceptation d'une quête farming.
// Mute `quest.objectives[0]` (monsterId/itemId + amount), recalcule
// `quest.reward` avec fluctuation ±20 % et bonus sous-level, stocke
// `quest._dynamicDesc` et `quest._dynamicTarget` pour les dialogues.
// Retourne true si le tirage a abouti, false sinon (quête abandonnée).
function _rollFarmingTarget(quest, floor) {
  const cfg = quest && quest.rollOnAccept;
  if (!cfg) return false;
  const step = quest.objectives[0];
  if (!step) return false;

  if (cfg.kind === 'kill') {
    const f = floor | 0;
    if (f < cfg.minFloor || f > cfg.maxFloor) return false;
    const pool = (typeof MONSTERS !== 'undefined' ? MONSTERS : []).filter(m =>
      m.minFloor <= f && (m.maxFloor === null || f <= m.maxFloor) &&
      !FARMING_KILL_BLACKLIST.has(m.id)
    );
    if (!pool.length) return false;
    const picked = (typeof weightedPick === 'function') ? weightedPick(pool) : pool[Math.floor(Math.random() * pool.length)];
    const amount = cfg.minAmount + Math.floor(Math.random() * (cfg.maxAmount - cfg.minAmount + 1));
    step.monsterId = picked.id;
    step.amount    = amount;
    step.progress  = 0;
    step.completed = false;
    quest._dynamicTarget = { type: 'monster', id: picked.id, name: picked.name, amount };
    quest._dynamicDesc   = `Élimine ${amount}× ${picked.name} repérés dans le château.`;
    quest.desc           = quest._dynamicDesc;
  } else if (cfg.kind === 'item') {
    const pool = (cfg.pool || [])
      .map(id => (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === id) : null)
      .filter(Boolean);
    if (!pool.length) return false;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const amount = cfg.minAmount + Math.floor(Math.random() * (cfg.maxAmount - cfg.minAmount + 1));
    step.itemId    = picked.id;
    step.amount    = amount;
    step.progress  = 0;
    step.completed = false;
    quest._dynamicTarget = { type: 'item', id: picked.id, name: picked.name, amount };
    quest._dynamicDesc   = `Apporte ${amount}× ${picked.name} à Hagrid.`;
    quest.desc           = quest._dynamicDesc;
  } else {
    return false;
  }

  // Fluctuation ±20 % sur les récompenses + bonus sous-level sur l'XP
  const baseXp   = quest.reward && quest.reward.xp   ? quest.reward.xp   : 0;
  const baseGold = quest.reward && quest.reward.gold ? quest.reward.gold : 0;
  const xpJitter   = 0.8 + Math.random() * 0.4;
  const goldJitter = 0.8 + Math.random() * 0.4;
  quest.reward = {
    xp:   _farmingXpBonus(Math.floor(baseXp * xpJitter), floor),
    gold: Math.floor(baseGold * goldJitter)
  };
  return true;
}

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

  // Quête farming : tirage dynamique monstre/item + amount + récompense.
  // Si le tirage échoue (étage hors fourchette, pool vide…), on n'active
  // pas la quête : message d'avertissement et abandon.
  if (tpl.rollOnAccept) {
    const floor = (typeof currentFloor === 'number') ? currentFloor : 1;
    const preview = _consumeFarmingOfferPreview(id, floor);
    let ok;
    if (preview) {
      const step = inst.objectives[0];
      if (preview.monsterId) step.monsterId = preview.monsterId;
      if (preview.itemId)    step.itemId    = preview.itemId;
      step.amount    = preview.amount;
      step.progress  = 0;
      step.completed = false;
      inst._dynamicTarget = preview.target;
      inst._dynamicDesc   = preview.desc;
      inst.desc           = preview.desc;
      inst.reward         = Object.assign({}, preview.reward);
      ok = true;
    } else {
      ok = _rollFarmingTarget(inst, floor);
    }
    if (!ok) {
      addMsg(`Aucune cible disponible ici pour « ${tpl.title} ». Reviens sur un étage adapté.`, 'bad');
      return false;
    }
  }

  activeQuests.push(inst);
  availableQuests.delete(id);
  addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Nouvelle quête : « ${tpl.title} »`, 'magic');

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

  // Quête chasse farming : on injecte `amount + spawnBonus` copies de la
  // cible sur l'étage courant pour rendre le grind visible et accessible.
  if (tpl.rollOnAccept && tpl.rollOnAccept.kind === 'kill' &&
      typeof spawnFarmingMonsters === 'function' && inst._dynamicTarget) {
    const tgt = inst._dynamicTarget;
    const spawnCount = tgt.amount + (tpl.rollOnAccept.spawnBonus | 0);
    const placed = spawnFarmingMonsters(tgt.id, spawnCount);
    if (placed > 0) {
      addMsg(`🦂 Plusieurs ${tgt.name} ont été repérés dans l'étage !`, 'magic');
      if (typeof renderMinimap === 'function') renderMinimap();
      if (typeof drawDungeon === 'function') drawDungeon();
    }
  } else if (tpl.rollOnAccept && tpl.rollOnAccept.kind === 'item' && inst._dynamicTarget) {
    const tgt = inst._dynamicTarget;
    addMsg(`📦 Hagrid a besoin de ${tgt.amount}× ${tgt.name}.`, 'magic');
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

  // Tri : quêtes farming d'abord (template `farming: true`), puis les autres.
  const farming = pending.filter(q => {
    const t = getQuestTemplate(q.id);
    return t && t.farming;
  });
  const others = pending.filter(q => !farming.includes(q));

  if (farming.length) {
    const header = document.createElement('div');
    header.style.cssText = 'font-family:"Cinzel",serif;font-size:12px;color:#ff8a40;letter-spacing:2px;border-bottom:1px solid #4a2010;padding-bottom:4px;margin-bottom:2px';
    header.textContent = '🌾 QUÊTES DE FARMING';
    container.appendChild(header);
    farming.forEach(q => {
      const card = document.createElement('div');
      card.className = 'spell-item';
      card.style.cssText = 'flex-direction:column;align-items:flex-start;gap:5px;padding:10px 12px;border-color:#7a3a10';
      card.innerHTML = _renderActiveQuestCard(q);
      container.appendChild(card);
    });
    if (others.length) {
      const sep = document.createElement('div');
      sep.style.cssText = 'font-family:"Cinzel",serif;font-size:11px;color:var(--gold-dark);letter-spacing:2px;border-bottom:1px solid #2a1a08;padding-bottom:4px;margin-top:6px';
      sep.textContent = 'QUÊTES PRINCIPALES';
      container.appendChild(sep);
    }
  }

  others.forEach(q => {
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
  // Étape `pages` : recompter depuis la besace de pages.
  if (activeStep && activeStep.type === 'pages') {
    activeStep.progress = Array.isArray(player.grimoirePages)
      ? player.grimoirePages.length : 0;
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
  let label;
  if (o.type === 'kill') {
    const m = MONSTERS.find(x => x.id === o.monsterId);
    label = `Éliminer ${o.amount}× ${m ? m.name : o.monsterId}`;
  } else if (o.type === 'floor') {
    label = `Descendre jusqu'à l'étage ${o.floor}`;
  } else if (o.type === 'donate') {
    label = `Faire don de ${o.amount} Gallions`;
  } else if (o.type === 'pages') {
    label = `Réunir ${o.amount} pages du grimoire`;
  } else if (o.type === 'riddle') {
    label = `Résoudre les énigmes de Dumbledore`;
  } else {
    const it = ITEMS.find(x => x.id === o.itemId);
    label = `Apporter ${o.amount}× ${it ? it.name : o.itemId}`;
  }
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
  if (Array.isArray(reward.recipes) && typeof POTION_RECIPES !== 'undefined') {
    reward.recipes.forEach(rid => {
      const r = POTION_RECIPES.find(x => x.id === rid);
      if (r) parts.push(`📜 Recette : ${r.name}`);
    });
  }
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
      // Don de gold : évalué en continu dans les deux sens — l'or n'est
      // consommé qu'à la remise, donc l'objectif se dé-complète si le
      // joueur dépense ses Gallions avant d'aller voir le Chef de Maison.
      if (step.type === 'donate') {
        step.progress  = (player && player.gold) || 0;
        step.completed = step.progress >= step.amount;
        continue;
      }
      // Pages du grimoire : recomptées en continu depuis la besace.
      if (step.type === 'pages') {
        step.progress  = (player && Array.isArray(player.grimoirePages))
          ? player.grimoirePages.length : 0;
        step.completed = step.progress >= step.amount;
        continue;
      }
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
  addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête terminée : « ${q.title} » !`, 'good');

  recalculateStats();
  updateUI();
  updateQuestTracker();
  checkLevelUp();
  renderQuestList();
}

// Consomme les items requis par les étapes "item" de la quête.
function _consumeQuestItems(q) {
  for (const step of q.objectives) {
    if (step.type === 'donate') {
      player.gold = Math.max(0, player.gold - step.amount);
      continue;
    }
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
  // Pièce #4 de set : route via pendingHouseRewards. La remise effective
  // se fait au prochain dialogue avec le Chef de Maison via
  // `claim_house_reward` (cohérence cérémonielle avec les autres pièces).
  if (reward.houseSetReward && typeof pendingHouseRewards !== 'undefined') {
    pendingHouseRewards.add(reward.houseSetReward);
    const item = ITEMS.find(i => i.id === reward.houseSetReward);
    if (item) {
      addMsg(`${getItemIconHtml(item, 'ui-icon-md')} Le Chef de votre Maison conserve la relique : ${item.name}. Allez la réclamer.`, 'magic');
    }
  }
  if (reward.spell) {
    party.forEach(c => {
      if (!c.spells.includes(reward.spell)) c.spells.push(reward.spell);
    });
    addMsg(`${getSpellIconHtml(reward.spell, 'ui-icon-md')} Nouveau sort débloqué : ${reward.spell} !`, 'magic');
  }
  // Recettes de potion : apprises au groupe (besace partagée).
  if (Array.isArray(reward.recipes) && typeof learnRecipe === 'function') {
    reward.recipes.forEach(rid => learnRecipe(rid));
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
        addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Étape suivante : « ${q.title} »`, 'magic');
      } else {
        addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
      }
    } else {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » : ${step.progress}/${step.amount}`, '');
    }
  });
};

// ── Appelée après le ramassage d'une page de grimoire ───────
// Met à jour la progression de manon_grimoire depuis player.grimoirePages.
window.checkPageQuest = function() {
  const q = (typeof activeQuests !== 'undefined')
    ? activeQuests.find(x => x.id === 'manon_grimoire') : null;
  if (!q) return;
  const step = q.objectives.find(o => o.type === 'pages');
  if (!step || step.completed) return;
  const n = (player && Array.isArray(player.grimoirePages))
    ? player.grimoirePages.length : 0;
  step.progress = n;
  if (n >= step.amount) {
    step.completed = true;
    addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
  } else {
    addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » : ${n}/${step.amount} pages.`, '');
  }
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
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
        addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
      }
    }
  });
};


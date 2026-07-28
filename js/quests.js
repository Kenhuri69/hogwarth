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

// Map Maison → Quête Signature (Actes I-III).
const HOUSE_SIGNATURE_QUESTS = {
  Gryffondor:  'quest_signature_gryff',
  Serpentard:  'quest_signature_slyth',
  Serdaigle:   'quest_signature_raven',
  Poufsouffle: 'quest_signature_pouf',
};

// Étage déclencheur par Maison : la signature s'ouvre dès que le joueur
// atteint cet étage (gate `chosenHouse` + étage, distinct du prestige).
// Aligné sur l'étage du PNJ donneur (npcs-a.js) — le toast ne doit jamais
// annoncer une quête dont le donneur n'est pas encore atteignable :
// chevalier_godric ét. 2, echo_salazar ét. 4, flitwick ét. 6, sprout ét. 3.
const HOUSE_SIGNATURE_FLOORS = {
  Gryffondor: 2, Serpentard: 4, Serdaigle: 6, Poufsouffle: 3,
};

// Ouvre la Quête Signature de la Maison choisie. Idempotent (ignoré si la
// quête est déjà connue). Symétrique de unlockHouseQuest / unlockHouseMytheQuest,
// mais gaté par l'étage (cf. _maybeUnlockSignature, appelé par checkFloorQuests)
// plutôt que par un palier de prestige.
function unlockHouseSignatureQuest(house) {
  const qid = HOUSE_SIGNATURE_QUESTS[house];
  if (!qid) return false;
  if (activeQuests.some(q => q.id === qid)) return false;
  if (completedQuests.has(qid)) return false;
  if (availableQuests.has(qid)) return false;
  availableQuests.add(qid);
  if (typeof addMsg === 'function') {
    const tpl = getQuestTemplate(qid);
    addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête Signature de Maison : « ${tpl ? tpl.title : qid} »`, 'magic');
  }
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  return true;
}
window.unlockHouseSignatureQuest = unlockHouseSignatureQuest;

// Tente d'ouvrir la signature de la Maison choisie au franchissement de
// l'étage déclencheur. No-op sans `chosenHouse` ; idempotent.
function _maybeUnlockSignature(floor) {
  if (typeof chosenHouse === 'undefined' || !chosenHouse) return;
  const trigger = HOUSE_SIGNATURE_FLOORS[chosenHouse];
  if (typeof trigger !== 'number') return;
  if (floor >= trigger) unlockHouseSignatureQuest(chosenHouse);
}
window._maybeUnlockSignature = _maybeUnlockSignature;

// Pose le flag <house>SignatureDone à la remise de la signature (lu comme
// levier one-shot avant Voldemort). Pour Serpentard, fige aussi le choix
// gris à 'defiance' par défaut si turnInSlythSignature ne l'a pas posé.
function _markSignatureDone(house) {
  if (house === 'Gryffondor'  && typeof gryffSignatureDone !== 'undefined') gryffSignatureDone = true;
  else if (house === 'Serpentard' && typeof slythSignatureDone !== 'undefined') {
    slythSignatureDone = true;
    if (typeof slythPactChoice !== 'undefined' && !slythPactChoice) slythPactChoice = 'defiance';
  }
  else if (house === 'Serdaigle'  && typeof ravenSignatureDone !== 'undefined') ravenSignatureDone = true;
  else if (house === 'Poufsouffle' && typeof poufSignatureDone  !== 'undefined') poufSignatureDone  = true;
}

// Remise de la signature Serpentard avec choix gris Pacte / Défiance. Le
// dialogue de Rogue (npc-dialog.js) expose deux boutons qui appellent cette
// fonction ; le flag slythPactChoice oriente ensuite le levier Voldemort.
function turnInSlythSignature(choice) {
  slythPactChoice = (choice === 'pact') ? 'pact' : 'defiance';
  return turnInQuestById('quest_signature_slyth');
}
window.turnInSlythSignature = turnInSlythSignature;

// ── Fil rouge des Éclats (ch.06 §6.9.3) ──────────────────────────
// `eclatProgress()` : avancement DÉRIVÉ du fil rouge des Éclats de la Clé de
// Voûte, dans {0,1,2,3}. Lu par les PNJ-pivots (Dumbledore, écho de Salazar)
// pour leur suffixe `eclatLines`. Aucun compteur sérialisé parallèle (§6.12.B) :
// on compte les `eclat_voute` possédés, MAIS la remise de `eclats_clef_voute`
// consomme l'inventaire (_consumeQuestItems) → on plafonne à 3 une fois la
// quête complétée (monotone post-remise). Défensif (file:// / état partiel).
function eclatProgress() {
  if (typeof completedQuests !== 'undefined' && completedQuests.has('eclats_clef_voute')) return 3;
  let n = 0;
  if (typeof player !== 'undefined' && Array.isArray(player.inventory)) {
    for (const it of player.inventory) {
      if (it && it.id === 'eclat_voute') n += (it.qty || 1);
    }
  }
  return Math.min(3, n);
}
window.eclatProgress = eclatProgress;

// ── Réputation par PNJ (ch.06 §6.9.2) — DÉRIVÉE, zéro flag neuf ──────
// §6.9.2 met en tête « réputation dérivée — aucune variable neuve si possible » :
// le seul vrai choix gris du jeu (le Pacte des Cachots) est déjà porté par
// `slythPactChoice` (sérialisé). On en DÉRIVE une réputation bornée [-2,+2] pour
// les 2-3 PNJ à choix gris, sans Map parallèle. Réactions de signe OPPOSÉ sur le
// même choix : l'écho de Salazar (donneur) accueille le Pacte ; Kingsley (Ordre)
// le voit comme une trahison. Lu par `_reputationSuffixPages` (npc-dialog.js).
const NPC_REPUTATION_PACT = {
  echo_salazar: { pact:  2, defiance: -2 },  // le Fondateur-miroir : scellé → héritier ; défié → froid
  kingsley:     { pact: -2, defiance:  1 },  // l'Auror de l'Ordre : pacte → méfiance ; défiance → respect
};
function npcReputationFor(npcId) {
  const r = NPC_REPUTATION_PACT[npcId];
  if (!r) return 0;
  const choice = (typeof slythPactChoice !== 'undefined') ? slythPactChoice : null;
  if (choice !== 'pact' && choice !== 'defiance') return 0;
  const v = r[choice] || 0;
  return Math.max(-2, Math.min(2, v));   // borné [-2,+2] (§6.9.2)
}
window.npcReputationFor = npcReputationFor;


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
    quest._dynamicDesc   = `Apporte ${amount}× ${picked.name} à ${quest.giver || 'ton commanditaire'}.`;
    quest.desc           = quest._dynamicDesc;
  } else {
    return false;
  }

  // Fluctuation ±20 % sur les récompenses + bonus sous-level sur l'XP
  const baseXp   = quest.reward && quest.reward.xp   ? quest.reward.xp   : 0;
  const baseGold = quest.reward && quest.reward.gold ? quest.reward.gold : 0;
  // `keepRewardItem` : conserve l'item matériau du template malgré la passe
  // farming (sinon le tirage écrase reward en {xp,gold}). Permet aux chasses
  // de Boucle de droper Essence/Page à chaque cycle.
  const keepItem = (quest.keepRewardItem && quest.reward) ? quest.reward.item : null;
  const xpJitter   = 0.8 + Math.random() * 0.4;
  const goldJitter = 0.8 + Math.random() * 0.4;
  quest.reward = {
    xp:   _farmingXpBonus(Math.floor(baseXp * xpJitter), floor),
    gold: Math.floor(baseGold * goldJitter)
  };
  if (keepItem) quest.reward.item = keepItem;
  return true;
}

function getQuestTemplate(id) {
  return QUEST_TEMPLATES.find(t => t.id === id) || null;
}

// Quête signature de Maison (charge narrative distincte des kill/item
// génériques) — détectée via le flag `houseSignatureQuest` du template.
function _isSignatureQuest(id) {
  const t = getQuestTemplate(id);
  return !!(t && t.houseSignatureQuest);
}

// Chip « signature » affiché dans le journal pour signaler le poids narratif.
const _SIGNATURE_QUEST_BADGE =
  '<span style="display:inline-block;margin-left:6px;padding:1px 6px;' +
  'font-family:\'Cinzel\',serif;font-size:9px;letter-spacing:1px;color:#1a1208;' +
  'background:linear-gradient(135deg,#caa23a,#f3e0a0);border-radius:8px;' +
  'vertical-align:middle;box-shadow:0 0 6px rgba(226,194,96,.55)" ' +
  'title="Quête signature de ta Maison — charge narrative">✦ SIGNATURE</span>';

// Une quête est offrable si elle est dans availableQuests (jamais
// faite) OU si elle est répétable et que le cooldown est écoulé
// depuis la dernière complétion (lastQuestCompletion[id]).
function isQuestOfferable(id) {
  if (!id) return false;
  const tpl = getQuestTemplate(id);
  // Pré-requis de chaîne : `tpl.prereq` doit être dans completedQuests.
  if (tpl && tpl.prereq && !completedQuests.has(tpl.prereq)) return false;
  // Gate par étage : quête réservée à une tranche d'étages. `tpl.minFloor`
  // gate les quêtes endgame (Boucle 11+) ; `rollOnAccept.minFloor/maxFloor`
  // gate la fourchette farming (la cible n'est tirable que dans cette plage).
  // Sans ce gate, un bouton « Accepter » s'affichait hors zone et échouait à
  // l'acceptation (cible introuvable / étage hors fourchette).
  if (tpl) {
    const fl   = (typeof currentFloor === 'number') ? currentFloor : 1;
    const roll = tpl.rollOnAccept || null;
    const minF = (tpl.minFloor != null) ? tpl.minFloor
               : (roll && roll.minFloor != null) ? roll.minFloor : null;
    const maxF = (roll && roll.maxFloor != null) ? roll.maxFloor : null;
    if (minF != null && fl < minF) return false;
    if (maxF != null && fl > maxF) return false;
  }
  if (availableQuests.has(id)) return true;
  if (!completedQuests.has(id)) return false;
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

  // Objet remis par le donneur à l'acceptation (quêtes de LIVRAISON —
  // ex. lettre_jamais_envoyee : Manon confie la lettre, remise chez Lupin).
  // Sac plein → tryAddItem affiche son message et l'acceptation est refusée.
  if (tpl.grantOnAccept) {
    if (typeof tryAddItem !== 'function' || !tryAddItem(tpl.grantOnAccept)) {
      addMsg(`Fais de la place dans ton sac avant d'accepter « ${tpl.title} ».`, 'bad');
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
    <div style="text-align:center;font-size:11px;color:#8a7050;margin-bottom:14px">
      ${done} / ${total} quête${total > 1 ? 's' : ''} terminée${done > 1 ? 's' : ''}
    </div>
    <div id="quest-list" style="display:flex;flex-direction:column;gap:10px;
                                 max-height:55vh;overflow-y:auto"></div>
  `;
  if (typeof setCharacterModalTitle === 'function')
    setCharacterModalTitle('img/icons/quest.png', 'Journal des Quêtes');
  document.getElementById('character-modal').style.display = 'flex';
  if (typeof _mountGrimoireTabs === 'function') _mountGrimoireTabs('quetes');
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
    activeStep.progress = (typeof _countItems === 'function')
      ? _countItems(activeStep.itemId)
      : player.inventory.filter(i => i.id === activeStep.itemId).length;
  }
  // Étape `herb` : recompter depuis la besace d'herboriste.
  if (activeStep && activeStep.type === 'herb') {
    activeStep.progress = _countBesaceHerbs(activeStep.itemId);
  }
  // Étape `discover_garden` : reflet du flag global de découverte.
  if (activeStep && activeStep.type === 'discover_garden') {
    activeStep.progress = (typeof gardenDiscovered !== 'undefined' && gardenDiscovered) ? 1 : 0;
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
      <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold-light)">${q.title}${_isSignatureQuest(q.id) ? _SIGNATURE_QUEST_BADGE : ''}</div>
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
// Libellés lisibles des lieux visés par une étape "discover". La clé est
// un nom de CELL ; un lieu absent de cette table reste affichable via un
// repli générique (jamais d'étape muette dans le journal).
const _DISCOVER_LABELS = {
  FOUNTAIN:    'une fontaine',
  ALTAR:       'un autel',
  STELE:       "une stèle d'énigme",
  FORGE:       'la Forge des Ténèbres',
  LIBRARY:     'la Bibliothèque interdite',
  GARDEN:      "un jardin d'herbes",
  REFUGE:      'un refuge',
  SHOP:        'une échoppe',
  CHEST:       'un coffre',
  RUNE:        'une dalle-rune',
  REQUIREMENT: 'la Salle sur Demande',
};

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
  } else if (o.type === 'discover_garden') {
    label = `Découvrir un jardin d'herbes caché`;
  } else if (o.type === 'discover') {
    const place = _DISCOVER_LABELS[o.cell] || 'lieu remarquable';
    label = o.amount > 1
      ? `Trouver ${o.amount} ${place}${place.endsWith('x') ? '' : 's'}`
      : `Trouver ${place}`;
  } else if (o.type === 'talk') {
    const names = (o.npcIds || []).map((id) => {
      const n = (typeof getNpcById === 'function') ? getNpcById(id) : null;
      return (n && n.name) ? n.name : id;
    });
    label = names.length ? `Consulter ${names.join(', ')}` : `Consulter ${o.amount} personne(s)`;
  } else if (o.type === 'search') {
    label = `Fouiller ${o.amount} recoin${o.amount > 1 ? 's' : ''}`;
  } else if (o.type === 'escape') {
    label = `Re-sceller ${o.amount} Poche${o.amount > 1 ? 's' : ''} du Sceau`;
  } else if (o.type === 'herb') {
    const it = o.itemId && typeof ITEMS !== 'undefined' ? ITEMS.find(x => x.id === o.itemId) : null;
    label = it
      ? `Cueillir ${o.amount}× ${it.name}`
      : `Cueillir ${o.amount} herbe${o.amount > 1 ? 's' : ''} pour Chourave`;
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
    card.innerHTML = `✅ <strong>${q.title}</strong>${_isSignatureQuest(q.id) ? _SIGNATURE_QUEST_BADGE : ''} — ${q.giver}`;
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
      // Découverte d'un jardin : flag global permanent (recompté en continu
      // pour couvrir le cas « jardin déjà révélé avant l'accept »).
      if (step.type === 'discover_garden') {
        step.progress  = (typeof gardenDiscovered !== 'undefined' && gardenDiscovered) ? 1 : 0;
        step.completed = step.progress >= (step.amount || 1);
        continue;
      }
      // Herbes à rapporter : comptées en continu dans la besace (player.herbs).
      // `itemId` optionnel restreint à une herbe précise ; sinon total besace.
      if (step.type === 'herb') {
        step.progress  = _countBesaceHerbs(step.itemId);
        step.completed = step.progress >= step.amount;
        continue;
      }
      if (step.completed) continue;
      if (step.type === 'item') {
        const count = (typeof _countItems === 'function')
          ? _countItems(step.itemId)
          : ((player && player.inventory) ? player.inventory.filter(i => i.id === step.itemId).length : 0);
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

  // Easter egg « La Chasse Sans Tête » : adhésion honoraire cosmétique
  // (jumeau du hook points de Maison ci-dessus). Pose le flag sérialisé ;
  // débloque le badge fiche perso + la ligne célébratoire de Sir Nicolas.
  if (q.id === 'chasse_sans_tete' && typeof headlessHuntMember !== 'undefined') {
    headlessHuntMember = true;
  }

  // Quête Signature de Maison : pose le flag <house>SignatureDone (levier
  // one-shot lu avant le combat final). Le choix Pacte/Défiance (Serpentard)
  // est posé en amont par turnInSlythSignature.
  if (tpl && tpl.houseSignatureQuest && tpl.house) {
    _markSignatureDone(tpl.house);
    // P2 — variante Premium de prestige : le Chef de Maison la met de côté
    // (remise cérémonielle au prochain dialogue, comme la pièce #4 de set).
    if (typeof HOUSE_PREMIUM !== 'undefined' && typeof pendingHouseRewards !== 'undefined') {
      const premId = HOUSE_PREMIUM[tpl.house];
      // Anti-doublon : ne re-queue pas un premium déjà possédé (sac ou
      // équipé) — évite la file + le message « met de côté » trompeur.
      if (premId && !(typeof _ownsItemId === 'function' && _ownsItemId(premId))) {
        pendingHouseRewards.add(premId);
        const pit = ITEMS.find(i => i.id === premId);
        if (pit) addMsg(`${getItemIconHtml(pit, 'ui-icon-md')} Le Chef de votre Maison met de côté une relique de prestige : ${pit.name}. Allez la réclamer.`, 'magic');
      }
    }
  }

  // Retire de l'actif, marque comme rendue. Quêtes répétables : on
  // retient le niveau du joueur à la remise pour calculer le cooldown
  // lors d'une éventuelle ré-offre.
  activeQuests.splice(index, 1);
  completedQuests.add(q.id);
  if (tpl && tpl.repeatable) {
    lastQuestCompletion[q.id] = (player && player.level) || 0;
  }

  // L1 — moment dédié de quête accomplie : timbre distinct + bandeau doré
  // (distinct du level-up ; un éventuel level-up du reward sonnera via checkLevelUp).
  if (AudioSystem.playQuestComplete) AudioSystem.playQuestComplete();
  else AudioSystem.playLevelUp();
  addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête terminée : « ${q.title} » !`, 'good');
  if (window.UX_safe) UX_safe.questFanfare(q.title);
  if (typeof HAPTICS_safe !== 'undefined') HAPTICS_safe.quest(); // N2

  recalculateStats();
  updateUI();
  updateQuestTracker();
  checkLevelUp();
  renderQuestList();
  if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('quest-complete');
}

// Consomme les items requis par les étapes "item" de la quête.
function _consumeQuestItems(q) {
  for (const step of q.objectives) {
    if (step.type === 'donate') {
      player.gold = Math.max(0, player.gold - step.amount);
      continue;
    }
    // Herbes : prélevées dans la besace (player.herbs), pas l'inventaire.
    if (step.type === 'herb') {
      _consumeBesaceHerbs(step.itemId, step.amount);
      continue;
    }
    if (step.type !== 'item') continue;
    if (typeof _consumeItems === 'function') {
      _consumeItems(step.itemId, step.amount); // décrémente les stacks (qty)
    } else {
      let toConsume = step.amount;
      player.inventory = player.inventory.filter(i => {
        if (i.id === step.itemId && toConsume > 0) { toConsume--; return false; }
        return true;
      });
    }
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
      const tpl = getQuestTemplate(q.id);
      if (next) {
        addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Étape suivante : « ${q.title} »`, 'magic');
      } else if (!tpl || !tpl.autoTurnIn) {
        addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
      }
    } else {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » : ${step.progress}/${step.amount}`, '');
    }
  });
  // Remise auto des quêtes autoTurnIn devenues prêtes (ex. descente_finale).
  _autoTurnInReadyQuests();
};

// ── Appelée à la sortie réussie d'une Poche du Sceau ─────────
// Met à jour la progression des quêtes « escape » (Endurer les Poches —
// Gardien de la Boucle). Mirror de checkKillQuests : NE complète PAS la quête
// automatiquement, le joueur retourne voir le donneur. Défensif.
window.checkEscapePocketQuests = function() {
  if (typeof activeQuests === 'undefined' || !Array.isArray(activeQuests)) return;
  activeQuests.forEach((q) => {
    const step = getActiveStep(q);
    if (!step || step.type !== 'escape') return;
    step.progress = (step.progress || 0) + 1;
    if (step.progress >= step.amount) {
      step.completed = true;
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
    } else {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » : ${step.progress}/${step.amount}`, '');
    }
  });
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
};

// ── Appelée après le ramassage d'un feuillet de page ────────
// Met à jour la progression de la quête de pages active (Acte II
// manon_grimoire / Acte III manon_acte3) depuis player.grimoirePages.
window.checkPageQuest = function() {
  const set = (typeof _activePageSet === 'function') ? _activePageSet() : null;
  const qid = set ? set.questId : 'manon_grimoire';
  const q = (typeof activeQuests !== 'undefined')
    ? activeQuests.find(x => x.id === qid) : null;
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

// ── Quête principale « La Descente » (fil d'Ariane — Lot 1 revue 2026-07) ──
// Chaîne d'ids ordonnée ; les templates portent `main` (épinglage tracker)
// et `autoTurnIn` (remise automatique — la remise EST la descente).
const MAIN_QUEST_CHAIN = ['descente_1', 'descente_2', 'descente_3', 'descente_finale'];

// Remet automatiquement les quêtes `autoTurnIn` dont TOUTES les étapes sont
// complètes. Parcours inversé : completeQuest splice activeQuests par index.
function _autoTurnInReadyQuests() {
  for (let i = activeQuests.length - 1; i >= 0; i--) {
    const q = activeQuests[i];
    const tpl = getQuestTemplate(q.id);
    if (!tpl || !tpl.autoTurnIn) continue;
    if (!q.objectives.every(o => o.completed)) continue;
    completeQuest(i);
  }
}
window._autoTurnInReadyQuests = _autoTurnInReadyQuests;

// Fait avancer la chaîne principale : accepte le prochain maillon non remis.
// No-op post-victoire (la boussole d'endgame prend le relais du guidage) et
// si un maillon est déjà actif. Boucle bornée : sur un save avancé, un
// maillon accepté dont l'étage est déjà atteint se complète immédiatement
// (_markFloorSteps + auto-remise) et la chaîne rattrape l'étage courant.
function _ensureMainQuestProgress(floor) {
  if (typeof victoryAchieved !== 'undefined' && victoryAchieved) return;
  for (let guard = 0; guard < MAIN_QUEST_CHAIN.length; guard++) {
    if (activeQuests.some(q => MAIN_QUEST_CHAIN.includes(q.id))) return;
    const next = MAIN_QUEST_CHAIN.find(id => !completedQuests.has(id));
    if (!next) return;
    if (!acceptQuest(next)) return;
    _markFloorSteps(floor);
    _autoTurnInReadyQuests();
  }
}
window._ensureMainQuestProgress = _ensureMainQuestProgress;

// Marque comme accomplies les étapes "floor" dont la cible est atteinte.
// Le rappel « retourne voir le donneur » est supprimé pour les quêtes
// autoTurnIn (aucune remise PNJ — elle suit immédiatement).
function _markFloorSteps(floor) {
  activeQuests.forEach((q) => {
    const tpl = getQuestTemplate(q.id);
    for (const step of q.objectives) {
      if (step.completed)         continue;
      if (step.type   !== 'floor') continue;
      if (floor      >= step.floor) {
        step.progress  = step.amount;
        step.completed = true;
        if (!tpl || !tpl.autoTurnIn) {
          addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
        }
      }
    }
  });
}

// ── Appelée à chaque entrée d'étage (goDeeper / restoration) ──
window.checkFloorQuests = function(floor) {
  _markFloorSteps(floor);
  // Ouvre la Quête Signature de Maison au franchissement de l'étage déclencheur.
  _maybeUnlockSignature(floor);
  // Remise auto (quêtes autoTurnIn) puis avancée de la quête principale.
  _autoTurnInReadyQuests();
  _ensureMainQuestProgress(floor);
};

// ── Appelée depuis handleCellEntry (movement.js) ──────────────────
// Fait progresser les étapes "discover" : atteindre un TYPE de lieu.
//   { type:'discover', cell:'FORGE', amount:1 }
// `cell` est un nom de clé de CELL (FORGE, LIBRARY, FOUNTAIN, ALTAR,
// STELE, GARDEN, REFUGE…) — pas une valeur numérique, pour que les
// templates restent lisibles et survivent à une renumérotation de CELL.
//
// Chaque case n'est comptée QU'UNE FOIS par quête (`_seen`, sérialisé avec
// l'objectif) : sans cela, faire trois pas d'avant en arrière sur la même
// fontaine bouclerait l'objectif. C'est la différence avec les étapes
// "search", où c'est l'ACTION qui compte, pas le lieu.
//
// Comme pour "kill" et "search", la complétion n'est jamais automatique :
// l'objectif devient remettable, le joueur retourne voir le donneur.
window.checkDiscoverQuests = function(cellType, x, y) {
  if (typeof activeQuests === 'undefined' || typeof CELL === 'undefined') return;
  const key = `${x},${y}`;
  activeQuests.forEach((q) => {
    const step = getActiveStep(q);
    if (!step || step.type !== 'discover') return;
    if (CELL[step.cell] !== cellType) return;
    if (!Array.isArray(step._seen)) step._seen = [];
    if (step._seen.indexOf(key) !== -1) return;
    step._seen.push(key);
    step.progress = step._seen.length;
    if (step.progress >= step.amount) {
      step.completed = true;
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
    } else {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » : ${step.progress}/${step.amount} lieux trouvés.`, '');
    }
  });
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
};

// ── Appelée depuis openNpcDialog (npc-dialog.js) ──────────────────
// Fait progresser les étapes "talk" : consulter des PNJ nommés.
//   { type:'talk', npcIds:['hagrid','lupin'], amount:2 }
// Chaque PNJ de la liste ne compte qu'une fois (`_seen`). Un PNJ hors
// liste est ignoré — c'est ce qui distingue « va parler à Hagrid ET
// Lupin » d'un simple compteur de dialogues.
window.checkTalkQuests = function(npcId) {
  if (typeof activeQuests === 'undefined' || !npcId) return;
  activeQuests.forEach((q) => {
    const step = getActiveStep(q);
    if (!step || step.type !== 'talk') return;
    if (!Array.isArray(step.npcIds) || step.npcIds.indexOf(npcId) === -1) return;
    if (!Array.isArray(step._seen)) step._seen = [];
    if (step._seen.indexOf(npcId) !== -1) return;
    step._seen.push(npcId);
    step.progress = step._seen.length;
    if (step.progress >= step.amount) {
      step.completed = true;
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
    } else {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » : ${step.progress}/${step.amount} personnes consultées.`, '');
    }
  });
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
};

// ── Helpers besace d'herboriste (étapes "herb") ──────────────────
// Total d'herbes dans la besace (player.herbs). `herbId` optionnel restreint
// à une herbe précise ; sinon somme toutes les herbes.
function _countBesaceHerbs(herbId) {
  if (!player || !player.herbs) return 0;
  if (herbId) return player.herbs[herbId] || 0;
  let total = 0;
  for (const id of Object.keys(player.herbs)) total += player.herbs[id] || 0;
  return total;
}

// Prélève `amount` herbes de la besace. Avec `herbId` : cette herbe précise.
// Sinon, consomme à travers les herbes disponibles (ordre des clés).
function _consumeBesaceHerbs(herbId, amount) {
  if (!player || !player.herbs) return;
  let left = amount;
  if (herbId) {
    if (typeof _consumeIngredient === 'function') { _consumeIngredient(herbId, amount); return; }
    player.herbs[herbId] = Math.max(0, (player.herbs[herbId] || 0) - amount);
    if (player.herbs[herbId] === 0) delete player.herbs[herbId];
    return;
  }
  for (const id of Object.keys(player.herbs)) {
    if (left <= 0) break;
    const take = Math.min(left, player.herbs[id] || 0);
    player.herbs[id] -= take;
    left -= take;
    if (player.herbs[id] <= 0) delete player.herbs[id];
  }
}

// ── Appelée depuis searchRoom (movement-interactions.js) ──────────
// Incrémente la progression des étapes "search" actives (quête de fouille,
// ex. Marchand Clandestin). Une fouille fraîche compte pour 1 recoin ; la
// quête devient remettable au seuil — comme les étapes "kill", la complétion
// n'est jamais automatique (retour chez le donneur).
window.checkSearchQuests = function() {
  if (typeof activeQuests === 'undefined') return;
  activeQuests.forEach((q) => {
    const step = getActiveStep(q);
    if (!step || step.type !== 'search') return;
    step.progress++;
    if (step.progress >= step.amount) {
      step.completed = true;
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
    } else {
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » : ${step.progress}/${step.amount} recoins fouillés.`, '');
    }
  });
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
};

// ── Appelée à la révélation d'un jardin (_revealGardensNear) ──────
// Marque comme accomplies les étapes "discover_garden" actives.
window.checkGardenQuests = function() {
  if (typeof activeQuests === 'undefined') return;
  activeQuests.forEach((q) => {
    for (const step of q.objectives) {
      if (step.completed)                  continue;
      if (step.type !== 'discover_garden') continue;
      step.progress  = step.amount || 1;
      step.completed = true;
      addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Quête « ${q.title} » prête — retourne voir ${q.giver}.`, 'good');
    }
  });
};


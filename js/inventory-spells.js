// ============================================================
// SORTS — Modales (hors combat / combat) + lancers hors combat
// ============================================================
// Filtres, openSpells / openBattleSpells / openBattleItems,
// SPELL_OOC_HANDLERS, castSpellOutOfCombat. Dépend de recalculateStats
// (inventory-core.js) et de useItem/renderInventory (inventory.js).
// Chargé APRÈS inventory.js.
// ============================================================

// ── Filtre par catégorie de la modale Sorts ──────────────────
// Axe unique = élément (cf. .claude/plans/spell-ux-improvements.md §2).
const SPELL_FILTERS = [
  { id: 'tous',       label: 'Tous',        icon: '' },
  { id: 'feu',        label: 'Feu',         icon: '🔥' },
  { id: 'glace',      label: 'Glace',       icon: '❄️' },
  { id: 'foudre',     label: 'Foudre',      icon: '⚡' },
  { id: 'lumière',    label: 'Lumière',     icon: '✨' },
  { id: 'ténèbres',   label: 'Ténèbres',    icon: '🌑' },
  { id: 'physique',   label: 'Physique',    icon: '⚔️' },
  { id: 'soutien',    label: 'Soutien',     icon: '💚' },
  { id: 'utilitaire', label: 'Utilitaires', icon: '🔧' },
];
let _spellFilter = 'tous';

// ── Liseré + pastille de rang (tier) — Lot P1 ────────────────
// Reflet visuel du rang d'un sort dans la modale Sorts, cohérent avec la
// bordure de rareté d'un item d'inventaire. Consomme le socle P0
// (spellTierTint / SPELL_TIERS de data.js). DÉFENSIF : si le socle n'a pas
// chargé, renvoie une teinte/badge neutres — la modale fonctionne sans.
function _spellTierTintSafe(spell) {
  return (typeof spellTierTint === 'function') ? spellTierTint(spell) : 'var(--gold-dark)';
}
function _spellTierBadgeHtml(spell) {
  if (typeof SPELL_TIERS === 'undefined') return '';
  const def = spell && SPELL_TIERS[spell.tier];
  if (!def) return '';
  return `<span style="display:inline-block;vertical-align:middle;margin-left:6px;padding:0 5px;border-radius:2px;
    font-family:'Cinzel',serif;font-size:8px;letter-spacing:1px;line-height:1.6;
    color:${def.tint};background:#0a0705;border:1px solid ${def.tint}">${def.label.toUpperCase()}</span>`;
}

// Re-render de la modale Sorts après changement de filtre.
function setSpellFilter(id, mode, charIdx) {
  _spellFilter = id;
  if (mode === 'battle') openBattleSpells();
  else                   openSpells(charIdx);
}

// Barre de chips : n'affiche que les catégories présentes chez le perso
// (+ « Tous »). Si le filtre courant n'a plus de sort → retombe sur Tous.
function _spellFilterBarHtml(spellNames, mode, charIdx) {
  const present = new Set();
  spellNames.forEach(n => {
    const sp = SPELLS.find(s => s.name === n);
    if (sp) present.add(spellCategory(sp));
  });
  if (_spellFilter !== 'tous' && !present.has(_spellFilter)) _spellFilter = 'tous';
  const chips = SPELL_FILTERS.filter(f => f.id === 'tous' || present.has(f.id));
  if (chips.length <= 2) return '';   // 1 seule catégorie → filtre inutile
  return `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">` +
    chips.map(f => {
      const on = _spellFilter === f.id;
      return `<div onclick="setSpellFilter('${f.id}','${mode}',${charIdx})"
        style="cursor:pointer;padding:3px 7px;border-radius:2px;font-family:'Cinzel',serif;font-size:9px;letter-spacing:1px;
        background:${on ? '#2a1a08' : '#0a0705'};border:1px solid ${on ? 'var(--gold-dark)' : '#2a1a08'};color:${on ? 'var(--gold-light)' : '#6a5030'}">
        ${f.icon} ${f.label}</div>`;
    }).join('') + `</div>`;
}

// Hors combat : liste les sorts du personnage sélectionné (onglets)
function openSpells(charIdx = 0) {
  // En mode solo, on ne montre que Harry (partySize=1).
  if (charIdx >= partySize) charIdx = 0;
  const c    = party[charIdx];
  const list = document.getElementById('spell-list');

  // Onglets Harry / Hermione (Hermione masquée en solo).
  const tabs = party.slice(0, partySize).map((p, i) =>
    `<div onclick="openSpells(${i})" style="cursor:pointer;padding:4px 8px;border-radius:2px;font-family:'Cinzel',serif;font-size:10px;letter-spacing:1px;
     background:${i === charIdx ? '#2a1a08' : '#0a0705'};border:1px solid ${i === charIdx ? 'var(--gold-dark)' : '#2a1a08'};color:${i === charIdx ? 'var(--gold-light)' : '#6a5030'}">
      ${p.icon} ${p.name.split(' ')[0]}
    </div>`
  ).join('');

  list.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:10px">${tabs}</div>`
                 + _spellFilterBarHtml(c.spells, 'spell', charIdx);

  for (const sName of c.spells) {
    const spell = SPELLS.find(s => s.name === sName);
    if (!spell) continue;
    if (_spellFilter !== 'tous' && spellCategory(spell) !== _spellFilter) continue;
    // Synergie P1 : forme effective au point d'affichage (badge 🔗 si active).
    const eff = (typeof resolveSpellForm === 'function')
                ? (resolveSpellForm(sName, c) || spell) : spell;
    const synActive = eff !== spell;
    const div = document.createElement('div');
    div.className = 'spell-item';
    div.style.borderLeft = '3px solid ' + _spellTierTintSafe(eff);
    // Sorts utilisables hors combat (teleport + heal pour V1). Les autres
    // affichent un tag "Combat uniquement" pour ne pas tromper le joueur.
    const oocCost   = spell.outOfCombatCost || null;
    const isOoc     = isOutOfCombatSpell(spell);
    // Cooldown OOC selon le type de sort.
    let cdRemaining = 0, cdUnit = '';
    if (spell.effect === 'teleport' && typeof portusOocCooldown === 'number') {
      cdRemaining = portusOocCooldown;
      cdUnit = `transition${cdRemaining > 1 ? 's' : ''} d'étage`;
    } else if (spell.effect === 'heal' && typeof healSpellCooldown === 'number') {
      cdRemaining = healSpellCooldown;
      cdUnit = `pas`;
    }
    // Cheminette Inter-Mondes : verrouillée en mode Ironman
    // (parallel-worlds.md §2.1 — la voie solitaire ne se partage pas).
    const ironmanLock = spell.effect === 'portal'
      && typeof ironmanMode !== 'undefined' && ironmanMode;
    // Phase G §6.8 — après une défaite astrale, cooldown 5 min pour éviter
    // les retentatives en boucle.
    const exileMs = (spell.effect === 'portal'
      && typeof astralExileCooldownUntil === 'number')
      ? Math.max(0, astralExileCooldownUntil - Date.now()) : 0;
    const exileLock    = exileMs > 0;
    const exileSec     = Math.ceil(exileMs / 1000);
    const exileMin     = Math.floor(exileSec / 60);
    const exileLabel   = exileMin > 0 ? `${exileMin} min ${exileSec % 60}s` : `${exileSec}s`;
    const canCastOoc = isOoc && cdRemaining === 0
      && c.sp >= (oocCost || spell.cost) && !ironmanLock && !exileLock;
    const costLabel = oocCost
      ? `${oocCost} PM <span style="color:#6a5030;font-size:9px">(hors combat)</span>`
      : `${spell.cost} PM`;
    let hint;
    if (!isOoc) {
      hint = '<span style="font-size:9px;color:#6a5030">Combat uniquement</span>';
    } else if (ironmanLock) {
      hint = '<span style="font-size:9px;color:#6a5030">⚜ Voie solitaire — l\'Ironman se joue seul</span>';
    } else if (exileLock) {
      hint = `<span style="font-size:9px;color:#a04020">💫 Ton lien astral se reforme — ${exileLabel}</span>`;
    } else if (cdRemaining > 0) {
      hint = `<span style="font-size:9px;color:#a04020">⏳ Se recharge — ${cdRemaining} ${cdUnit}</span>`;
    } else if (!canCastOoc) {
      hint = '<span style="font-size:9px;color:#a04020">PM insuffisants</span>';
    } else {
      hint = '<span style="font-size:9px;color:#6a8030">▶ cliquer pour lancer</span>';
    }
    const preview     = spellEffectPreview(eff, c);
    const previewHtml = preview
      ? `<div style="font-size:9px;color:var(--gold-dark);margin-top:2px">${preview}</div>`
      : '';
    const synBadge = synActive
      ? ' <span style="font-size:8px;color:#d3a625;letter-spacing:1px" title="Synergie d\'artefact active">🔗 SYNERGIE</span>'
      : '';
    div.innerHTML = `
      <div class="spell-icon">${getSpellIconHtml(eff, 'ui-icon-xl')}</div>
      <div class="spell-info">
        <div class="spell-name">${eff.name}${_spellTierBadgeHtml(eff)}${synBadge}</div>
        <div class="spell-desc">${eff.desc}</div>
        ${previewHtml}
        <div style="margin-top:3px">${hint}</div>
      </div>
      <div class="spell-cost">${costLabel}</div>`;
    if (canCastOoc) {
      div.style.cursor = 'pointer';
      div.tabIndex = 0; // sort lançable atteignable au clavier
      div.onclick = () => castSpellOutOfCombat(spell.name, charIdx);
    } else if (isOoc) {
      div.style.opacity = '0.6';
    } else {
      div.style.opacity = '0.85';
    }
    list.appendChild(div);
  }
  document.getElementById('spell-modal').style.display = 'flex';
}

// Sorts utilisables hors combat. Inscrits via SPELL_OOC_HANDLERS pour
// rester extensible. V1 : Portus (teleport) + sorts de soin (heal).
function isOutOfCombatSpell(spell) {
  if (!spell) return false;
  return spell.effect === 'teleport'      || spell.effect === 'heal'
      || spell.effect === 'reveal'        || spell.effect === 'portal'
      || spell.effect === 'blood_seal'    || spell.effect === 'voyager_seal'
      || spell.effect === 'outremonde_memory' || spell.effect === 'pilgrim_mark'
      || spell.effect === 'astral_recall'
      // Lot P2 — sorts environnementaux / rituels hors combat.
      || spell.effect === 'reveal_floor'  || spell.effect === 'recharge_fountain'
      || spell.effect === 'purge_room'    || spell.effect === 'stabilize_rune';
}

// Cooldown partagé entre tous les sorts de soin OOC (cf. .claude/plans/
// teleportation-spell.md §Itération 3).
const HEAL_OOC_CD_STEPS = 3;

// Retourne l'allié vivant avec le ratio hp/hpMax le plus bas, ou null si
// personne n'est blessé (tous au max ou tous KO). Le caster est inclus.
function _pickMostWoundedAlly() {
  let best = null, bestRatio = 1.0;
  for (const c of party.slice(0, partySize)) {
    if (!c || c.hp <= 0) continue;
    if (c.hp >= c.hpMax) continue;
    const ratio = c.hp / c.hpMax;
    if (best === null || ratio < bestRatio) {
      best = c; bestRatio = ratio;
    }
  }
  return best;
}

const SPELL_OOC_HANDLERS = {
  teleport: function (spell, charIdx) {
    if (typeof openOutOfCombatTeleport === 'function') {
      closeModal('spell-modal');
      openOutOfCombatTeleport(charIdx);
    }
  },
  // Soin OOC : cible auto = perso vivant le plus en bas de PV.
  // Coût identique au combat. Cooldown HEAL_OOC_CD_STEPS pas, partagé.
  heal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) {
      addMsg('Personne ne peut canaliser le sort.', 'bad');
      return;
    }
    if (typeof healSpellCooldown === 'number' && healSpellCooldown > 0) {
      addMsg(`Sort de soin en récupération — encore ${healSpellCooldown} pas.`, 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad');
      return;
    }
    const target = _pickMostWoundedAlly();
    if (!target) {
      addMsg('Le groupe est déjà au mieux — pas besoin de soin.', '');
      return;
    }
    caster.sp -= spell.cost;
    const before = target.hp;
    target.hp = Math.min(target.hpMax, target.hp + spell.power);
    const healed = target.hp - before;
    if (typeof healSpellCooldown === 'number') healSpellCooldown = HEAL_OOC_CD_STEPS;
    AudioSystem.playSpellCast(spell.name);
    AudioSystem.speakSpell(spell.name);
    addMsg(`${getSpellIconHtml(spell, 'ui-icon-md')} ${caster.name} → ${target.name} : ${spell.name} +${healed} PV.`, 'good');
    UX_safe.floatDmg('ally', healed, 'heal');
    closeModal('spell-modal');
    updateUI();
  },
  // Revelio hors combat : dissipe le brouillard sur un carré de rayon 2
  // autour du joueur (cf. manon-grimoire-pages.md §4a). La révélation des
  // pages dissimulées sera greffée ici en phase 3.
  reveal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) {
      addMsg('Personne ne peut canaliser le sort.', 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad');
      return;
    }
    caster.sp -= spell.cost;
    // S'assure que la page de l'étage est posée avant de tenter de la révéler.
    if (typeof _ensurePagePlacement === 'function') _ensurePagePlacement(currentFloor);
    let cleared = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = playerX + dx, y = playerY + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        if (visited[y] && !visited[y][x]) { visited[y][x] = true; cleared++; }
      }
    }
    // Une page non collectée dans la zone éclaircie est dévoilée (minimap).
    let pageRevealed = false;
    const pagePos = (typeof pagePlacements !== 'undefined')
      ? pagePlacements.get(currentFloor) : null;
    if (pagePos && !revealedPages.has(currentFloor)) {
      const [px, py] = pagePos.split(',').map(Number);
      if (Math.abs(px - playerX) <= 2 && Math.abs(py - playerY) <= 2) {
        revealedPages.add(currentFloor);
        pageRevealed = true;
      }
    }
    // Jardin d'herbes caché (Potions P6.b3) : Revelio dévoile aussi un
    // jardin dans le rayon 5×5 (le helper pose son propre message).
    const gardensRevealed = (typeof _revealGardensNear === 'function')
      ? _revealGardensNear(playerX, playerY, 2) : 0;
    AudioSystem.playSpellCast(spell.name);
    AudioSystem.speakSpell(spell.name);
    if (gardensRevealed > 0) {
      // _revealGardensNear a déjà annoncé la découverte — rien à ajouter.
    } else if (pageRevealed) {
      const _set = (typeof _activePageSet === 'function') ? _activePageSet() : null;
      const _what = (_set && _set.questId === 'manon_acte3')
        ? 'un feuillet clair scintille' : 'une page du grimoire scintille';
      addMsg(`${getSpellIconHtml(spell, 'ui-icon-md')} ${caster.name} lance ${spell.name} — ${_what} sur la carte !`, 'good');
    } else {
      addMsg(cleared > 0
        ? `🔎 ${caster.name} lance ${spell.name} — le brouillard se dissipe alentour.`
        : `🔎 ${caster.name} lance ${spell.name} — rien de neuf à dévoiler ici.`,
        cleared > 0 ? 'good' : '');
    }
    closeModal('spell-modal');
    if (typeof renderMinimap === 'function') renderMinimap();
    updateUI();
  },
  // Cheminette Inter-Mondes — Phase B : animation locale 2,8 s
  // (incantation) puis ouverture de la modale des destinations
  // (portal-matchmaking.js). L'animation de voyage est rejouée à
  // l'acceptation par _onVisitorAccepted (parallel-worlds.md §10
  // Phase B). Refusé en Ironman (double-gate avec openSpells).
  portal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) {
      addMsg('Personne ne peut tracer le portail.', 'bad');
      return;
    }
    // Bascule maître (S2.6) : si le chemin Mondes Parallèles est désactivé,
    // le sort grésille sans effet plutôt que d'ouvrir le matchmaking.
    if (typeof parallelWorldsEnabled === 'function' && !parallelWorldsEnabled()) {
      addMsg('Les Mondes Parallèles sont scellés pour l\'instant — la cheminée reste froide.', 'bad');
      return;
    }
    if (typeof ironmanMode !== 'undefined' && ironmanMode) {
      addMsg("Le mode Ironman se joue seul — la solitude est la promesse de la légende.", 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad');
      return;
    }
    caster.sp -= spell.cost;
    AudioSystem.playSpellCast(spell.name);
    AudioSystem.speakSpell(spell.name);
    addMsg(`${getSpellIconHtml(spell, 'ui-icon-md')} ${caster.name} entonne ${spell.name} — la cheminée s'embrase.`, 'magic');
    closeModal('spell-modal');
    updateUI();
    const openTargets = () => {
      if (typeof openPortalTargetModal === 'function') {
        openPortalTargetModal();
      } else {
        addMsg("Le registre des sorciers reste muet — module matchmaking absent.", 'bad');
      }
      if (typeof updateUI === 'function') updateUI();
    };
    if (typeof playPortalOpen === 'function') {
      playPortalOpen({ caster }, openTargets);
    } else {
      openTargets();
    }
  },
  // Mondes parallèles Phase H §6.9 — Verrou de Sang. Lancé en visite,
  // hors combat. Coût 5 PM + 1 Essence d'Outremonde. Pose un Verrou sur
  // la cellule courante (FLOOR uniquement, libre). Ouvre la modale de
  // sélection du monstre à sceller (parmi ceux éligibles à l'étage du
  // host).
  blood_seal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) {
      addMsg('Personne ne peut tracer le Verrou.', 'bad');
      return;
    }
    // Gating : uniquement en visite, hors combat astral.
    if (typeof visitSession === 'undefined' || !visitSession
        || visitSession.role !== 'visitor') {
      addMsg("Tu ne peux poser un Verrou que dans le monde d'un autre sorcier.", 'bad');
      return;
    }
    if (typeof inAstralCombat !== 'undefined' && inAstralCombat) {
      addMsg("Pas pendant un combat astral.", 'bad');
      return;
    }
    // Anti-spam : plafond 10 Verrous en attente par visiteur (§6.9).
    if (Array.isArray(outremondePendingSeals) && outremondePendingSeals.length >= 10) {
      addMsg("Trop de Verrous en attente — attends qu'ils se résolvent.", 'bad');
      return;
    }
    // Coût : 5 PM + 1 Essence.
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie (${spell.cost} PM).`, 'bad');
      return;
    }
    if (typeof outremondeEssence !== 'number' || outremondeEssence < 1) {
      addMsg("Il te faut au moins 1 Essence d'Outremonde — gagne-en en défiant des échos.", 'bad');
      return;
    }
    // La cellule doit être un sol libre (pas escalier, fontaine, etc.).
    if (typeof dungeon !== 'undefined' && dungeon[playerY] && dungeon[playerY][playerX] !== CELL.FLOOR) {
      addMsg("Le Verrou ne s'enracine que sur un sol nu.", 'bad');
      return;
    }
    closeModal('spell-modal');
    if (typeof openBloodSealTargetModal === 'function') {
      openBloodSealTargetModal(caster);
    } else {
      // Repli silencieux si la modale n'est pas chargée.
      addMsg("Le rituel ne se forme pas — module absent.", 'bad');
    }
  },
  // ── V1c.1 — Sorts exclusifs cross-plan (achetés à l'Atelier) ────
  // Sceau du Voyageur : sort passif. Son seul effet est sa présence
  // dans player.spells — consommé par _finishAstralCombat(false) qui
  // saute le cooldown 5 min. Le lancement OOC ne fait que rappeler
  // l'ancrage.
  voyager_seal: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster) return;
    addMsg(`${getSpellIconHtml(spell, 'ui-icon-md')} ${caster.name} renforce le Sceau du Voyageur — ton ancrage astral est intact.`, 'magic');
    closeModal('spell-modal');
  },
  // Mémoire d'Outremonde : sort passif. Consommé à l'entrée d'une
  // visite (visit-channel.js) — restaure 100 % PV/PM puis pose
  // visitSession._memoryUsed. Le lancement OOC hors visite est un
  // no-op informatif.
  outremonde_memory: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster) return;
    addMsg(`${getSpellIconHtml(spell, 'ui-icon-md')} ${caster.name} médite — la Mémoire s'éveillera à ta prochaine visite.`, 'magic');
    closeModal('spell-modal');
  },
  // Marque du Pèlerin : pose un marqueur sur la cellule courante en
  // visite. Persiste dans outremondeMetrics.pilgrimMark jusqu'au
  // prochain Rappel Astral ou écrasement.
  pilgrim_mark: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster) return;
    if (typeof visitSession === 'undefined' || !visitSession || visitSession.role !== 'visitor') {
      addMsg("La Marque ne tient que dans le plan d'un autre sorcier.", 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie (${spell.cost} PM).`, 'bad');
      return;
    }
    caster.sp -= spell.cost;
    outremondeMetrics.pilgrimMark = {
      floor: currentFloor,
      x: playerX,
      y: playerY,
      hostId: visitSession.hostId
    };
    addMsg(`${getSpellIconHtml(spell, 'ui-icon-md')} ${caster.name} grave une Marque du Pèlerin — ${playerX},${playerY}.`, 'magic');
    closeModal('spell-modal');
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof updateUI === 'function') updateUI();
  },
  // Rappel Astral : téléporte le visiteur à la dernière Marque posée
  // (même hôte, même étage). Refuse si pas de Marque ou hôte différent
  // ou étage différent.
  astral_recall: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster) return;
    if (typeof visitSession === 'undefined' || !visitSession || visitSession.role !== 'visitor') {
      addMsg("Le Rappel n'opère que pendant une visite.", 'bad');
      return;
    }
    const mark = outremondeMetrics && outremondeMetrics.pilgrimMark;
    if (!mark) {
      addMsg("Aucune Marque du Pèlerin n'a été posée.", 'bad');
      return;
    }
    if (mark.hostId !== visitSession.hostId || mark.floor !== currentFloor) {
      addMsg("La Marque est dans un autre plan — impossible de la rappeler.", 'bad');
      return;
    }
    if (caster.sp < spell.cost) {
      addMsg(`Pas assez de magie (${spell.cost} PM).`, 'bad');
      return;
    }
    caster.sp -= spell.cost;
    playerX = mark.x; playerY = mark.y;
    addMsg(`${getSpellIconHtml(spell, 'ui-icon-md')} ${caster.name} se replie sur la Marque — ${mark.x},${mark.y}.`, 'magic');
    closeModal('spell-modal');
    if (typeof drawDungeon   === 'function') drawDungeon();
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof updateUI === 'function') updateUI();
  },
  // ── Lot P2 — sorts d'Éclats / environnementaux (hors combat) ─────
  // Resonare (rituel d'Éclats) : révèle tout l'étage (brouillard) + dévoile la
  // page cachée. Coût réduit de 2 PM par Éclat possédé (eclatProgress réutilisé),
  // plancher 2 PM. Nécessite ≥ 1 Éclat.
  reveal_floor: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) { addMsg('Personne ne peut canaliser le sort.', 'bad'); return; }
    const eclats = (typeof eclatProgress === 'function') ? eclatProgress() : 0;
    if (eclats < 1) { addMsg("Resonare exige au moins 1 Éclat de la Clé de Voûte.", 'bad'); return; }
    const cost = Math.max(2, spell.cost - 2 * eclats);
    if (caster.sp < cost) { addMsg(`Pas assez de magie pour ${spell.name} (${cost} PM).`, 'bad'); return; }
    caster.sp -= cost;
    let cleared = 0;
    if (typeof visited !== 'undefined' && Array.isArray(visited)) {
      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          if (visited[y] && !visited[y][x]) { visited[y][x] = true; cleared++; }
        }
      }
    }
    if (typeof _ensurePagePlacement === 'function') _ensurePagePlacement(currentFloor);
    if (typeof pagePlacements !== 'undefined' && pagePlacements.get(currentFloor)
        && typeof revealedPages !== 'undefined' && !revealedPages.has(currentFloor)) {
      revealedPages.add(currentFloor);
    }
    if (typeof AudioSystem !== 'undefined') AudioSystem.playSpellCast(spell.name);
    addMsg(`🔹 ${caster.name} : ${spell.name} — l'étage entier se dévoile (${cleared} cases, pages comprises).`, 'good');
    closeModal('spell-modal');
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof drawDungeon   === 'function') drawDungeon();
    updateUI();
  },
  // Fontis : recharge une Fontaine tarie (le joueur doit s'y tenir).
  recharge_fountain: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) { addMsg('Personne ne peut canaliser le sort.', 'bad'); return; }
    const onFountain = (typeof dungeon !== 'undefined' && dungeon[playerY]
      && dungeon[playerY][playerX] === CELL.FOUNTAIN);
    if (!onFountain) { addMsg("Fontis ne s'invoque que sur une Fontaine.", 'bad'); return; }
    const key = `${playerX},${playerY}`;
    if (typeof usedFountains === 'undefined' || !usedFountains.has(key)) {
      addMsg("Cette Fontaine coule déjà — rien à recharger.", ''); return;
    }
    if (caster.sp < spell.cost) { addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad'); return; }
    caster.sp -= spell.cost;
    usedFountains.delete(key);
    if (typeof AudioSystem !== 'undefined') AudioSystem.playSpellCast(spell.name);
    addMsg(`💧 ${caster.name} : ${spell.name} — la Fontaine tarie jaillit de nouveau.`, 'good');
    closeModal('spell-modal');
    if (typeof drawDungeon   === 'function') drawDungeon();
    if (typeof renderMinimap === 'function') renderMinimap();
    updateUI();
  },
  // Purgo : dissipe la corruption d'un étage hostile (hante = pullulement,
  // pieges = sol piégé). Sans effet si l'étage n'est pas corrompu.
  purge_room: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) { addMsg('Personne ne peut canaliser le sort.', 'bad'); return; }
    const ev = (typeof currentFloorEvent !== 'undefined') ? currentFloorEvent : null;
    const HOSTILE = ['hante', 'pieges'];
    if (!ev || HOSTILE.indexOf(ev) === -1) { addMsg("Rien de corrompu à dissiper sur cet étage.", ''); return; }
    if (caster.sp < spell.cost) { addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad'); return; }
    caster.sp -= spell.cost;
    currentFloorEvent = null;
    if (typeof AudioSystem !== 'undefined') AudioSystem.playSpellCast(spell.name);
    addMsg(`✨ ${caster.name} : ${spell.name} — la corruption de l'étage se dissipe.`, 'good');
    closeModal('spell-modal');
    if (typeof DFX_safe !== 'undefined') DFX_safe.setFloorAmbience();
    if (typeof drawDungeon === 'function') drawDungeon();
    updateUI();
  },
  // Aedificium : stabilise d'un coup un sceau runique des Ruines (allume toutes
  // les dalles, ouvre le passage scellé). Sans effet hors d'un puzzle runique actif.
  stabilize_rune: function (spell, charIdx) {
    const caster = party[charIdx] || party[0];
    if (!caster || caster.hp <= 0) { addMsg('Personne ne peut canaliser le sort.', 'bad'); return; }
    if (typeof runePuzzle === 'undefined' || !runePuzzle || runePuzzle.solved) {
      addMsg("Aucun sceau runique instable à stabiliser ici.", ''); return;
    }
    if (caster.sp < spell.cost) { addMsg(`Pas assez de magie pour ${spell.name} (${spell.cost} PM).`, 'bad'); return; }
    caster.sp -= spell.cost;
    if (Array.isArray(runePuzzle.runes) && typeof litRunes !== 'undefined') {
      runePuzzle.runes.forEach(k => litRunes.add(k));
    }
    runePuzzle.solved = true;
    if (runePuzzle.barrier && typeof dungeon !== 'undefined') {
      const [bx, by] = runePuzzle.barrier.split(',').map(Number);
      if (dungeon[by] && dungeon[by][bx] === CELL.WALL) dungeon[by][bx] = CELL.FLOOR;
    }
    if (typeof AudioSystem !== 'undefined') AudioSystem.playSpellCast(spell.name);
    addMsg(`🏛️ ${caster.name} : ${spell.name} — le sceau runique se stabilise, un passage s'ouvre.`, 'good');
    closeModal('spell-modal');
    if (typeof renderMinimap === 'function') renderMinimap();
    if (typeof drawDungeon   === 'function') drawDungeon();
    updateUI();
  }
};

function castSpellOutOfCombat(spellName, charIdx) {
  const spell = SPELLS.find(s => s.name === spellName);
  if (!spell) return;
  const handler = SPELL_OOC_HANDLERS[spell.effect];
  if (!handler) {
    addMsg(`${spellName} ne peut être lancé qu'en combat.`, 'bad');
    return;
  }
  handler(spell, charIdx);
}

// En combat : liste les sorts du personnage actif avec possibilité de cibler
function openBattleSpells() {
  const c    = party[currentBattleChar];
  const list = document.getElementById('spell-list');
  list.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--gold);text-align:center;margin-bottom:8px;letter-spacing:2px">
      ${c.icon} SORTS DE ${c.name.toUpperCase().split(' ')[0]}
    </div>` + _spellFilterBarHtml(c.spells, 'battle', 0);

  for (const sName of c.spells) {
    const spell    = SPELLS.find(s => s.name === sName);
    if (!spell) continue;
    if (_spellFilter !== 'tous' && spellCategory(spell) !== _spellFilter) continue;
    // Synergie P1 : forme effective au point d'AFFICHAGE (évolution / surcharge
    // signature). eff !== spell ⇒ une synergie est active (badge 🔗). Le clic
    // passe toujours le NOM DE BASE à castSpellInBattle, qui re-résout.
    const eff = (typeof resolveSpellForm === 'function')
                ? (resolveSpellForm(sName, c) || spell) : spell;
    const synActive = eff !== spell;
    // Portus en combat : bloqué si déjà utilisé ce combat OU si cooldown actif.
    const fightCd = (spell.effect === 'teleport' && typeof portusFightCooldown === 'number')
                    ? portusFightCooldown : 0;
    const alreadyUsed = spell.effect === 'teleport'
                       && typeof _teleportUsedThisFight !== 'undefined'
                       && _teleportUsedThisFight;
    const cdBlocked = fightCd > 0 || alreadyUsed;
    // Coût effectif pour CE lanceur : Legilimens enchérit à chaque relance,
    // l'Apothéose Serdaigle et les artefacts (spCostReduction) le réduisent.
    const effCost  = (typeof _spellSpCost === 'function')
                     ? _spellSpCost(eff, c) : eff.cost;
    const canCast  = c.sp >= effCost && !spell.locked && !cdBlocked;
    const div      = document.createElement('div');
    div.className  = 'spell-item';
    div.style.opacity = canCast ? '1' : '0.5';
    div.style.borderLeft = '3px solid ' + _spellTierTintSafe(eff);
    const cdHint = (spell.effect === 'teleport' && cdBlocked)
      ? `<div style="font-size:9px;color:#a04020;margin-top:2px">⏳ ${alreadyUsed ? 'déjà utilisé ce combat' : `recharge ${fightCd} combat${fightCd > 1 ? 's' : ''}`}</div>`
      : '';
    const synBadge = synActive
      ? ' <span style="font-size:8px;color:#d3a625;letter-spacing:1px" title="Synergie d\'artefact active">🔗 SYNERGIE</span>'
      : '';
    const preview     = spellEffectPreview(eff, c);
    const previewHtml = preview
      ? `<div style="font-size:9px;color:var(--gold-dark);margin-top:2px">${preview}</div>`
      : '';
    div.innerHTML  = `
      <div class="spell-icon">${getSpellIconHtml(eff, 'ui-icon-xl')}</div>
      <div class="spell-info">
        <div class="spell-name">${eff.name}${_spellTierBadgeHtml(eff)}${synBadge}</div>
        <div class="spell-desc">${eff.desc}</div>
        ${previewHtml}
        ${cdHint}
      </div>
      <div class="spell-cost">${effCost} PM</div>`;

    if (canCast) {
      div.tabIndex = 0; // sort lançable atteignable au clavier
      div.onclick = () => {
        closeModal('spell-modal');
        // Portus gère son propre flow (overlay A/B) — court-circuite la
        // sélection de cible standard.
        if (spell.effect === 'teleport') {
          castSpellInBattle(spell.name, -1);
          return;
        }
        const needsTarget = ['stun','burn','instant','disarm','imperius','aoe_cleave','reveal','eclat_bolt','summon_ally'].includes(eff.effect);
        if (needsTarget && livingEnemies().length > 1) {
          pendingSpell = spell.name;
          showTargetSelection('spell_dmg');
        } else {
          castSpellInBattle(spell.name, getFirstLivingEnemy());
        }
      };
    }
    list.appendChild(div);
  }
  document.getElementById('spell-modal').style.display = 'flex';
}

function openBattleItems() {
  const consumables = player.inventory.filter(i => i.type === 'consumable');
  if (consumables.length === 0) { addMsg("Aucun objet utilisable !", ''); return; }
  renderInventory(true);
  // Pas de besace en combat (herbes non utilisables) : onglets masqués.
  _applyInvTab('sac', false);
  document.getElementById('inventory-modal').style.display = 'flex';
}

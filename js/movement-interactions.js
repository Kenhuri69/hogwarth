// ============================================================
// DÉPLACEMENT — Interactions de cellule
// ============================================================
// Coffres (openChest + puzzle), fouille (searchRoom + cooldown + pièges),
// pièges de donjon, runes/stèle (_activateRune, answerSteleRiddle), autel,
// porte, fontaine, repos. Chargé APRÈS movement.js.
// ============================================================
// ── Coffre-récompense d'un puzzle (rune ou stèle) — Phase 4.1 ──
// Rang de rareté, pour comparer deux pièces (best-of-N).
const _RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

// Retourne 'rune' / 'stele' si (x,y) est la case du coffre-récompense
// d'un puzzle de l'étage courant, sinon null.
function _puzzleRewardAt(x, y) {
  const key = `${x},${y}`;
  if (typeof runePuzzle !== 'undefined' && runePuzzle
      && runePuzzle.rewardCell === key) return 'rune';
  if (typeof runeStele !== 'undefined' && runeStele
      && runeStele.rewardCell === key) return 'stele';
  return null;
}

// Butin dédié d'un coffre de puzzle : or généreux (croissant avec
// l'étage) + équipement « best-of-N » biaisé vers la qualité. `doubled`
// (événement « Étage runique ») double l'or et ajoute une 2ᵉ pièce.
// Voir dungeon-enrichment-v2.md §4.1.
function _openPuzzleChest(doubled) {
  const floor = currentFloor || 1;
  let gold = Math.floor(Math.random() * 25 + 35) * floor;
  if (doubled) gold *= 2;
  gold = _applyGoldMult(gold);
  player.gold += gold;
  addMsg(`+${gold} Gallions (coffre runique)`, 'good');

  const rolls = doubled ? 5 : 3;
  const picks = doubled ? 2 : 1;
  for (let p = 0; p < picks; p++) {
    let best = null;
    for (let i = 0; i < rolls; i++) {
      const it = (typeof pickChestEquipment === 'function')
        ? pickChestEquipment(floor) : null;
      if (!it) continue;
      if (!best || (_RARITY_RANK[it.rarity || 'common'] || 0)
                 > (_RARITY_RANK[best.rarity || 'common'] || 0)) best = it;
    }
    if (best && tryAddItem(best, { silent: true })) {
      addMsg(`Obtenu : ${getItemIconHtml(best, 'ui-icon-sm')} ${best.name}`, 'good');
    }
  }
  setNarrative(doubled
    ? "Le coffre scellé déborde de richesses — l'étage runique a redoublé sa récompense !"
    : "Le coffre scellé récompense votre persévérance d'un trésor de choix.");
  updateUI();
  renderMinimap();
}

function openChest() {
  // Coffre-récompense d'un puzzle : butin dédié (Phase 4.1). Détecté
  // avant de consommer la case (le check porte sur la position courante).
  const puzzleReward = _puzzleRewardAt(playerX, playerY);
  dungeon[playerY][playerX] = CELL.FLOOR;
  document.getElementById('btn-interact').style.display = 'none';
  AudioSystem.playChestOpen();
  if (typeof DFX_safe !== 'undefined') DFX_safe.burst('explore-overlay', 'gold'); // VFX d'ouverture (E3)
  if (puzzleReward) {
    _openPuzzleChest(currentFloorEvent === 'runique');
    return;
  }

  // Livres de sorts disponibles selon l'étage courant
  const booksAvailable = ITEMS.filter(i => {
    if (i.type !== 'spellbook') return false;
    if (i.id === 'livre_sortileges')  return currentFloor >= 2;
    if (i.id === 'livre_soin')        return currentFloor >= 3;
    if (i.id === 'livre_ferula')      return currentFloor >= 4 && currentFloor <= 6;
    if (i.id === 'book_monsters')     return currentFloor >= 3;
    if (i.id === 'livre_lumos_solem') return currentFloor >= 5;
    if (i.id === 'livre_prince')      return currentFloor >= 6; // rare et puissant
    // Grimoires de zone (AoE) — aussi achetables en boutique ; gating
    // coffre aligné sur leur minFloor de SHOP_CATALOG.
    if (i.id === 'livre_glacius_tempete') return currentFloor >= 6;
    if (i.id === 'livre_diffindo_maxima') return currentFloor >= 6;
    if (i.id === 'livre_vulnera')         return currentFloor >= 6;
    if (i.id === 'livre_fulgur_catena')   return currentFloor >= 7;
    // livre_lux_aeterna : exclu du butin de coffre — exclusif à la quête
    // dumbledore_lumiere (cf. .claude/plans/dumbledore-lux-aeterna.md).
    if (i.id === 'livre_nox_vorax')       return currentFloor >= 9;
    return false;
  });

  // D5 — Fortune (volet LCK) : or majoré × (1 + F×0.5), roll d'objet rare
  // (Éclat de Vitalité ≥ ét.3) élargi de +F (borné). Cf. luck-fortune.md §2.4.
  const F        = (typeof partyFortune === 'function') ? partyFortune() : 0;
  const goldFort = 1 + F * 0.5;

  const roll = Math.random();
  // 38% or | 30% consommable | 22% équipement | 10% livre (si dispo)
  const hasBook = booksAvailable.length > 0;

  if (roll < 0.38) {
    // Or
    const gold = _applyGoldMult(Math.floor(Math.random() * 30 + 10) * currentFloor * goldFort);
    player.gold += gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();

  } else if (roll < 0.68) {
    // Consommable — à partir de l'étage 3, 25 % du temps un Éclat de Vitalité
    // (ressource d'upgrade-craft des potions, P4) plutôt qu'un consommable.
    let item;
    if ((currentFloor || 1) >= 3 && Math.random() < Math.min(0.9, 0.25 + F)) {
      item = ITEMS.find(i => i.id === 'eclat_vitalite');
    }
    if (!item) {
      const possItems = ITEMS.filter(i => i.type === 'consumable');
      item = possItems[Math.floor(Math.random() * possItems.length)];
    }
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name}`, 'good');
    }

  } else if (roll < 0.90 || !hasBook) {
    // Équipement — pondéré par rareté et filtré par étage. Voir
    // pickChestEquipment() dans data.js et plan §3.5.
    const item = (typeof pickChestEquipment === 'function')
      ? pickChestEquipment(currentFloor || 1)
      : null;
    if (item && tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Obtenu : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name}`, 'good');
    } else if (!item) {
      // Aucun équipement éligible pour cet étage — repli sur or
      const gold = _applyGoldMult(Math.floor(Math.random() * 30 + 10) * (currentFloor || 1) * goldFort);
      player.gold += gold;
      addMsg(`Coffre vide… mais +${gold} Gallions cachés au fond`, 'good');
      updateUI();
    }

  } else {
    // Livre de sorts — drop rare et précieux
    const item = booksAvailable[Math.floor(Math.random() * booksAvailable.length)];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(`Un vieux grimoire poussiéreux est là, dans le coffre : ${item.name} !`);
      addMsg(`${getItemIconHtml(item, 'ui-icon-md')} Grimoire trouvé : ${item.name} !`, 'magic');
    }
  }

  renderMinimap();
}

// ── Fouille renouvelée — réactivation différée ───────────────
// Délai de recharge (en pas) selon la difficulté courante.
function _searchRechargeSteps() {
  const ds = (typeof DIFFICULTY_SETTINGS !== 'undefined') && DIFFICULTY_SETTINGS[difficulty];
  return (ds && ds.searchRechargeSteps) || 60;
}

// Reconstruit la Map des cases fouillées depuis un tableau sérialisé.
// Format courant : [["x,y", {at, count}], …]. Les entrées legacy
// (simples chaînes "x,y") sont ignorées — le mode redémarre proprement.
function _searchedCellsFromArray(arr) {
  const m = new Map();
  if (Array.isArray(arr)) {
    for (const e of arr) {
      if (Array.isArray(e) && e.length === 2 && e[1] && typeof e[1] === 'object') {
        m.set(e[0], { at: e[1].at || 0, count: e[1].count || 1 });
      }
    }
  }
  return m;
}

// État de fouille d'une case : 'fresh' (jamais fouillée),
// 'recharging' (fouillée récemment) ou 'ready' (recharge écoulée).
function _searchCellStatus(key) {
  const rec = (searchedCells instanceof Map) ? searchedCells.get(key) : null;
  if (!rec) return { state: 'fresh', count: 0, left: 0 };
  const elapsed  = stepCount - rec.at;
  const recharge = _searchRechargeSteps();
  if (elapsed >= recharge) return { state: 'ready', count: rec.count, left: 0 };
  return { state: 'recharging', count: rec.count, left: recharge - elapsed };
}

// ── Mise à jour visuelle du bouton Fouiller ──────────────────
function _updateSearchBtn() {
  const btn = document.getElementById('btn-search');
  if (!btn) return;
  const st = _searchCellStatus(`${playerX},${playerY}`);
  btn.classList.toggle('searched', st.state === 'recharging');
  btn.title = st.state === 'recharging'
    ? `Fouillé récemment — de nouveau fouillable dans ~${st.left} pas`
    : 'Fouiller la pièce';
  if (typeof updateRoomStatus === 'function') updateRoomStatus();
}

// Ramasse le feuillet du set de pages actif si la case courante en porte
// un, révélé par Revelio et non encore collecté. Retourne true si un
// feuillet a été ramassé. Set-aware (Acte II grimoire / Acte III feuillets
// clairs). Côté Acte III, trouver le 1ᵉʳ feuillet convertit l'easter egg
// en quête formelle (acceptQuest). Cf. manon-grimoire-easter-egg.md §6.
function _tryCollectPage() {
  if (typeof pagePlacements === 'undefined') return false;
  if (pagePlacements.get(currentFloor) !== `${playerX},${playerY}`) return false;
  if (!revealedPages.has(currentFloor)) return false;
  const set  = (typeof _activePageSet === 'function') ? _activePageSet() : null;
  const page = set ? (set.pages.find(p => p.floor === currentFloor) || null) : null;
  if (!page) return false;
  if (!Array.isArray(player.grimoirePages)) player.grimoirePages = [];
  if (player.grimoirePages.includes(page.id)) return false;
  player.grimoirePages.push(page.id);
  AudioSystem.playChestOpen();
  const isAct3 = set.questId === 'manon_acte3';
  // Conversion egg → quête : le 1ᵉʳ feuillet clair ouvre formellement
  // l'Acte III auprès de Manon (acceptation implicite).
  if (isAct3 && typeof activeQuests !== 'undefined'
      && !activeQuests.some(q => q.id === 'manon_acte3')
      && typeof acceptQuest === 'function') {
    acceptQuest('manon_acte3');
    setNarrative(`Un feuillet clair, presque tiède sous le givre : « ${page.name} ». Ça n'a rien d'un secret honteux — c'est de la joie. Manon doit voir ça.`);
  } else if (isAct3) {
    setNarrative(`Entre deux pierres, un feuillet lumineux : « ${page.name} ». Le givre y dessine un jeu, pas une peur.`);
  } else {
    setNarrative(`Entre deux pierres, un feuillet givré : « ${page.name} ». Vous le glissez dans le grimoire.`);
  }
  addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/scroll.png" alt=""> ${isAct3 ? 'Feuillet clair récolté' : 'Page récoltée'} : ${page.name}`, 'good');
  if (typeof checkPageQuest === 'function') checkPageQuest();
  if (typeof renderMinimap === 'function') renderMinimap();
  return true;
}

function searchRoom() {
  if (inBattle) return;

  // Une page de grimoire révélée sur la case courante est ramassée en
  // priorité — sans interagir avec la recharge de fouille.
  if (_tryCollectPage()) return;

  // Désamorçage de pièges : la fouille repère et neutralise tout piège
  // dans les 8 cases adjacentes (+ la case courante). Effet prioritaire,
  // sans consommer la recharge de fouille (Phase 2 §2.A).
  let disarmed = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = playerX + dx, ty = playerY + dy;
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
      if (dungeon[ty][tx] === CELL.TRAP) { dungeon[ty][tx] = CELL.FLOOR; disarmed++; }
    }
  }
  if (disarmed > 0) {
    setNarrative(disarmed > 1
      ? `Votre prudence paie : vous repérez et désamorcez ${disarmed} pièges dissimulés.`
      : "Votre prudence paie : vous repérez et désamorcez un piège dissimulé.");
    addMsg(`Piège${disarmed > 1 ? 's' : ''} désamorcé${disarmed > 1 ? 's' : ''} (${disarmed}).`, 'good');
    renderMinimap();
    return;
  }

  // Révélation de passage secret : un mur secret dans les 8 cases
  // adjacentes est mis au jour par la fouille (Phase 3 §3.2). Effet
  // prioritaire, sans consommer la recharge de fouille.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const k = `${playerX + dx},${playerY + dy}`;
      if (secretWalls && secretWalls.has(k)) {
        secretWalls.delete(k);
        dungeon[playerY + dy][playerX + dx] = CELL.FLOOR;
        setNarrative("En tâtant la paroi, une pierre bascule — un passage dérobé s'ouvre dans le mur !");
        addMsg("Passage secret découvert !", 'good');
        if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
        renderMinimap();
        drawDungeon();
        return;
      }
    }
  }

  // Révélation de jardin caché (Potions P6.b3) : la fouille met au jour un
  // jardin d'herbes dans les 8 cases adjacentes. Prioritaire, sans consommer
  // la recharge de fouille. Le sort Revelio fait de même sur un rayon 5×5.
  if (_revealGardensNear(playerX, playerY, 1) > 0) {
    renderMinimap();
    drawDungeon();
    return;
  }

  const key = `${playerX},${playerY}`;
  const st  = _searchCellStatus(key);
  if (st.state === 'recharging') {
    setNarrative(`Vous avez fouillé cet endroit récemment. Les recoins ne se regarniront pas avant ~${st.left} pas.`);
    addMsg("Fouillé récemment.", '');
    return;
  }

  // 'ready' = case déjà fouillée au moins une fois → butin dégressif.
  const repeat = st.count > 0;
  searchedCells.set(key, { at: stepCount, count: st.count + 1 });
  _updateSearchBtn();

  // Malus de fouille : jets indépendants (1 % chacun). Le monstre prime sur
  // le piège — déranger une créature interrompt aussitôt la fouille.
  if (Math.random() < SEARCH_MONSTER_CHANCE) {
    setNarrative("En soulevant une dalle, vous dérangez une créature tapie dans l'ombre !");
    addMsg("Votre fouille a réveillé un monstre !", 'bad');
    startBattle(pickSimilarEnemy());
    return;
  }
  if (Math.random() < SEARCH_TRAP_CHANCE) {
    _triggerSearchTrap();
    return;
  }

  // D5 — Fortune (volet LCK) : seuil objet élargi de +F (borné), or majoré
  // × (1 + F×0.5), double-herbe + F. Cf. luck-fortune.md §2.4.
  const F        = (typeof partyFortune === 'function') ? partyFortune() : 0;
  const itemThr  = Math.min(0.9, SEARCH_ITEM_THRESHOLD + F);

  const roll = Math.random();
  if (roll < SEARCH_GOLD_THRESHOLD) {
    // Scaling par étage (×0.20 par étage au-delà du 1ᵉʳ) puis multiplicateur
    // de difficulté — cf. .claude/plans/game-economy-gold-audit.md §5.2.
    const floor = currentFloor || 1;
    let gold = Math.floor((Math.random() * 15 + 5) * (1 + (floor - 1) * 0.20) * (1 + F * 0.5));
    if (repeat) gold = Math.max(1, Math.floor(gold * 0.5));
    gold = _applyGoldMult(gold);
    player.gold += gold;
    setNarrative(NARRATIVES.gold_found(gold));
    addMsg(`+${gold} Gallions`, 'good');
    updateUI();
  } else if (!repeat && roll < itemThr) {
    const item = ITEMS.find(i => i.id === 'mandragore') || ITEMS[0];
    if (tryAddItem(item, { silent: true })) {
      setNarrative(NARRATIVES.item_found(item.name));
      addMsg(`Trouvé : ${item.name}`, 'good');
    }
  } else if (!repeat && roll < itemThr + 0.20) {
    // Cueillette d'une herbe du palier de l'étage courant → besace.
    // Palier 4 (Asphodèle des Ténèbres) réservé à la Boucle Ténébreuse (11+).
    const tier = (currentFloor >= 11) ? 4 : (currentFloor >= 7) ? 3 : (currentFloor >= 4) ? 2 : 1;
    const herbs = ITEMS.filter(i => i.type === 'herb' && i.tier === tier);
    const herb = herbs.length ? herbs[Math.floor(Math.random() * herbs.length)] : null;
    if (herb && tryAddItem(herb, { silent: true })) {
      // Jet chanceux : la touffe est généreuse, deux brins d'un coup. Les
      // membres du Slug Club (P6.b2) récoltent plus souvent double (25 → 35 %).
      const luckyBase = (typeof isSlugClubMember === 'function' && isSlugClubMember()) ? 0.35 : 0.25;
      const luckyChance = Math.min(0.9, luckyBase + F);
      const bumper = Math.random() < luckyChance && tryAddItem(herb, { silent: true });
      if (bumper) {
        setNarrative(`Une touffe généreuse a poussé entre les pierres : ${herb.name}. Vous en cueillez deux brins.`);
        addMsg(`Herbe cueillie : ${herb.name} ×2`, 'good');
      } else {
        setNarrative(`Entre deux pierres, une herbe a poussé : ${herb.name}. Vous la cueillez.`);
        addMsg(`Herbe cueillie : ${herb.name}`, 'good');
      }
    } else {
      setNarrative(NARRATIVES.nothing);
      addMsg("Rien trouvé.", '');
    }
  } else {
    setNarrative(repeat
      ? "Vous fouillez à nouveau, mais l'endroit a déjà livré ses meilleurs secrets."
      : NARRATIVES.nothing);
    addMsg("Rien trouvé.", '');
  }
}

// ── Piège de fouille — effet aléatoire, jamais létal ───────
// Trois variantes équiprobables : dégâts au groupe, dégâts à un seul
// personnage, ou dégâts au groupe + drain de PM. Chaque cible conserve
// toujours au moins 1 PV.
function _triggerSearchTrap() {
  const variant = Math.floor(Math.random() * 3);
  if (variant === 0) {
    party.slice(0, partySize).forEach(c => {
      if (c.hp <= 0) return;
      const dmg = Math.max(1, Math.floor(c.hpMax * 0.12));
      c.hp = Math.max(1, c.hp - dmg);
    });
    setNarrative("Un déclic sec — des lames jaillissent des murs ! Le groupe est lacéré.");
    addMsg("Piège ! Le groupe subit des dégâts.", 'bad');
  } else if (variant === 1) {
    const alive = party.slice(0, partySize).filter(c => c.hp > 0);
    if (alive.length) {
      const victim = alive[Math.floor(Math.random() * alive.length)];
      const dmg = Math.max(1, Math.floor(victim.hpMax * 0.20));
      victim.hp = Math.max(1, victim.hp - dmg);
      setNarrative(`Une dalle bascule sous ${victim.name} — un dard empoisonné le frappe !`);
      addMsg(`Piège ! ${victim.name} subit ${dmg} dégâts.`, 'bad');
    }
  } else {
    party.slice(0, partySize).forEach(c => {
      if (c.hp <= 0) return;
      const dmg = Math.max(1, Math.floor(c.hpMax * 0.08));
      c.hp = Math.max(1, c.hp - dmg);
      c.sp = Math.max(0, c.sp - Math.floor(c.spMax * 0.10));
    });
    setNarrative("Le sol cède : une brume sourde enveloppe le groupe, sapant corps et magie.");
    addMsg("Piège ! Le groupe est blessé et vidé d'une partie de sa magie.", 'bad');
  }
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) AudioSystem.playHit();
  updateUI();
}

// ── Piège de donjon — déclenché en marchant sur une case CELL.TRAP ──
// 50 % embuscade, 50 % dégâts/drain non létaux. La case a déjà été
// repassée en FLOOR par handleCellEntry. Le statut de combat n'est pas
// utilisé (risque hors-combat) : on s'en tient à dégâts / drain / ambush.
function _triggerDungeonTrap() {
  // D5 — Fortune (volet LCK) : la chance réduit le risque d'embuscade
  // (déclenchement plein) de F, borné à [0.1, 0.9]. Cf. luck-fortune.md §2.4.
  const F          = (typeof partyFortune === 'function') ? partyFortune() : 0;
  const ambushRisk = Math.max(0.1, Math.min(0.9, 0.5 - F));
  // Immersion Lot 2 : secousse de la vue au déclenchement (no-op si DFX absent).
  if (typeof DFX_safe !== 'undefined') DFX_safe.shakeView('heavy');
  if (Math.random() < ambushRisk) {
    setNarrative("Le sol se dérobe en un déclic sec — une créature jaillit de la fosse !");
    addMsg("Piège ! Une embuscade vous tombe dessus.", 'bad');
    const f = currentFloor || 1;
    const pool = MONSTERS.filter(m => m.minFloor <= f
      && (m.maxFloor === null || f <= m.maxFloor));
    startBattle(scaleMonster(weightedPick(pool.length ? pool : MONSTERS), f));
    return;
  }
  // Variante dégâts/drain : réutilise les 3 sous-variantes non létales
  // de la fouille (lames, dard, brume) — narration compatible.
  _triggerSearchTrap();
}

// ── Puzzle runique — activation d'une dalle-rune ────────────────
// Marcher sur une dalle RUNE l'allume. Quand les 3 sont allumées, la
// barrière runique se dissout (WALL → FLOOR) et le coffre-récompense
// devient accessible. Pour un puzzle ordonné (`runePuzzle.order`),
// allumer une rune hors séquence éteint toutes les dalles.
// Voir dungeon-enrichment-v2.md §1/§2.
function _activateRune() {
  if (!runePuzzle || runePuzzle.solved) return;
  const key = `${playerX},${playerY}`;
  if (runePuzzle.runes.indexOf(key) === -1) return;  // pas une rune du puzzle
  if (litRunes.has(key)) return;                     // déjà allumée

  if (runePuzzle.order) {
    // Puzzle ordonné : la rune attendue est `runes[order[litRunes.size]]`.
    const expected = runePuzzle.runes[runePuzzle.order[litRunes.size]];
    if (key !== expected) {
      litRunes.clear();
      setNarrative("La dalle s'embrase un instant — puis toutes les runes "
        + "s'éteignent dans un grondement sourd. L'ordre était faux.");
      if (typeof addMsg === 'function') {
        addMsg('✦ Séquence brisée — les runes se rallument à éteindre.', 'bad');
      }
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) {
        AudioSystem.playHit();
      }
      renderMinimap();
      drawDungeon();
      return;
    }
  }

  litRunes.add(key);
  const total     = runePuzzle.runes.length;
  const remaining = total - litRunes.size;

  if (remaining > 0) {
    setNarrative("Sous vos pieds, la dalle runique s'illumine d'une lueur "
      + `chaude. ${remaining} rune${remaining > 1 ? 's' : ''} reste`
      + `${remaining > 1 ? 'nt' : ''} à éveiller.`);
    if (typeof addMsg === 'function') {
      addMsg(`✦ Rune éveillée (${litRunes.size}/${total}).`, 'good');
    }
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) {
      AudioSystem.playChestOpen();
    }
  } else {
    runePuzzle.solved = true;
    const [bx, by] = runePuzzle.barrier.split(',').map(Number);
    if (dungeon[by] && dungeon[by][bx] === CELL.WALL) {
      dungeon[by][bx] = CELL.FLOOR;
    }
    setNarrative("La dernière rune s'embrase — un grondement profond, et un "
      + "pan de mur coulisse, révélant une alcôve scellée et son coffre.");
    if (typeof addMsg === 'function') {
      addMsg("✦ Sceau runique brisé — un passage s'ouvre !", 'good');
    }
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) {
      AudioSystem.playChestOpen();
    }
  }
  renderMinimap();
  drawDungeon();
}

// ── Stèle d'énigme — réponse à une devinette ────────────────────
// Appelée par les boutons de l'overlay de stèle (un par choix). Bonne
// réponse : la barrière runique se dissout (WALL → FLOOR) et le coffre
// scellé devient accessible. Mauvaise réponse : feedback dans l'overlay,
// ré-essai autorisé sans pénalité. Voir dungeon-enrichment-v2.md §3.
// Nommée `answerSteleRiddle` pour ne pas entrer en collision avec
// `answerRiddle` (quests.js — quête Lumière Éternelle).
function answerSteleRiddle(choiceIdx) {
  if (!runeStele || runeStele.solved) { _hideExploreOverlay(); return; }
  const riddle = (typeof getRiddleById === 'function')
    ? getRiddleById(runeStele.riddleId) : null;
  if (!riddle) { _hideExploreOverlay(); return; }

  if (choiceIdx === riddle.answer) {
    runeStele.solved = true;
    _steleFeedback = '';
    const [bx, by] = runeStele.barrier.split(',').map(Number);
    if (dungeon[by] && dungeon[by][bx] === CELL.WALL) {
      dungeon[by][bx] = CELL.FLOOR;
    }
    _hideExploreOverlay();
    setNarrative('Votre réponse résonne juste. ' + (riddle.rewardHint || '')
      + ' Un pan de mur coulisse, révélant un coffre scellé.');
    if (typeof addMsg === 'function') {
      addMsg("🗿 Énigme résolue — un passage s'ouvre !", 'good');
    }
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) {
      AudioSystem.playChestOpen();
    }
    renderMinimap();
    drawDungeon();
  } else {
    // Mauvaise réponse : on redessine l'overlay avec un préfixe d'échec.
    _steleFeedback = "✗ Les glyphes restent sombres — ce n'est pas la "
      + 'bonne réponse. La stèle attend toujours :';
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) {
      AudioSystem.playHit();
    }
    _showExploreOverlay(CELL.STELE);
  }
}

// ── Autel Ancien — tribut risque/récompense, 1×/visite d'étage ──
// 'gold'   : offrande payante — soin complet du groupe + XP. Sûr.
// 'gamble' : pari gratuit 50/50 — gros gain XP+or, ou retour de flamme.
function useAltar(choice) {
  if (inBattle) return;
  if (dungeon[playerY][playerX] !== CELL.ALTAR) return;
  _hideExploreOverlay();
  const key = `${playerX},${playerY}`;
  if (usedAltars.has(key)) {
    addMsg("L'autel est inerte : son pouvoir s'est éteint pour cette visite.", 'bad');
    return;
  }
  const f = currentFloor || 1;
  if (choice === 'gold') {
    // Coût réduit (40 → 25 × floor) pour rendre l'autel attractif vs
    // fontaine gratuite — cf. game-economy-gold-audit.md §5.5.
    const cost = 25 * f;
    if (player.gold < cost) {
      addMsg(`Offrande refusée : il faut ${cost} Gallions.`, 'bad');
      return;
    }
    player.gold -= cost;
    party.forEach(c => { if (c.hp > 0) { c.hp = c.hpMax; c.sp = c.spMax; } });
    const xpGain = 30 * f;
    player.xp += xpGain;
    usedAltars.add(key);
    setNarrative("Vous déposez l'or sur la dalle runique. Une lumière tiède enveloppe le groupe — les blessures se referment, l'esprit s'éclaircit.");
    addMsg(`Bénédiction de l'autel : groupe restauré, +${xpGain} XP (−${cost} Gallions).`, 'good');
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
    updateUI();
    if (typeof checkLevelUp === 'function') checkLevelUp();
  } else if (choice === 'gamble') {
    usedAltars.add(key);
    if (Math.random() < 0.5) {
      const xpGain = 60 * f;
      const goldGain = _applyGoldMult(20 * f);
      player.xp += xpGain;
      player.gold += goldGain;
      setNarrative("Vous posez la main nue sur la pierre. Elle s'illumine d'or — le destin vous sourit !");
      addMsg(`Pari gagné : +${xpGain} XP, +${goldGain} Gallions.`, 'good');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
      updateUI();
      if (typeof checkLevelUp === 'function') checkLevelUp();
    } else {
      party.slice(0, partySize).forEach(c => {
        if (c.hp <= 0) return;
        const dmg = Math.max(1, Math.floor(c.hpMax * 0.22));
        c.hp = Math.max(1, c.hp - dmg);
      });
      setNarrative("La pierre vire au noir sous vos doigts — une douleur fulgurante traverse le groupe.");
      addMsg("Pari perdu : le groupe encaisse le retour de flamme de l'autel.", 'bad');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playHit) AudioSystem.playHit();
      updateUI();
    }
  }
  safeCall('autoSave', 'altar-used');
}

// ── Porte scellée — ouverture à la Clé du Donjon (§2.C) ──────
// Appelée par _step quand le joueur avance vers une case CELL.DOOR.
// Avec une clé : la consomme et ouvre la porte (→ FLOOR). Sinon : refus.
function _tryOpenDoor(x, y) {
  const inv = player.inventory || [];
  const keyIdx = inv.findIndex(it => it && it.id === 'cle_donjon');
  if (keyIdx < 0) {
    setNarrative("Une lourde porte cloutée vous barre le chemin. Sa serrure ancienne réclame une clé.");
    addMsg("Porte scellée — il vous faut une Clé du Donjon.", 'bad');
    drawDungeon();
    return false;
  }
  inv.splice(keyIdx, 1);
  dungeon[y][x] = CELL.FLOOR;
  setNarrative("La clé tourne dans la serrure rouillée — la porte s'ouvre en grinçant sur une salle oubliée.");
  addMsg("🗝️ Porte déverrouillée.", 'good');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  renderMinimap();
  drawDungeon();
  return true;
}

// ── Fontaine de pierre — soin total 1×/visite d'étage ──────
function useFountain() {
  if (inBattle) return;
  if (dungeon[playerY][playerX] !== CELL.FOUNTAIN) return;
  const key = `${playerX},${playerY}`;
  if (usedFountains.has(key)) {
    addMsg("La fontaine est tarie : revenez sur cet étage plus tard.", 'bad');
    return;
  }
  party.forEach(c => {
    if (c.hp <= 0) return;
    c.hp = c.hpMax;
    c.sp = c.spMax;
  });
  usedFountains.add(key);
  if (typeof DFX_safe !== 'undefined') DFX_safe.burst('explore-overlay', 'water'); // VFX fontaine (E3)
  setNarrative("L'eau bleutée scintille. Le groupe boit longuement — la fatigue s'évanouit, la magie se ravive entièrement.");
  addMsg("Fontaine bue : PV et PM entièrement restaurés.", 'good');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
  updateUI();
  safeCall('autoSave', 'fountain-used');
}

// ── Salle sur Demande (easter egg) ───────────────────────────
// Révèle la porte : le mur « propice » de l'étage devient CELL.REQUIREMENT,
// marchable. Déclenché par le 3ᵉ passage sur la tuile (cf. movement.js _step).
function _revealRequirementRoom(floor) {
  if (typeof requirementWalls === 'undefined' || !requirementWalls.has(floor)) return;
  if (requirementRevealed.has(floor)) return;
  const [wx, wy] = requirementWalls.get(floor).split(',').map(Number);
  if (!dungeon[wy] || dungeon[wy][wx] !== CELL.WALL) return;
  dungeon[wy][wx] = CELL.REQUIREMENT;
  requirementRevealed.add(floor);
  // V3 — codex méta inter-parties : compte les Salles trouvées (toutes parties).
  if (typeof recordRequirementRevealed === 'function') recordRequirementRevealed();
  setNarrative("Tu longes ce mur une troisième fois, l'esprit tendu vers ce qu'il te faut… La pierre frémit, se replie : une porte se dessine là où il n'y avait rien. La Salle sur Demande t'ouvre.");
  if (typeof addMsg === 'function') addMsg("✨ Une porte s'est dessinée dans le mur — la Salle sur Demande !", 'magic');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  // V2 — animation « la porte se dessine » (one-shot, self-contained).
  if (typeof _startRequirementRevealAnim === 'function') _startRequirementRevealAnim();
  renderMinimap();
  drawDungeon();
}

// V2/V3 — choisit le thème de la Salle pour la visite courante de l'étage :
// « ce dont le groupe a besoin ». Priorité : PV/PM bas → refuge ; sac quasi
// vide → loot ; (V3) Boucle 11+ avec équipement forgeable + Essence → forge ;
// beaucoup d'or → boutique ; sinon entraînement. Si rien ne tranche (groupe au
// max ET sac plein), un seed départage parmi refuge/loot/training/boutique.
// Idempotent par visite : mémorisé dans `requirementTheme` (reset à l'entrée
// d'étage). Pur (sauf mémoïsation). Garde-fou groupe KO → 'refuge'.
function _pickRequirementTheme(floor) {
  if (typeof requirementTheme === 'undefined') return 'refuge';
  if (requirementTheme.has(floor)) return requirementTheme.get(floor);
  const living = party.slice(0, partySize).filter(c => c.hp > 0);
  let theme;
  if (!living.length) {
    theme = 'refuge';
  } else {
    const sum = (k) => living.reduce((s, c) => s + (c[k] || 0), 0);
    const hpFrac = sum('hp') / Math.max(1, sum('hpMax'));
    const spFrac = sum('sp') / Math.max(1, sum('spMax'));
    const bagFull = player.inventory.length >= 16;
    // V3 — seuil d'or « beaucoup d'or → boutique » (× étage).
    const goldThresh = (typeof REQUIREMENT_COMMERCE_GOLD === 'number')
      ? REQUIREMENT_COMMERCE_GOLD * floor : 120 * floor;
    // V3 — forge réservée à la Boucle Ténébreuse (étage 11+), et seulement si
    // le groupe a réellement de quoi forger (item améliorable + Essence).
    const canForge = floor >= 11 && _requirementForgeable()
      && (typeof _countEssence === 'function' ? _countEssence() > 0 : false);
    if (Math.min(hpFrac, spFrac) < 0.5)        theme = 'refuge';
    else if (player.inventory.length < 6)      theme = 'loot';
    else if (canForge)                         theme = 'forge';
    else if ((player.gold | 0) >= goldThresh)  theme = 'boutique';
    else if (hpFrac >= 0.999 && spFrac >= 0.999 && bagFull) {
      // Aucun besoin pressant : variété seedée par étage (forge exclue — gate
      // endgame strict ; boutique inoffensive même sans or).
      theme = ['refuge', 'loot', 'training', 'boutique'][(floor * 7919) % 4];
    } else theme = 'training';
  }
  requirementTheme.set(floor, theme);
  return theme;
}

// V3 — le groupe a-t-il ≥1 équipement améliorable non maxé ? Réemploi strict
// des helpers Forge (js/forge.js). Garde-fou si la Forge n'est pas chargée.
function _requirementForgeable() {
  if (typeof _equippedItems !== 'function' || typeof _primaryBonus !== 'function') return false;
  const max = (typeof FORGE_MAX_LEVEL === 'number') ? FORGE_MAX_LEVEL : 5;
  return _equippedItems().some(({ item }) => _primaryBonus(item) && (item.upgradeLevel | 0) < max);
}

// V2 — petit pool de butin de la « Cache aux objets », scalé par étage.
// Réemploi des consommables/matériaux existants (non-méta).
function _requirementLootPool(floor) {
  if (floor >= 11) return ['potion_m', 'essence_tenebres'];
  if (floor >= 7)  return ['potion_m', 'mandragore'];
  if (floor >= 4)  return ['potion_s', 'potion_m', 'mandragore'];
  return ['potion_s'];
}

// Entrer dans la Salle : effet routé par thème (refuge / loot / entraînement
// 1×/visite d'étage modèle `usedFountains` ; V3 boutique / forge = réemploi pur
// openShop/openForge, NON consommable) + objet unique la toute première fois de
// la partie (indépendant du thème).
function useRequirementRoom() {
  if (inBattle) return;
  if (dungeon[playerY][playerX] !== CELL.REQUIREMENT) return;
  const key = `${playerX},${playerY}`;
  const firstGift = (typeof requirementGiftTaken !== 'undefined') && !requirementGiftTaken;
  if (usedRequirementRooms.has(key) && !firstGift) {
    addMsg("La Salle s'est refermée : revenez sur cet étage plus tard.", 'bad');
    return;
  }
  const f = currentFloor || 1;
  const theme = _pickRequirementTheme(f);
  // V3 — thèmes commerce (boutique/forge) : ouvre l'étal/l'enclume (réemploi
  // pur). Ré-ouvrable pour la visite → on NE marque PAS usedRequirementRooms.
  if (theme === 'boutique' || theme === 'forge') {
    if (typeof recordRequirementTheme === 'function') recordRequirementTheme(theme);
    if (theme === 'forge') {
      setNarrative("La Salle s'est faite forge clandestine : une enclume noire ronfle sur des braises éternelles, prête à mordre le métal de vos équipements.");
      addMsg("Salle sur Demande : forge éphémère.", 'good');
      if (typeof openForge === 'function') openForge();
    } else {
      setNarrative("La Salle s'est faite étal de marchand : présentoirs de fioles, parchemins et babioles utiles s'alignent sous une lanterne tamisée.");
      addMsg("Salle sur Demande : étal de marchand.", 'good');
      if (typeof openShop === 'function') openShop();
    }
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  }
  // Effet de thème consommable — une fois par visite d'étage.
  else if (!usedRequirementRooms.has(key)) {
    if (theme === 'loot') {
      // Cache aux objets : or + 1-2 consommables (cap 16 via tryAddItem).
      const goldGain = (typeof _applyGoldMult === 'function') ? _applyGoldMult(25 * f) : 25 * f;
      player.gold += goldGain;
      const pool = _requirementLootPool(f);
      const n = 1 + (Math.random() < 0.5 ? 1 : 0);
      const got = [];
      for (let i = 0; i < n; i++) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        if (typeof tryAddItem === 'function' && tryAddItem(id, { silent: true })) {
          const it = ITEMS.find(x => x.id === id);
          got.push(it ? it.name : id);
        }
      }
      setNarrative("La Salle s'est faite cache aux trésors : alcôves et coffrets poussiéreux débordent d'objets oubliés. Vous y puisez de quoi poursuivre.");
      addMsg(`Salle sur Demande : +${goldGain} Gallions${got.length ? ' · ' + got.join(', ') : ' (sac plein)'}.`, 'good');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
      // V3 — trophée cosmétique unique (collectible NON inventorié), 1×/partie,
      // sur la 1ʳᵉ Salle « cache aux objets ». Ancre la méta-persistance.
      if (typeof requirementTrophyTaken !== 'undefined' && !requirementTrophyTaken
          && typeof REQUIREMENT_TROPHY !== 'undefined') {
        requirementTrophyTaken = true;
        if (typeof recordRequirementTrophy === 'function') recordRequirementTrophy();
        setNarrative("Au fond d'une alcôve scintille un éclat de lumière figée. Tu le recueilles : un souvenir de la Salle, sans prix mais sans poids — l'Éclat de la Salle sur Demande.");
        addMsg(`${REQUIREMENT_TROPHY.icon} Collecté : ${REQUIREMENT_TROPHY.name} (trophée unique).`, 'magic');
      }
    } else if (theme === 'training') {
      // Salle d'entraînement : XP (peut faire monter de niveau) + focus PM plein.
      const xpGain = 50 * f;
      player.xp += xpGain;
      party.slice(0, partySize).forEach(c => { if (c.hp > 0) c.sp = c.spMax; });
      setNarrative("La Salle s'est faite salle d'entraînement : mannequins, grimoires d'exercice et cibles enchantées. Le groupe s'aguerrit et fait le plein de magie.");
      addMsg(`Salle sur Demande : entraînement (+${xpGain} XP, magie restaurée).`, 'good');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
    } else {
      // Refuge (défaut V1) — repos sûr + buff de Confort.
      party.slice(0, partySize).forEach(c => {
        if (c.hp <= 0) return;
        c.hp = Math.min(c.hpMax, c.hp + Math.ceil(c.hpMax * REQUIREMENT_REST_FRAC));
        c.sp = Math.min(c.spMax, c.sp + Math.ceil(c.spMax * REQUIREMENT_REST_FRAC));
      });
      requirementBuffSteps = REQUIREMENT_BUFF_STEPS;
      setNarrative("La Salle s'est faite refuge : un âtre crépite, des fauteuils moelleux accueillent le groupe. Chacun reprend des forces, et une quiétude lumineuse l'accompagnera quelque temps.");
      addMsg("Salle sur Demande : repos réparateur (+ buff de Confort).", 'good');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
    }
    usedRequirementRooms.add(key);
    if (typeof recordRequirementTheme === 'function') recordRequirementTheme(theme); // V3 — codex
    if (typeof DFX_safe !== 'undefined') DFX_safe.burst('explore-overlay', 'magic');
    if (theme === 'training' && typeof checkLevelUp === 'function') checkLevelUp();
  }
  // Objet unique — une seule fois par partie, à la toute première Salle visitée.
  if (firstGift) {
    const tiare = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.id === 'tiare_poussiereuse') : null;
    if (tiare && player.inventory.length < 16) {
      player.inventory.push({ ...tiare });
      requirementGiftTaken = true;
      setNarrative("Sur un socle poussiéreux repose une vieille tiare ternie, oubliée là depuis des siècles. La Salle te l'offre — écho d'un trésor jadis enfoui.");
      addMsg("✨ Trouvé : Tiare poussiéreuse (objet unique) !", 'magic');
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
    } else if (tiare) {
      addMsg("Une vieille tiare repose sur un socle, mais votre sac est plein.", 'bad');
    }
  }
  updateUI();
  safeCall('autoSave', 'requirement-used');
}

// ── Jardin d'herbes à récolte passive (Potions P6.b3) ────────────────────
// Palier d'herbe de l'étage courant (même grille que la cueillette de
// searchRoom) : T1 ≤3 · T2 4-6 · T3 7-10 · T4 11+ (Boucle Ténébreuse).
function _gardenHerbTier(floor) {
  return (floor >= 11) ? 4 : (floor >= 7) ? 3 : (floor >= 4) ? 2 : 1;
}

// Révèle les jardins cachés dans un rayon (Chebyshev) autour de (cx,cy).
// Retire leur clé de `hiddenGardens`, arme l'éveil et renvoie le nombre
// révélé. Partagé par la fouille (r=1) et Revelio (r=2).
function _revealGardensNear(cx, cy, r) {
  if (typeof hiddenGardens === 'undefined' || !hiddenGardens) return 0;
  let revealed = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      if (dungeon[y][x] !== CELL.GARDEN) continue;
      const k = `${currentFloor},${x},${y}`;
      if (hiddenGardens.has(k)) {
        hiddenGardens.delete(k);
        revealed++;
      }
    }
  }
  if (revealed > 0) {
    const firstAwake = !gardenDiscovered;
    gardenDiscovered = true;
    setNarrative(firstAwake
      ? "Sous le sortilège, des pierres s'écartent : un jardin d'herbes magiques se dévoile, déjà frémissant de pousses. Il continuera de croître à mesure que vous arpenterez le château."
      : "Le sortilège dévoile un autre carré de jardin d'herbes magiques.");
    addMsg(revealed > 1 ? `${revealed} jardins d'herbes révélés !` : "Jardin d'herbes révélé !", 'good');
    if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
    // Quête « Le Jardin Oublié » (Chourave) : objectif de découverte rempli.
    if (typeof checkGardenQuests === 'function') checkGardenQuests();
    if (typeof updateQuestTracker === 'function') updateQuestTracker();
  }
  return revealed;
}

// Récolte le pool `gardenStock` en herbes du palier de l'étage courant.
// Appelé depuis l'overlay d'exploration quand on est sur un jardin révélé.
function useGarden() {
  if (inBattle) return;
  if (dungeon[playerY][playerX] !== CELL.GARDEN) return;
  if (typeof gardenHiddenAt === 'function' && gardenHiddenAt(playerX, playerY)) return;
  if (gardenStock <= 0) {
    setNarrative("Le jardin n'a pas encore assez poussé. Continuez d'explorer le château : les herbes y mûriront.");
    addMsg("Jardin encore trop jeune.", '');
    return;
  }
  const tier  = _gardenHerbTier(currentFloor);
  const herbs = (typeof ITEMS !== 'undefined')
    ? ITEMS.filter(i => i.type === 'herb' && i.tier === tier) : [];
  if (!herbs.length || typeof addHerb !== 'function') {
    addMsg("Aucune herbe ne pousse à ce palier.", 'bad');
    return;
  }
  const harvested = gardenStock;
  const tally = {};
  for (let i = 0; i < harvested; i++) {
    const herb = herbs[Math.floor(Math.random() * herbs.length)];
    addHerb(herb.id, 1);
    tally[herb.name] = (tally[herb.name] || 0) + 1;
  }
  gardenStock = 0;
  const summary = Object.keys(tally).map(n => `${n} ×${tally[n]}`).join(', ');
  setNarrative(`Vous récoltez le jardin : ${summary}. Les tiges se referment, prêtes à repousser.`);
  addMsg(`Jardin récolté : ${harvested} herbe${harvested > 1 ? 's' : ''} (${summary}).`, 'good');
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playChestOpen) AudioSystem.playChestOpen();
  updateUI();
  // Étape « Cueillette pour Chourave » : rafraîchit le tracker de quête
  // (l'objectif "herb" est recompté en continu depuis la besace).
  if (typeof updateQuestTracker === 'function') updateQuestTracker();
  safeCall('autoSave', 'garden-harvest');
}

function rest() {
  if (inBattle) return;
  if (restCooldown > 0) {
    setNarrative(`Le groupe est encore agité. Encore ${restCooldown} déplacement${restCooldown > 1 ? 's' : ''} avant de pouvoir se reposer.`);
    addMsg(`Repos impossible (${restCooldown} pas restants)`, 'bad');
    return;
  }
  if (Math.random() < REST_ENCOUNTER_CHANCE) {
    addMsg("Une rencontre vous interrompt !", 'bad');
    // Repos interrompu : le groupe conserve une fraction du soin de repos
    // avant d'entrer en combat (cf. REST_INTERRUPT_HEAL_FRACTION).
    party.forEach(c => {
      const healAmt = Math.floor(c.hpMax * 0.3 * REST_INTERRUPT_HEAL_FRACTION);
      const spAmt   = Math.floor(c.spMax * 0.3 * REST_INTERRUPT_HEAL_FRACTION);
      c.hp = Math.min(c.hpMax, c.hp + healAmt);
      c.sp = Math.min(c.spMax, c.sp + spAmt);
    });
    addMsg("Le groupe n'a eu qu'un répit partiel.", '');
    const restFloor = Math.max(1, currentFloor - 1);
    const restPool  = MONSTERS.filter(m => m.minFloor <= restFloor);
    const pool      = restPool.length ? restPool : MONSTERS;
    const enemy     = scaleMonster(weightedPick(pool), restFloor);
    restCooldown = 5;
    startBattle(enemy);
    return;
  }
  party.forEach(c => {
    const healAmt = Math.floor(c.hpMax * 0.3);
    const spAmt   = Math.floor(c.spMax * 0.3);
    c.hp = Math.min(c.hpMax, c.hp + healAmt);
    c.sp = Math.min(c.spMax, c.sp + spAmt);
  });
  restCooldown = 5;
  setNarrative("Le groupe se repose quelques instants. Les forces se restaurent partiellement.");
  addMsg(`Repos : HP et PM restaurés (repos disponible dans 5 pas)`, 'good');
  updateUI();
}


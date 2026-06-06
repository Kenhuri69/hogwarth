// ============================================================
// DÉPLACEMENT ET ÉVÉNEMENTS DE CELLULE
// ============================================================
// Déplacement relatif (_step, moveForward/Backward, turnLeft/Right),
// overlay d'exploration et handleCellEntry (dispatch). Transitions d'étage :
// movement-floors.js. Interactions de cellule (coffre, fouille, pièges,
// runes, autel, fontaine, repos) : movement-interactions.js.

function canMove(dir) {
  if (inBattle) return false;
  const [dx, dy] = DIRECTIONS[dir];
  const nx = playerX + dx, ny = playerY + dy;
  if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return false;
  if (dungeon[ny][nx] === CELL.WALL) return false;
  // Mondes parallèles §3.5 — en visite, le visiteur ne franchit que les cases
  // déjà foulées par le host (brouillard infranchissable). Le blocage est
  // doux : `_step` affiche un message dédié plutôt que le « mur de pierre ».
  if (typeof visitSession !== 'undefined' && visitSession
      && visitSession.role === 'visitor'
      && visited && visited[ny] && !visited[ny][nx]) {
    return false;
  }
  return true;
}

// Jardin d'herbes (Potions P6.b3) — un jardin dont la clé "étage,x,y" est
// dans `hiddenGardens` est encore caché : il se comporte comme du sol (pas
// d'overlay, pas de sprite, pas de marqueur minimap) tant qu'il n'a pas été
// révélé par Revelio ou par la fouille. Helper pur, sûr si l'état manque.
function gardenHiddenAt(x, y) {
  return typeof hiddenGardens !== 'undefined' && hiddenGardens
    && hiddenGardens.has(`${currentFloor},${x},${y}`);
}

// Mondes parallèles §3.5 — détecte si la case visée est bloquée par le
// brouillard (pas un mur). Sert à choisir le message d'erreur dans `_step`.
function _isVisitorFogBlock(dir) {
  if (!(typeof visitSession !== 'undefined' && visitSession
        && visitSession.role === 'visitor')) return false;
  const [dx, dy] = DIRECTIONS[dir];
  const nx = playerX + dx, ny = playerY + dy;
  if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return false;
  if (dungeon[ny][nx] === CELL.WALL) return false;
  return !!(visited && visited[ny] && !visited[ny][nx]);
}

// Cohérence économie or : applique le multiplicateur de difficulté à
// toutes les sources hors-combat (coffres, fouille, autel) — alignées
// sur le scaling appliqué aux drops dans battle.js. Plancher à 1G pour
// éviter qu'un mode Expert (×0.55) ne réduise un petit gain à 0.
// Voir .claude/plans/game-economy-gold-audit.md §5.3.
function _applyGoldMult(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const m = (typeof DIFFICULTY_SETTINGS !== 'undefined'
            && DIFFICULTY_SETTINGS[difficulty]
            && typeof DIFFICULTY_SETTINGS[difficulty].goldMultiplier === 'number')
    ? DIFFICULTY_SETTINGS[difficulty].goldMultiplier : 1;
  return Math.max(1, Math.floor(amount * m));
}

// ─────────────────────────────────────────────────────────────
// Helpers de rotation : indexés cycliquement n→e→s→w→n.
// ─────────────────────────────────────────────────────────────
const _DIR_ORDER = ['n', 'e', 's', 'w'];
function _oppositeDir(dir) {
  return _DIR_ORDER[(_DIR_ORDER.indexOf(dir) + 2) % 4];
}
function _rotateDir(dir, delta) {
  const i = _DIR_ORDER.indexOf(dir);
  return _DIR_ORDER[(i + delta + 4) % 4];
}

// Pas dans une direction absolue. Si `faceDir` est vrai, on aligne
// `playerDir` sur la direction du pas (mouvement classique). Sinon
// on garde `playerDir` intact (cas `moveBackward`).
function _step(dir, faceDir) {
  if (inBattle) return;
  if (faceDir) playerDir = dir;
  if (!canMove(dir)) {
    // Mondes parallèles §3.5 — brouillard prioritaire sur le mur de pierre :
    // si la case n'est pas un mur mais simplement hors `visited` du host,
    // on affiche le message dédié plutôt que le narratif générique.
    const fogBlock = _isVisitorFogBlock(dir);
    if (fogBlock) {
      const hostName = (typeof visitSession !== 'undefined' && visitSession
                       && visitSession.hostName) ? visitSession.hostName : 'le sorcier';
      const msg = `Le brouillard t'empêche d'aller plus loin — ce passage n'a pas encore été foulé par ${hostName}.`;
      setNarrative(msg);
      if (typeof addMsg === 'function') addMsg('🌫️ ' + msg, '');
    } else {
      setNarrative("Un mur de pierre solide bloque le passage.");
    }
    updateCompass();
    drawDungeon();
    return;
  }
  const [dx, dy] = DIRECTIONS[dir];
  // Porte scellée : avancer vers une porte tente de l'ouvrir (clé requise)
  // sans franchir la case. Une fois ouverte (→ FLOOR) elle se traverse au
  // pas suivant. Voir dungeon-enrichment §2.C.
  if (dungeon[playerY + dy] && dungeon[playerY + dy][playerX + dx] === CELL.DOOR) {
    _tryOpenDoor(playerX + dx, playerY + dy);
    updateCompass();
    return;
  }
  playerX += dx; playerY += dy;
  visited[playerY][playerX] = true;
  stepCount++;
  // Jardin d'herbes (Potions P6.b3) : une fois éveillé, le jardin pousse
  // d'1 herbe tous GARDEN_STEP_INTERVAL pas, plafonné à GARDEN_CAP.
  if (typeof gardenDiscovered !== 'undefined' && gardenDiscovered
      && stepCount % GARDEN_STEP_INTERVAL === 0 && gardenStock < GARDEN_CAP) {
    gardenStock = Math.min(GARDEN_CAP, gardenStock + 1);
  }
  if (restCooldown > 0) restCooldown--;
  // D5 — buff Félix Felicis (Fortune) : décrémenté à chaque pas d'exploration.
  if (typeof felixFortuneSteps === 'number' && felixFortuneSteps > 0) felixFortuneSteps--;
  if (typeof healSpellCooldown === 'number' && healSpellCooldown > 0) healSpellCooldown--;
  if (typeof _tickShopRestock === 'function') _tickShopRestock();
  AudioSystem.playFootstep();
  // Barks ambiants (F2) : one-shot procédural à faible probabilité par pas,
  // teinté par la tranche d'ambiance. Effet purement audio (n'altère aucun
  // état). Self-gated : muet/combat/menu → no-op.
  if (typeof AudioSystem.maybeAmbientBark === 'function') AudioSystem.maybeAmbientBark(currentFloor);

  // Apothéose Poufsouffle (palier 18 — Souffle du Blaireau) : régénération
  // hors combat, +2 PV / +2 PM par membre vivant du groupe à chaque pas.
  if (typeof houseApotheosePassive === 'function' && houseApotheosePassive() === 'Poufsouffle') {
    party.slice(0, partySize).forEach(c => {
      if (c.hp > 0) {
        c.hp = Math.min(c.hpMax, c.hp + 2);
        c.sp = Math.min(c.spMax, c.sp + 2);
      }
    });
  }

  // Passif « Hiver Clair » (Manon Acte III) : hors combat, +1 PM par pas
  // d'exploration (plafonné spMax). Confort lumineux, non gated, distinct
  // du Souffle du Blaireau (PM seul, +1). Cf. manon-grimoire-easter-egg.md §7.
  if (typeof hiverClair !== 'undefined' && hiverClair) {
    party.slice(0, partySize).forEach(c => {
      if (c.hp > 0) c.sp = Math.min(c.spMax, c.sp + 1);
    });
  }

  // Easter egg « Salle sur Demande » — buff de Confort : régénération douce
  // hors combat (+1 PV / +1 PM par membre vivant), décomptée par pas.
  if (typeof requirementBuffSteps === 'number' && requirementBuffSteps > 0) {
    requirementBuffSteps--;
    party.slice(0, partySize).forEach(c => {
      if (c.hp > 0) {
        c.hp = Math.min(c.hpMax, c.hp + 1);
        c.sp = Math.min(c.spMax, c.sp + 1);
      }
    });
  }

  const cell = dungeon[playerY][playerX];
  updateCompass();
  renderMinimap();
  drawDungeon();
  updateUI();

  // Multijoueur — émet la nouvelle position (upsert throttlé).
  // Mondes parallèles §5.2/§5.3 — pendant une visite, on route plutôt vers
  // le canal de visite : le visiteur informe le host de sa position dans son
  // donjon, le host informe le visiteur de la sienne. Hors visite, pipeline
  // normal mp_presence pour la présence asynchrone.
  const _inVisit = typeof visitSession !== 'undefined' && visitSession;
  if (_inVisit && visitSession.role === 'visitor') {
    if (typeof _visitNotifyVisitorMove === 'function') _visitNotifyVisitorMove();
    // Phase G — rafraîchit le bouton "Défier l'écho" : le canEngage
    // dépend de la cellule courante (cooldown par cellule §6.8).
    if (typeof _refreshAstralButton === 'function') _refreshAstralButton();
  } else if (_inVisit && visitSession.role === 'host') {
    if (typeof _visitNotifyHostMove === 'function') _visitNotifyHostMove();
    if (typeof mpNotifyMove === 'function') mpNotifyMove();
  } else {
    if (typeof mpNotifyMove === 'function') mpNotifyMove();
  }

  _updateSearchBtn();

  // Mondes parallèles Phase H §6.9 — Verrou de Sang : si la case courante
  // porte un Verrou actif, déclenche un combat de résolution prioritaire.
  // Le helper `_triggerHostBloodSeal` consomme le Verrou local et lance
  // `startBattle({sealed:true, sealRef:...})`. Skippé en visite (le
  // visiteur est l'auteur, pas la cible).
  if (!_inVisit && typeof _triggerHostBloodSeal === 'function'
      && _triggerHostBloodSeal(playerX, playerY)) {
    _hideExploreOverlay();
    return;
  }

  if (enemyMap[playerY][playerX]) {
    _hideExploreOverlay();
    startBattle(enemyMap[playerY][playerX]);
    return;
  }

  // Multijoueur — un fantôme occupe la case : ouvre l'interaction.
  if (typeof getGhostAt === 'function') {
    const _ghost = getGhostAt(playerX, playerY);
    if (_ghost && typeof openGhostInteraction === 'function') {
      openGhostInteraction(_ghost);
      return;
    }
  }

  // Multijoueur — un message gravé sur la case : révélation non bloquante.
  if (typeof getMessageAt === 'function') {
    const _msg = getMessageAt(playerX, playerY);
    if (_msg) {
      addMsg('🪶 « ' + _msg.text + ' » — ' + (_msg.authorName || 'un sorcier'), 'info');
    }
  }

  // Easter egg « Salle sur Demande » : compter les passages distincts sur la
  // tuile de déclenchement de l'étage. Chaque `_step` qui y atterrit est une
  // entrée distincte (le piétinement est impossible). Au 3ᵉ, une porte se
  // dessine dans le mur adjacent. Skippé en visite (donjon d'un autre joueur).
  if (!_inVisit && typeof requirementTrigger !== 'undefined'
      && requirementTrigger.has(currentFloor)
      && !requirementRevealed.has(currentFloor)
      && requirementTrigger.get(currentFloor) === `${playerX},${playerY}`) {
    const n = (requirementPaces.get(currentFloor) || 0) + 1;
    requirementPaces.set(currentFloor, n);
    if (n >= 3 && typeof _revealRequirementRoom === 'function') {
      _revealRequirementRoom(currentFloor);
    }
  }

  handleCellEntry(cell);
}

// Contrôles relatifs (avancer/reculer + rotation).
function moveForward()  { _step(playerDir, true); }
function moveBackward() { _step(_oppositeDir(playerDir), false); }
function turnLeft() {
  if (inBattle) return;
  playerDir = _rotateDir(playerDir, -1);
  updateCompass();
  renderMinimap();
  drawDungeon();
  _updateSearchBtn();
}
function turnRight() {
  if (inBattle) return;
  playerDir = _rotateDir(playerDir, 1);
  updateCompass();
  renderMinimap();
  drawDungeon();
  _updateSearchBtn();
}

// API legacy : déplacement absolu dans une direction cardinale.
// Conservée pour cinématiques / debug. L'UI utilise désormais les
// helpers relatifs ci-dessus.
function move(dir) { _step(dir, true); }

// ── Overlay exploration (coffre / escalier / boutique / fontaine) ───
// Pour chaque cellule interactive : un descripteur (icon, title, desc,
// btns). Les SVG eux-mêmes sont centralisés dans `js/scene-icons.js`.
//
// Feedback transitoire de la stèle d'énigme : préfixe affiché dans
// l'overlay après une mauvaise réponse. Réinitialisé à chaque ouverture.
let _steleFeedback = '';
// Descripteurs en mode visite (parallel-worlds.md §6.4) : le visiteur
// voit les éléments du donjon de l'autre mais ne peut pas les utiliser.
// Message contextuel par type de cellule, un seul bouton "S'éloigner".
function _visitorExploreDescriptors() {
  const hostName = (typeof visitSession !== 'undefined' && visitSession && visitSession.hostName)
    ? visitSession.hostName : 'le sorcier';
  const close = `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`;
  return {
    [CELL.CHEST]: {
      icon:  SCENE_ICONS.chest,
      title: 'Coffre Magique',
      desc:  `Ce coffre attend la main de ${hostName}, pas la tienne. Tu n'es qu'un voyageur dans ce plan.`,
      btns:  close
    },
    [CELL.SHOP]: {
      icon:  SCENE_ICONS.shop,
      title: 'Échoppe Ambulante',
      desc:  `Le marchand te jette un regard distrait — tes piécettes n'ont pas cours dans ce plan.`,
      btns:  close
    },
    [CELL.STAIRS_D]: {
      icon:  SCENE_ICONS.stairs_d,
      title: 'Escalier Descendant',
      desc:  `Ce plan reste à découvrir par ${hostName} — les marches refusent de te porter plus bas.`,
      btns:  close
    },
    [CELL.STAIRS_U]: {
      icon:  SCENE_ICONS.stairs_u,
      title: 'Escalier Montant',
      desc:  `Ce plan reste à découvrir par ${hostName} — les marches refusent de te porter plus haut.`,
      btns:  close
    },
    [CELL.FOUNTAIN]: {
      icon:  SCENE_ICONS.fountain({ dried: false }),
      title: 'Fontaine de Pierre',
      desc:  `L'eau scintille pour ${hostName}, pas pour toi.`,
      btns:  close
    },
    [CELL.ALTAR]: {
      icon:  SCENE_ICONS.altar,
      title: 'Autel Ancien',
      desc:  `Les runes te toisent en silence — ce tribut appartient à ${hostName}.`,
      btns:  close
    },
    [CELL.FORGE]: {
      icon:  SCENE_ICONS.forge,
      title: 'Forge des Ténèbres',
      desc:  `L'enclume reste froide à ton approche — ce métal n'obéit qu'à ${hostName}.`,
      btns:  close
    },
    [CELL.LIBRARY]: {
      icon:  SCENE_ICONS.library,
      title: 'Bibliothèque interdite',
      desc:  `Les pages refusent de tourner pour toi — ce grimoire ne se livre qu'à ${hostName}.`,
      btns:  close
    },
    [CELL.STELE]: {
      icon:  SCENE_ICONS.stele,
      title: 'Stèle Runique',
      desc:  `Les glyphes attendent la main de ${hostName} — leur énigme t'est étrangère.`,
      btns:  close
    }
  };
}

function _exploreDescriptors() {
  // Mondes parallèles §6.4 — en visite, tout est observation-only.
  if (typeof visitSession !== 'undefined' && visitSession && visitSession.role === 'visitor') {
    return _visitorExploreDescriptors();
  }
  const fountainDried = usedFountains && usedFountains.has(`${playerX},${playerY}`);
  const altarSpent    = usedAltars && usedAltars.has(`${playerX},${playerY}`);
  // Easter egg « Salle sur Demande » — refuge déjà pris cette visite, et objet
  // unique encore disponible (force la réouverture si le sac était plein).
  const requirementSpent = usedRequirementRooms && usedRequirementRooms.has(`${playerX},${playerY}`);
  const requirementGift  = (typeof requirementGiftTaken !== 'undefined') && !requirementGiftTaken;
  // V2 — thème de la Salle pour cette visite (refuge / loot / training).
  const requirementTheme_ = (typeof _pickRequirementTheme === 'function')
    ? _pickRequirementTheme(currentFloor || 1) : 'refuge';
  const REQ_VARIANT = {
    refuge:   { desc: "Au-delà de la porte, la Salle est devenue exactement ce dont le groupe a besoin : un refuge chaleureux où reprendre son souffle à l'abri du donjon.", btn: 'Entrer dans la Salle' },
    loot:     { desc: "Au-delà de la porte, la Salle s'est faite cache aux trésors : alcôves et coffrets poussiéreux où s'entassent objets oubliés et bourses ternies.", btn: 'Fouiller la Salle' },
    training: { desc: "Au-delà de la porte, la Salle s'est faite salle d'entraînement : mannequins enchantés, cibles mouvantes et grimoires d'exercice attendent le groupe.", btn: "S'entraîner" }
  };
  const reqVar = REQ_VARIANT[requirementTheme_] || REQ_VARIANT.refuge;
  const altarCost     = 40 * (currentFloor || 1);
  // Jardin d'herbes (Potions P6.b3) — stock mûr récoltable sur ce jardin révélé.
  const gardenReady   = (typeof gardenStock !== 'undefined') ? gardenStock : 0;
  // L'escalier descendant de l'étage 10 est scellé tant que Voldemort
  // Ressuscité n'a pas été vaincu. Voir ENDGAME_PLAN.md §7.1ter.
  const stairsSealed = currentFloor === 10
    && !(typeof victoryAchieved !== 'undefined' && victoryAchieved);
  // Stèle d'énigme V2 §3 — devinette piochée dans RIDDLES gardant un coffre.
  const steleSolved = !!(runeStele && runeStele.solved);
  const steleRiddle = (runeStele && !steleSolved && typeof getRiddleById === 'function')
    ? getRiddleById(runeStele.riddleId) : null;
  const steleBtns = steleRiddle
    ? steleRiddle.choices
        .map((c, i) => `<button class="explore-btn" onclick="answerSteleRiddle(${i})">${c}</button>`)
        .join('\n')
      + `\n<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    : `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`;
  return {
    [CELL.CHEST]: {
      icon:  SCENE_ICONS.chest,
      title: 'Coffre Magique',
      desc:  "Un vieux coffre verrouillé trône contre le mur de pierre. Qui sait ce qu'il contient ?",
      btns:  `<button class="explore-btn" onclick="openChest();_hideExploreOverlay()">Ouvrir le coffre</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Ignorer</button>`
    },
    [CELL.SHOP]: {
      icon:  SCENE_ICONS.shop,
      title: 'Échoppe Ambulante',
      desc:  'Une aile de la bibliothèque transformée en échoppe de fortune. Des articles magiques sont disponibles.',
      btns:  `<button class="explore-btn" onclick="openShop();_hideExploreOverlay()">Entrer dans la boutique</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Passer son chemin</button>`
    },
    [CELL.STAIRS_D]: stairsSealed ? {
      icon:  SCENE_ICONS.stairs_d,
      title: 'Passage scellé',
      desc:  "Une magie ancienne et noire scelle cet escalier. Une présence maléfique veille — tant qu'elle n'aura pas été abattue, le passage restera fermé.",
      btns:  `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    } : {
      icon:  SCENE_ICONS.stairs_d,
      title: 'Escalier Descendant',
      desc:  'Un escalier en colimaçon disparaît dans les profondeurs. Le danger augmente en descendant.',
      btns:  `<button class="explore-btn" onclick="_hideExploreOverlay();goDeeper()">Descendre</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`
    },
    [CELL.STAIRS_U]: {
      icon:  SCENE_ICONS.stairs_u,
      title: 'Escalier Montant',
      desc:  'Un escalier de pierre remonte vers les étages supérieurs, moins dangereux.',
      btns:  `<button class="explore-btn" onclick="_hideExploreOverlay();goUp()">Remonter</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">Rester ici</button>`
    },
    [CELL.FOUNTAIN]: {
      icon:  SCENE_ICONS.fountain({ dried: fountainDried }),
      title: 'Fontaine de Pierre',
      desc:  fountainDried
        ? "L'eau de la fontaine s'est tarie. Vous devrez quitter cet étage et revenir plus tard pour qu'elle se remplisse à nouveau."
        : "Une vasque sculptée laisse s'écouler une eau bleutée luminescente. Boire ici restaurera entièrement la santé et la magie du groupe.",
      btns:  fountainDried
        ? `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
        : `<button class="explore-btn" onclick="useFountain();_hideExploreOverlay()">Boire à la fontaine</button>
           <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Enrichissement du donjon §2.B — Autel Ancien : tribut risque/récompense.
    [CELL.ALTAR]: altarSpent ? {
      icon:  SCENE_ICONS.altar,
      title: 'Autel Ancien',
      desc:  "L'autel est retombé dans le silence. Son pouvoir ne se ranimera qu'à votre prochaine visite de cet étage.",
      btns:  `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    } : {
      icon:  SCENE_ICONS.altar,
      title: 'Autel Ancien',
      desc:  "Une dalle de pierre runique pulse d'une lueur sourde. On raconte qu'un tribut bien choisi attire la faveur des anciens — ou leur courroux.",
      btns:  `<button class="explore-btn" onclick="useAltar('gold')">Offrande d'or (${altarCost} G) — soin complet + XP</button>
              <button class="explore-btn" onclick="useAltar('gamble')">Pari du sang — gratuit, 50/50</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Endgame Tranche 2 — Forge des Ténèbres : upgrade des items équipés.
    // Voir ENDGAME_PLAN.md §7.5 + js/forge.js — openForge.
    [CELL.FORGE]: {
      icon:  SCENE_ICONS.forge,
      title: 'Forge des Ténèbres',
      desc:  "Une enclume noire repose sur des charbons éternels. Le métal des Ténèbres peut renforcer vos équipements — au prix d'or et d'essence.",
      btns:  `<button class="explore-btn" onclick="openForge();_hideExploreOverlay()">Forger</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Endgame Tranche 2 — Bibliothèque interdite : upgrade des sorts.
    // Voir ENDGAME_PLAN.md §7.6 + js/library.js — openLibrary.
    [CELL.LIBRARY]: {
      icon:  SCENE_ICONS.library,
      title: 'Bibliothèque interdite',
      desc:  "Un pupitre sculpté porte un grimoire dont les pages flottent légèrement. Y déchiffrer un sort en amplifie la puissance — moyennant or et Pages de Grimoire.",
      btns:  `<button class="explore-btn" onclick="openLibrary();_hideExploreOverlay()">Étudier</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Enrichissement V2 §3 — Stèle d'énigme : devinette gardant un coffre.
    [CELL.STELE]: {
      icon:  SCENE_ICONS.stele,
      title: 'Stèle Runique',
      desc:  steleRiddle
        ? (_steleFeedback ? _steleFeedback + ' ' : '') + steleRiddle.question
        : (steleSolved
            ? "La stèle s'est tue, son énigme résolue : les glyphes ne brillent plus."
            : "Une stèle de pierre couverte de glyphes inertes — aucune énigme ne s'y forme."),
      btns:  steleBtns
    },
    // Potions P6.b3 — Jardin d'herbes : récolte le pool mûri (par pas/descente).
    [CELL.GARDEN]: {
      icon:  SCENE_ICONS.garden ? SCENE_ICONS.garden((typeof _gardenHerbTier === 'function') ? _gardenHerbTier(currentFloor) : 1) : '🌿',
      title: "Jardin d'herbes",
      desc:  gardenReady > 0
        ? `Des herbes magiques ont poussé entre les pierres luminescentes — ${gardenReady} brin${gardenReady > 1 ? 's' : ''} prêt${gardenReady > 1 ? 's' : ''} à cueillir.`
        : "Un carré de terre magique frémit doucement, mais rien n'a encore mûri. Continuez d'explorer le château : les herbes y pousseront, et chaque descente les fera mûrir plus vite.",
      btns:  gardenReady > 0
        ? `<button class="explore-btn" onclick="useGarden();_hideExploreOverlay()">Récolter (${gardenReady})</button>
           <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
        : `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    },
    // Easter egg « Salle sur Demande » — refuge (repos sûr + buff) + objet
    // unique la 1ʳᵉ fois. Tarie pour la visite une fois le refuge pris, sauf
    // si l'objet unique reste à récupérer (sac plein la fois précédente).
    [CELL.REQUIREMENT]: (requirementSpent && !requirementGift) ? {
      icon:  (typeof SCENE_ICONS !== 'undefined' && SCENE_ICONS.requirement) ? SCENE_ICONS.requirement : '🚪',
      title: 'La Salle sur Demande',
      desc:  "La Salle s'est refermée sur elle-même. Quittez cet étage et revenez plus tard pour qu'elle se transforme à nouveau.",
      btns:  `<button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    } : {
      icon:  (typeof SCENE_ICONS !== 'undefined' && SCENE_ICONS.requirement) ? SCENE_ICONS.requirement : '🚪',
      title: 'La Salle sur Demande',
      desc:  reqVar.desc,
      btns:  `<button class="explore-btn" onclick="useRequirementRoom();_hideExploreOverlay()">${reqVar.btn}</button>
              <button class="explore-btn secondary" onclick="_hideExploreOverlay()">S'éloigner</button>`
    }
  };
}

function _showExploreOverlay(cell) {
  const desc = _exploreDescriptors()[cell];
  if (!desc) return;
  const icon    = safeEl('explore-icon');
  const title   = safeEl('explore-title');
  const descEl  = safeEl('explore-desc');
  const actions = safeEl('explore-actions');
  const overlay = safeEl('explore-overlay');
  if (!icon || !title || !descEl || !actions || !overlay) return;
  icon.innerHTML       = desc.icon;
  title.textContent    = desc.title;
  descEl.textContent   = desc.desc;
  actions.innerHTML    = desc.btns;
  overlay.style.display = 'flex';
}

function _hideExploreOverlay() {
  const overlay = safeEl('explore-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Transition d'étage ───────────────────────────────────────
function _floorTransition(level, locationName, callback) {
  const overlay = document.getElementById('floor-transition');
  document.getElementById('ft-level').textContent = `Niveau ${level}`;
  document.getElementById('ft-name').textContent  = locationName;
  overlay.classList.add('active');
  setTimeout(() => {
    if (callback) callback();
    setTimeout(() => overlay.classList.remove('active'), 600);
  }, 1400);
}

function handleCellEntry(cell) {
  const btn = document.getElementById('btn-interact');
  btn.style.display = 'none';
  _hideExploreOverlay();
  updateRoomStatus();

  // Mondes parallèles §6.4 — en visite, le visiteur observe sans agir :
  // pas de piège déclenché (mutation du donjon distant), pas de PNJ
  // (Phase E pour les dialogues astraux), pas d'activation de rune.
  const inVisit = typeof visitSession !== 'undefined' && visitSession
    && visitSession.role === 'visitor';

  // Jardin d'herbes (Potions P6.b3) : un jardin encore caché se comporte
  // comme du sol (aucun overlay) ; révélé, il ouvre l'overlay de récolte.
  const gardenHidden = cell === CELL.GARDEN
    && typeof gardenHiddenAt === 'function' && gardenHiddenAt(playerX, playerY);

  if (cell === CELL.STAIRS_D || cell === CELL.STAIRS_U ||
      cell === CELL.SHOP     || cell === CELL.CHEST    ||
      cell === CELL.FOUNTAIN || cell === CELL.ALTAR    ||
      cell === CELL.FORGE    || cell === CELL.LIBRARY  ||
      cell === CELL.REQUIREMENT ||
      (cell === CELL.GARDEN  && !gardenHidden)) {
    _showExploreOverlay(cell);
  } else if (cell === CELL.TRAP) {
    if (inVisit) {
      // Le piège dort — il n'a pas été tendu pour cette présence.
      return;
    }
    // Piège déclenché en marchant dessus : la case est consommée puis
    // l'effet est appliqué (cf. _triggerDungeonTrap — Phase 2 §2.A).
    dungeon[playerY][playerX] = CELL.FLOOR;
    renderMinimap();
    _triggerDungeonTrap();
  } else if (cell === CELL.NPC) {
    const npcId = npcPlacements.get(`${playerX},${playerY}`);
    if (inVisit) {
      // Mondes parallèles §6.2 / Phase E — dialogue voyageur.
      // Banque `dialoguesAstral` ou fallback générique par rôle, sans
      // aucune action engageante (quête / vendeur / spéciale grisées).
      if (npcId && typeof openAstralNpcDialog === 'function') {
        openAstralNpcDialog(npcId);
      } else if (typeof addMsg === 'function') {
        addMsg('Le personnage ne te perçoit pas — tu n\'es qu\'une ombre dans son plan.', '');
      }
      return;
    }
    if (npcId && typeof openNpcDialog === 'function') {
      openNpcDialog(npcId);
    }
  } else if (cell === CELL.RUNE) {
    if (inVisit) return;
    // Dalle-rune d'un puzzle d'exploration : marcher dessus l'allume
    // (cf. _activateRune — dungeon-enrichment-v2 §1/§2).
    _activateRune();
  } else if (cell === CELL.STELE) {
    // Stèle d'énigme : ouvre l'overlay de devinette (cf. answerSteleRiddle —
    // dungeon-enrichment-v2 §3). Feedback remis à zéro à chaque ouverture.
    _steleFeedback = '';
    _showExploreOverlay(CELL.STELE);
  } else {
    // Inscription-indice d'un puzzle runique ordonné : la case courante
    // peut porter le vers décrivant l'ordre d'éveil des runes.
    if (runePuzzle && runePuzzle.hint
        && runePuzzle.hintCell === `${playerX},${playerY}`) {
      setNarrative(runePuzzle.hint);
      if (typeof addMsg === 'function') addMsg('📜 ' + runePuzzle.hint, 'magic');
    } else if (Math.random() < 0.15) {
      if (Math.random() < 0.08) {
        setNarrative(NARRATIVES.trap);
        if (typeof DFX_safe !== 'undefined') DFX_safe.shakeView('light');
        const alive  = party.filter(c => c.hp > 0);
        const target = alive[Math.floor(Math.random() * alive.length)];
        const dmg    = Math.ceil(Math.random() * 5 + 2);
        target.hp    = Math.max(0, target.hp - dmg);
        addMsg(`Piège ! ${target.name} perd ${dmg} PV`, 'bad');
        updateUI();
        if (party.every(c => c.hp <= 0)) triggerDeath("Un piège sournois a vaincu le groupe...");
      }
    } else {
      setNarrative(NARRATIVES.floor[Math.floor(Math.random() * NARRATIVES.floor.length)]);
    }
  }
}


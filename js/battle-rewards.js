// ============================================================
// COMBAT — Fin de combat, gains & montée de niveau
// ============================================================
// endBattle (gains XP/or/drops/points Maison/quêtes), checkLevelUp +
// _grantLevel*, closeLevelup. Dépend de battle.js (état de combat, helpers).
// Chargé APRÈS battle.js.
// ============================================================
// ── Fin de combat ────────────────────────────────────────────
function endBattle(won) {
  document.getElementById('encounter-overlay').style.display = 'none';
  document.body.classList.remove('in-battle');
  document.body.classList.remove('in-astral-combat');
  document.getElementById('target-selection').style.display  = 'none';
  inBattle = false;

  // Restaurer les stats (annule les debuffs temporaires comme weaken)
  recalculateStats();
  clearAllStatuses();

  AudioSystem.stopCombatMusic();

  // Phase H §6.9 — combat de résolution d'un Verrou de Sang (côté host).
  // En complément du flow normal (XP / or / drops / quêtes), on remonte
  // le statut au serveur et on distribue un loot bonus (50 or + 1
  // fragment Voyageur côté host). Le flag est consommé ici puisque la
  // mécanique standard continue ensuite.
  if (typeof inSealedCombat !== 'undefined' && inSealedCombat) {
    const seal = currentBloodSeal;
    inSealedCombat   = false;
    currentBloodSeal = null;
    if (seal && typeof mpUpdateSealStatus === 'function') {
      try { mpUpdateSealStatus(seal.id, won ? 'resolved' : 'fled'); }
      catch (e) { /* tolérant */ }
    }
    if (won) {
      const bonusGold = 50;
      player.gold += bonusGold;
      if (typeof addMsg === 'function') {
        addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/spells/verrou_de_sang.png" alt=""> Verrou résolu — ${seal && seal.visitor_name ? seal.visitor_name + ' te remercie depuis son plan' : 'un voyageur lointain te salue'}. +${bonusGold} G.`, 'magic');
      }
      if (typeof outremondeFragments === 'number') outremondeFragments += 1;
      if (typeof addMsg === 'function') {
        addMsg(`<img class="ui-icon ui-icon-md" src="img/icons/fragment_outremonde.png" alt=""> +1 fragment cosmétique du Voyageur (réserve : ${outremondeFragments}).`, 'good');
      }
    }
    // Le flow normal continue (XP / or / drops du monstre).
  }

  // Phase G §6.8 — combat astral : court-circuite la mécanique standard
  // (pas d'XP/or/drops dans la save, pas de quêtes kill, pas de points de
  // Maison, pas d'ironman). Gains routés vers outremondeEssence — voir
  // `_finishAstralCombat` ci-dessous.
  if (inAstralCombat) {
    _finishAstralCombat(won);
    return;
  }

  // Duel multijoueur (§5) : issue PvP — pas de drops/XP PvE. Une défaite
  // arrive ici uniquement par fuite (`won` faux) ; un groupe vaincu passe
  // par `triggerDeath` (intercepté dans enemyTurn). Victoire → récompense.
  if (mpDuelActive) {
    const meta = mpDuelMeta;
    mpDuelActive = false;
    mpDuelMeta   = null;
    if (won && typeof _mpResolveDuelVictory === 'function') {
      _mpResolveDuelVictory(meta);
    } else {
      setNarrative('Le duel s\'interrompt — chacun reprend sa route.');
    }
    recolteGoldBonus = false;
    updateUI();
    safeCall('autoSave', 'duel-end');
    return;
  }

  if (won) {
    enemyMap[playerY][playerX] = null;
    // Trace la cellule pour le respawn 20 % au retour d'étage (cf. _respawnEnemiesOnEntry).
    if (typeof defeatedCellsByFloor !== 'undefined' && typeof currentFloor === 'number') {
      if (!defeatedCellsByFloor.has(currentFloor)) defeatedCellsByFloor.set(currentFloor, new Set());
      defeatedCellsByFloor.get(currentFloor).add(`${playerX},${playerY}`);
    }
    // Décrémente le cooldown combat de Portus (réarme après N victoires).
    if (typeof portusFightCooldown === 'number' && portusFightCooldown > 0) {
      portusFightCooldown--;
    }
    // Compteur de kills cumulés par étage (scaling progressif de la
    // difficulté — cf. rollGroupSize). 1 monstre tué = +1.
    if (typeof floorKillCount !== 'undefined' && typeof currentFloor === 'number') {
      const killsThisFight = enemyGroup.length;
      floorKillCount.set(currentFloor, (floorKillCount.get(currentFloor) || 0) + killsThisFight);
    }
    // Kills cumulés par espèce (panneau d'info combat — révélation progressive).
    if (typeof monsterKills !== 'undefined') {
      enemyGroup.forEach(e => { if (e.id) monsterKills[e.id] = (monsterKills[e.id] || 0) + 1; });
    }
    // Compteurs de score Ironman (monstres vaincus + faits d'armes boss).
    if (typeof recordIronmanKills === 'function') recordIronmanKills(enemyGroup);
    const diff     = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal'];
    // Récolte Magique (palier Mythe Poufsouffle) : or de ce combat +50 %.
    const recolteMult = recolteGoldBonus ? 1.5 : 1;
    // Bonus d'équipement : somme des bonusGoldMult portés par tous les
    // items équipés du groupe (ex. Reliquaire Lunaire = 0.20). Stack
    // multiplicatif avec Récolte Magique. Cf. game-economy-gold-audit.md §5.6.
    const equipGoldMult = (typeof _equipmentGoldMultiplier === 'function')
      ? _equipmentGoldMultiplier() : 1;
    let totalXp = 0, totalGold = 0;
    enemyGroup.forEach(e => { totalXp += e.xp; totalGold += e.gold + Math.floor(Math.random() * 5); });

    // XP et or multipliés selon la difficulté
    player.xp   += Math.floor(totalXp   * diff.xpMultiplier);
    player.gold += Math.floor(totalGold * diff.goldMultiplier * recolteMult * equipGoldMult);

    // Drops d'objets (chance modulée par la difficulté + bonus Ténèbres).
    // Endgame §7.9 : sur variant `darkness`, drop standards ×1.5 et roll
    // bonus 8 % sur 1 des 3 drops Ténèbres légendaires.
    const TENEBRES_DROPS = ['cape_voldemort', 'cendres_phenix', 'oeil_basilic'];
    enemyGroup.forEach(e => {
      const darkMult = (e.variant === 'darkness') ? 1.5 : 1.0;
      if (e.drops && e.drops.length) {
        e.drops.forEach(drop => {
          if (Math.random() < drop.chance * diff.dropChanceMultiplier * darkMult) {
            const item = ITEMS.find(i => i.id === drop.itemId);
            if (item && tryAddItem(item, { silent: true })) {
              addMsg(`<img class="ui-icon ui-icon-sm" src="img/icons/accessory.png" alt=""> Drop : ${getItemIconHtml(item, 'ui-icon-sm')} ${item.name} !`, 'good');
            }
          }
        });
      }
      if (e.variant === 'darkness') {
        if (Math.random() < 0.08) {
          const pickId = TENEBRES_DROPS[Math.floor(Math.random() * TENEBRES_DROPS.length)];
          const item   = ITEMS.find(i => i.id === pickId);
          if (item && tryAddItem(item, { silent: true })) {
            addMsg(`${getItemIconHtml(item, 'ui-icon-md')} Butin des Ténèbres : ${item.name} !`, 'magic');
          }
        }
        // Drop 5 % Élixir Suprême HP/SP (random entre les deux)
        if (Math.random() < 0.05) {
          const xlId = Math.random() < 0.5 ? 'potion_xl' : 'potion_xl_sp';
          const item = ITEMS.find(i => i.id === xlId);
          if (item && tryAddItem(item, { silent: true })) {
            addMsg(`${getItemIconHtml(item, 'ui-icon-md')} Drop des Ténèbres : ${item.name} !`, 'good');
          }
        }
        // Drop 30 % Larme du Phénix Pure — UNIQUEMENT sur Voldemort Ténébreux
        if (e.id === 'voldemort_revenu' && Math.random() < 0.30) {
          const item = ITEMS.find(i => i.id === 'larme_phenix_pure');
          if (item && tryAddItem(item, { silent: true })) {
            addMsg(`${getItemIconHtml(item, 'ui-icon-md')} Drop unique : ${item.name} !`, 'magic');
          }
        }
      }
      // Matériaux endgame (Tranche 2) — gate étage 11+ (boucle ténébreuse).
      // Variant darkness boost le drop ×2 (cf. .claude/plans/forge-library-audit.md §4.2).
      if ((currentFloor || 0) >= 11) {
        const isDark   = e.variant === 'darkness';
        const essRate  = isDark ? 0.03 : 0.015;
        const pageRate = isDark ? 0.02 : 0.01;
        if (Math.random() < essRate) {
          const item = ITEMS.find(i => i.id === 'essence_tenebres');
          if (item && tryAddItem(item, { silent: true })) {
            addMsg(`${getItemIconHtml(item, 'ui-icon-md')} Matériau : ${item.name}`, 'magic');
          }
        }
        if (Math.random() < pageRate) {
          const item = ITEMS.find(i => i.id === 'page_grimoire');
          if (item && tryAddItem(item, { silent: true })) {
            addMsg(`${getItemIconHtml(item, 'ui-icon-md')} Matériau : ${item.name}`, 'magic');
          }
        }
      }
    });

    // Progression des quêtes de type "kill"
    enemyGroup.forEach(e => safeCall('checkKillQuests', e.id));

    // Endgame : déclenche la modale de victoire si Voldemort Ressuscité
    // est tombé. No-op pour tout autre monstre ou si déjà déclenché.
    enemyGroup.forEach(e => safeCall('checkVictoryTrigger', e.id));

    const xpEarned   = Math.floor(totalXp   * diff.xpMultiplier);
    const goldEarned = Math.floor(totalGold * diff.goldMultiplier * recolteMult * equipGoldMult);
    // Fusionne les deux bonus or sur une seule ligne pour éviter le spam
    // (un perso avec Récolte Magique + Reliquaire Lunaire affichait 2 lignes
    // chaque combat). Ordre : Récolte (si actif) > Reliquaire (si actif).
    const bonusLabels = [];
    if (recolteGoldBonus)        bonusLabels.push('🌾 Récolte +50%');
    if (equipGoldMult > 1.001) {
      const pct = Math.round((equipGoldMult - 1) * 100);
      bonusLabels.push(`🌙 Reliquaire +${pct}%`);
    }
    if (bonusLabels.length) {
      addMsg(`Gallions majorés (${bonusLabels.join(' · ')})`, 'good');
    }

    // Points de Maison selon la difficulté — Ténèbres ×1.5 (endgame §7.9).
    if (chosenHouse) {
      const baseGain = HOUSE_POINTS_PER_KILL[difficulty] || HOUSE_POINTS_PER_KILL.Normal;
      const darkKills = enemyGroup.filter(e => e.variant === 'darkness').length;
      const normalKills = enemyGroup.length - darkKills;
      const hpGain = Math.floor(baseGain * normalKills + baseGain * darkKills * 1.5);
      // Au moins le gain "1 kill normal" pour rester rétrocompatible
      housePoints += Math.max(baseGain, hpGain);
      safeCall('checkHouseLevelUp');
    }

    AudioSystem.playVictory();
    setNarrative(`Victoire ! +${xpEarned} XP, +${goldEarned} Gallions.`);
    addMsg(`+${xpEarned} XP`, 'good');
    addMsg(`+${goldEarned} Gallions`, 'good');
    checkLevelUp();
    renderMinimap();
  }
  // Effets de combat transient consommés à la sortie (Récolte Magique).
  recolteGoldBonus = false;
  updateUI();
  safeCall('autoSave', won ? 'battle-end' : 'battle-flee');
}

// ── Montée de niveau (synchronisée pour le groupe) ───────────
function checkLevelUp() {
  if (player.xp < player.xpNext) return;

  player.level++;
  player.xp     -= player.xpNext;
  player.xpNext  = Math.floor(player.xpNext * LEVEL_UP_XP_MULTIPLIER);

  party.slice(0, partySize).forEach(c => {
    _grantLevelHpSp(c);
    _grantLevelStats(c);
    _grantLevelStatPoints(c);
  });
  // Recalculer atk/def/mag/lck + hpMax/spMax = base + bonus équipement
  recalculateStats();
  // Full heal au passage de niveau (après recalc → inclut bonusHpMax/SpMax).
  party.slice(0, partySize).forEach(c => { c.hp = c.hpMax; c.sp = c.spMax; });

  AudioSystem.playLevelUp();
  document.getElementById('levelup-text').textContent = `Le groupe passe au niveau ${player.level} !`;
  document.getElementById('levelup-modal').style.display = 'flex';
  addMsg(`Niveau ${player.level} ! +${STAT_POINTS_PER_LEVEL} points à allouer par perso`, 'good');

  _grantLevelSpells(player.level);

  updateUI();
  safeCall('autoSave', 'level-up');
}

// Accumule STAT_POINTS_PER_LEVEL sur le perso. Le joueur dépense les
// points via la fiche perso (ui.js — allocateStatPoint).
function _grantLevelStatPoints(c) {
  if (typeof STAT_POINTS_PER_LEVEL !== 'number') return;
  c.unallocatedStatPoints = (c.unallocatedStatPoints || 0) + STAT_POINTS_PER_LEVEL;
}

// Sync niveau/xp + grant PV/PM max de BASE +8/+5 au passage de niveau.
// Le full heal est appliqué après recalculateStats() dans checkLevelUp()
// pour intégrer les bonus hpMax/spMax d'équipement.
function _grantLevelHpSp(c) {
  c.level  = player.level;
  c.xpNext = player.xpNext;
  if (c._baseHpMax === undefined) c._baseHpMax = c.hpMax;
  if (c._baseSpMax === undefined) c._baseSpMax = c.spMax;
  c._baseHpMax += 8;
  c._baseSpMax += 5;
}

// Incrémenter les stats de BASE (indépendamment de l'équipement).
// recalculateStats() reconstruit ensuite c.str/c.int/c.agi à partir
// de _baseStr/_baseInt/_baseAgi + bonus d'équipement.
function _grantLevelStats(c) {
  c._baseAtk += 1;  c._baseDef += 1;  c._baseMag += 1;
  if (c._baseStr === undefined) c._baseStr = c.str;
  if (c._baseInt === undefined) c._baseInt = c.int;
  if (c._baseAgi === undefined) c._baseAgi = c.agi;
  c._baseStr += 1;  c._baseInt += 1;  c._baseAgi += 1;
}

// Table de progression des sorts par niveau (hardcodée Harry/Hermione).
// Niveau 9 : déverrouille aussi le flag `locked` de "Avada..." dans SPELLS.
function _grantLevelSpells(level) {
  const teach = (char, spellName) => {
    if (!char.spells.includes(spellName)) {
      char.spells.push(spellName);
      setTimeout(() => addMsg(`${getSpellIconHtml(spellName, 'ui-icon-md')} ${char.name} apprend : ${spellName} !`, 'magic'), 400);
    }
  };

  switch (level) {
    case 2:
      // Hermione complète sa palette d'attaque de base
      teach(player2, 'Expelliarmus');
      break;
    case 3:
      // Harry débloque le vol magique, Hermione les étourdissements
      teach(player,  'Accio');
      teach(player2, 'Stupefix');
      break;
    case 4:
      // Harry apprend la lévitation offensive
      teach(player, 'Wingardium Leviosa');
      // Hermione (rôle soutien) apprend Ferula — bandage + régen
      teach(player2, 'Ferula');
      break;
    case 5:
      // Hermione maîtrise la lacération, Harry le soin avancé
      teach(player,  'Reparo');
      teach(player2, 'Diffindo');
      break;
    case 6:
      // Harry rejoint Hermione sur Ferula (soutien partagé)
      teach(player, 'Ferula');
      break;
    case 7:
      // Symétrie : chacun apprend le sort de spécialité de l'autre
      teach(player,  'Diffindo');
      teach(player2, 'Wingardium Leviosa');
      teach(player2, 'Reparo');
      // Hermione (soutien) maîtrise la régénération de groupe
      teach(player2, 'Ferula Maxima');
      break;
    case 8:
      // Cheminette Inter-Mondes — sort de portail vers un donjon
      // parallèle. Voir parallel-worlds.md §4. Enseigné aux deux
      // héros pour ne pas dépendre du choix solo/duo.
      teach(player,  'Cheminette Inter-Mondes');
      teach(player2, 'Cheminette Inter-Mondes');
      break;
    case 9: {
      // La Malédiction Impardonnable — déverrouillée pour les deux
      const avada = SPELLS.find(s => s.name === 'Avada...');
      if (avada) avada.locked = false;
      teach(player,  'Avada...');
      teach(player2, 'Avada...');
      setTimeout(() => addMsg('⚠️ Malédiction Impardonnable déverrouillée !', 'bad'), 600);
      break;
    }
  }
}

function closeLevelup() {
  document.getElementById('levelup-modal').style.display = 'none';
}


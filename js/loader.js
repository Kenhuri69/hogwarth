// ============================================================
// LOADER — Validation des modules globaux au démarrage
// ============================================================
// Le projet charge ~30 fichiers JS via <script> séquentiels. Chaque
// fichier ajoute ses fonctions/objets au scope global. Si l'un d'eux
// plante au parse (typo, erreur top-level), les suivants chargent
// quand même et les bugs deviennent silencieux : les `if (window.UX)`
// ou `typeof X === 'function'` court-circuitent sans alerte.
//
// Ce fichier doit être chargé EN DERNIER dans index.html. Il vérifie
// la présence de tous les globals attendus, log les manquants et
// affiche un bandeau d'erreur visible si un module critique est
// absent.
//
// Référence : .claude/plans/code-improvements.md §A1
// ============================================================

// ── Helpers d'accès défensif (§A3) ───────────────────────────
// Exposés sur window. Disponibles partout au runtime (loader.js
// charge en dernier, mais les fonctions consommatrices s'exécutent
// après — au premier geste utilisateur ou appel game logic).
//
// safeEl(id)       → document.getElementById avec warn dédupé
// safeCall(name)   → invoque window[name](...) si défini, sinon undef
window.safeEl = (function () {
  const warned = new Set();
  return function safeEl(id) {
    const el = document.getElementById(id);
    if (!el && !warned.has(id)) {
      warned.add(id);
      console.warn('[DOM] Element manquant: #' + id);
    }
    return el;
  };
})();

window.safeCall = function safeCall(name /*, ...args */) {
  const fn = window[name];
  if (typeof fn !== 'function') return undefined;
  const args = Array.prototype.slice.call(arguments, 1);
  return fn.apply(null, args);
};

// UX_safe — surcouche tolérante à l'absence de window.UX
// Avant : if (window.UX) { UX.floatDmg(...); UX.logCombat(...); }
// Après : UX_safe.floatDmg(...); UX_safe.logCombat(...);
// Si window.UX n'existe pas (ux-improvements.js non chargé), les appels
// retournent undefined silencieusement — comportement identique à l'ancien
// `if (window.UX)` mais sans `if` répété.
window.UX_safe = new Proxy({}, {
  get(_target, method) {
    return function (/* ...args */) {
      const ux = window.UX;
      if (!ux || typeof ux[method] !== 'function') return undefined;
      return ux[method].apply(ux, arguments);
    };
  }
});

(function () {
  // ── Manifeste des modules attendus ───────────────────────────
  // Chaque entrée : { name, source, kind, critical }
  //   kind = 'fn'  → typeof === 'function'
  //   kind = 'obj' → typeof !== 'undefined'  (couvre let/const/var)
  //   critical = true → bandeau rouge si absent
  //              false → simple log info (module optionnel)
  //
  // typeof avec un identifiant nu est sûr : ne throw pas pour les
  // identifiants non déclarés (retourne "undefined").
  const MANIFEST = [
    // ── Données de référence (critiques) ──
    { name: 'htmlEscape',         source: 'html-escape.js',  kind: 'fn'  },
    { name: 'MONSTERS',           source: 'monsters.js',     kind: 'obj' },
    { name: 'SPELLS',             source: 'data-spells.js',     kind: 'obj' },
    { name: 'ITEMS',              source: 'data-items.js',      kind: 'obj' },
    { name: 'CHARACTERS',         source: 'data-characters.js', kind: 'obj' },
    { name: 'LOCATIONS',          source: 'data-world.js',      kind: 'obj' },
    { name: 'CELL',               source: 'data.js',         kind: 'obj' },
    { name: 'MAP_W',              source: 'data.js',         kind: 'obj' },
    { name: 'GRIMOIRE_PAGES',     source: 'data-spells.js',     kind: 'obj' },
    { name: 'ACT3_PAGES',         source: 'data-spells.js',     kind: 'obj' },
    { name: '_activePageSet',     source: 'data-spells.js',     kind: 'fn'  },
    { name: 'fuseAct3',           source: 'quests-riddles.js', kind: 'fn' },
    { name: 'hiverClair',         source: 'state.js',        kind: 'obj' },
    { name: 'headlessHuntMember', source: 'state.js',        kind: 'obj' },
    { name: 'HERO_BARKS',         source: 'hero-barks.js',   kind: 'obj', optional: true },
    { name: 'pickHeroBark',       source: 'hero-barks.js',   kind: 'fn',  optional: true },
    { name: 'heroBark',           source: 'hero-barks.js',   kind: 'fn',  optional: true },
    { name: 'heroBarkScripted',   source: 'hero-barks.js',   kind: 'fn',  optional: true },
    { name: 'maitreDeLaMort',     source: 'state.js',        kind: 'obj' },
    { name: 'checkHallowsUnion',  source: 'inventory-core.js', kind: 'fn' },
    { name: 'RIDDLES_LUMIERE',    source: 'data-spells.js',     kind: 'obj' },
    { name: 'NPCS',               source: 'npcs.js',         kind: 'obj' },
    { name: 'RIDDLES',            source: 'riddles.js',      kind: 'obj' },
    { name: 'getRiddleById',      source: 'riddles.js',      kind: 'fn'  },
    { name: 'CODEX_ENTRIES',      source: 'codex.js',        kind: 'obj' },
    { name: 'getCodexEntry',      source: 'codex.js',        kind: 'fn'  },
    { name: 'codexEntryState',    source: 'codex.js',        kind: 'fn'  },
    { name: 'unlockedCodexFor',   source: 'codex.js',        kind: 'fn'  },
    { name: 'codexVariantNote',   source: 'codex.js',        kind: 'fn'  },
    { name: 'FLOOR_THEMES',       source: 'floor-themes.js',  kind: 'obj' },
    { name: 'getFloorTheme',      source: 'floor-themes.js',  kind: 'fn'  },
    { name: 'ZONE_AMBIANCE',      source: 'floor-ambiance.js', kind: 'obj' },
    { name: 'getFloorAmbiance',   source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'corruptionLevel',    source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'houseAmbianceLine',  source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'HOUSE_PERCEPTION',   source: 'floor-ambiance.js', kind: 'obj', optional: true },
    { name: 'housePerceptionLine', source: 'floor-ambiance.js', kind: 'fn', optional: true },
    { name: 'houseRoomBias',      source: 'floor-ambiance.js', kind: 'fn', optional: true },
    { name: 'FLOOR_SCRIPTED_BEATS', source: 'floor-ambiance.js', kind: 'obj' },
    { name: 'GRANDE_SALLE_BEAT',  source: 'floor-ambiance.js', kind: 'obj' },
    { name: 'getScriptedFloorBeat', source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'maybeScriptedFloorBeat', source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'temporalEchoActive', source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'temporalEchoTier',  source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'echoLine',          source: 'floor-ambiance.js', kind: 'fn'  },
    { name: 'FOUNDER_VOICES',    source: 'floor-ambiance.js', kind: 'obj' },
    { name: 'TEMPORAL_ECHOES',   source: 'floor-ambiance.js', kind: 'obj' },
    { name: 'FOUNDER_CHAMBERS',  source: 'floor-ambiance.js', kind: 'obj' },
    { name: 'getFounderChamberBeat',  source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'maybeFounderChamberBeat', source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'getSignatureEchoBeat',   source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'maybeSignatureEchoBeat', source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'getSalazarPactBeat',     source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'maybeSalazarPactBeat',   source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'isVoixDesRuinesCrossing', source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'maybeVoixDesRuinesBeat',  source: 'floor-ambiance.js', kind: 'fn' },
    { name: 'FLOOR_EVENTS',       source: 'floor-events.js',  kind: 'obj' },
    { name: 'rollFloorEvent',     source: 'floor-events.js', kind: 'fn'  },
    { name: 'maybeRoomFlavor',    source: 'room-flavor.js',  kind: 'fn',  optional: true },
    { name: 'RoomFlavor',         source: 'room-flavor.js',  kind: 'obj', optional: true },

    // ── État global (critiques) ──
    { name: 'player',             source: 'state.js',        kind: 'obj' },
    { name: 'player2',            source: 'state.js',        kind: 'obj' },
    { name: 'party',              source: 'state.js',        kind: 'obj' },
    { name: 'partySize',          source: 'state.js',        kind: 'obj' },
    { name: 'HOUSE_BONUSES',      source: 'state.js',        kind: 'obj' },
    { name: 'refugeTheme',        source: 'state.js',        kind: 'fn'  },
    { name: 'DIFFICULTY_SETTINGS',source: 'state.js',        kind: 'obj' },
    { name: 'defeatedCellsByFloor',source: 'state.js',       kind: 'obj' },
    { name: 'floorKillCount',     source: 'state.js',        kind: 'obj' },
    { name: 'monsterKills',       source: 'state.js',        kind: 'obj' },
    { name: 'visitedFloors',      source: 'state.js',        kind: 'obj' },
    { name: 'seenScriptedBeat',   source: 'state.js',        kind: 'obj' },
    { name: 'seenEchoes',         source: 'state.js',        kind: 'obj' },
    { name: 'unlockedCodexEntries', source: 'state.js',      kind: 'obj' },
    { name: 'floorReached',       source: 'state.js',        kind: 'obj' },
    { name: 'portusOocCooldown',  source: 'state.js',        kind: 'obj' },
    { name: 'portusFightCooldown',source: 'state.js',        kind: 'obj' },
    { name: 'healSpellCooldown',  source: 'state.js',        kind: 'obj' },
    { name: 'STAT_POINTS_PER_LEVEL',source: 'data.js',       kind: 'obj' },
    { name: 'STAT_POINT_EFFECTS', source: 'data.js',         kind: 'obj' },
    { name: 'allocateStatPoint',  source: 'ui-character-sheet.js', kind: 'fn'  },

    // ── Audio (critique) ──
    // audio-music.js / audio-sfx.js n'ajoutent PAS de global : ils étendent
    // l'objet AudioSystem (méthodes). Le check par identifiant nu (typeof)
    // ne peut donc pas les couvrir individuellement — leur absence se traduit
    // par des méthodes manquantes sur AudioSystem, pas par un global absent.
    { name: 'AudioSystem',        source: 'audio.js',        kind: 'obj' },

    // ── Icônes / textures ──
    { name: 'SCENE_ICONS',        source: 'scene-icons.js',  kind: 'obj' },
    { name: 'TEXTURES',           source: 'textures.js',     kind: 'obj' },
    { name: 'loadTextures',       source: 'textures.js',     kind: 'fn'  },
    { name: 'getMonsterIconHtml', source: 'icons.js',        kind: 'fn'  },
    { name: 'getItemIconHtml',    source: 'item-icons.js',   kind: 'fn'  },
    { name: 'iconizeCombatLog',   source: 'item-icons.js',   kind: 'fn'  },

    // ── UI (critiques) ──
    { name: 'updateUI',           source: 'ui.js',           kind: 'fn'  },
    { name: 'addMsg',             source: 'ui.js',           kind: 'fn'  },
    { name: 'confirmModal',       source: 'ui.js',           kind: 'fn'  },
    { name: 'openCharacter',      source: 'ui-character-sheet.js', kind: 'fn'  },
    { name: 'openHouseDetail',    source: 'ui.js',           kind: 'fn'  },
    { name: 'openBestiary',       source: 'ui-bestiary.js',  kind: 'fn'  },
    { name: 'switchCodexTab',     source: 'ui-bestiary.js',  kind: 'fn'  },
    { name: 'openCodex',          source: 'ui-codex.js',     kind: 'fn'  },
    { name: 'filterCodex',        source: 'ui-codex.js',     kind: 'fn'  },
    { name: 'showCodexEntry',     source: 'ui-codex.js',     kind: 'fn'  },
    { name: 'checkCodexUnlocks',  source: 'ui-codex.js',     kind: 'fn'  },

    // ── Donjon / rendu ──
    { name: 'generateDungeon',    source: 'dungeon.js',      kind: 'fn'  },
    { name: '_migrateMissingNpcsForFloor', source: 'dungeon-spawning.js', kind: 'fn' },
    { name: '_ensureActiveKillQuestTargets', source: 'dungeon-spawning.js', kind: 'fn' },
    { name: '_ensureStairsExist', source: 'dungeon-spawning.js', kind: 'fn' },
    { name: '_ensureFinalBossPresent', source: 'dungeon-spawning.js', kind: 'fn' },
    { name: '_ensureChamberGuardiansPresent', source: 'dungeon-spawning.js', kind: 'fn' },
    { name: 'effectiveFloor',     source: 'dungeon-scaling.js', kind: 'fn'  },
    { name: 'loopNumber',         source: 'dungeon-scaling.js', kind: 'fn'  },
    { name: 'isBruteMonster',     source: 'dungeon-scaling.js', kind: 'fn'  },
    { name: 'creatureCorruptionLevel', source: 'dungeon-scaling.js', kind: 'fn' },
    { name: 'drawDungeon',        source: 'renderer.js',     kind: 'fn'  },
    { name: 'drawNpcSprite',      source: 'renderer-entities.js', kind: 'fn' },
    { name: 'drawForgeSprite',    source: 'renderer-sprites.js', kind: 'fn' },
    { name: 'drawLibrarySprite',  source: 'renderer-sprites.js', kind: 'fn' },
    { name: 'renderMinimap',      source: 'renderer-minimap.js', kind: 'fn' },

    // ── Mouvement ──
    { name: 'move',               source: 'movement.js',     kind: 'fn'  },
    { name: 'moveForward',        source: 'movement.js',     kind: 'fn'  },
    { name: 'moveBackward',       source: 'movement.js',     kind: 'fn'  },
    { name: 'turnLeft',           source: 'movement.js',     kind: 'fn'  },
    { name: 'turnRight',          source: 'movement.js',     kind: 'fn'  },
    { name: 'kbResolveExplore',   source: 'keybindings.js',  kind: 'fn'  },
    { name: 'kbResolveCombat',    source: 'keybindings.js',  kind: 'fn'  },
    { name: 'initCanvasSwipeGestures', source: 'swipe-canvas.js', kind: 'fn' },
    { name: 'handleCellEntry',    source: 'movement.js',     kind: 'fn'  },
    { name: 'searchRoom',         source: 'movement-interactions.js', kind: 'fn' },
    { name: 'rest',               source: 'movement-interactions.js', kind: 'fn' },
    { name: 'goDeeper',           source: 'movement-floors.js', kind: 'fn' },
    { name: 'goUp',               source: 'movement-floors.js', kind: 'fn' },
    { name: '_changeFloor',       source: 'movement-floors.js', kind: 'fn' },

    // ── Combat ──
    { name: 'startBattle',        source: 'battle.js',       kind: 'fn'  },
    { name: 'endBattle',          source: 'battle-rewards.js', kind: 'fn'  },
    { name: 'triggerDeath',       source: 'battle-death.js', kind: 'fn'  },
    { name: 'resurrect',          source: 'battle-death.js', kind: 'fn'  },
    { name: 'battleAction',       source: 'battle.js',       kind: 'fn'  },
    { name: 'castSpellInBattle',  source: 'battle-spells.js',kind: 'fn'  },
    { name: '_buildSummonedAdd',  source: 'battle-spells.js',kind: 'fn'  },
    { name: 'openCombatTeleportChoice', source: 'teleport.js', kind: 'fn' },
    { name: 'openOutOfCombatTeleport',  source: 'teleport.js', kind: 'fn' },
    { name: 'teleportEnemyAway',        source: 'teleport.js', kind: 'fn' },
    { name: 'teleportOutOfCombat',      source: 'teleport.js', kind: 'fn' },
    { name: 'renderEnemyGroup',   source: 'battle-ui.js',    kind: 'fn'  },
    { name: 'showMonsterCombatInfo', source: 'battle-ui.js', kind: 'fn'  },

    // ── Inventaire ──
    { name: 'openInventory',      source: 'inventory.js',    kind: 'fn'  },
    { name: 'switchInvTab',       source: 'inventory.js',    kind: 'fn'  },
    { name: 'useItem',            source: 'inventory.js',    kind: 'fn'  },
    { name: 'equipItem',          source: 'inventory.js',    kind: 'fn'  },
    { name: 'recalculateStats',   source: 'inventory-core.js',   kind: 'fn'  },
    { name: 'partyFortune',       source: 'inventory-core.js',   kind: 'fn'  },
    { name: '_removeInvItem',     source: 'inventory-core.js',   kind: 'fn'  },
    { name: '_celeriteCurve',     source: 'inventory-core.js',   kind: 'fn'  },
    { name: 'openSpells',         source: 'inventory-spells.js', kind: 'fn'  },

    // ── Quêtes ──
    { name: 'openQuestLog',       source: 'quests.js',       kind: 'fn'  },
    { name: 'completeQuest',      source: 'quests.js',       kind: 'fn'  },
    { name: 'unlockHouseQuest',   source: 'quests.js',       kind: 'fn'  },
    { name: 'unlockHouseMytheQuest', source: 'quests.js',    kind: 'fn'  },
    { name: 'HOUSE_SET_QUESTS',   source: 'quests.js',       kind: 'obj' },
    { name: 'QUEST_TEMPLATES',    source: 'quests-templates.js', kind: 'obj' },

    // ── Concoction de potions ──
    { name: 'POTION_RECIPES',     source: 'data-items.js',      kind: 'obj' },
    { name: 'ITEM_ICON_SVG_REGISTRY', source: 'item-icons.js', kind: 'obj' },
    { name: 'openBrewingModal',   source: 'potions.js',      kind: 'fn'  },
    { name: 'attemptBrew',        source: 'potions.js',      kind: 'fn'  },
    { name: 'potionEvolveMult',   source: 'potions.js',      kind: 'fn'  },
    { name: 'addHerb',            source: 'potions.js',      kind: 'fn'  },

    // ── Boutique ──
    { name: 'openShop',           source: 'shop.js',         kind: 'fn'  },
    { name: 'openRequirementShop',source: 'shop.js',         kind: 'fn'  },
    { name: 'buyItem',            source: 'shop.js',         kind: 'fn'  },

    // ── Sauvegarde ──
    { name: 'saveGame',           source: 'save.js',         kind: 'fn'  },
    { name: 'loadGame',           source: 'save.js',         kind: 'fn'  },
    { name: 'autoSave',           source: 'save-slots.js',   kind: 'fn'  },
    { name: 'listSaveSlots',      source: 'save-slots.js',   kind: 'fn'  },
    { name: 'readSlot',           source: 'save-slots.js',   kind: 'fn'  },
    { name: 'writeSlot',          source: 'save-slots.js',   kind: 'fn'  },
    { name: 'deleteSlot',         source: 'save-slots.js',   kind: 'fn'  },
    { name: 'migrateLegacyKey',   source: 'save-slots.js',   kind: 'fn'  },
    { name: 'getRequirementCodex', source: 'save-slots.js',  kind: 'fn', optional: true }, // V3
    { name: 'getPlayerProfile',   source: 'profile.js',      kind: 'fn', optional: true }, // Ch.14 P5
    { name: 'recordEndingToProfile', source: 'profile.js',   kind: 'fn', optional: true }, // Ch.14 P5
    { name: 'ngPlusAvailable',    source: 'profile.js',      kind: 'fn', optional: true }, // Ch.14 P5
    { name: 'openWizardCodex',    source: 'profile.js',      kind: 'fn', optional: true }, // Ch.14 P6
    { name: 'exportSaveStore',    source: 'save-slots.js',   kind: 'fn'  },
    { name: 'importSaveStore',    source: 'save-slots.js',   kind: 'fn'  },
    { name: 'openSaveDialog',     source: 'save-ui.js',      kind: 'fn'  },
    { name: 'openLoadDialog',     source: 'save-ui.js',      kind: 'fn'  },
    { name: 'exportSaveToFile',   source: 'save-ui.js',      kind: 'fn'  },
    { name: 'importSaveFromFile', source: 'save-ui.js',      kind: 'fn'  },
    { name: 'enterStartHub',      source: 'save-ui.js',      kind: 'fn'  },
    { name: 'renderRequirementAlmanac', source: 'save-ui.js', kind: 'fn', optional: true }, // V3
    { name: 'startHubNewGame',    source: 'save-ui.js',      kind: 'fn'  },
    { name: 'loadSlotAndStart',   source: 'save-ui.js',      kind: 'fn'  },

    // ── Main / démarrage ──
    { name: 'showPlayerSelect',   source: 'main.js',         kind: 'fn'  },
    { name: 'startGame',          source: 'main.js',         kind: 'fn'  },
    { name: 'chooseHouse',        source: 'main.js',         kind: 'fn'  },
    { name: 'confirmHeroSelection',source: 'main.js',        kind: 'fn'  },
    { name: 'checkHouseLevelUp',  source: 'main.js',         kind: 'fn'  },
    { name: 'houseApotheosePassive', source: 'main.js',      kind: 'fn'  },

    // ── Endgame (écran de victoire + boucle Ténébreuse) ──
    { name: 'victoryAchieved',    source: 'state.js',        kind: 'obj' },
    { name: 'accumulatedEclats',  source: 'state.js',        kind: 'obj' },
    { name: 'cycleBroken',        source: 'state.js',        kind: 'obj' },
    { name: 'checkVictoryTrigger',source: 'endgame.js',      kind: 'fn'  },
    { name: 'showVictoryScreen',  source: 'endgame.js',      kind: 'fn'  },
    { name: 'closeVictoryScreen', source: 'endgame.js',      kind: 'fn'  },
    { name: 'returnToMenuFromVictory', source: 'endgame.js', kind: 'fn'  },
    // « Briser le Cycle » (V3 — fin optionnelle de la Boucle)
    { name: 'briserCycleJalons',  source: 'break-cycle.js',  kind: 'fn'  },
    { name: 'maybeOfferBreakCycle', source: 'break-cycle.js', kind: 'fn' },
    { name: 'openBreakCycleModal', source: 'break-cycle.js', kind: 'fn'  },

    // ── Don à la Maison (gold-sink post-tier 17) ──
    { name: 'donateGoldToHouse',       source: 'house-donation.js', kind: 'fn'  },
    { name: 'openHouseDonationModal',  source: 'house-donation.js', kind: 'fn'  },
    { name: 'closeHouseDonationModal', source: 'house-donation.js', kind: 'fn'  },
    { name: 'confirmHouseDonation',    source: 'house-donation.js', kind: 'fn'  },

    // ── Endgame Tranche 2 (Forge + Bibliothèque + Set Ténèbres) ──
    { name: 'openForge',            source: 'forge.js',      kind: 'fn'  },
    { name: 'upgradeItemAtForge',   source: 'forge.js',      kind: 'fn'  },
    { name: 'dissolveItemAtForge',  source: 'forge.js',      kind: 'fn'  },
    { name: 'enchantItemAtForge',   source: 'forge.js',      kind: 'fn'  },
    { name: 'openLibrary',          source: 'library.js',    kind: 'fn'  },
    { name: 'upgradeSpellAtLibrary',source: 'library.js',    kind: 'fn'  },
    { name: 'TENEBRES_SET',         source: 'data-items.js', kind: 'obj' },

    // ── Aide / tour guidé ──
    { name: 'startHelpTour',        source: 'help-tour.js',  kind: 'fn'  },
    { name: 'openHelpMenu',         source: 'help-tour.js',  kind: 'fn'  },
    { name: 'maybeAutoStartHelpTour',source: 'help-tour.js', kind: 'fn'  },
    { name: 'maybeShowCombatTutorial',source: 'help-tour.js', kind: 'fn'  },
    { name: 'quickStart',           source: 'main.js',       kind: 'fn'  },

    // ── Mode Ironman + Hall of Fame ──
    { name: 'ironmanMode',          source: 'state.js',          kind: 'obj' },
    { name: 'ironmanRunId',         source: 'state.js',          kind: 'obj' },
    { name: 'showIronmanResult',    source: 'ironman.js',        kind: 'fn'  },
    { name: 'computeIronmanScore',  source: 'ironman.js',        kind: 'fn'  },
    { name: 'recordIronmanKills',   source: 'ironman.js',        kind: 'fn'  },
    { name: '_genRunId',            source: 'ironman.js',        kind: 'fn'  },
    { name: 'deleteIronmanSlots',   source: 'save-slots.js',     kind: 'fn'  },
    { name: 'openHallOfFame',       source: 'hall-of-fame.js',   kind: 'fn'  },
    { name: 'openHofProjection',    source: 'hall-of-fame.js',   kind: 'fn'  },
    { name: 'submitIronmanScore',   source: 'hall-of-fame.js',   kind: 'fn'  },
    { name: 'verifyIronmanRunNotScored', source: 'hall-of-fame.js', kind: 'fn' },
    { name: 'getPlayerName',        source: 'hall-of-fame.js',   kind: 'fn'  },

    // ── Multijoueur — présence fantôme (optionnel : dégrade en silence) ──
    { name: 'mpStartSession',     source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: 'getGhostAt',         source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: 'getMpPlayerId',      source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: 'ghostPlacements',    source: 'multiplayer.js',  kind: 'obj',   optional: true },
    { name: 'ghostTagline',       source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: 'openGhostInteraction',source: 'multiplayer.js', kind: 'fn',    optional: true },
    { name: 'mpInspectGhost',     source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: 'mpBuildSnapshot',    source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: 'mpStartDuel',        source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: 'defeatedDuelists',   source: 'state.js',        kind: 'obj',   optional: true },
    { name: 'openMessageComposer',source: 'multiplayer-social.js', kind: 'fn', optional: true },
    { name: 'mpPostMessage',      source: 'multiplayer-social.js', kind: 'fn', optional: true },
    { name: 'getMessageAt',       source: 'multiplayer-social.js', kind: 'fn', optional: true },
    { name: 'messagePlacements',  source: 'multiplayer-social.js', kind: 'obj',optional: true },
    { name: 'mpOpenGiftView',     source: 'multiplayer-social.js', kind: 'fn', optional: true },
    { name: 'claimPendingGifts',  source: 'multiplayer-social.js', kind: 'fn', optional: true },
    { name: '_mpLevelGapTier',    source: 'multiplayer.js',  kind: 'fn',    optional: true },
    { name: '_mpEnumerateDuelLoot',source: 'multiplayer.js', kind: 'fn',    optional: true },
    { name: 'drawGhostSprite',    source: 'renderer-entities.js', kind: 'fn', optional: true },
    { name: 'PLAYER_SPRITE_SRC',  source: 'renderer-entities.js', kind: 'obj', optional: true },
    { name: 'drawMessageMarker',  source: 'renderer-entities.js', kind: 'fn', optional: true },

    // ── Mondes parallèles — Cheminette Inter-Mondes (V1a Phases A+B) ──
    // parallel-worlds.md §4 (anim) + §3.3 (matchmaking). Optionnels :
    // dégradation pas-à-pas si l'un des modules est absent.
    { name: 'playPortalOpen',           source: 'portal-fx.js',           kind: 'fn',  optional: true },
    { name: 'playPortalClose',          source: 'portal-fx.js',           kind: 'fn',  optional: true },
    { name: 'openPortalTargetModal',    source: 'portal-matchmaking.js',  kind: 'fn',  optional: true },
    { name: 'closePortalTargetModal',   source: 'portal-matchmaking.js',  kind: 'fn',  optional: true },
    { name: 'showIncomingVisitRequest', source: 'portal-matchmaking.js',  kind: 'fn',  optional: true },
    { name: 'mpListAvailableHosts',     source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpPostVisitRequest',       source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpPollOutgoingVisitStatus',source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpRespondVisitRequest',    source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    // Phase C.1 — snapshot et suspend/restore (parallel-worlds.md §3.4 / §5.1).
    { name: 'visitSession',             source: 'state.js',               kind: 'obj', optional: true },
    { name: '_takeVisitSnapshot',       source: 'save-visit-snapshot.js', kind: 'fn',  optional: true },
    { name: '_restoreFromVisit',        source: 'save-visit-snapshot.js', kind: 'fn',  optional: true },
    { name: 'mpBuildVisitSnapshot',     source: 'save-visit-snapshot.js', kind: 'fn',  optional: true },
    { name: 'mpApplyVisitSnapshot',     source: 'save-visit-snapshot.js', kind: 'fn',  optional: true },
    // Phase C.2 — transport REST polling (parallel-worlds.md §5, §12.3).
    { name: 'mpPostVisitMessage',       source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpPollVisitMessages',      source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpStartVisitAsVisitor',    source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: 'mpStartVisitAsHost',       source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: 'mpExitVisit',              source: 'visit-channel.js',       kind: 'fn',  optional: true },
    // Reliquat 4.1 — duel PvP live (tours relayés, pvp-duel-live.md).
    { name: 'pvpSendDuelInvite',        source: 'pvp-duel.js',            kind: 'fn',  optional: true },
    { name: 'pvpCanDuel',               source: 'pvp-duel.js',            kind: 'fn',  optional: true },
    { name: 'pvpAttachVisit',           source: 'pvp-duel.js',            kind: 'fn',  optional: true },
    { name: '_pvpGetState',             source: 'pvp-duel.js',            kind: 'fn',  optional: true },
    // Phase C.3 — bandeau de visite (parallel-worlds.md §3.4 / §6.4).
    { name: 'showVisitHud',             source: 'visit-hud.js',           kind: 'fn',  optional: true },
    { name: 'updateVisitHud',           source: 'visit-hud.js',           kind: 'fn',  optional: true },
    { name: 'hideVisitHud',             source: 'visit-hud.js',           kind: 'fn',  optional: true },
    // Phase C.3b — chargement paresseux multi-étages.
    { name: 'mpApplyVisitFloorUpdate',  source: 'save-visit-snapshot.js', kind: 'fn',  optional: true },
    // Phase D — limites de territoire + sprites + emotes (§3.5/§5.2/§6.5/§6.7).
    { name: '_isVisitorFogBlock',       source: 'movement.js',            kind: 'fn',  optional: true },
    { name: '_visitNotifyVisitorMove',  source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: '_visitNotifyHostMove',     source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: '_visitSendEmote',          source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: 'getVisitorAt',             source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: 'getRemoteHostAt',          source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: 'drawVisitorSprite',        source: 'renderer-effects.js',    kind: 'fn',  optional: true },
    { name: '_visitHudEmote',           source: 'visit-hud.js',           kind: 'fn',  optional: true },
    { name: 'VISITOR_EMOTES',           source: 'visit-channel.js',       kind: 'obj', optional: true },
    { name: 'HOST_EMOTES',              source: 'visit-channel.js',       kind: 'obj', optional: true },
    // Phase E — dialogues PNJ « voyageur » (§6.2). Banque close + fallback.
    { name: 'openAstralNpcDialog',      source: 'npc-dialog.js',          kind: 'fn',  optional: true },
    { name: '_astralCategory',          source: 'npc-dialog.js',          kind: 'fn',  optional: true },
    { name: '_astralFallbackPages',     source: 'npc-dialog.js',          kind: 'fn',  optional: true },
    // Phase F — polish (toggle visites + reconnexion + qualité réseau).
    { name: 'visitsClosed',             source: 'state.js',               kind: 'obj', optional: true },
    { name: 'toggleVisitsClosed',       source: 'ui.js',                  kind: 'fn',  optional: true },
    { name: '_updateVisitsBtn',         source: 'ui.js',                  kind: 'fn',  optional: true },
    { name: 'openSettingsModal',        source: 'ui-settings.js',         kind: 'fn',  optional: true },
    { name: 'toggleBarks',              source: 'ui-settings.js',         kind: 'fn',  optional: true },
    { name: 'updateVisitQualityBadge',  source: 'visit-hud.js',           kind: 'fn',  optional: true },
    { name: '_visitGetQuality',         source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: '_visitIsReconnecting',     source: 'visit-channel.js',       kind: 'fn',  optional: true },
    // Phase G — combat local + amorce économie cross-plan (§6.8 / §6.10).
    { name: 'inAstralCombat',           source: 'state.js',               kind: 'obj', optional: true },
    { name: 'outremondeEssence',        source: 'state.js',               kind: 'obj', optional: true },
    { name: 'astralCellsDefeated',      source: 'state.js',               kind: 'obj', optional: true },
    { name: 'astralFloorKills',         source: 'state.js',               kind: 'obj', optional: true },
    { name: 'astralExileCooldownUntil', source: 'state.js',               kind: 'obj', optional: true },
    { name: 'buildEcho',                source: 'dungeon.js',             kind: 'fn',  optional: true },
    { name: 'engageAstralCombat',       source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: '_canEngageAstralCombat',   source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: '_astralFightsRemaining',   source: 'visit-channel.js',       kind: 'fn',  optional: true },
    { name: 'updateAstralFightButton',  source: 'visit-hud.js',           kind: 'fn',  optional: true },
    { name: '_visitHudAstralFight',     source: 'visit-hud.js',           kind: 'fn',  optional: true },
    // Phase H — Verrou de Sang + Atelier du Voyageur (§6.9 / §6.10).
    { name: 'inSealedCombat',           source: 'state.js',               kind: 'obj', optional: true },
    { name: 'outremondeFragments',      source: 'state.js',               kind: 'obj', optional: true },
    { name: 'outremondePendingSeals',   source: 'state.js',               kind: 'obj', optional: true },
    { name: 'hostSealsByFloor',         source: 'state.js',               kind: 'obj', optional: true },
    { name: 'currentBloodSeal',         source: 'state.js',               kind: 'obj', optional: true },
    { name: 'openBloodSealTargetModal', source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: 'openAtelierVoyageur',      source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: 'closeAtelierVoyageur',     source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_claimResolvedSeals',      source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_retryOrphanSeals',        source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_craftVoyageurPiece',      source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: 'loadHostSealsForCurrentFloor', source: 'atelier-voyageur.js', kind: 'fn', optional: true },
    { name: 'getBloodSealAt',           source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_triggerHostBloodSeal',    source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: 'mpPostBloodSeal',          source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpListHostSealsForFloor',  source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpUpdateSealStatus',       source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    { name: 'mpListVisitorResolvedSeals', source: 'multiplayer-visits.js',kind: 'fn',  optional: true },
    { name: 'mpClaimSeal',              source: 'multiplayer-visits.js',  kind: 'fn',  optional: true },
    // V1c.1 — souvenirs / cosmétiques / sorts cross-plan.
    { name: 'outremondeMetrics',        source: 'state.js',               kind: 'obj', optional: true },
    { name: 'outremondeSouvenirs',      source: 'state.js',               kind: 'obj', optional: true },
    { name: 'outremondeCosmetics',      source: 'state.js',               kind: 'obj', optional: true },
    { name: 'OUTREMONDE_SOUVENIRS',     source: 'data-world.js',          kind: 'obj', optional: true },
    { name: 'OUTREMONDE_COSMETICS',     source: 'data-world.js',          kind: 'obj', optional: true },
    { name: '_checkSouvenirs',          source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_souvenirsBonuses',        source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_buyCosmetic',             source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_toggleCosmetic',          source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_applyCosmeticVisuals',    source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_playBloodSealAnim',       source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },
    { name: '_buyCrossSpell',           source: 'atelier-voyageur.js',    kind: 'fn',  optional: true },

    // ── Modules optionnels (warnings doux uniquement) ──
    { name: 'UX',                 source: 'ux-improvements.js', kind: 'obj', optional: true },
    { name: 'ModalA11y',          source: 'modal-a11y.js',   kind: 'obj',   optional: true },
    { name: 'CombatFX',           source: 'combat-fx.js',    kind: 'obj',   optional: true },
    { name: 'Haptics',            source: 'haptics.js',      kind: 'obj',   optional: true },
    { name: 'HAPTICS_safe',       source: 'haptics.js',      kind: 'obj',   optional: true },
    { name: 'DungeonFX',          source: 'dungeon-fx.js',   kind: 'obj',   optional: true },
    { name: 'startDungeonFxLoop', source: 'dungeon-fx.js',   kind: 'fn',    optional: true },
    { name: 'drawTemporalFog',    source: 'dungeon-fx.js',   kind: 'fn',    optional: true },
    { name: '_runePulseAlpha',    source: 'dungeon-fx.js',   kind: 'fn',    optional: true },
    { name: 'pulseFrostOverlay',  source: 'floor-ambiance.js', kind: 'fn',  optional: true },
    { name: 'Cinematics',         source: 'cinematics.js',   kind: 'obj',   optional: true },
    { name: 'showIntroScreen',    source: 'intro.js',        kind: 'fn',    optional: true },
    { name: 'getNpcById',         source: 'npcs-helpers.js', kind: 'fn',    optional: true },
    { name: 'Karaoke',            source: 'karaoke.js',      kind: 'obj',   optional: true },
    { name: 'BalanceLog',         source: 'balance-log.js',  kind: 'obj',   optional: true },
    { name: 'PWA',                source: 'pwa.js',          kind: 'obj',   optional: true },
  ];

  // ── Vérification d'un identifiant nu via typeof ──────────────
  // typeof X ne throw jamais : retourne "undefined" si X n'existe pas.
  // Une déclaration `const X = ...` au top-level d'un autre <script>
  // est accessible ici en lecture (script-global scope).
  function checkIdentifier(entry) {
    let t;
    try {
      // Pour les fonctions/var : aussi accessibles via window.
      // Pour let/const : accessibles via le scope global déclaratif,
      // pas via window. typeof fonctionne dans les deux cas.
      t = eval('typeof ' + entry.name);
    } catch (e) {
      t = 'error:' + e.message;
    }

    if (entry.kind === 'fn')  return t === 'function';
    if (entry.kind === 'obj') return t !== 'undefined' && !String(t).startsWith('error');
    return false;
  }

  // ── Exécution du check ───────────────────────────────────────
  const missing    = [];
  const missingOpt = [];

  for (const entry of MANIFEST) {
    if (!checkIdentifier(entry)) {
      if (entry.optional) missingOpt.push(entry);
      else                missing.push(entry);
    }
  }

  // ── Rapport ──────────────────────────────────────────────────
  const report = {
    timestamp: Date.now(),
    totalChecked: MANIFEST.length,
    missingCritical: missing,
    missingOptional: missingOpt,
    ok: missing.length === 0
  };
  window.__loaderReport = report;

  if (missing.length === 0 && missingOpt.length === 0) {
    console.log('[loader] ✓ ' + MANIFEST.length + ' modules chargés.');
  } else if (missing.length === 0) {
    console.info('[loader] ✓ critiques OK, optionnels manquants :',
      missingOpt.map(m => m.name + ' (' + m.source + ')').join(', '));
  } else {
    console.error('[loader] ✗ Modules critiques manquants :',
      missing.map(m => m.name + ' (' + m.source + ')').join(', '));
    _showErrorBanner(missing);
  }

  // ── Bandeau d'erreur visible dans le DOM ─────────────────────
  function _showErrorBanner(items) {
    function inject() {
      if (!document.body) return false;
      if (document.getElementById('loader-error-banner')) return true;
      const b = document.createElement('div');
      b.id = 'loader-error-banner';
      b.setAttribute('role', 'alert');
      b.setAttribute('aria-live', 'assertive');
      b.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0',
        'background:#7a0a0a', 'color:#fff',
        'padding:10px 14px',
        'font-family:monospace', 'font-size:12px',
        'z-index:99999', 'text-align:center',
        'border-bottom:2px solid #ffb800',
        'box-shadow:0 2px 8px rgba(0,0,0,0.5)'
      ].join(';');
      b.innerHTML =
        '⚠️ <b>Erreur de chargement</b> — modules JS manquants : ' +
        items.map(m => '<b>' + m.name + '</b> (' + m.source + ')').join(', ') +
        '<br><span style="opacity:.75;font-size:10px">Le jeu peut être instable. Ouvrir la console pour détails.</span>';
      document.body.appendChild(b);
      return true;
    }
    if (!inject()) {
      document.addEventListener('DOMContentLoaded', inject);
    }
  }
})();

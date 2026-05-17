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
    { name: 'MONSTERS',           source: 'monsters.js',     kind: 'obj' },
    { name: 'SPELLS',             source: 'data.js',         kind: 'obj' },
    { name: 'ITEMS',              source: 'data.js',         kind: 'obj' },
    { name: 'CHARACTERS',         source: 'data.js',         kind: 'obj' },
    { name: 'LOCATIONS',          source: 'data.js',         kind: 'obj' },
    { name: 'CELL',               source: 'data.js',         kind: 'obj' },
    { name: 'MAP_W',              source: 'data.js',         kind: 'obj' },
    { name: 'NPCS',               source: 'npcs.js',         kind: 'obj' },
    { name: 'FLOOR_THEMES',       source: 'floor-themes.js', kind: 'obj' },
    { name: 'getFloorTheme',      source: 'floor-themes.js', kind: 'fn'  },

    // ── État global (critiques) ──
    { name: 'player',             source: 'state.js',        kind: 'obj' },
    { name: 'player2',            source: 'state.js',        kind: 'obj' },
    { name: 'party',              source: 'state.js',        kind: 'obj' },
    { name: 'partySize',          source: 'state.js',        kind: 'obj' },
    { name: 'HOUSE_BONUSES',      source: 'state.js',        kind: 'obj' },
    { name: 'DIFFICULTY_SETTINGS',source: 'state.js',        kind: 'obj' },
    { name: 'defeatedCellsByFloor',source: 'state.js',       kind: 'obj' },
    { name: 'floorKillCount',     source: 'state.js',        kind: 'obj' },
    { name: 'visitedFloors',      source: 'state.js',        kind: 'obj' },
    { name: 'portusOocCooldown',  source: 'state.js',        kind: 'obj' },
    { name: 'portusFightCooldown',source: 'state.js',        kind: 'obj' },
    { name: 'healSpellCooldown',  source: 'state.js',        kind: 'obj' },
    { name: 'STAT_POINTS_PER_LEVEL',source: 'data.js',       kind: 'obj' },
    { name: 'STAT_POINT_EFFECTS', source: 'data.js',         kind: 'obj' },
    { name: 'allocateStatPoint',  source: 'ui.js',           kind: 'fn'  },

    // ── Audio (critique) ──
    { name: 'AudioSystem',        source: 'audio.js',        kind: 'obj' },

    // ── Icônes / textures ──
    { name: 'SCENE_ICONS',        source: 'scene-icons.js',  kind: 'obj' },
    { name: 'TEXTURES',           source: 'textures.js',     kind: 'obj' },
    { name: 'loadTextures',       source: 'textures.js',     kind: 'fn'  },
    { name: 'getMonsterIconHtml', source: 'icons.js',        kind: 'fn'  },
    { name: 'getItemIconHtml',    source: 'item-icons.js',   kind: 'fn'  },

    // ── UI (critiques) ──
    { name: 'updateUI',           source: 'ui.js',           kind: 'fn'  },
    { name: 'addMsg',             source: 'ui.js',           kind: 'fn'  },
    { name: 'openCharacter',      source: 'ui.js',           kind: 'fn'  },
    { name: 'openBestiary',       source: 'ui-bestiary.js',  kind: 'fn'  },

    // ── Donjon / rendu ──
    { name: 'generateDungeon',    source: 'dungeon.js',      kind: 'fn'  },
    { name: '_migrateMissingNpcsForFloor', source: 'dungeon.js', kind: 'fn' },
    { name: '_ensureActiveKillQuestTargets', source: 'dungeon.js', kind: 'fn' },
    { name: '_ensureStairsExist', source: 'dungeon.js', kind: 'fn' },
    { name: 'effectiveFloor',     source: 'dungeon.js', kind: 'fn'  },
    { name: 'drawDungeon',        source: 'renderer.js',     kind: 'fn'  },
    { name: 'drawNpcSprite',      source: 'renderer-effects.js', kind: 'fn' },
    { name: 'drawForgeSprite',    source: 'renderer-effects.js', kind: 'fn' },
    { name: 'drawLibrarySprite',  source: 'renderer-effects.js', kind: 'fn' },
    { name: 'renderMinimap',      source: 'renderer-minimap.js', kind: 'fn' },

    // ── Mouvement ──
    { name: 'move',               source: 'movement.js',     kind: 'fn'  },
    { name: 'moveForward',        source: 'movement.js',     kind: 'fn'  },
    { name: 'moveBackward',       source: 'movement.js',     kind: 'fn'  },
    { name: 'turnLeft',           source: 'movement.js',     kind: 'fn'  },
    { name: 'turnRight',          source: 'movement.js',     kind: 'fn'  },
    { name: 'initCanvasSwipeGestures', source: 'swipe-canvas.js', kind: 'fn' },
    { name: 'handleCellEntry',    source: 'movement.js',     kind: 'fn'  },
    { name: 'searchRoom',         source: 'movement.js',     kind: 'fn'  },
    { name: 'rest',               source: 'movement.js',     kind: 'fn'  },

    // ── Combat ──
    { name: 'startBattle',        source: 'battle.js',       kind: 'fn'  },
    { name: 'endBattle',          source: 'battle.js',       kind: 'fn'  },
    { name: 'battleAction',       source: 'battle.js',       kind: 'fn'  },
    { name: 'castSpellInBattle',  source: 'battle-spells.js',kind: 'fn'  },
    { name: 'openCombatTeleportChoice', source: 'teleport.js', kind: 'fn' },
    { name: 'openOutOfCombatTeleport',  source: 'teleport.js', kind: 'fn' },
    { name: 'teleportEnemyAway',        source: 'teleport.js', kind: 'fn' },
    { name: 'teleportOutOfCombat',      source: 'teleport.js', kind: 'fn' },
    { name: 'renderEnemyGroup',   source: 'battle-ui.js',    kind: 'fn'  },

    // ── Inventaire ──
    { name: 'openInventory',      source: 'inventory.js',    kind: 'fn'  },
    { name: 'switchInvTab',       source: 'inventory.js',    kind: 'fn'  },
    { name: 'useItem',            source: 'inventory.js',    kind: 'fn'  },
    { name: 'equipItem',          source: 'inventory.js',    kind: 'fn'  },
    { name: 'recalculateStats',   source: 'inventory.js',    kind: 'fn'  },
    { name: 'openSpells',         source: 'inventory.js',    kind: 'fn'  },

    // ── Quêtes ──
    { name: 'openQuestLog',       source: 'quests.js',       kind: 'fn'  },
    { name: 'completeQuest',      source: 'quests.js',       kind: 'fn'  },
    { name: 'unlockHouseQuest',   source: 'quests.js',       kind: 'fn'  },
    { name: 'HOUSE_SET_QUESTS',   source: 'quests.js',       kind: 'obj' },

    // ── Concoction de potions ──
    { name: 'POTION_RECIPES',     source: 'data.js',         kind: 'obj' },
    { name: 'ITEM_ICON_SVG_REGISTRY', source: 'item-icons.js', kind: 'obj' },
    { name: 'openBrewingModal',   source: 'potions.js',      kind: 'fn'  },
    { name: 'attemptBrew',        source: 'potions.js',      kind: 'fn'  },
    { name: 'addHerb',            source: 'potions.js',      kind: 'fn'  },

    // ── Boutique ──
    { name: 'openShop',           source: 'shop.js',         kind: 'fn'  },
    { name: 'buyItem',            source: 'shop.js',         kind: 'fn'  },

    // ── Sauvegarde ──
    { name: 'saveGame',           source: 'save.js',         kind: 'fn'  },
    { name: 'loadGame',           source: 'save.js',         kind: 'fn'  },
    { name: 'autoSave',           source: 'save.js',         kind: 'fn'  },
    { name: 'listSaveSlots',      source: 'save.js',         kind: 'fn'  },
    { name: 'readSlot',           source: 'save.js',         kind: 'fn'  },
    { name: 'writeSlot',          source: 'save.js',         kind: 'fn'  },
    { name: 'deleteSlot',         source: 'save.js',         kind: 'fn'  },
    { name: 'migrateLegacyKey',   source: 'save.js',         kind: 'fn'  },
    { name: 'exportSaveStore',    source: 'save.js',         kind: 'fn'  },
    { name: 'importSaveStore',    source: 'save.js',         kind: 'fn'  },
    { name: 'openSaveDialog',     source: 'save-ui.js',      kind: 'fn'  },
    { name: 'openLoadDialog',     source: 'save-ui.js',      kind: 'fn'  },
    { name: 'exportSaveToFile',   source: 'save-ui.js',      kind: 'fn'  },
    { name: 'importSaveFromFile', source: 'save-ui.js',      kind: 'fn'  },
    { name: 'enterStartHub',      source: 'save-ui.js',      kind: 'fn'  },
    { name: 'startHubNewGame',    source: 'save-ui.js',      kind: 'fn'  },
    { name: 'loadSlotAndStart',   source: 'save-ui.js',      kind: 'fn'  },

    // ── Main / démarrage ──
    { name: 'showPlayerSelect',   source: 'main.js',         kind: 'fn'  },
    { name: 'startGame',          source: 'main.js',         kind: 'fn'  },
    { name: 'chooseHouse',        source: 'main.js',         kind: 'fn'  },
    { name: 'confirmHeroSelection',source: 'main.js',        kind: 'fn'  },
    { name: 'checkHouseLevelUp',  source: 'main.js',         kind: 'fn'  },

    // ── Endgame (écran de victoire + boucle Ténébreuse) ──
    { name: 'victoryAchieved',    source: 'state.js',        kind: 'obj' },
    { name: 'checkVictoryTrigger',source: 'endgame.js',      kind: 'fn'  },
    { name: 'showVictoryScreen',  source: 'endgame.js',      kind: 'fn'  },
    { name: 'closeVictoryScreen', source: 'endgame.js',      kind: 'fn'  },
    { name: 'returnToMenuFromVictory', source: 'endgame.js', kind: 'fn'  },

    // ── Endgame Tranche 2 (Forge + Bibliothèque + Set Ténèbres) ──
    { name: 'openForge',            source: 'forge.js',      kind: 'fn'  },
    { name: 'upgradeItemAtForge',   source: 'forge.js',      kind: 'fn'  },
    { name: 'openLibrary',          source: 'library.js',    kind: 'fn'  },
    { name: 'upgradeSpellAtLibrary',source: 'library.js',    kind: 'fn'  },
    { name: 'TENEBRES_SET',         source: 'data.js',       kind: 'obj' },

    // ── Aide / tour guidé ──
    { name: 'startHelpTour',        source: 'help-tour.js',  kind: 'fn'  },
    { name: 'maybeAutoStartHelpTour',source: 'help-tour.js', kind: 'fn'  },

    // ── Mode Ironman + Hall of Fame ──
    { name: 'ironmanMode',          source: 'state.js',          kind: 'obj' },
    { name: 'ironmanRunId',         source: 'state.js',          kind: 'obj' },
    { name: 'showIronmanResult',    source: 'ironman.js',        kind: 'fn'  },
    { name: 'computeIronmanScore',  source: 'ironman.js',        kind: 'fn'  },
    { name: 'recordIronmanKills',   source: 'ironman.js',        kind: 'fn'  },
    { name: '_genRunId',            source: 'ironman.js',        kind: 'fn'  },
    { name: 'deleteIronmanSlots',   source: 'save.js',           kind: 'fn'  },
    { name: 'openHallOfFame',       source: 'hall-of-fame.js',   kind: 'fn'  },
    { name: 'submitIronmanScore',   source: 'hall-of-fame.js',   kind: 'fn'  },
    { name: 'verifyIronmanRunNotScored', source: 'hall-of-fame.js', kind: 'fn' },
    { name: 'getPlayerName',        source: 'hall-of-fame.js',   kind: 'fn'  },

    // ── Modules optionnels (warnings doux uniquement) ──
    { name: 'UX',                 source: 'ux-improvements.js', kind: 'obj', optional: true },
    { name: 'showIntroScreen',    source: 'intro.js',        kind: 'fn',    optional: true },
    { name: 'getNpcById',         source: 'npcs.js',         kind: 'fn',    optional: true },
    { name: 'Karaoke',            source: 'karaoke.js',      kind: 'obj',   optional: true },
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

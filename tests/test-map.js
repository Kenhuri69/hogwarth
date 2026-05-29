// ============================================================
// CARTE FICHIER SOURCE → SCÉNARIOS SMOKE PERTINENTS
// ============================================================
// Consommée par tests/select.js pour ne lancer que les scénarios
// concernés par un changement (cf. .claude/plans/game-review-modularization.md §5).
//
// Chaque clé est un chemin de fichier (relatif à la racine du dépôt).
// Chaque valeur est une liste de motifs (substrings, insensibles à la
// casse) passés au filtre de tests/smoke.js. Un motif matche tout
// scénario dont le nom de fonction le contient :
//   'crit' → scenarioCritDodge, scenarioCritDodgeFromEquip, scenarioCritBonusMultiplier
//
// Règles de repli appliquées par select.js (volontairement conservatrices) :
//   • Un fichier de FULL_SUITE_TRIGGERS modifié  → suite complète.
//   • Un fichier js/ modifié SANS entrée ici     → suite complète (+ avertit
//     pour qu'on étende la carte). La drift est donc sûre par défaut.
//   • PWA_TRIGGERS modifiés → lance aussi tests/pwa-smoke.js.
//   • BASELINE est toujours ajouté à toute exécution filtrée (sanity peu coûteux).
// ============================================================

// Toujours inclus dans une exécution filtrée : démarrage + validation du
// loader (détecte une casse de l'ordre de chargement / un global manquant).
const BASELINE = ['startup', 'loader'];

// Modifier l'un de ces fichiers invalide tout raisonnement local : ils
// portent l'état/les données partagés ou l'amorçage commun à tous les
// scénarios. On relance donc l'intégralité de la suite.
const FULL_SUITE_TRIGGERS = [
  'js/state.js',     // 81 globals mutables, lus partout
  'js/data.js',      // SPELLS / ITEMS / CHARACTERS / CELL… constantes globales
  'js/loader.js',    // MANIFEST + helpers défensifs (safeEl, UX_safe)
  'js/main.js',      // startGame / confirmHeroSelection / chooseHouse : amorçage commun
  'index.html',      // ordre des <script> : casse silencieuse possible partout
];

// Changements PWA → exécuter en plus tests/pwa-smoke.js (serveur HTTP + SW).
const PWA_TRIGGERS = ['js/pwa.js', 'sw.js', 'manifest.json'];

const TEST_MAP = {
  // ── Combat ──
  'js/battle.js':        ['status', 'weaken', 'duostatus', 'combat', 'crit', 'stun',
                          'guard', 'bombarda', 'aoe', 'elemental', 'ironman',
                          'victory', 'monstercombat', 'darkrewards', 'respawn',
                          'solosoftlock'],
  'js/battle-spells.js': ['elemental', 'elementspells', 'spell', 'aoe', 'bombarda',
                          'crit', 'healooc', 'dumbledorelux', 'stun', 'status'],
  'js/battle-ui.js':     ['combat', 'monstercombat', 'status'],
  'js/ux-improvements.js':['spellux', 'combatext', 'combat', 'status', 'aoe'],

  // ── Inventaire / objets / équipement ──
  'js/inventory.js':     ['equip', 'item', 'tryadd', 'spell', 'crit', 'hpspmax',
                          'houseset', 'tenebres', 'phase3'],
  'js/potions.js':       ['brewing'],
  'js/shop.js':          ['shop', 'vendors', 'phase3catalog'],

  // ── Quêtes / énigmes ──
  'js/quests.js':           ['quest', 'chain', 'farming', 'riddle', 'grimoire',
                            'dumbledorelux', 'ensurekill'],
  'js/quests-templates.js': ['quest', 'chain', 'farming', 'ensurekill',
                            'repeatablequestspawn'],
  'js/quests-riddles.js':   ['riddle', 'grimoire', 'dumbledorelux'],
  'js/riddles.js':       ['riddle', 'rune', 'riddlestele'],

  // ── Déplacement / donjon ──
  'js/movement.js':      ['fountain', 'search', 'trap', 'altar', 'sealedroom',
                          'secretpass', 'rune', 'riddlestele', 'relativecontrols',
                          'respawn', 'floorevent', 'teleport', 'healooc'],
  'js/swipe-canvas.js':  ['canvasswipe', 'relativecontrols'],
  'js/dungeon.js':       ['ensurestairs', 'ensurekill', 'branchy', 'trap', 'altar',
                          'sealedroom', 'secretpass', 'rune', 'floortheming',
                          'floortextures', 'respawn', 'repeatablequestspawn',
                          'darkvariant', 'stairsgated', 'iteration74'],
  'js/dungeon-scaling.js':  ['darkvariant', 'darkrewards', 'respawn', 'monster', 'combat'],
  'js/dungeon-spawning.js': ['ensurestairs', 'ensurekill', 'respawn',
                            'repeatablequestspawn', 'farming', 'npc'],
  'js/floor-events.js':  ['floorevent', 'rune', 'trap', 'altar', 'secretpass'],
  'js/floor-themes.js':  ['floortheming', 'floortextures', 'floorevent'],

  // ── Rendu ──
  'js/renderer.js':         ['floortextures', 'floortheming', 'sidedoor', 'sidewall',
                            'npcsprite3d', 'monsterimages'],
  'js/renderer-effects.js': ['npcsprite3d', 'sidedoor', 'sidewall', 'fountain'],
  'js/renderer-minimap.js': ['relativecontrols'],
  'js/textures.js':         ['floortextures', 'floortheming'],

  // ── Sauvegarde ──
  'js/save.js':       ['save', 'slot', 'export', 'autosave', 'corrupt', 'migration',
                      'roundtrip', 'starthub', 'visitsnapshot'],
  'js/save-slots.js': ['save', 'slot', 'export', 'autosave', 'corrupt', 'migration',
                      'starthub'],
  'js/save-visit-snapshot.js': ['visit', 'save', 'roundtrip'],
  'js/save-ui.js':    ['slot', 'starthub', 'export', 'save'],

  // ── Mondes parallèles / réseau ──
  'js/multiplayer.js':        ['multiplayer', 'visit', 'portal', 'parallel'],
  'js/visit-channel.js':      ['visit', 'multiplayer'],
  'js/visit-hud.js':          ['visit'],
  'js/portal-matchmaking.js': ['portal', 'visit'],
  'js/portal-fx.js':          ['portal', 'parallel'],
  'js/teleport.js':           ['teleport', 'healooc'],
  'js/atelier-voyageur.js':   ['visit'],

  // ── Endgame ──
  'js/endgame.js':        ['victory', 'dark', 'stairsgated'],
  'js/forge.js':          ['forge'],
  'js/library.js':        ['library'],
  'js/house-donation.js': ['housedonation', 'house'],
  'js/ironman.js':        ['ironman'],
  'js/hall-of-fame.js':   ['ironman'],

  // ── PNJ / dialogues ──
  'js/npcs.js':       ['npc', 'vendors', 'lore', 'headofhouse', 'chain'],
  'js/npc-dialog.js': ['npc', 'vendors', 'dumbledorelux'],

  // ── Icônes / assets ──
  'js/icons.js':       ['monsterimages', 'npcsprite3d', 'icons'],
  'js/item-icons.js':  ['itemicons', 'icons', 'tintcss'],
  'js/scene-icons.js': ['sceneicons'],

  // ── Audio / voix ──
  'js/audio.js':       ['voice', 'karaoke'],
  'js/audio-music.js': ['voice', 'karaoke'],
  'js/audio-sfx.js':   ['voice', 'karaoke'],
  'js/karaoke.js':     ['karaoke'],

  // ── Données de contenu ──
  'js/monsters.js': ['monster', 'combat', 'darkvariant'],

  // ── UI / chrome / aide ──
  // ui.js est central (updateUI partout) ; on cible un sous-ensemble
  // représentatif. `startup` (baseline) exerce déjà updateUI.
  'js/ui.js':          ['startup', 'houseset', 'crest', 'uichrome', 'partyequip',
                       'status', 'ironman', 'mobileselect'],
  'js/ui-bestiary.js': ['monster'],
  'js/help-tour.js':   ['helptour'],

  // ── CSS : pas de scénario fonctionnel dédié (baseline suffit) ──
  // Les fichiers css/ sont volontairement absents → ne forcent pas la
  // suite complète ; select.js les traite en "baseline only".
};

module.exports = { TEST_MAP, FULL_SUITE_TRIGGERS, PWA_TRIGGERS, BASELINE };

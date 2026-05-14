// ============================================================
// ÉTAT GLOBAL MUTABLE
// ============================================================

// Tableaux de la carte courante
let dungeon, visited, enemyMap, itemMap;

// Position et orientation du joueur
let playerX, playerY, playerDir;

// Étage actuel
let currentFloor = 1;

// Nombre de joueurs choisi à l'écran de démarrage (1 ou 2)
let partySize = 2;

// ============================================================
// NIVEAU DE DIFFICULTÉ (Normal = difficulté de référence)
// ============================================================
let difficulty = "Normal"; // "Facile" | "Normal" | "Difficile" | "Expert"

const DIFFICULTY_SETTINGS = {
  Facile: {
    enemyGroupMultiplier: 0.65,  // groupes d'ennemis réduits
    scalingMultiplier:    0.75,  // scaling plus lent
    goldMultiplier:       1.6,
    xpMultiplier:         1.4,
    dropChanceMultiplier: 1.5,
    startingGold:         60,
    startingHpBonus:      12
  },
  Normal: {
    enemyGroupMultiplier: 1.0,
    scalingMultiplier:    1.0,
    goldMultiplier:       1.0,
    xpMultiplier:         1.0,
    dropChanceMultiplier: 1.0,
    startingGold:         25,
    startingHpBonus:      0
  },
  Difficile: {
    enemyGroupMultiplier: 1.35,
    scalingMultiplier:    1.22,
    goldMultiplier:       0.75,
    xpMultiplier:         0.9,
    dropChanceMultiplier: 0.7,
    startingGold:         15,
    startingHpBonus:      -4
  },
  Expert: {
    enemyGroupMultiplier: 1.65,
    scalingMultiplier:    1.45,
    goldMultiplier:       0.55,
    xpMultiplier:         0.75,
    dropChanceMultiplier: 0.45,
    startingGold:         8,
    startingHpBonus:      -8
  }
};

// ============================================================
// SYSTÈME DES MAISONS
// ============================================================
let chosenHouse = null;
let housePoints = 0;
let houseTier   = 0;  // 0 = aucun palier atteint, 1-5 = palier actuel
// Items Tier 2 / Tier 4 Maison franchis mais pas encore remis. Le Chef de
// Maison (HOUSE_BONUSES[house].headOfHouse) les distribue lors d'une visite
// via specialAction `claim_house_reward`. Le bonus de stats reste appliqué
// immédiatement au franchissement (checkHouseLevelUp). Tier 5 distribue son
// item directement (cinématique post-victoire endgame).
let pendingHouseRewards = new Set();

const HOUSE_BONUSES = {
  Gryffondor: {
    color: '#740001', accent: '#D3A625', emoji: '🦁',
    label: 'Gryffondor',
    desc: 'Bravoure, courage et chevalerie.',
    headOfHouse: 'mcgonagall',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseAtk: 1 },              msg: '🦁 Courage naissant ! +1 ATK' },
      { threshold: 300,  label: 'Élève',     bonus: { _baseAtk: 1, _baseLck: 1, item: 'brassard_lion' }, msg: '🦁 Bravoure éprouvée ! +1 ATK +1 LCK — le Brassard du Lion vous attend auprès du Pr McGonagall.' },
      { threshold: 600,  label: 'Vaillant',  bonus: { _baseAtk: 2 },              msg: '🦁 Digne de Gryffondor ! +2 ATK' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'sword_gryff' },      msg: "🦁 L'Épée de Gryffondor vous attend auprès du Pr McGonagall." },
      // Tier 5 — endgame Tranche 2 (gated par victoryAchieved dans main.js).
      { threshold: 2000, label: 'Légende',   bonus: { _baseAtk: 3, item: 'lame_godric' }, msg: "🦁 Légende vivante de Gryffondor ! +3 ATK · La Lame de Godric s'incline." },
    ]
  },
  Serpentard: {
    color: '#1A472A', accent: '#AAAAAA', emoji: '🐍',
    label: 'Serpentard',
    desc: 'Ambition, ruse et détermination.',
    headOfHouse: 'rogue',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseMag: 1 },              msg: "🐍 L'ambition vous galvanise ! +1 MAG" },
      { threshold: 300,  label: 'Élève',     bonus: { _baseMag: 1, _baseLck: 1, item: 'anneau_serpent' }, msg: "🐍 Ruse affûtée ! +1 MAG +1 LCK — l'Anneau du Serpent vous attend auprès du Pr Rogue." },
      { threshold: 600,  label: 'Rusé',      bonus: { _baseMag: 2 },              msg: '🐍 Serpentard vous honore ! +2 MAG' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'locket_slytherin' }, msg: '🐍 Le Médaillon de Serpentard vous attend auprès du Pr Rogue.' },
      { threshold: 2000, label: 'Légende',   bonus: { _baseMag: 3, _baseLck: 1, item: 'bague_salazar' }, msg: '🐍 Légende de Serpentard ! +3 MAG +1 LCK · La Bague de Salazar t\'élit.' },
    ]
  },
  Serdaigle: {
    color: '#0E1A40', accent: '#946B2D', emoji: '🦅',
    label: 'Serdaigle',
    desc: 'Sagesse, intelligence et esprit vif.',
    headOfHouse: 'flitwick',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseMag: 1 },              msg: "🦅 L'intellect s'éveille ! +1 MAG" },
      { threshold: 300,  label: 'Élève',     bonus: { _baseMag: 1, _baseLck: 1, item: 'plume_aigle' }, msg: "🦅 Esprit acéré ! +1 MAG +1 LCK — la Plume d'Aigle vous attend auprès du Pr Flitwick." },
      { threshold: 600,  label: 'Savant',    bonus: { _baseMag: 2 },              msg: '🦅 Digne de Serdaigle ! +2 MAG' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'diademe_serdaigle' },msg: '🦅 Le Diadème de Serdaigle vous attend auprès du Pr Flitwick.' },
      { threshold: 2000, label: 'Légende',   bonus: { _baseMag: 2, item: 'codex_rowena' }, msg: '🦅 Légende de Serdaigle ! +2 MAG · Le Codex de Rowena t\'est révélé.' },
    ]
  },
  Poufsouffle: {
    color: '#372E29', accent: '#F0C75E', emoji: '🦡',
    label: 'Poufsouffle',
    desc: 'Loyauté, patience et travail acharné.',
    headOfHouse: 'sprout',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseDef: 1 },              msg: '🦡 Résistance naturelle ! +1 DEF' },
      { threshold: 300,  label: 'Élève',     bonus: { _baseDef: 1, _baseLck: 1, item: 'ceinture_blaireau' }, msg: '🦡 Loyauté récompensée ! +1 DEF +1 LCK — la Ceinture du Blaireau vous attend auprès du Pr Chourave.' },
      { threshold: 600,  label: 'Tenace',    bonus: { _baseDef: 2 },              msg: '🦡 Indomptable ! +2 DEF' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'coupe_poufsouffle' },msg: '🦡 La Coupe de Poufsouffle vous attend auprès du Pr Chourave.' },
      { threshold: 2000, label: 'Légende',   bonus: { _baseDef: 3, item: 'bouclier_helga' }, msg: '🦡 Légende de Poufsouffle ! +3 DEF · Le Bouclier de Helga te défend.' },
    ]
  },
};

// ── État du combat ───────────────────────────────────────────
let inBattle        = false;
let enemyGroup      = [];   // tableau de {…enemyData, currentHp, disarmed}
let currentBattleChar = 0;  // 0 = Harry, 1 = Hermione
let shieldTurns     = [0, 0]; // bouclier par personnage
let battleTurn      = 0;
// Sélection de cible en combat (cycle producteur → consommateur) :
//  - battle-ui.js — showTargetSelection(actionType)  écrit pendingAction
//  - inventory.js — openBattleSpells onclick         écrit pendingSpell
//                                                    puis appelle showTargetSelection('spell_dmg')
//  - battle-ui.js — target button onclick            lit les 2, exécute, puis remet à null
//  - battle.js    — startBattle()                    reset à null en début de combat
// Contrat : tout code qui MET pendingAction/pendingSpell doit aussi
// déclencher la sélection de cible (showTargetSelection), sinon le state
// reste « pendant » jusqu'au prochain combat.
let pendingAction   = null;
let pendingSpell    = null;

// Monstres rencontrés en combat (bestiaire)
let seenMonsters = new Set();

// ── Anti-exploit ─────────────────────────────────────────────
// Cases déjà fouillées (clé "x,y") — réinitialisé par étage
let searchedCells = new Set();
// Cache des étages déjà visités (pour éviter la régénération des coffres)
let floorDungeons = {};
// Cooldown de repos (nombre de déplacements avant nouveau repos)
let restCooldown = 0;
// Fontaines utilisées sur l'étage courant (clé "x,y") — vidée à chaque
// entrée d'étage : la fontaine se ré-active si l'on quitte puis revient.
let usedFountains = new Set();
// Cellules où le joueur a tué un ennemi, indexées par étage.
// Map<floor, Set<"x,y">>. À chaque retour sur un étage déjà visité, chaque
// entrée a 20 % de chance de re-spawner un ennemi (`_respawnEnemiesOnEntry`).
// Persisté au save.
let defeatedCellsByFloor = new Map();
// Compteur de kills cumulés par étage (Map<floor, kills>). Sert au scaling
// progressif de la difficulté (rollGroupSize) : chaque tranche de 4 kills
// incrémente le « niveau de visite » n. n ≥ 1 augmente la prob duo (+10%/n,
// cap +40 %), n ≥ 5 active la prob trio (+10%/(n-4), cap +40 %). Persisté.
let floorKillCount = new Map();

// PNJ placés sur l'étage courant : Map "x,y" → npcId.
// Recalculé à chaque génération d'étage, mis en cache dans floorDungeons.
let npcPlacements = new Map();
// PNJ déjà rencontrés (au moins une fois) — pour distinguer 1ère rencontre vs
// visites suivantes dans les dialogues. Persisté au save.
let seenNpcs = new Set();
// PNJ dont l'action spéciale (ex : Fumseck heal+revive) a été utilisée sur
// l'étage courant — clé `npcId`. Vidé à chaque entrée d'étage (analogue
// `usedFountains`). Pas archivé dans `floorDungeons`.
let usedSpecialNpcs = new Set();
// PNJ random porteurs de quêtes farming déjà placés dans cette partie
// (Set<npcId>). Garantit qu'un farming NPC n'est placé qu'une seule fois
// sur l'ensemble du donjon, et permet à `_migrateMissingNpcsForFloor` de
// rattraper les saves antérieures au système. Persisté.
let placedFarmingNpcs = new Set();

// ── Membres du groupe ────────────────────────────────────────
// `player`, `player2`, `party` sont déclarés `const` pour verrouiller
// l'invariant `party[0] === player` (cf. CLAUDE.md §"Règle d'or" save).
// Toute mutation doit passer par `Object.assign(player, …)` — c'est ce
// que fait `_applyState()` dans save.js. Une réassignation casserait
// les références partagées avec `party` et provoquerait des bugs
// silencieux. Voir .claude/plans/code-improvements.md §A2.
const player = {
  name: "Harry Potter", icon: "🧙", imgSrc: "img/harry.png", class: "Élève de Gryffondor",
  level: 1, xp: 0, xpNext: 50,
  hp: 35, hpMax: 35, sp: 22, spMax: 22,
  str: 9, int: 11, agi: 12, end: 10, lck: 15, mag: 10,
  atk: 5, def: 2,
  // Stats de base (s'incrémentent au level-up, indépendamment de l'équipement).
  // _baseStr/_baseInt/_baseAgi/_baseEnd sont lazy-initialisés au premier appel
  // de recalculateStats() pour préserver les gains des saves antérieures à l'extension.
  _baseAtk: 5, _baseDef: 2, _baseMag: 10, _baseLck: 15,
  gold: 25,
  inventory: [],
  // 11 slots étendus — voir .claude/plans/equipment-extended.md §2.1
  equipped: {
    wand: null, head: null, body: null, hands: null, feet: null, cloak: null,
    amulet: null, ring1: null, ring2: null, belt: null, trinket: null
  },
  spells: ["Expelliarmus", "Stupefix", "Episkey", "Protego", "Incendio"],
  wand: "Baguette de Houx", armor: "Robe de Gryffondor", acc: ""
};

const player2 = {
  name: "Hermione Granger", icon: "🧙‍♀️", imgSrc: "img/hermione.png", class: "Élève de Gryffondor",
  level: 1, xp: 0, xpNext: 50,
  hp: 28, hpMax: 28, sp: 35, spMax: 35,
  str: 6, int: 17, agi: 10, end: 7, lck: 12, mag: 16,
  atk: 3, def: 2,
  // Stats de base Hermione (idem Harry : _baseStr/Int/Agi/End lazy-init)
  _baseAtk: 3, _baseDef: 2, _baseMag: 16, _baseLck: 12,
  gold: 0, // l'or est partagé via player.gold
  inventory: [], // inventaire partagé via player.inventory
  equipped: {
    wand: null, head: null, body: null, hands: null, feet: null, cloak: null,
    amulet: null, ring1: null, ring2: null, belt: null, trinket: null
  },
  spells: ["Episkey", "Protego", "Incendio", "Accio"],
  wand: "Baguette de Vigne", armor: "Robe de Gryffondor", acc: ""
};

// party[0] et player pointent vers le même objet
const party = [player, player2];

// ============================================================
// ENDGAME — Victoire vs Voldemort Ressuscité
// ============================================================
// `victoryAchieved` passe à true une seule fois quand
// `voldemort_revenu` tombe en combat (cf. js/endgame.js).
// `victoryAt` mémorise l'ISO-date du trigger. Les deux sont
// persistés via _serializeState / _applyState (save.js).
let victoryAchieved = false;
let victoryAt       = null;

// ============================================================
// QUÊTES SECONDAIRES
// ============================================================
// Catalogue des quêtes : voir QUEST_TEMPLATES dans quests.js.
// Runtime :
//   activeQuests        — quêtes acceptées (clones de templates) en cours.
//   availableQuests     — IDs de quêtes débloquées non encore acceptées.
//   completedQuests     — IDs de quêtes rendues (pour PNJ "déjà servi").
//   lastQuestCompletion — { [questId]: playerLevel } au moment de la remise.
//                         Lu par les quêtes répétables pour gérer le cooldown.
let activeQuests        = [];
let availableQuests     = new Set();
let completedQuests     = new Set();
let lastQuestCompletion = {};

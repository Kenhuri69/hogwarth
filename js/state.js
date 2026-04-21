// ============================================================
// ÉTAT GLOBAL MUTABLE
// ============================================================

// Tableaux de la carte courante
let dungeon, visited, enemyMap, itemMap;

// ============================================================
// OBJETS 3D DANS LE DONJON (coffres, boutiques...)
// ============================================================
let objectMap = []; // même taille que map, contient les objets ou null

const OBJECT_TYPES = {
  chest: {
    id: "chest",
    name: "Coffre ancien",
    icon: "🪑",
    svg: `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="80" height="50" rx="8" fill="#8a7050" stroke="#c9a84c" stroke-width="8"/><rect x="35" y="35" width="30" height="12" fill="#2a1a08"/></svg>`,
    color: "#c9a84c",
    interact: "openChest"
  },
  shop: {
    id: "shop",
    name: "Boutique du Chaudron",
    icon: "🛒",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="30" width="60" height="50" rx="5" fill="#2a1a08" stroke="#c9a84c" stroke-width="12"/><text x="50" y="65" font-size="32" fill="#c9a84c" text-anchor="middle">🪄</text></svg>`,
    color: "#ffd700",
    interact: "openShop"
  },
  stairs_down: {
    id: "stairs_down",
    name: "Escalier descendant",
    icon: "⬇",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="80" height="70" fill="#3a2a1a" stroke="#c9a84c" stroke-width="4"/><rect x="20" y="30" width="60" height="10" fill="#5a4030"/><rect x="20" y="45" width="60" height="10" fill="#5a4030"/><rect x="20" y="60" width="60" height="10" fill="#5a4030"/><rect x="20" y="75" width="60" height="10" fill="#5a4030"/><text x="50" y="20" font-size="24" fill="#c9a84c" text-anchor="middle">⬇</text></svg>`,
    color: "#8a6040",
    interact: "goDeeper"
  },
  stairs_up: {
    id: "stairs_up",
    name: "Escalier remontant",
    icon: "⬆",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="80" height="70" fill="#3a2a1a" stroke="#c9a84c" stroke-width="4"/><rect x="20" y="65" width="60" height="10" fill="#5a4030"/><rect x="20" y="50" width="60" height="10" fill="#5a4030"/><rect x="20" y="35" width="60" height="10" fill="#5a4030"/><rect x="20" y="20" width="60" height="10" fill="#5a4030"/><text x="50" y="18" font-size="24" fill="#c9a84c" text-anchor="middle">⬆</text></svg>`,
    color: "#8a6040",
    interact: "goUp"
  }
};

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
let houseTier   = 0;  // 0 = aucun palier atteint, 1-4 = palier actuel

const HOUSE_BONUSES = {
  Gryffondor: {
    color: '#740001', accent: '#D3A625', emoji: '🦁',
    label: 'Gryffondor',
    desc: 'Bravoure, courage et chevalerie.',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseAtk: 1 },              msg: '🦁 Courage naissant ! +1 ATK' },
      { threshold: 300,  label: 'Élève',     bonus: { _baseAtk: 1, _baseLck: 1 }, msg: '🦁 Bravoure éprouvée ! +1 ATK +1 LCK' },
      { threshold: 600,  label: 'Vaillant',  bonus: { _baseAtk: 2 },              msg: '🦁 Digne de Gryffondor ! +2 ATK' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'sword_gryff' },      msg: "🦁 L'Épée de Gryffondor vous est confiée !" },
    ]
  },
  Serpentard: {
    color: '#1A472A', accent: '#AAAAAA', emoji: '🐍',
    label: 'Serpentard',
    desc: 'Ambition, ruse et détermination.',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseMag: 1 },              msg: "🐍 L'ambition vous galvanise ! +1 MAG" },
      { threshold: 300,  label: 'Élève',     bonus: { _baseMag: 1, _baseLck: 1 }, msg: '🐍 Ruse affûtée ! +1 MAG +1 LCK' },
      { threshold: 600,  label: 'Rusé',      bonus: { _baseMag: 2 },              msg: '🐍 Serpentard vous honore ! +2 MAG' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'locket_slytherin' }, msg: '🐍 Le Médaillon de Serpentard vous appartient !' },
    ]
  },
  Serdaigle: {
    color: '#0E1A40', accent: '#946B2D', emoji: '🦅',
    label: 'Serdaigle',
    desc: 'Sagesse, intelligence et esprit vif.',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseMag: 1 },              msg: "🦅 L'intellect s'éveille ! +1 MAG" },
      { threshold: 300,  label: 'Élève',     bonus: { _baseMag: 1, _baseLck: 1 }, msg: '🦅 Esprit acéré ! +1 MAG +1 LCK' },
      { threshold: 600,  label: 'Savant',    bonus: { _baseMag: 2 },              msg: '🦅 Digne de Serdaigle ! +2 MAG' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'diademe_serdaigle' },msg: '🦅 Le Diadème de Serdaigle vous couronne !' },
    ]
  },
  Poufsouffle: {
    color: '#372E29', accent: '#F0C75E', emoji: '🦡',
    label: 'Poufsouffle',
    desc: 'Loyauté, patience et travail acharné.',
    tiers: [
      { threshold: 100,  label: 'Aspirant',  bonus: { _baseDef: 1 },              msg: '🦡 Résistance naturelle ! +1 DEF' },
      { threshold: 300,  label: 'Élève',     bonus: { _baseDef: 1, _baseLck: 1 }, msg: '🦡 Loyauté récompensée ! +1 DEF +1 LCK' },
      { threshold: 600,  label: 'Tenace',    bonus: { _baseDef: 2 },              msg: '🦡 Indomptable ! +2 DEF' },
      { threshold: 1000, label: 'Champion',  bonus: { item: 'coupe_poufsouffle' },msg: '🦡 La Coupe de Poufsouffle brille pour vous !' },
    ]
  },
};

// ── État du combat ───────────────────────────────────────────
let inBattle        = false;
let enemyGroup      = [];   // tableau de {…enemyData, currentHp, disarmed}
let currentBattleChar = 0;  // 0 = Harry, 1 = Hermione
let shieldTurns     = [0, 0]; // bouclier par personnage
let battleTurn      = 0;
let pendingAction   = null; // action en attente de sélection de cible
let pendingSpell    = null; // sort en attente de sélection de cible

// Monstres rencontrés en combat (bestiaire)
let seenMonsters = new Set();

// ── Membres du groupe ────────────────────────────────────────
let player = {
  name: "Harry Potter", icon: "🧙", imgSrc: "img/harry.png", class: "Élève de Gryffondor",
  level: 1, xp: 0, xpNext: 50,
  hp: 35, hpMax: 35, sp: 22, spMax: 22,
  str: 9, int: 11, agi: 12, end: 10, lck: 15, mag: 10,
  atk: 5, def: 2,
  // Stats de base (s'incrémentent au level-up, indépendamment de l'équipement)
  _baseAtk: 5, _baseDef: 2, _baseMag: 10, _baseLck: 15,
  gold: 25,
  inventory: [],
  equipped: { wand: null, armor: null, acc: null }, // équipement propre à Harry
  spells: ["Expelliarmus", "Stupefix", "Episkey", "Protego", "Incendio"],
  wand: "Baguette de Houx", armor: "Robe de Gryffondor", acc: ""
};

let player2 = {
  name: "Hermione Granger", icon: "🧙‍♀️", imgSrc: "img/hermione.png", class: "Élève de Gryffondor",
  level: 1, xp: 0, xpNext: 50,
  hp: 28, hpMax: 28, sp: 35, spMax: 35,
  str: 6, int: 17, agi: 10, end: 7, lck: 12, mag: 16,
  atk: 3, def: 2,
  // Stats de base Hermione
  _baseAtk: 3, _baseDef: 2, _baseMag: 16, _baseLck: 12,
  gold: 0, // l'or est partagé via player.gold
  inventory: [], // inventaire partagé via player.inventory
  equipped: { wand: null, armor: null, acc: null }, // équipement propre à Hermione
  spells: ["Episkey", "Protego", "Incendio", "Accio"],
  wand: "Baguette de Vigne", armor: "Robe de Gryffondor", acc: ""
};

// party[0] et player pointent vers le même objet
let party = [player, player2];

// ============================================================
// QUÊTES SECONDAIRES
// ============================================================
let activeQuests = [
  {
    id: "mandragore_pomfresh",
    title: "Herboristerie urgente",
    giver: "Madame Pomfresh",
    desc: "Rapporte 3 Racines de Mandragore à l'infirmerie. Les élèves sont encore pétrifiés !",
    objective: { type: "item", itemId: "mandragore", amount: 3 },
    progress: 0,
    reward: { xp: 80, gold: 40, item: "potion_m", spell: "Episkey" },
    completed: false,
    location: "Infirmerie (étage 2)"
  },
  {
    id: "livre_interdit",
    title: "Le livre qui mord",
    giver: "Gilderoy Lockhart",
    desc: "Récupère le Livre des Monstres qui mord dans la Bibliothèque Interdite.",
    objective: { type: "item", itemId: "book_monsters", amount: 1 },
    progress: 0,
    reward: { xp: 120, gold: 25, item: "wand1" },
    completed: false,
    location: "Bibliothèque Interdite (étage 3)"
  },
  {
    id: "troll_toilettes",
    title: "Nettoyage des toilettes",
    giver: "Mimi Geignarde",
    desc: "Élimine le Troll des Toilettes qui bloque l'accès aux cachots.",
    objective: { type: "kill", monsterId: "troll", amount: 1 },
    progress: 0,
    reward: { xp: 150, gold: 60, item: "robe1" },
    completed: false,
    location: "Toilettes du 2e étage"
  },
  {
    id: "chouette_perdue",
    title: "Chouette ensorcelée",
    giver: "Hagrid",
    desc: "Capture une Chouette Ensorcelée et rapporte-la à Hagrid (dans la Forêt).",
    objective: { type: "kill", monsterId: "chouette_envoutee", amount: 1 },
    progress: 0,
    reward: { xp: 90, gold: 30, item: "broom" },
    completed: false,
    location: "Forêt Interdite (étage 4+)"
  }
];

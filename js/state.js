// ============================================================
// ÉTAT GLOBAL MUTABLE
// ============================================================

// Tableaux de la carte courante
let dungeon, visited, enemyMap, itemMap;

// Position et orientation du joueur
let playerX, playerY, playerDir;

// Étage actuel
let currentFloor = 1;

// État du combat
let inBattle = false;
let currentEnemy = null;
let enemyHp = 0;
let shieldTurns = 0;
let enemyDisarmed = 0;
let battleTurn = 0;

// Objet joueur
let player = {
  name: "Harry Potter", icon: "🧙", class: "Élève de Gryffondor",
  level: 1, xp: 0, xpNext: 50,
  hp: 35, hpMax: 35, sp: 22, spMax: 22,
  str: 9, int: 11, agi: 12, end: 10, lck: 15, mag: 10,
  atk: 5, def: 2,
  gold: 25,
  inventory: [],
  spells: ["Expelliarmus","Stupefix","Episkey","Protego","Incendio"],
  wand: "Baguette de Houx", armor: "Robe de Gryffondor", acc: ""
};

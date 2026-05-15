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
let houseTier   = 0;  // 0 = aucun palier atteint, 1-16 = palier actuel
// Items Tier 2 / Tier 4 Maison franchis mais pas encore remis. Le Chef de
// Maison (HOUSE_BONUSES[house].headOfHouse) les distribue lors d'une visite
// via specialAction `claim_house_reward`. Le bonus de stats reste appliqué
// immédiatement au franchissement (checkHouseLevelUp). Tier 5 distribue son
// item directement (cinématique post-victoire endgame).
let pendingHouseRewards = new Set();

// ── Architecture 16 paliers (Bronze/Argent/Or × 5 phases + Légende) ──
// Chaque phase narrative (Apprenti → Confirmé → Expert → Maître →
// Virtuose) se décompose en 3 sous-paliers (Bronze, Argent, Or) :
//   • Bronze → +1 LCK
//   • Argent → +1 stat principale
//   • Or     → récompense narrative (item via head-of-house ou quête)
// Le 16ᵉ palier (Légende) est endgame, gated par victoryAchieved dans
// js/main.js — checkHouseLevelUp.
//
// Étape 1bis (.claude/plans/houses-2.0.md §A) : la grille passe de 6 à
// 16 paliers actifs, avec calibration marathon (max 25000 pts ≈ étages
// 25+). Les Or de Confirmé/Expert/Virtuose recevront leurs items
// (set artifacts) en Étape 2/3 ; le placeholder reste vide d'item ici.
const HOUSE_BONUSES = {
  Gryffondor: {
    color: '#740001', accent: '#D3A625', emoji: '🦁',
    label: 'Gryffondor',
    desc: 'Bravoure, courage et chevalerie.',
    headOfHouse: 'mcgonagall',
    tiers: [
      // Phase 1 — Apprenti
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: '🦁 Premiers exploits ! +1 LCK' },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseAtk: 1 }, msg: '🦁 Le courage s\'affirme ! +1 ATK' },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'brassard_lion' }, msg: '🦁 Bravoure éprouvée — le Brassard du Lion vous attend auprès du Pr McGonagall.' },
      // Phase 2 — Confirmé
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🦁 Lion confirmé ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseAtk: 1 }, msg: '🦁 Crocs aiguisés ! +1 ATK' },
      // Confirmé Or — jalon Or sans artefact (la pièce #1 est livrée à Apprenti Or).
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { _baseAtk: 1, _baseLck: 1 }, msg: '🦁 Confirmé d\'or ! +1 ATK +1 LCK · le Lion en toi gronde.' },
      // Phase 3 — Expert
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🦁 Expertise naissante ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseAtk: 1 }, msg: '🦁 Maître d\'armes ! +1 ATK' },
      // Expert Or — Set artifact #2 = sword_gryff (déjà existant).
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'sword_gryff' }, msg: "🦁 L'Épée de Gryffondor vous attend auprès du Pr McGonagall." },
      // Phase 4 — Maître
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🦁 Maîtrise éprouvée ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseAtk: 1 }, msg: '🦁 Le Lion rugit ! +1 ATK' },
      // Maître Or — débloque la quête de Maison (cf. .claude/plans/houses-2.0.md §D).
      { threshold: 8000,  label: 'Maître Or',       bonus: { _baseAtk: 1, unlockSetQuest: true }, msg: '🦁 Maître d\'or ! +1 ATK — une quête légendaire s\'ouvre à toi.' },
      // Phase 5 — Virtuose
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🦁 Virtuose montant ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseAtk: 1 }, msg: '🦁 Virtuose accompli ! +1 ATK' },
      // Virtuose Or — Set artifact #3 = lame_godric (récompense de la quête, item livré ici uniquement si la quête est validée — câblage Étape 3).
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🦁 Virtuose d\'or — la dernière relique attend que tu termines la quête du Lion.' },
      // Phase 6 — Légende (endgame, gated victoryAchieved)
      { threshold: 25000, label: 'Légende',         bonus: { _baseAtk: 2, _baseLck: 1, legendaryPassive: true }, msg: '🦁 Légende vivante de Gryffondor ! +2 ATK +1 LCK · Maîtrise Légendaire éveillée.' },
    ]
  },
  Serpentard: {
    color: '#1A472A', accent: '#AAAAAA', emoji: '🐍',
    label: 'Serpentard',
    desc: 'Ambition, ruse et détermination.',
    headOfHouse: 'rogue',
    tiers: [
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: "🐍 Premier souffle ! +1 LCK" },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseMag: 1 }, msg: "🐍 L'ambition vous galvanise ! +1 MAG" },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'anneau_serpent' }, msg: "🐍 Ruse affûtée — l'Anneau du Serpent vous attend auprès du Pr Rogue." },
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🐍 Souffle confirmé ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseMag: 1 }, msg: '🐍 Venin distillé ! +1 MAG' },
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { _baseMag: 1, _baseLck: 1 }, msg: '🐍 Confirmé d\'or ! +1 MAG +1 LCK · ta présence rend les autres méfiants.' },
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🐍 Expertise discrète ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseMag: 1 }, msg: '🐍 Maître alchimiste ! +1 MAG' },
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'locket_slytherin' }, msg: '🐍 Le Médaillon de Serpentard vous attend auprès du Pr Rogue.' },
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🐍 Maîtrise sombre ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseMag: 1 }, msg: '🐍 Sortilèges affûtés ! +1 MAG' },
      { threshold: 8000,  label: 'Maître Or',       bonus: { _baseMag: 1, unlockSetQuest: true }, msg: '🐍 Maître d\'or ! +1 MAG — une quête sombre s\'ouvre à toi.' },
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🐍 Virtuose des ombres ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseMag: 1 }, msg: '🐍 Maître absolu ! +1 MAG' },
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🐍 Virtuose d\'or — la dernière relique attend que tu termines la quête du Serpent.' },
      { threshold: 25000, label: 'Légende',         bonus: { _baseMag: 2, _baseLck: 1, legendaryPassive: true }, msg: '🐍 Légende de Serpentard ! +2 MAG +1 LCK · Maîtrise Légendaire éveillée.' },
    ]
  },
  Serdaigle: {
    color: '#0E1A40', accent: '#946B2D', emoji: '🦅',
    label: 'Serdaigle',
    desc: 'Sagesse, intelligence et esprit vif.',
    headOfHouse: 'flitwick',
    tiers: [
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: "🦅 Premier savoir ! +1 LCK" },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseMag: 1 }, msg: "🦅 L'intellect s'éveille ! +1 MAG" },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'plume_aigle' }, msg: "🦅 Esprit acéré — la Plume d'Aigle vous attend auprès du Pr Flitwick." },
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🦅 Savoir confirmé ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseMag: 1 }, msg: '🦅 Esprit aiguisé ! +1 MAG' },
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { _baseMag: 1, _baseLck: 1 }, msg: '🦅 Confirmé d\'or ! +1 MAG +1 LCK · les énigmes te sourient.' },
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🦅 Expertise reconnue ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseMag: 1 }, msg: '🦅 Maître ès arcanes ! +1 MAG' },
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'diademe_serdaigle' }, msg: '🦅 Le Diadème de Serdaigle vous attend auprès du Pr Flitwick.' },
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🦅 Maîtrise aérienne ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseMag: 1 }, msg: '🦅 Sage accompli ! +1 MAG' },
      { threshold: 8000,  label: 'Maître Or',       bonus: { _baseMag: 1, unlockSetQuest: true }, msg: '🦅 Maître d\'or ! +1 MAG — un savoir oublié t\'appelle.' },
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🦅 Virtuose lettré ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseMag: 1 }, msg: '🦅 Maître des sorts ! +1 MAG' },
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🦅 Virtuose d\'or — la dernière relique attend que tu termines la quête de l\'Aigle.' },
      { threshold: 25000, label: 'Légende',         bonus: { _baseMag: 2, _baseLck: 1, legendaryPassive: true }, msg: '🦅 Légende de Serdaigle ! +2 MAG +1 LCK · Maîtrise Légendaire éveillée.' },
    ]
  },
  Poufsouffle: {
    color: '#372E29', accent: '#F0C75E', emoji: '🦡',
    label: 'Poufsouffle',
    desc: 'Loyauté, patience et travail acharné.',
    headOfHouse: 'sprout',
    tiers: [
      { threshold: 50,    label: 'Apprenti Bronze', bonus: { _baseLck: 1 }, msg: '🦡 Premier serment ! +1 LCK' },
      { threshold: 150,   label: 'Apprenti Argent', bonus: { _baseDef: 1 }, msg: '🦡 Résistance naturelle ! +1 DEF' },
      { threshold: 300,   label: 'Apprenti Or',     bonus: { item: 'ceinture_blaireau' }, msg: '🦡 Loyauté récompensée — la Ceinture du Blaireau vous attend auprès du Pr Chourave.' },
      { threshold: 500,   label: 'Confirmé Bronze', bonus: { _baseLck: 1 }, msg: '🦡 Patience confirmée ! +1 LCK' },
      { threshold: 800,   label: 'Confirmé Argent', bonus: { _baseDef: 1 }, msg: '🦡 Carapace renforcée ! +1 DEF' },
      { threshold: 1200,  label: 'Confirmé Or',     bonus: { _baseDef: 1, _baseLck: 1 }, msg: '🦡 Confirmé d\'or ! +1 DEF +1 LCK · tes amis sentent ta présence rassurante.' },
      { threshold: 1700,  label: 'Expert Bronze',   bonus: { _baseLck: 1 }, msg: '🦡 Travail acharné ! +1 LCK' },
      { threshold: 2500,  label: 'Expert Argent',   bonus: { _baseDef: 1 }, msg: '🦡 Indomptable ! +1 DEF' },
      { threshold: 3500,  label: 'Expert Or',       bonus: { item: 'coupe_poufsouffle' }, msg: '🦡 La Coupe de Poufsouffle vous attend auprès du Pr Chourave.' },
      { threshold: 4500,  label: 'Maître Bronze',   bonus: { _baseLck: 1 }, msg: '🦡 Maîtrise tenace ! +1 LCK' },
      { threshold: 6000,  label: 'Maître Argent',   bonus: { _baseDef: 1 }, msg: '🦡 Bouclier vivant ! +1 DEF' },
      { threshold: 8000,  label: 'Maître Or',       bonus: { _baseDef: 1, unlockSetQuest: true }, msg: '🦡 Maître d\'or ! +1 DEF — un dernier serment t\'attend.' },
      { threshold: 10000, label: 'Virtuose Bronze', bonus: { _baseLck: 1 }, msg: '🦡 Virtuose patient ! +1 LCK' },
      { threshold: 13000, label: 'Virtuose Argent', bonus: { _baseDef: 1 }, msg: '🦡 Forteresse vivante ! +1 DEF' },
      { threshold: 16000, label: 'Virtuose Or',     bonus: {}, msg: '🦡 Virtuose d\'or — la dernière relique attend que tu termines la quête du Blaireau.' },
      { threshold: 25000, label: 'Légende',         bonus: { _baseDef: 2, _baseLck: 1, legendaryPassive: true }, msg: '🦡 Légende de Poufsouffle ! +2 DEF +1 LCK · Maîtrise Légendaire éveillée.' },
    ]
  },
};

// ============================================================
// SYSTÈME DE SETS DE MAISON — placeholder Étape 1
// ============================================================
// Chaque Maison aura à terme 3 artefacts (slots distincts) liés par
// un `setKey`. Bonus 2/3 pièces appliqués dans recalculateStats() à
// partir de l'Étape 4. Les pieceIds restent vides ici : ils seront
// remplis lors de la création des items en Étape 2, et reliés aux
// paliers 3-5 en Étape 3. Cf. .claude/plans/houses-2.0.md §B.
const HOUSE_SETS = {
  Gryffondor: {
    setKey:    'gryff_set',
    setLabel:  'Set du Lion',
    pieceIds:  [],                                 // [piece1, piece2, piece3]
    setBonus2: { bonusAtk: 1, bonusCritChance: 5 },
    setBonus3: { bonusAtk: 3, bonusCritChance: 10, immuneDisarm: true },
  },
  Serpentard: {
    setKey:    'slyth_set',
    setLabel:  'Set du Serpent',
    pieceIds:  [],
    setBonus2: { bonusMag: 1, bonusLck: 1 },
    setBonus3: { bonusMag: 3, bonusLck: 2, spellLifesteal: 0.10 },
  },
  Serdaigle: {
    setKey:    'raven_set',
    setLabel:  "Set de l'Aigle",
    pieceIds:  [],
    setBonus2: { bonusMag: 1, bonusInt: 1 },
    setBonus3: { bonusMag: 3, bonusInt: 2, spellCostReduction: 0.10 },
  },
  Poufsouffle: {
    setKey:    'pouf_set',
    setLabel:  'Set du Blaireau',
    pieceIds:  [],
    setBonus2: { bonusDef: 1, bonusEnd: 1 },
    setBonus3: { bonusDef: 3, bonusEnd: 2, regenHp: 2 },
  },
};

// ── État du combat ───────────────────────────────────────────
let inBattle        = false;
let enemyGroup      = [];   // tableau de {…enemyData, currentHp, disarmed}
let currentBattleChar = 0;  // 0 = Harry, 1 = Hermione
let shieldTurns     = [0, 0]; // bouclier par personnage (Protego)
let guardTurns      = [0, 0]; // posture de Garde — mitigation 50 % sur le prochain coup ennemi
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

// Étages déjà visités par le joueur — alimentés par goDeeper/goUp et le
// démarrage de partie (1 = couloir d'entrée). Consommés par la modale de
// téléportation hors combat (Portus) pour proposer la liste des destinations.
// Persisté dans le save.
let visitedFloors = new Set([1]);

// Cooldowns du sort Portus (cf. .claude/plans/teleportation-spell.md §"Itération 2").
//  - portusOocCooldown   : transitions d'étage (escaliers) restantes avant
//                          de pouvoir relancer Portus hors combat. Décrémenté
//                          par goDeeper/goUp.
//  - portusFightCooldown : combats gagnés restants avant de pouvoir relancer
//                          Portus en combat. Décrémenté par endBattle(won=true).
// Persistés dans le save. Reset à startGame.
let portusOocCooldown   = 0;
let portusFightCooldown = 0;

// Cooldown des sorts de soin hors combat (Episkey, Reparo et tout futur sort
// effect:"heal"). Décrémenté dans _step à chaque pas réussi. Partagé entre
// tous les sorts de soin (cf. .claude/plans/teleportation-spell.md §Itération 3).
// Persisté dans le save, reset à startGame.
let healSpellCooldown = 0;

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

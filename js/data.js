// ============================================================
// CONSTANTES DE CARTE
// ============================================================
const MAP_W = 16, MAP_H = 16;
// Taille maximale d'un groupe ennemi en combat (cf. rollGroupSize battle.js,
// cap d'invocation summon battle-spells.js). Groupes de 4-5 réservés à
// l'endgame en duo — voir .claude/plans/extend-opponent-count.md.
const MAX_ENEMY_GROUP = 5;
const CELL = {
  WALL:0, FLOOR:1, DOOR:2, STAIRS_D:3, STAIRS_U:4, SHOP:5, CHEST:6,
  FOUNTAIN:7, NPC:8,
  // Endgame Tranche 2 — Forge des Ténèbres (upgrade items) et Bibliothèque
  // interdite (upgrade sorts). Voir ENDGAME_PLAN.md §7.5/§7.6.
  FORGE:9, LIBRARY:10,
  // Enrichissement du donjon (Phase 2) — piège caché (§2.A) et autel
  // risque/récompense (§2.B). Voir .claude/plans/dungeon-enrichment.md.
  TRAP:11, ALTAR:12,
  // Enrichissement V2 — dalle-rune d'un puzzle d'exploration. Marchable
  // (≠ WALL) ; allumée en marchant dessus. Voir dungeon-enrichment-v2.md.
  RUNE:13,
  // Enrichissement V2 Phase 3 — stèle d'énigme. Marchable (≠ WALL) ;
  // marcher dessus ouvre un overlay de devinette. Voir dungeon-enrichment-v2.md §3.
  STELE:14,
  // Potions P6.b3 — jardin d'herbes à récolte passive. Marchable (≠ WALL) ;
  // caché par défaut (Set `hiddenGardens`), révélé par Revelio / fouille.
  // Voir .claude/plans/potions-enrichment.md §P6.b3.
  GARDEN:15,
  // Easter egg « Salle sur Demande » — porte révélée en passant 3× devant un
  // pan de mur propice. Marchable (≠ WALL) ; entrer ouvre un overlay de refuge.
  // Voir .claude/plans/room-of-requirement-easter-egg.md.
  REQUIREMENT:16,
  // Refuge du Blaireau (Poufsouffle) — point de repos récurrent, parent de la
  // fontaine. N'apparaît que si chosenHouse==='Poufsouffle'. Soin partiel
  // 1×/visite. Voir .claude/plans/refuge-poufsouffle.md.
  REFUGE:17
};

// Refuge du Blaireau — fraction des PV/PM max rendus par usage (≠ fontaine
// 100 %). Repos « de campagne » : filet de sécurité, pas restauration totale.
const REFUGE_HEAL_FRAC = 0.5;

// Identité des 3 dalles-runes d'un puzzle, indexée par position dans
// `runePuzzle.runes`. `color` teinte le glyphe (rendu 3D + minimap),
// `rgb` alimente les halos rgba, `name` nomme la rune dans l'inscription
// d'indice des puzzles ordonnés. Voir dungeon-enrichment-v2.md §1.4/§2.3.
const RUNE_LABELS = [
  { name: "l'émeraude",  color: '#3fae6b', rgb: '63,174,107'  },
  { name: "l'or",        color: '#e0c24a', rgb: '224,194,74'  },
  { name: "l'améthyste", color: '#a06fd8', rgb: '160,111,216' }
];

// Vecteurs de déplacement par direction cardinale (N, S, E, O).
// Indexé par playerDir / cellule cible.
const DIRECTIONS = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };

// ============================================================
// CONSTANTES DE GAMEPLAY
// ============================================================

// Progression d'XP : multiplicateur appliqué à xpNext à chaque level-up.
const LEVEL_UP_XP_MULTIPLIER = 1.6;

// XP passive de Boucle (Chapitre 13 §13.9.F P2 — adoucissement endgame).
// À chaque NOUVEL étage de Boucle Ténébreuse le plus profond franchi (11+,
// post-victoire), le groupe gagne `LOOP_PASSIVE_XP_FRAC × player.xpNext` d'XP.
// Exprimée en fraction du coût du niveau courant → ~0.45 niveau par étage
// descendu, auto-pacé sur la composition ×1.6. C'est un AXE DE PROGRESSION
// ADDITIF (règle §13.6 #6 : on n'altère pas le scaling) qui transforme le mur
// endgame en pente sans le supprimer — le farming reste la voie du confort
// total (cf. DIFFICULTY_STUDY.md §8.8). Anti-farm : seul un nouvel étage
// descendu crédite (même gate que les Éclats). Calibrage validé à 0.45 par
// tools/sim-difficulty.js --endgame --loop-xp-frac. 0 = désactivé.
const LOOP_PASSIVE_XP_FRAC = 0.45;

// Points de stats libres gagnés à chaque level-up, en plus du baseline
// (+1 ATK/DEF/MAG, +1 STR/INT/AGI, +8 HP, +5 SP qui restent dans `_grantLevelStats`).
// `unallocatedStatPoints` sur chaque perso accumule les points non dépensés.
const STAT_POINTS_PER_LEVEL = 3;

// Effet d'un point alloué : mutation appliquée à `c._baseX` (ou `hpMax`)
// pour persister à travers les futurs level-ups via `recalculateStats`.
// Clés UI : STR / INT / AGI / END / LCK.
const STAT_POINT_EFFECTS = {
  STR: { baseAtk: 1, baseStr: 1 },// +1 ATK (+1 STR pour cohérence affichage)
  INT: { baseInt: 1 },          // +1 INT permanent (maîtrise : soins, fiabilité/durée des effets)
  AGI: { baseAgi: 1 },          // +1 AGI (impacte dodge dans recalculateStats)
  END: { hpMax: 5, baseEnd: 1 },// +5 HP max (+ +1 END pour cohérence affichage)
  LCK: { baseLck: 1 },          // +1 LCK (impacte crit dans recalculateStats)
};

// Points de Maison gagnés par kill, selon la difficulté courante.
const HOUSE_POINTS_PER_KILL = { Facile: 8, Normal: 10, Difficile: 14, Expert: 18 };

// Résistance / faiblesse aux types de dégâts magiques.
// (battle.js — tickStatuses ; battle-spells.js — _spellElementalDamage,
//  _spellLifesteal, _spellCurse)
const RESIST_MULTIPLIER = 0.5;
const WEAK_MULTIPLIER   = 1.5;

// Plancher de dégâts (cf. DIFFICULTY_STUDY.md §4 levier B). Un coup inflige
// toujours au moins cette fraction de l'ATK brute, même contre une DEF très
// élevée — supprime la falaise « attaque à 1 dégât ». La soustraction
// atk − def reste utilisée tant qu'elle dépasse ce plancher.
const DAMAGE_MIN_FRACTION = 0.25;

// ── Rework des statistiques du joueur (D1–D5) ────────────────
// Conversions stat secondaire → primaire (recalculateStats) et leviers de
// combat. Calibration validée par tools/sim-difficulty.js (réglage adouci) :
// early game intact, gain endgame homogène, pas de build dominant. Cf.
// .claude/plans/player-stats-balance.md §4.
const INT_MAG_DIV     = 4;   // D1 — INT → MAG : mag += floor(int/INT_MAG_DIV)
const END_DEF_DIV     = 6;   // D2 — END → DEF : def += floor(end/END_DEF_DIV)
const END_DOT_RES_DIV = 12;  // D3 — END → résistance DoT : tick subi −floor(end/12)
const END_HP_PER      = 5;   // END → PV max : +5 PV par point d'END gagné (équip./sets), aligné sur l'allocation END (+5 PV)
const STR_PEN_CAP     = 0.50; // D4 — pénétration de DEF (courbe de Hill, plafond)
const STR_PEN_HALF    = 20;   // D4 — STR de demi-saturation de la courbe

// ── Fortune (D5, volet LCK) — cf. .claude/plans/luck-fortune.md ──
// Stat dérivée pilotant les événements aléatoires hors-crit (drops, or,
// fouille/coffres, fuite/pièges). Courbe de Hill saturante sur
// x = LCK + Σ item.bonusFortune (+ buff Félix transient).
const FORTUNE_ASYMPTOTE = 0.31; // la courbe tend vers 31 % (jamais atteint)
const FORTUNE_HALF      = 30;   // demi-saturation : x=30 → 15.5 %
const FELIX_POINTS      = 40;   // points de chance apportés par le buff Félix
const FELIX_STEPS       = 40;   // durée du buff Félix, en pas d'exploration

// Easter egg « Salle sur Demande » — refuge « repos sûr + petit buff ».
// Voir .claude/plans/room-of-requirement-easter-egg.md §3.
const REQUIREMENT_REST_FRAC  = 0.40; // repos : +40 % PV/PM par membre vivant
const REQUIREMENT_BUFF_STEPS = 20;   // durée du buff de Confort, en pas (+1 PV/PM par pas)
// V3 (room-of-requirement-v3.md) — seuil d'or (× étage) du thème « boutique
// éphémère » : beaucoup d'or → la Salle se fait étal de marchand.
const REQUIREMENT_COMMERCE_GOLD = 120;
// V3 — trophée cosmétique unique du thème « loot » (collectible NON inventorié :
// pas d'entrée ITEMS, pas d'équipement, pas de cap 16). Sa découverte arme un
// flag de partie + enregistre le codex localStorage. Pur trophée, zéro bonus.
// V3.1 — élargi en jeu de 6 trophées cosmétiques (1 par thème + complétion).
const REQUIREMENT_TROPHIES = [
  { id:'eclat_refuge',   theme:'refuge',    name:'Braise du Refuge',       icon:'🔥', img:'img/icons/requirement/eclat_refuge.png' },
  { id:'eclat_loot',     theme:'loot',      name:'Éclat de la Cache',      icon:'✦', img:'img/icons/requirement/eclat_loot.png' },
  { id:'eclat_training', theme:'training',  name:"Fanion d'Entraînement",  icon:'⚔️', img:'img/icons/requirement/eclat_training.png' },
  { id:'eclat_boutique', theme:'boutique',  name:'Jeton du Marchand',      icon:'🛒', img:'img/icons/requirement/eclat_boutique.png' },
  { id:'eclat_forge',    theme:'forge',     name:'Scorie de la Forge',     icon:'🔨', img:'img/icons/requirement/eclat_forge.png' },
  { id:'eclat_complet',  theme:'_complete', name:'Couronne de la Salle',   icon:'👑', img:'img/icons/requirement/eclat_complet.png' }
];
// Map theme → trophée (lookup direct).
const REQUIREMENT_TROPHY_BY_THEME = REQUIREMENT_TROPHIES.reduce((m, t) => { m[t.theme] = t; return m; }, {});

// ── Célérité (D5, volet AGI) — cf. .claude/plans/agi-derived.md ──
// Débouché post-plafond de l'AGI (crit de sort + esquive plafonnent à 35 %).
// Stat dérivée = TAUX continu d'actions supplémentaires par round (gain de tour
// FLUIDE via accumulateur de tempo, jamais par palier). Courbe de Hill sur
// x = AGI + Σ item.bonusCelerite. Calibration validée par sim (0.30/45) :
// early game intact, débouché AGI ciblé, pas de build dominant.
const CELERITE_MAX  = 0.30; // taux max d'actions sup./round (asymptote)
const CELERITE_HALF = 45;   // demi-saturation : AGI 45 → 15 %

// Fouille de salle (movement.js — searchRoom) : seuils cumulatifs sur un
// Math.random(). roll < GOLD : trouve de l'or. roll < ITEM (et ≥ GOLD) :
// trouve un item. Sinon : rien.
const SEARCH_GOLD_THRESHOLD = 0.20;
const SEARCH_ITEM_THRESHOLD = 0.35;

// Fouille de salle — malus (jets indépendants, avant le tirage de butin) :
// 1 % de tomber sur un monstre de l'étage courant, 1 % de déclencher un piège.
const SEARCH_MONSTER_CHANCE = 0.01;
const SEARCH_TRAP_CHANCE    = 0.01;

// Repos (movement.js — rest) : chance d'être interrompu par une rencontre.
const REST_ENCOUNTER_CHANCE = 0.3;
// Fraction du soin de repos conservée quand une rencontre interrompt le repos.
const REST_INTERRUPT_HEAL_FRACTION = 0.5;

// ============================================================
// DONNÉES DU JEU
// ============================================================
const CHARACTERS = {
  harry: { name:"Harry Potter", icon:"🧙", class:"Élève de Gryffondor",
    imgSrc:"img/harry.png", role:"Auror",
    hp:35, sp:22, str:9, int:11, agi:12, end:10, lck:15, mag:10,
    atk:5, def:2,
    wand:"Baguette de Houx", armor:"Robe de Gryffondor", acc:"Lunettes Rondes",
    spells:["Expelliarmus","Stupefix","Episkey","Protego","Incendio"],
    tagline:"Le Survivant — courage et instinct."
  },
  hermione: { name:"Hermione Granger", icon:"🧙‍♀️", class:"Élève de Gryffondor",
    imgSrc:"img/hermione.png", role:"Mage",
    hp:28, sp:35, str:6, int:17, agi:10, end:7, lck:12, mag:16,
    atk:3, def:2,
    wand:"Baguette de Vigne", armor:"Robe de Gryffondor", acc:"",
    spells:["Episkey","Protego","Incendio","Accio"],
    tagline:"Brillante érudite — la magie par le savoir."
  },
  draco: { name:"Drago Malefoy", icon:"🐍", class:"Élève de Serpentard",
    imgSrc:"img/draco.png", role:"Duelliste",
    hp:29, sp:30, str:7, int:13, agi:13, end:8, lck:14, mag:14,
    atk:4, def:2,
    wand:"Baguette d'Aubépine", armor:"Robe de Serpentard", acc:"Insigne de Préfet",
    spells:["Expelliarmus","Stupefix","Protego","Episkey"],
    tagline:"Sang-pur ambitieux — la fierté avant tout."
  },
  cho: { name:"Cho Chang", icon:"🦅", class:"Élève de Serdaigle",
    imgSrc:"img/cho.png", role:"Attrapeuse",
    hp:30, sp:30, str:6, int:14, agi:15, end:8, lck:13, mag:14,
    atk:4, def:2,
    wand:"Baguette de Frêne", armor:"Robe de Serdaigle", acc:"Vif d'Or",
    spells:["Expelliarmus","Stupefix","Protego","Episkey"],
    tagline:"Attrapeuse de Serdaigle — vive et perspicace."
  },
  cedric: { name:"Cedric Diggory", icon:"🦡", class:"Élève de Poufsouffle",
    imgSrc:"img/cedric.png", role:"Champion",
    hp:34, sp:26, str:9, int:12, agi:13, end:11, lck:13, mag:12,
    atk:5, def:2,
    wand:"Baguette de Frêne et Licorne", armor:"Robe de Poufsouffle", acc:"Insigne de Capitaine",
    spells:["Expelliarmus","Stupefix","Protego","Episkey"],
    tagline:"Champion de Poufsouffle — loyal et valeureux."
  },
  // ── Personnages originaux ─────────────────────────────────
  celeste: { name:"Céleste Luneclair", icon:"🌙", class:"Élève de Serdaigle",
    imgSrc:"img/celeste.png", role:"Astromage",
    hp:30, sp:34, str:6, int:15, agi:11, end:8, lck:14, mag:15,
    atk:3, def:2,
    wand:"Baguette de Bouleau d'Argent", armor:"Robe de Serdaigle", acc:"Pendentif Lunaire",
    spells:["Episkey","Protego","Lumos Maxima","Aguamenti"],
    tagline:"Astromage de Serdaigle — la lune guide ses sortilèges."
  },
  iris: { name:"Iris Prismara", icon:"✨", class:"Élève de Poufsouffle",
    imgSrc:"img/iris.png", role:"Enchanteresse",
    hp:32, sp:28, str:7, int:13, agi:14, end:9, lck:18, mag:13,
    atk:4, def:2,
    wand:"Baguette de Cristal d'Iris", armor:"Robe de Poufsouffle", acc:"Prisme d'Arc-en-ciel",
    spells:["Expelliarmus","Protego","Incendio","Riddikulus"],
    tagline:"Enchanteresse prismatique — la chance et la lumière à ses côtés."
  },
  maxence: { name:"Maxence Ravenwood", icon:"🐍", class:"Élève de Serpentard",
    imgSrc:"img/maxence.png", role:"Mage de Sang",
    hp:26, sp:32, str:5, int:14, agi:11, end:7, lck:11, mag:14,
    atk:4, def:1,
    wand:"Baguette d'If Noueux", armor:"Robe de Serpentard", acc:"Médaillon de Sang",
    spells:["Episkey","Protego","Sanguini","Stupefix"],
    tagline:"Sorcier-vampire — son sang répond au sang."
  },
  anastasia: { name:"Anastasia Moonveil", icon:"🌙", class:"Élève de Gryffondor",
    imgSrc:"img/anastasia.png", role:"Mage de la Lune",
    hp:30, sp:32, str:7, int:16, agi:11, end:8, lck:13, mag:15,
    atk:4, def:2,
    wand:"Baguette de Bois de Lune", armor:"Robe de Gryffondor", acc:"Lunettes de Lune",
    spells:["Episkey","Protego","Wingardium Leviosa","Lumos Maxima"],
    tagline:"Magicienne studieuse — la magie au clair de lune."
  },
  louis: { name:"Louis Dragonflamme", icon:"🐉", class:"Élève de Poufsouffle",
    imgSrc:"img/louis.png", role:"Dompteur de Dragons",
    hp:33, sp:26, str:8, int:12, agi:11, end:10, lck:13, mag:12,
    atk:5, def:2,
    wand:"Baguette d'Acacia", armor:"Robe de Poufsouffle", acc:"Brassard d'Écailles",
    spells:["Expelliarmus","Protego","Incendio","Episkey"],
    tagline:"Dompteur de dragons — sa baguette pulse au rythme du feu."
  },
  jeanne: { name:"Jeanne d'Argenciel", icon:"🪄", class:"Élève de Gryffondor",
    imgSrc:"img/jeanne.png", role:"Charmeuse de Sortilèges",
    hp:31, sp:30, str:7, int:15, agi:13, end:9, lck:14, mag:14,
    atk:4, def:2,
    wand:"Baguette d'Étoile", armor:"Robe de Gryffondor", acc:"Grimoire de Sortilèges",
    spells:["Wingardium Leviosa","Protego","Episkey","Lumos Maxima"],
    tagline:"Petite Gryffondor espiègle — ses sortilèges chantent comme des étoiles."
  },
  margaux: { name:"Margaux Aiglebrume", icon:"⭐", class:"Élève de Serdaigle",
    imgSrc:"img/margaux.png", role:"Astromancienne",
    hp:28, sp:33, str:5, int:16, agi:13, end:7, lck:16, mag:14,
    atk:3, def:2,
    wand:"Baguette d'Aulne Étoilé", armor:"Robe de Serdaigle", acc:"Grimoire des Enchantements",
    spells:["Protego","Episkey","Lumos Maxima","Wingardium Leviosa"],
    tagline:"Petite astromancienne de Serdaigle — son grimoire scintille d'étincelles d'étoiles."
  },
  // ── La Garde de l'Aube ────────────────────────────────────
  agathe: { name:"Agathe Lumiflore", icon:"🌸", class:"Élève de Gryffondor",
    imgSrc:"img/agathe.png", role:"Enchanteresse florale",
    hp:31, sp:32, str:6, int:14, agi:11, end:11, lck:13, mag:14,
    atk:3, def:3,
    wand:"Baguette de Cerisier en Fleur", armor:"Robe de Gryffondor", acc:"Couronne de Fleurs",
    spells:["Episkey","Ferula","Wingardium Leviosa","Protego"],
    tagline:"Enchanteresse florale — la vie s'épanouit sous ses sortilèges."
  },
  olivier: { name:"Olivier de Clairval", icon:"🔥", class:"Élève de Serdaigle",
    imgSrc:"img/olivier.png", role:"Mage de combat",
    hp:29, sp:33, str:7, int:15, agi:12, end:8, lck:12, mag:15,
    atk:4, def:2,
    wand:"Baguette de Chêne Ardent", armor:"Robe de Serdaigle", acc:"Plume d'Aigle",
    spells:["Incendio","Stupefix","Protego","Episkey"],
    tagline:"Mage de combat — chaque sortilège frappe comme la foudre."
  },
  nathalie: { name:"Nathalie Finch", icon:"🌻", class:"Élève de Poufsouffle",
    imgSrc:"img/nathalie.png", role:"Gardienne-Herboriste",
    hp:36, sp:24, str:9, int:12, agi:9, end:13, lck:12, mag:11,
    atk:5, def:4,
    wand:"Baguette de Chêne Noueux", armor:"Robe de Poufsouffle", acc:"Besace d'Herboriste",
    spells:["Episkey","Protego","Ferula","Incendio"],
    tagline:"Gardienne-herboriste — un rempart patient pour les siens."
  },
  chatillon: { name:"Olivier De Châtillon", icon:"🌑", class:"Élève de Serpentard",
    imgSrc:"img/chatillon.png", role:"Ombremancien",
    hp:27, sp:34, str:5, int:16, agi:13, end:7, lck:12, mag:16,
    atk:3, def:2,
    wand:"Baguette d'Ébène", armor:"Robe de Serpentard", acc:"Camée d'Ombre",
    spells:["Expelliarmus","Stupefix","Protego","Incendio"],
    tagline:"Ombremancien de Serpentard — la ruse frappe avant la lumière."
  }
};

// Les ennemis sont définis dans js/monsters.js (MONSTERS)

const SPELLS = [
  // ── Sorts de base ────────────────────────────────────────────
  { name:"Expelliarmus",      icon:"✨",   desc:"Désarme l'ennemi (réduit son ATK)",  cost:4,  effect:"disarm",  power:3  },
  { name:"Stupefix",          icon:"⚡",   desc:"Étourdit l'ennemi (8 dégâts)",       cost:6,  effect:"stun",    element:"foudre",   power:8  },
  { name:"Episkey",           icon:"💚",   desc:"Soigne légèrement (12 PV)",          cost:5,  effect:"heal",    power:12 },
  { name:"Ferula",            icon:"🩹",   desc:"Bande un allié (+4 PV puis 4 PV/tour × 3 tours)", cost:6,  effect:"support_regen", power:4 },
  { name:"Ferula Maxima",     icon:"🩹",   desc:"Régénère PV + PM des deux alliés (3 tours)", cost:12, effect:"support_regen_aoe", power:1 },
  { name:"Protego",           icon:"🛡️",  desc:"Bouclier magique (durée selon MAG)",  cost:5,  effect:"shield",  power:5  },
  { name:"Incendio",          icon:"🔥",   desc:"Flammes magiques (14 dégâts)",       cost:8,  effect:"burn",    element:"feu",      power:14 },
  { name:"Accio",             icon:"🌀",   desc:"Tire un objet ennemi (+or)",         cost:6,  effect:"steal",   power:0  },
  // ── Sorts avancés (appris en jeu) ────────────────────────────
  { name:"Wingardium Leviosa",icon:"🌬️",  desc:"Soulève et assomme (10 dégâts)",     cost:7,  effect:"stun",    element:"physique", power:10 },
  { name:"Diffindo",          icon:"✂️",   desc:"Lacère l'ennemi (16 dégâts)",        cost:9,  effect:"burn",    element:"physique", power:16 },
  { name:"Reparo",            icon:"💛",   desc:"Soin renforcé (20 PV)",              cost:7,  effect:"heal",    power:20 },
  { name:"Sectumsempra",      icon:"🩸",   desc:"Sort maudit (24 dégâts)",            cost:14, effect:"burn",    element:"physique", power:24 },
  // ── Sorts intermédiaires ─────────────────────────────────────
  { name:"Lumos Maxima",      icon:"💡",   desc:"Éclat aveuglant (12 dégâts + stun)", cost:8,  effect:"stun",    element:"lumière",  power:12 },
  { name:"Aguamenti",         icon:"💧",   desc:"Jet d'eau (10 dégâts, -2 DEF)",      cost:7,  effect:"burn",    element:"glace",    power:10 },
  { name:"Bombarda",          icon:"💥",   desc:"Explosion : 20 dégâts + éclaboussure sur les autres ennemis", cost:15, effect:"burn",    element:"feu",      power:20, splash:true },
  { name:"Riddikulus",        icon:"🤡",   desc:"Neutralise les créatures du chaos",  cost:6,  effect:"stun",    element:"lumière",  power:8  },
  { name:"Alohomora",         icon:"🔓",   desc:"Vole une grosse bourse de Gallions", cost:5,  effect:"steal",   power:20 },
  { name:"Patronum",          icon:"✨",   desc:"Patronus : 18 dégâts anti-Détraqueur", cost:12, effect:"burn",  element:"lumière",  power:18 },
  // ── Sorts élémentaires (glace / foudre / lumière) ────────────
  { name:"Glacius",           icon:"❄️",   desc:"Givre mordant (14 dégâts, engelures)", cost:8,  effect:"stun",  element:"glace",    power:14 },
  { name:"Fulgari",           icon:"⚡",   desc:"Foudre canalisée (16 dégâts)",         cost:9,  effect:"stun",  element:"foudre",   power:16 },
  { name:"Lumos Solem",       icon:"☀️",   desc:"Lumière solaire — ravage les morts-vivants", cost:10, effect:"burn", element:"lumière", power:16, bonusVsUndead:1.5 },
  // ── Sort interdit (débloqué au niveau 9) ─────────────────────
  { name:"Avada...",          icon:"💚✨", desc:"Malédiction mortelle (50 dégâts)",   cost:20, effect:"instant", element:"ténèbres", power:50, locked:true },
  // ── Sort utilitaire — Téléportation (Portus) ─────────────────
  // Achetable cher en boutique (livre_portus). Utilisable en combat
  // (déplace le groupe OU bannit un ennemi non-boss) et hors combat
  // (rejoint un étage déjà visité, case libre random).
  // Coût hors combat : `outOfCombatCost` (38 PM). Voir js/teleport.js.
  { name:"Portus",            icon:"🌀",   desc:"Téléportation tactique (combat ou hors combat)", cost:52, outOfCombatCost:38, effect:"teleport", power:0 },
  // ── Sort utilitaire — Révélation (Revelio) ───────────────────
  // Enseigné par la quête « Le vrai du faux » de Manon (Acte II).
  // Double usage : hors combat dissipe le brouillard alentour et
  // dévoile les pages dissimulées ; en combat révèle d'un coup le
  // panneau d'info du monstre ciblé. Voir .claude/plans/manon-grimoire-pages.md.
  { name:"Revelio",           icon:"🔎",   desc:"Dévoile : le brouillard et les pages cachées (hors combat) ou les secrets d'un monstre (combat)", cost:2, effect:"reveal", element:"lumière", power:0 },
  // ── Sorts de Vampirisme ─────────────────────────────────────
  { name:"Sanguini",          icon:"🩸",   desc:"Vol de vie (12 dégâts, +6 PV)",      cost:8,  effect:"lifesteal", element:"ténèbres", power:12 },
  { name:"Vampyrus",          icon:"🦇",   desc:"Drain magique (18 dégâts, +9 PV)",   cost:14, effect:"lifesteal", element:"ténèbres", power:18 },
  // ── Sorts de Malédiction ────────────────────────────────────
  { name:"Tarantallegra",     icon:"💃",   desc:"Danse maudite (8 dégâts + étourdis)", cost:7, effect:"stun",   element:"foudre",   power:8  },
  { name:"Maledictus",        icon:"☠️",   desc:"Malédiction (10 dégâts, −3 ATK/DEF)", cost:9, effect:"curse",  element:"ténèbres", power:10 },
  { name:"Crucio",            icon:"😖",   desc:"Sort de douleur interdit (22 dégâts)", cost:14, effect:"burn", element:"feu",      power:22 },
  { name:"Morsmordre",        icon:"💀",   desc:"Marque des Ténèbres (26 dégâts)",     cost:18, effect:"burn", element:"ténèbres", power:26 },
  // ── Sorts de Maison — palier 17 « Mythe » (1 sort exclusif/Maison) ──
  // Enseignés au franchissement du palier Mythe via `grantsSpell`.
  { name:"Patronus Maxima",       icon:"🦌", desc:"Bouclier de groupe (2 tours) + dissipe l'étourdissement", cost:22, effect:"patronus_maxima", power:0 },
  { name:"Sectumsempra Imperius", icon:"🩸", desc:"Saignement lourd + asservit la cible (2 tours)",          cost:24, effect:"imperius", element:"ténèbres", power:20 },
  { name:"Legilimens",            icon:"👁️", desc:"Lit l'esprit ennemi : annule la prochaine capacité",      cost:18, effect:"legilimens", power:0 },
  { name:"Récolte Magique",       icon:"🌾", desc:"Restaure tout le groupe · or du combat majoré (+50%)",    cost:26, effect:"recolte", power:0 },
  // ── Sorts de zone (AoE) — un mode distinct par élément + soin ──
  // Modes : nappe (glace), chaîne (foudre), vague (lumière), drain
  // (ténèbres), fauchage (physique). Voir .claude/plans/aoe-spells.md.
  // Dégâts : base = power + mag/magDiv + stat2/stat2Div (cf. aoeBaseDamage).
  // magDiv/stat2Div varient par sort pour l'équilibrage — un sort à gros
  // rider (gel, vol de vie) scale plus doucement. Défaut 3/3.
  { name:"Glacius Tempête",   icon:"🌨️", desc:"Blizzard : dégâts de glace à tous les ennemis + gel",            cost:16, effect:"aoe_field",  element:"glace",    power:12, stat2:"int", magDiv:3, stat2Div:3 },
  { name:"Fulgur Catena",     icon:"⚡",  desc:"Arc électrique : chaîne d'ennemi en ennemi (dégâts décroissants)", cost:15, effect:"aoe_chain",  element:"foudre",   power:18, stat2:"agi", magDiv:2, stat2Div:4 },
  { name:"Lux Aeterna",       icon:"🌟",  desc:"Onde de lumière : frappe tous les ennemis (×1,5 morts-vivants)",  cost:17, effect:"aoe_wave",   element:"lumière",  power:15, bonusVsUndead:1.5, stat2:"int", magDiv:2, stat2Div:4 },
  { name:"Nox Vorax",         icon:"🌑",  desc:"Vague obscure : dégâts à tous + draine la vie pour le lanceur",   cost:18, effect:"aoe_drain",  element:"ténèbres", power:14, stat2:"end", magDiv:3, stat2Div:3 },
  { name:"Diffindo Maxima",   icon:"⚔️", desc:"Fauchage : tranche la cible et les ennemis adjacents",            cost:14, effect:"aoe_cleave", element:"physique", power:18, stat2:"str", magDiv:3, stat2Div:2 },
  { name:"Vulnera Sanentur",  icon:"💗",  desc:"Chant de guérison : soigne tout le groupe",                       cost:16, effect:"heal_aoe",  power:22 },
  // ── Sort exclusif endgame (Grimoire Interdit, sinks A+E) ──────
  // Feu Maudit : flammes vivantes, dégâts massifs single-target,
  // brûlure persistante. Coût prohibitif → utilisation parcimonieuse.
  { name:"Fiendfyre",         icon:"🔥",  desc:"Feu Maudit : flammes vivantes (35 dégâts + brûle)",                cost:32, effect:"burn", element:"feu", power:35 },
  // ── Sort de portail inter-mondes — Cheminette Inter-Mondes ────
  // Voir .claude/plans/parallel-worlds.md §4. Hors combat uniquement,
  // refusé en mode Ironman (§2.1). Apprentissage niv. 8 dans
  // _grantLevelSpells. Phase A : animation locale 2,8 s sans réseau ;
  // les phases suivantes brancheront le matchmaking Supabase.
  { name:"Cheminette Inter-Mondes", icon:"🌀", desc:"Ouvre un portail vers le monde d'un autre sorcier (hors combat)", cost:25, effect:"portal", power:0 },
  // ── Mondes parallèles Phase H §6.9 — Verrou de Sang ───────────
  // Lancé hors combat astral, en visite, sur une cellule libre. Coût
  // 5 PM + 1 Essence d'Outremonde. Insère une ligne dans `mp_threats` —
  // le host la résoudra plus tard (combat forcé sur la cellule) et le
  // visiteur récupérera des essences/fragments en asynchrone au
  // prochain démarrage.
  { name:"Verrou de Sang", icon:"🩸", desc:"Scelle une menace pour le sorcier hôte (1 essence + 5 PM, en visite)", cost:5, effect:"blood_seal", power:0 },
  // ── Mondes parallèles V1c.1 §6.10 — sorts exclusifs cross-plan ──
  // Achetés à l'Atelier du Voyageur contre essences. Tous OOC, gating
  // dans SPELL_OOC_HANDLERS. `_cross:true` marque ces sorts comme
  // exclusifs Atelier (filtrage UI).
  { name:"Sceau du Voyageur",    icon:"🪬", desc:"Ancrage astral : si tu meurs en combat astral, retour à ta cellule de départ (sans cooldown)", cost:8,  effect:"voyager_seal",      power:0, _cross:true },
  { name:"Mémoire d'Outremonde", icon:"🌌", desc:"Restaure 100 % PV + 100 % PM au début de ta prochaine visite",                                  cost:10, effect:"outremonde_memory", power:0, _cross:true },
  { name:"Marque du Pèlerin",    icon:"📍", desc:"Marque la cellule courante en visite — visible sur la minimap",                                 cost:4,  effect:"pilgrim_mark",      power:0, _cross:true },
  { name:"Rappel Astral",        icon:"🌠", desc:"Téléporte à la dernière Marque du Pèlerin posée",                                               cost:12, effect:"astral_recall",     power:0, _cross:true },
];

// Catégorie d'un sort pour le filtre de la modale Sorts. Soutien et
// utilitaire priment sur l'élément (ces sorts n'ont pas d'`element`) ;
// sinon on retombe sur l'élément du sort.
function spellCategory(spell) {
  if (!spell) return 'utilitaire';
  const e = spell.effect;
  if (e === 'heal' || e === 'support_regen' || e === 'support_regen_aoe' || e === 'shield'
      || e === 'patronus_maxima' || e === 'recolte' || e === 'heal_aoe') return 'soutien';
  if (e === 'disarm' || e === 'steal' || e === 'teleport' || e === 'legilimens'
      || e === 'reveal') return 'utilitaire';
  return spell.element || 'utilitaire';
}

// ── Pages du grimoire de givre d'Élara (quête manon_grimoire) ──
// Cinq feuillets dispersés et dissimulés, un par étage porteur. Le
// joueur les dévoile avec Revelio puis les ramasse en fouillant. Une
// fois les cinq réunis, Manon reconstitue le grimoire (établi de
// fusion). Cf. .claude/plans/manon-grimoire-pages.md.
const GRIMOIRE_PAGES = [
  { id: "page_grimoire_1", name: "Page de garde", icon: "📄", floor: 2,
    lore: "« À ma fille, si ces lignes te trouvent : le froid n'est pas l'absence de chaleur. C'est une chaleur qui a appris la patience. » — É." },
  { id: "page_grimoire_2", name: "Le souffle de givre", icon: "📄", floor: 3,
    lore: "Premiers exercices : givrer la rosée sans la briser. Élara a noté en marge : « recommencé onze fois — la onzième tient »." },
  { id: "page_grimoire_3", name: "La rosée durcie", icon: "📄", floor: 5,
    lore: "Le gel comme armure et non comme arme. L'encre y est pâlie, comme soufflée par un hiver ancien." },
  { id: "page_grimoire_4", name: "Le miroir de glace", icon: "📄", floor: 7,
    lore: "Une page presque entièrement raturée — sauf une ligne : « ce qu'on gèle, on le garde ; ce qu'on garde, on finit par devoir rendre »." },
  { id: "page_grimoire_5", name: "La tempête apprivoisée", icon: "📄", floor: 9,
    lore: "La dernière page : le tracé complet du grand sortilège de blizzard. Sous le schéma, deux mots tremblés : « pour toi »." }
];

// Étages porteurs d'une page (dérivé — source de vérité GRIMOIRE_PAGES).
const PAGE_FLOORS = GRIMOIRE_PAGES.map(p => p.floor);

// Retourne la page définie pour un étage donné, ou null.
function getGrimoirePageForFloor(floor) {
  return GRIMOIRE_PAGES.find(p => p.floor === floor) || null;
}

// ── Feuillets clairs d'Élara (Acte III — quête manon_acte3) ────
// Trois feuillets LUMINEUX qu'Élara avait gardés à part « pour la joie » :
// des sorts de givre heureux (dessiner sur une vitre, figer une goutte en
// perle, faire neiger dans une pièce), semés dans le château pour que sa
// fille tombe un jour sur sa joie et non seulement sur son mensonge.
// Réutilisent le mécanisme de pages de l'Acte II via _activePageSet().
// Cf. .claude/plans/manon-grimoire-easter-egg.md.
const ACT3_PAGES = [
  { id: "feuillet_clair_1", name: "La fougère sur la vitre", icon: "❄️", floor: 2,
    lore: "« Premier jeu que je t'apprendrai : souffle sur le carreau et dessine. Une fougère, une étoile, ton prénom. Le givre garde tout ce qu'on lui confie en riant. » — É." },
  { id: "feuillet_clair_2", name: "La goutte en perle", icon: "❄️", floor: 6,
    lore: "« Fige une goutte de pluie avant qu'elle tombe : tu auras une perle qui ne coûte rien et ne se ternit pas. J'en ai fait des colliers entiers, les soirs où je pensais à toi. » — É." },
  { id: "feuillet_clair_3", name: "La neige en chambre", icon: "❄️", floor: 9,
    lore: "« Et si un soir ton cœur est lourd : ferme les fenêtres, lève ta baguette, et fais neiger dans la pièce. Personne n'a jamais boudé sous la neige. Essaie. » — É." }
];

// Étages porteurs d'un feuillet clair (dérivé — source ACT3_PAGES).
const ACT3_FLOORS = ACT3_PAGES.map(p => p.floor);

// ── Sélecteur de set de pages actif (Acte II / Acte III) ──────
// Source de vérité unique du « quel jeu de pages est en jeu maintenant ».
// Les structures d'état (pagePlacements / revealedPages /
// player.grimoirePages) sont RÉUTILISÉES — les actes sont exclusifs dans
// le temps (l'Acte II purge tout à sa fusion, l'Acte III reprend).
// Retourne un descripteur { questId, pages, floors, fuse } ou null.
// Cf. .claude/plans/manon-grimoire-easter-egg.md §4.
function _activePageSet() {
  if (typeof activeQuests !== 'undefined'
      && activeQuests.some(q => q.id === 'manon_grimoire')) {
    return { questId: 'manon_grimoire', pages: GRIMOIRE_PAGES,
             floors: PAGE_FLOORS, fuse: 'fuseGrimoire' };
  }
  if (typeof completedQuests !== 'undefined'
      && completedQuests.has('manon_grimoire')
      && !completedQuests.has('manon_acte3')) {
    return { questId: 'manon_acte3', pages: ACT3_PAGES,
             floors: ACT3_FLOORS, fuse: 'fuseAct3' };
  }
  return null;
}

// ── Énigmes de Dumbledore — Épreuve de la Lumière Éternelle ───
// 2ᵉ temps de la quête dumbledore_lumiere. QCM 4 choix ; `answer` est
// l'index de la bonne réponse. Cf. .claude/plans/dumbledore-lux-aeterna.md.
const RIDDLES_LUMIERE = [
  {
    question: "Je chasse l'ombre sans jamais la toucher ; on me partage sans jamais me diviser ; plus on me donne, plus on en a. Que suis-je ?",
    choices: ["La flamme", "La lumière", "Le savoir", "La chaleur"],
    answer: 1
  },
  {
    question: "« Ce sont nos ______, bien plus que nos aptitudes, qui montrent ce que nous sommes vraiment. » Complète la phrase que j'aimais répéter.",
    choices: ["nos peurs", "nos rêves", "nos choix", "nos amis"],
    answer: 2
  },
  {
    question: "Quel sortilège n'est pas un mur mais une lumière, et réclame non du courage mais un souvenir heureux ?",
    choices: ["Protego", "Lumos Maxima", "Le Patronus", "Fiendfyre"],
    answer: 2
  }
];

// ============================================================
// ARTEFACTS & RELIQUAIRES 2.0 — socle data (Lot P0)
// ------------------------------------------------------------
// Voir .claude/plans/artifacts-reliquary-system.md.
// INERTE au runtime : registres + helper PUR, consommés par les lots
// suivants (P1 nouvelles formes, P2 Premium, P3 shops). Aucune mutation
// d'état au top-level → chargeable tel quel dans le sandbox de tests/units.js.
// ============================================================

// Archétypes visuels/sémantiques d'un artefact (futur champ `formType` sur
// les entrées ITEMS), ORTHOGONAUX au `slot` mécanique : on enrichit la fiction
// et le visuel sans créer de nouveau slot d'équipement (les 11 slots existants
// — wand/head/body/hands/feet/cloak/amulet/ring/belt/trinket — sont conservés).
// `slot` = destination mécanique par défaut de la forme (null pour un
// consommable). Source de vérité pour les badges de forme (UI) et les recettes
// d'icônes (tools/icon_factory.py).
const ARTIFACT_FORMS = {
  baguette:       { label: "Baguette",                slot: "wand",    icon: "🪄" },
  baton:          { label: "Bâton ancestral",         slot: "wand",    icon: "🌳" },
  orbe:           { label: "Orbe runique",            slot: "trinket", icon: "🔮" },
  cristal:        { label: "Cristal de focalisation", slot: "amulet",  icon: "💠" },
  cape:           { label: "Cape enchantée",          slot: "cloak",   icon: "🧥" },
  grimoire:       { label: "Grimoire flottant",       slot: "trinket", icon: "📖" },
  talisman:       { label: "Talisman des Fondateurs", slot: "amulet",  icon: "📿" },
  masque:         { label: "Masque rituel",           slot: "head",    icon: "🎭" },
  gantelets:      { label: "Gantelets de combat",     slot: "hands",   icon: "🥊" },
  anneau:         { label: "Anneau",                  slot: "ring",    icon: "💍" },
  relique_vocale: { label: "Relique vocale",          slot: "trinket", icon: "🗣️" },
  elixir_perma:   { label: "Élixir permanent",        slot: null,      icon: "⚗️" },
};

// Multiplicateur de stats des variantes Premium (variante coloriée par Maison
// d'un artefact de base — plan §1.5). Appliqué par `premiumStat()` lors de la
// GÉNÉRATION des entrées Premium (stats pré-cuites dans ITEMS), JAMAIS au
// runtime : aucun chemin chaud (recalculateStats) n'est touché.
const PREMIUM_MULT = { rare: 1.20, epic: 1.35, legendary: 1.50 };

// Variante Premium de prestige par Maison (P2) — remise cérémonielle par le
// Chef de Maison à la complétion de la Quête Signature (pendingHouseRewards).
// Une seule Premium par Maison, recoloriée + boostée (stats pré-cuites dans
// ITEMS via premiumStat). Consommé par quests.js et npc-dialog.js.
const HOUSE_PREMIUM = {
  Gryffondor:  'orbe_runique_premium_gryff',
  Serpentard:  'masque_rituel_premium_slyth',
  Serdaigle:   'baton_ancestral_premium_serd',
  Poufsouffle: 'talisman_fondateurs_premium_pouf',
};

// Calcule une stat boostée Premium : `value × PREMIUM_MULT[rarity]`. PUR (aucun
// accès à l'état) — testé dans tests/units.js. Règles :
//  - rareté inconnue → multiplicateur 1 (no-op sûr) ;
//  - valeur non finie → renvoyée telle quelle ;
//  - valeur ≤ 0 (malus de trade-off, ou 0) → JAMAIS aggravée : une Premium
//    boost le bon côté, pas le défaut ;
//  - bonus entier → arrondi à l'entier le plus proche ;
//  - valeur fractionnaire (regen %, multiplicateurs crit…) ou opts.fractional
//    → arrondie à 2 décimales.
function premiumStat(value, rarity, opts) {
  const mult = (PREMIUM_MULT[rarity] != null) ? PREMIUM_MULT[rarity] : 1;
  if (typeof value !== 'number' || !isFinite(value)) return value;
  if (value <= 0) return value;
  const boosted = value * mult;
  const fractional = (opts && opts.fractional) || !Number.isInteger(value);
  return fractional ? Math.round(boosted * 100) / 100 : Math.round(boosted);
}

const ITEMS = [
  { id:"potion_s", name:"Potion de Soin", icon:"🧪", desc:"+15 PV", type:"consumable", effect:"heal", power:15, price:30 },
  // Chaîne de soin à paliers (P4 — upgrade-craft via Éclat de Vitalité).
  { id:"potion_soin_mineure",      name:"Potion de Soin Mineure",   icon:"🧪", desc:"+15 PV",  type:"consumable", effect:"heal", power:15, price:28 },
  { id:"potion_soin_mineure_plus", name:"Potion de Soin Mineure +", icon:"🧪", desc:"+30 PV",  type:"consumable", effect:"heal", power:30, price:55 },
  { id:"potion_soin_mineure_pp",   name:"Potion de Soin Mineure ++",icon:"🧪", desc:"+55 PV",  type:"consumable", effect:"heal", power:55, price:95 },
  { id:"potion_m", name:"Potion Magique", icon:"💜", desc:"+12 PM", type:"consumable", effect:"restore_sp", power:12, price:25 },
  { id:"potion_l",     name:"Grande Potion de Soin", icon:"🧪", desc:"+40 PV", type:"consumable", effect:"heal",       power:40, price:80 },
  { id:"potion_l_sp",  name:"Grande Potion Magique", icon:"💜", desc:"+30 PM", type:"consumable", effect:"restore_sp", power:30, price:70 },
  { id:"felix", name:"Félix Felicis", icon:"✨", desc:"Chance liquide : améliore butin, or et trouvailles pendant 40 pas.", type:"consumable", effect:"fortune", price:80 },
  { id:"mandragore", name:"Racine de Mandragore", icon:"🌿", desc:"+8 PV", type:"consumable", effect:"heal", power:8, price:15 },
  // ── Consommables à effet (au-delà du +PV/PM) ────────────────
  { id:"elixir_antidote",  name:"Élixir d'Antidote",      icon:"🧴", desc:"Purge brûlure, poison, saignement et engelures", type:"consumable", effect:"cure",        price:45 },
  { id:"elixir_regen",     name:"Élixir de Régénération", icon:"🌱", desc:"Régénère 6 PV/tour pendant 4 tours",            type:"consumable", effect:"regen_buff",  power:6, turns:4, price:55 },
  { id:"potion_resistance", name:"Potion de Résistance", icon:"🛡️", desc:"Réduit de 40 % tous les dégâts subis pendant 3 tours", type:"consumable", effect:"resist_buff", power:40, turns:3, price:50 },
  { id:"wand1",   name:"Baguette de Saule",   icon:"🪄", desc:"ATK+2",                      type:"wand",  slot:"wand",   family:"wand_basic",    rarity:"common", power:2, bonusAtk:2,                                price:80,  tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_basic", tint:"willow" },
  { id:"wand2",   name:"Baguette de Sureau",  icon:"🪄", desc:"ATK+5 MAG+3 · Crit +2% (×1.7)", type:"wand",  slot:"wand",   family:"wand_elder",    rarity:"rare",   power:5, bonusAtk:5, bonusMag:3, bonusCritChance:2, bonusCritDamage:0.2, price:300, tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_runic", tint:"elder"  },
  { id:"robe1",   name:"Robe Renforcée",      icon:"🧥", desc:"DEF+3",                      type:"armor", slot:"body",   family:"robe",          rarity:"common", power:3, bonusDef:3,                                    price:150 },
  { id:"amulette",name:"Amulette du Phénix",  icon:"💎", desc:"MAG+4 LCK+3 · Apprend Reparo", type:"acc", slot:"amulet", family:"amulet_phoenix",rarity:"epic",   power:4, bonusMag:4, bonusLck:3, grantsSpell:"Reparo", price:250 },
  { id:"broom",   name:"Balai Nimbus 2000",   icon:"🧹", desc:"Fuite garantie",             type:"acc",   slot:"trinket", family:"broom",        rarity:"rare",   power:0,                                                price:200 },
  // ── Consommables endgame (drop Ténèbres + shop floor 15+) ──
  // Voir ENDGAME_PLAN.md §7.10.
  { id:"potion_xl",         name:"Élixir Suprême",       icon:"🧪", desc:"Restaure 100 % PV",
    type:"consumable", effect:"heal_full", price:200 },
  { id:"potion_xl_sp",      name:"Élixir d'Esprit Suprême", icon:"💜", desc:"Restaure 100 % PM",
    type:"consumable", effect:"restore_sp_full", price:200 },
  // Larme du Phénix Pure : passive — au moment d'un KO, si présente en
  // inventaire, ressuscite le perso à hpMax et consomme l'item.
  // Hook dans battle.js — triggerDeath/enemyTurn (cf. §7.10).
  { id:"larme_phenix_pure", name:"Larme du Phénix Pure", icon:"✨", desc:"Ressuscite un perso KO (auto)",
    type:"consumable", effect:"auto_revive", price:500 },
  // ── Matériaux endgame (Tranche 2 — Forge & Bibliothèque) ──────
  // Drop sur tout monstre variant `darkness` (cf. ENDGAME_PLAN.md §7.10).
  // Type `material` : stockable mais non utilisable directement (useItem refuse).
  // Consommés lors d'un upgrade Forge (essence_tenebres) ou Bibliothèque (page_grimoire).
  { id:"essence_tenebres", name:"Essence des Ténèbres", icon:"🌑", desc:"Matériau · Forge des Ténèbres",
    type:"material", price:0 },
  { id:"page_grimoire",    name:"Page de Grimoire",     icon:"📜", desc:"Matériau · Bibliothèque interdite",
    type:"material", price:0 },
  // Matériau premium T5 (endgame) — requis pour forger un item au-delà de +5
  // (niveaux 6-8). Vendu par l'Apothicaire des Ténèbres (Boucle). Cf.
  // .claude/plans/forge-t5.md.
  { id:"essence_primordiale", name:"Essence Primordiale", icon:"🔮", desc:"Matériau · Forge T5 (forge au-delà de +5)",
    type:"material", price:1200 },
  // Ressource d'upgrade-craft des potions (P4). Achetable (boutique étage ≥ 3)
  // + drop de coffre. Consommée au chaudron pour monter une potion en rang.
  { id:"eclat_vitalite",   name:"Éclat de Vitalité",    icon:"❤️", desc:"Matériau · concentré de vie pour potions",
    type:"material", price:35 },
  // Objet de lore — fil rouge « Clé de Voûte des Quatre » (déclencheur).
  // Fragment de la relique brisée des Fondateurs. Drop garanti (chance 1.0)
  // sur un monstre-jalon par tranche : Peeves (1-3), Loup-Garou Enragé (4-6),
  // Mangemort d'Élite (7-10). Réuni ×3 pour la quête `eclats_clef_voute`.
  // type:"material" → ni équipable ni consommable (useItem refuse) ; compté
  // par _countItems / _countMaterial et consommé à la remise de la quête.
  { id:"eclat_voute",      name:"Éclat de la Clé de Voûte", icon:"🔹", rarity:"rare",
    desc:"Un fragment de la relique des Fondateurs. Il est froid, et il chuchote.",
    type:"material", price:0 },
  // Objet de quête — Épreuve de la Lumière Éternelle (portrait de Dumbledore).
  // Tombe des morts-vivants ; réuni ×3 pour le 1er temps de l'épreuve.
  // type:"quest" → non utilisable manuellement (useItem affiche un message).
  { id:"eclat_lumiere",    name:"Éclat de Lumière",     icon:"✨",
    desc:"Fragment de clarté arraché aux ténèbres — objet de quête.",
    type:"quest", price:0 },
  // Clé de salle scellée (enrichissement du donjon §2.C). Lâchée par un
  // monstre de l'étage ; ouvre une porte CELL.DOOR. type:"key" → non
  // utilisable manuellement (useItem affiche un indice).
  { id:"cle_donjon",       name:"Clé du Donjon",        icon:"🗝️",
    desc:"Une lourde clé de fer rouillée. Ouvre une porte scellée du donjon.",
    type:"key", price:0 },
  // ── Items légendaires+ Maison Tier 5 (endgame Tranche 2) ─────
  // Récompenses du palier Tier 5 (2000 pts, gated par victoryAchieved).
  // Voir ENDGAME_PLAN.md §7.7. Cumulables avec les items Tier 4 si slots
  // différents (sauf lame_godric/sword_gryff partage slot wand).
  { id:"lame_godric",     name:"Lame de Godric",       icon:"⚔️", desc:"ATK+12 LCK+3 — Tier 5 Gryffondor",
    type:"wand",  slot:"wand",   family:"sword_godric",  rarity:"legendary",
    power:12, bonusAtk:12, bonusLck:3, price:0 },
  { id:"bague_salazar",   name:"Bague de Salazar",     icon:"💍", desc:"MAG+8 LCK+5 — Tier 5 Serpentard",
    type:"acc",   slot:"ring",   family:"ring_salazar",  rarity:"legendary",
    power:8,  bonusMag:8,  bonusLck:5, price:0 },
  { id:"bouclier_helga",  name:"Bouclier de Helga",    icon:"🛡️", desc:"DEF+10 — Tier 5 Poufsouffle",
    type:"armor", slot:"body",   family:"shield_helga",  rarity:"legendary",
    power:10, bonusDef:10,             price:0 },
  { id:"codex_rowena",    name:"Codex de Rowena",      icon:"📔", desc:"MAG+10 INT+3 — Tier 5 Serdaigle",
    type:"acc",   slot:"trinket",family:"codex_rowena", rarity:"legendary",
    power:10, bonusMag:10, bonusInt:3, price:0 },
  // ── Set bonus Ténèbres (endgame Tranche 2) ───────────────────
  // Ids des 3 drops Ténèbres formant un set. Bonus de synergie appliqué
  // dans recalculateStats() : 2/3 = +10 crit/+5 dodge ; 3/3 = +15 crit /
  // +10 dodge / +2 regenHp. Voir ENDGAME_PLAN.md §7.8.
  // (Constante exportée juste en dessous de la définition des 3 items.)
  // ── Drops Ténèbres (post-victoire, floor 11+) — variant darkness ──
  // Voir ENDGAME_PLAN.md §7.3. Drop bonus 8 % sur tout monstre variant
  // `darkness` (logique dans battle.js — endBattle).
  { id:"cape_voldemort", name:"Cape de l'Ombre",    icon:"🌫️", desc:"DEF+4 MAG+3 · Régen +1 PM/tour",
    type:"acc", slot:"cloak",  family:"cloak_voldemort", rarity:"legendary",
    bonusDef:4, bonusMag:3, regenSp:1, power:4, price:0, tint:"#3a1a5a" },
  { id:"cendres_phenix", name:"Cendres du Phénix",  icon:"🔥", desc:"MAG+4 LCK+2 · Régen +4 PV/tour",
    type:"acc", slot:"amulet", family:"amulet_ashes",    rarity:"legendary",
    bonusMag:4, bonusLck:2, regenHp:4, power:4, price:0, tint:"#e84020" },
  { id:"oeil_basilic",   name:"Œil de Basilic",     icon:"🐍", desc:"Crit +10 % · Esquive +5 %",
    type:"acc", slot:"trinket",family:"trinket_basilisk", rarity:"legendary",
    bonusCritChance:10, bonusDodgeChance:5, power:0, price:0, tint:"#3a8a3a" },
  // ── Objets légendaires des Maisons (non vendus, récompenses du système de Maison) ──
  { id:"sword_gryff",      name:"Épée de Gryffondor",   icon:"⚔️",  desc:"ATK+8 — Légendaire Gryffondor",    type:"wand",  slot:"wand",   family:"sword_gryff",   rarity:"legendary", power:8, bonusAtk:8,              price:0,  tinted:true, tintMask:"sword_blade_base", tintOverlay:"sword_hilt_gryff", tint:"silver" },
  { id:"locket_slytherin", name:"Médaillon de Serpentard",icon:"🐍", desc:"MAG+6 LCK+3 — Légendaire Serpentard", type:"acc", slot:"amulet", family:"locket_slyth",  rarity:"legendary", power:6, bonusMag:6, bonusLck:3, price:0 },
  { id:"diademe_serdaigle",name:"Diadème de Serdaigle", icon:"👑",  desc:"MAG+4 LCK+5 — Légendaire Serdaigle",  type:"acc", slot:"head",   family:"diademe_serd",  rarity:"legendary", power:4, bonusMag:4, bonusLck:5, price:0 },
  { id:"coupe_poufsouffle",name:"Coupe de Poufsouffle", icon:"🏆",  desc:"DEF+6 — Légendaire Poufsouffle",   type:"armor", slot:"body",   family:"coupe_pouf",    rarity:"legendary", power:6, bonusDef:6,              price:0 },
  // ── Pièces #1 des 4 Sets Maison (Apprenti Or, tier 3, head-of-house) ──
  // Items existants annotés setKey/setPiece pour la détection de set
  // dans recalculateStats (cf. .claude/plans/houses-2.0.md §B).
  { id:"brassard_lion",    name:"Brassard du Lion",      icon:"🥊", desc:"ATK+2 LCK+1 — Set du Lion (1/4)",        type:"acc",   slot:"hands",  family:"gryff_t2",     rarity:"rare", power:2, bonusAtk:2, bonusLck:1, price:0, setKey:"gryff_set", setPiece:1 },
  { id:"anneau_serpent",   name:"Anneau du Serpent",     icon:"💍", desc:"MAG+2 LCK+1 — Set du Serpent (1/4)",     type:"acc",   slot:"ring",   family:"slyth_t2",     rarity:"rare", power:2, bonusMag:2, bonusLck:1, price:0, setKey:"slyth_set", setPiece:1 },
  { id:"plume_aigle",      name:"Plume d'Aigle",         icon:"🪶", desc:"MAG+2 INT+1 — Set de l'Aigle (1/4)",     type:"acc",   slot:"trinket",family:"raven_t2",     rarity:"rare", power:2, bonusMag:2, bonusInt:1, price:0, setKey:"raven_set", setPiece:1 },
  { id:"ceinture_blaireau",name:"Ceinture du Blaireau",  icon:"🪢", desc:"DEF+2 END+1 — Set du Blaireau (1/4)",    type:"acc",   slot:"belt",   family:"pouf_t2",      rarity:"rare", power:2, bonusDef:2, bonusEnd:1, price:0, setKey:"pouf_set",  setPiece:1 },

  // ── Pièces #2, #3, #4 des 4 Sets Maison (Étape 2 Maisons 2.0) ────
  // Distribuées via head-of-house aux paliers Confirmé Or (tier 6),
  // Maître Or (tier 12), et Virtuose Or (tier 15, via quête de Maison).
  // Cf. .claude/plans/houses-2.0.md §B. Slots distincts par set pour
  // permettre l'équipement simultané des 4 pièces sur un perso.

  // Set du Lion (Gryffondor)
  { id:"heaume_vaillant", name:"Heaume du Vaillant",   icon:"⛑️", desc:"ATK+2 LCK+1 — Set du Lion (2/4)",       type:"armor", slot:"head",   family:"gryff_set_2",  rarity:"epic",      power:3, bonusAtk:2, bonusLck:1, price:0, setKey:"gryff_set", setPiece:2 },
  { id:"cape_godric",     name:"Cape de Godric",       icon:"🦁", desc:"DEF+2 ATK+2 — Set du Lion (3/4)",       type:"acc",   slot:"cloak",  family:"gryff_set_3",  rarity:"epic",      power:4, bonusAtk:2, bonusDef:2, price:0, setKey:"gryff_set", setPiece:3 },
  { id:"coeur_lion",      name:"Cœur de Lion",         icon:"❤️", desc:"ATK+3 LCK+2 · PV max +10 · Régen +1 PM — Set du Lion (4/4)", type:"acc", slot:"amulet", family:"gryff_set_4", rarity:"legendary", power:6, bonusAtk:3, bonusLck:2, bonusHpMax:10, regenSp:1, price:0, setKey:"gryff_set", setPiece:4 },

  // Set du Serpent (Serpentard)
  { id:"pendentif_mamba", name:"Pendentif du Mamba",   icon:"🐍", desc:"MAG+2 LCK+1 — Set du Serpent (2/4)",    type:"acc",   slot:"amulet", family:"slyth_set_2",  rarity:"epic",      power:3, bonusMag:2, bonusLck:1, price:0, setKey:"slyth_set", setPiece:2 },
  { id:"cape_sibylline",  name:"Cape Sibylline",       icon:"🌫️", desc:"MAG+2 INT+2 — Set du Serpent (3/4)",    type:"acc",   slot:"cloak",  family:"slyth_set_3",  rarity:"epic",      power:4, bonusMag:2, bonusInt:2, price:0, setKey:"slyth_set", setPiece:3 },
  { id:"couronne_basilic",name:"Couronne du Basilic",  icon:"👑", desc:"MAG+3 LCK+2 · Régen +1 PM — Set du Serpent (4/4)", type:"armor", slot:"head", family:"slyth_set_4", rarity:"legendary", power:6, bonusMag:3, bonusLck:2, regenSp:1, price:0, setKey:"slyth_set", setPiece:4 },

  // Set de l'Aigle (Serdaigle)
  { id:"manteau_encre",   name:"Manteau d'Encre",      icon:"📜", desc:"MAG+2 INT+1 — Set de l'Aigle (2/4)",    type:"acc",   slot:"cloak",  family:"raven_set_2",  rarity:"epic",      power:3, bonusMag:2, bonusInt:1, price:0, setKey:"raven_set", setPiece:2 },
  { id:"oeil_aigle",      name:"Œil de l'Aigle",       icon:"👁️", desc:"MAG+2 INT+2 · Régen +1 PM — Set de l'Aigle (3/4)", type:"acc", slot:"amulet", family:"raven_set_3", rarity:"epic", power:4, bonusMag:2, bonusInt:2, regenSp:1, price:0, setKey:"raven_set", setPiece:3 },
  { id:"anneau_savoir",   name:"Anneau du Savoir",     icon:"💍", desc:"MAG+3 INT+2 LCK+1 — Set de l'Aigle (4/4)", type:"acc", slot:"ring", family:"raven_set_4",   rarity:"legendary", power:6, bonusMag:3, bonusInt:2, bonusLck:1, price:0, setKey:"raven_set", setPiece:4 },

  // Set du Blaireau (Poufsouffle)
  { id:"cape_loyaute",    name:"Cape de Loyauté",      icon:"🟡", desc:"DEF+2 END+1 — Set du Blaireau (2/4)",   type:"acc",   slot:"cloak",  family:"pouf_set_2",   rarity:"epic",      power:3, bonusDef:2, bonusEnd:1, price:0, setKey:"pouf_set",  setPiece:2 },
  { id:"coiffe_blaireau", name:"Coiffe du Blaireau",   icon:"🦡", desc:"DEF+2 END+2 — Set du Blaireau (3/4)",   type:"armor", slot:"head",   family:"pouf_set_3",   rarity:"epic",      power:4, bonusDef:2, bonusEnd:2, price:0, setKey:"pouf_set",  setPiece:3 },
  { id:"medaillon_helga", name:"Médaillon de Helga",   icon:"🏅", desc:"DEF+3 END+2 · Régen +1 PV — Set du Blaireau (4/4)", type:"acc", slot:"amulet", family:"pouf_set_4", rarity:"legendary", power:6, bonusDef:3, bonusEnd:2, regenHp:1, price:0, setKey:"pouf_set",  setPiece:4 },
  { id:"choco_sorcier",name:"Chocolat aux Sorciers", icon:"🍫", desc:"+10 PV +5 PM",       type:"consumable", effect:"both",       power:10, price:20 },
  { id:"potion_force", name:"Potion de Force",       icon:"💪", desc:"+8 ATK pendant 3 tours", type:"consumable", effect:"temp_buff", buffStat:"atk", power:8, turns:3, price:45 },
  // Potions de buff de combat (P2) — même moteur temp_buff, autres stats.
  { id:"potion_defense",   name:"Potion de Défense",   icon:"🛡️", desc:"+8 DEF pendant 3 tours",      type:"consumable", effect:"temp_buff", buffStat:"def", power:8, turns:3, price:45 },
  { id:"elixir_celerite",  name:"Élixir de Célérité",  icon:"💨", desc:"+8 AGI pendant 3 tours (esquive +)", type:"consumable", effect:"temp_buff", buffStat:"agi", power:8, turns:3, price:48 },
  { id:"potion_precision", name:"Potion de Précision", icon:"🍀", desc:"+8 LCK pendant 3 tours (crit +)",    type:"consumable", effect:"temp_buff", buffStat:"lck", power:8, turns:3, price:48 },
  { id:"elixir_puissance", name:"Élixir de Puissance", icon:"🔮", desc:"+8 MAG pendant 3 tours",      type:"consumable", effect:"temp_buff", buffStat:"mag", power:8, turns:3, price:50 },
  // ── Potions offensives jetables (P6.c) : lancées sur UN ennemi en combat.
  // Dégâts « alchimiques » : profitent du brassage (brewPotency) et respectent
  // resist/weak via `element`, mais SANS scaling MAG ni crit de sort. Statut
  // optionnel (gel/poison) posé après les dégâts.
  { id:"flacon_feu",    name:"Flacon de Feu",    icon:"🔥", desc:"Lancé : 24 dégâts de feu sur un ennemi",                 type:"consumable", effect:"throw", element:"feu",   power:24, price:40, rarity:"common" },
  { id:"flacon_givre",  name:"Flacon de Givre",  icon:"❄️", desc:"Lancé : 15 dégâts de glace + gèle l'ennemi (3 t)",        type:"consumable", effect:"throw", element:"glace", power:15, statusId:"gel",    statusPower:3, statusTurns:3, price:42, rarity:"common" },
  { id:"flacon_venin",  name:"Flacon de Venin",  icon:"🧪", desc:"Lancé : 8 dégâts + poison (5/tour, 4 tours)",             type:"consumable", effect:"throw",                  power:8,  statusId:"poison", statusPower:5, statusTurns:4, price:44, rarity:"common" },
  // Flacons à dispersion (AOE) — touchent TOUT le groupe ennemi (flag aoe).
  { id:"flacon_deflagration", name:"Flacon de Déflagration", icon:"💥", desc:"Lancé : 16 dégâts de feu sur tout le groupe ennemi", type:"consumable", effect:"throw", aoe:true, element:"feu", power:16, price:90, rarity:"rare" },
  { id:"flacon_brume_toxique", name:"Flacon de Brume Toxique", icon:"☠️", desc:"Lancé : 6 dégâts + poison (4/tour, 4 t) sur tout le groupe ennemi", type:"consumable", effect:"throw", aoe:true, power:6, statusId:"poison", statusPower:4, statusTurns:4, price:95, rarity:"rare" },
  { id:"cape_invis",   name:"Cape d'Invisibilité",   icon:"🌫️", desc:"AGI+5 LCK+5 · Esquive +5%", type:"acc",   slot:"cloak", family:"cloak_invis",  rarity:"epic",     bonusAgi:5, bonusLck:5, bonusDodgeChance:5, power:5, price:550 },
  { id:"chapeau_pointu",name:"Chapeau de Serdaigle", icon:"🎓", desc:"MAG+3 INT+3",            type:"armor", slot:"head",  family:"hat_serd",     rarity:"rare",     bonusDef:2, bonusMag:3, power:3, price:200 },
  // Easter egg « Salle sur Demande » — objet unique offert à la 1ʳᵉ Salle de
  // la partie. Clin d'œil au Diadème caché, bonus modeste non-méta, non vendable.
  { id:"tiare_poussiereuse",name:"Tiare poussiéreuse", icon:"👑", desc:"MAG+2 LCK+1 · trouvée dans la Salle sur Demande", type:"armor", slot:"head", family:"tiara_dusty", rarity:"rare", bonusMag:2, bonusLck:1, power:2, price:0, tint:"#caa84c" },
  // ── Phase 3 : équipement étendu (slots head/hands/feet/cloak/amulet/ring/belt/trinket) ──
  // Tier commun étage 1-2
  { id:"gants_apprenti",   name:"Gants d'Apprenti",      icon:"🧤", desc:"ATK+1 DEF+1",       type:"acc",   slot:"hands", family:"gloves_basic",  rarity:"common", bonusAtk:1, bonusDef:1, power:1, price:60 },
  { id:"bottes_apprenti",  name:"Bottes d'Apprenti",     icon:"🥾", desc:"DEF+1 AGI+1",       type:"acc",   slot:"feet",  family:"boots_basic",   rarity:"common", bonusDef:1, bonusAgi:1, power:1, price:70 },
  { id:"chapeau_apprenti", name:"Chapeau d'Apprenti",    icon:"🎩", desc:"MAG+1 DEF+1",       type:"acc",   slot:"head",  family:"hat_basic",     rarity:"common", bonusMag:1, bonusDef:1, power:1, price:80 },
  { id:"ceinture_cuir",    name:"Ceinture de Cuir",      icon:"➿", desc:"DEF+2",             type:"acc",   slot:"belt",  family:"belt_basic",    rarity:"common", bonusDef:2,             power:2, price:90 },
  { id:"anneau_argent",    name:"Anneau d'Argent",       icon:"💍", desc:"LCK+2",             type:"acc",   slot:"ring",  family:"ring_silver",   rarity:"common", bonusLck:2,             power:2, price:110 },
  // Tier voyageur étage 3-4
  { id:"cape_voyageur",    name:"Cape du Voyageur",      icon:"🧥", desc:"DEF+2 AGI+2",       type:"acc",   slot:"cloak", family:"cloak_traveler",rarity:"common", bonusDef:2, bonusAgi:2, power:2, price:160 },
  { id:"amulette_protection",name:"Amulette de Protection",icon:"🔱", desc:"DEF+3 MAG+1",     type:"acc",   slot:"amulet",family:"amulet_protect",rarity:"common", bonusDef:3, bonusMag:1, power:3, price:170 },
  // Tier rare étage 5+
  { id:"circlet_serdaigle",name:"Circlet d'Argent",      icon:"👑", desc:"MAG+3 INT+2",       type:"acc",   slot:"head",  family:"circlet",       rarity:"rare",   bonusMag:3,             power:3, price:240 },
  { id:"anneau_runique",   name:"Anneau Runique",        icon:"💍", desc:"MAG+2 LCK+2 · Crit +3%", type:"acc",   slot:"ring",  family:"ring_runed",    rarity:"rare",   bonusMag:2, bonusLck:2, bonusCritChance:3, power:2, price:260, tint:"#a060d0" },
  { id:"ceinture_alchimiste",name:"Ceinture d'Alchimiste",icon:"➿", desc:"DEF+1 LCK+3 · Crit +2%", type:"acc",   slot:"belt",  family:"belt_alch",     rarity:"rare",   bonusDef:1, bonusLck:3, bonusCritChance:2, power:1, price:230 },
  // Tier rare/épique étage 7+
  { id:"bottes_dragon",    name:"Bottes en Peau de Dragon",icon:"🥾",desc:"DEF+3 AGI+2 · Esquive +3%", type:"acc",   slot:"feet",  family:"boots_dragon",  rarity:"rare",   bonusDef:3, bonusAgi:2, bonusDodgeChance:3, power:3, price:340 },
  // ── Équipement à compromis (trade-off : un bonus fort, un malus) ──
  { id:"lame_sanguinaire", name:"Lame Sanguinaire",       icon:"🗡️", desc:"ATK+7 mais DEF−2 — frappe sans retenue",        type:"wand",  slot:"wand",  rarity:"rare",   power:7, bonusAtk:7,  bonusDef:-2,                        price:300 },
  { id:"armure_lourde",    name:"Armure de Plates",       icon:"🛡️", desc:"DEF+6 mais AGI−3 — lourde et protectrice",      type:"armor", slot:"body",  rarity:"rare",   power:6, bonusDef:6,  bonusAgi:-3,                        price:320 },
  { id:"anneau_furie",     name:"Anneau de Furie",        icon:"💍", desc:"Crit +12% mais Esquive −6% — tout en attaque", type:"acc",   slot:"ring",  rarity:"rare",   power:2, bonusCritChance:12, bonusDodgeChance:-6,            price:300 },
  { id:"retourneur_temps", name:"Retourneur de Temps",   icon:"⌛", desc:"AGI+3 LCK+2",        type:"acc",   slot:"trinket",family:"timeturner",  rarity:"epic",   bonusAgi:3, bonusLck:2, power:3, price:550, tint:"#c9a84c" },
  // Drop boss étage 7+ (Mangemort d'Élite) — bonus PV max (cf. equipment-bonuses-v2.md Vague B).
  { id:"cor_pegasse",      name:"Cor du Pégase",          icon:"📯", desc:"PV max +8",          type:"acc",   slot:"trinket",family:"horn_pegasus", rarity:"epic",   bonusHpMax:8, power:4, price:0 },
  // ── Phase 3c : équipements mid-game (étages 3-7) ─────────────
  // Comblent les slots peu fournis. Apparaissent en boutique selon
  // minFloor et peuvent dropper sur les monstres élite de la zone.
  { id:"gants_duelliste",  name:"Gants du Duelliste",     icon:"🧤", desc:"ATK+2 AGI+1",        type:"acc",   slot:"hands", family:"gloves_duelist",rarity:"rare",   bonusAtk:2, bonusAgi:1, power:2, price:210 },
  { id:"casque_aurore",    name:"Casque d'Auror",         icon:"⛑️", desc:"DEF+3 MAG+1",        type:"acc",   slot:"head",  family:"helm_auror",    rarity:"rare",   bonusDef:3, bonusMag:1, power:3, price:260 },
  { id:"ceinture_force",   name:"Ceinture de Force",      icon:"➿", desc:"ATK+1 DEF+2",        type:"acc",   slot:"belt",  family:"belt_strength", rarity:"rare",   bonusAtk:1, bonusDef:2, power:2, price:250 },
  { id:"anneau_courage",   name:"Anneau du Courage",      icon:"💍", desc:"ATK+2 LCK+1",        type:"acc",   slot:"ring",  family:"ring_courage",  rarity:"rare",   bonusAtk:2, bonusLck:1, power:2, price:280, tint:"#c2453a" },
  { id:"bottes_silence",   name:"Bottes du Silence",      icon:"🥾", desc:"AGI+3 LCK+1",        type:"acc",   slot:"feet",  family:"boots_silence", rarity:"epic",   bonusAgi:3, bonusLck:1, power:3, price:520 },
  { id:"talisman_tactique",name:"Talisman du Tacticien",  icon:"🔮", desc:"LCK+2 MAG+1",        type:"acc",   slot:"trinket",family:"talisman_tact",rarity:"rare",   bonusLck:2, bonusMag:1, power:2, price:380 },
  // ── Phase 3b : récompenses de quêtes (PNJ donneurs) ──
  // Anneau remis par le portrait de Dumbledore (quête `anneau_dumbledore`). Pierre noire sertie d'or.
  { id:"anneau_resurrection",name:"Anneau de la Résurrection",icon:"💍", desc:"MAG+3 LCK+4 · Apprend Reparo", type:"acc", slot:"ring",  family:"ring_resurrection", rarity:"epic", bonusMag:3, bonusLck:4, power:3, grantsSpell:"Reparo", price:0, tint:"#1a1a1a" },
  // Amulette remise par Fumseck (quête `bouclier_phenix`). Régénère 3 PV en début de tour ennemi.
  { id:"larmes_phenix",      name:"Larmes du Phénix",         icon:"📿", desc:"DEF+2 MAG+2 · PM max +5 · Régen +3 PV/tour · Esquive +3%",type:"acc", slot:"amulet",family:"amulet_tears",      rarity:"epic", bonusDef:2, bonusMag:2, bonusSpMax:5, bonusDodgeChance:3, power:2, regenHp:3,            price:0, tint:"#e84020" },
  // ── Phase 3 — Tranche étage 8 « Le Seuil » : équipement Auror (boutique + drop boss) ──
  { id:"casque_auror",      name:"Casque d'Auror",       icon:"⛑️", desc:"DEF+4 MAG+2 — Casque réglementaire des Aurors", type:"armor", slot:"head",  family:"helmet_auror",    rarity:"rare", bonusDef:4, bonusMag:2, power:4, price:800 },
  { id:"bottes_renforcees", name:"Bottes Renforcées",    icon:"🥾", desc:"DEF+3 AGI+2",                                   type:"armor", slot:"feet",  family:"boots_reinforced",rarity:"rare", bonusDef:3, bonusAgi:2, power:3, price:600 },
  { id:"cape_combat",       name:"Cape de Combat",       icon:"🧥", desc:"DEF+3 · Esquive +5 %",                          type:"armor", slot:"cloak", family:"cloak_combat",    rarity:"rare", bonusDef:3, bonusDodgeChance:5, power:3, price:700 },
  { id:"anneau_anti_magie", name:"Anneau Anti-Magie",    icon:"💍", desc:"DEF+2 INT+3 — Atténue les sortilèges",        type:"acc",   slot:"ring",  family:"ring_anti_magic", rarity:"rare", bonusDef:2, bonusInt:3, power:2, price:750 },
  { id:"potion_lune",       name:"Élixir de Lune",       icon:"🌕", desc:"+45 PV — distillé sous pleine lune",          type:"consumable", effect:"heal", power:45, price:90 },
  // ── Phase 3 — Tranche étage 9 « Les Profondeurs » : équipement endgame mid (boutique + drop boss) ──
  { id:"diademe_antique",   name:"Diadème Antique",      icon:"👑", desc:"MAG+5 LCK+2 — Couronne d'une reine oubliée",   type:"armor", slot:"head",  family:"tiara_antique",   rarity:"rare", bonusMag:5, bonusLck:2, power:5, price:900 },
  { id:"bague_protection",  name:"Bague de Protection",  icon:"💍", desc:"DEF+3 END+3 — Sertie d'une perle de jade",     type:"acc",   slot:"ring",  family:"ring_protection", rarity:"rare", bonusDef:3, bonusEnd:3, power:3, price:780 },
  { id:"robe_combat",       name:"Robe de Combat",       icon:"🥼", desc:"DEF+5 · PV max +5 — Renforcée de runes",       type:"armor", slot:"body",  family:"robe_combat",     rarity:"rare", bonusDef:5, bonusHpMax:5, power:5, price:950 },
  // ── Phase 3 — Tranche étage 10 « Le Précipice » : équipement antichambre Voldemort (boutique + drop boss) ──
  { id:"pectoral_auror",       name:"Pectoral des Aurors",       icon:"🛡️", desc:"DEF+6 · PV max +8 — Armure de fin de carrière", type:"armor", slot:"body",   family:"pectoral_auror",     rarity:"rare", bonusDef:6, bonusHpMax:8, power:6, price:1200 },
  { id:"larme_phenix_mineure", name:"Larme du Phénix Mineure",   icon:"💧", desc:"MAG+4 · Régen +2 PV/tour",                      type:"acc",   slot:"amulet", family:"amulet_lesser_tears",rarity:"rare", bonusMag:4, regenHp:2, power:4, price:1100 },
  { id:"grimoire_avance",      name:"Grimoire Avancé",           icon:"📚", desc:"MAG+3 INT+4 — Recueil tactique des Aurors",     type:"acc",   slot:"trinket",family:"trinket_grimoire",   rarity:"rare", bonusMag:3, bonusInt:4, power:3, price:1000 },
  // ── Livres de sorts ──────────────────────────────────────────
  { id:"livre_sortileges", name:"Sortilèges Standards, Vol.3", icon:"📗", desc:"Apprend Wingardium Leviosa",  type:"spellbook", spell:"Wingardium Leviosa", price:150  },
  { id:"livre_soin",       name:"Potions & Remèdes Magiques",  icon:"📘", desc:"Apprend Reparo (soin 20 PV)", type:"spellbook", spell:"Reparo",             price:110  },
  { id:"livre_ferula",     name:"Manuel du Soigneur de Champ", icon:"📗", desc:"Apprend Ferula (bandage régénérant)", type:"spellbook", spell:"Ferula",     price:180 },
  { id:"book_monsters",    name:"Livre des Monstres",          icon:"📚", desc:"Apprend Diffindo (16 dégâts)",type:"spellbook", spell:"Diffindo",           price:0   },
  { id:"livre_prince",     name:"Manuel du Demi-Sang",         icon:"📓", desc:"Apprend Sectumsempra (24 dégâts) — sort maudit", type:"spellbook", spell:"Sectumsempra", price:600 },
  { id:"livre_bombarda",   name:"Traité de Magie Explosive",   icon:"📙", desc:"Apprend Bombarda (20 dégâts)",  type:"spellbook", spell:"Bombarda",   price:490 },
  { id:"livre_patronum",   name:"Guide du Patronus",            icon:"📒", desc:"Apprend Patronum",              type:"spellbook", spell:"Patronum",   price:350 },
  // ── Grimoires élémentaires ───────────────────────────────────
  { id:"livre_glacius",    name:"Givre & Engelures",            icon:"📘", desc:"Apprend Glacius (14 dégâts de glace)", type:"spellbook", spell:"Glacius",     price:220 },
  { id:"livre_fulgari",    name:"Foudre Canalisée",             icon:"📙", desc:"Apprend Fulgari (16 dégâts de foudre)", type:"spellbook", spell:"Fulgari",     price:310 },
  { id:"livre_lumos_solem",name:"Lumière Solaire",              icon:"📒", desc:"Apprend Lumos Solem — ravage les morts-vivants", type:"spellbook", spell:"Lumos Solem", price:440 },
  // ── Grimoires de Vampirisme & Malédictions ───────────────────
  { id:"livre_sanguini",   name:"Traité du Sang Vivant",         icon:"📕", desc:"Apprend Sanguini (vol de vie)", type:"spellbook", spell:"Sanguini",      price:270 },
  { id:"livre_vampyrus",   name:"Codex des Strigoï",             icon:"📕", desc:"Apprend Vampyrus (drain magique)", type:"spellbook", spell:"Vampyrus",   price:540 },
  { id:"livre_taranta",    name:"Pas de la Sorcière Maudite",    icon:"📓", desc:"Apprend Tarantallegra",         type:"spellbook", spell:"Tarantallegra", price:130  },
  { id:"livre_maledictus", name:"Grimoire des Maudits",          icon:"📓", desc:"Apprend Maledictus",            type:"spellbook", spell:"Maledictus",    price:390 },
  { id:"livre_crucio",     name:"Sortilèges Impardonnables, T.II", icon:"📕", desc:"Apprend Crucio (sort interdit)", type:"spellbook", spell:"Crucio",     price:580 },
  { id:"livre_morsmordre", name:"Marque des Ténèbres",            icon:"📕", desc:"Apprend Morsmordre",            type:"spellbook", spell:"Morsmordre",    price:640 },
  // ── Grimoires de zone (sorts AoE) ────────────────────────────
  { id:"livre_vulnera",         name:"Chant des Guérisseurs",     icon:"📗", desc:"Apprend Vulnera Sanentur — soin de tout le groupe",   type:"spellbook", spell:"Vulnera Sanentur", price:700 },
  { id:"livre_diffindo_maxima", name:"L'Art de la Lame Large",    icon:"📓", desc:"Apprend Diffindo Maxima — fauchage des ennemis adjacents", type:"spellbook", spell:"Diffindo Maxima", price:760 },
  { id:"livre_glacius_tempete", name:"Tempête de Givre",          icon:"📘", desc:"Apprend Glacius Tempête — zone de glace + gel",       type:"spellbook", spell:"Glacius Tempête",  price:840 },
  { id:"livre_fulgur_catena",   name:"Chaîne d'Éclairs",          icon:"📙", desc:"Apprend Fulgur Catena — arc électrique en chaîne",    type:"spellbook", spell:"Fulgur Catena",    price:920 },
  { id:"livre_lux_aeterna",     name:"Lumière Éternelle",         icon:"📒", desc:"Apprend Lux Aeterna — onde de lumière sur la zone",   type:"spellbook", spell:"Lux Aeterna",      price:1050 },
  { id:"livre_nox_vorax",       name:"Nuit Dévorante",            icon:"📕", desc:"Apprend Nox Vorax — vague obscure drainante",        type:"spellbook", spell:"Nox Vorax",        price:1200 },
  // Sort utilitaire premium (cf. .claude/plans/teleportation-spell.md).
  { id:"livre_portus",     name:"Traité de la Téléportation",     icon:"📘", desc:"Apprend Portus — téléportation tactique (combat + hors combat)", type:"spellbook", spell:"Portus", price:2800 },
  // ── Sinks endgame — combo A+E (game-economy-gold-audit.md §5.6) ──
  // Prix progressif (rareté marché) : items avec `rarityScales:true`
  // voient leur prix × 1.5^endgamePurchases[id] à chaque achat.
  { id:"elixir_perma_hp",   name:"Élixir Permanent de Vitalité",   icon:"❤️", desc:"+5 PV max permanent (heal complet bonus). Disponibilité limitée — chaque flacon vendu rend les suivants plus rares.", type:"consumable", effect:"perma_hp", power:5, basePrice:1500, price:1500, rarityScales:true, rarity:"epic" },
  { id:"elixir_perma_mp",   name:"Élixir Permanent de Mana",       icon:"💙", desc:"+5 PM max permanent (heal complet bonus). Disponibilité limitée — chaque flacon vendu rend les suivants plus rares.", type:"consumable", effect:"perma_sp", power:5, basePrice:1500, price:1500, rarityScales:true, rarity:"epic" },
  { id:"pierre_ame",        name:"Pierre d'Âme",                   icon:"💜", desc:"+1 stat permanente au choix (FOR/INT/AGI/END/LCK/MAG/ATK/DEF). Chaque pierre arrachée à la veine rend les suivantes plus introuvables.", type:"consumable", effect:"stat_boost", basePrice:3000, price:3000, rarityScales:true, rarity:"legendary" },
  { id:"grimoire_interdit", name:"Grimoire Interdit",              icon:"📕", desc:"Apprend Fiendfyre — Feu Maudit (35 dégâts, brûle, coût élevé).", type:"spellbook", spell:"Fiendfyre", price:4000, rarity:"legendary" },
  { id:"pendentif_ombre",   name:"Pendentif d'Ombre",              icon:"🦇", desc:"Acc — regen 3 PV/tour, dégâts critiques +20 %.", type:"acc", slot:"amulet", rarity:"epic", regenHp:3, bonusCritDamage:0.20, price:6000 },
  { id:"reliquaire_lunaire", name:"Reliquaire Lunaire",            icon:"🌙", desc:"Bibelot — gain d'or de combat +20 % (cumulable avec Récolte Magique).", type:"trinket", slot:"trinket", rarity:"legendary", bonusGoldMult:0.20, price:8000 },
  { id:"philtre_endurance", name:"Philtre d'Endurance",            icon:"🟢", desc:"+3 END permanent. Recette ancestrale — disponibilité fluctuante.", type:"consumable", effect:"perma_end", power:3, basePrice:3500, price:3500, rarityScales:true, rarity:"rare" },
  // ── Artefacts & Reliquaires 2.0 — P1 nouvelles formes (plan §1.4 A/B) ──
  // Nouveaux archétypes (`formType`) MAPPÉS sur les slots existants — aucun
  // nouveau slot. Deux nouveaux leviers mécaniques additifs seulement :
  //   bonusElemDmg    → +% dégâts d'un/des élément(s) de sort (battle-spells.js)
  //   spCostReduction → −N PM sur le coût des sorts, plancher 1 (battle-spells.js)
  // Les autres effets réutilisent les bonus* existants. `houseAffinity` est
  // posé là où le canon le justifie (consommé par les shops en P3).
  // A. Mid-game (Actes I-II, étages 3-7) — comble le palier `uncommon`/`rare`.
  { id:"orbe_flamme",          name:"Orbe de Flamme",         icon:"🔥", desc:"MAG+1 · +15 % dégâts de feu",                 type:"acc",  slot:"trinket", formType:"orbe",      rarity:"uncommon", bonusMag:1, bonusElemDmg:{ feu:0.15 },   power:1, price:220, tint:"#e0531f", houseAffinity:"Gryffondor" },
  { id:"orbe_givre",           name:"Orbe de Givre",          icon:"❄️", desc:"MAG+1 · +15 % dégâts de glace",               type:"acc",  slot:"trinket", formType:"orbe",      rarity:"uncommon", bonusMag:1, bonusElemDmg:{ glace:0.15 }, power:1, price:220, tint:"#4fb6e8", houseAffinity:"Serpentard" },
  { id:"cristal_focalisation", name:"Cristal de Focalisation",icon:"💠", desc:"MAG+2 · Crit de sort +4 % · −1 PM par sort", type:"acc",  slot:"amulet",  formType:"cristal",   rarity:"rare",     bonusMag:2, bonusSpellCritChance:4, spCostReduction:1, power:2, price:320, tint:"#7fd6e0", houseAffinity:"Serdaigle" },
  { id:"gantelets_combat",     name:"Gantelets de Combat",    icon:"🥊", desc:"ATK+3 STR+2 — la force perce les défenses",   type:"acc",  slot:"hands",   formType:"gantelets", rarity:"rare",     bonusAtk:3, bonusStr:2, power:3, price:300, houseAffinity:"Gryffondor" },
  { id:"baton_apprenti",       name:"Bâton d'Apprenti",       icon:"🌳", desc:"ATK+2 MAG+3 — bois de caster, lourd mais sûr",type:"wand", slot:"wand",    formType:"baton",     rarity:"uncommon", bonusAtk:2, bonusMag:3, power:3, price:260, tint:"#8a5a2b", houseAffinity:"Serdaigle" },
  { id:"cape_funambule",       name:"Cape du Funambule",      icon:"🧥", desc:"AGI+3 · Célérité +4 · Esquive +3 %",          type:"acc",  slot:"cloak",   formType:"cape",      rarity:"rare",     bonusAgi:3, bonusCelerite:4, bonusDodgeChance:3, power:3, price:360, tint:"#c8a24a", houseAffinity:"Serpentard" },
  { id:"masque_courage",       name:"Masque du Courage",      icon:"🎭", desc:"ATK+5 mais DEF−2 — l'audace sans la garde",    type:"acc",  slot:"head",    formType:"masque",    rarity:"rare",     bonusAtk:5, bonusDef:-2, power:5, price:300, tint:"#b03a2e", houseAffinity:"Gryffondor" },
  { id:"grimoire_flottant",    name:"Grimoire Flottant",      icon:"📖", desc:"INT+4 MAG+2 — un savoir qui se feuillette seul",type:"acc", slot:"trinket", formType:"grimoire",  rarity:"rare",     bonusInt:4, bonusMag:2, power:3, price:380, tint:"#3d6cc0", houseAffinity:"Serdaigle" },
  // Forme défensive mid-game (lean Poufsouffle) — alimente le slot faveur Pouf (P3).
  { id:"talisman_blaireau",    name:"Talisman du Blaireau",   icon:"📿", desc:"DEF+3 END+2 · Régen +1 PV/tour — la loyauté tient bon", type:"acc", slot:"amulet", formType:"talisman", rarity:"rare", bonusDef:3, bonusEnd:2, regenHp:1, power:3, price:340, tint:"#f0c75e", houseAffinity:"Poufsouffle" },
  // B. Endgame (Acte III, étages 8-10).
  { id:"baton_ancestral",      name:"Bâton Ancestral",        icon:"🌳", desc:"ATK+6 MAG+8 · Dégâts crit. de sort +25 %",    type:"wand", slot:"wand",    formType:"baton",     rarity:"epic",     bonusAtk:6, bonusMag:8, bonusSpellCritDamage:0.25, power:8, price:1300, tint:"#6b4423" },
  { id:"talisman_fondateurs",  name:"Talisman des Fondateurs",icon:"📿", desc:"MAG+4 DEF+4 · Régen +2 PV/+1 PM par tour",     type:"acc",  slot:"amulet",  formType:"talisman",  rarity:"epic",     bonusMag:4, bonusDef:4, regenHp:2, regenSp:1, power:4, price:1200, tint:"#caa84c" },
  { id:"masque_rituel",        name:"Masque Rituel",          icon:"🎭", desc:"MAG+8 · Crit de sort +8 % mais PV max −5",     type:"acc",  slot:"head",    formType:"masque",    rarity:"epic",     bonusMag:8, bonusSpellCritChance:8, bonusHpMax:-5, power:8, price:1100, tint:"#5b2c6f" },
  { id:"gantelets_aurors",     name:"Gantelets des Aurors",   icon:"🥊", desc:"ATK+5 STR+3 · Crit phys. +6 %",                type:"acc",  slot:"hands",   formType:"gantelets", rarity:"epic",     bonusAtk:5, bonusStr:3, bonusCritChance:6, power:5, price:1000, tint:"#2c5f8a" },
  { id:"orbe_runique",         name:"Orbe Runique",           icon:"🔮", desc:"MAG+3 · +10 % dégâts de tous les éléments",    type:"acc",  slot:"trinket", formType:"orbe",      rarity:"epic",     bonusMag:3, bonusElemDmg:{ tous:0.10 }, power:3, price:1200, tint:"#9b59d0" },
  // ── Artefacts & Reliquaires 2.0 — P2 variantes Premium (plan §1.5) ──
  // Variantes recoloriées par Maison d'un artefact de base, stats PRÉ-CUITES
  // (base × PREMIUM_MULT[rarity], arrondi par premiumStat — décision §2.1 n°2 :
  // jamais de multiplicateur au runtime). Non vendables (prix 0) : remise
  // cérémonielle par le Chef de Maison à la Quête Signature (HOUSE_PREMIUM).
  // tags : premium, premiumOf (base), houseAffinity, premiumFx (clé FX/son).
  // Gryffondor — Orbe Runique doré (base orbe_runique epic ×1.35).
  { id:"orbe_runique_premium_gryff", name:"Orbe Runique de Godric", icon:"🔮", desc:"MAG+6 LCK+3 · +20 % dégâts de tous les éléments · Crit +5 % — Premium Gryffondor", type:"acc", slot:"trinket", formType:"orbe", rarity:"epic", bonusMag:6, bonusLck:3, bonusElemDmg:{ tous:0.20 }, bonusCritChance:5, power:6, price:0, premium:true, premiumOf:"orbe_runique", houseAffinity:"Gryffondor", premiumFx:"gryff", tint:"#d3a625", rarityScales:true, basePrice:9000 },
  // Serpentard — Masque Rituel émeraude (base masque_rituel epic ×1.35).
  { id:"masque_rituel_premium_slyth", name:"Masque Rituel de Salazar", icon:"🎭", desc:"MAG+11 · Crit de sort +11 % mais PV max −5 — Premium Serpentard", type:"acc", slot:"head", formType:"masque", rarity:"epic", bonusMag:11, bonusSpellCritChance:11, bonusHpMax:-5, power:11, price:0, premium:true, premiumOf:"masque_rituel", houseAffinity:"Serpentard", premiumFx:"slyth", tint:"#1a472a", rarityScales:true, basePrice:9000 },
  // Serdaigle — Bâton Ancestral bleu éthéré (base baton_ancestral epic ×1.35).
  { id:"baton_ancestral_premium_serd", name:"Bâton Ancestral de Rowena", icon:"🌳", desc:"ATK+8 MAG+11 · Dégâts crit. de sort +34 % — Premium Serdaigle", type:"wand", slot:"wand", formType:"baton", rarity:"epic", bonusAtk:8, bonusMag:11, bonusSpellCritDamage:0.34, power:11, price:0, premium:true, premiumOf:"baton_ancestral", houseAffinity:"Serdaigle", premiumFx:"serd", tint:"#0e1a40", rarityScales:true, basePrice:9000 },
  // Poufsouffle — Talisman des Fondateurs terre cuite (base talisman_fondateurs epic ×1.35).
  { id:"talisman_fondateurs_premium_pouf", name:"Talisman de Helga", icon:"📿", desc:"MAG+5 DEF+5 · Régen +3 PV/+1 PM par tour — Premium Poufsouffle", type:"acc", slot:"amulet", formType:"talisman", rarity:"epic", bonusMag:5, bonusDef:5, regenHp:3, regenSp:1, power:5, price:0, premium:true, premiumOf:"talisman_fondateurs", houseAffinity:"Poufsouffle", premiumFx:"pouf", tint:"#f0c75e", rarityScales:true, basePrice:9000 },
  // ── C. Reliques vocales (§1.4 C) — trinket, NON vendables (price:0),
  // octroyées en voyant l'écho du Fondateur en Boucle (grantVoiceRelicForEcho).
  // Les 4 réunies déverrouillent le Codex « Chœur des Fondateurs ». Passifs sur
  // champs prouvés : « fearImmune partiel » (Godric) & « spellLifesteal »
  // (Salazar) du plan rendus en stats (pas de mécanisme partiel/lifesteal
  // d'item dédié) ; « régen /pas » (Helga) rendu en regenHp /tour de combat.
  { id:"voix_godric_relique",  name:"Murmure de Godric",  icon:"🦁", desc:"Relique vocale — ATK+4 LCK+2. « On ne scelle pas par peur. On tient la porte. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusAtk:4, bonusLck:2, power:4, price:0, houseAffinity:"Gryffondor", tint:"#d3a625" },
  { id:"voix_salazar_relique", name:"Murmure de Salazar", icon:"🐍", desc:"Relique vocale — MAG+4 · Crit de sort +5 %. « J'ai scellé ma part avec ma faute. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusMag:4, bonusSpellCritChance:5, power:4, price:0, houseAffinity:"Serpentard", tint:"#1a472a" },
  { id:"voix_rowena_relique",  name:"Murmure de Rowena",  icon:"🦅", desc:"Relique vocale — INT+4 MAG+2 · −1 PM par sort. « Comprends, et la faille apparaît. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusInt:4, bonusMag:2, spCostReduction:1, power:4, price:0, houseAffinity:"Serdaigle", tint:"#0e1a40" },
  { id:"voix_helga_relique",   name:"Murmure de Helga",   icon:"🦡", desc:"Relique vocale — DEF+4 · Régen +2 PV/tour. « J'ai creusé un abri pour ceux qui resteraient. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusDef:4, regenHp:2, power:4, price:0, houseAffinity:"Poufsouffle", tint:"#f0c75e" },
  // ── Récompenses des Quêtes Signature de Maison (remises cérémonielles) ──
  // Cf. docs/histoire/08 §8.5 + .claude/plans/house-signature-quests-impl.md.
  { id:"banniere_godric",  name:"Bannière de Godric",   icon:"🚩", desc:"Bibelot — l'Étendard qui ne s'incline jamais. Immunise le groupe contre la Peur tant qu'un héros la porte. ATK+2.", type:"trinket", slot:"trinket", family:"banner_godric", rarity:"legendary", bonusAtk:2, fearImmune:true, power:5, price:0, tint:"#d3a625" },
  { id:"langue_de_plomb",  name:"Langue-de-plomb",      icon:"📿", desc:"Amulette — secret arraché à l'écho de Salazar. MAG+5 INT+2 · Régen +2 PM/tour.", type:"acc", slot:"amulet", family:"amulet_languedeplomb", rarity:"epic", bonusMag:5, bonusInt:2, regenSp:2, power:5, price:0, tint:"#1a472a" },
  { id:"codex_rowena_eclat", name:"Feuillets de Rowena",  icon:"📘", desc:"Bibelot — le traité perdu de Rowena Serdaigle. INT+4 MAG+2 · le savoir révèle les failles de l'ennemi.", type:"trinket", slot:"trinket", family:"codex_rowena_eclat", rarity:"epic", bonusInt:4, bonusMag:2, power:4, price:0, tint:"#0e1a40" },
  { id:"coeur_refuge",     name:"Cœur du Refuge",       icon:"🏅", desc:"Bibelot — forgé par Helga pour ceux qu'on ne laisse pas derrière. DEF+2 END+2 · Régen +2 PV/+1 PM par tour.", type:"trinket", slot:"trinket", family:"trinket_refuge", rarity:"epic", bonusDef:2, bonusEnd:2, regenHp:2, regenSp:1, power:4, price:0, tint:"#f0c75e" },
  // ── Herbes (ingrédients de potion) — type:"herb" ─────────────
  // Routées vers la besace d'herboriste (player.herbs), pas le sac.
  // Voir .claude/plans/farming-potion-system.md.
  { id:"herbe_armoise",      name:"Armoise",          icon:"🌿", desc:"Ingrédient de potion (palier 1).", type:"herb", tier:1, price:6 },
  { id:"herbe_ortie",        name:"Ortie séchée",     icon:"🍀", desc:"Ingrédient de potion (palier 1).", type:"herb", tier:1, price:6 },
  { id:"herbe_asphodele",    name:"Asphodèle",        icon:"🌼", desc:"Ingrédient de potion (palier 2).", type:"herb", tier:2, price:12 },
  { id:"herbe_branchiflore", name:"Branchiflore",     icon:"🪴", desc:"Ingrédient de potion (palier 2).", type:"herb", tier:2, price:12 },
  { id:"herbe_aconit",       name:"Aconit",           icon:"☘️", desc:"Ingrédient de potion (palier 3).", type:"herb", tier:3, price:20 },
  { id:"herbe_dictame",      name:"Dictame",          icon:"🍃", desc:"Ingrédient de potion (palier 3).", type:"herb", tier:3, price:20 },
  // Palier 4 — herbe rare endgame, ne pousse qu'en Boucle Ténébreuse (étages
  // 11+). Source : cueillette haut-étage + drop du Héraut des Ténèbres +
  // Apothicaire Ténébreux. Réservée aux Élixirs Suprêmes de prestige.
  { id:"herbe_asphodele_noire", name:"Asphodèle des Ténèbres", icon:"🥀", desc:"Ingrédient de potion (palier 4 — Boucle Ténébreuse).", type:"herb", tier:4, price:40 },

  // ── Mondes parallèles Phase H §6.10 — Set Voyageur ────────────
  // 5 pièces craftées à l'Atelier du Voyageur avec des Essences
  // d'Outremonde. Tagged family:'voyageur' pour le bonus de set (2/3/4/5
  // pièces, calculé dans recalculateStats). Stats modestes par pièce —
  // l'intérêt vient du bonus cumulé. Aucun gold price (non vendables).
  { id:"voyageur_diademe",   name:"Diadème du Plan",      icon:"👑", desc:"Tissé d'éclats d'outremonde. +1 INT, +1 LCK.", type:"equip", slot:"head",   family:"voyageur", rarity:"rare", bonusInt:1, bonusLck:1, _outremondeCost:8,  price:0 },
  { id:"voyageur_cape",      name:"Cape du Voyageur",     icon:"🧥", desc:"Tournoie au moindre vent d'un autre plan. +1 AGI, regen SP.", type:"equip", slot:"cloak",  family:"voyageur", rarity:"rare", bonusAgi:1, regenSp:1, _outremondeCost:12, price:0 },
  { id:"voyageur_bottes",    name:"Bottes du Pas Astral", icon:"👢", desc:"Effleurent le sol, jamais ne l'usent. +1 AGI.", type:"equip", slot:"feet",   family:"voyageur", rarity:"rare", bonusAgi:1, _outremondeCost:6,  price:0 },
  { id:"voyageur_anneau",    name:"Anneau de l'Outremonde", icon:"💍", desc:"Une rune froide pulse au doigt. +1 MAG, regen SP.", type:"equip", slot:"ring",   family:"voyageur", rarity:"rare", bonusMag:1, regenSp:1, _outremondeCost:10, price:0 },
  { id:"voyageur_amulette",  name:"Amulette du Lien",     icon:"📿", desc:"Frémit quand les mondes se touchent. +1 LCK, +1 INT.", type:"equip", slot:"amulet", family:"voyageur", rarity:"rare", bonusLck:1, bonusInt:1, _outremondeCost:10, price:0 },
];

// ── Recettes de potion (concoction chez Slughorn) ─────────────
// Voir .claude/plans/farming-potion-system.md. `difficulty` pilote le
// jet INT ; `ingredients` est un multiset { itemId: qty }.
const POTION_RECIPES = [
  { id:"brew_potion_s",     name:"Potion de Soin",        resultItemId:"potion_s",
    ingredients:{ herbe_armoise:2 },                                    difficulty:8,
    lore:"La concoction curative de base — deux brins d'armoise suffisent." },
  { id:"brew_potion_m",     name:"Potion Magique",        resultItemId:"potion_m",
    ingredients:{ herbe_ortie:2 },                                      difficulty:8,
    lore:"L'ortie séchée libère l'énergie magique à l'infusion." },
  { id:"brew_potion_l",     name:"Grande Potion de Soin", resultItemId:"potion_l",
    ingredients:{ herbe_asphodele:2, herbe_armoise:1 },                 difficulty:12,
    lore:"L'asphodèle décuple la vertu curative de l'armoise." },
  { id:"brew_potion_l_sp",  name:"Grande Potion Magique", resultItemId:"potion_l_sp",
    ingredients:{ herbe_branchiflore:2, herbe_ortie:1 },                difficulty:12,
    lore:"La branchiflore amplifie le flux magique de l'ortie." },
  { id:"brew_potion_force", name:"Potion de Force",       resultItemId:"potion_force",
    ingredients:{ herbe_aconit:1, mandragore:2 },                       difficulty:14,
    lore:"L'aconit, dosé avec soin, exalte la vigueur du buveur." },
  { id:"brew_potion_xl",    name:"Élixir Suprême",        resultItemId:"potion_xl",
    ingredients:{ herbe_dictame:2, herbe_aconit:1, herbe_asphodele:1 }, difficulty:18,
    lore:"Le dictame, herbe légendaire, parachève l'élixir des maîtres." },
  // ── Recettes utilitaires (PR 3) ──────────────────────────────
  // Antidote & régénération : combos d'herbes simples, découvrables librement.
  { id:"brew_elixir_antidote", name:"Élixir d'Antidote",  resultItemId:"elixir_antidote",
    ingredients:{ herbe_armoise:1, herbe_ortie:1 },                     difficulty:11,
    lore:"L'armoise neutralise les humeurs, l'ortie chasse les venins." },
  { id:"brew_elixir_regen",    name:"Élixir de Régénération", resultItemId:"elixir_regen",
    ingredients:{ herbe_dictame:1, herbe_asphodele:1 },                 difficulty:12,
    lore:"Le dictame distillé sur l'asphodèle nourrit la chair tour après tour." },
  // Avancées : pré-enseignées par la 3ᵉ quête Slughorn (mais découvrables).
  // (brew_potion_force existe déjà plus haut — pré-enseignée par la quête 3.)
  { id:"brew_potion_resistance", name:"Potion de Résistance", resultItemId:"potion_resistance",
    ingredients:{ herbe_aconit:1, herbe_branchiflore:2 },               difficulty:15,
    lore:"La branchiflore tanne la peau ; l'aconit endurcit l'âme contre les coups." },
  // ── Potions de buff de combat (P2) ──────────────────────────────────────
  { id:"brew_potion_defense",   name:"Potion de Défense",   resultItemId:"potion_defense",
    ingredients:{ herbe_asphodele:1, herbe_aconit:1 },                  difficulty:14,
    lore:"L'asphodèle stabilise, l'aconit cuirasse — le buveur tient le choc." },
  { id:"brew_elixir_celerite",  name:"Élixir de Célérité",  resultItemId:"elixir_celerite",
    ingredients:{ herbe_ortie:2, herbe_branchiflore:1 },                difficulty:14,
    lore:"L'ortie vivifie les nerfs ; la branchiflore allège le pas." },
  { id:"brew_potion_precision", name:"Potion de Précision", resultItemId:"potion_precision",
    ingredients:{ herbe_armoise:2, herbe_dictame:1 },                   difficulty:14,
    lore:"L'armoise aiguise l'œil, le dictame apaise la main du lanceur." },
  { id:"brew_elixir_puissance", name:"Élixir de Puissance", resultItemId:"elixir_puissance",
    ingredients:{ herbe_ortie:1, herbe_aconit:1, herbe_dictame:1 },     difficulty:15,
    lore:"Trois herbes en triade ouvrent les canaux de la magie brute." },
  { id:"brew_potion_xl_sp", name:"Élixir d'Esprit Suprême", resultItemId:"potion_xl_sp",
    ingredients:{ herbe_dictame:2, herbe_branchiflore:1, herbe_ortie:1 }, difficulty:18,
    lore:"Le dictame canalise la branchiflore en un flux mental sans égal." },
  // ── Chaîne de soin à paliers (P4) — upgrade-craft via Éclat de Vitalité ──
  // Mineure : herbes simples (découvrable). Mineure+ / ++ : la potion de rang
  // inférieur + Éclat(s) — un ingrédient EST une potion (résolu depuis le sac).
  { id:"brew_potion_soin_mineure", name:"Potion de Soin Mineure", resultItemId:"potion_soin_mineure",
    ingredients:{ herbe_armoise:1, herbe_asphodele:1 },                 difficulty:9,
    lore:"Une décoction de soin d'apprenti : armoise et asphodèle, sans détour." },
  { id:"brew_potion_soin_mineure_plus", name:"Potion de Soin Mineure +", resultItemId:"potion_soin_mineure_plus",
    ingredients:{ potion_soin_mineure:1, eclat_vitalite:1 },            difficulty:13,
    lore:"Un Éclat de Vitalité fondu dans la fiole en double presque la vertu." },
  { id:"brew_potion_soin_mineure_pp", name:"Potion de Soin Mineure ++", resultItemId:"potion_soin_mineure_pp",
    ingredients:{ potion_soin_mineure_plus:1, eclat_vitalite:2 },       difficulty:17,
    lore:"Deux Éclats saturent la potion d'énergie vitale — le palier des maîtres." },
  // ── Upgrades des potions existantes (soin & magie) ──────────────────────
  { id:"brew_up_potion_l",    name:"Grande Potion de Soin (raffinage)", resultItemId:"potion_l",
    ingredients:{ potion_s:1, eclat_vitalite:1 },                       difficulty:12,
    lore:"L'Éclat de Vitalité transmue une Potion de Soin en sa version majeure." },
  { id:"brew_up_potion_l_sp", name:"Grande Potion Magique (raffinage)", resultItemId:"potion_l_sp",
    ingredients:{ potion_m:1, eclat_vitalite:1 },                       difficulty:12,
    lore:"L'énergie de l'Éclat densifie le flux magique d'une Potion Magique." },
  { id:"brew_up_potion_xl",   name:"Élixir Suprême (raffinage)",        resultItemId:"potion_xl",
    ingredients:{ potion_l:1, eclat_vitalite:2 },                       difficulty:18,
    lore:"Deux Éclats portent une Grande Potion au rang d'Élixir Suprême." },
  { id:"brew_up_potion_xl_sp", name:"Élixir d'Esprit Suprême (raffinage)", resultItemId:"potion_xl_sp",
    ingredients:{ potion_l_sp:1, eclat_vitalite:2 },                    difficulty:18,
    lore:"Deux Éclats subliment une Grande Potion Magique en Élixir d'Esprit." },
  // ── Recettes de prestige (P6.b1) — Asphodèle des Ténèbres ────────────────
  // Voie endgame : la fleur corrompue de la Boucle Ténébreuse distille un
  // Élixir Suprême sans intermédiaire. Réemploient les items résultats
  // existants (potion_xl / potion_xl_sp). Découvrables librement.
  { id:"brew_xl_tenebres",    name:"Élixir Suprême (Ténèbres)",        resultItemId:"potion_xl",
    ingredients:{ herbe_asphodele_noire:2 },                            difficulty:18,
    lore:"L'asphodèle des Ténèbres, à elle seule, vaut tout un autel d'ingrédients." },
  { id:"brew_xl_sp_tenebres", name:"Élixir d'Esprit Suprême (Ténèbres)", resultItemId:"potion_xl_sp",
    ingredients:{ herbe_asphodele_noire:3 },                            difficulty:18,
    lore:"Trois fleurs noires ouvrent l'esprit aux confins de la magie." },
  // ── Flacons offensifs (P6.c) — projectiles alchimiques ───────────────────
  // Multisets inédits (vérifiés sans collision). Découvrables librement.
  { id:"brew_flacon_feu",   name:"Flacon de Feu",   resultItemId:"flacon_feu",
    ingredients:{ herbe_aconit:2 },                                     difficulty:13,
    lore:"L'aconit distillé s'embrase au contact de l'air — à lancer, jamais à boire." },
  { id:"brew_flacon_givre", name:"Flacon de Givre", resultItemId:"flacon_givre",
    ingredients:{ herbe_branchiflore:2 },                               difficulty:13,
    lore:"La branchiflore gelée éclate en esquilles de glace sur sa cible." },
  { id:"brew_flacon_venin", name:"Flacon de Venin", resultItemId:"flacon_venin",
    ingredients:{ herbe_ortie:1, herbe_dictame:1 },                     difficulty:14,
    lore:"Un venin paradoxal : l'ortie attaque là où le dictame guérit." },
];

const SHOP_ITEMS = ["potion_s","potion_m","felix","choco_sorcier","wand1","robe1","amulette","broom","mandragore","livre_sortileges","livre_soin","livre_bombarda"];

// Set bonus Ténèbres (endgame Tranche 2 — cf. ENDGAME_PLAN.md §7.8) :
//   2 items équipés → +10 crit chance, +5 dodge chance
//   3 items équipés → +15 crit chance, +10 dodge chance, +2 regenHp/tour
// Compté dans recalculateStats() (crit/dodge) et applyEquipmentRegen() (regen).
const TENEBRES_SET = ['cape_voldemort', 'cendres_phenix', 'oeil_basilic'];

// ── Loot table d'équipement pour les coffres ────────────────────
// Étage minimum d'éligibilité par rareté. Les items légendaires
// (Maisons) sont exclus des coffres (récompenses dédiées).
// Voir .claude/plans/equipment-extended.md §3.5.
const CHEST_RARITY_MIN_FLOOR = { common: 1, rare: 4, epic: 7 };
const CHEST_RARITY_WEIGHT    = { common: 6, rare: 3, epic: 1 };

// Renvoie un item d'équipement éligible pour un étage donné, pondéré
// par rareté (commons fréquents au début, rares puis épiques après).
// Exclut les spellbooks/consumables/légendaires.
function pickChestEquipment(floor) {
  const pool = ITEMS.filter(it => {
    if (!it.slot) return false;
    if (it.type === 'consumable' || it.type === 'spellbook') return false;
    if (it.rarity === 'legendary') return false;
    const minF = CHEST_RARITY_MIN_FLOOR[it.rarity || 'common'] || 1;
    return floor >= minF;
  });
  if (pool.length === 0) return null;
  // Somme des poids puis tirage proportionnel
  let total = 0;
  for (const it of pool) total += (CHEST_RARITY_WEIGHT[it.rarity || 'common'] || 1);
  let r = Math.random() * total;
  for (const it of pool) {
    r -= (CHEST_RARITY_WEIGHT[it.rarity || 'common'] || 1);
    if (r <= 0) return it;
  }
  return pool[pool.length - 1];
}

const LOCATIONS = [
  "Les Couloirs de Poudlard", "Le Cachot de Potions", "La Grande Salle",
  "La Bibliothèque Interdite", "La Tour de Gryffondor", "Le Donjon de Serpentard",
  "Les Toilettes Hantées", "La Forêt Interdite", "La Salle sur Demande",
  "Les Égouts de Poudlard", "La Chambre des Secrets"
];

const NARRATIVES = {
  floor: [
    "Les torches vacillent sur les murs de pierre froide.",
    "L'écho de vos pas résonne dans le couloir silencieux.",
    "Des portraits murmurent sur les murs tandis que vous passez.",
    "Une odeur de parchemin et de magie flotte dans l'air.",
    "Le château semble respirer autour de vous.",
    "Des araignées tissent leurs toiles dans les coins sombres.",
    "La lumière des lampes à huile projette des ombres dansantes.",
    "Vous entendez un bruit sourd quelque part plus profond dans le château.",
  ],
  door: "Une lourde porte en bois sculpté bloque le passage.",
  stairs_down: "Un escalier tourne en vis descend vers les profondeurs.",
  stairs_up: "Un escalier de pierre remonte vers les étages supérieurs.",
  shop: "Une aile de la bibliothèque a été transformée en échoppe de fortune.",
  chest: "Un coffre verrouillé trône contre le mur, prometteur.",
  trap: "Le sol craque sous vos pieds. C'était un piège !",
  nothing: "Vous fouillez méticuleusement mais ne trouvez rien.",
  gold_found: (n) => `Vous trouvez ${n} Gallions sur le sol !`,
  item_found: (n) => `Vous découvrez : ${n} !`,
  heal_room: "Un bassin magique restaure partiellement vos forces.",
};

// ============================================================
// MONDES PARALLÈLES V1c.1 — registres souvenirs + cosmétiques
// ============================================================
// Souvenirs passifs : débloqués automatiquement par métriques (cf.
// `outremondeMetrics` dans state.js). Chaque souvenir confère un petit
// bonus de stat permanent (Σ appliqué à tout le groupe dans
// `recalculateStats` via `_voyageurMetricsBonus`).
//
// `cond(m)` retourne true si la métrique courante débloque le souvenir.
// Le check est centralisé dans `_checkSouvenirs()` (atelier-voyageur.js),
// qui ajoute à `outremondeSouvenirs` + déclenche un toast + safeCall
// autoSave. Idempotent : un souvenir déjà débloqué n'est jamais retiré.
const OUTREMONDE_SOUVENIRS = [
  { id:"premier_pas",    name:"Premier Pas",      icon:"🌒", desc:"Tu as franchi le seuil. +1 LCK.",
    cond: m => m.visitsTotal >= 1,
    bonus: { bonusLck:1 } },
  { id:"voyageur_familier", name:"Voyageur Familier", icon:"🗺️", desc:"3 plans différents arpentés. +1 INT.",
    cond: m => (m.uniqueHosts && m.uniqueHosts.size >= 3) || (Array.isArray(m.uniqueHosts) && m.uniqueHosts.length >= 3),
    bonus: { bonusInt:1 } },
  { id:"astralien",      name:"Astralien",         icon:"⚔️", desc:"5 Verrous résolus à distance. +1 MAG.",
    cond: m => m.sealsResolved >= 5,
    bonus: { bonusMag:1 } },
  { id:"trame_cousue",   name:"Trame Cousue",      icon:"🕸️", desc:"10 échos défaits. +1 AGI.",
    cond: m => m.echosDefeated >= 10,
    bonus: { bonusAgi:1 } },
  { id:"cartographe",    name:"Cartographe",       icon:"📜", desc:"20 voyages cumulés. +1 LCK +1 INT.",
    cond: m => m.visitsTotal >= 20,
    bonus: { bonusLck:1, bonusInt:1 } },
  { id:"plenipotentiaire", name:"Plénipotentiaire", icon:"👑", desc:"Maître reconnu des plans. +1 ATK +1 MAG.",
    cond: m => m.sealsResolved >= 10 && m.echosDefeated >= 15,
    bonus: { bonusAtk:1, bonusMag:1 } }
];

// Cosmétiques : 12 unlocks répartis en 3 catégories (aura / portail /
// fissure). Achetés à l'Atelier contre essences + fragments. Un
// cosmétique acheté est ajouté à `outremondeCosmetics` ; l'activation
// (`outremondeActive<Kind>` = id) pilote les couches visuelles.
//
// `kind` ∈ 'aura' | 'portal' | 'fissure'. `palette` est une couleur CSS
// hex consommée par les couches de rendu (CSS variable + portal-fx +
// HUD visite).
const OUTREMONDE_COSMETICS = [
  // Auras de visite — halo coloré autour du HUD de visite côté visiteur.
  { id:"aura_or",      name:"Aura d'Or",      icon:"🌟", kind:"aura",    palette:"#d8b647", essCost:5, fragCost:1, desc:"Halo doré chaud autour du HUD de visite." },
  { id:"aura_glace",   name:"Aura de Glace",  icon:"❄️", kind:"aura",    palette:"#a8e0ff", essCost:6, fragCost:1, desc:"Halo bleuté glacial autour du HUD." },
  { id:"aura_brume",   name:"Aura de Brume",  icon:"🌫️", kind:"aura",    palette:"#c8c4d6", essCost:5, fragCost:1, desc:"Halo violet-gris brumeux." },
  { id:"aura_lune",    name:"Aura de Lune",   icon:"🌙", kind:"aura",    palette:"#e8ecf8", essCost:7, fragCost:2, desc:"Halo blanc-bleu très clair." },
  // Skins de portail — couleur principale de l'animation Cheminette.
  { id:"portal_emeraude", name:"Portail d'Émeraude", icon:"💚", kind:"portal", palette:"#3cdc5a", essCost:5, fragCost:1, desc:"Flammes vertes (défaut)." },
  { id:"portal_amethyste", name:"Portail d'Améthyste", icon:"💜", kind:"portal", palette:"#a060d0", essCost:8, fragCost:2, desc:"Flammes violettes." },
  { id:"portal_rubis",     name:"Portail de Rubis",     icon:"❤️", kind:"portal", palette:"#d94545", essCost:8, fragCost:2, desc:"Flammes écarlates." },
  { id:"portal_saphir",    name:"Portail de Saphir",    icon:"💙", kind:"portal", palette:"#4488dd", essCost:8, fragCost:2, desc:"Flammes bleu profond." },
  // Skins de fissure — couleur principale de la cellule trouée côté host.
  { id:"fissure_or",       name:"Fissure d'Or",       icon:"✨", kind:"fissure", palette:"#d8b647", essCost:5, fragCost:1, desc:"Bord de fissure doré." },
  { id:"fissure_argent",   name:"Fissure d'Argent",   icon:"⚪", kind:"fissure", palette:"#c0c4ce", essCost:6, fragCost:1, desc:"Bord argenté." },
  { id:"fissure_cuivre",   name:"Fissure de Cuivre",  icon:"🟠", kind:"fissure", palette:"#cf8a3a", essCost:6, fragCost:1, desc:"Bord cuivré chaud." },
  { id:"fissure_obsidienne", name:"Fissure d'Obsidienne", icon:"⚫", kind:"fissure", palette:"#2a2530", essCost:8, fragCost:2, desc:"Bord obsidienne lustrée." }
];


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
  REFUGE:17,
  // Chaudron des Ruines (Potions 2.0 — Lot P11) — atelier d'alchimie endgame,
  // posé comme Forge/Bibliothèque (post-victoire). Interaction → openBrewingModal
  // ({ workshop:"ruines" }). Voir .claude/plans/potions-consumables-craft-2.0.md §1.9.
  CAULDRON:18
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


// ============================================================
// CONSTANTES DE CARTE
// ============================================================
const MAP_W = 12, MAP_H = 12;
const CELL = {
  WALL:0, FLOOR:1, DOOR:2, STAIRS_D:3, STAIRS_U:4, SHOP:5, CHEST:6,
  FOUNTAIN:7, NPC:8,
  // Endgame Tranche 2 — Forge des Ténèbres (upgrade items) et Bibliothèque
  // interdite (upgrade sorts). Voir ENDGAME_PLAN.md §7.5/§7.6.
  FORGE:9, LIBRARY:10
};

// Vecteurs de déplacement par direction cardinale (N, S, E, O).
// Indexé par playerDir / cellule cible.
const DIRECTIONS = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };

// ============================================================
// CONSTANTES DE GAMEPLAY
// ============================================================

// Progression d'XP : multiplicateur appliqué à xpNext à chaque level-up.
const LEVEL_UP_XP_MULTIPLIER = 1.6;

// Points de stats libres gagnés à chaque level-up, en plus du baseline
// (+1 ATK/DEF/MAG, +1 STR/INT/AGI, +8 HP, +5 SP qui restent dans `_grantLevelStats`).
// `unallocatedStatPoints` sur chaque perso accumule les points non dépensés.
const STAT_POINTS_PER_LEVEL = 3;

// Effet d'un point alloué : mutation appliquée à `c._baseX` (ou `hpMax`)
// pour persister à travers les futurs level-ups via `recalculateStats`.
// Clés UI : STR / INT / AGI / END / LCK.
const STAT_POINT_EFFECTS = {
  STR: { baseAtk: 1 },          // +1 ATK permanent
  INT: { baseMag: 1 },          // +1 MAG permanent
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

// Fouille de salle (movement.js — searchRoom) : seuils cumulatifs sur un
// Math.random(). roll < GOLD : trouve de l'or. roll < ITEM (et ≥ GOLD) :
// trouve un item. Sinon : rien.
const SEARCH_GOLD_THRESHOLD = 0.20;
const SEARCH_ITEM_THRESHOLD = 0.35;

// Repos (movement.js — rest) : chance d'être interrompu par une rencontre.
const REST_ENCOUNTER_CHANCE = 0.3;

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
  }
};

// Les ennemis sont définis dans js/monsters.js (MONSTERS)

const SPELLS = [
  // ── Sorts de base ────────────────────────────────────────────
  { name:"Expelliarmus",      icon:"✨",   desc:"Désarme l'ennemi (-3 ATK)",          cost:4,  effect:"disarm",  power:3  },
  { name:"Stupefix",          icon:"⚡",   desc:"Étourdit l'ennemi (8 dégâts)",       cost:6,  effect:"stun",    power:8  },
  { name:"Episkey",           icon:"💚",   desc:"Soigne légèrement (12 PV)",          cost:5,  effect:"heal",    power:12 },
  { name:"Protego",           icon:"🛡️",  desc:"Bouclier magique (2 tours)",          cost:5,  effect:"shield",  power:5  },
  { name:"Incendio",          icon:"🔥",   desc:"Flammes magiques (14 dégâts)",       cost:8,  effect:"burn",    power:14 },
  { name:"Accio",             icon:"🌀",   desc:"Tire un objet ennemi (+or)",         cost:6,  effect:"steal",   power:0  },
  // ── Sorts avancés (appris en jeu) ────────────────────────────
  { name:"Wingardium Leviosa",icon:"🌬️",  desc:"Soulève et assomme (10 dégâts)",     cost:7,  effect:"stun",    power:10 },
  { name:"Diffindo",          icon:"✂️",   desc:"Lacère l'ennemi (16 dégâts)",        cost:9,  effect:"burn",    power:16 },
  { name:"Reparo",            icon:"💛",   desc:"Soin renforcé (20 PV)",              cost:7,  effect:"heal",    power:20 },
  { name:"Sectumsempra",      icon:"🩸",   desc:"Sort maudit (24 dégâts)",            cost:14, effect:"burn",    power:24 },
  // ── Sorts intermédiaires ─────────────────────────────────────
  { name:"Lumos Maxima",      icon:"💡",   desc:"Éclat aveuglant (12 dégâts + stun)", cost:8,  effect:"stun",    power:12 },
  { name:"Aguamenti",         icon:"💧",   desc:"Jet d'eau (10 dégâts, -2 DEF)",      cost:7,  effect:"burn",    power:10 },
  { name:"Bombarda",          icon:"💥",   desc:"Explosion (20 dégâts tous ennemis)", cost:15, effect:"burn",    power:20 },
  { name:"Riddikulus",        icon:"🤡",   desc:"Neutralise les créatures du chaos",  cost:6,  effect:"stun",    power:8  },
  { name:"Alohomora",         icon:"🔓",   desc:"Vole 15-30 Gallions à l'ennemi",    cost:5,  effect:"steal",   power:20 },
  { name:"Patronum",          icon:"✨",   desc:"Patronus : 18 dégâts anti-Détraqueur", cost:12, effect:"burn",  power:18 },
  // ── Sort interdit (débloqué au niveau 9) ─────────────────────
  { name:"Avada...",          icon:"💚✨", desc:"Malédiction mortelle (50 dégâts)",   cost:20, effect:"instant", power:50, locked:true },
  // ── Sorts de Vampirisme ─────────────────────────────────────
  { name:"Sanguini",          icon:"🩸",   desc:"Vol de vie (12 dégâts, +6 PV)",      cost:8,  effect:"lifesteal", power:12 },
  { name:"Vampyrus",          icon:"🦇",   desc:"Drain magique (18 dégâts, +9 PV)",   cost:14, effect:"lifesteal", power:18 },
  // ── Sorts de Malédiction ────────────────────────────────────
  { name:"Tarantallegra",     icon:"💃",   desc:"Danse maudite (8 dégâts + étourdis)", cost:7, effect:"stun",   power:8  },
  { name:"Maledictus",        icon:"☠️",   desc:"Malédiction (10 dégâts, −3 ATK/DEF)", cost:9, effect:"curse",  power:10 },
  { name:"Crucio",            icon:"😖",   desc:"Sort de douleur interdit (22 dégâts)", cost:14, effect:"burn", power:22 },
  { name:"Morsmordre",        icon:"💀",   desc:"Marque des Ténèbres (26 dégâts)",     cost:18, effect:"burn", power:26 },
];

const ITEMS = [
  { id:"potion_s", name:"Potion de Soin", icon:"🧪", desc:"+15 PV", type:"consumable", effect:"heal", power:15, price:30 },
  { id:"potion_m", name:"Potion Magique", icon:"💜", desc:"+12 PM", type:"consumable", effect:"restore_sp", power:12, price:25 },
  { id:"potion_l",     name:"Grande Potion de Soin", icon:"🧪", desc:"+40 PV", type:"consumable", effect:"heal",       power:40, price:80 },
  { id:"potion_l_sp",  name:"Grande Potion Magique", icon:"💜", desc:"+30 PM", type:"consumable", effect:"restore_sp", power:30, price:70 },
  { id:"felix", name:"Félix Felicis", icon:"✨", desc:"+20 PV +10 PM", type:"consumable", effect:"both", power:20, price:80 },
  { id:"mandragore", name:"Racine de Mandragore", icon:"🌿", desc:"+8 PV", type:"consumable", effect:"heal", power:8, price:15 },
  { id:"wand1",   name:"Baguette de Saule",   icon:"🪄", desc:"ATK+2",                      type:"wand",  slot:"wand",   family:"wand_basic",    rarity:"common", power:2, bonusAtk:2,                                price:120, tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_basic", tint:"willow" },
  { id:"wand2",   name:"Baguette de Sureau",  icon:"🪄", desc:"ATK+5 MAG+3",                type:"wand",  slot:"wand",   family:"wand_elder",    rarity:"rare",   power:5, bonusAtk:5, bonusMag:3,                       price:300, tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_runic", tint:"elder"  },
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
  // ── Items Tier 2 Maison (cf. .claude/plans/house-intermediate-tier.md) — remis par les Chefs de Maison ──
  { id:"brassard_lion",    name:"Brassard du Lion",      icon:"🥊", desc:"ATK+2 LCK+1 — Tier 2 Gryffondor",   type:"acc",   slot:"hands",  family:"gryff_t2",     rarity:"rare", power:2, bonusAtk:2, bonusLck:1, price:0 },
  { id:"anneau_serpent",   name:"Anneau du Serpent",     icon:"💍", desc:"MAG+2 LCK+1 — Tier 2 Serpentard",   type:"acc",   slot:"ring",   family:"slyth_t2",     rarity:"rare", power:2, bonusMag:2, bonusLck:1, price:0 },
  { id:"plume_aigle",      name:"Plume d'Aigle",         icon:"🪶", desc:"MAG+2 INT+1 — Tier 2 Serdaigle",    type:"acc",   slot:"trinket",family:"raven_t2",     rarity:"rare", power:2, bonusMag:2, bonusInt:1, price:0 },
  { id:"ceinture_blaireau",name:"Ceinture du Blaireau",  icon:"🪢", desc:"DEF+2 END+1 — Tier 2 Poufsouffle",  type:"acc",   slot:"belt",   family:"pouf_t2",      rarity:"rare", power:2, bonusDef:2, bonusEnd:1, price:0 },
  { id:"choco_sorcier",name:"Chocolat aux Sorciers", icon:"🍫", desc:"+10 PV +5 PM",       type:"consumable", effect:"both",       power:10, price:20 },
  { id:"potion_force", name:"Potion de Force",       icon:"💪", desc:"+8 ATK pendant 3 tours", type:"consumable", effect:"heal",      power:8,  price:45 },
  { id:"cape_invis",   name:"Cape d'Invisibilité",   icon:"🌫️", desc:"AGI+5 LCK+5",           type:"acc",   slot:"cloak", family:"cloak_invis",  rarity:"epic",     bonusAgi:5, bonusLck:5, power:5, price:400 },
  { id:"chapeau_pointu",name:"Chapeau de Serdaigle", icon:"🎓", desc:"MAG+3 INT+3",            type:"armor", slot:"head",  family:"hat_serd",     rarity:"rare",     bonusDef:2, bonusMag:3, power:3, price:200 },
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
  { id:"anneau_runique",   name:"Anneau Runique",        icon:"💍", desc:"MAG+2 LCK+2",       type:"acc",   slot:"ring",  family:"ring_runed",    rarity:"rare",   bonusMag:2, bonusLck:2, power:2, price:260, tint:"#a060d0" },
  { id:"ceinture_alchimiste",name:"Ceinture d'Alchimiste",icon:"➿", desc:"DEF+1 LCK+3",      type:"acc",   slot:"belt",  family:"belt_alch",     rarity:"rare",   bonusDef:1, bonusLck:3, power:1, price:230 },
  // Tier rare/épique étage 7+
  { id:"bottes_dragon",    name:"Bottes en Peau de Dragon",icon:"🥾",desc:"DEF+3 AGI+2",      type:"acc",   slot:"feet",  family:"boots_dragon",  rarity:"rare",   bonusDef:3, bonusAgi:2, power:3, price:340 },
  { id:"retourneur_temps", name:"Retourneur de Temps",   icon:"⌛", desc:"AGI+3 LCK+2",        type:"acc",   slot:"trinket",family:"timeturner",  rarity:"epic",   bonusAgi:3, bonusLck:2, power:3, price:550, tint:"#c9a84c" },
  // ── Phase 3c : équipements mid-game (étages 3-7) ─────────────
  // Comblent les slots peu fournis. Apparaissent en boutique selon
  // minFloor et peuvent dropper sur les monstres élite de la zone.
  { id:"gants_duelliste",  name:"Gants du Duelliste",     icon:"🧤", desc:"ATK+2 AGI+1",        type:"acc",   slot:"hands", family:"gloves_duelist",rarity:"rare",   bonusAtk:2, bonusAgi:1, power:2, price:210 },
  { id:"casque_aurore",    name:"Casque d'Auror",         icon:"⛑️", desc:"DEF+3 MAG+1",        type:"acc",   slot:"head",  family:"helm_auror",    rarity:"rare",   bonusDef:3, bonusMag:1, power:3, price:260 },
  { id:"ceinture_force",   name:"Ceinture de Force",      icon:"➿", desc:"ATK+1 DEF+2",        type:"acc",   slot:"belt",  family:"belt_strength", rarity:"rare",   bonusAtk:1, bonusDef:2, power:2, price:250 },
  { id:"anneau_courage",   name:"Anneau du Courage",      icon:"💍", desc:"ATK+2 LCK+1",        type:"acc",   slot:"ring",  family:"ring_courage",  rarity:"rare",   bonusAtk:2, bonusLck:1, power:2, price:280, tint:"#c2453a" },
  { id:"bottes_silence",   name:"Bottes du Silence",      icon:"🥾", desc:"AGI+3 LCK+1",        type:"acc",   slot:"feet",  family:"boots_silence", rarity:"epic",   bonusAgi:3, bonusLck:1, power:3, price:420 },
  { id:"talisman_tactique",name:"Talisman du Tacticien",  icon:"🔮", desc:"LCK+2 MAG+1",        type:"acc",   slot:"trinket",family:"talisman_tact",rarity:"rare",   bonusLck:2, bonusMag:1, power:2, price:300 },
  // ── Phase 3b : récompenses de quêtes (PNJ donneurs) ──
  // Anneau remis par le portrait de Dumbledore (quête `anneau_dumbledore`). Pierre noire sertie d'or.
  { id:"anneau_resurrection",name:"Anneau de la Résurrection",icon:"💍", desc:"MAG+3 LCK+4 · Apprend Reparo", type:"acc", slot:"ring",  family:"ring_resurrection", rarity:"epic", bonusMag:3, bonusLck:4, power:3, grantsSpell:"Reparo", price:0, tint:"#1a1a1a" },
  // Amulette remise par Fumseck (quête `bouclier_phenix`). Régénère 3 PV en début de tour ennemi.
  { id:"larmes_phenix",      name:"Larmes du Phénix",         icon:"📿", desc:"DEF+2 MAG+2 · Régen +3 PV/tour",type:"acc", slot:"amulet",family:"amulet_tears",      rarity:"epic", bonusDef:2, bonusMag:2, power:2, regenHp:3,            price:0, tint:"#e84020" },
  // ── Livres de sorts ──────────────────────────────────────────
  { id:"livre_sortileges", name:"Sortilèges Standards, Vol.3", icon:"📗", desc:"Apprend Wingardium Leviosa",  type:"spellbook", spell:"Wingardium Leviosa", price:90  },
  { id:"livre_soin",       name:"Potions & Remèdes Magiques",  icon:"📘", desc:"Apprend Reparo (soin 20 PV)", type:"spellbook", spell:"Reparo",             price:70  },
  { id:"book_monsters",    name:"Livre des Monstres",          icon:"📚", desc:"Apprend Diffindo (16 dégâts)",type:"spellbook", spell:"Diffindo",           price:0   },
  { id:"livre_prince",     name:"Manuel du Demi-Sang",         icon:"📓", desc:"Apprend Sectumsempra (24 dégâts) — sort maudit", type:"spellbook", spell:"Sectumsempra", price:500 },
  { id:"livre_bombarda",   name:"Traité de Magie Explosive",   icon:"📙", desc:"Apprend Bombarda (20 dégâts)",  type:"spellbook", spell:"Bombarda",   price:150 },
  { id:"livre_patronum",   name:"Guide du Patronus",            icon:"📒", desc:"Apprend Patronum",              type:"spellbook", spell:"Patronum",   price:200 },
  // ── Grimoires de Vampirisme & Malédictions ───────────────────
  { id:"livre_sanguini",   name:"Traité du Sang Vivant",         icon:"📕", desc:"Apprend Sanguini (vol de vie)", type:"spellbook", spell:"Sanguini",      price:180 },
  { id:"livre_vampyrus",   name:"Codex des Strigoï",             icon:"📕", desc:"Apprend Vampyrus (drain magique)", type:"spellbook", spell:"Vampyrus",   price:380 },
  { id:"livre_taranta",    name:"Pas de la Sorcière Maudite",    icon:"📓", desc:"Apprend Tarantallegra",         type:"spellbook", spell:"Tarantallegra", price:80  },
  { id:"livre_maledictus", name:"Grimoire des Maudits",          icon:"📓", desc:"Apprend Maledictus",            type:"spellbook", spell:"Maledictus",    price:220 },
  { id:"livre_crucio",     name:"Sortilèges Impardonnables, T.II", icon:"📕", desc:"Apprend Crucio (sort interdit)", type:"spellbook", spell:"Crucio",     price:450 },
  { id:"livre_morsmordre", name:"Marque des Ténèbres",            icon:"📕", desc:"Apprend Morsmordre",            type:"spellbook", spell:"Morsmordre",    price:600 },
];

const SHOP_ITEMS = ["potion_s","potion_m","felix","choco_sorcier","wand1","robe1","amulette","broom","mandragore","livre_sortileges","livre_soin","livre_bombarda"];

// Set bonus Ténèbres (endgame Tranche 2 — cf. ENDGAME_PLAN.md §7.8) :
//   2 items équipés → +10 crit chance, +5 dodge chance
//   3 items équipés → +15 crit chance, +10 dodge chance, +2 regenHp/tour
// Compté dans recalculateStats() (crit/dodge) et applyEquipmentRegen() (regen).
const TENEBRES_SET = ['cape_voldemort', 'cendres_phenix', 'oeil_basilic'];

/* ─────────────────────────────────────────────────────────────────────────
   ICON_RECIPES — schéma de migration vers le pipeline painterly (direction A).
   Mirror exact du dict RECIPES dans tools/icon_factory.py.

   Pour chaque item :
     silhouette : soit { kind:"svg", file } pointant tools/parts/<file>,
                  soit { kind:"shape", name, params } via tools/shapes.py
     fills      : { region: "#rrggbb" } — une couleur par data-region du SVG
     accents    : [ { kind, region, color, ...opts } ] — liquide, runes, bulles,
                  emboss, orb_glow, gem_facet_shine, sparkles
     rarity     : common | uncommon | rare | epic | legendary  (pilote le halo)
     material   : matte | glass | metal | leather | wood       (pilote spec)
     lightAngle : degrés, défaut 45

   Le moteur Python est seul à lire ce schéma (front consomme les PNG
   mipmaps générés). Garder les deux côtés alignés pour le mapping J2.
   ───────────────────────────────────────────────────────────────────────── */
const ICON_RECIPES = {
  potion_s: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#764e2a", body:"#acc4d0" },
    accents: [
      { kind:"liquid", region:"body", color:"#d94444", level:0.72, meniscus:true }
    ],
    rarity:"common", material:"glass"
  },

  felix: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#8c622e", body:"#d2bc8e" },
    accents: [
      { kind:"liquid", region:"body", color:"#f0c448", level:0.8, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", count:6, color:"#ffe8a8" }
    ],
    rarity:"legendary", material:"glass", sparkles:true
  },

  wand2: {
    silhouette: { kind:"svg", file:"wizard-staff.svg" },
    fills: { shaft:"#4e3420", grip:"#362416", pommel:"#7a582a", orb:"#bedceb" },
    accents: [
      { kind:"runes", region:"shaft", color:"#ebd796", count:5 },
      { kind:"orb_glow", region:"orb", color:"#c8e6ff" }
    ],
    rarity:"rare", material:"wood"
  },

  anneau_runique: {
    silhouette: { kind:"shape", name:"ring_band", params:{ radius:175, thickness:36, bezel:true, gem:true } },
    fills: { metal:"#c9a84c", gem:"#6096dc" },
    accents: [
      { kind:"runes", region:"metal", color:"#503814", count:6, around:"ring" },
      { kind:"gem_facet_shine", region:"gem", color:"#dcebff" }
    ],
    rarity:"rare", material:"metal"
  },

  livre_sortileges: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#3a588a", pages:"#e4d2a8", spine:"#263c62", gilt:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#1e2e4c" },
      { kind:"symbol", region:"cover", shape:"star", color:"#d8bc6c", size:130 }
    ],
    rarity:"common", material:"leather"
  },

  potion_m: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#764e2a", body:"#acc4d0" },
    accents: [
      { kind:"liquid", region:"body", color:"#925cc4", level:0.74, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", color:"#dcc4ff", count:4 }
    ],
    rarity:"common", material:"glass"
  },

  potion_force: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#8c5c2e", body:"#d0b89c" },
    accents: [
      { kind:"liquid", region:"body", color:"#d8662c", level:0.7, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", color:"#ffc878", count:5 }
    ],
    rarity:"common", material:"glass"
  },

  larmes_phenix: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#ac7834", body:"#e4d4ac" },
    accents: [
      { kind:"liquid", region:"body", color:"#f0d080", level:0.82, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", color:"#fff0c8", count:7 }
    ],
    rarity:"legendary", material:"glass", sparkles:true
  },

  wand1: {
    silhouette: { kind:"svg", file:"wizard-staff.svg" },
    fills: { shaft:"#846038", grip:"#543c24", pommel:"#9c7848", orb:"#d0c090" },
    accents: [
      { kind:"orb_glow", region:"orb", color:"#f0dca0" }
    ],
    rarity:"common", material:"wood"
  },

  livre_soin: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#38704e", pages:"#e4d2a8", spine:"#204830", gilt:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#163424" },
      { kind:"symbol", region:"cover", shape:"cross", color:"#d8bc6c", size:120 }
    ],
    rarity:"common", material:"leather"
  },

  book_monsters: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#6c482c", pages:"#d0b894", spine:"#48301c", gilt:"#b07c38" },
    accents: [
      { kind:"emboss", region:"cover", color:"#382414" },
      { kind:"symbol", region:"cover", shape:"fang", color:"#e0d0ac", size:130 }
    ],
    rarity:"common", material:"leather"
  },

  livre_prince: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#20202c", pages:"#d0bc9c", spine:"#12121c", gilt:"#c09c48" },
    accents: [
      { kind:"emboss", region:"cover", color:"#0e0e14" },
      { kind:"symbol", region:"cover", shape:"moon", color:"#dcc484", size:130 }
    ],
    rarity:"epic", material:"leather"
  },

  livre_bombarda: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#983c28", pages:"#e4d2a8", spine:"#682418", gilt:"#dcb048" },
    accents: [
      { kind:"emboss", region:"cover", color:"#4c1810" },
      { kind:"symbol", region:"cover", shape:"flame", color:"#f0c86c", size:130 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_patronum: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#dcdce8", pages:"#f0e0b8", spine:"#acb0c0", gilt:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#989cac" },
      { kind:"symbol", region:"cover", shape:"deer", color:"#b4bcd0", size:130 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_sanguini: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#78141c", pages:"#d0bc98", spine:"#500c12", gilt:"#b48430" },
    accents: [
      { kind:"emboss", region:"cover", color:"#3c080c" },
      { kind:"symbol", region:"cover", shape:"drop", color:"#e0a858", size:120 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_vampyrus: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#24182c", pages:"#c8b494", spine:"#160e1e", gilt:"#b498c4" },
    accents: [
      { kind:"emboss", region:"cover", color:"#100a16" },
      { kind:"symbol", region:"cover", shape:"bat", color:"#d8bce0", size:140 }
    ],
    rarity:"epic", material:"leather"
  },

  livre_taranta: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#64387c", pages:"#e4d2a8", spine:"#402054", gilt:"#c09c48" },
    accents: [
      { kind:"emboss", region:"cover", color:"#2c143c" },
      { kind:"symbol", region:"cover", shape:"snake", color:"#d8bc6c", size:140 }
    ],
    rarity:"common", material:"leather"
  },

  livre_maledictus: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#381c4c", pages:"#d0bc98", spine:"#201034", gilt:"#a480c4" },
    accents: [
      { kind:"emboss", region:"cover", color:"#180c28" },
      { kind:"symbol", region:"cover", shape:"eye", color:"#d0ace0", size:130 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_crucio: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#1a1414", pages:"#c8b494", spine:"#0e0a0a", gilt:"#b4302c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#0a0606" },
      { kind:"symbol", region:"cover", shape:"lightning", color:"#e05848", size:130 }
    ],
    rarity:"epic", material:"leather"
  },

  livre_morsmordre: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#141418", pages:"#c8b494", spine:"#0a0a0e", gilt:"#50bc78" },
    accents: [
      { kind:"emboss", region:"cover", color:"#08080c" },
      { kind:"symbol", region:"cover", shape:"skull", color:"#8ce0a8", size:130 }
    ],
    rarity:"epic", material:"leather"
  },

  amulette: {
    silhouette: { kind:"svg", file:"gem-pendant.svg" },
    fills: { chain:"#b49448", bezel:"#c9a84c", gem:"#d84030" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#ffb478" }
    ],
    rarity:"rare", material:"metal"
  },

  amulette_protection: {
    silhouette: { kind:"svg", file:"gem-pendant.svg" },
    fills: { chain:"#acb0bc", bezel:"#c0c4d0", gem:"#5094c0" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#c8e6ff" }
    ],
    rarity:"common", material:"metal"
  },

  locket_slytherin: {
    silhouette: { kind:"svg", file:"gem-pendant.svg" },
    fills: { chain:"#b4b8c4", bezel:"#acb0bc", gem:"#1c6c3c" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#78dca0" },
      { kind:"orb_glow", region:"gem", color:"#50c88c" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  robe1: {
    silhouette: { kind:"svg", file:"hood.svg" },
    fills: { cloth:"#30446c", lining:"#1c2c4c", clasp:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cloth", color:"#18243c" }
    ],
    rarity:"common", material:"matte"
  },

  cape_voyageur: {
    silhouette: { kind:"svg", file:"hood.svg" },
    fills: { cloth:"#6c4c30", lining:"#442c1c", clasp:"#987c48" },
    accents: [
      { kind:"emboss", region:"cloth", color:"#382414" }
    ],
    rarity:"common", material:"matte"
  },

  cape_invis: {
    silhouette: { kind:"svg", file:"hood.svg" },
    fills: { cloth:"#c8d0dc", lining:"#949cac", clasp:"#d0c4e8" },
    accents: [
      { kind:"emboss", region:"cloth", color:"#7c8494" },
      { kind:"orb_glow", region:"cloth", color:"#dce8ff" }
    ],
    rarity:"legendary", material:"matte", sparkles:true
  },

  anneau_argent: {
    silhouette: { kind:"shape", name:"ring_band", params:{ radius:165, thickness:48, bezel:true, gem:true } },
    fills: { metal:"#c4c8d4", gem:"#9498a8" },
    accents: [
      { kind:"runes", region:"metal", color:"#6c7080", count:8, around:"ring" },
      { kind:"gem_facet_shine", region:"gem", color:"#e8ecf8" },
      { kind:"emboss", region:"metal", color:"#606474" }
    ],
    rarity:"common", material:"metal"
  },

  anneau_resurrection: {
    silhouette: { kind:"shape", name:"ring_band", params:{ radius:175, thickness:38, bezel:true, gem:true } },
    fills: { metal:"#584834", gem:"#202028" },
    accents: [
      { kind:"runes", region:"metal", color:"#302418", count:6, around:"ring" },
      { kind:"gem_facet_shine", region:"gem", color:"#b49cdc" },
      { kind:"orb_glow", region:"gem", color:"#8c64c8" }
    ],
    rarity:"epic", material:"metal"
  },

  sword_gryff: {
    silhouette: { kind:"svg", file:"sword.svg" },
    fills: { blade:"#d4dce8", guard:"#c9a84c", hilt:"#601414", pommel:"#d43c38" },
    accents: [
      { kind:"runes", region:"blade", color:"#98a0b0", count:4 },
      { kind:"gem_facet_shine", region:"pommel", color:"#ffb4a0" },
      { kind:"orb_glow", region:"pommel", color:"#f07850" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  broom: {
    silhouette: { kind:"svg", file:"broom.svg" },
    fills: { handle:"#7c542c", binding:"#c08c38", bristles:"#ac7c44", tip:"#d8b860" },
    accents: [
      { kind:"runes", region:"handle", color:"#d8b860", count:3 }
    ],
    rarity:"rare", material:"wood"
  },

  bottes_apprenti: {
    silhouette: { kind:"svg", file:"boot.svg" },
    fills: { shaft:"#7c5838", foot:"#6c4828", sole:"#382414", lace:"#d0b884" },
    accents: [
      { kind:"emboss", region:"shaft", color:"#402c18" }
    ],
    rarity:"common", material:"leather"
  },

  bottes_dragon: {
    silhouette: { kind:"svg", file:"boot.svg" },
    fills: { shaft:"#282c30", foot:"#1c2024", sole:"#0c1014", lace:"#b43c2c" },
    accents: [
      { kind:"emboss", region:"shaft", color:"#101418" },
      { kind:"runes", region:"shaft", color:"#c85038", count:3 }
    ],
    rarity:"rare", material:"leather"
  },

  gants_apprenti: {
    silhouette: { kind:"svg", file:"glove.svg" },
    fills: { cuff:"#543820", palm:"#745030", fingers:"#6c4828", stitch:"#d0b484" },
    accents: [
      { kind:"emboss", region:"palm", color:"#3c2814" }
    ],
    rarity:"common", material:"leather"
  },

  ceinture_cuir: {
    silhouette: { kind:"svg", file:"belt.svg" },
    fills: { strap:"#6c4828", buckle:"#b4b8c4", holes:"#382414", tongue:"#acb0bc" },
    accents: [
      { kind:"emboss", region:"strap", color:"#402c18" }
    ],
    rarity:"common", material:"leather"
  },

  ceinture_alchimiste: {
    silhouette: { kind:"svg", file:"belt.svg" },
    fills: { strap:"#583820", buckle:"#c9a84c", holes:"#301c0c", tongue:"#b09040" },
    accents: [
      { kind:"emboss", region:"strap", color:"#342010" },
      { kind:"runes", region:"strap", color:"#d8b860", count:4 }
    ],
    rarity:"rare", material:"leather"
  },

  chapeau_apprenti: {
    silhouette: { kind:"svg", file:"hat-pointy.svg" },
    fills: { cone:"#2c3858", brim:"#1c2844", band:"#402c14", buckle:"#b49c58" },
    accents: [
      { kind:"emboss", region:"cone", color:"#182038" }
    ],
    rarity:"common", material:"matte"
  },

  chapeau_pointu: {
    silhouette: { kind:"svg", file:"hat-pointy.svg" },
    fills: { cone:"#243c68", brim:"#14284c", band:"#8c6c38", buckle:"#d8b860" },
    accents: [
      { kind:"emboss", region:"cone", color:"#102040" },
      { kind:"gem_facet_shine", region:"buckle", color:"#ffdc8c" }
    ],
    rarity:"rare", material:"matte"
  },

  circlet_serdaigle: {
    silhouette: { kind:"svg", file:"tiara.svg" },
    fills: { band:"#ac8438", points:"#b49040", gem:"#385c9c", side:"#5c84bc" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#b4dcff" }
    ],
    rarity:"common", material:"metal"
  },

  diademe_serdaigle: {
    silhouette: { kind:"svg", file:"tiara.svg" },
    fills: { band:"#c9a84c", points:"#e0c46c", gem:"#244c9c", side:"#6ca8e0" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#c8dcff" },
      { kind:"orb_glow", region:"gem", color:"#8cb4ff" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  coupe_poufsouffle: {
    silhouette: { kind:"svg", file:"chalice.svg" },
    fills: { bowl:"#c9a84c", rim:"#e0c46c", stem:"#b09040", foot:"#a08038", gem:"#d8a82c" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#ffe090" },
      { kind:"orb_glow", region:"gem", color:"#f0c864" },
      { kind:"emboss", region:"bowl", color:"#78541c" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  retourneur_temps: {
    silhouette: { kind:"svg", file:"hourglass.svg" },
    fills: { frame:"#c9a84c", glass:"#dce0ec", sand_top:"#f0c448", sand_bot:"#d8a82c" },
    accents: [
      { kind:"orb_glow", region:"sand_top", color:"#ffe090" },
      { kind:"gem_facet_shine", region:"glass", color:"#f0f4ff" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  mandragore: {
    silhouette: { kind:"svg", file:"mandragore.svg" },
    fills: { leaves:"#50843c", root:"#c8a87c", face:"#543820", tendrils:"#ac8c60" },
    accents: [
      { kind:"emboss", region:"root", color:"#7c5c38" },
      { kind:"emboss", region:"leaves", color:"#284c18" }
    ],
    rarity:"common", material:"matte"
  },

  choco_sorcier: {
    silhouette: { kind:"svg", file:"choco-bar.svg" },
    fills: { wrapper:"#ac3c30", bar:"#583420", cube:"#382014", accent:"#d8b860" },
    accents: [
      { kind:"emboss", region:"bar", color:"#20140c" }
    ],
    rarity:"common", material:"matte"
  }
};

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

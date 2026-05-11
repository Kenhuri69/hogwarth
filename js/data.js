// ============================================================
// CONSTANTES DE CARTE
// ============================================================
const MAP_W = 12, MAP_H = 12;
const CELL = { WALL:0, FLOOR:1, DOOR:2, STAIRS_D:3, STAIRS_U:4, SHOP:5, CHEST:6, FOUNTAIN:7, NPC:8 };

// Vecteurs de déplacement par direction cardinale (N, S, E, O).
// Indexé par playerDir / cellule cible.
const DIRECTIONS = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };

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
  { id:"felix", name:"Félix Felicis", icon:"✨", desc:"+20 PV +10 PM", type:"consumable", effect:"both", power:20, price:80 },
  { id:"mandragore", name:"Racine de Mandragore", icon:"🌿", desc:"+8 PV", type:"consumable", effect:"heal", power:8, price:15 },
  { id:"wand1",   name:"Baguette de Saule",   icon:"🪄", desc:"ATK+2",                      type:"wand",  slot:"wand",   family:"wand_basic",    rarity:"common", power:2, bonusAtk:2,                                price:120, tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_basic", tint:"willow" },
  { id:"wand2",   name:"Baguette de Sureau",  icon:"🪄", desc:"ATK+5 MAG+3",                type:"wand",  slot:"wand",   family:"wand_elder",    rarity:"rare",   power:5, bonusAtk:5, bonusMag:3,                       price:300, tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_runic", tint:"elder"  },
  { id:"robe1",   name:"Robe Renforcée",      icon:"🧥", desc:"DEF+3",                      type:"armor", slot:"body",   family:"robe",          rarity:"common", power:3, bonusDef:3,                                    price:150 },
  { id:"amulette",name:"Amulette du Phénix",  icon:"💎", desc:"MAG+4 LCK+3 · Apprend Reparo", type:"acc", slot:"amulet", family:"amulet_phoenix",rarity:"epic",   power:4, bonusMag:4, bonusLck:3, grantsSpell:"Reparo", price:250 },
  { id:"broom",   name:"Balai Nimbus 2000",   icon:"🧹", desc:"Fuite garantie",             type:"acc",   slot:"trinket", family:"broom",        rarity:"rare",   power:0,                                                price:200 },
  // ── Objets légendaires des Maisons (non vendus, récompenses du système de Maison) ──
  { id:"sword_gryff",      name:"Épée de Gryffondor",   icon:"⚔️",  desc:"ATK+8 — Légendaire Gryffondor",    type:"wand",  slot:"wand",   family:"sword_gryff",   rarity:"legendary", power:8, bonusAtk:8,              price:0,  tinted:true, tintMask:"sword_blade_base", tintOverlay:"sword_hilt_gryff", tint:"silver" },
  { id:"locket_slytherin", name:"Médaillon de Serpentard",icon:"🐍", desc:"MAG+6 LCK+3 — Légendaire Serpentard", type:"acc", slot:"amulet", family:"locket_slyth",  rarity:"legendary", power:6, bonusMag:6, bonusLck:3, price:0 },
  { id:"diademe_serdaigle",name:"Diadème de Serdaigle", icon:"👑",  desc:"MAG+4 LCK+5 — Légendaire Serdaigle",  type:"acc", slot:"head",   family:"diademe_serd",  rarity:"legendary", power:4, bonusMag:4, bonusLck:5, price:0 },
  { id:"coupe_poufsouffle",name:"Coupe de Poufsouffle", icon:"🏆",  desc:"DEF+6 — Légendaire Poufsouffle",   type:"armor", slot:"body",   family:"coupe_pouf",    rarity:"legendary", power:6, bonusDef:6,              price:0 },
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
      { kind:"liquid",  region:"body", color:"#d94444", level:0.72, meniscus:true }
    ],
    rarity:"common", material:"glass"
  },

  felix: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#8c622e", body:"#d2bc8e" },
    accents: [
      { kind:"liquid",  region:"body", color:"#f0c448", level:0.80, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", color:"#ffe8a8", count:6 }
    ],
    rarity:"legendary", material:"glass", sparkles:true
  },

  wand2: {
    silhouette: { kind:"svg", file:"wizard-staff.svg" },
    fills: { shaft:"#4e3420", grip:"#362416", pommel:"#7a582a", gem:"#bedceb" },
    accents: [
      { kind:"runes",    region:"shaft", color:"#ebd796", count:5 },
      { kind:"orb_glow", region:"gem",   color:"#c8e6ff" }
    ],
    rarity:"rare", material:"wood"
  },

  anneau_runique: {
    silhouette: { kind:"shape", name:"ring_band",
                  params:{ radius:175, thickness:36, bezel:true, gem:true } },
    fills: { metal:"#c9a84c", gem:"#6096dc" },
    accents: [
      { kind:"runes",            region:"metal", color:"#503814", count:6, around:"ring" },
      { kind:"gem_facet_shine",  region:"gem",   color:"#dcebff" }
    ],
    rarity:"rare", material:"metal"
  },

  livre_sortileges: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#3a588a", pages:"#e4d2a8", spine:"#263c62", gilt:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#1e2e4c" }
    ],
    rarity:"common", material:"leather"
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

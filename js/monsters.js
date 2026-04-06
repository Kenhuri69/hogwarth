// ============================================================
// MONSTERS.JS — Registre complet des créatures
// ============================================================
// Ce fichier est le seul à modifier pour ajouter ou modifier des ennemis.
// Le moteur du jeu lit ce tableau et adapte automatiquement :
//   • la sélection par étage (minFloor / maxFloor)
//   • la fréquence d'apparition (weight)
//   • la mise à l'échelle des stats par étage (scale)
//   • les capacités spéciales utilisées en combat (abilities)
//   • les résistances et faiblesses aux sorts (resist / weak)
//   • les objets droppés à la victoire (drops)
//
// ── Description de chaque propriété ────────────────────────
//
//  id        {string}   Identifiant unique, sans espaces ni accents
//  name      {string}   Nom affiché en jeu
//  icon      {string}   Emoji affiché en combat
//  category  {string}   "bête" | "humain" | "fantôme" | "créature" | "être magique"
//  desc      {string}   Message d'apparition affiché dans le log de combat
//  lore      {string}   Texte de lore (futur écran de bestiaire)
//
//  minFloor  {number}   Étage minimum d'apparition (1 = dès le début)
//  maxFloor  {number|null}  Étage maximum (null = apparaît jusqu'au dernier étage)
//  weight    {number}   Fréquence de tirage — 10 = commun, 5 = rare, 2 = très rare
//
//  hp        {number}   Points de vie de base (avant mise à l'échelle)
//  atk       {number}   Attaque physique de base
//  def       {number}   Défense physique de base
//  mag       {number}   Puissance magique (utilisée par les capacités)
//  agi       {number}   Agilité
//  lck       {number}   Chance
//  scale     {number}   Coefficient de progression : stat × (1 + (étage−1) × scale)
//                       Exemples : 0.15 = progression lente, 0.35 = progression rapide
//
//  abilities [{...}]    Capacités spéciales ([] = aucune, attaque physique uniquement)
//    .name   {string}   Nom affiché dans le log
//    .icon   {string}   Emoji de la capacité
//    .desc   {string}   Description courte
//    .effect {string}   "damage"  → dégâts magiques directs (power + mag/2)
//                       "heal"    → l'ennemi se soigne de power PV
//                       "weaken"  → réduit la DEF de la cible de power (permanent ce combat)
//                       "drain"   → draine power PV de la cible et s'en soigne à moitié
//    .power  {number}   Valeur de base de l'effet
//    .chance {number}   Probabilité d'utilisation à chaque tour (0.0 à 1.0)
//
//  ai        {string}   Comportement en combat (utilisé pour évolutions futures) :
//                       "aggressive" | "cautious" | "random"
//
//  resist    [string]   Sorts atténués de 50% sur cet ennemi :
//                       "stun" | "burn" | "disarm" | "instant"
//  weak      [string]   Sorts amplifiés de 50% sur cet ennemi (mêmes valeurs)
//
//  xp        {number}   XP de base accordée (avant mise à l'échelle)
//  gold      {number | {min, max}}
//                       Or de base. Peut être un nombre fixe ou un intervalle aléatoire.
//  drops     [{itemId, chance}]
//                       Objets potentiellement droppés après combat.
//                       Chaque entrée est tirée indépendamment.
//    .itemId {string}   ID de l'objet (voir ITEMS dans data.js)
//    .chance {number}   Probabilité de drop (0.0 à 1.0 — ex: 0.15 = 15%)
//
// ────────────────────────────────────────────────────────────
// Pour ajouter un monstre : copiez le TEMPLATE EN BAS DE CE FICHIER
// ============================================================

const MONSTERS = [

  // ════════════════════════════════════════════
  // ÉTAGES 1-3 : Les Couloirs Supérieurs
  // ════════════════════════════════════════════

  {
    id:       "chat_norris",
    name:     "Chat de Mme Norris",
    icon:     "🐱",
    category: "bête",
    desc:     "Les yeux pâles de Mme Norris vous fixent dans l'obscurité",
    lore:     "La fidèle alliée d'Argus Rusard patrouille les couloirs la nuit. Si elle vous voit, Rusard ne tardera pas.",
    minFloor: 1, maxFloor: 2, weight: 8,
    hp: 10, atk: 2, def: 1, mag: 0, agi: 18, lck: 12,
    scale: 0.15,
    abilities: [],
    ai: "cautious",
    resist: [],
    weak:   ["burn"],
    xp: 5, gold: { min: 0, max: 3 },
    drops:  []
  },

  {
    id:       "peeves",
    name:     "Peeve le Poltergeist",
    icon:     "👻",
    category: "fantôme",
    desc:     "Le poltergeist tourbillonne en ricanant, prêt à tout casser",
    lore:     "Peeve hante Poudlard depuis des siècles. Il prend un malin plaisir à tourmenter les élèves.",
    minFloor: 1, maxFloor: 4, weight: 12,
    hp: 14, atk: 3, def: 0, mag: 4, agi: 16, lck: 10,
    scale: 0.20,
    abilities: [
      { name: "Rire Tonitruant", icon: "😂", desc: "Déstabilise la cible", effect: "weaken", power: 1, chance: 0.30 }
    ],
    ai: "random",
    resist: ["stun", "disarm"],
    weak:   [],
    xp: 8, gold: { min: 2, max: 6 },
    drops:  [{ itemId: "mandragore", chance: 0.10 }]
  },

  {
    id:       "myrtle",
    name:     "Mimi Geignarde",
    icon:     "💧",
    category: "fantôme",
    desc:     "Le fantôme d'une élève vous attaque en sanglotant bruyamment",
    lore:     "Mimi Geignarde hante les toilettes du deuxième étage depuis sa mort. Son cri perçant peut vous paralyser.",
    minFloor: 1, maxFloor: 3, weight: 6,
    hp: 12, atk: 2, def: 0, mag: 6, agi: 12, lck: 6,
    scale: 0.18,
    abilities: [
      { name: "Plainte Stridente", icon: "😭", desc: "Cri perçant qui affaiblit", effect: "weaken", power: 2, chance: 0.35 }
    ],
    ai: "random",
    resist: ["stun", "disarm", "burn"],
    weak:   [],
    xp: 6, gold: { min: 0, max: 4 },
    drops:  []
  },

  {
    id:       "serpent_cachot",
    name:     "Serpent des Cachots",
    icon:     "🐍",
    category: "bête",
    desc:     "Un serpent venimeux surgit de l'ombre avec un sifflement",
    lore:     "Les cachots de Poudlard abritent des serpents qui répondent parfois au Fourchelang.",
    minFloor: 1, maxFloor: 5, weight: 10,
    hp: 20, atk: 5, def: 2, mag: 0, agi: 13, lck: 8,
    scale: 0.25,
    abilities: [
      { name: "Morsure Venimeuse", icon: "☠️", desc: "Draine la vitalité", effect: "drain", power: 4, chance: 0.30 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["burn"],
    xp: 12, gold: { min: 5, max: 10 },
    drops:  [{ itemId: "potion_s", chance: 0.08 }]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 2-6 : Les Profondeurs du Château
  // ════════════════════════════════════════════

  {
    id:       "gobelin",
    name:     "Gobelin Rebelle",
    icon:     "👺",
    category: "humain",
    desc:     "Un gobelin en colère agite son épée courbe",
    lore:     "Certains gobelins de Gringotts ont rejoint les forces de Voldemort. Ils gardent les couloirs les plus sombres.",
    minFloor: 2, maxFloor: 6, weight: 9,
    hp: 22, atk: 7, def: 3, mag: 2, agi: 11, lck: 9,
    scale: 0.25,
    abilities: [],
    ai: "aggressive",
    resist: [],
    weak:   ["stun"],
    xp: 18, gold: { min: 10, max: 22 },
    drops:  [
      { itemId: "mandragore", chance: 0.20 },
      { itemId: "potion_s",   chance: 0.08 }
    ]
  },

  {
    id:       "araignee",
    name:     "Araignée Géante",
    icon:     "🕷️",
    category: "bête",
    desc:     "Une araignée monstrueuse descend du plafond sur sa toile",
    lore:     "Les descendants d'Aragog peuplent la Forêt Interdite et s'infiltrent parfois dans le château.",
    minFloor: 2, maxFloor: 7, weight: 9,
    hp: 18, atk: 6, def: 2, mag: 0, agi: 14, lck: 7,
    scale: 0.25,
    abilities: [
      { name: "Toile Collante", icon: "🕸️", desc: "Immobilise et affaiblit", effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["burn"],
    xp: 14, gold: { min: 6, max: 12 },
    drops:  [{ itemId: "mandragore", chance: 0.15 }]
  },

  {
    id:       "troll",
    name:     "Troll des Toilettes",
    icon:     "🦕",
    category: "créature",
    desc:     "Un troll nauséabond barre le passage en grognant",
    lore:     "Un cousin du troll lâché par Quirinus Quirrell lors de la fête d'Halloween. Brutal et lent.",
    minFloor: 3, maxFloor: 7, weight: 7,
    hp: 35, atk: 9, def: 5, mag: 0, agi: 6, lck: 5,
    scale: 0.28,
    abilities: [
      { name: "Coup de Massue", icon: "🪨", desc: "Frappe dévastatrice", effect: "damage", power: 8, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: ["stun"],
    weak:   [],
    xp: 20, gold: { min: 12, max: 18 },
    drops:  [
      { itemId: "potion_s", chance: 0.20 },
      { itemId: "robe1",    chance: 0.05 }
    ]
  },

  {
    id:       "centaure",
    name:     "Centaure Hostile",
    icon:     "🏹",
    category: "créature",
    desc:     "Un centaure de la forêt vous barre le chemin, arc tendu",
    lore:     "Tous les centaures ne sont pas bienveillants. Celui-ci n'apprécie pas les intrus dans son territoire.",
    minFloor: 3, maxFloor: 7, weight: 6,
    hp: 30, atk: 8, def: 4, mag: 5, agi: 13, lck: 10,
    scale: 0.25,
    abilities: [
      { name: "Flèche Enchantée", icon: "✨", desc: "Flèche imprégnée de magie", effect: "damage", power: 7, chance: 0.30 }
    ],
    ai: "cautious",
    resist: [],
    weak:   [],
    xp: 22, gold: { min: 10, max: 18 },
    drops:  [{ itemId: "potion_s", chance: 0.10 }]
  },

  {
    id:       "detraqueur",
    name:     "Détraqueur",
    icon:     "🌑",
    category: "être magique",
    desc:     "Un Détraqueur aspire toute joie et tout espoir autour de vous",
    lore:     "Créature de l'obscurité, le Détraqueur force ses victimes à revivre leurs pires souvenirs. Seul un Patronus peut le repousser.",
    minFloor: 3, maxFloor: 8, weight: 7,
    hp: 25, atk: 10, def: 3, mag: 8, agi: 10, lck: 6,
    scale: 0.30,
    abilities: [
      { name: "Baiser du Détraqueur", icon: "💀", desc: "Draine l'âme de la cible", effect: "drain", power: 10, chance: 0.35 }
    ],
    ai: "cautious",
    resist: ["burn", "stun", "disarm"],
    weak:   [],
    xp: 25, gold: { min: 8, max: 14 },
    drops:  [{ itemId: "potion_m", chance: 0.12 }]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 4-8 : Le Donjon Profond
  // ════════════════════════════════════════════

  {
    id:       "loup_garou",
    name:     "Loup-Garou Enragé",
    icon:     "🐺",
    category: "créature",
    desc:     "La pleine lune a transformé ce sorcier en bête sauvage",
    lore:     "Transformé par la lycanthropie, il n'a plus conscience de lui-même. Ses griffes déchirent tout.",
    minFloor: 4, maxFloor: 9, weight: 6,
    hp: 45, atk: 15, def: 5, mag: 0, agi: 15, lck: 7,
    scale: 0.28,
    abilities: [
      { name: "Griffes Tranchantes", icon: "🔪", desc: "Attaque puissante", effect: "damage", power: 8, chance: 0.30 },
      { name: "Hurlement Terrifiant", icon: "🌕", desc: "Affaiblit la défense", effect: "weaken", power: 2, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["burn"],
    xp: 45, gold: { min: 14, max: 22 },
    drops:  [
      { itemId: "mandragore", chance: 0.25 },
      { itemId: "potion_s",   chance: 0.12 }
    ]
  },

  {
    id:       "mangemort",
    name:     "Mangemort Masqué",
    icon:     "💀",
    category: "humain",
    desc:     "Un Mangemort vous vise de sa baguette noire en murmurant des sortilèges",
    lore:     "Serviteur de Lord Voldemort, reconnaissable à son masque blanc et la Marque des Ténèbres sur son bras.",
    minFloor: 5, maxFloor: null, weight: 8,
    hp: 40, atk: 12, def: 6, mag: 10, agi: 10, lck: 8,
    scale: 0.30,
    abilities: [
      { name: "Sortilège des Ténèbres", icon: "🟣", desc: "Magie noire concentrée", effect: "damage", power: 12, chance: 0.40 },
      { name: "Expelliarmus Sombre",    icon: "⚡", desc: "Affaiblit les défenses",  effect: "weaken", power: 2,  chance: 0.20 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["stun"],
    xp: 40, gold: { min: 20, max: 30 },
    drops:  [
      { itemId: "potion_s", chance: 0.25 },
      { itemId: "potion_m", chance: 0.15 },
      { itemId: "wand1",    chance: 0.05 }
    ]
  },

  {
    id:       "sorcier_renegat",
    name:     "Sorcier Renégat",
    icon:     "🧙‍♂️",
    category: "humain",
    desc:     "Un sorcier passé du côté des Ténèbres vous affronte avec une haine froide",
    lore:     "Élève autrefois prometteur de Serpentard, il a succombé aux promesses de Voldemort. Il se soigne en combat.",
    minFloor: 5, maxFloor: null, weight: 7,
    hp: 35, atk: 10, def: 5, mag: 12, agi: 11, lck: 9,
    scale: 0.28,
    abilities: [
      { name: "Stupefix Noir",  icon: "⚡", desc: "Sort d'étourdissement", effect: "damage", power: 8,  chance: 0.30 },
      { name: "Soins des Ténèbres", icon: "💚", desc: "Se soigne par magie sombre", effect: "heal", power: 12, chance: 0.25 }
    ],
    ai: "cautious",
    resist: [],
    weak:   [],
    xp: 35, gold: { min: 18, max: 28 },
    drops:  [
      { itemId: "potion_m", chance: 0.20 },
      { itemId: "wand1",    chance: 0.08 }
    ]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 6-10 : Les Abysses de Poudlard
  // ════════════════════════════════════════════

  {
    id:       "basilic",
    name:     "Basilic Mineur",
    icon:     "🐉",
    category: "être magique",
    desc:     "Un jeune basilic surgit — ne croisez pas son regard !",
    lore:     "Créature de Salazar Serpentard, le basilic peut tuer d'un regard direct. Seul un reflet ou le cri du coq peut le vaincre.",
    minFloor: 6, maxFloor: null, weight: 4,
    hp: 60, atk: 20, def: 8, mag: 12, agi: 8, lck: 10,
    scale: 0.35,
    abilities: [
      { name: "Regard Pétrifiant", icon: "👁️", desc: "Draine la vitalité par son regard", effect: "drain",  power: 14, chance: 0.35 },
      { name: "Morsure du Roi",    icon: "🐍", desc: "Morsure venimeuse mortelle",       effect: "damage", power: 16, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: ["stun", "disarm", "burn"],
    weak:   [],
    xp: 80, gold: { min: 35, max: 50 },
    drops:  [
      { itemId: "felix",    chance: 0.15 },
      { itemId: "amulette", chance: 0.05 },
      { itemId: "potion_s", chance: 0.30 }
    ]
  },

  {
    id:       "nagini",
    name:     "Nagini",
    icon:     "🐲",
    category: "être magique",
    desc:     "Un serpent-horcruxe d'une puissance terrifiante se dresse devant vous",
    lore:     "Fragment de l'âme de Voldemort, Nagini possède une intelligence maléfique et une régénération surnaturelle.",
    minFloor: 7, maxFloor: null, weight: 3,
    hp: 55, atk: 18, def: 7, mag: 15, agi: 12, lck: 8,
    scale: 0.32,
    abilities: [
      { name: "Morsure Horcruxe",      icon: "💀", desc: "Draine l'énergie vitale",   effect: "drain", power: 12, chance: 0.40 },
      { name: "Régénération Sombre",   icon: "🟢", desc: "Récupère des PV",            effect: "heal",  power: 15, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["disarm", "stun"],
    weak:   ["burn"],
    xp: 70, gold: { min: 30, max: 45 },
    drops:  [
      { itemId: "wand2",    chance: 0.08 },
      { itemId: "potion_s", chance: 0.25 }
    ]
  },

  {
    id:       "voldemort_affaibli",
    name:     "Voldemort Affaibli",
    icon:     "🩻",
    category: "être magique",
    desc:     "Une forme spectrale de Lord Voldemort se dresse devant vous",
    lore:     "Sans corps ni horcrux, Voldemort subsiste à peine. Mais même réduit à l'état de spectre, il reste d'une dangerosité absolue.",
    minFloor: 9, maxFloor: null, weight: 2,
    hp: 80, atk: 22, def: 10, mag: 20, agi: 8, lck: 15,
    scale: 0.40,
    abilities: [
      { name: "Avada Kedavra",  icon: "💚", desc: "Sort de la mort",               effect: "damage", power: 30, chance: 0.30 },
      { name: "Cruciatus",      icon: "⚡", desc: "Sort de torture",                effect: "drain",  power: 18, chance: 0.25 },
      { name: "Ombre Tenace",   icon: "🌑", desc: "Récupère de l'énergie obscure", effect: "heal",   power: 20, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: ["disarm", "stun", "burn"],
    weak:   [],
    xp: 200, gold: { min: 80, max: 120 },
    drops:  [
      { itemId: "felix",    chance: 0.50 },
      { itemId: "wand2",    chance: 0.25 },
      { itemId: "amulette", chance: 0.20 }
    ]
  },

];

// ════════════════════════════════════════════
// TEMPLATE — Copier-coller pour ajouter un monstre
// ════════════════════════════════════════════
//
// {
//   id:       "mon_monstre",
//   name:     "Nom du Monstre",
//   icon:     "🐾",
//   category: "bête",            // bête | humain | fantôme | créature | être magique
//   desc:     "Description courte affichée au début du combat.",
//   lore:     "Texte de lore plus long pour le bestiaire.",
//   minFloor: 1, maxFloor: 5, weight: 8,
//   hp: 20, atk: 5, def: 2, mag: 0, agi: 10, lck: 8,
//   scale: 0.25,
//   abilities: [
//     { name: "Nom Capacité", icon: "💥", desc: "Description",
//       effect: "damage",    // damage | heal | weaken | drain
//       power: 8, chance: 0.30 }
//   ],
//   ai: "aggressive",            // aggressive | cautious | random
//   resist: [],                  // stun | burn | disarm | instant
//   weak:   ["burn"],
//   xp: 15, gold: { min: 5, max: 15 },
//   drops: [
//     { itemId: "mandragore", chance: 0.15 },
//     { itemId: "potion_s",   chance: 0.08 }
//   ]
// },

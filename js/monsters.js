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
    id:       "luciole_marais",
    name:     "Luciole des Marais",
    icon:     "✨",
    category: "bête",
    desc:     "Une nuée de lucioles ensorcelées surgit en tourbillonnant",
    lore:     "Ces petites créatures lumineuses des marais de Poudlard sont inoffensives en apparence, mais leurs flashs aveuglants peuvent désorienter n'importe quel sorcier.",
    minFloor: 1, maxFloor: 3, weight: 9,
    hp: 8, atk: 1, def: 0, mag: 3, agi: 20, lck: 14,
    scale: 0.15,
    abilities: [
      { name: "Éclair Aveuglant", icon: "💡", desc: "Flash lumineux qui perturbe la vision", effect: "weaken", power: 1, chance: 0.35 }
    ],
    ai: "random",
    resist: [],
    weak:   ["stun"],
    xp: 4, gold: { min: 0, max: 2 },
    drops:  []
  },

  {
    id:       "cornichon",
    name:     "Cornichon de Cornouailles",
    icon:     "🫐",
    category: "créature",
    desc:     "Une nuée de Cornichons bleus électriques fondent sur vous en criant !",
    lore:     "Ces petites créatures turbulentes du cours de Gilderoy Lockhart ont envahi les couloirs. Elles adorent pincer et tirer les cheveux.",
    minFloor: 1, maxFloor: 3, weight: 10,
    hp: 12, atk: 3, def: 1, mag: 0, agi: 17, lck: 10,
    scale: 0.18,
    abilities: [
      { name: "Pincement en Masse", icon: "🤏", desc: "Attaque par dizaines à la fois", effect: "weaken", power: 2, chance: 0.30 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["stun"],
    xp: 6, gold: { min: 1, max: 4 },
    drops:  [{ itemId: "mandragore", chance: 0.10 }]
  },

  {
    id:       "portrait_hostile",
    name:     "Portrait Animé Hostile",
    icon:     "🖼️",
    category: "fantôme",
    desc:     "Le portrait d'un ancien élève de Serpentard s'anime et vous maudit !",
    lore:     "Certains portraits des couloirs ont été ensorcelés par des sympathisants de Voldemort. Ils lancent des malédictions sur les passants indésirables.",
    minFloor: 1, maxFloor: 4, weight: 7,
    hp: 10, atk: 0, def: 0, mag: 7, agi: 5, lck: 8,
    scale: 0.18,
    abilities: [
      { name: "Malédiction Murale",   icon: "🎨", desc: "Sort lancé depuis le cadre", effect: "damage", power: 6, chance: 0.50 },
      { name: "Insulte Démoralisante",icon: "😤", desc: "Affaiblit la volonté",       effect: "weaken", power: 2, chance: 0.25 }
    ],
    ai: "random",
    resist: ["stun", "disarm", "burn"],
    weak:   [],
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
    id:       "chouette_envoutee",
    name:     "Chouette Ensorcelée",
    icon:     "🦉",
    category: "bête",
    desc:     "Une chouette aux yeux rouges fond sur vous en poussant un cri strident",
    lore:     "Ces chouettes autrefois paisibles ont été ensorcelées par des Mangemorts pour espionner le château. Leurs serres transmettent une magie corrompue.",
    minFloor: 2, maxFloor: 4, weight: 8,
    hp: 14, atk: 4, def: 1, mag: 2, agi: 16, lck: 10,
    scale: 0.20,
    abilities: [
      { name: "Plongeon en Piqué", icon: "🦅", desc: "Attaque fulgurante", effect: "damage", power: 4, chance: 0.35 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["stun"],
    xp: 9, gold: { min: 2, max: 7 },
    drops:  []
  },

  {
    id:       "mandragore_sauvage",
    name:     "Mandragore Sauvage",
    icon:     "🌿",
    category: "créature",
    desc:     "Une Mandragore arrachée à la terre pousse un cri à vous glacer le sang !",
    lore:     "Les Mandragores sauvages qui ont poussé sans surveillance dans les serres abandonnées ont développé une agressivité redoutable. Leur cri peut vous assommer instantanément.",
    minFloor: 2, maxFloor: 5, weight: 7,
    hp: 24, atk: 5, def: 4, mag: 5, agi: 7, lck: 6,
    scale: 0.22,
    abilities: [
      { name: "Cri Paralysant",    icon: "📣", desc: "Cri qui désorganise les sens",   effect: "weaken", power: 3, chance: 0.40 },
      { name: "Racines Étranglantes", icon: "🌱", desc: "Immobilise et draine",        effect: "drain",  power: 5, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: ["burn"],
    weak:   [],
    xp: 15, gold: { min: 5, max: 12 },
    drops:  [{ itemId: "mandragore", chance: 0.35 }]
  },

  {
    id:       "kappa_douves",
    name:     "Kappa des Douves",
    icon:     "🐢",
    category: "être magique",
    desc:     "Un Kappa surgit des douves obscures avec des griffes tranchantes comme des lames",
    lore:     "Ces créatures aquatiques d'origine japonaise se sont installées dans les douves du château. Ils préfèrent noyer leurs victimes pour absorber leur force vitale.",
    minFloor: 2, maxFloor: 6, weight: 7,
    hp: 28, atk: 7, def: 5, mag: 3, agi: 9, lck: 7,
    scale: 0.22,
    abilities: [
      { name: "Saisie des Eaux",  icon: "💧", desc: "Draine la force vitale",    effect: "drain",  power: 6, chance: 0.30 },
      { name: "Griffes d'Écaille", icon: "🦀", desc: "Griffes acérées sous l'eau", effect: "damage", power: 5, chance: 0.25 }
    ],
    ai: "cautious",
    resist: [],
    weak:   ["burn"],
    xp: 20, gold: { min: 8, max: 15 },
    drops:  [{ itemId: "potion_s", chance: 0.12 }]
  },

  {
    id:       "boggart",
    name:     "Épouvantard",
    icon:     "🌫️",
    category: "être magique",
    desc:     "L'Épouvantard prend la forme de votre pire cauchemar !",
    lore:     "L'Épouvantard est une créature sans forme propre qui prend l'apparence de ce que vous craignez le plus. Seul le sort Riddikulus peut le repousser en faisant rire.",
    minFloor: 2, maxFloor: 6, weight: 8,
    hp: 20, atk: 6, def: 2, mag: 9, agi: 13, lck: 8,
    scale: 0.22,
    abilities: [
      { name: "Forme Cauchemaresque", icon: "😱", desc: "Manifeste votre pire peur",  effect: "damage", power: 8, chance: 0.35 },
      { name: "Terreur Absolue",       icon: "🌑", desc: "Paralyse de frayeur",        effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "random",
    resist: ["stun", "disarm"],
    weak:   [],
    xp: 18, gold: { min: 6, max: 14 },
    drops:  []
  },

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

  // ════════════════════════════════════════════
  // ÉTAGES 3-7 : Les Passages Secrets
  // ════════════════════════════════════════════

  {
    id:       "bundimun",
    name:     "Bundimun Venimeux",
    icon:     "🦠",
    category: "créature",
    desc:     "Un Bundimun suinte une sécrétion verte corrosive et se jette sur vous",
    lore:     "Ces parasites magiques produisent une sécrétion qui dissout tous les matériaux organiques. Même les armures peuvent fondre sous leur acide magique.",
    minFloor: 3, maxFloor: 6, weight: 7,
    hp: 22, atk: 4, def: 6, mag: 4, agi: 6, lck: 5,
    scale: 0.22,
    abilities: [
      { name: "Sécrétion Corrosive", icon: "🧪", desc: "Acide magique qui ronge l'armure", effect: "drain",  power: 6, chance: 0.35 },
      { name: "Multiplication",       icon: "✂️", desc: "Se divise pour attaquer",          effect: "damage", power: 4, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["burn"],
    weak:   [],
    xp: 14, gold: { min: 5, max: 10 },
    drops:  []
  },

  {
    id:       "homme_araignee",
    name:     "Homme-Araignée Acromantule",
    icon:     "🕸️",
    category: "créature",
    desc:     "Un chasseur à mi-chemin entre l'humain et l'araignée géante surgit de l'obscurité",
    lore:     "Né d'une expérience magique interdite, cet hybride possède la ruse d'un sorcier et la cruauté d'une araignée. Il tisse des pièges dans les couloirs.",
    minFloor: 3, maxFloor: 7, weight: 6,
    hp: 26, atk: 9, def: 3, mag: 6, agi: 14, lck: 8,
    scale: 0.25,
    abilities: [
      { name: "Crochets Venimeux", icon: "☠️", desc: "Morsure qui draine la vie", effect: "drain",  power: 7, chance: 0.30 },
      { name: "Toile Lourde",      icon: "🕷️", desc: "Emprisonne et affaiblit",   effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["burn"],
    xp: 22, gold: { min: 10, max: 18 },
    drops:  [{ itemId: "mandragore", chance: 0.20 }]
  },

  {
    id:       "meduse_noire",
    name:     "Méduse Noire des Profondeurs",
    icon:     "🪼",
    category: "créature",
    desc:     "Une méduse noire translucide flotte dans l'air vicié du couloir",
    lore:     "Créature des lacs souterrains de Poudlard, cette méduse noire a développé la capacité de flotter dans l'air. Ses tentacules chargés de magie noire paralysent en un instant.",
    minFloor: 3, maxFloor: 7, weight: 6,
    hp: 30, atk: 6, def: 3, mag: 8, agi: 10, lck: 7,
    scale: 0.25,
    abilities: [
      { name: "Tentacules Électriques", icon: "⚡", desc: "Choc magique douloureux", effect: "damage", power: 7, chance: 0.35 },
      { name: "Venin Paralysant",        icon: "💜", desc: "Venin qui affaiblit",    effect: "weaken", power: 3, chance: 0.30 }
    ],
    ai: "cautious",
    resist: ["burn"],
    weak:   ["stun"],
    xp: 24, gold: { min: 8, max: 16 },
    drops:  [{ itemId: "potion_s", chance: 0.10 }]
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
  // ÉTAGES 4-9 : Le Donjon Profond
  // ════════════════════════════════════════════

  {
    id:       "hippogriffe_courroux",
    name:     "Hippogriffe en Furie",
    icon:     "🦅",
    category: "créature",
    desc:     "Un Hippogriffe déploie ses ailes et charge avec une rage terrifiante !",
    lore:     "Les Hippogriffes sont des créatures fières qui exigent le respect. Celui-ci a été blessé par des Mangemorts et attaque tout ce qui bouge.",
    minFloor: 4, maxFloor: 8, weight: 5,
    hp: 42, atk: 14, def: 6, mag: 0, agi: 15, lck: 9,
    scale: 0.28,
    abilities: [
      { name: "Serres du Griffon", icon: "🦅", desc: "Attaque féroce avec les serres",  effect: "damage", power: 10, chance: 0.35 },
      { name: "Charge Ailée",      icon: "💨", desc: "Charge en piqué dévastateur",      effect: "damage", power: 14, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["stun"],
    xp: 38, gold: { min: 16, max: 26 },
    drops:  [{ itemId: "potion_s", chance: 0.15 }]
  },

  {
    id:       "inferius",
    name:     "Inférius",
    icon:     "🧟",
    category: "créature",
    desc:     "Un cadavre réanimé par la magie noire se lève et avance vers vous !",
    lore:     "Les Inférises sont des corps de personnes mortes réanimées par un sorcier des Ténèbres. Ils n'ont ni âme ni volonté propre et ne craignent rien — sauf le feu.",
    minFloor: 4, maxFloor: 8, weight: 5,
    hp: 38, atk: 13, def: 7, mag: 0, agi: 7, lck: 4,
    scale: 0.28,
    abilities: [
      { name: "Étreinte Glaciale", icon: "🧊", desc: "Étreinte de mort qui draine la chaleur", effect: "drain",  power: 9, chance: 0.35 },
      { name: "Régénération Obscure", icon: "💀", desc: "Se réanime partiellement",             effect: "heal",   power: 8, chance: 0.15 }
    ],
    ai: "aggressive",
    resist: ["stun", "disarm"],
    weak:   ["burn"],
    xp: 35, gold: { min: 12, max: 20 },
    drops:  []
  },

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
      { name: "Griffes Tranchantes",   icon: "🔪", desc: "Attaque puissante",       effect: "damage", power: 8, chance: 0.30 },
      { name: "Hurlement Terrifiant",  icon: "🌕", desc: "Affaiblit la défense",    effect: "weaken", power: 2, chance: 0.20 }
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
    id:       "sorciere_tenebres",
    name:     "Sorcière des Ténèbres",
    icon:     "🧙‍♀️",
    category: "humain",
    desc:     "Une sorcière en robes noires ricane et lève sa baguette vers vous",
    lore:     "Adepte des arts noirs depuis l'enfance, elle a offert son âme à Voldemort en échange de pouvoirs redoutables. Elle maîtrise guérison et destruction.",
    minFloor: 4, maxFloor: 9, weight: 6,
    hp: 36, atk: 8, def: 4, mag: 13, agi: 11, lck: 9,
    scale: 0.28,
    abilities: [
      { name: "Maléfice des Ombres",    icon: "🟣", desc: "Magie noire concentrée",   effect: "damage", power: 11, chance: 0.35 },
      { name: "Soins des Ténèbres",     icon: "💚", desc: "Se soigne par magie sombre",effect: "heal",   power: 12, chance: 0.25 },
      { name: "Affaiblissement Sombre", icon: "⚫", desc: "Réduit les défenses",       effect: "weaken", power: 2,  chance: 0.20 }
    ],
    ai: "cautious",
    resist: [],
    weak:   ["stun"],
    xp: 36, gold: { min: 16, max: 26 },
    drops:  [
      { itemId: "potion_m", chance: 0.15 },
      { itemId: "wand1",    chance: 0.08 }
    ]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 5-9 : Les Abîmes du Château
  // ════════════════════════════════════════════

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
    id:       "acromantula_jeune",
    name:     "Jeune Acromantule",
    icon:     "🕷️",
    category: "créature",
    desc:     "Une jeune Acromantule agite ses huit yeux noirs et fonce sur vous !",
    lore:     "Descendant direct d'Aragog, ce jeune spécimen n'a pas encore atteint sa taille adulte — mais ses crocs venimeux sont déjà mortels.",
    minFloor: 5, maxFloor: 9, weight: 5,
    hp: 48, atk: 16, def: 6, mag: 0, agi: 13, lck: 6,
    scale: 0.30,
    abilities: [
      { name: "Crocs Venimeux",  icon: "☠️", desc: "Morsure qui draine la vitalité", effect: "drain",  power: 10, chance: 0.35 },
      { name: "Toile Géante",    icon: "🕸️", desc: "Emprisonne complètement",         effect: "weaken", power: 4,  chance: 0.25 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["burn"],
    xp: 48, gold: { min: 18, max: 28 },
    drops:  [
      { itemId: "potion_s", chance: 0.20 },
      { itemId: "potion_m", chance: 0.08 }
    ]
  },

  {
    id:       "dementor_garde",
    name:     "Détraqueur Gardien",
    icon:     "🌑",
    category: "être magique",
    desc:     "Un Détraqueur en faction se lève — la température chute à zéro !",
    lore:     "Les Détraqueurs gardiens sont plus anciens et plus puissants que ceux qui patrouillent habituellement. Ils ont absorbé des milliers d'âmes et irradient le désespoir.",
    minFloor: 5, maxFloor: null, weight: 5,
    hp: 45, atk: 14, def: 5, mag: 14, agi: 10, lck: 6,
    scale: 0.30,
    abilities: [
      { name: "Baiser Glacial",   icon: "💀", desc: "Draine l'âme profondément",    effect: "drain",  power: 14, chance: 0.35 },
      { name: "Aura de Désespoir",icon: "🌑", desc: "Affaiblit toute résistance",   effect: "weaken", power: 4,  chance: 0.25 },
      { name: "Cri de Terreur",   icon: "😱", desc: "Sort de désespoir pur",        effect: "damage", power: 10, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["burn", "stun", "disarm"],
    weak:   [],
    xp: 55, gold: { min: 20, max: 32 },
    drops:  [{ itemId: "potion_m", chance: 0.15 }]
  },

  {
    id:       "troll_grotte",
    name:     "Troll des Cavernes",
    icon:     "🗿",
    category: "créature",
    desc:     "Un Troll des cavernes énorme fait trembler le sol à chaque pas",
    lore:     "Les Trolls des cavernes sont bien plus imposants que leurs cousins des toilettes. Leur peau calcifiée dévie la plupart des sorts et leurs coups peuvent briser la roche.",
    minFloor: 5, maxFloor: 9, weight: 5,
    hp: 55, atk: 17, def: 9, mag: 0, agi: 5, lck: 4,
    scale: 0.28,
    abilities: [
      { name: "Smash Dévastateur", icon: "🪨", desc: "Frappe de masse titanesque",   effect: "damage", power: 15, chance: 0.30 },
      { name: "Coup de Tête",      icon: "💥", desc: "Charge brutale",                effect: "damage", power: 10, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: ["stun", "burn"],
    weak:   [],
    xp: 50, gold: { min: 20, max: 32 },
    drops:  [
      { itemId: "potion_m", chance: 0.20 },
      { itemId: "robe1",    chance: 0.05 }
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
      { name: "Stupefix Noir",       icon: "⚡", desc: "Sort d'étourdissement",       effect: "damage", power: 8,  chance: 0.30 },
      { name: "Soins des Ténèbres",  icon: "💚", desc: "Se soigne par magie sombre",  effect: "heal",   power: 12, chance: 0.25 }
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
      { name: "Morsure du Roi",    icon: "🐍", desc: "Morsure venimeuse mortelle",         effect: "damage", power: 16, chance: 0.25 }
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
    id:       "chimere",
    name:     "Chimère de Poudlard",
    icon:     "🦁",
    category: "créature",
    desc:     "La Chimère rugit de ses trois têtes et crache des flammes !",
    lore:     "Créature mythologique rarissime possédant une tête de lion, une de chèvre et une queue-serpent. Elle n'a été vaincue qu'une seule fois dans l'histoire des sorciers.",
    minFloor: 6, maxFloor: null, weight: 3,
    hp: 65, atk: 19, def: 9, mag: 8, agi: 10, lck: 8,
    scale: 0.32,
    abilities: [
      { name: "Souffle de Feu",    icon: "🔥", desc: "Flammes dévastatrices",          effect: "damage", power: 14, chance: 0.30 },
      { name: "Morsure du Lion",   icon: "🦁", desc: "Morsure puissante",               effect: "damage", power: 12, chance: 0.25 },
      { name: "Charge de Chèvre",  icon: "🐐", desc: "Coup de cornes qui affaiblit",   effect: "weaken", power: 4,  chance: 0.20 }
    ],
    ai: "aggressive",
    resist: ["burn"],
    weak:   ["stun"],
    xp: 75, gold: { min: 30, max: 48 },
    drops:  [
      { itemId: "potion_m", chance: 0.20 },
      { itemId: "felix",    chance: 0.08 }
    ]
  },

  {
    id:       "ombre_quirrell",
    name:     "Ombre de Quirrell",
    icon:     "🎭",
    category: "être magique",
    desc:     "L'ombre de Quirinus Quirrell surgit, portant Voldemort sous son turban !",
    lore:     "Avant d'être démasqué, Quirinus Quirrell portait Voldemort sous son turban. Son ombre hante encore les couloirs de Poudlard, cherchant la Pierre Philosophale.",
    minFloor: 6, maxFloor: null, weight: 3,
    hp: 50, atk: 12, def: 4, mag: 16, agi: 10, lck: 8,
    scale: 0.32,
    abilities: [
      { name: "Magie Partagée",    icon: "🟣", desc: "Deux esprits en un seul corps",  effect: "damage", power: 13, chance: 0.35 },
      { name: "Possession Obscure",icon: "🌑", desc: "Draine la volonté",              effect: "drain",  power: 11, chance: 0.25 },
      { name: "Contre-Sort Rapide",icon: "💚", desc: "Récupère de l'énergie",          effect: "heal",   power: 14, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["disarm"],
    weak:   [],
    xp: 65, gold: { min: 28, max: 44 },
    drops:  [
      { itemId: "wand1",    chance: 0.10 },
      { itemId: "potion_m", chance: 0.20 }
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
      { name: "Morsure Horcruxe",    icon: "💀", desc: "Draine l'énergie vitale",  effect: "drain", power: 12, chance: 0.40 },
      { name: "Régénération Sombre", icon: "🟢", desc: "Récupère des PV",           effect: "heal",  power: 15, chance: 0.20 }
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

  // ════════════════════════════════════════════
  // ÉTAGES 7-10 : Les Territoires des Grands
  // ════════════════════════════════════════════

  {
    id:       "mangemort_elite",
    name:     "Mangemort d'Élite",
    icon:     "💀",
    category: "humain",
    desc:     "Un Mangemort d'élite en armure noire vous fixe avec mépris",
    lore:     "Les Mangemorts d'élite font partie du cercle rapproché de Voldemort. Leur maîtrise des arts noirs surpasse de loin celle d'un sorcier ordinaire.",
    minFloor: 7, maxFloor: null, weight: 4,
    hp: 55, atk: 16, def: 8, mag: 16, agi: 11, lck: 9,
    scale: 0.32,
    abilities: [
      { name: "Cruciatus Noir",      icon: "⚡", desc: "Sort de torture intense",     effect: "drain",  power: 14, chance: 0.30 },
      { name: "Magie Noire Pure",    icon: "🟣", desc: "Magie des ténèbres absolue",  effect: "damage", power: 15, chance: 0.35 },
      { name: "Expelliarmus Sombre", icon: "⚫", desc: "Désarme et affaiblit",         effect: "weaken", power: 3,  chance: 0.20 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["stun"],
    xp: 70, gold: { min: 28, max: 42 },
    drops:  [
      { itemId: "potion_m", chance: 0.25 },
      { itemId: "wand1",    chance: 0.10 },
      { itemId: "wand2",    chance: 0.05 }
    ]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 8-10 : Les Seigneurs des Ténèbres
  // ════════════════════════════════════════════

  {
    id:       "bellatrix",
    name:     "Bellatrix Lestrange",
    icon:     "🧙‍♀️",
    category: "humain",
    desc:     "Bellatrix Lestrange éclate d'un rire dément et brandit sa baguette !",
    lore:     "La plus fidèle des Mangemorts de Voldemort, Bellatrix Lestrange est une experte des sortilèges de la mort. Elle a conduit Neville Londubat à la folie avec ses tortures.",
    minFloor: 8, maxFloor: null, weight: 2,
    hp: 70, atk: 20, def: 8, mag: 20, agi: 13, lck: 12,
    scale: 0.35,
    abilities: [
      { name: "Avada Kedavra",       icon: "💚", desc: "Sort de la mort",               effect: "damage", power: 25, chance: 0.25 },
      { name: "Cruciatus Intense",   icon: "⚡", desc: "Sort de torture suprême",        effect: "drain",  power: 16, chance: 0.30 },
      { name: "Sonore Maudit",       icon: "📣", desc: "Cri de démence déstabilisant",  effect: "weaken", power: 4,  chance: 0.20 },
      { name: "Régénération Noire",  icon: "💜", desc: "Se soigne par passion pour les ténèbres", effect: "heal", power: 16, chance: 0.15 }
    ],
    ai: "aggressive",
    resist: ["stun", "disarm"],
    weak:   [],
    xp: 130, gold: { min: 50, max: 80 },
    drops:  [
      { itemId: "felix",    chance: 0.30 },
      { itemId: "wand2",    chance: 0.15 },
      { itemId: "amulette", chance: 0.10 }
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

  // ════════════════════════════════════════════
  // ÉTAGE 10+ : Le Maître des Ténèbres
  // ════════════════════════════════════════════

  {
    id:       "voldemort_revenu",
    name:     "Voldemort Ressuscité",
    icon:     "💀",
    category: "être magique",
    desc:     "Lord Voldemort, pleinement ressuscité, vous contemple avec froideur absolue !",
    lore:     "Après l'usage d'os de père, chair de serviteur et sang d'ennemi, Voldemort est revenu à la pleine puissance. Sa seule présence glace le sang des plus braves sorciers.",
    minFloor: 10, maxFloor: null, weight: 1,
    hp: 100, atk: 28, def: 14, mag: 25, agi: 10, lck: 15,
    scale: 0.40,
    abilities: [
      { name: "Avada Kedavra",      icon: "💚", desc: "Sort de la mort imparable",       effect: "damage", power: 35, chance: 0.30 },
      { name: "Cruciatus Absolu",   icon: "⚡", desc: "Torture au-delà de l'imaginable", effect: "drain",  power: 22, chance: 0.25 },
      { name: "Nagini te Convoque", icon: "🐍", desc: "Invoque Nagini pour se soigner",  effect: "heal",   power: 25, chance: 0.20 },
      { name: "Marque des Ténèbres",icon: "🌑", desc: "Marque qui ronge les défenses",   effect: "weaken", power: 6,  chance: 0.15 }
    ],
    ai: "aggressive",
    resist: ["stun", "disarm", "burn", "instant"],
    weak:   [],
    xp: 350, gold: { min: 120, max: 200 },
    drops:  [
      { itemId: "felix",    chance: 0.60 },
      { itemId: "wand2",    chance: 0.40 },
      { itemId: "amulette", chance: 0.30 }
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

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
//                       "status"  → applique un statut persistant à la cible
//                                   (requiert .statusId + .turns ; ex. burn/bleed/poison)
//                       — Archétypes boss/élites (LOT B3, réservés epic / étages 8+) —
//                       "summon"     → invoque un add si un slot ennemi est libre
//                                      (cap 3). Requiert .summonId (id MONSTERS) ;
//                                      .summonName optionnel pour le fallback.
//                       "enrage_self"→ une fois passé sous .hpPct (0-1, déf. 0.4)
//                                      de PV, l'ennemi gagne .atkBonus ATK (une
//                                      seule fois). Sinon : attaque normale.
//                       "aura"       → applique un debuff de groupe persistant à
//                                      tous les héros vivants. Requiert .statusId
//                                      (ex. "weaken") + .power + .turns.
//    .power  {number}   Valeur de base de l'effet
//    .statusId {string} (effect:"status" uniquement) id du statut appliqué
//    .turns  {number}   (effect:"status" uniquement) durée du statut en tours
//    .chance {number}   Probabilité d'utilisation à chaque tour (0.0 à 1.0)
//
//  ai        {string}   Comportement en combat (utilisé pour évolutions futures) :
//                       "aggressive" | "cautious" | "random"
//
//  resist    [string]   Sorts atténués de 50% sur cet ennemi. Éléments :
//                       "feu" | "glace" | "foudre" | "lumière" | "ténèbres"
//                       | "physique" — plus la clé mécanique "disarm".
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
    imgSrc:   "img/monsters/chat_norris.png",
    category: "bête",
    loreFamily: "F1",
    desc:     "Les yeux pâles de Mme Norris vous fixent dans l'obscurité",
    lore:     "La fidèle compagne d'Argus Rusard. Ses yeux globuleux semblent voir à travers les murs. Elle patrouille les couloirs la nuit et prévient son maître au moindre mouvement suspect. Sa loyauté pour Rusard est absolue.",
    habitat:  "Couloirs des étages supérieurs, salle des trophées et paliers",
    anecdote: "Dans La Chambre des Secrets, elle est la première victime pétrifiée par le regard du Basilic.",
    danger:   2,
    minFloor: 1, maxFloor: 2, weight: 8,
    hp: 10, atk: 2, def: 1, mag: 0, agi: 18, lck: 12,
    scale: 0.15,
    abilities: [],
    ai: "cautious",
    resist: [],
    weak:   ["feu"],
    xp: 5, gold: { min: 0, max: 3 },
    drops:  []
  },

  {
    id:       "luciole_marais",
    name:     "Luciole des Marais",
    icon:     "✨",
    imgSrc:   "img/monsters/luciole_marais.png",
    category: "bête",
    loreFamily: "F1",
    desc:     "Une nuée de lucioles ensorcelées surgit en tourbillonnant",
    lore:     "Ces petites créatures lumineuses des marais de Poudlard sont inoffensives en apparence, mais leurs flashs aveuglants peuvent désorienter n'importe quel sorcier.",
    habitat:  "Marais et zones humides à l'orée de la Forêt Interdite",
    anecdote: "On dit que les lucioles des marais attirent les imprudents hors des sentiers balisés la nuit, comme des lanternes trompeuses.",
    danger:   1,
    minFloor: 1, maxFloor: 3, weight: 9,
    hp: 8, atk: 1, def: 0, mag: 3, agi: 20, lck: 14,
    scale: 0.15,
    abilities: [
      { name: "Éclair Aveuglant", icon: "💡", desc: "Flash lumineux qui perturbe la vision", effect: "weaken", power: 1, chance: 0.35 }
    ],
    ai: "random",
    resist: ["feu"],
    weak:   ["glace"],
    xp: 4, gold: { min: 0, max: 2 },
    drops:  []
  },

  {
    id:       "cornichon",
    name:     "Cornichon de Cornouailles",
    icon:     "🫐",
    imgSrc:   "img/monsters/cornichon.png",
    category: "créature",
    loreFamily: "F1",
    desc:     "Une nuée de Cornichons bleus électriques fondent sur vous en criant !",
    lore:     "Ces petites créatures turbulentes du cours de Gilderoy Lockhart ont envahi les couloirs. Elles adorent pincer et tirer les cheveux.",
    habitat:  "Salles de classe et couloirs des étages supérieurs",
    anecdote: "Gilderoy Lockhart libéra toute une cage de Cornichons lors de son premier cours, incapable de les capturer malgré ses fanfaronnades (La Chambre des Secrets).",
    danger:   2,
    minFloor: 1, maxFloor: 3, weight: 10,
    hp: 12, atk: 3, def: 1, mag: 0, agi: 17, lck: 10,
    scale: 0.18,
    abilities: [
      { name: "Pincement en Masse", icon: "🤏", desc: "Attaque par dizaines à la fois", effect: "weaken", power: 2, chance: 0.30 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["physique"],
    xp: 6, gold: { min: 1, max: 4 },
    drops:  [{ itemId: "mandragore", chance: 0.10 }]
  },

  {
    id:       "portrait_hostile",
    name:     "Portrait Animé Hostile",
    icon:     "🖼️",
    imgSrc:   "img/monsters/portrait_hostile.png",
    category: "fantôme",
    loreFamily: "F1",
    desc:     "Le portrait d'un ancien élève de Serpentard s'anime et vous maudit !",
    lore:     "Certains portraits des couloirs ont été ensorcelés par des sympathisants de Voldemort. Ils lancent des malédictions sur les passants indésirables.",
    habitat:  "Couloirs des étages, galeries et escaliers ornés de tableaux",
    anecdote: "Les portraits de Poudlard peuvent se déplacer entre cadres et transmettre des messages — certains en abusent pour espionner les élèves au nom des Ténèbres.",
    danger:   3,
    minFloor: 1, maxFloor: 4, weight: 7,
    hp: 10, atk: 0, def: 0, mag: 7, agi: 5, lck: 8,
    scale: 0.18,
    abilities: [
      { name: "Malédiction Murale",   icon: "🎨", desc: "Sort lancé depuis le cadre", effect: "damage", power: 6, chance: 0.50 },
      { name: "Insulte Démoralisante",icon: "😤", desc: "Affaiblit la volonté",       effect: "weaken", power: 2, chance: 0.25 }
    ],
    ai: "random",
    resist: ["foudre", "disarm"],
    weak:   ["feu"],
    xp: 5, gold: { min: 0, max: 3 },
    drops:  []
  },

  {
    id:       "peeves",
    name:     "Peeve le Poltergeist",
    icon:     "👻",
    imgSrc:   "img/monsters/peeves.png",
    category: "fantôme",
    loreFamily: "F1",
    desc:     "Le poltergeist tourbillonne en ricanant, prêt à tout casser",
    lore:     "Peeve hante Poudlard depuis des siècles. Il prend un malin plaisir à tourmenter les élèves.",
    habitat:  "Couloirs, salles de bains et paliers de Poudlard — partout où il peut semer le chaos",
    anecdote: "Seul le Baron Sanglant peut le faire obéir, et lors de la Bataille de Poudlard, Peeve combattit les Mangemorts aux côtés des élèves en lançant des boules de billard.",
    danger:   3,
    minFloor: 1, maxFloor: 4, weight: 12,
    hp: 14, atk: 3, def: 0, mag: 4, agi: 16, lck: 10,
    scale: 0.20,
    abilities: [
      { name: "Rire Tonitruant", icon: "😂", desc: "Déstabilise la cible", effect: "weaken", power: 1, chance: 0.30 }
    ],
    ai: "random",
    resist: ["physique", "disarm"],
    weak:   ["lumière"],
    xp: 8, gold: { min: 2, max: 6 },
    // Jalon tranche A (ét. 1-3) du fil rouge « Clé de Voûte » : drop garanti.
    drops:  [{ itemId: "mandragore", chance: 0.10 },
             { itemId: "eclat_voute", chance: 1.0 }]
  },

  {
    id:       "myrtle",
    name:     "Mimi Geignarde",
    icon:     "💧",
    imgSrc:   "img/monsters/myrtle.png",
    category: "fantôme",
    loreFamily: "F1",
    desc:     "Le fantôme d'une élève vous attaque en sanglotant bruyamment",
    lore:     "Mimi Geignarde hante les toilettes du deuxième étage depuis sa mort. Son cri perçant peut vous paralyser.",
    habitat:  "Toilettes des filles du deuxième étage et tuyauteries du château",
    anecdote: "Elle est morte dans les toilettes en regardant les yeux du Basilic dans un miroir brisé — un sort accidentel qui la pétrifia avant de la tuer (La Chambre des Secrets).",
    danger:   2,
    minFloor: 1, maxFloor: 3, weight: 6,
    hp: 12, atk: 2, def: 0, mag: 6, agi: 12, lck: 6,
    scale: 0.18,
    abilities: [
      { name: "Plainte Stridente", icon: "😭", desc: "Cri perçant qui affaiblit", effect: "weaken", power: 2, chance: 0.35 }
    ],
    ai: "random",
    resist: ["physique", "feu", "disarm"],
    weak:   ["lumière"],
    xp: 6, gold: { min: 0, max: 4 },
    drops:  []
  },

  {
    id:       "serpent_cachot",
    name:     "Serpent des Cachots",
    icon:     "🐍",
    imgSrc:   "img/monsters/serpent_cachot.png",
    category: "bête",
    loreFamily: "F1",
    desc:     "Un serpent venimeux surgit de l'ombre avec un sifflement",
    lore:     "Les cachots de Poudlard abritent des serpents qui répondent parfois au Fourchelang.",
    habitat:  "Cachots de Serpentard, fissures murales et passages souterrains",
    anecdote: "Certains serpents des cachots auraient été dressés par Salazar Serpentard lui-même, obéissant uniquement aux paroles du Fourchelang.",
    danger:   3,
    minFloor: 1, maxFloor: 5, weight: 10,
    hp: 20, atk: 5, def: 2, mag: 0, agi: 13, lck: 8,
    scale: 0.25,
    abilities: [
      { name: "Morsure Venimeuse", icon: "☠️", desc: "Draine la vitalité", effect: "drain", power: 4, chance: 0.30 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["glace"],
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
    imgSrc:   "img/monsters/chouette_envoutee.png",
    category: "bête",
    loreFamily: "F2",
    desc:     "Une chouette aux yeux rouges fond sur vous en poussant un cri strident",
    lore:     "Ces chouettes autrefois paisibles ont été ensorcelées par des Mangemorts pour espionner le château. Leurs serres transmettent une magie corrompue.",
    habitat:  "Volières de Poudlard, beffrois et combles des tours",
    anecdote: "Certaines ont servi de messagers corrompus, livrant aux Mangemorts la position des élèves résistants pendant la Seconde Guerre des sorciers.",
    danger:   3,
    minFloor: 2, maxFloor: 4, weight: 8,
    hp: 14, atk: 4, def: 1, mag: 2, agi: 16, lck: 10,
    scale: 0.20,
    abilities: [
      { name: "Plongeon en Piqué", icon: "🦅", desc: "Attaque fulgurante", effect: "damage", power: 4, chance: 0.35 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["foudre"],
    xp: 9, gold: { min: 2, max: 7 },
    drops:  []
  },

  {
    id:       "mandragore_sauvage",
    name:     "Mandragore Sauvage",
    icon:     "🌿",
    imgSrc:   "img/monsters/mandragore_sauvage.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Une Mandragore arrachée à la terre pousse un cri à vous glacer le sang !",
    lore:     "Les Mandragores sauvages qui ont poussé sans surveillance dans les serres abandonnées ont développé une agressivité redoutable. Leur cri peut vous assommer instantanément.",
    habitat:  "Serres abandonnées et jardins oubliés de Poudlard",
    anecdote: "La mandragore adulte émet un cri fatal ; en deuxième année, les élèves portaient des cache-oreilles pour les rempotter — et Harry dut en soigner plusieurs victimes pétrifiées (La Chambre des Secrets).",
    danger:   4,
    minFloor: 2, maxFloor: 5, weight: 7,
    hp: 24, atk: 5, def: 4, mag: 5, agi: 7, lck: 6,
    scale: 0.22,
    abilities: [
      { name: "Cri Paralysant",    icon: "📣", desc: "Cri qui désorganise les sens",   effect: "weaken", power: 3, chance: 0.40 },
      { name: "Racines Étranglantes", icon: "🌱", desc: "Immobilise et draine",        effect: "drain",  power: 5, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["feu"],
    xp: 15, gold: { min: 5, max: 12 },
    drops:  [{ itemId: "mandragore", chance: 0.35 }, { itemId: "herbe_ortie", chance: 0.20 }]
  },

  {
    id:       "kappa_douves",
    name:     "Kappa des Douves",
    icon:     "🐢",
    imgSrc:   "img/monsters/kappa_douves.png",
    category: "être magique",
    loreFamily: "F2",
    desc:     "Un Kappa surgit des douves obscures avec des griffes tranchantes comme des lames",
    lore:     "Ces créatures aquatiques d'origine japonaise se sont installées dans les douves du château. Ils préfèrent noyer leurs victimes pour absorber leur force vitale.",
    habitat:  "Douves du château, fossés souterrains et bassins des cachots",
    anecdote: "Etudié en troisième année dans le cours de Défense contre les Forces du Mal, le Kappa s'incline poliment pour vider l'eau de sa coupelle crânienne — ce qui lui ôte ses pouvoirs.",
    danger:   4,
    minFloor: 2, maxFloor: 6, weight: 7,
    hp: 28, atk: 7, def: 5, mag: 3, agi: 9, lck: 7,
    scale: 0.22,
    abilities: [
      { name: "Saisie des Eaux",  icon: "💧", desc: "Draine la force vitale",    effect: "drain",  power: 6, chance: 0.30 },
      { name: "Griffes d'Écaille", icon: "🦀", desc: "Griffes acérées sous l'eau", effect: "damage", power: 5, chance: 0.25 },
      { name: "Crachat Acide",    icon: "🧪", desc: "Acide corrosif qui brûle",  effect: "status", statusId: "burn", power: 3, chance: 0.20, turns: 2 }
    ],
    ai: "cautious",
    resist: ["glace"],
    weak:   ["foudre"],
    xp: 20, gold: { min: 8, max: 15 },
    drops:  [{ itemId: "potion_s", chance: 0.12 }, { itemId: "herbe_asphodele", chance: 0.18 }]
  },

  {
    id:       "boggart",
    name:     "Épouvantard",
    icon:     "🌫️",
    imgSrc:   "img/monsters/boggart.png",
    category: "être magique",
    loreFamily: "F3",
    desc:     "L'Épouvantard prend la forme de votre pire cauchemar !",
    lore:     "L'Épouvantard est une créature sans forme propre qui prend l'apparence de ce que vous craignez le plus. Seul le sort Riddikulus peut le repousser en faisant rire.",
    habitat:  "Penderies, armoires oubliées et recoins sombres de Poudlard",
    anecdote: "Lors du cours de Lupin, l'Épouvantard prit pour Harry la forme d'un Détraqueur, révélant sa plus grande peur : la peur elle-même (Le Prisonnier d'Azkaban).",
    danger:   5,
    minFloor: 2, maxFloor: 6, weight: 8,
    hp: 20, atk: 6, def: 2, mag: 9, agi: 13, lck: 8,
    scale: 0.22,
    abilities: [
      { name: "Forme Cauchemaresque", icon: "😱", desc: "Manifeste votre pire peur",  effect: "damage", power: 8, chance: 0.35 },
      { name: "Terreur Absolue",       icon: "😱", desc: "Paralyse de frayeur",        effect: "status", statusId: "fear", power: 0, chance: 0.25, turns: 2 }
    ],
    ai: "random",
    resist: ["ténèbres", "disarm"],
    weak:   ["lumière"],
    xp: 18, gold: { min: 6, max: 14 },
    drops:  []
  },

  {
    id:       "gobelin",
    name:     "Gobelin Rebelle",
    icon:     "👺",
    imgSrc:   "img/monsters/gobelin.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Un gobelin en colère agite son épée courbe",
    lore:     "Certains gobelins de Gringotts ont rejoint les forces de Voldemort. Ils gardent les couloirs les plus sombres.",
    habitat:  "Couloirs des cachots, coffres de Gringotts et passages gardés",
    anecdote: "La rébellion des gobelins est un thème récurrent de l'histoire sorcière — certains ont soutenu Voldemort en échange de promesses de droits sur les baguettes magiques.",
    danger:   4,
    minFloor: 2, maxFloor: 6, weight: 9,
    hp: 22, atk: 7, def: 3, mag: 2, agi: 11, lck: 9,
    scale: 0.25,
    abilities: [],
    ai: "aggressive",
    resist: [],
    weak:   ["physique"],
    xp: 18, gold: { min: 10, max: 22 },
    drops:  [
      { itemId: "mandragore",    chance: 0.20 },
      { itemId: "potion_s",      chance: 0.08 },
      { itemId: "ceinture_cuir", chance: 0.04 }
    ]
  },

  {
    id:       "araignee",
    name:     "Araignée Géante",
    icon:     "🕷️",
    imgSrc:   "img/monsters/araignee.png",
    category: "bête",
    loreFamily: "F2",
    desc:     "Une araignée monstrueuse descend du plafond sur sa toile",
    lore:     "Les descendants d'Aragog peuplent la Forêt Interdite et s'infiltrent parfois dans le château.",
    habitat:  "Lisière de la Forêt Interdite, greniers et caves humides",
    anecdote: "Harry et Ron suivirent une colonne de ces araignées jusqu'au repaire d'Aragog dans la Forêt Interdite, manquant de peu d'être dévorés (La Chambre des Secrets).",
    danger:   5,
    minFloor: 2, maxFloor: 7, weight: 9,
    hp: 18, atk: 6, def: 2, mag: 0, agi: 14, lck: 7,
    scale: 0.25,
    abilities: [
      { name: "Toile Collante", icon: "🕸️", desc: "Immobilise et affaiblit", effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["feu"],
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
    imgSrc:   "img/monsters/bundimun.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Un Bundimun suinte une sécrétion verte corrosive et se jette sur vous",
    lore:     "Ces parasites magiques produisent une sécrétion qui dissout tous les matériaux organiques. Même les armures peuvent fondre sous leur acide magique.",
    habitat:  "Murs humides, cuisines infestées et sous-sols de Poudlard",
    anecdote: "Mentionné dans Le Quidditch à travers les âges, le Bundimun ronge les fondations des maisons de sorciers et exige un traitement à base de Dispellus.",
    danger:   4,
    minFloor: 3, maxFloor: 6, weight: 7,
    hp: 22, atk: 4, def: 6, mag: 4, agi: 6, lck: 5,
    scale: 0.22,
    abilities: [
      { name: "Sécrétion Corrosive", icon: "🧪", desc: "Acide magique qui ronge l'armure", effect: "drain",  power: 6, chance: 0.35 },
      { name: "Multiplication",       icon: "✂️", desc: "Se divise pour attaquer",          effect: "damage", power: 4, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["ténèbres"],
    weak:   ["feu"],
    xp: 14, gold: { min: 5, max: 10 },
    drops:  [
      { itemId: "bottes_apprenti", chance: 0.05 },
      { itemId: "herbe_branchiflore", chance: 0.18 }
    ]
  },

  {
    id:       "homme_araignee",
    name:     "Homme-Araignée Acromantule",
    icon:     "🕸️",
    imgSrc:   "img/monsters/homme_araignee.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Un chasseur à mi-chemin entre l'humain et l'araignée géante surgit de l'obscurité",
    lore:     "Né d'une expérience magique interdite, cet hybride possède la ruse d'un sorcier et la cruauté d'une araignée. Il tisse des pièges dans les couloirs.",
    habitat:  "Galeries creusées dans la roche vive, zones interdites de la Forêt",
    anecdote: "L'existence de tels hybrides est niée par le Ministère de la Magie, qui préfère ne pas admettre les conséquences des expériences de la Première Guerre.",
    danger:   5,
    minFloor: 3, maxFloor: 7, weight: 6,
    hp: 26, atk: 9, def: 3, mag: 6, agi: 14, lck: 8,
    scale: 0.25,
    abilities: [
      { name: "Crochets Venimeux", icon: "☠️", desc: "Morsure qui draine la vie", effect: "drain",  power: 7, chance: 0.30 },
      { name: "Toile Lourde",      icon: "🕷️", desc: "Emprisonne et affaiblit",   effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["feu"],
    xp: 22, gold: { min: 10, max: 18 },
    drops:  [{ itemId: "mandragore", chance: 0.20 }]
  },

  {
    id:       "meduse_noire",
    name:     "Méduse Noire des Profondeurs",
    icon:     "🪼",
    imgSrc:   "img/monsters/meduse_noire.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Une méduse noire translucide flotte dans l'air vicié du couloir",
    lore:     "Créature des lacs souterrains de Poudlard, cette méduse noire a développé la capacité de flotter dans l'air. Ses tentacules chargés de magie noire paralysent en un instant.",
    habitat:  "Lacs souterrains, galeries inondées et passages submergés",
    anecdote: "Des créatures similaires peuplent les eaux profondes du Grand Lac, où les Tritons les utilisent comme gardiennes de leurs territoires.",
    danger:   6,
    minFloor: 3, maxFloor: 7, weight: 6,
    hp: 30, atk: 6, def: 3, mag: 8, agi: 10, lck: 7,
    scale: 0.25,
    abilities: [
      { name: "Tentacules Électriques", icon: "⚡", desc: "Choc magique douloureux", effect: "damage", power: 7, chance: 0.35 },
      { name: "Venin Paralysant",        icon: "💜", desc: "Venin qui affaiblit",    effect: "weaken", power: 3, chance: 0.30 }
    ],
    ai: "cautious",
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 24, gold: { min: 8, max: 16 },
    drops:  [{ itemId: "potion_s", chance: 0.10 }]
  },

  {
    id:       "troll",
    name:     "Troll des Toilettes",
    icon:     "🦕",
    imgSrc:   "img/monsters/troll.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Un troll nauséabond barre le passage en grognant",
    lore:     "Un cousin du troll lâché par Quirinus Quirrell lors de la fête d'Halloween. Brutal et lent.",
    habitat:  "Couloirs des niveaux intermédiaires, toilettes et sous-sols nauséabonds",
    anecdote: "Harry et Ron neutralisèrent le troll en lui enfonçant sa propre massue dans la narine — premier acte héroïque qui lia les trois amis pour toujours (La Sorcière de l'Est).",
    danger:   6,
    minFloor: 3, maxFloor: 7, weight: 7,
    hp: 35, atk: 9, def: 5, mag: 0, agi: 6, lck: 5,
    scale: 0.28,
    abilities: [
      { name: "Coup de Massue", icon: "🪨", desc: "Frappe dévastatrice", effect: "damage", power: 8, chance: 0.25 }
    ],
    ai: "aggressive",
    resist: ["physique"],
    weak:   ["feu"],
    xp: 20, gold: { min: 12, max: 18 },
    drops:  [
      { itemId: "potion_s",       chance: 0.20 },
      { itemId: "robe1",          chance: 0.05 },
      { itemId: "gants_apprenti", chance: 0.04 },
      { itemId: "ceinture_force", chance: 0.03 }
    ]
  },

  {
    id:       "centaure",
    name:     "Centaure Hostile",
    icon:     "🏹",
    imgSrc:   "img/monsters/centaure.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Un centaure de la forêt vous barre le chemin, arc tendu",
    lore:     "Tous les centaures ne sont pas bienveillants. Celui-ci n'apprécie pas les intrus dans son territoire.",
    habitat:  "Forêt Interdite, clairières étoilées et lisières boisées",
    anecdote: "Firenze fut banni de son troupeau pour avoir accepté de porter Harry — les centaures considèrent que servir un humain est le plus grand des déshonneurs.",
    danger:   6,
    minFloor: 3, maxFloor: 7, weight: 6,
    hp: 30, atk: 8, def: 4, mag: 5, agi: 13, lck: 10,
    scale: 0.25,
    abilities: [
      { name: "Flèche Enchantée", icon: "✨", desc: "Flèche imprégnée de magie", effect: "damage", power: 7, chance: 0.30 }
    ],
    ai: "cautious",
    resist: [],
    weak:   ["foudre"],
    xp: 22, gold: { min: 10, max: 18 },
    drops:  [
      { itemId: "potion_s",      chance: 0.10 },
      { itemId: "anneau_argent", chance: 0.06 },
      { itemId: "anneau_courage",chance: 0.03 }
    ]
  },

  {
    id:       "detraqueur",
    name:     "Détraqueur",
    icon:     "🌑",
    imgSrc:   "img/monsters/detraqueur.png",
    category: "être magique",
    loreFamily: "F3",
    desc:     "Un Détraqueur aspire toute joie et tout espoir autour de vous",
    lore:     "Créature squelettique qui se nourrit littéralement du bonheur des autres. Sa simple présence aspire toute joie et force quiconque à revivre ses pires souvenirs. Seul le Patronus — manifestation de ses propres souvenirs heureux — peut le repousser.",
    habitat:  "Forêt Interdite, cachots les plus sombres et abords du lac souterrain",
    anecdote: "Harry en rencontre pour la première fois dans le Poudlard Express — il s'évanouit sous leur influence (Le Prisonnier d'Azkaban).",
    // Variante corrompue (Codex Ch.12 §12.4.8) — affichée dans le bestiaire
    // une fois en Boucle Ténébreuse profonde (victoire + étage 16+).
    corruptedLore: "Plus bas, ils ne flottent plus : ils s'écoulent, comme de l'encre dans de l'eau gelée. Ce ne sont plus des gardiens d'Azkaban égarés. Ce sont les premières larmes de ce que les Ruines contiennent — la peur d'avant les noms.",
    danger:   9,
    minFloor: 3, maxFloor: 8, weight: 7,
    hp: 25, atk: 10, def: 3, mag: 8, agi: 10, lck: 6,
    scale: 0.30,
    abilities: [
      { name: "Baiser du Détraqueur", icon: "💀", desc: "Draine l'âme de la cible",  effect: "drain",  power: 10, chance: 0.35 },
      { name: "Désespoir Glacial",    icon: "😱", desc: "Glace la cible d'effroi",   effect: "status", statusId: "fear", power: 0, chance: 0.30, turns: 3 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "glace", "disarm"],
    weak:   ["lumière"],
    xp: 25, gold: { min: 8, max: 14 },
    drops:  [{ itemId: "potion_m", chance: 0.12 }, { itemId: "eclat_lumiere", chance: 0.35 }]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 4-9 : Le Donjon Profond
  // ════════════════════════════════════════════

  {
    id:       "hippogriffe_courroux",
    name:     "Hippogriffe en Furie",
    icon:     "🦅",
    imgSrc:   "img/monsters/hippogriffe_courroux.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Un Hippogriffe déploie ses ailes et charge avec une rage terrifiante !",
    lore:     "Créature à la fierté légendaire qui exige une révérence avant tout contact. Cet Hippogriffe a été blessé et traumatisé par des Mangemorts — sa méfiance est devenue une rage incontrôlable. Il attaque sans avertissement quiconque croise son regard.",
    habitat:  "Tours de Gryffondor et lisière de la Forêt Interdite",
    anecdote: "Buckbeak (rebaptisé Hippo) a été sauvé par Harry et Hermione grâce à un voyage dans le temps — il devint ensuite la monture de Sirius Black (Le Prisonnier d'Azkaban).",
    danger:   7,
    minFloor: 4, maxFloor: 8, weight: 5,
    hp: 42, atk: 14, def: 6, mag: 0, agi: 15, lck: 9,
    scale: 0.28,
    abilities: [
      { name: "Serres du Griffon", icon: "🦅", desc: "Attaque féroce avec les serres",  effect: "damage", power: 10, chance: 0.35 },
      { name: "Charge Ailée",      icon: "💨", desc: "Charge en piqué dévastateur",      effect: "damage", power: 14, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["foudre"],
    xp: 38, gold: { min: 16, max: 26 },
    drops:  [
      { itemId: "potion_s",         chance: 0.15 },
      { itemId: "chapeau_apprenti", chance: 0.04 },
      { itemId: "gants_duelliste",  chance: 0.04 }
    ]
  },

  {
    id:       "inferius",
    name:     "Inférius",
    icon:     "🧟",
    imgSrc:   "img/monsters/inferius.png",
    category: "créature",
    loreFamily: "F3",
    desc:     "Un cadavre réanimé par la magie noire se lève et avance vers vous !",
    lore:     "Les Inférises sont des corps de personnes mortes réanimées par un sorcier des Ténèbres. Ils n'ont ni âme ni volonté propre et ne craignent rien — sauf le feu.",
    habitat:  "Caves glacées, lacs souterrains et cimetières corrompus",
    anecdote: "Dumbledore et Harry en affrontèrent une armée entière dans la caverne de l'horcruxe — seul le feu permit de les repousser (Le Prince de Sang-Mêlé).",
    danger:   7,
    minFloor: 4, maxFloor: 8, weight: 5,
    hp: 38, atk: 13, def: 7, mag: 0, agi: 7, lck: 4,
    scale: 0.28,
    abilities: [
      { name: "Étreinte Glaciale", icon: "🧊", desc: "Étreinte de mort qui draine la chaleur", effect: "drain",  power: 9, chance: 0.35 },
      { name: "Régénération Obscure", icon: "💀", desc: "Se réanime partiellement",             effect: "heal",   power: 8, chance: 0.15 },
      { name: "Griffes Putrides",   icon: "🩸", desc: "Griffes infectées qui font saigner",  effect: "status", statusId: "bleed", power: 3, chance: 0.25, turns: 3 }
    ],
    ai: "aggressive",
    resist: ["ténèbres", "glace", "disarm"],
    weak:   ["feu"],
    xp: 35, gold: { min: 12, max: 20 },
    drops:  [{ itemId: "eclat_lumiere", chance: 0.35 }]
  },

  {
    id:       "loup_garou",
    name:     "Loup-Garou Enragé",
    icon:     "🐺",
    imgSrc:   "img/monsters/loup_garou.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "La pleine lune a transformé ce sorcier en bête sauvage",
    lore:     "Transformé par la morsure d'un loup-garou, ce sorcier perd tout contrôle sous la pleine lune. Il n'a plus conscience de lui-même et attaque tout ce qui bouge avec une férocité animale. Ses griffes peuvent déchirer même une armure renforcée.",
    habitat:  "Forêt Interdite et cachots lunaires dans les sous-sols du château",
    anecdote: "Remus Lupin est le plus célèbre loup-garou de Poudlard — mais tous ne partagent pas sa maîtrise de soi ni ses valeurs (Le Prisonnier d'Azkaban).",
    danger:   8,
    minFloor: 4, maxFloor: 9, weight: 6,
    hp: 45, atk: 15, def: 5, mag: 0, agi: 15, lck: 7,
    scale: 0.28,
    abilities: [
      { name: "Griffes Tranchantes",   icon: "🔪", desc: "Attaque puissante",       effect: "damage", power: 8, chance: 0.30 },
      { name: "Hurlement Terrifiant",  icon: "🌕", desc: "Affaiblit la défense",    effect: "weaken", power: 2, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["feu"],
    xp: 45, gold: { min: 14, max: 22 },
    // Jalon tranche B (ét. 4-6) du fil rouge « Clé de Voûte » : drop garanti.
    drops:  [
      { itemId: "mandragore",     chance: 0.25 },
      { itemId: "potion_s",       chance: 0.12 },
      { itemId: "herbe_aconit",   chance: 0.16 },
      { itemId: "herbe_dictame",  chance: 0.10 },
      { itemId: "eclat_voute",    chance: 1.0 }
    ]
  },

  {
    id:       "sorciere_tenebres",
    name:     "Sorcière des Ténèbres",
    icon:     "🧙‍♀️",
    imgSrc:   "img/monsters/sorciere_tenebres.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Une sorcière en robes noires ricane et lève sa baguette vers vous",
    lore:     "Adepte des arts noirs depuis l'enfance, elle a offert son âme à Voldemort en échange de pouvoirs redoutables. Elle maîtrise guérison et destruction.",
    habitat:  "Cachots profonds et salles secrètes dédiées aux arts noirs",
    anecdote: "Nombre d'entre elles viennent de familles de sang pur qui transmirent leur allégeance aux Ténèbres de génération en génération, bien avant la montée de Voldemort.",
    danger:   7,
    minFloor: 4, maxFloor: 9, weight: 6,
    hp: 36, atk: 8, def: 4, mag: 13, agi: 11, lck: 9,
    scale: 0.28,
    abilities: [
      { name: "Maléfice des Ombres",    icon: "🟣", desc: "Magie noire concentrée",   effect: "damage", power: 11, chance: 0.35 },
      { name: "Soins des Ténèbres",     icon: "💚", desc: "Se soigne par magie sombre",effect: "heal",   power: 12, chance: 0.25 },
      { name: "Affaiblissement Sombre", icon: "⚫", desc: "Réduit les défenses",       effect: "weaken", power: 2,  chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["ténèbres"],
    weak:   ["lumière"],
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
    imgSrc:   "img/monsters/mangemort.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Un Mangemort vous vise de sa baguette noire en murmurant des sortilèges",
    lore:     "Serviteur de Lord Voldemort, reconnaissable à son masque blanc et la Marque des Ténèbres sur son bras.",
    habitat:  "Passages secrets, Ministère corrompu et couloirs de Poudlard occupée",
    anecdote: "La Marque des Ténèbres brûle sur leur bras lorsque Voldemort les appelle — un signal de ralliement qui semait la terreur dans tout le monde sorcier.",
    danger:   7,
    minFloor: 5, maxFloor: null, weight: 8,
    hp: 40, atk: 12, def: 6, mag: 10, agi: 10, lck: 8,
    scale: 0.30,
    abilities: [
      { name: "Sortilège des Ténèbres", icon: "🟣", desc: "Magie noire concentrée", effect: "damage", power: 12, chance: 0.40 },
      { name: "Expelliarmus Sombre",    icon: "⚡", desc: "Affaiblit les défenses",  effect: "weaken", power: 2,  chance: 0.20 },
      // Potion de soin à usage unique : bue en priorité quand le Mangemort est
      // en danger (effect:"consumable", 1 charge par instance).
      { name: "Potion de Régénération", icon: "🧪", desc: "Boit une potion de soin (1 fois)", effect: "consumable", power: 16, charges: 1, chance: 0.6 }
    ],
    ai: "aggressive",
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 40, gold: { min: 20, max: 30 },
    drops:  [
      { itemId: "potion_s",      chance: 0.25 },
      { itemId: "potion_m",      chance: 0.15 },
      { itemId: "wand1",         chance: 0.05 },
      { itemId: "cape_voyageur", chance: 0.08 }
    ]
  },

  {
    id:       "acromantula_jeune",
    name:     "Jeune Acromantule",
    icon:     "🕷️",
    imgSrc:   "img/monsters/acromantula_jeune.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Une jeune Acromantule agite ses huit yeux noirs et fonce sur vous !",
    lore:     "Descendant direct d'Aragog, ce jeune spécimen n'a pas encore atteint sa taille adulte — mais ses crocs venimeux sont déjà mortels.",
    habitat:  "Forêt Interdite et galeries creusées par la colonie d'Aragog",
    anecdote: "Quand Aragog mourut, ses descendants rompirent le pacte de non-agression et attaquèrent le château — les élèves durent les repousser lors de la Bataille de Poudlard.",
    danger:   6,
    minFloor: 5, maxFloor: 9, weight: 5,
    hp: 48, atk: 16, def: 6, mag: 0, agi: 13, lck: 6,
    scale: 0.30,
    abilities: [
      { name: "Crocs Venimeux",  icon: "☠️", desc: "Morsure qui draine la vitalité", effect: "drain",  power: 10, chance: 0.35 },
      { name: "Toile Géante",    icon: "🕸️", desc: "Emprisonne complètement",         effect: "weaken", power: 4,  chance: 0.25 },
      { name: "Morsure Venimeuse", icon: "🦂", desc: "Inocule un venin lent",          effect: "status", statusId: "poison", power: 4, chance: 0.30, turns: 3 }
    ],
    ai: "aggressive",
    resist: [],
    weak:   ["feu"],
    xp: 48, gold: { min: 18, max: 28 },
    drops:  [
      { itemId: "potion_s",       chance: 0.20 },
      { itemId: "potion_m",       chance: 0.08 },
      { itemId: "bottes_silence", chance: 0.03 }
    ]
  },

  {
    id:       "dementor_garde",
    name:     "Détraqueur Gardien",
    icon:     "🌑",
    imgSrc:   "img/monsters/dementor_garde.png",
    category: "être magique",
    loreFamily: "F3",
    desc:     "Un Détraqueur en faction se lève — la température chute à zéro !",
    lore:     "Détraqueurs d'une ancienneté terrifiante, ayant absorbé des milliers d'âmes pendant des siècles à Azkaban. Leur aura de désespoir est si dense qu'elle peut faire craquer les sorciers les plus aguerris en quelques secondes.",
    habitat:  "Cachots les plus bas, passages secrets gelés et couloirs sans lumière",
    anecdote: "Lorsque Voldemort prend le contrôle d'Azkaban, ces Détraqueurs gardiens rejoignent ses rangs — faisant d'Azkaban une prison ingérable (L'Ordre du Phénix).",
    danger:   10,
    minFloor: 5, maxFloor: null, weight: 5,
    hp: 45, atk: 14, def: 5, mag: 14, agi: 10, lck: 6,
    scale: 0.30,
    abilities: [
      { name: "Baiser Glacial",   icon: "💀", desc: "Draine l'âme profondément",    effect: "drain",  power: 14, chance: 0.35 },
      { name: "Aura de Désespoir",icon: "🌑", desc: "Affaiblit toute résistance",   effect: "weaken", power: 4,  chance: 0.25 },
      { name: "Cri de Terreur",   icon: "😱", desc: "Sort de désespoir pur",        effect: "damage", power: 10, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "glace", "disarm"],
    weak:   ["lumière"],
    xp: 55, gold: { min: 20, max: 32 },
    drops:  [{ itemId: "potion_m", chance: 0.15 }, { itemId: "eclat_lumiere", chance: 0.35 }]
  },

  {
    id:       "troll_grotte",
    name:     "Troll des Cavernes",
    icon:     "🗿",
    imgSrc:   "img/monsters/troll_grotte.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Un Troll des cavernes énorme fait trembler le sol à chaque pas",
    lore:     "Bien plus imposant que ses cousins des toilettes, le Troll des cavernes mesure plus de quatre mètres. Sa peau calcifiée par des siècles de vie souterraine dévie la plupart des sorts ordinaires, et ses coups de massue peuvent effondrer des voûtes entières.",
    habitat:  "Cavernes profondes, égouts de Poudlard et couloirs taillés dans la roche brute",
    anecdote: "Un cousin du troll lâché par Quirrell lors de la fête d'Halloween — bien plus redoutable que son cousin des toilettes.",
    danger:   8,
    minFloor: 5, maxFloor: 9, weight: 5,
    hp: 55, atk: 17, def: 9, mag: 0, agi: 5, lck: 4,
    scale: 0.28,
    abilities: [
      { name: "Smash Dévastateur", icon: "🪨", desc: "Frappe de masse titanesque",   effect: "damage", power: 15, chance: 0.30 },
      { name: "Coup de Tête",      icon: "💥", desc: "Charge brutale",                effect: "damage", power: 10, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: ["physique", "ténèbres"],
    weak:   ["feu"],
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
    imgSrc:   "img/monsters/sorcier_renegat.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Un sorcier passé du côté des Ténèbres vous affronte avec une haine froide",
    lore:     "Ancien élève brillant de Serpentard qui a succombé aux promesses de pouvoir de Voldemort. Il combat avec une haine froide et calculée, utilisant la magie noire pour se soigner en plein combat. Il méprise ceux qui résistent aux Ténèbres.",
    habitat:  "Passages secrets, bibliothèque interdite et cachots de Serpentard",
    anecdote: "Beaucoup d'entre eux étaient des camarades de classe de Harry avant de basculer du côté des Ténèbres à la demande de leurs familles.",
    danger:   7,
    minFloor: 5, maxFloor: null, weight: 7,
    hp: 35, atk: 10, def: 5, mag: 12, agi: 11, lck: 9,
    scale: 0.28,
    abilities: [
      { name: "Stupefix Noir",       icon: "⚡", desc: "Sort d'étourdissement",       effect: "damage", power: 8,  chance: 0.30 },
      { name: "Soins des Ténèbres",  icon: "💚", desc: "Se soigne par magie sombre",  effect: "heal",   power: 12, chance: 0.25 }
    ],
    ai: "cautious",
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 35, gold: { min: 18, max: 28 },
    drops:  [
      { itemId: "potion_m",         chance: 0.20 },
      { itemId: "wand1",            chance: 0.08 },
      { itemId: "talisman_tactique",chance: 0.03 }
    ]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 6-10 : Les Abysses de Poudlard
  // ════════════════════════════════════════════

  {
    id:       "basilic",
    epic:     true,
    name:     "Basilic Mineur",
    icon:     "🐉",
    imgSrc:   "img/monsters/basilic.png",
    category: "être magique",
    loreFamily: "F5",
    desc:     "Un jeune basilic surgit — ne croisez pas son regard !",
    lore:     "Serpent géant créé par Salazar Serpentard lui-même. Son regard direct tue instantanément ; un regard indirect pétrifie pour des mois. Seuls le cri du coq ou son propre reflet dans un miroir peuvent le vaincre. Il répond uniquement au Fourchelang.",
    habitat:  "Chambre des Secrets, profondément sous les fondations de Poudlard",
    anecdote: "Harry l'affronte à 12 ans armé de l'épée de Gryffondor, guidé par Fumseck le Phénix (La Chambre des Secrets).",
    danger:   10,
    minFloor: 6, maxFloor: null, weight: 4,
    hp: 60, atk: 20, def: 8, mag: 12, agi: 8, lck: 10,
    scale: 0.35,
    abilities: [
      { name: "Regard Pétrifiant", icon: "👁️", desc: "Draine la vitalité par son regard", effect: "drain",  power: 14, chance: 0.35 },
      { name: "Morsure du Roi",    icon: "🐍", desc: "Morsure venimeuse mortelle",         effect: "damage", power: 16, chance: 0.25 }
    ],
    ai: "aggressive",
    // À mi-vie, le basilic entre en frénésie et empoisonne par sa morsure.
    phases: [
      { atPct: 0.5, atkMult: 1.3,
        msg: "Le basilic siffle de rage et frappe avec une violence redoublée !",
        gainAbility: { name: "Venin Mortel", icon: "🟢", desc: "Inocule un venin rongeur",
          effect: "status", statusId: "poison", power: 5, chance: 0.5, turns: 3 } }
    ],
    resist: ["feu", "physique", "disarm"],
    weak:   ["glace"],
    xp: 80, gold: { min: 35, max: 50 },
    drops:  [
      { itemId: "felix",    chance: 0.15 },
      { itemId: "amulette", chance: 0.05 },
      { itemId: "potion_s", chance: 0.30 }
    ]
  },

  {
    id:       "chimere",
    epic:     true,
    name:     "Chimère de Poudlard",
    icon:     "🦁",
    imgSrc:   "img/monsters/chimere.png",
    category: "créature",
    loreFamily: "F5",
    desc:     "La Chimère rugit de ses trois têtes et crache des flammes !",
    lore:     "Créature mythologique rarissime possédant une tête de lion, une de chèvre et une queue-serpent. Elle n'a été vaincue qu'une seule fois dans l'histoire des sorciers.",
    habitat:  "Profondeurs inaccessibles du château et cavernes de pierre ancienne",
    anecdote: "Gilderoy Lockhart prétendit avoir vaincu une Chimère en Grèce — en réalité, il effaça les souvenirs du vrai héros et s'attribua l'exploit (Les Mémoires d'un Lockhart).",
    danger:   9,
    minFloor: 6, maxFloor: null, weight: 3,
    hp: 65, atk: 19, def: 9, mag: 8, agi: 10, lck: 8,
    scale: 0.32,
    abilities: [
      { name: "Souffle de Feu",    icon: "🔥", desc: "Flammes dévastatrices",          effect: "damage", power: 14, chance: 0.30 },
      { name: "Morsure du Lion",   icon: "🦁", desc: "Morsure puissante",               effect: "damage", power: 12, chance: 0.25 },
      { name: "Charge de Chèvre",  icon: "🐐", desc: "Coup de cornes qui affaiblit",   effect: "weaken", power: 4,  chance: 0.20 }
    ],
    ai: "aggressive",
    resist: ["feu"],
    weak:   ["glace"],
    xp: 75, gold: { min: 30, max: 48 },
    drops:  [
      { itemId: "potion_m", chance: 0.20 },
      { itemId: "felix",    chance: 0.08 }
    ]
  },

  {
    id:       "ombre_quirrell",
    epic:     true,
    name:     "Ombre de Quirrell",
    icon:     "🎭",
    imgSrc:   "img/monsters/ombre_quirrell.png",
    category: "être magique",
    loreFamily: "F5",
    desc:     "L'ombre de Quirinus Quirrell surgit, portant Voldemort sous son turban !",
    lore:     "Avant d'être démasqué, Quirinus Quirrell portait Voldemort sous son turban. Son ombre hante encore les couloirs de Poudlard, cherchant la Pierre Philosophale.",
    habitat:  "Couloirs des niveaux interdits et Salle des Défenses Magiques",
    anecdote: "Quirrell mourut au contact de Harry — la magie du sang sacrificiel de Lily le consuma lorsqu'il tenta d'étrangler le jeune sorcier (La Sorcière de l'Est).",
    danger:   9,
    minFloor: 6, maxFloor: null, weight: 3,
    hp: 50, atk: 12, def: 4, mag: 16, agi: 10, lck: 8,
    scale: 0.32,
    abilities: [
      { name: "Magie Partagée",    icon: "🟣", desc: "Deux esprits en un seul corps",  effect: "damage", power: 13, chance: 0.35 },
      { name: "Possession Obscure",icon: "🌑", desc: "Draine la volonté",              effect: "drain",  power: 11, chance: 0.25 },
      { name: "Contre-Sort Rapide",icon: "💚", desc: "Récupère de l'énergie",          effect: "heal",   power: 14, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "disarm"],
    weak:   ["lumière"],
    xp: 65, gold: { min: 28, max: 44 },
    drops:  [
      { itemId: "wand1",    chance: 0.10 },
      { itemId: "potion_m", chance: 0.20 }
    ]
  },

  {
    // Boss de quête (Épreuve de la Lumière Éternelle). weight:0 → jamais
    // tiré dans le pool aléatoire ; apparaît uniquement via le spawn de
    // quête. Cf. .claude/plans/dumbledore-lux-aeterna.md.
    id:       "bibliothecaire_ombre",
    epic:     true,
    name:     "le Bibliothécaire d'Ombre",
    icon:     "📖",
    imgSrc:   "img/monsters/bibliothecaire_ombre.png",
    category: "fantôme",
    loreFamily: "F5",
    desc:     "Une silhouette voûtée se redresse entre les rayonnages — un spectre dont les yeux sont deux pages noircies.",
    lore:     "Ancien bibliothécaire de Poudlard, il amassa par avidité de savoir un grimoire de lumière qu'il ne sut jamais lire. L'éclat du livre le consuma de l'intérieur ; l'ombre prit ce qu'il restait. Il garde encore le grimoire scellé, jaloux d'un trésor qu'il ne peut plus toucher.",
    habitat:  "Réserve oubliée de la bibliothèque, derrière les rayonnages scellés",
    anecdote: "On dit qu'il classe encore les ouvrages la nuit, par ordre alphabétique d'âmes.",
    danger:   10,
    minFloor: 6, maxFloor: null, weight: 0,
    hp: 95, atk: 16, def: 7, mag: 21, agi: 11, lck: 9,
    scale: 0.32,
    abilities: [
      { name: "Murmure des Pages Mortes", icon: "🌑", desc: "Récite une malédiction d'encre",
        effect: "damage", power: 15, chance: 0.40 },
      { name: "Reliure d'Ombre",          icon: "🩸", desc: "Draine la lumière vitale",
        effect: "drain",  power: 12, chance: 0.28 },
      { name: "Silence Écrasant",         icon: "😱", desc: "Un calme de tombeau saisit la cible",
        effect: "status", statusId: "fear", power: 0, chance: 0.22, turns: 2 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "disarm"],
    weak:   ["lumière"],
    xp: 130, gold: { min: 40, max: 70 },
    drops:  [{ itemId: "potion_l", chance: 0.30 }]
  },

  {
    id:       "nagini",
    epic:     true,
    name:     "Nagini",
    icon:     "🐲",
    imgSrc:   "img/monsters/nagini.png",
    category: "être magique",
    loreFamily: "F4",
    desc:     "Un serpent-horcruxe d'une puissance terrifiante se dresse devant vous",
    lore:     "Ancienne sorcière maudite transformée en serpent-horcruxe. Elle possède l'intelligence d'un humain et la cruauté d'un prédateur. En tant que dernier horcruxe, sa mort est indispensable à la chute de Voldemort.",
    habitat:  "Chambre des Secrets et forêt interdite, toujours aux côtés de son maître",
    anecdote: "Neville Londubat la décapite avec l'épée de Gryffondor lors de la Bataille de Poudlard, brisant ainsi le dernier horcruxe (Les Reliques de la Mort).",
    danger:   10,
    minFloor: 7, maxFloor: null, weight: 3,
    hp: 55, atk: 18, def: 7, mag: 15, agi: 12, lck: 8,
    scale: 0.36,
    abilities: [
      { name: "Morsure Horcruxe",    icon: "💀", desc: "Draine l'énergie vitale",  effect: "drain", power: 12, chance: 0.40 },
      { name: "Régénération Sombre", icon: "🟢", desc: "Récupère des PV",           effect: "heal",  power: 15, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "disarm"],
    weak:   ["feu"],
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
    imgSrc:   "img/monsters/mangemort_elite.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Un Mangemort d'élite en armure noire vous fixe avec mépris",
    lore:     "Membres du cercle intérieur de Voldemort, portant la Marque des Ténèbres depuis des décennies. Leur maîtrise des malédictions impardonnables est absolue. Ils ont juré allégeance totale et préfèrent la mort à la capture.",
    habitat:  "Donjons profonds et Salle sur Demande corrompue",
    anecdote: "Ils forment la garde rapprochée de Voldemort lors de la Bataille de Poudlard, semant la terreur dans les rangs de l'Ordre du Phénix.",
    danger:   9,
    minFloor: 7, maxFloor: null, weight: 4,
    hp: 55, atk: 16, def: 8, mag: 16, agi: 11, lck: 9,
    scale: 0.38,
    abilities: [
      { name: "Cruciatus Noir",      icon: "⚡", desc: "Sort de torture intense",     effect: "drain",  power: 14, chance: 0.30 },
      { name: "Magie Noire Pure",    icon: "🟣", desc: "Magie des ténèbres absolue",  effect: "damage", power: 15, chance: 0.35 },
      { name: "Expelliarmus Sombre", icon: "⚫", desc: "Désarme et affaiblit",         effect: "weaken", power: 3,  chance: 0.20 },
      { name: "Marque Brûlante",     icon: "🔥", desc: "Marque incandescente sur la peau", effect: "status", statusId: "burn", power: 5, chance: 0.25, turns: 3 },
      { name: "Dissipation Noire",   icon: "❌", desc: "Dissipe les protections magiques", effect: "dispel", chance: 0.30 }
    ],
    ai: "aggressive",
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 70, gold: { min: 28, max: 42 },
    // Jalon tranche C (ét. 7-10) du fil rouge « Clé de Voûte » : drop garanti.
    drops:  [
      { itemId: "potion_m",     chance: 0.25 },
      { itemId: "wand1",        chance: 0.10 },
      { itemId: "wand2",        chance: 0.05 },
      { itemId: "casque_aurore",chance: 0.04 },
      { itemId: "cor_pegasse",  chance: 0.05 },
      { itemId: "eclat_voute",  chance: 1.0 }
    ]
  },

  // ════════════════════════════════════════════
  // ÉTAGES 8-10 : Les Seigneurs des Ténèbres
  // ════════════════════════════════════════════

  {
    id:       "bellatrix",
    epic:     true,
    name:     "Bellatrix Lestrange",
    icon:     "🧙‍♀️",
    imgSrc:   "img/monsters/bellatrix.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Bellatrix Lestrange éclate d'un rire dément et brandit sa baguette !",
    lore:     "La plus fanatique des Mangemorts. Son rire dément précède chaque torture. Elle a poussé les parents de Neville Londubat à la folie à l'aide du Cruciatus, et est restée fidèle à Voldemort même durant ses treize années à Azkaban.",
    habitat:  "Donjon des Mangemorts et Ministère de la Magie corrompu",
    anecdote: "Tuée par Molly Weasley lors de la Bataille de Poudlard après avoir visé Ginny (Les Reliques de la Mort).",
    danger:   10,
    minFloor: 8, maxFloor: null, weight: 2,
    hp: 70, atk: 20, def: 8, mag: 20, agi: 13, lck: 12,
    scale: 0.40,
    abilities: [
      { name: "Avada Kedavra",       icon: "💚", desc: "Sort de la mort",               effect: "damage", power: 25, chance: 0.25 },
      { name: "Cruciatus Intense",   icon: "⚡", desc: "Sort de torture suprême",        effect: "drain",  power: 16, chance: 0.30 },
      { name: "Sonore Maudit",       icon: "📣", desc: "Cri de démence déstabilisant",  effect: "weaken", power: 4,  chance: 0.20 },
      { name: "Régénération Noire",  icon: "💜", desc: "Se soigne par passion pour les ténèbres", effect: "heal", power: 16, chance: 0.15 },
      { name: "Sortilège Sanglant",  icon: "🩸", desc: "Inflige une plaie qui saigne",  effect: "status", statusId: "bleed", power: 6, chance: 0.30, turns: 3 },
      { name: "Finite Incantatem",   icon: "❌", desc: "Brise les sortilèges de soutien", effect: "dispel", chance: 0.50 }
    ],
    ai: "aggressive",
    resist: ["ténèbres", "disarm"],
    weak:   ["lumière"],
    xp: 130, gold: { min: 50, max: 80 },
    drops:  [
      { itemId: "felix",          chance: 0.30 },
      { itemId: "wand2",          chance: 0.15 },
      { itemId: "amulette",       chance: 0.10 },
      { itemId: "anneau_runique", chance: 0.10 }
    ]
  },

  {
    id:       "voldemort_affaibli",
    epic:     true,
    name:     "Voldemort Affaibli",
    icon:     "🩻",
    imgSrc:   "img/monsters/voldemort_affaibli.png",
    category: "être magique",
    loreFamily: "F4",
    desc:     "Une forme spectrale de Lord Voldemort se dresse devant vous",
    lore:     "Sans corps ni horcrux, Voldemort subsiste à peine. Mais même réduit à l'état de spectre, il reste d'une dangerosité absolue.",
    habitat:  "Forêt d'Albanie, profondeurs interdites et lieux corrompus par les Ténèbres",
    anecdote: "Réduit à cet état après l'échec de la malédiction de la mort sur Harry, Voldemort survécut sous forme de parasite pendant dix ans avant de trouver un hôte (La Sorcière de l'Est).",
    danger:   10,
    minFloor: 9, maxFloor: null, weight: 2,
    hp: 80, atk: 22, def: 10, mag: 20, agi: 8, lck: 15,
    scale: 0.40,
    abilities: [
      { name: "Avada Kedavra",  icon: "💚", desc: "Sort de la mort",               effect: "damage", power: 30, chance: 0.30 },
      { name: "Cruciatus",      icon: "⚡", desc: "Sort de torture",                effect: "drain",  power: 18, chance: 0.25 },
      { name: "Ombre Tenace",   icon: "🌑", desc: "Récupère de l'énergie obscure", effect: "heal",   power: 20, chance: 0.20 }
    ],
    ai: "aggressive",
    resist: ["ténèbres", "feu", "disarm"],
    weak:   ["lumière"],
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
    epic:     true,
    name:     "Voldemort Ressuscité",
    icon:     "💀",
    imgSrc:   "img/monsters/voldemort_revenu.png",
    category: "être magique",
    loreFamily: "F4",
    desc:     "Lord Voldemort, pleinement ressuscité, vous contemple avec froideur absolue !",
    lore:     "Celui-Dont-On-Ne-Doit-Pas-Prononcer-Le-Nom. Il a divisé son âme en sept horcruxes pour conquérir l'immortalité. Revenu grâce aux os de son père, à la chair de Pettigrow et au sang de Harry, il est désormais plus puissant et plus impitoyable que jamais.",
    habitat:  "Chambre des Secrets — niveau final, sous les racines mêmes du château",
    anecdote: "Vaincu définitivement par Harry grâce au sacrifice de sa mère et à l'amour qui en découle (Les Reliques de la Mort).",
    danger:   11,
    minFloor: 10, maxFloor: null, weight: 1,
    hp: 100, atk: 28, def: 14, mag: 25, agi: 10, lck: 15,
    scale: 0.40,
    abilities: [
      { name: "Avada Kedavra",      icon: "💚", desc: "Sort de la mort imparable",       effect: "damage", power: 35, chance: 0.70 },
      { name: "Cruciatus Absolu",   icon: "⚡", desc: "Torture au-delà de l'imaginable", effect: "drain",  power: 22, chance: 0.25 },
      { name: "Nagini te Convoque", icon: "🐍", desc: "Invoque Nagini pour se soigner",  effect: "heal",   power: 25, chance: 0.20 },
      { name: "Marque des Ténèbres",icon: "🌑", desc: "Marque qui ronge les défenses",   effect: "weaken", power: 6,  chance: 0.15 },
      { name: "Sortilège Brisé",    icon: "❌", desc: "Anéantit toute protection",        effect: "dispel", chance: 0.70 }
    ],
    ai: "aggressive",
    // Phases (triées par seuil de PV décroissant). Le Seigneur des Ténèbres
    // déchaîne sa fureur à mi-vie, puis terrifie le groupe quand il est acculé.
    phases: [
      { atPct: 0.5,  atkMult: 1.25, magMult: 1.2,
        msg: "Voldemort déchaîne sa fureur — sa magie redouble de puissance !" },
      { atPct: 0.25, magMult: 1.15,
        msg: "Acculé, Voldemort invoque les Ténèbres pour terrifier ses adversaires !",
        gainAbility: { name: "Terreur Mortelle", icon: "😱", desc: "Insuffle une peur paralysante",
          effect: "status", statusId: "fear", power: 0, chance: 0.5, turns: 2 } }
    ],
    resist: ["ténèbres", "feu", "glace", "disarm"],
    weak:   ["lumière"],
    xp: 350, gold: { min: 120, max: 200 },
    drops:  [
      { itemId: "felix",            chance: 0.60 },
      { itemId: "wand2",            chance: 0.40 },
      { itemId: "amulette",         chance: 0.30 },
      { itemId: "retourneur_temps", chance: 0.20 }
    ]
  },

  // ── Nouveaux monstres ────────────────────────────────────────

  {
    id: "niffleur", name: "Niffleur", icon: "🦡", imgSrc: "img/monsters/niffleur.png", category: "créature",
    loreFamily: "F2",
    desc: "Un Niffleur fouilleur vous a repéré — et votre bourse l'attire !",
    lore: "Petite créature à fourrure noire qui raffole des objets brillants.",
    habitat: "Terriers et cachots à trésor", danger: 2,
    anecdote: "Norbert Dragonneau utilisait un Niffleur pour le commerce illicite d'or dans les années 1920 — la bête vida plusieurs coffres de Gringotts à elle seule (Les Animaux Fantastiques).",
    minFloor: 2, maxFloor: 5, weight: 9,
    hp: 18, atk: 4, def: 1, mag: 0, agi: 14, lck: 10, scale: 0.18,
    abilities: [
      { name: "Vol de Gallions", icon: "🪙", desc: "Vole 5-15 Gallions",
        effect: "drain", power: 5, chance: 0.40 }
    ],
    ai: "cautious", resist: [], weak: ["physique"],
    xp: 20, gold: { min: 8, max: 25 },
    drops: [{ itemId: "mandragore", chance: 0.20 }, { itemId: "herbe_armoise", chance: 0.15 }]
  },

  {
    id: "elfe_rebelle", name: "Elfe de Maison Rebelle", icon: "👺", imgSrc: "img/monsters/elfe_rebelle.png", category: "être magique",
    loreFamily: "F1",
    desc: "Un elfe de maison affranchi de force lance des assiettes avec rage !",
    lore: "Elfe rendu fou par une libération forcée, errant dans les couloirs.",
    habitat: "Cuisines et couloirs", danger: 3,
    anecdote: "Dobby fut libéré par Harry en glissant une chaussette dans le livre de Lucius Malefoy — la loi oblige le maître à offrir un vêtement pour rendre l'elfe libre (La Chambre des Secrets).",
    minFloor: 2, maxFloor: 6, weight: 8,
    hp: 22, atk: 5, def: 2, mag: 6, agi: 12, lck: 8, scale: 0.22,
    abilities: [
      { name: "Assiette Volante", icon: "🍽️", desc: "Projectile (8 dégâts)",
        effect: "damage", power: 8, chance: 0.35 }
    ],
    ai: "random", resist: ["disarm"], weak: ["feu"],
    xp: 25, gold: { min: 6, max: 18 },
    drops: [{ itemId: "choco_sorcier", chance: 0.30 }]
  },

  {
    id: "bowtruckle", name: "Bowtruckle Géant", icon: "🌿", imgSrc: "img/monsters/bowtruckle.png", category: "créature",
    loreFamily: "F1",
    desc: "Un Bowtruckle de la taille d'un enfant surgit de l'obscurité !",
    lore: "Gardien des arbres à baguettes magiques, redoutable quand il protège son arbre.",
    habitat: "Couloirs ombragés près des fenêtres", danger: 2,
    anecdote: "Norbert Dragonneau apprivoisa un Bowtruckle nommé Pickett qui vécut dans sa poche de manteau et refusa de le quitter (Les Animaux Fantastiques).",
    minFloor: 1, maxFloor: 3, weight: 10,
    hp: 14, atk: 6, def: 3, mag: 0, agi: 8, lck: 6, scale: 0.15,
    abilities: [
      { name: "Griffes de Branche", icon: "🌱", desc: "Réduit DEF (-1)",
        effect: "weaken", power: 1, chance: 0.25 }
    ],
    ai: "aggressive", resist: [], weak: ["feu"],
    xp: 12, gold: { min: 3, max: 10 },
    drops: [{ itemId: "wand1", chance: 0.08 }, { itemId: "herbe_armoise", chance: 0.25 }]
  },

  {
    id: "chevalier_fantome", name: "Chevalier Fantôme", icon: "⚔️", imgSrc: "img/monsters/chevalier_fantome.png", category: "fantôme",
    loreFamily: "F3",
    desc: "L'armure vide s'anime ! Un chevalier fantôme vous barre le passage !",
    lore: "Ancien gardien de Poudlard, condamné à veiller les couloirs pour l'éternité.",
    habitat: "Galeries et salles d'armures", danger: 6,
    anecdote: "Les armures enchantées de Poudlard furent mobilisées lors de la Bataille de Poudlard pour défendre les couloirs contre les envahisseurs de Voldemort.",
    minFloor: 4, maxFloor: 9, weight: 6,
    hp: 45, atk: 12, def: 8, mag: 4, agi: 7, lck: 5, scale: 0.28,
    abilities: [
      { name: "Coup de Lance", icon: "🏹", desc: "Attaque puissante (15 dégâts)",
        effect: "damage", power: 15, chance: 0.35 },
      { name: "Aura Glaciale", icon: "❄️", desc: "Affaiblit les deux adversaires",
        effect: "weaken", power: 2, chance: 0.20 }
    ],
    ai: "aggressive", resist: ["physique", "ténèbres"], weak: ["lumière"],
    xp: 60, gold: { min: 20, max: 50 },
    drops: [{ itemId: "robe1", chance: 0.15 }, { itemId: "potion_s", chance: 0.25 }]
  },

  {
    id: "gremlin_magique", name: "Gremlin Magique", icon: "👾", imgSrc: "img/monsters/gremlin_magique.png", category: "créature",
    loreFamily: "F2",
    desc: "Un Gremlin surgit des conduits magiques en crachant des étincelles !",
    lore: "Petite créature chaotique qui se nourrit d'énergie magique.",
    habitat: "Conduits de ventilation et salles mécaniques", danger: 4,
    anecdote: "Des créatures similaires aux Gremlins auraient saboté les balais des équipes de Quidditch du Ministère pendant la Seconde Guerre, provoquant plusieurs accidents mortels.",
    minFloor: 3, maxFloor: 7, weight: 7,
    hp: 28, atk: 7, def: 3, mag: 10, agi: 16, lck: 9, scale: 0.24,
    abilities: [
      { name: "Drain Magique", icon: "⚡", desc: "Vole 6 PM à la cible",
        effect: "drain", power: 6, chance: 0.40 },
      { name: "Surcharge Arcanique", icon: "🔮", desc: "Dégâts magiques (12)",
        effect: "damage", power: 12, chance: 0.25 }
    ],
    ai: "random", resist: ["feu"], weak: ["foudre"],
    xp: 35, gold: { min: 10, max: 28 },
    drops: [{ itemId: "potion_m", chance: 0.20 }]
  },

  {
    id: "manticore_jeune", name: "Manticore Juvénile", icon: "🦁", imgSrc: "img/monsters/manticore_jeune.png", category: "bête",
    loreFamily: "F2",
    desc: "Une jeune Manticore rugit, sa queue-scorpion dressée vers vous !",
    lore: "Créature mi-lion mi-scorpion, classée parmi les plus dangereuses.",
    habitat: "Souterrains profonds et salles secrètes", danger: 8,
    anecdote: "La peau d'une Manticore adulte repousse n'importe quel sortilège — les Aurors utilisent des sorts de glace pour les ralentir avant toute tentative de capture.",
    minFloor: 6, maxFloor: null, weight: 4,
    hp: 65, atk: 18, def: 10, mag: 5, agi: 12, lck: 7, scale: 0.38,
    abilities: [
      { name: "Piqûre de Venin", icon: "🦂", desc: "Poison (20 dégâts + drain)",
        effect: "drain", power: 20, chance: 0.30 },
      { name: "Rugissement Terrifiant", icon: "😱", desc: "Affaiblit toute la troupe",
        effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "aggressive", resist: ["ténèbres", "disarm"], weak: ["glace"],
    xp: 90, gold: { min: 30, max: 70 },
    drops: [{ itemId: "felix", chance: 0.10 }, { itemId: "potion_force", chance: 0.20 }]
  },

  {
    id: "gardien_portail", name: "Gardien du Portail", icon: "🗿", imgSrc: "img/monsters/gardien_portail.png", category: "être magique",
    loreFamily: "F5",
    desc: "Un golem de pierre prend vie, gardien des passages secrets !",
    lore: "Créé par un ancien directeur pour protéger les zones interdites.",
    habitat: "Passages secrets et portes magiques", danger: 7,
    anecdote: "Certains directeurs de Poudlard créèrent des gardiens de pierre en utilisant des enchantements Animagi interdits, jugés trop dangereux même pour les archives officielles.",
    minFloor: 5, maxFloor: null, weight: 5,
    hp: 80, atk: 14, def: 15, mag: 2, agi: 4, lck: 3, scale: 0.30,
    abilities: [
      { name: "Écrasement", icon: "💪", desc: "Frappe colossale (18 dégâts)",
        effect: "damage", power: 18, chance: 0.30 },
      { name: "Régénération de Pierre", icon: "🏔️", desc: "Récupère 12 PV",
        effect: "heal", power: 12, chance: 0.20 }
    ],
    ai: "aggressive", resist: ["physique", "feu"], weak: ["foudre"],
    xp: 75, gold: { min: 25, max: 55 },
    drops: [{ itemId: "chapeau_pointu", chance: 0.08 }, { itemId: "robe1", chance: 0.18 }]
  },

  {
    id: "fantome_sang_noir", name: "Fantôme du Sang Noir", icon: "👻", imgSrc: "img/monsters/fantome_sang_noir.png", category: "fantôme",
    loreFamily: "F3",
    desc: "Un spectre des temps anciens, furieux contre les sang-de-bourbe !",
    lore: "Esprit d'un sorcier puriste mort en combattant Dumbledore.",
    habitat: "Cachots de Serpentard", danger: 5,
    anecdote: "Les partisans de la pureté du sang qui moururent sans clore leurs affaires restent parfois liés au château — leur haine les empêche de partir vers l'au-delà.",
    minFloor: 3, maxFloor: 8, weight: 6,
    hp: 35, atk: 10, def: 6, mag: 12, agi: 10, lck: 6, scale: 0.25,
    abilities: [
      { name: "Terreur Spectrale", icon: "😨", desc: "Dégâts psychiques (14)",
        effect: "damage", power: 14, chance: 0.35 },
      { name: "Possession Partielle", icon: "🌀", desc: "Drain PV (8)",
        effect: "drain", power: 8, chance: 0.30 }
    ],
    ai: "cautious", resist: ["physique", "disarm"], weak: ["lumière"],
    xp: 45, gold: { min: 12, max: 35 },
    drops: [{ itemId: "livre_soin", chance: 0.05 }]
  },

  // ════════════════════════════════════════════
  // VAMPIRES — Créatures suceuses de vie
  // ════════════════════════════════════════════

  {
    id: "chauve_souris_vampire", name: "Chauve-Souris Vampire", icon: "🦇", imgSrc: "img/monsters/chauve_souris_vampire.png", category: "bête",
    loreFamily: "F2",
    desc: "Une nuée de chauves-souris assoiffées de sang fond sur vous !",
    lore: "Cousine corrompue des chauves-souris ordinaires. Ses canines acérées percent la peau en un clin d'œil et drainent juste assez de sang pour affaiblir une proie sans la tuer — la bête préfère revenir festoyer chaque nuit.",
    habitat: "Beffrois abandonnés et combles humides du château",
    anecdote: "On en trouve encore des colonies dans les ruines des anciens dortoirs de Serpentard.",
    danger: 4,
    minFloor: 2, maxFloor: 6, weight: 7,
    hp: 22, atk: 5, def: 2, mag: 4, agi: 14, lck: 8, scale: 0.22,
    abilities: [
      { name: "Morsure Sanguinaire", icon: "🩸", desc: "Drain de sang",
        effect: "drain", power: 6, chance: 0.45 }
    ],
    ai: "aggressive", resist: [], weak: ["lumière", "feu"],
    xp: 22, gold: { min: 6, max: 14 },
    drops: [{ itemId: "potion_s", chance: 0.15 }]
  },

  {
    id: "vampire_mineur", name: "Vampire Novice", icon: "🧛", imgSrc: "img/monsters/vampire_mineur.png", category: "être magique",
    loreFamily: "F3",
    desc: "Un Vampire Novice surgit de l'ombre, ses crocs étincelants !",
    lore: "Sorcier ou moldu fraîchement transformé, encore vorace et imprudent. Sa soif est si intense qu'il attaque à découvert — mais sa résistance aux sorts de feu reste limitée. Une simple Lumos prolongée suffit à le brûler.",
    habitat: "Cachots inférieurs et passages secrets de la Forêt Interdite",
    anecdote: "Il existerait une caste de vampires sympathisants à Voldemort, recrutée pendant la Seconde Guerre des sorciers.",
    danger: 6,
    minFloor: 4, maxFloor: 8, weight: 6,
    hp: 60, atk: 9, def: 5, mag: 8, agi: 12, lck: 10, scale: 0.28,
    abilities: [
      { name: "Étreinte Mortelle", icon: "🩸", desc: "Drain puissant",
        effect: "drain", power: 10, chance: 0.40 },
      { name: "Regard Hypnotique", icon: "👁️", desc: "Réduit la défense",
        effect: "weaken", power: 2, chance: 0.20 }
    ],
    ai: "cautious", resist: ["ténèbres"], weak: ["lumière", "feu"],
    xp: 50, gold: { min: 18, max: 32 },
    drops: [
      { itemId: "potion_m", chance: 0.20 },
      { itemId: "potion_s", chance: 0.20 }
    ]
  },

  {
    id: "strigoi", name: "Strigoï Ancien", icon: "🩸", imgSrc: "img/monsters/strigoi.png", category: "être magique",
    loreFamily: "F3",
    desc: "Un Strigoï millénaire émerge de son cercueil, des siècles de soif dans les yeux !",
    lore: "Ces vampires anciens n'ont plus rien d'humain. Leur peau a la couleur du parchemin et leur soif est insatiable. Ils maîtrisent une magie du sang qui leur permet de drainer plusieurs proies à distance.",
    habitat: "Cryptes oubliées sous Poudlard, salles funéraires des fondateurs",
    anecdote: "Salazar Serpentard aurait fait alliance avec un Strigoï pour protéger sa Chambre des Secrets — d'où la résistance à la magie noire.",
    danger: 8,
    minFloor: 6, maxFloor: null, weight: 4,
    hp: 110, atk: 14, def: 8, mag: 14, agi: 11, lck: 12, scale: 0.32,
    abilities: [
      { name: "Sangsue Spectrale", icon: "🦇", desc: "Drain à distance",
        effect: "drain", power: 14, chance: 0.40 },
      { name: "Brume Sanglante", icon: "🌫️", desc: "Affaiblit l'âme",
        effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "aggressive", resist: ["ténèbres", "disarm"], weak: ["lumière", "feu"],
    xp: 110, gold: { min: 35, max: 60 },
    drops: [
      { itemId: "felix", chance: 0.12 },
      { itemId: "wand2", chance: 0.05 },
      { itemId: "potion_m", chance: 0.30 }
    ]
  },

  // ════════════════════════════════════════════
  // MAUDITS — Porteurs de malédictions
  // ════════════════════════════════════════════

  {
    id: "poupee_maudite", name: "Poupée Maudite", icon: "🪆", imgSrc: "img/monsters/poupee_maudite.png", category: "être magique",
    loreFamily: "F3",
    desc: "Une poupée de chiffon flotte vers vous, un sourire cousu sur le visage !",
    lore: "Réceptacle d'une malédiction ancienne, lancée par une sorcière vengeresse. Chaque entaille sur sa toile reproduit une douleur sur sa cible, et chaque cheveu cousu transmet l'infortune.",
    habitat: "Greniers oubliés et coffres scellés des cachots",
    anecdote: "On raconte qu'une de ces poupées a poursuivi son propriétaire pendant trente ans avant d'être détruite par un Riddikulus.",
    danger: 5,
    minFloor: 3, maxFloor: 7, weight: 5,
    hp: 48, atk: 6, def: 4, mag: 12, agi: 8, lck: 6, scale: 0.25,
    abilities: [
      { name: "Aiguille Maudite", icon: "📍", desc: "Malédiction de douleur",
        effect: "damage", power: 8, chance: 0.40 },
      { name: "Brise-Force", icon: "💔", desc: "Affaiblit la cible",
        effect: "weaken", power: 2, chance: 0.30 }
    ],
    ai: "random", resist: ["ténèbres"], weak: ["feu"],
    xp: 40, gold: { min: 12, max: 22 },
    drops: [{ itemId: "livre_prince", chance: 0.04 }]
  },

  {
    id: "spectre_maudit", name: "Spectre Maudit", icon: "👻", imgSrc: "img/monsters/spectre_maudit.png", category: "fantôme",
    loreFamily: "F3",
    desc: "Un spectre enchaîné hurle, son corps couvert de runes maudites !",
    lore: "Âme d'un sorcier puni par une malédiction d'éternité — il ne peut ni mourir ni se reposer. Sa rage incandescente se déverse en sortilèges noirs sur toute âme vivante qui croise son chemin.",
    habitat: "Donjons des cachots, salles d'interrogatoire abandonnées",
    anecdote: "Plusieurs spectres maudits seraient d'anciens Aurors capturés par des Mangemorts pendant la Première Guerre.",
    danger: 7,
    minFloor: 5, maxFloor: null, weight: 5,
    hp: 80, atk: 11, def: 6, mag: 18, agi: 13, lck: 9, scale: 0.30,
    abilities: [
      { name: "Sort Maudit", icon: "☠️", desc: "Magie noire",
        effect: "damage", power: 14, chance: 0.45 },
      { name: "Marque du Tourment", icon: "🩻", desc: "Affaiblit ATK et DEF",
        effect: "weaken", power: 3, chance: 0.25 }
    ],
    ai: "aggressive", resist: ["ténèbres", "disarm"], weak: ["lumière"],
    xp: 75, gold: { min: 22, max: 38 },
    drops: [
      { itemId: "potion_m", chance: 0.25 },
      { itemId: "wand2", chance: 0.06 },
      { itemId: "eclat_lumiere", chance: 0.35 }
    ]
  },

  {
    id: "hecate_sorciere", name: "Hécate la Maudisseuse", icon: "🔮", imgSrc: "img/monsters/hecate_sorciere.png", category: "humain",
    loreFamily: "F4",
    desc: "Hécate vous toise — sa baguette suinte d'une fumée noire de malédictions !",
    lore: "Sorcière exclue de Poudlard pour pratique de magie interdite. Devenue spécialiste des malédictions héréditaires, elle hante les couloirs en quête d'apprentis à corrompre. Son rire fait flétrir les torches.",
    habitat: "Salle sur Demande dans sa configuration sombre, cachots interdits",
    anecdote: "Son nom apparaît dans le grimoire familial des Black, mentionnée comme « tante éloignée » par Sirius.",
    danger: 8,
    minFloor: 7, maxFloor: null, weight: 4,
    hp: 130, atk: 10, def: 7, mag: 22, agi: 11, lck: 14, scale: 0.32,
    abilities: [
      { name: "Tarantallegra Forcé", icon: "💃", desc: "Danse maudite",
        effect: "damage", power: 12, chance: 0.30 },
      { name: "Maledictus Funeste", icon: "☠️", desc: "Malédiction d'affaiblissement",
        effect: "weaken", power: 4, chance: 0.30 },
      { name: "Drain de Sortilège", icon: "🩸", desc: "Vol de vie magique",
        effect: "drain", power: 12, chance: 0.25 }
    ],
    ai: "cautious", resist: ["ténèbres", "disarm"], weak: ["lumière"],
    xp: 130, gold: { min: 45, max: 75 },
    drops: [
      { itemId: "wand2", chance: 0.15 },
      { itemId: "livre_prince", chance: 0.10 },
      { itemId: "amulette", chance: 0.08 }
    ]
  },

  // ════════════════════════════════════════════
  // MONSTRES ÉTOURDISSANTS (statut "stun")
  // ════════════════════════════════════════════

  {
    id:       "lutin_cornouailles",
    name:     "Lutin de Cornouailles",
    icon:     "🧚",
    imgSrc:   "img/monsters/lutin_cornouailles.png",
    category: "être magique",
    loreFamily: "F1",
    desc:     "Un lutin bleu électrique fuse vers vous en piaillant !",
    lore:     "Petite créature turbulente d'un bleu vif, le Lutin de Cornouailles ne tient pas en place. Incapable de voler bien longtemps, il préfère saisir oreilles et cheveux, et ses cris stridents suffisent à étourdir un sorcier mal préparé.",
    habitat:  "Couloirs des étages supérieurs, salles de classe abandonnées",
    anecdote: "Gilderoy Lockhart en libéra toute une cage lors d'un cours de Défense contre les Forces du Mal — un fiasco resté célèbre.",
    danger:   3,
    minFloor: 1, maxFloor: 4, weight: 9,
    hp: 11, atk: 3, def: 0, mag: 4, agi: 19, lck: 12,
    scale: 0.18,
    abilities: [
      { name: "Bourrasque Désorientante", icon: "💫", desc: "Cris stridents qui étourdissent la cible",
        effect: "status", statusId: "stun", power: 0, chance: 0.25, turns: 1 }
    ],
    ai: "random",
    resist: ["foudre"],
    weak:   ["physique"],
    xp: 7, gold: { min: 1, max: 5 },
    drops:  []
  },

  {
    id:       "strangulot",
    name:     "Strangulot",
    icon:     "🦑",
    imgSrc:   "img/monsters/strangulot.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "Des doigts gluants jaillissent de l'eau noire et agrippent vos chevilles !",
    lore:     "Petit démon aquatique cornu, le Strangulot tapisse le fond des douves de Poudlard. Ses longs doigts fins sont étonnamment puissants : une étreinte bien placée immobilise une proie le temps de la noyer.",
    habitat:  "Douves, citernes et galeries inondées des cachots",
    anecdote: "Lors de la deuxième tâche du Tournoi des Trois Sorciers, une nuée de Strangulots tenta de retenir les champions au fond du lac.",
    danger:   5,
    minFloor: 3, maxFloor: 7, weight: 6,
    hp: 34, atk: 8, def: 4, mag: 3, agi: 12, lck: 9,
    scale: 0.26,
    abilities: [
      { name: "Étreinte Gluante", icon: "💫", desc: "Saisit la cible et l'immobilise",
        effect: "status", statusId: "stun", power: 0, chance: 0.25, turns: 1 }
    ],
    ai: "aggressive",
    resist: ["glace"],
    weak:   ["foudre"],
    xp: 28, gold: { min: 8, max: 18 },
    drops:  [{ itemId: "mandragore", chance: 0.10 }]
  },

  {
    id:       "pitiponk",
    name:     "Pitiponk",
    icon:     "🏮",
    imgSrc:   "img/monsters/pitiponk.png",
    category: "être magique",
    loreFamily: "F2",
    desc:     "Une lueur vacillante danse devant vous — puis le piège se referme.",
    lore:     "Créature unijambiste et frêle, le Pitiponk tient une lanterne dont la lumière trompeuse attire les voyageurs vers les marécages. Fixer sa flamme trop longtemps engourdit l'esprit et fige les jambes.",
    habitat:  "Galeries embrumées, marais souterrains des étages profonds",
    anecdote: "Étudié en troisième année à Poudlard, le Pitiponk figure parmi les créatures que tout sorcier apprend à ne jamais suivre la nuit.",
    danger:   6,
    minFloor: 4, maxFloor: 8, weight: 6,
    hp: 42, atk: 7, def: 3, mag: 12, agi: 15, lck: 14,
    scale: 0.28,
    abilities: [
      { name: "Lanterne Trompeuse", icon: "💫", desc: "Sa flamme hypnotique étourdit la cible",
        effect: "status", statusId: "stun", power: 0, chance: 0.30, turns: 1 },
      { name: "Feu Follet", icon: "🔥", desc: "Projette une gerbe d'étincelles",
        effect: "damage", power: 8, chance: 0.25 }
    ],
    ai: "cautious",
    resist: ["feu", "disarm"],
    weak:   ["physique"],
    xp: 40, gold: { min: 12, max: 25 },
    drops:  []
  },

  {
    id:       "gargouille",
    name:     "Gargouille Éveillée",
    icon:     "🗿",
    imgSrc:   "img/monsters/gargouille.png",
    category: "créature",
    loreFamily: "F2",
    desc:     "La gargouille de pierre ouvre les yeux — son regard pèse comme du granit.",
    lore:     "Sculptée pour garder les passages de Poudlard, la Gargouille Éveillée s'anime à l'approche des intrus. Son regard minéral pétrifie brièvement quiconque le croise, et ses poings de granit fendent la roche.",
    habitat:  "Escaliers gardés, entrées de bureaux et passages scellés",
    anecdote: "Une gargouille identique garde l'entrée du bureau du directeur et n'ouvre le passage qu'au bon mot de passe.",
    danger:   7,
    minFloor: 5, maxFloor: 10, weight: 4,
    hp: 95, atk: 13, def: 12, mag: 6, agi: 6, lck: 8,
    scale: 0.30,
    abilities: [
      { name: "Regard Pétrifiant", icon: "💫", desc: "Son regard de pierre fige la cible",
        effect: "status", statusId: "stun", power: 0, chance: 0.25, turns: 2 },
      { name: "Coup de Granit", icon: "🪨", desc: "Un poing de pierre s'abat",
        effect: "damage", power: 14, chance: 0.30 }
    ],
    ai: "aggressive",
    resist: ["physique", "disarm"],
    weak:   ["glace"],
    xp: 95, gold: { min: 30, max: 55 },
    drops:  [{ itemId: "potion_m", chance: 0.12 }]
  },

  // ════════════════════════════════════════════
  // PHASE 3 — TRANCHE ÉTAGE 8 « LE SEUIL »
  // (cf. .claude/plans/content-audit-stabilization.md §5.1)
  // 2 boss (canon + original) + 2 monstres d'appoint
  // ════════════════════════════════════════════

  {
    id:       "fenrir_greyback",
    epic:     true,
    name:     "Fenrir Greyback",
    icon:     "🐺",
    imgSrc:   "img/monsters/fenrir_greyback.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Fenrir Greyback gronde, ses crocs jaunis dégoulinant de bave !",
    lore:     "Le plus tristement célèbre des loups-garous. Il se délectait de mordre les enfants pour grossir sa meute. Allié de Voldemort, il aimait sa condition autant qu'il aimait l'imposer aux autres.",
    habitat:  "Forêts profondes et abords corrompus du château",
    anecdote: "C'est lui qui a contaminé Remus Lupin enfant, en représailles d'un refus paternel. Plus tard, sous forme humaine en pleine bataille, il mordra Bill Weasley — un loup-garou diurne, sans pleine lune.",
    danger:   9,
    minFloor: 8, maxFloor: null, weight: 1,
    hp: 95, atk: 24, def: 6, mag: 5, agi: 14, lck: 9,
    scale: 0.34,
    abilities: [
      { name: "Morsure Infectieuse", icon: "🦷", desc: "Une morsure brutale qui saigne", effect: "status", statusId: "bleed", power: 8, chance: 0.40, turns: 3 },
      { name: "Frénésie Lycanthrope",icon: "🌕", desc: "Se gonfle de rage et se ressource", effect: "heal", power: 12, chance: 0.20 },
      { name: "Coup de Griffes",     icon: "🩸", desc: "Lacération profonde",            effect: "damage", power: 18, chance: 0.45 },
      { name: "Hurlement Glaçant",   icon: "😱", desc: "Pétrifie de terreur",            effect: "status", statusId: "fear", power: 0, chance: 0.20, turns: 2 },
      // Archétype B3 — enrage_self : sous 40 % PV, Fenrir entre en rage
      // lunaire et gagne +12 ATK (une seule fois dans le combat).
      { name: "Rage Lunaire",        icon: "🌑", desc: "Acculé, sa fureur de bête explose", effect: "enrage_self", hpPct: 0.40, atkBonus: 12, chance: 0.60 }
    ],
    ai: "aggressive",
    weak:   ["lumière"],
    xp: 140, gold: { min: 60, max: 90 },
    drops:  [
      { itemId: "essence_tenebres",  chance: 0.80 },
      { itemId: "essence_tenebres",  chance: 0.50 },
      { itemId: "potion_lune",       chance: 0.50 },
      { itemId: "anneau_runique",    chance: 0.20 }
    ]
  },

  {
    id:       "veilleur_seuil",
    epic:     true,
    name:     "Veilleur du Seuil",
    icon:     "🗿",
    imgSrc:   "img/monsters/veilleur_seuil.png",
    category: "être magique",
    loreFamily: "F5",
    desc:     "Un colosse runique se dresse, ses sceaux pulsent d'une lumière froide...",
    lore:     "Gardien antique scellé dans la pierre par des runes oubliées avant la fondation de Poudlard. Il veille sur les passages qui mènent aux Profondeurs et n'autorise nul franchissement.",
    habitat:  "Seuils runiques entre les paliers du château",
    anecdote: "Façonné par des sorciers anonymes pour protéger les profondeurs de toute intrusion. Sa cible naturelle est quiconque s'attarde près d'un passage scellé — y compris ceux qui devraient pouvoir passer.",
    danger:   9,
    minFloor: 8, maxFloor: null, weight: 1,
    hp: 140, atk: 14, def: 16, mag: 18, agi: 5, lck: 4,
    scale: 0.30,
    abilities: [
      { name: "Onde Runique",        icon: "💠", desc: "Onde lumineuse qui étourdit",   effect: "status", statusId: "stun", power: 0, chance: 0.30, turns: 1 },
      { name: "Sceau de Lumière",    icon: "✨", desc: "Frappe magique en croix",       effect: "damage", power: 16, chance: 0.40 },
      { name: "Régénération Runique",icon: "💜", desc: "Les runes se rallument",        effect: "heal",   power: 18, chance: 0.20 },
      { name: "Dissipation Sacrée",  icon: "❌", desc: "Brise les protections magiques",effect: "dispel", chance: 0.30 }
    ],
    ai: "cautious",
    resist: ["physique", "ténèbres"],
    weak:   ["foudre"],
    xp: 160, gold: { min: 80, max: 120 },
    drops:  [
      { itemId: "page_grimoire",     chance: 0.80 },
      { itemId: "page_grimoire",     chance: 0.50 },
      { itemId: "essence_tenebres",  chance: 0.40 },
      { itemId: "cor_pegasse",       chance: 0.20 }
    ]
  },

  {
    id:       "loup_garou_adulte",
    name:     "Loup-Garou Adulte",
    icon:     "🐺",
    imgSrc:   "img/monsters/loup_garou_adulte.png",
    category: "bête",
    loreFamily: "F2",
    desc:     "Un loup-garou massif aux poils gris bondit hors des ombres !",
    lore:     "Loup-garou en pleine maturité, dont la force et la rage ont décuplé. Sans potion Tue-Loup, il devient l'incarnation pure du mal lupin.",
    habitat:  "Profondeurs et passages obscurs",
    danger:   8,
    anecdote: "La potion Tue-Loup, inventée par Damocles Belby, permet aux loups-garous de conserver leur raison sous la pleine lune — mais Fenrir Greyback refusa toujours d'en boire.",
    minFloor: 8, maxFloor: null, weight: 4,
    hp: 62, atk: 18, def: 5, mag: 4, agi: 13, lck: 7,
    scale: 0.28,
    abilities: [
      { name: "Morsure Profonde", icon: "🦷", desc: "Saigne durablement",      effect: "status", statusId: "bleed", power: 6, chance: 0.30, turns: 3 },
      { name: "Charge Bestiale",  icon: "💨", desc: "Course rageuse",          effect: "damage", power: 14, chance: 0.40 },
      { name: "Hurlement",        icon: "🐺", desc: "Cri qui glace le sang",   effect: "status", statusId: "fear", power: 0, chance: 0.15, turns: 1 }
    ],
    ai: "aggressive",
    weak:   ["lumière"],
    xp: 60, gold: { min: 20, max: 35 },
    drops:  [
      { itemId: "potion_m",     chance: 0.20 },
      { itemId: "herbe_aconit", chance: 0.30 },
      { itemId: "herbe_dictame", chance: 0.12 }
    ]
  },

  {
    id:       "auror_corrompu",
    name:     "Auror Corrompu",
    icon:     "🪄",
    imgSrc:   "img/monsters/auror_corrompu.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Un Auror dont la magie a viré au noir lève sa baguette contre vous...",
    lore:     "Un Auror jadis fier de défendre le monde sorcier, retourné par les Ténèbres. Il manie les sortilèges qu'il combattait autrefois — avec la même précision mais une intention inverse.",
    habitat:  "Avant-poste corrompu de l'Ordre, étages 7+",
    danger:   7,
    anecdote: "Durant l'occupation de Poudlard par les Carrow, certains Aurors retournés infiltrèrent les rangs de l'Ordre du Phénix, compromettant plusieurs missions de résistance.",
    minFloor: 7, maxFloor: null, weight: 4,
    hp: 50, atk: 14, def: 8, mag: 14, agi: 11, lck: 9,
    scale: 0.28,
    abilities: [
      { name: "Stupefix Inversé",   icon: "⚡", desc: "Stupefix tourné contre vous", effect: "status", statusId: "stun", power: 0, chance: 0.20, turns: 1 },
      { name: "Expelliarmus Sombre",icon: "⚫", desc: "Désarme et affaiblit",         effect: "weaken", power: 3, chance: 0.25 },
      { name: "Confringo",          icon: "💥", desc: "Sortilège d'explosion",       effect: "damage", power: 14, chance: 0.35 }
    ],
    ai: "cautious",
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 65, gold: { min: 25, max: 45 },
    drops:  [
      { itemId: "potion_m", chance: 0.25 },
      { itemId: "wand1",    chance: 0.08 }
    ]
  },

  // ════════════════════════════════════════════
  // PHASE 3 — TRANCHE ÉTAGE 9 « LES PROFONDEURS »
  // (cf. .claude/plans/content-audit-stabilization.md §5.2)
  // 2 boss (canon + original) + 2 monstres d'appoint
  // ════════════════════════════════════════════

  {
    id:       "aragog",
    epic:     true,
    name:     "Aragog",
    icon:     "🕷️",
    imgSrc:   "img/monsters/aragog.png",
    category: "créature",
    loreFamily: "F5",
    desc:     "Aragog s'avance, ses huit yeux brillant dans la pénombre, sa carapace cliquetant !",
    lore:     "Le chef des Acromantules de la Forêt Interdite. Hagrid l'a élevé dès l'œuf, le cachant à Poudlard. Quand son humeur le permet, Aragog reconnaît ses bienfaiteurs — mais ses fils, eux, ne reconnaissent que la faim.",
    habitat:  "Cœur de la Forêt Interdite et profondeurs araneennes",
    anecdote: "Hagrid fut accusé à tort de l'avoir lâché en 1943. Aragog mourra de vieillesse en 1997, et Hagrid l'enterrera dignement — tandis que ses fils dévoreront les invités.",
    danger:   9,
    minFloor: 9, maxFloor: null, weight: 1,
    hp: 135, atk: 22, def: 8, mag: 6, agi: 10, lck: 6,
    scale: 0.32,
    abilities: [
      { name: "Crochets Venimeux", icon: "☠️", desc: "Injecte un venin tenace",      effect: "status", statusId: "poison", power: 7, chance: 0.40, turns: 4 },
      { name: "Charge Arachnide",  icon: "🕷️", desc: "Ruée massive de pattes",       effect: "damage", power: 19, chance: 0.45 },
      { name: "Appel aux Fils",    icon: "🕸️", desc: "Ses enfants accourent",         effect: "heal",   power: 16, chance: 0.20 },
      { name: "Toile Étouffante",  icon: "🕸️", desc: "Enveloppe et paralyse",         effect: "status", statusId: "stun", power: 0, chance: 0.20, turns: 1 },
      // Archétype B3 — summon : si un slot ennemi est libre (cap 3), une
      // Jeune Acromantule rejoint la meute (mise à l'échelle de l'étage).
      { name: "Couvée Vorace",     icon: "🥚", desc: "Une de ses filles éclot et bondit", effect: "summon", summonId: "acromantula_jeune", chance: 0.35 }
    ],
    ai: "aggressive",
    weak:   ["feu"],
    xp: 165, gold: { min: 80, max: 130 },
    drops:  [
      { itemId: "essence_tenebres",  chance: 0.80 },
      { itemId: "essence_tenebres",  chance: 0.50 },
      { itemId: "potion_l",          chance: 0.50 },
      { itemId: "diademe_antique",   chance: 0.15 }
    ]
  },

  {
    id:       "maitre_detraqueur",
    epic:     true,
    name:     "Maître des Détraqueurs",
    icon:     "👁️",
    imgSrc:   "img/monsters/maitre_detraqueur.png",
    category: "être magique",
    loreFamily: "F3",
    desc:     "Un Détraqueur immense glisse vers vous, son capuchon vide aspirant la lumière même...",
    lore:     "Figure tutélaire des Détraqueurs d'Azkaban. Plus vieux et plus avide que ses subordonnés, il préfère savourer ses victimes pendant des jours avant le Baiser fatal.",
    habitat:  "Cellule centrale d'Azkaban et profondeurs glacées",
    anecdote: "On dit qu'il aurait tenté de pratiquer le Baiser sur Sirius Black à plusieurs reprises — sans succès, grâce à Buck l'Hippogriffe.",
    danger:   10,
    minFloor: 9, maxFloor: null, weight: 1,
    hp: 115, atk: 14, def: 10, mag: 24, agi: 8, lck: 4,
    scale: 0.34,
    abilities: [
      { name: "Baiser du Détraqueur", icon: "💀", desc: "Drain de vie massif",          effect: "drain",  power: 20, chance: 0.35 },
      { name: "Aura de Désespoir",    icon: "😱", desc: "Glace l'âme — paralyse de peur", effect: "status", statusId: "fear", power: 0, chance: 0.35, turns: 3 },
      { name: "Murmure Mortel",       icon: "🌑", desc: "Voix qui fait saigner les oreilles", effect: "damage", power: 18, chance: 0.30 },
      { name: "Dissipation Glaçante", icon: "❌", desc: "Brise les sortilèges de soutien", effect: "dispel", chance: 0.30 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "physique"],
    weak:   ["lumière"],
    xp: 180, gold: { min: 90, max: 140 },
    drops:  [
      { itemId: "page_grimoire",     chance: 0.80 },
      { itemId: "page_grimoire",     chance: 0.50 },
      { itemId: "essence_tenebres",  chance: 0.40 },
      { itemId: "robe_combat",       chance: 0.15 }
    ]
  },

  {
    id:       "acromantule_adulte",
    name:     "Acromantule Adulte",
    icon:     "🕷️",
    imgSrc:   "img/monsters/acromantule_adulte.png",
    category: "créature",
    loreFamily: "F5",
    desc:     "Une Acromantule adulte fonce, ses mandibules cliquetant de faim !",
    lore:     "Acromantule arrivée à pleine maturité. Plus grande qu'un cheval, elle chasse en meute et préfère la chair humaine. La progéniture d'Aragog.",
    habitat:  "Forêt Interdite et galeries souterraines",
    danger:   8,
    anecdote: "Les Acromantules adultes attaquèrent le château en masse lors de la Bataille de Poudlard, après la mort d'Aragog — Ron fut contraint d'en affronter plusieurs avec Neville.",
    minFloor: 8, maxFloor: null, weight: 4,
    hp: 78, atk: 18, def: 6, mag: 4, agi: 13, lck: 6,
    scale: 0.28,
    abilities: [
      { name: "Morsure Venimeuse", icon: "☠️", desc: "Crochets remplis de venin",  effect: "status", statusId: "poison", power: 5, chance: 0.30, turns: 3 },
      { name: "Toile Collante",    icon: "🕸️", desc: "Englue et affaiblit",         effect: "weaken", power: 3, chance: 0.30 },
      { name: "Charge Multipattes",icon: "🕷️", desc: "Ruée fulgurante",             effect: "damage", power: 15, chance: 0.40 }
    ],
    ai: "aggressive",
    weak:   ["feu"],
    xp: 70, gold: { min: 25, max: 40 },
    drops:  [
      { itemId: "potion_m",         chance: 0.20 },
      { itemId: "herbe_aconit",     chance: 0.20 }
    ]
  },

  {
    id:       "detraqueur_elite",
    name:     "Détraqueur d'Élite",
    icon:     "👻",
    imgSrc:   "img/monsters/detraqueur_elite.png",
    category: "être magique",
    loreFamily: "F3",
    desc:     "Un Détraqueur d'élite vous fixe — vos joies s'évaporent une par une.",
    lore:     "Détraqueur vétéran, plus âgé et plus avide que les gardiens standards. Sa proximité éteint les souvenirs heureux.",
    habitat:  "Couloirs glacés et anciennes prisons",
    danger:   8,
    anecdote: "Lorsque Voldemort prit le contrôle d'Azkaban, les Détraqueurs d'élite quittèrent leurs postes pour rejoindre ses rangs, laissant les prisonniers sans surveillance (L'Ordre du Phénix).",
    minFloor: 8, maxFloor: null, weight: 4,
    hp: 60, atk: 12, def: 6, mag: 18, agi: 8, lck: 5,
    scale: 0.30,
    abilities: [
      { name: "Baiser Partiel", icon: "💀", desc: "Aspire un peu de vie",          effect: "drain",  power: 12, chance: 0.35 },
      { name: "Aura Glaciale",  icon: "❄️", desc: "Diffuse une peur sourde",        effect: "status", statusId: "fear", power: 0, chance: 0.25, turns: 2 },
      { name: "Voile d'Effroi", icon: "🌑", desc: "Murmure paralysant",             effect: "damage", power: 14, chance: 0.30 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "physique"],
    weak:   ["lumière"],
    xp: 75, gold: { min: 30, max: 50 },
    drops:  [
      { itemId: "potion_l",         chance: 0.20 },
      { itemId: "page_grimoire",    chance: 0.05 }
    ]
  },

  // ════════════════════════════════════════════
  // PHASE 3 — TRANCHE ÉTAGE 10 « LE PRÉCIPICE »
  // (cf. .claude/plans/content-audit-stabilization.md §5.3)
  // 2 boss (canon + original) + 2 monstres d'appoint
  // Antichambre de Voldemort Ressuscité (déjà présent étage 10+).
  // ════════════════════════════════════════════

  {
    id:       "antonin_dolohov",
    epic:     true,
    name:     "Antonin Dolohov",
    icon:     "🪄",
    imgSrc:   "img/monsters/antonin_dolohov.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Antonin Dolohov esquisse sa signature : une courbe violette dans l'air.",
    lore:     "Mangemort lieutenant du cercle intérieur. Spécialiste du sortilège mortel signature — une courbe violette qui transperce la chair et perfore les organes. Il a survécu à Azkaban deux fois et n'a jamais pardonné.",
    habitat:  "Antichambre des Profondeurs",
    anecdote: "Il a quasiment tué Hermione au Ministère (Tome 5) avec sa courbe violette — sortilège qu'elle n'a jamais nommé. Sa marque restera vissée à son sternum jusqu'à la Bataille de Poudlard.",
    danger:   10,
    minFloor: 10, maxFloor: null, weight: 1,
    hp: 115, atk: 22, def: 8, mag: 22, agi: 11, lck: 10,
    scale: 0.33,
    abilities: [
      { name: "Maléfice Violet",       icon: "🟣", desc: "Sa courbe signature, perforante", effect: "damage", power: 22, chance: 0.45 },
      { name: "Cruciatus Méthodique",  icon: "⚡", desc: "Torture appliquée avec soin",     effect: "drain",  power: 16, chance: 0.30 },
      { name: "Sectumsempra Inversé",  icon: "🩸", desc: "Lacération profonde qui saigne",  effect: "status", statusId: "bleed", power: 9, chance: 0.25, turns: 3 },
      { name: "Silencio Forcé",        icon: "🤐", desc: "Étouffe la magie de la cible",    effect: "weaken", power: 3, chance: 0.20 }
    ],
    ai: "cautious",
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 200, gold: { min: 100, max: 160 },
    drops:  [
      { itemId: "essence_tenebres",  chance: 0.85 },
      { itemId: "essence_tenebres",  chance: 0.55 },
      { itemId: "pectoral_auror",    chance: 0.15 },
      { itemId: "wand2",             chance: 0.20 }
    ]
  },

  {
    id:       "heraut_tenebres",
    epic:     true,
    name:     "Héraut des Ténèbres",
    icon:     "📯",
    imgSrc:   "img/monsters/heraut_tenebres.png",
    category: "être magique",
    loreFamily: "F5",
    desc:     "Le Héraut sonne un cor d'os. L'air se charge d'une malédiction lente.",
    lore:     "Annonciateur de la résurrection du Seigneur des Ténèbres. Il ne combat pas pour vaincre — il combat pour préparer l'arrivée du Maître. Sa présence seule corrompt l'air.",
    habitat:  "Antichambres de résurrection",
    anecdote: "Aucun témoin n'a jamais vu son visage sous le capuchon. Ceux qui ont essayé n'ont pas survécu pour le décrire.",
    danger:   10,
    minFloor: 10, maxFloor: null, weight: 1,
    hp: 150, atk: 16, def: 12, mag: 26, agi: 7, lck: 5,
    scale: 0.34,
    abilities: [
      { name: "Hymne du Néant",       icon: "🌑", desc: "Onde de magie noire diffuse",     effect: "damage", power: 20, chance: 0.40 },
      { name: "Aura Mortifère",       icon: "😱", desc: "Glace l'âme de tous",              effect: "status", statusId: "fear", power: 0, chance: 0.30, turns: 3 },
      { name: "Régénération Spectrale",icon: "💜", desc: "Les ombres le reconstituent",     effect: "heal",   power: 20, chance: 0.20 },
      { name: "Sceau de Dissolution", icon: "❌", desc: "Brise sortilèges et protections",  effect: "dispel", chance: 0.35 },
      // Archétype B3 — aura (taunt) : litanie qui affaiblit TOUT le groupe de
      // héros (weaken de groupe, restauré à l'expiration via tickStatuses).
      { name: "Litanie d'Effroi",     icon: "📯", desc: "Un chant qui ronge l'armure de tous", effect: "aura", statusId: "weaken", power: 3, turns: 3, chance: 0.30 }
    ],
    ai: "cautious",
    resist: ["ténèbres", "physique"],
    weak:   ["lumière"],
    xp: 220, gold: { min: 120, max: 180 },
    drops:  [
      { itemId: "page_grimoire",         chance: 0.85 },
      { itemId: "page_grimoire",         chance: 0.55 },
      { itemId: "herbe_asphodele_noire", chance: 0.30 },
      { itemId: "larme_phenix_mineure",  chance: 0.15 },
      { itemId: "grimoire_avance",       chance: 0.20 }
    ]
  },

  // ── Boss-prédateur d'ombre de la Boucle (Lethifold canon, XXXXX) ───
  // minFloor 9 → apparaît au réel 9-10 (école profonde) ET recycle dans la
  // Boucle au réel 19+ (effectiveFloor(19)=9), où il sert de cible à la quête
  // de purge du Gardien (purge_moremplis). Caster/drain (atk < 1,5×mag) → PAS
  // une brute (pas de Broyer). Sprite PNG painterly (rembg/birefnet).
  {
    id:       "moremplis",
    epic:     true,
    name:     "Moremplis",
    icon:     "🌑",
    imgSrc:   "img/monsters/moremplis.png",
    category: "être magique",
    desc:     "Une nappe de ténèbres ondule au ras du sol, sans visage ni bord net. Elle glisse vers toi pour t'envelopper.",
    lore:     "Le Moremplis — Lethifold pour les naturalistes — est un linceul vivant qui étouffe sa proie dans son sommeil et la digère sans laisser de trace. Classé XXXXX, il ne craint qu'une chose : la lumière d'un Patronus. La Boucle en a tissé un des ombres mêmes des Ruines.",
    habitat:  "Les recoins sans lumière de la Boucle, là où même les torches renoncent.",
    anecdote: "On ne recense aucun survivant d'une attaque de Moremplis — seulement des disparitions et un drap noir retrouvé vide au matin.",
    danger:   10,
    minFloor: 9, maxFloor: null, weight: 1,
    hp: 145, atk: 16, def: 9, mag: 24, agi: 17, lck: 11,
    scale: 0.34,
    abilities: [
      { name: "Linceul d'Ombre",  icon: "🌑", desc: "Il enveloppe sa proie et boit sa vie", effect: "drain",  power: 20, chance: 0.40 },
      { name: "Effroi du Suaire",  icon: "😱", desc: "L'étreinte froide glace l'âme",         effect: "status", statusId: "fear", power: 0, chance: 0.30, turns: 2 },
      { name: "Voile Étouffant",   icon: "❌", desc: "Étouffe sortilèges et protections",      effect: "dispel", chance: 0.30 }
    ],
    ai: "cautious",
    phases: [
      { atPct: 0.4, magMult: 1.2, msg: "Le Moremplis se déploie en un linceul plus vaste — l'obscurité avale la lumière des torches." }
    ],
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 250, gold: { min: 120, max: 180 },
    drops: [
      { itemId: "essence_tenebres",      chance: 0.70 },
      { itemId: "page_grimoire",         chance: 0.45 },
      { itemId: "herbe_asphodele_noire", chance: 0.30 },
      { itemId: "larme_phenix_mineure",  chance: 0.12 }
    ]
  },

  // ── Boss naturel de la Boucle profonde (Ruines Anciennes) ──────────
  // Apparition à l'étage RÉEL 22+ : minFloor 12 filtré via effectiveFloor
  // (effectiveFloor(22)=12) → Boucle-exclusif, second tour de spirale, dans
  // la tranche D « Ruines Anciennes » (textures runiques). Spawn naturel rare
  // (weight 1, epic). Brute (atk ≥ 1,5×mag) → Broyer auto via scaleMonster.
  {
    id:       "basilic_ancestral",
    epic:     true,
    name:     "Basilic Ancestral",
    icon:     "🐍",
    imgSrc:   "img/monsters/basilic_ancestral.png",
    category: "bête",
    desc:     "Une colonne d'écailles antiques se déroule des Ruines. Deux yeux d'or s'ouvrent — ne croise pas son regard.",
    lore:     "Le premier des serpents, scellé sous Poudlard bien avant que Salazar n'y bâtisse sa Chambre. La Boucle l'a réveillé du fond des Ruines, là où la pierre est plus vieille que les Fondateurs. Son regard pétrifie, sa morsure dissout, et son corps brise les armures comme des coquilles.",
    habitat:  "Les galeries noyées des Ruines Anciennes, sous la racine du château.",
    anecdote: "Les serpents ordinaires fuient les Ruines : ils savent ce qui dort en dessous, et qu'on ne réveille pas le Roi sans le payer.",
    danger:   11,
    minFloor: 12, maxFloor: null, weight: 1,
    hp: 200, atk: 26, def: 18, mag: 14, agi: 8, lck: 8,
    scale: 0.38,
    abilities: [
      { name: "Regard Pétrifiant", icon: "💫", desc: "Ses yeux d'or figent la chair en pierre", effect: "status", statusId: "stun",   power: 0, chance: 0.28, turns: 2 },
      { name: "Crocs Venimeux",    icon: "🟢", desc: "Un venin qui dissout de l'intérieur",      effect: "status", statusId: "poison", power: 8, chance: 0.35, turns: 3 },
      { name: "Mue Ancestrale",    icon: "💚", desc: "Il abandonne sa vieille peau et se régénère", effect: "heal",  power: 22, chance: 0.20 }
    ],
    ai: "aggressive",
    phases: [
      { atPct: 0.5,  atkMult: 1.25, msg: "Le Basilic resserre ses anneaux — chaque coup pèse désormais le poids des siècles." },
      { atPct: 0.25, atkMult: 1.15, msg: "Acculé, le Roi des Serpents siffle un cri qui fait trembler les Ruines." }
    ],
    resist: ["physique", "ténèbres"],
    weak:   ["lumière"],
    xp: 320, gold: { min: 170, max: 250 },
    drops: [
      { itemId: "essence_tenebres",      chance: 0.80 },
      { itemId: "page_grimoire",         chance: 0.50 },
      { itemId: "herbe_asphodele_noire", chance: 0.30 },
      { itemId: "eclat_vitalite",        chance: 0.20 },
      { itemId: "larme_phenix_mineure",  chance: 0.12 }
    ]
  },

  // ── Dragon ancestral de la Boucle (Magyar à Pointes canon) ─────────
  // minFloor 10 → apparaît au dernier étage RÉEL pré-victoire (10) ET recycle
  // en Boucle au réel 20+ (effectiveFloor(20)=10). Brute (atk ≥ 1,5×mag &
  // atk ≥ 12) → reçoit Broyer auto via scaleMonster. Élément feu : souffle +
  // statut burn ; faible glace. Sprite PNG painterly (rembg/birefnet).
  {
    id:       "magyar_ancestral",
    epic:     true,
    name:     "Magyar Ancestral",
    icon:     "🐉",
    imgSrc:   "img/monsters/magyar_ancestral.png",
    category: "bête",
    desc:     "Un rugissement ébranle les Ruines. Des ailes de cuir noir se déploient — le dragon ancestral ouvre la gueule sur une braise.",
    lore:     "Un Magyar à Pointes que la Boucle a tiré des âges anciens, plus vaste et plus noir qu'aucun dragon recensé. Ses écailles d'obsidienne renvoient le feu ; sa queue cloutée de bronze brise la pierre. On dit qu'il couvait sous les Ruines bien avant qu'on n'y bâtisse Poudlard.",
    habitat:  "Les cavernes incandescentes au plus profond des Ruines Anciennes.",
    anecdote: "Les dompteurs de dragons de Roumanie refusent de nommer le Magyar Ancestral : on ne convoque pas ce qu'on ne peut rendormir.",
    danger:   11,
    minFloor: 10, maxFloor: null, weight: 1,
    hp: 185, atk: 25, def: 14, mag: 16, agi: 10, lck: 9,
    scale: 0.36,
    abilities: [
      { name: "Souffle de Feu", icon: "🔥", desc: "Un torrent de flammes balaie le groupe",     effect: "damage", power: 22, chance: 0.45 },
      { name: "Embrasement",    icon: "🔥", desc: "Les flammes s'accrochent et consument",        effect: "status", statusId: "burn", power: 9, chance: 0.35, turns: 3 },
      { name: "Coup de Queue",  icon: "💥", desc: "La queue cloutée fracasse les défenses",        effect: "weaken", power: 5, chance: 0.30 }
    ],
    ai: "aggressive",
    phases: [
      { atPct: 0.5,  atkMult: 1.2,  msg: "Le Magyar se cabre, ailes grandes ouvertes — l'air lui-même prend feu autour de lui." },
      { atPct: 0.25, magMult: 1.3,  msg: "Acculé, le dragon inspire profondément : sa gorge rougeoie d'un brasier prêt à tout engloutir." }
    ],
    resist: ["feu", "physique"],
    weak:   ["glace"],
    xp: 340, gold: { min: 190, max: 270 },
    drops: [
      { itemId: "essence_tenebres",      chance: 0.80 },
      { itemId: "page_grimoire",         chance: 0.50 },
      { itemId: "herbe_asphodele_noire", chance: 0.30 },
      { itemId: "eclat_vitalite",        chance: 0.20 },
      { itemId: "larme_phenix_mineure",  chance: 0.12 }
    ]
  },

  // ── Caster glace des profondeurs (spectre revenant gelé) ───────────
  // minFloor 8 → réel 8+ ET recycle en Boucle au réel 18+ (effectiveFloor(18)=8).
  // Caster (atk 12 < 1,5×mag 26) → PAS une brute. Élément glace : Glacius-like
  // (statut gel ❄️) + gel profond (stun). Catégorie fantôme → mort-vivant, donc
  // Lumos Solem ×1,5 s'applique en plus ; faible feu. Sprite PNG (rembg).
  {
    id:       "spectre_givre",
    epic:     true,
    name:     "Spectre de Givre",
    icon:     "❄️",
    imgSrc:   "img/monsters/spectre_givre.png",
    category: "fantôme",
    desc:     "Le froid tombe d'un coup. Une silhouette de glace et de linceul gelé se dresse, un éclat de givre au creux de sa main décharnée.",
    lore:     "Un sorcier mort de froid dans les profondeurs, que la Boucle a relevé en revenant de givre. Il ne se souvient plus de son nom — seulement du gel qui l'a pris, et qu'il rend désormais à quiconque s'aventure trop bas. Là où il flotte, l'air se cristallise.",
    habitat:  "Les galeries glacées des Profondeurs Oubliées, où l'eau ne coule plus depuis des siècles.",
    anecdote: "Les torches s'éteignent à son approche : non par manque d'air, mais parce que la flamme elle-même gèle sur la mèche.",
    danger:   10,
    minFloor: 8, maxFloor: null, weight: 1,
    hp: 150, atk: 12, def: 10, mag: 26, agi: 14, lck: 10,
    scale: 0.35,
    abilities: [
      { name: "Éclat de Givre",   icon: "🧊", desc: "Projette un dard de glace pure",         effect: "damage", power: 24, chance: 0.45 },
      { name: "Étreinte Glaciale", icon: "❄️", desc: "Le gel s'accroche et ronge lentement",   effect: "status", statusId: "gel",  power: 8, chance: 0.40, turns: 3 },
      { name: "Gel Profond",      icon: "💫", desc: "Fige la cible dans un bloc de glace",      effect: "status", statusId: "stun", power: 0, chance: 0.22, turns: 1 }
    ],
    ai: "cautious",
    phases: [
      { atPct: 0.4, magMult: 1.3, msg: "Le Spectre se hérisse de pics de glace — le froid devient mordant, chaque souffle brûle de givre." }
    ],
    resist: ["glace", "ténèbres"],
    weak:   ["feu"],
    xp: 300, gold: { min: 160, max: 240 },
    drops: [
      { itemId: "essence_tenebres",      chance: 0.75 },
      { itemId: "page_grimoire",         chance: 0.50 },
      { itemId: "herbe_asphodele_noire", chance: 0.30 },
      { itemId: "larme_phenix_mineure",  chance: 0.12 }
    ]
  },

  // ── Caster foudre rapide des Profondeurs (élémentaire d'orage) ─────
  // minFloor 7 → réel 7+ ET recycle en Boucle au réel 17+ (effectiveFloor(17)=7).
  // Caster (atk 14 < 1,5×mag 25) → PAS une brute. AGI élevée (frappe vive,
  // esquive). Élément foudre : Fulgari-like (dégâts purs) + décharge (stun).
  // Faible PHYSIQUE — unique parmi les boss → valorise Diffindo/Sectumsempra ;
  // résiste foudre. Sprite PNG (rembg).
  {
    id:       "heraut_foudre",
    epic:     true,
    name:     "Héraut de l'Orage",
    icon:     "⚡",
    imgSrc:   "img/monsters/heraut_foudre.png",
    category: "être magique",
    desc:     "L'air se charge et crépite. Une silhouette d'orage se condense, doigts grésillant d'arcs électriques bleus.",
    lore:     "Quand la foudre frappe assez profond et assez souvent le même point des Ruines, la Boucle finit par lui donner une volonté. Le Héraut de l'Orage n'est qu'une tempête qui a appris à haïr : il frappe vite, sans prévenir, et la terre tremble sous chaque décharge.",
    habitat:  "Les puits verticaux des Profondeurs Oubliées, où l'orage de surface s'engouffre encore.",
    anecdote: "On le repère avant de le voir : les cheveux se dressent, le métal bourdonne, et l'instant d'après l'éclair est déjà parti.",
    danger:   10,
    minFloor: 7, maxFloor: null, weight: 1,
    hp: 145, atk: 14, def: 9, mag: 25, agi: 20, lck: 11,
    scale: 0.35,
    abilities: [
      { name: "Fulguration",       icon: "⚡", desc: "Un trait de foudre pure traverse l'armure", effect: "damage", power: 26, chance: 0.50 },
      { name: "Décharge",          icon: "💫", desc: "Une secousse électrique paralyse",          effect: "status", statusId: "stun", power: 0, chance: 0.30, turns: 1 },
      { name: "Bourrasque Statique", icon: "🌀", desc: "Le souffle d'orage disperse les protections", effect: "dispel", chance: 0.28 }
    ],
    ai: "aggressive",
    phases: [
      { atPct: 0.4, magMult: 1.3, msg: "Le Héraut se densifie en un nuage noir zébré d'éclairs — l'orage gronde, prêt à tout foudroyer." }
    ],
    resist: ["foudre"],
    weak:   ["physique"],
    xp: 300, gold: { min: 160, max: 240 },
    drops: [
      { itemId: "essence_tenebres",      chance: 0.75 },
      { itemId: "page_grimoire",         chance: 0.50 },
      { itemId: "herbe_asphodele_noire", chance: 0.30 },
      { itemId: "larme_phenix_mineure",  chance: 0.12 }
    ]
  },

  // ── Caster lumière radiant des Profondeurs (élémentaire d'aube) ─────
  // 6e boss original élémentaire, complète la collection givre/foudre/ténèbres.
  // minFloor 9 → réel 9+ ET recycle en Boucle au réel 19+ (effectiveFloor(19)=9).
  // Caster (atk 12 < 1,5×mag 27) → PAS une brute. Identité = attrition radiante :
  // SEUL boss qui se SOIGNE en lumière + aveugle (stun). SEUL boss qui RÉSISTE
  // la lumière et est FAIBLE aux ténèbres → unique levier des sorts sombres
  // (Sanguini/Vampyrus/Morsmordre/Nox Vorax). Pas d'`imgSrc` : repli sur le SVG
  // de catégorie « être magique » (combat → emoji ☀️) tant que le sprite PNG
  // dédié (img/monsters/heraut_aube.png, pipeline tools/process_monster_png.py)
  // n'est pas généré.
  {
    id:       "heraut_aube",
    epic:     true,
    name:     "Le Héraut de l'Aube",
    icon:     "☀️",
    category: "être magique",
    desc:     "Une lumière blanche se lève sans soleil. Une silhouette d'or pâle se dresse, paumes ouvertes, et l'air se met à brûler de clarté.",
    lore:     "On raconte qu'un gardien de lumière veillait jadis sur les profondeurs de Poudlard, brandissant l'éclat d'un Patronus que rien n'éteignait. La Boucle l'a retourné : sa clarté ne protège plus, elle juge. Le Héraut de l'Aube n'éclaire que pour aveugler, et ne soigne que lui-même.",
    habitat:  "Les nefs effondrées des Profondeurs Oubliées, où une aube morte filtre encore par les fissures runiques.",
    anecdote: "Ceux qui l'ont affronté parlent d'une lumière qui ne réchauffe pas : on a froid en plein éclat, comme si la clarté avait oublié à quoi sert le jour.",
    danger:   10,
    minFloor: 9, maxFloor: null, weight: 1,
    hp: 148, atk: 12, def: 11, mag: 27, agi: 13, lck: 12,
    scale: 0.35,
    abilities: [
      { name: "Jugement de l'Aube", icon: "☀️", desc: "Un trait de lumière pure transperce la chair", effect: "damage", power: 26, chance: 0.50 },
      { name: "Voile Aveuglant",    icon: "💫", desc: "Une clarté brutale fige la cible, aveuglée",    effect: "status", statusId: "stun", power: 0, chance: 0.26, turns: 1 },
      { name: "Halo Régénérateur",  icon: "✨", desc: "La lumière se replie sur lui et le recompose",   effect: "heal",   power: 22, chance: 0.28 }
    ],
    ai: "cautious",
    phases: [
      { atPct: 0.4, magMult: 1.3, msg: "Le Héraut irradie d'un seul coup — la nef entière vire au blanc, et chaque ombre s'efface dans la clarté mordante." }
    ],
    resist: ["lumière"],
    weak:   ["ténèbres"],
    xp: 300, gold: { min: 160, max: 240 },
    drops: [
      { itemId: "essence_tenebres",      chance: 0.75 },
      { itemId: "page_grimoire",         chance: 0.50 },
      { itemId: "herbe_asphodele_noire", chance: 0.30 },
      { itemId: "larme_phenix_mineure",  chance: 0.12 }
    ]
  },

  // ── Boss-miroir terminal de « Briser le Cycle » (V3, ch.11 §11.10) ──
  // Apparition à l'étage RÉEL 21+ : minFloor 11 filtré via effectiveFloor
  // (effectiveFloor(21)=11) → exclu des étages 11-20 (eff. 1-10). Le vaincre
  // valide le jalon III ; voir js/break-cycle.js.
  {
    id:       "reflet_mythe",
    epic:     true,
    name:     "Le Reflet du Mythe",
    icon:     "🪞",
    imgSrc:   "img/monsters/reflet_mythe.png",
    category: "être magique",
    desc:     "Au sommet de l'Avant-Monde, une silhouette se lève — la tienne, faite de lumière froide et de légende retournée.",
    lore:     "Ce n'est pas un monstre : c'est ce que la Boucle a fait de ta propre légende. À force de descendre, le mythe du héros s'est détaché de toi et s'est dressé en face, gardien de ce qui dort tout au fond. Le vaincre, c'est se mesurer à soi-même — au prix qu'on a payé pour devenir une histoire.",
    habitat:  "Le sommet de l'Avant-Monde (étage 21+), là où la pierre cesse de distinguer jadis de maintenant",
    anecdote: "Les Ruines ne créent rien : elles renvoient. Le Reflet n'a d'autre visage que celui de qui ose descendre jusqu'à lui.",
    danger:   11,
    minFloor: 11, maxFloor: null, weight: 2,
    hp: 175, atk: 30, def: 16, mag: 28, agi: 14, lck: 16,
    scale: 0.40,
    abilities: [
      { name: "Éclat de Légende", icon: "🌟", desc: "Ta propre gloire, retournée en arme", effect: "damage", power: 26, chance: 0.55 },
      { name: "Reflet Inversé",   icon: "🪞", desc: "Il te vole ta force et s'en nourrit",  effect: "drain",  power: 20, chance: 0.30 },
      { name: "Effroi du Miroir", icon: "😱", desc: "Se voir soi-même, terrible",           effect: "status", statusId: "fear", power: 0, chance: 0.30, turns: 2 },
      { name: "Dissipe les Vœux", icon: "❌", desc: "Brise protections et bénédictions",     effect: "dispel", chance: 0.30 }
    ],
    ai: "aggressive",
    phases: [
      { atPct: 0.5,  atkMult: 1.2, magMult: 1.2, msg: "Le Reflet sourit de ton propre sourire — il frappe plus fort, comme tu le ferais." },
      { atPct: 0.25, magMult: 1.15, msg: "Acculé, le Reflet se fissure de lumière froide — ce qui dort, derrière, retient son souffle." }
    ],
    resist: ["ténèbres", "physique"],
    weak:   ["lumière"],
    xp: 400, gold: { min: 150, max: 240 },
    drops: [
      { itemId: "felix", chance: 0.30 }
    ]
  },

  {
    id:       "mangemort_veteran",
    name:     "Mangemort Vétéran",
    icon:     "💀",
    imgSrc:   "img/monsters/mangemort_veteran.png",
    category: "humain",
    loreFamily: "F4",
    desc:     "Un Mangemort vétéran sort de l'ombre, sa Marque pulse au rythme du combat.",
    lore:     "Mangemort de la première heure, marqué depuis la Première Guerre. Ses sortilèges sont rouillés mais sa cruauté est intacte.",
    habitat:  "Antichambres et chemins de résurrection",
    danger:   8,
    anecdote: "Après la première chute de Voldemort, ces vétérans prétendirent avoir agi sous l'Imperium — la majorité s'en tira sans poursuites judiciaires et recommença à servir dès son retour.",
    minFloor: 9, maxFloor: null, weight: 4,
    hp: 72, atk: 18, def: 9, mag: 16, agi: 10, lck: 8,
    scale: 0.30,
    abilities: [
      { name: "Cruciatus",          icon: "⚡", desc: "Sortilège de torture",            effect: "drain",  power: 12, chance: 0.30 },
      { name: "Maléfice Sombre",    icon: "🟣", desc: "Sort impair, dégâts purs",        effect: "damage", power: 16, chance: 0.40 },
      { name: "Stupefix Brutal",    icon: "⚫", desc: "Étourdit lourdement",             effect: "status", statusId: "stun", power: 0, chance: 0.20, turns: 1 }
    ],
    ai: "aggressive",
    resist: ["ténèbres"],
    weak:   ["lumière"],
    xp: 85, gold: { min: 35, max: 55 },
    drops:  [
      { itemId: "potion_m",          chance: 0.25 },
      { itemId: "essence_tenebres",  chance: 0.08 }
    ]
  },

  {
    id:       "spectre_renforce",
    name:     "Spectre Renforcé",
    icon:     "👻",
    imgSrc:   "img/monsters/spectre_renforce.png",
    category: "fantôme",
    loreFamily: "F3",
    desc:     "Un spectre dense et résolu vous fixe — ses contours brûlent d'une rage froide.",
    lore:     "Esprit corrompu plus tangible que la norme, capable de matérialiser ses coups. Vestige d'un sorcier puissant retenu dans les Profondeurs.",
    habitat:  "Couloirs hantés de l'antichambre",
    danger:   8,
    anecdote: "On pense que ces spectres renforcés sont le produit de sorciers qui refusèrent de mourir et ancrerent leur âme par magie noire, sans en maîtriser les conséquences.",
    minFloor: 9, maxFloor: null, weight: 4,
    hp: 85, atk: 14, def: 5, mag: 18, agi: 9, lck: 6,
    scale: 0.28,
    abilities: [
      { name: "Drain Spectral",     icon: "💀", desc: "Aspire la force vitale",          effect: "drain",  power: 12, chance: 0.30 },
      { name: "Onde Glaciale",      icon: "❄️", desc: "Diffuse un froid mortel",          effect: "damage", power: 14, chance: 0.40 },
      { name: "Chant Effrayant",    icon: "😱", desc: "Mélopée qui paralyse",             effect: "status", statusId: "fear", power: 0, chance: 0.20, turns: 2 }
    ],
    ai: "cautious",
    resist: ["physique", "ténèbres"],
    weak:   ["lumière"],
    xp: 80, gold: { min: 30, max: 50 },
    drops:  [
      { itemId: "potion_l",          chance: 0.15 },
      { itemId: "page_grimoire",     chance: 0.06 }
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
//       effect: "damage",    // damage | heal | weaken | drain | status
//       power: 8, chance: 0.30 }
//     // effect:"status" → ajouter statusId:"burn" et turns:2
//   ],
//   ai: "aggressive",            // aggressive | cautious | random
//   resist: [],                  // feu|glace|foudre|lumière|ténèbres|physique|disarm
//   weak:   ["feu"],
//   xp: 15, gold: { min: 5, max: 15 },
//   drops: [
//     { itemId: "mandragore", chance: 0.15 },
//     { itemId: "potion_s",   chance: 0.08 }
//   ]
// },

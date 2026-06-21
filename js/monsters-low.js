// ============================================================
// MONSTRES — Étages 1-7 (Couloirs / Profondeurs / Passages)
// (extrait de monsters.js — Lot B P3.3, pattern push, ordre préservé)
// ============================================================

MONSTERS.push(
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

);

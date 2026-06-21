// ============================================================
// MONSTRES — Étages 4-10 (Donjon / Abîmes / Grands)
// (extrait de monsters.js — Lot B P3.3, pattern push, ordre préservé)
// ============================================================

MONSTERS.push(
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

);

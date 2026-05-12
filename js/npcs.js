// ============================================================
// REGISTRE DES PNJ
// ============================================================
// Source unique pour ajouter, modifier ou supprimer un PNJ.
// Le moteur (génération, dialogue, quêtes) lit uniquement ce registre.
//
// Schéma d'une entrée :
// {
//   id:          "string-unique",
//   name:        "Nom affiché",
//   title:       "Sous-titre / fonction",
//   icon:        "🧙",                     // emoji fallback
//   portraitImg: "img/npc/<id>.png"         // optionnel : portrait raster (priorité 1)
//   portraitSvg: '<svg>...</svg>'           // optionnel : portrait inline (priorité 2)
//   placement:   { floor: 1, anchor: "first-room" | "any" },  // PNJ fixes
//   random:      true,                      // PNJ ambulant : tiré aléatoirement
//   minFloor:    2,                         //   borne basse de tirage (random)
//   maxFloor:    null,                      //   borne haute (null = sans limite)
//   wares:       [                          // optionnel : catalogue vendeur
//     { id: "potion_s", price: 30 },        //   `price` override ITEMS[id].price
//     ...                                   //   (sinon prix d'origine de l'item)
//   ],
//   buyback:     {                          // optionnel : politique de rachat
//     default: 0.50,                        //   multiplicateur par défaut
//     byType:    { "consumable": 0.75 },    //   override par type d'item
//     byRarity:  { "epic": 0.75 },          //   override par rareté
//     bySlot:    { "body": 0.75 }           //   override par slot d'équipement
//   },
//   specialAction: {                        // optionnel : action unique (1×/visite d'étage)
//     type:  "heal_and_revive",             //   dispatché par triggerNpcSpecialAction
//     label: "✨ Recevoir les larmes du phénix"
//   },
//   questsGiven:    ["quest_id", ...],     // quêtes que ce PNJ propose
//   questsTurnedIn: ["quest_id", ...],     // quêtes que ce PNJ clôt (souvent === questsGiven)
//   dialogues: {
//     greeting:    "1ère rencontre",
//     idle:        "Visites suivantes (texte fixe)",
//     idleRandom:  ["...","..."],           // optionnel : pioche random
//                                           //   à chaque visite (PNJ lore)
//     contextualLore: [                     // optionnel : override `idle` par
//       { monsterIds: ["bellatrix"], text: "..." }   // tirage contextuel selon
//     ],                                    //   les monstres tirables à l'étage
//     questOffer:  "Quête disponible non prise",
//     questActive: "Quête prise mais objectif non rempli",
//     questReady:  "Objectif rempli, à rendre",
//     questDone:   "Quête déjà rendue"
//   }
// }

const NPCS = [
  {
    id:    "dumbledore",
    name:  "Albus Dumbledore",
    title: "Directeur de Poudlard",
    icon:  "🧙‍♂️",
    portraitImg: "img/npc/dumbledore.png",
    placement: { floor: 1, anchor: "first-room" },
    questsGiven:    ["intro_tutoriel", "dumbledore_eveil", "dumbledore_courage",
                     "dumbledore_resistance", "dumbledore_revelation"],
    questsTurnedIn: ["intro_tutoriel", "dumbledore_eveil", "dumbledore_courage",
                     "dumbledore_resistance", "dumbledore_revelation"],
    dialogues: {
      greeting:    [
        "Ah, te voilà enfin ! Bienvenue dans les profondeurs de Poudlard, jeune sorcier. Le château recèle bien des mystères.",
        "Pour ta première épreuve, descends d'un étage. Une fois fait, retrouve-moi quelque part dans ces couloirs — je te récompenserai en personne."
      ],
      idle:        "Le château murmure tes pas. Continue ton exploration.",
      questOffer:  "Avant tout, descends d'un étage. C'est l'épreuve la plus douce que je puisse t'offrir.",
      questActive: "Le grand escalier t'attend. Trouve-le, et reviens me voir une fois la descente accomplie.",
      questReady:  "Bien joué ! Tu as fait tes premiers pas. Voici ta récompense, bien méritée.",
      questDone:   "Tu es désormais lancé sur le chemin. Que la chance t'accompagne."
    },
    // ── Chaîne d'épreuves (Phase 3) — dialogues par quête ──
    // Override `questOffer` / `questActive` / `questReady` par quête.
    // Les textes ci-dessous sont ceux générés en audio (cf.
    // .claude/plans/voice-dumbledore-chain.md §3). Garder synchronisés
    // avec les samples OGG, sinon décalage texte/voix.
    dialoguesByQuest: {
      intro_tutoriel: {
        questOffer:  "Tu te demandes par où commencer ? Descends d'un étage — c'est l'épreuve la plus douce que je puisse t'offrir. Reviens me voir une fois la descente accomplie.",
        questActive: "Le grand escalier t'attend, jeune sorcier. Trouve-le, et reviens me retrouver dès que tu auras fait tes premiers pas vers le bas.",
        questReady:  "Bien joué. Tu as fait tes premiers pas — et déjà, le château reconnaît ton courage. Tiens, prends ceci : ce ne sont que des bagatelles, mais elles t'épauleront sur le chemin."
      },
      dumbledore_eveil: {
        questOffer:  "Tes peurs t'attendent dans les couloirs sombres, sous la forme d'un Épouvantard ou d'un Détraqueur. Affronte l'une de ces créatures. Ce que l'on défie nous rend plus forts.",
        questActive: "As-tu trouvé ta peur, jeune sorcier ? Ne tarde pas trop — les ombres se nourrissent du doute autant que de l'oubli.",
        questReady:  "Tu as défié ta peur. Voilà qui te servira plus que n'importe quel sort. Reçois ceci, et apprends ce léger sortilège — il te sera utile."
      },
      dumbledore_courage: {
        questOffer:  "Deux Mangemorts ont franchi nos défenses et rôdent dans les couloirs profonds. Élimine-les. C'est par la ruse autant que par le courage que l'on protège ceux qu'on aime.",
        questActive: "Les Mangemorts ne se rendent pas, jeune sorcier. Ils mourront pour leur cause — assure-toi qu'ils ne t'emportent pas avec eux.",
        questReady:  "Deux de moins. Le château respire un peu plus librement. Voici une potion que j'ai concoctée pour toi — et un bonus de force et de magie qui t'accompagneront."
      },
      dumbledore_resistance: {
        questOffer:  "Un Mangemort d'élite, membre du cercle intérieur, s'est glissé jusqu'aux étages oubliés. Trouve-le. L'Ordre du Phénix compte sur toi.",
        questActive: "Méfie-toi — il porte la Marque depuis des décennies. Son Cruciatus est implacable. Frappe vite, et garde une potion à portée de main.",
        questReady:  "L'Ordre te remercie, jeune sorcier. Reçois cette amulette — elle a appartenu à un ami que je n'ai pas pu sauver. Qu'elle te protège mieux qu'elle ne l'a protégé."
      },
      dumbledore_revelation: {
        questOffer:  "Au plus profond, une ombre se reforme. Bellatrix Lestrange a juré de finir ce que son maître n'a pu accomplir. Affronte-la — pour Poudlard, pour ceux que nous avons perdus.",
        questActive: "Bellatrix n'a peur de rien — sauf de l'amour, qu'elle ne comprend pas. Garde cela en tête. Ne la sous-estime pas.",
        questReady:  "Tu l'as fait. Tu as tenu tête à l'ombre… et tu en sors plus lumineux qu'avant. Reçois ce dernier don — un fragment de moi-même, en somme — et continue ton chemin. Poudlard te doit beaucoup."
      }
    }
  },
  {
    id:    "pomfresh",
    name:  "Madame Pomfresh",
    title: "Infirmière en chef",
    icon:  "🩺",
    portraitImg: "img/npc/pomfresh.png",
    placement: { floor: 2, anchor: "any" },
    questsGiven:    ["mandragore_pomfresh"],
    questsTurnedIn: ["mandragore_pomfresh"],
    dialogues: {
      greeting:    [
        "Par Merlin ! L'infirmerie est saturée et il me manque des Mandragores. Aurais-tu un instant, jeune sorcier ?",
        "Ces racines poussent dans les coffres et chez les marchands ambulants. Trois suffisent pour préparer l'antidote — files ne traînent pas."
      ],
      idle:        "Tant de pétrifiés, si peu de mains pour les soigner...",
      questOffer:  "Si tu pouvais m'apporter trois Racines de Mandragore, tu sauverais des vies !",
      questActive: "As-tu déjà trouvé les Mandragores ? Le temps presse...",
      questReady:  "Oh ! Tu les as ramenées ! Donne, donne — je te récompense aussitôt.",
      questDone:   "Grâce à toi, l'infirmerie respire enfin. Reviens si tu as besoin de soins."
    }
  },
  {
    id:    "mimi",
    name:  "Mimi Geignarde",
    title: "Fantôme des toilettes",
    icon:  "👻",
    portraitImg: "img/npc/mimi.png",
    placement: { floor: 2, anchor: "any" },
    questsGiven:    ["troll_toilettes"],
    questsTurnedIn: ["troll_toilettes"],
    dialogues: {
      greeting:    [
        "Snif... Personne ne vient jamais me voir... Personne, jamais, je suis tellement seule...",
        "Sauf ce sale Troll qui pollue MES toilettes ! Il sent affreusement mauvais et il fait du bruit toute la nuit. Tu pourrais le faire taire ?"
      ],
      idle:        "Snif... pourquoi est-ce toujours moi qui dois supporter ça ?",
      questOffer:  "Tu pourrais m'en débarrasser ? Élimine le Troll des Toilettes, je t'en supplie !",
      questActive: "Il sent toujours aussi mauvais... fais vite !",
      questReady:  "Tu l'as terrassé ? Oh ! Mes toilettes vont enfin retrouver leur calme...",
      questDone:   "Ces toilettes redeviennent presque accueillantes... pour un fantôme."
    }
  },
  {
    id:    "scamander",
    name:  "Newton Scamander",
    title: "Magizoologiste",
    icon:  "🐾",
    portraitImg: "img/npc/scamander.png",
    placement: { floor: 2, anchor: "any" },
    questsGiven:    ["niffleurs_trésor"],
    questsTurnedIn: ["niffleurs_trésor"],
    dialogues: {
      greeting:    [
        "Oh ! Un visiteur ! Mes Niffleurs se sont... euh... échappés. Encore.",
        "Ils volent tout ce qui brille — surveille bien ton or si tu en croises. Pourrais-tu m'aider à en neutraliser trois ?"
      ],
      idle:        "Ces petites créatures sont fascinantes, mais incroyablement filous.",
      questOffer:  "Élimine 3 Niffleurs avant qu'ils ne dévalisent les sous-sols !",
      questActive: "Combien en as-tu déjà attrapé ? Continue, je te prie.",
      questReady:  "Magnifique ! Les Niffleurs sont calmés. Voici ta récompense.",
      questDone:   "Tu as un don pour les bêtes magiques, jeune sorcier."
    }
  },
  {
    id:    "lockhart",
    name:  "Gilderoy Lockhart",
    title: "Professeur de DCFM (autoproclamé)",
    icon:  "✨",
    portraitImg: "img/npc/lockhart.png",
    placement: { floor: 3, anchor: "any" },
    questsGiven:    ["livre_interdit"],
    questsTurnedIn: ["livre_interdit"],
    dialogues: {
      greeting:    [
        "Ah, un admirateur ! Approche, approche. As-tu lu mes mémoires ? Non ? Quel dommage — je te recommande chaudement le tome trois.",
        "Eh bien, j'aurais une petite mission pour toi. Une bagatelle, vraiment. Pour quelqu'un de mon talent ce serait trivial — mais je suis un peu... occupé."
      ],
      idle:        "J'aurais bien récupéré ce livre moi-même, mais... mes cheveux n'aiment pas la poussière.",
      questOffer:  "Récupère le Livre des Monstres dans la Bibliothèque Interdite — pour la science, bien entendu.",
      questActive: "Tu as déjà mis la main sur ce satané ouvrage ?",
      questReady:  "Tu as réussi ? Magnifique ! Je dirai à tout le monde que c'est moi qui l'ai trouvé.",
      questDone:   "Mes mémoires te seront dédiées... peut-être. Si je ne t'oublie pas d'ici là."
    }
  },
  {
    id:    "lupin",
    name:  "Professeur Lupin",
    title: "Professeur de DCFM",
    icon:  "🐺",
    portraitImg: "img/npc/lupin.png",
    placement: { floor: 4, anchor: "any" },
    questsGiven:    ["lumiere_desespoir"],
    questsTurnedIn: ["lumiere_desespoir"],
    dialogues: {
      greeting:    [
        "Bienvenue, jeune sorcier. Je peux t'enseigner un sort puissant — mais d'abord, tu dois affronter ta peur la plus sombre.",
        "Le Patronus exige un souvenir heureux, pur, indéfectible. Sans lui, le Détraqueur t'engloutira. Es-tu prêt à passer cette épreuve ?"
      ],
      idle:        "Le Patronus exige plus que de la magie : il exige du courage.",
      questOffer:  "Affronte un Détraqueur, puis rapporte-moi un Chocolat aux Sorciers. Je t'enseignerai alors le sort du Patronus.",
      questActive: "As-tu trouvé un Détraqueur ? Et le chocolat ?",
      questReady:  "Tu reviens vivant — et avec le chocolat. Approche : voici le sort du Patronus.",
      questDone:   "Souviens-toi : un souvenir heureux est ta meilleure arme. Spero patronum !"
    }
  },
  {
    id:    "hagrid",
    name:  "Hagrid",
    title: "Garde-chasse de Poudlard",
    icon:  "🦉",
    portraitImg: "img/npc/hagrid.png",
    placement: { floor: 4, anchor: "any" },
    questsGiven:    ["chouette_perdue", "defense_cabane"],
    questsTurnedIn: ["chouette_perdue", "defense_cabane"],
    dialogues: {
      greeting:    [
        "Ah, te v'là ! Tu tombes bien — j'ai perdu une de mes chouettes ensorcelées dans la Forêt Interdite.",
        "Elle est têtue comme une mule, c'te bestiole. Mais c'est qu'un'amour, j'te jure. Tu pourrais m'aider à la r'trouver ?"
      ],
      idle:        "Y'a tant de bestioles à surveiller dans c'te Forêt...",
      questDone:   "Merci encore pour tout c'que t'as fait. Reviens quand tu veux pour boire un thé !"
    },
    // Dialogues spécifiques par quête (chaîne + répétable)
    dialoguesByQuest: {
      chouette_perdue: {
        questOffer:  "Trouve cette Chouette Ensorcelée et ramène-la moi, j'te r'compenserai bien.",
        questActive: "Toujours pas trouvé ? Fais attention, c'te bestiole sait s'cacher.",
        questReady:  "Tu l'as ! Magnifique ! Tiens, prends c'balai — t'en auras plus besoin que moi."
      },
      defense_cabane: {
        questOffer:  [
          "Ah, j'allais oublier ! Y'a des araignées géantes qui rôdent autour d'ma cabane c'temps-ci.",
          "Si tu pouvais m'en éliminer trois, j'pourrais enfin dormir tranquille. Et j'ai d'quoi t'remercier dignement."
        ],
        questActive: "T'en es à combien ? Faut pas qu'elles s'approchent de Crockdur, hein.",
        questReady:  "Trois d'moins ! Bien joué. Tiens, prends c'tte potion — j'la garde pour les soirs d'orage."
      }
    }
  },
  {
    id:    "mcgonagall",
    name:  "Professeur McGonagall",
    title: "Directrice de Gryffondor",
    icon:  "🐈",
    portraitImg: "img/npc/mcgonagall.png",
    placement: { floor: 5, anchor: "any" },
    questsGiven:    ["golem_passage"],
    questsTurnedIn: ["golem_passage"],
    dialogues: {
      greeting:    [
        "Un Gardien du Portail s'est éveillé dans les passages secrets. Il bloque l'accès à des connaissances précieuses.",
        "Soyez prudent : ce gardien est de pierre vivante, ses coups peuvent rompre un os. Préparez vos contre-sorts. Êtes-vous prêt à l'affronter ?"
      ],
      idle:        "L'ordre doit être maintenu, même dans ces souterrains.",
      questOffer:  "Neutralisez le Gardien du Portail. Je vous récompenserai à la hauteur du danger.",
      questActive: "Le Gardien est-il vaincu ?",
      questReady:  "Excellent travail. Voici votre récompense, bien méritée.",
      questDone:   "Vous avez prouvé votre valeur. Gryffondor peut être fier."
    }
  },

  // ── PNJ lore (placement fixe, pas de quête, pas de wares) ────
  // Définition seule — la logique associée (boutique baguettes pour
  // Ollivander, robes pour Guipure, mécanique de soin pour Fumseck,
  // indices stratégiques pour le portrait) sera câblée dans une
  // itération ultérieure.
  {
    id:    "ollivander",
    name:  "Mr Ollivander",
    title: "Fabricant de baguettes",
    icon:  "🪄",
    portraitImg: "img/npc/ollivander.png",
    placement: { floor: 3, anchor: "any" },
    wares: [
      { id: "wand1" },
      { id: "wand2" }
    ],
    buyback: {
      default: 0.50,
      byType:  { "wand": 0.75 }
    },
    questsGiven:    ["bottines_ollivander"],
    questsTurnedIn: ["bottines_ollivander"],
    dialogues: {
      greeting: [
        "Curieux... très curieux. Approche, jeune sorcier, et laisse-moi te regarder.",
        "Souviens-toi : ce n'est pas le sorcier qui choisit la baguette, c'est la baguette qui choisit le sorcier. Garde précieusement la tienne — elle se souvient de chaque sort.",
        "Si une de tes baguettes ne te convient plus, je te la rachèterai à bon prix. Et si tu cherches plus puissant que ton bois actuel, j'ai peut-être ce qu'il te faut."
      ],
      idle: "Le bois se souvient, le crin de licorne pardonne, mais le cœur de phénix... il choisit."
    }
  },
  {
    id:    "guipure",
    name:  "Madame Guipure",
    title: "Couturière de Pré-au-Lard",
    icon:  "🧵",
    portraitImg: "img/npc/guipure.png",
    placement: { floor: 5, anchor: "any" },
    wares: [
      { id: "robe1" },
      { id: "chapeau_apprenti" },
      { id: "cape_voyageur" },
      { id: "chapeau_pointu" }
    ],
    buyback: {
      default: 0.50,
      bySlot:  { "body": 0.75, "head": 0.75, "cloak": 0.75 }
    },
    questsGiven:    ["fil_acromantule"],
    questsTurnedIn: ["fil_acromantule"],
    dialogues: {
      greeting: [
        "Oh, un nouveau client ! Tiens-toi droit, que je prenne tes mesures du regard.",
        "Une bonne robe de sorcier, c'est plus qu'un vêtement : c'est une seconde peau qui résiste aux sortilèges. La tienne en a vu, dis-moi.",
        "Et si tu as une vieille pièce qui ne te sert plus, dépose-la sur le comptoir : je la reprends à prix d'amie."
      ],
      idle: "Une couture en zigzag tient mieux contre les sortilèges qu'un point droit. Note-le."
    }
  },
  {
    id:    "portrait_dumbledore",
    name:  "Portrait d'Albus Dumbledore",
    title: "Toile animée",
    icon:  "🖼️",
    portraitImg: "img/npc/portrait_dumbledore.png",
    placement: { floor: 6, anchor: "any" },
    questsGiven:    ["anneau_dumbledore"],
    questsTurnedIn: ["anneau_dumbledore"],
    dialogues: {
      greeting: [
        "(Le portrait s'éveille en clignant des yeux.) Ah, jeune sorcier... même peint, je veille sur ces couloirs.",
        "Ne te fie pas à ce qui semble immobile. Bien des secrets de ce château se cachent derrière les cadres dorés."
      ],
      idle: "(Le portrait somnole, puis t'adresse un léger sourire en te reconnaissant.)",
      contextualLore: [
        { monsterIds: ["mangemort", "mangemort_masque", "mangemort_elite", "bellatrix"],
          text: "Vise toujours la baguette d'abord. Un mangemort désarmé n'est qu'un homme effrayé." },
        { monsterIds: ["detraqueur", "detraqueur_gardien"],
          text: "Un Patronus n'est pas un mur, c'est une lumière. Il lui faut un souvenir heureux, pas un bouclier." },
        { monsterIds: ["bellatrix"],
          text: "Bellatrix se nourrit de la haine. Combats-la avec discipline, jamais avec rage." },
        { monsterIds: ["voldemort_affaibli", "voldemort_revenu"],
          text: "Tom a fragmenté son âme. Chaque éclat est une faille — cherche-les avant de l'affronter." },
        { monsterIds: ["troll", "troll_grotte"],
          text: "Un troll a la cervelle plus petite que son poing. Esquive, fais-le trébucher." },
        { monsterIds: ["loup_garou"],
          text: "L'argent ne ment jamais. Pour la bête, c'est une vérité qui mord." },
        { monsterIds: ["inferius"],
          text: "L'Inferius craint le feu vif autant que le sortilège. Garde toujours une flamme à portée." },
        { monsterIds: ["araignee", "acromantula_jeune", "homme_araignee"],
          text: "Aragog respectait un pacte. Ses enfants n'ont rien promis. Méfie-toi." }
      ]
    }
  },
  {
    id:    "fumseck",
    name:  "Fumseck",
    title: "Phénix de Dumbledore",
    icon:  "🔥",
    portraitImg: "img/npc/fumseck.png",
    placement: { floor: 7, anchor: "any" },
    specialAction: {
      type:  "heal_and_revive",
      label: "✨ Recevoir les larmes du phénix"
    },
    questsGiven:    ["bouclier_phenix"],
    questsTurnedIn: ["bouclier_phenix"],
    dialogues: {
      greeting: [
        "(Un chant cristallin s'élève. Un phénix écarlate te regarde sans crainte, perché sur un socle de bronze.)",
        "(Ses larmes scintillent à la commissure de son œil — la légende dit qu'elles guérissent les blessures les plus profondes.)",
        "(Fumseck incline la tête vers toi. Une larme nacrée perle au coin de son œil — il l'offre à qui ose tendre la main.)"
      ],
      idle: "(Fumseck déploie une aile, et quelques étincelles dansent dans l'air avant de s'éteindre.)",
      idleSpent: "(Le phénix sommeille, plumes éteintes. Reviendra-t-il à ta prochaine visite ?)"
    }
  },

  // ── Vendeurs ambulants (random:true) ─────────────────────────
  // Tirés au sort à la génération d'étage (cf. dungeon.js). Ne donnent
  // pas de quêtes — ouvrent une boutique réduite via npc.wares.
  {
    id:        "rosmerta",
    name:      "Madame Rosmerta",
    title:     "Buvette ambulante",
    icon:      "🍻",
    portraitImg: "img/npc/rosmerta.png",
    random:    true,
    minFloor:  2,
    maxFloor:  null,
    wares: [
      { id: "potion_s" },
      { id: "potion_m" },
      { id: "mandragore" },
      { id: "choco_sorcier" }
    ],
    // Rachat : 50% par défaut, 75% pour les consommables (sa spécialité).
    buyback: {
      default: 0.50,
      byType:  { "consumable": 0.75 }
    },
    dialogues: {
      greeting: [
        "Tiens, un sorcier en vadrouille ! Une petite Bièreaubeurre, ça vous tente ?",
        "J'ai aussi tout ce qu'il faut pour tenir le coup dans les couloirs. Servez-vous, vous me payez après."
      ],
      idle: "Les bonnes affaires sont rarement deux fois au même endroit, jeune sorcier."
    }
  },
  {
    id:        "mundungus",
    name:      "Mondingus Fletcher",
    title:     "Marchand au flair douteux",
    icon:      "🦨",
    portraitImg: "img/npc/mundungus.png",
    random:    true,
    minFloor:  3,
    maxFloor:  null,
    wares: [
      { id: "livre_sortileges" },
      { id: "livre_soin" },
      { id: "livre_bombarda" },
      { id: "felix" }
    ],
    // Rachat : 50% par défaut, 75% pour rare/epic/legendary (sa spécialité).
    buyback: {
      default:  0.50,
      byRarity: { "rare": 0.75, "epic": 0.75, "legendary": 0.75 }
    },
    dialogues: {
      greeting: [
        "Pst... approche, jeune sorcier. J'ai des... acquisitions exclusives.",
        "Pas de questions, juste des prix. Tu jettes un œil ?"
      ],
      idle: "T'inquiète, c'est honnête. Enfin presque."
    }
  },

  // ── PNJ "lore" (random:true, sans wares ni quêtes) ────────────
  // Saveur narrative seule. `dialogues.idleRandom` (array de strings)
  // est piocheé au hasard à chaque visite après la 1re rencontre.
  {
    id:        "sir_nicolas",
    name:      "Sir Nicolas de Mimsy",
    title:     "Fantôme de Gryffondor (presque sans-tête)",
    icon:      "👻",
    portraitImg: "img/npc/sir_nicolas.png",
    random:    true,
    minFloor:  1,
    maxFloor:  null,
    dialogues: {
      greeting: [
        "Bonjour, jeune Gryffondor ! Ou… Serdaigle ? Pardonnez-moi, ma tête a tendance à dodeliner.",
        "Si vous avez un moment, je voulais partager quelques anecdotes sur ce vieux château."
      ],
      idleRandom: [
        "On dit qu'au troisième étage, un miroir reflète plus que votre image…",
        "Le Baron Sanglant n'apparaît qu'aux nuits d'orage. Évitez les cachots ce soir.",
        "J'ai connu Godric Gryffondor en personne. Charmant, mais bien trop grand pour les portes.",
        "La Salle Sur Demande change selon le besoin. Certains la trouvent. D'autres y restent."
      ]
    }
  },
  {
    id:        "moine_gras",
    name:      "Le Moine Gras",
    title:     "Fantôme de Poufsouffle",
    icon:      "🍷",
    portraitImg: "img/npc/moine_gras.png",
    random:    true,
    minFloor:  2,
    maxFloor:  null,
    dialogues: {
      greeting: [
        "Ah, un voyageur fatigué ! Approche, mon enfant, et reprends souffle un instant.",
        "Le donjon est rude, mais la patience finit toujours par triompher de la furie."
      ],
      idleRandom: [
        "Une bonne assiette et un cœur tranquille — voilà mes secrets de longévité.",
        "Tu sais, mourir n'est pas si terrible. C'est de mal vivre qui devrait t'inquiéter.",
        "Helga Poufsouffle disait : « Tous égaux devant la marmite. » Ça m'a toujours plu.",
        "Méfie-toi des Inferius. Ils n'ont ni faim ni pitié."
      ]
    }
  },
  {
    id:        "rusard",
    name:      "Argus Rusard",
    title:     "Concierge de Poudlard",
    icon:      "🐈‍⬛",
    portraitImg: "img/npc/rusard.png",
    random:    true,
    minFloor:  1,
    maxFloor:  null,
    dialogues: {
      greeting: [
        "Encore un cancre qui erre dans MES couloirs ! Miss Teigne, surveille-le.",
        "Je n'ai pas le droit de te punir, MAIS Rogue m'avait promis qu'on ramènerait les chaînes…"
      ],
      idleRandom: [
        "Touche pas aux portraits. Touche pas aux vitrines. TOUCHE A RIEN.",
        "J'ai vu trois élèves disparaître dans ce couloir hier. Bon débarras.",
        "Miss Teigne te fixe. Elle sait. Elle sait toujours.",
        "De mon temps, on suspendait les fauteurs de troubles par les pouces."
      ]
    }
  },
  {
    id:        "trelawney",
    name:      "Sibylle Trelawney",
    title:     "Professeure de Divination",
    icon:      "🔮",
    portraitImg: "img/npc/trelawney.png",
    random:    true,
    minFloor:  3,
    maxFloor:  null,
    dialogues: {
      greeting: [
        "Oh ! Mon œil intérieur t'a vu venir depuis trois jours. Ou trois minutes. Le temps est si flou…",
        "Approche, mon enfant. Les ombres autour de toi me parlent."
      ],
      idleRandom: [
        "Je vois… je vois… une tasse de thé. Et un péril mortel. Probablement les deux.",
        "Tes lignes de la main indiquent un long voyage. Ou un déjeuner. C'est confus.",
        "Méfie-toi du chiffre 7 cette semaine. Ou du 3. Ou des deux.",
        "Le marc de café m'a révélé que ton destin est… intéressant. C'est tout ce que je peux dire."
      ]
    }
  }
];

// ── Helpers ────────────────────────────────────────────────────

function getNpcById(id) {
  return NPCS.find(n => n.id === id) || null;
}

function getNpcsForFloor(floor) {
  // PNJ fixes : placement déterministe par étage.
  return NPCS.filter(n => n.placement && n.placement.floor === floor);
}

function getRandomVendorsForFloor(floor) {
  // Vendeurs ambulants uniquement (présence de `wares`).
  return NPCS.filter(n =>
    n.random === true &&
    Array.isArray(n.wares) && n.wares.length > 0 &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

function getRandomLoreForFloor(floor) {
  // PNJ lore (random sans wares ni quêtes — saveur narrative seule).
  return NPCS.filter(n =>
    n.random === true &&
    !(Array.isArray(n.wares) && n.wares.length) &&
    !(Array.isArray(n.questsGiven) && n.questsGiven.length) &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

function getRandomEncountersForFloor(floor) {
  // Pool combiné : tout PNJ random éligible à cet étage (vendeur OU lore).
  // Utilisé par dungeon.js pour le tirage uniforme par étage.
  return NPCS.filter(n =>
    n.random === true &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

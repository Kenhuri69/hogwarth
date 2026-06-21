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
    sprite: "mage",
    icon:  "🧙‍♂️",
    portraitImg: "img/npc/dumbledore.png",
    placement: { floor: 1, anchor: "first-room" },
    // `eclats_clef_voute` est hors-chaîne (pas de prereq) : placé en fin de
    // liste pour que la chaîne d'épreuves garde la priorité d'affichage du
    // texte (getNpcQuestState), tandis que _npcDialogActions expose son
    // bouton « Accepter » en parallèle — voir rework multi-quête.
    questsGiven:    ["intro_tutoriel", "dumbledore_eveil", "dumbledore_courage",
                     "dumbledore_resistance", "dumbledore_revelation",
                     "eclats_clef_voute"],
    questsTurnedIn: ["intro_tutoriel", "dumbledore_eveil", "dumbledore_courage",
                     "dumbledore_resistance", "dumbledore_revelation",
                     "eclats_clef_voute"],
    dialogues: {
      // Cinématique d'intro (Clé de Voûte des Quatre) : 4 pages paginées
      // par showIntroScreen(). Voix : dumbledore_intro_1..4 (fallback muet).
      greeting:    [
        "Le professeur Binns récitait d'une voix d'outre-tombe, et toute la classe d'Histoire de la Magie sombrait dans une douce torpeur. Au centre de la salle, sur son socle de marbre, la Clé de Voûte des Quatre veillait — comme elle l'avait fait depuis mille ans.",
        "Puis vint un son qui n'appartenait pas à ce monde : un craquement de glace, net et profond. Le givre rampa sur la pierre, les flammes des bougies vacillèrent, et la lumière, une à une, s'éteignit.",
        "Sous nos pieds, les grands escaliers pivotèrent — non plus vers les tours, mais vers le bas, vers ce que l'école avait juré d'oublier. Un portrait hurla au fond du couloir. Et même Binns, pour la première fois, se tut.",
        "La Clé de Voûte des Quatre était le verrou qui scellait les profondeurs de Poudlard. Elle s'est fendue. Mes professeurs tiendront les étages du haut — mais la descente, jeune sorcier, je ne peux la confier qu'à toi. Trouve le grand escalier, et descends d'un étage."
      ],
      idle:        "Le château murmure tes pas. Continue ton exploration.",
      questOffer:  "Avant tout, descends d'un étage. C'est l'épreuve la plus douce que je puisse t'offrir.",
      questActive: "Le grand escalier t'attend. Trouve-le, et reviens me voir une fois la descente accomplie.",
      questReady:  "Bien joué ! Tu as fait tes premiers pas. Voici ta récompense, bien méritée.",
      questDone:   "Tu es désormais lancé sur le chemin. Que la chance t'accompagne."
    },
    // ── Suffixe fil rouge des Éclats (ch.06 §6.9.3) ──
    // Dumbledore — 4ᵉ voix des Fondateurs — commente la double trame à mesure
    // que le héros ramasse les Éclats de la Clé de Voûte (eclatProgress 1→3).
    // Appendu en fin de dialogue par _eclatSuffixPages (npc-dialog.js).
    eclatLines: {
      1: "Et puis… tu as trouvé un Éclat. Quelque chose s'est brisé là-dessous — tu le sens dans tes os, n'est-ce pas ? Ce n'était pas un simple accident.",
      2: "Deux Éclats, maintenant. Ce n'est pas qu'une fêlure qui s'élargit toute seule : on l'attise, d'en bas. Quelqu'un — quelque chose — veut que la Clé cède.",
      3: "Trois Éclats. Alors tu sais, désormais : le verrou cachait deux choses, pas une. Le mal que tu affrontes au fond n'est que la pointe émergée de ce que les Fondateurs ont scellé avec eux-mêmes."
    },
    // ── Chaîne d'épreuves (Phase 3) — dialogues par quête ──
    // Override `questOffer` / `questActive` / `questReady` par quête.
    // Les textes ci-dessous sont ceux générés en audio (cf.
    // .claude/plans/voice-dumbledore-chain.md §3). Garder synchronisés
    // avec les samples OGG, sinon décalage texte/voix.
    dialoguesByQuest: {
      intro_tutoriel: {
        questOffer:  "Tu as entendu la pierre se fendre, toi aussi. La Clé de Voûte des Quatre tenait le château fermé sur ses profondeurs — et la voilà brisée. Descends d'un étage : chaque pas vers le bas est un pas vers la fêlure. Reviens me voir une fois la descente accomplie.",
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
      },
      // Fil rouge « Clé de Voûte des Quatre » — quête de collecte optionnelle.
      // `questReady` est un tableau : la remise des 3 éclats déclenche une
      // SCÈNE DE RÉVÉLATION paginée (le payoff promis par `questOffer`).
      // Voix page-par-page : dumbledore_eclats_ready_1..3 (1 généré, 2-3
      // en fallback muet tant que les OGG ne sont pas fournis). Le bouton
      // « Remettre » n'apparaît qu'à la dernière page (_renderDialogPage).
      eclats_clef_voute: {
        questOffer:  "La Clé de Voûte s'est brisée en éclats, dispersés au fil de ta descente. Rapporte-m'en trois : reconstituée, ne serait-ce qu'un instant, la relique des Fondateurs dira ce qu'elle a tu pendant mille ans.",
        questActive: "Les éclats sont froids, et ils chuchotent — tu les sens, n'est-ce pas ? Cherche-les sur ce qui rôde dans chaque profondeur du château. Trois suffiront.",
        questReady:  [
          "Trois éclats… donne-les-moi. Vois comme ils s'appellent les uns les autres. La Clé se souvient des Quatre qui l'ont forgée — et, à travers elle, Poudlard se souvient de toi.",
          "Les éclats se rejoignent, et pour un battement de cœur, la Clé redevient entière. Elle te livre son secret : les Quatre ne l'ont pas forgée pour fermer une salle, mais pour sceller ce qui sommeillait déjà sous la colline — plus ancien que Poudlard, plus ancien qu'eux.",
          "Mais la fêlure n'a pas qu'ouvert une porte : elle a réveillé ce qui patientait derrière. Tout au fond, dans le froid qui remonte, une ombre se reconstitue éclat après éclat — comme cette relique, à rebours. Les Quatre scellèrent le bas ensemble ; à toi de descendre l'affronter."
        ]
      }
    }
  },
  {
    id:    "pomfresh",
    name:  "Madame Pomfresh",
    title: "Infirmière en chef",
    sprite: "prof_f",
    icon:  "🩺",
    portraitImg: "img/npc/pomfresh.png",
    placement: { floor: 2, anchor: "any" },
    questsGiven:    ["mandragore_pomfresh", "fabrique_pomfresh"],
    questsTurnedIn: ["mandragore_pomfresh", "fabrique_pomfresh"],
    // Quête de fabrication répétable en Boucle (étage 12) — gate minFloor:11.
    dialoguesByQuest: {
      fabrique_pomfresh: {
        questOffer:  "La Boucle me ramène les mêmes blessés, encore et encore. Si tu sais manier un chaudron, concocte-moi 3 Potions de Soin Mineure — l'infirmerie ne tient plus que par tes mains.",
        questActive: "Mes réserves ? Trois Potions de Soin Mineure, jeune sorcier. Le chaudron de Slughorn n'est pas loin.",
        questReady:  "Béni sois-tu. Voilà de quoi te remercier — et reviens vite, la Boucle ne cicatrise jamais."
      }
    },
    dialogues: {
      greeting:    [
        "Par Merlin ! L'infirmerie est saturée et il me manque des Mandragores. Aurais-tu un instant, jeune sorcier ?",
        "Ces racines poussent dans les coffres et chez les marchands ambulants. Trois suffisent pour préparer l'antidote — files ne traînent pas."
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Encore une égratignure ? Vous, les aventuriers, collectionnez les bandages comme d'autres les Chocogrenouilles.",
        "Une potion, du repos, et surtout pas de visiteurs : je chasse les curieux à coups de bassine.",
        "Tant de pétrifiés, si peu de mains pour les soigner...",
        "Je peux ressouder un os en une nuit. Reconstruire un courage, c'est une autre affaire.",
        "Grâce à toi, l'infirmerie respire un peu. Reviens si tu as besoin de soins.",
        "Certains lits, je ne les refais plus tout de suite. J'attends. Au cas où leur occupant me manquerait moins vite.",
        "On m'a amené des enfants que la magie noire avait touchés. Pour eux, je n'avais que des mots. Et les mots ne guérissent pas tout."
      ],
      questOffer:  "Si tu pouvais m'apporter trois Racines de Mandragore, tu sauverais des vies !",
      questActive: "As-tu déjà trouvé les Mandragores ? Le temps presse...",
      questReady:  "Oh ! Tu les as ramenées ! Donne, donne — je te récompense aussitôt."
    },
    // Phase E §6.2 — dialogue voyageur (visite inter-mondes). Le PNJ
    // perçoit que la présence n'est pas d'ici. Pas de bouton quête, pas
    // de transaction. Banque close, fallback générique géré par
    // npc-dialog.js — _astralFallbackPages.
    dialoguesAstral: [
      "Oh ! Te voilà... non, pas toi exactement. Une silhouette familière sans l'être. Tu portes la blouse d'un autre infirmier, voyageur.",
      "Mes Mandragores n'ont rien à faire dans ton plan, et les tiennes ne soigneront pas mes patients ici. Garde-les pour ceux qui ont besoin de toi, là-bas."
    ]
  },
  {
    id:    "mimi",
    name:  "Mimi Geignarde",
    title: "Fantôme des toilettes",
    sprite: "fantome",
    icon:  "👻",
    portraitImg: "img/npc/mimi.png",
    placement: { floor: 2, anchor: "any" },
    questsGiven:    ["troll_toilettes", "mimi_esprits"],
    questsTurnedIn: ["troll_toilettes", "mimi_esprits"],
    // Quête répétable en Boucle (étage 12) — apaiser les esprits hostiles.
    dialoguesByQuest: {
      mimi_esprits: {
        questOffer:  "Snif... Avant, j'étais seule. Maintenant il y a PIRE : des esprits méchants qui remontent par mes tuyaux et se moquent de moi ! Détruis-en deux, s'il te plaît... je te donnerai quelque chose que j'ai repêché.",
        questActive: "Ils sont encore là, à ricaner dans les canalisations... Tu les chasses, dis ?",
        questReady:  "Ils sont partis ! C'est… c'est presque calme. Tiens, j'ai gardé ça au fond du siphon pour toi. Reviens me voir, hein ?"
      }
    },
    dialogues: {
      greeting:    [
        "Snif... Personne ne vient jamais me voir... Personne, jamais, je suis tellement seule...",
        "Sauf ce sale Troll qui pollue MES toilettes ! Il sent affreusement mauvais et il fait du bruit toute la nuit. Tu pourrais le faire taire ?"
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Si quelqu'un tire la chasse pendant que je parle, je hante sa baignoire pour l'éternité. C'est une promesse.",
        "Snif... pourquoi est-ce toujours moi qui dois supporter ça ?",
        "Ces toilettes redeviennent presque accueillantes... pour un fantôme.",
        "On ne m'invite jamais aux fêtes des fantômes. Trop déprimante, qu'ils disent. Comme si EUX étaient gais.",
        "J'aurais pu hanter une jolie tour, un grand escalier… Mais non. Des toilettes. Toujours des toilettes.",
        "Je suis morte ici, tu sais. À cause d'une remarque sur mes lunettes. Une simple remarque… puis deux grands yeux jaunes.",
        "Avoir treize ans pour toujours, ce n'est pas un cadeau. C'est une porte qui ne se referme jamais.",
        // Accroche vers Manon (PNJ étage 3) — teaser sans spoiler.
        "Une fille se cache un étage plus bas — pas une élève, personne ne l'a inscrite nulle part. Elle dort dans les salles vides et file dès qu'on approche. J'ai voulu bavarder ; même elle me fuit. Une solitaire qui fuit une autre solitaire… tu imagines la tristesse ?"
      ],
      questOffer:  "Tu pourrais m'en débarrasser ? Élimine le Troll des Toilettes, je t'en supplie !",
      questActive: "Il sent toujours aussi mauvais... fais vite !",
      questReady:  "Tu l'as terrassé ? Oh ! Mes toilettes vont enfin retrouver leur calme..."
    },
    dialoguesAstral: [
      "Oh ! Oh ! Un fantôme d'un autre Poudlard ? Non... pas un fantôme. Pire. UN VIVANT D'AILLEURS.",
      "Personne, jamais, ne vient me voir ici — et voilà qu'on vient même d'un autre PLAN ! Snif... ironie cruelle. Si tu meurs un jour, voyageur, reviens hanter mes toilettes. On sera deux à pleurer."
    ]
  },
  {
    id:    "scamander",
    name:  "Newton Scamander",
    title: "Magizoologiste",
    sprite: "mage",
    icon:  "🐾",
    portraitImg: "img/npc/scamander.png",
    placement: { floor: 2, anchor: "any" },
    questsGiven:    ["niffleurs_trésor", "chasse_magizoologiste_boucle"],
    questsTurnedIn: ["niffleurs_trésor", "chasse_magizoologiste_boucle"],
    // Sorts & Magie 2.0 Lot P2 — enseignant générique (teach_spell) : le
    // magizoologiste apprend à invoquer un familier protecteur (Avis Praesidium).
    specialAction: {
      type:  "teach_spell",
      spell: "Avis Praesidium",
      oneShot: true,
      label: "🦉 Apprendre Avis Praesidium"
    },
    // Chasse farming en Boucle (étage 12) — cible dynamique {target}/{amount}.
    dialoguesByQuest: {
      chasse_magizoologiste_boucle: {
        questOffer:  "Fascinant ! La Boucle reforme des spécimens que je croyais perdus. Pour mon recensement, élimine {amount}× {target} repérés sur cet étage — au nom de la science, bien sûr.",
        questActive: "Mon carnet attend ! Ces {target}, tu les recenses ?",
        questReady:  "Extraordinaire travail de terrain ! Voilà ta part — et reviens, la Boucle a tant à cataloguer."
      }
    },
    dialogues: {
      greeting:    [
        "Oh ! Un visiteur ! Mes Niffleurs se sont... euh... échappés. Encore.",
        "Ils volent tout ce qui brille — surveille bien ton or si tu en croises. Pourrais-tu m'aider à en neutraliser trois ?"
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "J'ai cru avoir tout récupéré. Puis ma valise a éternué. Une valise ne devrait jamais éternuer.",
        "Ces petites créatures sont fascinantes, mais incroyablement filous.",
        "Tu as un don pour les bêtes magiques, jeune sorcier.",
        "Il n'existe pas de créature monstrueuse. Seulement des créatures incomprises — et des sorciers paresseux.",
        "On les appelle « bêtes ». Pourtant, ce sont rarement elles qui déclenchent les guerres.",
        "J'ai vu des Niffleurs vidés de leur or, des dragons écorchés pour leur peau. L'avidité ne s'arrête jamais à temps.",
        "Certaines espèces que j'ai connues n'existent plus. Je suis parfois le dernier à me souvenir qu'elles ont chanté."
      ],
      questOffer:  "Élimine 3 Niffleurs avant qu'ils ne dévalisent les sous-sols !",
      questActive: "Combien en as-tu déjà attrapé ? Continue, je te prie.",
      questReady:  "Magnifique ! Les Niffleurs sont calmés. Voici ta récompense."
    }
  },
  {
    id:    "slughorn",
    name:  "Horace Slughorn",
    title: "Maître des Potions",
    sprite: "prof_h",
    portraitImg: "img/npc/slughorn.png",
    icon:  "🧪",
    placement: { floor: 2, anchor: "any" },
    specialAction: {
      type:  "open_brewing",
      label: "<img class='ui-icon ui-icon-md' src='img/icons/items/potion_m.png' alt=''> Concocter une potion"
    },
    questsGiven:    ["quest_potions_slughorn", "quest_potions_slughorn_2", "quest_potions_slughorn_3"],
    questsTurnedIn: ["quest_potions_slughorn", "quest_potions_slughorn_2", "quest_potions_slughorn_3"],
    dialogues: {
      greeting:    [
        "Ah, un nouveau visage ! Horace Slughorn, maître des Potions — et fin connaisseur des talents prometteurs.",
        "Mon chaudron a vu naître des élixirs légendaires. Mais je ne le confie qu'aux élèves sérieux. Prouve-moi ta valeur, et je t'apprendrai l'art de la concoction."
      ],
      idle:        "Le chaudron mijote toujours quelque chose, chez moi.",
      questOffer:  "Apporte-moi 3 Racines de Mandragore. Un potionniste digne de ce nom sait se procurer ses ingrédients.",
      questActive: "Alors, ces Mandragores ? Le chaudron n'attend que toi.",
      questReady:  "Parfait, parfait ! Trois belles racines. Tu as l'étoffe d'un potionniste — laisse-moi te montrer.",
      questDone:   "Le chaudron est à toi quand tu veux. Concoctons quelque chose d'exquis."
    },
    dialoguesByQuest: {
      quest_potions_slughorn_2: {
        questOffer:  "Tu progresses bien. Pour les recettes avancées, il me faut des ingrédients frais : élimine 3 Mandragores Sauvages et leurs racines feront merveille.",
        questActive: "Ces Mandragores Sauvages sont coriaces, n'est-ce pas ? Persévère.",
        questReady:  "Magnifique récolte ! Voici deux recettes de Grande Potion — tu les as méritées."
      },
      quest_potions_slughorn_3: {
        questOffer:  "Tu as l'âme d'un maître, je le sens. Une dernière épreuve : la sécrétion des Bundimuns Venimeux est l'ingrédient secret de mes plus grands élixirs. Rapporte-m'en — élimine-en trois — et je t'ouvrirai mon grimoire le plus précieux.",
        questActive: "Ces Bundimuns sont corrosifs, prends garde à ton armure. Mais leur sécrétion vaut son pesant de Gallions.",
        questReady:  "Sublime ! Voici mes recettes de maître : la Potion de Force, la Potion de Résistance et l'Élixir d'Esprit Suprême. Use-en avec sagesse."
      }
    },
    // Slug Club (P6.b2) : Slughorn — collectionneur de talents — reconnaît
    // la Maison du joueur dès le premier contact et l'admet dans son cercle.
    // Override de `greeting` par `chosenHouse` (couche dialoguesByHouse).
    // L'admission elle-même (membership) est dérivée de seenNpcs ; le bonus
    // est la cadence de cueillette accrue (isSlugClubMember → searchRoom).
    dialoguesByHouse: {
      Gryffondor: {
        greeting: [
          "Ah, un Gryffondor ! Le courage, c'est précieux — mais sais-tu qu'on brasse aussi bien qu'on se bat ? J'ai eu de fameux lions à ma table.",
          "Bienvenue au Club de Slug, mon brave. Tu y gagneras un œil pour les herbes — les cueilleurs avisés en ramènent toujours davantage."
        ]
      },
      Serpentard: {
        greeting: [
          "Un Serpentard ! Ma propre maison, et la plus douée pour les Potions, n'en déplaise aux autres. L'ambition et le chaudron font bon ménage.",
          "Considère-toi admis au Club de Slug, naturellement. Les miens ont toujours su récolter ce que d'autres laissent pourrir entre les pierres."
        ]
      },
      Serdaigle: {
        greeting: [
          "Un Serdaigle ! L'esprit vif, l'œil pour le détail — exactement ce qu'il faut pour distinguer une bonne herbe d'une mauvaise.",
          "Le Club de Slug t'ouvre ses portes. Ta curiosité te fera ramasser deux fois plus que les distraits, crois-moi."
        ]
      },
      Poufsouffle: {
        greeting: [
          "Un Poufsouffle ! La patience et le travail — les meilleures vertus du potionniste, qu'on néglige trop souvent.",
          "Sois le bienvenu au Club de Slug. Les tiens ont la main verte ; tu reviendras de tes cueillettes la besace bien remplie."
        ]
      }
    }
  },
  {
    id:    "lockhart",
    name:  "Gilderoy Lockhart",
    title: "Professeur de DCFM (autoproclamé)",
    sprite: "prof_h",
    icon:  "✨",
    portraitImg: "img/npc/lockhart.png",
    placement: { floor: 3, anchor: "any" },
    questsGiven:    ["livre_interdit", "memoire_lockhart", "chroniques_lockhart"],
    questsTurnedIn: ["livre_interdit", "memoire_lockhart", "chroniques_lockhart"],
    // Rédemption en Boucle (étage 13) : Lockhart veut écrire la VRAIE histoire
    // de Manon. Chaîne prereq manon_confier ; gate minFloor:11.
    dialoguesByQuest: {
      memoire_lockhart: {
        questOffer:  "Entre nous… j'en ai assez de mes fables. La Boucle m'a montré combien elles sonnent creux. La petite du troisième étage — Manon — a une histoire vraie, bouleversante. Apporte-moi son récit : j'y mettrai mon nom, oui, mais pas un seul mensonge. Pour une fois.",
        questActive: "Tu as le récit de Manon ? Ma plume n'attend que la vérité, cette fois.",
        questReady:  "Voilà… des mots vrais, enfin. « Manon, fille de la lune. » Cela vaut tous mes prix d'enchanteur du sourire. Prends ce livre — tu l'as rendu possible."
      },
      // Suite répétable : galvanisé, Lockhart chronique la Boucle entière.
      chroniques_lockhart: {
        questOffer:  "Le succès de mon mémoire véridique m'a grisé ! Je chronique désormais la Boucle tout entière. Fouille-moi 4 recoins et rapporte de quoi nourrir un chapitre de plus — l'authenticité, quel filon !",
        questActive: "Du matériau, mon cher, du matériau ! Quatre recoins, et fouille bien.",
        questReady:  "Délicieux ! Voilà un chapitre de plus. Tiens, prends cette plume — elle a signé des vérités, désormais. Reviens vite, la Boucle est inépuisable."
      }
    },
    dialogues: {
      greeting:    [
        "Ah, un admirateur ! Approche, approche. As-tu lu mes mémoires ? Non ? Quel dommage — je te recommande chaudement le tome trois.",
        "Eh bien, j'aurais une petite mission pour toi. Une bagatelle, vraiment. Pour quelqu'un de mon talent ce serait trivial — mais je suis un peu... occupé."
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "J'ai été élu cinq fois Sourire le Plus Charmeur de Sorcière-Hebdo. Cinq fois ! La concurrence était… inexistante.",
        "J'aurais bien récupéré ce livre moi-même, mais... mes cheveux n'aiment pas la poussière.",
        "Mes mémoires te seront dédiées... peut-être. Si je ne t'oublie pas d'ici là.",
        "Le secret d'une bonne autobiographie ? Choisir des héros discrets. Très discrets. Qui ne se plaindront pas.",
        "Signer des autographes m'épuise plus qu'un duel. Enfin, j'imagine — pour le duel.",
        "Un petit sortilège d'Amnésie bien placé, et l'exploit devient le mien. Le héros, lui, ne se souvient même plus d'avoir eu peur. C'est presque un cadeau que je lui fais.",
        "Tant de braves gens m'ont tout donné : leurs récits, leurs cicatrices, leurs souvenirs. Surtout leurs souvenirs. Ils n'en avaient plus l'usage… enfin, plus après."
      ],
      questOffer:  "Récupère le Livre des Monstres dans la Bibliothèque Interdite — pour la science, bien entendu.",
      questActive: "Tu as déjà mis la main sur ce satané ouvrage ?",
      questReady:  "Tu as réussi ? Magnifique ! Je dirai à tout le monde que c'est moi qui l'ai trouvé."
    },
    dialoguesAstral: [
      "Mon admirateur d'un autre plan ! Quelle aubaine — un public élargi pour mes mémoires. Dis-moi, dans ton monde, suis-je aussi célèbre ?",
      "Hélas, hélas, je ne puis t'envoyer chercher mon livre ici — tu le rapporterais chez toi, et il manquerait sur mes étagères. Reviens quand les plans se toucheront mieux, voyageur."
    ]
  },
  {
    id:    "lupin",
    name:  "Professeur Lupin",
    title: "Professeur de DCFM",
    sprite: "prof_h",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Le chocolat soigne presque tout. Pour le reste… eh bien, il y a un peu plus de chocolat.",
        "Le Patronus exige plus que de la magie : il exige du courage.",
        "Souviens-toi : un souvenir heureux est ta meilleure arme. Spero patronum !",
        "Mes meilleurs amis m'ont accepté tel que j'étais. C'est la magie la plus puissante que j'aie connue — et la plus rare.",
        "Une fois par mois, je dois m'enfermer loin de tout ce que j'aime. Le pire détraqueur, parfois, c'est le calendrier.",
        "Il y a une bête en moi. Je passe ma vie à lui enseigner la patience. Certaines nuits, elle n'écoute pas.",
        "On apprend à craindre les loups-garous bien avant d'en croiser un. Crois-moi : je sais exactement ce que tu vois en me regardant.",
        "Le pire des sortilèges, ce n'est pas la morsure. C'est de regarder un berceau et de n'y voir qu'une condamnation. Je n'ai jamais trouvé le contre-sort à celui-là.",
        "On peut écrire une lettre par mois pendant seize ans sans jamais en poster une seule. La lâcheté, vois-tu, est très organisée.",
        "Quelque part vit une personne qui porte mon sang et mon malheur. Je prie pour qu'elle ne porte jamais mon nom — et je n'ai jamais rien tant regretté."
      ],
      questOffer:  "Affronte un Détraqueur, puis rapporte-moi un Chocolat aux Sorciers. Je t'enseignerai alors le sort du Patronus.",
      questActive: "As-tu trouvé un Détraqueur ? Et le chocolat ?",
      questReady:  "Tu reviens vivant — et avec le chocolat. Approche : voici le sort du Patronus.",
      contextualReaction: [
        { killedId: "fenrir_greyback",
          text: "Tu as abattu Greyback. L'homme qui a fait de moi ce que je suis, dans une chambre d'enfant. Je ne sais pas si je dois te remercier ou pleurer — alors je ferai les deux." }
      ]
    }
  },
  // PNJ original : fille cachée de Lupin. Pseudo-quête en deux volets
  // qui révèle son histoire et le double secret — paternel (Remus a fui)
  // et maternel (Élara a menti seize ans). Cf. .claude/plans/Manon.md.
  {
    id:    "manon",
    name:  "Manon Aubin",
    title: "L'inconnue du troisième étage",
    sprite: "prof_f",
    icon:  "🌙",
    portraitImg: "img/npc/manon.png",
    placement: { floor: 3, anchor: "any" },
    questsGiven:    ["manon_secret", "manon_pardon", "manon_revelio", "manon_grimoire", "manon_acte3", "manon_confier", "manon_compagnie"],
    questsTurnedIn: ["manon_secret", "manon_pardon", "manon_revelio", "manon_grimoire", "manon_acte3", "manon_confier", "manon_compagnie"],
    // Rédemption en Boucle (étage 13) : Manon confie l'histoire d'Élara, que
    // Lockhart mettra en mémoire (chaîne manon_confier → memoire_lockhart).
    dialoguesByQuest: {
      manon_confier: {
        questOffer:  "Tu reviens, encore. La Boucle nous ramène tous… alors autant que ça serve. Je veux que l'histoire de ma mère soit dite — pour de vrai. Aide-moi à rassembler ses souvenirs épars dans ces murs, et je les mettrai en mots.",
        questActive: "Ses souvenirs sont dispersés partout — fouille les recoins. Trois suffiront pour que je me souvienne assez.",
        questReady:  "C'est écrit. Tout y est : la lune, le mensonge, le pardon. Porte ce récit à quelqu'un qui saura le faire lire — même ce bouffon de Lockhart, s'il le faut. Au moins, lui, on l'écoute."
      },
      // Visite répétable : la Boucle est longue et Manon redoute le silence.
      manon_compagnie: {
        questOffer:  "Reste un peu… non, d'abord, rends-moi service : des Spectres Maudits rôdent près de ma salle et me terrifient. Chasses-en deux, et puis reviens t'asseoir. Juste un moment. Je n'aime pas être seule, dans la Boucle.",
        questActive: "Ils sont encore là, à gratter aux murs… Tu les éloignes, dis ?",
        questReady:  "Merci… c'est plus calme. Et tu es revenu. Ça compte, tu sais. Reviens encore, quand la Boucle pèsera trop."
      }
    },
    // Établi de fusion : disponible quand tous les feuillets du set actif
    // sont réunis (5 pages Acte II / 3 feuillets clairs Acte III).
    // Ouvre l'overlay #fusion-modal qui reconstitue le grimoire (= remise
    // de manon_grimoire) ou réunit les feuillets clairs (= remise de
    // manon_acte3). Cf. manon-grimoire-pages.md §6 + easter-egg.md §7.
    specialAction: { type: "open_fusion", id: "manon_fusion_grimoire",
                     label: "<img class='ui-icon ui-icon-md' src='img/icons/spellbook.png' alt=''> Reconstituer le grimoire" },
    dialogues: {
      greeting: [
        "Ne fais pas de bruit. S'il te plaît. (Elle est tapie dans l'ombre d'une salle de classe vide, les genoux contre la poitrine.) Tu n'es pas un professeur. Tant mieux — eux, je les évite.",
        "Je m'appelle Manon. Manon Aubin — le nom de ma mère ; c'est le seul que j'aie le droit de dire. Je vis dans ce château sans y être inscrite : je dors dans les salles vides, je mange ce que je trouve. Personne ne sait que je suis là. Personne ne doit savoir.",
        "Il y a deux mois, ma mère est morte. Élara. C'est elle qui m'a élevée — seule, loin d'ici — et qui m'a répété toute ma vie que mon père était tombé en héros à la guerre. En vidant sa maison, j'ai trouvé une photographie cousue dans la doublure d'une vieille malle : un homme qui me tenait, bébé, et qui ne souriait pas. Au dos, un seul mot. Un nom : Lupin.",
        "Ce nom, il vit. Ici, plus bas, à l'étage de la Défense. C'est mon père. (Sa voix se serre.) Ma mère m'a menti chaque jour pendant seize ans, et elle est partie avant que je puisse lui demander pourquoi, en face. Alors il me reste lui. Depuis des semaines je tourne dans ces couloirs sans oser descendre lui dire que j'existe encore. Tu veux bien m'écouter ? Ça fait si longtemps que je n'ai parlé à personne."
      ],
      idle: "(Elle n'est plus tapie dans l'ombre : elle se tient près de la fenêtre, le visage tourné vers la lumière.)",
      // Répliques post-réconciliation (état `done` → idleRandom).
      idleRandom: [
        "Le grimoire est entier, désormais. Je l'ouvre les soirs de gel, quand le froid dessine des fougères sur la vitre. L'écriture de ma mère y est nette, sûre — rien d'une menteuse. Le givre, elle l'aimait pour de vrai.",
        "J'ai appris son premier sort de glace dans ces pages. Quand je le lance, l'air refroidit comme elle a dû le refroidir mille fois. Pour la première fois, je fais un geste que je tiens d'elle — et non un mensonge.",
        "On prend le thé, maintenant. Tous les quinze jours, dans sa classe. On ne sait pas encore quoi se dire, alors on parle des élèves, des créatures, de la pluie. C'est maladroit. C'est précieux.",
        "Il a commencé à m'apprendre : la lune, la bête, comment lui parler au lieu de la combattre. Seize ans trop tard — mais il le fait.",
        "J'ai gardé le premier carré de chocolat, celui que tu m'as rapporté. Je ne le mangerai jamais. Certaines choses, on les garde pour se souvenir d'avoir eu peur.",
        "Les lettres, il me les a toutes données. Je les lis une par mois, le soir de la pleine lune — comme il les a écrites. C'est notre rendez-vous, désormais. Avec seize ans de retard.",
        "Je porte enfin son nom. Lupin. Ça sonne encore étrange dans ma bouche — mais c'est le mien. On me l'avait volé, je l'ai repris.",
        "On m'a cousu une écharpe jaune et noir. Je la porte même pour dormir. Tu trouves ça idiot ? Quand on a passé seize ans sans maison, on n'enlève pas la première qu'on vous donne.",
        "Je ne dirai pas que tout est réparé : un père ne se rattrape pas comme on rattrape un train. Mais il est là, je suis là, et la lune se lève sur nous deux au lieu de nous séparer.",
        "La photographie, je ne la cache plus : elle est posée près de ma fenêtre. Mes deux parents tiennent dans ce petit cadre. L'un boit le thé deux étages plus bas ; l'autre, je ne peux plus que la regarder.",
        "Je n'en veux plus à ma mère. Je ne lui ai pas pardonné — on ne pardonne pas à une tombe. Mais j'ai compris. Mentir seize ans, c'était son courage et sa lâcheté mêlés : se perdre pour me garder. Sa dernière ruse aura été de me rendre à mon père sans jamais avoir à dire tout haut « j'ai menti »."
      ]
    },
    dialoguesByQuest: {
      manon_secret: {
        questOffer: [
          "Tu redescends vers les étages profonds, n'est-ce pas ? Alors fais quelque chose pour moi. Va jusqu'à la classe de Défense, l'étage en dessous. Regarde-le. Je veux seulement savoir qu'il est réel — que je n'ai pas remonté toute cette histoire pour un fantôme.",
          "Tu le reconnaîtras sans peine : des cicatrices anciennes, un manteau trop usé, l'air de quelqu'un qui dort mal. Il s'appelle Lupin. Tu as sans doute entendu ce qu'il est — la pleine lune, la bête. On ne le dit qu'à voix basse.",
          "Ce qu'on ne dit pas, c'est que ça se transmet. Pas la morsure : le sang. Moi, je ne me change pas en loup. Mais les nuits de pleine lune, quelque chose se réveille là-dedans (elle touche sa poitrine) et gratte pour sortir. J'ai grandi en me croyant un monstre, sans personne pour m'expliquer pourquoi. Va le voir. Reviens me dire qu'il existe."
        ],
        questActive: "Tu ne l'as pas encore trouvé ? La classe de Défense, étage quatre. (Elle remonte ses genoux.) Prends ton temps. J'ai attendu seize ans — je peux bien attendre que tu descendes un escalier.",
        questReady: [
          "Tu l'as vu. Je le lis sur ton visage. (Elle ferme les yeux un instant.) Alors c'est vrai. Il est là, à un étage de moi, à enseigner le courage à des enfants — pendant qu'il n'a jamais eu celui de me regarder.",
          "Le pire ? Je ne lui en veux même pas d'avoir eu peur ; la peur, je connais. Et le mensonge — « ton père est mort en héros » — ce n'est même pas lui qui l'a prononcé. C'est ma mère. Chaque matin, pendant seize ans. Lui a fui une seule fois ; elle, elle a menti à chaque petit-déjeuner. Et elle est morte avant que je puisse lui hurler pourquoi. J'ai pleuré un héros imaginaire qui buvait son thé deux étages plus bas.",
          "Merci. Reviens me voir — il me reste une chose à te demander. La dernière, je crois. Celle qui me fait le plus peur."
        ]
      },
      manon_pardon: {
        questOffer: [
          "Voilà ce que je sais, maintenant que j'ai eu le temps d'y penser. Pourquoi il m'a cachée. (Elle compte sur ses doigts, lentement.) Un : son sang. Il était sûr de me condamner — et il avait raison, à moitié. Deux : le monde. Une enfant marquée « fille du loup-garou » ne trouve ni école, ni travail, ni amis ; le Ministère m'aurait inscrite sur un registre avant mes dix ans.",
          "Trois — et celle-là, il ne l'a jamais dite à personne : pendant la guerre, l'enfant de Remus Lupin aurait été une arme. Un otage contre lui, contre l'Ordre. Me faire disparaître, c'était peut-être la seule façon de me garder en vie. (Un silence.) Je me répète tout ça chaque nuit. Certaines nuits, j'y crois presque.",
          "Mais il me manque une pièce, et je ne l'aurai qu'en l'affrontant. Aide-moi une dernière fois. On raconte qu'il offre du chocolat à tous les élèves qui ont eu peur — à tous, sans exception. Va lui en demander, comme une élève ordinaire. Rapporte-m'en un carré. Je veux tenir dans ma main quelque chose qui vient de lui. Même s'il ignore que c'est pour sa fille."
        ],
        questActive: "Tu l'as, ce chocolat ? (Elle sourit faiblement.) C'est ridicule, je sais. Toute cette route, ces seize ans — et je remets mon courage à un carré de chocolat. Mais il faut bien commencer petit.",
        questReady: [
          "(Elle prend le carré de chocolat, le serre, ne le mange pas.) J'y suis allée. Tout de suite. Je ne me suis pas laissé réfléchir, sinon je n'y serais jamais allée. Je me suis plantée dans l'encadrement de sa porte et j'ai dit : « Bonjour. Je suis Manon. »",
          "Il a laissé tomber sa tasse. Je crois qu'il m'a reconnue avant même mon nom — à mes yeux, peut-être : les nuits de lune, ils virent à l'or. Comme les siens. Il n'a pas fait semblant, il n'a pas demandé « Manon qui ? ». Il a juste dit, très bas : « Tu as ses cheveux. Et mon malheur. »",
          "Puis il a ouvert un tiroir de son bureau. Plein de lettres. Des dizaines, datées, cachetées — jamais envoyées. Une par mois, depuis ma naissance. « Je les écrivais les soirs de pleine lune, m'a-t-il dit. Quand la bête me rappelait pourquoi je n'avais pas le droit de t'approcher. Te savoir loin et vivante, c'était tout ce que je pouvais t'offrir. »",
          "Et sous les siennes, il en gardait une autre — la seule qu'il n'avait pas écrite. Elle venait de ma mère. Élara la lui avait envoyée il y a deux mois, en sachant qu'elle ne verrait pas l'hiver : « Elle viendra te trouver. Je n'ai jamais su défaire mon mensonge — alors j'ai cousu la vérité dans sa malle, pour qu'elle bute dessus quand je ne serai plus là. Ne la fais pas attendre comme tu m'as fait attendre, moi. » Cette photographie que j'ai trouvée… ce n'était pas un oubli. C'était ma mère qui me parlait une dernière fois, faute d'avoir jamais osé le faire en face.",
          "Je leur en veux encore. Aux deux, longtemps sans doute. Mais aucun ne m'a abandonnée par indifférence. Mon père n'a jamais posté ses lettres ; ma mère n'a jamais dédit son mensonge ; et moi, je suis restée des semaines en haut de cet escalier sans oser le descendre. Nous sommes une famille de gens qui aiment trop pour oser le dernier pas. Au moins l'un de nous l'aura fait. Ce n'est pas un pardon — c'est un début.",
          "(Elle hésite, puis sourit pour la première fois.) Et il y a ceci. Lupin a tenu à ce que je passe enfin sous le Choixpeau — chez la Directrice, sur un tabouret bancal, seize ans trop tard. Le chapeau a longtemps hésité : il voyait Gryffondor, le sang de mon père, le courage. Puis il a soufflé : « Non — toi, il te faut une maison qui ne te demandera jamais de mériter d'y entrer. » Et il a crié POUFSOUFFLE. La maison de ceux qu'on accueille sans condition. Pour la première fois, j'ai une place. (Elle te tend la main.) Merci. Sans toi, je serais encore tapie dans le noir à compter les pas que je n'osais pas faire."
        ]
      },
      // ── Acte II — le grimoire de givre d'Élara ──
      manon_revelio: {
        questOffer: [
          "Reste encore un peu. J'ai trouvé autre chose dans la malle de ma mère — sous la doublure, contre la photographie. Un grimoire. Les pages arrachées, la reliure brisée, comme si on l'avait déchiré dans la colère. Ou dans la peur. C'était à elle.",
          "Élara avait un don, je le comprends seulement maintenant : la magie du givre. Le froid lui obéissait. (Elle effleure la couverture abîmée.) Mais je ne sais plus rien d'elle qui soit vrai. Seize ans de mensonge — alors ce grimoire, est-ce un héritage qu'elle me laisse, ou sa dernière mise en scène ? Je veux le reconstituer pour le savoir. Pour décider moi-même du vrai et du faux.",
          "Mon père m'a appris un charme pour ça : Revelio, celui qui dévoile ce qu'on a caché. Je peux te l'enseigner — mais le charme doit d'abord être accordé à un catalyseur de froid. Descends aux douves, terrasse un Strangulot : ces bestioles suintent un froid d'eau noire. Rapporte-m'en la trace."
        ],
        questActive: "Le Strangulot, tu l'as trouvé ? Cherche les douves, les galeries inondées des cachots. Le froid qu'il dégage — c'est exactement ce qu'il me faut pour accorder le charme à la magie de ma mère.",
        questReady: [
          "Tu rapportes le froid des douves sur toi ; je le sens d'ici. (Elle pose les mains sur le grimoire déchiré, ferme les yeux, murmure quelques mots.) Voilà — Revelio est accordé. Tends ta baguette.",
          "C'est fait. Tu connais le charme. Hors d'un combat, il dissipera le brouillard autour de toi et fera briller sur ta carte ce qui se cache ; face à une créature, il t'en dévoilera tous les secrets d'un seul coup. Sers-t'en pour retrouver les pages de ma mère — et reviens : il faut que je te dise où elle les a dissimulées."
        ]
      },
      manon_grimoire: {
        questOffer: [
          "J'ai compris ce que ma mère a fait du grimoire. Elle ne l'a pas seulement déchiré : elle a dispersé les pages dans le château et les a dissimulées par sortilège. Comme elle avait cousu la photographie dans la doublure de la malle — une vérité qu'il faut mériter de trouver.",
          "Cinq pages. Je les situe sur cinq étages : le deuxième, le troisième, le cinquième, le septième et le neuvième. Lance Revelio en chemin — le brouillard s'écartera et la page brillera sur ta carte. Fouille alors la salle pour la ramasser.",
          "Rapporte-les moi toutes les cinq. Nous reconstituerons le grimoire ensemble — et je saurai enfin si ma mère m'a légué une sorcière, ou seulement une menteuse de plus."
        ],
        questActive: "Combien de pages, déjà ? (Elle range les feuillets retrouvés dans un linge propre.) N'oublie pas Revelio — sans lui, tu passeras devant sans rien voir. Deuxième, troisième, cinquième, septième, neuvième étage.",
        questReady: [
          "Les cinq pages. Elles sont toutes là. (Sa voix tremble.) Viens — j'ai dressé un établi près de la fenêtre. Nous allons les assembler, et je verrai enfin le visage que ma mère voulait me laisser."
        ]
      },
      // ── Acte III — les feuillets clairs d'Élara ──
      // Pas de questOffer : l'Acte III s'ouvre IMPLICITEMENT quand le joueur
      // trouve le 1ᵉʳ feuillet (acceptQuest depuis _tryCollectPage). Les
      // rumeurs qui amènent là sont greffées dans idleRandom (_manonAct3Rumor).
      manon_acte3: {
        questActive: "Tu as trouvé un de ses feuillets clairs, n'est-ce pas ? (Elle le tient à la lumière, et le givre y scintille comme un sourire.) Il en reste deux — au sixième étage, au neuvième. Ceux-là ne cachent aucun secret : ce sont ses joies, semées exprès pour que je tombe dessus. Rapporte-les toutes, que je voie enfin ma mère rire.",
        questReady: [
          "Les trois feuillets clairs. Ils sont tous là. (Elle les étale sur l'établi, près de la fenêtre où le givre monte.) Regarde — pas un sortilège de guerre là-dedans. Une fougère à dessiner sur la vitre. Une goutte de pluie figée en perle. De la neige qu'on fait tomber dans une chambre, un soir de cœur lourd. Elle a couché ça noir sur blanc, pour moi, en riant — je le vois à son écriture : elle ne tremble pas comme dans les autres pages.",
          "Toute ma vie je l'ai crue faite seulement de prudence et de mensonge. Et voilà qu'elle me tend, par-dessus la mort, trois façons d'être heureuse avec un peu de froid. (Sa voix se brise, mais c'est un rire qui passe au travers.) Elle n'a pas seulement cousu sa peur dans ma malle — elle y a glissé sa joie, en espérant que je la trouve après le reste, pour que je ne reste pas sur le mensonge.",
          "(Elle souffle sur le carreau et, du bout de la baguette, y trace une fougère de givre — la toute première du grimoire.) Voilà. Je sais enfin à quoi elle ressemblait quand elle ne se cachait pas. Merci de me l'avoir rendue entière : la menteuse et la rieuse, la même femme. Les soirs de gel, désormais, je ne pleure plus toute seule. Je dessine."
        ]
      }
    }
  },
  // PNJ déterministe : Maître de la Chasse Sans Tête (easter egg comique).
  // Tapi dans les profondeurs (étage 6) ; le joueur curieux le trouve et
  // plaide la cause de Sir Nicolas. Quête `chasse_sans_tete` (kill Chevalier
  // Fantôme ×2). Portrait/sprite génériques fantôme (pas d'asset dédié en V1).
  // Cf. .claude/plans/headless-hunt-easter-egg.md.
  {
    id:    "sir_patrick",
    name:  "Sir Patrick Delaney-Podmore",
    title: "Maître de la Chasse Sans Tête",
    sprite: "fantome",
    icon:  "💀",
    portraitImg: "img/npc/sir_patrick.png",
    placement: { floor: 6, anchor: "any" },
    questsGiven:    ["chasse_sans_tete", "chasse_sans_tete_boucle"],
    questsTurnedIn: ["chasse_sans_tete", "chasse_sans_tete_boucle"],
    // Quête répétable en Boucle (étage 16) — chevaucher la Chasse Sans Tête.
    dialoguesByQuest: {
      chasse_sans_tete_boucle: {
        questOffer:  "Ha ! La Boucle nous offre une chevauchée éternelle, et il nous manque des cavaliers ! Terrasse 3 Chevaliers Fantômes — montre-nous ta fougue — et tu galoperas à nos côtés, tête ou pas.",
        questActive: "Alors, ces Chevaliers Fantômes ? La Chasse n'attend pas les traînards !",
        questReady:  "Magnifique chevauchée ! Au nom de la Chasse Sans Tête, accepte ce cor — sonne-le, et nous accourrons. Enfin… si nous retrouvons nos montures."
      }
    },
    dialogues: {
      greeting: [
        "Halte-là ! (Sa tête, parfaitement détachée, roule sous son bras le temps d'un salut goguenard.) Vous tombez sur Sir Patrick Delaney-Podmore, fondateur de la Chasse Sans Tête. Membres : décapités intégralement. Recalés : les autres.",
        "Ne me parlez pas de ce pauvre Nicolas. Une tête qui tient encore par un lambeau, ça n'est pas décapité, c'est… mal rangé. Le règlement est le règlement."
      ],
      idleRandom: [
        "Notre dernier tournoi de Hockey à Têtes fut un triomphe. Dommage que Nicolas n'ait pu y participer — il aurait fallu qu'il se débarrasse de ce dernier centimètre de peau.",
        "La décapitation, jeune sorcier, est un art. On ne s'improvise pas sans-tête.",
        "Quarante-cinq coups de hache pour Nicolas ! Et pas un n'a fini le travail. Quelle malchance — ou quel bourreau."
      ]
    },
    dialoguesByQuest: {
      chasse_sans_tete: {
        questOffer: [
          "Vous plaidez pour ce brave Nicolas ? (Il soupire, et sa tête en profite pour bâiller sous son bras.) Soit. Je veux une preuve qu'un fantôme entêté sait encore chasser.",
          "Au fond de ces galeries rôdent des Chevaliers Fantômes — des spectres si orgueilleux qu'ils n'ont jamais ôté leur heaume, même dans la mort. Terrassez-en deux et rapportez-moi leurs casques. Faites cela, et je reconsidérerai la candidature de votre ami."
        ],
        questActive: "Alors, ces deux heaumes ? Un Chevalier Fantôme ne se laisse pas décoiffer facilement, je vous l'accorde. Mais une chasse digne de ce nom se mérite.",
        questReady: [
          "Deux heaumes ! Et non des moindres. (Il les soupèse, ravi, manquant de faire tomber sa propre tête.) Voilà qui plaide mieux que mille suppliques.",
          "C'est entendu : j'accorde à Sir Nicolas une adhésion HONORAIRE à la Chasse Sans Tête. Il défilera derrière le cortège — pas devant, n'exagérons rien — mais il défilera. Et vous, mon brave, vous voilà membre d'honneur de notre confrérie. Portez ce titre avec panache !"
        ]
      }
    }
  },
  {
    id:    "hagrid",
    name:  "Hagrid",
    title: "Garde-chasse de Poudlard",
    sprite: "prof_h",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "C'te bestiole a trois rangées d'dents et crache du feu, mais au fond c'est qu'un gros câlin, j'te jure.",
        "Y'a tant de bestioles à surveiller dans c'te Forêt...",
        "Merci encore pour tout c'que t'as fait. Reviens quand tu veux pour boire un thé !",
        "Les gens voient ma taille et changent d'trottoir. Si seulement ils prenaient l'temps d'un thé.",
        "On m'a renvoyé d'l'école quand j'étais gamin. Pour une faute qu'j'avais pas commise. Ça… ça reste, tu sais.",
        "J'ai élevé une araignée, autrefois. Aragog. Ses enfants, eux, m'ont jamais r'connu comme un ami. Faut pas leur en vouloir — c'est leur nature.",
        "La Forêt prend c'qu'on lui laisse traîner. Élèves, créatures, secrets… Elle rend rien. Jamais."
      ],
      contextualReaction: [
        { killedId: "aragog",
          text: "Alors… Aragog est parti pour de bon. C'était mon ami, tu sais, l'plus vieux qu'j'avais. Mais ses p'tits avaient pas son cœur. J'comprends qu'il fallait. J'comprends." }
      ]
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
    },
    dialoguesAstral: [
      "Eh ben dis donc ! T'as l'odeur d'un sorcier, mais pas l'goût d'ici. T'es de quel château, toi ?",
      "M'enfin... même si j'te confiais une chouette à cherche', tu la r'trouverais dans TON plan, pas l'mien. Ça serait pas bien utile, hein ? Reviens m'voir si jamais les mondes s'recroisent vraiment."
    ]
  },
  {
    id:    "mcgonagall",
    name:  "Professeur McGonagall",
    title: "Directrice de Gryffondor",
    sprite: "prof_f",
    icon:  "🐈",
    portraitImg: "img/npc/mcgonagall.png",
    placement: { floor: 5, anchor: "any" },
    specialAction: {
      type:  "claim_house_reward",
      house: "Gryffondor",
      label: "<img class='ui-icon ui-icon-md' src='img/icons/gold.png' alt=''> Recevoir votre récompense"
    },
    // La Quête Signature 🦁 « L'Étendard de Godric » est désormais confiée par le
    // donneur thématique dédié (Chevalier Fantôme `chevalier_godric`, ch.06 §6.8.5) ;
    // McGonagall garde la leçon, le set, le don et la remise cérémonielle de la relique.
    questsGiven:    ["golem_passage", "quest_set_gryff", "quest_don_gryff"],
    questsTurnedIn: ["golem_passage", "quest_set_gryff", "quest_don_gryff"],
    dialogues: {
      greeting:    [
        "Un Gardien du Portail s'est éveillé dans les passages secrets. Il bloque l'accès à des connaissances précieuses.",
        "Soyez prudent : ce gardien est de pierre vivante, ses coups peuvent rompre un os. Préparez vos contre-sorts. Êtes-vous prêt à l'affronter ?"
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Cinquante points pour le courage. Et cinquante de moins si vous claquez encore cette porte.",
        "L'ordre doit être maintenu, même dans ces souterrains.",
        "Vous avez prouvé votre valeur. Gryffondor peut être fier.",
        "Le courage n'est pas l'absence de peur, mais le choix de la regarder en face. Notez-le.",
        "J'ai vu des élèves que j'avais grondés le matin tomber au combat le soir même. Je gronde quand même : c'est ma façon de les garder en vie.",
        "Ce château, je l'ai défendu pierre par pierre. Certaines portent encore des noms que je préférerais oublier.",
        "On me croit de pierre. C'est faux. Je me suis seulement entraînée, très longtemps, à ne pas pleurer devant vous."
      ],
      questOffer:  "Neutralisez le Gardien du Portail. Je vous récompenserai à la hauteur du danger.",
      questActive: "Le Gardien est-il vaincu ?",
      questReady:  "Excellent travail. Voici votre récompense, bien méritée."
    },
    dialoguesByQuest: {
      quest_set_gryff: {
        questOffer:  "Une Chimère rôde dans les profondeurs. Trois de ces bêtes — pas une de moins — et vous aurez gagné le Cœur du Lion. M'accordez-vous ce service ?",
        questActive: "Les Chimères tiennent-elles encore tête à un lion ?",
        questReady:  "Trois Chimères abattues. Le Cœur du Lion vous revient — repassez le réclamer, comme il sied à un héritier de Godric."
      },
      quest_don_gryff: {
        questOffer:  "Gryffondor n'oublie jamais les siens, mais ses coffres, eux, ont une mémoire courte. Un don de 3000 Gallions soutiendrait nos jeunes recrues. La générosité, voyez-vous, est une forme de courage.",
        questActive: "Avez-vous réuni les 3000 Gallions promis à la Maison ?",
        questReady:  "Trois mille Gallions pour Gryffondor. Voilà un geste digne d'un lion — la Maison vous en sait gré."
      }
    }
  },
  // ── Donneur de Quête Signature 🦁 (original, gaté Gryffondor) ──
  // Chevalier Fantôme : variante NON-HOSTILE du `chevalier_fantome` du
  // bestiaire (§6.8.5). Confie « L'Étendard de Godric » ; n'apparaît que
  // si chosenHouse === 'Gryffondor' (houseGate). Le mini-boss « Porte-Étendard
  // Déchu » (climax kill `chevalier_fantome`) est une entité distincte.
  {
    id:    "chevalier_godric",
    name:  "Chevalier Fantôme",
    title: "Garde de l'Étendard de Godric",
    sprite: "chevalier",
    icon:  "⚔️",
    portraitImg: "img/npc/chevalier_godric.png",
    houseGate: "Gryffondor",
    placement: { floor: 2, anchor: "any" },
    questsGiven:    ["quest_signature_gryff"],
    questsTurnedIn: ["quest_signature_gryff"],
    dialogues: {
      greeting: [
        "Halte… non. Approche, plutôt. Voilà mille ans que je veille ce couloir, l'épée haute, et nul ne m'avait encore regardé en face. La fêlure a éteint les escaliers — mais elle éteint aussi le courage, et ça, je ne peux le souffrir.",
        "Je suis tombé en défendant ce château lors d'un siège que plus personne ne nomme, et l'on ne m'a jamais dit que je pouvais me reposer. Toi, lion, tu portes encore la flamme. Il est temps de reprendre l'Étendard de Godric — la bannière qui ne s'incline jamais."
      ],
      idleRandom: [
        "Mille ans de garde. On finit par parler aux torches. Elles, au moins, ne désertent pas.",
        "Le courage n'est pas de ne pas trembler. C'est de tenir la porte en tremblant.",
        "J'ai connu un Fondateur, jadis — frère d'armes, presque. Il riait fort. Garde ce nom pour toi, lion.",
        "Tu sens ce froid ? C'est la fêlure. Elle gèle les cœurs avant les pierres. Garde le tien chaud."
      ],
      questOffer:  "Trois épreuves, dans l'ordre, et tu seras digne de la bannière. La peur que sèment les Épouvantards a étouffé trois brasiers du courage : dissipe-la pour les rallumer. Puis monte jusqu'à la Tour sans jamais reculer d'un pas. Là veille le Porte-Étendard Déchu — un frère que la fêlure a retourné. Reprends-lui l'Étendard de Godric, la bannière qui ne s'incline jamais. Un meneur passe devant pour que les autres passent.",
      questActive: "Les brasiers, la montée, le Déchu — dans cet ordre, lion. Le château retient son souffle avec toi.",
      questReady:  "Tu l'as repris au Déchu. Godric n'aurait pas mieux fait — et moi, enfin, je peux poser mon épée. La Bannière de Godric t'attend : le professeur McGonagall te la remettra, comme il sied à un héritier du Lion.",
      questDone:   "Va, porteur de l'Étendard. La bannière ne s'incline jamais — et toi non plus, désormais."
    }
  },
  {
    id:    "rogue",
    name:  "Professeur Severus Rogue",
    title: "Directeur de Serpentard",
    sprite: "prof_h",
    icon:  "🦇",
    portraitImg: "img/npc/rogue.png",
    placement: { floor: 4, anchor: "any" },
    specialAction: {
      type:  "claim_house_reward",
      house: "Serpentard",
      label: "<img class='ui-icon ui-icon-md' src='img/icons/gold.png' alt=''> Recevoir votre récompense"
    },
    // La Quête Signature 🐍 « Le Pacte des Cachots » est désormais confiée par le
    // donneur thématique dédié (Écho de Salazar `echo_salazar`, ch.06 §6.8.6) ;
    // Rogue garde le set, le don et la remise cérémonielle de la relique.
    questsGiven:    ["quest_set_slyth", "quest_don_slyth"],
    questsTurnedIn: ["quest_set_slyth", "quest_don_slyth"],
    dialogues: {
      greeting: [
        "Tiens, tiens... un élève de ma maison qui ose s'aventurer ici.",
        "L'ambition n'est rien sans la maîtrise. Voyons si vous méritez ce qui vous attend."
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Trois élèves m'ont demandé aujourd'hui si une potion ratée pouvait exploser. Elle le peut. Eux aussi, désormais.",
        "Concentrez-vous. La distraction tue plus vite que les sortilèges.",
        "Je n'enseigne pas pour être aimé. L'affection est un luxe ; la survie, une discipline.",
        "Vous me trouvez injuste. Bien. Le monde l'est davantage, et lui ne vous préviendra pas.",
        "J'ai commis, étant jeune, une erreur dont le prix ne cesse jamais d'augmenter. Veillez à ne pas m'imiter.",
        "Certaines fautes ne se rachètent pas. On apprend seulement à les porter sans trébucher.",
        "Il y a un souvenir que je garderai jusqu'au dernier souffle. Toujours. Ne me demandez pas lequel."
      ]
    },
    dialoguesByQuest: {
      quest_set_slyth: {
        questOffer:  "Trois Basilics Mineurs souillent les cachots oubliés. Élimine-les. Sans bruit, sans gloire. La Couronne du Basilic n'est pas pour les vantards.",
        questActive: "Encore en vie ? Surprenant. Le travail n'est pas terminé.",
        questReady:  "Trois Basilics, trois preuves. La Couronne vous attend — venez la chercher quand l'ambition vous le dictera."
      },
      quest_don_slyth: {
        questOffer:  "L'ambition sans moyens n'est qu'un rêve d'enfant. Verse 3000 Gallions au trésor de Serpentard, et la Maison saura s'en souvenir le moment venu.",
        questActive: "Les 3000 Gallions. Serpentard attend — l'attente n'est pas une vertu que je cultive.",
        questReady:  "Trois mille Gallions versés sans un mot. Voilà qui est… habile. Serpentard n'oubliera pas."
      }
    }
  },
  // ── Donneur de Quête Signature 🐍 (original, gaté Serpentard) ──
  // Écho de Salazar : pas un fantôme — une présence murmurée derrière un
  // passage scellé des cachots (§6.8.6). Confie « Le Pacte des Cachots » ;
  // le choix gris Pacte/Défiance se joue à la remise (turnInSlythSignature,
  // déjà câblé dans npc-dialog.js sur le qid). houseGate Serpentard.
  {
    id:    "echo_salazar",
    name:  "Écho de Salazar",
    title: "Présence des Cachots",
    sprite: "echo",
    icon:  "🐍",
    portraitImg: "img/npc/echo_salazar.png",
    houseGate: "Serpentard",
    placement: { floor: 4, anchor: "any" },
    questsGiven:    ["quest_signature_slyth"],
    questsTurnedIn: ["quest_signature_slyth"],
    dialogues: {
      greeting: [
        "…Tu es venu. Ils viennent toujours, ceux de ma Maison. Je suis l'écho de Salazar Serpentard — ce qu'il en reste, scellé ici avec la corruption qu'il a aidé à enfermer. Car les Fondateurs n'ont pas seulement muré un mal du dehors. Ils ont muré une part d'eux-mêmes.",
        "Ne me crains pas comme un démon. Je suis un Fondateur qui, mille ans avant toi, a fait le choix qui t'attend. Descends, ouvre mon passage, et viens chercher ce que j'ai à t'offrir — ou à te montrer."
      ],
      idleRandom: [
        "Le pouvoir n'est pas mal, petit. Il est seulement… disponible. C'est ce qu'on en fait qui pèse.",
        "Tu n'es pas tenté par le mal. Tu es tenté par la facilité. Ne confonds jamais les deux.",
        "Ce que ton ennemi cherche tout au fond, c'est ce que j'ai scellé. Médite cela avant de l'affronter.",
        "Un serpent ne ment pas. Il choisit seulement ce qu'il montre."
      ],
      questOffer:  "Sous ces cachots dort mon passage secret. Descends l'ouvrir, franchis les serpents qui le gardent, puis arrache au Basilic le secret des Fondateurs. Alors — alors seulement — tu sauras assez pour choisir : sceller notre pacte, ou me défier. Je ne te demande pas ton âme. Juste un raccourci, et un secret qui ne t'appartient pas tout à fait.",
      questActive: "Le passage, les serpents, le Basilic. L'écho est patient — il a mille ans d'avance sur ton impatience.",
      questReady:  "Tu as percé ma vérité, petit. Reste l'unique chose qui t'appartienne vraiment : le choix. Scelle le Pacte et le pouvoir t'écoutera… ou défie-moi, et garde les mains libres. Décide.",
      questDone:   "Le choix est fait. Il l'est pour toujours — c'est ce qui en faisait un choix. Va, héritier du Serpent."
    },
    // ── Suffixe fil rouge des Éclats (ch.06 §6.9.3) ──
    // L'écho — voix de Fondateur — relaie la révélation distribuée à mesure des
    // Éclats : la garde de Godric, sa propre faute, puis la faille de Rowena.
    eclatLines: {
      1: "(Un murmure froid t'accompagne.) Tu portes un Éclat… La première stèle le dirait mieux que moi : on ne scelle pas par peur. On tient la porte. Godric avait raison sur ce point.",
      2: "Deux Éclats. Alors écoute ce que nul autre n'avouera : j'ai scellé ma part avec ma faute. Le mal d'en bas n'est pas seulement venu du dehors — nous l'avons nourri de nous-mêmes.",
      3: "Trois Éclats, petit. Rowena l'avait écrit avant de mourir : comprends, et la faille apparaît. Tu sais maintenant ce que ton ennemi cherche au fond — c'est ce que j'ai aidé à enfermer."
    },
    // ── Suffixe réputation (ch.06 §6.9.2) — dérivé de slythPactChoice ──
    // L'écho se souvient du choix du Pacte : scellé (warm) ou défié (hostile).
    reputationLines: {
      warm:    "(L'écho s'enroule autour de toi, presque tendre.) Tu as scellé. Bien. Désormais ma part marche avec toi, et toi avec elle. Le pouvoir t'écoutera, héritier — veille seulement à ne jamais l'écouter en retour.",
      hostile: "(L'écho se fige, froid comme la pierre.) Tu m'as défié. Je ne t'en garde pas rancune — un serpent respecte qui garde les mains libres. Mais ne reviens pas quémander ce que tu as refusé de prendre.",
    }
  },
  {
    id:    "flitwick",
    name:  "Professeur Filius Flitwick",
    title: "Directeur de Serdaigle",
    sprite: "prof_h",
    icon:  "🎓",
    portraitImg: "img/npc/flitwick.png",
    placement: { floor: 6, anchor: "any" },
    specialAction: {
      type:  "claim_house_reward",
      house: "Serdaigle",
      label: "<img class='ui-icon ui-icon-md' src='img/icons/gold.png' alt=''> Recevoir votre récompense"
    },
    questsGiven:    ["quest_signature_raven", "quest_set_raven", "quest_don_raven"],
    questsTurnedIn: ["quest_signature_raven", "quest_set_raven", "quest_don_raven"],
    dialogues: {
      greeting: [
        "Oh ! Un esprit aiguisé, n'est-ce pas ? L'aigle de Serdaigle se reconnaît au premier regard.",
        "Approchez, approchez. Le savoir récompense ceux qui le cultivent avec assiduité."
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "On me prend pour un bibelot posé sur une pile de livres. Puis je lève ma baguette. On me reprend rarement deux fois.",
        "J'ai fait léviter un piano à queue, une fois. Le pianiste jouait encore — il a très bien terminé son morceau.",
        "Un sortilège bien exécuté vaut mille incantations brouillonnes. Travaillez vos gestes.",
        "La taille d'un sorcier ne dit rien de la portée de sa baguette. Retenez-le.",
        "J'ai été champion de duel, jadis. Ce n'est pas un titre qu'on remporte sans laisser quelques adversaires… diminués.",
        "On néglige toujours les petites choses : une étincelle, un mot, un homme menu. C'est ce qu'on néglige qui finit par tout embraser.",
        "J'ai vu des duels où l'on riait au premier sort. Plus personne ne riait au dernier."
      ]
    },
    dialoguesByQuest: {
      quest_signature_raven: {
        questOffer:  "Oh ! Vous voyez une catastrophe ? Moi, une question mal posée. Le Codex de Rowena a été dispersé : trois portraits-gardiens en cachent les premiers feuillets — forcez-les. Puis descendez jusqu'à la Salle des Aigles, où le Gardien du Portail veille sur les derniers. Recomposez le tout : comprendre, c'est désamorcer. Rowena l'a écrit en sachant qu'elle mourrait avant de le finir.",
        questActive: "Les portraits, la Salle des Aigles, le Gardien — chaque feuillet à sa place. Le savoir s'écrit dans la patience.",
        questReady:  "Vous avez recomposé le Codex ! Magnifique — vous avez compris ce que même les professeurs n'osent nommer. Le Codex de Rowena vous revient ; venez le réclamer."
      },
      quest_set_raven: {
        questOffer:  "Hécate la Maudisseuse dévore nos grimoires interdits. Trois de ses avatars, voilà ce qu'il faut anéantir — et l'Anneau du Savoir sera vôtre.",
        questActive: "Le savoir s'écrit dans le silence — combien d'avatars d'Hécate avez-vous réduits au néant ?",
        questReady:  "Trois maudisseuses, trois pages préservées. L'Anneau du Savoir vous attend — revenez le réclamer."
      },
      quest_don_raven: {
        questOffer:  "Oh ! Préserver le savoir coûte cher, savez-vous ? Un don de 3000 Gallions, et nos grimoires resteront à l'abri une génération de plus. Y consentez-vous ?",
        questActive: "Les 3000 Gallions pour la bibliothèque de Serdaigle — les avez-vous réunis ?",
        questReady:  "Trois mille Gallions pour le savoir. Magnifique ! Chaque grimoire sauvé vous dira merci à sa façon."
      }
    }
  },
  {
    id:    "sprout",
    name:  "Professeur Pomona Chourave",
    title: "Directrice de Poufsouffle",
    sprite: "prof_f",
    icon:  "🌱",
    portraitImg: "img/npc/sprout.png",
    placement: { floor: 3, anchor: "any" },
    specialAction: {
      type:  "claim_house_reward",
      house: "Poufsouffle",
      label: "<img class='ui-icon ui-icon-md' src='img/icons/gold.png' alt=''> Recevoir votre récompense"
    },
    questsGiven:    ["quest_signature_pouf", "quest_set_pouf", "quest_don_pouf", "quest_garden_sprout", "quest_garden_sprout_2"],
    questsTurnedIn: ["quest_signature_pouf", "quest_set_pouf", "quest_don_pouf", "quest_garden_sprout", "quest_garden_sprout_2"],
    dialogues: {
      greeting: [
        "Ah, un Poufsouffle ! La loyauté finit toujours par porter ses fruits — comme mes plantes.",
        "Ne sous-estimez jamais le travail acharné. C'est ce qui distingue les vrais sorciers."
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Une Tentacula vénéneuse m'a encore mordu le chapeau ce matin. Ce chapeau en a vu d'autres. Moi aussi.",
        "Patience et persévérance, comme on l'enseigne aux racines.",
        "Une plante pousse dans le noir sans se plaindre. Il y a là une leçon que bien des sorciers refusent d'apprendre.",
        "Le terreau le plus riche est toujours celui qui a recouvert quelque chose. Ne creusez pas trop, parfois.",
        "Le cri d'une Mandragore adulte tue net. Je fais répéter les protections à mes élèves jusqu'à ce qu'ils en rêvent.",
        "Le Filet du Diable n'attaque jamais. Il attend, simplement, que vous cessiez de vous débattre.",
        "On m'a un jour demandé des Mandragores pour ranimer des enfants pétrifiés. Je les ai cultivées en pleurant. Une serre garde bien les secrets."
      ]
    },
    dialoguesByQuest: {
      quest_signature_pouf: {
        questOffer:  "Quand le château bascule, tout le monde regarde vers le bas. Toi, regarde autour : combien sont restés coincés ? Trois choses, mon petit : rapporte des vivres pour les blessés, escorte les égarés en lieu sûr plus bas, puis tiens bon contre la vague d'Inferi. On n'avance pas vite — on avance sûrement, et ensemble. Que personne ne soit oublié au fond.",
        questActive: "Le Refuge tient-il encore, mon petit ? D'abord les vivres pour les blessés, puis les égarés ramenés à l'abri plus bas — et alors seulement tu pourras faire front contre la vague d'Inferi.",
        questReady:  "Tu les as tous protégés. On comptera les vies que tu as sauvées, pas les monstres. Le Cœur du Refuge t'attend — repasse le réclamer."
      },
      quest_set_pouf: {
        questOffer:  "Trois Trolls des Cavernes terrorisent les passages — patience et loyauté, racine après racine. Le Médaillon de Helga récompensera ton serment.",
        questActive: "Trois trolls, et pas un de moins. Garde la tête haute.",
        questReady:  "Trois trolls vaincus — le serment est tenu. Le Médaillon de Helga vous attend, repassez le réclamer."
      },
      quest_don_pouf: {
        questOffer:  "Poufsouffle prend soin de chacun des siens, et cela ne pousse pas tout seul, vois-tu. Un don de 3000 Gallions nourrirait bien des racines. Acceptes-tu de partager ?",
        questActive: "Les 3000 Gallions pour la Maison — les as-tu rassemblés, mon petit ?",
        questReady:  "Trois mille Gallions partagés de bon cœur. Voilà la vraie loyauté — Poufsouffle ne l'oubliera pas."
      },
      quest_garden_sprout: {
        questOffer:  "Sais-tu qu'on a muré des jardins entiers dans ces murs ? Des herbes rares y dorment encore. Déniche-m'en un — un Revelio ou une fouille minutieuse devrait le réveiller — et je t'apprendrai une recette de mon cru.",
        questActive: "Cherche bien, mon petit. Les vieux jardins se cachent là où la pierre ment. Un sortilège de révélation, ou des doigts patients dans la poussière…",
        questReady:  "Tu l'as trouvé ! Je le savais. Tiens, voici la recette de l'Élixir de Régénération — un jardin mérite qu'on sache en tirer parti."
      },
      quest_garden_sprout_2: {
        questOffer:  "Mes réserves s'épuisent vite, vois-tu. Rapporte-moi quelques herbes fraîches du jardin et je saurai m'en montrer reconnaissante — encore et encore, si le cœur t'en dit.",
        questActive: "Quatre brins frais, c'est tout ce qu'il me faut. La besace se remplit à la cueillette, ne l'oublie pas.",
        questReady:  "Des herbes magnifiques — fraîches, gorgées de sève. Voilà qui garnira bien mes étagères. Reviens quand tu en auras d'autres."
      }
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
    sprite: "vendeur",
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
    questsGiven:    ["bottines_ollivander", "bois_ollivander_boucle"],
    questsTurnedIn: ["bottines_ollivander", "bois_ollivander_boucle"],
    // Quête de fouille répétable en Boucle (étage 13) — récompense une baguette
    // épique taillée dans un if des Profondeurs. Gate minFloor:11.
    dialoguesByQuest: {
      bois_ollivander_boucle: {
        questOffer:  "Curieux… très curieux. La Boucle a fait pousser un if dans ses profondeurs — un bois qui chuchote, comme je n'en avais plus senti depuis un siècle. Fouille les recoins, rapporte-m'en une branche, et je t'en taillerai une baguette digne de ce nom.",
        questActive: "Le bois t'appelle, jeune sorcier. Fouille encore — un if des Profondeurs ne se laisse pas trouver sans patience.",
        questReady:  "Ahh… ce bois. Sens comme il vibre. Tiens — ta baguette d'if des Profondeurs. Elle se souviendra de chaque sort, et de chaque récurrence."
      }
    },
    dialogues: {
      greeting: [
        "Curieux... très curieux. Approche, jeune sorcier, et laisse-moi te regarder.",
        "Souviens-toi : ce n'est pas le sorcier qui choisit la baguette, c'est la baguette qui choisit le sorcier. Garde précieusement la tienne — elle se souvient de chaque sort.",
        "Si une de tes baguettes ne te convient plus, je te la rachèterai à bon prix. Et si tu cherches plus puissant que ton bois actuel, j'ai peut-être ce qu'il te faut."
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Je me souviens de chaque baguette vendue en cent ans. En revanche, où ai-je posé mes lunettes…",
        "Le bois se souvient, le crin de licorne pardonne, mais le cœur de phénix... il choisit.",
        "Une baguette épouse son sorcier. Elle apprend ses gestes, ses humeurs… et parfois, ses regrets.",
        "Curieux… ta baguette a une sœur, quelque part. Les baguettes sœurs se reconnaissent. Et se craignent.",
        "Certaines baguettes que j'ai façonnées ont accompli de grandes choses. D'autres, des choses terribles. Je me souviens des deux — surtout des secondes.",
        "Il existe une baguette qui passe de main en main par le meurtre. Prie pour ne jamais sentir son bois t'appeler.",
        "Je vends des baguettes, pas des destins. Mais parfois, en tendant la boîte, je sais déjà comment l'histoire finira. Et je la tends quand même."
      ]
    }
  },
  {
    id:    "guipure",
    name:  "Madame Guipure",
    title: "Couturière de Pré-au-Lard",
    sprite: "vendeur",
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
    questsGiven:    ["fil_acromantule", "confection_guipure"],
    questsTurnedIn: ["fil_acromantule", "confection_guipure"],
    // Quête répétable en Boucle (étage 15) — confection d'une cape de soie.
    dialoguesByQuest: {
      confection_guipure: {
        questOffer:  "Une couturière digne de ce nom ne travaille que la soie d'Acromantule la plus fine. Rapporte-m'en — abats 3 Jeunes Acromantules — et je t'en taille une cape comme la Boucle n'en a jamais vu.",
        questActive: "La soie, ma chère ! Trois Acromantules. Mes aiguilles s'impatientent.",
        questReady:  "Quelle soie magnifique… Voilà, ta cape est prête. Drapée à la perfection, si je puis me permettre. Reviens quand tu en voudras une autre."
      }
    },
    dialogues: {
      greeting: [
        "Oh, un nouveau client ! Tiens-toi droit, que je prenne tes mesures du regard.",
        "Une bonne robe de sorcier, c'est plus qu'un vêtement : c'est une seconde peau qui résiste aux sortilèges. La tienne en a vu, dis-moi.",
        "Et si tu as une vieille pièce qui ne te sert plus, dépose-la sur le comptoir : je la reprends à prix d'amie."
      ],
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Tiens-toi droit ! Une robe mal portée, c'est une insulte à l'aiguille qui l'a cousue.",
        "Une couture en zigzag tient mieux contre les sortilèges qu'un point droit. Note-le.",
        "Une bonne robe de sorcier, c'est une seconde peau. La tienne en a vu, dis-moi.",
        "Je reconnais le tissu d'un sorcier rien qu'à son usure. Les ourlets racontent plus que les bavards.",
        "J'ai recousu des capes trouées par des sortilèges. Certaines, je n'ai pas pu. Leur propriétaire non plus n'est pas revenu.",
        "On m'apporte parfois des robes à retoucher pour un enterrement. Ce sont les coutures les plus silencieuses que je fasse.",
        "Le fil se souvient de chaque tension. Comme les gens. Tire trop fort, trop longtemps, et un jour quelque chose cède."
      ]
    }
  },
  {
    id:    "portrait_dumbledore",
    name:  "Portrait d'Albus Dumbledore",
    title: "Toile animée",
    sprite: "fantome",
    icon:  "🖼️",
    portraitImg: "img/npc/portrait_dumbledore.png",
    placement: { floor: 6, anchor: "any" },
    questsGiven:    ["anneau_dumbledore", "dumbledore_lumiere"],
    questsTurnedIn: ["anneau_dumbledore", "dumbledore_lumiere"],
    // Énigmes de l'Épreuve de la Lumière Éternelle : disponible quand la
    // collecte des Éclats est faite. Ouvre #riddle-modal.
    specialAction: { type: "open_riddle", id: "dumbledore_epreuve",
                     label: "<img class='ui-icon ui-icon-md' src='img/icons/scroll.png' alt=''> Affronter les énigmes" },
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
    },
    dialoguesAstral: [
      "(Le portrait ouvre un œil, intrigué.) Un voyageur d'un autre plan... voilà qui ne s'était plus produit depuis l'an mille. Approche, étranger.",
      "Mes énigmes appartiennent à celui qui foule ce château. Tu portes peut-être un autre Dumbledore en toi, peint sur d'autres murs — c'est à lui qu'il te faudra rendre des comptes, pas à moi.",
      "Va, et dis à ton directeur, si tu le revois, que celui-ci le salue."
    ],
    dialoguesByQuest: {
      // Épreuve de la Lumière Éternelle (cf. dumbledore-lux-aeterna.md).
      dumbledore_lumiere: {
        questOffer: [
          "(Le portrait repose ses lunettes en demi-lune.) Tu as rendu son repos à l'anneau. Bien. Alors je puis te parler d'un autre objet — un grimoire, celui-là. *Lux Aeterna* : la lumière faite sortilège.",
          "Je ne te le donnerai pas. La lumière n'est pas un don, jeune sorcier — c'est une discipline. On ne la tient pas : on la mérite, puis on la porte. Il te faudra passer une épreuve, en trois temps.",
          "D'abord, rassemble trois Éclats de Lumière. On les arrache aux morts-vivants — car la lumière se niche dans ce que l'ombre a englouti. Reviens quand tu les auras : je te soumettrai alors mes énigmes."
        ],
        questActive: "As-tu réuni les trois Éclats de Lumière ? Les morts-vivants en recèlent — Inferi, Détraqueurs, spectres maudits. La clarté dort en eux comme un remords. Reviens quand ta besace en contient trois.",
        questReady: [
          "Tu as défait le Bibliothécaire d'Ombre. (Le portrait incline la tête.) Il fut un homme avant d'être cette chose — un homme qui voulut tout savoir et ne sut rien partager. Le grimoire ne l'a jamais reconnu pour maître.",
          "Toi, tu as réuni la lumière, affronté les énigmes, et porté l'épreuve jusqu'à son terme. *Lux Aeterna* est à toi. Souviens-toi seulement de ceci : une lumière qu'on garde pour soi finit toujours par s'éteindre. Fais-en profiter ceux qui marchent derrière toi."
        ]
      }
    }
  },
  {
    id:    "fumseck",
    name:  "Fumseck",
    title: "Phénix de Dumbledore",
    sprite: "phenix",
    icon:  "🔥",
    portraitImg: "img/npc/fumseck.png",
    placement: { floor: 7, anchor: "any" },
    specialAction: {
      type:  "heal_and_revive",
      label: "<img class='ui-icon ui-icon-md' src='img/icons/items/larmes_phenix.png' alt=''> Recevoir les larmes du phénix"
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
    sprite:    "vendeur",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Les bonnes affaires sont rarement deux fois au même endroit, jeune sorcier.",
        "Une Bièreaubeurre bien moussue, et hop, le donjon paraît deux fois moins sombre. Presque de la magie.",
        "On me dit toujours tout, à la buvette. Les murs ont des oreilles — moi, j'ai un comptoir.",
        "Tu as la tête de quelqu'un qui n'a pas dormi depuis trois étages. Tiens, celle-là, c'est ma tournée.",
        "J'ai servi des héros et des crapules au même tonneau. Crois-moi, de loin, on les distingue mal.",
        "Des habitués descendaient boire un verre ici… et ne sont jamais remontés le commander. J'ai arrêté de compter.",
        "Pendant la guerre, ma buvette servait de refuge. Et de piège, aussi. On ne choisit pas toujours.",
        "Un soir, je me suis surprise à faire des choses sans savoir pourquoi — quelqu'un tirait les ficelles dans ma tête. Méfie-toi de ceux qui te fixent trop longtemps dans les yeux."
      ]
    }
  },
  {
    id:        "mundungus",
    name:      "Mondingus Fletcher",
    title:     "Marchand au flair douteux",
    sprite:    "vendeur",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "T'inquiète, c'est honnête. Enfin presque.",
        "Ce chaudron ? Tombé d'une charrette. La charrette aussi, d'ailleurs. Tout est tombé. C'est ballot.",
        "Si on te demande, tu ne m'as jamais vu. Si on te demande qui, tu ne sais pas non plus.",
        "J'ai un principe : ne jamais voler un type plus pauvre que moi. Le souci, c'est qu'il n'y en a pas beaucoup.",
        "Les gobelins me cherchent. Les Aurors aussi. C'est flatteur, au fond, d'être autant demandé.",
        "Ce médaillon-là ? Disons qu'il vient d'une maison où plus personne ne le réclamera. Les morts ne portent pas plainte.",
        "Un jour, j'ai paniqué et j'ai filé en laissant quelqu'un de bien derrière moi. Il n'a pas survécu. Je ne dors plus très bien depuis.",
        "Tu sais ce qui fait peur, dans ces couloirs ? Pas les monstres. C'est de comprendre qu'on en est devenu un, à force."
      ]
    }
  },

  // ── PNJ "lore" (random:true, sans wares ni quêtes) ────────────
  // Saveur narrative seule. `dialogues.idleRandom` (array de strings)
  // est piocheé au hasard à chaque visite après la 1re rencontre.
  {
    id:        "sir_nicolas",
    name:      "Sir Nicolas de Mimsy",
    title:     "Fantôme de Gryffondor (presque sans-tête)",
    sprite:    "fantome",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Le Chasseur Sans Tête m'a encore refusé l'entrée de son club. Une tête qui pend par un lambeau de peau ne compte pas comme « décapitée », paraît-il. Quelle injustice !",
        // Ligne d'espoir (couche egg) : amorce la découverte de Sir Patrick.
        "On dit que Sir Patrick lui-même hante les galeries profondes, par ici-bas. Si seulement quelqu'un d'assez brave plaidait ma cause auprès de lui… mais qui se soucie d'un vieux fantôme à moitié décapité ?",
        "Mon dernier anniversaire de mort fut somptueux : pâté pourri, gâteau couvert d'asticots, orchestre de scies musicales… Vous auriez adoré. Enfin, peut-être pas.",
        "J'ai connu Godric Gryffondor en personne. Charmant, mais bien trop grand pour les portes.",
        "On dit qu'au troisième étage, un miroir reflète plus que votre image…",
        // Conte des Trois Frères (couche egg « Reliques de la Mort ») : amorce
        // diffuse, aucune indication d'objet. Cf. deathly-hallows-easter-egg.md §2.
        "Laissez-moi vous conter Les Trois Frères. Trois sorciers trompèrent la Mort sur un pont ; furieuse, elle feignit l'admiration et offrit à chacun un présent. À l'aîné, une baguette invincible ; au cadet, une pierre qui rappelle les morts ; au plus humble, une cape pour se dérober à Elle. Réunis, ces trois Présents font, dit-on, le Maître de la Mort. Fable d'enfant… ou pas.",
        "La Salle Sur Demande change selon le besoin. Certains la trouvent. D'autres y restent.",
        // Indice (couche egg) : amorce le GESTE de découverte (3 passages),
        // sans jamais donner de position. Cf. room-of-requirement-easter-egg.md §4.
        "Pour qu'elle se révèle, dit-on, il faut longer trois fois le bon pan de mur, en pensant très fort à ce dont on a besoin. La pierre alors s'efface, et une porte paraît.",
        "Quatre siècles que j'arpente ces couloirs. Les visages changent, les peurs jamais.",
        "Le Baron Sanglant n'apparaît qu'aux nuits d'orage. Évitez les cachots ce soir.",
        "Quarante-cinq coups de hache émoussée. Voilà ce qu'il a fallu pour me séparer de ce monde. Le bourreau n'était pas… doué.",
        "Devenir fantôme fut mon choix : j'ai eu peur de ce qui venait après. Aujourd'hui encore, je ne sais pas si j'ai bien fait."
      ]
    }
  },
  {
    id:        "moine_gras",
    name:      "Le Moine Gras",
    title:     "Fantôme de Poufsouffle",
    sprite:    "fantome",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Une bonne assiette et un cœur tranquille — voilà mes secrets de longévité. Ironique, pour un fantôme.",
        // Rumeur² (room-of-requirement-v2.md §5) : évoque la Salle sans
        // position ni geste (Sir Nicolas garde l'indice des 3 passages).
        "On raconte qu'un mur, quelque part, sait se faire âtre et fauteuil pour qui en a vraiment besoin. Moi, je n'ai plus besoin de me reposer… mais toi, mon enfant, garde l'esprit ouvert à ce dont tu manques.",
        "Je bénis encore chaque repas des cuisines, par habitude. Les elfes font mine de ne pas voir le fantôme qui salive au-dessus du ragoût.",
        "Helga Poufsouffle disait : « Tous égaux devant la marmite. » Ça m'a toujours plu.",
        "La patience n'est pas une vertu lente, mon enfant. C'est une force qui ne se fatigue jamais.",
        "Tu sais, mourir n'est pas si terrible. C'est de mal vivre qui devrait t'inquiéter.",
        "Méfie-toi des Inferius. Ils n'ont ni faim ni pitié.",
        "J'ai vu passer tant d'élèves rieurs… Je les ai vus revenir vieillis, courbés, puis ne plus revenir du tout. C'est cela, l'éternité.",
        "Le froid du donjon ne me dérange plus. C'est le froid de ne plus rien sentir qui pèse, certaines nuits.",
        "Un de ces Inferius, là-bas… je l'ai connu vivant. Il riait fort. Ne le laisse pas t'approcher : ce n'est plus lui."
      ]
    }
  },
  {
    id:        "rusard",
    name:      "Argus Rusard",
    title:     "Concierge de Poudlard",
    sprite:    "prof_h",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Touche pas aux portraits. Touche pas aux vitrines. TOUCHE A RIEN.",
        "J'astique ces chaînes tous les matins. Pour rien, qu'ils disent. On verra bien.",
        "Miss Teigne te fixe. Elle sait. Elle sait toujours.",
        "De mon temps, on suspendait les fauteurs de troubles par les pouces.",
        "J'ai un tiroir entier de fiches de retenue. La tienne y est déjà — j'ai juste laissé la date en blanc.",
        "J'ai vu trois élèves disparaître dans ce couloir hier. Bon débarras.",
        "Tout ce château déborde de magie. Et moi, rien. Pas une étincelle. Tu n'imagines pas ce que ça fait, de balayer le miracle des autres.",
        "Il y a une cellule, tout en bas. On y enfermait les punis, autrefois. Parfois j'y descends. Juste pour me rappeler le bon vieux temps.",
        "Le jour où je coince l'un de vous en faute… je ne le lâcherai plus. Plus jamais. Miss Teigne et moi, on a tout notre temps."
      ]
    }
  },
  // ── PNJ donneurs de quêtes répétables (random:true) ───────────
  // Doublons "ambulants" des PNJ fixes (Scamander, Hagrid) qui apparaissent
  // sur des étages élargis pour proposer leurs quêtes de farming.
  // Cf. .claude/plans/farming-quests.md §4.
  {
    id:        "scamander_random",
    name:      "Newton Scamander",
    title:     "Magizoologiste en tournée",
    sprite:    "mage",
    icon:      "🐾",
    portraitImg: "img/npc/scamander.png",
    random:    true,
    minFloor:  3,
    maxFloor:  8,
    questsGiven:    ["chasse_magizoologiste"],
    questsTurnedIn: ["chasse_magizoologiste"],
    dialogues: {
      greeting: [
        "Oh ! Un visiteur ! Tombe à pic — j'observe les créatures de cet étage et certaines me préoccupent un peu.",
        "Tu n'aurais pas un instant ? Je t'expliquerais ce qu'il faut faire."
      ],
      idle:        "Mes carnets se remplissent à mesure que j'arpente le château…",
      // Placeholders {target} et {amount} interpolés par _interpolateFarmingText
      // depuis la preview (offer) ou _dynamicTarget de la quête active.
      questOffer:  "J'ai repéré des {target} qui posent problème par ici. Veux-tu en éliminer {amount} pour moi ?",
      questActive: "As-tu éliminé les {target} ?",
      questReady:  "Excellent ! Voilà ta récompense.",
      questDone:   "Reviens me voir : il y a toujours une espèce à recenser."
    }
  },
  {
    id:        "hagrid_random",
    name:      "Hagrid",
    title:     "Garde-chasse en maraude",
    sprite:    "prof_h",
    icon:      "🦉",
    portraitImg: "img/npc/hagrid.png",
    random:    true,
    minFloor:  4,
    maxFloor:  9,
    questsGiven:    ["course_hagrid"],
    questsTurnedIn: ["course_hagrid"],
    dialogues: {
      greeting: [
        "Ah, te v'là ! J'tombe bien — j'ai un p'tit service à t'demander pour mes bestioles.",
        "Si tu peux m'rendre c'service, j'ai d'quoi t'remercier."
      ],
      idle:        "Y'a toujours quelque chose à r'cueillir pour nourrir mes bestioles…",
      questOffer:  "J'ai encore besoin de {target}. Peux-tu m'en ramener {amount} ?",
      questActive: "T'as trouvé les {target} que j't'ai d'mandés ?",
      questReady:  "Parfait mon gars ! Voilà pour toi.",
      questDone:   "Merci encore pour tout c'que t'as fait. Reviens quand tu veux."
    }
  },
  {
    id:        "trelawney",
    name:      "Sibylle Trelawney",
    title:     "Professeure de Divination",
    sprite:    "prof_f",
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
      // Anecdotes graduées du rigolo au sombre (piochées au hasard).
      idleRandom: [
        "Je vois… je vois… une tasse de thé. Et un péril mortel. Probablement les deux.",
        "Tes lignes de la main indiquent un long voyage. Ou un déjeuner. C'est confus.",
        "Méfie-toi du chiffre 7 cette semaine. Ou du 3. Ou des deux.",
        "Le marc de café m'a révélé que ton destin est… intéressant. C'est tout ce que je peux dire.",
        "Ton aura est trouble aujourd'hui. Mauve, peut-être. À moins que ce ne soit ma lampe.",
        "J'ai rêvé d'une porte close, et de coups frappés de l'autre côté. Trois coups. Toujours trois.",
        "Le Sinistros rôde dans ton sillage, mon enfant. Je l'ai vu dans les feuilles. Je le vois… souvent. Trop souvent.",
        "(Sa voix se brise soudain, grave et lointaine.) Celui qui t'attend dans les profondeurs ne respire plus… et pourtant, il compte tes pas. (Elle cligne des yeux.) Pardon — vous disiez ?",
        "(Elle te saisit le poignet, le regard fixe.) L'un de vous ne remontera pas tous ces escaliers. Les présages ne mentent jamais — seuls mentent ceux qui les lisent. (Elle te relâche, confuse.) Du thé ?"
      ]
    }
  },

  // ── Phase 3 — Tranche étage 8 « Le Seuil » ────────────────────
  // (cf. .claude/plans/content-audit-stabilization.md §5.1)
  {
    id:    "kingsley",
    name:  "Kingsley Shacklebolt",
    title: "Auror, avant-garde de l'Ordre",
    sprite: "mage",
    icon:  "🪄",
    portraitImg: "img/npc/kingsley.png",
    placement: { floor: 8, anchor: "any" },
    questsGiven:    ["chasse_greyback", "garde_seuil", "herbes_lupin", "chasse_kingsley_boucle"],
    questsTurnedIn: ["chasse_greyback", "garde_seuil", "herbes_lupin", "chasse_kingsley_boucle"],
    // Prime de chasse répétable en Boucle (étage 18) — cible aléatoire.
    dialoguesByQuest: {
      chasse_kingsley_boucle: {
        questOffer:  "La Boucle reforme ses bêtes sans fin, sorcier. J'ai repéré {amount}× {target} sur cet étage — disperse-les, l'Ordre tient toujours malgré tout.",
        questActive: "La battue continue ? Ces {target} ne se compteront pas tout seuls.",
        questReady:  "Bien. Même dans un château qui se répète, chaque purge compte. Voilà ta part."
      }
    },
    // Suffixe Ténébreux en Boucle (§6.12.E) — lu sur currentFloor >= 18.
    darkLoopLines: [
      "Tu m'as déjà vu, n'est-ce pas ? Plus bas, dans un autre temps. Je tiens encore ce seuil — mais le château se rejoue, et je ne sais plus quelle fois est la vraie.",
      "L'Ordre est tombé là-haut, et pourtant me revoici, posté au même seuil. La Boucle ne libère personne. Elle nous garde à notre poste, indéfiniment."
    ],
    // ── Ligne « après » post-victoire (ch.14 §14.3.2) ──────────────
    // Ton moins martial, plus grave une fois victoryAchieved : l'Auror dont
    // la guerre est gagnée s'interroge sur le sens de la redescente. Lue par
    // _postVictorySuffixPages aux étages de surface (< 18) ; en Boucle profonde
    // (>= 18), darkLoopLines prend le relais (les deux restent exclusifs).
    postVictoryLines: [
      "Tu es redescendu. Pourquoi ? L'Ombre est tombée, là-haut — j'ai senti le château changer jusqu'ici. Et pourtant te revoilà, à descendre vers le froid. Je ne donne plus d'ordres, sorcier. Comme toi, je m'interroge.",
      "Voldemort n'est plus, et mon poste n'a plus d'ennemi à guetter. Je tiens ce seuil quand même. Dis-moi, toi qui as gagné : qu'est-ce qu'on garde, une fois la guerre finie ?"
    ],
    // ── Suffixe réputation (ch.06 §6.9.2) — l'Auror « trahi par le Pacte » ──
    // Réaction de signe OPPOSÉ à l'écho de Salazar : défier le Serpent gagne sa
    // confiance (warm), sceller le Pacte éveille sa méfiance (hostile).
    reputationLines: {
      warm:    "Un mot m'est parvenu des cachots : tu as tenu tête à la vieille voix du Serpent, et tu n'as rien signé. L'Ordre se souvient de ceux qui refusent les raccourcis. Tu as ma confiance, sorcier.",
      hostile: "On murmure que tu as scellé un pacte avec ce qui dort sous les cachots. Je ne juge pas vite — mais je garde un œil sur qui serre la main des vieux serpents. Prends garde à ce que tu as accepté.",
    },
    dialogues: {
      greeting: [
        "Reste discret. Ce seuil est observé. Je suis Kingsley Shacklebolt — l'Ordre m'a posté ici en avant-garde.",
        "Les Profondeurs grouillent de bêtes que le Ministère préfère ignorer. Si tu acceptes de m'aider, je récompenserai chaque service rendu."
      ],
      idleRandom: [
        "Ne sous-estime jamais un Auror. Surtout corrompu — ils savent tout ce que nous savons.",
        "Greyback rôde quelque part en bas. Ce monstre a contaminé Lupin enfant. Personne ne mérite davantage de tomber.",
        "Le Veilleur n'est pas hostile par nature. Mais qui ouvre le passage signe sa perte.",
        "Garde l'Aconit sur toi. Contre les morsures lycanthropes, c'est plus utile qu'un Patronus.",
        "Trois services. Greyback abattu, le Veilleur neutralisé, l'Aconit récolté pour Lupin. Choisis dans l'ordre qui te convient."
      ],
      questOffer:  "J'ai trois besoins. Greyback à abattre, le Veilleur du Seuil à neutraliser, et de l'Aconit pour Lupin. Choisis.",
      questActive: "Le travail avance ?",
      questReady:  "Bien joué. L'Ordre te doit cela.",
      contextualReaction: [
        { killedId: "fenrir_greyback",
          text: "Greyback est tombé ? L'Ordre attendait cette nouvelle depuis des années. Cette nuit, Lupin dormira un peu mieux — et moi aussi." },
        { killedId: "auror_corrompu",
          text: "Tu as terrassé un Auror corrompu. Le pire ennemi d'un Auror, c'est son propre reflet déchu. Tu m'as épargné d'avoir à le faire." }
      ]
    }
  },

  {
    id:    "marchand_clandestin",
    name:  "Marchand Clandestin",
    title: "Receleur d'équipement Auror",
    sprite: "vendeur",
    icon:  "🎒",
    portraitImg: "img/npc/marchand_clandestin.png",
    placement: { floor: 8, anchor: "any" },
    wares: [
      { id: "casque_auror" },
      { id: "bottes_renforcees" },
      { id: "cape_combat" },
      { id: "anneau_anti_magie" },
      { id: "potion_lune" }
    ],
    buyback: { default: 0.40 },
    // Quête de fouille répétable en Boucle (étage 18) — gate minFloor:11, donc
    // invisible au premier passage (étage 8), proposée seulement en récurrence.
    questsGiven:    ["recup_marchand_boucle"],
    questsTurnedIn: ["recup_marchand_boucle"],
    dialoguesByQuest: {
      recup_marchand_boucle: {
        questOffer:  "Pssst. Tu veux te faire un peu d'or ? Fouille les recoins de cet étage — relève 5 cachettes et rapporte-moi ce que la Boucle y a oublié. Je rachète tout, sans questions.",
        questActive: "Alors, ces fouilles ? Cinq recoins, je t'ai dit. Le château cache plus qu'on ne croit.",
        questReady:  "Beau butin. La Boucle est généreuse pour qui sait gratter. Voilà ta part — et pas un mot."
      }
    },
    // Suffixe Ténébreux en Boucle (§6.12.E) — lu sur currentFloor >= 18.
    darkLoopLines: [
      "Ici-bas, dans la Boucle, mes marchandises ne viennent plus de cadavres frais. Elles viennent de moi — celui que j'étais, les fois d'avant. C'est devenu... circulaire.",
      "Tu reviens, je reviens, le stock revient. Achète quand même : dans un château qui se répète, un casque qui tient reste un casque qui tient."
    ],
    dialogues: {
      greeting: [
        "Pssst. Ferme derrière toi. Je n'ai rien à vendre que des choses... récupérées. Sur le terrain.",
        "Du matériel d'Auror, presque neuf. Les anciens propriétaires n'en ont plus besoin, eux. Tu vois ce que je veux dire."
      ],
      idleRandom: [
        "Si on te demande, tu m'as jamais vu.",
        "Le casque, j'l'ai retrouvé dans un tas de feuilles. Le sang est parti au lavage.",
        "Cette cape arrête à peu près tout. Sauf le regard d'un Détraqueur — mais ça, rien ne l'arrête.",
        "L'Élixir de Lune, c'est ma fierté. Distillé moi-même. Goûte avant de juger."
      ]
    }
  },

  // ── Phase 3 — Tranche étage 9 « Les Profondeurs » ─────────────
  // (cf. .claude/plans/content-audit-stabilization.md §5.2)
  {
    id:    "bill_weasley",
    name:  "Bill Weasley",
    title: "Briseur de sortilèges, Gringotts",
    sprite: "prof_h",
    icon:  "🗝️",
    portraitImg: "img/npc/bill_weasley.png",
    placement: { floor: 9, anchor: "any" },
    questsGiven:    ["chasse_aragog", "baiser_detraqueur", "dictame_bill", "chasse_bill_boucle"],
    questsTurnedIn: ["chasse_aragog", "baiser_detraqueur", "dictame_bill", "chasse_bill_boucle"],
    // Prime de nettoyage répétable en Boucle (étage 19) — cible aléatoire.
    dialoguesByQuest: {
      chasse_bill_boucle: {
        questOffer:  "Briseur de sortilèges, et me voilà à briser des meutes. {amount}× {target} grouillent dans les galeries d'à côté — réduis-les avant qu'elles n'enflent.",
        questActive: "Ça avance, la galerie ? Ces {target} reviennent vite, dans la Boucle.",
        questReady:  "Propre. Mes cicatrices brûlent un peu moins quand le travail est fait. Tiens, c'est pour toi."
      }
    },
    // Suffixe Ténébreux en Boucle (§6.12.E) — lu sur currentFloor >= 18.
    darkLoopLines: [
      "Mes cicatrices brûlent plus fort ici. La Boucle n'apaise pas la morsure de Greyback — elle la rejoue, encore et encore, à chaque tour de spirale.",
      "Briseur de sortilèges, et incapable de briser celui-ci. Le château se referme sur lui-même. Si tu trouves la sortie, briseur, dis-moi : je commence à oublier qu'il y en avait une."
    ],
    // ── Ligne « après » post-victoire (ch.14 §14.3.2) — voir Kingsley. ──
    postVictoryLines: [
      "Tu es redescendu. Pourquoi ? On a gagné — Greyback aurait dû s'éteindre avec le reste. Mes cicatrices, elles, n'ont pas eu le message. Elles brûlent toujours, dès qu'on s'enfonce.",
      "La victoire n'a rien brisé du sortilège de ces lieux, briseur. Je le sais maintenant : certaines failles ne se referment pas par le haut. Tu cherches la même chose que moi, je crois."
    ],
    dialogues: {
      greeting: [
        "Salut. Bill Weasley, briseur de sortilèges pour Gringotts — enfin, c'était mon métier d'avant. Maintenant je traque autre chose.",
        "Mes cicatrices te rappellent quelqu'un ? Greyback. Il m'a mordu sous forme humaine — pas de pleine lune, pas de transformation complète, juste les goûts. Trois services, si tu acceptes."
      ],
      idleRandom: [
        "Le Dictame fait toujours son effet, même sur les blessures lycanthropes. Pas la guérison — l'apaisement.",
        "Aragog était l'ami de Hagrid. Ses fils, eux, n'ont jamais reconnu aucun ami.",
        "Le Maître des Détraqueurs ne se nourrit pas — il savoure. Combats-le avant qu'il ne te savoure.",
        "Maman dit que je suis devenu un peu loup-garou depuis Greyback. Disons que les steaks saignants me parlent davantage.",
        "Fleur m'a épousé après les cicatrices. Elle dit qu'elles me donnent un genre. Je veux bien la croire."
      ],
      questOffer:  "Aragog dans la Forêt. Le Maître des Détraqueurs dans les cellules. Et du Dictame pour les blessures que Greyback a laissées. Choisis l'ordre.",
      questActive: "Le travail avance ?",
      questReady:  "Bien joué. Voilà ce qui était convenu.",
      contextualReaction: [
        { killedId: "aragog",
          text: "Aragog, vaincu... Hagrid pleurera son vieil ami, je le sais. Mais ses fils, eux, ne chasseront plus en meute dans ces galeries. Tu as fait le nécessaire." },
        { killedId: "maitre_detraqueur",
          text: "Le Maître des Détraqueurs ne savourera plus personne. Tu lui as rendu le froid qu'il distribuait — bien joué." }
      ]
    }
  },

  {
    id:    "apothicaire_tenebreux",
    name:  "Apothicaire Ténébreux",
    title: "Marchand d'élixirs et matériaux interdits",
    sprite: "vendeur",
    icon:  "⚗️",
    portraitImg: "img/npc/apothicaire_tenebreux.png",
    placement: { floor: 9, anchor: "any" },
    // Vente directe d'Essence (Forge) et Page (Biblio) — atténue T5 du sprint
    // endgame (matériaux uniquement via drop 3 %/2 % auparavant). Prix élevés
    // pour que ce reste un secours, pas une alternative confortable au farm.
    wares: [
      { id: "potion_l",         price: 90 },
      { id: "potion_l_sp",      price: 85 },
      { id: "herbe_aconit",     price: 30 },
      { id: "herbe_dictame",    price: 35 },
      { id: "herbe_asphodele_noire", price: 40 },
      { id: "elixir_lucidite",  price: 240 },
      { id: "essence_tenebres", price: 380 },
      { id: "page_grimoire",    price: 460 },
      { id: "essence_primordiale", price: 1200 }
    ],
    buyback: { default: 0.30 },
    // Quête de collecte d'herbes répétable en Boucle (étage 19).
    questsGiven:    ["collecte_apothicaire_boucle"],
    questsTurnedIn: ["collecte_apothicaire_boucle"],
    dialoguesByQuest: {
      collecte_apothicaire_boucle: {
        questOffer:  "Mes bocaux se vident plus vite que la Boucle ne tourne. Rapporte-moi 6 herbes — n'importe lesquelles de ta besace — et je te paierai en élixirs et en or.",
        questActive: "Six herbes, te dis-je. Mes distillations n'attendent pas.",
        questReady:  "Parfait, de la matière fraîche. Tiens, comme convenu — et reviens quand mes bocaux crieront famine."
      }
    },
    // Suffixe Ténébreux en Boucle (§6.12.E) — lu sur currentFloor >= 18.
    darkLoopLines: [
      "Dans la Boucle, l'Essence des Ténèbres se cueille à même les murs — le château entier est devenu l'organe. Mes prix montent ; ma marchandise aussi est plus... mûre.",
      "Tu reviens toujours, et c'est tant mieux pour mes affaires. Un client qui ne peut pas mourir vraiment, voilà un client fidèle."
    ],
    dialogues: {
      greeting: [
        "Bienvenue. Ne touche à rien sans demander — certaines choses ici mordent en retour.",
        "Élixirs, herbes, et matériaux que tu ne trouveras nulle part ailleurs. Prix négociables uniquement pour les morts."
      ],
      idleRandom: [
        "L'Essence des Ténèbres, ça se cueille comme une fleur. Sauf que la fleur, elle pousse dans les organes.",
        "Une Page de Grimoire, c'est un sort qui attend son livre. Bonne occasion pour ta Bibliothèque interdite.",
        "Le Dictame guérit même les morsures lycanthropes. Demande à Bill — il connaît mes prix.",
        "Mes potions ne sont pas autorisées. C'est précisément pourquoi elles fonctionnent."
      ]
    }
  },

  // ── Phase 3 — Tranche étage 10 « Le Précipice » ───────────────
  // (cf. .claude/plans/content-audit-stabilization.md §5.3)
  // Antichambre de Voldemort Ressuscité — esprits-guides et armurier.
  {
    id:    "sirius_esprit",
    name:  "Esprit de Sirius Black",
    title: "Filleul oublié, guide des Profondeurs",
    sprite: "fantome",
    icon:  "🐕",
    portraitImg: "img/npc/sirius_esprit.png",
    placement: { floor: 10, anchor: "any" },
    questsGiven:    ["chasse_dolohov", "chasse_heraut", "purification_sirius", "chasse_sirius_boucle"],
    questsTurnedIn: ["chasse_dolohov", "chasse_heraut", "purification_sirius", "chasse_sirius_boucle"],
    // Prime d'apaisement répétable en Boucle (étage 20) — cible aléatoire.
    dialoguesByQuest: {
      chasse_sirius_boucle: {
        questOffer:  "Le Voile attire les errants, filleul. {amount}× {target} s'attardent près du précipice — renvoie-les au silence, comme j'aimerais l'être.",
        questActive: "Tu apaises le précipice ? Ces {target} ne connaissent pas le repos sans ton aide.",
        questReady:  "Le Voile s'apaise un peu plus. Merci, filleul. Voilà ce qui te revient."
      }
    },
    // Suffixe Ténébreux en Boucle (§6.12.E) — lu sur currentFloor >= 18.
    darkLoopLines: [
      "Le Voile m'a pris une fois. La Boucle me reprend à chaque tour. Mort, je devrais être libre — et pourtant me revoici, à te guider sur le même précipice.",
      "On ne traverse pas le Voile deux fois, dit-on. Personne n'avait prévu le Voile qui se répète. Si tu brises ce cycle, filleul, brise-le pour moi aussi."
    ],
    // ── Ligne « après » post-victoire (ch.14 §14.3.2) — voir Kingsley. ──
    postVictoryLines: [
      "Tu es redescendu. Pourquoi ? Voldemort est tombé — j'ai cru que le Voile me rendrait enfin au silence. Et me revoici, à te guider sur le même précipice, après la fin de tout.",
      "On a vaincu, filleul. Et pourtant tu descends encore, et moi je hante encore. La mort de l'Ombre n'a apaisé aucun fantôme, ici. Ce que tu cherches plus bas, c'est peut-être ce qui nous libérerait, toi et moi."
    ],
    dialogues: {
      greeting: [
        "Tu m'entends ? Bien. Voici une voix de l'au-delà — celle de Sirius Black, mort derrière le Voile au Ministère.",
        "Je ne peux plus tenir une baguette. Mais je peux te guider — Dolohov, le Héraut, les Spectres. Tous les trois doivent tomber avant que Voldemort ne réapparaisse en pleine puissance."
      ],
      idleRandom: [
        "Le Voile m'a pris à moi-même. C'était presque doux — un dernier rire avec Bellatrix.",
        "Dis à Harry que je suis fier. Si tu le croises, dis-lui que les Maraudeurs ne meurent pas, ils s'attardent.",
        "Dolohov porte une marque que je connais — il a torturé Caradoc Dearborn. Caradoc était mon ami.",
        "Le Héraut sonne le retour du Maître. Si tu l'écoutes trop, ton cœur s'arrête en cadence avec son cor.",
        "Les spectres de cette antichambre sont des sorciers qui ont franchi le Voile sans accepter. Apaise-les en les détruisant."
      ],
      questOffer:  "Trois cibles. Dolohov pour la justice, le Héraut pour gagner du temps, les Spectres pour leur repos. Choisis dans l'ordre que tu veux.",
      questActive: "Le travail se poursuit ?",
      questReady:  "Bien. Le Voile s'apaise un peu plus à chaque fin.",
      contextualReaction: [
        { killedId: "antonin_dolohov",
          text: "Dolohov... il a fauché tant des nôtres pendant la première guerre. Le voir tomber par ta main — voilà une justice que je n'espérais plus voir, même d'outre-Voile." },
        { killedId: "heraut_tenebres",
          text: "Le Héraut annonçait sa résurrection. Tu as fait taire l'annonce — mais prépare-toi : ce qu'il proclamait t'attend encore, plus bas." }
      ]
    }
  },

  {
    id:    "forgeron_tenebreux",
    name:  "Forgeron Ténébreux",
    title: "Armurier des dernières heures",
    sprite: "vendeur",
    icon:  "⚒️",
    portraitImg: "img/npc/forgeron_tenebreux.png",
    placement: { floor: 10, anchor: "any" },
    // Vend Essence/Page à prix prohibitifs (vs Apothicaire étage 9) — pour
    // les riches qui veulent maxer leur Forge sans grinder. Catalogue
    // d'items légendaires tier équipement.
    wares: [
      { id: "pectoral_auror",        price: 1200 },
      { id: "larme_phenix_mineure",  price: 1100 },
      { id: "grimoire_avance",       price: 1000 },
      { id: "felix",                 price: 220 },
      { id: "potion_l",              price: 100 },
      { id: "essence_tenebres",      price: 520 },
      { id: "page_grimoire",         price: 620 }
    ],
    buyback: { default: 0.35 },
    // Quête d'approvisionnement répétable en Boucle (étage 20) — rachat
    // d'Essence à prix fort (liquidation du surplus de Forge).
    questsGiven:    ["collecte_forgeron_boucle"],
    questsTurnedIn: ["collecte_forgeron_boucle"],
    dialoguesByQuest: {
      collecte_forgeron_boucle: {
        questOffer:  "Ma forge dévore l'Essence des Ténèbres plus vite que la Boucle ne la recrache. Apporte-m'en 3 et je te paierai grassement — bien plus que ce vendeur d'à côté.",
        questActive: "Toujours pas mes 3 Essences ? Mon enclume refroidit, sorcier.",
        questReady:  "De la belle Essence, bien mûre. Voilà ton or — un client qui ravitaille, c'est un client que je respecte."
      }
    },
    // Suffixe Ténébreux en Boucle (§6.12.E) — lu sur currentFloor >= 18.
    darkLoopLines: [
      "Dans la Boucle, je forge les mêmes pièces, encore et encore, pour le même client qui revient. Mon enclume ne refroidit jamais. Le marteau frappe en cadence avec la spirale.",
      "Mes prix sont scandaleux, et le resteront à chaque tour. Au moins, sorcier, mon acier ne se répète pas, lui : il tient. C'est tout ce qui tient, ici."
    ],
    dialogues: {
      greeting: [
        "Approche, sorcier. Mes prix sont scandaleux et mes pièces sont parfaites — choisis ton scandale.",
        "Pectoral d'Auror, Larme de Phénix, Grimoire avancé — tout ce qu'il te faut pour la dernière marche. Si tu peux payer."
      ],
      idleRandom: [
        "Tu trouveras moins cher chez l'Apothicaire de l'étage du dessus. Mais sa marchandise n'a pas dormi sous ma forge.",
        "L'Essence des Ténèbres, à mon prix, c'est une assurance. Au sien, c'est une loterie.",
        "Mon Pectoral d'Auror a déjà sauvé deux Aurors. Le troisième a refusé le prix — il n'a pas survécu pour le regretter.",
        "Personne ne descend plus bas que cet étage avec mauvaise réputation. J'ai mauvaise réputation. Cherche l'erreur."
      ]
    }
  },
  // ── Apothicaire des Reliques — vendeur ambulant de formes mid-game ──
  // (Artefacts 2.0 §1.4 A) : source fiable des nouvelles formes d'artefacts
  // (orbes, cristal, gantelets, grimoire, talisman, masque). Ambulant dès
  // l'étage 6 — complète Madame Malkins (stock tournant) par un comptoir
  // spécialisé. Portrait Copilot (Règle B).
  {
    id:        "apothicaire_reliques",
    name:      "Cassiopée Vance",
    title:     "Apothicaire des Reliques",
    sprite:    "vendeur",
    icon:      "⚗️",
    portraitImg: "img/npc/apothicaire_reliques.png",
    random:    true,
    minFloor:  6,
    maxFloor:  null,
    wares: [
      { id: "orbe_flamme"          },
      { id: "orbe_givre"           },
      { id: "cristal_focalisation" },
      { id: "gantelets_combat"     },
      { id: "talisman_blaireau"    },
      { id: "grimoire_flottant"    },
      { id: "masque_courage"       }
    ],
    // Rachat : 50 % par défaut, 70 % pour les artefacts (sa spécialité).
    buyback: {
      default: 0.50,
      byType:  { "acc": 0.70, "armor": 0.70, "wand": 0.70 }
    },
    dialogues: {
      greeting: [
        "Une relique mineure, voyageur ? J'en ai de toutes les formes — orbes, cristaux, talismans. Chacune attend la bonne main.",
        "Ne te fie pas à l'étiquette « mineure ». Une forme bien choisie vaut mieux qu'une légende mal portée."
      ],
      idleRandom: [
        "Les Fondateurs n'ont pas tout gravé dans l'or. Le reste tient dans des objets comme ceux-ci.",
        "Un orbe pour l'élément, un cristal pour l'esprit, un talisman pour tenir. À toi de composer.",
        "J'ai vu des sorciers négliger une simple relique… puis la regretter trois étages plus bas.",
        "Mes prix sont honnêtes. Mes objets, plus encore : aucun ne ment sur ce qu'il fait."
      ]
    }
  },
  // ── Marchand itinérant rare — sinks endgame Piste E ────────────
  // Spawn dédié dans dungeon.js (10 % par génération d'étage 11+).
  // Inventaire premium : items endgame à prix progressif (rarityScales)
  // appliqués via priceMultiplier ×1.4 par le shop. Item exclusif :
  // philtre_endurance (+3 END permanent, base 3500 G, prix progressif).
  // Voir .claude/plans/game-economy-gold-audit.md §5.6 Piste E.
  {
    id:    "marchand_ombre",
    name:  "Marchand d'Ombre",
    title: "Voyageur sans étage",
    sprite: "vendeur",
    icon:  "🛒",
    portraitImg: "img/npc/marchand_ombre.png",
    // Pas de `placement` ni `random:true` : placement assuré par le
    // hook dédié dans dungeon.js. Évite la concurrence avec les pools
    // ambiants standards.
    priceMultiplier: 1.4,
    wares: [
      { id: "elixir_perma_hp"   },
      { id: "elixir_perma_mp"   },
      { id: "pierre_ame"        },
      { id: "philtre_endurance" },
      { id: "essence_tenebres"  },
      { id: "page_grimoire"     },
      // Exclusivité Premium (Artefacts 2.0 §1.5/§3) : seul endroit où acheter
      // les variantes Premium des 4 Maisons, à prix prohibitif (rarityScales
      // ×1.5ⁿ + priceMultiplier 1.4). Toute Maison peut acheter toute Premium
      // (la Maison module l'accès, jamais le droit de porter — §1.2).
      { id: "orbe_runique_premium_gryff"       },
      { id: "masque_rituel_premium_slyth"      },
      { id: "baton_ancestral_premium_serd"     },
      { id: "talisman_fondateurs_premium_pouf" }
    ],
    buyback: { default: 0.30 },
    dialogues: {
      greeting: [
        "Tu m'as croisé. Peu de gens y parviennent — j'évite les chemins fixes.",
        "Mes flacons viennent de très loin… leur prix s'en ressent. Mais ils ne se retrouvent nulle part ailleurs."
      ],
      idleRandom: [
        "Le Philtre d'Endurance ? Recette ancestrale. Trois ingrédients que la moitié des herboristes refusent même de nommer.",
        "Tu me reverras peut-être. Ou pas. Personne ne devine où je dors.",
        "Mon prix est ferme. Mon temps aussi : j'aurai disparu avant ton prochain étage.",
        "Va. Quand tu reviendras, je serai parti — ou peut-être pas.",
        "Garde tes pas légers, sorcier. Et tes Gallions plus encore.",
        "Une Pierre d'Âme ? J'en trouve trois par siècle. La tienne est là, devant toi."
      ]
    }
  },

  // ── Boucle Ténébreuse — Gardien à l'entrée du palier (étage 11) ─
  // Combiné avec le recyclage `effectiveFloor` dans getNpcsForFloor,
  // ce PNJ ajoute des quêtes répétables endgame — purger les boss
  // Ténébreux qui se reforment dans la Boucle.
  {
    id:    "gardien_boucle",
    name:  "Gardien de la Boucle",
    title: "Esprit-veilleur des récurrences",
    sprite: "fantome",
    icon:  "♾️",
    portraitImg: "img/npc/gardien_boucle.png",
    placement: { floor: 11, anchor: "first-room" },
    questsGiven:    ["purge_loups", "purge_acromantules", "purge_mangemorts", "purge_moremplis", "prime_boss_gardien"],
    questsTurnedIn: ["purge_loups", "purge_acromantules", "purge_mangemorts", "purge_moremplis", "prime_boss_gardien"],
    // Prime de boss premium (cadence longue, everyLevels:3) — invoque le
    // Magyar Ancestral via spawnOnAccept, récompense un matériau primordial.
    dialoguesByQuest: {
      prime_boss_gardien: {
        questOffer:  "Au cœur de la Boucle dort un dragon que les âges ont oublié — le Magyar Ancestral. Je peux le réveiller pour toi. Peu en réchappent ; mais sa dépouille recèle une Essence Primordiale, et la Boucle paie ce qu'elle doit.",
        questActive: "Le Magyar t'attend. Sa flamme ne s'éteint qu'avec lui.",
        questReady:  "Le dragon est tombé. Tu as fait ce que des cycles entiers de revenants n'ont osé. Prends l'Essence Primordiale — tu l'as méritée."
      }
    },
    dialogues: {
      greeting: [
        "Tu reviens. Tous reviennent — c'est le sens de la Boucle. Je veille ici depuis la première récurrence.",
        "Les ombres se reforment, et tu dois les défaire encore et encore. Pour chaque purge, je récompenserai — c'est tout ce que je peux offrir."
      ],
      idleRandom: [
        "Greyback se reforme à chaque boucle. C'est sa malédiction. C'est aussi ton opportunité.",
        "Aragog dort sous la racine du temps. Réveille-le, abats-le, recommence — il ne te tiendra jamais rancune.",
        "Dolohov ne meurt jamais vraiment. Chaque mort le rend plus prévisible — étudie sa courbe violette.",
        "Le Moremplis rampe là où meurent les torches. Garde un sortilège de lumière prêt, ou il t'avalera tout entier.",
        "Plus tu purges, plus la Boucle s'allège. C'est ainsi qu'on en sort — peut-être.",
        "Je n'ai plus de nom propre. Trop de récurrences. Mais j'ai encore des récompenses."
      ],
      questOffer:  "Quatre purges, à répétition. Loups, Acromantules, Mangemorts, Linceuls. Recommence quand tu veux — je récompense chaque cycle.",
      questActive: "La purge avance.",
      questReady:  "Bien. La Boucle te doit cela — pour cette fois."
    }
  }
];

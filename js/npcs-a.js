// ============================================================
// PNJ — registre NPCS (1/2) : nommés, écoles & quêtes
// (extrait de npcs.js — Lot C P3.3, pattern push, ordre préservé)
// ============================================================

NPCS.push(
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
    questsGiven:    ["mandragore_pomfresh", "fabrique_pomfresh", "givre_pomfresh"],
    questsTurnedIn: ["mandragore_pomfresh", "fabrique_pomfresh", "givre_pomfresh"],
    // Quêtes répétables en Boucle (étage 12) — gate minFloor:11.
    dialoguesByQuest: {
      fabrique_pomfresh: {
        questOffer:  "La Boucle me ramène les mêmes blessés, encore et encore. Si tu sais manier un chaudron, concocte-moi 3 Potions de Soin Mineure — l'infirmerie ne tient plus que par tes mains.",
        questActive: "Mes réserves ? Trois Potions de Soin Mineure, jeune sorcier. Le chaudron de Slughorn n'est pas loin.",
        questReady:  "Béni sois-tu. Voilà de quoi te remercier — et reviens vite, la Boucle ne cicatrise jamais."
      },
      givre_pomfresh: {
        questOffer:  "Ce froid… il ne vient pas de l'hiver. Mes patients gèlent de l'intérieur, et la Boucle en ramène toujours plus. Rapporte-moi 3 Cristaux de Givre arrachés aux spectres des Ruines — j'en tirerai une Essence de Chaleur qui réchauffe jusqu'à l'âme.",
        questActive: "Trois Cristaux de Givre, jeune sorcier — les spectres des Ruines en sont pétris. Garde un sortilège de feu prêt pour les défaire.",
        questReady:  "Parfait. Le froid reculera, pour cette fois. Tiens — une Essence de Chaleur, bois-la quand la Boucle te glacera à ton tour."
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
    questsGiven:    ["manon_secret", "manon_pardon", "manon_revelio", "manon_grimoire", "manon_acte3", "manon_clair_de_lune", "manon_confier", "manon_compagnie"],
    questsTurnedIn: ["manon_secret", "manon_pardon", "manon_revelio", "manon_grimoire", "manon_acte3", "manon_clair_de_lune", "manon_confier", "manon_compagnie"],
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
      },
      // ── Capstone — « Clair de Lune » (le père, Lupin) ──
      // Après la mère (givre), l'arc se referme sur le père : la lumière qu'il
      // oppose au désespoir (le Patronus). Récompense : Livre de Maîtrise Lumière.
      manon_clair_de_lune: {
        questOffer: [
          "Ma mère m'a rendu le givre. Mais il me reste mon père à comprendre — pas la bête, pas la lune qui gratte sous ma peau. L'autre part de lui. Celle qui tient debout des enfants terrifiés avec un carré de chocolat et un sortilège de lumière.",
          "Il m'a confié une chose, l'autre soir, autour du thé. « Ce que je combats depuis toujours, ce ne sont pas les loups. Ce sont les Détraqueurs — le désespoir qui dit qu'on ne mérite pas d'être aimé. Contre eux, je n'ai qu'une arme : la lumière d'un souvenir heureux. » Il voudrait me l'apprendre. Mais d'abord, il faut leur tenir tête.",
          "Va, et disperse-en deux en notre nom — au mien et au sien. Quand tu reviendras, il aura achevé pour moi un livre : tout ce qu'il sait de cette lumière-là. Le legs qu'il n'a jamais pu m'écrire en seize ans de lettres. Cette fois, il le finit."
        ],
        questActive: "Ils sont encore là, les Détraqueurs ? Le froid qu'ils traînent n'a rien de celui de ma mère — c'est un froid qui vide, pas un froid qui dessine. Tiens-leur tête. Mon père dit qu'on n'y arrive jamais seul ; alors pense à quelqu'un que tu aimes, et frappe.",
        questReady: [
          "Tu les as dispersés. (Elle expire, longuement.) Mon père l'a senti d'en bas, je crois — il est monté, ce qu'il ne fait jamais. Il avait ce livre sous le bras, relié de sa main, et il tremblait un peu en me le tendant.",
          "« Je n'ai jamais su t'écrire de mon vivant de père, » m'a-t-il dit. « Alors voilà ce que je sais de mieux : comment faire de la lumière quand tout dit qu'il n'y en a plus. C'est tout ce que j'avais à transmettre. C'est à toi, maintenant. »",
          "(Elle dépose le livre près de la photographie et de la fougère de givre, sur le rebord de la fenêtre. La lune se lève dessus.) Le givre de ma mère, la lumière de mon père. Les deux tiennent enfin dans le même cadre — et moi au milieu. Garde ce savoir, toi aussi : qu'on apprenne à plus d'un à faire reculer le noir. C'est ce qu'il aurait voulu."
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
);

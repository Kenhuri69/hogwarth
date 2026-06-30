// ============================================================
// PNJ — registre NPCS (2/2) : ambiants/aléatoires & endgame/Boucle
// (extrait de npcs.js — Lot C P3.3, pattern push, ordre préservé)
// ============================================================

NPCS.push(
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
    questsGiven:    ["chasse_aragog", "baiser_detraqueur", "dictame_bill", "givre_ancien", "chasse_bill_boucle"],
    questsTurnedIn: ["chasse_aragog", "baiser_detraqueur", "dictame_bill", "givre_ancien", "chasse_bill_boucle"],
    // Prime de nettoyage répétable en Boucle (étage 19) — cible aléatoire.
    dialoguesByQuest: {
      // Lien Bill × Élara (révision quêtes §6) — le briseur reconnaît le givre.
      givre_ancien: {
        questOffer:  "Tu récoltes des pages de givre, plus haut ? Je les ai senties d'ici. Le même sortilège de dissimulation court sur les spectres gelés de ces galeries — du travail d'orfèvre, signé d'une certaine Élara. Brise-m'en un, le plus ancien : je veux lire ce qu'elle a pris tant de soin à cacher.",
        questActive: "Le spectre de givre, tu l'as trouvé ? Cherche les galeries gelées. Garde un sort de feu — le froid de ce sortilège mord deux fois.",
        questReady:  "Brisé. (Bill effleure les runes de givre qui s'effacent.) De la magie d'amour, pas de guerre. Cette Élara cachait sa tendresse comme d'autres cachent un trésor. Sa fille devrait savoir ça. Tiens — cette page t'appartient autant qu'à moi."
      },
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
      { id: "potion_corruption_ctrl", price: 360 },
      { id: "potion_resilience_maison", price: 320 },
      // Potions 2.0 P12 — formes Boucle (Écho Temporel + poudres runiques).
      { id: "potion_echo_temporel", price: 300 },
      { id: "poudre_stun",      price: 90 },
      { id: "poudre_fear",      price: 90 },
      // Marchand d'Ombre (Potions 2.0 P9) : les 4 Premium hors-Maison se
      // monnaient ici, cher (la Premium de chosenHouse reste « facile » via
      // la quête signature — décision §3.4).
      { id: "elixir_lion_ardent", price: 1500 },
      { id: "venin_serpent",      price: 1500 },
      { id: "sagesse_aigle",      price: 1500 },
      { id: "vigueur_blaireau",   price: 1500 },
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
    questsGiven:    ["chasse_dolohov", "chasse_heraut", "purification_sirius", "fardeau_de_sirius", "chasse_sirius_boucle"],
    questsTurnedIn: ["chasse_dolohov", "chasse_heraut", "purification_sirius", "fardeau_de_sirius", "chasse_sirius_boucle"],
    // Prime d'apaisement répétable en Boucle (étage 20) — cible aléatoire.
    dialoguesByQuest: {
      // Lien Sirius × Lupin × Manon (révision quêtes §6).
      fardeau_de_sirius: {
        questOffer:  "Approche, filleul. Il faut que je te parle de Remus. Mon dernier ami vivant — et le plus lâche des courageux. Il avait une fille, sais-tu ? Une enfant qu'il n'a jamais osé regarder, par peur de lui transmettre sa nuit. Disperse deux Détraqueurs ici, pour lui : qu'il apprenne, même mort, qu'on peut tenir tête au désespoir.",
        questActive: "Les Détraqueurs rôdent encore ? Remus les a fuis toute sa vie. Toi, tiens-leur tête — c'est tout ce que je lui demande, à travers toi.",
        questReady:  "Deux de moins. (L'esprit ferme les yeux.) Voilà, Remus. Quelqu'un l'a fait pour toi. Va, filleul — et si tu croises sa fille, ne lui dis pas que son père était un lâche. Dis-lui qu'il avait peur, ce qui n'est pas la même chose."
      },
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
    questsGiven:    ["purge_loups", "purge_acromantules", "purge_mangemorts", "purge_moremplis", "endurer_poches", "purge_givre", "purge_spectres", "chasse_basilic_ancestral", "prime_boss_gardien"],
    questsTurnedIn: ["purge_loups", "purge_acromantules", "purge_mangemorts", "purge_moremplis", "endurer_poches", "purge_givre", "purge_spectres", "chasse_basilic_ancestral", "prime_boss_gardien"],
    // Prime de boss premium (cadence longue, everyLevels:3) — invoque le
    // Magyar Ancestral via spawnOnAccept, récompense un matériau primordial.
    dialoguesByQuest: {
      endurer_poches: {
        questOffer:  "Les runes du Sceau te happeront encore — c'est leur nature déréglée. N'y vois pas un châtiment : chaque Poche re-scellée raffermit le verrou. Endure-en deux, et la Boucle te paiera en matière.",
        questActive: "Le Sceau t'éprouve encore. Tiens, comprends, ordonne, abrite-toi — et reviens m'en parler.",
        questReady:  "Deux Poches re-scellées. Tu oses regarder le fond là où d'autres remontent en courant. La Boucle te doit cela."
      },
      prime_boss_gardien: {
        questOffer:  "Au cœur de la Boucle dort un dragon que les âges ont oublié — le Magyar Ancestral. Je peux le réveiller pour toi. Peu en réchappent ; mais sa dépouille recèle une Essence Primordiale, et la Boucle paie ce qu'elle doit.",
        questActive: "Le Magyar t'attend. Sa flamme ne s'éteint qu'avec lui.",
        questReady:  "Le dragon est tombé. Tu as fait ce que des cycles entiers de revenants n'ont osé. Prends l'Essence Primordiale — tu l'as méritée."
      },
      purge_givre: {
        questOffer:  "Le froid des Ruines n'est pas une saison : il se condense en spectres. Disperses-en deux — le gel reculera d'un pas, et la Boucle te paiera.",
        questActive: "Le givre s'épaissit encore. Continue de le disperser.",
        questReady:  "Le froid recule, pour cette fois. Prends ta part."
      },
      purge_spectres: {
        questOffer:  "Les Spectres Renforcés se retissent plus denses à chaque cycle. La lumière les délie — abats-en deux et reviens.",
        questActive: "Deux spectres à délier. La lumière est ton meilleur fil.",
        questReady:  "Bien tranché. La trame des Ruines s'allège d'autant."
      },
      chasse_basilic_ancestral: {
        questOffer:  "Tout au fond mue un Basilic plus vieux que la Chambre des Secrets. Le réveiller est un défi de cycles entiers — mais sa dépouille concentre une Essence des Ténèbres comme nulle autre. Oseras-tu ?",
        questActive: "Le Basilic Ancestral t'attend, là où la pierre se souvient d'avant l'école. Garde son regard hors du tien.",
        questReady:  "Le serpent des âges est tombé. Peu de revenants peuvent en dire autant. L'Essence est à toi."
      }
    },
    // Fil rouge des Éclats (ch.06 §6.9.3) — le Gardien commente le prestige
    // du porteur. Suffixe muet appendu par _eclatSuffixPages (npc-dialog.js),
    // lu par paliers d'Éclats portés (eclatProgress).
    eclatLines: {
      1: "Tu portes déjà des Éclats de réalité. Chaque spirale t'en laisse un. Garde-les — ils pèsent plus qu'ils n'en ont l'air.",
      2: "Tant d'Éclats… Tu descends plus loin que la plupart des revenants. La Boucle te reconnaît, désormais.",
      3: "Tu portes la mémoire de cycles entiers. Ceux qui en portent autant finissent par voir la faille — et par devoir choisir quoi en faire."
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
);

// ============================================================
// CODEX — Registre des entrées non-créature + évaluateur pur
// ------------------------------------------------------------
// Le « Codex » est le journal vivant et déverrouillable du joueur
// (Chapitre 12 — docs/histoire/12-glossaire-et-codex.md). Ce fichier est
// INERTE au runtime (pur registre + helpers purs), à l'image de
// quests-templates.js / riddles.js : aucune exécution au top-level, donc
// chargeable tel quel dans le sandbox vm de tests/units.js.
//
// Les entrées CRÉATURE ne vivent PAS ici : elles restent dérivées de
// seenMonsters / monsterKills via ui-bestiary.js (pas de double source de
// vérité). Le Codex héberge l'onglet Bestiaire existant sans le réécrire.
//
// Format d'une entrée (§12.3) :
//   {
//     id, category, title, icon?, act?, links?[],
//     unlockConditions:[ {type,value[,kills]} ... ],  // OU : 1 remplie ouvre
//     revealedBy?:[ ... ],                              // ET  : toutes → revealed
//     corruptedBy?:[ ... ],                             // ET  : toutes → corrupted (surcouche)
//     textVersions:{ veiled, revealed?, corrupted? },
//     variants?:{ house?:{...}, hero?:{...} }
//   }
//
// Types de condition admissibles (§12.5.3) — chacun lit un signal du `ctx` :
//   floor   → ctx.floorReached  >= value
//   eclat   → ctx.eclatProgress >= value         (nb de eclat_voute collectés)
//   quest   → ctx.questsDone.has(value)
//   monster → ctx.seenMonsters.has(value) [&& monsterKills[value] >= kills]
//   riddle  → ctx.riddlesSolved.has(value)
//   echo    → ctx.echoSeen.has(value)            (= seenEchoes existant)
//   item    → ctx.itemsOwned.has(value)          (inventaire + équipement ; palier/drop)
//   house   → ctx.chosenHouse === value          (variantes / gating)
//   victory → ctx.victoryAchieved === true       (Boucle Ténébreuse)
//   eclatLoop → ctx.accumulatedEclats >= value   (Porteur d'Éclats — V1, ch.11)
//   cycleBroken → ctx.cycleBroken === true        (« Briser le Cycle » — V3, ch.11)
//   ending  → ctx.endingType === value            (label de fin dérivé — ch.14 §14.6.2, P3)
// ============================================================

const CODEX_ENTRIES = [

  // ── 🔥 Histoire & Lore ─────────────────────────────────────
  {
    id: 'cle_de_voute', category: 'histoire', icon: '🔑', act: 1,
    iconImg: 'img/icons_new/cle_de_voute_64.png',
    title: 'La Clé de Voûte des Quatre',
    links: ['eclat_voute_codex', 'ruines_anciennes', 'boucle_tenebreuse'],
    unlockConditions: [{ type: 'floor', value: 1 }],
    revealedBy: [{ type: 'eclat', value: 3 }],
    corruptedBy: [{ type: 'floor', value: 14 }],
    textVersions: {
      veiled: "Relique forgée par les quatre Fondateurs, exposée en cours d'Histoire de la Magie. On dit qu'elle « tenait » quelque chose. Ce matin, elle s'est fendue avec un bruit de glace, et les grands escaliers ont basculé vers le bas. Personne ne sait encore ce qui s'est ouvert.",
      revealed: "La Clé n'était pas une porte : c'était un verrou. Godric, Salazar, Rowena et Helga ne l'ont pas forgée pour garder un trésor, mais pour sceller — ensemble, d'un même geste — ce qui dormait sous l'école avant l'école. Sa fêlure n'a pas créé le mal. Elle a desserré une peur que quatre volontés tenaient close depuis mille ans. Descendre, c'est remonter jusqu'à ce qu'ils ont eu le courage d'enfermer.",
      corrupted: "J'ai vu, dans les Ruines, comment le sceau fut posé. La Clé n'est qu'un nœud à la surface d'un fil bien plus ancien. Et j'ai compris une chose que les manuels taisent : la refermer par en haut ne suffira jamais. Ce qui retient, en bas, ce n'est pas une serrure. C'est qu'on ose la regarder.",
    },
  },

  // ── 🔹 Éclats & Voix des Fondateurs ────────────────────────
  {
    id: 'eclat_voute_codex', category: 'eclats', icon: '🔹', act: 1,
    iconImg: 'img/icons_new/eclat_voute_64.png',
    title: 'Les Éclats de la Clé de Voûte',
    links: ['cle_de_voute', 'echo_scellement'],
    unlockConditions: [{ type: 'eclat', value: 1 }],
    revealedBy: [{ type: 'eclat', value: 3 }],
    // Sorts & Magie 2.0 Lot P2 — Codex enseignant : réunir les 3 Éclats
    // (révélation de l'entrée) enseigne le sort Éclat de Voûte au groupe.
    teachesSpell: 'Éclat de Voûte',
    textVersions: {
      veiled: "Éclat I/III (Peeves) — Un fragment du verrou, froid comme une dent de givre. En le tenant, une certitude : quelque chose s'est brisé. Plus bas, le deuxième éclat pulse : ce n'est pas un accident isolé — on le nourrit d'en bas. La fêlure est alimentée.",
      revealed: "Éclat III/III (Mangemort d'Élite) — Les trois éclats, réunis, dessinent une vérité double : le verrou cachait deux choses, pas une — une corruption plus vieille que les Fondateurs, et, tout au fond, Voldemort qui se nourrit de la brèche pour se reformer.",
    },
  },
  {
    id: 'echo_scellement', category: 'eclats', icon: '🕯️', act: 4,
    title: 'L\'Écho du Scellement',
    links: ['cle_de_voute', 'ruines_anciennes', 'voix_godric', 'voix_salazar', 'voix_rowena', 'voix_helga'],
    unlockConditions: [{ type: 'echo', value: 'echo_scene_sceau' }],
    revealedBy: [
      { type: 'echo', value: 'echo_godric' },
      { type: 'echo', value: 'echo_salazar' },
      { type: 'echo', value: 'echo_rowena' },
      { type: 'echo', value: 'echo_helga' },
    ],
    textVersions: {
      veiled: "Le brouillard temporel s'épaissit, et soudain la salle n'est plus vide : quatre silhouettes, dos à toi, lèvent les mains vers une faille de lumière. Tu marches dans un souvenir.",
      revealed: "C'est le moment où le sceau fut posé. Tu les entends, chacun selon sa nature : 🦁 Godric — « On ne scelle pas par peur. On tient la porte. » ; 🐍 Salazar — « J'ai scellé ma part avec ma faute. » ; 🦅 Rowena — « Comprends, et la faille apparaît. » ; 🦡 Helga — « J'ai creusé un abri pour ceux qui resteraient. » Quatre façons de vivre la même descente. Quatre vérités d'un seul verrou.",
    },
  },
  {
    id: 'voix_godric', category: 'eclats', icon: '🦁', act: 4,
    title: 'La Voix de Godric',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'echo', value: 'echo_godric' }],
    revealedBy: [{ type: 'echo', value: 'echo_scene_sceau' }],
    textVersions: {
      veiled: "Au cœur runique des Ruines, un timbre clair sans corps : « On ne scelle pas par peur. On tient la porte. » Le courage, ici, n'est pas un cri — c'est une faction qu'on ne quitte pas.",
      revealed: "Tu as vu la scène, maintenant : devant la faille, Godric ne brandit rien. Il se place, simplement, entre la lumière et les trois autres, et il reste. Voilà ce que sa voix taisait — la part qu'il a scellée dans le verrou n'est pas l'élan qui charge, c'est l'aplomb qui ne recule pas quand les autres faiblissent. Tenir la porte, c'est accepter d'être le dernier à partir.",
    },
    variants: { house: { Gryffondor: "Il parle comme à l'un des siens : tenir la porte n'est pas mourir pour elle, c'est rester quand tout pousse à reculer." } },
  },
  {
    id: 'voix_salazar', category: 'eclats', icon: '🐍', act: 4,
    title: 'La Voix de Salazar',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'echo', value: 'echo_salazar' }],
    revealedBy: [{ type: 'echo', value: 'echo_scene_sceau' }],
    textVersions: {
      veiled: "Dans les profondeurs, une voix qui connaît ton nom et tes tentations : « J'ai scellé ma part avec ma faute. » Pour fermer le verrou, chacun a dû y mettre une part de soi-même — sa plus laide. La tentation que tu entends n'est pas un démon : c'est un miroir.",
      revealed: "Dans la scène, Salazar est le seul à fermer les yeux en posant la main sur le sceau. Sa voix le disait sans l'avouer : la part qu'il a enfermée dans le verrou, c'est sa faute même — l'orgueil qui faillit tout perdre. Il n'a pas tué cette voix en lui ; il l'a scellée avec le reste, et il a refusé de lui obéir. Le miroir qu'il te tend n'exige pas que tu sois pur — seulement que tu choisisses, comme lui, de ne pas écouter.",
    },
    variants: { house: { Serpentard: "Il te parle comme à un héritier. Ce n'est pas un piège : c'est une passation. À toi de décider ce que tu fais de ce que tu reconnais en lui." } },
  },
  {
    id: 'voix_rowena', category: 'eclats', icon: '🦅', act: 4,
    title: 'La Voix de Rowena',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'echo', value: 'echo_rowena' }],
    revealedBy: [{ type: 'echo', value: 'echo_scene_sceau' }],
    textVersions: {
      veiled: "Une voix posée, presque amusée : « Comprends, et la faille apparaît. » Le savoir n'écarte pas la peur — il la nomme, et c'est en la nommant qu'on trouve où poser le sceau.",
      revealed: "La scène le montre : Rowena ne fixe pas la faille, elle regarde les trois autres — et c'est elle qui leur dit où poser les mains. Comprendre n'a jamais écarté la peur ; mais sans elle, nul n'aurait su OÙ sceller. Sa part dans le verrou, c'est la lucidité : voir une faille là où les autres ne voyaient qu'un mur. La question juste, toujours, avant la réponse.",
    },
    variants: { house: { Serdaigle: "Elle ne te donne pas la réponse : elle te montre la question juste. Lis ce qui est sous toutes les autres pages." } },
  },
  {
    id: 'voix_helga', category: 'eclats', icon: '🦡', act: 4,
    title: 'La Voix de Helga',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'echo', value: 'echo_helga' }],
    revealedBy: [{ type: 'echo', value: 'echo_scene_sceau' }],
    textVersions: {
      veiled: "La plus douce des quatre : « J'ai creusé un abri pour ceux qui resteraient. » Pendant que les autres scellaient, elle pensait déjà aux vivants d'après — à ceux qu'on ne laisse pas derrière.",
      revealed: "Pendant que les trois posent le sceau, la scène montre Helga à l'écart, tournant déjà le dos à la faille : elle creuse. Non par lâcheté — parce qu'un verrou sans abri ne protège personne. Sa part dans le sceau n'est pas une force qui ferme, c'est une douceur qui prévoit. Elle savait qu'on ne tient pas une porte mille ans sans laisser, derrière, de quoi vivre à ceux qui la tiendront après nous.",
    },
    variants: { house: { Poufsouffle: "Elle te confie l'abri, pas le verrou. Protéger ceux qui restent vaut autant que tenir la porte." } },
  },
  {
    id: 'porteur_eclats', category: 'eclats', icon: '🔹', act: 4,
    title: "Le Porteur d'Éclats",
    links: ['boucle_tenebreuse', 'eclat_voute_codex', 'ruines_anciennes'],
    unlockConditions: [{ type: 'victory' }],
    revealedBy: [{ type: 'eclatLoop', value: 5 }],
    corruptedBy: [{ type: 'floor', value: 21 }],
    textVersions: {
      veiled: "Depuis que la Boucle s'est ouverte, chaque pas plus bas détache un fragment — non plus du verrou (il est brisé), mais des réalités que la faille déchire. On ne les possède pas : on les porte, comme un poids. Tu es devenu le Porteur d'Éclats.",
      revealed: "Tu en portes assez, maintenant, pour sentir ce qu'ils sont : des coutures du réel, des bouts de mémoire et de futurs avortés que la spirale arrache à chaque tour. Les accumuler ne te rend pas plus fort — cela te rapproche du fond, là où le sceau fut posé, et de ce que les Ruines tiennent encore clos. Porter, c'est s'alourdir de tout ce que la légende ramasse en descendant.",
      corrupted: "Les Éclats que tu portes ne pèsent plus dans tes mains : ils pèsent dans le lieu. La pierre te reconnaît à leur nombre, comme si tu en étais devenu un toi-même — une couture de plus dans un réel qui a cessé de distinguer celui qui porte de ce qui est porté.",
    },
  },
  {
    id: 'echo_signature', category: 'eclats', icon: '🪧', act: 4,
    title: "L'Écho de ta Signature",
    links: ['boucle_tenebreuse', 'porteur_eclats'],
    unlockConditions: [{ type: 'victory' }],
    revealedBy: [{ type: 'echo', value: 'echo_signature' }],
    textVersions: {
      veiled: "En Boucle, ce que tu as accompli — ou laissé inachevé — dans ta Maison revient, déchiré, planté dans la roche-mère. La spirale ne corrompt pas seulement les lieux : elle rejoue tes propres choix, altérés.",
      revealed: "Ta signature te précède jusqu'au fond. L'avoir bouclée, c'est emporter son aboutissement dans la spirale — une braise qui tient, un pacte qui se prolonge, un codex qui s'écrit, un refuge qui se rouvre. L'avoir laissée en plan, c'est descendre avec une dette : la Bannière reste éteinte, le pacte muet, la page illisible, l'abri vide. La Boucle n'invente pas ce poids — elle te le rend.",
    },
  },

  // ── 📖 Glossaire ────────────────────────────────────────────
  {
    id: 'froid_surnaturel', category: 'glossaire', icon: '🧊', act: 1,
    title: 'Le Froid surnaturel',
    links: ['cle_de_voute'],
    unlockConditions: [{ type: 'floor', value: 2 }],
    revealedBy: [{ type: 'floor', value: 7 }],
    textVersions: {
      veiled: "Le givre qui ourlait le socle de la Clé gagne maintenant les fenêtres, puis l'haleine. Ce n'est pas l'hiver : il fait froid là où la corruption touche.",
      revealed: "Le froid n'accompagne pas le mal : il est le mal rendu sensible. Partout où la fêlure suinte, la chaleur de la vie reflue — c'est pourquoi les créatures les plus atteintes sont froides au toucher, et pourquoi la glace les blesse autant qu'elle les nomme. Avoir froid, dans ces murs, c'est être près de la source.",
    },
  },
  {
    id: 'boucle_tenebreuse', category: 'glossaire', icon: '🌑', act: 4,
    title: 'La Boucle Ténébreuse',
    links: ['cle_de_voute', 'ruines_anciennes'],
    unlockConditions: [{ type: 'victory' }],
    revealedBy: [{ type: 'floor', value: 14 }],
    corruptedBy: [{ type: 'floor', value: 21 }],
    textVersions: {
      veiled: "Tu as vaincu Voldemort. L'escalier le plus profond, scellé par la peur, s'ouvre enfin — et le château recommence, corrompu.",
      revealed: "Voici le revers que nul manuel n'osait écrire : refermer la serrure du haut a ouvert celle du bas. Voldemort n'était que la dernière dent du verrou ; en l'arrachant, tu as exposé ce que les Fondateurs tenaient vraiment clos. La victoire n'est pas une fin : c'est la permission de descendre là où le mythe n'osait pas regarder. Tu es devenu légende — et la légende attire le plus profond.",
      corrupted: "La Boucle ne recommence pas : elle s'enfonce. Chaque tour du château gratte une couche de plus du mensonge tendre, et sous l'école il n'y a bientôt plus d'école — seulement la pierre qui a cessé de distinguer jadis de maintenant.",
    },
  },
  {
    id: 'briser_cycle', category: 'eclats', icon: '🗝️', act: 4,
    title: 'Briser le Cycle',
    links: ['boucle_tenebreuse', 'porteur_eclats', 'cycle_brise', 'echo_scellement'],
    unlockConditions: [{ type: 'victory' }],
    revealedBy: [
      { type: 'echo', value: 'echo_scene_sceau' },
      { type: 'eclatLoop', value: 15 },
      { type: 'monster', value: 'reflet_mythe', kills: 1 },
    ],
    textVersions: {
      veiled: "Une rumeur sans manuel : il existerait, pour le Porteur d'Éclats qui descend assez loin, écoute assez de voix et porte assez de fragments, une autre issue que descendre toujours. Trois conditions la précèdent — entendre, porter, affronter — avant un dernier choix.",
      revealed: "Tu les as réunies, les trois clés du chemin que nul n'osa écrire : tu as VU comment le sceau fut posé (à quatre, chacun avec sa faute) ; tu as PORTÉ assez d'Éclats pour peser sur la faille ; tu as AFFRONTÉ ton propre mythe retourné, le Reflet, au sommet de l'Avant-Monde. Reste le quatrième pas, qui n'appartient qu'à toi : choisir. Refermer la faille par le bas — ou perpétuer la spirale, et rester une légende sans fin.",
    },
  },
  {
    id: 'cycle_brise', category: 'histoire', icon: '🕊️', act: 4,
    title: 'Le Cycle Brisé',
    links: ['briser_cycle', 'boucle_tenebreuse', 'cle_de_voute'],
    unlockConditions: [{ type: 'cycleBroken' }],
    revealedBy: [{ type: 'cycleBroken' }],
    textVersions: {
      veiled: "Tu as brisé le Cycle.",
      revealed: "Tu n'as pas fui la peur vers le haut : tu es descendu jusqu'à elle et tu l'as rescellée par le bas, en y laissant — comme les Quatre — une part de toi. La victoire sur Voldemort fermait la serrure du haut ; ce geste-ci ferme celle du bas. Le mythe ne meurt pas pour autant : la Boucle reste ouverte à qui veut redescendre. Mais toi, désormais, tu sais ce qu'il y a au fond — et qu'on peut le regarder sans se perdre.",
    },
  },
  // Épilogue dynamique (Chapitre 14 §14.6.2, P3) : ouvert à la PREMIÈRE victoire
  // (robinet `victory`), il se révèle quand la partie atteint sa fin accomplie
  // (robinet `ending` = label dérivé `cycle_broken`). Le texte est la mémoire
  // écrite de COMMENT cette partie s'est conclue ; la Maison la colore via la
  // note marginale `variants.house` (cosmétique, non-gating).
  {
    id: 'epilogue', category: 'histoire', icon: '📜', act: 4,
    title: "Épilogue — la dernière ligne",
    links: ['cycle_brise', 'boucle_tenebreuse', 'cle_de_voute'],
    unlockConditions: [{ type: 'victory' }],
    revealedBy: [{ type: 'ending', value: 'cycle_broken' }],
    textVersions: {
      veiled: "Quelque part, un parchemin s'écrit seul à mesure que tu avances. Il dit que Voldemort est tombé, que la nuit a cédé devant ton courage — et que le château, au lieu de se refermer, s'est ouvert vers le bas. Comment ton histoire se conclura, il l'ignore encore : la dernière ligne dépend de jusqu'où tu oseras descendre.",
      revealed: "Le parchemin a trouvé sa dernière ligne. Tu n'as pas seulement vaincu l'Ombre du haut : tu es descendu jusqu'à la peur du fond et tu l'as rescellée par le bas, en y laissant — comme les Quatre — une part de toi. Ton nom rejoint le leur non pour avoir bâti un couvercle, mais pour avoir osé regarder dessous sans te perdre. La Boucle reste ouverte ; toi, désormais, tu sais. C'est ainsi que finit ta légende : non par un mur, mais par une paix qu'on emporte en redescendant.",
    },
    variants: { house: {
      Gryffondor:  "Le parchemin te nomme à la manière de Godric : celui qui est descendu avec sa peur, et n'a jamais lâché la porte.",
      Serpentard:  "Le parchemin retient de toi ce que Salazar admirait : le sens de l'heure juste — et la lucidité de savoir à qui l'on serre la main.",
      Serdaigle:   "Le parchemin garde de toi la marque de Rowena : tu as compris la faille avant même de la combattre.",
      Poufsouffle: "Le parchemin retient de toi la leçon de Helga : tu n'as laissé personne derrière, jusqu'au plus profond.",
    } },
  },

  // ── 🗺️ Lieux & Géographie ──────────────────────────────────
  {
    id: 'ruines_anciennes', category: 'lieux', icon: '🗿', act: 4,
    title: 'Les Ruines Anciennes',
    links: ['cle_de_voute', 'boucle_tenebreuse', 'echo_scellement'],
    unlockConditions: [{ type: 'floor', value: 14 }],
    revealedBy: [{ type: 'echo', value: 'echo_scene_sceau' }],
    corruptedBy: [{ type: 'floor', value: 21 }],
    textVersions: {
      veiled: "Sous le dernier palier du château, la pierre change de langue. Plus de blason, plus de torche : des mégalithes runiques, antérieurs à tout nom. Le froid n'y est plus une météo — c'est l'air d'avant.",
      revealed: "Poudlard fut bâti comme un couvercle. Les Fondateurs ont choisi cette colline non pour sa beauté, mais parce qu'il fallait poser une école — du bruit d'enfants, des siècles de vie — sur ce que ces Ruines contiennent. L'école est le mensonge tendre qu'on raconte par-dessus une vérité qu'on ne peut pas tuer. Descendre ici, c'est lire la première page sous toutes les autres.",
      corrupted: "Plus profond encore, les runes ne se lisent plus : elles se souviennent de toi. Le lieu a cessé de distinguer jadis de maintenant — tu n'explores plus les Ruines, tu en es devenu une ligne.",
    },
  },

  // ── 🗺️ Lieux & Géographie — fiches de zone (robinet étage, Lot 4) ──
  {
    id: 'grande_salle', category: 'lieux', icon: '🍽️', act: 1,
    title: 'La Grande Salle',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'floor', value: 1 }],
    revealedBy: [{ type: 'echo', value: 'echo_silhouette' }],
    textVersions: {
      veiled: "Le cœur de l'école : quatre longues tables, un plafond enchanté. Ce matin, elle est vide — les tables dressées pour personne, les bougies allumées pour des absents.",
      revealed: "Dans la brume, l'espace d'un battement, la salle se remplit : des centaines d'élèves, un Choixpeau qui chante, le brouhaha d'un festin. Puis plus rien. Le château ne te montre pas un fantôme — il te montre ce pour quoi il fut bâti. Toute cette vie posée comme un couvercle chaud sur le froid d'en dessous. C'est cela que tu défends en descendant.",
    },
  },
  {
    id: 'couloirs_poudlard', category: 'lieux', icon: '🏰', act: 1,
    title: 'Les Couloirs de Poudlard',
    links: ['froid_surnaturel', 'cachots_poudlard'],
    unlockConditions: [{ type: 'floor', value: 1 }],
    revealedBy: [{ type: 'floor', value: 4 }],
    textVersions: {
      veiled: "Pierre claire, poutres, portraits, torches : le Poudlard qu'on reconnaît. Mais un chat attaque, un portrait maudit, les escaliers se figent vers le bas, et le givre s'accroche aux vitraux en pleine année. On est encore à la maison — mais la maison a peur.",
      revealed: "Ce familier était déjà contaminé. La zone d'entrée n'était pas un prologue paisible : c'était la première couche du mensonge tendre, là où la corruption monte d'en bas sans qu'on veuille encore le croire. La seule leçon qui compte s'apprend ici — le mal ne vient pas du dehors, il remonte.",
    },
  },
  {
    id: 'cachots_poudlard', category: 'lieux', icon: '🔒', act: 2,
    title: 'Les Cachots de Poudlard',
    links: ['couloirs_poudlard', 'profondeurs_oubliees'],
    unlockConditions: [{ type: 'floor', value: 4 }],
    revealedBy: [{ type: 'floor', value: 7 }],
    textVersions: {
      veiled: "Sous les salles de classe : tapis sombres, pierre humide, lumière rare. Le décor cesse d'être scolaire et devient carcéral. C'est ici qu'apparaissent les premiers masques — la corruption a des serviteurs humains.",
      revealed: "Les cachots disent ce que l'école taisait : la menace est organisée, et elle veut. Des gens choisissent cela. Plus bas que les Mangemorts masqués, quelque chose se reconstitue — et chaque pas vers le ventre de pierre rapproche de la source qui les nourrit.",
    },
  },
  {
    id: 'profondeurs_oubliees', category: 'lieux', icon: '🕳️', act: 3,
    title: 'Les Profondeurs Oubliées',
    links: ['cachots_poudlard', 'ruines_anciennes'],
    unlockConditions: [{ type: 'floor', value: 7 }],
    revealedBy: [{ type: 'floor', value: 10 }],
    textVersions: {
      veiled: "Plus de murs taillés : de la roche brute, des lacs souterrains, le noir. On a quitté Poudlard. On entre dans ce que l'école a enfoui plutôt qu'effacé.",
      revealed: "Il existe des strates antérieures et inférieures à l'école. Le Veilleur du Seuil interdit le passage : première graine des Ruines, première preuve que descendre, c'est remonter le temps. Au fond attend la source.",
    },
  },

  // ── 📖 Glossaire — termes de lore (robinet étage / victoire, Lot 4) ──
  {
    id: 'echos_temporels', category: 'glossaire', icon: '🕰️', act: 4,
    title: 'Les Échos temporels',
    links: ['echo_scellement', 'ruines_anciennes'],
    unlockConditions: [{ type: 'floor', value: 12 }],
    revealedBy: [{ type: 'floor', value: 14 }],
    // Surcouche corrompue zone D : en Ruines Anciennes (14+) ET une fois la
    // scène pleine traversée (Set `seenEchoes` via robinet `echo`). Additif —
    // sans la scène, l'entrée reste `revealed`.
    corruptedBy: [{ type: 'floor', value: 14 }, { type: 'echo', value: 'echo_scene_sceau' }],
    textVersions: {
      veiled: "Plus bas, le temps cesse de couler droit. Un murmure d'abord, puis une silhouette, puis une scène entière qui se rejoue : le lieu se souvient à voix haute.",
      revealed: "Les échos ne sont pas des fantômes : ce sont des fragments de passé que la pierre, trop ancienne pour distinguer jadis de maintenant, laisse remonter. Vecteur du lore des Fondateurs sans qu'aucun d'eux soit vivant — la mémoire gravée qui parle quand plus personne ne peut témoigner.",
      corrupted: "Tu ne perçois plus les échos : ce sont eux qui te perçoivent. À force de traverser leurs scènes, c'est toi qui es devenu le passage — la pierre rejoue ta propre descente parmi celles des Fondateurs, sans plus savoir laquelle fut la première. La mémoire gravée a cessé de distinguer celui qui regarde de ce qui est regardé.",
    },
  },
  {
    id: 'tenebreux', category: 'glossaire', icon: '👁️', act: 4,
    title: 'Les Ténébreux',
    links: ['boucle_tenebreuse'],
    unlockConditions: [{ type: 'victory' }],
    revealedBy: [{ type: 'floor', value: 18 }],
    textVersions: {
      veiled: "Après la victoire, les créatures reviennent changées : un préfixe sombre, une lueur plus froide. On les appelle les Ténébreux.",
      revealed: "Le Ténébreux n'est pas un monstre neuf : c'est l'ancien, repassé par la Boucle. Les boss qui gardaient la route (étages 8-10) reviennent plus profond (18-20), nourris de la faille qu'on a rouverte. La corruption ne crée pas — elle reprend, et aggrave.",
    },
  },
  // « Ce qui dort » personnifié (Phase 3, item 2b — arbitrage 2026-06-19).
  // Entité nommée du fond de l'Avant-Monde (étages 21+) : le battement
  // organique de la zone D devient une présence. Pas un boss (scope art) —
  // une vérité de lore. Robinet 3-temps : rumeur post-victoire (veiled) →
  // arrivée à l'Avant-Monde 21+ (revealed) → abîme profond 28+ (corrupted).
  {
    id: 'le_dormeur', category: 'glossaire', icon: '💤', act: 4,
    title: 'Le Dormeur des Fondations',
    links: ['ruines_anciennes', 'boucle_tenebreuse', 'cle_de_voute', 'maitre_detraqueur'],
    unlockConditions: [{ type: 'victory' }],
    revealedBy: [{ type: 'floor', value: 21 }],
    corruptedBy: [{ type: 'floor', value: 28 }],
    textVersions: {
      veiled: "Plus bas que les runes, sous la roche-mère, quelque chose respire. On le nomme à voix basse, comme on nomme une chose qu'on préférerait ne pas réveiller : le Dormeur des Fondations. Ce n'est pas Voldemort, ni une bête, ni un Fondateur. C'est ce que les Quatre tinrent clos — la peur d'avant l'école, faite battement.",
      revealed: "Tu l'as atteint, le fond de l'Avant-Monde, et le battement n'est plus un bruit : c'est une poitrine. Le Dormeur n'a pas de visage parce qu'il est antérieur aux visages — antérieur à l'écriture, à la pierre taillée, aux noms. Il ne veut rien : il dort, et son sommeil EST la magie brute qui irradie ici. La Clé de Voûte ne le scellait pas pour l'emprisonner. Elle le berçait — pour qu'il ne s'éveille jamais. Chaque pas plus bas est un pas sur ce qui rêve le monde.",
      corrupted: "Tu ne descends plus vers le Dormeur : tu descends EN lui. Le battement a cessé d'être sous tes pieds — il est dans ta poitrine, calé sur le sien. Le lieu ne te distingue plus de ce qu'il rêve. Peut-être n'as-tu jamais exploré l'Avant-Monde ; peut-être es-tu l'un de ses songes, qui se croit en train de marcher. Le prestige t'a mené là où veiller et dormir n'ont plus de bord.",
    },
  },
  // Mondes Parallèles → Glossaire (décision : pas de 8ᵉ onglet « Voyageur »).
  // Robinet `floor` = proxy du sort Cheminette (niv. 8, ~étage 8).
  {
    id: 'cheminette_inter_mondes', category: 'glossaire', icon: '🔥', act: 3,
    title: 'La Cheminette Inter-Mondes',
    links: ['voyageur', 'mondes_paralleles'],
    unlockConditions: [{ type: 'floor', value: 8 }],
    revealedBy: [{ type: 'floor', value: 14 }],
    textVersions: {
      veiled: "Une veine de cendre verte court dans la pierre, plus ancienne que les cheminées. Le sort qui la réveille te projette, en projection astrale, dans le donjon d'un autre monde.",
      revealed: "Chaque sauvegarde est un plan : un Poudlard-reflet où la même fêlure se joue autrement. La Cheminette ne te fait pas avancer — elle te fait traverser. Tu deviens Voyageur, marcheur entre les mondes, et ce que tu y gagnes (l'Essence d'Outremonde, « la peur d'un autre monde cristallisée ») ne sert qu'à ceux qui acceptent que leur descente n'est pas la seule.",
    },
  },
  {
    id: 'voyageur', category: 'glossaire', icon: '🧭', act: 3,
    title: 'Le Voyageur',
    links: ['cheminette_inter_mondes', 'mondes_paralleles'],
    unlockConditions: [{ type: 'floor', value: 8 }],
    textVersions: {
      veiled: "Le rôle qu'endosse tout héros maîtrisant la Cheminette : marcher entre les plans en projection astrale, hôte d'un monde et visiteur d'un autre. On n'avance pas en Voyageur — on traverse.",
    },
  },
  {
    id: 'mondes_paralleles', category: 'glossaire', icon: '🌐', act: 3,
    title: 'Les Mondes Parallèles',
    links: ['cheminette_inter_mondes', 'voyageur'],
    unlockConditions: [{ type: 'floor', value: 8 }],
    textVersions: {
      veiled: "Les Poudlard-reflets : chaque partie sauvegardée est un plan distinct, où la même Clé s'est fêlée. On peut les visiter — latéralement, sans avancer dans sa propre descente.",
    },
  },

  // ── 👤 Personnages & Maisons (robinet étage/quête/écho, Lot 5) ──
  {
    id: 'les_fondateurs', category: 'personnages', icon: '🏛️', act: 1,
    title: 'Les Quatre Fondateurs',
    links: ['cle_de_voute', 'echo_scellement', 'echo_salazar'],
    unlockConditions: [{ type: 'floor', value: 1 }],
    revealedBy: [{ type: 'eclat', value: 3 }],
    textVersions: {
      veiled: "Godric, Salazar, Rowena, Helga : les quatre noms gravés au fronton de l'école. On les apprend dès le premier cours, comme une formule qu'on ne questionne pas.",
      revealed: "Les Fondateurs ne furent pas seulement des bâtisseurs : ils furent des geôliers. Pour sceller ce qui dormait sous la colline, chacun dut y mettre une part de lui-même — son courage, sa faute, son savoir, son refuge. Quatre tempéraments, un seul verrou. Comprendre Poudlard, c'est comprendre qu'une école fut posée comme un couvercle sur une peur qu'ils n'ont pas su tuer, seulement tenir.",
    },
  },
  {
    id: 'dumbledore', category: 'personnages', icon: '🧙', act: 1,
    title: 'Albus Dumbledore',
    links: ['cle_de_voute'],
    unlockConditions: [{ type: 'floor', value: 1 }],
    revealedBy: [{ type: 'victory' }],
    textVersions: {
      veiled: "Le portrait qui t'a appelé. Sa voix t'a guidé vers le donjon, sa main invisible ouvre les épreuves. Mort, il guide encore — et il en sait plus qu'il n'en dit.",
      revealed: "Maintenant que l'Ombre du haut est tombée, tu comprends ce que le portrait taisait : il savait. Il savait que vaincre Voldemort n'achèverait rien — que forcer la serrure du haut ouvrirait celle du bas. Il ne t'a pas menti ; il t'a laissé descendre une marche à la fois, parce qu'on ne porte pas d'un coup le poids de toute la vérité. Sa voix te guidait moins vers une victoire que vers le courage d'en regarder le revers.",
    },
  },
  {
    id: 'echo_salazar', category: 'personnages', icon: '🐍', act: 2,
    title: "L'Écho de Salazar",
    links: ['les_fondateurs', 'voix_salazar'],
    unlockConditions: [{ type: 'floor', value: 4 }],
    revealedBy: [{ type: 'echo', value: 'echo_salazar' }],
    textVersions: {
      veiled: "Dans les cachots, une voix qui n'appartient à aucun vivant. Elle connaît ton nom, tes tentations, et le chemin le plus court vers le pouvoir. Elle se présente comme un ami.",
      revealed: "L'écho est Salazar Serpentard — non pas un fantôme, mais une part de lui qu'il a scellée avec la corruption qu'il aida à enfermer. Voilà le secret des Fondateurs : pour fermer le verrou, chacun a dû y mettre une part de soi-même, sa plus laide. La tentation que tu entends n'est pas un démon — c'est un miroir. Salazar n'a pas vaincu sa voix. Il a juste refusé de lui obéir.",
    },
    variants: { house: { Serpentard: "Il te parle comme à un héritier. Ce n'est pas un piège : c'est une passation. À toi de décider ce que tu fais de ce que tu reconnais en lui." } },
  },
  {
    id: 'manon', category: 'personnages', icon: '❄️', act: 2,
    title: 'Manon',
    links: ['grimoire_elara'],
    unlockConditions: [{ type: 'floor', value: 4 }],
    revealedBy: [{ type: 'quest', value: 'manon_grimoire' }],
    textVersions: {
      veiled: "Une élève rencontrée dans la descente, le regard hanté par un deuil de givre. Elle cherche les pages dispersées du grimoire de sa mère, Élara — comme si les reconstituer pouvait réchauffer quelque chose.",
      revealed: "Les pages rendues, le givre de son regard cède d'un degré. Tu comprends alors ce que Manon cherchait vraiment : non pas un livre, mais la permission d'arrêter d'avoir froid. Le grimoire d'Élara ne gardait aucun sort de chaleur — seulement la mémoire d'une chaleur d'avant le deuil. En l'aidant, tu n'as pas réchauffé le monde : tu lui as rendu le droit de se souvenir qu'il a déjà été chaud.",
    },
  },
  // Boss promus en personnages (P4, ch.06 §6.6) : vu en combat → veiled ;
  // vaincu → revealed (robinet `monster`, comme reflet_mythe).
  {
    id: 'maitre_detraqueur', category: 'personnages', icon: '👁️', act: 3,
    title: 'Le Maître des Détraqueurs',
    links: ['les_fondateurs', 'boucle_tenebreuse'],
    unlockConditions: [{ type: 'monster', value: 'maitre_detraqueur' }],
    revealedBy: [{ type: 'monster', value: 'maitre_detraqueur', kills: 1 }],
    textVersions: {
      veiled: "Plus vieux et plus avide que ses subordonnés, il ne se rue jamais : il s'attarde, savoure, et glisse une voix sans bouche dans ton esprit. Là où les autres Détraqueurs sont des bêtes de froid, lui semble penser.",
      revealed: "Le Maître n'est pas un monstre de plus : il est l'incarnation de la peur-sceau. Les Fondateurs n'ont pas tué ce qui dormait sous la colline — ils l'ont tenu par la peur, et cette peur a fini par prendre forme et capuchon. Il ne prend pas la vie : il prend ce qui la rendait belle, un souvenir à la fois, pour entretenir le froid qui maintient le verrou. L'abattre n'éteint pas la peur — cela rappelle seulement qu'on peut la regarder en face.",
    },
  },
  {
    id: 'heraut_tenebres', category: 'personnages', icon: '📯', act: 3,
    title: 'Le Héraut des Ténèbres',
    links: ['boucle_tenebreuse', 'cle_de_voute'],
    unlockConditions: [{ type: 'monster', value: 'heraut_tenebres' }],
    revealedBy: [{ type: 'monster', value: 'heraut_tenebres', kills: 1 }],
    textVersions: {
      veiled: "Nul n'a jamais vu son visage sous le capuchon. Il ne combat pas pour vaincre : son cor d'os sonne une annonce, et sa seule présence corrompt l'air. Un messager, pas un soldat.",
      revealed: "Le Héraut est la charnière. Il n'annonce pas la fin mais le seuil : ce qui vient avant la Boucle Ténébreuse. Sa litanie dit la vérité que le château refuse — qu'aucune victoire n'est définitive tant que la faille du bas reste ouverte. Le terrasser ne ferme rien : cela sonne le prochain tour, plus bas, toujours. Comprendre le Héraut, c'est comprendre pourquoi la descente recommence.",
    },
  },

  // ── ⚜️ Objets & Artefacts (robinet item/palier, Lot 5) ──
  {
    id: 'sword_gryff', category: 'objets', icon: '⚔️', act: 4,
    iconImg: 'img/icons_new/sword_gryff_64.png',
    title: "L'Épée de Gryffondor",
    links: ['les_fondateurs'],
    unlockConditions: [{ type: 'item', value: 'sword_gryff' }],
    revealedBy: [{ type: 'eclat', value: 3 }],
    textVersions: {
      veiled: "Lame gobeline sertie de rubis, qui ne se présente qu'au vrai courage. Récompense de l'identité Gryffondor menée à son terme.",
      revealed: "Forgée par Ragnuk, elle n'absorbe que ce qui la rend plus forte. Sa vraie nature n'est pas de trancher : c'est de répondre — elle ne vient qu'à la main qui a déjà choisi de tenir la porte, comme Godric devant le sceau. Une arme qui exige d'être méritée avant d'être tirée.",
    },
    variants: { house: { Gryffondor: "Elle ne pèse rien dans ta main : elle te reconnaît. Ce que Godric a tenu, tu le tiens à ton tour." } },
  },
  {
    id: 'locket_slytherin', category: 'objets', icon: '🐍', act: 4,
    iconImg: 'img/icons_new/locket_slytherin_64.png',
    title: 'Le Médaillon de Serpentard',
    links: ['echo_salazar'],
    unlockConditions: [{ type: 'item', value: 'locket_slytherin' }],
    textVersions: {
      veiled: "Reflet du goût du pouvoir : sa puissance se mérite, son ombre se porte. Récompense de l'identité Serpentard menée à son terme.",
    },
    variants: { house: { Serpentard: "Il pèse au cou comme un secret. Salazar te le tend non pour te corrompre, mais pour voir ce que tu en feras." } },
  },
  {
    id: 'diademe_serdaigle', category: 'objets', icon: '👑', act: 4,
    iconImg: 'img/icons_new/diademe_serdaigle_64.png',
    title: 'Le Diadème de Serdaigle',
    links: ['voix_rowena'],
    unlockConditions: [{ type: 'item', value: 'diademe_serdaigle' }],
    textVersions: {
      veiled: "Couronne du savoir ; elle aiguise la magie de qui l'a gagnée par l'esprit. Récompense de l'identité Serdaigle menée à son terme.",
    },
    variants: { house: { Serdaigle: "Posé sur le front, il ne donne pas de réponses : il rend les questions plus nettes. C'est tout ce que Rowena a jamais promis." } },
  },
  {
    id: 'coupe_poufsouffle', category: 'objets', icon: '🏆', act: 4,
    iconImg: 'img/icons_new/coupe_poufsouffle_64.png',
    title: 'La Coupe de Poufsouffle',
    links: ['voix_helga'],
    unlockConditions: [{ type: 'item', value: 'coupe_poufsouffle' }],
    textVersions: {
      veiled: "Calice de la loyauté ; il protège qui protège les autres. Récompense de l'identité Poufsouffle menée à son terme.",
    },
    variants: { house: { Poufsouffle: "Il ne brille que pour ceux qui n'ont jamais brillé seuls. Helga l'a voulu ainsi : un trophée qui récompense d'avoir porté les autres." } },
  },
  {
    id: 'larmes_phenix', category: 'objets', icon: '🔥', act: 2,
    iconImg: 'img/icons_new/larmes_phenix_64.png',
    title: 'Les Larmes de Fumseck',
    links: ['dumbledore'],
    unlockConditions: [{ type: 'item', value: 'larmes_phenix' }],
    textVersions: {
      veiled: "Pleurs du phénix de Dumbledore, données en récompense par Fumseck lui-même. Une amulette tiède qui referme les plaies à chaque souffle du combat — la consolation, faite objet.",
    },
  },
  {
    id: 'grimoire_elara', category: 'objets', icon: '📓', act: 2,
    title: "Le Grimoire d'Élara",
    links: ['manon'],
    unlockConditions: [{ type: 'floor', value: 5 }],
    revealedBy: [{ type: 'floor', value: 9 }],
    textVersions: {
      veiled: "Un carnet de givre et de deuil, dont les pages se sont dispersées dans la descente. Manon les cherche : sa mère, Élara, y avait consigné quelque chose qu'elle ne se résout pas à perdre.",
      revealed: "Reconstitué, le grimoire révèle ce que le deuil cachait : sous le givre des dernières pages, une joie. Élara n'écrivait pas pour conjurer le froid — elle écrivait pour que sa fille se souvienne de la chaleur d'avant. Rendre les pages à Manon, c'est lui rendre non pas une mère, mais le droit de ne plus seulement avoir froid.",
    },
  },

  // ── Variantes Premium des Maisons (P2) — reliques de prestige remises au
  //    terme de la Quête Signature. Révélées par l'écho du Fondateur. ──
  {
    id: 'orbe_runique_premium_gryff', category: 'objets', icon: '🔮', act: 4,
    iconImg: 'img/icons_new/orbe_runique_premium_gryff_64.png',
    title: "L'Orbe Runique de Godric",
    links: ['les_fondateurs'],
    unlockConditions: [{ type: 'item', value: 'orbe_runique_premium_gryff' }],
    revealedBy: [{ type: 'echo', value: 'echo_godric' }],
    textVersions: {
      veiled: "Une sphère runique nimbée d'or, remise à qui a mené l'identité Gryffondor à son terme. Les runes y brûlent d'une chaleur qui ne consume que l'ennemi.",
      revealed: "Ce n'est pas l'orbe qui choisit l'élément : c'est le porteur. Godric ne cherchait pas la maîtrise d'un feu, mais le courage de canaliser tous les feux à la fois. La version dorée n'ajoute pas de puissance — elle ajoute la confiance de s'en servir.",
    },
    variants: { house: { Gryffondor: "L'or de l'orbe répond à ton sang : il s'allume avant même que tu n'aies visé." } },
  },
  {
    id: 'masque_rituel_premium_slyth', category: 'objets', icon: '🎭', act: 4,
    iconImg: 'img/icons_new/masque_rituel_premium_slyth_64.png',
    title: 'Le Masque Rituel de Salazar',
    links: ['les_fondateurs'],
    unlockConditions: [{ type: 'item', value: 'masque_rituel_premium_slyth' }],
    revealedBy: [{ type: 'echo', value: 'echo_salazar' }],
    textVersions: {
      veiled: "Obsidienne veinée d'émeraude, ce masque exige un prix — un peu de vitalité — pour décupler la frappe des sorts. Salazar n'a jamais offert de pouvoir sans contrepartie.",
      revealed: "Le masque ne cache pas le visage : il révèle l'ambition. Ce qu'il retire en PV, il le rend en certitude — celui qui le porte accepte de saigner un peu pour frapper beaucoup. C'est tout Salazar : le calcul du risque, érigé en relique.",
    },
    variants: { house: { Serpentard: "Le masque épouse tes traits comme s'il avait toujours su que tu viendrais le chercher." } },
  },
  {
    id: 'baton_ancestral_premium_serd', category: 'objets', icon: '🌳', act: 4,
    iconImg: 'img/icons_new/baton_ancestral_premium_serd_64.png',
    title: 'Le Bâton Ancestral de Rowena',
    links: ['les_fondateurs'],
    unlockConditions: [{ type: 'item', value: 'baton_ancestral_premium_serd' }],
    revealedBy: [{ type: 'echo', value: 'echo_rowena' }],
    textVersions: {
      veiled: "Un bâton de bois ancien aux runes bleues, dont chaque nœud consigne un théorème oublié. Le savoir, fait arme — et la frappe critique des sorts, aiguisée à l'extrême.",
      revealed: "Rowena disait qu'un sort n'est jamais qu'une idée suffisamment précise. Le bâton ne lance pas mieux : il pense mieux. Ce qu'il ajoute aux dégâts critiques, il le prend à l'approximation — il ne récompense que l'intention exacte.",
    },
    variants: { house: { Serdaigle: "Les runes s'éclairent à mesure que tu les comprends — le bâton t'enseigne en même temps qu'il t'obéit." } },
  },
  {
    id: 'talisman_fondateurs_premium_pouf', category: 'objets', icon: '📿', act: 4,
    iconImg: 'img/icons_new/talisman_fondateurs_premium_pouf_64.png',
    title: 'Le Talisman de Helga',
    links: ['les_fondateurs'],
    unlockConditions: [{ type: 'item', value: 'talisman_fondateurs_premium_pouf' }],
    revealedBy: [{ type: 'echo', value: 'echo_helga' }],
    textVersions: {
      veiled: "Terre cuite et or doux, ce talisman rend à chaque tour ce que le combat prend — un souffle de vie et de magie, sans jamais faillir.",
      revealed: "Helga n'a jamais cru aux armes. Sa relique ne frappe pas : elle tient. Là où les autres Fondateurs ont gravé la puissance, elle a gravé la constance — celle qui ramène les siens debout, tour après tour, parce que personne n'est laissé derrière.",
    },
    variants: { house: { Poufsouffle: "Le talisman bat au rythme de ton cœur — calme, régulier, têtu. Comme toi." } },
  },

  // Méta-objectif cosmétique (§1.1/§3) : réunir les 3 Reliques de la Mort —
  // la Baguette de Sureau (wand2), la Cape d'Invisibilité (cape_invis) et la
  // Pierre de Résurrection (anneau_resurrection). Zéro stat ajoutée ; l'entrée
  // se déverrouille quand les trois sont possédées.
  {
    id: 'reliques_de_la_mort', category: 'objets', icon: '☠️', act: 4,
    title: 'Les Reliques de la Mort',
    links: ['les_fondateurs'],
    unlockConditions: [{ type: 'allItems', value: ['wand2', 'cape_invis', 'anneau_resurrection'] }],
    textVersions: {
      veiled: "Trois objets qu'aucune légende ne réunit jamais sans prix : une baguette qui ne perd pas, une cape qui ne trahit pas, une pierre qui rappelle les morts. Les posséder toutes, dit-on, fait de toi le Maître de la Mort.",
    },
  },

  // Méta-objectif (§1.4 C / §1.8) : réunir les 4 reliques vocales (Murmures),
  // octroyées en voyant chaque écho de Fondateur en Boucle. Cosmétique.
  {
    id: 'choeur_des_fondateurs', category: 'objets', icon: '🗣️', act: 4,
    title: 'Le Chœur des Fondateurs',
    links: ['echo_scellement', 'voix_godric', 'voix_salazar', 'voix_rowena', 'voix_helga'],
    unlockConditions: [{ type: 'allItems', value: ['voix_godric_relique', 'voix_salazar_relique', 'voix_rowena_relique', 'voix_helga_relique'] }],
    textVersions: {
      veiled: "Quatre Murmures recueillis au fil des Boucles — Godric, Salazar, Rowena, Helga. Réunis sur un même sorcier, ils ne forment plus quatre voix mais une seule : le Chœur qui scella jadis la Voûte. Tenir, douter, comprendre, abriter — les quatre faces d'un même courage.",
    },
  },

];

// ── Helpers PURS ─────────────────────────────────────────────

// Retourne l'entrée d'id donné, ou null.
function getCodexEntry(id) {
  if (!id) return null;
  for (let i = 0; i < CODEX_ENTRIES.length; i++) {
    if (CODEX_ENTRIES[i].id === id) return CODEX_ENTRIES[i];
  }
  return null;
}

// Vrai si une condition unique est satisfaite par le contexte `ctx`.
// Tolérant : un ctx incomplet (champ absent) ne throw jamais.
function _codexCondMet(cond, ctx) {
  if (!cond || !ctx) return false;
  switch (cond.type) {
    case 'floor':
      return typeof ctx.floorReached === 'number' && ctx.floorReached >= cond.value;
    case 'eclat':
      return typeof ctx.eclatProgress === 'number' && ctx.eclatProgress >= cond.value;
    case 'quest':
      return !!(ctx.questsDone && ctx.questsDone.has && ctx.questsDone.has(cond.value));
    case 'monster': {
      const seen = !!(ctx.seenMonsters && ctx.seenMonsters.has && ctx.seenMonsters.has(cond.value));
      if (!seen) return false;
      if (!cond.kills) return true;
      const k = (ctx.monsterKills && ctx.monsterKills[cond.value]) || 0;
      return k >= cond.kills;
    }
    case 'riddle':
      return !!(ctx.riddlesSolved && ctx.riddlesSolved.has && ctx.riddlesSolved.has(cond.value));
    case 'echo':
      return !!(ctx.echoSeen && ctx.echoSeen.has && ctx.echoSeen.has(cond.value));
    case 'item':
      return !!(ctx.itemsOwned && ctx.itemsOwned.has && ctx.itemsOwned.has(cond.value));
    case 'allItems':   // méta-objectif : TOUS les ids possédés (ET intra-condition)
      return Array.isArray(cond.value) && !!(ctx.itemsOwned && ctx.itemsOwned.has)
             && cond.value.every(id => ctx.itemsOwned.has(id));
    case 'house':
      return ctx.chosenHouse === cond.value;
    case 'victory':
      return ctx.victoryAchieved === true;
    case 'eclatLoop':
      return typeof ctx.accumulatedEclats === 'number' && ctx.accumulatedEclats >= cond.value;
    case 'cycleBroken':
      return ctx.cycleBroken === true;
    case 'ending':
      return ctx.endingType === cond.value;
    default:
      return false;
  }
}

// OU logique : ≥ 1 condition satisfaite.
function _codexAnyMet(conds, ctx) {
  if (!Array.isArray(conds) || !conds.length) return false;
  for (let i = 0; i < conds.length; i++) {
    if (_codexCondMet(conds[i], ctx)) return true;
  }
  return false;
}

// ET logique : toutes satisfaites (vide/absent → false : pas de révélation
// sans déclencheur explicite).
function _codexAllMet(conds, ctx) {
  if (!Array.isArray(conds) || !conds.length) return false;
  for (let i = 0; i < conds.length; i++) {
    if (!_codexCondMet(conds[i], ctx)) return false;
  }
  return true;
}

// État courant d'une entrée selon le contexte :
//   'locked'    — aucune unlockCondition remplie
//   'veiled'    — ouverte, mais pas révélée
//   'revealed'  — revealedBy (ET) satisfait + texte revealed présent
//   'corrupted' — surcouche d'endgame : revealed + corruptedBy (ET) + texte corrupted
function codexEntryState(entry, ctx) {
  if (!entry) return 'locked';
  if (!_codexAnyMet(entry.unlockConditions, ctx)) return 'locked';

  const tv = entry.textVersions || {};
  const revealed = _codexAllMet(entry.revealedBy, ctx) && typeof tv.revealed === 'string';
  if (revealed) {
    if (_codexAllMet(entry.corruptedBy, ctx) && typeof tv.corrupted === 'string') {
      return 'corrupted';
    }
    return 'revealed';
  }
  return 'veiled';
}

// Liste filtrée des entrées au moins ouvertes (≠ 'locked'), chacune
// accompagnée de son état résolu. Tri stable par acte puis ordre du registre.
function unlockedCodexFor(ctx) {
  const out = [];
  for (let i = 0; i < CODEX_ENTRIES.length; i++) {
    const e = CODEX_ENTRIES[i];
    const state = codexEntryState(e, ctx);
    if (state !== 'locked') out.push({ entry: e, state });
  }
  return out;
}

// Note marginale de variante (cosmétique, défensif). Renvoie la note de la
// Maison choisie si présente, sinon la première note de héros présente parmi
// `heroKeys`, sinon null. N'altère JAMAIS le corps de l'entrée (§12.5.1).
function codexVariantNote(entry, house, heroKeys) {
  if (!entry || !entry.variants) return null;
  const v = entry.variants;
  if (house && v.house && typeof v.house[house] === 'string') return v.house[house];
  if (v.hero && Array.isArray(heroKeys)) {
    for (let i = 0; i < heroKeys.length; i++) {
      if (typeof v.hero[heroKeys[i]] === 'string') return v.hero[heroKeys[i]];
    }
  }
  return null;
}

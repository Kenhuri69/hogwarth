// ============================================================
// DONNÉES — PERSONNAGES JOUABLES (CHARACTERS)
// (extrait de data.js — Lot A P3.3, pur couper-coller)
// ============================================================

// ============================================================
// DONNÉES DU JEU
// ============================================================
const CHARACTERS = {
  harry: { name:"Harry Potter", icon:"🧙", class:"Élève de Gryffondor",
    imgSrc:"img/harry.png", role:"Auror",
    hp:35, sp:22, str:9, int:11, agi:12, end:10, lck:15, mag:10,
    atk:5, def:2,
    wand:"Baguette de Houx", armor:"Robe de Gryffondor", acc:"Lunettes Rondes",
    spells:["Expelliarmus","Stupefix","Episkey","Protego","Incendio"],
    tagline:"Le Survivant — courage et instinct."
  },
  hermione: { name:"Hermione Granger", icon:"🧙‍♀️", class:"Élève de Gryffondor",
    imgSrc:"img/hermione.png", role:"Mage",
    hp:28, sp:35, str:6, int:17, agi:10, end:7, lck:12, mag:16,
    atk:3, def:2,
    wand:"Baguette de Vigne", armor:"Robe de Gryffondor", acc:"",
    spells:["Episkey","Protego","Incendio","Accio"],
    tagline:"Brillante érudite — la magie par le savoir."
  },
  draco: { name:"Drago Malefoy", icon:"🐍", class:"Élève de Serpentard",
    imgSrc:"img/draco.png", role:"Duelliste",
    hp:29, sp:30, str:7, int:13, agi:13, end:8, lck:14, mag:14,
    atk:4, def:2,
    wand:"Baguette d'Aubépine", armor:"Robe de Serpentard", acc:"Insigne de Préfet",
    spells:["Expelliarmus","Stupefix","Protego","Episkey"],
    tagline:"Sang-pur ambitieux — la fierté avant tout."
  },
  cho: { name:"Cho Chang", icon:"🦅", class:"Élève de Serdaigle",
    imgSrc:"img/cho.png", role:"Attrapeuse",
    hp:30, sp:30, str:6, int:14, agi:15, end:8, lck:13, mag:14,
    atk:4, def:2,
    wand:"Baguette de Frêne", armor:"Robe de Serdaigle", acc:"Vif d'Or",
    spells:["Expelliarmus","Stupefix","Protego","Episkey"],
    tagline:"Attrapeuse de Serdaigle — vive et perspicace."
  },
  cedric: { name:"Cedric Diggory", icon:"🦡", class:"Élève de Poufsouffle",
    imgSrc:"img/cedric.png", role:"Champion",
    hp:34, sp:26, str:9, int:12, agi:13, end:11, lck:13, mag:12,
    atk:5, def:2,
    wand:"Baguette de Frêne et Licorne", armor:"Robe de Poufsouffle", acc:"Insigne de Capitaine",
    spells:["Expelliarmus","Stupefix","Protego","Episkey"],
    tagline:"Champion de Poufsouffle — loyal et valeureux."
  },
  // ── Personnages originaux ─────────────────────────────────
  celeste: { name:"Céleste Luneclair", icon:"🌙", class:"Élève de Serdaigle",
    imgSrc:"img/celeste.png", role:"Astromage",
    hp:30, sp:34, str:6, int:15, agi:11, end:8, lck:14, mag:15,
    atk:3, def:2,
    wand:"Baguette de Bouleau d'Argent", armor:"Robe de Serdaigle", acc:"Pendentif Lunaire",
    spells:["Episkey","Protego","Lumos Maxima","Aguamenti"],
    tagline:"Astromage de Serdaigle — la lune guide ses sortilèges."
  },
  iris: { name:"Iris Prismara", icon:"✨", class:"Élève de Poufsouffle",
    imgSrc:"img/iris.png", role:"Enchanteresse",
    hp:32, sp:28, str:7, int:13, agi:14, end:9, lck:18, mag:13,
    atk:4, def:2,
    wand:"Baguette de Cristal d'Iris", armor:"Robe de Poufsouffle", acc:"Prisme d'Arc-en-ciel",
    spells:["Expelliarmus","Protego","Incendio","Riddikulus"],
    tagline:"Enchanteresse prismatique — la chance et la lumière à ses côtés."
  },
  maxence: { name:"Maxence Ravenwood", icon:"🐍", class:"Élève de Serpentard",
    imgSrc:"img/maxence.png", role:"Mage de Sang",
    hp:26, sp:32, str:5, int:14, agi:11, end:7, lck:11, mag:14,
    atk:4, def:1,
    wand:"Baguette d'If Noueux", armor:"Robe de Serpentard", acc:"Médaillon de Sang",
    spells:["Episkey","Protego","Sanguini","Stupefix"],
    tagline:"Sorcier-vampire — son sang répond au sang."
  },
  anastasia: { name:"Anastasia Moonveil", icon:"🌙", class:"Élève de Gryffondor",
    imgSrc:"img/anastasia.png", role:"Mage de la Lune",
    hp:30, sp:32, str:7, int:16, agi:11, end:8, lck:13, mag:15,
    atk:4, def:2,
    wand:"Baguette de Bois de Lune", armor:"Robe de Gryffondor", acc:"Lunettes de Lune",
    spells:["Episkey","Protego","Wingardium Leviosa","Lumos Maxima"],
    tagline:"Magicienne studieuse — la magie au clair de lune."
  },
  louis: { name:"Louis Dragonflamme", icon:"🐉", class:"Élève de Poufsouffle",
    imgSrc:"img/louis.png", role:"Dompteur de Dragons",
    hp:33, sp:26, str:8, int:12, agi:11, end:10, lck:13, mag:12,
    atk:5, def:2,
    wand:"Baguette d'Acacia", armor:"Robe de Poufsouffle", acc:"Brassard d'Écailles",
    spells:["Expelliarmus","Protego","Incendio","Episkey"],
    tagline:"Dompteur de dragons — sa baguette pulse au rythme du feu."
  },
  jeanne: { name:"Jeanne d'Argenciel", icon:"🪄", class:"Élève de Gryffondor",
    imgSrc:"img/jeanne.png", role:"Charmeuse de Sortilèges",
    hp:31, sp:30, str:7, int:15, agi:13, end:9, lck:14, mag:14,
    atk:4, def:2,
    wand:"Baguette d'Étoile", armor:"Robe de Gryffondor", acc:"Grimoire de Sortilèges",
    spells:["Wingardium Leviosa","Protego","Episkey","Lumos Maxima"],
    tagline:"Petite Gryffondor espiègle — ses sortilèges chantent comme des étoiles."
  },
  margaux: { name:"Margaux Aiglebrume", icon:"⭐", class:"Élève de Serdaigle",
    imgSrc:"img/margaux.png", role:"Astromancienne",
    hp:28, sp:33, str:5, int:16, agi:13, end:7, lck:16, mag:14,
    atk:3, def:2,
    wand:"Baguette d'Aulne Étoilé", armor:"Robe de Serdaigle", acc:"Grimoire des Enchantements",
    spells:["Protego","Episkey","Lumos Maxima","Wingardium Leviosa"],
    tagline:"Petite astromancienne de Serdaigle — son grimoire scintille d'étincelles d'étoiles."
  },
  // ── La Garde de l'Aube ────────────────────────────────────
  agathe: { name:"Agathe Lumiflore", icon:"🌸", class:"Élève de Gryffondor",
    imgSrc:"img/agathe.png", role:"Enchanteresse florale",
    hp:31, sp:32, str:6, int:14, agi:11, end:11, lck:13, mag:14,
    atk:3, def:3,
    wand:"Baguette de Cerisier en Fleur", armor:"Robe de Gryffondor", acc:"Couronne de Fleurs",
    spells:["Episkey","Ferula","Wingardium Leviosa","Protego"],
    tagline:"Enchanteresse florale — la vie s'épanouit sous ses sortilèges."
  },
  olivier: { name:"Olivier de Clairval", icon:"🔥", class:"Élève de Serdaigle",
    imgSrc:"img/olivier.png", role:"Mage de combat",
    hp:29, sp:33, str:7, int:15, agi:12, end:8, lck:12, mag:15,
    atk:4, def:2,
    wand:"Baguette de Chêne Ardent", armor:"Robe de Serdaigle", acc:"Plume d'Aigle",
    spells:["Incendio","Stupefix","Protego","Episkey"],
    tagline:"Mage de combat — chaque sortilège frappe comme la foudre."
  },
  nathalie: { name:"Nathalie Finch", icon:"🌻", class:"Élève de Poufsouffle",
    imgSrc:"img/nathalie.png", role:"Gardienne-Herboriste",
    hp:36, sp:24, str:9, int:12, agi:9, end:13, lck:12, mag:11,
    atk:5, def:4,
    wand:"Baguette de Chêne Noueux", armor:"Robe de Poufsouffle", acc:"Besace d'Herboriste",
    spells:["Episkey","Protego","Ferula","Incendio"],
    tagline:"Gardienne-herboriste — un rempart patient pour les siens."
  },
  chatillon: { name:"Olivier De Châtillon", icon:"🌑", class:"Élève de Serpentard",
    imgSrc:"img/chatillon.png", role:"Ombremancien",
    hp:27, sp:34, str:5, int:16, agi:13, end:7, lck:12, mag:16,
    atk:3, def:2,
    wand:"Baguette d'Ébène", armor:"Robe de Serpentard", acc:"Camée d'Ombre",
    spells:["Expelliarmus","Stupefix","Protego","Incendio"],
    tagline:"Ombremancien de Serpentard — la ruse frappe avant la lumière."
  }
};

// Les ennemis sont définis dans js/monsters.js (MONSTERS)


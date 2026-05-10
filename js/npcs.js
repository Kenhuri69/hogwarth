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
//   placement:   { floor: 1, anchor: "first-room" | "any" },
//   questsGiven:    ["quest_id", ...],     // quêtes que ce PNJ propose
//   questsTurnedIn: ["quest_id", ...],     // quêtes que ce PNJ clôt (souvent === questsGiven)
//   dialogues: {
//     greeting:    "1ère rencontre",
//     idle:        "Visites suivantes sans contexte particulier",
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
    questsGiven:    ["intro_tutoriel"],
    questsTurnedIn: ["intro_tutoriel"],
    dialogues: {
      greeting:    "Ah, te voilà enfin ! Bienvenue dans les profondeurs de Poudlard, jeune sorcier. Le château recèle bien des mystères — descends d'un étage pour faire tes premiers pas.",
      idle:        "Le château murmure tes pas. Continue ton exploration.",
      questOffer:  "Avant tout, descends d'un étage. C'est l'épreuve la plus douce que je puisse t'offrir.",
      questActive: "Le grand escalier t'attend. Trouve-le, et tu auras gagné mon respect.",
      questReady:  "Bien joué ! Reviens me voir : tu mérites un encouragement.",
      questDone:   "Tu es désormais lancé sur le chemin. Que la chance t'accompagne."
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
      greeting:    "Par Merlin ! L'infirmerie est saturée et il me manque des Mandragores. Aurais-tu un instant ?",
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
      greeting:    "Snif... Personne ne vient jamais me voir... sauf ce sale Troll qui pollue MES toilettes !",
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
      greeting:    "Oh ! Un visiteur ! Mes Niffleurs se sont... euh... échappés. Encore. Pourrais-tu m'aider à en récupérer trois ?",
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
      greeting:    "Ah, un admirateur ! Approche, approche. As-tu lu mes mémoires ? Non ? Eh bien, j'aurais une petite mission pour toi...",
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
      greeting:    "Bienvenue. Je peux t'enseigner un sort puissant — mais d'abord, tu dois affronter ta peur la plus sombre.",
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
    questsGiven:    ["chouette_perdue"],
    questsTurnedIn: ["chouette_perdue"],
    dialogues: {
      greeting:    "Ah, te v'là ! J'ai perdu une de mes chouettes ensorcelées dans la Forêt. Tu pourrais m'aider à la retrouver ?",
      idle:        "Y'a tant de bestioles à surveiller dans c'te Forêt...",
      questOffer:  "Trouve cette Chouette Ensorcelée et ramène-la moi, j'te r'compenserai bien.",
      questActive: "Toujours pas trouvé ? Fais attention, c'te bestiole sait s'cacher.",
      questReady:  "Tu l'as ! Magnifique ! Tiens, prends c'balai — t'en auras plus besoin que moi.",
      questDone:   "Merci encore. Reviens quand tu veux pour boire un thé !"
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
      greeting:    "Un Gardien du Portail s'est éveillé dans les passages. Il bloque l'accès à des connaissances précieuses. Pouvez-vous le neutraliser ?",
      idle:        "L'ordre doit être maintenu, même dans ces souterrains.",
      questOffer:  "Neutralisez le Gardien du Portail. Je vous récompenserai à la hauteur du danger.",
      questActive: "Le Gardien est-il vaincu ?",
      questReady:  "Excellent travail. Voici votre récompense, bien méritée.",
      questDone:   "Vous avez prouvé votre valeur. Gryffondor peut être fier."
    }
  }
];

// ── Helpers ────────────────────────────────────────────────────

function getNpcById(id) {
  return NPCS.find(n => n.id === id) || null;
}

function getNpcsForFloor(floor) {
  return NPCS.filter(n => n.placement && n.placement.floor === floor);
}

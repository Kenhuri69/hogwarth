// ============================================================
// REGISTRE DES DEVINETTES — stèles d'énigmes du donjon (V2 Phase 3)
// ============================================================
// Chaque stèle générée (`runeStele`, voir dungeon.js) pioche une entrée
// de RIDDLES. La bonne réponse dissout la barrière scellant le coffre.
// Registre statique — pas de génération procédurale (hors-scope V2).
//
// Forme d'une entrée :
//   { id, question, choices:[…], answer:<index dans choices>, rewardHint }
//
// `answer` est l'index (0-based) de la bonne réponse dans `choices`.
// `rewardHint` : courte phrase d'ambiance affichée une fois résolue.

const RIDDLES = [
  {
    id: 'r_grosse_dame',
    question: "Je garde l'entrée de la salle commune de Gryffondor et ne "
            + "m'ouvre qu'à celui qui connaît le mot de passe. Qui suis-je ?",
    choices: ['La Grosse Dame', 'Sir Cadogan', 'Peeves', 'Le Choixpeau'],
    answer: 0,
    rewardHint: 'La gardienne du portrait vous laisse passer.'
  },
  {
    id: 'r_phenix',
    question: "Mes larmes guérissent toute blessure et je renais de mes "
            + 'cendres sans jamais mourir. Quel animal suis-je ?',
    choices: ['Un hippogriffe', 'Un phénix', 'Un Niffleur', 'Un Sombral'],
    answer: 1,
    rewardHint: 'Le chant du phénix fait coulisser la pierre.'
  },
  {
    id: 'r_miroir',
    question: "Je révèle à celui qui me contemple le désir le plus profond "
            + 'de son cœur, et rien de plus. Quel est mon nom ?',
    choices: ['La Pensine', 'Le miroir du Riséd', 'Le Choixpeau',
              'La Carte du Maraudeur'],
    answer: 1,
    rewardHint: 'Le reflet du Riséd s\'efface, dévoilant le passage.'
  },
  {
    id: 'r_impardonnable',
    question: 'Trois sortilèges portent le nom de « Sortilèges '
            + "Impardonnables ». Lequel n'en fait PAS partie ?",
    choices: ['Avada Kedavra', 'Endoloris', 'Impero', 'Sectumsempra'],
    answer: 3,
    rewardHint: 'La stèle reconnaît votre savoir des arts interdits.'
  },
  {
    id: 'r_gobelins',
    question: "Quelle créature tient la banque de Gringotts et forge un "
            + "argent qui ne s'use ni ne se ternit jamais ?",
    choices: ['Les elfes de maison', 'Les centaures', 'Les gobelins',
              'Les gnomes de jardin'],
    answer: 2,
    rewardHint: 'Un mécanisme gobelin libère le coffre.'
  },
  {
    id: 'r_basilic',
    question: 'Le monstre de la Chambre des Secrets tue quiconque croise '
            + 'son regard. Quelle créature est-ce ?',
    choices: ['Un Basilic', 'Une Acromantule', 'un Détraqueur',
              'Un Strangulot'],
    answer: 0,
    rewardHint: 'Le sceau du Serpentard se brise.'
  },
  {
    id: 'r_patronus',
    question: "Quel sortilège repousse un Détraqueur en projetant une "
            + "forme d'argent éclatante ?",
    choices: ['Riddikulus', 'Lumos Maxima', 'Spero Patronum',
              'Expecto Patronum'],
    answer: 3,
    rewardHint: 'Une lumière argentée dissout la barrière.'
  },
  {
    id: 'r_choixpeau',
    question: 'Posé sur la tête de chaque nouvel élève, je décide de la '
            + 'maison à laquelle il appartiendra. Qui suis-je ?',
    choices: ['Le Choixpeau magique', 'La Coupe de Feu',
              'Le professeur McGonagall', 'La Grosse Dame'],
    answer: 0,
    rewardHint: 'Le Choixpeau approuve votre sagacité.'
  }
];

// Recherche d'une devinette par id — null si introuvable.
function getRiddleById(id) {
  return RIDDLES.find(r => r.id === id) || null;
}

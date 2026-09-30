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
    id: 'r_clef_voute',
    question: 'Quatre sorciers unirent leur magie pour sceller, sous '
            + "l'école, ce qu'elle fut bâtie pour oublier. Comment nomme-t-on "
            + 'ces bâtisseurs ?',
    choices: ['Les Mangemorts', 'Les Fondateurs', "L'Ordre du Phénix",
              'Les Aurors'],
    answer: 1,
    rewardHint: 'La pierre reconnaît le nom des Quatre, et coulisse.'
  },
  {
    id: 'r_choixpeau',
    question: 'Posé sur la tête de chaque nouvel élève, je décide de la '
            + 'maison à laquelle il appartiendra. Qui suis-je ?',
    choices: ['Le Choixpeau magique', 'La Coupe de Feu',
              'Le professeur McGonagall', 'La Grosse Dame'],
    answer: 0,
    rewardHint: 'Le Choixpeau approuve votre sagacité.'
  },
  // ── Devinettes des Ruines Anciennes (Zone D / Boucle) ───────────
  {
    id: 'r_voute_corruption',
    minFloor: 11,
    question: "La Clé de Voûte ne scellait pas une chose, mais deux. L'une "
            + "vint après les Fondateurs. Quelle était l'AUTRE ?",
    choices: ['Voldemort', 'Une corruption antérieure à Poudlard',
              'Le Basilic', 'Les Reliques de la Mort'],
    answer: 1,
    rewardHint: "La pierre frémit : tu as nommé ce que l'école fut bâtie pour oublier."
  },
  {
    id: 'r_quatre_unis',
    minFloor: 11,
    question: "Avant de se diviser en quatre maisons, les Fondateurs firent une "
            + "seule chose ensemble, sous l'école. Laquelle ?",
    choices: ['Ils bâtirent la Grande Salle', 'Ils posèrent un sceau',
              'Ils plantèrent le Saule', 'Ils créèrent le Choixpeau'],
    answer: 1,
    rewardHint: "Les quatre vitraux s'illuminent à l'unisson, le temps d'un battement."
  },
  {
    id: 'r_dormeur',
    minFloor: 11,
    question: "Sous l'Avant-Monde repose une présence antérieure à l'écriture, "
            + "donc aux runes. On ne l'affronte jamais. Comment l'appelle-t-on ?",
    choices: ['Le Veilleur du Seuil', 'Le Dormeur des Fondations',
              'Le Seigneur des Ténèbres', 'Le Basilic Ancestral'],
    answer: 1,
    rewardHint: "Un battement lent répond. Mieux vaut ne pas réveiller ce qui rêve."
  },
  // ── Lot F (revue 2026-09, axe 6a) — 18 devinettes de plus ─────────
  // `minFloor` : ne sort qu'à partir de cet étage (réel). `hero` : posée par
  // ce héros, tirée seulement s'il est dans le groupe (pickRiddleFor).
  {
    id: 'r_saule',
    question: "Je garde l'entrée d'un passage vers le village et je frappe "
            + "quiconque m'approche, sauf si l'on presse un nœud de mes racines. Qui suis-je ?",
    choices: ['Le Saule Cogneur', 'Le Filet du Diable', 'Un Bowtruckle', 'La Forêt Interdite'],
    answer: 0,
    rewardHint: 'Une branche noueuse se replie, et la barrière avec elle.'
  },
  {
    id: 'r_mandragore',
    question: "Mon cri est mortel une fois adulte. On me rempote avec des cache-oreilles, "
            + "et je guéris les pétrifiés. Que suis-je ?",
    choices: ['Une Mandragore', 'Un Snargalouf', 'Un Pipaillon', 'Une Tentacula'],
    answer: 0,
    rewardHint: 'Un cri étouffé traverse la pierre, puis le passage s\'ouvre.'
  },
  {
    id: 'r_sombral',
    question: "Je tire les calèches de l'école, mais seuls ceux qui ont vu la mort "
            + "peuvent me voir. Qui suis-je ?",
    choices: ['Un Hippogriffe', 'Un Sombral', 'Un Abraxan', 'Un Éruptif'],
    answer: 1,
    rewardHint: 'Quelque chose d\'invisible souffle sur la barrière, qui se dissipe.'
  },
  {
    id: 'r_carte',
    question: "Je montre chaque personne du château, où qu'elle aille. Pour me lire, il faut "
            + "jurer solennellement que ses intentions sont mauvaises. Que suis-je ?",
    choices: ['La Pensine', 'La Carte du Maraudeur', 'Le Scrutoscope', 'Le Retourneur de Temps'],
    answer: 1,
    rewardHint: 'Des traces de pas à l\'encre traversent la stèle : « Méfait accompli ».'
  },
  {
    id: 'r_polynectar',
    question: "Je permets de prendre l'apparence d'un autre pendant une heure, pourvu "
            + "qu'on m'ajoute un fragment de lui. Quelle potion suis-je ?",
    choices: ['Le Veritaserum', 'Le Felix Felicis', 'Le Polynectar', "L'Amortentia"],
    answer: 2,
    rewardHint: 'La stèle bouillonne un instant, change de forme, et s\'ouvre.'
  },
  {
    id: 'r_retourneur',
    question: "Un sablier au bout d'une chaîne : chaque tour vous ramène une heure en arrière. "
            + 'Comment me nomme-t-on ?',
    choices: ['Le Retourneur de Temps', "L'Horloge de Gringotts", 'Le Rapeltout', 'Le Portoloin'],
    answer: 0,
    rewardHint: 'Le mécanisme recule d\'un cran — la barrière n\'a jamais été fermée.'
  },
  {
    id: 'r_rapeltout',
    question: "Je deviens rouge quand on a oublié quelque chose, mais je ne dis jamais quoi. "
            + 'Que suis-je ?',
    choices: ['Un Scrutoscope', 'Un Rapeltout', 'Une Beuglante', 'Une Plume à Papote'],
    answer: 1,
    rewardHint: 'La fumée rouge de la stèle s\'éclaircit : tu n\'as rien oublié.'
  },
  {
    id: 'r_accio',
    question: "Quel sortilège fait venir à soi un objet, même de très loin ?",
    choices: ['Wingardium Leviosa', 'Accio', 'Alohomora', 'Reducto'],
    answer: 1,
    rewardHint: 'Le coffre glisse vers toi à travers la barrière qui s\'efface.'
  },
  {
    id: 'r_detraqueur',
    question: "Je garde la prison d'Azkaban, je me nourris du bonheur, et mon baiser "
            + "vole l'âme. Qui suis-je ?",
    choices: ['Un Inferius', 'Un Détraqueur', 'Un Moremplis', 'Un Épouvantard'],
    answer: 1,
    rewardHint: 'Le froid reflue, et la stèle avec lui.'
  },
  {
    id: 'r_epouvantard',
    question: "Je prends la forme de ce que tu crains le plus. Le rire me détruit. "
            + 'Qui suis-je ?',
    choices: ['Un Métamorphomage', 'Un Épouvantard', 'Un Strangulot', 'Un Esprit frappeur'],
    answer: 1,
    rewardHint: '« Riddikulus » — la stèle se tord de rire et s\'ouvre.'
  },
  {
    id: 'r_fondateurs_ordre',
    question: "Quatre Fondateurs. Lequel voulait n'enseigner qu'aux sorciers "
            + 'de sang pur ?',
    choices: ['Godric Gryffondor', 'Helga Poufsouffle', 'Rowena Serdaigle', 'Salazar Serpentard'],
    answer: 3,
    rewardHint: 'Un serpent de pierre glisse hors du passage.',
    minFloor: 4
  },
  {
    id: 'r_felure',
    question: "Un sceau fendu en trois ne ferme plus rien. Sous l'école, qu'est-ce qui "
            + "s'élargit depuis que la Clé de Voûte s'est brisée ?",
    choices: ['Le Lac Noir', 'La fêlure', 'La Chambre des Secrets', 'Le Saule Cogneur'],
    answer: 1,
    rewardHint: 'La pierre gémit, comme un écho de ce qui se fend plus bas.',
    minFloor: 7
  },
  {
    id: 'r_hero_harry',
    hero: 'harry',
    question: "Harry pose la main sur la stèle : « Je sais celle-là. Une cicatrice en forme "
            + "d'éclair, et un sort qui a rebondi. Quel sort, déjà ? »",
    choices: ['Avada Kedavra', 'Expelliarmus', 'Stupefix', 'Endoloris'],
    answer: 0,
    rewardHint: 'Harry touche sa cicatrice sans y penser. La barrière s\'efface.'
  },
  {
    id: 'r_hero_hermione',
    hero: 'hermione',
    question: "Hermione lit à voix haute : « Je suis la bibliothèque où l'on ne va pas "
            + "sans signature d'un professeur. » Quelle section est-ce ?",
    choices: ['La Réserve', 'La Salle des Trophées', 'La Tour d\'Astronomie', 'La Salle sur Demande'],
    answer: 0,
    rewardHint: 'Hermione sourit : « Évidemment. » La pierre coulisse.'
  },
  {
    id: 'r_hero_draco',
    hero: 'draco',
    question: "Drago plisse les yeux : « Une armoire qui mène ailleurs, jumelle d'une autre "
            + "chez Barjow et Beurk. » Quel est son nom ?",
    choices: ["L'Armoire à Disparaître", 'Le Coffre de Maugrey', "L'Armoire à Épouvantard", 'Le Buffet de Ronfleur'],
    answer: 0,
    rewardHint: 'Drago détourne le regard, la mâchoire serrée. La barrière cède.'
  },
  {
    id: 'r_hero_cedric',
    hero: 'cedric',
    question: "Cedric sourit : « La première tâche du Tournoi. J'ai transformé un rocher "
            + "en chien pour distraire la créature. » Quelle créature ?",
    choices: ['Un dragon', 'Un Strangulot', 'Un Scroutt à pétard', 'Un sphinx'],
    answer: 0,
    rewardHint: 'Cedric passe la main sur la stèle, comme on salue un vieux souvenir.'
  },
  {
    id: 'r_hero_celeste',
    hero: 'celeste',
    question: "Céleste lève les yeux vers une voûte sans ciel : « L'étoile la plus brillante "
            + "de la nuit porte le nom d'un sorcier que tu connais. » Laquelle ?",
    choices: ['Sirius', 'Véga', 'Bellatrix', 'Polaris'],
    answer: 0,
    rewardHint: 'Une lueur d\'étoile s\'allume dans la pierre, et la barrière s\'éteint.'
  },
  {
    id: 'r_hero_nathalie',
    hero: 'nathalie',
    question: "Nathalie effleure une racine : « Cette plante étouffe qui se débat et relâche "
            + "qui se calme. Et elle déteste la lumière. » Laquelle ?",
    choices: ['Le Filet du Diable', 'La Mandragore', 'La Tentacula vénéneuse', "L'Aconit"],
    answer: 0,
    rewardHint: 'Nathalie murmure : « On tient racine. » La barrière se desserre.'
  }
];

// Lot F (axe 6a) — PUR : devinette éligible pour une stèle. Filtre `minFloor`
// (étage réel) et `hero` (présent dans heroKeys). Repli : tout le registre sans
// héros, pour ne jamais laisser une stèle vide. `rng` optionnel (tests).
function pickRiddleFor(floor, heroKeys, rng) {
  const r = (typeof rng === 'function') ? rng : Math.random;
  const f = (typeof floor === 'number' && isFinite(floor)) ? floor : 1;
  const keys = Array.isArray(heroKeys) ? heroKeys : [];
  let pool = RIDDLES.filter(q => (!q.minFloor || f >= q.minFloor) && (!q.hero || keys.indexOf(q.hero) !== -1));
  if (!pool.length) pool = RIDDLES.filter(q => !q.hero);
  return pool[Math.floor(r() * pool.length)] || null;
}

// Recherche d'une devinette par id — null si introuvable.
function getRiddleById(id) {
  return RIDDLES.find(r => r.id === id) || null;
}

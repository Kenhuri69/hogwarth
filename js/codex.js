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
//   house   → ctx.chosenHouse === value          (variantes / gating)
//   victory → ctx.victoryAchieved === true       (Boucle Ténébreuse)
// ============================================================

const CODEX_ENTRIES = [

  // ── 🔥 Histoire & Lore ─────────────────────────────────────
  {
    id: 'cle_de_voute', category: 'histoire', icon: '🔑', act: 1,
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
    title: 'Les Éclats de la Clé de Voûte',
    links: ['cle_de_voute', 'echo_scellement'],
    unlockConditions: [{ type: 'eclat', value: 1 }],
    revealedBy: [{ type: 'eclat', value: 3 }],
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
    textVersions: {
      veiled: "Au cœur runique des Ruines, un timbre clair sans corps : « On ne scelle pas par peur. On tient la porte. » Le courage, ici, n'est pas un cri — c'est une faction qu'on ne quitte pas.",
    },
    variants: { house: { Gryffondor: "Il parle comme à l'un des siens : tenir la porte n'est pas mourir pour elle, c'est rester quand tout pousse à reculer." } },
  },
  {
    id: 'voix_salazar', category: 'eclats', icon: '🐍', act: 4,
    title: 'La Voix de Salazar',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'echo', value: 'echo_salazar' }],
    textVersions: {
      veiled: "Dans les profondeurs, une voix qui connaît ton nom et tes tentations : « J'ai scellé ma part avec ma faute. » Pour fermer le verrou, chacun a dû y mettre une part de soi-même — sa plus laide. La tentation que tu entends n'est pas un démon : c'est un miroir.",
    },
    variants: { house: { Serpentard: "Il te parle comme à un héritier. Ce n'est pas un piège : c'est une passation. À toi de décider ce que tu fais de ce que tu reconnais en lui." } },
  },
  {
    id: 'voix_rowena', category: 'eclats', icon: '🦅', act: 4,
    title: 'La Voix de Rowena',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'echo', value: 'echo_rowena' }],
    textVersions: {
      veiled: "Une voix posée, presque amusée : « Comprends, et la faille apparaît. » Le savoir n'écarte pas la peur — il la nomme, et c'est en la nommant qu'on trouve où poser le sceau.",
    },
    variants: { house: { Serdaigle: "Elle ne te donne pas la réponse : elle te montre la question juste. Lis ce qui est sous toutes les autres pages." } },
  },
  {
    id: 'voix_helga', category: 'eclats', icon: '🦡', act: 4,
    title: 'La Voix de Helga',
    links: ['echo_scellement'],
    unlockConditions: [{ type: 'echo', value: 'echo_helga' }],
    textVersions: {
      veiled: "La plus douce des quatre : « J'ai creusé un abri pour ceux qui resteraient. » Pendant que les autres scellaient, elle pensait déjà aux vivants d'après — à ceux qu'on ne laisse pas derrière.",
    },
    variants: { house: { Poufsouffle: "Elle te confie l'abri, pas le verrou. Protéger ceux qui restent vaut autant que tenir la porte." } },
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
    case 'house':
      return ctx.chosenHouse === cond.value;
    case 'victory':
      return ctx.victoryAchieved === true;
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

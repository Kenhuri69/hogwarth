// ============================================================
// FLOOR AMBIANCE — Descriptions d'ambiance zonées + corruption
// ============================================================
// Module PUR (aucun état, aucune sérialisation) chargé juste après
// floor-themes.js. Consomme getFloorTheme() pour rester cohérent
// avec la source unique de vérité des zones.
//
// Surfaces publiques :
//   ZONE_AMBIANCE       — données par clé de thème (ancient splittée en paliers)
//   getFloorAmbiance(f) — pur, entrée ZONE_AMBIANCE (palier ancient résolu)
//   corruptionLevel(f, victoryAchieved) — pur, 0.0→1.3
//   HOUSE_AMBIANCE_MOD  — lignes cosmétiques par Maison (escalade byZone A→D)
//   houseAmbianceLine(chosenHouse, floor?) — null si Maison absente
//   temporalEchoActive(f, victoryAchieved) — pur, gate des échos (Boucle 12+)
//   temporalEchoTier(f) — pur, 'silhouette'|'scene'|null
//   FOUNDER_VOICES      — 4 voix de Fondateur par Maison
//   TEMPORAL_ECHOES     — registre des échos déverrouillables (codex)
//   echoLine(f, victoryAchieved, chosenHouse) — { id, icon, text } ou null
//
// Voir .claude/plans/chapters-04-10-lieux-ambiance.md §B / §Étape 3.
// Textes : docs/histoire/10-lieux-et-geographie.md §10.2, §10.6, §10.8.
// ============================================================

// ── Descriptions zonées ─────────────────────────────────────
// Clés = valeurs de FLOOR_THEMES (hogwarts / dungeons / depths / ancient)
const ZONE_AMBIANCE = {

  // Zone A — Couloirs de Poudlard (étages 1–3)
  // Ton : fausse sécurité, froid naissant, école qui a peur
  hogwarts: {
    floorLines: [
      "Les torches brûlent encore, mais leur halo a froidi.",
      "Des portraits murmurent sur les murs — quelqu'un a peur à ta place.",
      "Une fine pellicule de givre ourle le bas des fenêtres. En pleine année.",
      "L'écho de vos pas résonne ; quelque part, un portrait hurle encore.",
      "Parchemin, cire, poussière de craie — et, par-dessous, l'air d'un étang gelé.",
      "Le château semble retenir son souffle autour de vous.",
    ],
    smell:  ["parchemin", "cire de bougie", "poussière de craie", "un fond de givre inexplicable"],
    sound:  ["un portrait qui chuchote", "le grincement d'un escalier lointain", "une cloche sonne une heure qui n'existe pas"],
    temp:   "fraîche",
  },

  // Zone B — Cachots de Poudlard (étages 4–6)
  // Ton : menace organisée, froid carcéral, l'école s'efface
  dungeons: {
    floorLines: [
      "Salpêtre, fer rouillé, fumée de torche grasse — ici, personne ne vient plus.",
      "Des chaînes pendent à certains murs. Le décor est devenu carcéral.",
      "L'haleine fume en permanence. Le froid n'est plus une saison.",
      "Des voix humaines basses, au loin — des mangemorts qui œuvrent.",
      "La pierre humide suinte ; la lumière des lampes à huile projette des ombres longues.",
      "Un chant de potion bout seul quelque part. Le silence qui l'entoure est pire.",
    ],
    smell:  ["salpêtre", "fer rouillé", "fumée de torche grasse", "renfermé minéral"],
    sound:  ["gouttes d'eau régulières", "cliquetis de métal au loin", "voix humaines basses"],
    temp:   "glaciale",
  },

  // Zone C — Profondeurs Oubliées (étages 7–13)
  // Ton : dépaysement total, cavernes, prédation, roche-mère
  depths: {
    floorLines: [
      "Plus aucun plan de l'école ne mentionne ce vide.",
      "La lumière vient de champignons phosphorescents et de la lueur des yeux.",
      "Eau stagnante, pierre humide, moisi végétal — le château connu est derrière soi.",
      "Un silence minéral qui pèse, troué par le clapotis de quelque chose qui nage.",
      "La roche brute porte les premières runes — un alphabet qu'on n'a pas appris.",
      "Le froid de la terre profonde, stable, qui ne varie plus. Il ne s'apprivoise pas.",
    ],
    smell:  ["eau stagnante", "pierre humide", "moisi végétal", "ozone et pierre brûlée"],
    sound:  ["gouttes amplifiées par l'écho", "clapotis d'une chose qui nage", "bourdonnement runique grave"],
    temp:   "abyssale",
  },

  // Zone D — Ruines Anciennes (étages 14+, Boucle Ténébreuse)
  // Ton : solennité mythique, antérieur à l'école, hors-temps.
  // P-D1 — splittée en 3 paliers d'intensité croissante (ch.10 §10.2) :
  //   megalith (14-16) → runic (17-20) → before (21+).
  // `floorLines` à plat est conservé : fallback back-compat si `tiers`
  // est absent ou si l'étage tombe hors borne (getFloorAmbiance le résout).
  ancient: {
    tiers: {
      // Seuil mégalithique (14-16) — l'architecture cesse d'être humaine.
      megalith: { floors: [14, 16], floorLines: [
        "Tu n'explores plus un château. Tu explores ce qui était là avant tous.",
        "L'architecture cesse d'être humaine : monolithes dressés, dolmens noirs, linteaux trop grands pour une main.",
        "Des racines géantes ligneuses traversent les salles, soulèvent les dalles et enlacent les runes.",
        "La lumière est froide, bleutée, sans source — elle suinte des gravures elles-mêmes.",
        "Les runes palpitent lentement, comme une respiration ; aucun écho ne renvoie tes pas.",
        "Minéral pur, ozone, sève froide des racines — une note antérieure à toute vie.",
      ] },
      // Cœur runique (17-20) — ce n'est pas une ruine, c'est une machine.
      runic: { floors: [17, 20], floorLines: [
        "Ce n'est pas une ruine. C'est une machine, et elle se rallume.",
        "Des cristaux de magie brute affleurent partout, grésillant d'une lueur non raffinée qui fait vibrer l'air.",
        "Les runes ne palpitent plus — elles brûlent.",
        "Le brouillard est si épais que des scènes du passé se rejouent en pleine salle ; on peut marcher au travers.",
        "Le chant runique se fend par moments en quatre timbres distincts — Godric, Salazar, Rowena, Helga.",
        "Près des cristaux, une chaleur sèche et fausse irradie sans réchauffer.",
      ] },
      // Avant-Monde (21+) — avant l'écriture, avant la pierre.
      before: { floors: [21, Infinity], floorLines: [
        "Plus de runes. On est avant l'écriture.",
        "La ruine se désagrège en faveur de la magie brute : cristaux géants, racines-mères, sol de lumière froide compactée.",
        "Le chant a cessé. À sa place, un battement lent, énorme, organique — comme un cœur qui dort.",
        "Aucune odeur. Un vide olfactif total, plus inquiétant que n'importe quelle puanteur.",
        "La température est hors de la notion même : le corps cesse de savoir où il est dans le temps.",
        "La profondeur pour la profondeur. Le prestige comme seule raison de continuer.",
      ] },
    },
    floorLines: [
      "Tu n'explores plus un château. Tu explores ce qui était là avant tous.",
      "Les runes pulsent sur les murs, le sol, le plafond — elles commentent ta présence.",
      "Un chant runique continu, grave, sans source apparente. Aucun écho de pas.",
      "Le froid n'est plus une sensation. C'est un état du lieu — hors-temps, hors-saison.",
      "Minéral pur, ozone, et une note antérieure à toute vie.",
      "Les angles dérangent. Les proportions sont fausses. Ceux qui ont bâti cela n'étaient pas humains.",
    ],
    smell:  ["minéral pur", "ozone", "sève froide des racines", "cristal chaud", "une note antérieure à toute vie"],
    sound:  ["chant runique grave", "craquement de racines", "voix anciennes à la limite de l'audible", "un battement organique"],
    temp:   "surnaturelle",
  },
};

// ── Résolveur pur : clé de zone ──────────────────────────────
// Retourne la clé ZONE_AMBIANCE (hogwarts/dungeons/depths/ancient)
// correspondant à l'étage `floor`. Toujours sûr : entrée invalide →
// 'hogwarts' (miroir du fallback de getFloorTheme). Partagé par
// getFloorAmbiance ET houseAmbianceLine (escalade par zone).
function _ambianceZoneKey(floor) {
  if (typeof getFloorTheme !== 'function') return 'hogwarts';
  const theme = getFloorTheme(floor);
  // Recherche par identité d'objet (référence partagée avec FLOOR_THEMES).
  if (typeof FLOOR_THEMES !== 'undefined') {
    for (const [key, t] of Object.entries(FLOOR_THEMES)) {
      if (t === theme) return ZONE_AMBIANCE[key] ? key : 'hogwarts';
    }
  }
  // Fallback par valeur du champ ambient.
  if (theme && theme.ambient) {
    const byAmbient = { intro: 'hogwarts', dungeon: 'dungeons', depths: 'depths', abyss: 'ancient' };
    return byAmbient[theme.ambient] || 'hogwarts';
  }
  return 'hogwarts';
}

// Résout le sous-palier d'une entrée de zone (P-D1). Pour `ancient`,
// renvoie un objet mergé { ...entry, floorLines: <palier>, tier }. Pour
// toute zone sans `tiers` (ou floor hors borne) → l'entrée inchangée
// (identité préservée, back-compat). Pur.
function _resolveAmbianceTier(entry, floor) {
  if (!entry || !entry.tiers) return entry;
  const f = (typeof floor === 'number') ? floor : 0;
  for (const key of Object.keys(entry.tiers)) {
    const t = entry.tiers[key];
    const lo = t.floors[0], hi = t.floors[1];
    if (f >= lo && f <= hi) {
      return Object.assign({}, entry, { floorLines: t.floorLines, tier: key });
    }
  }
  return entry; // fallback à plat (floorLines de l'entrée)
}

// ── Résolveur pur ────────────────────────────────────────────
// Retourne l'entrée ZONE_AMBIANCE correspondant à l'étage `floor`,
// sous-palier `ancient` résolu (P-D1). Toujours sûr : un étage invalide
// tombe sur la zone hogwarts (identique au fallback de getFloorTheme).
function getFloorAmbiance(floor) {
  const zone = ZONE_AMBIANCE[_ambianceZoneKey(floor)] || ZONE_AMBIANCE.hogwarts;
  return _resolveAmbianceTier(zone, floor);
}

// ── Niveau de corruption ─────────────────────────────────────
// Valeur dérivée pure : 0.0 (étage 1) → 1.0 (étage 14+).
// +0.3 (cap 1.3) en Boucle Ténébreuse (victoryAchieved && floor >= 11).
// Aucune sérialisation : recalculé depuis currentFloor + victoryAchieved.
function corruptionLevel(floor, victoryAchieved) {
  const f = (typeof floor === 'number' && floor > 0) ? floor : 1;
  let c = Math.min(1, (f - 1) / 13);
  if (victoryAchieved && f >= 11) c = Math.min(1.3, c + 0.3);
  return c;
}

// ── Variantes cosmétiques par Maison ────────────────────────
// Une ligne occasionnelle (~1 entrée sur 4) selon chosenHouse.
// Purement cosmétique, ne modifie pas la carte générée.
// P-D2 — registre `byZone` qui ESCALADE A→D : le même héros lit un donjon
// différent selon sa Maison, et le registre monte d'un cran par zone.
// Textes : docs/histoire/10-lieux-et-geographie.md §10.6 (escalade A→D).
const HOUSE_AMBIANCE_MOD = {
  Serpentard:  {
    extraLine: "Une pierre a bougé ici récemment — d'autres n'ont pas vu ce passage.",
    flavor: "secret",
    byZone: {
      hogwarts: "Une pierre a bougé ici récemment — d'autres n'ont pas vu ce passage.",
      dungeons: "Un raccourci gris se faufile derrière un mur descellé — gagne-t-on du temps, ou descend-on trop vite ?",
      depths:   "Tu reconnais la main de Salazar dans ces verrous : ils s'ouvrent pour qui sait demander.",
      ancient:  "Les monolithes s'écartent pour toi seul, comme s'ils attendaient un héritier.",
    },
  },
  Gryffondor:  {
    extraLine: "Une marque de bataille : quelqu'un a tenu ici, et n'a pas fui.",
    flavor: "valor",
    byZone: {
      hogwarts: "Des brasiers du Lion gardent une lueur chaude là où le froid voudrait l'éteindre.",
      dungeons: "Une marque de bataille : quelqu'un a tenu ici, et n'a pas fui.",
      depths:   "Une arène naturelle s'ouvre : ici on tient la ligne, même face aux Détraqueurs.",
      ancient:  "Sur un autel de pierre, une flamme survit au froid — la lumière qui ne s'éteint pas.",
    },
  },
  Serdaigle:   {
    extraLine: "Une glyphe à demi effacée attend un œil qui sait lire.",
    flavor: "lore",
    byZone: {
      hogwarts: "Une glyphe à demi effacée attend un œil qui sait lire.",
      dungeons: "Des feuillets dispersés, un savoir éparpillé : quelqu'un a voulu garder une trace.",
      depths:   "Les runes du Veilleur, muettes pour les autres, te deviennent intelligibles.",
      ancient:  "La langue-mère se traduit d'elle-même sous ton regard — le Codex prend vie.",
    },
  },
  Poufsouffle: {
    extraLine: "Un recoin abrité — on pourrait y reprendre souffle, ensemble.",
    flavor: "refuge",
    byZone: {
      hogwarts: "Un recoin abrité — on pourrait y reprendre souffle, ensemble.",
      dungeons: "Une voix faible, quelque part, appelle à l'aide ; un premier secours possible.",
      depths:   "Un Refuge précaire tient encore : une âme y attend qu'on ne l'oublie pas.",
      ancient:  "Entre deux racines géantes, une alcôve tiède veille — quelqu'un pourrait survivre ici.",
    },
  },
};

// Retourne la ligne d'ambiance de Maison, ou null si Maison absente/inconnue.
// `floor` (optionnel) : si fourni, escalade par zone (byZone). Sans floor,
// fallback sur `extraLine` (back-compat).
function houseAmbianceLine(chosenHouse, floor) {
  if (!chosenHouse) return null;
  const mod = HOUSE_AMBIANCE_MOD[chosenHouse];
  if (!mod) return null;
  if (typeof floor === 'number' && mod.byZone) {
    const zoneLine = mod.byZone[_ambianceZoneKey(floor)];
    if (zoneLine) return zoneLine;
  }
  return mod.extraLine || null;
}

// ── Échos temporels & voix des Fondateurs (P-D3) ────────────
// Fragments de passé matérialisés en zone C fin / zone D. Tout DÉRIVÉ
// (currentFloor / victoryAchieved / chosenHouse, déjà persistés) — seul
// `seenEchoes` (codex, state.js) est sérialisé, et il est rempli au call-site.
// Textes : docs/histoire/10-lieux-et-geographie.md §10.8 (registres d'écho,
// quatre voix), §10.5 (règle d'illumination : voix de la Maison du héros
// priorisée — la plus claire).

// Gate maître : silhouettes dès la fin de zone C en Boucle (12-13),
// scènes pleines en zone D (14+). Faux hors Boucle.
function temporalEchoActive(floor, victoryAchieved) {
  const f = (typeof floor === 'number') ? floor : 0;
  return !!victoryAchieved && f >= 12;
}

// Registre d'intensité (indépendant de victoryAchieved — pur sur floor) :
//   'silhouette' (12-13) · 'scene' (14+) · null sinon.
function temporalEchoTier(floor) {
  const f = (typeof floor === 'number') ? floor : 0;
  if (f >= 14) return 'scene';
  if (f >= 12) return 'silhouette';
  return null;
}

// Quatre voix des Fondateurs (cœur runique 17+), clé = Maison. La voix de
// la Maison du héros est la plus claire (règle d'illumination §10.5).
const FOUNDER_VOICES = {
  Gryffondor:  { founder: 'Godric',  echoId: 'echo_godric',  emoji: '🦁', line: "On ne scelle pas par peur. On tient la porte." },
  Serpentard:  { founder: 'Salazar', echoId: 'echo_salazar', emoji: '🐍', line: "J'ai scellé ma part avec ma faute." },
  Serdaigle:   { founder: 'Rowena',  echoId: 'echo_rowena',  emoji: '🦅', line: "Comprends, et la faille apparaît." },
  Poufsouffle: { founder: 'Helga',   echoId: 'echo_helga',   emoji: '🦡', line: "J'ai creusé un abri pour ceux qui resteraient." },
};

// Registre des échos déverrouillables (codex « Mémoire des Ruines », P-D5).
// `id` = clé sérialisée dans seenEchoes. `text` = ligne d'ambiance affichée ;
// `codex` = entrée déverrouillée dans le journal.
const TEMPORAL_ECHOES = {
  echo_silhouette: {
    tier: 'silhouette', icon: '👤', label: "Silhouette du Graveur",
    text: "Dans la brume basse, une brève silhouette retraverse la salle — quelqu'un, courbé, en train de graver — avant de se dissiper. Tu n'aperçois pas son visage.",
    codex: "Premier contact visuel avec le passé : un Fondateur grave le sceau, muet, indifférent à ta présence.",
  },
  echo_scene_sceau: {
    tier: 'scene', icon: '🎞️', label: "La Pose du Sceau",
    text: "Le brouillard se fige en une scène pleine : les Quatre posent ensemble leur part du sceau sur la faille. Tu marches au travers — ils ne te voient pas. Voici comment le sceau fut posé.",
    codex: "Scène traversable : les quatre Fondateurs scellent ensemble la faille. La peur retenait quelque chose de bien plus ancien que Voldemort.",
  },
  echo_godric: {
    tier: 'voice', icon: '🦁', house: 'Gryffondor', founder: 'Godric', label: "Voix de Godric",
    text: "Une voix chaude se détache du chant runique : « On ne scelle pas par peur. On tient la porte. »",
    codex: "Godric Gryffondor — le courage : on ne scelle pas par peur, on tient la porte.",
  },
  echo_salazar: {
    tier: 'voice', icon: '🐍', house: 'Serpentard', founder: 'Salazar', label: "Voix de Salazar",
    text: "Une voix basse glisse entre les runes : « J'ai scellé ma part avec ma faute. »",
    codex: "Salazar Serpentard — l'ambivalence : un Fondateur scellé avec la corruption qu'il aida à enfermer.",
  },
  echo_rowena: {
    tier: 'voice', icon: '🦅', house: 'Serdaigle', founder: 'Rowena', label: "Voix de Rowena",
    text: "Une voix claire affleure des gravures : « Comprends, et la faille apparaît. »",
    codex: "Rowena Serdaigle — le savoir : comprendre, c'est révéler la faille.",
  },
  echo_helga: {
    tier: 'voice', icon: '🦡', house: 'Poufsouffle', founder: 'Helga', label: "Voix de Helga",
    text: "Une voix douce monte du sol : « J'ai creusé un abri pour ceux qui resteraient. »",
    codex: "Helga Poufsouffle — le refuge : creuser un abri pour ceux qui resteraient.",
  },
  // Chambres des Fondateurs (P5) — déverrouillées par l'étage-scène du Cœur
  // runique (maybeFounderChamberBeat) : seule celle de la Maison du héros
  // s'illumine (règle d'illumination §10.5, saveurs de Maison §10.6).
  echo_chamber_gryffondor: {
    tier: 'chamber', icon: '🦁', house: 'Gryffondor', founder: 'Godric', label: "Chambre du Lion",
    text: "La Chambre du Lion s'embrase pour toi : des brasiers se rallument seuls le long d'une salle de garde tenue contre la peur.",
    codex: "La Chambre du Lion s'illumine pour son héritier : brasiers ravivés, salle de garde tenue contre la peur. Godric accueille les siens par le feu.",
  },
  echo_chamber_serpentard: {
    tier: 'chamber', icon: '🐍', house: 'Serpentard', founder: 'Salazar', label: "Chambre du Serpent",
    text: "La Chambre du Serpent se descelle pour toi : les verrous cèdent seuls, une pierre pivote, un passage gris s'ouvre.",
    codex: "La Chambre du Serpent s'ouvre pour son héritier : verrous descellés, passage gris révélé. Salazar reconnaît le sang qui sait voir les portes cachées.",
  },
  echo_chamber_serdaigle: {
    tier: 'chamber', icon: '🦅', house: 'Serdaigle', founder: 'Rowena', label: "Chambre de l'Aigle",
    text: "La Chambre de l'Aigle se traduit pour toi : les glyphes se déchiffrent d'eux-mêmes sous ton regard, ligne après ligne.",
    codex: "La Chambre de l'Aigle se déchiffre pour son héritier : glyphes traduits d'eux-mêmes. Rowena n'accueille que l'œil qui sait lire.",
  },
  echo_chamber_poufsouffle: {
    tier: 'chamber', icon: '🦡', house: 'Poufsouffle', founder: 'Helga', label: "Chambre du Blaireau",
    text: "La Chambre du Blaireau t'abrite : au cœur du gel, une alcôve tiède où reprendre souffle ensemble.",
    codex: "La Chambre du Blaireau abrite son héritier : alcôve tiède creusée dans le gel. Helga garde un refuge pour ceux qui restent.",
  },
};

// Résolveur PUR : retourne l'écho contextuel { id, icon, text } ou null.
//   - Hors Boucle / hors zone (floor < 12) → null.
//   - Cœur runique (17+) avec Maison → voix de la Maison du héros (priorité,
//     la plus claire — §10.5).
//   - Sinon : scène (14+) ou silhouette (12-13) selon le palier.
function echoLine(floor, victoryAchieved, chosenHouse) {
  if (!temporalEchoActive(floor, victoryAchieved)) return null;
  const f = floor;
  // Voix de la Maison du héros priorisée au cœur runique.
  if (f >= 17 && chosenHouse && FOUNDER_VOICES[chosenHouse]) {
    const id = FOUNDER_VOICES[chosenHouse].echoId;
    const e  = TEMPORAL_ECHOES[id];
    if (e) return { id, icon: e.icon, text: e.text };
  }
  const tier = temporalEchoTier(f);
  if (tier === 'scene') {
    const e = TEMPORAL_ECHOES.echo_scene_sceau;
    return { id: 'echo_scene_sceau', icon: e.icon, text: e.text };
  }
  if (tier === 'silhouette') {
    const e = TEMPORAL_ECHOES.echo_silhouette;
    return { id: 'echo_silhouette', icon: e.icon, text: e.text };
  }
  return null;
}

// ── Étages-scènes scénarisés (P5) ────────────────────────────
// Beat narratif écrit GARANTI à la première entrée de certains étages-clés,
// sans toucher à la génération procédurale (pur affichage textuel).
// Étages retenus (arbitrage 2026-06-08) : 1 (Seuil familier), 4 (entrée des
// Cachots / 1re transition), 8 (Seuil du Veilleur, graine des Ruines).
// L'étage 10 (Voldemort) est déjà scénarisé de fait ; l'étage 11 (Gardien de
// la Boucle) a son dialogue dédié — exclus volontairement.
// Textes : docs/histoire/10-lieux-et-geographie.md §10.2 (1/4/8) & §10.5.
// Plan : .claude/plans/scripted-floor-beats.md.
const FLOOR_SCRIPTED_BEATS = {
  1: {
    id: 'seuil_familier',
    narrative: "Tu connais ces murs — et pourtant tu as froid. Les grands escaliers se sont figés vers le bas, le givre ourle les fenêtres en pleine année. Poudlard a peur à ta place. Le mal vient d'en bas : il faut descendre.",
    toast: "Le Seuil familier — la maison a peur. Descends à contre-courant.",
  },
  4: {
    id: 'entree_cachots',
    narrative: "L'école s'efface derrière toi. Ici la pierre est froide, l'haleine fume, des chaînes pendent aux murs. Des voix humaines basses œuvrent dans l'ombre : la corruption a désormais des fidèles. La Clé scellait deux maux, pas un.",
    toast: "Les Cachots de Poudlard — la corruption a des serviteurs.",
  },
  8: {
    id: 'seuil_veilleur',
    narrative: "Sur la roche brute affleurent les premières runes — un alphabet qu'aucun cours n'a enseigné. Quelque chose monte la garde au seuil de ce qui dort plus bas. Tu touches la graine des Ruines Anciennes.",
    toast: "Le Seuil du Veilleur — la pierre se souvient d'avant l'école.",
  },
};

// Résolveur PUR : retourne le beat de l'étage `floor`, ou null.
function getScriptedFloorBeat(floor) {
  return FLOOR_SCRIPTED_BEATS[floor] || null;
}

// Orchestrateur défensif : joue le beat à la PREMIÈRE entrée de l'étage.
// One-shot via le Set seenScriptedBeat (state.js, sérialisé). Idempotent :
// un second appel sur le même étage retourne false sans rien réafficher.
// No-op silencieux si l'état ou les helpers d'affichage manquent (file://).
function maybeScriptedFloorBeat(floor) {
  const beat = getScriptedFloorBeat(floor);
  if (!beat) return false;
  if (typeof seenScriptedBeat === 'undefined' || !seenScriptedBeat) return false;
  if (seenScriptedBeat.has(floor)) return false;
  seenScriptedBeat.add(floor);
  if (typeof setNarrative === 'function') setNarrative(beat.narrative);
  if (typeof addMsg === 'function') addMsg('📜 ' + beat.toast, 'narrative');
  return true;
}

// ── Étage-scène « Chambre des Fondateurs » (P5 — Maison, Cœur runique) ──
// Au seuil du Cœur runique (étage 17), seule la Chambre de la Maison du héros
// (`chosenHouse`) s'illumine et l'accueille ; les trois autres restent hostiles
// et muettes (règle d'illumination §10.5, saveurs de Maison §10.6). Étage-scène
// House-aware, one-shot, qui déverrouille l'écho de Chambre (codex). Comme les
// beats 1/4/8 : pur affichage textuel, AUCUNE incidence sur la génération.
const CHAMBER_FLOOR = 17;
const FOUNDER_CHAMBERS = {
  Gryffondor: {
    chamber: "la Chambre du Lion", founder: 'Godric', emoji: '🦁', echoId: 'echo_chamber_gryffondor',
    narrative: "Le Cœur runique s'ouvre sur quatre caveaux scellés. Trois restent froids et muets — mais à ton approche, la Chambre du Lion s'embrase : des brasiers se rallument seuls le long d'une salle de garde où quelqu'un, jadis, a refusé de fuir. La voix de Godric monte des flammes et te reconnaît — on ne scelle pas par peur, on tient la porte.",
    toast: "🦁 La Chambre du Lion s'embrase — Godric te reconnaît.",
  },
  Serpentard: {
    chamber: "la Chambre du Serpent", founder: 'Salazar', emoji: '🐍', echoId: 'echo_chamber_serpentard',
    narrative: "Le Cœur runique s'ouvre sur quatre caveaux scellés. Trois gardent leurs verrous clos — mais devant la Chambre du Serpent, les serrures cèdent seules, une pierre pivote, un passage gris s'offre à toi seul. La voix de Salazar glisse entre les runes et te laisse entrer — il a scellé sa part avec sa faute.",
    toast: "🐍 La Chambre du Serpent se descelle — Salazar te laisse passer.",
  },
  Serdaigle: {
    chamber: "la Chambre de l'Aigle", founder: 'Rowena', emoji: '🦅', echoId: 'echo_chamber_serdaigle',
    narrative: "Le Cœur runique s'ouvre sur quatre caveaux scellés. Trois gardent leurs runes illisibles — mais dans la Chambre de l'Aigle, les glyphes se traduisent d'eux-mêmes sous ton regard, ligne après ligne, comme s'ils n'avaient attendu qu'un œil qui sait lire. La voix de Rowena affleure des gravures — comprends, et la faille apparaît.",
    toast: "🦅 La Chambre de l'Aigle se traduit — Rowena t'accueille.",
  },
  Poufsouffle: {
    chamber: "la Chambre du Blaireau", founder: 'Helga', emoji: '🦡', echoId: 'echo_chamber_poufsouffle',
    narrative: "Le Cœur runique s'ouvre sur quatre caveaux scellés. Trois exhalent un froid hostile — mais la Chambre du Blaireau t'offre, au cœur du gel, une alcôve tiède où l'on pourrait reprendre souffle ensemble. La voix de Helga monte du sol et veille sur toi — elle a creusé un abri pour ceux qui resteraient.",
    toast: "🦡 La Chambre du Blaireau t'abrite — Helga veille sur toi.",
  },
};

// Résolveur PUR : beat de Chambre pour la Maison du héros à l'étage 17, sinon null.
function getFounderChamberBeat(floor, chosenHouse) {
  if (floor !== CHAMBER_FLOOR) return null;
  if (!chosenHouse) return null;
  return FOUNDER_CHAMBERS[chosenHouse] || null;
}

// Orchestrateur one-shot : joue le beat de Chambre à la 1re entrée de l'étage 17.
// Sentinelle string distincte dans seenScriptedBeat (ne heurte pas les clés
// d'étage int 1/4/8). Déverrouille l'écho de Chambre dans seenEchoes (codex).
// No-op silencieux si l'état/les helpers manquent (file://).
const _CHAMBER_SEEN_KEY = 'founder_chamber';
function maybeFounderChamberBeat(floor) {
  const hero = (typeof chosenHouse !== 'undefined') ? chosenHouse : null;
  const beat = getFounderChamberBeat(floor, hero);
  if (!beat) return false;
  if (typeof seenScriptedBeat === 'undefined' || !seenScriptedBeat) return false;
  if (seenScriptedBeat.has(_CHAMBER_SEEN_KEY)) return false;
  seenScriptedBeat.add(_CHAMBER_SEEN_KEY);
  if (typeof setNarrative === 'function') setNarrative(beat.narrative);
  if (typeof addMsg === 'function') addMsg('📜 ' + beat.toast, 'narrative');
  if (typeof seenEchoes !== 'undefined' && seenEchoes && beat.echoId) seenEchoes.add(beat.echoId);
  // Robinet `echo` du Codex : la Chambre d'un Fondateur perçue peut révéler
  // l'écho du scellement (défensif, no-op hors runtime jeu / sandbox tests).
  if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('echo-chamber');
  return true;
}

// ── Application de la corruption (overlay givre) ─────────────
// Appelée à chaque changement d'étage. Règle l'opacité de #frost-overlay.
// Défensif : no-op si l'élément manque (file:// smoke, DOM absent).
// Le facteur 0.28 maintient le givre discret (max ~35 % à corruption 1.3).
const _FROST_FACTOR = 0.28;
function _applyCorruptionAmbiance(floor) {
  const el = (typeof safeEl === 'function') ? safeEl('frost-overlay') : document.getElementById('frost-overlay');
  if (!el) return;
  const va = (typeof victoryAchieved !== 'undefined') ? victoryAchieved : false;
  const c  = corruptionLevel(floor, va);
  el.style.opacity = String(Math.min(0.35, c * _FROST_FACTOR));
}

// ── Pic de givre sur écho temporel (P-D4) ───────────────────────
// Élève brièvement #frost-overlay au-dessus de la baseline de corruption
// (la transition CSS de 1.2 s lisse la montée), puis ré-applique la baseline.
// Appelé par movement.js quand un écho temporel s'affiche. Défensif.
function pulseFrostOverlay() {
  const el = (typeof safeEl === 'function') ? safeEl('frost-overlay') : document.getElementById('frost-overlay');
  if (!el) return;
  const base = parseFloat(el.style.opacity) || 0;
  el.style.opacity = String(Math.min(0.6, base + 0.3));
  setTimeout(() => {
    if (typeof _applyCorruptionAmbiance === 'function' && typeof currentFloor !== 'undefined') {
      _applyCorruptionAmbiance(currentFloor);
    } else {
      el.style.opacity = String(base);
    }
  }, 900);
}

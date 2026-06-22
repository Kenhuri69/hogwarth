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
        "Le battement a un nom, ici : le Dormeur des Fondations. Tu marches sur ce que les Quatre tinrent clos.",
        "Sous la lumière froide, le Dormeur respire sans s'éveiller — son sommeil EST la magie brute qui irradie.",
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

// ── Thermomètre de corruption (P2.1) ─────────────────────────
// Paliers discrets 0–5 dérivés du niveau continu (pur). Palier 0 = masqué
// (étages 1-2, corruption négligeable) ; 5 = saturé (étage 14+ / Boucle).
function corruptionTier(level) {
  const l = (typeof level === 'number' && level > 0) ? level : 0;
  if (l < 0.15) return 0;
  if (l < 0.35) return 1;
  if (l < 0.55) return 2;
  if (l < 0.75) return 3;
  if (l < 1.00) return 4;
  return 5;
}

const _CORRUPTION_TIER_LABELS = ['', 'naissante', 'diffuse', 'tenace', 'profonde', 'abyssale'];

// HTML du thermomètre : ❄ pleins (palier) + · ternes (reste sur 5) + libellé.
// Pur. Chaîne vide au palier 0 (le caller masque alors l'élément).
function corruptionThermometerHtml(level) {
  const t = corruptionTier(level);
  if (t === 0) return '';
  const flakes = '❄'.repeat(t);
  const dim    = '·'.repeat(5 - t);
  const label  = _CORRUPTION_TIER_LABELS[t] || '';
  return '<span class="corruption-flakes" aria-hidden="true">' + flakes +
         '<span class="corruption-dim">' + dim + '</span></span>' +
         '<span class="corruption-label">Corruption ' + label + '</span>';
}

// Dernier palier de corruption affiché — sert à détecter un FRANCHISSEMENT
// (montée de palier) pour déclencher le feedback (H3). `null` = pas encore
// initialisé (premier affichage : on mémorise sans déclencher).
let _lastCorruptionTier = null;

// Réinitialise le suivi de palier (le prochain affichage mémorisera sans
// déclencher). À appeler quand l'étage courant change SANS descente naturelle
// — chargement d'une sauvegarde profonde — pour éviter un faux franchissement.
function _resetCorruptionTierTracking() { _lastCorruptionTier = null; }

// Feedback de franchissement de palier (H3) : pic de givre + grondement sourd
// + pulse du thermomètre + ligne de journal discrète. Tout est défensif.
function _onCorruptionTierRise(tier) {
  const el = (typeof safeEl === 'function') ? safeEl('corruption-meter') : document.getElementById('corruption-meter');
  if (el) {
    el.classList.remove('corruption-rise');
    void el.offsetWidth;            // reflow → rejoue l'animation si rappelée vite
    el.classList.add('corruption-rise');
    setTimeout(() => el && el.classList.remove('corruption-rise'), 1200);
  }
  if (typeof pulseFrostOverlay === 'function') pulseFrostOverlay();
  if (typeof AudioSystem !== 'undefined' && AudioSystem.playCorruptionRise) {
    AudioSystem.playCorruptionRise();
  }
  if (window.HAPTICS_safe) HAPTICS_safe.cast();
  const label = _CORRUPTION_TIER_LABELS[tier] || '';
  if (typeof addMsg === 'function' && label) {
    addMsg('🌑 La corruption s’épaissit — elle devient ' + label + '.', '');
  }
}

// Met à jour le thermomètre HUD #corruption-meter. Défensif (no-op si DOM
// absent — file:// smoke). Masqué au palier 0.
function _updateCorruptionMeter(floor) {
  const el = (typeof safeEl === 'function') ? safeEl('corruption-meter') : document.getElementById('corruption-meter');
  if (!el) return;
  const va = (typeof victoryAchieved !== 'undefined') ? victoryAchieved : false;
  const f  = (typeof floor === 'number' && floor > 0)
    ? floor : ((typeof currentFloor !== 'undefined') ? currentFloor : 1);
  const c    = corruptionLevel(f, va);
  const tier = corruptionTier(c);
  // Franchissement d'un palier vers le HAUT (pas au tout premier affichage,
  // ni en remontant) → feedback flash + son.
  if (_lastCorruptionTier !== null && tier > _lastCorruptionTier) {
    _onCorruptionTierRise(tier);
  }
  _lastCorruptionTier = tier;
  if (tier === 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.innerHTML = corruptionThermometerHtml(c);
  el.style.display = 'block';
  el.setAttribute('title', 'Niveau de corruption de l’étage — il monte à mesure que tu descends');
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

// ── Biais de génération par Maison — V2 (perception déterministe) ──
// Ch.10 §10.6 (V2). « Ma Maison change ce que je VOIS » : couche de
// perception attachée aux COORDONNÉES d'une salle (déterministe par
// floor/x/y), donc persistante et mappable — contrairement à
// houseAmbianceLine (V1) qui donne une ligne fixe par zone, tirée au hasard
// à l'entrée. Ici chaque salle « notable » porte une observation propre à la
// Maison, toujours la même à cet endroit.
//
// ⚠️ POWER-NEUTRAL STRICT (garde-fou cardinal Ch.13) : effet PUREMENT TEXTUEL.
// Aucune cellule fonctionnelle, aucun butin, aucun jet de `Math.random`
// (donc invisible au simulateur d'équilibrage `tools/sim-difficulty.js`),
// aucune stat. Les 4 Maisons restent rigoureusement équivalentes en puissance
// — seule la SAVEUR diffère. Gate de repli : `houseGenBiasEnabled` (state.js).
const HOUSE_PERCEPTION = {
  Gryffondor: [
    "Des éraflures d'armes balafrent ce mur : ici, quelqu'un a tenu bon.",
    "Une vieille position de combat se devine — on a refusé de fuir, à cet endroit.",
    "Le sol porte la marque d'un brasier ; un courage s'y est consumé.",
    "Un écusson écaillé pend de travers, mais il tient encore au mur.",
  ],
  Serpentard: [
    "Une pierre descellée laisse deviner un passage que d'autres n'ont pas vu.",
    "Un joint trop net dans la maçonnerie : quelque chose s'ouvre, pour qui sait regarder.",
    "Une serrure ancienne affleure sous le lichen — discrète, presque oubliée.",
    "L'ombre s'épaissit dans un angle ; un raccourci s'y cache peut-être.",
  ],
  Serdaigle: [
    "Une rune à demi effacée orne le linteau — elle attend un œil qui sait lire.",
    "Des glyphes courent le long d'une corniche, comme une phrase laissée en suspens.",
    "Un motif gravé se répète au sol : un sens s'y dissimule, méthodique.",
    "Une inscription pâle luit faiblement — un savoir gardé, pas tout à fait perdu.",
  ],
  Poufsouffle: [
    "Un renfoncement abrité pourrait offrir un répit à qui sait s'y blottir.",
    "Une alcôve tiède veille dans un coin : quelqu'un pourrait y reprendre souffle.",
    "Des traces d'un campement ancien — d'autres ont tenu, ici, ensemble.",
    "Un creux à l'écart du passage : un refuge discret, pour ne lâcher personne.",
  ],
};

// Taux de salles « notables » (pour-cent). Calibré bas : la perception reste un
// assaisonnement, pas un marquage de chaque pièce.
const HOUSE_PERCEPTION_RATE = 24;

// Hash entier déterministe et stable (pas de Math.random) sur (floor,x,y).
function _housePerceptionHash(floor, x, y) {
  let h = (((floor | 0) * 73856093) ^ ((x | 0) * 19349663) ^ ((y | 0) * 83492791)) >>> 0;
  h ^= h >>> 13; h = (h * 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

// PUR : retourne l'observation de Maison pour une salle (floor,x,y), ou null
// si la salle n'est pas « notable » / Maison absente. Déterministe : même
// (house,floor,x,y) → même résultat. Aucun effet de bord.
function housePerceptionLine(house, floor, x, y) {
  if (!house) return null;
  const pool = HOUSE_PERCEPTION[house];
  if (!pool || !pool.length) return null;
  const h = _housePerceptionHash(floor, x, y);
  if ((h % 100) >= HOUSE_PERCEPTION_RATE) return null;   // salle ordinaire
  return pool[(h >>> 8) % pool.length];
}

// ── Biais de génération par Maison V2 — « pondération de salles » ────────────
// Levier STRUCTUREL power-neutral : il réoriente la SAVEUR du puzzle bonus
// (rune vs stèle) selon la Maison, SANS toucher le budget de coffres. Les deux
// puzzles scellent chacun 1 coffre et `P(puzzle présent) = 1−(1−0.20)(1−0.30)
// = 0.44` est SYMÉTRIQUE : inverser l'ordre des tirages préserve 0.44 à
// l'identique (cf. plan house-generation-bias-v2-rooms.md). Seul 🦅 Serdaigle
// (« +stèles d'énigme ») admet une réallocation reward-équivalente ; les autres
// Maisons gardent l'ordre V1 (leur saveur de salle reste portée par la couche
// perception + le refuge commun, déjà iso-ressources). PUR / déterministe /
// défensif. Consommé par dungeon.js, gaté `houseGenBiasEnabled`.
//
// `affinity` documente l'intention spec des 4 Maisons (extensible) ;
// `puzzlePreference` est la seule clé STRUCTURELLEMENT câblée (équité).
const HOUSE_ROOM_BIAS = {
  Gryffondor:  { affinity: 'valor',  puzzlePreference: null },     // marques de bataille (perception)
  Serpentard:  { affinity: 'secret', puzzlePreference: null },     // passages descellés (perception + secret commun)
  Serdaigle:   { affinity: 'lore',   puzzlePreference: 'stele' },  // +stèles d'énigme (structurel, neutre)
  Poufsouffle: { affinity: 'refuge', puzzlePreference: null },     // recoins-refuge (refuge commun)
};

// PUR : retourne le profil de biais de salle d'une Maison, ou un profil neutre
// (puzzlePreference null = ordre V1) si la Maison est absente/inconnue.
function houseRoomBias(house) {
  const b = house && HOUSE_ROOM_BIAS[house];
  return b ? b : { affinity: null, puzzlePreference: null };
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
  // ── Ruines Anciennes (Zone D, atteignable en Boucle) ─────────────
  // 15 : seuil des Mégalithes — la Stèle de Rowena nomme la corruption.
  15: {
    id: 'vestige_megalithes',
    narrative: "Les murs cèdent à des monolithes trop grands pour une main humaine. Au centre d'une salle sans angle droit, une stèle d'aigle te fixe : Rowena y grava, avant les maisons, le nom de ce que les Quatre vinrent enfouir. « Comprends, et la faille apparaît. » Sous la corruption qui suinte des dolmens, tu sens que l'école ne fut pas bâtie ICI — elle fut bâtie PAR-DESSUS, pour oublier.",
    toast: "🦅 Le Vestige des Mégalithes — Rowena nomme ce que l'on a enfoui.",
  },
  // 21 : seuil de l'Avant-Monde — le battement du Dormeur.
  21: {
    id: 'battement_dormeur',
    narrative: "Plus de runes. Plus de chant. À leur place, un battement lent, énorme, organique, qui monte du sol comme d'une poitrine. Ici commence l'Avant-Monde — avant l'écriture, avant la pierre taillée. Le battement a un nom que nul Fondateur n'osa écrire : le Dormeur des Fondations. Tu marches sur ce que les Quatre tinrent clos. Ne descends pas pour le réveiller — descends pour savoir que tu l'as effleuré, et remonte.",
    toast: "🫀 Le Battement — le Dormeur des Fondations rêve sous tes pas.",
  },
};

// Beat « Grande Salle » (Ch.14 §14.3.2) — variante POST-VICTOIRE de l'étage 1.
// Joué au premier retour réel en haut après victoire : un mot de Dumbledore
// depuis son cadre, l'école qui respire à nouveau. Cosmétique, non-bloquant.
const GRANDE_SALLE_BEAT = {
  id: 'grande_salle',
  narrative: "Tu es remonté. Le givre a fondu des fenêtres ; un soleil pâle traverse de nouveau les grands vitraux. Dans son cadre, Dumbledore lève les yeux de son livre et te sourit, sans surprise : « Tu es redescendu jusqu'au fond, et tu es revenu. Peu en sont capables. » Autour de toi, l'école respire — les escaliers recommencent à tourner. Mais sous tes pieds, très loin, quelque chose veille encore.",
  toast: "La Grande Salle — l'école respire à nouveau. Dumbledore te salue d'un cadre.",
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
  // Variante post-victoire de l'étage 1 : beat « Grande Salle » (Ch.14 §14.3.2).
  // One-shot via son propre flag (seenScriptedBeat contient déjà l'étage 1).
  // Prioritaire sur seuil_familier dès que victoryAchieved.
  if (floor === 1
      && typeof victoryAchieved !== 'undefined' && victoryAchieved
      && typeof GRANDE_SALLE_BEAT !== 'undefined'
      && typeof grandeSalleBeatSeen !== 'undefined' && !grandeSalleBeatSeen) {
    grandeSalleBeatSeen = true;
    if (typeof setNarrative === 'function') setNarrative(GRANDE_SALLE_BEAT.narrative);
    if (typeof addMsg === 'function') addMsg('📜 ' + GRANDE_SALLE_BEAT.toast, 'narrative');
    return true;
  }
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
  // §1.4 C — voir l'écho d'un Fondateur octroie sa relique vocale (one-shot).
  if (typeof grantVoiceRelicForEcho === 'function' && beat.echoId) grantVoiceRelicForEcho(beat.echoId);
  // Robinet `echo` du Codex : la Chambre d'un Fondateur perçue peut révéler
  // l'écho du scellement (défensif, no-op hors runtime jeu / sandbox tests).
  if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('echo-chamber');
  return true;
}

// ── Écho de signature en Boucle (V2 — ch.11 §11.8.1 / §11.8.3) ──────────
// À l'entrée des Ruines Anciennes (étage 14, début de la Boucle 2), la quête
// signature accomplie dans les Actes I-III REVIENT, déchirée/altérée. Selon que
// la signature de la Maison du héros a été remise (`<house>SignatureDone`) ou
// laissée en plan, le beat joue une variante « aboutissement emporté » (braise
// qui tient / pacte prolongé / codex ténébreux / refuge rétabli) ou « dette
// narrative » (Bannière éteinte / pacte muet / page illisible / abri vide).
// Serpentard distingue en plus le pacte scellé du défi (`slythPactChoice`).
// Pur affichage textuel, one-shot, AUCUNE incidence sur la génération — même
// patron que maybeFounderChamberBeat. V2 reste cosmétique (§11.11.2) : la
// version « mini-quête de Boucle » (spawns/récompenses) est différée.
const SIGNATURE_FLOOR = 14;
const _SIGNATURE_SEEN_KEY = 'signature_echo';
const SIGNATURE_ECHOES = {
  Gryffondor: {
    flag: 'gryffSignatureDone', echoId: 'echo_signature', emoji: '🦁',
    done: {
      narrative: "Plus bas dans les Ruines, l'Étendard de Godric revient — déchiré, noirci, planté de travers dans la roche-mère. Mais sous la cendre, une braise tient encore : la Bannière que tu as rallumée jadis refuse de s'éteindre, même ici. Le courage que tu as prouvé descend avec toi.",
      toast: "🦁 L'Étendard de Godric — déchiré, mais la braise tient.",
    },
    undone: {
      narrative: "Plus bas dans les Ruines, une hampe nue se dresse dans la roche-mère : l'Étendard de Godric, jamais rallumé. La Bannière pend, déchirée, éteinte. Tu descends avec une dette — le brasier que tu n'as pas ravivé manque, ici, plus que partout ailleurs.",
      toast: "🦁 L'Étendard reste éteint — tu descends avec une dette.",
    },
  },
  Serpentard: {
    flag: 'slythSignatureDone', echoId: 'echo_signature', emoji: '🐍',
    donePact: {
      narrative: "Dans un couloir descellé, l'écho du Pacte des Cachots t'attend pour une dernière passation. Le serpent reconnaît le pacte que tu as scellé : les serrures cèdent seules devant toi, et une voix basse murmure que tout gain, ici encore, garde son ombre.",
      toast: "🐍 Le Pacte des Cachots — une dernière passation t'est offerte.",
    },
    doneDefiance: {
      narrative: "Dans un couloir descellé, l'écho du Pacte des Cachots revient — mais tu l'as refusé, jadis. Le serpent te laisse passer quand même, presque amusé : on n'a pas besoin d'un pacte pour descendre, seulement du cran de regarder ce qu'on refuse.",
      toast: "🐍 Le Pacte refusé — le serpent te laisse passer, amusé.",
    },
    undone: {
      narrative: "Dans un couloir qui reste clos, l'écho du Pacte des Cachots t'ignore : tu n'as jamais scellé, ni refusé. Les serrures restent muettes, le passage gris ne s'ouvre pas. Une affaire laissée inachevée pèse plus bas qu'en haut.",
      toast: "🐍 Le Pacte inachevé — les serrures restent muettes.",
    },
  },
  Serdaigle: {
    flag: 'ravenSignatureDone', echoId: 'echo_signature', emoji: '🦅',
    done: {
      narrative: "Sur un pan de roche, le Codex de Rowena que tu as reconstitué gagne ici ses pages ténébreuses : les glyphes se prolongent d'eux-mêmes, plus bas, plus sombres, vers une énigme que les Ruines n'avaient jamais laissé lire. Comprendre, c'est descendre — et tu sais déjà lire.",
      toast: "🦅 Le Codex de Rowena gagne ses pages ténébreuses.",
    },
    undone: {
      narrative: "Sur un pan de roche, des glyphes s'enchaînent vers une page que tu ne peux pas lire : le Codex de Rowena, jamais reconstitué, te laisse aveugle au seuil de sa vérité ténébreuse. Le savoir manquant est une porte close de plus.",
      toast: "🦅 Le Codex amputé — la page ténébreuse reste illisible.",
    },
  },
  Poufsouffle: {
    flag: 'poufSignatureDone', echoId: 'echo_signature', emoji: '🦡',
    done: {
      narrative: "Entre deux racines géantes, l'écho du Refuge revient — précaire, menacé par le gel, mais tu sais le rétablir : les présences que tu n'as pas laissées derrière jadis veillent encore, une alcôve tiède se rouvre. On ne descend pas seul quand on a appris à ne pas abandonner.",
      toast: "🦡 Le Refuge à rétablir — ceux que tu n'as pas laissés veillent.",
    },
    undone: {
      narrative: "Entre deux racines géantes, un Refuge vide exhale un froid hostile : tu n'as veillé personne, jadis, et nul ne veille ici. L'alcôve reste close, l'abri jamais creusé. Descendre sans avoir tenu la main de quiconque pèse, plus bas, comme une absence.",
      toast: "🦡 Le Refuge vide — tu descends sans personne derrière toi.",
    },
  },
};

// Lecture défensive du flag de signature par Maison (globals `let`, scope
// déclaratif → pas indexables par nom sur window). Injectables en sandbox tests.
function _signatureDoneFor(house) {
  switch (house) {
    case 'Gryffondor':  return (typeof gryffSignatureDone !== 'undefined') && !!gryffSignatureDone;
    case 'Serpentard':  return (typeof slythSignatureDone !== 'undefined') && !!slythSignatureDone;
    case 'Serdaigle':   return (typeof ravenSignatureDone !== 'undefined') && !!ravenSignatureDone;
    case 'Poufsouffle': return (typeof poufSignatureDone !== 'undefined') && !!poufSignatureDone;
    default: return false;
  }
}

// Résolveur PUR : beat d'écho de signature à l'étage 14 pour la Maison du héros,
// variante selon `signatureDone` (+ `pactChoice` pour Serpentard), sinon null.
function getSignatureEchoBeat(floor, chosenHouse, signatureDone, pactChoice) {
  if (floor !== SIGNATURE_FLOOR) return null;
  if (!chosenHouse) return null;
  const sig = SIGNATURE_ECHOES[chosenHouse];
  if (!sig) return null;
  let variant;
  if (chosenHouse === 'Serpentard' && signatureDone) {
    variant = (pactChoice === 'pact') ? sig.donePact : sig.doneDefiance;
  } else if (signatureDone) {
    variant = sig.done;
  } else {
    variant = sig.undone;
  }
  return { narrative: variant.narrative, toast: variant.toast, echoId: sig.echoId, emoji: sig.emoji };
}

// Orchestrateur one-shot : joue l'écho de signature à la 1re entrée de l'étage 14.
// Sentinelle string dédiée dans seenScriptedBeat (distincte des clés int 1/4/8
// et de 'founder_chamber'). Déverrouille l'écho `echo_signature` (codex).
// No-op silencieux si l'état/les helpers manquent (file://).
function maybeSignatureEchoBeat(floor) {
  const hero = (typeof chosenHouse !== 'undefined') ? chosenHouse : null;
  const done = _signatureDoneFor(hero);
  const pact = (typeof slythPactChoice !== 'undefined') ? slythPactChoice : null;
  const beat = getSignatureEchoBeat(floor, hero, done, pact);
  if (!beat) return false;
  if (typeof seenScriptedBeat === 'undefined' || !seenScriptedBeat) return false;
  if (seenScriptedBeat.has(_SIGNATURE_SEEN_KEY)) return false;
  seenScriptedBeat.add(_SIGNATURE_SEEN_KEY);
  if (typeof setNarrative === 'function') setNarrative(beat.narrative);
  if (typeof addMsg === 'function') addMsg('📜 ' + beat.toast, 'narrative');
  if (typeof seenEchoes !== 'undefined' && seenEchoes && beat.echoId) seenEchoes.add(beat.echoId);
  // §1.4 C — voir l'écho d'un Fondateur octroie sa relique vocale (one-shot).
  if (typeof grantVoiceRelicForEcho === 'function' && beat.echoId) grantVoiceRelicForEcho(beat.echoId);
  if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('echo-signature');
  return true;
}

// ── Voix des Ruines — beat solennel 13↔14 (P3 — ch.06 §6.9.4, ch.04 §4.5) ──
// Au franchissement de la frontière de tranche 13→14 (entrée des Ruines
// Anciennes), un beat SOLENNEL universel marque le passage de tout ce qui est
// Poudlard vers des ruines pré-école. DISTINCT de l'écho de signature
// (maybeSignatureEchoBeat, floor 14, house-aware) : ici aucun lien à la Maison,
// registre soutenu, voix des Ruines plutôt que voix scolaire.
// C'est un TOAST (§4.5 « toast solennel dédié ») — l'écho de signature détient
// déjà le panneau de narration à l'étage 14 ; les deux toasts coexistent.
// One-shot via seenScriptedBeat (sentinelle string, comme 'signature_echo').
const VOIX_DES_RUINES_KEY = 'voix_des_ruines';
const VOIX_DES_RUINES = {
  toast: "🪨 La Voix des Ruines : « Sous Poudlard, la pierre n'a plus de nom. Tu entres dans ce que l'école fut bâtie pour oublier — antérieur aux Fondateurs, à toute main humaine. »",
};

// Résolveur PUR : vrai uniquement au franchissement strict 13→14 (descente).
// Les transitions internes à une tranche ou la remontée ne le déclenchent pas.
function isVoixDesRuinesCrossing(prevFloor, nextFloor) {
  return typeof prevFloor === 'number' && typeof nextFloor === 'number'
    && prevFloor <= 13 && nextFloor >= 14 && nextFloor > prevFloor;
}

// Orchestrateur one-shot : joue le toast solennel à la 1re entrée des Ruines.
// Sentinelle 'voix_des_ruines' dans seenScriptedBeat (distincte des clés int
// 1/4/8, de 'founder_chamber' et de 'signature_echo'). No-op silencieux si
// l'état/les helpers manquent (file://) ou si déjà joué.
function maybeVoixDesRuinesBeat(prevFloor, nextFloor) {
  if (!isVoixDesRuinesCrossing(prevFloor, nextFloor)) return false;
  if (typeof seenScriptedBeat === 'undefined' || !seenScriptedBeat) return false;
  if (seenScriptedBeat.has(VOIX_DES_RUINES_KEY)) return false;
  seenScriptedBeat.add(VOIX_DES_RUINES_KEY);
  if (typeof addMsg === 'function') addMsg(VOIX_DES_RUINES.toast, 'narrative');
  return true;
}

// ── Application de la corruption (overlay givre) ─────────────
// Appelée à chaque changement d'étage. Règle l'opacité de #frost-overlay.
// Défensif : no-op si l'élément manque (file:// smoke, DOM absent).
// Le facteur 0.28 maintient le givre discret (max ~35 % à corruption 1.3).
const _FROST_FACTOR = 0.28;
// Boucle Ténébreuse (V1 — ch.11 §11.7.3) : l'intensité du givre croît avec le
// niveau de Boucle, mais reste BORNÉE (lisibilité — on n'aveugle jamais).
const _FROST_PER_LOOP       = 0.03;  // +3 % d'opacité par niveau de Boucle
const _FROST_LOOP_BONUS_CAP = 0.10;  // plafond du bonus cumulé de Boucle
const _FROST_LOOP_CAP       = 0.45;  // plafond absolu d'opacité du givre
function _applyCorruptionAmbiance(floor) {
  const el = (typeof safeEl === 'function') ? safeEl('frost-overlay') : document.getElementById('frost-overlay');
  if (!el) return;
  const va = (typeof victoryAchieved !== 'undefined') ? victoryAchieved : false;
  const c  = corruptionLevel(floor, va);
  let opacity = Math.min(0.35, c * _FROST_FACTOR);
  // Surcouche de Boucle : bonus dérivé de loopNumber(floorReached), borné.
  if (va && typeof loopNumber === 'function' && typeof floorReached !== 'undefined') {
    const loopBonus = Math.min(_FROST_LOOP_BONUS_CAP, loopNumber(floorReached) * _FROST_PER_LOOP);
    opacity = Math.min(_FROST_LOOP_CAP, opacity + loopBonus);
  }
  el.style.opacity = String(opacity);
  // P2.1 — synchronise le thermomètre HUD avec l'overlay (même point de cycle).
  if (typeof _updateCorruptionMeter === 'function') _updateCorruptionMeter(floor);
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

// ============================================================
// P4 — Modificateurs d'environnement de combat (combat-system-synthesis §1.4)
// ------------------------------------------------------------
// Helper PUR : calcule un objet de modificateurs dérivé du THÈME d'étage
// (zone D « Ruines », runique) au démarrage d'un combat. V1 = 1 seul
// modificateur — la « charge runique ambiante » : +10 % aux sorts feu/foudre
// et déblocage de l'action 🌿 « Activer la rune » (étourdissement, 1×/combat).
//
// `runic` est vrai quand le tileset est runique : zone D (étage 14+,
// getFloorTheme().wall === 'rune_wall') OU override post-victoire (étage 11+
// avec victoryAchieved — le renderer bascule alors sur rune_* dès l'étage 11).
// Ne lit aucun état mutable interne : tout passe par les arguments → testable.
function computeEnvModifiers(floor, victoryAchieved) {
  const f = (typeof floor === 'number' && isFinite(floor)) ? floor : 1;
  const theme = (typeof getFloorTheme === 'function') ? getFloorTheme(f) : null;
  const runicTheme = !!(theme && theme.wall === 'rune_wall');
  const runicOverride = !!(victoryAchieved && f >= 11);
  const runic = runicTheme || runicOverride;
  return {
    runic,
    // Bonus élémentaire ambiant (additif, appliqué après résist/faiblesse/crit).
    spellElemBonus: runic ? { feu: 0.10, foudre: 0.10 } : {}
  };
}

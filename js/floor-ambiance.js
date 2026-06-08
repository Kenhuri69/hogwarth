// ============================================================
// FLOOR AMBIANCE — Descriptions d'ambiance zonées + corruption
// ============================================================
// Module PUR (aucun état, aucune sérialisation) chargé juste après
// floor-themes.js. Consomme getFloorTheme() pour rester cohérent
// avec la source unique de vérité des zones.
//
// Surfaces publiques :
//   ZONE_AMBIANCE       — données par clé de thème
//   getFloorAmbiance(f) — pur, retourne l'entrée ZONE_AMBIANCE
//   corruptionLevel(f, victoryAchieved) — pur, 0.0→1.3
//   HOUSE_AMBIANCE_MOD  — lignes cosmétiques par Maison
//   houseAmbianceLine(chosenHouse) — null si Maison absente
//
// Voir .claude/plans/chapters-04-10-lieux-ambiance.md §B.
// Textes : docs/histoire/10-lieux-et-geographie.md §10.2, §10.6.
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
  // Ton : solennité mythique, antérieur à l'école, hors-temps
  ancient: {
    floorLines: [
      "Tu n'explores plus un château. Tu explores ce qui était là avant tous.",
      "Les runes pulsent sur les murs, le sol, le plafond — elles commentent ta présence.",
      "Un chant runique continu, grave, sans source apparente. Aucun écho de pas.",
      "Le froid n'est plus une sensation. C'est un état du lieu — hors-temps, hors-saison.",
      "Minéral pur, ozone, et une note antérieure à toute vie.",
      "Les angles dérangent. Les proportions sont fausses. Ceux qui ont bâti cela n'étaient pas humains.",
    ],
    smell:  ["minéral pur", "ozone", "une note antérieure à toute vie"],
    sound:  ["chant runique grave", "silence absolu de pas", "voix anciennes à la limite de l'audible"],
    temp:   "surnaturelle",
  },
};

// ── Résolveur pur ────────────────────────────────────────────
// Retourne l'entrée ZONE_AMBIANCE correspondant à l'étage `floor`.
// Toujours sûr : un étage invalide tombe sur la zone hogwarts
// (identique au fallback de getFloorTheme).
function getFloorAmbiance(floor) {
  if (typeof getFloorTheme !== 'function') return ZONE_AMBIANCE.hogwarts;
  const theme = getFloorTheme(floor);
  // Retrouver la clé du thème dans FLOOR_THEMES (la référence d'objet
  // est partagée, on peut faire une recherche par identité).
  if (typeof FLOOR_THEMES !== 'undefined') {
    for (const [key, t] of Object.entries(FLOOR_THEMES)) {
      if (t === theme) return ZONE_AMBIANCE[key] || ZONE_AMBIANCE.hogwarts;
    }
  }
  // Fallback par valeur du champ ambient
  if (theme && theme.ambient) {
    const byAmbient = {
      intro:   ZONE_AMBIANCE.hogwarts,
      dungeon: ZONE_AMBIANCE.dungeons,
      depths:  ZONE_AMBIANCE.depths,
      abyss:   ZONE_AMBIANCE.ancient,
    };
    return byAmbient[theme.ambient] || ZONE_AMBIANCE.hogwarts;
  }
  return ZONE_AMBIANCE.hogwarts;
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
// Textes : docs/histoire/10-lieux-et-geographie.md §10.6.
const HOUSE_AMBIANCE_MOD = {
  Serpentard:  { extraLine: "Une pierre a bougé ici récemment — d'autres n'ont pas vu ce passage.", flavor: "secret"  },
  Gryffondor:  { extraLine: "Une marque de bataille : quelqu'un a tenu ici, et n'a pas fui.",       flavor: "valor"   },
  Serdaigle:   { extraLine: "Une glyphe à demi effacée attend un œil qui sait lire.",               flavor: "lore"    },
  Poufsouffle: { extraLine: "Un recoin abrité — on pourrait y reprendre souffle, ensemble.",         flavor: "refuge"  },
};

// Retourne la ligne d'ambiance de Maison, ou null si Maison absente/inconnue.
function houseAmbianceLine(chosenHouse) {
  if (!chosenHouse) return null;
  return (HOUSE_AMBIANCE_MOD[chosenHouse] && HOUSE_AMBIANCE_MOD[chosenHouse].extraLine) || null;
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

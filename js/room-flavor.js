// ============================================================
// ROOM FLAVOR — Phrases d'atmosphère à l'entrée de salle (I1)
// ============================================================
// Donjon vivant : à l'entrée d'une nouvelle salle, affiche parfois une
// courte phrase d'ambiance teintée par la zone (getFloorTheme().ambient).
// PUR cosmétique : effet textuel uniquement (addMsg), n'altère aucun état
// de jeu / save / RNG de simulation. Anti-répétition en variable transiente
// (jamais sérialisée). Call-site défensif depuis movement.js. Texte (≠
// mouvement/visuel) → non gardé par reduced-motion, comme les barks F2.
//
//   maybeRoomFlavor(floor)       → roll de throttle ; si pass, addMsg d'une
//                                  phrase de la zone (≠ la précédente).
//                                  Retourne true si une phrase a été affichée.
//   RoomFlavor.pickFlavor(zone)  → cœur testable : phrase de la zone, avec
//                                  anti-répétition. null si zone inconnue/vide.

(function () {
  'use strict';

  // Pool de phrases par zone d'ambiance (du familier à l'oppressant).
  const FLAVOR = {
    intro: [
      "Les torches crépitent ; une armure grince quelque part dans le château.",
      "Un courant d'air porte l'écho lointain d'un cours de potions.",
      "Le portrait d'un sorcier assoupi ronfle doucement contre le mur.",
      "Des pas feutrés résonnent au loin — ou n'est-ce que ton imagination ?",
    ],
    dungeon: [
      "L'air se fait plus froid ; l'humidité suinte des vieilles pierres.",
      "Une odeur de moisi et de cire éteinte flotte dans la salle.",
      "Quelque chose a remué dans l'ombre, juste hors de portée de ta lumière.",
      "Les murs semblent se resserrer à mesure que tu t'enfonces.",
    ],
    depths: [
      "Un grondement sourd monte des profondeurs, sous tes pieds.",
      "La pierre, ici, n'a pas vu la lumière depuis des siècles.",
      "Ton souffle se condense ; le silence en devient presque assourdissant.",
      "Des racines pâles s'accrochent aux voûtes comme des doigts décharnés.",
    ],
    abyss: [
      "Les runes anciennes pulsent faiblement, réagissant à ta présence.",
      "Une magie oubliée sature l'air — chaque pas la fait vibrer.",
      "Des murmures dans une langue morte glissent le long des parois.",
      "Le sol est tiède, comme si quelque chose respirait, très loin dessous.",
    ],
  };

  // Probabilité d'afficher une phrase à une entrée de salle. Mutable pour
  // le smoke (forçage à 1). Modérée : l'ambiance reste un assaisonnement.
  let CHANCE = 0.30;

  // Index de la dernière phrase affichée (anti-répétition immédiate).
  // Transient : jamais sérialisé.
  let _lastIdx = -1;

  // Cœur testable : retourne une phrase de la zone, différente de la
  // précédente (si le pool en compte ≥ 2). null si zone inconnue/vide.
  function pickFlavor(zone) {
    const pool = FLAVOR[zone];
    if (!pool || !pool.length) return null;
    let idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === _lastIdx) idx = (idx + 1) % pool.length;
    _lastIdx = idx;
    return pool[idx];
  }

  // Résout la zone d'ambiance de l'étage via getFloorTheme (défaut 'intro').
  function _zoneForFloor(floor) {
    if (typeof getFloorTheme === 'function') {
      const th = getFloorTheme(typeof floor === 'number' ? floor : 1);
      if (th && th.ambient) return th.ambient;
    }
    return 'intro';
  }

  // Call-site : roll de throttle ; si pass, affiche une phrase d'ambiance.
  function maybeRoomFlavor(floor) {
    if (Math.random() >= CHANCE) return false;
    const phrase = pickFlavor(_zoneForFloor(floor));
    if (!phrase) return false;
    if (typeof addMsg === 'function') addMsg('🕯️ ' + phrase, 'info');
    return true;
  }

  window.RoomFlavor = {
    pickFlavor,
    get CHANCE() { return CHANCE; },
    set CHANCE(v) { CHANCE = v; },
  };
  window.maybeRoomFlavor = maybeRoomFlavor;
})();

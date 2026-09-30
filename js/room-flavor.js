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
      "Un escalier change de place dans un grincement de pierre, deux étages plus haut.",
      "Une bannière de Maison pend de travers, arrachée à demi par une main pressée.",
      "Une plume abandonnée a séché sur un parchemin : la dissertation s'arrête au milieu d'un mot.",
      "Les armures tournent la tête sur ton passage, puis se ravisent.",
      "Une odeur de tarte à la mélasse flotte encore, venue des cuisines désertées.",
      "Un fantôme traverse le mur en face sans te voir, l'air préoccupé.",
      "Quelqu'un a gravé des initiales dans le bois d'un banc. Elles sont récentes.",
      "La lumière des fenêtres a pris une teinte grise, comme si le jour hésitait.",
      "Un sablier de Maison miniature gît brisé au sol, ses rubis éparpillés.",
      "Des chuchotements d'élèves s'éteignent dès que tu tends l'oreille.",
      "Une porte claque quelque part, puis plus rien. Le château retient son souffle.",
      "Sur un tableau vide, le cadre porte encore une plaque : « Sir… », le reste est effacé.",
    ],
    dungeon: [
      "L'air se fait plus froid ; l'humidité suinte des vieilles pierres.",
      "Une odeur de moisi et de cire éteinte flotte dans la salle.",
      "Quelque chose a remué dans l'ombre, juste hors de portée de ta lumière.",
      "Les murs semblent se resserrer à mesure que tu t'enfonces.",
      "Des chaînes rouillées pendent au mur ; l'une d'elles oscille encore.",
      "Une étagère de bocaux s'est effondrée. Ce qui flottait dedans n'y flotte plus.",
      "Le plafond goutte à intervalles réguliers, comme une horloge qui compte à rebours.",
      "Une inscription à la craie, à hauteur d'enfant : « NE PAS DESCENDRE ».",
      "Un chaudron renversé a laissé sur la pierre une tache qui fume encore.",
      "Tes pas ne font plus d'écho. La salle avale le bruit.",
      "Une lanterne brûle sans flamme, d'une lueur verdâtre et froide.",
      "L'odeur des cachots de Rogue : soufre, racines, et une pointe de peur.",
      "Des traces de griffes remontent le long d'un pilier jusqu'au plafond.",
      "Un rat file entre tes jambes, et s'arrête pour te regarder. Il a trop de pattes.",
      "Un banc de pierre porte encore les noms d'élèves punis, gravés au fil des siècles.",
      "Le courant d'air s'inverse brusquement, comme si l'étage avait inspiré.",
    ],
    depths: [
      "Un grondement sourd monte des profondeurs, sous tes pieds.",
      "La pierre, ici, n'a pas vu la lumière depuis des siècles.",
      "Ton souffle se condense ; le silence en devient presque assourdissant.",
      "Des racines pâles s'accrochent aux voûtes comme des doigts décharnés.",
      "L'eau suinte en filets noirs le long des parois et disparaît dans des fissures.",
      "Des champignons phosphorescents éclairent la salle d'une lumière de noyé.",
      "Un escalier taillé dans la roche descend vers rien : les marches s'arrêtent dans le vide.",
      "La roche porte des marques d'outils anciens, plus anciennes que l'école.",
      "Quelque chose de grand est passé ici. Les stalactites sont brisées à hauteur d'homme.",
      "Ta lumière tremble sans raison, comme sous un souffle que tu ne sens pas.",
      "Un ossement blanchi repose dans une niche, soigneusement, presque avec respect.",
      "L'air a un goût de fer. Loin, très loin, un battement lent.",
      "Des toiles d'araignée épaisses comme des voiles barrent une galerie latérale.",
      "Le sol est tiède par endroits, froid ailleurs, sans logique apparente.",
      "Une voix appelle un prénom, puis se tait. Ce n'était pas le tien. Pas encore.",
      "Les ombres restent en place quand ta lumière bouge. Tu préfères ne pas y penser.",
    ],
    abyss: [
      "Les runes anciennes pulsent faiblement, réagissant à ta présence.",
      "Une magie oubliée sature l'air — chaque pas la fait vibrer.",
      "Des murmures dans une langue morte glissent le long des parois.",
      "Le sol est tiède, comme si quelque chose respirait, très loin dessous.",
      "Les glyphes se réarrangent quand tu ne les regardes pas.",
      "Une colonne se dresse, gravée des quatre blasons — et d'un cinquième, effacé au burin.",
      "L'air sent la pierre neuve, comme si la salle venait d'être taillée, il y a mille ans.",
      "Tu entends ta propre voix, en retard d'une seconde, prononcer un mot que tu n'as pas dit.",
      "Un bassin sec garde la forme d'une eau qui s'y trouvait il y a des siècles.",
      "Les runes d'une arche pâlissent sur ton passage, puis se rallument derrière toi.",
      "Une lumière froide tombe d'une voûte qui n'a pas d'ouverture.",
      "La gravité hésite un instant ; une poussière d'or monte au lieu de tomber.",
      "Quatre sièges de pierre font face au mur. L'un d'eux est usé plus que les autres.",
      "Le battement sous le sol se cale, un instant, sur le tien.",
      "Des empreintes de pas s'arrêtent au milieu de la salle. Aucune ne repart.",
      "Un sceau fendu dessine sur le sol une étoile à quatre branches, dont une est brisée.",
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

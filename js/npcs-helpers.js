// ============================================================
// PNJ — Helpers de requête
// ============================================================
// getNpcById, getNpcsForFloor (déterministes + aléatoires seedés par étage),
// getRandom{Vendors,Lore,Encounters,QuestGivers,Ambient}ForFloor, indices de
// page (grimoire Manon). Lit NPCS (npcs.js, chargé avant).
// ============================================================
function getNpcById(id) {
  return NPCS.find(n => n.id === id) || null;
}

// Type de sprite de couloir 3D d'un PNJ :
// 'mage' | 'prof_h' | 'prof_f' | 'fantome' | 'vendeur' | 'phenix'. Repli 'mage'.
function getNpcSpriteType(id) {
  const npc = getNpcById(id);
  return (npc && npc.sprite) || 'mage';
}

// Vrai si le PNJ est visible pour la Maison choisie. Un PNJ porteur de
// `houseGate` (string ou tableau de noms de Maison) n'apparaît que si
// `chosenHouse` correspond — câblage des donneurs de Quête Signature
// (Chevalier Fantôme 🦁, Écho de Salazar 🐍 ; cf. ch.06 §6.12.A). Sans
// `houseGate`, le PNJ est visible pour tout le monde (comportement inchangé).
function _npcPassesHouseGate(npc) {
  const gate = npc && npc.houseGate;
  if (!gate) return true;
  if (typeof chosenHouse === 'undefined' || !chosenHouse) return false;
  return Array.isArray(gate) ? gate.includes(chosenHouse) : gate === chosenHouse;
}

function getNpcsForFloor(floor) {
  // PNJ fixes : placement déterministe par étage. La Boucle Ténébreuse
  // (effectiveFloor remappe 11→1, 18→8, etc.) recycle automatiquement
  // les PNJ étages 1-10 : Kingsley apparaît à 8 ET 18, etc.
  const ef = (typeof effectiveFloor === 'function') ? effectiveFloor(floor) : floor;
  return NPCS.filter(n => n.placement && _npcPassesHouseGate(n) && (
    n.placement.floor === floor || n.placement.floor === ef
  ));
}

function getRandomVendorsForFloor(floor) {
  // Vendeurs ambulants uniquement (présence de `wares`).
  return NPCS.filter(n =>
    n.random === true &&
    Array.isArray(n.wares) && n.wares.length > 0 &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

function getRandomLoreForFloor(floor) {
  // PNJ lore (random sans wares ni quêtes — saveur narrative seule).
  return NPCS.filter(n =>
    n.random === true &&
    !(Array.isArray(n.wares) && n.wares.length) &&
    !(Array.isArray(n.questsGiven) && n.questsGiven.length) &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

function getRandomEncountersForFloor(floor) {
  // Pool combiné : tout PNJ random éligible à cet étage (vendeur OU lore).
  // Utilisé par dungeon.js pour le tirage uniforme par étage.
  return NPCS.filter(n =>
    n.random === true &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

function getRandomQuestGiversForFloor(floor) {
  // PNJ ambulants donneurs de quête (random + questsGiven non vide).
  // Tirés dans un pool dédié pour que les quêtes répétables de farming
  // soient découvrables de façon fiable (cf. .claude/plans/repeatable-quest-spawn.md).
  return NPCS.filter(n =>
    n.random === true &&
    Array.isArray(n.questsGiven) && n.questsGiven.length > 0 &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

function getRandomAmbientNpcsForFloor(floor) {
  // PNJ ambulants sans quête (vendeurs + lore) — saveur d'exploration.
  return NPCS.filter(n =>
    n.random === true &&
    !(Array.isArray(n.questsGiven) && n.questsGiven.length > 0) &&
    (n.minFloor === undefined || floor >= n.minFloor) &&
    (n.maxFloor === undefined || n.maxFloor === null || floor <= n.maxFloor)
  );
}

// ── Indices de pages de grimoire (fantômes lore) ─────────────
// Pendant les Actes II et III de Manon, les fantômes lore peuvent lâcher
// une réplique-blague signalant un étage où traîne un feuillet non
// collecté. Cf. manon-grimoire-pages.md §7b + manon-grimoire-easter-egg.md §5.
// Acte II — ton givre/froid neutre.
const _PAGE_HINT_LINES = [
  "Tiens, j'y pense — un feuillet couvert de givre traîne au {N}ᵉ étage. Je l'aurais bien ramassé… mais, vous savez, les mains. Tout le drame du métier de fantôme.",
  "On gèle, au {N}ᵉ étage. Et au beau milieu du courant d'air, un bout de parchemin gribouillé qui refuse de prendre la poussière. Suspect, non ? Allez-y voir — moi, je traverse, ça ne compte pas.",
  "J'ai vu une page errer au {N}ᵉ étage, posée là comme si elle attendait quelqu'un. J'ai tenté d'en corner le coin : ma main est passée au travers. Quatre siècles que ça m'agace.",
  "Si vous cherchez du papier givré — et qui n'en cherche pas ? — le {N}ᵉ étage en cache un morceau. Je le surveille pour vous. Enfin, « surveiller »… je flotte au-dessus en soupirant, surtout."
];
// Acte III — ton lumineux/espiègle (feuillets « clairs », joyeux).
const _ACT3_HINT_LINES = [
  "Drôle de chose, au {N}ᵉ étage : un feuillet qui ne gèle pas le couloir, il le réchauffe presque. J'ai cru y voir une fougère dessinée. Allez voir — moi, ça fait deux siècles que je ne dessine plus rien.",
  "Au {N}ᵉ étage, il y a un parchemin qui scintille comme un soir de fête. Pas un secret, non — on dirait plutôt une bonne blague laissée là exprès. Ramassez-le, vous comprendrez mieux que moi.",
  "Vous savez ce qui traîne au {N}ᵉ étage ? Un feuillet tout clair, qui sent la neige propre et le rire. Les fantômes n'ont pas de nez, mais celui-là, je le jurerais.",
  "Petit conseil de revenant : passez au {N}ᵉ étage. Un feuillet y attend, lumineux comme une vitre givrée un matin d'hiver. Pour une fois qu'un papier d'ici ne fait pas peur."
];

// Réplique-blague d'indice pour un étage donné, selon le set de pages actif
// (variante seedée par étage).
function _pageHintLine(floor) {
  const set = (typeof _activePageSet === 'function') ? _activePageSet() : null;
  const pool = (set && set.questId === 'manon_acte3') ? _ACT3_HINT_LINES : _PAGE_HINT_LINES;
  return pool[floor % pool.length].replace('{N}', floor);
}

// Étage d'un feuillet du set actif encore non collecté à signaler, ou null.
// Set-aware (Acte II / Acte III). Pour l'Acte II, garde additionnelle : le
// préambule `manon_revelio` doit être rendu (sinon pas de chasse aux pages).
// Renvoie l'étage porteur le plus bas non encore collecté.
function _pendingPageHintFloor() {
  const set = (typeof _activePageSet === 'function') ? _activePageSet() : null;
  if (!set) return null;
  if (set.questId === 'manon_grimoire'
      && !(typeof completedQuests !== 'undefined' && completedQuests.has('manon_revelio'))) {
    return null;
  }
  const owned = (typeof player !== 'undefined' && Array.isArray(player.grimoirePages))
    ? player.grimoirePages : [];
  const pending = set.pages.filter(p => !owned.includes(p.id));
  return pending.length ? pending[0].floor : null;
}

// Rumeur diffuse de Manon (Acte III, couche egg) : une réplique greffée
// dans son idleRandom UNIQUEMENT sous la gate « Acte II fini, Acte III pas
// encore mordu » (set actif = manon_acte3 ET quête pas encore acceptée).
// Renvoie une réplique ou null.
const _MANON_ACT3_RUMORS = [
  "Tu sais, depuis que j'ai recopié le grimoire, j'ai l'impression qu'il lui manque un souffle. Pas une page de plus — un souffle clair, comme un rire qu'on aurait oublié dedans.",
  "Ma mère ne faisait pas que de la magie de survie. Il y avait autre chose, j'en suis sûre maintenant : du givre pour le plaisir. Des jeux. Je n'en ai jamais trouvé la trace… mais je la cherche.",
  "Parfois, le soir, le froid dessine des fougères sur ma vitre toutes seules. Je me dis qu'Élara a peut-être laissé de ça quelque part, exprès. Pour que je tombe dessus un jour."
];
function _manonAct3Rumor() {
  const set = (typeof _activePageSet === 'function') ? _activePageSet() : null;
  if (!set || set.questId !== 'manon_acte3') return null;
  // Couche egg seulement : avant l'acceptation implicite (1ᵉʳ feuillet trouvé).
  if (typeof activeQuests !== 'undefined'
      && activeQuests.some(q => q.id === 'manon_acte3')) return null;
  return _MANON_ACT3_RUMORS[Math.floor(Math.random() * _MANON_ACT3_RUMORS.length)];
}

// Rumeur DIFFUSE de l'Acte III lâchée par les AUTRES PNJ lore (fantômes :
// Sir Nicolas, le Moine Gras…). Distincte des indices fantômes qui citent
// un étage (_pageHintLine) : ici on ne donne aucune position, juste la
// rumeur lumineuse qui amorce l'easter egg, dans une voix de revenant.
// Même gate egg que Manon (Acte III en jeu, pas encore mordu). null sinon.
const _OTHER_NPC_ACT3_RUMORS = [
  "On murmure qu'Élara, la sorcière du givre, n'a pas tout caché par peur. Quelque part dans ces murs, elle aurait semé de la joie pure — des sorts de neige qu'on lance pour rire. Charmant, pour un château aussi lugubre.",
  "Entre fantômes, on se raconte qu'il flotte ici des feuillets clairs — pas des secrets honteux, des espiègleries de givre. J'aimerais bien les lire ; hélas, tourner une page demande des doigts.",
  "Il paraît qu'une mère a laissé à sa fille, dans ce château, non pas un avertissement mais un éclat de rire gelé. Si tu le trouves, jeune vivant, dis-moi à quoi ressemble la joie : j'ai oublié.",
  "Le froid de ce couloir n'est pas tout triste, tu sais. On raconte qu'Élara y a glissé des jeux de givre lumineux, exprès, pour qui saurait regarder. Moi, je ne vois plus que des courants d'air."
];
function _npcAct3Rumor(npc) {
  if (!npc || npc.sprite !== 'fantome' || npc.id === 'manon') return null;
  const set = (typeof _activePageSet === 'function') ? _activePageSet() : null;
  if (!set || set.questId !== 'manon_acte3') return null;
  // Couche egg seulement : avant l'acceptation implicite (1ᵉʳ feuillet trouvé).
  if (typeof activeQuests !== 'undefined'
      && activeQuests.some(q => q.id === 'manon_acte3')) return null;
  return _OTHER_NPC_ACT3_RUMORS[Math.floor(Math.random() * _OTHER_NPC_ACT3_RUMORS.length)];
}

// Payoff de l'easter egg « La Chasse Sans Tête » : ligne célébratoire de
// Sir Nicolas, débloquée UNIQUEMENT une fois la quête remise (flag
// `headlessHuntMember`). Greffée dans son idleRandom (npc-dialog.js),
// apparition non garantie. Renvoie une réplique ou null.
const _NICK_HUNT_CELEBRATIONS = [
  "Membre honoraire de la Chasse Sans Tête ! Sir Patrick a cédé — grâce à vous, jeune sorcier. Je défile derrière le cortège, certes, mais je défile ! Mon lambeau de peau et moi vous en serons éternellement reconnaissants.",
  "On m'a remis un fanion ! Un vrai ! « Membre d'honneur », qu'il dit. Le Moine Gras en a pleuré de rire — de joie, je préfère croire. Tout cela grâce à votre plaidoyer.",
  "Quatre siècles de refus, et vous avez tout changé en deux heaumes. Je vous dois ma place dans le cortège, mon brave. À la prochaine Chasse, cherchez-moi : je serai celui qui tient sa tête à deux mains, fièrement."
];
function _nickHuntCelebration(npc) {
  if (!npc || npc.id !== 'sir_nicolas') return null;
  if (!(typeof headlessHuntMember !== 'undefined' && headlessHuntMember)) return null;
  return _NICK_HUNT_CELEBRATIONS[Math.floor(Math.random() * _NICK_HUNT_CELEBRATIONS.length)];
}

// Indice escalade de l'easter egg « Les Reliques de la Mort » : tout fantôme
// (sprite:'fantome') REMARQUE que le groupe possède déjà 1 ou 2 Reliques et
// pousse vers l'union, sans jamais l'imposer ni citer d'objet précis. Greffée
// dans l'idleRandom (npc-dialog.js), apparition non garantie. Renvoie une
// réplique ou null. Cf. deathly-hallows-easter-egg.md §2.
const _HALLOWS_GHOST_HINTS = [
  "Tu portes sur toi la marque de l'un des trois frères, mortel… mais une seule. La légende parle de trois — réunies sur un même porteur, elles couronnent le Maître de la Mort.",
  "Curieux. La Mort a posé un doigt sur toi, à travers ce que tu portes. Un seul des trois Présents, pour l'instant. Il t'en manque… et tu le sais déjà.",
  "Les revenants sentent ces choses : tu détiens un fragment du conte des Trois Frères. Rassemble les Présents sur une même main, et la fable cessera d'en être une."
];
function _hallowsGhostHint(npc) {
  if (!npc || npc.sprite !== 'fantome') return null;
  if (typeof maitreDeLaMort !== 'undefined' && maitreDeLaMort) return null;
  if (typeof _hallowsOwnedCount !== 'function') return null;
  const n = _hallowsOwnedCount();
  if (n !== 1 && n !== 2) return null;
  return _HALLOWS_GHOST_HINTS[Math.floor(Math.random() * _HALLOWS_GHOST_HINTS.length)];
}


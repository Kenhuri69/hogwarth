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

function getNpcsForFloor(floor) {
  // PNJ fixes : placement déterministe par étage. La Boucle Ténébreuse
  // (effectiveFloor remappe 11→1, 18→8, etc.) recycle automatiquement
  // les PNJ étages 1-10 : Kingsley apparaît à 8 ET 18, etc.
  const ef = (typeof effectiveFloor === 'function') ? effectiveFloor(floor) : floor;
  return NPCS.filter(n => n.placement && (
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
// Pendant l'Acte II de Manon, les fantômes lore peuvent lâcher une
// réplique-blague signalant un étage où traîne une page non collectée.
// Cf. .claude/plans/manon-grimoire-pages.md §7b.
const _PAGE_HINT_LINES = [
  "Tiens, j'y pense — un feuillet couvert de givre traîne au {N}ᵉ étage. Je l'aurais bien ramassé… mais, vous savez, les mains. Tout le drame du métier de fantôme.",
  "On gèle, au {N}ᵉ étage. Et au beau milieu du courant d'air, un bout de parchemin gribouillé qui refuse de prendre la poussière. Suspect, non ? Allez-y voir — moi, je traverse, ça ne compte pas.",
  "J'ai vu une page errer au {N}ᵉ étage, posée là comme si elle attendait quelqu'un. J'ai tenté d'en corner le coin : ma main est passée au travers. Quatre siècles que ça m'agace.",
  "Si vous cherchez du papier givré — et qui n'en cherche pas ? — le {N}ᵉ étage en cache un morceau. Je le surveille pour vous. Enfin, « surveiller »… je flotte au-dessus en soupirant, surtout."
];

// Réplique-blague d'indice pour un étage donné (variante seedée par étage).
function _pageHintLine(floor) {
  const v = _PAGE_HINT_LINES[floor % _PAGE_HINT_LINES.length];
  return v.replace('{N}', floor);
}

// Étage d'une page de grimoire encore non collectée à signaler, ou null.
// Garde : préambule `manon_revelio` rendu ET collecte `manon_grimoire`
// en cours. Renvoie l'étage porteur le plus bas non encore collecté.
function _pendingPageHintFloor() {
  if (typeof completedQuests === 'undefined'
      || !completedQuests.has('manon_revelio')) return null;
  if (typeof activeQuests === 'undefined'
      || !activeQuests.some(q => q.id === 'manon_grimoire')) return null;
  if (typeof GRIMOIRE_PAGES === 'undefined') return null;
  const owned = (typeof player !== 'undefined' && Array.isArray(player.grimoirePages))
    ? player.grimoirePages : [];
  const pending = GRIMOIRE_PAGES.filter(p => !owned.includes(p.id));
  return pending.length ? pending[0].floor : null;
}


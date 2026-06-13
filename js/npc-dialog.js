// ============================================================
// DIALOGUE PNJ
// ============================================================
// Pilote l'overlay #npc-dialog-overlay et le dispatch de l'état
// d'une quête liée au PNJ. Lecture du registre `NPCS` (npcs.js)
// et des conteneurs `availableQuests` / `activeQuests` /
// `completedQuests` (state.js).

// ── Utilitaires d'état quête ────────────────────────────────────

// Retourne 'none' | 'offer' | 'active' | 'ready' | 'done'
// Itère `npc.questsGiven` dans l'ordre — c'est la mécanique des chaînes :
// on saute les quêtes complétées et non-répétables, on s'arrête sur la
// première quête qui a un état actionnable.
function getNpcQuestState(npc) {
  if (!npc) return 'none';
  const given = npc.questsGiven || [];
  if (!given.length) return 'none';
  if (typeof _refreshObjectives === 'function') _refreshObjectives();
  for (const qid of given) {
    const active = (typeof activeQuests !== 'undefined')
      ? activeQuests.find(q => q.id === qid) : null;
    if (active) {
      const allDone = (active.objectives || []).every(o => o.completed);
      return allDone ? 'ready' : 'active';
    }
    // Offrable = nouvelle OU répétable dont le cooldown est écoulé
    if (typeof isQuestOfferable === 'function' && isQuestOfferable(qid)) {
      return 'offer';
    }
    if (typeof completedQuests !== 'undefined' && completedQuests.has(qid)) {
      continue; // celle-ci est rendue (et pas due pour répétition) — on continue la chaîne
    }
  }
  // Toutes les quêtes données sont complétées
  return 'done';
}

// Retourne vrai si le PNJ propose actuellement une quête farming offerable
// (utilisé par la minimap pour appliquer un marqueur rouge clignotant
// distinct du marqueur or commun). Inclut le state.offer côté quest.
function _npcHasFarmingOffer(npcId) {
  if (!npcId) return false;
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc || !Array.isArray(npc.questsGiven)) return false;
  for (const qid of npc.questsGiven) {
    const tpl = (typeof getQuestTemplate === 'function') ? getQuestTemplate(qid) : null;
    if (!tpl || !tpl.farming) continue;
    if (typeof isQuestOfferable === 'function' && isQuestOfferable(qid)) return true;
  }
  return false;
}

// Indicateur "!" / "?" / "" affiché au-dessus du marqueur 3D.
function getNpcMarkerSign(npcId) {
  if (!npcId) return '';
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return '';
  // Récompense Maison en attente : marker 🎁 prioritaire sur les marqueurs quête
  // (cf. plan house-intermediate-tier.md §2.6).
  if (_canClaimHouseReward(npc)) return '🎁';
  const state = getNpcQuestState(npc);
  if (state === 'offer') return '!';
  if (state === 'ready') return '?';
  return '';
}

// ── Rendu de l'overlay ───────────────────────────────────────────

// Renvoie l'ID de quête actuellement adressée par cet état (ou null).
// Sert à choisir un override de dialogue dans `dialoguesByQuest` pour
// les PNJ avec chaîne de quêtes.
function _currentQuestForState(npc, state) {
  const given = npc.questsGiven || [];
  if (state === 'offer') {
    return given.find(q =>
      typeof isQuestOfferable === 'function' ? isQuestOfferable(q) : availableQuests.has(q)
    ) || null;
  }
  if (state === 'active' || state === 'ready') {
    const wantReady = state === 'ready';
    return given.find(q => {
      const a = (typeof activeQuests !== 'undefined') ? activeQuests.find(x => x.id === q) : null;
      if (!a) return false;
      const ready = (a.objectives || []).every(o => o.completed);
      return wantReady ? ready : !ready;
    }) || null;
  }
  return null;
}

// Pioche une réplique contextuelle (Portrait Dumbledore) parmi celles dont
// au moins un monstre cible est tirable à l'étage courant. Retourne null si
// aucune entrée ne matche → fallback sur `idle`.
function _pickContextualLore(npc) {
  const lore = npc && npc.dialogues && npc.dialogues.contextualLore;
  if (!Array.isArray(lore) || !lore.length) return null;
  const floor = (typeof currentFloor === 'number' && currentFloor > 0) ? currentFloor : 1;
  const pool  = (typeof MONSTERS !== 'undefined') ? MONSTERS : [];
  const tirable = new Set(pool
    .filter(m => (m.minFloor === undefined || floor >= m.minFloor) &&
                 (m.maxFloor === undefined || m.maxFloor === null || floor <= m.maxFloor))
    .map(m => m.id));
  const matches = lore.filter(e =>
    Array.isArray(e.monsterIds) && e.monsterIds.some(id => tirable.has(id))
  );
  if (!matches.length) return null;
  return matches[Math.floor(Math.random() * matches.length)].text;
}

// Vrai si l'action spéciale du PNJ a déjà été utilisée sur l'étage courant.
// Pour `claim_house_reward`, on bypass `_isSpecialActionSpent` :
// l'action reste disponible tant qu'il reste au moins une récompense
// en attente pour la Maison du joueur. Si un tier ultérieur ajoute un
// nouvel item à `pendingHouseRewards`, le bouton redevient cliquable
// automatiquement (cf. plan house-intermediate-tier.md §2.5).
function _canClaimHouseReward(npc) {
  const action = npc && npc.specialAction;
  if (!action || action.type !== 'claim_house_reward') return false;
  if (typeof chosenHouse === 'undefined' || chosenHouse !== action.house) return false;
  if (typeof pendingHouseRewards === 'undefined' || !pendingHouseRewards.size) return false;
  return _houseClaimableItems(chosenHouse).some(id => pendingHouseRewards.has(id));
}

// Liste les IDs d'items « appartenant » à la Maison du joueur : items
// déclarés dans les paliers (HOUSE_BONUSES.tiers[].bonus.item) plus les
// pièces du set Maison (HOUSE_SETS.pieceIds). Ce dernier couvre la pièce
// #4 distribuée par la quête de Maison (Maître Or, tier 12) qui n'est
// référencée nulle part dans HOUSE_BONUSES. Cf. Maisons 2.0 §C/D.
function _houseClaimableItems(house) {
  const ids = [];
  const bonuses = (typeof HOUSE_BONUSES !== 'undefined') ? HOUSE_BONUSES[house] : null;
  if (bonuses) {
    for (const tier of bonuses.tiers || []) {
      if (tier.bonus.item) ids.push(tier.bonus.item);
    }
  }
  const set = (typeof HOUSE_SETS !== 'undefined') ? HOUSE_SETS[house] : null;
  if (set && Array.isArray(set.pieceIds)) {
    for (const id of set.pieceIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  // Récompense de la Quête Signature (remise cérémonielle par le Chef de Maison).
  const sig = {
    Gryffondor: 'banniere_godric', Serpentard: 'langue_de_plomb',
    Serdaigle:  'codex_rowena',    Poufsouffle: 'coeur_refuge',
  }[house];
  if (sig && !ids.includes(sig)) ids.push(sig);
  return ids;
}

function _isSpecialActionSpent(npc) {
  if (!npc || !npc.specialAction) return false;
  return (typeof usedSpecialNpcs !== 'undefined') && usedSpecialNpcs.has(npc.id);
}

// Interpole {target} et {amount} dans une chaîne ou tableau de chaînes,
// à partir de la cible dynamique d'une quête farming (preview ou
// active). No-op si pas de cible (autres dialogues).
function _interpolateFarmingText(raw, qid, state) {
  if (!raw || !qid) return raw;
  let target = null;
  // État `offer` : preview pré-tirée par _previewFarmingOffer (quests.js)
  if (state === 'offer' && typeof _previewFarmingOffer === 'function') {
    const preview = _previewFarmingOffer(qid);
    if (preview) target = preview.target;
  } else if (typeof activeQuests !== 'undefined') {
    const q = activeQuests.find(x => x.id === qid);
    if (q && q._dynamicTarget) target = q._dynamicTarget;
  }
  if (!target) return raw;
  const apply = (s) => String(s)
    .replace(/\{target\}/g, target.name || '')
    .replace(/\{amount\}/g, String(target.amount || ''));
  return Array.isArray(raw) ? raw.map(apply) : apply(raw);
}

// Longueur max d'une page de dialogue avant découpage automatique.
// Au-delà, `_splitDialogPage` scinde la page aux frontières de phrase
// pour qu'elle tienne à l'écran sans scroll. Le scroll de
// `.npc-dialog-text` reste le filet de sécurité (phrase unique > seuil).
const _DIALOG_PAGE_MAXLEN = 280;

// Découpe `text` en sous-pages d'au plus `maxLen` caractères, aux
// frontières de phrase (. ! ? …), sans jamais couper un mot. Une phrase
// seule plus longue que `maxLen` forme une sous-page telle quelle.
function _splitDialogPage(text, maxLen) {
  const s = String(text);
  if (s.length <= maxLen) return [s];
  const sentences = s.match(/[^.!?…]+[.!?…]+[)\]»"']*\s*|[^.!?…]+$/g) || [s];
  const out = [];
  let buf = '';
  for (const sentence of sentences) {
    if (buf && (buf + sentence).length > maxLen) {
      out.push(buf.trim());
      buf = sentence;
    } else {
      buf += sentence;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [s];
}

// ── Mondes parallèles §6.2 — dialogue PNJ en mode visite (Phase E) ─────
// Quand le visiteur parle à un PNJ du host : ouvre le même overlay que
// `openNpcDialog` mais branche sur une banque dédiée (`dialoguesAstral`
// dans `npcs.js`). Le PNJ perçoit que tu n'es pas d'ici. Aucune action
// engageante (pas de quête, pas d'achat, pas d'action spéciale) — un
// seul bouton « S'éloigner ». Le visiteur n'écrit RIEN dans la save
// (l'overlay est local).
//
// Cascade :
//   1. `npc.dialoguesAstral` si présent → texte authored.
//   2. Sinon, fallback générique par catégorie :
//      - donneur de quête (questsGiven non vide) → amorce de §7 (V2)
//      - vendeur (wares non vide) → lore gratuit
//      - action spéciale (specialAction) → grisée
//      - PNJ lore (sprite fantome) → variation narrative
//      - défaut → présence étrange
function _astralCategory(npc) {
  if (!npc) return 'default';
  if (Array.isArray(npc.questsGiven) && npc.questsGiven.length) return 'quest';
  if (Array.isArray(npc.wares)       && npc.wares.length)       return 'vendor';
  if (npc.specialAction)                                         return 'special';
  if (npc.sprite === 'fantome')                                  return 'lore';
  return 'default';
}

function _astralFallbackPages(npc) {
  const banque = {
    quest:   [
      "Étrange... tu n'es pas du château que je connais. Si je te confiais une mission, irais-tu la mener dans ton propre plan ?",
      "Hélas, les liens entre nos mondes sont encore trop fragiles pour cela. Reviens si jamais ils s'épaississent, voyageur."
    ],
    vendor:  [
      "Mes marchandises n'ont pas de poids dans ton monde, voyageur — et ton or n'a aucun éclat ici.",
      "Mais je puis te dire ce qu'on murmure dans ces couloirs : c'est gratuit, et ça voyage bien."
    ],
    special: "Ce don ne traverse pas les plans, voyageur. Garde ta route — d'autres dans ton monde sauront t'offrir leur secours.",
    lore:    [
      "(L'esprit te scrute en silence.) Tu n'as pas le même éclat que ceux d'ici... un autre Poudlard t'a façonné.",
      "Si ton plan ressemble au mien, alors les mêmes peurs s'y cachent. Ou peut-être d'autres, pires encore. Bonne chance, voyageur."
    ],
    default: "(Le personnage te dévisage avec une perplexité polie.) Étrange présence... tu n'es pas d'ici, voyageur. Mais tu n'es pas non plus une menace. Passe ton chemin."
  };
  const cat = _astralCategory(npc);
  return banque[cat];
}

// Récupère les pages astrales (authored OU fallback) sous forme de tableau.
function _astralPagesFor(npc) {
  if (!npc) return ['...'];
  const raw = npc.dialoguesAstral || _astralFallbackPages(npc);
  const arr = Array.isArray(raw) ? raw.slice() : [raw];
  const out = [];
  for (const text of arr) {
    for (const sub of _splitDialogPage(text, _DIALOG_PAGE_MAXLEN)) out.push(sub);
  }
  return out;
}

function openAstralNpcDialog(npcId) {
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return;

  // Portrait : même rendu que `openNpcDialog` — raster > SVG > emoji.
  const portraitEl = document.getElementById('npc-dialog-portrait');
  if (portraitEl) {
    if (npc.portraitImg) {
      portraitEl.innerHTML = `<img src="${npc.portraitImg}" alt="${npc.name || ''}" class="npc-portrait-img">`;
    } else {
      portraitEl.innerHTML = npc.portraitSvg || (npc.icon || '🧙');
    }
  }
  const nameEl  = document.getElementById('npc-dialog-name');
  if (nameEl)  nameEl.textContent  = npc.name  || '';
  const titleEl = document.getElementById('npc-dialog-title');
  // Sous-titre teinté "voyageur" pour rappeler le mode au lecteur.
  if (titleEl) titleEl.textContent = (npc.title || '') + ' · 🌀 voyageur d\'un autre plan';

  const pages = _astralPagesFor(npc);
  _dialogState = {
    npcId,
    pages,
    srcPages:  pages.map((_, i) => i),
    page:      0,
    actions:   [{ label: 'S\'éloigner', onClick: 'closeNpcDialog()', secondary: true }],
    source:    'astral',
    idleIndex: -1
  };
  _renderDialogPage();

  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) {
    const wasOpen = overlay.style.display === 'flex';
    overlay.style.display = 'flex';
    if (!wasOpen && typeof AudioSystem !== 'undefined'
        && typeof AudioSystem.playNpcGreet === 'function') {
      AudioSystem.playNpcGreet();
    }
  }
  if (typeof drawDungeon === 'function') drawDungeon();
}

// ── Cascade de priorité partagée par `_npcDialogPages` et `_npcDialogSource` :
// greeting (1er contact) → questOffer → questActive → questReady →
// questDone → idle. Retourne `{ source, raw, qid }` où `source` est
// l'identifiant de l'origine choisie (pour le mapping voix), `raw` le
// contenu brut non interpolé (string ou array de strings), et `qid` la
// quête adressée par l'état (interpolation farming en aval).
function _resolveDialogSource(npc, state) {
  const d   = npc.dialogues || {};
  const qid = _currentQuestForState(npc, state);
  const dq  = (qid && npc.dialoguesByQuest && npc.dialoguesByQuest[qid]) || {};
  // Couche `dialoguesByHouse` (P6.b2) : override par Maison du joueur, le plus
  // spécifique (quête > Maison > défaut). No-op si le PNJ n'a pas le champ.
  const dh  = (typeof chosenHouse !== 'undefined' && chosenHouse
    && npc.dialoguesByHouse && npc.dialoguesByHouse[chosenHouse]) || {};
  const pick = (k) => (dq[k] !== undefined) ? dq[k]
    : (dh[k] !== undefined) ? dh[k] : d[k];

  if (typeof seenNpcs !== 'undefined' && !seenNpcs.has(npc.id) && pick('greeting') !== undefined)
    return { source: 'greeting', raw: pick('greeting'), qid, idleIndex: -1 };
  if (state === 'offer'  && pick('questOffer')  !== undefined)
    return { source: 'offer',  raw: pick('questOffer'),  qid, idleIndex: -1 };
  if (state === 'active' && pick('questActive') !== undefined)
    return { source: 'active', raw: pick('questActive'), qid, idleIndex: -1 };
  if (state === 'ready'  && pick('questReady')  !== undefined)
    return { source: 'ready',  raw: pick('questReady'),  qid, idleIndex: -1 };
  if (state === 'done'   && d.questDone)
    return { source: 'done',   raw: d.questDone,         qid, idleIndex: -1 };

  // Idle : priorités spéciales (Fumseck spent) > lore contextuel
  // (Portrait Dumbledore) > idleRandom (PNJ lore) > idle générique
  // > greeting > "...".
  // `idleIndex` mémorise l'entrée tirée dans `idleRandom` (-1 sinon) pour
  // que `_voiceKeyForPage` joue l'OGG correspondant à la réplique affichée.
  let raw, idleIndex = -1;
  if (_isSpecialActionSpent(npc) && d.idleSpent !== undefined) {
    raw = d.idleSpent;
  } else {
    const lore = _pickContextualLore(npc);
    // Texte de saveur "idle" : si `d.idleRandom` est un array de strings,
    // on en pioche un au hasard pour varier les visites (PNJ lore).
    let idleRandomPick = null;
    if (lore === null && Array.isArray(d.idleRandom) && d.idleRandom.length) {
      let pool = d.idleRandom;
      // Indice de page de grimoire (Manon Acte II) : un fantôme lore peut
      // lâcher une réplique-blague pointant un étage porteur non collecté.
      // Greffé comme entrée supplémentaire → apparition non garantie.
      const hintFloor = (npc.sprite === 'fantome'
        && typeof _pendingPageHintFloor === 'function')
        ? _pendingPageHintFloor() : null;
      if (hintFloor !== null && typeof _pageHintLine === 'function') {
        pool = pool.concat(_pageHintLine(hintFloor));
      }
      // Rumeur Acte III de Manon (couche egg) : greffée dans son idle
      // tant que l'Acte III n'a pas été mordu. Apparition non garantie.
      if (npc.id === 'manon' && typeof _manonAct3Rumor === 'function') {
        const rumor = _manonAct3Rumor();
        if (rumor) pool = pool.concat(rumor);
      }
      // Rumeur Acte III DIFFUSE des autres PNJ lore (fantômes) : amorce
      // l'egg dans la voix d'un revenant, sans citer d'étage. Couche egg.
      if (npc.id !== 'manon' && typeof _npcAct3Rumor === 'function') {
        const rumor = _npcAct3Rumor(npc);
        if (rumor) pool = pool.concat(rumor);
      }
      // Payoff easter egg « La Chasse Sans Tête » : ligne célébratoire de
      // Sir Nicolas, greffée seulement sous le flag headlessHuntMember.
      if (npc.id === 'sir_nicolas' && typeof _nickHuntCelebration === 'function') {
        const cheer = _nickHuntCelebration(npc);
        if (cheer) pool = pool.concat(cheer);
      }
      // Indice escalade « Reliques de la Mort » : tout fantôme remarque
      // 1–2 Reliques possédées par le groupe (couche egg, non garantie).
      if (npc.sprite === 'fantome' && typeof _hallowsGhostHint === 'function') {
        const hint = _hallowsGhostHint(npc);
        if (hint) pool = pool.concat(hint);
      }
      idleIndex = Math.floor(Math.random() * pool.length);
      idleRandomPick = pool[idleIndex];
    }
    raw = (lore !== null) ? lore
        : (idleRandomPick !== null) ? idleRandomPick
        : (d.idle || d.greeting || '...');
  }
  return { source: 'idle', raw, qid, idleIndex };
}

// Retourne `{ pages, srcPages }`. `pages` est le tableau plat des
// sous-pages affichables ; une page d'origine trop longue est scindée par
// `_splitDialogPage`. `srcPages[i]` mémorise l'index de la page d'origine
// (déclarée par le PNJ) dont vient la sous-page i — le mapping voix reste
// calé sur les pages d'origine, pas sur les sous-pages.
// Un dialogue peut être déclaré comme string (1 page) ou comme array
// (multi-page) ; override par quête via `dialoguesByQuest`.
// `resolved` (optionnel) : objet déjà produit par `_resolveDialogSource`.
// `openNpcDialog` le passe pour garantir un tirage `idleRandom` unique
// partagé entre le texte affiché et la clé voix.
function _npcDialogPages(npc, state, resolved) {
  const { raw, qid } = resolved || _resolveDialogSource(npc, state);
  const pages = Array.isArray(raw) ? raw.slice() : [raw];
  // Interpolation des placeholders {target} / {amount} pour les quêtes
  // farming. No-op pour les autres dialogues (raw renvoyé tel quel).
  const interpolated = _interpolateFarmingText(pages, qid, state);
  const authored = Array.isArray(interpolated) ? interpolated : [interpolated];
  const out = [], srcPages = [];
  authored.forEach((text, srcIdx) => {
    for (const sub of _splitDialogPage(text, _DIALOG_PAGE_MAXLEN)) {
      out.push(sub);
      srcPages.push(srcIdx);
    }
  });
  return { pages: out, srcPages };
}

// Suffixe « fil rouge des Éclats » (ch.06 §6.9.3) : si le PNJ porte le champ
// `eclatLines` et que le joueur a entamé la collecte des Éclats (eclatProgress
// > 0), on ajoute la ligne du palier courant EN FIN de dialogue — un suffixe
// qui dit « ce que ce PNJ sait du mystère maintenant », pas une page de quête
// neuve. `eclatLines[palier]` peut être une string ou un tableau (pioche).
// Renvoie un tableau de sous-pages déjà scindées, ou [] (défensif : no-op si le
// champ est absent, eclatProgress nul, ou aucune ligne pour ce palier).
function _eclatSuffixPages(npc) {
  const lines = npc && npc.eclatLines;
  if (!lines) return [];
  const p = (typeof eclatProgress === 'function') ? eclatProgress() : 0;
  if (!p) return [];
  const raw = lines[p];
  if (raw === undefined || raw === null) return [];
  const text = Array.isArray(raw)
    ? raw[Math.floor(Math.random() * raw.length)]
    : raw;
  if (!text) return [];
  return _splitDialogPage(text, _DIALOG_PAGE_MAXLEN);
}

// Suffixe « Ténébreux » en Boucle (ch.06 §6.12.E) : les PNJ recyclés en Boucle
// Ténébreuse (Kingsley 8/18, Bill 9/19, Sirius 10/20, marchands) gardent leur
// id mais portent une variante de dialogue lue sur `currentFloor >= 18` — ce
// qu'ils sont devenus quand le château est rejoué corrompu. Même patron que
// `_eclatSuffixPages` (P2) : un suffixe muet appendu en fin de dialogue, pas une
// page neuve. `darkLoopLines` peut être une string ou un tableau (pioche).
// Renvoie [] (défensif) si le champ est absent ou si l'étage est sous le seuil.
const _DARK_LOOP_FLOOR = 18;
function _darkLoopSuffixPages(npc) {
  const raw = npc && npc.darkLoopLines;
  if (raw === undefined || raw === null) return [];
  const f = (typeof currentFloor === 'number') ? currentFloor : 0;
  if (f < _DARK_LOOP_FLOOR) return [];
  const text = Array.isArray(raw)
    ? raw[Math.floor(Math.random() * raw.length)]
    : raw;
  if (!text) return [];
  return _splitDialogPage(text, _DIALOG_PAGE_MAXLEN);
}

// Résolveur PUR (testable units.js) de la ligne « après » post-victoire
// (ch.14 §14.3.2) : les PNJ profonds recyclés en Boucle (Kingsley 8/18, Bill
// 9/19, Sirius 10/20) portent une variante plus grave, moins martiale, lue une
// fois `victoryAchieved`. Retourne la réplique choisie (string) ou null si la
// variante ne s'applique pas. `lines` est `npc.postVictoryLines` (string|array) ;
// `ctx.victoryAchieved` est le gate de fin ; `ctx.rng` un tirage injectable
// (déterminisme des tests). Aucune lecture de global → pure.
function pickPostVictoryLine(lines, ctx) {
  if (!lines || !ctx || !ctx.victoryAchieved) return null;
  const arr = Array.isArray(lines) ? lines : [lines];
  if (!arr.length) return null;
  const rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
  return arr[Math.floor(rng() * arr.length)] || null;
}

// Suffixe « après » post-victoire (ch.14 §14.3.2) : même patron muet que
// `_darkLoopSuffixPages` (un suffixe appendu en fin de dialogue, pas une page
// neuve). Délègue le choix à `pickPostVictoryLine` (pur). Garde de
// complémentarité : on n'appende PAS sous le seuil de Boucle profonde
// (currentFloor >= _DARK_LOOP_FLOOR), où `darkLoopLines` prend déjà le relais —
// les deux variantes restent ainsi mutuellement exclusives (pas de double beat).
// Renvoie [] (défensif) si le champ est absent, la victoire non acquise, ou si
// l'étage relève de la Boucle profonde.
function _postVictorySuffixPages(npc) {
  if (typeof currentFloor === 'number' && currentFloor >= _DARK_LOOP_FLOOR) return [];
  const text = pickPostVictoryLine(npc && npc.postVictoryLines, {
    victoryAchieved: (typeof victoryAchieved !== 'undefined') && !!victoryAchieved,
  });
  if (!text) return [];
  return _splitDialogPage(text, _DIALOG_PAGE_MAXLEN);
}

// Suffixe « réputation par PNJ » (ch.06 §6.9.2) : les 2-3 PNJ à choix gris
// portent une variante lue selon la réputation DÉRIVÉE (npcReputationFor, quests.js)
// du choix du Pacte des Cachots. `reputationLines.warm` si rep>0, `.hostile` si
// rep<0 ; rien à neutre (0). Même patron muet que `_eclatSuffixPages` (P2).
// string|tableau. Défensif : [] si champ absent, helper absent, ou rep nulle.
function _reputationSuffixPages(npc) {
  const lines = npc && npc.reputationLines;
  if (!lines) return [];
  const rep = (typeof npcReputationFor === 'function') ? npcReputationFor(npc.id) : 0;
  if (!rep) return [];
  const raw = rep > 0 ? lines.warm : lines.hostile;
  if (raw === undefined || raw === null) return [];
  const text = Array.isArray(raw)
    ? raw[Math.floor(Math.random() * raw.length)]
    : raw;
  if (!text) return [];
  return _splitDialogPage(text, _DIALOG_PAGE_MAXLEN);
}

function _npcDialogActions(npc, state) {
  const out = [];
  // Actions contextuelles quête — énumère TOUTES les quêtes actionnables du
  // PNJ (offrables + remettables), pas seulement la première de la chaîne.
  // Un PNJ peut ainsi porter une quête hors-chaîne (ex. eclats_clef_voute
  // sur Dumbledore) en parallèle de sa chaîne d'épreuves sans la geler, et
  // les donneurs multi-quêtes (Kingsley, Bill, Sirius) exposent enfin leurs
  // quêtes simultanément. Les chaînes (prereq) n'ont de toute façon qu'une
  // quête offrable à la fois.
  const given = npc.questsGiven || [];
  const turnInable = given.filter(q => {
    const a = (typeof activeQuests !== 'undefined') ? activeQuests.find(x => x.id === q) : null;
    // manon_grimoire (Acte II) ET manon_acte3 (Acte III) se remettent via
    // l'établi de fusion (specialAction open_fusion), pas par le bouton
    // générique de remise.
    return a && (a.objectives || []).every(o => o.completed)
      && q !== 'manon_grimoire' && q !== 'manon_acte3';
  });
  const offerable = given.filter(q =>
    typeof isQuestOfferable === 'function' ? isQuestOfferable(q) : availableQuests.has(q)
  );
  // Libellé générique si une seule quête actionnable au total (préserve l'UX
  // et les tests existants), titré sinon pour lever l'ambiguïté.
  const multi = (turnInable.length + offerable.length) > 1;
  const titleOf = (q) => {
    const tpl = (typeof getQuestTemplate === 'function') ? getQuestTemplate(q) : null;
    return (tpl && tpl.title) || q;
  };
  for (const qid of turnInable) {
    // Signature Serpentard : choix gris à la remise (Pacte ou Défiance).
    if (qid === 'quest_signature_slyth') {
      out.push({
        label: '<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Sceller le Pacte de Salazar',
        onClick: `turnInSlythSignature('pact'); openNpcDialog('${npc.id}');`
      });
      out.push({
        label: '<img class="ui-icon ui-icon-md" src="img/icons/quest.png" alt=""> Défier l\'écho de Salazar',
        onClick: `turnInSlythSignature('defiance'); openNpcDialog('${npc.id}');`
      });
      continue;
    }
    out.push({
      label: multi ? `Remettre : ${titleOf(qid)}` : 'Remettre la quête',
      onClick: `turnInQuestById('${qid}'); openNpcDialog('${npc.id}');`
    });
  }
  for (const qid of offerable) {
    out.push({
      label: multi ? `Accepter : ${titleOf(qid)}` : 'Accepter la quête',
      onClick: `acceptQuest('${qid}'); openNpcDialog('${npc.id}');`
    });
  }
  // Vendeur ambulant : bouton dédié pour ouvrir sa boutique
  if (Array.isArray(npc.wares) && npc.wares.length) {
    out.push({
      label: '<img class="ui-icon ui-icon-md" src="img/icons/shop_sign.png" alt=""> Voir les marchandises',
      onClick: `closeNpcDialog(); openVendorShop('${npc.id}');`
    });
  }
  // Action spéciale (ex : Fumseck heal+revive). Bouton masqué si déjà
  // consommée pour cette visite d'étage (le texte d'idle bascule alors
  // sur `dialogues.idleSpent` via _npcDialogPages).
  // Cas particulier `claim_house_reward` : on bypass `_isSpecialActionSpent`
  // et on utilise `_canClaimHouseReward` (cf. plan house-intermediate-tier.md §2.5).
  if (npc.specialAction) {
    const saType = npc.specialAction.type;
    let available;
    if (saType === 'claim_house_reward') {
      available = _canClaimHouseReward(npc);
    } else if (saType === 'open_brewing') {
      available = (typeof _isBrewingUnlocked === 'function') && _isBrewingUnlocked();
    } else if (saType === 'open_fusion') {
      available = (typeof _grimoireFusionReady === 'function') && _grimoireFusionReady();
    } else if (saType === 'open_riddle') {
      available = (typeof _riddleStepReady === 'function') && _riddleStepReady();
    } else {
      available = !_isSpecialActionSpent(npc);
    }
    if (available) {
      const label = npc.specialAction.label || 'Action spéciale';
      // open_brewing / open_fusion / open_riddle ouvrent une modale : ne pas
      // ré-ouvrir le dialogue PNJ par-dessus (il masquerait la modale).
      const opensModal = saType === 'open_brewing' || saType === 'open_fusion'
                      || saType === 'open_riddle';
      out.push({
        label,
        onClick: opensModal
          ? `triggerNpcSpecialAction('${npc.id}')`
          : `triggerNpcSpecialAction('${npc.id}'); openNpcDialog('${npc.id}');`
      });
    }
  }
  // Don à la Maison (gold-sink endgame) : visible si le PNJ courant est
  // le Chef de Maison choisi et que le tier Mythe (17) est atteint.
  // Plan : .claude/plans/house-post-tier-18.md.
  if (chosenHouse && houseTier >= 17) {
    const bonuses = HOUSE_BONUSES[chosenHouse];
    if (bonuses && bonuses.headOfHouse === npc.id) {
      out.push({
        label: '<img class="ui-icon ui-icon-md" src="img/icons/gold.png" alt=""> Faire un don',
        onClick: `closeNpcDialog(); openHouseDonationModal();`
      });
    }
  }
  out.push({ label: 'S\'éloigner', onClick: 'closeNpcDialog()', secondary: true });
  return out;
}

// Dispatcher des actions spéciales PNJ. Étendre ici pour d'autres types
// (`bless`, `craft`, ...). Les effets gameplay sont confinés ici pour
// faciliter l'audit.
function triggerNpcSpecialAction(npcId) {
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc || !npc.specialAction) return;
  const action = npc.specialAction;
  // claim_house_reward gère sa propre garde (pas via _isSpecialActionSpent).
  if (action.type === 'claim_house_reward') {
    if (chosenHouse !== action.house) {
      if (typeof addMsg === 'function') addMsg('Ce professeur ne dirige pas votre Maison.', 'bad');
      return;
    }
    const houseItems = _houseClaimableItems(chosenHouse);
    const claimable = houseItems.filter(id => pendingHouseRewards.has(id));
    if (!claimable.length) {
      if (typeof addMsg === 'function') addMsg('Rien à recevoir pour le moment.');
      return;
    }
    let given = 0;
    for (const id of claimable) {
      const item = ITEMS.find(it => it.id === id);
      if (!item) continue;
      if (!tryAddItem(item, { silent: true })) {
        if (typeof addMsg === 'function') addMsg('Inventaire plein — libérez de la place et revenez.', 'bad');
        break;
      }
      pendingHouseRewards.delete(id);
      if (typeof addMsg === 'function') {
        addMsg(`${typeof getItemIconHtml === 'function' ? getItemIconHtml(item, 'ui-icon-md') : ''} ${item.name} vous est remis(e) par ${npc.title || npc.name}.`, 'good');
      }
      given++;
    }
    if (given) {
      if (typeof AudioSystem !== 'undefined' && AudioSystem.playLevelUp) AudioSystem.playLevelUp();
      if (typeof updateUI === 'function') updateUI();
      safeCall('autoSave', 'house-reward');
    }
    return;
  }
  // open_brewing : ouvre la modale de concoction. Répétable (pas de garde
  // _isSpecialActionSpent). Le gating réel passe par la quête de
  // déverrouillage (_isBrewingUnlocked).
  if (action.type === 'open_brewing') {
    if (typeof _isBrewingUnlocked === 'function' && !_isBrewingUnlocked()) {
      if (typeof addMsg === 'function') addMsg("Slughorn ne t'a pas encore confié son chaudron.", 'bad');
      return;
    }
    closeNpcDialog();
    if (typeof openBrewingModal === 'function') openBrewingModal();
    return;
  }
  // open_fusion : ouvre l'établi de Manon (reconstitution du grimoire).
  // Gating via _grimoireFusionReady (5 pages + quête active).
  if (action.type === 'open_fusion') {
    if (typeof _grimoireFusionReady === 'function' && !_grimoireFusionReady()) {
      if (typeof addMsg === 'function') addMsg('Il te manque encore des pages du grimoire.', 'bad');
      return;
    }
    closeNpcDialog();
    if (typeof openFusionModal === 'function') openFusionModal();
    return;
  }
  // open_riddle : ouvre les énigmes de Dumbledore (Épreuve de la Lumière).
  // Gating via _riddleStepReady (collecte faite, énigmes non terminées).
  if (action.type === 'open_riddle') {
    if (typeof _riddleStepReady === 'function' && !_riddleStepReady()) {
      if (typeof addMsg === 'function') addMsg("Réunis d'abord les trois Éclats de Lumière.", 'bad');
      return;
    }
    closeNpcDialog();
    if (typeof openRiddleModal === 'function') openRiddleModal();
    return;
  }
  if (_isSpecialActionSpent(npc)) {
    if (typeof addMsg === 'function') addMsg("L'action n'est plus disponible cette visite.", 'bad');
    return;
  }
  if (action.type === 'heal_and_revive') {
    let revived = 0, healed = 0;
    const size = (typeof partySize === 'number') ? partySize : party.length;
    for (let i = 0; i < size; i++) {
      const c = party[i];
      if (!c) continue;
      if (c.hp <= 0) {
        c.hp = Math.max(1, Math.floor(c.hpMax / 2));
        revived++;
      } else if (c.hp < c.hpMax) {
        healed++;
      } else {
        // déjà à plein PV : on compte quand même un soin "léger" si PM manquent
        if (c.sp < c.spMax) healed++;
      }
      c.hp = c.hpMax;
      c.sp = c.spMax;
    }
    usedSpecialNpcs.add(npc.id);
    const parts = [];
    if (revived) parts.push(`${revived} ranimé${revived > 1 ? 's' : ''}`);
    if (healed)  parts.push(`PV/PM restaurés`);
    const msg = parts.length
      ? `Larmes du phénix : ${parts.join(', ')}.`
      : 'Larmes du phénix : groupe à pleine forme.';
    if (typeof addMsg === 'function') addMsg(msg, 'good');
    if (typeof updateUI === 'function') updateUI();
    safeCall('autoSave', 'fumseck-used');
  }
}

// État courant du dialogue (multi-pages)
// `source` mémorise l'origine des pages (greeting / offer / active / ready /
// done / idle), nécessaire au mapping voix car le mode "greeting" est
// déclenché par seenNpcs (premier contact) indépendamment de l'état quête.
let _dialogState = { npcId: null, pages: [], srcPages: [], page: 0, actions: [], source: 'idle', idleIndex: -1 };

// Identifiant de la source choisie pour la page courante, pour le mapping
// audio. Délègue à la cascade partagée `_resolveDialogSource`. Doit être
// appelé AVANT `seenNpcs.add(npc.id)` pour distinguer le 1er contact.
function _npcDialogSource(npc, state) {
  return _resolveDialogSource(npc, state).source;
}

function _renderDialogPage() {
  const { pages, page, actions } = _dialogState;
  const total = pages.length;
  const textEl = document.getElementById('npc-dialog-text');
  if (textEl) {
    const pagerHtml = total > 1
      ? `<div class="npc-dialog-pager">${page + 1} / ${total}</div>` : '';
    textEl.innerHTML = `<div class="npc-dialog-page">${pages[page]}</div>${pagerHtml}`;
  }
  const actionsEl = document.getElementById('npc-dialog-actions');
  if (actionsEl) {
    if (page < total - 1) {
      actionsEl.innerHTML =
        `<button class="explore-btn" onclick="nextDialogPage()">Suivant ▸</button>`;
    } else {
      actionsEl.innerHTML = actions.map(a =>
        `<button class="explore-btn${a.secondary ? ' secondary' : ''}" onclick="${a.onClick}">${a.label}</button>`
      ).join('');
    }
  }
  _playPageVoice();

  // Sous-titres karaoké : surligne le texte au rythme de la voix.
  // No-op silencieux pour les PNJ sans sample (cf. js/karaoke.js).
  if (typeof Karaoke !== 'undefined' && textEl) {
    const pageEl = textEl.querySelector('.npc-dialog-page');
    if (pageEl) { Karaoke.wrap(pageEl); Karaoke.start(pageEl); }
  }
}

// ── Voix par page (Phase 3) ───────────────────────────────────
// Calcule une clé audio pour la page courante du dialogue Dumbledore.
// Retourne null pour les PNJs sans voix ou les états sans sample
// défini (l'intro pré-jeu reste gérée par intro.js, distincte).
// Cf. .claude/plans/voice-dumbledore-chain.md.
const _DUMBLEDORE_QID_SUFFIX = {
  intro_tutoriel:        'tutoriel',
  dumbledore_eveil:      'eveil',
  dumbledore_courage:    'courage',
  dumbledore_resistance: 'resistance',
  dumbledore_revelation: 'revelation',
  eclats_clef_voute:     'eclats',
};

// PNJ couverts par la Vague A voice-extensions-v2 : les 4 chefs de Maison.
// Mapping uniforme `<id>_<state>_<pageIdx+1>` pour 'greeting', 'offer',
// 'active', 'ready'. Le `source` est passé en paramètre depuis _dialogState
// car 'greeting' est piloté par seenNpcs (premier contact), pas par l'état
// quête courant.
const _HEAD_OF_HOUSE_VOICE = new Set(['mcgonagall', 'rogue', 'flitwick', 'sprout']);

function _voiceKeyForPage(npcId, state, qid, pageIdx, source, idleIndex) {
  // Chefs de Maison : greeting + 3 états quête + idle/done (Vague A étendue).
  if (_HEAD_OF_HOUSE_VOICE.has(npcId)) {
    if (source === 'greeting') return `${npcId}_greeting_${pageIdx + 1}`;
    if (source === 'idle') {
      // L'OGG suit la réplique `idleRandom` tirée (idleIndex) pour éviter
      // le décalage voix/texte ; repli sur la page si index absent.
      const i = (typeof idleIndex === 'number' && idleIndex >= 0) ? idleIndex : pageIdx;
      return `${npcId}_idle_${i + 1}`;
    }
    if (source === 'done')     return `${npcId}_done_${pageIdx + 1}`;
    if (source === 'offer' || source === 'active' || source === 'ready') {
      // McGonagall donne 2 quêtes : la quête de Set garde la clé
      // canonique ; golem_passage a ses propres samples (sinon la voix
      // de la Chimère se jouerait sur le texte du Gardien du Portail).
      if (npcId === 'mcgonagall' && qid === 'golem_passage') {
        return `mcgonagall_golem_${source}_${pageIdx + 1}`;
      }
      return `${npcId}_${source}_${pageIdx + 1}`;
    }
    return null;
  }
  if (state !== 'offer' && state !== 'active' && state !== 'ready') return null;
  if (npcId === 'dumbledore') {
    const suffix = _DUMBLEDORE_QID_SUFFIX[qid];
    if (!suffix) return null;
    return `dumbledore_${suffix}_${state}_${pageIdx + 1}`;
  }
  // Quêtes farming : un OGG générique par PNJ + état, partagé entre tous
  // les tirages (cf. .claude/plans/farming-quests.md §9).
  if (qid === 'chasse_magizoologiste' && (npcId === 'scamander_random' || npcId === 'scamander')) {
    return `scamander_chasse_${state}_${pageIdx + 1}`;
  }
  if (qid === 'course_hagrid' && (npcId === 'hagrid_random' || npcId === 'hagrid')) {
    return `hagrid_course_${state}_${pageIdx + 1}`;
  }
  return null;
}

// Stoppe la voix précédente et lance celle de la page courante.
// Fallback silencieux à tous les étages : pas de PNJ Dumbledore, pas
// d'AudioSystem.playVoice, clé inconnue, OGG manquant → no-op.
function _playPageVoice() {
  if (typeof AudioSystem === 'undefined' || typeof AudioSystem.playVoice !== 'function') return;
  if (typeof AudioSystem.stopVoice === 'function') AudioSystem.stopVoice();
  if (!_dialogState) return;
  const { npcId, page, source, srcPages, idleIndex } = _dialogState;
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return;
  // Index de la page d'origine : une page longue scindée garde la clé
  // voix de son authored-page (pas de décalage de sample).
  const authoredIdx = (srcPages && srcPages[page] != null) ? srcPages[page] : page;
  // Sous-page de continuation (même authored-page que la précédente) :
  // ne pas relancer le sample depuis le début.
  if (page > 0 && srcPages && srcPages[page - 1] === authoredIdx) return;
  const state = (typeof getNpcQuestState === 'function') ? getNpcQuestState(npc) : 'none';
  const qid   = (typeof _currentQuestForState === 'function') ? _currentQuestForState(npc, state) : null;
  const key   = _voiceKeyForPage(npcId, state, qid, authoredIdx, source, idleIndex);
  if (key) AudioSystem.playVoice(key);
}

function nextDialogPage() {
  if (_dialogState.page < _dialogState.pages.length - 1) {
    _dialogState.page++;
    _renderDialogPage();
  }
}

function openNpcDialog(npcId) {
  const npc = (typeof getNpcById === 'function') ? getNpcById(npcId) : null;
  if (!npc) return;

  const state = getNpcQuestState(npc);

  // Portrait : raster (priorité 1) > SVG inline > emoji fallback
  const portraitEl = document.getElementById('npc-dialog-portrait');
  if (portraitEl) {
    if (npc.portraitImg) {
      portraitEl.innerHTML = `<img src="${npc.portraitImg}" alt="${npc.name || ''}" class="npc-portrait-img">`;
    } else {
      portraitEl.innerHTML = npc.portraitSvg || (npc.icon || '🧙');
    }
  }
  const nameEl = document.getElementById('npc-dialog-name');
  if (nameEl) nameEl.textContent = npc.name || '';
  const titleEl = document.getElementById('npc-dialog-title');
  if (titleEl) titleEl.textContent = npc.title || '';

  // État dialog → pages + actions calculés AVANT add(seenNpcs) pour
  // que la 1re rencontre lise bien `greeting`. `source` est figé ici
  // pour rester cohérent sur toutes les pages du dialogue (greeting
  // 2 pages, etc.) — sinon seenNpcs.add ci-dessous changerait la source
  // à la page 2.
  // Résolution unique : le tirage `idleRandom` est partagé entre le texte
  // affiché et la clé voix (sinon deux tirages → voix décalée).
  const _resolved = _resolveDialogSource(npc, state);
  const _pageData = _npcDialogPages(npc, state, _resolved);
  // Suffixe fil rouge des Éclats (§6.9.3) — appendu après la réplique d'état,
  // calé sur l'authored-page précédente (suffixe muet : pas de relance voix).
  const _eclatPages = _eclatSuffixPages(npc);
  if (_eclatPages.length) {
    const lastSrc = _pageData.srcPages.length
      ? _pageData.srcPages[_pageData.srcPages.length - 1] : 0;
    for (const sub of _eclatPages) {
      _pageData.pages.push(sub);
      _pageData.srcPages.push(lastSrc);
    }
  }
  // Suffixe Ténébreux en Boucle (§6.12.E) — appendu après la réplique d'état
  // (et l'éventuel suffixe Éclat) quand le PNJ recyclé est lu en Boucle (floor
  // >= 18). Suffixe muet : calé sur la dernière authored-page (pas de voix).
  const _darkPages = _darkLoopSuffixPages(npc);
  if (_darkPages.length) {
    const lastSrc = _pageData.srcPages.length
      ? _pageData.srcPages[_pageData.srcPages.length - 1] : 0;
    for (const sub of _darkPages) {
      _pageData.pages.push(sub);
      _pageData.srcPages.push(lastSrc);
    }
  }
  // Suffixe « après » post-victoire (ch.14 §14.3.2) — appendu pour les PNJ
  // profonds recyclés (Kingsley/Bill/Sirius) une fois `victoryAchieved`, aux
  // étages de surface (la Boucle profonde 18+ relève de darkLoopLines). Suffixe
  // muet : calé sur la dernière authored-page (pas de relance voix).
  const _postVictoryPages = _postVictorySuffixPages(npc);
  if (_postVictoryPages.length) {
    const lastSrc = _pageData.srcPages.length
      ? _pageData.srcPages[_pageData.srcPages.length - 1] : 0;
    for (const sub of _postVictoryPages) {
      _pageData.pages.push(sub);
      _pageData.srcPages.push(lastSrc);
    }
  }
  // Suffixe réputation (§6.9.2) — appendu après les autres suffixes muets, pour
  // les PNJ à choix gris (écho de Salazar, Kingsley) selon la réputation dérivée.
  const _repPages = _reputationSuffixPages(npc);
  if (_repPages.length) {
    const lastSrc = _pageData.srcPages.length
      ? _pageData.srcPages[_pageData.srcPages.length - 1] : 0;
    for (const sub of _repPages) {
      _pageData.pages.push(sub);
      _pageData.srcPages.push(lastSrc);
    }
  }
  _dialogState = {
    npcId,
    pages:     _pageData.pages,
    srcPages:  _pageData.srcPages,
    page:      0,
    actions:   _npcDialogActions(npc, state),
    source:    _resolved.source,
    idleIndex: _resolved.idleIndex
  };
  _renderDialogPage();

  // Marquer comme rencontré (après calcul des pages)
  if (typeof seenNpcs !== 'undefined') seenNpcs.add(npc.id);

  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) {
    const wasOpen = overlay.style.display === 'flex';
    overlay.style.display = 'flex';
    // Cloche d'accueil seulement à la 1re ouverture (pas sur re-render après accept/turnIn)
    if (!wasOpen && AudioSystem && typeof AudioSystem.playNpcGreet === 'function') {
      AudioSystem.playNpcGreet();
    }
  }

  // Rafraîchit le canvas pour mettre à jour l'indicateur "!"/"?".
  if (typeof drawDungeon === 'function') drawDungeon();
}

function closeNpcDialog() {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay) overlay.style.display = 'none';
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.stopVoice === 'function') {
    AudioSystem.stopVoice();
  }
  if (typeof Karaoke !== 'undefined') Karaoke.stop();
}

// ── Fermeture par Échap / clic backdrop ────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const overlay = document.getElementById('npc-dialog-overlay');
  if (overlay && overlay.style.display === 'flex') closeNpcDialog();
});

document.addEventListener('click', (e) => {
  const overlay = document.getElementById('npc-dialog-overlay');
  if (!overlay || overlay.style.display !== 'flex') return;
  // Ferme uniquement si on clique sur le backdrop (pas une descendance)
  if (e.target === overlay) closeNpcDialog();
});

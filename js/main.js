// ============================================================
// INITIALISATION DU JEU
// ============================================================

// État de sélection des héros
let selectedPartySize = 1;
let selectedHeroes = ['harry'];

// ── Sélection guidée en étapes ───────────────────────────────────
// La phase d'introduction découpe la sélection en 3 étapes (mode →
// héros → difficulté), chacune ponctuée d'une voix narrative
// mystérieuse. Cf. .claude/plans/intro-ux-rework.md.
let pselStep = 1;

const PSEL_STEPS = {
  1: { title: 'Le Voyage Commence', sub: 'Affronteras-tu Poudlard seul, ou accompagné ?', voice: 'narrator_mode' },
  2: { title: 'Choisis tes Héros',  sub: 'Leur cœur comptera autant que leur magie.',     voice: 'narrator_heroes' },
  3: { title: "L'Épreuve",          sub: 'Quel défi ton courage est-il prêt à relever ?',  voice: 'narrator_difficulty' },
};

// Affiche l'écran de sélection des héros (depuis l'écran titre)
function showPlayerSelect() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('player-select-screen').style.display = 'flex';
  pselReset();
}

// Réinitialise la sélection guidée : étape 1, Solo + Harry
function pselReset() {
  selectedPartySize = 1;
  selectedHeroes = ['harry'];
  setPartyMode(1);
  pselGoStep(1);
  // Multijoueur — pré-remplit le champ pseudo avec le nom persistant.
  const pseudoEl = document.getElementById('psel-pseudo-input');
  if (pseudoEl && typeof getPlayerName === 'function') {
    pseudoEl.value = getPlayerName();
  }
  // New Game+ (Ch.14 P5) : (ré)affiche la case opt-in si le profil a ≥1 victoire.
  if (typeof _refreshNgPlusOptIn === 'function') _refreshNgPlusOptIn();
  // Retire le cadre « Vétéran » d'une sélection précédente (état neuf).
  const psBox = document.getElementById('player-select-screen');
  if (psBox) psBox.classList.remove('ngplus-veteran');
}

// Bascule le cadre doré « Vétéran » sur l'écran de sélection au gré de la
// case New Game+ (cosmétique pure ; aperçu immédiat du choix).
function _onNgPlusToggle() {
  const cb  = document.getElementById('ngplus-toggle');
  const box = document.getElementById('player-select-screen');
  if (box) box.classList.toggle('ngplus-veteran', !!(cb && cb.checked));
}

// Navigue vers une étape de la sélection guidée
function pselGoStep(n) {
  if (n < 1 || n > 3) return;
  // Garde-fou : pas d'accès à l'étape difficulté sans sélection valide
  if (n >= 3 && selectedHeroes.length !== selectedPartySize) return;
  pselStep = n;
  document.querySelectorAll('#player-select-screen .psel-step').forEach(el => {
    el.style.display = (Number(el.dataset.step) === n) ? 'block' : 'none';
  });
  document.querySelectorAll('#psel-steps .psel-crumb').forEach(crumb => {
    const s = Number(crumb.dataset.step);
    crumb.classList.toggle('active', s === n);
    crumb.classList.toggle('done',   s <  n);
  });
  // L'étape Héros s'ouvre toujours sur le choix du groupe
  if (n === 2) pselShowGroupPicker();
  const meta = PSEL_STEPS[n];
  if (meta) {
    const t = document.getElementById('psel-title');
    const sub = document.getElementById('psel-sub');
    if (t)   t.textContent   = meta.title;
    if (sub) sub.textContent = meta.sub;
    if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playVoice === 'function') {
      AudioSystem.playVoice(meta.voice);
    }
  }
}

// Clic sur le fil d'Ariane : ne permet que de revenir à une étape
// déjà franchie (ou de rester sur l'étape courante).
function pselCrumbClick(n) {
  if (n <= pselStep) pselGoStep(n);
}

// Étape Héros : vue active (null = choix du groupe ; sinon 'film'|'astres').
// La sélection est filtrée par groupe pour alléger l'écran.
let pselGroupView = null;

// Revient à l'écran de choix du groupe
function pselShowGroupPicker() {
  pselGroupView = null;
  const picker = document.getElementById('psel-group-picker');
  const list   = document.getElementById('psel-group-list');
  if (picker) picker.style.display = 'block';
  if (list)   list.style.display   = 'none';
}

// Ouvre la liste des héros d'un groupe ('film' | 'astres')
function pselOpenGroup(group) {
  pselGroupView = group;
  const picker = document.getElementById('psel-group-picker');
  const list   = document.getElementById('psel-group-list');
  if (picker) picker.style.display = 'none';
  if (list)   list.style.display   = 'block';
  document.querySelectorAll('#psel-group-list .hero-section').forEach(sec => {
    sec.style.display = (sec.dataset.group === group) ? 'block' : 'none';
  });
  refreshHeroSelectionUI();
}

// Bascule mode solo/duo
function setPartyMode(n) {
  selectedPartySize = n;
  document.getElementById('mode-btn-1').classList.toggle('active', n === 1);
  document.getElementById('mode-btn-2').classList.toggle('active', n === 2);
  // Tronque la sélection si on passe à solo
  if (n === 1 && selectedHeroes.length > 1) selectedHeroes = selectedHeroes.slice(0, 1);
  refreshHeroSelectionUI();
}

// Sélectionne / désélectionne un héros
function toggleHero(key) {
  const idx = selectedHeroes.indexOf(key);
  if (idx >= 0) {
    selectedHeroes.splice(idx, 1);
  } else {
    if (selectedHeroes.length >= selectedPartySize) {
      // Mode solo : remplace la sélection ; mode duo : on retire le plus ancien
      if (selectedPartySize === 1) selectedHeroes = [key];
      else { selectedHeroes.shift(); selectedHeroes.push(key); }
    } else {
      selectedHeroes.push(key);
    }
  }
  refreshHeroSelectionUI();
}

// Met à jour l'apparence de l'écran de sélection
function refreshHeroSelectionUI() {
  document.querySelectorAll('.hero-card').forEach(card => {
    const key = card.getAttribute('data-key');
    const i = selectedHeroes.indexOf(key);
    card.classList.toggle('selected', i >= 0);
    const badge = card.querySelector('.hero-badge');
    if (badge) badge.textContent = i >= 0 ? (i + 1) : '';
  });
  const btn  = document.getElementById('psel-next-2');
  const hint = document.getElementById('hero-hint');
  const need = selectedPartySize;
  const have = selectedHeroes.length;
  if (have === need) {
    if (btn) btn.disabled = false;
    if (need === 1) {
      const c = CHARACTERS[selectedHeroes[0]];
      hint.textContent = `${c.name} entrera à Poudlard en solitaire.`;
    } else {
      const a = CHARACTERS[selectedHeroes[0]];
      const b = CHARACTERS[selectedHeroes[1]];
      hint.textContent = `${a.name.split(' ')[0]} & ${b.name.split(' ')[0]} formeront votre groupe.`;
    }
  } else {
    if (btn) btn.disabled = true;
    const remaining = need - have;
    hint.textContent = `Sélectionnez ${remaining} héros supplémentaire${remaining > 1 ? 's' : ''}…`;
  }
}

// Stocke temporairement la taille du groupe pendant l'écran de choix de Maison
let _pendingPartySize = 2;
let _pendingHeroKeys = ['harry', 'hermione'];

// Confirme la sélection et passe à l'écran des Maisons
// Quick Start (LOT D1) — présélectionne Solo · Harry · Normal et saute
// l'assistant en 3 étapes pour aller droit au choix de Maison. Le joueur
// peut toujours personnaliser ensuite via « Nouvelle aventure ».
function quickStart() {
  selectedPartySize = 1;
  selectedHeroes    = ['harry'];
  difficulty        = 'Normal';
  ironmanMode       = false;
  _pendingPartySize = 1;
  _pendingHeroKeys  = ['harry'];
  const psel = document.getElementById('player-select-screen');
  if (psel) psel.style.display = 'none';
  const house = document.getElementById('house-select-screen');
  _renderHouseSelectBonuses();
  if (house) house.style.display = 'flex';
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playVoice === 'function') {
    AudioSystem.playVoice('narrator_house');
  }
}

// Activation du mode Ironman : à la coche, on exige une confirmation
// explicite de la permadeath (modale stylisée). La case n'est retenue
// que si le joueur accepte le risque ; sinon on la décoche.
function onIronmanToggle(cb) {
  if (cb && cb.checked) {
    const modal = document.getElementById('ironman-confirm-modal');
    if (modal) modal.style.display = 'flex';
  }
}
function confirmIronman() {
  const modal = document.getElementById('ironman-confirm-modal');
  if (modal) modal.style.display = 'none';
  // La case reste cochée (état déjà acquis) — rien d'autre à faire.
}
function cancelIronman() {
  const cb = document.getElementById('ironman-toggle');
  if (cb) cb.checked = false;            // mute programmatique : ne re-déclenche pas onchange
  const modal = document.getElementById('ironman-confirm-modal');
  if (modal) modal.style.display = 'none';
}

function confirmHeroSelection() {
  if (selectedHeroes.length !== selectedPartySize) return;
  difficulty        = document.getElementById('difficulty-select')?.value || 'Normal';
  ironmanMode       = !!document.getElementById('ironman-toggle')?.checked;
  // New Game+ « vrai » (Ch.14 P5 → challenge) : opt-in retenu seulement si
  // disponible (profil ≥ 1 victoire). Arme le cran `ngPlusLevel` (= victoires,
  // plafonné) qui pilote le scaling CHALLENGE, + le titre HUD. ZÉRO héritage.
  if (typeof ngPlusRun !== 'undefined') {
    const wantNg = !!document.getElementById('ngplus-toggle')?.checked
      && (typeof ngPlusAvailable === 'function') && ngPlusAvailable();
    ngPlusRun   = wantNg;
    if (typeof ngPlusLevel !== 'undefined') {
      ngPlusLevel = (wantNg && typeof ngPlusMaxLevel === 'function') ? ngPlusMaxLevel() : 0;
    }
    ngPlusTitle = (wantNg && typeof profileTopTitle === 'function')
      ? (profileTopTitle(getPlayerProfile()) || '') : '';
  }
  // Multijoueur — persiste le pseudo saisi au démarrage (défaut « Sorcier »).
  const _pseudo = (document.getElementById('psel-pseudo-input')?.value || '').trim();
  if (_pseudo && typeof setPlayerName === 'function') setPlayerName(_pseudo);
  _pendingPartySize = selectedPartySize;
  _pendingHeroKeys  = [...selectedHeroes];
  document.getElementById('player-select-screen').style.display = 'none';
  _renderHouseSelectBonuses();
  document.getElementById('house-select-screen').style.display  = 'flex';
  // La voix narrative accompagne le choix de Maison (toujours pas
  // identifiée — la révélation a lieu à l'écran d'intro).
  if (typeof AudioSystem !== 'undefined' && typeof AudioSystem.playVoice === 'function') {
    AudioSystem.playVoice('narrator_house');
  }
}

// Appelé depuis les boutons de l'écran des Maisons. Insère un écran
// d'introduction tenu par Dumbledore (le PNJ guide) avant de basculer
// dans le donjon : permet au joueur de connaître la 1re quête et de
// savoir qu'il faudra retrouver le PNJ dans l'exploration pour la
// rendre. La fonction showIntroScreen vit dans `js/intro.js`.
//
// Important : on reset ICI seenNpcs / availableQuests / activeQuests /
// completedQuests pour que les effets appliqués par _finishIntro
// (acceptQuest + seenNpcs.add) soient préservés ensuite par startGame.
// LOT D.3 — Bonus de Maison chiffrés à l'écran de choix.
// Génère un aperçu concret des 3 premiers paliers depuis HOUSE_BONUSES
// (source unique de vérité) → reste cohérent si la grille évolue. Le texte
// statique du HTML sert de repli si le module n'a pas chargé.
function _renderHouseSelectBonuses() {
  if (typeof HOUSE_BONUSES === 'undefined') return;
  ['Gryffondor', 'Serpentard', 'Serdaigle', 'Poufsouffle'].forEach(h => {
    const data = HOUSE_BONUSES[h];
    const el   = document.getElementById('house-bonus-' + h.toLowerCase());
    if (!data || !el) return;
    const primary = data.starGenerator?.primaryLabel || '';
    const parts = (data.tiers || []).slice(0, 3).map(t => {
      let b = '✦';
      if (t.bonus?.item) b = '⚜️';
      else {
        const k = Object.keys(t.bonus || {}).find(x => x.startsWith('_base'));
        if (k) b = '+' + t.bonus[k] + ' ' + k.replace('_base', '').toUpperCase();
      }
      return t.threshold + ' : ' + b;
    });
    el.innerHTML = (primary ? '+' + primary + ' par palier<br>' : '') +
      '<span style="opacity:.75">' + parts.join(' · ') + '</span>';
  });
}

function chooseHouse(house) {
  chosenHouse = house;
  housePoints = 0;
  houseTier   = 0;
  donationIntroPlayed = false;
  pendingHouseRewards = new Set();
  document.getElementById('house-select-screen').style.display = 'none';
  applyHeroSelection(_pendingHeroKeys, _pendingPartySize);
  // Reset état PNJ + quêtes (déplacé hors de startGame pour ne pas
  // écraser ce que _finishIntro va y ajouter).
  if (typeof seenNpcs !== 'undefined') seenNpcs = new Set();
  if (typeof activeQuests !== 'undefined' && typeof QUEST_TEMPLATES !== 'undefined') {
    activeQuests    = [];
    // Les quêtes de Maison (`houseSetQuest: true`) sont gated par le palier
    // 12 (Maître Or) via `unlockHouseQuest` — on ne les ajoute pas à
    // `availableQuests` au démarrage. Les quêtes à acceptation implicite
    // (`implicitAccept: true`, ex. l'Acte III egg de Manon) ne s'y ajoutent
    // pas non plus : elles s'activent par `acceptQuest` depuis un autre
    // déclencheur (trouver un feuillet), jamais par un bouton « Accepter ».
    availableQuests = new Set(
      QUEST_TEMPLATES.filter(t => !t.houseSetQuest && !t.houseSignatureQuest && !t.implicitAccept).map(t => t.id)
    );
    completedQuests = new Set();
  }
  if (typeof lastQuestCompletion !== 'undefined') lastQuestCompletion = {};
  if (typeof showIntroScreen === 'function') {
    showIntroScreen(() => startGame(_pendingPartySize));
  } else {
    startGame(_pendingPartySize);
  }
}

// Applique les stats du héros choisi sur player (et player2 en duo)
function applyHeroSelection(keys, count) {
  const k1 = keys[0] || 'harry';
  _hydrateCharacter(player, k1);
  if (count === 2) {
    const k2 = keys[1] || 'hermione';
    _hydrateCharacter(player2, k2);
  }
  // Synchroniser party (au cas où)
  party[0] = player;
  party[1] = player2;
}

function _hydrateCharacter(target, key) {
  const c = CHARACTERS[key];
  if (!c) return;
  target.heroKey = key;
  target.name    = c.name;
  target.icon    = c.icon;
  target.imgSrc  = c.imgSrc;
  target.class   = c.class;
  target.hp      = c.hp;     target.hpMax = c.hp;
  target.sp      = c.sp;     target.spMax = c.sp;
  target.str = c.str; target.int = c.int; target.agi = c.agi;
  target.end = c.end; target.lck = c.lck; target.mag = c.mag;
  target.atk = c.atk; target.def = c.def;
  target._baseAtk = c.atk; target._baseDef = c.def;
  target._baseMag = c.mag; target._baseLck = c.lck;
  target.wand    = c.wand;
  target.armor   = c.armor;
  target.acc     = c.acc;
  target.spells  = [...c.spells];
  // Réinitialise XP/inventaire pour un nouveau départ
  target.level   = 1;
  target.xp      = 0;
  target.xpNext  = 50;
  target.unallocatedStatPoints = 0;
  // 11 slots étendus — voir .claude/plans/equipment-extended.md §2.1
  target.equipped = {
    wand: null, head: null, body: null, hands: null, feet: null, cloak: null,
    amulet: null, ring1: null, ring2: null, belt: null, trinket: null
  };
  // Met à jour la carte du groupe (portrait + nom + classe)
  const idx = (target === player) ? 0 : 1;
  const bg = document.getElementById(`pcard-bg-${idx}`);
  if (bg && c.imgSrc) bg.style.backgroundImage = `url("${c.imgSrc}")`;
  const nameEl  = document.getElementById(`char-name-${idx}`);
  if (nameEl) nameEl.textContent = c.name;
  const classEl = document.getElementById(`char-class-${idx}`);
  if (classEl) classEl.textContent = `${c.role} · Niv.1`;
}

// ── Vérifie si un nouveau palier de Maison est atteint ──────
window.checkHouseLevelUp = function checkHouseLevelUp() {
  if (!chosenHouse) return;
  const bonuses = HOUSE_BONUSES[chosenHouse];
  if (!bonuses) return;

  bonuses.tiers.forEach((tier, i) => {
    const tierNum = i + 1;
    if (houseTier >= tierNum) return;            // déjà atteint
    if (housePoints < tier.threshold) return;   // pas encore
    // Endgame Tranche 2 : Tier 16 (Légende) gated par victoryAchieved.
    // Architecture 16 paliers (Bronze/Argent/Or × 5 phases + Légende) ;
    // tous les sous-paliers sont accessibles sans victoire, seul le
    // dernier reste réservé au post-endgame. Cf. ENDGAME_PLAN.md §7.7
    // + .claude/plans/houses-2.0.md §A.
    if (tierNum >= 16 && !(typeof victoryAchieved !== 'undefined' && victoryAchieved)) return;

    // Palier endgame V3 (« Mythe ») : `requiresDarkTier` impose un indice
    // de Boucle Ténébreuse minimal — 1 = étages 11+, 2 = étages 21+.
    // Symétrique de la garde `victoryAchieved` ci-dessus.
    if (tier.requiresDarkTier) {
      const ti = (typeof endgameTierIndex === 'function')
        ? endgameTierIndex(currentFloor) : 0;
      if (ti < tier.requiresDarkTier) return;
    }

    houseTier = tierNum;
    addMsg(tier.msg, 'magic');
    AudioSystem.playLevelUp();
    // Voix des héros — palier de Maison franchi (cosmétique, défensif).
    if (typeof heroBark === 'function') {
      const speaker = party.slice(0, partySize).find(c => c.hp > 0) || party[0];
      if (speaker && speaker.heroKey) heroBark(speaker.heroKey, 'houseTier', { channel: (typeof inBattle !== 'undefined' && inBattle) ? 'combat' : 'explore', once: 'tier:' + tierNum });
    }

    // Appliquer les bonus de stat
    party.forEach(c => {
      if (tier.bonus._baseAtk) c._baseAtk += tier.bonus._baseAtk;
      if (tier.bonus._baseDef) c._baseDef += tier.bonus._baseDef;
      if (tier.bonus._baseMag) c._baseMag += tier.bonus._baseMag;
      if (tier.bonus._baseLck) c._baseLck += tier.bonus._baseLck;
    });

    // Tous les items de palier passent par le Chef de Maison
    // (`pendingHouseRewards` → cérémonie `claim_house_reward`). Le tier 16
    // (Légende) reste gated par `victoryAchieved` au-dessus, donc l'item
    // endgame `lame_godric` & co n'arrivent qu'après victoire.
    // Cf. .claude/plans/houses-2.0.md §B (Étape 3) — unification du flow.
    if (tier.bonus.item) {
      pendingHouseRewards.add(tier.bonus.item);
    }

    // Palier Maître Or (tier 12) : ouvre la quête de Maison qui débloquera
    // la pièce #4 du set à la remise (cf. quests.js — unlockHouseQuest).
    if (tier.bonus.unlockSetQuest) {
      safeCall('unlockHouseQuest', chosenHouse);
    }

    // Palier Mythe (tier 17) : enseigne le sort exclusif de Maison à
    // tout le groupe actif (mécanisme partagé avec les équipements `grantsSpell`).
    if (tier.bonus.grantsSpell && typeof _teachSpellToParty === 'function') {
      if (_teachSpellToParty(tier.bonus.grantsSpell)) {
        addMsg(`${getSpellIconHtml(tier.bonus.grantsSpell, 'ui-icon-md')} Sort de Maison débloqué : ${tier.bonus.grantsSpell} !`, 'magic');
      }
    }

    // Palier Mythe : ouvre la quête de don (gold-sink) chez le Chef de Maison.
    if (tier.bonus.unlockMytheQuest) {
      safeCall('unlockHouseMytheQuest', chosenHouse);
    }

    recalculateStats();
    updateUI();
  });

  // ── Série Apothéose ★ N (génératrice, post-tier 18) ──────────
  // Décision .claude/plans/house-post-tier-18.md (amendée 2026-05-25).
  // Une fois Apothéose franchi (tier 18) ET la Boucle Ténébreuse 2 active
  // (étages 21+, `requiresDarkTier: 2`), `houseTier` continue d'incrémenter
  // — chaque ★ N correspond à `houseTier = 18 + N`. Pas d'item ni de sort,
  // uniquement des bonus de stats à 4 cadences. Helpers purs définis dans
  // state.js : `_starGeneratorBonus(N, gen)` et `_starGeneratorMsg(N, b, gen)`.
  if (houseTier >= 18 && bonuses.starGenerator) {
    const gen = bonuses.starGenerator;
    const ti  = (typeof endgameTierIndex === 'function')
      ? endgameTierIndex(currentFloor) : 0;
    if (ti >= (gen.requiresDarkTier || 0)) {
      let starN = houseTier - 18;
      while (true) {
        const nextN     = starN + 1;
        const threshold = 45000 + 15000 * nextN + 1000 * nextN * nextN;
        if (housePoints < threshold) break;

        const bonus = _starGeneratorBonus(nextN, gen);
        houseTier   = 18 + nextN;
        addMsg(_starGeneratorMsg(nextN, bonus, gen), 'magic');
        AudioSystem.playLevelUp();

        party.forEach(c => {
          Object.keys(bonus).forEach(k => {
            if (typeof c[k] !== 'number') return;
            c[k] += bonus[k];
            // hpMax / spMax : régénère aussi la valeur courante (sans dépasser).
            if (k === 'hpMax') c.hp = Math.min(c.hpMax, c.hp + bonus[k]);
            if (k === 'spMax') c.sp = Math.min(c.spMax, c.sp + bonus[k]);
          });
        });

        // Voix off du Chef de Maison (samples optionnels — silence si absents).
        const ctx = (nextN === 1)        ? 'apotheose_star_first'
                  : (nextN % 10 === 0)   ? 'apotheose_star_milestone'
                  :                        'apotheose_star';
        if (typeof _playDonationVoice === 'function') _playDonationVoice(ctx);

        starN = nextN;
      }
      recalculateStats();
      updateUI();
    }
  }
}

// Palier capstone V3 (« Apothéose », tier 18) : éveille un passif
// légendaire propre à la Maison choisie. Retourne le nom de la Maison
// quand le passif est actif (tier 18 atteint), sinon null. Pas de flag
// dédié — `houseTier >= 18` est la source de vérité, déjà sérialisée.
// Effets par Maison (cf. .claude/plans/houses-mythe-tier-v3.md §Vague C) :
//   Gryffondor  → +20 % crit physique      (inventory.js — recalculateStats)
//   Serpentard  → 15 % spell-lifesteal      (battle-spells.js)
//   Serdaigle   → −20 % coût des sorts      (battle-spells.js — castSpellInBattle)
//   Poufsouffle → régen PV/PM hors combat   (movement.js — _step)
window.houseApotheosePassive = function houseApotheosePassive() {
  return (chosenHouse && houseTier >= 18) ? chosenHouse : null;
};

async function startGame(count = 2) {
  // === TEXTURES INTEGRATION ===
  // Attendre le chargement complet des textures avant de générer le donjon.
  // Les appels suivants sont quasi-instantanés grâce au cache _loadingPromise.
  if (window.loadTextures) await loadTextures();

  partySize = count;

  // Appliquer les bonus/malus de départ selon la difficulté
  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['Normal'];
  player.gold    = settings.startingGold;
  party.forEach(c => {
    c.hpMax = Math.max(8, c.hpMax + settings.startingHpBonus);
    c.hp    = c.hpMax;
  });

  // En mode solo : masquer la carte d'Hermione et l'indicateur de tour
  applyPartyMode();

  // V3.1 — Faveur de la Salle (bonus méta léger, capé) selon les thèmes de la
  // Salle sur Demande déjà découverts à vie (codex). Pur démarrage, additif.
  _applyRequirementMetaBonus();

  const gc = document.getElementById('game-container');
  gc.style.display = 'grid';
  resizeCanvas();
  generateDungeon(1);
  floorDungeons = {};   // reset du cache à chaque nouvelle partie
  // Pages du grimoire d'Élara (Actes II & III) — état neuf à chaque partie.
  pagePlacements = new Map();
  revealedPages  = new Set();
  player.grimoirePages = [];
  hiverClair = false;   // passif Acte III non éveillé en début de partie
  elementalMastery = {};  // aucune maîtrise élémentaire en début de partie
  headlessHuntMember = false;  // easter egg Chasse Sans Tête non débloqué
  maitreDeLaMort = false;      // easter egg Reliques de la Mort non débloqué
  // Quêtes Signature de Maison — état neuf à chaque partie.
  gryffSignatureDone = false; slythSignatureDone = false;
  ravenSignatureDone = false; poufSignatureDone  = false;
  slythPactChoice    = null;
  searchedCells = new Map();
  // Jardin d'herbes (Potions P6.b3) — état neuf à chaque partie. generateDungeon(1)
  // ne pose aucun jardin (étage 3+), le reset après est donc sûr.
  hiddenGardens = new Set();
  gardenStock = 0;
  gardenDiscovered = false;
  // Ateliers d'alchimie (Potions 2.0 P11) — état neuf : aucun atelier débloqué.
  if (typeof workshopLevel !== 'undefined') workshopLevel = 0;
  // Formes P12 — état neuf : fouille aiguisée + snapshot d'annulation remis à zéro.
  if (typeof visionSearchSteps !== 'undefined') visionSearchSteps = 0;
  if (typeof _lastStepUndo !== 'undefined') _lastStepUndo = null;
  visitedFloors = new Set([1]);
  seenScriptedBeat = new Set();   // étages-scènes (P5) — beats neufs à chaque partie
  totalKills     = 0;
  monsterKills   = {};
  // Codex (Chapitre 12) — journal neuf à chaque partie.
  unlockedCodexEntries = new Set();
  floorReached         = 1;
  // Boucle Ténébreuse — Porteur d'Éclats (ch.11 V1) : compteur neuf par partie.
  if (typeof accumulatedEclats !== 'undefined') accumulatedEclats = 0;
  if (typeof eclatMilestones !== 'undefined') eclatMilestones = new Set();   // paliers d'Éclats célébrés (héritage P0)
  // « Briser le Cycle » (ch.11 V3) : fin non débloquée en début de partie.
  if (typeof cycleBroken !== 'undefined') cycleBroken = false;
  combatTutorialSeen = false;   // tuto premier combat rejoué à chaque partie (LOT D2)
  if (typeof endgamePivotSeen !== 'undefined') endgamePivotSeen = false;  // pivot endgame (Ch.13)
  defeatedBosses = new Set();
  ironmanRunId   = (ironmanMode && typeof _genRunId === 'function') ? _genRunId() : null;
  shopStock = null;
  shopStepsSinceRestock = 0;
  purchasedSpellbooks = new Set();
  endgamePurchases    = {};
  portusOocCooldown   = 0;
  portusFightCooldown = 0;
  healSpellCooldown   = 0;
  // Easter egg « Salle sur Demande » — état remis à zéro à chaque partie.
  requirementWalls     = new Map();
  requirementTrigger   = new Map();
  requirementPaces     = new Map();
  requirementRevealed  = new Set();
  usedRequirementRooms = new Set();
  requirementGiftTaken = false;
  requirementBuffSteps = 0;
  requirementTheme     = new Map(); // V2 (room-of-requirement-v2.md)
  requirementTrophiesTaken = new Set(); // V3/V3.1 (room-of-requirement-v3.md)
  // Note : seenNpcs / activeQuests / availableQuests / completedQuests
  // sont déjà initialisés par chooseHouse() AVANT l'intro Dumbledore
  // (sinon _finishIntro serait écrasée). Ne pas les reset ici.
  restCooldown  = 0;
  updateUI();
  updateQuestTracker();
  updateCompass();
  renderMinimap();
  drawDungeon();
  if (typeof startNpcAnimLoop === 'function') startNpcAnimLoop();
  if (typeof startDungeonFxLoop === 'function') startDungeonFxLoop();
  if (typeof DFX_safe !== 'undefined') DFX_safe.setFloorAmbience();
  updateLocationDisplay();

  const diffIcon = { Facile:'🟢', Normal:'🟡', Difficile:'🟠', Expert:'🔴' }[difficulty] || '';
  const modeLabel = `${diffIcon} Mode ${difficulty}`;
  const intro = partySize === 1
    ? `Bienvenue à Poudlard, ${player.name}. ${modeLabel} activé. Les couloirs humides vous attendent...`
    : `Bienvenue à Poudlard. ${player.name.split(' ')[0]} et ${player2.name.split(' ')[0]} s'élancent. ${modeLabel} activé.`;
  setNarrative(intro);
  addMsg(modeLabel, difficulty === 'Expert' ? 'bad' : 'good');
  // Codex : ouvre les entrées de l'étage 1 (ex. la Clé de Voûte fêlée).
  if (typeof checkCodexUnlocks === 'function') checkCodexUnlocks('game-start');

  // Étage-scène scénarisé (P5) : beat du Seuil familier à la 1re entrée de
  // l'étage 1 (non atteint via _changeFloor, généré direct au démarrage).
  if (typeof maybeScriptedFloorBeat === 'function') maybeScriptedFloorBeat(1);

  // Lancer la musique ambiante (le geste utilisateur vient du clic sur startGame)
  AudioSystem.init();
  AudioSystem.playAmbientMusic(1);
  // Note : l'intro Dumbledore est désormais gérée AVANT startGame() par
  // showIntroScreen() dans le flow chooseHouse. Pas de popup en jeu.

  // Multijoueur — ouvre la session de présence fantôme (cf. multiplayer.js).
  if (typeof mpStartSession === 'function') mpStartSession();

  // Tour guidé d'aide pour novices — auto-affiché à chaque nouvelle partie
  // sauf opt-out localStorage (cf. js/help-tour.js).
  if (typeof maybeAutoStartHelpTour === 'function') maybeAutoStartHelpTour();

  // === FIX TEXTURE MISSING === re-render appuyés jusqu'à ce que tous les patterns soient prêts
  // Puis cadence normale (~500 ms) une fois l'état stable
  let frame = 0;
  let warmupTicks = 0;
  function render() {
    frame++;
    if (!inBattle) {
      // Phase warm-up : redessiner souvent les ~2 premières secondes pour capter
      // les textures qui finissent de charger ou des resize tardifs.
      if (warmupTicks < 120) {
        warmupTicks++;
        if (frame % 4 === 0) drawDungeon();
      } else if (frame % 30 === 0) {
        drawDungeon();
      }
    }
    requestAnimationFrame(render);
  }
  render();
}

// V3.1 (room-of-requirement-v3.md §C3) — Faveur de la Salle : bonus méta léger
// et capé selon le nombre de thèmes de Salle découverts à vie (codex localStorage).
// Additif au démarrage, jamais power-creep : +15 G/thème (cap 75) + 1 potion_s
// par thème ; complétion (5/5) → +1 potion_m. Défensif (no-op si codex absent).
function _applyRequirementMetaBonus() {
  if (typeof getRequirementCodex !== 'function') return;
  let codex;
  try { codex = getRequirementCodex(); } catch (e) { return; }
  const themes = (codex && codex.themesSeen) ? Object.keys(codex.themesSeen).filter(k => codex.themesSeen[k]) : [];
  const n = Math.min(5, themes.length);
  if (n <= 0) return;
  const goldBonus = Math.min(75, 15 * n);
  if (player && typeof player.gold === 'number') player.gold += goldBonus;
  if (typeof tryAddItem === 'function') {
    for (let i = 0; i < n; i++) tryAddItem('potion_s', { silent: true });
    const complete = !!(codex.trophies && codex.trophies._complete);
    if (complete) tryAddItem('potion_m', { silent: true });
  }
  if (typeof addMsg === 'function') {
    addMsg(`🚪 Faveur de la Salle : +${goldBonus} Gallions et ${n} potion(s) de départ (${n} thème(s) découvert(s)).`, 'good');
  }
}

// ============================================================
// OVERLAY CARTE MOBILE
// ============================================================

function toggleMobileMap() {
  const overlay = document.getElementById('map-overlay');
  const opening = overlay.style.display !== 'flex';
  overlay.style.display = opening ? 'flex' : 'none';
  if (opening) {
    // Construire la carte agrandie au moment de l'ouverture.
    // 14 px/case : avec 16 colonnes la grille fait ~254 px — l'empreinte
    // de l'ancienne carte 12×12, sans envahir l'écran mobile.
    _buildMinimapCells(document.getElementById('minimap-mobile'), 14);
    // Mettre à jour le niveau affiché
    const lvlEl = document.getElementById('map-overlay-floor');
    if (lvlEl) lvlEl.textContent = `Niveau ${currentFloor}`;
  }
}

// ============================================================
// CLAVIER
// ============================================================

// Liste centralisée des modales fermables par Échap (toutes basées sur un
// display:none — closeModal suffit). NPC-dialog et help-tour gèrent Échap
// localement (ne pas doubler).
const ESC_CLOSEABLE_MODALS = [
  'inventory-modal', 'spell-modal', 'shop-modal', 'character-modal',
  'bestiary-modal', 'codex-modal', 'house-detail-modal', 'house-donation-modal',
  'wizard-codex-modal', 'slot-modal', 'monster-info-overlay',
  'settings-modal', 'forge-modal', 'library-modal', 'brewing-modal',
  'fusion-modal', 'riddle-modal', 'endgame-compass-modal'
];

// Cellule cible d'un déplacement aux flèches dans une grille focusée.
// `cur` = cellule actuellement focusée ; `key` = ArrowUp/Down/Left/Right.
// Le groupe de navigation = cellules focusables de MÊME famille (.inv-slot /
// .equip-slot-floating / .spell-item) actuellement VISIBLES (une seule modale
// ouverte à la fois → scope naturel). ←/→ : voisin en ordre DOM (clampé aux
// bords). ↑/↓ : cellule la plus proche dans la direction, l'écart horizontal
// étant pénalisé pour privilégier la même colonne. Retourne null si aucune.
// Sélecteur partagé des cellules de grille focusables (toutes familles) —
// source unique consommée par l'activation Entrée/Espace ET la navigation
// flèches. `.bestiary-card` porte déjà `.spell-item` → couverte sans entrée
// dédiée. (Phases 1/2 = sac/paper-doll/sorts ; extension = boutique/codex.)
const GRID_CELL_SEL = '.inv-slot[tabindex],.equip-slot-floating[tabindex],.spell-item[tabindex],.shop-item[tabindex],.codex-card[tabindex]';

function _gridArrowTarget(cur, key) {
  const family = cur.classList.contains('spell-item')          ? '.spell-item[tabindex]'
               : cur.classList.contains('equip-slot-floating') ? '.equip-slot-floating[tabindex]'
               : cur.classList.contains('shop-item')           ? '.shop-item[tabindex]'
               : cur.classList.contains('codex-card')          ? '.codex-card[tabindex]'
               :                                                  '.inv-slot[tabindex]';
  const cells = Array.from(document.querySelectorAll(family))
    .filter(el => el.offsetParent !== null); // exclut les cellules masquées (modale fermée)
  if (cells.length < 2) return null;
  const i = cells.indexOf(cur);
  if (i < 0) return null;
  if (key === 'ArrowLeft')  return cells[Math.max(0, i - 1)];
  if (key === 'ArrowRight') return cells[Math.min(cells.length - 1, i + 1)];
  // ↑/↓ : géométrie.
  const r = cur.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const up = key === 'ArrowUp';
  let best = null, bestScore = Infinity;
  for (const el of cells) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const ex = b.left + b.width / 2, ey = b.top + b.height / 2;
    if (up ? ey >= cy - 2 : ey <= cy + 2) continue; // mauvaise direction
    const dx = ex - cx, dy = ey - cy;
    const score = dx * dx * 4 + dy * dy;            // pénalise l'écart horizontal
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  const k = e.key;

  // ── Activation clavier (Entrée/Espace) d'une cellule de grille focusable
  //    (sac, paper-doll, sort lançable) — parité avec le clic souris. Les
  //    cellules portent tabindex="0" ; le repère de focus doré vient de la
  //    règle [tabindex]:focus-visible (css/style.css).
  if (k === 'Enter' || k === ' ') {
    const cell = e.target.closest && e.target.closest(GRID_CELL_SEL);
    if (cell) { cell.click(); e.preventDefault(); return; }
  }

  // ── Navigation 2D au clavier dans une grille focusée (flèches) — sac,
  //    paper-doll, liste de sorts. Géométrique (agnostique au layout) :
  //    ←/→ = cellule précédente/suivante (ordre DOM) ; ↑/↓ = cellule la plus
  //    proche dans la rangée adjacente. preventDefault empêche le déplacement
  //    du joueur derrière la modale ouverte. (Phase 2 — plan inventory-keyboard-nav.)
  if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
    const cur = e.target.closest && e.target.closest(GRID_CELL_SEL);
    if (cur) {
      const next = _gridArrowTarget(cur, k);
      if (next) next.focus();
      e.preventDefault();
      return;
    }
  }

  // ── Échap : confirmation custom (résout « Annuler ») > sélection de cible
  //    en combat > toute modale ouverte.
  if (k === 'Escape') {
    const confirmM = document.getElementById('confirm-modal');
    const ts = document.getElementById('target-selection');
    if (confirmM && confirmM.style.display !== 'none' && typeof _closeConfirmModal === 'function') {
      _closeConfirmModal(false);
    } else if (inBattle && ts && ts.style.display !== 'none' && typeof _cancelTargetSelection === 'function') {
      _cancelTargetSelection();
    } else {
      ESC_CLOSEABLE_MODALS.forEach(closeModal);
    }
    return;
  }

  // ── En combat : raccourcis d'action (parité avec les boutons) + ciblage clavier.
  if (inBattle) {
    const ts = document.getElementById('target-selection');
    // Sélection de cible ouverte → 1-9 choisit la cible numérotée.
    if (ts && ts.style.display !== 'none') {
      if (k >= '1' && k <= '9') {
        const btns = document.querySelectorAll('#target-buttons button[data-target-index]');
        const i = parseInt(k, 10) - 1;
        if (btns[i]) { btns[i].click(); e.preventDefault(); }
      }
      return;
    }
    // Sous-modale de SORTS ouverte (M4) → 1-9 lance le Nème sort lançable
    // (badge data-hotkey posé par openBattleSpells sur les seuls sorts castables).
    const spellModal = document.getElementById('spell-modal');
    if (spellModal && spellModal.style.display !== 'none') {
      if (k >= '1' && k <= '9') {
        const items = document.querySelectorAll('#spell-list .spell-item[data-hotkey]');
        const i = parseInt(k, 10) - 1;
        if (items[i]) { items[i].click(); e.preventDefault(); }
      }
      return;
    }
    // Ne pas agir derrière une sous-modale de combat (objets).
    const subOpen = ['inventory-modal'].some(id => {
      const el = document.getElementById(id);
      return el && el.style.display !== 'none';
    });
    if (subOpen) return;
    // Raccourcis d'action de combat (défauts A/S/G/O/F) — touches résolues
    // via keybindings.js. Fallback littéral si le module n'a pas chargé ;
    // si le module EST là et la touche n'est liée à rien, on ne fait rien
    // (un unbind volontaire est respecté).
    if (typeof kbResolveCombat === 'function') {
      const id = kbResolveCombat(k);
      if (id) { battleAction(KB_COMBAT_ARG[id]); e.preventDefault(); }
    } else {
      const act = { a: 'attack', s: 'spell', g: 'guard', o: 'item', f: 'flee' }[k.toLowerCase()];
      if (act) { battleAction(act); e.preventDefault(); }
    }
    return;
  }

  // ── Hors combat : déplacement relatif + raccourcis d'exploration, touches
  //    résolues via keybindings.js (défauts ↑/W/Z avancer, ↓/S reculer,
  //    ←/A/Q pivoter G, →/D pivoter D ; i/p/c/f/r). preventDefault sur les
  //    seules actions de déplacement (parité stricte avec l'historique).
  if (typeof kbResolveExplore === 'function') {
    switch (kbResolveExplore(k)) {
      case 'moveForward':   moveForward();  e.preventDefault(); break;
      case 'moveBackward':  moveBackward(); e.preventDefault(); break;
      case 'turnLeft':      turnLeft();     e.preventDefault(); break;
      case 'turnRight':     turnRight();    e.preventDefault(); break;
      case 'openInventory': openInventory(); break;
      case 'openSpells':    openSpells();    break;
      case 'openCharacter': openCharacter(); break;
      case 'search':        searchRoom();    break;
      case 'rest':          rest();          break;
    }
  } else {
    // Fallback défensif : comportement historique si le module est absent.
    const fwd   = (k==='ArrowUp'    || k==='w' || k==='W' || k==='z' || k==='Z');
    const back  = (k==='ArrowDown'  || k==='s' || k==='S');
    const left  = (k==='ArrowLeft'  || k==='a' || k==='A' || k==='q' || k==='Q');
    const right = (k==='ArrowRight' || k==='d' || k==='D');
    if (fwd)        { moveForward();  e.preventDefault(); }
    else if (back)  { moveBackward(); e.preventDefault(); }
    else if (left)  { turnLeft();     e.preventDefault(); }
    else if (right) { turnRight();    e.preventDefault(); }
    if(k==='i') openInventory();
    if(k==='p') openSpells();
    if(k==='c') openCharacter();
    if(k==='f') searchRoom();
    if(k==='r') rest();
  }
});

// ============================================================
// ÉTOILES DE L'ÉCRAN TITRE
// ============================================================

function generateStars() {
  const container=document.getElementById('stars-container');
  for(let i=0;i<150;i++) {
    const star=document.createElement('div');
    star.className='star';
    star.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${2+Math.random()*4}s;--delay:${Math.random()*4}s;--op:${0.3+Math.random()*0.7}`;
    container.appendChild(star);
  }
}

// ============================================================
// RESPONSIVE
// ============================================================

window.addEventListener('resize',()=>{
  resizeCanvas();
  if(document.getElementById('game-container').style.display!=='none') drawDungeon();
});

// Démarrage
generateStars();

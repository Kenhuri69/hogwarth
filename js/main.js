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
function confirmHeroSelection() {
  if (selectedHeroes.length !== selectedPartySize) return;
  difficulty        = document.getElementById('difficulty-select')?.value || 'Normal';
  ironmanMode       = !!document.getElementById('ironman-toggle')?.checked;
  // Multijoueur — persiste le pseudo saisi au démarrage (défaut « Sorcier »).
  const _pseudo = (document.getElementById('psel-pseudo-input')?.value || '').trim();
  if (_pseudo && typeof setPlayerName === 'function') setPlayerName(_pseudo);
  _pendingPartySize = selectedPartySize;
  _pendingHeroKeys  = [...selectedHeroes];
  document.getElementById('player-select-screen').style.display = 'none';
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
function chooseHouse(house) {
  chosenHouse = house;
  housePoints = 0;
  houseTier   = 0;
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
    // `availableQuests` au démarrage.
    availableQuests = new Set(
      QUEST_TEMPLATES.filter(t => !t.houseSetQuest).map(t => t.id)
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
        addMsg(`✨ Sort de Maison débloqué : ${tier.bonus.grantsSpell} !`, 'magic');
      }
    }

    // Palier Mythe : ouvre la quête de don (gold-sink) chez le Chef de Maison.
    if (tier.bonus.unlockMytheQuest) {
      safeCall('unlockHouseMytheQuest', chosenHouse);
    }

    recalculateStats();
    updateUI();
  });
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

  const gc = document.getElementById('game-container');
  gc.style.display = 'grid';
  resizeCanvas();
  generateDungeon(1);
  floorDungeons = {};   // reset du cache à chaque nouvelle partie
  // Pages du grimoire de Sandrine — état neuf à chaque partie.
  pagePlacements = new Map();
  revealedPages  = new Set();
  player.grimoirePages = [];
  searchedCells = new Map();
  visitedFloors = new Set([1]);
  totalKills     = 0;
  monsterKills   = {};
  defeatedBosses = new Set();
  ironmanRunId   = (ironmanMode && typeof _genRunId === 'function') ? _genRunId() : null;
  shopStock = null;
  shopStepsSinceRestock = 0;
  purchasedSpellbooks = new Set();
  endgamePurchases    = {};
  portusOocCooldown   = 0;
  portusFightCooldown = 0;
  healSpellCooldown   = 0;
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
  updateLocationDisplay();

  const diffIcon = { Facile:'🟢', Normal:'🟡', Difficile:'🟠', Expert:'🔴' }[difficulty] || '';
  const modeLabel = `${diffIcon} Mode ${difficulty}`;
  const intro = partySize === 1
    ? `Bienvenue à Poudlard, ${player.name}. ${modeLabel} activé. Les couloirs humides vous attendent...`
    : `Bienvenue à Poudlard. ${player.name.split(' ')[0]} et ${player2.name.split(' ')[0]} s'élancent. ${modeLabel} activé.`;
  setNarrative(intro);
  addMsg(modeLabel, difficulty === 'Expert' ? 'bad' : 'good');

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

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  // Contrôles relatifs : ↑/W = avancer, ↓/S = reculer, ←/A = pivoter G, →/D = pivoter D.
  // Z/Q ajoutés pour les claviers AZERTY.
  const k = e.key;
  const fwd   = (k==='ArrowUp'    || k==='w' || k==='W' || k==='z' || k==='Z');
  const back  = (k==='ArrowDown'  || k==='s' || k==='S');
  const left  = (k==='ArrowLeft'  || k==='a' || k==='A' || k==='q' || k==='Q');
  const right = (k==='ArrowRight' || k==='d' || k==='D');
  if (fwd)        { moveForward();  e.preventDefault(); }
  else if (back)  { moveBackward(); e.preventDefault(); }
  else if (left)  { turnLeft();     e.preventDefault(); }
  else if (right) { turnRight();    e.preventDefault(); }
  if(e.key==='i') openInventory();
  if(e.key==='p') openSpells();
  if(e.key==='c') openCharacter();
  if(e.key==='f') searchRoom();
  if(e.key==='r') rest();
  if(e.key==='Escape') {
    ['inventory-modal','spell-modal','shop-modal','character-modal'].forEach(closeModal);
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

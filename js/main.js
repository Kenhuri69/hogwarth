// ============================================================
// INITIALISATION DU JEU
// ============================================================

// Affiche l'écran de sélection du nombre de joueurs
function showPlayerSelect() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('player-select-screen').style.display = 'flex';
  // Initialiser la sélection par défaut : Solo + Harry
  selectedPartySize = 1;
  selectedHeroes = ['harry'];
  refreshHeroSelectionUI();
}

// État de sélection des héros
let selectedPartySize = 1;
let selectedHeroes = ['harry'];

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
  const btn  = document.getElementById('start-adventure-btn');
  const hint = document.getElementById('hero-hint');
  const need = selectedPartySize;
  const have = selectedHeroes.length;
  if (have === need) {
    btn.disabled = false;
    if (need === 1) {
      const c = CHARACTERS[selectedHeroes[0]];
      hint.textContent = `${c.name} entrera à Poudlard en solitaire.`;
    } else {
      const a = CHARACTERS[selectedHeroes[0]];
      const b = CHARACTERS[selectedHeroes[1]];
      hint.textContent = `${a.name.split(' ')[0]} & ${b.name.split(' ')[0]} formeront votre groupe.`;
    }
  } else {
    btn.disabled = true;
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
  _pendingPartySize = selectedPartySize;
  _pendingHeroKeys  = [...selectedHeroes];
  document.getElementById('player-select-screen').style.display = 'none';
  document.getElementById('house-select-screen').style.display  = 'flex';
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
    availableQuests = new Set(QUEST_TEMPLATES.map(t => t.id));
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
  const portrait = document.querySelector(`#char-card-${idx} .party-portrait-img`);
  if (portrait) { portrait.src = c.imgSrc; portrait.alt = c.name; }
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
    // Endgame Tranche 2 : Tier 6 (Légende) gated par victoryAchieved.
    // Le tier 5 (Virtuose) est désormais accessible sans victoire — il
    // débloque la quête de Maison qui livrera l'artefact #3 du set.
    // Cf. ENDGAME_PLAN.md §7.7 + .claude/plans/houses-2.0.md §A.
    if (tierNum >= 6 && !(typeof victoryAchieved !== 'undefined' && victoryAchieved)) return;

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

    // Items : tier 2 et tier 4 sont remis en main propre par le Chef de
    // Maison (pendingHouseRewards). Tier 5 reste distribué directement
    // (cinématique post-victoire endgame, cf. ENDGAME_PLAN.md §7.7).
    if (tier.bonus.item) {
      if (tierNum >= 5) {
        const item = ITEMS.find(it => it.id === tier.bonus.item);
        if (item && tryAddItem(item, { silent: true })) {
          addMsg(`🎁 ${item.icon} ${item.name} ajouté à l'inventaire !`, 'good');
        }
      } else {
        pendingHouseRewards.add(tier.bonus.item);
      }
    }

    recalculateStats();
    updateUI();
  });
}

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
  searchedCells = new Set();
  visitedFloors = new Set([1]);
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
    // Construire la carte agrandie au moment de l'ouverture
    _buildMinimapCells(document.getElementById('minimap-mobile'), 20);
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

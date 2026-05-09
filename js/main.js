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

// Appelé depuis les boutons de l'écran des Maisons
function chooseHouse(house) {
  chosenHouse = house;
  housePoints = 0;
  houseTier   = 0;
  document.getElementById('house-select-screen').style.display = 'none';
  applyHeroSelection(_pendingHeroKeys, _pendingPartySize);
  startGame(_pendingPartySize);
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
  target.equipped = { wand: null, armor: null, acc: null };
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

    // Donner l'objet légendaire (palier 4)
    if (tier.bonus.item) {
      const item = ITEMS.find(it => it.id === tier.bonus.item);
      if (item && tryAddItem(item, { silent: true })) {
        addMsg(`🎁 ${item.icon} ${item.name} ajouté à l'inventaire !`, 'good');
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
  console.log("✅ Textures chargées - redraw forcé");

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
  restCooldown  = 0;
  updateUI();
  updateQuestTracker();
  updateCompass();
  renderMinimap();
  drawDungeon();
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
  const map={w:'n',s:'s',a:'w',d:'e',ArrowUp:'n',ArrowDown:'s',ArrowLeft:'w',ArrowRight:'e'};
  if(map[e.key]) { move(map[e.key]); e.preventDefault(); }
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

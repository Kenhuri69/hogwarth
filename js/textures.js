// ============================================================
// SYSTÈME DE CHARGEMENT DES TEXTURES PIXEL ART
// === TEXTURES INTEGRATION ===
// ============================================================

const TEXTURES = {
  walls:   {},
  floor:   {},
  ceiling: {}
};

let texturesLoaded  = false;
let _loadingPromise = null; // Évite les chargements parallèles

async function loadTextures() {
  // Déjà chargées → retour immédiat
  if (texturesLoaded) return;
  // En cours → attendre la promesse existante
  if (_loadingPromise) return _loadingPromise;

  const wallNames  = ['stone1', 'stone2', 'wood', 'tapestry'];
  const floorNames = ['stone', 'carpet'];
  const ceilNames  = ['beams', 'stone'];

  function loadOne(img, src) {
    return new Promise(resolve => {
      img.onload  = resolve;
      img.onerror = () => { console.warn(`[Textures] Manquante : ${src}`); resolve(); };
      img.src     = src;
    });
  }

  const promises = [];

  for (const name of wallNames) {
    TEXTURES.walls[name] = new Image();
    promises.push(loadOne(TEXTURES.walls[name], `img/textures/walls/${name}.png`));
  }
  for (const name of floorNames) {
    TEXTURES.floor[name] = new Image();
    promises.push(loadOne(TEXTURES.floor[name], `img/textures/floor/${name}.png`));
  }
  for (const name of ceilNames) {
    TEXTURES.ceiling[name] = new Image();
    promises.push(loadOne(TEXTURES.ceiling[name], `img/textures/ceiling/${name}.png`));
  }

  _loadingPromise = Promise.all(promises);
  await _loadingPromise;

  texturesLoaded        = true;
  window.texturesLoaded = true;
  console.log('[Textures] ✅ Chargées :',
    Object.keys(TEXTURES.walls).length,   'murs,',
    Object.keys(TEXTURES.floor).length,   'sols,',
    Object.keys(TEXTURES.ceiling).length, 'plafonds');

  // === FIX TEXTURE MISSING === force un re-render immédiat si le jeu est déjà démarré
  if (typeof window.drawDungeon === 'function') {
    try { window.drawDungeon(); } catch (e) { /* dungeon pas encore généré, ignore */ }
  }
}

window.TEXTURES       = TEXTURES;
window.loadTextures   = loadTextures;
window.texturesLoaded = false;

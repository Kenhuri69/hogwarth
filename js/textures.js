// ============================================================
// SYSTÈME DE CHARGEMENT DES TEXTURES PIXEL ART
// ============================================================

const TEXTURES = {
  walls:   {},
  floor:   {},
  ceiling: {}
};

let texturesLoaded = false;

async function loadTextures() {
  const wallNames    = ['stone1', 'stone2', 'wood', 'tapestry'];
  const floorNames   = ['stone', 'carpet'];
  const ceilNames    = ['beams', 'stone'];

  function loadOne(img, src) {
    return new Promise(resolve => {
      img.onload  = resolve;
      img.onerror = () => { console.warn(`Texture manquante : ${src}`); resolve(); };
      img.src     = src;
    });
  }

  const promises = [];

  for (const name of wallNames) {
    TEXTURES.walls[name] = new Image();
    promises.push(loadOne(TEXTURES.walls[name],
      `img/textures/walls/${name}.png`));
  }
  for (const name of floorNames) {
    TEXTURES.floor[name] = new Image();
    promises.push(loadOne(TEXTURES.floor[name],
      `img/textures/floor/${name}.png`));
  }
  for (const name of ceilNames) {
    TEXTURES.ceiling[name] = new Image();
    promises.push(loadOne(TEXTURES.ceiling[name],
      `img/textures/ceiling/${name}.png`));
  }

  await Promise.all(promises);
  texturesLoaded = true;
  console.log('✅ Textures pixel art chargées :', Object.keys(TEXTURES.walls).length, 'murs,',
              Object.keys(TEXTURES.floor).length, 'sols,',
              Object.keys(TEXTURES.ceiling).length, 'plafonds');
}

window.TEXTURES       = TEXTURES;
window.loadTextures   = loadTextures;
window.texturesLoaded = false;

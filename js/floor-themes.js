// ============================================================
// FLOOR THEMES — source unique de vérité (tileset + ambiance)
// ============================================================
//
// Mappe une tranche d'étages → clés de textures (mur / sol / plafond)
// + zone musicale ambiante. Consommé par renderer.js, audio-music.js
// et movement.js. Module pur : aucun état, aucune sérialisation.
//
// Voir .claude/plans/floor-tier-theming.md.
//
// NB : l'override « rune_* post-victoire » (étage 11+) reste géré en
// surcouche dans renderer.js — il ne passe pas par ce module.

const FLOOR_THEMES = {
  hogwarts: { range: [1, 3],    wall: 'stone1',      floor: 'stone',        ceiling: 'beams',          ambient: 'intro',   label: "Couloirs de Poudlard" },
  dungeons: { range: [4, 6],    wall: 'stone2',      floor: 'carpet',       ceiling: 'stone',          ambient: 'dungeon', label: "Cachots de Poudlard" },
  depths:   { range: [7, 13],   wall: 'cavern_wall', floor: 'cavern_floor', ceiling: 'cavern_ceiling', ambient: 'depths',  label: "Profondeurs Oubliées" },
  // Palier endgame profond (14+) : tileset runique + ambiance abyssale.
  // Atteignable uniquement en Boucle Ténébreuse (escaliers scellés sans
  // victoire). L'override « rune_* post-victoire » de renderer.js (11+)
  // couvre déjà les textures 11-13 ; ce thème les rend self-cohérentes à
  // partir de 14 et bascule en plus l'ambiance sur `abyss`.
  ancient:  { range: [14, null], wall: 'rune_wall', floor: 'rune_floor', ceiling: 'rune_ceiling', ambient: 'abyss', label: "Ruines Anciennes" },
};

// Retourne le thème de la tranche contenant `floor`. Toujours sûr :
// un `floor` invalide (NaN, undefined, 0, négatif) retombe sur hogwarts.
function getFloorTheme(floor) {
  const f = (typeof floor === 'number' && floor > 0) ? floor : 1;
  for (const t of Object.values(FLOOR_THEMES)) {
    const lo = t.range[0], hi = t.range[1];
    if (f >= lo && (hi === null || f <= hi)) return t;
  }
  return FLOOR_THEMES.hogwarts;
}

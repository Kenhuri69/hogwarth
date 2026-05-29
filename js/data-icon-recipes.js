// ============================================================
// DONNÉES — ICON_RECIPES (schéma du pipeline d'icônes painterly)
// ============================================================
// Extrait de data.js. Mirror du dict RECIPES de tools/icon_factory.py ;
// NON consommé au runtime navigateur (le front charge les PNG mipmaps
// générés). Conservé pour aligner les deux côtés du pipeline d'icônes.
// Chargé après data.js.
/* ─────────────────────────────────────────────────────────────────────────
   ICON_RECIPES — schéma de migration vers le pipeline painterly (direction A).
   Mirror exact du dict RECIPES dans tools/icon_factory.py.

   Pour chaque item :
     silhouette : soit { kind:"svg", file } pointant tools/parts/<file>,
                  soit { kind:"shape", name, params } via tools/shapes.py
     fills      : { region: "#rrggbb" } — une couleur par data-region du SVG
     accents    : [ { kind, region, color, ...opts } ] — liquide, runes, bulles,
                  emboss, orb_glow, gem_facet_shine, sparkles
     rarity     : common | uncommon | rare | epic | legendary  (pilote le halo)
     material   : matte | glass | metal | leather | wood       (pilote spec)
     lightAngle : degrés, défaut 45

   Le moteur Python est seul à lire ce schéma (front consomme les PNG
   mipmaps générés). Garder les deux côtés alignés pour le mapping J2.
   ───────────────────────────────────────────────────────────────────────── */
const ICON_RECIPES = {
  potion_s: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#764e2a", body:"#acc4d0" },
    accents: [
      { kind:"liquid", region:"body", color:"#d94444", level:0.72, meniscus:true }
    ],
    rarity:"common", material:"glass"
  },

  felix: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#8c622e", body:"#d2bc8e" },
    accents: [
      { kind:"liquid", region:"body", color:"#f0c448", level:0.8, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", count:6, color:"#ffe8a8" }
    ],
    rarity:"legendary", material:"glass", sparkles:true
  },

  wand2: {
    silhouette: { kind:"svg", file:"wizard-staff.svg" },
    fills: { shaft:"#4e3420", grip:"#362416", pommel:"#7a582a", orb:"#bedceb" },
    accents: [
      { kind:"runes", region:"shaft", color:"#ebd796", count:5 },
      { kind:"orb_glow", region:"orb", color:"#c8e6ff" }
    ],
    rarity:"rare", material:"wood"
  },

  anneau_runique: {
    silhouette: { kind:"shape", name:"ring_band", params:{ radius:175, thickness:36, bezel:true, gem:true } },
    fills: { metal:"#c9a84c", gem:"#6096dc" },
    accents: [
      { kind:"runes", region:"metal", color:"#503814", count:6, around:"ring" },
      { kind:"gem_facet_shine", region:"gem", color:"#dcebff" }
    ],
    rarity:"rare", material:"metal"
  },

  livre_sortileges: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#3a588a", pages:"#e4d2a8", spine:"#263c62", gilt:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#1e2e4c" },
      { kind:"symbol", region:"cover", shape:"star", color:"#d8bc6c", size:130 }
    ],
    rarity:"common", material:"leather"
  },

  potion_m: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#764e2a", body:"#acc4d0" },
    accents: [
      { kind:"liquid", region:"body", color:"#925cc4", level:0.74, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", color:"#dcc4ff", count:4 }
    ],
    rarity:"common", material:"glass"
  },

  potion_force: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#8c5c2e", body:"#d0b89c" },
    accents: [
      { kind:"liquid", region:"body", color:"#d8662c", level:0.7, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", color:"#ffc878", count:5 }
    ],
    rarity:"common", material:"glass"
  },

  larmes_phenix: {
    silhouette: { kind:"svg", file:"flask.svg" },
    fills: { stopper:"#ac7834", body:"#e4d4ac" },
    accents: [
      { kind:"liquid", region:"body", color:"#f0d080", level:0.82, meniscus:true, glow:true },
      { kind:"bubbles", region:"body", color:"#fff0c8", count:7 }
    ],
    rarity:"legendary", material:"glass", sparkles:true
  },

  wand1: {
    silhouette: { kind:"svg", file:"wizard-staff.svg" },
    fills: { shaft:"#846038", grip:"#543c24", pommel:"#9c7848", orb:"#d0c090" },
    accents: [
      { kind:"orb_glow", region:"orb", color:"#f0dca0" }
    ],
    rarity:"common", material:"wood"
  },

  livre_soin: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#38704e", pages:"#e4d2a8", spine:"#204830", gilt:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#163424" },
      { kind:"symbol", region:"cover", shape:"cross", color:"#d8bc6c", size:120 }
    ],
    rarity:"common", material:"leather"
  },

  book_monsters: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#6c482c", pages:"#d0b894", spine:"#48301c", gilt:"#b07c38" },
    accents: [
      { kind:"emboss", region:"cover", color:"#382414" },
      { kind:"symbol", region:"cover", shape:"fang", color:"#e0d0ac", size:130 }
    ],
    rarity:"common", material:"leather"
  },

  livre_prince: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#20202c", pages:"#d0bc9c", spine:"#12121c", gilt:"#c09c48" },
    accents: [
      { kind:"emboss", region:"cover", color:"#0e0e14" },
      { kind:"symbol", region:"cover", shape:"moon", color:"#dcc484", size:130 }
    ],
    rarity:"epic", material:"leather"
  },

  livre_bombarda: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#983c28", pages:"#e4d2a8", spine:"#682418", gilt:"#dcb048" },
    accents: [
      { kind:"emboss", region:"cover", color:"#4c1810" },
      { kind:"symbol", region:"cover", shape:"flame", color:"#f0c86c", size:130 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_patronum: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#dcdce8", pages:"#f0e0b8", spine:"#acb0c0", gilt:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#989cac" },
      { kind:"symbol", region:"cover", shape:"deer", color:"#b4bcd0", size:130 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_sanguini: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#78141c", pages:"#d0bc98", spine:"#500c12", gilt:"#b48430" },
    accents: [
      { kind:"emboss", region:"cover", color:"#3c080c" },
      { kind:"symbol", region:"cover", shape:"drop", color:"#e0a858", size:120 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_vampyrus: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#24182c", pages:"#c8b494", spine:"#160e1e", gilt:"#b498c4" },
    accents: [
      { kind:"emboss", region:"cover", color:"#100a16" },
      { kind:"symbol", region:"cover", shape:"bat", color:"#d8bce0", size:140 }
    ],
    rarity:"epic", material:"leather"
  },

  livre_taranta: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#64387c", pages:"#e4d2a8", spine:"#402054", gilt:"#c09c48" },
    accents: [
      { kind:"emboss", region:"cover", color:"#2c143c" },
      { kind:"symbol", region:"cover", shape:"snake", color:"#d8bc6c", size:140 }
    ],
    rarity:"common", material:"leather"
  },

  livre_maledictus: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#381c4c", pages:"#d0bc98", spine:"#201034", gilt:"#a480c4" },
    accents: [
      { kind:"emboss", region:"cover", color:"#180c28" },
      { kind:"symbol", region:"cover", shape:"eye", color:"#d0ace0", size:130 }
    ],
    rarity:"rare", material:"leather"
  },

  livre_crucio: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#1a1414", pages:"#c8b494", spine:"#0e0a0a", gilt:"#b4302c" },
    accents: [
      { kind:"emboss", region:"cover", color:"#0a0606" },
      { kind:"symbol", region:"cover", shape:"lightning", color:"#e05848", size:130 }
    ],
    rarity:"epic", material:"leather"
  },

  livre_morsmordre: {
    silhouette: { kind:"svg", file:"book-cover.svg" },
    fills: { cover:"#141418", pages:"#c8b494", spine:"#0a0a0e", gilt:"#50bc78" },
    accents: [
      { kind:"emboss", region:"cover", color:"#08080c" },
      { kind:"symbol", region:"cover", shape:"skull", color:"#8ce0a8", size:130 }
    ],
    rarity:"epic", material:"leather"
  },

  amulette: {
    silhouette: { kind:"svg", file:"gem-pendant.svg" },
    fills: { chain:"#b49448", bezel:"#c9a84c", gem:"#d84030" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#ffb478" }
    ],
    rarity:"rare", material:"metal"
  },

  amulette_protection: {
    silhouette: { kind:"svg", file:"gem-pendant.svg" },
    fills: { chain:"#acb0bc", bezel:"#c0c4d0", gem:"#5094c0" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#c8e6ff" }
    ],
    rarity:"common", material:"metal"
  },

  locket_slytherin: {
    silhouette: { kind:"svg", file:"gem-pendant.svg" },
    fills: { chain:"#b4b8c4", bezel:"#acb0bc", gem:"#1c6c3c" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#78dca0" },
      { kind:"orb_glow", region:"gem", color:"#50c88c" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  robe1: {
    silhouette: { kind:"svg", file:"hood.svg" },
    fills: { cloth:"#30446c", lining:"#1c2c4c", clasp:"#c9a84c" },
    accents: [
      { kind:"emboss", region:"cloth", color:"#18243c" }
    ],
    rarity:"common", material:"matte"
  },

  cape_voyageur: {
    silhouette: { kind:"svg", file:"hood.svg" },
    fills: { cloth:"#6c4c30", lining:"#442c1c", clasp:"#987c48" },
    accents: [
      { kind:"emboss", region:"cloth", color:"#382414" }
    ],
    rarity:"common", material:"matte"
  },

  cape_invis: {
    silhouette: { kind:"svg", file:"hood.svg" },
    fills: { cloth:"#c8d0dc", lining:"#949cac", clasp:"#d0c4e8" },
    accents: [
      { kind:"emboss", region:"cloth", color:"#7c8494" },
      { kind:"orb_glow", region:"cloth", color:"#dce8ff" }
    ],
    rarity:"legendary", material:"matte", sparkles:true
  },

  anneau_argent: {
    silhouette: { kind:"shape", name:"ring_band", params:{ radius:165, thickness:48, bezel:true, gem:true } },
    fills: { metal:"#c4c8d4", gem:"#9498a8" },
    accents: [
      { kind:"runes", region:"metal", color:"#6c7080", count:8, around:"ring" },
      { kind:"gem_facet_shine", region:"gem", color:"#e8ecf8" },
      { kind:"emboss", region:"metal", color:"#606474" }
    ],
    rarity:"common", material:"metal"
  },

  anneau_resurrection: {
    silhouette: { kind:"shape", name:"ring_band", params:{ radius:175, thickness:38, bezel:true, gem:true } },
    fills: { metal:"#584834", gem:"#202028" },
    accents: [
      { kind:"runes", region:"metal", color:"#302418", count:6, around:"ring" },
      { kind:"gem_facet_shine", region:"gem", color:"#b49cdc" },
      { kind:"orb_glow", region:"gem", color:"#8c64c8" }
    ],
    rarity:"epic", material:"metal"
  },

  sword_gryff: {
    silhouette: { kind:"svg", file:"sword.svg" },
    fills: { blade:"#d4dce8", guard:"#c9a84c", hilt:"#601414", pommel:"#d43c38" },
    accents: [
      { kind:"runes", region:"blade", color:"#98a0b0", count:4 },
      { kind:"gem_facet_shine", region:"pommel", color:"#ffb4a0" },
      { kind:"orb_glow", region:"pommel", color:"#f07850" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  broom: {
    silhouette: { kind:"svg", file:"broom.svg" },
    fills: { handle:"#7c542c", binding:"#c08c38", bristles:"#ac7c44", tip:"#d8b860" },
    accents: [
      { kind:"runes", region:"handle", color:"#d8b860", count:3 }
    ],
    rarity:"rare", material:"wood"
  },

  bottes_apprenti: {
    silhouette: { kind:"svg", file:"boot.svg" },
    fills: { shaft:"#7c5838", foot:"#6c4828", sole:"#382414", lace:"#d0b884" },
    accents: [
      { kind:"emboss", region:"shaft", color:"#402c18" }
    ],
    rarity:"common", material:"leather"
  },

  bottes_dragon: {
    silhouette: { kind:"svg", file:"boot.svg" },
    fills: { shaft:"#282c30", foot:"#1c2024", sole:"#0c1014", lace:"#b43c2c" },
    accents: [
      { kind:"emboss", region:"shaft", color:"#101418" },
      { kind:"runes", region:"shaft", color:"#c85038", count:3 }
    ],
    rarity:"rare", material:"leather"
  },

  gants_apprenti: {
    silhouette: { kind:"svg", file:"glove.svg" },
    fills: { cuff:"#543820", palm:"#745030", fingers:"#6c4828", stitch:"#d0b484" },
    accents: [
      { kind:"emboss", region:"palm", color:"#3c2814" }
    ],
    rarity:"common", material:"leather"
  },

  ceinture_cuir: {
    silhouette: { kind:"svg", file:"belt.svg" },
    fills: { strap:"#6c4828", buckle:"#b4b8c4", holes:"#382414", tongue:"#acb0bc" },
    accents: [
      { kind:"emboss", region:"strap", color:"#402c18" }
    ],
    rarity:"common", material:"leather"
  },

  ceinture_alchimiste: {
    silhouette: { kind:"svg", file:"belt.svg" },
    fills: { strap:"#583820", buckle:"#c9a84c", holes:"#301c0c", tongue:"#b09040" },
    accents: [
      { kind:"emboss", region:"strap", color:"#342010" },
      { kind:"runes", region:"strap", color:"#d8b860", count:4 }
    ],
    rarity:"rare", material:"leather"
  },

  chapeau_apprenti: {
    silhouette: { kind:"svg", file:"hat-pointy.svg" },
    fills: { cone:"#2c3858", brim:"#1c2844", band:"#402c14", buckle:"#b49c58" },
    accents: [
      { kind:"emboss", region:"cone", color:"#182038" }
    ],
    rarity:"common", material:"matte"
  },

  chapeau_pointu: {
    silhouette: { kind:"svg", file:"hat-pointy.svg" },
    fills: { cone:"#243c68", brim:"#14284c", band:"#8c6c38", buckle:"#d8b860" },
    accents: [
      { kind:"emboss", region:"cone", color:"#102040" },
      { kind:"gem_facet_shine", region:"buckle", color:"#ffdc8c" }
    ],
    rarity:"rare", material:"matte"
  },

  circlet_serdaigle: {
    silhouette: { kind:"svg", file:"tiara.svg" },
    fills: { band:"#ac8438", points:"#b49040", gem:"#385c9c", side:"#5c84bc" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#b4dcff" }
    ],
    rarity:"common", material:"metal"
  },

  diademe_serdaigle: {
    silhouette: { kind:"svg", file:"tiara.svg" },
    fills: { band:"#c9a84c", points:"#e0c46c", gem:"#244c9c", side:"#6ca8e0" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#c8dcff" },
      { kind:"orb_glow", region:"gem", color:"#8cb4ff" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  coupe_poufsouffle: {
    silhouette: { kind:"svg", file:"chalice.svg" },
    fills: { bowl:"#c9a84c", rim:"#e0c46c", stem:"#b09040", foot:"#a08038", gem:"#d8a82c" },
    accents: [
      { kind:"gem_facet_shine", region:"gem", color:"#ffe090" },
      { kind:"orb_glow", region:"gem", color:"#f0c864" },
      { kind:"emboss", region:"bowl", color:"#78541c" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  retourneur_temps: {
    silhouette: { kind:"svg", file:"hourglass.svg" },
    fills: { frame:"#c9a84c", glass:"#dce0ec", sand_top:"#f0c448", sand_bot:"#d8a82c" },
    accents: [
      { kind:"orb_glow", region:"sand_top", color:"#ffe090" },
      { kind:"gem_facet_shine", region:"glass", color:"#f0f4ff" }
    ],
    rarity:"legendary", material:"metal", sparkles:true
  },

  mandragore: {
    silhouette: { kind:"svg", file:"mandragore.svg" },
    fills: { leaves:"#50843c", root:"#c8a87c", face:"#543820", tendrils:"#ac8c60" },
    accents: [
      { kind:"emboss", region:"root", color:"#7c5c38" },
      { kind:"emboss", region:"leaves", color:"#284c18" }
    ],
    rarity:"common", material:"matte"
  },

  choco_sorcier: {
    silhouette: { kind:"svg", file:"choco-bar.svg" },
    fills: { wrapper:"#ac3c30", bar:"#583420", cube:"#382014", accent:"#d8b860" },
    accents: [
      { kind:"emboss", region:"bar", color:"#20140c" }
    ],
    rarity:"common", material:"matte"
  }
};

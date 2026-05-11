// ============================================================
// ITEM ICONS — resolver d'icônes par item / type / status
// ============================================================
//
// Architecture pour permettre un enrichissement progressif :
//   1. ITEM_ICON_REGISTRY[item.id] = chemin PNG    → priorité 1 (per-item)
//   2. EQUIPMENT_SLOT_ICONS[item.type] = PNG       → priorité 2 (per-slot)
//   3. fallback emoji (item.icon)                  → priorité 3
//
// Phase 2 : seuls les slots génériques sont peuplés. Phase 4 ajoutera
// des entrées dans ITEM_ICON_REGISTRY pour chaque baguette/robe/etc.
// L'intégration UI ne change pas — tout passe par getItemIconHtml().

const EQUIPMENT_SLOT_ICONS = {
  // ── Slots historiques (PNG dédiés) ─────────────────────────
  wand:      'img/icons/wand.png',
  armor:     'img/icons/armor.png',
  acc:       'img/icons/accessory.png',
  spellbook: 'img/icons/spellbook.png',
  // ── Slots étendus (Phase 2 : aliasés sur PNG existants jusqu'à
  //    génération des sprites dédiés en Phase 4 — voir
  //    .claude/plans/equipment-extended.md §2.4 et §7) ──────────
  head:      'img/icons/accessory.png',
  body:      'img/icons/armor.png',
  hands:     'img/icons/accessory.png',
  feet:      'img/icons/accessory.png',
  cloak:     'img/icons/armor.png',
  amulet:    'img/icons/accessory.png',
  ring:      'img/icons/accessory.png',
  ring1:     'img/icons/accessory.png',
  ring2:     'img/icons/accessory.png',
  belt:      'img/icons/accessory.png',
  trinket:   'img/icons/accessory.png'
};

// Registre des icônes per-item (Phase 4 — peuplé pour tous les ITEMS[])
const ITEM_ICON_REGISTRY = {
  // Consommables
  potion_s:           'img/icons/items/potion_s.png',
  potion_m:           'img/icons/items/potion_m.png',
  felix:              'img/icons/items/felix.png',
  potion_force:       'img/icons/items/potion_force.png',
  mandragore:         'img/icons/items/mandragore.png',
  choco_sorcier:      'img/icons/items/choco_sorcier.png',
  // Baguettes / armes
  wand1:              'img/icons/items/wand1.png',
  wand2:              'img/icons/items/wand2.png',
  sword_gryff:        'img/icons/items/sword_gryff.png',
  // Armures
  robe1:              'img/icons/items/robe1.png',
  coupe_poufsouffle:  'img/icons/items/coupe_poufsouffle.png',
  chapeau_pointu:     'img/icons/items/chapeau_pointu.png',
  // Accessoires
  amulette:           'img/icons/items/amulette.png',
  broom:              'img/icons/items/broom.png',
  locket_slytherin:   'img/icons/items/locket_slytherin.png',
  diademe_serdaigle:  'img/icons/items/diademe_serdaigle.png',
  cape_invis:         'img/icons/items/cape_invis.png',
  // Phase 3 extension — sprites dédiés générés par gen_icons.py
  // (gen_item_*, 48×48 RGBA pixel art, palette cohérente).
  gants_apprenti:      'img/icons/items/gants_apprenti.png',
  bottes_apprenti:     'img/icons/items/bottes_apprenti.png',
  chapeau_apprenti:    'img/icons/items/chapeau_apprenti.png',
  ceinture_cuir:       'img/icons/items/ceinture_cuir.png',
  anneau_argent:       'img/icons/items/anneau_argent.png',
  cape_voyageur:       'img/icons/items/cape_voyageur.png',
  amulette_protection: 'img/icons/items/amulette_protection.png',
  circlet_serdaigle:   'img/icons/items/circlet_serdaigle.png',
  anneau_runique:      'img/icons/items/anneau_runique.png',
  ceinture_alchimiste: 'img/icons/items/ceinture_alchimiste.png',
  bottes_dragon:       'img/icons/items/bottes_dragon.png',
  retourneur_temps:    'img/icons/items/retourneur_temps.png',
  // Phase 3b — récompenses de quêtes PNJ
  anneau_resurrection: 'img/icons/items/anneau_resurrection.png',
  larmes_phenix:       'img/icons/items/larmes_phenix.png',
  // Livres de sorts
  livre_sortileges:   'img/icons/items/livre_sortileges.png',
  livre_soin:         'img/icons/items/livre_soin.png',
  book_monsters:      'img/icons/items/book_monsters.png',
  livre_prince:       'img/icons/items/livre_prince.png',
  livre_bombarda:     'img/icons/items/livre_bombarda.png',
  livre_patronum:     'img/icons/items/livre_patronum.png',
  livre_sanguini:     'img/icons/items/livre_sanguini.png',
  livre_vampyrus:     'img/icons/items/livre_vampyrus.png',
  livre_taranta:      'img/icons/items/livre_taranta.png',
  livre_maledictus:   'img/icons/items/livre_maledictus.png',
  livre_crucio:       'img/icons/items/livre_crucio.png',
  livre_morsmordre:   'img/icons/items/livre_morsmordre.png'
};

// Mapping painterly pipeline (étape 9 — voir SVG_PLAN / tools/icon_factory.py)
const ITEM_ICON_NEW_REGISTRY = {
  potion_s:             'img/icons_new/potion_s_64.png',
  felix:                'img/icons_new/felix_64.png',
  wand2:                'img/icons_new/wand2_64.png',
  anneau_runique:       'img/icons_new/anneau_runique_64.png',
  livre_sortileges:     'img/icons_new/livre_sortileges_64.png',
  potion_m:             'img/icons_new/potion_m_64.png',
  potion_force:         'img/icons_new/potion_force_64.png',
  larmes_phenix:        'img/icons_new/larmes_phenix_64.png',
  wand1:                'img/icons_new/wand1_64.png',
  livre_soin:           'img/icons_new/livre_soin_64.png',
  book_monsters:        'img/icons_new/book_monsters_64.png',
  livre_prince:         'img/icons_new/livre_prince_64.png',
  livre_bombarda:       'img/icons_new/livre_bombarda_64.png',
  livre_patronum:       'img/icons_new/livre_patronum_64.png',
  livre_sanguini:       'img/icons_new/livre_sanguini_64.png',
  livre_vampyrus:       'img/icons_new/livre_vampyrus_64.png',
  livre_taranta:        'img/icons_new/livre_taranta_64.png',
  livre_maledictus:     'img/icons_new/livre_maledictus_64.png',
  livre_crucio:         'img/icons_new/livre_crucio_64.png',
  livre_morsmordre:     'img/icons_new/livre_morsmordre_64.png',
  amulette:             'img/icons_new/amulette_64.png',
  amulette_protection:  'img/icons_new/amulette_protection_64.png',
  locket_slytherin:     'img/icons_new/locket_slytherin_64.png',
  robe1:                'img/icons_new/robe1_64.png',
  cape_voyageur:        'img/icons_new/cape_voyageur_64.png',
  cape_invis:           'img/icons_new/cape_invis_64.png',
  anneau_argent:        'img/icons_new/anneau_argent_64.png',
  anneau_resurrection:  'img/icons_new/anneau_resurrection_64.png',
  sword_gryff:          'img/icons_new/sword_gryff_64.png',
  broom:                'img/icons_new/broom_64.png',
  bottes_apprenti:      'img/icons_new/bottes_apprenti_64.png',
  bottes_dragon:        'img/icons_new/bottes_dragon_64.png',
  gants_apprenti:       'img/icons_new/gants_apprenti_64.png',
  ceinture_cuir:        'img/icons_new/ceinture_cuir_64.png',
  ceinture_alchimiste:  'img/icons_new/ceinture_alchimiste_64.png',
  chapeau_apprenti:     'img/icons_new/chapeau_apprenti_64.png',
  chapeau_pointu:       'img/icons_new/chapeau_pointu_64.png',
  circlet_serdaigle:    'img/icons_new/circlet_serdaigle_64.png',
  diademe_serdaigle:    'img/icons_new/diademe_serdaigle_64.png',
  coupe_poufsouffle:    'img/icons_new/coupe_poufsouffle_64.png',
  retourneur_temps:     'img/icons_new/retourneur_temps_64.png',
  mandragore:           'img/icons_new/mandragore_64.png',
  choco_sorcier:        'img/icons_new/choco_sorcier_64.png'
};

// Status effects (battle.js consomme ce registre via STATUS_DEFS[id].iconSrc)
const STATUS_ICON_REGISTRY = {
  burn:   'img/icons/burn.png',
  poison: 'img/icons/poison.png',
  bleed:  'img/icons/bleed.png',
  heal:   'img/icons/heal.png',
  dead:   'img/icons/dead.png'
};

// Sortilèges (priorité 1 par nom canonique, fallback emoji icon)
const SPELL_ICON_REGISTRY = {
  'Expelliarmus':       'img/icons/spells/expelliarmus.png',
  'Stupefix':           'img/icons/spells/stupefix.png',
  'Episkey':            'img/icons/spells/episkey.png',
  'Protego':            'img/icons/spells/protego.png',
  'Incendio':           'img/icons/spells/incendio.png',
  'Accio':              'img/icons/spells/accio.png',
  'Wingardium Leviosa': 'img/icons/spells/wingardium_leviosa.png',
  'Diffindo':           'img/icons/spells/diffindo.png',
  'Reparo':             'img/icons/spells/reparo.png',
  'Sectumsempra':       'img/icons/spells/sectumsempra.png',
  'Lumos Maxima':       'img/icons/spells/lumos_maxima.png',
  'Aguamenti':          'img/icons/spells/aguamenti.png',
  'Bombarda':           'img/icons/spells/bombarda.png',
  'Riddikulus':         'img/icons/spells/riddikulus.png',
  'Alohomora':          'img/icons/spells/alohomora.png',
  'Patronum':           'img/icons/spells/patronum.png',
  'Avada...':           'img/icons/spells/avada.png',
  'Sanguini':           'img/icons/spells/sanguini.png',
  'Vampyrus':           'img/icons/spells/vampyrus.png',
  'Tarantallegra':      'img/icons/spells/tarantallegra.png',
  'Maledictus':         'img/icons/spells/maledictus.png',
  'Crucio':             'img/icons/spells/crucio.png',
  'Morsmordre':         'img/icons/spells/morsmordre.png'
};

// ── API publique ────────────────────────────────────────────

function getItemIconSrc(item) {
  if (!item) return null;
  // Painterly pipeline (étape 9) — prioritaire si l'item y figure
  if (item.id && ITEM_ICON_NEW_REGISTRY[item.id]) return ITEM_ICON_NEW_REGISTRY[item.id];
  if (item.id && ITEM_ICON_REGISTRY[item.id]) return ITEM_ICON_REGISTRY[item.id];
  if (item.type && EQUIPMENT_SLOT_ICONS[item.type]) return EQUIPMENT_SLOT_ICONS[item.type];
  return null;
}

// Retourne soit un <img> HTML, soit l'emoji item.icon en fallback.
// Sécurise les noms d'item (escape minimal sur ").
// Si l'item porte un champ `tint` (ex: variante par teinte), applique
// un drop-shadow coloré pour différencier visuellement les variantes
// d'une même famille — voir .claude/plans/equipment-extended.md §2.4.
function getItemIconHtml(item, sizeClass) {
  const cls = sizeClass || 'ui-icon-md';
  // Le pipeline painterly (étape 9) supplante le système tinted 2-calques
  // pour les items mappés : si l'id figure dans ITEM_ICON_NEW_REGISTRY,
  // on utilise directement le PNG painterly (déjà coloré par recipe).
  const hasPainterly = item && item.id
    && typeof ITEM_ICON_NEW_REGISTRY !== 'undefined'
    && ITEM_ICON_NEW_REGISTRY[item.id];
  // Architecture tint 2-calques : si l'item a `tinted: true` et déclare
  // un blade (silhouette teintable) + un hilt (overlay détails fixes),
  // on rend un wrapper <span> avec deux layers superposés. Voir
  // css/style.css `.tinted-icon` et img/icons/_tint_demo.html.
  if (item && item.tinted && !hasPainterly) {
    const html = _getTintedItemHtml(item, cls);
    if (html) return html;
  }
  const src = getItemIconSrc(item);
  const tint = item && item.tint;
  // Style inline ne sécurise QUE les couleurs hex bien formées (#abc / #abcdef)
  // — toute autre valeur de `tint` est ignorée pour éviter une injection CSS.
  const safeTint = (tint && /^#[0-9a-f]{3,8}$/i.test(tint)) ? tint : null;
  const tintAttr = safeTint
    ? ` style="filter: drop-shadow(0 0 1px ${safeTint}) drop-shadow(0 0 3px ${safeTint});"`
    : '';
  if (src) {
    const alt = (item && item.name ? item.name : '').replace(/"/g, '&quot;');
    return `<img class="ui-icon ${cls}" src="${src}" alt="${alt}"${tintAttr}>`;
  }
  if (item && item.icon) {
    return safeTint
      ? `<span class="ui-icon-emoji"${tintAttr}>${item.icon}</span>`
      : item.icon;
  }
  return '';
}

// Tint 2-calques : produit le wrapper HTML pour un item à variantes
// (métaux, bois, ...). Refuse silencieusement (retourne null → fallback
// path normal) si les valeurs ne passent pas la whitelist anti-injection
// CSS. Les noms `tintMask` / `tintOverlay` correspondent aux deux PNG
// sources (silhouette teintable + overlay de détails fixes).
const _TINT_NAME_RE = /^[a-z0-9_]+$/i;
const _TINT_ALLOWED_VALUES = [
  // métaux
  'iron', 'copper', 'bronze', 'silver', 'gold', 'platinum',
  // bois (baguettes)
  'oak', 'ebony', 'willow', 'holly', 'elder', 'vine',
];
function _getTintedItemHtml(item, cls) {
  const mask    = String(item.tintMask    || '');
  const overlay = String(item.tintOverlay || '');
  const tint    = String(item.tint        || 'silver');
  if (!_TINT_NAME_RE.test(mask))    return null;
  if (!_TINT_NAME_RE.test(overlay)) return null;
  if (_TINT_ALLOWED_VALUES.indexOf(tint) === -1) return null;
  const alt = (item && item.name ? item.name : '').replace(/"/g, '&quot;');
  // ⚠️ Piège des url() dans les custom properties CSS : elles sont
  // résolues relativement au fichier CSS qui CONSOMME la var, pas au
  // document HTML qui la DÉFINIT. style.css est dans /css/, donc on
  // préfixe par `../` pour pointer vers /img/icons/items/. Sans ça,
  // le navigateur cherche /css/img/icons/items/... (404 silencieux).
  const maskUrl    = `url('../img/icons/items/${mask}.png')`;
  const overlayUrl = `url('../img/icons/items/${overlay}.png')`;
  return `<span class="ui-icon tinted-icon ${cls} tint-${tint}" `
       + `data-mask="${mask}" data-overlay="${overlay}" data-tint="${tint}" `
       + `role="img" aria-label="${alt}">`
       +   `<span class="tint-mask"    style="--tint-mask:${maskUrl}"></span>`
       +   `<span class="tint-overlay" style="--tint-overlay:${overlayUrl}"></span>`
       + `</span>`;
}

// Pour les emplacements d'équipement (fiche perso, panneau gauche)
// quand on veut juste représenter le slot type sans item équipé.
function getEquipmentSlotIconHtml(slotType, sizeClass) {
  const cls = sizeClass || 'ui-icon-md';
  const src = EQUIPMENT_SLOT_ICONS[slotType];
  if (!src) return '';
  return `<img class="ui-icon ${cls}" src="${src}" alt="">`;
}

// Pour status effects (badges combat).
function getStatusIconHtml(statusId, sizeClass) {
  const cls = sizeClass || 'ui-icon-sm';
  const src = STATUS_ICON_REGISTRY[statusId];
  if (!src) return '';
  return `<img class="ui-icon ${cls}" src="${src}" alt="">`;
}

// Pour sortilèges (modale sorts, log combat).
// Accepte soit l'objet spell complet, soit son name (string).
function getSpellIconHtml(spell, sizeClass) {
  const cls = sizeClass || 'ui-icon-md';
  const name = (spell && spell.name) ? spell.name : spell;
  const src = SPELL_ICON_REGISTRY[name];
  if (src) {
    const alt = (name || '').replace(/"/g, '&quot;');
    return `<img class="ui-icon ${cls}" src="${src}" alt="${alt}">`;
  }
  return (spell && spell.icon) ? spell.icon : '';
}

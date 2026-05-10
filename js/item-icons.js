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

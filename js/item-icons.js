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
  wand:      'img/icons/wand.png',
  armor:     'img/icons/armor.png',
  acc:       'img/icons/accessory.png',
  spellbook: 'img/icons/spellbook.png'
};

// Registre des icônes per-item — vide pour l'instant.
// Format : { 'wand_houx': 'img/icons/items/wand_houx.png', ... }
const ITEM_ICON_REGISTRY = {};

// Status effects (battle.js consomme ce registre via STATUS_DEFS[id].iconSrc)
const STATUS_ICON_REGISTRY = {
  burn:   'img/icons/burn.png',
  poison: 'img/icons/poison.png',
  bleed:  'img/icons/bleed.png',
  heal:   'img/icons/heal.png',
  dead:   'img/icons/dead.png'
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
function getItemIconHtml(item, sizeClass) {
  const cls = sizeClass || 'ui-icon-md';
  const src = getItemIconSrc(item);
  if (src) {
    const alt = (item && item.name ? item.name : '').replace(/"/g, '&quot;');
    return `<img class="ui-icon ${cls}" src="${src}" alt="${alt}">`;
  }
  return (item && item.icon) ? item.icon : '';
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

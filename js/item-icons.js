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
  // Versions "++" étage 5+ : réutilisent les PNG des petites en attendant
  // la génération de sprites dédiés via tools/gen_icons.py.
  potion_l:           'img/icons/items/potion_s.png',
  potion_l_sp:        'img/icons/items/potion_m.png',
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
  // Cor du Pégase (equipment-bonuses-v2 Vague B) — fallback legacy ; le
  // rendu effectif passe par le PNG painterly d'ITEM_ICON_NEW_REGISTRY.
  cor_pegasse:         'img/icons/items/retourneur_temps.png',
  // Phase 3b — récompenses de quêtes PNJ
  anneau_resurrection: 'img/icons/items/anneau_resurrection.png',
  larmes_phenix:       'img/icons/items/larmes_phenix.png',
  // Phase 3c — équipements mid-game (réutilisent les PNG des variantes
  // rares en attendant la génération de sprites dédiés via gen_icons.py).
  gants_duelliste:     'img/icons/items/gants_apprenti.png',
  casque_aurore:       'img/icons/items/chapeau_pointu.png',
  ceinture_force:      'img/icons/items/ceinture_alchimiste.png',
  anneau_courage:      'img/icons/items/anneau_runique.png',
  bottes_silence:      'img/icons/items/bottes_dragon.png',
  talisman_tactique:   'img/icons/items/retourneur_temps.png',
  // Endgame — réutilisent les PNG existants en attendant la génération
  // de sprites dédiés via gen_icons.py. Cf. ENDGAME_PLAN.md §7.3/§7.10.
  potion_xl:           'img/icons/items/potion_s.png',
  potion_xl_sp:        'img/icons/items/potion_m.png',
  larme_phenix_pure:   'img/icons/items/larmes_phenix.png',
  cape_voldemort:      'img/icons/items/cape_invis.png',
  cendres_phenix:      'img/icons/items/larmes_phenix.png',
  oeil_basilic:        'img/icons/items/retourneur_temps.png',
  // Matériaux endgame (Tranche 2) — réutilisent les PNG existants.
  essence_tenebres:    'img/icons/items/larmes_phenix.png',
  page_grimoire:       'img/icons/items/livre_sortileges.png',
  // Items Tier 2 Maison (cf. .claude/plans/house-intermediate-tier.md) —
  // alias legacy vers le PNG du slot le plus proche. Le rendu effectif
  // passe par ITEM_ICON_NEW_REGISTRY (painterly, priorité 1 au runtime).
  brassard_lion:       'img/icons/items/gants_apprenti.png',
  anneau_serpent:      'img/icons/items/anneau_runique.png',
  plume_aigle:         'img/icons/items/retourneur_temps.png',
  ceinture_blaireau:   'img/icons/items/ceinture_cuir.png',
  // Items Tier 5 Maison (Tranche 2) — réutilisent les PNG des items Tier 4.
  lame_godric:         'img/icons/items/sword_gryff.png',
  bague_salazar:       'img/icons/items/locket_slytherin.png',
  bouclier_helga:      'img/icons/items/coupe_poufsouffle.png',
  codex_rowena:        'img/icons/items/diademe_serdaigle.png',
  // Sets Maison 2.0 — pièces #2/#3/#4. Les PNG painterly dédiés
  // (générés par tools/icon_factory.py) sont déclarés dans
  // ITEM_ICON_NEW_REGISTRY plus bas (priorité 1 au runtime). Les
  // entrées ci-dessous servent de fallback legacy si jamais le
  // _64.png échoue à charger (et satisfont la couverture 100 % du
  // smoke `scenarioItemIcons`).
  // Set du Lion (Gryffondor)
  heaume_vaillant:     'img/icons/items/chapeau_pointu.png',
  cape_godric:         'img/icons/items/cape_invis.png',
  coeur_lion:          'img/icons/items/locket_slytherin.png',
  // Set du Serpent (Serpentard)
  pendentif_mamba:     'img/icons/items/locket_slytherin.png',
  cape_sibylline:      'img/icons/items/cape_invis.png',
  couronne_basilic:    'img/icons/items/diademe_serdaigle.png',
  // Set de l'Aigle (Serdaigle)
  manteau_encre:       'img/icons/items/cape_invis.png',
  oeil_aigle:          'img/icons/items/locket_slytherin.png',
  anneau_savoir:       'img/icons/items/anneau_runique.png',
  // Set du Blaireau (Poufsouffle)
  cape_loyaute:        'img/icons/items/cape_invis.png',
  coiffe_blaireau:     'img/icons/items/chapeau_pointu.png',
  medaillon_helga:     'img/icons/items/locket_slytherin.png',
  // Livres de sorts
  livre_sortileges:   'img/icons/items/livre_sortileges.png',
  livre_soin:         'img/icons/items/livre_soin.png',
  // livre_ferula : painterly dédié dans ITEM_ICON_NEW_REGISTRY (priorité 1) ;
  // alias legacy de secours + couverture smoke.
  livre_ferula:       'img/icons/items/livre_soin.png',
  book_monsters:      'img/icons/items/book_monsters.png',
  livre_prince:       'img/icons/items/livre_prince.png',
  livre_bombarda:     'img/icons/items/livre_bombarda.png',
  livre_patronum:     'img/icons/items/livre_patronum.png',
  livre_glacius:      'img/icons/items/livre_glacius.png',
  livre_fulgari:      'img/icons/items/livre_fulgari.png',
  livre_lumos_solem:  'img/icons/items/livre_lumos_solem.png',
  livre_sanguini:     'img/icons/items/livre_sanguini.png',
  livre_vampyrus:     'img/icons/items/livre_vampyrus.png',
  livre_taranta:      'img/icons/items/livre_taranta.png',
  livre_maledictus:   'img/icons/items/livre_maledictus.png',
  livre_crucio:       'img/icons/items/livre_crucio.png',
  livre_morsmordre:   'img/icons/items/livre_morsmordre.png',
  // Cf. .claude/plans/teleportation-spell.md — icône reprise du sort.
  livre_portus:       'img/icons/items/livre_portus.png'
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
  livre_ferula:         'img/icons_new/livre_ferula_64.png',
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
  livre_glacius:        'img/icons_new/livre_glacius_64.png',
  livre_fulgari:        'img/icons_new/livre_fulgari_64.png',
  livre_lumos_solem:    'img/icons_new/livre_lumos_solem_64.png',
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
  cor_pegasse:          'img/icons_new/cor_pegasse_64.png',
  mandragore:           'img/icons_new/mandragore_64.png',
  choco_sorcier:        'img/icons_new/choco_sorcier_64.png',
  // Tier 2 Maison (cf. .claude/plans/house-intermediate-tier.md)
  brassard_lion:        'img/icons_new/brassard_lion_64.png',
  anneau_serpent:       'img/icons_new/anneau_serpent_64.png',
  plume_aigle:          'img/icons_new/plume_aigle_64.png',
  ceinture_blaireau:    'img/icons_new/ceinture_blaireau_64.png',
  // Sets de Maison 2.0 — pièces #2/#3/#4 (cf. .claude/plans/houses-2.0.md §B)
  // Générées via `python3 tools/icon_factory.py <id…>` — recettes dans
  // tools/icon_factory.py, emblème de Maison via accent symbol.
  // Set du Lion (Gryffondor)
  heaume_vaillant:      'img/icons_new/heaume_vaillant_64.png',
  cape_godric:          'img/icons_new/cape_godric_64.png',
  coeur_lion:           'img/icons_new/coeur_lion_64.png',
  // Set du Serpent (Serpentard)
  pendentif_mamba:      'img/icons_new/pendentif_mamba_64.png',
  cape_sibylline:       'img/icons_new/cape_sibylline_64.png',
  couronne_basilic:     'img/icons_new/couronne_basilic_64.png',
  // Set de l'Aigle (Serdaigle)
  manteau_encre:        'img/icons_new/manteau_encre_64.png',
  oeil_aigle:           'img/icons_new/oeil_aigle_64.png',
  anneau_savoir:        'img/icons_new/anneau_savoir_64.png',
  // Set du Blaireau (Poufsouffle)
  cape_loyaute:         'img/icons_new/cape_loyaute_64.png',
  coiffe_blaireau:      'img/icons_new/coiffe_blaireau_64.png',
  medaillon_helga:      'img/icons_new/medaillon_helga_64.png',
  // Équipements mid-game (cf. .claude/plans/difficulty-polish-v3.md Vague A)
  gants_duelliste:      'img/icons_new/gants_duelliste_64.png',
  casque_aurore:        'img/icons_new/casque_aurore_64.png',
  ceinture_force:       'img/icons_new/ceinture_force_64.png',
  anneau_courage:       'img/icons_new/anneau_courage_64.png',
  bottes_silence:       'img/icons_new/bottes_silence_64.png',
  talisman_tactique:    'img/icons_new/talisman_tactique_64.png'
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
  'Ferula':             'img/icons/spells/ferula.png',
  'Ferula Maxima':      'img/icons/spells/ferula_maxima.png',
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
  'Morsmordre':         'img/icons/spells/morsmordre.png',
  'Portus':             'img/icons/spells/teleportation.png',
  'Glacius':            'img/icons/spells/glacius.png',
  'Fulgari':            'img/icons/spells/fulgari.png',
  'Lumos Solem':        'img/icons/spells/lumos_solem.png',
  // Sorts de Maison — palier 17 « Mythe »
  'Patronus Maxima':       'img/icons/spells/patronus_maxima.png',
  'Sectumsempra Imperius': 'img/icons/spells/sectumsempra_imperius.png',
  'Legilimens':            'img/icons/spells/legilimens.png',
  'Récolte Magique':       'img/icons/spells/recolte_magique.png'
};

// ── Registre d'icônes SVG inline (herbes + potions) ──────────
// Voir .claude/plans/farming-potion-system.md. Consulté EN PREMIER
// par getItemIconHtml() : si l'id y figure, on rend le SVG inline.
// Sinon, comportement inchangé (PNG painterly → PNG legacy → emoji).
// Chaque <clipPath> porte un id unique pour éviter les collisions
// quand plusieurs icônes sont inlinées sur la même page.
const ITEM_ICON_SVG_REGISTRY = {
  herbe_armoise: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 56 L32 14" stroke="#3c7a2e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 44 Q18 40 14 28 Q26 30 32 42 Z" fill="#5fae3f"/><path d="M32 44 Q46 40 50 28 Q38 30 32 42 Z" fill="#6fbf4a"/><path d="M32 32 Q20 28 17 18 Q28 21 32 31 Z" fill="#5fae3f"/><path d="M32 32 Q44 28 47 18 Q36 21 32 31 Z" fill="#6fbf4a"/><path d="M32 20 Q26 14 32 7 Q38 14 32 20 Z" fill="#7fce5a"/></svg>`,
  herbe_ortie: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 56 L32 16" stroke="#5a6b2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 40 L16 34 L22 32 L14 26 L24 26 L20 19 L30 24 L32 38 Z" fill="#6e7d33"/><path d="M32 40 L48 34 L42 32 L50 26 L40 26 L44 19 L34 24 L32 38 Z" fill="#828f3f"/><path d="M32 24 L24 18 L29 16 L24 10 L32 13 L40 10 L35 16 L40 18 Z" fill="#909a4a"/></svg>`,
  herbe_asphodele: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 58 L32 20" stroke="#2f8f7e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 46 Q22 44 20 36 Q30 38 32 44 Z" fill="#3aa890"/><path d="M32 40 Q42 38 44 30 Q34 32 32 38 Z" fill="#3aa890"/><g fill="#eef6f2"><circle cx="32" cy="16" r="6.5"/><circle cx="22" cy="24" r="5"/><circle cx="42" cy="22" r="5"/></g><g fill="#ffd24a"><circle cx="32" cy="16" r="2.2"/><circle cx="22" cy="24" r="1.7"/><circle cx="42" cy="22" r="1.7"/></g></svg>`,
  herbe_branchiflore: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="4.2" stroke-linecap="round"><path d="M32 58 Q22 46 30 36 Q40 26 30 13" stroke="#2a8d9d"/><path d="M32 58 Q42 46 34 36 Q26 26 36 13" stroke="#37a7b5"/><path d="M32 50 Q24 42 30 31" stroke="#52c8d2"/></g></svg>`,
  herbe_aconit: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 58 L32 26" stroke="#3c6a3e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 40 Q22 38 20 30 Q30 32 32 38 Z" fill="#4c8a4e"/><path d="M32 40 Q42 38 44 30 Q34 32 32 38 Z" fill="#5c9a5e"/><g fill="#7a3a9d"><path d="M32 27 Q23 25 25 15 Q32 18 32 27 Z"/><path d="M32 27 Q41 25 39 15 Q32 18 32 27 Z"/></g><g fill="#9a5abd"><path d="M32 18 Q26 16 28 7 Q33 11 32 18 Z"/><path d="M32 18 Q38 16 36 7 Q31 11 32 18 Z"/></g></svg>`,
  herbe_dictame: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 58 L32 24" stroke="#6a7a5a" stroke-width="3" fill="none" stroke-linecap="round"/><g><circle cx="21" cy="35" r="9.5" fill="#b89ac8"/><circle cx="44" cy="31" r="9.5" fill="#c8aad8"/><circle cx="32" cy="17" r="9.5" fill="#d8bae8"/></g><g fill="#9a7aaa" opacity="0.55"><circle cx="21" cy="35" r="4"/><circle cx="44" cy="31" r="4"/><circle cx="32" cy="17" r="4"/></g></svg>`,
  potion_s: _potionSvg('cl_ps', 40, '#d83a3a', '#f06a6a', '#b07a3a'),
  potion_m: _potionSvg('cl_pm', 40, '#9a3ad8', '#b86ae0', '#b07a3a'),
  potion_l: _potionSvg('cl_pl', 33, '#d83a3a', '#f06a6a', '#b07a3a'),
  potion_l_sp: _potionSvg('cl_plsp', 33, '#9a3ad8', '#b86ae0', '#b07a3a'),
  potion_force: _potionSvg('cl_pf', 33, '#e8862a', '#f4a85a', '#b07a3a'),
  potion_xl: _potionSvg('cl_pxl', 27, '#e8324a', '#ff6a78', '#e8c14a', true),
};

// Génère le SVG d'une fiole : `liqY` = niveau du liquide (y, plus petit
// = plus rempli), `liq`/`liq2` couleurs, `cap` couleur du bouchon,
// `sparkle` ajoute des étincelles (potion suprême).
function _potionSvg(clipId, liqY, liq, liq2, cap, sparkle) {
  const body = 'M27 25 L27 31 A17 17 0 1 0 37 31 L37 25 Z';
  const stars = sparkle
    ? '<g fill="#fff7d0"><circle cx="45" cy="19" r="1.8"/><circle cx="19" cy="45" r="1.4"/></g>'
    : '';
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">`
    + `<defs><clipPath id="${clipId}"><path d="${body}"/></clipPath></defs>`
    + `<path d="${body}" fill="#1a2230" opacity="0.22"/>`
    + `<g clip-path="url(#${clipId})"><rect x="10" y="${liqY}" width="44" height="44" fill="${liq}"/>`
    + `<ellipse cx="32" cy="${liqY}" rx="14" ry="3" fill="${liq2}"/></g>`
    + `<path d="${body}" fill="none" stroke="#d6e4ee" stroke-width="2.4"/>`
    + `<rect x="27" y="12" width="10" height="14" fill="none" stroke="#d6e4ee" stroke-width="2.4"/>`
    + `<rect x="24" y="7" width="16" height="8" rx="2.5" fill="${cap}"/>`
    + `<ellipse cx="25" cy="40" rx="2.6" ry="7" fill="#ffffff" opacity="0.4"/>`
    + stars
    + `</svg>`;
}

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
  // SVG inline dédié (herbes, potions) — priorité absolue.
  if (item && item.id
      && typeof ITEM_ICON_SVG_REGISTRY !== 'undefined'
      && ITEM_ICON_SVG_REGISTRY[item.id]) {
    return `<span class="ui-icon svg-icon ${cls}">${ITEM_ICON_SVG_REGISTRY[item.id]}</span>`;
  }
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

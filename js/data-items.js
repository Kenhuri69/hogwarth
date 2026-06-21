// ============================================================
// DONNÉES — OBJETS (premium + ITEMS + POTION_RECIPES + coffres)
// (extrait de data.js — Lot A P3.3, pur couper-coller)
// ============================================================

// Multiplicateur de stats des variantes Premium (variante coloriée par Maison
// d'un artefact de base — plan §1.5). Appliqué par `premiumStat()` lors de la
// GÉNÉRATION des entrées Premium (stats pré-cuites dans ITEMS), JAMAIS au
// runtime : aucun chemin chaud (recalculateStats) n'est touché.
const PREMIUM_MULT = { rare: 1.20, epic: 1.35, legendary: 1.50 };

// Variante Premium de prestige par Maison (P2) — remise cérémonielle par le
// Chef de Maison à la complétion de la Quête Signature (pendingHouseRewards).
// Une seule Premium par Maison, recoloriée + boostée (stats pré-cuites dans
// ITEMS via premiumStat). Consommé par quests.js et npc-dialog.js.
const HOUSE_PREMIUM = {
  Gryffondor:  'orbe_runique_premium_gryff',
  Serpentard:  'masque_rituel_premium_slyth',
  Serdaigle:   'baton_ancestral_premium_serd',
  Poufsouffle: 'talisman_fondateurs_premium_pouf',
};

// Calcule une stat boostée Premium : `value × PREMIUM_MULT[rarity]`. PUR (aucun
// accès à l'état) — testé dans tests/units.js. Règles :
//  - rareté inconnue → multiplicateur 1 (no-op sûr) ;
//  - valeur non finie → renvoyée telle quelle ;
//  - valeur ≤ 0 (malus de trade-off, ou 0) → JAMAIS aggravée : une Premium
//    boost le bon côté, pas le défaut ;
//  - bonus entier → arrondi à l'entier le plus proche ;
//  - valeur fractionnaire (regen %, multiplicateurs crit…) ou opts.fractional
//    → arrondie à 2 décimales.
function premiumStat(value, rarity, opts) {
  const mult = (PREMIUM_MULT[rarity] != null) ? PREMIUM_MULT[rarity] : 1;
  if (typeof value !== 'number' || !isFinite(value)) return value;
  if (value <= 0) return value;
  const boosted = value * mult;
  const fractional = (opts && opts.fractional) || !Number.isInteger(value);
  return fractional ? Math.round(boosted * 100) / 100 : Math.round(boosted);
}

const ITEMS = [
  { id:"potion_s", name:"Potion de Soin", icon:"🧪", desc:"+15 PV", type:"consumable", effect:"heal", power:15, price:30 },
  // Chaîne de soin à paliers (P4 — upgrade-craft via Éclat de Vitalité).
  { id:"potion_soin_mineure",      name:"Potion de Soin Mineure",   icon:"🧪", desc:"+15 PV",  type:"consumable", effect:"heal", power:15, price:28 },
  { id:"potion_soin_mineure_plus", name:"Potion de Soin Mineure +", icon:"🧪", desc:"+30 PV",  type:"consumable", effect:"heal", power:30, price:55 },
  { id:"potion_soin_mineure_pp",   name:"Potion de Soin Mineure ++",icon:"🧪", desc:"+55 PV",  type:"consumable", effect:"heal", power:55, price:95 },
  { id:"potion_m", name:"Potion Magique", icon:"💜", desc:"+12 PM", type:"consumable", effect:"restore_sp", power:12, price:25 },
  { id:"potion_l",     name:"Grande Potion de Soin", icon:"🧪", desc:"+40 PV", type:"consumable", effect:"heal",       power:40, price:80 },
  { id:"potion_l_sp",  name:"Grande Potion Magique", icon:"💜", desc:"+30 PM", type:"consumable", effect:"restore_sp", power:30, price:70 },
  { id:"felix", name:"Félix Felicis", icon:"✨", desc:"Chance liquide : améliore butin, or et trouvailles pendant 40 pas.", type:"consumable", effect:"fortune", price:80 },
  { id:"mandragore", name:"Racine de Mandragore", icon:"🌿", desc:"+8 PV", type:"consumable", effect:"heal", power:8, price:15 },
  // ── Consommables à effet (au-delà du +PV/PM) ────────────────
  { id:"elixir_antidote",  name:"Élixir d'Antidote",      icon:"🧴", desc:"Purge brûlure, poison, saignement et engelures", type:"consumable", effect:"cure",        price:45 },
  { id:"elixir_regen",     name:"Élixir de Régénération", icon:"🌱", desc:"Régénère 6 PV/tour pendant 4 tours",            type:"consumable", effect:"regen_buff",  power:6, turns:4, price:55 },
  { id:"potion_resistance", name:"Potion de Résistance", icon:"🛡️", desc:"Réduit de 40 % tous les dégâts subis pendant 3 tours", type:"consumable", effect:"resist_buff", power:40, turns:3, price:50 },
  { id:"wand1",   name:"Baguette de Saule",   icon:"🪄", desc:"ATK+2",                      type:"wand",  slot:"wand",   family:"wand_basic",    rarity:"common", power:2, bonusAtk:2,                                price:80,  tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_basic", tint:"willow" },
  { id:"wand2",   name:"Baguette de Sureau",  icon:"🪄", desc:"ATK+5 MAG+3 · Crit +2% (×1.7)", type:"wand",  slot:"wand",   family:"wand_elder",    rarity:"rare",   power:5, bonusAtk:5, bonusMag:3, bonusCritChance:2, bonusCritDamage:0.2, price:300, tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_runic", tint:"elder"  },
  // Récompense de la quête de fouille d'Ollivander en Boucle (bois_ollivander_boucle).
  // Baguette épique taillée dans un if des Profondeurs ; non vendue (price 0).
  { id:"baguette_if_boucle", name:"Baguette d'If des Profondeurs", icon:"🪄", desc:"ATK+6 MAG+6 · Crit de sort +3% (×1.75)", type:"wand", slot:"wand", family:"wand_yew", rarity:"epic", power:6, bonusAtk:6, bonusMag:6, bonusSpellCritChance:3, bonusSpellCritDamage:0.25, price:0, tinted:true, tintMask:"wand_shaft_base", tintOverlay:"wand_tip_runic", tint:"ebony" },
  { id:"robe1",   name:"Robe Renforcée",      icon:"🧥", desc:"DEF+3",                      type:"armor", slot:"body",   family:"robe",          rarity:"common", power:3, bonusDef:3,                                    price:150 },
  { id:"amulette",name:"Amulette du Phénix",  icon:"💎", desc:"MAG+4 LCK+3 · Apprend Reparo", type:"acc", slot:"amulet", family:"amulet_phoenix",rarity:"epic",   power:4, bonusMag:4, bonusLck:3, grantsSpell:"Reparo", price:250 },
  { id:"broom",   name:"Balai Nimbus 2000",   icon:"🧹", desc:"Fuite garantie",             type:"acc",   slot:"trinket", family:"broom",        rarity:"rare",   power:0,                                                price:200 },
  // ── Consommables endgame (drop Ténèbres + shop floor 15+) ──
  // Voir ENDGAME_PLAN.md §7.10.
  { id:"potion_xl",         name:"Élixir Suprême",       icon:"🧪", desc:"Restaure 100 % PV",
    type:"consumable", effect:"heal_full", price:200 },
  { id:"potion_xl_sp",      name:"Élixir d'Esprit Suprême", icon:"💜", desc:"Restaure 100 % PM",
    type:"consumable", effect:"restore_sp_full", price:200 },
  // Larme du Phénix Pure : passive — au moment d'un KO, si présente en
  // inventaire, ressuscite le perso à hpMax et consomme l'item.
  // Hook dans battle.js — triggerDeath/enemyTurn (cf. §7.10).
  { id:"larme_phenix_pure", name:"Larme du Phénix Pure", icon:"✨", desc:"Ressuscite un perso KO (auto)",
    type:"consumable", effect:"auto_revive", price:500 },
  // ── Matériaux endgame (Tranche 2 — Forge & Bibliothèque) ──────
  // Drop sur tout monstre variant `darkness` (cf. ENDGAME_PLAN.md §7.10).
  // Type `material` : stockable mais non utilisable directement (useItem refuse).
  // Consommés lors d'un upgrade Forge (essence_tenebres) ou Bibliothèque (page_grimoire).
  { id:"essence_tenebres", name:"Essence des Ténèbres", icon:"🌑", desc:"Matériau · Forge des Ténèbres",
    type:"material", price:0 },
  { id:"page_grimoire",    name:"Page de Grimoire",     icon:"📜", desc:"Matériau · Bibliothèque interdite",
    type:"material", price:0 },
  // Matériau premium T5 (endgame) — requis pour forger un item au-delà de +5
  // (niveaux 6-8). Vendu par l'Apothicaire des Ténèbres (Boucle). Cf.
  // .claude/plans/forge-t5.md.
  { id:"essence_primordiale", name:"Essence Primordiale", icon:"🔮", desc:"Matériau · Forge T5 (forge au-delà de +5)",
    type:"material", price:1200 },
  // Ressource d'upgrade-craft des potions (P4). Achetable (boutique étage ≥ 3)
  // + drop de coffre. Consommée au chaudron pour monter une potion en rang.
  { id:"eclat_vitalite",   name:"Éclat de Vitalité",    icon:"❤️", desc:"Matériau · concentré de vie pour potions",
    type:"material", price:35 },
  // Objet de lore — fil rouge « Clé de Voûte des Quatre » (déclencheur).
  // Fragment de la relique brisée des Fondateurs. Drop garanti (chance 1.0)
  // sur un monstre-jalon par tranche : Peeves (1-3), Loup-Garou Enragé (4-6),
  // Mangemort d'Élite (7-10). Réuni ×3 pour la quête `eclats_clef_voute`.
  // type:"material" → ni équipable ni consommable (useItem refuse) ; compté
  // par _countItems / _countMaterial et consommé à la remise de la quête.
  { id:"eclat_voute",      name:"Éclat de la Clé de Voûte", icon:"🔹", rarity:"rare",
    desc:"Un fragment de la relique des Fondateurs. Il est froid, et il chuchote.",
    type:"material", price:0 },
  // Objet de quête — récit de Manon recueilli pour le mémoire de Lockhart
  // (chaîne manon_confier → memoire_lockhart, Boucle). Consommé à la remise.
  { id:"recit_manon",     name:"Le récit de Manon", icon:"📜", rarity:"rare",
    desc:"Les souvenirs d'Élara, mis en mots par sa fille. Une histoire vraie, enfin.",
    type:"material", price:0 },
  // Objet de quête — Épreuve de la Lumière Éternelle (portrait de Dumbledore).
  // Tombe des morts-vivants ; réuni ×3 pour le 1er temps de l'épreuve.
  // type:"quest" → non utilisable manuellement (useItem affiche un message).
  { id:"eclat_lumiere",    name:"Éclat de Lumière",     icon:"✨",
    desc:"Fragment de clarté arraché aux ténèbres — objet de quête.",
    type:"quest", price:0 },
  // Clé de salle scellée (enrichissement du donjon §2.C). Lâchée par un
  // monstre de l'étage ; ouvre une porte CELL.DOOR. type:"key" → non
  // utilisable manuellement (useItem affiche un indice).
  { id:"cle_donjon",       name:"Clé du Donjon",        icon:"🗝️",
    desc:"Une lourde clé de fer rouillée. Ouvre une porte scellée du donjon.",
    type:"key", price:0 },
  // ── Items légendaires+ Maison Tier 5 (endgame Tranche 2) ─────
  // Récompenses du palier Tier 5 (2000 pts, gated par victoryAchieved).
  // Voir ENDGAME_PLAN.md §7.7. Cumulables avec les items Tier 4 si slots
  // différents (sauf lame_godric/sword_gryff partage slot wand).
  { id:"lame_godric",     name:"Lame de Godric",       icon:"⚔️", desc:"ATK+12 LCK+3 — Tier 5 Gryffondor",
    type:"wand",  slot:"wand",   family:"sword_godric",  rarity:"legendary",
    power:12, bonusAtk:12, bonusLck:3, price:0 },
  { id:"bague_salazar",   name:"Bague de Salazar",     icon:"💍", desc:"MAG+8 LCK+5 — Tier 5 Serpentard",
    type:"acc",   slot:"ring",   family:"ring_salazar",  rarity:"legendary",
    power:8,  bonusMag:8,  bonusLck:5, price:0 },
  { id:"bouclier_helga",  name:"Bouclier de Helga",    icon:"🛡️", desc:"DEF+10 — Tier 5 Poufsouffle",
    type:"armor", slot:"body",   family:"shield_helga",  rarity:"legendary",
    power:10, bonusDef:10,             price:0 },
  { id:"codex_rowena",    name:"Codex de Rowena",      icon:"📔", desc:"MAG+10 INT+3 — Tier 5 Serdaigle",
    type:"acc",   slot:"trinket",family:"codex_rowena", rarity:"legendary",
    power:10, bonusMag:10, bonusInt:3, price:0 },
  // ── Set bonus Ténèbres (endgame Tranche 2) ───────────────────
  // Ids des 3 drops Ténèbres formant un set. Bonus de synergie appliqué
  // dans recalculateStats() : 2/3 = +10 crit/+5 dodge ; 3/3 = +15 crit /
  // +10 dodge / +2 regenHp. Voir ENDGAME_PLAN.md §7.8.
  // (Constante exportée juste en dessous de la définition des 3 items.)
  // ── Drops Ténèbres (post-victoire, floor 11+) — variant darkness ──
  // Voir ENDGAME_PLAN.md §7.3. Drop bonus 8 % sur tout monstre variant
  // `darkness` (logique dans battle.js — endBattle).
  { id:"cape_voldemort", name:"Cape de l'Ombre",    icon:"🌫️", desc:"DEF+4 MAG+3 · Régen +1 PM/tour",
    type:"acc", slot:"cloak",  family:"cloak_voldemort", rarity:"legendary",
    bonusDef:4, bonusMag:3, regenSp:1, power:4, price:0, tint:"#3a1a5a" },
  { id:"cendres_phenix", name:"Cendres du Phénix",  icon:"🔥", desc:"MAG+4 LCK+2 · Régen +4 PV/tour",
    type:"acc", slot:"amulet", family:"amulet_ashes",    rarity:"legendary",
    bonusMag:4, bonusLck:2, regenHp:4, power:4, price:0, tint:"#e84020" },
  { id:"oeil_basilic",   name:"Œil de Basilic",     icon:"🐍", desc:"Crit +10 % · Esquive +5 %",
    type:"acc", slot:"trinket",family:"trinket_basilisk", rarity:"legendary",
    bonusCritChance:10, bonusDodgeChance:5, power:0, price:0, tint:"#3a8a3a" },
  // ── Objets légendaires des Maisons (non vendus, récompenses du système de Maison) ──
  { id:"sword_gryff",      name:"Épée de Gryffondor",   icon:"⚔️",  desc:"ATK+8 — Légendaire Gryffondor",    type:"wand",  slot:"wand",   family:"sword_gryff",   rarity:"legendary", power:8, bonusAtk:8,              price:0,  tinted:true, tintMask:"sword_blade_base", tintOverlay:"sword_hilt_gryff", tint:"silver" },
  { id:"locket_slytherin", name:"Médaillon de Serpentard",icon:"🐍", desc:"MAG+6 LCK+3 — Légendaire Serpentard", type:"acc", slot:"amulet", family:"locket_slyth",  rarity:"legendary", power:6, bonusMag:6, bonusLck:3, price:0 },
  { id:"diademe_serdaigle",name:"Diadème de Serdaigle", icon:"👑",  desc:"MAG+4 LCK+5 — Légendaire Serdaigle",  type:"acc", slot:"head",   family:"diademe_serd",  rarity:"legendary", power:4, bonusMag:4, bonusLck:5, price:0 },
  { id:"coupe_poufsouffle",name:"Coupe de Poufsouffle", icon:"🏆",  desc:"DEF+6 — Légendaire Poufsouffle",   type:"armor", slot:"body",   family:"coupe_pouf",    rarity:"legendary", power:6, bonusDef:6,              price:0 },
  // ── Pièces #1 des 4 Sets Maison (Apprenti Or, tier 3, head-of-house) ──
  // Items existants annotés setKey/setPiece pour la détection de set
  // dans recalculateStats (cf. .claude/plans/houses-2.0.md §B).
  { id:"brassard_lion",    name:"Brassard du Lion",      icon:"🥊", desc:"ATK+2 LCK+1 — Set du Lion (1/4)",        type:"acc",   slot:"hands",  family:"gryff_t2",     rarity:"rare", power:2, bonusAtk:2, bonusLck:1, price:0, setKey:"gryff_set", setPiece:1 },
  { id:"anneau_serpent",   name:"Anneau du Serpent",     icon:"💍", desc:"MAG+2 LCK+1 — Set du Serpent (1/4)",     type:"acc",   slot:"ring",   family:"slyth_t2",     rarity:"rare", power:2, bonusMag:2, bonusLck:1, price:0, setKey:"slyth_set", setPiece:1 },
  { id:"plume_aigle",      name:"Plume d'Aigle",         icon:"🪶", desc:"MAG+2 INT+1 — Set de l'Aigle (1/4)",     type:"acc",   slot:"trinket",family:"raven_t2",     rarity:"rare", power:2, bonusMag:2, bonusInt:1, price:0, setKey:"raven_set", setPiece:1 },
  { id:"ceinture_blaireau",name:"Ceinture du Blaireau",  icon:"🪢", desc:"DEF+2 END+1 — Set du Blaireau (1/4)",    type:"acc",   slot:"belt",   family:"pouf_t2",      rarity:"rare", power:2, bonusDef:2, bonusEnd:1, price:0, setKey:"pouf_set",  setPiece:1 },

  // ── Pièces #2, #3, #4 des 4 Sets Maison (Étape 2 Maisons 2.0) ────
  // Distribuées via head-of-house aux paliers Confirmé Or (tier 6),
  // Maître Or (tier 12), et Virtuose Or (tier 15, via quête de Maison).
  // Cf. .claude/plans/houses-2.0.md §B. Slots distincts par set pour
  // permettre l'équipement simultané des 4 pièces sur un perso.

  // Set du Lion (Gryffondor)
  { id:"heaume_vaillant", name:"Heaume du Vaillant",   icon:"⛑️", desc:"ATK+2 LCK+1 — Set du Lion (2/4)",       type:"armor", slot:"head",   family:"gryff_set_2",  rarity:"epic",      power:3, bonusAtk:2, bonusLck:1, price:0, setKey:"gryff_set", setPiece:2 },
  { id:"cape_godric",     name:"Cape de Godric",       icon:"🦁", desc:"DEF+2 ATK+2 — Set du Lion (3/4)",       type:"acc",   slot:"cloak",  family:"gryff_set_3",  rarity:"epic",      power:4, bonusAtk:2, bonusDef:2, price:0, setKey:"gryff_set", setPiece:3 },
  { id:"coeur_lion",      name:"Cœur de Lion",         icon:"❤️", desc:"ATK+3 LCK+2 · PV max +10 · Régen +1 PM — Set du Lion (4/4)", type:"acc", slot:"amulet", family:"gryff_set_4", rarity:"legendary", power:6, bonusAtk:3, bonusLck:2, bonusHpMax:10, regenSp:1, price:0, setKey:"gryff_set", setPiece:4 },

  // Set du Serpent (Serpentard)
  { id:"pendentif_mamba", name:"Pendentif du Mamba",   icon:"🐍", desc:"MAG+2 LCK+1 — Set du Serpent (2/4)",    type:"acc",   slot:"amulet", family:"slyth_set_2",  rarity:"epic",      power:3, bonusMag:2, bonusLck:1, price:0, setKey:"slyth_set", setPiece:2 },
  { id:"cape_sibylline",  name:"Cape Sibylline",       icon:"🌫️", desc:"MAG+2 INT+2 — Set du Serpent (3/4)",    type:"acc",   slot:"cloak",  family:"slyth_set_3",  rarity:"epic",      power:4, bonusMag:2, bonusInt:2, price:0, setKey:"slyth_set", setPiece:3 },
  { id:"couronne_basilic",name:"Couronne du Basilic",  icon:"👑", desc:"MAG+3 LCK+2 · Régen +1 PM — Set du Serpent (4/4)", type:"armor", slot:"head", family:"slyth_set_4", rarity:"legendary", power:6, bonusMag:3, bonusLck:2, regenSp:1, price:0, setKey:"slyth_set", setPiece:4 },

  // Set de l'Aigle (Serdaigle)
  { id:"manteau_encre",   name:"Manteau d'Encre",      icon:"📜", desc:"MAG+2 INT+1 — Set de l'Aigle (2/4)",    type:"acc",   slot:"cloak",  family:"raven_set_2",  rarity:"epic",      power:3, bonusMag:2, bonusInt:1, price:0, setKey:"raven_set", setPiece:2 },
  { id:"oeil_aigle",      name:"Œil de l'Aigle",       icon:"👁️", desc:"MAG+2 INT+2 · Régen +1 PM — Set de l'Aigle (3/4)", type:"acc", slot:"amulet", family:"raven_set_3", rarity:"epic", power:4, bonusMag:2, bonusInt:2, regenSp:1, price:0, setKey:"raven_set", setPiece:3 },
  { id:"anneau_savoir",   name:"Anneau du Savoir",     icon:"💍", desc:"MAG+3 INT+2 LCK+1 — Set de l'Aigle (4/4)", type:"acc", slot:"ring", family:"raven_set_4",   rarity:"legendary", power:6, bonusMag:3, bonusInt:2, bonusLck:1, price:0, setKey:"raven_set", setPiece:4 },

  // Set du Blaireau (Poufsouffle)
  { id:"cape_loyaute",    name:"Cape de Loyauté",      icon:"🟡", desc:"DEF+2 END+1 — Set du Blaireau (2/4)",   type:"acc",   slot:"cloak",  family:"pouf_set_2",   rarity:"epic",      power:3, bonusDef:2, bonusEnd:1, price:0, setKey:"pouf_set",  setPiece:2 },
  { id:"coiffe_blaireau", name:"Coiffe du Blaireau",   icon:"🦡", desc:"DEF+2 END+2 — Set du Blaireau (3/4)",   type:"armor", slot:"head",   family:"pouf_set_3",   rarity:"epic",      power:4, bonusDef:2, bonusEnd:2, price:0, setKey:"pouf_set",  setPiece:3 },
  { id:"medaillon_helga", name:"Médaillon de Helga",   icon:"🏅", desc:"DEF+3 END+2 · Régen +1 PV — Set du Blaireau (4/4)", type:"acc", slot:"amulet", family:"pouf_set_4", rarity:"legendary", power:6, bonusDef:3, bonusEnd:2, regenHp:1, price:0, setKey:"pouf_set",  setPiece:4 },
  { id:"choco_sorcier",name:"Chocolat aux Sorciers", icon:"🍫", desc:"+10 PV +5 PM",       type:"consumable", effect:"both",       power:10, price:20 },
  { id:"potion_force", name:"Potion de Force",       icon:"💪", desc:"+8 ATK pendant 3 tours", type:"consumable", effect:"temp_buff", buffStat:"atk", power:8, turns:3, price:45 },
  // Potions de buff de combat (P2) — même moteur temp_buff, autres stats.
  { id:"potion_defense",   name:"Potion de Défense",   icon:"🛡️", desc:"+8 DEF pendant 3 tours",      type:"consumable", effect:"temp_buff", buffStat:"def", power:8, turns:3, price:45 },
  { id:"elixir_celerite",  name:"Élixir de Célérité",  icon:"💨", desc:"+8 AGI pendant 3 tours (esquive +)", type:"consumable", effect:"temp_buff", buffStat:"agi", power:8, turns:3, price:48 },
  { id:"potion_precision", name:"Potion de Précision", icon:"🍀", desc:"+8 LCK pendant 3 tours (crit +)",    type:"consumable", effect:"temp_buff", buffStat:"lck", power:8, turns:3, price:48 },
  { id:"elixir_puissance", name:"Élixir de Puissance", icon:"🔮", desc:"+8 MAG pendant 3 tours",      type:"consumable", effect:"temp_buff", buffStat:"mag", power:8, turns:3, price:50 },
  // ── Potions offensives jetables (P6.c) : lancées sur UN ennemi en combat.
  // Dégâts « alchimiques » : profitent du brassage (brewPotency) et respectent
  // resist/weak via `element`, mais SANS scaling MAG ni crit de sort. Statut
  // optionnel (gel/poison) posé après les dégâts.
  { id:"flacon_feu",    name:"Flacon de Feu",    icon:"🔥", desc:"Lancé : 24 dégâts de feu sur un ennemi",                 type:"consumable", effect:"throw", element:"feu",   power:24, price:40, rarity:"common" },
  { id:"flacon_givre",  name:"Flacon de Givre",  icon:"❄️", desc:"Lancé : 15 dégâts de glace + gèle l'ennemi (3 t)",        type:"consumable", effect:"throw", element:"glace", power:15, statusId:"gel",    statusPower:3, statusTurns:3, price:42, rarity:"common" },
  { id:"flacon_venin",  name:"Flacon de Venin",  icon:"🧪", desc:"Lancé : 8 dégâts + poison (5/tour, 4 tours)",             type:"consumable", effect:"throw",                  power:8,  statusId:"poison", statusPower:5, statusTurns:4, price:44, rarity:"common" },
  // Flacons à dispersion (AOE) — touchent TOUT le groupe ennemi (flag aoe).
  { id:"flacon_deflagration", name:"Flacon de Déflagration", icon:"💥", desc:"Lancé : 16 dégâts de feu sur tout le groupe ennemi", type:"consumable", effect:"throw", aoe:true, element:"feu", power:16, price:90, rarity:"rare" },
  { id:"flacon_brume_toxique", name:"Flacon de Brume Toxique", icon:"☠️", desc:"Lancé : 6 dégâts + poison (4/tour, 4 t) sur tout le groupe ennemi", type:"consumable", effect:"throw", aoe:true, power:6, statusId:"poison", statusPower:4, statusTurns:4, price:95, rarity:"rare" },
  // ── Potions anti-corruption (Potions 2.0 — Lot P7, §1.5/§1.5bis) ─────────
  // Catégorie neuve `category:"anti_corruption"` : seule soupape pour faire
  // REDESCENDRE `spellCorruption` (combat). Champs optionnels §1.4
  // (category/houseAffinity/corruptionPurge/synergy) — tous back-compat, fallback
  // = comportement actuel. Effets `purge_corruption` / `ward_charge` :
  // inventory.js — _applyConsumableEffect.
  { id:"elixir_lucidite", name:"Élixir de Lucidité", icon:"🧪", desc:"Dissipe 3 points de corruption magique du groupe.",
    type:"consumable", category:"anti_corruption", rarity:"epic", effect:"purge_corruption", corruptionPurge:3,
    houseAffinity:null, price:220,
    synergy:{ spells:["Sectumsempra","Morsmordre"], note:"Seule soupape pour faire redescendre la corruption." } },
  { id:"baume_patronus", name:"Baume du Patronus", icon:"🦌", desc:"Dissipe 2 points de corruption et purge peur & gel de tout le groupe.",
    type:"consumable", category:"anti_corruption", rarity:"rare", effect:"purge_corruption", corruptionPurge:2,
    cureGroup:["fear","gel"], houseAffinity:"poufsouffle", price:120,
    synergy:{ spells:["Patronus Maxima"], note:"Le souvenir heureux distillé chasse la peur et le givre." } },
  { id:"elixir_immunite", name:"Élixir d'Immunité", icon:"🔰", desc:"Arme une garde mystique : absorbe le prochain effet secondaire ou gain de corruption.",
    type:"consumable", category:"anti_corruption", rarity:"rare", effect:"ward_charge",
    houseAffinity:"serdaigle", price:110,
    synergy:{ note:"Contre-jeu explicite aux potions risquées de la Boucle." } },
  // ── Potion évolutive (Potions 2.0 — Lot P8, §1.7) ────────────────────────
  // Philtre du Mage : restaure des PM dont l'ampleur ÉVOLUE avec le nombre de
  // focaliseurs de caster équipés (`formType` bâton/grimoire, Artefacts 2.0).
  // Helper pur `potionEvolveMult` (potions.js). Coeffs CALIBRÉS (P13) :
  // perStep 0.18 (+18 % PM / focaliseur) ; cap 1.5 = plafond de design (+50 %).
  // Un perso équipe au plus 2 focaliseurs (1 wand + 1 trinket) → max réel 1.36 ;
  // le cap 1.5 est le garde-fou (futur 3ᵉ focaliseur). Synergie déclarative.
  { id:"philtre_mage", name:"Philtre du Mage", icon:"🔮", desc:"Restaure 20 PM, amplifiés par chaque focaliseur de caster équipé (bâton/grimoire).",
    type:"consumable", category:"mana", rarity:"rare", effect:"restore_sp", power:20, price:110,
    evolves:{ source:"artifactForm", key:["baton","grimoire"], perStep:0.18, cap:1.5 },
    synergy:{ artifacts:["baton","grimoire"], note:"+PM par focaliseur de caster équipé (bâton / grimoire)." } },
  // ── Résilience Maison (Potions 2.0 — Lot P9, §1.5) ───────────────────────
  // Un seul item, 4 comportements selon `chosenHouse` (effet `house_buff`,
  // inventory.js — HOUSE_BUFF_PLANS). S'aligne sur la stat de la Maison.
  { id:"potion_resilience_maison", name:"Potion de Résilience Maison", icon:"🛡️",
    desc:"Galvanise le buveur selon sa Maison (ATK·crit / MAG·sort / MAG·PM / DEF·régén) pendant 3 tours.",
    type:"consumable", category:"buff", rarity:"epic", effect:"house_buff", power:8, turns:3,
    houseAffinity:null, price:200,
    synergy:{ note:"S'aligne sur le passif d'Apothéose de ta Maison." } },
  // ── Variantes Premium par Maison (Potions 2.0 — Lot P9, §1.6) ────────────
  // Premium ≠ nouvelle rareté : variante COLORIÉE + BOOSTÉE d'une base, gatée
  // par CONTENU (quête signature de `chosenHouse` = la seule « facile » ;
  // les autres via Marchand d'Ombre / Boucle, décision §3.4). `premium:true`
  // + `premiumOf` (base) + `premiumTint` (couleur Maison) + `premiumFx` (clé
  // Maison du flash de consommation). Effet = celui de la base, boosté.
  { id:"elixir_lion_ardent", name:"Élixir du Lion Ardent", icon:"🦁",
    desc:"+13 ATK et +6 LCK (crit) pendant 4 tours — Premium Gryffondor.",
    type:"consumable", category:"buff", rarity:"epic", effect:"house_buff", power:13, turns:4,
    premium:true, premiumOf:"potion_force", houseAffinity:"Gryffondor", premiumFx:"gryff", premiumTint:"#d3a625", price:0,
    synergy:{ note:"Reliques de Gryffondor — l'audace au crit." } },
  { id:"venin_serpent", name:"Venin du Serpent", icon:"🐍",
    desc:"Lancé : 18 dégâts + poison renforcé (8/tour, 5 tours) — Premium Serpentard.",
    type:"consumable", category:"debuff", rarity:"epic", effect:"throw", power:18,
    statusId:"poison", statusPower:8, statusTurns:5,
    premium:true, premiumOf:"flacon_venin", houseAffinity:"Serpentard", premiumFx:"slyth", premiumTint:"#1a472a", price:0,
    synergy:{ note:"Set des Ténèbres — le venin s'attarde." } },
  { id:"sagesse_aigle", name:"Sagesse de l'Aigle", icon:"🦅",
    desc:"+13 LCK (crit) et restaure 40 PM — Premium Serdaigle.",
    type:"consumable", category:"mana", rarity:"epic", effect:"temp_buff", buffStat:"lck", power:13, turns:4,
    restoreSpBonus:40,
    premium:true, premiumOf:"potion_precision", houseAffinity:"Serdaigle", premiumFx:"serd", premiumTint:"#0e1a40", price:0,
    synergy:{ artifacts:["baton","grimoire"], note:"Focaliseurs de caster — la clarté de l'esprit." } },
  { id:"vigueur_blaireau", name:"Vigueur du Blaireau", icon:"🦡",
    desc:"Régénère 10 PV/tour pendant 5 tours — Premium Poufsouffle.",
    type:"consumable", category:"soin", rarity:"epic", effect:"regen_buff", power:10, turns:5,
    premium:true, premiumOf:"elixir_regen", houseAffinity:"Poufsouffle", premiumFx:"pouf", premiumTint:"#f0c75e", price:0,
    synergy:{ note:"Loyauté du Blaireau — la vigueur qui tient." } },
  // ── Potion à risque (Potions 2.0 — Lot P10, §1.5/§1.8) ───────────────────
  // Buff de sort évolutif (P8 — `evolves:corruption`) PUISSANT mais risqué :
  // `corruptionRisk` (montée de spellCorruption à la conso) + `sideEffect`
  // (contrecoup DEF borné en Tranche D/Boucle). Le risque nourrit la
  // récompense (le buff MAG croît avec la corruption). Télégraphié ⚠️ ;
  // neutralisable par une charge d'Élixir d'Immunité (P7). Craft Ruines/Boucle.
  { id:"potion_corruption_ctrl", name:"Potion de Corruption Contrôlée", icon:"🌑",
    desc:"+8 MAG (amplifié par ta corruption) pendant 3 tours — mais épaissit la corruption (⚠️ contrecoup en Boucle).",
    type:"consumable", category:"buff", rarity:"epic", effect:"temp_buff", buffStat:"mag", power:8, turns:3,
    corruptionRisk:2, evolves:{ source:"corruption", perStep:0.05, cap:1.5 }, // coeffs CALIBRÉS (P13) : cap atteint à corruption 10 (+50 % MAG)
    sideEffect:{ stat:"def", magnitude:0.15, turns:2, chance:0.5 },
    houseAffinity:null, price:0,
    synergy:{ artifacts:["TENEBRES_SET"], spells:["Sectumsempra","Morsmordre"], note:"La corruption nourrit la puissance — le Set des Ténèbres l'amplifie." } },
  // ── Formes utilitaires & contrôle (Potions 2.0 — Lot P12, §1.5) ──────────
  // Vision des Éclats : révèle l'étage entier (brouillard + jardins + passages
  // secrets) et aiguise la fouille N pas. Effet `reveal_treasures` (inventory.js),
  // hors combat. Source : chaudron + boutique (≥3).
  { id:"potion_vision", name:"Potion de Vision des Éclats", icon:"🔮",
    desc:"Révèle l'étage entier (coffres, jardins, passages cachés) et aiguise la fouille pendant 20 pas.",
    type:"consumable", category:"utilitaire", rarity:"rare", effect:"reveal_treasures", power:20, price:90,
    synergy:{ note:"Niffleurs, jardins, coffres et Revelio — tout se dévoile." } },
  // Écho Temporel : hors combat annule le dernier pas (position + PV/PM) ; en
  // combat accorde une action immédiate (1×/combat). Effet `temporal_echo`.
  { id:"potion_echo_temporel", name:"Potion d'Écho Temporel", icon:"⏳",
    desc:"Hors combat : annule ton dernier pas. En combat : t'accorde une action immédiate (1×/combat).",
    type:"consumable", category:"utilitaire", rarity:"epic", effect:"temporal_echo", price:260,
    synergy:{ artifacts:["retourneur_temps"], spells:["Reliquae Temporis"], note:"Le Retourneur de Temps distillé — un instant repris au destin." } },
  // Huiles d'arme (×3 éléments) : enduisent l'arme du personnage actif ; ses
  // attaques PHYSIQUES infligent un bonus élémentaire N attaques (effet
  // `weapon_oil`, battle.js — executeAttack) et déclenchent les combos.
  { id:"huile_feu", name:"Huile de Feu", icon:"🔥",
    desc:"Enduit l'arme : +6 dégâts de feu sur tes 4 prochaines attaques (combat).",
    type:"consumable", category:"buff", rarity:"rare", effect:"weapon_oil", element:"feu", power:6, turns:4, price:70,
    synergy:{ note:"Les attaques physiques déclenchent les combos de feu." } },
  { id:"huile_givre", name:"Huile de Givre", icon:"❄️",
    desc:"Enduit l'arme : +6 dégâts de glace sur tes 4 prochaines attaques (combat).",
    type:"consumable", category:"buff", rarity:"rare", effect:"weapon_oil", element:"glace", power:6, turns:4, price:70,
    synergy:{ note:"Les attaques physiques déclenchent les combos de gel." } },
  { id:"huile_foudre", name:"Huile de Foudre", icon:"⚡",
    desc:"Enduit l'arme : +6 dégâts de foudre sur tes 4 prochaines attaques (combat).",
    type:"consumable", category:"buff", rarity:"rare", effect:"weapon_oil", element:"foudre", power:6, turns:4, price:70,
    synergy:{ note:"Les attaques physiques déclenchent les combos de foudre." } },
  // Poudres runiques (×2) : jetées sur TOUT le groupe ennemi, 0 dégât, contrôle
  // pur (statut AoE). Réemploi de l'effet `throw` + `aoe` (battle.js — throwItemAoe).
  { id:"poudre_stun", name:"Poudre Runique Étourdissante", icon:"💫",
    desc:"Jetée sur tout le groupe ennemi : étourdit 1 tour (aucun dégât).",
    type:"consumable", category:"debuff", rarity:"rare", effect:"throw", power:0, aoe:true,
    statusId:"stun", statusTurns:1, price:80,
    synergy:{ note:"Contrôle pur — fige le groupe le temps d'un sort." } },
  { id:"poudre_fear", name:"Poudre Runique Aveuglante", icon:"😱",
    desc:"Jetée sur tout le groupe ennemi : sème la peur 2 tours (aucun dégât).",
    type:"consumable", category:"debuff", rarity:"rare", effect:"throw", power:0, aoe:true,
    statusId:"fear", statusTurns:2, price:80,
    synergy:{ note:"Contrôle pur — la panique brise leur élan." } },
  { id:"cape_invis",   name:"Cape d'Invisibilité",   icon:"🌫️", desc:"AGI+5 LCK+5 · Esquive +5%", type:"acc",   slot:"cloak", family:"cloak_invis",  rarity:"epic",     bonusAgi:5, bonusLck:5, bonusDodgeChance:5, power:5, price:550 },
  { id:"chapeau_pointu",name:"Chapeau de Serdaigle", icon:"🎓", desc:"MAG+3 INT+3",            type:"armor", slot:"head",  family:"hat_serd",     rarity:"rare",     bonusDef:2, bonusMag:3, power:3, price:300 },
  // Easter egg « Salle sur Demande » — objet unique offert à la 1ʳᵉ Salle de
  // la partie. Clin d'œil au Diadème caché, bonus modeste non-méta, non vendable.
  { id:"tiare_poussiereuse",name:"Tiare poussiéreuse", icon:"👑", desc:"MAG+2 LCK+1 · trouvée dans la Salle sur Demande", type:"armor", slot:"head", family:"tiara_dusty", rarity:"rare", bonusMag:2, bonusLck:1, power:2, price:0, tint:"#caa84c" },
  // ── Phase 3 : équipement étendu (slots head/hands/feet/cloak/amulet/ring/belt/trinket) ──
  // Tier commun étage 1-2
  { id:"gants_apprenti",   name:"Gants d'Apprenti",      icon:"🧤", desc:"ATK+1 DEF+1",       type:"acc",   slot:"hands", family:"gloves_basic",  rarity:"common", bonusAtk:1, bonusDef:1, power:1, price:60 },
  { id:"bottes_apprenti",  name:"Bottes d'Apprenti",     icon:"🥾", desc:"DEF+1 AGI+1",       type:"acc",   slot:"feet",  family:"boots_basic",   rarity:"common", bonusDef:1, bonusAgi:1, power:1, price:70 },
  { id:"chapeau_apprenti", name:"Chapeau d'Apprenti",    icon:"🎩", desc:"MAG+1 DEF+1",       type:"acc",   slot:"head",  family:"hat_basic",     rarity:"common", bonusMag:1, bonusDef:1, power:1, price:80 },
  { id:"ceinture_cuir",    name:"Ceinture de Cuir",      icon:"➿", desc:"DEF+2",             type:"acc",   slot:"belt",  family:"belt_basic",    rarity:"common", bonusDef:2,             power:2, price:90 },
  { id:"anneau_argent",    name:"Anneau d'Argent",       icon:"💍", desc:"LCK+2",             type:"acc",   slot:"ring",  family:"ring_silver",   rarity:"common", bonusLck:2,             power:2, price:110 },
  // Tier voyageur étage 3-4
  { id:"cape_voyageur",    name:"Cape du Voyageur",      icon:"🧥", desc:"DEF+2 AGI+2",       type:"acc",   slot:"cloak", family:"cloak_traveler",rarity:"common", bonusDef:2, bonusAgi:2, power:2, price:160 },
  { id:"amulette_protection",name:"Amulette de Protection",icon:"🔱", desc:"DEF+3 MAG+1",     type:"acc",   slot:"amulet",family:"amulet_protect",rarity:"common", bonusDef:3, bonusMag:1, power:3, price:170 },
  // Tier rare étage 5+
  { id:"circlet_serdaigle",name:"Circlet d'Argent",      icon:"👑", desc:"MAG+3 INT+2",       type:"acc",   slot:"head",  family:"circlet",       rarity:"rare",   bonusMag:3,             power:3, price:240 },
  { id:"anneau_runique",   name:"Anneau Runique",        icon:"💍", desc:"MAG+2 LCK+2 · Crit +3%", type:"acc",   slot:"ring",  family:"ring_runed",    rarity:"rare",   bonusMag:2, bonusLck:2, bonusCritChance:3, power:2, price:260, tint:"#a060d0" },
  { id:"ceinture_alchimiste",name:"Ceinture d'Alchimiste",icon:"➿", desc:"DEF+1 LCK+3 · Crit +2%", type:"acc",   slot:"belt",  family:"belt_alch",     rarity:"rare",   bonusDef:1, bonusLck:3, bonusCritChance:2, power:1, price:230 },
  // Tier rare/épique étage 7+
  { id:"bottes_dragon",    name:"Bottes en Peau de Dragon",icon:"🥾",desc:"DEF+3 AGI+2 · Esquive +3%", type:"acc",   slot:"feet",  family:"boots_dragon",  rarity:"rare",   bonusDef:3, bonusAgi:2, bonusDodgeChance:3, power:3, price:600 },
  // ── Équipement à compromis (trade-off : un bonus fort, un malus) ──
  { id:"lame_sanguinaire", name:"Lame Sanguinaire",       icon:"🗡️", desc:"ATK+7 mais DEF−2 — frappe sans retenue",        type:"wand",  slot:"wand",  rarity:"rare",   power:7, bonusAtk:7,  bonusDef:-2,                        price:300 },
  { id:"armure_lourde",    name:"Armure de Plates",       icon:"🛡️", desc:"DEF+6 mais AGI−3 — lourde et protectrice",      type:"armor", slot:"body",  rarity:"rare",   power:6, bonusDef:6,  bonusAgi:-3,                        price:320 },
  { id:"anneau_furie",     name:"Anneau de Furie",        icon:"💍", desc:"Crit +12% mais Esquive −6% — tout en attaque", type:"acc",   slot:"ring",  rarity:"rare",   power:2, bonusCritChance:12, bonusDodgeChance:-6,            price:300 },
  { id:"retourneur_temps", name:"Retourneur de Temps",   icon:"⌛", desc:"AGI+3 LCK+2",        type:"acc",   slot:"trinket",family:"timeturner",  rarity:"epic",   bonusAgi:3, bonusLck:2, power:3, price:550, tint:"#c9a84c" },
  // Drop boss étage 7+ (Mangemort d'Élite) — bonus PV max (cf. equipment-bonuses-v2.md Vague B).
  { id:"cor_pegasse",      name:"Cor du Pégase",          icon:"📯", desc:"PV max +8",          type:"acc",   slot:"trinket",family:"horn_pegasus", rarity:"epic",   bonusHpMax:8, power:4, price:0 },
  // ── Phase 3c : équipements mid-game (étages 3-7) ─────────────
  // Comblent les slots peu fournis. Apparaissent en boutique selon
  // minFloor et peuvent dropper sur les monstres élite de la zone.
  { id:"gants_duelliste",  name:"Gants du Duelliste",     icon:"🧤", desc:"ATK+2 AGI+1",        type:"acc",   slot:"hands", family:"gloves_duelist",rarity:"rare",   bonusAtk:2, bonusAgi:1, power:2, price:210 },
  { id:"casque_aurore",    name:"Casque d'Auror",         icon:"⛑️", desc:"DEF+3 MAG+1",        type:"acc",   slot:"head",  family:"helm_auror",    rarity:"rare",   bonusDef:3, bonusMag:1, power:3, price:260 },
  { id:"ceinture_force",   name:"Ceinture de Force",      icon:"➿", desc:"ATK+1 DEF+2",        type:"acc",   slot:"belt",  family:"belt_strength", rarity:"rare",   bonusAtk:1, bonusDef:2, power:2, price:250 },
  { id:"anneau_courage",   name:"Anneau du Courage",      icon:"💍", desc:"ATK+2 LCK+1",        type:"acc",   slot:"ring",  family:"ring_courage",  rarity:"rare",   bonusAtk:2, bonusLck:1, power:2, price:280, tint:"#c2453a" },
  { id:"bottes_silence",   name:"Bottes du Silence",      icon:"🥾", desc:"AGI+3 LCK+1",        type:"acc",   slot:"feet",  family:"boots_silence", rarity:"epic",   bonusAgi:3, bonusLck:1, power:3, price:520 },
  { id:"talisman_tactique",name:"Talisman du Tacticien",  icon:"🔮", desc:"LCK+2 MAG+1",        type:"acc",   slot:"trinket",family:"talisman_tact",rarity:"rare",   bonusLck:2, bonusMag:1, power:2, price:380 },
  // Lot E1 — palier uncommon mid-game (plan artifact-remediation §Lot E ; comble
  // les slots head/body/feet/cloak/belt sans uncommon). houseAffinity Pouf ×2
  // (rééquilibrage slots-faveur, étude §5.3).
  { id:"serre_tete_etude", name:"Serre-tête d'Étude",     icon:"🎓", desc:"MAG+1 INT+1 DEF+1",  type:"acc",   slot:"head",  family:"headband_study", rarity:"uncommon", bonusMag:1, bonusInt:1, bonusDef:1, power:1, price:180, houseAffinity:"Serdaigle", tint:"#5c8cbe" },
  { id:"plastron_renforce",name:"Plastron Renforcé",      icon:"🦺", desc:"DEF+2 END+1",        type:"armor", slot:"body",  family:"plastron_reinf",  rarity:"uncommon", bonusDef:2, bonusEnd:1, power:2, price:200, houseAffinity:"Poufsouffle", tint:"#c8a24a" },
  { id:"bottes_lestes",    name:"Bottes Lestes",          icon:"🥾", desc:"AGI+2 LCK+1",        type:"acc",   slot:"feet",  family:"boots_leste",     rarity:"uncommon", bonusAgi:2, bonusLck:1, power:2, price:170, tint:"#9a7d4f" },
  { id:"cape_doublee",     name:"Cape Doublée",           icon:"🧥", desc:"DEF+1 AGI+1 END+1",  type:"acc",   slot:"cloak", family:"cloak_doublee",   rarity:"uncommon", bonusDef:1, bonusAgi:1, bonusEnd:1, power:1, price:180 },
  { id:"ceinture_etudiant",name:"Ceinture d'Étudiant",    icon:"➿", desc:"DEF+1 LCK+1 END+1",  type:"acc",   slot:"belt",  family:"belt_etudiant",   rarity:"uncommon", bonusDef:1, bonusLck:1, bonusEnd:1, power:1, price:170, houseAffinity:"Poufsouffle", tint:"#c8a24a" },
  // ── Phase 3b : récompenses de quêtes (PNJ donneurs) ──
  // Anneau remis par le portrait de Dumbledore (quête `anneau_dumbledore`). Pierre noire sertie d'or.
  { id:"anneau_resurrection",name:"Anneau de la Résurrection",icon:"💍", desc:"MAG+3 LCK+4 · Apprend Reparo", type:"acc", slot:"ring",  family:"ring_resurrection", rarity:"epic", bonusMag:3, bonusLck:4, power:3, grantsSpell:"Reparo", price:0, tint:"#1a1a1a" },
  // Amulette remise par Fumseck (quête `bouclier_phenix`). Régénère 3 PV en début de tour ennemi.
  { id:"larmes_phenix",      name:"Larmes du Phénix",         icon:"📿", desc:"DEF+2 MAG+2 · PM max +5 · Régen +3 PV/tour · Esquive +3% · 🏺 Voile du Phénix (1×/combat : bouclier de groupe)",type:"acc", slot:"amulet",family:"amulet_tears",      rarity:"epic", bonusDef:2, bonusMag:2, bonusSpMax:5, bonusDodgeChance:3, power:2, regenHp:3,            price:0, tint:"#e84020", activeEffect:{ id:"voile_phenix", label:"Voile du Phénix", charges:1, target:"allyAll", resolve:"shieldGroup", power:1 } },
  // ── Récompenses des quêtes de PNJ en Boucle (suivi 3) — non vendues (price 0) ──
  { id:"perle_mimi",            name:"Perle de Larmes de Mimi",   icon:"💧", desc:"MAG+3 · Régen +2 PM/tour",  type:"acc", slot:"amulet",  family:"amulet_mimi",    rarity:"epic", bonusMag:3, regenSp:2, power:3, price:0 },
  { id:"cor_chasse",            name:"Cor de la Chasse Sans Tête",icon:"📯", desc:"Crit +3% (×1.7)",           type:"acc", slot:"trinket", family:"horn_hunt",      rarity:"epic", bonusCritChance:3, bonusCritDamage:0.2, power:3, price:0 },
  { id:"cape_soie_acromantule", name:"Cape de Soie d'Acromantule",icon:"🕸️", desc:"AGI+3 · Esquive +4%",       type:"acc", slot:"cloak",   family:"cloak_silk",     rarity:"epic", bonusAgi:3, bonusDodgeChance:4, power:3, price:0 },
  { id:"plume_lockhart",        name:"Plume à Papote Dédicacée",  icon:"🪶", desc:"LCK+3",                     type:"acc", slot:"trinket", family:"quill_lockhart", rarity:"rare", bonusLck:3, power:0, price:0 },
  // ── Phase 3 — Tranche étage 8 « Le Seuil » : équipement Auror (boutique + drop boss) ──
  { id:"casque_auror",      name:"Casque d'Auror",       icon:"⛑️", desc:"DEF+4 MAG+2 — Casque réglementaire des Aurors", type:"armor", slot:"head",  family:"helmet_auror",    rarity:"rare", bonusDef:4, bonusMag:2, power:4, price:800 },
  { id:"bottes_renforcees", name:"Bottes Renforcées",    icon:"🥾", desc:"DEF+3 AGI+2",                                   type:"armor", slot:"feet",  family:"boots_reinforced",rarity:"rare", bonusDef:3, bonusAgi:2, power:3, price:600 },
  { id:"cape_combat",       name:"Cape de Combat",       icon:"🧥", desc:"DEF+3 · Esquive +5 %",                          type:"armor", slot:"cloak", family:"cloak_combat",    rarity:"rare", bonusDef:3, bonusDodgeChance:5, power:3, price:700 },
  { id:"anneau_anti_magie", name:"Anneau Anti-Magie",    icon:"💍", desc:"DEF+2 INT+3 — Atténue les sortilèges",        type:"acc",   slot:"ring",  family:"ring_anti_magic", rarity:"rare", bonusDef:2, bonusInt:3, power:2, price:750 },
  { id:"potion_lune",       name:"Élixir de Lune",       icon:"🌕", desc:"+45 PV — distillé sous pleine lune",          type:"consumable", effect:"heal", power:45, price:90 },
  // ── Phase 3 — Tranche étage 9 « Les Profondeurs » : équipement endgame mid (boutique + drop boss) ──
  { id:"diademe_antique",   name:"Diadème Antique",      icon:"👑", desc:"MAG+5 LCK+2 — Couronne d'une reine oubliée",   type:"armor", slot:"head",  family:"tiara_antique",   rarity:"rare", bonusMag:5, bonusLck:2, power:5, price:900 },
  { id:"bague_protection",  name:"Bague de Protection",  icon:"💍", desc:"DEF+3 END+3 — Sertie d'une perle de jade",     type:"acc",   slot:"ring",  family:"ring_protection", rarity:"rare", bonusDef:3, bonusEnd:3, power:3, price:780 },
  { id:"robe_combat",       name:"Robe de Combat",       icon:"🥼", desc:"DEF+5 · PV max +5 — Renforcée de runes",       type:"armor", slot:"body",  family:"robe_combat",     rarity:"rare", bonusDef:5, bonusHpMax:5, power:5, price:950 },
  // ── Phase 3 — Tranche étage 10 « Le Précipice » : équipement antichambre Voldemort (boutique + drop boss) ──
  { id:"pectoral_auror",       name:"Pectoral des Aurors",       icon:"🛡️", desc:"DEF+6 · PV max +8 — Armure de fin de carrière", type:"armor", slot:"body",   family:"pectoral_auror",     rarity:"rare", bonusDef:6, bonusHpMax:8, power:6, price:1200 },
  { id:"larme_phenix_mineure", name:"Larme du Phénix Mineure",   icon:"💧", desc:"MAG+4 · Régen +2 PV/tour",                      type:"acc",   slot:"amulet", family:"amulet_lesser_tears",rarity:"rare", bonusMag:4, regenHp:2, power:4, price:1100 },
  { id:"grimoire_avance",      name:"Grimoire Avancé",           icon:"📚", desc:"MAG+3 INT+4 — Recueil tactique des Aurors",     type:"acc",   slot:"trinket",family:"trinket_grimoire",   rarity:"rare", bonusMag:3, bonusInt:4, power:3, price:1000 },
  // ── Livres de sorts ──────────────────────────────────────────
  { id:"livre_sortileges", name:"Sortilèges Standards, Vol.3", icon:"📗", desc:"Apprend Wingardium Leviosa",  type:"spellbook", spell:"Wingardium Leviosa", price:150  },
  { id:"livre_soin",       name:"Potions & Remèdes Magiques",  icon:"📘", desc:"Apprend Reparo (soin 20 PV)", type:"spellbook", spell:"Reparo",             price:110  },
  { id:"livre_ferula",     name:"Manuel du Soigneur de Champ", icon:"📗", desc:"Apprend Ferula (bandage régénérant)", type:"spellbook", spell:"Ferula",     price:180 },
  { id:"book_monsters",    name:"Livre des Monstres",          icon:"📚", desc:"Apprend Diffindo (16 dégâts)",type:"spellbook", spell:"Diffindo",           price:0   },
  { id:"livre_prince",     name:"Manuel du Demi-Sang",         icon:"📓", desc:"Apprend Sectumsempra (24 dégâts) — sort maudit", type:"spellbook", spell:"Sectumsempra", price:600 },
  { id:"livre_bombarda",   name:"Traité de Magie Explosive",   icon:"📙", desc:"Apprend Bombarda (20 dégâts)",  type:"spellbook", spell:"Bombarda",   price:490 },
  { id:"livre_patronum",   name:"Guide du Patronus",            icon:"📒", desc:"Apprend Patronum",              type:"spellbook", spell:"Patronum",   price:350 },
  // ── Grimoires élémentaires ───────────────────────────────────
  { id:"livre_glacius",    name:"Givre & Engelures",            icon:"📘", desc:"Apprend Glacius (14 dégâts de glace)", type:"spellbook", spell:"Glacius",     price:220 },
  { id:"livre_fulgari",    name:"Foudre Canalisée",             icon:"📙", desc:"Apprend Fulgari (16 dégâts de foudre)", type:"spellbook", spell:"Fulgari",     price:310 },
  { id:"livre_lumos_solem",name:"Lumière Solaire",              icon:"📒", desc:"Apprend Lumos Solem — ravage les morts-vivants", type:"spellbook", spell:"Lumos Solem", price:440 },
  // ── Grimoires de Vampirisme & Malédictions ───────────────────
  { id:"livre_sanguini",   name:"Traité du Sang Vivant",         icon:"📕", desc:"Apprend Sanguini (vol de vie)", type:"spellbook", spell:"Sanguini",      price:270 },
  { id:"livre_vampyrus",   name:"Codex des Strigoï",             icon:"📕", desc:"Apprend Vampyrus (drain magique)", type:"spellbook", spell:"Vampyrus",   price:540 },
  { id:"livre_taranta",    name:"Pas de la Sorcière Maudite",    icon:"📓", desc:"Apprend Tarantallegra",         type:"spellbook", spell:"Tarantallegra", price:130  },
  { id:"livre_maledictus", name:"Grimoire des Maudits",          icon:"📓", desc:"Apprend Maledictus",            type:"spellbook", spell:"Maledictus",    price:390 },
  { id:"livre_crucio",     name:"Sortilèges Impardonnables, T.II", icon:"📕", desc:"Apprend Crucio (sort interdit)", type:"spellbook", spell:"Crucio",     price:580 },
  { id:"livre_morsmordre", name:"Marque des Ténèbres",            icon:"📕", desc:"Apprend Morsmordre",            type:"spellbook", spell:"Morsmordre",    price:640 },
  // ── Grimoires de zone (sorts AoE) ────────────────────────────
  { id:"livre_vulnera",         name:"Chant des Guérisseurs",     icon:"📗", desc:"Apprend Vulnera Sanentur — soin de tout le groupe",   type:"spellbook", spell:"Vulnera Sanentur", price:700 },
  { id:"livre_diffindo_maxima", name:"L'Art de la Lame Large",    icon:"📓", desc:"Apprend Diffindo Maxima — fauchage des ennemis adjacents", type:"spellbook", spell:"Diffindo Maxima", price:760 },
  { id:"livre_glacius_tempete", name:"Tempête de Givre",          icon:"📘", desc:"Apprend Glacius Tempête — zone de glace + gel",       type:"spellbook", spell:"Glacius Tempête",  price:840 },
  { id:"livre_fulgur_catena",   name:"Chaîne d'Éclairs",          icon:"📙", desc:"Apprend Fulgur Catena — arc électrique en chaîne",    type:"spellbook", spell:"Fulgur Catena",    price:920 },
  { id:"livre_lux_aeterna",     name:"Lumière Éternelle",         icon:"📒", desc:"Apprend Lux Aeterna — onde de lumière sur la zone",   type:"spellbook", spell:"Lux Aeterna",      price:1050 },
  { id:"livre_nox_vorax",       name:"Nuit Dévorante",            icon:"📕", desc:"Apprend Nox Vorax — vague obscure drainante",        type:"spellbook", spell:"Nox Vorax",        price:1200 },
  // Sort utilitaire premium (cf. .claude/plans/teleportation-spell.md).
  { id:"livre_portus",     name:"Traité de la Téléportation",     icon:"📘", desc:"Apprend Portus — téléportation tactique (combat + hors combat)", type:"spellbook", spell:"Portus", price:2800 },
  // ── Sinks endgame — combo A+E (game-economy-gold-audit.md §5.6) ──
  // Prix progressif (rareté marché) : items avec `rarityScales:true`
  // voient leur prix × 1.5^endgamePurchases[id] à chaque achat.
  { id:"elixir_perma_hp",   name:"Élixir Permanent de Vitalité",   icon:"❤️", desc:"+5 PV max permanent (heal complet bonus). Disponibilité limitée — chaque flacon vendu rend les suivants plus rares.", type:"consumable", effect:"perma_hp", power:5, basePrice:1500, price:1500, rarityScales:true, rarity:"epic" },
  { id:"elixir_perma_mp",   name:"Élixir Permanent de Mana",       icon:"💙", desc:"+5 PM max permanent (heal complet bonus). Disponibilité limitée — chaque flacon vendu rend les suivants plus rares.", type:"consumable", effect:"perma_sp", power:5, basePrice:1500, price:1500, rarityScales:true, rarity:"epic" },
  { id:"pierre_ame",        name:"Pierre d'Âme",                   icon:"💜", desc:"+1 stat permanente au choix (FOR/INT/AGI/END/LCK/MAG/ATK/DEF). Chaque pierre arrachée à la veine rend les suivantes plus introuvables.", type:"consumable", effect:"stat_boost", basePrice:3000, price:3000, rarityScales:true, rarity:"legendary" },
  { id:"grimoire_interdit", name:"Grimoire Interdit",              icon:"📕", desc:"Apprend Fiendfyre — Feu Maudit (35 dégâts, brûle, coût élevé).", type:"spellbook", spell:"Fiendfyre", price:4000, rarity:"legendary" },
  { id:"pendentif_ombre",   name:"Pendentif d'Ombre",              icon:"🦇", desc:"Acc — regen 3 PV/tour, dégâts critiques +20 %.", type:"acc", slot:"amulet", rarity:"epic", regenHp:3, bonusCritDamage:0.20, price:6000 },
  { id:"reliquaire_lunaire", name:"Reliquaire Lunaire",            icon:"🌙", desc:"Bibelot — gain d'or de combat +20 % (cumulable avec Récolte Magique).", type:"trinket", slot:"trinket", rarity:"legendary", bonusGoldMult:0.20, price:8000 },
  { id:"philtre_endurance", name:"Philtre d'Endurance",            icon:"🟢", desc:"+3 END permanent. Recette ancestrale — disponibilité fluctuante.", type:"consumable", effect:"perma_end", power:3, basePrice:3500, price:3500, rarityScales:true, rarity:"rare" },
  // ── Artefacts & Reliquaires 2.0 — P1 nouvelles formes (plan §1.4 A/B) ──
  // Nouveaux archétypes (`formType`) MAPPÉS sur les slots existants — aucun
  // nouveau slot. Deux nouveaux leviers mécaniques additifs seulement :
  //   bonusElemDmg    → +% dégâts d'un/des élément(s) de sort (battle-spells.js)
  //   spCostReduction → −N PM sur le coût des sorts, plancher 1 (battle-spells.js)
  // Les autres effets réutilisent les bonus* existants. `houseAffinity` est
  // posé là où le canon le justifie (consommé par les shops en P3).
  // A. Mid-game (Actes I-II, étages 3-7) — comble le palier `uncommon`/`rare`.
  { id:"orbe_flamme",          name:"Orbe de Flamme",         icon:"🔥", desc:"MAG+1 · +15 % dégâts de feu",                 type:"acc",  slot:"trinket", formType:"orbe",      rarity:"uncommon", bonusMag:1, bonusElemDmg:{ feu:0.15 },   power:1, price:220, tint:"#e0531f", houseAffinity:"Gryffondor" },
  { id:"orbe_givre",           name:"Orbe de Givre",          icon:"❄️", desc:"MAG+1 · +15 % dégâts de glace",               type:"acc",  slot:"trinket", formType:"orbe",      rarity:"uncommon", bonusMag:1, bonusElemDmg:{ glace:0.15 }, power:1, price:220, tint:"#4fb6e8", houseAffinity:"Serpentard" },
  { id:"cristal_focalisation", name:"Cristal de Focalisation",icon:"💠", desc:"MAG+2 · Crit de sort +4 % · −1 PM par sort", type:"acc",  slot:"amulet",  formType:"cristal",   rarity:"rare",     bonusMag:2, bonusSpellCritChance:4, spCostReduction:1, power:2, price:320, tint:"#7fd6e0", houseAffinity:"Serdaigle" },
  { id:"gantelets_combat",     name:"Gantelets de Combat",    icon:"🥊", desc:"ATK+3 STR+2 — la force perce les défenses",   type:"acc",  slot:"hands",   formType:"gantelets", rarity:"rare",     bonusAtk:3, bonusStr:2, power:3, price:300, houseAffinity:"Gryffondor" },
  { id:"baton_apprenti",       name:"Bâton d'Apprenti",       icon:"🌳", desc:"ATK+2 MAG+3 — bois de caster, lourd mais sûr",type:"wand", slot:"wand",    formType:"baton",     rarity:"uncommon", bonusAtk:2, bonusMag:3, power:3, price:260, tint:"#8a5a2b", houseAffinity:"Serdaigle" },
  { id:"cape_funambule",       name:"Cape du Funambule",      icon:"🧥", desc:"AGI+3 · Célérité +4 · Esquive +3 %",          type:"acc",  slot:"cloak",   formType:"cape",      rarity:"rare",     bonusAgi:3, bonusCelerite:4, bonusDodgeChance:3, power:3, price:360, tint:"#c8a24a", houseAffinity:"Serpentard" },
  { id:"masque_courage",       name:"Masque du Courage",      icon:"🎭", desc:"ATK+5 mais DEF−2 — l'audace sans la garde",    type:"acc",  slot:"head",    formType:"masque",    rarity:"rare",     bonusAtk:5, bonusDef:-2, power:5, price:300, tint:"#b03a2e", houseAffinity:"Gryffondor" },
  { id:"grimoire_flottant",    name:"Grimoire Flottant",      icon:"📖", desc:"INT+4 MAG+2 — un savoir qui se feuillette seul",type:"acc", slot:"trinket", formType:"grimoire",  rarity:"rare",     bonusInt:4, bonusMag:2, power:3, price:380, tint:"#3d6cc0", houseAffinity:"Serdaigle" },
  // Forme défensive mid-game (lean Poufsouffle) — alimente le slot faveur Pouf (P3).
  { id:"talisman_blaireau",    name:"Talisman du Blaireau",   icon:"📿", desc:"DEF+3 END+2 · Régen +1 PV/tour — la loyauté tient bon", type:"acc", slot:"amulet", formType:"talisman", rarity:"rare", bonusDef:3, bonusEnd:2, regenHp:1, power:3, price:340, tint:"#f0c75e", houseAffinity:"Poufsouffle" },
  // B. Endgame (Acte III, étages 8-10).
  { id:"baton_ancestral",      name:"Bâton Ancestral",        icon:"🌳", desc:"ATK+6 MAG+8 · Dégâts crit. de sort +25 %",    type:"wand", slot:"wand",    formType:"baton",     rarity:"epic",     bonusAtk:6, bonusMag:8, bonusSpellCritDamage:0.25, power:8, price:1300, tint:"#6b4423" },
  { id:"talisman_fondateurs",  name:"Talisman des Fondateurs",icon:"📿", desc:"MAG+4 DEF+4 · Régen +2 PV/+1 PM par tour · 🏺 Purge des Fondateurs (1×/combat : dissipe les statuts du groupe)",     type:"acc",  slot:"amulet",  formType:"talisman",  rarity:"epic",     bonusMag:4, bonusDef:4, regenHp:2, regenSp:1, power:4, price:1200, tint:"#caa84c", activeEffect:{ id:"purge_fondateurs", label:"Purge des Fondateurs", charges:1, target:"allyAll", resolve:"purgeStatus" } },
  { id:"masque_rituel",        name:"Masque Rituel",          icon:"🎭", desc:"MAG+8 · Crit de sort +8 % mais PV max −5",     type:"acc",  slot:"head",    formType:"masque",    rarity:"epic",     bonusMag:8, bonusSpellCritChance:8, bonusHpMax:-5, power:8, price:1100, tint:"#5b2c6f" },
  { id:"gantelets_aurors",     name:"Gantelets des Aurors",   icon:"🥊", desc:"ATK+5 STR+3 · Crit phys. +6 %",                type:"acc",  slot:"hands",   formType:"gantelets", rarity:"epic",     bonusAtk:5, bonusStr:3, bonusCritChance:6, power:5, price:1000, tint:"#2c5f8a" },
  // Lot E2 — 1er epic du slot belt (étude §5.2/§6.7), acte III / Hogsmeade corrompu
  { id:"ceinture_aurors",      name:"Ceinturon des Aurors",   icon:"➿", desc:"DEF+3 END+3 · Crit phys. +4 %",                type:"acc",  slot:"belt",    family:"belt_auror",  rarity:"epic",     bonusDef:3, bonusEnd:3, bonusCritChance:4, power:3, price:900, tint:"#c8a24a" },
  { id:"orbe_runique",         name:"Orbe Runique",           icon:"🔮", desc:"MAG+3 · +10 % dégâts de tous les éléments · 🏺 Décharge runique (1×/combat : foudre sur une cible)",    type:"acc",  slot:"trinket", formType:"orbe",      rarity:"epic",     bonusMag:3, bonusElemDmg:{ tous:0.10 }, power:3, price:1200, tint:"#9b59d0", activeEffect:{ id:"nova_runique", label:"Décharge runique", charges:1, target:"enemy", resolve:"elemBurst", power:12, element:"foudre" } },
  // ── Artefacts & Reliquaires 2.0 — P2 variantes Premium (plan §1.5) ──
  // Variantes recoloriées par Maison d'un artefact de base, stats PRÉ-CUITES
  // (base × PREMIUM_MULT[rarity], arrondi par premiumStat — décision §2.1 n°2 :
  // jamais de multiplicateur au runtime). Non vendables (prix 0) : remise
  // cérémonielle par le Chef de Maison à la Quête Signature (HOUSE_PREMIUM).
  // tags : premium, premiumOf (base), houseAffinity, premiumFx (clé FX/son).
  // Gryffondor — Orbe Runique doré (base orbe_runique epic ×1.35).
  { id:"orbe_runique_premium_gryff", name:"Orbe Runique de Godric", icon:"🔮", desc:"MAG+6 LCK+3 · +20 % dégâts de tous les éléments · Crit +5 % · 🏺 Décharge runique (1×/combat) — Premium Gryffondor", type:"acc", slot:"trinket", formType:"orbe", rarity:"epic", bonusMag:6, bonusLck:3, bonusElemDmg:{ tous:0.20 }, bonusCritChance:5, power:6, price:0, premium:true, premiumOf:"orbe_runique", houseAffinity:"Gryffondor", premiumFx:"gryff", tint:"#d3a625", rarityScales:true, basePrice:9000, activeEffect:{ id:"nova_runique", label:"Décharge runique", charges:1, target:"enemy", resolve:"elemBurst", power:16, element:"foudre" } },
  // Serpentard — Masque Rituel émeraude (base masque_rituel epic ×1.35).
  { id:"masque_rituel_premium_slyth", name:"Masque Rituel de Salazar", icon:"🎭", desc:"MAG+11 · Crit de sort +11 % mais PV max −5 — Premium Serpentard", type:"acc", slot:"head", formType:"masque", rarity:"epic", bonusMag:11, bonusSpellCritChance:11, bonusHpMax:-5, power:11, price:0, premium:true, premiumOf:"masque_rituel", houseAffinity:"Serpentard", premiumFx:"slyth", tint:"#1a472a", rarityScales:true, basePrice:9000 },
  // Serdaigle — Bâton Ancestral bleu éthéré (base baton_ancestral epic ×1.35).
  { id:"baton_ancestral_premium_serd", name:"Bâton Ancestral de Rowena", icon:"🌳", desc:"ATK+8 MAG+11 · Dégâts crit. de sort +34 % — Premium Serdaigle", type:"wand", slot:"wand", formType:"baton", rarity:"epic", bonusAtk:8, bonusMag:11, bonusSpellCritDamage:0.34, power:11, price:0, premium:true, premiumOf:"baton_ancestral", houseAffinity:"Serdaigle", premiumFx:"serd", tint:"#0e1a40", rarityScales:true, basePrice:9000 },
  // Poufsouffle — Talisman des Fondateurs terre cuite (base talisman_fondateurs epic ×1.35).
  { id:"talisman_fondateurs_premium_pouf", name:"Talisman de Helga", icon:"📿", desc:"MAG+5 DEF+5 · Régen +3 PV/+1 PM par tour · 🏺 Purge des Fondateurs (1×/combat) — Premium Poufsouffle", type:"acc", slot:"amulet", formType:"talisman", rarity:"epic", bonusMag:5, bonusDef:5, regenHp:3, regenSp:1, power:5, price:0, premium:true, premiumOf:"talisman_fondateurs", houseAffinity:"Poufsouffle", premiumFx:"pouf", tint:"#f0c75e", rarityScales:true, basePrice:9000, activeEffect:{ id:"purge_fondateurs", label:"Purge des Fondateurs", charges:1, target:"allyAll", resolve:"purgeStatus" } },
  // ── C. Reliques vocales (§1.4 C) — trinket, NON vendables (price:0),
  // octroyées en voyant l'écho du Fondateur en Boucle (grantVoiceRelicForEcho).
  // Les 4 réunies déverrouillent le Codex « Chœur des Fondateurs ». Passifs sur
  // champs prouvés : « fearImmune partiel » (Godric) & « spellLifesteal »
  // (Salazar) du plan rendus en stats (pas de mécanisme partiel/lifesteal
  // d'item dédié) ; « régen /pas » (Helga) rendu en regenHp /tour de combat.
  { id:"voix_godric_relique",  name:"Murmure de Godric",  icon:"🦁", desc:"Relique vocale — ATK+4 LCK+2. « On ne scelle pas par peur. On tient la porte. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusAtk:4, bonusLck:2, power:4, price:0, houseAffinity:"Gryffondor", tint:"#d3a625" },
  { id:"voix_salazar_relique", name:"Murmure de Salazar", icon:"🐍", desc:"Relique vocale — MAG+4 · Crit de sort +5 %. « J'ai scellé ma part avec ma faute. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusMag:4, bonusSpellCritChance:5, power:4, price:0, houseAffinity:"Serpentard", tint:"#1a472a" },
  { id:"voix_rowena_relique",  name:"Murmure de Rowena",  icon:"🦅", desc:"Relique vocale — INT+4 MAG+2 · −1 PM par sort. « Comprends, et la faille apparaît. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusInt:4, bonusMag:2, spCostReduction:1, power:4, price:0, houseAffinity:"Serdaigle", tint:"#0e1a40" },
  { id:"voix_helga_relique",   name:"Murmure de Helga",   icon:"🦡", desc:"Relique vocale — DEF+4 · Régen +2 PV/tour. « J'ai creusé un abri pour ceux qui resteraient. »", type:"acc", slot:"trinket", formType:"relique_vocale", rarity:"epic", bonusDef:4, regenHp:2, power:4, price:0, houseAffinity:"Poufsouffle", tint:"#f0c75e" },
  // ── Récompenses des Quêtes Signature de Maison (remises cérémonielles) ──
  // Cf. docs/histoire/08 §8.5 + .claude/plans/house-signature-quests-impl.md.
  { id:"banniere_godric",  name:"Bannière de Godric",   icon:"🚩", desc:"Bibelot — l'Étendard qui ne s'incline jamais. Immunise le groupe contre la Peur tant qu'un héros la porte. ATK+2.", type:"trinket", slot:"trinket", family:"banner_godric", rarity:"legendary", bonusAtk:2, fearImmune:true, power:5, price:0, tint:"#d3a625" },
  { id:"langue_de_plomb",  name:"Langue-de-plomb",      icon:"📿", desc:"Amulette — secret arraché à l'écho de Salazar. MAG+5 INT+2 · Régen +2 PM/tour.", type:"acc", slot:"amulet", family:"amulet_languedeplomb", rarity:"epic", bonusMag:5, bonusInt:2, regenSp:2, power:5, price:0, tint:"#1a472a" },
  { id:"codex_rowena_eclat", name:"Feuillets de Rowena",  icon:"📘", desc:"Bibelot — le traité perdu de Rowena Serdaigle. INT+4 MAG+2 · le savoir révèle les failles de l'ennemi.", type:"trinket", slot:"trinket", family:"codex_rowena_eclat", rarity:"epic", bonusInt:4, bonusMag:2, power:4, price:0, tint:"#0e1a40" },
  { id:"coeur_refuge",     name:"Cœur du Refuge",       icon:"🏅", desc:"Bibelot — forgé par Helga pour ceux qu'on ne laisse pas derrière. DEF+2 END+2 · Régen +2 PV/+1 PM par tour.", type:"trinket", slot:"trinket", family:"trinket_refuge", rarity:"epic", bonusDef:2, bonusEnd:2, regenHp:2, regenSp:1, power:4, price:0, tint:"#f0c75e" },
  // ── Herbes (ingrédients de potion) — type:"herb" ─────────────
  // Routées vers la besace d'herboriste (player.herbs), pas le sac.
  // Voir .claude/plans/farming-potion-system.md.
  { id:"herbe_armoise",      name:"Armoise",          icon:"🌿", desc:"Ingrédient de potion (palier 1).", type:"herb", tier:1, price:6 },
  { id:"herbe_ortie",        name:"Ortie séchée",     icon:"🍀", desc:"Ingrédient de potion (palier 1).", type:"herb", tier:1, price:6 },
  { id:"herbe_asphodele",    name:"Asphodèle",        icon:"🌼", desc:"Ingrédient de potion (palier 2).", type:"herb", tier:2, price:12 },
  { id:"herbe_branchiflore", name:"Branchiflore",     icon:"🪴", desc:"Ingrédient de potion (palier 2).", type:"herb", tier:2, price:12 },
  { id:"herbe_aconit",       name:"Aconit",           icon:"☘️", desc:"Ingrédient de potion (palier 3).", type:"herb", tier:3, price:20 },
  { id:"herbe_dictame",      name:"Dictame",          icon:"🍃", desc:"Ingrédient de potion (palier 3).", type:"herb", tier:3, price:20 },
  // Palier 4 — herbe rare endgame, ne pousse qu'en Boucle Ténébreuse (étages
  // 11+). Source : cueillette haut-étage + drop du Héraut des Ténèbres +
  // Apothicaire Ténébreux. Réservée aux Élixirs Suprêmes de prestige.
  { id:"herbe_asphodele_noire", name:"Asphodèle des Ténèbres", icon:"🥀", desc:"Ingrédient de potion (palier 4 — Boucle Ténébreuse).", type:"herb", tier:4, price:40 },

  // ── Mondes parallèles Phase H §6.10 — Set Voyageur ────────────
  // 5 pièces craftées à l'Atelier du Voyageur avec des Essences
  // d'Outremonde. Tagged family:'voyageur' pour le bonus de set (2/3/4/5
  // pièces, calculé dans recalculateStats). Stats modestes par pièce —
  // l'intérêt vient du bonus cumulé. Aucun gold price (non vendables).
  { id:"voyageur_diademe",   name:"Diadème du Plan",      icon:"👑", desc:"Tissé d'éclats d'outremonde. +1 INT, +1 LCK.", type:"equip", slot:"head",   family:"voyageur", rarity:"rare", bonusInt:1, bonusLck:1, _outremondeCost:8,  price:0 },
  { id:"voyageur_cape",      name:"Cape du Voyageur",     icon:"🧥", desc:"Tournoie au moindre vent d'un autre plan. +1 AGI, regen SP.", type:"equip", slot:"cloak",  family:"voyageur", rarity:"rare", bonusAgi:1, regenSp:1, _outremondeCost:12, price:0 },
  { id:"voyageur_bottes",    name:"Bottes du Pas Astral", icon:"👢", desc:"Effleurent le sol, jamais ne l'usent. +1 AGI.", type:"equip", slot:"feet",   family:"voyageur", rarity:"rare", bonusAgi:1, _outremondeCost:6,  price:0 },
  { id:"voyageur_anneau",    name:"Anneau de l'Outremonde", icon:"💍", desc:"Une rune froide pulse au doigt. +1 MAG, regen SP.", type:"equip", slot:"ring",   family:"voyageur", rarity:"rare", bonusMag:1, regenSp:1, _outremondeCost:10, price:0 },
  { id:"voyageur_amulette",  name:"Amulette du Lien",     icon:"📿", desc:"Frémit quand les mondes se touchent. +1 LCK, +1 INT.", type:"equip", slot:"amulet", family:"voyageur", rarity:"rare", bonusLck:1, bonusInt:1, _outremondeCost:10, price:0 },
];

// ── Recettes de potion (concoction chez Slughorn) ─────────────
// Voir .claude/plans/farming-potion-system.md. `difficulty` pilote le
// jet INT ; `ingredients` est un multiset { itemId: qty }.
const POTION_RECIPES = [
  { id:"brew_potion_s",     name:"Potion de Soin",        resultItemId:"potion_s",
    ingredients:{ herbe_armoise:2 },                                    difficulty:8,
    lore:"La concoction curative de base — deux brins d'armoise suffisent." },
  { id:"brew_potion_m",     name:"Potion Magique",        resultItemId:"potion_m",
    ingredients:{ herbe_ortie:2 },                                      difficulty:8,
    lore:"L'ortie séchée libère l'énergie magique à l'infusion." },
  { id:"brew_potion_l",     name:"Grande Potion de Soin", resultItemId:"potion_l",
    ingredients:{ herbe_asphodele:2, herbe_armoise:1 },                 difficulty:12,
    lore:"L'asphodèle décuple la vertu curative de l'armoise." },
  { id:"brew_potion_l_sp",  name:"Grande Potion Magique", resultItemId:"potion_l_sp",
    ingredients:{ herbe_branchiflore:2, herbe_ortie:1 },                difficulty:12,
    lore:"La branchiflore amplifie le flux magique de l'ortie." },
  { id:"brew_potion_force", name:"Potion de Force",       resultItemId:"potion_force",
    ingredients:{ herbe_aconit:1, mandragore:2 },                       difficulty:14,
    lore:"L'aconit, dosé avec soin, exalte la vigueur du buveur." },
  { id:"brew_potion_xl",    name:"Élixir Suprême",        resultItemId:"potion_xl",
    ingredients:{ herbe_dictame:2, herbe_aconit:1, herbe_asphodele:1 }, difficulty:18,
    lore:"Le dictame, herbe légendaire, parachève l'élixir des maîtres." },
  // ── Recettes utilitaires (PR 3) ──────────────────────────────
  // Antidote & régénération : combos d'herbes simples, découvrables librement.
  { id:"brew_elixir_antidote", name:"Élixir d'Antidote",  resultItemId:"elixir_antidote",
    ingredients:{ herbe_armoise:1, herbe_ortie:1 },                     difficulty:11,
    lore:"L'armoise neutralise les humeurs, l'ortie chasse les venins." },
  { id:"brew_elixir_regen",    name:"Élixir de Régénération", resultItemId:"elixir_regen",
    ingredients:{ herbe_dictame:1, herbe_asphodele:1 },                 difficulty:12,
    lore:"Le dictame distillé sur l'asphodèle nourrit la chair tour après tour." },
  // Avancées : pré-enseignées par la 3ᵉ quête Slughorn (mais découvrables).
  // (brew_potion_force existe déjà plus haut — pré-enseignée par la quête 3.)
  { id:"brew_potion_resistance", name:"Potion de Résistance", resultItemId:"potion_resistance",
    ingredients:{ herbe_aconit:1, herbe_branchiflore:2 },               difficulty:15,
    lore:"La branchiflore tanne la peau ; l'aconit endurcit l'âme contre les coups." },
  // ── Potions de buff de combat (P2) ──────────────────────────────────────
  { id:"brew_potion_defense",   name:"Potion de Défense",   resultItemId:"potion_defense",
    ingredients:{ herbe_asphodele:1, herbe_aconit:1 },                  difficulty:14,
    lore:"L'asphodèle stabilise, l'aconit cuirasse — le buveur tient le choc." },
  { id:"brew_elixir_celerite",  name:"Élixir de Célérité",  resultItemId:"elixir_celerite",
    ingredients:{ herbe_ortie:2, herbe_branchiflore:1 },                difficulty:14,
    lore:"L'ortie vivifie les nerfs ; la branchiflore allège le pas." },
  { id:"brew_potion_precision", name:"Potion de Précision", resultItemId:"potion_precision",
    ingredients:{ herbe_armoise:2, herbe_dictame:1 },                   difficulty:14,
    lore:"L'armoise aiguise l'œil, le dictame apaise la main du lanceur." },
  { id:"brew_elixir_puissance", name:"Élixir de Puissance", resultItemId:"elixir_puissance",
    ingredients:{ herbe_ortie:1, herbe_aconit:1, herbe_dictame:1 },     difficulty:15,
    lore:"Trois herbes en triade ouvrent les canaux de la magie brute." },
  { id:"brew_potion_xl_sp", name:"Élixir d'Esprit Suprême", resultItemId:"potion_xl_sp",
    ingredients:{ herbe_dictame:2, herbe_branchiflore:1, herbe_ortie:1 }, difficulty:18,
    lore:"Le dictame canalise la branchiflore en un flux mental sans égal." },
  // ── Chaîne de soin à paliers (P4) — upgrade-craft via Éclat de Vitalité ──
  // Mineure : herbes simples (découvrable). Mineure+ / ++ : la potion de rang
  // inférieur + Éclat(s) — un ingrédient EST une potion (résolu depuis le sac).
  { id:"brew_potion_soin_mineure", name:"Potion de Soin Mineure", resultItemId:"potion_soin_mineure",
    ingredients:{ herbe_armoise:1, herbe_asphodele:1 },                 difficulty:9,
    lore:"Une décoction de soin d'apprenti : armoise et asphodèle, sans détour." },
  { id:"brew_potion_soin_mineure_plus", name:"Potion de Soin Mineure +", resultItemId:"potion_soin_mineure_plus",
    ingredients:{ potion_soin_mineure:1, eclat_vitalite:1 },            difficulty:13,
    lore:"Un Éclat de Vitalité fondu dans la fiole en double presque la vertu." },
  { id:"brew_potion_soin_mineure_pp", name:"Potion de Soin Mineure ++", resultItemId:"potion_soin_mineure_pp",
    ingredients:{ potion_soin_mineure_plus:1, eclat_vitalite:2 },       difficulty:17,
    lore:"Deux Éclats saturent la potion d'énergie vitale — le palier des maîtres." },
  // ── Upgrades des potions existantes (soin & magie) ──────────────────────
  { id:"brew_up_potion_l",    name:"Grande Potion de Soin (raffinage)", resultItemId:"potion_l",
    ingredients:{ potion_s:1, eclat_vitalite:1 },                       difficulty:12,
    lore:"L'Éclat de Vitalité transmue une Potion de Soin en sa version majeure." },
  { id:"brew_up_potion_l_sp", name:"Grande Potion Magique (raffinage)", resultItemId:"potion_l_sp",
    ingredients:{ potion_m:1, eclat_vitalite:1 },                       difficulty:12,
    lore:"L'énergie de l'Éclat densifie le flux magique d'une Potion Magique." },
  { id:"brew_up_potion_xl",   name:"Élixir Suprême (raffinage)",        resultItemId:"potion_xl",
    ingredients:{ potion_l:1, eclat_vitalite:2 },                       difficulty:18,
    lore:"Deux Éclats portent une Grande Potion au rang d'Élixir Suprême." },
  { id:"brew_up_potion_xl_sp", name:"Élixir d'Esprit Suprême (raffinage)", resultItemId:"potion_xl_sp",
    ingredients:{ potion_l_sp:1, eclat_vitalite:2 },                    difficulty:18,
    lore:"Deux Éclats subliment une Grande Potion Magique en Élixir d'Esprit." },
  // ── Recettes de prestige (P6.b1) — Asphodèle des Ténèbres ────────────────
  // Voie endgame : la fleur corrompue de la Boucle Ténébreuse distille un
  // Élixir Suprême sans intermédiaire. Réemploient les items résultats
  // existants (potion_xl / potion_xl_sp). Découvrables librement.
  { id:"brew_xl_tenebres",    name:"Élixir Suprême (Ténèbres)",        resultItemId:"potion_xl",
    ingredients:{ herbe_asphodele_noire:2 },                            difficulty:18,
    lore:"L'asphodèle des Ténèbres, à elle seule, vaut tout un autel d'ingrédients." },
  { id:"brew_xl_sp_tenebres", name:"Élixir d'Esprit Suprême (Ténèbres)", resultItemId:"potion_xl_sp",
    ingredients:{ herbe_asphodele_noire:3 },                            difficulty:18,
    lore:"Trois fleurs noires ouvrent l'esprit aux confins de la magie." },
  // ── Flacons offensifs (P6.c) — projectiles alchimiques ───────────────────
  // Multisets inédits (vérifiés sans collision). Découvrables librement.
  { id:"brew_flacon_feu",   name:"Flacon de Feu",   resultItemId:"flacon_feu",
    ingredients:{ herbe_aconit:2 },                                     difficulty:13,
    lore:"L'aconit distillé s'embrase au contact de l'air — à lancer, jamais à boire." },
  { id:"brew_flacon_givre", name:"Flacon de Givre", resultItemId:"flacon_givre",
    ingredients:{ herbe_branchiflore:2 },                               difficulty:13,
    lore:"La branchiflore gelée éclate en esquilles de glace sur sa cible." },
  { id:"brew_flacon_venin", name:"Flacon de Venin", resultItemId:"flacon_venin",
    ingredients:{ herbe_ortie:1, herbe_dictame:1 },                     difficulty:14,
    lore:"Un venin paradoxal : l'ortie attaque là où le dictame guérit." },
  // ── Anti-corruption (Potions 2.0 — Lot P7) ───────────────────────────────
  // Nouveaux champs de recette optionnels §1.4 : `workshop` (atelier requis,
  // défaut "any"), `minFloor` (gate de découverte). Inertes au runtime tant que
  // le Chaudron des Ruines / `workshopLevel` n'existent pas (Lot P11) — la
  // disponibilité réelle est portée par les ingrédients (asphodèle noire =
  // Boucle) et par les recettes pré-enseignées en quête signature.
  // Multisets vérifiés sans collision (cf. scenarioPotionUpgradeCraft T2).
  { id:"brew_elixir_lucidite", name:"Élixir de Lucidité", resultItemId:"elixir_lucidite",
    ingredients:{ herbe_dictame:2, herbe_asphodele_noire:1 },           difficulty:18,
    workshop:"ruines", minFloor:11,
    lore:"Le dictame purifie ce que l'asphodèle noire a souillé — l'esprit s'éclaircit." },
  { id:"brew_baume_patronus", name:"Baume du Patronus", resultItemId:"baume_patronus",
    ingredients:{ herbe_dictame:1, herbe_branchiflore:1, herbe_armoise:1 }, difficulty:14,
    workshop:"slughorn",
    lore:"Trois herbes douces tressées en un souvenir heureux — la peur recule." },
  { id:"brew_elixir_immunite", name:"Élixir d'Immunité", resultItemId:"elixir_immunite",
    ingredients:{ herbe_dictame:1, herbe_asphodele:2 },                 difficulty:13,
    workshop:"slughorn",
    lore:"L'asphodèle stabilise l'âme ; le dictame la cuirasse contre la dérive." },
  // ── Potion évolutive (Potions 2.0 — Lot P8) ──────────────────────────────
  // Multiset inédit (herbe T3 + Éclat de Vitalité). Découvrable librement.
  { id:"brew_philtre_mage", name:"Philtre du Mage", resultItemId:"philtre_mage",
    ingredients:{ herbe_dictame:1, eclat_vitalite:1 },                  difficulty:15,
    lore:"Le dictame infusé sur un Éclat de Vitalité s'accorde aux focaliseurs du mage." },
  // ── Résilience Maison (Potions 2.0 — Lot P9) ─────────────────────────────
  // Herbe T2 ×2 + Éclat de Vitalité (« ingrédient Maison »). Multiset inédit.
  // Pré-enseignée par la quête signature de Maison (reward.recipes).
  { id:"brew_resilience_maison", name:"Potion de Résilience Maison", resultItemId:"potion_resilience_maison",
    ingredients:{ herbe_asphodele:1, herbe_branchiflore:1, eclat_vitalite:1 }, difficulty:16,
    lore:"Deux herbes nobles liées par un Éclat de Vitalité épousent la vertu de ta Maison." },
  // ── Potion à risque (Potions 2.0 — Lot P10) ──────────────────────────────
  // Voie Boucle : 2 asphodèles noires + aconit. Multiset inédit. workshop ruines.
  { id:"brew_potion_corruption_ctrl", name:"Potion de Corruption Contrôlée", resultItemId:"potion_corruption_ctrl",
    ingredients:{ herbe_asphodele_noire:2, herbe_aconit:1 },            difficulty:18,
    workshop:"ruines", minFloor:11,
    lore:"L'aconit bride la fleur noire — assez pour canaliser sa corruption, jamais pour l'éteindre." },
  // ── Formes utilitaires & contrôle (Potions 2.0 — Lot P12, §1.5) ──────────
  // Multisets vérifiés uniques (aucune collision avec les 32 recettes existantes).
  { id:"brew_potion_vision", name:"Potion de Vision des Éclats", resultItemId:"potion_vision",
    ingredients:{ herbe_branchiflore:1, herbe_ortie:1 },                difficulty:12,
    lore:"La branchiflore ouvre l'œil intérieur ; l'ortie le tient éveillé." },
  // Écho Temporel : un Retourneur de Temps (sac) infusé au dictame. workshop ruines.
  { id:"brew_echo_temporel", name:"Potion d'Écho Temporel", resultItemId:"potion_echo_temporel",
    ingredients:{ herbe_dictame:2, retourneur_temps:1 },               difficulty:18,
    workshop:"ruines", minFloor:11,
    lore:"Le dictame infusé sur un Retourneur de Temps fige un instant dans la fiole." },
  // Huiles d'arme ×3 — herbes par élément. workshop "any" (gatées par les herbes).
  { id:"brew_huile_feu", name:"Huile de Feu", resultItemId:"huile_feu",
    ingredients:{ herbe_aconit:1, herbe_ortie:1 },                     difficulty:14,
    lore:"L'aconit et l'ortie macérés mordent le métal d'une ardeur brûlante." },
  { id:"brew_huile_givre", name:"Huile de Givre", resultItemId:"huile_givre",
    ingredients:{ herbe_branchiflore:1, herbe_asphodele:1 },           difficulty:14,
    lore:"La branchiflore liée à l'asphodèle dépose un froid mordant sur la lame." },
  { id:"brew_huile_foudre", name:"Huile de Foudre", resultItemId:"huile_foudre",
    ingredients:{ herbe_aconit:1, herbe_branchiflore:1 },              difficulty:14,
    lore:"Aconit et branchiflore tressent une charge qui crépite au contact." },
  // Poudres runiques ×2 — Page de Grimoire (sac) pulvérisée avec une herbe. workshop ruines.
  { id:"brew_poudre_stun", name:"Poudre Runique Étourdissante", resultItemId:"poudre_stun",
    ingredients:{ herbe_aconit:1, page_grimoire:1 },                   difficulty:15,
    workshop:"ruines", minFloor:11,
    lore:"Une Page de Grimoire pulvérisée avec l'aconit — la rune fige qui la respire." },
  { id:"brew_poudre_fear", name:"Poudre Runique Aveuglante", resultItemId:"poudre_fear",
    ingredients:{ herbe_armoise:1, page_grimoire:1 },                  difficulty:15,
    workshop:"ruines", minFloor:11,
    lore:"L'armoise broyée sur une Page de Grimoire exhale une terreur runique." },
];

const SHOP_ITEMS = ["potion_s","potion_m","felix","choco_sorcier","wand1","robe1","amulette","broom","mandragore","livre_sortileges","livre_soin","livre_bombarda"];

// Set bonus Ténèbres (endgame Tranche 2 — cf. ENDGAME_PLAN.md §7.8) :
//   2 items équipés → +10 crit chance, +5 dodge chance
//   3 items équipés → +15 crit chance, +10 dodge chance, +2 regenHp/tour
// Compté dans recalculateStats() (crit/dodge) et applyEquipmentRegen() (regen).
const TENEBRES_SET = ['cape_voldemort', 'cendres_phenix', 'oeil_basilic'];

// ── Loot table d'équipement pour les coffres ────────────────────
// Étage minimum d'éligibilité par rareté. Les items légendaires
// (Maisons) sont exclus des coffres (récompenses dédiées).
// Voir .claude/plans/equipment-extended.md §3.5.
const CHEST_RARITY_MIN_FLOOR = { common: 1, rare: 4, epic: 7 };
const CHEST_RARITY_WEIGHT    = { common: 6, rare: 3, epic: 1 };

// Renvoie un item d'équipement éligible pour un étage donné, pondéré
// par rareté (commons fréquents au début, rares puis épiques après).
// Exclut les spellbooks/consumables/légendaires.
function pickChestEquipment(floor) {
  const pool = ITEMS.filter(it => {
    if (!it.slot) return false;
    if (it.type === 'consumable' || it.type === 'spellbook') return false;
    if (it.rarity === 'legendary') return false;
    const minF = CHEST_RARITY_MIN_FLOOR[it.rarity || 'common'] || 1;
    return floor >= minF;
  });
  if (pool.length === 0) return null;
  // Somme des poids puis tirage proportionnel
  let total = 0;
  for (const it of pool) total += (CHEST_RARITY_WEIGHT[it.rarity || 'common'] || 1);
  let r = Math.random() * total;
  for (const it of pool) {
    r -= (CHEST_RARITY_WEIGHT[it.rarity || 'common'] || 1);
    if (r <= 0) return it;
  }
  return pool[pool.length - 1];
}


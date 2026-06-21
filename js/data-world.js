// ============================================================
// DONNÉES — MONDE (LOCATIONS + NARRATIVES + OUTREMONDE)
// (extrait de data.js — Lot A P3.3, pur couper-coller)
// ============================================================

const LOCATIONS = [
  "Les Couloirs de Poudlard", "Le Cachot de Potions", "La Grande Salle",
  "La Bibliothèque Interdite", "La Tour de Gryffondor", "Le Donjon de Serpentard",
  "Les Toilettes Hantées", "La Forêt Interdite", "La Salle sur Demande",
  "Les Égouts de Poudlard", "La Chambre des Secrets"
];

const NARRATIVES = {
  floor: [
    "Les torches vacillent sur les murs de pierre froide.",
    "L'écho de vos pas résonne dans le couloir silencieux.",
    "Des portraits murmurent sur les murs tandis que vous passez.",
    "Une odeur de parchemin et de magie flotte dans l'air.",
    "Le château semble respirer autour de vous.",
    "Des araignées tissent leurs toiles dans les coins sombres.",
    "La lumière des lampes à huile projette des ombres dansantes.",
    "Vous entendez un bruit sourd quelque part plus profond dans le château.",
  ],
  door: "Une lourde porte en bois sculpté bloque le passage.",
  stairs_down: "Un escalier tourne en vis descend vers les profondeurs.",
  stairs_up: "Un escalier de pierre remonte vers les étages supérieurs.",
  shop: "Une aile de la bibliothèque a été transformée en échoppe de fortune.",
  chest: "Un coffre verrouillé trône contre le mur, prometteur.",
  trap: "Le sol craque sous vos pieds. C'était un piège !",
  nothing: "Vous fouillez méticuleusement mais ne trouvez rien.",
  gold_found: (n) => `Vous trouvez ${n} Gallions sur le sol !`,
  item_found: (n) => `Vous découvrez : ${n} !`,
  heal_room: "Un bassin magique restaure partiellement vos forces.",
};

// ============================================================
// MONDES PARALLÈLES V1c.1 — registres souvenirs + cosmétiques
// ============================================================
// Souvenirs passifs : débloqués automatiquement par métriques (cf.
// `outremondeMetrics` dans state.js). Chaque souvenir confère un petit
// bonus de stat permanent (Σ appliqué à tout le groupe dans
// `recalculateStats` via `_voyageurMetricsBonus`).
//
// `cond(m)` retourne true si la métrique courante débloque le souvenir.
// Le check est centralisé dans `_checkSouvenirs()` (atelier-voyageur.js),
// qui ajoute à `outremondeSouvenirs` + déclenche un toast + safeCall
// autoSave. Idempotent : un souvenir déjà débloqué n'est jamais retiré.
const OUTREMONDE_SOUVENIRS = [
  { id:"premier_pas",    name:"Premier Pas",      icon:"🌒", desc:"Tu as franchi le seuil. +1 LCK.",
    cond: m => m.visitsTotal >= 1,
    bonus: { bonusLck:1 } },
  { id:"voyageur_familier", name:"Voyageur Familier", icon:"🗺️", desc:"3 plans différents arpentés. +1 INT.",
    cond: m => (m.uniqueHosts && m.uniqueHosts.size >= 3) || (Array.isArray(m.uniqueHosts) && m.uniqueHosts.length >= 3),
    bonus: { bonusInt:1 } },
  { id:"astralien",      name:"Astralien",         icon:"⚔️", desc:"5 Verrous résolus à distance. +1 MAG.",
    cond: m => m.sealsResolved >= 5,
    bonus: { bonusMag:1 } },
  { id:"trame_cousue",   name:"Trame Cousue",      icon:"🕸️", desc:"10 échos défaits. +1 AGI.",
    cond: m => m.echosDefeated >= 10,
    bonus: { bonusAgi:1 } },
  { id:"cartographe",    name:"Cartographe",       icon:"📜", desc:"20 voyages cumulés. +1 LCK +1 INT.",
    cond: m => m.visitsTotal >= 20,
    bonus: { bonusLck:1, bonusInt:1 } },
  { id:"plenipotentiaire", name:"Plénipotentiaire", icon:"👑", desc:"Maître reconnu des plans. +1 ATK +1 MAG.",
    cond: m => m.sealsResolved >= 10 && m.echosDefeated >= 15,
    bonus: { bonusAtk:1, bonusMag:1 } }
];

// Cosmétiques : 12 unlocks répartis en 3 catégories (aura / portail /
// fissure). Achetés à l'Atelier contre essences + fragments. Un
// cosmétique acheté est ajouté à `outremondeCosmetics` ; l'activation
// (`outremondeActive<Kind>` = id) pilote les couches visuelles.
//
// `kind` ∈ 'aura' | 'portal' | 'fissure'. `palette` est une couleur CSS
// hex consommée par les couches de rendu (CSS variable + portal-fx +
// HUD visite).
const OUTREMONDE_COSMETICS = [
  // Auras de visite — halo coloré autour du HUD de visite côté visiteur.
  { id:"aura_or",      name:"Aura d'Or",      icon:"🌟", kind:"aura",    palette:"#d8b647", essCost:5, fragCost:1, desc:"Halo doré chaud autour du HUD de visite." },
  { id:"aura_glace",   name:"Aura de Glace",  icon:"❄️", kind:"aura",    palette:"#a8e0ff", essCost:6, fragCost:1, desc:"Halo bleuté glacial autour du HUD." },
  { id:"aura_brume",   name:"Aura de Brume",  icon:"🌫️", kind:"aura",    palette:"#c8c4d6", essCost:5, fragCost:1, desc:"Halo violet-gris brumeux." },
  { id:"aura_lune",    name:"Aura de Lune",   icon:"🌙", kind:"aura",    palette:"#e8ecf8", essCost:7, fragCost:2, desc:"Halo blanc-bleu très clair." },
  // Skins de portail — couleur principale de l'animation Cheminette.
  { id:"portal_emeraude", name:"Portail d'Émeraude", icon:"💚", kind:"portal", palette:"#3cdc5a", essCost:5, fragCost:1, desc:"Flammes vertes (défaut)." },
  { id:"portal_amethyste", name:"Portail d'Améthyste", icon:"💜", kind:"portal", palette:"#a060d0", essCost:8, fragCost:2, desc:"Flammes violettes." },
  { id:"portal_rubis",     name:"Portail de Rubis",     icon:"❤️", kind:"portal", palette:"#d94545", essCost:8, fragCost:2, desc:"Flammes écarlates." },
  { id:"portal_saphir",    name:"Portail de Saphir",    icon:"💙", kind:"portal", palette:"#4488dd", essCost:8, fragCost:2, desc:"Flammes bleu profond." },
  // Skins de fissure — couleur principale de la cellule trouée côté host.
  { id:"fissure_or",       name:"Fissure d'Or",       icon:"✨", kind:"fissure", palette:"#d8b647", essCost:5, fragCost:1, desc:"Bord de fissure doré." },
  { id:"fissure_argent",   name:"Fissure d'Argent",   icon:"⚪", kind:"fissure", palette:"#c0c4ce", essCost:6, fragCost:1, desc:"Bord argenté." },
  { id:"fissure_cuivre",   name:"Fissure de Cuivre",  icon:"🟠", kind:"fissure", palette:"#cf8a3a", essCost:6, fragCost:1, desc:"Bord cuivré chaud." },
  { id:"fissure_obsidienne", name:"Fissure d'Obsidienne", icon:"⚫", kind:"fissure", palette:"#2a2530", essCost:8, fragCost:2, desc:"Bord obsidienne lustrée." }
];


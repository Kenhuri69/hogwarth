// ============================================================
// MONSTERS.JS — Registre complet des créatures
// ============================================================
// Ce fichier est le seul à modifier pour ajouter ou modifier des ennemis.
// Le moteur du jeu lit ce tableau et adapte automatiquement :
//   • la sélection par étage (minFloor / maxFloor)
//   • la fréquence d'apparition (weight)
//   • la mise à l'échelle des stats par étage (scale)
//   • les capacités spéciales utilisées en combat (abilities)
//   • les résistances et faiblesses aux sorts (resist / weak)
//   • les objets droppés à la victoire (drops)
//
// ── Description de chaque propriété ────────────────────────
//
//  id        {string}   Identifiant unique, sans espaces ni accents
//  name      {string}   Nom affiché en jeu
//  icon      {string}   Emoji affiché en combat
//  category  {string}   "bête" | "humain" | "fantôme" | "créature" | "être magique"
//  desc      {string}   Message d'apparition affiché dans le log de combat
//  lore      {string}   Texte de lore (futur écran de bestiaire)
//
//  minFloor  {number}   Étage minimum d'apparition (1 = dès le début)
//  maxFloor  {number|null}  Étage maximum (null = apparaît jusqu'au dernier étage)
//  weight    {number}   Fréquence de tirage — 10 = commun, 5 = rare, 2 = très rare
//
//  hp        {number}   Points de vie de base (avant mise à l'échelle)
//  atk       {number}   Attaque physique de base
//  def       {number}   Défense physique de base
//  mag       {number}   Puissance magique (utilisée par les capacités)
//  agi       {number}   Agilité
//  lck       {number}   Chance
//  scale     {number}   Coefficient de progression : stat × (1 + (étage−1) × scale)
//                       Exemples : 0.15 = progression lente, 0.35 = progression rapide
//
//  abilities [{...}]    Capacités spéciales ([] = aucune, attaque physique uniquement)
//    .name   {string}   Nom affiché dans le log
//    .icon   {string}   Emoji de la capacité
//    .desc   {string}   Description courte
//    .effect {string}   "damage"  → dégâts magiques directs (power + mag/2)
//                       "heal"    → l'ennemi se soigne de power PV
//                       "weaken"  → réduit la DEF de la cible de power (permanent ce combat)
//                       "drain"   → draine power PV de la cible et s'en soigne à moitié
//                       "status"  → applique un statut persistant à la cible
//                                   (requiert .statusId + .turns ; ex. burn/bleed/poison)
//                       — Archétypes boss/élites (LOT B3, réservés epic / étages 8+) —
//                       "summon"     → invoque un add si un slot ennemi est libre
//                                      (cap 3). Requiert .summonId (id MONSTERS) ;
//                                      .summonName optionnel pour le fallback.
//                       "enrage_self"→ une fois passé sous .hpPct (0-1, déf. 0.4)
//                                      de PV, l'ennemi gagne .atkBonus ATK (une
//                                      seule fois). Sinon : attaque normale.
//                       "aura"       → applique un debuff de groupe persistant à
//                                      tous les héros vivants. Requiert .statusId
//                                      (ex. "weaken") + .power + .turns.
//    .power  {number}   Valeur de base de l'effet
//    .statusId {string} (effect:"status" uniquement) id du statut appliqué
//    .turns  {number}   (effect:"status" uniquement) durée du statut en tours
//    .chance {number}   Probabilité d'utilisation à chaque tour (0.0 à 1.0)
//
//  ai        {string}   Comportement en combat (utilisé pour évolutions futures) :
//                       "aggressive" | "cautious" | "random"
//
//  resist    [string]   Sorts atténués de 50% sur cet ennemi. Éléments :
//                       "feu" | "glace" | "foudre" | "lumière" | "ténèbres"
//                       | "physique" — plus la clé mécanique "disarm".
//  weak      [string]   Sorts amplifiés de 50% sur cet ennemi (mêmes valeurs)
//
//  xp        {number}   XP de base accordée (avant mise à l'échelle)
//  gold      {number | {min, max}}
//                       Or de base. Peut être un nombre fixe ou un intervalle aléatoire.
//  drops     [{itemId, chance}]
//                       Objets potentiellement droppés après combat.
//                       Chaque entrée est tirée indépendamment.
//    .itemId {string}   ID de l'objet (voir ITEMS dans data.js)
//    .chance {number}   Probabilité de drop (0.0 à 1.0 — ex: 0.15 = 15%)
//
// ────────────────────────────────────────────────────────────
// Pour ajouter un monstre : copiez le TEMPLATE EN BAS DE CE FICHIER
// ============================================================

const MONSTERS = [];


// ════════════════════════════════════════════
// TEMPLATE — Copier-coller pour ajouter un monstre
// ════════════════════════════════════════════
//
// {
//   id:       "mon_monstre",
//   name:     "Nom du Monstre",
//   icon:     "🐾",
//   category: "bête",            // bête | humain | fantôme | créature | être magique
//   desc:     "Description courte affichée au début du combat.",
//   lore:     "Texte de lore plus long pour le bestiaire.",
//   minFloor: 1, maxFloor: 5, weight: 8,
//   hp: 20, atk: 5, def: 2, mag: 0, agi: 10, lck: 8,
//   scale: 0.25,
//   abilities: [
//     { name: "Nom Capacité", icon: "💥", desc: "Description",
//       effect: "damage",    // damage | heal | weaken | drain | status
//       power: 8, chance: 0.30 }
//     // effect:"status" → ajouter statusId:"burn" et turns:2
//   ],
//   ai: "aggressive",            // aggressive | cautious | random
//   resist: [],                  // feu|glace|foudre|lumière|ténèbres|physique|disarm
//   weak:   ["feu"],
//   xp: 15, gold: { min: 5, max: 15 },
//   drops: [
//     { itemId: "mandragore", chance: 0.15 },
//     { itemId: "potion_s",   chance: 0.08 }
//   ]
// },

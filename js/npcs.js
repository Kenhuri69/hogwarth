// ============================================================
// REGISTRE DES PNJ
// ============================================================
// Source unique pour ajouter, modifier ou supprimer un PNJ.
// Le moteur (génération, dialogue, quêtes) lit uniquement ce registre.
//
// Schéma d'une entrée :
// {
//   id:          "string-unique",
//   name:        "Nom affiché",
//   title:       "Sous-titre / fonction",
//   icon:        "🧙",                     // emoji fallback
//   portraitImg: "img/npc/<id>.png"         // optionnel : portrait raster (priorité 1)
//   portraitSvg: '<svg>...</svg>'           // optionnel : portrait inline (priorité 2)
//   placement:   { floor: 1, anchor: "first-room" | "any" },  // PNJ fixes
//   random:      true,                      // PNJ ambulant : tiré aléatoirement
//   minFloor:    2,                         //   borne basse de tirage (random)
//   maxFloor:    null,                      //   borne haute (null = sans limite)
//   wares:       [                          // optionnel : catalogue vendeur
//     { id: "potion_s", price: 30 },        //   `price` override ITEMS[id].price
//     ...                                   //   (sinon prix d'origine de l'item)
//   ],
//   buyback:     {                          // optionnel : politique de rachat
//     default: 0.50,                        //   multiplicateur par défaut
//     byType:    { "consumable": 0.75 },    //   override par type d'item
//     byRarity:  { "epic": 0.75 },          //   override par rareté
//     bySlot:    { "body": 0.75 }           //   override par slot d'équipement
//   },
//   specialAction: {                        // optionnel : action unique (1×/visite d'étage)
//     type:  "heal_and_revive",             //   dispatché par triggerNpcSpecialAction
//     label: "✨ Recevoir les larmes du phénix"
//   },
//   questsGiven:    ["quest_id", ...],     // quêtes que ce PNJ propose
//   questsTurnedIn: ["quest_id", ...],     // quêtes que ce PNJ clôt (souvent === questsGiven)
//   dialogues: {
//     greeting:    "1ère rencontre",
//     idle:        "Visites suivantes (texte fixe)",
//     idleRandom:  ["...","..."],           // optionnel : pioche random
//                                           //   à chaque visite (PNJ lore)
//     contextualLore: [                     // optionnel : override `idle` par
//       { monsterIds: ["bellatrix"], text: "..." }   // tirage contextuel selon
//     ],                                    //   les monstres tirables à l'étage
//     questOffer:  "Quête disponible non prise",
//     questActive: "Quête prise mais objectif non rempli",
//     questReady:  "Objectif rempli, à rendre",
//     questDone:   "Quête déjà rendue"
//   }
// }

const NPCS = [];

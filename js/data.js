// ============================================================
// CONSTANTES DE CARTE
// ============================================================
const MAP_W = 12, MAP_H = 12;
const CELL = { WALL:0, FLOOR:1, DOOR:2, STAIRS_D:3, STAIRS_U:4, SHOP:5, CHEST:6 };

// ============================================================
// DONNÉES DU JEU
// ============================================================
const CHARACTERS = {
  harry: { name:"Harry Potter", icon:"🧙", class:"Élève de Gryffondor",
    hp:35, sp:22, str:9, int:11, agi:12, end:10, lck:15, mag:10,
    wand:"Baguette de Houx", armor:"Robe de Gryffondor", acc:"Lunettes Rondes"
  },
  hermione: { name:"Hermione Granger", icon:"🧙‍♀️", class:"Élève de Gryffondor",
    hp:28, sp:35, str:6, int:17, agi:10, end:7, lck:12, mag:16,
    wand:"Baguette de Vigne", armor:"Robe de Gryffondor", acc:""
  }
};

// Les ennemis sont définis dans js/monsters.js (MONSTERS)
// ENEMIES est un alias pour la compatibilité du code existant
const ENEMIES = MONSTERS;

const SPELLS = [
  { name:"Expelliarmus", icon:"✨", desc:"Désarme l'ennemi (-3 ATK)", cost:4, effect:"disarm", power:3 },
  { name:"Stupefix", icon:"⚡", desc:"Étourdit l'ennemi (8 dégâts)", cost:6, effect:"stun", power:8 },
  { name:"Episkey", icon:"💚", desc:"Soigne légèrement (12 PV)", cost:5, effect:"heal", power:12 },
  { name:"Protego", icon:"🛡️", desc:"Bouclier magique (+5 DEF, 2 tours)", cost:5, effect:"shield", power:5 },
  { name:"Incendio", icon:"🔥", desc:"Flammes magiques (14 dégâts)", cost:8, effect:"burn", power:14 },
  { name:"Accio", icon:"🌀", desc:"Tire un objet ennemi (+or)", cost:6, effect:"steal", power:0 },
  { name:"Avada...", icon:"💚✨", desc:"Sort interdit (50 dégâts)", cost:20, effect:"instant", power:50, locked:true },
];

const ITEMS = [
  { id:"potion_s", name:"Potion de Soin", icon:"🧪", desc:"+15 PV", type:"consumable", effect:"heal", power:15, price:30 },
  { id:"potion_m", name:"Potion Magique", icon:"💜", desc:"+12 PM", type:"consumable", effect:"restore_sp", power:12, price:25 },
  { id:"felix", name:"Félix Felicis", icon:"✨", desc:"+20 PV +10 PM", type:"consumable", effect:"both", power:20, price:80 },
  { id:"mandragore", name:"Racine de Mandragore", icon:"🌿", desc:"+8 PV", type:"consumable", effect:"heal", power:8, price:15 },
  { id:"wand1",   name:"Baguette de Saule",   icon:"🪄", desc:"ATK+2",          type:"wand",  power:2, bonusAtk:2,                    price:120 },
  { id:"wand2",   name:"Baguette de Sureau",  icon:"🪄", desc:"ATK+5 MAG+3",    type:"wand",  power:5, bonusAtk:5, bonusMag:3,           price:300 },
  { id:"robe1",   name:"Robe Renforcée",      icon:"🧥", desc:"DEF+3",          type:"armor", power:3, bonusDef:3,                        price:150 },
  { id:"amulette",name:"Amulette du Phénix",  icon:"💎", desc:"MAG+4 LCK+3",   type:"acc",   power:4, bonusMag:4, bonusLck:3,           price:250 },
  { id:"broom",   name:"Balai Nimbus 2000",   icon:"🧹", desc:"Fuite garantie", type:"acc",   power:0,                                   price:200 },
];

const SHOP_ITEMS = ["potion_s","potion_m","felix","wand1","robe1","amulette","broom","mandragore"];

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

// ============================================================
// ÉVÉNEMENTS D'ÉTAGE — enrichissement du donjon §4 (Phase 4)
// ============================================================
// Chaque étage a `FLOOR_EVENT_CHANCE` de porter un événement, tiré au
// sort (pondéré) lors de la génération. Les effets sont appliqués par
// `generateDungeon` (densité d'ennemis, coffres, boutique, pièges) ;
// l'id courant est exposé via `currentFloorEvent` (state.js), persisté
// dans le save et le cache d'étage. `_announceFloorEvent` (movement.js)
// affiche un toast à l'entrée de l'étage.

const FLOOR_EVENTS = [
  { id: 'hante',  weight: 10, name: 'Étage hanté',
    desc: "Une présence oppressante règne — les créatures pullulent sur cet étage." },
  { id: 'calme',  weight: 8,  name: 'Quiétude',
    desc: "Un calme inhabituel flotte dans les couloirs : peu de créatures rôdent ici." },
  { id: 'marche', weight: 7,  name: 'Marché ambulant',
    desc: "Des colporteurs ont dressé une échoppe — une boutique de plus sur cet étage." },
  { id: 'tresor', weight: 7,  name: 'Veine de trésors',
    desc: "Cet étage recèle plus de coffres qu'à l'accoutumée." },
  { id: 'pieges', weight: 8,  name: 'Étage piégé',
    desc: "Le sol est truffé de mécanismes anciens. Redoublez de prudence." },
  { id: 'runique', weight: 6, name: 'Étage runique',
    desc: "Une magie ancienne sature les murs : une énigme garde un trésor — et le récompense au double." },
];

const FLOOR_EVENT_CHANCE = 0.35;

// Tire l'événement d'un étage : null (la majorité du temps) ou un id
// pondéré parmi FLOOR_EVENTS. Appelé par generateDungeon.
function rollFloorEvent() {
  if (Math.random() >= FLOOR_EVENT_CHANCE) return null;
  const total = FLOOR_EVENTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of FLOOR_EVENTS) {
    r -= e.weight;
    if (r <= 0) return e.id;
  }
  return FLOOR_EVENTS[FLOOR_EVENTS.length - 1].id;
}

// Définition d'un événement par id (pour le toast). null si id inconnu.
function getFloorEvent(id) {
  return FLOOR_EVENTS.find(e => e.id === id) || null;
}

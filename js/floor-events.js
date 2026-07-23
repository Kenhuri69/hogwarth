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

  // ── Événements gatés par étage (Ruines Anciennes / Boucle, ch.11 P1) ──
  // `minFloor`/`maxFloor` restreignent l'éligibilité ; rollFloorEvent(floor)
  // filtre le pool avant le tirage pondéré.
  { id: 'echo_temporel', weight: 6, minFloor: 12, name: 'Écho temporel',
    desc: "Le passé affleure ici : des scènes anciennes se rejouent dans la brume des Ruines." },
  { id: 'givre_ancien', weight: 7, minFloor: 14, name: 'Givre ancien',
    desc: "Un froid surnaturel sature les Ruines — les spectres y pullulent." },
  { id: 'sceau_fissure', weight: 6, minFloor: 14, name: 'Sceau fissuré',
    desc: "Une fêlure du sceau garde un trésor derrière une énigme — et le récompense au double." },
  { id: 'chambre_scellee', weight: 6, minFloor: 11, name: 'Chambre scellée',
    desc: "Un vestige des Fondateurs recèle plus de coffres scellés qu'à l'accoutumée." },
];

const FLOOR_EVENT_CHANCE = 0.35;

// Tire l'événement d'un étage : null (la majorité du temps) ou un id
// pondéré parmi FLOOR_EVENTS éligibles à l'étage `floor` (filtre
// minFloor/maxFloor). Appelé par generateDungeon avec l'étage courant.
function rollFloorEvent(floor) {
  if (dgRand() >= FLOOR_EVENT_CHANCE) return null;
  const f = (typeof floor === 'number' && isFinite(floor)) ? floor : 1;
  const pool = FLOOR_EVENTS.filter(e =>
    (e.minFloor === undefined || f >= e.minFloor) &&
    (e.maxFloor === undefined || f <= e.maxFloor));
  if (!pool.length) return null;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = dgRand() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e.id;
  }
  return pool[pool.length - 1].id;
}

// Définition d'un événement par id (pour le toast). null si id inconnu.
function getFloorEvent(id) {
  return FLOOR_EVENTS.find(e => e.id === id) || null;
}

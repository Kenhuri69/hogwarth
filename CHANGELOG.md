# Notes de version

Synthèse des changements fonctionnels visibles côté joueur.
Voir l'historique git pour le détail technique.

---

## 2026-05-12 — Phase 3 : Difficulté & Voix Dumbledore

Grosse itération autour de la progression et de l'ambiance audio.

### 🎮 Progression & personnalisation

- **3 points de stats libres à chaque niveau** — en plus du baseline
  existant (+1 ATK / DEF / MAG, +8 PV, +5 PM). Le joueur les répartit
  parmi 5 stats : STR (+1 ATK), INT (+1 MAG), AGI (+1 esquive),
  END (+5 PV max), LCK (+1 crit).
- **UX d'allocation dédiée** sur la fiche perso, avec badge ▲
  clignotant sur le bouton 📜 Fiche quand des points sont en attente.
- **Saves existantes prises en charge rétroactivement** : un perso
  niveau N d'une partie ancienne reçoit `(N − 1) × 3` points à
  allouer à l'ouverture de la fiche.

### 🧙 Chaîne de quêtes Dumbledore (5 paliers)

Un fil narratif structurant l'aventure, du tutoriel à la confrontation
finale. Dumbledore reste accessible à l'étage 1 — le joueur revient
le voir entre chaque palier.

| # | Quête | Étage cible | Récompense clé |
|---|-------|-------------|----------------|
| 1 | `intro_tutoriel` | descendre étage 2 | +5 PV +1 ATK/DEF/MAG |
| 2 | `dumbledore_eveil` | étage 3, Épouvantard | +5 PV +1 LCK + Wingardium Leviosa |
| 3 | `dumbledore_courage` | étage 5, 2 Mangemorts | +10 PV +1 ATK/MAG + potion |
| 4 | `dumbledore_resistance` | étage 7, Mangemort d'élite | +10 PV +2 ATK/DEF + amulette |
| 5 | `dumbledore_revelation` | étage 10, Bellatrix | +20 PV +2 ATK/DEF/MAG/LCK |

Les quêtes s'enchaînent : la suivante n'apparaît qu'une fois la
précédente complétée. Les bonus de stats sont **permanents** et
s'accumulent à travers les futurs level-ups.

### 🗣️ Voix Dumbledore complète

Dumbledore parle désormais à chaque page de dialogue de sa chaîne
d'épreuves, en plus de l'intro initiale.

- **15 nouveaux samples audio** générés via ElevenLabs (voix « My
  Dumbledore » custom, modèle `eleven_v3`).
- 3 moments narratifs par quête : proposition · encouragement /
  mise en garde · récompense.
- Ducking de la musique pendant la voix, stop propre à la fermeture
  du dialogue.
- ~1.1 MB cumulés pour 17 OGG (intro + 15 chaîne).

### ⚔️ Combat & exploration

- **Respawn 20 %** : à chaque retour sur un étage déjà visité, les
  cellules où le joueur a tué un ennemi ont 20 % de chance de
  re-peupler. Permet le farming d'XP, d'or et de drops.
- **6 nouveaux équipements mid-game** (étages 3-7), pour combler les
  slots peu fournis : Gants du Duelliste, Casque d'Auror, Ceinture
  de Force, Anneau du Courage, Bottes du Silence, Talisman du
  Tacticien. Drops sur monstres élite + boutique progressive.
- **2 nouvelles potions ++** disponibles en boutique à partir de
  l'étage 5 : Grande Potion de Soin (+40 PV, 80 g) et Grande Potion
  Magique (+30 PM, 70 g).

### 🐛 Corrections

- Layout mobile du panneau d'allocation de points : le 5ᵉ bouton
  (LCK) n'est plus coupé à droite sur écrans ≤ 700 px (wrap auto en
  3 lignes).
- Migration des anciennes sauvegardes : les points de stats à
  allouer rétroactifs sont désormais bien crédités même quand un
  champ de save legacy était initialisé à 0 par un démarrage de
  nouvelle partie précédent.

### 🛠️ Outils & analyse (interne)

- Étude de la difficulté Normal documentée dans
  [`DIFFICULTY_REPORT.md`](DIFFICULTY_REPORT.md), avec tableaux
  joueur/ennemi par étage et fenêtres de difficulté identifiées.
- Simulateur Monte Carlo `tools/sim-difficulty.js` (CLI :
  `--hp-mult`, `--xp-mult`, `--stat-points`, `--build`,
  `--compare`) — pour itérer sur la balance avant d'implémenter.

# Plan — Finalisation chapitres 04 (Actes & étages) & 10 (Lieux & ambiance)

**Branche :** `claude/hogwarth-chapters-04-10-l49flu`
**Statut :** 🟩 Étape 1 livrée (chapitres 04 & 10 réécrits) · Étape 2 spécifiée (§ ci-dessous)
**Nature :** changement **documentaire** (Markdown `docs/histoire/`). Aucun
JS/CSS servi au navigateur n'est touché → **pas de bump cache PWA** (guidelines §8
non applicable). Smoke test non requis (guidelines §7 — changement purement doc),
mais on le lance en garde-fou car les fichiers vivent dans le repo de jeu.

---

## Objectif

1. **Chapitre 04** — aligner la structure actes/étages avec **tous** les ajouts
   récents : déclencheur Clé de Voûte, fil rouge Éclats, quêtes signature de
   Maison (§07/§08), familles du bestiaire (§09), PNJ-jalons (§06), thèmes
   (froid, peur-sceau, voix des Fondateurs), personnages jouables (§05).
2. **Chapitre 10** — passer d'une description **par zone** à une description
   **par étage** : fiches sensorielles immersives (visuel/son/odeur/température/
   émotion), lieux emblématiques, variantes par Maison, hooks gameplay/narratifs.
3. **Étape 2** (ce fichier, §Implémentation) — plan concret d'implémentation
   technique des systèmes d'ambiance (données, variables, intégration procédurale).

## Cohérence à respecter (sources)

| Élément | Source canon |
|---------|--------------|
| Déclencheur Clé de Voûte | 03 §3.1, plan `clef-de-voute-implementation.md` |
| Tranches A/B/C/D | `js/floor-themes.js`, 02 §2.2, 04 §intro |
| Fil rouge Éclats | 03 §3.1, 08 §8.6.1 (Peeves 1-3 / Loup 4-6 / Mangemort Élite 7-10) |
| Voix des Fondateurs | 08 §8.6.2 (stèle / Salazar / Codex / portrait Dumbledore) |
| Quêtes signature | 07 §7.8, 08 §8.5 (Étendard / Pacte / Codex / Refuge) |
| Familles bestiaire | 09 §9.3–9.7 (F1 école → F5 gardiens anciens) |
| PNJ par étage | 06 (Pomfresh 2, Hagrid 4, Kingsley 8, Bill 9, Sirius 10, Gardien 11…) |
| Thèmes | 01 §1.7 (peur-sceau / choix / mythe), 02 §2.4 (ton par tranche) |

## Étapes (Étape 1 — rédaction)

1. ✅ Lire 02/03/04/10 + extraire 01/06/07/08/09 (Explore) + vérifier code
   (`floor-themes.js`, `LOCATIONS`, `NARRATIVES`, transitions).
2. ✅ Rédiger plan (ce fichier).
3. ✅ Réécrire **04** — actes, table signature/Éclats/bestiaire par acte,
   règles de progression & rejouabilité. → vérif : chaque ajout récent cité.
4. ✅ Réécrire **10** — intro corruption-géographie, fiches par étage (1→14+),
   tables synthèse, variantes Maison, lieux-signatures. → vérif : chaque étage
   a un bloc sensoriel 5 axes + hooks.
5. ✅ Relire pour cohérence croisée (liens §, IDs, noms canon FR).
6. ✅ Smoke test garde-fou + commit + push.

## Critères de vérification (Étape 1)

- [x] 04 cite : Clé de Voûte, Éclats (3 jalons), 4 quêtes signature, F1-F5,
      voix des Fondateurs, froid/peur, personnages jouables.
- [x] 10 a une fiche par étage 1→13 + zone D, chacune avec les 5 axes sensoriels.
- [x] Variantes par Maison présentes (≥ 1 par zone).
- [x] Aucun lien cassé ; markdown valide ; style 💡/✅/❓ conservé.
- [x] `node tests/units.js` (helpers purs, rapide) reste vert — non-régression doc.

---

## Étape 2 — Plan d'implémentation technique (ambiance & lieux)

> Cette section est le **livrable Étape 2**. Elle propose comment rendre
> *jouable* l'ambiance décrite au chapitre 10, sans casser le procédural ni la
> philosophie zéro-dépendance / zéro-build. Tout est **💡 proposition** sauf
> mention ✅ (déjà en jeu).

### A. État des lieux du code (✅ existant)

| Système | Fichier | Rôle actuel |
|---------|---------|-------------|
| Tranches/thèmes | `js/floor-themes.js` | `FLOOR_THEMES` + `getFloorTheme(f)` : tileset + `ambient` par tranche. Source unique. |
| Descriptions d'ambiance | `js/data.js` `NARRATIVES.floor[]` | 8 phrases d'ambiance **plates** (non zonées) tirées au hasard. |
| Lieux nommés | `js/data.js` `LOCATIONS[]` | 11 étiquettes distribuées par génération. |
| Transitions de tranche | `js/movement-floors.js` `_maybePlayTierTransition` | Fondu + toast aux frontières 3↔4 / 6↔7 / 13↔14. |
| Toasts de grind | `js/movement-floors.js` `_announceRespawn` | Verbalise la densité au farming (`floorKillCount`). |
| Musique zonée | `js/audio-music.js` `_zoneKeyForFloor` | Lit `getFloorTheme(f).ambient`. |

> **Constat clé** : le moteur a déjà la **colonne vertébrale d'ambiance**
> (thème zoné + transitions + toasts). Le manque est la **granularité par
> étage** et les **variantes par Maison**. On enrichit, on ne reconstruit pas.

### B. Structure de données proposée (💡)

#### B.1 — Descriptions zonées (priorité 1, faible risque)

Remplacer le tableau plat `NARRATIVES.floor` par une **résolution zonée**, sans
casser l'API (`NARRATIVES.floor` reste un fallback) :

```js
// js/floor-ambiance.js (NOUVEAU module pur, chargé après floor-themes.js)
const ZONE_AMBIANCE = {
  hogwarts: {                       // clé = thème de floor-themes.js (réutilise la source unique)
    floorLines: [ "Les torches de l'école brûlent encore, mais leur halo a froidi.", … ],
    smell:  [ "parchemin", "cire des bougies", "un fond de givre inexplicable" ],
    sound:  [ "un portrait qui chuchote", "le grincement d'un escalier lointain" ],
    temp:   "fraîche",              // ressenti thermique (mot-clé → CSS teinte/HUD)
  },
  dungeons: { … },                  // pierre froide, écho carcéral, eau qui suinte
  depths:   { … },                  // roche brute, silence minéral, souffle d'abîme
  ancient:  { … },                  // runes qui résonnent, froid surnaturel, hors-temps
};
// getFloorAmbiance(floor) → pur, lit getFloorTheme(floor) puis ZONE_AMBIANCE[theme]
```

- **Pur, sans état** (comme `getFloorTheme`) → testable en `tests/units.js`.
- **Au MANIFEST loader** (`getFloorAmbiance`, `ZONE_AMBIANCE`) — `kind:'fn'/'obj'`.
- Consommé par `movement.js` (à l'entrée de cellule vide) à la place de
  `NARRATIVES.floor[rand]` : `const a = getFloorAmbiance(currentFloor)`.

#### B.2 — Niveau de corruption (💡 stat d'ambiance dérivée, priorité 2)

Le déclencheur (Clé de Voûte fêlée) = la corruption **augmente avec la
profondeur**. On en fait une **valeur dérivée pure** (pas un nouvel état à
sérialiser) pour piloter l'intensité visuelle/sonore :

```js
// floor-ambiance.js — pur
function corruptionLevel(floor, victoryAchieved) {
  // 0.0 (étage 1) → 1.0 (étage 14+) ; +palier en Boucle Ténébreuse
  let c = Math.min(1, (floor - 1) / 13);
  if (victoryAchieved && floor >= 11) c = Math.min(1.3, c + 0.3);
  return c;
}
```

- **Aucune sérialisation** : recalculé depuis `currentFloor` + `victoryAchieved`
  (déjà persistés). Zéro migration de save.
- Pilote : densité du givre (overlay CSS), opacité du fog (déjà dans
  `renderer.js`), choix des phrases d'ambiance (index biaisé vers les variantes
  sombres quand `c` monte), volume des nappes sonores.

#### B.3 — Variantes par Maison (💡 priorité 3, cosmétique)

Modificateur d'ambiance **léger et défensif** (jamais de branchement de
génération dur) :

```js
// floor-ambiance.js — pur, lit chosenHouse (state.js)
const HOUSE_AMBIANCE_MOD = {
  Serpentard:  { extraLine: "Une pierre descellée laisse deviner un passage que d'autres n'ont pas vu.", flavor: "secret" },
  Gryffondor:  { extraLine: "Une marque de bataille — quelqu'un a tenu ici, et n'a pas fui.",            flavor: "valor"  },
  Serdaigle:   { extraLine: "Une glyphe à demi effacée attend un œil qui sait lire.",                    flavor: "lore"   },
  Poufsouffle: { extraLine: "Un recoin abrité — on pourrait y reprendre souffle, ensemble.",             flavor: "refuge" },
};
function houseAmbianceLine(chosenHouse) { return HOUSE_AMBIANCE_MOD[chosenHouse]?.extraLine ?? null; }
```

- **Cosmétique pur** : ajoute *une* ligne d'ambiance occasionnelle (~1 entrée
  d'étage sur 4) selon `chosenHouse`. **Ne modifie pas** la carte générée en V1
  (promesse procédurale intacte). Un V2 *pourrait* biaiser `dungeon.js`
  (densité coffres Serpentard / cellules combat Gryffondor) — **hors-scope V1**,
  noté ❓ au chapitre 10.

### C. Intégration procédurale (💡)

- **Point d'injection unique** : `handleCellEntry()` / le rendu d'ambiance de
  cellule vide dans `movement.js`. On y appelle `getFloorAmbiance` +
  `houseAmbianceLine` au lieu du tirage plat. **Surgical** : un seul call-site.
- **Étages-scènes (❓ à arbitrer, cf. 04 §4.4 / 10 §10.5)** : si on formalise
  des beats écrits garantis (étage 1, 4, 11), prévoir un dict
  `FLOOR_SCRIPTED_BEATS = { 1: {...}, 4: {...}, 11: {...} }` lu à la **première
  entrée** d'un étage (flag `seenScriptedBeat:Set` sérialisé). Optionnel,
  n'altère pas la génération autour du point fixe.

### D. Système d'ambiance audiovisuel (💡)

| Couche | Existant ✅ | Ajout proposé 💡 |
|--------|-------------|------------------|
| Musique | `_zoneKeyForFloor` lit `ambient` | Rien à faire — déjà zoné. Réserver samples `tension`/`abyss` (déjà prévus). |
| Fog 3D | `renderer.js` overlay `rgba(6,4,2,α)` | Indexer `α` max sur `corruptionLevel(floor)` (teinte plus froide/bleutée en zone D). |
| Givre | — | Overlay CSS `#frost-overlay` (vignette blanche-bleutée), opacité = `corruptionLevel`. S'intensifie en profondeur ; pic lors du déclencheur/boss. |
| Texte | `NARRATIVES.floor` plat | `getFloorAmbiance` zoné (B.1) + ligne Maison (B.3). |
| Transitions | toasts 3↔4/6↔7/13↔14 | Toast **13↔14 solennel dédié** (04 §4.5) — texte long « voix des Ruines ». |

### E. Priorisation (ce qui garde le jeu jouable d'abord)

1. **P1 — Descriptions zonées** (B.1) : valeur immersive immédiate, risque nul
   (fallback conservé), testable unitairement. **À faire en premier.**
2. **P2 — `corruptionLevel` + fog indexé + givre CSS** (B.2, D) : le « ressenti
   physique de la descente » demandé. Cosmétique, défensif.
3. **P3 — Ligne d'ambiance par Maison** (B.3) : rejouabilité légère.
4. **P4 — Toast 13↔14 dédié** (D) : un texte, faible coût, fort impact.
5. **P5 (❓ optionnel) — Étages-scènes fixes** (C) : à arbitrer (promesse
   procédural). Plus gros, à isoler dans son propre plan si retenu.

### F. Tests & garde-fous

- `tests/units.js` : ajouter cas purs `getFloorAmbiance(f)` (zone correcte par
  frontière 3/4/6/7/13/14), `corruptionLevel` monotone croissant + cap Boucle,
  `houseAmbianceLine` (null si pas de Maison).
- `tests/smoke.js` : scénario `scenarioFloorAmbiance` — entrer sur étages de
  zones différentes, vérifier qu'une ligne d'ambiance non vide s'affiche et
  varie par zone.
- **Cache PWA** : tout nouveau `js/floor-ambiance.js` + `css/frost.css` →
  bump `?v` + `CACHE_VERSION` + ajout `PRECACHE_URLS` (skill `cache-bump`) au
  moment de l'implémentation réelle (pas dans ce commit doc).

### G. Suggestions d'assets

- **Texte** : ~6-8 phrases d'ambiance par zone (4 zones) + 4 lignes Maison +
  1 toast solennel 13↔14. Rédigés au chapitre 10 (réutilisables tels quels).
- **Visuel** : `#frost-overlay` (CSS pur, pas d'image) ; teinte de fog par zone
  (constantes). Optionnel : 1 vignette givre PNG si le CSS ne suffit pas.
- **Audio** : réutiliser samples `ambient` existants ; activer `tension`
  (zone B sous pression) / `abyss` (zone D) déjà réservés.

---

## Journal des écarts

### Implémentation Etape 2 (2026-06-08, branche claude/ambiance-floor-system)

**P1 - Descriptions d'ambiance zonees :** livré.
- Nouveau module `js/floor-ambiance.js` : ZONE_AMBIANCE (4 zones x 6 phrases + smell/sound/temp), getFloorAmbiance(floor) pur.
- `js/movement.js` : call-site remplacé — tirage zoné via getFloorAmbiance, fallback NARRATIVES.floor conservé si module absent.
- Ligne de Maison cosmétique ajoutée (~25 % des entrées de cellule).

**P2 - Niveau de corruption + givre :** livré.
- corruptionLevel(floor, victoryAchieved) pur dans floor-ambiance.js.
- css/frost.css + frost-overlay div dans index.html.
- _applyCorruptionAmbiance(floor) appelée dans _changeFloor (movement-floors.js).

**P3 - Ligne d'ambiance par Maison :** livré (intégré dans P1).
- HOUSE_AMBIANCE_MOD + houseAmbianceLine(chosenHouse) dans floor-ambiance.js.
- Fréquence ~25 % aléatoire, purement cosmétique.

**P4 - Toast solennel 13->14 :** livré.
- Dans _maybePlayTierTransition (movement-floors.js) : toast dédié zone D.

**P5 - Etages-scènes fixes :** non implémenté (arbitrage produit requis, noté en plan §C).

**Enregistrements :**
- Loader MANIFEST : 4 nouvelles entrées (ZONE_AMBIANCE, getFloorAmbiance, corruptionLevel, houseAmbianceLine).
- Cache PWA : CACHE_VERSION -> hogwarth-v78, 5 assets bumpés + 2 nouveaux dans PRECACHE_URLS.
- tests/units.js : 40 assertions ajoutées (section 5).

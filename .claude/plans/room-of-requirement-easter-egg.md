# Plan — Easter egg « La Salle sur Demande »

> Statut : **en cours d'implémentation** (branche `claude/plan-launch-jq2EA`).
> 3ᵉ easter egg pressenti du jeu
> (après l'arc Manon livré et le plan « Chasse Sans Tête »). Registre :
> **émerveillement / utilité**. Canon HP : la Salle sur Demande (Room of
> Requirement) apparaît quand on **passe trois fois devant le même pan de
> mur en pensant à ce dont on a besoin** ; elle devient ce qu'il faut.

## 1. Principe : easter egg sans quête (découverte par geste)

Contrairement à Manon (rumeur→pages→quête) et à la Chasse Sans Tête
(rumeur→PNJ→quête), celui-ci n'a **aucune entrée au journal** : c'est un
**déclencheur de mouvement** pur, conforme au canon.

```
(a) RUMEUR                  (b) GESTE                    (c) RÉCOMPENSE
Sir Nicolas (lore) :     →  passer 3× devant le même  →  une porte se dessine ;
« La Salle sur Demande      pan de mur (tuile de         la Salle devient un
change selon le besoin.     déclenchement, par étage)    REFUGE (1×/étage) +,
Certains la trouvent. »                                  la 1ʳᵉ fois, un OBJET
PAS de quête                                             UNIQUE
```

- **(a) Rumeur (couche egg).** Sir Nicolas a **déjà** la réplique
  `idleRandom` : *« La Salle Sur Demande change selon le besoin. Certains
  la trouvent. D'autres y restent. »* On l'épaissit d'un indice sur le
  **geste** (« il paraît qu'il faut passer trois fois devant le bon mur,
  en y pensant très fort »). Aucune position donnée.
- **(b) Geste.** Chaque étage porte une **tuile de déclenchement** (case
  marchable longeant un pan de mur « propice », posée à la génération,
  seedée par étage). Y **repasser 3 fois** (3 entrées distinctes) fait
  apparaître une porte : le mur adjacent devient une case `REQUIREMENT`
  pénétrable. Narratif + son de révélation (réemploi `playChestOpen`).
- **(c) Récompense.** Entrer dans la case `REQUIREMENT` ouvre un overlay
  d'exploration dédié : la Salle **devient ce dont le groupe a besoin** —
  un **refuge** qui restaure (1 usage par visite d'étage, modèle
  `usedFountains`). **La toute première fois de la partie**, elle recèle
  aussi un **objet unique** (cf. §3, à arbitrer).

## 2. Architecture — réemploi maximal des systèmes existants

Deux précédents couvrent ~tout le besoin :
- **Mur secret** (`secretWalls: Set<"x,y">`, révélé par fouille →
  `dungeon[y][x] = CELL.FLOOR`, `movement-interactions.js`). On calque le
  **stockage + révélation**, mais le déclencheur n'est plus la fouille :
  c'est le comptage de passages.
- **Fontaine** (`CELL.FOUNTAIN`, `useFountain()`, `usedFountains` 1×/étage,
  reset à l'entrée d'étage, overlay `_showExploreOverlay`). On calque le
  **refuge 1×/étage** et l'overlay d'interaction.

### Nouvelle cellule
`CELL.REQUIREMENT = 15` (prochain libre après `STELE:14`). Marchable, ouvre
un overlay à l'entrée (comme `FOUNTAIN`). Sprite de couloir + marqueur
minimap dédiés (réemploi du pipeline `drawFountainSprite`/`.map-fountain`).

### État (state.js, sérialisé)
| Variable | Rôle |
|----------|------|
| `requirementWalls: Map<floor,"wx,wy">` | mur « propice » posé par étage (révélé ou non) |
| `requirementTrigger: Map<floor,"tx,ty">` | tuile de déclenchement (case marchable devant le mur) |
| `requirementPaces: Map<floor,int>` | nombre de passages comptés sur la tuile de l'étage |
| `requirementRevealed: Set<floor>` | étages dont la porte est ouverte (mur → REQUIREMENT) |
| `usedRequirementRooms: Set<"x,y">` | refuge déjà utilisé pour la visite d'étage (1×/étage, reset comme `usedFountains`) |
| `requirementGiftTaken` (bool) | objet unique déjà pris (une fois par partie) |

> `requirementWalls`/`requirementTrigger` sont déterministes (seed par
> étage, comme `_ensurePagePlacement`) → reproductibles, sérialisables, et
> cohérents au cache d'étage (`movement-floors.js`).

### Fonctions
| Fonction | Fichier | Rôle |
|----------|---------|------|
| `_ensureRequirementWall(floor)` | dungeon.js | pose mur+tuile déterministes (case WALL bordée d'une case marchable). Appelée comme `_ensurePagePlacement` |
| comptage de passages | movement.js (`_step`) | à l'entrée sur la tuile de déclenchement, `requirementPaces.set(floor, n+1)` **par entrée distincte** ; au 3ᵉ → révélation |
| `_revealRequirementRoom(floor)` | movement-interactions.js | mur → `CELL.REQUIREMENT`, narratif, son, minimap |
| `useRequirementRoom()` | movement-interactions.js | overlay : refuge (1×/étage via `usedRequirementRooms`) + objet unique si `!requirementGiftTaken` |

### Détection du « passage » (anti-triche)
Compter **les entrées distinctes** sur la tuile (transition d'une autre
case → la tuile), pas le piétinement. Garde-fou : ne pas recompter si la
case précédente était déjà la tuile (déjà géré par la logique d'entrée de
`_step`). 3 entrées suffisent (canon « trois fois »).

## 3. Décisions actées (✅ arbitrées le 2026-06-06)

| Sujet | Décision retenue |
|-------|------------------|
| **Objet unique** | ✅ **(a)** item unique `tiare_poussiereuse`, slot `head`, rareté `rare`, bonus **modeste non-méta** : `bonusMag:2, bonusLck:1` (clin d'œil au Diadème caché, sans empiéter sur `diademe_serdaigle` légendaire). `price:0` (non vendable). Une seule fois par partie. |
| **Refuge — effet exact** | ✅ **Repos sûr + petit buff temporaire** (≠ fontaine qui restaure 100 %). Repos : `+40 %` PV/PM (`REQUIREMENT_REST_FRAC=0.40`) par membre vivant. Buff « Confort de la Salle » : `requirementBuffSteps=20` pas (`REQUIREMENT_BUFF_STEPS`), `+1 PV / +1 PM` par pas hors combat tant que `>0`. 1×/visite d'étage. |
| **Gating d'étage** | ✅ **Partout** (la Salle s'adapte à chaque étage), objet unique **une seule fois** par partie. |
| **Indice de localisation** | ✅ **Aucun** (pur geste, fidélité canon). |
| **Définition du « passage »** | ✅ Entrée sur la tuile de déclenchement, 3 entrées distinctes (chaque `_step` qui atterrit sur la tuile = entrée distincte, le piétinement est impossible car `_step` change toujours de case). |

## 4. Couche rumeurs (découverte sans journal)

- **Sir Nicolas** (`idleRandom`, déjà présent) : ligne existante + 1 ligne
  d'indice sur le **geste** (trois passages, « en y pensant »). Aucune
  position. Réemploi strict du pool `idleRandom` (pas de greffe spéciale
  nécessaire — la ligne vit dans son tableau).
- Optionnel V2 : un autre fantôme (Moine Gras) évoque la Salle.

## 5. Découpage en phases (verify)

1. **Cellule & état** — `CELL.REQUIREMENT` ; structures d'état + reset
   `startGame` + sérialisation (save.js, movement-floors cache).
   → verify : round-trip save conserve `requirementPaces`/`revealed`/
   `requirementGiftTaken`.
2. **Génération** — `_ensureRequirementWall(floor)` (mur + tuile seedés,
   case WALL bordée d'une case marchable libre).
   → verify : chaque étage a un couple mur/tuile valides ; déterministe.
3. **Déclencheur** — comptage des passages dans `_step` ; au 3ᵉ →
   `_revealRequirementRoom` (mur → REQUIREMENT, narratif, minimap).
   → verify : 1er et 2e passage = rien ; 3e = porte ; pas de recomptage en
   piétinant.
4. **Refuge & objet** — `useRequirementRoom()` (overlay, restore 1×/étage
   via `usedRequirementRooms`, objet unique si `!requirementGiftTaken`) ;
   sprite couloir + marqueur minimap.
   → verify : refuge réutilisable 1×/étage (re-tari au retour) ; objet
   donné une seule fois sur toute la partie.
5. **Rumeur & rendu** — ligne d'indice Sir Nicolas ; sprite/minimap.
   → verify : indice présent dans son pool ; rendu non cassé.
6. **Smoke** — `scenarioRoomOfRequirement` : pose mur/tuile, simule 3
   passages → porte, entre → refuge (1×) + objet unique (1×/partie), save.
   → verify : `node tests/smoke.js` vert.

## 6. Hors-scope V1
- Salle « à thème » multiple (salle aux objets cachés / salle d'entraînement) :
  un seul comportement (refuge + objet) en V1.
- Cue 3D élaboré (réemploi sprite type fontaine suffit).
- Persistance inter-parties de l'objet unique (reset par partie comme le
  reste de l'état).

## Suivi
- [x] Concept retenu par l'utilisateur (à développer en plan).
- [x] §3 — décisions arbitrées (2026-06-06) : Tiare poussiéreuse (head, MAG+2/LCK+1),
      refuge = repos +40 % PV/PM + buff de Confort 20 pas, gating partout, aucun indice.
- [x] Phase 1 — cellule `CELL.REQUIREMENT=16`, constantes (`REQUIREMENT_REST_FRAC`,
      `REQUIREMENT_BUFF_STEPS`), item `tiare_poussiereuse`, état (state.js),
      sérialisation (save.js), reset `startGame` (main.js). → verify : round-trip OK.
- [x] Phase 2 — `_ensureRequirementWall(floor)` (dungeon.js, seed `floor*7919`),
      reset `usedRequirementRooms` (génération + cache restore). → verify : couple
      WALL/FLOOR adjacent valide sur 8 étages (test T2).
- [x] Phase 3 — comptage des passages + buff dans `_step` (movement.js) ;
      overlay descriptor + `handleCellEntry`. → verify : 1er/2e = rien, 3e = porte (T3).
- [x] Phase 4 — `_revealRequirementRoom` + `useRequirementRoom` (movement-interactions.js) ;
      sprite 3D `drawRequirementSprite` + dispatch renderer ; minimap `.map-requirement`.
      → verify : refuge 1×/étage, objet unique 1×/partie (T4) ; buff régén/décompte (T5).
- [x] Phase 5 — ligne d'indice Sir Nicolas (npcs.js idleRandom) ; icône item
      (réemploi circlet dans `ITEM_ICON_REGISTRY`). → verify : couverture icônes 141/141.
- [x] Phase 6 — `scenarioRoomOfRequirement` (tests/scenarios/dungeon.js, 6 sous-tests).
      → verify : `node tests/smoke.js` vert (160 scénarios) + `node tests/units.js` vert.

## Écarts / décisions d'implémentation
- **Icône de l'objet** : pas de PNG painterly dédié généré (pipeline Python
  hors-scope V1) — réemploi du visuel `circlet_serdaigle.png` dans le registre
  legacy (précédent : `diademe_antique`). Le `tint` doré différencie. Suivi
  possible : recette `icon_factory.py` dédiée plus tard.
- **Sprite 3D** : emoji 🚪 + halo doré (pas de SCENE_ICON SVG), conforme au
  §6 hors-scope (« réemploi sprite type fontaine suffit »).
- **Loader MANIFEST** : fonctions non ajoutées (précédent `useFountain`/
  `useAltar` absents du manifeste).

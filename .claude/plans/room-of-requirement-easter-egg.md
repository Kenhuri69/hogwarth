# Plan — Easter egg « La Salle sur Demande »

> Statut : **proposition** (non implémenté). 3ᵉ easter egg pressenti du jeu
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

## 3. Décisions à acter (⚠️ avant implémentation)

| Sujet | Options / proposition |
|-------|------------------------|
| **Objet unique** | (a) **nouveau trinket cosmétique-léger** dédié (ex. « Tiare poussiéreuse » — clin d'œil au Diadème caché, sans empiéter sur `diademe_serdaigle` légendaire) ; (b) un **stock de consommables** (potions) ; (c) rien (refuge seul). → **proposition : (a)**, item unique `tiare_poussiereuse`, slot `head`, bonus modeste (à définir) ou purement cosmétique pour rester non-méta |
| **Refuge — effet exact** | restaure 100 % PV+PM (calqué fontaine) **ou** repos sûr + petit buff temporaire. → **proposition : 100 % PV+PM**, 1×/étage |
| **Gating d'étage** | partout (la Salle s'adapte à chaque étage) **ou** à partir d'un étage (canon : 7ᵉ). → **proposition : partout**, mais objet unique **une seule fois** par partie |
| **Indice de localisation** | aucun (pur geste) **ou** Revelio dévoile la tuile. → **proposition : aucun** (fidélité canon : c'est l'intention, pas la révélation) |
| **Définition du « passage »** | entrée sur la tuile de déclenchement, 3 entrées distinctes. → **acté** |

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
- [ ] §3 — décisions à arbitrer (objet unique, effet refuge, gating, indice).
- [ ] Phases 1-6 — à implémenter une fois le plan validé.
- [ ] Réserve : **dialogues/indices** (ligne Sir Nicolas, texte d'overlay de
      la Salle) à relire/valider avant implémentation.

# Plan — Manon Acte II : le grimoire de givre éparpillé

> Statut : **conception / discussion**. Aucune implémentation tant que la
> prémisse narrative (§1) n'est pas validée.

## 1. Prémisse narrative (à valider)

Suite directe de l'arc de Manon Aubin (PNJ étage 3, fille cachée de
Lupin). L'Acte I (`manon_secret` → `manon_pardon`) refermait la quête du
**père**. L'Acte II ouvre celle de la **mère**, Sandrine.

Proposition de prémisse :

> Dans la doublure de la malle de Sandrine, Manon n'a pas trouvé que la
> photographie : il y avait aussi un **grimoire déchiré**, pages
> arrachées et manquantes. C'était l'œuvre de sa mère — Sandrine était
> une sorcière douée pour la magie de givre. Mais Manon ne sait pas si
> ce grimoire est un vrai héritage ou une dernière mise en scène : sa
> mère a menti seize ans, alors **le vrai du faux**, elle ne sait plus.
> Lupin lui a appris **Revelio**, le charme qui dévoile ce qui est
> caché ; elle l'enseigne au héros pour l'aider à retrouver les pages.
> Sandrine, avant de mourir, les a dispersées et dissimulées par
> sortilège dans le château — comme elle avait cousu la photo dans la
> malle : *une vérité qu'il faut mériter de trouver.* Reconstituer le
> grimoire, c'est rendre à Manon la mère qu'elle n'a jamais connue —
> non la menteuse, mais la sorcière.

Cohérent avec le motif établi (« sa dernière ruse », « cousu la vérité
pour qu'elle bute dessus »). Le grimoire reconstitué = **Glacius
Tempête** (l'AoE la plus puissante du jeu, cf. `tools/sim-aoe.js` :
total ×3 de 78/93/129, en tête du classement).

**Points ouverts pour la discussion :**
- Sandrine n'a aujourd'hui aucune spécialité magique décrite. Lui
  attribuer le givre est une invention — OK ?
- L'épithète givre/froid colle au personnage (mère distante, froide par
  ses mensonges) — ou trop appuyé ?

## 2. Décisions déjà actées (échanges précédents)

| Sujet | Décision |
|-------|----------|
| Grimoire cible | Glacius Tempête (le plus puissant — sim-aoe.js) |
| Mécanisme pages | Reliques fixes **invisibles** ; sort hors-combat révèle la case (point vert) ; `fouiller` ramasse |
| Sort de révélation | **Revelio**, enseigné par une quête préambule de Manon |
| Nombre de pages | **5**, réparties étages **2 à 9** |
| Fusion | **Hébergée par Manon** (PNJ donneur), UI inspirée de la besace |

## 3. Structure des quêtes (Manon — Acte II)

Deux volets chaînés, après `manon_pardon` (`prereq`).

### 3a. Préambule — `manon_revelio` « Le vrai du faux »
- `prereq: "manon_pardon"`.
- Manon montre le grimoire déchiré, explique. Pour « accorder » le
  charme Revelio il lui faut un catalyseur de froid.
- Objectif : `kill` d'un monstre de givre proche de l'étage 3
  (candidat : `strangulot` ou `kappa_douves`) ×1.
- Récompense : `spell: "Revelio"` + `xp`/`gold`. Débloque `manon_grimoire`.
- Revelio est donc disponible **dès la fin du préambule**, avant le
  volet de collecte — c'est voulu.

### 3b. Collecte — `manon_grimoire` « Les pages de Sandrine »
- `prereq: "manon_revelio"`.
- Objectif : réunir les **5 pages** (suivi via `collectedPages`, cf.
  §5 — pas d'items qui encombrent le sac).
- `desc` indique les **étages porteurs** (2, 3, 5, 7, 9 — à arbitrer).
- Remise : parler à Manon avec les 5 pages → ouvre l'**établi de
  fusion** (§6) → grimoire `livre_glacius_tempete` recréé.
- Récompense : `item: "livre_glacius_tempete"` + `xp`/`gold` (+ stats ?).

## 4. Sort Revelio (hors combat)

- `data.js — SPELLS` : nouvelle entrée
  `{ name:"Revelio", effect:"reveal", cost:~6, element:"lumière",
     icon:"🔎", desc:"Dévoile une page dissimulée à l'étage courant." }`.
  Non offensif, `locked` non requis (acquis par quête).
- `inventory.js` :
  - `isOutOfCombatSpell` → ajouter `effect === 'reveal'`.
  - `SPELL_OOC_HANDLERS.reveal` → handler : débite le PM, cherche une
    page **non collectée** à l'étage courant ; si trouvée → l'ajoute à
    `revealedPages`, marqueur vert minimap, message ; sinon « Revelio ne
    dévoile rien ici. » (PM non débité si rien — à trancher).
- Revelio est **inopérant en combat** (`castSpellInBattle` ignore
  `effect:"reveal"` — message « ... qu'hors combat »).

## 5. Pages dans le donjon

Approche **sans nouveau type de cellule** (plus chirurgical que
`CELL.PAGE` ; précédent : `npcPlacements`) :

| Élément | Détail |
|---------|--------|
| `pagePlacements` | `Map<floor, {x,y}>` — position déterministe (seed par étage), sur les 5 étages porteurs |
| `revealedPages` | `Set` de clés `"floor:x,y"` — pages rendues visibles par Revelio |
| `collectedPages` | `Set` des étages dont la page est ramassée (taille = progression quête) |
| Révélation | Revelio (§4) ajoute à `revealedPages` |
| Visuel | Point **vert** sur la minimap à la case révélée. Cue 3D : hors-scope V1 (minimap suffit) ou halo léger — à trancher |
| Ramassage | `movement.js — searchRoom()` : si la case courante == page révélée non collectée → ajoute à `collectedPages`, son `playChestOpen`, message, `checkPageQuest()` |
| Garde | Pages actives uniquement si `manon_revelio` rendu et `manon_grimoire` non terminé |
| Persistance | `pagePlacements` / `revealedPages` / `collectedPages` sérialisés dans `_serializeState`/`_applyState` |

`quests.js` : `checkPageQuest()` (analogue à `checkKillQuests`) met à
jour la progression de `manon_grimoire` sur `collectedPages.size`.
Nouvel objectif `type:"pages"` dans le moteur de quêtes (petit ajout).

## 6. Établi de fusion (hébergé par Manon)

- `npcs.js` : Manon reçoit une `specialAction`
  `{ id:"manon_fusion_grimoire", label:"Reconstituer le grimoire" }`,
  proposée quand `collectedPages.size === 5`.
- `triggerNpcSpecialAction` → ouvre un overlay **établi** : 5 emplacements
  de page qui se remplissent, bouton « Fusionner ». UI légère calquée
  sur la besace/concoction (pas de modale lourde).
- Fusion : vide `collectedPages`, ajoute `livre_glacius_tempete` au sac,
  complète `manon_grimoire`, animation + `playLevelUp`.

## 7. Dialogues Manon Acte II (`npcs.js`)

- `questsGiven` / `questsTurnedIn` : ajouter `manon_revelio`,
  `manon_grimoire`.
- `dialoguesByQuest` : blocs `questOffer` / `questActive` / `questReady`
  pour les deux quêtes, dans la voix établie de Manon.
- `idleRandom` post-Acte II : 1-2 répliques sur le grimoire reconstitué.

## 8. Découpage en phases (verify)

1. **Narratif & données** — prémisse validée ; SPELLS Revelio ;
   2 quêtes dans `quests.js`/`state.js` ; dialogues Manon.
   verify : `node tests/smoke.js` vert (chargement).
2. **Revelio OOC** — `isOutOfCombatSpell` + handler `reveal`.
   verify : caster Revelio hors combat, message cohérent.
3. **Pages donjon** — `pagePlacements`/`revealedPages`/`collectedPages`,
   seed, hook `searchRoom`, marqueur minimap, persistance save.
   verify : révéler + fouiller une page → `collectedPages` grandit,
   survit à une sauvegarde/chargement.
4. **Quête pages** — objectif `type:"pages"`, `checkPageQuest`.
   verify : 5 pages → `manon_grimoire` passe `completable`.
5. **Établi de fusion** — `specialAction` Manon + overlay + recette.
   verify : fusion → grimoire au sac, quête complétée.
6. **Smoke test** — scénario dédié `scenarioManonGrimoire` (préambule →
   Revelio → 5 pages → fusion). Suite complète verte.

## 9. Hors-scope V1

- La **2ᵉ quête « épique »** d'obtention d'un autre grimoire — à
  concevoir séparément (déjà annoncée « à discuter plus tard »).
- Cue 3D de la page révélée (au-delà de la minimap).
- Revelio comme sort d'utilité générale (révéler coffres/passages) —
  reste cantonné aux pages pour cette V1.

## Suivi
- [ ] Phase 0 — validation de la prémisse narrative (§1) par l'utilisateur.

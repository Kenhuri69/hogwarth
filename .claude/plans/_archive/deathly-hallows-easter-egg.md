# Plan — Easter egg « Les Reliques de la Mort »

> Statut : ✅ **PLAN CLOS** — implémenté, testé (smoke 164/164) et **mergé**
> sur `master` (PR #405, 2026-06-08, branche
> `claude/plan-relica-implementation-rTx5G`). Décisions §3 retenues telles
> quelles (toutes ✅). 4ᵉ easter egg (après l'arc Manon livré, et les plans
> « Chasse Sans Tête » + « Salle sur Demande »). Registre : **mythique /
> solennel**. Modèle de référence : `headless-hunt-easter-egg.md` (flag
> cosmétique `headlessHuntMember`).
> Canon HP : les trois Reliques de la Mort — la **Baguette de Sureau**, la
> **Pierre de Résurrection** et la **Cape d'Invisibilité** — réunies font
> du porteur le « Maître de la Mort » (conte des Trois Frères, *Les Contes
> de Beedle le Barde*).

## 0. Découverte clé : les trois Reliques existent déjà

Le jeu possède **déjà** les trois objets canon (aucun à créer) :

| Relique canon | Item du jeu (`data.js`) | Slot / famille | Acquisition normale |
|---------------|--------------------------|----------------|----------------------|
| Baguette de Sureau (Elder Wand) | `wand2` « Baguette de Sureau » | `wand` / `wand_elder` | Boutique ét. 6 |
| Pierre de Résurrection | `anneau_resurrection` « Anneau de la Résurrection » | `ring` / `ring_resurrection` | Quête `anneau_dumbledore` (ét. 6) |
| Cape d'Invisibilité | `cape_invis` « Cape d'Invisibilité » | `cloak` / `cloak_invis` | Boutique / drop |

Ces trois slots sont **distincts** (`wand`, `ring1/ring2`, `cloak`) : un
**même héros peut donc porter les trois simultanément** — exactement le
geste canon du « Maître de la Mort ». L'egg n'a donc **pas** besoin d'un
système de collecte : il **détecte l'union** des Reliques déjà obtenues
au fil du jeu.

## 1. Principe : easter egg de possession (réunir les trois)

```
(a) RUMEUR                     (b) ESCALADE               (c) UNION
Un fantôme conte « Les Trois  →  porter 1 puis 2 Reliques →  porter les 3 sur
Frères » (hook diffus).          → un fantôme le remarque    un même héros →
PAS de quête au journal.         (« tu portes la marque      révélation unique :
                                 d'un des frères… »)         titre « Maître de
                                                             la Mort » (cosmétique)
```

- **(a) Rumeur (couche egg).** Un PNJ fantôme (lore) récite le **Conte des
  Trois Frères** dans son `idleRandom` (hook narratif, aucune entrée
  journal). Aucune indication d'objet : le joueur fait le lien lui-même.
- **(b) Escalade (indice contextuel).** Greffe conditionnelle (modèle des
  rumeurs Manon dans `_resolveDialogSource`) : quand le groupe **possède
  1 ou 2** Reliques, les fantômes le **remarquent** (« Tu portes déjà la
  marque d'un des frères, mortel — il t'en manque deux… »). Pousse vers
  l'union sans jamais l'imposer.
- **(c) Union.** Quand un **même personnage équipe les trois Reliques**
  en même temps (Sureau + Cape + Anneau), une **révélation unique** se
  déclenche : le symbole des Reliques se forme, narratif solennel, titre
  **« Maître de la Mort »** (flag `maitreDeLaMort`, badge fiche perso).

## 2. Architecture — quasi zéro nouveau système

Aucun cell, aucune page, aucune quête. On ne touche qu'à la **détection** :

### Détection (`checkHallowsUnion()`)
- Helper pur `_hallowsEquippedOn(c)` : vrai si le personnage `c` a, dans
  `c.equipped`, le Sureau (`wand_elder`), la Cape (`cloak_invis`) **et** la
  Pierre (`ring_resurrection`, en `ring1` **ou** `ring2`). Matching par
  `family` (robuste aux variantes de teinte) avec repli sur `id`.
- `checkHallowsUnion()` : si un membre vivant du groupe satisfait
  `_hallowsEquippedOn` et que `!maitreDeLaMort` → pose le flag, joue la
  révélation (narratif + son + badge), **une seule fois**.
- **Points d'appel** (défensifs, `typeof`) : `recalculateStats()`
  (inventory-core.js — déjà rappelée après chaque équipement, level-up et
  chargement → couvre tous les cas d'union) + à `_applyState` (load).
  Un seul vrai point suffit (`recalculateStats`), les autres sont des
  filets.

### Indice contextuel (rumeur escalade)
- Helper `_hallowsOwnedCount()` : nombre de Reliques **possédées** par le
  groupe (équipées **ou** en sac partagé `player.inventory`, matching
  `family`/`id`). 0–3.
- `_hallowsGhostHint()` : si `_hallowsOwnedCount()` ∈ {1,2} et
  `!maitreDeLaMort` → renvoie une réplique d'indice (sinon null). Greffée
  dans `_resolveDialogSource` pour les PNJ `sprite:'fantome'` (même point
  que les rumeurs Manon/Acte III). Apparition non garantie.

### État (state.js, sérialisé)
| Variable | Rôle |
|----------|------|
| `maitreDeLaMort` (bool) | titre obtenu (révélation jouée une fois). Sérialisé `_serializeState`/`_applyState` ; reset `false` dans `startGame` |

> Un seul nouveau flag. Pas de structure de collecte (les Reliques sont
> déjà gérées par l'inventaire/équipement existant).

### Conte des Trois Frères (hook)
- Option recommandée : ligne(s) `idleRandom` ajoutée(s) à un fantôme lore
  existant (**Sir Nicolas** ou **le Moine Gras**) récitant le conte —
  aucun nouveau PNJ requis.
- Option V2 : nouveau PNJ conteur (la **Dame Grise** / un ménestrel
  fantôme) avec le conte en plusieurs pages.

### Récompense
- **Cosmétique** : flag `maitreDeLaMort` → badge « 💀 Maître de la Mort »
  dans `char-stats-panel` (ui-character-sheet.js) + révélation narrative.
  **Pas de levier de combat** (cohérent avec Hiver Clair / Chasse Sans Tête).

## 3. Décisions à acter (⚠️ avant implémentation)

| Sujet | Proposition |
|-------|-------------|
| **Mécanique** | ✅ **(B) union par possession** (les Reliques existent déjà), PAS de collecte de fragments. Plus canon, code minimal, aucun conflit de structures partagées avec l'arc Manon |
| **Condition d'union** | ✅ **les 3 équipées sur un même héros** (slots distincts wand/cloak/ring → faisable ; fidèle au « porteur unique »). Repli possible : possession groupe |
| **Récompense** | ✅ **cosmétique seule** (titre + badge + narratif). Option écartée par défaut : 1 résurrection gratuite (= levier, à rediscuter) |
| **Conteur** | ✅ réemploi d'un fantôme lore existant (Sir Nicolas / Moine Gras) en V1 ; Dame Grise en V2 |
| **Indice escalade** | ✅ fantômes remarquent 1–2 Reliques possédées (`_hallowsGhostHint`) |

## 4. Découpage en phases (verify)

1. **Détection & flag** — `_hallowsEquippedOn`, `checkHallowsUnion`,
   `maitreDeLaMort` (state.js) ; appel dans `recalculateStats` + `_applyState`.
   → verify : équiper les 3 Reliques sur un héros → flag `true` une fois ;
   retirer/rééquiper ne rejoue pas la révélation.
2. **Persistance & reset** — sérialisation (save.js) + reset `startGame` +
   MANIFEST loader.
   → verify : round-trip save conserve `maitreDeLaMort`.
3. **Rumeur & indice** — conte (idleRandom d'un fantôme) +
   `_hallowsOwnedCount`/`_hallowsGhostHint` + greffe `_resolveDialogSource`.
   → verify : indice présent quand 1–2 Reliques possédées, absent à 0 et
   une fois le titre obtenu.
4. **Récompense visuelle** — badge « 💀 Maître de la Mort » fiche perso +
   narratif de révélation.
   → verify : badge affiché ssi `maitreDeLaMort`.
5. **Smoke** — `scenarioDeathlyHallows` : possession des 3 items, union sur
   un héros → flag, non-répétition, indice escalade, save.
   → verify : `node tests/smoke.js` vert.

## 5. Hors-scope V1
- Pouvoirs propres à chaque Relique au-delà de leurs bonus d'item actuels
  (les items gardent leurs stats existantes — pas de refonte).
- Quête de localisation des Reliques (elles s'obtiennent par le jeu normal :
  boutique ét. 6, quête `anneau_dumbledore`, drop) — l'egg est l'**union**,
  pas la chasse.
- Nouveau PNJ conteur dédié (Dame Grise) — V2.
- Récompense méta (résurrection, etc.) — volontairement écarté.

## Suivi
- [x] Concept retenu par l'utilisateur : **Les Reliques de la Mort**.
- [x] Vérifié : les 3 Reliques existent déjà (`wand2`/`cape_invis`/
      `anneau_resurrection`) → design « union par possession ».
- [x] §3 — décisions confirmées (union des 3 sur un même héros ; récompense
      cosmétique seule ; conteur = Sir Nicolas en V1).
- [x] Phase 1 — Détection & flag : `_hallowsEquippedOn`/`_hallowsOwnedCount`/
      `checkHallowsUnion` (`inventory-core.js`), flag `maitreDeLaMort`
      (`state.js`), appel en fin de `recalculateStats` (couvre équip/level-up/
      load, no-op si déjà débloqué). Matching `family` avec repli `id`.
- [x] Phase 2 — Persistance & reset : sérialisé (`save.js`), reset `startGame`
      (`main.js`), entrée MANIFEST loader (`loader.js`).
- [x] Phase 3 — Rumeur & indice : Conte des Trois Frères dans l'`idleRandom`
      de Sir Nicolas (`npcs.js`) ; `_hallowsGhostHint` (`npcs-helpers.js`)
      greffé dans `_resolveDialogSource` pour les fantômes (`npc-dialog.js`),
      apparition non garantie, gaté 1-2 Reliques possédées + `!maitreDeLaMort`.
- [x] Phase 4 — Récompense visuelle : badge « ☠️ Maître de la Mort » dans
      `char-stats-panel` (`ui-character-sheet.js`) + narratif de révélation
      (`addMsg` + `setNarrative` + son) dans `checkHallowsUnion`.
- [x] Phase 5 — Smoke : `scenarioDeathlyHallows` (`tests/scenarios/inventory.js`)
      — union sur un héros, non-répétition, indice escalade 1/2, save round-trip.
- [x] Cache PWA : bump `?v` des js touchés + `CACHE_VERSION`.

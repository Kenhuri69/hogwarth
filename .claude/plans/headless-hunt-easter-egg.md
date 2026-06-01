# Plan — Easter egg « La Chasse Sans Tête »

> Statut : **proposition** (non implémenté). 2ᵉ easter egg du jeu (après l'arc
> Manon). Registre **comique / macabre bon enfant** — contraste assumé avec
> le ton mélancolique→lumineux de Manon. Cf. canon HP : Sir Nicolas de
> Mimsy (« quasi sans tête ») se voit refuser la Chasse Sans Tête de
> Sir Patrick Delaney-Podmore car sa tête tient encore par un lambeau.

## 1. Principe : easter egg → quête

Même esprit que l'arc Manon (rumeur diffuse → découverte → quête → payoff),
mais plus léger et **entièrement câblé sur des PNJ** (pas de pages/feuillets) :

```
(a) RUMEUR              (b) DÉCOUVERTE             (c) QUÊTE + PAYOFF
Sir Nicolas (lore       trouver Sir Patrick,       quête comique : prouver
random) se lamente   →  Maître de la Chasse,    →  qu'un fantôme sait chasser
d'être recalé de la     tapi en profondeur          → adhésion HONORAIRE de
Chasse Sans Tête        (PNJ déterministe ét. 6)    Nick + faveur cosmétique
PAS de quête imposée    plaider sa cause
```

- **(a) Rumeur (couche egg).** Sir Nicolas (`sprite:'fantome'`, `random`)
  a **déjà** une réplique `idleRandom` sur son rejet (« Le Chasseur Sans
  Tête m'a encore refusé… »). C'est la surface de l'egg — aucune entrée au
  journal. On l'épaissit d'une ligne d'espoir.
- **(b) Découverte.** **Sir Patrick Delaney-Podmore** — nouveau PNJ
  **déterministe** (`placement {floor:6}`, ghost) — tient salon dans les
  profondeurs. Le joueur curieux qui explore le trouve.
- **(c) Quête.** Lui parler ouvre `chasse_sans_tete` (offre classique).
  Objectif comique : terrasser le **Chevalier Fantôme** (`chevalier_fantome`,
  un spectre resté casqué, étages 4-9) ×2 et rapporter les « trophées ».
  Remise → Sir Patrick concède une **adhésion honoraire** à Nick (payoff
  narratif) + flag cosmétique au héros.

## 2. Décisions actées

| Sujet | Décision |
|-------|----------|
| Ton | comique / macabre bon enfant (contraste avec Manon) |
| Hôte de quête | **Sir Patrick** (nouveau PNJ déterministe, ét. 6) |
| Hook rumeur | Sir Nicolas (lore random, réplique déjà existante + 1 ligne) |
| Objectif | `kill` Chevalier Fantôme ×2 (`checkKillQuests`, mécanisme existant) |
| Récompense | **cosmétique** : flag sérialisé `headlessHuntMember` (badge fiche perso) + xp/gold. **Pas de levier de combat** (cohérent avec Hiver Clair) |
| Payoff | dialogue de remise de Sir Patrick + ligne `idleRandom` célébratoire débloquée chez Nick |
| Accès | offre classique chez Sir Patrick (pas d'`implicitAccept`) ; l'egg = trouver le PNJ caché en profondeur |

## 3. Architecture — réemploi maximal

Aucun nouveau système. On réutilise :
- **PNJ déterministe** : modèle Manon (`placement {floor,anchor}`,
  `questsGiven`/`questsTurnedIn`, `dialoguesByQuest`). Portrait : asset
  générique `img/npc/_npc_fantome.png`, sprite 3D `fantome`.
- **Quête `kill`** : `QUEST_TEMPLATES` + `checkKillQuests` + remise générique
  (`turnInQuestById` → `completeQuest`).
- **Récompense flag** : hook explicite dans `completeQuest` (jumeau du hook
  points de Maison) posant `headlessHuntMember = true`.
- **Greffe de dialogue** : ligne célébratoire de Nick greffée dans
  `_resolveDialogSource` (même point que les rumeurs Manon), gardée par le
  flag.

## 4. Découpage en phases (verify)

1. **PNJ & quête** — `sir_patrick` (npcs.js) ; quête `chasse_sans_tete`
   (quests-templates.js, kill Chevalier Fantôme ×2) ; ligne d'espoir + ligne
   célébratoire (gardée flag) de Sir Nicolas.
   → verify : `getQuestTemplate` + `getNpcById('sir_patrick')` cohérents ;
   `getNpcsForFloor(6)` inclut Sir Patrick ; `generateDungeon(6)` le place.
2. **Récompense & flag** — `headlessHuntMember` (state.js) ; hook
   `completeQuest` ; badge fiche perso (ui-character-sheet.js) ; helper
   `_nickHuntCelebration` (npcs-helpers.js) + greffe (npc-dialog.js).
   → verify : remise → flag true + badge ; ligne Nick débloquée seulement
   sous flag.
3. **Persistance & reset** — sérialisation (save.js) + reset `startGame`
   (main.js) ; MANIFEST loader.
   → verify : round-trip save conserve `headlessHuntMember`.
4. **Smoke** — `scenarioHeadlessHunt` (données, placement ét. 6, accept→
   kill→ready→remise→flag, célébration Nick, save).
   → verify : `node tests/smoke.js` vert.

## 5. Hors-scope V1
- Multi-étapes (visite du club, cérémonie d'intronisation) — payoff tenu
  dans le dialogue de remise.
- Récompense méta / objet à stats — volontairement écarté (egg = charge
  comique, pas power-spike).
- Portrait dédié de Sir Patrick (asset générique fantôme en V1). Prompt
  Nano Banana du portrait dédié rédigé :
  [`nano-banana-prompt-sir-patrick.md`](./nano-banana-prompt-sir-patrick.md)
  (PNG à générer hors-environnement, puis swap `portraitImg`).

## Suivi
- [x] Concept choisi par l'utilisateur : **La Chasse Sans Tête**.
- [x] Phase 1 — PNJ `sir_patrick` (npcs.js) + quête `chasse_sans_tete`
      (quests-templates.js, kill chevalier_fantome ×2) + ligne d'espoir
      Sir Nicolas. **Textes provisoires** en place.
- [x] Phase 2 — flag `headlessHuntMember` (state.js) + hook `completeQuest`
      (jumeau du hook points de Maison) + badge fiche perso
      (ui-character-sheet.js) + helper `_nickHuntCelebration` (npcs-helpers.js)
      greffé dans `_resolveDialogSource` (npc-dialog.js, gardé par le flag).
- [x] Phase 3 — sérialisation (save.js) + reset `startGame` (main.js) +
      entrée MANIFEST (loader.js).
- [x] Phase 4 — `scenarioHeadlessHunt` (tests/smoke.js) ; suite verte.
- [x] Réserve : **dialogues** (Sir Patrick, lignes de Nick) validés par
      l'utilisateur ; marqueurs « Textes provisoires » retirés.

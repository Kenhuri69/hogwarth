# Quêtes Signature de Maison — chantier complet (4 maisons)

Source narrative : `docs/histoire/08-quetes-et-sous-intrigues.md` §8.5 (design),
§8.5.1 (table de synthèse), §8.5.2 (cadrage dev), §8.8.x (dialogues).
Une seule quête active par partie (celle du `chosenHouse`, §8.5.3).

## Principe (§8.5.2)
Réutiliser l'existant, **pas** de nouveau système :
- Templates `quest_signature_<house>` dans `QUEST_TEMPLATES`, `houseSignatureQuest:true`,
  `house`, chaînage par `prereq` (modèle chaîne `dumbledore_*`).
- Déverrouillage : `unlockHouseSignatureQuest(house)` gaté `chosenHouse` + étage
  déclencheur (appelé au franchissement d'étage).
- Objectifs = types existants : `kill` / `item` / `floor` / `riddle` / `pages` / `herb`.
- Flags sérialisés : `gryffSignatureDone`, `slythSignatureDone`+`slythPactChoice`,
  `ravenSignatureDone`, `poufSignatureDone` (ne PAS dupliquer `chosenHouse`/`houseTier`).
- Récompense cérémonielle via `pendingHouseRewards` ; sort via pipeline d'apprentissage.
- Levier finale Voldemort = hook one-shot flag-gardé dans `startBattle`/phases boss.
- Dialogues conditionnels via `dialoguesByHouse` (override pré-Voldemort sur le flag).
- 1 smoke par maison : `scenarioHouseSignature<House>` (disponible→acceptable→
  remettable, flag posé, réplique pré-Voldemort présente).

## Les 4 quêtes (§8.5.1)

| 🦁 Gryffondor — L'Étendard de Godric | déclencheur McGonagall/Chevalier ét. 2-3 |
|---|---|
| Objectifs | rallumer 3 brasiers (`item`/fouille-proxy) → tenir un combat sans fuir (`kill` contraint) → reprendre l'Étendard au Porte-Étendard Déchu (mini-boss `kill`) |
| Récompense | **Bannière de Godric** (`trinket`, anti-`fear` si PV>seuil) via `pendingHouseRewards` |
| Flag/levier | `gryffSignatureDone` → neutralise la phase terreur de `voldemort_revenu` |

| 🐍 Serpentard — Le Pacte des Cachots | déclencheur Rogue/écho Salazar ét. 4 |
|---|---|
| Objectifs | percer la vérité de l'écho ; **choix gris** pacte/défiance ; secret des Fondateurs gardé par basilic (`kill`/`item`) |
| Récompense | Langue-de-plomb / Sectumsempra anticipé (sort) |
| Flag/levier | `slythSignatureDone` + `slythPactChoice ∈ {pact,defiance}` → pacte = lifesteal +Voldemort « reconnaît » / défiance = debuff boss |

| 🦅 Serdaigle — Le Codex de Rowena | déclencheur Flitwick/stèle ét. I-II |
|---|---|
| Objectifs | résoudre 3-4 stèles (`riddle`) → feuillets du Codex (`pages`) → secret de fouille |
| Récompense | **Codex de Rowena** (objet : révèle resist/weak) ou Legilimens |
| Flag/levier | `ravenSignatureDone` → resist/weak de Voldemort révélés (bestiaire) + weak one-shot |

| 🦡 Poufsouffle — Ceux qu'on ne laisse pas derrière | déclencheur Chourave ét. 2 |
|---|---|
| Objectifs | secourir 3 égarés (`item`/`floor`-proxy) → défendre le Refuge (`kill`) → vivres/herbes (`herb`) |
| Récompense | **Médaillon de Helga** (regen) / allié-buff passif sérialisé |
| Flag/levier | `poufSignatureDone` → buff de départ « Espoir partagé » (PV max transient/regen) au combat final. **Refuge déjà livré (PR #431)** = brique de repos. |

## Découpage en PRs (chacune complète + testée)
- **PR1 — Cadre + Poufsouffle** : framework (flags sérialisés, `unlockHouseSignatureQuest`,
  support `houseSignatureQuest` dans templates/quests, remise `pendingHouseRewards`,
  hook levier Voldemort générique flag-gardé, override dialogue pré-Voldemort) +
  quête Poufsouffle complète (s'appuie sur le Refuge) + `scenarioHouseSignaturePouf`.
- **PR2 — Gryffondor** (Bannière + neutralisation phase terreur).
- **PR3 — Serpentard** (choix gris + `slythPactChoice` + lifesteal/debuff).
- **PR4 — Serdaigle** (stèles + Codex + révélation resist/weak).

## DÉCOUVERTE MAJEURE (audit infra)
Le système de Quêtes Signature **existe déjà** et est **testé** (master a avancé) :
templates `quest_signature_*`, flags sérialisés, donneurs PNJ + `dialoguesByQuest`,
`_applySignatureVoldemortLever` (4 leviers + repli), choix gris `turnInSlythSignature`,
récompenses réelles, smoke `scenarioHouseSignatureQuests` vert. **Seul écart spec** :
chaque quête est **mono-objectif** (1 kill), pas la **chaîne 3 beats** de §8.5/§8.8.
→ Le chantier « contenu complet » = **enrichir** les 4 en chaînes 3 beats.

### Fait moteur : objectifs `kill` SÉQUENTIELS
`checkKillQuests` ne progresse que sur `getActiveStep` (1ʳᵉ incomplète). Les beats
passifs (`herb`/`item`/`pages`/`donate` via `_refreshObjectives`, `floor` via
`checkFloorQuests`) se complètent dans n'importe quel ordre, mais un `kill` ne
compte qu'une fois devenu l'étape active → placer les kills en **fin** de chaîne.
`riddle` est **hardcodé** à `dumbledore_lumiere` (non réutilisable génériquement).

## Journal
- ✅ **PR1 — Poufsouffle enrichie** : `quest_signature_pouf` passe de [kill×3] à
  **3 beats** [herb×2 → floor 4 (§8.5 floor-proxy) → kill inferius×3 (climax)].
  Dialogues Chourave réécrits pour la séquence. Smoke généralisé pour compléter
  toute chaîne d'objectifs (réutilisable PR2-4) — vert.
- (à venir) PR2 Gryffondor, PR3 Serpentard, PR4 Serdaigle.

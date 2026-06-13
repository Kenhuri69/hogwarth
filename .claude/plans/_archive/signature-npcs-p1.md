# PNJ des Quêtes Signature — Priorité P1 (Chapitre 06 §6.12)

Branche : `claude/hogwarth-signature-npcs-p1-yumf3f` (depuis master).

## Contexte & découverte

Le **moteur** des Quêtes Signature existe déjà et est testé sur master
(`.claude/plans/quetes-signature.md`, chantier clos) :
- templates `quest_signature_<gryff|slyth|raven|pouf>` en chaînes 3 beats ;
- flags sérialisés `*SignatureDone` + `slythPactChoice` (state.js/save.js) ;
- `unlockHouseSignatureQuest` / `_maybeUnlockSignature` (gate `chosenHouse` + étage) ;
- choix gris `turnInSlythSignature(pact|defiance)` ;
- leviers one-shot Voldemort (battle.js), écho Boucle (floor-ambiance.js), codex ;
- smoke `scenarioHouseSignatureQuests` (vert).

Les signatures sont aujourd'hui **relayées par les Chefs de Maison** (McGonagall,
Rogue, Flitwick, Chourave).

**Gap P1 réel** (§6.8/§6.12) : les **2 PNJ donneurs thématiques dédiés**
n'existent pas comme PNJ — 🦁 **Chevalier Fantôme** (non-hostile) et 🐍 **Écho de
Salazar**. Pour 🦅/🦡, les donneurs thématiques (**Flitwick**, **Chourave**)
existent déjà et relaient leur signature.

## Décisions (arbitrages confirmés avec l'utilisateur)

1. **Scope** : créer Chevalier Fantôme + Écho de Salazar comme donneurs gatés par
   `chosenHouse` (nouveau champ `houseGate`), et **déplacer** `quest_signature_gryff`/
   `quest_signature_slyth` sur eux (retrait de McGonagall/Rogue, qui gardent
   set/don + la **remise cérémonielle de la relique** via `claim_house_reward`).
   Flitwick/Chourave restent les donneurs 🦅/🦡. Scénarios smoke par Maison.
2. **Assets** : générer de l'**art PNG dédié** par PNJ (portrait 256² + sprite
   couloir 512²), dérivé des sprites canon du bestiaire (chevalier_fantome,
   serpent_cachot) via PIL — pas de modèle d'image externe.

## Étapes (chacune vérifiée ; smoke entre chaque Maison)

- [x] **0. Plan + branche.** Plan écrit ; branche déjà active.
- [x] **1. `houseGate` (npcs-helpers.js).** `getNpcsForFloor` filtre les PNJ
  porteurs de `houseGate` : n'apparaissent que si `chosenHouse` correspond
  (string ou tableau). Défensif : sans `houseGate`, comportement inchangé.
  → vérif : unité Node (getNpcsForFloor gate) + smoke npc.
- [x] **2. Art PNG dédié.** `tools/gen_signature_npc_art.py` (PIL) produit :
  - `img/npc/chevalier_fantome.png` (256² portrait) + `img/npc/_npc_chevalier.png`
    (512² sprite) — teinte spectrale bleutée « apaisée » (non-hostile) du
    `chevalier_fantome` du bestiaire.
  - `img/npc/echo_salazar.png` (256²) + `img/npc/_npc_echo.png` (512²) —
    `serpent_cachot` recoloré en émeraude spectral (présence/écho).
  → vérif : dimensions/format conformes aux portraits (256² RGB) & sprites
    (512² RGBA) existants.
- [x] **3. Sprites couloir (renderer-entities.js).** Ajout des types `chevalier`
  et `echo` à `NPC_SPRITE_SRC`.
- [x] **4a. Gryffondor — Chevalier Fantôme (npcs.js).** Nouveau PNJ
  `chevalier_godric` (id distinct du monstre `chevalier_fantome`), `houseGate:
  'Gryffondor'`, `placement.floor: 2` (= trigger), `sprite:'chevalier'`,
  `marker:'quest'`, dialogues + `dialoguesByQuest.quest_signature_gryff`,
  `questsGiven/TurnedIn:['quest_signature_gryff']`, portrait dédié. **Retrait**
  de `quest_signature_gryff` (+ dialoguesByQuest) de McGonagall. `giver` du
  template → « Chevalier Fantôme ». → smoke (gryff) vert.
- [x] **4b. Serpentard — Écho de Salazar (npcs.js).** Nouveau PNJ `echo_salazar`,
  `houseGate:'Serpentard'`, `placement.floor: 4`, `sprite:'echo'`, dialogues +
  `dialoguesByQuest.quest_signature_slyth` (choix gris déjà géré par npc-dialog
  sur le qid). Retrait de `quest_signature_slyth` (+ dialoguesByQuest) de Rogue.
  `giver` → « Écho de Salazar ». → smoke (slyth) vert.
- [x] **5. Scénarios smoke par Maison.** `scenarioHouseSignature{Gryffondor,
  Serpentard,Serdaigle,Poufsouffle}` dans tests/scenarios/houses.js : gating
  `houseGate` (PNJ présent pour la bonne Maison seulement), donneur expose
  l'offre (`getNpcQuestState`), accept→chaîne→remise via le donneur, flag posé.
  Conservé : `scenarioHouseSignatureQuests` (couverture moteur). → smoke complet.
- [x] **6. Cache PWA (skill cache-bump).** Bump `?v` des JS modifiés (index.html
  + sw.js PRECACHE_URLS) + `CACHE_VERSION`. Les PNG (img/) ne sont pas précachés
  (stale-while-revalidate) → pas de bump d'asset. Vérif
  `node tools/check_cache_versions.js --base origin/master`.
- [x] **7. commit-guard + push.** Plan à jour, smoke vert, cache OK, PR non
  existante → push sur la branche. Pas de PR sans demande.

## Notes / écarts

- **Relique** : la remise cérémonielle reste au Chef de Maison
  (`claim_house_reward`, inchangé) — cohérent avec set/don ; le donneur dédié
  donne et clôt la quête. (Écart léger vs §6.8.5 « le Chevalier remet la
  Bannière » — assumé pour rester surgical et ne pas casser le flux testé.)
- **Id distinct** `chevalier_godric` (donneur non-hostile) ≠ monstre
  `chevalier_fantome` (climax « Porte-Étendard Déchu », cible kill inchangée).
- Aucun nouveau global critique → MANIFEST loader inchangé.

## Journal
- 2026-06-12 : plan créé après audit. Découverte : moteur signatures déjà
  livré ; P1 = donneurs dédiés. Arbitrages confirmés (move + art PNG dédié).
- 2026-06-12 : étapes 1→6 implémentées. `houseGate` (helpers
  `_npcPassesHouseGate`), art PIL (`tools/gen_signature_npc_art.py` → 4 PNG),
  sprites couloir `chevalier`/`echo`, 2 PNJ donneurs (`chevalier_godric`,
  `echo_salazar`) + retrait des signatures chez McGonagall/Rogue, `giver` mis à
  jour, 4 scénarios smoke par Maison + npc T1 houseGate-aware. Cache bump
  v105→v106 (npcs 24→25, npcs-helpers 2→3, renderer-entities 4→5,
  quests-templates 10→11). **Vert** : units 442, pwa-smoke, smoke complet 193.

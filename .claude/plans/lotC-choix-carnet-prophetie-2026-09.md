# Lot C — Le verbe `choice`, « Le Carnet du Lieutenant » (H3) et « La Prophétie en éclats » (H2)

**Branche :** `ccr-4b80ea69-2nys9o` (repartie de `master` après le merge de la PR #752)
**Source :** [`revue-experience-joueur-2026-09.md`](./revue-experience-joueur-2026-09.md),
axe 4 et arcs H3, H2.
**Statut :** ✅ livré (PR en cours)
**Demande (utilisateur, 2026-09-30) :** « Go next phase » (suite du Lot B).

## Constat de départ (mesuré)

- Le seul dilemme du jeu est le Pacte des Cachots, **codé en dur** pour
  `quest_signature_slyth` (`npc-dialog.js`, deux boutons ; `turnInSlythSignature`).
  Il n'est jouable qu'en Serpentard.
- Les Mangemorts n'ont ni chef nommé ni plan.
- Trelawney est un PNJ d'ambiance aléatoire (ét. 3+) sans quête ; sa réplique
  de transe sur « celui qui ne respire plus » n'a aucune suite.
- Les stèles d'énigme (~30 % des étages) n'ont aucun lien narratif.

## Invariants

- Aucun blocage de `goDeeper()`. Quêtes et stèles facultatives.
- Un choix = récompense **différente mais équivalente**, un flag, une trace
  visible plus tard. **Jamais de branche, jamais de gate.** Ouvert à toutes
  les Maisons.
- Le Pacte des Cachots n'est **pas** migré (zéro régression sur un système
  testé) ; le verbe générique vit à côté.
- Texte seulement : aucun OGG, aucune voix jouée pour les nouveaux textes.

## Décisions de conception

- **C0 — Verbe `choice` (générique, données)** :
  - Modèle de quête : `choices: [{ id, label, reward, msg }]` (2 options).
    À la remise, `_npcDialogActions` affiche **un bouton par option** au lieu
    de « Remettre la quête ».
  - `turnInQuestChoice(qid, cid)` : applique la récompense de l'option
    (remplace `reward` du modèle), enregistre le choix dans **`questChoices`**
    (objet `{ qid: cid }`, sérialisé, réinitialisé par `startGame`), puis
    remet la quête. Lecture : `questChoiceOf(qid)`.
  - **Traces** :
    - PNJ : champ `choiceLines: { qid: { cid: "réplique" } }`, page-suffixe
      muette ajoutée au dialogue (même mécanique que la réputation).
    - Codex : condition `choice` (`value: "qid:cid"`), et
      `variants.choice: { "qid:cid": note }` lu par `codexVariantNote`.
  - Plutôt que d'étendre `npcReputationFor` (dont les répliques de Kingsley
    parlent du Pacte), la trace d'un choix passe par `choiceLines` : une ligne
    écrite pour ce choix précis.
- **C1 — `progressLines` (générique)** : un modèle de quête peut porter
  `progressLines: ["…", "…"]`. À chaque progression d'une étape `search`, la
  ligne correspondante s'affiche (lettres du Lieutenant).
- **H3 — « Le Carnet du Lieutenant »** :
  - Nouveau monstre **`lieutenant_vantrell`** (« Casimir Vantrell, le
    Lieutenant », humain, epic, ét. 8). `questOnly` (jamais tiré au hasard ;
    filtre ajouté à tous les pools aléatoires, sim comprises) et
    `soloEncounter`. Sprite réutilisé : `mangemort_elite.png` (Mangemort masqué).
    Simulation (`--boss=lieutenant_vantrell --boss-alone=1`, Broyer runtime,
    3000 combats) : **97 % solo** (43 % PV restants, 16 tours), **100 % duo**,
    au niveau de Greyback seul.
  - Quête 1 **`carnet_lieutenant`** : donnée par **Lupin** (ét. 4). Étape
    `search` ×4 avec `progressLines` (4 lettres qui dévoilent le plan).
    Remise à **Kingsley** (ét. 8), livraison inter-PNJ (`questsTurnedIn`).
  - Quête 2 **`lieutenant_vantrell`** : donnée par Kingsley (prérequis :
    quête 1). `kill` ×1, `spawnOnAccept` du Lieutenant (sans escorte).
    **Dilemme** à la remise : brûler les grimoires (XP + or, et Kingsley
    approuve) ou les garder (`livre_morsmordre` + XP, et Kingsley se méfie).
  - Promotion et chute du Lieutenant dans `BOSS_PROMO_BEATS`.
  - Codex `lieutenant_vantrell` (Personnages) : voilé à la 1re remise, révélé
    à la 2e, avec une note selon le choix.
- **H2 — « La Prophétie en éclats »** (sans quête ni dilemme) :
  - `prophecyFragments` (0..3, sérialisé). Chaque stèle résolue aux étages
    3 à 10, avant la victoire, grave le fragment suivant (dans le journal).
  - Stèle **forcée** aux étages 3, 6 et 9 tant que la prophétie est
    incomplète : au moins 3 occasions garanties.
  - Trelawney : `prophecyLines` par nombre de fragments (suffixe muet).
    Complète, la prophétie parle du **Dormeur** (teaser de l'Acte IV).
  - Codex `prophetie_profondeurs` (Lore) : voilé dès 1 fragment, révélé à 3 ;
    note héros pour Céleste (qui a lu les mêmes signes, 06:171).

## Étapes

- [x] C-sim : monstre + `questOnly` + simulation.
- [x] C0 verbe `choice` (quests.js, npc-dialog.js, state/save/main, codex).
- [x] C1 `progressLines`.
- [x] H3 données : quêtes, PNJ (Lupin, Kingsley), promotion, Codex.
- [x] H2 : fragments, stèles forcées, Trelawney, Codex.
- [x] Loader, docs (CLAUDE.md, bible 06 / 08), tests units + smoke.
- [ ] Tests complets, bump du cache, commit, état de la PR, push, PR.

## Journal

- **2026-09-30** — Plan créé. Monstre créé et simulé.
- **2026-09-30** — C0 à H2 implémentés. Écarts et précisions :
  - `questOnly` filtré dans **11** pools aléatoires (combat, génération,
    respawn, piège, repos, farming, Portus, embuscade de visite, Verrou de
    Sang, sim-difficulty, sim-economy) : `weightedPick` traite un poids 0
    comme 1, un `weight: 0` n'aurait pas suffi.
  - Butin du Lieutenant : `livre_crucio` (30 %) — le 2e grimoire orphelin
    du Lot 0.1 trouve ainsi une source narrative ; pas d'Éclat de Voûte (le
    fil rouge en compte déjà 3 garantis).
  - `turnInName` ajouté pour que le message « prête — retourne voir … »
    désigne Kingsley et non Lupin.
  - Trelawney garde son statut de PNJ d'ambiance aléatoire : la prophétie
    passe par les stèles et un suffixe de dialogue, sans quête à rendre
    (une remise chez un PNJ aléatoire serait incertaine).
  - Manifeste du loader : +6 (374 → 380) ; CLAUDE.md (propriétés `questOnly`
    / `soloEncounter`, section « Dilemmes et récit de quête »), bible 06.
  - Tests : units §9 (14 promotions) + §23 (46 assertions) ; smoke
    `scenarioLieutenantAndProphecy` (arc H3 complet de bout en bout, save,
    prophétie).
  - Bump : 21 assets + `CACHE_VERSION` 276 → 277.
  - Smoke complet, 1er passage : `scenarioHouseRoomBias` en échec. La stèle
    garantie aux étages 3 et 6 (neutre entre Maisons) masquait la saveur
    Serdaigle ⇄ Gryffondor mesurée. Correctif dans le test : prophétie
    considérée complète pour isoler le biais Maison (aucun test désactivé).
  - 2e passage : `scenarioMonsterImages` exige `img/monsters/<id>.png`.
    Illustration **provisoire** : copie de `mangemort_elite.png` sous
    `img/monsters/lieutenant_vantrell.png`, en attendant un portrait dédié
    (skill `add-monster`, Nano Banana).
  - 3e passage : `scenarioSealedRoom` (aléatoire) — **défaut latent du Lot B**.
    La clé de la salle scellée était confiée à un monstre de l'étage *avant*
    que le boss d'acte soit posé : sur un étage 6/8 sans autre monstre, le
    boss arrivait sans clé. Correctif : `generateDungeon` pose le boss d'acte
    avant l'attribution de la clé (il peut la porter).

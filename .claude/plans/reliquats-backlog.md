# Backlog des reliquats hors-scope (plans archivés)

> Plan consolidé créé le **2026-06-08** lors de l'archivage en masse des plans
> terminés. Chaque entrée correspond à un plan dont le **cœur est livré et
> archivé** dans [`_archive/`](./_archive/), mais qui traînait un **reliquat
> explicitement hors-scope** (reporté / « V2 » / optionnel / bloqué). Le détail
> source de chaque reliquat reste consultable dans le plan archivé référencé.
>
> Format par entrée : **Source** (plan archivé) · **Reste à faire** · **Étapes
> → vérification** · **Priorité**. Cocher et dater au fil de l'implémentation
> (guidelines §4/§5). Quand un reliquat est livré, le rayer ici et, si pertinent,
> ouvrir un plan dédié pour le détail technique.

---

## Légende priorité
- **P1** — valeur joueur claire, faible risque, prêt à coder.
- **P2** — valeur réelle mais design à arbitrer ou effort moyen.
- **P3** — cosmétique / optionnel / confort dev.
- **P-bloqué** — dépend d'un asset/décision externe (utilisateur, backend, live).

---

## 1. Contenu & systèmes de jeu

### 1.1 Potions multi-cibles & usage ennemi — **P2**
- **Source** : `_archive/potions-enrichment.md` (backlog P6).
- **Reste à faire** : potions offensives **multi-cibles / AOE** (splash sur le
  groupe ennemi) et **usage de potions par les ennemis** (soin/buff côté IA).
- **Étapes** :
  1. Étendre le schéma item consommable d'un flag `aoe:true` (réutiliser la
     mécanique `splash` des sorts, cf. `bombarda-splash`) → vérif : une potion
     AOE touche tout `enemyGroup` en combat.
  2. Brancher un hook `tryEnemyConsumable()` dans `tryEnemyAbility` (battle.js)
     pour quelques monstres « humains » porteurs → vérif : un Mangemort se soigne
     via potion, log combat correct.
  3. Scénario smoke dédié (`scenarioPotionAoe`) → vérif : `node tests/smoke.js` vert.
  4. Bump cache PWA (data.js/battle.js touchés) via skill `cache-bump`.

### 1.2 Forge & Bibliothèque — extension matériaux T5 + formule d'upgrade — **P2**
- **Source** : `_archive/forge-library-stabilization.md`.
- **Reste à faire** : ajouter une **source de matériaux de palier T5** (endgame),
  **refondre la formule d'upgrade** (coût/scaling), et de nouveaux items/sorts
  débloquables.
- **Étapes** :
  1. Décider la source T5 (drop boss Boucle Ténébreuse ? don Gardien de la Boucle ?)
     → vérif : matériau T5 obtenable en partie réelle endgame.
  2. Recalibrer la courbe de coût d'upgrade (sim `tools/sim-economy.js`) → vérif :
     progression non triviale mais atteignable (rapport sim joint au plan).
  3. Ajouter les recettes/sorts T5 → vérif : visibles et achetables/forgeables.
  4. Scénario smoke + bump cache.

### 1.3 House post-tier-18 — Piste C (forge d'amélioration) & Piste D (reroll) — **P2**
- **Source** : `_archive/house-post-tier-18.md` (pistes C/D renvoyées à plans séparés).
- **Reste à faire** : **Piste C** — forge d'amélioration d'équipement légendaire ;
  **Piste D** — reroll d'enchantement (gold-sink endgame complémentaire au don Maison).
- **Étapes** :
  1. Spécifier C et D séparément (ce sont deux features) → vérif : mini-design
     écrit dans ce fichier ou un plan dédié avant code.
  2. Implémenter le gold-sink en réutilisant `house-donation` comme modèle d'UI.
  3. Sim économie (ne pas casser l'équilibre or endgame) → vérif : rapport sim.
  4. Scénario smoke + bump cache.

---

## 2. Easter-eggs — finalisation des dialogues

### 2.1 Manon (grimoire) — dialogues & lore des feuillets — **P1**
- **Source** : `_archive/manon-grimoire-easter-egg.md` (phases 1-5 livrées, textes provisoires).
- **Reste à faire** : finaliser/co-écrire les **dialogues de Manon** (rumeurs,
  remise) et les **noms + lore des feuillets** (textes actuellement « provisoires »).
- **Étapes** :
  1. Rédiger les textes définitifs (revue avec l'utilisateur) → vérif : aucun
     placeholder « provisoire » restant dans `npcs.js`/données feuillets.
  2. Bump cache si fichiers JS de données touchés.
- **Note** : purement éditorial, aucun changement de logique.

### 2.2 Elfe de maison libre — dialogues définitifs — **P1**
- **Source** : `_archive/free-house-elf-easter-egg.md` (leviers livrés, dialogues provisoires).
- **Reste à faire** : finaliser les **dialogues** (Dobby/gag/ambiance) avant
  considérer l'easter-egg « propre ».
- **Étapes** : idem 2.1 (rédaction + revue + bump cache si data JS touché).

---

## 3. Visuels / cosmétiques manquants

### 3.1 emoji-png-gaps — lots 7-10 — **P3**
- **Source** : `_archive/emoji-png-gaps.md` (lots 1-5 livrés ; lots 7-10 non engagés).
- **Reste à faire** : cartes **cosmétiques**, **souvenirs**, **labels PNJ**,
  **logs d'atelier** encore en emoji → conversion PNG.
- **Étapes** :
  1. Inventorier les emoji restants par lot (grep des surfaces concernées)
     → vérif : liste exhaustive des cibles.
  2. Générer les PNG manquants (pipeline existant) et brancher les registries.
  3. Scénario smoke visuel + bump cache.

### 3.2 combat-emoji-badges — Lot 2 (journal) & Lot 3 (9 PNG) — **P3**
- **Source** : `_archive/combat-emoji-badges.md` (Lot 1 livré).
- **Reste à faire** : **Lot 2** conversion emoji → badge dans le **journal de
  combat** ; **Lot 3** création des **9 PNG** manquants.
- **Étapes** :
  1. Générer les 9 PNG (pipeline icônes) → vérif : présents dans `img/`.
  2. Router le journal de combat (`UX.logCombat`) vers les badges PNG → vérif :
     journal sans emoji bruts.
  3. Smoke + bump cache.

### 3.3 Room of Requirement V3.1 — bonus — **P2**
- **Source** : `_archive/room-of-requirement-v3.md` (V3 livré ; V3.1 en bonus).
- **Reste à faire** : **6 trophées PNG**, **choix joueur** sur le trophée,
  **bonus méta**, **onglet Atelier** dédié.
- **Étapes** :
  1. Design du bonus méta (effet durable inter-parties ?) → vérif : règle écrite.
  2. Générer les 6 PNG trophées.
  3. UI onglet Atelier + sélection joueur → vérif : scénario smoke.
  4. Bump cache.

---

## 4. Multijoueur / Mondes Parallèles

### 4.1 Phase 7 — duel PvP direct — **P2 (optionnel)**
- **Source** : `_archive/multiplayer.md` (Phases 0-6 livrées ; Phase 7 optionnelle).
- **Reste à faire** : **duel PvP en direct** entre deux joueurs en ligne.
- **Étapes** :
  1. Décider si on poursuit (feature lourde, transport REST polling existant)
     → vérif : go/no-go documenté.
  2. Si go : canal de duel sur Supabase (réutiliser `mp_visit_messages` ?),
     tour-par-tour synchronisé → vérif : protocole 2 clients.
  3. Stubs REST + scénario smoke offline (modèle des scénarios `Visit*`).

### 4.2 Validation live 2 clients (S3.10) — **P-bloqué**
- **Source** : `_archive/parallel-worlds-stabilization.md` (S1-S4 livrés ; S3.10 manuel).
- **Reste à faire** : **validation end-to-end live** à 2 clients réels contre le
  backend Supabase (protocole `tests/parallel-live-checklist.md`).
- **Action** : exécuter la checklist manuelle (hors suite smoke). Non codable —
  cocher quand la session live a été menée.

---

## 5. Audio — bloqué sur asset

### 5.1 Musiques de combat (epic / late) — **P-bloqué**
- **Source** : `_archive/audio-completion-spell-voices-combat-music.md` (voix de sorts livrées).
- **Reste à faire** : intégrer les **musiques de combat** `combat_epic` /
  `combat_late` — en attente des **MP3 fournis par l'utilisateur** (conversion OGG).
- **Action** : à réception des MP3 → convertir en OGG, placer dans `audio/`,
  vérifier `_combatSampleKey` (audio-music.js). Cf. CLAUDE.md « Musique de combat ».

---

## 6. Dette technique / confort dev

### 6.1 Modularisation des god-files — **P2**
- **Source** : `_archive/game-review-modularization.md` (outillage tests livré ;
  propositions de refactor non appliquées).
- **Reste à faire** : découper les **god-files restants** (7 fichiers > 950 lignes)
  et **documenter les ~19 modules** non couverts par la doc.
- **Étapes** :
  1. Prioriser un god-file à la fois (ne pas tout refactorer d'un coup).
  2. Extraire par responsabilité, conserver le scope global (`<script>` séquentiels)
     → vérif : ajouter le nouveau module à `index.html` **et** au MANIFEST loader.
  3. `node tests/smoke.js` vert avant/après chaque découpe + bump cache.

### 6.2 code-review-tasks — N15 (factoriser `showEquipMenu` duo) — **P3 (optionnel)**
- **Source** : `_archive/code-review-tasks.md` (15/16 items livrés).
- **Reste à faire** : factoriser le chemin duo de `showEquipMenu` (inventory.js).
- **Étape** : refactor local + smoke vert + bump cache. À coupler éventuellement
  avec une future itération de la fiche perso.

### 6.3 identify-useful-skills — hook commit+push — **P3 (meta)**
- **Source** : `_archive/identify-useful-skills.md` (skills créées ; hook en attente).
- **Reste à faire** : configurer le **hook settings.json** « commit + push » qui
  n'a pas pu être posé en session (cf. skill `update-config`).
- **Étape** : ajouter le hook → vérif : déclenchement effectif sur l'événement visé.

---

## Plans laissés actifs (NON archivés — cœur non livré)

Pour mémoire, ces plans restent dans `.claude/plans/` car leur cœur n'est pas
implémenté (ne pas confondre avec les reliquats ci-dessus) :

- `parallel-worlds.md` — design rédigé, 0 code runtime.
- `ch05-ch08-implementation.md` + `ch05-ch08-narrative-finalization.md` — narratif
  écrit, implémentation technique à mener.
- `content-audit-stabilization.md` — PR #2-#5 (tranches étage 8-10) à livrer.
- `deathly-hallows-easter-egg.md` — phases 1-5 non implémentées.
- `dungeon-map-expansion.md` — étapes 1-5 non démarrées.
- `immersion-suite-3.md` — bloc G amorcé (G1), blocs H/I/J à faire.
- `session-launch-prompts.md` — prompts de démarrage de chantiers (vivant).
- `balance-proposals-2026-05.md` — propositions chiffrées, non implémentées.

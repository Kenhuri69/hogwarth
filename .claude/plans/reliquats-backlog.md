# Backlog des reliquats hors-scope (tracker vivant)

> Plan consolidé créé le **2026-06-08** lors de l'archivage en masse des plans
> terminés. Chaque entrée correspond à un plan dont le **cœur est livré et
> archivé** dans [`_archive/`](./_archive/), mais qui traînait un **reliquat
> explicitement hors-scope** (reporté / « V2 » / optionnel / bloqué). Le détail
> source de chaque reliquat reste consultable dans le plan archivé référencé.
>
> Format par entrée : **Source** (plan archivé) · **Reste à faire** · **Étapes
> → vérification** · **Priorité**. Cocher et dater au fil de l'implémentation
> (guidelines §4/§5). Quand un reliquat est livré, le rayer ici (section
> « Reliquats clos » en bas) et, si pertinent, ouvrir un plan dédié.

> 🔄 **Tracker vivant** — re-vérifier l'état réel dans le code **avant**
> d'attaquer un item ; cet en-tête peut s'être périmé. Mettre à jour le tableau
> de bord ci-dessous à chaque livraison.

---

## Tableau de bord (audit 2026-06-12)

| # | Item | État | Priorité |
|---|------|------|----------|
| 1.1 | Potions multi-cibles & usage ennemi | ✅ Clos | — |
| 1.2 | Forge T5 + Bibliothèque T5 (livrés) | ✅ Clos | — |
| 1.3 | House post-tier-18 — forge (C) / reroll (D) | ❌ Ouvert | P2 |
| 2.1 | Manon — dialogues Acte III finalisés | ✅ Clos | — |
| 2.2 | Elfe de maison libre (easter-egg) | ⚠️ Cœur **non livré** → cf. plans actifs | — |
| 3.1 | emoji-png-gaps lots 7-10 | ✅ Clos (laissé sciemment) | — |
| 3.2 | combat-emoji-badges Lot 2/3 | ✅ Clos | — |
| 3.3 | Room of Requirement V3.1 | ✅ Clos | — |
| 4.1 | Duel PvP — async (livré) + live relayé (livré) | ✅ Clos | — |
| 4.2 | Validation live 2 clients (S3.10) | ⛔ Bloqué (manuel) | P-bloqué |
| 5.1 | Musiques combat epic / late | ✅ Clos (assets reçus) | — |
| 6.1 | Modularisation god-files (6 fichiers > 950 l.) | ❌ Ouvert | P2 |
| 6.2 | Factoriser `showEquipMenu` duo (N15) | ✅ Clos | — |
| 6.3 | Hook settings.json « commit + push » | ❌ Ouvert | P3 |

**Reliquats encore actionnables** : 1.3, 6.1, 6.3. — **Bloqué** : 4.2
(session live manuelle). — **Clos** : 1.1, 1.2, 2.1, 3.1, 3.2, 3.3, 4.1,
5.1, 6.2 (récapitulés en bas).

> ⚠️ **Correctif d'audit 2026-06-12** vs l'audit précédent (2026-06-11) :
> - **5.1** musiques de combat : les OGG `combat_epic` / `combat_late` sont
>   **présents** dans `audio/` (livrés 2026-06-04) — l'item n'est plus bloqué,
>   il est **clos** (câblage `_combatSampleKey` déjà en place).
> - **2.2** elfe de maison libre : le plan source
>   [`free-house-elf-easter-egg.md`](./_archive/free-house-elf-easter-egg.md)
>   est en réalité une **proposition non implémentée** (en-tête « proposition
>   (non implémenté) ») — aucun NPC/levier en code. Ce **n'est donc pas un
>   reliquat** (cœur absent) ; il rejoint les « plans laissés actifs » en bas.
>   Seul l'acquis préexistant est le monstre `elfe_rebelle` (cible de l'egg).
> - **6.2** `showEquipMenu` duo : **livré** le 2026-06-12.

---

## Légende priorité
- **P1** — valeur joueur claire, faible risque, prêt à coder.
- **P2** — valeur réelle mais design à arbitrer ou effort moyen.
- **P3** — cosmétique / optionnel / confort dev.
- **P-bloqué** — dépend d'un asset/décision externe (utilisateur, backend, live).

---

## Reliquats actifs

### 1.3 House post-tier-18 — Piste C (forge d'amélioration) & Piste D (reroll) — ❌ **OUVERT** · P2
> Vérifié 2026-06-12 : **aucun code** de reroll/enchant/forge légendaire lié aux
> Maisons (`grep reroll|enchant|upgrade legendary` → 0 match en `js/`).
> `house-donation.js` n'adresse que le don d'or pur.
- **Source** : `_archive/house-post-tier-18.md` (pistes C/D renvoyées à plans séparés).
- **Reste à faire** : **Piste C** — forge d'amélioration d'équipement légendaire ;
  **Piste D** — reroll d'enchantement (gold-sink endgame complémentaire au don Maison).
- **Étapes** :
  1. Spécifier C et D séparément (ce sont deux features) → vérif : mini-design
     écrit dans ce fichier ou un plan dédié avant code.
  2. Implémenter le gold-sink en réutilisant `house-donation` comme modèle d'UI.
  3. Sim économie (ne pas casser l'équilibre or endgame) → vérif : rapport sim.
  4. Scénario smoke + bump cache.

### 4.2 Validation live 2 clients (S3.10) — ⛔ **P-bloqué**
- **Source** : `_archive/parallel-worlds-stabilization.md` (S1-S4 livrés ; S3.10 manuel).
- **Reste à faire** : **validation end-to-end live** à 2 clients réels contre le
  backend Supabase (protocole `tests/parallel-live-checklist.md`).
- **Action** : exécuter la checklist manuelle (hors suite smoke). Non codable —
  cocher quand la session live a été menée.

### 6.1 Modularisation des god-files — ❌ **OUVERT** · P2
> Vérifié 2026-06-12 (`wc -l js/*.js`) : **6 fichiers > 950 lignes** —
> `monsters.js` (2099), `npcs.js` (1474), `battle.js` (1230), `icons.js` (1227),
> `battle-spells.js` (1085), `movement-interactions.js` (983). Aucune découpe
> effectuée depuis le plan archivé.
- **Source** : `_archive/game-review-modularization.md` (outillage tests livré ;
  propositions de refactor non appliquées).
- **Reste à faire** : découper les god-files restants et **documenter les
  modules** non couverts par la doc.
- **Étapes** :
  1. Prioriser un god-file à la fois (ne pas tout refactorer d'un coup).
  2. Extraire par responsabilité, conserver le scope global (`<script>` séquentiels)
     → vérif : ajouter le nouveau module à `index.html` **et** au MANIFEST loader.
  3. `node tests/smoke.js` vert avant/après chaque découpe + bump cache.

### 6.3 identify-useful-skills — hook commit+push — ❌ **OUVERT** · P3 (meta)
> Vérifié 2026-06-12 : `.claude/settings.json` ne contient qu'un hook
> `PreToolUse` (deps de test) ; aucun hook commit+push dans `settings.json` ni
> `settings.local.json`.
- **Source** : `_archive/identify-useful-skills.md` (skills créées ; hook en attente).
- **Reste à faire** : configurer le **hook settings.json** « commit + push »
  (cf. skill `update-config`).
- **Étape** : ajouter le hook → vérif : déclenchement effectif sur l'événement visé.

---

## Reliquats clos (récapitulatif)

> Conservés pour mémoire/traçabilité. Ne plus traiter — le cœur **et** le
> reliquat sont livrés (ou le reliquat est un choix de style assumé).

- ~~**1.2 Forge T5 + Bibliothèque T5**~~ — ✅ livré 2026-06-13. Forge T5 livré
  antérieurement (`forge-t5.md`). Volet **Bibliothèque T5** : amplification des
  sorts +5→+8, niveaux 6-8 gatés par l'**Essence Primordiale** (matériau premium
  partagé avec la Forge, déjà vendu par l'Apothicaire Ténébreux). Règle de coût
  reprise des tables existantes (gold Biblio = 1,5 × Forge, pages = essence
  Forge, même Primordiale). Effet combat inchangé (`_spellForCaster` déjà
  compatible 6-8). Plan [`library-t5.md`](./library-t5.md), smoke `library`/audit
  étendus. **Hors-scope assumé** : nouveaux sorts *débloquables* à la Bibliothèque
  (elle amplifie, n'enseigne pas — l'apprentissage reste level-up/grimoires/
  `grantsSpell`) — feature distincte à rouvrir si désirée.
- ~~**4.1 Duel PvP direct**~~ — ✅ livré 2026-06-13. (a) **Async** déjà livré :
  défier le snapshot/fantôme d'un autre joueur (`mpStartDuel`, `_mpHeroToEnemy`,
  IA + butin Ironman, `scenarioMultiplayerDuel`). (b) **Live relayé** (variante
  demandée) : duel 1v1 entre deux joueurs en ligne en tours alternés, résolution
  « attaquant autoritaire » (chacun résout son action et relaie le résultat ;
  écrans synchronisés sans lockstep ni RNG partagée). Module autonome
  `js/pvp-duel.js` + `css/pvp-duel.css`, lancé depuis une visite active
  (réutilise le canal `mp_visit_messages`). Plan
  [`pvp-duel-live.md`](./pvp-duel-live.md). Smoke `scenarioPvpDuel`. Hors-scope
  V2 : garde/statuts en duel, objets, 2v2, défi hors visite, score/ELO.
- ~~**2.1 Manon — dialogues définitifs de l'Acte III**~~ — ✅ livré 2026-06-13.
  Payoff `manon_acte3.questReady` enrichi (climax : réconciliation avec la mère
  morte, miroir du père aux Actes I-II) ; tous les commentaires « Textes
  provisoires » retirés (`npcs.js`, `data.js`, `npcs-helpers.js`,
  `quests-riddles.js`). Pages/rumeurs déjà abouties conservées. Plan dédié
  [`manon-acte3-dialogues.md`](./manon-acte3-dialogues.md). Smoke npc/manon vert.
- ~~**1.1 Potions multi-cibles & usage ennemi**~~ — ✅ livré. Flacons AOE
  (`data.js` `aoe:true`, `throwItemAoe` dans `battle.js`) + potions ennemies à
  charges (`tryEnemyAbility case 'consumable'`). Plan
  [`potions-aoe-enemy-use.md`](./_archive/potions-aoe-enemy-use.md), smoke
  `scenarioPotionAoeAndEnemyUse`.
- ~~**3.1 emoji-png-gaps lots 7-10**~~ — ✅ clos. L'Atelier est converti en PNG ;
  le résiduel (cartes cosmétiques/souvenirs, labels `specialAction` PNJ, logs
  d'atelier) était **« laissé sciemment »** (icônes abstraites, choix de style).
  À ne rouvrir que sur demande explicite « zéro emoji absolu ».
- ~~**3.2 combat-emoji-badges Lot 2/3**~~ — ✅ livré. `iconizeCombatLog` + table
  (`item-icons.js`) au journal ; 9 PNG du Lot 3 dans `img/icons/` ; badges
  buff/résistance en PNG ([`combat-buff-badges.md`](./_archive/combat-buff-badges.md)).
- ~~**3.3 Room of Requirement V3.1**~~ — ✅ livré. C1 trophées + 6 PNG
  (`img/icons/requirement/eclat_*.png`), C2 choix du thème, C3 bonus méta,
  C4 onglet Atelier « Salle ». Scénario `scenarioRoomOfRequirement` T1–T14.
- ~~**5.1 Musiques de combat (epic / late)**~~ — ✅ clos 2026-06-12. Les OGG
  `audio/combat_epic.ogg` et `audio/combat_late.ogg` sont présents (livrés
  2026-06-04) ; câblage `_combatSampleKey` (audio-music.js) déjà en place. Le
  blocage « en attente des MP3 » est levé.
- ~~**6.2 code-review-tasks N15 — `showEquipMenu` duo**~~ — ✅ livré 2026-06-12.
  Helpers `_equipMenuPanel` + `_equipRingButtons` extraits (`inventory.js`),
  3 variantes inline dé-dupliquées sans changement de rendu. Plan
  [`refactor-equip-menu.md`](./_archive/refactor-equip-menu.md).

---

## Plans laissés actifs (NON archivés — cœur non livré)

Pour mémoire, ces plans restent dans `.claude/plans/` (ou y mériteraient un
retour) car leur cœur n'est **pas** implémenté — ne pas confondre avec les
reliquats ci-dessus :

- **Elfe de maison libre (Dobby & la chaussette)** — `_archive/free-house-elf-easter-egg.md`
  est une **proposition non implémentée** (malgré son emplacement dans
  `_archive/`). Aucun NPC/levier en code ; seul l'acquis préexistant est le
  monstre `elfe_rebelle`. À traiter comme un easter-egg **à construire** (pas un
  reliquat éditorial).
- `parallel-worlds.md` — design rédigé, 0 code runtime.
- `ch05-ch08-implementation.md` + `ch05-ch08-narrative-finalization.md` — narratif
  écrit, implémentation technique à mener.
- `content-audit-stabilization.md` — PR #2-#5 (tranches étage 8-10) à livrer.
- `deathly-hallows-easter-egg.md` — phases 1-5 non implémentées.
- `dungeon-map-expansion.md` — étapes 1-5 non démarrées.
- `immersion-suite-3.md` — bloc G amorcé (G1), blocs H/I/J à faire.
- `session-launch-prompts.md` — prompts de démarrage de chantiers (vivant).
- `balance-proposals-2026-05.md` — propositions chiffrées, non implémentées.

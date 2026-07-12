# Revue de design 2026-07 — Cohérence, linéaire narratif, farming, upgrades & arbre de compétences

> **Plan vivant** (guidelines §5) — branche `claude/game-design-review-amkza5`.
> Date : 2026-07-10 · Méthode : revue complète des fonctionnalités (4 audits
> parallèles : narration↔code, Forge/Bibliothèque/artefacts, endgame/farming,
> cohérence transverse) croisée avec `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md`
> (2026-06, phases 1-4 closes) et `docs/histoire/` + `docs/gameplay/`.
>
> **Ce document est un plan d'exécution** : chaque chantier se termine par des
> tâches ordonnées avec critères de vérification (§4 des guidelines). Aucun
> code n'est modifié par ce commit — les lots seront lancés séparément.
>
> Légende : ✅ acquis dans le code · ⚠️ trou de cohérence identifié ·
> 💡 proposition de ce plan · ❓ à valider avant code.

---

## Sommaire

- [Partie I — Revue des fonctionnalités & trous de cohérence](#partie-i)
- [Partie II — Linéaire d'exécution de l'histoire (fil d'Ariane)](#partie-ii)
- [Partie III — Prolongation du jeu dans les étages profonds : « Les Cycles du Dormeur »](#partie-iii)
- [Partie IV — Nouvelle mécanique de farming : « Les Traques Rituelles »](#partie-iv)
- [Partie V — Refonte des choix d'upgrade sorts & artefacts (dé-lock puissance/coût)](#partie-v)
- [Partie VI — Arbre de compétences « L'Éveil du Sorcier » (Maison × Classe)](#partie-vi)
- [Partie VII — Ordonnancement des lots d'exécution](#partie-vii)

---

<a name="partie-i"></a>
# PARTIE I — Revue des fonctionnalités & trous de cohérence

## 1.1 État des lieux (synthèse de la revue)

Le jeu est **structurellement complet et remarquablement fidèle à sa doc**
(constat déjà posé par la revue de juin : « le projet n'a pas un déficit de
systèmes »). La colonne vertébrale (descente 1→10, verrou `victoryAchieved`,
Boucle 11+, Ruines 14+, Briser le Cycle) est câblée, testée (227 scénarios
smoke, 684 units) et équilibrée par simulation. Les trous restants ne sont
pas des systèmes manquants mais des **coutures** : identité des héros non
branchée sur la progression, guidage linéaire absent avant la victoire,
plafonds de puissance atteints trop tôt en Boucle profonde, et quelques
dérives doc↔code résiduelles.

## 1.2 Trous de cohérence — registre complet

### A. Narration & linéaire (détail en Partie II)

| # | Trou | Localisation | Gravité |
|---|------|--------------|---------|
| ⚠️ A1 | **La chaîne d'escorte narrative force à REMONTER** : Dumbledore n'a qu'un placement (étage 1, `js/npcs-a.js:14`) mais porte toute la chaîne `dumbledore_*` + `eclats_clef_voute` (`prereq` en cascade, remise à l'étage 1). Le commentaire narratif de la descente se joue en backtracking — contredit le thème « descendre à contre-courant ». | `js/npcs-a.js:14-24`, `js/quests-templates.js` | 🔴 Haute |
| ⚠️ A2 | **Aucun fil d'Ariane pré-victoire** : le quest-tracker (`js/ui.js:571-602`) affiche toutes les quêtes sans distinguer de « quête principale » ; la descente n'étant pas une quête, aucun objectif « atteindre l'étage 10 / vaincre Voldemort » n'est visible. La boussole d'endgame (`js/endgame.js:162-259`) n'existe qu'après victoire. | `js/ui.js`, `js/endgame.js` | 🔴 Haute |
| ⚠️ A3 | **Étages muets** : aucun beat scénarisé aux étages 2, 3, 5, 6, 7, 9 (pré-victoire) ni **11-13** (début de Boucle — la doc promet une « narration continue », le code livre des one-shots aux ét. 15 et 21 seulement). | `js/floor-ambiance.js:557-627` | 🟠 Moyenne |
| ⚠️ A4 | **Toast de signature avant le donneur** : `HOUSE_SIGNATURE_FLOORS` = {gryff:2, slyth:4, raven:2, pouf:2} (`js/quests.js:73-75`) mais Flitwick est à l'ét. 6 et Chourave à l'ét. 3 → le toast « Quête Signature disponible » s'affiche avant que le donneur soit atteignable (raven/pouf). | `js/quests.js:73-75`, `js/npcs-a.js:847,902` | 🟡 Basse |
| ⚠️ A5 | **Beats documentés non implémentés** (déjà marqués ❓/💡 dans la doc, à trancher formellement) : PNJ allié au climax (Sirius, 03 §3.5) ; objectifs de signature « neufs » (sans-fuite 🦁, raccourcis 🐍, escorte 🦡) livrés en proxys kill/item ; Reliques de la Mort non liées en méta-objectif. | 03, 04, 08 | 🟡 Basse |

### B. Progression du personnage & identité

| # | Trou | Localisation | Gravité |
|---|------|--------------|---------|
| ⚠️ B1 | **Table de sorts de level-up hardcodée Harry/Hermione** : `_grantLevelSpells` (`js/battle-rewards.js:360-420`) enseigne la même courbe de sorts aux **16 héros** du roster, quel que soit leur rôle. Un tank Poufsouffle apprend Accio/Diffindo/Avada comme Harry. Le plus gros écart identité↔progression du jeu. | `js/battle-rewards.js:360-420` | 🔴 Haute |
| ⚠️ B2 | **`class`/`role` mécaniquement orphelins** : les 16 héros ont des champs `class` (= Maison canon) et `role` (Auror, Ombremancien, Gardienne-Herboriste…) dans `js/data-characters.js`, mais **aucune branche de code ne lit `role`** pour un effet de gameplay. | `js/data-characters.js` | 🔴 Haute (résolu par la Partie VI) |
| ⚠️ B3 | **Passifs éparpillés sans surface UI unifiée** : paliers Maison + passif Apothéose + `legendaryPassive` + sets 2/3/4 pièces + souvenirs Outremonde + Faveur de la Salle + maîtrises diverses — 6+ sous-systèmes de « talents » aux conventions différentes, jamais présentés ensemble au joueur. | `js/state.js`, `js/main.js:489-500,652`, `js/data-world.js:48-67` | 🟠 Moyenne (résolu par la Partie VI) |
| ⚠️ B4 | **Codex « zéro puissance » légèrement enfreint** : `_applyRequirementMetaBonus` (`js/main.js:652`) dérive un bonus de départ des thèmes de Salle sur Demande découverts. À assumer et documenter (ou re-classer « Faveur de la Salle » hors-Codex). | `js/main.js:652`, doc 13 §13.3.4 | 🟡 Basse |

### C. Systèmes d'upgrade (détail en Partie V)

| # | Trou | Localisation | Gravité |
|---|------|--------------|---------|
| ⚠️ C1 | **Voie d'upgrade verrouillée à vie** : `item.forgePath` (`js/forge.js:287`) et `char.spellPaths[name]` (`js/library.js:139`) sont figés au 1ᵉʳ upgrade, **aucun respec** — le joueur est locké sur puissance OU crit (Forge), puissance OU maîtrise (Biblio) pour les niveaux 2→8. | `js/forge.js`, `js/library.js` | 🔴 Haute |
| ⚠️ C2 | **Anomalie « legacy combiné »** : un sort upgradé avant l'ajout des voies (pas de `spellPaths`) cumule les DEUX effets (`js/battle-spells.js:1412`) — strictement supérieur aux voies pures. | `js/battle-spells.js:1395-1414` | 🟠 Moyenne |
| ⚠️ C3 | **Seulement 2 axes par système** (power/crit, power/focus) et **3 résolveurs d'artefact** (`elemBurst`/`purgeStatus`/`shieldGroup`, `js/battle.js:932-968`) : espace de build étroit ; les vrais leviers (synergies signature, corruption, sets) vivent hors des systèmes payants. | `js/forge.js`, `js/library.js`, `js/battle.js` | 🟠 Moyenne |
| ⚠️ C4 | **Sink mort post-+8** : une fois Forge/Biblio au cap (+8), plus rien ne consomme Essence/Pages (hors reroll d'enchant à l'or) — la boucle de purge perd son débouché. | `js/forge.js:18`, `js/library.js:22` | 🟠 Moyenne (résolu par les Parties III/IV) |

### D. Endgame & étages profonds (détail en Partie III)

| # | Trou | Localisation | Gravité |
|---|------|--------------|---------|
| ⚠️ D1 | **Mur mathématique par palier** : scaling ennemi super-exponentiel (`endgameScalDelta(n) = 0.8 + 0.2(n−1)` appliqué `n` fois, `js/dungeon-scaling.js:34-38`) contre progression joueur linéaire/plafonnée → cliff mesuré 62 %→27 % de win-rate entre les étages 20 et 21 ; ~étage 40-50 = infranchissable même suréquipé. Cohérent avec l'intention « treadmill », mais la **marche** (cliff au changement de palier) est brutale. | `js/dungeon-scaling.js` | 🟠 Moyenne |
| ⚠️ D2 | **Contenu qualitatif épuisé au-delà de l'étage ~25** : variantes de Boucle plafonnées à n=5 (`LOOP_VARIANT_TIERS`, aucune mutation après l'étage 51) ; jalons d'Éclats stoppés à 15 (`ECLAT_MILESTONES=[5,10,15]`, `js/movement-floors.js:296`) ; un seul boss endgame récurrent (`reflet_mythe`) + Gardiens ét. 17 ; zone D `[21,null]` uniforme après le beat « Battement » (ét. 21). | `js/dungeon-scaling.js:168`, `js/movement-floors.js`, `js/break-cycle.js` | 🔴 Haute |

### E. Ressources & vocabulaire

| # | Trou | Localisation | Gravité |
|---|------|--------------|---------|
| ⚠️ E1 | **Deux « Éclats » homonymes** : `eclat_voute` (3 Éclats canon narratifs, zéro puissance) vs `accumulatedEclats` (Éclats de Boucle, prestige, jalon Briser le Cycle). Sémantiques opposées, nommage quasi identique. | `js/state.js:879-906`, doc 03/08/11 | 🟠 Moyenne |
| ⚠️ E2 | **Deux « pages de grimoire »** : `page_grimoire` (matériau Bibliothèque) vs `player.grimoirePages` (pages d'Élara, quête narrative, `js/main.js:533`). | `js/data-items.js`, `js/main.js` | 🟡 Basse |

### F. Dérives doc↔code résiduelles

| # | Dérive | Fichier à corriger |
|---|--------|---------------------|
| ⚠️ F1 | Doc 13 §13.2.3 documente l'ANCIEN scaling (`scalDelta=0.5`, `baseFix {hp:80…}`, « ×~1.5/palier ») ; code réel : `scalDelta=0.8 + growth 0.2`, `baseFix ×1.4`. | `docs/histoire/13-…md` §13.2.3 |
| ⚠️ F2 | Doc 05 (§5.0, §5.4.2) et doc 13 §13.3.2 disent « **6 héros** » ; le code en a **16** (`js/data-characters.js`). | `docs/histoire/05-…md`, `13-…md` |
| ⚠️ F3 | Renvois `CHARACTERS` → `js/data.js` alors que le registre vit dans `js/data-characters.js` (doc + skill `add-playable-character` + CLAUDE.md §« Ajouter un personnage »). | docs, `.claude/skills/` |
| ⚠️ F4 | `js/dungeon-scaling.js` (en-tête) référence `.claude/plans/dark-loop-scaling-review.md` qui n'existe plus (archivé) — pointer `_archive/`. | `js/dungeon-scaling.js` |
| ⚠️ F5 | Doc 01 §1.4 place Dolohov « en milieu » vs 03/04 + code (ét. 10). | `docs/histoire/01-…md` |

---

<a name="partie-ii"></a>
# PARTIE II — Linéaire d'exécution de l'histoire (fil d'Ariane)

**Objectif** : que le joueur soit **porté** d'un beat au suivant du Prologue au
climax, sans jamais remonter à contre-sens, tout en respectant les deux
garde-fous cardinaux : *une seule colonne obligatoire* (descendre → Voldemort)
et *fin ouverte, aucune branche d'arc* (04 §4.7, 14).

## 2.1 Le linéaire cible (référence unique)

```
PROLOGUE   Intro Dumbledore (Clé de Voûte fêlée) → choix de Maison → intro_tutoriel
ACTE I     ét. 1-3   beat ét.1 ✅ · signature 🦁🦅🦡 s'amorce · 1ᵉʳ Éclat canon (Peeves)
   └─ 💡 NOUVEAU jalon tracké : « La Descente I — Atteindre les Cachots (ét. 4) »
ACTE II    ét. 4-6   beat ét.4 ✅ (« la Clé scellait deux maux ») · signature 🐍 s'ouvre
   └─ 💡 jalon : « La Descente II — Atteindre les Profondeurs (ét. 7) » · 2ᵉ Éclat (Loup-Garou)
ACTE III   ét. 7-10  beat ét.8 ✅ (Veilleur) · 💡 beat ét.9 (Voldemort Affaibli) · 3ᵉ Éclat
   └─ 💡 jalon : « La Descente III — Percer le secret du 10ᵉ étage »
CLIMAX     ét. 10    voldemort_revenu → victoryAchieved ✅ → cinématique + variantes 5 axes ✅
ACTE IV    ét. 11+   Gardien de la Boucle · 💡 beats ét.11-13 · Ruines 14+ · Chambres 17
   └─ boussole d'endgame ✅ (déjà le bon modèle de guidage)
VRAIE FIN  Briser le Cycle (jalons I-IV) ✅ → cycleBroken
PROLONGE   💡 Cycles du Dormeur 21+ (Partie III)
```

## 2.2 Chantier N1 — Quête principale visible « La Descente »

💡 Créer une **quête principale trackée, non-gating**, toujours en tête du
quest-tracker avec un style distinct (bordure or, icône 🧭) :

- Modèle : réutiliser `QUEST_TEMPLATES` avec un flag `main: true` + objectif
  `type:'floor'` (déjà supporté). 4 étapes chaînées (`prereq`) :
  `descente_1` (ét. 4) → `descente_2` (ét. 7) → `descente_3` (ét. 10) →
  `descente_finale` (kill `voldemort_revenu`).
- Auto-acceptée à la fin de l'intro (comme `intro_tutoriel`), auto-remise
  (pas de retour PNJ — la remise EST la descente ; récompense légère xp/or).
- Le tracker (`js/ui.js:571-602`) épingle la quête `main` en premier avec son
  libellé d'étape courant ; le reste du tracker est inchangé.
- Post-victoire, la quête principale disparaît au profit de la boussole
  d'endgame ✅ existante (aucun doublon de guidage).

**Vérification** : nouveau scénario smoke `scenarioMainQuestTracker` (la
quête est visible dès l'intro, progresse à l'entrée d'étage 4/7/10, se clôt
sur la victoire, absente post-victoire) ; garde-fou : `goDeeper()` inchangé
(aucun gate ajouté).

## 2.3 Chantier N2 — Portraits-relais de Dumbledore (fin du backtracking)

💡 Résoudre A1 **sans déplacer le PNJ** : dans le canon HP, les portraits
voyagent entre leurs cadres. On ajoute des **portraits-relais** de Dumbledore
aux étages **4, 7 et 10** (mêmes dialogues d'état, même `questsGiven`) :

- Implémentation : `npcs-a.js` — 3 placements supplémentaires du même
  `id: 'dumbledore'` OU (plus sûr pour `getNpcById`) 3 PNJ légers
  `dumbledore_relais_{4,7,10}` avec `sprite:'fantome'`/portrait identique et
  **délégation** : leurs `questsGiven`/dialogues pointent la même chaîne — la
  remise de `dumbledore_*` et `eclats_clef_voute` devient possible au relais
  le plus proche. ❓ à trancher au lot : multi-placement vs PNJ délégués
  (le multi-placement demande d'auditer `npcPlacements`, la délégation est
  purement additive).
- Narratif : 1 ligne de flavor par relais (« Je descends de cadre en cadre,
  comme toi d'escalier en escalier. »).
- La chaîne d'escorte garde ses `prereq`, mais chaque maillon devient
  remettable **à l'étage de sa cible ou en dessous** — le fil narratif suit
  la descente au lieu de la contredire.

**Vérification** : scénario smoke — accepter `dumbledore_eveil` à l'ét. 1,
tuer la cible à l'ét. 4, remettre au relais ét. 4 **sans remonter** ;
`getNpcsForFloor(4)` contient le relais ; la voix/les récompenses sont
identiques au chemin historique.

## 2.4 Chantier N3 — Combler les étages muets

💡 Étendre `FLOOR_SCRIPTED_BEATS` (`js/floor-ambiance.js:557-586`) — données
pures, zéro moteur :

| Étage | Beat (one-shot, 1ʳᵉ entrée) | Fil qu'il tire |
|-------|------------------------------|----------------|
| 7 | « Le Poudlard que tu connais s'arrête ici. » (entrée tranche C, complète la transition 6↔7) | géologie des strates |
| 9 | Souffle de Voldemort Affaibli — « Quelque chose d'incomplet te cherche. » | monte le climax |
| 11 | Rencontre du Gardien de la Boucle mise en scène (toast long + bark `loopEcho`) | ouvre l'Acte IV (candidat déjà noté 04 §4.4 ❓) |
| 12-13 | 2 beats courts « la Boucle apprend / la Boucle se souvient » | comble le trou 11→15 |

+ 4-6 lignes `floorLines` supplémentaires pour les étages 2/3/5/6 (ambiance,
pas des beats) afin qu'aucun étage pré-climax ne soit totalement générique.

**Vérification** : `node tests/units.js` (les beats sont des données pures
testables) + scénario existant de beats étendu ; re-lecture doc 04 §4.4 pour
marquer l'❓ « étages-scènes » comme tranché (étages 1/4/7/8/9/11/15/21).

## 2.5 Chantier N4 — Micro-fixes de couture narrative

- A4 : aligner `HOUSE_SIGNATURE_FLOORS` sur l'étage réel des donneurs
  (raven: 2→6 ? ou déplacer le toast à l'étage du donneur — ❓ trancher :
  la 1ʳᵉ stèle de Rowena à l'ét. 2 est canon dans la doc 04, donc plutôt
  **différer le toast** au moment où le donneur devient atteignable).
- A5-Sirius : version minimale du « PNJ allié au climax » — **intervention
  one-shot scriptée** (au passage sous 50 % PV du groupe, Sirius lance un
  soin/dissipation unique + réplique), pas un combattant complet. ❓ à valider.
- E1/E2 : renommage d'affichage (pas des ids) — « Éclats de la Voûte » (canon)
  vs « **Résidus de Boucle** » (prestige) ; « Pages de grimoire » (matériau)
  vs « **Feuillets d'Élara** » (narratif). Ids/serialization inchangés,
  seulement les libellés UI + doc.
- F1→F5 : passes de réconciliation doc (aucun code).

---

<a name="partie-iii"></a>
# PARTIE III — Prolongation du jeu dans les étages profonds : « Les Cycles du Dormeur »

**Proposition forte et structurée** pour donner aux étages 21+ (et 31+, 41+…)
une **structure décennale** répétable, narrativement ancrée sur le Dormeur des
Fondations (canon : on s'en **approche sans jamais l'atteindre** — 10 §10.3,
11 §11.7.3), et mécaniquement alimentée par les Parties IV-VI.

## 3.1 Constat chiffré (audit)

- Le scaling par palier `n` (`endgameTierIndex`) applique `n` fois
  `stat·scal(n)+fixEff` avec `scal` croissant (`+0.2/palier`) → **cliff**
  à chaque frontière ×10 (win-rate Duo mesuré : 62 % ét. 20 → 27 % ét. 21).
- Côté joueur : Forge/Biblio **murées à +8**, ★N **quadratique**
  (`45000+15000N+1000N²`) sur revenu d'or linéaire, niveaux asymptotiques
  (`xpNext ×1.6`), jalons d'Éclats stoppés à **15**, variantes plafonnées à
  **n=5** → au-delà de l'étage ~25 le jeu n'offre plus **rien de neuf**, et
  au-delà de ~40-50 plus rien de **possible**.

## 3.2 La structure : un « Cycle » = 10 étages, 4 temps

Chaque tranche de 10 étages post-victoire (n = `endgameTierIndex`) devient un
**Cycle du Dormeur** avec un squelette fixe (données, pas de moteur neuf —
mêmes patterns que `_ensureChamberGuardiansPresent`) :

| Temps | Étages (relatifs au Cycle) | Contenu |
|-------|---------------------------|---------|
| **Seuil** | x1 (21, 31, 41…) | Beat scénarisé « Strate du Rêve n » + toast solennel ; le Battement s'accélère d'un cran (SFX existant). Le Gardien de la Boucle (recyclé) donne le **Contrat de Cycle** (voir 3.4). |
| **Épreuve** | x5 (25, 35…) | 1 **Poche du Sceau garantie** (réutilise `escape-pocket.js`, tirage forcé au 1ᵉʳ piège de l'étage) — variante « profonde » : budget −10 %, récompense ×1.5. |
| **Gardien** | x9 (29, 39…) | 💡 **Veilleur du Cycle** : boss de palier garanti (1 nouveau monstre epic par archétype, 3-4 archétypes réutilisés en rotation avec variante de Boucle n) — placement garanti façon Gardiens des Fondateurs. Drop : Essence Primordiale + **Marques de Traque** (Partie IV) + 1 **Éclat de Transcendance** (3.5). |
| **Passage** | x0 (30, 40…) | Vaincre le Veilleur dé-scelle l'escalier du x0 (**seul nouveau gate, interne au Cycle** — ne touche pas la colonne pré-victoire) + jalon célébré. |

> ❓ Garde-fou à valider : le gate « Veilleur → escalier x0 » est une entorse
> douce à « rien ne gate l'escalier » — mais ce principe protège la **trame
> principale** (pré-victoire) ; en Boucle, Briser le Cycle exige déjà de
> vaincre `reflet_mythe`. Alternative sans gate : le Veilleur est optionnel
> mais son Éclat de Transcendance est la seule source du sink 3.5.

## 3.3 Escalade qualitative : variantes n=6→10

Étendre `LOOP_VARIANT_TIERS` + `_loopVariantAbilities`
(`js/dungeon-scaling.js:168,229`) :

| n | Nom | Nouvelle capacité BORNÉE (même philosophie que n≤5) |
|---|-----|------------------------------------------------------|
| 6 | Éveillé | `curse` (réduit le soin reçu 50 %, 2 tours, chance 0.14) |
| 7 | Onirique | vol de buff (variante offensive du `dispel` ✅ : l'ennemi s'approprie le buff dissipé) |
| 8 | Primordial | écho-invocation : 25 % d'invoquer 1 écho faible (cap `currentMaxGroupSize`) |
| 9 | Abyssal Profond | aura : +10 % dégâts du groupe ennemi tant que le porteur est vivant |
| 10 | Rêve du Dormeur | combine 2 capacités des rangs 6-9 (tirage déterministe) |

## 3.4 Adoucir le mur : de la marche à la pente

💡 **Lissage du cliff** (déjà ❓ doc 13 §13.5 Sim 4) : étaler l'application du
palier n sur les 3 premiers étages du Cycle — `scalDelta` effectif =
`scalDelta·(⅓, ⅔, 1)` aux étages x1/x2/x3 — **sans changer la cible** à x3+.
Calibration obligatoire : `tools/sim-difficulty.js --endgame` (nouveau flag
`--endgame-ramp`), cibles : ét. 21 remonte de ~27 % à ~40-45 % Duo, ét. 25+
inchangé.

## 3.5 Rouvrir la progression : la Transcendance (sink post-+8)

💡 Nouveau débouché **répétable** des matériaux une fois Forge/Biblio à +8 :

- **Transcender** un item/sort : +9 → +12, chaque cran coûte
  1 **Éclat de Transcendance** (drop exclusif des Veilleurs de Cycle) +
  Essence/Pages massives (20/28/36/44) + or. Gain par cran = même barème que
  la voie choisie (pas de nouveau multiplicateur).
- Effet systémique : la boucle purge→matériaux retrouve un débouché **indexé
  sur la profondeur** (il faut battre le Veilleur du Cycle n pour transcender
  au rang n) → la puissance re-suit la descente, le mur recule d'environ un
  Cycle par rang de Transcendance, **sans devenir infini** (cap +12 ; le
  treadmill reste un treadmill, mais 2-3 Cycles plus loin).

## 3.6 Jalons, prestige & narration 21+

- `ECLAT_MILESTONES` : étendre `[5,10,15]` → `[5,10,15,20,30,40,50]` avec
  titres profil (« Porteur d'Éclats », « Veilleur de Cycles »…) + entrées
  Codex « Mémoire des Boucles » (robinet `eclatMilestones` déjà sérialisé).
- Sous-paliers zone D : `ZONE_AMBIANCE.ancient.tiers` gagne 2 strates —
  **« Les Rêves du Dormeur »** (31-40 : la géométrie rejoue des souvenirs des
  4 Fondateurs, floorLines dédiées) et **« Le Seuil du Battement »** (41+ :
  le son meurt, le Battement est le seul repère). Le Dormeur n'est **jamais**
  un boss (canon préservé).
- 💡 ❓ **Classement de profondeur** hors-Ironman : colonne
  `deepest_loop_floor` au Hall of Fame (repli localStorage identique) — donne
  un but public au treadmill ★N.

**Vérification (lot complet)** : sim `--endgame` avant/après (cibles 3.4) ;
units pour `_loopVariantAbilities` n=6-10 et jalons ; smoke
`scenarioCycleVeilleur` (placement garanti, drop, dé-scellement) ;
`scenarioTranscendance` (gate par rang, coûts, cap +12) ; re-lecture doc 11/13.

---

<a name="partie-iv"></a>
# PARTIE IV — Nouvelle mécanique de farming : « Les Traques Rituelles »

**Objectif** : une boucle de farming **active et voulue** (farmer pour gagner
en puissance) qui ne dégénère pas — elle s'appuie sur le système de densité
existant (`floorKillCount`) en le transformant de punition pure en
**risque/récompense**.

## 4.1 Design

- **Donneurs** : pré-victoire, les **chefs de Maison** (déjà placés ét. 4-6) ;
  post-victoire, le **Gardien de la Boucle**. Chaque étage propose 1 **Traque**
  (contrat re-tirable) : « Abats N ✕ <monstre de l'étage> avant de quitter
  l'étage » (N = 3-5, monstre tiré du pool de l'étage, seedé).
- **Récompense** : des **Marques de Traque** 🏹 (nouvelle ressource, sérialisée)
  — 1 Marque par contrat + bonus indexé sur la densité : au stade
  `floorVisitLabel` « Maîtrisé » (n≥5) le contrat paie ×2, au stade
  « Ponceur/Cap » (n≥6) ×3. **Plus tu ponces, plus les combats durcissent
  (✅ existant) ET plus la Traque paie** — le grind devient un choix tactique.
- **Anti-dégénérescence** : cap de 2 contrats honorés par étage et par visite ;
  les Marques ne tombent **que** via contrat (pas de drop passif) ; les
  contrats ne créditent ni XP ni or au-delà du barème de quête standard.
- **Sinks des Marques** (liens systémiques) :
  1. **Arbre de compétences** (Partie VI) : 2ᵉ source de points d'Éveil.
  2. **Respec** Forge/Biblio (Partie V) : reforger une voie coûte des Marques.
  3. **Échange** chez le Gardien : Marques → Essence/Pages (taux défavorable,
     soupape anti-frustration).
- **Implémentation** : réutilise `QUEST_TEMPLATES` (objectif `kill` +
  `repeatable`), nouveau champ `reward.marques` ; compteur
  `hunterMarks` dans `state.js` (sérialisé) ; UI = ligne dans le dialogue
  des donneurs + compteur fiche perso. Pas de moteur neuf.

## 4.2 Équilibrage cible

| Source | Marques/heure estimées | Levier |
|--------|------------------------|--------|
| Jouer normalement (1 contrat/étage) | ~3-4 | descente |
| Farmer un étage au stade Maîtrisé | ~8-10 | densité ×2 |
| Farmer au Cap (n≥9, combats trio/quad) | ~12-15 | densité ×3, risque max |

Coûts (à calibrer par sim) : nœud d'arbre 3-8 Marques ; respec 5 Marques ;
échange 4 Marques → 1 Essence. `BalanceLog.record('traque', …)` en télémétrie.

**Vérification** : units (barème densité pur) ; smoke `scenarioTraque`
(contrat accepté → kills → Marques créditées ×mult densité → cap 2/visite) ;
table de calibration manuelle documentée ; sérialisation round-trip save/load.

---

<a name="partie-v"></a>
# PARTIE V — Refonte des choix d'upgrade sorts & artefacts

**Objectif** : « ne pas rester locké sur puissance ou coût ». Deux problèmes
distincts : (1) le **lock** (irréversibilité), (2) l'**étroitesse** (2 axes).

## 5.1 Dé-lock : le respec « Reforger la voie »

- Forge et Bibliothèque gagnent une action **« Reforger la voie »** sur tout
  item/sort de niveau ≥ 1 : change `forgePath`/`spellPaths[name]` en
  conservant `upgradeLevel`. Coût : or (≈ 40 % du cumul investi) + 5 Marques
  de Traque (Partie IV) — disponibilité dès le 1ᵉʳ upgrade, répétable.
- **Migration legacy (C2)** : à la première interaction Forge/Biblio d'un
  item/sort « combiné » (upgradé pré-C3b, sans voie), proposer le choix d'une
  voie avec **+1 niveau gratuit** en compensation ; à défaut d'interaction,
  le comportement runtime actuel persiste (zéro nerf silencieux). ❓ valider
  la compensation exacte.

## 5.2 Élargir : 4 voies par système

Voies additionnelles (mêmes patterns d'application, `_spellForCaster` /
`forgeBonus` étendus) — budgets calibrés pour équivaloir aux voies actuelles :

**Forge (`forgePath`)** :
| Voie | Effet/niveau | Note |
|------|--------------|------|
| ✅ Puissance | +1 stat principale | inchangé |
| ✅ Précision | +2 % crit | inchangé |
| 💡 Garde | +1 % dodge et +3 PV max (alternés) | ouvre le build tank |
| 💡 Résonance | +4 % dégâts élémentaires (élément choisi au 1ᵉʳ cran de la voie) | synergie resist/weak |

**Bibliothèque (`spellPaths`)** :
| Voie | Effet/niveau | Note |
|------|--------------|------|
| ✅ Puissance | power +2 | inchangé |
| ✅ Maîtrise | cost −1 (plancher 1) + chance statut +5 % (cap 50 %) | inchangé |
| 💡 Amplitude | tous les 2 crans : +8 % de splash sur les cibles adjacentes (sorts mono-cible) / +1 tour de durée (statuts/buffs) | ouvre l'AoE |
| 💡 Métamorphose | change l'`element` du sort (choix au 1ᵉʳ cran) + +1 power/niveau | contourne les résistances — réponse aux variantes de Boucle resist-ténèbres |

## 5.3 Artefacts : l'Éveil

- Étendre les **résolveurs** `activeEffect` de 3 → 6 : + `hasteGroup`
  (jauge Célérité +0.5 groupe), + `markTarget` (cible +15 % dégâts subis
  2 tours), + `veilGroup` (esquive +10 % 2 tours).
- 💡 **Éveil d'artefact** (à la Forge, section dédiée) : 3 rangs par artefact
  à `activeEffect` — rang 1 : +1 charge/combat ; rang 2 : power/durée +50 % ;
  rang 3 : effet secondaire mineur (par artefact, données). Coût : Marques +
  Essence Primordiale. Ne touche pas les 11 slots ni `ARTIFACT_FORMS` (inerte).

**Vérification** : units pour les nouvelles formules (`_spellForCaster` 4
voies, `forgeBonus` 4 voies, migration legacy) ; smoke `scenarioForgeRespec`,
`scenarioLibraryAmplitude`, `scenarioArtifactAwaken` ; passe sim pour vérifier
qu'aucune voie ne domine ; sauvegarde round-trip des nouveaux champs.

---

<a name="partie-vi"></a>
# PARTIE VI — Arbre de compétences « L'Éveil du Sorcier » (Maison × Classe)

**Objectif** : un arbre de compétences orienté **Maison** et **classe du
sorcier**. Le jeu a déjà tout le contenu d'un arbre (paliers, passifs, sets,
souvenirs — ⚠️ B3) mais éparpillé et sans choix ; et un champ `role` jamais
branché (⚠️ B2). L'arbre unifie les deux.

## 6.1 Structure : 3 branches, 1 écran

```
                    ┌─────────────────────────┐
                    │  TRONC COMMUN (8 nœuds) │  ← points d'Éveil (niveaux)
                    └────────────┬────────────┘
             ┌──────────────────┼──────────────────┐
   ┌─────────▼─────────┐ ┌──────▼────────┐ ┌───────▼─────────┐
   │ BRANCHE DE MAISON │ │ BRANCHE DE    │ │ PANNEAU PASSIFS │
   │ (chosenHouse,     │ │ CLASSE (par   │ │ (lecture seule :│
   │  10 nœuds/Maison) │ │ héros, 10/cl.)│ │  sets, paliers, │
   └───────────────────┘ └───────────────┘ │  souvenirs…)    │
                                           └─────────────────┘
```

- **Portée** : par personnage pour la branche de classe, par partie (partagée)
  pour la branche de Maison — cohérent avec « or/inventaire partagés, stats
  par perso ». Tout est **in-run** (sérialisé dans la save) : zéro héritage
  profil, garde-fou 13 respecté.
- **Points d'Éveil** : 1 point / 2 niveaux (rétroactif à la migration de
  save, comme `unallocatedStatPoints`) + achat contre Marques de Traque
  (Partie IV, coût croissant 3/5/8…). Budget cible ~12-15 points à la
  victoire, ~25-30 en Boucle profonde — l'arbre ne se complète jamais
  entièrement (choix permanents), respec global tardif possible (❓).

## 6.2 Les 5 archétypes de classe (résout B1 + B2)

Les 16 `role` cosmétiques sont mappés sur **5 archétypes mécaniques**
(nouveau champ `classArchetype` dans `data-characters.js`) :

| Archétype | Héros (role actuel) | Axe de la branche |
|-----------|---------------------|--------------------|
| **Duelliste** ⚔️ | Harry (Auror), Drago (Duelliste), Cho (Attrapeuse) | crit phys, riposte, Célérité |
| **Érudit** 📘 | Hermione (Mage), Céleste (Astromage), Margaux (Astromancienne), Anastasia (Mage de la Lune), Olivier de Clairval (Mage de combat) | dégâts de sort, pénétration élém., coût |
| **Occultiste** 🌑 | Maxence (Mage de Sang), Châtillon (Ombremancien) | lifesteal, statuts DoT, corruption maîtrisée |
| **Gardien** 🛡️ | Cedric (Champion ❓), Nathalie (Gardienne-Herboriste), Louis (Dompteur de Dragons) | Garde, mitigation, protection d'allié |
| **Enchanteur** ✨ | Iris (Enchanteresse), Jeanne (Charmeuse), Agathe (Enchanteresse florale) | soutien, Fortune, durée de buffs/statuts |

> ❓ Cedric est classable Duelliste ou Gardien — recommandation : **Gardien**
> (équilibre les effectifs 3/5/2/3/3).

**Fix B1 inclus** : `_grantLevelSpells` est réécrit pour lire une table
`SPELL_LEARN_TABLES[classArchetype]` (5 tables au lieu de 2 hardcodées) —
les sorts de départ `CHARACTERS[].spells` restent inchangés ; la table
Duelliste ≈ table Harry actuelle, Érudit ≈ Hermione (zéro régression pour le
duo historique). Avada reste déverrouillé niv. 9 pour tous (canon).

## 6.3 Contenu des branches (v1 — 10 nœuds chacune)

**Tronc commun** (exemples, 1 pt/nœud) : +2 % crit · +3 % esquive · +10 PV ·
+8 PM · +1 emplacement de besace · Fortune +3 (x) · Célérité +3 (x) ·
« Second souffle » (1ᵉʳ KO du combat → survit à 1 PV, 1×/combat).

**Branche de Maison** (même **budget de puissance** pour les 4 — garde-fou
d'équité 13 §13.1.2 ; seuls les **axes** diffèrent) :
- 🦁 Gryffondor : crit, dégâts sous 50 % PV, anti-`fear`, Élan amélioré.
- 🐍 Serpentard : lifesteal de sort, dégâts sur cible sous statut, or +5 %,
  contrecoup de corruption −1.
- 🦅 Serdaigle : coût de sorts, révélation resist/weak auto, +1 réponse
  d'énigme jokée, spell-crit.
- 🦡 Poufsouffle : régén hors combat, Garde (palier 4), soin reçu +15 %,
  partage de potion (l'allié profite à 50 %).
- Le **nœud capital** (5 pts investis) de chaque branche **prépare le palier
  Apothéose** : si `houseTier ≥ 18`, le passif d'Apothéose gagne son rider
  (ex. 🦁 Élan cap ×6) — couture avec le système de paliers existant, pas de
  doublon.

**Branche de Classe** : 10 nœuds par archétype dont 1 **actif** (nouvelle
action de combat contextuelle, ex. Duelliste « Riposte assurée » 1×/combat ;
Gardien « Interposition » ; Occultiste « Saignée » ; Érudit « Surcharge » ;
Enchanteur « Faveur » — réutilise le pattern des boutons conditionnels
`_refreshBattleActionButtons`).

## 6.4 UI & panneau « Passifs » (résout B3)

- Nouvelle modale dédiée `#skill-tree-modal` (recommandé, comme
  `#codex-modal`, pour ne pas surcharger `#char-detail`) + bouton fiche perso.
- Onglet **« Passifs actifs »** en lecture seule : agrège paliers Maison ✅,
  Apothéose ✅, sets ✅, souvenirs Outremonde ✅, Faveur de la Salle ✅ —
  l'audit B3 devient une simple vue (aucune logique déplacée).
- Application des nœuds : nouveaux champs additifs consommés par
  `recalculateStats()` (même pipeline que sets/souvenirs) ; les actifs
  passent par le pattern d'actions conditionnelles de `battle-ui.js`.

**Vérification** : units (budget d'équité inter-Maisons : somme pondérée des
bonus identique ; mapping 16 héros → 5 archétypes exhaustif ; tables de sorts
Duelliste/Érudit = zéro régression Harry/Hermione) ; smoke
`scenarioSkillTree` (dépense de point, effet sur stats, persistance),
`scenarioClassSpellTables` (héros non-canon apprend la table de son
archétype) ; sim (vérifier que l'arbre à budget plein reste sous ~+12 % de
win-rate — comparable à un cran NG+).

---

<a name="partie-vii"></a>
# PARTIE VII — Ordonnancement des lots d'exécution

> Chaque lot = 1 branche + 1 PR + plan vivant amendé + `commit-guard`
> (smoke/units/cache-bump si JS/CSS touchés). Les lots 1-5 touchent du JS
> servi → **bump PWA obligatoire** à chaque PR (guidelines §8).

## Vue d'ensemble des dépendances

```
Lot 0 (doc/quick-wins) ──────────────────────────────┐
Lot 1 (linéaire narratif N1-N4) ─────────────────────┤ indépendants
Lot 2 (upgrades : respec + 4 voies + artefacts) ─────┘
                                                     
Lot 3 (Traques Rituelles) ── après Lot 2 (sink respec)
Lot 4 (Arbre de compétences) ── après Lot 3 (Marques)
Lot 5 (Cycles du Dormeur) ── après Lots 3-4 (drops/sinks)
Lot 6 (équilibrage global & QA de synthèse) ── ferme le tout
```

## Lot 0 — Réconciliation & quick-wins (≈ 1 session) — 🔴 lancer en premier

| # | Tâche | Vérif |
|---|-------|-------|
| 0.1 | Doc 13 §13.2.3 : constantes de scaling réelles (`scalDelta 0.8+0.2/p`, `baseFix ×1.4`) | relecture croisée avec `dungeon-scaling.js` |
| 0.2 | Doc 05/13 : « 6 héros » → 16 ; renvois `data.js` → `data-characters.js` (docs + skill + CLAUDE.md) | grep « 6 héros » ; `check_doc_modules` vert |
| 0.3 | En-tête `dungeon-scaling.js` : lien plan → `_archive/` (F4) ; doc 01 §1.4 Dolohov (F5) | grep lien mort |
| 0.4 | Renommages d'affichage E1/E2 (Résidus de Boucle, Feuillets d'Élara) — libellés UI + doc, ids inchangés | smoke vert ; grep libellés |
| 0.5 | Documenter B4 (Faveur de la Salle = exception assumée au « Codex zéro puissance ») dans doc 13 §13.3.4 | relecture |
| 0.6 | A4 : différer le toast de signature à l'atteignabilité du donneur | scénario signature existant + cas ajouté |

## Lot 1 — Linéaire narratif (≈ 2-3 sessions)

| # | Tâche | Dépend | Vérif |
|---|-------|--------|-------|
| 1.1 | Quête principale « La Descente » (4 étapes, flag `main`, tracker épinglé) — chantier N1 | — | `scenarioMainQuestTracker` ; `goDeeper` non gaté |
| 1.2 | Portraits-relais Dumbledore ét. 4/7/10 (délégation) — chantier N2 | — | scénario remise sans remonter |
| 1.3 | Beats étages 7/9/11/12-13 + floorLines 2/3/5/6 — chantier N3 | — | units beats ; doc 04 §4.4 tranché |
| 1.4 | ❓ Intervention one-shot de Sirius au climax (version minimale) | validation user | scénario climax |
| 1.5 | Amender doc 03/04/08 (linéaire cible §2.1 = référence) | 1.1-1.4 | relecture croisée |

## Lot 2 — Refonte upgrades (≈ 2-3 sessions)

| # | Tâche | Dépend | Vérif |
|---|-------|--------|-------|
| 2.1 | Respec « Reforger la voie » (coût or seul en attendant les Marques ; hook Marques posé) | — | `scenarioForgeRespec` |
| 2.2 | Migration legacy combiné (choix + compensation) | 2.1 | units migration ; zéro nerf silencieux |
| 2.3 | Voies Forge « Garde » + « Résonance » | — | units `forgeBonus` ; sim non-dominance |
| 2.4 | Voies Biblio « Amplitude » + « Métamorphose » | — | units `_spellForCaster` ; sim |
| 2.5 | 3 nouveaux résolveurs d'artefact + Éveil (3 rangs) | — | `scenarioArtifactAwaken` |
| 2.6 | Doc G5/G6 + CLAUDE.md à jour | 2.1-2.5 | `check_doc_modules` |

## Lot 3 — Traques Rituelles (≈ 2 sessions)

| # | Tâche | Dépend | Vérif |
|---|-------|--------|-------|
| 3.1 | Ressource `hunterMarks` (state + save round-trip + HUD fiche) | — | units sérialisation |
| 3.2 | Contrats de Traque (templates `repeatable`, donneurs chefs de Maison + Gardien, multiplicateur de densité, cap 2/visite) | 3.1 | `scenarioTraque` |
| 3.3 | Sinks : respec (branchement 2.1), échange Marques→matériaux | 3.1, Lot 2 | scénario échange |
| 3.4 | Télémétrie `BalanceLog.record('traque')` + table de calibration | 3.2 | NO-OP hors debug |

## Lot 4 — Arbre de compétences (≈ 4-5 sessions, le plus gros)

| # | Tâche | Dépend | Vérif |
|---|-------|--------|-------|
| 4.1 | `classArchetype` sur les 16 héros + trancher Cedric (❓) | — | units mapping exhaustif |
| 4.2 | `SPELL_LEARN_TABLES` par archétype, réécriture `_grantLevelSpells` (zéro régression Harry/Hermione) | 4.1 | units tables ; `scenarioClassSpellTables` |
| 4.3 | Socle arbre : points d'Éveil (1/2 niveaux, migration rétroactive), état sérialisé, `recalculateStats` branché | — | units budget ; save round-trip |
| 4.4 | Contenu : tronc commun + 4 branches Maison (budget d'équité vérifié par units) | 4.3 | units équité inter-Maisons |
| 4.5 | Branches de classe (5 × 10 nœuds dont 1 actif de combat) | 4.1, 4.3 | scénarios actifs en combat |
| 4.6 | UI `#skill-tree-modal` + onglet « Passifs actifs » (résout B3) | 4.3-4.5 | `scenarioSkillTree` ; ModalA11y |
| 4.7 | Achat de points contre Marques | Lot 3 | scénario achat |
| 4.8 | Sim (impact ≤ ~+12 % win-rate à budget plein) + doc G3/G4 + CLAUDE.md | 4.4-4.7 | sim + relecture |

## Lot 5 — Cycles du Dormeur (≈ 3-4 sessions)

| # | Tâche | Dépend | Vérif |
|---|-------|--------|-------|
| 5.1 | Lissage du cliff (`--endgame-ramp`, cibles §3.4) | — | sim avant/après |
| 5.2 | Variantes n=6→10 (`LOOP_VARIANT_TIERS` + capacités bornées) | 5.1 | units + sim |
| 5.3 | Veilleurs de Cycle (3-4 boss epic, placement garanti x9, drops) + ❓ gate x0 | 5.2 | `scenarioCycleVeilleur` |
| 5.4 | Transcendance +9→+12 (Éclats de Transcendance, coûts, cap) | 5.3, Lot 2 | `scenarioTranscendance` |
| 5.5 | Poche garantie x5 (variante profonde) + Contrat de Cycle (Gardien) | Lot 3 | scénario poche forcée |
| 5.6 | Jalons Éclats étendus + strates 31-40/41+ + Codex « Mémoire des Boucles » | — | units jalons ; entrées Codex |
| 5.7 | ❓ Classement de profondeur HoF (`deepest_loop_floor`, migration Supabase + repli local) | validation user | scénario HoF stub |
| 5.8 | Doc 11/13 + CLAUDE.md | 5.1-5.7 | relecture |

## Lot 6 — Équilibrage global & QA de synthèse (≈ 1-2 sessions)

| # | Tâche | Vérif |
|---|-------|-------|
| 6.1 | Passe sim complète (endgame + NG+ + arbre) : régénérer baselines `DIFFICULTY_REPORT.md`, `check_difficulty` 0 dérive | CI verte |
| 6.2 | Parcours complet étendu : `scenarioFullJourneyDuo` + segment Cycle 21-30 (Traque → arbre → Veilleur → Transcendance) | smoke vert |
| 6.3 | Passe finale doc (04/08/11/13, G3-G6, CLAUDE.md) + archive de ce plan | `check_doc_modules` |

## Points ❓ à trancher avant/pendant les lots (récapitulatif)

1. Gate « Veilleur → escalier x0 » ou Veilleur optionnel (§3.2) — recommandation : **gate interne au Cycle** (précédent : `reflet_mythe`).
2. Multi-placement vs PNJ délégués pour les portraits-relais (§2.3) — recommandation : **délégués** (additif, sans risque).
3. Compensation de migration legacy (§5.1) — recommandation : +1 niveau gratuit.
4. Cedric : Duelliste ou Gardien (§6.2) — recommandation : Gardien.
5. Intervention de Sirius au climax (§2.5) — version minimale ou abandon.
6. Classement de profondeur HoF (§3.6) — nécessite migration Supabase.
7. Respec global de l'arbre (§6.1) — recommandation : 1 respec offert par victoire, sinon payant en Marques.

---

## Journal du plan

- **2026-07-10** — Création : revue complète (4 audits parallèles), registre
  des trous de cohérence (Partie I), 5 chantiers de design (Parties II-VI),
  ordonnancement en 7 lots (Partie VII). Aucun code modifié. Mergé (PR #725).
- **2026-07-10 — Lot 0 exécuté** :
  - [x] 0.1 Doc 13 §13.2.3 réaligné sur `ENDGAME_SCALING` réel (scalDelta
    0.8 + growth 0.2, baseFix ×1.4, cibles R1 marqué).
  - [x] 0.2 Roster : doc 05 (bandeau + §5.4.2 + §5.5) « 6 héros » → 16 avec
    précision factuelle : `descentStake` ne couvre QUE les 6 héros historiques
    (vérifié `hero-barks.js`, 6 entrées) — lacune des 10 récents documentée
    comme tâche de contenu future ; doc 03 #2, doc 01 §1.3 reformulés ;
    doc 13 §13.3.2 → 16 héros ; renvois `data.js` → `data-characters.js`
    corrigés (doc 05 ×3, G3, docs/README, CLAUDE.md, skill
    add-playable-character). Plans `_archive/` laissés tels quels (archives
    datées).
  - [x] 0.3 `dungeon-scaling.js` : lien plan → `_archive/` ; doc 01 §1.4 :
    boss ordonnés par étage (Dolohov ét. 10).
  - [x] 0.4 **Écart au plan** : renommages d'affichage E1/E2 NON appliqués —
    « Éclats » est le nom canon des deux compteurs (même objet de lore,
    cf. fil rouge 03/08/12/14) et un renommage UI toucherait des dizaines de
    call-sites + textes testés. Remplacé par des encarts de désambiguïsation
    dans doc 13 §13.3.4 (Éclats ×2, pages ×2). Un renommage UI éventuel est
    repoussé à un lot UX dédié (❓).
  - [x] 0.5 Doc 13 §13.3.4 : exception « Faveur de la Salle » au principe
    Codex-zéro-puissance documentée.
  - [x] 0.6 `HOUSE_SIGNATURE_FLOORS` aligné sur l'étage des donneurs
    (Serdaigle 2→6, Poufsouffle 2→3, commentaire source) + fixtures de test
    mises à jour (`tests/scenarios/houses.js` ×3).
- **2026-07-11 — Lot 1 exécuté** (PR #727 du Lot 0 mergée au préalable) :
  - [x] 1.1 Quête principale « La Descente » : 4 templates `descente_1..finale`
    (`main`+`autoTurnIn`, quests-templates.js), chaîne pilotée par
    `_ensureMainQuestProgress`/`_autoTurnInReadyQuests`/`_markFloorSteps`
    (refactor de `checkFloorQuests`, hook `checkKillQuests`), amorçage à la
    fin de l'intro (intro.js), épinglage 🧭 + progression d'étage dans le
    tracker (ui.js). Non-gating vérifié (aucune modification de goDeeper).
  - [x] 1.2 Portraits-relais `dumbledore_relais_{4,7,10}` (npcs-a.js) :
    mêmes questsGiven/TurnedIn que Dumbledore (chaîne + Éclats), dialogues
    dédiés « de cadre en cadre ». Choix retenu : PNJ délégués (❓2 tranché —
    additif, zéro risque sur npcPlacements).
  - [x] 1.3 Beats étages 7 (seuil_profondeurs), 9 (souffle_incomplet),
    12 (boucle_apprend), 13 (boucle_souvient) dans FLOOR_SCRIPTED_BEATS.
    **Écarts au plan** : étage 11 NON ajouté (arbitrage 2026-06-08 maintenu —
    le Gardien de la Boucle a son dialogue dédié) ; floorLines 2/3/5/6 NON
    ajoutées (l'ambiance zonée ZONE_AMBIANCE couvre déjà ces étages par
    tranche — multiplier les beats diluerait les moments one-shot).
  - [ ] 1.4 Intervention de Sirius au climax — **non lancé** (❓5 en attente
    de validation utilisateur).
  - [x] 1.5 Docs amendées : 04 §4.4 (étages-scènes tranché ✅ + fil d'Ariane),
    04 « Points à trancher » #1 clos, 08 (section quête principale + relais).
  - [x] Tests : units beats réalignés (1/4/7/8/9/12/13/15/21) ; 2 nouveaux
    scénarios smoke `scenarioMainQuestDescente` + `scenarioDumbledoreRelais`
    (tests/scenarios/quests.js).
- **2026-07-12 — Lot 2 exécuté** (PR #728 du Lot 1 mergée au préalable) :
  - [x] 2.1 Respec « Reforger la voie » : `reforgePathAtForge` (forge.js) +
    `reforgeSpellPathAtLibrary` (library.js), coût = 40 % de l'or investi
    (`_forgeRespecCost`/`_libraryRespecCost`, purs), niveau conservé.
    **Écart** : coût en or seul — le volet « +5 Marques de Traque » sera
    branché au Lot 3 (la ressource n'existe pas encore).
  - [x] 2.2 Migration héritage combiné : `migrateLegacySpellPath` — choix de
    voie volontaire avec +1 niveau OFFERT (❓3 tranché : compensation +1
    niveau) ; sans interaction, cumul runtime conservé (zéro nerf silencieux).
  - [x] 2.3 Voies Forge « Garde » (+1 % esquive, +2 PV max/niv — recalc) et
    « Résonance » (+4 %/niv sur un élément choisi — hook `_artifactElemBonus`).
  - [x] 2.4 Voies Biblio « Amplitude » (power +1/niv + splash 8 %/2 crans
    sur ennemis adjacents, `_spellForCaster` + `_spellElementalDamage`) et
    « Métamorphose » (power +1/niv + élément changé, `char.spellElements`).
    **Écart** : le rider « +1 tour de durée » d'Amplitude abandonné — les
    durées de statut ne vivent pas sur le sort (STATUS_BY_SPELL calcule à
    l'application) ; splash seul, borné 0.4.
  - [x] 2.5a 3 nouveaux résolveurs d'artefact (battle.js) : `hasteGroup`
    (jauge Célérité groupe), `sapDefense` (DEF ennemie −25 % du combat),
    `succorGroup` (12 % PV/PM groupe) + 3 artefacts epic porteurs
    (`sablier_fele`, `poincon_gobelin`, `flasque_source` — drop coffre epic
    + achat).
  - [ ] 2.5b **Éveil d'artefact (3 rangs) REPORTÉ au Lot 3** : son coût
    prévu (Marques + Primordiale) dépend de la ressource Marques — plus
    cohérent de le livrer avec les Traques Rituelles.
  - [x] 2.6 Docs : G5 (Forge 4 voies + respec + table T5 complète), G6
    (section Bibliothèque 4 voies + héritage) ; sérialisation
    `spellElements` (défaut paresseux save.js ; `resonanceElement` porté
    par l'item, sérialisé d'office).
  - [x] Tests : scénario smoke `scenarioForgeLibraryRespec` (6 volets :
    Garde, respec Forge, Résonance, Amplitude/Métamorphose, héritage+respec
    Biblio, artefacts/résolveurs) ; scénarios Forge/Biblio existants verts.

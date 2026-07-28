# Revue complète — sources & contenu (2026-07-28)

> **Plan vivant** (guidelines §5). Revue d'audit **sans modification de code
> de jeu** : ce document constate, mesure et priorise. Chaque axe se termine
> par un critère de vérification exploitable (§4).
>
> **Méthode** : audit direct du dépôt à la date du 2026-07-28 (branche
> `claude/revue-projet-sources-contenu-1fl6nm`, base `master` @ `d3d9ad2`).
> Toutes les mesures ci-dessous ont été **exécutées**, pas estimées : comptages
> `grep`/`node` sur les registres de données, résolution croisée des
> références, `node --check` sur les 98 modules, `node tests/units.js`,
> `tests/smoke.js` (partiel, voir §0.3), et lecture de `deploy.yml` / `sw.js`.
>
> **Périmètre volontairement distinct des revues existantes.** Deux revues
> récentes couvrent déjà le **design & le contenu** :
> `game-evolution-review-2026-07.md` (2026-07-09) et
> `revue-design-progression-2026-07.md` (2026-07-10). Cette revue-ci
> **ne les rejoue pas** : elle (a) vérifie dans le code ce qui a été livré
> depuis, (b) apporte les constats **sources / technique / hygiène** qu'aucune
> des deux ne couvre, (c) ne conserve du volet contenu que ce qui est
> **encore ouvert, mesuré aujourd'hui**.

---

## 0 — Cadre de la revue

### 0.1 Le projet en chiffres (mesurés ce jour)

| Dimension | Mesure réelle |
|---|---|
| JavaScript | **52 638 lignes** / **98 modules** chargés en séquence dans `index.html` |
| CSS | **8 690 lignes** / 14 fichiers (`style.css` = 5 299 à lui seul) |
| `index.html` | 1 481 lignes, 98 `<script defer>` + 1 inline |
| Monstres | **83** (couverture sprite PNG : **83/83**, 0 orphelin) |
| Items | **218** items + **39** recettes `brew_*` (257 entrées `data-items.js`), dont **121** équipables |
| Sortilèges | **82** |
| PNJ | **40** déterministes (+ ambiants seedés) |
| Quêtes | **88** templates, dont **30** répétables |
| Codex | **61** entrées · Devinettes : **12** |
| Assets suivis | `img/` **15,1 Mo** (1 140 fichiers) · `audio/` **18,1 Mo** (405) |
| Tests | `units.js` **1 117 assertions** ✅ · `smoke.js` **297 scénarios** enregistrés |
| Dépôt suivi | **111 Mo** (dont `.claude/` 40 Mo, `tools/` 18 Mo, `uploads/` 6,4 Mo) |

### 0.2 Verdict

Le socle est **sain et discipliné**, et je le dis après l'avoir vérifié plutôt
que sur la foi des docs :

- **Intégrité référentielle du contenu : parfaite.** Résolution croisée
  complète — drops → `itemId`, quêtes → `monsterId` / `itemId` / sort de
  récompense, PNJ → `questsGiven`, items → `grantsSpell`, livres → `spell` :
  **0 référence pendante** sur les ~500 liens testés. 84/88 quêtes ont un
  donneur PNJ ; les 4 restantes (`descente_1..3`, `descente_finale`) sont des
  quêtes automatiques de type `floor`, donc légitimement sans donneur.
- **Hygiène du langage : propre.** 0 `var`, 0 collision d'identifiant
  `const`/`let` au scope global (le risque n°1 d'une architecture sans
  modules ES), les 98 fichiers passent `node --check`, 1 seul TODO résiduel.
- **Discipline de sérialisation : vérifiée.** Sur 159 globals `let` de
  `state.js`, les 45 absents de `save.js` sont **tous** légitimement
  combat-scoped ou session-scoped (`enemyGroup`, `celeriteGauge`,
  `weaponOil`, `envModifiers`…). Aucun oubli de sauvegarde.
- **CI sérieuse** : garde-fous cache PWA, doc↔modules, dérive d'équilibrage,
  units, smoke, pwa-smoke. 30 derniers runs `master` : **30 succès**, ~4,5 min.

> **Le diagnostic est donc un diagnostic de *finition*, pas de fondations.**
> Les vrais axes se rangent en deux familles nettes :
> **(A) du poids et de la dette d'hygiène qui coûtent au chargement, au dépôt
> et à la fiabilité de l'outillage**, **(B) un volet contenu dont les revues de
> juillet restent valides — partiellement livré, mesuré ici à jour.**
>
> ⚠️ **Une troisième famille annoncée dans la première version de cette revue
> — « du contenu déjà payé rendu invisible au joueur » (C1/C2, icônes de
> sorts) — était une erreur de mesure et a été retirée** (§1). La couverture
> d'icônes du jeu est complète.

### 0.3 Ce que cette revue ne garantit pas

- `tests/smoke.js` n'a pas pu être exécuté **en entier** dans cet
  environnement : le runner est séquentiel (1 Chromium par scénario) et le
  sandbox tourne à ~20 s/scénario, soit ~90 min pour 297. **47 scénarios
  exécutés, 47 verts, 0 échec** au moment de la rédaction ; `units.js` est
  passé en entier (1 117 assertions). La CI de `master` est verte, ce qui
  couvre le reste. Ce document ne touchant aucun JS/CSS, la règle du bump de
  cache (§8) ne s'applique pas.
- Aucun profilage runtime (FPS, mémoire) : le volet perf du plan
  `perf-optimization.md` reste ouvert (§3.4 ci-dessous), et je ne le mesure
  pas ici.
- Pas de revue de gameplay joué (feeling, courbe ressentie).

---

## 1 — AXES DE CORRECTION (bugs & incohérences vérifiés)

### ❌ C1 & C2 · RETIRÉS — constats erronés (corrigés le 2026-07-28)

> **Ces deux constats étaient faux et sont annulés.** Ils affirmaient que
> 50 sorts sur 82 retombaient en emoji faute d'entrée dans
> `SPELL_ICON_REGISTRY` (C1) et que 12 sorts n'avaient aucune icône (C2).
> La vérification faite au moment d'exécuter le lot 1 établit l'inverse :

| | Annoncé (C1/C2) | **Réel vérifié** |
|---|---|---|
| Entrées de `SPELL_ICON_REGISTRY` | 32 / 82 | **82 / 82** |
| Sorts retombant en emoji | 50 | **0** |
| Sorts sans aucune icône | 12 | **0** |
| Entrées pointant un fichier absent | — | **0** |
| PNG de sorts orphelins | — | **0** |
| Items sans icône | 39 « recettes » | **0** (SVG inline + PNG painterly + PNG legacy) |

**La couverture d'icônes du jeu est complète.** Il n'y avait rien à corriger.

**Cause de l'erreur** — la liste des clés du registre passait par un
`tr -d "'\": "` qui supprimait *aussi les espaces* : tout nom composé
(`Lumos Solem`, `Ferula Maxima`, `Cœur de Lion`…) devenait `LumosSolem` et ne
correspondait plus à rien. Les « 50 manquants » étaient exactement les 50 noms
multi-mots. Deux variantes du même piège ont suivi pendant la correction :
une regex `["']([^"']+)["']` qui tronque `"Morsure d'Émeraude"` à l'apostrophe,
puis l'oubli du 3ᵉ registre d'icônes (`ITEM_ICON_SVG_REGISTRY`, SVG inline —
herbes et potions), qui faisait passer 36 items illustrés pour dépourvus.

**Ce que cela change** — le §5 plaçait C1 au rang 1 et C2 au rang 5 : les deux
sortent du classement. Le gain joueur attendu du lot 1 disparaît ; restent C3
(poids de production) et A2 (garde-fou), qui eux tiennent.

**Ce que cela apprend** — trois faux positifs d'affilée, tous issus d'un
comptage `grep`/`sed` sur des données quotées. C'est précisément l'argument de
**A2** : un garde-fou versionné, écrit une fois et relu, établit ces chiffres
de façon fiable là où une commande jetable se trompe silencieusement — et se
trompe *dans le sens rassurant du constat qu'on cherchait*.
`node tools/check_content_refs.js` est désormais la source de vérité sur ces
couvertures (livré, cf. `lot1-quick-wins-2026-07-28.md`).

### 🟠 C3 · 9,2 Mo de sources audio brutes publiées en production

`audio/voice/_raw/` = **192 MP3 sources**, **9,2 Mo**, **suivis par git** et
**référencés nulle part** (`grep -rn "_raw" js/ sw.js index.html` → vide).

Or `deploy.yml` fait `cp -r audio _site/` **sans exclusion** : ces 9,2 Mo
partent sur GitHub Pages à chaque déploiement, à côté des 201 `.ogg`
effectivement joués. C'est ~⅓ du poids de `audio/` pour zéro usage runtime.

- **Correction** : exclure `_raw/` du bundle Pages (`rsync --exclude` ou
  `cp -r audio` puis `rm -rf _site/audio/voice/_raw`). Décider séparément si
  les sources restent suivies (traçabilité) — les deux choix se défendent,
  mais **publier** ne se défend pas.
- **Vérifier** : le job « Contenu publié » affiche `audio/` allégé de ~9 Mo ;
  `pwa-smoke` reste vert.

### 🟡 C4 · Dérives numériques dans `CLAUDE.md`

Le garde-fou `check_doc_modules.js` verrouille la **liste** des modules, mais
aucun garde-fou ne couvre les **chiffres** cités en prose, qui ont tous dérivé :

| `CLAUDE.md` annonce | Réel mesuré | Écart |
|---|---|---|
| « 85 modules » (l.20) | **98** | +13 |
| « les 159 scénarios » (l.2144) | **297** | +138 |
| « **78** monstres au total » (l.1641) | **83** | +5 |
| « **43** items au total dont **29** équipables » (l.1039) | **218** items / **121** équipables | ×5 / ×4 |
| « ~**55** globals attendus » (MANIFEST loader, l.313) | **365** entrées | ×6,6 |

Le chiffre items/équipables est le plus trompeur : il décrit un état ancien du
jeu et **sous-estime le contenu d'un facteur 5**, ce qui peut conduire à
planifier de l'enrichissement là où il y a déjà de la matière.

- **Correction** : recaler les 5 chiffres, puis remplacer les nombres figés par
  des formulations stables (« le registre `MONSTERS` », « le MANIFEST du
  loader ») là où la précision n'apporte rien — sinon la dérive reviendra.
- **Vérifier** : chiffres recalés ; option — étendre `check_doc_modules.js`
  à un contrôle des compteurs de registres.

### 🟡 C5 · ~59 classes CSS mortes

807 classes déclarées dans `css/`, **59 jamais citées** dans `js/` ni
`index.html`. Une partie est du faux positif (composition dynamique :
`codex-act-${n}`, `hof-rank-${i}`, `ghost-gap-${niveau}`), mais j'ai vérifié
au cas par cas que **au moins 8 sont réellement mortes** — 0 référence
directe **et** 0 composition dynamique de préfixe : `equip-grid`,
`enemy-art`, `enemy-display`, `char-portrait`, `map-door`, `death-seal`,
`has-tooltip`, `house-btn-icon`.

- **Correction** : trier les 59, supprimer les mortes confirmées (bump cache
  requis — skill `cache-bump`).
- **Vérifier** : suite smoke verte (les scénarios `visuals.js` couvrent le
  rendu) ; captures desktop + mobile inchangées.

---

## 2 — AXES D'AMÉLIORATION (qualité des sources)

### 🟠 A1 · Aucun linter sur 52 638 lignes de JS à scope global

Il y a un `package.json` mais **ni ESLint ni config équivalente**. Sur une
architecture **sans modules ES**, où tout partage le scope global, c'est
précisément l'outil qui rattrape la classe de bugs que la suite smoke ne voit
pas : identifiant mal orthographié (`no-undef`), variable/fonction devenue
orpheline après refactor (`no-unused-vars`), `case` sans `break`, promesse non
attendue.

Le socle est propre aujourd'hui (§0.2), donc c'est le bon moment : le coût
d'adoption est au minimum.

- **Amélioration** : ESLint en mode `script` (pas `module`), `globals` déclarés
  depuis le MANIFEST du loader — qui est déjà la liste de référence des 365
  globals — et un jeu de règles volontairement étroit au départ (`no-undef`,
  `no-unused-vars`, `no-dupe-keys`, `eqeqeq` en `warn`). Étape CI **non
  bloquante** d'abord, bloquante quand le compte est à zéro.
- **Vérifier** : `npx eslint js/` tourne ; le rapport initial est trié en
  « à corriger » / « faux positif à ignorer ».
- Note chiffrée pour le calibrage : **55** comparaisons non strictes
  (`==`/`!=`) subsistent — volume faible, à traiter au fil de l'eau, pas en
  campagne dédiée.

### 🟠 A2 · Aucun garde-fou d'intégrité du contenu (alors qu'il est actuellement parfait)

C'est le paradoxe à corriger en priorité côté outillage. L'intégrité
référentielle est **impeccable ce jour** (§0.2) — mais **rien ne la protège**.
Ajouter demain un drop pointant un `itemId` inexistant, ou une quête visant un
`monsterId` supprimé, passerait **toute** la CI : la suite smoke ne joue pas
ces liens-là.

J'ai écrit le contrôle pour cette revue et il tourne en une seconde ; le
transformer en outil versionné est quasi gratuit.

- **Amélioration** : `tools/check_content_refs.js` — vérifie drops→items,
  quêtes→monstres/items/sorts, PNJ→quêtes, items→sorts, livres→sorts,
  + couverture sprite monstres (83/83) et icônes items. Étape CI bloquante.
- **Vérifier** : l'outil sort 0 sur `master` ; il sort 1 sur une référence
  cassée introduite volontairement.

### 🟡 A3 · Duplication : 70 occurrences de `party.slice(0, partySize)`

Le même idiome « membres actifs du groupe » est réécrit **70 fois** dans **15
modules** (`battle.js` 17, `battle-spells.js` 15, `movement-interactions.js` 8,
`inventory.js` 6, `movement.js` 5…). Aucun helper n'existe (`livingParty` /
`activeParty` : absents). Chaque site refait aussi son propre filtre
`hp > 0` quand il en a besoin.

- **Amélioration** : `activeParty()` / `livingParty()` dans `inventory-core.js`
  (au MANIFEST), puis **migration progressive et opportuniste** — pas de
  campagne de remplacement massif (guidelines §3 : le risque d'un sed sur 70
  sites dépasse le bénéfice).
- **Vérifier** : helper testé dans `units.js` ; smoke verte après chaque lot.

### 🟡 A4 · Duplication du transport REST multiplayer

La détection de clones remonte le même bloc « fetch → `!res.ok` → `json()` →
`_mpNoteSuccess` → `rows[0]` → `catch _mpNoteFailure` » **4 fois**, et
l'en-tête `POST` + `Prefer: return=representation` **3 fois**, réparti sur
`multiplayer.js` / `-social.js` / `-visits.js`.

- **Amélioration** : `_mpSelectOne(query)` / `_mpInsert(table, row)` dans
  `multiplayer.js` (socle commun déjà prévu pour ça).
- **Vérifier** : les 22 scénarios `multiplayer.js` (stubs REST offline)
  restent verts.

### 🟡 A5 · `safeEl` : helper adopté à 11 %

442 `getElementById` directs contre **56** `safeEl(` — alors que
`CLAUDE.md` prescrit `safeEl` pour tout code neuf. La consigne existante
(« ne pas migrer en masse les ~180 existants ») est **saine et je la maintiens** ;
le problème est que le compte réel est **442**, pas ~180, ce qui montre que le
code neuf ne l'applique pas non plus.

- **Amélioration** : pas de migration de masse. Appliquer `safeEl` sur les
  fonctions qui touchent ≥ 5 IDs en cascade quand on y passe, comme prescrit —
  et recaler le chiffre dans `CLAUDE.md` (voir C4).

### 🟢 A6 · Poids du dépôt : 111 Mo suivis, dont ~65 Mo non runtime

`deploy.yml` est **correct** — il n'expédie que `index.html`, `robot.html`,
`manifest.json`, `sw.js`, `css/`, `js/`, `img/`, `audio/`. Le problème est le
**clone**, pas le déploiement :

| Dossier | Poids suivi | Nature |
|---|---|---|
| `.claude/` | **40,2 Mo** (455 fichiers) | maquettes PNG jusqu'à 1,1 Mo pièce |
| `tools/` | **18,2 Mo** (155) | captures QA, `_shots/` (1,3 Mo pour un seul PNG) |
| `uploads/` | **6,4 Mo** (11) | 2 PNG de 2,2 et 2,0 Mo |

- **Amélioration** : décider quoi conserve une valeur de traçabilité. Les
  maquettes « avant/après » d'un plan **archivé** n'en ont plus beaucoup ;
  `uploads/` ressemble à un dépôt temporaire. Purge du suivi (les fichiers
  restent dans l'historique — pas de réécriture d'historique proposée ici) +
  `.gitignore` élargi.
- **Vérifier** : `git ls-files | wc -c` en baisse ; aucun asset runtime touché.

---

## 3 — AXES D'ENRICHISSEMENT (contenu & joueur)

> Les revues du 2026-07-09 / 07-10 restent la référence de design. Je me
> limite ici à **ce qui est encore ouvert, remesuré aujourd'hui**, en signalant
> d'abord ce qui a été **livré depuis** — pour éviter qu'un cycle suivant ne
> reparte sur un constat périmé.

### 3.1 ✅ Déjà livré depuis la revue du 2026-07-09 (vérifié dans le code)

| Axe de la revue | Constat de juillet | État vérifié ce jour |
|---|---|---|
| **A1 · Falaise de bestiaire 11-20** | « 1 monstre à 11, 1 à 12, **0 à 13-16** » | ✅ **Comblée** : `larve_fondations` (13), `golem_runique_primordial` (14), `suture_du_reel` + `antecesseur` [epic] (15), `souffle_du_dormeur` (16) |
| **A5 · Le Dormeur jamais rencontré** | lore le plus fort, jamais incarné | ✅ **Amorcé** : `souffle_du_dormeur` (ét. 16) |
| **B1 · 0 item Fortune, 1 item Célérité** | stats dérivées non soutenues par le loot | ✅ **Livré** : **3** `bonusFortune`, **4** `bonusCelerite` |
| Zone D · Gardiens des Fondateurs | données seules, art à faire | ✅ 4 gardiens epic (ét. 17) + PNG dédiés |

### 3.2 🟠 E1 · Monoculture des objectifs de quête — **encore ouvert**

Remesuré sur les 88 templates :

| Type d'objectif | Nombre | Part |
|---|---|---|
| `kill` | **58** | **66 %** |
| `item` | 16 | 18 % |
| `floor` | 9 | 10 % |
| `search` / `herb` / `donate` | 4 / 4 / 4 | 4,5 % chacun |
| `pages` / `riddle` / `escape` | 2 / 1 / 1 | ~1 % |

Le ratio est **inchangé** depuis la revue de juillet (67 % sur 85 templates
→ 66 % sur 88) : les 3 templates ajoutés n'ont pas diversifié le verbe. Le jeu
possède pourtant déjà les briques d'autres verbes — 12 devinettes dans
`riddles.js` pour **1** seule quête `riddle`, les Poches du Sceau pour **1**
quête `escape`, la concoction pour 4 `herb`.

- **Enrichissement** : verbes `deliver` (escorter/porter d'un PNJ à un autre),
  `discover` (atteindre un lieu / déverrouiller une entrée Codex), `choice`
  (résolution à deux issues). L'infrastructure de `objective.type` est
  data-driven : le coût est dans `checkQuestCompletion` + l'écriture.
- **Vérifier** : part de `kill` sous **50 %** ; un scénario smoke par nouveau
  verbe.

### 3.3 🟡 E2 · Catalogue élémentaire déséquilibré — **encore ouvert**

| Élément | Sorts |
|---|---|
| ténèbres | **15** |
| lumière | **10** |
| feu | 7 |
| physique | 6 |
| glace | 6 |
| foudre | **5** |

Le système `resist`/`weak` demande au joueur de **changer d'élément** face aux
résistances, mais l'offre est concentrée sur ténèbres/lumière — deux éléments
qui arrivent **tard** (endgame, Maisons). Early/mid, le choix élémentaire
réel est mince, et la foudre reste le parent pauvre de bout en bout.

- **Enrichissement** : viser ~8 sorts par élément offensif, en priorité
  **foudre** et **glace** aux paliers early/mid, adossés aux livres de sorts
  (vecteur d'apprentissage existant, cf. `livre_glacius` / `livre_fulgari`).
- **Vérifier** : ≥ 2 sorts par élément accessibles avant l'étage 5 ; sim
  d'équilibrage inchangée (`check_difficulty.js`).

### 3.4 🟡 E3 · Perf & poids d'assets — plan ouvert, deux leviers non joués

`perf-optimization.md` a **15 cases non cochées**, dont la cible
« `img/` réduit d'au moins 40 % ». Deux constats factuels :

1. **Zéro format moderne** : **1 131 PNG + 7 JPG, 0 WebP, 0 AVIF**. Sur des
   sprites painterly 512² (jusqu'à 221 Ko pièce : `antecesseur.png`,
   `souffle_du_dormeur.png`, `larve_fondations.png`), WebP coupe
   habituellement 50-70 % à qualité perçue égale.
2. **Précache de 3,38 Mo** au premier chargement (109 entrées) — c'est le
   chiffre qui pilote le LCP mobile, et la cible « < 5-6 s » du plan n'est pas
   mesurée.

- **Enrichissement** : conversion WebP avec `<picture>`/fallback PNG (les
  résolveurs d'icônes sont centralisés dans `item-icons.js` /
  `renderer-entities.js`, donc peu de call-sites) + arbitrage sur ce qui doit
  vraiment être précaché. À combiner avec C3 (−9,2 Mo côté audio).
- **Vérifier** : Lighthouse mobile avant/après ; `pwa-smoke` (offline) vert ;
  aucun sprite manquant (`check_content_refs.js` de A2 couvre la régression).

### 3.5 🟢 E4 · Répartition des slots d'équipement

Sur 121 équipables : `trinket` **25**, `amulet` 20, `head` 16, `ring` 12,
`cloak` 12, `wand` **9**, `feet` 7, `body` **7**, `belt` 7, `hands` **6**.

Les slots « armure » (`body` 7, `hands` 6, `feet` 7) sont **3 à 4 fois** moins
fournis que les slots « bijou », et `wand` — le slot d'arme, le plus
structurant d'un build — n'a que 9 options pour ~30 étages de progression. Ça
pousse mécaniquement vers des builds bijoux/MAG, ce qui rejoint l'axe B2 des
revues de juillet (archétype physique non viable) **par un autre chemin** :
même sans toucher à l'équilibrage, l'offre de loot elle-même n'a pas de quoi
soutenir un build physique.

- **Enrichissement** : viser ~12 `wand` et ~10 par slot d'armure, en
  privilégiant `bonusStr` / `bonusEnd` / `counterChance` — cohérent avec la
  pénétration de DEF (D4) déjà implémentée.
- **Vérifier** : sim `--stat-rework` ; win-rate d'un build physique en Boucle
  ≥ celui d'un build caster à niveau égal.

---

## 4 — Hygiène de process

### 🟡 P1 · 59 plans actifs pour 261 archivés

`.claude/plans/` contient **59** `.md` actifs. Le workflow d'archivage existe
(`plans-archiving-workflow.md`, périmètre validé 2026-06-12) et a bien tourné
une fois — mais il constatait **37** plans actifs à l'époque : le stock a
**augmenté de 59 %** depuis, ce qui indique un rangement one-shot plutôt qu'une
routine.

Deux familles gonflent le compte sans être des plans de travail :

- **13 `nano-banana-prompts-*.md`** = catalogues de prompts d'assets, pas des
  plans à statut ; ils n'ont ni case à cocher ni cycle de vie.
- Plusieurs plans dont l'en-tête dit explicitement « LIVRÉS / CLOS »
  (`potions-consumables-craft-2.0.md` : « 🏁 P7→P13 LIVRÉS … CLOS » ;
  `voix-manon-elara.md` : « faite et câblée ») et qui restent en actif.

Sur les 59, **28 n'ont aucune ligne de statut détectable** — impossible de
savoir d'un coup d'œil si le travail est en cours.

- **Amélioration** : (1) rejouer la passe d'archivage ; (2) sortir les
  `nano-banana-prompts-*` vers un `.claude/prompts/` (ce ne sont pas des
  plans) ; (3) rendre l'en-tête de statut obligatoire — le plus simple étant un
  contrôle qui échoue si un plan actif n'a pas de ligne `**Statut**`.
- **Vérifier** : plans actifs ≤ ~15, tous avec un statut lisible.

### 🟢 P2 · Durée de la suite smoke

297 scénarios séquentiels, un Chromium par scénario. La CI tient
(~4,5 min total, `timeout-minutes: 25`), mais la marge se réduit à chaque
scénario ajouté, et **en local le coût est prohibitif** (~90 min dans ce
sandbox) — ce qui pousse au contournement de la règle §7.

- **Amélioration** : parallélisation par pool de workers (les scénarios sont
  déjà indépendants — chacun relance son propre navigateur, donc aucune
  refonte des tests), ou réutilisation d'une instance Chromium par domaine.
- **Vérifier** : suite complète < 5 min en local ; même total de scénarios,
  même résultat.

---

## 5 — Priorisation

Classement par **valeur / coût**, en tenant compte de ce qui débloque le reste.
**Mis à jour le 2026-07-28** après le retrait de C1/C2 (constats erronés, §1) et
l'exécution du lot 1.

| # | Axe | Type | Impact | Effort | Statut | Pourquoi ce rang |
|---|---|---|---|---|---|---|
| 1 | **A2** `check_content_refs.js` en CI | Amélioration | Fort | **S** | ✅ livré | verrouille une intégrité parfaite mais nue — et fournit la mesure fiable que les comptages jetables ratent |
| 2 | **C3** `_raw/` hors production | Correction | Fort | **XS** | ✅ livré | −9,2 Mo sur chaque déploiement, 1 ligne de CI |
| 3 | **C4** chiffres de `CLAUDE.md` | Correction | Moyen | **XS** | ✅ livré | évite de planifier sur un inventaire faux d'un facteur 5 |
| 4 | **A1** ESLint (non bloquant → bloquant) | Amélioration | Fort | **S** | ouvert | fenêtre idéale : le socle est propre |
| 5 | **P1** passe d'archivage des plans | Process | Moyen | **S** | ouvert | rend la roadmap lisible avant le cycle suivant |
| 6 | **E1** verbes de quête (`deliver`/`discover`/`choice`) | Enrichissement | **Fort** | M | ouvert | seul axe qui change la texture du jeu ; briques déjà là |
| 7 | **E3** WebP + arbitrage du précache | Enrichissement | Fort | M | ouvert | cible « −40 % `img/` » du plan perf, non jouée |
| 8 | **E2** rééquilibrage élémentaire (foudre/glace) | Enrichissement | Moyen | M | ouvert | rend le système resist/weak réellement jouable early |
| 9 | **E4** slots `wand`/armure | Enrichissement | Moyen | M | ouvert | condition de loot pour un build physique viable |
| 10 | **P2** parallélisation de la suite smoke | Process | Moyen | M | ouvert | protège le respect de la règle §7 |
| 11 | **A3**/**A4** helpers `activeParty` / REST MP | Amélioration | Faible | S | ouvert | opportuniste, au fil des passages |
| 12 | **C5** CSS morte · **A6** poids du dépôt | Nettoyage | Faible | S | ouvert | hygiène, sans urgence |
| — | ~~C1 · C2 icônes de sorts~~ | — | — | — | ❌ retiré | constats erronés — la couverture d'icônes est complète (§1) |

**Séquence recommandée** — le **lot 1 (1 · 2 · 3) est livré**
(`lot1-quick-wins-2026-07-28.md`). Suite : **4 · 5** pour solidifier l'outillage
et la lisibilité de la roadmap, puis arbitrage utilisateur sur les
enrichissements **6 → 9**, qui sont les seuls à engager du design et méritent
d'être tranchés un par un.

> **Note d'honnêteté sur la valeur du lot 1** : après retrait de C1/C2, il
> n'apporte **aucun gain visible au joueur**. Son apport est de production
> (−9,2 Mo publiés), d'outillage (un garde-fou qui n'existait pas) et de
> fiabilité documentaire. Le premier axe à réel impact joueur est **E1**.

---

## 6 — Suivi

- [x] Audit exécuté et mesuré (§0.1) — 2026-07-28
- [x] `node tests/units.js` — 1 117 assertions ✅
- [~] `node tests/smoke.js` — 47/297 exécutés, 0 échec (runner séquentiel trop
      lent dans cet environnement ; CI `master` verte, cf. §0.3)
- [x] Aucun JS/CSS modifié → bump de cache PWA (§8) non applicable
- [x] **Correction (2026-07-28)** : C1 & C2 retirés — constats erronés issus
      d'un comptage `grep` défaillant sur des noms quotés (§1). La couverture
      d'icônes est complète (82/82 sorts, 218/218 items).
- [x] **Lot 1 livré** — A2 · C3 · C4 (cf. `lot1-quick-wins-2026-07-28.md`)
- [ ] Arbitrage utilisateur sur la suite du §5 (A1 · P1, puis E1 → E4)
- [ ] Conversion des axes retenus en plans dédiés

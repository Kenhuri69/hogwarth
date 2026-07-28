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

## ⚙️ Re-vérification intégrale des comptages (2026-07-28, après coup)

> Après quatre constats démentis en cours d'implémentation (C1, C2, le total
> de scénarios, E1), **tous** les chiffres de cette revue ont été re-mesurés
> sur l'arbre où elle a été écrite (`d3d9ad2`), par **chargement runtime des
> registres dans un VM Node** plutôt que par extraction de texte : c'est le
> jeu lui-même qui répond, plus une regex qui devine.

**Résultat : 51 chiffres sur 55 confirmés, 4 écarts.**

| Chiffre | Annoncé | Réel | Cause |
|---|---|---|---|
| Quêtes (templates) | 88 | **89** | id accentué `niffleurs_trésor` hors du motif `[a-z0-9_]+` |
| Quêtes répétables | 30 | **28** | 2 des 30 occurrences de `everyLevels` sont en commentaire |
| `state.js` — globals `let` | 159 | **164** | lignes `let a, b, c;` comptées pour 1 au lieu de 3 |
| Plans actifs | 59 | **58** | le comptage incluait la revue elle-même, tout juste créée |

Les trois premiers relèvent encore du même vice — un motif trop étroit ou une
unité de comptage mal choisie. Le quatrième est une erreur d'observateur :
mesurer un répertoire dans lequel on vient d'écrire.

**Ce qui est confirmé exactement**, et donc utilisable sans réserve : les
volumes de code (52 638 lignes JS / 98 modules / 8 690 lignes CSS), tous les
registres de contenu (83 monstres et leurs 83 sprites, 218 items, 121
équipables, 82 sorts, 40 PNJ, 61 entrées de Codex, 12 devinettes, 39
recettes), l'hygiène (0 `var`, 0 collision de global, 45 globals combat-scoped
non sérialisés), **et les trois axes d'enrichissement restants** — E2
(15 ténèbres / 10 lumière / 7 feu / 6 physique / 6 glace / 5 foudre), E3
(1 131 PNG, 0 WebP, 0 AVIF, précache 3,38 Mo sur 109 entrées), E4 (les
10 répartitions de slots), ainsi que C5 (807 classes CSS, 59 non citées),
A3 (70 `party.slice`), A5 (442 `getElementById` / 56 `safeEl`) et A6
(`.claude/` 40,2 Mo · `tools/` 18,2 Mo · `uploads/` 6,4 Mo).

> ⚠️ **Un défaut RÉEL du garde-fou est sorti de cette passe.** Le motif
> `[a-z0-9_]+` n'était pas seulement faux pour compter : `check_content_refs.js`
> l'utilisait aussi pour **valider les références**. `niffleurs_trésor` y était
> donc *invisible* — ni déclaré, ni vérifié. Prouvé en cassant volontairement
> la référence chez son donneur : **exit 0**, la CI ne voyait rien. Corrigé
> (`\p{L}` + flag `u`) ; le garde-fou attrape désormais les deux cas, ASCII et
> accentué, et voit 2 références de plus.

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
| Quêtes | **89** templates, dont **28** répétables |
| Codex | **61** entrées · Devinettes : **12** |
| Assets suivis | `img/` **15,1 Mo** (1 140 fichiers) · `audio/` **18,1 Mo** (405) |
| Tests | `units.js` **1 117 assertions** ✅ · `smoke.js` **281 scénarios** (total annoncé par le runner) |
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
- **Discipline de sérialisation : vérifiée.** Sur 164 globals `let` de
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
  sandbox tourne à ~20 s/scénario, soit ~90 min pour 281. **47 scénarios
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
| « les 159 scénarios » (l.2144) | **281** | +122 |
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

### 3.2 ✅ E1 · Monoculture des objectifs de quête — **traité (lot 3)**

> ⚠️ **Le « 66 % » que cette section annonçait était faux** : il divisait
> 58 objectifs `kill` par 88 **quêtes** — deux grandeurs différentes. Même
> vice de dénominateur que les erreurs de C1/C2 et du compte de scénarios.
> Mesure exacte sur `master` avant le lot 3 : **58,0 %** des objectifs
> (58/100), ou **61,8 %** des quêtes portant au moins un `kill` (55/89).

L'audit du moteur mené pour le lot 3 a aussi corrigé le **diagnostic** : sur
les trois verbes proposés ici, **`deliver` existait déjà** (`questsTurnedIn` ≠
`questsGiven` + `grantOnAccept`) et n'était utilisé qu'**une fois sur 89**. Le
manque était du contenu, pas du moteur — l'« ajouter » aurait dupliqué une
mécanique en place.

**Livré** (cf. [`lot3-verbes-de-quete-2026-07-28.md`](./lot3-verbes-de-quete-2026-07-28.md)) :
les deux verbes réellement absents — `discover` (atteindre un type de lieu) et
`talk` (consulter des PNJ nommés) — plus 7 quêtes, dont 3 livraisons inter-PNJ
qui portent l'usage de cette mécanique de 1 à 4.

| | Avant | Après |
|---|---|---|
| Objectifs `kill` | 58,0 % | **54,2 %** |
| Quêtes avec ≥ 1 `kill` | 61,8 % | **57,3 %** |

**Cible « sous 50 % » non atteinte** — il reste ~20 quêtes non combattantes à
écrire : de la narration, pas du moteur. Le jeu a d'ailleurs encore des briques
sous-exploitées (12 devinettes pour **1** quête `riddle`, les Poches du Sceau
pour **1** quête `escape`).

**`choice` reste ouvert** : UI de choix, conséquences persistées, dialogues par
branche — une décision de design qui revient à l'auteur du jeu.

### ✅ E2 · Catalogue élémentaire — **le constat était mal posé (mesuré, corrigé)**

> ⚠️ Cette section disait : « ténèbres 15 / lumière 10 vs foudre 5 → le choix
> élémentaire est mince early/mid, la foudre est le parent pauvre ». La mesure
> dément le raisonnement, même si les comptes bruts étaient exacts.

**Ce qui était faux.** Le choix élémentaire early n'est pas mince : chaque héros
démarre avec 1 ou 2 éléments offensifs, et chaque élément a un livre d'entrée.
Premier accès en boutique : physique ét. 2, glace ét. 3, feu et foudre ét. 5,
lumière ét. 6, ténèbres ét. 9. La foudre n'est pas un parent pauvre — elle a une
progression complète (Stupefix au départ → Fulgari ét. 5 → Fulgur Catena ét. 7
→ Fulgur Imperium). Compter les sorts par élément mesurait la **queue late
game**, pas le jeu praticable.

**Le vrai problème, lui, est net** — il fallait croiser l'offre de sorts avec ce
que le bestiaire *récompense* :

| Élément | Sorts offensifs | Monstres **faibles** | Monstres **résistants** | Ratio sorts/faiblesses |
|---|---|---|---|---|
| **ténèbres** | **14** | **1** | **41** | **14,00** |
| **lumière** | **8** | **38** | 2 | **0,21** |
| feu | 7 | 22 | 11 | 0,32 |
| physique | 6 | 8 | 21 | 0,75 |
| glace | 6 | 9 | 8 | 0,67 |
| foudre | 5 | 8 | 5 | 0,63 |

**Le jeu investit son plus gros catalogue de sorts dans l'élément auquel
41 créatures résistent et dont 1 seule est faible ; et son élément le plus
récompensé — 38 créatures faibles à la lumière — n'a que 8 sorts, dont le
premier achetable arrivait à l'étage 6.** 67× d'écart entre les deux ratios.

La pression démarre à l'**étage 4** : 10 des 21 créatures de la tranche 4-6 sont
faibles à la lumière, et 86 % de cette tranche porte une résistance. Le système
résistance/faiblesse réclamait donc un élément que le joueur ne pouvait pas
encore se procurer.

**Correctif appliqué** (data-only, minimal) : `livre_patronum` passe de
l'étage 6 à l'**étage 4**, pour que la lumière soit disponible quand le
bestiaire commence à la réclamer. `node tools/check_difficulty.js` reste vert
(aucun étage ne dérive de plus de 10 pts).

**Ce qui reste ouvert, et relève du design** : le déséquilibre ténèbres est
peut-être *intentionnel* — les sorts de ténèbres sont majoritairement des
lifesteal et des malédictions, valorisés pour leur effet plus que pour leurs
dégâts bruts, et il est cohérent en lore que les créatures sombres résistent à
la magie noire. Rééquilibrer les résistances toucherait à cette cohérence :
c'est un arbitrage d'auteur, pas une correction technique. La mesure est
posée ; la décision revient à l'auteur du jeu.

### 3.4 ❌ E3 · Perf & poids d'assets — **ABANDONNÉ** (prémisse fausse, mesuré)

`perf-optimization.md` a 15 cases non cochées, dont « `img/` réduit d'au moins
40 % ». Cette section recommandait WebP en avançant « WebP coupe habituellement
50-70 % ». **Mesuré sur le corpus réel, c'est faux**, et le raisonnement sur le
premier chargement l'est aussi.

**1. Le gain WebP réel** (conversion des 1 131 PNG, Pillow, méthode 4) :

| | Poids | Gain |
|---|---|---|
| PNG actuels | 13,10 Mo | — |
| WebP **sans perte** | 11,01 Mo | **16 %** |
| WebP **q90** (avec perte) | 7,69 Mo | **41 %** |

Les 50-70 % annoncés ne sont atteints par aucun des deux modes. La cible
« −40 % » n'est atteignable qu'**en acceptant une compression avec perte sur
des illustrations peintes à la main**, toutes en alpha (1 083/1 083).

**2. Le précache ne pèse pas 3,38 Mo pour le joueur.** GitHub Pages sert
gzip/brotli automatiquement :

| | brut | gzip | brotli |
|---|---|---|---|
| **js** (74 % du précache) | 2,51 Mo | 0,77 Mo | **0,68 Mo** |
| img | 0,55 Mo | 0,54 Mo | 0,54 Mo |
| css | 0,25 Mo | 0,06 Mo | **0,05 Mo** |
| shell | 0,09 Mo | 0,02 Mo | 0,02 Mo |
| **TOTAL** | **3,39 Mo** | 1,39 Mo | **1,30 Mo** |

Le premier chargement transfère donc **1,30 Mo, pas 3,38** — 62 % de moins que
le chiffre sur lequel la section s'alarmait.

**3. WebP ne toucherait pas le premier chargement.** Le précache ne contient
que **3 images** : `title.jpg` (345 Ko, déjà du JPEG), et les 2 icônes PWA
(214 Ko, qui doivent rester PNG pour le manifeste). Les 1 131 PNG du jeu sont
chargés **à la demande** (stale-while-revalidate) : les convertir agit sur la
bande passante *en cours de partie*, pas sur le LCP.

> **DÉCISION (utilisateur, 2026-07-28) : axe abandonné.** Le premier
> chargement va bien, le sans-perte ne rapporte que 16 % pour 1 131 fichiers
> touchés, et le q90 dégraderait des illustrations peintes à la main pour
> ~5,4 Mo de bande passante par partie. Le jeu n'a pas de problème de poids au
> chargement ; l'axe est clos.
>
> **Conclusion révisée.** E3 n'est pas un axe de premier chargement — le
> premier chargement va bien (1,30 Mo transférés, dont 74 % de JS déjà
> compressé à 0,68 Mo). Ce qui reste réel : ~5,4 Mo d'économie de bande
> passante par partie complète, **au prix d'une compression avec perte sur
> l'art du jeu**. Ce n'est plus une optimisation technique évidente mais un
> **arbitrage qualité/poids qui revient à l'auteur** — et le mode sans perte,
> lui, ne rapporte que 16 % pour la conversion de 1 131 fichiers.

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

### 🟡 P1 · 58 plans actifs pour 261 archivés  *(→ 45 après le lot 2)*

`.claude/plans/` contient **58** `.md` actifs. Le workflow d'archivage existe
(`plans-archiving-workflow.md`, périmètre validé 2026-06-12) et a bien tourné
une fois — mais il constatait **37** plans actifs à l'époque : le stock a
**augmenté de 57 %** depuis, ce qui indique un rangement one-shot plutôt qu'une
routine.

Deux familles gonflent le compte sans être des plans de travail :

- **13 `nano-banana-prompts-*.md`** = catalogues de prompts d'assets, pas des
  plans à statut ; ils n'ont ni case à cocher ni cycle de vie.
- Plusieurs plans dont l'en-tête dit explicitement « LIVRÉS / CLOS »
  (`_archive/potions-consumables-craft-2.0.md` : « 🏁 P7→P13 LIVRÉS … CLOS » ;
  `voix-manon-elara.md` : « faite et câblée ») et qui restent en actif.

Sur les 58, **28 n'ont aucune ligne de statut détectable** — impossible de
savoir d'un coup d'œil si le travail est en cours.

- **Amélioration** : (1) rejouer la passe d'archivage ; (2) sortir les
  `nano-banana-prompts-*` vers un `.claude/prompts/` (ce ne sont pas des
  plans) ; (3) rendre l'en-tête de statut obligatoire — le plus simple étant un
  contrôle qui échoue si un plan actif n'a pas de ligne `**Statut**`.
- **Vérifier** : plans actifs ≤ ~15, tous avec un statut lisible.

### 🟢 P2 · Durée de la suite smoke

281 scénarios séquentiels, un Chromium par scénario. La CI tient
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
| 4 | **A1** ESLint | Amélioration | Fort | **S** | ✅ livré | 0 erreur d'emblée → bloquant en CI sans toucher au code de jeu |
| 5 | **P1** passe d'archivage des plans | Process | Moyen | **S** | 🟨 partiel | 59 → 47 plans actifs (13 catalogues de prompts sortis, 3 plans clos archivés) ; l'audit complet reste à faire |
| 6 | **E1** verbes de quête (`deliver`/`discover`/`choice`) | Enrichissement | **Fort** | M | ouvert | seul axe qui change la texture du jeu ; briques déjà là |
| — | ~~**E3** WebP~~ | — | — | — | ❌ **abandonné** | prémisse démentie par la mesure (§3.4) : gain réel 16 % sans perte, et le précache transfère 1,30 Mo (brotli), pas 3,38. Devient un arbitrage qualité/poids, pas une optimisation évidente |
| 8 | **E2** catalogue élémentaire | Enrichissement | Moyen | S | ✅ **traité** | constat re-posé (§3.x) : le problème n'était pas « foudre pauvre » mais 14 sorts ténèbres pour 41 monstres résistants vs 8 sorts lumière pour 38 faibles. Lumière avancée à l'étage 4 |
| 9 | **E4** slots `wand`/armure | Enrichissement | Moyen | M | ouvert | condition de loot pour un build physique viable |
| 10 | **P2** parallélisation de la suite smoke | Process | Moyen | M | ouvert | protège le respect de la règle §7 |
| 11 | **A3**/**A4** helpers `activeParty` / REST MP | Amélioration | Faible | S | ouvert | opportuniste, au fil des passages |
| 12 | **C5** CSS morte · **A6** poids du dépôt | Nettoyage | Faible | S | ouvert | hygiène, sans urgence |
| — | ~~C1 · C2 icônes de sorts~~ | — | — | — | ❌ retiré | constats erronés — la couverture d'icônes est complète (§1) |

**Séquence recommandée** — **lot 1 (1 · 2 · 3) livré** (`lot1-quick-wins-2026-07-28.md`,
PR #739 mergée) et **lot 2 (4 · 5) livré** (`lot2-lint-et-rangement-2026-07-28.md`).
Suite : arbitrage utilisateur sur les enrichissements **6 → 9**, qui sont les
seuls à engager du design et méritent d'être tranchés un par un — **E1** en
tête, c'est le premier axe à réel impact joueur.

> **Note d'honnêteté sur la valeur du lot 1** : après retrait de C1/C2, il
> n'apporte **aucun gain visible au joueur**. Son apport est de production
> (−9,2 Mo publiés), d'outillage (un garde-fou qui n'existait pas) et de
> fiabilité documentaire. Le premier axe à réel impact joueur est **E1**.

---

## 6 — Suivi

- [x] Audit exécuté et mesuré (§0.1) — 2026-07-28
- [x] `node tests/units.js` — 1 117 assertions ✅
- [~] `node tests/smoke.js` — 47/281 exécutés, 0 échec (runner séquentiel trop
      lent dans cet environnement ; CI `master` verte, cf. §0.3)
- [x] Aucun JS/CSS modifié → bump de cache PWA (§8) non applicable
- [x] **Correction (2026-07-28)** : C1 & C2 retirés — constats erronés issus
      d'un comptage `grep` défaillant sur des noms quotés (§1). La couverture
      d'icônes est complète (82/82 sorts, 218/218 items).
- [x] **Lot 1 livré** — A2 · C3 · C4 (cf. `lot1-quick-wins-2026-07-28.md`, PR #739 mergée)
- [x] **Lot 2 livré** — A1 (ESLint, 0 erreur, bloquant en CI) · P1 partiel
      (59 → 47 plans actifs) — cf. `lot2-lint-et-rangement-2026-07-28.md`
- [ ] Arbitrage utilisateur sur les enrichissements E1 → E4 (§5 rangs 6-9)
- [ ] Conversion des axes retenus en plans dédiés

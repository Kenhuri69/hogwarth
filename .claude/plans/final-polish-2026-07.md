# Plan de Polish Final — 4 lots (préparation de la mise à jour majeure)

> **Statut** : plan vivant (guidelines §5) — créé le 2026-07-03.
> Branche : `claude/hogwarth-final-polish-wrxhc5`.
> Méthode : audit du **code réel** + réconciliation avec les plans existants
> (`quest-system-revision.md`, `escape-game-traps.md`, `ux-polish-review.md`,
> `perf-optimization.md`, `voix-manon-elara.md`, `docs/perf-lighthouse.md`,
> `docs/playtest-3-boucles.md`). Règle cardinale : **renforcer, pas
> reconstruire** — une grande partie de la demande est déjà livrée et mergée ;
> ce plan la constate (✅) et structure le **reste à faire réel**.

---

## 0. État des lieux transversal — demande ↔ réalité du code

| # | Demande (cahier des charges) | État réel (vérifié dans le code) | Reste à faire |
|---|---|---|---|
| 1.1 | Ordre narratif progressif des quêtes | ✅ **Livré** — gating multi-mécanismes : chaînes `prereq`, `minFloor`, `implicitAccept`, Signatures par Maison+étage, offre « 1 quête à la fois » par PNJ (`getNpcQuestState`), force-spawn des cibles kill. 79 templates, intégrité référentielle testée (`units.js` §11ter) | Rien de structurel. Réconcilier `docs/histoire/08` (capstone Manon absent de la doc) |
| 1.2 | Textes & dialogues PNJ plus profonds | 🔶 **Inégal** — ~40 PNJ nommés ; Dumbledore/Manon/Hagrid très riches, mais des PNJ secondaires restent minces ; 2 side-quests P6 non créées | **P6** : passe d'écriture ciblée + 2 side-quests (`lettre_jamais_envoyee`, `aconit_de_la_meute`) |
| 1.3 | Voix 2-3 personnages clés | 🔶 **Partiel** — ~194 OGG livrés (Dumbledore, McGonagall, Rogue, Flitwick, Chourave, Lupin, Élara, Fondateurs, Narrateur, ~60 sorts). **Manon = clés câblées, 0 OGG** (repli silencieux) | **P5** : générer les voix Manon (+ 1-2 renforts : Sirius, Gardien de la Boucle) |
| 1.4 | Quête finale Manon → père + livre buff élémentaire | ✅ **Livré** — `manon_clair_de_lune` (prereq `manon_acte3`, kill 2 Détraqueurs), lien père (Lupin) au cœur des dialogues, récompense `livre_lumiere_patronus` (élément **Lumière** — le plus cohérent : Patronus/Lupin, contrepoint au givre maternel d'Élara) | Doc histoire à réconcilier (cf. 1.1) |
| 1.5 | Livres spéciaux buffs élémentaires (un par élément), visibles sur le profil | ✅ **Livré côté partie** — 6 `masterybook` (+12 % permanent, `elementalMastery`), panneau « 📖 Maîtrises élémentaires » sur la **fiche perso**. ❌ Rien sur le **profil persistant** (Codex du Sorcier) | **P7** : collection cosmétique cross-run dans le Codex du Sorcier (zéro-héritage) |
| 2.* | Poche du Sceau 11+, ~1/2-3 étages, 3 types + variantes Maison, lore Fondateurs, récompenses | ✅ **ENTIÈREMENT LIVRÉ** — Lots 0→5 + polish (PRs #698→#707, dont voix Fondateurs 2026-07-03). Constantes = rythme demandé | **Validation terrain** (télémétrie `BalanceLog`) — aucune implémentation |
| 3.1 | Feedback combat/menus/inventaire/mobile | ✅ **Chantier clos** — `ux-polish-review.md` : 12 lots mergés (PRs #664→#682) | Rien (veille) |
| 3.2 | Ambiances sonores & effets | ✅ **Complet** — 5 ambiances zonées + 5 musiques combat + `menu_theme`/`ending_break`, FX défensifs | Rien de majeur |
| 3.3 | Chargement & fluidité GitHub Pages | 🔶 **Partiel** — pass Lighthouse fait (59→69, LCP 29,7 s→6,1 s), P2 runtime livré (log borné, cartes mutées, LRU étages, lazy bestiaire). **Compression images NON faite** (bloquée outillage, désormais dispo) | **P8** : compression `img/` ~45 Mo → ~20-25 Mo + re-pass Lighthouse |
| 4.1 | README + Page GitHub (screenshots, contrôles, changelog) | 🔶 **Partiel** — README propre (features/stack/tests), meta/OG complets. ❌ 0 screenshot, pas de section Contrôles, pas de CHANGELOG | **P9** : README v2 + CHANGELOG.md |
| 4.2 | Plan de playtesting final | 🔶 **Partiel** — protocoles existants (`docs/playtest-3-boucles.md`, `qa-parcours-complet.md`) | **P10** : checklist release consolidée |
| 4.3 | Annonce de mise à jour majeure | ❌ Inexistante | **P11** : texte d'annonce (draft en §4) |

💡 **Lecture du plan** : les items ✅ sont documentés en ÉTAPE 1 de chaque lot
(specs *constatées*, pour trace et vérification), les items 🔶/❌ deviennent les
**P5→P11** du backlog d'implémentation (ÉTAPE 2, priorisation globale en §5).

---

# LOT 1 — Cohérence Quêtes & Immersion PNJ (priorité haute)

## ÉTAPE 1 — Spécifications & contenu

### 1.1 Ordre narratif progressif ✅ (constat, rien à construire)

Le déblocage est centralisé dans `isQuestOfferable(id)` (`quests.js:316`) :

| Mécanisme | Champ / fonction | Exemple |
|---|---|---|
| Chaîne de prérequis | `tpl.prereq` ∈ `completedQuests` | `intro_tutoriel → dumbledore_eveil → … → eclats_clef_voute` ; arc Manon en 6 quêtes |
| Gate d'étage | `tpl.minFloor`, `rollOnAccept.minFloor/maxFloor` | toutes les quêtes Boucle (11+) |
| Offre étalée | `getNpcQuestState` (`npc-dialog.js:15`) s'arrête à la **1ʳᵉ** quête actionnable | Dumbledore ne propose jamais 2 quêtes à la fois |
| Signatures de Maison | `unlockHouseSignatureQuest` + `HOUSE_SIGNATURE_FLOORS` | Gryffondor ét. 2, Serpentard ét. 4… |
| Paliers de prestige | `unlockHouseQuest` (tier 12), `unlockHouseMytheQuest` (tier 17) | quêtes de set / de don |
| Accept implicite | `implicitAccept` (ouverture à la découverte du déclencheur) | `manon_acte3` (1ᵉʳ feuillet ramassé) |
| Accessibilité garantie | `_ensureActiveKillQuestTargets` (`dungeon-spawning.js:101`) | une quête kill trouve toujours sa cible |

Les « Actes » sont narratifs (docs/histoire/04 : Acte I = ét. 1-3, II = 4-6,
III = 7-10) et incarnés côté code par les tranches d'étage + les jeux de pages
`GRIMOIRE_PAGES`/`ACT3_PAGES`. **Décision** (héritée de
`quest-system-revision.md`, validée par test) : pas de champ `acte` ni de
floor-gating supplémentaire des amorces early — cela contredirait le design
« objectifs-avant » (cf. test `quests.js:1311`).

✅ **Critère de vérification** : `node tests/units.js` §11/§11bis/§11ter verts
(intégrité référentielle 79 templates, dialogues Manon vivants).

### 1.2 Textes & dialogues PNJ — passe d'écriture ciblée (reste à faire)

État : la structure (`greeting` paginé, `idleRandom`, `questOffer/Active/
Ready/Done`, `dialoguesByQuest`, `contextualReaction`) et le haut du panier
(Dumbledore 4 pages + `eclatLines`, Manon 4 pages + 11 idle, Hagrid avec accent
et réaction à la mort d'Aragog) sont déjà au niveau. La passe cible les PNJ
**minces** — critère : < 3 `idleRandom` OU aucun `dialoguesByQuest` pour leurs
quêtes.

**Cibles priorisées** (audit `npcs-a/b.js`) :

| PNJ | Rôle | Manque constaté | Angle d'écriture |
|---|---|---|---|
| Rusard | ambiant récurrent | idle générique | rancune des Cracmols, tendresse cachée pour Miss Teigne |
| Trelawney | lore ét. moyen | peu de pages | prophéties à double lecture qui font écho à la Boucle |
| Rosmerta / Mondingus | vendeurs | transactionnel sec | commérages qui vendent le lore des étages inférieurs |
| Marchands Boucle (Clandestin, Apothicaire, Forgeron, Marchand d'Ombre) | endgame | interchangeables | chacun une théorie différente sur le Sceau — le joueur recoupe |
| Sir Patrick / Moine Gras / Sir Nicolas | fantômes | courts | rivalité de club des Sans-Tête, mémoire des Fondateurs |

💡 **Exemples de ton** (à décliner, 2-4 répliques par PNJ) :
- Rusard, idle : *« Mille ans de boue sur ces dalles, et c'est moi qu'on
  regarde de travers. Miss Teigne, elle, sait qui tient ce château debout. »*
- Marchand d'Ombre, idle : *« Le Sceau ? Un verrou, oui. Mais un verrou, ça
  a deux côtés, gamin. Demande-toi qui a la clef de l'autre. »*

**Side-quests P6 restantes** (2 sur 3 — `derniere_recette_elara` est livrée) :

| ID | Donneur | Objectif | Récompense | Beat narratif |
|---|---|---|---|---|
| `lettre_jamais_envoyee` | Manon (prereq `manon_clair_de_lune`) | item : porter la lettre d'Élara à Lupin (ét. 4) | xp/gold + `dialoguesByQuest` Lupin dédié | clôture épistolaire du triangle Manon/Élara/Lupin |
| `aconit_de_la_meute` | Lupin (prereq `manon_pardon`, minFloor 5) | item : 3 aconits (herbe existante ou nouvel item) | xp/gold + potion Tue-Loup (buff cosmétique/mineur) | Lupin assume sa condition devant sa fille |

### 1.3 Voix — 2-3 personnages clés (reste à faire : P5)

Pipeline **disponible dans cet environnement** (vérifié 2026-07-03) :
`tools/gen_voice_edge.py` (Edge-TTS, `pip install edge-tts` ✓) →
`audio/voice/_raw/*.mp3` → `tools/encode_voice.sh` (ffmpeg statique via
`pip install imageio-ffmpeg` ✓) → OGG mono 22 kHz. ❓ Accès réseau au service
Edge TTS à valider derrière le proxy ; sinon génération hors session
(protocole ElevenLabs prêt dans `voix-manon-elara.md`).

| Personnage | Priorité | Clés (déjà câblées ?) | Style vocal | Exemple (extrait) |
|---|---|---|---|---|
| **Manon** | 🔴 P0 — « cœur émotionnel », seul PNJ majeur muet | ✅ `manon_greeting_1..4` dans `_VOICE_SAMPLES` (`audio-music.js:331`), repli silencieux actif | ✅ **Décidé (2026-07-03) : Edge-TTS avec identité unique** — voir spec ci-dessous | *« Ce nom, il vit. Ici, plus bas, à l'étage de la Défense. C'est mon père. »* (textes complets : `voix-manon-elara.md §1`) |
**Spec voix Manon — identité unique en Edge-TTS** (même exigence de
distinctivité qu'Élara, leviers différents ; timbres déjà pris vérifiés dans
`gen_voice_edge.py:54-91` — Éloise = Hermione, Emma = Élara, Denise =
McGonagall-help, Vivienne = Chourave/Helga) :

1. **Timbre jamais utilisé** : `en-US-AvaMultilingualNeural` (douce, jeune,
   légèrement « autre » en français). 💡 Bonus narratif : une **parenté de
   timbre avec Élara** (Emma, même famille multilingue « d'ailleurs ») — la
   fille porte l'écho de la voix de sa mère, sans être identique.
2. **Prosodie ÉVOLUTIVE par page** — traitement qu'aucun autre PNJ n'a (tous
   ont un réglage fixe) : l'arc émotionnel du greeting est joué dans les
   réglages, du repli vers l'élan :
   | Clé | rate | pitch | Intention |
   |---|---|---|---|
   | `manon_greeting_1` | −10 % | +4 Hz | voix basse, refermée (la fugueuse) |
   | `manon_greeting_2` | −8 % | +4 Hz | le récit s'installe (Élara, la malle) |
   | `manon_greeting_3` | −6 % | +6 Hz | la découverte (la photo, le nom) |
   | `manon_greeting_4` | −2 % | +8 Hz | l'élan, presque un sourire (« Tu veux bien m'écouter ? ») |
3. **Encodage SEC** (chaîne standard d'`encode_voice.sh`, sans filtre) : pas
   de réverbe-mémoire — Élara est un souvenir, **Manon est là, à hauteur
   d'épaule**. Le contraste sec/réverbéré distingue immédiatement la fille
   vivante de la mère défunte quand les deux voix s'enchaînent dans l'arc.
4. Upgrade ElevenLabs possible plus tard, fichier par fichier (protocole
   conservé dans `voix-manon-elara.md`), sans toucher au câblage.

| Personnage | Priorité | Clés (déjà câblées ?) | Style vocal | Exemple (extrait) |
|---|---|---|---|---|
| **Esprit de Sirius** (ét. 10/20) | 🟠 P1 | ❌ à câbler (`sirius_greeting_*`) | Voix d'homme mûre, chaleureuse, légère réverbération « écho » à l'encodage (signature type Élara) | *« Douze ans derrière un voile, et c'est encore pour Harry que je reste. Va — je garde la porte. »* |
| **Gardien de la Boucle** (ét. 11+) | 🟠 P1 | ❌ à câbler (`gardien_boucle_greeting_*`) | Grave, lent, légèrement dénaturé — réutiliser la chaîne d'effets des voix Fondateurs (`founder_*`, pipeline livré Lot 5 escape) | *« Tu reviens. Ils reviennent tous. La Boucle ne se lasse pas — et moi non plus. »* |

### 1.4 Quête finale de Manon ✅ (constat)

`manon_clair_de_lune` (« Clair de Lune », `quests-templates.js:861`) :
prereq `manon_acte3`, objectif kill 2 Détraqueurs, récompense
`{xp:560, gold:240, item:"livre_lumiere_patronus", stats:{mag:1, lck:1}}`.
Le lien au père est le moteur du beat (`npcs-a.js:524-536` : le livre que
Lupin achève — « tout ce qu'il sait de cette lumière-là »). **Élément choisi :
Lumière** — le plus cohérent : Patronus (signature de Lupin), anti-Détraqueurs
(l'objectif), et contrepoint narratif au givre d'Élara (`hiverClair`).

### 1.5 Livres de maîtrise élémentaire ✅ + volet profil (reste : P7)

6 livres `type:"masterybook"` (`data-items.js:436-441`), +12 % permanent
(within-run, groupe entier) via `elementalMastery[el]`, injecté dans le
pipeline additif (`_elementalMasteryBonus` → `_computeSpellDamage` +
`executeAttack`) :

| Élément | Livre | Obtention |
|---|---|---|
| 🔥 feu | `livre_feu_dragon` « Souffle du Magyar » | drop Magyar Ancestral |
| ❄️ glace | `livre_glace_elara` « Givre Éternel » | drop Spectre de Givre |
| ⚡ foudre | `livre_foudre_orage` « Fureur de l'Orage » | drop Héraut de l'Orage |
| ✨ lumière | `livre_lumiere_patronus` « Clair de Lune » | **quête finale Manon** |
| 🌑 ténèbres | `livre_tenebres_pacte` « Pacte d'Ombre » | drop Héraut des Ténèbres |
| ⚔️ physique | `livre_physique_lion` « Cœur de Lion » | drop Fenrir Greyback |

Affichage actuel : panneau « 📖 Maîtrises élémentaires » de la **fiche perso**
(`_renderElementalMasteryPanel`, `ui-character-sheet.js:236`).

💡 **P7 — « visibles sur le profil utilisateur »** : ajouter au **Codex du
Sorcier** (`profile.js`, `hogwarts_rpg_profile`) une section « Bibliothèque
des Maîtrises · N/6 » : 6 puces (grisées/colorées) alimentées par un nouveau
champ persistant `masteredElements: []` (union cross-run, rempli par
`learnMasteryBook`). ⚠️ **Contrainte cardinale respectée** : profil
**purement cosmétique** — la collection n'octroie AUCUN bonus (le buff reste
`elementalMastery`, within-run, zéro héritage — équilibrage Ch.13/NG+).

## ÉTAPE 2 — Plan d'implémentation (Lot 1)

| # | Tâche | Fichiers | Vérification | Cache PWA |
|---|---|---|---|---|
| P5a | Voix Manon **Edge-TTS, identité unique** (spec §1.3 : Ava multilingue + prosodie évolutive par page + encodage sec) : entrée `manon` dans `VOICES` + textes dans `LINES` de `gen_voice_edge.py` (copie exacte `npcs-a.js`), générer, encoder OGG | `tools/gen_voice_edge.py`, `audio/voice/_raw/`, `audio/voice/` | écoute (arc repli→élan perceptible, contraste sec vs réverbe Élara) ; audible in-game (clés déjà câblées, zéro JS) ; `smoke` filtré npc/audio | non (assets à la demande, pas de précache) |
| P5b | Voix Sirius + Gardien de la Boucle : clés `_VOICE_SAMPLES` + appels `playVoice` au greeting (modèle Manon/Lupin) + OGG | `audio-music.js`, `npc-dialog.js` (si hook requis), assets | `smoke` npc ; repli silencieux vérifié sans asset | ✅ bump `audio-music.js` |
| P6a | 2 side-quests (`lettre_jamais_envoyee`, `aconit_de_la_meute`) + dialogues | `quests-templates.js`, `npcs-a.js` | `units.js` §11ter (intégrité réf.) + scénario smoke quests | ✅ bump |
| P6b | Passe d'écriture PNJ minces (§1.2, ~6 fiches) | `npcs-a.js`, `npcs-b.js` | `smoke` npc/dialog ; relecture | ✅ bump |
| P7 | Collection Codex du Sorcier (`masteredElements`) | `profile.js`, `inventory.js` (hook `learnMasteryBook`), style inline | `units.js` (profil rond-trip) + smoke save | ✅ bump |
| P-doc | Réconcilier `docs/histoire/08` (capstone Manon + masterybooks) | docs uniquement | relecture ; `check_doc_modules` sans objet | non |

Ordre : P5a → P6a → P7 → P6b → P5b → P-doc. Chaque item = 1 PR autonome,
`commit-guard` (plan à jour → smoke → cache-bump → état PR).

---

# LOT 2 — Mécanique Escape Game (Poches du Sceau)

## ÉTAPE 1 — Spécifications ✅ **ENTIÈREMENT LIVRÉ** (constat)

> Lots 0→5 + polish post-Lot 5 tous cochés dans `escape-game-traps.md`
> (PRs #698→#707, dernière livraison : voix murmurées des Fondateurs,
> 2026-07-03). La demande est **satisfaite point par point** :

| Exigence demandée | Livré (vérifié `js/escape-pocket.js`) |
|---|---|
| Étage 11+ | gate `canTriggerEscapePocket` : `victoryAchieved && currentFloor >= 11`, pas en visite MP, pas de Poche imbriquée |
| Rythme ~1 / 2-3 étages | `ESCAPE_POCKET_CHANCE = 0.25` par piège + cap 1/étage + cooldown 1 étage |
| 3 exemples concrets | **A « L'Énigme des Quatre »** (Rowena — 3 stèles d'énigme, mauvaise réponse = +15 % corruption) · **B « Le Miroir de Salazar »** (3 fragments à déposer dans l'ordre sur l'autel, un écho du groupe brouille) · **C « L'Écho du Scellement »** (Godric+Helga — budget ×0,7, 3 brasiers rendent du budget, refuge, échos hostiles) |
| Variantes selon Maison | `pickEscapePocketType(rng, chosenHouse)` : biais 1/2 vers le Fondateur de la Maison ; House-match = indice gratuit + budget +20 % + sort des Ruines en avance |
| Lore fail-safes des Fondateurs | thème « écho figé du scellement », voix murmurées `founder_*`, tileset froid `seal_*`, transition violet-givre |
| Récompenses (Éclats, Codex…) | +1 Éclat (`accumulatedEclats`, sans créditer le jalon canon `echo_scene_sceau`), butin curaté, Codex `poche_du_sceau` + `poche_<founder>`, quête répétable « Endurer les Poches » |
| Échec | malus « Corruption » −15 % ATK/DEF/MAG ×20 pas ; Ironman = Écho Corrompu (boss) → mort définitive possible |

## ÉTAPE 2 — Plan (Lot 2) : validation, pas d'implémentation

| # | Tâche | Méthode | Critère |
|---|---|---|---|
| V1 | Session de calibration terrain | run manuel Boucle 11→17 avec `localStorage.hogwarts_balance_debug='1'` ; lire `BalanceLog.summary` (`escapeClearRate`, `escapeCorruptionMean`, `escapeCount`) | clear-rate cible **60-75 %** hors House-match ; fréquence ressentie ≈ 1/2-3 étages |
| V2 | Boutons de réglage si écart | constantes en tête d'`escape-pocket.js` (`ESCAPE_POCKET_CHANCE`, `ESCAPE_BUDGET_BASE/FLOOR`, `ESCAPE_WARDEN_BUDGET_MULT`) — 1 PR de tuning max | re-mesure V1 |
| V3 | Intégrer au playtest release (Lot 4/P10) | ajouter une section « Poches » au protocole §4.2 | verdict GO consigné |

❓ Aucun ❓ produit ouvert — le seul point du plan d'origine (crédit du jalon
`echo_scene_sceau`) a été tranché : la Poche ne le crédite **pas**.

---

# LOT 3 — Polish UX / Audio & Performance

## ÉTAPE 1 — État & spécifications

### 3.1 Feedback combat / menus / inventaire / mobile ✅
Chantier **clos le 2026-06-27** (`ux-polish-review.md`, 12 lots C1-C3/H1-H4/
M1-M5, PRs #664→#682). Rien à rouvrir — toute retouche passera par la skill
`ui-design-iterate` au cas par cas si le playtest (Lot 4) remonte un point.

### 3.2 Ambiances sonores ✅
5 ambiances zonées (`intro/dungeon/depths/abyss` + `tension` en couche
« danger critique ») + 5 musiques de combat par axes (epic/late/difficulté) +
`menu_theme`/`ending_break` + ~194 voix. Complet ; les seuls ajouts audio
restants sont ceux du Lot 1 (P5).

### 3.3 Performance — le vrai reliquat (P8)
Fait : Lighthouse 59→**69**, LCP 29,7 s→**6,1 s** (lazy-load hors-viewport,
`fetchpriority`) ; P2 runtime complet (log combat borné, cartes ennemies
mutées en place, cache d'étages LRU, lazy bestiaire) ; SW install tolérante.

Reste (bloqué à l'époque par l'outillage image, **désormais disponible** :
Pillow 12.3 s'installe dans l'env — vérifié 2026-07-03) :

| # | Tâche | Gain attendu | Note |
|---|---|---|---|
| P8a | `tools/optimize_images.py` (PIL) : quantization palette des 78 sprites monstres 512² (~17 Mo) + resize des surdimensionnés (`rosmerta.png` 1,57 Mo, `mundungus.png` 1,55 Mo → ~128-256 px utiles) + recompression `title.jpg` | `img/` **45 Mo → ~20-25 Mo** — le plus gros gain joueur restant | script de pré-traitement, zéro code runtime ; contrôle visuel obligatoire (painterly → quantize prudent, dithering) |
| P8b | Re-pass Lighthouse après P8a (protocole `docs/perf-lighthouse.md`) | LCP < 5 s, score > 75 | mesure avant/après consignée |
| P8c | ❓ Purge planches `_ingame*` (~1,8 Mo) + doublon `img/houses/v2/` (~1,5 Mo) — non référencés (grep confirmé) | poids repo seulement (jamais téléchargés) | **en attente d'aval explicite** (suppression d'assets non créés par la session) |
| P8d | ❓ P2-5 concat JS (98 `<script>` → bundles) | latence 1ʳᵉ visite | 💡 **reco : écarter** — risque ordre de chargement + touche `deploy.yml`, gain marginal derrière HTTP/2 + SW |

## ÉTAPE 2 — Plan d'implémentation (Lot 3)

1. **P8a** — script + exécution par familles d'assets (monstres → npc → icônes),
   1 PR par famille avec échantillon avant/après (`tools/_shots/`).
   → vérifier : `smoke` visuals + contrôle visuel manuel ; aucun bump PWA
   (les PNG ne sont pas versionnés `?v`, cache SWR) mais **bump
   `CACHE_VERSION`** recommandé pour forcer le refresh des images modifiées.
2. **P8b** — mesure Lighthouse (serveur local, cache vide), consigner dans
   `docs/perf-lighthouse.md`.
3. **P8c/P8d** — ne rien faire sans validation utilisateur (❓ ci-dessus).
4. Checklist de validation finale (reprise de `perf-optimization.md`) :
   chargement froid < 5-6 s, FPS stable combat long + Boucle profonde,
   pas de montée mémoire sur 10 étages, `units` + `smoke` + `pwa-smoke` verts.

---

# LOT 4 — Communication & Release

## ÉTAPE 1 — Spécifications & contenu

### 4.1 README v2 + page GitHub (P9)

Le README actuel est propre (features, stack, tests, docs) ; meta/OG de
`index.html` complets (`og:image` = `title.jpg`). Manques : **visuels**,
**contrôles**, **changelog**.

| Ajout | Contenu | Source |
|---|---|---|
| Screenshots ×4 | bandeau titre + vue donjon 3D, combat (groupe 3 ennemis + FX), fiche perso paper-doll, mobile (D-pad) — format `docs/screenshots/*.jpg` ≤ 200 Ko chacun | captures **réelles** via Playwright (`tests/_playwright.js`, protocole skill `ui-design-iterate`) — pas les mockups de `tools/` |
| Section 🎮 Contrôles | table desktop (↑↓←→ / ZQSD-WASD, raccourcis remappables) + mobile (D-pad, swipe canvas) | CLAUDE.md « Contrôles de déplacement » |
| `CHANGELOG.md` | curaté par thèmes (pas commit-par-commit) : Poches du Sceau, maîtrises élémentaires, arc Manon, NG+, Ironman/HoF, Mondes Parallèles, perf/PWA… | historique PRs (#600→#708) + plans archivés |
| Description | resserrer le pitch d'ouverture (1 phrase-choc + 3 puces) et pointer le CHANGELOG | — |

### 4.2 Plan de playtesting final (P10)

Consolider l'existant en **une checklist release** (`docs/release-checklist.md`) :

| Volet | Protocole source | Ajout |
|---|---|---|
| Parcours complet ét. 1→10 + victoire | `.claude/plans/qa-parcours-complet.md` | re-run sur build candidate |
| Endgame / lassitude | `docs/playtest-3-boucles.md` (3 Boucles) | + section **Poches du Sceau** (V1/V3 du Lot 2, télémétrie) |
| Perf | checklist `perf-optimization.md` + `docs/perf-lighthouse.md` | mesures post-P8 |
| Mobile réel | session 15 min Android médian | offline PWA + swipe + D-pad |
| Régression | `units` + `smoke` (159 scénarios) + `pwa-smoke` + 3 garde-fous CI | tout vert sur la branche release |

Sortie : verdict GO / liste d'ajustements, chacun re-priorisé dans ce plan.

### 4.3 Annonce de mise à jour majeure (P11) — draft

> **🏰 Poudlard & Magie — Mise à jour majeure : « Le Sceau des Fondateurs »**
>
> Le dungeon-crawler Poudlard & Magie sort de Release Candidate ! Au menu de
> cette version finale :
>
> - 🗝️ **Les Poches du Sceau** — un escape game caché dans les pièges de la
>   Boucle Ténébreuse : énigmes de Rowena, miroir de Salazar, brasiers de
>   Godric et Helga… avec des variantes selon votre Maison.
> - 📖 **Les six Maîtrises élémentaires** — des livres légendaires à arracher
>   aux plus grands boss, pour des bonus permanents de feu, glace, foudre,
>   lumière, ténèbres et acier.
> - 🌙 **L'arc de Manon, achevé** — six quêtes, un père retrouvé, et le
>   « Clair de Lune » en héritage. Désormais avec des voix.
> - ⚡ Des dizaines de polish : combats plus lisibles, chargement plus
>   rapide, mobile peaufiné.
>
> Jouable gratuitement, hors-ligne, sans installation :
> **<https://kenhuri69.github.io/hogwarth/>** — vos sauvegardes sont conservées.

(Canal : section « Annonce » du README + release GitHub taguée ; à adapter si
publication ailleurs.)

## ÉTAPE 2 — Plan d'implémentation (Lot 4)

| # | Tâche | Fichiers | Vérification |
|---|---|---|---|
| P9a | Captures Playwright (4 vues, desktop+mobile) | `docs/screenshots/` | poids ≤ 200 Ko/img, rendu vérifié |
| P9b | README v2 (screenshots, contrôles, lien changelog, pitch) | `README.md` | relecture ; liens valides |
| P9c | `CHANGELOG.md` curaté | racine | relecture ; croiser avec l'historique PR |
| P10 | `docs/release-checklist.md` consolidée | docs | dérouler la checklist = playtest |
| P11 | Annonce finalisée (post-P8/P9, chiffres à jour) | README §Annonce + release GitHub | validation utilisateur ❓ avant publication externe |

Doc/assets only → pas de bump PWA (sauf si `index.html` est retouché).

---

## 5. Priorisation globale & ordre d'exécution

| Ordre | Item | Lot | Effort | Impact joueur | Risque |
|---|---|---|---|---|---|
| 1 | P5a Voix Manon | 1 | S (assets) | 🔴 fort (cœur émotionnel muet) | nul (clés câblées, repli silencieux) |
| 2 | P8a-b Compression images + Lighthouse | 3 | M | 🔴 fort (1ʳᵉ visite, mobile) | faible (pré-traitement, contrôle visuel) |
| 3 | P6a Side-quests Manon/Lupin | 1 | M | 🟠 moyen | faible |
| 4 | P7 Collection Codex du Sorcier | 1 | S | 🟠 moyen | faible (cosmétique pur) |
| 5 | P9a-c README v2 + CHANGELOG | 4 | M | 🟠 moyen (acquisition) | nul |
| 6 | P6b Passe d'écriture PNJ + P5b voix Sirius/Gardien | 1 | M | 🟡 | faible |
| 7 | V1-V3 Validation Poches + P10 checklist release | 2+4 | M (humain) | 🟠 | nul |
| 8 | P11 Annonce | 4 | S | 🟠 | ❓ validation avant publication |
| — | P8c purge assets, P8d concat JS | 3 | — | 🟡 | ❓ **en attente d'aval explicite** |

## ❓ Décisions en attente (utilisateur)

1. ~~**Voix Manon** : Edge-TTS vs ElevenLabs~~ ✅ **Tranché (2026-07-03)** :
   **Edge-TTS**, avec un travail dédié d'identité vocale unique (spec §1.3 :
   timbre Ava jamais utilisé + parenté de timbre avec Élara + prosodie
   évolutive par page + encodage sec). Upgrade ElevenLabs possible plus tard,
   fichier par fichier.
2. **P8c** : suppression des planches `_ingame*` et du doublon `houses/v2`
   (~3,3 Mo repo, jamais servis) — aval explicite requis.
3. **P8d** : concat JS — *(reco : écarter, risque > gain.)*
4. **P11** : canal de publication de l'annonce.

## Journal d'avancement

- **2026-07-03** — Plan créé. Audit transversal code + plans existants :
  Lot 2 (Poches du Sceau) **déjà entièrement livré** ; Lot 1 livré aux ¾
  (capstone Manon + 6 masterybooks + gating ✅ ; restent voix Manon, 2
  side-quests, collection profil, passe d'écriture) ; Lot 3 clos côté UX,
  reliquat = compression images (outillage désormais dispo : Pillow,
  edge-tts, ffmpeg statique vérifiés dans l'env) ; Lot 4 = principal
  chantier neuf (README v2, CHANGELOG, checklist release, annonce).
- **2026-07-03 (finalisation)** — Décision voix Manon tranchée : **Edge-TTS
  avec identité vocale unique** (spec complète §1.3 — timbre
  `en-US-AvaMultilingualNeural` inédit, parenté de timbre mère/fille avec
  Élara, prosodie évolutive par page du repli vers l'élan, encodage sec en
  contraste avec la réverbe-mémoire d'Élara). P5a précisé en conséquence.
  Plan finalisé et soumis en PR — l'implémentation démarre dans une
  session dédiée (prompt de lancement fourni à l'utilisateur).
- **2026-07-04 — P5b LIVRÉ** ✅ (item n°6, 2/2) : voix Esprit de Sirius +
  Gardien de la Boucle. Sirius : timbre inédit `en-US-BrianMultilingualNeural`
  (mûr, chaleureux) + nouvelle signature `SIRIUS_FILTER` à l'encodage (écho
  léger « voix de l'au-delà » — parent de la réverbe-mémoire d'Élara, plus
  court, sans ralenti : un esprit présent). Gardien : `fr-FR-HenriNeural`
  grave/lent + **chaîne d'effets des Fondateurs réutilisée** (case
  `gardien_boucle_*` → FOUNDER_FILTER), niveau conforme aux founders
  (−33 dB). 4 OGG (8-12 s), textes = copie exacte npcs-b.js. Câblage :
  4 clés `_VOICE_SAMPLES` + cases `_voiceKeyForPage` (greeting SEUL voixé,
  modèle Manon — quêtes multiples = repli silencieux, pas de collision).
  Smoke : T5bis dans scenarioHeadOfHouseVoice (clés, mapping, replis
  null) + npc (11) ✅. Bump audio-music/npc-dialog + CACHE_VERSION.
  **Item n°6 (P6b+P5b) terminé.**

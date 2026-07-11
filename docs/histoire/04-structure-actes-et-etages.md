# 04 — Structure : actes & étages

**Statut :** 🟩 proposition de référence — à valider

> 📊 **Statut réel (code)** : ✅ tranches A/B/C/D + transitions + événements
> d'étage livrés — modules : `js/floor-themes.js`, `js/dungeon.js`,
> `js/movement-floors.js`, `js/floor-events.js`.
> Cf. [index doc ↔ module](../README.md#index-doc--module--statut-réel).

> Objectif du chapitre : faire le pont entre la **structure de jeu** (étages) et
> la **structure narrative** (actes). Donner à chaque tranche d'étages une
> identité de lieu, d'ambiance et de progression dramatique, et **aligner** cette
> ossature sur tout le contenu récent : déclencheur de la Clé de Voûte, fil rouge
> des **Éclats**, **quêtes signature** de Maison, **voix des Fondateurs**,
> familles du **bestiaire**, et **personnages jouables**. `💡` = proposition
> argumentée ; `✅` = acté dans le jeu. À lire avec la trame déroulée en
> [03](03-trame-principale.md), le cadre fictionnel en
> [02](02-univers-ton-et-canon.md), et le **décor vivant** étage par étage en
> [10](10-lieux-et-geographie.md).

---

## Tranches d'étages (✅ dans le jeu — `floor-themes.js`)

| Tranche | Étages | Lieu | Ambiance (musique) | Ton narratif |
|---------|--------|------|--------------------|--------------|
| **A** | 1–3 | Couloirs de Poudlard | `intro` | Familier, l'école |
| **B** | 4–6 | Cachots de Poudlard | `dungeon` | Descente, austère |
| **C** | 7–13 | Profondeurs Oubliées | `depths` | Inconnu, abyssal |
| **D** | 14+ | Ruines Anciennes | `abyss` | Endgame, runique |

✅ Le découpage est la **source unique de vérité** du tileset *et* de la
musique ambiante (`getFloorTheme()` — pur, consommé par `renderer.js`,
`audio-music.js`, `movement.js`). Des **transitions** (fondu noir 600 ms +
toast) marquent les frontières **3↔4, 6↔7, 13↔14**.

> 💡 **Lecture transversale** : ces quatre tranches sont **quatre strates de
> mémoire** (cf. [10 §10.3](10-lieux-et-geographie.md)) — *descendre, c'est
> remonter le temps*. La structure dramatique ci-dessous se cale sur cette
> géologie : plus on s'enfonce, plus on s'approche de ce que la **Clé de Voûte
> des Quatre** tenait scellé (cf. [03 §3.1](03-trame-principale.md)).

---

## 4.1 Découpage en actes

> 💡 (proposition) / ✅ (ancrages)

Les actes narratifs s'**alignent exactement** sur les tranches de tileset, avec
une exception calculée : l'Acte III court sur la tranche C **mais s'arrête au
climax de l'étage 10** ; la fin de la tranche C (étages 11–13) bascule déjà dans
l'Acte IV (post-game). C'est volontaire : le **climax (Voldemort, ét. 10) tombe
au cœur de la tranche C**, pas à sa frontière — la fracture dramatique précède
la fracture de décor.

| Acte | Étages | Tranche | Pivot dramatique |
|------|--------|---------|------------------|
| **Prologue** | — | — | ✅ Intro Dumbledore (la **Clé de Voûte se fend** en plein cours) + choix de Maison. |
| **Acte I — L'École** | 1–3 | A | Prise en main ; comprendre que *le mal vient d'en bas*. Greffe de la **quête signature** de Maison. |
| **Acte II — La Descente** | 4–6 | B | Les cachots ; révélation : *Voldemort se reconstitue* et la Clé scellait **deux** choses. |
| **Acte III — Les Profondeurs** | 7–10 | C (début) | Boss canon ; marche vers la source ; **remise cérémonielle** de la récompense de signature. |
| **Climax** | **10** | C | ✅ **Voldemort Ressuscité** — chute de l'arc principal (**modificateur de signature** one-shot). |
| **Acte IV — La Boucle Ténébreuse** | 11+ | C (fin) → D | Post-game : le château rejoué corrompu ; **Ruines Anciennes** (14+). |

> 💡 **Pourquoi le climax à l'étage 10 et non à une frontière de tranche ?**
> Parce que la victoire est ce qui **fait basculer le décor** : tant que
> Voldemort n'est pas vaincu, l'escalier de l'étage 10 est **scellé**
> (✅ `victoryAchieved`). C'est l'acte du joueur — pas un seuil arbitraire — qui
> ouvre les Profondeurs profondes (11–13) puis les Ruines (14+). Le climax est
> donc le **verrou** entre la trame principale et l'endgame.

> ✅ **Garde-fou de trame** : la **descente** et la **chute de Voldemort** sont
> la *seule* colonne obligatoire. Quêtes, PNJ, signatures et sous-intrigues sont
> **optionnels** — aucun ne gate l'escalier ([03 §3.6](03-trame-principale.md)).

## 4.2 Jalons par tranche

> 💡 (proposition) / ✅ (ancrages)

### Prologue — La fêlure (intro)

- ✅ **Beat fondateur** : un cours d'**Histoire de la Magie** (Binns) ; sur son
  socle, la **Clé de Voûte des Quatre** — relique forgée par les quatre
  Fondateurs. Un son de glace qui se fend, une **fêlure**, le givre gagne les
  pupitres, les grands escaliers **basculent vers le bas**. Le portrait de
  Dumbledore s'anime : la Clé était **le verrou** ; il faut **descendre à
  contre-courant** ([03 §3.1](03-trame-principale.md)).
- ✅ **Flux de jeu** : écran d'intro paginé (`intro.js`) → choix de Maison →
  donjon, où le portrait de Dumbledore (étage 1) confie `intro_tutoriel`.
- 💡 **Promesse posée** : le **froid surnaturel**, les **escaliers descendants**
  et les **profondeurs qui remontent** sont tous expliqués d'un seul tenant par
  la fêlure — c'est le moteur des quatre actes.

### Acte I — L'École (étages 1–3, tranche A)

- **Beat narratif** : le familier se fissure. Des créatures presque
  domestiques (chat de Mme Norris, Peeves, lutins, portraits hostiles) tournent
  à l'agressivité — premier symptôme de la corruption (bestiaire **famille F1**,
  [09 §9.3](09-bestiaire-et-lore.md)).
- ✅ **PNJ-jalons & quêtes** : Madame Pomfresh (`mandragore_pomfresh`, ét. 2),
  Mimi Geignarde (`troll_toilettes`, ét. 2), Hagrid (`chouette_perdue`),
  Gilderoy Lockhart (`livre_interdit`, ét. 3), Norbert Dragonneau (niffleur).
- 💡 **Quête signature de Maison qui s'amorce** (cf. §4.6) : 🦁 *L'Étendard de
  Godric*, 🦡 *Ceux qu'on ne laisse pas derrière*, 🦅 *Le Codex de Rowena*
  (1ʳᵉ stèle). 🐍 patiente jusqu'aux cachots.
- ✅ **Fil rouge — 1ᵉʳ Éclat** : la quête optionnelle *« Les Éclats de la Clé de
  Voûte »* (`eclats_clef_voute`, Dumbledore) fait tomber le **1ᵉʳ `eclat_voute`**
  sur **Peeves** — *« quelque chose s'est brisé »* ([08 §8.6.1](08-quetes-et-sous-intrigues.md)).
- 💡 **Événement marquant** : la **première fontaine** (✅ étage 2) — un répit
  qui dit au joueur *« tu vas en avoir besoin »*. Premier escalier descendant
  vécu comme un seuil.

### Acte II — La Descente (étages 4–6, tranche B)

- **Beat narratif** : l'école laisse place à la pierre froide. ✅ Les
  **mangemorts masqués** apparaissent — la corruption a des *fidèles* qui
  hâtent le retour de leur maître (bestiaire **famille F4**,
  [09 §9.6](09-bestiaire-et-lore.md)). Révélation centrale : *Voldemort se
  reconstitue au fond*, et la Clé scellait **deux** maux (corruption
  pré-Poudlard **et** le résidu de Voldemort).
- ✅ **PNJ-jalons & chefs** : Hagrid (`chouette_perdue`, ét. 4), Remus Lupin
  (mentor Patronus, ét. 4), chefs de Maison Rogue (Serpentard, ét. 4),
  McGonagall (Gryffondor, ét. 5), Flitwick (Serdaigle, ét. 6) ; portrait de
  Dumbledore (ét. 6) ouvre *Lux Aeterna*.
- 💡 **Quête signature qui se noue** : 🐍 *Le Pacte des Cachots* s'ouvre (écho de
  **Salazar**, scellé *avec* la corruption — choix `slythPactChoice`) ;
  brasiers du Lion (🦁) ; feuillets du Codex (🦅) ; premières âmes du Refuge (🦡).
- ✅ **Sous-intrigues** : amorce du **grimoire d'Élara** (Manon — givre et
  deuil, écho au froid du sceau) et **Lux Aeterna** de Dumbledore (souvenir
  heureux contre les ténèbres) ([08 §8.3](08-quetes-et-sous-intrigues.md)).
- ✅ **Fil rouge — 2ᵉ Éclat** : le **2ᵉ `eclat_voute`** tombe sur le **Loup-Garou
  Adulte** — *« on le nourrit »* (la fêlure est alimentée d'en bas).
- ✅ **Événement marquant** : la **transition 3↔4** (fondu + toast) — première
  vraie rupture de décor, on quitte l'école.

### Acte III — Les Profondeurs (étages 7–10, tranche C début)

- **Beat narratif** : on quitte le Poudlard connu pour des **Profondeurs
  Oubliées**. Montée en gamme : élite mangemort, créatures majeures
  (bestiaire **familles F4-F5**, [09 §9.6-9.7](09-bestiaire-et-lore.md)), puis
  les boss canon qui gardent la route vers la source.
- ✅ **Boss-jalons** : **Fenrir Greyback** (ét. 8), **Voldemort Affaibli**
  (ét. 9 — premier contact, encore incomplet), **Veilleur du Seuil** (ét. 8 —
  graine runique des Ruines), **Aragog** (ét. 9), **Antonin Dolohov** (ét. 10),
  **Bellatrix** (ét. 8). Chaque boss tombé *affaiblit le sceau*.
- ✅ **PNJ profonds** : Fumseck (phénix, ét. 7), Kingsley (ét. 8), Bill Weasley
  (ét. 9), Esprit de Sirius (ét. 10), marchands ténébreux (Essence/Page).
- 💡 **Signature — apogée** : mini-boss / révélations propres à chaque Maison et
  **remise cérémonielle** de la récompense exclusive (Bannière de Godric /
  pacte ou défi de Salazar / Codex complété / Médaillon de Helga).
- ✅ **Fil rouge — 3ᵉ Éclat** : le **3ᵉ `eclat_voute`** tombe sur le **Mangemort
  d'Élite** — *« le sceau retenait deux choses, pas une »* : révélation complète
  du fil rouge.
- ✅ **Voix des Fondateurs** : la **stèle de la Clé** (`r_clef_voute`), l'**écho
  de Salazar** (🐍), le **Codex de Rowena** (🦅) et le **portrait de Dumbledore**
  convergent ici — quatre angles d'une même vérité
  ([08 §8.6.2](08-quetes-et-sous-intrigues.md)).
- ✅ **Événement marquant** : la **transition 6↔7** ouvre l'abyssal.

### Climax — La chute de Voldemort (étage 10, tranche C)

- ✅ Au fond des Profondeurs, **Voldemort Ressuscité** (`voldemort_revenu`),
  pleinement reformé. Le vaincre déclenche la **cinématique de victoire**
  (discours de Dumbledore) et **scelle l'arc principal**.
- ✅ Réplique clé : *« L'escalier le plus profond, scellé par la peur, s'ouvre
  enfin. »*
- 💡 **Modificateur de signature (one-shot)** selon le flag `<house>SignatureDone`
  ([03 §3.8](03-trame-principale.md), [08 §8.5](08-quetes-et-sous-intrigues.md)) :
  🦁 neutralise la phase **terreur** (25 % PV) ; 🦅 **faiblesses révélées** d'office ;
  🐍 reconnaissance/lifesteal **ou** debuff (selon `slythPactChoice`) ; 🦡 buff
  de départ *« Espoir partagé »*. **Un flag, pas une fin alternative.**

> ✅ **Tranché par le jeu** : Voldemort est un boss à phases (`phases:` dans
> `monsters.js` — enrage à 50 % PV, terreur à 25 %, traité par
> `_checkBossPhases`).
>
> ❓ **À travailler en l'état** (non tranché par le jeu) : dialogue
> avant/pendant, et intervention d'un PNJ allié en combat (Sirius est un donneur
> de quête à l'étage 10, pas un combattant) — à concevoir si désiré.
> → [03 §3.5](03-trame-principale.md).

### Acte IV — La Boucle Ténébreuse (étages 11+, tranche C fin → D)

- **Beat narratif** : la victoire **ouvre** la faille au lieu de la refermer.
  Le château se rejoue **corrompu** ; sous le fond s'ouvrent les **Ruines
  Anciennes** (✅ tranche D, 14+), antérieures à l'école. Le héros, devenu
  **légende**, descend affronter ce que le mythe n'osait regarder
  ([01 §1.6-1.7](01-synopsis-et-pitch.md)).
- ✅ **Recyclage** : boss 8-10 de retour en variantes **Ténébreuses** aux
  étages 18-20 (bestiaire **§9.10**) ; PNJ profonds recyclés (Kingsley 8/18,
  Bill 9/19, Sirius 10/20) via `effectiveFloor`.
- ✅ **PNJ exclusif** : le **Gardien de la Boucle** (étage 11) donne 3 quêtes de
  purge répétables (`purge_loups` / `purge_acromantules` / `purge_mangemorts`)
  → matériaux Forge & Bibliothèque.
- ✅ **Paliers de Maison endgame** : **Mythe (17)**, **Apothéose (18)**, série
  **Apothéose ★ N** (prestige « infini ») + **don à la Maison** (gold-sink).
- 💡 **Écho de signature** : chaque Maison garde une trace mineure de sa quête
  (bannière déchirée à rétablir / dernier pacte / pages ténébreuses du Codex /
  refuge à raviver).
- ✅ **Événement marquant** : la **transition 13↔14** fait entrer dans les
  Ruines Anciennes — la frontière la plus solennelle du jeu (voir §4.5).

## 4.3 Rythme & escalade

> 💡 (lecture narrative) / ✅ (ancrages mécaniques)

La tension monte par **trois leviers** qui se renforcent, et que le joueur
ressent comme une pression croissante :

1. **Taille des groupes ennemis** (✅) : 1 ennemi tôt, puis groupes de 2-3, et
   les **groupes de 3 ne deviennent courants qu'à partir de l'étage 7+** (en
   duo) — soit pile à l'entrée des Profondeurs. Les gros groupes (4-5) sont
   réservés à l'endgame post-victoire. *Lecture narrative* : l'inconnu se peuple.
2. **Difficulté progressive au grind** (✅ `floorKillCount`) : plus on *ponce*
   un étage, plus les combats s'y densifient. ✅ Les **toasts de respawn**
   verbalisent cette montée (« Quelques ombres se reforment… » → « Le château
   pulse de menaces »). *Lecture narrative* : ta présence dérange ; rester,
   c'est attirer.
3. **Rareté du répit** (✅ fontaines aux étages 2, 5, 8, 11… ; 1 usage par
   visite d'étage) : les havres s'espacent à mesure qu'on s'enfonce. *Lecture
   narrative* : la lumière se raréfie.

> 💡 **Quatrième levier d'ambiance (proposé, cosmétique)** : un **niveau de
> corruption** dérivé de la profondeur (givre plus dense, fog plus froid,
> phrases d'ambiance plus sombres) — *non mécanique*, il fait **ressentir
> physiquement** la descente sans toucher l'équilibrage. Spéc d'implémentation :
> [10 §10.6](10-lieux-et-geographie.md) + plan
> [`chapters-04-10-lieux-ambiance.md`](../../.claude/plans/chapters-04-10-lieux-ambiance.md).

> 💡 **Courbe d'ensemble** : Acte I = pédagogie (on apprend à jouer en sécurité
> relative) ; Acte II = serrage (la menace se nomme) ; Acte III = crescendo
> (boss enchaînés vers le climax) ; Acte IV = plateau de prestige (la pression
> ne retombe pas, elle se *maîtrise*).

## 4.4 Étages spéciaux & évènements

> 💡 (proposition) / ✅ (ancrages)

Le procédural est ponctué de **cellules spéciales** qui scandent le rythme et
portent du lore (décor détaillé en [10 §10.4](10-lieux-et-geographie.md)) :

| Élément | ✅ Statut de jeu | Rôle narratif proposé |
|---------|-----------------|------------------------|
| **Fontaine** (⛲) | ✅ étages 2, 5, 8, 11… ; soin total 1×/visite | Havre — souffle entre deux paliers ; se tarit après usage (« la magie de ce lieu s'épuise »). |
| **Coffre / Boutique** | ✅ cellules générées par étage | Récompense de l'exploration ; le marchand profond vend Essence/Page en Boucle. |
| **Autel / Rune / Stèle d'énigme** | ✅ interactions dédiées | Vestiges d'une magie ancienne — densité croissante vers les Ruines. Les **stèles** posent des **devinettes** (lore) ; la **stèle de la Clé** (`r_clef_voute`) porte la **voix des Fondateurs**. |
| **Forge & Bibliothèque** | ✅ endgame | Ateliers de la Boucle : transformer les matériaux de purge en puissance. |
| **Jardin d'herbes** | ✅ besace d'herbes / craft | Respiration verte, écho de la Botanique (Chourave). |
| **Énigmes de Dumbledore** | ✅ `quests-riddles.js` (Lumière Éternelle) | Beat émotionnel : le souvenir heureux contre les ténèbres. |

> ✅ **Étages-scènes : tranché et livré** (`FLOOR_SCRIPTED_BEATS`,
> `floor-ambiance.js`) — beat écrit one-shot garanti à la première entrée des
> étages **1, 4, 7, 8, 9** (pré-victoire), **12, 13** (début de Boucle) et
> **15, 21** (Ruines), plus la variante post-victoire « Grande Salle »
> (étage 1) et l'étage-scène « Chambre des Fondateurs » (étage 17). L'étage 10
> (Voldemort) reste scénarisé de fait ; l'étage 11 passe par le **dialogue
> dédié du Gardien de la Boucle** (exclu volontairement du registre). Le
> procédural reste intact *autour* de ces points fixes (pur affichage textuel).

> ✅ **Fil d'Ariane « La Descente »** (Lot 1 revue 2026-07) : la colonne
> vertébrale est désormais **visible** — quête principale trackée en 4 étapes
> (`descente_1..finale`, flag `main`, épinglée 🧭 en tête du tracker),
> **non-gating** (le seul verrou reste `victoryAchieved`) et **auto-remise**
> (la remise EST la descente, aucun retour PNJ). Post-victoire, la boussole
> d'endgame prend le relais du guidage. En complément, trois
> **portraits-relais de Dumbledore** (étages 4/7/10, `npcs-a.js`) reçoivent
> la chaîne d'épreuves et les Éclats — plus besoin de remonter à l'étage 1.

## 4.5 La frontière 13↔14 — entrée des Ruines Anciennes

> 💡 (proposition) / ✅ (ancrages)

Des trois transitions, la **13↔14** mérite le **beat narratif le plus
appuyé** : c'est le moment où le héros quitte tout ce qui est *Poudlard* (même
corrompu) pour des **ruines pré-école**, runiques, antérieures aux Fondateurs.

- ✅ Mécaniquement : bascule de tileset (`rune_*`) **et** d'ambiance (`abyss`,
  le sample réservé aux Ruines), via un fondu + toast.
- 💡 Narrativement : on propose un **toast solennel dédié** (registre soutenu,
  voix des Ruines plutôt que voix scolaire), p. ex. *« Sous Poudlard, la
  pierre n'a plus de nom. Tu entres dans ce que l'école fut bâtie pour
  oublier. »* C'est le franchissement le plus mythologique du jeu — il confirme
  la thèse du §2.2 ([02](02-univers-ton-et-canon.md)) : *l'école est un
  couvercle sur plus vieux qu'elle.*

> ❓ À arbitrer : la 13↔14 reçoit-elle un **traitement audiovisuel renforcé**
> (toast long, voix dédiée, voire courte cinématique) ou reste-t-elle une
> transition standard avec un simple texte distinct ?

## 4.6 Greffe des quêtes signature & des personnages jouables

> 💡 (proposition) / ✅ (ancrages) — fiches en
> [07 §7.8](07-les-maisons.md) et [08 §8.5](08-quetes-et-sous-intrigues.md).

La trame reste **~80-90 % commune** ; selon `chosenHouse`, une **Quête
Signature** se greffe sur les Actes I→III et y dépose une couche *légère mais
perceptible*. Elle ne branche jamais l'arc en deux : elle s'ouvre en Acte I, se
noue en Acte II, culmine en Acte III, et pose un **modificateur one-shot** au
climax (§4.2).

| Maison | Quête signature | Donneur | Acte d'ouverture | Récompense / flag |
|--------|-----------------|---------|------------------|--------------------|
| 🦁 Gryffondor | *L'Étendard de Godric* | Chevalier Fantôme / McGonagall | I (ét. 2-3) | Bannière de Godric (anti-peur partielle) · `gryffSignatureDone` |
| 🐍 Serpentard | *Le Pacte des Cachots* | Écho de Salazar / Rogue | II (ét. 4+) | Avantage à double tranchant · `slythSignatureDone` + `slythPactChoice` |
| 🦅 Serdaigle | *Le Codex de Rowena* | Stèles / Flitwick | I→II (ét. 2-6) | Codex (révèle faiblesses) · `ravenSignatureDone` |
| 🦡 Poufsouffle | *Ceux qu'on ne laisse pas derrière* | Chourave | I (ét. 2+) | Médaillon de Helga / allié · `poufSignatureDone` |

> 💡 **Personnages jouables & étages** ([05](05-personnages-jouables.md)) : le
> choix du/des héros (Harry, Hermione, Céleste, Iris, Maxence, Anastasia) n'altère
> pas la **structure** des étages — combats, sauvegardes, équipement reposent sur
> `party[0]/party[1]`. Son impact est **cosmétique et émotionnel** : barks par
> événement (`bossAppear`, `tierTransition`, `houseTension[<Maison>]`) qui
> colorent les jalons ci-dessus (apparition de boss, franchissement de tranche).
> En **solo** comme en **duo**, l'ossature des actes est identique (la taille des
> groupes ennemis s'adapte, cf. §4.3, mais les beats sont les mêmes).

## 4.7 Règles de progression & rejouabilité

> 💡 (synthèse normative) / ✅ (ancrages)

**Règles de progression :**

1. ✅ **Une seule colonne obligatoire** : descendre → vaincre Voldemort (ét. 10).
   Rien d'autre ne gate l'escalier (ni quête, ni signature, ni Éclats).
2. ✅ **Le climax est un verrou** : l'escalier de l'étage 10 reste scellé sans
   `victoryAchieved` ; sa chute ouvre 11-13 puis les Ruines (14+).
3. ✅ **Répit cadencé** : fontaines tous les 3 étages (2, 5, 8, 11…), 1 usage
   par visite — rythme le souffle de la descente.
4. ✅ **Escalade triple** (§4.3) : groupes, densité au grind, raréfaction des
   havres. La pression croît avec la profondeur, jamais ne retombe.

**Rejouabilité :**

1. ✅ **Procédural seedé par étage** : la carte, les PNJ aléatoires et le butin
   varient à chaque partie (les PNJ déterministes restent ancrés à leur étage).
2. 💡 **Variantes par Maison** : la signature change l'Acte vécu (4 parcours
   greffés), et — proposé — une **ligne d'ambiance par Maison** colore
   l'exploration (Serpentard *voit* des passages, Gryffondor des champs de
   bataille, Serdaigle des glyphes, Poufsouffle des refuges — cf.
   [10 §10.6](10-lieux-et-geographie.md)).
3. 💡 **Variantes par héros** : 6 personnages × barks ⇒ la même descente
   *sonne* différemment ; solo vs duo change la texture des combats.
4. ✅ **Boucle Ténébreuse infinie** : recyclage `effectiveFloor`, variantes
   Ténébreuses (18-20), paliers Apothéose ★ N génératifs, don à la Maison
   (gold-sink) — une fin **ouverte** par design ([03 §3.6](03-trame-principale.md)).
5. ✅ **Mode Ironman + Hall of Fame** : permadeath + classement → relance la
   descente sous tension maximale (la structure est la même, l'enjeu change).

> ✅ **Garde-fou** : aucune de ces variantes ne crée de **fin alternative** ni
> ne modifie la structure des actes ; toutes sont des **couches** posées sur la
> même ossature A→B→C→D.

---

## Récapitulatif express (pour briefer Gemini)
> Les **actes calquent les tranches** A/B/C/D, à une exception près : le
> **climax (Voldemort, ét. 10) tombe au cœur de la tranche C**, car c'est la
> *victoire* qui débloque les étages profonds — le climax est le **verrou**
> entre trame et endgame. Prologue (la **Clé de Voûte se fend**) ; Acte I
> « L'École » (1–3) ; Acte II « La Descente » (4–6) ; Acte III « Les
> Profondeurs » (7–10, climax à 10) ; Acte IV « La Boucle Ténébreuse » (11+,
> Ruines Anciennes à 14+). Le **fil rouge des Éclats** dépose un `eclat_voute`
> par acte (Peeves → Loup-Garou Adulte → Mangemort d'Élite) ; les **quatre voix
> des Fondateurs** convergent en Acte III ; les **quêtes signature** greffent
> 4 parcours de Maison sans brancher l'arc ; le **bestiaire** monte de la
> famille F1 (école) à F5 (gardiens anciens). La tension monte par **taille des
> groupes**, **densité au grind** et **rareté du répit (fontaines)**, plus un
> **niveau de corruption** d'ambiance proposé. La **frontière 13↔14** est le
> franchissement le plus solennel — entrée dans des ruines pré-Poudlard.

## Points à trancher (résumé)
1. ✅ ~~Formaliser des **« étages-scènes » non procéduraux** ?~~ **Tranché et
   livré** : beats 1/4/7/8/9 + Boucle 12/13 + Ruines 15/21 (`FLOOR_SCRIPTED_BEATS`) ;
   l'étage 11 passe par le dialogue du Gardien. (§4.4)
2. ❓ **Traitement audiovisuel renforcé** de la frontière 13↔14 (toast long /
   voix dédiée / cinématique) ? (§4.5)
3. 💡 Adopter le **niveau de corruption** d'ambiance (cosmétique) comme 4ᵉ levier
   d'escalade ? (§4.3, spéc en [10 §10.6](10-lieux-et-geographie.md))

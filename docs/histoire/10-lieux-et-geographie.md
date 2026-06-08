# 10 — Lieux & géographie

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : traiter les **étages comme des lieux**, et faire **ressentir
> physiquement la descente**. Ambiance sensorielle, sens narratif, et ce que le
> joueur découvre en s'enfonçant — de l'école familière aux **Ruines Anciennes**.
> Ce chapitre est un **guide de voyage sombre** : on y descend palier par palier.
> `💡` = proposition modifiable ; `✅` = acté dans le jeu. Complète
> [04](04-structure-actes-et-etages.md) côté « décor & atmosphère », croise le
> bestiaire propre à chaque zone en [09](09-bestiaire-et-lore.md), et s'appuie
> sur le déclencheur de la **Clé de Voûte** ([03 §3.1](03-trame-principale.md)).

---

## 10.0 Cadre (✅ dans le jeu)

- **4 grandes zones verticales**, chacune avec son tileset et sa musique
  d'ambiance (source : `floor-themes.js`) :

| Zone | Étages | Décor | Ambiance | Ton narratif |
|------|--------|-------|----------|--------------|
| **A** Couloirs de Poudlard | 1–3 | Pierre claire, poutres | `intro` | Familier, l'école |
| **B** Cachots de Poudlard | 4–6 | Pierre sombre, tapis | `dungeon` | Descente, austère |
| **C** Profondeurs Oubliées | 7–13 | Caverne | `depths` | Inconnu, abyssal |
| **D** Ruines Anciennes | 14+ | Runes | `abyss` | Endgame, antérieur à l'école |

- **Transitions de tranche** marquées par un fondu + un toast aux frontières
  3↔4, 6↔7, 13↔14 (✅ `movement.js`). La tranche D n'est atteignable qu'en
  **Boucle Ténébreuse** (escaliers scellés sans victoire).
- **Mobilier de cellule** (✅) : fontaine (répit), coffre, boutique, **forge** &
  **bibliothèque** (endgame), **autel**, **stèle d'énigme**, **dalles-runes**
  (puzzle), jardin d'herbes, escaliers montant/descendant, portes.
- **Lieux nommés** (✅ `LOCATIONS`) : Les Couloirs de Poudlard, Le Cachot de
  Potions, La Grande Salle, La Bibliothèque Interdite, La Tour de Gryffondor,
  Le Donjon de Serpentard, Les Toilettes Hantées, La Forêt Interdite, La Salle
  sur Demande, Les Égouts de Poudlard, La Chambre des Secrets.

> 💡 **Le fil sensoriel du jeu** : la corruption a **trois signatures** héritées
> du sceau brisé ([09 §9.1](09-bestiaire-et-lore.md)) — le **froid surnaturel**
> (givre là où il ne devrait pas y en avoir), la **peur** (sceau de l'âme), et
> les **voix des Fondateurs** (murmures dans la pierre). Ces trois signatures
> **s'intensifient avec la profondeur** : c'est le fil rouge atmosphérique qui
> relie les fiches ci-dessous.

---

## 10.1 Identité narrative de chaque zone

### Zone A — Couloirs de Poudlard (étages 1–3)
> 💡 (proposition) / ✅ (décor)

**« On est encore à la maison — mais la maison a peur. »** Le héros démarre
dans le Poudlard reconnaissable : couloirs de pierre claire, poutres,
portraits, torches. C'est le décor de l'école, presque rassurant. La
dissonance est volontaire : ce familier est déjà **contaminé** — un chat qui
attaque, un portrait qui maudit, des escaliers figés vers le bas, un **givre**
qui s'accroche aux vitraux alors qu'on est en pleine année.

- **Ce qu'on y apprend** : la corruption **vient d'en bas**, pas de l'extérieur ;
  on s'initie à l'exploration, au combat, aux quêtes des PNJ.
- **Créatures** : famille **F1 — créatures de l'école** ([09 §9.3](09-bestiaire-et-lore.md)) — danger faible.
- **Lieux nommés probables** : Les Couloirs, La Grande Salle, Les Toilettes
  Hantées (Mimi).

### Zone B — Cachots de Poudlard (étages 4–6)
> 💡 (proposition) / ✅ (décor)

**« L'école s'efface, la pierre froide gagne. »** On descend sous les salles de
classe : tapis sombres, pierre humide, lumière rare. Le décor cesse d'être
scolaire et devient **carcéral**. C'est ici qu'apparaissent les **Mangemorts
masqués** — la révélation que la corruption a des **serviteurs humains**, et que
Voldemort se reconstitue plus bas.

- **Ce qu'on y apprend** : la menace est **organisée et volontaire** ; le ton
  bascule (transition marquée 3↔4).
- **Créatures** : familles **F2** (bêtes des douves), **F3** (morts-vivants
  premiers), **F4** (forces humaines naissantes) — [09 §9.4-9.6](09-bestiaire-et-lore.md).
- **Lieux nommés probables** : Le Cachot de Potions, Le Donjon de Serpentard,
  La Bibliothèque Interdite.

### Zone C — Profondeurs Oubliées (étages 7–13)
> 💡 (proposition) / ✅ (décor)

**« On a quitté Poudlard. »** Les cavernes : plus de murs taillés, mais de la
roche brute, des lacs souterrains, du noir. Le château connu est derrière soi ;
on entre dans ce que l'école a **enfoui** plutôt qu'effacé. Les forces ennemies
montent en gamme — élite mangemort, bêtes mythiques (**F5**), puis les **boss
canon** qui gardent la route vers la source.

- **Ce qu'on y apprend** : il existe des strates **antérieures et inférieures**
  à l'école ; le **Veilleur du Seuil** (ét. 8) interdit explicitement le
  passage, première graine des Ruines.
- **Le fond (étage 10)** : la **source** — Voldemort Ressuscité.
- **Créatures** : Acromantules profondes, héritage de Serpentard, gardiens
  inventés, cercle intérieur (**F4-F5**, [09 §9.6-9.7](09-bestiaire-et-lore.md)).

### Zone D — Ruines Anciennes (étages 14+, Boucle Ténébreuse)
> 💡 (proposition) / ✅ (décor)

**« Plus vieux que Poudlard. »** Atteignable **uniquement après la victoire**,
quand la faille s'est ouverte au lieu de se refermer. Des **ruines runiques**
antérieures à la fondation de l'école s'étendent sous les Profondeurs : murs,
sols et plafonds gravés de runes vivantes, ambiance abyssale. Ici, le héros
n'explore plus le château — il explore **ce qui était là avant lui, avant
tous**.

- **Ce qu'on y apprend** : la peur scellait quelque chose de **bien plus ancien**
  que Voldemort ; le mythe du héros attire le plus profond
  ([01 §1.7](01-synopsis-et-pitch.md)).
- **Créatures** : variantes **Ténébreuses** ([09 §9.10](09-bestiaire-et-lore.md)), boss recyclés.

---

## 10.2 Fiches d'étage — la descente, palier par palier

> 💡 (proposition immersive) / ✅ (ancrages de jeu)
>
> **Mode d'emploi des fiches.** Chaque palier porte un **bloc sensoriel** à cinq
> axes — 👁️ *visuel*, 🔊 *sons*, 👃 *odeurs*, 🌡️ *température*, 💔 *atmosphère
> émotionnelle* — puis ses **lieux emblématiques**, ses **créatures** (renvoi au
> bestiaire), ses **hooks** (quêtes / Éclats / PNJ / boss), et une **variante de
> Maison** quand elle s'y prête. Les fiches racontent l'**intention d'ambiance** :
> la carte reste procédurale (§10.7), seules l'atmosphère et les ancres narratives
> sont fixes.
>
> **Échelle de corruption (lecture)** : ❄ → ❄❄ → ❄❄❄ → ❄❄❄❄ indique l'intensité
> des trois signatures (froid / peur / voix) à ce palier. C'est le « thermomètre »
> du chapitre — il monte sans jamais redescendre.

---

### 🟫 ZONE A — Couloirs de Poudlard (étages 1–3) · *intro*

#### Étage 1 — Le Seuil familier ❄
> *« Tu connais ces murs. Pourquoi as-tu froid ? »*

- 👁️ **Visuel** : pierre blonde, poutres de chêne, vitraux colorés, torches
  vives. Tout est *presque* normal — mais les **grands escaliers sont figés vers
  le bas**, et une fine pellicule de **givre** ourle le bas des fenêtres.
- 🔊 **Sons** : pas qui résonnent, portraits qui chuchotent, une cloche lointaine
  qui sonne une heure qui n'existe pas. Quelque part, **un portrait hurle encore**
  — l'écho du cours interrompu.
- 👃 **Odeurs** : parchemin, cire de bougie, poussière de craie. Et, par-dessous,
  une pointe minérale, comme **l'air d'un étang gelé**.
- 🌡️ **Température** : fraîche mais supportable — l'haleine ne fume pas *encore*.
- 💔 **Atmosphère** : *fausse sécurité*. On est chez soi, et c'est ce qui
  dérange : la maison a peur à votre place.
- **Lieux emblématiques** : Les Couloirs de Poudlard, La Grande Salle (vide,
  tables dressées pour personne).
- **Créatures** : F1 — Chat de Mme Norris, Portrait Hostile, Cornichon de
  Cornouailles ([09 §9.3](09-bestiaire-et-lore.md)).
- **Hooks** : ✅ **Portrait de Dumbledore** (1ʳᵉ salle) → `intro_tutoriel`
  (« descends d'un étage ») + amorce optionnelle de `eclats_clef_voute`. Premier
  coffre/boutique pédagogiques.
- 💡 **Variante Maison** : 🦅 Serdaigle aperçoit déjà la **1ʳᵉ stèle du Codex**
  (amorce *Le Codex de Rowena*). 🦡 Poufsouffle entend une voix faible appeler à
  l'aide (1ʳᵉ âme du Refuge).
- 💡 **Étage-scène candidat** (§10.7) : ton pédagogique garanti.

#### Étage 2 — La première source ❄
> *« Bois pendant que l'eau est encore claire. »*

- 👁️ **Visuel** : couloirs plus longs, quelques salles de classe abandonnées,
  une **fontaine** au halo bleu (la première du jeu). Le givre s'épaissit aux
  encoignures.
- 🔊 **Sons** : le **clapotis de la fontaine** tranche sur le silence ; des
  sanglots étouffés près des toilettes (Mimi).
- 👃 **Odeurs** : eau fraîche et pierre mouillée autour du bassin ; relent de
  vieille tuyauterie aux Toilettes Hantées.
- 🌡️ **Température** : la fontaine crée une **bulle de chaleur** — premier vrai
  répit ; ailleurs, le froid gagne d'un cran.
- 💔 **Atmosphère** : *soulagement teinté d'avertissement*. Ce havre te dit que
  tu en auras besoin plus bas.
- **Lieux emblématiques** : ⛲ **Salle Fontaine** (✅ étage 2, soin total
  1×/visite), Les Toilettes Hantées.
- **Créatures** : F1 + premières F2 (Chouette Ensorcelée, Mandragore Sauvage).
- **Hooks** : ✅ **Madame Pomfresh** (`mandragore_pomfresh`), ✅ **Mimi
  Geignarde** (`troll_toilettes`), Norbert Dragonneau (niffleur). Stèle du Codex
  (🦅, page 2).
- 💡 **Variante Maison** : 🦡 Poufsouffle peut **secourir une 1ʳᵉ âme perdue** ici.

#### Étage 3 — Le dernier couloir chaud ❄❄
> *« Au bout, l'air change. »*

- 👁️ **Visuel** : la pierre blonde se ternit, les poutres cèdent la place à des
  voûtes plus basses. Au fond, un **escalier descendant** plus large que les
  autres — le **seuil de la première transition**.
- 🔊 **Sons** : les chuchotis des portraits se font rares ; un **grondement
  sourd** monte d'en bas, lent comme une respiration.
- 👃 **Odeurs** : la craie et le parchemin s'estompent ; une humidité froide
  remonte de l'escalier.
- 🌡️ **Température** : nettement plus froide près du seuil — **l'haleine
  commence à fumer**.
- 💔 **Atmosphère** : *appréhension du seuil*. On sait qu'au prochain pas, on
  quitte vraiment l'école.
- **Lieux emblématiques** : La Bibliothèque Interdite (échoppe/boutique), le
  seuil 3↔4.
- **Créatures** : F1 finissantes + F2/F3 (Épouvantard, Gobelin Rebelle).
- **Hooks** : ✅ **Gilderoy Lockhart** (`livre_interdit`). ✅ **1ᵉʳ Éclat de la
  Clé** : `eclat_voute` garanti sur **Peeves** — *« quelque chose s'est
  brisé »* ([08 §8.6.1](08-quetes-et-sous-intrigues.md)). 🦁 Gryffondor : les
  **brasiers du Lion** s'amorcent (*L'Étendard de Godric*).
- ✅ **Transition 3↔4** : fondu + toast — *« L'école s'efface derrière toi. »*

---

### 🟦 ZONE B — Cachots de Poudlard (étages 4–6) · *dungeon*

#### Étage 4 — Sous le niveau habité ❄❄
> *« Ici, personne ne vient plus depuis longtemps. »*

- 👁️ **Visuel** : pierre sombre et humide, **tapis usés** mangés par la
  moisissure, lumière rare des lampes à huile. Des **chaînes** pendent à
  certains murs — le décor devient **carcéral**.
- 🔊 **Sons** : gouttes d'eau régulières, cliquetis de métal au loin, et — pour
  la première fois — des **voix humaines basses** : des mangemorts qui œuvrent.
- 👃 **Odeurs** : salpêtre, fer rouillé, fumée de torche grasse. Une odeur de
  **renfermé minéral**.
- 🌡️ **Température** : franchement froide ; l'haleine fume en permanence.
- 💔 **Atmosphère** : *menace organisée*. Ce n'est plus un accident — quelqu'un
  veut ça.
- **Lieux emblématiques** : Le Cachot de Potions, oubliettes, réserves scellées.
- **Créatures** : F4 — **Mangemort Masqué** (apparition-clé) ; F2/F3 (Kappa des
  Douves, Inférius premiers).
- **Hooks** : ✅ **Hagrid** (`chouette_perdue`), ✅ **Remus Lupin** (mentor
  Patronus ; père secret de Manon), ✅ chef **Rogue** (Serpentard). 🐍 **Le Pacte
  des Cachots** s'ouvre : l'**écho de Salazar** murmure
  ([08 §8.5](08-quetes-et-sous-intrigues.md)).
- 💡 **Étage-scène candidat** (§10.7) : la première transition mérite un beat écrit.

#### Étage 5 — Le ventre de pierre ❄❄❄
> *« La fontaine, ici, est un miracle qu'on n'attendait plus. »*

- 👁️ **Visuel** : galeries plus étroites, croisées d'ogives basses. Une
  **fontaine** (la deuxième) luit dans le noir — son halo paraît *fragile* au
  milieu de tant de froid.
- 🔊 **Sons** : échos déformés, un **chant de potion** qui bout seul quelque
  part, le frottement des araignées dans les angles.
- 👃 **Odeurs** : potions tournées, soufre, terre froide. Près du bassin,
  l'**eau pure** détonne, presque sucrée.
- 🌡️ **Température** : glaciale loin du bassin ; la fontaine est une **poche de
  tiédeur** précieuse.
- 💔 **Atmosphère** : *gratitude tendue*. Le répit se mérite et se raréfie.
- **Lieux emblématiques** : ⛲ **Salle Fontaine** (✅ étage 5), Le Donjon de
  Serpentard.
- **Créatures** : F4 (Sorcière des Ténèbres), F2 (Araignée Géante, Homme-Araignée).
- **Hooks** : ✅ chef **McGonagall** (Gryffondor). ✅ Sous-intrigue **grimoire
  d'Élara** (Manon — pages dispersées, givre & deuil). Feuillets du Codex (🦅).
- 💡 **Variante Maison** : 🐍 Serpentard repère des **raccourcis gris**
  (passages descellés) ; 🦁 Gryffondor, des **marques de bataille** (on a tenu ici).

#### Étage 6 — Le seuil de l'abîme ❄❄❄
> *« Au bout des cachots, il n'y a plus de mur taillé. »*

- 👁️ **Visuel** : la maçonnerie se **désagrège** ; la pierre taillée laisse
  place, par endroits, à de la **roche brute**. Au fond, l'escalier 6↔7 plonge
  dans le noir total.
- 🔊 **Sons** : le grondement d'en bas est devenu un **souffle d'abîme** continu ;
  plus aucun écho humain — les mangemorts ne descendent pas plus loin.
- 👃 **Odeurs** : l'humidité minérale domine tout ; une note ferreuse, presque
  organique, monte de l'escalier.
- 🌡️ **Température** : mordante. Le froid n'est plus une saison, c'est une
  **présence**.
- 💔 **Atmosphère** : *bascule*. On comprend qu'au prochain palier, le château
  lui-même finit.
- **Lieux emblématiques** : galerie des portraits, La Bibliothèque Interdite
  (profonde), le seuil 6↔7.
- **Créatures** : F3/F4 (Détraqueur, Mangemort d'Élite approchant).
- **Hooks** : ✅ chef **Flitwick** (Serdaigle). ✅ **Portrait de Dumbledore**
  (ét. 6) ouvre **Lux Aeterna** (souvenir heureux vs ténèbres). ✅ **2ᵉ Éclat de
  la Clé** : `eclat_voute` garanti sur le **Loup-Garou Adulte** — *« on le
  nourrit »*. 🦅 Codex bien avancé.
- ✅ **Transition 6↔7** : fondu + toast — *« Tu quittes Poudlard. »*

---

### 🟪 ZONE C — Profondeurs Oubliées (étages 7–13) · *depths*

#### Étage 7 — La roche-mère ❄❄❄
> *« Plus aucun plan de l'école ne mentionne ce vide. »*

- 👁️ **Visuel** : **cavernes** ouvertes, stalactites, **lacs souterrains**
  immobiles et noirs. Plus de torches scolaires — la lumière vient de
  champignons phosphorescents et de la **lueur des yeux**.
- 🔊 **Sons** : gouttes amplifiées par l'écho, clapotis de quelque chose qui nage,
  un silence minéral qui pèse.
- 👃 **Odeurs** : eau stagnante, pierre humide, moisi végétal des champignons.
- 🌡️ **Température** : abyssale et **stable** — le froid de la terre profonde,
  qui ne varie plus.
- 💔 **Atmosphère** : *dépaysement total*. Le château connu est derrière soi.
- **Lieux emblématiques** : lacs souterrains, La Forêt Interdite (lisière
  enracinée), Les Égouts de Poudlard.
- **Créatures** : F4 (élite mangemort), F5 naissantes (Jeune Acromantule).
- **Hooks** : ✅ **Fumseck** (phénix — soin) ; marchand clandestin. **3ᵉ Éclat**
  possible sur **Mangemort d'Élite** dès qu'il apparaît (*« le sceau retenait
  deux choses »*).

#### Étage 8 — Le Seuil du Veilleur ❄❄❄❄
> *« Quelque chose, ici, t'interdit explicitement de passer. »*

- 👁️ **Visuel** : la roche brute se grave soudain de **premières runes** —
  l'alphabet des Ruines, en avant-poste. Une **fontaine** (la troisième) survit
  dans une niche scellée. Au centre, le **Veilleur du Seuil** monte la garde.
- 🔊 **Sons** : un **bourdonnement runique** grave, presque sub-sonore ; le
  hurlement lointain d'un loup ; le froissement d'une cape d'Auror.
- 👃 **Odeurs** : ozone, pierre brûlée, un parfum métallique de magie ancienne.
- 🌡️ **Température** : le froid se double d'un **picotement magique** — les runes
  rayonnent un gel qui n'est pas naturel.
- 💔 **Atmosphère** : *interdit sacré*. On franchit un seuil qu'on n'aurait pas dû.
- **Lieux emblématiques** : ⛲ **Salle Fontaine** (✅ étage 8), le **Seuil du
  Veilleur** (graine des Ruines Anciennes).
- **Créatures** : ✅ **Fenrir Greyback** (boss), **Voldemort Affaibli** (premier
  contact incomplet), **Veilleur du Seuil** (boss original, runique) — F5.
- **Hooks** : ✅ **Kingsley** (sentinelle des profondeurs), marchand clandestin
  (équipement d'Auror). ✅ La **stèle de la Clé** (`r_clef_voute`) porte ici la
  **voix des Fondateurs** la plus claire.
- 💡 **Variante Maison** : 🦅 Serdaigle lit les runes du Veilleur (Codex) ; 🐍
  Serpentard reconnaît la main de Salazar dans le verrou.

#### Étage 9 — Le nid et la toile ❄❄❄❄
> *« Tu n'es plus en haut de la chaîne alimentaire. »*

- 👁️ **Visuel** : galeries tendues de **toiles épaisses**, cocons suspendus,
  carapaces vides. La phosphorescence se voile de soie grise.
- 🔊 **Sons** : **cliquetis de pattes** multipliés par l'écho, craquements de
  chitine, un chuintement collectif qui semble venir des murs.
- 👃 **Odeurs** : musc arachnéen, venin doux-amer, chair en décomposition lente.
- 🌡️ **Température** : froide et **moite** — l'humidité du nid colle à la peau.
- 💔 **Atmosphère** : *prédation*. Ici, c'est le héros qui est traqué.
- **Lieux emblématiques** : Le nid d'Aragog (écho de la Chambre/Forêt), galeries
  de soie.
- **Créatures** : F5 — ✅ **Aragog** (boss), Acromantule Adulte, Détraqueur
  d'Élite, Mangemort Vétéran.
- **Hooks** : ✅ **Bill Weasley** (briseur de sortilèges), apothicaire ténébreux
  (Essence/Page). 🦡 Poufsouffle : avant-dernière âme du Refuge.

#### Étage 10 — La source ❄❄❄❄
> *« Le fond. Ce qui remonte commence ici. »*

- 👁️ **Visuel** : une **cathédrale de roche noire**, veinée de givre lumineux.
  Au centre, l'antre où **Voldemort Ressuscité** s'est pleinement reformé. Le
  givre dessine au sol des **cercles concentriques** — l'onde du sceau.
- 🔊 **Sons** : un **silence absolu** d'abord, puis une voix sifflante qui semble
  venir de partout ; au climax, la **glace qui se fend** — l'écho exact du cours
  d'Histoire de la Magie.
- 👃 **Odeurs** : froid pur, ozone, une absence d'odeur qui inquiète plus que
  tout.
- 🌡️ **Température** : le **zéro absolu de l'âme** — le froid-peur du Détraqueur,
  à l'échelle d'une salle.
- 💔 **Atmosphère** : *climax*. Tout l'arc converge ; la peur **est** l'adversaire.
- **Lieux emblématiques** : l'**Antre de Voldemort** (✅ étage-scène de fait),
  l'escalier le plus profond — **scellé** jusqu'à la victoire.
- **Créatures** : ✅ **Voldemort Ressuscité** (boss à phases : enrage 50 %,
  terreur 25 %), **Antonin Dolohov**, **Bellatrix**.
- **Hooks** : ✅ **Esprit de Sirius** (présence d'écho au climax) ; forgeron
  ténébreux (amorce endgame). 💡 **Modificateur de signature** one-shot selon
  `<house>SignatureDone` ([04 §4.2](04-structure-actes-et-etages.md)).
- ✅ **Victoire** → cinématique de Dumbledore : *« L'escalier le plus profond,
  scellé par la peur, s'ouvre enfin. »* Bascule en **Boucle Ténébreuse**.

#### Étages 11–13 — Les Profondeurs rejouées (Boucle Ténébreuse) ❄❄❄❄
> *« Tu as gagné. Pourquoi descends-tu encore ? »*

- 👁️ **Visuel** : la même roche, mais **recouverte de runes** (✅ override
  post-victoire `rune_*`) — les Profondeurs prennent déjà le **look des Ruines**.
  Tout est plus sombre, plus dense, plus *gravé*.
- 🔊 **Sons** : les échos se chargent de **murmures runiques** ; les créatures
  reviennent, mais leur cri sonne **familier et faux**.
- 👃 **Odeurs** : pierre brûlée et givre ancien ; l'air a un goût de **temps
  arrêté**.
- 🌡️ **Température** : constante et hostile — le froid de l'endgame, qui ne
  s'apprivoise pas, seulement se maîtrise.
- 💔 **Atmosphère** : *vertige du mythe*. La victoire a ouvert, pas fermé.
- **Lieux emblématiques** : ⛲ Fontaine (✅ étage 11), **Forge** & **Bibliothèque**
  de la Boucle (Salle sur Demande, §10.5).
- **Créatures** : recyclage `effectiveFloor` ; densité accrue (gros groupes
  4-5 possibles en duo post-victoire).
- **Hooks** : ✅ **Gardien de la Boucle** (ét. 11, PNJ exclusif) → 3 quêtes de
  purge répétables → matériaux Forge/Biblio. ✅ Paliers de Maison **Mythe (17)**.

#### Étage 13 — Le dernier palier du château ❄❄❄❄
> *« Au prochain pas, la pierre n'aura plus de nom. »*

- 👁️ **Visuel** : les runes saturent les murs jusqu'au plafond ; la frontière
  du **bâti humain** est visible — au-delà, la roche cède à des **ruines
  géométriques** impossibles.
- 🔊 **Sons** : le bourdonnement runique culmine ; un **chœur de voix anciennes**
  affleure, à la limite de l'audible.
- 👃 **Odeurs** : ozone pur, l'absence d'odeur des grands vides.
- 🌡️ **Température** : seuil thermique — un **froid solennel**, presque rituel.
- 💔 **Atmosphère** : *seuil mythologique*. Le franchissement le plus grave du jeu.
- **Hooks** : ✅ **Transition 13↔14** (la plus solennelle) — toast dédié proposé :
  *« Sous Poudlard, la pierre n'a plus de nom. Tu entres dans ce que l'école fut
  bâtie pour oublier. »* ([04 §4.5](04-structure-actes-et-etages.md)).

---

### 🟥 ZONE D — Ruines Anciennes (étages 14+, Boucle Ténébreuse) · *abyss*

#### Étages 14+ — Avant l'école, avant les Fondateurs ❄❄❄❄+
> *« Tu n'explores plus un château. Tu explores ce qui était là avant tous. »*

- 👁️ **Visuel** : architecture **runique non-humaine** — angles qui dérangent,
  **runes vivantes** qui pulsent sur murs, sols et plafonds (✅ tileset `rune_*`).
  La lumière est froide, bleutée, sans source apparente.
- 🔊 **Sons** : un **chant runique** continu, grave, qui semble *commenter* ta
  présence ; aucun écho de pas — comme si l'espace ne te reconnaissait pas.
- 👃 **Odeurs** : minéral pur, ozone, et une note **antérieure à toute vie**.
- 🌡️ **Température** : le froid n'est plus une sensation mais un **état du lieu** —
  hors-temps, hors-saison.
- 💔 **Atmosphère** : *solennité mythique et effroi*. On regarde ce que le mythe
  n'osait regarder ([01 §1.7](01-synopsis-et-pitch.md)).
- **Lieux emblématiques** : Les **Ruines Anciennes** entières (lieu-signature,
  §10.5) — l'alphabet runique semé dès les premières stèles **y trouve son
  origine** : promesse visuelle tenue.
- **Créatures** : ✅ variantes **Ténébreuses** ([09 §9.10](09-bestiaire-et-lore.md)) ;
  boss 8-10 recyclés en Ténébreux (ét. 18-20).
- **Hooks** : ✅ paliers de Maison **Apothéose (18)** + série **★ N** (prestige
  infini) ; **don à la Maison** (gold-sink). 💡 Écho mineur de la quête signature
  de chaque Maison.
- ❓ **À trancher** (§10.3) : personnifie-t-on **ce qui dort sous les Ruines** ?

> 💡 **Table de synthèse des fiches** (récap rapide pour briefer / implémenter) :

| Ét. | Zone | Corruption | Signature dominante | Boss / jalon | Éclat / PNJ-clé |
|----|------|-----------|---------------------|--------------|------------------|
| 1 | A | ❄ | froid naissant | — (Dumbledore portrait) | amorce `eclats_clef_voute` |
| 2 | A | ❄ | havre (fontaine) | — | Pomfresh, Mimi |
| 3 | A | ❄❄ | seuil → bascule | — | **Éclat 1** (Peeves), Lockhart · *transition 3↔4* |
| 4 | B | ❄❄ | menace humaine | Mangemort Masqué (apparition) | Hagrid, Lupin, Rogue · 🐍 Pacte |
| 5 | B | ❄❄❄ | répit rare (fontaine) | — | McGonagall, Manon |
| 6 | B | ❄❄❄ | fin du bâti scolaire | (Détraqueurs) | **Éclat 2** (Loup-Garou Adulte), Flitwick, Lux Aeterna · *transition 6↔7* |
| 7 | C | ❄❄❄ | cavernes, dépaysement | — | Fumseck · **Éclat 3** (Mangemort d'Élite) |
| 8 | C | ❄❄❄❄ | seuil runique | Greyback, Veilleur, Voldemort Affaibli | Kingsley · stèle `r_clef_voute` |
| 9 | C | ❄❄❄❄ | prédation arachnéenne | Aragog | Bill Weasley |
| 10 | C | ❄❄❄❄ | **CLIMAX** | **Voldemort Ressuscité** | Sirius · *victoire → Boucle* |
| 11-13 | C | ❄❄❄❄ | Profondeurs rejouées | recyclage Ténébreux | Gardien de la Boucle · Forge/Biblio |
| 14+ | D | ❄❄❄❄+ | mythe & solennité | boss Ténébreux (18-20) | Apothéose ★ N · don à la Maison |

---

## 10.3 Géographie verticale & cohérence

> 💡 (proposition de canon interne)

**Qu'y a-t-il sous Poudlard ?** Le récit propose une réponse en couches, du plus
récent au plus ancien — chaque tranche est une **strate de mémoire** :

```
Surface     Poudlard habité (étages supérieurs verrouillés par les profs)
Zone A 1–3  Couloirs — l'école, le quotidien
Zone B 4–6  Cachots — les sous-sols bâtis par l'école
Zone C 7–13 Profondeurs Oubliées — ce que l'école a enfoui (Chambre, lacs)
            ↳ le Veilleur du Seuil garde la limite de l'humainement bâti
Zone D 14+  Ruines Anciennes — antérieures à la fondation : la roche-mère magique
```

- **Logique de la descente** : descendre = **remonter le temps**. Plus on
  s'enfonce, plus on s'approche de la magie originelle du lieu — et de ce que la
  peur tenait scellé. La verticalité spatiale **est** la verticalité temporelle.
- **Cohérence avec le canon** : Poudlard est bâti sur des fondations très
  anciennes ; le jeu pousse l'idée que **les Fondateurs eux-mêmes ont construit
  par-dessus quelque chose**. C'est une **liberté assumée** ([02](02-univers-ton-et-canon.md)).
- **Pourquoi la victoire ouvre la zone D** : tant que la peur (le sceau) tenait,
  l'escalier le plus profond restait fermé. Vaincre Voldemort **brise le
  dernier sceau** — et révèle qu'il n'était pas le fond, seulement la dernière
  serrure ([01 §1.6](01-synopsis-et-pitch.md), [03 §3.6](03-trame-principale.md)).
- **La Clé de Voûte comme clé géographique** : la fêlure n'a pas seulement
  *libéré* le mal, elle a **déplié le château vers le bas** — les passages murés
  s'ouvrent, les profondeurs remontent. Chaque palier descendu, c'est la fêlure
  qui s'élargit ([03 §3.1](03-trame-principale.md)).

> ❓ À arbitrer : nomme-t-on / personnifie-t-on **ce qui dort sous les Ruines**
> (une entité, un lieu, une vérité), ou la zone D reste-t-elle une **menace
> abstraite et muette** — la profondeur pour la profondeur ? (Lié au point
> ouvert « la Boucle a-t-elle une fin écrite ? » de [03](03-trame-principale.md).)

---

## 10.4 Mobilier d'ambiance — le décor qui raconte

> 💡 (rôle narratif) / ✅ (éléments actés)

Le mobilier de cellule n'est pas que mécanique : chaque type **dit quelque chose
du lieu**.

| Élément | ✅ Fonction | 💡 Sens narratif |
|---------|------------|------------------|
| **Fontaine** | Répit total 1×/visite d'étage | **Sanctuaire** : une source d'eau pure que la corruption n'a pas (encore) atteinte ; respiration de la descente. Se « tarit » après usage — la ressource est rare. Son halo de chaleur **rétrécit** à mesure qu'on descend. |
| **Coffre** | Butin | La mémoire matérielle du château : ce que d'autres y ont laissé/perdu. |
| **Boutique** | Achats | « Une aile de bibliothèque transformée en échoppe de fortune » (✅) : des survivants tiennent encore commerce dans les ruines. |
| **Autel** | Risque/récompense | **Le pacte** : on offre quelque chose pour recevoir — tentation, ambiguïté morale, écho de la magie ancienne. |
| **Stèle d'énigme** | Savoir gardé | **La connaissance comme épreuve** : le château ne livre ses secrets qu'à qui réfléchit (devinettes). La **stèle de la Clé** (`r_clef_voute`) porte la **voix des Fondateurs**. |
| **Dalles-runes** | Puzzle | Même alphabet que les Ruines Anciennes : un **avertissement gravé** semé tôt, expliqué tard. |
| **Forge** (endgame) | Craft d'équipement | Le héros-légende **s'outille** pour la Boucle : on ne survit plus, on se prépare. |
| **Bibliothèque** (endgame) | Apprentissage / matériaux | Le **savoir interdit** redevient accessible quand on est assez puissant — écho au Bibliothécaire d'Ombre ([09 §9.6](09-bestiaire-et-lore.md)). |
| **Jardin d'herbes** | Récolte (craft) | Vestige des serres : la nature magique persiste même sous terre. |

> 💡 **Cohérence forge/bibliothèque & endgame** : ces deux éléments
> apparaissent en endgame (Boucle Ténébreuse) parce que le récit y change de
> nature — de **survie** (zones A–C) à **maîtrise/prestige** (paliers Apothéose,
> dons à la Maison). Le décor accompagne le glissement thématique.

---

## 10.5 Lieux-signatures

> 💡 (proposition de poids narratif) / ✅ (noms et éléments actés)

### La Chambre des Secrets
Le lieu nommé le plus chargé du canon. **Ancrage** : ✅ le **Basilic Mineur**
(créé par Salazar Serpentard) et le **Serpent des Cachots** répondant au
Fourchelang. 💡 Lieu-signature des Profondeurs (zone C) : la chambre où l'on
comprend que la menace plonge ses racines jusqu'aux **Fondateurs eux-mêmes**.
Candidate idéale pour un **étage scénarisé non procédural** (voir §10.7).

### La Salle sur Demande
Le lieu qui **devient ce dont on a besoin**. 💡 Parfait support à du mobilier de
répit ou d'outillage garanti (forge, bibliothèque, fontaine) : narrativement,
le château *offre* au héros ce qu'il lui faut pour continuer. Pourrait être la
**salle d'outillage de l'endgame** (où l'on craft et apprend) — cohérent avec
l'apparition Forge/Biblio en Boucle Ténébreuse.

### Le Seuil du Veilleur (étage 8)
💡 Premier lieu **runique** du jeu, en avant-poste des Ruines. C'est ici que
l'alphabet des dalles-runes apparaît *gravé dans le décor* pour la première
fois, et que la **voix des Fondateurs** (stèle de la Clé) se fait la plus claire.
Charnière thématique : la limite du **bâti humain**.

### Les Ruines Anciennes (zone D entière)
Lieu-signature de l'endgame. 💡 Les **dalles-runes** (puzzle) et les **stèles
d'énigme** croisées dès les premières zones y trouvent leur **origine** : le
même alphabet runique qui scellait le Veilleur du Seuil recouvre ici tout
l'espace. Fil visuel à tirer du début à la fin (les runes sont une **promesse
tenue** en zone D).

### La Forêt Interdite & Les Égouts (lieux de lisière)
✅ Noms actés. 💡 Plutôt que des étages, ce sont des **biomes d'ambiance** : la
Forêt explique les Acromantules et centaures (zone B/C), les Égouts relient les
douves (Kappa, Strangulot) à la Chambre des Secrets. Servent à **justifier**
géographiquement le bestiaire aquatique/arachnéen.

---

## 10.6 Variantes par Maison & héros — la même descente, vécue autrement

> 💡 (proposition de rejouabilité) / ✅ (ancrages cosmétiques)

La carte reste **commune et procédurale** : on ne génère pas quatre donjons. Ce
qui change, c'est **le regard** — une couche d'ambiance *cosmétique* qui donne
au joueur l'illusion forte que « ma Maison change ce que je vois ».

### Le regard de chaque Maison (variantes d'ambiance proposées)

| Maison | Ce que le héros **remarque** en priorité | Saveur de lieu |
|--------|------------------------------------------|----------------|
| 🐍 **Serpentard** | Les **passages descellés**, les recoins gris, les serrures que d'autres n'ont pas vues. *« Une pierre a bougé ici récemment. »* | Secrets & raccourcis (écho de Salazar). |
| 🦁 **Gryffondor** | Les **marques de bataille**, les positions à tenir, les lieux où quelqu'un a refusé de fuir. *« On a tenu ici. »* | Champs d'héroïsme & brasiers. |
| 🦅 **Serdaigle** | Les **glyphes**, les stèles, les détails qui *signifient*. *« Cette rune attend un œil qui sait lire. »* | Savoir gravé & énigmes. |
| 🦡 **Poufsouffle** | Les **recoins abrités**, les âmes à secourir, les endroits où l'on peut reprendre souffle ensemble. *« Quelqu'un pourrait survivre ici. »* | Refuges & solidarité. |

> ✅ **Garde-fou** : ces variantes sont **purement cosmétiques** en V1 (une ligne
> d'ambiance occasionnelle selon `chosenHouse`). Elles **ne modifient pas** la
> carte générée — la promesse procédurale reste intacte. Cohérent avec les
> **quêtes signature** ([07 §7.8](07-les-maisons.md)) qui, elles, posent du
> contenu réel sans brancher l'arc.

> ❓ **À arbitrer (V2)** : veut-on que la Maison **biaise la génération**
> (Serpentard → +densité de coffres/passages ; Gryffondor → +cellules de combat ;
> Serdaigle → +stèles ; Poufsouffle → +fontaines/refuges) ? Possible
> techniquement, mais c'est un pas au-delà du cosmétique — à peser contre la
> promesse « même donjon pour tous ».

### Le grain des héros (variantes par personnage)

💡 Le **choix du/des héros** ne change pas la géographie, mais **colore** la
descente par les **barks** (`HERO_BARKS`) : à l'apparition d'un boss, au
franchissement d'une tranche (`tierTransition`), sous tension de Maison
(`houseTension[<Maison>]`). La même salle *sonne* différemment selon qu'on y
entre avec Harry, Anastasia ou Maxence. **Solo vs duo** change aussi la texture
(silences d'un héros seul vs échanges d'un duo). Système **défensif** : un héros
sans entrée reste silencieux ([05](05-personnages-jouables.md)).

### Le niveau de corruption — faire *ressentir* la descente

💡 **Proposition d'ambiance transversale** (cosmétique, non mécanique) : un
**niveau de corruption** dérivé de la profondeur (0 à l'étage 1 → max en zone D,
+palier en Boucle) qui pilote l'**intensité des trois signatures** :

- **Givre** : overlay visuel de plus en plus dense vers les bords de l'écran.
- **Froid (fog)** : la teinte du fog 3D (✅ déjà présent) vire au **bleu glacé**
  en profondeur.
- **Voix** : les phrases d'ambiance se chargent de murmures runiques ; les
  nappes sonores `tension`/`abyss` montent.

> 💡 **Objectif d'expérience** : que le joueur *sente* qu'il fait plus froid et
> plus sombre à chaque palier, sans qu'aucun chiffre de combat ne bouge. La
> spéc technique (module pur `getFloorAmbiance`, `corruptionLevel`, overlay
> givre CSS, intégration `movement.js`) est détaillée dans le plan
> [`chapters-04-10-lieux-ambiance.md`](../../.claude/plans/chapters-04-10-lieux-ambiance.md) (Étape 2).

---

## 10.7 Procédural vs scénarisé

> 💡 (proposition)

✅ Les étages sont **procéduraux** ; les lieux nommés (`LOCATIONS`) sont
actuellement des **étiquettes d'ambiance** distribuées par génération, et les
phrases d'ambiance (`NARRATIVES.floor`) sont tirées d'un pool plat.

💡 Piste : réserver **2–3 étages-jalons non procéduraux** garantis, alignés sur
les beats de [03](03-trame-principale.md) — par ex. la **Chambre des Secrets**
(rencontre du Basilic / héritage Serpentard), le **seuil du Veilleur** (ét. 8,
graine des Ruines), et l'**antre de Voldemort** (ét. 10, climax, déjà fixe de
fait). Ils donneraient des **scènes écrites** stables sans renoncer à la
rejouabilité du reste — on garde le procédural **autour** d'un point fixe.

💡 Piste complémentaire (faible coût, fort gain) : rendre les **phrases
d'ambiance zonées** (un pool par tranche A/B/C/D au lieu d'un pool unique), pour
que la *voix narrative* colle au lieu — c'est la **priorité 1** du plan
d'implémentation (Étape 2), à risque nul (fallback conservé).

> ❓ À arbitrer : combien d'étages-jalons fixes accepte-t-on d'introduire sans
> casser la promesse « donjon procédural » du pitch ([README](../README.md)) ?

---

## Récapitulatif express (pour briefer Gemini)
> 4 zones verticales = 4 strates de mémoire : **A Couloirs** (l'école qui a
> peur) → **B Cachots** (la corruption a des serviteurs humains) → **C
> Profondeurs Oubliées** (ce que l'école a enfoui ; source = Voldemort ét. 10) →
> **D Ruines Anciennes** (plus vieilles que la fondation, ouvertes par la
> victoire). **Descendre = remonter le temps.** Chaque palier a sa **fiche
> sensorielle** (§10.2 : visuel/son/odeur/température/émotion) et son
> **thermomètre de corruption** ❄→❄❄❄❄ qui monte sans redescendre. Trois
> signatures montantes : **froid**, **peur**, **voix des Fondateurs**.
> Lieux-signatures : Chambre des Secrets, Salle sur Demande, Seuil du Veilleur,
> Ruines runiques. Le mobilier raconte : fontaine = sanctuaire, autel = pacte,
> stèle/runes = savoir gardé, forge/bibliothèque = l'endgame qui s'outille. Les
> **variantes de Maison/héros** (§10.6) recolorent la *même* carte (cosmétique),
> et un **niveau de corruption** d'ambiance fait *ressentir* la descente.

## Points à trancher (résumé)
1. Personnifie-t-on **ce qui dort sous les Ruines Anciennes** (§10.3) ?
2. Combien d'**étages-jalons non procéduraux** garantis (§10.7) ?
3. Les variantes de Maison restent-elles **cosmétiques** ou **biaisent-elles la
   génération** (§10.6, V2) ?
4. Adopte-t-on le **niveau de corruption** d'ambiance + les **phrases zonées**
   (§10.6, §10.7 — spéc Étape 2) ?

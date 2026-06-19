# 10 — Lieux & géographie

**Statut :** 🟩 proposition de référence — à valider / amender

> 📊 **Statut réel (code)** : ✅ tilesets/ambiance/flavor livrés · 🔧 échos
> temporels partiels — modules : `js/floor-themes.js`, `js/floor-ambiance.js`,
> `js/room-flavor.js`, `js/renderer*.js`.
> Cf. [index doc ↔ module](../README.md#index-doc--module--statut-réel).

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
>
> 💡 **Quatrième signature, émergente** : en **zone D** (Ruines Anciennes), la
> signature « voix » mue en **échos temporels** — la pierre ne murmure plus, elle
> *rejoue*. Visions du passé, silhouettes des Fondateurs au travail, sons d'un
> rituel mille fois antérieur : le lieu est si vieux qu'il a cessé de distinguer
> *jadis* de *maintenant*. C'est la pleine éclosion de la signature « voix »,
> traitée à part en **[§10.8](#108-échos-temporels--voix-des-fondateurs-zone-c-fin--zone-d)**
> car elle change de **nature** (de l'audible au visible) plus que d'intensité.

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
antérieures à la fondation de l'école s'étendent sous les Profondeurs. Ici, le
héros n'explore plus le château — il explore **ce qui était là avant lui, avant
tous**. La signature de la zone D est un **basculement de registre** : on passe
d'un décor *bâti puis corrompu* (A→C) à un décor **qui n'a jamais appartenu aux
sorciers modernes**.

Quatre marqueurs visuels la signent (à doser crescendo, §10.2) :

- 🪨 **Architecture primitive & mégalithique** : plus de pierre taillée à
  l'équerre. Des **monolithes** dressés, des **dolmens** noirs, des linteaux
  trop grands pour une main humaine. Les angles *dérangent* — les proportions
  obéissent à une géométrie qui n'est pas la nôtre.
- ✨ **Runes vivantes** : murs, sols et plafonds gravés de runes qui **palpitent**
  d'une lueur froide et **murmurent** quand on les frôle. Elles ne décorent pas :
  elles *veillent*. Certaines s'allument au passage du héros comme si elles le
  **reconnaissaient** (✅ tileset `rune_*`).
- 🌿 **Racines géantes & cristaux de magie brute** : des **racines** ligneuses
  épaisses comme des troncs traversent les salles — vestige de ce qui poussait
  ici avant la roche ; et des **cristaux** affleurants pulsent d'une magie
  *non raffinée*, antérieure aux baguettes, qui fait grésiller l'air.
- 🌫️ **Brouillard temporel** : une brume basse, lente, où **le temps ne coule
  plus droit**. On y croise des **échos** du passé (§10.8) ; un pas en avant
  peut traverser une scène vieille de mille ans.

- **Ce qu'on y apprend** : la peur scellait quelque chose de **bien plus ancien**
  que Voldemort ; le mythe du héros attire le plus profond
  ([01 §1.7](01-synopsis-et-pitch.md)). Les Fondateurs n'ont **pas creusé** les
  Ruines — ils ont **bâti par-dessus** pour les oublier.
- **Créatures** : variantes **Ténébreuses** ([09 §9.10](09-bestiaire-et-lore.md)),
  boss recyclés, **abominations & gardiens runiques** F5 ([09 §9.7](09-bestiaire-et-lore.md)).

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

#### Étage 11 — Le premier palier de la Boucle ❄❄❄❄
> *« Tu as gagné. Pourquoi l'escalier descend-il encore ? »*

- 👁️ **Visuel** : la même roche que l'étage 7, mais **recouverte de runes** (✅
  override post-victoire `rune_*`) — les Profondeurs prennent déjà le **look des
  Ruines**. Tout est plus sombre, plus dense, plus *gravé*. Au seuil, un PNJ
  spectral monte la garde : le **Gardien de la Boucle**.
- 🔊 **Sons** : les échos se chargent de **murmures runiques** ; les créatures
  reviennent, mais leur cri sonne **familier et faux** — comme un enregistrement
  rejoué une fois de trop.
- 👃 **Odeurs** : pierre brûlée et givre ancien ; l'air a un goût de **temps
  arrêté**.
- 🌡️ **Température** : constante et hostile — le froid de l'endgame, qui ne
  s'apprivoise plus, seulement se maîtrise.
- 💔 **Atmosphère** : *vertige du mythe*. La victoire a **ouvert**, pas fermé ; le
  héros-légende ([01 §1.7](01-synopsis-et-pitch.md)) est attiré vers le bas.
- **Lieux emblématiques** : ⛲ Fontaine (✅ étage 11), **Forge** & **Bibliothèque**
  de la Boucle (Salle sur Demande, §10.5).
- **Créatures** : recyclage `effectiveFloor` (variantes Ténébreuses) ; densité
  accrue (gros groupes 4-5 possibles en duo post-victoire).
- **Hooks** : ✅ **Gardien de la Boucle** (PNJ exclusif post-victoire) → 3 quêtes
  de purge répétables → matériaux Forge/Biblio ([08](08-quetes-et-sous-intrigues.md)).
  ✅ Paliers de Maison **Mythe (17)** s'ouvrent ; **don à la Maison** (gold-sink).
- 💡 **Variante Maison** : 🦅 Serdaigle remarque que les runes d'override **ne sont
  pas du décor** — elles forment des *phrases* (amorce des pages ténébreuses du
  Codex). 🐍 Serpentard sent que l'escalier scellé n'a pas cédé : il a été *ouvert
  de l'intérieur*.

#### Étage 12 — La roche qui se souvient ❄❄❄❄
> *« Tu as déjà marché ici. Pas toi — quelqu'un, il y a très longtemps. »*

- 👁️ **Visuel** : les runes d'override se densifient ; pour la **première fois**,
  une **brume basse** stagne au ras du sol, et l'on y aperçoit de **brèves
  silhouettes** — un **écho temporel** naissant (§10.8) qui retraverse la salle
  avant de se dissiper. Les murs portent des **empreintes de mains** trop grandes.
- 🔊 **Sons** : sous le bourdonnement runique, des **fragments de voix** — pas
  encore des mots, mais déjà un *grain* humain, ancien, qui n'appartient à
  aucune créature présente.
- 👃 **Odeurs** : givre ancien, ozone, et une bouffée incongrue — **fumée d'un
  feu éteint mille ans plus tôt**.
- 🌡️ **Température** : par **poches** : on traverse des zones où l'air est
  *plus vieux*, comme entrer dans le froid d'une crypte scellée.
- 💔 **Atmosphère** : *hantise douce*. Le lieu ne te menace pas encore — il
  **te confond** avec quelqu'un d'autre.
- **Lieux emblématiques** : premières **dalles-runes** « originelles » (le même
  alphabet que les puzzles, mais *vivant*) ; couloirs où la brume temporelle
  s'accroche.
- **Créatures** : recyclage Ténébreux ; premiers **Spectres Renforcés** dont le
  cri se superpose aux échos.
- **Hooks** : ✅ purges répétables du Gardien. 💡 **Premier écho temporel
  jouable** (§10.8) : une vision muette d'un Fondateur en train de *graver* —
  amorce facultative du codex de lieu (§10.9).
- 💡 **Variante Maison** : 🦡 Poufsouffle perçoit dans la brume une **présence qui
  ne lui veut pas de mal** (créature neutre du passé) ; 🦁 Gryffondor entend, dans
  les fragments de voix, un **appel au courage** d'un combattant d'avant.

#### Étage 13 — Le dernier palier du château ❄❄❄❄
> *« Au prochain pas, la pierre n'aura plus de nom. »*

- 👁️ **Visuel** : les runes saturent les murs jusqu'au plafond ; la **frontière
  du bâti humain** devient visible — au-delà du fond de la salle, la roche taillée
  cède à des **ruines géométriques impossibles**, des **monolithes** qui percent
  le plafond. Les échos temporels y sont **plus nombreux et plus nets**.
- 🔊 **Sons** : le bourdonnement runique culmine ; un **chœur de voix anciennes**
  affleure — les **quatre Fondateurs**, à la limite de l'audible, qui se
  *répondent* ([09 §9.1](09-bestiaire-et-lore.md)).
- 👃 **Odeurs** : ozone pur, l'absence d'odeur des grands vides.
- 🌡️ **Température** : seuil thermique — un **froid solennel**, presque rituel,
  qui n'est plus celui de la peur mais celui de l'**ancienneté**.
- 💔 **Atmosphère** : *seuil mythologique*. Le franchissement le plus grave du jeu.
- **Lieux emblématiques** : la **ligne de couture** entre roche bâtie et ruine
  brute ; dernière ⛲ Fontaine avant la zone D (répit *symbolique* : on boit
  avant de quitter toute trace humaine).
- **Créatures** : recyclage Ténébreux dense ; gardiens runiques F5 en approche.
- **Hooks** : ✅ **Transition 13↔14** (la plus solennelle) — toast dédié :
  *« Sous Poudlard, la pierre n'a plus de nom. Tu entres dans ce que l'école fut
  bâtie pour oublier. »* ([04 §4.5](04-structure-actes-et-etages.md)). 💡 Dernière
  occasion d'entendre une voix de Fondateur *en tant qu'humain* — au-delà, elles
  deviennent **lieu**.

---

### 🟥 ZONE D — Ruines Anciennes (étages 14+, Boucle Ténébreuse) · *abyss*

> 💡 La zone D se lit en **trois paliers d'intensité croissante** : on entre par
> le **Seuil mégalithique** (14–16), on s'enfonce dans le **Cœur runique**
> (17–20, où les boss Ténébreux gardent les voies), puis on atteint l'**Avant-Monde**
> (21+, magie brute & prestige infini). Le thermomètre ❄ passe à **❄❄❄❄+** et
> n'a plus de sens *météo* : le froid est devenu l'**état du lieu**.

#### Étages 14–16 — Le Seuil mégalithique ❄❄❄❄+
> *« Tu n'explores plus un château. Tu explores ce qui était là avant tous. »*

- 👁️ **Visuel** : l'architecture cesse d'être humaine. **Monolithes** dressés,
  **dolmens** noirs, linteaux cyclopéens ; des **racines géantes** ligneuses
  traversent les salles, soulèvent les dalles, **enlacent** les runes. La lumière
  est froide, bleutée, **sans source** — elle suinte des gravures (✅ tileset
  `rune_*`). Les **runes palpitent** lentement, comme une respiration.
- 🔊 **Sons** : un **chant runique** continu, grave, qui semble *commenter* ta
  présence ; **aucun écho de pas** — comme si l'espace ne te reconnaissait pas.
  Les racines **craquent** dans le noir.
- 👃 **Odeurs** : minéral pur, ozone, sève froide des racines, et une note
  **antérieure à toute vie**.
- 🌡️ **Température** : hors-temps, hors-saison. Le brouillard temporel (§10.8)
  fait alterner des bouffées **glaciales** et des poches d'air *immobile*.
- 💔 **Atmosphère** : *dépaysement absolu et effroi naissant*. On franchit le seuil
  d'un lieu **qui n'a jamais appartenu aux sorciers modernes**.
- **Lieux emblématiques** : le **portail mégalithique** d'entrée (lieu-signature,
  §10.5) ; les premières **Chambres des Fondateurs** modifiées (§10.5), encore
  reconnaissables sous la corruption.
- **Créatures** : ✅ variantes **Ténébreuses** ; premières **abominations &
  gardiens runiques** F5 ([09 §9.7](09-bestiaire-et-lore.md)).
- **Hooks** : 💡 **Échos temporels** pleins (§10.8) : on *voit* les Fondateurs
  bâtir le sceau. 💡 Écho mineur de la **quête signature** de chaque Maison
  ([07 §7.8](07-les-maisons.md)).
- 💡 **Variante Maison** : 🦅 Serdaigle **lit** enfin les runes (elles forment la
  langue-mère du Codex) ; 🐍 Serpentard trouve, derrière un monolithe descellé, un
  **raccourci** vers l'étage suivant ; 🦁 Gryffondor voit une **flamme** survivre
  au froid sur un autel ; 🦡 Poufsouffle découvre une **alcôve-refuge** entre deux
  racines, où une créature neutre veille.

#### Étages 17–20 — Le Cœur runique ❄❄❄❄+
> *« Ce n'est pas une ruine. C'est une machine, et elle se rallume. »*

- 👁️ **Visuel** : l'apogée du lieu-signature. Des **cristaux de magie brute**
  affleurent partout, pulsant d'une lueur *non raffinée* qui fait grésiller l'air ;
  les **runes vivantes** ne palpitent plus, elles **brûlent**. Le brouillard
  temporel est si épais que des **scènes du passé** se rejouent en pleine salle —
  on peut **marcher au travers**.
- 🔊 **Sons** : les **voix des Fondateurs** sont désormais *partout*, non comme
  des fantômes mais comme une **propriété de la pierre** (§10.8) — elles nomment,
  avertissent, regrettent. Le chant runique se fend par moments en **quatre
  timbres** distincts (Godric, Salazar, Rowena, Helga).
- 👃 **Odeurs** : ozone saturé, **cristal chaud**, et l'absence d'odeur des très
  grands vides.
- 🌡️ **Température** : près des cristaux, une **chaleur sèche et fausse** détonne
  dans le froid — la magie brute ne réchauffe pas, elle *irradie*.
- 💔 **Atmosphère** : *solennité mythique et effroi*. On regarde ce que le mythe
  n'osait regarder ([01 §1.7](01-synopsis-et-pitch.md)) ; chaque salle est un
  **caveau de mémoire** des Quatre.
- **Lieux emblématiques** : les **quatre Chambres des Fondateurs** modifiées
  (§10.5), une par boss Ténébreux ; les **veines de cristal** qui relient le tout.
- **Créatures** : ✅ **boss 8–10 recyclés en Ténébreux** (ét. 18–20 :
  Greyback Ténébreux, Aragog Ténébreux, Dolohov Ténébreux…) ; gardiens runiques F5.
- **Hooks** : ✅ paliers de Maison **Apothéose (18)** — éveil du **passif légendaire**
  de Maison. 💡 Chaque Chambre rejoue, en écho, un fragment de la **quête signature**
  de la Maison correspondante (§10.6).
- 💡 **Variante Maison** : la Chambre **de sa propre Maison** s'illumine pour le
  héros — 🦁 brasiers ravivés, 🐍 serrures qui s'ouvrent seules, 🦅 runes qui se
  *traduisent* d'elles-mêmes, 🦡 refuge tiède au cœur du froid. Les trois autres
  Chambres restent **hostiles et muettes**.

#### Étages 21+ — L'Avant-Monde ❄❄❄❄+
> *« Plus bas que les Fondateurs, il n'y a plus de pierre. Seulement ce qui dormait. »*

- 👁️ **Visuel** : la ruine elle-même se **désagrège** en faveur de la **magie
  brute** : des **cristaux** géants, des **racines-mères** d'où tout semble être
  parti, un sol qui n'est plus du sol mais de la **lumière froide compactée**. Les
  runes ont disparu — on est **avant l'écriture**.
- 🔊 **Sons** : le chant cesse. À sa place, un **battement** lent, énorme,
  **organique** — comme si le lieu avait un cœur, et qu'il dormait.
- 👃 **Odeurs** : aucune. Un vide olfactif total, plus inquiétant que n'importe
  quelle puanteur.
- 🌡️ **Température** : **indéfinissable** — ni chaude ni froide, *hors de la
  notion même*. Le corps cesse de savoir où il est dans le temps.
- 💔 **Atmosphère** : *abîme pur*. La profondeur pour la profondeur — le prestige
  comme seule raison de continuer.
- **Lieux emblématiques** : l'**Avant-Monde** (lieu-signature terminal, §10.5) ;
  le **don à la Maison** y prend des airs de **rituel** plus que de commerce.
- **Créatures** : ✅ variantes Ténébreuses au plafond de scaling ; abominations F5
  à leur paroxysme.
- **Hooks** : ✅ série **Apothéose ★ N** (prestige infini, gold-sink) ; **don à la
  Maison** ([state.js / house-donation.js]). 💡 Le **codex de lieu** (§10.9) se
  complète ici : dernières entrées sur **le Dormeur**.
- ✅ **Tranché** (2026-06-19, §10.3) : **ce qui dort sous les Ruines est
  personnifié — c'est *le Dormeur*** (présence magique primordiale, antérieure
  à l'écriture, dont le **battement organique** est le « cœur » de l'Avant-Monde).
  La descente ★ N **s'en approche sans jamais l'atteindre** (plafond de scaling) :
  la Boucle a une destination écrite, et le mystère tient (on ne le réveille
  jamais). Cf. la fin « Briser le Cycle » où *« le battement organique de
  l'Avant-Monde ralentit… puis se tait »* ([14 §14](14-scenarios-de-fin.md)).

> 💡 **Table de synthèse des fiches** (récap rapide pour briefer / implémenter) :

| Ét. | Zone | Corruption | Signature dominante | Boss / jalon | Éclat / PNJ-clé · variante Maison |
|----|------|-----------|---------------------|--------------|------------------|
| 1 | A | ❄ | froid naissant | — (Dumbledore portrait) | amorce `eclats_clef_voute` · 🦅 1ʳᵉ stèle / 🦡 1ʳᵉ âme |
| 2 | A | ❄ | havre (fontaine) | — | Pomfresh, Mimi · 🦡 1ᵉʳ secours |
| 3 | A | ❄❄ | seuil → bascule | — | **Éclat 1** (Peeves), Lockhart · 🦁 brasiers · *transition 3↔4* |
| 4 | B | ❄❄ | menace humaine | Mangemort Masqué (apparition) | Hagrid, Lupin, Rogue · 🐍 Pacte / écho Salazar |
| 5 | B | ❄❄❄ | répit rare (fontaine) | — | McGonagall, Manon · 🐍 raccourcis gris / 🦁 marques de bataille |
| 6 | B | ❄❄❄ | fin du bâti scolaire | (Détraqueurs) | **Éclat 2** (Loup-Garou Adulte), Flitwick, Lux Aeterna · *transition 6↔7* |
| 7 | C | ❄❄❄ | cavernes, dépaysement | — | Fumseck · **Éclat 3** (Mangemort d'Élite) |
| 8 | C | ❄❄❄❄ | seuil runique | Greyback, Veilleur, Voldemort Affaibli | Kingsley · stèle `r_clef_voute` · 🦅 lit les runes / 🐍 main de Salazar |
| 9 | C | ❄❄❄❄ | prédation arachnéenne | Aragog | Bill Weasley · 🦡 avant-dernière âme |
| 10 | C | ❄❄❄❄ | **CLIMAX** | **Voldemort Ressuscité** | Sirius · modif. signature one-shot · *victoire → Boucle* |
| 11 | C | ❄❄❄❄ | Boucle, runes naissantes | recyclage Ténébreux | Gardien de la Boucle · Forge/Biblio · 🦅 runes = phrases |
| 12 | C | ❄❄❄❄ | roche qui se souvient | recyclage Ténébreux | **1ᵉʳ écho temporel** · 🦡 présence neutre / 🦁 appel au courage |
| 13 | C | ❄❄❄❄ | seuil mythologique | gardiens F5 en approche | chœur des Fondateurs · *transition 13↔14 solennelle* |
| 14-16 | D | ❄❄❄❄+ | seuil mégalithique | abominations F5 | échos Fondateurs · 🦅 langue-mère / 🐍 raccourci / 🦁 flamme / 🦡 refuge |
| 17-20 | D | ❄❄❄❄+ | cœur runique | **boss Ténébreux** (18-20) | Apothéose (18) · Chambres des Fondateurs · variante Maison forte |
| 21+ | D | ❄❄❄❄+ | Avant-Monde, magie brute | abominations (plafond) | Apothéose ★ N · don à la Maison · codex de lieu |

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

> ✅ **Tranché (2026-06-19)** : **on personnifie** « ce qui dort sous les
> Ruines » — c'est **le Dormeur**. Ni un boss, ni un lieu de plus : une
> **présence** magique primordiale, antérieure à l'écriture (donc aux runes,
> donc aux Fondateurs), sur laquelle Poudlard a été bâti. Son **battement
> organique** (§10.2, ressenti dès l'Avant-Monde) *est* son cœur endormi. La
> fêlure de la Clé de Voûte ne fait pas que libérer le mal : elle **gratte son
> sommeil** — descendre, c'est s'en approcher. La série **★ N** (prestige
> infini, plafond de scaling) traduit cela : on **ne l'atteint jamais**, on
> s'enfonce vers lui. La Boucle a donc une **fin écrite** (le Dormeur, jamais
> rejoint) **sans** cheap final boss — le mystère reste intact. Cela referme
> le point ouvert « la Boucle a-t-elle une fin écrite ? » de
> [03 §3.6 / §3.10](03-trame-principale.md) : **oui, une destination ; non, pas
> une porte de sortie**. Garde-fous : ne contredit aucun canon (Ruines
> antérieures aux Fondateurs ; Voldemort = dernière serrure, pas le fond ;
> ✅ plafond de scaling). Le Dormeur **ne parle pas, n'a pas de stat-block, ne
> se combat pas** : il se *ressent* (battement, échos, barks `loopEcho`).

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

### 💡 Lieux spéciaux **récurrents** (fil rouge vertical)

> Au-delà des lieux nommés ponctuels, trois motifs **réapparaissent** d'une zone
> à l'autre en se **dégradant** — c'est leur transformation qui raconte la
> descente. Ils sont le **fil rouge architectural** du chapitre.

#### Le Grand Escalier corrompu
Le motif central du château canon — l'escalier qui bouge — revisité comme
**baromètre de corruption**. 💡 Présent à chaque zone, mais altéré crescendo :
- **Zone A** : les marches ✅ **figées vers le bas** (elles ne montent plus —
  premier signe que la corruption *appelle* en profondeur).
- **Zone B** : des volées **manquantes**, des paliers suspendus dans le vide,
  un givre qui rend la pierre glissante.
- **Zone C** : l'escalier devient **organique** — il *descend tout seul*, comme
  aspiré ; les rampes sont des **racines**.
- **Zone D** : il n'y a plus d'escalier, seulement une **chute douce** où le
  brouillard temporel (§10.8) fait *flotter* — on tombe vers le passé.

💡 Support idéal d'un **étage-scène** de transition (§10.7) : le Grand Escalier
comme **seuil rejoué** à chaque frontière de zone.

#### Les Chambres des Fondateurs (modifiées)
💡 Quatre **caveaux de mémoire**, un par Fondateur, semés dans la zone D
(étages 17–20, §10.2). Chacun est la **chambre originelle** où un Fondateur a
posé sa part du sceau de la Clé de Voûte — désormais **corrompue** et gardée par
le **boss Ténébreux** correspondant :

| Chambre | Fondateur | Boss-gardien Ténébreux | Écho de quête signature | Variante Maison |
|---------|-----------|------------------------|--------------------------|-----------------|
| 🦁 **Chambre du Lion** | Godric | (boss 18-20 recyclé) | *L'Étendard de Godric* ([08 §8.5](08-quetes-et-sous-intrigues.md)) | brasiers ravivés pour le héros Gryffondor |
| 🐍 **Chambre du Serpent** | Salazar | (boss 18-20 recyclé) | *Le Pacte des Cachots* | serrures qui s'ouvrent seules |
| 🦅 **Chambre de l'Aigle** | Rowena | (boss 18-20 recyclé) | *Le Codex de Rowena* | runes qui se traduisent d'elles-mêmes |
| 🦡 **Chambre du Blaireau** | Helga | (boss 18-20 recyclé) | *Le Refuge de Helga* | alcôve tiède au cœur du froid |

> 💡 **Règle d'illumination** : seule la Chambre de la **Maison du héros**
> (`chosenHouse`) s'**illumine et l'accueille** ; les trois autres restent
> **hostiles et muettes**. C'est la récompense atmosphérique du choix de Maison
> en endgame — cosmétique, mais forte (§10.6). Les Chambres rejouent en **écho
> temporel** (§10.8) un fragment de la quête signature correspondante.

#### Le Refuge errant (Salle sur Demande dégradée)
💡 La Salle sur Demande, mais **affamée** : en zone C/D, elle n'offre plus *ce
qu'on veut* — elle offre **ce qui reste**. Tantôt fontaine tarie, tantôt forge
froide, tantôt bibliothèque aux pages effacées. Support narratif du basculement
**survie → maîtrise** (§10.4) : le château *essaie* encore d'aider, mais s'épuise.
Ancrage 🦡 Poufsouffle (les Refuges temporaires, [08](08-quetes-et-sous-intrigues.md)).

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

#### Biais de génération par Maison — V2 (✅ direction ouverte, 2026-06-19)

> ✅ **Décision (2026-06-19)** : on **ouvre** un biais de génération par Maison
> en V2 — mais **power-neutral strict** ([Ch.13](13-equilibrage-et-systemes.md),
> garde-fou cardinal : même grille, même difficulté pour les 4 Maisons). Le biais
> change **ce qu'on voit et croise**, jamais **ce qu'on gagne**.

**Spec (esquisse, à figer au chantier d'implémentation)** — le biais agit
uniquement sur des leviers **neutres en puissance** :

| Levier autorisé (saveur) | Exemple | Interdit (puissance) |
|--------------------------|---------|----------------------|
| Pondération **cosmétique** de types de salle | 🐍 +chance de salle « passage descellé » (raccourci visuel) ; 🦅 +stèles d'énigme ; 🦡 +recoins-refuge | ❌ +coffres/+or/+fontaines (avantage matériel) |
| **Skin/variante** thématique d'un monstre à roster équivalent | 🦁 le même ennemi en livrée « marqué de bataille » | ❌ stats/résistances/butin altérés |
| Ordre/fréquence des **lignes d'ambiance** déjà cosmétiques | escalade A→D du registre de Maison (§10.6 détail) | ❌ rien de mécanique |

**Garde-fous d'implémentation** (bloquants) :
- Le tirage biaisé doit **conserver le même budget** de salles à butin / repos /
  combat que le tirage neutre (réallocation iso-ressources, pas d'ajout).
- **Gate de release** : un **sim d'équilibrage neutre** (`tools/sim-difficulty.js`,
  variante par Maison) doit confirmer **0 écart significatif de win-rate** entre
  les 4 Maisons avant merge.
- Reste **désactivable** par un flag (repli V1 cosmétique) en cas de dérive.

> **Statut** : la présente décision **ratifie la direction** ; le code (touche
> `dungeon.js` / `dungeon-spawning.js`) est un **chantier suivant** tracé en
> [ROADMAP Phase 3](../REVUE-TRANSVERSALE-ET-ROADMAP.md). Tant qu'il n'est pas
> livré + simulé, **V1 cosmétique reste le comportement réel**.

### Le détail de chaque Maison — perceptions, hooks & escalade

> 💡 Chaque Maison a un **registre sensoriel** propre qui **s'intensifie** avec la
> descente. La ligne cosmétique (`houseAmbianceLine`) puise dans ce registre, et
> le registre *monte d'un cran* par zone (A→D). Objectif : que le joueur Serpentard
> et le joueur Poufsouffle ne **lisent pas le même donjon**, même en marchant
> dedans côte à côte.

#### 🐍 Serpentard — *Les murs qui s'ouvrent*
Registre : **secrets, raccourcis, murmures manipulateurs** (écho de Salazar).
- **Perçoit** : pierres descellées, serrures cachées, **passages secrets** que
  d'autres n'ont pas vus. Beaucoup plus de **murs qui pivotent**, de raccourcis
  *ambigus* (gagne-t-on du temps, ou descend-on trop vite ?).
- **Entend** : des **murmures qui flattent et poussent** — *« par ici, plus
  vite, tu le mérites »*. La voix de l'écho de Salazar le tutoie.
- **Escalade** : A « une pierre a bougé » → B « raccourcis gris descellés » → C
  « la main de Salazar dans les verrous » → D « les monolithes s'écartent pour
  toi seul ».
- **Hook fort** : *Le Pacte des Cachots* ([08 §8.5](08-quetes-et-sous-intrigues.md)) ;
  Chambre du Serpent (§10.5) ; 💡 *flavor `secret`* — ligne d'ambiance + (V2)
  biais possible vers +densité de passages/coffres.

#### 🦁 Gryffondor — *La lumière qui tient*
Registre : **héroïsme, courage, lumière contre le froid**.
- **Perçoit** : **marques de bataille**, positions à tenir, lieux où quelqu'un a
  **refusé de fuir**. Les zones de combat lui paraissent plus **héroïques** —
  arènes naturelles, lignes de front.
- **Entend** : des **appels au courage** dans les fragments de voix ; une flamme
  qui crépite *plus fort* quand le froid voudrait l'éteindre.
- **Voit la lumière résister** : torches, brasiers et autels gardent une lueur
  chaude là où la corruption l'a éteinte ailleurs — **la lumière qui tient**.
- **Escalade** : A « brasiers du Lion » → B « on a tenu ici » → C « tenir la
  ligne face aux Détraqueurs » → D « une flamme survit au froid sur l'autel ».
- **Hook fort** : *L'Étendard de Godric* (anti-`fear`) ; Chambre du Lion ;
  💡 *flavor `valor`* — (V2) biais possible vers +cellules de combat.

#### 🦅 Serdaigle — *Ce qui veut être lu*
Registre : **énigmes, runes intelligibles, bibliothèques oubliées**.
- **Perçoit** : **glyphes**, stèles, détails qui *signifient*. Rencontre
  **plus d'énigmes** (stèles, dalles-runes) ; les runes qui restent muettes pour
  les autres lui deviennent **intelligibles**.
- **Découvre** : des **bibliothèques oubliées** — recoins de savoir, feuillets du
  Codex, rayonnages effacés que lui seul songe à fouiller.
- **Escalade** : A « 1ʳᵉ stèle du Codex » → B « feuillets dispersés » → C « lit
  les runes du Veilleur » → D « la langue-mère se traduit d'elle-même ».
- **Hook fort** : *Le Codex de Rowena* (révèle resist/weak) ; Chambre de l'Aigle ;
  💡 *flavor `lore`* — (V2) biais possible vers +stèles.

#### 🦡 Poufsouffle — *Là où l'on survit*
Registre : **refuges temporaires, créatures neutres, résilience**.
- **Perçoit** : **recoins abrités**, âmes à secourir, endroits où **reprendre
  souffle ensemble**. Trouve des **zones-refuge** temporaires que la carte ne
  promet pas.
- **Rencontre l'aide** : des **créatures neutres** du lieu (bowtruckles,
  présences du passé non hostiles) qui *veillent* ou guident plutôt que d'attaquer.
- **Ressent la résilience** : même au plus froid, une atmosphère de *« quelqu'un
  pourrait survivre ici »* — la corruption n'a pas tout pris.
- **Escalade** : A « une voix faible appelle à l'aide » → B « 1ᵉʳ secours » → C
  « avant-dernière âme du Refuge » → D « une alcôve tiède entre deux racines ».
- **Hook fort** : *Le Refuge de Helga* (regen/résilience) ; Chambre du Blaireau ;
  💡 *flavor `refuge`* — (V2) biais possible vers +fontaines/refuges.

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

## 10.8 Échos temporels & voix des Fondateurs (zone C fin → zone D)

> 💡 (proposition de signature endgame) — pleine éclosion de la signature
> **« voix »** (§10.0), qui change de **nature** en profondeur.

En surface, la corruption *murmure* (portraits, stèles). En profondeur, elle
**rejoue** : le lieu est si ancien qu'il a cessé de distinguer *jadis* de
*maintenant*. Ce sont les **échos temporels** — des fragments de passé qui se
matérialisent dans la salle. Ils sont l'**outil narratif principal** de la zone D
pour livrer le lore des Fondateurs **sans PNJ vivant**.

### Trois registres d'écho (intensité croissante)

| Registre | Où | Forme | Rôle narratif |
|----------|-----|-------|----------------|
| 🔈 **Murmure** | A–C | voix off, texte d'ambiance, stèle (`r_clef_voute`) | *On entend.* Avertissement, lore voilé. |
| 👤 **Silhouette** | C fin (12-13) → D | brève figure dans le brouillard temporel, muette | *On aperçoit.* Premier contact visuel avec le passé. |
| 🎞️ **Scène rejouée** | D (14+) | vision traversable d'un moment des Fondateurs | *On marche dedans.* Révélation : comment le sceau fut posé. |

### Les quatre voix (zone D)

💡 Au cœur runique (17–20, §10.2), le chant se fend en **quatre timbres** — un par
Fondateur, cohérents avec leur quête signature ([08 §8.5](08-quetes-et-sous-intrigues.md)) :

- 🦁 **Godric** — *« On ne scelle pas par peur. On tient la porte. »* (courage)
- 🐍 **Salazar** — *« J'ai scellé ma part **avec** ma faute. »* (ambivalence,
  révélation : un Fondateur scellé *avec* la corruption qu'il aida à enfermer).
- 🦅 **Rowena** — *« Comprends, et la faille apparaît. »* (savoir = faiblesse révélée).
- 🦡 **Helga** — *« J'ai creusé un abri pour ceux qui resteraient. »* (refuge,
  résilience).

> 💡 **Garde-fou de cohérence** : les échos **ne contredisent jamais** le canon
> établi (le sceau = œuvre des Quatre ; Voldemort = dernière serrure, pas le fond,
> [01 §1.6](01-synopsis-et-pitch.md)). Ils **montrent** ce que les chapitres 03/08
> *racontent*. La voix de la **Maison du héros** est la plus claire et bienveillante ;
> les trois autres restent plus distantes — miroir de la **règle d'illumination**
> des Chambres (§10.5).

### Ancrages mécaniques (✅ existants / 💡 proposés)

- ✅ **Stèle de la Clé** (`r_clef_voute`, `riddles.js`) : déjà le vecteur canon de
  la voix des Fondateurs.
- ✅ **Override `rune_*`** post-victoire : déjà le **terrain visuel** des échos
  (runes vivantes). Le brouillard temporel s'y greffe naturellement.
- 💡 **Flag `temporalEchoActive`** (dérivé, non sérialisé) : vrai en zone C fin /
  zone D, pilote l'apparition des silhouettes/scènes. Détail technique : plan
  Étape 2.
- 💡 **Codex de lieu** (§10.9) : chaque écho *vu* déverrouille une entrée — le
  joueur **collectionne** la mémoire du lieu.

---

## 10.9 Règles d'ajout / modification de lieux

> 💡 Procédure normative pour étendre ce chapitre **sans casser la cohérence**.
> À dérouler pour tout nouveau lieu, étage-scène ou variante.

> 🔗 **Checklists d'extension de contenu** (mêmes principes : *trahison du
> familier > invention pure*, ancrage de zone/corruption, non-contradiction du
> canon) — créatures [09 §9.11](09-bestiaire-et-lore.md#911-règles-dajout-de-nouvelles-créatures) · **lieux (ici, §10.9)** · variantes de Boucle [11 §11.11](11-mondes-paralleles.md#1111-règles-dajout-de-nouvelles-variantes--boucles) · héros jouables [05 §5.5](05-personnages-jouables.md). *(Fusion en une page unique = chantier optionnel, roadmap §1.4 💡7.)*

### Check-list « nouveau lieu / étage »

1. ✅ **Zone & thème d'abord** : déterminer la **tranche** (A/B/C/D) →
   `getFloorTheme(floor)` doit déjà couvrir l'étage (`floor-themes.js`). Aucun
   lieu ne doit contredire le tileset/ambiance de sa zone.
2. ✅ **Thermomètre de corruption** : fixer le niveau ❄→❄❄❄❄+ — il **ne redescend
   jamais** (un lieu plus profond est ≥ au précédent).
3. ✅ **Trois signatures** : décrire **froid**, **peur**, **voix** au niveau de la
   zone (en D, la « voix » devient **écho temporel**, §10.8).
4. ✅ **Bloc sensoriel 5 axes** obligatoire : 👁️ visuel · 🔊 son · 👃 odeur ·
   🌡️ température · 💔 atmosphère. C'est le **gabarit de fiche** (§10.2).
5. ✅ **Ancrages de jeu** : lister créatures (renvoi [09](09-bestiaire-et-lore.md)),
   PNJ ([06](06-pnj-et-factions.md)), hooks de quête/Éclats ([08](08-quetes-et-sous-intrigues.md)).
   Distinguer ✅ (acté) de 💡 (proposé).
6. ✅ **Variante Maison** : fournir au moins **une** perception par Maison
   concernée, puisant dans son **registre** (§10.6). Cosmétique par défaut.
7. ✅ **Cohérence verticale** : un lieu doit respecter *« descendre = remonter le
   temps »* (§10.3). Plus profond = plus ancien, jamais l'inverse.
8. ✅ **Lien procédural** : préciser si c'est une **ambiance** (distribuée par
   génération, défaut) ou un **étage-scène** garanti (§10.7) — ces derniers sont
   **rares et arbitrés** (ne pas multiplier sans accord produit).

### Garde-fous de cohérence (à ne pas violer)

- ❌ **Pas de retour de chaleur/sécurité durable** en profondeur (sauf fontaine,
  qui *se tarit*, et Refuge errant qui *s'épuise*, §10.4/§10.5).
- ❌ **Pas de contradiction du canon du sceau** (œuvre des Quatre ; Voldemort =
  dernière serrure ; Ruines antérieures aux Fondateurs).
- ❌ **Pas de génération biaisée par Maison en V1** (variantes = cosmétiques ;
  le biais procédural est un ❓ V2, §10.6). ✅ **V2 ouvert (tranché 2026-06-19)** :
  un biais de génération par Maison est **autorisé en V2**, mais **power-neutral
  strict** (garde-fou cardinal du [Ch.13](13-equilibrage-et-systemes.md)) — il ne
  touche que la **distribution/saveur** (pondération cosmétique de types de salle,
  préférence de **skin** de monstre thématique de la Maison), **jamais** la
  difficulté, le butin, les stats ni la grille de paliers. Les 4 Maisons restent
  rigoureusement équivalentes en puissance. **Implémentation = chantier suivant**
  (roadmap Phase 3, gaté par un **sim d'équilibrage neutre** confirmant l'absence
  d'écart de win-rate entre Maisons) — la présente décision **ouvre la direction**,
  elle ne code rien. Spec : voir §10.6 / [ROADMAP](../REVUE-TRANSVERSALE-ET-ROADMAP.md).
- ✅ **Renvoyer aux sources** : tout nouvel ancrage cite le chapitre canon
  (03/04/06/07/08/09) — ce chapitre **décrit le décor**, il ne crée pas de canon
  mécanique seul.

### Où écrire quoi

| Type d'ajout | Section cible | Impact code (renvoi Étape 2) |
|--------------|---------------|-------------------------------|
| Nouvelle fiche d'étage | §10.2 | `ZONE_AMBIANCE` (phrases zonées) |
| Lieu nommé / signature | §10.5 | `LOCATIONS` (étiquette) |
| Variante de Maison | §10.6 | `HOUSE_AMBIANCE_MOD` |
| Écho temporel / voix | §10.8 | flag `temporalEchoActive`, codex de lieu |
| Mobilier d'ambiance | §10.4 | `CELL.*` + sprite renderer |

---

## Récapitulatif express (pour briefer Gemini)
> 4 zones verticales = 4 strates de mémoire : **A Couloirs** (l'école qui a
> peur) → **B Cachots** (la corruption a des serviteurs humains) → **C
> Profondeurs Oubliées** (ce que l'école a enfoui ; source = Voldemort ét. 10) →
> **D Ruines Anciennes** (plus vieilles que la fondation, ouvertes par la
> victoire). **Descendre = remonter le temps.** Chaque palier a sa **fiche
> sensorielle** (§10.2 : visuel/son/odeur/température/émotion) et son
> **thermomètre de corruption** ❄→❄❄❄❄+ qui monte sans redescendre. Trois
> signatures montantes : **froid**, **peur**, **voix des Fondateurs** — cette
> dernière éclôt en **échos temporels** (§10.8 : visions du passé, 4 voix des
> Fondateurs) en zone D. La **zone D** (14+) est désormais détaillée en trois
> paliers — **Seuil mégalithique** (14-16 : monolithes, racines géantes), **Cœur
> runique** (17-20 : runes vivantes, cristaux de magie brute, Chambres des
> Fondateurs), **Avant-Monde** (21+ : magie brute, ce qui dort). **Descendre =
> remonter le temps.** Lieux-signatures : Chambre des Secrets, Salle sur Demande,
> Seuil du Veilleur, Ruines runiques, **Grand Escalier corrompu** & **Chambres des
> Fondateurs** (§10.5). Le mobilier raconte : fontaine = sanctuaire, autel = pacte,
> stèle/runes = savoir gardé, forge/bibliothèque = l'endgame qui s'outille. Les
> **variantes de Maison/héros** (§10.6) recolorent la *même* carte (cosmétique,
> registre distinct par Maison qui escalade A→D), et un **niveau de corruption**
> d'ambiance fait *ressentir* la descente.

## Points à trancher (résumé)
1. ✅ **Tranché (2026-06-19)** : **oui, personnifié — *le Dormeur*** (§10.3, §10.2).
2. Combien d'**étages-jalons non procéduraux** garantis (§10.7) ?
3. ✅ **Tranché (2026-06-19)** : **V2 ouvert** — un biais de génération par Maison
   est autorisé, mais **power-neutral strict** (saveur/distribution seules, jamais
   la difficulté/le butin). Impl. = chantier suivant gaté par un sim neutre (§10.6).
4. Adopte-t-on le **niveau de corruption** d'ambiance + les **phrases zonées**
   (§10.6, §10.7 — spéc Étape 2) ?
5. Implémente-t-on les **échos temporels** (silhouettes/scènes rejouées) et le
   **codex de lieu** (§10.8, §10.9), ou la zone D reste-t-elle **textuelle**
   (phrases d'ambiance seules) ?

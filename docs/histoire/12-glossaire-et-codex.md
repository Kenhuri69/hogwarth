# 12 — Glossaire & Codex

**Statut :** 🟩 proposition de référence — finalisée, à valider / amender

> ✅ **Statut réel (code, 2026-06-13)** : le **Codex est LIVRÉ** — `js/codex.js`
> (registre `CODEX_ENTRIES`, ~36 entrées dont `cle_de_voute`, `voix_*`,
> `briser_cycle`, `cycle_brise`… + évaluateur pur `codexEntryState()`),
> `js/ui-codex.js` (modale `#codex-modal`, bouton 📖 `openCodex()`). La section
> **« ÉTAPE 2 » ci-dessous a été réconciliée** (2026-06-14) : elle ne décrit
> plus du « à construire » mais l'**état livré** (cartographie brique → module).
> Le travail restant n'est plus de *construire* le Codex mais d'**auditer la
> complétude de ses entrées** (coquilles vs `textVersions` rédigées, fait —
> cf. Roadmap Phase 2). Voir `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` §1.2.

> Objectif : faire du Chapitre 12 le **Codex** — le **journal vivant et
> déverrouillable** du joueur. Il centralise les **termes propres au jeu**, les
> **objets de lore**, une **chronologie** de référence et un **index des
> personnages** (le **socle documentaire**, §12.7–12.10), et il spécifie la
> **projection jouable** de ce socle : un carnet in-game qui se **remplit au
> rythme de la descente** et devient le compagnon narratif de l'aventure.
>
> Conventions de ce chapitre : on **distingue** les termes de **lore** (fiction)
> des termes de **systèmes** (mécaniques). Les faits actés portent `✅` ; les
> sens narratifs proposés portent `💡` ; les points à valider `❓`. Ce chapitre
> est un **référentiel vivant** : on y consigne les décisions des autres
> chapitres pour éviter les incohérences.
>
> Renvois : actes/étages → [04](04-structure-actes-et-etages.md) · héros →
> [05](05-personnages-jouables.md) · PNJ & factions → [06](06-pnj-et-factions.md) ·
> Maisons → [07](07-les-maisons.md) · quêtes & **fil rouge Éclats** →
> [08](08-quetes-et-sous-intrigues.md) · bestiaire (familles F1–F5, gradient de
> corruption) → [09](09-bestiaire-et-lore.md) · lieux (fiches sensorielles,
> **échos temporels**) → [10](10-lieux-et-geographie.md) · Mondes Parallèles →
> [11](11-mondes-paralleles.md).

---

# ÉTAPE 1 — Contenu narratif

## 12.0 Cadre (✅ dans le jeu)

Le Codex **n'est pas un système neuf parti de zéro** : plusieurs de ses briques
existent déjà et ne demandent qu'à être **unifiées sous une même couverture**.

- ✅ **Bestiaire déverrouillable** (`ui-bestiary.js`) : `seenMonsters` (Set
  sérialisé) ouvre la fiche d'une créature rencontrée ; un **codex à 2 paliers**
  (`_codexTier`, `CODEX_DEEP_KILLS = 2`, `_renderCodexDeep`) dévoile un encart
  « Lore profond » après `monsterKills` victoires sur l'espèce. Familles
  narratives `FAMILY_LORE` (F1–F5). C'est **le prototype du Codex** : entrée
  voilée → entrée révélée par la **rencontre répétée**.
- ✅ **Fil rouge Éclats** : items `eclat_voute` (×3), `eclat_lumiere`,
  `eclat_vitalite` (`data.js`) ; quête `eclats_clef_voute` (Dumbledore) qui les
  collecte en descendant ([08 §8.6.1](08-quetes-et-sous-intrigues.md)).
- ✅ **Voix des Fondateurs** : stèle `r_clef_voute` (`riddles.js`) ; chaîne
  `dumbledore_*` + *Lux Aeterna* ([08 §8.3/§8.6.2](08-quetes-et-sous-intrigues.md)).
- ✅ **Échos temporels** : signature endgame de la zone D
  ([10 §10.8](10-lieux-et-geographie.md)) — chaque écho *vu* est déjà pensé pour
  **déverrouiller une entrée** (« Codex de lieu », [10 §10.9](10-lieux-et-geographie.md)).
- ✅ **Socle documentaire** : le glossaire (§12.7), les artefacts (§12.8), la
  chronologie (§12.9) et l'index des personnages (§12.10) — la matière écrite que
  le Codex in-game **expose par fragments**.

> 💡 **Thèse du chapitre.** Le Codex est la **mémoire que le joueur reconstitue**
> en descendant. Là où la corruption *efface* (le château oublie qu'il fut une
> école ; les Ruines ont « cessé de distinguer jadis de maintenant »,
> [10 §10.8](10-lieux-et-geographie.md)), le Codex **réinscrit**. Le remplir,
> c'est résister à l'oubli — refaire, page après page, le geste des Fondateurs
> qui ont *gravé* le sceau dans la pierre.

---

## 12.1 Introduction au Codex — le rôle narratif du journal

### 12.1.1 De « carnet d'élève » à « archive des Ruines Anciennes »

Le Codex **change de nature à mesure que le héros descend**, exactement comme le
décor (tranches A→D, [04](04-structure-actes-et-etages.md)) et les créatures
(canon → cauchemar, [09 §9.1.2](09-bestiaire-et-lore.md)). C'est le **cinquième
gradient** du jeu : non pas le froid, la peur, la voix ou les groupes ennemis,
mais **la mémoire qui s'approfondit**.

| Acte | Tranche | Forme du Codex | Voix / ton du carnet |
|------|---------|----------------|----------------------|
| **Prologue / Acte I** (1–3) | A | 📓 **Carnet d'élève** : notes de cours, croquis de créatures familières, première page sur la Clé fêlée. | Naïf, scolaire, presque rassurant. *« J'ai vu un chat de Mme Norris. Pourquoi avait-il l'air de vouloir me mordre ? »* |
| **Acte II** (4–6) | B | 📔 **Journal de descente** : la main se fait fébrile, les marges se couvrent de notes inquiètes ; premières pages *corrompues* (givre dans l'encre). | Inquiet, lucide. *« On ne descend pas par accident. Quelqu'un, en bas, attise ceci. »* |
| **Acte III** (7–10) | C | 📜 **Registre des Profondeurs** : parchemins recousus, fragments de stèles recopiés, le Codex *cite* les Fondateurs. | Grave, érudit. *« Le verrou cachait deux choses, pas une. »* |
| **Acte IV** (11+) | C→D | 🗿 **Archive des Ruines Anciennes** : tablettes runiques, échos temporels transcrits, pages qui s'écrivent *seules*. | Mythologique, hors-temps. *« Sous Poudlard, la pierre n'a plus de nom. »* |

> 💡 **Mise en scène visuelle** (livrée, cf. ÉTAPE 2 « Cartographie » + `js/ui-codex.js`) : le **fond de parchemin** du
> Codex se **dégrade** par Acte — vélin propre en A, taché et gelé en B, recousu
> en C, gravé dans la roche runique en D. La même couverture, quatre âges.
> Aucune page n'est *jamais retirée* : la naïveté du carnet d'élève reste
> lisible sous le givre — c'est ce contraste qui fait mal.

### 12.1.2 Comment il devient le compagnon du joueur

- **Il répond à la question « pourquoi ? ».** La trame ne gate rien d'autre que
  *descendre et vaincre Voldemort* ([04 §4.7](04-structure-actes-et-etages.md)).
  Le Codex est l'endroit où le joueur qui *écoute* le château récolte le **sens**
  — le fil rouge ([08 §8.6](08-quetes-et-sous-intrigues.md)) y prend corps.
- **Il récompense l'exploration.** Chaque créature vaincue, chaque stèle résolue,
  chaque écho *vu*, chaque Éclat ramassé **ouvre ou complète une entrée**. Le
  Codex est le **carnet de chasse au lore** : une raison de fouiller, de poncer,
  de revenir.
- **Il personnalise l'aventure.** La **Maison choisie** et le **héros** colorent
  certaines entrées (la voix qui parle le plus clair est celle de la Maison du
  joueur, [10 §10.8](10-lieux-et-geographie.md)). Deux parties n'ont pas le même
  Codex à mi-chemin.
- **Il est une récompense narrative forte.** Compléter une entrée *corrompue*
  (passer de la version voilée à la version *révélée*) est un **petit climax** :
  une vérité qui se dépose, accompagnée d'un effet de parchemin et d'un son
  d'écriture (`playCodexWrite`, cf. ÉTAPE 2 « Assets »).

### 12.1.3 Mécanique de déverrouillage — quatre robinets

Le Codex se remplit par **quatre sources**, chacune adressée à une façon de
jouer. Aucune n'est obligatoire ; ensemble, elles couvrent l'aventure entière.

| 🔓 Source de déverrouillage | Déclencheur (✅ existant / 💡 proposé) | Ce qu'elle ouvre |
|------------------------------|----------------------------------------|------------------|
| **Par étage / Acte** (`floorReached`) | 💡 franchir un étage / une frontière de tranche (✅ transitions 3↔4, 6↔7, 13↔14) | Entrées **Lieux** (§12.2) + termes de **Glossaire** liés à la zone (ex. *Ruines Anciennes* à l'étage 14). |
| **Par Éclat / fil rouge** (`eclatProgress`) | ✅ ramasser un `eclat_voute` (Peeves → Loup-Garou → Mangemort d'Élite) | Entrées **Histoire & Lore** + **Éclats & Voix** (§12.2) qui **se complètent en 3 temps**. |
| **Par rencontre / combat** (`seenMonsters` / `monsterKills`) | ✅ rencontrer puis vaincre N fois une créature | Entrées **Bestiaire** (palier 1 rencontre → palier 2 lore profond). **Déjà codé.** |
| **Par quête / découverte** (`activeQuests` / stèles / échos) | ✅ résoudre une stèle (`r_clef_voute`), terminer une quête, 💡 *voir* un écho temporel | Entrées **Personnages & Maisons**, **Objets & Artefacts**, **révélations** des entrées corrompues. |

> ✅ **Garde-fou (repris du fil rouge, [08 §8.6.3](08-quetes-et-sous-intrigues.md)).**
> Le Codex **ne bloque jamais** la descente. Un joueur peut foncer au climax avec
> un Codex à moitié vide ; le Codex **enrichit** le *pourquoi*, il ne le
> **conditionne** jamais. C'est une couche posée sur l'ossature A→B→C→D, pas une
> serrure de plus.

---

## 12.2 Les sept sections du Codex

Le Codex est organisé en **sept onglets**, chacun adossé à un chapitre source.
Cinq pointent vers des chapitres dédiés (renvois), deux sont **propres au Codex**
(Histoire & Lore ; Éclats & Voix). Tous partagent le **même format d'entrée**
(§12.3) et le **même style parchemin**.

| # | Section (onglet) | Source / renvoi | Robinet principal | Rôle narratif |
|---|------------------|------------------|--------------------|----------------|
| 📖 **G** | **Glossaire** | §12.7 (ce chapitre) | étage / Acte | Définir les mots du jeu : termes de lore (fiction) **et** de systèmes (mécaniques), anciens et corrompus. |
| 🐉 **B** | **Bestiaire** | [09](09-bestiaire-et-lore.md) (✅ `ui-bestiary.js`) | rencontre / combat | Créatures, par **famille F1–F5** et **gradient de corruption** ; descriptions qui s'aggravent en profondeur. |
| 🗺️ **L** | **Lieux & Géographie** | [10](10-lieux-et-geographie.md) | étage / Acte | Zones et étages : fiches sensorielles, **échos temporels**, variantes de Maison. |
| 👤 **P** | **Personnages & Maisons** | [05](05-personnages-jouables.md) · [06](06-pnj-et-factions.md) · [07](07-les-maisons.md) | quête / découverte | Portraits, arcs, **quêtes signature** ; Fondateurs comme figures. |
| 🔥 **H** | **Histoire & Lore** | §12.9 + [03](03-trame-principale.md) | Éclat / fil rouge | Trame principale, Fondateurs, **Ruines Anciennes**, **Clé de Voûte** — la grande mémoire reconstituée. |
| 🔹 **É** | **Éclats & Voix des Fondateurs** | [08 §8.6](08-quetes-et-sous-intrigues.md) | Éclat + stèle / écho | Le **fil rouge** rendu collectionnable : 3 Éclats, 4 voix, qui **se complètent**. |
| ⚜️ **O** | **Objets & Artefacts** | §12.8 | quête / découverte | Reliquaires, potions, équipement thématique, légendaires de Maison. |

> 💡 **Renvois croisés in-game.** Une entrée de Bestiaire qui cite la *Clé de
> Voûte* propose un **lien cliquable** vers l'entrée Glossaire correspondante (et
> réciproquement). Le Codex est un **graphe** : lire une page en éclaire d'autres
> (réutilise le champ `links[]` du format, §12.3).

> ✅ **Acté (2026-06-14) — pas de huitième onglet « Voyageur ».** Les Mondes
> Parallèles vivent dans **Glossaire** (et **Objets** pour le Set Voyageur) :
> c'est la **décision livrée dans le code**. `js/codex.js` porte le commentaire
> *« Mondes Parallèles → Glossaire (décision : pas de 8ᵉ onglet « Voyageur ») »*
> et range les trois entrées MP — `cheminette_inter_mondes`, `voyageur`,
> `mondes_paralleles` — en `category: 'glossaire'` (le Set/Souvenirs Voyageur
> relèvent de l'onglet **Objets**, §12.8). Justification narrative : le MP est
> *latéral*, pas un acte de la descente — cohérent avec la **règle d'isolation
> Boucle ↔ Mondes Parallèles** ([11 §11.5.1](11-mondes-paralleles.md)) et la
> chronologie *« hors-temps »* ([12.9](#129-chronologie--continuité)). Le Codex
> reste donc à **sept onglets**.

---

## 12.3 Format standard d'une entrée de Codex

Toute entrée — quelle que soit la section — respecte le **même squelette**. Le
format est conçu pour porter l'**évolution** d'une entrée (version voilée →
révélée → corrompue) sans dupliquer les données.

```jsonc
{
  "id": "cle_de_voute",                 // identifiant unique, stable
  "category": "histoire",               // glossaire|bestiaire|lieux|personnages|histoire|eclats|objets
  "title": "La Clé de Voûte des Quatre",
  "icon": "img/codex/cle_voute.png",    // ou emoji fallback "🔑"
  "act": 1,                             // acte d'apparition (pour le tri / fond parchemin)
  "links": ["eclat_voute", "ruines_anciennes", "fondateurs"],  // graphe interne

  // Conditions de déverrouillage (OU logique : la 1ʳᵉ remplie ouvre l'entrée)
  "unlockConditions": [
    { "type": "floor",   "value": 1 },                    // étage atteint
    { "type": "quest",   "value": "intro_tutoriel" },     // quête terminée
    { "type": "eclat",   "value": 1 },                    // n-ième Éclat ramassé
    { "type": "riddle",  "value": "r_clef_voute" },       // stèle résolue
    { "type": "monster", "value": "veilleur_seuil", "kills": 1 }, // bestiaire
    { "type": "echo",    "value": "echo_scellement" }     // écho temporel vu (zone D)
  ],

  // Versions du texte, révélées progressivement (parchemin)
  "textVersions": {
    "veiled":    "Texte de base, voilé — ce que le héros croit savoir.",
    "revealed":  "Texte enrichi, débloqué par revealedBy — la vérité posée.",
    "corrupted": "Variante d'endgame (Boucle/Ruines) — la mémoire retournée."  // optionnel
  },

  // Ce qui fait passer veiled → revealed (et, le cas échéant, → corrupted)
  "revealedBy": [
    { "type": "eclat",  "value": 3 },                     // les 3 Éclats remis
    { "type": "quest",  "value": "dumbledore_revelation" }
  ],
  "corruptedBy": [ { "type": "floor", "value": 14 } ],    // optionnel (zone D)

  // Variantes selon le contexte (cosmétique, défensif)
  "variants": {
    "house":  { "slytherin": "Note marginale de Salazar…", "ravenclaw": "…" },
    "hero":   { "celeste": "…" }                          // optionnel, rare
  }
}
```

**Champs obligatoires :** `id`, `category`, `title`, `unlockConditions`,
`textVersions.veiled`. Tout le reste est **optionnel** (un terme de glossaire
simple n'a qu'une `veiled`).

**Règles de résolution :**
- `unlockConditions` = **OU** : la première condition satisfaite **ouvre**
  l'entrée (état `veiled`).
- `revealedBy` = **ET** (par défaut) : toutes remplies → bascule sur `revealed`.
  *(Un fil rouge à étapes comme les Éclats utilise `revealedBy:[{eclat:3}]`.)*
- `corruptedBy` = bascule optionnelle d'endgame ; n'efface jamais `revealed`,
  s'**ajoute** en surcouche (onglet « page retournée »).
- `variants.house` / `variants.hero` : **n'ajoutent qu'une note marginale** ; ne
  changent pas le corps de l'entrée (cohérence : pas de fin alternative,
  [04 §4.7](04-structure-actes-et-etages.md)).

> 💡 **Style parchemin obligatoire.** Le corps des entrées est rédigé au registre
> **érudit et mystérieux** du Codex (cf. exemples §12.4) : phrases d'archiviste,
> citations gravées, jamais de jargon mécanique dans le corps *lore* (le chiffré
> va dans un encart « Notes de terrain » séparé, comme le bestiaire sépare déjà
> `lore` des stats). Une entrée *veiled* pose une **question** ; sa version
> *revealed* y **répond**.

---

## 12.4 Entrées exemples (12 entrées immersives)

> 💡 Toutes les entrées ci-dessous sont des **propositions de texte** prêtes à
> l'emploi. Elles montrent l'**évolution voilée → révélée → (corrompue)**. Le
> style est volontairement parchemin/archive.

### 12.4.1 — `cle_de_voute` · *La Clé de Voûte des Quatre* (Histoire & Lore)

- 🔓 **Ouverture** : étage 1 (prologue, la Clé se fend en plein cours).
- ✨ **Révélation** : les **3 Éclats** remis à Dumbledore (`eclats_clef_voute`).

> **Voilée** — *« Relique forgée par les quatre Fondateurs, exposée en cours
> d'Histoire de la Magie. On dit qu'elle "tenait" quelque chose. Ce matin, elle
> s'est fendue avec un bruit de glace, et les grands escaliers ont basculé vers
> le bas. Personne ne sait encore ce qui s'est ouvert. »*

> **Révélée** — *« La Clé n'était pas une porte : c'était un **verrou**. Godric,
> Salazar, Rowena et Helga ne l'ont pas forgée pour garder un trésor, mais pour
> sceller — ensemble, d'un même geste — ce qui dormait sous l'école avant
> l'école. Sa fêlure n'a pas créé le mal. Elle a **desserré une peur** que quatre
> volontés tenaient close depuis mille ans. Descendre, c'est remonter jusqu'à ce
> qu'ils ont eu le courage d'enfermer. »*

> **Corrompue** (zone D, ét. 14+) — *« J'ai vu, dans les Ruines, comment le sceau
> fut posé. La Clé n'est qu'un nœud à la surface d'un fil bien plus ancien. Et
> j'ai compris une chose que les manuels taisent : la refermer **par en haut** ne
> suffira jamais. Ce qui retient, en bas, ce n'est pas une serrure. C'est qu'on
> ose la regarder. »*

### 12.4.2 — `ruines_anciennes` · *Les Ruines Anciennes* (Lieux & Géographie)

- 🔓 **Ouverture** : étage 14 (frontière 13↔14). → [10 §10.2 zone D](10-lieux-et-geographie.md)
- ✨ **Révélation** : un **écho temporel « scène rejouée »** *vu* (§12.4.6).

> **Voilée** — *« Sous le dernier palier du château, la pierre change de langue.
> Plus de blason, plus de torche : des mégalithes runiques, antérieurs à tout
> nom. Le froid n'y est plus une météo — c'est l'**air d'avant**. »*

> **Révélée** — *« Poudlard fut bâti **comme un couvercle**. Les Fondateurs ont
> choisi cette colline non pour sa beauté, mais parce qu'il fallait poser une
> école — du bruit d'enfants, des siècles de vie — sur ce que ces Ruines
> contiennent. L'école est le mensonge tendre qu'on raconte par-dessus une vérité
> qu'on ne peut pas tuer. Descendre ici, c'est lire la première page sous toutes
> les autres. »*

### 12.4.3 — `froid_surnaturel` · *Le Froid surnaturel* (Glossaire — lore)

- 🔓 **Ouverture** : étage 2 (le givre s'épaissit). ✅ signature de corruption [09 §9.1.1].

> **Voilée** — *« Le givre qui ourlait le socle de la Clé gagne maintenant les
> fenêtres, puis l'haleine. Ce n'est pas l'hiver : il fait froid **là où la
> corruption touche**. »*

> **Révélée** — *« Le froid n'accompagne pas le mal : il **est** le mal rendu
> sensible. Partout où la fêlure suinte, la chaleur de la vie reflue — c'est
> pourquoi les créatures les plus atteintes sont froides au toucher, et pourquoi
> la glace les blesse autant qu'elle les nomme. Avoir froid, dans ces murs, c'est
> être près de la source. »*

### 12.4.4 — `veilleur_seuil` · *Le Veilleur du Seuil* (Bestiaire — gradient)

- 🔓 **Ouverture** : rencontre (étage 8). ✅ `seenMonsters`.
- ✨ **Révélation (lore profond)** : `CODEX_DEEP_KILLS` victoires. ✅ `monsterKills`.
  → [09 §9.8](09-bestiaire-et-lore.md)

> **Voilée** (palier 1, rencontre) — *« Une statue qui n'aurait jamais dû bouger.
> Gardien runique dressé au seuil des Profondeurs, il frappe quiconque veut
> descendre plus bas. Famille F5 — gardiens anciens. »*

> **Révélée** (palier 2, lore profond) — *« Ce n'est pas un monstre : c'est une
> **sentinelle des Fondateurs**, façonnée pour tenir la porte du sceau. La
> corruption ne l'a pas créé — elle l'a **rendu fou**. Il garde encore son poste
> mille ans après que la consigne a perdu son sens, frappant les vivants qu'il
> fut bâti pour protéger. Sa pierre porte la même rune que la Clé : il est, au
> fond, un **morceau du verrou devenu chair**. »*

### 12.4.5 — `echo_salazar` · *L'Écho de Salazar* (Personnages & Maisons / variante)

- 🔓 **Ouverture** : 🐍 quête signature *Le Pacte des Cachots* (ét. 4+). → [08 §8.5](08-quetes-et-sous-intrigues.md)
- ✨ **Révélation** : choix `slythPactChoice` posé.
- 🎭 **Variante Maison** : entrée **plus claire et bienveillante** si `chosenHouse = serpentard`.

> **Voilée** — *« Dans les cachots, une voix qui n'appartient à aucun vivant.
> Elle connaît votre nom, vos tentations, et le chemin le plus court vers le
> pouvoir. Elle se présente comme un ami. »*

> **Révélée** — *« L'écho est Salazar Serpentard — non pas un fantôme, mais une
> **part de lui** qu'il a scellée *avec* la corruption qu'il aida à enfermer.
> Voilà le secret des Fondateurs : pour fermer le verrou, chacun a dû y mettre
> **une part de soi-même**, sa plus laide. La tentation que tu entends n'est pas
> un démon — c'est un **miroir**. Salazar n'a pas vaincu sa voix. Il a juste
> refusé de lui obéir. »*

> 🎭 **Note marginale 🐍** (si Serpentard) — *« Il te parle comme à un héritier.
> Ce n'est pas un piège : c'est une passation. À toi de décider ce que tu fais de
> ce que tu reconnais en lui. »*

### 12.4.6 — `echo_scellement` · *L'Écho du Scellement* (Éclats & Voix / écho temporel)

- 🔓 **Ouverture** : *voir* l'écho temporel « scène rejouée » en zone D (ét. 17–20).
  💡 → [10 §10.8](10-lieux-et-geographie.md)

> **Voilée** — *« Le brouillard temporel s'épaissit, et soudain la salle n'est
> plus vide : quatre silhouettes, dos à toi, lèvent les mains vers une faille de
> lumière. Tu marches **dans** un souvenir. »*

> **Révélée** (les **quatre voix** entendues) — *« C'est le moment où le sceau fut
> posé. Tu les entends, chacun selon sa nature :*
> - 🦁 *Godric — « On ne scelle pas par peur. On tient la porte. »*
> - 🐍 *Salazar — « J'ai scellé ma part **avec** ma faute. »*
> - 🦅 *Rowena — « Comprends, et la faille apparaît. »*
> - 🦡 *Helga — « J'ai creusé un abri pour ceux qui resteraient. »*
> *Quatre façons de vivre la même descente. Quatre vérités d'un seul verrou. »*

### 12.4.7 — `eclat_voute_codex` · *Les Éclats de la Clé de Voûte* (Éclats & Voix)

- 🔓 **Ouverture** : 1ᵉʳ `eclat_voute` ramassé (Peeves). ✅
- ✨ **Complétion en 3 temps** (`eclatProgress` : 1 → 2 → 3). ✅ jalons par tranche.

> **Éclat I/III** (Peeves, ét. 1–3) — *« Un fragment du verrou, froid comme une
> dent de givre. En le tenant, une certitude : **quelque chose s'est brisé.** »*

> **Éclat II/III** (Loup-Garou Adulte, ét. 4–6) — *« Le deuxième éclat *pulse*. Ce
> n'est pas un accident isolé : **on le nourrit d'en bas.** La fêlure est
> alimentée. »*

> **Éclat III/III** (Mangemort d'Élite, ét. 7–10) — *« Les trois éclats, réunis,
> dessinent une vérité double : le verrou cachait **deux** choses, pas une — une
> corruption plus vieille que les Fondateurs, **et**, tout au fond, Voldemort qui
> se nourrit de la brèche pour se reformer. »*

### 12.4.8 — `detraqueur` · *Le Détraqueur* (Bestiaire — normal → corrompu)

- 🔓 **Ouverture** : rencontre (ét. 6+). ✅
- ✨ **Révélation** : lore profond (`monsterKills`). 🌑 **Variante corrompue** en Boucle (ét. 16+).

> **Voilée** — *« Spectre encapuchonné qui aspire la joie. Inflige la **peur**
> (😱). Famille F3 — morts-vivants & malédictions. Le froid le précède. »*

> **Révélée** — *« Le Détraqueur n'est pas un serviteur de la corruption : il en
> est un **symptôme parfait**. Là où le sceau tenait *par la peur*, ces créatures
> sont la peur faite corps. Elles ne veulent pas te tuer — elles veulent te faire
> **reculer**. Et reculer, ici, c'est laisser la fêlure s'élargir d'un pas. »*

> **Corrompue** (Boucle/Ruines) — *« Plus bas, ils ne flottent plus : ils
> *s'écoulent*, comme de l'encre dans de l'eau gelée. Ce ne sont plus des gardiens
> d'Azkaban égarés. Ce sont les **premières larmes** de ce que les Ruines
> contiennent — la peur d'avant les noms. »*

### 12.4.9 — `grande_salle` · *La Grande Salle* (Lieux — écho temporel)

- 🔓 **Ouverture** : étage 1. → [10 §10.2](10-lieux-et-geographie.md)
- ✨ **Révélation** : écho temporel mineur *vu* (silhouette).

> **Voilée** — *« Le cœur de l'école : quatre longues tables, un plafond
> enchanté. Ce matin, elle est **vide** — les tables dressées pour personne, les
> bougies allumées pour des absents. »*

> **Révélée** — *« Dans la brume, l'espace d'un battement, la salle se *remplit* :
> des centaines d'élèves, un Choixpeau qui chante, le brouhaha d'un festin. Puis
> plus rien. Le château ne te montre pas un fantôme — il te montre **ce pour quoi
> il fut bâti**. Toute cette vie posée comme un couvercle chaud sur le froid d'en
> dessous. C'est cela que tu défends en descendant. »*

### 12.4.10 — `sword_gryff` · *L'Épée de Gryffondor* (Objets & Artefacts / variante)

- 🔓 **Ouverture** : palier de Maison 1000 (Gryffondor). ✅ légendaire. → §12.8
- 🎭 **Variante** : entrée enrichie si `chosenHouse = gryffindor`.

> **Voilée** — *« Lame gobeline sertie de rubis, qui ne se présente qu'au vrai
> courage. Récompense de l'identité Gryffondor menée à son terme. »*

> **Révélée** — *« Forgée par Ragnuk, elle n'absorbe que ce qui la rend plus
> forte. Sa vraie nature n'est pas de trancher : c'est de **répondre** — elle ne
> vient qu'à la main qui a déjà choisi de tenir la porte, comme Godric devant le
> sceau. Une arme qui exige d'être méritée avant d'être tirée. »*

### 12.4.11 — `boucle_tenebreuse` · *La Boucle Ténébreuse* (Glossaire — systèmes/lore)

- 🔓 **Ouverture** : victoire sur Voldemort (ét. 10, `victoryAchieved`). ✅

> **Voilée** — *« Tu as vaincu Voldemort. L'escalier le plus profond, scellé par
> la peur, s'ouvre enfin — et le château **recommence**, corrompu. »*

> **Révélée** — *« Voici le revers que nul manuel n'osait écrire : refermer la
> serrure du haut a **ouvert** celle du bas. Voldemort n'était que la dernière
> dent du verrou ; en l'arrachant, tu as exposé ce que les Fondateurs tenaient
> *vraiment* clos. La victoire n'est pas une fin : c'est la **permission** de
> descendre là où le mythe n'osait pas regarder. Tu es devenu légende — et la
> légende attire le plus profond. »*

### 12.4.12 — `cheminette_inter_mondes` · *La Cheminette Inter-Mondes* (Glossaire — lore/MP)

- 🔓 **Ouverture** : apprendre le sort Cheminette (niv. 8). ✅ → [11](11-mondes-paralleles.md)
- ⛔ **Exclue en Ironman** (✅).

> **Voilée** — *« Une veine de cendre verte court dans la pierre, plus ancienne
> que les cheminées. Le sort qui la réveille te projette, en **projection
> astrale**, dans le donjon d'un autre monde. »*

> **Révélée** — *« Chaque sauvegarde est un **plan** : un Poudlard-reflet où la
> même fêlure se joue autrement. La Cheminette ne te fait pas *avancer* — elle te
> fait **traverser**. Tu deviens Voyageur, marcheur entre les mondes, et ce que
> tu y gagnes (l'Essence d'Outremonde, "la peur d'un autre monde cristallisée")
> ne sert qu'à ceux qui acceptent que leur descente n'est pas la seule. »*

---

## 12.5 Règles d'ajout de nouvelles entrées

> 💡 (norme d'écriture) — à respecter pour toute entrée future, afin que le Codex
> reste **cohérent, maintenable et extensible**.

### 12.5.1 Critères de cohérence (le filtre canon)

Une entrée n'entre au Codex que si elle **passe ces cinq tests** :

1. **Ancrage existant.** Elle s'appuie sur du contenu ✅ du jeu (créature, item,
   stèle, quête, lieu, PNJ) **ou** sur un fait acté d'un chapitre 01–11. Pas
   d'invention orpheline.
2. **Non-contradiction du canon.** Elle **n'invalide jamais** : le sceau = œuvre
   des Quatre ; Voldemort = dernière serrure, pas le fond ([01 §1.6]) ; la
   corruption *réveille*, ne crée pas ([09 §9.1.1]). Elle **montre** ce que les
   autres chapitres *racontent*.
3. **Ne gate rien.** Lire ou non l'entrée ne change pas l'accès à la descente
   ([04 §4.7]). Au plus, elle pose une **note marginale** de Maison/héros.
4. **Question → réponse.** La version *voilée* pose une question ou un mystère ;
   la version *révélée* y répond. Si une entrée n'a rien à révéler, elle n'a
   qu'une `veiled` (cas des termes de glossaire simples).
5. **Style parchemin.** Registre érudit, mystérieux, dans l'esprit des livres HP.
   Aucun jargon mécanique dans le corps *lore* (le chiffré va en « Notes de
   terrain » séparées).

### 12.5.2 Format standard (rappel)

Reprendre le squelette §12.3 : `id` stable + `category` + `title` +
`unlockConditions` (OU) + `textVersions.veiled` (obligatoires) ; `revealedBy`
(ET), `corruptedBy`, `variants`, `links`, `icon`, `act` (optionnels).

### 12.5.3 Conditions de déverrouillage admissibles

Une `unlockCondition` / `revealedBy` ne référence que des **signaux déjà
sérialisés ou dérivables** (pas de nouvel état lourd) :

| `type` | `value` | Source ✅ |
|--------|---------|-----------|
| `floor` | n° d'étage | `floorReached` (dérivé du max atteint) |
| `quest` | id de quête | `activeQuests` / quêtes terminées |
| `eclat` | rang 1–3 | nombre de `eclat_voute` collectés (`eclatProgress`) |
| `monster` | id (+ `kills`) | `seenMonsters` / `monsterKills` ✅ |
| `riddle` | id de stèle | flag de stèle résolue (`r_clef_voute`…) |
| `echo` | id d'écho | 💡 `temporalEchoSeen` (Set, zone D) |
| `house` | maison | `chosenHouse` (variantes uniquement) |

### 12.5.4 Checklist d'ajout (✅ à cocher en revue)

- [ ] `id` unique, stable, en `snake_case` (jamais renommé après release — il sert
      de clé de sauvegarde).
- [ ] `category` parmi les 7 sections (§12.2).
- [ ] ≥ 1 `unlockCondition` référençant un signal admissible (§12.5.3).
- [ ] `textVersions.veiled` rédigée (style parchemin, pose une question).
- [ ] Si évolutive : `revealedBy` + `textVersions.revealed` cohérents avec le
      robinet (Éclat / quête / kills / écho).
- [ ] Passe les 5 critères de cohérence (§12.5.1).
- [ ] `links[]` vers les entrées parentes/enfantes si pertinent (graphe).
- [ ] Renseignée dans la **table de synthèse** §12.6 si entrée *majeure*.

---

## 12.6 Tables de synthèse

### 12.6.1 Par catégorie — entrées principales & déverrouillage

| Catégorie | Entrées principales (exemples) | Condition de déverrouillage | Impact narratif |
|-----------|-------------------------------|------------------------------|-----------------|
| 📖 **Glossaire** | Froid surnaturel · Boucle Ténébreuse · Ruines Anciennes · Cheminette · Voyageur | Étage / Acte atteint | Donne le **vocabulaire** ; rend le monde lisible. |
| 🐉 **Bestiaire** | Veilleur du Seuil · Détraqueur · Boss canon (Greyback, Aragog, Voldemort) | Rencontre → N victoires (✅) | **Menace comprise** : origine de corruption + faiblesse. |
| 🗺️ **Lieux** | Grande Salle · Cachots · Profondeurs · Ruines Anciennes | Étage atteint (+ écho *vu*) | **Géographie de la mémoire** : descendre = remonter le temps. |
| 👤 **Personnages & Maisons** | Dumbledore · Manon · Fondateurs · Chefs de Maison | Quête / rencontre / découverte | **Visages** du récit ; arcs et quêtes signature. |
| 🔥 **Histoire & Lore** | Clé de Voûte · double trame · Fondateurs | Éclats / fil rouge | **Le « pourquoi »** de toute la descente. |
| 🔹 **Éclats & Voix** | 3 Éclats · 4 voix · écho du scellement | Éclat ramassé + stèle/écho | **Fil rouge collectionnable** ; révélation en 3 temps. |
| ⚜️ **Objets & Artefacts** | Épée de Gryffondor · Médaillon · Larmes de Fumseck · Grimoire d'Élara | Quête / palier / drop | **Reliques** qui portent un fragment de lore. |

### 12.6.2 Évolution d'une entrée — états & déclencheurs

| État | Visuel parchemin | Déclencheur | Ton |
|------|------------------|-------------|-----|
| 🔒 **Verrouillée** | Silhouette grisée, titre masqué (« ??? ») | Aucune `unlockCondition` remplie | Mystère, appel à explorer. |
| 📖 **Voilée** (`veiled`) | Vélin propre, encre nette | 1ʳᵉ `unlockCondition` remplie | Question posée, savoir partiel. |
| ✨ **Révélée** (`revealed`) | Page enrichie, sceau doré, son d'écriture | `revealedBy` (ET) satisfait | Vérité déposée — petit climax. |
| 🌑 **Corrompue** (`corrupted`) | Givre dans l'encre, runes vivantes (zone D) | `corruptedBy` (endgame) | Mémoire retournée, mythologique. |

### 12.6.3 Robinets de déverrouillage — couverture par Acte

| Robinet | Acte I (1–3) | Acte II (4–6) | Acte III (7–10) | Acte IV (11+) |
|---------|:---:|:---:|:---:|:---:|
| **Étage / Acte** (Glossaire, Lieux) | ●●● | ●●● | ●●● | ●●● |
| **Éclat / fil rouge** (Histoire, Éclats) | ● (Éclat I) | ● (Éclat II) | ●● (Éclat III + voix) | (révélations Ruines) |
| **Rencontre / combat** (Bestiaire) | ●● (F1) | ●● (F2/F4) | ●●● (F3/F5, boss) | ●●● (Ténébreux) |
| **Quête / découverte** (Perso, Objets, échos) | ● | ●● (signatures) | ●●● (apogée) | ●● (échos temporels) |

> 💡 Lecture : le Codex se remplit **partout**, mais son centre de gravité se
> déplace — du **Bestiaire** (Actes I–II, on apprend à survivre) vers
> **Histoire & Éclats** (Actes III–IV, on comprend ce qu'on combat). La courbe de
> collection épouse la **courbe de révélation** ([08 §8.6.3]).

---

> 🗂️ **Les sections §12.7 à §12.10 ci-dessous constituent le _socle
> documentaire_ du Codex** : la matière de référence (glossaire, artefacts,
> chronologie, index) que le journal in-game expose par fragments. Conservées
> comme **source unique de vérité** consultable d'un coup d'œil (et liées depuis
> les autres chapitres).

## 12.7 Glossaire des termes du jeu

### A. Termes de **lore** (fiction)

| Terme | Sens | Source |
|-------|------|--------|
| **Clé de Voûte des Quatre** | 💡 Relique forgée *ensemble* par les quatre Fondateurs ; **verrou** posé sur ce qui dormait sous l'école. Fêlée en plein cours → déclencheur de toute la trame. | ✅ déclencheur · [03 §3.1](03-trame-principale.md), [09 §9.1](09-bestiaire-et-lore.md) |
| **Boucle Ténébreuse** | 💡 Post-game : la victoire sur Voldemort *ouvre* la faille au lieu de la fermer ; le château se rejoue corrompu (étages 11+) et ouvre les **Ruines Anciennes**. | ✅ système · [03 §3.6](03-trame-principale.md) |
| **Ruines Anciennes** | 💡 Strate sous le fond du château (étages 14+), antérieure à Poudlard, que la peur tenait scellée. Esthétique runique, ton `abyss`. | ✅ tranche D · [10](10-lieux-et-geographie.md) |
| **Échos temporels** | 💡 Fragments de passé qui se matérialisent en zone C fin / zone D (murmure → silhouette → scène rejouée) ; vecteur du lore des Fondateurs sans PNJ vivant. | 💡 [10 §10.8](10-lieux-et-geographie.md) |
| **Froid surnaturel** | 💡 La corruption *rendue sensible* : partout où la fêlure touche, la chaleur de la vie reflue. Porte les faiblesses/résistances `glace`. | ✅ signature · [09 §9.1.1](09-bestiaire-et-lore.md) |
| **Voix des Fondateurs** | 💡 Quatre timbres (Godric/Salazar/Rowena/Helga) qui fuitent par stèles, échos et quêtes signature — mémoire gravée, pas fantôme. | ✅ stèle · [08 §8.6.2](08-quetes-et-sous-intrigues.md), [10 §10.8](10-lieux-et-geographie.md) |
| **Ténébreux** | 💡 Variante corrompue d'une créature ou d'un boss en Boucle Ténébreuse (boss ét. 8-10 revenus aux ét. 18-20). | ✅ système |
| **Mondes Parallèles** | 💡 Les Poudlard-reflets : chaque save est un **plan** distinct. | 💡 [11](11-mondes-paralleles.md) |
| **Cheminette Inter-Mondes** | 💡 Veine de cendre verte ancienne reliant les plans ; sort de niv. 8 qui projette le héros chez un autre joueur. | ✅ système · [11](11-mondes-paralleles.md) |
| **Voyageur** | 💡 Rôle endossé par tout héros maîtrisant la Cheminette ; marche entre les plans en **projection astrale**. | 💡 [11 §11.4](11-mondes-paralleles.md) |
| **Écho** | 💡 Silhouette de mémoire d'un monstre de l'hôte, réveillée par le visiteur ; abattue, elle laisse de l'Essence d'Outremonde. | ✅ système · [11 §11.2](11-mondes-paralleles.md) |
| **Verrou de Sang** | 💡 Pacte d'entraide différée : le visiteur scelle un défi chez l'hôte, qui le brise plus tard. | ✅ système · [11 §11.3](11-mondes-paralleles.md) |
| **Essence d'Outremonde** | 💡 « Peur d'un autre monde cristallisée » ; monnaie cross-plan du Voyageur. | ✅ système |
| **Forge des Ténèbres** | 💡 Atelier endgame de la Boucle : transforme les matériaux Ténébreux (essences) en équipement de haut palier. | ✅ système |
| **Bibliothèque interdite** | 💡 Pendant savant de la Forge : recettes/sorts débloqués par les matériaux de Boucle (pages). | ✅ système |
| **Grimoire d'Élara** | 💡 Carnet de givre et de deuil de la mère de Manon ; pages dispersées dans les Actes II-III (easter egg lumineux). | 💡 [06](06-pnj-et-factions.md), [08](08-quetes-et-sous-intrigues.md) |
| **Lumière Éternelle (Lux Aeterna)** | 💡 Épreuve de Dumbledore : opposer un souvenir heureux aux ténèbres (boss Lux Aeterna). | ✅ système · [08](08-quetes-et-sous-intrigues.md) |
| **Garde de l'Aube** | 💡 Confrérie évoquée dans le code, liant possiblement les héros originaux. | ❓ à confirmer · [05](05-personnages-jouables.md) |

### B. Termes de **systèmes** (mécaniques)

| Terme | Définition mécanique | Source |
|-------|----------------------|--------|
| **Codex / entrée / palier** | Journal déverrouillable ; chaque **entrée** a des `unlockConditions` (ouverture) et un `revealedBy` (révélation) ; états voilée → révélée → corrompue. | 💡 ce chapitre · ✅ socle bestiaire [09] |
| **Éclats de la Clé** | `eclat_voute` ×3, drop garanti sur jalon par tranche (Peeves / Loup-Garou / Mangemort d'Élite) ; fil rouge. | ✅ [08 §8.6.1](08-quetes-et-sous-intrigues.md) |
| **Maison / palier / Mythe / Apothéose / ★ N** | Points de Maison gagnés au combat ; paliers (100/300/600/1000…), puis endgame **Mythe (17)** → **Apothéose (18)** → série **★ N** (prestige « infini »). | ✅ [07](07-les-maisons.md) |
| **Don à la Maison** | Gold-sink endgame : 5 G = 1 point, pour franchir les paliers ★ N. | ✅ |
| **Ironman** | Mode optionnel : permadeath stricte + score + **Hall of Fame**. Cheminette **exclue**. | ✅ |
| **Fortune** | Stat dérivée de la LCK : pilote les événements aléatoires hors-crit (drops, or, fouille, fuite, pièges). | ✅ |
| **Célérité** | Stat dérivée de l'AGI : taux continu d'actions supplémentaires par round (gain de tour fluide). | ✅ |
| **Broyer** | Capacité ennemie anti-tank : dégâts proportionnels aux **PV max** de la cible, ignorant la DEF (bornés). | ✅ |
| **Garde / Double-Garde** | Action de mitigation empilable (50 %), restitue des PM ; riposte probabiliste. | ✅ |
| **Statuts** | DoT (burn/poison/bleed/gel) + non-DoT (stun 💫, fear 😱). | ✅ |
| **Résistance / Faiblesse** | Multiplicateurs élémentaires (×0,5 / ×1,5) sur 6 éléments : feu, glace, foudre, lumière, ténèbres, physique. | ✅ |
| **Set de Maison** | Équipement thématique à bonus 2/3/4 pièces, par Maison. | ✅ [07](07-les-maisons.md) |
| **Set Voyageur** | Équipement cross-plan forgé à l'Atelier du Voyageur (Essence d'Outremonde). | ✅ [11 §11.4](11-mondes-paralleles.md) |
| **Souvenir (Voyageur)** | Passif cross-plan (Premier Pas, Astralien, Cartographe…). | ✅ [11 §11.4](11-mondes-paralleles.md) |

## 12.8 Objets & artefacts de lore

> 💡 (propositions de sens narratif, sur base ✅ pour l'existence des items)

| Artefact | Nature | Lore proposé |
|----------|--------|--------------|
| **Épée de Gryffondor** (`sword_gryff`) | ✅ légendaire (palier 1000 Gryffondor) | 💡 La lame qui ne se présente qu'au vrai courage — récompense de l'identité Gryffondor menée à son terme. (Entrée Codex détaillée §12.4.10.) |
| **Médaillon de Serpentard** (`locket_slytherin`) | ✅ légendaire Serpentard | 💡 Reflet du goût du pouvoir : sa puissance se mérite, son ombre se porte. |
| **Diadème de Serdaigle** (`diademe_serdaigle`) | ✅ légendaire Serdaigle | 💡 Couronne du savoir ; aiguise la magie de qui l'a gagné par l'esprit. |
| **Coupe de Poufsouffle** (`coupe_poufsouffle`) | ✅ légendaire Poufsouffle | 💡 Calice de la loyauté ; protège qui protège les autres. |
| **Éclats de la Clé de Voûte** (`eclat_voute`) | ✅ matériau / fil rouge (×3) | 💡 Fragments du verrou ; réunis, ils nomment la double trame (§12.4.7). |
| **Grimoire d'Élara** | 💡 fil narratif (Manon) | 💡 Carnet de givre, pages dispersées ; reconstitué, il révèle une joie cachée derrière le deuil. → [08](08-quetes-et-sous-intrigues.md) |
| **Larmes de Fumseck** (`larmes_phenix`) | ✅ amulette épique (`regenHp:3`) | 💡 Pleurs du phénix de Dumbledore, données en récompense par Fumseck ; soignent à chaque round. → [06](06-pnj-et-factions.md) |
| **Reliques de la Mort** | 💡 easter egg | 💡 Clin d'œil au canon — Baguette de Sureau (cf. `wand2`), Pierre, Cape (cf. `cape_invis`). Présence allusive, **non scénarisée** comme objectif. |
| **Set Voyageur & souvenirs** | ✅ Atelier du Voyageur | 💡 Reliques de cendre verte, hors d'un seul monde. → [11 §11.4](11-mondes-paralleles.md) |

> ❓ À arbitrer : les **Reliques de la Mort** restent-elles un pur easter egg
> visuel (baguette de Sureau, cape d'invisibilité déjà présents en items), ou
> reçoivent-elles un mini-arc dédié ? Proposition : **rester allusif** pour ne
> pas concurrencer la trame Voldemort.

## 12.9 Chronologie / continuité

> 💡 (proposition de repères — à valider en [02](02-univers-ton-et-canon.md))

| Repère | Position | Note |
|--------|----------|------|
| **Avant le jeu** | Une corruption ancienne, scellée par la peur sous les fondations, s'éveille ; les escaliers se figent vers le bas. | 💡 prémisse · [01](01-synopsis-et-pitch.md) |
| **Ouverture** | Le portrait de Dumbledore appelle le héros → quête tutoriel → choix de Maison → entrée dans le donjon. | ✅ |
| **Acte I — étages 1-3** | L'École qui se fissure (couloirs de Poudlard). | ✅ [03 §3.2](03-trame-principale.md) |
| **Acte II — étages 4-6** | La Descente (cachots) ; apparition des mangemorts ; amorce du grimoire d'Élara. | ✅ [03 §3.3](03-trame-principale.md) |
| **Acte III — étages 7-10** | Les Profondeurs ; boss canon (Greyback ét.8, Aragog ét.9, Dolohov ét.10, Bellatrix ét.8, Voldemort **Affaibli** ét.9). | ✅ [03 §3.4](03-trame-principale.md) |
| **Climax — étage 10** | **Voldemort Ressuscité** ; sa défaite scelle l'arc → cinématique de victoire. | ✅ [03 §3.5](03-trame-principale.md) |
| **Acte IV — étages 11+** | **Boucle Ténébreuse** : château corrompu, Ténébreux, Ruines Anciennes (14+), paliers Mythe/Apothéose/★ N. | ✅ [03 §3.6](03-trame-principale.md) |
| **Hors-temps (parallèle)** | Les **Mondes Parallèles** : visites latérales via la Cheminette (niv. 8). Sans place fixe dans la chronologie — *traverser*, pas *avancer*. | 💡 [11](11-mondes-paralleles.md) |

> ❓ À arbitrer : situer l'aventure **par rapport au canon HP** (avant/pendant/
> après les sept tomes ?). La présence simultanée de Harry, Dumbledore (portrait),
> Sirius, Voldemort « ressuscité » suggère une **continuité alternative assumée**
> plutôt qu'un point précis de la timeline canon. → à fixer en
> [02](02-univers-ton-et-canon.md).

## 12.10 Index des personnages

> Table récapitulative avec renvois. Détail des fiches en
> [05](05-personnages-jouables.md) (héros) et [06](06-pnj-et-factions.md) (PNJ).

### Héros jouables (✅ `data.js`)

| Nom | Maison | Rôle | Canon ? | Fiche |
|-----|--------|------|---------|-------|
| Harry Potter | Gryffondor | Auror (offensif + Protego) | canon | [05](05-personnages-jouables.md) |
| Hermione Granger | Gryffondor | Mage (soin/support) | canon | [05](05-personnages-jouables.md) |
| Drago Malefoy | Serpentard | Duelliste | canon | [05](05-personnages-jouables.md) |
| Cho Chang | Serdaigle | Attrapeuse | canon | [05](05-personnages-jouables.md) |
| Cedric Diggory | Poufsouffle | Champion | canon | [05](05-personnages-jouables.md) |
| Céleste Luneclair | Serdaigle | Astromage | original | [05](05-personnages-jouables.md) |
| Iris Prismara | Poufsouffle | Enchanteresse | original | [05](05-personnages-jouables.md) |
| Maxence Ravenwood | Serpentard | Mage de Sang | original | [05](05-personnages-jouables.md) |
| Anastasia Moonveil | Gryffondor | Mage de la Lune | original | [05](05-personnages-jouables.md) |
| Louis Dragonflamme | Poufsouffle | Dompteur de Dragons | original | [05](05-personnages-jouables.md) |
| Jeanne d'Argenciel | Gryffondor | Charmeuse de Sortilèges | original | [05](05-personnages-jouables.md) |
| Agathe Lumiflore | Gryffondor | Enchanteresse florale | original | [05](05-personnages-jouables.md) |
| Olivier de Clairval | Serdaigle | Mage de combat | original | [05](05-personnages-jouables.md) |

### PNJ & figures de lore (✅ `npcs.js`)

| Nom | Rôle | Fiche |
|-----|------|-------|
| Albus Dumbledore | Guide d'intro (portrait), quête tutoriel, épreuve Lux Aeterna | [06](06-pnj-et-factions.md) |
| Madame Pomfresh | Infirmière, quête mandragore | [06](06-pnj-et-factions.md) |
| Gilderoy Lockhart | Quête du livre interdit | [06](06-pnj-et-factions.md) |
| Mimi Geignarde | Quête du troll des toilettes | [06](06-pnj-et-factions.md) |
| Hagrid | Quête de la chouette perdue | [06](06-pnj-et-factions.md) |
| Manon | Fil du grimoire d'Élara (Actes II-III) | [06](06-pnj-et-factions.md) |
| Fumseck | Phénix : larmes (soin), amulette | [06](06-pnj-et-factions.md) |
| Sir Nicolas | Easter egg « Chasse Sans Tête » | [06](06-pnj-et-factions.md) |
| McGonagall / Rogue / Flitwick / Chourave | Chefs de Maison : paliers endgame, don à la Maison | [06](06-pnj-et-factions.md), [07](07-les-maisons.md) |
| Slughorn | Concoction de potions (recettes) | [06](06-pnj-et-factions.md) |
| Kingsley (ét.8/18) · Bill (ét.9/19) · Sirius (ét.10/20) | PNJ de zone profonde (recyclés en Boucle) | [06](06-pnj-et-factions.md) |
| Apothicaire / Marchand / Forgeron (Ténébreux) | Vendeurs endgame | [06](06-pnj-et-factions.md) |
| Gardien de la Boucle | PNJ exclusif post-victoire (quêtes de purge) | [06](06-pnj-et-factions.md) |

### Figures de lore — les Fondateurs (💡 via stèles, échos, quêtes signature)

| Fondateur | Maison | Voix (écho) | Porte d'entrée Codex |
|-----------|--------|-------------|----------------------|
| Godric Gryffondor | 🦁 | *« On tient la porte. »* (courage) | 🦁 *L'Étendard de Godric* · échos zone D |
| Salazar Serpentard | 🐍 | *« J'ai scellé ma part avec ma faute. »* (ambivalence) | 🐍 *Le Pacte des Cachots* · écho de Salazar (§12.4.5) |
| Rowena Serdaigle | 🦅 | *« Comprends, et la faille apparaît. »* (savoir) | 🦅 *Le Codex de Rowena* · stèles |
| Helga Poufsouffle | 🦡 | *« Un abri pour ceux qui resteraient. »* (refuge) | 🦡 *Ceux qu'on ne laisse pas derrière* · échos |

### Antagonistes (✅ `monsters.js`)

| Nom | Type | Étage | Fiche |
|-----|------|-------|-------|
| Voldemort Affaibli → Ressuscité | Boss canon (climax) | 8 → **10** | [03](03-trame-principale.md), [09](09-bestiaire-et-lore.md) |
| Fenrir Greyback | Boss canon (epic) | 8 | [09](09-bestiaire-et-lore.md) |
| Aragog | Boss canon (epic) | 9 | [09](09-bestiaire-et-lore.md) |
| Antonin Dolohov | Boss canon (epic) | 10 | [09](09-bestiaire-et-lore.md) |
| Bellatrix Lestrange | Boss canon | 8+ | [09](09-bestiaire-et-lore.md) |
| Veilleur du Seuil / Maître des Détraqueurs / Héraut des Ténèbres / Hécate la Maudisseuse | Boss **originaux** (epic) | 8-10+ | [06](06-pnj-et-factions.md), [09](09-bestiaire-et-lore.md) |

---

# ÉTAPE 2 — État livré (réconcilié 2026-06-14)

> ✅ **Système entièrement livré.** Ce qui suit fut un *plan d'implémentation* ;
> le Codex est désormais **codé, câblé et versionné**. Cette section ne décrit
> plus du « à construire » mais l'**état réel** + les renvois module. Le détail
> opérationnel historique (lots, cases à cocher) reste archivé dans
> [`.claude/plans/_archive/ch12-codex-impl.md`](../../.claude/plans/_archive/ch12-codex-impl.md).

## Cartographie brique → module livré

| Brique (ex-plan) | Module(s) réel(s) | État |
|------------------|-------------------|------|
| Registre `CODEX_ENTRIES` + helpers purs `getCodexEntry` / `codexEntryState` / `unlockedCodexFor` / `codexVariantNote` | `js/codex.js` (registre + évaluateur purs, **au MANIFEST `loader.js`**) | ✅ livré |
| Évaluateur d'état `'locked'/'veiled'/'revealed'/'corrupted'` | `codexEntryState()` (`js/codex.js`) — pur, couvert par `tests/units.js` | ✅ livré |
| Hook de réévaluation `checkCodexUnlocks(reason)` aux points d'`autoSave` | `js/ui-codex.js` + appels dans `battle-rewards.js`, `quests.js`, `movement*.js`, `break-cycle.js`, `floor-ambiance.js`, `main.js` | ✅ livré |
| Globals sérialisés `unlockedCodexEntries`, `floorReached` | `js/state.js` (+ `js/save.js`) | ✅ livré |
| Robinet **échos** (zone D / Voix des Fondateurs) | **livré sous le nom `seenEchoes`** (`state.js:523`, sérialisé ; 18 conditions `echo` dans `codex.js`) — l'ex-nom `temporalEchoSeen` du plan n'a pas été retenu | ✅ livré |
| Menu Codex `openCodex()` + modale **dédiée `#codex-modal`** + bouton 📖 + recherche/filtres | `js/ui-codex.js`, `index.html` (`filterCodex`, `showCodexEntry`) | ✅ livré |
| Notifications + SFX (`playCodexWrite` / `playCodexReveal`) | `js/audio-sfx.js` (défensifs) | ✅ livré |
| Bestiaire embarqué (familles, codex 2 paliers) | `js/ui-bestiary.js` (réutilisé, non réécrit) | ✅ livré |
| Variantes Maison/héros (notes marginales) + choix scénarisés (`slythPactChoice`) | `codexVariantNote()` (`js/codex.js`) | ✅ livré |

> **Contenu** : audit de complétude réalisé (2026-06-13) — 36 entrées, **0 coquille
> vide**, 0 condition morte ; 6 entrées de lore majeur enrichies d'une couche
> `revealed` (cf. roadmap Phase 2, [REVUE](../REVUE-TRANSVERSALE-ET-ROADMAP.md)).

## Assets — état

Les visuels parchemin par Acte restent en **fallback CSS** (dégradé + filtre
`sepia/hue-rotate`) : fonctionnel sans PNG dédiés. Les SFX (`playCodexWrite` /
`playCodexReveal`) et l'effet de révélation (keyframes CSS, glow doré) sont
livrés. Versions voilée/révélée/corrompue : rédigées en §12.4. Reste **optionnel**
(polish, non bloquant) : 4 PNG `parchment_<act>.png` et la voix FR des Fondateurs.

## Objectifs finaux — comment ce chapitre les sert

- **Immersion & rejouabilité** : le Codex est une **collection** (envie de tout
  découvrir) dont le centre de gravité se déplace du Bestiaire vers l'Histoire au
  fil de la descente (§12.6.3). Maison + héros + Éclats = un Codex différent
  d'une partie à l'autre.
- **Récompense narrative forte** : passer une entrée de *voilée* à *révélée* est
  un micro-climax (sceau doré, son d'écriture). Le fil rouge ([08 §8.6]) **se
  dépose** page après page au lieu de s'évaporer.
- **Lie tous les chapitres** : sept sections = sept portes vers 03/05/06/07/08/09/10/11.
  Le Codex est la **table des matières jouable** de toute la documentation.
- **Maintenable & extensible** : un seul format d'entrée (§12.3), des règles
  d'ajout claires (§12.5), un registre pur (`codex.js`) calqué sur
  `quests-templates.js`/`riddles.js`, et **aucune brique ne contredit** le canon
  (sceau = œuvre des Quatre ; Voldemort = dernière serrure ; corruption qui
  réveille — [01]/[02]/[09]).

---

## Points à trancher (résumé)

1. ✅ **Huitième onglet « Voyageur »** : **tranché (2026-06-14) — pas d'onglet
   dédié.** Les Mondes Parallèles vivent dans Glossaire/Objets (décision livrée
   dans `js/codex.js`, cf. §12.2). Codex à **sept onglets**.
2. ✅ **Conteneur UI** : **tranché — modale dédiée `#codex-modal`** (livrée,
   `js/ui-codex.js`), pas de partage de `#char-detail`.
3. ❓ Profondeur des **états corrompus** : généralisés à toutes les entrées
   majeures en zone D, ou réservés à une poignée d'entrées-phares ? (§12.6.2)
4. ❓ **Reliques de la Mort** : pur easter egg Codex allusif, ou mini-arc ? (§12.8)
5. 💡 Brancher la **notification « nouvelle créature »** existante sur le hook
   Codex unifié (cosmétique, faible coût) — `checkCodexUnlocks`, `js/ui-codex.js`.

---

> 🔗 Renvois principaux : [01 Synopsis](01-synopsis-et-pitch.md) ·
> [03 Trame](03-trame-principale.md) · [04 Actes & étages](04-structure-actes-et-etages.md) ·
> [05 Héros](05-personnages-jouables.md) · [06 PNJ & factions](06-pnj-et-factions.md) ·
> [07 Maisons](07-les-maisons.md) · [08 Quêtes & fil rouge](08-quetes-et-sous-intrigues.md) ·
> [09 Bestiaire](09-bestiaire-et-lore.md) · [10 Lieux](10-lieux-et-geographie.md) ·
> [11 Mondes Parallèles](11-mondes-paralleles.md).

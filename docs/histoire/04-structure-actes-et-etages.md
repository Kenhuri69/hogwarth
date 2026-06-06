# 04 — Structure : actes & étages

**Statut :** 🟩 proposition de référence — à valider

> Objectif du chapitre : faire le pont entre la **structure de jeu** (étages) et
> la **structure narrative** (actes). Donner à chaque tranche d'étages une
> identité de lieu, d'ambiance et de progression dramatique. `💡` = proposition
> argumentée ; `✅` = acté dans le jeu. À lire avec la trame déroulée en
> [03](03-trame-principale.md) et le cadre fictionnel en
> [02](02-univers-ton-et-canon.md).

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
| **Prologue** | — | — | Intro Dumbledore + choix de Maison (✅). |
| **Acte I — L'École** | 1–3 | A | Prise en main ; comprendre que *le mal vient d'en bas*. |
| **Acte II — La Descente** | 4–6 | B | Les cachots ; révélation : *Voldemort se reconstitue*. |
| **Acte III — Les Profondeurs** | 7–10 | C (début) | Boss canon ; marche vers la source. |
| **Climax** | **10** | C | ✅ **Voldemort Ressuscité** — chute de l'arc principal. |
| **Acte IV — La Boucle Ténébreuse** | 11+ | C (fin) → D | Post-game : le château rejoué corrompu ; Ruines Anciennes (14+). |

> 💡 **Pourquoi le climax à l'étage 10 et non à une frontière de tranche ?**
> Parce que la victoire est ce qui **fait basculer le décor** : tant que
> Voldemort n'est pas vaincu, l'escalier de l'étage 10 est **scellé**
> (✅ `victoryAchieved`). C'est l'acte du joueur — pas un seuil arbitraire — qui
> ouvre les Profondeurs profondes (11–13) puis les Ruines (14+). Le climax est
> donc le **verrou** entre la trame principale et l'endgame.

## 4.2 Jalons par tranche

> 💡 (proposition) / ✅ (ancrages)

### Acte I — L'École (étages 1–3, tranche A)

- **Beat narratif** : le familier se fissure. Des créatures presque
  domestiques (chat de Mme Norris, Peeves, lutins, portraits hostiles) tournent
  à l'agressivité — premier symptôme de la corruption.
- ✅ **PNJ-jalons & quêtes** : Madame Pomfresh (`mandragore_pomfresh`), Mimi
  Geignarde (`troll_toilettes`), Hagrid (`chouette_perdue`), Gilderoy Lockhart
  (`livre_interdit`).
- 💡 **Événement marquant** : la **première fontaine** (✅ étage 2) — un répit
  qui dit au joueur *« tu vas en avoir besoin »*. Premier escalier descendant
  vécu comme un seuil.

### Acte II — La Descente (étages 4–6, tranche B)

- **Beat narratif** : l'école laisse place à la pierre froide. ✅ Les
  **mangemorts masqués** apparaissent — la corruption a des *fidèles* qui
  hâtent le retour de leur maître. Révélation centrale : *Voldemort se
  reconstitue au fond*.
- 💡 **Sous-intrigue** : amorce du **grimoire d'Élara** (Manon) — une histoire
  de givre et de deuil en contrepoint de la menace montante
  ([08](08-quetes-et-sous-intrigues.md)).
- ✅ **Événement marquant** : la **transition 3↔4** (fondu + toast) — première
  vraie rupture de décor, on quitte l'école.

### Acte III — Les Profondeurs (étages 7–10, tranche C début)

- **Beat narratif** : on quitte le Poudlard connu pour des **Profondeurs
  Oubliées**. Montée en gamme : élite mangemort, créatures majeures, puis les
  boss canon qui gardent la route vers la source.
- ✅ **Boss-jalons** : **Fenrir Greyback** (ét. 8), **Voldemort Affaibli**
  (ét. 8 — premier contact, encore incomplet), **Aragog** (ét. 9), **Antonin
  Dolohov** (ét. 10), **Bellatrix**. Chaque boss tombé *affaiblit le sceau*.
- ✅ **PNJ profonds** : Kingsley (ét. 8), Bill Weasley (ét. 9), Sirius (ét. 10).
- ✅ **Événement marquant** : la **transition 6↔7** ouvre l'abyssal.

### Climax — La chute de Voldemort (étage 10, tranche C)

- ✅ Au fond des Profondeurs, **Voldemort Ressuscité** (`voldemort_revenu`),
  pleinement reformé. Le vaincre déclenche la **cinématique de victoire**
  (discours de Dumbledore) et **scelle l'arc principal**.
- ✅ Réplique clé : *« L'escalier le plus profond, scellé par la peur, s'ouvre
  enfin. »*

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
  Anciennes** (✅ tranche D, 14+), antérieures à l'école.
- ✅ **Recyclage** : boss 8-10 de retour en variantes **Ténébreuses** aux
  étages 18-20 ; PNJ profonds recyclés (Kingsley 8/18, Bill 9/19, Sirius 10/20).
- ✅ **PNJ exclusif** : le **Gardien de la Boucle** (étage 11) donne 3 quêtes de
  purge répétables (Greyback / Aragog / Dolohov) → matériaux Forge &
  Bibliothèque.
- ✅ **Paliers de Maison endgame** : **Mythe (17)**, **Apothéose (18)**, série
  **Apothéose ★ N** (prestige « infini ») + **don à la Maison** (gold-sink).
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

> 💡 **Courbe d'ensemble** : Acte I = pédagogie (on apprend à jouer en sécurité
> relative) ; Acte II = serrage (la menace se nomme) ; Acte III = crescendo
> (boss enchaînés vers le climax) ; Acte IV = plateau de prestige (la pression
> ne retombe pas, elle se *maîtrise*).

## 4.4 Étages spéciaux & évènements

> 💡 (proposition) / ✅ (ancrages)

Le procédural est ponctué de **cellules spéciales** qui scandent le rythme et
portent du lore :

| Élément | ✅ Statut de jeu | Rôle narratif proposé |
|---------|-----------------|------------------------|
| **Fontaine** (⛲) | ✅ étages 2, 5, 8, 11… ; soin total 1×/visite | Havre — souffle entre deux paliers ; se tarit après usage (« la magie de ce lieu s'épuise »). |
| **Coffre / Boutique** | ✅ cellules générées par étage | Récompense de l'exploration ; le marchand profond vend Essence/Page en Boucle. |
| **Autel / Rune / Stèle d'énigme** | ✅ interactions dédiées | Vestiges d'une magie ancienne — densité croissante vers les Ruines. Les **stèles** posent des **devinettes** (lore). |
| **Forge & Bibliothèque** | ✅ endgame | Ateliers de la Boucle : transformer les matériaux de purge en puissance. |
| **Jardin d'herbes** | ✅ besace d'herbes / craft | Respiration verte, écho de la Botanique (Chourave). |
| **Énigmes de Dumbledore** | ✅ `quests-riddles.js` (Lumière Éternelle) | Beat émotionnel : le souvenir heureux contre les ténèbres. |

> 💡 **Étages scénarisés fixes ?** Le jeu est procédural, mais on peut
> **épingler une scène écrite** à un étage-charnière sans casser la génération :
> l'étage 10 (Voldemort) en est déjà un de fait. Candidats naturels : étage 1
> (premier pas, ton pédagogique), étage 4 (première transition), étage 11
> (rencontre du Gardien de la Boucle). On garderait le procédural *autour* d'un
> **point fixe scénarisé**.

> ❓ À arbitrer : veut-on **formaliser des « étages-scènes »** (un beat écrit
> garanti à l'entrée d'étages-clés) en plus du procédural, ou réserver le
> scénarisé au seul climax (étage 10) ?

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

---

## Récapitulatif express (pour briefer Gemini)
> Les **actes calquent les tranches** A/B/C/D, à une exception près : le
> **climax (Voldemort, ét. 10) tombe au cœur de la tranche C**, car c'est la
> *victoire* qui débloque les étages profonds — le climax est le **verrou**
> entre trame et endgame. Acte I « L'École » (1–3) ; Acte II « La Descente »
> (4–6) ; Acte III « Les Profondeurs » (7–10, climax à 10) ; Acte IV « La
> Boucle Ténébreuse » (11+, Ruines Anciennes à 14+). La tension monte par
> **taille des groupes**, **densité au grind** et **rareté du répit
> (fontaines)**. Cellules spéciales (fontaines, autels, stèles, forge/biblio)
> scandent le rythme. La **frontière 13↔14** est le franchissement le plus
> solennel — entrée dans des ruines pré-Poudlard.

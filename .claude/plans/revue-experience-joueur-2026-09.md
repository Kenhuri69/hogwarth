# Revue complète de l'expérience joueur & plan d'approfondissement — 2026-09-29

**Branche :** `ccr-4b80ea69-2nys9o`
**Statut :** 📝 proposition — Lot 0 lancé (voir « Arbitrages reçus ») ;
autres lots en attente (chaque lot retenu → plan dédié avant code, puis
`commit-guard`).
**Demande (utilisateur) :** « Lance une revue complète du jeu et propose un plan
d'amélioration, d'enrichissement et d'approfondissement de l'expérience du
joueur. Propose tout axe donnant de la profondeur ou des axes d'histoire
secondaire complémentaires. »

## Méthode

Trois audits parallèles, ancrés dans le code de `master` (`aa4641c`, PR #749) :

1. **Revues et plans existants** — pour ne rien re-proposer de livré ni de
   rejeté (`game-evolution-review-2026-07`, `revue-design-progression-2026-07`,
   `revue-sources-contenu-2026-07-28`, `content-replayability`,
   `reliquats-backlog`, `cloture-plans-ouverts-2026-08-24`, roadmap transversale).
2. **Bible narrative (`docs/histoire/01-14`) comparée au code** — arcs
   documentés, arcs livrés, pistes dormantes.
3. **Audit quantitatif du contenu et des systèmes**, avec registres chargés dans
   un sandbox Node (comptes exacts).

Les constats surprenants ont été re-vérifiés à la main (objets sans source, libellés
de lieux).

---

## Verdict

La revue de juillet disait : *« les systèmes sont excellents ; il manque du
volume de contenu et de la profondeur de choix »*. Depuis, le volume a
beaucoup progressé : faune native 13-16, Poches du Sceau, verbes `discover` et
`talk`, lot 4 d'équipement, 12 Hauts Faits, glossaire. **Le diagnostic a
changé de nature :**

> **Le jeu est large, mais il reste impersonnel.** 16 héros, 40 PNJ, 96 quêtes,
> 83 monstres… pourtant le monde **ne réagit presque jamais à qui l'on est ni
> à ce que l'on décide**. Les héros ne se parlent pas, les PNJ ne les
> reconnaissent pas, les méchants ne parlent pas. Le seul vrai choix moral est
> réservé à une seule Maison.

Chiffres clés (mesurés) :

| Indicateur | Valeur | Lecture |
|---|---|---|
| Choix à conséquence | **1** (`slythPactChoice`, Serpentard seulement) | `quests.js:153` le dit : « le seul vrai choix gris du jeu » |
| Réplique ou dialogue conditionné au héros | **0** (`heroKey` absent de `npc-dialog.js` et `npcs-*.js`) | Dumbledore ne reconnaît pas Harry, Rogue ignore Drago |
| Répliques entre les deux héros du duo | **0** paire écrite sur 120 possibles | Le duo est interchangeable |
| Boss qui parlent (`BOSS_PROMO_BEATS`) | 6, tous originaux | Bellatrix, Dolohov, Greyback, Aragog et Voldemort sont **muets** |
| Boss garantis avant l'étage 10 | **0** | Étages 1-5 : aucun boss ; 6-9 : tirages pondérés |
| Étages-scènes avant la victoire | 1, 4, 7, 8, 9 | **Acte II (4-6) : un seul beat** |
| Quêtes `kill` | ~57 % (55/96) | 7-10 : 17 des 23 quêtes |
| Entrées Codex « personnages » | 6 | Aucun des 16 héros n'en a |
| Phrases d'ambiance de salle | 16 pour tout le jeu | Répétition perçue dès l'étage 3 |
| Énigmes | 12 | Idem |
| Playtest humain exécuté | **0** (`docs/playtest-3-boucles.md:136`) | Tout l'équilibrage est simulé |

---

## Lot 0 — Corrections et incohérences relevées (effort S, à faire d'abord)

Ce ne sont pas des axes de design, mais des défauts concrets que la revue a
trouvés. Tous sont vérifiés dans le code.

| # | Constat | Preuve | Correctif proposé |
|---|---|---|---|
| 0.1 | **8 objets sans aucune source d'obtention** : `livre_sanguini`, `livre_vampyrus`, `livre_taranta`, `livre_maledictus`, `livre_crucio`, `livre_morsmordre`, `grimoire_interdit` (Fiendfyre), `reliquaire_lunaire` (légendaire) | Ids présents seulement dans `data-items.js` et `item-icons.js`. Absents de `SHOP_CATALOG`, des drops, de la liste `booksAvailable` (`movement-interactions.js:72-90`) ; `pickChestEquipment` exclut les légendaires (`data-items.js:776`) | Leur donner une source **narrative** plutôt qu'un simple ajout au butin : voir arc **H3** (Carnet du Lieutenant) pour les grimoires ténébreux et arc **H6** (Garde de l'Aube) pour le Reliquaire. Minimum viable : les ajouter au marchand clandestin (ét. 8) et au Chaudron des Ruines. (Les sorts existent bien dans `SPELLS`, par exemple `Tarantallegra`, `data-spells.js:50` : seul le vecteur d'apprentissage manque. Sanguini est aussi un sort de départ d'un héros, `data-characters.js`.) |
| 0.2 | **Libellé de lieu du HUD incohérent** avec les tranches : ét. 2 = « Cachot de Potions » (tranche A = Couloirs), ét. 5 = « Tour de Gryffondor » (en plein Cachots), **ét. 11+ = « La Chambre des Secrets »** pour toute la Boucle | `ui.js:629-630` indexe `LOCATIONS` (`data-world.js:6-10`) par étage | Dériver le libellé de `getFloorTheme(floor)` plus un nom de lieu par étage cohérent avec `docs/histoire/10-lieux-et-geographie.md`. Petit effort, gain d'immersion permanent. |
| 0.3 | **Factions contradictoires** : la sélection range Céleste, Iris, Maxence et Anastasia dans « Cercle des Astres » (`index.html:303`), alors que la bible les place dans la Garde de l'Aube (05:241, 06:220) | `index.html:303,372` | Trancher (voir question Q3), puis aligner l'index ou la bible. |
| 0.4 | **Documentation périmée** : CLAUDE.md parle de « 6 entrées actuelles » de héros (il y en a **16**) ; 05:7 et 05:638 (10 `descentStake` manquants, alors que les 16 existent) ; 06:469 et 06:489 (PNJ dits non implémentés alors qu'ils existent) ; 11:507 (« 13 jouables ») | `data-characters.js`, 16 `.hero-card` | Passe documentaire. |
| 0.5 | Commentaires de code obsolètes : `monsters.js:60` (IA « évolutions futures », alors que les 3 IA sont bien différenciées) ; `forge.js:8` (« 0-5 », alors que le plafond est +8) | — | Deux lignes. |
| 0.6 | Rogue salue « un élève de ma maison » **quelle que soit la Maison** | Greeting de Rogue, `npcs-a.js` | Variante `dialoguesByHouse` (le mécanisme existe déjà pour Slughorn, `npcs-a.js:371`). |

---

## Les axes d'approfondissement

Chaque axe indique : le constat, la proposition, les **systèmes existants
réutilisés** (pour garder un effort bas), l'impact et l'effort, et le
**lien avec les plans ouverts** (pour ne pas faire doublon).

### AXE 1 — Un monde qui reconnaît le joueur (réactivité) 🔴 levier n°1

*Le plus fort ratio impact/effort : le moteur de dialogue sait déjà
varier par Maison, par Pacte et par Éclats. Il ne sait pas varier par héros.*

- **1a · Dialogues conditionnés au héros** : champ `dialoguesByHero` sur le
  modèle de `dialoguesByHouse`. Une ligne suffit à créer l'effet. Première
  vague ciblée sur les **liens canon** :
  - Dumbledore → Harry (promis par 05:126-127) ;
  - Rogue → Drago et Harry ;
  - Lupin → Harry ;
  - Hagrid → Harry et Hermione ;
  - Slughorn → Cho et Cedric ;
  - Trelawney → Céleste (écho documenté 06:171) ;
  - McGonagall → les héros de Gryffondor.

  Ensuite, les héros originaux (Garde de l'Aube, Cercle des Astres) avec 1 ou
  2 PNJ chacun.
- **1b · Entrées Codex des héros** : 16 entrées `personnages` débloquées par
  la sélection, **complétées** par une note de fin via `codexVariantNote`
  (`codex.js:953-960`). Le moteur existe, mais **aucune entrée ne l'utilise**.
  Coût : données seulement.
- **1c · Dénouement par héros dans la fin B** : aujourd'hui, la ligne de fin
  est générique (`endgame.js:48-52`). Proposition : **une phrase de payoff par
  héros** qui résout son arc documenté (05 §5.x), par exemple Harry et
  l'orgueil de descendre seul, ou Hermione et « tout ne se résout pas par le
  savoir ». Ce reste du texte sur la cinématique existante, ce qui respecte
  03:241 (« variantes = texte, jamais branche »).

Impact **fort** · effort **S à M** (données et rédaction, très peu de JS) ·
complète C4 (`game-evolution-review`), qui n'avait livré que `descentStake`.

### AXE 2 — Le duo comme relation (profondeur de groupe)

*16 héros donnent 120 paires possibles, et aucune n'est écrite.*

- **2a · Répliques de paire** : `pickHeroBark` reçoit la clé du partenaire.
  Une table `HERO_PAIR_BARKS[a|b]` est consultée en priorité, et les
  répliques génériques servent de repli. Commencer par **8 à 10 paires
  canoniques ou dramatiques** (et non 120) :
  - Harry/Hermione, Harry/Drago, Cho/Cedric, Drago/Hermione ;
  - Iris/Louis et Cedric/Cho (paires documentées en 05:576-579) ;
  - puis 1 ou 2 paires entre héros originaux.

  Événements visés : entrée d'Acte, `allyDown`, avant Voldemort, victoire.
- **2b · Complicité (valeur dérivée, pas de nouveau choix)** : un compteur de
  combats gagnés ensemble, par paire, conservé dans le profil hors-save (même
  logique que les Hauts Faits). À partir de certains seuils, il débloque des
  répliques de paire plus intimes et un titre cosmétique de paire. **Aucun
  bonus de stats** : l'invariant « aucun héritage entre parties » est respecté.
- **2c · Technique de duo (optionnelle, à simuler)** : une action combinée par
  **couple d'éléments** (et non par paire de héros, pour rester à 6-8
  entrées) : feu+glace = Choc thermique, lumière+foudre = Aveuglement…
  Elle coûte les deux tours et se déclenche 1 fois par combat. Elle
  s'appuie sur les combos existants (`battle-spells.js:528`, seulement 2
  règles aujourd'hui) et sur les postures. ⚠️ Passage par `sim-difficulty.js`
  obligatoire.

Impact **fort** (2a, 2b) / moyen (2c) · effort S (2a), S (2b), M (2c).

### AXE 3 — Des antagonistes présents (voix du mal en milieu de campagne)

*Voldemort ne parle jamais. Bellatrix et Dolohov n'ont ni monologue, ni entrée
Codex. Les Mangemorts, pourtant « fidèles organisés » (06:253-269), n'ont
ni chef nommé ni plan.*

- **3a · Promotion de boss pour les boss canon** : étendre `BOSS_PROMO_BEATS`
  (`battle.js:274-300`) à Bellatrix, Dolohov, Greyback, Aragog, Voldemort
  Affaibli et Voldemort Ressuscité. Chacun reçoit 2 à 3 pages d'entrée et une
  ligne de chute. Voldemort reste une **corruption résiduelle** (02:175) : il
  parle *à travers* la fêlure, ce n'est pas un retour politique.
- **3b · Murmures de la fêlure** : de rares chuchotements de Voldemort, à
  l'entrée des étages 5, 6 et 8. On réutilise le canal `floor-events` ou
  `floor-ambiance` avec une chance faible et le one-shot. Ils répondent à
  l'état du joueur : Maison, Pacte, héros présent. ⚠️ La revue de juillet a
  **rejeté** des `floorLines` 2/3/5/6 génériques (« diluerait les
  one-shots »). Ici, la proposition est différente : une **voix unique
  identifiée**, rare, conditionnelle. À valider (question Q2).
- **3c · Boss garantis par acte** : aujourd'hui, aucun boss n'est garanti avant
  l'étage 10 (`dungeon-spawning.js:201`). Proposition : **un boss d'acte
  garanti** aux étages 6 et 8, en plus des tirages. Par exemple, l'Ombre de
  Quirrell à la fin de l'Acte II (étage 6), Bellatrix ou Greyback en ouverture
  de l'Acte III (étage 8). Ces combats sont posés comme le spawn de Voldemort
  et précédés de la promotion 3a. Ils donnent un **rythme d'actes** lisible.
  ⚠️ Le nerf des boss 8-11 a été refusé : il faut simuler le mur solo, et
  garder un boss choisi dans la tranche basse de difficulté.

Impact **fort** · effort M (3a : rédaction et voix ; 3c : spawn et
simulation).

### AXE 4 — Des choix qui comptent, pour tous (verbe `choice`)

*Le verbe `choice` est ouvert depuis juillet (C1). Le Pacte des Cachots
prouve que le modèle fonctionne, mais il n'est jouable qu'en Serpentard.*

Proposition : un **type d'objectif `choice`**. À la remise de la quête, 2
boutons s'affichent. Chaque option donne une récompense **différente mais
équivalente**, pose un flag dérivé, et ajoute une ligne de dialogue ou une
ligne de fin. **Jamais de branche, jamais de gate**, conformément à 03:241,
14:227 et à l'équité entre Maisons.

Principes :
- Ouvert à toutes les Maisons.
- Au plus **4 à 6 dilemmes** dans toute la campagne, pour que chacun pèse.
- Chaque dilemme laisse une **trace visible plus tard** : un PNJ s'en
  souvient, une ligne de fin, une note Codex. Sans trace, le choix est
  cosmétique et le joueur le sent.
- **Réutiliser** le mécanisme de `npcReputationFor` (`quests.js:157-169`)
  plutôt que de créer un système de réputation neuf (06:583-586 : sobriété
  des variables).

Les dilemmes concrets sont intégrés aux arcs secondaires ci-dessous (H1, H3,
H4, H5, H7), pour qu'ils aient un contexte narratif. Un choix posé hors de
tout contexte n'a pas de poids.

Impact **fort** · effort M (verbe générique + UI à 2 boutons, puis chaque
dilemme = données).

### AXE 5 — Histoires secondaires complémentaires ⭐ (cœur de la demande)

Toutes respectent les contraintes de 02, 03, 05 et 08 :
- optionnelles, sans aucun blocage de `goDeeper()` ;
- elles prolongent le canon dans ses marges, sans résurrection et sans horreur
  graphique ;
- elles sont écrites en pages de 2 à 4 phrases, au « tu » ;
- leurs variantes sont des flags ou du texte.

Elles s'appuient sur des **pistes dormantes** déjà semées dans le code ou la
bible, pour que le jeu paraisse avoir toujours été pensé ainsi.

| # | Arc | Piste dormante exploitée | Étages | Mécaniques réutilisées | Payoff | Effort |
|---|---|---|---|---|---|---|
| **H1** | **« Le Prix de Rogue »**. Les `idleRandom` de Rogue évoquent « une erreur dont le prix ne cesse d'augmenter » (`npcs-a.js:866-868`), sans aucune suite. On découvre qu'une potion de scellement brassée jadis par Rogue a *nourri* la fêlure. Il demande qu'on récupère 3 réactifs corrompus (ét. 4 → 7 → 10). **Dilemme** : lui rendre la fiole pour qu'il répare lui-même son erreur, ou la confier à Dumbledore pour qu'il la détruise. | `npcs-a.js:866` | 4, 7, 10 | `item`, `talk`, `choice`, relais de Dumbledore | Réplique de Rogue à la victoire, Codex « Le Prince et la fêlure » ; variante si Drago est dans le groupe | M |
| **H2** | **« La Prophétie en éclats »**. Trelawney (errante, `npcs-b.js:276`, sans quête) prononce une prophétie en transe qu'elle oublie aussitôt. Ses fragments sont gravés sur des stèles d'énigme aux étages 3, 6 et 9, et la prophétie reconstituée **parle du Dormeur** (pont vers l'Acte IV). Si Céleste est dans le groupe, Trelawney la reconnaît : l'écho documenté en 06:171 prend enfin corps. | Trelawney, Céleste (05:270) | 3, 6, 9 | `riddle` (stèle), Codex, `dialoguesByHero` | Codex « Prophétie des Profondeurs » ; teaser lisible du Dormeur | S-M |
| **H3** | **« Le Carnet du Lieutenant »**. Donne aux Mangemorts un **chef intermédiaire nommé** (personnage original) qui exploite la fêlure pour ramener son maître. Ses lettres se trouvent en fouillant les étages 4 à 8 (objectif `search`) et dévoilent son plan. Il culmine en **boss d'acte garanti à l'étage 8** (axe 3c). Il lâche ou désigne la cache des **grimoires ténébreux orphelins** (Lot 0.1). **Dilemme** : brûler les grimoires (Codex, bonus Maison) ou les garder (livres appris, plus une ligne de Kingsley méfiant, via la réputation). | Mangemorts « fidèles organisés » sans chef (06:253-269) ; 6 livres orphelins | 4-8 | `search`, `choice`, `spawnOnAccept`, `npcReputationFor` | Donne un antagoniste à l'Acte II ; source d'obtention narrative des 6 livres | M |
| **H4** | **« Les Égarés »**. Deux premières années sont descendus par curiosité quand la Clé s'est fendue. On les retrouve aux étages 3 et 6, et on les guide jusqu'à un **refuge** qu'on rétablit (la cellule `CELL.REFUGE` existe déjà via les Poches du Sceau). C'est l'escorte documentée mais jamais livrée (06:524, 08:496) ; la signature Poufsouffle l'avait remplacée par des kills (`quests-templates.js:1300`). **Variante Poufsouffle** : l'escorte devient la vraie signature. | Escorte promise (06:524, 08:496) | 3, 6 (refuge à 5) | Nouveau verbe léger `escort` (PNJ suiveur de 1 case, ou simple flag « trouvé puis ramené ») | Les égarés réapparaissent dans la Grande Salle post-victoire (`GRANDE_SALLE_BEAT`) ; Codex | M |
| **H5** | **« La Chaussette »** (clin d'œil à Dobby). Proposition déjà rédigée mais jamais livrée (`_archive/free-house-elf-easter-egg.md`, 08:301-303). On la **transforme en dilemme** : un `elfe_rebelle` n'est pas hostile, il est *lié* à un Mangemort (celui de H3). On peut le combattre, ou lui tendre un vêtement trouvé dans un coffre. S'il est libéré, il réapparaît aux étages 10 et 20 comme aide ponctuelle (soin, ou ouverture d'un raccourci une fois). | `free-house-elf-easter-egg.md` ; `elfe_rebelle` | 5-8, 10, 20 | `choice`, `specialAction`, PNJ errant | Moment d'émotion canon ; se relie à H3 | S-M |
| **H6** | **« La Chronique de la Garde de l'Aube »**. Les héros originaux ont une faction documentée (05:241-250, 06:216-237) qui n'est **nommée nulle part en jeu**. Quatre pages de la chronique de la Garde, dispersées en Acte III, racontent pourquoi ces sorciers connaissaient la fêlure *avant* Dumbledore. Chaque page a un texte propre si le héros de la Garde correspondant est présent. Le dernier chapitre mène au **Reliquaire Lunaire** (légendaire orphelin, Lot 0.1). | Garde de l'Aube (05, 06) ; contradiction 0.3 | 7-10 | `item` (pages), `dialoguesByHero`, Codex | Donne un sens aux héros originaux ; source narrative du Reliquaire | M |
| **H7** | **« L'Œuf des Profondeurs »**. Hagrid n'a que des quêtes kill/fetch. On trouve à l'étage 7 un œuf de Magyar, dont le parent est le **Magyar Ancestral** de l'étage 10 (déjà implémenté). **Dilemme** : le confier à Hagrid (qui veut l'élever) ou à Scamander (qui veut le rendre à sa lignée sauvage). Si le joueur le rend, le Magyar Ancestral rencontré ensuite a une réplique de promotion différente et peut rompre le combat (fuite honorable, butin réduit, XP intégrale). | Hagrid et Scamander sans arc ; Magyar Ancestral | 7, 10 | `item`, `choice`, promotion de boss (3a) | La conséquence d'un choix **ressentie en combat** : la trace la plus forte du jeu | M |
| **H8** | **« Lettres de la surface »**. L'école vivante n'est **jamais montrée** pendant la descente. À chaque entrée d'Acte, un hibou apporte une lettre de McGonagall ou d'un élève resté en haut. Elle **reflète ce que le joueur a fait** : quêtes remises, égarés sauvés (H4), Pacte, points de Maison. Les enjeux deviennent concrets : ce qu'on protège est là-haut. | Faction « professeurs qui tiennent le haut » ; 02 (le château, « un lieu qu'on aime ») | 4, 7, 10, 11 | Toast ou modale de lecture au changement de tranche (`_maybePlayTierTransition`) | Rythme d'actes, et l'émotion en contrepoint (02:138-145) | S |
| **H9** | **« Les Rêves du Dormeur »** (Acte IV). Le Dormeur est le lore le plus fort du jeu, mais il n'est **jamais rencontré**, et le canon interdit de le combattre (rejet explicite). Proposition : lors d'un **repos** (`rest()`) en Boucle, il y a une chance de faire un rêve partagé, soit une courte scène qui révèle 1 fragment. 10 fragments à collectionner, plus un Codex « Ce que le Dormeur rêve ». Le **dernier rêve** change le texte du jalon IV de Briser le Cycle. | A5 (`game-evolution-review`) ; interdiction de combat | 11+ | `rest()`, Codex, Éclats | Donne du sens au repos et au grind de Boucle, sans violer le canon | S-M |
| **H10** | **« Ceux qui se souviennent »** (Boucle). Un PNJ original, archiviste des boucles, **se souvient des boucles précédentes du joueur** : il cite l'étage le plus profond atteint, les boss vaincus, le Pacte, le choix Briser ou Perpétuer d'une partie antérieure (via le profil persistant, en lecture seule). C'est de la méta-narration, cohérente avec le thème du cycle, sans aucun avantage hérité. | `profile.js` (profil hors-save) ; thème du cycle | 11, 21 | `getPlayerProfile()`, dialogue | Rejouabilité émotionnelle ; NG+ enrichi narrativement | S |

**Recommandation** : commencer par **H8 + H2 + H3**. Ensemble, ils couvrent
les trois Actes pré-victoire, donnent au milieu de campagne un fil
antagoniste (H3) et un fil de mystère (H2), et H8 est très bon marché.
Ensuite **H7 et H1**, les dilemmes les plus forts. **H9 et H10** reviennent
à l'endgame, en complément du Lot 5 « Cycles du Dormeur » encore ouvert.

### AXE 6 — La texture du pas-à-pas (anti-répétition)

*La topologie est identique à chaque étage (7 salles, arbre, `dungeon.js:266`),
avec 16 phrases d'ambiance et 12 énigmes pour tout le jeu.*

- **6a · Volume de texte bon marché** (données seulement) :
  - `room-flavor` : de 16 à ~64 phrases (4 zones × 16) ;
  - énigmes : de 12 à ~30, dont quelques-unes conditionnées au héros ;
  - événements d'étage pré-victoire : de 6 à ~12, en visant les **étages 5, 7 et
    8**, les plus pauvres (1-2 PNJ, 5-6 quêtes, aucune salle unique).
- **6b · Archétypes de salles** : C2, ouvert depuis juillet (embuscade,
  sanctuaire, galerie). On le **reprend tel quel**, sans le re-spécifier ici.
- **6c · Salle unique par étage « pauvre »** : une salle fixe signée pour
  chacun des étages 1, 5, 7 et 8. Par exemple :
  - 5 : la Volière effondrée (hiboux de H8) ;
  - 7 : le Lac souterrain ;
  - 8 : la Salle des Trophées corrompue, qui rappelle les exploits du joueur.

  On réutilise le mécanisme des cellules spéciales et `_showExploreOverlay`.

Impact moyen-fort · effort S (6a) à M (6b, 6c).

### AXE 7 — Identité mécanique des héros

*Les 16 héros apprennent les mêmes sorts. Aucune condition sur `heroKey` en
combat, hormis le nom du Patronus.*

Le chantier lourd existe déjà : **Lot 4 « L'Éveil du Sorcier »**
(`revue-design-progression-2026-07.md` §6), avec son arbre et ses 5
archétypes. Il est ouvert et n'a encore aucun code. On ne le re-propose pas.

**Alternative légère**, si l'arbre reste en attente : **1 trait passif par
héros** (16 lignes de données, lues dans `recalculateStats` ou dans un hook
de combat existant), et **1 sort de départ exclusif** par héros. Par
exemple :
- Iris : « Espoir partagé », petit soin de groupe quand un allié tombe ;
- Maxence : « Soif maîtrisée », drain majoré mais DEF réduite ;
- Céleste : « Présage », la première attaque ennemie de chaque combat est
  annoncée et esquivée.

⚠️ C'est incompatible avec l'arbre s'il est livré ensuite : il faut
**choisir** (question Q4).

### AXE 8 — Valider par le jeu réel (préalable transverse)

**Aucun playtest humain n'a jamais été exécuté**
(`docs/playtest-3-boucles.md:136`, `revue-sources…:131`). Tout
l'équilibrage, tous les « murs » (ét. 10-11 : 38 % en solo ; ét. 20→21 :
62→27 %) et toutes les hypothèses de lassitude sont **simulés ou déduits**.

Proposition : avant tout gros chantier de contenu, mener **1 session de
playtest de la campagne 1-10** (grille : moments d'ennui, compréhension des
systèmes, émotion ressentie, étages sans souvenir), puis le protocole existant
des 3 boucles. C'est le seul moyen de hiérarchiser *vraiment* les axes 1 à 7.

### Pour mémoire — déjà ouverts ailleurs (non re-proposés)

Ces chantiers restent pertinents et sont suivis dans leurs plans :
- défi quotidien seedé (D1) ;
- découvrabilité du multijoueur (D2) ;
- onboarding de l'endgame (D4) ;
- tips contextuels ;
- Traques Rituelles (Lot 3) ;
- Cycles du Dormeur et marche de difficulté 20→21 (Lot 5) ;
- Éveil d'artefact (2.5b) ;
- intervention de Sirius au climax (1.4, en attente de validation) ;
- forge légendaire liée aux Maisons (reliquat 1.3).

---

## Priorisation proposée

| Lot | Contenu | Impact | Effort | Dépend de |
|---|---|---|---|---|
| **0** | Corrections 0.1 à 0.6 (objets orphelins en solution minimale, libellés de lieu, factions, docs, Rogue) | Moyen | **S** | Q3 |
| **A** | **Réactivité** : 1a (dialogues par héros, liens canon), 1b (Codex des héros), 1c (payoff de fin par héros), 2a (répliques de paire, 8-10 paires) | **Fort** | S-M (données) | — |
| **B** | **Antagonistes et rythme d'actes** : 3a (promotion des boss canon), 3c (boss d'acte aux ét. 6 et 8, avec simulation), H8 (lettres de la surface) | **Fort** | M | sim |
| **C** | **Verbe `choice`**, puis arcs **H3** (Carnet du Lieutenant, qui résout 0.1 narrativement), **H2** (Prophétie) | **Fort** | M | Lot B pour H3 |
| **D** | Arcs **H7** (Œuf), **H1** (Rogue), **H5** (Chaussette), **H4** (Égarés) | Fort | M | Lot C (`choice`) |
| **E** | Endgame narratif : **H9** (Rêves), **H10** (Archiviste), **H6** (Garde de l'Aube) | Moyen-fort | S-M | Q3 pour H6 |
| **F** | Texture : 6a (volume de texte), 6c (salles uniques 1/5/7/8) ; 6b via C2 | Moyen | S-M | — |
| **G** | 2b (Complicité), 2c (technique de duo), axe 7 (traits de héros) | Moyen | M | Q4, sim |
| **∥** | **Playtest humain** de la campagne 1-10 (axe 8) | Critique pour arbitrer | S (humain) | — |

Séquencement conseillé : **0 → A → B → C**, avec le playtest **en parallèle
dès maintenant**. Les lots A et B transforment le plus la sensation de jeu
pour le moins de code. Le lot C ouvre la porte à tous les dilemmes.

## Invariants à respecter (rappel pour chaque plan dérivé)

- Aucune quête ne bloque `goDeeper()`. La descente reste la seule colonne
  obligatoire.
- Variantes = flags ou texte. **Jamais de branche, jamais de fin
  alternative** (03:241, 14:227).
- **Aucun avantage hérité** d'une partie à l'autre : le profil ne sert qu'au
  cosmétique et à la narration (H10, 2b).
- **Équité stricte entre Maisons.** Tout dilemme est ouvert à toutes les
  Maisons.
- Canon : pas de résurrection, Voldemort reste une corruption résiduelle, le
  Dormeur n'est jamais combattu, les personnages canon restent fidèles à
  leur caractère (02:115-119, 02:175-178).
- Ton gradué par Acte, horreur suggérée, pages de 2 à 4 phrases, narration
  au « tu ».
- Isolation entre la Boucle et les Mondes Parallèles (11 §11.5.1).
- Chaque lot : plan dédié, puis smoke, puis `cache-bump`, puis vérification
  de l'état de la PR (guidelines §5 à §8). Tout ce qui touche au combat ou au
  spawn passe par `tools/sim-difficulty.js`.

## Questions ouvertes (arbitrage utilisateur)

- **Q1** — Quels lots ouvrir en premier ? Recommandation : 0 → A → B.
- **Q2** — Les « murmures de la fêlure » (3b) sont-ils acceptables, compte
  tenu du rejet passé des `floorLines` génériques ? Ou faut-il garder
  Voldemort muet jusqu'à l'étage 9 ?
- **Q3** — Faction des héros originaux : « Garde de l'Aube » pour tous (comme
  dans la bible), ou deux factions (« Cercle des Astres » plus « Garde de
  l'Aube », comme dans l'UI) ? Cela conditionne 0.3 et H6.
- **Q4** — Identité mécanique des héros : attendre l'arbre « Éveil du
  Sorcier » (Lot 4), ou livrer les traits légers de l'axe 7 ? Les deux ne
  doivent pas coexister.
- **Q5** — Époque : Rogue est vivant alors que Dumbledore n'existe qu'en
  portrait (02:42-44, « ~20 ans après la Bataille », jamais fixé). Faut-il
  trancher avant d'écrire H1, qui met Rogue au centre ?
- **Q6** — Voix : les nouveaux textes (promotions de boss, lettres, répliques
  de paire) doivent-ils être doublés (samples OGG), ou rester écrits, avec la
  synthèse vocale en repli ?

## Arbitrages reçus (2026-09-29)

- **Q1** — « Go correction » : **Lot 0 lancé** →
  [`lot0-corrections-revue-2026-09.md`](./lot0-corrections-revue-2026-09.md).
- **Q2** — Murmures de Voldemort : ✅ **acceptés** (« pourquoi pas avoir des
  répliques ») — à intégrer au Lot B (axe 3b).
- **Q3** — Factions laissées à mon choix : **deux factions conservées**
  telles qu'en jeu (Cercle des Astres ×7, Garde de l'Aube ×4) ; la bible
  s'aligne (Lot 0.3). H6 porte donc sur la **Garde de l'Aube (4 héros)** ;
  un arc symétrique du Cercle des Astres pourra s'appuyer sur H2 (Prophétie :
  « ceux qui ont lu les signes »).
- **Q4** — ✅ **arbre « Éveil du Sorcier »** retenu (Lot 4 de
  `revue-design-progression-2026-07.md`) → les traits légers de l'axe 7 sont
  **abandonnés**.
- **Q5** — ✅ laissée à mon choix (2026-09-30) : **uchronie de 1996-1997,
  « l'Année de la Fêlure »** (6ᵉ année de Harry). Un seul point de divergence :
  au cimetière, en juin 1995, le rituel est interrompu (Cedric survit,
  Voldemort reste sans corps) ; Dumbledore meurt à l'été 1996 (bague des
  Gaunt). Rogue reste donc vivant et en poste : H1 est débloqué. Plan
  `epoque-du-jeu-2026-09.md`, bible 02 §2.1 et 12 §12.9.
- **Q6** — sans réponse à ce stade.

## Journal

- **2026-09-29** — Revue créée à partir de 3 audits parallèles (plans
  existants, bible comparée au code, audit quantitatif). Constats 0.1 et 0.2
  re-vérifiés à la main. Aucun code touché. En attente d'arbitrage (Q1 à Q6).
- **2026-09-29** — Arbitrages Q1-Q4 reçus ; Lot 0 implémenté (plan dédié).
- **2026-09-30** — Lot A livré (PR #751, fusionnée). Lot B implémenté
  (plan `lotB-antagonistes-rythme-2026-09.md`) : 3a, 3b, 3c (Quirrell ét. 6,
  Greyback seul ét. 8, simulés), H8.
- **2026-09-30** — Lot B livré (PR #752, fusionnée). Lot C implémenté
  (plan `lotC-choix-carnet-prophetie-2026-09.md`) : verbe `choice`, H3, H2.
- **2026-09-30** — Lot D livré en PR #754 (brouillon, non fusionnée). Lot E
  implémenté sur la même branche (plan `lotE-endgame-narratif-2026-09.md`) :
  H9 (Rêves du Dormeur), H10 (Archiviste des boucles), H6 (Chronique de la
  Garde de l'Aube → Reliquaire Lunaire).
- **2026-09-30** — Lot F implémenté sur la même branche (plan
  `lotF-texture-2026-09.md`) : 6a (64 phrases d'ambiance, 30 énigmes filtrées
  par étage/héros, 16 événements d'étage avec `kind`) et 6c (salles uniques
  des étages 1, 5, 7, 8). 6b reste au plan C2.
- 2026-09-30 — **Lot G** (2b Complicité, 2c technique de duo) livré, cf.
  [`lotG-duo-2026-09.md`](./lotG-duo-2026-09.md). Axe 7 abandonné (Q4).
- 2026-09-30 — Lot G fusionné (PR #755). **6b** (archétypes de salles, C2)
  livré, cf. [`lot6b-archetypes-salles-2026-09.md`](./lot6b-archetypes-salles-2026-09.md).
  Tous les axes de la revue sont traités ; restent le playtest humain et Q6.

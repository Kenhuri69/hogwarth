# 14 — Scénarios de fin & post-game

**Statut :** 🟩 proposition de référence — finalisée, à valider / amender

> ✅ **Statut réel (code, 2026-06-13)** : le socle des fins est **livré** —
> fin « normale » + cinématique (`js/endgame.js`, `js/cinematics.js`), **vraie
> fin « Briser le Cycle »** (`js/break-cycle.js`, flag `cycleBroken`), écran de
> permadeath Ironman. Les **5 axes de variantes conditionnelles (B)** du discours
> de victoire sont désormais **codés** (`_victorySpeechVariants`, `js/endgame.js`,
> testés `tests/units.js`) : (a) Maison, (b) héros choisis & solo/duo, (c) quêtes
> Signature, (d) Éclats, (e) choix moral du Pacte (`pact`/`defiance`). Tout est
> du **texte** sur la même cinématique — aucune branche d'arc.
> Voir `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` §1.2.

> Objectif : faire du Chapitre 14 la **clôture** de la spécification narrative —
> dire comment l'aventure *finit*, ce qui *reste* après la victoire, et comment
> chaque choix (Maison, héros, quêtes signature, Éclats, choix moraux) **colore
> la fin sans jamais brancher l'arc en deux**. Le chapitre cadre aussi la **vraie
> fin** (briser le Cycle) et la rejouabilité de prestige.
>
> Conventions : `✅` = **acté dans le jeu** (code vérifié) ; `💡` = **proposition
> narrative** modifiable ; `❓` = **point à valider**. On distingue le **lore**
> (fiction) des **systèmes** (mécaniques).
>
> ⚠️ **Garde-fou cardinal de tout le chapitre** (repris de
> [03 §3.6](03-trame-principale.md) et [04 §4.7](04-structure-actes-et-etages.md)) :
> le jeu est une **fin ouverte**. Il n'existe **pas de fin scénarisée qui ferme la
> partie** ni de branche d'arc. Toutes les « fins conditionnelles » décrites ici
> sont des **couches de texte / cosmétique** posées sur la **même** cinématique de
> victoire et la **même** Boucle ; aucune ne gate l'escalier, aucune ne modifie la
> structure A→B→C→D.
>
> Renvois : trame → [03](03-trame-principale.md) · actes & étages →
> [04](04-structure-actes-et-etages.md) · Maisons → [07](07-les-maisons.md) ·
> quêtes signature & **fil rouge Éclats** → [08 §8.5/§8.6](08-quetes-et-sous-intrigues.md) ·
> Boucle & Mondes Parallèles → [11](11-mondes-paralleles.md) · **Codex** →
> [12](12-glossaire-et-codex.md) · équilibre & post-victoire →
> [13 §13.2.3/§13.3.5](13-equilibre-difficulte-progression.md).

---

# ÉTAPE 1 — Contenu narratif

## 14.0 Cadre — ce qui existe déjà (✅ dans le jeu)

Le Chapitre 14 **ne part pas de zéro** : la fin de l'Acte III, le post-game et
même une **vraie fin optionnelle** sont déjà codés. Ce chapitre les **unifie**,
les met en mots, et propose les couches émotionnelles qui manquent.

| Brique | ✅ Statut de jeu | Fichier |
|--------|-----------------|---------|
| **Cinématique de victoire** | `checkVictoryTrigger('voldemort_revenu')` → `victoryAchieved`, modale `#victory-modal` | `js/endgame.js` |
| **Variante conditionnelle** | ✅ **une seule** existe : ton froid de Dumbledore si `slythPactChoice === 'pact'` | `js/endgame.js` |
| **Boucle Ténébreuse** | descente continue **infinie** (`effectiveFloor`, recyclage, paliers ★ N, gold-sink) | `dungeon-scaling.js`, `movement-floors.js`, `state.js` |
| **Compteur de prestige** | `accumulatedEclats` (+1 / nouvel étage de Boucle le plus profond), `loopNumber` dérivé | `state.js`, `movement-floors.js` |
| **Vraie fin — Briser le Cycle** | quête secrète **non-gating** 4 jalons, boss-miroir `reflet_mythe`, flag `cycleBroken` | `js/break-cycle.js` |
| **Entrées Codex de fin** | `porteur_eclats`, `echo_signature`, `boucle_tenebreuse`, `briser_cycle`, `cycle_brise`, `voix_*`… | `js/codex.js` |
| **Échec / permadeath** | Ironman → `showIronmanResult()` + Hall of Fame | `js/ironman.js`, `js/hall-of-fame.js` |

> 💡 **Thèse du chapitre.** *Le jeu n'a pas de « game over » de victoire — il a un
> changement de posture.* Vaincre Voldemort ne **ferme** pas le château : ça
> l'**ouvre**. La « fin » n'est donc pas un mur, c'est un **seuil** — et la vraie
> fin (briser le Cycle) n'est pas une porte de sortie, c'est une **paix** qu'on
> emporte en redescendant. Toute la richesse de fin demandée par la tâche se
> construit **par-dessus** ce socle, jamais contre lui.

---

## 14.1 Introduction aux fins du jeu

### 14.1.1 Trois registres (et deux « non-fins »)

Le jeu connaît **trois registres de fin** — qui sont des **postures**, pas des
écrans terminaux — plus **deux issues d'échec ou d'arrêt**.

| Registre | Nature | Déclencheur | Ferme la partie ? |
|----------|--------|-------------|-------------------|
| **A. Fin « normale »** (Acte III) | ✅ Cinématique de victoire | Vaincre `voldemort_revenu` (ét. 10) | **Non** — ouvre la Boucle |
| **B. Fins conditionnelles** | 💡 Variantes de **texte** de la cinématique A | Flags de contexte (Maison, héros, signatures, Éclats, choix moraux) | **Non** — même écran, autre épilogue |
| **C. Vraie fin** — *Briser le Cycle* | ✅ Cinématique 3 pages + flag `cycleBroken` | 4 jalons en Boucle (voir §14.5) | **Non** — la Boucle reste ouverte |
| *D. Non-fin — Renoncement* | 💡 Lecture narrative | Le joueur **arrête** de descendre / choisit *Perpétuer* | — (état de jeu, pas d'écran) |
| *E. Échec — Permadeath* | ✅ Écran de résultat Ironman | Mort en mode Ironman | **Oui** (mode Ironman uniquement) |

> ✅ **Point dur.** A et C **existent et coexistent** dans le code. B est une
> **enrichissement de A par le texte** (la seule variante B déjà codée est le ton
> froid `slythPactChoice`). D et E ne sont **pas** des écrans de « fin » au sens
> classique : E est le seul vrai *game over* du jeu, et il est **réservé à
> Ironman**.

### 14.1.2 Différence « fin normale » / « fins conditionnelles » / « vraie fin »

- **Fin normale (A).** L'arc principal se **scelle** : Voldemort tombe, Dumbledore
  parle, l'escalier le plus profond s'ouvre. C'est la **conclusion garantie** de
  toute partie qui atteint l'étage 10 et gagne. Elle est **identique en structure**
  quel que soit le parcours.
- **Fins conditionnelles (B).** *La même cinématique, mais le château se souvient
  de toi.* Selon `chosenHouse`, les héros choisis, les quêtes signature terminées,
  le nombre d'Éclats remis et les choix moraux, **le texte du discours et
  l'épilogue changent** — un paragraphe en plus, une réplique colorée, un nom
  prononcé. **Jamais** une issue différente : Voldemort tombe dans tous les cas.
- **Vraie fin (C).** *Briser le Cycle.* Réservée au **post-game profond** (Boucle),
  très exigeante (voir §14.5), elle offre la **seule vraie résolution thématique** :
  resceller la faille *par le bas*, en y laissant une part de soi. Elle ne donne
  ni récompense de stat ni gate — elle donne du **sens** (et une entrée Codex
  `cycle_brise` ✅).

> 💡 **Pourquoi cette hiérarchie marche.** A satisfait le joueur qui veut « finir
> Voldemort ». B récompense le joueur qui s'est *investi* (Maison, quêtes) sans
> punir celui qui a foncé. C récompense le joueur de prestige qui *cherche encore
> du sens* dans la Boucle. Trois publics, **un seul tronc**, zéro frustration de
> « mauvaise fin ».

---

## 14.2 Fins de l'Acte III — la chute de Voldemort

### 14.2.1 La fin par défaut (✅ dans le jeu)

Au fond des Profondeurs (étage 10), `voldemort_revenu` tombe → la modale
`#victory-modal` s'affiche (`showVictoryScreen`), **non bloquante**.

✅ **Texte de la cinématique** (vérifié dans `js/endgame.js`) :

- **Titre** : « **L'Ombre s'efface** »
- **Sous-titre** : « Vous avez vaincu Lord Voldemort. »
- **Récap** : étage atteint · niveau du groupe · créatures vaincues · Maison +
  points · temps de session.
- **Discours de Dumbledore** :
  > *« Vous avez fait ce que même les plus grands sorciers n'auraient osé tenter.
  > La nuit la plus sombre cède, enfin, devant votre courage. Le château ne sera
  > plus jamais le même — mais quelques ombres rôdent encore, plus profondément,
  > là où la magie est plus ancienne. **L'escalier le plus profond, scellé par la
  > peur, s'ouvre enfin.** »*
  > — Albus Dumbledore
- **Boutons** : « Continuer l'aventure » (`closeVictoryScreen`) · « Retour au menu »
  (`returnToMenuFromVictory`).
- **Effets** : ✅ sting `AudioSystem.playVictory()` (idempotent) + ✅ flourish doré
  `CIN_safe.victoryFlourish()` (no-op sous *reduced-motion*).

> ✅ **Conséquences mécaniques immédiates** : `victoryAchieved` passe à `true` (gate
> unique de la Boucle) ; les textures **Ténèbres** sont réarmées
> (`_invalidatePatternCache` + `drawDungeon`) ; autosave dédiée raison `victory` ;
> à la fermeture, message « Le château recèle encore des mystères… ».

### 14.2.2 Fins conditionnelles — variantes de la cinématique (💡 sauf mention)

> 💡 **Principe.** On **n'ajoute pas d'écran** : on **enrichit le discours et
> l'épilogue** de la modale `#victory-modal` selon des flags **déjà présents** dans
> l'état. Une variante = **un paragraphe ou une réplique** injectée, comme la
> variante `slythPactChoice` le fait déjà (✅). Tout est défensif : flag absent →
> texte de base.

#### (a) Selon la **Maison** (`chosenHouse`) — 💡

Le **dernier mot** de Dumbledore prend la couleur de la Maison du héros (registre :
ce que la Maison a *appris* au joueur, écho à [07](07-les-maisons.md)).

| Maison | 💡 Réplique de clôture (proposée) |
|--------|------------------------------------|
| 🦁 Gryffondor | *« Tu n'as pas vaincu parce que tu n'avais pas peur — mais parce que tu as descendu *avec* ta peur. C'est tout Godric, cela. »* |
| 🐍 Serpentard | *« Tu as su quand frapper, et quand attendre. Salazar lui-même n'aurait pu mieux choisir son heure — veille à ce que ce soit toujours *toi* qui choisisses. »* |
| 🦅 Serdaigle | *« Tu as compris avant de combattre. Rowena disait : *« la connaissance est l'arme qu'on ne perd jamais. »* Tu viens de le prouver au plus profond. »* |
| 🦡 Poufsouffle | *« Tu n'as laissé personne derrière, pas même quand descendre seul eût été plus simple. Helga aurait été fière — et l'école, qu'elle a fondée pour tous, te doit la nuit. »* |

#### (b) Selon les **héros choisis** & solo/duo — ✅ (implémenté)

| Contexte | 💡 Variante |
|----------|-------------|
| **Duo** (Harry + Hermione, ou autre paire) | Ligne d'épilogue à **deux voix** : un échange court entre les deux héros sur le palier (cf. barks `tierTransition`, [05](05-personnages-jouables.md)). |
| **Solo** | Ligne plus intime : *« Tu es descendu seul. Le château s'en souviendra. »* |
| **Héros à Maison canon ≠ `chosenHouse`** | Clin d'œil (réutilise la logique `houseTension[<Maison>]` des barks) : le héros note l'ironie d'avoir vaincu sous une bannière qui n'est pas « la sienne ». |

> ✅ **Implémenté** dans `_victorySpeechVariants` (`js/endgame.js`) : un **beat du
> palier** (solo → ligne intime ; duo → échange à deux voix entre les héros) +
> un **clin d'œil** quand la Maison canon d'un héros (`_heroCanonHouse`,
> `hero-barks.js`) diffère de `chosenHouse`. Pur, défensif, testé — pas de nouveau
> canal de barks (la logique de Maison canon est seulement réutilisée).

#### (c) Selon les **quêtes signature** terminées — 💡

Les flags `gryffSignatureDone` / `slythSignatureDone` / `ravenSignatureDone` /
`poufSignatureDone` ([08 §8.5](08-quetes-et-sous-intrigues.md)) ajoutent un
**paragraphe « héritage »** qui **nomme la récompense cérémonielle** obtenue.

| Flag | 💡 Paragraphe ajouté |
|------|----------------------|
| `gryffSignatureDone` | La **Bannière de Godric** est citée : « Ton étendard a tenu jusqu'au fond. » |
| `slythSignatureDone` (+ `slythPactChoice`) | Le **Pacte des Cachots** est évoqué — *avec son revers* (voir choix moraux ci-dessous). |
| `ravenSignatureDone` | Le **Codex de Rowena** : « Tu connaissais ses faiblesses avant de le frapper. » |
| `poufSignatureDone` | Le **Médaillon de Helga** : « Le Refuge a tenu pendant ta descente. » |

#### (d) Selon le nombre d'**Éclats** collectés — 💡 (s'appuie sur ✅)

✅ Le fil rouge des **Éclats de la Clé de Voûte** (`eclats_clef_voute`, ×3
`eclat_voute`) existe. 💡 Si les **3 Éclats** ont été remis avant le climax, la
cinématique gagne un **paragraphe de révélation** : Dumbledore confirme que *« le
verrou retenait deux choses, pas une »* (la corruption pré-Poudlard **et** le
résidu de Voldemort) — le joueur comprend *pourquoi* la victoire **ouvre** au lieu
de fermer. **C'est le pont narratif vers la Boucle.**

| Éclats remis | 💡 Effet sur la cinématique |
|--------------|------------------------------|
| 0–2 | Texte de base (le joueur découvrira la vérité dans la Boucle). |
| 3 (fil rouge complet) | Paragraphe de révélation : la victoire **ne suffit pas** — un préavis lucide qui *prépare* émotionnellement la Boucle. |

#### (e) Selon les **choix moraux majeurs** — ✅ (Pacte) + 💡

| Choix | 💡/✅ | Effet |
|-------|------|-------|
| `slythPactChoice === 'pact'` | ✅ **codé** | Ton **froid** : Dumbledore met en garde — *« Veille à rester celui qui parle, et non celui à qui l'on parle. »* |
| `slythPactChoice === 'defiance'` | 💡 | Ton de **reconnaissance** : avoir refusé le pacte est salué (« Tu as tenu tête à une voix vieille de mille ans »). |
| 💡 Autres choix moraux | 💡 | Réservé si de nouveaux choix scénarisés sont ajoutés (ex. épargner un PNJ, voir [06](06-pnj-et-factions.md)) — **non présents** aujourd'hui. |

### 14.2.3 Garde-fou — un flag/texte, jamais une branche

> ✅ **Réaffirmation** (03 §3.8, 04 §4.2) : le **levier de signature au climax** est
> déjà un **flag**, pas une fin alternative — il module le combat (one-shot) et,
> ici, le **texte** de la cinématique. **Voldemort tombe dans 100 % des parties
> gagnées.** Aucune variante B ne crée de « mauvaise fin » : elles **récompensent**,
> jamais ne **punissent**. La seule vraie issue d'échec reste la permadeath Ironman
> (§14.4.1, registre E).

---

## 14.3 Post-game immédiat — l'instant d'après

> 💡 (proposition de mise en scène, sur base ✅)

### 14.3.1 Ce qui se passe à la fermeture de la cinématique (✅)

À « Continuer l'aventure » (`closeVictoryScreen`) :

- ✅ Message d'ambiance : « **Le château recèle encore des mystères…** »
- ✅ `victoryAchieved` est désormais `true` → l'**escalier de l'étage 10 se
  descelle** (il était scellé sans victoire — 04 §4.7) ; on peut **descendre vers
  11+**.
- ✅ Les **textures Ténèbres** sont réarmées : dès l'étage 11, le décor bascule
  (override `rune_*` post-victoire — voir [04](04-structure-actes-et-etages.md),
  `renderer.js`).
- ✅ **Autosave** raison `victory` (la victoire est un point de non-régression).

### 14.3.2 Réactions des PNJ & état de Poudlard — ✅

> ✅ **Beats émotionnels** (cosmétiques, non bloquants) — implémentés :

- ✅ **Retour des PNJ profonds en ton « après »** : Kingsley, Bill, Sirius — déjà
  recyclés en Boucle ([04 §4.2](04-structure-actes-et-etages.md), `effectiveFloor`)
  — portent une **ligne de dialogue post-victoire** (`victoryAchieved`), moins
  martiale, plus grave, *« Tu es redescendu. Pourquoi ? »* (`postVictoryLines`
  dans `npcs.js`). Suffixe muet appendu en fin de dialogue par
  `_postVictorySuffixPages` (`npc-dialog.js`), résolu par le helper pur
  `pickPostVictoryLine`. **Mutuellement exclusif** avec `darkLoopLines` : la
  variante « après » ne se lit qu'aux étages de surface (< 18, où ces PNJ
  réapparaissent post-victoire) ; en Boucle profonde (18-20) `darkLoopLines`
  prend le relais. Couvert par `tests/units.js` + `tests/scenarios/npc.js`.
- ✅ **Extension P2-ext aux vendeurs recyclés** : le Marchand Clandestin (8/18),
  l'Apothicaire Ténébreux (9/19) et le Forgeron Ténébreux (10/20) portent aussi
  une `postVictoryLines` — registre **mercantile** (≠ « Tu es redescendu.
  Pourquoi ? » des guides) : le négoce qui survit à la guerre, le héros devenu
  *« client qui revient »*. Même gate/complémentarité que les guides
  (surface 8-17 vs `darkLoopLines` ≥ 18).
- ✅ **Le Gardien de la Boucle** (PNJ exclusif post-victoire, étage 11) **est** la
  première voix de l'après : il accueille le héros dans le château rejoué et donne
  les quêtes de purge. C'est lui qui **incarne** la transition vers la Boucle.
  Il porte désormais (P2-ext) une `postVictoryLines` *victoire-spécifique* — son
  greeting parle de la Boucle *générique*, cette ligne ajoute un beat sur le
  triomphe réel sur l'Ombre (« Tu as brisé l'Ombre… et pourtant te voici dans ma
  récurrence »). Toujours post-victoire à l'étage 11, le suffixe s'appose
  systématiquement.
- ✅ **Beat « Grande Salle »** (implémenté) : scène écrite épinglée (étages-scènes,
  04 §4.4) — au **premier retour réel sur l'étage 1** après victoire, un mot de
  Dumbledore depuis son cadre, l'école qui respire à nouveau. **Arbitrage tranché**
  (le jeu ne « remonte » pas tout seul) : le beat se joue uniquement si le héros
  **choisit de remonter** ; ceux qui descendent dans la Boucle gardent le Gardien
  de la Boucle comme première voix de l'après. One-shot cosmétique, non-bloquant —
  `GRANDE_SALLE_BEAT` + variante post-victoire de `maybeScriptedFloorBeat`
  (`floor-ambiance.js`), flag `grandeSalleBeatSeen` sérialisé.

### 14.3.3 La transition vers la Boucle (✅ mécanique / 💡 sens)

| Élément | ✅ Statut | 💡 Sens narratif |
|---------|----------|------------------|
| Escalier 10→11 ouvert | ✅ gate `victoryAchieved` | *La victoire est la clé qui déplie le château vers le bas.* |
| Bascule Ténèbres (textures + ambiance) | ✅ override + tranche D (14+) | *Le familier devient cauchemar ; descendre, c'est remonter le temps.* |
| Monstres en variante **Ténébreuse** (18-20) | ✅ recyclage | *Tes ennemis vaincus reviennent, plus anciens.* |
| Toast « 🌀 Boucle N » | ✅ `#tier-transition-overlay` | *Tu entres dans une spirale, pas dans un couloir.* |

---

## 14.4 La Boucle Ténébreuse comme post-game

> ✅ (modèle de jeu) / 💡 (lectures narratives)

✅ La Boucle est une **descente continue infinie** (pas de reset, pas de fin
scénarisée) : recyclage `effectiveFloor`, paliers de Maison **Mythe (17) →
Apothéose (18) → série ★ N** génératrice, gold-sink `donateGoldToHouse`,
**Ruines Anciennes** (tranche D, 14+). Détail d'équilibrage en
[13 §13.2.3/§13.3.5](13-equilibre-difficulte-progression.md).

### 14.4.1 Évolution narrative selon le niveau de Boucle (💡 sur base ✅)

✅ `loopNumber = max(0, ceil((deepest − 10) / 10))` (dérivé, non persisté) :
Boucle 1 = étages 11-20, Boucle 2 = 21-30, etc. ✅ `accumulatedEclats` (+1 par
nouvel étage de Boucle le plus profond) est le **compteur de prestige** affiché au
HUD (« 🌀 Boucle N — 🔹 X Éclats »).

| Niveau de Boucle | Étages | ✅ Contenu | 💡 Ton / sens narratif |
|------------------|--------|-----------|------------------------|
| **Boucle 1** | 11-20 | Recyclage + Ténébreux (18-20) ; Gardien de la Boucle ; Mythe (17), Apothéose (18) | *« Le château se rejoue, mais c'est encore Poudlard. »* On reconnaît, en pire. |
| **Boucle 2** | 21-30 | Ruines Anciennes (14+) en plein régime ; boss-miroir `reflet_mythe` (réel 21+) ; série ★ N | *« Sous Poudlard, la pierre n'a plus de nom. »* On affronte ce que l'école fut bâtie pour oublier. |
| **Boucle 3+** | 31+ | Prestige pur (★ N, gold-sink) ; échos temporels | *« Le mythe te dévore — descendre devient une fin en soi. »* La légende a un prix (thème 01 §1.7). |

### 14.4.2 Fins possibles *dans* la Boucle — lectures narratives (💡)

> 💡 La Boucle n'a pas d'écran de fin (sauf C, §14.5). Mais elle **propose
> plusieurs « postures terminales »** que le joueur adopte de fait. On les nomme
> pour le Codex et l'épilogue — **aucune** n'est un game over (sauf Ironman).

| Posture | 💡 Lecture narrative | ✅ Ancrage mécanique | Issue |
|---------|----------------------|----------------------|-------|
| 🌑 **Renoncement** | *Perpétuer* le mythe et arrêter là — on choisit de ne pas briser | ✅ `declineBreakCycle()` ; ou simplement cesser de descendre | Le héros reste légende ; la spirale l'attend |
| 🌀 **Folie / vertige** | Descendre **sans fin**, ★ N après ★ N — la quête de puissance comme gouffre | ✅ série ★ N génératrice (prestige infini) | Pas d'issue : c'est *l'absence d'issue* qui est le propos |
| 🕊️ **Sacrifice** | *Briser le Cycle* — resceller par le bas, y laisser une part de soi | ✅ `confirmBreakCycle()` → `cycleBroken` | La **vraie fin** (§14.5) |
| 💀 **Permadeath** | Mourir en Ironman — la descente t'a eu | ✅ `triggerDeath` → `showIronmanResult()` | Vrai *game over* + Hall of Fame |

> 💡 **Note de ton.** « Folie » et « Renoncement » ne sont **pas** punis par le jeu —
> ce sont des **lectures**, pas des sanctions. Le seul échec dur (Permadeath) est
> **opt-in** (Ironman). Cette douceur est volontaire : la Boucle doit rester
> **addictive sans être anxiogène** ([13](13-equilibre-difficulte-progression.md)).

---

## 14.5 La vraie fin — Briser le Cycle (✅ dans le jeu)

✅ **Quête secrète non-gating à 4 jalons** (`js/break-cycle.js`,
[11 §11.10](11-mondes-paralleles.md)). C'est la **seule vraie résolution
thématique** du jeu — et elle **n'arrête pas la partie**.

### 14.5.1 Les quatre jalons (✅)

| Jalon | Nom | ✅ Condition | Implémentation |
|-------|-----|-------------|----------------|
| **I** | **Entendre** | Voir la **scène du Scellement** (écho `echo_scene_sceau`, Ruines 14+) | `seenEchoes.has('echo_scene_sceau')` |
| **II** | **Porter** | Atteindre **15 Éclats portés** (`BRISER_ECLAT_SEUIL`) | `accumulatedEclats >= 15` (≈ étage 25) |
| **III** | **Affronter** | Vaincre **le Reflet du Mythe** (`reflet_mythe`, réel 21+) | `monsterKills['reflet_mythe'] >= 1` |
| **IV** | **Choisir** | 🕊️ Briser **ou** 🌑 Perpétuer | modale `#break-cycle-overlay` |

> ✅ Le résolveur `briserCycleJalons(ctx)` est **pur** (testé `tests/units.js`) ;
> les 3 premiers jalons sont **dérivés** ; le **seul état persistant ajouté** est
> `cycleBroken`. Le choix n'est proposé (`maybeOfferBreakCycle`) que si I **et** II
> sont déjà remplis quand le Reflet tombe ; sinon, indice narratif (« quelque chose
> manque, plus profond ») et le Reflet **revient** (il respawn en Boucle).

### 14.5.2 Le boss-miroir — *Le Reflet du Mythe* (✅)

✅ `reflet_mythe` (🪞, `epic`, danger 11, étage **réel** 21+) — *« Ce n'est pas un
monstre : c'est ce que la Boucle a fait de ta propre légende. Le vaincre, c'est se
mesurer à soi-même — au prix qu'on a payé pour devenir une histoire. »* C'est
l'incarnation littérale du thème **« le mythe et son revers »** (01 §1.7).

### 14.5.3 Le choix & la cinématique (✅)

✅ **Modale `#break-cycle-overlay`** :

- **Titre** : « Le Reflet s'efface — Briser le Cycle ? »
- **Texte** : *« Tu as **entendu** comment le sceau fut posé, **porté** assez
  d'Éclats pour peser sur la faille, et **affronté** ta propre ombre de
  légende… »*
- **Choix** : 🕊️ **Briser le Cycle** (`confirmBreakCycle`) · 🌑 **Perpétuer**
  (`declineBreakCycle`).

✅ **Si Briser** → cinématique **3 pages** (`BREAK_CYCLE_PAGES`) + `cycleBroken = true`
+ déverrouillage Codex (`checkCodexUnlocks('cycle-broken')`) + autosave :

> **1/3** — *« Tu poses les Éclats que tu portais sur la faille — non pour la fuir,
> mais pour la regarder jusqu'au fond. Comme les Quatre avant toi, tu y laisses une
> part de toi-même. »*
> **2/3** — *« Le battement organique de l'Avant-Monde ralentit, ralentit… puis se
> tait. Le froid recule d'un pas. La spirale ne se referme pas sur toi : elle
> s'apaise, le temps d'un souffle. »*
> **3/3** — *« On ne ferme pas la peur en la fuyant vers le haut. On la ferme en
> osant la regarder jusqu'au fond. » Le Cycle est brisé — mais la Boucle reste
> ouverte à qui voudra redescendre, sachant, désormais. »*

✅ **Message final** : « 🕊️ Tu as brisé le Cycle. La Boucle reste ouverte — tu peux
redescendre, mais tu sais, désormais. »

✅ **Si Perpétuer** → aucune punition : « 🌑 Tu choisis le mythe. La spirale
t'appelle plus bas — le Reflet reviendra. »

### 14.5.4 Pourquoi c'est la « vraie » fin sans gater (💡)

> 💡 La fin est **« vraie »** au sens **thématique** (elle résout le fil rouge :
> *la peur est le sceau ; on la ferme en la regardant, pas en la fuyant vers le
> haut*), pas au sens **mécanique** (elle ne ferme pas la partie). C'est cohérent
> avec « le choix plutôt que le don » (01 §1.7) : la vraie victoire n'est pas une
> récompense de stat, c'est un **acte de compréhension**. Le héros qui a brisé le
> Cycle peut redescendre — mais il **sait**. C'est la définition d'une fin
> **ouverte mais accomplie**.

---

## 14.6 Écrans de fin & épilogues

### 14.6.1 Descriptions immersives des conclusions (💡 sur base ✅)

| Écran | ✅/💡 | Ambiance visuelle | Audio | Registre |
|-------|------|-------------------|-------|----------|
| **Victoire** (`#victory-modal`) | ✅ | Halo doré + pluie de lumière (`victoryFlourish`), fond parchemin, blason de Maison | ✅ `playVictory()` (accord majeur) | Épique, soulagé, ouvert |
| **Briser le Cycle** (`#break-cycle-overlay`) | ✅ | 🪞 → 🕊️ ; 💡 fond Ruines runiques qui *s'apaise* page après page | ✅ `playVictory()` ; 💡 nappe plus douce, *abyss* qui se tait | Tragique, mythique, apaisé |
| **Perpétuer** | ✅ (message) | 💡 fondu vers le noir profond, spirale | 💡 reprise du thème *abyss* | Vertigineux, sans repos |
| **Résultat Ironman** (`#ironman-result-screen`) | ✅ | Score chiffré, crâne doré | ✅ `playDeath()` | Solennel, définitif |

> 💡 **Charte émotionnelle** (cf. §14.7) : la victoire est **dorée et chaude** (on a
> *gagné*) ; briser le Cycle est **bleu-froid qui se réchauffe d'un degré** (on a
> *compris*) ; perpétuer est **noir** (on a *choisi le gouffre*). Le contraste
> chromatique **porte le sens** sans une ligne de texte de plus.

### 14.6.2 Impact sur le Codex (✅ + 💡)

✅ Entrées de fin **déjà câblées** (`js/codex.js`) — déverrouillées par les
robinets `victory` / `eclatLoop` / `cycleBroken` :

| Entrée Codex | Section | ✅ Déverrouillage | ✅ Révélation |
|--------------|---------|-------------------|----------------|
| `boucle_tenebreuse` | 📖 Glossaire | `victory` | étage 14 |
| `tenebreux` | 📖 Glossaire | `victory` | — |
| `porteur_eclats` | 🔹 Éclats | `victory` | `eclatLoop: 5` |
| `echo_signature` | 🔹 Éclats | `victory` | écho `echo_signature` |
| `briser_cycle` | 🔹 Éclats | `victory` | 3 cond. (écho `echo_scene_sceau` + `eclatLoop: 15` + kill `reflet_mythe`) |
| `cycle_brise` | 🔥 Histoire | **`cycleBroken`** | `cycleBroken` |
| `voix_{godric,salazar,rowena,helga}` | 🔹 Éclats | échos des Fondateurs (Ruines) | — |
| `ruines_anciennes` | 🗺️ Lieux | étage 14 | écho `echo_scene_sceau` |

> 💡 **Entrée d'épilogue proposée.** Une entrée `epilogue` (section 🔥 Histoire),
> déverrouillée à la **première** victoire, dont le **texte révélé** varie selon
> `endingType` (§ÉTAPE 2.A) — la mémoire écrite de *comment* cette partie s'est
> conclue (Maison, choix moraux, Cycle brisé ou non). Réutilise le champ
> `variants.house` du format Codex ([12 §12.3](12-glossaire-et-codex.md)).

### 14.6.3 Héritage visible entre runs (❓/💡)

> ❓ **Statut de jeu : aucun héritage inter-run** n'est implémenté. La Boucle EST le
> seul « après » (un **soft-NG+ continu** dans la même partie : on ne recommence
> pas, on s'enfonce). Un vrai NG+ « reset + héritage » serait un **ajout**.

💡 **Proposition d'héritage minimal et opt-in** (détail en ÉTAPE 2.E) :

- **Persistant de profil** (hors save de partie, comme le pseudo HoF) : un
  **titre** (« Vainqueur », « Briseur de Cycle ★ N ») et un **compteur de victoires**.
- **Codex de profil** : les entrées de fin **déjà vues** restent consultables au
  hub de démarrage (lecture seule), comme une bibliothèque qui grossit de run en
  run.
- **Cosmétique de départ** : un blason orné / une bordure pour les héros d'un
  profil ayant brisé le Cycle. **Zéro avantage de stat** (sinon on casse
  l'équilibrage 13).

---

## 14.7 Règles de cohérence des fins

> 💡 (synthèse normative)

1. **Canon assoupli, variété par le texte.** On respecte le ton HP (Dumbledore
   sage, Maisons fidèles à [07](07-les-maisons.md)) ; la variété vient des
   **couches de texte** (§14.2.2), pas de branches d'univers. ✅ La seule liberté
   structurelle déjà prise (la Boucle, les Ruines pré-Poudlard) est **assumée** en
   [02](02-univers-ton-et-canon.md).
2. **Jamais de « mauvaise fin ».** Les variantes **récompensent** l'investissement ;
   elles ne **punissent** pas un parcours rapide. Le seul échec dur est l'Ironman
   (opt-in).
3. **Une seule cinématique de victoire.** Toutes les variantes B sont des
   **injections de texte** dans `#victory-modal` — jamais un écran parallèle.
4. **La fin n'arrête pas le jeu.** Victoire et Briser le Cycle **laissent la Boucle
   ouverte** (sauf Permadeath). C'est la **promesse d'addiction** : on peut toujours
   redescendre.
5. **Style cinématographique.** Phrases courtes, présent, **deuxième personne**
   (« Tu poses les Éclats… ») ; le **contraste chromatique** porte l'émotion
   (§14.6.1) ; pagination lente (pages 1/3, 2/3, 3/3) pour *laisser respirer*.
6. **Défensif partout.** Chaque variante est gardée par `typeof flag !== 'undefined'`
   → flag absent = texte de base (jamais de crash, jamais de page blanche).

---

## 14.8 Tables de synthèse

### 14.8.1 Table maîtresse — Condition → Fin

| Condition | Type de Fin | Description narrative | Impact sur la Boucle | Déblocage Codex |
|-----------|-------------|-----------------------|----------------------|------------------|
| Vaincre `voldemort_revenu` (ét. 10) | **A. Normale** ✅ | « L'Ombre s'efface » — discours de Dumbledore, l'escalier profond s'ouvre | **Ouvre** la Boucle (`victoryAchieved`) | ✅ `boucle_tenebreuse`, `tenebreux`, `porteur_eclats`, `echo_signature` (robinet `victory`) |
| `chosenHouse` = X | **B. Conditionnelle** ✅ **codé** | Dernier mot de Dumbledore coloré par la Maison | Aucun | `_victorySpeechVariants` (a) |
| Solo / Duo / héros | **B. Conditionnelle** ✅ **codé** | Épilogue intime (solo) ou à 2 voix (duo) + clin d'œil Maison canon ≠ jouée | Aucun | `_victorySpeechVariants` (b) |
| `<house>SignatureDone` | **B. Conditionnelle** ✅ **codé** | Paragraphe « héritage » nommant la récompense de signature | Aucun | `_victorySpeechVariants` (c) |
| 3 `eclat_voute` remis | **B. Conditionnelle** ✅ **codé** | Paragraphe de révélation : « le verrou retenait deux choses » | Prépare émotionnellement la Boucle | `_victorySpeechVariants` (d) |
| `slythPactChoice === 'pact'` | **B. Conditionnelle** ✅ **codé** | Ton **froid**, mise en garde de Dumbledore | Aucun | ✅ `echo_salazar` |
| `slythPactChoice === 'defiance'` | **B. Conditionnelle** ✅ **codé** | Ton de **reconnaissance** (avoir refusé le pacte) | Aucun | `_victorySpeechVariants` (e) |
| 4 jalons (voir §14.5) + 🕊️ Briser | **C. Vraie fin** ✅ | Cinématique 3 pages, rescellement par le bas | **Reste ouverte** ; `cycleBroken=true` | ✅ `cycle_brise` (robinet `cycleBroken`) |
| 4 jalons + 🌑 Perpétuer | **D. Renoncement** ✅ | « Tu choisis le mythe » ; le Reflet revient | **Reste ouverte**, série ★ N intacte | ✅ `briser_cycle` (reste « connu, non brisé ») |
| Descente ★ N infinie | **D. Folie/vertige** 💡 | Prestige sans fin — le mythe dévore | **Est** la Boucle | ✅ échos temporels (zone D) |
| Mort en Ironman | **E. Permadeath** ✅ | Écran de résultat chiffré + Hall of Fame | **Fin de partie** (slots Ironman supprimés) | — |

### 14.8.2 Flags & état mobilisés

| Flag / variable | ✅/💡 | Rôle dans les fins | Persisté ? |
|-----------------|------|--------------------|------------|
| `victoryAchieved` | ✅ | Gate unique de la Boucle ; robinet Codex `victory` | ✅ |
| `victoryAt` | ✅ | Horodatage de la victoire (recap) | ✅ |
| `slythPactChoice` | ✅ | Variante de ton de la cinématique (Pacte) | ✅ |
| `accumulatedEclats` | ✅ | Jalon II (≥15) ; robinet Codex `eclatLoop` | ✅ |
| `loopNumber` (dérivé) | ✅ | Niveau de Boucle (ton narratif) | ❌ dérivé |
| `seenEchoes` | ✅ | Jalon I (`echo_scene_sceau`) ; échos Fondateurs | ✅ |
| `monsterKills['reflet_mythe']` | ✅ | Jalon III | ✅ |
| `cycleBroken` | ✅ | **Vraie fin** (C) ; robinet Codex `cycleBroken` | ✅ |
| `<house>SignatureDone` | ✅ | Variante « héritage » de la cinématique | ✅ |
| `chosenHouse` | ✅ | Variante de Maison | ✅ |
| `endingType` | 💡 **nouveau** | Label dérivé pour épilogue / Codex (pas un gate) | 💡 (recommandé) |

---

## Récapitulatif express (pour briefer Gemini)

> Le jeu est une **fin ouverte** : vaincre Voldemort (ét. 10) déclenche la
> **cinématique de victoire** (« L'Ombre s'efface », ✅) qui **ouvre** la Boucle au
> lieu de fermer la partie. **Fins conditionnelles** = **variantes de texte** de
> cette même cinématique selon Maison / héros / quêtes signature / Éclats / choix
> moraux (la seule déjà codée : ton froid si `slythPactChoice === 'pact'`) — jamais
> une branche, jamais une « mauvaise fin ». **Post-game** = **Boucle Ténébreuse**
> infinie (recyclage, Ténébreux 18-20, Ruines 14+, paliers Mythe/Apothéose/★ N,
> gold-sink), dont le **ton** évolue par `loopNumber`. **Vraie fin** = **Briser le
> Cycle** (✅) : quête secrète 4 jalons (Entendre `echo_scene_sceau` / Porter 15
> Éclats / Affronter `reflet_mythe` / Choisir), flag `cycleBroken`, cinématique 3
> pages — **non-gating** : la Boucle reste ouverte, le héros « sait, désormais ».
> Échec dur = **permadeath Ironman** uniquement. Le **Codex** enregistre tout
> (`cycle_brise`, `porteur_eclats`…). **Héritage inter-run** = non implémenté (la
> Boucle est un soft-NG+ continu) ; un NG+ opt-in **cosmétique** est proposé.

## Points à trancher (résumé)

1. ✅ **Variantes conditionnelles de la cinématique (B)** — **tranché : les 5 axes
   adoptés et implémentés** (Maison + héros/solo-duo + signatures + Éclats + Pacte
   `pact`/`defiance`), 100 % texte sur la même cinématique. (§14.2.2)
2. ✅ **Beat « Grande Salle » post-victoire** — **tranché : implémenté** (§14.3.2).
   Scène épinglée au premier retour réel sur l'étage 1 post-victoire ; le Gardien
   de la Boucle reste la voix de ceux qui descendent. One-shot cosmétique
   (`GRANDE_SALLE_BEAT`, flag `grandeSalleBeatSeen`).
3. ❓ **Entrée Codex `epilogue`** dépendante de `endingType` : oui / non ? (§14.6.2)
4. ❓ **NG+ opt-in** (titre + Codex de profil + cosmétique, **zéro stat**) : on
   l'implémente ou la Boucle continue reste l'unique « après » ? (§14.6.3, ÉTAPE 2.E)
5. ❓ **`endingType`** : nouveau champ dérivé/persisté pour l'épilogue, ou se
   contente-t-on des flags existants lus à la volée ? (ÉTAPE 2.A)

---

# ÉTAPE 2 — Plan d'implémentation

> Plan **concret et priorisé** pour porter ce chapitre en jeu. Convention :
> **réutiliser l'existant** (✅), n'ajouter du neuf que si une proposition est
> validée (💡). Tout est **additif, défensif, non-gating**. ⚠️ Toute phase touchant
> `js/**` ou `css/**` impose un **bump de cache PWA** (guidelines §8, skill
> `cache-bump`) + `node tests/smoke.js` (§7) — **dans le même commit**.

## A. Structure des données

### A.1 Existant à consolider (✅ — aucune réécriture)

```js
// state.js (déjà présents, sérialisés)
let victoryAchieved = false;      // gate Boucle + robinet Codex 'victory'
let victoryAt       = null;       // ISO-8601
let cycleBroken     = false;      // VRAIE FIN (la "brokenCycle" de la tâche)
let accumulatedEclats = 0;        // prestige + jalon II / robinet 'eclatLoop'
let slythPactChoice = null;       // 'pact' | 'defiance' | null
// + chosenHouse, <house>SignatureDone, seenEchoes, monsterKills, floorReached
```

> ✅ **Rien à migrer.** La « vraie fin » de la tâche (`brokenCycle`) **existe** sous
> le nom `cycleBroken`. Le gate de fin d'Acte III (`victoryAchieved`) existe.

### A.2 Nouveau — uniquement si validé (💡)

```js
// state.js (💡 proposé — label dérivé, NON-gating)
let endingType = null;            // null | 'victory' | 'victory_pact' | 'cycle_broken' | ...
```

- **`endingType` est un LABEL, pas un gate.** Calculé (et persisté) au **premier**
  déclenchement de victoire, puis **mis à jour** si `cycleBroken` devient vrai.
  Source unique pour l'**épilogue** et l'entrée Codex `epilogue`.
- Helper pur **`computeEndingType()`** (proposé, à tester dans `tests/units.js`) :

```js
// Pur : déduit le label de fin des flags existants (priorité : Cycle brisé > Pacte > base)
function computeEndingType(ctx) {
  if (ctx.cycleBroken) return 'cycle_broken';
  if (!ctx.victoryAchieved) return null;
  if (ctx.slythPactChoice === 'pact') return 'victory_pact';
  return 'victory';
}
```

> 💡 **Héritage de profil** (si NG+ validé, §E) : clé `localStorage`
> **`hogwarts_rpg_profile`** (hors save de partie, comme `hogwarts_rpg_player_name`)
> `{ victories:int, cycleBroken:bool, titles:[], seenEndings:[] }`.

## B. Variables & conditions de déclenchement

| Fin | ✅/💡 | Hook de déclenchement | Condition |
|-----|------|------------------------|-----------|
| A. Victoire | ✅ | `checkVictoryTrigger` (endBattle) | `monsterId === 'voldemort_revenu'` && `!victoryAchieved` |
| B. Variantes texte | 💡 | dans `showVictoryScreen` (lecture des flags) | flags présents (défensif) |
| C. Briser le Cycle | ✅ | `maybeOfferBreakCycle` (endBattle) | jalons I+II remplis & `reflet_mythe` tombé & `victoryAchieved` & `!cycleBroken` |
| D. Perpétuer | ✅ | `declineBreakCycle` | clic joueur |
| E. Permadeath | ✅ | `triggerDeath` → `showIronmanResult` | `ironmanMode` |

> 💡 **B en pratique** : étendre `showVictoryScreen()` (`endgame.js`) avec des blocs
> `speechVariants` concaténés au discours de base — **mêmes garde-fous** que le bloc
> `pactCold` existant (modèle déjà en place). Aucune nouvelle fonction publique
> requise.

## C. Intégration Codex / PNJ / quêtes signature / Boucle

| Cible | ✅/💡 | Action |
|-------|------|--------|
| **Codex** | ✅ | Entrées de fin câblées (`cycle_brise`, `porteur_eclats`…). 💡 ajouter `epilogue` (texte `variants` selon `endingType`) ; appeler `checkCodexUnlocks('victory')` est **déjà** fait. |
| **PNJ** | ✅ | Lignes post-victoire gardées par `victoryAchieved` (Kingsley/Bill/Sirius **+ P2-ext** : Gardien de la Boucle, Marchand Clandestin, Apothicaire & Forgeron Ténébreux) appendues par `_postVictorySuffixPages` (`npc-dialog.js`, helper pur `pickPostVictoryLine`) ; exclusives de `darkLoopLines` (surface < 18 vs Boucle profonde). Gardien = voix dédiée de l'après (étage 11). Cosmétique. |
| **Quêtes signature** | ✅ flags / 💡 lecture | Lire `<house>SignatureDone` dans `showVictoryScreen` (B.c). |
| **Boucle** | ✅ | Aucune modif : la Boucle reste le post-game. 💡 ton par `loopNumber` déjà partiellement exposé (HUD). |

## D. Système d'écrans de fin (texte dynamique, illustrations, musique)

- ✅ **Réutiliser** `#victory-modal` (A/B) et `#break-cycle-overlay` (C) — **ne pas
  créer d'écran neuf**. B = injections de texte dynamiques.
- 💡 **Illustrations** : fond parchemin + blason `chosenHouse` déjà rendus ; proposer
  une **illustration de fin** par registre (victoire dorée / Cycle apaisé / spirale
  noire) dans `img/scenes/` (cf. §G).
- 💡 **Musique** : ✅ `playVictory()` existe ; proposer un sample doux
  (`ending_break` / reprise *abyss* qui se tait) pour la cinématique C
  (`audio-music.js`, défensif : repli synthèse si 404 — modèle des samples de
  combat). ⚠️ tout sample nouveau = passe par le SW (cache `audio/`).

## E. New Game+ après fin (💡 — non implémenté aujourd'hui)

> ❓ Décision requise (Point à trancher 4). Le jeu **n'a pas** de NG+ : la Boucle
> est un soft-NG+ continu. Proposition **opt-in, cosmétique, zéro stat** :

1. **Profil persistant** (`hogwarts_rpg_profile`, hors save de partie) : titres,
   compteur de victoires, liste des fins vues.
2. **Hub de démarrage** : afficher le **titre** du profil + un **Codex de profil**
   (lecture seule des entrées de fin déjà vues), sans toucher la save de partie.
3. **Cosmétique de départ** : bordure / blason orné si `profile.cycleBroken`.
4. **Garde-fou équilibrage** : **aucun** bonus de stat hérité (sinon casse
   [13](13-equilibre-difficulte-progression.md)). Un vrai « reset + héritage de
   stats » est **explicitement hors-scope** sauf décision contraire.

## F. Priorisation

| Phase | Contenu | Dépend de | Coût | Valeur |
|-------|---------|-----------|------|--------|
| **P0** | ✅ Déjà en jeu : victoire (A), Pacte (B partiel), Briser le Cycle (C), Codex de fin, Ironman | — | 0 (fait) | — |
| **P1** | 💡 **Variantes texte (B)** : Maison + Éclats(3) + Pacte `defiance` dans `showVictoryScreen` | flags existants | faible | **élevée** (le « mes choix comptent ») |
| **P2** | ✅ **Lignes PNJ post-victoire** (Kingsley/Bill/Sirius) + beat Grande Salle — **implémentés** | P1 | moyen | moyenne (émotion) |
| **P3** | 💡 **`endingType` + entrée Codex `epilogue`** (épilogue dynamique) | P1 | faible-moyen | moyenne (rejouabilité Codex) |
| **P4** | 💡 **Assets de fin** (illustrations + sample C) | P1-P3 | moyen (prod art) | élevée (mémorabilité) |
| **P5** | 💡 **NG+ opt-in** (profil + titres + Codex de profil) | P3 | moyen-élevé | rejouabilité long terme |

> **Ordre conseillé** : P1 (fins Acte III enrichies) → P2/P3 (post-game & épilogue)
> → P4 (assets) → P5 (vraie fin sur plusieurs boucles / NG+). C'est exactement
> l'ordre demandé par la tâche : *fins Acte III → post-game → vraie fin
> multi-boucles*.

## G. Suggestions d'assets

| Asset | Type | Registre | Note |
|-------|------|----------|------|
| `img/scenes/ending_victory.*` | illustration grand format | doré, chaud | Dumbledore + château qui respire ; modèle des scènes existantes (`img/scenes/`) |
| `img/scenes/ending_break_cycle.*` | illustration | bleu-froid → un degré plus chaud | faille rescellée par le bas, colombe 🕊️ |
| `img/scenes/ending_spiral.*` | illustration | noir profond | spirale (Perpétuer / vertige ★ N) |
| `img/codex/epilogue.png` | icône Codex | parchemin gravé | entrée `epilogue` |
| `audio/music/ending_break.ogg` | musique | nappe douce, *abyss* qui se tait | défensif (repli synthèse) ; passe par le cache `audio/` |
| 💡 **Voix** (optionnel) | OGG narratif | Dumbledore (victoire) ; voix des Ruines (Cycle) | modèle des samples `audio/voice/` |

> 💡 **Cinématiques textuelles** : déjà au format paginé (intro.js / break-cycle.js).
> Réutiliser ce patron pour tout épilogue étendu — **présent, 2ᵉ personne, pages
> lentes** (§14.7).

## H. Tests

- 💡 `tests/units.js` : ajouter `computeEndingType()` (matrice base / pact /
  cycle_broken / null) — **pur**, comme `briserCycleJalons`.
- ✅/💡 `tests/scenarios/codex.js` : couvre déjà les entrées `victory`/`cycleBroken`.
  💡 ajouter un cas `epilogue` si P3 retenu.
- 💡 `tests/scenarios/` (combat/houses) : un scénario « victoire → variante de texte
  selon `chosenHouse` » si P1 retenu (assert sur le contenu de `#victory-speech`).
- ⚠️ Tout commit touchant `endgame.js` / `codex.js` / `npc-dialog.js` →
  `node tests/smoke.js` + skill `cache-bump`.

## I. Ce qui ne change pas (sanity)

- ✅ **Une seule colonne obligatoire** : descendre → vaincre Voldemort. Aucune fin
  ne devient une condition d'accès.
- ✅ **La Boucle reste infinie et ouverte** ; Briser le Cycle reste **cosmétique**.
- ✅ **Pas de branche d'arc** : toutes les variantes sont du **texte** sur la même
  cinématique.
- ✅ **Défensif** : flag absent → texte de base, jamais de crash.

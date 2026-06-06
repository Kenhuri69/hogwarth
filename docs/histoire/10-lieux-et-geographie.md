# 10 — Lieux & géographie

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : traiter les **étages comme des lieux**. Ambiance, sens, et ce que
> le joueur découvre en descendant. `💡` = proposition modifiable ; `✅` = acté
> dans le jeu. Complète [04](04-structure-actes-et-etages.md) côté « décor &
> atmosphère » et croise le bestiaire propre à chaque zone en
> [09](09-bestiaire-et-lore.md).

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

---

## 10.1 Identité narrative de chaque zone

### Zone A — Couloirs de Poudlard (étages 1–3)
> 💡 (proposition) / ✅ (décor)

**« On est encore à la maison — mais la maison a peur. »** Le héros démarre
dans le Poudlard reconnaissable : couloirs de pierre claire, poutres,
portraits, torches. C'est le décor de l'école, presque rassurant. La
dissonance est volontaire : ce familier est déjà **contaminé** — un chat qui
attaque, un portrait qui maudit, des escaliers figés vers le bas.

- **Ce qu'on y apprend** : la corruption **vient d'en bas**, pas de l'extérieur ;
  on s'initie à l'exploration, au combat, aux quêtes des PNJ.
- **Créatures** : créatures de l'école (§9.1) — danger faible.
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
- **Créatures** : forces humaines naissantes (§9.4), morts-vivants premiers
  (§9.3), créatures aquatiques des douves (§9.2).
- **Lieux nommés probables** : Le Cachot de Potions, Le Donjon de Serpentard,
  La Bibliothèque Interdite.

### Zone C — Profondeurs Oubliées (étages 7–13)
> 💡 (proposition) / ✅ (décor)

**« On a quitté Poudlard. »** Les cavernes : plus de murs taillés, mais de la
roche brute, des lacs souterrains, du noir. Le château connu est derrière soi ;
on entre dans ce que l'école a **enfoui** plutôt qu'effacé. Les forces ennemies
montent en gamme — élite mangemort, bêtes mythiques, puis les **boss canon** qui
gardent la route vers la source.

- **Ce qu'on y apprend** : il existe des strates **antérieures et inférieures**
  à l'école ; le **Veilleur du Seuil** (ét. 8) interdit explicitement le
  passage, première graine des Ruines.
- **Le fond (étage 10)** : la **source** — Voldemort Ressuscité.
- **Créatures** : Acromantules profondes, héritage de Serpentard, gardiens
  inventés, cercle intérieur (§§9.4–9.6).

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
- **Créatures** : variantes **Ténébreuses** (§9.7), boss recyclés.

---

## 10.2 Lieux-signatures

> 💡 (proposition de poids narratif) / ✅ (noms et éléments actés)

### La Chambre des Secrets
Le lieu nommé le plus chargé du canon. **Ancrage** : ✅ le **Basilic Mineur**
(créé par Salazar Serpentard) et le **Serpent des Cachots** répondant au
Fourchelang. 💡 Lieu-signature des Profondeurs (zone C) : la chambre où l'on
comprend que la menace plonge ses racines jusqu'aux **Fondateurs eux-mêmes**.
Candidate idéale pour un **étage scénarisé non procédural** (voir §10.5).

### La Salle sur Demande
Le lieu qui **devient ce dont on a besoin**. 💡 Parfait support à du mobilier de
répit ou d'outillage garanti (forge, bibliothèque, fontaine) : narrativement,
le château *offre* au héros ce qu'il lui faut pour continuer. Pourrait être la
**salle d'outillage de l'endgame** (où l'on craft et apprend).

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
| **Fontaine** | Répit total 1×/visite d'étage | **Sanctuaire** : une source d'eau pure que la corruption n'a pas (encore) atteinte ; respiration de la descente. Se « tarit » après usage — la ressource est rare. |
| **Coffre** | Butin | La mémoire matérielle du château : ce que d'autres y ont laissé/perdu. |
| **Boutique** | Achats | « Une aile de bibliothèque transformée en échoppe de fortune » (✅) : des survivants tiennent encore commerce dans les ruines. |
| **Autel** | Risque/récompense | **Le pacte** : on offre quelque chose pour recevoir — tentation, ambiguïté morale, écho de la magie ancienne. |
| **Stèle d'énigme** | Savoir gardé | **La connaissance comme épreuve** : le château ne livre ses secrets qu'à qui réfléchit (devinettes). |
| **Dalles-runes** | Puzzle | Même alphabet que les Ruines Anciennes : un **avertissement gravé** semé tôt, expliqué tard. |
| **Forge** (endgame) | Craft d'équipement | Le héros-légende **s'outille** pour la Boucle : on ne survit plus, on se prépare. |
| **Bibliothèque** (endgame) | Apprentissage / matériaux | Le **savoir interdit** redevient accessible quand on est assez puissant — écho au Bibliothécaire d'Ombre ([09 §9.6](09-bestiaire-et-lore.md)). |
| **Jardin d'herbes** | Récolte (craft) | Vestige des serres : la nature magique persiste même sous terre. |

> 💡 **Cohérence forge/bibliothèque & endgame** : ces deux éléments
> apparaissent en endgame (Boucle Ténébreuse) parce que le récit y change de
> nature — de **survie** (zones A–C) à **maîtrise/prestige** (paliers Apothéose,
> dons à la Maison). Le décor accompagne le glissement thématique.

---

## 10.5 Procédural vs scénarisé

> 💡 (proposition)

✅ Les étages sont **procéduraux** ; les lieux nommés (`LOCATIONS`) sont
actuellement des **étiquettes d'ambiance** distribuées par génération.

💡 Piste : réserver **2–3 étages-jalons non procéduraux** garantis, alignés sur
les beats de [03](03-trame-principale.md) — par ex. la **Chambre des Secrets**
(rencontre du Basilic / héritage Serpentard), le **seuil du Veilleur** (ét. 8,
graine des Ruines), et l'**antre de Voldemort** (ét. 10, climax). Ils donneraient
des **scènes écrites** stables sans renoncer à la rejouabilité du reste.

> ❓ À arbitrer : combien d'étages-jalons fixes accepte-t-on d'introduire sans
> casser la promesse « donjon procédural » du pitch ([README](../README.md)) ?

---

## Récapitulatif express (pour briefer Gemini)
> 4 zones verticales = 4 strates de mémoire : **A Couloirs** (l'école qui a
> peur) → **B Cachots** (la corruption a des serviteurs humains) → **C
> Profondeurs Oubliées** (ce que l'école a enfoui ; source = Voldemort ét. 10) →
> **D Ruines Anciennes** (plus vieilles que la fondation, ouvertes par la
> victoire). **Descendre = remonter le temps.** Lieux-signatures : Chambre des
> Secrets, Salle sur Demande, Ruines runiques. Le mobilier raconte : fontaine =
> sanctuaire, autel = pacte, stèle/runes = savoir gardé, forge/bibliothèque =
> l'endgame qui s'outille.

## Points à trancher (résumé)
1. Personnifie-t-on **ce qui dort sous les Ruines Anciennes** (§10.3) ?
2. Combien d'**étages-jalons non procéduraux** garantis (§10.5) ?

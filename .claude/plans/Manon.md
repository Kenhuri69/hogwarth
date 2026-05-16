# Manon — fille cachée de Lupin

Personnage original (OC) du jeu *Poudlard & Magie*. Ce fichier sert à la
fois de **bible de personnage** et de **plan d'implémentation** (cf.
guidelines §5).

---

## 1. Identité

| Champ | Valeur |
|-------|--------|
| Prénom | Manon |
| Nom | Lupin (caché — repris seulement à la fin de son arc) |
| Père | Remus Lupin, professeur de DCFM (étage 4) |
| Âge | 16-17 ans |
| Statut | Non inscrite à Poudlard ; vit clandestinement dans le château |
| Maison | **Poufsouffle** (Répartie en coda, hat-stall avec Gryffondor) |
| Étage | 3 — salles de classe désertes |
| Icône | 🌙 (clin d'œil discret à la lycanthropie) |
| Marqueur | quête (donneuse de la chaîne `manon_secret` → `manon_pardon`) |

## 2. Physique

Jeune femme aux traits fatigués — elle dort mal et vit cachée. Yeux qui
virent à l'ambre / l'or les nuits de pleine lune (héritage du loup).
Une fine cicatrice ancienne et discrète. Vêtements usés et rapiécés,
trop grands : une garde-robe de survie, sans insigne tant qu'elle n'a
pas de Maison. Après sa Répartition : une écharpe tricotée jaune et noir
qu'elle ne quitte plus.

## 3. Personnalité

Méfiante, sur ses gardes, mais pas brisée — une **survivante**. En
colère contre l'abandon, sans jamais basculer dans la vengeance : ce
qu'elle veut, c'est comprendre, puis appartenir. Patiente jusqu'au
vertige (« j'ai attendu seize ans »), loyale envers un lien que la
logique lui dirait d'abandonner. Ce mélange de patience, de loyauté et
de besoin d'être *acceptée plutôt que prouvée* est ce qui la mène à
Poufsouffle.

## 4. Le sang de loup

Manon n'a **jamais été mordue** : elle n'est pas une louve-garou. Mais
la lycanthropie de Remus a marqué son sang. Les nuits de pleine lune
elle ne se transforme pas — quelque chose se réveille pourtant en elle :
fièvre, sens en alerte, yeux dorés, une faim sourde qu'elle dompte
seule. Le monde sorcier n'a pas de case pour elle : ni louve, ni
sorcière ordinaire. Élevée sans personne pour lui expliquer ce qu'elle
portait, elle a grandi en se croyant un monstre.

## 5. Histoire & relation avec Lupin

Remus aime brièvement une sorcière avant/pendant la guerre. À l'annonce
de la grossesse, la terreur l'emporte : sa malédiction va souiller
l'enfant. Via Dumbledore, il fait élever Manon sous un autre nom, loin,
avec un mensonge — *« ton père est mort en héros à la guerre »*. Il
croit que la distance est le seul cadeau qu'il puisse offrir.

À 16 ans, Manon découvre la vérité (une photographie et le nom *Lupin*
cousus dans la doublure d'une vieille malle). Elle entre dans le château
et se terre à l'étage 3, incapable de faire les trois derniers pas vers
son père.

### Les quatre raisons du secret (révélées par la quête)

1. **Le sang** — Remus était certain de condamner son enfant ; il avait
   raison à moitié.
2. **Le monde** — une enfant marquée « fille du loup-garou » :
   ni école, ni travail, ni amis ; un registre ministériel avant ses
   dix ans.
3. **La guerre** — l'enfant de Remus Lupin aurait été une arme, un
   otage contre lui et contre l'Ordre. La faire disparaître la gardait
   en vie.
4. **La honte** (l'indicible) — il ne pouvait regarder une fille qui
   portait sa malédiction sans y voir son propre échec. Il a confondu
   la fuite avec de la tendresse.

Le détail qui noue l'arc : un tiroir de **lettres jamais envoyées**,
une par mois depuis la naissance de Manon, écrites les soirs de pleine
lune. Il l'a toujours regardée de loin. L'abandon était une erreur
d'amour — et les deux choses sont vraies à la fois.

## 6. Arc de la quête — pseudo-quête en deux volets

Chaîne de 2 quêtes données et rendues par Manon (étage 3) :

| Volet | Quête | Objectif moteur | Révélation |
|-------|-------|-----------------|------------|
| 1 | `manon_secret` | `floor` → étage 4 | Elle se cache ; le sang de loup ; le mensonge de seize ans |
| 2 | `manon_pardon` (`prereq`) | `item` → 1 Chocolat aux Sorciers | Les 4 raisons ; les retrouvailles ; les lettres ; la Répartition |

- `greeting` : scène de rencontre (1er contact).
- `dialoguesByQuest` : déroule l'arc dans l'ordre (offer/active/ready).
- Climax (`manon_pardon` questReady, 5 pages) : retrouvailles + citation
  directe de Lupin + Répartition à Poufsouffle.
- `idleRandom` (post-quête) : Manon réconciliée, apaisée.

**Coda Poufsouffle** : une fois Lupin retrouvé, il fait passer le
Choixpeau à sa fille. Le chapeau hésite (Gryffondor — le sang du père),
puis tranche : *« il te faut une maison qui ne te demandera jamais de
mériter d'y entrer »* → POUFSOUFFLE. Celle qui n'avait sa place nulle
part trouve enfin une maison.

## 7. Lupin — voix complémentaire

3 répliques ajoutées au pool `idleRandom` de Lupin (additif), pour
donner sa version de père sans plomberie de quête : le berceau vu comme
une condamnation, les lettres jamais postées, l'enfant qui porte son
sang.

## 8. Intégration technique

| Fichier | Changement |
|---------|------------|
| `js/quests.js` | + templates `manon_secret`, `manon_pardon` ; fix `_renderQuestStep` (objectif `type:"floor"`) |
| `js/npcs.js` | + entrée PNJ `manon` ; + 3 répliques `idleRandom` à Lupin |
| `img/npc/manon.png` | Portrait — produit par l'utilisateur (ChatGPT, fusion photo réelle). `portraitImg` commenté tant que le PNG n'existe pas (fallback emoji 🌙). |

- Pas de modif `state.js` : `availableQuests` est peuplé depuis
  `QUEST_TEMPLATES` dans `chooseHouse` (main.js) ; la passe forward-fill
  de `save.js` couvre les parties existantes.
- Pas de modif `loader.js` : aucun nouveau global.
- Voix : aucune (Manon hors `_HEAD_OF_HOUSE_VOICE`, quêtes non farming).

## 9. Statut d'implémentation

- [x] Réflexion narrative + dialogue validés
- [x] Maison choisie : Poufsouffle
- [x] `js/quests.js` — templates + fix `_renderQuestStep`
- [x] `js/npcs.js` — PNJ Manon + répliques Lupin
- [x] `node tests/smoke.js` vert
- [ ] Portrait `img/npc/manon.png` (utilisateur) + activation `portraitImg`

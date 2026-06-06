# 07 — Les Maisons

**Statut :** 🟩 proposition de référence — à valider / amender

> Objectif : l'identité **narrative** des 4 Maisons (au-delà des bonus
> chiffrés, documentés côté gameplay). Valeurs, voix, chef, fantasme de jeu,
> sens narratif des paliers de prestige. `💡` = proposition narrative
> modifiable ; `✅` = acté dans le jeu (`HOUSE_BONUSES` dans `js/state.js` +
> section « Système des Maisons » de `CLAUDE.md`).
>
> 🔗 Le choix de Maison se fait juste après l'intro Dumbledore
> ([03 §3.1](03-trame-principale.md)). Les chefs de Maison sont aussi recensés
> en [06](06-pnj-et-factions.md). Les sets et objets emblématiques renvoient à
> [08](08-quetes-et-sous-intrigues.md) (quêtes de Maison).

---

## 7.1 Le sens narratif du choix de Maison

> 💡 (proposition)

Dans *Poudlard & Magie*, la Maison n'est pas un simple skin. C'est l'angle sous
lequel le héros **vit la descente** : la même corruption, la même remontée du
mal, mais traversées par des valeurs et un tempérament différents. Le
Choixpeau — ou ce qui en tient lieu après l'intro — ne fait pas que distribuer
un bonus : il **promet une voie**.

- ✅ **Mécaniquement**, chaque Maison oriente une stat (Gryffondor → ATK ;
  Serpentard → MAG ; Serdaigle → MAG ; Poufsouffle → DEF), donne des bonus de
  paliers, un **set d'équipement de Maison** (4 pièces), un **item légendaire**,
  puis des paliers endgame (**Mythe**, **Apothéose**, série **★ N**).
- 💡 **Narrativement**, elle colore les **dialogues du chef**, le **fantasme de
  jeu**, et le **sens de l'Apothéose** : devenir une légende de SA Maison, pas
  une légende générique.

> ❓ À arbitrer : le choix de Maison débloque-t-il des **dialogues / quêtes
> exclusifs** au-delà de la quête de set et de la quête de don (✅ déjà
> réservées par Maison), ou la couleur narrative reste-t-elle de la **saveur**
> (répliques, ton, récompenses cosmétiques) sans embranchement de trame ?

---

## 7.2 Le fil commun des quatre voies

Pour ne pas dériver, les quatre Maisons partagent une **architecture de
prestige identique** (✅), qu'il faut habiller différemment :

| Étape (✅) | Seuil indicatif | Habillage narratif `💡` |
|------------|-----------------|--------------------------|
| Apprenti → Confirmé → Expert → Maître → Virtuose | 50 → 16 000 pts | L'**ascension scolaire** : on gravit les rangs de sa Maison, on gagne pièce après pièce le **set de Maison** (Apprenti Or, Confirmé Or, Maître Or, puis 4ᵉ pièce via la **quête de set**). |
| **Légende** | 25 000 pts | On **dépasse l'école** : le héros devient une figure dont on parle. Réveille la « Maîtrise Légendaire » + une relique fondatrice. |
| **Mythe** (17, *requiresDarkTier 1*, ét. 11+) | 30 000 pts | On entre dans la **Boucle Ténébreuse** ([03 §3.6](03-trame-principale.md)) : le héros reçoit le **sort exclusif** de sa Maison et la **quête de don** (gold-sink) s'ouvre. |
| **Apothéose** (18, *requiresDarkTier 2*, ét. 21+) | 45 000 pts | Le héros devient l'**incarnation** de sa Maison : un **passif légendaire** s'éveille. |
| Série **Apothéose ★ N** | 61k, 145k, 295k… | Prestige « infini » : chaque ★ est un **degré de mythe** que rien dans le canon n'égale — alimenté par le **don à la Maison**. |

> ✅ Les paliers Mythe / Apothéose / ★ N sont **gatés par la victoire**
> (Boucle Ténébreuse) : on ne peut pas devenir un mythe avant d'avoir tué
> Voldemort. C'est cohérent avec le thème « le mythe et son revers »
> ([03 §3.7](03-trame-principale.md)).

---

## 7.3 Mise en scène des paliers (proposition transverse)

> 💡 (proposition — répond à la question de cadrage du squelette)

- **Réception cérémonielle** : ✅ les pièces de set et reliques ne « droppent »
  pas — elles sont **remises par le chef** lors d'un dialogue
  (`pendingHouseRewards`). 💡 On scénarise donc chaque remise comme une
  **scène brève** : le chef commente l'exploit, dans sa voix.
- **Mythe** : ✅ enseigne un **sort exclusif** à tout le groupe. 💡 Le chef le
  présente comme un **secret transmis**, pas comme un loot — « ceci ne
  s'apprend pas dans un manuel ».
- **Apothéose** : ✅ éveille un **passif légendaire** propre à la Maison.
  💡 Moment de bascule : le héros n'est plus *de* la Maison, il *est* la Maison.
- **★ N** + **don à la Maison** : ✅ gold-sink (5 G = 1 point), voix dédiée du
  chef (intro / offer / palier). 💡 La générosité comme dernière vertu : on
  rend à sa Maison ce qu'on lui doit.

---

## 7.4 Gryffondor — 🦁 *Le courage qui descend*

> 💡 (narratif) / ✅ (mécanique)

- **Valeurs / vertu cardinale** : bravoure, audace, chevalerie. ✅ `desc` :
  « Bravoure, courage et chevalerie. »
- **Fantasme de jeu** : ✅ **voie de l'attaque (ATK)** ; crit physique et
  agressivité. 💡 Le Gryffondor vit la descente comme une **charge** : on ne
  recule pas, on frappe le premier. La peur des Profondeurs est un défi à
  relever frontalement — c'est *la* Maison qui « descend volontairement »
  ([03 §3.1](03-trame-principale.md)) le plus naturellement.
- **Voix du chef — Minerva McGonagall** (✅ `headOfHouse: mcgonagall`) :
  💡 sèche, exigeante, mais profondément loyale. Elle ne flatte pas ; elle
  **constate** la bravoure. Ton de répliques : « N'allez pas confondre courage
  et imprudence, Potter. » Approbation rare et donc précieuse.
- **Récit de progression** :
  - 💡 **Mythe** → ✅ apprend **Patronus Maxima** : le courage qui **dissipe la
    peur** (le sort retire le statut `fear`). Sens narratif fort : la Maison de
    la bravoure reçoit le sort qui **annule la terreur** — la peur comme sceau,
    brisée par l'audace.
  - 💡 **Apothéose** → ✅ passif **Cœur du Lion** (crit accru + **Élan** :
    chaque coup critique augmente les dégâts, cumul). L'élan du brave qui se
    nourrit de ses propres exploits — plus on ose, plus on frappe fort.
- **Objets & sorts emblématiques** :
  - ✅ **Set du Lion** : Brassard du Lion → Heaume du Vaillant → Cape de
    Godric → **Cœur du Lion** (4ᵉ pièce via la quête *L'épreuve du Lion*,
    [08](08-quetes-et-sous-intrigues.md)).
  - ✅ Reliques : **Épée de Gryffondor** (`sword_gryff`, légendaire), **Lame de
    Godric** (`lame_godric`, palier Légende).
  - ✅ Sort exclusif : **Patronus Maxima** (Mythe).

---

## 7.5 Serpentard — 🐍 *L'ambition qui calcule*

> 💡 (narratif) / ✅ (mécanique)

- **Valeurs / vertu cardinale** : ambition, ruse, détermination. ✅ `desc` :
  « Ambition, ruse et détermination. »
- **Fantasme de jeu** : ✅ **voie de la magie (MAG)** orientée puissance et
  prédation. 💡 Le Serpentard vit la descente comme une **opportunité** : la
  corruption est une force, et celui qui comprend les ténèbres peut s'en
  servir sans s'y perdre. La descente n'effraie pas — elle **récompense** qui
  sait survivre.
- **Voix du chef — Severus Rogue** (✅ `headOfHouse: rogue`) : 💡 froide,
  cinglante, doublée d'une rigueur exigeante. Il méprise la facilité, respecte
  la maîtrise. Ton : « Vous croyez qu'un sort puissant suffit ? Pathétique. La
  ruse est de savoir *quand* le lancer. »
- **Récit de progression** :
  - 💡 **Mythe** → ✅ apprend **Sectumsempra Imperius** : le sort du Prince —
    une magie tranchante, transgressive, à la lisière du permis. Cohérent avec
    une Maison qui **flirte avec la limite** sans franchir le mal absolu.
  - 💡 **Apothéose** → ✅ passif **Soif du Serpent** (vol de vie de sort,
    15 %). Le prédateur parfait : chaque sort offensif **nourrit** son lanceur.
    Survivre en prenant à l'ennemi sa propre force.
- **Objets & sorts emblématiques** :
  - ✅ **Set du Serpent** : Anneau du Serpent → Pendentif du Mamba → Cape
    Sibylline → **Couronne du Basilic** (4ᵉ pièce via *Le souffle du Serpent*).
  - ✅ Reliques : **Médaillon de Serpentard** (`locket_slytherin`, légendaire),
    **Bague de Salazar** (`bague_salazar`, palier Légende).
  - ✅ Sort exclusif : **Sectumsempra Imperius** (Mythe).

---

## 7.6 Serdaigle — 🦅 *Le savoir qui éclaire*

> 💡 (narratif) / ✅ (mécanique)

- **Valeurs / vertu cardinale** : sagesse, intelligence, esprit vif. ✅ `desc` :
  « Sagesse, intelligence et esprit vif. »
- **Fantasme de jeu** : ✅ **voie de la magie (MAG)** orientée maîtrise et
  efficience (réduction de coût). 💡 Le Serdaigle vit la descente comme une
  **énigme à résoudre** : chaque étage est un problème, chaque créature une
  donnée. Là où Gryffondor charge, Serdaigle **comprend d'abord** — et frappe
  juste. Maison de prédilection pour les puzzles runiques et les énigmes de
  stèle ([10](10-lieux-et-geographie.md)).
- **Voix du chef — Filius Flitwick** (✅ `headOfHouse: flitwick`) : 💡 chaleureux,
  enthousiaste, intarissable sur la théorie magique. Il **célèbre** la
  curiosité. Ton : « Mais c'est *brillant*, ce que vous avez fait là ! Vous
  avez compris le principe, et non seulement récité le geste. »
- **Récit de progression** :
  - 💡 **Mythe** → ✅ apprend **Legilimens** : lire et **annuler** les
    capacités ennemies. Le savoir comme arme ultime — connaître l'adversaire
    mieux qu'il ne se connaît. La Maison du savoir reçoit le sort qui
    **anticipe**.
  - 💡 **Apothéose** → ✅ passif **Esprit de l'Aigle** (−20 % coût des sorts).
    La maîtrise parfaite : le mage qui ne gaspille plus rien, dont chaque
    incantation est optimale.
- **Objets & sorts emblématiques** :
  - ✅ **Set de l'Aigle** : Plume d'Aigle → Manteau d'Encre → Œil de l'Aigle →
    **Anneau du Savoir** (4ᵉ pièce via *Le savoir de l'Aigle*).
  - ✅ Reliques : **Diadème de Serdaigle** (`diademe_serdaigle`, légendaire),
    **Codex de Rowena** (`codex_rowena`, palier Légende).
  - ✅ Sort exclusif : **Legilimens** (Mythe).

---

## 7.7 Poufsouffle — 🦡 *La loyauté qui tient*

> 💡 (narratif) / ✅ (mécanique)

- **Valeurs / vertu cardinale** : loyauté, patience, travail acharné. ✅ `desc` :
  « Loyauté, patience et travail acharné. »
- **Fantasme de jeu** : ✅ **voie de la défense (DEF/END)** ; tenir, encaisser,
  régénérer. 💡 Le Poufsouffle vit la descente comme une **marche de
  résistance** : on n'avance pas vite, on avance **sûrement**, et on ne laisse
  personne derrière. Là où les autres brillent, le Poufsouffle **endure** — et
  c'est lui qui est encore debout au fond.
- **Voix du chef — Pomona Chourave** (✅ `headOfHouse: sprout`) : 💡 maternelle,
  patiente, terre-à-terre. Elle valorise l'effort constant plus que l'éclat.
  Ton : « Tu as tenu bon. C'est tout ce qui compte, vois-tu — pas qui frappe
  le plus fort, mais qui reste debout. »
- **Récit de progression** :
  - 💡 **Mythe** → ✅ apprend **Récolte Magique** (majore l'or de combat). La
    Maison du travail acharné reçoit le sort de l'**abondance méritée** —
    récompense de la patience, écho aux jardins de Chourave
    ([08](08-quetes-et-sous-intrigues.md)).
  - 💡 **Apothéose** → ✅ passif **Souffle du Blaireau** (régén PV/PM à chaque
    pas + **Vigueur** au-dessus de 60 % PV). L'endurance faite chair : le héros
    qui se régénère en marchant, increvable tant qu'il avance.
- **Objets & sorts emblématiques** :
  - ✅ **Set du Blaireau** : Ceinture du Blaireau → Cape de Loyauté → Coiffe du
    Blaireau → **Médaillon de Helga** (4ᵉ pièce via *Le serment du Blaireau*).
  - ✅ Reliques : **Coupe de Poufsouffle** (`coupe_poufsouffle`, légendaire),
    **Bouclier de Helga** (`bouclier_helga`, palier Légende).
  - ✅ Sort exclusif : **Récolte Magique** (Mythe).

---

## 7.8 Tableau-synthèse (pour briefer Gemini)

> ✅ faits / 💡 habillage

| Maison | Chef | Voie ✅ | Sort de Mythe ✅ | Passif d'Apothéose ✅ | Émotion `💡` |
|--------|------|---------|------------------|------------------------|--------------|
| 🦁 Gryffondor | McGonagall | ATK | Patronus Maxima | Cœur du Lion (crit + Élan) | Oser frontalement |
| 🐍 Serpentard | Rogue | MAG | Sectumsempra Imperius | Soif du Serpent (vol de vie de sort) | Tourner les ténèbres à son profit |
| 🦅 Serdaigle | Flitwick | MAG | Legilimens | Esprit de l'Aigle (−20 % coût) | Comprendre avant de frapper |
| 🦡 Poufsouffle | Chourave | DEF | Récolte Magique | Souffle du Blaireau (régén + Vigueur) | Tenir et ne lâcher personne |

---

## Récapitulatif express (pour briefer Gemini)
> 4 Maisons = 4 façons de vivre la même descente. Architecture de prestige
> commune (Apprenti → Virtuose → Légende → **Mythe** → **Apothéose** → ★ N),
> mais **voix du chef, sort exclusif et passif** distincts. Mythe/Apothéose
> sont **gatés par la victoire** (Boucle Ténébreuse) : devenir une légende de
> sa Maison a un prix, conforme au thème « le mythe et son revers ».

> ❓ À arbitrer : faut-il une **scène d'adoubement** scénarisée distincte pour
> Mythe et pour Apothéose (cinématique du chef), ou se contente-t-on de la
> remise cérémonielle existante + message de palier ?

# Poudlard & Magie — Spécification du jeu

> Document **cadre général** et **index des chapitres**. Cette spécification
> Markdown décrit le jeu pour la conception, la discussion et l'enrichissement
> (notamment avec un assistant comme Gemini). Elle est **lisible seule**, sans
> le code source.
>
> 🧭 **Comment lire ce dossier** : ce fichier pose le cadre. Chaque chapitre
> détaillé vit dans un sous-Markdown listé dans l'[index](#index-des-chapitres).
> L'accent est mis sur **l'histoire** (`docs/histoire/`) ; le gameplay est
> documenté en support (`docs/gameplay/`).

---

## 1. Vision en une phrase

> *Des élèves de Poudlard descendent, étage après étage, dans un château que
> les ténèbres regagnent — un RPG au tour par tour où l'on explore, combat,
> grandit dans sa Maison, et affronte le mal qui remonte des profondeurs.*

## 2. Pitch

**Poudlard & Magie** est un **RPG en tour par tour** façon *dungeon crawler*
(vue pseudo-3D à la première personne, dans l'esprit de *Might & Magic Book
One*), situé dans l'**univers Harry Potter**.

Le joueur incarne un (solo) ou deux (duo) élèves-sorciers qui explorent les
profondeurs de Poudlard, organisées en **étages** de plus en plus dangereux.
On avance case par case, on déclenche des combats au tour par tour contre les
créatures du château, on accomplit des quêtes données par les PNJ, on s'équipe,
on monte en niveau, et on gagne des **points de Maison**. La trame culmine dans
l'affrontement avec **Lord Voldemort ressuscité** ; sa défaite ouvre la
**Boucle Ténébreuse**, un endgame où le château, corrompu, se rejoue plus
sombre et plus profond.

## 3. Piliers d'expérience

| Pilier | Promesse au joueur |
|--------|--------------------|
| **Exploration** | Descendre dans un donjon procédural à étages, révéler la carte, trouver coffres, fontaines, autels, énigmes et secrets. |
| **Combat tactique** | Tour par tour : attaque, sortilèges élémentaires, garde, objets, fuite ; statuts, résistances/faiblesses, capacités ennemies. |
| **Identité de Maison** | Choisir une des 4 Maisons et faire grandir son identité (bonus, sets d'équipement, paliers, passifs endgame). |
| **Progression & build** | Niveaux, stats primaires/secondaires, 11 emplacements d'équipement, sorts appris de 3 façons, potions craftées. |
| **Narration** | Une trame principale + des sous-intrigues écrites (quêtes de PNJ, easter eggs, lore du bestiaire et des lieux). |
| **Endgame & méta** | Boucle Ténébreuse, mode Ironman + Hall of Fame, et visites inter-mondes (« Mondes Parallèles »). |

## 4. Ton & ambiance

- **Univers** : Poudlard et le monde des sorciers — familier au départ
  (couloirs de l'école), puis descente progressive vers l'austère, l'abyssal,
  l'ancien.
- **Registre** : aventure magique avec une teinte sombre croissante ; des
  moments d'émotion et d'humour (fantômes bavards, easter eggs) ponctuent la
  tension.
- **Esthétique** : thème **parchemin & or**, vue 3D à la torche, blasons de
  Maison, créatures et objets illustrés.
- **Rapport au canon HP** : respect de l'univers et du ton, avec des
  **libertés assumées** (personnages originaux jouables, créatures et
  intrigues inédites, structure en donjon). → à cadrer dans
  [`histoire/02`](histoire/02-univers-ton-et-canon.md).

## 5. Public & cadre technique (résumé)

- **Plateformes** : navigateur (desktop + mobile responsive), installable en
  PWA, jouable hors-ligne.
- **Modes** : solo (1 héros) ou duo (2 héros) ; 4 difficultés ; mode Ironman
  optionnel (permadeath + classement).
- **Contrainte de prod** : Vanilla JS / HTML5 Canvas, zéro dépendance, zéro
  build. *(Détail hors-scope de cette spec narrative — voir le code et
  `CLAUDE.md` à la racine.)*

---

## Index des chapitres

### 📖 Histoire (`docs/histoire/`) — cœur de la spécification
| # | Chapitre | Objet |
|---|----------|-------|
| 01 | [Synopsis & pitch narratif](histoire/01-synopsis-et-pitch.md) | Le récit en bref : prémisse, enjeu, fin. |
| 02 | [Univers, ton & rapport au canon](histoire/02-univers-ton-et-canon.md) | Cadre, époque, libertés vs Harry Potter. |
| 03 | [Trame principale](histoire/03-trame-principale.md) | L'arc central : la menace, la descente, Voldemort, la victoire. |
| 04 | [Structure : actes & étages](histoire/04-structure-actes-et-etages.md) | Découpage narratif par tranches d'étages + endgame (Boucle Ténébreuse). |
| 05 | [Personnages jouables](histoire/05-personnages-jouables.md) | Les héros sélectionnables : personnalité, rôle, arc. |
| 06 | [PNJ & factions](histoire/06-pnj-et-factions.md) | Donneurs de quêtes, mentors, marchands, antagonistes. |
| 07 | [Les Maisons](histoire/07-les-maisons.md) | Identité narrative des 4 Maisons, chefs, valeurs. |
| 08 | [Quêtes & sous-intrigues](histoire/08-quetes-et-sous-intrigues.md) | Quêtes principales, arcs secondaires, easter eggs narratifs. |
| 09 | [Bestiaire & lore des créatures](histoire/09-bestiaire-et-lore.md) | Origine et rôle narratif des monstres. |
| 10 | [Lieux & géographie](histoire/10-lieux-et-geographie.md) | Les étages comme lieux ; ambiance et progression. |
| 11 | [Mondes Parallèles](histoire/11-mondes-paralleles.md) | Lore des visites inter-mondes (cheminette, échos, verrous de sang). |
| 12 | [Glossaire & codex](histoire/12-glossaire-et-codex.md) | Termes propres au jeu, objets de lore, chronologie. |

### ⚙️ Gameplay (`docs/gameplay/`) — documentation de support
| # | Chapitre | Objet |
|---|----------|-------|
| — | [Index gameplay](gameplay/README.md) | Systèmes de jeu en appui du récit (combat, Maisons, équipement, économie, méta). À étoffer si besoin. |

---

## Conventions d'écriture

- Un chapitre = un fichier Markdown ; les gros chapitres peuvent éclater en
  sous-fichiers (`histoire/08-quetes/<quete>.md`) — garder un lien depuis le
  chapitre parent.
- En tête de chaque chapitre : une ligne **Statut** (`🟥 à écrire` /
  `🟧 ébauche` / `🟩 stable`) pour suivre l'avancement.
- Les **faits déjà actés dans le jeu** sont marqués `✅ (dans le jeu)` ; les
  **propositions à valider** sont marquées `💡 (proposition)`.
- Marquer les zones à compléter par `> ❓ À détailler : …` pour que ce soit
  repérable d'un coup d'œil (et par Gemini).

## Statut global

| Chapitre | Statut |
|----------|--------|
| Cadre général (ce fichier) | 🟩 stable (à amender) |
| 01–12 Histoire | 🟥 squelettes posés — **à détailler** |
| Gameplay | 🟥 index posé |

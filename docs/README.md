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
| 12 | [Glossaire & Codex](histoire/12-glossaire-et-codex.md) | Le **Codex** : journal vivant déverrouillable du joueur (7 sections, déverrouillage par étage/Éclat/quête) + socle de référence (glossaire, artefacts, chronologie, index). |
| 13 | [Équilibre, difficulté & progression](histoire/13-equilibre-difficulte-progression.md) | La **doctrine d'équilibrage** reliée à la descente : courbe par acte/tranche, facteurs (Maison, héros, solo/duo, Boucle), récompenses, **validation par simulation**, et **plan d'implémentation**. |
| 14 | [Scénarios de fin & post-game](histoire/14-scenarios-de-fin.md) | Les **fins** : fin « normale » (chute de Voldemort), fins **conditionnelles** (Maison, héros, signatures, Éclats, choix moraux), **vraie fin** (briser le Cycle) ; post-game (Boucle Ténébreuse), écrans de fin, impact Codex, héritage entre runs, et **plan d'implémentation**. |

### ⚙️ Gameplay (`docs/gameplay/`) — documentation de support
| # | Chapitre | Objet |
|---|----------|-------|
| — | [Index gameplay](gameplay/README.md) | Systèmes de jeu en appui du récit (combat, Maisons, équipement, économie, méta). À étoffer si besoin. |

---

## Index doc ↔ module ↔ statut réel

> Vue d'un coup d'œil : pour chaque chapitre Histoire, son **statut réel côté
> code** (✅ livré · 🔧 partiel · 💡 conception) et le(s) **module(s) `js/`**
> qui l'incarnent. Tuer la dérive doc↔code à la racine (Roadmap §1.4 💡1/💡2).
> Chaque chapitre porte aussi un bandeau « 📊 Statut réel (code) » en tête.

| # | Chapitre | Statut réel | Module(s) `js/` principaux |
|---|----------|-------------|----------------------------|
| 01 | Synopsis & pitch | ✅ | *transversal* (récit) — `monsters.js`, `quests*.js`, `endgame.js`, `break-cycle.js` |
| 02 | Univers, ton & canon | ✅ | `floor-themes.js`, `floor-ambiance.js`, `data.js` |
| 03 | Trame principale | ✅ | `monsters.js`, `quests*.js`, `endgame.js`, `break-cycle.js` |
| 04 | Structure : actes & étages | ✅ | `floor-themes.js`, `dungeon.js`, `movement-floors.js`, `floor-events.js` |
| 05 | Personnages jouables | ✅ | `data.js` (`CHARACTERS`), `main.js`, `hero-barks.js` |
| 06 | PNJ & factions | ✅ | `npcs.js`, `npcs-helpers.js`, `npc-dialog.js` |
| 07 | Les Maisons | ✅ | `state.js` (`HOUSE_BONUSES`), `main.js`, `house-donation.js` |
| 08 | Quêtes & sous-intrigues | ✅ | `quests-templates.js`, `quests.js`, `quests-riddles.js`, `potions.js` |
| 09 | Bestiaire & lore | ✅ | `monsters.js`, `ui-bestiary.js`, `dungeon-scaling.js` |
| 10 | Lieux & géographie | ✅ · 🔧 (échos temporels) | `floor-themes.js`, `floor-ambiance.js`, `room-flavor.js`, `renderer*.js` |
| 11 | Mondes Parallèles & Boucle | ✅ | `multiplayer*.js`, `visit-*.js`, `atelier-voyageur.js`, `break-cycle.js` |
| 12 | Glossaire & Codex | ✅ | `codex.js`, `ui-codex.js` |
| 13 | Équilibre & difficulté | ✅ | `dungeon-scaling.js`, `data.js`, `battle*.js`, `tools/sim-difficulty.js` |
| 14 | Scénarios de fin & post-game | ✅ socle · 🔧 (variantes B) | `endgame.js`, `cinematics.js`, `break-cycle.js`, `profile.js` |

> L'index des modules complet (85+ modules, ordre de chargement) vit dans
> [`CLAUDE.md`](../CLAUDE.md) à la racine — verrouillé par
> `node tools/check_doc_modules.js`.

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

> 🧭 **Revue transversale & roadmap** : voir
> [`REVUE-TRANSVERSALE-ET-ROADMAP.md`](REVUE-TRANSVERSALE-ET-ROADMAP.md)
> (état doc↔code, liens entre chapitres, feuille de route 4 phases).

| Chapitre | Statut |
|----------|--------|
| Cadre général (ce fichier) | 🟩 stable (à amender) |
| 01–14 Histoire | 🟩 chapitres rédigés (référence) — **réconciliation doc↔code en cours** (Roadmap Phase 1) |
| 13 Histoire (Équilibre) | 🟩 proposition de référence — à valider |
| 14 Histoire (Fins & post-game) | 🟩 socle **livré** dans le code — contenu de variantes restant à écrire |
| Gameplay (G1–G9) | 🟧 ébauche — à mettre à niveau (systèmes récents non couverts) |

# Gameplay — documentation de support

**Statut :** 🟩 9 chapitres à jour — couvrent les systèmes récents (relecture design en continu)

> Ce dossier documente les **systèmes de jeu** en appui du récit. Il est
> volontairement secondaire par rapport à `docs/histoire/` (priorité au
> narratif). À développer si/quand on en a besoin pour discuter mécaniques.
>
> ℹ️ Une description technique détaillée existe déjà dans `CLAUDE.md` à la
> racine du dépôt ; ce dossier reformule ces systèmes côté **design**,
> sans le code.

## Chapitres
| # | Chapitre | Objet | Statut |
|---|----------|-------|--------|
| G1 | [Boucle de jeu](G1-boucle-de-jeu.md) | Explorer → combattre → s'équiper → descendre ; rythme. | 🟩 à jour |
| G2 | [Combat](G2-combat.md) | Tour par tour, actions, statuts, éléments (résist/faiblesse), capacités ennemies. | 🟩 à jour |
| G3 | [Progression](G3-progression.md) | Niveaux, stats primaires/secondaires, stats dérivées (crit, esquive, Fortune, Célérité). | 🟩 à jour |
| G4 | [Maisons (mécanique)](G4-maisons.md) | Points, paliers, bonus, sets, passifs endgame, don à la Maison. | 🟩 à jour |
| G5 | [Équipement & objets](G5-equipement-objets.md) | 11 slots, raretés, sorts d'équipement, potions & craft, Forge/Biblio. | 🟩 à jour |
| G6 | [Sorts](G6-sorts.md) | Catalogue, éléments, 3 vecteurs d'apprentissage, sorts AoE & utilitaires, Portus. | 🟩 à jour |
| G7 | [Donjon](G7-donjon.md) | Génération, cellules spéciales, évènements d'étage, thèmes, Boucle. | 🟩 à jour |
| G8 | [Difficulté & scaling](G8-difficulte-scaling.md) | 4 difficultés, scaling par étage, taille des groupes, anti-farm, NG+. | 🟩 à jour |
| G9 | [Méta](G9-meta.md) | Ironman + Hall of Fame ; Mondes Parallèles, Atelier du Voyageur. | 🟩 à jour |

> ℹ️ Les 9 chapitres **couvrent les systèmes récents** (Forge, Bibliothèque,
> Concoction de potions, Téléportation Portus, PvP, Événements d'étage, Codex,
> Mondes Parallèles / Atelier du Voyageur) — valeurs sourcées du code. Chaque
> chapitre porte un bandeau « 📊 Statut réel (code) » avec ses modules `js/`.
> Quelques `> ❓ À détailler / 💡 pistes` design restent ouverts par chapitre ;
> le narratif (`docs/histoire/`) reste prioritaire.

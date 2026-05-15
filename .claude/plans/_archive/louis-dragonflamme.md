# Plan — Ajout du héros Louis Dragonflamme

## Contexte
Photo fournie par l'utilisateur : jeune garçon en robe Gryffondor (écharpe
rouge/or, blason). L'utilisateur a explicitement demandé de ne pas se
limiter à la photo pour le choix de la Maison.

## Décisions de design

| Choix | Valeur | Justification |
|-------|--------|---------------|
| Maison | **Poufsouffle** | Précédent canon (Newt Scamander, magizoologiste) ; équilibre roster (3 Gryffondor déjà, 1 seul Poufsouffle) ; rôle "Dompteur de Dragons" colle à l'éthos. |
| Rôle | Dompteur de Dragons | Choisi par l'utilisateur. Mélange ATK + sorts de feu. |
| Stats | Hybride physique/magique | ATK décent, MAG solide, END bonne (résistant aux dragons), LCK moyenne. |
| Sorts initiaux | Expelliarmus, Protego, Incendio, Episkey | Cohérent avec un combattant de créatures (offensif feu + défense + soin léger). |
| Équipement | Baguette d'Acacia, Robe de Poufsouffle, Brassard d'Écailles | Thème "écailles de dragon" pour les accessoires. |
| Tagline | "Dompteur de dragons — sa baguette pulse au rythme du feu." | — |

### Stats détaillées
Comparé aux autres : entre Harry (combattant pur) et Iris (Poufsouffle prismatique).

| Stat | Valeur | Note |
|------|--------|------|
| HP   | 33     | Robuste mais < Harry (35) |
| SP   | 26     | Mage moyen |
| STR  | 8      | Plus fort qu'un mage classique |
| INT  | 12     | Connaît ses dragons |
| AGI  | 11     | Moyen |
| END  | 10     | Égale à Harry — résistance face aux flammes |
| LCK  | 13     | Sous Iris (18) |
| MAG  | 12     | Moyen |
| ATK  | 5      | Égal à Harry |
| DEF  | 2      | Standard |

## Étapes

1. ✅ Plan rédigé (ce fichier)
2. ✅ Portraits générés
   - `img/louis-original.png` : crop 128x128 Lanczos centré sur le visage
     → vérifier visuel : ✅ photo nette
   - `img/louis.png` : photo masquée r=50 + anneau de `maxence.png` (r≥50)
     → vérifier visuel : ✅ médaillon cohérent avec les autres garçons
3. ⏳ Ajouter `CHARACTERS.louis` dans `js/data.js` (après `anastasia`)
   → vérifier : `node -e "const fs=require('fs');…"` ou via smoke
4. ⏳ Ajouter `<button class="hero-card" data-key="louis" …>` dans
   `index.html#hero-grid`, badge n°7
   → vérifier : ouverture du jeu, sélection visible
5. ⏳ Lancer `node tests/smoke.js`
   → vérifier : tous les scénarios verts (aucun n'utilise `louis`
     directement, donc régression = bug critique)
6. ⏳ Commit + push sur `claude/add-louis-dragonflamme-W2BUU`
   → vérifier : `git status` propre, push OK, branche distante à jour

## Notes
- Les 11 slots d'équipement sont initialisés vides par
  `_hydrateCharacter` (cf. CLAUDE.md), pas besoin de toucher state.js.
- Aucun câblage spécial à prévoir : combats, sauvegardes, équipement,
  quêtes utilisent tous `party[0]/party[1]/player` hydratés
  dynamiquement depuis `CHARACTERS[key]`.

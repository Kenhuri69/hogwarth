# Ajout du personnage joueur — Anastasia Moonveil

## Contexte
Nouveau personnage jouable, magicienne, à intégrer à l'écran de sélection
des héros à côté de Harry, Hermione, Céleste, Iris, Maxence.

Portrait fourni par l'utilisateur : jeune sorcière brune à lunettes bleues,
robe et écharpe de Gryffondor, baguette étincelante, livre ouvert sur
« Wingardium Leviosa ». Thématique « Moonveil » = voile de lune (magie
protectrice / lumineuse).

## Décisions
- **Maison** : Gryffondor (confirmé visuellement par le blason et l'écharpe).
- **Rôle** : Mage de la Lune — équilibrée INT/MAG, polyvalente.
- **Sorts de départ** : Episkey, Protego, Wingardium Leviosa, Lumos Maxima
  (clin d'œil au livre ouvert sur la page Wingardium Leviosa).
- **Stats** (entre Hermione pure-mage et Iris polyvalente) :
  hp:30, sp:32, str:7, int:16, agi:11, end:8, lck:13, mag:15, atk:4, def:2.
- **Portrait** : `img/anastasia.png`, recadré + redimensionné à 128×128
  comme les autres portraits.

## Étapes
1. Générer `img/anastasia.png` (128×128) à partir de l'upload utilisateur
   → verify: `file img/anastasia.png` retourne `128 x 128`.
2. Ajouter l'entrée `anastasia` dans `CHARACTERS` (`js/data.js`)
   → verify: `node -e "require('./js/data.js')"` (n/a — pas de modules),
     vérifier visuellement que la structure suit les autres entrées.
3. Ajouter la `hero-card` correspondante dans `index.html`
   → verify: le bouton apparaît dans l'écran de sélection après chargement.
4. Lancer `node tests/smoke.js` → verify: tous les tests passent.
5. Commit + push sur `claude/add-anastasia-character-mcGAK`.

## Notes
- Aucune logique de combat ni de save à modifier : tout passe par
  `_hydrateCharacter()` dans `main.js` qui lit `CHARACTERS[key]`.
- Pas besoin d'icône SVG dédiée (les héros utilisent leur portrait PNG).
- Pas de portrait SVG NPC nécessaire (Anastasia est une héroïne, pas un PNJ).

## Suivi — followup médaillon

**Écart constaté** : la première passe a livré `anastasia.png` en crop brut,
sans le cadre doré façon médaillon que portent `celeste.png` / `iris.png` /
`maxence.png` (un double anneau or + gemmes cardinales, le crop brut étant
conservé en `<key>-original.png`).

**Correction** :
- `img/anastasia-original.png` ← crop brut 128×128 (ancien `anastasia.png`).
- `img/anastasia.png` ← médaillon doré généré par PIL :
  cercle photo r≤50, anneau or vif r=52-54, gap, anneau or moyen r=57-60,
  bord or sombre r=61-63, 4 gemmes N/S/E/O. Couleurs reprises de maxence
  (#f0d782 vif, #c9a84c moyen, #8a6926 sombre).
- Règle d'ajout d'un héros documentée dans `CLAUDE.md` (section
  "Ajouter un nouveau personnage jouable") pour qu'une prochaine session
  livre les deux fichiers d'office.

## Suivi — followup médaillon féminin

**Écart constaté** : la 2ᵉ passe avait livré un médaillon « masculin » (or
uni aux 4 points cardinaux, façon Maxence) pour Anastasia, alors que
Céleste et Iris portent des **gemmes colorées N/S** réservées aux
héroïnes féminines.

**Correction** : Anastasia reçoit désormais des gemmes **bleu lunaire
argenté** (`#aac8eb` clair / `#5a78af` rim) aux points N/S — couleur
distincte du bleu sourd de Céleste et du violet d'Iris, en accord avec
son thème « Moonveil ». Les E/O restent en or sobre comme chez les autres
héroïnes. La règle dans `CLAUDE.md` précise désormais cette dichotomie
fille (gemme colorée N/S) vs garçon (or uni).

## Suivi — 3ᵉ passe : anneau identique à Céleste/Iris

**Écart constaté** : malgré la palette correcte, mon anneau or régénéré
de zéro avait un profil différent de celui de Céleste/Iris (ring plat,
pic absent). Analyse pixel-par-pixel : leur anneau or fait 5 px de large
au milieu avec un pic blanc-or `#ecd692` au centre, encadré de bandes
plus sombres ; le mien était mid-gold uni de 4 px.

**Correction définitive** : on transplante directement la **couche
d'anneau de Céleste** (pixels r ≥ 50 depuis le centre) sur la photo
d'Anastasia masquée en rond. Puis on remappe par luminance les pixels
de gemmes bleues vers une palette **bleu glacé argenté** (highlight
`#f5fafc`, light `#d7e8f5`, mid `#afcde6`, dark `#82aad2`, deep
`#5a82af`). Résultat : structure d'anneau exactement identique à
Céleste/Iris (au pixel près), gemmes nettement distinctes.

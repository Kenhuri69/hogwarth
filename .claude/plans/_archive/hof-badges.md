# Hall of Fame — Badges niveau / étage / blason de Maison

Petite amélioration visuelle du classement (`#hof-list`) : remplacer
la ligne texte « Étage X · Niv. Y » par des **chips** distinctes,
et ajouter un **blason de Maison** rond à côté du portrait du joueur,
dans le style du `#crest-wrap` ingame.

## État actuel
- `_renderHallOfFame()` rend chaque ligne en un seul `<div class="hof-meta">`
  texte : `heroes · difficulty · Étage X · Niv. Y`.
- L'entrée HoF ne contient **pas** de champ `house` :
  - `ironmanResultToEntry()` (`ironman.js`) → 10 champs, aucun pour la Maison.
  - `_hofSubmit()` (`hall-of-fame.js`) → 10 champs envoyés à Supabase.
  - `_hofBuildProjection()` → 6 champs, idem.
- Table Supabase `leaderboard` : pas de colonne `house`.

## Décisions utilisateur
- **Badges Maison** : approche « Persister + migration SQL ». Les
  nouvelles soumissions enverront `house`. L'utilisateur lance la
  migration `ALTER TABLE leaderboard ADD COLUMN house TEXT;` sur
  Supabase avant déploiement (sinon les inserts échouent en 400).
  Les anciennes entrées (sans `house`) afficheront un blason
  placeholder neutre.
- **Style niveau/étage** : chips colorés à droite du portrait, style
  cohérent avec la fiche perso (bordure dorée discrète + icône PNG).

## Étapes

> Statut au 2026-05-23 : **toutes les étapes ci-dessous sont
> terminées**. Test smoke `node tests/smoke.js` vert. Captures
> visuelles dans `tests/hof-desktop.png` + `tests/hof-mobile.png`.
> Migration SQL côté Supabase reste à lancer par l'utilisateur.

### 1. Données — propager `house` partout
- `ironman.js — ironmanResultToEntry()` : ajouter `house: chosenHouse`.
- `hall-of-fame.js — _hofSubmit()` : inclure `house` dans le body POST.
- `hall-of-fame.js — _hofBuildProjection()` : ajouter `house: chosenHouse`.
- Vérification : un entry stocké en local possède `entry.house` = nom
  de la Maison choisie (ou `null` si aucune).

### 2. Rendu — chips niveau/étage + blason Maison
- `_hofHouseBadge(house)` (nouveau helper) : retourne un `<span>` rond
  avec `<img>` du blason `img/houses/<house>.png`. Si `house` absent →
  retourne un placeholder neutre (`<span class="hof-house-badge hof-house-empty">·</span>`).
- `_renderHallOfFame()` :
  - Insérer le blason de Maison juste après le portrait du sorcier
    (entre `.hof-heroes` et `.hof-main`).
  - Remplacer la ligne `Étage X · Niv. Y` du `.hof-meta` par deux chips
    HTML : `.hof-chip-floor` et `.hof-chip-level`.
  - Garder la difficulté et les noms des héros dans `.hof-meta` (1 ligne).

### 3. CSS (`css/style.css`)
- `.hof-house-badge` : disque ~32px, bordure dorée, fond sombre, image
  `object-fit: contain` (s'adapte au PNG transparent).
- `.hof-house-empty` : variante grise pour les entrées legacy.
- `.hof-chips` : flex container right-aligned.
- `.hof-chip` : pill 11px, padding 2-6px, bordure `--gold-dark`,
  fond `#1a0f05`, gap 4px avec icône.
- `.hof-chip-floor` / `.hof-chip-level` : variantes d'accent (couleur).
- Adaptations mobile (`@media (max-width: 700px)`) : passe en colonne
  ou cache certaines chips si overflow.

### 4. Tests
- `tests/smoke.js — scenarioIronman` :
  - Avant T5 : pose `chosenHouse = 'Gryffondor'`.
  - T5 : asserter `entry.house === 'Gryffondor'`.
  - T6 : asserter la présence de `.hof-house-badge img` avec
    `src` contenant `gryffondor.png`, et présence de `.hof-chip-floor`
    + `.hof-chip-level`.

### 5. Documentation
- CLAUDE.md : actualiser le bloc Hall of Fame (mention de la colonne
  `house` à migrer).

## Vérification finale
- `node tests/smoke.js` vert.
- Capture visuelle manuelle : Hall of Fame affiche le blason coloré
  + chips niveau/étage à droite du portrait. Le score reste lisible.

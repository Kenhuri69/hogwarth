# Plan — Mode Ironman + Hall of Fame

> Statut : **EN COURS** — plan vivant, mis à jour à chaque étape (cf. guidelines §5).

## Objectif

Ajouter un mode **Ironman** (vie unique) cumulable avec une difficulté
verrouillée, un **écran de résultat chiffré** à la mort, et un **Hall of
Fame** en ligne (Supabase) listant le top 10 mondial, accessible depuis
l'écran de départ.

## Décisions validées (questions utilisateur)

1. **Ironman = toggle** par-dessus une difficulté (Facile→Expert). La
   difficulté donne le multiplicateur de score ; Ironman ajoute la vie
   unique. La difficulté est verrouillée pour toute la partie.
2. **Écran de résultat = Ironman uniquement.** Les modes normaux gardent
   la pétrification + `resurrect()`.
3. **Stockage = Supabase** (classement en ligne partagé). Repli local
   (`localStorage`) systématique si Supabase non configuré / hors-ligne.

## Modèle de score

```
base = monstersKilled        × 10
     + deepestFloor          × 100
     + questsCompleted       × 150
     + Σ partyLevels         × 50
     + gold (courant)        × 0.5
     + Σ featPoints (boss)
score = round(base × difficultyMultiplier)
```

Multiplicateurs de difficulté (alignés sur la grille points-Maison) :
`Facile 0.8 · Normal 1.0 · Difficile 1.4 · Expert 1.8`.

**Faits d'armes** = boss nommés vaincus, chacun rapporte un bonus fixe
(`BOSS_FEATS`, ex. Troll des Cavernes, Basilic Mineur, Nagini, Ombre de
Quirrell, Bellatrix, Voldemort Affaibli/Ressuscité…). IDs exacts vérifiés
sur `monsters.js` au moment de l'implémentation.

## Étapes

### 1. État & persistance
- `state.js` : `let ironmanMode = false`, `let totalKills = 0`,
  `let defeatedBosses = new Set()`.
- `save.js` : sérialiser/restaurer ces 3 globals dans
  `_serializeState`/`_applyState` (`defeatedBosses` → `Array.from`).
- `loader.js` : ajouter les globals critiques au MANIFEST.
- **Vérif** : `node tests/smoke.js` vert ; save/load conserve les valeurs.

### 2. Toggle Ironman + difficulté verrouillée
- `index.html` étape 3 (`#difficulty-select`) : ajouter une case
  `#ironman-toggle` avec libellé explicatif (vie unique, score classé).
- `main.js — startGame()` : lire la case → `ironmanMode`.
- `ui.js — changeDifficulty()` : refuser si `ironmanMode` (message).
- **Vérif** : démarrer une partie Ironman, le sélecteur de difficulté en
  jeu est inopérant.

### 3. Compteurs de score
- `battle.js — endBattle(won)` : pour chaque ennemi vaincu,
  `totalKills++` et `if (BOSS_FEATS[e.id]) defeatedBosses.add(e.id)`.
- Étage le plus profond : réutiliser `Math.max(...visitedFloors)`.
- **Vérif** : tuer des monstres incrémente `totalKills` (smoke).

### 4. `js/ironman.js` (nouveau module)
- `BOSS_FEATS` (map id→{label, points}), `DIFFICULTY_SCORE_MULT`.
- `computeIronmanScore()` → `{ score, breakdown }` (pur).
- `buildIronmanResult()` → objet résultat complet (héros, difficulté,
  étage, niveaux, kills, quêtes, or, faits d'armes, score).
- `showIronmanResult()` → peuple et affiche `#ironman-result-screen`.
- **Vérif** : score cohérent avec le breakdown affiché.

### 5. Branche mort Ironman
- `battle.js — triggerDeath()` : si `ironmanMode` →
  `showIronmanResult()` au lieu du `#death-screen` classique.
- Mort Ironman = définitive : supprimer le slot `auto` de la partie
  (anti-reload post-mortem). Save-scum pré-mortem non bloqué (hors scope,
  noté comme limitation).
- **Vérif** : mort en Ironman → écran résultat ; mort en Normal →
  pétrification inchangée.

### 6. Écran de résultat Ironman
- `index.html` : `#ironman-result-screen` (overlay) — titre « ✝ Mort ✝ »,
  liste chiffrée du breakdown, score final, champ `#hof-name-input`,
  bouton « Soumettre au Hall of Fame », bouton « Nouvelle partie ».
- `css/style.css` : style minimal réutilisant le thème parchemin/or.
- **Vérif** : visuel testé en headless.

### 7. `js/hall-of-fame.js` (nouveau module)
- `HOF_CONFIG = { supabaseUrl, supabaseAnonKey, tableName }` (vide par
  défaut → repli local).
- `submitScore(result, name)` : POST REST Supabase ; échec/non-configuré
  → écrit dans `localStorage['hogwarts_rpg_hof']`.
- `fetchTopScores(limit=10)` : GET REST `order=score.desc&limit=10` ;
  repli → lecture locale triée.
- Toujours écrire aussi en local (Hall of Fame perso même hors-ligne).
- **Vérif** : sans config Supabase, soumission + lecture fonctionnent en
  local.

### 8. Bouton & écran Hall of Fame
- `index.html` : bouton « 🏆 HALL OF FAME » dans `#start-hub-screen`
  (sous le bouton import) ; `#hall-of-fame-screen` listant le top 10
  (rang, nom, héros, difficulté, étage atteint, niveaux, score).
- `hall-of-fame.js — openHallOfFame()` / `closeHallOfFame()`.
- État chargement / liste vide / erreur réseau gérés.
- **Vérif** : ouvrir le Hall of Fame depuis le hub affiche la liste.

### 9. Câblage chargement
- `index.html` : ajouter `ironman.js` et `hall-of-fame.js` à l'ordre des
  `<script>` (après `save-ui.js`, avant `main.js`).
- **Vérif** : `window.__loaderReport.ok === true`.

### 10. Tests
- `tests/smoke.js` : nouveau scénario — démarrer en Ironman, vérifier
  `ironmanMode`, simuler la mort → `#ironman-result-screen` visible,
  vérifier le calcul du score, ouvrir le Hall of Fame.
- **Vérif** : `node tests/smoke.js` entièrement vert.

### 11. Documentation
- Mettre à jour `CLAUDE.md` (nouveaux modules, globals, section Ironman).

## Action requise côté utilisateur — Setup Supabase

À faire dans un projet Supabase gratuit (puis coller `Project URL` +
`anon public key` dans `HOF_CONFIG` de `js/hall-of-fame.js`) :

```sql
create table leaderboard (
  id bigint generated always as identity primary key,
  created_at      timestamptz default now(),
  player_name     text not null,
  score           int  not null,
  difficulty      text not null,
  heroes          text not null,
  deepest_floor   int  not null,
  party_levels    text not null,
  monsters_killed int  not null,
  quests_completed int not null,
  gold            int  not null
);
alter table leaderboard enable row level security;
create policy "public read"   on leaderboard for select using (true);
create policy "public insert" on leaderboard for insert with check (true);
```

La clé `anon` est conçue pour être publique ; RLS limite aux opérations
`select` + `insert`. Limitation connue : un POST direct sur l'API REST
peut injecter un faux score (acceptable pour un jeu hobby ; durcissement
possible plus tard via Edge Function).

## Limitations connues / hors scope
- Pas de protection anti save-scum avant la mort (seul le reload
  post-mortem est bloqué via suppression du slot `auto`).
- Pas de modération des noms soumis au classement en ligne.

# Plan — Icônes Ironman + identité joueur + UID de run

> Statut : **TERMINÉ** (code + smoke test 76 scénarios verts + e2e Supabase
> live vérifié). Branche `claude/ironman-icons-name-flow`.
> Suite de `.claude/plans/ironman-hall-of-fame.md`.

## Décisions validées

1. **Mort = permadeath stricte** : suppression de TOUS les slots de la
   partie Ironman (auto + manuels, repérés via `state.ironmanMode`).
2. **UID de run** : chaque partie Ironman porte un identifiant unique
   (`ironmanRunId`), persisté dans le save et envoyé à la base. Si un
   save Ironman n'a pas d'UID → généré. Au chargement et au calcul du
   résultat de mort, on vérifie qu'aucun score n'existe déjà pour cet
   UID (anti double-classement). Garde-fou dur : index unique sur
   `leaderboard.run_id` (déjà appliqué côté base).
3. **Identité joueur** : pseudonyme persistant en `localStorage`
   (`hogwarts_rpg_player_name`). Pas de compte/auth.
4. **Icônes** : jeu complet — emblème Ironman, trophée, 3 médailles
   (or/argent/bronze), PNG 64×64 dorés cohérents avec `img/icons/`.

## Étapes

### 1. Icônes PNG (`tools/gen_ironman_icons.py`)
- Script Pillow procédural calqué sur `gen_intro_icons.py` (supersample,
  dégradé métal, contour, spéculaire, halo). `finalize(mask, palette)`
  paramétré pour or/argent/bronze.
- Génère `img/icons/` : `ironman.png` (crâne), `trophy.png` (coupe),
  `medal_gold.png`, `medal_silver.png`, `medal_bronze.png`.
- **Vérif** : 5 PNG produits, visuels relus en capture.

### 2. Câblage des icônes
- `index.html` : toggle Ironman, titre écran de résultat, bouton hub,
  titre Hall of Fame → `<img class="ui-icon">`.
- `hall-of-fame.js` : rangs 1/2/3 → médailles PNG, rang 4+ → `#n`.
- **Vérif** : icônes visibles en capture.

### 3. Pseudonyme persistant
- `hall-of-fame.js` : `getPlayerName()` / `setPlayerName()` (localStorage).
- `showIronmanResult()` : pré-remplit `#hof-name-input` ; libellé
  « Choisis ton nom » si vide, « Confirme ton nom » sinon.
- `submitIronmanScore()` : persiste le nom saisi avant l'envoi.
- **Vérif** : nom conservé entre deux parties.

### 4. UID de run
- `state.js` : `let ironmanRunId = null;`.
- `ironman.js` : `_genRunId()` (`crypto.randomUUID` + repli).
- `main.js — startGame` : génère l'UID si `ironmanMode`.
- `save.js` : sérialise/restaure `ironmanRunId` ; si save Ironman sans
  UID → génération à `_applyState`.
- **Vérif** : UID stable sur round-trip save ; régénéré si absent.

### 5. Anti double-classement
- Base : `run_id text` + index unique (déjà fait via Management API).
- `hall-of-fame.js` : `_hofFindByRunId(id)` (REST + repli local).
- `submitIronmanScore()` : envoie `run_id` ; gère le 409 (doublon).
- `showIronmanResult()` : vérifie l'UID avant d'activer la soumission ;
  affiche « run déjà classé » le cas échéant.
- `_applyState` : vérification asynchrone au chargement d'un save Ironman.
- **Vérif** : 2ᵉ soumission du même UID refusée.

### 6. Permadeath stricte
- `save.js` : `deleteIronmanSlots()` (scan slots `state.ironmanMode`).
- `showIronmanResult()` appelle `deleteIronmanSlots()` au lieu de
  `deleteSlot('auto')`.
- **Vérif** : tous les slots Ironman supprimés à la mort.

### 7. Loader + tests + doc
- `loader.js` : nouveaux globals au MANIFEST.
- `tests/smoke.js` : étend `scenarioIronman` (UID, pseudo, permadeath,
  dedup local).
- `CLAUDE.md` : section Ironman mise à jour.
- **Vérif** : `node tests/smoke.js` vert ; e2e Supabase.

### 8. Équité du score (ajout post-revue)
- `PARTYSIZE_SCORE_MULT = { 1:1.3, 2:1.0 }` — bonus solo (plus exigeant).
- Plafond anti-farm : `killsCrédités = min(totalKills, étageMax×12)`.
- Poids de la profondeur relevé (`×100 → ×150`) pour recentrer le score
  sur la progression réelle plutôt que le grind.
- `computeIronmanScore` expose `partyMult`, `killsCounted`, `killsCapped` ;
  l'écran de résultat affiche les deux multiplicateurs + la note de plafond.
- **Vérif** : smoke T3/T3b (raw 2000, score 3640, plafond 48, mult solo/duo).
- Note : pas de handicap par héros — un score recentré sur la profondeur
  s'auto-corrige (un héros fort descend plus loin légitimement).

## Action utilisateur
Révoquer le Personal Access Token Supabase (plus nécessaire après l'ALTER).

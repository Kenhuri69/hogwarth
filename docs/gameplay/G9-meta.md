# G9 — Méta

**Statut :** 🟧 ébauche

> Objectif du chapitre : décrire les couches qui dépassent une partie
> individuelle — le mode Ironman (permadeath + score), le Hall of Fame
> (classement mondial) et les Mondes Parallèles / Cheminette Inter-Mondes
> (visites asynchrones entre donjons de joueurs réels).

---

## Vue d'ensemble

✅ (dans le jeu) Le jeu propose trois systèmes « méta » qui enrichissent
l'expérience au-delà d'une progression solo classique :

1. **Mode Ironman** — une seule vie, un score chiffré à la mort, permadeath
   stricte (aucun rechargement). Cumulable avec n'importe quelle difficulté ;
   la difficulté est ensuite **verrouillée** pour toute la partie.
2. **Hall of Fame** — classement mondial des scores Ironman, stocké via
   Supabase REST avec repli automatique sur `localStorage`. Accessible depuis
   le hub de démarrage et l'écran de résultat.
3. **Mondes Parallèles / Cheminette Inter-Mondes** — visites asynchrones
   inter-mondes : un joueur (le visiteur) se téléporte dans le donjon d'un
   autre joueur en ligne (le host) via le sort **Cheminette Inter-Mondes**.
   Transport REST polling sur Supabase ; philosophie zéro-dépendance,
   zéro Realtime SDK. Exclusif au mode normal (interdit en Ironman).

Ces trois systèmes cohabitent avec la **sauvegarde multi-slots** (voir le
chapitre G7 — Sauvegarde) qui constitue leur socle de persistance.

---

## Fonctionnement

### Mode Ironman

✅ (dans le jeu — `js/state.js`, `js/ironman.js`)

Le mode Ironman est activé à l'écran de difficulté (case `#ironman-toggle`)
**avant** de lancer une nouvelle partie. Une fois coché :

- La difficulté choisie est **verrouillée** : `changeDifficulty()` refuse
  toute modification si `ironmanMode` est vrai.
- À chaque combat gagné, `recordIronmanKills(enemies)` incrémente le compteur
  `totalKills` et enregistre les boss nommés dans `defeatedBosses` (Set).
- `ironmanRunId` — un UUID généré à l'ouverture du run — est persisté dans
  le save et envoyé au Hall of Fame pour prévenir le double-classement.

**À la mort du groupe**, au lieu de l'écran de pétrification habituel,
`showIronmanResult(cause)` s'affiche : c'est l'écran de résultat définitif.
Aucun rechargement n'est possible : `deleteIronmanSlots()` supprime
immédiatement **tous** les slots de sauvegarde dont `state.ironmanMode` est
vrai (auto + manuels). La mort est permanente.

### Hall of Fame

✅ (dans le jeu — `js/hall-of-fame.js`)

L'écran `#hall-of-fame-screen` affiche le **top 10** des scores Ironman.
Il est accessible depuis le hub de démarrage (`openHallOfFame()`) et depuis
l'écran de résultat. Pendant une partie Ironman active, `openHofProjection()`
permet de consulter une **simulation de rang** — le score projeté du run
en cours est inséré à sa position dans le classement avec l'étiquette
« simulation ».

Le joueur saisit (ou confirme) son **pseudonyme** (24 caractères max,
persisté dans `localStorage` via `setPlayerName()`/`getPlayerName()`) avant
la soumission. Le bouton de soumission ne s'active qu'après vérification
que l'UID du run n'est pas déjà classé.

### Mondes Parallèles / Cheminette Inter-Mondes

✅ (dans le jeu — `js/multiplayer.js`, `js/multiplayer-visits.js`,
`js/visit-channel.js`, `js/portal-matchmaking.js`)

Déclenchement via le sort **Cheminette Inter-Mondes** (niveau 8, 25 PM,
**exclu en Ironman** et désactivé si `MP_CONFIG.parallelWorldsEnabled = false`).

Le flux se déroule en huit étapes (A→H) :

| Étape | Rôle |
|-------|------|
| **A** — Sort | Le visiteur lance la Cheminette → animation portail → ouverture de la modale de destinations (`openPortalTargetModal()`). |
| **B** — Matchmaking | Le visiteur liste les hosts disponibles (`mpListAvailableHosts`) et pose une demande dans `mp_visit_requests` (TTL 60 s). Le host reçoit la demande via poll (~3 s) et a **30 s** pour accepter ou refuser. |
| **C** — Snapshot | Le host poste un instantané de son donjon (`mpBuildVisitSnapshot`) sur `mp_visit_messages`. Le visiteur l'applique (`mpApplyVisitSnapshot`) puis le bandeau `#visit-hud` s'allume. |
| **D** — Position / emotes | Les positions sont échangées (throttle ~1,2 s) et les sprites visiteur/host sont affichés dans chaque donjon respectif. |
| **E** — PNJ voyageur | Un PNJ « voyageur » (npc-dialog.js) représente le visiteur dans le donjon du host, avec ses propres dialogues. |
| **F** — Qualité réseau / reconnect | `visit-channel.js` surveille la qualité (paliers good / degraded / lost) et tente de reconnecter. Timeout automatique. Le host peut activer `visitsClosed` pour refuser de nouveaux visiteurs (`#btn-visits`). |
| **G** — Combat astral | Le visiteur peut affronter des **échos** du donjon hôte (monstres spectraux). Limite : 3 combats astraux par étage (`engageAstralCombat`). |
| **H** — Verrous de Sang | Le visiteur peut poser un **Verrou de Sang** sur une case (`mpPostBloodSeal` → `mp_threats`). Le host le résout ; le visiteur réclame sa récompense (`mpClaimSeal`). Accessible depuis l'**Atelier du Voyageur** (`#btn-atelier`). |

---

## Règles & valeurs

### Score Ironman — formule et multiplicateurs

✅ (dans le jeu — `js/ironman.js — computeIronmanScore`)

```
score = round(base × mult_difficulté × mult_groupe)

base = (killsCrédités × 10)
     + (étageMax      × 150)
     + (quêtesTerminées × 150)
     + (niveauAtteint  × 50)
     + floor(or × 0.5)
     + Σ points des faits d'armes

killsCrédités = min(totalKills, étageMax × 12)   ← plafond anti-farm
```

**Multiplicateurs de difficulté** (`DIFFICULTY_SCORE_MULT`, `js/ironman.js`) :

| Difficulté | Multiplicateur |
|------------|---------------|
| Facile     | ×0.8          |
| Normal     | ×1.0          |
| Difficile  | ×1.4          |
| Expert     | ×1.8          |

**Multiplicateur de groupe** (`PARTYSIZE_SCORE_MULT`, `js/ironman.js`) :

| Mode | Multiplicateur | Justification |
|------|---------------|---------------|
| Solo | ×1.3 | Un seul tour d'action par segment, pas de soigneuse dédiée |
| Duo  | ×1.0 | Référence |

**Plafond anti-farm** (`KILLS_PER_FLOOR_CAP = 12`) : les kills crédités
sont bornés à `étageMax × 12`. Poncer un étage via le respawn n'augmente
plus le score ; seule la descente (atteindre un étage plus profond) débloque
davantage de kills comptabilisables. La profondeur (×150 par étage) est
volontairement le poste le plus lourd pour recentrer le classement sur la
progression réelle.

### Faits d'armes (`BOSS_FEATS`)

✅ (dans le jeu — `js/ironman.js — BOSS_FEATS`)

Certains boss nommés accordent un **bonus de points fixe** ajouté à la base :

| Boss | Label | Bonus |
|------|-------|-------|
| `troll_grotte` | Troll des Cavernes terrassé | +200 pts |
| `strigoi` | Strigoï Ancien purifié | +250 pts |
| `basilic` | Basilic Mineur abattu | +300 pts |
| `hecate_sorciere` | Hécate la Maudisseuse vaincue | +350 pts |
| `chimere` | Chimère de Poudlard domptée | +350 pts |
| `ombre_quirrell` | Ombre de Quirrell dissipée | +400 pts |
| `nagini` | Nagini exterminée | +450 pts |
| `bellatrix` | Bellatrix Lestrange vaincue | +600 pts |
| `voldemort_affaibli` | Voldemort Affaibli repoussé | +800 pts |
| `voldemort_revenu` | Voldemort Ressuscité défait | +1 500 pts |

### Hall of Fame — stockage et badges

✅ (dans le jeu — `js/hall-of-fame.js — HOF_CONFIG`)

- **Stockage** : API REST Supabase (projet `hvdthitluhgevtuqhxpm`, table
  `leaderboard`). Si Supabase est inaccessible ou non configuré, repli
  automatique sur `localStorage` (`hogwarts_rpg_hof`, plafond 50 entrées).
  Un score soumis est **toujours** écrit en local.
- **Anti-doublon** : chaque entrée porte `run_id = ironmanRunId`. Un index
  unique côté base bloque tout doublon (réponse 409). Côté client,
  `verifyIronmanRunNotScored()` (à la mort) et `_hofPrecheckRunOnLoad()`
  (au chargement du save) vérifient en amont.
- **Badges d'affichage** : chaque ligne du classement porte :
  - Le **blason de Maison** du joueur (PNG rond `img/houses/<maison>.png`).
    Les entrées antérieures à la migration de la colonne `house` affichent
    un placeholder pointillé neutre.
  - Deux chips : `🗺️ Ét.X` (étage le plus profond) et `📈 Niv.Y` (niveau
    atteint).
  - Les portraits des héros résolus depuis `CHARACTERS`.

### Mondes Parallèles — feature flag et périmètre

✅ (dans le jeu — `js/multiplayer.js — MP_CONFIG.parallelWorldsEnabled`)

```js
MP_CONFIG.parallelWorldsEnabled = true   // bascule maître
```

À `false`, le sort Cheminette est refusé avec message, le poll des visites
entrantes (`_mpVisitsAttach`) ne démarre pas, et les boutons `#btn-visits` /
`#btn-atelier` sont masqués au `DOMContentLoaded`. Le reste du multijoueur
(présence fantôme, social, duels) n'est pas affecté.

**Conditions pour être host disponible** (`mpListAvailableHosts`) :
- Mode `normal` (pas Ironman).
- Statut `exploring` (pas `in_battle` ni `closed`).
- `last_seen` dans la dernière heure.
- Pas le joueur lui-même.

**Transport** : REST polling Supabase, sans Realtime SDK (philosophie
zéro-dépendance du projet). Cadences clés : heartbeat présence 8 s,
poll des visites entrantes ~3 s, ping canal 4 s, throttle de position 1,2 s.

### Atelier du Voyageur

✅ (dans le jeu — `js/atelier-voyageur.js`, bouton `#btn-atelier`)

Accessible depuis le donjon dès `houseTier ≥ 17` et pendant une visite active.
Quatre onglets : souvenirs de voyage, cosmétiques, sorts cross-plan et gestion
des Verrous de Sang. Les **souvenirs** et **cosmétiques** obtenus chez un host
persistent dans le save du visiteur (sérialisés).

---

## Interactions

- **G3 Progression** : le niveau atteint et l'étage le plus profond figurent
  tous les deux dans la formule de score. Un run Ironman bénéficie directement
  d'un jeu optimisé en stats.
- **G4 Maisons** : la Maison choisie est enregistrée dans le classement (champ
  `house`) et affichée via le blason. Les passifs Apothéose (tier 18+) sont
  actifs en Ironman — ils peuvent faire la différence face aux boss qui
  accordent des faits d'armes.
- **G5 Équipement** : un équipement solide allonge la survie et la descente,
  donc le score. En mode Ironman, le duel PvP contre un fantôme (mode normal
  uniquement) permet de copier un équipement ou un sort de l'adversaire vaincu.
- **G7 Sauvegarde** : `deleteIronmanSlots()` supprime tous les slots Ironman
  à la mort — aucun mécanisme de rechargement ne subsiste. En mode normal,
  l'auto-save standard continue de fonctionner pendant une visite.
- **G8 Difficulté & scaling** : le multiplicateur de difficulté est aligné
  sur la grille de points de Maison par kill (8/10/14/18 → ratio 0.8/1.0/1.4/1.8).
  Un run Expert dure en moyenne moins longtemps mais vaut 1,8× plus par étage.

---

## Cas limites & garde-fous

✅ (dans le jeu)

- **Ironman + duel PvP** : en mode Ironman, perdre un duel contre un fantôme
  déclenche `showIronmanResult()` — la mort est définitive. Avant l'engagement,
  une sous-vue de confirmation (`_mpRenderIronmanDuelConfirm`) affiche l'écart
  de niveau et prévient explicitement de la conséquence permanente.
- **Double-classement** : l'index unique `run_id` côté Supabase bloque tout
  doublon (409). Côté client, le bouton de soumission est désactivé si
  `_ironmanRunScored` est vrai. Les deux vérifications (à la mort et au
  chargement) sont asynchrones et défensives.
- **Plafond anti-farm actif** : si `killsCounted < totalKills`, l'écran de
  résultat affiche explicitement la note « Kills comptabilisés : X — plafond
  anti-farm (étage atteint × 12) » pour que le joueur comprenne pourquoi ses
  kills ne se reflètent pas entièrement dans le score.
- **Disjoncteurs Mondes Parallèles** : chaque table Supabase manquante (404)
  désactive silencieusement la fonctionnalité concernée avec un message
  contextuel. Le disjoncteur global (`_mpFailCount ≥ 3`) éteint toute la
  session multijoueur sans affecter le jeu solo. Les Verrous de Sang dont le
  POST initial a échoué sont ré-tentés à la prochaine connexion
  (`_retryOrphanSeals`).
- **Visites et Ironman** : `parallelWorldsEnabled()` retourne `false` dès que
  `ironmanMode` est vrai — le sort Cheminette est refusé avec message. Aucun
  état de visite ne peut être appliqué sur un run Ironman en cours.
- **Session multijoueur sous `file://`** : `_mpConfigured()` retourne `false`
  en protocole `file:` (tests smoke, dev local). Aucun appel réseau n'est
  tenté — le jeu est intégralement fonctionnel offline.
- **Classement offline** : si Supabase est inaccessible, `_hofFetchTop`
  bascule sur le classement `localStorage`. L'indicateur de source est
  affiché en pied de classement (`Hors-ligne — classement local affiché`).

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : détail du cycle de vie d'un Verrou de Sang (pose,
> résolution par le host, réclamation par le visiteur, TTL 30 jours,
> gestion des Verrous orphelins) — à documenter depuis `js/multiplayer-visits.js`
> une fois la fonctionnalité stabilisée.

> ❓ À détailler : règles précises de l'**Atelier du Voyageur** — quels
> souvenirs sont persistants vs temporaires, conditions d'obtention des
> cosmétiques cross-plan, sorts cross-plan transmissibles.

> ❓ À détailler : règles du **combat astral** (échos) — stats des échos par
> rapport aux monstres originaux, récompenses, distinction vis-à-vis du
> combat PvE normal.

> 💡 (proposition) Un résumé du score projeté visible **pendant** la partie
> (hors Hall of Fame), par exemple un indicateur discret dans le HUD pour les
> runs Ironman actifs. Non implémenté ; `openHofProjection()` remplit ce rôle
> via la fiche personnage.

> 💡 (proposition) Un filtre « Maison » dans le Hall of Fame pour comparer
> les scores au sein d'une même Maison. Le champ `house` est déjà stocké,
> il suffirait d'ajouter un paramètre de requête côté client.

---

## Récapitulatif express (pour briefer Gemini)

> **Ironman** : permadeath stricte (deleteIronmanSlots à la mort), score
> = kills×10 + étageMax×150 + quêtes×150 + niveau×50 + or×0.5 + faits d'armes,
> × multiplicateur difficulté (0.8/1.0/1.4/1.8) × partySize (Solo ×1.3 / Duo ×1.0).
> Plafond anti-farm : kills crédités = min(totalKills, étageMax×12). Anti-doublon
> via `ironmanRunId` (index unique Supabase). **Hall of Fame** : top 10, Supabase
> REST + repli localStorage, badges Maison + chips étage/niveau. **Mondes
> Parallèles** : visites asynchrones sort Cheminette (niv. 8, 25 PM, exclu
> Ironman), flux A→H (sort → matchmaking Supabase → snapshot donjon → position
> / emotes → PNJ voyageur → qualité réseau / reconnect → combat astral échos →
> Verrous de Sang), feature flag `parallelWorldsEnabled`, disjoncteurs 404
> silencieux, Atelier du Voyageur (souvenirs / cosmétiques / sorts cross-plan).

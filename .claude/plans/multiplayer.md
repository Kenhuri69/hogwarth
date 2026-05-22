# Plan — Multijoueur : présence fantôme & interactions

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Ouvert le 2026-05-22. **Phase de réflexion** — aucune ligne de code écrite.
> Branche de travail : `claude/multiplayer-mode-discussion-Ur1Q1`.
> Révisé le 2026-05-22 : pivot du modèle « salon/lockstep » vers la
> **présence fantôme asynchrone** (voir §2).

## 1. Contexte

Le jeu est un RPG tour par tour solo. On veut un mode multijoueur qui
respecte l'hébergement statique (GitHub Pages, zéro backend de jeu) et
réutilise Supabase, déjà présent pour le Hall of Fame (`HOF_CONFIG`,
REST sous RLS).

## 2. Modèle retenu — présence fantôme asynchrone

Le premier jet (salon par code + combat lockstep) est **abandonné** : trop
contraignant. Modèle retenu, beaucoup plus léger :

- Chaque joueur génère **son propre donjon**.
- Chaque client **émet périodiquement** sa position `(étage, x, y)` vers
  une table Supabase — synchronisation **lâche**, pas de temps réel.
- Chaque client **lit** les positions des autres joueurs de son étage et
  les affiche **comme des PNJ**, mais **uniquement si la case est vide et
  praticable dans son propre donjon**. Les donjons diffèrent : on ne fait
  que projeter la coordonnée distante et on filtre sur la praticabilité
  locale. Aucun donjon partagé/seedé n'est nécessaire.
- En faisant face à un fantôme, on ouvre une **interaction type PNJ** :
  combat PvP, offrir, emote, inspecter.

Conséquences techniques majeures :
- **Couche présence = REST pur** (select + upsert périodiques), exactement
  comme le Hall of Fame. **Pas de Supabase Realtime** en V1.
- Pas de salon, pas de matchmaking : on se croise en jouant.
- Filtrage des joueurs partis via un horodatage `last_seen`.

## 3. Décisions actées (validées avec l'utilisateur)

| Axe | Décision |
|-----|----------|
| Modèle | Présence fantôme asynchrone (§2) |
| Connectivité | Supabase REST (select/upsert). Realtime seulement pour le duel direct (phase ultérieure) |
| Affichage d'un fantôme | Rendu type PNJ, **seulement si la case est vide/praticable** pour le joueur qui regarde |
| Émission de position | Périodique, synchro lâche (pas de cohérence forte) |
| Combat PvP | **Async d'abord** : duel contre un **snapshot IA** du groupe adverse. Duel **en direct** repoussé en phase ultérieure. |
| Autres interactions | Offrir or/objet · Emote/salut · Inspecter le groupe · Laisser un message |
| Populations | Joueurs **hardcore (Ironman)** et **normaux** cloisonnés : on ne voit et n'interagit qu'avec les joueurs de son propre mode |
| Pseudo | Saisi au **démarrage de la partie** — identité requise dès le début, plus seulement à l'écran de score |

## 4. Architecture

### 4.1 Identité joueur

- `getPlayerName()` / `setPlayerName()` existent déjà (Hall of Fame,
  `localStorage hogwarts_rpg_player_name`) → réutilisés.
- Nouvel **ID joueur stable** : UUID généré une fois, persisté
  (`localStorage hogwarts_rpg_player_id`). Sert de clé d'upsert.
- **Saisie du pseudo au démarrage** : le multijoueur exige une identité
  dès le début de la partie. Ajouter un champ pseudo dans le flux de
  démarrage (hub / écran de sélection des joueurs), pré-rempli via
  `getPlayerName()` pour un joueur récurrent, confirmé avant l'entrée
  en jeu.

### 4.2 Tables Supabase (REST sous RLS, modèle `HOF_CONFIG`)

| Table | Rôle | Cycle de vie |
|-------|------|--------------|
| `mp_presence` | Position + métadonnées du joueur en ligne | Upsert périodique, clé `player_id` |
| `mp_messages` | Notes laissées sur une case (style Dark Souls) | Persistantes, lues par étage |
| `mp_gifts` | Or/objet offert à un joueur | Inséré par le donneur, réclamé par le receveur |

`mp_presence` — colonnes : `player_id` (unique), `name`, `mode`
(`ironman`/`normal`), `floor`, `x`, `y`, `hero_keys`, `house`, `level`,
`status` (`exploring`/`in_battle`), `snapshot` (groupe sérialisé pour le
duel async), `last_seen`.
La ligne de présence reste **légère** : `snapshot` n'est rafraîchi qu'au
changement (level-up, équipement) et n'est **lu à la demande** que lors
d'un défi/inspection, pas à chaque poll.

> Si Supabase n'est pas configuré → mode multijoueur silencieusement
> désactivé (le jeu solo fonctionne normalement, sans fantômes).

### 4.3 Heartbeat (émission)

- Upsert de `mp_presence` **throttlé** : à chaque déplacement (throttle
  ~quelques secondes) **et** keepalive périodique (~8 s) pour rafraîchir
  `last_seen`.
- `status:'in_battle'` pendant un combat → le joueur n'est pas affiché
  comme défiable.
- À la fermeture : best-effort `last_seen` se périme tout seul (pas de
  delete fiable possible).

### 4.4 Lecture & projection des fantômes

- Poll périodique (~8 s) : `SELECT` sur `mp_presence` où
  `floor = currentFloor`, `mode = monMode`, `last_seen > now()-60s`,
  `player_id != moi` (cloisonnement hardcore/normal — §4.7).
- Pour chaque ligne : projeter `(x,y)` sur le donjon **local**. Afficher
  le fantôme **seulement si** la case est praticable, vide (pas un mur,
  pas une cellule spéciale, pas la case du joueur, pas un PNJ réel) et
  non déjà occupée par un autre fantôme.
- Structure locale `ghostPlacements: Map<"x,y", ghost>` (miroir de
  `npcPlacements`).

### 4.5 Rendu (renderer + minimap)

- Réutilise l'infra sprite PNJ : scan « objet en face » dans `renderer.js`,
  `drawNpcSprite` / `drawGhostSprite` dans `renderer-effects.js`.
- Visuel **distinct** d'un PNJ réel : aura spectrale / translucidité, nom
  du joueur flottant.
- Minimap : nouvelle classe `.map-ghost`.
- `checkObjectInFront` (`movement.js`) : ajouter la détection fantôme via
  `getGhostAt(x,y)` (les fantômes ne sont pas un `CELL.*`, ils sont une
  surcouche).

### 4.6 Interaction (overlay type PNJ)

Face à un fantôme → overlay (style `openNpcDialog` / `_showExploreOverlay`)
avec actions :
- ⚔️ **Défier en combat PvP** (§5)
- 🎁 **Offrir or / objet** (§6)
- 👋 **Saluer** (emote) (§6)
- 🔍 **Inspecter le groupe** (§6)

### 4.7 Séparation hardcore / normal

Le jeu distingue déjà le mode **Ironman** (permadeath) du jeu normal
(`ironmanMode`, `state.js`). Le multijoueur **cloisonne les deux
populations** :
- `mp_presence.mode ∈ {'ironman','normal'}`, fixé au démarrage du run.
- Le poll de présence ne retourne que les joueurs **du même mode** → on
  ne croise jamais de fantôme de l'autre population.
- Toutes les interactions (défi, cadeau, emote, message) restent
  **intra-mode**.

Justification : profils de puissance, enjeux et culture de jeu
différents ; préserve l'intégrité du mode Ironman.

### 4.8 Sprites de joueur en vue 3D (assets)

Les fantômes sont rendus en vue pseudo-3D comme des PNJ (§4.5). Il faut un
**sprite de corps par héros jouable** (6 : Harry, Hermione, Céleste, Iris,
Maxence, Anastasia) — les héros n'ont aujourd'hui qu'un **portrait
médaillon**, pas de sprite plein pied.

- Placement : `img/players/<key>.png`. Registre `PLAYER_SPRITE_SRC`
  (miroir de `NPC_SPRITE_SRC` dans `renderer-effects.js`). Fallback
  vectoriel tant que l'image n'a pas chargé.
- **Effet spectral appliqué au rendu** (translucidité + teinte froide +
  aura), pas dans l'asset : l'art source est un personnage normal, on le
  « fantomise » dans `drawGhostSprite`. Évite de produire une 2ᵉ série
  d'art dédiée.
- **Prompts de génération à rédiger** — un par héros. Gabarit :

  > « Sprite de personnage <nom du héros>, <description : tenue de
  > sorcier, couleurs de Maison, traits distinctifs>, plan américain de
  > face, pose neutre, fond transparent, style peinture numérique
  > chaleureuse cohérente avec un RPG dark-fantasy inspiré de Poudlard,
  > éclairage doux directionnel, ~512×512, sans cadre ni texte. »

  La description par héros reprend `class` / `tagline` de `CHARACTERS`
  (`data.js`). À produire comme tâche d'asset parallèle (pipeline PNG,
  cf. monstres récents).

## 5. Combat PvP — duel snapshot asynchrone

- Défier un fantôme → récupération de son `snapshot` (groupe : stats,
  équipement, sorts).
- Le combat construit un `enemyGroup` **à partir du snapshot** au lieu
  d'un tirage de monstres. Mécaniquement c'est un combat PvE : l'adversaire
  est **piloté par une IA**. L'autre joueur n'a pas besoin d'être en ligne.
- **Pas** de lockstep, pas de RNG déterministe, pas de Realtime — d'où le
  choix « async d'abord ».
- Nouveau morceau de travail principal : une **IA de groupe de héros**
  (choisir attaque/sort/garde pour un groupe `party`-like). L'IA actuelle
  (`tryEnemyAbility`/`enemyTurn`) travaille sur les `abilities[]` de
  monstres ; un snapshot de héros a des `spells[]` et de l'équipement.
- `endBattle` : branche dédiée — **pas** de XP/or/loot/Maison/quêtes.
  Résultat = victoire/défaite. Option : insérer le résultat dans une table
  `mp_duels` et notifier le joueur défié à sa prochaine connexion.
- **Duel en direct** (les deux joueurs pilotent en temps réel) : repoussé
  en **Phase 7** — nécessitera lockstep + RNG déterministe + Realtime
  (l'analyse de la première version du plan reste valable pour cette phase).

## 6. Autres interactions

| Interaction | Mécanique |
|-------------|-----------|
| 🔍 **Inspecter** | Lit le `snapshot` : niveaux, Maison, score Ironman, faits d'armes. Fiche lecture seule. Sert aussi à jauger un adversaire avant un défi. |
| 👋 **Emote / salut** | Insère un petit « ping » que le destinataire voit à sa prochaine lecture (« X t'a salué »). Aucun effet de jeu. |
| 🎁 **Offrir or / objet** | Insère une ligne `mp_gifts` (or ou objet sérialisé). Le receveur réclame ses cadeaux non lus à la connexion. Anti-abus : plafond/cooldown d'envoi. |
| 📜 **Laisser un message** | Action sur une case vide (pas besoin d'un fantôme) : pose une note dans `mp_messages`. Les autres joueurs voient un marqueur lisible sur la case. **Messages à gabarits** (banque de mots prédéfinis, façon Dark Souls) — **pas de texte libre**, pour éviter toute modération. |

## 7. Sécurité & vie privée

- Position et snapshot de groupe sont **publics** — l'accepter explicitement
  (rien de sensible : c'est un jeu).
- **Pas de texte libre** : noms de joueur déjà saisis (Hall of Fame) ;
  messages uniquement par gabarits. Évite la modération.
- RLS Supabase : `select` public, `insert/upsert` limités, `mp_presence`
  borné par `player_id`.
- Anti-abus cadeaux : cooldown + plafond par joueur.

## 8. Découpage en phases

### Phase 0 — Identité & tables
- UUID joueur persistant ; **saisie du pseudo au démarrage** (§4.1).
- Création de la table `mp_presence` (+ RLS), colonne `mode` incluse.
- verify : pseudo demandé au lancement ; ligne upsertée/lue console.

### Phase 1 — Présence & rendu fantôme (cœur visible)
- Heartbeat (émission) + poll (lecture, **filtré par mode** §4.7) +
  projection « case vide ».
- `drawGhostSprite` + marqueur minimap `.map-ghost`.
- Génération des **6 sprites de héros** en vue 3D (§4.8) — tâche d'asset.
- verify : deux onglets de même mode se voient aux bonnes cases ; un
  onglet Ironman ne voit pas un onglet normal ; `node tests/smoke.js` vert.

### Phase 2 — Interactions légères
- Overlay d'interaction ; **Inspecter** et **Emote** (lecture seule /
  ping). Pas d'écriture de jeu lourde.
- verify : overlay s'ouvre face à un fantôme, fiche d'inspection correcte.

### Phase 3 — Combat PvP snapshot asynchrone
- Sérialisation/chargement du snapshot de groupe ; IA de groupe de héros ;
  `enemyGroup` issu d'un snapshot ; `endBattle` branche PvP.
- verify : duel complet jouable contre un snapshot ; scénario ajouté à
  `tests/smoke.js` (même commit).

### Phase 4 — Messages
- Table `mp_messages`, pose par gabarits, marqueurs lisibles sur les cases.
- verify : message posé par un onglet visible par l'autre.

### Phase 5 — Cadeaux
- Table `mp_gifts`, envoi + réclamation à la connexion, anti-abus.
- verify : or/objet transféré entre deux profils.

### Phase 6 — Équilibrage & polish
- Gestion de l'écart de niveau pour les défis (cf. §10), visuels, perfs.

### Phase 7 — Duel PvP en direct (optionnel, plus tard)
- Lockstep + RNG déterministe + Supabase Realtime ; défi en ligne accepté
  par un joueur connecté.

## 9. Fichiers concernés (prévisionnel)

| Fichier | Nature |
|---------|--------|
| `js/multiplayer.js` (nouveau) | Identité, heartbeat, poll, tables Supabase, `ghostPlacements`, interactions, filtrage par mode |
| `js/main.js` / `js/save-ui.js` | Champ pseudo dans le flux de démarrage |
| `js/renderer.js` / `renderer-effects.js` | Scan + `drawGhostSprite` + `PLAYER_SPRITE_SRC` |
| `img/players/<key>.png` (nouveaux) | Sprites plein pied des 6 héros (§4.8) |
| `js/renderer-minimap.js` | Marqueur `.map-ghost` |
| `js/movement.js` | `checkObjectInFront` → détection fantôme ; hook heartbeat sur déplacement |
| `js/battle.js` | `enemyGroup` issu d'un snapshot ; branche `endBattle` PvP |
| `js/battle-ai.js` (nouveau, Phase 3) | IA de groupe de héros |
| `index.html` | Overlay d'interaction ; ordre de scripts |
| `js/loader.js` | `MANIFEST` : nouveaux globals |
| `tests/smoke.js` | Scénarios présence + duel |
| `CLAUDE.md` | Section « Multijoueur » une fois livré |

## 10. Risques & questions ouvertes

- **Écart de niveau dans les défis** : affronter le snapshot d'un joueur
  bien plus haut niveau est ingagnable. Pistes : afficher le niveau avant
  le défi (via Inspecter), ne montrer que les fantômes dans une bande de
  niveau, ou mise à l'échelle du snapshot. À trancher en Phase 6.
- **Collision de fantômes** sur une même case : n'en afficher qu'un, ou
  léger décalage.
- **Triche** : un joueur peut gonfler son snapshot. Sans serveur
  autoritaire, accepté en V1 (pas de classement PvP en jeu).
- **Supabase Realtime** : nécessaire seulement en Phase 7 (duel direct).
- **Volume de présence** : poll par étage + payload léger → négligeable.
- **Enjeu d'un duel hardcore** : un duel async-snapshot ne touche jamais
  le run réel (on affronte une copie). Si un futur duel **en direct**
  (Phase 7) entre joueurs Ironman doit avoir des conséquences réelles
  (mort = fin du run ?) → à trancher.
- **Cohérence des sprites** : les 6 sprites de héros doivent être
  stylistiquement homogènes entre eux et avec les PNJ/monstres existants.

## 11. Hors-scope

- Donjon réellement partagé / synchronisé, coopératif, spectateur.
- Chat texte libre.
- Classement PvP / ELO.
- Duel PvP en direct (repoussé Phase 7).

## 12. Suivi

- [x] Réflexion initiale — type PvP, Supabase.
- [x] Pivot vers le modèle présence fantôme asynchrone (2026-05-22).
- [x] Décisions : combat async-snapshot d'abord ; interactions offrir /
      emote / inspecter / message.
- [x] Ajout : cloisonnement hardcore (Ironman) / normal ; pseudo saisi au
      démarrage ; sprites de héros en vue 3D à générer.
- [ ] Phase 0 — identité & tables.
- [ ] Phase 1 — présence & rendu fantôme.
- [ ] Phase 2 — interactions légères.
- [ ] Phase 3 — combat PvP snapshot async.
- [ ] Phase 4 — messages.
- [ ] Phase 5 — cadeaux.
- [ ] Phase 6 — équilibrage & polish.
- [ ] Phase 7 — duel PvP en direct (optionnel).

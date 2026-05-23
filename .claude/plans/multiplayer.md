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
| Enjeu duel Ironman | Défaite → **mort** (permadeath, fin du run) ; victoire → **copie** d'un sort/équipement du vaincu (adversaire **non affecté**) |
| Enjeu duel normal | Défaite → **aucune conséquence** ; victoire → **or + XP** mis à l'échelle du niveau adverse |
| Anti-farm duel | `player_id` du vaincu mémorisé (`defeatedDuelists`, persisté) → un adversaire n'est défiable **qu'une fois** |

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

Face à un fantôme → overlay (style `openNpcDialog` / `_showExploreOverlay`).

**En-tête de la fenêtre** (visible avant tout choix d'action) :
- **Composition du groupe** : les portraits-médaillons de chaque héros du
  groupe adverse, côte à côte. Résolus côté client depuis `hero_keys` →
  `CHARACTERS[key].imgSrc` (`data.js`) — aucune colonne ni asset
  supplémentaire (les médaillons 128×128 existent déjà).
- **Ligne d'identité** : `« <pseudo> · Niveau <n> »` — `name` et `level`
  de la ligne `mp_presence`. La Maison est rendue par son blason
  (réutilise `#house-crest`).
- **Phrase d'accroche** : courte phrase de saveur sous l'identité,
  produite par `ghostTagline(heroKeys, house)` (§4.9).

Puis les actions :
- ⚔️ **Défier en combat PvP** (§5)
- 🎁 **Offrir or / objet** (§6)
- 👋 **Saluer** (emote) (§6)
- 🔍 **Inspecter le groupe** (§6)

### 4.9 Phrase d'accroche du fantôme — `ghostTagline(heroKeys, house)`

Fonction **pure et déterministe** (même fantôme → même phrase pour tous
les observateurs) : aucune saisie libre, banque de phrases prédéfinie
(cohérent avec §7).

- La **Maison** sélectionne une banque de phrases au ton propre
  (Gryffondor martial, Serpentard ambitieux, Serdaigle érudit,
  Poufsouffle loyal).
- La **composition de héros** sélectionne la phrase dans cette banque :
  index dérivé de `heroKeys` (solo/duo + identité des héros). Une banque
  par Maison contient assez d'entrées pour couvrir les combinaisons
  courantes ; certaines phrases nomment explicitement un héros meneur.
- Sans `house` (cas limite) → banque neutre par défaut.
- Détail des banques à rédiger en Phase 2 ; la fonction vit dans
  `js/multiplayer.js`.

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

### 5.1 Mécanique

- Défier un fantôme → récupération de son `snapshot` (groupe : stats,
  équipement, sorts).
- Le combat construit un `enemyGroup` **à partir du snapshot** au lieu
  d'un tirage de monstres. Mécaniquement c'est un combat PvE : l'adversaire
  est **piloté par une IA**. L'autre joueur n'a pas besoin d'être en ligne.
- **Pas** de lockstep, pas de RNG déterministe, pas de Realtime — d'où le
  choix « async d'abord ».
- Nouveau morceau de travail principal : une **IA de groupe de héros**
  (`battle-ai.js`, choisir attaque/sort/garde pour un groupe `party`-like).
  L'IA actuelle (`tryEnemyAbility`/`enemyTurn`) travaille sur les
  `abilities[]` de monstres ; un snapshot de héros a des `spells[]` et de
  l'équipement.
- Le défi est **volontaire** : on choisit d'engager. L'action **Inspecter**
  (§6) est le garde-fou — jauger le niveau adverse avant de risquer le
  combat.

### 5.2 Enjeux — population Ironman (hardcore)

- **Défaite → mort.** Le run Ironman se termine (permadeath stricte) :
  branche `endBattle` PvP → `triggerDeath()` → `showIronmanResult()`.
  Risque réel et assumé — c'est la cohérence du mode.
- **Victoire → copie.** Le vainqueur **copie** un sort *ou* un équipement
  du snapshot vaincu (le vainqueur choisit lequel ; un sort inconnu est
  appris, un équipement est ajouté à son inventaire). L'adversaire
  **n'est pas affecté** : il conserve l'intégralité de ses biens (décision
  utilisateur du 2026-05-22 — copie, pas vol). Repli **or** si le vainqueur
  possède déjà tous les sorts/équipements du snapshot.

### 5.3 Enjeux — population normale

- **Défaite → aucune conséquence** (mode décontracté) : message de saveur,
  run intact, aucune perte.
- **Victoire → or + XP**, mis à l'échelle du niveau adverse et de l'écart
  de niveau (formule §5.4).

### 5.4 Récompense de duel normal (proposition, à affiner Phase 6)

```
gap  = niveauAdversaire − monNiveau
mult = clamp(1 + gap × 0.15, 0.25, 2.0)
or   = round((20 + 10 × niveauAdversaire) × mult)
xp   = round((15 +  8 × niveauAdversaire) × mult)
```

- Défier plus fort que soi → récompense bonifiée ; tabasser un fantôme
  bien plus faible → récompense réduite (plancher ×0.25). Décourage le
  farm de bas niveau.

### 5.5 Anti-farm — adversaire mémorisé

- Après une victoire, le `player_id` du vaincu est ajouté à
  `defeatedDuelists` (Set global, `state.js`, persisté dans
  `_serializeState`/`_applyState`).
- Un fantôme déjà vaincu **n'est plus défiable** par ce joueur (l'action
  ⚔️ est grisée dans l'overlay). S'applique aux deux populations.
- Liste **personnelle au vainqueur** : chacun mémorise les adversaires
  qu'il a battus.

### 5.6 Journal & notification (optionnel)

- Insérer le résultat dans une table `mp_duels` et notifier le joueur
  défié à sa prochaine connexion (« ton spectre a vaincu / perdu contre
  X »). Purement cosmétique, non bloquant.

### 5.7 Duel en direct (Phase 7)

- Les deux joueurs pilotent en temps réel : repoussé en **Phase 7** —
  nécessitera lockstep + RNG déterministe + Realtime. Mêmes enjeux
  (§5.2 / §5.3) mais consentis des deux côtés.

## 6. Autres interactions

| Interaction | Mécanique |
|-------------|-----------|
| 🔍 **Inspecter** | Vue détaillée allant plus loin que l'en-tête de l'overlay (§4.6) : lit le `snapshot` complet — stats par héros, équipement, sorts, Maison, score Ironman, faits d'armes. Fiche lecture seule. Sert aussi à jauger un adversaire avant un défi. |
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
- Overlay d'interaction + **en-tête** (portraits du groupe, pseudo ·
  niveau, blason) ; banques de `ghostTagline` (§4.9) ; **Inspecter** et
  **Emote** (lecture seule / ping). Pas d'écriture de jeu lourde.
- verify : overlay s'ouvre face à un fantôme, en-tête (photos + pseudo ·
  niveau + phrase d'accroche) et fiche d'inspection corrects.

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
- **Enjeu d'un duel hardcore** : tranché (§5.2) — le duel async Ironman a
  des conséquences réelles (défaite → mort/fin du run, victoire → copie
  d'un bien du vaincu). Le défi est volontaire et garde-fou par
  l'inspection préalable. Reste ouvert : faut-il un avertissement explicite
  (« ce duel peut mettre fin à ton run ») avant l'engagement Ironman ?
- **Cohérence des sprites** : les 6 sprites de héros doivent être
  stylistiquement homogènes entre eux et avec les PNJ/monstres existants.

## 11bis. Setup Supabase (Phase 0 — à exécuter par l'utilisateur)

Le code pointe `MP_CONFIG` sur le **même projet Supabase que le Hall of
Fame**. Tant que la table `mp_presence` n'existe pas, le multijoueur se
désactive silencieusement (disjoncteur après 3 échecs). Pour l'activer,
exécuter ce SQL dans le **SQL Editor** du dashboard Supabase :

```sql
create table if not exists public.mp_presence (
  player_id  text primary key,
  name       text not null default 'Sorcier',
  mode       text not null default 'normal',   -- 'ironman' | 'normal'
  floor      int  not null default 1,
  x          int  not null default 0,
  y          int  not null default 0,
  hero_keys  jsonb not null default '[]'::jsonb,
  house      text,
  level      int  not null default 1,
  status     text not null default 'exploring',-- 'exploring' | 'in_battle'
  snapshot   jsonb,                             -- groupe sérialisé (duel §5)
  last_seen  timestamptz not null default now()
);
alter table public.mp_presence enable row level security;
create policy "mp_presence_read"   on public.mp_presence for select using (true);
create policy "mp_presence_insert" on public.mp_presence for insert with check (true);
create policy "mp_presence_update" on public.mp_presence for update using (true) with check (true);
create index if not exists mp_presence_lookup_idx
  on public.mp_presence (floor, mode, last_seen);
```

Et la table `mp_messages` (Phase 4 — messages à gabarits) :

```sql
create table if not exists public.mp_messages (
  author_id   text not null,
  author_name text not null default 'Sorcier',
  mode        text not null default 'normal',   -- 'ironman' | 'normal'
  floor       int  not null,
  x           int  not null,
  y           int  not null,
  template    text not null,                    -- id de gabarit (banque close)
  word        text,                             -- id de mot (banque close, nullable)
  created_at  timestamptz not null default now(),
  primary key (author_id, floor, x, y)          -- 1 message/auteur/case
);
alter table public.mp_messages enable row level security;
create policy "mp_messages_read"   on public.mp_messages for select using (true);
create policy "mp_messages_insert" on public.mp_messages for insert with check (true);
create policy "mp_messages_update" on public.mp_messages for update using (true) with check (true);
create index if not exists mp_messages_lookup_idx
  on public.mp_messages (floor, mode);
```

Et la table `mp_gifts` (Phase 5 — cadeaux or/objet) :

```sql
create table if not exists public.mp_gifts (
  id           uuid primary key default gen_random_uuid(),
  sender_id    text not null,
  sender_name  text not null default 'Sorcier',
  recipient_id text not null,
  mode         text not null default 'normal',   -- 'ironman' | 'normal'
  kind         text not null check (kind in ('gold','item')),
  amount       int,                              -- non nul si kind='gold'
  item_id      text,                             -- non nul si kind='item'
  item_name    text,                             -- snapshot pour affichage
  item_data    jsonb,                            -- snapshot complet (rejouable)
  created_at   timestamptz not null default now(),
  claimed_at   timestamptz
);
alter table public.mp_gifts enable row level security;
create policy "mp_gifts_read"   on public.mp_gifts for select using (true);
create policy "mp_gifts_insert" on public.mp_gifts for insert with check (true);
create policy "mp_gifts_update" on public.mp_gifts for update using (true) with check (true);
create index if not exists mp_gifts_inbox_idx
  on public.mp_gifts (recipient_id, claimed_at);
```

## 11ter. Écarts d'implémentation (Phases 0-1)

- ~~**Sprite fantôme = silhouette vectorielle spectrale**~~ — **Clos
  (2026-05-23)**. Les 11 PNG plein corps des héros ont été générés via
  Nano Banana puis re-détourés avec rembg (modèle `isnet-general-use`),
  cadrés à 512×512 RGBA centrés avec marge 4 %, placés dans
  `img/players/<key>.png`. Le registre `PLAYER_SPRITE_SRC` +
  `_getPlayerSprite` (lazy load type `_getNpcSprite`) sont posés dans
  `renderer-effects.js`. `drawGhostSprite` choisit PNG si tous les
  `heroKeys` ont chargé, sinon repli vectoriel — solo centré, duo
  décalé de ±0.22·sz horizontalement. Alpha 0.65 globale + aura cyan
  pulsée conservée par-dessus pour l'effet spectral. Vérifié par
  l'étape 7 de `scenarioMultiplayerPresence` (registre exposé, 11
  fichiers chargent).
- **Disjoncteur** : après `MP_MAX_FAILURES` (3) échecs réseau consécutifs,
  la session multijoueur s'éteint d'elle-même — implémente la
  « désactivation silencieuse » de §4.2.
- **Pseudo non bloquant** : le champ est demandé au démarrage et
  pré-rempli, mais un champ vide retombe sur « Sorcier » (pas de gate dur,
  cohérent avec le défaut « Sorcier Anonyme » du Hall of Fame).

## 11quater. Écarts d'implémentation (Phase 3)

- **Pas de `battle-ai.js`.** L'« IA de groupe de héros » (§5.1) est obtenue
  en **mappant les sorts connus du snapshot vers les capacités ennemies
  existantes** (`tryEnemyAbility` : `damage` / `heal` / `status`). Le
  moteur de combat PvE est réutilisé tel quel — `startBattle` accepte un
  `opts.duelGroup` pré-construit, `endBattle`/`enemyTurn` branchent sur
  `mpDuelActive`. Aucun nouveau moteur d'IA : choix de moindre risque, le
  combat reste un PvE classique contre des « duellistes ».
- **Snapshot toujours frais.** `mp_presence.snapshot` est recalculé à
  chaque upsert (`mpBuildSnapshot` dans `_mpPresenceRow`) plutôt que
  rafraîchi à la volée — le payload reste léger, et la cohérence est
  meilleure. Le `_mpFetchSnapshot` à la demande reste utilisé au moment
  du défi.
- **Butin de victoire Ironman auto-sélectionné.** §5.2 prévoit que le
  vainqueur *choisit* le sort ou l'équipement copié ; en V1 la sélection
  est automatique (sort inconnu prioritaire → équipement non possédé →
  repli or). Le choix explicite par modale est différé en Phase 6 (polish).
- **Sprite de duelliste = portrait médaillon.** Les cartes ennemies du
  duel réutilisent le portrait `CHARACTERS[key].imgSrc` via le champ
  `imgSrc` (rendu par `getMonsterIconHtml`). Pas de sprite plein-pied
  dédié (cohérent avec l'écart §11ter sur les sprites de héros).

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
- [x] Ajout : en-tête de l'overlay d'interaction (portraits du groupe,
      pseudo · niveau, blason) + phrase d'accroche `ghostTagline`
      (banque par Maison + composition de héros).
- [~] Phase 0 — identité & tables : code livré (`js/multiplayer.js`,
      UUID joueur, pseudo au démarrage). Reste à l'utilisateur : exécuter
      le SQL §11bis dans Supabase pour activer la couche réseau.
- [~] Phase 1 — présence & rendu fantôme : heartbeat/poll/projection,
      `drawGhostSprite` (vectoriel), marqueur minimap `.map-ghost`.
      Vérifié en non-régression + scénario rendu fantôme (smoke). Vérif
      réseau réelle (2 onglets) en attente du setup Supabase §11bis.
- [~] Phase 2 — interactions légères : overlay `#ghost-overlay` (en-tête
      portraits + pseudo·niveau + blason + `ghostTagline`), action
      **Inspecter** (fiche lecture seule) et **Saluer** (emote local).
      Déclenché en marchant sur la case d'un fantôme. Défier/Offrir
      grisés (phases ultérieures). Vérifié par scénario smoke dédié.
- [~] Phase 3 — combat PvP snapshot async : `mpBuildSnapshot`,
      conversion snapshot → `enemyGroup` (`_mpHeroToEnemy`, sorts mappés
      en capacités), `startBattle` via `opts.duelGroup`, branche PvP
      d'`endBattle`/`enemyTurn`. Issues : victoire normale (or+XP §5.4),
      victoire Ironman (copie de bien §5.2), défaite normale sans perte
      (§5.3), défaite Ironman → permadeath. Anti-farm `defeatedDuelists`
      persisté. Bouton ⚔️ Défier câblé. Écarts : §11quater. Vérifié par
      scénario smoke dédié + capture d'un duel.
- [~] Phase 4 — messages : bouton 🪶, compositeur à gabarits/mots (banque
      fermée — anti-injection), table `mp_messages` (SQL §11bis), poll
      indépendant 15 s, projection sur cases FLOOR, marqueur 3D
      `drawMessageMarker` + minimap `.map-message`, révélation step-on
      non bloquante. Texte stocké par `id`, recomposé localement (toute
      entrée hors banque locale est ignorée). Vérifié par scénario smoke.
- [x] Phase 5 — cadeaux : table `mp_gifts` (SQL §11bis bloc 3) ; vue
      cadeau dans l'overlay fantôme (onglets Or / Objet) ; plafond
      500 Gallions / envoi, cooldown 1 h par destinataire (en mémoire) ;
      items de quête actifs filtrés ; envoi déduit immédiatement chez
      le donneur, INSERT non bloquant ; boîte aux lettres réclamée
      automatiquement à `mpStartSession()` (PATCH `claimed_at`),
      clamp défensif côté receveur ; sac plein → cadeau préservé dans
      la boîte pour la prochaine session. Vérifié par
      `scenarioMultiplayerGifts`.
- [x] Phase 6 — équilibrage & polish :
      • **Écart de niveau** dans la fiche d'inspection — badge coloré
        (`even`/`safe`/`warn`/`danger`) + bandeau d'alerte si gap ≥ +3
        via `_mpLevelGapTier(gap)`.
      • **Confirmation Ironman** avant duel — `mpChallengeGhost`
        intercepte quand `ironmanMode=true` et ouvre une sous-vue
        (`_mpRenderIronmanDuelConfirm`) avec rappel permadeath +
        bouton « Reculer / Engager le duel ».
      • **Collision de fantômes** — `_mpProjectGhosts` conserve le
        premier fantôme par case et accumule les suivants dans
        `extras` ; renderer 3D (badge bleu « +N ») et minimap
        (`.map-ghost-badge`) rendent le surnombre.
      • **Choix explicite du butin Ironman** —
        `_mpEnumerateDuelLoot` énumère sorts inconnus + items non
        possédés ; `_mpResolveDuelVictory` ouvre la modale
        `#mp-loot-overlay` quand plus d'une option (sinon repli
        auto comme avant). `_mpApplyIronmanLoot` extrait pour
        réutilisation. Différé §11quater clos.
      Vérifié par `scenarioMultiplayerPolish` ; aucune régression
      sur `scenarioMultiplayerDuel` (Ironman 1 option → auto-pick).
- [ ] Phase 6 — équilibrage & polish.
- [ ] Phase 7 — duel PvP en direct (optionnel).

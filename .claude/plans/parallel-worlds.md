# Plan — Mondes Parallèles : visite synchrone dans le monde d'un autre

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Ouvert le 2026-05-25. **Phase de réflexion** — aucune ligne de code écrite.
> Branche de travail : `claude/multi-sync-constraints-cost-73YTH`.
>
> **Complémentaire** au plan `multiplayer.md` (présence fantôme asynchrone)
> — ne le remplace pas. Le présent plan traite le point explicitement
> listé comme **hors-scope** de `multiplayer.md` §11 : *« donjon
> réellement partagé / synchronisé, coopératif »*.

## 1. Vision

Chaque sauvegarde est un **plan** (au sens dimensionnel) : un donjon
propre au joueur, sa progression, son économie. La majorité du temps
de jeu reste **solo et asynchrone**, comme aujourd'hui.

**Idée nouvelle** : un joueur peut **ouvrir un portail vers le monde d'un
autre joueur en ligne**. Pendant la durée de la visite :

- Les deux personnages évoluent dans **le même donjon** (celui du host).
- Le visiteur **n'agit plus sur sa propre sauvegarde** — le donjon visité
  est la seule source de vérité.
- L'interaction est **pseudo-synchrone** : actions prédites localement,
  validées par le host, animations de transition longues pour masquer la
  latence réseau (~150–300 ms).

C'est le modèle Souls / Elden Ring (invocation d'un allié dans son monde),
adapté à l'univers Poudlard.

### Pourquoi ce modèle plutôt qu'un vrai « multi-joueur »

| Contrainte | Vraie sync multi (lockstep) | Mondes parallèles |
|------------|-----------------------------|-------------------|
| Déterminisme RNG global | Obligatoire | Inutile — un seul donjon, le host est autoritaire |
| Refonte event-sourcing | ~10 j sur tous les systèmes | Aucune — solo reste 100 % local |
| Overhead permanent | Oui, en solo aussi | Zéro tant qu'aucune visite n'est en cours |
| Déconnexion partenaire | Casse la partie | Visiteur s'évapore, host continue |
| Estimation totale | 15–30 j | 6–15 j selon palier |

## 2. Cadre fonctionnel

### 2.1 Réservé au mode normal — Ironman exclu

Décision actée (utilisateur, 2026-05-25) : la fonctionnalité est
**désactivée pour les runs Ironman**, dans les deux sens :

- Un joueur Ironman ne peut **ni lancer** le sort de portail, ni **être
  visité**. Le bouton/sort est grisé avec tooltip « Le mode Ironman se
  joue seul — la solitude est la promesse de la légende. »
- Un joueur non-Ironman ne voit aucun joueur Ironman dans la liste des
  destinations possibles (cloisonnement identique à `multiplayer.md` §4.7).

Justifications :

1. **Intégrité du Hall of Fame.** Le scoring Ironman repose sur le run
   solitaire (`PARTYSIZE_SCORE_MULT` solo ×1,3). Un visiteur qui aide à
   franchir un boss fausserait le classement.
2. **Permadeath inviolable.** Mourir dans le monde d'un autre, sans
   conséquence dans le sien, briserait la promesse de l'Ironman ; à
   l'inverse, mourir avec conséquence importerait des morts depuis du
   contexte hors de contrôle du joueur.
3. **Latence et fiabilité.** Ironman = zéro tolérance au bug réseau. Une
   désync, un kick involontaire, et un run de 4 h s'évapore.

Cohérent avec le ton actuel : Ironman est explicitement la voie
solitaire (cf. ADN du mode dans `state.js` / `ironman.js`).

### 2.2 Paliers livrables

Construits **par-dessus** la couche présence asynchrone livrée par
`multiplayer.md` (identité UUID, pseudo, `mp_presence`, ghost overlay).

| Palier | Mode | Effort | Risque | Lore |
|--------|------|--------|--------|------|
| **V0** | Trace asynchrone (Pensieve) | ~2 j | minime | Souvenirs déposés dans le donjon |
| **V1** | Visite spectateur (Cape d'invisibilité) | +6 j | faible | Le visiteur voit, ne touche pas |
| **V2** | Visite co-op combat (Patronus / Fumseck) | +6 j | moyen | Le visiteur combat aux côtés du host |
| **V3** | Visite PvP (duel direct) | +5 j | élevé | Affrontement en temps réel |

V0 existe déjà partiellement dans `multiplayer.md` Phase 4 (messages à
gabarits). Ce plan se concentre sur **V1 et V2** ; V0 est intégré pour
mémoire, V3 est listé comme horizon mais hors-scope V1.

## 3. Architecture technique

### 3.1 Modèle host-autoritatif

Pendant une visite :

- Le **host** détient la vérité de monde : donjon, monstres, fontaines,
  PNJ, coffres, état de combat. Sa boucle de jeu actuelle (`movement.js`,
  `battle.js`) tourne normalement, avec un hook supplémentaire : les
  actions du visiteur sont injectées dans la même file d'événements.
- Le **visiteur** reçoit un *flux d'état* depuis le host et le rend dans
  une vue clonée. Sa propre `state.js` est **suspendue** : sa sauvegarde
  n'est pas touchée, ses stats sont projetées en lecture seule.
- À la fin de la visite, le visiteur revient dans son monde **à l'état
  exact où il l'a quitté** (snapshot `_serializeState` mémorisé à l'entrée
  dans le portail, restauré à la sortie).

Le visiteur conserve néanmoins ses **récompenses de visite** (cf. §6),
modulées par l'écart de niveau (anti-grief).

### 3.2 Transport : Supabase Realtime broadcast

`multiplayer.md` se limite à REST polling pour la présence asynchrone.
Une visite synchrone exige un canal **temps réel**.

- Canal Realtime ad-hoc par session de visite : `visit:<hostId>:<visitorId>`.
- Messages broadcast (in-memory, pas de DB) — gratuit jusqu'à 2 M/mois.
- Trois types de messages :
  - `host → visiteur` : `state` (snapshot léger : positions, HP, combat
    actif si nouveau), `event` (drop, sort lancé, monstre tué).
  - `visiteur → host` : `input` (move/turn/attack/cast/item/flee).
  - `bilatéral` : `ping` (keepalive 5 s), `bye` (sortie propre).

Charge estimée : ~5–10 msg/sec en combat, ~1 msg/sec en exploration.
Compatible free tier (max 100 msg/sec/canal).

### 3.3 Invitation et matchmaking

Le sort de portail (cf. §5) déclenche l'écran d'invitation :

1. Liste des **joueurs en ligne en mode normal** issue de `mp_presence`
   (mêmes filtres que `multiplayer.md` §4.4, +
   `status='exploring'` — pas de visite pendant un combat host).
2. Métadonnées affichées : pseudo, blason de Maison, niveau, étage actuel.
3. Le visiteur clique « Demander l'accès au monde de X ».
4. Une **demande** est insérée dans une table éphémère `mp_visit_requests`
   (TTL 60 s). Le host la lit à son prochain poll (~3 s).
5. Côté host : prompt modal « X de la maison Y souhaite te rejoindre.
   Accepter ? » + 30 s pour répondre (sinon refus implicite).
6. Sur acceptation, le host poste une réponse, et **les deux clients
   ouvrent le canal Realtime**.

Le host peut aussi **désactiver les visites** dans ses options (statut
`closed` dans `mp_presence`) — utile pour jouer concentré.

### 3.4 État pendant la visite

Côté visiteur, un nouveau global `visitSession` :

```js
{
  role: 'visitor',
  hostId, hostName, hostHouse,
  channel,                       // canal Supabase Realtime
  remoteDungeon,                 // snapshot du donjon host (reçu à l'entrée)
  remoteParty,                   // composition du host
  remoteCombat,                  // combat en cours (null si exploration)
  myPosition: {x, y, dir},       // ma position dans le monde du host
  mySavedState,                  // _serializeState() pris à l'entrée — restauré à la sortie
}
```

Côté host, miroir symétrique :

```js
{
  role: 'host',
  visitors: [ { id, name, house, party, position, hp, sp, equipment } ],
}
```

Le host **ne sauvegarde pas les visiteurs** dans son `_serializeState` :
ils sont éphémères. Si le host save-and-load pendant une visite, le canal
est fermé proprement et le visiteur reçoit `bye`.

## 4. Animations du sort de portail

C'est le **point clé du plan** : les animations longues absorbent la
latence réseau et donnent corps à l'expérience. Un round-trip Supabase
fait ~200 ms ; une anim de portail de 2,5 s masque entièrement la
négociation de session.

### 4.1 Nom et lore du sort

Trois options candidates, à trancher avec l'utilisateur (toutes plausibles
dans l'univers HP) :

| Nom | Lore | Force |
|-----|------|-------|
| **Apparition Astrale** | Variante magistrale du Transplanage, mais entre plans de réalité au lieu de lieux | Sobre, fidèle au canon |
| **Cheminette Inter-Mondes** | Extension du réseau de Cheminette à des mondes parallèles, avec poudre de cendrelune | Visuellement iconique (flammes vertes) |
| **Portoloin de Conscience** | Objet enchanté qui projette l'esprit dans le donjon d'un autre sorcier | Bonne justification du retour automatique au save |

**Recommandation** : **Apparition Astrale**. Cohérent avec
l'`apparition`/`disapparition` déjà familière, justifie naturellement
les particules dorées et le motion blur radial. Pas de prop physique à
modéliser.

### 4.2 Déclencheur

- **Sort débloqué au niveau 8** (cf. table `data.js — SPELLS`), au même
  palier que `Avada...`. Coût élevé en PM (~25) pour en faire un geste
  rituel, pas un raccourci de farm.
- **Hors combat uniquement** (vérification `inBattle === false`).
- **Vérification Ironman** : `if (ironmanMode) return refusWithTooltip()`.
- Lancement depuis la modale Sorts (`openSpells`) — pas depuis le combat.

### 4.3 Phases d'animation côté visiteur (lanceur)

Durée totale : **2,8 s**. Détail des phases :

**Phase A — Incantation (0–700 ms)**
- Le sprite du lanceur lève sa baguette (animation CSS sur l'icône perso
  du HUD : transform: rotate(-20deg) + glow doré).
- Au centre du canvas 3D : une **rune dorée** se trace progressivement
  (`<canvas>` overlay, path SVG dessiné à `strokeDashoffset` animé).
- Halo bleu pulsé sous les pieds (gradient radial CSS, `animation:
  pulse 700ms ease-out`).
- Audio : `AudioSystem.playSpellCast('Apparition Astrale')` — accord
  ascendant déjà géré par `audio-sfx.js`.
- Vibration légère du canvas (transform translate 1-2 px en loop).

**Phase B — Déchirure (700–1500 ms)**
- Une **fissure verticale** apparaît au centre de la vue : div absolute
  `width: 4px → 280px`, `height: 100%`, `background: linear-gradient(...)`
  doré/violet, `box-shadow: 0 0 40px gold`.
- Le canvas 3D s'**assombrit** par vignetting CSS (overlay radial
  noir, `opacity: 0 → 0.6`).
- Au cœur de la fissure, un **preview du donjon distant** apparaît
  (premier frame reçu via Realtime, rendu dans un canvas réduit).
- Audio : whoosh grave (généré procéduralement via
  `AudioContext.createNoise` + lowpass — pattern existe déjà dans
  `audio-sfx.js`).

**Phase C — Passage (1500–2300 ms)**
- La fissure **engloutit la vue** : `transform: scale(1) → scale(8)`
  avec `transform-origin: center`.
- Effet **motion blur radial** : 4-6 div empilées avec opacités
  décroissantes et `filter: blur(0px → 8px)`.
- Le HUD se replie partiellement (HP/SP bars glissent vers les bords).
- Audio : voix murmurées (Speech Synthesis, voix en-GB,
  `AudioSystem.speakSpell('Astralis')` — réutilise le pipeline voix).

**Phase D — Arrivée (2300–2800 ms)**
- Le canvas se **rétablit** sur la nouvelle vue (donjon du host).
- La fissure se referme depuis l'extérieur vers le centre.
- Particules dorées qui retombent (~20 div animées en CSS keyframes).
- Banner texte centré : « *Tu apparais dans le monde de <Pseudo>* »,
  fadeOut sur 1 s.
- Audio : carillon cristallin (3 notes descendantes).

### 4.4 Phases d'animation côté host (qui voit arriver le visiteur)

Durée totale : **1,8 s** (plus courte — pas de transition de vue).

**Phase 1 — Pressentiment (0–600 ms)**
- Le canvas du host vibre légèrement, vignette dorée pulsée sur les
  bords.
- Petit son distant (cloche lointaine, `playFootstep` réutilisé avec
  variation de pitch).
- Optionnel : tooltip discret « Une présence approche… »

**Phase 2 — Manifestation (600–1500 ms)**
- Une **fissure verticale dorée** apparaît à 2 cases devant le host (ou
  à la première case adjacente libre).
- Sprite du visiteur (PNG `img/players/<key>.png` déjà généré pour les
  fantômes asynchrones, cf. `multiplayer.md` §11ter) émerge
  progressivement (`opacity: 0 → 1`, `transform: translateY(20px → 0)`).
- Léger flash blanc sur l'apparition complète.

**Phase 3 — Stabilisation (1500–1800 ms)**
- Aura dorée pulsée autour du visiteur (visuellement distincte du
  fantôme spectral asynchrone — cyan pour les fantômes, dorée pour les
  visiteurs incarnés).
- Banner local : « *<Pseudo> de la maison <Y> te rejoint* ».
- À partir de ce point, les inputs du visiteur sont reçus et appliqués.

### 4.5 Animation de sortie (départ du visiteur)

Symétrique mais **plus rapide** (1,5 s totale). Déclenchée par :
- Action volontaire (bouton « Quitter ce monde » dans le HUD du
  visiteur, ou sort « Disapparition Astrale » gratuit).
- Déconnexion réseau (canal Realtime perdu > 10 s → sortie forcée).
- Le host save-and-load ou retourne au hub (envoie `bye`).
- Mort du visiteur dans le monde du host (cf. §6.4).

Animation côté visiteur : motion blur inverse + retour à `mySavedState`,
banner « Retour dans ton monde ». Côté host : sprite du visiteur
s'estompe, fissure ascendante, banner « <Pseudo> regagne son monde ».

### 4.6 Détails d'implémentation

- **Pas de bibliothèque d'animation** : le projet est vanilla JS, pas de
  GSAP. Tout en CSS keyframes + `requestAnimationFrame` ponctuel pour le
  canvas (rune SVG, fissure dynamique). Pattern aligné sur
  `_npcAnimPhase` et les overlays existants (`_showExploreOverlay`,
  `#tier-transition-overlay`).
- **Fichier dédié** : `js/portal-fx.js` (~150 lignes prévues).
  Expose `playPortalOpen(direction, hostName, callback)` et
  `playPortalClose(visitorName, callback)`.
- **CSS dédié** : `css/portal.css`. Inclus dans `index.html` après
  `style.css` et `save-ui.css`.
- **Aucune dépendance d'asset externe** : tout est généré
  procéduralement (gradients, particules, runes SVG). Aligné sur la
  philosophie « zéro asset binaire si possible » du projet.

## 5. Synchronisation pseudo-temps-réel

### 5.1 Inputs visiteur → host

Le visiteur prédit localement (réactivité immédiate) puis envoie
l'input. Le host valide et broadcast le résultat.

Types d'input :

```js
{ type: 'move',    dir: 'n'|'s'|'e'|'w' }
{ type: 'turn',    side: 'left'|'right' }
{ type: 'attack',  targetIdx }              // en combat
{ type: 'cast',    spell, targetIdx }       // en combat
{ type: 'item',    itemId, targetIdx }      // consommable
{ type: 'flee'    }                         // en combat
{ type: 'interact', cellAction }            // fontaine, coffre, PNJ
```

### 5.2 État host → visiteur

Le host envoie deux flux distincts :

- **Snapshots de bas niveau** (~10/sec en combat, ~2/sec en
  exploration) : position des deux personnages, HP/SP, position des
  monstres si combat actif.
- **Événements de haut niveau** (à la volée) : `spellCast`, `monsterKilled`,
  `chestOpened`, `combatStarted`, `combatEnded`, `floorChanged`, etc.

Les snapshots permettent l'interpolation visuelle ; les événements
permettent les animations et sons.

### 5.3 Réconciliation

Si le visiteur prédit un mouvement qui s'avère invalide (collision
modifiée par l'état host), le host renvoie l'état réel. Le visiteur
**rollback** sa prédiction et applique la vérité host (avec une petite
anim de "glissement de retour").

Pour les combats : l'autorité est totale côté host. Le visiteur clique
"Stupefix sur troll" → anim d'incantation locale immédiate (~1,2 s) →
résultat reçu pendant l'anim → impact visuel cohérent. Si le troll
était mort entre-temps, le sort fizzle (anim coupée).

### 5.4 Modales bloquantes

Si le host ouvre une modale (shop, NPC dialog, level-up, inventaire),
les inputs visiteur sont **mis en file**. Le visiteur voit un overlay
discret « <Pseudo> est occupé(e)… » avec `pointer-events: none` sur les
contrôles.

Le visiteur peut quand même se déplacer si la cellule cible est libre
(géré côté host, qui valide silencieusement les move). Pas d'inventaire
visiteur en combat (idem solo).

## 6. Règles de jeu pendant la visite

### 6.1 Composition de groupe

- **Le host conserve sa party complète** (Harry + Hermione si duo).
- Le visiteur arrive avec **un seul de ses héros**, choisi à l'invitation
  (typiquement le plus polyvalent). En duo strict, c'est par défaut
  `party[0]` (le leader).
- Le combat tourne donc avec **2 ou 3 alliés** (host duo + visiteur, ou
  host solo + visiteur) contre les ennemis générés par le donjon du host.
- L'IA et le tour de jeu (`advanceBattleChar`) doivent gérer un slot
  visiteur supplémentaire — extension propre du système actuel à 2 héros.

### 6.2 Stats et équipement

Le visiteur arrive avec ses **stats et équipement réels** (lus depuis sa
sauvegarde au moment du portail). Pas de scaling — c'est le sens d'un
"plan parallèle" : un sorcier puissant qui aide un débutant le fait
*vraiment*.

Mais : voir §6.5 (anti-grief).

### 6.3 Économie du donjon visité

| Ressource | Qui en bénéficie | Justification |
|-----------|------------------|---------------|
| **XP de combat** | Host + visiteur, **part identique** | Combat partagé, encouragement à co-op |
| **Or des kills** | Host (intégral) + visiteur (50 %) | Le donjon est celui du host, économie principale chez lui |
| **Drops d'items** | Host (intégral) ; le visiteur peut recevoir un drop **dupliqué** uniquement si le host l'autorise | Pas de vol ; en pratique items rares = au host, items communs = bonus visiteur |
| **Or des coffres** | Host uniquement | Le coffre appartient au donjon |
| **Or des fontaines** | — | Soin pour les deux, mais usage compté pour le host |
| **Achats boutique** | Host uniquement (sa boutique) | Le visiteur ne peut pas dépenser |
| **Quêtes** | Host uniquement | Les quêtes du visiteur sont les siennes (autre plan) |

À la sortie, les gains du visiteur sont injectés dans son state restauré
(`mySavedState.player.xp += sessionXp`, etc.).

### 6.4 Mort du visiteur

Si le HP du personnage du visiteur tombe à 0 :

- **Pas de game over** côté visiteur — il n'est pas dans son monde.
- Anim de "rapatriement forcé" : `playPortalClose` mais avec teinte
  rouge/violette, audio sourd.
- Retour dans son monde, avec :
  - HP **plafonné à 50 % de hpMax** (lore : "tu te réveilles affaibli"),
  - SP **plafonné à 30 % de spMax**,
  - **Pas de perte d'XP/or accumulés pendant la session** (encourage à
    rejouer après une mort, pas de punition double).
- Si le visiteur était en KO en arrivant chez lui (impossible
  normalement, mais par sécurité), HP/SP forcés à 1.

Côté host : le combat continue avec son groupe seul (comme si un perso
KO en duo — déjà géré).

### 6.5 Anti-grief — écart de niveau

Aucune restriction dure : tu peux visiter un débutant avec un perso
niveau 30, ça fait partie du fun ("Auror visitant l'école"). Mais :

- **Si écart de niveau ≥ +10** entre visiteur et host : le visiteur voit
  un avertissement à l'invitation (« tu vas trivialiser son donjon »).
  Pas de blocage.
- **Gains XP du visiteur réduits** quand l'écart est négatif (visiteur
  plus haut que le donjon) : `xpGain *= max(0.1, 1 - (gap × 0.08))`.
  Plancher 10 %. Décourage le farm de XP dans des donjons triviaux.
- **Gains or du visiteur** : pas de réduction (cohérent avec le rôle de
  "compagnonnage").

### 6.6 Sauvegarde et persistance

- **Visiteur** : aucune écriture dans son save pendant la visite. Au
  retour, son `mySavedState` est restauré, puis les gains de session
  sont appliqués par-dessus, puis `autoSave(reason: 'visit-end')` est
  déclenché.
- **Host** : sa partie progresse normalement. AutoSave hooks normaux.
  Le visiteur n'apparaît **jamais** dans le snapshot du host.

## 7. Fichiers concernés (prévisionnel)

| Fichier | Nature |
|---------|--------|
| `js/portal-fx.js` (nouveau) | Animations d'ouverture/fermeture du portail (côtés visiteur et host) |
| `css/portal.css` (nouveau) | Keyframes, gradients, fissures, particules |
| `js/multiplayer.js` (étendu) | Canal Realtime, invitation, file d'inputs, état `visitSession` |
| `js/battle.js` | Support d'un slot allié visiteur (3ᵉ perso friendly) |
| `js/battle-ui.js` | Rendu de l'allié visiteur dans la rangée des alliés |
| `js/renderer-effects.js` | `drawVisitorSprite` (aura dorée vs cyan spectral) |
| `js/movement.js` | Hook : inputs visiteur → host ; rendu prédictif côté visiteur |
| `js/save.js` | `_takeVisitSnapshot()` / `_restoreFromVisit()` pour le visiteur |
| `js/data.js` | Nouveau sort `Apparition Astrale`, débloqué niveau 8 |
| `js/inventory.js` | Le sort apparaît dans `openSpells`, désactivé en combat et en Ironman |
| `js/loader.js` | `MANIFEST` : `playPortalOpen`, `visitSession`, etc. |
| `index.html` | Inclure `portal.css`, `portal-fx.js` ; overlay `#portal-fx-layer` |
| `tests/smoke.js` | Scénarios : invitation, visite, mort visiteur, déconnexion |
| `CLAUDE.md` | Section « Mondes parallèles » une fois livré |

## 8. Découpage en phases et critères de vérification

> Chaque phase est livrable indépendamment. On peut s'arrêter à la
> V1 si l'usage ne décolle pas.

### Phase A — Sort + animation locale (sans réseau) — **3 j**
- Ajouter le sort `Apparition Astrale` dans `SPELLS` (data.js).
- Implémenter `playPortalOpen()` / `playPortalClose()` (animation locale
  uniquement, pas de connexion).
- Désactiver le sort en mode Ironman et en combat.
- verify : lancer le sort en jeu déclenche l'anim 2,8 s, l'écran
  s'assombrit, le sort est grisé en Ironman. Capture vidéo de l'anim
  jointe à la PR. `node tests/smoke.js` vert.

### Phase B — Invitation et matchmaking — **2 j**
- Table `mp_visit_requests` (SQL §10) avec TTL.
- Liste des destinations dans une nouvelle modale `#portal-target-modal`,
  alimentée par `mp_presence` (filtré normal + exploring + connu).
- Flux invite/accept côté host (toast 30 s, modale d'acceptation).
- verify : depuis deux onglets différents, l'un peut demander, l'autre
  accepter. Scénario smoke ajouté.

### Phase C — Canal Realtime + visite spectateur (V1) — **4 j**
- Ouverture du canal Supabase Realtime sur acceptation.
- Le visiteur reçoit les snapshots de position du host et **suit son
  écran** (caméra clonée). Pas d'input visiteur encore.
- Sprite visiteur affiché côté host avec aura dorée.
- Bouton "Partir" côté visiteur ; déconnexion gérée des deux côtés.
- verify : deux onglets en visite, le visiteur voit l'écran du host
  bouger en temps réel. Test de déconnexion (close onglet host → visiteur
  rapatrié dans son monde, save intact).

### Phase D — Inputs visiteur + combat co-op (V2) — **5 j**
- Le visiteur a sa propre position et peut se déplacer (prédiction +
  réconciliation).
- En combat, son personnage rejoint l'`enemyGroup`-mirror côté allié.
  L'ordre de tour `advanceBattleChar` est étendu pour 3 alliés.
- Économie XP/or/drops appliquée (§6.3).
- Mort du visiteur → rapatriement avec malus (§6.4).
- verify : deux onglets, combat à 3 alliés, kill = XP distribuée,
  visiteur tué = rapatriement avec HP réduit. Scénario smoke ajouté.

### Phase E — Polish & robustesse — **2 j**
- Anti-grief écart de niveau (§6.5).
- Modale "host occupé" pour les modales bloquantes.
- Statut `closed` dans options host (désactiver les visites).
- Tooltip Ironman pour le sort grisé.
- Reconnexion automatique si Realtime drop < 5 s.

### Phase F (optionnelle, V3) — Duel PvP en visite — **5 j**
- Étend le modèle co-op au modèle adverse : le visiteur peut **défier**
  le host (au lieu de combattre avec lui).
- Combat avec règles HP réduit + enjeux symboliques (couronne, classement
  dédié).
- Désactivé par défaut, opt-in.

## 9. Coûts résumés

| Palier | Effort cumulé | Inclus |
|--------|---------------|--------|
| **V1 (Spectateur)** | 9 j | Phases A + B + C |
| **V2 (Co-op combat)** | 14 j | + Phases D + E |
| **V3 (PvP)** | 19 j | + Phase F |

Infra Supabase :
- Realtime channels : free tier (200 connexions, 2 M msg/mois). Suffisant
  jusqu'à ~500 visites simultanées.
- Table `mp_visit_requests` : volume négligeable, REST déjà en place.

Hébergement : aucun changement, GitHub Pages reste valide.

## 10. SQL — table d'invitation

```sql
create table if not exists public.mp_visit_requests (
  id            uuid primary key default gen_random_uuid(),
  visitor_id    text not null,
  visitor_name  text not null,
  visitor_house text,
  visitor_level int not null default 1,
  host_id       text not null,
  status        text not null default 'pending', -- pending|accepted|refused|expired
  channel_id    text,                            -- rempli à l'acceptation
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  expires_at    timestamptz not null default (now() + interval '60 seconds')
);
alter table public.mp_visit_requests enable row level security;
create policy "mp_visit_requests_read"   on public.mp_visit_requests for select using (true);
create policy "mp_visit_requests_insert" on public.mp_visit_requests for insert with check (true);
create policy "mp_visit_requests_update" on public.mp_visit_requests for update using (true) with check (true);
create index if not exists mp_visit_requests_host_idx
  on public.mp_visit_requests (host_id, status, expires_at);
```

Disjoncteur : si la table n'existe pas, le sort de portail affiche
"Le réseau astral est silencieux" et la fonctionnalité est désactivée
silencieusement (cohérent avec `multiplayer.md` §11bis).

## 11. Risques et questions ouvertes

- **Triche par état host falsifié** : un host malicieux peut faire
  croire à un coffre légendaire pour donner un drop au visiteur. Sans
  serveur autoritaire, accepté en V1 (pas d'économie compétitive
  partagée — chacun joue dans son save).
- **Désync persistante** : si la latence dépasse 1 s régulièrement, le
  combat devient frustrant. Mitigation : timeout 10 s avant rapatriement
  forcé ; UI affiche un indicateur de qualité de connexion.
- **Composition trio en combat** : le moteur actuel (`battle.js`) est
  câblé pour 1-2 alliés. Le passage à 3 ajoute un slot UI
  (`#battle-char-indicator`), un tour de plus dans `advanceBattleChar`,
  une carte alliée supplémentaire. Pas trivial mais propre — environ
  1 j de travail dans Phase D.
- **Boucle de tours déterministe** : avec un 3ᵉ allié pseudo-distant,
  le timing des tours peut sembler erratique si la latence varie. Piste :
  attendre l'ack du host avant de jouer le tour suivant (lockstep par
  tour, pas par frame — naturel pour un jeu tour par tour, c'est ça la
  beauté du genre).
- **Lore du sort niveau 8** : on bloque la fonctionnalité derrière une
  progression — discutable. Alternative : sort offert dès le palier 100
  d'une Maison, ou lié à un PNJ Dumbledore. À trancher en Phase A.
- **Visites multiples simultanées chez un host** : V1 = un seul
  visiteur à la fois. La file d'attente est repoussée à plus tard.
- **Sauvegarde du donjon visité après la sortie** : le host continue
  son donjon, le visiteur revient au sien. Pas de "souvenir" persistant
  côté visiteur (sauf XP/or). Acceptable V1 — V0 (traces Pensieve)
  couvre le besoin de persistance asynchrone.

## 12. Hors-scope

- Salons "open world" persistants (plusieurs visiteurs simultanés).
- Donjon généré conjointement par les deux joueurs.
- Sauvegarde des actions du visiteur dans le donjon du host (au-delà
  des kills/loots usuels).
- Voix / chat texte en temps réel.
- Classement compétitif des visites (couronne du meilleur visiteur, etc.).
- Tout pour Ironman (gel ferme — cf. §2.1).

## 13. Suivi

- [x] Pivot conceptuel (2026-05-25) : multi-sync de saves → visites
      dimensionnelles. Ironman exclu.
- [ ] Phase A — sort + animation locale.
- [ ] Phase B — invitation/acceptation.
- [ ] Phase C — V1 spectateur.
- [ ] Phase D — V2 co-op combat.
- [ ] Phase E — polish.
- [ ] Phase F — V3 PvP (optionnel).

## 14. Décisions à confirmer avant Phase A

1. **Nom du sort** : Apparition Astrale (recommandé), Cheminette
   Inter-Mondes, ou Portoloin de Conscience ?
2. **Niveau de déblocage** : niveau 8 fixe, palier de Maison, ou
   déclenché par un PNJ scripté (Dumbledore après un palier) ?
3. **Coût en PM** : 25 (proposition), ou plus dissuasif (~40) pour en
   faire un sort rituel ?
4. **Cooldown entre deux visites** : aucun, 5 minutes, ou une fois par
   étage ? Anti-flood.

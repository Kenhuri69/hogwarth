# Plan — Mondes Parallèles : exploration du donjon d'un autre joueur

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Ouvert le 2026-05-25. **Phase de réflexion** — aucune ligne de code écrite.
> Branche de travail : `claude/multi-sync-constraints-cost-73YTH`.
> Révisé le 2026-05-25 (R1) : pivot de **co-op combat** vers **exploration
> découverte** (cf. §1) ; le co-op est conservé en **branche annexe** à
> réfléchir plus tard (§8).
> Révisé le 2026-05-25 (R2) : retour partiel sur la non-violence —
> **combat local asymétrique** vs échos de monstres + **Verrou de Sang**
> (menace asynchrone déposée chez le host), avec économie cross-plan
> dédiée (Essences d'Outremonde, Set Voyageur, cosmétiques, sorts
> exclusifs, souvenirs passifs). Cf. §6.8 / §6.9 / §6.10.
>
> **Complémentaire** au plan `multiplayer.md` (présence fantôme asynchrone)
> — ne le remplace pas. Le présent plan traite le point explicitement
> listé comme **hors-scope** de `multiplayer.md` §11 : *« donjon
> réellement partagé / synchronisé »*.

## 1. Vision

Chaque sauvegarde est un **plan** (au sens dimensionnel) : un donjon
propre au joueur, sa progression, son économie, ses PNJ figés à l'état
où il les a laissés. La majorité du temps de jeu reste **solo et
asynchrone**, comme aujourd'hui.

**Idée centrale** : un joueur peut **ouvrir un portail vers le monde d'un
autre joueur en ligne** — non pour y combattre à ses côtés, mais pour
**explorer** ce monde-là, **différent du sien**. Tu débarques en
*voyageur d'un plan parallèle* : tu découvres son donjon, tu rencontres
ses PNJ, tu vois ses choix d'architecture procédurale — tout est familier
sans être identique.

- Le visiteur **n'agit pas sur l'économie du host** (pas de coffres
  pillés, pas de monstres réels tués pour son XP, pas d'achats en
  boutique).
- Le visiteur **a sa propre économie cross-plan** : des **Essences
  d'Outremonde** qu'il gagne en combattant des *échos* de monstres
  (§6.8) et en posant des **Verrous de Sang** (§6.9). Ces essences
  alimentent un Set Voyageur, des cosmétiques, des sorts exclusifs et
  des souvenirs passifs (§6.10). Aucune retombée sur le donjon du
  host.
- Le visiteur **ne peut explorer que les zones que le host a déjà
  débloquées** — étages descendus, cases découvertes. Le reste est un
  brouillard infranchissable (cf. §3.5). C'est la règle qui rend la
  visite *intime* : tu vois ce que le voyageur d'en face a vécu, pas
  plus.
- Les **PNJ ont des dialogues spéciaux** quand un voyageur d'un autre
  plan les aborde (cf. §6.2). C'est le sel narratif du mode.
- Le **combat est local et asymétrique** : le visiteur affronte des
  *échos* des monstres du host (instance dédiée, scaling à son
  niveau), sans toucher l'état réel du donjon adverse. Sa défaite
  l'éjecte vers son monde — pas de permadeath, pas d'écho sur sa save
  (cf. §6.8).

Le modèle reste **Death Stranding asymétrique** dans l'esprit
(présence enrichissante pour le host, non-destructrice pour son
économie) mais avec **un canal d'agency pour le visiteur** : il a
quelque chose à *faire* dans le monde de l'autre, pas seulement à
regarder. Cohérent avec un RPG narratif inspiré de Poudlard, où
"explorer un autre château et y semer une menace" devient une
promesse forte.

### Pourquoi ce modèle plutôt qu'un vrai « multi-joueur »

| Contrainte | Vraie sync multi (lockstep) | Co-op combat (annexe §8) | **Exploration + combat local (V1 R2)** |
|------------|-----------------------------|--------------------------|--------------------------------------|
| Déterminisme RNG global | Obligatoire | Inutile (host autoritaire) | **Inutile — instances isolées** |
| Refonte event-sourcing | ~10 j tous systèmes | Aucune | **Aucune** |
| Extension moteur combat | Inhérente | +1 slot allié + tour 3-way | **Réutilise `battle.js` tel quel sur enemyGroup local** |
| Overhead permanent | Oui en solo aussi | Zéro hors visite | **Zéro hors visite** |
| Déconnexion partenaire | Casse la partie | Visiteur s'évapore | **Visiteur s'évapore (combat local persiste localement)** |
| Estimation V1 | 15–30 j | 14 j | **~20 j (vs 13,5 j R1 sans combat)** |

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
| **V0** | Trace asynchrone (Pensieve) | déjà couvert | minime | Souvenirs/messages déposés (cf. `multiplayer.md` Phase 4) |
| **V1a** | Exploration découverte + dialogues + emotes | ~13,5 j | faible | Tu visites, parles aux PNJ, observes. Aucun combat. |
| **V1b** | + Combat local asymétrique (échos) + amorce économie cross-plan | +4 j | moyen | Le visiteur combat des échos de monstres, gagne des Essences d'Outremonde |
| **V1c** | + Verrou de Sang (menace asynchrone) + 4 canaux de récompense complets | +3 j | moyen | Set Voyageur (équipement), cosmétiques, sorts exclusifs, souvenirs passifs |
| **V2** | Quêtes inter-mondes | +5–8 j | moyen | Des PNJ te confient des missions à effectuer dans ton monde |
| **Branche annexe** | Co-op combat synchrone (Patronus / Fumseck) | +14 j | moyen | Le visiteur combat aux côtés du host *en simultané*. À réfléchir séparément (§8). |
| **Branche annexe** | PvP duel direct | +5 j sur l'annexe | élevé | Affrontement temps réel |

**Priorité immédiate** : V1a → V1b → V1c en séquence, chaque palier
restant **livrable indépendamment**. V1a (R1 originel) reste pertinent
en tant que socle même si V1b/c sont reportés. V1b apporte l'agency
combat sans toucher l'économie du host (échos isolés). V1c ouvre le
canal **asynchrone** (Verrou de Sang) qui rend la fonctionnalité
*intéressante en solo* — un visiteur peut gagner des essences sans
qu'un host soit connecté en miroir au même moment, ce qui désamorce
le problème classique du multi à faible base installée. Les branches
combat synchrone et PvP restent gelées.

## 3. Architecture technique

### 3.1 Modèle host-autoritatif (allégé)

Pendant une visite V1 (exploration sans combat) :

- Le **host** détient la vérité de monde : donjon, PNJ, coffres,
  fontaines, masque de cases découvertes. Sa boucle de jeu actuelle
  (`movement.js`, `battle.js`) tourne **sans modification** — le
  visiteur n'écrit rien dans son état, donc rien à valider/réconcilier.
- Le **visiteur** reçoit un *snapshot de donjon* à l'entrée + des
  *deltas* quand le host découvre de nouvelles cases (ou descend
  d'étage). Sa propre `state.js` est **suspendue** : sauvegarde
  intouchée, stats projetées en lecture seule.
- À la fin de la visite, le visiteur revient dans son monde **à l'état
  exact où il l'a quitté** (snapshot `_serializeState` mémorisé à
  l'entrée dans le portail, restauré à la sortie).

Conséquence majeure de l'absence de combat en V1 : **pas de prédiction
client, pas de réconciliation, pas de file d'inputs**. Le visiteur
décide seul où il se déplace dans les limites du territoire visited
(§3.5). Le canal Realtime sert essentiellement à transporter les
*événements de découverte* du host (et la position du visiteur quand le
host veut le voir, voir §6.5).

### 3.2 Transport : Supabase Realtime broadcast

`multiplayer.md` se limite à REST polling pour la présence asynchrone.
Une visite synchrone exige un canal **temps réel** — mais le débit reste
modeste en V1.

- Canal Realtime ad-hoc par session de visite : `visit:<hostId>:<visitorId>`.
- Messages broadcast (in-memory, pas de DB) — gratuit jusqu'à 2 M/mois.
- Types de messages V1 :
  - `host → visiteur` : `snapshot` (état du donjon à l'entrée, ~30 KB),
    `cellRevealed` (le host vient de découvrir une case → débloquée
    pour le visiteur), `floorChanged` (host change d'étage), `position`
    (où est le host sur l'étage courant, pour rendre son sprite),
    `bye` (sortie).
  - `visiteur → host` : `position` (le visiteur s'est déplacé, pour
    que le host voie son sprite), `npcTalked` (le visiteur a parlé à
    un PNJ — purement informatif, le host voit un toast).
  - `bilatéral` : `ping` (keepalive 5 s), `bye` (sortie propre).

Charge estimée V1 : ~1 msg/sec en exploration tranquille. Charge V2
(quêtes inter-mondes) similaire — la transmission de quête se fait via
table REST persistante, pas via le canal éphémère. Largement sous le
plafond Realtime (max 100 msg/sec/canal).

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
  remoteVisitedMask,             // Set<"x,y"> : cases que le host a découvertes (§3.5)
  remoteFloorMax,                // étage max atteint par le host (visiteur peut visiter ≤ celui-ci)
  remoteFloor,                   // étage actuellement chargé pour la visite (≤ remoteFloorMax)
  remotePartyNames,              // composition du host (affichage seulement)
  remoteHostPosition,            // {x,y,dir} — où est le host sur l'étage courant (sprite à rendre)
  myPosition: {x, y, dir},       // ma position dans le monde du host
  mySavedState,                  // _serializeState() pris à l'entrée — restauré à la sortie
}
```

Côté host, miroir symétrique :

```js
{
  role: 'host',
  visitors: [ { id, name, house, level, position } ],   // 1 seul en V1
}
```

Le host **ne sauvegarde pas les visiteurs** dans son `_serializeState` :
ils sont éphémères. Si le host save-and-load pendant une visite, le canal
est fermé proprement et le visiteur reçoit `bye`.

### 3.5 Limites de territoire — exploration restreinte aux cases débloquées

**Règle centrale du mode** (décision utilisateur 2026-05-25) : le
visiteur ne peut explorer que les zones que le host a **déjà
débloquées** — autrement dit la "fog of war" du host définit l'enclos
du visiteur.

Côté implémentation, le donjon expose déjà un masque de cases visitées
(`dungeon.visited` ou équivalent, lu par `renderer-minimap.js` pour
afficher la minimap en clair / brouillard). On réutilise ce masque tel
quel :

- À l'entrée dans la visite, le host sérialise pour chaque étage
  débloqué : `{ grid: dungeon.grid, visitedMask: Set<"x,y">, npcs,
  chests, fountains, doors }`. Le tout dans `remoteDungeon`.
- À chaque mouvement du visiteur, on vérifie : la case cible est-elle
  dans `remoteVisitedMask` ? Si non → blocage doux avec message
  *« Le brouillard t'empêche d'aller plus loin — ce passage n'a pas
  encore été foulé par <Pseudo>. »*
- Quand le host découvre une nouvelle case en jouant (sa boucle
  `movement.js` met à jour son `visited`), il envoie un événement
  `cellRevealed:{floor,x,y}` que le visiteur ajoute à son masque
  local — les frontières du territoire s'élargissent en temps réel.
- Les **étages non-encore atteints** par le host sont **inaccessibles**
  au visiteur : l'escalier descendant est verrouillé visuellement
  (chaîne dorée, message *« Ce plan reste à découvrir par
  <Pseudo>. »*).
- Quand le host descend un étage pour la première fois, le visiteur
  reçoit le nouvel étage en snapshot et peut le suivre s'il le souhaite.

**Conséquence narrative** : tu visites les *souvenirs explorés* du
host, pas son donjon complet. Si tu lui rends visite très tôt dans sa
partie, tu auras peu d'espace ; plus il a avancé, plus il y a à
découvrir chez lui.

**Conséquence technique** : le snapshot envoyé au visiteur ne contient
que les étages atteints. Pour un joueur étage 1 → ~10 KB ; étage 15
avec tous les étages débloqués → ~200 KB. Acceptable en un seul
broadcast initial (Supabase Realtime accepte 256 KB/message).

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
- Le host atteint son TTL de session ou ferme l'onglet.

> En V1 (exploration), aucun mécanisme de mort ne sort le visiteur — il
> est incorporel face aux monstres (§6.3). La sortie est toujours
> volontaire ou réseau.

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

## 5. Synchronisation pseudo-temps-réel (V1 — exploration sans combat)

L'absence de combat en V1 simplifie radicalement la couche réseau —
plus de prédiction, plus de réconciliation, plus de file d'inputs.

### 5.1 Snapshot initial (host → visiteur, à l'entrée)

Au moment où la visite est acceptée, le host construit un *snapshot* et
l'envoie en un broadcast Realtime :

```js
{
  type: 'snapshot',
  hostMeta: { name, house, level, partyNames, currentFloor },
  floors: {
    1: { grid, visitedMask, npcs, chests, fountains, doors },
    2: { grid, visitedMask, npcs, chests, fountains, doors },
    // ... uniquement les étages que le host a atteints
  },
  hostPosition: { floor, x, y, dir },
  visitorSpawn: { floor, x, y, dir },   // case adjacente au host par défaut
}
```

Taille typique : ~10 KB pour étage 1, jusqu'à ~200 KB pour un host
étage 15 avec masque complet. Sous le plafond Realtime (256 KB).

À réception, le visiteur applique le snapshot à `visitSession`,
remplace son rendu par celui du donjon distant, et la vue est prête.

### 5.2 Position du visiteur (visiteur → host)

Chaque déplacement du visiteur émet un message léger :

```js
{ type: 'position', x, y, dir, floor }
```

Le host applique cette position à son `visitors[0]` (purement
visuel — sprite à dessiner via `drawVisitorSprite`, cf. §6.5). Aucune
collision n'est testée côté host : le visiteur ne peut occuper aucune
case "réelle" du donjon (il est incorporel).

Émis seulement quand la position change → ~1 msg/sec en exploration
active, 0 en stationnaire.

### 5.3 Position et événements du host (host → visiteur)

Le host envoie sa position à chaque move (~1 msg/sec) :

```js
{ type: 'hostPosition', x, y, dir, floor }
```

Plus des **événements de découverte**, dans les rares cas où ils
modifient l'enclos du visiteur :

```js
{ type: 'cellRevealed', floor, x, y }    // host découvre une case
{ type: 'floorChanged', floor }          // host descend, snapshot du nouvel étage envoyé en suivi
{ type: 'floorSnapshot', floor, grid, visitedMask, npcs, ... }
```

Le host **ne broadcast pas** ses combats, ses ouvertures de coffre, ses
achats — le visiteur n'a pas à les voir. L'expérience visiteur est
contemplative, pas voyeuriste.

### 5.4 Modales bloquantes côté host

Quand le host ouvre une modale (combat, shop, NPC, level-up,
inventaire), il envoie `{ type: 'busy', reason: 'combat'|'shop'|… }`.
Le visiteur affiche un overlay discret « <Pseudo> est en plein combat
— l'écho est faible » mais **peut continuer à explorer** : son monde
de visite reste interactif (sauf si le host change d'étage, ce qui
attend la fin de la modale).

### 5.4bis Événements V1b/c (combat astral et Verrou)

Messages additionnels introduits par les paliers suivants :

```js
// V1b — visiteur engage un écho (purement informatif côté host)
{ type: 'astralCombatStart', cellX, cellY, monsterId }
{ type: 'astralCombatEnd', won: bool }

// V1c — visiteur pose un Verrou de Sang (host voit l'animation + toast)
{ type: 'bloodSealPosted', cellX, cellY, monsterId, threatId }
```

Aucun message pendant la boucle de combat astral (résolu localement),
juste les bornes start/end pour l'overlay côté host. Pose de Verrou
n'envoie qu'un événement éphémère — la persistance se fait via
`mp_threats` (REST), indépendante du canal Realtime.

### 5.5 Sortie (bilatéral)

```js
{ type: 'bye', reason: 'voluntary'|'host-quit'|'network'|'host-closed-visits' }
```

Toujours suivi d'une fermeture propre du canal Realtime.

## 6. Règles de visite (V1 — exploration)

### 6.1 Composition côté visiteur

- Le visiteur arrive avec **un seul héros**, choisi à l'invitation
  (par défaut `party[0]`). C'est lui qui est rendu en sprite chez le
  host (§6.5).
- Le **partySize n'a pas d'incidence** côté visiteur — il est seul à
  parcourir le donjon de l'autre, ses compagnons restent "en arrière
  plan" dans son propre plan.
- Stats et équipement réels (lecture seule). Aucun calcul de combat
  n'utilise ses stats puisqu'il n'y a pas de combat en V1.

### 6.2 Dialogues PNJ — voyageur d'un autre plan (cœur du mode)

C'est l'expérience principale offerte par la V1. Quand le visiteur
parle à un PNJ du host :

- L'overlay `openNpcDialog` actuel est réutilisé, mais **branché sur
  une nouvelle banque de dialogues** : `npc.dialoguesAstral` (à
  ajouter dans `npcs.js`) ou, à défaut, un dialogue **générique
  procédural** construit à partir du rôle du PNJ.
- Le ton : le PNJ perçoit que tu n'es pas d'ici. Selon son rôle :
  - **Donneur de quête** : *« Étrange… tu n'es pas du château que je
    connais. Si je te confiais une mission, irais-tu la mener dans
    ton propre plan ? »* — amorce de §7 (quêtes inter-mondes V2).
  - **Vendeur** : *« Mes potions n'ont pas de poids dans ton monde,
    voyageur. Mais je peux te dire ce qu'on murmure ici. »* (lore
    gratuit, pas de transaction).
  - **PNJ lore** : *« Si ton plan ressemble au mien, alors la
    Chambre des Secrets s'y cache aussi… ou peut-être pas. »*
    (variation narrative).
  - **Action spéciale** (Fumseck, portrait Dumbledore) : grisée avec
    *« Ce don ne traverse pas les plans, voyageur. »*
- Implémentation : ajouter un champ optionnel `dialoguesAstral` aux
  PNJ dans `npcs.js`. Si absent → fallback générique par `npc.role`.
  Aucune migration de save — les saves existantes ne contiennent pas
  les PNJ.

**Pas de quête acceptée en V1** : le système de quête actuel s'appuie
sur `activeQuests` côté visiteur, qu'on ne touche pas. Les dialogues
*évoquent* la possibilité (« si je te confiais… »), c'est la promesse
narrative de V2 (§7).

### 6.3 Monstres — V1a incorporel, V1b combat d'échos

**En V1a** (palier socle livré sans combat) : le visiteur est
**invisible et intangible**. Les monstres du donjon visité ne le
voient pas, aucun combat ne se déclenche. Les présences hostiles sont
rendues en silhouette translucide rouge sombre. *« Tu sens des
présences hostiles, mais elles ne te voient pas. »*

**En V1b** (combat local asymétrique — détail complet §6.8) : le
visiteur **peut** entrer en combat contre un *écho* du monstre
rencontré. L'écho est une instance dédiée, scalée à son propre niveau,
sans impact sur l'état réel du donjon du host. Le combat est **opt-in**
(le visiteur déclenche l'engagement explicitement) pour préserver le
mode contemplatif quand il le souhaite.

### 6.4 Coffres, fontaines, boutique — observation seule

| Élément | Comportement V1 |
|---------|------------------|
| **Coffre fermé** | Visible en 3D, message au survol : *« Ce coffre attend la main de <Pseudo>, pas la tienne. »* Pas d'interaction. |
| **Coffre ouvert (déjà fouillé par host)** | Affiché ouvert, vide. |
| **Fontaine non utilisée** | Visible, halo bleu. *« L'eau scintille pour <Pseudo>, pas pour toi. »* Pas de soin. |
| **Fontaine tarie** | Visible grisée, message *« <Pseudo> y a déjà bu. »* |
| **Boutique** | Le marchand parle, mais le menu d'achat est désactivé. Dialogue spécial (cf. §6.2). |
| **Stèle d'énigme** | Lisible (lore intéressant !). Réponse inopérante (pas de récompense pour le visiteur). |
| **Escalier descendant** | Verrouillé si l'étage suivant n'a pas été débloqué par le host (§3.5). Sinon traversable. |
| **Escalier montant** | Toujours traversable dans la limite des étages débloqués. |

### 6.5 Présence du visiteur côté host

Le host **voit le sprite du visiteur** dans son donjon, à la position
reçue (§5.2) :

- Réutilise `img/players/<key>.png` (déjà produits pour les fantômes
  asynchrones, cf. `multiplayer.md` §11ter).
- **Aura dorée pulsée** autour du sprite — visuellement distincte du
  fantôme spectral asynchrone (aura cyan).
- Petit nom flottant au-dessus *« <Pseudo> »* (toggle dans les
  options host).
- Sur la **minimap**, classe dédiée `.map-astral-visitor` (or, vs
  cyan pour `.map-ghost`).

Le host peut continuer à jouer normalement, voir occasionnellement
son visiteur passer dans le décor. Lui aussi peut parler aux PNJ du
visiteur ? **Non en V1** — la communication directe entre host et
visiteur passe par les emotes (§6.7) et les futures quêtes
inter-mondes (§7).

### 6.6 Sauvegarde et persistance

- **Visiteur (V1a)** : aucune écriture dans son save pendant la visite.
  Au retour, `mySavedState` restauré tel quel.
- **Visiteur (V1b+)** : à la sortie, on **applique un patch ciblé** à
  la save restaurée — uniquement les champs de l'économie cross-plan
  (`outremondeEssence`, `outremondeStats`, `outremondeSouvenirs`) et
  les éventuels objets du Set Voyageur craftés via portail (§6.10). Ces
  champs sont **isolés** : le reste de la save n'est pas re-sérialisé
  pendant la visite, donc pas de risque de fuir l'état du host dans la
  save du visiteur. `autoSave(reason: 'visit-end')` déclenché en
  sortie.
- **Visiteur (V1c)** : ajoute les Verrous de Sang posés à
  `outremondePendingSeals` (UID + cible + timestamp). Récompenses
  asynchrones réclamées au prochain démarrage via lecture de
  `mp_threats.resolved_at` (§6.9).
- **Host** : sa partie progresse normalement. AutoSave hooks normaux.
  Le visiteur n'apparaît **jamais** dans le snapshot du host. Les
  Verrous de Sang à résoudre sont chargés depuis `mp_threats` au
  démarrage et matérialisés en cellules du donjon (§6.9), sans
  re-sérialisation du donjon lui-même (résolution éphémère).
- **Trace Pensieve** (V0 existant) : à la sortie, le visiteur peut
  laisser un message sur la dernière case foulée (`mp_messages`).
  Indépendant du système Verrou de Sang.

### 6.7 Emotes et signaux (V1 light)

Sans chat texte libre (cohérent avec la politique anti-modération de
`multiplayer.md` §7), un menu d'emotes prédéfinies est exposé au
visiteur :

- 👋 *« Salutations »* — toast côté host.
- 🪄 *« Ce sortilège m'intrigue »* — host voit *« <Pseudo> admire ton
  équipement »* (déclenché quand le visiteur clique sur une stat du
  host).
- 🏰 *« Joli château »* — compliment générique.
- 🎯 *« Je file »* — pré-annonce de sortie.

Pour le host, un seul emote en retour : 👋 *« Bienvenue »*.

Banque fermée (anti-injection), 4-6 emotes côté visiteur, 1-2 côté
host. ~0,5 j de travail.

### 6.8 Combat local asymétrique — échos de monstres (V1b)

**Principe** : le visiteur peut engager un combat contre un *écho* d'un
monstre du donjon visité. L'écho est une **instance dédiée**, scalée à
son propre niveau et à sa propre composition (mode solo/duo de la save
du visiteur), résolue **entièrement côté client visiteur**. Aucun
événement réseau pendant le combat, aucune écriture chez le host.

#### Modèle d'engagement
- **Opt-in** : aucun déclenchement automatique au passage sur une case.
  Le visiteur ouvre un menu "Défier l'écho" sur les cellules contenant
  une présence hostile (silhouette translucide rouge). Préserve le mode
  contemplatif de V1a quand voulu.
- **Cooldown par cellule** : un écho vaincu est marqué "dissipé" pour
  la durée de la visite, plus de défi possible sur la même cellule.
  Évite le farm trivial en boucle.
- **Limite par étage** : maximum 3 échos affrontables par étage visité,
  reset à chaque sortie/rentrée. Garde l'expérience compacte.

#### Construction de l'écho
- `monsters.js` reste source de vérité — `scaleMonster(template,
  visitorLevel)` (helper existant utilisé par `dungeon.js`) appliqué au
  niveau du visiteur, **pas** au niveau du host. Garantit un combat
  équilibré pour le visiteur quel que soit l'étage où il atterrit.
- Composition du groupe : `rollGroupSize` réutilisé avec le `partySize`
  effectif du visiteur (au moins 1 — voir §6.1, le visiteur arrive seul).
- Drops `monsters.js` **ignorés** : un écho ne lâche pas d'or, pas
  d'items du loot table standard. À la place : **Essence d'Outremonde**
  scalée au niveau du monstre (§6.10), plus une chance faible
  (~5 %) de fragment cosmétique.

#### Boucle de combat
- Réutilise `battle.js` tel quel : `startBattle(echoGroup)`, tour
  normal, sorts, items consommables (du visiteur — il *brought his kit*).
- HP/SP du visiteur **réels** (lus depuis `mySavedState`), mais isolés :
  les pertes pendant la visite sont **non persistantes** par défaut. À
  la sortie de visite, HP/SP restaurés à leur valeur d'entrée. Décision
  délibérée pour éviter le piège "je suis venu visiter, je sors avec
  20 % HP, je dois rentrer en boutique".
- **Défaite** : pas de pétrification, pas d'écran de mort. Animation
  d'éjection (motion blur inverse), bannière *« Ton lien astral
  vacille — tu retournes dans ton monde »*. Sort de portail mis en
  cooldown 5 min (§13).
- **Victoire** : essence ajoutée à `outremondeEssence`, message dans le
  log. Pas d'XP, pas de level-up — la progression de niveau reste un
  événement de la save propre du visiteur.

#### Côté host
- Le host **ne voit pas le combat** du visiteur (pas d'overlay, pas de
  sons de combat broadcast). Le visiteur reste rendu sur la minimap
  host avec un indicateur discret *« en combat astral »* (sprite
  pulsant rouge). Pas de spoiler de difficulté.
- Pas d'impact sur le monstre réel du donjon host : si le host se rend
  sur la même cellule plus tard, le monstre standard s'y déclenche
  normalement (instance différente).

#### Verrouillage des sorts incompatibles
- **`Apparition Astrale`** désactivé pendant un combat astral (cohérent
  avec `inBattle === true`).
- **`Avada Kedavra`** désactivé contre les échos — narratif (un écho
  n'a pas d'âme à briser) et anti-trivialisation. Tooltip *« L'écho
  refuse cette mort. »*

### 6.9 Verrou de Sang — menace asynchrone déposée chez le host (V1c)

**Principe** : le visiteur peut investir des Essences d'Outremonde
pour **sceller une menace** dans le monde du host, persistée en base
(`mp_threats`). Cette menace se matérialise dans le donjon du host à
sa prochaine session, sur une cellule précise — et quand il la
résout (combat normal), **le visiteur reçoit la récompense
asynchrone** (essences bonus, fragments cosmétiques) au prochain
chargement de sa propre save.

C'est le **canal asymétrique** qui rend la fonctionnalité viable
même à faible base installée : un visiteur peut "déposer" des
verrous chez plusieurs hosts, gagner les essences au fil de leurs
résolutions, sans qu'aucune session miroir ne soit nécessaire.

#### Pose d'un verrou (côté visiteur)
- Sort/rituel **« Verrou de Sang »** disponible hors combat astral,
  sur une cellule libre du donjon visité (pas un escalier, pas un PNJ,
  pas une fontaine).
- Coût : **5 PM + 1 Essence d'Outremonde**.
- Choix du **monstre à sceller** dans une liste filtrée par étage
  courant du host (pioche dans `monsters.js` éligibles à `host.floor`).
  Détermine la difficulté du futur combat host et la récompense.
- Animation locale courte (~1,5 s) : rune rouge tracée au sol,
  pulsation, fade. Côté host (si connecté) : toast *« <Pseudo> a
  scellé quelque chose ici… »* + marqueur discret sur la minimap.
- Insertion `mp_threats(visitor_id, host_id, floor, x, y, monster_id,
  status='pending')`.

#### Résolution (côté host)
- Au démarrage / changement d'étage, le client host lit
  `mp_threats where host_id = me and status = 'pending' and floor =
  currentFloor` et matérialise les marqueurs sur les cellules
  concernées (icône 🩸 distincte, halo rouge).
- À l'entrée du host sur la cellule : encounter forcé contre le
  monstre scellé, scalé à l'étage du host (combat normal via
  `startBattle`).
- **Loot bonus** : drops standards du monstre + **1 fragment de Set
  Voyageur** *aléatoire* offert au host (sa propre récompense pour
  jouer le jeu) + 50 or bonus. Suffisant pour incentiver, modeste
  pour ne pas casser l'économie de boutique.
- À la fin du combat (`endBattle`), update `mp_threats.status =
  'resolved', resolved_at = now()`. Pas de validation server-side
  pour la triche (V1 — voir §13).
- Si le host fuit : `status = 'fled'`, le verrou reste actif jusqu'à
  résolution réelle.

#### Récompense asynchrone (côté visiteur)
- Au démarrage de sa save, le visiteur lit `mp_threats where
  visitor_id = me and status in ('resolved','fled') and not
  claimed`. Pour chaque entrée :
  - `resolved` → +3 Essences d'Outremonde + chance 20 % d'un fragment
    cosmétique.
  - `fled` → +1 Essence (consolation).
- Modale discrète au démarrage *« 3 Verrous de Sang ont été
  affrontés dans d'autres plans »* avec détail (pseudo host, étage,
  monstre, gain). Marquage `claimed = true` après affichage.
- Plafond : maximum 10 verrous en attente par visiteur (anti-spam).
  Tentative au-delà → message *« Trop de verrous en attente. Attends
  qu'ils se résolvent. »*

#### Opt-out host
- Option dans les paramètres host : *« Refuser les Verrous de Sang »*.
  Si activée, les insertions `mp_threats` ciblant ce host sont
  refusées (vérification à l'insert via RLS ou simple lecture d'un
  champ `mp_presence.accepts_threats`). Le visiteur voit *« Ce
  voyageur ne reçoit pas de Verrous. »*.
- Par défaut **opt-in** (accepte les verrous) — c'est une fonctionnalité,
  pas un piège.

### 6.10 Économie cross-plan — Essences d'Outremonde et 4 canaux de récompense

L'**Essence d'Outremonde** est la monnaie unique du système. Aucune
conversion vers l'or normal du jeu : elle alimente exclusivement les
récompenses cross-plan listées ci-dessous, isolées de l'économie
solo.

#### Sources d'essence
| Source | Gain |
|--------|------|
| Écho vaincu en combat astral (§6.8) | 1 + floor(monsterLevel/3) |
| Verrou de Sang résolu par un host (§6.9) | +3 |
| Verrou fui par un host (§6.9) | +1 |
| Première visite chez un nouveau pseudo | +5 (one-shot) |
| Souvenir débloqué (§6.10 ci-dessous) | +2 (one-shot par souvenir) |

#### Canal 1 — Set Voyageur (équipement isolé)
5 pièces dédiées, **fabriquées hors combat** depuis une nouvelle modale
"Atelier du Voyageur" accessible au hub démarrage et après une visite.
Toutes portent `slot` standard mais sont taggées `family: 'voyageur'`
(pour le bonus de set).

| Pièce | Slot | Stats | Coût |
|-------|------|-------|------|
| Diadème du Plan | head | +1 INT, +1 LCK | 8 essences |
| Cape du Voyageur | cloak | +1 AGI, regenSp:1 | 12 essences |
| Bottes du Pas Astral | feet | +1 AGI | 6 essences |
| Anneau de l'Outremonde | ring | +1 MAG, regenSp:1 | 10 essences |
| Amulette du Lien | amulet | +1 LCK, +1 INT | 10 essences |

Bonus de set (calculé dans `recalculateStats()` via comptage `family
=== 'voyageur'`) :
- **2 pièces** : +1 LCK, sprite des PNJ aperçus en visite légèrement
  doré (cosmétique).
- **3 pièces** : `bonusSpellCritChance: 5`.
- **4 pièces** : `regenSp: +2` (cumulable avec items).
- **5 pièces (set complet)** : déverrouille la prévisualisation du
  donjon distant **avant** la visite (modale d'invitation affiche un
  mini-aperçu de l'étage courant du host).

Refusable par le moteur Ironman comme tout équipement (rien à
adapter).

#### Canal 2 — Cosmétiques (fragments)
Drops occasionnels en combat astral (5 %) et en récompense de Verrou
résolu (20 %). Les fragments donnent accès à :

- **Auras de visite** : teinte alternative de l'aura dorée côté host
  (argentée, violette, verte cendrée…). Choisie dans Options.
- **Effets de portail** : variantes visuelles de l'animation §4.3
  (fissure cyan, particules de neige, runes runiques bleues).
- **Skins de fissure de Verrou** : forme du marqueur 🩸 côté host
  (étoile noire, rune, croix gammée magique).

Pas d'effet gameplay. Catalogue de ~12 cosmétiques, chacun coûtant 1-3
fragments + 5 essences à débloquer.

#### Canal 3 — Sorts exclusifs (cross-plan)
Sorts qu'on **ne peut apprendre que via essences**, en grimoires
disponibles à l'Atelier du Voyageur. Effets centrés sur le mode
exploration/visite, pour rester thématiques :

| Sort | Coût (essences) | Effet |
|------|-----------------|-------|
| **Sceau du Voyageur** | 15 | Rituel hors combat : révèle 3 cases adjacentes du donjon **propre** (utile hors visite aussi). 1 SP. |
| **Mémoire d'Outremonde** | 20 | Hors combat, dans son propre monde : restaure 10 HP et 10 SP. Cooldown : 1 fois par étage. 3 SP. |
| **Marque du Pèlerin** | 30 | En combat astral uniquement : double les essences d'un écho vaincu. 8 SP. |
| **Rappel Astral** | 25 | Permet de revenir chez le **dernier host visité** sans repasser par la liste (1 fois par session). 10 SP. |

Apprentissage permanent (s'ajoute aux `spells[]` du héros) — sortable
dans tous les contextes éligibles (hors combat host, hors Ironman).

#### Canal 4 — Souvenirs passifs
Récompenses **non achetables**, débloquées automatiquement par
*métriques de visite* (compteurs dans la save du visiteur).

| Souvenir | Condition | Effet passif |
|----------|-----------|-------------|
| **Premier Pas** | 1ʳᵉ visite réussie | +1 AGI permanent |
| **Voyageur** | 5 mondes différents visités | +1 LCK permanent |
| **Diplomate** | 20 dialogues PNJ uniques en visite | +1 INT permanent |
| **Astralien** | 15 mondes différents visités | +1 AGI, +1 LCK permanents |
| **Maître des Plans** | 50 visites totales | Coût de `Apparition Astrale` réduit de 20 % |
| **Sceau de Sang** | 10 Verrous résolus par des hosts | +5 % `bonusSpellCritDamage` |

Chaque souvenir donne aussi +2 essences au déblocage (cf. tableau
sources). Affichés dans la fiche perso (nouvelle sous-section "Carnet
de Voyage").

#### Persistance
Nouveaux champs sur `player` :
```js
outremondeEssence:     0,            // int
outremondeFragments:   0,            // int
outremondeStats:       {},           // {auraColor, portalSkin, sealSkin, ...}
outremondeSouvenirs:   {},           // {id: unlockedAt}
outremondePendingSeals:[],           // [{uid, hostName, monsterId, postedAt}]
outremondeMetrics:     {             // pour souvenirs
  visitsTotal:           0,
  uniqueHosts:           Set(),
  uniqueNpcsDialogued:   Set(),
  sealsResolved:         0,
}
```

Sérialisés dans `_serializeState` / restaurés dans `_applyState`. Sets
encodés en `Array.from()` (pattern existant `usedFountains`).

## 7. V2 — Quêtes inter-mondes (réflexion ouverte)

L'évolution naturelle de V1. **Pas planifié pour l'implémentation
immédiate**, mais déjà cadré pour ne pas peindre dans un coin lors de
la conception V1.

### 7.1 Principe

Un PNJ du host **confie une mission au visiteur**, à accomplir dans
**son propre plan** (le monde du visiteur). À l'inverse, un visiteur
peut accepter de transmettre un message ou un objet pour un PNJ du
host, dont la finalité est dans son propre monde.

C'est asymétrique et asynchrone : la quête s'**inscrit dans la save
du visiteur** au moment de l'acceptation, puis se résout chez lui
sans nécessiter que le host soit reconnecté.

### 7.2 Patterns candidats

| Pattern | Description | Difficulté |
|---------|-------------|------------|
| **Témoignage** | « Quand tu reverras le portrait du Directeur, dis-lui que je tiens bon » → en parlant à Dumbledore *dans son propre monde*, le visiteur déclenche une réplique spéciale + récompense. | Faible — étend `npc-dialog.js`. |
| **Échange de savoir** | « Voici un parchemin runique. Apporte-le au libraire du 3ᵉ étage de ton château. » → un PNJ du visiteur l'accepte et donne en retour un sort/livre/lore. | Moyen — nouveau type d'item temporaire. |
| **Récolte croisée** | « Ramène-moi 3 mandragores de ton plan — les miennes ont gelé. » → quand le visiteur revient (V1.5 : avec un nouvel `Apparition Astrale`), il peut remettre les items. | Élevé — nécessite traversée bidirectionnelle. |
| **Pèlerinage** | « Touche les 7 fontaines de ton château et reviens me le dire. » → progression côté visiteur, validation à la prochaine visite. | Moyen — flag persistant. |

### 7.3 Conséquences

- Encourage les visites **régulières** entre joueurs (pas one-shot).
- Crée du **contenu narratif émergent** : chaque visite est une
  rencontre, pas un raccourci de progression.
- Aucun équilibre PvE à protéger — les récompenses peuvent être
  généreuses (sorts uniques, équipement de saveur), ce sont des
  ajouts, pas des shortcuts.

### 7.4 Pré-requis V1 à anticiper

Pour ne pas avoir à refaire V1 quand V2 arrivera :

- Banque `dialoguesAstral` (§6.2) doit déjà supporter des **branches
  conditionnelles** simples (`if questAccepted`).
- `mp_messages` (déjà en place) pourra servir à transporter des
  "objets" légers entre mondes (`type: 'gift'` ou `'quest_item'`).
- L'identité stable `player_id` (UUID, déjà persistée) permet de
  retracer un donneur de quête entre deux visites.

Estimation V2 : **+5 à 8 j** sur V1, en grande partie du contenu
(banques de dialogues, items spéciaux, récompenses) plutôt que du
système.

## 8. Branche annexe — Co-op combat (réflexion gelée)

Le modèle Souls/Elden Ring décrit dans la **version précédente** de ce
plan reste pertinent à long terme. Conservé ici comme branche annexe
à réfléchir séparément, **pas avant V1 + V2 livrés et stabilisés**.

### 8.1 Différences techniques vs V1

- Le visiteur **agit** sur le monde du host : combat partagé, slot
  allié supplémentaire dans `battle.js`, économie XP/or partagée.
- Nécessite la couche prédiction/réconciliation (vraie sync).
- Latence en combat critique → file d'inputs serrée.
- Risque de désync, de griefing inter-niveau, d'équilibrage.
- Coût additionnel : **~14 j** sur V1, plus tests.

### 8.2 Pourquoi annexe et pas V3 obligatoire

L'**exploration découverte** suffit potentiellement à porter
l'expérience sociale du jeu. Investir 14 j dans le combat coop alors
que les quêtes inter-mondes (V2) offrent déjà une asymétrie
narrative riche est discutable. La décision se prendra **après V2**,
informée par les usages observés.

### 8.3 Branche PvP (duel direct)

Hypothétique extension de la branche co-op. Hors-scope structurel — le
plan `multiplayer.md` §5 traite déjà du PvP asynchrone (snapshot duels)
qui couvre 80 % du besoin pour 0 % du coût Realtime.

## 9. Fichiers concernés (V1 — prévisionnel)

### V1a — socle exploration (R1 conservé)

| Fichier | Nature |
|---------|--------|
| `js/portal-fx.js` (nouveau) | Animations d'ouverture/fermeture du portail (côtés visiteur et host) |
| `css/portal.css` (nouveau) | Keyframes, gradients, fissures, particules |
| `js/multiplayer.js` (étendu) | Canal Realtime, invitation, état `visitSession`, snapshot/deltas |
| `js/renderer.js` / `renderer-effects.js` | Rendu du donjon distant pour le visiteur ; `drawVisitorSprite` (aura dorée) |
| `js/renderer-minimap.js` | Classe `.map-astral-visitor` ; minimap distante côté visiteur, restreinte au visitedMask |
| `js/movement.js` | Hook : blocage de mouvement hors `remoteVisitedMask` ; suspension de la logique de combat pour le visiteur en V1a |
| `js/save.js` | `_takeVisitSnapshot()` / `_restoreFromVisit()` pour le visiteur (suspend/restore propre) |
| `js/data.js` | Nouveau sort `Apparition Astrale` (à nommer §16) |
| `js/inventory.js` | Le sort apparaît dans `openSpells`, désactivé en combat et en Ironman |
| `js/npcs.js` | Champ optionnel `dialoguesAstral` ; fallback générique par rôle |
| `js/npc-dialog.js` | Branche dialogue voyageur si `visitSession.role === 'visitor'` |
| `js/loader.js` | `MANIFEST` : `playPortalOpen`, `visitSession`, etc. |
| `index.html` | Inclure `portal.css`, `portal-fx.js` ; overlay `#portal-fx-layer` |
| `tests/smoke.js` | Scénarios : invitation, snapshot, blocage hors visitedMask, sortie volontaire |
| `CLAUDE.md` | Section « Mondes parallèles » une fois livré |

### V1b — combat local + amorce économie

| Fichier | Nature |
|---------|--------|
| `js/battle.js` | Branche `inAstralCombat` : `startBattle` accepte un `echoGroup`, `endBattle` route les gains vers `outremondeEssence`, défaite → éjection au lieu de mort |
| `js/battle-ui.js` | Indicateur "Combat astral" (bordure dorée vs rouge), HP restauré à la sortie |
| `js/dungeon.js` | `buildEcho(monsterTemplate, visitorLevel, partySize)` — réutilise `scaleMonster` + `rollGroupSize` |
| `js/movement.js` | Option "Défier l'écho" sur cellule hostile en visite ; gestion cooldown par cellule + limite 3/étage |
| `js/state.js` | Globals visite-locaux : `astralEchoesDissipated`, `astralEchoesCount[floor]` |
| `js/save.js` | `outremondeEssence`, `outremondeFragments`, `outremondeMetrics` sérialisés ; patch ciblé à la sortie de visite |
| `js/data.js` | Nouveaux items `essence_outremonde`, `fragment_voyageur` (affichage inventaire spécial) |

### V1c — Verrou de Sang + 4 canaux complets

| Fichier | Nature |
|---------|--------|
| `js/data.js` | Sorts `Verrou de Sang`, `Sceau du Voyageur`, `Mémoire d'Outremonde`, `Marque du Pèlerin`, `Rappel Astral` ; 5 pièces du Set Voyageur (`family:'voyageur'`) ; ITEMS associés |
| `js/inventory.js` | `recalculateStats()` détecte `family:'voyageur'` pour bonus de set (2/3/4/5 pièces) |
| `js/multiplayer.js` | `postBloodSeal()`, `claimResolvedSeals()` ; lecture `mp_threats` au démarrage |
| `js/battle.js` | Résolution d'une rencontre depuis un threat (loot bonus +50 or + fragment Voyageur) ; update `mp_threats.status` à `endBattle` |
| `js/renderer-effects.js` | Marqueur 🩸 sur cellule porteuse d'un Verrou ; aura rouge |
| `js/renderer-minimap.js` | Icône Verrou côté host |
| `js/movement.js` | `handleCellEntry` détecte threat → encounter forcé |
| `js/save.js` | `outremondePendingSeals`, `outremondeSouvenirs`, `outremondeStats` (cosmétiques) sérialisés |
| `js/ui.js` | Nouvelle modale "Atelier du Voyageur" (craft Set + sorts + cosmétiques) ; sous-section "Carnet de Voyage" dans fiche perso ; modale "Verrous résolus" au démarrage |
| `css/portal.css` | Skins de fissure cosmétiques |
| `tests/smoke.js` | Scénarios : pose Verrou, résolution chez host, claim asynchrone, bonus de set, déblocage souvenir |

> Comparé à R1 du plan : `battle.js` / `battle-ui.js` rentrent dans le
> scope V1b (modifications minimales — réutilisation de la boucle
> existante sur un `enemyGroup` isolé). `dungeon.js` reçoit un nouveau
> helper pour fabriquer l'écho.

## 10. Découpage en phases et critères de vérification

> Chaque phase est livrable indépendamment. Le plan vise V1
> (exploration découverte) ; V2 (quêtes) et la branche co-op sont
> séparées.

### Phase A — Sort + animation locale (sans réseau) — **3 j**
- Ajouter le sort *Apparition Astrale* (nom provisoire) dans `SPELLS`.
- Implémenter `playPortalOpen()` / `playPortalClose()` (animation
  locale uniquement, pas de connexion).
- Désactiver le sort en mode Ironman et en combat.
- verify : lancer le sort en jeu déclenche l'anim 2,8 s, l'écran
  s'assombrit, le sort est grisé en Ironman. Capture vidéo de l'anim
  jointe à la PR. `node tests/smoke.js` vert.

### Phase B — Invitation et matchmaking — **2 j**
- Table `mp_visit_requests` (SQL §12).
- Liste des destinations dans une nouvelle modale
  `#portal-target-modal`, alimentée par `mp_presence` (filtrée
  normal + `status='exploring'`).
- Flux invite/accept côté host (toast 30 s, modale d'acceptation).
- verify : depuis deux onglets différents, l'un peut demander,
  l'autre accepter. Scénario smoke ajouté.

### Phase C — Snapshot et rendu du donjon distant — **3 j**
- Ouverture du canal Supabase Realtime sur acceptation.
- Le host envoie son snapshot complet (étages débloqués + masques).
- Le visiteur **suspend** son `state.js` (`_takeVisitSnapshot`) et
  rend le donjon distant en réutilisant `renderer.js` sur un état
  injecté.
- Bouton "Quitter ce monde" côté visiteur ; déconnexion gérée.
- verify : deux onglets, le visiteur voit physiquement le donjon de
  l'autre, peut s'y déplacer dans les cases visitées. Test de sortie
  volontaire et de déco réseau (close onglet host → visiteur rapatrié,
  save intact).

### Phase D — Limites de territoire + sprites + emotes — **2 j**
- Blocage de mouvement hors `remoteVisitedMask` avec message brouillard.
- Verrouillage des escaliers vers étages non débloqués.
- Sprite du visiteur visible côté host (aura dorée + nom flottant).
- Minimap distante côté visiteur (restreinte aux cases visited).
- Emotes 👋 🪄 🏰 🎯 (§6.7).
- verify : visiteur ne peut traverser le brouillard ; host voit le
  sprite bouger en temps réel ; emotes échangées s'affichent dans
  les deux onglets.

### Phase E — Dialogues PNJ « voyageur » + interactions observation-only — **2 j**
- Champ `dialoguesAstral` optionnel dans `npcs.js`, banques pour les
  PNJ clés (Pomfresh, Lockhart, Hagrid, Dumbledore portrait, marchand).
- Fallback générique par `npc.role` pour les PNJ non scriptés.
- Coffres/fontaines/boutiques en mode observation (messages
  contextuels, pas d'interaction).
- verify : visiteur parle aux PNJ et reçoit des dialogues
  spécifiques ; coffres affichent le message brouillard ; aucun gain
  côté visiteur (XP/or/loot inchangés au retour).

### Phase F — Polish & robustesse — **1,5 j**
- Statut `closed` dans options host (désactiver les visites).
- Tooltip Ironman pour le sort grisé.
- Reconnexion automatique si Realtime drop < 5 s.
- Indicateur de qualité réseau (badge discret).
- verify : un host peut refuser les visites en un clic ; un Ironman
  voit le sort grisé avec tooltip ; coupure réseau simulée → visiteur
  rapatrié proprement.

> **Fin de V1a — socle exploration livrable** (~13,5 j cumulé).

### Phase G — Combat local + amorce économie (V1b) — **4 j**
- `dungeon.js — buildEcho(template, visitorLevel, partySize)`.
- Hook `movement.js` : option "Défier l'écho" sur cellule hostile,
  cooldown par cellule, limite 3/étage.
- `battle.js` : flag `inAstralCombat` ; `endBattle` route les gains
  vers `outremondeEssence` (formule §6.10) ; défaite = éjection (anim
  portail inverse + cooldown 5 min) au lieu de mort.
- `battle-ui.js` : bordure dorée, HP restauré à la sortie de visite.
- Vérification anti-trivialisation : `Avada Kedavra` désactivé en
  combat astral.
- verify : visiteur engage un écho, gagne 1+ essence, peut perdre sans
  pétrification. Cooldown post-défaite respecté. `tests/smoke.js`
  couvre engagement/victoire/défaite.

### Phase H — Verrou de Sang + Atelier du Voyageur (V1c) — **3 j**
- SQL : table `mp_threats` (§12) + champ `mp_presence.accepts_threats`
  (default true).
- Sort `Verrou de Sang` + flow de pose (sélection monstre, animation,
  insertion).
- Lecture des Verrous au démarrage host → matérialisation en cellules
  marquées 🩸. `endBattle` met à jour `status`.
- Modale "Verrous résolus" au démarrage visiteur, claim asynchrone.
- Modale "Atelier du Voyageur" : craft Set Voyageur, achat sorts
  exclusifs, déblocage cosmétiques.
- Sous-section "Carnet de Voyage" dans la fiche perso (souvenirs +
  métriques + essences).
- verify : pose d'un Verrou consomme 1 essence ; sur un second onglet
  host, le Verrou apparaît sur la minimap au démarrage, le combat se
  déclenche à l'entrée, host reçoit fragment Voyageur, visiteur
  redémarre et claim +3 essences. Set 5/5 actif débloque la preview
  de donjon distant.

> **Fin de V1c — système cross-plan complet** (~20,5 j cumulé).

## 11. Coûts résumés

| Palier | Effort cumulé | Effort additionnel | Inclus |
|--------|---------------|--------------------|--------|
| **V1a (Exploration découverte)** | **~13,5 j** | — | Phases A + B + C + D + E + F |
| **V1b (+ Combat local)** | **~17,5 j** | +4 j | Phase G |
| **V1c (+ Verrou de Sang + Atelier)** | **~20,5 j** | +3 j | Phase H |
| V2 (Quêtes inter-mondes) | +5–8 j | — | Banques de dialogues, items spéciaux, mécanique persistante |
| **Branche annexe co-op combat** | +14 j sur V1 | — | Combat partagé, économie partagée, prédiction/réconciliation |

Infra Supabase :
- Realtime channels : free tier (200 connexions, 2 M msg/mois).
  Charge V1 ~1 msg/sec : suffisant pour ~3000 visites
  simultanées (largement au-delà du besoin).
- Table `mp_visit_requests` : volume négligeable.
- Table `mp_threats` (V1c) : ~1 insert par Verrou + 1 update à la
  résolution. Volume estimé < 10 K rangs/mois pour 100 joueurs
  actifs — largement sous le free tier 500 MB.

Hébergement : aucun changement, GitHub Pages reste valide.

## 12. SQL

### 12.1 Table d'invitation (V1a)

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

### 12.2 Table Verrou de Sang (V1c)

```sql
create table if not exists public.mp_threats (
  id            uuid primary key default gen_random_uuid(),
  visitor_id    text not null,
  visitor_name  text not null,
  host_id       text not null,
  floor         int  not null,
  x             int  not null,
  y             int  not null,
  monster_id    text not null,                   -- clé de monsters.js
  status        text not null default 'pending', -- pending|resolved|fled|expired
  posted_at     timestamptz not null default now(),
  resolved_at   timestamptz,
  claimed_at    timestamptz,                     -- côté visiteur, marque comme réclamé
  expires_at    timestamptz not null default (now() + interval '30 days')
);
alter table public.mp_threats enable row level security;
create policy "mp_threats_read"   on public.mp_threats for select using (true);
create policy "mp_threats_insert" on public.mp_threats for insert with check (true);
create policy "mp_threats_update" on public.mp_threats for update using (true) with check (true);
create index if not exists mp_threats_host_pending_idx
  on public.mp_threats (host_id, status, floor) where status = 'pending';
create index if not exists mp_threats_visitor_unclaimed_idx
  on public.mp_threats (visitor_id, status) where claimed_at is null and status in ('resolved','fled');
```

Champ ajouté à `mp_presence` (V1c) pour l'opt-out host :
```sql
alter table public.mp_presence add column if not exists accepts_threats boolean not null default true;
```

### 12.3 Table canal de visite (V1a Phase C.2)

Transport REST polling entre host et visiteur pendant une visite
active. Lignes éphémères (`expires_at` court) — pas d'historique
nécessaire après la fin de visite. Consommée par `mpPostVisitMessage`
/ `mpPollVisitMessages` (`js/multiplayer.js`) et orchestrée par
`js/visit-channel.js`.

```sql
create table if not exists public.mp_visit_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  text not null,                     -- UUID partagé via mp_visit_requests.channel_id
  sender      text not null,                     -- 'host' | 'visitor'
  type        text not null,                     -- 'snapshot' | 'hostPosition' | 'position' | 'bye' | …
  payload     jsonb,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '15 minutes')
);
alter table public.mp_visit_messages enable row level security;
create policy "mp_visit_messages_read"   on public.mp_visit_messages for select using (true);
create policy "mp_visit_messages_insert" on public.mp_visit_messages for insert with check (true);
create index if not exists mp_visit_messages_channel_idx
  on public.mp_visit_messages (channel_id, created_at);
```

> Purge : pas de TTL automatique côté Supabase free tier — un job
> cron mensuel `delete from mp_visit_messages where expires_at < now()`
> suffit. Volume estimé ~50 msgs × 100 visites/jour = 5K lignes/jour
> (~150K/mois), bien sous le quota.

Disjoncteur : si une de ces tables n'existe pas, la fonctionnalité
concernée est désactivée silencieusement avec message contextuel ("Le
réseau astral est silencieux" pour `mp_visit_requests` ; "Les Verrous
de Sang refusent de se nouer" pour `mp_threats` ; pour
`mp_visit_messages`, le snapshot n'arrivera jamais — le visiteur sort
au timeout C.4) — cohérent avec `multiplayer.md` §11bis.

## 13. Risques et questions ouvertes

### V1a (R1 conservés)
- **Snapshot lourd pour un host avancé** : un host étage 20+ avec tout
  débloqué peut générer un snapshot de 300+ KB. Mitigation : limiter à
  l'étage courant + 2 étages au-dessus, charger les autres à la
  demande (`floorSnapshot` à l'approche d'un escalier).
- **Lore du sort niveau 8** : on bloque la fonctionnalité derrière une
  progression — discutable. Alternative : sort offert dès le palier 100
  d'une Maison, ou lié à un PNJ Dumbledore. À trancher en §16.
- **Visites multiples simultanées chez un host** : V1 = un seul
  visiteur à la fois. La file d'attente est repoussée à plus tard.
- **PNJ générés aléatoirement** côté host (`getRandomVendorsForFloor`,
  `getRandomLoreForFloor`) : seedés par étage donc déterministes pour
  une partie donnée — leur snapshot tient dans les 200 KB sans plus.
- **Cas du host déjà en combat** au moment de l'invitation : refus
  immédiat (`status='in_battle'` filtré). Pas de file d'attente —
  re-demander quand le combat finit.
- **Le visiteur peut voir un PNJ qui n'existe pas chez lui** : c'est
  exactement le point ! `getRandomLoreForFloor` produit des PNJ
  différents selon l'identité de la partie. Bonus narratif.

### V1b — combat local
- **Triche par client visiteur** : le combat se résout entièrement
  client-side, le visiteur peut éditer son `outremondeEssence`
  manuellement. Mitigation V1 : aucun rate-limit serveur, on accepte le
  risque (impact = leur propre progression cross-plan, isolée du jeu
  solo et du Hall of Fame). Si nécessaire V2 : signer les gains côté
  serveur via Edge Function.
- **Équilibrage des échos vs progression visiteur** : un visiteur
  niveau 5 visite un host niveau 20 — l'écho doit être à son niveau
  pour rester jouable, mais quel niveau ? Décision : niveau du visiteur
  (game over rapide sinon). Vérification empirique à faire en
  playtest.
- **Loop de farm sur un seul host** : limite 3 échos par étage par
  visite + cooldown par cellule (déjà dans §6.8). À surveiller.
- **Items consommables consommés en combat astral** : faut-il les
  remettre à la sortie ? **Décision** : oui, ils sont restaurés (cohérent
  avec restauration HP/SP). Coûte un peu plus de code de snapshot mais
  évite le piège « j'ai brûlé toutes mes potions chez un autre ».

### V1c — Verrou de Sang
- **Triche par snapshot falsifié** : un host malicieux peut forger un
  faux donjon pour ne jamais résoudre les Verrous. Conséquence visiteur :
  pas d'essence asynchrone. Mitigation : si un Verrou reste `pending`
  > 30 jours (`expires_at`), il est auto-classé `fled` et le visiteur
  reçoit la consolation de 1 essence. Accepter en l'état pour le
  reste.
- **Un host peut spam des Verrous chez lui-même via 2 comptes** : si
  un visiteur pose un Verrou et que le host le résout intentionnellement,
  les deux profitent. Mitigation : la récompense host est modeste (50
  or + 1 fragment, pas d'XP), donc le farm ne casse pas l'économie
  solo. Le visiteur est plafonné à 10 Verrous en attente.
- **Conflit de cellule** : un visiteur pose un Verrou sur une cellule
  qui devient plus tard une cellule d'escalier (édition de map
  impossible mais théorique). Décision : à la matérialisation, si la
  cellule courante n'est pas FLOOR/walkable, on déplace au plus proche
  voisin valide. Si aucun, on auto-classe `expired`.
- **Combinatoire Set Voyageur vs équipement existant** : les pièces
  Voyageur viennent s'ajouter au pool d'équipement, possible
  optimisation overpowered avec d'autres items. Mitigation : stats
  modestes par pièce (+1 stat, regen 1), bonus de set graduels. Tableau
  §6.10 à itérer après playtest.

### Transversal
- **Persistance d'un souvenir de visite** côté visiteur : V1c apporte
  le "Carnet de Voyage" via les souvenirs passifs (§6.10 canal 4), ce
  qui couvre cette ouverture R1.

## 14. Hors-scope

- Salons "open world" persistants (plusieurs visiteurs simultanés
  dans le même donjon).
- Donjon généré conjointement par les deux joueurs.
- Combat coop *synchrone* avec le visiteur agissant aux côtés du host
  sur les monstres réels (branche annexe §8). Le combat V1b reste
  **local et isolé** : pas d'interaction entre les deux acteurs sur le
  même `enemyGroup`.
- PvP en direct (couvert par `multiplayer.md` Phase 7 si jamais).
- Voix / chat texte libre en temps réel.
- Classement compétitif des visites ou des essences (cf. §6.10 :
  économie isolée).
- Tout pour Ironman (gel ferme — cf. §2.1).
- Conversion essences ↔ or normal ↔ XP (économies cloisonnées).

## 15. Suivi

- [x] Pivot conceptuel n°1 (2026-05-25) : multi-sync de saves → visites
      dimensionnelles. Ironman exclu.
- [x] Pivot conceptuel n°2 (2026-05-25) : co-op combat → **exploration
      découverte**. Co-op déplacé en branche annexe §8.
- [x] Pivot conceptuel n°3 (2026-05-25 R2) : ajout combat local + Verrou
      de Sang + économie cross-plan (4 canaux de récompense). Le visiteur
      a maintenant une agency dans le monde de l'autre, sans toucher son
      économie ni son XP/or solo.
- [x] Décisions V1a §16.1/2/3/7 figées (2026-05-25) : Cheminette
      Inter-Mondes, niv. 8, 25 PM, sprite host visible par défaut.
- [ ] **V1a** — exploration découverte (13,5 j)
    - [x] Phase A — sort + animation locale (3 j) — **livré
      2026-05-25** (PR #260). Sort `Cheminette Inter-Mondes` + anim
      4 phases + icône PNG dédiée + double-gate Ironman. Scénario
      smoke `scenarioParallelPortal` (T1→T7).
    - [x] Phase B — invitation et matchmaking Supabase (2 j) —
      **livré 2026-05-25**. API REST dans `js/multiplayer.js` :
      `mpListAvailableHosts` (GET `mp_presence` filtré normal +
      exploring + récent + pas moi), `mpPostVisitRequest` (POST
      `mp_visit_requests`), `mpPollOutgoingVisitStatus` (GET status),
      `mpRespondVisitRequest` (PATCH accepted/refused),
      `_mpPollIncomingVisitRequests` (poll côté host toutes les 3 s
      via `_mpVisitsAttach` branché à `mpStartSession`/`mpStopSession`).
      Disjoncteur dédié `_mpVisitTableMissing` : si la table n'existe
      pas (404), désactivation silencieuse. UI dans
      `js/portal-matchmaking.js` : modale `#portal-target-overlay`
      (liste destinations, écran d'attente, gestion timeout 60 s) +
      modale `#portal-incoming-overlay` (acceptation host avec
      décompte 30 s, refus implicite au timeout). Le handler `portal`
      enchaîne désormais animation 2,8 s puis `openPortalTargetModal()`.
      L'animation de voyage est rejouée à l'acceptation par
      `_onVisitorAccepted` (hook `window.onVisitAccepted` pour Phase C).
      Scénario smoke `scenarioPortalMatchmaking` (8 assertions T1→T8) :
      liste vide / null / 2 hosts, clic → pose, poll → acceptation,
      modale host → accepter/refuser. Stubs des fonctions `mp*` via
      `window.*` pour rester déterministe en file://.
      Prochaine phase : C — snapshot Supabase Realtime + rendu du
      donjon distant via `_takeVisitSnapshot()` / `_restoreFromVisit()`.
    - [ ] Phase C — snapshot et rendu du donjon distant (3 j).
        - [x] C.1 — snapshot et suspend/restore (pur, sans réseau) —
          **livré 2026-05-26**. 4 helpers ajoutés dans `js/save.js` :
          `_takeVisitSnapshot()` (deep-clone via JSON de
          `_serializeState()`), `_restoreFromVisit()` (applique
          `visitSession.mySavedState` via `_applyState`), couple
          host/visiteur `mpBuildVisitSnapshot()` (construit payload
          §5.1 — étage courant en C.1, multi-étages reporté C.3) /
          `mpApplyVisitSnapshot(snapshot)` (capture visiteur,
          injecte `dungeon`/`visited`/`npcPlacements` du host,
          neutralise `enemyMap`/`itemMap`, pose visiteur sur
          `visitorSpawn` calculé par `_visitFindAdjacentSpawn`).
          Global `visitSession` (état transient) ajouté dans
          `state.js`. MANIFEST loader complété (5 entrées optional).
          Scénario smoke `scenarioVisitSnapshot` (T1→T7) couvre :
          exposition globaux, roundtrip pur, structure du snapshot
          host, apply correct (visitSession actif, dungeon distant
          injecté, party intacte, enemyMap/itemMap vides),
          refus de double-apply, restore complet, no-op silencieux
          si pas de session. **Décision pivot V1c §6.6** : la garde
          contre double-apply protège déjà du cas "session pendante"
          si le futur transport REST envoie deux snapshots avant
          que le visiteur ne sorte. Transport déféré au C.2.
        - [x] C.2 — transport REST polling — **livré 2026-05-26**.
          Décision : REST polling (cohérent Phase B, zéro dépendance)
          plutôt que Supabase Realtime SDK CDN. Surface ajoutée :
          • `multiplayer.js` : `mpPostVisitMessage(channelId, sender,
            type, payload)` + `mpPollVisitMessages(channelId, sinceIso,
            excludeSender)` ; `mpRespondVisitRequest` étendu avec un
            paramètre `channelId` (UUID généré côté host à l'acceptation,
            patché dans `mp_visit_requests`). `mpPollOutgoingVisitStatus`
            sélectionne maintenant `channel_id` pour que le visiteur le
            récupère.
          • Nouveau fichier `js/visit-channel.js` (orchestrateur,
            ~250 lignes) : `mpStartVisitAsVisitor({channelId, hostId,
            hostName, hostHouse})`, `mpStartVisitAsHost({channelId, req})`,
            `mpExitVisit(reason)`, helpers internes `_visitPollOnce`,
            `_visitHandleMessage`, `_visitGetState`, `_visitGenChannelId`.
            Cycle de vie : visiteur démarre poll → reçoit `snapshot` →
            applique via `mpApplyVisitSnapshot` + redraw ; host poste
            snapshot initial + démarre poll. Sortie : poste `bye`,
            stoppe le poll, restore (visiteur seulement) ; réception
            `bye` partenaire = sortie locale silencieuse (pas de
            boucle d'au revoir).
          • Branchement hooks : `window.onVisitAccepted` (visiteur) +
            `window.onIncomingVisitAccepted` (host) — déjà appelés par
            `portal-matchmaking.js` ; `_acceptIncomingVisit` génère
            désormais le channelId via `window._visitGenChannelId()` et
            le transmet à `mpRespondVisitRequest` + `onIncomingVisitAccepted`.
          • Fix `mpApplyVisitSnapshot` : `enemyMap`/`itemMap` reçoivent
            désormais des grilles 2D de la bonne forme (cases null)
            plutôt qu'un tableau vide — sinon `enemyMap[y][x]` du
            renderer/movement crashait.
          • PRECACHE PWA : bump `multiplayer.js?v=4 → ?v=6`,
            `portal-matchmaking.js?v=1 → ?v=2`, ajout de
            `visit-channel.js?v=1` dans index.html.
          • MANIFEST loader : 5 nouvelles entrées optional.
          • Scénario smoke `scenarioVisitChannelTransport` (T1→T7,
            stubs REST sans Supabase) : surface exposée, démarrage
            visiteur + snapshot reçu + apply, exit visiteur + bye posté
            + restore, démarrage host + snapshot posté, host reçoit bye
            visiteur + sortie silencieuse (pas de bye croisé), refus
            double-start, hook `onVisitAccepted` déclenche bien le
            démarrage visiteur avec channel_id remonté.
          Tous scénarios verts.
          SQL `mp_visit_messages` à documenter dans §12.3 (TODO mineur).
        - [x] Phase C.3 — rendu du donjon distant + bouton "Quitter ce
          monde" + chargement paresseux multi-étages. ~1 j —
          **livré 2026-05-26** (C.3a + C.3b).
            - [x] C.3a — bandeau de visite + bouton "Quitter ce monde"
              + blocage des interactions chez le host
              (parallel-worlds.md §6.4). **Livré 2026-05-26**.
              Nouveau module `js/visit-hud.js` (`showVisitHud` /
              `updateVisitHud` / `hideVisitHud` + handler
              `_visitHudExit`), bandeau `#visit-hud` fixed top z-index
              9000 dans `index.html`, CSS dédiée dans `css/portal.css`
              (palette dorée/grenat + responsive ≤700px). Hooks
              show/hide branchés dans `js/visit-channel.js`
              (post-snapshot reçu + sortie via `mpExitVisit` +
              réception `bye`). Redraw immédiat (drawDungeon /
              renderMinimap / updateUI) après restore pour que le
              visiteur retrouve son donjon sans avoir à bouger.
              `movement.js — _exploreDescriptors` détecte
              `visitSession.role === 'visitor'` et renvoie des
              descripteurs observation-only (un seul bouton
              "S'éloigner", message qui évoque le host) pour les 9
              types de cellules interactives (CHEST, SHOP, STAIRS_D,
              STAIRS_U, FOUNTAIN, ALTAR, FORGE, LIBRARY, STELE).
              `handleCellEntry` ajoute un garde-fou pour TRAP / NPC /
              RUNE qui ne passent pas par l'overlay — pas de mutation
              du donjon distant, dialogue PNJ reporté à Phase E.
              MANIFEST loader complété (3 entrées optional). Bumps de
              version : `portal.css?v=2`, `visit-channel.js?v=2`,
              `visit-hud.js?v=1`, `movement.js?v=14`, `loader.js?v=9`.
              Scénario smoke `scenarioVisitHudAndBlock` (T1→T7) : 7
              tests couvrent la surface du module, l'affichage avec
              blason + étage, le pipeline complet snapshot → HUD,
              le blocage des 4 types de cellules interactives, la
              sortie volontaire via le bouton (bye posté + HUD masqué
              + session refermée), et le retour à la normale hors
              visite.
            - [x] C.3b — chargement paresseux multi-étages
              (parallel-worlds.md §3.5 / §5.3). **Livré 2026-05-26**.
              Nouveau message Realtime `floorSnapshot` (forme
              identique à `snapshot` mais sans recapture de la
              `mySavedState` du visiteur — préserve la save d'origine
              à travers les changements d'étage). Côté host : nouvelle
              fonction `_visitHostNotifyFloorChange()` (exposée
              globalement) qui construit puis poste le snapshot, hook
              dans `movement.js — _changeFloor` à la fin de la
              transition (idempotent : no-op silencieux hors visite).
              Côté visiteur : nouveau handler dans
              `_visitHandleMessage` pour `floorSnapshot` qui appelle
              `mpApplyVisitFloorUpdate(payload)` (helper ajouté dans
              `save.js`) — patch `dungeon`/`visited`/`npcPlacements`/
              `currentFloor`/`playerX`/`playerY`/`playerDir` +
              neutralise `enemyMap`/`itemMap`, met à jour
              `visitSession.remoteHostMeta` (HUD reflète le nouvel
              étage), redraw immédiat. MANIFEST loader complété
              (1 entrée optional). Bumps de version : `save.js?v=10`,
              `visit-channel.js?v=3`, `movement.js?v=15`,
              `loader.js?v=10`. Scénario smoke
              `scenarioVisitFloorUpdate` (T1→T6) : surface des
              helpers, refus hors session, pipeline complet snapshot
              étage 3 → floorSnapshot étage 4 (mySavedState préservée,
              donjon distant remplacé, HUD mis à jour), sortie propre
              après multi-étages, hook host poste floorSnapshot, no-op
              hors visite.
        - [x] C.4 — détection de drop réseau (timeout 10 s),
          restauration automatique. ~0,5 j — **livré 2026-05-27**.
          Mécanisme keepalive + watchdog : chaque côté poste un
          message `ping` toutes les 4 s (`VISIT_PING_MS`) via un
          `setInterval` dédié `_pingTimer`. À chaque cycle de poll,
          `_lastSeen` est rafraîchi sur toute réception (y compris
          `ping`) ; `_visitCheckTimeout` est appelé en fin de poll
          et déclenche `_handleNetworkDrop` si plus de 10 s
          (`VISIT_TIMEOUT_MS`) sans message reçu. Le drop ne poste
          AUCUN `bye` (partenaire injoignable par hypothèse) — la
          rupture est détectée symétriquement de l'autre côté par son
          propre timeout. Côté visiteur : `_restoreFromVisit` + redraw
          + toast *« Le lien astral s'est rompu — tu retournes dans
          ton monde. »*. Côté host : ferme la session silencieusement
          + toast *« <Pseudo> s'est dissipé — la connexion s'est
          éteinte. »*. Surface tests ajoutée :
          `_visitCheckTimeout`, `_visitSendPing`,
          `_visitForceLastSeen(ts)`. Bumps de version :
          `visit-channel.js?v=4`. Scénario smoke
          `scenarioVisitNetworkDrop` (T1→T7) : surface, no-op hors
          session, drop déclenché côté visiteur (save restaurée + or
          retrouvé + pas de bye posté), ping reçu rafraîchit
          `lastSeen` (session conservée), `_sendPing` poste un
          message signé par le rôle courant, `_sendPing` hors session
          est no-op, drop côté host ferme la session sans poster de
          bye.
    - [x] Phase D — limites de territoire + sprites + emotes (2 j) —
      **livré 2026-05-28**.
      • `movement.js` : `canMove` rejette toute case hors
        `visited[ny][nx]` quand `visitSession.role === 'visitor'` ;
        `_step` distingue brouillard vs mur et affiche un message dédié
        (« Le brouillard t'empêche d'aller plus loin — ce passage n'a
        pas encore été foulé par <Pseudo>. ») via `setNarrative` + toast
        `addMsg`. Helper `_isVisitorFogBlock(dir)` exposé. Hook position
        routé : pendant une visite, `_step` appelle
        `_visitNotifyVisitorMove` (visiteur) ou `_visitNotifyHostMove`
        (host) au lieu de l'upsert `mp_presence` (le visiteur n'apparaît
        pas comme une présence asynchrone aux coords du host).
      • Verrouillage des escaliers : déjà couvert par les descripteurs
        observation-only de C.3a (`_visitorExploreDescriptors`) — un
        seul bouton « S'éloigner » sur `STAIRS_D` / `STAIRS_U`, pas de
        `goDeeper`/`goUp` accessible au visiteur. Le suivi du host à
        travers les étages reste piloté par `floorSnapshot` (C.3b).
      • `visit-channel.js` : pose `visitSession = { role:'host',
        visitorId, visitorName, visitors:[] }` au démarrage host ; nouveaux
        handlers `position` (host → maj `visitors[0]` + redraw) et
        `hostPosition` (visiteur → maj `remoteHostPosition` + redraw) ;
        helpers `_visitNotifyVisitorMove` / `_visitNotifyHostMove`
        throttlés (1,2 s) ; `_visitSendEmote(kind)` throttlé (1,5 s)
        avec banque fermée validée à l'envoi ET à la réception ; helpers
        de lecture `getVisitorAt(x,y)` / `getRemoteHostAt(x,y)` filtrés
        par étage courant (anti stale position après changement d'étage).
        Reset `visitSession` host à `_visitReset` ; redraw forcé à la
        sortie/drop/bye dans les deux sens. Banques `VISITOR_EMOTES`
        (4 : 👋 🪄 🏰 🎯) et `HOST_EMOTES` (1 : 👋) exposées sur window.
      • `renderer-effects.js` : `drawVisitorSprite(visitor, x, baseY, sz)`
        — silhouette warm + aura DORÉE pulsée + étiquette nom flottante,
        distincte du cyan spectral des fantômes asynchrones
        (`drawGhostSprite`). Pas de PNG plein-pied requis en V1a.
      • `renderer.js` : scan `pendingSprite` détecte un visiteur via
        `getVisitorAt` AVANT le ghost asynchrone (priorité : incarné >
        écho > message gravé). Branche `kind: 'visitor'` dans la
        boucle de dessin.
      • `renderer-minimap.js` : classes `.map-astral-visitor` (or pulsé,
        côté host) et `.map-host-self` (or-vert, côté visiteur) posées
        sur les cases concernées, distinctes de `.map-ghost` (cyan
        spectral) et `.map-message` (or message gravé).
      • `style.css` : palettes dédiées + keyframes `mapVisitorPulse`.
      • `visit-hud.js` : `showVisitHud(opts.role)` peuple la barre
        `#visit-hud-emotes` selon la banque du rôle, libellé du bouton
        sortie distinct (« Quitter ce monde » visiteur / « Refermer
        la cheminée » host). `_visitHudEmote(kind)` délègue à
        `_visitSendEmote`. Banque close côté UI (les boutons ne sont
        rendus QUE pour les kinds existants).
      • `portal.css` : style `.visit-hud-emote` (32×32 carré or chaud,
        hover + active states) + responsive ≤700px (28×28).
      • `index.html` : `<div id="visit-hud-emotes">` ajouté dans
        `#visit-hud`. Bumps de version : `style.css?v=21`,
        `portal.css?v=3`, `renderer.js?v=9`, `renderer-effects.js?v=9`,
        `renderer-minimap.js?v=5`, `movement.js?v=16`,
        `visit-channel.js?v=5`, `visit-hud.js?v=2`, `loader.js?v=11`.
      • `sw.js` : `CACHE_VERSION` bumpé `hogwarth-v2 → hogwarth-v3` +
        PRECACHE versions alignées (movement / loader / style /
        renderer*).
      • MANIFEST loader complété (10 entrées optional) — fog block,
        notify hooks, send emote, getVisitorAt/getRemoteHostAt,
        drawVisitorSprite, _visitHudEmote, VISITOR_EMOTES / HOST_EMOTES.
      • Scénario smoke `scenarioVisitPhaseD` (T1→T7) : surface, blocage
        brouillard (canMove rejette puis accepte après révélation),
        émission position visiteur (message posté avec coords/dir/floor),
        réception position côté host (visitSession.visitors peuplé,
        getVisitorAt OK, HUD côté host avec emote 👋), envoi/réception
        emote (banque close, emote inconnue ignorée silencieusement),
        sortie host (visitSession nullée, sprite/marqueur disparaît,
        bye posté). Tous scénarios verts (`node tests/smoke.js`).
    - [x] Phase E — dialogues PNJ « voyageur » + observation-only (2 j) —
      **livré 2026-05-28**.
      • `npcs.js` : champ optionnel `dialoguesAstral` (string | array)
        ajouté à 5 PNJ scénaristes — Pomfresh (quête), Lockhart (quête,
        ego), Hagrid (quête), Mimi Geignarde (fantôme + quête), Portrait
        Dumbledore (action spéciale). Banque authored réutilisée par
        `_astralPagesFor`.
      • `npc-dialog.js` : nouveau dispatcher `openAstralNpcDialog(npcId)`
        qui réutilise l'overlay `#npc-dialog-overlay` mais branche sur
        `npc.dialoguesAstral` OU sur `_astralFallbackPages(npc)` (cascade
        `_astralCategory` : `quest` > `vendor` > `special` > `lore` >
        `default`). Pose `_dialogState.source = 'astral'`, sous-titre
        suffixé « · 🌀 voyageur d'un autre plan » pour signaler le mode
        au lecteur. Actions réduites à un seul bouton « S'éloigner » —
        aucune mutation possible de l'état du host (pas d'`acceptQuest`,
        pas d'`openVendorShop`, pas de `triggerNpcSpecialAction`).
        Banque fallback fermée : pas d'injection de chaînes externes.
      • `movement.js — handleCellEntry` : sur `CELL.NPC` en mode visite,
        route vers `openAstralNpcDialog` si présent ; repli sur le toast
        muet existant sinon (sécurité). Aucun side-effect côté visiteur :
        pas de modification de `seenNpcs`, `activeQuests`,
        `availableQuests`, `completedQuests` ni `usedSpecialNpcs` —
        l'overlay ne déclenche que la fermeture de session standard.
      • MANIFEST loader complété (3 entrées optional) :
        `openAstralNpcDialog`, `_astralCategory`, `_astralFallbackPages`.
        Bumps de version : `npcs.js?v=10`, `npc-dialog.js?v=9`,
        `movement.js?v=17`, `loader.js?v=12`. `CACHE_VERSION`
        `hogwarth-v3 → hogwarth-v4`.
      • Scénario smoke `scenarioVisitPhaseE` (T1→T7) : surface
        (`openAstralNpcDialog`/`_astralCategory`/`_astralFallbackPages`),
        catégorisation (`pomfresh→quest`, `rosmerta→vendor`,
        `fumseck→quest` car questsGiven prioritaire, `mimi→quest`),
        ouverture authored (Pomfresh, banque custom + tag voyageur +
        absence de boutons engageants + `activeQuests` inchangé),
        fallback `quest` (Manon — « mission / liens entre mondes »),
        fallback `vendor` (Rosmerta — « marchandises n'ont pas de
        poids / murmure »), intégration `handleCellEntry` en visite
        (overlay ouvert avec tag voyageur), retour à `openNpcDialog`
        normal hors visite (pas de tag voyageur). Tous scénarios verts
        (`node tests/smoke.js`).
    - [x] Phase F — polish (1,5 j) — **livré 2026-05-28**.
      • **Toggle d'accueil côté host** (§16.7) : nouveau global
        `visitsClosed` (state.js), persisté dans
        `_serializeState`/`_applyState` (false par défaut pour les
        anciennes saves). Bouton 🚪/🔒 ajouté à la barre HUD
        (`#btn-visits`), handler `toggleVisitsClosed` (`ui.js`) qui
        bascule la valeur, met à jour l'icône via `_updateVisitsBtn`,
        affiche un toast et déclenche `autoSave('visits-toggled')`.
        `_updateVisitsBtn` est aussi appelé par `updateUI` pour
        synchroniser le bouton à un load de save. Propagation au
        réseau : `_mpPresenceRow` envoie `status='closed'` au lieu de
        `'exploring'` quand `visitsClosed` — `mpListAvailableHosts`
        filtre déjà sur `exploring` donc le host disparaît
        automatiquement de la liste des destinations. Auto-refus côté
        entrant : `_mpPollIncomingVisitRequests` détecte `visitsClosed`
        et appelle `mpRespondVisitRequest(..., 'refused')`
        silencieusement, sans afficher la modale d'acceptation.
      • **Tooltip Ironman** : déjà en place depuis Phase A
        (`inventory.js — openSpells`, libellé « ⚜ Voie solitaire —
        l'Ironman se joue seul »). Phase F ajoute un test de
        non-régression dédié.
      • **Reconnexion automatique** (`visit-channel.js`) : fenêtre de
        grâce entre 5 s et 10 s sans message reçu.
        `_visitCheckTimeout` détermine 3 paliers — `good` (< 5 s),
        `degraded` (5–10 s, `_enterReconnectMode` bascule les timers
        vers une cadence resserrée — poll 800 ms / ping 1,5 s au lieu
        de 2,5 s / 4 s), `lost` (> 10 s, drop hard). Au retour sous
        le seuil dégradé, `_exitReconnectMode` rétablit la cadence
        normale. Drapeau `_reconnectMode` évite de re-poser les
        intervals à chaque check. Helpers `_visitGetQuality` /
        `_visitIsReconnecting` exposés pour tests.
      • **Badge de qualité réseau** (`visit-hud.js` + `portal.css`) :
        `#visit-hud-quality` (pastille + label),
        `updateVisitQualityBadge(quality)` met à jour `data-quality`,
        le label (Stable / Instable / Rompue) et le tooltip. Pastille
        verte (good), or pulsé (degraded, animation
        `visitQualityPulse`), rouge fixe (lost). Reset à `good` à
        `hideVisitHud`.
      • MANIFEST loader complété (6 entrées optional) : `visitsClosed`,
        `toggleVisitsClosed`, `_updateVisitsBtn`,
        `updateVisitQualityBadge`, `_visitGetQuality`,
        `_visitIsReconnecting`. Bumps : `portal.css?v=4`,
        `state.js?v=10`, `ui.js?v=5`, `save.js?v=11`,
        `multiplayer.js?v=7`, `visit-channel.js?v=6`,
        `visit-hud.js?v=3`, `loader.js?v=13`. `CACHE_VERSION`
        `hogwarth-v4 → hogwarth-v5`.
      • Scénario smoke `scenarioVisitPhaseF` (T1→T6) : surface,
        toggle (icône 🚪↔🔒, tooltip, persistance dans
        `_serializeState`, double-toggle restaure), badge dans les
        3 états, fenêtre de grâce (good → degraded à 7 s →
        reconnect mode actif → recovery à 3 s → good → reconnect
        désactivé), drop hard à 15 s (session refermée), tooltip
        Ironman non-régression. Tous scénarios verts.

> **Fin de V1a — socle exploration livrable** (~13,5 j cumulé, A→F).
- [x] **V1b** — combat local + amorce économie (4 j)
    - [x] Phase G — combat local asymétrique + essences — **livré 2026-05-28**.
      • `state.js` : 5 nouveaux globaux. `inAstralCombat` (flag combat
        astral), `outremondeEssence` (monnaie cross-plan, persistée),
        `astralCellsDefeated` (Set des cellules dissipées dans la
        visite courante), `astralFloorKills` (compteur d'écho par
        étage), `astralExileCooldownUntil` (timestamp 5 min après une
        défaite, persisté).
      • `save.js` : sérialisation de `outremondeEssence` et
        `astralExileCooldownUntil` dans `_serializeState` /
        `_applyState`. Repli à 0 pour les saves antérieures.
      • `dungeon.js — buildEcho(monsterId, visitorLevel)` : helper pur
        qui construit un écho scalé au niveau du visiteur (pas au
        floor du host), drop/or neutralisés, marqueur `_echo:true` et
        préfixe « Écho · ». Le caller passe l'écho à
        `startBattle(echo, {astral:true, echoGroup:[echo]})`.
      • `battle.js — startBattle` accepte `opts.astral` qui pose
        `inAstralCombat = true` et la classe body `in-astral-combat`
        (bordure dorée CSS). `opts.echoGroup` court-circuite le tirage
        de groupe — l'écho est posé seul (pas d'escalade duo).
      • `battle.js — endBattle / triggerDeath` : interception du mode
        astral via `_finishAstralCombat(won)`. Victoire → essence
        ajoutée selon §6.10 (`1 + floor(_level/3)` par écho),
        cellule marquée dissipée, `astralFloorKills++`. Pas d'XP, pas
        d'or, pas de drops, pas de quêtes kill, pas de points de
        Maison, pas d'Ironman. Défaite → pas de pétrification ;
        cooldown 5 min posé sur `astralExileCooldownUntil` (aussi dans
        `visitSession.mySavedState` pour survivre à
        `_restoreFromVisit`), `mpExitVisit('astral-defeat')` ramène le
        visiteur dans son monde.
      • `battle-spells.js — castSpellInBattle` : Avada Kedavra
        (`effect:'instant'`) refusée en combat astral avec message
        narratif (« L'écho refuse cette mort »).
      • `inventory.js — openSpells` : cooldown 5 min sur la
        Cheminette Inter-Mondes après défaite (calculé depuis
        `astralExileCooldownUntil`). Bouton grisé + tooltip
        « 💫 Ton lien astral se reforme — X min Ys ».
      • `visit-channel.js` : helpers `_canEngageAstralCombat()` (vrai
        si visiteur + hors combat + cellule pas dissipée + sous la
        limite 3/étage), `_astralFightsRemaining()`, `engageAstralCombat()`
        qui tire un monstre éligible au floor distant
        (`MONSTERS.filter` sur `[minFloor, maxFloor]`), construit
        l'écho via `buildEcho` et lance le combat. `_refreshAstralButton()`
        synchronise l'UI. Compteurs reset à chaque `snapshot`/
        `floorSnapshot`.
      • `movement.js` : hook `_refreshAstralButton` après chaque pas
        en visite (le `canEngage` dépend de la cellule courante).
      • `visit-hud.js` + `index.html` + `portal.css` : bouton
        `#visit-hud-astral` avec compteur « x/3 ». Caché côté host,
        désactivé en cellule dissipée ou limite atteinte. Bordure
        dorée du combat astral via `body.in-astral-combat` (CSS).
      • MANIFEST loader complété (11 entrées optional). Bumps :
        `portal.css?v=5`, `state.js?v=11`, `dungeon.js?v=12`,
        `movement.js?v=18`, `battle.js?v=7`, `battle-spells.js?v=3`,
        `inventory.js?v=6`, `save.js?v=12`, `visit-channel.js?v=7`,
        `visit-hud.js?v=4`, `loader.js?v=14`. `CACHE_VERSION` v5 → v6.
      • Scénario smoke `scenarioVisitPhaseG` (T1→T7) : surface
        (globaux + helpers + bouton DOM), `buildEcho` (gold/drops
        neutralisés, préfixe, `_level`, id inconnu → null), engagement
        (`inAstralCombat=true`, enemyGroup peuplé, classe body posée),
        victoire (gold/XP/level intacts, essence incrémentée, cellule
        marquée, compteur incrémenté, flags reset), limite 3/étage
        (engageAstralCombat refuse au-delà), défaite (pas de
        death-screen, cooldown 5 min, mpExitVisit appelé, flags reset),
        Avada refusée en astral. Tous scénarios verts
        (`node tests/smoke.js`).

- [x] **V1c** — Verrou de Sang + Atelier (MVP, 3 j) — **livré 2026-05-28**
    - [x] Phase H — Verrous + Set Voyageur — **livré 2026-05-28** (MVP V1c).
      • `state.js` : `inSealedCombat`, `outremondeFragments`,
        `outremondePendingSeals` (persistés), `hostSealsByFloor` et
        `currentBloodSeal` (transients).
      • `data.js` : sort `Verrou de Sang` (effet `blood_seal`, 5 PM, OOC
        en visite) + 5 items Set Voyageur (slot head/cloak/feet/ring/amulet,
        `family:'voyageur'`, `_outremondeCost` 8/12/6/10/10).
      • `multiplayer.js` : 5 helpers REST sur `mp_threats` —
        `mpPostBloodSeal`, `mpListHostSealsForFloor`,
        `mpUpdateSealStatus`, `mpListVisitorResolvedSeals`,
        `mpClaimSeal`. Disjoncteur dédié `_mpThreatsTableMissing` (404
        → désactivation silencieuse).
      • `js/atelier-voyageur.js` (nouveau, ~280 lignes) : modale
        `#atelier-voyageur-overlay` partagée par 3 vues —
        `openBloodSealTargetModal(caster)`, `openAtelierVoyageur()`,
        `_showClaimsModal`. Helpers `loadHostSealsForCurrentFloor`,
        `getBloodSealAt(x,y)`, `_triggerHostBloodSeal(x,y)`,
        `_claimResolvedSeals()`.
      • Hooks d'intégration : `mpStartSession` (claim + chargement host
        à la connexion), `movement.js — _changeFloor` (recharge host
        par étage), `_step` (interception prioritaire), `endBattle`
        (update status + bonus 50 G + 1 fragment côté host),
        `recalculateStats` (bonus Set 2/3/4 pièces),
        `SPELL_OOC_HANDLERS.blood_seal` (gating + modale),
        `_renderCarnetVoyagePanel` (sous-section fiche perso).
      • `renderer-minimap.js` : classe `.map-blood-seal` (rouge grenat
        pulsé). `index.html` : `#btn-atelier` (HUD). `css/portal.css`
        + `css/style.css` : modale atelier + minimap keyframes.
      • `js/item-icons.js` : 5 entrées Set Voyageur (alias temporaires)
        + sort `Verrou de Sang` (alias). À régénérer via
        `tools/icon_factory.py` en V1c.1.
      • MANIFEST loader complété (19 entrées optional). Bumps :
        `portal.css?v=6`, `style.css?v=22`, `state.js?v=12`,
        `data.js?v=10`, `ui.js?v=6`, `save.js?v=13`,
        `multiplayer.js?v=8`, `battle.js?v=8`, `inventory.js?v=7`,
        `movement.js?v=19`, `renderer-minimap.js?v=6`,
        `item-icons.js?v=8`, `loader.js?v=15`. Nouveau
        `atelier-voyageur.js?v=1`. `CACHE_VERSION` v6 → v7.
      • Scénario smoke `scenarioVisitPhaseH` (T1→T7) : surface, pose
        Verrou, claim asynchrone, craft Voyageur, bonus Set 2/3/4
        pièces, host load + minimap, combat de résolution. Tous
        scénarios verts.

> ~~**Différé en V1c.1**~~ : livré 2026-05-28 (cf. ci-dessous).

- [x] **V1c.1** — Souvenirs / cosmétiques / sorts cross / anim rune —
  **livré 2026-05-28**. V1 du système de mondes parallèles est désormais
  **complète** (Phases A→H + V1c.1, ~22,5 j cumulés).
    - `state.js` : 6 nouveaux globaux. `outremondeMetrics` (object —
      `visitsTotal`, `uniqueHosts:Set`, `sealsResolved`, `echosDefeated`,
      `pilgrimMark`), `outremondeSouvenirs:Set`, `outremondeCosmetics:Set`,
      `outremondeActiveAura`, `outremondeActivePortalSkin`,
      `outremondeActiveFissureSkin`. Tous persistés (Sets sérialisés en
      Arrays).
    - `data.js` :
      • 4 sorts cross-plan tagués `_cross:true` — `Sceau du Voyageur`,
        `Mémoire d'Outremonde`, `Marque du Pèlerin`, `Rappel Astral`.
        Tous OOC, gating dans `SPELL_OOC_HANDLERS`.
      • `OUTREMONDE_SOUVENIRS` — 6 souvenirs passifs avec `cond(m)` et
        `bonus` stat. Conditions : visitsTotal≥1 (Premier Pas, +1 LCK),
        uniqueHosts≥3 (Voyageur Familier, +1 INT), sealsResolved≥5
        (Astralien, +1 MAG), echosDefeated≥10 (Trame Cousue, +1 AGI),
        visitsTotal≥20 (Cartographe, +1 LCK +1 INT), sealsResolved≥10 &&
        echosDefeated≥15 (Plénipotentiaire, +1 ATK +1 MAG).
      • `OUTREMONDE_COSMETICS` — 12 cosmétiques en 3 catégories : 4 auras
        (Or, Glace, Brume, Lune), 4 skins de portail (Émeraude,
        Améthyste, Rubis, Saphir), 4 skins de fissure (Or, Argent,
        Cuivre, Obsidienne). Coût : 5-8 essences + 1-2 fragments.
    - `atelier-voyageur.js` : modale Atelier transformée en
      **multi-onglets** (Set Voyageur / Sorts / Cosmétiques /
      Souvenirs). Helpers `_checkSouvenirs()` (idempotent, +toast +
      sauvegarde), `_souvenirsBonuses()` (purs, consommé par
      `recalculateStats`), `_buyCosmetic`, `_toggleCosmetic` (un actif
      par catégorie, re-click désactive), `_applyCosmeticVisuals` (CSS
      variables `--om-aura`, `--om-portal`, `--om-fissure`),
      `_buyCrossSpell` (apprend à tout le groupe), `_playBloodSealAnim`
      (overlay SVG 1,2 s à la pose du Verrou).
    - Hooks de métriques :
      • `visit-channel.js` : à l'acceptation visiteur,
        `visitsTotal++` + `uniqueHosts.add(hostId)` + `_checkSouvenirs()`
        + déclenchement Mémoire d'Outremonde si apprise (PV+PM 100 %,
        flag `_memoryUsed` one-shot par session).
      • `atelier-voyageur.js — _claimResolvedSeals` :
        `sealsResolved += claims.length` + `_checkSouvenirs()`.
      • `battle.js — _finishAstralCombat(true)` :
        `echosDefeated += enemyGroup.length` + `_checkSouvenirs()`.
    - `battle.js — _finishAstralCombat(false)` : si un membre connaît
      **Sceau du Voyageur**, court-circuite le cooldown 5 min — message
      magic, `astralExileCooldownUntil` non posé.
    - `inventory.js — SPELL_OOC_HANDLERS` : 4 nouveaux handlers.
      • `voyager_seal` / `outremonde_memory` : passifs (effet déclenché
        ailleurs), lancement OOC = message d'évocation.
      • `pilgrim_mark` (4 PM) : pose un marqueur sur la cellule
        courante en visite (`outremondeMetrics.pilgrimMark`), refusé
        hors visite.
      • `astral_recall` (12 PM) : téléporte à la dernière Marque (même
        hôte + même étage), refusé si conditions non remplies.
      • `isOutOfCombatSpell` étendu aux 4 nouveaux effets.
    - `inventory.js — recalculateStats` : applique
      `_souvenirsBonuses()` à TOUT le groupe (effet d'âme, pas
      d'équipement).
    - `visit-hud.js — showVisitHud` : ajoute/retire la classe
      `aura-on` selon `outremondeActiveAura`.
    - `save.js` : sérialisation des 6 nouveaux globaux + ré-apply des
      cosmétiques (CSS vars) + re-check des souvenirs au chargement
      (vs. saves antérieures ou ajouts ultérieurs au registre).
    - `css/portal.css` : onglets Atelier, anim `bloodSealFade` 1,2 s
      (SVG runé écarlate), aura HUD via `--om-aura`.
    - `item-icons.js` : 4 alias temporaires pour les sorts cross-plan
      (PNG dédiés différés ; les sorts restent fonctionnels avec ces
      icônes de famille).
    - MANIFEST loader complété (12 entrées optional supplémentaires).
      Bumps : `state.js?v=13`, `data.js?v=11`, `save.js?v=14`,
      `battle.js?v=9`, `inventory.js?v=8`, `atelier-voyageur.js?v=2`,
      `visit-channel.js?v=8`, `visit-hud.js?v=5`, `portal.css?v=7`,
      `item-icons.js?v=10`, `loader.js?v=16`. `CACHE_VERSION` v8 → v9.
    - Scénario smoke `scenarioVisitV1c1` (T1→T6) : surface, déblocage
      souvenir + bonus stat appliqué, achat + activation cosmétique +
      CSS variable, achat sort cross-plan (Marque) appris à tout le
      groupe, Marque + Rappel effectifs, Sceau du Voyageur neutralise
      le cooldown 5 min. Tous scénarios verts.

> **V1 du système de mondes parallèles complète** (Phases A→H + V1c.1,
> ~22,5 j cumulés sur ~21,5 j estimés). Pause sur V2 (quêtes
> inter-mondes, 5-8 j) jusqu'à décision ultérieure.
- [ ] V2 — Quêtes inter-mondes (5–8 j, à planifier après V1).
- [ ] Branche annexe — Co-op combat (gelée).

## 16. Décisions à confirmer avant Phase A

### V1a
1. ✅ **Nom du sort** *(2026-05-25)* : **Cheminette Inter-Mondes**.
   Choix utilisateur — variante visuellement iconique (flammes vertes
   façon poudre de Cheminette). Palette anim : vert + or chaud.
2. ✅ **Niveau de déblocage** *(2026-05-25)* : **niveau 8 fixe**.
   Enseigné aux deux héros via `_grantLevelSpells(8)` dans `battle.js`,
   pattern symétrique de Avada... (niveau 9).
3. ✅ **Coût en PM** *(2026-05-25)* : **25 PM**.
4. **Cooldown entre deux visites** : aucun, 5 minutes, ou une fois par
   étage ? Anti-flood léger souhaitable. À cumuler avec le cooldown
   défaite (5 min) de V1b.
5. **Étendue du snapshot** : envoyer tous les étages débloqués en une
   fois (jusqu'à 300 KB), ou charger à la demande (étage courant
   + ±1) ? Trade-off réactivité / charge.
6. **PNJ avec `dialoguesAstral` en Phase E** : on couvre lesquels en
   priorité ? Reco : les 5 PNJ scénaristes (Pomfresh, Lockhart, Hagrid,
   Dumbledore portrait, Geignarde) + un dialogue générique pour tous
   les autres.
7. ✅ **Présence du visiteur côté host** *(2026-05-25)* : **visible par
   défaut, toggle d'options pour masquer**. Choix utilisateur — préserve
   la magie « quelqu'un te rend visite » tout en laissant la porte ouverte
   au focus du host.

### V1b — combat local
8. **Limite d'échos par étage** : 3 (proposé) suffisant pour la saveur
   sans dériver en farm ? Alternative : pas de limite mais cooldown
   réel-temps (1 écho / 30 s).
9. **Items consommables consommés en astral** : restaurés à la sortie
   (proposé) ou perdus ? Restauration retire la tension mais évite la
   frustration "j'ai brûlé tout mon stock". À trancher.
10. **Récompense baseline d'un écho** : 1 + floor(level/3) essences
    (proposé). Trop frugal, trop généreux ? Calibrage post-playtest.

### V1c — Verrou de Sang + Atelier
11. **Coût d'un Verrou en essences** : 1 (proposé). Si trop bas, spam
    de Verrous chez tous les hosts visités ; si trop haut, jamais
    posé.
12. **Récompense host pour résolution de Verrou** : 50 or + 1 fragment
    Voyageur (proposé). Faut-il aussi un peu d'XP (~25) pour le sentir
    plus généreux côté host ?
13. **Plafond de Verrous en attente par visiteur** : 10 (proposé).
    Évite le spam asynchrone. Trop bas si le joueur visite beaucoup en
    peu de temps ?
14. **Set Voyageur — stats par pièce** : modestes (+1 stat, regen 1)
    pour éviter de dominer l'équipement endgame. À itérer.
15. **Catalogue cosmétique initial** : 12 items proposés (4 auras + 4
    skins portail + 4 skins Verrou). Volume gérable ?
16. **Sort `Rappel Astral`** : utile ou redondant avec la liste
    standard d'invitation ? Décision : à conserver pour le confort
    narratif (revenir chez un hôte croisé sans le re-chercher).
17. **Affichage des Verrous côté host** : marqueur visible dès
    l'entrée d'étage (proposé), ou révélé uniquement à proximité
    immédiate (effet surprise) ?

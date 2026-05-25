# Plan — Mondes Parallèles : exploration du donjon d'un autre joueur

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Ouvert le 2026-05-25. **Phase de réflexion** — aucune ligne de code écrite.
> Branche de travail : `claude/multi-sync-constraints-cost-73YTH`.
> Révisé le 2026-05-25 : pivot de **co-op combat** vers **exploration
> découverte** (cf. §1) ; le co-op est conservé en **branche annexe** à
> réfléchir plus tard (§8).
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

- Le visiteur **n'agit pas sur l'économie** du host (pas de coffres
  pillés, pas de monstres tués pour son XP, pas d'achats en boutique).
- Le visiteur **ne peut explorer que les zones que le host a déjà
  débloquées** — étages descendus, cases découvertes. Le reste est un
  brouillard infranchissable (cf. §3.5). C'est la règle qui rend la
  visite *intime* : tu vois ce que le voyageur d'en face a vécu, pas
  plus.
- Les **PNJ ont des dialogues spéciaux** quand un voyageur d'un autre
  plan les aborde (cf. §6.2). C'est le sel narratif du mode.
- Aucune mécanique de combat n'est requise en V1 — le visiteur est en
  mode *incorporel* face aux monstres (cf. §6.3).

C'est le modèle **Death Stranding asymétrique** (présence non-violente
qui enrichit le monde de l'autre) plutôt que Souls (invocation pour
combattre). Cohérent avec un RPG narratif inspiré de Poudlard, où
"explorer un autre château" est une promesse plus forte que "co-op
combat".

### Pourquoi ce modèle plutôt qu'un vrai « multi-joueur »

| Contrainte | Vraie sync multi (lockstep) | Co-op combat (annexe §8) | **Exploration découverte (V1)** |
|------------|-----------------------------|--------------------------|-------------------------------|
| Déterminisme RNG global | Obligatoire | Inutile (host autoritaire) | **Inutile** |
| Refonte event-sourcing | ~10 j tous systèmes | Aucune | **Aucune** |
| Extension moteur combat | Inhérente | +1 slot allié + tour 3-way | **Aucune — pas de combat** |
| Overhead permanent | Oui en solo aussi | Zéro hors visite | **Zéro hors visite** |
| Déconnexion partenaire | Casse la partie | Visiteur s'évapore | **Visiteur s'évapore** |
| Estimation V1 | 15–30 j | 14 j | **~10 j** |

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
| **V1** | **Exploration découverte** (Voyageur des Plans) | ~10 j | faible | Tu visites le monde de l'autre, sans rien y changer |
| **V2** | **Quêtes inter-mondes** | +5–8 j | moyen | Des PNJ te confient des missions à effectuer dans ton monde, ou réciproquement |
| **Branche annexe** | Co-op combat (Patronus / Fumseck) | +14 j | moyen | Le visiteur combat aux côtés du host — modèle Souls. À réfléchir séparément (§8). |
| **Branche annexe** | PvP duel direct | +5 j sur l'annexe | élevé | Affrontement temps réel |

**Priorité immédiate** : V1 (exploration découverte). V2 (quêtes
inter-mondes) est l'évolution naturelle une fois le canal de visite
robuste. Les branches combat/PvP sont gelées sans date — elles
réutiliseraient le même portail et la même infra, mais ouvriraient un
mode d'interaction radicalement différent.

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

### 6.3 Monstres — incorporel

Le visiteur est **invisible et intangible** pour les monstres du
donjon visité. Concrètement :

- Les monstres présents dans `npcs`/spawn du host ne le voient pas.
- Aucun combat ne se déclenche au passage du visiteur sur leur case
  (le visiteur peut traverser leur case ; les monstres n'ont d'ailleurs
  pas de position fixe dans le code actuel — ils apparaissent à
  l'entrée d'une room non visitée. Pour le visiteur, on **désactive
  purement le déclenchement de combat**.).
- Côté visuel : si un monstre est lié à une cellule particulière
  (cf. PNJ hostiles affichés), il est rendu en silhouette translucide
  rouge sombre. *« Tu sens des présences hostiles, mais elles ne te
  voient pas. »*

Side-effect heureux : le visiteur peut explorer librement sans risque,
ce qui colle parfaitement au ton contemplatif voulu.

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

- **Visiteur** : aucune écriture dans son save pendant la visite.
  Au retour, son `mySavedState` est restauré tel quel. Aucun gain
  XP/or/loot à appliquer (rien à gagner en V1, c'est volontaire).
  `autoSave(reason: 'visit-end')` déclenché pour purger la session.
- **Host** : sa partie progresse normalement. AutoSave hooks normaux.
  Le visiteur n'apparaît **jamais** dans le snapshot du host.
- **Trace persistante** (optionnelle V1.5) : à la sortie, le visiteur
  peut laisser un *message Pensieve* sur la dernière case foulée
  (réutilise `mp_messages` existant). Le host la trouvera au prochain
  passage. Gratuit, cohérent avec V0 déjà en place.

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

| Fichier | Nature |
|---------|--------|
| `js/portal-fx.js` (nouveau) | Animations d'ouverture/fermeture du portail (côtés visiteur et host) |
| `css/portal.css` (nouveau) | Keyframes, gradients, fissures, particules |
| `js/multiplayer.js` (étendu) | Canal Realtime, invitation, état `visitSession`, snapshot/deltas |
| `js/renderer.js` / `renderer-effects.js` | Rendu du donjon distant pour le visiteur ; `drawVisitorSprite` (aura dorée) |
| `js/renderer-minimap.js` | Classe `.map-astral-visitor` ; minimap distante côté visiteur, restreinte au visitedMask |
| `js/movement.js` | Hook : blocage de mouvement hors `remoteVisitedMask` ; suspension de la logique de combat pour le visiteur |
| `js/save.js` | `_takeVisitSnapshot()` / `_restoreFromVisit()` pour le visiteur (suspend/restore propre) |
| `js/data.js` | Nouveau sort `Apparition Astrale` (à nommer §16) |
| `js/inventory.js` | Le sort apparaît dans `openSpells`, désactivé en combat et en Ironman |
| `js/npcs.js` | Champ optionnel `dialoguesAstral` ; fallback générique par rôle |
| `js/npc-dialog.js` | Branche dialogue voyageur si `visitSession.role === 'visitor'` |
| `js/loader.js` | `MANIFEST` : `playPortalOpen`, `visitSession`, etc. |
| `index.html` | Inclure `portal.css`, `portal-fx.js` ; overlay `#portal-fx-layer` |
| `tests/smoke.js` | Scénarios : invitation, snapshot, blocage hors visitedMask, sortie volontaire |
| `CLAUDE.md` | Section « Mondes parallèles » une fois livré |

> Comparé à la version précédente du plan : **plus de touche à
> `battle.js` / `battle-ui.js`** en V1 — c'est le bénéfice direct de
> retirer le combat coop.

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

## 11. Coûts résumés

| Palier | Effort cumulé | Inclus |
|--------|---------------|--------|
| **V1 (Exploration découverte)** | **~13,5 j** | Phases A + B + C + D + E + F |
| V2 (Quêtes inter-mondes) | +5–8 j | Banques de dialogues, items spéciaux, mécanique persistante |
| **Branche annexe co-op combat** | +14 j sur V1 | Combat partagé, économie partagée, prédiction/réconciliation |

Infra Supabase :
- Realtime channels : free tier (200 connexions, 2 M msg/mois).
  Charge V1 ~1 msg/sec : suffisant pour ~3000 visites
  simultanées (largement au-delà du besoin).
- Table `mp_visit_requests` : volume négligeable.

Hébergement : aucun changement, GitHub Pages reste valide.

## 12. SQL — table d'invitation

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

## 13. Risques et questions ouvertes

- **Snapshot lourd pour un host avancé** : un host étage 20+ avec tout
  débloqué peut générer un snapshot de 300+ KB. Mitigation : limiter à
  l'étage courant + 2 étages au-dessus, charger les autres à la
  demande (`floorSnapshot` à l'approche d'un escalier).
- **Triche par snapshot falsifié** : un host malicieux peut forger un
  faux donjon pour le visiteur. Aucune conséquence côté visiteur en V1
  (rien à gagner) → impact nul. Accepter en l'état.
- **Lore du sort niveau 8** : on bloque la fonctionnalité derrière une
  progression — discutable. Alternative : sort offert dès le palier 100
  d'une Maison, ou lié à un PNJ Dumbledore. À trancher en §16.
- **Visites multiples simultanées chez un host** : V1 = un seul
  visiteur à la fois. La file d'attente est repoussée à plus tard.
- **PNJ générés aléatoirement** côté host (`getRandomVendorsForFloor`,
  `getRandomLoreForFloor`) : seedés par étage donc déterministes pour
  une partie donnée — leur snapshot tient dans les 200 KB sans plus.
- **Persistance d'un souvenir de visite** côté visiteur : actuellement
  rien ne reste de la visite (cohérent avec V1 contemplatif). V1.5
  pourra ajouter un "carnet de voyage" listant les mondes visités —
  hors-scope V1.
- **Cas du host déjà en combat** au moment de l'invitation : refus
  immédiat (`status='in_battle'` filtré). Pas de file d'attente —
  re-demander quand le combat finit.
- **Le visiteur peut voir un PNJ qui n'existe pas chez lui** : c'est
  exactement le point ! `getRandomLoreForFloor` produit des PNJ
  différents selon l'identité de la partie. Bonus narratif.

## 14. Hors-scope

- Salons "open world" persistants (plusieurs visiteurs simultanés
  dans le même donjon).
- Donjon généré conjointement par les deux joueurs.
- Combat coop avec le visiteur (branche annexe §8, à
  réfléchir séparément).
- PvP en direct (couvert par `multiplayer.md` Phase 7 si jamais).
- Voix / chat texte libre en temps réel.
- Classement compétitif des visites.
- Tout pour Ironman (gel ferme — cf. §2.1).

## 15. Suivi

- [x] Pivot conceptuel n°1 (2026-05-25) : multi-sync de saves → visites
      dimensionnelles. Ironman exclu.
- [x] Pivot conceptuel n°2 (2026-05-25) : co-op combat → **exploration
      découverte**. Co-op déplacé en branche annexe §8.
- [ ] Phase A — sort + animation locale (3 j).
- [ ] Phase B — invitation/acceptation (2 j).
- [ ] Phase C — snapshot et rendu du donjon distant (3 j).
- [ ] Phase D — limites de territoire + sprites + emotes (2 j).
- [ ] Phase E — dialogues PNJ « voyageur » + observation-only (2 j).
- [ ] Phase F — polish (1,5 j).
- [ ] V2 — Quêtes inter-mondes (5–8 j, à planifier après V1).
- [ ] Branche annexe — Co-op combat (gelée).

## 16. Décisions à confirmer avant Phase A

1. **Nom du sort** : *Apparition Astrale* (recommandé — sobre, fidèle
   au canon), *Cheminette Inter-Mondes* (visuellement iconique), ou
   *Portoloin de Conscience* (justifie le retour automatique) ?
2. **Niveau de déblocage** : niveau 8 fixe, palier de Maison, ou
   déclenché par un PNJ scripté (Dumbledore après un palier) ?
3. **Coût en PM** : 25 (proposition), ou plus dissuasif (~40) pour en
   faire un sort rituel ? (En V1 il n'y a rien à gagner, donc le coût
   PM est purement esthétique — peut-être 10–15 suffisent.)
4. **Cooldown entre deux visites** : aucun, 5 minutes, ou une fois par
   étage ? Anti-flood léger souhaitable.
5. **Étendue du snapshot** : envoyer tous les étages débloqués en une
   fois (jusqu'à 300 KB), ou charger à la demande (étage courant
   + ±1) ? Trade-off réactivité / charge.
6. **PNJ avec `dialoguesAstral` en Phase E** : on couvre lesquels en
   priorité ? Reco : les 5 PNJ scénaristes (Pomfresh, Lockhart, Hagrid,
   Dumbledore portrait, Geignarde) + un dialogue générique pour tous
   les autres.
7. **Présence du visiteur côté host** : on rend son sprite **par
   défaut**, ou en option opt-in pour le host (qui peut le masquer
   s'il veut jouer sans distraction) ?

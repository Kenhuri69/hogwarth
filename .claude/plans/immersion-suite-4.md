# Plan — Immersion (suite 4 / 4ᵉ itération)

> Fait suite à `immersion-suite.md` (A1→C2, **clos**),
> `immersion-suite-2.md` (D/E/F, **clos** le 2026-06-01) et
> `immersion-suite-3.md` (G/H/I/J, **clos** le 2026-06-08).
> Items rédigés après audit du code (2026-06-08) pour ne rien proposer en
> doublon des trois premières suites.

## Principes (inchangés depuis la refonte — cf. suite 3 §Principes)

1. **100 % cosmétique / UX** — aucune mécanique de jeu, aucun état de save,
   aucun RNG de simulation touché. Si un item devait toucher la logique, il
   est requalifié ou abandonné.
2. **Zéro dépendance, zéro build** — vanilla JS, synthèse WebAudio, CSS,
   canvas. Pas d'asset binaire nouveau (sauf trivial et justifié).
3. **Call-sites défensifs** — tout nouvel effet passe par un helper sûr
   (`window.X && X.foo(...)` ou proxy `_safe` : `CFX_safe`, `DFX_safe`,
   `UX_safe`, `HAPTICS_safe`). Si le module ne charge pas, le jeu tourne
   sans l'effet.
4. **`prefers-reduced-motion`** respecté pour tout effet **visuel/de
   mouvement** (anims lourdes → no-op ; un état persistant reste lisible via
   une variante statique, ex. bordure colorée sans pulsation). L'**audio**
   et l'**haptique** ne sont pas du mouvement → gardés par `isMuted` /
   capacité device, pas par reduced-motion (cohérent avec l'existant).
5. **Plan vivant** (guidelines §5) + **smoke vert** (guidelines §7) : un
   volet de test dédié par item ; bumps `?v=` + `PRECACHE_URLS` +
   `CACHE_VERSION` à chaque release qui touche le shell (skill `cache-bump`).
6. **Une PR par item**, journal mis à jour à chaque merge.

---

## État du code audité au 2026-06-08 (ancrages / anti-doublon)

Vérifié avant rédaction pour cadrer chaque item sur un vrai manque :

- **Barres PV/PM/XP** (`css/style.css` `.bar-fill`) : portent déjà
  `transition: width 0.3s ease` → le remplissage est **déjà fluide**
  (un « bar lerp » serait un doublon — exclu du plan).
- **Cartes de groupe** (`.party-card`, `ui.js — updateUI/_updateCharCard`) :
  états `.active-char` (bordure + `box-shadow` **statiques**) et `.ko-char`
  (opacité) existent. **Aucun flash de dégât par-carte**, **aucun état
  « PV bas »**, **aucune pulsation du tour actif**. Les chiffres flottants
  (`UX.floatDmg('ally', …)`) et le voile rouge plein écran
  (`CombatFX.hurtFlash`, D3) couvrent le **groupe**, pas la carte
  individuelle qui encaisse.
- **Compteur d'or** (`ui.js`) : `gold-display.innerHTML` réécrit
  **instantanément** au gain — pas de comptage animé.
- **Coffre** (`renderer-sprites.js — drawChestSprite`) : sprite à **état
  unique** (pas d'ouverture). L'overlay `_showExploreOverlay` s'ouvre
  directement, sans anticipation visuelle sur le sprite 3D.
- **Découverte de monstre** (`battle.js:542`) : `seenMonsters.add(id)` au
  combat, **sans aucun feedback** de première rencontre (le bestiaire trie
  juste les vus en premier).
- **Modales** (`character-modal`, `shop-modal`, `bestiary-modal`…) :
  apparaissent en **`display:flex` instantané** — aucune transition
  d'ouverture/fermeture.
- **PNJ en vue 3D** (`renderer-effects.js — drawNpcSprite`) : aura pulsée +
  signe ❗/❓ bobbing déjà là (E-series). Le sprite fait **toujours face**,
  sans réaction d'approche.
- **Haptique** (`haptics.js`) : `hit` / `crit` / `death` / `levelUp`
  uniquement. Pas de retour sur cast de sort, alerte PV bas, coffre, quête.
- **Quête complétée** (`quests.js — completeQuest`) : réutilise
  `playLevelUp()` (son) + `addMsg` ; **pas de fanfare visuelle** dédiée.

Conclusion : le **panneau de groupe (HUD gauche)** est la surface la plus
regardée et la plus statique du jeu → cap principal de cette suite. Les
jalons (quête / coffre / découverte) et le confort (modales / haptique)
complètent.

---

## K. Vitalité du groupe (HUD gauche réactif) ★ cap principal

### K1. Flash de dégât / soin par carte de perso
La carte du perso qui **encaisse** (ou est **soigné**) ne réagit pas
individuellement — seuls un chiffre flottant et le voile groupe (D3)
existent. Ajouter un **flash bref + micro-secousse** sur `.party-card` du
membre concerné : teinte rouge (dégât) / verte (soin), distinct du voile
plein écran.

- **Action** : `UX.cardReact(charIdx, kind)` (`ux-improvements.js`,
  `kind ∈ 'dmg'|'heal'|'crit'`) — pose une classe transitoire sur
  `#char-card-<idx>` (flash de fond + léger shake pour `dmg`/`crit`),
  retirée après l'anim. Appelé là où `UX.floatDmg('ally', …)` /
  `floatDmg('ally', …, 'heal')` est déjà émis (battle.js / battle-spells.js),
  via `UX_safe`. CSS pur. reduced-motion → flash de fond bref **sans**
  secousse.
- **Vérif** : `scenario…` (volet K1) — `UX.cardReact` présent ; appel +
  call-site réel (un héros encaisse un coup) → classe posée puis retirée,
  sans throw ; reduced-motion → pas de classe de shake.

### K2. État « PV bas » (pouls de la carte)
Aucun signal quand un perso est en danger. Ajouter un **état visuel
persistant** sur `.party-card` quand `hp/hpMax < SEUIL` (ex. 0.25) : liseré
rouge + pulsation douce du portrait/barre. Réactif : retiré dès que soigné
au-dessus du seuil.

- **Action** : dans `updateUI`/`_updateCharCard` (`ui.js`), basculer une
  classe `low-hp` sur la carte selon le ratio PV (source de vérité = état
  déjà lu pour les barres). CSS : pulsation. **reduced-motion → liseré rouge
  statique** (pas de pulsation) — l'info de danger reste lisible.
- **Garde-fou** : pas de classe sur un perso KO (`.ko-char` a priorité) ;
  purement dérivé de l'état, **aucune nouvelle variable** ni sérialisation.
- **Vérif** : volet K2 — descendre les PV sous le seuil via `updateUI` →
  classe `low-hp` présente ; remonter → classe retirée ; KO → pas de
  `low-hp`. reduced-motion : la classe est posée mais l'anim est neutralisée
  (règle CSS présente).

### K3. Surbrillance pulsée du tour actif (combat)
`.active-char` n'est qu'une bordure dorée statique. La rendre **vivante**
pendant le tour du perso : halo doré qui respire doucement, pour suivre
d'un coup d'œil qui agit.

- **Action** : animer `.party-card.active-char` en CSS (pulsation du
  `box-shadow` doré existant) — **aucun JS** (la classe est déjà posée par
  la boucle de combat). reduced-motion → halo statique (état actuel).
- **Vérif** : volet K3 — en combat, la carte du perso actif porte
  `.active-char` (déjà testé ailleurs) ; ajouter l'assert que la règle d'anim
  existe et qu'en reduced-motion elle est neutralisée. Pas de régression de
  l'indicateur de tour.

### K4. Comptage animé de l'or (et XP) — optionnel
Le total d'or **saute** au gain. Un **roll-up** bref (ex. 400 ms) du
nombre rend la récompense tangible.

- **Action** : `UX.tickNumber(el, from, to, ms)` (`ux-improvements.js`) —
  interpole l'affichage d'un compteur ; appelé par `updateUI` pour
  `#gold-display` quand la valeur change (mémorise la dernière valeur
  affichée dans un attribut `data-val`, pas dans l'état de jeu). reduced-motion
  → écrit la valeur finale directement (pas d'interpolation).
- **Vérif** : volet K4 — `tickNumber` présent ; un gain d'or fait
  transiter l'affichage puis atterrit sur la valeur exacte ; reduced-motion →
  valeur finale immédiate. **Statut** : optionnel (cosmétique fin).

---

## L. Juice des jalons (récompenses & découvertes)

### L1. Fanfare de quête complétée
`completeQuest` ne réutilise que le son de level-up. Lui donner un
**moment dédié** : bandeau/flourish doré (« Quête accomplie ! » + titre)
et, idéalement, un timbre distinct.

- **Action** : `CombatFX`/`DungeonFX` n'étant pas adaptés (hors combat,
  hors donjon-canvas), ajouter un helper léger — soit `UX.questFanfare(title)`
  (`ux-improvements.js`) qui monte un bandeau transitoire centré (flourish
  CSS), soit réutiliser `DungeonFX.burst` sur un hôte HUD. Appelé dans
  `completeQuest` via `UX_safe`. Option audio : un court arpège dédié
  (`AudioSystem.playQuestComplete`, synthèse) distinct de `playLevelUp`.
  reduced-motion → bandeau statique bref (fade) sans translation.
- **Vérif** : volet L1 — helper présent ; `completeQuest` réel → bandeau
  monté puis retiré, sans throw ; reduced-motion safe.

### L2. Révélation de coffre (anticipation)
Ouvrir un coffre bascule direct sur l'overlay. Ajouter une **micro-
anticipation** : à `openChest`, un bref éclat doré sur la vue 3D (halo +
le son `playChestOpen` déjà émis) avant/à l'ouverture de l'overlay.

- **Action** : réutiliser `DungeonFX.burst('scene-viewport'/'explore-overlay',
  'gold')` (déjà présent, E3) **ou** un éclat dédié sur `#dungeon-canvas`
  via `DFX_safe`, déclenché en tête de `openChest` (`movement-interactions.js`).
  Pas de nouveau sprite. reduced-motion → halo bref sans projectiles (comme
  E3).
- **Vérif** : volet L2 — `openChest` réel → couche d'éclat montée sans throw ;
  pas de régression de l'overlay. **Statut** : à cadrer (réutilise E3 si
  suffisant — éviter un module neuf).

### L3. Toast de première découverte de monstre — optionnel
La 1ʳᵉ rencontre d'une espèce passe inaperçue. Afficher un **toast discret**
« 🔎 Nouvelle créature cataloguée : <nom> » et/ou un liseré sur le bouton
Bestiaire.

- **Action** : dans `startBattle` (`battle.js`), avant le `seenMonsters.add`,
  détecter les ids **non encore vus** du groupe et émettre un `addMsg`
  (purement textuel → non gardé reduced-motion, comme I1). Aucun état neuf
  (réutilise `seenMonsters`). Anti-spam : une ligne par espèce neuve.
- **Vérif** : volet L3 — un combat contre une espèce neuve produit la ligne ;
  un 2ᵉ combat contre la même n'en produit pas. **Statut** : optionnel.

---

## M. Monde réactif (donjon & PNJ)

### M1. PNJ qui réagit à l'approche
Le sprite PNJ est statique d'orientation. Ajouter une **réaction d'approche
légère** : quand le joueur fait face au PNJ à courte distance, accentuer
brièvement l'aura / un petit sursaut du signe ❗ (déjà bobbing), pour donner
l'impression qu'il « remarque » le joueur.

- **Action** : moduler les paramètres existants de `drawNpcSprite`
  (`renderer-effects.js`) selon la distance/face (déjà calculée pour le
  rendu) — pas de nouvel asset. Pur visuel canvas, piloté par
  `_npcAnimPhase`. reduced-motion → aura statique (état de base).
- **Vérif** : volet M1 — face à un PNJ proche, le rendu ne throw pas et la
  modulation s'applique (flag/param observable) ; pas de régression du sprite.
- **Statut** : à cadrer finement à l'implémentation (rester subtil).

### M2. Motes de premier plan contextuelles — optionnel
La poussière E4 et la brume depths existent en **arrière-plan**. Ajouter de
rares **motes de premier plan** très discrètes, signature par zone (luciole
chaude en `intro`, étincelle runique en `abyss`) — distinctes de la
poussière de fond (densité, profondeur, scintillement).

- **Action** : passe canvas additionnelle dans `dungeon-fx.js`
  (`drawForegroundMotes`), peinte après le cadre, très faible densité.
  reduced-motion → no-op (comme la poussière). **Risque de doublon avec E4 à
  surveiller** — n'implémenter que si la distinction visuelle est nette.
- **Vérif** : volet M2 — fonction présente, ne throw pas ; phase 0 / reduced
  → no-op. **Statut** : optionnel, à abandonner si trop proche d'E4.

---

## N. Confort & lisibilité (feel UX)

### N1. Transitions d'ouverture/fermeture des modales
Les modales apparaissent sèchement. Ajouter un **fondu + léger scale**
d'ouverture (et fermeture) — confort sans ralentir l'usage.

- **Action** : règle CSS générique sur le conteneur de modale (ex. classe
  partagée ou sélecteurs existants `#character-modal`, `#shop-modal`,
  `#bestiary-modal`, `#slot-modal`…) : `opacity`/`transform` à l'apparition.
  Idéalement **CSS seul** (animation au passage en `display:flex` via une
  classe `.modal-open` posée par les ouvreurs, ou `@starting-style` si
  supporté — sinon une classe transitoire). Vérifier qu'aucun overlay
  critique (combat) n'est ralenti. reduced-motion → fondu d'opacité seul,
  sans scale.
- **Garde-fou** : ne pas toucher aux overlays de **combat** /
  **transition d'étage** (timing sensible). Cibler les modales d'info.
- **Vérif** : volet N1 — ouvrir une modale d'info pose la classe/anim, la
  modale reste fonctionnelle (boutons cliquables) ; reduced-motion → pas de
  scale. Pas de régression des overlays de combat.

### N2. Retour haptique étendu — optionnel
`haptics.js` ne couvre que hit/crit/death/levelUp. Étendre aux moments
manquants : **alerte PV bas** (entrée en état K2), **coffre ouvert**,
**quête complétée**, **cast de sort**.

- **Action** : ajouter `Haptics.lowHp()` / `chest()` / `quest()` / `cast()`
  (motifs courts) dans `haptics.js`, appelés via `HAPTICS_safe` aux call-sites
  correspondants (K2, openChest, completeQuest, castSpellInBattle). Gardé par
  capacité device (déjà le cas) ; sobre (pas de buzz à chaque pas).
- **Vérif** : volet N2 — méthodes présentes, appels sans throw ; pas de
  régression des appels existants. **Statut** : optionnel.

---

## Priorisation suggérée

1. **K1** — flash de dégât/soin par carte (★ comble le plus gros manque de
   réactivité du HUD).
2. **K2** — état « PV bas » (lisibilité du danger, fort ratio).
3. **K3** — pouls du tour actif (CSS seul, quasi gratuit).
4. **L1** — fanfare de quête complétée (jalon marquant, hors combat).
5. **N1** — transitions de modales (confort transversal, surtout CSS).
6. **L2** — révélation de coffre (réutilise E3).
7. **M1** — PNJ réactif à l'approche (à cadrer subtil).
8. **K4** / **L3** / **M2** / **N2** — optionnels, si budget.

Chaque item = une PR dédiée, smoke vert, journal mis à jour.

---

## Journal d'avancement

- 2026-06-08 : backlog rédigé après clôture de la suite 3 (G/H/I/J). Audit du
  code consigné en tête (ancrages K1→N2, anti-doublon vérifié : barres déjà
  fluides, voile D3 ≠ flash par-carte, etc.). Cap = **HUD gauche réactif**
  (K) + jalons (L) + monde/confort (M/N). Implémentation à suivre, item par
  item dans l'ordre de priorisation.
- 2026-06-08 (impl.) — items livrés & mergés (1 PR/item, plan dédié par item) :
  - ✅ **K1** flash de dégât/soin par carte (PR #429) —
    [`immersion-k1-card-react.md`](./immersion-k1-card-react.md).
  - ✅ **K2** état « PV bas » par carte (PR #430) —
    [`immersion-k2-low-hp.md`](./immersion-k2-low-hp.md).
  - ✅ **K3** halo pulsé du tour actif (PR #432, CSS seul) —
    [`immersion-k3-active-pulse.md`](./immersion-k3-active-pulse.md).
  - ✅ **L1** fanfare de quête accomplie (PR #433) —
    [`immersion-l1-quest-fanfare.md`](./immersion-l1-quest-fanfare.md).
  - ✅ **N1** transitions d'ouverture des modales (PR #435, CSS seul) —
    [`immersion-n1-modal-transitions.md`](./immersion-n1-modal-transitions.md).
  - 🟰 **L2** révélation de coffre : **déjà couvert par E3** —
    `openChest` (`movement-interactions.js:64`) émet déjà
    `DFX_safe.burst('explore-overlay','gold')`. L'overlay d'exploration s'ouvre
    à l'entrée de case et **couvre** la vue 3D, donc un éclat sur
    `scene-viewport` serait invisible. **Pas de PR** (anti-doublon / anti-travail
    inutile, guidelines §1-2). Item considéré clos.
  - ➕ Hors backlog : correction du test flaky `scenarioRandomLoreNpcs`
    (idle paginé) rencontré pendant la suite (PR #434).
  - **Cap K (HUD réactif) terminé** (K1+K2+K3). Restants : **M1** (PNJ réactif,
    « à cadrer subtil »), optionnels **K4 / L3 / M2 / N2**.

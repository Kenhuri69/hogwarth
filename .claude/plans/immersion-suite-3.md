# Plan — Immersion (suite 3 / 3ᵉ itération)

> Fait suite à `immersion-suite.md` (backlog A1→C2, **clos**) et
> `immersion-suite-2.md` (backlog D/E/F, **clos** le 2026-06-01).
> Cap choisi avec l'utilisateur (AskUserQuestion, 2026-06-01) : **les
> quatre directions** ci-dessous. Items rédigés après audit du code pour
> ne rien proposer en doublon des deux premières suites.

## Principes (inchangés depuis la refonte)

1. **100 % cosmétique / UX** — aucune mécanique de jeu, aucun état, aucune
   save, aucun RNG de simulation touché. Si un item devait toucher la
   logique, il est requalifié ou abandonné.
2. **Zéro dépendance, zéro build** — vanilla JS, synthèse WebAudio, CSS,
   canvas. Pas d'asset binaire nouveau (sauf si trivial et justifié).
3. **Call-sites défensifs** — tout nouvel effet passe par un helper sûr
   (`window.X && X.foo(...)` ou proxy `_safe`) : si le module ne charge pas,
   le jeu fonctionne sans l'effet.
4. **`prefers-reduced-motion`** respecté pour tout effet **visuel/de
   mouvement** (les anims lourdes deviennent no-op). L'**audio** (musique,
   SFX, barks) n'est PAS du mouvement → gardé par `isMuted`, pas par
   reduced-motion (cohérent avec l'existant).
5. **Plan vivant** (guidelines §5) + **smoke vert** (guidelines §7) à
   chaque item : un scénario dédié dans `tests/smoke.js`, bumps `?v=` +
   `PRECACHE_URLS` + `CACHE_VERSION` à chaque release qui touche le shell.
6. **Une PR par item**, journal mis à jour à chaque merge.

### État du code vérifié au 2026-06-01 (pré-requis / ancrages)

- **Mort d'un ennemi** (`battle-ui.js — renderEnemyGroup`) : la carte passe
  en classe `enemy-dead` + icône `img/icons/dead.png`. **Aucune animation
  de transition** (disparition/désintégration) — l'état mort apparaît
  instantanément au prochain `renderEnemyGroup`.
- **`CombatFX`** (`combat-fx.js`) expose `spellBurst(targetKey, element)`,
  `shake(intensity)`, `bossIntro(enemy)` + helper défensif `CFX_safe`.
  `_elementMeta` (couleurs/glyph par élément) et `_anchorFor(targetKey)`
  (résolution `ally` / `enemy:i` / coord) sont déjà en place et
  réutilisables. **Pas de feedback côté lanceur** (`ally`) au cast.
- **`castSpellInBattle(spellName, targetIdx, targetAllyIdx)`**
  (`battle-spells.js:920`) : point d'entrée unique du cast héros — joue
  déjà `playSpellCast` + `spellBurst` sur la cible.
- **`addMsg(text, type='')`** (`ui.js:489`) : log narratif, accepte du HTML
  (les drops y affichent déjà `getItemIconHtml`).
- **Drops** (`battle-rewards.js`) : déjà loggés avec l'icône d'objet
  (`getItemIconHtml`). Donc J1 = **pop visuel** (pas le texte, déjà fait).
- **Déplacement** (`movement.js — _step`) : `playFootstep()` audio + barks
  (F2) ; **aucun bob/à-coup de caméra**. `DFX_safe.shakeView('light')`
  existe (pièges) → brique réutilisable. Pas de variation de pas par
  surface.
- **Événements d'étage** (`floor-events.js`, `currentFloorEvent` dans
  `state.js`) : `hante/calme/marche/tresor/pieges/runique`. Effets
  mécaniques appliqués à la génération ; **côté ambiance = un seul toast**
  à l'entrée (`_announceFloorEvent`).
- **`getFloorTheme(floor).ambient`** (`floor-themes.js`) :
  `intro/dungeon/depths/abyss` — source de vérité de zone, déjà consommée
  par F1/F2.

---

## G. Punch du combat (meilleur ratio — fait en premier)

### G1. Désintégration de l'ennemi vaincu ★ ✅ (livré 2026-06-01)
Quand un ennemi tombe (`currentHp <= 0`), au lieu d'un simple swap d'icône
grisée : une **dissolution** (fondu + particules de cendres/poussière
montantes, teinte selon la catégorie : fantôme = bleuté/éthéré, autre =
cendre chaude) jouée **une fois**, puis l'état `enemy-dead` final.

- **Action** : `CombatFX.deathDissolve(enemyIdx, monster)` (`combat-fx.js`) —
  s'ancre sur la carte via `_anchorFor('enemy:'+idx)`, peint une couche de
  particules + un fondu de l'icône, auto-nettoyée (~700 ms). Déclenché
  **au moment de la bascule** `currentHp <= 0` dans `executeAttack` /
  `_spell*` (battle), AVANT le `renderEnemyGroup` qui figera l'état mort —
  ou juste après, en ciblant la carte par id. Via `CFX_safe`.
- **Garde-fou** : ne joue qu'une fois par ennemi (flag `_dissolvePlayed`
  transient sur l'objet enemy, jamais sérialisé). reduced-motion → fondu
  CSS court sans particules.
- **Vérif** : `scenarioCombatPunch` (volet G1) — `CombatFX.deathDissolve`
  existe ; appel direct sur un combat réel (tuer un ennemi) → couche
  `.cfx-dissolve-layer` montée puis auto-retirée, pas de throw ; idempotent
  (2ᵉ appel no-op) ; reduced-motion → 0 particule.

### G2. Feedback de cast côté lanceur ✅ (livré 2026-06-01)
Quand un héros lance un sort, sa carte (`ally`) ne réagit pas. Ajouter un
**flash + léger recul teinté élément** à l'origine du sort, pour que le
projectile « parte » du lanceur.

- **Action** : `CombatFX.castFlash(casterKey, element)` (`combat-fx.js`) —
  halo bref + 2-3 particules dans la couleur de l'élément (`_elementMeta`)
  à l'ancre du lanceur, optionnel petit `transform` de recul sur la carte.
  Appelé dans `castSpellInBattle` juste avant le `spellBurst` de la cible,
  via `CFX_safe`. `casterKey` = `'ally'` (le float-dmg lanceur cible déjà
  `'ally'`).
- **Vérif** : `scenarioCombatPunch` (volet G2) — `castFlash` existe ; cast
  réel d'un sort → couche montée/retirée sans throw ; reduced-motion → halo
  seul.

### G3. Télégraphe du tour ennemi (optionnel, si G1/G2 rapides)
Bref highlight/wind-up (scale + glow ~250 ms) sur la carte de l'ennemi qui
s'apprête à agir, pour que les attaques semblent intentionnelles.

- **Action** : `CombatFX.telegraph(enemyIdx)` appelé en tête de l'action de
  chaque ennemi dans `enemyTurn` (battle.js), via `CFX_safe`. CSS pur
  (classe transitoire). reduced-motion → no-op.
- **Vérif** : volet G3 du scénario — méthode présente, appel sans throw.
- **Statut** : à confirmer après G1/G2 (ne pas surcharger le tour ennemi
  si le rythme en pâtit).

---

## H. Présence physique (caméra)

### H1. Bob / à-coup de caméra à l'avancée ✅ (livré 2026-06-08)
`moveForward` ne donne aucun ressenti physique. Ajouter un **léger
décalage transitoire** de la vue (canvas) à chaque pas : petit « plongeon »
vertical amorti (~120 ms), distinct du `shakeView` brutal des pièges.

- **Action** : `DungeonFX.stepBob(dir)` (`dungeon-fx.js`) — applique une
  micro-transformation CSS transitoire sur `#dungeon-canvas` (translateY
  amorti, éventuellement translateX selon rotation). Appelé dans `_step`
  après le mouvement, via `DFX_safe`. reduced-motion → no-op.
- **Calibrage** : amplitude faible (≤ 4-6 px) pour rester confortable ;
  reculer (`moveBackward`) = bob atténué.
- **Vérif** : `scenarioCameraPresence` (volet H1) — `stepBob` existe ;
  appel + avancée réelle sans throw ; reduced-motion → no-op (pas de
  transform résiduelle).

### H2. Variation de pas selon la surface ✅ (livré 2026-06-08)
Le footstep est un bruit unique. Le timbrer selon le sol de la tranche
(`getFloorTheme(floor).floor` : `stone` vs `carpet` vs `cavern_floor` vs
`rune_floor`) — un pas mat/feutré sur tapis, claquant sur pierre.

- **Action** : `playFootstep()` (`audio-sfx.js`) accepte un paramètre de
  surface (ou lit `getFloorTheme(currentFloor).floor`) et ajuste
  filtre/fréquence/gain. Audio → gardé `isMuted` seulement.
- **Vérif** : `scenarioCameraPresence` (volet H2) — `playFootstep` accepte
  l'argument et ne throw sur aucune des 4 surfaces.

---

## I. Donjon vivant (narration)

### I1. Phrases d'atmosphère à l'entrée de salle ✅ (livré 2026-06-08)
À l'entrée d'une nouvelle salle (pas un simple pas de couloir), afficher
parfois (throttle + anti-répétition) une **courte phrase d'ambiance**
teintée par la zone (`getFloorTheme(floor).ambient`).

- **Action** : pool de phrases par zone (données pures), helper
  `_maybeRoomFlavor()` appelé depuis `handleCellEntry` (ou `_step` à
  l'entrée d'une room neuve), throttle (ex. 1 sur N entrées + jamais deux
  fois la même d'affilée). Affichage via `addMsg(text, 'info')`. **Aucun
  état persistant** (anti-répétition en variable transiente).
- **Garde-fou détermination smoke** : si throttle basé sur `Math.random`,
  effet purement textuel (n'altère aucun état/RNG de simulation), comme F2.
- **Vérif** : `scenarioDungeonLife` (volet I1) — helper présent ; forcé
  (proba 1) → produit une ligne de log de la bonne zone, sans throw ;
  anti-répétition (deux tirages consécutifs ≠).

### I2. Renfort d'ambiance des événements d'étage ✅ (livré 2026-06-08)
Les événements (`hante`, `runique`…) ne sont qu'un toast. Leur donner une
**signature persistante légère** sur l'étage : p.ex. `hante` → teinte
froide discrète de la vignette + barks plus fréquents ; `runique` → halo
runique discret ; `tresor` → aucune (déjà visible). Tout cosmétique.

- **Action** : lire `currentFloorEvent` dans les couches concernées —
  ajuster `_AMBIENT_BARK_CHANCE`/pool (audio) et/ou une classe CSS
  d'ambiance sur le conteneur de jeu (visuel, reduced-motion safe car
  statique). Réinitialisé à chaque changement d'étage.
- **Vérif** : `scenarioDungeonLife` (volet I2) — l'ambiance reflète
  `currentFloorEvent` (classe posée / proba ajustée) et se réinitialise au
  changement d'étage.
- **Statut** : à cadrer finement (quels événements, quelle signature) à
  l'implémentation — garder minimal.

---

## J. Boucle de butin

### J1. Pop de butin (révélation visuelle) ✅ (livré 2026-06-08)
Les drops sont déjà loggés avec icône. Ajouter une **révélation visuelle**
brève : l'icône de l'objet « pop » (scale + fondu montant) au-dessus de la
zone de combat à la victoire, pour rendre le gain tangible.

- **Action** : `CombatFX.lootPop(item)` (`combat-fx.js`) — affiche
  `getItemIconHtml(item, ...)` dans une couche animée (rise + fade,
  ~900 ms), empilable si plusieurs drops (léger décalage). Appelé dans
  `endBattle` à chaque drop ajouté, via `CFX_safe`. reduced-motion →
  apparition statique brève sans translation.
- **Vérif** : `scenarioLootLoop` (volet J1) — `lootPop` existe ; appel avec
  un item réel → couche montée/retirée sans throw ; reduced-motion safe.

### J2. Fioriture de level-up (optionnel)
Renforcer le moment du level-up (déjà sonore via `playLevelUp`) d'un
**flash doré** discret sur la modale / le HUD.

- **Action** : effet CSS bref déclenché à l'ouverture de `#levelup-modal`,
  via une classe transitoire. reduced-motion → no-op.
- **Vérif** : volet J2 du scénario — classe posée, pas de throw.
- **Statut** : optionnel, à faire en dernier si le budget le permet.

---

## Priorisation suggérée

1. **G1** — désintégration ennemi (★ meilleur ratio, comble le plus gros
   manque de punch).
2. **G2** — feedback de cast côté lanceur.
3. **J1** — pop de butin (renforce la récompense, réutilise CombatFX).
4. **I1** — phrases d'atmosphère (fort sur un crawler textuel, faible coût).
5. **H1** — bob de caméra (présence physique).
6. **H2** — variation de pas par surface. ✅
7. **I2** — renfort d'ambiance des événements (à cadrer minimal). ✅
8. **G3** / **J2** — optionnels, si budget.

Chaque item = une PR dédiée, smoke vert, journal mis à jour.

---

## Journal d'avancement

- 2026-06-01 : backlog rédigé après clôture de la suite 2 (D/E/F).
  Cap = les 4 directions (G/H/I/J) validées par l'utilisateur. Audit du
  code consigné en tête (ancrages G1→J2). Implémentation à suivre, item
  par item dans l'ordre de priorisation.
- 2026-06-01 : **G1 livré** (PR dédiée, branche
  `claude/immersion-g1-enemy-dissolve`). `CombatFX.deathDissolve(idx,
  monster)` (`combat-fx.js`) : nuage `.cfx-dissolve-puff` + 12 cendres
  montantes `.cfx-dissolve-ash`, teinte fantôme (bleuté) vs cendre chaude.
  Hook en tête de `renderEnemyGroup` (`battle-ui.js`) : détecte les ennemis
  fraîchement à 0 PV (`_dissolvePlayed` transient), joue avant la
  reconstruction en état mort, ancré sur la carte encore présente. CSS
  (`combat-fx.css`) + reduced-motion (cendres `display:none`, nuage court).
  Test : volet **F8** ajouté à `scenarioCombatFX` (DRY — réutilise le dummy
  fight) : nuage monté à la mort, idempotent, palette fantôme sans throw.
  smoke vert (159) + pwa-smoke vert. **Bumps** : `combat-fx.js` (6→7),
  `combat-fx.css` (7→8), `battle-ui.js` (3→4) ; `CACHE_VERSION` v56 → v57.
  Pas de nouveau global → loader inchangé (méthode de `CombatFX`).
- 2026-06-01 : **G2 livré** (branche `claude/immersion-g2-cast-feedback`).
  `CombatFX.castFlash(casterKey, element)` (`combat-fx.js`) : halo bref
  `.cfx-cast-halo` teinté élément + 6 étincelles montantes `.cfx-cast-spark`
  à l'ancre du lanceur (`'ally'`). Appelé dans `castSpellInBattle`
  (`battle-spells.js`) avant le `spellBurst` de la cible, via `CFX_safe`.
  Tests : volets **F9** (API + halo) et **F9b** (call-site réel) dans
  `scenarioCombatFX`. CSS + reduced-motion (halo seul). smoke + pwa verts.
- 2026-06-08 : **J1 livré** (branche `claude/immersion-suite-3-plan-3c00az`).
  `CombatFX.lootPop(item)` (`combat-fx.js`) : pastille dorée
  `.cfx-loot-pop` (icône `getItemIconHtml` + nom) qui pop + monte + fade
  (~960 ms). **Subtilité d'ancrage** : `endBattle` masque
  `#encounter-overlay` (`display:none`, `battle-rewards.js:10`) AVANT de
  traiter les drops → le pop ne peut pas vivre dans l'arène. Il se monte
  donc sur une couche **fixée au `body`** (`#cfx-loot-layer`, z-index 120,
  sous les modales), centrée haut, **empilable** (offset `--cfx-loot-i`
  pour les drops simultanés). Hook `CFX_safe.lootPop(item)` aux **6 sites
  de drop réussi** d'`endBattle` (standard + 3 Ténèbres + 2 matériaux
  endgame), après le `addMsg` existant. CSS `.cfx-loot-*` + reduced-motion
  (apparition statique sans translation). Test : volet **F10** ajouté à
  `scenarioCombatFX` (API directe + proxy, empilement `--cfx-loot-i==='1'`)
  + `hasLoot` dans F1. smoke vert + units (67) + pwa-smoke (v70) verts.
  **Bumps** : `combat-fx.js` (8→9), `combat-fx.css` (9→10),
  `battle-rewards.js` (3→4) ; `CACHE_VERSION` v69 → v70. Pas de nouveau
  global → loader inchangé (méthode de `CombatFX`).
  - *Note post-merge* : rebasé sur master (PR #408 barks, qui avait aussi
    pris `CACHE_VERSION v70` + `battle-rewards.js?v=4`) → collisions
    résolues, re-bump `battle-rewards.js` (4→5) + `CACHE_VERSION` v70 → v71.
    Mergé en **PR #409**.
- 2026-06-08 : **I1 livré** (branche `claude/immersion-i1-room-flavor`).
  Donjon vivant : nouveau module pur `js/room-flavor.js` exposant
  `maybeRoomFlavor(floor)` + `RoomFlavor.pickFlavor(zone)`. Pool de 4
  phrases par zone d'ambiance (`intro`/`dungeon`/`depths`/`abyss`, résolu
  via `getFloorTheme().ambient`), throttle `CHANCE` (0.30, mutable pour le
  smoke) + anti-répétition transiente (`_lastIdx`, jamais sérialisée).
  Affichage `addMsg('🕯️ …', 'info')` — **purement textuel** (≠
  mouvement/visuel → non gardé par reduced-motion, comme les barks F2),
  n'altère aucun état/RNG de simulation. Déclenchement gardé à l'**entrée
  de salle** (pas un pas de couloir) : `_isRoomCell(x,y)` (movement.js,
  heuristique « carré 2×2 ouvert ») + flag transient `_wasInRoomCell` ;
  `handleCellEntry` calcule le franchissement de seuil et n'appelle
  `maybeRoomFlavor` que dans la branche sol nu, via `typeof … === 'function'`
  (call-site défensif). Test : `scenarioDungeonLife` (volet I1) dans
  `tests/scenarios/dungeon.js` (API, phrases par zone, anti-répétition,
  forçage proba 1 → ligne 🕯️, `_isRoomCell` booléen). MANIFEST loader :
  `maybeRoomFlavor`/`RoomFlavor` (optional). smoke vert + units (76) +
  pwa-smoke (v72) verts. **Bumps** : `room-flavor.js` (neuf, v1),
  `movement.js` (27→28), `loader.js` (26→27) ; `CACHE_VERSION` v71 → v72.
  Mergé en **PR #410**.
- 2026-06-08 : **H1 livré** (branche `claude/immersion-h1-step-bob`).
  Présence physique : `DungeonFX.stepBob(dir)` (`dungeon-fx.js`) pose une
  classe d'anim transitoire sur `#dungeon-canvas` — léger plongeon vertical
  amorti (~140 ms, 5 px avant / 2 px recul via `dfx-bob` / `dfx-bob-back`),
  distinct du `shakeView` brutal des pièges. Appelé dans `_step`
  (`movement.js`) après `playFootstep`, `dir = faceDir ? 'forward' : 'back'`,
  via `DFX_safe` (call-site défensif). `shakeView` strippe désormais aussi
  les classes de bob (un piège au même pas prend le dessus proprement sur la
  même propriété `transform`). CSS `dfx-bob*` + reduced-motion (no-op).
  Test : `scenarioCameraPresence` (volet H1) dans `tests/scenarios/controls.js`
  (API + classes avant/recul, avancée réelle sans throw, reduced-motion via
  `emulateMedia` → aucune classe). smoke vert + pwa-smoke (v73) verts.
  **Bumps** : `dungeon-fx.js` (3→4), `dungeon-fx.css` (2→3), `movement.js`
  (28→29) ; `CACHE_VERSION` v72 → v73. Pas de nouveau global (méthode de
  `DungeonFX`) → loader inchangé. Mergé en **PR #412**.
- 2026-06-08 : **H2 livré** (branche `claude/immersion-h2-footstep-surface`).
  `playFootstep(surface)` (`audio-sfx.js`) accepte une surface explicite,
  sinon la dérive de `getFloorTheme(currentFloor).floor`. Table
  `_SURFACE_STEPS` (4 profils de timbre) : `stone` claquant (highpass aigu),
  `carpet` feutré (lowpass, gain bas, décroissance + longue), `cavern_floor`
  mat/résonant (bandpass médium Q 1.4), `rune_floor` métallique (highpass
  Q 2.2) — chaque profil pilote type de filtre / fréquence / résonance /
  gain / durée du bruit filtré. Le call-site `movement.js`
  (`AudioSystem.playFootstep()` sans argument) bénéficie automatiquement de
  la dérivation par tranche — **aucun changement movement.js**. Audio
  (≠ mouvement) → gardé `isMuted` seul, pas de reduced-motion. Surface
  inconnue → repli `stone`. Test : volet **H2** ajouté à
  `scenarioCameraPresence` (`tests/scenarios/controls.js`) — profils présents
  + `playFootstep` ne throw sur aucune des 4 surfaces (ni inconnue, ni sans
  argument). smoke + pwa-smoke (v74) verts. **Bumps** : `audio-sfx.js`
  (5→6) ; `CACHE_VERSION` v73 → v74. Pas de nouveau global (méthode/propriété
  de `AudioSystem`) → loader inchangé. Mergé en **PR #414**.
- 2026-06-08 : **I2 livré** (branche `claude/immersion-i2-floor-event-ambience`).
  Signature légère par événement d'étage, sur deux canaux. **Visuel** :
  `DungeonFX.setFloorAmbience()` (`dungeon-fx.js`) pose une classe STATIQUE
  sur `.scene-viewport` selon `currentFloorEvent` — `dfx-ambience-hante`
  (vignette froide bleu-vert oppressante) / `dfx-ambience-runique` (halo
  violacé ancien). Les autres événements n'ont pas de signature (`tresor`
  déjà lisible). Idempotente (retire la classe précédente → bascule propre +
  reset hors événement). Overlay `::after` `pointer-events:none`, `z-index:2`
  (sous minimap z5 + overlays d'interaction z9). Statique → reduced-motion
  safe sans garde. Câblée via `DFX_safe.setFloorAmbience()` aux 3 points
  d'entrée d'étage : `_changeFloor` onArrive (`movement-floors.js`),
  `startGame` (`main.js`), `_applyState` (`save.js`). **Audio** :
  `maybeAmbientBark` (`audio-sfx.js`) lit `currentFloorEvent` — un étage
  `hante` ×1.6 la fréquence des barks et biaise le pool vers les sons
  oppressants (groan/rumble/clang), toutes zones. Purement audio/cosmétique,
  n'altère aucun état/RNG de simulation. Test : volet **I2** ajouté à
  `scenarioDungeonLife` (`tests/scenarios/dungeon.js`) — API présente, classe
  posée pour hante/runique, bascule à classe unique, aucune classe pour
  `tresor`/null, `maybeAmbientBark` hanté ne throw pas (forçage proba 1).
  smoke (167) + units (81) + pwa-smoke (v75) verts. **Bumps** :
  `dungeon-fx.js` (4→5), `dungeon-fx.css` (3→4), `audio-sfx.js` (6→7),
  `movement-floors.js` (4→5), `main.js` (15→16), `save.js` (25→26) ;
  `CACHE_VERSION` v74 → v75. Pas de nouveau global (méthode de `DungeonFX`)
  → loader inchangé.

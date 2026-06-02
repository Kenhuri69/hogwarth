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

### G2. Feedback de cast côté lanceur
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

### H1. Bob / à-coup de caméra à l'avancée
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

### H2. Variation de pas selon la surface
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

### I1. Phrases d'atmosphère à l'entrée de salle
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

### I2. Renfort d'ambiance des événements d'étage
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

### J1. Pop de butin (révélation visuelle)
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
6. **H2** — variation de pas par surface.
7. **I2** — renfort d'ambiance des événements (à cadrer minimal).
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

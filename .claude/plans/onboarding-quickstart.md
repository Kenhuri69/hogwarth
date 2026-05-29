# LOT D — Onboarding & première session

> Branche : `claude/onboarding-quickstart` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT D.
> **Tranche livrée : D1 + D2.** (D3/D4 → suivi ultérieur, cf. bas de page.)

## Contexte
Le tour guidé `help-tour.js` (13 étapes, auto au démarrage) existe déjà et
couvre l'UI hors-combat. Manquaient : un chemin de démarrage rapide (D1) et un
tuto **au moment où le joueur en a besoin** — son premier combat (D2).

## Réalisé
### D1 — Quick Start
- [x] `quickStart()` (main.js) : presets **Solo · Harry · Normal**, masque
  l'écran de sélection et saute directement au **choix de Maison** (saute
  l'assistant en 3 étapes).
- [x] Bouton `⚡ Partie rapide` dans l'étape 1 de `#player-select-screen`
  (index.html), style secondaire `.psel-quickstart` (style.css).
- [x] **Vérif** : depuis la sélection, `quickStart()` → écran Maison affiché,
  presets posés (`scenarioOnboarding` D1).

### D2 — Tuto contextuel du premier combat
- [x] Réutilise l'infra `help-tour.js` (bulle + spotlight) **généralisée** :
  `startHelpTour(stepsOverride, opts)` accepte un jeu d'étapes custom + options
  `{ noVoice, hideOptout }`. Une étape unique ciblée sur `.battle-actions`.
- [x] `maybeShowCombatTutorial()` : affiché **une fois par partie**, jamais
  superposé au tour guidé (`_helpTourActive`). Source de vérité = flag de save
  `combatTutorialSeen` (state.js), repli localStorage si l'état n'est pas dispo.
- [x] Hook dans `startBattle` (battle.js, `setTimeout 350 ms`, hors combat astral).
- [x] Flag `combatTutorialSeen` : déclaré (state.js), reset par `startGame`
  (main.js), sérialisé (`_serializeState`/`_applyState`, save.js — défaut `false`
  pour les saves antérieures). Loader MANIFEST mis à jour.
- [x] **Vérif** : bulle « Ton premier combat ! » au 1ᵉʳ combat, flag→true,
  compteur/voix/opt-out masqués, **pas de réapparition** au 2ᵉ combat
  (`scenarioOnboarding` D2).

## Notes honnêtes
- Le help-tour auto (13 étapes) reste prioritaire : s'il est ouvert, le tuto
  combat est différé (le joueur est déjà guidé). Comportement voulu.
- D2 réplique la bulle help-tour sans dupliquer de DOM/CSS (généralisation
  minimale : `_htSteps`/`_htOpts`, réinitialisés à la fermeture).
- Versions PWA bumpées (style.css, help-tour/state/battle/save/main/loader.js)
  + `CACHE_VERSION` v20→v21.

### D3 — Bonus de Maison chiffrés + reco playstyle (livré 2026-05-29)
- [x] `_renderHouseSelectBonuses()` (main.js) : génère pour chaque Maison un
  aperçu des **3 premiers paliers** depuis `HOUSE_BONUSES` (source unique de
  vérité → reste cohérent si la grille évolue). Ex. Gryffondor :
  « +ATK par palier · 50 : +1 LCK · 150 : +1 ATK · 300 : ⚜️ ».
- [x] Appelé aux **deux** points de révélation (`quickStart` +
  `confirmHeroSelection`). Texte statique HTML conservé comme repli.
- [x] Ligne **reco playstyle** sous le sous-titre (statique) : +ATK = combat
  physique (Harry) · +MAG = sortilèges (Hermione) · +DEF = résistance.
- [x] PWA : `main.js` v6→v7 (index.html + sw.js PRECACHE), `CACHE_VERSION`
  v21→v22.
- [x] **Vérif** : `scenarioOnboarding` D3 — bonus chiffrés présents et
  cohérents avec `HOUSE_BONUSES` (palier 150 = +1 ATK).

## Reportés (suivi LOT D)
- **D4** — Help-tour relançable **par section** (menu « Quelle aide ? »).

## Journal
| Date | Note |
|------|------|
| 2026-05-29 | D1+D2 implémentés et testés. Suite 125/125. D3/D4 reportés. |
| 2026-05-29 | D3 implémenté et testé (bonus chiffrés + reco). D4 reporté. |

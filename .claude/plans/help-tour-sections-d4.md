# LOT D.4 — Help-tour reprenable par section

> Branche : `claude/help-tour-sections-d4` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT D (D4).

## Objectif
Relancer l'aide **par section** plutôt que toujours depuis l'étape 1. Le bouton
« Aide » ouvre un menu « Quelle aide ? » : *Tout le guide* + 4 sections
thématiques. L'auto-affichage au démarrage (nouvelle partie) reste le tour
complet inchangé.

## Contraintes (non-régression)
- `maybeAutoStartHelpTour()` / `startHelpTour()` **inchangés** (smoke T1/T5
  attendent un démarrage à l'étape 1, l'auto-tour complet).
- La narration McGonagall (`mcgonagall_help_<n>`) est indexée sur la position
  dans `HELP_TOUR_STEPS`. Une section = un **slice** → il faut décaler la voix
  via `voiceOffset` pour conserver l'OGG correct (sinon section 2 jouerait
  `mcgonagall_help_1`).

## Étapes
- [x] `HELP_TOUR_SECTIONS` : partition des 15 étapes en 4 sections
  (Explorer / Groupe & menus / Combat & survie / Sauvegarde) — `{icon, label, start, end}`.
- [x] `startHelpTour(steps, opts)` lit `opts.voiceOffset` ; `_htSpeakStep`
  joue `mcgonagall_help_(offset + step + 1)`. Défaut offset 0 → inchangé.
- [x] `openHelpMenu()` / `closeHelpMenu()` / `helpMenuStart(which)` + DOM léger
  `#help-menu-overlay`. « Tout le guide » → `startHelpTour()` ;
  section → `startHelpTour(slice, {voiceOffset:start, hideOptout:true})`.
- [x] Bouton « Aide » (index.html) → `openHelpMenu()` ; sélecteur cible de
  l'étape 15 MAJ ; `openHelpMenu` ajouté au loader MANIFEST.
- [x] CSS `.help-menu-*` (help-tour.css).
- [x] PWA : help-tour.js v2→3, help-tour.css v1→2, loader.js v17→18,
  CACHE_VERSION v25→v26.
- [x] Smoke `scenarioHelpTour` : T7 (Aide → openHelpMenu) + T9 (menu affiché,
  section démarre à sa 1re étape d'origine, compteur sliced, voiceOffset correct,
  « Tout le guide » couvre les 15 étapes). Suite **126/126** + pwa v26.

## Compat saves
Aucun champ persisté nouveau. Opt-out / voix : clés localStorage inchangées.

## Journal
| Date | Note |
|------|------|
| 2026-05-30 | Plan rédigé. Implémentation en cours. |
| 2026-05-30 | D4 implémenté et testé (126/126 + pwa v26). |
| 2026-05-30 | Re-vérification sur branche `claude/help-tour-sections-d4-PuCON` : D4 déjà livré (commit `b3f4cb8`, PR #300). Toutes les étapes ✓ confirmées dans le code réel (`openHelpMenu`/`closeHelpMenu`/`helpMenuStart`, `HELP_TOUR_SECTIONS`, `voiceOffset`, bouton Aide index.html, MANIFEST loader, CSS, T7/T9 smoke). Suite complète **134/134** verte + pwa-smoke (cache v32). Aucune régression, rien à réimplémenter. |

# Thème D — Onboarding · D3 : glossaire des mécaniques

> Revue UX Axe 1 : « l'onboarding n'apprend que les boutons, pas les systèmes
> profonds (Fortune/Célérité, postures, éléments, paliers, DoT, Broyer…) ».
> Lot 1 = un **glossaire de règles statique** accessible depuis le menu d'aide.
> Contenu pur (règles), distinct du Codex (lore/contenu déverrouillable).

## Livré
- Bouton « 📐 Mécaniques du jeu (glossaire) » ajouté au menu d'aide
  (`_hmBuildDom`), routé par `helpMenuStart('glossary')` → panneau statique
  (pas un tour spotlight).
- `MECHANICS_GLOSSARY` (11 entrées) + `openMechanicsGlossary()`/`close…()`
  (`help-tour.js`). Réutilise le style de la carte d'aide (scroll interne) ;
  seul ajout CSS = partage du sélecteur du bouton fermer (`#mech-gloss-x`).
- Entrées : éléments & faiblesses, les 4 DoT (identités B3), Fortune, Célérité,
  Garde & riposte, postures Duo, paliers de Maison, Broyer, stun/peur, deux
  crits, Boucle & Éclats.

## Vérif
- `node tests/smoke.js npc` : T9 (compte du menu = sections + 2) + **T10**
  (bouton glossaire, panneau = 11 entrées, ferme le menu, n'est pas un tour).
- Cache : `help-tour.js` + `help-tour.css` + `CACHE_VERSION`.

## Suivi possible
- Tips contextuels one-shot (1ʳᵉ posture, 1ᵉʳ ennemi 💥 faible, palier 17…) via
  l'infra `startHelpTour` + flags localStorage — lot séparé.

## Journal
- **2026-07-16** — Glossaire livré (11 entrées, menu d'aide). Tips contextuels = suite.

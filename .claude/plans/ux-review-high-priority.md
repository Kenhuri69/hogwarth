# Plan — Lot UX priorité haute (#1–3)

Issu de la revue UX (captures `.claude/mockups/audit-*.png`). Périmètre validé
par l'utilisateur : les 3 frictions à fort impact / faible risque.

## #1 — En-tête de modale trompeur (Quêtes & Réglages)
**Constat** : `#character-modal-title` (index.html:864) est figé sur « Fiche de
Personnage ». `openQuestLog()` (quests.js) et `changeDifficulty()`
(ui-settings.js) réutilisent `#char-detail` sans changer ce titre → l'en-tête
reste « Fiche de Personnage » au-dessus d'un sous-titre « Journal des Quêtes » /
« Difficulté ».

**Action** :
- Helper `setCharacterModalTitle(iconSrc, label)` dans `ui.js` (mut. innerHTML
  de `#character-modal-title`).
- `openCharacter()` : appelle le helper avec scroll.png + « Fiche de Personnage »
  (rétablit le titre par défaut quand on revient).
- `openQuestLog()` : helper avec quest.png + « Journal des Quêtes » ; retirer le
  sous-titre dupliqué dans `#char-detail`.
- `changeDifficulty()` : helper + retirer le sous-titre dupliqué.

**Vérif** : ouvrir Quêtes → titre = « Journal des Quêtes » ; ouvrir Réglages →
« Difficulté » ; ouvrir Fiche → « Fiche de Personnage ». Scénario smoke + capture.

## #2 — Toasts qui recouvrent les contrôles mobiles
**Constat** : `#msg-log` est `position:fixed; bottom:80px; right:10px`
(pointer-events:none → ne bloque pas les clics, mais recouvre visuellement le
D-pad / la grille d'action sur mobile).

**Action** : override mobile (≤700px) de `#msg-log` → ancrer en HAUT de la vue
(au-dessus du canvas, sous le bandeau de groupe), pleine largeur marginée,
centré. Ne recouvre plus le footer.

**Vérif** : capture mobile HUD — toasts au-dessus de la vue 3D, boutons dégagés.

## #3 — Lisibilité barres PV/PM mobile
**Constat** : valeur `35/35` en `#8a7050` (brun terne) 10px ; `.bar-track`
abaissée à 4px sur mobile. Info vitale peu lisible.

**Action** : override mobile :
- valeur (`.bar-label > span:last-child`) → parchemin clair, 600, ~11px.
- `.bar-track` 4px → 7px.

**Vérif** : capture mobile HUD — PV/PM nets.

## Non-régression
- `node tests/smoke.js` vert.
- Captures avant/après desktop + mobile.

## Suivi
- [x] #1 implémenté — helper `setCharacterModalTitle` (ui.js) + appels dans
      openCharacter / openQuestLog / changeDifficulty ; sous-titres dupliqués
      retirés. Vérifié captures quests/settings-desktop.
- [x] #2 implémenté — override mobile `#msg-log` ancré en haut (top:116px),
      footer dégagé. Vérifié audit-hud-mobile.
- [x] #3 implémenté — valeur PV/PM en parchemin/600/11px + bar-track 7px sur
      mobile. Vérifié audit-hud-mobile / settings-mobile.
- [ ] smoke vert
- [ ] captures après (faites)

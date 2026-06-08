# Plan — Lot UX « respiration visuelle » (#4, #6)

Suite de la revue UX. Lot validé par l'utilisateur. **#5 (regroupement de la
barre d'action) reporté** : faible valeur (la barre offload déjà le système
dans la modale Réglages) et risque élevé (tests ciblant les boutons par
`onclick`, ex. `visuals.js:196` sur `button[onclick="openBestiary()"]`).

## #4 — Alléger le panneau gauche (desktop)
**Constat** : le panneau gauche affiche, en plus des cartes de groupe, un bloc
de 8 stats secondaires (`.stats-grid`) **et** une liste d'équipement texte
(baguette/armure/acc de Harry uniquement) — tous deux redondants avec la Fiche
(`openCharacter`, bouton 📜 du HUD) et, pour l'équipement, avec les icônes
`party-equip-row` déjà présentes sur chaque carte. Sur mobile c'est déjà masqué.

**Action** : masquer `.stats-grid` (panneau gauche) et le bloc équipement sur
desktop aussi → panneau gauche = cartes de groupe + blason, cohérent avec
mobile. Les stats/équipement complets restent dans la Fiche (1 clic).
- HTML : ajouter `id="hud-equip-block"` au div équipement (index.html).
- CSS : règle globale masquant `#hud-equip-block` + `.left-panel .stats-grid`.

**Vérif** : capture desktop HUD — panneau gauche épuré, canvas inchangé.
Smoke : aucun test n'assert la visibilité de `#s-*`/`stats-grid` (vérifié).

## #6 — Combat desktop : remplir le vide
**Constat** : `#encounter-overlay` (desktop) est `justify-content:center` →
le contenu (groupe ennemi 80px + log + actions) se groupe au centre d'un grand
overlay, laissant de larges vides haut/bas. Le sprite ennemi solo (80px) est
petit pour un point focal desktop.

**Action** (desktop ≤ override `@media (min-width:701px)`, mobile intact) :
- `#encounter-overlay` : `justify-content:flex-start` + padding-top, `gap`
  augmenté.
- `.enemy-group-container` : `flex:1` (occupe la zone haute, ennemi centré
  dedans) → actions ancrées en bas, vide supprimé.
- `.battle-log` : police/upsize léger.
- Sprite ennemi solo : `sizePx` 80 → 104 (`battle-ui.js`) — bénéficie aussi au
  mobile (reste sous le min-height 140 du conteneur).

**Vérif** : capture combat desktop — ennemi imposant, contenu distribué.
Smoke : `controls.js` (enemy-group min-height ≥140, battle-actions grille
mobile 6 col) doit rester vert ; combat scénarios verts.

## Non-régression
- `node tests/smoke.js` vert.
- Captures avant/après desktop (+ mobile pour vérifier non-régression combat).

## Suivi
- [x] #4 implémenté — `#hud-equip-block` + `.left-panel .stats-grid` masqués
      partout. Vérifié audit2-hud-desktop (panneau gauche épuré, canvas inchangé).
- [x] #6 implémenté — `@media (min-width:701px)` : overlay ancré haut, groupe
      ennemi `flex:1` (zone haute), log agrandi ; sprite solo 80→104 (battle-ui.js).
      Vérifié audit2-combat-desktop (vide supprimé) + mobile non régressé.
- [x] smoke vert — 159 scénarios + 67 assertions units.
- [x] captures après (audit2-*).

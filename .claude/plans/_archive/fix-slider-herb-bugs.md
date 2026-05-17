# Fix — swipe canvas + bugs du système d'herbes

Branche : `claude/fix-slider-herb-bugs-opKOP`

## Contexte

Revue des bugs liés aux changements récents (commit `72da51d` herbes/potions
+ commit `e29d922` « fix 6 bugs »). Trois bugs identifiés.

## Bug 1 — Swipe canvas bloqué en permanence

`e29d922` a changé `_swipeBlocked()` (`swipe-canvas.js`) : test passé de
`el.style.display` à `getComputedStyle(el).display`. Or `#floor-transition`
est toujours `display:flex` (visibilité pilotée par `opacity`/`pointer-events`
via la classe `.active`). → `_swipeBlocked()` renvoie toujours `true`, tous
les swipes sont bloqués.

- [x] Vérifié en headless : `blocked: true` dès le démarrage.
- [x] Correctif : un overlay bloque le swipe seulement s'il est affiché
  ET interactif (`display !== 'none'` ET `pointer-events !== 'none'`).
  → verify : test smoke `blocked: false` après démarrage.

## Bug 2 — Cache JS/CSS non invalidé

`72da51d` a modifié 10 fichiers JS + `style.css` mais n'a bumpé que
`potions.js?v=1`. Visiteurs récurrents (GitHub Pages) → mélange
nouveau `index.html` + anciennes versions en cache.

- [x] Correctif : bump `?v=` de tous les fichiers modifiés
  (audio-sfx, monsters, npcs, data, item-icons, movement, inventory,
  quests, npc-dialog, loader, swipe-canvas, style.css).
  → verify : inspection visuelle d'`index.html`.

## Bug 3 — Herbes inaccessibles avant le chaudron

Les herbes récoltées vont dans `player.herbs`, visibles uniquement dans la
modale de brassage, verrouillée jusqu'à `quest_potions_slughorn`.

Choix utilisateur : **onglet dans l'inventaire**.

- [x] `index.html` : barre d'onglets Sac / Besace dans `#inventory-modal`,
  pane `#inv-pane-besace`.
- [x] `inventory.js` : `_invTab`, `switchInvTab()`, `renderBesace()`.
  `openInventory` rend les deux panes ; `openBattleItems` masque les
  onglets (besace hors-sujet en combat).
- [x] `style.css` : neutralise le curseur cliquable dans la besace.
  → verify : test smoke — onglet Besace liste les herbes de `player.herbs`.

## Vérification finale

- [x] `node tests/smoke.js` vert (scénarios swipe + besace ajoutés).
</content>
</invoke>

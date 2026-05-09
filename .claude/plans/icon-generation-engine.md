# Plan — Moteur de génération d'icônes (gen_icons.py)

> Objectif : générer en pixel art les icônes UI du jeu (sac, carte, sorts, fiche, etc.)
> sur le même principe que `gen_textures.py`, pour remplacer les emoji des boutons d'action.

## Stack
- **Pillow** (PIL) uniquement — déjà utilisé par `gen_textures.py`, zéro nouvelle dépendance.
- Sortie : PNG 48×48 RGBA (transparence pour intégration UI).
- Style : pixel art net (pas d'AA), contours 1px sombres, ombres internes.

## Conventions visuelles
- Taille : **48×48** RGBA, fond transparent.
- Palette de base reprise de `gen_textures.py` (or, cuir, parchemin) + extensions.
- Marge minimum 2px sur chaque côté pour éviter de coller aux bords du bouton.
- Contour 1px sombre côté ombre (bas/droite typiquement).
- Highlight 1px clair côté lumière (haut/gauche typiquement).

## Étapes

### Étape 1 — Bootstrap + 3 icônes test ✅
- [x] Créer `gen_icons.py` avec helpers (palette, blend, vary, putpx, draw_outline)
- [x] Générer 3 icônes (sac à dos, carte, livre de sorts) → `img/icons/`
- [x] **Validation utilisateur** sur le style — OK 2026-05-09
- Vérification : ouvrir les PNG, confirmer le style pixel art, lisibilité à 48px.

### Étape 2 — Set complet ⏳ (généré, en attente validation)
Icônes à générer pour remplacer les emoji actuels :
| Bouton | Emoji | Icône cible | Statut |
|--------|-------|-------------|--------|
| Sac | 🎒 | `backpack.png` | ✅ |
| Sorts | 📖 | `spellbook.png` | ✅ |
| Fiche | 📜 | `scroll.png` | ✅ |
| Bestiaire | 📕 | `bestiary.png` | ✅ |
| Quêtes | ✦ | `quest.png` | ✅ |
| Fouiller | 🔍 | `search.png` | ✅ |
| Repos | 💤 | `rest.png` | ✅ |
| Sauver | 💾 | `save.png` | ✅ (tas de sable perfectible) |
| Charger | 📂 | `load.png` | ✅ (un peu chargé) |
| Diff. | ⚙️ | `gear.png` | ✅ (dents approximatives) |
| Musique | ♪ / 🔇 | `music_on.png` / `music_off.png` | ✅ |
| Voix | 🗣️ / 🔕 | `voice_on.png` / `voice_off.png` | ✅ |
| Map (bonus) | — | `map.png` | ✅ |

### Étape 3 — Intégration dans le jeu ✅
- [x] `index.html` : `<span class="btn-icon">EMOJI</span>` → `<span class="btn-icon"><img src="img/icons/X.png" alt="…"></span>`
  (13 boutons : sac, sorts, fiche, bestiaire, quêtes, fouiller, repos, music, voice, sauver, charger, diff, map mobile)
- [x] `js/audio.js` : `toggleMute`/`toggleVoice` swappent désormais l'`<img>` au lieu du `textContent`
- [x] `css/style.css` : `.cmd-btn .btn-icon img { 24px × 24px; image-rendering: pixelated }`
  (downscale 2× propre depuis source 48×48)
- [x] Captures de validation : `img/icons/_ingame_bar.png` (desktop), `img/icons/_ingame_mobile.png`

### Étape 4 — Validation ✅
- [x] Scénario 17 ajouté à `tests/smoke.js` : présence DOM + chargement PNG + toggle music/voice
- [x] `node tests/smoke.js` : tous les 17 scénarios passent, pas de régression
- [x] Vérification visuelle desktop + mobile

## Notes
- `gen_icons.py` reste idempotent et déterministe (seeds fixes).
- Lancer : `python3 gen_icons.py`.
- Les fichiers existants dans `img/icons/` sont overwritten.

---

# Plan — Fix portrait après chargement de slot

> Bug constaté 2026-05-09 par l'utilisateur : charger un slot depuis le hub démarrage
> affiche toujours le portrait de Harry, même quand la save porte un autre héros
> (Céleste, Iris, Maxence…).

## Cause
- `<img class="party-portrait-img" src="img/harry.png">` est codé en dur dans `index.html:348`.
- `_updateCharBar()` (`js/ui.js:109`) met à jour name / class / hp / sp mais **pas** le portrait.
- Le portrait n'est mis à jour que dans `_hydrateCharacter()` (`js/main.js:140`), appelé uniquement par le flux nouvelle partie.
- `_applyState()` mute bien `player.imgSrc` mais aucun code ne propage la valeur sur le DOM lors d'un load.

## Étapes
- [x] Étape 1 — Patcher `_updateCharBar(idx)` pour synchroniser `.party-portrait-img` (`src` + `alt`) à partir de `c.imgSrc` / `c.name`. → vérifier : tous les flux qui rafraîchissent l'UI (`updateUI`) propagent désormais l'icône. Pas d'effet de bord sur la nouvelle partie (idempotent : valeur déjà bonne).
- [x] Étape 2 — Étendre le scénario 16 (hub démarrage) pour sauvegarder en jouant Céleste, recharger le slot, et asserter que `#char-card-0 .party-portrait-img` finit par `celeste.png`. → vérifier : `node tests/smoke.js` 17 scénarios passent.
- [x] Étape 3 — Commit + push sur `claude/icon-generation-engine-LjO0J`.

---

# Plan — Couverture 100% des icônes UI

> Objectif final : 0 emoji visible côté joueur, 100% PNG pixel art générés
> par `gen_icons.py`. Audit du 2026-05-09 : ~75 emoji distincts à remplacer.
> Décisions cadrage : ALL items + sorts ; difficulté reste en emoji ; char icons générés.

## Phasage (validation utilisateur entre chaque phase)

### Phase 1 — UI chrome + HUD stats ⏳ (en cours)
12 PNG, impact visuel maximal, base pour valider le style.

| Symbole | Cible | Usage principal |
|---------|-------|-----------------|
| ⚡ HP   | `hp.png`     | Barres PV (`#bar-label`), dpad center, titre jeu |
| ✨ MP   | `mp.png`     | Barres PM, bouton Sortilège combat |
| 🌟 XP   | `xp.png`     | Label XP (`#xp-label`) |
| 🪙      | `gold.png`   | `#gold-display`, récompense quête |
| ⚔️      | `atk.png`    | Stat ATK (fiche), bouton Attaquer combat, monstres |
| 🛡️      | `def.png`    | Stat DEF (fiche), monstres, statut bouclier |
| 💪      | `str.png`    | Stat FOR (fiche personnage) |
| 🧠      | `int.png`    | Stat INT (fiche) |
| 🏃      | `agi.png`    | Stat AGI (fiche), bouton Fuir |
| 🔮      | `mag.png`    | Stat MAG (fiche), monstres |
| 🏪      | `shop_sign.png` | Titre boutique, room status |
| 🚪      | `door.png`   | Bouton interact |

Étapes Phase 1 :
- [x] 1.1 — Étendre `gen_icons.py` avec 12 nouvelles fonctions de génération
- [x] 1.2 — Lancer `python3 gen_icons.py`, ouvrir les PNG → validation utilisateur OK
- [x] 1.3 — Remplacer dans `index.html` (game-title, gold-display, barres HP/MP/XP, dpad-center, btn-interact, shop-title, boutons combat ATK/spell/flee)
- [x] 1.4 — Remplacer dans `js/ui.js` (`#gold-display` via innerHTML, `#xp-label` via innerHTML, character modal stats : HP/MP/ATK/DEF/STR/INT/AGI/LCK/MAG/Gold)
- [x] 1.5 — Remplacer dans `js/quests.js` (récompense XP + or)
- [x] 1.6 — CSS : classes `.ui-icon`, `.ui-icon-sm` (12px), `.ui-icon-md` (16px), `.ui-icon-lg` (20px), `.ui-icon-xl` (28px), `image-rendering: pixelated`
- [x] 1.7 — Scénario 18 ajouté à `tests/smoke.js` : assert HUD `<img>` chargés + fiche perso + persistance après `updateUI`. Bug détecté et corrigé : `xp-label.textContent =` écrasait l'image → switch vers `innerHTML`.
- [x] 1.8 — Captures `_phase1_ingame.png` (HUD complet), `_phase1_zoom_left.png`, `_phase1_zoom_gold.png`, `_phase1_charsheet.png`. Tous les scénarios (19) passent.

**Note** : équipement (🪄 🧥 💎) reste en emoji, sera traité en Phase 2 avec wand/armor/accessory dédiées.

### Phase 2 — Status effects + équipement (8 PNG) ✅
🪄 wand · 🧥 armor · 💎 accessory · 🔥 burn · ☠️ poison · 🩸 bleed · 💚 heal · 💀 dead

**Architecture resolver (`js/item-icons.js`)** — préparée pour Phase 4 :

```js
ITEM_ICON_REGISTRY = {}        // priorité 1 — vide aujourd'hui, peuplé en Phase 4
EQUIPMENT_SLOT_ICONS = {       // priorité 2 — slot par type
  wand: 'img/icons/wand.png', armor: '...', acc: '...', spellbook: '...'
}
STATUS_ICON_REGISTRY = {       // pour STATUS_DEFS (battle.js)
  burn, poison, bleed, heal, dead → leur PNG
}

getItemIconHtml(item, sizeClass)        → <img> ou emoji fallback
getEquipmentSlotIconHtml(type, sz)      → <img> du slot
getStatusIconHtml(statusId, sz)         → <img> du status
```

Quand on génèrera un PNG dédié pour `wand_houx`, `wand_sureau`, `robe_renforcee`, etc.,
il suffira d'ajouter `ITEM_ICON_REGISTRY['wand_houx'] = 'img/icons/items/wand_houx.png'`
sans toucher au code d'intégration. Le fallback slot reste actif tant qu'aucun
override n'est enregistré.

Étapes Phase 2 :
- [x] 2.1 — Étendre `gen_icons.py` avec 8 fonctions (wand, armor, accessory, burn, poison, bleed, heal, dead)
- [x] 2.2 — Itération style v1→v3 (burn aplati, heal sans artefact tige, bleed redessiné en goutte propre)
- [x] 2.3 — Créer `js/item-icons.js` avec resolver 3-niveaux + registry vide pour Phase 4
- [x] 2.4 — Brancher dans `index.html` (panneau gauche équipement + script load order)
- [x] 2.5 — Brancher dans `js/ui.js` (fiche perso : `getItemIconHtml(c.equipped.X) || getEquipmentSlotIconHtml(type)`)
- [x] 2.6 — Brancher dans `js/inventory.js` (typeIcon de la grille via `getEquipmentSlotIconHtml`)
- [x] 2.7 — Brancher dans `js/battle-ui.js` (status pills via `getStatusIconHtml` + variant dead via `dead.png`)
- [x] 2.8 — Scénario 19 ajouté à `tests/smoke.js` : valide resolver, registry override, fallback slot, présence DOM
- [x] 2.9 — Scénario 2 mis à jour pour valider l'`<img src="burn.png">` au lieu de l'emoji 🔥
- [x] 2.10 — Captures `_phase2_left_panel.png`, `_phase2_charsheet.png`, `_phase2_battle_status.png`. 20 scénarios passent.

### Phase 3 — Sorts (23 PNG) ✅
Chaque sort de `SPELLS[]` reçoit son PNG dans `img/icons/spells/`.
Architecture : `_spell_badge(seed, bg_dark, bg_light, glyph_fn)` produit un disque
22r avec dégradé + ring or + glyphe central. 14 helpers de glyphes réutilisables :
`_bolt`, `_flame`, `_drop`, `_cross`, `_shield_glyph`, `_spiral`, `_star4`,
`_key`, `_bat`, `_skull`, `_heart_small`, `_wave_arrow_up`, `_scissors`,
`_explosion_star`, `_mask_face`, `_spider`.

Resolver : `SPELL_ICON_REGISTRY` (mapping `spell.name → src`) + `getSpellIconHtml(spell, sz)`
avec fallback sur `spell.icon` (emoji) si non mappé.

Étapes Phase 3 :
- [x] 3.1 — 14 helpers glyphes + 23 fonctions `gen_spell_*` dans `gen_icons.py`
- [x] 3.2 — Itération diffindo (sablier → ciseaux clairs)
- [x] 3.3 — `js/item-icons.js` : SPELL_ICON_REGISTRY (23 entrées) + `getSpellIconHtml`
- [x] 3.4 — `js/inventory.js` : `${spell.icon}` → `${getSpellIconHtml(spell, 'ui-icon-xl')}` dans openSpells/openBattleSpells
- [x] 3.5 — `js/battle-spells.js` : `${spell.icon}` → `${getSpellIconHtml(spell, 'ui-icon-md')}` dans msg + UX.logCombat
- [x] 3.6 — `js/battle-ui.js` : `setBattleLog` passe de `textContent` à `innerHTML` pour permettre les `<img>` (pas d'input user dans les appelants)
- [x] 3.7 — Scénario 20 ajouté à `tests/smoke.js` : valide registry complet, chargement PNG, modale, fallback emoji, setBattleLog innerHTML
- [x] 3.8 — Capture `_phase3_modal.png`. 21/21 scénarios passent.

### Phase 4 — Items (~30 PNG)
Chaque entrée de `ITEMS[]` reçoit son PNG. Idem : `getItemIconHtml(itemId)`.

### Phase 5 — Char icons (5 PNG, 32×32)
`harry_icon.png`, `hermione_icon.png`, `celeste_icon.png`, `iris_icon.png`, `maxence_icon.png`.
Mini-portraits stylisés (utilisés là où `c.icon` apparaît, ex. logs combat).

## Critères de succès globaux
- `node tests/smoke.js` passe à 100% (smoke audit ajouté : aucun caractère emoji UTF-8 dans le DOM rendu).
- Capture comparative avant/après par phase, stockée dans `img/icons/_phaseN_*.png`.
- Plan de ce fichier coché à mesure.

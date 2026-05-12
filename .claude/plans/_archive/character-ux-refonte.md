# Plan — Refonte UX Personnage + Crit/Esquive

Branche : `claude/character-paper-doll-and-crit`

> Inspiré d'une référence RPG mobile fournie par l'utilisateur (paper doll
> central + slots en couronne + stats détaillées à gauche).

**Statut** : Iter A + Iter B livrées ; Iter C reportée (V2). Reste : commit + push + PR.

---

## 0. Décisions

- **Itération unique** : Iter A (paper doll) + Iter B (crit/esquive) dans la même PR mais 2 commits séparés.
- **Iter C** (fusion inventaire/personnage) reportée — out of scope V1.
- **Pas de mockup préalable** : on code directement, le smoke + l'inspection manuelle valideront.

## 1. Iter A — Paper doll central

### 1.1 CSS (`css/style.css`)
- [ ] **A.1** Nouveau bloc `.char-modal-grid` : `display:grid; grid-template-columns: 180px 1fr 180px; gap:14px`. Repli `@media (max-width:700px)` → 1 colonne stack vertical.
- [ ] **A.2** `.char-stats-panel` : ul-like, ligne par stat (icône + label + valeur).
- [ ] **A.3** `.paper-doll` : conteneur 240×320px (mobile : 100% × 280px), positioning relatif. Image perso `imgSrc` 180×220px centrée.
- [ ] **A.4** `.equip-slot-floating` : carré 44×44 avec cadre or, position absolue. 11 emplacements définis en pixels (4 gauche, 4 droite, 1 wand bas-gauche, 1 trinket bas-droite, 1 belt bas-centre).
- [ ] **A.5** `.gold-banner` : encart proéminent sous le paper doll (icône or + valeur en grand).

### 1.2 JS (`js/ui.js`)
- [ ] **A.6** Refonte `openCharacter(charIdx)` : génère HTML 3 colonnes au lieu de l'empilement vertical actuel.
- [ ] **A.7** Helper `_renderEquipSlotFloating(slot, c)` : retourne `<div class="equip-slot-floating equip-slot-${slot}" title="...">[icon]</div>`. Click → ouvre menu pour déséquiper (futur).
- [ ] **A.8** Helper `_renderStatLine(icon, label, value)` factorisé pour la liste stats.
- [ ] **A.9** Conserver les onglets Harry / Hermione (déjà présents).
- [ ] **A.10** Conserver section "SORTS CONNUS" (placement à valider — peut-être en panneau droit).

### 1.3 Vérification
- [ ] **A.V** `node tests/smoke.js` reste vert (le smoke existant interroge les stats par leurs noms — inchangés).
- [ ] **A.M** Ouvrir manuellement, vérifier que les 11 slots s'affichent autour du perso, équiper un item → la slot reflète.

## 2. Iter B — Crit + Esquive

### 2.1 Nouvelles stats (`js/inventory.js — recalculateStats()`)
- [ ] **B.1** `c.critChance` = `Math.min(25, 5 + c.lck * 0.5)` (5–25 %).
- [ ] **B.2** `c.dodgeChance` = `Math.min(20, 5 + c.agi * 0.4)` (5–20 %).
- [ ] **B.3** `c.critMultiplier` = `1.5` (constant V1, tine si épée légendaire en V2).
- [ ] **B.4** Bonus optionnels venant de l'équipement : `bonusCritChance`, `bonusDodgeChance` (préparé hors-scope V1 §11 du plan equipment — laissé en stub).

### 2.2 Câblage combat (`js/battle.js`)
- [ ] **B.5** `executeAttack()` (et son équivalent dans `castSpellInBattle`) : après calcul `dmg`, roll `Math.random() < c.critChance / 100`. Si crit, `dmg = Math.floor(dmg * c.critMultiplier)`, log `💥 Critique !`.
- [ ] **B.6** `enemyTurn()` : pour chaque attaque ennemie, roll `Math.random() < target.dodgeChance / 100`. Si esquive, `dmg = 0` + log `💨 Esquive !`.
- [ ] **B.7** UX : si `window.UX`, `floatDmg(key, dmg, 'crit')` ou `'dodge'` (nouveaux types — vérifier que ux-improvements.js gère, sinon fallback `'good'`/`'miss'`).

### 2.3 Affichage (`js/ui.js — openCharacter()`)
- [ ] **B.8** Ajouter dans le panneau stats : "Critique" `${c.critChance}%`, "Esquive" `${c.dodgeChance}%`.

### 2.4 Smoke (`tests/smoke.js`)
- [ ] **B.9** Nouveau scénario `scenarioCritDodge` (T1 : critChance/dodgeChance présents avec valeurs cohérentes ; T2 : 100 rolls crit avec LCK=15 → on doit observer une fréquence ≈12.5% ± marge ; T3 : esquive idem AGI=12).

## 3. Doc + clôture

- [ ] **C.1** `CLAUDE.md` : section combat — ajouter mécaniques crit/esquive (formule + plage).
- [ ] **C.2** `CLAUDE.md` : resync compteurs (50 monstres au lieu de 36) — drift relevé en audit.
- [ ] **C.3** `CLAUDE.md` : section "Système d'équipement" — pointer la nouvelle modale 3 colonnes.
- [ ] **C.4** Cache-bust : bump versions de `ui.js`, `style.css`, `inventory.js`, `battle.js`, `tests/smoke.js`.
- [ ] **C.5** Commit Iter A + commit Iter B + push.
- [ ] **C.6** Ouvrir PR.

---

## Critères globaux

1. La modale Personnage ressemble à l'image de référence (3 colonnes, paper doll central, slots autour).
2. Crit/esquive observable en jeu (logs + animations) avec stats reliés à LCK/AGI.
3. Smoke vert.
4. Pas de régression du `#inventory-modal` séparé (toujours utilisable).

## Hors-scope (V2+)

- Onglets fusion personnage/sac/sorts/quotes (Iter C).
- Click-to-unequip directement depuis paper doll.
- Bonus crit/dodge depuis l'équipement (prep B.4 en stub seulement).
- Crit multiplier custom par arme (tine selon épée légendaire / wand_elder).

---

## Journal

| Date | Étape | Statut | Notes |
|------|-------|--------|-------|
| 2026-05-10 | Plan rédigé | ✅ | Décision : Iter A + B dans 1 PR, 2 commits ; Iter C reportée. |
| 2026-05-10 | Iter A — Paper doll | ✅ | A.1–A.5 (CSS) : `.char-modal-grid` 3 colonnes, `.paper-doll`, `.equip-slot-floating` (11 positions absolues), `.gold-banner`, repli mobile. A.6–A.10 (JS) : `openCharacter()` refondu, helpers `_renderPaperDollSlot`/`_renderStatLine`, `EQUIP_SLOT_LABELS_MAP` exposé. T6 du smoke (scénario 22) adapté à la nouvelle structure (`.equip-slot-floating` + classes `equip-slot-<id>` + tooltips). Capture desktop+mobile validée. Renommé "Magie" PM → "Mana" pour lever l'ambigüité. |
| 2026-05-10 | Iter B — Crit + Esquive | ✅ | B.1–B.4 : `recalculateStats()` calcule `critChance` (5–40 %, base 5+lck*0.5), `dodgeChance` (5–35 %, base 5+agi*0.4), `critMultiplier` (1.5). Bonus optionnels `bonusCritChance`/`bonusDodgeChance` lus depuis l'équipement (préparé V2, aucun item ne les porte). B.5 : `executeAttack` utilise `char.critChance` au lieu de l'ancien hardcode `< char.lck`. B.6 : nouveau cas dans `enemyTurn` qui roll esquive après Protego mais avant les dégâts ; log `💨 esquive`. B.8 : modale Personnage ajoute lignes "Critique" et "Esquive" en stats dérivées (couleur or-light). B.9 : nouveau scénario smoke 26 (5 sub-tests : stats existent et plages cohérentes, monter LCK augmente crit, modale affiche %, 200 rolls @20% donnent 20–80 crits, esquive 100 % annule l'attaque). 32 scénarios verts. |

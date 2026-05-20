# Plan — HUD V2 : statuts dédiés + tooltip riche + animations

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au démarrage : **non démarré** — items hors-scope V2 d'`hud-statuses-equipment.md` (archivé PR #101).
> Pré-requis : V1 livrée (statuts réels en combat + mini-équipement party-card).

## 1. Contexte

`hud-statuses-equipment.md` (archivé) a livré V1 : weaken devient un
vrai statusEffect (durée + badge + restauration auto), 5 monstres
enrichis avec abilities `status` (burn/poison/bleed), badge Protego sur
allié, mini-équipement party-card (3 cellules wand/body/amulet).

Plusieurs polishing reportés explicitement V2 :

| Item | Source |
|------|--------|
| Icône PNG dédiée pour `weaken` (vs emoji `🛡️↓`) | `hud-statuses-equipment.md §2.3` |
| Pictogramme Protego dédié (vs réutilisation icône Bouclier item) | idem |
| Refonte formule weaken : cumul vs replace | idem |
| Statuts duo (cas où chaque allié a son propre stack) | idem |
| Tooltip riche au survol mini-équipement party-card | idem |
| Animation badge (apparition + tick d'expiration) | idem |

## 2. Vagues

### Vague A — Sprites dédiés des statuts (priorité moyenne)

**Pourquoi en premier** : la cohérence visuelle des badges est un
gain rapide. Aujourd'hui mix emoji/PNG (incohérent).

**Cibles** :
- `weaken` : actuel `🛡️↓` → PNG dédié (bouclier brisé orangé).
- `protego` : actuel emoji → PNG dédié (bouclier doré pulsant).
- `burn` : déjà PNG ? → vérifier.
- `poison` : déjà PNG ? → vérifier.
- `bleed` : déjà PNG ? → vérifier.

**Pipeline** : utiliser `tools/icon_factory.py` ou créer manuellement
des SVG inline dans `js/item-icons.js — STATUS_ICON_REGISTRY`.

**Vérification** : ouvrir le jeu, équiper Protego, capturer le badge
en combat. Comparer visuellement avant/après.

### Vague B — Refonte formule weaken (cumul vs replace, priorité haute)

**Spec actuelle** : `weaken` est appliqué via `applyStatus` avec
`power` qui réduit `c.def` de manière temporaire. Si appliqué
plusieurs fois, **replace** la durée mais ne **cumule pas** la
réduction.

**Spec V2 — proposition** :
- Cumul possible jusqu'à 3 stacks (`statusEffect.stacks`).
- Réduction = `power × stacks`.
- Au tick d'expiration, retire **1 stack** (vs retirer tout).
- Affichage badge : `🛡️↓×2` si 2 stacks.

**Risque** : un boss à `chance: 0.5` qui weaken 2 fois en 2 tours
réduit DEF de 50 % → death spiral. Mitigation : cap à 3 stacks +
durée fixe par stack (3 tours indépendants).

**Smoke** : `scenarioWeakenStacks` :
- T1 : 1 weaken → -3 DEF.
- T2 : 2 weaken → -6 DEF.
- T3 : tick expiration premier → -3 DEF restauré, reste 1 stack.

### Vague C — Statuts duo (faible risque, déjà câblé)

**Spec** : aujourd'hui `#status-slot-0` affiche les statuts de Harry,
`#status-slot-1` ceux de Hermione. Vérifier que :
- Ennemi peut cibler Hermione spécifiquement.
- Hermione peut Protego pour elle-même (déjà géré ?).
- Si un sort cible « groupe », statuts s'appliquent aux 2 alliés.

**Vérification** : `scenarioDuoStatuses` :
- Cast Protego par Hermione → `shieldTurns[1]` à 2.
- Détraqueur cible Harry avec `weaken` → `harry.statusEffects` non
  vide, `hermione.statusEffects` vide.

### Vague D — Tooltip riche mini-équipement party-card

**Spec actuelle** : les 3 cellules (wand/body/amulet) sont cliquables
mais sans tooltip au survol. Hovering = silence.

**Spec V2** :
- `data-tooltip` sur chaque cellule, géré par `UX.showTooltip`.
- Contenu : nom item + rareté + bonus (`+2 ATK, +1 LCK`) + sort
  enseigné si `grantsSpell`.
- Slot vide : tooltip « Slot libre » + slot icon générique.

**Implémentation** : étendre `_updateOneCharCard` (ui.js) pour set
`data-tooltip` sur chaque `.party-equip-slot`.

### Vague E — Animations badge (apparition + expiration)

**Spec V2** :
- Apparition badge : fade-in + scale 0 → 1 (200 ms cubic-bezier).
- Expiration : flash rouge avant de disparaître (300 ms).
- Tick : pulse subtil à chaque décrément de durée.

**CSS** : nouvelles classes `.status-badge-enter`, `.status-badge-exit`,
`.status-badge-tick`. Add/remove via `renderStatusBadges`.

## 3. Étapes

- [x] Vague A — capturer screenshots des badges.
      → captures `.claude/mockups/status-v2a-{combat-full,party-cards}.png`
- [x] Vague A — générer 2 PNG (weaken + protego) + intégrer.
      → `tools/gen_status_icons.py` étendu (Pillow procédural, 48×48,
        cohérent gel/burn/poison/bleed). `weaken.png` = bouclier brisé
        violet, `protego.png` = bouclier doré + sigil étoile + halo.
        Enregistrés dans `STATUS_ICON_REGISTRY` (`js/item-icons.js`).
        Badge Protego (hardcodé dans `battle-ui.js`) bascule de l'emoji
        🛡️ vers `getStatusIconHtml('protego')`. Bordure de la pill
        passée de `#3498db` (bleu) à `#c9a84c` (or) pour cohérence avec
        le PNG.
- [x] Vague A — vérifier les 4 PNG existants (burn/poison/bleed/gel) OK.
      → présents (1.4–3.6 KB), style cohérent. weaken DoT loop les
        utilise déjà via le registre. Aucune modif nécessaire.
- [x] Vague A — commit + push.
- [x] Vague B — étendre `STATUS_DEFS.weaken` avec `maxStacks: 3`.
- [x] Vague B — refondre `applyStatus` pour gérer stacks.
      → renvoie désormais `true` si nouvel "instance" appliqué (création
        ou stack supplémentaire), `false` si refresh seul (cap atteint).
        Comportement non-empilable (sans `maxStacks`) inchangé. Champ
        `maxTurns` stocké à la 1ʳᵉ pose pour reset à l'expiry d'un stack.
- [x] Vague B — refondre `tickStatuses` pour décrémenter 1 stack à l'expiry.
      → à `turns === 0` : restaure +power, `stacks--`, `turns = maxTurns`,
        et garde le statut dans `remaining` si stacks ≥ 1.
- [x] Vague B — patch cast `weaken` côté `battle-spells.js` : applique
      le malus DEF seulement si `applyStatus` a renvoyé `true` (sinon
      "résiste à l'affaiblissement" pour signaler le cap atteint).
- [x] Vague B — patch `renderStatusBadges` pour afficher `×N` (Cinzel, fond or)
      quand `s.stacks > 1`. Tooltip enrichi : `−9 DEF (3 stacks)`. CSS
      `.status-pill-stack`.
- [x] Vague B — smoke `T5 weaken stacks` ajouté dans le scénario 2bis.
      Couvre 3 casts (1→3 stacks, DEF 12→9→6→3), 1 cast refusé au cap
      (applied=false, DEF inchangée), 3 cycles d'expiry séquentiels
      (restaure 3 DEF par stack, retrait complet au dernier).
- [x] Vague B — commit + push.
- [x] Vague C — smoke `scenarioDuoStatuses` (vérifier câblage existant).
      → ajouté dans `tests/smoke.js` (5 tests : T1 Protego H., T2 Protego
        Harry, T3 weaken cible Harry, T4 burn sur Hermione, T5 stacks
        isolés). Verrou contre régression future si quelqu'un introduit
        un raccourci « statuts groupe ».
- [x] Vague C — corriger éventuels bugs détectés.
      → aucun bug détecté. L'isolation est structurelle (statusEffects
        portés par l'objet perso, shieldTurns indexé par charIdx).
        Aucune modif de code de prod.
- [x] Vague D — tooltip riche au survol des slots party-card.
      → 5ᵉ branche ajoutée à `attachTooltipDelegation` dans
        `ux-improvements.js` : détecte `.party-equip-slot`, lit
        `equip-row-${idx}` → `party[idx].equipped[slotName]`, appelle
        `showTooltip(itemTooltip(item))` ou `emptySlotTooltip(slotName)`.
      → Nouvelle fonction `emptySlotTooltip(slotName)` (icône + label
        FR + helper « Équiper un objet depuis le sac »).
      → Pas de modif côté `ui.js` — le rendu de `equip-row` exposait
        déjà `data-slot` et la classe `.filled`.
- [x] Vague D — vérifier UX.showTooltip déclenché au survol.
      → Capture `.claude/mockups/status-v2d-tooltip.png` : tooltip riche
        au survol de la cellule wand de Harry (« Baguette de Sureau ·
        Attaque +5 · Magie +5 · Valeur 300 🪙 »).
- [x] Vague D — smoke `scenarioPartyEquipRow` T4 ajouté (slot rempli +
      slot vide → tooltip distinct dans chaque cas).
- [x] Vague D — commit + push.
- [ ] Vague E — animations CSS + classes ajoutées via JS.
- [ ] Vague E — vérification visuelle (pas de smoke pour l'animation).
- [ ] Vague E — commit + push.

## 4. Risques

- Vague B : death spiral si max stacks mal cappé → cap dur à 3 + cap
  réduction DEF à 60 %.
- Vague E : animations trop intrusives → option pour les désactiver
  (`localStorage.hud_animations = 'off'`).

# Plan — HUD statuts réels + mini-équipement party-card

> Plan vivant (cf. `.claude/guidelines.md` §5). Cocher les étapes au fur et à mesure.
> Branche : `claude/hud-statuses-equipment-icons` (depuis master post-PR #100).

## 1. Contexte

Le #2 du top-10 d'origine était « afficher pictogrammes de statut +
icônes équipement dans le HUD ». Audit du master révèle :

| Composant | État | Constat |
|-----------|------|---------|
| `STATUS_ICON_REGISTRY` + `getStatusIconHtml()` | ✅ existe | `js/item-icons.js:151,283` |
| `renderStatusBadges(target)` | ✅ existe | `js/battle-ui.js:30` |
| `#status-slot-0/1` HTML | ✅ existe | `index.html:246,266` |
| Câblage `_updateOneCharCard()` | ✅ existe | `js/ui.js:144` |
| CSS `.status-row` / `.status-pill` | ✅ existe | `css/style.css:2011,2018` |
| Paper-doll modale avec icônes | ✅ existe | `js/ui.js:261` (`_renderPaperDollSlot`) |
| Party-card affichant l'équipement texte | ❌ retiré | n'affiche plus que portrait + barres + status |

**Mais** : aucun statut ne s'applique jamais aux alliés en pratique.
- `applyStatus(...)` n'est appelée que sur les ennemis
  (battle-spells.js:126, par les sorts joueur)
- Capacités ennemies (battle-spells.js:7-61) = damage / heal / weaken / drain
  → aucune n'applique `burn` / `poison` / `bleed`
- `weaken` modifie `target.def` directement, sans durée ni badge
- Protego (`shieldTurns`) actif → invisible aussi (aucun badge)

## 2. Objectifs

A. **Tranche A — Statuts réels en combat.** Faire que les badges
   `#status-slot-0/1` soient effectivement visibles en jeu. Convertir
   `weaken` en `statusEffect` (durée + badge + restauration auto),
   ajouter 4-5 capacités ennemies de type `status` (burn / poison /
   bleed), et exposer Protego comme badge sur l'allié.

B. **Tranche B — Mini-équipement party-card.** Ajouter une bande
   compacte de 3 icônes (arme + armure + amulette) sous les barres
   PV/PM, pour redonner de l'info équipement sur le HUD sans
   surcharger.

## 3. Contraintes

| # | Contrainte |
|---|-----------|
| C1 | Aucune régression de combat (smoke test vert avant push) |
| C2 | Saves legacy compatibles : nouveaux champs (`statusEffects` côté alliés) init à `[]` par défaut |
| C3 | Pas de nouvelle dépendance |
| C4 | Tooltip / dimension cohérente avec les badges existants |
| C5 | Pas de re-recalculation lourde — recycler `recalculateStats()` à la fin du combat suffit |

## 4. Conception détaillée

### Tranche A — Statuts réels

#### A1. Étendre `STATUS_DEFS` avec `weaken`

Dans `js/battle.js:14`, ajouter :
```js
weaken: { icon: '🛡️↓', label: 'Affaiblissement DEF', color: '#9b59b6' }
```
(Émoji composite — fallback dans `STATUS_ICON_REGISTRY` plus tard si
on veut un PNG dédié. V1 reste sur l'emoji.)

#### A2. Convertir l'ability `weaken` (battle-spells.js:42)

**Avant** :
```js
case 'weaken': {
  target.def = Math.max(0, target.def - ability.power);
  // …
}
```

**Après** :
```js
case 'weaken': {
  // statusEffect typé : applyStatus stocke power et turns ; le tick
  // décrémente turns et restaure DEF à expiry.
  const turns = ability.turns || 3;
  applyStatus(target, 'weaken', ability.power, turns);
  target.def = Math.max(0, target.def - ability.power);
  appendLog(`${ability.icon} ${enemy.name} — ${ability.name} : ${target.name} perd ${ability.power} DEF (${turns} tours) ! `);
  UX_safe.logCombat(`${ability.icon} ${enemy.name} affaiblit ${target.name} : −${ability.power} DEF / ${turns} tours`, 'bad');
  break;
}
```

#### A3. Étendre `tickStatuses()` pour restaurer DEF à l'expiration de `weaken`

Dans `js/battle.js:32`, le tick actuel applique des dégâts persistants
mais ne sait pas restaurer une stat. Modification :
```js
function tickStatuses(target, isEnemy) {
  if (!target || !target.statusEffects || !target.statusEffects.length) return '';
  let log = '';
  const remaining = [];
  target.statusEffects.forEach(s => {
    // Statuts DoT (burn/poison/bleed) : dégâts par tour
    if (s.id === 'burn' || s.id === 'poison' || s.id === 'bleed') {
      let dmg = s.power;
      if (isEnemy && target.resist?.includes(s.id)) dmg = Math.floor(dmg * RESIST_MULTIPLIER);
      if (isEnemy && target.weak?.includes(s.id))   dmg = Math.floor(dmg * WEAK_MULTIPLIER);
      dmg = Math.max(1, dmg);
      if (isEnemy) target.currentHp = Math.max(0, target.currentHp - dmg);
      else        target.hp         = Math.max(0, target.hp         - dmg);
      log += `${s.icon} ${target.name} subit ${dmg} (${STATUS_DEFS[s.id].label}). `;
      const key = isEnemy ? `enemy:${enemyGroup.indexOf(target)}` : 'ally';
      UX_safe.floatDmg(key, dmg, 'dmg');
      UX_safe.logCombat(`${s.icon} ${target.name} : <b>−${dmg}</b> (${STATUS_DEFS[s.id].label})`, 'bad');
    }
    // Statut weaken : pas de dégâts, juste décrément des tours
    // (le malus DEF est déjà appliqué au moment de applyStatus)
    s.turns--;
    if (s.turns > 0) {
      remaining.push(s);
    } else if (s.id === 'weaken') {
      // Expiration → restaurer la DEF perdue
      target.def += s.power;
      log += `${STATUS_DEFS[s.id].icon} ${target.name} récupère sa défense. `;
      UX_safe.logCombat(`${STATUS_DEFS[s.id].icon} ${target.name} récupère ${s.power} DEF`, 'magic');
    }
  });
  target.statusEffects = remaining;
  return log;
}
```

#### A4. Ajouter capacités `status` à des monstres

Au passage on enrichit le bestiaire avec quelques abilities de statut,
pour rendre les badges réellement utiles. **5 monstres ciblés** :

| Monstre (id) | Ability ajoutée | Effet |
|--------------|-----------------|-------|
| `acromantule_jeune` | Morsure Venimeuse | poison, power 4, chance 0.30, turns 3 |
| `inferius` | Griffes Putrides | bleed, power 3, chance 0.25, turns 3 |
| `kappa_douves` | Crachat Acide | burn, power 3, chance 0.20, turns 2 |
| `mangemort_elite` | Marque Brûlante | burn, power 5, chance 0.25, turns 3 |
| `bellatrix` | Sortilège Sanglant | bleed, power 6, chance 0.30, turns 3 |

**Patch** dans `js/battle-spells.js — tryEnemyAbility()` : ajouter
`case 'status'` :
```js
case 'status': {
  // ability = { name, icon, effect:'status', statusId, power, chance, turns }
  applyStatus(target, ability.statusId, ability.power, ability.turns || 3);
  appendLog(`${ability.icon} ${enemy.name} — ${ability.name} → ${target.name} subit ${STATUS_DEFS[ability.statusId].label} ! `);
  UX_safe.logCombat(`${ability.icon} ${enemy.name} inflige ${STATUS_DEFS[ability.statusId].label} à ${target.name}`, 'bad');
  break;
}
```

Et dans `monsters.js`, ajouter l'entrée ability concernée à chaque
monstre cible. Exemple Acromantule :
```js
abilities: [
  { name: "Trame Soyeuse",    icon: "🕸️", effect: "weaken", power: 2, chance: 0.25 },
  { name: "Morsure Venimeuse",icon: "🦂", effect: "status", statusId: "poison", power: 4, chance: 0.30, turns: 3 }
]
```

#### A5. Badge Protego visible sur allié

`renderStatusBadges(c)` reçoit déjà la cible. On enrichit la fonction
pour qu'elle ajoute, après les statusEffects, un badge virtuel si
`c === party[i] && shieldTurns[i] > 0`.

Patch dans `js/battle-ui.js — renderStatusBadges()` :
```js
function renderStatusBadges(target) {
  const parts = [];
  if (target && target.statusEffects && target.statusEffects.length) {
    parts.push(...target.statusEffects.map(s => { … })); // existant
  }
  // Bonus : badge Protego pour les alliés (basé sur shieldTurns)
  if (typeof party !== 'undefined' && typeof shieldTurns !== 'undefined') {
    const idx = party.indexOf(target);
    if (idx === 0 || idx === 1) {
      const t = shieldTurns[idx] || 0;
      if (t > 0) {
        parts.push(`<span class="status-pill" style="border-color:#3498db" title="Protego (${t}/tour)">🛡️${t}</span>`);
      }
    }
  }
  if (!parts.length) return '';
  return '<div class="status-row">' + parts.join('') + '</div>';
}
```

Pour rafraîchir le badge à chaque changement de `shieldTurns`, ajouter
un `updateUI()` (qui déclenche `_updateOneCharCard`) après chaque
mutation de `shieldTurns[i]` (cf. les call-sites dans battle.js).

### Tranche B — Mini-équipement party-card

#### B1. Schéma HTML party-card

Modifier `index.html:230-247` et `:250-267` pour insérer une rangée
juste avant `#status-slot-X` :
```html
<div class="party-equip-row" id="equip-row-0">
  <span class="party-equip-slot" data-slot="wand"></span>
  <span class="party-equip-slot" data-slot="body"></span>
  <span class="party-equip-slot" data-slot="amulet"></span>
</div>
```

Idem pour `equip-row-1`.

#### B2. Câblage JS

Dans `js/ui.js — _updateOneCharCard()` (à la fin), ajouter :
```js
const er = document.getElementById(`equip-row-${idx}`);
if (er) {
  ['wand', 'body', 'amulet'].forEach((slot, i) => {
    const cell = er.querySelector(`.party-equip-slot[data-slot="${slot}"]`);
    if (!cell) return;
    const item = c.equipped && c.equipped[slot];
    if (item) {
      cell.innerHTML = getItemIconHtml(item, 'ui-icon-sm');
      cell.title = `${item.name} (${slot})`;
      cell.classList.add('filled');
    } else {
      cell.innerHTML = getEquipmentSlotIconHtml(slot, 'ui-icon-sm');
      cell.title = `${slot} : vide`;
      cell.classList.remove('filled');
    }
  });
}
```

#### B3. CSS

Dans `css/style.css`, ajouter :
```css
.party-equip-row {
  display: flex;
  gap: 4px;
  margin: 4px 0 2px 0;
  justify-content: flex-start;
}
.party-equip-slot {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #2a1a08;
  border-radius: 3px;
  background: rgba(0,0,0,0.2);
  opacity: 0.55;
}
.party-equip-slot.filled {
  opacity: 1;
  border-color: var(--gold);
}
.party-equip-slot img {
  width: 14px;
  height: 14px;
}
```

#### B4. Pas d'action au clic en V1

Lecture seule. Si on veut un clic plus tard → ouverture de la fiche
perso (`openCharacter(idx)`). Hors scope V1.

## 5. Découpage en étapes

> Tranche A et B peuvent se faire dans la même PR (effort total ~3 h).

### Étape 1 — Tranche A1+A2+A3 : `weaken` comme statut
- [ ] Ajouter `weaken` à `STATUS_DEFS` dans `battle.js`
- [ ] Modifier `case 'weaken'` dans `battle-spells.js — tryEnemyAbility`
- [ ] Étendre `tickStatuses()` pour gérer DoT vs decrement-only + restauration DEF
- **Vérif** : déclencher un weaken via console → badge violet visible avec durée, DEF du joueur réduite, après 3 ticks → badge disparaît, DEF restaurée.

### Étape 2 — Tranche A4 : capacités status sur monstres
- [ ] Ajouter `case 'status'` dans `tryEnemyAbility`
- [ ] Étendre `abilities` de 5 monstres dans `monsters.js` (acromantule_jeune, inferius, kappa_douves, mangemort_elite, bellatrix)
- **Vérif** : combat contre acromantule_jeune simulé → poison apparaît parfois sur l'allié (rng), badge visible, tick fait dégâts persistants.

### Étape 3 — Tranche A5 : badge Protego
- [ ] Patch `renderStatusBadges()` dans `battle-ui.js`
- [ ] Ajouter `updateUI()` post-mutation `shieldTurns` (~3 sites dans battle.js)
- **Vérif** : caster Protego → badge 🛡️2 sur l'allié → après 1 tour ennemi → 🛡️1 → 0 → disparu.

### Étape 4 — Tranche B : mini-équipement party-card
- [ ] HTML : ajouter `.party-equip-row` dans index.html (deux cartes)
- [ ] JS : `_updateOneCharCard` peuple les slots
- [ ] CSS : `.party-equip-row` + `.party-equip-slot` dans style.css
- **Vérif** : 3 icônes apparaissent sous PV/PM, refletent l'équipement actuel. Slot vide → icône grisée. Equiper un item → maj live.

### Étape 5 — Smoke tests
- [ ] `scenarioWeakenStatus` : trigger weaken via applyStatus → assert badge présent, DEF réduite, après tick→ DEF restaurée
- [ ] `scenarioPartyEquipRow` : équiper un wand → DOM `.party-equip-slot[data-slot=wand]` doit avoir `.filled`
- [ ] `node tests/smoke.js` vert

### Étape 6 — Commit & push
- [ ] Commits scopés (par tranche idéalement)
- [ ] Push sur `claude/hud-statuses-equipment-icons`
- [ ] Vérifier état de la PR éventuelle avant chaque push

## 6. Ce qui ne change pas (sanity)

- Pas de nouveau global, pas de nouvelle dépendance.
- `recalculateStats()` reste l'ancre de fin de combat — toute DEF
  réduite par weaken est restaurée *aussi* via le recalc à `endBattle`
  (double sécurité).
- Saves legacy : `c.statusEffects` (alliés) déjà init à `[]` par
  battle.js:102 ; pas de migration.
- Si un monstre n'a pas `turns` dans son ability `status`/`weaken`,
  fallback 3.

## 7. Hors-scope

- Icône PNG dédiée pour weaken (V2)
- Pictogramme Protego dans le STATUS_ICON_REGISTRY (V2)
- Refonte de la formule weaken (cumulable vs replace) (V2)
- Statuts sur autres allies en duo (déjà couvert automatiquement par
  `party[idx]` check)
- Tooltip riche au survol des party-equip-slot (V2)
- Animation d'apparition du badge (V2)

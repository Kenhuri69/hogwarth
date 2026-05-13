# Plan — Action « Garde » + sort de soutien duo (Ferula)

> Plan vivant (cf. `.claude/guidelines.md` §5). Cocher les étapes au fur et à mesure.
> Statut au démarrage : non implémenté.
>
> **Source** : top-10 d'audit, point #6 — « Profondeur tactique solo et duo ».
> Estimation utilisateur : ~2h.

## 1. Contexte

### 1.1 État actuel du combat

Menu d'action en combat (`index.html:384-387`) : **4 actions** seulement,
hardcodées :

```
🗡️ Attaquer  |  ✨ Sortilège  |  🧪 Objet  |  💨 Fuir
```

Toutes les autres mécaniques (bouclier, soin) passent par des **sorts à
coût PM**. Conséquence : si Harry est à sec de PM mid-combat, il n'a
plus que « Attaquer » comme choix utile — pas de profondeur tactique.

### 1.2 Frameworks existants à réutiliser

| Système | Localisation | Réutilisation |
|---------|--------------|---------------|
| `shieldTurns: [0, 0]` | `state.js`, `battle.js:319` | Modèle pour un buff temporaire indexé `charIdx`. Sauvegardé déjà via `_serializeState`. |
| `applyStatus / tickStatuses / STATUS_DEFS` | `battle.js:17-68` | Framework de statuts persistants (DoT burn/poison/bleed + buff weaken). Extensible à des statuts heal-over-time. |
| `SPELLS[]` + `SPELL_HANDLERS` (dispatch par `effect`) | `data.js:109`, `battle-spells.js:206` | Ajout d'un sort = 1 ligne dans SPELLS + 1 handler dans `battle-spells.js`. |
| `executeAttack` → `getActiveChar` → `advanceBattleChar` | `battle.js:223+` | Le cycle de tour est uniforme : une action consomme le tour du perso actif. |
| Apprentissage de sort par niveau | `battle.js — checkLevelUp` | Table de progression par perso (Harry / Hermione). Ajout trivial. |

### 1.3 Objectif

Apporter **deux** leviers tactiques nouveaux :

1. **Action « Garde »** — gratuite, sans PM, accessible **à chaque tour**.
   Atténue les dégâts subis le tour ennemi suivant et régénère un peu de
   PM. Combo : permet de « tenir » un tour sans gaspiller un Protego.

2. **Sort « Ferula »** — sort de soutien canon HP (utilisé par Lupin sur
   Ron dans *PoA*). Soin différé sur 3 tours, ciblable sur un allié (ou
   soi-même). En duo : choix tactique entre auto-soin et soin partenaire.
   En solo : soin étalé qui complète Episkey (burst) sans le remplacer.

## 2. Conception

### 2.1 Action « Garde »

**Sémantique** : « Je couvre, je récupère. »

| Aspect              | Valeur                                                        |
|---------------------|---------------------------------------------------------------|
| Coût                | Aucun (action de base)                                        |
| Durée               | 1 tour ennemi (jusqu'au prochain tour du perso)               |
| Effet défensif      | Dégâts physiques reçus × 0.5 ; mitigation **après** Protego (Protego prioritaire si actif) |
| Effet offensif      | Aucun                                                         |
| Effet utilitaire    | +`3 + floor(MAG / 5)` PM au moment de l'action (cap `spMax`). Harry L1 ≈ 5, Hermione L1 ≈ 6, end-game ≈ 6–8. Différencie naturellement caster / non-caster. |
| Stack avec Protego  | Oui — Protego absorbe complètement, Garde mitige le résiduel (en pratique : Protego d'abord, Garde ne sert qu'aux tours sans bouclier) |
| Crit ennemi         | Pas pris en compte V1 (le moteur n'a pas de crit ennemi). N/A. |
| Esquive             | Inchangée (`dodgeChance` agit avant la mitigation Garde)      |

**État** : `guardTurns: [0, 0]` dans `state.js` — pattern identique à
`shieldTurns`. Décrément en début de tour du perso (pas en début de tour
ennemi — on veut que la garde dure exactement le tour d'attaque ennemi
qui suit l'action).

**Cycle** :
```
Harry choisit Garde → guardTurns[0] = 1, sp += 3, log "🛡️ Harry se met en garde."
advanceBattleChar()
... tour Hermione (si duo) ...
enemyTurn()
  → ennemi attaque Harry
  → si shieldTurns[0] > 0  : Protego absorbe (existant)
  → sinon si guardTurns[0] > 0 : dmg = floor(dmg / 2), log "🛡️ Harry mitige : −X (au lieu de −Y)"
  → guardTurns décrémenté au prochain advanceBattleChar de Harry
```

**Décrément** : à placer dans `advanceBattleChar` ou en début de
`battleAction` du nouveau tour de Harry, pas en fin de `enemyTurn`. On
veut que `guardTurns[0]` reste à 1 pendant tout le segment ennemi.

### 2.2 Sort « Ferula »

**Lore** : sort de bandage et d'attelle (cité dans HP3, Lupin l'utilise
sur Ron blessé par Sirius). Idéal pour Hermione (rôle soutien) et le
duo.

| Aspect              | Valeur                                                        |
|---------------------|---------------------------------------------------------------|
| Coût                | 6 PM                                                          |
| Cible               | Allié (incluant soi-même) ; solo = auto-cible sur Harry       |
| Effet               | Soin instantané `4 + mag/2` + statut `regen` (4 PV/tour × 3 tours) |
| Cumul               | Si déjà sous `regen` : refresh durée à 3, garde power le plus haut (cf. `applyStatus`) |
| Niveau d'apprentissage | Hermione niveau 4 (entre Stupefix L3 et Diffindo L5) ; Harry niveau 6 |
| icon                | `🩹`                                                          |
| effect string       | `'support_regen'` (nouveau)                                   |

**Statut `regen`** à ajouter à `STATUS_DEFS` (`battle.js:17`) — c'est
l'inverse d'un DoT. `tickStatuses` est étendu pour ce cas :
```js
regen: { icon: '🩹', label: 'Régénération', color: '#3aa55a' }
// dans tickStatuses (branche allié) :
if (s.id === 'regen') {
  const heal = Math.min(target.hpMax - target.hp, s.power);
  target.hp += heal;
  log += `🩹 ${target.name} récupère ${heal} PV (Ferula). `;
  UX_safe.floatDmg('ally', heal, 'heal');
}
```

**Sélection de cible** :
- Solo (`partySize === 1`) : auto-cible sur Harry sans modal.
- Duo : modal `showTargetSelection('spell_ally', spellName)` listant
  les alliés vivants. Pattern miroir de la sélection d'ennemi existante.

### 2.3 Cohérence solo / duo

| Situation | Garde | Ferula |
|-----------|-------|--------|
| Solo (Harry seul) | Tour de récupération PM (+5 L1 → +6 L9) + mitigation 50 % sur un coup. Utile contre les abilities lourdes (drain, damage). | Auto-cible Harry. 12+ PV étalés sur 3 tours, complète Episkey (12 PV burst, 5 PM). À 6 PM, échange visible : 4 + reg vs 12 burst. |
| Duo (Harry + Hermione) | Hermione gagne +6 à +8 PM (MAG 16+) → pivote rapidement de tank passif à caster pleine main. Le perso KO-imminent gagne 1 tour de respit. | Choix tactique : Hermione Ferula Harry (le tank physique) pendant qu'elle attaque ou Garde le tour d'après. |

### 2.4 Hors-scope V1

- Pas de **counter-attack** sur Garde (réservé V2 — bonus selon LCK ?).
- Pas de bonus **stack** Garde + Garde sur 2 tours consécutifs.
- Pas d'abilities ennemies « anti-buff » qui dispel Ferula (V2).
- Pas de Ferula AOE (« Ferula Maxima » V2).
- Pas d'animation/effet visuel custom — réutilise les overlays UX
  existants (floatDmg `heal`, badge statut comme `burn`).

## 3. Contraintes

| # | Contrainte |
|---|-----------|
| C1 | `node tests/smoke.js` vert avant push. |
| C2 | `guardTurns` sérialisé / désérialisé dans save.js (idem `shieldTurns`). |
| C3 | Régression Protego : la prise de décision « si shieldTurns > 0 alors absorb » doit rester en priorité 1 — Garde n'intervient que si Protego inactif. |
| C4 | Le sort Ferula doit être enseignable via les 3 vecteurs existants (level-up table, spellbook, `grantsSpell` d'équipement). Pour V1, on câble **le level-up uniquement** ; le spellbook reste hors-scope. |
| C5 | Loader manifest : ajouter `guardTurns` (kind `obj`) si on veut le tracer. Pas critique mais cohérent avec `shieldTurns` si tracé. |
| C6 | Migration save legacy : une save sans `guardTurns` doit hydrater `[0, 0]` par défaut dans `_applyState`, pas crasher. |
| C7 | Texte `desc` de Ferula dans `SPELLS` doit mentionner la cible alliée (« sur un allié ») pour que le joueur comprenne la sélection de cible. |

## 4. Découpage en étapes

### Étape 1 — État + framework
- [ ] `state.js` : ajouter `let guardTurns = [0, 0];` à côté de `shieldTurns`.
- [ ] `state.js` (resetCombatState ou équivalent) : `guardTurns = [0, 0]` au début de chaque combat.
- [ ] `save.js — _serializeState` : sérialiser `guardTurns`.
- [ ] `save.js — _applyState` : restaurer `guardTurns = gs.guardTurns || [0, 0]`.
- [ ] `battle.js — STATUS_DEFS` : ajouter `regen: { icon: '🩹', label: 'Régénération', color: '#3aa55a' }`.
- [ ] `battle.js — tickStatuses` : ajouter la branche `regen` (heal, log, floatDmg `heal`).
- **Vérif** : depuis la console — `guardTurns[0] = 1; applyStatus(party[0], 'regen', 4, 3); tickStatuses(party[0], false)` → log de récup, +4 PV.

### Étape 2 — Action Garde
- [ ] `index.html` : ajouter `<button class="cmd-btn" onclick="battleAction('guard')">🛡️ Garde</button>` entre Sortilège et Objet (ordre : Attaquer / Sortilège / **Garde** / Objet / Fuir).
- [ ] `css/style.css` (media query mobile `≤700px`, à la suite de `body.in-battle .battle-actions`) — éviter l'orphelin sur la grille 2×2 actuelle. Passer à une grille **3+2** via `span` :
  ```css
  body.in-battle .battle-actions {
    grid-template-columns: repeat(6, 1fr);  /* 6 cols fines */
  }
  body.in-battle .battle-actions .cmd-btn:nth-child(1),
  body.in-battle .battle-actions .cmd-btn:nth-child(2),
  body.in-battle .battle-actions .cmd-btn:nth-child(3) {
    grid-column: span 2;   /* ligne 1 : Attaquer / Sortilège / Garde, 33 % chacun */
  }
  body.in-battle .battle-actions .cmd-btn:nth-child(4),
  body.in-battle .battle-actions .cmd-btn:nth-child(5) {
    grid-column: span 3;   /* ligne 2 : Objet / Fuir, 50 % chacun */
  }
  ```
  Hauteur totale inchangée (2 lignes × `min-height:56px` + gap). Touch targets ≥ 100 px (ligne 1) / ≥ 160 px (ligne 2) sur écran 360 px. Desktop : `flex-wrap: wrap` existant absorbe le 5ᵉ bouton sans modification.
- [ ] `battle.js — battleAction` : ajouter le cas `'guard'` :
  ```js
  if (action === 'guard') {
    const idx  = currentBattleChar;
    const c    = getActiveChar();
    guardTurns[idx] = 1;
    const pmTheo = 3 + Math.floor((c.mag || 0) / 5);
    const pmGain = Math.max(0, Math.min(pmTheo, c.spMax - c.sp));
    c.sp += pmGain;
    addMsg(`🛡️ ${c.name} se met en garde${pmGain ? ` (+${pmGain} PM)` : ''}.`, 'info');
    UX_safe.logCombat(`🛡️ ${c.name} se met en garde${pmGain ? ` (+${pmGain} PM)` : ''}`, 'magic');
    AudioSystem.playSpellCast('Protego');   // ré-use du son existant
    advanceBattleChar();
    return;
  }
  ```
- [ ] `battle.js — enemyTurn` (lignes ~319, après le check `shieldTurns`) : ajouter la mitigation Garde :
  ```js
  if (shieldTurns[charIdx] > 0) { /* existant Protego */ }
  else if (guardTurns[charIdx] > 0) {
    const dmg = Math.max(0, enemy.atk - target.def + Math.floor(Math.random() * 3));
    const mitigated = Math.max(0, Math.floor(dmg / 2));
    target.hp = Math.max(0, target.hp - mitigated);
    log += `🛡️ ${target.name} mitige : −${mitigated} (au lieu de −${dmg}). `;
    UX_safe.floatDmg('ally', mitigated, 'dmg');
    UX_safe.logCombat(`🛡️ ${target.name} mitige ${enemy.name} : <b>−${mitigated}</b>`, 'magic');
  } else if (Math.random() * 100 < (target.dodgeChance || 0)) { /* existant esquive */ }
  ```
- [ ] `battle.js — advanceBattleChar` : décrément `guardTurns[newIdx]` quand on revient sur un perso (en début de son tour).
- **Vérif** : démarrer un combat → Garde → ennemi attaque pour 10 dmg → seulement 5 reçus → message correct → tour suivant : guardTurns revient à 0.

### Étape 3 — Sort Ferula
- [ ] `data.js — SPELLS` : ajouter
  ```js
  { name: 'Ferula', icon: '🩹',
    desc: "Bande un allié (soin + régénération 3 tours)",
    cost: 6, effect: 'support_regen', power: 4 }
  ```
  Placer après Episkey dans la section « Sorts de base » pour cohérence
  visuelle de l'ordre.
- [ ] `battle-spells.js — _spellSupportRegen` : nouveau handler
  ```js
  function _spellSupportRegen(spell, char, _enemy, _enemyIdx, targetAllyIdx) {
    const ally = party[targetAllyIdx];
    if (!ally || ally.hp <= 0) return `${char.name} ne trouve pas de cible pour ${spell.name}.`;
    const burst = Math.min(ally.hpMax - ally.hp, spell.power + Math.floor((char.mag || 0) / 2));
    ally.hp += burst;
    applyStatus(ally, 'regen', spell.power, 3);
    const msg = `🩹 ${char.name} → ${ally.name} : ${spell.name} (+${burst} PV, regen 3 tours)`;
    addMsg(msg, 'good');
    UX_safe.floatDmg('ally', burst, 'heal');
    UX_safe.logCombat(msg, 'magic');
    return msg;
  }
  ```
- [ ] `SPELL_HANDLERS` : `support_regen: _spellSupportRegen`.
- [ ] `castSpellInBattle` : si `spell.effect === 'support_regen'`, **ne pas** ouvrir de sélection d'ennemi ; à la place :
  - solo : `_spellSupportRegen(spell, char, null, null, 0)`
  - duo : `showAllyTargetSelection(spell.name)` → second appel avec `targetAllyIdx`
- [ ] `battle-ui.js` : nouvelle fonction `showAllyTargetSelection(spellName)` miroir de `showTargetSelection` mais sur `party.slice(0, partySize).filter(c => c.hp > 0)`. Stocker `pendingSpell` et `pendingAllyTarget`.

### Étape 4 — Level-up table
- [ ] `battle.js — checkLevelUp` (table de sorts par niveau) :
  - Hermione niveau 4 → apprend `'Ferula'`
  - Harry niveau 6 → apprend `'Ferula'`
  - Mettre à jour le tableau récap dans CLAUDE.md à la fin (§Combat — Table de progression).
- **Vérif** : depuis la console — donner XP à Hermione jusqu'au niveau 4 → `party[1].spells.includes('Ferula') === true`.

### Étape 5 — Sérialisation regen
- [ ] `_serializeState` : `statusEffects` des personnages déjà sérialisé via `_serializeChar` ? À vérifier. Si non, ajouter `statusEffects: (c.statusEffects || []).slice()`. Sinon RAS.
- [ ] Smoke test pour vérifier que save → reload preserve un `regen` actif.

### Étape 6 — Smoke test
- [ ] Nouveau scénario `scenarioGuardAndFerula` dans `tests/smoke.js` :
  ```js
  async function scenarioGuardAndFerula() {
    console.log('\n── Scénario : Garde + Ferula ──');
    const { browser, page, errors } = await launchGame();
    await startNewGame(page, { partySize: 2, heroes: ['harry', 'hermione'], house: 'Gryffondor' });

    // T1 : déclencher un combat scripté
    await page.evaluate(() => {
      // Force un combat avec un seul ennemi prévisible
      startBattleWith?.([{ id: 'cornichon_cornouailles' }]);  // à adapter selon API existante
    });
    // sinon : marcher jusqu'au premier combat naturel

    // T2 : Garde — vérifier mitigation 50%
    const guardCheck = await page.evaluate(() => {
      const before = party[0].hp;
      battleAction('guard');
      // simuler 1 ennemi qui attaque pour 10
      enemyGroup[0].atk = 10; party[0].def = 0;
      enemyTurn();
      return { delta: before - party[0].hp, guard: guardTurns[0] };
    });
    assert(guardCheck.delta <= 6, `Garde n'a pas mitigé : −${guardCheck.delta}`);

    // T3 : Ferula en duo — cible Hermione, regen actif
    const ferulaCheck = await page.evaluate(() => {
      party[1].hp = 5; party[1].spells.push('Ferula'); party[0].sp = 20;
      currentBattleChar = 0;
      castSpellInBattle('Ferula', null, 1);   // cible Hermione (idx 1)
      const regen = (party[1].statusEffects || []).find(s => s.id === 'regen');
      return { hp: party[1].hp, regenTurns: regen?.turns || 0 };
    });
    assert(ferulaCheck.hp > 5, 'Ferula n\'a pas guéri');
    assert(ferulaCheck.regenTurns === 3, 'regen pas appliqué pour 3 tours');

    // T4 : solo — Ferula auto-cible Harry
    await page.evaluate(() => {
      partySize = 1;
      currentBattleChar = 0;
      party[0].hp = 10; party[0].sp = 20;
      castSpellInBattle('Ferula', null, null);
    });
    const soloHp = await page.evaluate(() => party[0].hp);
    assert(soloHp > 10, 'Ferula solo : Harry pas soigné');

    if (errors.length) throw new Error(`${errors.length} erreurs JS`);
    console.log('  ✅ Garde + Ferula conformes');
    await browser.close();
  }
  ```
- Ajouter à `scenarios = [..., scenarioGuardAndFerula]`.
- **Vérif** : `node tests/smoke.js` vert.

### Étape 7 — Documentation
- [ ] `CLAUDE.md` § « Système de combat » :
  - Tableau actions : ajouter Garde.
  - Tableau niveau d'apprentissage : ajouter Ferula L4 Hermione / L6 Harry.
- [ ] `CLAUDE.md` § Variables d'état : ajouter `guardTurns`.

### Étape 8 — Commit & push
- [ ] Branche : `claude/combat-guard-ferula` depuis master à jour.
- [ ] Commit : `feat(combat): action Garde + sort Ferula (soutien duo)`
- [ ] Push, vérifier état PR (guidelines §6).

## 5. Ce qui ne change pas (sanity)

- Aucun changement sur Protego, Episkey, Reparo : leurs handlers
  restent identiques. Protego garde sa priorité d'absorption.
- Cycle de tour inchangé : Garde consomme un tour comme n'importe
  quelle action.
- `shieldTurns`, `statusEffects` (burn/poison/bleed/weaken) : intacts.
- Pas de nouveau slot, pas de nouveau type d'item, pas d'asset visuel
  à générer — réutilise icons emoji + UX_safe existant.

## 6. Hors-scope (V2 potentielles)

- Garde : counter-attack basé sur LCK.
- Garde : double-Garde = Garde renforcée (75 % mitigation).
- Ferula Maxima : version AOE qui pose `regen` sur tout le groupe (boss
  reward ?).
- Ennemis qui dispel les buffs (`regen`, Protego) — ouvrirait un sous-jeu
  buff/dispel cohérent avec V2.
- Spellbook « Manuel de Premiers Secours Magiques » qui enseigne Ferula
  hors level-up (cf. catalogue boutique étage 3).

## 7. Estimation

| Étape | Durée |
|------:|-------|
| 1. État + framework regen | 25 min |
| 2. Action Garde (état + UI + grille mobile + tick) | 35 min |
| 3. Sort Ferula (handler + sélection allié) | 30 min |
| 4. Level-up table + apprentissage | 10 min |
| 5. Sérialisation regen | 10 min |
| 6. Smoke test | 30 min |
| 7. Doc CLAUDE.md | 10 min |
| 8. Commit/push | 5 min |
| **Total** | **~2h30** |

Légèrement au-dessus de l'estimation top-10 (2h) parce que le moteur
n'a pas de framework de buff-over-time existant — il faut introduire
`regen` dans `STATUS_DEFS` et étendre `tickStatuses`. Coût marginal pour
un ROI évident : ouvre la voie à tous les futurs sorts de soutien
(Cave Inimicum, Confringo défensif, etc.).

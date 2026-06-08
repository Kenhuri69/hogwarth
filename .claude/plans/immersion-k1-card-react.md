# Plan — Immersion K1 : flash de dégât/soin par carte de perso

**Branche :** `claude/immersion-k1-card-react`
**Origine :** [`immersion-suite-4.md`](./immersion-suite-4.md) §K1 (cap principal — HUD gauche réactif).
**Nature :** 100 % cosmétique/UX (aucune mécanique, aucun état de save). JS + CSS
servis au navigateur → **bump cache PWA** obligatoire (guidelines §8).

---

## Objectif

La carte du perso qui **encaisse** un coup ou est **soigné** ne réagit pas
individuellement (seuls un chiffre flottant `floatDmg('ally', …)` et le voile
plein écran D3 existent ; il y a déjà un `flash-heal` sur la carte du caster).
Ajouter un **flash bref + micro-secousse** sur `#char-card-<idx>` du membre
concerné : teinte **rouge** (dégât) / **verte** (soin existante), distinct du
voile groupe.

## Conception

### API — `UX.cardReact(charIdx, kind)` (`js/ux-improvements.js`)

```js
function cardReact(charIdx, kind) {
  const cc = document.getElementById('char-card-' + ((charIdx|0)));
  if (!cc) return;
  const cls = kind === 'heal' ? 'flash-heal'
            : kind === 'crit' ? 'card-react-crit'
            : 'card-react-dmg';
  cc.classList.remove('flash-heal', 'card-react-dmg', 'card-react-crit');
  void cc.offsetWidth;            // reflow → rejoue l'anim sur coups rapides
  cc.classList.add(cls);
  setTimeout(() => cc.classList.remove(cls), 550);
}
```

- Exporté dans `window.UX`.
- **Refactor** : l'actuel bloc inline `flash-heal` de `floatDmg` (heal) délègue à
  `cardReact(idx, 'heal')` — même source d'index (`currentBattleChar`), zéro
  changement de comportement du soin.
- `kind 'crit'` est supporté pour l'API (les coups ennemis physiques ne crit pas
  dans le moteur actuel → les call-sites posent `'dmg'`).

### CSS (`css/ux-improvements.css`)

- `.party-card.card-react-dmg` / `.card-react-crit` : keyframe combinant **flash
  de fond rouge** (inset box-shadow, clipé à la carte) **+ légère secousse**
  (translateX).
- **reduced-motion** : keyframe alternative **flash seul** (sans transform) — le
  signal de danger reste lisible, le mouvement disparaît. (Le `.flash-heal`
  existant reste neutralisé en reduced-motion comme aujourd'hui — info verte
  déjà couverte par le chiffre flottant.)

### Call-sites (dégât subi par un allié — `charIdx` déjà en scope)

| Fichier | Fonction | Ligne(s) |
|---------|----------|----------|
| `js/battle.js` | `_enemyPhysicalHit(enemy, target, charIdx)` | coup mitigé (Garde) + coup normal |
| `js/battle-spells.js` | `tryEnemyAbility(…, charIdx)` | `damage`, `maxhpdamage`, `drain` |

À chaque site : `UX_safe.cardReact(charIdx, 'dmg')` **après** la réduction de
`target.hp`, jamais sur shield/miss (pas de dégât). Le soin est couvert
automatiquement par le refactor de `floatDmg`.

### Garde-fous

- `UX_safe` partout → no-op si `ux-improvements.js` absent.
- Aucune nouvelle variable d'état, aucune sérialisation.
- Pas de classe sur shield/esquive (pas de dégât réel).
- KO : la carte garde `.ko-char` ; le flash transitoire ne casse rien (retiré).

## Limitation connue (hors scope K1)

Le `flash-heal` reste posé sur la carte du **caster** (`currentBattleChar`), pas
forcément du **soigné** (cas Hermione soigne Harry). Comportement **pré-existant**,
non régressé. Affiner = passer l'index du soigné à `floatDmg`/`cardReact` partout
(≥ 10 sites) → reporté.

## Étapes & vérifications

1. [ ] Plan (ce fichier).
2. [ ] `cardReact` + refactor heal dans `ux-improvements.js` + export.
3. [ ] CSS `card-react-dmg/crit` + variante reduced-motion.
4. [ ] 5 call-sites `cardReact(charIdx,'dmg')` (battle.js ×2, battle-spells.js ×3).
5. [ ] Cache PWA bumpé (`cache-bump`) : ux-improvements.js/.css, battle.js, battle-spells.js.
6. [ ] `tests/smoke.js` volet K1 (`scenarioCardReact`) : API présente ; un héros
   encaisse → classe posée puis retirée sans throw ; heal → `flash-heal`.
7. [ ] DoD : `node tests/units.js`, `node tests/smoke.js`,
   `node tools/check_cache_versions.js --base origin/master`, `node tests/pwa-smoke.js`
   verts ; commit + push ; PR + merge.

## Journal des écarts

*(à compléter)*

# Plan — Immersion L1 : fanfare de quête complétée

**Branche :** `claude/immersion-l1-quest-fanfare`
**Origine :** [`immersion-suite-4.md`](./immersion-suite-4.md) §L1 (priorité 4).
**Nature :** 100 % cosmétique/UX (aucune mécanique, aucun état de save). JS + CSS
+ synthèse audio → **bump cache PWA** (guidelines §8).

## Objectif

`completeQuest` ne réutilise que le **son de level-up** + un `addMsg`. Lui donner
un **moment dédié** : bandeau doré transitoire centré (« Quête accomplie ! » +
titre) **et** un **timbre distinct** (arpège), pour marquer le jalon.

## Conception

### Visuel — `UX.questFanfare(title)` (`js/ux-improvements.js`)

Monte un bandeau `.quest-fanfare` en `position:fixed` centré, retiré après
~2,6 s (flourish CSS). Titre échappé (défensif). Exporté dans `window.UX`,
appelé dans `completeQuest` via `UX_safe`. **reduced-motion** → fondu d'opacité
seul (pas de translation/scale).

### Audio — `AudioSystem.playQuestComplete()` (`js/audio-sfx.js`)

Arpège d'accord majeur (timbre **triangle**) + note tenue finale — distinct de
`playLevelUp` (gamme **sine** montante). Remplace l'appel `playLevelUp` dans
`completeQuest` (la quête est un événement propre ; un éventuel level-up du
reward jouera `playLevelUp` via `checkLevelUp`, inchangé).

### Intégration (`js/quests.js — completeQuest`)

```js
AudioSystem.playQuestComplete();           // au lieu de playLevelUp()
addMsg(`… Quête terminée : « ${q.title} » !`, 'good');
if (window.UX_safe) UX_safe.questFanfare(q.title);
```

### Garde-fous

- `UX_safe` → no-op si module absent. `playQuestComplete` gardé par `isMuted`
  (comme tout SFX). Aucune variable d'état, aucune sérialisation.
- z-index élevé pour passer au-dessus des overlays (kill-quests s'auto-complètent
  ~600 ms après un combat).

## Étapes & vérifications

1. [x] Plan (ce fichier).
2. [x] `audio-sfx.js` : `playQuestComplete()`.
3. [x] `ux-improvements.js` : `questFanfare(title)` + escape + export.
4. [x] `ux-improvements.css` : `.quest-fanfare` + variante reduced-motion.
5. [x] `quests.js` : swap son + appel `questFanfare`.
6. [x] Cache PWA bumpé (v83) : audio-sfx.js, ux-improvements.js/.css, quests.js.
7. [x] `tests/smoke.js` `scenarioQuestFanfare` : API présente ; quête complétée
   monte le bandeau (retiré ensuite) ; escape HTML ; `playQuestComplete` présent.
8. [x] DoD : units (179), smoke (173), check_cache_versions, pwa-smoke verts.

## Journal des écarts

### Implémentation (2026-06-08, branche claude/immersion-l1-quest-fanfare)

Livré conforme au plan.

- **`audio-sfx.js`** : `playQuestComplete()` (arpège Sol majeur timbre triangle +
  note tenue octave) — distinct de `playLevelUp`.
- **`ux-improvements.js`** : `UX.questFanfare(title)` exporté, titre échappé
  (`_escFanfare`, anti-injection).
- **`ux-improvements.css`** : `.quest-fanfare` (bandeau doré `position:fixed`,
  flourish) + variante reduced-motion (fondu d'opacité seul).
- **`quests.js`** : `completeQuest` joue `playQuestComplete` (repli `playLevelUp`
  si absent) et appelle `UX_safe.questFanfare(q.title)`.
- **Tests** : `scenarioQuestFanfare` (quests.js) — montage via `completeQuest`
  réel, titre affiché, escape HTML, retrait après anim, présence API audio.
- **Cache PWA** : `CACHE_VERSION` → `hogwarth-v83` ; audio-sfx 11→12,
  ux-improvements.js 4→5, ux-improvements.css 3→4, quests 10→11.

**Écart mineur (correctif inclus)** : le sous-test « call-site réel » de
`scenarioCardReact` (K1, déjà mergé) s'est révélé **flaky** dans la suite
complète — le coup de l'ennemi factice pouvait tirer 0 dégât selon son ATK vs la
DEF de Harry. Corrigé ici (test-only) en forçant `target.def=0`/`enemy.atk=999`
→ dégâts déterministes. Hors périmètre fonctionnel L1, mais c'est mon propre
test à fiabiliser (guidelines §3).

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

1. [ ] Plan (ce fichier).
2. [ ] `audio-sfx.js` : `playQuestComplete()`.
3. [ ] `ux-improvements.js` : `questFanfare(title)` + escape + export.
4. [ ] `ux-improvements.css` : `.quest-fanfare` + variante reduced-motion.
5. [ ] `quests.js` : swap son + appel `questFanfare`.
6. [ ] Cache PWA bumpé : audio-sfx.js, ux-improvements.js/.css, quests.js.
7. [ ] `tests/smoke.js` `scenarioQuestFanfare` : API présente ; une quête
   complétée monte le bandeau (retiré ensuite) sans throw ; `playQuestComplete`
   présent.
8. [ ] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts

*(à compléter)*

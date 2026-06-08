# P0 #1 — Dialogue PNJ en modal plein écran

## Contexte

L'audit UX mobile signale (P0) que l'overlay de dialogue PNJ ne sombre
pas le HUD : header, bandeau d'équipe, texte de narration, D-pad et les
14 icônes d'action restent en pleine luminosité et **cliquables** pendant
qu'on lit un dialogue.

Cause racine confirmée par inspection DOM :

```
.main-view
  └ .scene-viewport          ← #npc-dialog-overlay vit ici
       └ #npc-dialog-overlay  position:absolute; inset:0
.commands-bar                ← SŒUR de .main-view, hors de l'overlay
```

`#npc-dialog-overlay { position:absolute; inset:0 }` est borné à
`.scene-viewport` (la zone canvas 3D). La `.commands-bar` et le header
sont des frères hors de l'overlay → jamais recouverts.

Aucun ancêtre (`html`, `body`, `#game-container`, `.main-view`,
`.scene-viewport`) ne porte `transform`/`filter`/`perspective` →
`position:fixed` se cale donc bien sur le viewport.

## Étapes

1. **CSS** — `#npc-dialog-overlay` : `position:absolute` → `position:fixed`,
   `z-index:9` → `z-index:150` (au-dessus du minimap-corner z-index:10 et
   de tout le chrome HUD ; en-dessous des modales 500+ — mutuellement
   exclusives avec le dialogue).
   → vérif : l'overlay couvre le viewport entier, le voile 85 % + blur
   sombre tout le HUD, les clics HUD sont interceptés par l'overlay.

2. **Smoke** — ajouter dans `scenarioNpcIntegration` T4 une assertion :
   `getComputedStyle(overlay).position === 'fixed'`.
   → vérif : `node tests/smoke.js` vert.

## Hors-scope

- Refonte visuelle bottom-sheet (handle, dots, tap-to-advance) : items
  cosmétiques distincts, non bloquants.
- Suppression du texte de narration : il est désormais sombré sous le
  voile, ce qui suffit pour le P0.
- `#explore-overlay` souffre du même bornage mais relève du P2 « hero
  pattern » — non traité ici.

## Suivi

- [x] Étape 1 — CSS fixed + z-index (style.css `#npc-dialog-overlay`)
- [x] Étape 2 — assertion smoke (`scenarioNpcIntegration` T4 :
      `overlayPosition === 'fixed'`)
- [x] `node tests/smoke.js` vert — tous scénarios passés, T4 confirme
      `overlayPosition: 'fixed'`

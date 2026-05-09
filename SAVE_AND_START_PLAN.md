# Plan — Système de sauvegarde & Écrans de démarrage

> **Branche** : `claude/save-and-hub` (override utilisateur ; depuis master)
> **Statut global** : 13 / 14 tâches terminées (Z = PR ouverte = 14/14 visé)
> **Convention** : `[ ]` pending · `[~]` in progress · `[x]` done
>
> Ce document est mis à jour à chaque étape franchie (règle 5).

---

## Périmètre validé avec l'utilisateur

**Sauvegarde**
- Multi-slots avec aperçus (héros, maison, niveau, étage, date)
- Auto-sauvegarde sur événements-clés (changement d'étage, level-up, fin de combat)
- Écran de choix au démarrage : *Nouvelle partie* ↔ *Reprendre* (sélection du slot)

**Écrans de démarrage**
- Refonte visuelle du title screen

Hors scope (pour ne pas dériver) : versionning/migration profonde, export/import JSON, refonte des écrans player-select et house-select.

---

## Architecture cible

### Modèle de données (localStorage)

```
clé "hogwarts_rpg_saves"  → { version: 1, slots: { manual_1: {…}, manual_2: {…}, manual_3: {…}, auto: {…} } }
clé "hogwarts_rpg_save"   → ANCIENNE clé, conservée et migrée au premier démarrage post-déploiement
```

**Structure d'un slot** :
```js
{
  meta: {
    savedAt:    ISOString,         // pour tri + affichage "il y a 2j"
    label:      "Manuel" | "Auto", // type
    heroNames:  ["Harry Potter", "Hermione Granger"],
    heroIcons:  ["img/harry.png", …],
    house:      "Gryffondor",
    level:      4,
    floor:      3,
    difficulty: "Normal"
  },
  state: { /* exactement le payload actuel de saveGame() */ }
}
```

### Slots
- 3 slots manuels (`manual_1`, `manual_2`, `manual_3`)
- 1 slot auto (`auto`), réécrit silencieusement par l'auto-save

### Flux
```
Title (refonte) → click "Commencer"
  → Hub démarrage
      ├─ Aucun slot rempli  → mène direct à player-select (Nouvelle partie)
      └─ Au moins 1 slot    → écran avec :
            • bouton "Nouvelle partie"
            • liste des slots (cards : aperçu + Charger / Effacer)
```

---

## Étapes du plan

### Phase 1 — Infrastructure de saves multi-slot

- [x] **1.1** Refactoriser `js/save.js` : extraire l'ancienne logique en
      `_serializeState()` / `_applyState()` purs (sans I/O). Pas de
      changement comportemental visible.
      *Critère :* `node tests/smoke.js` reste vert ; saveGame()/loadGame()
      continuent de fonctionner sur l'ancienne clé. ✅ 9 scénarios verts.
- [x] **1.2** Ajouter `listSaveSlots()`, `readSlot(id)`, `writeSlot(id)`,
      `deleteSlot(id)`, `migrateLegacyKey()` qui lit `hogwarts_rpg_save`
      et le déplace vers `hogwarts_rpg_saves.slots.manual_1` une fois.
      *Critère :* nouveau scénario smoke qui écrit dans un slot, le relit,
      le supprime, vérifie l'idempotence de la migration legacy.
      ✅ Scénario 10 : write/read + delete + migration idempotente.
- [x] **1.3** Mettre à jour `saveGame()` (boutons en jeu) pour ouvrir une
      petite modale de choix de slot (3 manuel + indication auto en RO).
      *Critère :* test E2E qui vérifie que la modale apparaît, qu'on peut
      écrire dans un slot et que le slot est ensuite listé.
      ✅ Modale `#slot-modal` + `js/save-ui.js` + `css/save-ui.css`.
      Boutons 💾/📂 rebrandés vers `openSaveDialog()`/`openLoadDialog()`.
      Scénario smoke 11 : open save → click vide → write → close → open load
      → slot listé en mode load.

### Phase 2 — Auto-sauvegarde

- [x] **2.1** Identifier les hooks : `descendStairs()`/changement d'étage
      dans `movement.js`, `checkLevelUp()` dans `battle.js`, fin de
      `endBattle()` dans `battle.js`. Vérifier qu'on est *hors* combat.
      ✅ Hooks branchés : `goDeeper`, `goUp`, `endBattle`, `checkLevelUp`.
- [x] **2.2** Ajouter `autoSave()` qui appelle `writeSlot('auto')` avec
      un debounce simple (anti-spam). Slot auto distinct des manuels,
      visible dans la liste mais non écrasable manuellement.
      *Critère :* test smoke : on simule un changement d'étage et on
      vérifie que le slot auto a un `meta.savedAt` postérieur.
      ✅ `autoSave(reason)` avec throttle 1500 ms ; refus en combat
      ou avant `chosenHouse`. Scénario smoke 12 (4 assertions).

### Phase 3 — Hub démarrage (Nouvelle / Reprendre)

- [x] **3.1** Ajouter `#start-hub-screen` à `index.html` entre
      `#title-screen` et `#player-select-screen` ; nouveau CSS dédié.
      Mise en page : titre + bouton "Nouvelle partie" + liste de cartes
      slots (aperçu meta + actions Charger/Effacer). ✅ Hub stylé
      parchemin/or avec liste slots et CTA principal.
- [x] **3.2** Modifier `showPlayerSelect()` (renommer flux interne sans
      casser l'API publique) : depuis `#title-screen` on aiguille vers
      `#start-hub-screen` si au moins un slot existe, sinon directement
      sur `#player-select-screen`. ✅ `enterStartHub()` ajouté ;
      title-screen onclick rebrandé. Bypass propre quand zéro slot.
- [x] **3.3** Branchement "Charger ce slot" → `_applyState(slot.state)`
      + bypass complet des écrans player/house-select.
      *Critère :* test smoke complet : démarrage → hub → "Charger" → on
      retombe en jeu avec les bonnes valeurs `playerX/Y/floor/chosenHouse`.
      ✅ `loadSlotAndStart(id)` async ; scénario smoke 13 (4 phases :
      no-slot bypass, hub avec slot, click → load, bouton Nouvelle).

### Phase 4 — Refonte visuelle du title screen

- [x] **4.1** Inventaire des éléments décoratifs actuels (SVG cover
      générée inline, presse-start, footer instructions). Décider quoi
      garder, quoi remplacer/améliorer (au moins un asset visuel + une
      micro-animation discrète). ✅ Cadre + corner SVG conservés.
      Castle SVG remplacé par version élargie + animations CSS.
- [x] **4.2** Implémenter la refonte (HTML/CSS uniquement, pas de JS
      sauf si gestion d'animation via classe). Maintenir l'accessibilité
      mobile (≤ 700px) et l'event listener click → hub/player-select.
      *Critère :* capture mobile et desktop qui montrent une amélioration
      visuelle franche tout en restant cohérent avec la charte parchemin/or.
      ✅ SVG 600×280 avec : montagne en arrière-plan, lune en croissant
      avec halo pulsé, 5 tours de hauteurs variées avec toits coniques,
      drapeau, fenêtres animées (warm/cold flicker), brume basse,
      mini reflet d'eau. Mobile : SVG fluide en `min(92vw, 600px)`.

### Phase 5 — Couverture & finalisation

- [x] **5.1** Étendre `tests/smoke.js` avec un scénario dédié (10) :
      multi-slots, migration legacy, hub démarrage, reprise via slot,
      auto-save. Au moins 4 assertions distinctes.
      ✅ 4 nouveaux scénarios (10 multi-slots, 11 modale UI,
      12 auto-save, 13 hub démarrage) totalisant ~24 assertions.
- [x] **5.2** Mise à jour `CLAUDE.md` (section sauvegarde + Hub) pour
      documenter le nouveau modèle aux sessions futures.
      ✅ Section "Sauvegarde (multi-slots)" entièrement réécrite : modèle
      `hogwarts_rpg_saves`, API publique tabulaire, hooks auto-save,
      flux UI/Hub, règle d'or sur les références. Ordre de chargement
      des scripts mis à jour avec `save-ui`.
- [ ] **5.3** Commit final groupé + push + PR.

---

## Décisions à acter

- **Compatibilité ascendante** : on migre l'ancienne clé une seule fois
  vers `manual_1` ; la session précédente n'est pas perdue.
- **Limite slots** : 3 manuels (extensible plus tard) + 1 auto.
- **Granularité auto-save** : 3 hooks (étage, level-up, fin de combat).
  Pas de timer périodique pour rester sobre.
- **Visuel hub** : utiliser le style parchemin/or existant, pas de
  refonte CSS globale.

---

## Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-09 | Plan rédigé | Périmètre confirmé : multi-slots + auto-save + hub démarrage + refonte title |
| 2026-05-09 | 1.1 + 1.2 OK | save.js refactoré (purs serializer/applier) + API multi-slots + migration legacy ; scénario smoke 10 vert |
| 2026-05-09 | 1.3 OK | Modale slot-modal + save-ui.js/css ; scénario smoke 11 vert (round-trip save→load via UI) |
| 2026-05-09 | 2.1 + 2.2 OK | autoSave(reason) avec throttle 1500ms ; hooks goDeeper/goUp/endBattle/checkLevelUp ; scénario smoke 12 vert |
| 2026-05-09 | 3.1 + 3.2 + 3.3 OK | Hub démarrage opérationnel (HTML + CSS dédiés, JS dans save-ui.js). title-screen → enterStartHub → bypass ou hub. Click slot → loadSlotAndStart (async, charge textures, applique state, init audio). Scénario smoke 13 vert |
| 2026-05-09 | 4.1 + 4.2 OK | Castle SVG redessiné (5 tours + crénaux + drapeau + lune en croissant + halo + montagne + brume + reflet). Animations CSS : flicker fenêtres warm/cold décalées, halo lunaire pulsé, twinkle SVG indépendant. Responsive `min(92vw, 600px)` |

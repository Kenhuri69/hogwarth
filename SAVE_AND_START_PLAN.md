# Plan — Système de sauvegarde & Écrans de démarrage

> **Branche** : `claude/improve-svg-HWGDY` (instruction système)
> **Statut global** : 0 / 14 tâches terminées
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

- [ ] **1.1** Refactoriser `js/save.js` : extraire l'ancienne logique en
      `_serializeState()` / `_applyState()` purs (sans I/O). Pas de
      changement comportemental visible.
      *Critère :* `node tests/smoke.js` reste vert ; saveGame()/loadGame()
      continuent de fonctionner sur l'ancienne clé.
- [ ] **1.2** Ajouter `listSaveSlots()`, `readSlot(id)`, `writeSlot(id)`,
      `deleteSlot(id)`, `migrateLegacyKey()` qui lit `hogwarts_rpg_save`
      et le déplace vers `hogwarts_rpg_saves.slots.manual_1` une fois.
      *Critère :* nouveau scénario smoke qui écrit dans un slot, le relit,
      le supprime, vérifie l'idempotence de la migration legacy.
- [ ] **1.3** Mettre à jour `saveGame()` (boutons en jeu) pour ouvrir une
      petite modale de choix de slot (3 manuel + indication auto en RO).
      *Critère :* test E2E qui vérifie que la modale apparaît, qu'on peut
      écrire dans un slot et que le slot est ensuite listé.

### Phase 2 — Auto-sauvegarde

- [ ] **2.1** Identifier les hooks : `descendStairs()`/changement d'étage
      dans `movement.js`, `checkLevelUp()` dans `battle.js`, fin de
      `endBattle()` dans `battle.js`. Vérifier qu'on est *hors* combat.
- [ ] **2.2** Ajouter `autoSave()` qui appelle `writeSlot('auto')` avec
      un debounce simple (anti-spam). Slot auto distinct des manuels,
      visible dans la liste mais non écrasable manuellement.
      *Critère :* test smoke : on simule un changement d'étage et on
      vérifie que le slot auto a un `meta.savedAt` postérieur.

### Phase 3 — Hub démarrage (Nouvelle / Reprendre)

- [ ] **3.1** Ajouter `#start-hub-screen` à `index.html` entre
      `#title-screen` et `#player-select-screen` ; nouveau CSS dédié.
      Mise en page : titre + bouton "Nouvelle partie" + liste de cartes
      slots (aperçu meta + actions Charger/Effacer).
- [ ] **3.2** Modifier `showPlayerSelect()` (renommer flux interne sans
      casser l'API publique) : depuis `#title-screen` on aiguille vers
      `#start-hub-screen` si au moins un slot existe, sinon directement
      sur `#player-select-screen`.
- [ ] **3.3** Branchement "Charger ce slot" → `_applyState(slot.state)`
      + bypass complet des écrans player/house-select.
      *Critère :* test smoke complet : démarrage → hub → "Charger" → on
      retombe en jeu avec les bonnes valeurs `playerX/Y/floor/chosenHouse`.

### Phase 4 — Refonte visuelle du title screen

- [ ] **4.1** Inventaire des éléments décoratifs actuels (SVG cover
      générée inline, presse-start, footer instructions). Décider quoi
      garder, quoi remplacer/améliorer (au moins un asset visuel + une
      micro-animation discrète).
- [ ] **4.2** Implémenter la refonte (HTML/CSS uniquement, pas de JS
      sauf si gestion d'animation via classe). Maintenir l'accessibilité
      mobile (≤ 700px) et l'event listener click → hub/player-select.
      *Critère :* capture mobile et desktop qui montrent une amélioration
      visuelle franche tout en restant cohérent avec la charte parchemin/or.

### Phase 5 — Couverture & finalisation

- [ ] **5.1** Étendre `tests/smoke.js` avec un scénario dédié (10) :
      multi-slots, migration legacy, hub démarrage, reprise via slot,
      auto-save. Au moins 4 assertions distinctes.
- [ ] **5.2** Mise à jour `CLAUDE.md` (section sauvegarde + Hub) pour
      documenter le nouveau modèle aux sessions futures.
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

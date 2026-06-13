# Plan — P4 (volet B) : npcReputation (ch.06 §6.9.2)

Dernier item ❓ de P4. Réactions **par PNJ** au seul vrai choix gris du jeu —
le **Pacte des Cachots** (écho de Salazar, `slythPactChoice ∈ {pact,defiance}`).

## Décision (arbitrée)
- **Approche DÉRIVÉE** (pas de Map sérialisée). §6.9.2 met en tête « réputation
  dérivée — aucune variable neuve si possible » ; `slythPactChoice` est déjà
  sérialisé → un helper pur suffit. Conforme guidelines §2 (« pas de feature
  neuve si un dérivé suffit »).
- **2 PNJ** (réactions de signe opposé sur un même choix) :
  - **écho de Salazar** (donneur du choix) : Pacte → +2 (chaleureux), Défiance → −2.
  - **Kingsley** (Auror de l'Ordre, « trahi par le Pacte ») : Pacte → −2 (méfiant),
    Défiance → +1 (respect).
- Réaction = **suffixe de dialogue** (réutilise le patron P2/P3 :
  `_eclatSuffixPages` / `_darkLoopSuffixPages`).

## Étapes

### Étape 1 — Helper dérivé (quests.js)
- [x] `NPC_REPUTATION_PACT` (registre pur `{npcId:{pact,defiance}}`) +
      `npcReputationFor(npcId) ∈ [-2,+2]` (lit `slythPactChoice`, borné, 0 si
      pas de choix / PNJ inconnu). `window.npcReputationFor`. → vérif : units
- [x] (pas au MANIFEST loader — eclatProgress n'y est pas non plus, alignement.)

### Étape 2 — Suffixe de dialogue (npc-dialog.js)
- [x] `_reputationSuffixPages(npc)` : lit `npc.reputationLines` (clé `warm` si
      rep>0, `hostile` si rep<0), string|tableau, scindé. Appendu dans
      `openNpcDialog` après le suffixe Ténébreux. → vérif : smoke

### Étape 3 — Données (npcs.js)
- [x] `reputationLines:{warm,hostile}` sur `echo_salazar` et `kingsley`.
      → vérif : smoke

### Étape 4 — Tests
- [x] `tests/units.js` : `npcReputationFor` (pact/defiance/null × écho/kingsley/
      inconnu, bornes).
- [x] `tests/scenarios/npc.js` : `scenarioNpcReputation` (Serpentard ; pact →
      écho warm + Kingsley hostile ; defiance → inverse ; null → aucun suffixe).

### Étape 5 — Cache & finalisation
- [x] skill `cache-bump` : quests.js + npc-dialog.js + npcs.js bumpés +
      CACHE_VERSION. `check_cache_versions --base origin/master` vert.
- [x] skill `commit-guard`, commit, push, PR, squash.

## Écarts / décisions
- Approche dérivée retenue plutôt que le Map littéral de §6.12.B — fidèle à la
  reco de tête de §6.9.2 + §2 (le Map serait un primitif d'état superflu pour un
  choix binaire ; « risque > bénéfice » selon le doc).
- Le Pacte n'existe que pour un héros Serpentard (écho houseGate) → la réputation
  reste neutre (0) pour les autres Maisons : Kingsley se comporte normalement
  pour tous sauf un Serpentard ayant fait son choix.
</content>

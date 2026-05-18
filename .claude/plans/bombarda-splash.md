# Bombarda — éclaboussure (splash)

## Constat

Audit des 41 sorts de `SPELLS` (`js/data.js`) : **Bombarda** est le seul sort
dont le texte promet une zone (« Explosion (20 dégâts tous ennemis) ») alors
que l'`effect:"burn"` le route vers `_spellElementalDamage` — strictement
mono-cible. L'AoE est donc « désactivée » (mensongère).

Les AoE alliées (`Ferula Maxima`, `Patronus Maxima`, `Récolte Magique`) sont,
elles, correctement implémentées — pas concernées.

## Décision de design (validée)

Pas d'AoE pure : **modèle à éclaboussure**.

- Le joueur garde la sélection de cible (`showTargetSelection`).
- La cible principale prend les **dégâts pleins** (`power + mag/2`, crit /
  resist / weak / DoT inchangés).
- Les **autres ennemis vivants** prennent une éclaboussure :
  `splash = floor(power/2 + mag/8 + str/4)`, plancher 1, modulée par
  resist/weak de chaque ennemi.
- L'éclaboussure ne crit pas, n'applique pas de DoT, ne déclenche ni Élan
  (Gryffondor) ni vol de vie (Serpentard) — ces effets restent attachés à
  la cible principale. Lever d'équité : le terme `str/4` récompense un
  lanceur physique sans empiler les passifs de Maison.

## Étapes

1. `js/data.js` — Bombarda : ajouter `splash:true`, réécrire `desc`.
   → vérif : grep `splash:true` présent, desc cohérente.
2. `js/battle-spells.js — _spellElementalDamage` — après le bloc DoT,
   bloc `if (spell.splash)` : boucle `livingEnemies()` hors cible
   principale, applique le splash + `UX.floatDmg` par ennemi, complète
   le message.
   → vérif : seuls les sorts portant `splash` déclenchent le bloc.
3. `js/battle-spells.js — spellEffectPreview` — case `burn` : si
   `spell.splash`, suffixer l'aperçu d'éclaboussure.
   → vérif : aperçu lisible dans la modale Sorts.
4. `node tests/smoke.js` — non-régression.
   → vérif : tous scénarios verts.

## Hors-scope

- Candidats thématiques (Lumos Maxima/Solem, Riddikulus, Aguamenti) :
  écartés, on ne touche qu'à Bombarda.
- AoE ennemie : non concernée.

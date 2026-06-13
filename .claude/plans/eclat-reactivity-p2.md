# Réactivité fil rouge des Éclats — Priorité P2 (ch.06 §6.9.3)

Branche : `claude/hogwarth-eclat-reactivity-p2` (depuis origin/master, P1 mergé).

## But

Rendre les PNJ-pivots **réactifs au fil rouge des Éclats** : à mesure que le
joueur ramasse les `eclat_voute` (quête `eclats_clef_voute` — Peeves 1, Loup-Garou
2, Mangemort d'Élite 3), Dumbledore et l'écho de Salazar **commentent** la double
trame via un **suffixe de dialogue** `eclatLines[eclatProgress]`.

## Contraintes (guidelines §2 + ch.06 §6.12.B)

- `eclatProgress` doit être **dérivé**, pas un compteur sérialisé parallèle.
  Le codex le dérive déjà (`ui-codex.js` : nb d'`eclat_voute` possédés). Mais
  l'inventaire est **consommé à la remise** (`_consumeQuestItems`) → le compte
  retombe à 0. → helper **monotone** : `completedQuests.has('eclats_clef_voute') ⇒ 3`.
- Pas de nouveau flag sérialisé. Pas de nouvel asset (texte seul).
- Câblage **au-dessus** de `npc-dialog.js` (ordre §6.12.C : base →
  dialoguesByHouse → état de quête → **suffixe eclatLines**).

## Étapes (vérifiées)

- [x] **0. Plan + branche** (rebasé sur origin/master après merge P1).
- [x] **1. Helper dérivé `eclatProgress()`** (quests.js, exposé window) :
  `min(3, nb eclat_voute possédés)`, ou `3` si `eclats_clef_voute` complétée
  (monotone post-remise). Pur côté lecture (lit player.inventory +
  completedQuests).
- [x] **2. Suffixe `eclatLines` (npc-dialog.js)** : helper `_eclatSuffixPages(npc)`
  → si `npc.eclatLines` présent et `eclatProgress() > 0`, renvoie la ligne du
  palier courant (string ou pioche array), scindée en sous-pages. Appendu dans
  `openNpcDialog` après `_npcDialogPages` ; `srcPage` calé sur la dernière page
  réelle → pas de déclenchement voix (suffixe muet). Défensif : no-op sans champ.
- [x] **3. Données `eclatLines` (npcs.js)** :
  - `dumbledore` (universel, non gaté — la 4ᵉ voix des Fondateurs) : 3 paliers,
    ancrés sur §6.9.3 (« Quelque chose s'est brisé… » / « on l'attise, d'en bas »
    / « le verrou cachait deux choses »).
  - `echo_salazar` (Serpentard, P1 — voix de Fondateur) : 3 paliers (la stèle
    Godric / sa propre faute / la faille de Rowena, relayés par l'écho).
- [x] **4. Test smoke** : `scenarioNpcEclatReaction` (npc.js) — eclat 0 ⇒ pas de
  suffixe ; donner 2 `eclat_voute` ⇒ suffixe palier 2 dans les pages de
  Dumbledore ; compléter `eclats_clef_voute` (inv. vidé) ⇒ `eclatProgress()===3`
  + suffixe palier 3. Vérif écho de Salazar (Serpentard) palier présent.
- [x] **5. Cache PWA** (skill cache-bump) : bump JS modifiés (quests.js,
  npc-dialog.js, npcs.js) + CACHE_VERSION.
- [x] **6. commit-guard + PR + merge.**

## Notes / écarts

- **Stèle (cellule donjon)** : §6.9.3 cite aussi une « stèle » (voix de Godric).
  La stèle est une cellule (`runeStele`), pas un PNJ → câblage dans un autre
  sous-système. **Hors-scope P2** (l'écho de Salazar couvre la voix de Fondateur
  dans le cadre PNJ ; Dumbledore couvre le volet universel). À noter pour un lot
  ultérieur.
- **Pas de one-shot** : le suffixe reflète « ce que le PNJ sait MAINTENANT » et
  s'affiche tant qu'on est au palier (pas de Set sérialisé « déjà vu » — éviter
  un flag neuf, §2). Court, sur 2 PNJ-pivots seulement.

## Journal
- 2026-06-13 : plan créé. Base rebasée sur origin/master (P1 #474 mergé).
- 2026-06-13 : implémenté. `eclatProgress()` (quests.js, dérivé monotone) ;
  suffixe `_eclatSuffixPages` (npc-dialog.js, muet voix) ; `eclatLines` sur
  `dumbledore` (universel) + `echo_salazar` (Serpentard). Smoke
  `scenarioNpcEclatReaction`. Cache v106→v107 (npcs 25→26, quests 13→14,
  npc-dialog 13→14). Vert : units 442, pwa, smoke 194. Stèle-cellule différée.

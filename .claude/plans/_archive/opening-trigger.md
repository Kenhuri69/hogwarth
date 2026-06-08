# Plan — Refonte de l'événement déclencheur (ouverture)

**But** : remplacer l'amorce passive (« une nuit, les escaliers se figent ») par
un déclencheur concret et visuel survenant en plein quotidien scolaire, afin de
maximiser l'immersion dès les premières minutes.

**Invention centrale** : la **Clé de Voûte des Quatre**, relique des Fondateurs
qui *est* le sceau (« la peur comme sceau » incarnée en objet). Elle se **fend**
pendant un cours d'Histoire de la Magie. Sa fêlure explique d'un seul tenant les
trois faits de jeu :
1. escaliers qui pointent vers le bas (donjon descendant ✅) ;
2. étages inférieurs qui s'ouvrent (Profondeurs / Ruines ✅) ;
3. Dumbledore envoie un élève (les profs tiennent le haut ; seul un cœur sans
   peur rescelle le bas — écho au thème « le choix plutôt que le don » ✅).

## Étapes
1. ✅ Lire l'existant (ch01, 02, 03, 04) + dialogues Dumbledore (`npcs.js`) →
   vérifier la cohérence (corruption pré-Poudlard, post-canon, flux d'intro).
2. ✅ Réécrire **ch01 §1.1 Logline + §1.2 Prémisse** (+ récap express).
3. ✅ Réécrire **ch03 §3.1 Élément déclencheur** + threader les **Actes I (§3.2)
   et II (§3.3)** + points à trancher.
4. Marquage `💡` (proposition) / `✅` (acté) / `❓` (ouvert) conservé partout.
5. Vérif : pas de contradiction avec ch02 (sceau, ruines pré-Poudlard) ni ch04
   (flux intro → choix de Maison → portrait étage 1, quête `intro_tutoriel`).

## Hors-scope
- Implémentation en jeu (dialogues `intro.js`, quêtes liées) : seulement
  **suggérée** dans les docs (`💡 Pistes d'intégration`), pas codée.
- Changement purement documentaire (`docs/**.md`) → pas de bump cache PWA,
  test smoke non requis (guidelines §7/§8).

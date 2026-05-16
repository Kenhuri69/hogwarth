# Refonte anti-abus des boutiques

## Objectif

Limiter le farming de boutique : stock fini tiré au hasard, achat unique,
réassort gated, livres de sorts achetables une seule fois pour la partie.

## Décisions (validées avec l'utilisateur)

- Périmètre : boutique fixe (Mme Malkins) → traitement complet.
  Vendeurs ambulants → uniquement la limite globale « 1 livre de sort
  par partie » (leurs `wares` restent fixes et curées).
- Stock : **8 objets** tirés au hasard par réassort.
- Réassort : tous les **40 pas** OU à chaque changement d'étage.

## Règles

1. Le stock de la boutique fixe est un sous-ensemble aléatoire du
   catalogue éligible (`minFloor <= currentFloor`).
2. Chaque objet du stock ne peut être acheté **qu'une fois** : il
   disparaît du stock après achat (jusqu'au prochain réassort).
3. Un livre de sort acheté (boutique fixe **ou** vendeur) est marqué
   globalement et ne réapparaît jamais à l'achat.
4. Réassort : redessine un stock neuf tous les 40 pas / changement
   d'étage. Le compteur de pas et l'état du stock sont persistés.
5. Objets revendus par le joueur → ajoutés au stock courant (rachat
   possible au prix plein), mais **perdus au réassort**.
6. Garde-fou jouabilité : le tirage garantit ≥ 2 consommables si le
   catalogue éligible en contient (évite le softlock soin).

## Étapes

1. `state.js` : 3 globals (`shopStock`, `shopStepsSinceRestock`,
   `purchasedSpellbooks`). → vérif : déclarés, valeurs initiales.
2. `shop.js` : constantes + `_rollShopStock`, `_ensureShopStock`,
   `_invalidateShopStock`, `_tickShopRestock` ; refonte `_renderBuyGrid`,
   `_purchase`, `sellItem` ; filtre livres globaux côté vendeur.
   → vérif : achat retire du stock, livre acheté absent au re-tirage.
3. `movement.js` : `_step` incrémente le compteur ; `goDeeper`/`goUp`
   invalident le stock. → vérif : 40 pas → stock renouvelé.
4. `save.js` : sérialise/applique les 3 globals. → vérif : round-trip.
5. `main.js` : reset des 3 globals au démarrage d'une partie.
6. `tests/smoke.js` : adapter les tests qui supposaient un catalogue
   déterministe (livre_portus) + nouveau scénario dédié.
   → vérif : `node tests/smoke.js` vert.

## Suivi

- [x] Étape 1 — globals state.js
- [x] Étape 2 — refonte shop.js
- [x] Étape 3 — hooks movement.js
- [x] Étape 4 — persistance save.js
- [x] Étape 5 — reset main.js
- [x] Étape 6 — tests smoke

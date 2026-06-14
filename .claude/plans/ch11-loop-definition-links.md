# Plan — Aligner Ch. 11 (volet « définir « la Boucle » »)

> Phase 1 de `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` — constat n°1
> (réconciliation doc↔code). Item RECO de la session.

## Constat (audit doc↔code, AVANT écriture)

- `docs/histoire/11-mondes-paralleles.md §11.6.1 « Pourquoi la Boucle
  existe »` **contient déjà** la définition canonique de la nature de la
  Boucle : « pas un recommencement mécanique : la conséquence narrative de
  la fêlure menée à son terme » + image-clé « une spirale qui s'enfonce »
  (et non un cercle), ancrée sur 3 vérités (géographique / mythologique /
  magique). Marqueurs `💡 (proposition de sens) / ✅ (ancrages)`.
- **Gap** (roadmap §1.3 ligne « 11 ↔ 06 ») : `docs/histoire/06` ne dit
  jamais ce qu'EST la Boucle — il « renvoie en l'air vers 03 §3.6 ».
- `docs/histoire/03 §3.6` décrit les **mécaniques** de la Boucle (château
  qui se rejoue corrompu, Ruines, recyclage) mais **ne forwarde pas** vers
  la définition de fond §11.6.1 → la chaîne reste « en l'air ».

## Décision

§11.6.1 **suffit comme canon** (foyer canonique de la définition).
→ Travail limité à des **renvois croisés** (guidelines §3, chirurgical).
**Aucune** ratification de lore (pas de `💡→✅`), **aucun** canon nouveau
(donc pas d'`AskUserQuestion` requis pour cet item).

Périmètre verrouillé au lien **11 ↔ 06** ; un forward 1-ligne `03 §3.6 →
§11.6.1` est ajouté car §3.6 est précisément la cible « en l'air ».

## Étapes

1. [x] Audit (ci-dessus) — grounder chaque affirmation dans le code/docs.
2. [x] `06 §6.7.2` (« Lien à la trame » : *posent l'identité de la Boucle*)
   → renvoi vers `[11 §11.6.1]` (définition de la nature).
   → verify : le lecteur de 06 atteint la définition en 1 clic.
3. [x] `06` note de recyclage (✅ Recyclage en Boucle) — la mention de
   nature pointe aussi vers `[11 §11.6.1]` à côté de `[03 §3.6]`.
   → verify : la nature n'est plus « en l'air ».
4. [x] `03 §3.6` → forward 1-ligne vers `[11 §11.6.1]` (clôt le renvoi
   « en l'air »).
   → verify : 06 → 03 §3.6 → 11 §11.6.1 est une chaîne fermée.
5. [x] Roadmap : marquer ✅ Fait (2026-06-14) — matrice §1.3 (11↔06),
   table Phase 1 (ligne « Aligner Ch. 11 »), §1.5 (volet définition
   uniquement ; règle Boucle↔MP reste ouverte, item distinct).
   → verify : statuts cohérents, règle Boucle↔MP non marquée par erreur.
6. [x] Garde-fous : `node tools/check_doc_modules.js` vert (doc-only,
   pas de cache-bump, smoke non requis — guidelines §7/§8).

## Hors-scope (ne PAS faire)

- Flipper les marqueurs `💡` de §11.6.1 en `✅`.
- Écrire la **règle Boucle↔MP** (item §1.3 distinct, toujours `❓`).
- Réécriture massive de §11.6.1 ou §3.6.

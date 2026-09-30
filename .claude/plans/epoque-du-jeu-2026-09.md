# Époque du jeu (question Q5 de la revue 2026-09)

**Branche :** `ccr-4b80ea69-2nys9o` (PR #753 ouverte)
**Demande (utilisateur, 2026-09-30) :** « Je te laisse identifier l'époque la
plus appropriée. »
**Statut :** ✅ livré (PR #753)

## Constat

La bible se contredit, et le code penche nettement d'un côté :

- **02 §2.1** propose une uchronie « une génération après la Bataille »
  (Harry et Hermione adultes, figures tutélaires, école rebâtie).
- **05 §5.1** et le code en font des **élèves** : Harry, Hermione et Drago en
  6ᵉ année, Cho et **Cedric vivant** en 7ᵉ (`class: "Élève de …"`).
- En jeu, vivants : Rogue, Lupin, Slughorn, McGonagall, Hagrid, Trelawney,
  Kingsley, Bill, Aragog, et les Mangemorts Bellatrix, Dolohov, Greyback.
  Morts : Dumbledore (portrait), Sirius (esprit), Quirrell (ombre).
- Voldemort : « Affaibli », sans corps (ét. 9), puis « Ressuscité » (ét. 10).
  Il se **ré-assemble** au fond, il n'est pas au pouvoir.

Une date « 20 ans après » tue Rogue, Lupin, Bellatrix, Aragog et Cedric, et
vieillit les cinq héros canon : il faudrait réécrire des centaines de textes.
Aucune date canonique exacte ne convient non plus, puisque Cedric est vivant
et que Dumbledore est mort.

## Décision

**Uchronie de 1996-1997 : « l'Année de la Fêlure » (6ᵉ année de Harry).**
Un seul point de divergence, avec une conséquence :

1. **24 juin 1995, cimetière de Little Hangleton : le rituel est interrompu.**
   Harry arrache Cedric au sortilège de mort et le ramène avec le Portoloin
   **avant** que Voldemort ne reprenne corps. Cedric survit (une année de
   convalescence à Sainte-Mangouste, d'où sa 7ᵉ année en 1996-1997).
   Voldemort reste une ombre sans corps, qui « subsiste à peine ».
2. Les Mangemorts, **sans maître incarné**, s'organisent seuls : évasion
   d'Azkaban (janvier 1996), Département des Mystères où **Sirius tombe**
   (juin 1996). C'est le vide que Casimir Vantrell (Lot C) veut combler.
3. **Été 1996 : Dumbledore meurt** de la malédiction de la bague des Gaunt,
   que rien n'a pu contenir. Il n'y a pas de tour d'astronomie, et Rogue n'a
   jamais eu à le tuer : il reste professeur. Dumbledore guide désormais
   depuis son portrait.
4. **Septembre 1996** : Slughorn est revenu enseigner. En cours d'Histoire de
   la Magie, la Clé de Voûte se fend (03 §3.1). L'ombre de Voldemort est
   attirée par la fêlure et se ré-assemble au fond (ét. 9 → 10).

Ce qui colle sans rien changer : Rogue, Lupin, Slughorn, Aragog (mort au
printemps 1997 dans le canon), Greyback, Bellatrix, Dolohov, Sirius en
esprit, Dumbledore en portrait, les élèves de 6ᵉ et 7ᵉ année, et le Lieutenant
qui veut « ouvrir la faille pour qu'Il la traverse ».

## Étapes

- [x] Bible 02 §2.1, questions de cadrage, récapitulatif.
- [x] Bible 12 §12.9 : chronologie datée.
- [x] Bible 01 (« que l'on croyait fini ») et 05 (Cho, Cedric).
- [x] Codex `heros_cho` : Cedric est **revenu**, de justesse (le texte du
      Lot A disait l'inverse).
- [x] Bestiaire : lore de `voldemort_affaibli` / `voldemort_revenu` aligné
      (rituel interrompu, puis achevé au fond) ; anecdote d'`voldemort_affaibli`
      corrigée (le titre du tome était faux).
- [x] Revue : Q5 tranchée.
- [x] Tests (units, smoke), bump du cache, commit, état de la PR, push.

## Journal

- **2026-09-30** — Décision prise et appliquée.

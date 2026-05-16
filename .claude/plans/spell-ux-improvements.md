# Améliorations UX du système de sorts

Trois retours après validation de la base élémentaire.

## 1. Apprentissage d'un livre sur un seul joueur

**Constat.** `useItem()` (livre cliqué dans le sac) appelle
`_teachSpellToParty()` → le sort est appris par **tout le groupe actif**.
En duo, acheter un livre profite aux deux personnages d'un coup.

**Cible.** En duo, choisir **quel** personnage apprend le sort.

**Approche.**
- Nouveau helper `_teachSpellToOne(spellName, charIdx)` (jumeau de
  `_teachSpellToParty` mais sur un seul perso).
- `useItem()` cas `spellbook` :
  - solo (`partySize===1`) → apprend à Harry directement.
  - duo → affiche un prompt Harry / Hermione dans la grille
    d'inventaire (même patron visuel que `showEquipMenu`).
- `useItemFromChar(idx, charIdx)` (fiche perso) : déjà un `charIdx` →
  apprend au seul `charIdx` au lieu du groupe.
- Le livre n'est consommé qu'après apprentissage réussi. Si le perso
  ciblé connaît déjà le sort → message, livre conservé.
- Hors périmètre : `grantsSpell` d'équipement (non mentionné) reste
  inchangé.

> Vérif : `node tests/smoke.js` + nouveau cas — en duo, livre appris
> par Harry uniquement, Hermione ne l'a pas.

## 2. Filtre par type dans la liste des sorts

**Constat.** `openSpells()` / `openBattleSpells()` listent tous les
sorts du perso d'un bloc — jugé trop chargé.

**Cible.** Une barre de filtres en tête de modale ; un clic sur un type
n'affiche que les sorts de ce type.

**Taxonomie retenue** (décision utilisateur : par élément) :

| Filtre | Contenu |
|--------|---------|
| **Tous** | — |
| 🔥 **Feu** | sorts `element:"feu"` |
| ❄️ **Glace** | `element:"glace"` |
| ⚡ **Foudre** | `element:"foudre"` |
| ✨ **Lumière** | `element:"lumière"` |
| 🌑 **Ténèbres** | `element:"ténèbres"` (inclut vampirisme + malédiction) |
| ⚔️ **Physique** | `element:"physique"` (Wingardium, Diffindo, Sectumsempra) |
| 💚 **Soutien** | `effect` ∈ `heal` `support_regen` `shield` |
| 🔧 **Utilitaires** | `effect` ∈ `disarm` `steal` `teleport` |

`spellCategory(spell)` : soutien/utilitaire prioritaires sur l'élément
(un sort de soutien n'a pas d'`element`), sinon l'élément du sort.
Chip masqué si le perso n'a aucun sort de la catégorie → peu de chips
visibles en pratique (un perso connaît ~5 sorts).

**Approche.**
- `spellCategory(spell)` dans `data.js` (à côté de `SPELLS`).
- Barre de chips en tête de `#spell-list` (état mémorisé dans une
  variable de module `_spellFilter`, défaut `'tous'`).
- `openSpells` / `openBattleSpells` filtrent la boucle `c.spells` selon
  `_spellFilter`. Re-render au clic d'un chip.
- Chip masqué si le perso n'a aucun sort de cette catégorie.

## 3. Effet calculé affiché dans la fiche de sort

**Constat.** Depuis la PR #136, soins et DoT dépendent des stats du
lanceur (`INT`+`END` pour les soins, `INT`+`LCK` pour la fiabilité des
DoT). Mais `spell.desc` est une chaîne statique (« Soigne légèrement
(12 PV) ») : le joueur ne voit jamais la valeur réelle.

**Cible.** La fiche de sort affiche la valeur **effective** pour le
perso courant.

**Approche.**
- Extraire les formules en helpers purs (supprime la duplication
  actuelle des calculs inline) :
  - `healAmount(spell, c)` = `power + ⌊int/4⌋ + ⌊end/4⌋`
  - `spellDamage(spell, c)` = `power + ⌊mag/2⌋` (hors résist/faiblesse,
    inconnus tant que la cible n'est pas choisie)
  - réutilisés par `_spellHeal` / `_spellElementalDamage`.
- Helper d'affichage `spellEffectPreview(spell, c)` → courte chaîne :
  - soin : « ≈ X PV rendus »
  - dégâts : « ≈ X dégâts » (+ emoji élément)
  - DoT : « chance d'effet : Y % »
  - utilitaire / shield : pas de preview chiffrée.
- `openSpells` / `openBattleSpells` affichent cette ligne sous `desc`.

> Vérif : `node tests/smoke.js` — un cas qui assert que la preview de
> Reparo bouge avec l'INT/END du lanceur.

## Suivi

- [x] 1 — apprentissage mono-perso (`_teachSpellToOne`, `showLearnMenu`,
      `learnSpellbook`)
- [x] 2 — filtre par élément (`spellCategory`, `SPELL_FILTERS`,
      `_spellFilterBarHtml`) — chip ⚔️ Physique ajouté
- [x] 3 — effet calculé (`healAmount`/`spellDamage` extraits en helpers
      purs, `spellEffectPreview` affiché en fiche)
- [x] smoke `scenarioSpellUx` (T1 mono-perso, T2 filtre, T3 aperçu)
- [x] doc CLAUDE.md
- Note : T3 — l'aperçu se limite à une ligne chiffrée (soin/dégâts) ;
  la chance de DoT n'est pas affichée, pour ne pas re-charger la fiche
  (c'était le grief initial).
- Note : `node tests/smoke.js` — flakiness pré-existante sur
  `scenarioRelativeControls` / `scenarioNpcSprite3D` (dépendants du
  donjon aléatoire), sans rapport avec ce lot.

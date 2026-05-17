# Fix — texte de quête trop long en mobile (perte du bouton)

## Problème
`#npc-dialog-overlay` est une colonne flex centrée (`justify-content: center`).
Quand une page de dialogue PNJ a un texte long, `header + texte + actions`
dépasse la hauteur de la vue. Aucun conteneur ne scrolle → les boutons
d'action (`Suivant ▸`, `Accepter la quête`, `S'éloigner`) sont rejetés
hors de l'écran. L'utilisateur ne peut plus avancer le dialogue.

## Correctif
Rendre `.npc-dialog-text` scrollable à l'intérieur du flex :
`min-height: 0` + `overflow-y: auto`. Dans une colonne flex contrainte,
l'élément rétrécit et scrolle au lieu de pousser ses voisins dehors →
header et actions restent toujours visibles.

## Étapes
1. [x] CSS : `min-height:0; overflow-y:auto;` sur `.npc-dialog-text`
   → texte long scrolle, boutons visibles.
2. [x] `node tests/smoke.js` → suite verte.

## Amélioration UX — boîte de dialogue parchemin
Le scroll seul corrige l'accès au bouton mais les 3 éléments flottent
librement sur le backdrop. Passage à un vrai panneau encadré :
- HTML : wrapper `.npc-dialog-panel` autour de header/text/actions.
- CSS : panneau parchemin, `max-height:100%`, header `flex-shrink:0`,
  texte `flex:1 1 auto` scrollable, actions `flex-shrink:0`.
- Débordement impossible par construction.
3. [x] HTML : wrapper `.npc-dialog-panel` (IDs préservés → smoke OK).
4. [x] CSS : panneau + header/actions épinglés + scrollbar stylée.
5. [x] `node tests/smoke.js` → suite verte. Capture mobile validée.

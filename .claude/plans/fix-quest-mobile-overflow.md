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
1. CSS : ajouter `min-height:0; overflow-y:auto;` à `.npc-dialog-text`
   → vérif : texte long scrolle, boutons visibles.
2. `node tests/smoke.js` → vérif : suite verte.

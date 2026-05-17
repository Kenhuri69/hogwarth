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

## Découpage automatique des pages (geste unique « Suivant »)
Scroll + clic « Suivant » = deux gestes pour « lire la suite ». Pour
revenir à un seul geste, on découpe en amont les pages trop longues afin
qu'elles tiennent à l'écran sans scroll ; le scroll reste le filet de
sécurité (phrase unique > seuil).
- `_splitDialogPage(text, maxLen)` : scinde aux frontières de phrase
  (`. ! ? …`), sans couper un mot. Seuil `_DIALOG_PAGE_MAXLEN = 280`.
- `_npcDialogPages` retourne `{ pages, srcPages }` : `srcPages[i]` =
  index de la page d'origine → le mapping voix reste calé sur les pages
  d'origine (pas de décalage de sample audio).
- `_playPageVoice` joue la voix via `srcPages` et saute les sous-pages
  de continuation (pas de redémarrage du sample).
6. [x] `_splitDialogPage` + `_npcDialogPages`/`srcPages` + `_playPageVoice`.
7. [x] Smoke T6 (scénario PNJ) : manon 4 pages → 6 sous-pages, sans
   perte de texte, srcPages croissant. Suite verte. Capture validée.

## Point écarté — karaoké sans audio
Suspecté : texte grisé/illisible quand la voix est coupée. Vérification
de `karaoke.js` : `.kw` neutre par défaut (aucun assombrissement), et
`start()` n'applique `.spoken` que si la voix a réellement progressé
(`_sawProgress`). Sans audio le texte reste en couleur normale → pas de
bug, rien à corriger.

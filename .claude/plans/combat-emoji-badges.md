# Combat UX — emoji résiduels (badges de variante + frise d'initiative)

## Contexte
La quasi-totalité du combat utilise déjà des PNG (boutons d'action,
icônes de monstre, statuts). Deux surfaces affichent encore un **emoji
brut** qui détonne avec l'art (cf. capture utilisateur, ÉT.3, Féroce
Gobelin Rebelle) :

1. **Badge de variante sur le sprite ennemi** — `js/battle-ui.js:155-162`
   rend un glyphe emoji `✨ / 💜 / 🌑 / 🔴` selon la variante
   (shiny / ancient / darkness / fierce). Sur la capture : la **pastille
   🔴** flottant en haut-droite du gobelin.
2. **Frise d'ordre des tours (timeline)** — `js/ux-improvements.js`
   `computeTurnOrder()` ne stocke que `emoji: e.icon` pour les ennemis ;
   `renderTimeline()` (ligne 394) n'affiche une `<img>` que si `o.img`
   existe. Comme les ennemis n'ont jamais `o.img`, ils tombent toujours
   sur l'emoji — alors que **tous les monstres ont `imgSrc`**
   (`img/monsters/*.png`). Sur la capture : la **pastille rouge** (chip
   « 2 ») en haut.

## Décision
- **Badge de variante** : supprimer le glyphe emoji ; la pastille devient
  une **gemme circulaire dessinée en CSS** (couleur par variante, alignée
  sur `VARIANT_COLORS` d'`icons.js` + le `.variant-badge-darkness`
  existant). Communique « variante spéciale » par couleur/glow, sans emoji.
- **Timeline** : passer `img: e.imgSrc` dans `computeTurnOrder()` pour les
  ennemis → le portrait PNG du monstre s'affiche (cohérent avec les
  alliés). L'emoji reste un fallback ultime si un monstre n'a pas d'`imgSrc`.

Portée chirurgicale. On **ne touche pas** aux emoji du texte du Journal /
battle-log (🗡️🛡️…) : choix de style assumé du projet (cf.
`emoji-png-gaps.md`), non signalé par l'utilisateur.

## Étapes
1. `js/battle-ui.js` — remplacer le ternaire emoji par une pastille sans
   texte (`<span class="variant-badge variant-badge-${variant}">`).
   → vérif : plus de glyphe, la classe pilote le visuel.
2. `css/style.css` — donner à `.variant-badge` une forme de gemme
   (cercle 13px, bordure, glow) + classes `fierce/ancient/shiny`
   (`darkness` existe déjà).
   → vérif : 4 variantes distinctes, lisibles sur le sprite.
3. `js/ux-improvements.js` — `computeTurnOrder()` : ajouter `img: e.imgSrc`
   à l'entrée ennemie.
   → vérif : la frise affiche le portrait PNG de l'ennemi.
4. Bumps `?v=` (battle-ui.js, ux-improvements.js, style.css) dans
   `index.html` pour l'invalidation cache (PWA cache-first sur ?v).
   → vérif : nouvelles URL.
5. `node tests/smoke.js` vert.
   → vérif : non-régression.

## Notes
- Aucune assertion smoke ne lit ces emoji.
- `.variant-badge` est rendu uniquement quand `variant !== 'normal'` →
  invisible pour les ennemis communs (inchangé).

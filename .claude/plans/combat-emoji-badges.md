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

---

## Lot 2 — emoji du Journal / log de combat (demande utilisateur)

Le Journal (panneau `#combat-log-list`) et la boîte `#battle-log`
contiennent encore des emoji de statut/action (⚔️🛡️🔥☠️🩸❄️💫😱🌀…).
Le projet n'avait converti que les `addMsg` ayant un PNG (Lot 4 de
`emoji-png-gaps.md`) ; ces ~170 emoji de log restaient.

### Décision
Plutôt que d'éditer ~170 call-sites (risqué, diff énorme), **une seule
substitution centrale** `iconizeCombatLog(html)` (item-icons.js) applique
une table curée emoji→PNG, branchée aux **deux puits de rendu** :
`setBattleLog()` (battle-ui.js) et `logCombat()` (ux-improvements.js).

- Table = uniquement les emoji ayant un PNG **naturel** déjà présent dans
  `img/icons/` (statuts + ressources + atk/protego). Les décoratifs sans
  PNG (💥 crit, 🔰 résistance, ✨ transitions, 👁️ 🦁 🦌 ☀️…) restent en
  emoji — politique inchangée.
- Substitution par token (longest-first pour `🩹✨` → regen_ferula_max),
  pas de regex fragile. N'altère pas les `<img>` déjà injectés.

### Étapes
6. `js/item-icons.js` — ajouter `iconizeCombatLog(html)` + table curée.
   → vérif : pur, retourne le HTML avec `<img>` substitués.
7. `js/battle-ui.js — setBattleLog` + `js/ux-improvements.js — logCombat`
   appellent le helper (défensif `typeof`).
   → vérif : Journal et boîte de combat sans emoji convertibles.
8. `js/loader.js` MANIFEST : déclarer `iconizeCombatLog`.
9. Bumps `?v=` (item-icons.js, loader.js déjà inclus) + CACHE_VERSION.
10. `node tests/smoke.js` vert.

---

## Lot 3 — création des PNG manquants (zéro-emoji combat, demande utilisateur)

Inventaire des emoji de log NON encore convertis (scan des call-sites) :
réutilisables (PNG existant) vs à créer.

### Réutilisation (aucun asset à créer — étendre la table)
| Emoji | PNG existant |
|-------|--------------|
| 👁️ Legilimens | `img/icons/spells/legilimens.png` |
| 🧪 jet de potion | `img/icons/items/potion_m.png` |
| ☀️ vs morts-vivants | `img/icons/spells/lumos_solem.png` |
| 🦌 Patronus | `img/icons/spells/patronum.png` |
| 🌾 Récolte | `img/icons/spells/recolte_magique.png` |
| 💧 PM restitués | `img/icons/mp.png` |
| 🔎 Revelio | `img/icons/search.png` |
| 🌨️ Glacius tempête | `img/icons/gel.png` |

### Création (`tools/gen_combat_log_icons.py`, 48×48 RGBA, style status-icons)
| Emoji | Nouveau PNG | Visuel |
|-------|-------------|--------|
| 💥 crit / amplifié | `crit.png` | éclat explosif orange-rouge, cœur blanc |
| ✨ gain / transition | `sparkle.png` | étincelle 4 branches dorée |
| 🔰 résistance | `resist.png` | bouclier bleu (déflexion) |
| ⚡ Célérité | `celerity.png` | éclair cyan |
| ❌ échec / dissipe | `fail.png` | disque rouge + croix |
| 💨 esquive | `dodge.png` | bourrasque gris-cyan |
| 🐍 lifesteal Serpentard | `serpent.png` | serpent vert en S |
| 🌑 ténèbres / drain | `tenebres.png` | orbe sombre + croissant + halo violet |
| 🦁 Élan Gryffondor | `lion.png` | face de lion dorée |

### Étapes
11. `tools/gen_combat_log_icons.py` → 9 PNG dans `img/icons/`.
    → vérif : 9 fichiers RGBA 48×48 écrits.
12. Restructurer `_COMBAT_LOG_ICON_MAP` (item-icons.js) en **chemins
    complets** (pour pointer aussi vers `spells/`/`items/`) et ajouter les
    17 nouvelles entrées (8 réutilisées + 9 créées).
    → vérif (node) : chaque emoji-cible des sources est bien substitué ;
    les décoratifs typographiques (`−→≈`) intacts.
13. Bumps `?v=` item-icons.js + CACHE_VERSION ; précache SW des 9 PNG
    (img/ est en stale-while-revalidate, donc pas obligatoire, mais on
    documente). En pratique : pas d'ajout au PRECACHE (politique img/).
14. `node tests/smoke.js` vert.

### Laissé en emoji (aucun PNG, hors combat-log)
`🔒` (bestiaire — section verrouillée, `_miLocked`), `⚠️` (déverrouillage
Avada), `🪬` (Sceau du Voyageur, MP) : hors de la boîte/Journal de combat
principal montré par l'utilisateur ; non ciblés ce lot.

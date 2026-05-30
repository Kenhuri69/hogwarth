# Trous de la migration PNG — emoji UI résiduels

Suite à la revue « tout en PNG », plusieurs écrans affichent encore des
emoji littéraux (constatés sur captures mobiles). Ce plan ferme ces trous.

## Périmètre (emoji visibles à l'écran)

| Zone | Emoji | Cible PNG | Statut |
|------|-------|-----------|--------|
| Atelier — cartes items | 👑🧥👢💍📿 | `getItemIconHtml()` (PNG `voyageur_*` existants) | ☐ |
| Atelier — cartes sorts | 🪬🌌📍🌠 | `getSpellIconHtml()` (PNG déjà mappés) | ☐ |
| Atelier — onglets | 🧥🌌✨📜 | retirer emoji des labels | ☐ |
| Atelier — titre | ✨ | `atelier.png` (nouveau) | ☐ |
| Atelier — monnaie Essence | ✨ | `essence_outremonde.png` (nouveau) | ☐ |
| Atelier — monnaie Fragment | 🔹 | `fragment_outremonde.png` (nouveau) | ☐ |
| Atelier — badges coût | ✨ 🔹 | idem monnaie | ☐ |
| Réglages — bouton Portes | 🚪 | `door.png` (existant) | ☐ |
| Réglages — bouton Atelier | ✨ | `atelier.png` (nouveau) | ☐ |
| Réglages — bouton Aide | 📖 | `spellbook.png` (existant) | ☐ |
| Inventaire — onglet Sac | 🎒 | `backpack.png` (existant) | ☐ |
| Inventaire — onglet Besace | 🌿 | `besace.png` (nouveau) | ☐ |
| Inventaire — onglet Grimoire | 📖 | `spellbook.png` (existant) | ☐ |
| Inventaire — slots anneau | 💍 | `accessory.png` (existant) | ☐ |
| PNJ Slughorn — portrait | 🧪 | `_npc_prof_h.png` (placeholder existant) | ☐ |

## Hors-scope (assumé)
- Emoji dans les **messages de log** `addMsg()` de l'atelier (🩸🌌✨📜🏃⚔️) :
  texte transitoire, non montré dans les captures. À traiter séparément si voulu.
- Titres des modales **Verrou de Sang** / **Verrous résolus** (🩸) et
  sélecteur de monstre (👹) : autres modales, non montrées. PNG `verrou_de_sang.png`
  dispo si on veut les traiter plus tard.
- Cartes **Cosmétiques** (auras/skins, ✨) et **Souvenirs** (📜) : icônes
  abstraites sans PNG dédié — laissées telles quelles.
- Labels de **specialAction** PNJ (🧪🎁📖🕯️✨) : pattern uniforme sur tous
  les PNJ, non montré ; laissé pour cohérence.
- Vrai portrait Slughorn (Nano Banana) : le placeholder prof générique
  retire l'emoji ; le PNG dédié pourra le remplacer plus tard.

## Statut lot 1 : ✅ — `node tests/smoke.js` = 126 scénarios verts.

## Extension (demande « clairement aussi ») — lots structurels

_Statut lots 7-10 : ✅ — `node tests/smoke.js` = 126 scénarios verts._

7. ☑ **Modales Verrou de Sang** (atelier-voyageur.js) : titres 🩸 →
   `verrou_de_sang.png` ; picker monstre 👹 → `getMonsterIconHtml` ;
   statuts/monnaie (🏃⚔️🔹✨) → texte / `_ESS`/`_FRAG`.
8. ☐ **Cartes Cosmétiques (12) + Souvenirs (6)** : nouveaux PNG
   `img/icons/outremonde/<id>.png` (`tools/gen_outremonde_cosmetics.py`),
   câblés via `_outremondeIcon(id)`.
9. ☐ **Labels d'action PNJ** (npcs.js + npc-dialog.js) : 🧪🎁📖🕯️✨🛒💰
   → `<img>` (potion_m, gold, spellbook, scroll, larmes_phenix, shop_sign).
10. ☐ **Logs atelier** (`addMsg`) : 🩸🌌📜✨ → icônes PNG correspondantes.

### Laissé sciemment
- `scaled.name = '🩸 ' + name` (marqueur de combat rendu aussi sur canvas —
  un `<img>` n'y est pas rendable).

## Lot 4 — Log de combat/quêtes global (choix utilisateur : « seulement ceux
   qui ont un PNG »). ✅ — `node tests/smoke.js` = 126 scénarios verts.

Convertis (≈35 `addMsg`) vers PNG existant :
- drops/butin/matériaux → `getItemIconHtml(item)`
- sorts lancés/appris/amplifiés → `getSpellIconHtml(spell|name)`
- quêtes (nouvelle/étape/prête/terminée) → `quest.png`
- essence/fragment/verrou/larmes de phénix/Portus/vortex-soin → PNG dédiés
- groupe d'ennemis ⚔️ → `atk.png` ; grimoire/recette/page → `spellbook`/`scroll`

Laissés (décoratifs, aucun PNG naturel) : ✨ (set complet, gain de stat,
transition), 👁️, ✦, 🦂, 📦, 📈, 💥, 🔨, 💎, 🌑, 🌀 (écho).

## Étapes
1. ☐ `tools/gen_outremonde_icons.py` → génère 4 PNG 48×48 :
   `essence_outremonde.png`, `fragment_outremonde.png`, `atelier.png`, `besace.png`.
   Vérif : fichiers présents, 48×48 RGBA.
2. ☐ `js/atelier-voyageur.js` : helpers `_ESS`/`_FRAG`/`_ATELIER` icône HTML ;
   item cards → `getItemIconHtml`, spell cards → `getSpellIconHtml` ; titre,
   sous-titre monnaie, badges coût, onglets. Vérif : plus d'emoji dans le rendu.
3. ☐ `index.html` : boutons Réglages (Portes/Atelier/Aide) + onglets inventaire
   (Sac/Besace/Grimoire) en `<img class="ui-icon">`. Vérif : grep emoji = 0.
4. ☐ `js/inventory.js` : slots anneau 💍 → `accessory.png`. Vérif : grep.
5. ☐ `js/npcs.js` : `portraitImg: "img/npc/_npc_prof_h.png"` sur Slughorn. Vérif.
6. ☐ `node tests/smoke.js` vert. Commit + push sur `claude/image-emoji-png-review-HJHL8`.

## Lot 5 — Écrans visibles haute-priorité (best-effort « go next ») ✅
- index.html : boutons de combat **Garde** (🛡️ → protego.png) et **Objet**
  (🧪 → potion_m.png). Fuir (🏃) laissé : aucun PNG « fuite ».
- shop.js : titre boutique (🏪/🛒 → shop_sign.png ; textContent → innerHTML).
- ui-bestiary.js : drops du monstre (it.icon → getItemIconHtml).

Suivi possible (cohérent, non fait) : tooltips de stats `ux-improvements.js`
(⚔️🛡️🔮🌟🏃💪🧠❤️ → atk/def/mag/lck/agi/str/int/hp) — chantier « icônes de
stat partout », à faire d'un bloc pour éviter les demi-conversions.
`node tests/smoke.js` = 126 scénarios verts.

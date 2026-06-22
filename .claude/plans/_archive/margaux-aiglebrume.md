# Ajout du héros jouable — Margaux Aiglebrume

Cohorte **Le Cercle des Astres** (groupe `astres`), Maison **Serdaigle**.
Petite sorcière espiègle (chocolat au coin des lèvres), grimoire
« Les Sortilèges et Enchantements », baguette lançant une étincelle bleue.

## Étapes

1. **Portrait-médaillon** (`img/margaux.png` + `img/margaux-original.png`,
   128×128) — crop visage de la photo fournie + transplant de l'anneau
   doré de `celeste.png` (référence fille). → vérif : médaillon net, visage
   centré, gemmes bleu glacé. ✅
2. **Sprite plein corps** (`img/players/margaux.png`) — source PLEIN CORPS
   indisponible (seule une photo buste fournie). → repli silhouette
   vectorielle conservé (comportement documenté). Non enregistré dans
   `PLAYER_SPRITE_SRC` ⇒ pas de mise à jour du compte de héros dans
   `tests/scenarios/multiplayer.js`. ✅ (noté à l'utilisateur)
3. **Données** `CHARACTERS.margaux` (`js/data.js`) — Serdaigle, profil
   astromancienne (haute MAG/INT). → vérif : entrée valide. ✅
4. **Carte de sélection** dans le groupe `astres` (`index.html`),
   badge 9. → vérif : carte visible, sélectionnable. ✅
5. **Barks** `HERO_BARKS.margaux` (`js/hero-barks.js`) — voix espiègle
   Serdaigle. → cosmétique défensif. ✅
6. **Cache PWA** — bump `data.js`, `hero-barks.js`, `index.html` via skill
   `cache-bump`. → `node tools/check_cache_versions.js`. ✅
7. **Tests** — `node tests/units.js` ✅ (582 ok). `node tests/smoke.js`
   ✅ (214 scénarios verts). Fixtures mises à jour : barks 15→16
   (`misc.js`, `units.js`) + profil `HERO_VOICE.margaux` (`audio-sfx.js`).
8. **Doc narrative** (`docs/histoire/05-personnages-jouables.md §5`) —
   roster + table de combat + profil + récap (15→16, 10→11 originaux). ✅

## Statut : TERMINÉ ✅

## Décisions
- « Le Cercle des Astres » = cohorte existante (groupe 2), pas le champ
  `class`. Margaux y est ajoutée comme Serdaigle (banderole + robe sur la
  photo).
- Pas de sprite plein corps (source manquante) → vector fallback.

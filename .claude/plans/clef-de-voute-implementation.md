# Plan d'implémentation — Clé de Voûte des Quatre (ouverture & lore)

**Statut :** 🟦 plan d'implémentation — à dérouler lot par lot.
**Source narrative :** [`docs/histoire/01-synopsis-et-pitch.md`](../../docs/histoire/01-synopsis-et-pitch.md) §1.1-1.2 et [`docs/histoire/03-trame-principale.md`](../../docs/histoire/03-trame-principale.md) §3.1-3.3 (commit `29415d8`).

> Objectif : traduire en code les `💡 Pistes d'intégration` de la refonte du
> déclencheur. Le déclencheur — la **Clé de Voûte des Quatre** qui se fend en
> plein cours d'Histoire de la Magie — devient palpable dès l'écran d'intro,
> est rappelé par le portrait de Dumbledore, et se prolonge en contenu
> optionnel (quête d'éclats + stèle des Fondateurs).

---

## 0. Principes & garde-fous

- **La descente reste la seule colonne obligatoire** (cf. 03 §3.6). Tout ce qui
  est ajouté ici est **narratif ou optionnel** — aucun gating de l'escalier.
- **Zéro régression du flow existant** : l'intro accepte toujours
  `intro_tutoriel` et marque `seenNpcs.add('dumbledore')` (`intro.js:110-113`).
- **Cache PWA** (guidelines §8) : tout `js/**.js` modifié → bump `?v=N` dans
  `index.html` + `PRECACHE_URLS` (`sw.js`) + `CACHE_VERSION`. Dérouler le skill
  `cache-bump`. Les `.md`, `tools/**`, `audio/**`, `img/**` ne sont pas concernés
  par le bump JS (les assets passent par le cache à la demande du SW).
- **Test** (guidelines §7) : `node tests/smoke.js` vert à chaque lot ; ajouter
  les scénarios neufs dans le même commit.
- **Voix** : les nouvelles pages d'intro pointent sur des clés
  `dumbledore_intro_<n>` ; absentes de `_VOICE_SAMPLES` → **fallback silencieux**
  (`audio-music.js:321`, `playVoice` no-op si clé absente). Aucun blocage.

---

## Lot 1 — Cinématique d'intro (la scène du cours) 🎬

**But :** raconter le basculement sous les yeux du joueur, avant le choix de
Maison, sans toucher au moteur d'intro.

**Fichiers :** `js/npcs.js` (données), `js/intro.js` (déjà générique — **à ne pas
modifier** sauf besoin), `audio/voice/` (samples optionnels).

**Pourquoi quasi zéro code :** `showIntroScreen()` lit
`getNpcById('dumbledore').dialogues.greeting` comme un **tableau de pages**
(`intro.js:39-43`) et pagine automatiquement (`_renderIntroPage`,
`_advanceIntro`). Il suffit d'**enrichir le tableau `greeting`** de Dumbledore.

**Étapes :**
1. Dans `js/npcs.js`, remplacer les 2 pages de `dialogues.greeting`
   (`npcs.js:64-67`) par **4 pages** narratives :
   - **P1 — le quotidien** : le cours d'Histoire de la Magie, Binns, la classe
     assoupie, la Clé de Voûte sur son socle.
   - **P2 — la fêlure** : le son de glace, le givre, la lumière qui s'éteint.
   - **P3 — le basculement** : escaliers qui pivotent vers le bas, le portrait
     qui hurle, « même Binns se tait ».
   - **P4 — l'appel** : Dumbledore explique que la Clé de Voûte était le verrou,
     que les profs tiennent le haut, et confie la descente au héros.
   > Respecter §2.5 (brièveté : 2-4 phrases/page, voix « tu », plume soignée).
2. Le bouton final (« Accepter & Entrer à Poudlard ») et l'auto-accept de
   `intro_tutoriel` restent inchangés (`intro.js:76-77, 110`).
3. (Optionnel) générer `audio/voice/dumbledore_intro_3.ogg` et `_4.ogg` + les
   déclarer dans `_VOICE_SAMPLES` (`audio-music.js:103-105`). Si non générés :
   silencieux, karaoké muet — acceptable.

**Vérifier :**
- `node tests/smoke.js` (scénarios intro existants : 4 pages, bouton final
  présent à la dernière page, `intro_tutoriel` accepté). Ajouter une assertion
  « greeting compte 4 pages » si un scénario d'intro existe déjà.
- Manuel : nouvelle partie → 4 pages paginées « 1/4 … 4/4 » → choix de Maison.
- Bump cache **uniquement si** un `.js` change (ici `npcs.js` change → bump).

---

## Lot 2 — Dumbledore portrait (étage 1) rappelle la Clé de Voûte 🖼️

**But :** créer une continuité entre l'intro et la rencontre en jeu.

**Fichiers :** `js/npcs.js` (`dialoguesByQuest.intro_tutoriel.questOffer`,
`npcs.js:80-84`).

**Étapes :**
1. Retoucher `dialoguesByQuest.intro_tutoriel.questOffer` pour référencer la
   relique, p. ex. : *« Tu as entendu la pierre se fendre, toi aussi… La Clé de
   Voûte des Quatre tenait le château fermé sur ses profondeurs. Descends d'un
   étage — chaque pas vers le bas est un pas vers la fêlure. »*
2. Garder `questActive` / `questReady` tels quels (ils restent cohérents).
3. Synchroniser le sample voix si re-généré (`dumbledore_intro_tutoriel_offer*`)
   — sinon le texte affiché suffit (la voix de chaîne est optionnelle).

**Vérifier :**
- `node tests/smoke.js` (npc dialog) reste vert.
- Manuel : à l'étage 1, parler au portrait → le `questOffer` mentionne la Clé
  de Voûte ; accepter/descendre fonctionne comme avant.
- Bump cache (`npcs.js`).

---

## Lot 3 — Item collectible : l'Éclat de la Clé de Voûte 💎

**But :** matérialiser la relique brisée en objet de lore, support de la quête
du Lot 4.

**Fichiers :** `js/data.js` (`ITEMS`), `js/monsters.js` (drops),
`tools/icon_factory.py` + `js/item-icons.js` (icône, via skill `add-item-icon`).

**Étapes :**
1. Ajouter à `ITEMS` un objet **non-équipable** `eclat_voute` :
   `{ id, name:"Éclat de la Clé de Voûte", icon:"🔹", type:"material",
   rarity:"rare", desc:"Un fragment de la relique des Fondateurs. Il est froid,
   et il chuchote.", price:0 }`. (Type matière → ni équipable ni consommable ;
   compté par `_countItems`/`_countMaterial`.)
2. Le rendre **droppable une fois par tranche** : ajouter `drops:[{itemId:
   "eclat_voute", chance:1.0}]` à **un boss-jalon par tranche** —
   p. ex. un monstre de tranche A (ét. 1-3), un de B (4-6), un de C (7-10).
   Choisir des cibles déjà garanties pour ne pas rendre la quête infaisable.
   *Alternative* : coffres gated par étage (cf. livres de sorts) — à arbitrer.
3. Icône painterly via le skill **`add-item-icon`** (part SVG « gem/shard »,
   recette `eclat_voute`, halo `rare`, teinte glacée) → `img/icons_new/` +
   `ITEM_ICON_NEW_REGISTRY`.

**Vérifier :**
- `node tests/smoke.js` (inventaire / drops) vert ; ajouter un scénario : tuer
  la cible de tranche A → `eclat_voute` ajouté à l'inventaire.
- Icône visible dans le sac. Bump cache (`data.js`, `monsters.js`, `item-icons.js`).

> ❓ À arbitrer : drop-boss (garanti, simple) **ou** coffre gated (plus
> explorateur, risque d'introuvable). Défaut proposé : **drop-boss garanti**.

---

## Lot 4 — Quête optionnelle « Les Éclats de la Clé de Voûte » 📜

**But :** une quête de fil rouge optionnelle qui paie le déclencheur.

**Fichiers :** `js/quests-templates.js` (`QUEST_TEMPLATES`), `js/npcs.js`
(donneur), `js/quests.js` (logique déjà générique — types `floor`/`kill`/`item`
gérés, `quests.js:389`).

**Étapes :**
1. Ajouter un template `eclats_clef_voute` :
   ```js
   {
     id:"eclats_clef_voute", title:"Les Éclats de la Clé de Voûte",
     giver:"Albus Dumbledore",
     desc:"Rapporte trois éclats de la relique brisée. Reconstituée, elle
           dira ce qu'elle taisait.",
     objectives:[{ type:"item", itemId:"eclat_voute", amount:3,
                   progress:0, completed:false }],
     reward:{ xp:300, gold:150, /* item ou stat de lore */ },
     location:"Hall d'entrée (étage 1)"
   }
   ```
   - Type `item` → re-comptage live depuis l'inventaire (`quests.js:389-391`),
     consommation à la remise (comme `mandragore_pomfresh`).
2. Donneur : **Dumbledore** (l'ajouter à `questsGiven`/`questsTurnedIn`,
   `npcs.js:59-62`) en quête **hors-chaîne** (pas de `prereq`, pour ne pas
   gêner la chaîne d'épreuves existante), **ou** un PNJ lore dédié. Défaut :
   Dumbledore, sans `prereq`.
3. Dialogues `dialoguesByQuest.eclats_clef_voute` (offer/active/ready) côté
   `npcs.js`, registre soutenu.

**Vérifier :**
- `node tests/smoke.js` (quests) : accepter, collecter 3 `eclat_voute`,
  remettre → récompense distribuée, éclats consommés. Ajouter ce scénario.
- Manuel : la quête n'apparaît pas comme bloquante ; l'escalier ne dépend
  d'aucune quête.
- Bump cache (`quests-templates.js`, `npcs.js`).

---

## Lot 5 — Stèle d'énigme des Fondateurs 🗿

**But :** un relais de lore léger (donnée pure, risque minimal) vers le §2.2.

**Fichiers :** `js/riddles.js` (`RIDDLES`).

**Étapes :**
1. Ajouter une entrée `r_clef_voute` au tableau `RIDDLES` (forme existante :
   `{ id, question, choices[], answer, rewardHint }`, `riddles.js:14`) :
   - **question** : *« Quatre sorciers unirent leur magie pour sceller, sous
     l'école, ce qu'elle fut bâtie pour oublier. Comment nomme-t-on ces
     bâtisseurs ? »*
   - **choices** : `['Les Mangemorts', 'Les Fondateurs', "L'Ordre du Phénix",
     'Les Aurors']` — **answer: 1**.
   - **rewardHint** : *« La pierre reconnaît le nom des Quatre, et coulisse. »*
2. Aucune autre modif : les stèles piochent `RIDDLES` automatiquement
   (`dungeon.js` → `runeStele`).

**Vérifier :**
- `node tests/smoke.js` (stèle / `answerSteleRiddle`) reste vert.
- Manuel : une stèle peut tirer la nouvelle énigme ; bonne réponse = ouverture.
- Bump cache (`riddles.js`).

---

## Lot 6 — Documentation & cohérence 📚

**Étapes :**
1. Mettre à jour [`docs/histoire/03-trame-principale.md`](../../docs/histoire/03-trame-principale.md)
   §3.1 : passer la quête d'éclats de `💡 (non implémentées)` → `✅` une fois le
   Lot 4 livré.
2. Compléter ce plan (cocher les lots, noter écarts).
3. Tenir le `CLAUDE.md` à jour si un nouveau type d'item (`material` non encore
   listé) ou une nouvelle quête de fil rouge mérite mention.

**Vérifier :** relecture ; cohérence ch01/02/03/04 ; pas de contradiction sur
« la descente est la seule colonne obligatoire ».

---

## Points à trancher avant de coder (❓ hérités de 03 §3.1)

1. **Cours** : Histoire de la Magie (proposé) vs Étude des Runes. → impacte le
   texte des pages d'intro (Lot 1) uniquement.
2. **Implication du héros** : témoin / impliqué involontaire / résonance de
   Maison. Si « résonance de Maison » est retenu → variante de texte P2 selon
   `chosenHouse` dans `intro.js` (petit ajout conditionnel). Défaut : **témoin**
   (zéro branchement).
3. **Source des éclats** (Lot 3) : drop-boss garanti vs coffre gated.
4. **Donneur de la quête d'éclats** (Lot 4) : Dumbledore hors-chaîne vs PNJ lore
   dédié.
5. **Voix** : génère-t-on les samples `dumbledore_intro_3/4` (et les dialogues
   de la nouvelle quête) ou s'appuie-t-on sur le fallback silencieux ?

---

## Ordre de livraison recommandé

`Lot 1` (impact immersif maximal, coût minimal) → `Lot 2` → `Lot 5` (data pure,
sûr) → `Lot 3` → `Lot 4` → `Lot 6`. Chaque lot : code → `smoke.js` →
`cache-bump` → commit. Un commit par lot pour une review lisible.

## Critères de succès global

- [ ] L'intro raconte la scène du cours en pages paginées, puis choix de Maison.
- [ ] Le portrait étage 1 référence la Clé de Voûte.
- [ ] `eclat_voute` existe, a une icône, droppe une fois par tranche.
- [ ] La quête `eclats_clef_voute` se complète sans bloquer la descente.
- [ ] La stèle peut poser l'énigme des Fondateurs.
- [ ] `node tests/smoke.js` vert ; cache bumpé ; docs à jour.

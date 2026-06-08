# ÉTAPE 2 — Plan d'implémentation (suite ch05 & ch08)

**Statut :** 🟩 en cours d'implémentation (L1→L5)
**Branche :** `claude/go-ch05-ch08-impl-0SrK1`
**Pré-requis :** ÉTAPE 1 livrée (contenu narratif ch05/ch08, commit `d338297`).

> ### Journal d'avancement (2026-06-08)
> - **L1 — Socle barks** : ✅ `js/hero-barks.js` (registre 13 héros + `pickHeroBark`
>   pur + orchestrateur `heroBark`), `barksEnabled` (state + sérialisé), MANIFEST,
>   chargement `index.html` après `data.js`, cache bump.
> - **L2 — Hooks combat** : ✅ bossAppear (`startBattle`), crit phys (`executeAttack`),
>   crit sort (`castSpellInBattle`), allyDown (`enemyTurn`), levelUp (`checkLevelUp`).
> - **L3 — Hooks méta** : ✅ palier Maison (`checkHouseLevelUp`), transition de
>   tranche (`_maybePlayTierTransition`).
> - **L5 — Workflow** : ✅ CLAUDE.md + skill `add-playable-character` + checklist §5.5.5.
> - **L4 — Texte pré-Voldemort** : ✅ cadre générique de Dumbledore (fallback
>   `_applySignatureVoldemortLever`, 08 §8.8.1) quand aucune Signature n'a parlé,
>   + réplique post-victoire plus froide si `slythPactChoice === 'pact'`
>   (`showVictoryScreen`, style `.victory-speech-cold`). Smoke T5/T6.
> - **L6 — Toggle UI** : ✅ bouton `#btn-barks` (barre de commandes, à côté de
>   🗣️) + `toggleBarks()`/`_updateBarksBtn()` (`ui-settings.js`), persistance
>   localStorage `hogwarts_rpg_barks_enabled` + sync `updateUI`. Smoke L6.
> - **L7 — Voix parlées** : ✅ `AudioSystem.speakBark(text, voiceKey)`
>   (`audio-sfx.js`) — OGG dédié si produit (`audio/voice/<key>_<event>.ogg`,
>   `_VOICE_SAMPLES`), sinon repli SpeechSynthesis FR ; gardé par `voiceEnabled`.
>   `heroBark` route sa voix via `speakBark`. Production des OGG = asset différé
>   (binaire, hors-scope code). Smoke L7 (gate + routage OGG).
>   **L7b — Profils de voix par héros** : ✅ registre `AudioSystem.HERO_VOICE`
>   (13 héros : `pitch`/`rate`/`gender` calés sur genre+tempérament canon) +
>   `_pickFrVoice(gender)` (préférence voix fr-FR du bon genre, best-effort,
>   cache). `speakBark` dérive `heroKey` de `voiceKey` et applique le profil →
>   chaque héros a un timbre distinct **sans aucun asset binaire**. Smoke L7b
>   (couverture 13 héros, plage SpeechSynthesis, ≥5 timbres distincts, défensif).
>   **L7c — Modulation par émotion** : ✅ table `AudioSystem.EMOTION_VOICE`
>   (multiplicateurs `pitch`/`rate` par événement : `crit` triomphant, `allyDown`
>   grave, `bossAppear` tendu, beats de trame solennels…) + helper pur
>   `_barkVoiceParams(voiceKey)` = profil héros × émotion, borné à la plage
>   valide. `speakBark` route via ce helper. Un même héros change d'intonation
>   selon l'événement, sa personnalité (base) conservée. Smoke L7c (crit > allyDown,
>   événement/héros inconnu → neutre, bornage).
>   **L7d — Jitter humanisant** : ✅ `_voiceJitter(params, rng)` applique un léger
>   bruit additif (±`_PITCH_JITTER` 0.05 / ±`_RATE_JITTER` 0.04) borné à la plage,
>   appliqué dans `speakBark` par-dessus `_barkVoiceParams` → deux énoncés du même
>   héros/événement ne sonnent jamais exactement pareil (casse l'effet robotique).
>   `rng=0.5` ⇒ inchangé (déterminisme préservé hors jitter). Smoke L7d (centré,
>   ±borné, variabilité, plage).
> - **L8 — Étages-scènes fixes** : ✅ `heroBarkScripted(heroKey, event)`
>   (`hero-barks.js`, ne parle que si le héros visé est présent/vivant,
>   one-shot) + **les 5 beats de trame (05 §5.4.2)** : Céleste à la 1ʳᵉ fontaine
>   glacée (`useFountain`, ét. 2), **Cedric à la transition 3↔4 « on quitte
>   l'école » (`leaveSchool`, `_maybePlayTierTransition`, prioritaire sur le bark
>   générique de tranche)**, Drago au 1ᵉʳ Mangemort (`startBattle`), Anastasia &
>   Maxence avant Voldemort selon flag (`_applySignatureVoldemortLever`).
>   Smoke L8 + units (registre). Le **Refuge-repos Poufsouffle** (mécanique de
>   gameplay, §3.3) reste volontairement différé (effort élevé, P3) — seul le
>   *beat* Poufsouffle de §5.4.2 (transition 3↔4, Cedric) était dû et est livré.

> Ce plan traduit en travail technique les ajouts narratifs des chapitres 05 et 08.
> **Principe** : réutiliser l'existant, ne rien dupliquer, garder ~85 % de trame
> commune, respecter le ton aventure → sombre, et **ne pas régresser** (smoke vert).

---

## 0. État des lieux — ce qui est DÉJÀ fait (✅, à ne pas refaire)

> Inventaire vérifié dans le code / plans existants. Le gros de la trame est câblé.

| Brique | Statut | Source |
|--------|--------|--------|
| Déclencheur Clé de Voûte (intro 4 pages, escaliers bas, froid) | ✅ | `intro.js`, `clef-de-voute-implementation.md` |
| Éclats `eclats_clef_voute` (3 drops jalons) + stèle `r_clef_voute` | ✅ | `quests-templates.js`, `riddles.js` |
| Chaîne Dumbledore `dumbledore_*` | ✅ | `quests-templates.js` |
| 4 Quêtes Signature (templates, déverrouillage `chosenHouse`+étage) | ✅ | `house-signature-quests-impl.md` (Lots 1-10) |
| Flags `gryff/slyth/raven/poufSignatureDone` + `slythPactChoice` (sérialisés) | ✅ | `save.js` |
| Leviers Voldemort one-shot (terreur off / weak révélée / lifesteal\|debuff / Espoir partagé) | ✅ | `battle.js`, `battle-spells.js` |
| Choix gris du Pacte (`turnInSlythSignature(pact\|defiance)`) | ✅ | `npcs.js` |
| Couche dialogues PNJ `dialoguesByHouse` | ✅ | `npcs.js` + `npc-dialog.js` |
| Arc Manon (Revelio, 5 pages, fusion, Acte III) | ✅ | `manon-grimoire-*.md` |
| Lux Aeterna, Chasse Sans Tête, purges Gardien | ✅ | plans dédiés |
| 13 héros (`CHARACTERS`), solo/duo, allocation/équipement/sorts | ✅ | `data.js`, `main.js` |
| Tests smoke par signature (`scenarioHouseSignature<House>`) | ✅ | `tests/scenarios/houses.js` |

➡️ **Conclusion** : l'ÉTAPE 2 livre principalement **la voix des héros** (barks),
durcit les **dialogues conditionnels (Maison × personnage)**, tranche les **❓**, et
met à jour le **workflow d'ajout de perso**. Le reste est de la **finition**.

---

## 1. Variables / flags nécessaires

> Règle d'or projet : **pas de flag redondant** avec `chosenHouse`/`houseTier`/les
> `<house>SignatureDone` existants. Le strict minimum neuf, et **transient si possible**.

### 1.1 Nouveaux (à ajouter)
| Nom | Portée | Sérialisé ? | Rôle |
|-----|--------|-------------|------|
| `HERO_BARKS` | const globale (`js/hero-barks.js`) | non (données) | Registre des répliques par héros × événement (+ variantes Maison). |
| `barksEnabled` | `state.js` (bool, défaut `true`) | **oui** (préf.) | Toggle joueur « voix des héros » (option, comme mute/voice). |
| `_barkSeen` | runtime (Set/Map, `state.js`) | non | Anti-répétition par session (one-shot événements rares). |
| `_barkCooldown` | runtime (number) | non | Évite le spam (1 bark / N secondes max). |

### 1.2 À NE PAS créer (déjà couvert)
- État Signature → `<house>SignatureDone`, `slythPactChoice` (existants).
- Maison active → `chosenHouse`. Maison **canon** d'un héros → lue sur
  `CHARACTERS[key].class` (« Élève de <Maison> »). Aucun flag neuf requis.
- `headlessHuntMember`, « Hiver Clair » → existants.

**Vérif :** `node tests/units.js` reste vert ; un round-trip save (`_serializeState`
→ `_applyState`) préserve `barksEnabled` (ajouter 1 assert smoke).

---

## 2. Système de dialogues conditionnels (Maison × personnage)

> Deux couches **distinctes et complémentaires** :
> - **PNJ** : `dialoguesByHouse` (✅ existe) — Dumbledore/chefs adaptent leur texte au
>   `chosenHouse` + `<house>SignatureDone`. **Rien à refaire**, sauf brancher les
>   répliques pré-Voldemort déjà rédigées en [08 §8.8](../../docs/histoire/08-quetes-et-sous-intrigues.md).
> - **Héros (NOUVEAU)** : barks courts, voix du perso ([05 §5.4](../../docs/histoire/05-personnages-jouables.md)).

### 2.1 Registre `HERO_BARKS` (`js/hero-barks.js`, nouveau module)
```js
// Données pures, inertes au runtime tant que non consommées.
const HERO_BARKS = {
  harry: {
    bossAppear: ["Bon. On fait comme d'habitude — on tient, on frappe."],
    crit:       ["Ça, c'était pour rester poli."],
    allyDown:   ["Debout ! On n'a pas fini, toi et moi !"],
    levelUp:    ["Encore un cran. On descend plus loin."],
    // variantes de TENSION quand la Maison canon du héros ≠ chosenHouse :
    houseTension: { Serpentard: ["Un raccourci, vraiment ? La dernière fois…"] }
  },
  // … 13 héros, 4-6 événements chacun (cf. 05 §5.4)
};
```
- **Résolution** : `pickHeroBark(heroKey, event, ctx)` (pur) →
  1. cherche `HERO_BARKS[heroKey][event]` ;
  2. si `ctx.houseTensionActive` (Maison canon du héros ≠ `chosenHouse`) et qu'une
     variante `houseTension[chosenHouse]` existe, la **préférer** (rejouabilité) ;
  3. filtre via `_barkSeen` (one-shot) ; renvoie `null` si rien → **call-site silencieux**.
- **Affichage** : réutiliser `UX.logCombat(html, kind)` (combat) et `addMsg()`
  (exploration) — **pas** de nouvelle UI. Voix parlée **optionnelle** via
  `AudioSystem.playVoice('<heroKey>_<event>')` si le sample OGG existe (défensif).

### 2.2 Garde-fous (cohérents avec l'archi défensive du projet)
- Tous les call-sites : `if (window.barksEnabled && window.HERO_BARKS) { … }`.
- Ajouter `hero-barks.js` au **MANIFEST loader** (`kind:'obj'`, `optional:true`).
- Chargé dans `index.html` après `data.js`, avant `battle.js`. **Bump cache PWA**
  obligatoire (nouveau JS + `index.html` modifié → skill `cache-bump`).

**Vérif :** `pickHeroBark` testé en unitaire (`tests/units.js`) : résolution
event/tension/one-shot/`null`. 1 scénario smoke (bark loggé sur crit, silencieux si
`barksEnabled=false`).

---

## 3. Intégration gameplay (étages, événements, boss)

### 3.1 Points d'ancrage des barks (call-sites)
| Événement | Hook existant | Fichier |
|-----------|---------------|---------|
| Apparition de boss | `startBattle()` (test `enemy.epic`) | `battle.js` |
| Crit physique décisif | `executeAttack()` (branche crit) | `battle.js` |
| Crit de sort | `rollSpellCrit()` | `battle-spells.js` |
| Allié KO | `triggerDeath()` / passage hp≤0 | `battle.js`/`battle-death.js` |
| Level-up | `checkLevelUp()` | `battle-rewards.js` |
| Palier de Maison | `checkHouseLevelUp()` | `main.js` |
| Transition de tranche (3↔4, 6↔7, 13↔14) | `_maybePlayTierTransition()` | `movement.js` |
| Beats de trame scénarisés (05 §5.4.2) | `handleCellEntry`/quête | `movement.js`/`quests.js` |

> Chaque hook = **1-3 lignes** défensives appelant `pickHeroBark` + affichage. Aucun
> n'altère la logique de combat (pur cosmétique).

### 3.2 Répliques pré-Voldemort déjà rédigées → brancher
Les overrides de [08 §8.8.1](../../docs/histoire/08-quetes-et-sous-intrigues.md) (Dumbledore
selon `gryffSignatureDone` / `slythPactChoice`) : vérifier qu'ils sont lus dans
`startBattle(voldemort_revenu)` via `dialoguesByHouse`. Les **leviers** mécaniques
existent déjà (✅) ; il reste à s'assurer que **le texte** suit le flag.

### 3.3 Arbitrages ❓ (étendre la trame — optionnel, plus lourd)
| ❓ | Effort | Recommandation |
|----|--------|----------------|
| Raccourcis Serpentard (transitions alternatives) | élevé (movement/dungeon) | **Différer.** Le proxy `kill`/`item` actuel suffit. |
| Escorte/vague/refuge-repos Poufsouffle | élevé | **Différer.** Proxy `herb`/`kill`/`item` actuel suffit ; à terme, lier le Refuge à la mécanique fontaine. |
| Allié PNJ combattant (Sirius, elfe) | élevé (système neuf) | **Hors-scope** (cf. [03 §3.5](../../docs/histoire/03-trame-principale.md)). Garder buff passif. |
| Étages-scènes fixes (beats écrits garantis) | moyen | **P2.** Épingler 1 beat à ét. 1/4/11 sans casser le procédural. |

---

## 4. Gestion duo vs solo

> Source de vérité : `partySize` (1|2) + `party[0..1]`. Or/inventaire/XP partagés.

### 4.1 Règles de prise de parole (barks)
- **Solo** : seul le héros présent parle. Pas de bark `allyDown` (pas d'allié).
- **Duo** :
  1. **Locuteur par défaut** = `currentBattleChar` (héros actif) pour crit/level-up.
  2. **`allyDown`** = dit par le héros **survivant** à propos du tombé.
  3. **Bark de tension** (Maison canon ≠ `chosenHouse`) = priorité au héros dont la
     Maison canon **diffère** (récompense rejouabilité, 05 §5.4.3).
  4. **Anti-double-parole** : un seul bark par événement (cooldown `_barkCooldown`) —
     si les deux héros sont éligibles, choisir 1 (locuteur actif > survivant > tension).
- **Indicateur de tour** déjà masqué en solo (✅) → aucun impact UI neuf.

**Vérif :** smoke duo (bark unique sur crit, pas de double) + smoke solo (pas de
`allyDown`, jeu fonctionnel `barksEnabled` on/off).

---

## 5. Mise à jour de la règle d'ajout de personnage (workflow dev)

> La **règle narrative** est posée en [05 §5.5](../../docs/histoire/05-personnages-jouables.md).
> L'ÉTAPE 2 la **branche dans le workflow technique** pour qu'un futur ajout n'oublie
> ni la voix ni la doc.

- [ ] **Skill `add-playable-character`** : ajouter une étape « **6. Barks (optionnel)** :
      ajouter `HERO_BARKS[<key>]` (4-6 événements + `houseTension`) ; rappeler le
      **bump cache PWA** et le `MANIFEST` loader. » + une étape « **7. Doc** : §5.0,
      §5.0.1, profil §5.1/§5.2 complet, checklist §5.5.5 ».
- [ ] **`CLAUDE.md`** (section « Ajouter un nouveau personnage jouable ») : renvoyer
      vers [05 §5.5](../../docs/histoire/05-personnages-jouables.md) comme **règle normative**
      et mentionner `js/hero-barks.js` + `barksEnabled` dans la structure des fichiers.
- [ ] **Checklist §5.5.5** : ajouter une ligne « barks renseignés ou explicitement
      omis » + « profil doc complet (tous les champs de la convention) ».

**Vérif :** relecture croisée — la skill, CLAUDE.md et §5.5 ne se contredisent pas.

---

## 6. Priorisation & lots

| Lot | Contenu | Priorité | Dépend de | Vérif |
|-----|---------|----------|-----------|-------|
| **L1 — Socle barks** | `js/hero-barks.js` (registre + `pickHeroBark`), `barksEnabled`, MANIFEST, chargement, **cache bump** | **P0** | — | `units.js` (résolveur) ; smoke crit on/off |
| **L2 — Hooks combat** | barks sur bossAppear/crit/allyDown/levelUp (battle.js, battle-spells, battle-rewards) | **P0** | L1 | smoke duo (unique) + solo |
| **L3 — Hooks méta** | barks palier Maison + transitions de tranche + beats trame (05 §5.4.2) | **P1** | L1 | smoke transition |
| **L4 — Texte pré-Voldemort** | brancher overrides Dumbledore [08 §8.8.1] sur les flags (texte ; leviers déjà ✅) | **P1** | — | smoke signatures (réplique présente) |
| **L5 — Workflow** | MAJ skill `add-playable-character` + CLAUDE.md + §5.5.5 | **P1** | — | relecture |
| **L6 — Option UI** | bouton/toggle « voix des héros » (barre de commandes, à côté de 🗣️) | **P2** | L1 | smoke toggle |
| **L7 — Voix parlées** | samples OGG `audio/voice/<key>_<event>.ogg` (défensif, fallback silencieux) | **P2** | L1 | manuel |
| **L8 — Arbitrages ❓** | étages-scènes fixes / Refuge-repos (si désirés) | **P3** | décision produit | dédié |

> **Chemin critique recommandé** : L1 → L2 (la voix des héros en combat, gain
> émotionnel max pour effort min) → L4/L5 → reste optionnel.

---

## 7. Suggestions d'assets

> ✅ existe / 🆕 à produire. Réutiliser les pipelines documentés (skills `add-item-icon`,
> `add-playable-character` ; scripts `tools/gen_*`).

| Asset | Statut | Outil / note |
|-------|--------|--------------|
| Portraits des 13 héros (`img/<key>.png` + `-original`) | ✅ | déjà livrés |
| **Textes de barks** (FR) | 🆕 | rédactionnel — la « production » réelle de L1 (pas un asset graphique) |
| Voix OGG des barks (`audio/voice/`) | 🆕 P2 | optionnel ; sinon `speakSpell`/synthèse. Volumineux → différer |
| Icône relique **Bannière de Godric** (`trinket` anti-`fear`) | 🆕 | skill `add-item-icon` (part `flag`/`banner`, halo legendary, emblème `lion`) |
| Icône **Langue-de-plomb** / **Codex de Rowena** / **Médaillon de Helga** | 🆕/vérifier | skill `add-item-icon` (vérifier d'abord `ITEM_ICON_NEW_REGISTRY`) |
| Icône **Éclat de la Clé de Voûte** (`eclat_voute`) | vérifier | si manquante : `add-item-icon` (part gem/shard, tint givre) |
| Icône toggle « voix des héros » (si L6) | 🆕 P2 | cohérent avec ♪/🗣️ existants |

---

## 8. Garde-fous transverses (rappel guidelines)

- **§7 test** : tout lot touchant le JS → `node tests/smoke.js` vert avant commit ;
  ajouter le scénario de couverture **dans le même commit**.
- **§8 cache** : tout lot touchant `js/**`/`css/**`/`index.html` → bump `?v=N`
  (index.html + `PRECACHE_URLS`) + `CACHE_VERSION` → skill `cache-bump` +
  `node tools/check_cache_versions.js --base origin/master`.
- **§5 plan** : ce fichier reste vivant — cocher les lots au fur et à mesure.
- **§3 chirurgie** : barks = surcouche défensive `if (window.barksEnabled)` ; aucune
  modification de la logique de combat/quête existante.

---

## 9. Objectifs (rappel) ↔ comment ce plan y répond

| Objectif | Réponse du plan |
|----------|-----------------|
| Renforcer l'attachement émotionnel | L1-L3 : la **voix** des 13 héros en jeu (barks par événement). |
| Maximiser l'impact du choix Maison/héros | L4 (réplique+levier pré-Voldemort selon flag) + barks de **tension** Maison canon ≠ `chosenHouse` (rejouabilité). |
| ~85 % de trame commune | Aucune branche neuve ; barks = cosmétique ; Signatures déjà ✅ et optionnelles. |
| Ton aventure → sombre | Barks et choix **gris** (08 §8.8) calés sur le registre par tranche (04). |

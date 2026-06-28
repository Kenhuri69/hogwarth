# Révision du Système de Quêtes — Spécifications & Plan d'Implémentation

> Statut : **plan vivant** (guidelines §5). Étape 1 = specs & contenu narratif.
> Étape 2 = plan d'intégration. Aucune ligne de code n'est encore écrite — ce
> document est le livrable de conception, à amender à chaque étape franchie.
> Branche de travail : `claude/hogwarth-quest-system-vu4fem`.

---

## 0. État des lieux (ce qui existe DÉJÀ — à ne pas réinventer)

Audit du code réel (`quests.js`, `quests-templates.js`, `npcs-*.js`,
`npc-dialog.js`, `profile.js`, `battle-spells.js`, `inventory-core.js`).
Plusieurs « problèmes à résoudre » de la demande sont **partiellement déjà
traités** — la révision doit *renforcer*, pas reconstruire.

| Brique existante | Où | Implication pour la révision |
|---|---|---|
| **78 templates de quêtes** | `quests-templates.js` | Catalogue mûr ; on ajoute peu, on réordonne. |
| **Déblocage par prérequis** (`prereq`) | chaînes Dumbledore/Slughorn/Manon/Maison | L'ordre narratif EXISTE déjà par chaînage — à compléter, pas à créer. |
| **Gating d'étage** (`minFloor`) | quêtes Boucle 11+ | Mécanisme prêt à étendre aux quêtes early. |
| **Gating de Maison** (`unlockHouseSignatureQuest`, tiers 12/17) | `quests.js` | Déblocage par progression déjà en place. |
| **Cooldown répétable** (`repeatable.everyLevels`, `lastQuestCompletion`) | `quests.js` | Réutilisable tel quel. |
| **Spawn garanti des cibles kill** | `_ensureActiveKillQuestTargets(floor)` (`dungeon-spawning.js:101`) | Une quête kill **trouve toujours sa cible** sur l'étage courant. Le « monstre inaccessible » est déjà mitigé au spawn — le vrai problème restant est l'**offre trop précoce** (cf. §2). |
| **Arc Manon (5 quêtes)** | `manon_secret→pardon→revelio→grimoire→acte3` | Lien père (Lupin) déjà présent en Acte I ; finale (Acte III) centrée **mère** (Élara, givre). |
| **Pipeline élémentaire additif** | `_artifactElemBonus` + `_envElemBonus` (`battle-spells.js:660-665`) | Point d'injection **propre** pour un buff de maîtrise élémentaire. |
| **Profil cosmétique zéro-héritage** | `profile.js` (`hogwarts_rpg_profile`) | ⚠️ Règle cardinale : le profil **inter-parties** n'octroie AUCUN avantage. Les buffs élémentaires doivent vivre **dans la partie** (save), pas dans le profil cross-run. Cf. §5. |

💡 **Conséquence de cadrage** : la demande suppose des quêtes « données en bloc,
trop tôt, avec monstres inaccessibles ». Le code montre que le **spawn** est déjà
sécurisé et que le **chaînage** existe. Les leviers réels sont : (1) **étaler
l'OFFRE** (un PNJ ne propose qu'une quête active à la fois) ; (2) **floor-gater
l'amorce** des chaînes dont la cible apparaît bien plus bas ; (3) **approfondir
les textes** ; (4) **réécrire la finale de Manon** vers le père ; (5) **livres
élémentaires + section profil**.

---

# ÉTAPE 1 — Spécifications & Contenu Narratif

## 1. Réorganisation globale des quêtes (ordre narratif progressif)

### 1.1 Structure en 3 strates (principales / signature / secondaires)

| Strate | Définition | Déblocage | Exemples |
|---|---|---|---|
| **Principales** (fil rouge) | Trame Dumbledore + climax | `prereq` chaîné, 1 active à la fois | `intro_tutoriel → dumbledore_eveil → _courage → _resistance → _revelation` |
| **Signature de Maison** | Une par Maison, Actes I–III | `unlockHouseSignatureQuest` au floor-trigger | `quest_signature_gryff/slyth/raven/pouf` |
| **Secondaires** (liens perso) | Arcs PNJ (Manon, Lupin, Slughorn…) | `prereq` + `minFloor` | arc Manon, chaîne Potions, side-quests §6 |

### 1.2 Règle d'or de l'OFFRE (nouvelle) — « un PNJ, une quête à la fois »

Aujourd'hui un PNJ avec plusieurs `questsGiven` peut tout dévoiler d'un coup
(surcharge citée par la demande). **Nouveau garde-fou** : `getNpcQuestState`
ne propose que **la première quête offrable non encore acceptée/complétée** de
la liste d'un PNJ (ordre = ordre du tableau `questsGiven`, déjà narratif).
Les suivantes restent masquées tant que la précédente n'est pas remise.

✅ Effet : Dumbledore ne présente plus 5 missions au tutoriel ; Slughorn déroule
ses 3 potions une à une ; Manon avance beat par beat.

### 1.3 Floor-gating de l'amorce (anti-frustration « cible inaccessible »)

Le spawn-safeguard garantit la cible, mais offrir « tue Bellatrix » (ét. 10+)
dès l'étage 1 est narrativement faux. **Ajouter `minFloor` à l'amorce** des
maillons dont la cible est très profonde, pour que l'OFFRE apparaisse au bon
moment (la quête précédente de la chaîne reste le vrai gate ; `minFloor` est la
ceinture+bretelles).

| Quête | Cible (`minFloor` monstre) | `minFloor` quête proposé |
|---|---|---|
| `dumbledore_courage` (mangemort) | ~5 | **4** |
| `dumbledore_resistance` (mangemort_elite) | ~7 | **6** |
| `dumbledore_revelation` (bellatrix) | ~8–10 | **8** |
| `bouclier_phenix` (mangemort ×5) | 5 | **6** (déjà ét.7 NPC) |

❓ **Décision ouverte** : faut-il aussi gater l'amorce des chaînes de Maison
tier 12 (déjà gated par tier) ? *Recommandation : non — le tier suffit.*

### 1.4 Ordre recommandé (synthèse par Acte)

```
ACTE I  (ét.1-3)  intro_tutoriel → [dumbledore_eveil] ; signature Maison s'ouvre ;
                  Slughorn #1 ; Pomfresh ; Lockhart ; Manon_secret→pardon→revelio
ACTE II (ét.4-6)  dumbledore_courage ; Lupin (lumiere_desespoir) ; Hagrid ;
                  golem_passage ; Manon_grimoire (collecte pages) ; signature climax
ACTE III(ét.7-10) dumbledore_resistance→revelation ; Kingsley/Bill/Sirius ;
                  Manon_acte3 (feuillets clairs, mère) → **Manon_clair_de_lune (père, NOUVEAU §4)**
CLIMAX  (ét.10)   Voldemort ; victoryAchieved
BOUCLE  (ét.11+)  Gardien ; purges ; farming ; manon_confier/compagnie
```

---

## 2. Amélioration de l'immersion PNJ

### 2.1 Textes retravaillés (PNJ sans voix → texte renforcé)

Principe : chaque PNJ principal gagne (a) un `greeting` plus incarné, (b) des
`questActive` qui *réagissent* à la progression, (c) 2-3 `idleRandom`
contextuels. Échantillons proposés (à intégrer dans `dialoguesByQuest`) :

- **Slughorn** — passer de l'affable générique à la **vanité de collectionneur** :
  > *questOffer* : « Ah, un talent prometteur ! J'ai un œil pour ça, vous savez. Rendez-moi un petit service et je vous présenterai à… des gens qui comptent. »
  > *questReady* : « Magnifique ! Vous irez loin — et je dirai à tout le monde que je vous ai découvert le premier. »
- **Lockhart** — vantardise comique → fêlure d'Acte II :
  > *questActive* : « Je vous aurais bien aidé moi-même, naturellement, mais mon agenda de dédicaces… vous comprenez. »
- **Hagrid** — bourru tendre, inquiétude sincère pour ses bêtes.
- **Pomfresh** — pressée, maternelle ; ses `questActive` montent en tension si on tarde.
- **Gardien de la Boucle** — oraculaire, lucide sur la répétition.

### 2.2 PNJ qui méritent une VOIX (max 3) — recommandation

Le moteur voix actuel = **OGG pré-rendus** (`_VOICE_SAMPLES`, `playVoice`) +
repli **SpeechSynthesis** (jamais d'API runtime). Pas d'ElevenLabs/Edge au
runtime : on **génère les OGG hors-ligne** (ElevenLabs ou Edge-TTS) puis on les
dépose dans `audio/voice/` et on les enregistre dans `_VOICE_SAMPLES`. Repli TTS
navigateur garanti si un sample manque (défensif, déjà la norme).

| # | PNJ | Justification narrative | Style vocal suggéré | Source |
|---|---|---|---|---|
| 1 | **Manon Aubin** | Cœur émotionnel du jeu, arc neuf, le plus de texte ; la voix transforme son deuil en présence. | Jeune femme FR, timbre fragile→lumineux, débit lent, souffle. | ElevenLabs (qualité émotion) |
| 2 | **Remus Lupin** | Le père ; la scène de retrouvailles (`manon_pardon`) et le capstone (§4) culminent sur sa voix. | Homme FR, grave, fatigué, chaleureux, ~0.9 pitch. | ElevenLabs |
| 3 | **Élara (posthume)** | Voix lisant ses pages de grimoire + feuillets clairs : présence d'outre-tombe, bouleversante. Ferme le triangle familial Manon↔Lupin↔Élara. | Femme FR, douce, légèrement réverbérée (traitement « souvenir »). | ElevenLabs |

💡 Le **triangle familial voixé** (fille / père / mère défunte) maximise l'impact
émotionnel pour exactement 3 voix — cohérence parfaite avec la contrainte « max 3 ».
Dumbledore et les 4 chefs de Maison ont **déjà** des OGG ; on ne les recompte pas.

✅ **Clés de samples à créer** (convention `<id>_<contexte>_<n>`) :
`manon_greeting_1..3`, `manon_pardon_1..2`, `manon_clair_lune_1..2`,
`lupin_greeting_1..2`, `lupin_reunion_1..2`, `elara_page_1..5`,
`elara_feuillet_1..3`. Repli SpeechSynthesis (`speakBark` profil FR f/m) sinon.

---

## 3. (couvert par §1) — Cohérence & profondeur des quêtes existantes

Actions concrètes : §1.2 (offre étalée), §1.3 (floor-gating), §2.1 (textes).
Aucune quête existante n'est supprimée (respect de l'état actuel).

---

## 4. Correction spécifique — Finale de Manon (lien PÈRE + récompense)

### 4.1 Constat

L'arc Manon se termine actuellement sur **`manon_acte3`** (« feuillets clairs »),
centré sur la **mère** Élara (joie du givre). Récompense actuelle : `xp:500,
gold:220` + passif narratif *Hiver Clair* — **aucun item, aucun sort**. Le **père**
(Lupin) est traité en Acte I (`manon_pardon`) mais l'arc ne *culmine* pas sur lui.

### 4.2 Décision de conception (recommandée)

**Ajouter un capstone** `manon_clair_de_lune` (Acte III-bis / coda), gated par
`prereq: "manon_acte3"` → il devient **la dernière quête de Manon**. On
**préserve intégralement** le bel arc givre/mère (zéro régression) et on
**rééquilibre** la symétrie en donnant au père le mot de la fin.

> Pourquoi ne pas réécrire `manon_acte3` ? Parce qu'il porte un thème abouti
> (mère, joie, *Hiver Clair*) et de la logique (`fuseAct3`, `ACT3_PAGES`,
> rumeurs). Le « retravailler » = lui **donner une suite** qui bascule vers le
> père, plutôt que casser l'existant.

### 4.3 Élément le plus cohérent → **Lumière** ✨

Justification (la demande me laisse choisir) :
- **Mère = givre** : déjà couvert par `livre_glacius_tempete` (Acte II). Ré-offrir
  glace serait redondant — exactement ce que la demande proscrit (« pas un truc
  déjà obtenu »).
- **Père = lumière** : Lupin enseigne le **Patronus** (sa quête s'appelle
  littéralement *« La Lumière contre le Désespoir »*, `lumiere_desespoir`,
  reward `Patronum`). Le **clair de lune** (sa malédiction) devient ici une
  lumière protectrice — la leçon qu'il transmet enfin à sa fille.

### 4.4 La quête `manon_clair_de_lune`

| Champ | Valeur |
|---|---|
| `title` | « Clair de Lune » |
| `giver` | Manon |
| `prereq` | `manon_acte3` |
| `desc` | Manon veut comprendre la part de son père en elle — non la malédiction, mais la lumière qu'il oppose au désespoir. Accompagne-la lors d'une pleine lune symbolique : terrasse l'écho de son angoisse (un Détraqueur) à ses côtés, et rapporte-lui une plume de Fumseck. |
| `objectives` | `kill: detraqueur ×1` **+** `item: larmes_phenix ×1` (ou `plume_phenix`) |
| `reward` | `item: "livre_lumiere_patronus"` (le **livre élémentaire Lumière**, §5) + `xp:560, gold:240` + `stats:{ mag:1, lck:1 }` |
| Narratif | Lupin **présent** (placement temporaire ét.3 ou cinématique). Voix Lupin (`lupin_reunion`) + Manon (`manon_clair_lune`). Manon trace une lune claire à côté de la fougère de givre — mère ET père réunis sur sa fenêtre. |

✅ Cohérence totale : élément = père, récompense = **livre de buff permanent**
(jamais un sort déjà acquis), lien émotionnel renforcé, monstre (Détraqueur)
**accessible** dès l'étage 4 et omniprésent ensuite.

---

## 5. Livres spéciaux — Maîtrises Élémentaires (1 par élément)

### 5.1 Concept

Un **livre par élément** (6 éléments du jeu : `feu/glace/foudre/lumière/ténèbres/physique`).
Le lire octroie un **buff permanent DANS LA PARTIE** : **+12 % de dégâts** avec
cet élément (sorts ; `physique` = attaques physiques). Le livre est **consommé**
(comme un spellbook) ; le buff est **persisté dans la save** et **visible sur la
fiche perso** (§5.4). Cumulable avec artefacts/environnement (pipeline additif).

⚠️ **Respect zéro-héritage** : le buff vit dans l'état de partie
(`elementalMastery`, sérialisé `save.js`), **PAS** dans `hogwarts_rpg_profile`.
Le profil cross-run reste cosmétique. La « section statistiques » demandée est
ajoutée sur la **fiche perso in-game** (le « profil » que le joueur consulte en
jeu) — voir §5.4 + ❓ décision.

### 5.2 Les 6 livres

| Livre (id) | Élément | Effet permanent | Obtention (cohérente) |
|---|---|---|---|
| `livre_feu_dragon` — *Souffle du Magyar* | 🔥 feu | +12 % dégâts feu | Drop boss **Magyar Ancestral** (dragon de feu) |
| `livre_glace_elara` — *Givre Éternel* | ❄️ glace | +12 % dégâts glace | Drop boss **Spectre de Givre** *(ou* reward bonus `manon_grimoire`*)* |
| `livre_foudre_orage` — *Fureur de l'Orage* | ⚡ foudre | +12 % dégâts foudre | Drop boss **Héraut de l'Orage** |
| `livre_lumiere_patronus` — *Clair de Lune* | ✨ lumière | +12 % dégâts lumière | Reward **`manon_clair_de_lune`** (§4) |
| `livre_tenebres_pacte` — *Pacte d'Ombre* | 🌑 ténèbres | +12 % dégâts ténèbres | Reward signature **Serpentard** (voie « Pacte ») *ou* drop **Voldemort Ressuscité** |
| `livre_physique_lion` — *Cœur de Lion* | ⚔️ physique | +12 % dégâts physiques | Reward signature **Gryffondor** *ou* drop **Fenrir Greyback** |

💡 Un par élément, chacun ancré dans un boss/arc **déjà existant** → zéro contenu
orphelin, et une raison de plus d'affronter les boss canon.

### 5.3 Mécanique d'application (point d'injection identifié)

Pipeline élémentaire **déjà additif** dans `_spellElementalDamage`
(`battle-spells.js:660-665`) :
```js
const elemBonus = _artifactElemBonus(char, spell.element);   // existant
const envBonus  = _envElemBonus(spell.element);              // existant
// → AJOUT : maîtrise élémentaire (livres)
const masteryBonus = _elementalMasteryBonus(spell.element);  // NOUVEAU, défensif
```
- `_elementalMasteryBonus(element)` (pur, dans `inventory-core.js` ou
  `battle-spells.js`) lit `elementalMastery[element]` et retourne le %.
- `physique` : appliqué dans `executeAttack` (`battle.js`) côté attaque physique.
- Lifesteal/curse (`_spellLifesteal`/`_spellCurse`) : même ajout pour cohérence.

### 5.4 Visibilité — Section « Maîtrises Élémentaires » (statistiques)

**Surface primaire (recommandée)** : nouvelle sous-section dans
`char-stats-panel` (`ui-character-sheet.js`), sous Fortune/Célérité :
```
🔥 Feu +12%   ❄️ Glace +0%   ⚡ Foudre +12%
✨ Lumière +12%  🌑 Ténèbres +0%  ⚔️ Physique +0%
```
Affiche chaque élément débloqué (chips colorées par élément, emoji
`RUNE_LABELS`/élément). N'apparaît que si ≥1 maîtrise acquise.

❓ **Décision (à confirmer)** — « profil utilisateur » =
**(a)** la fiche perso in-game *(recommandé : respecte le zéro-héritage,
buff = within-run)* **ou** **(b)** aussi un compteur cosmétique « livres
jamais découverts » dans le **Codex du Sorcier** cross-run (honorifique, sans
buff) ? *Reco : (a) en primaire ; (b) en option cosmétique si désiré.*

---

## 6. Quêtes secondaires supplémentaires (liens entre personnages)

Objectif : tisser des liens forts. **3 nouvelles** (+ le capstone §4 = 4 ajouts) :

| Quête (id) | Donneur | Objectif | Récompense | Lien narratif | Voix/Texte |
|---|---|---|---|---|---|
| **`manon_clair_de_lune`** (§4) | Manon | kill `detraqueur` + item `larmes_phenix` | `livre_lumiere_patronus` | **Manon × Lupin** (père, finale) | 🎙️ Manon + Lupin |
| **`lettre_jamais_envoyee`** | Lupin | item `lettre_scellee` (fouille ét.4-6, Revelio) | xp/gold + `stats:{lck:1}` ; débloque un `idleRandom` Manon | **Lupin × Manon × Sirius** : Lupin confie une lettre jamais envoyée ; Sirius (esprit, ét.10) la commente | 🎙️ Lupin / 📝 Sirius |
| **`aconit_de_la_meute`** | Kingsley | item `herbe_aconit` ×3 (renforce `herbes_lupin`) | `potion_lune` + xp | **Kingsley × Lupin** : l'Auror protège le loup malgré la loi | 📝 texte |
| **`derniere_recette_elara`** | Pomfresh | item `cristal_givre` ×2 + herb ×2 | recipe soin glacé + xp | **Pomfresh × Élara** : Pomfresh reconnaît la magie de givre d'Élara dans une vieille fiche de soin | 🎙️ Élara (souvenir) / 📝 |

💡 Toutes ciblent des monstres/items **accessibles** à leur étage d'offre (pas de
frustration). Chacune renforce la **constellation Manon/Lupin/Élara** ou un chef
de l'Ordre — cohérence maximale, zéro perso orphelin.

### Légende synthèse des arcs (après révision)

```
                 ┌──────────── Élara (mère, ✝, givre) ───────────┐
                 │  grimoire (Acte II) · feuillets (Acte III)     │
                 │  derniere_recette_elara (Pomfresh)             │
   Manon ────────┤                                                ├──── joie + lumière
   (Poufsouffle) │  lettre_jamais_envoyee (Sirius commente)       │
                 │  ┌──────── Lupin (père, loup, lumière) ───────┐│
                 └──┤ manon_pardon (Acte I) · manon_clair_de_lune ││
                    │ aconit_de_la_meute (Kingsley protège)       ││
                    └─────────────────────────────────────────────┘
```

---

# ÉTAPE 2 — Plan d'Implémentation

> Ordre = par **priorité décroissante**. Chaque lot est indépendamment testable
> (`node tests/smoke.js`). Front modifié ⇒ **bump cache PWA** (skill `cache-bump`,
> guidelines §8) AVANT commit.

## P0 — Fondations (flags & data, aucun risque visuel)

1. **State** (`state.js`) : `let elementalMastery = { feu:0, glace:0, foudre:0, lumiere:0, tenebres:0, physique:0 };`
   → vérif : déclaré, au MANIFEST `loader.js`.
2. **Save** (`save.js`) : sérialiser/désérialiser `elementalMastery` dans
   `_serializeState`/`_applyState` (défaut `{}` rétro-compatible).
   → vérif : save/load conserve les % (scénario smoke `save`).
3. **Items** (`data-items.js`) : 6 entrées `livre_<element>_*` `type:"spellbook"`
   **sans** champ `spell` → nouveau champ `elementalMastery:"feu"` (+%).
   `learnSpellbook` route : si `item.elementalMastery` → `_grantElementalMastery`
   au lieu d'enseigner un sort.
   → vérif : lire un livre incrémente le bon élément, consomme l'item.

## P1 — Application du buff (combat)

4. **Helper pur** `_elementalMasteryBonus(element)` (`inventory-core.js`).
5. **Injection** dans `_spellElementalDamage`/`_spellLifesteal`/`_spellCurse`
   (`battle-spells.js:660+`) et `executeAttack` pour `physique` (`battle.js`).
   → vérif : scénario smoke combat — sort feu avec maîtrise feu fait +12 %.

## P2 — Affichage fiche perso (statistiques)

6. **UI** (`ui-character-sheet.js`) : section « Maîtrises Élémentaires » dans
   `char-stats-panel` (chips par élément, masquée si tout à 0). CSS `style.css`.
   → vérif : visuel via skill `ui-design-iterate` (desktop + mobile).

## P3 — Réorg quêtes (offre étalée + floor-gating)

7. **Offre étalée** (`npc-dialog.js` / `getNpcQuestState`) : ne proposer que la
   1ʳᵉ quête offrable d'un PNJ. → vérif : Dumbledore n'offre qu'`intro_tutoriel`
   au départ (scénario smoke `quests` + `npc`).
8. **Floor-gating amorce** (`quests-templates.js`) : ajouter `minFloor` (§1.3).
   → vérif : la quête n'apparaît pas avant l'étage cible.

## P4 — Manon capstone + livre Lumière

9. **Quête** `manon_clair_de_lune` (`quests-templates.js`) + branchements
   `npcs-a.js` (`questsGiven`/`questsTurnedIn`/`dialoguesByQuest`).
10. **Reward** `livre_lumiere_patronus` (P0 item) ; placement Lupin temporaire ou
    cinématique.
    → vérif : scénario smoke dédié (accept → kill détraqueur → item larmes →
    remise → maîtrise lumière +12 % + section visible).

## P5 — Voix (3 PNJ, OGG + repli TTS)

11. Générer OGG (ElevenLabs/Edge **hors-ligne**) pour Manon/Lupin/Élara →
    `audio/voice/`. Enregistrer clés dans `_VOICE_SAMPLES` (`audio-music.js`).
    `playVoice` aux beats clés (dialogues + pages). Repli `speakBark` FR.
    → vérif : file:// charge OGG nativement (smoke `audio`) ; absence d'OGG =
    silencieux (défensif).

## P6 — Textes PNJ & side-quests

12. Réécriture `dialoguesByQuest` (§2.1) des PNJ principaux.
13. 3 side-quests (§6) + items/objectifs accessibles.
    → vérif : scénarios `quests`/`npc`.

## Priorisation (résumé)

| Priorité | Lot | Pourquoi d'abord |
|---|---|---|
| 🔴 Haute | P0–P2 (livres élémentaires + affichage) | Demande centrale, fondations réutilisables. |
| 🟠 Moyenne | P3 (réorg offre) + P4 (Manon) | Cœur narratif ; P4 dépend de P0. |
| 🟢 Basse | P5 (voix) + P6 (textes/side-quests) | Immersion ; non bloquant, gros volume d'assets. |

## Tests recommandés (critères de vérification — guidelines §4/§7)

1. **Progression naturelle** : nouvelle partie → seules les quêtes d'Acte I
   s'offrent ; aucune cible inaccessible proposée. *(smoke `quests`+`npc`)*
2. **Accessibilité monstres** : chaque quête kill offerte a sa cible présente sur
   l'étage (`_ensureActiveKillQuestTargets`). *(smoke `dungeon`)*
3. **Buff élémentaire** : lire chaque livre → +12 % vérifié en combat + section
   fiche perso. *(smoke `combat`+`inventory`)*
4. **Manon capstone** : chaîne complète jouable, reward = livre Lumière, lien
   père explicite. *(smoke dédié)*
5. **Save** : `elementalMastery` persiste ; load d'une vieille save = `{}` sans
   crash. *(smoke `save`)*
6. **Immersion** : voix jouée aux beats (file://) ; repli TTS si OGG absent.
7. **Non-régression** : `node tests/units.js` + `node tests/smoke.js` verts ;
   `node tools/check_cache_versions.js --base origin/master` OK.

---

## Décisions ouvertes (à valider avant implémentation)

- ❓ **§5.4** : section maîtrises sur fiche perso in-game (reco) vs + Codex
  cross-run cosmétique ?
- ❓ **§5.2** : éléments `ténèbres`/`physique` → reward de quête signature de
  Maison **ou** drop de boss ? *(reco : reward signature — plus accessible,
  renforce les Maisons.)*
- ❓ **§4.2** : capstone Manon en **nouvelle quête** (reco, préserve l'existant)
  vs réécriture de `manon_acte3` ?
- ❓ **Périmètre Étape 2** : implémente-t-on tout, ou un sous-ensemble prioritaire
  (P0–P4) en premier jet ?

## Journal d'avancement

- **2026-06-28** — Audit complet du code (quêtes, PNJ, voix, profil, combat
  élémentaire). Specs Étape 1 + plan Étape 2 rédigés. Aucune ligne de code
  modifiée. En attente de validation des 4 décisions ouvertes avant P0.

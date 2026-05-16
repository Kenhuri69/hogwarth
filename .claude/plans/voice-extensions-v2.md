# Plan — Voix in-game V2 : extensions

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au 2026-05-16 : **Vagues A et B — LIVRÉES** sur la branche
> `claude/extend-house-quest-paths-Bh7MD` (A : 20 OGG chefs de Maison ;
> B : 13 OGG incantations + câblage `speakSpell`). Vagues C/D ouvertes.

---

## 0. Reprise de session — Vague A close

**Contexte en une phrase** : la Vague A (voix des 4 chefs de Maison) est
**terminée** — code livré PR #127, 20 OGG générés via edge-tts et encodés.

### 0.1 — Ce qui a été livré

- `js/audio-music.js` : 20 clés ajoutées à `_VOICE_SAMPLES` (PR #127).
- `js/npc-dialog.js` : helper `_npcDialogSource`, `_voiceKeyForPage`
  étendu aux 4 chefs (greeting + offer/active/ready) (PR #127).
- `tests/smoke.js` : `scenarioHeadOfHouseVoice` (4 sous-cas) — **vert**.
- `tools/gen_voice_edge.py` : script de génération edge-tts.
- **20 fichiers `audio/voice/<key>.ogg`** générés (edge-tts FR neural)
  + encodés OGG Vorbis (`-ac 1 -ar 22050 -q:a 3`), ~728 Ko cumulé.
  MP3 intermédiaires dans `audio/voice/_raw/`.

### 0.2 — Note réseau (résolu)

La génération edge-tts cible `speech.platform.bing.com`. Lors de la
reprise du 2026-05-16, ce domaine était joignable depuis l'environnement
web — `python3 tools/gen_voice_edge.py` a produit les 20 MP3 sans erreur.
Si un futur run échoue en `403 host_not_allowed` : exécuter le script en
local (réseau libre), ou générer via ElevenLabs avec les prompts §A.6.

### 0.3 — Suite

Vague B (voix incantation sorts) **livrée** — voir §3. Vagues C
(sous-titres karaoké) et D (localisation) restent ouvertes.

---

## 1. Contexte

`voice-intro-dumbledore.md` (archivé PR #76) a livré la voix narrative
Dumbledore sur l'écran d'intro (2 pages OGG).

`voice-dumbledore-chain.md` (encore ouvert, code prêt, attend la
génération MP3 par l'utilisateur) ajoutera 15 lignes vocales pour les
5 quêtes Dumbledore.

Plusieurs **extensions naturelles** sont listées hors scope :

| Extension | Source |
|-----------|--------|
| Voix pour autres PNJ majeurs (Chefs de Maison, Pomfresh, Hagrid) | `voice-dumbledore-chain.md §10` |
| Voix sur incantation de sorts (alternative à `SpeechSynthesis`) | idem |
| Sous-titres karaoké (synchronisation parole/texte) | idem |
| Localisation FR/EN (alternance langues selon `navigator.language`) | idem |

Ce plan les regroupe en 3 vagues, chacune indépendante.

## 2. Vagues

### Vague A — Voix des 4 Chefs de Maison (priorité haute)

**Pourquoi en premier** : les chefs de Maison délivrent les quêtes de
Set (palier 12 d'`houses-2.0`). Leur donner une voix est cohérent
avec l'investissement narratif du joueur dans son House.

**PNJ ciblés** :
- McGonagall (Gryffondor)
- Rogue (Serpentard)
- Flitwick (Serdaigle)
- Chourave (Poufsouffle)

**Lignes vocales par PNJ** : 5 lignes (cohérent avec le pattern
Dumbledore) :
1. Greeting (1 phrase courte)
2. Quest Intro (introduction de la quête de Set)
3. Quest In Progress (rappel d'objectif)
4. Quest Done (remise de la récompense)
5. Farewell (au revoir)

**Total** : 4 PNJ × 5 lignes = **20 fichiers OGG**.

**Acteurs vocaux ElevenLabs recommandés** :
- McGonagall : voix féminine âgée (Charlotte, Lily) accent écossais.
- Rogue : voix masculine grave (Adam, Antoni) lente, presque chuchotée.
- Flitwick : voix masculine aiguë (Sam, Josh) avec pitch +20 % en post.
- Chourave : voix féminine chaleureuse moyenne (Nicole, Emily).

**Implémentation** :
- Réutiliser le système `AudioSystem.playVoice(id)` existant.
- IDs : `mcgonagall_greeting`, `mcgonagall_quest_intro`, etc.
- Hook : dans `npc-dialog.js — openNpcDialog`, déclencher `playVoice`
  selon état narratif (`getNpcQuestState`).
- Fallback silencieux (déjà géré par `AudioSystem.playVoice`).

**Smoke** : `scenarioHeadOfHouseVoice` : ouvrir dialogue McGonagall,
vérifier `playVoice('mcgonagall_greeting')` appelé.

### Vague B — Voix sur incantation des sorts (refonte audio)

**Spec actuelle** : `AudioSystem.speakSpell(name)` utilise
`SpeechSynthesis` browser (qualité variable, accent forcé `en-GB`).

**Spec V2** : remplacer par samples OGG enregistrés (Hermione voix sur
sorts incantés) :
- 12 sorts × 1 sample = 12 fichiers OGG (~150 ko total).
- Mapping `SPELL_VOICE_MAP[spellName] = 'spell_<spellname>.ogg'`.
- Fallback `SpeechSynthesis` si OGG manquant ou échec chargement.

**Cibles sorts** : Expelliarmus, Stupefix, Episkey, Protego, Incendio,
Reparo, Wingardium Leviosa, Accio, Ferula, Diffindo, Sectumsempra,
Avada Kedavra, Portus.

**Acteur** : voix Hermione (féminine jeune, prononciation soignée).

### Vague C — Sous-titres karaoké (qualité de vie) — EN COURS

**Spec** :
- Pendant la lecture vocale, surligner progressivement le texte du
  dialogue (effet karaoké).

**Décision de synchronisation (V1)** : pas de fichier de timecodes.
edge-tts n'émet de façon fiable que des `SentenceBoundary` (vérifié sur
`fr-FR-HenriNeural` — aucun `WordBoundary`). Plutôt que de dépendre d'une
métadonnée absente ou de régénérer tous les OGG, V1 utilise un **timing
proportionnel au nombre de caractères** : chaque mot est surligné à
`frac = caractères cumulés / total`, comparé à la progression réelle de
la voix (`AudioSystem.getVoiceProgress()`). Approximation correcte pour
une narration au débit régulier ; raffinement possible en V2 (ancrage
sur les `SentenceBoundary`).

**Implémentation** :
- `AudioSystem.getVoiceProgress()` : fraction 0..1 de la voix en cours
  (0 si en chargement, -1 si aucune). S'appuie sur `_voicePlayback`
  (instant de départ + durée du buffer) posé par `playVoice`.
- Module `js/karaoke.js` (`window.Karaoke`) : `wrap(el)` enveloppe
  chaque mot en `<span class="kw">`, `start(el)` lance une boucle
  `setInterval(~90 ms)` qui ajoute `.spoken`, `stop()` / `reset()`.
- Pilote : écran d'intro Dumbledore (`intro.js — _renderIntroPage`).
  Généralisation aux dialogues PNJ : itération suivante (même helper).

**Mobile vs desktop** : logique JS identique. Desktop → surlignage seul.
Mobile (≤700px) → `scrollIntoView({block:'nearest'})` sur le mot courant
pour les modales scrollables (no-op si déjà visible). `prefers-reduced-
motion` respecté (pas de transition ni de smooth-scroll).

**ROI** : cosmétique, mais très immersif si bien fait.

### Vague D — Localisation FR/EN

**Spec** :
- Champ `dialogues` devient `dialogues: { fr: [...], en: [...] }`.
- `AudioSystem.playVoice(id)` cherche `audio/voice/<lang>/<id>.ogg`.
- Détection langue : `navigator.language.startsWith('fr')` → `fr`,
  sinon `en`.
- Toggle UI dans le menu options.

**Coût** : doubler tous les samples vocaux + tous les textes des
dialogues. Probablement à différer V3 sauf si demande communautaire
forte.

## 3. Étapes (Vague A à C)

### Vague A — 20 lignes Chefs de Maison

> Décision : on réutilise les textes existants de `npcs.js`
> (`dialogues.greeting` 2 pages + `dialoguesByQuest.quest_set_<house>`
> 3 états) — 4 PNJ × 5 OGG = **20 OGG**, mapping 1:1.
> Voice keys : `<npcid>_greeting_<1|2>`, `<npcid>_<offer|active|ready>_1`
> (suffixe `_1` future-proof pour split multi-page).

- [x] Mapping voice keys figé (20 entrées dans `_VOICE_SAMPLES`).
- [x] Refactor `_voiceKeyForPage` → ajout source `'greeting'` et 4 chefs.
- [x] Helper `_npcDialogSource(npc, state)` pour tracker l'origine des pages.
- [x] Smoke `scenarioHeadOfHouseVoice` (T1 mapping clés, T2 greeting,
      T3 état offer, T4 régression Dumbledore).
- [x] Script de génération `tools/gen_voice_edge.py` (plan de secours
      edge-tts, voir §B ci-dessous).
- [x] Génération des 20 MP3 via `tools/gen_voice_edge.py` (edge-tts FR
      neural). Le domaine `speech.platform.bing.com` était joignable le
      2026-05-16 — génération sans erreur.
- [x] Encodage OGG Vorbis (`ffmpeg -ac 1 -ar 22050 -c:a libvorbis -q:a 3`).
- [x] Placement dans `audio/voice/<key>.ogg` (20 fichiers, ~728 Ko).
- [x] Smoke `node tests/smoke.js` vert (`scenarioHeadOfHouseVoice` OK).
- [ ] Commit + push.

#### B — Plan de secours TTS gratuit : edge-tts

ElevenLabs free tier épuisé → `tools/gen_voice_edge.py` génère les voix
via **edge-tts** (voix neurales Microsoft Azure, gratuit, illimité, sans
clé API). Mapping voix FR par chef :

| PNJ        | Voix edge-tts                       | rate   | pitch   |
|------------|-------------------------------------|--------|---------|
| McGonagall | `fr-FR-DeniseNeural`                | -7 %   | +0 Hz   |
| Rogue      | `fr-FR-HenriNeural`                 | -12 %  | -8 Hz   |
| Flitwick   | `fr-FR-HenriNeural`                 | +10 %  | +32 Hz  |
| Chourave   | `fr-FR-VivienneMultilingualNeural`  | -3 %   | +0 Hz   |

Qualité en dessous d'ElevenLabs sur l'expressivité, mais nettement
au-dessus de `SpeechSynthesis` navigateur. Lancement :
`pip install edge-tts && python3 tools/gen_voice_edge.py`.

> Contrainte réseau : le endpoint `speech.platform.bing.com` doit être
> joignable. Dans l'environnement web actuel il est hors allowlist (le
> proxy renvoie `403 host_not_allowed`). Solutions : (1) autoriser ce
> domaine dans la politique réseau de l'environnement, (2) exécuter le
> script en local sur une machine au réseau libre.

#### A.5 — Liste des 20 OGG attendus (textes existants dans `npcs.js`)

| Voice key                | Texte source (npcs.js)                                                              |
|--------------------------|-------------------------------------------------------------------------------------|
| `mcgonagall_greeting_1`  | « Un Gardien du Portail s'est éveillé dans les passages secrets. […] »              |
| `mcgonagall_greeting_2`  | « Soyez prudent : ce gardien est de pierre vivante, ses coups peuvent rompre un os. […] » |
| `mcgonagall_offer_1`     | « Une Chimère rôde dans les profondeurs. Trois de ces bêtes — pas une de moins […] » |
| `mcgonagall_active_1`    | « Les Chimères tiennent-elles encore tête à un lion ? »                              |
| `mcgonagall_ready_1`     | « Trois Chimères abattues. Le Cœur du Lion vous revient […] »                        |
| `rogue_greeting_1`       | « Tiens, tiens... un élève de ma maison qui ose s'aventurer ici. »                  |
| `rogue_greeting_2`       | « L'ambition n'est rien sans la maîtrise. Voyons si vous méritez ce qui vous attend. » |
| `rogue_offer_1`          | « Trois Basilics Mineurs souillent les cachots oubliés. Élimine-les. […] »          |
| `rogue_active_1`         | « Encore en vie ? Surprenant. Le travail n'est pas terminé. »                        |
| `rogue_ready_1`          | « Trois Basilics, trois preuves. La Couronne vous attend […] »                       |
| `flitwick_greeting_1`    | « Oh ! Un esprit aiguisé, n'est-ce pas ? L'aigle de Serdaigle se reconnaît au premier regard. » |
| `flitwick_greeting_2`    | « Approchez, approchez. Le savoir récompense ceux qui le cultivent avec assiduité. » |
| `flitwick_offer_1`       | « Hécate la Maudisseuse dévore nos grimoires interdits. Trois de ses avatars […] »  |
| `flitwick_active_1`      | « Le savoir s'écrit dans le silence — combien d'avatars d'Hécate avez-vous réduits au néant ? » |
| `flitwick_ready_1`       | « Trois maudisseuses, trois pages préservées. L'Anneau du Savoir vous attend […] »  |
| `sprout_greeting_1`      | « Ah, un Poufsouffle ! La loyauté finit toujours par porter ses fruits — comme mes plantes. » |
| `sprout_greeting_2`      | « Ne sous-estimez jamais le travail acharné. C'est ce qui distingue les vrais sorciers. » |
| `sprout_offer_1`         | « Trois Trolls des Cavernes terrorisent les passages — patience et loyauté […] »   |
| `sprout_active_1`        | « Trois trolls, et pas un de moins. Garde la tête haute. »                          |
| `sprout_ready_1`         | « Trois trolls vaincus — le serment est tenu. Le Médaillon de Helga vous attend […] » |

> ~~Limite connue~~ **résolue (extension §A.7)** : McGonagall donne aussi
> `golem_passage`. `_voiceKeyForPage` route désormais cette quête vers des
> clés dédiées `mcgonagall_golem_<state>_1` — plus de décalage texte/voix.

#### A.6 — Prompts acteurs (voie C : génération manuelle ElevenLabs)

Settings ElevenLabs communs : modèle `eleven_multilingual_v2`,
stability 50, similarity 75, style 0, speaker_boost ON. Ajuster
stability/style par PNJ ci-dessous.

**McGonagall** — voix féminine fin 60 ans, diction nette, accent
écossais transposé en français raffiné. Autorité calme, exigence
bienveillante, aucun effet théâtral. Voix suggérée : Charlotte ou
clone Maggie Smith. Settings : stability 50, style 0.

**Rogue** — voix masculine fin 40 ans, grave, presque chuchotée par
moments. Débit lent, silences prolongés, mépris affleurant sans
éclat. Aucune chaleur. Voix suggérée : Adam/Antoni ou clone Alan
Rickman. Settings : stability 60 (bloquer la variation théâtrale),
style 0.

**Flitwick** — voix masculine registre aigu, vive, pétillante,
enthousiasme académique sincère, articulation maniérée. Voix
suggérée : Sam/Josh + pitch +15 % en post (Audacity → +2 demi-tons).
Settings : stability 45, style 10 (autoriser la malice).

**Chourave** — voix féminine 50 ans, timbre chaud, médium, terrien,
phrasé posé presque maternel, sourire dans la voix sans mièvrerie.
Voix suggérée : Nicole/Emily ou clone Miriam Margolyes apaisé.
Settings : stability 55, style 0.

> Les 20 textes exacts à enregistrer sont dans le §A.5 ci-dessus et
> dans `tools/gen_voice_edge.py` (dict `LINES`).

#### A.7 — Extension : autres dialogues des chefs de Maison ✅

Au-delà du greeting + quête de Set, 8 OGG supplémentaires couvrent les
dialogues restants des 4 chefs.

| Voice key | Source (`npcs.js`) |
|-----------|--------------------|
| `mcgonagall_golem_offer_1` / `_active_1` / `_ready_1` | quête `golem_passage` (2e quête de McGonagall) |
| `mcgonagall_idle_1`, `rogue_idle_1`, `flitwick_idle_1`, `sprout_idle_1` | `dialogues.idle` |
| `mcgonagall_done_1` | `dialogues.questDone` |

- [x] 8 lignes ajoutées à `LINES` (`tools/gen_voice_edge.py`).
- [x] 8 OGG générés + encodés (`audio/voice/`).
- [x] 8 entrées dans `_VOICE_SAMPLES` (`audio-music.js`).
- [x] `_voiceKeyForPage` : routage `idle`/`done` + clés `golem` dédiées.
- [x] Smoke `scenarioHeadOfHouseVoice` T5 (clés + routage golem/idle/done).
- [ ] Commit + push.

> Rogue / Flitwick / Chourave n'ont pas de `questDone` : en état `done`,
> `_npcDialogSource` retombe sur `idle` — déjà voisé. Aucun OGG `done`
> dédié pour eux (pas de texte source à enregistrer).

### Vague B — Voix incantation sorts ✅

> Décision : edge-tts (voix `fr-FR-EloiseNeural`, jeune féminine) au lieu
> d'ElevenLabs — quota épuisé, cohérent avec la Vague A. 13 sorts ciblés
> (cf. §2). Limite assumée V1 : la voix d'incantation est unique, jouée
> pour les sorts de Harry comme d'Hermione.

- [x] Génération MP3 via `tools/gen_voice_edge.py hermione` (cible
      `hermione` ajoutée : `VOICES` + `LINES`, 13 incantations).
- [x] Encodage OGG Vorbis (`-ac 1 -ar 22050 -q:a 3`), 13 fichiers
      `audio/voice/spell_<id>.ogg` (~132 Ko cumulé).
- [x] 13 entrées `spell_*` ajoutées à `_VOICE_SAMPLES` (`audio-music.js`).
- [x] `SPELL_VOICE_MAP` (nom de sort → clé OGG) dans `audio-sfx.js`.
- [x] `speakSpell` : OGG via `playVoice` si mappé, sinon `SpeechSynthesis`.
- [x] Smoke `scenarioSpellVoiceMapping` (T1 cohérence map, T2 routing) — vert.
- [ ] Commit + push.

### Vague C — Sous-titres karaoké

- [x] Dialogue pilote : écran d'intro Dumbledore (déjà en OGG).
- [x] Décision sync : timing proportionnel (pas de timecodes — edge-tts
      n'expose pas de `WordBoundary` fiable).
- [x] `AudioSystem.getVoiceProgress()` + tracking `_voicePlayback`.
- [x] Module `js/karaoke.js` (`wrap` / `start` / `stop` / `reset`).
- [x] Câblage `intro.js — _renderIntroPage` (+ `stop` sur `_finishIntro`).
- [x] CSS `.kw` / `.kw.spoken` + `prefers-reduced-motion`.
- [x] Smoke `scenarioKaraokeIntro` (wrapping + progression `.spoken`).
- [ ] Commit + push.
- [ ] (Itération suivante) Généraliser aux dialogues PNJ (`npc-dialog.js`).

### Vague D — Localisation (différée)

- Décision GO/NO-GO basée sur demandes utilisateurs.

## 4. Risques

- Vague A : 20 OGG ≈ 600 ko (acceptable pour GitHub Pages).
- Vague B : remplacer `SpeechSynthesis` par OGG = +1.5 Mo total.
  Mitigation : lazy-load (charger sur premier cast).
- Vague C : synchronisation fragile, dépend des timecodes ElevenLabs
  → tester sur 3 dialogues avant de généraliser.

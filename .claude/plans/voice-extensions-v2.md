# Plan — Voix in-game V2 : extensions

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au 2026-05-16 : **Vague A — code livré, génération audio en
> attente.** Branche `claude/launch-voice-extension-grPyO` (2 commits
> poussés : `f5934cc` câblage, `da3d731` script edge-tts). Le jeu tourne
> avec fallback silencieux ; il ne manque que les 20 fichiers OGG.

---

## 0. Reprise de session — à faire à la prochaine session

**Contexte en une phrase** : tout le code de la Vague A (câblage des voix
des 4 chefs de Maison) est fait, testé et poussé ; il ne reste qu'à
**générer les 20 fichiers audio** puis les déposer dans le repo.

### 0.1 — Ce qui est DÉJÀ fait (ne pas refaire)

- `js/audio-music.js` : 20 clés ajoutées à `_VOICE_SAMPLES`.
- `js/npc-dialog.js` : helper `_npcDialogSource`, `_voiceKeyForPage`
  étendu aux 4 chefs (greeting + offer/active/ready).
- `tests/smoke.js` : `scenarioHeadOfHouseVoice` (4 sous-cas) — **vert**.
- `tools/gen_voice_edge.py` : script de génération edge-tts prêt.
- Le jeu fonctionne déjà : `playVoice` retourne en silence tant qu'un
  OGG manque (aucune erreur console).

### 0.2 — Bloquant unique

La génération audio dépend du réseau. `tools/gen_voice_edge.py` appelle
`speech.platform.bing.com`, **hors allowlist** de l'environnement web
(le proxy renvoie `403 host_not_allowed`). ElevenLabs n'est pas une
option immédiate : quota free épuisé.

### 0.3 — Étapes de reprise (dans l'ordre)

1. **Débloquer la génération** — choisir UNE voie :
   - **Voie A (recommandée)** : l'utilisateur autorise
     `speech.platform.bing.com` dans la politique réseau de
     l'environnement web (ou passe en accès réseau complet). Puis, dans
     la session : `pip install edge-tts && python3 tools/gen_voice_edge.py`
     → produit `audio/voice/_raw/*.mp3` (20 fichiers).
   - **Voie B** : l'utilisateur lance `tools/gen_voice_edge.py` sur sa
     machine locale (réseau libre) et dépose les 20 MP3 dans la session
     (ou les commit dans `audio/voice/_raw/`).
   - **Voie C** : attendre le reset mensuel du quota ElevenLabs, générer
     les 20 MP3 manuellement avec les prompts acteurs du §A.6, déposer.
2. **Écouter un échantillon** (`mcgonagall_greeting_1`) — vérifier le
   pacing / le pitch. Ajuster `VOICES` dans `gen_voice_edge.py` si besoin
   (rate/pitch) et régénérer.
3. **Encoder en OGG** — installer `ffmpeg` puis, pour chaque MP3 :
   `ffmpeg -i audio/voice/_raw/<key>.mp3 -ac 1 -ar 22050 -c:a libvorbis -q:a 3 audio/voice/<key>.ogg`
   Cible : ≤ 50 Ko/fichier, ≤ 1 Mo cumulé. Durées 4–10 s.
4. **Vérifier** : `node tests/smoke.js` reste vert (les OGG sont
   optionnels — le smoke teste le mapping, pas les fichiers). Puis test
   navigateur HTTP : ouvrir un dialogue McGonagall, confirmer que la voix
   joue par page et s'arrête à la fermeture.
5. **Commit + push** : ajouter `audio/voice/*.ogg` (les 20). Les MP3 de
   `_raw/` sont des intermédiaires — les commiter est optionnel (cohérent
   avec les `_raw/*.mp3` Dumbledore déjà versionnés).
6. **Cocher** les cases restantes du §3 Vague A et clore la vague.

### 0.4 — Points d'attention pour la reprise

- Naming **exact** des fichiers : voir le tableau §A.5. Toute faute de
  frappe = fallback silencieux (pas d'erreur, mais pas de voix).
- Le test `scenarioRelativeControls` du smoke est **flaky** (timing) —
  s'il échoue isolément, relancer `node tests/smoke.js` ; il n'est pas
  lié à cette tâche.
- Ne PAS pousser sur une PR mergée (`.claude/guidelines.md` §6) :
  vérifier l'état de la branche `claude/launch-voice-extension-grPyO`
  avant tout `git push`.

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

### Vague C — Sous-titres karaoké (qualité de vie)

**Spec** :
- Pendant lecture vocale, surligner mot par mot dans le texte du
  dialogue (équivalent karaoké).
- Synchronisation : enregistrer un fichier `.json` côté assets avec
  timestamps `[{word: "Bienvenue", t: 0.2}, ...]`.
- Génération : ElevenLabs renvoie un timecodes JSON optionnel à l'API.

**Implémentation** :
- Dans `npc-dialog.js`, parser le texte du dialogue, wrapper chaque mot
  en `<span data-w-idx="N">`.
- `AudioSystem.playVoice(id)` retourne un `<audio>` ; `setInterval` à
  100 ms compare `currentTime` au JSON timecodes, ajoute `.spoken`
  class au span courant.

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
- [ ] Génération des 20 MP3 — **bloquée** : edge-tts cible
      `speech.platform.bing.com`, hors allowlist réseau de l'environnement
      web (`403 host_not_allowed`). Débloquer en autorisant ce domaine
      dans la politique réseau de l'environnement, ou lancer le script
      en local. Sur ElevenLabs : attendre le reset mensuel du quota free.
- [ ] Encodage OGG Vorbis (`ffmpeg -ac 1 -ar 22050 -c:a libvorbis -q:a 3`).
- [ ] Placement dans `audio/voice/<key>.ogg`.
- [ ] Commit + push (PR séparée éventuelle pour les assets binaires).

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

> Limite connue : si un PNJ propose une autre quête avant `quest_set_<house>`
> (ex. McGonagall donne aussi `golem_passage`), la voix `_offer_1` jouera
> sur le texte de `golem_passage` — léger décalage texte/voix accepté en V1
> (tons cohérents). Override par quête possible plus tard via mapping
> dédié dans `_voiceKeyForPage` (cf. modèle Dumbledore).

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

### Vague B — Voix incantation sorts

- [ ] Briefing ElevenLabs Hermione (1 acteur, 12 prompts).
- [ ] Génération MP3 + encodage OGG.
- [ ] `SPELL_VOICE_MAP` dans `audio-sfx.js`.
- [ ] Modifier `speakSpell` : tenter OGG d'abord, fallback `SpeechSynthesis`.
- [ ] Smoke `scenarioSpellVoiceMapping` (3 sorts au minimum).
- [ ] Commit + push.

### Vague C — Sous-titres karaoké

- [ ] Choisir un dialogue pilote (intro Dumbledore, déjà OGG).
- [ ] Récupérer timecodes JSON ElevenLabs ou générer manuellement.
- [ ] Wrapper texte en `<span data-w-idx>` dans `intro.js — _renderIntroPage`.
- [ ] Boucle 100 ms compare `currentTime` ↔ timecodes.
- [ ] CSS `.spoken { background: rgba(255, 215, 0, 0.3); }`.
- [ ] Itération polissage UX (vitesse, opacité).
- [ ] Smoke `scenarioKaraokeIntro` (vérifier au moins 1 span `.spoken`
      après 1 s de lecture).
- [ ] Commit + push.

### Vague D — Localisation (différée)

- Décision GO/NO-GO basée sur demandes utilisateurs.

## 4. Risques

- Vague A : 20 OGG ≈ 600 ko (acceptable pour GitHub Pages).
- Vague B : remplacer `SpeechSynthesis` par OGG = +1.5 Mo total.
  Mitigation : lazy-load (charger sur premier cast).
- Vague C : synchronisation fragile, dépend des timecodes ElevenLabs
  → tester sur 3 dialogues avant de généraliser.

# Plan — Voix in-game V2 : extensions

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Statut au 2026-05-15 : **Vague A en cours** — code + smoke posés sous
> branche `claude/launch-voice-extension-grPyO`, fallback silencieux en
> attente des 20 OGG ElevenLabs (utilisateur).
> Pré-requis : 15 OGG `voice-dumbledore-chain` livrés (vérifié dans
> `audio/voice/`) + 6 OGG farming (Hagrid/Scamander) — mécanique
> `playVoice` éprouvée.

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

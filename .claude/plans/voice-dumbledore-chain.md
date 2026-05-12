# Plan — Voix in-game pour la chaîne de quêtes Dumbledore

> **Statut** : Phase A en attente (génération MP3 ElevenLabs). Code + textes prêts.
> **Branche** : `claude/dumbledore-voice-chain`
> **Successeur** de `voice-intro-dumbledore.md` (intro Dumbledore, mergée PR ?).

---

## 1. Contexte

Suite de la chaîne audio Dumbledore. L'intro (2 OGG, déjà en place) couvre le
premier contact pré-jeu. Cette PR étend la voix aux **dialogues in-game**
de Dumbledore pour les **5 quêtes de la chaîne d'épreuves** ajoutées en
Phase 3 :

| ID quête | Étape |
|----------|-------|
| `intro_tutoriel`        | 1 — descendre étage 2 |
| `dumbledore_eveil`      | 2 — tuer Épouvantard |
| `dumbledore_courage`    | 3 — tuer 2 Mangemorts |
| `dumbledore_resistance` | 4 — tuer Mangemort d'élite |
| `dumbledore_revelation` | 5 — vaincre Bellatrix |

## 2. Mapping audio

Chaque quête couvre 3 moments narratifs dans le dialogue in-game :

| État UI | Quand | Clé audio |
|---------|-------|-----------|
| `questOffer`  | Dumbledore propose la quête (pré-acceptation)              | `dumbledore_<qid>_offer_1` |
| `questActive` | Dumbledore encourage si on revient sans avoir fini        | `dumbledore_<qid>_active_1` |
| `questReady`  | Dumbledore reçoit le rapport et donne la récompense       | `dumbledore_<qid>_ready_1` |

`<qid>` ∈ {`tutoriel`, `eveil`, `courage`, `resistance`, `revelation`}.

**15 fichiers OGG cibles** :
`dumbledore_tutoriel_{offer,active,ready}_1.ogg` (×3)
`dumbledore_eveil_{offer,active,ready}_1.ogg` (×3)
`dumbledore_courage_{offer,active,ready}_1.ogg` (×3)
`dumbledore_resistance_{offer,active,ready}_1.ogg` (×3)
`dumbledore_revelation_{offer,active,ready}_1.ogg` (×3)

> Le suffixe `_1` est volontaire : permet un futur split en 2-3 pages
> par moment sans renommage (`_2`, `_3`).

## 3. Textes à enregistrer (FR)

Ton recommandé : voix posée, paternelle, lumière intérieure malgré la
gravité. **Voix ElevenLabs « My Dumbledore » custom** — *mêmes settings
que l'intro* : `stability=50, similarity=75, style=0, speaker_boost=on`,
modèle `eleven_multilingual_v2` (FR natif).

> Pour cohérence avec l'intro existante, ne pas changer le voice ID.
> Re-générer 1 sample test (`dumbledore_eveil_offer_1`) avant la salve,
> écouter, ajuster pacing si trop rapide.

### Quête 1 — `intro_tutoriel` (étage 1 → 2)

**offer** *(piste 1)*
> « Tu te demandes par où commencer ? Descends d'un étage — c'est l'épreuve la plus douce que je puisse t'offrir. Reviens me voir une fois la descente accomplie. »

**active** *(piste 2)*
> « Le grand escalier t'attend, jeune sorcier. Trouve-le, et reviens me retrouver dès que tu auras fait tes premiers pas vers le bas. »

**ready** *(piste 3)*
> « Bien joué. Tu as fait tes premiers pas — et déjà, le château reconnaît ton courage. Tiens, prends ceci : ce ne sont que des bagatelles, mais elles t'épauleront sur le chemin. »

### Quête 2 — `dumbledore_eveil` (étage 3, kill Épouvantard)

**offer**
> « Tes peurs t'attendent dans les couloirs sombres, sous la forme d'un Épouvantard ou d'un Détraqueur. Affronte l'une de ces créatures. Ce que l'on défie nous rend plus forts. »

**active**
> « As-tu trouvé ta peur, jeune sorcier ? Ne tarde pas trop — les ombres se nourrissent du doute autant que de l'oubli. »

**ready**
> « Tu as défié ta peur. Voilà qui te servira plus que n'importe quel sort. Reçois ceci, et apprends ce léger sortilège — il te sera utile. »

### Quête 3 — `dumbledore_courage` (étage 5, kill 2 Mangemorts)

**offer**
> « Deux Mangemorts ont franchi nos défenses et rôdent dans les couloirs profonds. Élimine-les. C'est par la ruse autant que par le courage que l'on protège ceux qu'on aime. »

**active**
> « Les Mangemorts ne se rendent pas, jeune sorcier. Ils mourront pour leur cause — assure-toi qu'ils ne t'emportent pas avec eux. »

**ready**
> « Deux de moins. Le château respire un peu plus librement. Voici une potion d'eux que j'ai concoctée pour toi — et un bonus de force et de magie qui t'accompagneront. »

### Quête 4 — `dumbledore_resistance` (étage 7, kill Mangemort d'élite)

**offer**
> « Un Mangemort d'élite, membre du cercle intérieur, s'est glissé jusqu'aux étages oubliés. Trouve-le. L'Ordre du Phénix compte sur toi. »

**active**
> « Méfie-toi — il porte la Marque depuis des décennies. Son Cruciatus est implacable. Frappe vite, et garde une potion à portée de main. »

**ready**
> « L'Ordre te remercie, jeune sorcier. Reçois cette amulette — elle a appartenu à un ami que je n'ai pas pu sauver. Qu'elle te protège mieux qu'elle ne l'a protégé. »

### Quête 5 — `dumbledore_revelation` (étage 10, vaincre Bellatrix)

**offer**
> « Au plus profond, une ombre se reforme. Bellatrix Lestrange a juré de finir ce que son maître n'a pu accomplir. Affronte-la — pour Poudlard, pour ceux que nous avons perdus. »

**active**
> « Bellatrix n'a peur de rien — sauf de l'amour, qu'elle ne comprend pas. Garde cela en tête. Ne la sous-estime pas. »

**ready**
> « Tu l'as fait. Tu as tenu tête à l'ombre… et tu en sors plus lumineux qu'avant. Reçois ce dernier don — un fragment de moi-même, en somme — et continue ton chemin. Poudlard te doit beaucoup. »

## 4. Phases

### Phase A — Génération (utilisateur)
- [ ] A1 : ouvrir ElevenLabs Studio, charger la voix « My Dumbledore ».
- [ ] A2 : générer les **15 MP3** un par un avec les textes ci-dessus.
      Settings : stability 50, similarity 75, style 0, speaker_boost on,
      modèle `eleven_multilingual_v2`. Une régénération par fichier si
      pacing imparfait.
- [ ] A3 : déposer les 15 MP3 dans la conversation (ou dans
      `audio/voice/_raw/`) avec un nommage clair :
      `dumbledore_<qid>_<state>_1.mp3`.

### Phase B — Encodage (Claude)
- [ ] B1 : `ffmpeg -i src.mp3 -ac 1 -ar 22050 -c:a libvorbis -q:a 3 dst.ogg`
      pour chaque fichier. Cible ≤ 50 KB par OGG (total ≤ 750 KB).
- [ ] B2 : fade-out 300 ms en fin de chaque sample
      (`afade=t=out:st=…:d=0.3`) pour éviter les coupures abruptes.
- [ ] B3 : vérifier les durées (cible 5–12 s) et le poids cumulé.

### Phase C — Câblage code (Claude — fait dans cette PR, fallback silencieux)
- [x] C1 : `npcs.js` — `dumbledore.dialoguesByQuest` étendu avec 4 quêtes
      (eveil/courage/resistance/revelation) × 3 entrées
      (`questOffer` / `questActive` / `questReady`). intro_tutoriel
      garde les `dialogues.*` globaux.
- [x] C2 : `audio-music.js` — `_VOICE_SAMPLES` étendu avec les 15 clés.
- [x] C3 : `npc-dialog.js` — fonction `_playPageVoice()` appelée par
      `_renderDialogPage()`. Calcule la clé via `_voiceKeyForPage(npcId,
      state, qid, pageIdx)`. Stoppe la voix précédente avant
      la nouvelle. `closeNpcDialog()` appelle `stopVoice()`.
- [x] C4 : fallback silencieux : si la clé n'a pas d'OGG associé,
      `playVoice()` retourne immédiatement (déjà géré côté audio).

### Phase D — Validation
- [ ] D1 : `node tests/smoke.js` vert (les OGG sont optionnels, fallback).
- [ ] D2 : test HTTP avec une vieille save niveau 5+ : ouvrir dialogue
      Dumbledore alors qu'une quête de la chaîne est en cours →
      voix joue à chaque page, stop à `Suivant ▸` / fermeture modale.
- [ ] D3 : ducking musique vérifié (héritage du système intro).
- [ ] D4 : pas de `console.error` sur fichier manquant (fallback silencieux).

## 5. Critères d'acceptation

- 15 OGG livrés dans `audio/voice/` avec le nommage exact.
- Poids cumulé ≤ 750 KB (50 KB × 15).
- Voix joue à chaque page de dialogue Dumbledore en jeu.
- Pas de chevauchement (stopVoice avant playVoice).
- Aucune erreur console si OGG manquant.
- Smoke vert.

## 6. Hors scope

- Autres PNJs (Pomfresh, Lockhart, Mimi, Hagrid…) : restent text-only.
- Combats : sorts toujours sur SpeechSynthesis (`speakSpell`).
- Sous-titres karaoké, surlignage mot-à-mot : non.
- Localisation (FR uniquement).

## 7. Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-12 | Plan rédigé, Phase C codée | Code prêt, fallback silencieux validé. Attente Phase A. |

# Plan — Complétion audio : voix de sorts + musiques de combat manquantes

> Branche : `claude/icon-decoration-audio-review-4gsYr`
> Convention : `[ ]` pending · `[~]` in progress · `[x]` done

## Contexte (issu de la revue)

Audit icônes/décoration/audio : **0 lacune d'image** (items 94/94, monstres
66/66, sorts/statuts/sprites couverts). Deux lacunes audio identifiées :

1. **Musiques de combat** : `combat_epic.ogg` + `combat_late.ogg` référencées
   (`js/audio-music.js _COMBAT_SAMPLES`) mais absentes → repli `combat_normal`.
2. **Voix de sorts** : seuls 13 sorts ont une voix enregistrée
   (`SPELL_VOICE_MAP`, `js/audio-sfx.js`) ; les autres tombent sur la
   synthèse vocale runtime (SpeechSynthesis).

## Décisions

- **Voix** : pipeline existant `edge-tts` (voix `hermione` = fr-FR-EloiseNeural,
  rate -4 %) → mp3 `audio/voice/_raw/` → OGG 22050 Hz mono vorbis q3
  `audio/voice/`. Faisable de bout en bout ici (edge-tts + binaire ffmpeg via
  `imageio-ffmpeg`).
- **Musique** : les `.ogg` existants ont été générés par un outil IA externe
  (Lyria). **L'utilisateur fournit les MP3 générés depuis un prompt Gemini que
  je rédige** ; je fais la conversion OGG (44100 Hz mono, ~30 s) + le câblage +
  les tests.

## Étapes

### A. Voix de sorts — 100 % de couverture (34 sorts ajoutés)
> Le compte réel de `SPELLS` est **47** (et non 33 : un split naïf
> sous-comptait). 13 étaient déjà voisés ; **34 ajoutés** en 2 vagues.
- [x] Lister les sorts manquants (SPELLS \ SPELL_VOICE_MAP) → 34 sorts.
- [x] Vague C (23) + Vague D (11) ajoutées dans `LINES["hermione"]` de
      `tools/gen_voice_edge.py` (voix `hermione`).
- [x] Synthétiser via edge-tts → 34 mp3 `audio/voice/_raw/spell_*.mp3`
      (seules les NOUVELLES clés, sans réécrire les 13 existantes).
- [x] Encoder en OGG (22050 Hz mono vorbis q3, binaire ffmpeg via
      `imageio-ffmpeg`) → 34 `audio/voice/spell_*.ogg` (total 47).
- [x] Câbler `_VOICE_SAMPLES` (audio-music.js) : 34 entrées `spell_* → path`.
- [x] Câbler `SPELL_VOICE_MAP` (audio-sfx.js) : 34 entrées `Nom → spell_*`.
- [x] Ajuster le smoke test : l'exemple « sort hors map » codait `Lumos
      Maxima` (désormais voisé) → remplacé par `Sortilège Inconnu`.
- [x] `node tests/smoke.js` → **124 scénarios verts**.
- [x] Vérif cohérence : 47/47 mappés, 0 sample manquant, 0 fichier manquant.

### B. Musique de combat (combat_epic + combat_late) — en attente MP3 user
- [x] Rédiger 2 prompts Gemini détaillés (epic = boss intense ;
      late = profondeurs sombres, étage ≥ 10). Livrés à l'utilisateur
      (voir §Prompts ci-dessous).
- [x] MP3 fournis par l'utilisateur (Gemini, 30,77 s / 44,1 kHz stéréo),
      convertis en OGG 44100 Hz mono vorbis q3 (mêmes specs que
      `combat_normal.ogg`) :
      - `iron_crown_falling` → `audio/combat_epic.ogg`
      - `siege_of_bone`      → `audio/combat_late.ogg`
- [x] Vérifié : le code les référence déjà (`_COMBAT_SAMPLES`,
      audio-music.js) → aucune modif JS. `audio/` est en
      stale-while-revalidate (sw.js) → pas de bump `CACHE_VERSION`.
- [x] Re-audit refs audio : **0 fichier manquant, 0 orphelin**.
- [x] `node tests/smoke.js` → 124 scénarios verts.

## Prompts Gemini — musiques de combat

**combat_epic.ogg** (boss épiques — `epic:true` dans monsters.js) :
> Epic orchestral boss battle music for a dark fantasy wizard RPG set in the
> dungeons of a magical castle. Driving cinematic intensity: thunderous
> taiko/timpani percussion, urgent staccato low strings ostinato, soaring
> brass fanfare motif, choir stabs, a sense of a desperate climactic duel
> against a powerful dark sorcerer. Key of D minor, tempo ~140 BPM, building
> tension with no let-up. Fully instrumental, no vocals/lyrics. Must loop
> seamlessly (no fade in/out, consistent energy start to end). Duration ~30
> seconds. Harry-Potter-like dark magical orchestral tone.

**combat_late.ogg** (étage ≥ 10 — profondeurs) :
> Dark, oppressive combat music for the deepest abyssal floors of a magical
> dungeon RPG. Ominous and heavy: low droning cellos and double bass, dissonant
> string clusters, slow menacing war-drum pulse, occasional distant brass
> growls and metallic percussion, a creeping dread of forgotten depths. Key of
> C minor, tempo ~100 BPM, brooding and relentless rather than fast. Fully
> instrumental, no vocals/lyrics. Must loop seamlessly (no fade). Duration ~30
> seconds. Matches an austere, abyssal Harry-Potter-like dungeon atmosphere.

> Format cible après génération : MP3 ou WAV, je convertis en OGG mono 44,1 kHz
> ~30 s (mêmes specs que `combat_normal.ogg`).

## Notes
- `speakSpell(spell.name)` reçoit le nom d'affichage exact → clés
  `SPELL_VOICE_MAP` = noms canoniques de `SPELLS`.
- Voix uniforme `hermione` pour tous les sorts (cohérent avec les 13 existants).

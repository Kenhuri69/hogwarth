# Bugs de la fonction d'aide (tour guidé)

Deux bugs rapportés (captures mobiles, étapes 14/15 du tour) :

1. **Bouton non contextualisé** — Les étapes « Sauvegarder » (idx 13) et
   « Besoin d'aide ? » (idx 14) ciblent `button[onclick="openSaveDialog()"]`
   et `button[onclick="openHelpMenu()"]`. Or ces boutons vivent désormais
   **dans la modale Réglages fermée** (`#settings-modal`, derrière le bouton
   ⚙️ `openSettingsModal()`). Pendant le tour, ils sont invisibles
   (`_htIsVisible` false) → pas de spotlight → bulle centrée sans contexte.

2. **Audio en allemand** — La narration `mcgonagall_help` est synthétisée
   avec `de-DE-SeraphinaMultilingualNeural` (voix **allemande**). Elle
   prononce des mots avec des phonèmes/mots allemands. Doit être en français.

## Étapes

1. [x] Retarget des étapes 13 & 14 vers le bouton visible
   `button[onclick="openSettingsModal()"]` (Réglages) + texte clarifié
   (Sauver/Charger/Aide sont dans Réglages).
   → vérif : spotlight sur le bouton Réglages, plus de bulle centrée.
2. [x] Voix `mcgonagall_help` → `fr-FR-DeniseNeural` (féminine,
   autoritaire — colle à McGonagall) dans `tools/gen_voice_edge.py`.
   Textes `_14`/`_15` alignés sur le nouveau copy à l'écran.
   → vérif : régénération OGG sans mot allemand.
3. [x] Régénérer les 15 OGG `mcgonagall_help_*` (mp3 edge-tts → ogg
   vorbis mono 22050 Hz q3, format identique à l'existant).
   → vérif : `ffprobe` montre vorbis/22050/mono ; écoute = français.
4. [x] MAJ commentaires `help-tour.js` (voix française) — surgical.
5. [x] `node tests/smoke.js` vert (T1–T9 du bloc help-tour).

## Hors-scope
- Voix des **dialogues PNJ** de McGonagall (toujours de-DE) : non rapporté
  par l'utilisateur, on ne touche pas (changement chirurgical).

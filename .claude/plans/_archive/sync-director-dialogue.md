# Synchronisation voix / texte — dialogues des Chefs de Maison

## Problème constaté
Les 4 Chefs de Maison (McGonagall, Rogue, Flitwick, Chourave) ont chacun
**7 répliques `idleRandom`** dans `js/npcs.js`. Le dialogue en affiche une
au hasard, mais la voix `_voiceKeyForPage` retourne toujours `<npc>_idle_1`
(un seul OGG). Résultat : 6 fois sur 7, la voix ne correspond pas au texte
(ex : texte « Vous avez prouvé votre valeur… », voix « L'ordre doit être
maintenu… »).

Cause secondaire : `openNpcDialog` appelle `_resolveDialogSource` deux fois
(via `_npcDialogPages` puis `_npcDialogSource`) — deux tirages aléatoires
indépendants. Impossible de savoir quelle réplique a été affichée.

## Étapes

1. **Plan écrit** → ce fichier. ✅
2. **`js/npc-dialog.js` — résolution unique + index idle**
   - `_resolveDialogSource` retourne `idleIndex` (index tiré dans
     `idleRandom`, `-1` sinon).
   - `_npcDialogPages` accepte un objet résolu optionnel (évite le 2e
     tirage).
   - `openNpcDialog` résout **une seule fois**, stocke `idleIndex` dans
     `_dialogState`.
   - `_voiceKeyForPage` : pour les Chefs de Maison en `source:'idle'`,
     utilise `idleIndex` → `<npc>_idle_<idleIndex+1>`.
   - `_playPageVoice` transmet `idleIndex`.
   → vérif : `node tests/smoke.js` scénario voix Chefs de Maison vert.
3. **`js/audio-music.js` — enregistrer les clés OGG**
   - Ajouter `<npc>_idle_2..7` pour les 4 chefs (24 clés).
   → vérif : `_VOICE_SAMPLES` contient les 28 clés idle.
4. **`tools/gen_voice_edge.py` — synchroniser le texte source**
   - `LINES` : remplacer la ligne idle unique par les 7 répliques
     `idleRandom` exactes de `npcs.js`, clés `<npc>_idle_1..7`.
   → vérif : texte du script == texte de `npcs.js` (copie exacte).
5. **Générer les 28 OGG**
   - `python3 tools/gen_voice_edge.py mcgonagall rogue flitwick sprout`
   - encoder chaque MP3 → OGG mono 22050 Hz vorbis q3 dans `audio/voice/`.
   → vérif : 28 fichiers `audio/voice/<npc>_idle_<n>.ogg` présents.
6. **Smoke test — garde-fou anti-dérive**
   - Pour chaque chef, asserter qu'il existe une clé `_VOICE_SAMPLES`
     `<npc>_idle_<n>` pour chaque entrée `idleRandom`.
   - Asserter que `_voiceKeyForPage(..., 'idle', idleIndex)` suit l'index.
   → vérif : `node tests/smoke.js` entièrement vert.

## État final — toutes les étapes ✅
1. ✅ Plan écrit.
2. ✅ `npc-dialog.js` : résolution unique + `idleIndex` propagé jusqu'à
   `_voiceKeyForPage`.
3. ✅ `audio-music.js` : 28 clés `<npc>_idle_1..7` enregistrées.
4. ✅ `gen_voice_edge.py` : `LINES` synchronisé avec les 7 répliques
   `idleRandom` exactes de `npcs.js` pour les 4 chefs.
5. ✅ 28 OGG générés et encodés dans `audio/voice/`.
6. ✅ Smoke test T6 (anti-dérive) ajouté ; `node tests/smoke.js` vert.

## Écarts constatés
- `_npcDialogSource` conservée telle quelle : encore utilisée par les
  scénarios smoke T2/T3 (états non-idle, déterministes). `openNpcDialog`
  ne s'en sert plus — la source vient désormais de la résolution unique.
- Re-génération TTS non déterministe : 2 MP3 `_raw` au texte inchangé
  (`mcgonagall_golem_ready_1`, `sprout_greeting_1`) ont été restaurés
  via `git checkout` pour garder le diff chirurgical.
- Sync durable : si une 8ᵉ réplique `idleRandom` est ajoutée sans OGG,
  le smoke test T6 échoue — garde-fou anti-dérive voix/texte.

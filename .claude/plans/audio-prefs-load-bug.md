# Fix : le son / la voix des sorts ne marche plus après avoir chargé une sauvegarde

## Symptôme
« La description du son ne semble plus fonctionner depuis qu'une sauvegarde
est chargée. » → Après chargement d'une partie, la voix des sorts (et/ou le
son) est coupée alors que le joueur ne l'a pas désactivée dans la session
courante.

## Cause (reproduite)
`_applyState()` (`js/save.js`) **écrase** les préférences audio vivantes avec
celles figées dans le slot :

```js
if (gs.audioMuted   !== undefined) AudioSystem.isMuted      = gs.audioMuted;
if (gs.voiceEnabled !== undefined) AudioSystem.voiceEnabled = gs.voiceEnabled;
```

Si un slot (souvent un **auto-save**) a été écrit pendant que le son/la voix
était coupé, le charger re-coupe le son du joueur. Repro headless confirmée :
joueur voix ON + son ON → charge un slot voix OFF + muet → voix OFF + muet.

`isMuted` / `voiceEnabled` sont des **réglages d'interface**, pas de l'état de
partie : ils ne devraient pas voyager par slot.

## Décision
Déplacer les préférences audio vers une clé localStorage globale
(`hogwarts_rpg_audio_prefs`), indépendante des sauvegardes. Charger une partie
ne touche plus les préférences audio.

## Étapes
1. ✅ `js/audio.js` : clé `_PREFS_KEY` + `_savePrefs()` / `_loadPrefs()`.
   `toggleMute()` / `toggleVoice()` persistent ; `_loadPrefs()` au démarrage ;
   `refreshButtons()` sur `DOMContentLoaded` pour synchroniser les icônes.
   → vérifié : toggle persiste après reload de page (repro3).
2. ✅ `js/save.js` : clobber des prefs audio retiré de `_applyState` ; champs
   `audioMuted` / `voiceEnabled` retirés de `_serializeState` (devenus morts).
   Compat ascendante : anciens slots ignorés sans migration.
   → vérifié : repro headless — charger un slot « muet » ne coupe plus le son.
3. ✅ Smoke scénarios audio + save : cmdbtnicons, saveslots, slotmodal,
   autosave, corruptsave, oldsavemap, housesaveroundtrip, loader → 8/8 verts.

## Vérification finale
- ✅ Repro mismatch : `afterLoad` conserve les prefs vivantes (voix/son ON).
- ✅ Préférence persiste après rechargement de page (localStorage + icônes).
- ✅ Smoke ciblé vert (8 scénarios).

# Plan — Sample musical d'ambiance d'intro (Gemini/Lyria)

> **Statut** : pending — phase test uniquement (ambiance d'intro, étages 1-2)
> **Branche dédiée** : à créer (`claude/audio-intro-sample-<slug>`)
> **Convention** : `[ ]` pending · `[~]` in progress · `[x]` done

---

## 1. Contexte

L'audio actuel est **100 % procédural** via Web Audio API
(`js/audio.js`, `js/audio-music.js`, `js/audio-sfx.js`), sans dépendance
ni asset binaire. La musique d'ambiance est découpée en **5 zones**
selon l'étage (`audio-music.js:9-100`) :

| Étage | Ambiance | Échelle | Tempo | Drone |
|-------|----------|---------|-------|-------|
| **1-2** | Hauts couloirs — clair et mystérieux | C maj penta étendue | 750 ms | — |
| 3-4 | Salles intermédiaires — tension | A min | 700 ms | A1 |
| 5-6 | Cachots — angoissant | G min | 640 ms | D1 |
| 7-8 | Profondeurs — oppressant | E min | 580 ms | — |
| 9+ | Cœur du Mal | C min | 520 ms | — |

Déclencheurs de l'ambiance d'intro (zone 1-2) :
- `js/main.js:256` — `AudioSystem.playAmbientMusic(1)` après `startGame()`
- `js/save-ui.js:284` — idem au chargement d'une sauvegarde

Le titre / sélection de héros / choix de Maison **n'ont pas de musique**
(geste utilisateur requis pour démarrer l'AudioContext).

## 2. Objectif de la phase test

**Périmètre strict : remplacer uniquement la zone 1-2** par un sample
généré (Gemini Lyria ou équivalent). Pas de refonte plus large tant
que le test n'est pas concluant.

Critères de réussite (à mesurer en fin de test) :
1. **Qualité perçue** vs. procédural : améliorée nettement (sinon on
   abandonne la piste).
2. **Bouclage seamless** : crossfade Web Audio inaudible à l'oreille
   sur 3 boucles successives.
3. **Poids** : sample ≤ 250 KB en OGG Vorbis 96 kbps mono ou stéréo
   réduite ; latence de chargement < 500 ms sur connexion 4G simulée.
4. **Fallback** : si le sample échoue à charger ou si l'utilisateur a
   coupé le son via la balise meta `prefers-reduced-data`, on retombe
   sur la synthèse procédurale actuelle, sans erreur console.
5. **Non-régression** : `node tests/smoke.js` reste 26/26.

## 3. Étapes

### Phase A — Génération du sample

- [ ] **A1** Rédiger un prompt court pour Gemini Lyria visant la zone
      1-2 (mots-clés : *Harry Potter / Hogwarts corridor / ambient
      pentatonic / harp + low strings / mysterious / 20 s loopable /
      no melody hook / 70 BPM*). Cible : durée 20 s, BPM ~70-80, sans
      tonique forte sur le dernier temps pour faciliter le bouclage.
- [ ] **A2** Utilisateur génère le sample côté Gemini, le ré-écoute,
      vérifie que les 200 dernières ms sont identiques aux 200
      premières (sinon re-run avec mention "seamless loop").
- [ ] **A3** Utilisateur partage le fichier audio dans la conversation.

### Phase B — Encodage et intégration

- [ ] **B1** Convertir en **OGG Vorbis** mono 96 kbps via `ffmpeg`
      (cible ≤ 250 KB pour 20 s). Sauvegarder sous
      `audio/ambient_intro.ogg`. Sortir aussi une variante MP3 128 kbps
      au cas où un navigateur ne lit pas OGG (rare en 2026, à valider).
- [ ] **B2** Ajouter un module léger dans `js/audio-music.js` :
      `loadSample(url)` → fetch + `decodeAudioData` une seule fois,
      cache en `this._sampleCache`. Garde-fou : `try/catch` ; toute
      erreur (network, decode, format) → fallback synthèse procédurale.
- [ ] **B3** Modifier `playAmbientMusic(floor)` pour la zone 1-2 :
      si `this._sampleCache.intro` est dispo, jouer via
      `AudioBufferSourceNode` avec `loop = true`, sinon retomber sur le
      code procédural existant. Crossfade 200 ms sur les bords via un
      `GainNode` modulé par `setValueCurveAtTime`.
- [ ] **B4** Mise à jour de `CLAUDE.md` section audio : citer
      `audio/ambient_intro.ogg` et le fallback.

### Phase C — Validation

- [ ] **C1** Test manuel local (`python3 -m http.server` puis ouvrir
      `index.html`) : démarrer une partie, écouter 3 boucles
      consécutives au minimum. Pas de pop, pas de gap, pas de glitch
      au crossfade.
- [ ] **C2** Test fallback : renommer temporairement
      `audio/ambient_intro.ogg` → vérifier que la console ne log
      qu'un seul `warn` propre et que la synthèse procédurale prend
      le relai.
- [ ] **C3** `node tests/smoke.js` → 26/26.
- [ ] **C4** Test poids/latence : `ls -la audio/` + Lighthouse Audit
      sur la page (option *Throttling: Slow 4G*). Cible < 500 ms.
- [ ] **C5** A/B test à l'oreille pendant 60 s d'exploration : noter
      ressenti. Décision **go / no-go** pour les zones 3-9.

### Phase D — Décision (post-test)

- [ ] **D1** Si **go** : rédiger un plan dédié pour les 4 autres zones
      (`audio-zones-extended.md`). Stratégie : 4 samples + crossfade
      entre eux à l'entrée d'étage.
- [ ] **D2** Si **no-go** : documenter dans ce fichier les raisons
      (qualité, poids, bouclage…) et figer le projet sur la synthèse
      procédurale. Supprimer le sample test et le code de chargement
      pour ne pas alourdir le bundle.

## 4. Critères d'acceptation (récap)

- Sample OGG ≤ 250 KB, 20 s, mono 96 kbps.
- Boucle sans coupure audible (3 itérations consécutives).
- Fallback procédural fonctionne en cas d'échec de chargement.
- Aucun nouvel `console.error` non filtré dans smoke.
- Lighthouse mobile ≥ 90 (perf) après ajout du sample.

## 5. Hors scope (volontairement)

- Pas de touche aux zones 3-9 tant que le test n'est pas concluant.
- Pas de touche aux SFX (`audio-sfx.js`) : ils restent procéduraux.
- Pas de musique de combat ni de victoire : `startCombatMusic` /
  `playVictory` inchangés.
- Pas de musique sur écran-titre / sélection (geste utilisateur requis).

## 6. Risques identifiés

| Risque | Mitigation |
|--------|------------|
| Gemini Lyria limité à 30 s ou non-loopable | Demander explicitement boucle 20 s ; fade manuel en post-process avec `ffmpeg afade` |
| Licence IA-générée flou en jeu publié | Lyria via Google AI Studio = OK perso ; à clarifier avant publication commerciale |
| Pop audible au début/fin de boucle | Crossfade Web Audio 200 ms ; sample fade-in/fade-out de 50 ms en amont |
| Bundle alourdi de ~250 KB | Acceptable pour 1 sample ; à reconsidérer si on étend à 5 zones (~1 MB) |
| Browser sans support OGG (Safari historique) | Variante MP3 en fallback + détection via `canPlayType` |

## 7. Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-11 | Plan rédigé | Périmètre figé : zone 1-2 uniquement, fallback procédural obligatoire |
| 2026-05-11 | A1 prompt rédigé | « Hogwarts corridor ambient, harp + low strings + celesta, 72 BPM, 20 s seamless loop, no melodic hook » + variante anti-IP-filter |
| 2026-05-11 | A2-A3 sample reçu | `under_the_canopy_1.mp3` — 30,77 s stéréo 192 kbps. Plus long que les 20 s cible (acceptable). Fade-in audible en début → bouclage brut imparfait, sera absorbé par crossfade 1 s en code |
| 2026-05-11 | B1 encodage OGG | `audio/ambient_intro.ogg` mono q2 (libvorbis) = 232 KB (sous la cible 250). 30,77 s, 44,1 kHz |
| 2026-05-11 | B2-B3 intégration | `audio.js` : 4 nouveaux champs sur `AudioSystem` (`_sampleBuffer`, `_sampleLoadPromise`, `_sampleSources`, `_sampleLoopTimer`) + nettoyage dans `stopMusic()`. `audio-music.js` : `playAmbientMusic` devient un dispatcher (zones 1-2 → sample-or-fallback, zones 3+ → procédural). Nouvelles méthodes : `_loadIntroSample()` (lazy fetch + decodeAudioData + cache + retry sur erreur), `_playIntroSampleLoop()` (crossfade 1 s entre itérations, deux `AudioBufferSourceNode` qui se chevauchent), `_playProceduralAmbient(f)` (extraction du code procédural existant, inchangé). En cas d'erreur (fetch, decode, format) → `console.warn` + fallback automatique sur procédural |
| 2026-05-11 | B4 doc | `tests/smoke.js` : filtre `isIgnorableError` étendu au pattern `URL scheme "file" is not supported` + `ambient_intro.ogg` (limite Chromium file:// ; fallback fonctionne mais Chromium log avant le catch). En prod HTTP cette erreur n'apparaît pas |
| 2026-05-11 | C1 test manuel HTTP | `python3 -m http.server 8765` + Playwright headless : sample décodé (`buffer.duration` = 30,77 s), 1 source active, `ctx.state = "running"`, aucun warn audio. Bouclage à vérifier sur 3 itérations en jeu réel |
| 2026-05-11 | C3 smoke | 26/26 ✓ (filtre ajusté pour le bruit Chromium file://) |
| 2026-05-11 | Followup user | « le rendu est top, mais je le ferais bien commencer à partir de l'introduction de Dumbledore ». `js/intro.js` (`showIntroScreen`) : `playAmbientMusic(1)` ajouté après `playNpcGreet()`. `js/audio-music.js` : `playAmbientMusic` devient idempotent — no-op si même zone musicale joue déjà, via helper `_sameAmbientZone(a,b)` (5 paliers : 1-2, 3-4, 5-6, 7-8, 9+). Évite tout restart à la transition intro → `startGame` qui rappelle aussi `playAmbientMusic(1)`. Test HTTP : 1 source maintenue entre les deux écrans, pas de coupure |
| 2026-05-11 | Phase D — Zone 3-4 | Sample `cold_marble_steps.mp3` (25,31 s stéréo 192) reçu → encodé en `audio/ambient_tension.ogg` (mono q2 = 184 KB). Généralisation du loader : `_sampleBuffer` → `_sampleBuffers[zoneKey]`, `_sampleLoadPromise` → `_sampleLoadPromises[zoneKey]`. Nouveau registre `_ZONE_SAMPLES = { intro, tension }` (dungeon/depths/abyss non livrés → fallback procédural automatique). Méthodes renommées : `_loadIntroSample` → `_loadZoneSample(zoneKey)`, `_playIntroSampleLoop` → `_playZoneSampleLoop(zoneKey)`. Helper `_zoneKeyForFloor(f)`. Smoke filter étendu à `audio/ambient_*.ogg`. Bug fix au passage : virgule manquante après `_sampleLoopTimer` dans audio.js (cassait le parsing JS). Test HTTP transitions floor 1→3→5 : buffers cumulés en cache, source unique, 0 warning |
| 2026-05-11 | Phase D — Zone 5-6 | Sample `below_the_surface.mp3` (28,47 s stéréo 192) reçu → encodé en `audio/ambient_dungeon.ogg` (mono q2 = 205 KB). Branchement : 1 ligne dans `_ZONE_SAMPLES.dungeon`. Test HTTP floor=5 : buffer chargé (28,47 s), 1 source active, 0 warning |

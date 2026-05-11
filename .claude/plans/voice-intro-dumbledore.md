# Plan — Voix narrative pour l'intro Dumbledore

> **Statut** : pending — phase test sur l'intro Dumbledore uniquement
> **Convention** : `[ ]` pending · `[~]` in progress · `[x]` done

---

## 1. Contexte

L'introduction du jeu (post-choix de Maison, avant entrée en donjon)
affiche un écran narratif géré par `js/intro.js` :

- `showIntroScreen(onContinue)` ouvre `#intro-screen` avec le portrait,
  le nom et le titre du PNJ guide (Dumbledore).
- Le dialogue est lu depuis `NPCS[id=dumbledore].dialogues.greeting`,
  un tableau de pages affichées une par une.
- L'utilisateur clique « Suivant ▸ » pour passer à la page suivante,
  puis « Accepter & Entrer à Poudlard » sur la dernière.
- Aujourd'hui : aucune voix, juste du texte. Côté audio uniquement une
  petite cloche `playNpcGreet()` à l'ouverture du dialogue, et la
  musique d'ambiance qui démarre en arrière-plan (depuis PR #74).

**Pages de l'intro Dumbledore** (`js/npcs.js:62-64`) :

> **Page 1** — « Ah, te voilà enfin ! Bienvenue dans les profondeurs
> de Poudlard, jeune sorcier. Le château recèle bien des mystères. »
>
> **Page 2** — « Pour ta première épreuve, descends d'un étage. Une
> fois fait, retrouve-moi quelque part dans ces couloirs — je te
> récompenserai en personne. »

## 2. Objectif

**Périmètre strict** : ajouter une voix pré-générée sur **les 2 pages
de l'intro Dumbledore uniquement**. Pas d'autre PNJ touché pour
l'instant. Décision d'étendre prise après écoute (phase D du plan).

Critères de réussite :
1. **Qualité perçue** : voix d'ancien sorcier britannique chaleureuse,
   crédible pour le rôle (le Dumbledore du jeu, pas une copie de
   l'acteur du film).
2. **Synchronisation** : la voix démarre quand la page est affichée,
   s'arrête quand l'utilisateur clique Suivant / Continuer (ou si
   l'intro est fermée).
3. **Coexistence audio** : la voix joue sur un canal dédié sans casser
   l'ambient music ni la cloche `playNpcGreet`. La musique baisse
   légèrement pendant la voix (ducking ~30 %) puis remonte.
4. **Poids** : les 2 fichiers OGG cumulés ≤ 250 KB.
5. **Fallback** : si un fichier voix manque ou échoue à charger, on
   reste muet (pas de SpeechSynthesis-cobaye) et l'intro fonctionne
   normalement. Aucun `console.error` non filtré.
6. **Non-régression** : `node tests/smoke.js` reste 26/26.

## 3. Architecture

### 3.1 Génération
- **Service recommandé** : ElevenLabs (voix « British elderly narrator »
  ou voix personnalisée « wise wizard ») OU OpenAI TTS modèle `tts-1-hd`
  voix `fable` (British masculin). Au choix de l'utilisateur, qui livre
  les fichiers MP3/WAV bruts.
- **Cible par fichier** : MP3 ou WAV mono ou stéréo, durée 5-12 s par
  page. La voix doit être livrée **sans musique de fond**, sans
  effets — Web Audio fait le mixage final.

### 3.2 Encodage
- Chaque fichier source → `audio/voice/dumbledore_intro_1.ogg` et
  `audio/voice/dumbledore_intro_2.ogg` via :
  ```
  ffmpeg -i src.mp3 -ac 1 -ar 22050 -c:a libvorbis -q:a 3 dst.ogg
  ```
  (mono 22 kHz q3 ≈ 50 kbps — la voix demande peu de bande passante
  haute fréquence ; 250 KB cumulés faisable largement).

### 3.3 Code — nouveau dossier voix
- Nouvelle constante `_VOICE_SAMPLES` dans `audio-music.js` :
  ```js
  _VOICE_SAMPLES: {
    dumbledore_intro_1: 'audio/voice/dumbledore_intro_1.ogg',
    dumbledore_intro_2: 'audio/voice/dumbledore_intro_2.ogg',
  }
  ```
- Nouvelle méthode `playVoice(voiceKey)` qui :
  - Réutilise `_loadSample(key, url)` (déjà générique depuis PR #75).
  - Joue une seule fois (pas de loop), via `AudioBufferSourceNode`.
  - Pousse la source dans un nouveau tableau `_voiceSources` (séparé
    de `_sampleSources` pour ne pas être stoppé par `stopMusic`).
  - Connecte à un nouveau `voiceGain` dédié, créé dans `init()` à
    côté de `musicGain` / `sfxGain`.
  - Pendant la lecture, applique un **ducking** sur `musicGain`
    (`gain.value` × 0.30 fade in 200 ms, restauré 1×0.30→1 fade out
    200 ms après `onended`).
- Nouvelle méthode `stopVoice()` qui appelle `.stop()` sur tous les
  `_voiceSources` et restaure le `musicGain`.

### 3.4 Wiring intro.js
- `_renderIntroPage()` calcule la clé de voix
  `voiceKey = 'dumbledore_intro_' + (_introPage + 1)`.
- Si le PNJ courant a `_introPages` provenant de Dumbledore et que la
  clé existe dans `_VOICE_SAMPLES` → `AudioSystem.playVoice(voiceKey)`.
- `_advanceIntro()` et `_finishIntro()` appellent `AudioSystem.stopVoice()`
  avant tout changement de page (sinon les voix se superposent).

## 4. Étapes

### Phase A — Génération (utilisateur)
- [ ] **A1** Choisir le service TTS et le voice ID. Recommandé :
      ElevenLabs « Brian / Adam / Antoni » ou un clone wise-wizard,
      en réglage **stability ~0.45, similarity ~0.60, style ~0.35**.
      Alternative : OpenAI TTS `tts-1-hd` voix `fable`.
- [ ] **A2** Générer 2 fichiers, un par page, avec le texte exact
      des dialogues (cf. §1). Demander explicitement à la voix une
      diction posée, chaleureuse, paternelle.
- [ ] **A3** Partager les 2 fichiers (MP3 ou WAV) dans la conversation.

### Phase B — Encodage
- [ ] **B1** Convertir chaque fichier en OGG Vorbis mono q3 22 kHz via
      `ffmpeg`. Stocker dans `audio/voice/dumbledore_intro_<n>.ogg`.
      Vérifier ≤ 125 KB chacun (250 KB cumulé).

### Phase C — Code voix
- [ ] **C1** `audio.js` : ajouter `voiceGain` initialisé dans `init()`
      (gain.value = 0.9, connecté à `ctx.destination`) + champs
      `_voiceSources: []`, `_voiceLoadPromises: {}` côté
      `AudioSystem`.
- [ ] **C2** `audio-music.js` : registre `_VOICE_SAMPLES`, méthodes
      `playVoice(key)`, `stopVoice()`, helper `_duckMusic(start, end)`
      pour les transitions de gain de la musique pendant la voix.
- [ ] **C3** `intro.js` : appeler `AudioSystem.playVoice(...)` dans
      `_renderIntroPage`, et `AudioSystem.stopVoice()` dans
      `_advanceIntro` / `_finishIntro` / au reset du flow.

### Phase D — Validation
- [ ] **D1** `node tests/smoke.js` → 26/26. Filtre smoke à étendre si
      besoin (`audio/voice/*.ogg` couvert par le pattern existant
      `audio/*.ogg` si non-récursif — sinon élargir).
- [ ] **D2** Test HTTP local : démarrer une partie, écouter les 2
      pages de l'intro. Voix bien synchronisée, ducking propre,
      arrêt clean au clic Suivant.
- [ ] **D3** Test fallback : renommer un fichier voix → vérifier
      qu'aucune erreur n'apparaît et que l'intro fonctionne
      muette pour cette page.
- [ ] **D4** Décision **go/no-go** : si la qualité justifie le poids,
      ouvrir un suivi pour les autres PNJ. Sinon, garder le système
      en place mais ne pas l'étendre (ou bien le retirer si poids
      trop important).

## 5. Critères d'acceptation (récap)

- 2 fichiers OGG ≤ 125 KB chacun, ≤ 250 KB cumulés.
- Voix synchro avec l'affichage de chaque page.
- Stop propre au clic Suivant / Continuer / Esc.
- Ducking musique audible mais réversible.
- Fallback silencieux si fichier manque, aucun `console.error`
  non filtré.
- 26/26 smoke.

## 6. Hors scope (volontairement)

- Autres PNJs (Pomfresh, Lockhart, Mimi, Hagrid, Ollivander, Guipure,
  Fumseck, portrait_dumbledore) : restent text-only.
- Combat / spell / victoire : système voix inchangé pour les sorts
  (`speakSpell` reste sur SpeechSynthesis).
- Pas de sous-titrage karaoké, pas de surlignage mot-à-mot.
- Pas de localisation (FR uniquement pour le test).

## 7. Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Voix livrée trop lente / trop rapide vs durée de lecture confortable | Re-générer en ajustant rate/pacing ; ou découper le texte en sub-pages |
| Voix livrée avec respiration en fin (trail) qui rend la transition Suivant abrupte | `ffmpeg afade=t=out:st=…:d=0.3` sur les 300 dernières ms |
| Service TTS interdisant l'usage commercial sans plan payant (ElevenLabs Free) | Vérifier les ToS avant publication ; alternatif OpenAI TTS commercial OK |
| Voix qui se superposent si l'utilisateur clique Suivant très vite | `stopVoice()` systématique avant `playVoice()` (déjà prévu) |
| Mobile autoplay restrictions | Pas un risque : le geste utilisateur (chooseHouse) a déjà autorisé l'AudioContext |
| Tonalité incohérente entre les 2 pages (TTS non-déterministe) | Utiliser le même voice ID + même seed (ElevenLabs) ; sinon re-run jusqu'à cohérence |
| Bundle alourdi pour 1 seul PNJ test | 250 KB acceptable pour valider ; si extension décidée, anticiper budget ~2 MB pour 9 PNJs |

## 8. Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-11 | Plan rédigé | Périmètre figé : intro Dumbledore (2 pages), fallback silencieux, ducking musique. Phase A en attente. |
| 2026-05-11 | A → D | Phase A : 2 fichiers ElevenLabs « My Dumbledore » (voix clonée custom, settings sp100/s50/sb75/se0) reçus, MP3 mono 128 kbps 44,1 kHz, 6,82 s + 8,20 s. Phase B : encodés en OGG mono q3 22 kHz avec fade-out 300 ms en queue → `audio/voice/dumbledore_intro_1.ogg` (41 KB) + `_2.ogg` (49 KB), **total 90 KB** (sous budget 250 KB). Phase C : `audio.js` reçoit `voiceGain` dédié connecté à destination (gain 0.95), nouveaux champs `_voiceSources` / `_voicePending` / `_duckRampSeconds`. `audio-music.js` reçoit registre `_VOICE_SAMPLES`, méthodes `playVoice(key)` / `stopVoice()` / `_duckMusic(active)`. `intro.js` : `_renderIntroPage` appelle `playVoice('dumbledore_intro_' + (_introPage+1))` à chaque affichage de page ; `_advanceIntro` / `_finishIntro` appellent `stopVoice()` d'abord. Filtre smoke élargi de `audio/\w+\.ogg` à `audio/[\w/]+\.ogg` (couvre les sous-dossiers). Phase D : `node tests/smoke.js` → 26/26 ✓. Test HTTP : musicGain ducké à 0.078 (×0.30 base 0.26) pendant la voix, 1 source voix active, restauré à 0.26 après stopVoice. Clé inconnue → 0 source, 0 warning console (fallback silencieux propre). |

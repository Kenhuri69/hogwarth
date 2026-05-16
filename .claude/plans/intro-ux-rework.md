# Plan — Refonte ergonomie & UX de la phase d'introduction

> **Branche** : `claude/improve-intro-ux-0E995`
> **Statut** : en cours.

## 1. Contexte & objectif

La phase d'introduction (écran titre → hub → sélection des héros → choix de
Maison → écran Dumbledore) souffre de trois faiblesses :

1. **Aucune musique** avant l'écran Dumbledore — titre, hub et sélection
   sont silencieux.
2. **Sélection dense** — un seul écran empile mode solo/duo, grille de
   8 héros et difficulté.
3. **Pas de fil narratif** — rien ne guide le joueur ; Dumbledore est
   nommé et montré d'emblée, sans effet de révélation.

Objectif : une intro rythmée par une **voix narrative mystérieuse** (en
réalité Dumbledore, révélé seulement à l'écran d'intro), une **musique
de menu dédiée** dès le premier clic, et une **sélection en 3 étapes
guidées**.

Décisions de design validées avec l'utilisateur :
- Musique : **thème de menu dédié** (procédural, distinct de l'ambiance).
- Voix narrative : **voix seule en OGG**, aucun texte affiché.
- Sélection : **refonte en étapes guidées**.

## 2. Contraintes techniques

- L'`AudioContext` exige un geste utilisateur → la musique ne peut
  démarrer qu'au **premier clic** (sur l'écran titre, qui appelle
  `enterStartHub()`). L'écran titre lui-même reste muet : c'est le plus
  tôt légalement possible.
- Voix narrative = fichiers OGG. Tant qu'ils ne sont pas générés,
  `playVoice()` est en **fallback silencieux** : la sélection reste
  pleinement jouable, simplement sans narration.
- `confirmHeroSelection()` reste l'unique point d'entrée programmatique
  (utilisé par `tests/smoke.js`) — la refonte UI ne le casse pas.

## 3. Étapes

| # | Étape | Vérification |
|---|-------|--------------|
| 1 | `audio.js` : champ `inMenu`, branche `toggleMute` menu | smoke vert |
| 2 | `audio-music.js` : `playMenuMusic()` + `_playMenuTheme()` procédural ; `playAmbientMusic`/`startCombatMusic` resettent `inMenu` | musique titre→sélection puis bascule ambiance en jeu |
| 3 | `audio-music.js` : 5 clés `narrator_*` dans `_VOICE_SAMPLES` | fallback silencieux si OGG absent |
| 4 | `save-ui.js` : `enterStartHub()` lance musique de menu + `narrator_welcome` ; `startHubNewGame()` réinitialise le stepper | musique au 1er clic |
| 5 | `index.html` : `#player-select-screen` découpé en 3 `.psel-step` | 3 étapes affichées une à une |
| 6 | `main.js` : `pselGoStep()`, `pselReset()`, gating étape 2→3, voix par étape | navigation avant/arrière OK |
| 7 | `css/style.css` : styles `.psel-*` + animation de révélation `#intro-screen` | rendu cohérent + reveal |
| 8 | `tests/smoke.js` : scénario mobile met à jour le parcours en étapes | `node tests/smoke.js` vert |

## 4. Flux cible

```
title-screen ──click──► enterStartHub()
                        ├─ playMenuMusic()      (thème de menu procédural)
                        └─ playVoice('narrator_welcome')
start-hub ──"Nouvelle aventure"──► player-select (étape 1)
  Étape 1 — Mode      solo / duo      voix: narrator_mode
  Étape 2 — Héros     grille          voix: narrator_heroes
  Étape 3 — Épreuve   difficulté      voix: narrator_difficulty
            └─"Commencer"─► confirmHeroSelection()
house-select ───────────────────────► voix: narrator_house
  └─chooseHouse()─► showIntroScreen()  ◄── RÉVÉLATION : portrait + nom
                                            Dumbledore (animation reveal),
                                            bascule menu → musique ambiante
                    └─► startGame()
```

## 5. Voix narrative — textes FR à générer (Phase A, utilisateur)

Mêmes réglages ElevenLabs que l'intro Dumbledore existante (voix « My
Dumbledore », `eleven_multilingual_v2`, stability 50 / similarity 75 /
style 0 / speaker_boost on). Ton : chaleureux, mystérieux, bienveillant —
**sans jamais se nommer** (le joueur ne doit pas deviner Dumbledore).

| Clé OGG | Texte |
|---------|-------|
| `narrator_welcome` | « Approche, jeune sorcier. Les portes de Poudlard s'entrouvrent pour toi… une grande aventure t'attend dans ces murs. » |
| `narrator_mode` | « Dis-moi — affronteras-tu ces couloirs en solitaire, ou aux côtés d'un compagnon de confiance ? » |
| `narrator_heroes` | « Bien. Choisis maintenant celles et ceux qui porteront cette quête. Leur cœur comptera autant que leur magie. » |
| `narrator_difficulty` | « Toute épreuve a son prix. Quel défi ton courage est-il prêt à relever ? » |
| `narrator_house` | « Il ne reste qu'une chose à sceller… ton appartenance. Le Choixpeau saura lire en toi. » |

Encodage (Phase B) : `ffmpeg -i src.mp3 -ac 1 -ar 22050 -c:a libvorbis -q:a 3 audio/voice/<clé>.ogg`, fade-out 300 ms, cible ≤ 50 KB / fichier.

> La révélation à l'`#intro-screen` réutilise les OGG existants
> `dumbledore_intro_1/2.ogg` — pas de régénération nécessaire.

## 6. Hors scope

- Régénération des OGG `dumbledore_intro_*` existants.
- Localisation (FR uniquement).

## 7. Musique d'intro à l'aventure — prompt de génération

Le thème de menu est aujourd'hui **procédural** (`audio-music.js —
_playMenuTheme`). Pour le remplacer par un vrai sample, générer une piste
avec un outil de génération musicale (Suno, Udio, Gemini Lyria, ElevenLabs
Music…) à partir du prompt ci-dessous, puis partager le fichier dans la
conversation pour encodage + intégration (`audio/menu_theme.ogg`, le
procédural restant en fallback).

### Prompt principal (EN — à coller dans le générateur)

> Instrumental orchestral theme for the main menu of a magical fantasy RPG
> set in an old wizarding-school castle. Warm, wondrous and inviting, with a
> gentle undercurrent of mystery — the feeling of a great adventure about to
> begin at twilight. A lilting 3/4 waltz in a major key, around 76 BPM.
> Sparkling celesta and glockenspiel float over soft harp arpeggios; a tender
> legato string section carries a simple, hopeful melody, answered in
> call-and-response by solo clarinet and flute. Warm cello and double bass
> hold the harmony underneath. Intimate chamber-orchestra scale — no drums,
> no vocals, no brass fanfare. Soft, even dynamics so a narrator's voice can
> sit on top. Enchanted, tender, slightly nostalgic. Seamless loop with no
> hard ending and no big climax.

### Tags de style (champ court type Suno / Udio)

`orchestral fantasy score, magical, whimsical waltz, celesta, harp, strings,
clarinet, cinematic, instrumental, gentle, loopable`

### À éviter (negative prompt)

`vocals, lyrics, drums, percussion, heavy brass, epic climax, key-change
ending, fade-out, sound effects`

> ⚠️ Composition **originale** : ne pas reproduire « Hedwig's Theme » ni
> aucune musique existante de la saga — seulement le même esprit
> (émerveillement, celesta, valse féérique).

### Réglages techniques cibles

| Paramètre | Cible |
|-----------|-------|
| Format    | instrumental uniquement |
| Tempo     | ~76 BPM, mesure 3/4 |
| Tonalité  | majeur lumineux (Do majeur, couleurs passagères en La mineur) |
| Durée     | 40-60 s, **bouclable sans couture** (dernière mesure qui repart sur la première — pas de tonique finale tenue ni de ralenti) |
| Dynamique | douce et régulière (la voix narrative passe par-dessus) |
| Export    | WAV ou MP3 haute qualité → ré-encodé ensuite en OGG |

Une fois le fichier validé : `ffmpeg -i src.wav -ac 1 -ar 44100 -c:a libvorbis
-q:a 4 audio/menu_theme.ogg` (cible ≤ 250 KB), puis bascule dans
`playMenuMusic()` — sample si chargé, sinon `_playMenuTheme()` procédural en
fallback (même schéma que le plan archivé `audio-intro-sample.md`).

## 8. Journal

| Date | Étape | Notes |
|------|-------|-------|
| 2026-05-16 | Plan rédigé | Design validé (3 questions). Implémentation en cours. |
| 2026-05-16 | Étapes 1-8 livrées | Thème de menu procédural, voix narrative câblée, sélection en 3 étapes, animation de révélation Dumbledore. `node tests/smoke.js` vert. |
| 2026-05-16 | Phase A livrée | 5 OGG `narrator_*` générés (ElevenLabs « My Dumbledore ») et encodés mono 22 kHz, fade-out 300 ms, ≤ 50 KB chacun. Sources dans `audio/voice/_raw/`. |
| 2026-05-16 | Retour utilisateur | Fil d'Ariane libellé (desktop) / pastilles à icône (mobile) en remplacement des points ; scène de classe (`img/scenes/classroom.jpg`) en fond assombri de l'écran de sélection ; héros scindés en 2 regroupements — « Les Héros du Film » (Harry, Hermione) et « Le Cercle des Astres » (6 personnages). Smoke vert. |
| 2026-05-16 | Icônes PNG | Remplacement des emoji par 5 PNG dorés générés via `tools/gen_intro_icons.py` : 3 icônes de fil d'Ariane (Mode/Héros/Difficulté) + 2 emblèmes de groupe (éclair « Héros du Film », lune « Cercle des Astres »). En-têtes de groupe passés en doré vif (`var(--gold)`) pour les rendre bien visibles. Smoke vert. |
| 2026-05-16 | Filtre par groupe | L'étape Héros s'ouvre désormais sur un choix de groupe (2 tuiles) au lieu d'afficher les 8 héros d'un coup. Tuile « Héros du Film » en texte seul (en attente de personnages + illustration), tuile « Cercle des Astres » illustrée par `img/scenes/classroom.jpg`. Cliquer une tuile filtre la grille sur ce groupe ; lien « Choisir un autre groupe » pour revenir. `pselOpenGroup`/`pselShowGroupPicker` dans `main.js`. Smoke mis à jour (navigation via `psel-tile-film`). Vert. |
| 2026-05-16 | Musique au 1er geste | `_armMenuAudio` (`save-ui.js`) : écouteurs `pointerdown`/`keydown`/`touchstart` en capture qui lancent `playMenuMusic()` au tout premier geste du joueur, y compris sur l'écran titre. La politique d'autoplay des navigateurs interdit le son avant toute interaction — c'est donc le démarrage le plus précoce possible. L'appel dans `enterStartHub` devient un filet de sécurité idempotent. |
| 2026-05-16 | Prompt musique d'intro | Prompt de génération du thème de menu rédigé (§7) — valse féérique 3/4, ~76 BPM, celesta/harpe/cordes, bouclable. En attente du fichier audio pour encodage `audio/menu_theme.ogg` + intégration (fallback procédural conservé). |
| 2026-05-16 | Sample musique d'intro | Fichier « Lanterns in the Keep » fourni, encodé `audio/menu_theme.ogg` (mono 44,1 kHz, OGG q4, 282 KB, 30,8 s). `playMenuMusic()` charge le sample via `_loadSample('menu', …)` + boucle crossfadée `_playSampleLoop` ; `_playMenuTheme()` procédural conservé en fallback sur erreur. Vérifié au navigateur (HTTP) : buffer décodé, loop active, AudioContext running. Smoke vert. |

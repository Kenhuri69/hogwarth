# Voix ElevenLabs — Manon & Élara (prompt à remplir)

> Pipeline du jeu : MP3 → OGG Vorbis mono 22 kHz (`tools/encode_voice.sh`).
> Tu génères les **MP3** dans ElevenLabs avec les réglages ci-dessous, tu me
> les déposes dans `audio/voice/_raw/<clé>.mp3`, et j'encode + je vérifie.
> Les clés sont **déjà câblées** (`_VOICE_SAMPLES` + `_voiceKeyForPage`) :
> dès que l'OGG existe, la voix se joue ; sinon repli silencieux.

## Réglages ElevenLabs (communs)

- **Modèle** : `Eleven Multilingual v2` (support FR natif).
- **Format export** : MP3 (44.1 kHz / 128 kbps min — peu importe, je ré-encode).
- **Un fichier par clé** (ne pas concaténer les pages).
- Retirer les didascalies entre parenthèses du texte parlé (déjà fait
  ci-dessous dans « à synthétiser »).

---

## 1. MANON — `manon_greeting_1..4` (PRIORITÉ)

**Voix** : jeune femme (≈ 16-17 ans), française, timbre **fragile, légèrement
voilé/essoufflé**, au bord des larmes mais retenu — pas larmoyant. Quelqu'un qui
n'a parlé à personne depuis des semaines. Débit **lent**, beaucoup d'air.

**Voice settings suggérés** : Stability **42**, Similarity **78**, Style **12**,
Speaker boost **on**. (Stability basse = plus d'émotion ; remonter à ~55 si la
voix « casse » trop.)

| Clé (fichier `_raw/<clé>.mp3`) | Texte à synthétiser |
|---|---|
| `manon_greeting_1` | « Ne fais pas de bruit. S'il te plaît. Tu n'es pas un professeur. Tant mieux — eux, je les évite. » |
| `manon_greeting_2` | « Je m'appelle Manon. Manon Aubin — le nom de ma mère ; c'est le seul que j'aie le droit de dire. Je vis dans ce château sans y être inscrite : je dors dans les salles vides, je mange ce que je trouve. Personne ne sait que je suis là. Personne ne doit savoir. » |
| `manon_greeting_3` | « Il y a deux mois, ma mère est morte. Élara. C'est elle qui m'a élevée — seule, loin d'ici — et qui m'a répété toute ma vie que mon père était tombé en héros à la guerre. En vidant sa maison, j'ai trouvé une photographie cousue dans la doublure d'une vieille malle : un homme qui me tenait, bébé, et qui ne souriait pas. Au dos, un seul mot. Un nom : Lupin. » |
| `manon_greeting_4` | « Ce nom, il vit. Ici, plus bas, à l'étage de la Défense. C'est mon père. Ma mère m'a menti chaque jour pendant seize ans, et elle est partie avant que je puisse lui demander pourquoi, en face. Alors il me reste lui. Depuis des semaines je tourne dans ces couloirs sans oser descendre lui dire que j'existe encore. Tu veux bien m'écouter ? Ça fait si longtemps que je n'ai parlé à personne. » |

> Câblage : déclenché sur les 4 pages du `greeting` de Manon (étage 3).

---

## 2. ÉLARA — voix posthume (SECONDAIRE — câblage call-site à finaliser)

**Voix** : femme adulte (30-40 ans), française, douce et **sereine**, comme un
souvenir. Timbre chaud mais lointain. (Je peux ajouter une légère réverbe
« mémoire » à l'encodage via ffmpeg si tu le souhaites — `aecho`.)

**Voice settings suggérés** : Stability **60**, Similarity **75**, Style **0**.

Clés proposées (lecture des **feuillets clairs** d'Élara, Acte III) :

| Clé | Texte à synthétiser |
|---|---|
| `elara_feuillet_1` | « Pour ma fille, si elle lit ceci un jour : voici comment dessiner une fougère de givre sur une vitre froide. Souffle d'abord. Puis laisse le bout de ta baguette suivre la buée. » |
| `elara_feuillet_2` | « La pluie peut se figer en perles si on le lui demande gentiment. Ce n'est pas un sort de combat. C'est juste joli. J'aimais les choses jolies, avant d'avoir peur. » |
| `elara_feuillet_3` | « Fais tomber un peu de neige dans ta chambre, un soir de cœur lourd. Ça ne répare rien. Mais ça rappelle que le froid peut être doux. Je t'aime. Élara. » |

> ⚠️ **Reste à câbler** : Élara n'est pas un PNJ (pas de dialogue). Sa voix
> doit se déclencher à la **collecte d'un feuillet clair** (`movement-interactions.js`)
> ou à la **fusion** (`quests-riddles.js fuseAct3`). À faire dans un second
> temps une fois les MP3 fournis — dis-moi si tu veux que je l'implémente.

---

## Workflow de dépôt

1. Génère chaque ligne → MP3, nomme le fichier exactement `<clé>.mp3`.
2. Dépose-les dans `audio/voice/_raw/`.
3. Je lance `tools/encode_voice.sh manon_greeting_1 …` → OGG dans `audio/voice/`.
4. Je vérifie (OggS + Vorbis) et je commit. La voix se joue immédiatement.

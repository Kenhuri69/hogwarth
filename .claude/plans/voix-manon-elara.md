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

## 2. ÉLARA — voix posthume ✅ LIVRÉE (Edge-TTS + signature mémoire)

> **Statut : faite et câblée.** Inutile de la repasser en ElevenLabs, sauf si
> tu veux upgrader le timbre (déposer alors `elara_feuillet_<n>.mp3` dans
> `_raw/` et je ré-encode avec la même signature).

**Identité distinctive** (3 leviers cumulés, qu'aucun autre PNJ ne porte) :
1. **Timbre** non utilisé ailleurs : `en-US-EmmaMultilingualNeural` (doux,
   légèrement « autre » en français → renforce l'effet souvenir).
2. **Registre** abaissé + ralenti (`pitch -12Hz`, `rate -7%`) → mûr, serein.
3. **Signature sonore « mémoire »** ajoutée à l'encodage (`encode_voice.sh`,
   filtre réservé aux clés `elara_*`) : réverbe douce + voile passe-bas +
   léger ralenti → « une voix remémorée, pas présente ».

**Déclenchement** : à la collecte de chaque feuillet clair (Acte III,
`movement-interactions.js _tryCollectPage`) → `elara_feuillet_1/2/3` selon
l'ordre de collecte.

Lignes synthétisées (legs de joie de la mère) :

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

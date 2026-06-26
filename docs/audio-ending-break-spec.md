# Spec cible — `audio/ending_break.ogg` (P3.2)

> RC polish 2026-06 · plan [`rc-polish-remaining.md`](../.claude/plans/_archive/rc-polish-remaining.md) §P3.2.
> **Seul gap musical** restant de l'inventaire P2.6
> ([`docs/audio-inventory.md`](./audio-inventory.md) : ambient 5/5, combat 5/5,
> menu 1/1, voice 181/181 — manquant : `ending_break.ogg`).
>
> **Pourquoi une spec et pas le fichier** : l'environnement de dev n'a aucun
> encodeur OGG/Vorbis (`ffmpeg`/`sox`/`oggenc`/`lame` absents) ni stack de
> synthèse audio (`numpy`/`scipy`/`pydub`). Le fichier doit être **produit/
> enregistré hors-environnement** (DAW, banque, ou modèle musique→audio) puis
> déposé à `audio/ending_break.ogg`. Aucune modif code n'est requise pour
> l'activer (voir « Intégration », l'asset est auto-détecté).

---

## Contexte d'usage (vérifié dans le code)

- **Déclencheur** : `confirmBreakCycle()` (`js/break-cycle.js:133`) — le joueur
  choisit de **Briser le Cycle** (fin optionnelle de la Boucle Ténébreuse,
  ch.14 §14.6.1, `docs/histoire/11-mondes-paralleles.md §11.10`).
- **Lecture** : `AudioSystem.playEndingTheme()` (`js/audio-music.js:370`).
  - **One-shot** : `bufferSource.start()` **sans `loop`** → joué **une seule
    fois**, branché sur `musicGain` (respecte le volume musique / mute).
  - **Repli actuel** : si l'asset est en 404 ou l'audio pas prêt → sting
    procédural `playVictory()`. Le comportement sans sample reste donc
    fonctionnel — l'OGG est un **enrichissement**, pas une dépendance dure.
- **Scène accompagnée** : cinématique modale de **3 pages** contemplatives,
  **auto-rythmée** par le joueur (bouton « Continuer »), illustration
  `img/scenes/ending_break_cycle.jpg` (déjà livrée). Texte des pages
  (`BREAK_CYCLE_PAGES`, `break-cycle.js:28`) :
  1. « Tu poses les Éclats que tu portais sur la faille… tu y laisses une part de toi-même. »
  2. « Le battement organique de l'Avant-Monde ralentit… La spirale ne se referme pas sur toi : elle s'apaise. »
  3. « On ne ferme pas la peur en la fuyant vers le haut. On la ferme en osant la regarder jusqu'au fond. Le Cycle est brisé. »

**Intention émotionnelle** : **résolution douce-amère**. Pas un triomphe (ce
n'est pas la victoire `playVictory`), mais un **apaisement** — le froid recule,
la peur est regardée en face, sacrifice serein. Lumière qui point après les
ténèbres de la Boucle.

---

## Cahier des charges technique

| Paramètre | Cible | Justification |
|-----------|-------|---------------|
| **Format** | OGG Vorbis (`.ogg`), q≈4–5 (~128 kbps VBR) | Cohérent avec les 11 samples existants (`ambient_*`, `combat_*` : 186–292 Ko). |
| **Canaux / SR** | Stéréo, 44,1 kHz | Idem banque existante. |
| **Durée** | **40–60 s**, **one-shot** (pas de boucle) | Couvre la lecture des 3 pages auto-rythmée ; se termine naturellement si le joueur s'attarde (la nappe s'éteint, pas de coupe brutale). |
| **Poids cible** | ~180–260 Ko | Aligne sur `ambient_*.ogg` (cache à la demande, pas de précache). |
| **Loudness** | ≈ −18 à −20 LUFS intégré, true-peak ≤ −1 dBTP | **Plus doux** que le combat (les samples combat sont plus présents) ; pas d'écrasement, c'est une nappe d'arrière-plan d'une cinématique lue. |
| **Tonalité** | Majeur doux ou modal lydien/mixolydien, ~60–70 BPM ou ametrique | Apaisement, pas de tension. Éviter le mineur sombre (≠ ambiances Boucle `abyss`/`tension`). |
| **Arrangement** | Nappe (pad) chaude + nappe de cordes/chœur lointain ; cloche/harpe cristalline éparse ; pas de percussion marquée | « Nappe douce » (terme du code). Évoque le souffle qui s'apaise. |
| **Enveloppe** | **Fade-in** doux 1,5–3 s, **fade-out** 4–6 s en fin de fichier | Démarre sous la voix/texte ; finit sans clic ni coupure. |
| **Début** | Attaque non percussive (entrée en fondu) | Le `start()` est immédiat à l'ouverture de la cinématique. |

### Cohérence d'univers (normativité narrative)
- Doit se distinguer de `menu_theme.ogg` (titre) et de la fanfare
  `playVictory()` (victoire « classique »). C'est une **fin alternative
  réflexive**, pas une fanfare.
- Palette sonore parente des `ambient_*` (mêmes textures de pad) mais
  **résolue** (consonante), là où `ambient_abyss`/`ambient_tension` sont
  dissonants/anxiogènes.

---

## Intégration (zéro code à écrire)

1. Déposer le fichier à **`audio/ending_break.ogg`** (chemin exact attendu :
   `AudioSystem._ENDING_SAMPLE`, `audio-music.js:386`).
2. **Aucune** modification JS/CSS → **pas de cache-bump** (les médias `audio/`
   sont servis en *stale-while-revalidate* + cache à la demande par `sw.js`,
   pas via `?v=N`).
3. **Validation manuelle** : déclencher la fin « Briser le Cycle » (porter
   ≥ `BRISER_ECLAT_SEUIL` Éclats post-victoire, accepter le Reflet) →
   la nappe doit jouer une fois, sous la cinématique, et respecter mute/volume.
4. **Validation auto** : mettre à jour l'inventaire
   `node tools/audio_inventory.js --write` → le gap passe de **1 → 0**
   manquant dans `docs/audio-inventory.md`.

---

## Statut

✅ **Livré (2026-06-21)**. Le blocage « pas d'encodeur OGG » a été levé :
`pip install soundfile` fournit libsndfile 1.2.2 avec encodeur **Vorbis**, ce
qui permet de **produire l'asset *in situ* par synthèse procédurale**.

- **Générateur reproductible** : [`tools/gen_ending_break.py`](../tools/gen_ending_break.py)
  (numpy + soundfile, seed fixe). Nappe additive Fa majeur add9 (couleur
  lydienne) + couche de cordes douce-amère + scintillements cloche/harpe épars
  + réverb FFT légère ; fade-in 2,5 s / fade-out 5 s.
- **Asset produit** : `audio/ending_break.ogg` — OGG/Vorbis stéréo 44,1 kHz,
  **48,0 s**, **264 Ko**, RMS −20 dBFS, true-peak −6,6 dBFS (≤ −1). Conforme au
  cahier des charges ci-dessus.
- **Activation** : automatique (chemin `_ENDING_SAMPLE` inchangé, zéro code
  modifié). Inventaire audio à jour ([`audio-inventory.md`](./audio-inventory.md) :
  0 manquant).
- **Remplaçable** : un sample DAW / banque déposé au même chemin écrase le rendu
  procédural sans autre action.
</content>

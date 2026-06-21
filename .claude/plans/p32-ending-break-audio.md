# Plan — P3.2 : génération de `audio/ending_break.ogg`

> Débloque l'unique gap musical du backlog RC
> ([`rc-polish-remaining.md`](./rc-polish-remaining.md) §P3.2). La spec figée
> [`docs/audio-ending-break-spec.md`](../../docs/audio-ending-break-spec.md)
> supposait l'environnement incapable d'encoder de l'OGG. **Réévalué le
> 2026-06-21** : `pip install soundfile` fournit libsndfile 1.2.2 avec support
> **OGG/Vorbis** → la cible est désormais productible *in situ* par synthèse
> procédurale numpy. Le fichier reste remplaçable par un sample DAW (auto-détecté).
>
> Date : 2026-06-21 · **Plan vivant** (guidelines §5). Légende : ⬜ à faire ·
> 🔄 en cours · ✅ fait.

## Constat d'environnement (vérifié)
- ✅ Encodeurs natifs absents (`ffmpeg`/`oggenc`/`sox`/`lame`) — confirmé.
- ✅ `pip install soundfile numpy` OK ; `soundfile.available_subtypes('OGG')`
  → `['VORBIS','OPUS']`. Encodage OGG Vorbis possible en pur Python.
- ✅ Intégration runtime déjà câblée : `AudioSystem.playEndingTheme()`
  (`audio-music.js:370`) charge `_ENDING_SAMPLE = 'audio/ending_break.ogg'`,
  one-shot sur `musicGain`, repli `playVictory()` si 404. **Zéro code JS à toucher.**
- ✅ Samples existants : OGG Vorbis stéréo 44,1 kHz, 186–292 Ko.

## Cible (extrait spec)
- OGG Vorbis stéréo 44,1 kHz, **one-shot 40–60 s**, ~180–260 Ko, ≈ −18/−20 LUFS.
- Majeur doux / modal lydien, ~60–70 BPM ou amétrique. Nappe chaude + cordes/chœur
  lointain + cloche/harpe cristalline éparse, **pas de percussion**.
- Fade-in 1,5–3 s, **fade-out 4–6 s**. Attaque non percussive. Résolution
  douce-amère (apaisement, pas fanfare).

## Étapes
1. ✅ **Générateur** `tools/gen_ending_break.py` (numpy + soundfile, pur, reproductible).
   Synthèse : nappe additive Fa majeur add9 (couleur lydienne) + couche cordes
   douce-amère + scintillements cloche/harpe épars + réverb FFT légère + fade-in
   2,5 s / fade-out 5 s. **Piège** : un write OGG/Vorbis monolithique de 48 s fait
   **segfaulter** libsndfile 1.2.2 → écriture **par blocs de 1 s** via `sf.SoundFile`.
2. ✅ **Validation asset** : OGG/VORBIS, stéréo, 44,1 kHz, **48,0 s**, **264 Ko**,
   RMS −20 dBFS, peak −6,6 dBFS (≤ −1). Fade-in (−58 dB en tête) / fade-out
   (−73 dB en queue) confirmés. 7/7 contrôles OK.
3. ✅ **Inventaire** : `node tools/audio_inventory.js --write` → **1 → 0** manquant.
4. ✅ **Statut spec** : `docs/audio-ending-break-spec.md` ⏳ → ✅ livré.
5. ✅ **Backlog** : P3.2 coché dans `rc-polish-remaining.md`.
6. ✅ **Pas de cache-bump** : médias `audio/` en stale-while-revalidate (hors `?v=N`
   / PRECACHE_URLS) ; aucun JS/CSS modifié.
7. ✅ **Critères de sortie** (test.yml) **tous verts** : units (946) · smoke
   (263/263) · pwa-smoke · check_cache_versions (aucun asset modifié) ·
   check_doc_modules (97) · check_difficulty (stable).

## Risques / garde-fous
- **Zéro régression** : tant que l'OGG était absent le repli `playVictory()`
  jouait ; l'asset n'est qu'un enrichissement. Aucun chemin de code modifié.
- L'asset est binaire — non couvert par smoke (file://). Validation = contrôle
  format + écoute manuelle hors-suite (non bloquant pour la CI).
- Si le rendu déplaît, remplacer `audio/ending_break.ogg` par un sample DAW :
  aucune autre action (auto-détecté, même chemin).

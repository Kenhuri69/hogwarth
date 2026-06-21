"""
Génère `audio/ending_break.ogg` — nappe douce one-shot de la cinématique de
fin « Briser le Cycle » (ch.14 §14.6.1).

Cahier des charges : docs/audio-ending-break-spec.md
  - OGG Vorbis stéréo 44,1 kHz, one-shot ~48 s (∈ [40,60]).
  - Majeur doux / couleur lydienne (Fa majeur add9), amétrique, sans percussion.
  - Nappe chaude + couche de cordes/chœur lointain + scintillements
    cloche/harpe épars.
  - Enveloppe : fade-in ~2,5 s, fade-out ~5 s, attaque non percussive.
  - Loudness douce (≈ −18/−20 LUFS approché par cible RMS), true-peak ≤ −1 dBFS.
  - Résolution douce-amère : apaisement, pas de fanfare (≠ playVictory).

Synthèse procédurale pure (additive + scintillements + réverb FFT légère).
Le rendu est reproductible (seed fixe) et remplaçable à tout moment par un
sample DAW — même chemin, auto-détecté au runtime (AudioSystem.playEndingTheme).

Dépendances : numpy, soundfile (libsndfile ≥ 1.2 avec encodeur Vorbis).
  pip install numpy soundfile

Usage : python3 tools/gen_ending_break.py [chemin_sortie]
"""

import os
import sys
import numpy as np
import soundfile as sf

SR = 44100
DUR = 48.0                    # secondes (one-shot)
SEED = 1421                   # reproductibilité (ch.14 §14.6.1)
OUT_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "audio", "ending_break.ogg")

# Note → fréquence (tempérament égal, A4 = 440 Hz).
_A4 = 440.0
_NAMES = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4,
          "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}


def freq(note):
    name = note[:-1]
    octave = int(note[-1])
    semis = _NAMES[name] + (octave - 4) * 12
    return _A4 * (2.0 ** (semis / 12.0))


def _phase(f, t, vib_rate, vib_depth):
    """Phase intégrée d'un oscillateur avec léger vibrato lent (chorus naturel)."""
    inst = f * (1.0 + vib_depth * np.sin(2 * np.pi * vib_rate * t))
    return 2 * np.pi * np.cumsum(inst) / SR


def pad_voice(f, t, partials, detune, vib_rate=0.11, vib_depth=0.0035):
    """Voix de nappe : oscillateurs additifs détunés (chaleur + largeur stéréo).

    Retourne (gauche, droite) — les copies détunées sont réparties dans le champ
    stéréo pour la largeur.
    """
    left = np.zeros_like(t)
    right = np.zeros_like(t)
    for k, d in enumerate(detune):
        ph = _phase(f * d, t, vib_rate, vib_depth + 0.0008 * k)
        osc = np.zeros_like(t)
        for n, amp in partials:
            osc += amp * np.sin(n * ph)
        # pan : 1er osc centré, suivants écartés L/R en alternance
        pan = 0.0 if k == 0 else (0.5 if k % 2 else -0.5)
        gl = np.sqrt(0.5 * (1.0 - pan))
        gr = np.sqrt(0.5 * (1.0 + pan))
        left += osc * gl
        right += osc * gr
    return left, right


def bell(f, t0, dur, t):
    """Scintillement cloche/harpe : partiels quasi-inharmoniques, decay exponentiel."""
    n = len(t)
    i0 = int(t0 * SR)
    seg_len = int(dur * SR)
    out = np.zeros(n)
    if i0 >= n:
        return out
    seg_len = min(seg_len, n - i0)
    lt = np.arange(seg_len) / SR
    env = np.exp(-lt * 3.2) * (1.0 - np.exp(-lt * 220.0))  # attaque douce, decay long
    parts = [(1.0, 1.0), (2.01, 0.5), (3.03, 0.28), (4.16, 0.14), (5.43, 0.07)]
    sig = np.zeros(seg_len)
    for ratio, amp in parts:
        sig += amp * np.sin(2 * np.pi * f * ratio * lt)
    out[i0:i0 + seg_len] = sig * env
    return out


def fft_reverb(sig, ir):
    """Convolution FFT (mono) signal × réponse impulsionnelle, tronquée à len(sig)."""
    n = len(sig) + len(ir) - 1
    nfft = 1 << (n - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(sig, nfft) * np.fft.rfft(ir, nfft), nfft)
    return wet[:len(sig)]


def make_ir(rng, dur=2.4, decay=5.5):
    """Réponse impulsionnelle synthétique : bruit blanc à decay exponentiel (réverb douce)."""
    m = int(dur * SR)
    lt = np.arange(m) / SR
    ir = rng.standard_normal(m) * np.exp(-lt * decay)
    ir[: int(0.012 * SR)] = 0.0           # pré-délai ~12 ms
    ir /= np.sqrt(np.sum(ir ** 2))        # normalise l'énergie
    return ir


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else OUT_DEFAULT
    out_path = os.path.abspath(out_path)
    rng = np.random.default_rng(SEED)

    t = np.arange(int(DUR * SR)) / SR
    left = np.zeros_like(t)
    right = np.zeros_like(t)

    # ── Couche 1 : nappe chaude — Fa majeur add9 (F A C E G), couleur lydienne. ──
    # Partiels doux (roll-off marqué = timbre feutré).
    pad_partials = [(1, 1.0), (2, 0.42), (3, 0.20), (4, 0.10), (5, 0.05)]
    detune = (1.0, 1.0035, 0.9966)
    # Chaque note a un léger swell respiratoire (phase propre) → nappe vivante.
    chord = ["F2", "F3", "A3", "C4", "E4", "G4"]
    weights = [0.55, 0.9, 0.8, 0.85, 0.7, 0.6]
    swell_rates = [0.031, 0.042, 0.037, 0.05, 0.045, 0.058]
    for note, w, sr_ in zip(chord, weights, swell_rates):
        gl, gr = pad_voice(freq(note), t, pad_partials, detune)
        swell = 0.78 + 0.22 * np.sin(2 * np.pi * sr_ * t + rng.uniform(0, 2 * np.pi))
        left += gl * w * swell
        right += gr * w * swell

    # ── Couche 2 : cordes/chœur lointain — couleur douce-amère (Ré mineur 9 fugace). ──
    # Entre lentement (attaque ~7 s) puis se retire : la mélancolie qui s'apaise.
    string_partials = [(1, 1.0), (2, 0.6), (3, 0.4), (4, 0.25), (5, 0.16), (6, 0.10)]
    string_detune = (1.0, 1.005, 0.995)
    string_chord = ["D3", "F3", "A3", "C4", "E4"]
    s_left = np.zeros_like(t)
    s_right = np.zeros_like(t)
    for note in string_chord:
        gl, gr = pad_voice(freq(note), t, string_partials, string_detune,
                           vib_rate=0.08, vib_depth=0.005)
        s_left += gl
        s_right += gr
    # cloche d'enveloppe : monte vers ~22 s, redescend → couleur transitoire
    bell_env = np.exp(-((t - 22.0) ** 2) / (2 * 11.0 ** 2))
    attack = 1.0 - np.exp(-np.maximum(t - 1.0, 0.0) / 5.0)
    s_env = 0.30 * bell_env * attack
    left += s_left * s_env / len(string_chord)
    right += s_right * s_env / len(string_chord)

    # ── Couche 3 : scintillements cloche/harpe épars (notes hautes de l'accord). ──
    sparkle_notes = ["C5", "E5", "G5", "A5", "C6", "G5", "E5", "D6"]
    sparkle_times = [5.5, 11.0, 16.5, 23.0, 29.5, 35.0, 40.5, 44.5]
    sp = np.zeros_like(t)
    for note, tt in zip(sparkle_notes, sparkle_times):
        amp = rng.uniform(0.12, 0.20)
        sp += amp * bell(freq(note), tt, 4.5, t)
    # léger placement stéréo alterné
    left += sp * 0.55
    right += sp * 0.45

    # ── Réverb douce (FFT), ~28 % humide ──
    ir = make_ir(rng)
    wet_l = fft_reverb(left, ir)
    wet_r = fft_reverb(right, ir * 0.97 + make_ir(rng) * 0.03)  # IR L/R décorrélées
    left = 0.72 * left + 0.28 * wet_l
    right = 0.72 * right + 0.28 * wet_r

    # ── Enveloppe globale : fade-in 2,5 s, fade-out 5 s, attaque non percussive. ──
    env = np.ones_like(t)
    fi = int(2.5 * SR)
    fo = int(5.0 * SR)
    env[:fi] = 0.5 - 0.5 * np.cos(np.pi * np.arange(fi) / fi)        # cosinus
    env[-fo:] = 0.5 + 0.5 * np.cos(np.pi * np.arange(fo) / fo)
    left *= env
    right *= env

    stereo = np.stack([left, right], axis=1)

    # ── Normalisation : cible RMS ≈ −20 dBFS (≈ −18/−20 LUFS pour une nappe), ──
    #     puis garde true-peak ≤ −1 dBFS.
    rms = np.sqrt(np.mean(stereo ** 2))
    target_rms = 10 ** (-20.0 / 20.0)
    stereo *= target_rms / (rms + 1e-12)
    peak = np.max(np.abs(stereo))
    ceil = 10 ** (-1.0 / 20.0)
    if peak > ceil:
        stereo *= ceil / peak

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    # Écriture VBR par blocs (1 s) : un write OGG/Vorbis monolithique de cette
    # taille fait segfaulter libsndfile 1.2.2 — le découpage est sûr.
    stereo = np.ascontiguousarray(stereo.astype(np.float32))
    with sf.SoundFile(out_path, "w", samplerate=SR, channels=2,
                      format="OGG", subtype="VORBIS") as f:
        for i in range(0, len(stereo), SR):
            f.write(stereo[i:i + SR])

    size_kb = os.path.getsize(out_path) / 1024.0
    final_rms = np.sqrt(np.mean(stereo ** 2))
    final_peak = np.max(np.abs(stereo))
    print(f"écrit  {out_path}")
    print(f"durée  {DUR:.1f}s  ·  {size_kb:.0f} Ko  ·  "
          f"RMS {20*np.log10(final_rms):.1f} dBFS  ·  "
          f"peak {20*np.log10(final_peak):.1f} dBFS")


if __name__ == "__main__":
    main()

#!/usr/bin/env bash
# Encode les MP3 bruts (audio/voice/_raw/*.mp3) en OGG Vorbis mono 22 kHz
# (format attendu par le jeu — cf. AudioSystem._VOICE_SAMPLES).
#
# Source des MP3 :
#   - Edge-TTS      : tools/gen_voice_edge.py → _raw/<key>.mp3
#   - ElevenLabs    : MP3 fourni par l'utilisateur, déposé dans _raw/<key>.mp3
#
# ffmpeg : binaire statique fourni par le paquet pip `imageio-ffmpeg`
# (aucun apt requis). Repli sur un `ffmpeg` système s'il existe.
#
# Usage :
#   tools/encode_voice.sh                  # encode TOUT _raw/*.mp3 manquant
#   tools/encode_voice.sh lupin_greeting_1 # encode une clé précise
#   tools/encode_voice.sh --force          # ré-encode tout (écrase)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/audio/voice/_raw"
OUT="$ROOT/audio/voice"

FF="$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || true)"
[ -z "$FF" ] && FF="$(command -v ffmpeg || true)"
[ -z "$FF" ] && { echo "ffmpeg introuvable (pip install imageio-ffmpeg)"; exit 1; }

FORCE=0; KEYS=()
for a in "$@"; do [ "$a" = "--force" ] && FORCE=1 || KEYS+=("$a"); done
[ "${#KEYS[@]}" -eq 0 ] && KEYS=($(cd "$RAW" && ls *.mp3 2>/dev/null | sed 's/\.mp3$//'))

# Signature « mémoire » d'Élara (voix posthume) : réverbe douce + voile
# passe-bas + léger ralenti. Appliquée AUX SEULES clés elara_* → identité
# sonore distinctive qu'aucun autre PNJ ne porte.
ELARA_FILTER="atempo=0.97,aecho=0.85:0.9:55|110:0.30|0.18,highpass=f=110,lowpass=f=6500,volume=1.15"

# Signature « Fondateur » (murmures d'écho des Poches du Sceau) : voix GRAVE,
# AMPLIFIÉE et DÉNATURÉE. asetrate/atempo abaisse le pitch de ~14 % (grave, en
# gardant la durée) ; aecho = écho de scellement (couloir de pierre) ; chorus =
# dédoublement spectral surnaturel ; aphaser + voile passe-bas = timbre ancien
# étouffé ; volume = amplification finale. Appliqué AUX SEULES clés founder_*.
FOUNDER_FILTER="asetrate=22050*0.86,aresample=22050,atempo=1.1628,aecho=0.8:0.85:60|130:0.35|0.22,chorus=0.6:0.9:50|70:0.4|0.32:0.25|0.4:2|1.3,aphaser=type=t:decay=0.35,highpass=f=85,lowpass=f=5200,volume=4dB"

n=0
for key in "${KEYS[@]}"; do
  src="$RAW/$key.mp3"; dst="$OUT/$key.ogg"
  [ -f "$src" ] || { echo "  ⚠️  $key.mp3 absent"; continue; }
  [ -f "$dst" ] && [ "$FORCE" -eq 0 ] && continue
  case "$key" in
    elara_*)   AF=(-af "$ELARA_FILTER") ;;
    founder_*) AF=(-af "$FOUNDER_FILTER") ;;
    *)         AF=() ;;
  esac
  "$FF" -y -loglevel error -i "$src" "${AF[@]}" -ac 1 -ar 22050 -c:a libvorbis -q:a 3 "$dst"
  echo "  ✓ $key.ogg ($(( $(stat -c%s "$dst") / 1024 )) Ko)"
  n=$((n+1))
done
echo "Encodé : $n fichier(s) OGG."

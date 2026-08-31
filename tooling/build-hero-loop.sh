#!/bin/bash
# Prepara un clip suelto como video de fondo del hero.
# Uso: tooling/build-hero-loop.sh <clip.mp4> <version>   (p.ej. v5)
# Salida: assets/videos/benefits-superpowers-<version>.mp4 y su póster.
#
# El clip de origen suele venir anunciado como "loop" y no serlo: el último
# fotograma no enlaza con el primero y el salto se ve en cada vuelta. Aquí la
# cola se funde sobre la cabeza y se recorta del final, como en
# build-benefits-video.sh, para que el bucle no tenga costura.
set -euo pipefail
SRC="${1:?clip de origen}"; VER="${2:?version, p.ej. v5}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
FADE=0.5
BUDGET=$((1024*1024))   # el hero se ve tras un velo: 1 MB basta y no frena el LCP

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
BODY=$(python3 -c "print(round($DUR-$FADE,3))")
ffmpeg -v error -y -i "$SRC" -an -filter_complex "\
[0:v]split=3[a][b][c];\
[a]trim=start=${BODY},setpts=PTS-STARTPTS[tail];\
[b]trim=end=${FADE},setpts=PTS-STARTPTS[headsrc];\
[c]trim=start=${FADE}:end=${BODY},setpts=PTS-STARTPTS[rest];\
[tail][headsrc]xfade=transition=fade:duration=${FADE}:offset=0[head];\
[head][rest]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libx264 -crf 16 -preset fast "$TMP/loop.mp4"

OUT="$ROOT/assets/videos/benefits-superpowers-${VER}.mp4"; CRF=26
while :; do
  ffmpeg -v error -y -i "$TMP/loop.mp4" -an -c:v libx264 -crf $CRF -preset slow \
    -pix_fmt yuv420p -movflags +faststart -vf "scale=1280:-2" "$OUT"
  SIZE=$(stat -f%z "$OUT"); echo "crf $CRF -> $((SIZE/1024)) KB"
  [ "$SIZE" -le "$BUDGET" ] && break; CRF=$((CRF+2)); [ $CRF -gt 36 ] && break
done
ffmpeg -v error -y -i "$OUT" -ss 1 -frames:v 1 -q:v 4 -update 1 \
  "$ROOT/assets/img/benefits-superpowers-poster-${VER}.jpg"
echo "listo: $OUT ($((SIZE/1024)) KB), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s"

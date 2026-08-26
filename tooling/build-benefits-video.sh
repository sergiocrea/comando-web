#!/bin/bash
# Monta el video de fondo de la sección "beneficios" de la landing.
# Uso: tooling/build-benefits-video.sh <carpeta-con-clips>
#   La carpeta debe contener: 1-gimnasio.mp4 2-auto.mp4 3-obra.mp4 4-calle.mp4
#   (1920x1080, ~8 s, sin audio; cualquier fps/codec de origen sirve).
# Salida: assets/videos/benefits-v2.mp4 (< 6 MB) y assets/img/benefits-poster-v1.jpg
set -euo pipefail
SRC="${1:?carpeta con los 4 clips}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
FADE=0.5
ORDER=(4-calle 1-gimnasio 2-auto 3-obra)   # orden pedido: 4 → 1 → 2 → 3

# 1) Normalizar cada clip: 1920x1080, 24 fps, sin audio, recorte exacto a 8 s.
i=0; for name in "${ORDER[@]}"; do
  ffmpeg -v error -y -i "$SRC/$name.mp4" -an -t 8 -r 24 \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p" \
    -c:v libx264 -crf 16 -preset fast "$TMP/c$i.mp4"; i=$((i+1)); done

# 2) Encadenar con fundidos cruzados de 0.5 s (xfade). Duración = 4*8 - 3*0.5 = 30.5 s.
ffmpeg -v error -y -i "$TMP/c0.mp4" -i "$TMP/c1.mp4" -i "$TMP/c2.mp4" -i "$TMP/c3.mp4" -filter_complex "\
[0:v][1:v]xfade=transition=fade:duration=$FADE:offset=7.5[v01];\
[v01][2:v]xfade=transition=fade:duration=$FADE:offset=15[v012];\
[v012][3:v]xfade=transition=fade:duration=$FADE:offset=22.5[v]" \
  -map "[v]" -c:v libx264 -crf 16 -preset fast "$TMP/chain.mp4"

# 3) Loop sin salto: la cola (0.5 s) se funde sobre la cabeza (0.5 s) y se
#    recorta del final, así el último fotograma enlaza con el primero.
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/chain.mp4")
BODY=$(python3 -c "print(round($DUR-$FADE,3))")
ffmpeg -v error -y -i "$TMP/chain.mp4" -filter_complex "\
[0:v]split=3[a][b][c];\
[a]trim=start=${BODY},setpts=PTS-STARTPTS[tail];\
[b]trim=end=${FADE},setpts=PTS-STARTPTS[headsrc];\
[c]trim=start=${FADE}:end=${BODY},setpts=PTS-STARTPTS[rest];\
[tail][headsrc]xfade=transition=fade:duration=${FADE}:offset=0[head];\
[head][rest]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -crf 16 -preset fast "$TMP/loop.mp4"

# 4) Export final con el comando pedido; si supera 6 MB sube el CRF hasta cumplir.
OUT="$ROOT/assets/videos/benefits-v2.mp4"; CRF=26
while :; do
  ffmpeg -v error -y -i "$TMP/loop.mp4" -an -c:v libx264 -crf $CRF -preset slow -pix_fmt yuv420p \
    -movflags +faststart -vf "scale=1920:-2" "$OUT"
  SIZE=$(stat -f%z "$OUT"); echo "crf $CRF -> $((SIZE/1024)) KB"
  [ "$SIZE" -le $((6*1024*1024)) ] && break; CRF=$((CRF+2)); [ $CRF -gt 36 ] && { echo "no baja de 6 MB; considera 1280 px"; break; }
done
ffmpeg -v error -y -i "$OUT" -ss 2 -frames:v 1 -q:v 3 "$ROOT/assets/img/benefits-poster-v1.jpg"
echo "listo: $OUT ($((SIZE/1024)) KB), duración $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s, póster assets/img/benefits-poster-v1.jpg"

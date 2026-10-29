#!/bin/bash
# render.sh K preview FROM TO   -> renders/preview.mp4 (slice with final audio)
# render.sh K full              -> renders/<slug>.mp4 (segments cached by content hash, concat, mix, -14 LUFS)
set -euo pipefail
K="$1"; MODE="$2"
HF="npx -y hyperframes@0.8.162"
PY="${YT_PY:-$HOME/yt-explainers/.venv/bin/python}"
SLUG="$(basename "$PWD")"
mkdir -p renders/seg
free=$(df -g . | awk 'NR==2{print $4}')
[ "${free:-99}" -lt 4 ] && { echo "only ${free} GB free disk — free some space before rendering"; exit 1; }

audio() {
  node "$K/engine/build.mjs" >/dev/null
  bash "$K/engine/sfxdump.sh"
  "$PY" "$K/engine/audio.py"
}
hf_render() { # $1 composition file, $2 output
  local log; log=$(mktemp)
  if ! $HF render -c "$1" -o "$2" --quality standard --fps 30 --quiet >"$log" 2>&1 || [ ! -s "$2" ]; then
    tail -25 "$log"; echo "render failed: $1"; exit 1; fi
  rm -f "$log"
}

if [ "$MODE" = "preview" ]; then
  A="$3"; B="$4"
  audio
  node "$K/engine/build.mjs" --range "$A" "$B" | tail -1
  t0=$(date +%s)
  hf_render _range.html renders/preview-silent.mp4
  D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 renders/preview-silent.mp4)
  ffmpeg -v error -y -i renders/preview-silent.mp4 -ss "$A" -t "$D" -i .yt/mix.wav -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest renders/preview.mp4
  rm -f renders/preview-silent.mp4 _range.html
  echo "PREVIEW: $PWD/renders/preview.mp4  (${A}-${B}s, rendered in $(( $(date +%s) - t0 ))s)"
  exit 0
fi

audio
node "$K/engine/build.mjs" --segments | tail -2
t0=$(date +%s)
: > renders/seg/list.txt
n=$(node -e 'console.log(require(process.cwd()+"/.yt/segments.json").length)')
for i in $(seq 0 $((n-1))); do
  read -r FILE HASH FROM TO < <(node -e 'const s=require(process.cwd()+"/.yt/segments.json")['"$i"'];console.log(s.file,s.hash,s.from,s.to)')
  OUT="renders/seg/${FILE%.html}-$HASH.mp4"
  if [ -s "$OUT" ]; then echo "segment $((i+1))/$n cached ($FROM-$TO s)"; else
    rm -f renders/seg/"${FILE%.html}"-*.mp4
    s0=$(date +%s); hf_render "$FILE" "$OUT"; echo "segment $((i+1))/$n rendered ($FROM-$TO s) in $(( $(date +%s) - s0 ))s"
  fi
  echo "file '$(basename "$OUT")'" >> renders/seg/list.txt
done
ffmpeg -v error -y -f concat -safe 0 -i renders/seg/list.txt -c copy renders/silent.mp4
ffmpeg -v error -y -i renders/silent.mp4 -i .yt/mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest "renders/$SLUG.mp4"
rm -f renders/silent.mp4 _seg*.html
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "renders/$SLUG.mp4")
node "$K/engine/pack.mjs" >/dev/null 2>&1 || true
echo "FINAL: $PWD/renders/$SLUG.mp4  (${D}s, $(( ($(date +%s) - t0) / 60 )) min)"

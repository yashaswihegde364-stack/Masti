#!/usr/bin/env bash
# Cuts each chapter clip into still frames for the scroll player and writes
# site/frames/manifest.json.
#
#   site/scripts/extract-frames.sh            # every site/footage/*.mp4, in name order
#   FPS=30 WIDTH=1920 QUALITY=80 site/scripts/extract-frames.sh
#
# Name clips so they sort in chapter order: 01-ember.mp4, 02-rise.mp4, ...
# The chapter id is the file name without its extension; it must match the
# data-chapter attribute of the matching <section> in site/index.html.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${SRC:-$ROOT/footage}"
OUT="$ROOT/frames"
FPS="${FPS:-24}"          # frames per second of footage; more = smoother, heavier
WIDTH="${WIDTH:-1600}"    # output width in px; height keeps the clip's aspect
QUALITY="${QUALITY:-72}"  # webp quality 0-100

command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }

shopt -s nullglob
clips=("$SRC"/*.mp4 "$SRC"/*.mov "$SRC"/*.webm)
[ ${#clips[@]} -gt 0 ] || { echo "no clips in $SRC" >&2; exit 1; }
IFS=$'\n' clips=($(printf '%s\n' "${clips[@]}" | sort)); unset IFS

rm -rf "$OUT"
mkdir -p "$OUT"

entries=()
for clip in "${clips[@]}"; do
  id="$(basename "${clip%.*}")"
  mkdir -p "$OUT/$id"
  # Never upscale: a clip narrower than WIDTH keeps its own width.
  ffmpeg -loglevel error -i "$clip" \
    -vf "fps=$FPS,scale='min($WIDTH,iw)':-2:flags=lanczos" \
    -c:v libwebp -quality "$QUALITY" -compression_level 6 \
    "$OUT/$id/%04d.webp"
  count=$(find "$OUT/$id" -name '*.webp' | wc -l | tr -d ' ')
  size=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
    -of csv=s=x:p=0 "$OUT/$id/0001.webp")
  w="${size%x*}"; h="${size#*x}"
  echo "$id: $count frames at ${w}x${h}"
  entries+=("    { \"id\": \"$id\", \"count\": $count, \"width\": $w, \"height\": $h }")
done

{
  echo "{"
  echo "  \"fps\": $FPS,"
  echo "  \"pattern\": \"{id}/{n}.webp\","
  echo "  \"pad\": 4,"
  echo "  \"chapters\": ["
  for i in "${!entries[@]}"; do
    sep=","; [ "$i" -eq $((${#entries[@]} - 1)) ] && sep=""
    echo "${entries[$i]}$sep"
  done
  echo "  ]"
  echo "}"
} > "$OUT/manifest.json"

echo "wrote $OUT/manifest.json ($(du -sh "$OUT" | cut -f1))"

# Masti — cinematic scroll site

A marketing page where scrolling plays a film. The "3D" is AI-generated video
cut into still frames; the scroll position picks the frame and a canvas draws
it. The copy, nav and HUD (chapter, frame counter, timecode, progress rail) are
plain DOM on top. No framework, no build step.

```
site/
  index.html        chapters + copy (one <section> per clip)
  styles.css        HUD, type, layout (palette shared with app/src/theme/colors.ts)
  app.js            scroll → frame player
  frames/           extracted frames + manifest.json (committed)
  footage/          source clips (git-ignored; drop real clips here)
  scripts/
    extract-frames.sh            clips → frames/ + manifest.json
    make-placeholder-footage.mjs renders stand-in clips (no AI needed)
```

## Run it

```bash
npx http-server site -c-1      # any static server works; open http://localhost:8080
```

It has to be served over HTTP, not opened as `file://`, because it fetches
`frames/manifest.json`. If the manifest is missing, the page falls back to a
static text-only layout.

The committed frames are **placeholder footage**: a procedurally rendered
ember that rises into a dawn, made by `make-placeholder-footage.mjs` under the
same rules as the real footage below. Replace them before launch.

## Swap in real footage

1. Export each chapter as its own clip and name the files in order. The file
   name is the chapter id:
   `site/footage/01-ember.mp4`, `02-rise.mp4`, `03-dawn.mp4`
2. Extract frames:
   ```bash
   site/scripts/extract-frames.sh                    # defaults: 24 fps, 1600px wide, webp q72
   FPS=30 WIDTH=1920 site/scripts/extract-frames.sh  # smoother and sharper, but heavier
   ```
3. Make sure every `<section class="chapter" data-chapter="…">` in `index.html`
   matches a clip id. Edit the headline and body copy there.
   - `data-length` is the chapter's scroll length in viewport heights. A higher
     number plays the clip more slowly.
   - `data-title` is the label the HUD shows.
4. If your subject isn't at about 66% of frame width, change `FOCUS_X` at the
   top of `app.js`. Portrait screens crop to center on that point.

Budget: about 150 frames per 6 s chapter at 24 fps. At 1600px, a dark frame
is 20–60 KB as webp, so three chapters come to roughly 10–25 MB. Frames load
coarse-to-fine (every 16th frame first, then 8th, 4th…), so scrubbing works
almost immediately and sharpens as the rest arrive.

## Footage

The footage decides most of how good the site looks.

**Rules**

- **Original subject only.** Use no real faces and no recognisable
  characters. For Masti, that also means **no depiction of Jesus's face**: the
  app speaks in his voice, so putting a face on him is a different and much
  harder decision than a marketing page should make. Use light, hands, objects
  and landscape instead.
- **One continuous action per clip, 5–8 s.** No cuts and no camera shake.
- **Slow motion only.** Fast motion turns into blurry frames when someone
  scrolls slowly.
- **Locked camera or a slow push-in.**
- **Subject in the right two-thirds**, with dark empty space on the left. The
  headline goes there.
- **Plain black or soft-fog background**, so the frame survives cropping on
  any screen.
- **Chain the chapters.** Use the last frame of clip 1 as the start frame of
  clip 2, and so on. Kling and Veo both accept a start frame and an end frame.
  This is what makes the page play as one unbroken shot.

**Shot list** (the current copy is written to these):

| # | id | Headline | Shot |
|---|----|----------|------|
| 1 | `01-ember` | Bring what you carry. | Darkness. A single ember glows on the right third, then a candle wick slowly catches and the flame steadies. Thin smoke drifts upward. Black background, locked camera. |
| 2 | `02-rise` | Every answer rooted in Scripture. | *Start frame = last frame of 1.* The candlelight swells and reveals an open book beneath it, its pages turning very slowly in a soft draft. Light rays move through faint fog. Slow push-in. |
| 3 | `03-dawn` | A verse to begin the day. | *Start frame = last frame of 2.* The warm light widens into a pale dawn horizon behind the book, and the fog lifts. The camera stays locked. End on a calm, mostly dark frame that the outro copy can sit over. |

**Prompt template** (fill in per chapter):

> Cinematic slow-motion shot, [ACTION]. Subject positioned in the right third
> of the frame; left side empty and in deep shadow. Plain black background with
> soft volumetric fog. Locked-off camera [or: very slow push-in]. Warm candle
> gold (#C9A24B) and soft white highlights, low-key lighting, shallow depth of
> field. One continuous take, no cuts, no camera shake, no people, no faces,
> no text. 16:9, 6 seconds.

To export the end frame of a clip for chaining:

```bash
ffmpeg -sseof -0.05 -i site/footage/01-ember.mp4 -frames:v 1 -update 1 01-end.png
```

## Placeholder footage

```bash
node site/scripts/make-placeholder-footage.mjs   # writes site/footage/*.mp4 (about 1 min)
WIDTH=960 QUALITY=70 site/scripts/extract-frames.sh
```

This needs Node 18+ and ffmpeg with libx264 and libwebp.

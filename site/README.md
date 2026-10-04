# Masti — cinematic scroll site

A landing page where scrolling scrubs a film. The "3D" is AI-generated video
cut into still frames. Scroll picks the frame, a canvas draws it, and a thin
HUD sits on top.

Stack: Vite + vanilla JS, GSAP ScrollTrigger, Lenis (on GSAP's ticker). No
three.js, and no `<video>` scrubbing.

```bash
cd site
npm install
npm run dev            # http://localhost:5173  (add ?debug to expose window.__film)
npm run build          # → dist/, static, deployable anywhere (relative base)
```

## Edit the brief, not the engine

All copy, palette, HUD labels, loader lines, chapters, quote cards and lower
sections live in **`src/brief.js`**. The page DOM is built from that file.

The brief is filled from this repo. The tagline and disclaimer come from the
app. Quote cards are verbatim Berean Standard Bible text from
`data/bible/bsb/bsb.json`, which is public domain. HUD labels state real facts:
31,102 verses, 66 books, and the retrieve → generate → safety-check pipeline in
`docs/ARCHITECTURE.md`. Keep it factual: no invented metrics.

Still placeholder: the store links (`href: "#"`) and the footage itself.

## Footage → frames

1. Put clips in `assets/raw/` as `ch01.mp4`, `ch02.mp4`, `ch03.mp4` (one per
   chapter in `brief.chapters`), plus `about.mp4` for the About card's
   transformation sequence.
2. Run `npm run frames`. It writes `public/frames/<clip>/d/` (30 fps, 1920px)
   and `m/` (15 fps, 1000px), plus `manifest.json`. It reports frame counts
   and weight per set, and flags any desktop frame over 90 KB and any set over
   budget (18 MB desktop, 6 MB mobile). If a set is too heavy, lower `QUALITY`
   first (`QUALITY=60 npm run frames`), then fps, then resolution.

Tools that can't run Node or ffmpeg (Lovable, for example) can run the raw
commands themselves and upload `public/frames/`:

```bash
ffmpeg -i assets/raw/ch01.mp4 -vf "fps=30,scale=1920:-2" -c:v libwebp -quality 70 public/frames/ch01/d/%04d.webp
ffmpeg -i assets/raw/ch01.mp4 -vf "fps=15,scale=1000:-2" -c:v libwebp -quality 70 public/frames/ch01/m/%04d.webp
```

In that case, write `manifest.json` by hand in the shape the script produces.

The committed frames are **placeholder footage** from
`npm run footage:placeholder`: a procedurally rendered ember that rises into a
dawn, made under the same rules as the real footage below. Raw clips are
git-ignored; only frames ship.

## How the engine works

| | |
|---|---|
| **Film time** | One number, `T` = chapter + progress (0…3), drives everything. Scroll sets a target, the displayed `T` eases toward it (lerp 0.2, frame-rate independent), and frames, text, accent colour, flash and HUD are pure functions of it. Scrolling backward rewinds exactly. |
| **Canvas** | One fixed full-viewport canvas with cover-fit and DPR capped at 2. It redraws only when the rounded frame index (or crossfade step) changes. In portrait it zooms in slightly and recenters on the subject (`FOCUS` in `src/stage.js`). |
| **Chapters** | Each chapter is a 350vh spacer (250vh at 900px and below). The last 10% of a chapter crossfades into the first 10% of the next. |
| **Loading** | The first 24 frames of chapter 1 and the fonts load behind the boot screen. Then the rest of chapter 1, then later chapters (every 8th frame first, then 4th, 2nd, rest), then the About sequence. Every frame goes through `img.decode()` in a background queue. Nothing loads in response to scroll, and a missing frame draws its nearest decoded neighbour, so the canvas is never blank. |
| **Choreography** | Per chapter, scrubbed: 0–0.10 the eyebrow decodes and the headline rises out of its masks (staggered); at 0.15 quote card 1 un-blurs in; at 0.55 it swaps to card 2; at 0.85–1.00 the headline drifts up and blurs out. Chapter 1's entrance plays once after the loader. |
| **The one moment** | A short white flash at the brightest frame of chapter 2 (`flash` in the brief). |
| **Resize** | Film time is preserved across ScrollTrigger refreshes, so a resize mid-scroll stays on the same frame. |
| **Phones** | Mobile frame set (chosen once at load, for screens under 600px on the short side), shorter pins, no custom cursor. Tablets keep desktop frames, because their portrait crop would stretch the 1000px set past 2×. |
| **Reduced motion** | No Lenis and no scrubbing. One still per chapter (60% through the clip) with simple crossfades. Only those stills are downloaded. |
| **Hidden tab** | The GSAP ticker sleeps, which stops Lenis, the render loop and the cursor. |

## Footage

The footage decides most of how good the site looks.

- **Original subject only.** Use no real faces and no recognisable
  characters. For Masti, that also means **no depiction of Jesus's face**: the
  app speaks in his voice, so putting a face on him is a much heavier decision
  than a landing page should make. Use light, hands, objects and landscape.
- **One continuous action per clip, 5–8 s.** No cuts and no camera shake.
- **Slow motion only.** Fast movement turns into blurry frames when someone
  scrolls slowly.
- **Locked camera or a slow push-in.**
- **Subject in the right two-thirds**, with dark empty space on the left. The
  headline goes bottom-left.
- **Plain black or soft-fog background**, so the frame survives cropping on
  any screen.
- **Chain the chapters.** Use the last frame of clip 1 as the start frame of
  clip 2. Kling and Veo both take start and end frames.
- **Export quality:** the highest the tool allows, 24 or 30 fps, 1080p
  minimum.

**Shot list** (the brief's copy is written to these):

| Clip | Headline | Shot |
|---|---|---|
| `ch01` | Bring what / you carry. | Darkness. A single ember on the right third; a candle wick slowly catches and the flame steadies. Thin smoke drifts right to left. Locked camera. |
| `ch02` | Every answer / in Scripture. | *Start = last frame of ch01.* The flame swells and reveals an open book beneath it, pages turning very slowly in a draft. Light rays move through fog. Slow push-in. Brightest moment at about 40% (the flash). |
| `ch03` | A verse to / begin the day. | *Start = last frame of ch02.* The light widens into a pale dawn horizon behind the book, and the fog lifts. Locked camera. End calm and mostly dark. |
| `about` | — | 4:5, centred. Hands cupped around an unlit candle; it kindles. Played grayscale inside the About card. |

**Keyframe still** (image model):

> Cinematic film still of a single beeswax candle on an old wooden lectern
> beside a closed leather-bound book, placed in the right third of the frame.
> Pure black background with soft volumetric smoke. Rim light in muted gold
> (#C9A24B), faint warm-white fill. Anamorphic lens, 35mm, shallow depth of
> field, ultra-detailed surface texture. 16:9. Large empty dark area on the
> left side. No people, no text.

**Clip** (image-to-video, start frame + end frame):

> Static camera. The candle wick slowly catches and the flame grows, lighting
> the edge of the book with gold light. Smoke drifts right to left. Slow,
> continuous motion. No cuts. No camera shake. 6 seconds.

Pull a clip's last frame for chaining:

```bash
ffmpeg -sseof -0.05 -i assets/raw/ch01.mp4 -frames:v 1 -update 1 ch01-end.png
```

## Files

```
site/
  index.html            shell (fonts and the first frame are preloaded)
  src/brief.js          every brand value and word of copy
  src/build.js          DOM from the brief
  src/film.js           scroll engine: T, crossfade, choreography, HUD values
  src/frames.js         frame sets, load queue, nearest-frame fallback
  src/stage.js          canvas cover-fit + crossfade
  src/hud.js            live HUD readouts and decoding labels
  src/decode.js         random-glyph decode effect
  src/loader.js         HUD boot screen
  src/cursor.js         crosshair cursor + magnetic CTA
  src/about.js          About card frame sequence
  src/style.css         everything visual
  scripts/extract-frames.mjs          clips → frames + manifest
  scripts/make-placeholder-footage.mjs  stand-in clips
  assets/raw/           source clips (git-ignored)
  public/frames/        frames + manifest.json (committed)
```

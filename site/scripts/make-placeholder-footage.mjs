// Renders stand-in footage so the site runs before the real AI clips exist.
// It obeys the same rules as real footage (see site/README.md, "Footage"):
// one continuous slow action, locked camera, subject on the right two-thirds,
// empty dark fog on the left, and chained chapters — the last frame of each
// clip is the first frame of the next.
//
//   node site/scripts/make-placeholder-footage.mjs
//
// Writes site/footage/01-ember.mp4, 02-rise.mp4, 03-dawn.mp4.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const W = 960;
const H = 540;
const FPS = 24;
const SECONDS = 6;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "footage");

const CHAPTERS = ["01-ember", "02-rise", "03-dawn"];
const FOCUS_X = 0.66; // subject sits on the right two-thirds

const smooth = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// Scene state as a pure function of global time g ∈ [0, 1] across all
// chapters. Because each clip samples the same curve, clip N ends exactly
// where clip N+1 begins.
function scene(g) {
  const ignite = smooth(0.0, 0.3, g);
  const rise = smooth(0.3, 0.66, g);
  const dawn = smooth(0.62, 1.0, g);
  return {
    intensity: 0.08 + 0.92 * ignite,
    radius: 0.012 + 0.03 * ignite + 0.05 * rise + 0.12 * dawn,
    y: 0.56 - 0.12 * rise + 0.02 * dawn,
    rays: rise * (1 - 0.55 * dawn),
    horizon: dawn,
    drift: g,
  };
}

function renderFrame(buf, s) {
  const cx = FOCUS_X * W;
  const cy = s.y * H;
  const r = s.radius * W;
  const r2 = r * r;
  const halo = r * 5;
  let i = 0;
  for (let y = 0; y < H; y++) {
    const ny = y / H;
    for (let x = 0; x < W; x++) {
      const nx = x / W;
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2);

      // Slow fog: a few low-frequency sines, drifting a few pixels per clip.
      const fog =
        0.035 +
        0.018 * Math.sin(nx * 5.1 + s.drift * 1.6 + Math.sin(ny * 3.3)) +
        0.012 * Math.sin(ny * 7.7 - s.drift * 1.1 + nx * 2.2);

      const core = s.intensity * Math.exp(-d2 / r2);
      const glow = s.intensity * 0.55 * Math.exp(-d / halo);
      const ang = Math.atan2(dy, dx);
      const ray =
        s.rays * s.intensity * 0.22 *
        Math.pow(0.5 + 0.5 * Math.sin(ang * 9 + 0.6), 6) *
        Math.exp(-d / (W * 0.35));
      const horizon =
        s.horizon * 0.35 * Math.exp(-Math.abs(ny - 0.6) * 9) *
        Math.exp(-Math.abs(nx - FOCUS_X) * 2.2);
      // Keep the left third dark so the headline always has room.
      const leftFade = smooth(0.12, 0.45, nx);

      const light = (glow + ray + horizon) * leftFade;
      const white = Math.min(1, core);
      // Muted gold #C9A24B, blending to warm white at the core.
      let rr = fog * 0.9 + light * 0.79 + white * 0.95;
      let gg = fog * 0.9 + light * 0.64 + white * 0.9;
      let bb = fog * 1.1 + light * 0.29 + white * 0.78;
      buf[i++] = Math.min(255, rr * 255);
      buf[i++] = Math.min(255, gg * 255);
      buf[i++] = Math.min(255, bb * 255);
    }
  }
}

function encode(name, startG, endG) {
  return new Promise((resolve, reject) => {
    const file = join(OUT, `${name}.mp4`);
    const ff = spawn("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(FPS),
      "-i", "-",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", file,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(file) : reject(new Error(`ffmpeg exited ${code}`))));

    const frames = FPS * SECONDS;
    const buf = Buffer.alloc(W * H * 3);
    for (let f = 0; f < frames; f++) {
      const g = startG + (endG - startG) * (f / (frames - 1));
      renderFrame(buf, scene(g));
      ff.stdin.write(Buffer.from(buf));
    }
    ff.stdin.end();
  });
}

mkdirSync(OUT, { recursive: true });
for (let c = 0; c < CHAPTERS.length; c++) {
  const file = await encode(CHAPTERS[c], c / CHAPTERS.length, (c + 1) / CHAPTERS.length);
  console.log("wrote", file);
}

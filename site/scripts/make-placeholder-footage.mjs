// Renders stand-in footage so the site runs before the real AI clips exist.
// It follows the same rules as real footage (see site/README.md, "Footage"):
// one continuous slow action, locked camera, subject in the right two-thirds,
// empty dark fog on the left, and chained chapters, so the last frame of each
// clip is the first frame of the next.
//
//   node scripts/make-placeholder-footage.mjs              (from site/; all clips)
//   node scripts/make-placeholder-footage.mjs ch02 about   (a subset)
//
// Writes assets/raw/ch01.mp4 … ch03.mp4 (1920x1080) and about.mp4 (1080x1350,
// the transformation clip played inside the About card).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FPS = 30;
const SECONDS = 6;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "raw");

const smooth = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// Scene state as a pure function of global time g ∈ [0, 1] across all
// chapters. Every clip samples the same curve, so clip N ends exactly where
// clip N+1 begins.
function filmScene(g) {
  const ignite = smooth(0.0, 0.3, g);
  const rise = smooth(0.3, 0.66, g);
  const dawn = smooth(0.62, 1.0, g);
  return {
    intensity: 0.08 + 0.92 * ignite,
    radius: 0.012 + 0.03 * ignite + 0.05 * rise + 0.12 * dawn,
    x: 0.66,
    y: 0.56 - 0.12 * rise + 0.02 * dawn,
    rays: rise * (1 - 0.55 * dawn),
    horizon: dawn,
    drift: g,
    leftFade: true,
  };
}

// About card: a centred ember that kindles into a full flame of light.
function aboutScene(g) {
  const k = smooth(0, 1, g);
  return {
    intensity: 0.1 + 0.9 * k,
    radius: 0.02 + 0.09 * k,
    x: 0.5,
    y: 0.5 - 0.06 * k,
    rays: smooth(0.4, 1, g) * 0.8,
    horizon: 0,
    drift: g * 0.6,
    leftFade: false,
  };
}

function renderFrame(buf, W, H, s) {
  const cx = s.x * W;
  const cy = s.y * H;
  const unit = Math.max(W, H * 16 / 9);
  const r = s.radius * unit;
  const r2 = r * r;
  const halo = r * 5;
  const rayFall = unit * 0.35;
  let i = 0;
  for (let y = 0; y < H; y++) {
    const ny = y / H;
    for (let x = 0; x < W; x++) {
      const nx = x / W;
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2);

      // Slow fog: a few low-frequency sines, drifting a little per clip.
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
        Math.exp(-d / rayFall);
      const horizon =
        s.horizon * 0.35 * Math.exp(-Math.abs(ny - 0.6) * 9) *
        Math.exp(-Math.abs(nx - s.x) * 2.2);
      // Keep the left third dark so the headline always has room.
      const fade = s.leftFade ? smooth(0.12, 0.45, nx) : 1;

      const light = (glow + ray + horizon) * fade;
      const white = Math.min(1, core);
      // Muted gold #C9A24B, blending to warm white at the core.
      buf[i++] = Math.min(255, (fog * 0.9 + light * 0.79 + white * 0.95) * 255);
      buf[i++] = Math.min(255, (fog * 0.9 + light * 0.64 + white * 0.9) * 255);
      buf[i++] = Math.min(255, (fog * 1.1 + light * 0.29 + white * 0.78) * 255);
    }
  }
}

function encode(name, W, H, scene, startG, endG) {
  return new Promise((resolve, reject) => {
    const file = join(OUT, `${name}.mp4`);
    const ff = spawn("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(FPS),
      "-i", "-",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", file,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(file) : reject(new Error(`ffmpeg exited ${code}`))));

    const frames = FPS * SECONDS;
    const buf = Buffer.alloc(W * H * 3);
    for (let f = 0; f < frames; f++) {
      const g = startG + (endG - startG) * (f / (frames - 1));
      renderFrame(buf, W, H, scene(g));
      ff.stdin.write(Buffer.from(buf));
    }
    ff.stdin.end();
  });
}

mkdirSync(OUT, { recursive: true });
const jobs = {
  ch01: () => encode("ch01", 1920, 1080, filmScene, 0 / 3, 1 / 3),
  ch02: () => encode("ch02", 1920, 1080, filmScene, 1 / 3, 2 / 3),
  ch03: () => encode("ch03", 1920, 1080, filmScene, 2 / 3, 3 / 3),
  about: () => encode("about", 1080, 1350, aboutScene, 0, 1),
};
// Pass clip names to render a subset, e.g. `… ch02 about`. Rendering is
// CPU-bound, so run one process per clip to use more cores.
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(jobs);
for (const name of names) console.log("wrote", await jobs[name]());

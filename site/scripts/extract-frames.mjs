// Step 1: cut every clip in assets/raw/ into webp frame sets and write
// public/frames/manifest.json.
//
//   npm run frames                    (from site/)
//   QUALITY=62 npm run frames         (if a set is over budget)
//
// Chapters are clips named chNN.mp4 (ch01, ch02, …), played in name order.
// Any other clip (e.g. about.mp4) is an "extra" sequence used by a lower
// section. Each clip gets two sets:
//   d/  desktop: 30 fps, 1920px wide   (extras: 1080px)
//   m/  mobile:  15 fps, 1000px wide   (extras: 720px)
// The equivalent raw commands, for tools that can't run this script:
//   ffmpeg -i assets/raw/ch01.mp4 -vf "fps=30,scale=1920:-2" -c:v libwebp -quality 70 public/frames/ch01/d/%04d.webp
//   ffmpeg -i assets/raw/ch01.mp4 -vf "fps=15,scale=1000:-2" -c:v libwebp -quality 70 public/frames/ch01/m/%04d.webp
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "assets", "raw");
const OUT = join(ROOT, "public", "frames");
const QUALITY = Number(process.env.QUALITY || 70);

const SETS = {
  d: { fps: 30, width: 1920, extraWidth: 1080 },
  m: { fps: 15, width: 1000, extraWidth: 720 },
};
const FRAME_BUDGET_KB = 90; // per desktop frame
const BUDGET_MB = { d: 18, m: 6 }; // per set, chapters + extras

const clips = readdirSync(RAW)
  .filter((f) => [".mp4", ".mov", ".webm"].includes(extname(f).toLowerCase()))
  .sort();
if (!clips.length) {
  console.error(`No clips in ${RAW}. Add ch01.mp4, ch02.mp4, …`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const manifest = { quality: QUALITY, pad: 4, chapters: [], extras: {} };
const totals = { d: 0, m: 0 };
const report = [];

for (const clip of clips) {
  const id = basename(clip, extname(clip));
  const isChapter = /^ch\d+$/.test(id);
  const entry = { id };

  for (const [set, cfg] of Object.entries(SETS)) {
    const dir = join(OUT, id, set);
    mkdirSync(dir, { recursive: true });
    const width = isChapter ? cfg.width : cfg.extraWidth;
    execFileSync("ffmpeg", [
      "-loglevel", "error", "-i", join(RAW, clip),
      // Never upscale a clip narrower than the target width.
      "-vf", `fps=${cfg.fps},scale='min(${width},iw)':-2:flags=lanczos`,
      "-c:v", "libwebp", "-quality", String(QUALITY), "-compression_level", "6",
      join(dir, "%04d.webp"),
    ]);
    const files = readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
    const sizes = files.map((f) => statSync(join(dir, f)).size);
    const bytes = sizes.reduce((a, b) => a + b, 0);
    const [w, h] = execFileSync("ffprobe", [
      "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
      "-of", "csv=s=x:p=0", join(dir, files[0]),
    ]).toString().trim().split("x").map(Number);

    entry[set] = { count: files.length, width: w, height: h, fps: cfg.fps };
    totals[set] += bytes;
    report.push({
      clip: id,
      set,
      frames: files.length,
      size: `${w}x${h}`,
      totalMB: +(bytes / 1048576).toFixed(2),
      avgKB: +(bytes / files.length / 1024).toFixed(1),
      maxKB: +(Math.max(...sizes) / 1024).toFixed(1),
    });
  }

  if (isChapter) manifest.chapters.push(entry);
  else manifest.extras[id] = entry;
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.table(report);
for (const set of Object.keys(SETS)) {
  const mb = totals[set] / 1048576;
  const flag = mb > BUDGET_MB[set] ? `  OVER BUDGET (${BUDGET_MB[set]} MB)` : "";
  console.log(`${set === "d" ? "desktop" : "mobile "} total: ${mb.toFixed(2)} MB${flag}`);
}
const heavy = report.filter((r) => r.set === "d" && r.maxKB > FRAME_BUDGET_KB);
for (const r of heavy) {
  console.log(`${r.clip}: largest desktop frame ${r.maxKB} KB > ${FRAME_BUDGET_KB} KB; lower QUALITY, then fps, before resolution.`);
}
console.log(`wrote ${join(OUT, "manifest.json")}`);

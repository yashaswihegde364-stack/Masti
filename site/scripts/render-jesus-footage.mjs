// Renders the film's footage: a painted, backlit figure of Jesus in profile
// (scripts/jesus/scene.js), drawn frame by frame in headless Chromium at
// 1920x1080, 30 fps, then encoded to assets/raw/ch01–ch03.mp4 and about.mp4.
// The chapters sample one continuous timeline, so each clip's last frame is
// the next clip's first.
//
//   npm run footage            (from site/; then npm run frames)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENE_DIR = join(ROOT, "scripts", "jesus");
const OUT = join(ROOT, "assets", "raw");
const FPS = 30;
const SECONDS = 6;

const CLIPS = [
  { id: "ch01", w: 1920, h: 1080, from: 0 / 3, to: 1 / 3 },
  { id: "ch02", w: 1920, h: 1080, from: 1 / 3, to: 2 / 3 },
  { id: "ch03", w: 1920, h: 1080, from: 2 / 3, to: 3 / 3 },
  { id: "about", w: 1080, h: 1350, from: 0, to: 1, about: true },
];

// Tiny static server: module scripts don't load from file:// URLs.
const types = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer((req, res) => {
  try {
    const path = join(SCENE_DIR, new URL(req.url, "http://x").pathname);
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(readFileSync(path));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const port = server.address().port;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const only = process.argv.slice(2);
for (const clip of CLIPS.filter((c) => !only.length || only.includes(c.id))) {
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on("pageerror", (e) => console.error(e));
  await page.goto(`http://localhost:${port}/index.html?w=${clip.w}&h=${clip.h}`);
  await page.waitForFunction(() => window.ready);

  const dir = mkdtempSync(join(tmpdir(), `${clip.id}-`));
  const frames = FPS * SECONDS;
  for (let f = 0; f < frames; f++) {
    const g = clip.from + (clip.to - clip.from) * (f / (frames - 1));
    const data = await page.evaluate(
      ([g, about]) => {
        window.scene.render(g, { about });
        return document.getElementById("c").toDataURL("image/jpeg", 0.95);
      },
      [g, !!clip.about],
    );
    writeFileSync(join(dir, `${String(f + 1).padStart(4, "0")}.jpg`), Buffer.from(data.split(",")[1], "base64"));
  }
  const file = join(OUT, `${clip.id}.mp4`);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dir, "%04d.jpg"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "14", "-preset", "slow", file,
  ]);
  rmSync(dir, { recursive: true, force: true });
  await page.close();
  console.log("wrote", file);
}
await browser.close();
server.close();

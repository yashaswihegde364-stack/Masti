// Builds a hosted copy of the site that needs no server setup: one HTML file
// with the JS and CSS inlined, fonts from Google Fonts, and each frame set
// packed into a single file (8 files instead of ~1,000).
//
//   npm run build:hosted        (from site/)
//
// Output: dist-hosted/index.html, dist-hosted/frames/manifest.json and
// dist-hosted/frames/*.pack.webp. The HTML is a page body (no <html>/<head>), for
// hosts that wrap it in their own document, such as a claude.ai Artifact.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist-hosted");
const VITE_OUT = join(OUT, ".vite");
const FRAMES = join(ROOT, "public", "frames");

rmSync(OUT, { recursive: true, force: true });
execFileSync("npx", ["vite", "build", "--mode", "hosted", "--logLevel", "warn"], { cwd: ROOT, stdio: "inherit" });

// ---------- Inline the bundle ----------
const assets = join(VITE_OUT, "assets");
const read = (ext) => readdirSync(assets).filter((f) => f.endsWith(ext)).map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
const js = read(".js").replace(/<\/script/gi, "<\\/script");
const css = read(".css").replace(/<\/style/gi, "<\\/style");

const html = `<title>Masti</title>
<meta name="description" content="A private space to confess, pray, ask questions, and reflect — with guidance grounded in the Bible." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..700&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500&display=swap" />
<style>
:root { color-scheme: dark; }
${css}
</style>
<noscript><p style="padding:24px;color:#F2F0EA;background:#0E0E12">Masti: a private space to confess, pray, ask questions, and reflect, with guidance grounded in the Bible.</p></noscript>
<script type="module">
${js}
</script>
`;
writeFileSync(join(OUT, "index.html"), html);
rmSync(VITE_OUT, { recursive: true, force: true });

// ---------- Pack the frames ----------
const manifest = JSON.parse(readFileSync(join(FRAMES, "manifest.json"), "utf8"));
mkdirSync(join(OUT, "frames"), { recursive: true });
const report = [];
for (const entry of [...manifest.chapters, ...Object.values(manifest.extras ?? {})]) {
  entry.packs = {};
  for (const set of ["d", "m"]) {
    const dir = join(FRAMES, entry.id, set);
    const files = readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
    const parts = files.map((f) => readFileSync(join(dir, f)));
    const offsets = [0];
    for (const p of parts) offsets.push(offsets.at(-1) + p.length);
    // Named .webp so static hosts serve it; it is webp frames end to end, read as bytes.
    const file = `${entry.id}-${set}.pack.webp`;
    writeFileSync(join(OUT, "frames", file), Buffer.concat(parts));
    entry.packs[set] = { file, offsets };
    report.push({ pack: file, frames: files.length, MB: +(offsets.at(-1) / 1048576).toFixed(2) });
  }
}
writeFileSync(join(OUT, "frames", "manifest.json"), JSON.stringify(manifest));

console.table(report);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB → ${OUT}`);

import "./fonts.js";
import "lenis/dist/lenis.css";
import "./style.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { brief } from "./brief.js";
import { buildPage } from "./build.js";
import { FrameSet, LoadQueue, coarseToFine, loadManifest } from "./frames.js";
import { Stage } from "./stage.js";
import { Film } from "./film.js";
import { Hud } from "./hud.js";
import { BootLoader } from "./loader.js";
import { setupCursor } from "./cursor.js";
import { setupAbout } from "./about.js";

gsap.registerPlugin(ScrollTrigger);

const GATE_FRAMES = 24; // chapter 1 frames loaded behind the boot screen
const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Phones get the mobile frame set. Chosen once at load; resizing later keeps
// the set already in memory. Tablets keep desktop frames: their portrait crop
// would stretch the 1000px set past 2x.
const mobile = Math.min(screen.width, screen.height) < 600 || Math.min(innerWidth, innerHeight) < 600;
const SET = mobile ? "m" : "d";

root.classList.toggle("is-mobile", mobile);
root.classList.toggle("is-reduced", reduced);
root.style.setProperty("--base", brief.palette.base);
root.style.setProperty("--text", brief.palette.text);
root.style.setProperty("--accent", brief.chapters[0].accent ?? brief.palette.accent);

buildPage(brief);
const loader = new BootLoader(document.querySelector(".loader"));
history.scrollRestoration = "manual";
window.scrollTo(0, 0);

async function boot() {
  let manifest;
  try {
    manifest = await loadManifest();
  } catch (err) {
    console.error(err);
    loader.fail("Frames missing. Run: npm run frames");
    return;
  }

  const byId = new Map(manifest.chapters.map((c) => [c.id, c]));
  const sets = brief.chapters.map((c) => {
    const meta = byId.get(c.id);
    if (!meta) throw new Error(`No frames for chapter "${c.id}". Add assets/raw/${c.id}.mp4 and run npm run frames.`);
    return new FrameSet(c.id, SET, meta[SET], manifest.pad, meta.packs?.[SET]);
  });
  const aboutMeta = manifest.extras?.[brief.sections.about.sequence];
  const aboutSet = aboutMeta ? new FrameSet(aboutMeta.id, SET, aboutMeta[SET], manifest.pad, aboutMeta.packs?.[SET]) : null;

  // ---------- Load order ----------
  // Behind the loader: the first 24 frames of chapter 1, plus fonts so
  // headlines never shift. Then the rest of chapter 1, then later chapters,
  // then the About sequence, all in the background.
  // Reduced motion only needs one still per chapter.
  const queue = new LoadQueue(6);
  const stillOf = (set) => [Math.round(0.6 * (set.count - 1))];
  const gateIdx = reduced ? stillOf(sets[0]) : [...Array(Math.min(GATE_FRAMES, sets[0].count)).keys()];
  let gateDone = 0;
  let fontsDone = 0;
  const progress = () => loader.set((gateDone + fontsDone) / (gateIdx.length + 1));

  const fonts = Promise.all([
    document.fonts.load('650 100px "Inter Tight Variable"'),
    document.fonts.load('650 100px "Inter Tight"'), // hosted build uses Google Fonts
    document.fonts.load('400 11px "JetBrains Mono"'),
    document.fonts.load('500 11px "JetBrains Mono"'),
  ])
    .catch(() => {})
    .then(() => {
      fontsDone = 1;
      progress();
    });
  const gate = queue.add(sets[0], gateIdx, (done) => {
    gateDone = done;
    progress();
  });

  if (reduced) {
    for (const set of sets.slice(1)) queue.add(set, stillOf(set));
    if (aboutSet) queue.add(aboutSet, stillOf(aboutSet));
  } else {
    queue.add(sets[0], coarseToFine(GATE_FRAMES, sets[0].count));
    for (const set of sets.slice(1)) queue.add(set, coarseToFine(0, set.count));
    if (aboutSet) queue.add(aboutSet, coarseToFine(0, aboutSet.count));
  }

  // ---------- Engine ----------
  const stage = new Stage(document.querySelector(".stage"));
  const hud = new Hud(brief);
  const film = new Film({ brief, sets, stage, hud, reduced });
  if (new URLSearchParams(location.search).has("debug")) window.__film = film;

  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, anchors: true, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  root.classList.add("is-locked");

  gsap.ticker.add(() => film.tick(gsap.ticker.deltaRatio(60)));

  window.addEventListener("resize", () => {
    stage.resize();
    film.redraw();
  });

  // Stop the render loop entirely while the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) gsap.ticker.sleep();
    else gsap.ticker.wake();
  });

  // Solid nav once the curtain sections pass beneath it.
  ScrollTrigger.create({
    trigger: ".curtain",
    start: "top top+=64",
    end: "max",
    toggleClass: { targets: ".nav", className: "is-solid" },
  });

  setupCursor();
  setupAbout(aboutSet, reduced);

  await Promise.all([gate, fonts]);
  ScrollTrigger.refresh();
  film.redraw();
  await loader.finish();

  root.classList.remove("is-locked");
  root.classList.add("is-ready");
  lenis?.start();
  gsap.fromTo(".stage", { opacity: 0 }, { opacity: 1, duration: reduced ? 0.3 : 1.1, ease: "power2.out" });
  film.playIntro();
}

boot().catch((err) => {
  console.error(err);
  loader.fail(err.message);
});

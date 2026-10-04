// Scroll-scrubbed film player.
//
// The "3D" is pre-rendered video cut into still frames (site/frames, built by
// scripts/extract-frames.sh). Scroll position picks a frame; a canvas draws
// it; the copy and HUD are plain DOM on top. Each <section class="chapter">
// owns one clip, and because clips are chained (last frame of one = first
// frame of the next) the whole page plays as a single continuous shot.
(() => {
  "use strict";

  // Where the subject sits in the footage, as a fraction of frame width.
  // Footage is shot with the subject on the right two-thirds; on portrait
  // screens the crop recenters on this point.
  const FOCUS_X = 0.66;
  const FOCUS_Y = 0.5;
  const EASE = 0.16; // per-frame catch-up toward the scroll target, 0..1
  const LOAD_CONCURRENCY = 6;
  const MAX_DPR = 2;

  const root = document.documentElement;
  const canvas = document.querySelector(".stage__canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const hud = {
    chapter: document.querySelector(".hud__chapter"),
    title: document.querySelector(".hud__title"),
    frame: document.querySelector(".hud__frame"),
    time: document.querySelector(".hud__time"),
    rail: document.querySelector(".hud__rail"),
    loader: document.querySelector(".hud__loader"),
    hint: document.querySelector(".hud__hint"),
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let manifest;
  let chapters = []; // { el, copy, title, offset, count, top, height }
  let frames = []; // HTMLImageElement | undefined, indexed globally
  let total = 0;
  let target = 0;
  let current = 0;
  let drawn = -1;
  let ticking = false;
  let viewW = 0;
  let viewH = 0;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = (a, b, t) => {
    const x = clamp((t - a) / (b - a), 0, 1);
    return x * x * (3 - 2 * x);
  };
  const pad = (n, w) => String(n).padStart(w, "0");

  function frameUrl(chapterId, n) {
    return (
      "frames/" +
      manifest.pattern.replace("{id}", chapterId).replace("{n}", pad(n, manifest.pad))
    );
  }

  // ---------- Setup ----------

  async function init() {
    try {
      const res = await fetch("frames/manifest.json");
      if (!res.ok) throw new Error(res.status);
      manifest = await res.json();
    } catch (err) {
      // No footage: fall back to the plain, static page.
      console.warn("Scroll film disabled — could not load frames/manifest.json", err);
      root.classList.remove("js");
      return;
    }

    const byId = new Map(manifest.chapters.map((c) => [c.id, c]));
    let offset = 0;
    for (const el of document.querySelectorAll(".chapter")) {
      const meta = byId.get(el.dataset.chapter);
      if (!meta) {
        console.warn(`No frames for chapter "${el.dataset.chapter}"`);
        continue;
      }
      el.style.setProperty("--length", el.dataset.length || 3);
      chapters.push({
        el,
        id: meta.id,
        copy: el.querySelector(".copy"),
        title: el.dataset.title || meta.id,
        offset,
        count: meta.count,
        top: 0,
        height: 0,
      });
      offset += meta.count;
    }
    total = offset;
    frames = new Array(total);

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      onScroll();
    });
    new ResizeObserver(() => {
      measure();
      onScroll();
    }).observe(document.body);

    onScroll();
    current = target;
    loadFrames();
  }

  function measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    for (const c of chapters) {
      const rect = c.el.getBoundingClientRect();
      c.top = rect.top + window.scrollY;
      c.height = rect.height;
    }
    drawn = -1; // canvas was cleared by the resize
    requestTick();
  }

  // ---------- Loading ----------

  // Coarse-to-fine order: every chapter's first frame, then every 16th frame,
  // then 8th, 4th, 2nd, then the rest. Scrubbing works almost immediately at
  // low temporal resolution and sharpens as frames arrive.
  function loadOrder() {
    const order = [];
    const seen = new Uint8Array(total);
    const push = (i) => {
      if (!seen[i]) {
        seen[i] = 1;
        order.push(i);
      }
    };
    for (const c of chapters) push(c.offset);
    for (const step of [16, 8, 4, 2, 1]) {
      for (const c of chapters) {
        for (let k = 0; k < c.count; k += step) push(c.offset + k);
        push(c.offset + c.count - 1);
      }
    }
    return order;
  }

  function locate(globalIndex) {
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (globalIndex >= chapters[i].offset) return [chapters[i], globalIndex - chapters[i].offset];
    }
    return [chapters[0], 0];
  }

  function loadFrames() {
    const queue = loadOrder();
    let loaded = 0;
    const next = () => {
      const index = queue.shift();
      if (index === undefined) return;
      const [chapter, local] = locate(index);
      const img = new Image();
      img.decoding = "async";
      img.src = frameUrl(chapter.id, local + 1);
      img
        .decode()
        .then(() => {
          frames[index] = img;
          // A closer frame than the one on screen just arrived: redraw.
          if (Math.abs(index - Math.round(current)) < Math.abs(drawn - Math.round(current)) || drawn < 0) {
            drawn = -1;
            requestTick();
          }
        })
        .catch(() => {})
        .finally(() => {
          loaded++;
          hud.loader.style.setProperty("--loaded", loaded / total);
          if (loaded === total) hud.loader.classList.add("is-done");
          next();
        });
    };
    for (let i = 0; i < LOAD_CONCURRENCY; i++) next();
  }

  // ---------- Scroll → frame ----------

  function chapterProgress(c) {
    return clamp((window.scrollY - c.top) / c.height, 0, 1);
  }

  function onScroll() {
    if (!chapters.length) return;
    const y = window.scrollY;

    let active = 0;
    for (let i = 0; i < chapters.length; i++) if (y >= chapters[i].top) active = i;
    const c = chapters[active];
    const p = chapterProgress(c);
    target = c.offset + p * (c.count - 1);

    // Copy: fade + lift in, hold, fade out before the next chapter arrives.
    chapters.forEach((ch, i) => {
      const before = y < ch.top;
      const q = chapterProgress(ch);
      const fadeIn = i === 0 ? 1 : smooth(0.04, 0.18, q);
      const fadeOut = 1 - smooth(0.56, 0.72, q);
      const o = before ? 0 : fadeIn * fadeOut;
      ch.copy.style.opacity = o.toFixed(3);
      ch.copy.style.transform = `translate3d(0, ${((1 - fadeIn) * 28).toFixed(1)}px, 0)`;
    });

    const last = chapters[chapters.length - 1];
    const filmEnd = last.top + last.height;
    const progress = clamp((y - chapters[0].top) / (filmEnd - chapters[0].top), 0, 1);
    hud.rail.style.setProperty("--progress", progress.toFixed(4));
    hud.chapter.textContent = `${pad(active + 1, 2)} / ${pad(chapters.length, 2)}`;
    hud.title.textContent = c.title;
    hud.hint.classList.toggle("is-hidden", y > 40);

    requestTick();
  }

  function requestTick() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    ticking = false;
    if (!total) return;

    if (reducedMotion.matches) current = target;
    else current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.01) current = target;

    const index = clamp(Math.round(current), 0, total - 1);
    if (index !== drawn) draw(index);
    if (current !== target) requestTick();
  }

  // Draws the nearest loaded frame to `index`.
  function draw(index) {
    let img;
    let found = -1;
    for (let d = 0; d < total; d++) {
      if (frames[index - d]) { img = frames[index - d]; found = index - d; break; }
      if (frames[index + d]) { img = frames[index + d]; found = index + d; break; }
    }
    if (!img) return;

    // Cover-fit. Landscape keeps the composition (empty dark left side for the
    // headline); portrait slides the crop so the subject lands center-screen.
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const anchorX = viewW < viewH ? 0.5 : FOCUS_X;
    const dx = clamp(cw * anchorX - dw * FOCUS_X, cw - dw, 0);
    const dy = clamp(ch * 0.5 - dh * FOCUS_Y, ch - dh, 0);
    ctx.drawImage(img, dx, dy, dw, dh);

    // Only mark as drawn if it's the exact frame; otherwise retry when it loads.
    drawn = found === index ? index : -1;

    const [chapter, local] = locate(index);
    const fps = manifest.fps || 24;
    const absolute = chapter.offset + local;
    const secs = Math.floor(absolute / fps);
    hud.frame.textContent = `F ${pad(absolute + 1, 4)} / ${pad(total, 4)}`;
    hud.time.textContent = `${pad(Math.floor(secs / 60), 2)}:${pad(secs % 60, 2)}:${pad(absolute % fps, 2)}`;
  }

  init();
})();

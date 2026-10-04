// The scroll engine.
//
// One number drives everything: film time T = chapter index + progress
// through that chapter (0 … chapters.length). Scroll gives a target T, the
// displayed T eases toward it every tick, and frames, crossfades, text
// choreography, accent colour, the flash and the HUD are all pure functions
// of the displayed T. That's what makes scrolling backward rewind everything
// exactly.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scramble } from "./decode.js";

const LERP = 0.2; // per 60fps tick
const CROSS = 0.1; // last 10% of a chapter crossfades into the first 10% of the next
const REDUCED_STILL = 0.6; // reduced motion: which point of each clip to hold

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (t) => t * t * (3 - 2 * t);

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export class Film {
  constructor({ brief, sets, stage, hud, reduced }) {
    this.brief = brief;
    this.chapters = brief.chapters;
    this.sets = sets; // FrameSet per chapter
    this.stage = stage;
    this.hud = hud;
    this.reduced = reduced;
    this.n = this.chapters.length;

    this.T = 0;
    this.intro = 0; // chapter 1's entrance, played once after the loader
    this.lastKey = "";
    this.dirty = true;
    this.textQ = new Array(this.n).fill(-1);
    this.accent = "";
    this.activeChapter = -1;

    this.root = document.documentElement;
    this.flashEl = document.querySelector(".flash");
    this.layers = [...document.querySelectorAll(".chapter")];
    this.spacers = [...document.querySelectorAll(".film__spacer")];

    // Progress source for each chapter. The last chapter ends when its
    // spacer's bottom meets the viewport bottom, so the final frame holds
    // while the curtain section slides up over it.
    this.triggers = this.spacers.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: i === this.n - 1 ? "bottom bottom" : "bottom top",
      }),
    );
    // Pins are sized in vh but scroll is in px, so a resize would land on a
    // different moment of the film. Keep film time fixed across refreshes.
    ScrollTrigger.addEventListener("refreshInit", () => {
      const T = this.targetT();
      this.savedT = window.scrollY > 0 && T < this.n ? T : null;
    });
    ScrollTrigger.addEventListener("refresh", () => {
      this.dirty = true;
      if (this.savedT == null) return;
      const y = this.scrollFor(this.savedT);
      this.savedT = null;
      if (Math.abs(y - window.scrollY) > 1) window.scrollTo(0, y);
    });

    this.timelines = this.layers.map((el, i) => this.buildTimeline(el, i));

    // Redraw when a frame we wanted (but had to substitute) finishes decoding.
    for (const set of sets) set.onLoad(() => !this.exact && (this.dirty = true));

    if (reduced) this.setupReduced();
  }

  // ---------- Choreography (per chapter, scrubbed by progress 0..1) ----------

  buildTimeline(el, i) {
    const eyebrow = el.querySelector(".chapter__eyebrow");
    const text = eyebrow.dataset.text;
    const decode = { t: 0 };
    const copy = el.querySelector(".chapter__copy");
    const inners = el.querySelectorAll(".line-inner");
    const sub = el.querySelector(".chapter__sub");
    const [c1, c2] = el.querySelectorAll(".card");
    const hidden = { opacity: 0, y: 18, filter: "blur(12px)" };
    const shown = { opacity: 1, y: 0, filter: "blur(0px)" };

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    // 0.00–0.10: eyebrow decodes in; headline lines rise out of their masks.
    tl.to(decode, {
      t: 1,
      duration: 0.1,
      onUpdate: () => (eyebrow.textContent = scramble(text, decode.t, i * 31) || " "),
    }, 0);
    tl.fromTo(inners, { yPercent: 115 }, { yPercent: 0, duration: 0.08, stagger: 0.02, ease: "power3.out" }, 0);
    tl.fromTo(sub, { opacity: 0, y: 14 }, { opacity: 0.7, y: 0, duration: 0.06 }, 0.05);
    // 0.15: quote card 1 fades and un-blurs in. 0.55: it swaps to card 2.
    tl.fromTo(c1, hidden, { ...shown, duration: 0.07 }, 0.15);
    tl.to(c1, { opacity: 0, y: -12, filter: "blur(10px)", duration: 0.04 }, 0.51);
    tl.fromTo(c2, hidden, { ...shown, duration: 0.06 }, 0.55);
    // 0.85–1.00: headline drifts up and blurs out as the next frames take over.
    tl.to(copy, { y: -90, opacity: 0, filter: "blur(16px)", duration: 0.15, ease: "power1.in" }, 0.85);
    tl.to(c2, { opacity: 0, y: -12, filter: "blur(12px)", duration: 0.1 }, 0.85);
    tl.set({}, {}, 1); // exact duration 1, so progress == time
    return tl;
  }

  playIntro() {
    if (this.reduced) return;
    gsap.to(this, { intro: 0.12, duration: 1.4, ease: "power2.out", onUpdate: () => (this.dirty = true) });
  }

  // ---------- Scroll → T ----------

  targetT() {
    const y = window.scrollY;
    for (let k = this.n - 1; k >= 0; k--) {
      const st = this.triggers[k];
      if (y >= st.start) return k + clamp((y - st.start) / Math.max(1, st.end - st.start), 0, 1);
    }
    return 0;
  }

  scrollFor(T) {
    const k = Math.min(Math.floor(T), this.n - 1);
    const st = this.triggers[k];
    return st.start + clamp(T - k, 0, 1) * (st.end - st.start);
  }

  // T → which frames to draw and how to mix them.
  sample(T) {
    const n = this.n;
    const k = Math.min(Math.floor(T), n - 1);
    const p = clamp(T - k, 0, 1);
    const start = k === 0 ? 0 : CROSS; // later chapters' first 10% played during the handoff
    const uA = start + (1 - start) * p;
    let mix = 0;
    let uB = 0;
    if (k < n - 1 && p > 1 - CROSS) {
      const w = (p - (1 - CROSS)) / CROSS;
      mix = smoothstep(w);
      uB = w * CROSS;
    }
    return { k, p, uA, uB, mix };
  }

  // ---------- Tick ----------

  tick(deltaRatio = 1) {
    if (this.reduced) return this.tickReduced();

    const target = this.targetT();
    const a = 1 - Math.pow(1 - LERP, deltaRatio); // frame-rate independent ease
    this.T += (target - this.T) * a;
    if (Math.abs(target - this.T) < 1e-4) this.T = target;

    const s = this.sample(this.T);
    this.renderFrames(s);
    this.renderText();
    this.renderAtmosphere(s);
    this.renderHud(s);
  }

  renderFrames({ k, uA, uB, mix }) {
    const A = this.sets[k];
    const iA = Math.round(uA * (A.count - 1));
    const B = mix > 0 ? this.sets[k + 1] : null;
    const iB = B ? Math.round(uB * (B.count - 1)) : -1;
    // Draw only when the rounded index (or crossfade step) changes.
    const key = `${k}|${iA}|${iB}|${Math.round(mix * 48)}`;
    if (key === this.lastKey && !this.dirty) return;

    const fa = A.nearest(iA);
    const fb = B ? B.nearest(iB) : null;
    if (!fa && !fb) return; // keep whatever is on the canvas
    this.stage.draw(fa?.img ?? null, fb?.img ?? null, fa ? mix : 1);
    this.exact = (!fa || fa.index === iA) && (!B || (fb && fb.index === iB));
    this.lastKey = key;
    this.dirty = false;
  }

  renderText() {
    for (let i = 0; i < this.n; i++) {
      let q = clamp(this.T - i, 0, 1);
      if (i === 0) q = Math.max(q, this.intro);
      if (Math.abs(q - this.textQ[i]) < 0.0002) continue;
      this.textQ[i] = q;
      this.timelines[i].progress(q);
      // Off-screen chapters skip layout and paint entirely.
      this.layers[i].style.visibility = q <= 0 || q >= 1 ? "hidden" : "visible";
    }
  }

  renderAtmosphere({ k, p, mix }) {
    const c = this.chapters;
    const accent = mixHex(c[k].accent, (c[k + 1] ?? c[k]).accent, mix);
    if (accent !== this.accent) {
      this.root.style.setProperty("--accent", accent);
      this.accent = accent;
    }
    const f = c[k].flash;
    let flash = 0;
    if (f) flash = Math.pow(Math.max(0, 1 - Math.abs(p - f.at) / (f.width / 2)), 2) * 0.85;
    if (flash !== this.flash) {
      this.flashEl.style.opacity = flash.toFixed(3);
      this.flash = flash;
    }
  }

  renderHud({ k, p, uA, uB, mix }) {
    const shown = mix >= 0.5 ? k + 1 : k;
    const set = this.sets[shown];
    const u = shown === k ? uA : uB;
    this.hud.update({
      chapter: shown,
      total: this.n,
      frame: Math.round(u * (set.count - 1)) + 1,
      frames: set.count,
      percent: (this.T / this.n) * 100,
      chapterProgress: shown === k ? p : 0,
    });
  }

  // ---------- Reduced motion: one strong still per chapter, simple fades ----------

  setupReduced() {
    this.layers.forEach((el, i) => {
      el.classList.add("is-reduced");
      this.timelines[i].progress(0.3); // headline, subcopy and first quote shown
    });
    this.fade = { from: null, to: null, mix: 1 };
  }

  stillFor(k) {
    const set = this.sets[k];
    return set.nearest(Math.round(REDUCED_STILL * (set.count - 1)))?.img ?? null;
  }

  tickReduced() {
    const T = this.targetT();
    const k = Math.min(Math.floor(T), this.n - 1);
    if (k !== this.activeChapter) {
      const prev = this.activeChapter;
      this.activeChapter = k;
      this.layers.forEach((el, i) => el.classList.toggle("is-active", i === k));
      this.root.style.setProperty("--accent", this.chapters[k].accent);
      this.fade.from = prev >= 0 ? this.stillFor(prev) : null;
      this.fade.mix = prev >= 0 ? 0 : 1;
      gsap.to(this.fade, { mix: 1, duration: 0.6, ease: "power1.inOut", onUpdate: () => (this.dirty = true) });
      this.dirty = true;
    }
    if (this.dirty) {
      const to = this.stillFor(k);
      if (to || this.fade.from) this.stage.draw(this.fade.from, to, this.fade.from ? this.fade.mix : 1);
      this.dirty = !to; // keep trying until the still has loaded
    }
    const set = this.sets[k];
    this.hud.update({
      chapter: k,
      total: this.n,
      frame: Math.round(REDUCED_STILL * (set.count - 1)) + 1,
      frames: set.count,
      percent: (T / this.n) * 100,
      chapterProgress: clamp(T - k, 0, 1),
    });
  }

  // Called synchronously from the resize handler so the cleared canvas is
  // repainted before the browser shows it.
  redraw() {
    this.dirty = true;
    this.lastKey = "";
    if (this.reduced) this.tickReduced();
    else this.renderFrames(this.sample(this.T));
  }
}

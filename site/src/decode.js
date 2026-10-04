// "Decode" text effect: characters resolve from random glyphs into the real
// text, left to right.

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>[]";

// Cheap deterministic hash, so a scrubbed decode shows the same glyphs at
// the same progress whether you scroll forward or backward.
function glyph(i, salt) {
  const h = Math.imul(i * 374761393 + salt * 668265263, 1274126177) >>> 0;
  return GLYPHS[h % GLYPHS.length];
}

// Text at progress t ∈ [0, 1]: resolved prefix, a band of glyphs, then blanks.
export function scramble(text, t, salt = 0) {
  if (t >= 1) return text;
  if (t <= 0) return "";
  const n = text.length;
  const resolved = Math.floor(n * t);
  const band = Math.min(n - resolved, 6);
  const tick = Math.floor(t * 40); // glyphs re-roll as progress moves
  let out = text.slice(0, resolved);
  for (let i = resolved; i < resolved + band; i++) {
    out += text[i] === " " ? " " : glyph(i, tick + salt);
  }
  return out;
}

// Time-based decode (~500ms) for labels that decode when a chapter enters.
const running = new WeakMap();

export function decodeIn(el, text, duration = 500) {
  cancelAnimationFrame(running.get(el));
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = text;
    return;
  }
  const start = performance.now();
  const salt = (start | 0) % 997;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = scramble(text, t, salt) || " ";
    if (t < 1) running.set(el, requestAnimationFrame(step));
  };
  running.set(el, requestAnimationFrame(step));
}

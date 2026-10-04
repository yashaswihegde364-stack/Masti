// Draws frames onto a full-viewport canvas with cover-fit math (the same
// result as object-fit: cover), plus an optional crossfade into a second frame.
//
// Footage is composed with the subject at about 66% of frame width and empty
// dark space on the left for the headline. In landscape, the crop keeps that
// composition. In portrait, it zooms in slightly and recenters on the subject,
// lifting it above the bottom-anchored headline.

const MAX_DPR = 2;

export const FOCUS = { x: 0.66, y: 0.5 };
const PORTRAIT = { zoom: 1.18, screenX: 0.5, screenY: 0.4 };

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.cssW = window.innerWidth;
    this.cssH = window.innerHeight;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.ctx.imageSmoothingQuality = "high";
  }

  // Destination rect for an image of iw×ih.
  fit(iw, ih) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const portrait = this.cssW < this.cssH;
    const zoom = portrait ? PORTRAIT.zoom : 1;
    const scale = Math.max(cw / iw, ch / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const sx = portrait ? PORTRAIT.screenX : FOCUS.x;
    const sy = portrait ? PORTRAIT.screenY : FOCUS.y;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    // Put the focus point at its screen anchor, but never expose an edge.
    const dx = clamp(cw * sx - dw * FOCUS.x, cw - dw, 0);
    const dy = clamp(ch * sy - dh * FOCUS.y, ch - dh, 0);
    return [dx, dy, dw, dh];
  }

  // a, b: HTMLImageElement | null. mix: 0 shows only a, 1 only b.
  draw(a, b, mix = 0) {
    const ctx = this.ctx;
    if (a && mix < 1) {
      ctx.globalAlpha = 1;
      ctx.drawImage(a, ...this.fit(a.naturalWidth, a.naturalHeight));
    }
    if (b && mix > 0) {
      ctx.globalAlpha = a ? mix : 1;
      ctx.drawImage(b, ...this.fit(b.naturalWidth, b.naturalHeight));
      ctx.globalAlpha = 1;
    }
  }
}

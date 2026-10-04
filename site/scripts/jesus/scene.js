// Procedural painting of the film's subject: Jesus in profile, facing left,
// backlit in muted gold, in fog. Everything is a pure function of global
// film time g ∈ [0, 1], so chapter clips chain seamlessly.
//   ch01 (g 0–⅓)   head bowed in prayer, lit by a candle below
//   ch02 (g ⅓–⅔)   head slowly lifts as light rises behind him
//   ch03 (g ⅔–1)   dawn opens on the horizon; upright, fully lit
// about(t ∈ [0,1]) is a closer, centred variant for the About card.

const smooth = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Silhouette geometry (units: 1/1000 of frame height) ----------
// Head, hair and beard as one outline around the neck pivot (0, 0), y down,
// facing left: throat, beard, lips, nose, brow, crown, then long hair
// falling down the back to the shoulder.
const HEAD = [
  [-36, 0], [-38, -22], [-42, -58], [-52, -76], [-70, -90], [-84, -104],
  [-88, -122], [-85, -140], [-89, -150], [-86, -157], [-91, -164], [-93, -171],
  [-106, -181], [-96, -190], [-91, -206], [-95, -219], [-88, -240], [-78, -258],
  [-56, -283], [-20, -297], [20, -295], [52, -278], [72, -250], [80, -214],
  [84, -176], [90, -136], [98, -96], [108, -56], [120, -14], [132, 30],
  [70, 26], [22, 12],
];
// Shoulders and robe, turned three-quarters toward the left; runs off frame.
const BODY = [
  [-36, -2], [-72, 20], [-150, 42], [-214, 78], [-246, 142], [-258, 262],
  [-262, 430], [-266, 720], [340, 720], [326, 430], [306, 250], [268, 122],
  [220, 62], [150, 34], [64, 14],
];
// Hands folded in prayer in front of the chest (fingertips up and left).
// They lower into the robe as he lifts his head.
const HANDS = [
  [-228, 262], [-252, 214], [-284, 152], [-306, 112], [-300, 102], [-276, 124],
  [-250, 160], [-228, 196],
];
// The fold where the mantle crosses the chest, drawn as a faint rim line.
const FOLD = [[-150, 120], [-95, 160], [-40, 230], [10, 330], [40, 460]];

// Smooth closed (or open) Catmull-Rom path through points.
function spline(ctx, pts, closed = true) {
  const n = pts.length;
  const p = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  ctx.moveTo(...p(0));
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2);
    ctx.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2);
  }
  if (closed) ctx.closePath();
}

// ---------- Fog texture (built once) ----------
function makeFog(w, h, seed) {
  const c = new OffscreenCanvas(w, h);
  const x = c.getContext("2d");
  const img = x.createImageData(w, h);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Value noise, 4 octaves.
  const grids = [6, 12, 24, 48].map((g) => ({ g, v: Array.from({ length: (g + 2) * (g + 2) }, rnd) }));
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let v = 0, amp = 0.55;
      for (const { g, v: grid } of grids) {
        const fx = (i / w) * g, fy = (j / h) * g;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const at = (a, b) => grid[(b) * (g + 2) + a];
        const top = lerp(at(ix, iy), at(ix + 1, iy), sx);
        const bot = lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx);
        v += lerp(top, bot, sy) * amp;
        amp *= 0.5;
      }
      const a = Math.max(0, v - 0.42) * 2.2;
      const k = (j * w + i) * 4;
      img.data[k] = 255; img.data[k + 1] = 240; img.data[k + 2] = 214;
      img.data[k + 3] = Math.min(255, a * 255);
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function createScene(canvas) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d");
  const fogA = makeFog(480, 270, 7);
  const fogB = makeFog(480, 270, 101);
  const rim = new OffscreenCanvas(W, H);
  const rctx = rim.getContext("2d");
  const u = H / 1000;

  // Draws the figure's outline into `c` with the current transform.
  // Fills the figure with the current fillStyle. Each part is filled on its
  // own: overlapping subpaths in one path would cancel out and leave holes.
  function fillFigure(c, pivot, headAngle, hands = 0) {
    c.save();
    c.translate(pivot.x, pivot.y);
    c.scale(u * pivot.s, u * pivot.s);
    const part = (pts) => {
      c.beginPath();
      spline(c, pts);
      c.fill();
    };
    part(BODY);
    if (hands > 0.02) {
      // Lowered hands slide down and back into the robe, where they vanish.
      const k = 1 - hands;
      part(HANDS.map(([x, y]) => [x + 90 * k, y + 120 * k]));
    }
    c.rotate(headAngle);
    part(HEAD);
    c.restore();
  }

  // Rim light: the outline filled with light, minus itself shifted away from
  // the light source, leaves a crescent on the lit edges.
  function rimLight(pivot, headAngle, hands, color, dx, dy, blur, alpha) {
    rctx.setTransform(1, 0, 0, 1, 0, 0);
    rctx.globalCompositeOperation = "source-over";
    rctx.clearRect(0, 0, W, H);
    rctx.fillStyle = color;
    fillFigure(rctx, pivot, headAngle, hands);
    rctx.globalCompositeOperation = "destination-out";
    rctx.translate(dx, dy);
    fillFigure(rctx, pivot, headAngle, hands);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(rim, 0, 0);
    ctx.filter = "none";
    ctx.restore();
  }

  function glow(x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  // ---------- One frame ----------
  function render(g, opts = {}) {
    const about = !!opts.about;
    const t = g; // drives fog drift, dust and flicker
    const pray = 1 - smooth(0.18, 0.62, g); // head bowed → upright
    const back = about ? 0.15 + 0.85 * smooth(0, 0.9, g) : 0.18 + 0.55 * smooth(0.2, 0.6, g) + 0.27 * smooth(0.64, 0.95, g);
    const rays = about ? 0.6 * smooth(0.4, 1, g) : smooth(0.33, 0.62, g) * (1 - 0.45 * smooth(0.7, 1, g));
    const dawn = about ? 0 : smooth(0.66, 1, g);
    const candle = about ? 1 - smooth(0.5, 1, g) * 0.6 : 1 - smooth(0.3, 0.7, g);
    const push = about ? 1 + 0.08 * g : 1 + 0.07 * g;

    const pivot = about
      ? { x: W * 0.54, y: H * 0.66, s: 1.55 }
      : { x: W * 0.68, y: H * 0.6, s: 1 };
    const headAngle = lerp(0.05, -0.34, about ? 1 - smooth(0, 0.8, g) : pray);
    const hands = about ? 0 : smooth(0.1, 0.55, pray);
    // Light source sits behind and above the head.
    const lx = pivot.x + 70 * u * pivot.s;
    const ly = pivot.y - 210 * u * pivot.s;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#050405";
    ctx.fillRect(0, 0, W, H);

    // Slow push-in around the subject.
    const fx = pivot.x, fy = pivot.y - 150 * u;
    ctx.setTransform(push, 0, 0, push, fx * (1 - push), fy * (1 - push));

    // Dawn horizon and sky.
    if (dawn > 0) {
      const hy = H * 0.7;
      const sky = ctx.createLinearGradient(0, H * 0.2, 0, H);
      sky.addColorStop(0, "rgba(0,0,0,0)");
      sky.addColorStop(0.55, `rgba(214,160,86,${0.32 * dawn})`);
      sky.addColorStop(0.72, `rgba(250,214,150,${0.55 * dawn})`);
      sky.addColorStop(1, `rgba(40,26,14,${0.6 * dawn})`);
      ctx.fillStyle = sky;
      ctx.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
      glow(lx - 60 * u, hy, H * 0.9, "rgba(255,220,160,0.9)", 0.5 * dawn);
    }

    // Backlight behind the head.
    glow(lx, ly, H * 0.55 * (0.7 + back * 0.6), "rgba(214,168,88,1)", 0.55 * back);
    glow(lx, ly, H * 0.16 * (0.6 + back), "rgba(255,236,196,1)", 0.75 * back);

    // God rays from the light source.
    if (rays > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 46; i++) {
        const a = -Math.PI + (i / 46) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.08 + t * 0.12;
        const spread = 0.012 + 0.02 * ((Math.sin(i * 78.233) + 1) / 2);
        const len = H * (0.9 + 0.6 * ((Math.sin(i * 3.7) + 1) / 2));
        const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, len);
        const k = rays * (0.05 + 0.07 * ((Math.sin(i * 5.1 + 1) + 1) / 2));
        grad.addColorStop(0, `rgba(255,226,170,${k})`);
        grad.addColorStop(1, "rgba(255,226,170,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(a - spread) * len, ly + Math.sin(a - spread) * len);
        ctx.lineTo(lx + Math.cos(a + spread) * len, ly + Math.sin(a + spread) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Fog, two layers drifting right to left, lit by the backlight.
    const fogAlpha = 0.1 + 0.22 * back + 0.1 * dawn;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = fogAlpha;
    // Drawn well past every edge so drift and push-in never expose a border.
    ctx.drawImage(fogA, -W * 0.45 - t * W * 0.12, -H * 0.35, W * 2, H * 1.7);
    ctx.globalAlpha = fogAlpha * 0.7;
    ctx.drawImage(fogB, -W * 0.4 - t * W * 0.22, -H * 0.3, W * 2.1, H * 1.6);
    ctx.restore();

    // Dust motes drifting through the light.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 140; i++) {
      const sx = (Math.sin(i * 91.7) * 0.5 + 0.5);
      const sy = (Math.sin(i * 47.3 + 2) * 0.5 + 0.5);
      const x = (W * (0.3 + 0.75 * sx) - t * W * 0.06 * (0.5 + sx)) % W;
      const y = H * sy - t * H * 0.05 * (0.3 + sy);
      const d = Math.hypot(x - lx, y - ly) / H;
      const a = Math.max(0, 0.7 - d) * back * (0.5 + 0.5 * Math.sin(i + t * 9));
      if (a <= 0.01) continue;
      ctx.fillStyle = `rgba(255,232,190,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, (0.8 + 1.6 * ((i * 37) % 10) / 10) * u * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // The figure: near-black, with a faint warm gradient so it isn't flat.
    const body = ctx.createLinearGradient(pivot.x - 250 * u, 0, pivot.x + 250 * u, 0);
    body.addColorStop(0, "#080606");
    body.addColorStop(1, "#030303");
    ctx.fillStyle = body;
    fillFigure(ctx, pivot, headAngle, hands);

    // Backlit rim (from behind-right), tight and then bloomed.
    const r = (3 + 5 * back) * pivot.s;
    rimLight(pivot, headAngle, hands, "rgb(255,220,150)", -r, r * 0.4, 1.2, 0.95 * Math.min(1, back * 1.4));
    rimLight(pivot, headAngle, hands, "rgb(214,160,80)", -r * 3, r * 1.1, 9, 0.28 * back);

    // Candle: warm fill on the face and front from below-left, and its flame.
    if (candle > 0.01) {
      const flick = 0.92 + 0.08 * Math.sin(t * 40) * Math.sin(t * 23 + 1);
      const cx = pivot.x - 360 * u * pivot.s, cy = pivot.y + 120 * u * pivot.s;
      rimLight(pivot, headAngle, hands, "rgb(255,176,96)", 4 * pivot.s, -3 * pivot.s, 4, 0.32 * candle * flick);
      glow(cx, cy, H * 0.35, "rgba(255,160,70,1)", 0.28 * candle * flick);
      glow(cx, cy, H * 0.05, "rgba(255,230,180,1)", 0.9 * candle * flick);
      // flame
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = candle;
      const fl = ctx.createRadialGradient(cx, cy - 10 * u, 0, cx, cy - 10 * u, 22 * u);
      fl.addColorStop(0, "rgba(255,250,235,1)");
      fl.addColorStop(0.5, "rgba(255,190,90,0.8)");
      fl.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10 * u, 7 * u * pivot.s, 20 * u * pivot.s * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Mantle fold, a faint lit line across the chest.
    ctx.save();
    ctx.translate(pivot.x, pivot.y);
    ctx.scale(u * pivot.s, u * pivot.s);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(214,160,90,${0.06 + 0.12 * back})`;
    ctx.lineWidth = 3;
    ctx.filter = "blur(2px)";
    ctx.beginPath();
    spline(ctx, FOLD, false);
    ctx.stroke();
    ctx.restore();

    // Keep the left third dark for the headline, plus a soft vignette.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!about) {
      const left = ctx.createLinearGradient(0, 0, W * 0.5, 0);
      left.addColorStop(0, "rgba(5,4,5,0.92)");
      left.addColorStop(0.55, "rgba(5,4,5,0.55)");
      left.addColorStop(1, "rgba(5,4,5,0)");
      ctx.fillStyle = left;
      ctx.fillRect(0, 0, W * 0.5, H);
    }
    const v = ctx.createRadialGradient(W * 0.6, H * 0.45, H * 0.3, W * 0.6, H * 0.45, H * 1.1);
    v.addColorStop(0, "rgba(5,4,5,0)");
    v.addColorStop(1, "rgba(5,4,5,0.75)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  return { render };
}

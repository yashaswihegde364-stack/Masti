// "Dual persona" About card: a short transformation sequence that plays as
// the section scrolls through the viewport, drawn grayscale inside the card.
import { ScrollTrigger } from "gsap/ScrollTrigger";

const MAX_DPR = 2;

export function setupAbout(set, reduced) {
  const canvas = document.querySelector(".about__canvas");
  const label = document.querySelector(".about__card-frame");
  if (!canvas || !set) return () => {};
  const ctx = canvas.getContext("2d", { alpha: false });
  let progress = reduced ? 0.6 : 0;
  let drawnKey = "";

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    drawnKey = "";
  };

  const draw = () => {
    const i = Math.round(progress * (set.count - 1));
    const f = set.nearest(i);
    if (!f) return;
    const key = `${f.index}|${canvas.width}x${canvas.height}`;
    if (key === drawnKey) return;
    drawnKey = key;
    const { width: cw, height: ch } = canvas;
    const iw = f.img.naturalWidth;
    const ih = f.img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    ctx.drawImage(f.img, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
    label.textContent = `${String(i + 1).padStart(3, "0")} / ${String(set.count).padStart(3, "0")}`;
  };

  resize();
  new ResizeObserver(() => {
    resize();
    draw();
  }).observe(canvas);
  set.onLoad(() => draw());

  if (!reduced) {
    ScrollTrigger.create({
      trigger: ".about",
      start: "top 85%",
      end: "bottom 35%",
      onUpdate: (st) => {
        progress = st.progress;
        draw();
      },
    });
  }
  return draw;
}

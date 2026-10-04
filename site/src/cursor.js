// "+" crosshair cursor that eases toward the pointer and grows over links,
// and a magnetic CTA. Fine pointers only; touch devices keep native input.
import gsap from "gsap";

const EASE = 0.22;
const MAGNET_PX = 6;

export function setupCursor() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.documentElement.classList.add("has-cursor");

  const el = document.querySelector(".cursor");
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const target = { ...pos };
  let shown = false;

  window.addEventListener("pointermove", (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
    if (!shown) {
      shown = true;
      pos.x = target.x;
      pos.y = target.y;
      el.classList.add("is-visible");
    }
    el.classList.toggle("is-hover", !!e.target.closest?.("a, button"));
  });
  document.addEventListener("pointerleave", () => {
    shown = false;
    el.classList.remove("is-visible");
  });

  gsap.ticker.add(() => {
    const a = 1 - Math.pow(1 - EASE, gsap.ticker.deltaRatio(60));
    pos.x += (target.x - pos.x) * a;
    pos.y += (target.y - pos.y) * a;
    el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
  });

  for (const m of document.querySelectorAll("[data-magnetic]")) {
    const toX = gsap.quickTo(m, "x", { duration: 0.35, ease: "power3.out" });
    const toY = gsap.quickTo(m, "y", { duration: 0.35, ease: "power3.out" });
    m.addEventListener("pointermove", (e) => {
      const r = m.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      toX(Math.max(-1, Math.min(1, dx)) * MAGNET_PX);
      toY(Math.max(-1, Math.min(1, dy)) * MAGNET_PX);
    });
    m.addEventListener("pointerleave", () => {
      toX(0);
      toY(0);
    });
  }
}

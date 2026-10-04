// HUD boot screen. Lines type out while the percentage follows real preload
// progress (the first frames of chapter 1, plus fonts).
import gsap from "gsap";

const CHAR_MS = 13;

export class BootLoader {
  constructor(el) {
    this.el = el;
    this.lines = [...el.querySelectorAll(".loader__lines li")];
    this.pct = el.querySelector(".loader__pct");
    this.bar = el.querySelector(".loader__bar span");
    this.progress = 0;
    this.typed = this.type();
  }

  async type() {
    for (const li of this.lines) {
      const text = li.dataset.text;
      li.classList.add("is-typing");
      for (let i = 1; i <= text.length; i++) {
        li.textContent = text.slice(0, i);
        await new Promise((r) => setTimeout(r, CHAR_MS));
      }
      li.classList.remove("is-typing");
      li.classList.add("is-done");
    }
  }

  set(fraction) {
    this.progress = Math.max(this.progress, Math.min(1, fraction));
    this.pct.textContent = `${String(Math.round(this.progress * 100)).padStart(3, "0")}%`;
    this.bar.style.transform = `scaleX(${this.progress})`;
  }

  fail(message) {
    this.pct.textContent = "ERR";
    this.lines.at(-1).textContent = message;
  }

  async finish() {
    await this.typed;
    this.set(1);
    await gsap.to(this.el, { opacity: 0, duration: 0.6, delay: 0.25, ease: "power2.inOut" });
    this.el.remove();
  }
}

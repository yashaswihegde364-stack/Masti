// The HUD's live values. Writes to the DOM only when a value changes.
import { decodeIn } from "./decode.js";

const pad = (n, w) => String(n).padStart(w, "0");

export class Hud {
  constructor(brief) {
    this.brief = brief;
    this.labels = document.querySelector(".hud__labels");
    this.ch = document.querySelector(".hud__ch");
    this.frame = document.querySelector(".hud__frame");
    this.pct = document.querySelector(".hud__pct");
    this.bar = document.querySelector(".hud__progress span");
    this.cue = document.querySelector(".hud__cue");
    this.railItems = [...document.querySelectorAll(".rail__item")];
    this.prev = {};
  }

  set(key, el, value, write) {
    if (this.prev[key] === value) return;
    this.prev[key] = value;
    write(el, value);
  }

  update({ chapter, total, frame, frames, percent, chapterProgress }) {
    const text = (el, v) => (el.textContent = v);
    this.set("ch", this.ch, `CH ${pad(chapter + 1, 2)} / ${pad(total, 2)}`, text);
    this.set("frame", this.frame, `${pad(frame, 3)} / ${pad(frames, 3)}`, text);
    this.set("pct", this.pct, `${percent.toFixed(1).padStart(4, "0")}%`, text);
    this.set("bar", this.bar, chapterProgress.toFixed(4), (el, v) => (el.style.transform = `scaleX(${v})`));
    // The scroll cue fades out over the first few percent of the film.
    this.set("cue", this.cue, Math.max(0, 1 - percent / 3).toFixed(2), (el, v) => (el.style.opacity = v));
    if (this.prev.chapter !== chapter) {
      this.prev.chapter = chapter;
      this.railItems.forEach((el, i) => el.setAttribute("aria-current", i === chapter ? "step" : "false"));
      this.showLabels(chapter);
    }
  }

  // A chapter's system labels decode in from random glyphs when it enters.
  showLabels(chapter) {
    const items = this.brief.chapters[chapter].hud.map((i) => this.brief.hud[i]);
    this.labels.replaceChildren(
      ...items.map((label, i) => {
        const li = document.createElement("li");
        li.textContent = " ";
        setTimeout(() => decodeIn(li, label, 500), i * 90);
        return li;
      }),
    );
  }
}

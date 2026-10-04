// Builds the page DOM from the brief. Markup only: no behaviour here.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const lines = (parts, cls) =>
  parts
    // Editorial pairing: line 1 uppercase grotesk, line 2 glowing italic serif.
    .map((t, i) => `<span class="${cls}${i === 1 ? " is-serif" : ""}"><span class="${cls}-inner${i === 1 ? " is-accent" : ""}">${esc(t)}</span></span>`)
    .join("");

function card(q, n) {
  return `
    <figure class="card" data-card="${n}">
      <div class="card__label mono">${esc(q.label)}</div>
      <blockquote class="card__quote">${esc(q.quote)}</blockquote>
      <figcaption class="card__foot mono">
        <span>${esc(q.attribution)}</span><span>${esc(q.meta)}</span>
      </figcaption>
    </figure>`;
}

function chapter(c, i) {
  const tag = i === 0 ? "h1" : "h2";
  return `
    <article class="chapter" data-index="${i}" aria-labelledby="ch-${i}">
      <div class="chapter__copy">
        <p class="chapter__eyebrow mono" data-text="${esc(c.eyebrow)}">${esc(c.eyebrow)}</p>
        <${tag} id="ch-${i}" class="chapter__headline">${lines(c.headline, "line")}</${tag}>
        <p class="chapter__sub">${esc(c.subcopy)}</p>
      </div>
      <div class="chapter__cards">${c.quotes.map(card).join("")}</div>
    </article>`;
}

export function buildPage(brief) {
  const { about, download } = brief.sections;
  const navLinks = Object.entries(brief.sections)
    .slice(0, 2)
    .map(([id, s]) => `<a class="nav__link mono" href="#${id}">${esc(s.nav)}</a>`)
    .join("");

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="loader" role="status" aria-live="polite">
      <div class="loader__inner mono">
        <div class="loader__brand">${esc(brief.brand)} / ${esc(brief.division)}</div>
        <ol class="loader__lines">${brief.loader.map((l) => `<li data-text="${esc(l)}"></li>`).join("")}</ol>
        <div class="loader__bar"><span></span></div>
        <div class="loader__pct">000%</div>
      </div>
    </div>

    <canvas class="stage" aria-hidden="true"></canvas>
    <div class="vignette" aria-hidden="true"></div>
    <div class="flash" aria-hidden="true"></div>

    <div class="hud mono" aria-hidden="true">
      <span class="hud__corner hud__corner--tl"></span>
      <span class="hud__corner hud__corner--tr"></span>
      <span class="hud__corner hud__corner--bl"></span>
      <span class="hud__corner hud__corner--br"></span>
      <ul class="hud__labels"></ul>
      <dl class="hud__readout">
        <div><dt>Chapter</dt><dd class="hud__ch">CH 01 / ${String(brief.chapters.length).padStart(2, "0")}</dd></div>
        <div><dt>Frame</dt><dd class="hud__frame">000 / 000</dd></div>
        <div><dt>Progress</dt><dd class="hud__pct">00.0%</dd></div>
      </dl>
      <div class="hud__progress"><span></span></div>
      <div class="hud__cue"><span>Scroll to begin</span><i></i></div>
    </div>

    <nav class="rail mono" aria-label="Chapters">
      ${brief.chapters
        .map((c, i) => `<button class="rail__item" type="button" data-chapter="${i}"><span class="rail__label">${esc(c.eyebrow.replace(/^●\s*/, ""))}</span><span class="rail__tick"></span></button>`)
        .join("")}
    </nav>

    <header class="nav">
      <a class="nav__brand mono" href="#top"><span class="nav__dot"></span>${esc(brief.brand)} <span class="nav__sep">/</span> ${esc(brief.division)}</a>
      <nav class="nav__links" aria-label="Sections">${navLinks}</nav>
      <a class="nav__cta mono" href="${esc(brief.cta.href)}" data-magnetic><span>${esc(brief.cta.label)}</span> <span aria-hidden="true">↗</span></a>
    </header>

    <main id="top">
      <section class="film" aria-label="${esc(brief.oneLine)}">
        <div class="film__pin">${brief.chapters.map(chapter).join("")}</div>
        <div class="film__track">${brief.chapters.map(() => `<div class="film__spacer"></div>`).join("")}</div>
      </section>

      <div class="curtain">
        <section id="about" class="about">
          <div class="about__card">
            <canvas class="about__canvas" aria-hidden="true"></canvas>
            <span class="hud__corner hud__corner--tl"></span>
            <span class="hud__corner hud__corner--tr"></span>
            <span class="hud__corner hud__corner--bl"></span>
            <span class="hud__corner hud__corner--br"></span>
            <div class="about__card-label mono">${esc(about.cardLabel)}</div>
            <div class="about__card-frame mono">000</div>
          </div>
          <div class="about__copy">
            <p class="eyebrow mono">${esc(about.eyebrow)}</p>
            <h2 class="about__headline glow">${about.headline.map((l, i) => `<span${i === 1 ? ' class="is-serif"' : ""}>${esc(l)}</span>`).join("")}</h2>
            ${about.body.map((p) => `<p class="about__body">${esc(p)}</p>`).join("")}
          </div>
        </section>

        <section id="download" class="download">
          <p class="eyebrow mono">${esc(download.eyebrow)}</p>
          <h2 class="download__headline">${lines(download.headline, "dline")}</h2>
          <div class="download__actions">
            ${download.actions
              .map((a, i) => `<a class="button${i === 0 ? " button--primary" : ""}" href="${esc(a.href)}">${esc(a.label)}</a>`)
              .join("")}
          </div>
          <p class="download__note">${esc(download.note)}</p>
        </section>

        <footer class="footer mono">
          <span>${esc(brief.brand)} / ${esc(brief.division)}</span>
          <span>${esc(brief.hud[1])}</span>
        </footer>
      </div>
    </main>

    <div class="grain" aria-hidden="true"></div>
    <div class="cursor" aria-hidden="true"><span></span></div>
    `,
  );
}

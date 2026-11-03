/**
 * Alter Engineers layout — two regressions found on 2026-11-02, both about AE's
 * site frame: the legacy `.maxwidth` gutters that the nav, the footer and every
 * project page already share (theme.min.css: 1.25rem → 3.75rem at 768px →
 * 8.875rem at 1366px → max-width 126.625rem, centred, at 2560px).
 *
 * 1. INDEX PAGES SIT ON THE SITE FRAME. /resources/ and /projects/ (bloob-shape:
 *    article + a nested wide collection) rendered the header in an 820px centred
 *    column (x=328) and the cards in a 1200px centred breakout (x=106), while the
 *    logo sat at x=142. AE now pins the shared folder-index frame to its
 *    .maxwidth gutters, so title, prose and cards all start under the logo.
 *
 * 2. PROJECT PAGES HAVE NO PHANTOM ROW GAP. theme.min.css gives
 *    .projects-single__main-container `gap: 14.75rem` (28rem at 2560px) for its
 *    old flex layout. main.css swaps that container to a grid and reset only
 *    column-gap, so the old gap survived as a 236px ROW gap under the text —
 *    above an empty "read more" row that is display:none on desktop. Most
 *    visible on a project with no images, where it is most of the page.
 *
 * Loads the real stylesheets in real page order (theme.min.css → main.css →
 * shape CSS), because both bugs are cascade interactions that reading one file
 * cannot show. Self-skips without chromium, like tests/card-layout.test.js.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nunjucks from "nunjucks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

const THEME = "themes/alter-engineers/assets/css";
const STYLES = [
  read(`${THEME}/theme.min.css`),
  read(`${THEME}/main.css`),
  read("lib/visualizers/article/styles.css"),
]
  .map((css) => `<style>${css}</style>`)
  .join("\n");

let browser = null;

beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    browser = null; // no chromium — browser tests below self-skip
  }
}, 60_000);

afterAll(async () => {
  if (browser) await browser.close();
});

async function measure(body, viewport, fn) {
  const page = await browser.newPage({ viewport: { width: viewport, height: 1000 } });
  try {
    await page.setContent(`${STYLES}<body>${body}</body>`, { waitUntil: "load" });
    return await page.evaluate(fn);
  } finally {
    await page.close();
  }
}

// ── 1. index pages sit on the site frame ─────────────────────────────────────

const INDEX_PAGE = `
  <div class="maxwidth"><div id="frame">site frame</div></div>
  <article class="article-page article-page--index">
    <header class="article-header"><h1 class="article-title" id="title">Our Projects</h1></header>
    <div class="article-body">
      <p id="prose">${"From library renovations to university labs. ".repeat(20)}</p>
      <div class="collection-visualizer" id="wide" data-width="wide">cards</div>
    </div>
  </article>`;

function indexGeometry() {
  const box = (sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
  };
  return {
    frame: box("#frame"),
    title: box("#title"),
    prose: box("#prose"),
    wide: box("#wide"),
    overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
}

describe("AE index pages sit on the site frame", () => {
  for (const vw of [390, 1024, 1440, 1920, 2560, 3000]) {
    it(`title, prose and cards start at the .maxwidth edge at ${vw}px`, async () => {
      if (!browser) return;
      const g = await measure(INDEX_PAGE, vw, indexGeometry);
      expect(g.title.left).toBe(g.frame.left);
      expect(g.prose.left).toBe(g.frame.left);
      expect(g.wide.left).toBe(g.frame.left);
      expect(g.wide.right).toBe(g.frame.right);
      expect(g.overflows).toBe(false);
    });
  }

  it("keeps the intro at reading measure while the cards take the frame", async () => {
    if (!browser) return;
    const g = await measure(INDEX_PAGE, 1920, indexGeometry);
    expect(g.prose.w).toBeLessThanOrEqual(820);
    expect(g.wide.w).toBeGreaterThan(1200);
  });
});

// ── 2. project pages have no phantom row gap ─────────────────────────────────

const PROJECT_PAGE = `
  <div class="projects-single__main-container" id="container">
    <div class="projects-single__text" id="text"><p>One short paragraph about the project.</p></div>
    <div class="projects-single__read-more"><a class="button-1">READ MORE</a></div>
    <dl class="project-meta" id="meta">
      <div class="project-meta__row"><dt class="label">OWNER</dt><dd>Girl Scouts</dd></div>
      <div class="project-meta__row"><dt class="label">BUILDING SQUARE FOOTAGE</dt><dd>3600</dd></div>
    </dl>
  </div>`;

// ── 3. projects without a photo get an on-brand placeholder ─────────────────
//
// Leon, 2026-11-03: an imageless project showed an empty lavender block on the
// Projects grid and a bare title (no picture at all) in the "More Projects"
// carousel. Both now show a mint panel with the AE mark. A page whose shape has
// its own identity icon shows that icon instead — never both.

const CARD_STYLES = [
  read(`${THEME}/theme.min.css`),
  read(`${THEME}/main.css`),
  read("lib/visualizers/collection/styles.css"),
  read(`${THEME}/visualizers/collection.css`),
]
  .map((css) => `<style>${css}</style>`)
  .join("\n");

const NO_IMAGE = `
  <div class="collection-visualizer"><div class="fp-cards">
    <a class="fp-card"><div class="fp-card__image-wrap fp-card__image-wrap--placeholder" id="bare"></div></a>
    <a class="fp-card"><div class="fp-card__image-wrap fp-card__image-wrap--placeholder" id="iconed"><img class="fp-card__placeholder-icon" src="/icon.png" alt=""></div></a>
  </div></div>
  <section class="articles">
    <div class="articles__image articles__image--placeholder" id="slide"></div>
    <img class="articles__image" id="photo" alt="">
  </section>
  <div id="mintProbe" style="background: color-mix(in srgb, var(--color-mint) 55%, var(--card-bg))"></div>`;

describe("AE projects without a photo", () => {
  it("cards and carousel slides show the AE mark on mint, never an empty block", async () => {
    if (!browser) return;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    try {
      await page.setContent(`${CARD_STYLES}<body>${NO_IMAGE}</body>`, { waitUntil: "load" });
      const s = await page.evaluate(() => {
        const cs = (id) => getComputedStyle(document.getElementById(id));
        const h = (id) => Math.round(document.getElementById(id).getBoundingClientRect().height);
        return {
          bareImage: cs("bare").backgroundImage,
          bareColor: cs("bare").backgroundColor,
          iconedImage: cs("iconed").backgroundImage,
          slideImage: cs("slide").backgroundImage,
          slideColor: cs("slide").backgroundColor,
          mint: cs("mintProbe").backgroundColor,
          slideH: h("slide"),
          photoH: h("photo"),
        };
      });
      // Leon, 2026-11-03: mint panel (the warm white did not look good) with the
      // purple mark as a vector; the 64px favicon was blurry at card size.
      const MARK = "/assets/images/ae-logo-mark-purple.svg";
      const WARM_WHITE = "rgb(253, 252, 240)";
      expect(s.bareImage).toContain(MARK);
      expect(s.bareImage).not.toContain("gradient"); // not the shared lavender panel
      expect(s.bareColor).toBe(s.mint);
      expect(s.bareColor).not.toBe(WARM_WHITE);
      expect(s.iconedImage).toBe("none"); // the page's own icon wins; no second mark
      expect(s.slideImage).toContain(MARK);
      expect(s.slideColor).toBe(s.mint);
      expect(s.slideH).toBe(s.photoH); // a slide without a photo keeps the row even
    } finally {
      await page.close();
    }
  });

  it("the More Projects carousel emits a placeholder for a project without an image", () => {
    const loop = read("themes/alter-engineers/layouts/project.njk").match(
      /{% for project in collections\.projects %}[\s\S]*?{% endfor %}/,
    )[0];
    const env = new nunjucks.Environment(null, { autoescape: false });
    env.addFilter("mdinline", (s) => s); // markdown → inline HTML; identity is enough here
    const html = env.renderString(loop, {
      page: { url: "/projects/c/" },
      collections: {
        projects: [
          { url: "/projects/a/", data: { title: "A", image: "/a.jpg" } },
          { url: "/projects/b/", data: { title: "B" } },
        ],
      },
    });
    const [a, b] = html.split('class="swiper-slide').slice(1);
    expect(a).toContain('<img class="articles__image');
    expect(a).not.toContain("--placeholder");
    expect(b).toContain("articles__image--placeholder");
    expect(b).not.toContain("<img");
  });

  it("shows each project's subtitle as plain text (a slide is already a link)", () => {
    const loop = read("themes/alter-engineers/layouts/project.njk").match(
      /{% for project in collections\.projects %}[\s\S]*?{% endfor %}/,
    )[0];
    const env = new nunjucks.Environment(null, { autoescape: false });
    env.addFilter("mdinline", (s) => s);
    const html = env.renderString(loop, {
      page: { url: "/projects/c/" },
      collections: {
        projects: [
          { url: "/projects/a/", data: { title: "A", subtitle: 'Grant <em>funding</em> via <a href="/x/">the city</a>' } },
          { url: "/projects/b/", data: { title: "B" } },
        ],
      },
    });
    const [a, b] = html.split('class="swiper-slide').slice(1);
    expect(a).toContain('<p class="articles__subtitle">Grant funding via the city</p>');
    // no link nested inside the slide's own <a>
    expect(a.match(/<p class="articles__subtitle">[\s\S]*?<\/p>/)[0]).not.toMatch(/<a\b/);
    expect(b).not.toContain("articles__subtitle");
  });
});

// ── 4. the More Projects carousel ────────────────────────────────────────────
//
// Leon, 2026-11-03: the first image sat flush against the window edge, the
// images were a wide 2.25:1 crop (fixed 14rem height), and moving the cursor
// to the right should start the carousel sliding. themes/alter-engineers/
// assets/js/more-projects.js re-initialises the Swiper theme.min.js created
// (visualizers.md → browser.js ownership: destroy, then init with the full
// config) with the slides starting under the "More Projects" title, and adds
// an edge glide on hover. Images are 3:2.

const SWIPER_JS = read(`themes/alter-engineers/assets/js/swiper-bundle.min.js`);
const MORE_JS_PATH = "themes/alter-engineers/assets/js/more-projects.js";
const CAROUSEL_STYLES = [
  read(`${THEME}/theme.min.css`),
  read(`${THEME}/swiper-bundle.min.css`),
  read(`${THEME}/main.css`),
]
  .map((css) => `<style>${css}</style>`)
  .join("\n");

const IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'/%3E";
const slide = (title, photo = true) => `
  <a href="/projects/${title}/" class="swiper-slide articles__content">
    ${photo ? `<img class="articles__image no-zoom" src="${IMG}" alt="">` : `<div class="articles__image articles__image--placeholder" aria-hidden="true"></div>`}
    <div class="articles__inner-content"><h3 class="articles__title">${title}</h3><p class="articles__subtitle">A headline about ${title}</p></div>
    <div class="articles__read-more button-1">READ MORE</div>
  </a>`;

const CAROUSEL = `
  <section class="articles more-projects">
    <div class="articles__wrapper">
      <div class="articles__top-section maxwidth">
        <h1 class="h1-medium articles__main-title" id="title">More <span> Projects </span></h1>
        <div class="articles__buttons">
          <div class="articles__prev-button"></div><div class="articles__next-button"></div>
        </div>
      </div>
      <div class="swiper articles__repeater" id="articles-swiper">
        <div class="swiper-wrapper articles__repeater-wrapper">
          ${slide("Campbell Library")}
          ${slide("Laney College Library and Learning Resource Center With A Long Name")}
          ${slide("Bothin Classroom", false)}
          ${slide("Willard Clubhouse")}
          ${slide("Hildebrand Hall")}
        </div>
      </div>
    </div>
  </section>
  <div style="height:600px"></div>`;

// Exactly what theme.min.js does, so the script's destroy-and-reinit path runs.
const LEGACY_INIT = `new Swiper("#articles-swiper",{grabCursor:!0,speed:500,spaceBetween:10,loop:!0,slidesPerView:1.6,
  breakpoints:{768:{slidesPerView:1.63,spaceBetween:20},1366:{slidesPerView:2.46,spaceBetween:130},2560:{slidesPerView:2.45,spaceBetween:248}}});`;

async function openCarousel(vw = 1440, { reducedMotion = "no-preference" } = {}) {
  const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
  await page.emulateMedia({ reducedMotion });
  await page.setContent(
    `${CAROUSEL_STYLES}<body>${CAROUSEL}
       <script>${SWIPER_JS}</script>
       <script>${LEGACY_INIT}</script>
       <script>${read(MORE_JS_PATH)}</script></body>`,
    { waitUntil: "load" },
  );
  await page.waitForFunction(() => document.getElementById("articles-swiper").dataset.aeCarousel === "ready");
  return page;
}

const translate = (page) => page.evaluate(() => document.getElementById("articles-swiper").swiper.getTranslate());

describe("AE More Projects carousel", () => {
  for (const vw of [1440, 1024, 390]) {
    it(`the first slide starts under the "More Projects" title at ${vw}px`, async () => {
      if (!browser) return;
      const page = await openCarousel(vw);
      try {
        const g = await page.evaluate(() => ({
          title: Math.round(document.getElementById("title").getBoundingClientRect().left),
          first: Math.round(document.querySelector(".articles__content").getBoundingClientRect().left),
          loop: document.getElementById("articles-swiper").swiper.params.loop,
        }));
        expect(g.first).toBe(g.title);
        expect(g.loop).toBe(false); // a loop would show the last slide in the margin
      } finally {
        await page.close();
      }
    });
  }

  it("shows every image, and the no-photo panel, at a natural 3:2", async () => {
    if (!browser) return;
    const page = await openCarousel(1440);
    try {
      const ratios = await page.evaluate(() =>
        [...document.querySelectorAll(".articles__image")].map((el) => {
          const r = el.getBoundingClientRect();
          return Math.round((r.width / r.height) * 100) / 100;
        }),
      );
      for (const ratio of ratios) expect(ratio).toBeCloseTo(1.5, 1);
    } finally {
      await page.close();
    }
  });

  it("keeps the pictures a steady size across the 1366px breakpoint", async () => {
    if (!browser) return;
    const heights = [];
    for (const vw of [1024, 1330, 1440]) {
      const page = await openCarousel(vw);
      try {
        heights.push(
          await page.evaluate(() => Math.round(document.querySelector(".articles__image").getBoundingClientRect().height)),
        );
      } finally {
        await page.close();
      }
    }
    for (const h of heights) expect(h).toBeLessThanOrEqual(400);
    // just below and just above 1366px should look like the same carousel
    expect(Math.abs(heights[1] - heights[2])).toBeLessThan(60);
  });

  // Leon, 2026-11-03: "More Projects" was 60px, bigger than the project's own
  // 48px headline; and each slide should show the project's subtitle.
  it("keeps the 'More Projects' heading a modest section heading", async () => {
    if (!browser) return;
    const page = await openCarousel(1440);
    try {
      const px = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.getElementById("title")).fontSize),
      );
      expect(px).toBeLessThanOrEqual(36);
    } finally {
      await page.close();
    }
  });

  it("puts each slide's subtitle right under its title", async () => {
    if (!browser) return;
    const page = await openCarousel(1440);
    try {
      const g = await page.evaluate(() => {
        // the title TEXT's bottom, not its box: theme.min.css gives the box a
        // min-height, which is exactly the gap this guards against
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(".articles__title"));
        const t = range.getBoundingClientRect();
        const s = document.querySelector(".articles__subtitle").getBoundingClientRect();
        return { gap: Math.round(s.top - t.bottom), shown: s.height > 0 };
      });
      expect(g.shown).toBe(true);
      expect(g.gap).toBeGreaterThanOrEqual(0);
      expect(g.gap).toBeLessThan(16); // no leftover min-height between them
    } finally {
      await page.close();
    }
  });

  it("lines the images up along the top, whatever the title length", async () => {
    if (!browser) return;
    const page = await openCarousel(1440);
    try {
      const tops = await page.evaluate(() =>
        [...document.querySelectorAll(".articles__image")].slice(0, 3).map((el) =>
          Math.round(el.getBoundingClientRect().top),
        ),
      );
      expect(new Set(tops).size).toBe(1);
    } finally {
      await page.close();
    }
  });

  it("glides forward while the cursor is near the right edge, stops in the middle, glides back on the left", async () => {
    if (!browser) return;
    const page = await openCarousel(1440);
    try {
      const box = await page.locator("#articles-swiper").boundingBox();
      const y = box.y + box.height / 2;
      const start = await translate(page);

      await page.mouse.move(box.x + box.width * 0.97, y);
      await page.waitForTimeout(600);
      const forward = await translate(page);
      expect(forward).toBeLessThan(start - 50); // content moved left → next slides come in

      await page.mouse.move(box.x + box.width * 0.5, y);
      await page.waitForTimeout(150);
      const held = await translate(page);
      await page.waitForTimeout(300);
      expect(await translate(page)).toBe(held);

      await page.mouse.move(box.x + box.width * 0.03, y);
      await page.waitForTimeout(600);
      expect(await translate(page)).toBeGreaterThan(held + 50);
    } finally {
      await page.close();
    }
  });

  it("never glides past either end", async () => {
    if (!browser) return;
    const page = await openCarousel(1440);
    try {
      const box = await page.locator("#articles-swiper").boundingBox();
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width * 0.99, y);
      await page.waitForTimeout(4000);
      const b = await page.evaluate(() => {
        const s = document.getElementById("articles-swiper").swiper;
        return { t: s.getTranslate(), min: s.maxTranslate() };
      });
      expect(b.t).toBeGreaterThanOrEqual(b.min - 1);
      expect(b.t).toBeLessThanOrEqual(b.min + 1); // it got all the way, and stopped
    } finally {
      await page.close();
    }
  }, 20_000);

  it("does not glide for someone who asked for reduced motion", async () => {
    if (!browser) return;
    const page = await openCarousel(1440, { reducedMotion: "reduce" });
    try {
      const box = await page.locator("#articles-swiper").boundingBox();
      const start = await translate(page);
      await page.mouse.move(box.x + box.width * 0.97, box.y + box.height / 2);
      await page.waitForTimeout(600);
      expect(await translate(page)).toBe(start);
    } finally {
      await page.close();
    }
  });
});

// ── 7. the ARCHITECT row on a project page ───────────────────────────────────
//
// Leon, 2026-11-03: every project page credits and links its architect. The
// plain-text `architect` (from the Project Profiles sheet) is resolved by field
// links (scripts/utils/field-links.js) into `field_links.architect`:
//   firm page public   → the firm's name, linked to /architects/<slug>/
//   firm note not public → the firm's display name, plain
//   no firm note matches → the sheet text, plain
//   blank / "N/A"      → no row
// A site without field_links shows the sheet text, plain.

describe("AE project page — ARCHITECT row", () => {
  // from the ARCHITECT comment (the sets that decide the row) through the </dl>
  const block = read("themes/alter-engineers/layouts/project.njk").match(
    /{#- ARCHITECT[\s\S]*?<\/dl>\s*{% endif %}/,
  )[0];
  const env = new nunjucks.Environment(null, { autoescape: true });
  env.addFilter("dateFormat", (s) => s);
  env.addFilter("url", (s) => s);
  const rows = (ctx) =>
    [...env.renderString(block, ctx).matchAll(/<dt class="label">([^<]+)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].map(
      (m) => [m[1], m[2].trim()],
    );

  it("links the firm when its page is public, right after OWNER", () => {
    const r = rows({
      owner: "City of Campbell",
      architect: "Jayson Architecture",
      field_links: { architect: [{ value: "Jayson Architecture", name: "Jayson Architecture", href: "/architects/jayson-architecture/" }] },
    });
    expect(r.map(([k]) => k)).toEqual(["OWNER", "ARCHITECT"]);
    expect(r[1][1]).toBe('<a href="/architects/jayson-architecture/">Jayson Architecture</a>');
  });

  it("shows the firm's display name, plain, when its page is not public", () => {
    const r = rows({
      architect: "HY Architects",
      field_links: { architect: [{ value: "HY Architects", name: "Hibser Yamauchi Architects", href: null }] },
    });
    expect(r).toEqual([["ARCHITECT", "Hibser Yamauchi Architects"]]);
  });

  it("shows the sheet text, plain, when no firm note matches", () => {
    const r = rows({ architect: "Bartos", field_links: { architect: [{ value: "Bartos", name: null, href: null }] } });
    expect(r).toEqual([["ARCHITECT", "Bartos"]]);
  });

  it("shows nothing for a blank or N/A architect", () => {
    expect(rows({ architect: "N/A" })).toEqual([]);
    expect(rows({ architect: "" })).toEqual([]);
    expect(rows({ owner: "OUSD", architect: "n/a" }).map(([k]) => k)).toEqual(["OWNER"]);
  });

  it("shows the sheet text when the site has no field links at all", () => {
    expect(rows({ architect: "Siegel and Strain Architects" })).toEqual([["ARCHITECT", "Siegel and Strain Architects"]]);
  });
});

// ── 6. the all-tags page uses the project-profile tag style ──────────────────
//
// Leon, 2026-11-03: "use the same tag style in that list as we have on the
// project profiles". The shared tags-index.md emits .tag-badge links in a
// .tag-list; AE draws them as its mint chips, without list bullets.

describe("AE all-tags page", () => {
  it("draws tags as the mint project-profile badges, in a list without bullets", async () => {
    if (!browser) return;
    const g = await measure(
      `<article class="article-page"><div class="article-body">
         <ul class="tag-list"><li id="li"><a href="/tags/library/" class="tag-badge" id="badge">library</a> · 12 pages</li></ul>
       </div></article>`,
      1440,
      () => {
        const b = getComputedStyle(document.getElementById("badge"));
        return {
          bullet: getComputedStyle(document.getElementById("li")).listStyleType,
          bg: b.backgroundColor,
          transform: b.textTransform,
          hash: getComputedStyle(document.getElementById("badge"), "::before").content,
        };
      },
    );
    expect(g.bullet).toBe("none");
    expect(g.bg).toBe("rgb(182, 250, 209)"); // --color-mint, as on project profiles
    expect(g.transform).toBe("uppercase");
    expect(g.hash).toBe('"#"');
  });
});

// ── 5. space between the hero photo and the project name ─────────────────────
//
// Leon, 2026-11-03: on a project WITH photos the name (the orange label from the
// note's # heading) sat ~8px under the hero. Only the no-hero layout had a top
// offset; the hero layout had none.

describe("AE project pages with a hero photo", () => {
  it("leave at least 2rem between the photo and the project name", async () => {
    if (!browser) return;
    const g = await measure(
      `<div class="projects-single"><div class="projects-single__wrapper">
         <div class="projects-single__hero" id="hero" style="height:400px"></div>
         <div class="projects-single__main-content maxwidth">
           <h1 class="projects-single__title" id="name">Campbell Library</h1>
           <p class="projects-single__subtitle">Grant Funding Unlocks Full Electrification</p>
         </div>
       </div></div>`,
      1440,
      () => ({
        gap: Math.round(
          document.getElementById("name").getBoundingClientRect().top -
            document.getElementById("hero").getBoundingClientRect().bottom,
        ),
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      }),
    );
    expect(g.gap).toBeGreaterThanOrEqual(2 * g.rem);
  });
});

describe("AE project pages have no phantom row gap", () => {
  for (const vw of [1440, 2560]) {
    it(`the main container ends with its tallest column at ${vw}px`, async () => {
      if (!browser) return;
      const g = await measure(PROJECT_PAGE, vw, () => {
        const r = (id) => document.getElementById(id).getBoundingClientRect();
        const meta = document.getElementById("meta");
        const metaEnd = r("meta").bottom + parseFloat(getComputedStyle(meta).marginBottom);
        return {
          containerBottom: Math.round(r("container").bottom),
          contentBottom: Math.round(Math.max(r("text").bottom, metaEnd)),
        };
      });
      expect(g.containerBottom).toBe(g.contentBottom);
    });
  }
});

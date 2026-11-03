/**
 * Shape width contract — a shape declares `width: prose|wide|full`; the
 * container and theme decide whether to grant it.
 *
 * Spec: docs/superpowers/specs/2026-07-28-shape-width-contract-design.md
 *
 * Tested in BOTH directions, following tests/shape-nesting.test.js, so the
 * feature cannot regress into "everything got wide":
 *   - a wide collection really is wider than the prose column
 *   - prose siblings are NOT dragged wider with it
 *
 * The load-bearing assertion is the degradation one: a theme that defines no
 * --shape-width-wide must render byte-identically to before this feature
 * existed. That is what makes `"width": "wide"` safe as a shared default for
 * melt / marbles-pouch / warm-kitchen / buffbaby, none of which opted in.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nunjucks from "nunjucks";
import { resolveWidth, WIDTHS } from "../lib/visualizers/collection/renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

const PROSE_WIDTH = 820;

// ── the pure resolver ────────────────────────────────────────────────────────

describe("resolveWidth", () => {
  it("falls back to prose when nothing is declared", () => {
    expect(resolveWidth({}, undefined)).toBe("prose");
  });

  it("uses the shape's manifest default", () => {
    expect(resolveWidth({}, "wide")).toBe("wide");
  });

  it("lets an instance override the shape default in both directions", () => {
    expect(resolveWidth({ width: "prose" }, "wide")).toBe("prose");
    expect(resolveWidth({ width: "full" }, "prose")).toBe("full");
  });

  it("falls back to prose on an unknown value rather than throwing", () => {
    expect(resolveWidth({ width: "enormous" }, "wide")).toBe("prose");
    expect(resolveWidth({ width: 42 }, "wide")).toBe("prose");
    expect(resolveWidth({ width: null }, "wide")).toBe("wide"); // null → default
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveWidth({ width: "  WIDE " }, "prose")).toBe("wide");
  });

  it("accepts exactly the documented vocabulary", () => {
    expect(WIDTHS).toEqual(["prose", "wide", "full"]);
  });
});

// ── the emitted attribute ────────────────────────────────────────────────────

describe("collection emits its width preference", () => {
  it('defaults to wide, and omits the attribute entirely for prose', async () => {
    const manifest = JSON.parse(read("lib/visualizers/collection/manifest.json"));
    expect(manifest.width).toBe("wide");

    const { transform } = await import("../lib/visualizers/collection/index.js");
    const fence = (body) =>
      `<pre><code class="language-collection">${body}</code></pre>`;

    const wide = transform(fence("source: all\n"));
    expect(wide).toContain('data-width="wide"');

    // prose is the absence of the attribute — no styling hook, no dead markup
    const prose = transform(fence("source: all\nwidth: prose\n"));
    expect(prose).not.toContain("data-width");
  });
});

// ── rendered behaviour, in a real browser ────────────────────────────────────

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

/**
 * A minimal article page: a prose paragraph and a wide collection, side by side
 * inside the same .article-body, so both directions can be measured at once.
 */
function buildPage({ optIn }) {
  const css = [
    `:root { --article-width: ${PROSE_WIDTH}px; --spacing-md: 1.5rem;${
      optIn ? " --shape-width-wide: 1200px;" : ""
    } }`,
    read("lib/visualizers/article/styles.css"),
  ];
  return `${css.map((c) => `<style>${c}</style>`).join("\n")}
    <body style="margin:0">
      <article class="article-page">
        <div class="article-body">
          <p id="prose">prose</p>
          <div id="wide" data-width="wide">wide</div>
          <div id="plain">plain</div>
        </div>
      </article>
    </body>`;
}

async function widths(optIn, viewport = 1440) {
  const page = await browser.newPage({ viewport: { width: viewport, height: 900 } });
  try {
    await page.setContent(buildPage({ optIn }), { waitUntil: "load" });
    return await page.evaluate(() => ({
      prose: Math.round(document.querySelector("#prose").getBoundingClientRect().width),
      wide: Math.round(document.querySelector("#wide").getBoundingClientRect().width),
      plain: Math.round(document.querySelector("#plain").getBoundingClientRect().width),
      overflows:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
  } finally {
    await page.close();
  }
}

describe("width contract in a real browser", () => {
  it("a theme that has NOT opted in renders wide exactly like prose", async () => {
    if (!browser) return;
    const r = await widths(false);
    expect(r.wide).toBe(r.prose);
    expect(r.overflows).toBe(false);
  });

  it("an opted-in theme makes the wide child wider than the prose column", async () => {
    if (!browser) return;
    const r = await widths(true);
    expect(r.wide).toBeGreaterThan(r.prose);
    expect(r.wide).toBeGreaterThan(PROSE_WIDTH);
  });

  it("does NOT drag prose siblings wider with it", async () => {
    if (!browser) return;
    const r = await widths(true);
    expect(r.prose).toBeLessThanOrEqual(PROSE_WIDTH);
    expect(r.plain).toBe(r.prose);
  });

  it("never causes horizontal overflow, even when wide exceeds the viewport", async () => {
    if (!browser) return;
    for (const vw of [1440, 1000, 800]) {
      const r = await widths(true, vw);
      expect(r.overflows, `overflowed at ${vw}px`).toBe(false);
    }
  });

  it("collapses to prose measure on a phone", async () => {
    if (!browser) return;
    const r = await widths(true, 390);
    expect(r.wide).toBe(r.prose);
    expect(r.overflows).toBe(false);
  });
});

// ── the folder-index frame ───────────────────────────────────────────────────
//
// A folder's index page (is_folder → .article-page--index) is a room's front
// door: its main content is a wide shape. Centring an 820px header above a
// 1200px breakout gives the page TWO left edges — the bug Leon reported on AE's
// /resources/ and /projects/ (2026-11-02): header at x=328, cards at x=106.
//
// On an index page the frame itself is the wide edge, so the header, the prose
// and the wide child all start at one x. Prose keeps its reading measure.

const SPACING = 24; // --spacing-md: 1.5rem in these fixtures
const MEASURE = PROSE_WIDTH - 2 * SPACING;

function buildIndexPage({ index, root }) {
  return `<style>*,*::before,*::after{box-sizing:border-box}</style>
    <style>:root { --article-width: ${PROSE_WIDTH}px; --spacing-md: 1.5rem; ${root} }</style>
    <style>${read("lib/visualizers/article/styles.css")}</style>
    <body style="margin:0">
      <article class="article-page${index ? " article-page--index" : ""}">
        <header class="article-header"><h1 class="article-title" id="title">Title</h1></header>
        <div class="article-body">
          <p id="prose">${"word ".repeat(300)}</p>
          <div id="wide" data-width="wide">wide</div>
        </div>
      </article>
    </body>`;
}

async function geometry({ index, root = "" }, viewport = 1440) {
  const page = await browser.newPage({ viewport: { width: viewport, height: 900 } });
  try {
    await page.setContent(buildIndexPage({ index, root }), { waitUntil: "load" });
    return await page.evaluate(() => {
      const box = (sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { x: Math.round(r.left), w: Math.round(r.width) };
      };
      return {
        header: box(".article-header"),
        title: box("#title"),
        prose: box("#prose"),
        wide: box("#wide"),
        overflows:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
  } finally {
    await page.close();
  }
}

describe("folder-index frame", () => {
  /** The article layout up to and including its opening <article> tag → its class. */
  function articleClass(ctx) {
    const layout = read("lib/visualizers/article/layout.njk").replace(/^---[\s\S]*?---\s*/, "");
    const end = layout.search(/<article class="article-page[^>]*>/);
    const opener = layout.match(/<article class="article-page[^>]*>/)[0];
    const env = new nunjucks.Environment(null, { autoescape: false });
    return env.renderString(layout.slice(0, end) + opener, ctx).match(/class="(article-page[^"]*)"/)[1];
  }

  it("the article layout puts the hook class on folder index pages only", () => {
    expect(articleClass({ is_folder: true })).toBe("article-page article-page--index");
    expect(articleClass({})).toBe("article-page");
  });

  // Tag pages are index pages too (a room by topic) but are not folders, so the
  // frame is also a tri-state shape setting: index_frame on|off (shapes.md #5).
  it("lets any article page opt in or out with index_frame", () => {
    const cls = articleClass;
    expect(cls({ shape_settings: { index_frame: "on" } })).toBe("article-page article-page--index");
    expect(cls({ shape_settings: { index_frame: true } })).toBe("article-page article-page--index");
    expect(cls({ is_folder: true, shape_settings: { index_frame: "Off" } })).toBe("article-page");
    expect(cls({ is_folder: true, shape_settings: { index_frame: false } })).toBe("article-page");
    expect(cls({ is_folder: true, shape_settings: { index_frame: null } })).toBe("article-page article-page--index");
  });

  it("the shared tag page declares itself an index page", () => {
    const tags = read("themes/_base/pages/tags.md");
    const front = tags.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    expect(front).toMatch(/shape_settings:\s*\r?\n\s+index_frame:\s*on/);
  });

  it("a theme with no width opt-in renders an index page exactly like any article", async () => {
    if (!browser) return;
    for (const vw of [1440, 390]) {
      const plain = await geometry({ index: false }, vw);
      const index = await geometry({ index: true }, vw);
      expect(index, `differs at ${vw}px`).toEqual(plain);
    }
  });

  it("an opted-in theme puts header, prose and the wide child on ONE left edge", async () => {
    if (!browser) return;
    const r = await geometry({ index: true, root: "--shape-width-wide: 1200px;" });
    expect(r.title.x).toBe(r.wide.x);
    expect(r.prose.x).toBe(r.wide.x);
    expect(r.wide.w).toBe(1200); // the wide shape still gets the width it asked for
    expect(r.header.w).toBe(r.wide.w); // the header rule spans the whole frame
    expect(r.overflows).toBe(false);
  });

  it("keeps prose and the title at reading measure inside the wide frame", async () => {
    if (!browser) return;
    const r = await geometry({ index: true, root: "--shape-width-wide: 1200px;" });
    expect(r.prose.w).toBe(MEASURE);
    expect(r.title.w).toBe(MEASURE);
  });

  it("does not change reading articles in the same theme (they keep the centred breakout)", async () => {
    if (!browser) return;
    const r = await geometry({ index: false, root: "--shape-width-wide: 1200px;" });
    expect(r.wide.x).toBeLessThan(r.prose.x);
    expect(r.prose.w).toBe(MEASURE);
  });

  it("lets a theme pin the frame to its own gutters (AE: the nav's .maxwidth edge)", async () => {
    if (!browser) return;
    const root =
      "--shape-width-wide: 1200px; --article-index-width: none; --article-index-gutter: 142px;";
    const r = await geometry({ index: true, root }, 1600);
    expect(r.title.x).toBe(142);
    expect(r.wide.x).toBe(142);
    expect(r.wide.w).toBe(1600 - 2 * 142);
    expect(r.prose.w).toBe(MEASURE);
    expect(r.overflows).toBe(false);
  });

  it("never overflows and keeps one edge on a phone", async () => {
    if (!browser) return;
    const r = await geometry({ index: true, root: "--shape-width-wide: 1200px;" }, 390);
    expect(r.title.x).toBe(r.wide.x);
    expect(r.prose.x).toBe(r.wide.x);
    expect(r.overflows).toBe(false);
  });
});

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

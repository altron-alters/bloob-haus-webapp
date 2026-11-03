/**
 * Collection search — the live match count and tag result cards.
 *
 * Leon, 2026-11-03:
 *  1. While typing, say how many results match, in small bold type under the
 *     bar, right away — and without pushing the results down.
 *  2. Tags are their own search results with their own cards, so someone who
 *     searches for a tag can reach its tag page. On by default; a collection
 *     opts out with `search_tags: off`.
 *
 * Design (pure-renderer standard, visualizers.md): tag cards are rendered at
 * build time, hidden, and browser.js only toggles them — it never builds
 * markup. A tag card appears only for tags that pages in THIS collection use,
 * and only when the query (2+ characters) is part of the tag's name.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveTags } from "./resolve.js";
import { renderCollectionInner, renderSearchHtml } from "./renderer.js";
import { matchesTag, formatSearchCount } from "./search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NODES = [
  { id: "/projects/a/", section: "projects", type: "page", title: "Campbell Library", tags: ["library", "all-electric"], image: "/a.jpg" },
  { id: "/projects/b/", section: "projects", type: "page", title: "Laney College", tags: ["Library"], image: "/b.jpg" },
  { id: "/projects/c/", section: "projects", type: "page", title: "Bothin Classroom", tags: ["energy-modeling"] },
  { id: "/resources/x/", section: "resources", type: "page", title: "Cheese", tags: ["thermal-mass"] },
  { id: "/tags/library/", title: "#library", section: "tags", type: "tag", count: 4 },
  { id: "/tags/all-electric/", title: "#all-electric", section: "tags", type: "tag", count: 1 },
  { id: "/tags/energy-modeling/", title: "#energy-modeling", section: "tags", type: "tag" },
  { id: "/tags/thermal-mass/", title: "#thermal-mass", section: "tags", type: "tag", count: 1 },
];
const PAGES = NODES.filter((n) => n.section === "projects");
const TAGS = resolveTags(NODES, PAGES);

// ── resolveTags (pure, data injected) ────────────────────────────────────────

describe("resolveTags", () => {
  it("returns only the tags this collection's pages use", () => {
    expect(TAGS.map((t) => t.href).sort()).toEqual(
      ["/tags/all-electric/", "/tags/energy-modeling/", "/tags/library/"],
    );
  });

  it("matches page tags to tag pages case-insensitively", () => {
    // "Library" on /projects/b/ and "library" on /projects/a/ are one tag
    expect(TAGS.filter((t) => t.slug === "library")).toHaveLength(1);
  });

  it("gives each tag a readable label and the site-wide page count", () => {
    const em = TAGS.find((t) => t.slug === "energy-modeling");
    expect(em).toMatchObject({ label: "energy modeling", href: "/tags/energy-modeling/" });
    expect(TAGS.find((t) => t.slug === "library").count).toBe(4);
    // a tag node without a count falls back to the pages in this collection
    expect(em.count).toBe(1);
  });

  it("orders the most-used tags first", () => {
    expect(TAGS[0].slug).toBe("library");
  });

  it("returns nothing when the graph has no tag nodes", () => {
    expect(resolveTags(PAGES, PAGES)).toEqual([]);
  });
});

// ── pure search helpers ──────────────────────────────────────────────────────

describe("matchesTag", () => {
  it("matches when the query is part of the tag name, hyphens read as spaces", () => {
    expect(matchesTag("energy-modeling", "model")).toBe(true);
    expect(matchesTag("energy-modeling", "energy model")).toBe(true);
    expect(matchesTag("energy-modeling", "Energy-Mod")).toBe(true);
  });

  it("ignores one-character queries (every tag would match)", () => {
    expect(matchesTag("library", "l")).toBe(false);
    expect(matchesTag("library", "  li ")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesTag("library", "school")).toBe(false);
  });
});

describe("formatSearchCount", () => {
  it("counts results, singular and plural", () => {
    expect(formatSearchCount(1, 0)).toBe("1 result");
    expect(formatSearchCount(3, 0)).toBe("3 results");
  });

  it("names tags separately from page results", () => {
    expect(formatSearchCount(2, 1)).toBe("2 results · 1 tag");
    expect(formatSearchCount(2, 3)).toBe("2 results · 3 tags");
    expect(formatSearchCount(0, 1)).toBe("1 tag");
  });

  it("says so when nothing matches", () => {
    expect(formatSearchCount(0, 0)).toBe("No results");
  });
});

// ── rendered markup ──────────────────────────────────────────────────────────

const CARDS = { display: "cards", source: "folder=projects" };

describe("tag result cards", () => {
  it("are rendered hidden, first in the grid, linking to the tag page", () => {
    const html = renderCollectionInner(PAGES, CARDS, { tags: TAGS });
    const tagCard = html.match(/<a class="fp-card fp-card--tag"[^>]*>/g);
    expect(tagCard).toHaveLength(3);
    expect(tagCard[0]).toContain('href="/tags/library/"');
    expect(tagCard[0]).toContain('data-fp-tag="library"');
    expect(tagCard[0]).toMatch(/\shidden(\s|>)/);
    expect(html.indexOf("fp-card--tag")).toBeLessThan(html.indexOf('href="/projects/a/"'));
  });

  it("read as a tag: name, then how many pages it leads to", () => {
    const html = renderCollectionInner(PAGES, CARDS, { tags: TAGS });
    expect(html).toContain('<span class="fp-card__title">#library</span>');
    expect(html).toContain("All 4 pages tagged library");
    expect(html).toContain("1 page tagged all electric");
  });

  it("are off with search_tags: off / false", () => {
    for (const v of ["off", false, "false", "OFF"]) {
      const html = renderCollectionInner(PAGES, { ...CARDS, search_tags: v }, { tags: TAGS });
      expect(html, String(v)).not.toContain("fp-card--tag");
    }
  });

  it("are not rendered when the collection has no search bar", () => {
    const html = renderCollectionInner(PAGES, { ...CARDS, search: "off" }, { tags: TAGS });
    expect(html).not.toContain("fp-card--tag");
  });

  it("are cards-only for now (other display modes are unchanged)", () => {
    const html = renderCollectionInner(PAGES, { display: "list" }, { tags: TAGS });
    expect(html).not.toContain("fp-card--tag");
  });

  it("leave the output byte-identical when there are no tags", () => {
    expect(renderCollectionInner(PAGES, CARDS, { tags: [] })).toBe(renderCollectionInner(PAGES, CARDS));
  });
});

describe("search count element", () => {
  it("sits with the input, announced to screen readers, empty until someone types", () => {
    const html = renderSearchHtml(CARDS);
    expect(html).toMatch(
      /<div class="fp-search"><input type="text" class="fp-search-input"[^>]*><p class="fp-search-count" aria-live="polite"><\/p><\/div>/,
    );
  });

  it("is absent when search is off", () => {
    expect(renderSearchHtml({ search: "off" })).toBe("");
  });
});

// ── behaviour, in a real browser with the real bundled browser.js ────────────

let browser = null;
let bundle = "";

beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
    const esbuild = await import("esbuild");
    const out = await esbuild.build({
      entryPoints: [path.join(__dirname, "browser.js")],
      bundle: true,
      write: false,
      format: "iife",
      logLevel: "silent",
    });
    bundle = out.outputFiles[0].text;
  } catch {
    browser = null; // no chromium — browser tests below self-skip
  }
}, 60_000);

afterAll(async () => {
  if (browser) await browser.close();
});

async function openCollection() {
  const css = fs.readFileSync(path.join(__dirname, "styles.css"), "utf-8");
  const settings = JSON.stringify(CARDS);
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.setContent(
    `<style>${css}</style><body style="margin:0;padding:20px">
       <div class="collection-visualizer" data-collection-settings='${settings}'>${renderCollectionInner(PAGES, CARDS, { tags: TAGS })}</div>
       <script>${bundle}</script>
     </body>`,
    { waitUntil: "load" },
  );
  return page;
}

function snapshot() {
  const visible = (sel) =>
    [...document.querySelectorAll(sel)].filter((el) => el.getBoundingClientRect().height > 0);
  const count = document.querySelector(".fp-search-count");
  const grid = document.querySelector(".fp-cards").getBoundingClientRect();
  const input = document.querySelector(".fp-search-input").getBoundingClientRect();
  const c = count.getBoundingClientRect();
  return {
    tags: visible(".fp-card--tag").map((el) => el.dataset.fpTag),
    pages: visible(".fp-card:not(.fp-card--tag)").length,
    count: count.textContent.trim(),
    countVisible: c.height > 0 && count.textContent.trim() !== "",
    countTop: Math.round(c.top),
    countBottom: Math.round(c.bottom),
    inputBottom: Math.round(input.bottom),
    gridTop: Math.round(grid.top),
  };
}

describe("search in the browser", () => {
  it("shows no tag cards and no count before anyone types", async () => {
    if (!browser) return;
    const page = await openCollection();
    try {
      const s = await page.evaluate(snapshot);
      expect(s.tags).toEqual([]);
      expect(s.pages).toBe(3);
      expect(s.countVisible).toBe(false);
    } finally {
      await page.close();
    }
  });

  it("shows the count and the matching tag card right away, without moving the results", async () => {
    if (!browser) return;
    const page = await openCollection();
    try {
      const before = await page.evaluate(snapshot);
      await page.fill(".fp-search-input", "lib");
      const s = await page.evaluate(snapshot);
      expect(s.tags).toEqual(["library"]);
      // "Campbell Library" by title, "Laney College" by its Library tag
      expect(s.pages).toBe(2);
      expect(s.count).toBe("2 results · 1 tag");
      expect(s.countVisible).toBe(true);
      // under the bar, above the cards, and the cards did not move
      expect(s.countTop).toBeGreaterThanOrEqual(s.inputBottom);
      expect(s.countBottom).toBeLessThanOrEqual(s.gridTop);
      expect(s.gridTop).toBe(before.gridTop);
    } finally {
      await page.close();
    }
  });

  it("says 'No results' when nothing matches, and clears when the box is emptied", async () => {
    if (!browser) return;
    const page = await openCollection();
    try {
      await page.fill(".fp-search-input", "zzzz");
      expect((await page.evaluate(snapshot)).count).toBe("No results");

      await page.fill(".fp-search-input", "");
      const s = await page.evaluate(snapshot);
      expect(s.countVisible).toBe(false);
      expect(s.tags).toEqual([]);
      expect(s.pages).toBe(3);
    } finally {
      await page.close();
    }
  });
});

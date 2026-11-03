/**
 * The shared tag pages (themes/_base/pages/).
 *
 * Leon, 2026-11-03: "when you are on a tag page, there should be a link to all
 * tags". warm-kitchen and marbles-pouch had an "← All tags" link in their own
 * tag templates; the shared one (used by alter-engineers and melt) had neither
 * the link nor an all-tags page to link to. Both now live in _base, so every
 * theme that does not ship its own gets them.
 *
 * The all-tags page is a markdown list of links (crawlable, styled by the
 * article shape), not markup — see the note at the top of tags.md.
 */

import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import MarkdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import { selectBasePages } from "../scripts/assemble-src.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

function split(file) {
  // \r?\n: a Windows checkout has CRLF line endings
  const [, front, body] = read(file).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  return { front, body };
}

function render(body, ctx) {
  const env = new nunjucks.Environment(null, { autoescape: false });
  env.addFilter("url", (s) => s);
  env.addFilter("slugify", (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  return env.renderString(body, ctx);
}

describe("every tag page links to all tags", () => {
  it("has an '← All tags' link to /tags/", () => {
    const { body } = split("themes/_base/pages/tags.md");
    expect(render(body, { tag: "library" })).toContain("[← All tags](/tags/)");
  });
});

describe("the all-tags page", () => {
  const file = "themes/_base/pages/tags-index.md";

  it("lives at /tags/ as an article index page", () => {
    const { front } = split(file);
    expect(front).toMatch(/^permalink: \/tags\/$/m);
    expect(front).toMatch(/^layout: layouts\/article\.njk$/m);
    expect(front).toMatch(/shape_settings:\s*\r?\n\s+index_frame:\s*on/);
    expect(front).toMatch(/^eleventyExcludeFromCollections: true$/m);
  });

  // Rendered through nunjucks AND the site's markdown pipeline (markdown-it +
  // markdown-it-attrs, as eleventy.config.js sets it up), so the assertions are
  // about the HTML a visitor gets.
  function toHtml(ctx) {
    const md = new MarkdownIt({ html: true }).use(markdownItAttrs);
    return md.render(render(split(file).body, ctx));
  }

  const TAGS = {
    collections: {
      tagList: ["energy-modeling", "library"],
      "energy-modeling": [{}],
      library: [{}, {}, {}],
    },
  };

  it("renders one list, marked .tag-list, one item per tag", () => {
    const html = toHtml(TAGS);
    expect(html.match(/<ul\b/g)).toHaveLength(1);
    expect(html).toContain('<ul class="tag-list">');
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).not.toContain("<p>"); // a tight list, not a paragraph per tag
  });

  // Leon, 2026-11-03: the same tag style as on the project profiles. Every tag
  // is a .tag-badge link (the class project pages use); the theme draws it —
  // AE's badge adds the "#" itself, so the text is the bare tag name.
  it("draws each tag as a .tag-badge link to its page, with its page count", () => {
    const html = toHtml(TAGS);
    expect(html).toContain('<a href="/tags/energy-modeling/" class="tag-badge">energy modeling</a> · 1 page');
    expect(html).toContain('<a href="/tags/library/" class="tag-badge">library</a> · 3 pages');
  });

  it("says so when the site has no tags", () => {
    const { body } = split(file);
    expect(render(body, { collections: { tagList: [] } })).toContain("No tags yet.");
  });

  it("is replaced by a theme's own all-tags page (warm-kitchen ships tags-index.njk)", () => {
    const base = ["tags.md", "tags-index.md"];
    expect(selectBasePages(base, ["tags-index.njk", "tags.njk"]).copy).toEqual([]);
    // a theme with neither (alter-engineers, melt) gets both
    expect(selectBasePages(base, ["404.njk"]).copy).toEqual(base);
  });
});

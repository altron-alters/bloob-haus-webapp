/**
 * Article header — optional `logo` and `website` (added 2026-11-03).
 *
 * First user: alter-engineers' architect firm pages (name, logo, link to the
 * firm's website, then the projects that link to it). Generic enough for any
 * profile-like page: a person, a firm, a product. Both are optional and render
 * nothing when absent, so every existing article page is unchanged.
 *
 * `logo` arrives already resolved to a site URL (preprocess-content.js resolves
 * the vault path / [[wiki]] form); `website` must be http(s) — anything else
 * (javascript:, a bare word) is not rendered as a link.
 */

import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LAYOUT = fs
  .readFileSync(path.join(ROOT, "lib/visualizers/article/layout.njk"), "utf-8")
  .replace(/^---[\s\S]*?---\s*/, "");

function render(ctx = {}) {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(path.join(ROOT, "themes/_base")),
    { autoescape: true },
  );
  for (const f of ["dateValue", "dateFormat", "mdinline", "injectPageVars"]) env.addFilter(f, (s) => s ?? "");
  env.addFilter("dateLabel", (_raw, text, fallback) => text || fallback);
  return env.renderString(LAYOUT, {
    title: "Jayson Architecture",
    site: { features: {}, embeds: {} },
    page: { url: "/architects/jayson/" },
    ...ctx,
  });
}

describe("article header — logo", () => {
  it("shows the logo above the name, kept out of the photo lightbox", () => {
    const html = render({ logo: "/media/architect-logos/jayson.svg" });
    expect(html).toContain('<img class="article-logo no-pswp" src="/media/architect-logos/jayson.svg" alt="Jayson Architecture">');
    expect(html.indexOf("article-logo")).toBeLessThan(html.indexOf("article-title"));
  });

  it("renders nothing without one", () => {
    expect(render()).not.toContain("article-logo");
  });
});

describe("article header — website", () => {
  it("links the website by its bare domain, in a new tab", () => {
    const html = render({ website: "https://www.jaysonarchitecture.com/" });
    expect(html).toContain(
      '<p class="article-website"><a href="https://www.jaysonarchitecture.com/" target="_blank" rel="noopener">jaysonarchitecture.com</a></p>',
    );
  });

  it("keeps a path in the label when there is one", () => {
    expect(render({ website: "http://example.com/studio" })).toContain(">example.com/studio</a>");
  });

  it("does not render anything that is not an http(s) address", () => {
    for (const bad of ["javascript:alert(1)", "jaysonarchitecture", "mailto:a@b.c"]) {
      expect(render({ website: bad }), bad).not.toContain("article-website");
    }
  });

  it("renders nothing without one", () => {
    expect(render()).not.toContain("article-website");
  });
});

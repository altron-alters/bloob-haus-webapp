/**
 * Article date pills — shown on reading articles, hidden on folder index pages.
 *
 * An index page is a room's front door, not a dated piece of writing. On AE,
 * /resources/ showed "Written on July 28, 2026" above its share bar while
 * /projects/ showed nothing, only because one _index.md happened to carry a
 * date_created. Leon, 2026-11-03: hide dates on all index pages by default.
 *
 * Both settings follow the shared tri-state convention (shapes.md →
 * "Authoring & resolution conventions" #5): absent → the default for this kind
 * of page, true/on → show, false/off → hide, case-insensitive.
 *
 * Renders the REAL layout (frontmatter stripped) with the real _base partials;
 * only Eleventy-specific filters are stubbed, and the date filters reuse the
 * real parsers from scripts/utils/date-field.js.
 */

import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseDateField, resolveDateLabel } from "../scripts/utils/date-field.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const LAYOUT = fs
  .readFileSync(path.join(ROOT, "lib/visualizers/article/layout.njk"), "utf-8")
  .replace(/^---[\s\S]*?---\s*/, "");

function render(ctx = {}) {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(path.join(ROOT, "themes/_base")),
    { autoescape: false },
  );
  env.addFilter("dateValue", (raw) => parseDateField(raw).value);
  env.addFilter("dateLabel", (raw, text, fallback) =>
    resolveDateLabel(text, parseDateField(raw).label, fallback),
  );
  env.addFilter("dateFormat", (v) => (v ? String(v) : ""));
  env.addFilter("mdinline", (s) => s);
  env.addFilter("injectPageVars", (s) => s);
  return env.renderString(LAYOUT, {
    title: "Resources",
    site: { features: {}, embeds: {} },
    page: { url: "/resources/" },
    date_created: "2026-07-28",
    date_updated: "2026-08-01",
    ...ctx,
  });
}

const created = (html) => /class="article-date"/.test(html);
const updated = (html) => /class="article-date article-date--updated"/.test(html);

describe("article date pills", () => {
  it("shows both pills on a reading article by default", () => {
    const html = render();
    expect(created(html)).toBe(true);
    expect(updated(html)).toBe(true);
  });

  it("hides both pills on a folder index page by default", () => {
    const html = render({ is_folder: true });
    expect(created(html)).toBe(false);
    expect(updated(html)).toBe(false);
  });

  it("lets an index page opt back in, one pill at a time", () => {
    const html = render({ is_folder: true, shape_settings: { show_date_created: true } });
    expect(created(html)).toBe(true);
    expect(updated(html)).toBe(false);

    const html2 = render({ is_folder: true, shape_settings: { show_date_updated: "On" } });
    expect(created(html2)).toBe(false);
    expect(updated(html2)).toBe(true);
  });

  it("still lets a reading article opt out (existing behaviour)", () => {
    const html = render({ shape_settings: { show_date_created: false } });
    expect(created(html)).toBe(false);
    expect(updated(html)).toBe(true);
  });

  it("accepts off/on as well as false/true", () => {
    const html = render({ shape_settings: { show_date_created: "off", show_date_updated: "OFF" } });
    expect(created(html)).toBe(false);
    expect(updated(html)).toBe(false);
  });

  it("treats an empty value as absent, never as an error", () => {
    expect(created(render({ shape_settings: { show_date_created: null } }))).toBe(true);
    expect(created(render({ is_folder: true, shape_settings: { show_date_created: null } }))).toBe(false);
  });
});

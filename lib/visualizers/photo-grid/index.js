/**
 * Photo Grid Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered <section> element,
 * passes it through parser.js → renderer.js, and replaces the section with
 * the final grid HTML.
 *
 * data-vis-raw is injected by scripts/utils/inject-container-raw.js during
 * preprocessing, before markdown-it runs. This keeps parser.js pure and
 * shareable across Eleventy, browser live preview, and Obsidian plugin.
 *
 * Activation:
 *   ::: photo-grid
 *   cols: 3
 *   gap: 8px
 *   padding: 6%
 *   ![[photo1.gif]]
 *   ![[photo2.gif]]
 *   ![[photo3.gif]]
 *   :::
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "photo-grid";

function extractVisRaw(attrs) {
  const match = attrs.match(/data-vis-raw="([^"]+)"/);
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("utf-8");
}

export function transform(html) {
  const sectionPattern =
    /<section class="photo-grid"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);
    if (!raw) {
      console.warn("[photo-grid] No data-vis-raw found — skipping transform.");
      return match;
    }

    const parsed = parse(raw);
    if (parsed.images.length === 0) {
      console.warn("[photo-grid] No images parsed — skipping transform.");
      return match;
    }

    return render(parsed);
  });
}

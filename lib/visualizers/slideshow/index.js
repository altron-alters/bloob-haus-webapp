/**
 * Slideshow Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered <section> element,
 * passes it through parser.js → renderer.js, and replaces the section with
 * an infinitely scrolling CSS marquee of logos/images.
 *
 * Activation:
 *   ::: slideshow duration=30s height=80px id=partners
 *   ![[logo-a.svg]]
 *   ![[logo-b.svg]]
 *   :::
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "slideshow";

function parseSettings(attrs) {
  const match = attrs.match(/data-vis-settings='([^']+)'/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function extractVisRaw(attrs) {
  const match = attrs.match(/data-vis-raw="([^"]+)"/);
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("utf-8");
}

export function transform(html) {
  const sectionPattern =
    /<section class="slideshow"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);

    if (!raw) {
      console.warn("[slideshow] No data-vis-raw found — skipping transform.");
      return match;
    }

    const items = parse(raw);
    if (items.length === 0) {
      console.warn("[slideshow] No images parsed — skipping transform.");
      return match;
    }

    const settings = parseSettings(attrs);
    return render(items, settings);
  });
}

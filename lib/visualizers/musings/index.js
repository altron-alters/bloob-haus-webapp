/**
 * Musings Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered `::: musings` section,
 * passes it through parser.js → renderer.js, and replaces the section with the
 * "voices wall": a filterable mosaic of quotes, a swipeable deck on phones, and an
 * opt-in "Technical musings" fold at the bottom.
 *
 * Activation:
 *   ::: musings title="Musings from our team" limit=6
 *   People first
 *   - "This building should be naturally ventilated..." - Shannon Allison - 2022-01-14
 *
 *   Technical
 *   - "It all comes back to that permaculture mindset..." - Brian Croshal - 2022-11-01
 *   :::
 *
 * Grammar and settings: schema.md. Behavior (filters, show more, deck buttons): browser.js.
 * The older ```quotes-stack fence is a separate shape and is unchanged.
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "musings";

function extractVisRaw(attrs) {
  const match = attrs.match(/data-vis-raw="([^"]+)"/);
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("utf-8");
}

function parseSettings(attrs) {
  const match = attrs.match(/data-vis-settings='([^']+)'/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

export function transform(html) {
  const sectionPattern = /<section class="musings"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);
    if (!raw) {
      console.warn("[musings] No data-vis-raw found, skipping transform.");
      return match;
    }
    const data = parse(raw);
    if (!data.categories.length) {
      console.warn("[musings] No musings parsed, skipping transform.");
      return match;
    }
    return render(data, parseSettings(attrs));
  });
}

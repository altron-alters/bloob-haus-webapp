/**
 * Quotes Stack Visualizer — Build-time Transform
 *
 * Replaces ```quotes-stack ... ``` code fences with a dual-layout quote card section:
 * a simple mobile stack and a vertical Swiper carousel for desktop.
 *
 * Input YAML (flat array — all cards visible):
 *   - quote: "This building should be..."
 *     name: Shannon Allison
 *     date: 01/14/2022
 *     color: red
 *
 * Input YAML (object with limit — extras hidden until MORE MUSINGS is clicked):
 *   limit: 3
 *   quotes:
 *     - quote: "..."
 *       name: ...
 *       date: ...
 *       color: red
 *
 * Runtime interactions (cursor, show-more toggle) are handled by theme.min.js.
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "quotes-stack";

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function transform(html) {
  const codeBlockPattern =
    /<pre><code class="language-quotes-stack">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (match, rawYaml) => {
    const decoded = decodeHtmlEntities(rawYaml).trim();

    if (!decoded) {
      console.warn("[quotes-stack] Empty code fence — skipping transform.");
      return match;
    }

    const parsed = parse(decoded);

    if (parsed.items.length === 0) {
      console.warn("[quotes-stack] No items parsed — skipping transform.");
      return match;
    }

    return render(parsed);
  });
}

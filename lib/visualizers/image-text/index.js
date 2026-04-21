/**
 * Image-Text Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) to extract the image path,
 * strips the image from the rendered inner HTML to get the text column,
 * then renders a two-column image + text layout.
 *
 * The text column uses already-rendered HTML (from markdown-it via Eleventy)
 * so headings, bold, and links are fully rendered without needing a markdown
 * parser in this visualizer.
 *
 * Activation:
 *   ::: image-text image=left bg=orange id=solutions
 *   ![[photo.jpg]]
 *
 *   ## Section Heading
 *   Paragraph text...
 *   [CTA](#anchor)
 *   :::
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "image-text";

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

function stripFirstImage(innerHtml) {
  // Try stripping a <picture>...</picture> block first (post-optimization)
  const withoutPicture = innerHtml.replace(/<picture[\s\S]*?<\/picture>/i, "");
  if (withoutPicture !== innerHtml) return withoutPicture.trim();

  // Fall back to stripping a bare <img> with a /media/ src
  return innerHtml
    .replace(/<img[^>]+src="\/media\/[^"]*"[^>]*\/?>/i, "")
    .trim();
}

export function transform(html) {
  const sectionPattern =
    /<section class="image-text"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs, innerHtml) => {
    const raw = extractVisRaw(attrs);

    if (!raw) {
      console.warn("[image-text] No data-vis-raw found — skipping transform.");
      return match;
    }

    const { src: imageSrc, alt: imageAlt } = parse(raw);
    const textHtml = stripFirstImage(innerHtml);
    const settings = parseSettings(attrs);

    return render({ imageSrc, imageAlt, textHtml }, settings);
  });
}

/**
 * slideshow renderer — pure function
 *
 * Input:  array of { src, alt } from parser.parse()
 *         settings: { id, duration, height, title, bg, color }
 *
 * Output: HTML string — an infinitely scrolling CSS marquee section.
 *
 * Items are duplicated so the CSS translateX(-50%) animation loops
 * seamlessly without a visible jump.
 *
 * CSS variables injected on .slideshow__track:
 *   --slideshow-duration  → animation-duration (default 30s)
 *   --slideshow-height    → img height (default 60px)
 *
 * bg= follows the shared color pair contract (see _utils/bg-color.js).
 * title= is optional — omit for a logo-only strip.
 *
 * Pure — no DOM, no file system, no side effects.
 */

import { resolveBg } from "../_utils/bg-color.js";

/**
 * @param {{ src: string, alt: string }[]} items
 * @param {{ id?: string, duration?: string, height?: string, title?: string, bg?: string, color?: string }} settings
 * @returns {string} HTML string
 */
export function render(items, settings = {}) {
  const id = settings.id || "slideshow";
  const duration = settings.duration || "30s";
  const height = settings.height || "60px";
  const title = settings.title || "";
  const { extraClass, style } = resolveBg(settings);
  const styleAttr = style ? ` style="${style}"` : "";

  const direction = settings.direction || "forward";
  const reverseClass =
    direction === "reverse" ? " slideshow__track--reverse" : "";

  const itemHtml = ({ src, alt }) =>
    `<div class="slideshow__item"><img src="${src}" alt="${alt}" class="slideshow__logo" loading="lazy"></div>`;

  // Duplicate items for seamless infinite loop (translateX(-50%) = one full set width)
  const allItems = [...items, ...items].map(itemHtml).join("\n        ");

  // Title is inside maxwidth; tracks are outside it so logos span full viewport width
  const titleHtml = title
    ? `<div class="slideshow__header maxwidth">
    <p class="label slideshow__title">${title}</p>
  </div>`
    : "";

  const trackStyle = `style="--slideshow-duration:${duration};--slideshow-height:${height}"`;

  return `<section class="slideshow${extraClass}" id="${id}"${styleAttr}>
  ${titleHtml}<div class="slideshow__track${reverseClass}" ${trackStyle}>
    <div class="slideshow__items">
      ${allItems}
    </div>
  </div>
</section>`;
}

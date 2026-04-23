/**
 * image-text renderer — pure function
 *
 * Outputs HTML using the original .image-text class structure so that
 * theme.min.css rules (offset, layout, background) apply automatically.
 *
 * theme.min.css handles:
 *   - background-color (#e0643d orange)
 *   - margin-bottom: -2.5rem + top: -Xrem offset (pulls section into the one above)
 *   - flex layout and gap between image and text columns
 *
 * main.css / image-text/styles.css add:
 *   - Label style for h2:first-child (OUR SOLUTIONS)
 *   - Button style for standalone <p><a> (CONTACT US)
 *
 * image=left (default) puts image first in DOM.
 * image=right swaps columns via CSS (direction: rtl on wrapper).
 * bg= follows shared color pair contract — overrides theme.min.css background.
 *
 * Pure — no DOM, no file system, no side effects.
 */

import { resolveBg } from "../_utils/bg-color.js";

/**
 * @param {{ imageSrc: string, imageAlt: string, textHtml: string }} data
 * @param {{ id?: string, image?: string, bg?: string, color?: string }} settings
 * @returns {string} HTML string
 */
export function render({ imageSrc, imageAlt, textHtml }, settings = {}) {
  const id = settings.id || "image-text";
  const imagePosition = settings.image || "left";
  const { extraClass, style } = resolveBg(settings, "featured");
  const styleAttr = style ? ` style="${style}"` : "";

  const imageEl = imageSrc
    ? `<div class="image-text__image-container">
        <img class="image-text__image" src="${imageSrc}" alt="${imageAlt || ""}">
      </div>`
    : "";

  const textEl = `<div class="image-text__text-container">
      ${textHtml}
    </div>`;

  const cols =
    imagePosition === "right"
      ? `${textEl}\n      ${imageEl}`
      : `${imageEl}\n      ${textEl}`;

  return `<section class="image-text image-text--image-${imagePosition}${extraClass}" id="${id}"${styleAttr}>
  <div class="image-text__wrapper">
    ${cols}
  </div>
</section>`;
}

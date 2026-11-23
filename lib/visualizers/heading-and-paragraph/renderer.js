/**
 * heading-and-paragraph renderer — pure function
 *
 * Input:  { heading, paragraph } from parser.parse()
 *         + settings object { id, bg, color }
 * Output: HTML string matching the .heading-and-paragraph layout from theme.min.css
 *
 * bg / color parameters follow the shared color pair contract (see bg-color.js):
 *   bg=green          → named token: .bg-green class, theme CSS vars control colors
 *   bg=white          → named token: .bg-white class
 *   bg=muted          → named token: .bg-muted class
 *   bg=dark           → named token: .bg-dark class
 *   bg=accent         → named token: .bg-accent class
 *   bg=#1a1a1a        → hex bg, inline style
 *   bg=#1a1a1a color=#ffffff → full custom pair, inline style with --pair-title/--pair-text vars
 * If omitted, theme.min.css default (green bg, purple text) applies.
 *
 * Pure — no DOM, no file system, no side effects.
 */

import { resolveBg } from "../_utils/bg-color.js";

/**
 * @param {{ heading: string, paragraph: string }} data
 * @param {{ id?: string, bg?: string, color?: string }} settings
 * @returns {string} HTML string
 */
export function render(data, settings = {}) {
  const { heading, paragraph, quote } = data;
  const id = settings.id || "about-us";
  const { extraClass, style } = resolveBg(settings, "light");
  const styleAttr = style ? ` style="${style}"` : "";

  const headingHtml = `<h1 class="heading-and-paragraph__heading">${heading}</h1>`;
  // A "> quote" line in the block: a callout under the heading, both in the left column.
  // Without one the markup is exactly as before.
  const lead = quote
    ? `<div class="heading-and-paragraph__lead">
            ${headingHtml}
            <blockquote class="heading-and-paragraph__quote"><p>${quote}</p></blockquote>
        </div>`
    : headingHtml;
  const quoteClass = quote ? " heading-and-paragraph--with-quote" : "";

  return `<section class="heading-and-paragraph${quoteClass}${extraClass}" id="${id}"${styleAttr}>
    <div class="heading-and-paragraph__wrapper">
        ${lead}
        <p class="heading-and-paragraph__paragraph">${paragraph}</p>
    </div>
</section>`;
}

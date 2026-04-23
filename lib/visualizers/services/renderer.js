/**
 * services renderer — pure function
 *
 * Input:  { heading, description, items } from parser.parse()
 *         + settings object { id, bg, color }
 * Output: HTML string matching the .services layout from theme.min.css
 *
 * bg / color parameters follow the shared color pair contract (see bg-color.js):
 *   bg=white          → named token: .bg-white class (theme default for this section)
 *   bg=green          → named token: .bg-green class
 *   bg=muted          → named token: .bg-muted class
 *   bg=dark           → named token: .bg-dark class
 *   bg=accent         → named token: .bg-accent class
 *   bg=#1a1a1a        → hex bg, inline style
 *   bg=#1a1a1a color=#ffffff → full custom pair, inline style with --pair-title/--pair-text vars
 *
 * Pure — no DOM, no file system, no side effects.
 */

import { resolveBg } from "../_utils/bg-color.js";

/**
 * @param {{ heading: string, description: string, items: string[] }} data
 * @param {{ id?: string, bg?: string, color?: string }} settings
 * @returns {string} HTML string
 */
export function render(data, settings = {}) {
  const { heading, description, items } = data;
  const id = settings.id || "services";
  const { extraClass, style } = resolveBg(settings);
  const styleAttr = style ? ` style="${style}"` : "";

  const listItems = items
    .map((item) => `                <li><h3>${item}</h3></li>`)
    .join("\n");

  return `<section class="services${extraClass}" id="${id}"${styleAttr}>
    <div class="services__wrapper">
        <div class="services__title-text">
            <h1 class="services__title">${heading}</h1>
            <p class="services__text">${description}</p>
        </div>
        <div class="services__list">
            <ul>
${listItems}
            </ul>
        </div>
    </div>
</section>`;
}

/**
 * heading-and-paragraph renderer — pure function
 *
 * Input:  { heading, paragraph } from parser.parse()
 *         + settings object { id, bg }
 * Output: HTML string matching the .heading-and-paragraph layout from theme.min.css
 *
 * bg parameter: adds a .bg-* class to override the default green background.
 * Available values match the site's bg token set (defined in main.css):
 *   bg=green   → #b6fad1 bg, #5b5dd3 text  (theme default for this section)
 *   bg=white   → #ffffff bg, dark text
 *   bg=muted   → #f5f5f5 bg, dark text
 *   bg=dark    → #1a1a1a bg, white text
 *   bg=accent  → #5b5dd3 bg, white text
 * If omitted, theme.min.css default (green bg, purple text) applies.
 *
 * Pure — no DOM, no file system, no side effects.
 */

/**
 * @param {{ heading: string, paragraph: string }} data
 * @param {{ id?: string, bg?: string }} settings
 * @returns {string} HTML string
 */
export function render(data, settings = {}) {
  const { heading, paragraph } = data;
  const id = settings.id || "about-us";
  const bgClass = settings.bg ? ` bg-${settings.bg}` : "";

  return `<section class="heading-and-paragraph${bgClass}" id="${id}">
    <div class="heading-and-paragraph__wrapper maxwidth">
        <h1 class="h1-medium heading-and-paragraph__heading">${heading}</h1>
        <p class="heading-and-paragraph__paragraph">${paragraph}</p>
    </div>
</section>`;
}

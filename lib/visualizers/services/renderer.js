/**
 * services renderer — pure function
 *
 * Input:  { heading, description, items } from parser.parse()
 *         + settings object { id, bg }
 * Output: HTML string matching the .services layout from theme.min.css
 *
 * bg parameter: adds a .bg-* class to override the default white background.
 * Available values match the site's bg token set (defined in main.css):
 *   bg=white   → #ffffff bg, purple text  (theme default for this section)
 *   bg=green   → #b6fad1 bg, purple text
 *   bg=muted   → #f5f5f5 bg, dark text
 *   bg=dark    → #1a1a1a bg, white text
 *   bg=accent  → #5b5dd3 bg, white text
 *
 * Pure — no DOM, no file system, no side effects.
 */

/**
 * @param {{ heading: string, description: string, items: string[] }} data
 * @param {{ id?: string, bg?: string }} settings
 * @returns {string} HTML string
 */
export function render(data, settings = {}) {
  const { heading, description, items } = data;
  const id = settings.id || "services";
  const bgClass = settings.bg ? ` bg-${settings.bg}` : "";

  const listItems = items
    .map((item) => `                <li><h3>${item}</h3></li>`)
    .join("\n");

  return `<section class="services${bgClass}" id="${id}">
    <div class="services__wrapper maxwidth">
        <div class="services__title-text">
            <h1 class="h1-medium services__title">${heading}</h1>
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

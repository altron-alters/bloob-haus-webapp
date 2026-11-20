/**
 * card-preview renderer — pure function
 *
 * Input:  array of enriched { title, url, image, subtitle?, location?, building_type? }
 *         settings: { limit, show_more, style, more_link, more_text }
 *
 * Output: HTML string. Keeps the .projects / .projects__container class structure in
 * every style so theme.min.js (MORE PROJECTS toggle) and award-badge (seals under the
 * title) work unchanged.
 *
 * style:
 *   (none) / zigzag — the original WordPress layout: big image + title, alternating sides
 *   steps           — two columns of cards (photo on top, text under), the right column
 *                     set lower so the cards descend left, right, left like stairs
 *   grid            — 2-up cards, image on top, title + one info line under it
 *   list            — compact rows: thumbnail left, title / subtitle / info right, ruled
 *   mosaic          — photo tiles with the title on a purple band; first tile spans wide
 *
 * Cards beyond `limit` get classes "no-visible hidden" so theme.min.js can toggle
 * them via the .projects__more-projects button click handler.
 *
 * Pure — no DOM, no file system, no side effects.
 */

const STYLES = new Set(["zigzag", "steps", "grid", "list", "mosaic"]);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "Theater · San Francisco, CA" */
function infoLine(item) {
  return [item.building_type, item.location].filter(Boolean).map(esc).join(" · ");
}

/**
 * @param {{ title: string, url: string, image?: string, subtitle?: string, location?: string, building_type?: string }[]} items
 * @param {{ limit?: number, show_more?: boolean, style?: string }} settings
 * @returns {string} HTML string
 */
export function render(items, settings = {}) {
  const limit = settings.limit ? parseInt(settings.limit, 10) : Infinity;
  const showMore = settings.show_more === true || settings.show_more === "true";
  const style = STYLES.has(settings.style) ? settings.style : "zigzag";
  const rich = style !== "zigzag" && style !== "steps";

  // more_link=/projects/ — a real link under the cards ("see all") instead of the
  // MORE PROJECTS toggle: only the first `limit` cards are rendered.
  const moreLink = settings.more_link ? String(settings.more_link) : "";
  const shown = moreLink && isFinite(limit) ? items.slice(0, limit) : items;

  const cards = shown
    .map((item, i) => {
      const isHidden = isFinite(limit) && i >= limit;
      const hiddenClass = isHidden ? " no-visible hidden" : "";

      const imageHtml = item.image
        ? `<div class="projects__image">
                        <img src="${item.image}" alt="${esc(item.title)}" loading="lazy">
                    </div>`
        : `<div class="projects__image projects__image--empty"></div>`;

      const info = rich ? infoLine(item) : "";
      // Subtitle under the title: list and the default zig-zag (grid/mosaic stay compact).
      const subtitle = (style === "list" || style === "zigzag" || style === "steps") && item.subtitle
        ? `<p class="projects__subtitle">${esc(item.subtitle)}</p>`
        : "";

      return `            <a class="projects__container${hiddenClass}" href="${item.url}">
                <div class="projects__inner-container">
                    ${item.image || rich ? imageHtml : ""}
                    <div class="projects__content">
                        ${info ? `<p class="projects__info">${info}</p>` : ""}
                        <h2 class="projects__title">${esc(item.title)}</h2>
                        ${subtitle}
                        <div class="projects__read-more button-1">VIEW PROJECT</div>
                    </div>
                </div>
            </a>`;
    })
    .join("\n");

  const allLink = moreLink
    ? `        <div class="projects__all-projects">
            <a class="button-1" href="${esc(moreLink)}">${esc(settings.more_text || "SEE ALL PROJECTS")} <span aria-hidden="true">→</span></a>
        </div>`
    : "";

  const moreButton =
    !moreLink && showMore && isFinite(limit) && items.length > limit
      ? `        <div class="projects__more-projects">
            <a class="button-1">MORE PROJECTS </a>
        </div>`
      : "";

  const styleClass = style === "zigzag" ? "" : ` projects--${style}`;

  return `<section class="projects${styleClass}" id="projects">
    <div class="projects__wrapper maxwidth">
        <div class="projects__top-content">
${cards}
        </div>
${moreButton}${allLink}
    </div>
</section>`;
}

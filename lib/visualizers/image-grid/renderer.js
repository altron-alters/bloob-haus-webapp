/**
 * image-grid renderer — pure function
 *
 * Input:  array of { src, alt, name, role } from parser.parse()
 *         + settings object { title, id }
 * Output: HTML string matching .team / .team__member layout from theme.min.css
 *
 * Pure — no DOM, no file system, no side effects.
 */

/**
 * @param {{ src: string, alt: string, name: string, role: string }[]} members
 * @param {{ title?: string, id?: string }} settings
 * @returns {string} HTML string
 */
/** Minimal inline markdown for table cells: **bold**, *italic*. Everything else is escaped. */
export function inlineMd(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

export function render(members, settings = {}) {
  const title = settings.title || "Our Team";
  const sectionId = settings.id || "team";

  const memberCards = members
    .map(
      ({ src, alt, name, role }) => `
        <div class="team__member">
            <img decoding="async" class="team__member-image" src="${src}" alt="${alt}">
            <div class="team-member-info">
                <h3 class="team__member-name">${inlineMd(name)}</h3>
                <p class="team__member-position">${inlineMd(role)}</p>
            </div>
        </div>`,
    )
    .join("\n");

  return `<section class="team" id="${sectionId}">
    <div class="team__wrapper maxwidth">
        <h1 class="team__title">${title}</h1>
        <div class="team__members">
${memberCards}
        </div>
    </div>
</section>`;
}

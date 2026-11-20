/**
 * testimonials renderer — pure function
 *
 * Input:  array of { quote, name, role } from parser.parse()
 * Output: HTML string matching .testimonials layout from theme.min.css
 *
 * Outputs a Swiper carousel structure. theme.min.js initializes the
 * Swiper instance at runtime using `new Swiper("#testimonials", ...)`.
 * Navigation buttons (.testimonials__prev-button / __next-button) are
 * included but only visible when there are multiple slides.
 *
 * Pure — no DOM, no file system, no side effects.
 */

import { resolveBg } from "../_utils/bg-color.js";

/**
 * Parse a slide-time value like "3s", "500ms", or "3000" → milliseconds.
 * Returns null if the value is missing or unparseable.
 */
function parseSlideTime(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d+(?:\.\d+)?)(s|ms)?$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2] || "ms";
  return unit === "s" ? Math.round(num * 1000) : Math.round(num);
}

/**
 * @param {{ quote: string, name: string, role: string }[]} testimonials
 * @param {{ "slide-time"?: string }} settings
 * @returns {string} HTML string
 */
export function render(testimonials, settings = {}) {
  const slideMs = parseSlideTime(settings.time);
  // title= on the fence (default "Testimonials"); a real section heading, sized by the
  // theme's --section-title-size token like the page's other section titles.
  const title = String(settings.title || "Testimonials").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const slides = testimonials
    .map(
      ({ quote, name, role }) => `
                <div class="swiper-slide testimonials__content">
                    <h2 class="testimonials__testimonial">${quote}</h2>
                    <h3 class="testimonials__name">${name ? `—  ${name}${role ? ", " + role : ""}` : ""}</h3>
                </div>`,
    )
    .join("\n");

  // Default bg=light; author can override with bg= on the ::: fence
  const { extraClass, style } = resolveBg(settings, "light");
  const styleAttr = style ? ` style="${style}"` : "";

  return `<section class="testimonials${extraClass}"${styleAttr}>
    <div class="testimonials__wrapper">
        <div class="testimonials__top-section">
            <h1 class="section-title testimonials__title">${title}</h1>
            <div class="testimonials__buttons">
                <div class="testimonials__prev-button" role="button" aria-label="Previous slide"></div>
                <div class="testimonials__next-button" role="button" aria-label="Next slide"></div>
            </div>
        </div>
        <div class="swiper testimonials__container" id="testimonials"${slideMs ? ` data-slide-time="${slideMs}"` : ""}>
            <div class="swiper-wrapper">
${slides}
            </div>
        </div>
    </div>
</section>`;
}

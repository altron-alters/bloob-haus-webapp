/**
 * photo-grid renderer — pure function
 *
 * Input:  { settings, images } from parser.parse()
 * Output: HTML string for a responsive image/GIF grid
 *
 * Two layout modes:
 *   Uniform (cols: N) — single CSS grid, images auto-flow into rows of N columns.
 *   Explicit (layout: 1,3,1) — flex column of row divs, each with its own column count.
 *
 * CSS custom properties are injected inline; styles.css reads them:
 *   --pg-gap      gap between images
 *   --pg-padding  horizontal inset from prose column
 *   --pg-ratio    aspect-ratio for crop mode
 *   --pg-cols     column count (uniform mode)
 *   --row-cols    column count per row (layout mode)
 *
 * Images are wrapped in <a class="pswp-gallery__item"> so PhotoSwipe picks them
 * up automatically when image_zoom is enabled in the theme (no extra config needed).
 */

function escape(str) {
  return str.replace(/"/g, "&quot;");
}

function itemHtml(img, { convertGifToMp4 } = {}) {
  const isGif = /\.gif$/i.test(img.src);

  if (isGif && convertGifToMp4) {
    const mp4Src = escape(img.src.replace(/\.gif$/i, ".mp4"));
    // data-pswp-type="video" → PhotoSwipe renders a video slide when clicked (while playing)
    return `<a class="photo-grid__item photo-grid__item--video pswp-gallery__item" href="${mp4Src}" data-pswp-type="video"><video autoplay loop muted playsinline><source src="${mp4Src}" type="video/mp4"></video><div class="photo-grid__play-overlay" aria-label="Play animation">&#9654;</div></a>`;
  }

  const src = escape(img.src);
  const alt = escape(img.alt);
  return `<a class="photo-grid__item pswp-gallery__item" href="${src}"><img src="${src}" alt="${alt}" loading="lazy"></a>`;
}

/**
 * @param {{ settings: object, images: {src: string, alt: string}[] }} parsed
 * @param {{ siteConfig?: object }} context
 * @returns {string} HTML string
 */
export function render({ settings, images }, { siteConfig } = {}) {
  const convertGifToMp4 = siteConfig?.media?.convert_gif_to_mp4 !== false;
  const {
    cols = 3,
    layout,
    gap = "8px",
    padding = "6%",
    ratio,
  } = settings;

  const hasRatio = Boolean(ratio);
  const ratioValue = ratio === "crop" ? "4/3" : ratio;

  const cssVars = [
    `--pg-gap: ${gap}`,
    `--pg-padding: ${padding}`,
    hasRatio ? `--pg-ratio: ${ratioValue}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  const classes = [
    "photo-grid",
    layout ? "photo-grid--rows" : "",
    hasRatio ? "photo-grid--ratio" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (layout) {
    const rowCounts = String(layout)
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => n > 0);

    let cursor = 0;
    const rows = rowCounts
      .map((count) => {
        const rowImages = images.slice(cursor, cursor + count);
        cursor += count;
        const items = rowImages.map((img) => itemHtml(img, { convertGifToMp4 })).join("\n    ");
        return `  <div class="photo-grid__row" style="--row-cols: ${count};">\n    ${items}\n  </div>`;
      })
      .join("\n");

    return `<div class="${classes}" style="${cssVars}">\n${rows}\n</div>`;
  }

  // Uniform mode: all images in one CSS grid, auto-flow
  const uniformVars = `${cssVars}; --pg-cols: ${cols}`;
  const items = images.map((img) => itemHtml(img, { convertGifToMp4 })).join("\n  ");
  return `<div class="${classes}" style="${uniformVars}">\n  ${items}\n</div>`;
}

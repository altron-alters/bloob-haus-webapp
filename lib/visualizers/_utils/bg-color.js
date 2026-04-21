/**
 * bg-color.js — shared color pair resolver for visualizer renderers
 *
 * Translates the bg= and color= fence parameters into either:
 *   - A CSS class name (for named tokens → styled by theme's main.css .bg-* rules)
 *   - An inline style string (for custom hex values)
 *
 * Named tokens (bg=green, bg=dark, etc.) map to .bg-* CSS classes defined in
 * each theme's main.css. The classes set four custom properties:
 *   --pair-bg     → section background
 *   --pair-title  → h1–h4 heading color
 *   --pair-text   → body text / paragraph color
 *   --pair-label  → small label color (.label class); teal on dark, purple on light
 * which are then applied by the shared apply rules in main.css.
 *
 * Custom hex (bg=#1a1a1a, color=#ffffff) produces inline styles that set the
 * same --pair-title and --pair-text CSS variables so heading/paragraph color
 * cascade works identically whether a named token or hex was used.
 *
 * Usage in a renderer:
 *
 *   import { resolveBg } from "../_utils/bg-color.js";
 *
 *   const { extraClass, style } = resolveBg(settings);
 *   const styleAttr = style ? ` style="${style}"` : "";
 *   return `<section class="my-section${extraClass}"${styleAttr}>...`;
 *
 * Fence syntax examples:
 *   ::: heading-and-paragraph bg=green        → named token, CSS class
 *   ::: heading-and-paragraph bg=dark         → named token, CSS class
 *   ::: heading-and-paragraph bg=#1a1a1a      → hex bg only (text defaults)
 *   ::: heading-and-paragraph bg=#1a1a1a color=#ffffff   → full custom pair
 */

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

/**
 * @param {{ bg?: string, color?: string }} settings  From the ::: fence parser
 * @returns {{ extraClass: string, style: string }}
 *   extraClass — space-prefixed class string to append (e.g. " bg-dark"), or ""
 *   style      — inline style string (e.g. "background:#1a1a1a;color:#fff"), or ""
 */
export function resolveBg(settings) {
  const bg = (settings.bg || "").trim();
  const color = (settings.color || "").trim();

  const isHex = (v) => HEX_RE.test(v);

  if (isHex(bg) || isHex(color)) {
    // Custom hex — emit inline style and set --pair-* vars for heading cascade
    const parts = [];
    if (isHex(bg)) parts.push(`background:${bg}`);
    if (isHex(color)) {
      parts.push(`color:${color}`);
      parts.push(`--pair-title:${color}`);
      parts.push(`--pair-text:${color}`);
    }
    return { extraClass: "", style: parts.join(";") };
  }

  // Named token — CSS class handles everything via theme's main.css .bg-* rules
  return { extraClass: bg ? ` bg-${bg}` : "", style: "" };
}

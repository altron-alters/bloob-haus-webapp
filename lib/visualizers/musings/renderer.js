/**
 * musings renderer — pure function
 *
 * Input:  { categories } from parser.parse(), plus the ::: opener settings.
 * Output: the complete "voices wall" section as an HTML string.
 *
 *   - Every musing is real markup at build time (crawlable, readable without JS).
 *   - Categories become filter buttons. They ship with `hidden` because they only do
 *     something once browser.js runs; browser.js reveals them.
 *   - `limit=N` is written as data-limit; browser.js folds the rest behind "More musings".
 *     Without JS every card stays visible.
 *   - Technical categories (name contains "technical", or listed in technical=) go in a
 *     native <details> at the bottom: opt-in for curious readers, no JS needed.
 *   - Narrow screens: CSS turns the grid into a swipeable deck; browser.js adds the
 *     previous / next buttons and the "3 / 12" counter.
 *
 * Pure — no DOM, no file system, no side effects.
 */

import { resolveBg } from "../_utils/bg-color.js";

const TONES = ["accent", "mint", "paper", "warm", "ink"];
const WIDE_AT = 150; // characters; longer quotes span two columns on desktop
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(s) {
  return String(s || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
}

/** "2022-01-14" or "01/14/2022" → "Jan 2022"; "2022" stays; anything else is shown as written. */
export function formatDate(raw) {
  const s = String(raw || "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${MONTHS[+m[2] - 1]} ${m[1]}`;
  m = s.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${MONTHS[+m[1] - 1]} ${m[2]}`;
  return s;
}

/** A category is technical when technical= lists it, or (by default) when its name says so. */
export function isTechnical(name, settings = {}) {
  if (settings.technical) {
    const list = String(settings.technical).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    return list.includes(String(name).trim().toLowerCase());
  }
  return /technical|nerdy/i.test(String(name));
}

function card(item, category, index, { wide = true } = {}) {
  const tone = TONES[index % TONES.length];
  const isWide = wide && item.quote.length > WIDE_AT;
  const date = formatDate(item.date);
  const who = item.name ? `<span class="musings-wall__name">${esc(item.name)}</span>` : "";
  const when = date ? `<span class="musings-wall__date">${item.name ? " · " : ""}${esc(date)}</span>` : "";
  const byline = who || when ? `<span class="musings-wall__byline">${who}${when}</span>` : "";
  const tag = category ? `<span class="musings-wall__tag">${esc(category)}</span>` : "";
  return `<figure class="musings-wall__card musings-wall__card--${tone}${isWide ? " musings-wall__card--wide" : ""}" data-category="${slug(category)}">
        <blockquote class="musings-wall__quote"><p>“${esc(item.quote)}”</p></blockquote>
        <figcaption class="musings-wall__caption">${byline}${tag}</figcaption>
      </figure>`;
}

/**
 * @param {{ categories: { name: string, items: { quote: string, name: string, date: string }[] }[] }} data
 * @param {{ title?: string, intro?: string, limit?: string|number, technical?: string,
 *           technical_label?: string, more_label?: string, bg?: string, color?: string }} settings
 * @returns {string}
 */
export function render({ categories = [] } = {}, settings = {}) {
  const main = categories.filter((c) => !isTechnical(c.name, settings));
  const tech = categories.filter((c) => isTechnical(c.name, settings));
  if (!main.length && !tech.length) return "";

  const title = settings.title ?? "Musings from our team";
  const intro = settings.intro ? `<p class="musings-wall__intro">${esc(settings.intro)}</p>` : "";
  const limit = Math.max(0, parseInt(settings.limit, 10) || 0);
  const named = main.filter((c) => c.name);

  let i = 0;
  const mainCards = main.flatMap((c) => c.items.map((it) => card(it, c.name, i++))).join("\n      ");
  const total = i;

  const filters =
    named.length > 1
      ? `<div class="musings-wall__filters" role="group" aria-label="Filter musings by theme" hidden>
        <button type="button" class="musings-wall__filter" data-filter="all" aria-pressed="true">All</button>
        ${named.map((c) => `<button type="button" class="musings-wall__filter" data-filter="${slug(c.name)}" aria-pressed="false">${esc(c.name)}</button>`).join("\n        ")}
      </div>`
      : "";

  const grid = total
    ? `<div class="musings-wall__grid" data-limit="${limit}">
      ${mainCards}
    </div>
    <div class="musings-wall__deck-nav" hidden>
      <button type="button" class="musings-wall__deck-btn" data-dir="-1" aria-label="Previous musing">←</button>
      <span class="musings-wall__count" aria-live="polite"></span>
      <button type="button" class="musings-wall__deck-btn" data-dir="1" aria-label="Next musing">→</button>
    </div>
    ${limit && total > limit ? `<button type="button" class="musings-wall__more" hidden>${esc(settings.more_label || "More musings")}</button>` : ""}`
    : "";

  let t = 0;
  const techCount = tech.reduce((n, c) => n + c.items.length, 0);
  const technical = techCount
    ? `<details class="musings-wall__technical">
      <summary class="musings-wall__technical-toggle">${esc(settings.technical_label || "Technical musings")} <span class="musings-wall__technical-count">(${techCount})</span></summary>
      <div class="musings-wall__grid musings-wall__grid--technical">
      ${tech.flatMap((c) => c.items.map((it) => card(it, tech.length > 1 ? c.name : "", t++, { wide: false }))).join("\n      ")}
      </div>
    </details>`
    : "";

  const { extraClass, style } = resolveBg(settings);
  const styleAttr = style ? ` style="${style}"` : "";

  return `<section class="musings-wall${extraClass}"${styleAttr}>
  <div class="musings-wall__inner">
    <header class="musings-wall__head">
      ${title ? `<h2 class="section-title musings-wall__title">${esc(title)}</h2>` : ""}
      ${intro}
      ${filters}
    </header>
    ${grid}
    ${technical}
  </div>
</section>`;
}

/**
 * Fridge Magnets Visualizer — Build-time Transform
 *
 * Hybrid visualizer: this module handles the build-time part.
 * The runtime part (interactive magnet board) lives in browser.js.
 *
 * Finds ```fridge-magnets ... ``` code fences in rendered HTML and replaces
 * them with a container div that browser.js mounts into.
 *
 * YAML fields:
 *   cards:                    "[One](10,10) [gas burner](80,10) ..."
 *   height:                   280
 *   board:                    "Board title (submitted as metadata)"
 *   show-editor:              yes | no  (default: no)
 *   feedback-allow:           yes | no  (default: no)
 *   feedback-gform-url:       any Google Forms URL (viewform/share links auto-converted to formResponse)
 *   feedback-fields:
 *     arrangement:            entry.111111111
 *     board:                  entry.222222222
 *     type:                   entry.333333333
 *     name:                   entry.444444444  (omit to hide name field)
 *     category:               entry.555555555  (omit to hide category picker)
 *   mode:                     "display-feedback"
 *   feedback-gsheet-csv:      "https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv"
 *   feedback-moderation-hours: 24
 */

import jsYaml from "js-yaml";

export const type = "hybrid";
export const name = "fridge-magnets";

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const FIELD_ORDER = ["arrangement", "board", "type", "name", "category", "comment"];

function normalizeGsheetUrl(url) {
  if (!url) return "";
  if (!url.includes("docs.google.com/spreadsheets")) return url;
  // Pass through already-correct export or published URLs
  if (url.includes("/export?") || url.includes("/pub?")) return url;
  // Convert edit/view/sharing URLs → export CSV
  return url.replace(/\/(edit|view)(\?.*)?$/, "") + "/export?format=csv";
}

function parseGformUrl(url) {
  if (!url) return { formResponseUrl: "", autoFields: {} };

  // Extract entry IDs in order from query string (pre-filled link)
  const autoFields = {};
  const qIdx = url.indexOf("?");
  if (qIdx !== -1) {
    const params = new URLSearchParams(url.slice(qIdx + 1));
    const entryKeys = [...params.keys()].filter((k) => k.startsWith("entry."));
    entryKeys.forEach((key, i) => {
      if (FIELD_ORDER[i]) autoFields[FIELD_ORDER[i]] = key;
    });
  }

  // Normalize base URL to formResponse
  const formResponseUrl = url
    .replace(/\?.*$/, "")
    .replace(/\/viewform$/, "/formResponse");

  return { formResponseUrl, autoFields };
}

function safe(val) {
  return String(val || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function transform(html) {
  const codeBlockPattern =
    /<pre><code class="language-fridge-magnets">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (match, rawContent) => {
    const decoded = decodeHtmlEntities(rawContent).trim();

    let settings = {};
    if (decoded) {
      try {
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(
          `[fridge-magnets] Failed to parse code fence settings: ${e.message}`,
        );
      }
    }

    const cards = settings.cards || "";
    const height = settings.height || 280;
    const board = settings.board || "";
    const showEditor =
      settings["show-editor"] === true || settings["show-editor"] === "yes";
    const feedbackAllow =
      settings["feedback-allow"] === true ||
      settings["feedback-allow"] === "yes";
    const { formResponseUrl: gformUrl, autoFields } = parseGformUrl(
      settings["feedback-gform-url"] || "",
    );
    // explicit feedback-fields override auto-extracted IDs from the pre-filled URL
    const ff = { ...autoFields, ...(settings["feedback-fields"] || {}) };
    const mode = settings.mode || "";
    const debug = settings.debug === true || settings.debug === "yes";
    const gsheetCsv = normalizeGsheetUrl(settings["feedback-gsheet-csv"] || "");
    const moderationHours =
      settings["feedback-moderation-hours"] != null
        ? settings["feedback-moderation-hours"]
        : 24;

    const attrs = [
      `class="fridge-magnets-visualizer"`,
      `data-cards="${safe(cards)}"`,
      `data-height="${height}"`,
      board ? `data-board="${safe(board)}"` : "",
      showEditor ? `data-show-editor="true"` : "",
      feedbackAllow ? `data-feedback-allow="true"` : "",
      gformUrl ? `data-gform-url="${safe(gformUrl)}"` : "",
      ff.arrangement ? `data-field-arrangement="${safe(ff.arrangement)}"` : "",
      ff.board ? `data-field-board="${safe(ff.board)}"` : "",
      ff.type ? `data-field-type="${safe(ff.type)}"` : "",
      ff.name ? `data-field-name="${safe(ff.name)}"` : "",
      ff.category ? `data-field-category="${safe(ff.category)}"` : "",
      ff.comment ? `data-field-comment="${safe(ff.comment)}"` : "",
      debug ? `data-debug="true"` : "",
      mode ? `data-mode="${safe(mode)}"` : "",
      gsheetCsv ? `data-gsheet-csv="${safe(gsheetCsv)}"` : "",
      moderationHours !== 24
        ? `data-moderation-hours="${moderationHours}"`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `<div ${attrs}></div>`;
  });
}

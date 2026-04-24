/**
 * Ken Burns Zoom — Build-time Transform
 *
 * Runtime visualizer: this module handles the build-time part.
 * Animation playback lives in browser.js (via engine.js).
 *
 * Finds ::: ken-burns-zoom ... ::: containers in rendered HTML.
 * markdownItContainer generates: <section class="ken-burns-zoom" data-vis-raw="base64">
 * inject-container-raw.js encodes the raw fence body into data-vis-raw AFTER
 * the preprocessor has already resolved ![[image.jpg]] → ![image.jpg](/media/image.jpg).
 *
 * The image field therefore arrives in one of two forms:
 *   image: ![photo.jpg](/media/photo.jpg)   — post-preprocessor (resolved)
 *   image: ![[photo.jpg]]                   — pre-preprocessor (raw, local dev/test)
 *
 * See: docs/architecture/visualizers.md — data-vis-raw pipeline
 * See: lib/visualizers/ken-burns-zoom/schema.md — field reference
 * See: scripts/utils/inject-container-raw.js
 */

import jsYaml from "js-yaml";

export const type = "runtime";
export const name = "ken-burns-zoom";

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'");
}

function parsePct(val) {
  if (typeof val === "string" && val.endsWith("%")) return parseFloat(val);
  return parseFloat(val) || 0;
}

/**
 * Resolve the image field to a root-relative path.
 * Handles:
 *   ![alt](/media/file.jpg)   — resolved markdown image (post-preprocessor)
 *   ![[file.jpg]]             — Obsidian embed wikilink (pre-preprocessor / local)
 *   /media/file.jpg           — already a root-relative path
 */
function resolveImagePath(raw) {
  if (!raw) return "";
  const s = String(raw).trim();

  // Resolved markdown image: ![alt](/media/file.jpg)
  const mdImg = s.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (mdImg) return mdImg[2];

  // Obsidian embed wikilink: ![[file.jpg]]
  const wikiEmbed = s.match(/^!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
  if (wikiEmbed) return "/media/" + wikiEmbed[1];

  // Plain wikilink fallback: [[file.jpg]]
  const wiki = s.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
  if (wiki) return "/media/" + wiki[1];

  // Already a path
  if (s.startsWith("/") || s.startsWith("http")) return s;

  // Bare filename fallback
  return "/media/" + s;
}

export function transform(html) {
  // markdownItContainer emits: <section class="ken-burns-zoom" data-vis-raw="base64">
  const pattern =
    /<section class="ken-burns-zoom"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(pattern, (match, attrs) => {
    const rawMatch = attrs.match(/data-vis-raw="([^"]*)"/);
    if (!rawMatch) {
      console.warn("[ken-burns-zoom] No data-vis-raw found — skipping.");
      return match;
    }

    let yaml;
    try {
      yaml = decodeHtmlEntities(
        Buffer.from(rawMatch[1], "base64").toString("utf-8")
      ).trim();
    } catch {
      console.warn("[ken-burns-zoom] Could not decode data-vis-raw.");
      return match;
    }

    let cfg;
    try {
      cfg = jsYaml.load(yaml) || {};
    } catch (e) {
      console.warn(`[ken-burns-zoom] Failed to parse YAML: ${e.message}`);
      return match;
    }

    const [arW, arH] = String(cfg["aspect-ratio"] || "16:9")
      .split(":")
      .map(Number);

    const settings = {
      image:       resolveImagePath(cfg.image),
      duration:    parseFloat(cfg.duration)    || 8,
      easing:      cfg.easing                  || "linear",
      aspectRatio: cfg["aspect-ratio"]         || "16:9",
      arW:         arW || 16,
      arH:         arH || 9,
      direction:   cfg.direction               || "in",
      playback:    cfg.playback                || "loop",
      startRect: {
        x: parsePct(cfg["start-x"]),
        y: parsePct(cfg["start-y"]),
        w: parsePct(cfg["start-w"]),
        h: parsePct(cfg["start-h"]),
      },
      endRect: {
        x: parsePct(cfg["end-x"]),
        y: parsePct(cfg["end-y"]),
        w: parsePct(cfg["end-w"]),
        h: parsePct(cfg["end-h"]),
      },
    };

    const settingsJson = JSON.stringify(settings).replace(/'/g, "&#39;");

    return `<div class="vis-ken-burns-zoom" data-kbz-settings='${settingsJson}' data-pagefind-ignore></div>`;
  });
}

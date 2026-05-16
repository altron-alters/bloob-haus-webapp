/**
 * Circular Nav Visualizer — Build-time Transform
 *
 * Finds :::circular-nav container sections (emitted as <section class="circular-nav" data-vis-raw="...">)
 * and replaces them with a <div class="circular-nav-visualizer"> containing the parsed data.
 *
 * Syntax (inside :::circular-nav block):
 *   key: value               ← optional settings (debug, orbit_radius, center_size, etc.)
 *   [label](url) - display name    ← orbit bubble (display name shown in bubble)
 *   center: [label](url)           ← center CTA bubble
 *
 * The visualizer reads plain markdown links. Wiki-links should be pre-resolved by
 * the preprocessor before this runs.
 */

export const type = "hybrid";
export const name = "circular-nav";

/**
 * Parse the raw markdown content of a circular-nav block.
 * Returns { center, rooms, settings } where settings holds key:value pairs.
 */
function parseRaw(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const rooms = [];
  let center = null;
  const settings = {};

  const linkPattern = /^\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)$/;
  const centerPattern = /^center:\s*\[([^\]]+)\]\(([^)]+)\)/;
  const settingPattern = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/;

  for (const line of lines) {
    const centerMatch = line.match(centerPattern);
    if (centerMatch) {
      center = { label: centerMatch[1].trim(), href: centerMatch[2].trim() };
      continue;
    }

    const roomMatch = line.match(linkPattern);
    if (roomMatch) {
      rooms.push({
        label: roomMatch[3].trim(),
        href: roomMatch[2].trim(),
      });
      continue;
    }

    const settingMatch = line.match(settingPattern);
    if (settingMatch) {
      settings[settingMatch[1]] = settingMatch[2].trim();
    }
  }

  return { center, rooms, settings };
}

export function transform(html) {
  // Match <section class="circular-nav" ... data-vis-raw="BASE64" ...>...</section>
  const sectionPattern =
    /<section\s+class="circular-nav"([^>]*?)data-vis-raw="([^"]+)"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, before, rawBase64, after, innerHtml) => {
    let data = { center: null, rooms: [], settings: {} };
    try {
      const rawText = Buffer.from(rawBase64, "base64").toString("utf-8");
      data = parseRaw(rawText);
    } catch (e) {
      console.warn("[circular-nav] Failed to parse raw content:", e.message);
    }

    if (!data.rooms.length && !data.center) {
      return match;
    }

    const dataJson = JSON.stringify(data).replace(/'/g, "&#39;");
    return `<div class="circular-nav-visualizer" data-pagefind-ignore data-circular-nav='${dataJson}'></div>`;
  });
}

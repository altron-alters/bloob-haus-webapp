/**
 * RSS Feed Shape — File-scope Build-time Renderer
 *
 * Activated when a markdown file declares `bloob-shape: rss-feed` in frontmatter.
 * The ::: settings block in the file body configures the shape:
 *
 *   ::: settings
 *   rss: https://anchor.fm/s/xyz/podcast/rss
 *   spotify: https://open.spotify.com/show/...
 *   apple: https://podcasts.apple.com/de/podcast/...
 *   :::
 *
 * Platform keys (spotify, apple, youtube, …) are recognised automatically —
 * no nesting under a `platforms:` key required. Values can be plain URLs or
 * markdown link syntax: [display text](url)
 *
 * Fetches the feed at build time (no CORS, no browser dependency).
 * Renders a simple episode list for now — visual polish comes later.
 */

export const type = "file-scope";
export const name = "rss-feed";

// Known platform keys → display labels shown on badges
const PLATFORM_LABELS = {
  spotify: "Spotify",
  apple: "Apple Podcasts",
  youtube: "YouTube",
  google: "Google Podcasts",
  amazon: "Amazon Music",
  overcast: "Overcast",
  pocketcasts: "Pocket Casts",
  castbox: "Castbox",
};

// ─── Entry point ────────────────────────────────────────────────────────────

export async function renderFilescope(settings, _body) {
  const { rss: rssUrl } = settings;
  const platforms = extractPlatforms(settings);

  if (!rssUrl) {
    return errorHtml("No RSS URL configured. Add <code>rss:</code> to the ::: settings block.");
  }

  let xml;
  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Bloob-Haus-Builder/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    xml = await res.text();
  } catch (e) {
    return errorHtml(`Failed to fetch RSS feed: ${e.message}`);
  }

  const feed = parseRssFeed(xml);
  return renderEpisodeList(feed, platforms);
}

// ─── Parser (pure, exported for tests) ──────────────────────────────────────

export function parseRssFeed(xml) {
  // Strip item blocks to get clean channel-level fields
  const channelXml = xml.replace(/<item[\s\S]*?<\/item>/gi, "");

  return {
    title: extractText(channelXml, "title"),
    link: extractText(channelXml, "link"),
    items: extractItems(xml),
  };
}

export function extractItems(xml) {
  const items = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemPattern.exec(xml)) !== null) {
    const item = match[1];
    items.push({
      title: extractText(item, "title"),
      link: extractText(item, "link"),
      pubDate: extractText(item, "pubDate"),
      enclosureUrl: extractAttr(item, "enclosure", "url"),
      duration: extractText(item, "itunes:duration"),
      episode: extractText(item, "itunes:episode"),
    });
  }
  return items;
}

// ─── Platform extraction (pure, exported for tests) ─────────────────────────

/**
 * Collects platform links from settings.
 * Supports flat keys (spotify: url) and the legacy nested form (platforms: {}).
 * Values can be plain URLs or markdown link syntax [text](url).
 * Returns { key: url } using PLATFORM_LABELS keys for known platforms.
 */
export function extractPlatforms(settings) {
  const result = {};

  // Flat top-level keys: spotify: url, apple: [text](url), …
  for (const key of Object.keys(PLATFORM_LABELS)) {
    if (settings[key]) {
      const url = parseUrlValue(settings[key]);
      if (url) result[key] = url;
    }
  }

  // Legacy nested form: platforms: { spotify: url, … }
  if (settings.platforms && typeof settings.platforms === "object") {
    for (const [key, val] of Object.entries(settings.platforms)) {
      const url = parseUrlValue(val);
      if (url) result[key] = url;
    }
  }

  return result;
}

/**
 * Parses a URL value that may be a plain URL or markdown link [text](url).
 */
export function parseUrlValue(val) {
  if (!val) return null;
  const str = String(val).trim();
  const mdMatch = str.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
  if (mdMatch) return mdMatch[2].trim();
  if (str.startsWith("http")) return str;
  return null;
}

// ─── Renderer (pure, exported for tests) ────────────────────────────────────

export function renderEpisodeList(feed, platforms = {}) {
  const platformEntries = Object.entries(platforms);
  const platformBar =
    platformEntries.length > 0
      ? `<div class="rss-platforms">${platformEntries
          .map(([key, url]) => {
            const label = PLATFORM_LABELS[key] || key;
            return `<a class="rss-platform-badge" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
          })
          .join("")}</div>`
      : "";

  const items = feed.items
    .map((ep) => {
      const href = escapeAttr(ep.link || ep.enclosureUrl || "#");
      const title = escapeHtml(ep.title || "Untitled");
      const num = ep.episode && /^\d+$/.test(ep.episode.trim())
        ? `<span class="rss-ep-number">${escapeHtml(ep.episode)}.</span> `
        : "";
      const date = ep.pubDate
        ? `<span class="rss-ep-date">${escapeHtml(formatDate(ep.pubDate))}</span>`
        : "";
      return `  <li class="rss-episode">
    <a class="rss-ep-title" href="${href}">${num}${title}</a>${date ? `\n    ${date}` : ""}
  </li>`;
    })
    .join("\n");

  return `<div class="rss-feed-visualizer">
${platformBar}
<ul class="rss-episode-list">
${items}
</ul>
</div>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractText(xml, tag) {
  // Handles CDATA sections and plain text content
  const pattern = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))`,
    "i"
  );
  const m = xml.match(pattern);
  if (!m) return null;
  return ((m[1] ?? m[2]) || "").trim() || null;
}

function extractAttr(xml, tag, attr) {
  const pattern = new RegExp(`<${tag}[^>]+${attr}="([^"]+)"`, "i");
  const m = xml.match(pattern);
  return m ? m[1] : null;
}

function formatDate(pubDate) {
  try {
    return new Date(pubDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return pubDate;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function errorHtml(message) {
  return `<div class="rss-feed-error"><p>${message}</p></div>`;
}

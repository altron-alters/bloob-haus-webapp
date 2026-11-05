/**
 * Collection resolver — pure source resolution.
 *
 * PURE. Takes the graph nodes as an *argument*; never reads them itself. The
 * impure fetch differs per host (readFileSync in Node, fetch() in the browser,
 * handed in directly by the playground) and lives in the host, not here.
 *
 * This is the `resolve.js` seam of the pure-renderer standard — the one place
 * a shape declares how it obtains data that lives *outside* its own block.
 * Same pattern as lib/visualizers/scene-nav/resolve.js.
 *
 * See docs/architecture/visualizers.md → "The pure-renderer standard".
 */

import { safeDecode } from "../_utils/ref-encoding.js";

/**
 * Parse a source string into a typed source object.
 * Phase 1 supports: folder=X | tag=X | field:KEY=VAL | all
 */
export function parseSource(source) {
  if (!source || source === "all") return { type: "all" };

  const s = String(source).trim();
  // links-here=<field>: pages whose <field> links to the page the collection is on
  // (field links, scripts/utils/field-links.js). No field = any field.
  if (s === "links-here") return { type: "links-here", field: null };
  if (s.startsWith("links-here=")) return { type: "links-here", field: s.slice(11).trim() || null };
  if (s.startsWith("folder=")) return { type: "folder", value: s.slice(7).trim() };
  if (s.startsWith("tag="))    return { type: "tag",    value: s.slice(4).trim() };
  if (s.startsWith("field:")) {
    const rest = s.slice(6);
    const eqIdx = rest.indexOf("=");
    if (eqIdx === -1) return { type: "all" };
    return { type: "field", key: rest.slice(0, eqIdx).trim(), value: rest.slice(eqIdx + 1).trim() };
  }
  return { type: "all" };
}

/**
 * Filter graph.json nodes by a parsed (or raw string) source.
 * Always excludes archived pages and folder-index stubs.
 */
export function filterNodes(nodes, source, { pageUrl, links } = {}) {
  const s = typeof source === "string" ? parseSource(source) : source;

  if (s.type === "links-here") {
    if (!pageUrl) return []; // a "here" source means nothing without a here
    const here = normalizeUrl(pageUrl);
    // Plain `links-here` also counts ordinary links in a page's text (graph.json `links`,
    // injected by the host): an article that mentions [[ELS Architecture]] is listed on
    // the ELS page. `links-here=<field>` stays field links only. Navigation pages (the
    // homepage, folder indexes) link to everything, so they never count as a mention.
    const linkedFromBody = new Set();
    if (!s.field && Array.isArray(links)) {
      for (const l of links) {
        if (l && normalizeUrl(l.target) === here) linkedFromBody.add(normalizeUrl(l.source));
      }
    }
    return nodes.filter((n) => {
      if (n.type !== "page" || n.website_status === "archived") return false;
      if (n.field_links) {
        const fields = s.field ? [n.field_links[s.field]] : Object.values(n.field_links);
        if (fields.some((refs) => Array.isArray(refs) && refs.some((r) => normalizeUrl(r) === here))) return true;
      }
      if (!linkedFromBody.size) return false;
      const id = normalizeUrl(n.id);
      const isNavigation = id === "/" || id.endsWith("/index/") || (n.section && id === "/" + n.section + "/");
      return !isNavigation && linkedFromBody.has(id);
    });
  }

  if (s.type === "folder") {
    const folderIndexId = "/" + s.value + "/";
    return nodes.filter(
      (n) =>
        n.section === s.value &&
        n.type === "page" &&
        n.id !== folderIndexId &&
        !n.id.endsWith("/index/") &&
        n.website_status !== "archived"
    );
  }

  if (s.type === "tag") {
    const tagLower = s.value.toLowerCase();
    return nodes.filter(
      (n) =>
        n.type === "page" &&
        Array.isArray(n.tags) &&
        n.tags.map((t) => String(t).toLowerCase()).includes(tagLower) &&
        n.website_status !== "archived"
    );
  }

  if (s.type === "field") {
    return nodes.filter((n) => {
      const fieldVal = n[s.key];
      const matches = Array.isArray(fieldVal)
        ? fieldVal.some((v) => String(v) === s.value)
        : String(fieldVal ?? "") === s.value;
      return n.type === "page" && matches && n.website_status !== "archived";
    });
  }

  // all
  return nodes.filter((n) => n.type === "page" && n.website_status !== "archived");
}

/**
 * Sort and optionally limit an array of nodes.
 */
export function sortAndLimit(pages, { sort = "alpha", limit } = {}) {
  const sorted = [...pages];
  if (sort === "reverse-alpha") {
    sorted.sort((a, b) =>
      (b.title || "").toLowerCase().localeCompare((a.title || "").toLowerCase())
    );
  } else {
    sorted.sort((a, b) =>
      (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase())
    );
  }
  const n = limit ? parseInt(limit, 10) : Infinity;
  return isFinite(n) ? sorted.slice(0, n) : sorted;
}

/** Is this list target an address outside the site (https:, mailto:, …)? */
export function isExternalTarget(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(String(target || ""));
}

/** The page-name part of an unresolved target: "marbles/My Page.md#x" → "my page". */
function targetName(target) {
  return safeDecode(String(target).split("#")[0].split("?")[0])
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .replace(/^.*\//, "")
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase();
}

/** Last path segment of a node id: "/marbles/My-Page/" → "my-page". */
function idName(id) {
  return safeDecode(String(id).replace(/\/+$/, "").replace(/^.*\//, "")).toLowerCase();
}

function hostLabel(url) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(String(url));
  return m ? m[1].replace(/^www\./i, "") : String(url).replace(/^mailto:/i, "");
}

/**
 * Resolve a hand-written list (`items` from parser.js) against graph nodes,
 * keeping the authored order.
 *
 *   internal URL  "/marbles/x/"        → that page (id match, case-insensitive)
 *   page name     "x", "marbles/x.md"  → page whose URL ends in /x/, else whose title is x
 *   external      "https://…"          → a card with just a title and a link
 *   broken / unknown                   → dropped (private pages never show up)
 *
 * A page appears once, at its first mention. Listing a page is a deliberate
 * choice, so archived pages are kept; unlisted pages are never in graph.json
 * and so cannot be listed.
 *
 * The card title is the page's own title. The link text is used instead only
 * for external links, for pages without a title, or when `titles: link` is set.
 */
export function resolveListItems(nodes, items, settings = {}) {
  const byId = new Map();
  const byName = new Map();
  const byTitle = new Map();
  for (const n of nodes) {
    if (n.type !== "page") continue;
    const id = normalizeUrl(n.id);
    if (!byId.has(id)) byId.set(id, n);
    const name = idName(n.id);
    if (name && !byName.has(name)) byName.set(name, n);
    const title = String(n.title || "").trim().toLowerCase();
    if (title && !byTitle.has(title)) byTitle.set(title, n);
  }

  const useLabels = String(settings.titles || "").toLowerCase() === "link";
  const seen = new Set();
  const out = [];

  for (const item of items || []) {
    if (!item || item.broken || !item.target) continue;
    const target = String(item.target).trim();

    if (isExternalTarget(target)) {
      if (seen.has(target)) continue;
      seen.add(target);
      out.push({
        id: target,
        title: item.label || hostLabel(target),
        type: "page",
        external: true,
        redirect: target,
        host: hostLabel(target),
      });
      continue;
    }

    let node = null;
    if (target.startsWith("/")) {
      node = byId.get(normalizeUrl(target)) || null;
    }
    if (!node) {
      const name = targetName(target);
      node = byName.get(name) || byName.get(name.replace(/\s+/g, "-")) || byTitle.get(name) || null;
    }
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);

    const label = item.label && item.label.trim();
    const title = (useLabels && label) || node.title || label || node.id;
    out.push(title === node.title ? node : { ...node, title });
  }
  return out;
}

/**
 * Convenience: filter by source (or take the hand-written list), then sort + limit.
 *
 * A hand-written list keeps its authored order unless `sort:` is set.
 */
export function resolvePages(nodes, settings, { pageUrl, links } = {}) {
  if (Array.isArray(settings.items)) {
    const listed = resolveListItems(nodes, settings.items, settings);
    if (settings.sort) return sortAndLimit(listed, { sort: settings.sort, limit: settings.limit });
    const n = settings.limit ? parseInt(settings.limit, 10) : Infinity;
    return isFinite(n) ? listed.slice(0, n) : listed;
  }
  const filtered = filterNodes(nodes, settings.source || "all", { pageUrl, links });
  return sortAndLimit(filtered, { sort: settings.sort, limit: settings.limit });
}

/**
 * The tags a collection's search can offer as result cards: graph.json's tag
 * nodes (`type: "tag"`, id `/tags/<slug>/`), kept only when at least one page
 * in THIS collection carries the tag — a Projects search never suggests a tag
 * only Resources use. Pure: the host injects the nodes.
 *
 * `count` is the tag node's site-wide page count (what the tag page lists);
 * a node without one falls back to the pages in this collection.
 *
 * @returns {{ slug: string, label: string, href: string, count: number }[]}
 *          most-used first, then alphabetical.
 */
export function resolveTags(nodes, pages) {
  const used = new Map(); // lower-case slug → pages in this collection carrying it
  for (const page of pages || []) {
    for (const tag of Array.isArray(page.tags) ? page.tags : []) {
      const key = String(tag).toLowerCase();
      used.set(key, (used.get(key) || 0) + 1);
    }
  }
  if (!used.size) return [];

  const tags = [];
  for (const node of nodes || []) {
    if (node.type !== "tag" || typeof node.id !== "string") continue;
    const m = node.id.match(/^\/tags\/([^/]+)\/$/);
    if (!m) continue;
    const slug = m[1];
    const inCollection = used.get(slug.toLowerCase());
    if (!inCollection) continue;
    tags.push({
      slug,
      label: slug.replace(/-/g, " "),
      href: node.id,
      count: Number.isFinite(node.count) ? node.count : inCollection,
    });
  }
  return tags.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Normalize a URL for comparison between data sources.
 *
 * graph.json ids are slugified lowercase (`/resources/playlists/`), while
 * Pagefind indexes the real output path, which honours the site's permalink
 * strategy and may preserve case (`/Resources/playlists/`). Comparing them raw
 * silently fails, which is what made the collection's full-text search return
 * nothing even when Pagefind had matched the page.
 */
export function normalizeUrl(url) {
  if (!url) return "";
  let u = String(url).trim().toLowerCase();
  const hash = u.indexOf("#");
  if (hash !== -1) u = u.slice(0, hash);
  const query = u.indexOf("?");
  if (query !== -1) u = u.slice(0, query);
  u = u.replace(/index\.html$/, "");
  if (!u.endsWith("/")) u += "/";
  return u;
}

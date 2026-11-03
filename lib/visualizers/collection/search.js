/**
 * Collection search — pure helpers shared by browser.js and the tests.
 *
 * No DOM, no I/O. browser.js owns the behaviour (listening to the input,
 * toggling `hidden`, writing the count's text); the decisions live here so
 * they can be tested in Node.
 */

/** Lower-case, hyphens read as spaces, trimmed — the same rule the item filter uses. */
export function normalizeQuery(text) {
  return String(text ?? "").toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

/** Shortest query that may reveal tag cards; one letter would match nearly every tag. */
export const MIN_TAG_QUERY = 2;

/** Does this query point at this tag? Substring of the tag's name, hyphens as spaces. */
export function matchesTag(tagSlug, query) {
  const q = normalizeQuery(query);
  if (q.length < MIN_TAG_QUERY) return false;
  return normalizeQuery(tagSlug).includes(q);
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * The status line under the search bar. Pages and tags are counted separately,
 * because a tag card is a different kind of thing (a door to the tag page).
 */
export function formatSearchCount(pages, tags) {
  if (!pages && !tags) return "No results";
  const parts = [];
  if (pages) parts.push(plural(pages, "result", "results"));
  if (tags) parts.push(plural(tags, "tag", "tags"));
  return parts.join(" · ");
}

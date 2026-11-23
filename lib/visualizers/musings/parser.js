/**
 * musings parser — pure function
 *
 * Input:  raw markdown inside a `::: musings` container (from data-vis-raw).
 *
 *   People first
 *   - "This building should be naturally ventilated..." - Shannon Allison - 2022-01-14
 *   - "People want radiant heat..." - Stefan Gracik - 2018-09-12
 *
 *   Technical
 *   - "It all comes back to that permaculture mindset..." - Brian Croshal - 2022-11-01
 *
 * Grammar (shape-named block, see schema.md):
 *   - A non-empty line that is not a list item starts a category. Markdown marks around it
 *     (`## `, `**bold**`, a trailing colon) are stripped, so a heading reads the same.
 *   - A list item (`-`, `*` or `+`) is one musing: `"quote" - Name - Date`.
 *     Name and date are optional. Any dash works as the separator (- – —) when spaced.
 *     Straight or curly quotes both work; an unquoted item is the whole line, unless it ends
 *     in ` - Name - Date`.
 *   - Items before any category line go into an unnamed category.
 *
 * Output: { categories: [{ name, items: [{ quote, name, date }] }] }  (empty categories dropped)
 *
 * Pure — no DOM, no file system, no side effects.
 */

const SEP = /\s+[-–—]\s+/;
const LOOKS_LIKE_DATE = /\b\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;

function cleanHeading(line) {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(\*\*|__)(.*)\1$/, "$2")
    .replace(/:\s*$/, "")
    .trim();
}

function splitAttribution(rest) {
  const parts = rest.split(SEP).map((s) => s.trim()).filter(Boolean);
  const name = parts[0] || "";
  const date = parts.slice(1).join(" - ");
  return { name, date };
}

/**
 * Parse one list item's text into { quote, name, date }.
 * @param {string} text
 */
export function parseMusing(text) {
  const t = String(text).trim();

  // Quoted: "…" or “…”, then optional ` - Name - Date`. Greedy so a quote may contain quotes.
  const q = t.match(/^["“](.+)["”]\s*(?:[-–—]\s*(.*))?$/);
  if (q) {
    return { quote: q[1].trim(), ...splitAttribution(q[2] || "") };
  }

  // Unquoted: `text - Name - Date` only when the last part looks like a date;
  // otherwise the whole line is the quote (a dash inside a sentence is not an attribution).
  const parts = t.split(SEP);
  if (parts.length >= 3 && LOOKS_LIKE_DATE.test(parts[parts.length - 1])) {
    return {
      quote: parts.slice(0, -2).join(" - ").trim(),
      name: parts[parts.length - 2].trim(),
      date: parts[parts.length - 1].trim(),
    };
  }
  return { quote: t, name: "", date: "" };
}

/**
 * @param {string} raw  Raw markdown content of the ::: musings block
 * @returns {{ categories: { name: string, items: { quote: string, name: string, date: string }[] }[] }}
 */
export function parse(raw) {
  const categories = [];
  let current = null;
  const open = (name) => {
    current = { name, items: [] };
    categories.push(current);
  };

  for (const rawLine of String(raw || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const item = line.match(/^[-*+]\s+(.*)$/);
    if (item) {
      if (!current) open("");
      const m = parseMusing(item[1]);
      if (m.quote) current.items.push(m);
    } else {
      open(cleanHeading(line));
    }
  }

  return { categories: categories.filter((c) => c.items.length > 0) };
}

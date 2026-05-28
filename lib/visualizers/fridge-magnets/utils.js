/**
 * Fridge Magnets — Pure utility functions
 *
 * No DOM, no side effects. Importable by browser.js (bundled) and test files.
 */

// ── Card parsing ──────────────────────────────────────────────────────────────

/**
 * Parses [text] and [text](x,y) syntax.
 * Text may carry a '+' prefix for user-added custom cards.
 */
export function parseInput(text) {
  const matches = [...text.matchAll(/\[([^\]]+)\](?:\((\d+),(\d+)\))?/g)];
  return matches
    .map((m) => ({
      text: m[1].trim(),
      x: m[2] !== undefined ? parseInt(m[2], 10) : null,
      y: m[3] !== undefined ? parseInt(m[3], 10) : null,
    }))
    .filter((c) => c.text);
}

export function countWords(texts) {
  return texts.reduce(
    (n, t) => n + t.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

// ── Arrangement builders ──────────────────────────────────────────────────────

/** Serializes all cards to "[word](x,y)" string, sorted reading-order. */
export function buildArrangement(cards) {
  return [...cards]
    .sort(
      (a, b) =>
        Math.floor(a.y / 48) - Math.floor(b.y / 48) || a.x - b.x,
    )
    .map((c) => {
      const label = c.custom ? `+${c.text}` : c.text;
      return `[${label}](${Math.round(c.x)},${Math.round(c.y)})`;
    })
    .join(" ");
}

/** Serializes only selected cards, coordinates normalized to origin. */
export function buildSelectionArrangement(cards) {
  const sel = cards.filter((c) => c.selected);
  if (!sel.length) return "";
  const minX = Math.min(...sel.map((c) => c.x));
  const minY = Math.min(...sel.map((c) => c.y));
  return sel
    .sort(
      (a, b) =>
        Math.floor(a.y / 48) - Math.floor(b.y / 48) || a.x - b.x,
    )
    .map((c) => {
      const label = c.custom ? `+${c.text}` : c.text;
      return `[${label}](${Math.round(c.x - minX)},${Math.round(c.y - minY)})`;
    })
    .join(" ");
}

/**
 * Returns preview card positions normalized to origin.
 * Used to populate the modal board preview.
 */
export function buildPreviewCards(cards) {
  if (!cards.length) return [];
  const minX = Math.min(...cards.map((c) => c.x));
  const minY = Math.min(...cards.map((c) => c.y));
  return cards.map((c) => ({
    text: c.text,
    x: Math.round(c.x - minX),
    y: Math.round(c.y - minY),
    custom: c.custom || false,
  }));
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

/** Parses a single CSV line, handling quoted fields. */
export function parseCSVRow(line) {
  const result = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  result.push(field);
  return result;
}

/** Parses a Google Sheets CSV export into an array of row objects. */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => {
      const values = parseCSVRow(l);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] || "").trim();
      });
      return row;
    });
}

// ── Moderation ────────────────────────────────────────────────────────────────

/**
 * Returns true if a submission row should be shown.
 * Rules (in order):
 *   approved === 'no'  → never show
 *   approved === 'yes' → always show
 *   otherwise          → show (default open)
 *
 * Future spam protection: set approved="pending" on suspicious rows and
 * use the moderationHours window to auto-expire them.
 */
export function passesModeration(row, _moderationHours) {
  if (row.approved === "no") return false;
  return true;
}

// ── DOM safety ────────────────────────────────────────────────────────────────

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

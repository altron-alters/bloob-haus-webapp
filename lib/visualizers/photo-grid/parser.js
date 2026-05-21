/**
 * photo-grid parser — pure function
 *
 * Input:  raw markdown content of a ::: photo-grid container (string)
 * Output: { settings, images }
 *
 * Config lines (key: value) and image lines (![[...]] or ![alt](url)) coexist
 * freely — no separator needed. They are syntactically distinct: image lines
 * always start with !, config lines match word: value.
 *
 * Inspired by obsidian-image-grid's approach of mixing key:value config with
 * image links in the same block, letting line type determine role.
 */

const CONFIG_LINE = /^([\w-]+)\s*:\s*(.+?)\s*$/;
const MD_IMAGE = /!\[([^\]]*)\]\(([^)]+)\)/;
const WIKI_IMAGE = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/;

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const mdImg = trimmed.match(MD_IMAGE);
  if (mdImg) return { type: "image", src: mdImg[2], alt: mdImg[1] };

  const wikiImg = trimmed.match(WIKI_IMAGE);
  if (wikiImg) return { type: "image", src: wikiImg[1], alt: wikiImg[1] };

  // Config lines: only if line doesn't start with ! (images already handled above)
  if (!trimmed.startsWith("!")) {
    const cfg = trimmed.match(CONFIG_LINE);
    if (cfg) return { type: "config", key: cfg[1], value: cfg[2] };
  }

  return null;
}

function coerce(key, value) {
  if (key === "cols") return parseInt(value, 10) || 3;
  // Strip surrounding quotes if author wrote layout: "1,3,1"
  return value.replace(/^["']|["']$/g, "");
}

/**
 * @param {string} raw  Raw markdown content of the ::: photo-grid block
 * @returns {{ settings: object, images: {src: string, alt: string}[] }}
 */
export function parse(raw) {
  const settings = {};
  const images = [];

  for (const line of raw.split("\n")) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    if (parsed.type === "config") {
      settings[parsed.key] = coerce(parsed.key, parsed.value);
    } else if (parsed.type === "image") {
      images.push({ src: parsed.src, alt: parsed.alt });
    }
  }

  return { settings, images };
}

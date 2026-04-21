/**
 * slideshow parser — pure function
 *
 * Input:  raw markdown content of a ::: slideshow container (string)
 * Output: array of { src, alt } image objects
 *
 * Handles both formats:
 *   ![[filename.svg]]         — Obsidian wikilink (before resolution)
 *   ![alt](/media/file.svg)   — resolved markdown image (after preprocessor)
 *
 * One image per line. Lines without an image are ignored.
 */

function extractImageInfo(line) {
  const mdImgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (mdImgMatch) return { src: mdImgMatch[2], alt: mdImgMatch[1] };

  // ![[filename.svg|156]] — Obsidian wikilink with optional size hint after |
  const wikiMatch = line.match(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
  if (wikiMatch) return { src: wikiMatch[1], alt: wikiMatch[1] };

  return null;
}

/**
 * @param {string} raw  Raw markdown content of the ::: slideshow block
 * @returns {{ src: string, alt: string }[]}
 */
export function parse(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .map(extractImageInfo)
    .filter(Boolean);
}

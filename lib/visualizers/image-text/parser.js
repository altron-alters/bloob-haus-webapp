/**
 * image-text parser — pure function
 *
 * Input:  raw markdown content of a ::: image-text container (string)
 * Output: { src, alt } of the first image found
 *
 * Handles both formats:
 *   ![[filename.jpg]]         — Obsidian wikilink (before resolution)
 *   ![alt](/media/file.jpg)   — resolved markdown image (after preprocessor)
 *
 * The text content (everything except the image) is extracted from the
 * rendered inner HTML in index.js, not here, because it needs markdown-it
 * to render headings, bold, and links correctly.
 */

function extractImageInfo(line) {
  const mdImgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (mdImgMatch) return { src: mdImgMatch[2], alt: mdImgMatch[1] };

  // ![[filename.jpg|300]] — Obsidian wikilink with optional size hint after |
  const wikiMatch = line.match(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
  if (wikiMatch) return { src: wikiMatch[1], alt: wikiMatch[1] };

  return null;
}

/**
 * @param {string} raw  Raw markdown content of the ::: image-text block
 * @returns {{ src: string, alt: string }}
 */
export function parse(raw) {
  for (const line of raw.split("\n")) {
    const img = extractImageInfo(line.trim());
    if (img) return img;
  }
  return { src: "", alt: "" };
}

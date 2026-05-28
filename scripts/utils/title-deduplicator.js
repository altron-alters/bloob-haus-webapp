/**
 * Strips the leading H1 heading from markdown content when it duplicates
 * the page title. This prevents double-rendering when the template already
 * renders <h1>{{ title }}</h1> from frontmatter.
 *
 * If an H2 immediately follows the stripped H1 (no blank line between),
 * it is treated as a subtitle and returned separately so templates can
 * render it as a sub-heading below the title.
 *
 * Only strips an exact H1 (`# `). H2 and deeper headings are left untouched
 * unless they follow as subtitle. Inline markdown (bold, italic, code, links)
 * is stripped before comparison.
 *
 * @param {string} content - Markdown content (frontmatter already removed)
 * @param {string} pageTitle - The resolved page title from frontmatter/index
 * @returns {{ content: string, subtitle: string|null }}
 */
export function stripLeadingTitleHeading(content, pageTitle) {
  if (!content || !pageTitle) return { content, subtitle: null };

  // Detect hero image prefix: one or more `![alt](url)` lines before the H1.
  // These images are intentionally placed above the title and should be
  // extracted to render above the page title in the template, not in the body.
  const heroMatch = content.match(/^((?:[^\S\n]*!\[[^\]]*\]\([^)]*\)[^\S\n]*\n)+)/);
  const prefix = heroMatch ? heroMatch[1] : '';
  const afterPrefix = content.slice(prefix.length);

  // Find the leading H1 (may have leading whitespace when no hero prefix)
  const leadingH1 = afterPrefix.match(/^\s*# (.+?)(?:\s*\{#[^}]+\})?\s*\n/);
  if (!leadingH1) return { content, subtitle: null };

  const headingText = leadingH1[1]
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  if (headingText.toLowerCase() !== pageTitle.toLowerCase()) return { content, subtitle: null };

  // Extract hero image URLs so the template can render them above the title
  const heroImages = prefix
    ? [...prefix.matchAll(/!\[[^\]]*\]\(([^)]*)\)/g)].map((m) => m[1])
    : [];

  // Strip the H1 (and the hero prefix — images move to frontmatter, not body)
  let stripped = afterPrefix.replace(/^\s*# .+\n/, "");

  // If H2 follows immediately (no blank line), extract it as subtitle
  const subtitleMatch = stripped.match(/^## ([^\n]+)/);
  let subtitle = null;
  if (subtitleMatch) {
    subtitle = subtitleMatch[1]
      .replace(/\s*\{#[^}]+\}\s*$/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
    // Strip H2 line and any following blank line
    stripped = stripped.replace(/^## [^\n]+\n\n?/, "");
  } else {
    // Remove the optional blank line that was between H1 and remaining content
    stripped = stripped.replace(/^\n/, "");
  }

  return { content: stripped, subtitle, heroImages };
}

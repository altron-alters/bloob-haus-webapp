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

  const leadingH1 = content.match(/^\s*# (.+?)(?:\s*\{#[^}]+\})?\s*\n/);
  if (!leadingH1) return { content, subtitle: null };

  const headingText = leadingH1[1]
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  if (headingText.toLowerCase() !== pageTitle.toLowerCase()) return { content, subtitle: null };

  // Remove the H1 line (with any leading whitespace)
  let stripped = content.replace(/^\s*# .+\n/, "");

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

  return { content: stripped, subtitle };
}

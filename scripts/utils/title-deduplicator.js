/**
 * Strips inline markdown formatting (bold, italic, code, links).
 * Used to normalise headings before comparing against plain-text titles.
 * Exported so callers that need a plain version of a raw markdown string
 * can reuse the same logic (e.g. graph-builder stripping subtitle).
 *
 * @param {string} text
 * @returns {string}
 */
export function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/**
 * Strips the leading H1 heading from markdown content when it duplicates
 * the page title. This prevents double-rendering when the template already
 * renders <h1>{{ title }}</h1> from frontmatter.
 *
 * If an H2 follows the stripped H1 (with or without a blank line between),
 * it is treated as a subtitle and returned separately so templates can
 * render it as a sub-heading below the title.
 *
 * Only strips an exact H1 (`# `). H2 and deeper headings are left untouched
 * unless they follow as subtitle. Inline markdown is stripped before
 * comparison but preserved in the returned titleMd and subtitle values.
 *
 * @param {string} content - Markdown content (frontmatter already removed)
 * @param {string} pageTitle - The resolved plain-text page title
 * @returns {{ content: string, subtitle: string|null, titleMd: string|null, heroImages: string[] }}
 *   subtitle  — raw markdown text of the H2 (formatting preserved)
 *   titleMd   — raw markdown text of the matched H1 (formatting preserved)
 *   heroImages — image URLs extracted from lines preceding the H1
 */
export function stripLeadingTitleHeading(content, pageTitle) {
  if (!content || !pageTitle) return { content, subtitle: null, titleMd: null };

  // Detect hero image prefix: one or more `![alt](url)` lines before the H1.
  const heroMatch = content.match(/^((?:[^\S\n]*!\[[^\]]*\]\([^)]*\)[^\S\n]*\n)+)/);
  const prefix = heroMatch ? heroMatch[1] : '';
  const afterPrefix = content.slice(prefix.length);

  // Find the leading H1 (may have leading whitespace when no hero prefix)
  const leadingH1 = afterPrefix.match(/^\s*# (.+?)(?:\s*\{#[^}]+\})?\s*\n/);
  if (!leadingH1) return { content, subtitle: null, titleMd: null };

  const headingText = stripInlineMarkdown(leadingH1[1]).trim();
  if (headingText.toLowerCase() !== pageTitle.toLowerCase()) return { content, subtitle: null, titleMd: null };

  // Raw H1 text (markdown preserved, heading anchor stripped) for template rendering
  const titleMd = leadingH1[1].replace(/\s*\{#[^}]+\}\s*$/, "").trim();

  // Extract hero image URLs so the template can render them above the title
  const heroImages = prefix
    ? [...prefix.matchAll(/!\[[^\]]*\]\(([^)]*)\)/g)].map((m) => m[1])
    : [];

  // Strip the H1 (and the hero prefix — images move to frontmatter, not body)
  let stripped = afterPrefix.replace(/^\s*# .+\n/, "");

  // If H2 follows (with or without a blank line), extract it as subtitle.
  // Raw markdown is preserved — the template renders it via the mdinline filter.
  const subtitleMatch = stripped.match(/^\n?## ([^\n]+)/);
  let subtitle = null;
  if (subtitleMatch) {
    subtitle = subtitleMatch[1].replace(/\s*\{#[^}]+\}\s*$/, "").trim();
    // Strip optional leading blank line, H2 line, and any following blank line
    stripped = stripped.replace(/^\n?## [^\n]+\n\n?/, "");
  } else {
    // Remove the optional blank line that was between H1 and remaining content
    stripped = stripped.replace(/^\n/, "");
  }

  return { content: stripped, subtitle, titleMd, heroImages };
}

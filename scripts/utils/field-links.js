/**
 * Field links — a frontmatter field whose text matches a note in a folder (by
 * `name` / `aliases` / title / filename) becomes a link to that note, and that
 * note can list the pages that point to it.
 *
 * Configured vault-first in _bloob-settings.md; OFF unless a site sets it:
 *
 *   field_links:
 *     architect: architects            # shorthand: link + a card list on the firm note
 *
 *   field_links:
 *     architect:
 *       folder: architects
 *       list:                          # collection settings for the list; false = no list
 *         display: cards
 *         show_fields: building_type, location, sqft
 *
 * First user: alter-engineers (project `architect` text → firm notes in architects/).
 * The source text stays plain (it comes from a spreadsheet), so matching must
 * forgive how people type a name: case, punctuation, and &/+/and are ignored;
 * anything else is an alias on the target note (Obsidian's own `aliases` property).
 *
 * What a page gets (preprocess-content.js):
 *   frontmatter `field_links.<field>`: [{ value, name, href }]
 *     value  the text as written
 *     name   the target note's display name, or null when nothing matched
 *     href   the target's URL, only when it is published AND listed — a draft or
 *            unlisted note is never linked from a public page
 *   graph node `field_links.<field>`: [href, …] — what `links-here=<field>` reads
 *
 * Pure functions, plus readFieldLinkTargets (which reads the target folders'
 * frontmatter from disk, drafts included, so a draft's display name is known).
 */

import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";
import { isPageUnlisted } from "./unlisted-folders.js";

/** Values that mean "no value" in a spreadsheet-fed field. */
export const BLANK_VALUES = new Set(["", "n/a", "na", "none", "-", "—", "tbd"]);

const DEFAULT_LIST = { display: "cards" };

/** Lower-case, &/+ read as "and", punctuation dropped, spaces collapsed. */
export function normalizeName(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .toLowerCase()
    .replace(/[&+]/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeList(list) {
  if (list === false || list === null) return null;
  const off = typeof list === "string" && ["false", "off", "no"].includes(list.trim().toLowerCase());
  if (off) return null;
  if (list && typeof list === "object" && !Array.isArray(list)) return { ...list };
  return { ...DEFAULT_LIST };
}

/**
 * `field_links` from _bloob-settings.md → { field: { folder, list } }.
 * Absent / malformed → {} (feature off). Bad entries are dropped with a warning.
 */
export function normalizeFieldLinksConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [field, value] of Object.entries(raw)) {
    let folder = null;
    let list = { ...DEFAULT_LIST };
    if (typeof value === "string") {
      folder = value;
    } else if (value && typeof value === "object" && typeof value.folder === "string") {
      folder = value.folder;
      list = normalizeList(value.list);
    }
    folder = folder ? folder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").trim() : "";
    if (!folder) {
      console.warn(`[field-links] "${field}" has no folder, ignored (write \`${field}: <folder>\`)`);
      continue;
    }
    out[field] = { folder, list };
  }
  return out;
}

function asList(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Index the notes in one target folder by every name they answer to.
 * @param {{url, relativePath, frontmatter, linkable, title?}[]} notes
 * @returns {{ index: Map<string, {url, name, linkable}>, warnings: string[] }}
 */
export function buildTargetIndex(notes) {
  const index = new Map();
  const owner = new Map(); // normalized name → relativePath (for the duplicate warning)
  const warnings = [];
  for (const note of notes) {
    const fm = note.frontmatter || {};
    const stem = path.basename(String(note.relativePath || ""), ".md");
    const name = fm.name || fm.title || note.title || stem;
    const entry = { url: note.url, name: String(name), linkable: !!note.linkable };
    const keys = new Set(
      [fm.name, ...asList(fm.aliases), fm.title, stem].map(normalizeName).filter(Boolean),
    );
    for (const key of keys) {
      if (index.has(key)) {
        warnings.push(
          `"${key}" matches both ${owner.get(key)} and ${note.relativePath}; using ${owner.get(key)}`,
        );
        continue;
      }
      index.set(key, entry);
      owner.set(key, note.relativePath);
    }
  }
  return { index, warnings };
}

/** One field value (string or list) → [{ value, name, href }], blanks dropped. */
export function resolveFieldValue(value, index) {
  const out = [];
  for (const v of asList(value)) {
    const text = String(v ?? "").trim();
    if (BLANK_VALUES.has(text.toLowerCase())) continue;
    const hit = index.get(normalizeName(text));
    out.push({
      value: text,
      name: hit ? hit.name : null,
      href: hit && hit.linkable ? hit.url : null,
    });
  }
  return out;
}

/** The collection fence a target note gets: the pages whose `field` links here. */
export function listFence(field, list = DEFAULT_LIST) {
  const lines = ["```collection", `source: links-here=${field}`];
  for (const [k, v] of Object.entries(list || {})) {
    if (k === "source") continue;
    lines.push(`${k}: ${v}`);
  }
  lines.push("```");
  return lines.join("\n");
}

/**
 * A note that gets the automatic list is a header above a card grid — an index
 * page. Lay it out as one (`index_frame: on`: header aligned with the cards, no
 * date pills) unless its author already chose, in a ::: settings block.
 */
export function asIndexPage(shapeSettings) {
  const s = { ...(shapeSettings || {}) };
  if (s.index_frame === undefined || s.index_frame === null || s.index_frame === "") s.index_frame = "on";
  return s;
}

/** Has the author already placed a links-here list for this field? Then don't add one. */
export function hasListFence(body, field) {
  const esc = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("```collection[\\s\\S]*?links-here\\s*=\\s*" + esc + "\\b[\\s\\S]*?```").test(
    String(body || ""),
  );
}

/**
 * Read every note in the configured target folders (drafts included) and index
 * them. `isPublished(relativePath)` says whether a note is built this run.
 */
export async function readFieldLinkTargets({ config = {}, fileIndex, contentDir, isPublished, unlistedFolders = [] }) {
  const fields = {};
  const unmatched = new Map(); // field → Set(values)
  for (const [field, { folder, list }] of Object.entries(config)) {
    const prefix = folder + "/";
    const notes = [];
    for (const page of Object.values(fileIndex?.pages || {})) {
      const rel = String(page.relativePath || "").replace(/\\/g, "/");
      if (!rel.startsWith(prefix)) continue;
      let frontmatter = {};
      try {
        frontmatter = matter(await fs.readFile(path.join(contentDir, rel), "utf-8")).data || {};
      } catch (e) {
        console.warn(`[field-links] could not read ${rel}: ${e.message}`);
        continue;
      }
      const tags = asList(frontmatter.tags).map(String);
      const linkable =
        isPublished(rel) && !isPageUnlisted({ frontmatter, tags, relativePath: rel, unlistedFolders });
      notes.push({ url: page.url, relativePath: rel, title: page.title, frontmatter, linkable });
    }
    const { index, warnings } = buildTargetIndex(notes);
    for (const w of warnings) console.warn(`[field-links] ${field}: ${w}`);
    console.log(`[field-links] ${field} → ${folder}/ (${notes.length} note(s), ${notes.filter((n) => n.linkable).length} linkable)`);
    fields[field] = { folder, list, index };
    unmatched.set(field, new Set());
  }

  return {
    fields,
    unmatched,
    /** Which fields list their pages onto this target note. */
    listsFor(relativePath) {
      const rel = String(relativePath || "").replace(/\\/g, "/");
      return Object.entries(fields)
        .filter(([, f]) => f.list && rel.startsWith(f.folder + "/"))
        .map(([field, f]) => ({ field, list: f.list }));
    },
  };
}

/**
 * Resolve one page's configured fields.
 * @returns {{ field_links: object|null, graphRefs: object|null }}
 */
export function applyFieldLinks(frontmatter, targets) {
  let fieldLinks = null;
  let graphRefs = null;
  for (const [field, { index }] of Object.entries(targets?.fields || {})) {
    const resolved = resolveFieldValue(frontmatter?.[field], index);
    if (!resolved.length) continue;
    (fieldLinks ||= {})[field] = resolved;
    const refs = resolved.filter((r) => r.href).map((r) => r.href);
    if (refs.length) (graphRefs ||= {})[field] = refs;
    for (const r of resolved) if (!r.name) targets.unmatched?.get(field)?.add(r.value);
  }
  return { field_links: fieldLinks, graphRefs };
}

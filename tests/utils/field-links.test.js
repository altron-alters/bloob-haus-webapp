/**
 * Field links — "a frontmatter field whose text matches a note in folder X (by
 * name / aliases) becomes a link to it, and that note can list the pages that
 * point to it."
 *
 * First user: alter-engineers. Every project carries a plain-text `architect`
 * (synced from the Project Profiles sheet); each firm is a note in
 * `architects/`. The sheet stays plain text, so the matching has to tolerate
 * the spellings people actually type: "Noll & Tam" / "Noll + Tam",
 * "HIBSER YAMAUCHI ARCHITECTS, INC." / "HY Architects", "ELS" / "ELS
 * Architecture and Urban Design". Aliases cover what normalising cannot.
 *
 * Off unless a site configures it (vault-first, _bloob-settings.md):
 *   field_links:
 *     architect: architects
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import {
  normalizeName,
  normalizeFieldLinksConfig,
  buildTargetIndex,
  resolveFieldValue,
  listFence,
  hasListFence,
  readFieldLinkTargets,
  applyFieldLinks,
  asIndexPage,
} from "../../scripts/utils/field-links.js";

// ── normalising names ────────────────────────────────────────────────────────

describe("normalizeName", () => {
  it("ignores case, punctuation and extra spaces", () => {
    expect(normalizeName("HIBSER YAMAUCHI ARCHITECTS, INC.")).toBe("hibser yamauchi architects inc");
    expect(normalizeName("  Jayson   Architecture ")).toBe("jayson architecture");
  });

  it("reads &, + and 'and' as the same word", () => {
    const a = normalizeName("Noll & Tam Architects");
    expect(normalizeName("Noll + Tam Architects")).toBe(a);
    expect(normalizeName("noll and tam architects")).toBe(a);
  });

  it("returns an empty string for nothing", () => {
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName(null)).toBe("");
  });
});

// ── the setting ──────────────────────────────────────────────────────────────

describe("normalizeFieldLinksConfig", () => {
  it("is empty (feature off) when a site does not set it", () => {
    expect(normalizeFieldLinksConfig(undefined)).toEqual({});
    expect(normalizeFieldLinksConfig(null)).toEqual({});
  });

  it("expands the shorthand `field: folder` to links plus a card list", () => {
    expect(normalizeFieldLinksConfig({ architect: "architects" })).toEqual({
      architect: { folder: "architects", list: { display: "cards" } },
    });
  });

  it("accepts the long form, and `list: false` turns the list off", () => {
    expect(
      normalizeFieldLinksConfig({
        architect: { folder: "/architects/", list: { display: "cards", show_fields: "location, sqft" } },
        owner: { folder: "clients-public", list: false },
      }),
    ).toEqual({
      architect: { folder: "architects", list: { display: "cards", show_fields: "location, sqft" } },
      owner: { folder: "clients-public", list: null },
    });
  });

  it("drops an entry without a folder instead of throwing", () => {
    expect(normalizeFieldLinksConfig({ architect: {}, owner: 42 })).toEqual({});
  });
});

// ── the index of link targets ────────────────────────────────────────────────

const NOTES = [
  {
    url: "/architects/noll-and-tam/",
    relativePath: "architects/noll-and-tam.md",
    frontmatter: { name: "Noll & Tam Architects", aliases: ["Noll + Tam"] },
    linkable: true,
  },
  {
    url: "/architects/hibser-yamauchi/",
    relativePath: "architects/hibser-yamauchi.md",
    frontmatter: { name: "Hibser Yamauchi Architects", aliases: "HY Architects" },
    linkable: false, // draft: name known, no page to link to
  },
  {
    url: "/architects/els/",
    relativePath: "architects/els.md",
    frontmatter: { title: "ELS Architecture and Urban Design" },
    linkable: true,
  },
];

describe("buildTargetIndex", () => {
  const { index } = buildTargetIndex(NOTES);

  it("finds a note by its name, its aliases, its title and its filename", () => {
    expect(index.get(normalizeName("Noll & Tam Architects")).url).toBe("/architects/noll-and-tam/");
    expect(index.get(normalizeName("Noll + Tam")).url).toBe("/architects/noll-and-tam/");
    expect(index.get(normalizeName("HY Architects")).url).toBe("/architects/hibser-yamauchi/");
    expect(index.get(normalizeName("ELS Architecture and Urban Design")).url).toBe("/architects/els/");
    expect(index.get(normalizeName("els")).url).toBe("/architects/els/"); // filename
  });

  it("uses `name`, else the title, as the display name", () => {
    expect(index.get("hy architects").name).toBe("Hibser Yamauchi Architects");
    expect(index.get("els").name).toBe("ELS Architecture and Urban Design");
  });

  it("keeps the first note when two claim the same name, and says so", () => {
    const { index: idx, warnings } = buildTargetIndex([
      ...NOTES,
      { url: "/architects/other/", relativePath: "architects/other.md", frontmatter: { aliases: ["Noll + Tam"] }, linkable: true },
    ]);
    expect(idx.get(normalizeName("Noll + Tam")).url).toBe("/architects/noll-and-tam/");
    expect(warnings.join("\n")).toMatch(/noll \+ tam|noll and tam/i);
  });
});

// ── resolving a page's field ─────────────────────────────────────────────────

describe("resolveFieldValue", () => {
  const { index } = buildTargetIndex(NOTES);

  it("links a match whose note is published", () => {
    expect(resolveFieldValue("NOLL AND TAM ARCHITECTS", index)).toEqual([
      { value: "NOLL AND TAM ARCHITECTS", name: "Noll & Tam Architects", href: "/architects/noll-and-tam/" },
    ]);
  });

  it("gives the display name but no link when the note is not published", () => {
    expect(resolveFieldValue("HY Architects", index)).toEqual([
      { value: "HY Architects", name: "Hibser Yamauchi Architects", href: null },
    ]);
  });

  it("keeps the raw text when nothing matches", () => {
    expect(resolveFieldValue("Bartos", index)).toEqual([{ value: "Bartos", name: null, href: null }]);
  });

  it("returns nothing for blanks and placeholders", () => {
    for (const blank of [undefined, null, "", "  ", "N/A", "n/a", "none", "-"]) {
      expect(resolveFieldValue(blank, index), String(blank)).toEqual([]);
    }
  });

  it("resolves each entry of a list", () => {
    expect(resolveFieldValue(["ELS", "Bartos"], index).map((r) => r.href)).toEqual(["/architects/els/", null]);
  });
});

// ── the list on the target note ──────────────────────────────────────────────

describe("listFence", () => {
  it("is a collection of the pages whose field links here, with the configured display", () => {
    expect(listFence("architect", { display: "cards", show_fields: "location, sqft" })).toBe(
      "```collection\nsource: links-here=architect\ndisplay: cards\nshow_fields: location, sqft\n```",
    );
  });

  it("is detected when the author already placed one, so it is never added twice", () => {
    expect(hasListFence("text\n\n```collection\nsource: links-here=architect\n```\n", "architect")).toBe(true);
    expect(hasListFence("```collection\nsource: folder=projects\n```", "architect")).toBe(false);
  });

  it("a plain `links-here` list (any link) also counts, so no duplicate list is appended", () => {
    expect(hasListFence("```collection\nsource: links-here\ndisplay: cards\n```", "architect")).toBe(true);
    expect(hasListFence("```collection\nsource: links-here\n```", "architect")).toBe(true);
    expect(hasListFence("```collection\nsource: links-here=owner\n```", "architect")).toBe(false);
  });
});

// ── a target note with a list is an index page ───────────────────────────────
//
// A firm page is a header above a wide card grid — the shape of an index page.
// So a note that gets the automatic list is laid out as one (index_frame: on →
// header lines up with the cards, no "Written on" pill), unless its author said
// otherwise in a ::: settings block.

describe("asIndexPage", () => {
  it("turns the index frame on for a note that lists pages", () => {
    expect(asIndexPage({})).toEqual({ index_frame: "on" });
    expect(asIndexPage(undefined)).toEqual({ index_frame: "on" });
    expect(asIndexPage({ share_bar: false })).toEqual({ share_bar: false, index_frame: "on" });
  });

  it("leaves an author's own choice alone", () => {
    expect(asIndexPage({ index_frame: "off" })).toEqual({ index_frame: "off" });
    expect(asIndexPage({ index_frame: false })).toEqual({ index_frame: false });
  });
});

// ── reading targets from a vault (fixture) + applying to a page ──────────────

describe("readFieldLinkTargets + applyFieldLinks", () => {
  let dir;
  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "field-links-"));
    await fs.outputFile(
      path.join(dir, "architects/jayson.md"),
      "---\nname: Jayson Architecture\naliases: [Jayson Architects]\nwebsite_status: public\n---\n",
    );
    await fs.outputFile(
      path.join(dir, "architects/hibser.md"),
      "---\nname: Hibser Yamauchi Architects\naliases: [HY Architects]\nwebsite_status: draft\n---\n",
    );
    await fs.outputFile(
      path.join(dir, "architects/secret.md"),
      "---\nname: Secret Partner\nwebsite_status: unlisted\n---\n",
    );
  });
  afterAll(async () => {
    await fs.remove(dir);
  });

  const fileIndex = {
    pages: {
      "architects/jayson": { url: "/architects/jayson/", relativePath: "architects/jayson.md", title: "jayson" },
      "architects/hibser": { url: "/architects/hibser/", relativePath: "architects/hibser.md", title: "hibser" },
      "architects/secret": { url: "/architects/secret/", relativePath: "architects/secret.md", title: "secret" },
      "projects/campbell": { url: "/projects/campbell/", relativePath: "projects/campbell.md", title: "Campbell" },
    },
  };
  const published = new Set(["architects/jayson.md", "architects/secret.md", "projects/campbell.md"]);
  const config = normalizeFieldLinksConfig({ architect: "architects" });

  it("links only published, listed notes; drafts and unlisted notes give a name only", async () => {
    const targets = await readFieldLinkTargets({ config, fileIndex, contentDir: dir, isPublished: (p) => published.has(p) });
    const fm = (architect) => applyFieldLinks({ architect }, targets).field_links.architect[0];
    expect(fm("Jayson Architects")).toEqual({ value: "Jayson Architects", name: "Jayson Architecture", href: "/architects/jayson/" });
    expect(fm("HY Architects").href).toBeNull();
    expect(fm("Secret Partner").href).toBeNull(); // unlisted: never linked from a public page
  });

  it("returns the graph refs for links, and nothing for a page without the field", async () => {
    const targets = await readFieldLinkTargets({ config, fileIndex, contentDir: dir, isPublished: (p) => published.has(p) });
    expect(applyFieldLinks({ architect: "Jayson Architecture" }, targets).graphRefs).toEqual({
      architect: ["/architects/jayson/"],
    });
    expect(applyFieldLinks({ title: "No architect" }, targets)).toEqual({ field_links: null, graphRefs: null });
  });

  it("tells a page in a target folder which fields list onto it", async () => {
    const targets = await readFieldLinkTargets({ config, fileIndex, contentDir: dir, isPublished: (p) => published.has(p) });
    expect(targets.listsFor("architects/jayson.md")).toEqual([{ field: "architect", list: { display: "cards" } }]);
    expect(targets.listsFor("projects/campbell.md")).toEqual([]);
  });

  it("does nothing at all when the site has no field_links", async () => {
    const targets = await readFieldLinkTargets({ config: {}, fileIndex, contentDir: dir, isPublished: () => true });
    expect(applyFieldLinks({ architect: "Jayson Architecture" }, targets)).toEqual({ field_links: null, graphRefs: null });
  });
});

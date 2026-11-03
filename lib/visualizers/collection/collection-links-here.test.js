/**
 * `source: links-here=<field>` — the pages whose <field> links to THIS page.
 *
 * The list side of field links (scripts/utils/field-links.js): a project's
 * plain-text `architect` resolves to a firm note, the project's graph node
 * records `field_links: { architect: ["/architects/jayson/"] }`, and the firm
 * page lists every page pointing at it. Built from the match — no
 * hand-maintained list. Pure: the current page's URL is injected.
 */

import { describe, it, expect } from "vitest";
import { parseSource, filterNodes, resolvePages } from "./resolve.js";

const NODES = [
  { id: "/projects/campbell/", title: "Campbell Library", type: "page", section: "projects", field_links: { architect: ["/architects/jayson/"] } },
  { id: "/projects/santa-cruz/", title: "Santa Cruz Library", type: "page", section: "projects", field_links: { architect: ["/architects/jayson/"] } },
  { id: "/projects/laney/", title: "Laney LRC", type: "page", section: "projects", field_links: { architect: ["/architects/noll-and-tam/"] } },
  { id: "/projects/old/", title: "Old one", type: "page", section: "projects", website_status: "archived", field_links: { architect: ["/architects/jayson/"] } },
  { id: "/projects/owned/", title: "Owned", type: "page", section: "projects", field_links: { owner: ["/architects/jayson/"] } },
  { id: "/projects/plain/", title: "No links", type: "page", section: "projects" },
  { id: "/tags/library/", title: "#library", type: "tag", section: "tags" },
];

const ids = (pages) => pages.map((p) => p.id).sort();

describe("parseSource — links-here", () => {
  it("reads the field name", () => {
    expect(parseSource("links-here=architect")).toEqual({ type: "links-here", field: "architect" });
  });

  it("without a field means any field", () => {
    expect(parseSource("links-here")).toEqual({ type: "links-here", field: null });
  });
});

describe("filterNodes — links-here", () => {
  it("lists the pages whose field links to the current page", () => {
    expect(ids(filterNodes(NODES, "links-here=architect", { pageUrl: "/architects/jayson/" }))).toEqual([
      "/projects/campbell/",
      "/projects/santa-cruz/",
    ]);
  });

  it("compares URLs the forgiving way (case, trailing slash)", () => {
    expect(filterNodes(NODES, "links-here=architect", { pageUrl: "/Architects/Jayson" })).toHaveLength(2);
  });

  it("without a field, any field counts", () => {
    expect(ids(filterNodes(NODES, "links-here", { pageUrl: "/architects/jayson/" }))).toEqual([
      "/projects/campbell/",
      "/projects/owned/",
      "/projects/santa-cruz/",
    ]);
  });

  it("leaves archived pages out, like every other source", () => {
    expect(ids(filterNodes(NODES, "links-here=architect", { pageUrl: "/architects/jayson/" }))).not.toContain("/projects/old/");
  });

  it("lists nothing when it does not know which page it is on", () => {
    expect(filterNodes(NODES, "links-here=architect")).toEqual([]);
  });

  it("flows through resolvePages with the page URL", () => {
    const pages = resolvePages(NODES, { source: "links-here=architect" }, { pageUrl: "/architects/noll-and-tam/" });
    expect(ids(pages)).toEqual(["/projects/laney/"]);
  });
});

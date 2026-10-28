/**
 * Which built pages belong in sitemap.xml.
 *
 * `eleventyExcludeFromCollections` has two shapes: `true` (out of every collection) and an
 * array of collection names (out of those lists only). Folder indexes and the homepage carry
 * `["tagList"]`; treating the array as "exclude" dropped them from every sitemap — verified
 * live 2026-10-28: leons.bloob.haus/sitemap.xml had no homepage.
 */
import { describe, it, expect } from "vitest";
import { sitemapPages } from "../../scripts/utils/sitemap-pages.js";

const item = (url, data = {}, outputPath = `_site${url}index.html`) => ({ url, outputPath, data });

describe("sitemapPages", () => {
  it("keeps the homepage even when it is excluded from the tag list only", () => {
    const urls = sitemapPages([item("/", { eleventyExcludeFromCollections: ["tagList"] })]).map((p) => p.url);
    expect(urls).toEqual(["/"]);
  });

  it("keeps a folder index excluded from the tag list only", () => {
    const urls = sitemapPages([item("/projects/", { eleventyExcludeFromCollections: ["tagList"] })]).map((p) => p.url);
    expect(urls).toEqual(["/projects/"]);
  });

  it("drops a page excluded from every collection", () => {
    expect(sitemapPages([item("/x/", { eleventyExcludeFromCollections: true })])).toEqual([]);
  });

  it("drops an unlisted page", () => {
    expect(sitemapPages([item("/clients/a8f3k2/", { _bloob_unlisted: true })])).toEqual([]);
  });

  it("drops the 404 page", () => {
    expect(sitemapPages([item("/404.html", {}, "_site/404.html")])).toEqual([]);
  });

  it("drops non-HTML outputs and pages with no URL", () => {
    expect(sitemapPages([item("/feed.xml", {}, "_site/feed.xml"), item(false, {}, false)])).toEqual([]);
  });

  it("sorts by URL", () => {
    const urls = sitemapPages([item("/b/"), item("/"), item("/a/")]).map((p) => p.url);
    expect(urls).toEqual(["/", "/a/", "/b/"]);
  });
});

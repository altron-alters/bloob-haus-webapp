/**
 * Which built pages belong in sitemap.xml (themes/_base/pages/sitemap.njk, registered as the
 * `sitemapPages` filter in eleventy.config.js).
 *
 * `eleventyExcludeFromCollections` has two shapes: `true` = out of every collection, an array
 * = out of those named lists only. Folder indexes and the homepage carry `["tagList"]`, so only
 * `true` drops a page here. Unlisted pages never appear (security-by-obscurity.md).
 */

/**
 * @param {Array<{url: string|false, outputPath: string|false, data: object}>} items  collections.all
 * @returns {Array} the items to list, sorted by url
 */
export function sitemapPages(items = []) {
  return items
    .filter((item) => {
      if (typeof item.url !== "string" || item.url === "/404.html") return false;
      if (typeof item.outputPath !== "string" || !item.outputPath.endsWith(".html")) return false;
      const data = item.data || {};
      if (data._bloob_unlisted) return false;
      return data.eleventyExcludeFromCollections !== true;
    })
    .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
}

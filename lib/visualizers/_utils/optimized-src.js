/**
 * optimizedSrc(src) — build-time (Node) helper for shapes that write their own <img>.
 *
 * The site's optimizeImages transform resizes images that come from markdown into
 * /media/optimized/<name>-<width>w.webp, but it runs BEFORE the visualizer transforms,
 * so images a shape renders itself (team photos, image-text) ship the multi-MB original.
 *
 * This returns the URL of a resized WebP copy, creating it on a cache miss. Transforms
 * are synchronous, so creation runs sharp in a short child process (once per image per
 * fresh build; cached in <SRC_DIR>/media/optimized like optimizeImages' output, and
 * copied to _site/media/optimized because passthrough copy already ran).
 * On any failure it returns src unchanged.
 */
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const RESIZE_SCRIPT = `
const sharp = require("sharp");
const [input, output, width] = process.argv.slice(1);
sharp(input).rotate().resize({ width: Number(width), withoutEnlargement: true }).webp({ quality: 80 }).toFile(output)
  .catch((e) => { console.error(e.message); process.exit(1); });
`;

export function optimizedSrc(src, width = 1200) {
  if (!src || !src.startsWith("/media/") || /\.(svg|gif|webp)$/i.test(src)) return src;
  let rel;
  try {
    rel = decodeURIComponent(src);
  } catch {
    rel = src;
  }
  const name = basename(rel, extname(rel));
  const file = `${name}-${width}w.webp`;
  const url = `/media/optimized/${encodeURIComponent(name)}-${width}w.webp`;
  const srcDir = process.env.SRC_DIR || join(ROOT_DIR, "src");
  const cached = join(srcDir, "media", "optimized", file);
  const siteFile = join(ROOT_DIR, "_site", "media", "optimized", file);

  try {
    if (!existsSync(cached)) {
      const input = join(srcDir, rel);
      if (!existsSync(input)) return src;
      mkdirSync(dirname(cached), { recursive: true });
      execFileSync(process.execPath, ["-e", RESIZE_SCRIPT, input, cached, String(width)], {
        cwd: ROOT_DIR,
        stdio: ["ignore", "ignore", "pipe"],
        timeout: 60000,
      });
    }
    if (existsSync(join(ROOT_DIR, "_site")) && !existsSync(siteFile)) {
      mkdirSync(dirname(siteFile), { recursive: true });
      copyFileSync(cached, siteFile);
    }
    return existsSync(cached) ? url : src;
  } catch (e) {
    console.warn(`[optimized-src] Could not resize ${src}: ${e.message}`);
    return src;
  }
}

/**
 * GIF→MP4 conversion step
 *
 * Converts all .gif files in srcDir to .mp4 using the bundled ffmpeg binary.
 * GIFs under 25 MiB are kept alongside their MP4 (for direct-download access).
 * GIFs over 25 MiB are removed after conversion — Cloudflare Pages rejects them.
 *
 * Skips files that already have a .mp4 counterpart (cache-safe for dev rebuilds).
 * Opt-out: set `media: convert_gif_to_mp4: false` in _bloob-settings.md.
 *
 * ffmpeg args:
 *   -movflags faststart   puts moov atom first for streaming
 *   -pix_fmt yuv420p      broad browser compat (required by H.264)
 *   -vf scale=...         enforces even dimensions (H.264 requirement)
 */

import { execSync } from "child_process";
import { existsSync, unlinkSync, readdirSync, statSync } from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";

const CF_PAGES_LIMIT = 25 * 1024 * 1024; // 25 MiB — Cloudflare Pages per-file limit

function findGifs(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findGifs(full));
    } else if (entry.isFile() && /\.gif$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * @param {{ srcDir: string, config: object }} options
 * @returns {{ converted: string[], skipped: string[], errors: Array<{file,error}> }}
 */
export async function optimizeGifs({ srcDir, config }) {
  if (config?.media?.convert_gif_to_mp4 === false) {
    console.log("[optimize-gifs] Disabled via media.convert_gif_to_mp4 — skipping.");
    return { converted: [], skipped: [], errors: [] };
  }

  const gifs = findGifs(srcDir);

  if (gifs.length === 0) {
    console.log("[optimize-gifs] No GIF files found.");
    return { converted: [], skipped: [], errors: [] };
  }

  console.log(`[optimize-gifs] Found ${gifs.length} GIF(s) to process`);

  const converted = [];
  const skipped = [];
  const errors = [];

  for (const gifPath of gifs) {
    const mp4Path = gifPath.replace(/\.gif$/i, ".mp4");
    const name = path.basename(gifPath);

    if (existsSync(mp4Path)) {
      const gifSize = statSync(gifPath).size;
      if (gifSize > CF_PAGES_LIMIT) {
        console.log(`[optimize-gifs] Cached — removing oversized GIF (${(gifSize / 1024 / 1024).toFixed(1)} MiB): ${name}`);
        unlinkSync(gifPath);
      } else {
        console.log(`[optimize-gifs] Cached — keeping GIF: ${name}`);
      }
      skipped.push(name);
      continue;
    }

    try {
      console.log(`[optimize-gifs] Converting: ${name}`);
      execSync(
        `"${ffmpegPath}" -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}" -y`,
        { stdio: "pipe" },
      );
      const gifSize = statSync(gifPath).size;
      if (gifSize > CF_PAGES_LIMIT) {
        unlinkSync(gifPath);
        console.log(`[optimize-gifs] ✓ ${name} → ${path.basename(mp4Path)} (GIF removed, ${(gifSize / 1024 / 1024).toFixed(1)} MiB > CF limit)`);
      } else {
        console.log(`[optimize-gifs] ✓ ${name} → ${path.basename(mp4Path)} (GIF kept)`);
      }
      converted.push(name);
    } catch (err) {
      console.warn(`[optimize-gifs] ✗ Failed to convert ${name}: ${err.message}`);
      try {
        const gifSize = statSync(gifPath).size;
        if (gifSize > CF_PAGES_LIMIT) {
          console.warn(`[optimize-gifs]   Removing oversized GIF (${(gifSize / 1024 / 1024).toFixed(1)} MiB) — conversion failed, too large to deploy`);
          unlinkSync(gifPath);
        }
      } catch {
        // GIF may already be gone — nothing to do
      }
      errors.push({ file: name, error: err.message });
    }
  }

  console.log(
    `[optimize-gifs] Done — converted: ${converted.length}, cached: ${skipped.length}, errors: ${errors.length}`,
  );
  return { converted, skipped, errors };
}

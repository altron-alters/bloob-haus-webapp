/**
 * GIF→MP4 conversion step
 *
 * Converts all .gif files in srcDir to .mp4 using the bundled ffmpeg binary,
 * then removes the originals so they are never deployed to Cloudflare Pages.
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
import { existsSync, unlinkSync, readdirSync } from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";

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
      console.log(`[optimize-gifs] Cached — removing GIF: ${name}`);
      unlinkSync(gifPath);
      skipped.push(name);
      continue;
    }

    try {
      console.log(`[optimize-gifs] Converting: ${name}`);
      execSync(
        `"${ffmpegPath}" -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}" -y`,
        { stdio: "pipe" },
      );
      unlinkSync(gifPath);
      converted.push(name);
      console.log(`[optimize-gifs] ✓ ${name} → ${path.basename(mp4Path)}`);
    } catch (err) {
      console.warn(`[optimize-gifs] ✗ Failed to convert ${name}: ${err.message}`);
      errors.push({ file: name, error: err.message });
    }
  }

  console.log(
    `[optimize-gifs] Done — converted: ${converted.length}, cached: ${skipped.length}, errors: ${errors.length}`,
  );
  return { converted, skipped, errors };
}

/**
 * sweepEmptyFiles(dir) — delete 0-byte files directly inside `dir`.
 *
 * Used on the optimized-image cache (<SRC>/media/optimized): a build killed mid-write can
 * leave an empty file there, and the cache treats any existing file as done, so that size of
 * the image would stay blank forever (seen 2026-11-19: a 1620w WebP that high-density screens
 * pick). Removing it makes the next build regenerate it. Returns how many were removed.
 */
import { existsSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";

export function sweepEmptyFiles(dir) {
  let removed = 0;
  if (!dir || !existsSync(dir)) return removed;
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    try {
      const st = statSync(file);
      if (st.isFile() && st.size === 0) {
        unlinkSync(file);
        removed++;
      }
    } catch {
      /* a file that vanished mid-sweep is fine */
    }
  }
  return removed;
}

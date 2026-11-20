import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { sweepEmptyFiles } from "../scripts/utils/sweep-empty-files.js";

describe("sweepEmptyFiles (optimized-image cache)", () => {
  it("removes 0-byte files so a half-written image is regenerated, keeps real ones", () => {
    const dir = mkdtempSync(join(tmpdir(), "bh-sweep-"));
    writeFileSync(join(dir, "Alter-6-1620w.webp"), "");
    writeFileSync(join(dir, "Alter-6-1200w.webp"), "RIFFxxxxWEBP");
    mkdirSync(join(dir, "sub"));
    expect(sweepEmptyFiles(dir)).toBe(1);
    expect(existsSync(join(dir, "Alter-6-1620w.webp"))).toBe(false);
    expect(existsSync(join(dir, "Alter-6-1200w.webp"))).toBe(true);
    expect(existsSync(join(dir, "sub"))).toBe(true);
  });

  it("is a no-op for a missing directory", () => {
    expect(sweepEmptyFiles(join(tmpdir(), "bh-does-not-exist-xyz"))).toBe(0);
    expect(sweepEmptyFiles(undefined)).toBe(0);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock ffmpeg-static (no real binary needed) and child_process execSync.
// vi.mock is hoisted above imports by Vitest's transform.
vi.mock('ffmpeg-static', () => ({ default: '/fake/ffmpeg' }));

vi.mock('child_process', () => ({
  execSync: vi.fn((cmd) => {
    // Simulate ffmpeg: write a placeholder .mp4 at the output path.
    // The output path is the last double-quoted token in the command.
    const matches = [...cmd.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const outPath = matches[matches.length - 1];
    if (outPath?.endsWith('.mp4')) {
      fs.outputFileSync(outPath, Buffer.alloc(4));
    }
  }),
}));

import { execSync } from 'child_process';
import { optimizeGifs } from '../../scripts/optimize-gifs.js';

describe('optimizeGifs', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'optimize-gifs-test-'));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('converts a GIF to MP4 and removes the original', async () => {
    const gifPath = path.join(tmpDir, 'animation.gif');
    await fs.writeFile(gifPath, Buffer.from('fake gif content'));

    const result = await optimizeGifs({ srcDir: tmpDir, config: {} });

    expect(result.converted).toContain('animation.gif');
    expect(result.skipped).toHaveLength(0);
    expect(fs.existsSync(gifPath)).toBe(false);
    expect(fs.existsSync(gifPath.replace('.gif', '.mp4'))).toBe(true);
    expect(execSync).toHaveBeenCalledOnce();
  });

  it('skips conversion when MP4 already exists (cache hit), still removes the GIF', async () => {
    const gifPath = path.join(tmpDir, 'animation.gif');
    const mp4Path = path.join(tmpDir, 'animation.mp4');
    await fs.writeFile(gifPath, Buffer.from('fake gif content'));
    await fs.writeFile(mp4Path, Buffer.from('existing mp4'));

    const result = await optimizeGifs({ srcDir: tmpDir, config: {} });

    expect(result.skipped).toContain('animation.gif');
    expect(result.converted).toHaveLength(0);
    expect(fs.existsSync(gifPath)).toBe(false);
    expect(fs.existsSync(mp4Path)).toBe(true);
    expect(execSync).not.toHaveBeenCalled();
  });

  it('does nothing when convert_gif_to_mp4 is false', async () => {
    const gifPath = path.join(tmpDir, 'animation.gif');
    await fs.writeFile(gifPath, Buffer.from('fake gif content'));

    const result = await optimizeGifs({
      srcDir: tmpDir,
      config: { media: { convert_gif_to_mp4: false } },
    });

    expect(result.converted).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(fs.existsSync(gifPath)).toBe(true);
    expect(execSync).not.toHaveBeenCalled();
  });

  it('handles nested GIFs in subdirectories', async () => {
    const subDir = path.join(tmpDir, 'media');
    await fs.ensureDir(subDir);
    const gifPath = path.join(subDir, 'deep.gif');
    await fs.writeFile(gifPath, Buffer.from('fake gif'));

    const result = await optimizeGifs({ srcDir: tmpDir, config: {} });

    expect(result.converted).toContain('deep.gif');
    expect(fs.existsSync(gifPath)).toBe(false);
    expect(fs.existsSync(gifPath.replace('.gif', '.mp4'))).toBe(true);
  });
});

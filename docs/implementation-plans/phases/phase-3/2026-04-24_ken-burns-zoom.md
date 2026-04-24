# Ken Burns Zoom — Implementation Plan
**Date:** 2026-04-24  
**Status:** Planning

---

## What we're building

Two paired things that ship as one feature:

| Artifact | Type | Purpose |
|----------|------|---------|
| `ken-burns-zoom-builder` | GUI magic machine | Interactive authoring tool: upload image, define start/end crop rects, export video or copy embed snippet |
| `ken-burns-zoom` | Runtime visualizer | Renders a Ken Burns animation on a hosted image using a config snippet — no video, pure CSS/JS |

**Paired via:** the `::: ken-burns-zoom` markdown fence the builder outputs.

**Hosted at:** `{subdomain}.bloob.haus/magic-machine/ken-burns-zoom-builder/` (auto-served via existing manifest route system — see `eleventy.config.js` lines 94–101)

---

## Core architectural rule: shared engine

> **The animation engine is written once in the visualizer and loaded by the magic machine. They must never diverge.**

This is the pattern `scene-nav` was supposed to implement but didn't — `scene-nav-builder/app/index.html` duplicates the render logic from `scene-nav/renderer.js`. See `docs/architecture/magic-machines.md` → "Shared Logic: Builder vs. Visualizer (Future Refactor)" for the documented gap we are solving here.

### File structure

```
lib/visualizers/ken-burns-zoom/
├── engine.js        ← SHARED animation engine (KenBurnsEngine class)
├── browser.js       ← visualizer entry: reads DOM → parses config → runs engine
├── index.js         ← build-time transform: generates <div data-settings='...'>
├── styles.css       ← visualizer CSS (must use var(--token) from theme main.css)
├── schema.md        ← canonical field reference — source of truth for both sides
└── manifest.json

lib/magic-machines/ken-burns-zoom-builder/
├── manifest.json    ← route: "/magic-machine/ken-burns-zoom-builder/"
└── app/
    └── index.html   ← loads engine.js from /assets/visualizers/ken-burns-zoom/engine.js
```

### Why engine.js lives in the visualizer

The visualizer is the "consumer" side — it's what end users see on the website. The magic machine is the "authoring" tool. The canonical rendering contract should live on the consumer side so the builder is forced to stay in sync with what the site actually renders.

**The builder must never contain its own animation loop.** All preview animation in the magic machine must be powered by `engine.js`.

### How the magic machine loads engine.js

The magic machine is hosted-only (FFmpeg.wasm requires `SharedArrayBuffer`, which requires hosted COOP/COEP headers — `file://` doesn't work). Since it will always run on the site, it can reference an absolute asset path:

```html
<!-- In ken-burns-zoom-builder/app/index.html -->
<script src="/assets/visualizers/ken-burns-zoom/engine.js"></script>
```

The build pipeline must passthrough-copy `engine.js` as a public asset. Add to `eleventy.config.js` (or handle via `bundle-visualizers.js` — check current bundler behavior first).

### engine.js contract

`engine.js` must be a plain IIFE or UMD module (no ESM `import` — magic machine is a standalone HTML file with no bundler). It exposes `window.KenBurnsEngine` or equivalent.

```js
// engine.js — exported API
class KenBurnsEngine {
  constructor(container, imgEl, config) { ... }
  // config: { startRect, endRect, duration, easing, direction, playback, arW, arH }
  
  play()
  pause()
  seek(t)       // t: 0–1
  destroy()
  
  // Renders a single frame at t without playing
  renderFrame(t)
}
```

`browser.js` (visualizer) and the magic machine's preview panel both instantiate `KenBurnsEngine`. Same params, same behavior, guaranteed.

---

## Phase 1 — Fix prototype + place in codebase

**Reference docs:**
- `docs/architecture/magic-machines.md` — GUI machine conventions, manifest format, `pairs_with` field
- `lib/magic-machines/youtube-non-addictive-interface/manifest.json` — manifest template to copy

**Tasks:**

1. **Fix easing JS bug** in prototype — line 1071 has orphaned handler code; the ease-group `addEventListener` call is missing its opening line. Easing segmented control is broken.

2. **Rename snippet output** — `::: ken-burns-image-zoom` → `::: ken-burns-zoom` everywhere in the prototype JS (`updateBloobSnippet()` function).

3. **Strip the inline preview animation** from the prototype — the `tickPreview` / `renderPreviewFrame` / `easingFns` block in the prototype's `<script>` will be replaced by `engine.js`. Remove it before wiring the engine so there's no dead code left.

4. **Create folder structure** and `manifest.json`:

```json
{
  "name": "ken-burns-zoom-builder",
  "type": "gui",
  "version": "0.1.0",
  "description": "Design a Ken Burns zoom animation on a still image. Export as video or copy an embed snippet for the ken-burns-zoom visualizer.",
  "pairs_with": "ken-burns-zoom",
  "route": "/magic-machine/ken-burns-zoom-builder/",
  "app": {
    "entry": "app/index.html",
    "standalone": false,
    "description": "Must be served — requires COOP/COEP headers for FFmpeg.wasm."
  }
}
```

Note `standalone: false` — distinguishes this from `scene-nav-builder` which opens via `file://`.

5. **Verify auto-discovery** — run `npm run dev:alter-engineers` and confirm the machine appears at `/magic-machine/ken-burns-zoom-builder/`.

---

## Phase 2 — Build engine.js + visualizer shell

**Reference docs:**
- `docs/architecture/visualizers.md` — visualizer types (runtime), `browser.js` ownership convention, CSS token requirement
- `lib/visualizers/scene-nav/renderer.js` — example of a shared module in the visualizer folder
- `lib/visualizers/scene-nav/browser.js` — example browser.js pattern
- `docs/architecture/settings-registry.md` — register new visualizer settings here when done

**Tasks:**

6. **Write `engine.js`** — extract the animation loop from the prototype into `KenBurnsEngine` class (IIFE/UMD, no ESM). API as specified above.

7. **Wire engine.js into the magic machine** — replace the prototype's inline animation code with `<script src="/assets/visualizers/ken-burns-zoom/engine.js">` + instantiation code.

8. **Write `schema.md`** — canonical field reference. This is the source of truth that keeps the builder's snippet output and the visualizer's parser in sync. Define every field, its type, default, and valid values.

9. **Write `browser.js`** (visualizer runtime) — reads `data-settings` from the DOM, instantiates `KenBurnsEngine`, handles play/pause lifecycle.

10. **Write `index.js`** (build-time transform) — parses `::: ken-burns-zoom` fence, outputs `<div class="vis-ken-burns-zoom" data-settings='...'>`.

11. **Write `styles.css`** — scoped to `.vis-ken-burns-zoom`. Must use `var(--token)` from theme `main.css` per the CSS token standard (see 2026-03-19 decision in `DECISIONS.md`).

12. **Make engine.js a passthrough asset** — ensure `bundle-visualizers.js` or `eleventy.config.js` copies `engine.js` to `/assets/visualizers/ken-burns-zoom/engine.js` in the built site.

13. **Add to settings registry** — update `docs/architecture/settings-registry.md` with all new frontmatter fields.

---

## Phase 3 — FFmpeg video export

**Reference docs:**
- `docs/architecture/magic-machines.md` — GUI machine conventions
- Cloudflare `_headers` file format (external)

**Tasks:**

14. **Add COOP/COEP headers** — required for `SharedArrayBuffer` (FFmpeg.wasm dependency). Add to Cloudflare Pages `_headers` file:

```
/magic-machine/ken-burns-zoom-builder/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

15. **Add FFmpeg.wasm loading with progress bar** — load `@ffmpeg/ffmpeg@0.12.10` from CDN. The WASM binary is ~30MB and only works when hosted (not `file://`). Show a loading bar in the UI while it downloads; after first load it's cached in the browser. The Export Video button should be disabled until FFmpeg is ready.

Loading sequence:
```
[Loading Ken Burns engine…  ████░░░░  42%]
(downloads once, cached after)
```

16. **Wire "Export Video" button** — canvas frame renderer:
  - For each frame `i` in `0..fps*duration`:
    - Compute `t = i / (fps * duration)`
    - Call `engine.renderFrame(t)` on an offscreen canvas
    - Export canvas as JPEG (`toBlob`) → write to FFmpeg virtual FS as `frame{i:04d}.jpg`
  - Run: `ffmpeg.exec(['-framerate', fps, '-i', 'frame%04d.jpg', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'output.mp4'])`
  - Read back → Blob → download

Show progress during frame rendering (frame N of total) and during FFmpeg encode pass.

---

## Phase 4 — Polish + image path resolution

17. **Resolve `image: [[filename.jpg]]`** wikilink in the visualizer — the visualizer needs to find the image in `/media/` the same way other visualizers resolve image paths. Check how existing visualizers handle `![[image.jpg]]` resolution.

18. **Add touch/pointer events** to rect drag in the magic machine — currently mouse-only. Use `pointerdown/pointermove/pointerup` instead of `mousedown/mousemove/mouseup`.

19. **Test on alter-engineers site** — add a test page with a `::: ken-burns-zoom` fence and confirm the visualizer animates correctly.

---

## Schema (field reference — canonical)

Also written to `lib/visualizers/ken-burns-zoom/schema.md`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `image` | wikilink | required | `[[filename.jpg]]` — resolved to `/media/` path |
| `duration` | number | `8` | Animation duration in seconds (3–30) |
| `fps` | 15\|24\|30 | `24` | Frames per second (video export only; visualizer ignores) |
| `easing` | string | `linear` | `linear` / `ease-in` / `ease-out` / `ease-in-out` |
| `aspect-ratio` | string | `16:9` | Output crop ratio: `1:1` / `9:16` / `16:9` / `4:3` / `W:H` |
| `direction` | `in`\|`out` | `in` | `in` = start-rect → end-rect (zoom in); `out` = reverse |
| `playback` | string | `loop` | `loop` / `hold` / `bounce` |
| `start-x` | percent | `5.00%` | Start rect left edge, % of image width |
| `start-y` | percent | `5.00%` | Start rect top edge, % of image height |
| `start-w` | percent | `90.00%` | Start rect width, % of image width |
| `start-h` | percent | `50.63%` | Start rect height, % of image height |
| `end-x` | percent | `25.00%` | End rect left edge |
| `end-y` | percent | `20.00%` | End rect top edge |
| `end-w` | percent | `50.00%` | End rect width |
| `end-h` | percent | `28.13%` | End rect height |

### Example snippet (builder output)

```
::: ken-burns-zoom
image: [[campbell-library.jpg]]
duration: 8
fps: 24
easing: linear
aspect-ratio: 16:9
direction: in
playback: loop
start-x: 5.00%
start-y: 5.00%
start-w: 90.00%
start-h: 50.63%
end-x: 25.00%
end-y: 20.00%
end-w: 50.00%
end-h: 28.13%
:::
```

---

## Open questions

- [ ] How does `bundle-visualizers.js` currently work — does it only bundle `browser.js`, or does it copy all files in the visualizer folder? Check before writing the passthrough-copy step for `engine.js`.
- [ ] Does the alter-engineers site or leon's personal site get the visualizer first? (determines which `sites/*.yaml` gets `ken-burns-zoom` added to features)
- [ ] Should `playback: loop/bounce` apply during video export, or is export always a single pass? (Current plan: single pass regardless of playback setting)

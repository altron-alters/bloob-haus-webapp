# Ken Burns Zoom — Schema

Canonical field reference for the `::: ken-burns-zoom` fence.  
**Both the magic machine (`ken-burns-zoom-builder`) and this visualizer must stay in sync with this document.**

---

## Fence syntax

```
::: ken-burns-zoom
image: ![[filename.jpg]]
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

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `image` | wikilink | required | `![[filename.jpg]]` — Obsidian embed syntax; preprocessor resolves to `/media/<filename>` |
| `duration` | number | `8` | Animation duration in seconds (3–30) |
| `fps` | 15\|24\|30 | `24` | Frames per second — used by video export only; visualizer ignores |
| `easing` | string | `linear` | Speed curve: `linear` / `ease-in` / `ease-out` / `ease-in-out` |
| `aspect-ratio` | string | `16:9` | Output crop ratio: `1:1` / `9:16` / `16:9` / `4:3` / `W:H` |
| `direction` | `in`\|`out` | `in` | `in` = start-rect → end-rect (zoom in); `out` = reverse |
| `playback` | string | `loop` | `loop` / `hold` / `bounce` — visualizer only; video export is always single-pass |
| `start-x` | percent | `5.00%` | Start rect left edge, % of image natural width |
| `start-y` | percent | `5.00%` | Start rect top edge, % of image natural height |
| `start-w` | percent | `90.00%` | Start rect width, % of image natural width |
| `start-h` | percent | `50.63%` | Start rect height, % of image natural height |
| `end-x` | percent | `25.00%` | End rect left edge |
| `end-y` | percent | `20.00%` | End rect top edge |
| `end-w` | percent | `50.00%` | End rect width |
| `end-h` | percent | `28.13%` | End rect height |

---

## Notes

- All rect values are **% of the image's natural dimensions**, not the displayed size. This makes them resolution-independent.
- `fps` is stored in the snippet for future video export use but the runtime visualizer does not use it.
- `image: ![[filename.jpg]]` uses Obsidian embed syntax (same as `![[image.svg]]` in slideshow fences). The preprocessor resolves this to `![filename.jpg](/media/filename.jpg)` before `data-vis-raw` is encoded, so `index.js` receives the full `/media/` path. Plain `[[...]]` and bare filenames are also handled as fallbacks.

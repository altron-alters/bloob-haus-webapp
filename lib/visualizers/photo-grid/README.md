# photo-grid visualizer

Responsive image and GIF grid for the melt theme and any Bloob Haus site.
See `schema.md` for author-facing usage docs.

---

## Design context

Built for MELT (Massage Exchange and Learning Together) — a massage collective whose
site needs rich photo documentation of events: overhead GIF shots, room scenes,
3×2 portrait grids, and mixed layouts where one wide image sits above three smaller ones.

The layouts that drove the design (from MELT's Google Doc mockups):

| Pattern     | Example use |
|-------------|-------------|
| `cols: 3`   | 3-column portrait grid of overhead massage shots |
| `cols: 3` × 6 images | 3×2 grid of participant pairs |
| `layout: 1,3,1` | Full-width room scene → 3 detail shots → full-width closeup |
| `layout: 1,2` | Full-width speaker → 2 audience shots |
| `cols: 2`   | Side-by-side communication practice shots |

The "text wider than photos" aesthetic from the mockups is the `padding` parameter —
the grid is inset horizontally from the prose column by default (6% each side).

---

## Syntax research

Before settling on this syntax, we looked at how other tools handle image grid DSLs:

**obsidian-image-grid** (closest match):
Uses a fenced code block where `key: value` config lines and `![[image]]` lines coexist
with no separator. The parser tells them apart by line shape. This is the approach we adopted.
```
```image-grid
columns: 4
gap: 8
![[photo1.png]]
![[photo2.png]]
```
```
Source: https://github.com/skydiver/obsidian-image-grid

**obsidian-media-grid**:
Extends the same idea to video and audio. Confirmed that the mixed config+content pattern
is intuitive enough to be independently invented by multiple plugin authors.
Source: https://github.com/zremboldt/obsidian-media-grid

**Hugo gallery shortcodes** (`mfg92/hugo-shortcode-gallery`):
Uses named params on the shortcode tag (`rowHeight`, `margins`, `columns`). Works for
Hugo but not directly transferable to markdown. Confirmed that `cols` / `columns` is the
universally understood param name.
Source: https://github.com/mfg92/hugo-shortcode-gallery

**MyST Markdown** (`mystmd.org/guide/figures`):
Uses CSS class annotations (`:class: grid grid-cols-2`) on figure blocks. More verbose
than key:value pairs; useful for academic publishing but not for non-technical authors.

**Key decision:** We use a `:::` container (not a code fence) because the content IS the
data — `![[images]]` are live Obsidian previews, not just references. `:::` containers
let authors see their images while editing; code fences would show raw wikilinks.
See `docs/architecture/visualizers.md` — "Container vs code fence" decision table.

---

## Architecture

**Type:** `build-time` container visualizer.
**Activation:** `markdownItContainer` with trigger `photo-grid`.
**Pipeline:** `inject-container-raw.js` → `data-vis-raw` → `index.js` → `parser.js` → `renderer.js`.

The parser is a pure function. It receives raw markdown (the text inside the `:::` block,
before markdown-it ran) and returns `{ settings, images }`. No DOM, no file system.

The renderer is a pure function. It receives `{ settings, images }` and returns an HTML string.
CSS custom properties (`--pg-gap`, `--pg-padding`, `--pg-cols`, `--row-cols`, `--pg-ratio`)
carry the layout values from renderer to stylesheet without baking them into class names.

**Lightbox:** images are wrapped in `<a class="pswp-gallery__item">` anchors. PhotoSwipe 5
(already in marbles-pouch, enabled in melt via `image_zoom: true`) picks these up
automatically via its `children: 'a.pswp-gallery__item'` selector. Images in the same
grid become a gallery — prev/next navigates within the grid. No browser.js needed.

---

## Layout modes

**Uniform** (`cols: N`): a single CSS grid with `grid-template-columns: repeat(N, 1fr)`.
Images auto-flow into as many rows as needed. Clean and simple.

**Explicit** (`layout: 1,3,1`): a flex column of row divs, each with its own
`grid-template-columns: repeat(N, 1fr)`. Allows mixing full-width and multi-column rows
in the same block. Each row div carries a `--row-cols` custom property.

---

## Ratio / cropping

Without `ratio`: images render at natural height. Rows may differ in height — this is fine
when all source images share the same ratio (e.g., all overhead portrait shots from the
same camera). The most common MELT case.

With `ratio: 3/4` (or any value): the item cell gets `aspect-ratio: var(--pg-ratio)` and
the img gets `object-fit: cover`. All cells are uniform height regardless of source ratio.
`ratio: crop` is shorthand for `4/3` (landscape default).

---

## Mobile

All grids collapse to single-column at ≤ 600px via a media query in styles.css.
`padding` is also removed on mobile so images use full width.

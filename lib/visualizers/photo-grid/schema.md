# Photo Grid

Renders a responsive image or GIF grid directly from a `:::` container block.
Supports uniform column grids and mixed-row layouts (e.g. one wide image above three smaller ones).
When `image_zoom` is enabled in the theme, clicking any image opens it in a PhotoSwipe lightbox with slideshow navigation.

## Activation

Place a `:::` container in your markdown:

```
::: photo-grid
![[photo1.gif]]
![[photo2.gif]]
![[photo3.gif]]
:::
```

## Format

Config options and image lines coexist freely in the block body — no separator needed.
Config lines are `key: value`. Image lines start with `!`. The parser tells them apart by line shape.

```
::: photo-grid
cols: 3
gap: 12px
padding: 8%
![[massage-1.gif]]
![[massage-2.gif]]
![[massage-3.gif]]
:::
```

Standard resolved markdown images also work (after the preprocessor resolves wikilinks):

```
![alt text](/media/photo.jpg)
```

## Options

| Option    | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `cols`    | number  | `3`     | Number of columns for uniform grids |
| `layout`  | string  | —       | Explicit row layout, e.g. `1,3,1`. Overrides `cols`. |
| `gap`     | CSS     | `8px`   | Gap between images (any CSS value: `8px`, `1rem`, `2%`) |
| `padding` | CSS     | `6%`    | Left/right inset from the prose column. Makes the grid narrower than body text. |
| `ratio`   | string  | —       | Aspect ratio to crop all images to. See below. |

### `ratio` values

| Value     | Effect |
|-----------|--------|
| _(none)_  | Natural image height. No cropping. Use when all images are already the same ratio. |
| `3/4`     | Portrait crop (taller than wide — overhead massage shots) |
| `4/3`     | Landscape crop (wider than tall — room shots) |
| `1/1`     | Square crop |
| `16/9`    | Widescreen crop |
| `crop`    | Shorthand for `4/3` landscape crop |

When a ratio is set, images are cropped to fill their cells (`object-fit: cover`).
Without a ratio, images show at their natural height — rows may differ in height, which is fine when all images share the same source ratio.

### `layout` syntax

`layout: R1,R2,R3` — comma-separated column counts per row.
Images are distributed into rows in order:

```
::: photo-grid
layout: 1,3,1
gap: 8px
padding: 5%
![[wide-top.jpg]]
![[a.gif]]
![[b.gif]]
![[c.gif]]
![[wide-bottom.jpg]]
:::
```

Row 1 gets 1 image (full width), row 2 gets 3, row 3 gets 1.
If there are fewer images than a row expects, the row renders with what's available.

## Examples

### 3-column portrait grid

```
::: photo-grid
cols: 3
ratio: 3/4
gap: 8px
padding: 8%
![[massage-a.gif]]
![[massage-b.gif]]
![[massage-c.gif]]
:::
```

### 3×2 grid (6 images, 2 rows of 3)

```
::: photo-grid
cols: 3
ratio: 3/4
gap: 8px
![[a.gif]]
![[b.gif]]
![[c.gif]]
![[d.gif]]
![[e.gif]]
![[f.gif]]
:::
```

### Mixed layout: 1 wide + 3 cols + 1 wide

```
::: photo-grid
layout: 1,3,1
gap: 10px
padding: 4%
![[wide-top.jpg]]
![[col-a.jpg]]
![[col-b.jpg]]
![[col-c.jpg]]
![[wide-bottom.jpg]]
:::
```

### 2-column landscape, no crop

```
::: photo-grid
cols: 2
gap: 12px
padding: 10%
![[room-a.jpg]]
![[room-b.jpg]]
:::
```

## Lightbox / slideshow

Images are automatically wrapped in PhotoSwipe anchor tags.
When `image_zoom: true` is set in `theme.yaml`, clicking any image opens a full-screen lightbox.
Navigation arrows let you move between images in the same grid.
Press Escape or click the background to dismiss.

To disable lightbox for a specific grid: not currently supported per-grid — enable/disable via `theme.yaml`.

## Notes

- Obsidian renders the `:::` block as a styled container. `![[wikilinks]]` show as live image previews inside the block. Config lines appear as plain text (which is readable and doesn't break anything).
- On mobile, columns are preserved — a `cols: 3` grid stays 3 columns. Images scale down proportionally inside the fluid `1fr` cells.
- `padding` makes the grid visually narrower than surrounding prose — the "inset" effect seen in the MELT Google Doc mockups.

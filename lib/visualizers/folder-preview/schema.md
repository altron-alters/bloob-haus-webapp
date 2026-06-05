# Folder Preview

Lists all pages in a folder, rendered at runtime from `graph.json`. Used automatically on folder index pages and anywhere you want to embed a folder listing inline.

## Shape type

`hybrid` — the code fence is replaced at build time with an empty container div; `browser.js` fetches `graph.json` and populates it at runtime.

## Activation

### Automatic (folder index pages)

The build pipeline (Step 9.5 in `preprocess-content.js`) generates a stub `index.md` for every vault folder that doesn't already have one. The stub contains an empty `folder-preview` code fence. No action needed from the content author.

### Manual (inline or homepage)

Place a code fence anywhere in a markdown file:

````
```folder-preview
folder: tender-fleck
sort: alpha
```
````

On a folder index page (`/tender-fleck/`) the `folder` setting is inferred from the URL. On any other page (e.g. the homepage) you must set it explicitly.

## Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `style` | string | `cards` | Layout style. See **Styles** below. |
| `folder` | string | from URL | Folder slug to list. Required when the page URL is not the folder (e.g. homepage). |
| `sort` | string | `alpha` | Sort order: `alpha`, `reverse-alpha`, `recent`. |
| `limit` | number | — | Maximum number of pages to show. Omit for all. |
| `title` | string | `ARTICLES` | Section heading label. `slider-cards` only. |
| `id` | string | `articles` | HTML `id` on the wrapping `<section>`. `slider-cards` only. |
| `bg` | string | — | Background color token (`white`, `muted`, `dark`, `orange`, hex). `slider-cards` only. |
| `color` | string | — | Text color pair token. `slider-cards` only. |

## Styles

### `cards` (default)

3-column grid of cards. Each card shows the page's OG image (from `node.image` in `graph.json`) with a tinted placeholder when no image exists. Responsive: 2 columns ≤ 900px, 1 column ≤ 480px.

````
```folder-preview
```
````

````
```folder-preview
style: cards
sort: reverse-alpha
limit: 9
```
````

---

### `list`

Vertical list with optional per-page icon and a separator between items. Compact — good for dense navigation pages.

````
```folder-preview
style: list
```
````

---

### `slider-cards`

Horizontal Swiper carousel. Requires Swiper to be loaded by the theme. Wraps in a `<section class="articles">` so theme `.articles` CSS applies automatically.

````
```folder-preview
style: slider-cards
folder: tender-fleck
title: RECENT WORK
id: recent-work
bg: dark
limit: 6
```
````

---

### `layout: marbles`

Draggable marble circles with floating animation and light-source rotation. Titles are overlaid on each marble. Best for small sets (≤ 12 pages).

````
```folder-preview
layout: marbles
```
````

---

### `layout: bubbles`

Scattered glassmorphism circles in a loose two-column layout. Themed for MELT / circular-nav contexts.

````
```folder-preview
layout: bubbles
```
````

## Filtering

Pages are excluded from the listing when any of these are true:

- `node.type !== "page"` (tag nodes, etc.)
- `node.id === window.location.pathname` (current page)
- `node.id === "/folder/"` (the folder index itself)
- `node.id.endsWith("/index/")` (auto-generated index stubs)
- `node.website_status === "archived"`

Unlisted pages (`website_status: unlisted`) are absent from `graph.json` entirely and never appear.

## Folder resolution and case

The `folder` value is compared case-insensitively against the `section` field in `graph.json`. This means `/ESJP/` and `/esjp/` both match nodes with `section: "ESJP"`. The vault folder name casing is preserved in the generated permalink.

## Homepage usage

To embed a folder listing on the root index page, set `folder` explicitly — there is no URL segment to infer from:

````
```folder-preview
folder: notes
sort: recent
limit: 4
style: cards
```
````

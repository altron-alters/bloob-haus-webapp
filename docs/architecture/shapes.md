# Shapes Architecture

Shapes are the unified concept for everything that renders content visually: `bloob-type`, `visualizer`, and `:::` block are all the same thing at different scopes. See `bloobhaus-notes/.../2026-05-31-BLOOB-HAUS-SHAPES-ARCHITECTURE.md` for the full conceptual model.

## Two scopes

- **Inline scope** — authored as a `:::` block inside a page body. Rendered by the visualizer's `transform()` + optional `browser.js`. No layout needed.
- **File scope** — its own `.md` file with `bloob-shape:` in frontmatter. The entire page body is replaced by the shape's renderer. Requires a `layout.njk` in the shape folder.

## What a complete shape carries

```
lib/visualizers/[name]/
  manifest.json       required — identity, type, defaultLayout (file-scope only)
  schema.md           required — human + AI readable contract (settings, examples)
  index.js            required — build-time transform() and/or renderFilescope()
  browser.js          when needed — runtime rendering from graph.json or DOM
  styles.css          when needed — scoped CSS using theme CSS tokens
  layout.njk          file-scope only — default page layout template
```

## Conversion checklist per shape type

### Inline-only shapes (`build-time`, `runtime`, or `hybrid` used only as `:::`)

These are already valid shapes. Remaining gaps are documentation only:

- [ ] `manifest.json` exists with correct `type`
- [ ] `schema.md` exists with settings table and examples

No `layout.njk` needed — ever.

### File-scope shapes (`file-scope` type, or `hybrid` used as a full-page shape)

Full checklist:

- [ ] `manifest.json` has `"type": "file-scope"` (or `"hybrid"` if also used inline)
- [ ] `manifest.json` has `"filescope": true`
- [ ] `manifest.json` has `"defaultLayout": "layouts/[name].njk"`
- [ ] `index.js` exports `renderFilescope(settings, body)` returning inner HTML
- [ ] `layout.njk` exists — inherits from `layouts/base.njk`, renders `{{ content | safe }}`
- [ ] `schema.md` documents settings and activation
- [ ] Auto-stubs or user files only need `bloob-shape: [name]` — no `layout:`, `title:`, `folder:`, or `permalink:` required (all auto-injected by preprocessor)

## How layout.njk gets into the build

`assemble-src.js` Step 2b.5 scans all `lib/visualizers/*/layout.njk` files and copies each one to `src-*/_includes/layouts/[defaultLayout filename]` **before** `_base` and theme layouts run. The override chain is:

```
shape layout.njk   (lowest priority — shape's own default, always present)
_base layouts      (can override shape default)
theme layouts      (highest priority — always wins)
```

Themes that want custom folder chrome create their own `layouts/folder-index.njk`. Themes that don't get the shape's default for free.

## How the preprocessor selects the layout

When a page declares `bloob-shape: X`, the preprocessor resolves the layout in this priority order (highest wins):

1. Explicit `layout: layouts/…` in the file's frontmatter
2. Layout from the `bloob-type` registry (`_bloob-objects.md`)
3. `bloobShapeLayout` — set when shape has no `renderFilescope` (layout-only shapes: `bloob-shape: article` → `layouts/article.njk`)
4. `shapeManifestLayout` — read from `manifest.json.defaultLayout` when the shape has `renderFilescope` (e.g. `folder-preview` → `layouts/folder-index.njk`)
5. Default: `layouts/page.njk` (or `layouts/base.njk` for `index.md` files)

This means **a user only needs `bloob-shape: folder-preview`** — no `layout:` required. The preprocessor reads the manifest and injects the correct layout automatically. For index.md files the preprocessor also auto-injects `folder`, `folder_display`, and `title` from the directory name when the user hasn't provided them.

## Deferred: body-only shape declaration

Authoring goal: a `folder-preview` code fence in the body (no `bloob-shape:` in frontmatter) should implicitly set the page's bloob-shape and inherit its `defaultLayout`. This requires the preprocessor to detect code-fence types in the body before deciding on layout — a two-pass dependency. Current position: `bloob-shape:` in frontmatter is canonical; code fences in body work via Eleventy `addTransform` but don't influence layout selection. See DECISIONS.md 2026-06-05.

## Current shape status

| Shape | Type | Complete? | Gaps |
|-------|------|-----------|------|
| `folder-preview` | hybrid + file-scope | ✓ | — |
| `rss-feed` | file-scope | Partial | Missing `layout.njk`, `schema.md`, `styles.css` |
| `card-preview` | build-time | Partial | Missing `schema.md` |
| `checkbox-tracker` | runtime | Partial | — |
| `circular-nav` | hybrid | Partial | Missing `schema.md` |
| `fridge-magnets` | hybrid | Partial | Missing `schema.md` |
| `graph` | hybrid | Partial | Missing `schema.md` |
| `heading-and-paragraph` | build-time | Partial | Missing `schema.md` |
| `image-grid` | build-time | Partial | Missing `schema.md` |
| `image-text` | build-time | ✓ | — |
| `ken-burns-zoom` | unknown | Incomplete | Missing `manifest.json` entirely |
| `latex` | runtime | Partial | Missing `schema.md` |
| `page-preview` | runtime | Partial | — |
| `photo-grid` | build-time | Partial | — |
| `quotes-stack` | hybrid | Partial | Missing `schema.md` |
| `scene-nav` | hybrid | Partial | — |
| `search` | hybrid | Partial | Missing `schema.md` |
| `services` | build-time | Partial | Missing `schema.md` |
| `slideshow` | build-time | ✓ | — |
| `tags` | hybrid | Partial | Missing `schema.md` |
| `testimonials` | hybrid | Partial | — |

## The next file-scope shape to convert: rss-feed

`rss-feed` is the only other declared `file-scope` shape. It currently works because users write `layout: layouts/page.njk` explicitly in their frontmatter. Converting it to a proper shape means:

1. Add `layout.njk` to `lib/visualizers/rss-feed/` (inheriting from `base.njk`)
2. Add `"defaultLayout": "layouts/rss-feed.njk"` to its `manifest.json`
3. Add `"filescope": true` to its `manifest.json`
4. Write `schema.md`
5. Users can then drop the `layout:` line from their frontmatter

## Rule: do not convert visualizers wholesale

Convert one shape at a time, starting with shapes that are actively being used as file-scope pages. Inline-only shapes need no conversion beyond documentation gaps. Attempting to convert all shapes at once risks breaking existing content.

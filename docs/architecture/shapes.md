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

## Two shape variables in the preprocessor

The preprocessor maintains two distinct variables for shape resolution:

| Variable | Source | Purpose |
|----------|--------|---------|
| `bloobShape` | `frontmatter["bloob-shape"]` — explicit only | Drives **body rendering** (`renderFilescope`) and `::: settings` extraction. Never set from the site default. |
| `effectiveShape` | `bloobShape ?? siteConfig.default_shape` | Drives **layout selection** only. Falls back to the site-wide default when no shape is declared in frontmatter. |

This distinction matters: if `default_shape: marble` is configured and the `marble` shape later gains a `renderFilescope` renderer, regular pages won't have their bodies replaced — only pages with an explicit `bloob-shape: marble` declaration get that treatment.

## Site-wide default shape

Set `default_shape` in `_bloob-settings.md` to apply a shape's layout to all pages that don't declare one explicitly:

```yaml
default_shape: marble
```

- Only influences layout selection — body rendering never fires from the default
- If the named shape has no `lib/visualizers/[name]/` folder yet, it silently falls through to `page.njk` — safe to declare a future shape name in advance
- Documented in `docs/architecture/settings-registry.md` → Shapes

## How the preprocessor selects the layout

The preprocessor resolves the layout in this priority order (highest wins):

1. Explicit `layout: layouts/…` in the file's frontmatter
2. Layout from the `bloob-type` registry (`_bloob-objects.md`)
3. `bloobShapeLayout` — set when shape has no `renderFilescope` (layout-only shapes: `bloob-shape: article` → `layouts/article.njk`)
4. `shapeManifestLayout` — read from `manifest.json.defaultLayout` when the shape has `renderFilescope` (e.g. `folder-preview` → `layouts/folder-index.njk`)
5. Default: `layouts/page.njk` (or `layouts/base.njk` for `index.md` files)

Steps 3 and 4 use `effectiveShape` — so both an explicitly declared shape and the site's `default_shape` can supply a layout through these steps.

**A user only needs `bloob-shape: folder-preview`** — no `layout:` required. The preprocessor reads the manifest and injects the correct layout automatically. For index.md files the preprocessor also auto-injects `folder`, `folder_display`, and `title` from the directory name when the user hasn't provided them.

## Unknown shape names — fallback behaviour

When `effectiveShape` names a shape with no `lib/visualizers/[name]/` folder:
- If the shape was **explicitly declared** in frontmatter → logs a warning, falls back to `page.njk`
- If the shape came from **`default_shape`** → silent, falls back to `page.njk`

This means content files can use `bloob-shape: note` today even though `lib/visualizers/note/` doesn't exist yet — the build won't crash. When the `note` shape is eventually built and its folder appears, those files will automatically pick up its layout.

## Deferred: body-only shape declaration

Authoring goal: a `folder-preview` code fence in the body (no `bloob-shape:` in frontmatter) should implicitly set the page's bloob-shape and inherit its `defaultLayout`. This requires the preprocessor to detect code-fence types in the body before deciding on layout — a two-pass dependency. Current position: `bloob-shape:` in frontmatter is canonical; code fences in body work via Eleventy `addTransform` but don't influence layout selection. See DECISIONS.md 2026-06-05.

## Current shape status

| Shape | Type | Complete? | Gaps |
|-------|------|-----------|------|
| `folder-preview` | hybrid + file-scope | ✓ | — |
| `rss-feed` | file-scope | Partial | Missing `layout.njk`, `schema.md`, `styles.css` |
| `card-preview` | build-time | Partial | Missing `schema.md` |
| `checkbox-tracker` | runtime | Partial | — |
| `citations` | runtime (CSS-only) | ✓ | — |
| `circular-nav` | hybrid | Partial | Missing `schema.md` |
| `fridge-magnets` | hybrid | Partial | Missing `schema.md` |
| `graph` | hybrid | Partial | Missing `schema.md` |
| `heading-and-paragraph` | build-time | Partial | Missing `schema.md` |
| `image-grid` | build-time | Partial | Missing `schema.md` |
| `image-text` | build-time | ✓ | — |
| `ken-burns-zoom` | unknown | Incomplete | Missing `manifest.json` entirely |
| `latex` | runtime | Partial | Missing `schema.md` |
| `marble` | — | Not yet built | Declared as `default_shape` in marbles vault — will auto-apply layout once shape folder exists |
| `note` | — | Not yet built | Used as `bloob-shape: note` in content files — safely falls back to `page.njk` until built |
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

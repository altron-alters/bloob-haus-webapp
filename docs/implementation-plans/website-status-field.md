# Implementation Plan: `publish_mode: status_field`

**Created:** 2026-04-22  
**Status:** Implemented 2026-04-22  
**Scope:** Shared infrastructure (all themes) + alter-engineers theme + content migration

---

## Goal

Add `status_field` as a first-class publish mode in bloob-haus. Sites opt in by setting `publish_mode: status_field` in `_bloob-settings.md`. The builder reads a YAML frontmatter field (default: `website_status`) and applies standardized publish semantics. This replaces the current tag-based blocklist for the alter-engineers site.

Backwards compatible: existing sites using `publish_mode: blocklist` or `publish_mode: allowlist` are unaffected.

---

## Standard Status Vocabulary

Four hardcoded values with defined semantics. Sites can extend behavior via config (future), but the builder knows these four:

| Value | Built | Direct URL | Google-indexable | `sitemap.xml` | Internal search | Card/folder previews | `graph.json` |
|-------|-------|------------|-----------------|---------------|-----------------|---------------------|--------------|
| `draft` | No | No | — | No | No | No | No |
| `unlisted` | Yes | Yes | No (noindex) | No | No | No | No |
| `archived` | Yes | Yes | Yes | Yes | No | No | Yes (with field) |
| `public` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

**Default behavior:** pages without `website_status` set → treated as `public`.

---

## What `noindex` means (for documentation)

`<meta name="robots" content="noindex">` in the page `<head>` tells Google's crawler not to add this URL to search results. The page still loads — sharing a direct link works — but it won't appear in Google searches. Excluding from `sitemap.xml` reinforces this (sitemap = "please index these").

---

## Touch Points (implementation order)

### Phase 1 — Builder core (shared infrastructure)

#### 1. `scripts/utils/publish-filter.js`
- Add `status_field` as a valid `publishMode` value
- New branch in `shouldPublish()`:
  - Read `statusField` from config (default: `'website_status'`)
  - Exclude file if `frontmatter[statusField] === 'draft'`
  - If field is absent → treat as `public` (include)
  - `unlisted`, `archived`, `public` all pass through (built)
- `bloob-settings-reader.js` must pass `status_field` key through to config

#### 2. `scripts/utils/bloob-settings-reader.js`
- Ensure `status_field` key is read from `_bloob-settings.md` and available in the config object passed to the pipeline

#### 3. `scripts/utils/graph-builder.js`
- Add `website_status` to node schema (only if present on the page)
- **Exclude `unlisted` nodes entirely** — they must not appear in any runtime visualizer
- `archived` nodes: include with `website_status` field so visualizers can filter them
- `public` nodes: include normally (field present or absent)

**Note:** `website_status` must be available in `perPageLinks` data passed to `buildGraph()`. Trace where `perPageLinks` is assembled to confirm the frontmatter field flows through.

### Phase 2 — Theme: alter-engineers

#### 4. `themes/alter-engineers/layouts/project.njk`
- In `<head>`: add `<meta name="robots" content="noindex">` when `website_status == 'unlisted'`
- On main content wrapper: add `data-pagefind-ignore` attribute when `website_status` is `unlisted` or `archived` (excludes from Pagefind internal search)

#### 5. New: `themes/alter-engineers/pages/sitemap.njk`
- Create sitemap (modeled on `themes/warm-kitchen/pages/sitemap.njk`)
- Filter: only include pages where `website_status` is `public`, `archived`, or not set
- Exclude `unlisted` (noindex) and `draft` (not built)

**Check `warm-kitchen/pages/sitemap.njk` for current implementation — it currently doesn't filter by status at all. Consider fixing it there too (holistic change rule).**

### Phase 3 — Visualizers (affects all themes)

#### 6. `lib/visualizers/folder-preview/browser.js`
- When building the list of pages to display, skip nodes where `website_status` is `unlisted` or `archived`
- `unlisted` nodes won't be in graph.json at all (handled in Phase 1), so this is mainly a guard for `archived`

#### 7. `lib/visualizers/card-preview/browser.js` (or `page-preview`)
- Same as folder-preview: skip `archived` nodes in rendered output

### Phase 4 — Content migration (alter-engineers repos)

#### 8. `_bloob-settings.md` in `alter-website-content/`
Replace:
```yaml
publish_mode: blocklist
blocklist_tag: draft
```
With:
```yaml
publish_mode: status_field
status_field: website_status
```

#### 9. Rename `status` → `website_status` in all project profile `.md` files
- Live content repo: `G:/Shared drives/ACE_Drive/04_Marketing/Website/_live-website-content-obsidian-repo/projects/`
- Dev content repo: `C:/ae-dev/alter-website-content/projects/`
- `TEMPLATE.md`
- Script or manual batch rename — roughly 40–50 files

#### 10. Apps script (`apps-script-project-profiles-gsheet/`)
- Update the field name written to frontmatter: `status` → `website_status`
- GSheet column `website_status` already matches — just the frontmatter key write needs updating
- Verify the apps script doesn't write `tags: [draft]` (it shouldn't — the new filter reads the field directly)

---

## Backwards Compatibility

- `publish_mode: blocklist` and `publish_mode: allowlist` modes are untouched
- No existing site (marbles, buffbaby, warm-kitchen) is affected unless they opt in by setting `publish_mode: status_field`
- The `status_field` key defaults to `'website_status'` — no config required if using the default field name

---

## Open Questions

- [ ] Does `perPageLinks` (input to `buildGraph()`) already carry frontmatter fields like `website_status`? Or does graph-builder need a new data source? **Trace this before implementing Phase 1 item 3.**
- [ ] Should `warm-kitchen/sitemap.njk` be updated to filter by `website_status` as a holistic fix? (Low risk — warm-kitchen content doesn't use `website_status`, so the filter is a no-op for that site, but it's cleaner.)
- [ ] `card-preview` visualizer is not yet built — when implementing it, bake in status filtering from the start.

---

## Testing Checklist

- [ ] A page with `website_status: draft` is not built (not in `_site/`)
- [ ] A page with `website_status: unlisted` is built, URL resolves, has `<meta name="robots" content="noindex">`, is absent from `sitemap.xml`, absent from Pagefind index, absent from `graph.json`
- [ ] A page with `website_status: archived` is built, URL resolves, no noindex tag, present in `sitemap.xml`, absent from internal search, absent from card/folder previews, present in `graph.json` with `website_status` field
- [ ] A page with `website_status: public` behaves identically to current publish behavior
- [ ] A page with no `website_status` field behaves as `public`
- [ ] Existing sites (marbles, buffbaby) build without changes or regressions

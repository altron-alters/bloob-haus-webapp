# AE Launch Sprint — Implementation Plan

**Created:** 2026-04-28  
**Status:** Active  
**Goal:** Ship the Alter Engineers website. All sections render from content. Fix polish bugs, add redirect support, deploy to Cloudflare.

---

## Content Setup

- [ ] Switch dev to live content vault: `npm run dev:alter-engineers` now points to  
  `G:/Shared drives/ACE_Drive/04_Marketing/Website/_live-website-content-obsidian-repo`  
  ✅ Done 2026-04-28 (package.json updated)

---

## Bug Fixes

### 1. Hero — floating arrows (HIGH)

**Symptom:** `<` and `>` chevrons appear at the left/right viewport edges, floating at hero height.

**Root cause:** `folder-preview/browser.js` creates navigation buttons with both `.swiper-button-prev` / `.swiper-button-next` AND custom `.articles__prev-button` / `.articles__next-button` classes. Swiper's bundled CSS applies `position: absolute; top: calc(50% - 12px)` to any element with those classes, regardless of whether it sits inside a Swiper container. Since `.swiper-nav` has no `position: relative`, the buttons escape to the nearest positioned ancestor (the hero or body), appearing at the viewport edges.

**Fix:** In `folder-preview/browser.js`, remove the `.swiper-button-prev` / `.swiper-button-next` classes from the nav elements — keep only the custom `.articles__prev-button` / `.articles__next-button` classes. Swiper's `navigation.nextEl` / `navigation.prevEl` config already targets the custom classes, so Swiper functionality is unchanged. Style the buttons via `folder-preview/styles.css` to look like testimonials nav buttons.

Files:
- `lib/visualizers/folder-preview/browser.js` — remove swiper-button-* from class strings
- `lib/visualizers/folder-preview/styles.css` — add arrow button styles

---

### 2. OUR SOLUTIONS — body text too heavy (LOW)

**Symptom:** The paragraph text inside the `::: image-text id=solutions` block renders at full/bold weight; should be regular/light.

**Root cause:** `theme.min.css` sets a heavy `font-weight` for some paragraph contexts, or the `image-text` visualizer inherits heading weight.

**Fix:** Target the body paragraph inside the `image-text` section in `themes/alter-engineers/assets/css/main.css`. This sets the new default for all image-text body copy.

Files:
- `themes/alter-engineers/assets/css/main.css` — add/override `font-weight` for `.image-text p` or similar selector

---

### 3. Musings visualizer rename → `quotes-stack` (MEDIUM)

**What changes (developer-facing):**
- `lib/visualizers/musings/` → `lib/visualizers/quotes-stack/`
- `manifest.json`: `name` → `"quotes-stack"`, `trigger` → `"quotes-stack"`
- Content vault `index.md`: ` ```musings` fence → ` ```quotes-stack`

**What stays the same (to preserve theme.min.js / theme.min.css compatibility):**
- All rendered HTML class names and IDs stay unchanged: `#musings-swiper`, `.musings__*`, etc.
- `theme.min.js` initializes `new Swiper("#musings-swiper", ...)` — this still works because the renderer output is identical

Files:
- Rename `lib/visualizers/musings/` → `lib/visualizers/quotes-stack/`
- `lib/visualizers/quotes-stack/manifest.json` — update name + trigger
- Content vault `index.md` — change code fence trigger

---

### 4. Musings / quotes-stack — scroll passthrough at end (MEDIUM)

**Symptom:** When `infinite_scroll: false` and the user reaches the last card, the Swiper traps all wheel/touch events. The user must scroll somewhere else on the page to continue.

**Fix:** In `lib/visualizers/quotes-stack/browser.js`, listen for Swiper's `reachEnd` and `reachBeginning` events and dynamically set `mousewheel.releaseOnEdges: true` on those boundaries. Swiper supports this natively — setting `releaseOnEdges: true` lets scroll events propagate to the parent page when the carousel is at its first or last slide.

The simplest fix: add `releaseOnEdges: true` to the Swiper mousewheel config when `loop: false`.

Files:
- `lib/visualizers/quotes-stack/browser.js` — add `mousewheel: { forceToAxis: true, releaseOnEdges: true }` when reinitializing with `loop: false`

---

### 5. Articles (folder-preview) — nav buttons styling (tied to Bug #1)

Resolved together with Bug #1. After removing the `.swiper-button-*` default classes, style `.articles__prev-button` and `.articles__next-button` to match the testimonials nav button style using custom CSS in `folder-preview/styles.css`.

---

## New Feature: Redirect Support (Universal)

**Scope:** Bloob Haus wide — works for all sites/themes.

**User story:** An admin sets `redirect: https://example.com` (or `redirect: [[wiki-link]]`) in a page's frontmatter. When a visitor lands on that page, they are redirected. In `folder-preview` slider-cards, if a node has a redirect, the "READ MORE" button opens the redirect URL in a new tab instead of the internal page.

### Implementation steps

**Step 1 — Preprocessing (`preprocess-content.js` → `scripts/utils/`)**

Add a new utility `redirect-resolver.js` that:
- Reads `redirect:` from frontmatter (if present)
- If value is a `[[wiki-link]]`: resolves to internal URL via `wiki-link-resolver`
- If value is a `[text](url)` markdown link: extracts the URL
- If value is a bare URL: uses as-is
- Writes the resolved URL back to frontmatter as `redirect: <url>`

Run this after link resolution in `preprocess-content.js`.

**Step 2 — graph.json (`graph-builder.js`)**

Include `redirect` in node data if the page has it:
```json
{ "id": "/resources/old-article/", "redirect": "https://example.com/new", ... }
```

**Step 3 — Page template redirect (`themes/_base/` or per-theme `page.njk`)**

If page frontmatter has `redirect:`, emit in `<head>`:
```html
<meta http-equiv="refresh" content="0; url={{ redirect }}">
<script>window.location.replace("{{ redirect }}");</script>
```

This is universal — put in `themes/_base/partials/head.njk` so all themes get it.

**Step 4 — folder-preview cards (`lib/visualizers/folder-preview/browser.js`)**

When building a slider-card for a node that has `node.redirect`:
- Use `node.redirect` as the `href` on the "READ MORE" button
- Add `target="_blank" rel="noopener"` to open in a new tab
- Optionally add a visual indicator (e.g. external link icon or slightly different button label)

Files:
- `scripts/utils/redirect-resolver.js` — NEW
- `scripts/preprocess-content.js` — call redirect-resolver
- `scripts/utils/graph-builder.js` — include `redirect` field in node output
- `themes/_base/partials/head.njk` — add redirect meta/script block
- `lib/visualizers/folder-preview/browser.js` — use `node.redirect` in card render

---

## Deploy Pipeline: Alter Engineers

Set up production deploy following the buffbaby pattern.

- [ ] Create Cloudflare Pages project for `alterengineers.com`
- [ ] Create `.github/workflows/deploy-alter-engineers.yml` (copy + adapt from `deploy-buffbaby.yml`)
- [ ] Add GitHub secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `AE_CONTENT_REPO_TOKEN`
- [ ] Test full build → deploy cycle
- [ ] DNS: point `alterengineers.com` → Cloudflare Pages

---

## Content Tasks (not code)

- [ ] Add `image:` frontmatter (or inline image) to project `.md` files so `card-preview` can show project photos
- [ ] Review and audit `website_status` field on all projects (public vs draft)
- [ ] Check all resources pages have correct frontmatter

---

## Cleanup

- [ ] Update `homepage.njk` status comments — all sections now render via `{{ content | safe }}`; mark sections 2-10 as `✅ LIVE` with note that layout control happens in `index.md`

---

## Priority Order

1. Bug fixes #1 + #5 (hero arrows / articles nav) — one fix, visual blocker
2. Bug fix #4 (scroll passthrough) — UX blocker
3. Bug fix #2 (text weight) — visual polish
4. Bug fix #3 (rename) — developer naming cleanup
5. Redirect support — feature, needed for resources with external links
6. Content tasks — fill in project images
7. Deploy pipeline — go live

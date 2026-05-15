# MELT Theme — Design Handoff

**Client:** Whitney & Vicki — MELT (Massage Exchange and Learning Together)  
**Theme:** `themes/melt/`  
**Content repo:** `../melt-website/` (local) / `LSanten/melt-website` (GitHub)  
**Dev command:** `node scripts/dev-local.js --site=melt --content=../melt-website`

---

## Design reference

The design was prototyped in Claude Design. Key screenshots are in this doc's companion folder (add them here when available). Visual reference: [lab.marconoris.com/now](https://lab.marconoris.com/now).

**Aesthetic:** Dreamy, soft, cozy queer/trans safe-space. Purple-mauve gradient background. Handwritten italic headings (Caveat). Soft rounded body text (Quicksand). White text throughout. Bubbles as primary navigation metaphor.

**Color palette:**
- Background gradient: `#4a2d6e` → `#6a4090` → `#8a5590` → `#9a6080` → `#a07278` (fixed, covers full viewport)
- Homepage nav bubbles: dark indigo radial gradient (`#4a3282` → `#1a0838`)
- CTA center bubble: rose radial gradient (`#c87090` → `#7a3050`)
- Resource bubbles: soft blue-lavender, semi-transparent (to be designed in `bubble-vis` CSS)

---

## Pages

| URL | Layout | Source file | Status |
|-----|---------|-------------|--------|
| `/` | `layouts/home.njk` | `index.md` | ✅ skeleton done |
| `/resources/` | `layouts/folder-index.njk` | `resources/index.md` | ✅ skeleton done |
| `/resources/[page]/` | `layouts/page.njk` | `resources/*.md` | ✅ skeleton done |
| `/playlists/` | `layouts/folder-index.njk` | `playlists/index.md` | ✅ skeleton done |
| `/what-is-melt/` | `layouts/page.njk` | `what-is-melt/index.md` | ✅ skeleton done |
| `/contact-us/` | `layouts/page.njk` | `contact-us.md` | ✅ skeleton done |
| `/host-your-own-melt/` | `layouts/page.njk` | `host-your-own-melt.md` | ✅ skeleton done |

---

## Visualizers needed

### 1. `circular-nav` — NEW visualizer

**Purpose:** Homepage navigation flower. Renders room links as orbiting bubbles around a center CTA.

**Markdown syntax (in `index.md`):**
```
:::circular-nav
[[resources/index.md]] - resources
[[playlists/index.md]] - playlists
[[what-is-melt/index.md]] - what is MELT?
[[host-your-own-melt.md]] - host your own MELT
[[contact-us.md]] - contact us

center: [sign up for the next MELT](https://example.com/signup)
:::
```

**Parser output (data model):**
```json
{
  "type": "circular-nav",
  "center": { "label": "sign up for the next MELT", "href": "https://example.com/signup" },
  "rooms": [
    { "label": "resources", "href": "/resources/" },
    { "label": "playlists", "href": "/playlists/" },
    { "label": "what is MELT?", "href": "/what-is-melt/" },
    { "label": "host your own MELT", "href": "/host-your-own-melt/" },
    { "label": "contact us", "href": "/contact-us/" }
  ]
}
```

**Visual behavior:**
- Center bubble: rose gradient, larger (~150px), always centered
- Orbiting bubbles: dark indigo with subtle radial glow, evenly spaced in a circle around center
- Bubbles re-arrange automatically based on count (2–8 rooms)
- Gentle breathing animation: bubbles gently float up/down on an offset sinusoidal cycle
- No hard outer edge — bubbles fade out at edges (no border, strong drop shadow)
- On mobile: entire flower must be visible without scrolling (scale to fit viewport width)

**Bubble visual spec:**
```css
/* Orbit bubble */
background: radial-gradient(circle at 38% 32%, #4a3282, #1a0838);
box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 60px rgba(80,40,140,0.3);
/* no border-radius border — the fade is achieved via radial-gradient + box-shadow spread */

/* Center (CTA) bubble */
background: radial-gradient(circle at 38% 32%, #c87090, #7a3050);
```

**JS implementation notes:**
- Place bubbles using CSS `position: absolute` + trigonometry (sin/cos) for orbit positions
- Orbit radius: `min(containerWidth, containerHeight) * 0.38`
- Breathing: `@keyframes float` with `transform: translateY()`, staggered per bubble
- Mobile: wrap the whole container in `max-width: 100vw; aspect-ratio: 1;` and scale down

**Files to create:**
- `lib/visualizers/circular-nav/parser.js`
- `lib/visualizers/circular-nav/renderer.js`
- `lib/visualizers/circular-nav/browser.js` (positioning + animation)
- `lib/visualizers/circular-nav/circular-nav.css`
- `lib/visualizers/circular-nav/schema.md`

---

### 2. `folder-preview` — ADAPT existing visualizer

**Purpose:** Folder index pages (resources, playlists) show their contents as scattered bubbles instead of the current card/slider layout.

**Existing visualizer:** `lib/visualizers/folder-preview/`  
**Adaptation needed:** Add a `layout: bubbles` mode that scatters items as light blue-lavender bubbles (glassmorphism style, no hard edges).

**Bubble visual spec (resource bubbles — different from homepage):**
```css
/* Resource bubble — lighter, airier than homepage bubbles */
background: radial-gradient(circle at 40% 30%, 
  rgba(180, 200, 240, 0.5) 0%, 
  rgba(150, 170, 210, 0.25) 60%, 
  transparent 100%
);
/* Subtle inner highlight, no hard border */
box-shadow: 0 8px 32px rgba(100, 80, 160, 0.25);
```

Each bubble shows:
- Small type label (e.g., `essay`, `guide`, `notes`) — from `type` frontmatter
- Bold page title

**Scatter layout:** Organic/random positions within a 2-column-ish grid area. Bubbles vary slightly in size. On mobile: 2 columns, centered.

**Markdown syntax (in `resources/index.md`):**
```
:::folder-preview
resources
layout: bubbles
:::
```

**Files to modify:**
- `lib/visualizers/folder-preview/parser.js` — add `layout` option
- `lib/visualizers/folder-preview/renderer.js` — add bubbles render mode
- `lib/visualizers/folder-preview/folder-preview.css` — add `.fp-bubbles` styles

---

## Nav and footer

**Breadcrumb nav (top fixed):**
- Home button: dark circle with white dot (`●`). Always links to `/`.
- Separator: `·` (centered dot)
- Path: `MELT · [folder] · [page title truncated to ~32 chars]`
- Implemented in `themes/melt/partials/nav.njk`

**Footer:**
- Line 1: `MELT · whitney & vicki` (site title + author from `_bloob-settings.md`)
- Line 2: `made for free with bloob.haus` (links to `https://bloob.haus/`)

---

## Content repo structure

```
melt-website/
  _bloob-settings.md         ← site config (theme, author, etc.)
  index.md                   ← homepage (circular-nav visualizer)
  what-is-melt/
    index.md
  contact-us.md
  host-your-own-melt.md
  resources/
    index.md                 ← folder index (folder-preview bubbles)
    trauma-informed-touch.md
    why-we-charge-sliding-scale.md
    how-to-prep-for-a-session.md
    aftercare-48-hours.md
    consent-rituals-we-use.md
    the-psoas-gently.md
    reading-list.md
    tools-of-the-trade.md
    playlists-we-melt-to.md
  playlists/
    index.md
```

**Frontmatter conventions:**
- `layout:` — set explicitly on all files (home.njk, page.njk, folder-index.njk)
- `title:` — lowercase, intimate tone
- `byline:` — attribution, e.g. `whitney & vicki` or `a note for context · whitney & vicki`
- `type:` — content type shown as small label: `essay`, `guide`, `notes`, `audio`, `list`
- `description:` — used on folder index pages as subtitle

---

## What's done vs. pending

| Item | Status |
|------|--------|
| Theme skeleton (`themes/melt/`) | ✅ Done |
| Content files (14 files, fake content) | ✅ Done |
| `sites/melt.yaml` | ✅ Done |
| CSS — gradient, typography, nav, page layouts | ✅ Done |
| `circular-nav` visualizer | ⏳ Next session |
| `folder-preview` bubble adaptation | ⏳ After circular-nav |
| Whitney's real logo asset | ⏳ Awaiting from client |
| Deploy to melt.bloob.haus | ⏳ After visualizers done |

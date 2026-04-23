# Bring Your Own Theme

**Status:** Supported today — this doc makes the path explicit.
**Updated:** 2026-04-23

You have an existing HTML website. You want markdown-driven content, Obsidian authoring, and bloob-haus visualizers — without rebuilding your visual design from scratch.

This is the intended path. The alter-engineers theme was built exactly this way (from a WordPress site export).

---

## The 3-step path

### Step 1 — Turn your HTML into a Nunjucks layout

Copy your existing HTML into `themes/[your-theme]/layouts/base.njk` and replace the dynamic parts:

```html
<!-- Before -->
<title>My Site</title>
<link rel="stylesheet" href="style.css">
<body>
  <nav>...</nav>
  <main>
    <h1>Page Title</h1>
    <p>Page content goes here.</p>
  </main>
  <footer>...</footer>
</body>

<!-- After -->
<title>{{ title }} — {{ site.title }}</title>
<link rel="stylesheet" href="/assets/css/main.css">
<body>
  <nav>...</nav>
  <main>
    <h1>{{ title }}</h1>
    {{ content | safe }}
  </main>
  <footer>...</footer>
</body>
```

The minimum replacements:
| Old HTML | Nunjucks replacement |
|----------|---------------------|
| `<title>...</title>` | `<title>{{ title }} — {{ site.title }}</title>` |
| Your content area | `{{ content | safe }}` |
| Your CSS `<link>` | Point to `/assets/css/main.css` |

### Step 2 — Drop your CSS into `main.css`

Copy your existing CSS into `themes/[your-theme]/assets/css/main.css`.

Then add the **token contract block** at the top (see below). This is the only new CSS you write — it tells visualizers what your brand colors and fonts are.

### Step 3 — Add the token contract

Paste this block at the top of `main.css` and fill in your values:

```css
:root {
  /* Brand colors */
  --accent-color:  #5b5dd3;   /* primary brand color — headings, links, highlights */
  --accent-dark:   #3d4fcc;   /* darker variant for hover/active states */
  --bg-color:      #ffffff;   /* default page/section background */
  --text-color:    #1a1a1a;   /* body text */
  --text-light:    #555555;   /* secondary / muted text */
  --border-color:  rgba(91, 93, 211, 0.15); /* subtle borders */
  --card-bg:       #ffffff;   /* card and panel backgrounds */

  /* Typography */
  --font-heading:  'Your Heading Font', sans-serif;
  --font-body:     'Your Body Font', sans-serif;

  /* Spacing scale */
  --spacing-xs:    0.5rem;
  --spacing-sm:    1rem;
  --spacing-md:    2rem;
  --spacing-lg:    4rem;
  --spacing-xl:    8rem;
}
```

That's it. Every visualizer (`image-grid`, `services`, `testimonials`, `graph`, etc.) reads these variables automatically — no additional config needed.

---

## Required files checklist

| File | What it contains |
|------|-----------------|
| `themes/[name]/layouts/base.njk` | Your HTML with `{{ title }}` and `{{ content \| safe }}` |
| `themes/[name]/assets/css/main.css` | Your CSS + the token contract block above |
| `themes/[name]/partials/footer.njk` | Your footer HTML (can be inline in base.njk for simple sites) |
| `themes/[name]/partials/scripts.njk` | JS includes (copy from an existing theme — handles visualizer JS) |
| `themes/[name]/theme.yaml` | Theme metadata (copy and rename from an existing theme) |

---

## Color pair system (for visualizer backgrounds)

Visualizers use semantic color pair names to declare their default background. Authors can override with `bg=` on the `:::` fence:

```markdown
::: testimonials bg=dark
:::
```

Define these **six required semantic pairs** in `main.css` using your brand colors:

```css
/* Required semantic pairs — visualizer defaults reference only these names */
.bg-light    { --pair-bg: #your-light;   --pair-title: ...; --pair-text: ...; --pair-label: ...; }
.bg-featured { --pair-bg: #your-bold;    --pair-title: ...; --pair-text: ...; --pair-label: ...; }
.bg-dark     { --pair-bg: #your-dark;    --pair-title: ...; --pair-text: ...; --pair-label: ...; }
.bg-accent   { --pair-bg: var(--accent-color); --pair-title: #fff; --pair-text: #fff; --pair-label: ...; }
.bg-muted    { --pair-bg: #f5f5f5;       --pair-title: ...; --pair-text: ...; --pair-label: ...; }
.bg-default  { --pair-bg: #ffffff;       --pair-title: ...; --pair-text: ...; --pair-label: ...; }

/* Apply them all */
.bg-light, .bg-featured, .bg-dark, .bg-accent, .bg-muted, .bg-default {
  background: var(--pair-bg) !important;
  color: var(--pair-text);
}
.bg-light h1,    .bg-light h2,    /* ... all selectors ... */
.bg-featured h1, .bg-featured h2  { color: var(--pair-title); }

/* Global heading fallback */
h1, h2, h3, h4 {
  color: var(--pair-title, var(--text-color));
}
```

Each pair declares four roles:

| Variable | Role |
|---|---|
| `--pair-bg` | Section background |
| `--pair-title` | h1–h4 heading color inside section |
| `--pair-text` | Body text color inside section |
| `--pair-label` | Small `.label` marker color |

You can add any extra named pairs (`bg-teal`, `bg-brand`) for author use in `bg=` fences. See `themes.md` for the full contract.

---

## What about existing CSS class names?

**You don't need to rename anything.** Your existing classes stay exactly as they are.

Visualizers use their own namespaced classes (e.g. `.team__member`, `.services__title`). They do not conflict with your existing CSS.

The only contract is the `:root` token variables. As long as those are defined, visualizers inherit your brand automatically.

---

## Why `theme.min.css` exists in alter-engineers

The alter-engineers theme was migrated from WordPress. The original WP theme CSS was copied as-is into `theme.min.css`. This is a valid first step — it gets the site running immediately.

Over time, section-specific CSS moves from `theme.min.css` into each visualizer's own `styles.css`. This makes those sections portable to other themes. The `theme.min.css` file shrinks toward just the base layout (nav, footer, typography).

This is the recommended migration path for any site ported from an existing design system:
1. Drop existing CSS into `theme.min.css` (or `main.css`) — site works immediately
2. Migrate section CSS into visualizer `styles.css` files as you build each visualizer
3. `theme.min.css` eventually becomes base layout only

---

## Related

- [Theme Architecture](themes.md) — full theme contract, compliance tiers, layout options
- [Visualizer Architecture](visualizers.md) — how visualizers consume CSS tokens
- [Settings Registry](settings-registry.md) — all available per-page and site-wide settings

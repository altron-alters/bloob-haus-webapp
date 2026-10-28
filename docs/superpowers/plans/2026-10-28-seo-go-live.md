# SEO Go-Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Valid sitemap + robots.txt, automatic meta descriptions, one shared SEO head block, and no third-party scripts on unlisted pages — for every bloob-haus theme — plus the Alter Engineers settings and content needed to move alterengineers.com off WordPress.com without losing search visibility.

**Architecture:** Builds on upstream's `features.show_in_search` (base sitemap/robots + `robots-meta.njk`). Shared behaviour lives in `themes/_base` (pages + partials) and two pure utilities in `scripts/utils/` (sitemap page selection, description builder). Each theme's `head.njk` replaces its own SEO tags with one `{% include "partials/seo-meta.njk" %}`. AE-specific work (theme head, `_headers`, vault content) is committed separately and never goes upstream.

**Tech Stack:** Eleventy 3.x, Nunjucks, Node ESM, vitest (`npm test`).

**Spec:** `docs/superpowers/specs/2026-10-20-seo-go-live-design.md`

## Global Constraints

- Shared commits touch only `themes/_base/**`, `themes/{melt,marbles-pouch,warm-kitchen}/**`, `scripts/**`, `lib/**`, `eleventy.config.js`, `tests/**`, `docs/**`. AE commits touch only `themes/alter-engineers/**`, `sites/alter-engineers.yaml`. Never mix the two in one commit.
- Build on upstream's SEO work, don't duplicate it: `features.show_in_search: yes | quiet | no` (default `quiet`) is the only sitemap/robots switch; `themes/_base/partials/robots-meta.njk` is the only noindex rule; `scripts/utils/search-headers.js` appends to `_headers`. Upstream's sitemap namespace, robots.txt and `<lastmod>` stay as they are.
- Tab-title separator per theme: `" | "` for `_base`, alter-engineers, marbles-pouch, warm-kitchen; `" · "` for melt.
- Automatic description: max 155 characters, cut at a word boundary, ending `…` when cut. Never written into `description`.
- Unlisted = `_bloob_unlisted` (set by the preprocessor for `visibility: unlisted`, `#unlisted`, `website_status: unlisted`). No theme-specific unlisted checks.
- melt / marbles-pouch / warm-kitchen: page bodies byte-identical before/after; head changes allowed only in description values, added Twitter tags, `og:type` per rule, and `noindex,nofollow` on unlisted pages.
- No live URL changes on any site.
- Never `git push upstream main`. Upstream gets a PR branch.
- Dev server rule: stop it before editing files.
- Every new per-page or site setting/rule gets a row in `docs/architecture/settings-registry.md`.

## Review Focus

1. **Descriptions from messy first paragraphs** (wikilinks, `![[image]]`, `:::` fences, ```` ``` ```` collection fences, HTML, quotes, emoji) must come out as clean text and must not break the HTML attribute — test in Task 3 (`strips Obsidian and fence syntax`, `quotes survive escaping` in Task 4).
2. **Pages whose body is only a fence or a list** (folder indexes with just a `collection` block) must fall back to subtitle or site description, never to fence syntax — test in Task 3.
3. **Homepage titles of other sites**: the new rule prefers the homepage's `title:`; a marbles/buffbaby homepage carrying an incidental `title` (e.g. `index`) would change its tab title — caught by the Task 1 compare in Task 5; if it changes, stop and ask Leon.
4. **Sitemap URLs containing `&`, spaces or uppercase** must be XML-escaped and match the live URL exactly — test in Task 2.
5. **Unlisted pages reached through other doors** (embed pages, folder-index stubs): unlisted pages are excluded from `collections.all`, so `embed-pages.njk` never paginates them — assert in Task 6 that a built unlisted page has no `/embed/` twin and no snippet output.

---

### Task 0: Git preparation

**Files:** none (repository state)

- [ ] **Step 1:** `git status` clean; `git push origin main` (pushes the 31 local commits). Expected: `main -> main`.
- [ ] **Step 2:** `git fetch upstream && git merge upstream/main` (32 commits as of 2026-10-28, including the `show_in_search` SEO work 02a5ec7/823ffea/4a89579). Resolve conflicts keeping both sides' intent. Read the spec's "Reconciled with upstream" section before resolving anything in `scripts/assemble-src.js`, `themes/_base/pages/`, or theme heads.
- [ ] **Step 3:** `ls .github/workflows/` must list `deploy-alter-engineers.yml`; if missing, restore per CLAUDE.md and commit `chore(ci): restore AE deploy workflow deleted by upstream merge`.
- [ ] **Step 4:** `npm test` → all pass (record the count as the baseline). `git push origin main`.
- [ ] **Step 5:** `git checkout -b seo-go-live`.

### Task 1: Build-comparison tool + baselines

Needed to prove the other themes don't change. Reusable for any future shared change.

**Files:**
- Create: `scripts/compare-builds.js`, `scripts/utils/html-parts.js`
- Test: `tests/utils/html-parts.test.js`

**Interfaces:**
- Produces: `splitHtml(html: string) -> { headTags: string[], body: string }` — `headTags` = each `<title>`, `<meta …>`, `<link rel="canonical" …>` in `<head>`, normalised whitespace, sorted; `body` = everything between `<body…>` and `</body>`.
- Produces CLI: `node scripts/compare-builds.js --before=<dir> --after=<dir>` → prints, per `.html` file: `BODY CHANGED`, added/removed head tags; plus files only in one side; exit 0.

- [ ] **Step 1:** Test `splitHtml`: given a document with `<title>A</title>`, two metas and a body `<p>x</p>`, `headTags` equals the three sorted tag strings and `body` equals `<p>x</p>`; whitespace inside a tag is collapsed.
- [ ] **Step 2:** Run `npx vitest run tests/utils/html-parts.test.js` → FAIL.
- [ ] **Step 3:** Implement `splitHtml` and the CLI (walk both dirs, compare `.html` files plus `sitemap.xml`/`robots.txt` as whole text).
- [ ] **Step 4:** Test passes.
- [ ] **Step 5:** Baselines (before any other task): for each of `buffbaby` (warm-kitchen), `marbles` (marbles-pouch), `melt` (melt), `alter-engineers`:
  `GITHUB_TOKEN=$(gh auth token) SITE_NAME=<site> node scripts/build-site.js` then copy `_site` to `C:/ae-dev/_seo-baseline/<site>/`. If a content repo can't be cloned, record which and tell Leon; don't skip silently.
- [ ] **Step 6:** Commit `chore(scripts): compare-builds tool for head/body diffs between builds` (shared).

### Task 2: Sitemap fixes on top of upstream's `show_in_search`

Upstream already ships `themes/_base/pages/sitemap.njk` + `robots.njk`, gated by `features.show_in_search: yes` (see spec "Reconciled with upstream"). This task fixes what it still gets wrong. No new settings.

**Files:**
- Create: `scripts/utils/sitemap-pages.js`
- Modify: `themes/_base/pages/sitemap.njk` (loop over `collections.all | sitemapPages`, keep upstream's `<lastmod>`), `eleventy.config.js` (register filter)
- Test: `tests/utils/sitemap-pages.test.js`, extend `tests/sitemap-template.test.js`

**Interfaces:**
- Produces: `sitemapPages(items: Array<{url, outputPath, data}>) -> Array<item>` — keeps items whose `outputPath` ends `.html`, `url` is a string, `data._bloob_unlisted` is not true, `data.eleventyExcludeFromCollections !== true` (an array such as `["tagList"]` means "excluded from that list only" and keeps the page), `url !== "/404.html"`; sorted by `url`. Registered as Eleventy filter `sitemapPages`.

- [ ] **Step 1:** Tests for `sitemapPages`: homepage `/` with `eleventyExcludeFromCollections: ["tagList"]` kept (this is the leons.bloob.haus bug, verified live 2026-10-28: no homepage in its sitemap); folder index with the same array kept; `true` dropped; `_bloob_unlisted` dropped; `/404.html` dropped; `/feed.xml` dropped; sorted.
- [ ] **Step 2:** In `tests/sitemap-template.test.js`: a page whose URL contains `&` renders `&amp;` inside `<loc>`. Keep all upstream assertions (namespace, XML declaration first, unlisted, one switch for every theme).
- [ ] **Step 3:** Run both → FAIL.
- [ ] **Step 4:** Implement the filter, register it, use it in `sitemap.njk` with `{{ (site.url + p.url) | escape }}`.
- [ ] **Step 5:** `npm test` all pass.
- [ ] **Step 6:** Commit `fix(seo): sitemap keeps folder indexes and the homepage, drops 404, escapes URLs` (shared).

### Task 3: Automatic description builder

**Files:**
- Create: `scripts/utils/seo-description.js`
- Modify: `scripts/preprocess-content.js` (after the subtitle block, ~line 650)
- Test: `tests/utils/seo-description.test.js`

**Interfaces:**
- Produces: `buildSeoDescription({ description, subtitle, body, siteDescription, maxLength = 155 }) -> string`
- Produces frontmatter field `seo_description` on every processed page (read by Task 4).

Rules: `description` (trimmed, non-empty) wins as-is. Else plain(`subtitle`) + `" — "` + plain(first prose paragraph), or whichever exists. Else `siteDescription`. Plain = strip inline markdown (reuse `stripInlineMarkdown` from `title-deduplicator.js`), `[[a|b]]`→`b`, `[[a]]`→`a`, drop `![[…]]` and `![…](…)`, drop HTML tags, collapse whitespace. "First prose paragraph" skips headings, fences (```` ``` ```` and `:::` blocks to their close), tables, list items, image-only lines, blank lines. Truncate as Global Constraints.

- [ ] **Step 1:** Tests:
  - `uses frontmatter description untouched` — `description: "Engineering an alternative"` → exactly that.
  - `subtitle plus first paragraph` — subtitle `Radiant Floors and Fresh Air Define This All-Electric School Building`, body starting `This was a unique opportunity…` → starts `Radiant Floors and Fresh Air Define This All-Electric School Building — This was a unique opportunity`, length ≤ 155, ends `…`.
  - `strips Obsidian and fence syntax` — body ``"::: card-preview\n[[a]]\n:::\n\n```collection\nsource: folder=x\n```\n\nSee [[Campbell Library|the library]] and **bold** <b>tag</b>."`` → `See the library and bold tag.`
  - `fence-only body falls back` — body only a `collection` fence, no subtitle → `siteDescription`.
  - `never cuts mid-word` — 300-char paragraph → result ≤ 155 chars, ends with `…`, character before `…` is not a space and the cut fell at a space.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Pass.
- [ ] **Step 5:** In `preprocess-content.js` set `outputFrontmatter.seo_description = buildSeoDescription({ description: frontmatter.description, subtitle: outputFrontmatter.subtitle, body: processedContent, siteDescription: <site description from loaded config> })`. Verify: `npm test` passes; a dev build of AE shows `seo_description:` in `src-alterengineers/projects/campbell-library-renovation.md`.
- [ ] **Step 6:** Commit `feat(preprocess): automatic seo_description for every page` (shared).

### Task 4: Shared SEO head block

**Files:**
- Create: `themes/_base/partials/seo-meta.njk`
- Modify: `themes/_base/partials/head.njk`, `themes/melt/partials/head.njk`, `themes/marbles-pouch/partials/head.njk`
- Test: `tests/seo-meta-partial.test.js` (pattern: `tests/visitor-count-partial.test.js`, `nunjucks.renderString` with autoescape on)

**Interfaces:**
- Consumes: `seo_description` (Task 3), `_bloob_unlisted`, `title`, `image`, `site.{title,description,url}`, `page.url`.
- Produces: partial expecting `seo_title_sep` set by the including head (`{% set seo_title_sep = " · " %}` before the include); default `" | "`.
- Owns exactly: `<title>`, meta description, canonical, `{% include "partials/robots-meta.njk" %}` (upstream's rule, unchanged), `og:type/site_name/url/title/description/image(+width,type)`, `twitter:card/url/title/description/image`. Description = `seo_description or description or site.description`. Title on `/` = `title or site.title`; elsewhere `title + seo_title_sep + site.title`. `og:type` = `website` on `/`, else `article`.

- [ ] **Step 1:** Tests: homepage with `title:"Alter Engineers – Sustainable MEP Engineering, Bay Area"` → that `<title>`; homepage without title → `site.title`; inner page with sep `" · "` → `Campbell Library · Alter Engineers`; `seo_description` beats `description`; robots tag present for `_bloob_unlisted:true` and for `site.features.show_in_search == "no"`, absent otherwise; `og:type` website on `/`, article on `/projects/x/`; `quotes survive escaping` — description `He said "hi" & left` renders `content="He said &quot;hi&quot; &amp; left"`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Write the partial (port tags from `themes/alter-engineers/partials/head.njk:5-46`, which has the fullest set). **Step 4:** Pass.
- [ ] **Step 5:** In `_base`, melt and marbles-pouch heads: delete their own copies of the owned tags (including their direct `robots-meta.njk` include, which now comes through seo-meta), add the include with the right `seo_title_sep`. Keep everything else in each head unchanged. Update upstream's test `robots meta tag … is used by every maintained theme's head` (`tests/sitemap-template.test.js`) to accept robots-meta reached through `seo-meta.njk`, keeping its intent: every theme head ends up emitting the rule.
- [ ] **Step 6:** `npm test` passes. Commit `feat(base): one shared SEO head block for all themes` (shared).

### Task 5: Prove other themes are unchanged

**Files:** none

- [ ] **Step 1:** Rebuild `buffbaby`, `marbles`, `melt` as in Task 1 Step 5 into `C:/ae-dev/_seo-after/<site>/`.
- [ ] **Step 2:** `node scripts/compare-builds.js --before=C:/ae-dev/_seo-baseline/<site> --after=C:/ae-dev/_seo-after/<site>` for each.
- [ ] **Step 3:** Expected: zero `BODY CHANGED`; head diffs only of the allowed kinds (Global Constraints); `<title>` unchanged on every page (Review Focus 3); sitemap/robots unchanged except Task 2's fixes (homepage + folder indexes now listed on sites set to `yes`). Anything else → fix the cause, or stop and ask Leon if it's a judgement call. Paste the summary into the task report.

### Task 6: No third-party scripts on unlisted pages

**Files:**
- Modify: `themes/_base/partials/site-snippets-head.njk`, `site-snippets-footer.njk`, `comments.njk`, `visitor-count.njk`
- Test: `tests/unlisted-third-party.test.js`

- [ ] **Step 1:** Tests: for each partial, render with the triggering site data (`site.snippets.head`, `site.snippets.bodyEnd`, `site.embeds['fast-comments-embed']`, `site.analytics` with goatcounter code + `show_visitor_count:true`) and `_bloob_unlisted:true` → output contains no snippet/widget; with `_bloob_unlisted` absent → present. Plus a scan test: no file under `themes/**` or `lib/visualizers/**` except these four partials contains `site.snippets` or `fast-comments-embed` (so no theme bypasses the guard).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Wrap each partial body in `{% if not _bloob_unlisted %}…{% endif %}`; update each header comment to say why. **Step 4:** Pass; existing `comments-partial` and `visitor-count-partial` tests still pass.
- [ ] **Step 5:** Review Focus 5: in an AE dev build, `_site/clients/607ae1867838a487c5f709a8953139c2/UCOP/embed/` does not exist.
- [ ] **Step 6:** Commit `fix(base): never inject third-party snippets on unlisted pages` (shared).

### Task 7: Shared docs

**Files:** `docs/architecture/settings-registry.md`, `docs/architecture/security-by-obscurity.md`, `docs/next-steps.md`, `docs/implementation-plans/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/TECH-DEBT.md` (if anything new)

- [ ] **Step 1:** settings-registry: rows for the homepage-title rule and `seo_description` (automatic, head-only); amend the `features.show_in_search` row with Task 2's fixes. Don't touch upstream's `docs/settings-backlog.md` unless a new open item appears.
- [ ] **Step 2:** security-by-obscurity.md per spec A6 (snippets/comments/visitor count automatic on unlisted). The sitemap and noindex rows were already made universal upstream; only check they still read true.
- [ ] **Step 3:** next-steps.md line 76: remove the stale claim that sitemap/robots were already generated. DECISIONS: shared SEO head block + unlisted snippet guard, dated. CHANGELOG session entry.
- [ ] **Step 4:** Commit `docs: SEO head block, sitemap, unlisted snippet guard` (shared).

### Task 8: Alter Engineers theme

**Files:**
- Modify: `themes/alter-engineers/partials/head.njk:5-46` (replace owned tags with the include, `seo_title_sep = " | "`)
- Delete: `themes/alter-engineers/pages/sitemap.njk`
- Create: `themes/alter-engineers/_headers`
- Modify (shared, separate commit): `scripts/assemble-src.js` copies `themes/<theme>/_headers` to `<src>/_headers` when present; `eleventy.config.js:125` passthroughs `<src>/_headers` → `_headers` when it exists and the magic-machines file doesn't apply. `search-headers.js` (show_in_search: no) appends after it, so both survive.

`_headers` content (exact):
```
https://:project.pages.dev/*
  X-Robots-Tag: noindex

/clients/*
  X-Robots-Tag: noindex
```

- [ ] **Step 1:** Test (shared): `assemble-src` copies a theme `_headers` into src when present and not otherwise; and `addNoindexHeader` appended to a deploy dir that already holds the theme rules keeps them (extend `tests/build/search-headers.test.js`). Run → FAIL → implement → PASS. Commit `feat(build): theme-owned Cloudflare _headers file` (shared).
- [ ] **Step 2:** AE head + sitemap deletion + `_headers`. Set `show_in_search: yes` in the AE vault's `_bloob-settings.md` `features:` and remove its stale `sitemap:`/`robots_txt:` keys (vault commit, pushed with Task 10). AE dev build; verify in `_site`: `sitemap.xml` has the sitemaps.org namespace, contains `https://alterengineers.com/` and `/projects/`, no `404` and no `clients`; `robots.txt` matches; `_headers` present; `/projects/campbell-library-renovation/index.html` meta description is not "Engineering an alternative".
- [ ] **Step 3:** Commit `feat(alter-engineers): shared SEO head, base sitemap, noindex headers` (AE).

### Task 9: Upstream PR and fork deploy

- [ ] **Step 1:** `git fetch upstream`; `git checkout -b seo-upstream upstream/main`; cherry-pick the shared commits from Tasks 1–4, 6, 7 and the shared half of Task 8, in order. If upstream changed the sitemap or heads again since Task 0, re-merge first. Resolve conflicts; `npm test` passes.
- [ ] **Step 2:** `git push upstream seo-upstream`; `gh pr create -R LSanten/bloob-haus-webapp --base main --head seo-upstream` with a summary of the shared changes, the Task 5 compare results, and the leons.bloob.haus homepage-missing-from-sitemap finding that Task 2 fixes. Do not merge; Leon reviews.
- [ ] **Step 3:** `git checkout seo-go-live`; merge into fork `main`; `npm test`; `git push origin main`. Wait for the "Deploy Alter Engineers" run to succeed (`gh run list -R altron-alters/bloob-haus-webapp -L 1`).

### Task 10: AE content (vault)

Vault: `G:/Shared drives/ACE_Drive/04_Marketing/Website/_live-website-content-obsidian-repo`. Push with `git -c http.postBuffer=157286400 push` (slow connection).

- [ ] **Step 1 (copy draft):** Write drafts for: `projects/_index.md` H1 + intro (replace "Some test words to see what it looks like."), `resources/_index.md` intro, `about.md` (article shape, from homepage About Us copy), `privacy.md` (states Google Analytics is used, what it collects, contact ace@alterengineers.com). **Stop and get Leon's approval of the wording.**
- [ ] **Step 2:** `index.md`: `title: Alter Engineers – Sustainable MEP Engineering, Bay Area`; `description: "Engineering an alternative: mechanical, plumbing and energy engineering for healthy, all-electric buildings in Oakland and the Bay Area."`
- [ ] **Step 3:** `clients/_index.md` with `website_status: unlisted` (suppresses public `/clients/`).
- [ ] **Step 4:** `_bloob-settings.md`: `header-snippet` fence with a JSON-LD `ProfessionalService` block (name Alter Engineers, url `https://alterengineers.com/`, telephone `+1-510-474-0379`, email `ace@alterengineers.com`, address 825 Washington St STE 227, Oakland, CA 94607, US; areaServed "San Francisco Bay Area"; `knowsAbout` = the homepage services list; `sameAs` LinkedIn `https://www.linkedin.com/company/alterengineers`). Google Analytics tag added only once Leon provides the GA4 ID.
- [ ] **Step 5:** Commit + push; after deploy, verify on pages.dev: homepage `<title>`, `/about/` 200, `/clients/` 404 or noindex and absent from sitemap, `curl -sI https://alter-engineers.pages.dev/ | grep -i x-robots-tag` → `noindex`, JSON-LD passes Google's Rich Results Test.
- [ ] **Step 6:** Pre-ship dependency scan (security-by-obscurity.md procedure) on `/clients/607ae1867838a487c5f709a8953139c2/UCOP/` and both `.html` files: no Tier C/D; both `.html` return `X-Robots-Tag: noindex`.

### Task 11: Hand-off list for Leon (not code)

Report, don't do: GSheet OUSD Claremont row → `public` (C6); the five `review` profiles → `public` or `draft` before DNS cutover (C8); GA4 property ID; alt-text pass; Search Console ownership; the DNS plan in the Claude Doc.

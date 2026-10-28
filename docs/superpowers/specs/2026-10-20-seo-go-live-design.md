# SEO go-live readiness — alterengineers.com on bloob haus

**Date:** 2026-10-20 · **Status:** design, awaiting approval · **Owner:** Leon
**Audit it rests on:** live comparison of alterengineers.com (WordPress.com) vs alter-engineers.pages.dev, 2026-10-19.

## Intent

Alter Engineers wants to switch alterengineers.com from WordPress.com to the bloob-haus build **soon**,
because the WordPress content is stale and hard to update. The switch must not cost search visibility,
and should gain some: the new site has ~25 project profiles where the old one had 7.

The searches that matter (Leon's words): MEP engineering, mechanical engineering for architects,
sustainable building engineering, specific technologies (e.g. radiant cooling), with Oakland / Bay Area
as the location qualifier. Landing pages that matter: the **homepage**, the **projects overview**, and
**project profiles** where they fit the search.

The work is also bloob-haus work: every SEO fix that is not Alter-specific lands in `themes/_base` so all
themes get it, and goes upstream to `LSanten/bloob-haus-webapp`.

## What the audit found (baseline)

Google reads both sites the same way: complete server-rendered HTML, no JavaScript needed, same homepage
H1 and service headings, canonicals already point at `https://alterengineers.com`, project grid cards are
real `<a>` links in the HTML. Remaining gaps:

| # | Finding | Where it's fixed |
|---|---|---|
| 1 | `sitemap.xml` declares the wrong namespace (`http://www.w3.org/2001/XMLSchema-instance`) → Google rejects it. warm-kitchen's copy is wrong too (`…/2000/sitemaps.org/…`). melt and marbles-pouch have no sitemap at all. | Part A1 |
| 2 | Sitemap omits `/` and `/projects/` and includes `/404.html`. **Root cause (verified in `src-alterengineers/`):** index pages carry `eleventyExcludeFromCollections: [tagList]` (exclude from tag lists only); the AE template treats *any* truthy value as "exclude". `404.njk` carries no exclusion. | Part A1 |
| 3 | No robots.txt is generated for AE; Cloudflare serves a comments-only placeholder with no `Sitemap:` line. `features.sitemap` / `features.robots_txt` exist in `_bloob-settings.template.md` but **nothing reads them** (next-steps.md line 76 claims otherwise — stale). | Part A2 |
| 4 | Every page's meta description is the site slogan "Engineering an alternative". | Parts A4, C1 |
| 5 | Homepage `<title>` is hard-coded to `site.title` in the AE head; `index.md`'s `title:` is ignored. melt already prefers the homepage `title:` (settings-registry). | Parts A3, C1 |
| 6 | AE's head is a fork of `_base`'s head and has drifted (e.g. `website_status == "unlisted"` vs `_base`'s `_bloob_unlisted`; homepage `og:type` is `article`). | Parts A3, B1 |
| 7 | Old URLs `/about/`, `/contact/`, `/projects/ousd-claremont-multi-purpose-building/` 404 on the new site. | **Done 2026-10-20** for contact + OUSD; about → C3 |
| 8 | Placeholder copy live on landing pages: "Some test words to see what it looks like." on `/projects/` and `/resources/`; projects H1 reads "Our Projects from Alter Engineers" → `<title>` says "Alter Engineers" twice. | Part C2 |
| 9 | No structured data (business name/address/services) on either site. | Part C4 |
| 10 | No Google Analytics on the old site (Jetpack stats only). No Search Console *meta tag*, but DNS has **two `google-site-verification` TXT records** → a Search Console domain property may already exist (one record may be Google Workspace's). Owner unknown. | Part D1 |
| 12 | **Unlisted pages get every third-party script the site configures.** `site-snippets-head.njk`, `site-snippets-footer.njk`, `comments.njk` and `visitor-count.njk` (all `_base`, used by every theme) never check `_bloob_unlisted`. Analytics, comments and the GoatCounter visitor count are Tier C per `docs/architecture/security-by-obscurity.md`: they send the full secret URL to the third party. **No leak today on AE** (its `_bloob-settings.md` has no snippet fences), but adding GA (C4) would leak `/clients/<token>/UCOP/`. Any other site with GoatCounter or comments has this leak on its unlisted pages now. | Part A5 |
| 13 | Pre-ship dependency scan of AE's client content (2026-10-21, per security-by-obscurity.md): rendered `UCOP/` page has `noindex`; external deps are Tier B only (Fontshare fonts, jsDelivr PhotoSwipe CSS) plus footer outbound links (origin-only under the `strict-origin-when-cross-origin` header). Token absent from sitemap, graph.json and feed. **Gaps:** the two raw `.html` client files have no `noindex` (no meta, no `X-Robots-Tag`); `/clients/` is a public auto-generated folder page listed in the sitemap ("Clients \| Alter Engineers"), announcing the container (the doc's step 4 says suppress it). | Part C7 |
| 11 | DNS for alterengineers.com is hosted by WordPress.com (`ns1-3.wordpress.com`) and carries company email: Google Workspace MX (`aspmx.l.google.com` + alts), SPF `include:_spf.google.com include:_spf.wpcloud.com`, the two verification records, and possibly DKIM/DMARC records (not enumerable from outside). | Part D |

Already done on 2026-10-20 (content vault, pushed): OUSD Claremont profile published + typo fixed,
`contact.md` created, 45 MB unreferenced test image compressed to 1.3 MB.

Not a problem (checked): project images are already served as responsive WebP (`/media/optimized/…-1200w/2400w`)
with lazy loading; the large originals only cost build time.

## Goals

1. A **valid sitemap** and a **real robots.txt** for every theme, from `_base`, behind the existing
   `features.sitemap` / `features.robots_txt` flags.
2. **Every page gets a meaningful, unique meta description automatically**, and a `description:` in a
   page's YAML always wins.
3. The **homepage `<title>` comes from `index.md`'s `title:`** (falling back to the site name).
4. **One shared SEO head block** in `_base` that every theme's head includes, so titles, descriptions,
   canonical, robots, Open Graph and Twitter tags change in one place for all themes.
5. Alter-specific content and settings fixed (titles, descriptions, placeholders, about page, analytics,
   structured data), and a **go-live checklist** for the DNS switch.

## Non-goals

- Redirect infrastructure. Every old URL that carries value now has a page at the same address; the only
  leftovers are a WordPress sample post (`/2021/05/28/example-post-3/`) and image-attachment pages, which
  may 404.
- Automatic alt text. Leon writes alt text himself (go-live checklist item); empty alt is not a ranking problem.
- A builder feature for structured data. Only one site needs it; it goes in AE's `header-snippet` fence
  (Rule of Three).
- Keyword tooling, content rewrites beyond the placeholders listed here, Google Business Profile management.

## Anti-goals (failure even if it "works")

- **Any visible change on melt, marbles-pouch or warm-kitchen pages.** The automatic description must never
  render on the page; melt (`folder-index.njk`) and warm-kitchen (`tags.njk`, `feed.njk`) render
  `description` visibly, so the automatic value must **not** be written into `description`.
- Any live URL changing on any site.
- Unlisted, draft, embed or 404 pages appearing in a sitemap or becoming indexable.
- Shared and AE-specific changes in the same commit.

## Constraints

- Multi-site / holistic change rule (`bloob-haus-webapp/CLAUDE.md`): shared changes backwards compatible;
  new behaviour gated by a site setting; check every theme.
- Verify before fixing; regression test first for each bug.
- Commit hygiene: shared commits (`themes/_base/**`, `scripts/**`, `lib/**`, `tests/**`, `docs/architecture/**`)
  separate from AE commits (`themes/alter-engineers/**`, `sites/alter-engineers.yaml`). Note: deleting
  warm-kitchen's broken sitemap is a shared (non-AE) theme change and goes upstream.
- Upstreaming: the fork is 75 commits ahead / 21 behind `upstream/main`. Shared commits go upstream as a
  **pull request on `LSanten/bloob-haus-webapp`** from a branch cut from `upstream/main` (cherry-pick the
  shared commits; they must apply cleanly there). Never `git push upstream main`.
- New per-page or site settings → `docs/architecture/settings-registry.md` rows.
- Project-profile `website_status` is owned by the Project Profiles GSheet (`ProjectProfileManager.js`
  overwrites it on sync); content changes to profiles must be mirrored in the sheet.
- Host: Cloudflare Pages (`alter-engineers` project, deployed by `.github/workflows/deploy-alter-engineers.yml`).
  Old host: WordPress.com (Automattic IPs). Go-live = DNS cutover.

## Design

### Reconciled with upstream (2026-10-28)

Upstream (`LSanten/bloob-haus-webapp`, commits 02a5ec7, 823ffea, 4a89579, 2026-10-24…27) already shipped
the base of A1/A2 and part of A3, and this design now **builds on it instead of duplicating it**:

- `themes/_base/pages/sitemap.njk` + `robots.njk` exist, with the correct namespace, filtering `_bloob_unlisted`.
  warm-kitchen's copies are gone; alter-engineers is the only theme still shipping its own.
- They are gated by **`features.show_in_search: yes | quiet | no`** (default `quiet` = no sitemap). The old
  `features.sitemap` / `features.robots_txt` keys are ignored. `no` adds `noindex` to every page and appends
  `X-Robots-Tag` to `_headers` (`scripts/utils/search-headers.js`).
- `themes/_base/partials/robots-meta.njk` is the one noindex rule; every theme head includes it (melt too).
- `docs/settings-backlog.md` tracks the cloud side (SET3 `show_in_search` on the account page, SET5 sitemap index).

What changes in this design because of that:

- **A1 shrinks to sitemap fixes on top of upstream's template:** (a) array-valued
  `eleventyExcludeFromCollections` (folder indexes, the homepage) must not drop a page — verified live:
  leons.bloob.haus/sitemap.xml has no homepage today; (b) `/404.html` never listed; (c) `<loc>` XML-escaped.
  Upstream's `<lastmod>` stays (its choice wins over this spec's "omit").
- **A2 is done upstream.** No new flags; `selectBasePages` keeps its `showInSearch` option.
- **A3's partial includes `robots-meta.njk`** instead of owning a robots rule; heads keep exactly one
  robots-meta include (through seo-meta).
- **AE:** delete AE's `sitemap.njk` and set `show_in_search: yes` in the AE vault's `_bloob-settings.md`
  (replacing its stale `sitemap`/`robots_txt` keys). Safe before cutover because pages.dev gets
  `X-Robots-Tag: noindex` (C7) and the sitemap lists alterengineers.com URLs.
- The AE `_headers` rules (C7) must survive `search-headers.js`, which **appends** to `_headers`.

### Part A — shared builder (`_base`, goes upstream)

**A1. Sitemap in `_base`.** Add `themes/_base/pages/sitemap.*` with the correct namespace
`http://www.sitemaps.org/schemas/sitemap/0.9`. Include every published HTML page, including the homepage
and folder indexes. Exclude: unlisted pages (`_bloob_unlisted`), pages with `eleventyExcludeFromCollections: true`
(boolean, as opposed to an array of collection names), 404, feed, embed pages, non-HTML outputs. Gate with
`features.sitemap` (default on) in `selectBasePages` the same way `feed.njk` is gated by `features.rss`.
Delete the broken theme copies (`alter-engineers/pages/sitemap.njk`, `warm-kitchen/pages/sitemap.njk`) so
they stop shadowing it. URLs use `site.url` (so the AE sitemap lists `https://alterengineers.com/...`).

**A2. robots.txt in `_base`.** `themes/_base/pages/robots.*`: allow all, plus
`Sitemap: {site.url}/sitemap.xml`. Gate with `features.robots_txt` (default on); warm-kitchen's existing
`robots.njk` keeps shadowing it unless the builder finds it should be removed too.

**A3. Shared SEO head block.** New `themes/_base/partials/seo-meta.njk` owns: `<title>`, meta description,
canonical, robots (`noindex,nofollow` when `_bloob_unlisted`), Open Graph, Twitter. Each theme's `head.njk`
(`_base`, alter-engineers, melt, marbles-pouch, warm-kitchen) replaces its own copies of those tags with one
include — a one-time edit per theme. Rules:
- Homepage title: `title:` from the homepage's frontmatter when set, else `site.title` (melt's existing rule,
  now everywhere). Other pages: `{{ title }}{sep}{{ site.title }}` where the separator is a **theme-level
  variable** passed into the include (AE/_base/marbles/warm-kitchen ` | `, melt ` · `), so **every theme's tab
  titles stay byte-identical** except the AE homepage. *(My call — not a site setting, no registry row.)*
- `og:type`: `website` on `/`, `article` elsewhere.
- Unlisted detection uses `_bloob_unlisted` (the canonical flag), not theme-specific fields.
- **Allowed head changes on melt, marbles-pouch and warm-kitchen** *(my call)*: meta/OG/Twitter description
  values; Twitter tags added where missing; `og:type` per the rule above; `noindex,nofollow` added to unlisted
  pages where a theme lacks it (melt today — this is a **bug fix**: melt's unlisted pages are currently
  indexable although `settings-registry.md` marks melt ✓). Everything else in `<head>` unchanged, and
  **rendered page bodies identical** — verify by diffing a before/after build per theme.

**A4. Automatic meta description.** The preprocessor computes a head-only field (name is the builder's call,
e.g. `seo_description`) for every page, which `seo-meta.njk` uses for meta description, `og:description` and
`twitter:description`. Source order:
1. frontmatter `description` (author always wins);
2. otherwise the extracted `subtitle` (plain text) followed by the first body paragraph;
3. otherwise `site.description`.
Strip markdown, wikilinks, Obsidian `%% %%` comments and HTML; collapse whitespace; trim to ~155 characters
at a word boundary with an ellipsis. Never written into `description`.

**A5. No third-party scripts on unlisted pages (security, all sites).** Each of the four `_base` partials that
inject site-configured third-party code (`site-snippets-head.njk`, `site-snippets-footer.njk`, `comments.njk`,
`visitor-count.njk`) renders nothing when `_bloob_unlisted` is true. Always on: there is no opt-out, because a
Tier C script on an unlisted page defeats the only protection the page has. Consequence (follows from Leon's
2026-10-21 decision to fix this in `_base`): unlisted pages are not counted by analytics / GoatCounter and show
no comments, on every site.
- Regression tests first: render an unlisted and a listed page with each fence present; assert the snippet is
  absent and present respectively. Plus a test that every theme's head/layout reaches these partials (no theme
  inlines its own snippet injection).
- Embed pages (`/slug/embed/`) follow their source page's unlisted state.
- Because the guard lives in `_base` partials, it ships upstream with Part A and protects every bloob-haus site.

**A6. Docs.** settings-registry rows for the homepage-title rule and the automatic description; fix the stale
claim in `docs/next-steps.md` (line 76) that sitemap/robots are already generated per site; DECISIONS entry
for the shared SEO head block. **`docs/architecture/security-by-obscurity.md`:** add site snippets, comments and
visitor count to "Theme-injected dependencies" and to the "what the pipeline does universally" table as
✅ automatic (A5); change the sitemap row from "per-theme obligation" to ✅ universal (A1); correct the `noindex`
row: today AE and melt don't use `_base`'s check, but they do after A3 (cite this spec).

### Part B — AE theme (fork only)

**B1.** AE `head.njk` includes `seo-meta.njk` in place of its own title/meta/canonical/robots/OG/Twitter tags.
AE-specific bits (fonts, redirect meta-refresh, RSS link, favicon) stay.
**B2.** Delete `themes/alter-engineers/pages/sitemap.njk` (covered in A1 but committed on the AE side).

### Part C — AE content and settings (content vault)

**C1. Homepage** (`index.md`): `title: Alter Engineers – Sustainable MEP Engineering, Bay Area`;
`description: "Engineering an alternative: mechanical, plumbing and energy engineering for healthy,
all-electric buildings in Oakland and the Bay Area."` (Leon approved the direction 2026-10-20.)
**C2. Placeholders:** replace the test sentence and the H1 on `projects/_index.md` and `resources/_index.md`.
**C3. About page:** `about.md` (article shape) restoring `/about/`, built from the homepage "About Us" copy.
*Copy for C2/C3: Claude drafts, Leon approves before launch (my call).*
**C4. `_bloob-settings.md` `header-snippet` fence:** Google Analytics 4 tag, Search Console verification tag
(only if DNS verification is not used), and a JSON-LD `ProfessionalService` block: name, URL, logo, phone
(510) 474-0379, email ace@alterengineers.com, address 825 Washington St STE 227, Oakland, CA 94607,
area served (San Francisco Bay Area), services (from the homepage services list), LinkedIn as `sameAs`.
**C5. Privacy page** (`privacy.md`): short policy disclosing Google Analytics — required by Google
Analytics' terms. No cookie banner (US firm below CCPA thresholds; not legal advice).
**C6. GSheet:** set the OUSD Claremont row's `website_status` to `public` so the next sync doesn't revert it.
**C7. Client-content hardening** (per security-by-obscurity.md, gaps in finding 13):
- `clients/_index.md` with `website_status: unlisted` → suppresses the public `/clients/` stub and removes it
  from the sitemap.
- A Cloudflare Pages `_headers` file for AE: `X-Robots-Tag: noindex` on `/clients/*` (covers the raw `.html`
  files) and on the `*.pages.dev` host (D3). Where `_headers` is authored (vault root passthrough vs AE theme)
  is the builder's call; it must not affect other sites.
- Re-run the pre-ship dependency scan on `/clients/` content after A5 + C4 ship and before DNS cutover; GA
  must be absent from `/clients/<token>/…`.
**C8. `review` profiles stay visible on purpose** (Leon, 2026-10-21: colleagues review them on the live page).
They are built, listed and indexed like `public` today. Before DNS cutover each becomes `public` (cleaned up) or
`draft`/`unlisted` via the GSheet, which only knows public/unlisted/archived/draft; its next sync turns `review`
into `draft` anyway. James Logan currently shows a visible "THERE IS ALMOST NO METADATA IN HERE!!!" line.

### Part D — go-live checklist (in order)

1. **Before the switch:** find out who owns the existing `google-site-verification` records / any Search
   Console property for alterengineers.com and get access; if none, create a **Domain property (DNS TXT)**.
   Export Search Console data (if any) and Jetpack stats (top pages + search terms) as the "before" picture.
1b. **DNS move (protects company email).** The domain is *registered* at WordPress.com (Automattic, expires
   2027-06-24) and its DNS is hosted there. Only the DNS hosting moves; the registration stays. A bare domain
   on Cloudflare Pages needs the DNS zone on Cloudflare (Leon asked 2026-10-21 whether only the website records
   could move: a `www` CNAME could, but the bare domain can't, and moving the site to `www` would change every
   indexed URL, so this was rejected). Steps:
   1. Export the full zone from the WordPress.com DNS panel (DKIM selectors etc. can't be discovered from outside).
   2. Add the domain to Cloudflare (the account that owns the `alter-engineers` Pages project), recreate every
      record (MX, SPF, DKIM, DMARC, both verification TXTs, any subdomains).
   3. **Zero-risk check before switching:** query Cloudflare's assigned nameservers directly
      (`nslookup -type=MX alterengineers.com <name>.ns.cloudflare.com`, same for TXT and each subdomain) and
      compare with WordPress.com's answers record by record. Nothing is live yet at this point.
   4. Switch nameservers in WordPress.com domain settings on a **weekend night** (Leon's preference). During
      propagation (hours, up to 48 h) both DNS hosts give identical mail answers, so email keeps flowing.
      Don't delete anything at WordPress.com.
   5. Test email in and out; confirm MX/SPF answer from Cloudflare.
   The `_spf.wpcloud.com` SPF include can be dropped later, once WordPress.com no longer sends mail for the domain.
2. Ship A–C to pages.dev and verify: sitemap validates; robots.txt lists it; titles/descriptions per page;
   structured data passes Google's Rich Results Test; old URLs (`/`, `/about/`, `/contact/`, `/projects/`,
   the 7 old project URLs) all return 200.
3. Keep `*.pages.dev` out of Google: canonicals already point at alterengineers.com; additionally serve
   `X-Robots-Tag: noindex` on the pages.dev host (Cloudflare Pages `_headers` supports host patterns —
   where this lives is the builder's call).
4. DNS cutover: custom domain alterengineers.com (+ `www` → apex redirect) on the Cloudflare Pages project;
   HTTPS; enable HSTS (the old host sent it).
5. Submit the sitemap in Search Console; URL-inspect `/`, `/projects/` and a few profiles; request indexing.
6. Google Business Profile: confirm it exists and links to `https://alterengineers.com/`.
7. Alt text pass (Leon).
8. Watch Search Console coverage and queries for 4–6 weeks. Keep the WordPress.com site intact (not deleted)
   as a rollback until then; it stays reachable at its `*.wordpress.com` address, so set it to "discourage
   search engines" right after cutover to avoid a duplicate. Rollback = nameservers back (hours to a day).

## Open items (block go-live, not the build)

- Which Cloudflare account owns the `alter-engineers` Pages project (AE's or Leon's personal); the domain zone
  goes into that account.
- Who can log in to the WordPress.com account that holds the domain (needed for the zone export and the
  nameserver switch).
- Who owns the two `google-site-verification` records / any existing Search Console property.

## Left to the builder

Field names; description trimming details; `lastmod` policy (omit it rather than emit a misleading date);
whether `.njk` or `.md` for the new `_base` pages; where the pages.dev `noindex` header lives; test design
(regression tests first for findings 1–3 and 5–6; before/after build diff for the other themes).

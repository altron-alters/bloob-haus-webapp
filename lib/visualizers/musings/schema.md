# Musings

A "voices wall" of short quotes from the people behind a site: a filterable mosaic on desktop, a
swipeable deck on phones, and an opt-in **Technical musings** fold at the bottom for the nerdier lines.
Built for the Alter Engineers homepage (2026-11-23); works in any theme that declares the token contract.

The older ` ```quotes-stack ` YAML fence is a separate shape and is unchanged.

## What this shape is

A leaf shape (renderer). It holds no other shapes.

## Fence format / grammar

A shape-named block. Categories are plain lines; musings are list items. Written so it reads naturally
in Obsidian.

```markdown
::: musings title="Musings from our team" limit=6

People first
- "This building should be naturally and mechanically ventilated." - Shannon Allison - 2022-01-14
- "People want radiant heat, they just don't know anywhere to get it besides fireplaces." - Stefan Gracik - 2018-09-12

Electrification
- "Suddenly electrification is easy. Now the question is what fits best." - Matt Dehghani - 2022-08-24

Technical
- "For emergency drains that are never used, inexpensive mineral oil beats a whole plumbing scope." - Brian Croshal - 2026-05-26

:::
```

## Parsing rules

- A non-empty line that is **not** a list item starts a category. `## `, `**bold**` and a trailing colon
  are stripped, so `## People first` and `**People first:**` both mean `People first`.
- A list item (`-`, `*`, `+`) is one musing: `"quote" - Name - Date`.
  - Name and date are optional: `- "Feel that breeze."` and `- musing text` are valid.
  - Straight or curly quotes; any spaced dash (`-`, `–`, `—`) separates the parts.
  - An unquoted item counts as attributed only when it ends in ` - Name - Date` with a date-like last
    part; otherwise the whole line is the quote, so a dash inside a sentence stays in the sentence.
  - A quoted musing may contain quotes (the last closing quote ends it).
- Items before any category line go into an unnamed category. Categories with no items are dropped.
- Dates: `2022-01-14` and `01/14/2022` display as `Jan 2022`; anything else is shown as written.

## Settings (on the `:::` opener line)

| Key | Default | Description |
|---|---|---|
| `title` | `Musings from our team` | Section heading. `title=""` for none. |
| `intro` | none | One line under the heading. |
| `limit` | `0` (show all) | Show the first N cards; the rest open with the **More musings** button. Picking a filter shows all of its cards. |
| `more_label` | `More musings` | Text of the show-more button. |
| `technical` | categories whose name contains "technical" or "nerdy" | Comma list of category names to put in the Technical fold instead. |
| `technical_label` | `Technical musings` | Text of the fold's toggle. |
| `bg`, `color` | none | Section color pair, same vocabulary as other shapes (`bg=dark`, `bg=#1a1a1a`). |

## Rendering

- Every musing is real markup at build time (crawlable, readable without JS). No hidden duplicates.
- Card tones cycle accent, mint, paper, warm, ink. Quotes longer than 150 characters span two columns
  on desktop.
- Filter buttons (one per named, non-technical category, only when there are two or more) ship with
  `hidden` and are revealed by `browser.js`, because they do nothing without it.
- Phones (≤ 640px): the grid becomes a horizontal scroll-snap deck with the next card peeking in.
  `browser.js` adds previous / next buttons and a `3 / 12` counter.
- The Technical fold is a native `<details>`.

**Without JavaScript:** all cards show, the deck still swipes, the Technical fold still opens.

## Theming

`styles.css` reads `--musings-tone-<accent|mint|paper|warm|ink>-bg` and `-fg` but never sets them;
fallbacks derive from `--accent-color`, `--card-bg`, `--text-color`, `--bg-color`. A theme maps its
palette with a plain rule in its `main.css`:

```css
.musings-wall { --musings-tone-mint-bg: var(--color-mint); --musings-tone-warm-bg: var(--color-orange); }
```

Other hooks: `--musings-bg` (section background when no `bg=` is set), `--musings-gap`,
`--musings-padding-top`, `--musings-padding-bottom`, `--musings-focus`.

## Content policy

Leaf shape; nothing nested. Markdown inside a musing is shown as text (escaped), not rendered.

## Width preference

Wide: the wall uses the theme's `--max-width`.

## Closed-state visual

Not defined yet.

# Image Text

Two-column layout: image on one side, rich text (headings, paragraphs, links) on the other. Stacks vertically on mobile.

## Activation

Place a `:::` container in your markdown:

```
::: image-text image=left bg=orange id=solutions

![[photo.jpg]]

## Section Label
### Heading Text

Paragraph body text...

[CTA Link](#anchor)

:::
```

## Format

- The **first** `![[image]]` in the container becomes the image column.
- Everything else (headings, paragraphs, links) becomes the text column.
- Standard markdown formatting (bold, links, headings) is fully rendered.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| image | string | `left` | Image position: `left` or `right`. |
| bg | string | — | Background color token (`white`, `muted`, `dark`, `orange`, etc.) or hex value. |
| id | string | `image-text` | HTML `id` for anchor linking. |

## Examples

Image left, orange background (solutions section):
```
::: image-text image=left bg=orange id=solutions

![[solutions-photo.jpg]]

## OUR SOLUTIONS
### Fully Electric Design Without a Natural Gas Connection

Paragraph text...

[Contact Us](#footer)

:::
```

Image right, dark background:
```
::: image-text image=right bg=dark id=about

![[team-photo.jpg]]

## About Us

We are a team of passionate engineers...

:::
```

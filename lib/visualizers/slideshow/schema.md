# Slideshow

Displays a continuously scrolling marquee of images (logos, photos). Pauses on hover.

## Activation

Place a `:::` container in your markdown:

```
::: slideshow duration=30s height=80px id=partners
![[logo-a.svg]]
![[logo-b.svg]]
:::
```

## Format

One image per line inside the container, using Obsidian wikilink syntax (`![[file]]`) or standard markdown image syntax (`![alt](url)`).

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| duration | string | `30s` | Time for one complete scroll loop. Longer = slower. |
| height | string | `60px` | Height of each image. Width scales automatically. |
| title | string | — | Optional section heading above the marquee. |
| id | string | `slideshow` | HTML `id` for anchor linking. |
| bg | string | — | Background color token (`white`, `muted`, `dark`, `orange`, etc.) or hex value. |

## Examples

Logo strip, no title:
```
::: slideshow duration=30s height=80px id=partners
![[partner-a.svg]]
![[partner-b.svg]]
:::
```

With title and custom background:
```
::: slideshow duration=20s height=100px title="Our Partners" bg=muted id=partners
![[partner-a.svg]]
![[partner-b.svg]]
:::
```

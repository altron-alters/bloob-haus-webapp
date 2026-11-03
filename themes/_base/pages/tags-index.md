---
layout: layouts/article.njk
title: All tags
permalink: /tags/
eleventyExcludeFromCollections: true
shape_settings:
  index_frame: on
---

{#
  The all-tags page, /tags/. Every tag page links here ("← All tags").

  A markdown list of links, not markup, for the same reason tags.md composes
  shapes: the article shape styles it, crawlers read it, and there is no second
  renderer to drift. A theme replaces it by shipping its own `tags-index.*`
  (warm-kitchen does) — assemble-src shadows base pages by basename.

  Whitespace control (`{%-` / `-%}`) keeps the list items on consecutive lines,
  so markdown renders one tight list rather than a paragraph per tag.

  Styling is the THEME's: each tag is a `.tag-badge` link (the class project and
  tag pages already use) and the list is `.tag-list` (markdown-it-attrs — the
  `{.tag-list}` line must follow the last item directly). The text is the bare
  tag name; a theme that wants a "#" draws it (alter-engineers' badge does).
#}

{%- if collections.tagList and collections.tagList.length %}
{% for tag in collections.tagList -%}
{%- set n = (collections[tag] or []).length -%}
- [{{ tag | replace("-", " ") }}]({{ ("/tags/" + (tag | slugify) + "/") | url }}){.tag-badge} · {{ n }} {{ "page" if n == 1 else "pages" }}
{% endfor -%}
{.tag-list}
{%- else %}
No tags yet.
{%- endif %}

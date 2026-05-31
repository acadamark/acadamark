---
semantic_role: ul
html_output:
  element: ul
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-list-type
      values: [bullet, checklist, glossary, navigation, other]
      notes: |
        Optional classification of the list's role. Affects rendering
        (checklists get checkboxes; navigation lists get layout treatment).
content:
  type: structured
  shape:
    - element: li
      required: false
      multiple: true
      contains: [inline, block]
content_handler: default
jats_counterpart:
  element: list
  attributes:
    list-type: bullet
  notes: |
    JATS uses <list list-type="bullet"> for unordered lists. The
    list-type attribute is preserved at export. Enscribe's optional
    type kwarg (checklist, glossary, etc.) is transformed during export:
    type=checklist becomes list-type="bullet" with content-type="checklist".
shorthand_examples:
  - source: |
      - First item
      - Second item
      - Third item
    layer1_html: |
      <ul>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ul>
    notes: |
      Plain markdown unordered lists work without explicit enscribe tags.
      This is the most common authoring path. Use plain markdown when no
      attributes are needed on the list or items.
  - source: |
      <ul #key-points type=checklist>
      - First item
      - Second item
      - Third item
      </ul>
    layer1_html: |
      <ul id="key-points" data-list-type="checklist">
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ul>
  - source: |
      <ul .featured>
        <li | First item with <em | emphasis>.>
        <li | Second item.>
      </ul>
    layer1_html: |
      <ul class="featured">
        <li>First item with <em>emphasis</em>.</li>
        <li>Second item.</li>
      </ul>
interpreter_strategy: schema
---

# `<ul>`

An unordered list groups items where order doesn't matter. Bullet lists, checklists, navigation menus, glossaries.

## Semantic intent

Use `<ul>` for genuinely unordered collections — items where rearranging the order doesn't change the meaning. Lists where order matters belong in `<ol>` (ordered list).

The element is HTML-native and matches HTML5's semantic intent. The `type` kwarg classifies the list's role for rendering and JATS export.

## Authoring approaches

**Plain markdown (most common).**

```
- First item
- Second item
- Third item
```

This is the natural path for most lists. Plain markdown's `-` (or `*` or `+`) syntax produces unordered lists without any explicit `<ul>` tag. Use this approach unless attributes are needed.

**Explicit `<ul>` with markdown items inside.**

```
<ul #my-list>
- First item
- Second item
</ul>
```

Use this when the list needs an id, classes, or a type kwarg. The items inside use plain markdown.

**Explicit `<ul>` with explicit `<li>` items.**

```
<ul>
  <li | First item>
  <li | Second item>
</ul>
```

Use this when individual items need attributes (id, classes, etc.). The pipe content of each `<li>` becomes the list item's content.

## Content

A `<ul>` contains a sequence of `<li>` elements. List items contain prose — inline content and optionally block content (paragraphs, nested lists).

Multi-paragraph list items are possible:

```
<ul>
  <li |
    First paragraph of the item.

    Second paragraph of the item.
  >
</ul>
```

The pipe content with multiple paragraphs becomes the item's content with paragraph structure preserved.

## Attributes

`type` indicates the list's role:

- `bullet` — standard unordered list with bullet marks (default).
- `checklist` — list with checkboxes (interactive when in HTML; visual indicator otherwise).
- `glossary` — list of definitions or terms.
- `navigation` — list used as a navigation menu.
- `other` — anything not covered above.

The classification affects rendering. CSS rules can target `ul[data-list-type="checklist"]`, `ul[data-list-type="navigation"]`, etc.

## JATS mapping

JATS uses a single `<list>` element with a `list-type` attribute. Unordered lists become `<list list-type="bullet">`.

| enscribe | JATS |
|-----------|------|
| `<ul>` | `<list list-type="bullet">` |
| `<ul type=checklist>` | `<list list-type="bullet" content-type="checklist">` |
| `<ul type=glossary>` | `<list list-type="bullet" content-type="glossary">` |
| `<li>` (within `<ul>`) | `<list-item>` |

## Authoring patterns

**Simple bullet list (plain markdown).**

```
Things to remember:

- First thing
- Second thing
- Third thing
```

**Bullet list with id for cross-referencing.**

```
<ul #key-findings>
- Finding one
- Finding two
- Finding three
</ul>

See <ref key-findings> for a summary.
```

**Checklist.**

```
<ul type=checklist>
- Submit the manuscript
- Check formatting
- Send for review
</ul>
```

**Navigation list.**

```
<nav>
<ul type=navigation>
- <a /home | Home>
- <a /about | About>
- <a /contact | Contact>
</ul>
</nav>
```

## Render-mode lowering

`<ul>` is HTML-native and doesn't need lowering. The `data-list-type` attribute is preserved.

## See also

- [`<ol>`](ol.md) — for ordered lists.
- [`<li>`](li.md) — for list items.
- [`<dl>`](dl.md) — for description lists (term/definition pairs).

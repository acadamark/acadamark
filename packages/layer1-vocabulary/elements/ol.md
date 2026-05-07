---
semantic_role: ol
html_output:
  element: ol
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-list-type
      values: [arabic, alpha, alpha-upper, roman, roman-upper, other]
      default: arabic
      notes: |
        The numbering style for ordered list items. Values match common
        list-style-type CSS values, abbreviated for readability.
    start:
      maps_to: start
      notes: |
        The starting number for the list. Maps to HTML's standard start
        attribute on <ol>. Default is 1.
    reversed:
      maps_to: reversed
      notes: |
        If present, the list counts backward (5, 4, 3, 2, 1 instead of
        1, 2, 3, 4, 5). Maps to HTML's standard reversed attribute.
content:
  type: structured
  shape:
    - element: li
      required: false
      multiple: true
      contains: [text, inline-elements, p, sub-elements]
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: list
  attributes:
    list-type: order
  notes: |
    JATS uses <list list-type="order"> for ordered lists. The
    numbering style is preserved via the content-type attribute.
shorthand_examples:
  - source: |
      1. First step
      2. Second step
      3. Third step
    layer1_html: |
      <ol>
        <li>First step</li>
        <li>Second step</li>
        <li>Third step</li>
      </ol>
    notes: |
      Plain markdown ordered lists work without explicit acadamark tags.
      This is the most common authoring path.
  - source: |
      <ol #procedure type=arabic start=5>
      1. Fifth step
      2. Sixth step
      3. Seventh step
      </ol>
    layer1_html: |
      <ol id="procedure" start="5">
        <li>Fifth step</li>
        <li>Sixth step</li>
        <li>Seventh step</li>
      </ol>
    notes: |
      The numbers in the source markdown are ignored; the start kwarg
      sets the actual numbering. The list renders as 5, 6, 7 because
      start=5 was specified.
  - source: |
      <ol type=alpha-upper>
      1. First option
      2. Second option
      3. Third option
      </ol>
    layer1_html: |
      <ol style="list-style-type: upper-alpha" data-list-type="alpha-upper">
        <li>First option</li>
        <li>Second option</li>
        <li>Third option</li>
      </ol>
interpreter_strategy: schema
---

# `<ol>`

An ordered list groups items in a sequence where order matters. Steps in a procedure, ranked items, sequential events.

## Semantic intent

Use `<ol>` for genuinely ordered collections — items where the position carries meaning. Steps in a procedure (do this first, then this, then this), ranked items (first place, second place), sequential events. Lists where order doesn't matter belong in `<ul>` (unordered list).

The element is HTML-native and matches HTML5's semantic intent. The `type` kwarg controls the numbering style.

## Authoring approaches

**Plain markdown (most common).**

```
1. First step
2. Second step
3. Third step
```

This is the natural path for most ordered lists. Plain markdown's numbered list syntax produces ordered lists without any explicit `<ol>` tag.

**Explicit `<ol>` with markdown items inside.**

```
<ol #procedure>
1. First step
2. Second step
3. Third step
</ol>
```

Use this when the list needs an id, classes, or kwargs (type, start, reversed).

**Explicit `<ol>` with explicit `<li>` items.**

```
<ol>
  <li | First step>
  <li | Second step>
</ol>
```

Use this when individual items need attributes.

## Content

An `<ol>` contains a sequence of `<li>` elements. Same content model as `<ul>`.

## Attributes

`type` indicates the numbering style:

- `arabic` — 1, 2, 3, 4 (default).
- `alpha` — a, b, c, d.
- `alpha-upper` — A, B, C, D.
- `roman` — i, ii, iii, iv.
- `roman-upper` — I, II, III, IV.
- `other` — for custom styles via class or CSS.

`start` sets the starting number. Default is 1. Useful when continuing a numbered list across an interruption, or when the visible numbering doesn't start at 1.

`reversed` is a boolean flag. If present, the list counts backward.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<ol>` (default) | `<list list-type="order">` |
| `<ol type=alpha>` | `<list list-type="alpha-lower">` |
| `<ol type=alpha-upper>` | `<list list-type="alpha-upper">` |
| `<ol type=roman>` | `<list list-type="roman-lower">` |
| `<ol type=roman-upper>` | `<list list-type="roman-upper">` |
| `<li>` (within `<ol>`) | `<list-item>` |

The `start` and `reversed` attributes are not in JATS's standard list vocabulary. They're preserved as HTML attributes; the JATS export drops them.

## Authoring patterns

**Simple numbered list (plain markdown).**

```
Steps in the procedure:

1. Prepare the materials
2. Mix the ingredients
3. Let stand for 30 minutes
```

**Continuation of a numbered list.**

```
1. First item
2. Second item

Some interrupting prose.

<ol start=3>
3. Third item
4. Fourth item
</ol>
```

**Roman numeral list.**

```
<ol type=roman-upper>
1. First major item
2. Second major item
3. Third major item
</ol>
```

**Reversed list (countdown).**

```
<ol reversed>
1. Top priority
2. Second priority
3. Third priority
</ol>
```

## Render-mode lowering

`<ol>` is HTML-native. The `type` kwarg's value is converted to either an inline `style` attribute (for the CSS list-style-type) or the `data-list-type` attribute, depending on browser support and styling preferences. The conversion is handled by the interpreter.

## See also

- [`<ul>`](ul.md) — for unordered lists.
- [`<li>`](li.md) — for list items.
- [`<dl>`](dl.md) — for description lists.

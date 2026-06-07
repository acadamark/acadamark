---
semantic_role: li
category: block-prose
html_output:
  element: li
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    value:
      maps_to: value
      notes: |
        For ordered lists, sets the explicit number for this item.
        Subsequent items are numbered relative to this value. Maps to
        HTML's standard value attribute on <li>.
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: list-item
  notes: |
    Direct mapping to JATS <list-item>. The value attribute (when
    present) is preserved.
shorthand_examples:
  - source: '- A list item.'
    layer1_html: '<li>A list item.</li>'
    notes: |
      Inside a markdown-style list, the dash syntax produces an <li>
      automatically. No explicit <li> tag needed.
  - source: '<li | A list item with explicit tag.>'
    layer1_html: '<li>A list item with explicit tag.</li>'
    notes: |
      The explicit form is used inside an explicit <ul> or <ol> when
      the item needs attributes.
  - source: |
      <li #important type=highlighted | A noteworthy item.>
    layer1_html: |
      <li id="important" data-highlighted="true">A noteworthy item.</li>
  - source: |
      <li |
      A multi-paragraph list item.

      The second paragraph of the item.
      >
    layer1_html: |
      <li>
        <p>A multi-paragraph list item.</p>
        <p>The second paragraph of the item.</p>
      </li>
  - source: |
      <ol>
        <li | First item>
        <li value=10 | Item ten>
        <li | Item eleven>
      </ol>
    layer1_html: |
      <ol>
        <li>First item</li>
        <li value="10">Item ten</li>
        <li>Item eleven</li>
      </ol>
    notes: |
      The value attribute on <li> sets a specific number. Subsequent
      items count from there.
interpreter_strategy: schema
---

# `<li>`

A list item. The element representing a single entry within `<ul>` or `<ol>`.

## Semantic intent

`<li>` is the content unit of a list. List items contain prose — inline content (text, emphasis, links, etc.) and optionally block content (paragraphs, nested lists). The element is HTML-native and matches HTML5's semantic intent.

Most list items are written via markdown's list syntax, which produces `<li>` elements automatically. The explicit `<li>` form is reached for when an item needs attributes (id, classes, value).

## When to use the explicit form

**Markdown items inside markdown lists.**

```
- First item
- Second item
- Third item
```

Each line produces an `<li>` automatically. No explicit tags needed.

**Explicit items inside explicit lists.**

```
<ul>
  <li | First item>
  <li | Second item>
  <li | Third item>
</ul>
```

Use this form when the items need attributes.

**Mixed: explicit list with markdown items.**

```
<ul #key-points>
- First item
- Second item
</ul>
```

The list has attributes; the items don't. Use markdown for items in this case.

**Explicit list with explicit items.**

```
<ul>
  <li #first | First item>
  <li #second | Second item>
</ul>
```

When individual items need their own attributes (id, classes, value).

## Content

A list item contains prose. Inline elements work normally. Multi-paragraph items are possible:

```
<li |
First paragraph of the item.

Second paragraph of the item.
>
```

The pipe content with multiple paragraphs becomes the item's content with paragraph structure preserved.

A list item can also contain nested lists:

```
<ul>
  <li | Top-level item.
    <ul>
      <li | Nested item.>
      <li | Another nested item.>
    </ul>
  >
</ul>
```

## Attributes

`value` (only on items in `<ol>`) sets the explicit number for this item. Subsequent items are numbered from this value. Useful when you want to skip numbers, restart at a particular value, or call out a specific position.

```
<ol>
  <li | First step>
  <li value=10 | Step ten>
  <li | Step eleven>
</ol>
```

## JATS mapping

Direct mapping to JATS `<list-item>`. The `value` attribute is preserved.

| enscribe | JATS |
|-----------|------|
| `<li>` | `<list-item>` |
| `value` attribute | `value` attribute (on `<list-item>`) |

## Authoring patterns

**Items via plain markdown (most common).**

```
- First
- Second
- Third
```

**Item with id for cross-referencing.**

```
<ol>
  <li #step-3 | The critical step.>
  <li | Subsequent step.>
</ol>

See <ref step-3> for the critical step.
```

**Multi-paragraph item.**

```
<ul>
  <li |
    First paragraph.

    Second paragraph.
  >
</ul>
```

**Nested list within an item.**

```
<ul>
  <li | Outer item.
    <ul>
      <li | Nested item.>
    </ul>
  >
</ul>
```

## Render-mode lowering

`<li>` is HTML-native and doesn't need lowering.

## See also

- [`<ul>`](ul.md) — unordered list.
- [`<ol>`](ol.md) — ordered list.
- [`<dl>`](dl.md), [`<dt>`](dt.md), [`<dd>`](dd.md) — description list and its items.

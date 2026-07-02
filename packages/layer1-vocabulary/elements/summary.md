---
semantic_role: summary
category: block-prose
html_output:
  element: summary
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    contains: [inline]
  becomes: children
  notes: |
    The visible heading of the parent <details> disclosure. Typically
    short — a phrase — but may contain inline markup.
jats_counterpart:
  element: '(no direct JATS counterpart; HTML-native)'
  notes: |
    Like its parent <details>, <summary> has no JATS counterpart. At
    JATS export the <summary>'s text typically becomes the heading
    portion of whatever flattened structure the exporter chooses for
    the parent <details> (e.g., a <sec>'s <title>).
shorthand_examples:
  - source: '<summary | More background>'
    layer1_html: '<summary>More background</summary>'
    notes: |
      The visible heading of a <details> disclosure. Appears as a
      child of <details>.
  - source: '<summary | Click to reveal the <em | hidden> details>'
    layer1_html: '<summary>Click to reveal the <em>hidden</em> details</summary>'
    notes: |
      Inline markup in a summary. The recursive-content pass parses
      the pipe content normally.
interpreter_strategy: schema
---

# `<summary>`

The visible heading of a `<details>` disclosure. Always-visible text that the reader clicks to expand the disclosure's body.

## Semantic intent

`<summary>` is HTML's native element for the disclosure heading inside a `<details>`. The browser renders it as the clickable heading; toggling it shows or hides the disclosure body.

`<summary>` is a structural-context child element: it only makes sense as the first child of `<details>`. The vocabulary does not enforce this — out-of-context placement renders the element correctly but is not the intended use.

## Authoring

```
<details>
  <summary | More background>
  Additional context for the curious reader.
</details>
```

The pipe content is the visible heading text.

## JATS mapping

`<summary>` has **no direct JATS counterpart** — JATS has no disclosure construct. Recorded honestly per the `<lang>` / `<kbd>` precedent. At JATS export, the `<summary>`'s text typically becomes the heading of whatever flattened structure the exporter chooses for the parent `<details>`.

## Render-mode lowering

`<summary>` is HTML-native; no lowering needed.

## See also

- [`<details>`](details.md) — the parent disclosure container.

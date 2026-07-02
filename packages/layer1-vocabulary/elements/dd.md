---
semantic_role: dd
category: block-prose
html_output:
  element: dd
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    contains: [block]
  becomes: children
  notes: |
    The description / definition of the preceding <dt> term. Prose
    content; may contain inline markup and block content (paragraphs,
    nested lists, etc.). Multi-paragraph descriptions are valid.
jats_counterpart:
  element: def
  notes: |
    JATS uses <def> inside <def-item> inside <def-list>. Direct
    one-to-one mapping at the definition-text level; the JATS exporter
    wraps the <dt>/<dd> pair in <def-item> at export.
shorthand_examples:
  - source: '<dd | An academic publishing system built on HTML+CSS+JS.>'
    layer1_html: '<dd><p>An academic publishing system built on HTML+CSS+JS.</p></dd>'
    notes: |
      A definition-list description. Appears as a child of <dl>,
      following the term it defines.
  - source: |
      <dd |
      A multi-paragraph definition.

      The second paragraph of the definition.
      >
    layer1_html: |
      <dd>
        <p>A multi-paragraph definition.</p>
        <p>The second paragraph of the definition.</p>
      </dd>
    notes: |
      Multi-paragraph descriptions are valid — the pipe content's
      paragraph structure is preserved.
interpreter_strategy: schema
---

# `<dd>`

A definition-list description. The "value" half of a definition pair within a `<dl>` — the prose that describes or defines the preceding `<dt>` term.

## Semantic intent

`<dd>` provides the description for the term named by the preceding `<dt>`. Inside a `<dl>`, each `<dt>` is followed by one or more `<dd>` elements. The element is HTML-native and matches HTML5's semantic intent for `<dd>`.

`<dd>` is a structural-context child element: it only makes sense inside `<dl>`. The vocabulary does not enforce this — out-of-context placement renders the element correctly but is not the intended use.

## Authoring

```
<dl>
  <dt | enscribe>
  <dd | An academic publishing system.>
</dl>
```

The pipe content is the description text. Multi-paragraph descriptions work:

```
<dl>
  <dt | enscribe>
  <dd |
  An academic publishing system built on HTML+CSS+JS.

  Authoring uses a shorthand syntax that compiles to the canonical
  semantic HTML vocabulary.
  >
</dl>
```

## JATS mapping

| enscribe | JATS |
|---|---|
| `<dd>` (within `<dl>`) | `<def>` (inside `<def-item>` inside `<def-list>`) |

The JATS exporter wraps each `<dt>`/`<dd>` pair in a `<def-item>` at export.

## Render-mode lowering

`<dd>` is HTML-native; no lowering needed.

## See also

- [`<dl>`](dl.md) — the parent definition list.
- [`<dt>`](dt.md) — the sibling term element.
- [`<glossary-entry>`](glossary-entry.md) — for glossary-specific term/definition pairings.

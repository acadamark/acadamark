---
semantic_role: dt
category: block-prose
semantic_family: formal-statements
html_output:
  element: dt
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
    The term being defined. Typically short — a word or phrase — but
    may contain inline markup (emphasis, code, math) where useful.
jats_counterpart:
  element: term
  notes: |
    JATS uses <term> inside <def-item> inside <def-list>. Direct
    one-to-one mapping at the term-text level; the JATS exporter
    wraps the <dt>/<dd> pair in <def-item> at export.
shorthand_examples:
  - source: '<dt | enscribe>'
    layer1_html: '<dt>enscribe</dt>'
    notes: |
      A definition-list term. Appears as a child of <dl>.
  - source: '<dt | <code | strict-mode>>'
    layer1_html: '<dt><code>strict-mode</code></dt>'
    notes: |
      Inline markup in a term. The recursive-content pass parses the
      pipe content normally.
interpreter_strategy: schema
---

# `<dt>`

A definition-list term. The "key" half of a definition pair within a `<dl>` (or, by analogy, the term half of a `<glossary-entry>`'s structured form).

## Semantic intent

`<dt>` names the term being defined. Inside a `<dl>`, each `<dt>` is followed by one or more `<dd>` elements giving the term's description. The element is HTML-native and matches HTML5's semantic intent for `<dt>`.

`<dt>` is a structural-context child element: it only makes sense inside `<dl>`. The vocabulary does not enforce this — out-of-context placement renders the element correctly but is not the intended use.

## Authoring

```
<dl>
  <dt | enscribe>
  <dd | An academic publishing system.>
</dl>
```

The pipe content is the term text.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<dt>` (within `<dl>`) | `<term>` (inside `<def-item>` inside `<def-list>`) |

The JATS exporter wraps each `<dt>`/`<dd>` pair in a `<def-item>` at export.

## Render-mode lowering

`<dt>` is HTML-native; no lowering needed.

## See also

- [`<dl>`](dl.md) — the parent definition list.
- [`<dd>`](dd.md) — the sibling description element.
- [`<glossary-entry>`](glossary-entry.md) — for glossary-specific term/definition pairings.

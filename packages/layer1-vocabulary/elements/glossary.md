---
semantic_role: glossary
category: block-prose
html_output:
  element: glossary
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: structured
  shape:
    - element: glossary-entry
      required: false
      multiple: true
  notes: |
    A glossary holds a sequence of <glossary-entry> children, each a
    paired term and definition. Distinct from <dl> (which uses raw
    alternating <dt>/<dd> children with flexible pairing) — a glossary
    has a fixed entry-pair shape and is referenceable as a unit.
content_handler: default
jats_counterpart:
  element: glossary
  notes: |
    JATS has a <glossary> element. Enscribe's <glossary> maps directly,
    with children mapping per <glossary-entry>'s entry. JATS's <glossary>
    can also wrap a <def-list>; the exporter chooses the structure based
    on whether the source uses <glossary> or <dl>.
shorthand_examples:
  - source: |
      <glossary #project-terms>
        <glossary-entry>
          <dt | enscribe>
          <dd | An academic publishing system built on HTML+CSS+JS.>
        </glossary-entry>
        <glossary-entry>
          <dt | Layer 1>
          <dd | The canonical semantic HTML vocabulary.>
        </glossary-entry>
      </glossary>
    layer1_html: |
      <glossary id="project-terms">
        <glossary-entry>
          <dt>enscribe</dt>
          <dd><p>An academic publishing system built on HTML+CSS+JS.</p></dd>
        </glossary-entry>
        <glossary-entry>
          <dt>Layer 1</dt>
          <dd><p>The canonical semantic HTML vocabulary.</p></dd>
        </glossary-entry>
      </glossary>
    notes: |
      A glossary with two entries. Each <glossary-entry> uses <dt>/<dd>
      for its term and definition (the same shapes <dl> uses), wrapped
      in the entry's own envelope for cross-reference / styling.
interpreter_strategy: schema
---

# `<glossary>`

A glossary block — a collection of glossary entries, each a term/definition pair. Distinct from `<dl>` (which uses raw alternating `<dt>`/`<dd>` children) in that each entry is wrapped in a `<glossary-entry>` envelope; the entries are individually referenceable, and the glossary as a whole is a named container.

## Semantic intent

`<glossary>` is enscribe's element for glossary-shaped content — a curated list of project-specific terms with their definitions, typically appearing as a back-matter section or sidebar resource. Each entry is a `<glossary-entry>` carrying the term and its definition.

The key distinction from `<dl>`:

- `<dl>` is HTML's general definition-list element. Its children are alternating `<dt>`/`<dd>` siblings; the pairing is structural-by-position. Use `<dl>` for inline term-definition pairings (an aside listing a few key terms; a small inline glossary; a key-value display).
- `<glossary>` is enscribe's named glossary container. Its children are `<glossary-entry>` envelopes, each holding a term/definition pair. Use `<glossary>` for glossary-section content — items the document treats as cross-referenceable glossary entries, or content that maps to JATS's `<glossary>` at export.

## Authoring

```
<glossary #project-terms>
  <glossary-entry>
    <dt | enscribe>
    <dd | An academic publishing system.>
  </glossary-entry>
  <glossary-entry>
    <dt | Layer 1>
    <dd | The canonical semantic HTML vocabulary.>
  </glossary-entry>
</glossary>
```

Each `<glossary-entry>` contains a `<dt>`/`<dd>` pair (reusing the definition-list child shapes).

## JATS mapping

| enscribe | JATS |
|---|---|
| `<glossary>` | `<glossary>` |
| `<glossary-entry>` (within `<glossary>`) | `<def-item>` (inside `<glossary>`) |
| `<dt>` (within a `<glossary-entry>`) | `<term>` (inside `<def-item>`) |
| `<dd>` (within a `<glossary-entry>`) | `<def>` (inside `<def-item>`) |

JATS's `<glossary>` can hold `<def-item>` children directly, or wrap a `<def-list>` of items. Enscribe's `<glossary-entry>` maps to JATS's `<def-item>` — the structural envelope around a term/definition pair.

## Render-mode lowering

`<glossary>` is custom; CSS targets `glossary` directly for rendering. In render mode the element may lower to a `<section class="glossary">` wrapper for assistive-tech outline recognition.

## See also

- [`<glossary-entry>`](glossary-entry.md) — the entry envelope.
- [`<dl>`](dl.md) — for inline term-definition pairings without the glossary envelope.
- [`<dt>`](dt.md), [`<dd>`](dd.md) — the term and description children used inside each entry.

---
semantic_role: keywords
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: keywords
  is_html_native: false
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
    Comma-separated keyword list as text, OR a structured list of
    individual <keyword> child elements. The simpler comma-separated
    form is preferred for ergonomics; the structured form is useful
    when individual keywords need ids or other attributes for
    cross-referencing.
jats_counterpart:
  element: 'kwd-group'
  notes: |
    JATS uses <kwd-group> containing <kwd> elements, inside
    <article-meta>. Comma-separated enscribe content splits on
    commas at export time; structured <keyword> children map
    directly to <kwd>. Multiple <kwd-group> elements (each with a
    kwd-group-type attribute) are allowed in JATS for multi-language
    keyword sets — enscribe does not currently model that distinction
    at the authoring layer.
shorthand_examples:
  - source: |
      <meta>
        <keywords | elephants, conservation, climate, carbon storage>
      </meta>
    layer1_html: |
      <meta>
        <keywords>elephants, conservation, climate, carbon storage</keywords>
      </meta>
    notes: |
      Comma-separated keyword list — the simpler and more common
      authoring form. The exporter splits on commas when emitting JATS.
  - source: '<meta keywords="elephants, conservation, climate" />'
    layer1_html: |
      <meta>
        <keywords>elephants, conservation, climate</keywords>
      </meta>
    notes: |
      Kwarg-form authoring lifts to the child-tag form at the gate.
interpreter_strategy: schema
---

# `<keywords>`

The document's keywords. A comma-separated list of terms that describe what the document is about, used by indexers, search engines, and editorial workflows.

## Semantic intent

`<keywords>` records the document's keyword list — the small set of terms (typically 3–10) the author chooses to describe the work. Keywords are routine in scholarly publishing: journals require them, indexers use them, and reading platforms expose them.

## Authoring

Two equivalent forms:

```
<meta>
  <keywords | elephants, conservation, climate, carbon storage>
</meta>
```

or:

```
<meta keywords="elephants, conservation, climate, carbon storage" />
```

The content is a comma-separated list as text. Whitespace around commas is permitted; the exporter normalizes it.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<keywords>elephants, conservation, climate</keywords>` | `<kwd-group><kwd>elephants</kwd><kwd>conservation</kwd><kwd>climate</kwd></kwd-group>` (inside `<article-meta>`) |

The exporter splits on commas (trimming whitespace) and emits one `<kwd>` per term. Multiple `<kwd-group>` elements with `kwd-group-type` distinctions (multi-language, controlled-vocabulary, etc.) are a JATS feature enscribe does not currently model at the authoring layer — single keyword list per document.

## Render-mode lowering

In render mode, keywords typically display in the article header alongside other metadata, or in a sidebar.

## See also

- [`<meta>`](meta.md) — the metadata wrapper that holds the keywords.
- [`<doi>`](doi.md), [`<license>`](license.md), [`<lang>`](lang.md), [`<version>`](version.md) — sibling document-metadata fields.

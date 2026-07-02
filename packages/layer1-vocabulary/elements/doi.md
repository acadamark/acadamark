---
semantic_role: doi
category: metadata
html_output:
  element: doi
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
    The DOI value, as text. Typically the bare DOI string (e.g.
    "10.1234/example.2024") rather than a URL form.
jats_counterpart:
  element: 'article-id'
  attributes:
    pub-id-type: doi
  notes: |
    JATS uses <article-id pub-id-type="doi">VALUE</article-id> inside
    <article-meta>. The exporter constructs the article-id element with
    the pub-id-type attribute set to "doi" from the value in <doi>.
shorthand_examples:
  - source: |
      <meta>
        <doi | 10.1234/example.2024>
      </meta>
    layer1_html: |
      <meta>
        <doi>10.1234/example.2024</doi>
      </meta>
    notes: |
      Bare DOI as the typical authoring form.
  - source: '<meta doi="10.5555/test" />'
    layer1_html: |
      <meta>
        <doi>10.5555/test</doi>
      </meta>
    notes: |
      Kwarg-form authoring lifts to the child-tag form at the
      normalize-to-canonical gate (per the apparatus-tag reconciliation,
      DESIGN.md §"Apparatus-tag positioning").
interpreter_strategy: schema
---

# `<doi>`

The document's DOI (Digital Object Identifier). Appears inside `<meta>` as one of the document's persistent identifiers.

## Semantic intent

`<doi>` carries the DOI string for the document. DOIs are persistent identifiers used widely in scholarly publishing — every published article, dataset, and many other research outputs has one. The DOI is a stable URL-redirectable identifier that does not change when the publisher's URL structure changes.

## Authoring

Two equivalent forms (per the apparatus-tag reconciliation):

```
<meta>
  <doi | 10.1234/example.2024>
</meta>
```

or:

```
<meta doi="10.1234/example.2024" />
```

Both produce the same Layer 1 child-tag structure. Use the kwarg form for compactness in simple cases; use the child-tag form when authoring multiple metadata fields in a structured block.

## Authoring conventions

The bare DOI (`10.1234/example.2024`) is preferred over the URL form (`https://doi.org/10.1234/example.2024`) — tools that consume the document metadata can construct the URL when needed. The bare form is also what JATS expects.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<doi>10.1234/example.2024</doi>` | `<article-id pub-id-type="doi">10.1234/example.2024</article-id>` (inside `<article-meta>`) |

## Render-mode lowering

In render mode, the DOI typically displays in the article header or footer as a hyperlink: `<a href="https://doi.org/10.1234/example.2024">10.1234/example.2024</a>`.

## See also

- [`<meta>`](meta.md) — the metadata wrapper that holds the DOI.
- [`<license>`](license.md), [`<lang>`](lang.md), [`<version>`](version.md) — sibling document-metadata fields.

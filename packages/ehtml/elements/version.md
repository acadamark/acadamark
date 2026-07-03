---
semantic_role: version
category: metadata
semantic_family: declarations-and-metadata
html_output:
  element: version
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
    The document's version, as a free-form string. Common forms:
    semantic version ("1.0.0", "2.3.1"), date-based ("2024.03.15"),
    revision label ("v2", "rev 3", "draft"), or any other versioning
    scheme the author uses.
jats_counterpart:
  element: '(no direct standard element; uncertain — may map to article-version or custom-meta)'
  notes: |
    JATS does not have a single canonical version element. JATS 1.3+
    introduced <article-version> in some extensions (e.g. for preprint
    metadata) but it is not universally present in the core schema. A
    safe fallback is <custom-meta meta-name="version">VALUE</custom-meta>
    inside <article-meta>. The exporter should prefer <article-version>
    when targeting a schema variant that supports it, and fall back to
    <custom-meta> otherwise. Uncertainty recorded here per the
    apparatus-tag reconciliation slice's directive to not guess.
shorthand_examples:
  - source: |
      <meta>
        <version | 1.0.0>
      </meta>
    ehtml: |
      <meta>
        <version>1.0.0</version>
      </meta>
    notes: |
      Semantic version. Other formats are equally valid as a free-form
      string.
  - source: '<meta version="draft-2" />'
    ehtml: |
      <meta>
        <version>draft-2</version>
      </meta>
    notes: |
      Kwarg-form authoring lifts to the child-tag form at the gate.
interpreter_strategy: schema
---

# `<version>`

The document's version. A free-form string carrying whatever versioning convention the document uses.

## Semantic intent

`<version>` records the document's version. Versioning is increasingly common in scholarly publishing — preprints have version numbers as authors revise; living documents (datasets, software documentation, evolving research summaries) are updated over time; even traditionally-published articles sometimes carry revision metadata. The element gives that information an eHTML home.

## Authoring

Two equivalent forms:

```
<meta>
  <version | 1.0.0>
</meta>
```

or:

```
<meta version="1.0.0" />
```

The value is a free-form string. Common conventions:

- **Semantic version**: `1.0.0`, `2.3.1` — used for software-like documents.
- **Date-based**: `2024.03.15`, `2024-Q1` — used for documents updated on a schedule.
- **Revision label**: `v2`, `rev 3`, `final-draft` — used for less formal versioning.
- **Preprint round**: `v1`, `v2`, `v3` — the bioRxiv/arXiv convention for versioned preprints.

Enscribe does not impose a scheme; whatever the author writes is preserved as-is.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<version>1.0.0</version>` | `<article-version>1.0.0</article-version>` (where supported by the schema variant) or `<custom-meta meta-name="version">1.0.0</custom-meta>` (fallback) |

JATS does not have a single canonical element for document version. The exporter prefers `<article-version>` (JATS 1.3+ with preprint extensions) when the target schema variant supports it; otherwise falls back to `<custom-meta>`. This per-export decision is recorded in the JATS export item rather than here.

## Render-mode lowering

In render mode, the version typically displays in the article header or footer.

## See also

- [`<meta>`](meta.md) — the metadata wrapper that holds the version.
- [`<doi>`](doi.md), [`<license>`](license.md), [`<lang>`](lang.md), [`<keywords>`](keywords.md) — sibling document-metadata fields.

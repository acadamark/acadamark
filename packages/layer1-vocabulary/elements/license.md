---
semantic_role: license
category: metadata
html_output:
  element: license
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    href:
      maps_to: href
      notes: |
        Optional URL of the license terms (e.g. https://creativecommons.org/licenses/by/4.0/).
content:
  type: prose
  becomes: children
  notes: |
    The license name or short identifier (e.g. "CC BY 4.0",
    "MIT License", "All rights reserved"). The optional href kwarg
    carries the canonical URL of the license terms.
content_handler: default
jats_counterpart:
  element: 'license'
  attributes:
    xlink:href: from href
  notes: |
    JATS uses <license xlink:href="..."> inside <permissions> inside
    <article-meta>. The license content can be free-form text or a
    structured <license-p>. Enscribe's <license> maps to JATS's
    <license> directly; the href kwarg maps to xlink:href.
shorthand_examples:
  - source: |
      <meta>
        <license href="https://creativecommons.org/licenses/by/4.0/" | CC BY 4.0>
      </meta>
    layer1_html: |
      <meta>
        <license href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</license>
      </meta>
    notes: |
      License name with canonical URL.
  - source: '<meta license="MIT License" />'
    layer1_html: |
      <meta>
        <license>MIT License</license>
      </meta>
    notes: |
      Kwarg-form authoring (license name only) lifts to the child-tag
      form at the normalize-to-canonical gate.
interpreter_strategy: schema
---

# `<license>`

The document's license. Records the terms under which the work may be used and redistributed.

## Semantic intent

`<license>` records the license — typically a Creative Commons license, a standard open-source license, or a publisher's all-rights-reserved statement. The element carries the license name (and optionally the canonical URL of the license terms).

Licensing is a routine part of scholarly metadata; journals and preprint servers require it, and downstream tooling (indexers, archives, reading platforms) surfaces it to readers.

## Authoring

Two equivalent forms:

```
<meta>
  <license href="https://creativecommons.org/licenses/by/4.0/" | CC BY 4.0>
</meta>
```

or:

```
<meta license="CC BY 4.0" />
```

The kwarg form is more compact but cannot carry the href; for licenses with canonical URLs (which is most of them), the child-tag form with the `href` kwarg is preferred.

## Conventional license names

- `CC BY 4.0`, `CC BY-SA 4.0`, `CC0 1.0`, etc. — Creative Commons.
- `MIT License`, `Apache 2.0`, `GPLv3`, etc. — open-source software licenses (sometimes used for accompanying code or documentation).
- `All rights reserved` — for traditionally-copyrighted works.

The license name passes through as text content; downstream tooling matches against known identifiers when present.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<license href="...">CC BY 4.0</license>` | `<license xlink:href="..."><license-p>CC BY 4.0</license-p></license>` (inside `<permissions>`) |

The exporter wraps the license text in `<license-p>` and places the result inside `<permissions>` inside `<article-meta>`.

## Render-mode lowering

In render mode, the license typically displays in the article footer or sidebar as a hyperlink to the canonical URL when one is supplied.

## See also

- [`<meta>`](meta.md) — the metadata wrapper that holds the license.
- [`<doi>`](doi.md), [`<lang>`](lang.md), [`<version>`](version.md) — sibling document-metadata fields.

---
semantic_role: publication-date
category: metadata
html_output:
  element: publication-date
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    format:
      maps_to: data-date-format
      values: [iso, ymd, ymd-time, mdy, dmy, custom]
      notes: |
        Optional hint about how the date should be parsed and formatted.
        Default is iso (YYYY-MM-DD). Same set as <date>'s format kwarg.
content:
  shape:
    contains: [inline]
  becomes: children
  notes: |
    The publication date as text. ISO 8601 (YYYY-MM-DD) is preferred
    for machine readability; free-form dates ("March 15, 2024",
    "Spring 2024") are accepted.
jats_counterpart:
  element: pub-date
  notes: |
    JATS uses <pub-date> inside <article-meta> for the publication
    date. The exporter parses ISO-format dates into structured
    <year>/<month>/<day> children; free-form dates pass through as
    text content.
shorthand_examples:
  - source: |
      <meta>
        <publication-date | 2024-03-15>
      </meta>
    layer1_html: |
      <meta>
        <publication-date>2024-03-15</publication-date>
      </meta>
    notes: |
      ISO 8601 publication date — the preferred form.
  - source: |
      <meta>
        <publication-date | March 15, 2024>
      </meta>
    layer1_html: |
      <meta>
        <publication-date>March 15, 2024</publication-date>
      </meta>
    notes: |
      Free-form publication date. Acceptable but ISO 8601 is preferred
      for predictable JATS export and machine readability.
interpreter_strategy: schema
---

# `<publication-date>`

The document's publication date. A focused element for the most common case (when *only* the publication date matters); the more general `<date>` element with `type=publication` produces equivalent output and is preferred when the document records multiple date types (submission, acceptance, revision, publication).

## Semantic intent

`<publication-date>` records when the document was published. Two equivalent authoring paths exist:

- This dedicated element: `<publication-date | 2024-03-15>` — concise; expresses intent at the element name level.
- The general `<date type=publication | ...>` element — uniform with submission / acceptance / revision dates when those are also recorded.

Both produce equivalent JATS output (`<pub-date>`). Choice is authoring ergonomics.

## Authoring

```
<meta>
  <publication-date | 2024-03-15>
</meta>
```

ISO 8601 (`YYYY-MM-DD`) is preferred. Free-form dates ("March 15, 2024", "Spring 2024") are accepted but lose machine readability.

## When to use `<publication-date>` vs `<date>`

| Case | Element |
|---|---|
| Publication date only | `<publication-date>` (concise) |
| Multiple date types (submission, acceptance, publication) | Multiple `<date type=...>` elements (uniform) |

Both work; both produce the same JATS output for the publication date.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<publication-date>2024-03-15</publication-date>` | `<pub-date>` (with parsed `<year>`/`<month>`/`<day>` children for ISO dates) |

The exporter parses ISO dates structurally; free-form dates pass through as text content.

## See also

- [`<date>`](date.md) — the general date element supporting multiple date types.
- [`<meta>`](meta.md) — the metadata wrapper.

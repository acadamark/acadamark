---
semantic_role: date
category: metadata
html_output:
  element: date
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-date-type
      values: [publication, submission, acceptance, revision, retraction, embargo, other]
      default: publication
      notes: |
        Distinguishes different kinds of dates. The default (publication)
        is the date the document was published.
    format:
      maps_to: data-date-format
      values: [iso, ymd, ymd-time, mdy, dmy, custom]
      notes: |
        Optional hint about how the date should be parsed and formatted.
        Default is iso (YYYY-MM-DD).
content:
  type: prose
  becomes: children
  notes: |
    The date value, typically as text. Common formats:
    - ISO 8601: 2024-03-15 (default).
    - With time: 2024-03-15T14:30:00Z.
    - Free-form: "March 15, 2024" or "Spring 2024".
content_handler: default
jats_counterpart:
  element: 'pub-date or date (in history)'
  notes: |
    JATS uses <pub-date> for publication dates. Other date types
    (submission, acceptance, revision) appear inside <history> as
    <date date-type="...">. The exporter dispatches based on the type
    kwarg value.
shorthand_examples:
  - source: '<date | 2024-03-15>'
    layer1_html: '<date>2024-03-15</date>'
    notes: |
      A bare <date> is UNTYPED (no data-date-type) — an authoring date is
      "when you wrote it" (like the date on a letter), not a publication
      date (cf. Quarto/Pandoc/Bookdown preamble date slots). Use an explicit
      type= (e.g. <date type=publication | …>) for a typed date. (#325)
  - source: '<date type=submission | 2023-11-01>'
    layer1_html: '<date data-date-type="submission">2023-11-01</date>'
  - source: |
      <meta>
        <date type=submission | 2023-11-01>
        <date type=acceptance | 2024-02-10>
        <date type=publication | 2024-03-15>
      </meta>
    layer1_html: |
      <meta>
        <date data-date-type="submission">2023-11-01</date>
        <date data-date-type="acceptance">2024-02-10</date>
        <date data-date-type="publication">2024-03-15</date>
      </meta>
    notes: |
      Multiple dates of different types. The publication date is the
      primary; submission, acceptance, etc., go in JATS history.
  - source: '<date | March 15, 2024>'
    layer1_html: '<date>March 15, 2024</date>'
    notes: |
      Free-form date format. Acceptable but ISO 8601 is preferred for
      machine readability and for predictable JATS export.
interpreter_strategy: schema
---

# `<date>`

A document-related date. Distinguishes between publication, submission, acceptance, revision, and other date types via the `type` kwarg.

## Semantic intent

Documents have multiple meaningful dates. Scholarly publishing tracks:

- **Publication date**: when the document was published.
- **Submission date**: when the manuscript was submitted to a journal.
- **Acceptance date**: when reviewers accepted the manuscript.
- **Revision date**: when significant revisions were completed.
- **Retraction date**: when (rarely) a published paper was retracted.
- **Embargo date**: when an embargo on publication lifts.

The `<date>` element with the `type` kwarg captures all of these. Multiple `<date>` elements can appear in `<meta>`, each with a different type, providing a complete temporal history.

## Authoring

**Simple publication date.**

```
<date | 2024-03-15>
```

A bare `<date>` is untyped (no `data-date-type`) — an authoring date is "when you wrote it," not a publication date. Add an explicit `type=` for a typed date (see below). (#325)

**Specific date type.**

```
<date type=submission | 2023-11-01>
```

**Multiple dates.**

```
<meta>
  <date type=submission | 2023-11-01>
  <date type=acceptance | 2024-02-10>
  <date type=publication | 2024-03-15>
</meta>
```

Common in journal article metadata where the editorial timeline matters.

## Date format

ISO 8601 is preferred (`YYYY-MM-DD`). Optional time and timezone (`YYYY-MM-DDTHH:MM:SSZ`) for date-times.

Free-form dates ("March 15, 2024", "Spring 2024", "Late 2023") are acceptable for casual use but lose machine readability. The JATS exporter parses ISO dates structurally; free-form dates pass through as text.

## Attributes

`type` distinguishes date types (publication, submission, etc.). See semantic intent for values.

`format` is an optional hint about expected formatting:

- `iso` — YYYY-MM-DD (default).
- `ymd` — same as iso, alias.
- `ymd-time` — YYYY-MM-DDTHH:MM:SS.
- `mdy` — Month DD, YYYY (US English).
- `dmy` — DD Month YYYY (UK English, EU).
- `custom` — author-specified format; no parsing assumed.

The format kwarg helps the JATS exporter and downstream tooling interpret the date string. It doesn't affect the visible rendered output — that's controlled by CSS or render-mode formatting.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<date type=publication>` | `<pub-date>` (with parsed `<year>`, `<month>`, `<day>` children) |
| `<date type=submission>` | `<date date-type="received">` (inside `<history>`) |
| `<date type=acceptance>` | `<date date-type="accepted">` (inside `<history>`) |
| `<date type=revision>` | `<date date-type="rev-recd">` (inside `<history>`) |
| `<date type=retraction>` | retraction handled via separate JATS mechanisms |
| `<date type=other>` | `<date date-type="other">` |

The exporter parses ISO-format dates into the structured year/month/day form expected by JATS. Free-form dates pass through as text content.

## Render-mode lowering

In render mode, dates lower to `<time>` HTML elements:

```html
<time datetime="2024-03-15">March 15, 2024</time>
```

The `datetime` attribute carries the machine-readable form; the visible text can be formatted differently for human readability via CSS or render-mode formatting.

## See also

- [`<meta>`](meta.md) — the metadata wrapper that holds dates.

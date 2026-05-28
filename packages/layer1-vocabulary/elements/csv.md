---
semantic_role: csv
html_output:
  element: csv
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` here is the vocabulary lookup key (must match
    the tagname). `<csv>` is a DSL — its content is comma-separated
    source data, parsed by the CSV handler and rendered as a real HTML
    `<table>` element. The schema `html_output.element` field is ignored
    because `interpreter_strategy: handler` routes through the handler
    instead; the handler builds the `<table>` shape directly. `<csv>`
    itself does not appear in the rendered HTML.
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    caption:
      handled_by: handler
      notes: |
        Optional caption for the rendered table. When set, renders as
        `<caption>` inside the table. The numbering plugin (when
        applicable) prepends a "Table N." label.
  booleans:
    headers:
      handled_by: handler
      default: true
      notes: |
        Whether the first row is the header row. Default true (+headers
        / headers=true). Use -headers to treat every row as data; no
        `<thead>` is generated.
content:
  type: opaque
  becomes: 'parsed CSV rows (rendered as <table>)'
  notes: |
    Content is comma-separated source data, preserved verbatim and parsed
    by the handler. No acadamark interpretation. Quoted fields with RFC
    4180 escaping are supported (same parser as `<table csv>`).
content_handler: csv
jats_counterpart:
  element: table-wrap
  notes: |
    JATS uses `<table-wrap>` for a tabular figure. The CSV handler's
    output (an HTML `<table>` with rows and headers) corresponds to JATS
    `<table-wrap>/<table>`. The CSV source itself does not appear in JATS
    output — only the parsed table structure.
shorthand_examples:
  - source: |
      <csv>
      name,age,city
      Alice,30,Boston
      Bob,25,Seattle
      </csv>
    layer1_html: |
      <table>
        <thead><tr><th>name</th><th>age</th><th>city</th></tr></thead>
        <tbody>
          <tr><td>Alice</td><td>30</td><td>Boston</td></tr>
          <tr><td>Bob</td><td>25</td><td>Seattle</td></tr>
        </tbody>
      </table>
    notes: |
      Long-form `<csv>` with a header row (default).
  - source: |
      <csv -headers>
      1,2,3
      4,5,6
      </csv>
    layer1_html: |
      <table>
        <tbody>
          <tr><td>1</td><td>2</td><td>3</td></tr>
          <tr><td>4</td><td>5</td><td>6</td></tr>
        </tbody>
      </table>
    notes: |
      Suppress header-row treatment with -headers; every row becomes a
      `<tbody>` row.
interpreter_strategy: handler
handler_module: ./handlers/csv.js
handler_responsibilities:
  - Parse `node.content` (opaque CSV string) using RFC-4180-compatible parser.
  - Honor the `headers` boolean kwarg (default true).
  - Render as a hast `<table>` with `<thead>` / `<tbody>` per the parsed shape.
  - Apply id / classes / caption / numbering on the outer `<table>` element.
---

# `<csv>`

A CSV (comma-separated values) data block. Parses its opaque content as CSV and renders as a real HTML `<table>` element.

## Semantic intent

`<csv>` is a DSL — its content is foreign-language data (CSV), parsed by a delegated processor (the CSV handler) into a rendered table. Acadamark does not interpret the content as prose.

The element is the natural authoring shape for an unstyled CSV table. For an authored table with explicit format dispatch (e.g. CSV alongside TSV/JSON/YAML in the same tag), use the qualifying form `<table csv | …>`; both `<csv>` and `<table csv>` use the same parser and produce equivalent output.

## Authoring

```
<csv>
name,age,city
Alice,30,Boston
Bob,25,Seattle
</csv>
```

The first row is treated as the header row by default. To suppress, use `-headers`:

```
<csv -headers>
1,2,3
4,5,6
</csv>
```

The CSV parser is RFC-4180-compatible — quoted fields with embedded commas, embedded quotes (escaped as `""`), and multi-line cells all work.

## Attributes

`headers` — whether the first row is the header row. Default `true`.

`caption` — optional caption text for the rendered table. Renders as `<caption>` inside the table. When the table is numbered, a "Table N." label is prepended automatically.

`id` and `class` — applied to the outer `<table>` element.

## JATS mapping

| acadamark | JATS |
|---|---|
| `<csv>` (rendered output) | `<table-wrap>/<table>` |

The CSV source itself does not appear in JATS — only the parsed table structure.

## Render-mode lowering

`<csv>` is a DSL; the rendered output is a real HTML `<table>` element, which is HTML-native and needs no further lowering.

## See also

- [`<table>`](table.md) — the data-format-dispatching table tag (supports CSV, TSV, JSON, YAML, MD via the qualifying form `<table format | …>`).
- [`<tsv>`](tsv.md) — same shape, tab-separated values.

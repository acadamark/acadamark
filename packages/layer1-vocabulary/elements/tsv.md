---
semantic_role: tsv
html_output:
  element: tsv
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` here is the vocabulary lookup key (must match
    the tagname). `<tsv>` is a DSL — its content is tab-separated source
    data, parsed by the TSV handler and rendered as a real HTML
    `<table>` element. The schema `html_output.element` field is ignored
    because `interpreter_strategy: handler` routes through the handler
    instead; the handler builds the `<table>` shape directly. `<tsv>`
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
  becomes: 'parsed TSV rows (rendered as <table>)'
  notes: |
    Content is tab-separated source data, preserved verbatim and parsed
    by the handler. No acadamark interpretation. Same parser as
    `<table tsv>`.
content_handler: tsv
jats_counterpart:
  element: table-wrap
  notes: |
    JATS uses `<table-wrap>` for a tabular figure. The TSV handler's
    output (an HTML `<table>` with rows and headers) corresponds to JATS
    `<table-wrap>/<table>`. The TSV source itself does not appear in JATS
    output — only the parsed table structure.
shorthand_examples:
  - source: |
      <tsv>
      name	age	city
      Alice	30	Boston
      Bob	25	Seattle
      </tsv>
    layer1_html: |
      <table>
        <thead><tr><th>name</th><th>age</th><th>city</th></tr></thead>
        <tbody>
          <tr><td>Alice</td><td>30</td><td>Boston</td></tr>
          <tr><td>Bob</td><td>25</td><td>Seattle</td></tr>
        </tbody>
      </table>
    notes: |
      Long-form `<tsv>` with a header row (default). Cells are separated
      by literal tab characters.
interpreter_strategy: handler
handler_module: ./handlers/tsv.js
handler_responsibilities:
  - Parse `node.content` (opaque TSV string) splitting on tab.
  - Honor the `headers` boolean kwarg (default true).
  - Render as a hast `<table>` with `<thead>` / `<tbody>` per the parsed shape.
  - Apply id / classes / caption / numbering on the outer `<table>` element.
---

# `<tsv>`

A TSV (tab-separated values) data block. Parses its opaque content as TSV and renders as a real HTML `<table>` element.

## Semantic intent

`<tsv>` is a DSL — its content is foreign-language data (TSV), parsed by a delegated processor (the TSV handler) into a rendered table. Acadamark does not interpret the content as prose.

The element is the natural authoring shape for an unstyled TSV table. For an authored table with explicit format dispatch, use the qualifying form `<table tsv | …>`; both `<tsv>` and `<table tsv>` use the same parser and produce equivalent output.

## Authoring

```
<tsv>
name	age	city
Alice	30	Boston
Bob	25	Seattle
</tsv>
```

Cells are separated by literal tab characters. The first row is treated as the header row by default; to suppress, use `-headers`.

## Attributes

`headers` — whether the first row is the header row. Default `true`.

`caption` — optional caption text for the rendered table.

`id` and `class` — applied to the outer `<table>` element.

## JATS mapping

| acadamark | JATS |
|---|---|
| `<tsv>` (rendered output) | `<table-wrap>/<table>` |

## See also

- [`<csv>`](csv.md) — same shape, comma-separated values.
- [`<table>`](table.md) — the data-format-dispatching table tag.

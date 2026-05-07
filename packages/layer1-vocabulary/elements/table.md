---
semantic_role: table
html_output:
  element: table
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-table-type
      values: [data, layout, comparison, schedule, results, other]
      notes: |
        Optional classification of the table's role. Affects styling
        and may affect JATS export.
content:
  type: structured
  shape:
    - element: caption
      required: false
      contains: [inline]
    - element: thead
      required: false
      contains: [tr]
    - element: tbody
      required: false
      contains: [tr]
    - element: tfoot
      required: false
      contains: [tr]
    - element: tr
      required: false
      multiple: true
      notes: |
        When tbody/thead/tfoot wrappers are absent, tr elements appear
        directly as children of table.
content_handler: default
jats_counterpart:
  element: table-wrap
  attributes:
    table-type: from type
  notes: |
    JATS uses <table-wrap> as the container, with <table> nested inside.
    The acadamark <table> maps to JATS's nested <table>; the wrapping
    <table-wrap> is generated at export to provide JATS's expected structure.
shorthand_examples:
  - source: |
      | Name | Price |
      |------|-------|
      | foo  | 1     |
      | bar  | 2     |
    layer1_html: |
      <table>
        <thead>
          <tr><th>Name</th><th>Price</th></tr>
        </thead>
        <tbody>
          <tr><td>foo</td><td>1</td></tr>
          <tr><td>bar</td><td>2</td></tr>
        </tbody>
      </table>
    notes: |
      Plain markdown table syntax (via remark-gfm). The most common
      authoring path for simple tables. No explicit acadamark tags needed.
  - source: |
      <csv | name,price
      foo,1
      bar,2
      >
    layer1_html: |
      <table>
        <thead>
          <tr><th>name</th><th>price</th></tr>
        </thead>
        <tbody>
          <tr><td>foo</td><td>1</td></tr>
          <tr><td>bar</td><td>2</td></tr>
        </tbody>
      </table>
    notes: |
      The <csv> DSL engine produces a table from CSV source. See the
      <csv> vocabulary entry for details on engine attributes (header
      control, alignment, etc.).
  - source: |
      <table #revenue type=results>
        <caption | Quarterly revenue>
        <tr><th>Quarter</th><th>Revenue</th></tr>
        <tr><td>Q1</td><td>$100M</td></tr>
        <tr><td>Q2</td><td>$120M</td></tr>
      </table>
    layer1_html: |
      <table id="revenue" data-table-type="results">
        <caption>Quarterly revenue</caption>
        <tr><th>Quarter</th><th>Revenue</th></tr>
        <tr><td>Q1</td><td>$100M</td></tr>
        <tr><td>Q2</td><td>$120M</td></tr>
      </table>
    notes: |
      Explicit table with cells, used when fine control over structure
      or attributes is needed.
interpreter_strategy: schema
---

# `<table>`

A table represents tabular data — rows and columns of values, headers, and possibly captions and structural groupings. The HTML-native element for tabular content.

## Semantic intent

Tables in acadamark are reached through three authoring paths, each appropriate for different cases:

**Plain markdown** for simple tables in flowing prose. Standard pipe-and-dash syntax (via remark-gfm) produces `<table>` output without any explicit acadamark tags.

**DSL engine tags** like `<csv>`, `<tsv>`, `<json>` for tabular data that exists in a structured file format. The engine parses the data and generates the appropriate `<table>` structure. This is the primary path for data-driven tables.

**Explicit `<table>` with cells** for cases requiring fine control: complex cell content (paragraphs, lists, nested elements), specific cell attributes, manual structural control. Authors reach for this when the simpler paths don't fit.

The element is HTML-native and matches HTML5's semantic intent. Most authors will rarely write `<table>` directly; the markdown and DSL paths handle most needs.

## When to use each path

**Plain markdown.**

```
| Name | Price |
|------|-------|
| foo  | 1     |
| bar  | 2     |
```

Simple, readable in source, handles most tables in academic writing. The pipe-and-dash syntax produces a complete table including header row.

**CSV (or TSV, JSON).**

```
<csv | name,price
foo,1
bar,2
>
```

Use when the data exists as CSV/TSV/JSON. The engine handles the conversion to a table. See the `<csv>` vocabulary entry for details on engine-specific attributes (header control, alignment, etc.).

**Explicit `<table>`.**

```
<table #revenue>
  <caption | Quarterly revenue>
  <tr><th>Quarter</th><th>Revenue</th></tr>
  <tr><td>Q1</td><td>$100M</td></tr>
</table>
```

Use when you need a specific id, custom classes, particular cell attributes, or complex cell content that markdown can't express.

## Future: richer table tooling

Tables are an area where acadamark deliberately stays minimal in the current iteration. Rich table support — multi-row headers, complex column groupings, cell merging, conditional formatting — is best handled by purpose-built tools rather than by extending acadamark's table vocabulary.

When acadamark gains executable code blocks (`<python>`, `<r>`, `<julia>`), tools like R's `gt`, Python's `tabulate`, and Quarto's table generation become available through the engine pattern. Authors who need rich tables will use code to generate them rather than hand-writing complex `<table>` markup.

LaTeX's `tabular` environment and similar table packages are valuable references for the design space but acadamark doesn't aim to reproduce them. The combination of "simple cases via markdown/CSV" and "rich cases via executable engines" covers the practical authoring needs without requiring acadamark to grow a complex table grammar.

## Structural elements

A `<table>` can contain these structural elements:

- `<caption>` — optional table caption (distinct from `<figcaption>` which wraps figures).
- `<thead>` — optional header row group.
- `<tbody>` — optional body row group (often the entire table content).
- `<tfoot>` — optional footer row group.
- `<tr>` — table row, containing cells.
- `<th>` — header cell.
- `<td>` — data cell.
- `<colgroup>`, `<col>` — column groupings for styling (rarely used).

These cell-level elements are HTML-native. They follow standard HTML behavior. Authors writing explicit tables use them as in regular HTML; markdown and DSL paths generate them automatically.

For most use cases, authors don't need to think about these — markdown produces a table with `<thead>` for the header row and `<tbody>` for the data rows automatically. CSV produces similar structure. Explicit authors who want to write a table with header rows can write `<tr>` with `<th>` cells directly without wrapping in `<thead>`; the structure is still valid HTML.

## Captions

A table can be captioned in two ways:

**Native HTML caption.**

```
<table>
  <caption | Quarterly revenue>
  <tr>...</tr>
</table>
```

The `<caption>` is the table's own caption, rendered with the table.

**Wrapped in figure.**

```
<figure type=table |
<table>
  <tr>...</tr>
</table>
Quarterly revenue.
>
```

The table is wrapped in a `<figure>` and gets a `<figcaption>` instead of a `<caption>`. This is appropriate when the table should be numbered alongside other figures (Figure 3, Figure 4, etc.).

The choice depends on the author's intent:

- Use `<caption>` for tables that are tables — content displayed in tabular form, captioned in place, not necessarily numbered.
- Use `<figure>` wrapping for tables that are figures — content presented as a numbered, cross-referenceable item in a figure series.

## Attributes

`type` classifies the table's role:

- `data` — a table presenting data (default; usually omitted).
- `layout` — a table used for visual layout (deprecated practice; HTML5 discourages this, but the option exists for legacy content).
- `comparison` — a table comparing alternatives.
- `schedule` — a schedule, timetable, or sequence.
- `results` — experimental or analytical results.
- `other` — anything not covered above.

The classification mostly affects styling and JATS export.

## JATS mapping

JATS uses `<table-wrap>` as the container with `<table>` nested inside, plus optional `<caption>` and `<table-wrap-foot>` for table footnotes.

| acadamark | JATS |
|-----------|------|
| `<table>` | `<table-wrap><table>...</table></table-wrap>` |
| `<caption>` | `<caption>` (inside `<table-wrap>`, not inside `<table>`) |
| `<tr>`, `<th>`, `<td>` | `<tr>`, `<th>`, `<td>` (preserved exactly) |
| `type` kwarg | `<table-wrap>` content-type attribute |

The exporter handles the wrapping mechanically.

## Render-mode lowering

`<table>` and its child elements (`<tr>`, `<th>`, `<td>`, `<caption>`, etc.) are HTML-native and don't need lowering. Attributes are preserved.

## See also

- [`<csv>`](csv.md), [`<tsv>`](tsv.md) — DSL engines for tabular data.
- [`<figure>`](figure.md) — wrapping element for captioned content (use when tables should be numbered as figures).
- Plain markdown tables (via remark-gfm) — the natural authoring path for simple tables.

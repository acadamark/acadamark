---
semantic_role: table
category: frameables
html_output:
  element: table
  is_html_native: true
  default_attributes: {}
interpreter_strategy: handler
handler_module: ./handlers/table.js
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  positional:
    - name: format
      values: [csv, tsv, json, yaml, md]
      notes: |
        Format of inline pipe content. When absent, content is treated as
        raw HTML pass-through (escape-hatch form). Required for all
        data-driven forms.
  booleans:
    headers:
      handled_by: handler
      default: true
      notes: |
        Whether the first row of the data is a header row. Default true.
        Use -headers to suppress thead generation; rows render as tbody only.
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this table is counted in the numbered table sequence and
        receives a "Table N." label prefix in its caption.
    parse-text:
      handled_by: plugin
      default: false
      notes: |
        #21: whether ALL cells of a DATA-format table parse as Enscribe inline
        markup. Default false (data-format cells are literal — the safe baseline).
        +parse-text parses every cell; -parse-text forces literal, overriding a
        document-wide <config parse-data-tables=true> default. Markdown/pipe
        tables always parse and ignore this. Resolved by the table-cell-parse
        plugin (precedence: this attribute > config default > literal baseline).
  kwargs:
    parse-columns:
      notes: |
        #21: comma-separated list of column names (by header) whose cells parse
        as Enscribe inline markup, leaving the other columns literal — the common
        mixed case (a prose column among data columns). Adds the named columns on
        top of the parse-text / config decision. Headerless tables can't match by
        name, so use +parse-text there. A parsed column parses in HTML AND JATS;
        the stored data payload is never mutated (a display directive on the table).
    caption:
      notes: |
        Short-form caption as a kwarg string. Renders as <caption> inside
        the table element. When numbered, a "Table N." label span is
        prepended. Long-form caption (<caption | ...> nested tag) is deferred.
    src:
      notes: |
        Path to an external data file. Relative to the document's assets
        directory (configurable via the assetsDir interpreter option).
        The content handler reads the file at interpretation time.
    type:
      maps_to: data-table-type
      values: [data, layout, comparison, schedule, results, other]
      notes: |
        Optional semantic classification. Affects styling and JATS export.
content:
  type: opaque-or-structured
  notes: |
    When a format positional is present (csv, tsv, json, yaml, md), pipe
    content is an opaque data string parsed by the corresponding parser.
    When no format is present, content is treated as raw HTML (escape-hatch).
    The long-form structural path (<table>...<tr>...</table>) is handled by
    the same handler with recursive cell content; this path is partially
    implemented and may produce basic results.
    The JATS importer reuses this no-format path for complex (colspan / rowspan /
    multi-row-header) tables it can't express as a flat enscribe table (#106): it
    keeps the grid as an HTML layout but stamps `_htmlTable` with each cell's
    converted, resolvable inline (formula → math, xref → ref/cite, fn → note), so
    the handler renders the grid with resolved cells rather than the raw passthrough.
content_handler: table
jats_counterpart:
  element: table-wrap
  attributes:
    table-type: from type
  notes: |
    JATS uses <table-wrap> as the container, with <table> nested inside.
    The enscribe <table> maps to JATS's nested <table>; the wrapping
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
      authoring path for simple tables. No explicit enscribe tags needed.
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
      **Planned — the `<csv>` standalone-handler is not yet implemented**
      (it is registered in `@enscribejs/enscribe/core/dsl-registry` but no handler
      exists yet; an authored `<csv | ...>` today falls through to the
      unknown-element fallback). The example is preserved here as
      documentation of the intended form. Today's working CSV authoring
      path is the qualifying form: `<table csv | ... >` — see the
      table-with-data-format examples below and the DSL-handlers
      backlog item.

      When implemented, the `<csv>` DSL engine will produce a table
      from CSV source. See the `<csv>` vocabulary entry for details on
      engine attributes (header control, alignment, etc.).
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
---

# `<table>`

A table represents tabular data — rows and columns of values, headers, and possibly captions and structural groupings. The HTML-native element for tabular content.

## Semantic intent

Tables in enscribe are reached through three authoring paths, each appropriate for different cases:

**Plain markdown** for simple tables in flowing prose. Standard pipe-and-dash syntax (via remark-gfm) produces `<table>` output without any explicit enscribe tags.

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

**CSV (or TSV, JSON).** **Planned — the standalone `<csv>` / `<tsv>` / `<json>` handlers are not yet implemented.** The intended form:

```
<csv | name,price
foo,1
bar,2
>
```

When implemented, this will be the path used when the data exists as CSV / TSV / JSON; the engine will handle the conversion to a table. See the `<csv>` vocabulary entry for details on engine-specific attributes (header control, alignment, etc.). Today, the working path for CSV data is the qualifying form `<table csv | name,price\n...>` (see the "Explicit `<table>`" subsection below) — this is the standard `<table>` element with `csv` declared as the data format, and the table handler parses it via the same csv engine. The standalone `<csv>` shortcut and the qualifying `<table csv | ...>` form converge to the same parsed table; only the authoring shorthand differs.

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

Tables are an area where enscribe deliberately stays minimal in the current iteration. Rich table support — multi-row headers, complex column groupings, cell merging, conditional formatting — is best handled by purpose-built tools rather than by extending enscribe's table vocabulary.

When enscribe gains executable code blocks (`<python>`, `<r>`, `<julia>`), tools like R's `gt`, Python's `tabulate`, and Quarto's table generation become available through the engine pattern. Authors who need rich tables will use code to generate them rather than hand-writing complex `<table>` markup.

LaTeX's `tabular` environment and similar table packages are valuable references for the design space but enscribe doesn't aim to reproduce them. The combination of "simple cases via markdown/CSV" and "rich cases via executable engines" covers the practical authoring needs without requiring enscribe to grow a complex table grammar.

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

## Cell content: literal data, opt-in markup (#21)

Whether a cell parses as Enscribe inline markup is keyed to the table's **kind**,
with explicit opt-in to override:

- **Markdown / pipe tables** (`| a | b |`) — cells **always parse** as inline
  markup (standard remark behavior). Unchanged.
- **Data-format tables** (`<table csv>`, `<table json>`, …) — cells are
  **literal by default**, because data-format tables usually hold data that
  markup interpretation would mangle. Parsing is opt-in:
  - `+parse-text` — parse every cell.
  - `parse-columns="notes, summary"` — parse only the named columns (by header),
    leaving the data columns literal. The common mixed case.
  - `-parse-text` — force all cells literal (overrides a document-wide default).
- **Document-wide default** — `<config parse-data-tables=true>` makes data-format
  tables parse by default for a document with many similar tables. Baseline
  **off**, so literal data is the safe default; data parses only when the author
  opted in somewhere deliberate. Per-table attributes override it.

**Precedence:** per-table attribute (`+`/`-parse-text`, `parse-columns`) > the
global `<config>` default > the kind baseline (markdown = parse, data = literal).

**What "parse" means.** A cell is **phrasing content** — emphasis, strong,
`<a URL | text>` links, cross-references, citations, footnotes (`<note>`), inline
code, inline math — not a block container (no headings, lists, or nested tables,
the same as GFM). Opted-in cells route through the *same* inline pipeline the rest
of the document uses; a cross-reference, citation, or footnote in a cell resolves
exactly like one in body prose. (Footnotes-in-cells were out of scope at #21,
because the cell-parse pass then ran *after* the notes pass; #105 moved it
*before* the notes pass — the shared walkers already descend the parsed cells — so
a `<note>` in a cell now collects, numbers, and hoists like any body footnote.)

**Both channels; payload stays literal.** A parsed column parses in **HTML and
JATS both** (a link is an `<a>` / `<ext-link>`, a cross-ref an `<xref>`), and a
literal column stays literal in both. The opt-in is a display/semantic directive
on the *table* — the stored data payload (the inline content, or the `src=` file)
is never rewritten. The asset three-layer model holds: format/identity untouched,
display interpreted.

## JATS mapping

JATS uses `<table-wrap>` as the container with `<table>` nested inside, plus optional `<caption>` and `<table-wrap-foot>` for table footnotes.

| enscribe | JATS |
|-----------|------|
| `<table>` | `<table-wrap><table>...</table></table-wrap>` |
| `<caption>` | `<caption>` (inside `<table-wrap>`, not inside `<table>`) |
| `<tr>`, `<th>`, `<td>` | `<tr>`, `<th>`, `<td>` (preserved exactly) |
| `type` kwarg | `<table-wrap>` content-type attribute |

The exporter handles the wrapping mechanically.

## Render-mode lowering

`<table>` and its child elements (`<tr>`, `<th>`, `<td>`, `<caption>`, etc.) are HTML-native and don't need lowering. Attributes are preserved.

## Design context

The kwarg-vs-child-tag decision for captions follows two `DESIGN.md`
directions (§"Design directions (discovered through implementation)"):

- **"Content gets parsed; arguments don't"** — the trap is content-
  shaped values that happen to be written as keyword arguments. A
  `caption="..."` containing rich content (citations, math) is
  content wearing an argument's clothing and must be parsed as
  such.
- **"Caption-bearing elements support two equivalent forms"** — both
  the compact form (`caption="..."` kwarg) and the explicit form
  (`<caption>...</caption>` child) produce identical output. An earlier change (`a90a0d2`) implemented the kwarg-form lift to child-tag at the
  normalize-to-canonical gate. For `<table>` (opaque-
  content frameable), the lift is skipped to preserve the body
  data string; the handler reads the caption kwarg directly via
  `extractFrameableChildren`'s opaque-content fallback.

## See also

- [`<csv>`](csv.md), [`<tsv>`](tsv.md) — DSL engines for tabular data.
- [`<figure>`](figure.md) — wrapping element for captioned content (use when tables should be numbered as figures).
- Plain markdown tables (via remark-gfm) — the natural authoring path for simple tables.

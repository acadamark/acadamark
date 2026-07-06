---
semantic_role: dataset
category: storage-hosts
semantic_family: stores
html_output:
  element: dataset
  is_html_native: false
  default_attributes: {}
  notes: |
    Enscribe's <dataset> is a custom element. It is a data block: an opaque
    payload (CSV/TSV/JSON/…) held under an id inside <data>, harvested at build
    and stripped, producing no inline rendered output. A consumer pulls it by
    @id (<table src="@id">, <code src="@id">, <diagram src="@id">, <fig src="@id">)
    and interprets the bytes; <dataset> itself renders nothing (invisible, like
    <library>).
enscribe_attributes:
  id:
    maps_to: id
    notes: |
      Required. The id under which the payload is stored; a consumer references
      it as src="@id". A <dataset> in <data> with no id is not registered.
  classes:
    maps_to: class
  positional:
    - name: format
      values: [csv, tsv, json, other]
      notes: |
        The format word — the canonical way to name the payload language
        (`<dataset #id csv>…</dataset>`). Opaque: the format is a stored hint the
        consumer reads, never interpreted at the store. The `format=` kwarg below
        is the equivalent attribute form.
  kwargs:
    format:
      maps_to: data-format
      values: [csv, tsv, json, other]
      required: false
      notes: |
        Attribute-form equivalent of the format-word positional
        (`<dataset #id format=csv>…</dataset>`). Stored verbatim as a hint for
        the @id consumer (a <table> without its own format word uses it; a
        <diagram> whose engine disagrees with it is a visible error). The store
        never interprets the bytes.
content:
  shape:
    contains: [opaque]
  becomes: harvested
  notes: |
    OPAQUE bytes — never markdown-parsed, so a #/*/_ in the payload passes
    through untouched. A <dataset> MUST be authored in the LONG form
    <dataset …>…</dataset>: the payload is the tag body. The pipe form
    <dataset … | bytes> is delimited by the first unescaped ">", truncating a
    payload that contains ">" (Mermaid "-->", JSON, code) — which datasets
    routinely carry. buildAssetIndex rejects a non-long-form <dataset> as a
    visible authoring error. See notes/specs/data-store.md Piece 1.
jats_counterpart:
  element: 'no direct equivalent'
  notes: |
    A stored dataset has no settled JATS projection yet (an open question for the
    JATS slice — a candidate is <supplementary-material>, or the existing
    <table-wrap> path for a table consumer of the dataset). The <dataset>
    declaration is harvested and stripped before JATS lowering, so it never leaks
    into the export.
interpreter_strategy: schema
shorthand_examples:
  - source: |
      <data>
        <dataset #sales csv>
      quarter,revenue
      Q1,100
      Q2,120
      Q3,145
        </dataset>
      </data>

      <table src="@sales" />
    ehtml: |
      <table id="tab:sales">
        <thead><tr><th>quarter</th><th>revenue</th></tr></thead>
        <tbody>
          <tr><td>Q1</td><td>100</td></tr>
          <tr><td>Q2</td><td>120</td></tr>
          <tr><td>Q3</td><td>145</td></tr>
        </tbody>
      </table>
    notes: |
      A CSV dataset is stored once under #sales and a <table src="@sales" /> pulls
      it in and renders it as a grid. The dataset itself renders nothing; the
      consuming element decides how to present the opaque bytes.
related_plugins:
  - name: enscribeResourceCollection
    purpose: 'Phase 1 discovery — collects <data> blocks (and their <dataset> stores) regardless of source position. See notes/specs/data-store.md.'

---

# `<dataset>`

A **storage host**: an opaque data payload (CSV / TSV / JSON / other tabular or structured content) held under an id inside a `<data>` block, for a consuming element to pull in by `@id` and interpret. It is the data sibling of `<library>` (which holds bibliography sources) — storage commits to nothing; the consumer types it.

## Semantic intent

`<dataset>` holds **referenced data, not displayed content**. Its body is stored as **opaque bytes** — never markdown-parsed, so a `#`/`*`/`_` in the payload is preserved verbatim — keyed by its id (with an optional `format` hint). It produces no inline rendered output; it is harvested at build and stripped from `<data>`. The same opaque store feeds several consumers, each interpreting the one payload its own way:

- `<table src="@id" />` renders a **grid**.
- `<diagram engine src="@id" />` reads the bytes as its engine **source** (a Mermaid or abc diagram).
- `<code src="@id" />` renders them as a verbatim **code listing**.
- `<fig src="@id" />` keeps its image interpretation.

An `@id` that is unresolved, or the wrong kind for the reader, renders a visible asset-error rather than failing silently.

## Long-form is required

A `<dataset>` is always authored in the **long form** `<dataset …>…</dataset>` — the payload is the tag body. The pipe form `<dataset … | bytes>` is delimited by the first unescaped `>`, so a payload that contains `>` (Mermaid's `-->`, some JSON, `<code>`-shaped source) is truncated there — and datasets routinely contain `>`. At harvest, a non-long-form `<dataset>` (pipe, bare, or self-closing) is rejected as a visible authoring error and is not registered. See `notes/specs/data-store.md` §Piece 1.

## See also

- [`<data>`](data.md) — the container `<dataset>` is declared inside.
- [`<library>`](library.md) — the bibliography-source storage host sibling.
- [`<table>`](table.md) — the first cross-consumer of a stored dataset (`<table src="@id">`).

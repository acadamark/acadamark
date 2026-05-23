---
semantic_role: bib-entry
html_output:
  element: bib-entry
  is_html_native: false
  default_attributes: {}
  notes: |
    Acadamark's <bib-entry> is a custom element representing a single
    bibliography entry in structured acadamark form. Distinct from
    <library> (opaque format) and external file references — this is
    the acadamark-native way to write a bibliography entry.
acadamark_attributes:
  id:
    maps_to: id
    required: true
    notes: |
      The citation key. Must be unique across the document's citation
      registry. Citations elsewhere use this id to reference the entry.
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-bib-type
      values: [article, book, chapter, thesis, proceedings, report, webpage, other]
      required: true
      notes: |
        The bibliography entry type. Determines required and optional
        child elements, and how the entry renders in the bibliography.
content:
  type: structured
  shape:
    - element: author
      required: false
      multiple: true
      notes: |
        Author(s) of the cited work. Multiple authors as siblings,
        same as document <author>.
    - element: editor
      required: false
      multiple: true
    - element: year
      required: false
    - element: title
      required: false
      notes: 'Title of the cited work (article title, book title, etc.).'
    - element: journal
      required: false
      notes: 'Journal name (for type=article).'
    - element: publisher
      required: false
      notes: 'Publisher name (for type=book, etc.).'
    - element: volume
      required: false
    - element: issue
      required: false
    - element: pages
      required: false
    - element: doi
      required: false
    - element: isbn
      required: false
    - element: url
      required: false
content_handler: default
jats_counterpart:
  element: 'ref (containing element-citation or mixed-citation)'
  notes: |
    JATS uses <ref id="..."> as the bibliography entry container,
    with structured content as <element-citation> (when fully structured)
    or <mixed-citation> (when partially structured).
shorthand_examples:
  - source: |
      <bib-entry id=goodall2024 type=article>
        <author | Jane Goodall>
        <year | 2024>
        <title | The Effect of Elephants on Climate>
        <journal | Nature>
        <volume | 612>
        <pages | 234-241>
        <doi | 10.1038/s41586-024-12345>
      </bib-entry>
    layer1_html: |
      <bib-entry id="goodall2024" data-bib-type="article">
        <author>Jane Goodall</author>
        <year>2024</year>
        <title>The Effect of Elephants on Climate</title>
        <journal>Nature</journal>
        <volume>612</volume>
        <pages>234-241</pages>
        <doi>10.1038/s41586-024-12345</doi>
      </bib-entry>
    notes: |
      A structured journal article entry. The id (goodall2024) is the
      citation key.
  - source: |
      <bib-entry id=darwin1859 type=book>
        <author | Charles Darwin>
        <year | 1859>
        <title | On the Origin of Species>
        <publisher | John Murray>
      </bib-entry>
    layer1_html: |
      <bib-entry id="darwin1859" data-bib-type="book">
        <author>Charles Darwin</author>
        <year>1859</year>
        <title>On the Origin of Species</title>
        <publisher>John Murray</publisher>
      </bib-entry>
interpreter_strategy: schema
related_plugins:
  - name: acadamarkBibEntryRegistration
    runs_before: acadamarkCitationResolution
    purpose: 'Registers <bib-entry> elements in the citation registry. See notes/pipeline.md for the full pipeline.'

---

# `<bib-entry>`

A structured bibliography entry in acadamark-native form. The author writes structured child elements (author, title, year, etc.) for one bibliography entry. Distinct from `<library>` (opaque format like BibTeX) and external file references.

## Semantic intent

`<bib-entry>` is the way to write a bibliography entry directly in acadamark using structured elements rather than an external format. Each bib-entry has an id (the citation key) and a type, plus content elements appropriate to the type.

This is the most explicit path for bibliography entries — every field is its own element. Useful when:

- Writing a small number of entries that don't exist elsewhere.
- Authors want full control over how each field is represented.
- The bibliography is part of a fully acadamark-native workflow without external dependencies.

For most authoring, the alternatives are easier:

- **External file** (`<bibliography source="refs.bib">`) is best for shared bibliographies.
- **`<library>`** is best for pasting entries from a reference manager.
- **`<bib-entry>`** is for inline structured authoring when neither alternative fits.

## Authoring

```
<data>
  <bib-entry id=goodall2024 type=article>
    <author | Jane Goodall>
    <year | 2024>
    <title | The Effect of Elephants on Climate>
    <journal | Nature>
    <volume | 612>
    <pages | 234-241>
    <doi | 10.1038/s41586-024-12345>
  </bib-entry>
</data>
```

The id is the citation key (`<cite goodall2024>` resolves against this entry). The type determines which child elements are appropriate.

## Bibliography entry types

The `type` kwarg distinguishes entry kinds, parallel to BibTeX entry types:

| Type | Common fields |
|------|---------------|
| `article` | author, year, title, journal, volume, issue, pages, doi |
| `book` | author, year, title, publisher, isbn |
| `chapter` | author, year, title, book-title, editor, publisher, pages |
| `thesis` | author, year, title, school, type (PhD, masters) |
| `proceedings` | author, year, title, book-title, conference, pages |
| `report` | author, year, title, institution, number |
| `webpage` | author, year, title, url, accessed-date |
| `other` | flexible; for entries that don't fit standard types |

Each type expects certain fields and is rendered with appropriate formatting (italics for journal vs. book title, etc.).

## Field elements

The child elements are themselves Layer 1 elements. They follow consistent conventions:

- **`<author>`**, **`<editor>`** — same elements used in document `<meta>`. Multiple instances allowed.
- **`<year>`** — publication year (separate from full date for bibliographic conventions).
- **`<title>`** — title of the cited work.
- **`<journal>`**, **`<book-title>`** — container titles depending on entry type.
- **`<publisher>`**, **`<institution>`**, **`<school>`** — publishing entities.
- **`<volume>`**, **`<issue>`**, **`<pages>`** — location within container.
- **`<doi>`**, **`<isbn>`**, **`<url>`** — identifiers and locators.

Other fields (translator, edition, series, edition-number, etc.) are added to the vocabulary as needs emerge. Each field has its own minimal vocabulary entry (or is documented within `<bib-entry>` if too specialized to deserve standalone treatment).

## Placement

`<bib-entry>` belongs inside `<data>` (in `<article-back>` by convention):

```
<data>
  <bib-entry id=goodall2024 type=article>
    ...
  </bib-entry>
  <bib-entry id=darwin1859 type=book>
    ...
  </bib-entry>
</data>
```

Multiple bib-entries are siblings within `<data>`. The bibliography assembly plugin collects all of them along with entries from `<library>` blocks and external file references.

## Citation resolution

When a citation (`<cite goodall2024>`) is resolved, the resolver looks up the key against the citation registry. Registry entries come from:

1. External bibliography file (highest priority for shared workflows).
2. `<library>` blocks (parsed entries).
3. `<bib-entry>` elements (this element).

The first match wins. If two sources have the same id, a warning is emitted noting the duplicate.

## Rendering

The bibliography (when rendered) shows entries in the citation style's expected format. For author-year style, an article entry might render as:

```
Goodall, J. (2024). The Effect of Elephants on Climate. Nature, 612, 234-241.
```

The rendering happens in the `<bibliography>` element's processing, not in `<bib-entry>` itself. `<bib-entry>` is a data structure; `<bibliography>` is the display.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<bib-entry id="..." type="...">` | `<ref id="..."><element-citation publication-type="...">...</element-citation></ref>` |
| `<author>` | `<person-group person-group-type="author"><name>...</name></person-group>` |
| `<editor>` | `<person-group person-group-type="editor">...` |
| `<title>` | `<article-title>` (for articles) or `<source>` (for books) |
| `<journal>` | `<source>` |
| `<year>` | `<year>` |
| `<volume>`, `<issue>`, `<pages>` | `<volume>`, `<issue>`, `<fpage>-<lpage>` |
| `<doi>` | `<pub-id pub-id-type="doi">` |

The JATS exporter converts each `<bib-entry>` to its JATS form based on the type.

## Render-mode lowering

`<bib-entry>` doesn't render in the document body — it's a data structure. In render mode, individual `<bib-entry>` elements have `display: none` or are removed; the bibliography itself renders via the `<bibliography>` element which formats entries appropriately.

## See also

- [`<cite>`](cite.md) — citations that resolve against bibliography entries.
- [`<library>`](library.md) — opaque-format alternative for bibliography content.
- [`<bibliography>`](bibliography.md) — the rendered bibliography element.
- [`<data>`](data.md) — the container for `<bib-entry>` elements.

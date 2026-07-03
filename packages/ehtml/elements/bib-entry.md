---
semantic_role: bib-entry
category: citations-and-references
semantic_family: quotation-and-sourcing
authoring: generated
html_output:
  element: bib-entry
  is_html_native: false
  default_attributes: {}
  notes: |
    Enscribe's <bib-entry> is a custom element representing a single
    bibliography entry in structured form. It is generated output — the
    citation plugins assemble it from <library> / external-file sources
    (parsed by citation-js); it is not authored field-by-field.
enscribe_attributes:
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
jats_counterpart:
  element: 'ref (containing element-citation or mixed-citation)'
  notes: |
    JATS uses <ref id="..."> as the bibliography entry container,
    with structured content as <element-citation> (when fully structured)
    or <mixed-citation> (when partially structured).
interpreter_strategy: schema
related_plugins:
  - name: enscribeBibEntryRegistration
    runs_before: enscribeCitationResolution
    purpose: 'Registers <bib-entry> elements in the citation registry. See notes/specs/pipeline.md for the full pipeline.'

---

# `<bib-entry>`

The eHTML representation of a single bibliography entry. `<bib-entry>` is **generated output**, not an authoring surface: the citation plugins assemble it (and the surrounding `<bibliography>`) from the citation registry, which is populated from BibTeX / CSL-JSON via citation-js. Authors do not write `<bib-entry>` field-by-field; they supply citation data through `<library>` (inline BibTeX / CSL-JSON) or `<library src="…">` (an external file), and citation-js produces the structured entries.

## Semantic intent

`<bib-entry>` is the structured eHTML form of one bibliography entry — the shape citation-js produces after parsing the citation data an author supplied elsewhere. Each entry has an id (the citation key) and a type, plus the fields appropriate to that type. It is emitted into the assembled `<bibliography>`; it is not hand-authored field-by-field.

Authors give the citation system entries through two paths, and citation-js does the rest:

- **External source** (`<library src="refs.bib">`, a file or URL #133) — best for shared bibliographies.
- **`<library>`** (inline BibTeX / CSL-JSON) — best for pasting entries from a reference manager.

Both flow through citation-js into the citation registry; the bibliography-assembly plugin then renders the cited entries as `<bib-entry>` elements inside `<bibliography>`.

## Authoring

`<bib-entry>` is not authored directly. Supply the entry as BibTeX or CSL-JSON through `<library>` (or an external file via `<library src="…">`), and the citation plugins generate the `<bib-entry>`:

```
<data>
  <library format=bibtex>
    @article{goodall2024,
      author = {Goodall, Jane},
      title = {The Effect of Elephants on Climate},
      journal = {Nature},
      year = {2024},
      volume = {612},
      pages = {234-241},
      doi = {10.1038/s41586-024-12345}
    }
  </library>
</data>
```

The BibTeX key (`goodall2024`) is the citation key: `<cite goodall2024>` resolves against the generated entry, and the entry's type (`article`, `book`, …) follows from the BibTeX entry type.

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

## Entry fields

A generated `<bib-entry>` carries the bibliographic fields citation-js extracted from the BibTeX / CSL-JSON entry. Which fields are present depends on the entry type:

- **author**, **editor** — contributors.
- **year** — publication year.
- **title** — title of the cited work.
- **journal**, **book-title** — container titles, depending on type.
- **publisher**, **institution**, **school** — publishing entities.
- **volume**, **issue**, **pages** — location within the container.
- **doi**, **isbn**, **url** — identifiers and locators.

These are the fields a citation style draws on when rendering the entry. They are produced by citation-js from the author's BibTeX / CSL-JSON — not enscribe vocabulary tags an author writes.

## Placement

Generated `<bib-entry>` elements live inside the assembled `<bibliography>` (auto-placed in `<article-back>` / `<book-back>`, or where an explicit empty `<bibliography>` marks). Authors place the *source* data — `<library>` blocks — inside `<data>`:

```
<data>
  <library format=bibtex>
    @article{goodall2024, ... }
    @book{darwin1859, ... }
  </library>
</data>
```

The bibliography-assembly plugin parses these (via citation-js) along with any external file references, and renders the cited entries as `<bib-entry>` siblings inside `<bibliography>`.

## Citation resolution

When a citation (`<cite goodall2024>`) is resolved, the resolver looks up the key against the citation registry. The registry is populated from the author-supplied sources — an external bibliography file (`<library src="…">`) and inline `<library>` blocks — parsed through citation-js. The assembled `<bibliography>` then renders the cited entries as `<bib-entry>` elements: `<bib-entry>` is the resolved output, not an input to resolution. If two sources register the same id, a warning is emitted noting the duplicate.

## Rendering

The bibliography (when rendered) shows entries in the citation style's expected format. For author-year style, an article entry might render as:

```
Goodall, J. (2024). The Effect of Elephants on Climate. Nature, 612, 234-241.
```

The rendering happens in the `<bibliography>` element's processing, not in `<bib-entry>` itself. `<bib-entry>` is a data structure; `<bibliography>` is the display.

## JATS mapping

| enscribe | JATS |
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
- [`<data>`](data.md) — the container for the `<library>` source blocks the entries are generated from.

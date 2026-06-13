---
semantic_role: data
category: storage-hosts
html_output:
  element: data
  is_html_native: false
  default_attributes: {}
  notes: |
    Enscribe's <data> is a custom element. It does not produce inline
    output; it holds resources that other parts of the document reference.
    The element is parsed and processed for its contents but does not
    render visibly in the document body.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: structured
  shape:
    - element: library
      required: false
      multiple: true
      notes: 'Inline bibliography blocks in BibTeX, CSL-JSON, or other formats.'
    - element: bib-entry
      required: false
      multiple: true
      notes: 'Structured bibliography entries authored in enscribe form.'
    - element: embedded-image
      required: false
      multiple: true
      notes: 'Future: hardcoded image data (base64) referenced by figures.'
    - element: dataset
      required: false
      multiple: true
      notes: 'Future: tabular data referenced by tables or figures.'
content_handler: default
jats_counterpart:
  element: 'no direct equivalent'
  notes: |
    JATS doesn't have a single resource-block element. Enscribe's <data>
    is decomposed at JATS export: <library> entries are merged into
    <ref-list>; <bib-entry> entries become <ref> elements; embedded image
    data becomes <graphic> with embedded data; etc. The <data> wrapper
    itself does not appear in JATS output.
shorthand_examples:
  - source: |
      <data>
        <library format=bibtex>
          @article{goodall2024,
            author = {Goodall, Jane},
            title = {The Effect of Elephants on Climate},
            journal = {Nature},
            year = {2024}
          }
        </library>
      </data>
    layer1_html: |
      <data>
        <library format="bibtex">
          @article{goodall2024,
            author = {Goodall, Jane},
            title = {The Effect of Elephants on Climate},
            journal = {Nature},
            year = {2024}
          }
        </library>
      </data>
    notes: |
      A library block in BibTeX format. The library plugin parses this,
      registers entries in the citation system. The <data> block itself
      produces no rendered output.
interpreter_strategy: schema
related_plugins:
  - name: enscribeLibraryParsing
    purpose: 'Phase 1 discovery — parses <library> blocks into the citation registry. See notes/specs/pipeline.md for the full pipeline.'
  - name: enscribeResourceCollection
    purpose: 'Phase 1 discovery — collects <data> blocks regardless of source position. See notes/specs/pipeline.md for the full pipeline.'

---

# `<data>`

A container for document resources — content that the document references but does not display inline. Bibliography blocks, embedded image data, lookup tables, and other supporting material that supports the narrative without appearing in the reading flow.

## Semantic intent

`<data>` holds **referenced resources, not displayed content**. The element is processed at build time; its contents are made available to the citation system, figure system, and other parts of the pipeline that look up resources by id or key. The `<data>` element itself produces no rendered output.

Architecturally, `<data>` (with `<library>`) is a **storage host on the language axis**, not a structured-data container: its body is a foreign-format payload (BibTeX, CSL-JSON, …) read by an external parser, not a record of enscribe-native fields. It therefore does **not** expose the kwarg↔child-tag structured-field interface that `<meta>` / `<author>` have, and is **not** registered in `STRUCTURED_ELEMENTS`. Issue #24 asked whether `<data>` should gain such an interface; resolved **no** — a foreign payload has no enscribe fields to lift, and mirroring external schemas would reimplement the parsers `<data>` delegates to. See `DESIGN.md` §"Structured-data-container tags".

This is parallel to how `<note>` produces an inline marker (a number) and the note content gets collected by the placement plugin. With `<data>`, there's no inline marker either — the element is purely a backing store for resources that other elements reference.

The placement convention is back-of-document, because reading shouldn't be interrupted by configuration-style content. But the structural plugin places `<data>` correctly regardless of source position. Authors who put `<data>` at the front are not penalized; the convention is for reading ergonomics, not requirement.

## What goes in `<data>`

Resources that are **referenced by other elements** but don't render inline:

- **Inline bibliography blocks**: `<library format=bibtex>...</library>` to paste BibTeX / CSL-JSON content from a reference manager. (`<bib-entry>` is *not* authored here — it is the generated form citation-js produces into `<bibliography>` from these sources.)
- **Hardcoded image data** (future): base64-encoded image data that figures reference by id.
- **Datasets** (future): tabular data that tables or figures reference.
- **Other resource types** (future): anything that fits the "reference, not display" pattern.

What does **not** go in `<data>`:

| Content | Goes in |
|---------|---------|
| Title, author, abstract | `<meta>` |
| Output format, citation style | `<config>` |
| Stylesheets, themes | `<config>` |
| Body content (sections, figures, paragraphs) | document body |

The split between `<meta>`, `<data>`, and `<config>` keeps responsibilities clear: descriptive metadata, referenced resources, and operational configuration are three distinct concerns.

## How resources are referenced

Resources in `<data>` are referenced from elsewhere by id or key:

- A `<library>` block registers bibliography entries under their bibtex keys (e.g., `goodall2024`). Citations elsewhere (`<cite goodall2024>`) resolve against these entries.
- An `<embedded-image id=elephant1>` (future) registers image data. Figures reference it (`<figure src="ref:elephant1">`).

The pattern is consistent: resources have ids; references look up resources by id; the build system handles resolution.

## Multiple `<data>` blocks

A document can have multiple `<data>` blocks. The library-parsing and resource-collection plugins find all of them regardless of position, parse and register entries, and merge them into a unified resource registry.

This means authors can:

- Keep separate `<data>` blocks for different purposes (one for bibliography, one for image data).
- Add resources progressively as the document grows.
- Combine multiple `<library>` blocks, in different formats (one BibTeX, one CSL-JSON).

Multiple sources combine into one resource registry. The bibliography rendering shows all *cited* entries (whether from `<library>`, `<bib-entry>`, or external file references), regardless of which `<data>` block they came from.

## Placement convention

Front-of-document and back-of-document both work. The convention is:

- **Front placement** is appropriate when the resources are short and authors want them near the metadata they support.
- **Back placement** is appropriate (and recommended) for longer resource blocks that would otherwise interrupt reading.

The structural plugin places `<data>` blocks in `<article-back>` (or `<book-back>`) by default. Authors who want explicit front placement can put `<data>` in `<article-front>`.

## Authoring patterns

**Inline bibliography from BibTeX.**

```
<article | My Paper>
<meta>
  <author | The Author>
</meta>

<section | Introduction>
This paper builds on <cite goodall2024>.

<data>
  <library format=bibtex>
    @article{goodall2024,
      author = {Goodall, Jane},
      title = {The Effect of Elephants on Climate},
      journal = {Nature},
      year = {2024}
    }
  </library>
</data>
```

**Mixed: external file plus inline addition.**

```
<data>
  <library src="refs.bib" />
  <library format=bibtex>
    @article{recent2024,
      author = {Author, Recent},
      title = {New Finding Not Yet in refs.bib},
      year = {2024}
    }
  </library>
</data>
```

The external `refs.bib` provides the main bibliography; the inline `<library>` adds an entry not yet in the file.

## See also

- [`<meta>`](meta.md) — for descriptive document metadata.
- [`<config>`](config.md) — for build and render configuration.
- [`<library>`](library.md) — for opaque bibliography blocks.
- [`<bib-entry>`](bib-entry.md) — for structured bibliography entries.
- [`<bibliography>`](bibliography.md) — the bibliography rendering element.

---
semantic_role: library
html_output:
  element: library
  is_html_native: false
  default_attributes: {}
  notes: |
    Acadamark's <library> is a custom element. It is a data block: opaque
    content processed by a format-specific parser, registers entries with
    the citation system, produces no inline rendered output.
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    format:
      maps_to: data-format
      values: [bibtex, csl-json, ris, endnote-xml, other]
      required: false
      default: auto
      notes: |
        The format of the library content. When omitted, the library-load plugin
        auto-detects the format via citation-js (works reliably for BibTeX and
        CSL-JSON). Authors can set this explicitly when auto-detection might be
        ambiguous (e.g., a CSL-JSON string that also looks valid as plain text).
        The library-load plugin passes this as a hint to citation-js if present.
content:
  type: opaque
  becomes: 'parsed entries (registered in citation system)'
  notes: |
    Content is preserved verbatim and parsed by a format-specific parser.
    No acadamark interpretation of the content. Authors typically copy
    the content directly from a reference manager (Zotero, JabRef, etc.)
    or a text editor.
content_handler: library
jats_counterpart:
  element: 'no direct equivalent (entries lift into ref-list)'
  notes: |
    JATS doesn't have an opaque-source equivalent. Library entries
    are parsed at processing time and merged into the citation registry.
    At JATS export, the registered entries appear in <ref-list> as
    <ref> elements (whether they came from <library>, <bib-entry>, or
    external file). The <library> element itself doesn't appear in
    JATS output.
shorthand_examples:
  - source: |
      <library format=bibtex>
        @article{goodall2024,
          author = {Goodall, Jane},
          title = {The Effect of Elephants on Climate},
          journal = {Nature},
          year = {2024}
        }

        @book{darwin1859,
          author = {Darwin, Charles},
          title = {On the Origin of Species},
          publisher = {John Murray},
          year = {1859}
        }
      </library>
    layer1_html: |
      <library data-format="bibtex">
        @article{goodall2024,
          author = {Goodall, Jane},
          title = {The Effect of Elephants on Climate},
          journal = {Nature},
          year = {2024}
        }

        @book{darwin1859,
          author = {Darwin, Charles},
          title = {On the Origin of Species},
          publisher = {John Murray},
          year = {1859}
        }
      </library>
    notes: |
      A BibTeX library block. The parser reads the entries and registers
      goodall2024 and darwin1859 in the citation registry. Citations
      elsewhere (e.g., <cite goodall2024>) resolve against these entries.
      The library block itself produces no rendered output.
  - source: |
      <library format=csl-json>
        [
          {
            "id": "goodall2024",
            "type": "article-journal",
            "author": [{"family": "Goodall", "given": "Jane"}],
            "title": "The Effect of Elephants on Climate",
            "container-title": "Nature",
            "issued": {"date-parts": [[2024]]}
          }
        ]
      </library>
    layer1_html: |
      <library data-format="csl-json">
        [
          {
            "id": "goodall2024",
            ...
          }
        ]
      </library>
interpreter_strategy: handler
handler_module: ./handlers/library.js
handler_responsibilities:
  - Read the format kwarg.
  - Dispatch to the appropriate format-specific parser (BibTeX, CSL-JSON, RIS, etc.).
  - Parse the opaque content into structured bibliography entries.
  - Register each entry in the citation registry under its id (bibtex key, csl id, etc.).
  - Produce no inline output (the element renders as empty after processing).
related_plugins:
  - name: acadamarkLibraryParsing
    runs_before: acadamarkCitationResolution
    purpose: 'Phase 1 discovery — dispatches to format-specific parsers (BibTeX, CSL-JSON, etc.) and registers entries. See notes/specs/pipeline.md for the full pipeline.'

---

# `<library>`

An opaque block of bibliography content in a specific format (BibTeX, CSL-JSON, RIS, etc.). The library plugin parses the content and registers entries with the citation system. Produces no inline output.

## Semantic intent

`<library>` is a **data block**: content that's part of the document source for processing purposes but doesn't render in the document body. It's a way for authors to paste bibliography entries directly from a reference manager (Zotero, JabRef, Mendeley) without converting them to acadamark's structured form.

The element is parallel to:

- DSL tags like `<csv>` — opaque content processed by an engine, but `<csv>` produces a table whereas `<library>` produces nothing inline.
- `<note>` and `<cite>` — they produce inline markers and contribute to document-wide systems; `<library>` produces no inline marker but contributes to the citation system.

The pattern is: opaque source, format-specific parsing, registry-style integration, no display.

## When to use

Three paths give bibliography entries to the citation system:

| Path | Use when |
|------|----------|
| External file (`<bibliography source="refs.bib">`) | The bibliography is maintained separately, possibly shared across documents. |
| `<library>` | A bibliography block exists in some format and the author wants to paste it inline. |
| `<bib-entry>` | The author wants to write a structured entry in acadamark form. |

`<library>` is most useful for casual authoring or for incremental additions to an externally-maintained bibliography. The author copies a few entries from Zotero or BibTeX, pastes them inline, and the citations work without needing to maintain a separate file.

## Authoring

```
<library format=bibtex>
  @article{goodall2024,
    author = {Goodall, Jane},
    title = {The Effect of Elephants on Climate},
    journal = {Nature},
    year = {2024}
  }
</library>
```

The content between the opening and closing tags is opaque — preserved verbatim, parsed by the format-specific parser. The `format` kwarg determines which parser is used.

## Placement

`<library>` blocks belong in `<data>` by convention:

```
<article | My Paper>
<meta>
  <author | The Author>
</meta>

<section | Body>
The argument is supported by <cite goodall2024>.

<data>
  <library format=bibtex>
    @article{goodall2024,
      author = {Goodall, Jane},
      ...
    }
  </library>
</data>
```

The structural plugin places `<data>` blocks in `<article-back>` (or `<book-back>`). Authors who want explicit placement can put `<data>` (and the contained `<library>`) elsewhere.

## Multiple `<library>` blocks

A document can have multiple `<library>` blocks. The library-parsing plugin finds all of them, parses each according to its format, and merges entries into a unified citation registry.

This means:

- Authors can keep separate library blocks for different sources (one from Zotero, one from a colleague's references).
- Library blocks can use different formats (one in BibTeX, another in CSL-JSON).
- Late additions are easy: add a new library block; the entries are immediately available for citations.

If two entries register under the same id (e.g., both have key `goodall2024`), the later one wins, with a warning.

## Supported formats

The format kwarg can take various values, each requiring a corresponding parser:

| Format value | Parser status |
|--------------|---------------|
| `bibtex` | Required for v1 (universal in academic publishing). |
| `csl-json` | Required for v1 (modern standard, used by Zotero and Pandoc). |
| `ris` | Future; useful but less essential. |
| `endnote-xml` | Future; some users export this from EndNote. |
| `other` | For custom or rare formats; requires a custom parser implementation. |

Adding new formats means writing new parsers, not changing the vocabulary. The format kwarg is open-ended; the resolver dispatches based on the value.

## Content

The content between `<library format=...>` and `</library>` is opaque source in the specified format. Acadamark does not interpret it as prose. Special characters (braces, ampersands, etc.) appear literally.

The content is processed by the format-specific parser. Parsing failures are reported as warnings (the parser identifies the problem entry, the rest are still registered).

## Attributes

`format` is required. Identifies the parser to use.

The element is a data block, so it doesn't have most of the attributes other elements have (no styling kwargs, no positional args). Just `id` and `class` for identification.

## JATS mapping

`<library>` doesn't appear in JATS output. The entries it registers are merged into the JATS `<ref-list>` along with entries from other sources (external file, `<bib-entry>`).

| Acadamark | JATS |
|-----------|------|
| `<library>` element | (not in output) |
| Parsed entries from `<library>` | merged into `<ref-list>` as `<ref>` elements |

The export is mechanical: each entry in the citation registry becomes a `<ref>` in `<ref-list>`, regardless of where the entry originally came from.

## Render-mode lowering

`<library>` doesn't render in the document body. In render mode, the element either disappears entirely or remains as an empty element with `data-format` for tooling that wants to find library blocks.

The bibliography itself renders separately, via the `<bibliography>` element (auto-generated or explicit).

## See also

- [`<cite>`](cite.md) — citations that resolve against library entries.
- [`<bib-entry>`](bib-entry.md) — for structured inline bibliography entries.
- [`<bibliography>`](bibliography.md) — the rendered bibliography.
- [`<data>`](data.md) — the container for `<library>` blocks and other data resources.

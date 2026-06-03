---
semantic_role: library
html_output:
  element: library
  is_html_native: false
  default_attributes: {}
  notes: |
    Enscribe's <library> is a custom element. It is a data block: opaque
    content processed by a format-specific parser, registers entries with
    the citation system, produces no inline rendered output.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  positional:
    - name: format
      values: [bibtex, csl-json, ris, endnote-xml, other]
      notes: |
        The format word — the canonical way to name the payload language
        (`<library bibtex | …>`). `<library>` is a storage host on the
        host/language axis (DESIGN.md §"The two axes"; format-words.md): the
        positional names which parser reads the body. Omitted → citation-js
        auto-detect (today's behavior). The `format=` kwarg below is the
        equivalent attribute form.
  kwargs:
    format:
      maps_to: data-format
      values: [bibtex, csl-json, ris, endnote-xml, other]
      required: false
      default: auto
      notes: |
        Attribute-form equivalent of the format-word positional. When both the
        positional and the kwarg are omitted, the library-load plugin
        auto-detects the format via citation-js (works reliably for BibTeX and
        CSL-JSON). A named format is passed to citation-js as a forceType.
content:
  type: opaque
  becomes: 'parsed entries (registered in citation system)'
  notes: |
    Content is preserved verbatim and parsed by a format-specific parser.
    No enscribe interpretation of the content. Authors typically copy
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
interpreter_strategy: schema
related_plugins:
  - name: enscribeLibraryLoad
    location: packages/enscribe/src/interpreter/plugins/library-load.js
    runs_before: enscribeCiteResolution
    purpose: |
      The actual library processing happens at PLUGIN time, not at handler
      time. `enscribeLibraryLoad` walks `<data>` root siblings, reads each
      contained `<library>` node's opaque content, dispatches to the
      format-specific parser (BibTeX via citation-js, etc.), and registers
      every entry in the citation registry. By the time interpreter
      rendering runs, the library entries are already in the registry; the
      `<library>` element itself produces no inline output (the structural
      pipeline routes `<data>` into `<article-back>` where the empty
      `<library>` element is filtered from the rendered HTML).

      The interpreter_strategy is `schema` (not `handler`) because no
      handler-time work is needed — the upstream plugin has already done
      everything. A handler module entry was previously declared
      (`handler_module: ./handlers/library.js`) but pointed at a file
      that does not exist; the declaration was stale aspirational text
      and was removed by an earlier change. If `<library>`
      ever needs handler-time work in the future (e.g. a render-mode
      that shows library content inline), the entry can be re-elevated
      to handler strategy at that time.

---

# `<library>`

An opaque block of bibliography content in a specific format (BibTeX, CSL-JSON, RIS, etc.). The library plugin parses the content and registers entries with the citation system. Produces no inline output.

## Semantic intent

`<library>` is a **data block**: content that's part of the document source for processing purposes but doesn't render in the document body. It's a way for authors to paste bibliography entries directly from a reference manager (Zotero, JabRef, Mendeley) without converting them to enscribe's structured form.

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
| `<bib-entry>` | The author wants to write a structured entry in enscribe form. |

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

The content between `<library format=...>` and `</library>` is opaque source in the specified format. Enscribe does not interpret it as prose. Special characters (braces, ampersands, etc.) appear literally.

The content is processed by the format-specific parser. Parsing failures are reported as warnings (the parser identifies the problem entry, the rest are still registered).

## Attributes

`format` is required. Identifies the parser to use.

The element is a data block, so it doesn't have most of the attributes other elements have (no styling kwargs, no positional args). Just `id` and `class` for identification.

## JATS mapping

`<library>` doesn't appear in JATS output. The entries it registers are merged into the JATS `<ref-list>` along with entries from other sources (external file, `<bib-entry>`).

| Enscribe | JATS |
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

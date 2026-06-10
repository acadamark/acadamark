---
semantic_role: config
category: structured-data-containers
html_output:
  element: config
  is_html_native: false
  default_attributes: {}
  notes: |
    Enscribe's <config> is a custom element. It does not produce inline
    output; it carries build-time and render-time configuration that the
    pipeline reads to determine how to process the document. The element
    is parsed during a discovery pass before body rendering.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    notes: |
      <config> accepts an allowlisted set of kwargs as an authoring shorthand
      for its structured-children configuration interface. The current
      allowlist (interpreter-side, see
      packages/enscribe/src/interpreter/lib/apparatus-allowlists.js):
        - citation-style          (live; consumed by cite-resolution)
        - number-equations        (live; consumed by numbering)
        - number-figures          (live; consumed by numbering)
        - number-tables           (live; consumed by numbering)
        - number-sections         (live; consumed by numbering; default off for articles, on for books)
        - show-source             (live; consumed by index.js compileToHtml → diagram handlers; default off — reveals authored DSL source in a <details> disclosure, #19)
        - parse-data-tables       (live; consumed by the table-cell-parse plugin; default off — doc-wide default for whether data-format table cells parse as Enscribe inline markup, #21; per-table +parse-text / parse-columns / -parse-text override it)
        - ref-prefix-{prefix}     (live wildcard; consumed by ref-resolution)
        - theme                   (live; consumed by index.js compileToHtml — injects a theme's :root token overrides, Phase 8 Slice 2)
        - display-style           (reserved; future)
        - note-position           (live; consumed by index.js compileToHtml → sidenotes — the #33 margin render mode, 'bottom' default / 'margin')
        - strict-mode             (live; consumed by strict-mode.js #36: 'off' default / 'sigil' / 'canonical' — each names the loosest register still interpreted. 'sigil' turns the markdown register off (canonical + sigils stay); 'canonical' turns markdown AND sigils off, leaving only canonical named tags. Non-'off' rungs flag would-be-shorthand text)
        - bibliography-position   (reserved; future)
        (the reserved `reference-library` was retired: #133 makes external library
        sources the body element `<library src=…>`, never a <config> kwarg)
      Unknown kwargs are dropped at the normalize-to-canonical gate with an
      informative diagnostic. A <meta>-shaped kwarg (title, author, etc.) on
      <config> additionally triggers a "did you mean <meta>?" hint. Kwargs are
      the authoring form for <config>; the structured-children entries in
      `content.shape` below (marked *Future*) are a deferred design sketch, not
      a current authoring spelling. <config> takes no child elements today: the
      retired `<bibliography source=… />` form (#133) is replaced by the body
      element `<library src>` (see library.md / bibliography.md).
content:
  type: structured
  shape:
    - element: output-format
      required: false
      multiple: true
      notes: 'Future: target output formats (html, pdf, jats, presentation, etc.).'
    - element: citation-style
      required: false
      notes: 'Future: citation rendering style (numbered, author-year, footnote, etc.).'
    - element: numbering-style
      required: false
      notes: 'Future: numbering style for figures, equations, sections.'
    - element: note-position
      required: false
      notes: 'Live (#33): document-level note render mode — bottom (default) / margin. (Where notes collect is the per-note placement kwarg + note-scope, not this setting.)'
    - element: stylesheet
      required: false
      multiple: true
      notes: 'Future: stylesheet references for rendering.'
    - element: theme
      required: false
      notes: 'Future: theme reference.'
content_handler: default
jats_counterpart:
  element: 'no direct equivalent'
  notes: |
    JATS doesn't have a single configuration element. Most configuration
    is handled at the publication-system level, not in JATS. Enscribe's
    <config> is decomposed at JATS export — relevant settings affect how
    the export is generated; they don't appear in JATS output.
shorthand_examples:
  - source: '<config citation-style=author-year number-sections=true />'
    layer1_html: '<config></config>'
    notes: |
      The authoring form for <config> is kwargs. Settings are read at the
      discovery pass into the configuration registry; the element itself
      produces no body output (it renders as an empty <config>).
  - source: '<config number-figures=true number-tables=true show-source=true />'
    layer1_html: '<config></config>'
    notes: |
      More operational options, all from the live kwarg allowlist
      (citation-style, number-sections, number-figures, number-tables,
      number-equations, show-source, parse-data-tables, ref-prefix-*).
interpreter_strategy: schema
related_plugins:
  - name: enscribeConfigDiscovery
    runs_before: enscribeInterpreter
    purpose: 'Phase 1 discovery — extracts <config> values into the configuration registry. See notes/specs/pipeline.md for the full pipeline.'

---

# `<config>`

Build-time and render-time configuration for the document. Holds settings that affect how the document is processed and rendered, distinct from descriptive content (`<meta>`) or referenced resources (`<data>`).

## Semantic intent

`<config>` carries operational settings that the build system needs to know but that aren't part of the document's descriptive metadata or content. The element is processed at discovery time (before body rendering) so that configuration is available throughout subsequent processing.

This is parallel to how RMarkdown and Quarto put YAML frontmatter at the top of a document containing both descriptive metadata (`title:`, `author:`) and operational configuration (`output:`, `bibliography:`). Enscribe splits these into separate elements (`<meta>` for descriptive, `<config>` for operational) to keep responsibilities clear.

The element is processed during a discovery pass before body rendering. This means configuration declared anywhere in the document is available everywhere.

## What goes in `<config>`

Operational settings that affect processing or rendering:

- **Output formats**: which targets the build produces (HTML, PDF, JATS, presentation).
- **Citation style**: how citations are rendered (numbered, author-year, footnote).
- **Numbering style**: how figures, equations, sections are numbered.
- **Note position**: the document-level note render mode (`bottom` / `margin`).
- **Bibliography source**: external bibliography file reference.
- **Stylesheets**: CSS or theme references.
- **Theme**: high-level theme selection.
- **Other build/render settings** as needed.

What does **not** go in `<config>`:

| Content | Goes in |
|---------|---------|
| Title, author, abstract | `<meta>` |
| Bibliography content (entries) | `<data>` |
| Embedded image data | `<data>` |
| Document body | document body |

The split between `<meta>`, `<data>`, and `<config>` keeps responsibilities clear.

## Configuration vs. kwargs

Many configuration settings can also be expressed as kwargs on `<article>` or `<book>` (e.g., `note-position`, `numbering-style`). Both work. The choice is about authoring ergonomics:

- **Kwargs** are convenient for one or two settings, especially when they're conceptually tied to the container ("this article uses arabic numbering").
- **`<config>` block** is cleaner when there are many settings or when the configuration applies to the document as a whole rather than to a specific container.

For the common case of a paper with simple settings, kwargs on `<article>` are sufficient:

```
<article note-position=margin numbering-style=arabic | My Paper>
```

For documents with richer configuration, a `<config>` element gathers the settings as kwargs:

```
<config citation-style=author-year number-sections=true number-figures=true number-tables=true show-source=true />
```

## Placement convention

Front-of-document and back-of-document both work. The convention is **back placement** because configuration is operational, not descriptive — it doesn't aid reading flow.

The structural plugin places `<config>` in `<article-back>` (or `<book-back>`) by default. Authors who want explicit front placement can put `<config>` in `<article-front>`.

## Discovery pass

Configuration is read during a discovery pass before body rendering. The pipeline structure is:

1. **Discovery**: find `<meta>`, `<data>`, `<config>` blocks; extract their content; populate registries.
2. **Pre-rendering**: structural plugins place content in regions; numbering plugins assign numbers; placement plugins position notes and bibliography.
3. **Rendering**: produce final output (HTML, JATS, etc.) using configured settings.

Configuration declared anywhere — front, back, or in the middle of the body — is available to all subsequent processing. The "back placement" convention is for reading ergonomics, not a technical requirement.

## Multiple `<config>` blocks

A document can have multiple `<config>` blocks. They are merged. Later declarations override earlier ones for the same setting. This allows:

- Default configuration at the document level, with overrides for specific sections.
- Configuration spread across the document for organizational reasons.
- Modular configuration when content is composed from multiple sources.

For most documents, a single `<config>` block at the back is the cleanest pattern.

## Authoring patterns

**Minimal config (most papers).**

```
<config citation-style=author-year number-sections=true />

<data>
<library src="refs.bib" />
</data>
```

Citation style and numbering ride as kwargs on `<config>`; the bibliography's reference data comes from a body `<library src>` block (#133), not from `<config>`.

**Richer config (documents with several settings).**

```
<config
  citation-style=numbered
  number-sections=true
  number-figures=true
  number-tables=true
  number-equations=true
  show-source=true
  parse-data-tables=true />
```

**Per-document override.**

```
<config citation-style=author-year />

<section | Introduction>
Body content with citations.

<config citation-style=numbered />
```

A second `<config>` changes the citation style for citations declared after it. (This is a contrived example; most documents have one config and don't need overrides.)

## Design context

This element's role is governed by the `DESIGN.md` direction
**"`<meta>` is for metadata; `<config>` is for options"**
(§"Design directions (discovered through implementation)"). The
two are distinct concerns and shouldn't blur: `<meta>` holds
metadata that appears in or shapes the rendered document;
`<config>` holds processing options that never render. Each should
validate the attributes it accepts rather than silently absorbing
the other's. The misuse-feedback hint between `<meta>` and
`<config>` (per the apparatus-tag reconciliation, `578d6f0`) is
the runtime enforcement.

## See also

- [`<meta>`](meta.md) — for descriptive document metadata.
- [`<data>`](data.md) — for referenced resources.
- [`<bibliography>`](bibliography.md) — the rendered bibliography element (places the formatted reference list); external reference sources load via [`<library src=…>`](library.md), not a `<config>` attribute.
- [`<article>`](article.md), [`<book>`](book.md) — containers whose kwargs handle simple per-document settings.

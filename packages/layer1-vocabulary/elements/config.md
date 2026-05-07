---
semantic_role: config
html_output:
  element: config
  is_html_native: false
  default_attributes: {}
  notes: |
    Acadamark's <config> is a custom element. It does not produce inline
    output; it carries build-time and render-time configuration that the
    pipeline reads to determine how to process the document. The element
    is parsed during a discovery pass before body rendering.
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
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
      notes: 'Future: where notes render (foot, end, side, chapter-end).'
    - element: stylesheet
      required: false
      multiple: true
      notes: 'Future: stylesheet references for rendering.'
    - element: theme
      required: false
      notes: 'Future: theme reference.'
    - element: bibliography
      required: false
      notes: |
        Bibliography source reference (e.g., <bibliography source="refs.bib">).
        Configuration about where the bibliography file lives.
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: 'no direct equivalent'
  notes: |
    JATS doesn't have a single configuration element. Most configuration
    is handled at the publication-system level, not in JATS. Acadamark's
    <config> is decomposed at JATS export — relevant settings affect how
    the export is generated; they don't appear in JATS output.
shorthand_examples:
  - source: |
      <config>
        <bibliography source="refs.bib">
        <citation-style | author-year>
      </config>
    layer1_html: |
      <config>
        <bibliography source="refs.bib"></bibliography>
        <citation-style>author-year</citation-style>
      </config>
    notes: |
      Common configuration: bibliography source file and citation style.
  - source: |
      <config>
        <output-format | html>
        <output-format | jats>
        <stylesheet | scholarly-default.css>
        <numbering-style | arabic>
      </config>
    layer1_html: |
      <config>
        <output-format>html</output-format>
        <output-format>jats</output-format>
        <stylesheet>scholarly-default.css</stylesheet>
        <numbering-style>arabic</numbering-style>
      </config>
interpreter_strategy: schema
related_plugins:
  - name: acadamarkConfigDiscovery
    runs_before: acadamarkTagInterpret
    purpose: |
      Discovers <config> elements throughout the document, extracts
      configuration values, makes them available to subsequent plugins
      and to the rendering pipeline. Runs before any rendering or
      transformation work that depends on configuration.
---

# `<config>`

Build-time and render-time configuration for the document. Holds settings that affect how the document is processed and rendered, distinct from descriptive content (`<meta>`) or referenced resources (`<data>`).

## Semantic intent

`<config>` carries operational settings that the build system needs to know but that aren't part of the document's descriptive metadata or content. The element is processed at discovery time (before body rendering) so that configuration is available throughout subsequent processing.

This is parallel to how RMarkdown and Quarto put YAML frontmatter at the top of a document containing both descriptive metadata (`title:`, `author:`) and operational configuration (`output:`, `bibliography:`). Acadamark splits these into separate elements (`<meta>` for descriptive, `<config>` for operational) to keep responsibilities clear.

The element is processed during a discovery pass before body rendering. This means configuration declared anywhere in the document is available everywhere.

## What goes in `<config>`

Operational settings that affect processing or rendering:

- **Output formats**: which targets the build produces (HTML, PDF, JATS, presentation).
- **Citation style**: how citations are rendered (numbered, author-year, footnote).
- **Numbering style**: how figures, equations, sections are numbered.
- **Note position**: where notes render (foot, end, side, chapter-end).
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
<article note-position=end numbering-style=arabic | My Paper>
```

For documents with richer configuration, a `<config>` block keeps things organized:

```
<config>
  <output-format | html>
  <output-format | jats>
  <citation-style | author-year>
  <numbering-style | arabic>
  <note-position | end>
  <stylesheet | scholarly-default.css>
  <bibliography source="refs.bib">
</config>
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
<article note-position=end numbering-style=arabic | My Paper>

<config>
  <bibliography source="refs.bib">
  <citation-style | author-year>
</config>
```

The container kwargs handle simple settings; `<config>` handles bibliography source and citation style.

**Richer config (documents with multiple outputs and styling).**

```
<config>
  <output-format | html>
  <output-format | pdf>
  <output-format | jats>
  <citation-style | numbered>
  <numbering-style | arabic>
  <note-position | foot>
  <stylesheet | journal-template.css>
  <theme | classical>
  <bibliography source="refs.bib">
</config>
```

**Per-document override.**

```
<config>
  <citation-style | author-year>
</config>

<article-body>
  <section | Introduction>
  Body content with citations.
</article-body>

<config>
  <citation-style | numbered>
</config>
```

A second `<config>` block changes the citation style for citations declared after it. (This is a contrived example; most documents have one config and don't need overrides.)

## See also

- [`<meta>`](meta.md) — for descriptive document metadata.
- [`<data>`](data.md) — for referenced resources.
- [`<bibliography>`](bibliography.md) — bibliography element (when `<bibliography>` carries a source attribute, it's typically inside `<config>`).
- [`<article>`](article.md), [`<book>`](book.md) — containers whose kwargs handle simple per-document settings.

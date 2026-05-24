# Authoring features survey

This document captures authoring features considered for acadamark but deferred. Each section describes a feature, its use case, the proposed mechanism, and the reason for deferral. The point is to ensure that when these features become priorities, the design thinking isn't lost.

Several entries in this document are inspired by MyST, Quarto, Typst, or LaTeX. acadamark's coverage of scholarly authoring overlaps substantially with these systems; this document is the record of "we thought about this and chose to defer it."

## Inline elements

### `<abbr>` — abbreviations

**Use case.** Inline abbreviations with hover-revealed full text. Common in technical writing where acronyms need expansion on first use or whenever a reader might be unfamiliar.

**Mechanism.** HTML-native `<abbr>` element. Acadamark vocabulary entry would be a small declarative passthrough similar to other inline HTML-native elements (em, strong, etc.).

```
<abbr title="Markedly Structured Text" | MyST>
```

Renders as `<abbr title="Markedly Structured Text">MyST</abbr>`. Browsers display the abbreviated text with a tooltip showing the title.

**Why deferred.** Not in the initial slice 1 inline element set. Easy to add in a future minor vocabulary slice — probably 30-50 lines for the vocabulary entry, no handler required (schema strategy with simple title-kwarg mapping).

### `<kbd>` — keyboard input

**Use case.** Indicating keyboard keys or shortcuts in technical documentation. "Press <kbd>Ctrl+C</kbd> to copy."

**Mechanism.** HTML-native `<kbd>` element. Schema-strategy vocabulary entry.

**Why deferred.** Not in scholarly-document core. Useful for documentation but not for the project's primary use case.

### `<var>`, `<samp>`, `<output>` — programming-related inline elements

**Use case.** Variable names, sample output, computed output in technical writing.

**Mechanism.** HTML-native elements with declarative passthroughs.

**Why deferred.** Same as `<kbd>` — niche use cases that don't drive core acadamark adoption.

## Block elements

### `<details>` / `<summary>` — collapsible sections

**Use case.** Supplementary information that readers can choose to expand. Useful for FAQ-style content, optional deep-dives, derivation steps, supplementary calculations.

**Mechanism.** HTML-native `<details>` and `<summary>` elements. Two vocabulary entries needed:

- `<details>` accepts a `<summary>` child plus block content. Schema strategy.
- `<summary>` accepts inline content. Schema strategy.

Authoring shorthand:

```
<details | Expandable section title>
The expandable content goes here. Can be multi-paragraph,
contain figures, lists, etc.
</details>
```

The pipe content becomes the `<summary>`; the body becomes the `<details>` content.

**Why deferred.** Useful but not essential for slice 1. Adding it is a small future vocabulary slice — perhaps 60-80 lines per entry. The HTML-native treatment makes implementation straightforward.

### Admonitions / callouts beyond `<aside>`

**Use case.** Specific callout types like "tip", "warning", "danger", "note", "important", "caution". Currently acadamark's `<aside type=...>` covers this.

**Mechanism.** Already supported via `<aside type=tip>`, `<aside type=warning>`, etc. The `type` kwarg discriminates.

**Why not deferred.** Already covered. Worth noting that the current model is open-ended (any string can be a type); specific JATS mappings exist for "note" and "callout" while other types map to the generic content-type.

### Dropdowns, cards, tabs, grids

**Use case.** Visual UI elements for web rendering.

**Mechanism.** Web-UI-style elements with specific render-mode behaviors.

**Why deferred.** Out of scope for scholarly-document core. acadamark targets publication-quality documents; web-UI authoring is a different concern. If acadamark grows toward web-application authoring, these become relevant.

## Metadata enrichments

### Rich author metadata

**Current state.** `<author>` accepts the name as content. Sub-fields (affiliation, ORCID, email) are inlined in author.md as "future direction."

**Use case.** Scholarly publications require structured author information: affiliations, ORCID identifiers, email addresses, corresponding-author flags, equal-contribution flags.

**Mechanism.** Sub-elements within `<author>`:

```
<author>
  <name | Jane Goodall>
  <affiliation | Anthropic>
  <orcid | 0000-0000-0000-0000>
  <email | jane@example.org>
  <corresponding>
</author>
```

This is structurally similar to `<bib-entry>` — `<author>` becomes a structured container with named sub-fields rather than a simple text element.

**Why deferred.** The current simple form covers basic authoring. Rich metadata becomes important when targeting specific publication venues (journals with strict author-metadata requirements) or when JATS export needs full author structure. Worth a future minor slice when this need surfaces.

### `<license>` element / metadata

**Use case.** Declaring the document's license (CC-BY-4.0, MIT, etc.). MyST has `license` in frontmatter.

**Mechanism.** A `<license>` element inside `<meta>` accepting an SPDX code, or a `license` kwarg on `<meta>` itself.

```
<meta>
  <license | CC-BY-4.0>
</meta>
```

**Why deferred.** Useful for publication but not blocking slice 1. Would add to the `<meta>` content shape's allowed children. Small addition.

### `<keywords>` element

**Use case.** Document keywords for indexing and search.

**Mechanism.** Already specified in SPEC.md as a deferred element. Probably accepts a comma-separated list or multiple `<keyword>` sub-elements.

**Why deferred.** Already marked as deferred in SPEC.md.

### DOI as identifier

**Use case.** Documents have DOIs for citation.

**Mechanism.** A `<doi>` element in `<meta>`, or a `doi` kwarg.

**Why deferred.** Not blocking slice 1. Trivial to add when needed.

### `short-title` distinction

**Use case.** A document has a full title for display and a short title for running headers, navigation, and tab/window titles. MyST has `short_title` in frontmatter.

**Mechanism.** A `short` kwarg on `<title>`:

```
<title short="Quick Title" | The Full Long Title That's Too Long for a Header>
```

Or a separate `<short-title>` element.

**Why deferred.** Becomes relevant when render-mode produces navigation chrome or headers. Not slice 1.

### `subject` classifier

**Use case.** Document categorization (Tutorial, Article, Review). MyST has `subject` in frontmatter.

**Mechanism.** A `subject` kwarg on `<meta>` or a `<subject>` sub-element.

**Why deferred.** Useful but optional metadata. Adds to the open-ended set of metadata fields.

### `thumbnail` for social sharing

**Use case.** Documents shared on social media or in listings benefit from a representative image.

**Mechanism.** A `thumbnail` kwarg on `<meta>` or a `<thumbnail>` element pointing at an image file.

**Why deferred.** Render-mode concern (generates `<meta>` tags in HTML `<head>` or Open Graph metadata). Not slice 1.

## Reference shortcuts

### Compact external reference syntax

**Use case.** MyST supports `wiki:book` to link to Wikipedia's "Book" article, `doi:10.5281/zenodo.6476040` to link to a DOI, etc. Compact authoring without typing full URLs.

**Mechanism.** Parser-level shortcuts that expand `wiki:foo` to `<a href="https://en.wikipedia.org/wiki/foo">`. Similar for `doi:`, `github:`, `arxiv:`, etc.

**Why deferred.** A parser feature, not a vocabulary feature. Worth adding to the parser's recognition rules when authoring ergonomics is the focus. Implementation is straightforward.

### Cross-reference with autotext

**Use case.** Writing `<ref fig-1>` produces "Figure 1" automatically. Currently supported. MyST extends this with "ref" roles that produce different forms ("ref:fig" produces "fig. 1", "ref:eq" produces "(1)", etc.).

**Mechanism.** Already supported via the `format` kwarg on `<ref>`. The format kwarg can produce number-only, name-only, full-with-title, etc.

**Why not deferred.** Already covered.

## Rendering features

### Rich link previews

**Use case.** Internal links between documents/sections show preview information on hover. External links (Wikipedia, DOI, GitHub) show preview metadata.

**Mechanism.** Hover-preview infrastructure is documented in `notes/interpreter.md` §10.2 (now implemented for notes / refs / citations); the original deferred-design exploration is preserved at `archive/hover-previews-deferred-2026-05.md`. External link previews would require fetching target metadata at build time and embedding it.

**Why deferred.** External link metadata fetching is the open part; the hover-preview rendering substrate exists.

### Just-in-time math

**Use case.** Math hovering / inline definition tooltips for variables. Defining a symbol once and having its definition pop up wherever it's used.

**Mechanism.** A reference system for symbols, similar to citations. `\alpha` could be a recognized symbol with a defined meaning shown on hover.

**Why deferred.** Substantial design work. Becomes relevant after math support exists. Not slice 1 or 2.

## Project-level features

### Multi-file authoring

See `notes/multi-file-authoring.md`.

### Multi-column display

See `notes/multi-column-display.md`.

### Cross-document reference resolution

**Use case.** A multi-file project has references that resolve across files.

**Mechanism.** Covered in multi-file authoring.

**Why deferred.** Part of multi-file support.

## Interactive features

### Executable code blocks

**Use case.** Code that runs and shows output, Jupyter-style integration.

**Mechanism.** Documented in the project's broader plans. Substantial new infrastructure (kernel, output capture, etc.).

**Why deferred.** Major feature beyond core acadamark.

### Interactive widgets

**Use case.** Sliders, charts that respond to input, etc.

**Mechanism.** Web-component-based widgets embedded in documents.

**Why deferred.** Out of scope for scholarly-document core.

## Summary

acadamark's current scope covers:
- Document structure (article, sections, sub-sections, paragraphs, asides, blockquotes, figures, lists, tables).
- Inline content (em, strong, code, citations, cross-references, notes, basic styling elements).
- Metadata (`<meta>` with title, author, date, abstract).
- Bibliography (multiple sources, citations, formatting).
- Math (deferred to a future slice but architecturally accommodated).
- DSL engines (deferred but architecturally accommodated).

The features in this document are mostly natural extensions to that core. Each can be added without requiring fundamental redesign — the vocabulary and plugin pipeline accommodate them.

The deferral is about prioritization, not feasibility. As slice 1 lands and subsequent slices address citations, math, and other major features, this document gets revisited to see which deferred features have become priorities.

## Related references

- `notes/multi-file-authoring.md` — multi-file projects.
- `notes/multi-column-display.md` — multi-column rendering.
- `archive/hover-previews-deferred-2026-05.md` — hover-preview rendering for references (archived; the rendering substrate shipped, see `notes/interpreter.md` §10.2).
- `archive/inline-tex-shortcuts-spec-2026-05.md` — inline TeX shortcuts for math (archived; the feature shipped as G1).
- Slide/presentation elements — design discussion item in `notes/acadamark-backlog-roadmap.md` (formerly DF-6); original placeholder at `archive/slide-element-deferred-2026-05.md`.
- `packages/layer1-vocabulary/SPEC.md` — what's currently in vocabulary.
- MyST documentation: https://mystmd.org/
- Quarto documentation: https://quarto.org/
- Typst documentation: https://typst.app/

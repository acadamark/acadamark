---
semantic_role: bibliography
html_output:
  element: bibliography
  is_html_native: false
  default_attributes: {}
  notes: |
    Acadamark's <bibliography> is the rendered bibliography container.
    Distinct from JATS's <ref-list>; the elements correspond but the names differ.
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    source:
      maps_to: data-bibliography-source
      notes: |
        URL or path to an external bibliography file (BibTeX, CSL-JSON, etc.).
        When present, the build system reads the file to populate the citation
        registry.
    style:
      maps_to: data-bibliography-style
      values: [author-year, numbered, footnote, custom]
      notes: |
        How the bibliography is rendered. Typically inherits from the
        document-level citation-style; this kwarg overrides for the bibliography
        rendering specifically.
    sort:
      maps_to: data-bibliography-sort
      values: [alpha, citation-order, year, none]
      default: alpha
      notes: |
        How bibliography entries are sorted. "alpha" is alphabetical by author
        surname (default for author-year styles); "citation-order" is the
        order in which entries are first cited (default for numbered styles).
    type:
      maps_to: data-bibliography-type
      values: [cited-only, full, hybrid]
      default: cited-only
      notes: |
        Which entries appear: "cited-only" includes only entries cited in
        the document; "full" includes all registered entries; "hybrid"
        includes cited entries with a separate "Further Reading" section.
content:
  type: structured
  shape:
    - element: bib-entry
      required: false
      multiple: true
      notes: |
        When the bibliography is rendered (auto-generated), entries appear
        as children. Authors don't typically write these directly — the
        bibliography assembly plugin populates the element.
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: ref-list
  notes: |
    JATS uses <ref-list> as the bibliography container, with <ref>
    children for each entry. Direct mapping.
shorthand_examples:
  - source: |
      <config>
        <bibliography source="refs.bib">
      </config>
    layer1_html: |
      <config>
        <bibliography data-bibliography-source="refs.bib"></bibliography>
      </config>
    notes: |
      Bibliography source declaration in <config>. The source file is
      read at build time; entries are registered with the citation
      system. The bibliography itself renders elsewhere (auto-placed
      in <article-back> by default).
  - source: |
      <article | My Paper>
      <meta>
        <author | The Author>
      </meta>

      <section | Body>
      Cited reference <cite goodall2024>.

      <data>
        <library format=bibtex>
          @article{goodall2024, ... }
        </library>
      </data>
    layer1_html: |
      <article>
        <article-front>
          <article-title>My Paper</article-title>
          <author>The Author</author>
        </article-front>
        <article-body>
          <section>
            <section-title>Body</section-title>
            <p>Cited reference <cite data-cite-keys="goodall2024">(Goodall 2024)</cite>.</p>
          </section>
        </article-body>
        <article-back>
          <data>
            <library data-format="bibtex">...</library>
          </data>
          <bibliography>
            <bib-entry id="goodall2024" data-bib-type="article">
              <author>Goodall, Jane</author>
              <year>2024</year>
              <title>The Effect of Elephants on Climate</title>
              ...
            </bib-entry>
          </bibliography>
        </article-back>
      </article>
    notes: |
      The <bibliography> element is auto-generated and placed in
      <article-back>. The bibliography assembly plugin collects cited
      entries from all sources (library, bib-entry, external file)
      and renders them in the bibliography.
  - source: |
      <bibliography type=full sort=alpha>
        <!-- explicit author placement; entries auto-populated -->
      </bibliography>
    layer1_html: |
      <bibliography data-bibliography-type="full" data-bibliography-sort="alpha">
        ...
      </bibliography>
    notes: |
      Explicit bibliography placement with full=all entries (not just cited).
      Useful for "selected bibliography" or "further reading" sections.
interpreter_strategy: schema
generated_by:
  - plugin: acadamarkBibliographyAssembly
    when: |
      The document has citations or bibliography entries. The plugin
      collects all cited entries from the citation registry and renders
      them as children of <bibliography>. Auto-placed in article-back
      or book-back unless explicitly written by the author.
related_plugins:
  - name: acadamarkBibliographyAssembly
    runs_after: 'acadamarkCitationResolution'
    purpose: |
      Reads the citation registry, identifies entries that were cited,
      sorts them according to the bibliography style and sort kwarg,
      formats each entry, places them as children of <bibliography>.
      Generates the <bibliography> element if not explicitly authored.
---

# `<bibliography>`

The rendered bibliography section. Contains formatted bibliography entries (typically from cited sources). Auto-generated by the bibliography assembly plugin or written explicitly by the author for placement control.

## Semantic intent

`<bibliography>` represents the rendered bibliography in the document — the list of entries that appears at the back of an article or book showing cited works. The element is generated by the bibliography assembly plugin from the citation registry, but authors can write `<bibliography>` explicitly to control where it appears.

This is parallel to `<note-list>`: both are containers populated by collection plugins. Authors don't typically write the children directly; the plugins do.

The element has dual roles:

1. **As source declaration** (`<bibliography source="refs.bib">`): used in `<config>` to point at an external bibliography file. The element is empty; the build system reads the source file and uses it to populate the citation registry.

2. **As rendered output**: contains `<bib-entry>` children showing the formatted bibliography. Auto-generated by the assembly plugin or written explicitly for placement.

These two uses look similar (both use the `<bibliography>` element) but serve different purposes. The structural plugin distinguishes them based on whether the element has a `source` kwarg.

## Authoring patterns

**Most common: external file, auto-rendered.**

```
<config>
  <bibliography source="refs.bib">
</config>

<section | Body>
Cited reference <cite goodall2024>.
```

The bibliography file is declared in `<config>`. Cited entries get rendered in an auto-generated `<bibliography>` placed in `<article-back>`. The author doesn't write any explicit bibliography element for rendering.

**Inline library, auto-rendered.**

```
<section | Body>
Cited reference <cite goodall2024>.

<data>
  <library format=bibtex>
    @article{goodall2024, ... }
  </library>
</data>
```

Same pattern as above but with library blocks instead of an external file. The bibliography auto-renders in `<article-back>`.

**Explicit placement of rendered bibliography.**

```
<section | Body>
Cited reference <cite goodall2024>.

<config>
  <bibliography source="refs.bib">
</config>

<section | Acknowledgments>
Thanks to colleagues.

<bibliography>
  <!-- The author writes <bibliography> here. The assembly plugin
       fills it with cited entries instead of generating one elsewhere. -->
</bibliography>

<section | About the Author>
Author info.
```

The author wants the bibliography between Acknowledgments and About the Author rather than at the end. Writing an empty `<bibliography>` at that location signals where to place the rendered output.

**Selected bibliography (full, not just cited).**

```
<bibliography type=full sort=alpha>
  <!-- All entries from the registry, alphabetically sorted -->
</bibliography>
```

Useful for "selected bibliography" or "further reading" sections that include uncited works. The `type=full` kwarg includes all registered entries.

## Source vs. rendering

The two roles of `<bibliography>` are distinguished by the `source` kwarg:

- **`<bibliography source="refs.bib">`** — source declaration. The element is configuration; it goes in `<config>`. Empty.
- **`<bibliography>` (no source)** — rendering location. The element is output; it goes wherever the bibliography should appear. Populated by the assembly plugin.

A document can have at most one rendering `<bibliography>` (with no source) and at most one source `<bibliography>` (with `source` kwarg) per logical section. Multiple of either kind would create ambiguity.

## Auto-placement

If no explicit `<bibliography>` is written for rendering, the assembly plugin places one automatically. The default location:

- For articles: at the end of `<article-back>`, after any other back-matter elements.
- For books: at the end of `<book-back>`.

Authors who want different placement write an explicit empty `<bibliography>` at the desired location.

## Sorting and filtering

`sort` controls how entries are ordered:

- `alpha` — alphabetical by author surname (default for author-year styles).
- `citation-order` — order in which entries are first cited (default for numbered styles).
- `year` — by publication year (chronological).
- `none` — preserve registration order.

`type` controls which entries appear:

- `cited-only` (default) — only entries cited in the document. Most common.
- `full` — all registered entries, even uncited.
- `hybrid` — cited entries plus a separate "Further Reading" sub-section.

## Style and rendering

The bibliography's rendering style typically inherits from the document-level citation style:

- `author-year` document style → bibliography in author-year format (alphabetical, author-year prefix).
- `numbered` document style → bibliography in numbered format (citation-order, [1], [2]...).
- `footnote` document style → bibliography may not appear separately (footnotes are at page bottoms).

The `style` kwarg on `<bibliography>` overrides for the bibliography rendering specifically. Useful when the citation style and bibliography style should differ.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<bibliography>` | `<ref-list>` |
| `<bib-entry>` (children of `<bibliography>`) | `<ref>` (children of `<ref-list>`) |
| `source` kwarg | (handled at processing; not in JATS output) |
| `sort`, `type`, `style` kwargs | preserved as data attributes |

The mapping is direct.

## Render-mode lowering

In render mode, `<bibliography>` lowers to `<section class="bibliography">` (or `<section role="doc-bibliography">` for accessibility) with a heading "References" or "Bibliography" depending on the document type and style.

The children (`<bib-entry>` elements) lower to formatted bibliography entries — typically `<li>` items in an implicit list, with the entry text formatted according to the style.

## See also

- [`<cite>`](cite.md) — citations that resolve against bibliography entries.
- [`<library>`](library.md) — opaque-format bibliography blocks.
- [`<bib-entry>`](bib-entry.md) — structured bibliography entries.
- [`<config>`](config.md) — where source-bibliography declarations belong.
- [`<data>`](data.md) — where inline library blocks and bib-entries belong.

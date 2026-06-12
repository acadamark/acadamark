# Master document

## Purpose

A single enscribe-syntax file that defines an entire work — article, book, or website — and replaces a separate config file. It is the project's entry point: it declares metadata, lays out the structure (inline or by reference to child `.emd` files), holds shared data (libraries and embedded assets), and sets processing options. There is no separate project-config format. The master document *is* the project.

## Shape and block order

Every master document has the same four-part shape, in a fixed order:

```
<meta …>            # required, top — rendered identity
… structure …       # the spine of the work
<data> … </data>    # shared registry: libraries + assets
<config …>          # processing options, never rendered
```

`<meta>` carries identity that renders; `<config>` carries options that never render (the existing meta/config boundary). `<data>` and `<config>` are forced to the bottom so the structural spine stays readable at the top.

## `<meta>`

Whitespace-separated keyword arguments (no commas):

```
<meta
   type="book"
   author="Ariel Balter"
   date="2026-09-06"
>
```

`type` is load-bearing: it selects the assembler, the allowed structural vocabulary, and the valid output targets.

## Structure

The structural vocabulary is type-specific and does **not** mix — matching LaTeX (article class = sections, no chapters; book/report = chapters + parts), Quarto, and JATS/BITS (`<article>`+`<sec>` vs `<book>`+book-parts):

| type | structural vocabulary |
|---|---|
| article | `<toc>`, `<section>` (+ subsections), `<appendix>` |
| book | `<dedication>`, `<preface>`, `<toc>`, `<chapter>`, book parts, `<appendix>`, `<endnotes>`; front/main/back matter |
| website | `<header>` (`<icon>`, `<title>`, `<nav>` → `<item>`/`<dropdown>`), `<footer>`, sidebar, search, page navigation |

### Structure entries

A structural element either references a child file or is authored inline:

- `<section src="section_1.emd">` — content comes from the child file.
- `<section src="section_1.emd" | Title Override>` — the pipe overrides the child file's title.
- `<section | Inline Title>` + following body — authored inline; an open marker, peer-closed by the next structural element (same model as lists and sections).

The same `src` / pipe-title forms apply to every structural element the document's `type` allows — in a book, `<chapter src="chapter_1.emd">`, `<preface src="preface.emd">`, `<appendix src="appendix.emd" | Notation>`, … assemble exactly as `<section src>` does in an article. The assembler is document-class-agnostic: it stitches the resolved children into one flat tree and the pipeline structures that tree as an `<article>` or a `<book>` (front/body/back) according to `<meta type>`. (A child file's own `<meta>` supplies only its fallback title; per-child author/date in that `<meta>` is not assembled — author a book-part's author as a loose `<author>` in the child body.)

Title precedence: an inline pipe title wins over the child file's title. If neither is present, the title renders as "Title Missing" (always-render).

`src` paths are relative to the master file. `src="chapter_1/chapter_1.emd"` means the directory `chapter_1/` sits beside the master document.

### Placement markers

`<toc>`, `<endnotes>`, and `<bibliography>` are placement markers: they render their (generated) content where you put them. `<toc auto floating depth="2">` builds the table of contents from the structure at that position — `auto` derives entries from the structure; `floating`/`depth` are display flags.

## Notes and endnotes

Notes auto-collect; the collection is generated, not authored (#129). `<endnotes>` is the author's *placement* marker for the collected block, exactly parallel to `<bibliography>` — put it where the notes should render. Absent it, notes default to the end of the document. A `<config>` option selects footnote-vs-endnote and location (page bottom / section / document / margin), following Quarto's `reference-location`.

## `<data>` — the shared registry

`<data>` is a keyed registry of libraries and assets. Everything in it has an id; the body references by id, never by path.

```
<data>
   <library src="references.bib">
   <fig id="fig:scatter" png>{base64}</fig>
</data>
```

An asset may be embedded or external — `<fig id="fig:scatter" png>{base64}</fig>` or `<fig src="data/scatter.png" id="fig:scatter">` — and the body references it the same way: `<fig ref="fig:scatter">`. Embedded-vs-external is only about where the bytes live. `<library>` is the citation half of the same idea: load sources into a registry, reference by `@key`.

## Citations and bibliographies

All `<library>` sources — the master's and any per-chapter ones — merge into a **single citation registry**, so any chapter can cite any reference and cross-references resolve project-wide.

Bibliography *display* can be per-chapter: a `<bibliography>` at a chapter's end lists the references that chapter cites (bookdown's `split_bib` behavior), drawn from the merged registry; a `<bibliography>` at book level lists everything. A chapter's own `<library>` is colocation of its sources, not an isolated registry — so a chapter citing a master-library reference still renders.

## Cross-references and links

Two deliberately distinct mechanisms:

- **Cross-references are page-implicit.** `<ref #fig:elephant>` resolves to wherever the target lives across the project, with project numbering ("Figure 3.2") — matching enscribe's existing colon-id resolution and Quarto's `@`-reference behavior. The author never names the page, so references survive a page being renamed or moved. This requires ids to be unique project-wide.
- **Raw links are page-explicit.** The `#/page-title/anchor` form is the escape hatch for arbitrary links, parallel to Quarto's `[text](page#anchor)`.

## `<config>`

Whitespace-separated keyword arguments; never renders. Holds theme, layout, toc-position, chapter-numbering, reference-location, and similar processing options.

## Outputs

Output targets are type-dependent:

- article, book → HTML render + JATS (article) / BITS (book) export.
- website → HTML render only; no JATS/BITS (a site isn't a scholarly document).

## The assembler

One project-wide pass resolves everything that spans files: it loads `src` children, merges libraries into the single registry, resolves citations and cross-references, computes numbering (chapters, figures, notes), places the toc/endnotes/bibliography markers, applies theme/layout, and — for websites — assembles the nav into pages. Citations, cross-references, and numbering are one problem: a single global registry resolved at assembly time.

The assembler is the multi-file/project system (#72) plus a build model. Its design is led by Claude Code and Claude-Chat with you in the loop on the calls, and it builds in slices, not one pass. The docs site is the worked example for the website assembler (a sidebar-style site).

## Open — to decide during the build

- **Self-close requirement for kwarg-only structure entries and `<meta>`** (surfaced by the #190 skeleton). A kwarg-only tag with no pipe body — `<meta type=article …>` or `<section src="intro.emd">` — parses *today* as an **unterminated long-form opener**: the parser waits for a matching `</meta>` / `</section>` and swallows the rest of the file until it errors. To parse, these must self-close: `<meta type=article … />`, `<section src="intro.emd" />`. (The pipe forms — `<section src="…" | Title>` and the inline `<section | Title>` — are unaffected; the pipe terminates the tag.) The examples in this spec (§`<meta>`, §Structure entries, §`<data>`) currently omit the slash. The skeleton's fixtures adopted the explicit `/>` form with **no parser change**. To settle: either **(a)** require `/>` on kwarg-only entries and update these examples to match, or **(b)** make `<meta>` / `<section src>` *void* in the master-document context so the bare `<… >` form parses. (b) is parser/grammar work; (a) is a doc change. Decide before the multi-file authoring syntax is documented for authors — this is a chat-surface call, not a Claude Code one.
- Per-type assembler contracts (the bulk of the work; slice by slice).
- Website page model for anything outside the nav (a home/landing body, blog-style listings).
- Embedded-asset format coverage in `<data>` (png shown; others to follow).
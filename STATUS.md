# Enscribe — Status

A capability checklist: what enscribe can do today, and what is planned
but not yet built. Checked items work and are tested; unchecked items are
intended but not started.

This file records **state, not history**. It is not a changelog — the
commit log is the changelog (`git log`). It is not an explanation — for
*why* the project exists read `README.md` and `DESIGN.md`; for the
architecture, `notes/specs/`. Open work is tracked in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues); the release
sequence lives in `ROADMAP.md`. No counts (test totals, fixture totals)
appear here — a number is the fastest thing to go stale; run
`npm run verify` in `packages/enscribe` for the live test
status.

Legend: `[x]` works and is tested · `[ ]` planned, not started.

## Authoring — what a `.emd` document can express

- [x] Three authoring registers: canonical tags, sigil shorthands, markdown idioms
- [x] Tagged shorthand — `<tag #id .class attr=value +flag -flag | content>`
- [x] Sigil tags — sections `<# #>`, inline/display math `<$ $>` `<$$ $$>`, code `` <` `> `` `` <``` ```> ``
- [x] Same-line long form — `<b>bold</b>` and `<tag>…</tag>` for every vocabulary tag
- [x] Self-closing form `<tag />`
- [x] Implicit section closing (a peer-level tag ends the previous)
- [x] Multi-line tag content; escape rules (`\<`, `\|`, `\\`, `&gt;`)
- [x] Nested tags inside named-tag content (recursive content parsing)
- [x] Bare markdown forms normalized to canonical nodes (`$x$`, GFM tables, emphasis/strong, strikethrough, inline code, links, headings)
- [x] Sections — three-level named ladder (`section` / `sub-section` / `sub-sub-section`)
- [x] Section numbering — opt-in via `<config number-sections=true />` (default off for articles, on for books); build-time hierarchical numbers (`3.1.2`) as real content, chapter-prefixed in books, with chapter (arabic) and appendix (alpha) book-part headings numbered; cross-refs render the number ("section 3.1.2", "chapter 1", "appendix A") and JATS carries `<sec><label>` / `<book-part-meta>…<label>`
- [x] Appendices — `<appendix>`, one authoring element with two projections by `<meta type>` (#100): a **book** appendix → `<book-part book-part-type="appendix">` in `<book-back>` (BITS); an **article** appendix → JATS `<app>` collected in one `<app-group>` in `<back>`. Same authoring surface, title/id, render, and #57 appendix lettering (`A`, `A.1`, "Appendix A" cross-references) across both
- [x] Figures and images, with captions
- [x] Tables — the `<table>` host with CSV, TSV, JSON, YAML, and Markdown format words (`<csv>` / `<tsv>` kept as gate shorthands → `<table csv>` / `<table tsv>`)
- [x] Opt-in markup in data-table cells — data-format cells are literal by default; `+parse-text` / `parse-columns="…"` / `-parse-text` (and a doc-wide `<config parse-data-tables>`) opt cells into Enscribe inline markup (links, emphasis, cross-refs, cites, inline code/math), parsed in HTML and JATS both, with the stored data payload left literal
- [x] Inline and display math (KaTeX); numbered equations
- [x] Notes — footnotes / endnotes / sidenotes, plus a **margin render mode** (#33): `note-position=margin` (option or `<config>`) relocates numbered notes into a margin column beside their markers (display-only — markers, numbering, and JATS unchanged; mobile falls back to bottom footnotes), and `<marginnote>` sets an unnumbered, uncounted aside in the same margin in place (JATS `<boxed-text content-type="marginnote">`)
- [x] Citations and bibliography — citation-js, the `<library>` storage host (`<library bibtex | …>` format word), inline BibTeX / CSL-JSON, CSL styles, and external sources via `<library src=…>` (#133): a filesystem path or http(s)/reachable URL, loaded at build (CLI) and on render in the browser (`renderAsync`, async fetch); multiple inline/`src` libraries merge with deterministic key-collision flagging; a failed load renders a visible error (always-renders). The old `<bibliography source=…>` form is retired
- [x] Cross-references to figures, equations, tables, sections, code blocks, theorems
- [x] Theorem family — `<theorem>`, `<lemma>`, `<definition>`, `<proof>`, … (shared / own / unnumbered counters)
- [x] Frameable boxed prose — `<aside>` joins `<frame>` with an optional title, caption, and border (on by default); a numbered `<aside>` gets its own "Box" counter, and `<aside type=…>` carries the callout taxonomy (the admonition types — note / info / tip / warning / caution — are styled per-type by the default theme) + `<boxed-text>` export
- [x] Frameable border looks — `border=<name>` selects a named look (`accent` / `thick` / `dashed` / `subtle` in the default theme) on the frameable border surface; the document names the look, the theme defines it (`frameable-border-<name>` modifier class)
- [x] External DSLs — the `<diagram>` host (Mermaid, ABC engines as format words); legacy `<mermaid>` / `<abc>` kept as gate shorthands
- [x] Host format-word validation — a format-word host (`<table>` / `<diagram>` / `<library>`) carrying a format outside its accept-set (e.g. `<table xml>`, `<diagram mermaidx>`) gets a located, non-fatal diagnostic at the gate and still renders
- [x] Inline SVG — the `<svg>` frameable element (bare inline, or captioned / numbered → wrapped in `<figure>`); the canonical home for framed inline SVG (no `<fig svg>`)
- [x] Links with a positional URL (`<a url | text>`)
- [x] Book structure — chapters, parts, front/back matter
- [x] Lists — the `<list>` / `<list ordered>` construct with **open item markers**: `<li>` (canonical), the `<->` / `<*>` sigils (strict-safe), and the `-` / `*` markdown idiom. An item's content is the flow that follows its marker (peer-closed by the next marker or `</list>`), so items hold multiple paragraphs and nested `<list>`s with no indentation. `marker=` (→ CSS `list-style-type`), `start`, and `reversed` are supported. Lowers to standard `<ul>` / `<ol>` + `<li>`, inheriting the HTML render and the JATS `<list>` mapping.
- [x] Strict mode — the strictness register switch (#36): `<config strict-mode=off|sigil|canonical>` (or the `strictMode` render option, which wins). Each value names the loosest register still interpreted. `sigil` turns the markdown register off — `*`, `#`, `-`, `>`, `` ` ``, `$…$` pass through literal everywhere, including inside tag pipe bodies, with no escaping — while canonical tags and sigils stay live, and would-be-markdown text is flagged. `canonical` turns markdown **and** sigils off (`<# #>` / `<$ $>` / `<->` / `<*>` literal too), leaving only the canonical named-tag register — the canonical `<li>` and the `^{}`/`_{}` shortcuts stay live — and flags would-be-markdown **and** would-be-sigil text. The flag CSS is injected only for a non-`off` rung. `off` (default) is the unchanged single parse → byte-identical. Native inferences (blank-line→paragraph, section nesting) stay on in all states; Layer 1 / JATS are unaffected, and `enscribe lift` honors the mode so `sigil`/`canonical` documents round-trip losslessly. Mechanism: parse off, then re-parse with the register(s) disabled (markdown via micromark `disable`; sigils via the sigil-less `enscribeSyntax` variant)
- [ ] `<html-passthrough>` — needs a spec first
- [x] Multi-file source, article level — a master document (`<meta>` / structure / `<data>` / `<config>`) assembles `<section src>` child files into one article (design of record: `notes/specs/master-document.md`; epic [#190](https://github.com/enscribejs/enscribe/issues/190)). `enscribe build` parses the master → loads + parses each child → assembles in document order → renders as one article, with **numbering and cross-references resolved across files**: figures and sections number continuously through the assembled document, and a `<ref>` resolves to its target wherever it lives across the children (an unresolved ref renders a visible marker, not a crash). The browser renders the same assembly live via `renderMasterAsync` ([#194](https://github.com/enscribejs/enscribe/issues/194)): it pre-fetches each `<section src>` child against the document base URL, then runs the same assembler — a failed child fetch renders a visible inline error (always-renders)
- [x] Multi-file source, book level — a `<meta type=book>` master assembles book-part `src` children (`<chapter src>`, `<preface src>`, `<appendix src>`, …) into one `<book>` with front/body/back regions, the same way the article master assembles `<section src>` (epic [#190](https://github.com/enscribejs/enscribe/issues/190)). The assembler is document-class-agnostic — it imposes no wrapper; it passes the master's `<meta>` through and the pipeline structures the assembled tree per `<meta type>`, so an assembled multi-file book is the same tree a single-file book produces. Parts route by type (preface→front, chapters→body, appendix→back); per-chapter figure/section numbering and cross-chapter `<ref>`s resolve over the one assembled tree (chapter 2's first figure is 2.1, a chapter-2 ref to a chapter-1 figure resolves to 1.1); the assembled book exports DTD-valid BITS. Live (`renderMasterAsync`) and static (CLI `build`) render byte-identically — and the static `build` now publishes a book as **separate per-chapter pages by default** (the publishing row below; `--single-page` for the whole book in one file)
- [ ] Multi-file source — remaining pieces: cross-file citations/bibliography registry merge, placement markers (toc / endnotes / bibliography), and the **website** document type. *(The book type shipped — see the book-level row above; master-level `<library src>` live-loading shipped in [#197](https://github.com/enscribejs/enscribe/issues/197).)*
- [ ] Executable code blocks — JS / Arquero / Vega-Lite

## Rendering & output

- [x] HTML output — external CSS/fonts by default, self-contained on request (`embedResources`)
- [x] Rendered citations inlined; conditionally-injected hover previews (notes / refs / citations)
- [x] Bundled subsetted fonts (Inter, Source Code Pro) and patched KaTeX fonts
- [x] Default stylesheet with theme variables (`default.css`) — styles every shipped feature hook from one custom-property palette (border looks, section numbers, callout types, captions/labels, the show-source disclosure, cross-refs, errors)
- [x] DSL rendering modes — `skip` default, `live-link` / `live-inline`, and `static` (build-time SVG) for ABC
- [x] DSL "See source" disclosure — opt-in `<config show-source=true />` reveals the authored Mermaid/ABC source behind a rendered block in a native `<details>` control (no JavaScript); off by default, theme styles the control
- [x] Client-side rendering — browser library (`render` / `renderInto` / `executeAssets`), `enscribe.browser` bundle
- [ ] Code syntax highlighting (not yet wired in)
- [ ] Render-mode lowering — lossy lowering of custom elements to plain `<h1>`/`<h2>` (gated on a design decision)
- [x] Table-of-contents sidebar (opt-in, build-time, responsive) — for an article a single nested sidebar; for a book the left chapter rail of the three-column reading interface (below)
- [x] ToC scroll-spy — highlights the current entry (and its ancestor trail) in the sidebar as the reader scrolls, via an injected inline `IntersectionObserver` script with `aria-current`; ships with the ToC sidebar, a pure progressive enhancement (the first first-party hand-authored render JS). For a book it is the sole left-rail highlighter (no competing paging nav), paired with a second script that drives the right "on this page" rail
- [x] Book reading interface — a book document with a ToC renders as **one continuous scrolling document** with three-column chapter-navigation chrome: a left chapter rail (front-matter unnumbered, body chapters arabic "1 · Introduction", back-matter lettered "A · Notation"; active chapter a tinted block with a left accent), static prev/next chapter links at each chapter foot, and a right "on this page" rail of the current chapter's sections (scroll-spied). Book-gated — article ToC behavior is unchanged; all chrome markup is static (byte-identical static≡live), the highlighting/visibility a post-render enhancement. A single-chapter-at-a-time **paging** view remains available opt-in (`chapterNav: true`). This is the **one-file** projection; the static `enscribe build` also publishes the same chrome as **separate per-chapter pages** (next row)
- [x] Static separate-pages book build (publishing track, P1) — `enscribe build` emits a book as **one standalone HTML page per chapter** at deterministic per-chapter URLs (`1-counting-elephants.html`, `a-field-data-sheets.html`, …) plus an `index.html`, the shareable published artifact (open a `chapter-N.html` link with no JS). Each page carries the reading-interface chrome (the chapter rail linking to every chapter's page, prev/next to the adjacent pages, the current chapter's on-this-page rail) and that chapter's content (the per-chapter render). **Cross-chapter references link across pages** — a ref to a figure in another chapter resolves to that chapter's page + anchor (`1-counting-elephants.html#fig:transect`); in-chapter refs stay in-page anchors. Default for books; `--single-page` builds the whole book in one file (also the reference render the per-chapter content is proven byte-identical to). The live routed lazy render (per-chapter render in the browser, routed by URL) is the next, editing-surface track
- [x] Display themes (default, modern, compact — custom-property overrides)
- [ ] Multi-column display
- [ ] Pagination and print-targeted output

## CLI — the `enscribe` command (`@enscribejs/cli`)

- [x] `enscribe render` — `.emd` → HTML (self-contained or external-asset)
- [x] `enscribe build` — assemble a multi-file master document, then render it ([#190](https://github.com/enscribejs/enscribe/issues/190) — see the multi-file source rows above for what is and isn't assembled yet). A **book** builds to **separate per-chapter pages by default** (below); `--single-page` builds the whole book/article as one file
- [x] `enscribe export-jats` — `.emd` → JATS 1.3 / BITS 2.0 XML
- [x] `enscribe import-jats` — JATS XML → HTML, or canonical `.emd` (`--emd`)
- [x] `enscribe lift` — mixed markdown/sigil/canonical source → canonical named-tag form
- [x] `enscribe lower` — canonical source → shorthand sigils, or markdown idioms (`--markdown`)
- [x] `enscribe import` — LaTeX / Quarto / DOCX / … via a pandoc bridge

## Interoperability — JATS

- [x] JATS 1.3 Archiving export — articles (`enscribeToJats`); the fixture corpus validates clean against the bundled DTDs under `xmllint`
- [x] BITS 2.0 export — books; validates clean against the bundled BITS 2.0 DTD under `xmllint`
- [x] JATS import — document structure and inline formatting
- [x] JATS import — citations and bibliography
- [x] JATS import — math (`<tex-math>` and MathML)
- [x] JATS import — figures, tables, cross-references, and footnotes
- [x] JATS import — formulas, footnotes, and citations inside `<table-wrap>` cells (converted to the opt-in parsed-cell form so they render and resolve in HTML and JATS both, not flattened to text)
- [x] JATS import — complex (colspan/rowspan/multi-row-header) tables keep their HTML grid layout but convert every cell like body content (no raw verbatim JATS in any cell; cell refs/cites/notes/math resolve; `<table-wrap-foot>` footnotes hoist; JATS re-export emits a real grid, not a placeholder)
- [x] JATS import — theorem family, DSL blocks, and code listings
- [x] JATS import — reduction policy (reader content preserved, publishing metadata dropped)
- [x] JATS import — a real published article demonstration (NLM JATS sample, on the docs site)
- [x] JATS export — `<a>` → `<ext-link>` (external links) and `<xref>` (internal `#id` cross-references)
- [x] JATS export — inline `<svg>` → a self-contained `<graphic>` (the SVG embedded losslessly as a base64 data URI; DTD-valid)

## Documentation — the docs site (`docs-site/`)

- [x] Home (what enscribe is)
- [x] Design article (architecture and rationale)
- [x] Quickstart guide (interactive in-browser playground)
- [x] Authoring Guide (with rendered demonstrations)
- [x] Layer 1 Vocabulary Reference (MDN-style, element by element)
- [x] Authoring coverage gallery (the completeness surface — every construct a user can write: each vocab element generated from its entries, plus a curated non-vocabulary supplement for Layer-2 constructs with no vocab entry, e.g. `<list>`; source beside rendered output, with loud GAP markers) (#143)
- [x] JATS-relationship article
- [x] Imported-article demonstration page (a real published paper, via `import-jats`)
- [x] Static site build (`npm run docs:build`)

## Packaging & infrastructure

- [x] Monorepo with npm-workspace linking
- [x] Three published packages — `@enscribejs/enscribe` (Layer 1 core + shorthand parser + interpreter), `@enscribejs/cli` (the `enscribe` command + JATS export/import + pandoc bridge), and `@enscribejs/layer1-vocabulary`
- [x] `@enscribejs/enscribe/core` — the inward-pointing shared foundation (`fs`-free, browser-safe); the parser (`@enscribejs/enscribe/parser`) and interpreter are sibling subtrees of the same package
- [x] Coordinated v0.2.0 versioning; MIT license; publish-ready package metadata
- [x] Test suites across the packages (parser, interpreter, core, JATS export/import, CLI, vocabulary)
- [x] Fixture corpus of `.emd` documents exercising the system end to end
- [x] Bundled JATS/BITS DTDs for offline `xmllint` validation
- [x] Published to npm
- [ ] Generated `.d.ts` types for the browser library

## Current position

**v0.4.0 is the current release** — enscribe renders rich documents (lists, strict
mode, sidenotes + margin notes, article appendices, external `<library src>` citation
sources, the authoring coverage gallery, plus the v0.3.x markup-in-table-cells /
section numbering / smart typography / callouts and the v0.2.x base), converts to
and from JATS — framed as an export translation from an HTML-shaped Layer 1 (the
decided direction; lists were the inaugural migrated element group and figures the
second, with the remaining groups still rendering as custom Layer 1 elements) —
ships a client-side browser library and the `enscribe` CLI, and is published to
npm as three scoped packages. Open work is tracked in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues) by milestone and
label; the release plan and what's next live in `ROADMAP.md`.

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
- [x] Figures and images, with captions
- [x] Tables — the `<table>` host with CSV, TSV, JSON, YAML, and Markdown format words (`<csv>` / `<tsv>` kept as gate shorthands → `<table csv>` / `<table tsv>`)
- [x] Opt-in markup in data-table cells — data-format cells are literal by default; `+parse-text` / `parse-columns="…"` / `-parse-text` (and a doc-wide `<config parse-data-tables>`) opt cells into Enscribe inline markup (links, emphasis, cross-refs, cites, inline code/math), parsed in HTML and JATS both, with the stored data payload left literal
- [x] Inline and display math (KaTeX); numbered equations
- [x] Notes — footnotes / endnotes / sidenotes
- [x] Citations and bibliography — citation-js, the `<library>` storage host (`<library bibtex | …>` format word), inline BibTeX / CSL-JSON, CSL styles
- [x] Cross-references to figures, equations, tables, sections, code blocks, theorems
- [x] Theorem family — `<theorem>`, `<lemma>`, `<definition>`, `<proof>`, … (shared / own / unnumbered counters)
- [x] Frameable boxed prose — `<aside>` joins `<frame>` with an optional title, caption, and border (on by default); a numbered `<aside>` gets its own "Box" counter, and `<aside type=…>` carries the callout taxonomy (the admonition types — note / info / tip / warning / caution — are styled per-type by the default theme) + `<boxed-text>` export
- [x] Frameable border looks — `border=<name>` selects a named look (`accent` / `thick` / `dashed` / `subtle` in the default theme) on the frameable border surface; the document names the look, the theme defines it (`frameable-border-<name>` modifier class)
- [x] External DSLs — the `<diagram>` host (Mermaid, ABC engines as format words); legacy `<mermaid>` / `<abc>` kept as gate shorthands
- [x] Host format-word validation — a format-word host (`<table>` / `<diagram>` / `<library>`) carrying a format outside its accept-set (e.g. `<table xml>`, `<diagram mermaidx>`) gets a located, non-fatal diagnostic at the gate and still renders
- [x] Inline SVG — the `<svg>` frameable element (bare inline, or captioned / numbered → wrapped in `<figure>`); the canonical home for framed inline SVG (no `<fig svg>`)
- [x] Links with a positional URL (`<a url | text>`)
- [x] Book structure — chapters, parts, front/back matter
- [ ] Strict mode — disable markdown idioms
- [ ] `<html-passthrough>` — needs a spec first
- [ ] Multi-file source — `enscribe.yml` + `<include>`
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
- [x] Table-of-contents sidebar (opt-in, build-time, responsive)
- [x] ToC scroll-spy — highlights the current section (and its ancestor trail) in the sidebar as the reader scrolls, via an injected inline `IntersectionObserver` script with `aria-current`; ships with the ToC sidebar, a pure progressive enhancement (the first first-party hand-authored render JS)
- [x] Single-chapter-at-a-time book navigation (JS, progressive enhancement)
- [x] Display themes (default, modern, compact — custom-property overrides)
- [ ] Multi-column display and margin sidenotes
- [ ] Pagination and print-targeted output

## CLI — the `enscribe` command (`@enscribejs/cli`)

- [x] `enscribe render` — `.emd` → HTML (self-contained or external-asset)
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
- [x] Authoring Guide (fourteen chapters, with rendered demonstrations)
- [x] Layer 1 Vocabulary Reference (MDN-style, element by element)
- [x] Vocabulary coverage gallery (generated from the vocab entries; every element's authoring examples, source beside rendered output, with loud GAP markers)
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

**v0.3.0 is released** — enscribe renders rich documents (now with markup inside
table cells, section numbering, frame-border styles, smart typography, callouts,
the vocabulary coverage gallery, DSL source-view, and ToC scroll-spy), converts
to and from JATS, ships a client-side browser library and the `enscribe` CLI, and
is published to npm as three scoped packages. The live milestone is **v0.3.5**:
the consolidation pass that resolves the v0.3.0-close release-audit findings and
ships no new features. Open work is tracked in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues) by milestone and
label; the release plan and targets live in `ROADMAP.md`.

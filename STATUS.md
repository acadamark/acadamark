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
- [x] Figures and images, with captions
- [x] Tables — the `<table>` host with CSV, TSV, JSON, YAML, and Markdown format words (`<csv>` / `<tsv>` kept as gate shorthands → `<table csv>` / `<table tsv>`)
- [x] Inline and display math (KaTeX); numbered equations
- [x] Notes — footnotes / endnotes / sidenotes
- [x] Citations and bibliography — citation-js, the `<library>` storage host (`<library bibtex | …>` format word), inline BibTeX / CSL-JSON, CSL styles
- [x] Cross-references to figures, equations, tables, sections, code blocks, theorems
- [x] Theorem family — `<theorem>`, `<lemma>`, `<definition>`, `<proof>`, … (shared / own / unnumbered counters)
- [x] Frameable boxed prose — `<aside>` joins `<frame>` with an optional title, caption, and border (on by default); a numbered `<aside>` gets its own "Box" counter, and `<aside type=…>` carries the callout taxonomy (the admonition types — note / info / tip / warning / caution — are styled per-type by the default theme) + `<boxed-text>` export
- [x] External DSLs — the `<diagram>` host (Mermaid, ABC engines as format words); legacy `<mermaid>` / `<abc>` kept as gate shorthands
- [x] Inline SVG passthrough
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
- [x] Default stylesheet with theme variables (`default.css`)
- [x] DSL rendering modes — `skip` default, `live-link` / `live-inline`, and `static` (build-time SVG) for ABC
- [x] Client-side rendering — browser library (`render` / `renderInto` / `executeAssets`), `enscribe.browser` bundle
- [ ] Code syntax highlighting (not yet wired in)
- [ ] Render-mode lowering — lossy lowering of custom elements to plain `<h1>`/`<h2>` (gated on a design decision)
- [x] Table-of-contents sidebar (opt-in, build-time, responsive)
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
- [x] JATS import — theorem family, DSL blocks, and code listings
- [x] JATS import — reduction policy (reader content preserved, publishing metadata dropped)
- [x] JATS import — a real published article demonstration (NLM JATS sample, on the docs site)
- [x] JATS export — `<a>` → `<ext-link>` (external links) and `<xref>` (internal `#id` cross-references)

## Documentation — the docs site (`docs-site/`)

- [x] Home (what enscribe is)
- [x] Design article (architecture and rationale)
- [x] Quickstart guide (interactive in-browser playground)
- [x] Authoring Guide (fourteen chapters, with rendered demonstrations)
- [x] Layer 1 Vocabulary Reference (MDN-style, element by element)
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
- [ ] Fixture-corpus consolidation + the comprehensive demonstrative fixture

## Current position

**v0.2.0 is released** — enscribe renders rich documents, converts to and from
JATS, ships a client-side browser library and the `enscribe` CLI, and is
published to npm as three scoped packages. The live milestone is **v0.2.5**: the
spec-completeness re-sync plus accumulated parser, interop, and tables fixes.
Open work is tracked in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues) by milestone and
label; the release plan and targets live in `ROADMAP.md`.

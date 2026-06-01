# Enscribe — Status

A capability checklist: what enscribe can do today, and what is planned
but not yet built. Checked items work and are tested; unchecked items are
intended but not started.

This file records **state, not history**. It is not a changelog — the
commit log is the changelog (`git log`). It is not an explanation — for
*why* the project exists read `README.md` and `DESIGN.md`; for the
architecture, `notes/specs/`. Open work lives in `BACKLOG.md`; the phase
sequence lives in `ROADMAP.md`. No counts (test totals, fixture totals)
appear here — a number is the fastest thing to go stale; run
`npm run verify` in `packages/enscribe-interpreter` for the live test
status.

Legend: `[x]` works and is tested · `[~]` partial / in progress ·
`[ ]` planned, not started.

## Authoring — what a `.emd` document can express

- [x] Three authoring registers: canonical tags, sigil shorthands, markdown idioms
- [x] Tagged shorthand — `<tag #id .class attr=value +flag -flag | content>`
- [x] Sigil tags — sections `<# #>`, inline/display math `<$ $>` `<$$ $$>`, code `` <` `> `` `` <``` ```> ``
- [x] Same-line long form — `<b>bold</b>` and `<tag>…</tag>` for every vocabulary tag
- [x] Self-closing form `<tag />`
- [x] Implicit section closing (a peer-level tag ends the previous)
- [x] Multi-line tag content; escape rules (`\<`, `\|`, `\\`, `&gt;`)
- [x] Nested tags inside named-tag content (recursive content parsing)
- [x] Bare markdown forms normalized to canonical nodes (`$x$`, GFM tables, emphasis, lists, links, fenced code)
- [x] Sections — three-level named ladder (`section` / `sub-section` / `sub-sub-section`)
- [x] Figures and images, with captions
- [x] Tables — CSV, TSV, JSON, YAML, and Markdown source formats
- [x] Inline and display math (KaTeX); numbered equations
- [x] Notes — footnotes / endnotes / sidenotes
- [x] Citations and bibliography — citation-js, inline BibTeX `<library>`, CSL styles
- [x] Cross-references to figures, equations, tables, sections, code blocks, theorems
- [x] Theorem family — `<theorem>`, `<lemma>`, `<definition>`, `<proof>`, … (shared / own / unnumbered counters)
- [x] External DSLs — Mermaid diagrams, ABC music notation
- [x] Inline SVG passthrough
- [x] Links with a positional URL (`<a url | text>`)
- [x] Book structure — chapters, parts, front/back matter
- [ ] Strict mode — disable markdown idioms (Phase 7)
- [ ] `<html-passthrough>` — needs a spec first (Phase 12)
- [ ] Multi-file source — `enscribe.yml` + `<include>` (Phase 9)
- [ ] Executable code blocks — JS / Arquero / Vega-Lite (Phase 10)

## Rendering & output

- [x] HTML output — external CSS/fonts by default, self-contained on request (`embedResources`)
- [x] Rendered citations inlined; conditionally-injected hover previews (notes / refs / citations)
- [x] Bundled subsetted fonts (Inter, Source Code Pro) and patched KaTeX fonts
- [x] Default stylesheet with theme variables (`default.css`)
- [x] DSL rendering modes — `skip` default, `live-link` / `live-inline`, and `static` (build-time SVG) for ABC
- [x] Client-side rendering — browser library (`render` / `renderInto` / `executeAssets`), `enscribe.browser` bundle
- [ ] Code syntax highlighting (not yet wired in)
- [ ] Render-mode lowering — lossy lowering of custom elements to plain `<h1>`/`<h2>` (Phase 8, gated on a design decision)
- [ ] Table-of-contents sidebar (Phase 8, release-blocking)
- [ ] Single-chapter-at-a-time book navigation (Phase 8, release-blocking)
- [ ] Additional display themes (Phase 8, release-blocking)
- [ ] Multi-column display and margin sidenotes (Phase 8)
- [ ] Pagination and print-targeted output (Phase 8)

## CLI — the `enscribe` command (`@enscribejs/cli`)

- [x] `enscribe render` — `.emd` → HTML (self-contained or external-asset)
- [x] `enscribe export-jats` — `.emd` → JATS 1.3 / BITS 2.0 XML
- [x] `enscribe import-jats` — JATS XML → HTML, or canonical `.emd` (`--emd`)
- [x] `enscribe lift` — mixed markdown/sigil/canonical source → canonical named-tag form
- [x] `enscribe lower` — canonical source → shorthand sigils, or markdown idioms (`--markdown`)
- [ ] `enscribe import` — LaTeX / Quarto / DOCX via a pandoc bridge (post-release)

## Interoperability — JATS

- [x] JATS 1.3 Archiving export — articles (`enscribeToJats`), DTD-validated when `xmllint` is present
- [x] BITS 2.0 export — books
- [x] JATS import — document structure and inline formatting
- [x] JATS import — citations and bibliography
- [x] JATS import — math (`<tex-math>` and MathML)
- [ ] JATS import — figures, tables, and non-bibliographic cross-references
- [ ] JATS import — theorem family and DSL blocks
- [ ] JATS import — non-representable-element reduction policy
- [ ] JATS import — a real PubMed Central article demonstration
- [ ] JATS export — map `<a>` → `<ext-link>` (links currently dropped on export)

## Documentation — the docs site (`docs-site/`)

- [x] Home (what enscribe is)
- [x] Design article (architecture and rationale)
- [x] Quickstart guide (interactive in-browser playground)
- [x] Authoring Guide (fourteen chapters, with rendered demonstrations)
- [x] Layer 1 Vocabulary Reference (MDN-style, element by element)
- [x] JATS-relationship article
- [x] Static site build (`npm run docs:build`)
- [ ] Imported PubMed Central article demonstration page

## Packaging & infrastructure

- [x] Monorepo with npm-workspace linking
- [x] Scoped packages under `@enscribejs/*` — `core`, `remark-enscribe`, `interpreter`, `layer1-vocabulary`, `jats-export`, `jats-import`, `cli`
- [x] `enscribe-core` — the inward-pointing shared foundation (`fs`-free, browser-safe)
- [x] Coordinated v0.1.0 versioning; MIT license; publish-ready package metadata
- [x] Test suites across the packages (parser, interpreter, core, JATS export/import, CLI, vocabulary)
- [x] Fixture corpus of `.emd` documents exercising the system end to end
- [x] Bundled JATS/BITS DTDs for offline `xmllint` validation
- [ ] npm publish (Ariel runs `npm publish` per package, out of band)
- [ ] Generated `.d.ts` types for the browser library (Phase 14)
- [ ] Fixture-corpus consolidation + the comprehensive demonstrative fixture (Phase 14)

## Current position

The **alpha milestone** is closed (the five-line acceptance definition is
verified; see `notes/alpha-acceptance-mapping.md`). The live milestone is
the **v0.1.0 public release**. Release-blocking work that remains: Phase 8
display features (table-of-contents sidebar, single-chapter book
navigation, more themes), Phase 13 JATS import (structure, inline,
citations, and math have landed; figures/tables, cross-references, the
theorem family, DSL blocks, the reduction policy, and a real-article demo
remain), and the residual Phase 14 packaging (generated types, fixture
consolidation, `npm publish`). Phases 7, 9, 10, 11, and 12 are
post-release. The phase plan and sequencing live in `ROADMAP.md`.

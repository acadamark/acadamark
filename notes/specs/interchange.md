# Interchange — import/export with external authoring formats

Interchange is enscribe's import/export bridge to the **external authoring
formats** people already write in — **Quarto**, **LaTeX**, and **DOCX**. Its
purpose is adoption: an academic or technical author has existing documents, and
"get mine in, get mine back out" is the on-ramp to trying enscribe and the
no-lock-in guarantee that earns commitment. This document describes the intended
mechanism. (Whether it is built is a STATUS question; the open work is tracked in
GitHub Issues.)

Interchange is **not** JATS. JATS is the archival/semantic channel and is handled
natively (enscribe reads and writes JATS XML directly — see the JATS specs)
because archival fidelity demands full control. Interchange is a *feature* — a set
of conveniences for moving between enscribe and the tools authors already use — not
the mission. The mission is rich documents that render as HTML.

## Two engines, and why the choice differs by format

Interchange uses two distinct engines, picked per format by a single principle:
**does enscribe already speak the format's substrate?**

- **Pandoc bridge** — for formats enscribe cannot parse natively. Pandoc is the
  universal document converter, with mature readers and writers for LaTeX and
  DOCX. enscribe maps between **pandoc's AST** and its own Layer-1 model; pandoc
  does the format parsing. Writing a LaTeX or DOCX parser from scratch would be
  wasted effort — pandoc already did it. enscribe already ships the import half of
  this (`enscribe import`, the pandoc bridge); the export half is the new work.
- **Direct mapping** — for Quarto only. Quarto source (`.qmd`) is
  pandoc-flavored Markdown plus a set of extensions, and **enscribe already parses
  Markdown** (it is one of enscribe's three authoring registers). So enscribe is
  uniquely positioned to handle `.qmd` *directly*: its Markdown register covers the
  prose, and Quarto's extensions map onto enscribe constructs that already exist.

The split is not arbitrary. **Round-trip requires the direct engine, and only
Quarto rounds trips.** Pandoc is a *converter*: it normalizes and reflows source on
output — it does not preserve source form. A `.qmd → pandoc → .qmd` pass is
therefore not faithful (heading styles, emphasis markers, wrapping, and ordering
all drift). Faithful round-trip needs source-form-aware handling, which the direct
reader/writer provides and pandoc structurally cannot. So:

| Format | Import | Export | Round-trip | Engine |
|---|---|---|---|---|
| Quarto | yes | yes | **yes (the target)** | direct |
| LaTeX | yes (lossy) | yes (lossy) | no | pandoc |
| DOCX | yes (content) | yes (content) | no | pandoc |

## The pandoc-AST ⇄ Layer-1 mapping (LaTeX, DOCX)

Pandoc's AST is a tree of Blocks and Inlines. The bridge maps each to a Layer-1
construct, both directions:

- Header → `<section>` (by level); Para → paragraph; CodeBlock → `<code>`;
  BulletList / OrderedList → `<list>` (+ `ordered`); Table → `<table>`; Image →
  `<figure>` / `<img>`; Link → `<a URL | text>`; Emph / Strong → emphasis tags;
  Math → `<$ … $>` / `<$$ … $$>`; Cite → enscribe's citation; BlockQuote →
  `<blockquote>`.
- Div`[attrs]` / Span`[attrs]` → a classed container / span, with known attribute
  conventions recognized and lifted to real constructs where one exists (e.g. a
  callout Div → `<aside type=…>`).
- RawBlock / RawInline → routed through the `<html-passthrough>` policy (#37) on
  import; dropped with a diagnostic where no passthrough target exists
  (always-renders: a located note, never a silent loss).

This mapping is the workhorse for LaTeX and DOCX. It is intentionally the same
shape as the JATS mapping, with pandoc's AST standing in for JATS XML as the
intermediary.

## Per-format fidelity contracts

Each format ships an explicit, documented fidelity contract — what survives, what
is lossy, what is dropped and why — exactly as JATS ships its reduction policy. A
contract is honest by construction: it states the boundary rather than implying
completeness.

### Quarto — round-trip (the target)

Quarto and enscribe share the RMarkdown lineage, so the **document models align**:
sections, floats, cross-references, citations, code chunks, and frontmatter all
have natural enscribe counterparts. The direct engine maps:

- **Prose** — via enscribe's existing Markdown register.
- **Cross-references** (`@fig-x` / `#fig-x`) → enscribe's colon-id reference
  resolution.
- **Callouts** (`::: {.callout-note}` …) → `<aside type=note>` (the callout
  taxonomy already exists).
- **Frontmatter** (YAML) → `<config>` (flat) and the structured **data block**
  (config-as-data, #134) — Quarto's `title:` / `bibliography:` / `format:` land on
  exactly the `<meta>` / `<config>` / data surfaces enscribe just settled.
- **Code chunks** + chunk options (`#| echo: false`) → `<code>` with the
  execution/display kwargs (the runnable-code model — `run` / `echo` / `output`).
- **Project model** (`_quarto.yml`, multi-file) → the **master-document** system:
  a Quarto project maps onto an enscribe master document almost one-to-one.

The round-trip correctness model mirrors `lift` / `lower`: parse `.qmd` to the
canonical Layer-1 form, and serialize back so that a directly-authored document
survives the trip. Round-trip is expected to be *lossless for the constructs in
the contract*, not for arbitrary Quarto — see the open forks for the v1 coverage
line.

That config-as-data, master-document, and runnable-code all map onto Quarto's
core surfaces is why Quarto round-trip is tractable: most of the target already
exists in enscribe. Those subsystems landing first is the precondition.

### LaTeX — lossy both directions (pandoc)

LaTeX is a Turing-complete macro language, not a document model. **Import** captures
only the structural subset pandoc resolves — sections, math, figures, tables,
citations, common formatting — and loses custom macros, package behavior, and fine
typographic control. **Export** projects enscribe's structured model to LaTeX (a
controlled projection, like JATS export) and loses HTML-display features with no
LaTeX equivalent (interactive previews, scroll-spy, theme styling). The contract
states the subset; the loss is inherent, not a defect.

### DOCX — content in, styling lost (pandoc)

DOCX content (paragraphs, headings, lists, tables, images, footnotes) maps
reasonably; Word's presentational styling (fonts, colors, exact layout) does not —
**and should not.** enscribe re-semanticizes; Word styling is presentational noise
the author re-expresses through enscribe themes. DOCX is primarily an *ingestion*
on-ramp (get a Word manuscript's content into enscribe), not a fidelity target.

## Commands and pipeline

The CLI surface (the existing `enscribe import` bridge is the foundation; export is
new):

- `enscribe import <file>` — Quarto / LaTeX / DOCX → HTML, or canonical `.emd`
  (`--emd`). Quarto via the direct reader; LaTeX / DOCX via the pandoc bridge.
- `enscribe export <file> --to <quarto|latex|docx>` — `.emd` → the target format.
  Quarto via the direct writer; LaTeX / DOCX via the pandoc bridge.

Both run on the same Layer-1 model as every other enscribe operation, so an
imported document is indistinguishable from a hand-authored one once it lands.

## Relationship to existing subsystems

- **JATS** — the deliberate contrast: native (XML, full control, archival) vs
  bridge (pandoc, lossy, convenience). Interchange is *not* an extension of JATS.
- **`lift` / `lower`** — the round-trip discipline Quarto interchange inherits
  (parse to canonical, serialize faithfully).
- **config-as-data (#134)** — Quarto frontmatter maps here.
- **master-document** — Quarto projects map here.
- **runnable code (future)** — Quarto code-chunk options map onto the
  execution/display kwargs; until that ships, imported chunks degrade to inert
  `<code>` listings (the chunk options are preserved as a deferred concern — see
  the open forks).
- **`<html-passthrough>` (#37)** — the target for pandoc Raw nodes on import.

## Open design questions

Decisions owed before the feature is built; each is a discussion item in GitHub
Issues, decided there, not here.

- **IX-Q1 — Quarto v1 extension coverage.** Quarto's extension surface is large and
  evolving (shortcodes, conditional content, crossref kinds, layout attributes).
  Which subset is in the v1 round-trip contract, and what is the policy for an
  out-of-contract construct on import (preserve as a classed passthrough, or
  diagnose-and-drop)? The contract must name its boundary.
- **IX-Q2 — code-chunk mapping before runnable code exists.** Runnable code is a
  future subsystem. Until it ships, how does an imported Quarto chunk render — an
  inert listing with its options stored for later, or a flagged "execution not yet
  supported" block? This sets whether early Quarto round-trip is lossless for
  chunk *options* even when it can't execute them.
- **IX-Q3 — export form decisions.** For LaTeX export, which document class /
  template assumptions are baked in vs configurable? For DOCX export, which
  reference styling (a default `reference.docx`) ships? These are projection
  choices, parallel to JATS export's structural defaults.
- **IX-Q4 — pandoc dependency posture.** pandoc is an external binary. Is it a hard
  dependency for LaTeX/DOCX (fail clearly if absent), a soft one (feature-detect
  and disable), or bundled? The CLI already has a pandoc bridge — this formalizes
  the contract.

## Related references

- `notes/specs/lift-lower-round-trip.md` — the round-trip correctness model
  Quarto interchange follows.
- `notes/specs/master-document.md` — the project model Quarto projects map onto.
- `packages/ehtml/elements/config.md` — the `<config>` / data-block
  surface Quarto frontmatter maps onto.
- The JATS specs — the native-vs-bridge contrast.
- Pandoc AST documentation (the `Pandoc` / `Block` / `Inline` types).

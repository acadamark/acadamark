# enscribe — roadmap

The roadmap is the project's high-level plan: the **phases** the work moves
through and the **release** each milestone aims at. It is deliberately small.
Individual work items — bugs, enhancements, features — live in
[**GitHub Issues**](https://github.com/enscribejs/enscribe/issues), grouped by
milestone and label. This document holds the shape; the Issues hold the items.

Alpha closed 2026-05-29; **v0.1.0** shipped as the first public release.

---

## Releases

Releases are GitHub Milestones. Each draws its items from the phases below.

- **v0.1.0 — shipped.** Bidirectional JATS conversion (export *and* import);
  display features for end-readers (table-of-contents sidebar, single-chapter
  book navigation, themes); a client-side rendering library with an in-browser
  editor demo; the docs site; and the `enscribe` command-line tool.
- **v0.2.0 — current.** Docs-site polish for public visitors, the consolidated
  three-package layout published to npm, and the accumulated docs and
  infrastructure fixes.
- **v0.3.0.** Table features (markup inside cells, the grammar-of-tables
  model), the frameable redesign, a callout / admonition vocabulary, and parser
  improvements.
- **v0.4.0.** Code syntax highlighting, browser-bundle size optimization,
  conda-forge packaging, and new sigil shorthands.
- **future.** The large features that need their own design arcs — multi-file
  authoring, executable code blocks, and pagination / print output.

---

## Phases

Phases are the thematic arcs of the work; their numbers are stable identity
references used across the specs and the commit history. Each names *what it is
about* — not the items inside it (those are Issues).

**Closed.** Phases 1–6 delivered the **alpha**: the Layer 1 vocabulary,
canonical shorthand, sigils and markdown idioms, JATS export, and enscribe ⇔
Layer 1 conversion. **Phase 13** delivered JATS *import*, making the JATS bridge
bidirectional. **Phase 14** delivered the v0.1.0 packaging — the client-side
library, the docs site, the CLI, and the package consolidation.

**Open:**

- **Phase 7 — Lift-and-lower completeness.** The lowering tooling (`enscribe
  lift` / `lower`) already ships; what remains is the formal round-trip spec and
  strict mode (markdown idioms produce errors rather than reducing).
- **Phase 8 — Display targets.** The release-blocking subset (ToC, themes,
  chapter navigation) shipped in v0.1.0. The remainder — render-mode lowering to
  plain HTML, multi-column display, margin sidenotes, and pagination — is later.
- **Phase 9 — Multi-file authoring.** `enscribe.yml` + `<include>` and
  project-wide registries. A real architectural extension, gated on open design
  questions.
- **Phase 10 — Executable code blocks.** In-browser JavaScript execution with
  Arquero (data) and Vega-Lite (plots).
- **Phase 11 — Hardening and quality.** Bug fixes, the apparatus-tag
  silent-drop fix, and the one-time spec-completeness audit against the
  rebuild-from-docs standard.
- **Phase 12 — Vocabulary expansion.** New vocabulary and parser surface as
  their design questions resolve — callouts, presentation / slide elements,
  compact external-reference syntax, smart typography, and more.

---

## Current position

Alpha is closed and **v0.1.0 is released**: enscribe renders rich documents,
converts to and from JATS, ships a browser library and the `enscribe` CLI, and
is published to npm as three packages. The live milestone is **v0.2.0** —
docs-site polish for public visitors, conda-forge packaging, and the accumulated
fixes. The larger Phase 8 display work and Phases 9–12 are later milestones;
their items are tracked in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues) under `v0.3.0`,
`v0.4.0`, and `future`.

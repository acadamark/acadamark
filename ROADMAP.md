# enscribe — roadmap

The roadmap is the project's high-level plan: the **releases** the work moves
through, and what each aims at. It is deliberately small.
Individual work items — bugs, enhancements, features — live in
[**GitHub Issues**](https://github.com/enscribejs/enscribe/issues), grouped by
milestone and label. This document holds the shape; the Issues hold the items.

Alpha closed 2026-05-29; **v0.1.0** shipped as the first public release, and
**v0.2.0** followed with docs-site polish and the consolidated three-package
layout published to npm.

---

## Releases

Releases are GitHub Milestones. Each draws its items from GitHub Issues,
grouped by milestone and label.

The numbering alternates by design: a `.x.0` ships features; the `.x.5` that
follows is a consolidation pass that resolves the findings of the `.x.0`-close
release audit (see `CONTRIBUTING.md`, "The release audit") and ships no new
features.

- **v0.1.0 — shipped.** Bidirectional JATS conversion (export *and* import);
  display features for end-readers (table-of-contents sidebar, single-chapter
  book navigation, themes); a client-side rendering library with an in-browser
  editor demo; the docs site; and the `enscribe` command-line tool.
- **v0.2.0 — shipped.** Docs-site polish for public visitors, the consolidated
  three-package layout published to npm, and the accumulated docs and
  infrastructure fixes.
- **v0.2.5 — shipped.** The spec-completeness re-sync (acting on the
  rebuild-from-docs audit), accumulated parser / interop / tables fixes, and
  refinements to the apparatus and qualifying-tag surface (the `<data>`
  container migration, generalizing the qualifying-tag pattern, the frameable
  redesign, bibliography-heading config).
- **v0.3.0 — shipped.** New authoring and display features — markup inside
  table cells, section numbering, frame-border styles, smart typography, and
  callouts — plus the vocabulary coverage gallery, DSL source-view, ToC
  scroll-spy, default-theme feature-hook styling, and accumulated JATS interop
  and table fixes.
- **v0.3.5 — shipped.** The consolidation pass resolving the v0.3.0-close
  release-audit findings; no new features.
- **v0.4.0 — shipped.** Lists (`<list>` / `<li>`), strict mode
  (`<config strict-mode>`), sidenotes + margin notes, article appendices, and
  external citation sources (`<library src>`) — plus the coverage gallery as the
  authoring completeness surface and the *decision* to reframe Layer 1 as
  HTML-shaped (JATS becomes an export translation), with **lists as the first
  migrated element group** (`<list>` lowers to `<ul>` / `<ol>` / `<li>`). The
  decision and its inaugural case shipped; the rest of the vocabulary still
  renders as custom Layer 1 elements and migrates group-by-group under
  [#147](https://github.com/enscribejs/enscribe/issues/147). A full docs-site
  pass (feature pages, governance tier) shipped alongside.
- **v0.4.5 — consolidation pass (closing).** Per the cadence, a `.x.5` ships no
  new features — it resolves the `.x.0`-close release-audit findings. v0.4.5
  drained the v0.4.0-close audit set (#148–#155) plus a second coherence-debt
  wave surfaced by a v0.4.5-close health-check (#156–#183), so v0.5.0 begins from
  a coherent baseline. The four items once slated here — code syntax
  highlighting, browser-bundle size optimization, conda-forge packaging, and new
  sigil shorthands — are *features*, so they moved out to v0.5.0 / future
  (e.g. #17, #25, #27).
- **v0.5.0 — HTML output.** Finish the HTML-shaped reframe: the remaining Layer 1
  element-group migration ([#147](https://github.com/enscribejs/enscribe/issues/147)
  — sections, figures, the semantic-only elements), lossy render-mode lowering to
  plain HTML ([#40](https://github.com/enscribejs/enscribe/issues/40)), and
  well-formatted rendered output
  ([#117](https://github.com/enscribejs/enscribe/issues/117)). Carries the must-fix
  parser-hang bug ([#141](https://github.com/enscribejs/enscribe/issues/141)).
- **v0.6.0 — advanced layout.** Multi-column display
  ([#34](https://github.com/enscribejs/enscribe/issues/34) — its multi-column
  spec-gap folded in), print CSS / pagination
  ([#35](https://github.com/enscribejs/enscribe/issues/35)), paged per-page
  footnotes ([#164](https://github.com/enscribejs/enscribe/issues/164)), and
  composite (multi-panel) figures
  ([#116](https://github.com/enscribejs/enscribe/issues/116)).
- **Data model** (epic milestone). The structured data block + asset store — how
  `<data>` / `<config>` and embedded resources work
  ([#134](https://github.com/enscribejs/enscribe/issues/134),
  [#102](https://github.com/enscribejs/enscribe/issues/102)), gated on the open
  design forks ([#166](https://github.com/enscribejs/enscribe/issues/166),
  [#168](https://github.com/enscribejs/enscribe/issues/168)) that must settle first.
- **JATS** (milestone). The scholarly-interchange feature track — import / export /
  fetch mechanics ([#136](https://github.com/enscribejs/enscribe/issues/136),
  [#119](https://github.com/enscribejs/enscribe/issues/119),
  [#142](https://github.com/enscribejs/enscribe/issues/142),
  [#118](https://github.com/enscribejs/enscribe/issues/118)) — a feature track
  reached *from* the HTML base, not the core mission.
- **Interchange** (epic milestone). Import / export with the external authoring
  formats authors already use — Quarto round-trip (the direct `.qmd` engine,
  since enscribe already parses Markdown) and LaTeX / DOCX lossy via the pandoc
  bridge. An adoption on-ramp and no-lock-in guarantee — a feature track, not the
  mission. See [`notes/specs/interchange.md`](notes/specs/interchange.md).

> **TODO (maintainer fine-tuning).** The reading-polish placement, the
> infra / health track, and the icebox (longer-horizon parser / display work and
> the master-document / multi-file system) are being bucketed separately by the
> maintainer; this release list is not yet their final home. The `future`
> milestone still holds them until that pass lands.

---

## Current position

**v0.4.0 is released** — lists, strict mode, sidenotes + margin notes, article
appendices, and external citation sources (`<library src>`), plus the authoring
coverage gallery and the HTML-shaped Layer 1 reframe — decided, with lists as the
first migrated element group; the remaining migration is tracked under
[#147](https://github.com/enscribejs/enscribe/issues/147) (JATS as an export
translation) — with a full docs-site pass, shipped on top of the v0.2.x / v0.3.x
base (rich-document rendering, bidirectional JATS, the browser library and
`enscribe` CLI, three packages on npm: `@enscribejs/enscribe`, `@enscribejs/cli`,
`@enscribejs/layer1-vocabulary`). **v0.4.5 — the consolidation pass — is
closing**, draining the v0.4.0-close audit and a second coherence-debt wave
(#148–#183) so **v0.5.0 starts from a coherent baseline**. **v0.5.0 is next** —
the HTML-shaped Layer 1 element-group migration (#147), code syntax highlighting,
and other features; the longest-horizon work (render-mode lowering, the
master-document / multi-file system) sits under `future`. Every release's items live in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues), grouped by
milestone and label.

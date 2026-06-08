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
- **v0.4.0.** Code syntax highlighting, margin sidenotes, strict mode,
  browser-bundle size optimization, conda-forge packaging, and new sigil
  shorthands.
- **future.** Longer-horizon work — render-mode lowering to plain HTML,
  multi-column display, richer external-reference syntax, and other parser /
  display features as their design questions resolve.

---

## Current position

**v0.3.0 is released** — the new authoring and display features (markup inside
table cells, section numbering, frame-border styles, smart typography, callouts)
plus the vocabulary coverage gallery, DSL source-view, and ToC scroll-spy,
shipped on top of the v0.2.x base (rich-document rendering, bidirectional JATS,
the browser library and `enscribe` CLI, three packages on npm:
`@enscribejs/enscribe`, `@enscribejs/cli`, `@enscribejs/layer1-vocabulary`).
**v0.3.5 is next** — the consolidation pass that resolves the v0.3.0-close
release-audit findings and ships no new features; v0.4.0 follows, and the
longest-horizon work sits under `future`. Every release's items live in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues), grouped by
milestone and label.

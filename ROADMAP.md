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
- **v0.2.5 — current.** The spec-completeness re-sync (acting on the
  rebuild-from-docs audit), accumulated parser / interop / tables fixes, and
  refinements to the apparatus and qualifying-tag surface (the `<data>`
  container migration, generalizing the qualifying-tag pattern, the frameable
  redesign, bibliography-heading config).
- **v0.3.0.** New authoring and display features — markup inside table cells,
  section numbering, frame-border styles, smart typography, multi-column
  display, margin sidenotes, callouts, executable code blocks, and multi-file
  authoring.
- **v0.4.0.** Code syntax highlighting, browser-bundle size optimization,
  conda-forge packaging, and new sigil shorthands.
- **future.** Longer-horizon work — render-mode lowering to plain HTML, strict
  mode, richer external-reference syntax, and other parser / display features
  as their design questions resolve.

---

## Current position

**v0.2.0 is released**: enscribe renders rich documents, converts to and from
JATS, ships a browser library and the `enscribe` CLI, and is published to npm as
three packages (`@enscribejs/enscribe`, `@enscribejs/cli`,
`@enscribejs/layer1-vocabulary`). The live milestone is now **v0.2.5** — the
spec-completeness re-sync plus accumulated parser, interop, and tables fixes.
v0.3.0 and v0.4.0 follow with new authoring and display features; the
longest-horizon work sits under `future`. Every release's items live in
[GitHub Issues](https://github.com/enscribejs/enscribe/issues), grouped by
milestone and label.
